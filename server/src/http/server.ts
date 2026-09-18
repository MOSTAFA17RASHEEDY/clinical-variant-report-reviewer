import fs from "node:fs";
import express from "express";
import cors from "cors";
import { CASE_INFO } from "../lib/case-info.js";
import { loadDraftReport, saveDraftReport, CLASSIFIED_VARIANTS_PATH } from "../lib/report-store.js";
import { loadReviewState, saveReviewState, appendAuditLog, readAuditLog, saveRedraftOverride, USE_REDIS } from "../lib/review-store.js";
import {
  decideClaim,
  checkApproval,
  approveReport,
  buildFinalReport,
  variantKey,
  REQUIRED_ATTESTATION_TEXT,
  type ClaimDecisionValue,
} from "../lib/review-workflow.js";
import { draftVariantExplanation } from "../lib/report-drafter.js";
import { GeminiError } from "../lib/gemini.js";
import type { ClassifiedVariant } from "../lib/classify-pipeline.js";

const app = express();
app.use(cors());
app.use(express.json());

function handleError(res: express.Response, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const status = err instanceof GeminiError ? 502 : 400;
  res.status(status).json({ error: message });
}

app.get("/api/case", (_req, res) => {
  res.json(CASE_INFO);
});

app.get("/api/report", async (_req, res) => {
  try {
    res.json(await loadDraftReport());
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/variants", (_req, res) => {
  if (!fs.existsSync(CLASSIFIED_VARIANTS_PATH)) {
    res.status(404).json({ error: "classified-variants.json not found — run Phase 1/2 pipeline first." });
    return;
  }
  res.sendFile(CLASSIFIED_VARIANTS_PATH);
});

app.get("/api/review", async (_req, res) => {
  try {
    const { generatedAt, drafts } = await loadDraftReport();
    const state = await loadReviewState(generatedAt);
    const approvalCheck = checkApproval(state, drafts);
    res.json({ state, auditLog: await readAuditLog(), approvalCheck, requiredAttestationText: REQUIRED_ATTESTATION_TEXT });
  } catch (err) {
    handleError(res, err);
  }
});

app.post("/api/review/decide", async (req, res) => {
  try {
    const { variantKey: key, decision, reviewer, editedSummary, note } = req.body as {
      variantKey: string;
      decision: ClaimDecisionValue;
      reviewer: string;
      editedSummary?: string;
      note?: string;
    };
    const { generatedAt, drafts } = await loadDraftReport();
    const draft = drafts.find((d) => variantKey(d) === key);
    if (!draft) throw new Error(`No draft found for ${key}.`);

    const state = await loadReviewState(generatedAt);
    const { state: newState, auditEntry } = decideClaim(state, draft, decision, reviewer, { editedSummary, note });
    await saveReviewState(newState);
    await appendAuditLog(auditEntry);
    res.json({ ok: true, decision: newState.decisions[key] });
  } catch (err) {
    handleError(res, err);
  }
});

app.post("/api/review/approve", async (req, res) => {
  try {
    const { reviewer, attestationText } = req.body as { reviewer: string; attestationText: string };
    const { generatedAt, drafts } = await loadDraftReport();
    const state = await loadReviewState(generatedAt);
    const { state: newState, auditEntry } = approveReport(state, drafts, reviewer, attestationText);
    await saveReviewState(newState);
    await appendAuditLog(auditEntry);
    res.json({ ok: true, approval: newState.approval });
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/final-report", async (_req, res) => {
  try {
    const { generatedAt, drafts } = await loadDraftReport();
    const state = await loadReviewState(generatedAt);
    res.json(buildFinalReport(state, drafts));
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * Regenerates one variant's AI draft on demand. Accepts the visitor's own
 * Gemini key via header (bring-your-own-key — never logged, never written
 * to disk) and falls back to the server's .env key if none is sent.
 * Any existing review decision on this variant is cleared: the text just
 * changed, so an old "accepted"/"edited" decision would otherwise silently
 * apply to text the reviewer never actually saw.
 *
 * Storage split: in Redis mode (Vercel), the baseline draft-report.json is
 * a read-only build artifact, so the new draft is saved as an override in
 * Redis instead (merged in by report-store.ts's loadDraftReport). In file
 * mode (local), it rewrites draft-report.json directly, same as before.
 */
app.post("/api/redraft/:variantKey", async (req, res) => {
  try {
    const key = req.params.variantKey;
    const apiKeyOverride = req.header("X-Gemini-Api-Key") || undefined;

    if (!fs.existsSync(CLASSIFIED_VARIANTS_PATH)) throw new Error("classified-variants.json not found.");
    const allVariants: ClassifiedVariant[] = JSON.parse(fs.readFileSync(CLASSIFIED_VARIANTS_PATH, "utf-8"));
    const classified = allVariants.find((v) => variantKey(v) === key);
    if (!classified) throw new Error(`No classified variant found for ${key}.`);

    const newDraft = await draftVariantExplanation(classified, apiKeyOverride);

    const report = await loadDraftReport();
    if (!report.drafts.some((d) => variantKey(d) === key)) throw new Error(`No existing draft found for ${key} to replace.`);

    if (USE_REDIS) {
      await saveRedraftOverride(key, JSON.stringify(newDraft));
    } else {
      report.drafts = report.drafts.map((d) => (variantKey(d) === key ? newDraft : d));
      saveDraftReport(report);
    }

    const state = await loadReviewState(report.generatedAt);
    if (key in state.decisions) {
      const { [key]: _removed, ...rest } = state.decisions;
      await saveReviewState({ ...state, decisions: rest });
      await appendAuditLog({
        timestamp: new Date().toISOString(),
        reviewer: "system",
        action: "revise_claim",
        variantKey: key,
        details: { reason: "draft regenerated, prior decision cleared" },
      });
    }

    res.json(newDraft);
  } catch (err) {
    handleError(res, err);
  }
});

// Vercel's Node.js builder detects and calls this exported Express app
// directly per request — it must not call app.listen() itself. Locally
// (npm run http), VERCEL is unset, so it runs as a normal standalone server.
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 4400;
  app.listen(PORT, () => {
    console.log(`Clinical Variant Report Reviewer API listening on http://localhost:${PORT}`);
  });
}

export default app;
