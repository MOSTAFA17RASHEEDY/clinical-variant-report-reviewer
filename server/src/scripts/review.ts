import fs from "node:fs";
import { loadReviewState, saveReviewState, appendAuditLog, readAuditLog } from "../lib/review-store.js";
import { loadDraftReport, FINAL_REPORT_PATH } from "../lib/report-store.js";
import {
  decideClaim,
  checkApproval,
  approveReport,
  buildFinalReport,
  variantKey,
  REQUIRED_ATTESTATION_TEXT,
  type ClaimDecisionValue,
} from "../lib/review-workflow.js";

async function loadReport() {
  try {
    return await loadDraftReport();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      flags[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return flags;
}

async function cmdList() {
  const { generatedAt, drafts } = await loadReport();
  const state = await loadReviewState(generatedAt);
  for (const d of drafts) {
    const key = variantKey(d);
    const decision = state.decisions[key];
    console.log(
      `${key.padEnd(16)} ${(d.gene ?? "-").padEnd(14)} ${d.tier.padEnd(18)} ${
        decision ? decision.decision : "PENDING"
      }`,
    );
  }
}

async function cmdDecide(args: string[]) {
  const [key, decisionArg] = args;
  const flags = parseFlags(args.slice(2));
  if (!key || !decisionArg || !flags.reviewer) {
    console.error('Usage: review decide <chrom:pos> <accept|edit|reject> --reviewer "Name" [--note "..."] [--text "edited text"]');
    process.exit(1);
  }
  const decisionMap: Record<string, ClaimDecisionValue> = {
    accept: "accepted",
    edit: "edited",
    reject: "rejected",
  };
  const decision = decisionMap[decisionArg];
  if (!decision) {
    console.error(`Unknown decision "${decisionArg}" — expected accept, edit, or reject.`);
    process.exit(1);
  }

  const { generatedAt, drafts } = await loadReport();
  const draft = drafts.find((d) => variantKey(d) === key);
  if (!draft) {
    console.error(`No draft found for ${key}.`);
    process.exit(1);
  }

  const state = await loadReviewState(generatedAt);
  const { state: newState, auditEntry } = decideClaim(state, draft, decision, flags.reviewer, {
    editedSummary: flags.text,
    note: flags.note,
  });
  await saveReviewState(newState);
  await appendAuditLog(auditEntry);
  console.log(`Recorded: ${key} -> ${decision} (by ${flags.reviewer})`);
}

async function cmdStatus() {
  const { generatedAt, drafts } = await loadReport();
  const state = await loadReviewState(generatedAt);
  const result = checkApproval(state, drafts);
  if (result.canApprove) {
    console.log("READY TO APPROVE — all significant claims have been reviewed.");
  } else {
    console.log(`NOT READY: ${result.reason}`);
    console.log("Undecided:", result.undecidedVariantKeys.join(", "));
  }
}

async function cmdApprove(args: string[]) {
  const flags = parseFlags(args);
  if (!flags.reviewer || !flags.attest) {
    console.error('Usage: review approve --reviewer "Name" --attest "<exact required attestation text>"');
    console.error(`Required text: "${REQUIRED_ATTESTATION_TEXT}"`);
    process.exit(1);
  }
  const { generatedAt, drafts } = await loadReport();
  const state = await loadReviewState(generatedAt);
  try {
    const { state: newState, auditEntry } = approveReport(state, drafts, flags.reviewer, flags.attest);
    await saveReviewState(newState);
    await appendAuditLog(auditEntry);
    console.log(`APPROVED by ${flags.reviewer} at ${newState.approval!.approvedAt}`);
  } catch (err) {
    console.error(`Approval failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

async function cmdFinalize() {
  const { generatedAt, drafts } = await loadReport();
  const state = await loadReviewState(generatedAt);
  try {
    const final = buildFinalReport(state, drafts);
    fs.writeFileSync(FINAL_REPORT_PATH, JSON.stringify(final, null, 2));
    console.log(`Wrote ${FINAL_REPORT_PATH}`);
    console.log(`  ${final.variants.length} variant(s) included, ${final.excludedByReviewer.length} excluded by reviewer decision.`);
  } catch (err) {
    console.error(`Finalize failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

async function cmdAudit() {
  for (const entry of await readAuditLog()) {
    console.log(`${entry.timestamp}  ${entry.reviewer.padEnd(16)} ${entry.action}${entry.variantKey ? " " + entry.variantKey : ""}`);
  }
}

const [, , command, ...rest] = process.argv;
switch (command) {
  case "list": await cmdList(); break;
  case "decide": await cmdDecide(rest); break;
  case "status": await cmdStatus(); break;
  case "approve": await cmdApprove(rest); break;
  case "finalize": await cmdFinalize(); break;
  case "audit": await cmdAudit(); break;
  default:
    console.error("Usage: review <list|decide|status|approve|finalize|audit>");
    process.exit(1);
}
