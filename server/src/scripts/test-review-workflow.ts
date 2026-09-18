// Proves the safety gate actually blocks what it claims to block — not just
// the happy path. This is the core safety rule of the whole project: no
// report is exportable/final without an explicit, complete human approval.
import {
  emptyReviewState,
  decideClaim,
  checkApproval,
  approveReport,
  buildFinalReport,
  REQUIRED_ATTESTATION_TEXT,
} from "../lib/review-workflow.js";
import type { VariantDraft } from "../lib/report-drafter.js";

function fakeDraft(overrides: Partial<VariantDraft>): VariantDraft {
  return {
    chrom: "chr20",
    pos: 1,
    gene: "TESTGENE",
    hgvsc: null,
    hgvsp: null,
    consequence: "missense_variant",
    tier: "VUS",
    classificationSource: "simplified-scorer",
    confidence: "low",
    citations: [],
    summary: "original AI draft text [1]",
    citationCoverageWarning: false,
    status: "ai_drafted_pending_review",
    ...overrides,
  };
}

const draftA = fakeDraft({ pos: 1 });
const draftB = fakeDraft({ pos: 2 });
const draftC = fakeDraft({ pos: 3 });
const drafts = [draftA, draftB, draftC];

let state = emptyReviewState("2026-01-01T00:00:00Z");
let pass = 0;
let fail = 0;

function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${label}`);
  if (cond) pass++;
  else fail++;
}

// 1. Can't build a final report before ANY review happened.
try {
  buildFinalReport(state, drafts);
  check("buildFinalReport refuses before any review", false);
} catch {
  check("buildFinalReport refuses before any review", true);
}

// 2. Can't approve with claims undecided.
check("checkApproval blocks with 0/3 decided", checkApproval(state, drafts).canApprove === false);

// Decide 2 of 3.
state = decideClaim(state, draftA, "accepted", "Dr. Reviewer").state;
state = decideClaim(state, draftB, "edited", "Dr. Reviewer", { editedSummary: "reviewer-corrected text [1]" }).state;

check("checkApproval still blocks with 2/3 decided", checkApproval(state, drafts).canApprove === false);

// 3. Approval fails with wrong attestation text even if fully decided.
state = decideClaim(state, draftC, "rejected", "Dr. Reviewer", { note: "not clinically relevant" }).state;
check("checkApproval allows once 3/3 decided", checkApproval(state, drafts).canApprove === true);

try {
  approveReport(state, drafts, "Dr. Reviewer", "I approve this, trust me");
  check("approveReport rejects a wrong/casual attestation string", false);
} catch {
  check("approveReport rejects a wrong/casual attestation string", true);
}

// Still not approved after the failed attempt above.
try {
  buildFinalReport(state, drafts);
  check("buildFinalReport still refuses after a failed approval attempt", false);
} catch {
  check("buildFinalReport still refuses after a failed approval attempt", true);
}

// 4. Correct attestation succeeds.
const approveResult = approveReport(state, drafts, "Dr. Reviewer", REQUIRED_ATTESTATION_TEXT);
state = approveResult.state;
check("approveReport succeeds with exact required attestation text", state.approval !== null);

// 5. Final report now buildable, correctly excludes the rejected claim and uses edited text.
const final = buildFinalReport(state, drafts);
check("final report includes exactly the 2 non-rejected variants", final.variants.length === 2);
check("final report excludes the rejected variant in excludedByReviewer", final.excludedByReviewer.includes("chr20:3"));
check(
  "final report uses the reviewer's edited text, not the original AI draft, for the edited claim",
  final.variants.find((v) => v.variantKey === "chr20:2")?.finalSummary === "reviewer-corrected text [1]",
);
check(
  "final report uses the original AI text unchanged for the accepted (not edited) claim",
  final.variants.find((v) => v.variantKey === "chr20:1")?.finalSummary === "original AI draft text [1]",
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
