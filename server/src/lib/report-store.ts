import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { loadRedraftOverrides } from "./review-store.js";
import { variantKey } from "./review-workflow.js";
import type { VariantDraft } from "./report-drafter.js";

// server/data/annotated/ (this file's own package) is a checked-in, synced
// copy of the pipeline's real output — kept for deployment. Vercel's file
// tracer only bundles files reachable from within a service's own root
// (server/), so the canonical data/annotated/ at the repo root (one level
// up, outside that root) isn't available at runtime there. `npm run
// sync-data` refreshes this copy after re-running the Phase 1-3 pipeline.
// Locally, either copy works identically — the server-local one is
// preferred only because it's guaranteed to also work when deployed.
const SERVER_OWN_DATA_DIR = path.resolve(fileURLToPath(import.meta.url), "../../../data/annotated");
const PROJECT_ROOT_DATA_DIR = path.join(config.projectRoot, "data/annotated");

function resolveDataPath(filename: string): string {
  const local = path.join(SERVER_OWN_DATA_DIR, filename);
  if (fs.existsSync(local)) return local;
  return path.join(PROJECT_ROOT_DATA_DIR, filename);
}

export const REPORT_PATH = resolveDataPath("draft-report.json");
export const FINAL_REPORT_PATH = path.join(config.projectRoot, "data/annotated/final-report.json");
export const CLASSIFIED_VARIANTS_PATH = resolveDataPath("classified-variants.json");

export type DraftReport = {
  generatedAt: string;
  status: "pending_review";
  disclaimer: string;
  totalVariantsReviewed: number;
  significantVariantCount: number;
  drafts: VariantDraft[];
  failures: { variant: string; error: string }[];
  nonSignificantSummary: { count: number; note: string; byConsequence: Record<string, number> };
};

/**
 * Merges in any live redraft overrides (see review-store.ts's
 * saveRedraftOverride) on top of the bundled baseline drafts — needed
 * because on Vercel the baseline draft-report.json is a read-only build
 * artifact, so a redraft can't rewrite it in place the way local file mode
 * does.
 */
export async function loadDraftReport(): Promise<DraftReport> {
  if (!fs.existsSync(REPORT_PATH)) {
    throw new Error(`${REPORT_PATH} not found — run "npm run draft-report" first (Phase 3).`);
  }
  const report: DraftReport = JSON.parse(fs.readFileSync(REPORT_PATH, "utf-8"));

  const overrides = await loadRedraftOverrides();
  if (Object.keys(overrides).length === 0) return report;

  return {
    ...report,
    drafts: report.drafts.map((d) => {
      const override = overrides[variantKey(d)];
      return override ? (JSON.parse(override) as VariantDraft) : d;
    }),
  };
}

/** File-mode only — see review-store.ts's USE_REDIS for why Redis mode uses saveRedraftOverride instead. */
export function saveDraftReport(report: DraftReport): void {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}
