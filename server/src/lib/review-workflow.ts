/**
 * Phase 4 — human-in-the-loop safeguards. This is the enforcement point for
 * the project's core safety rule: a report must NEVER be exportable or
 * marked final without an explicit human "Reviewed & Approved" action, and
 * that action must be deliberate (every individual AI claim decided first,
 * plus a typed attestation), not a single casual toggle.
 */
import type { VariantDraft } from "./report-drafter.js";

export type ClaimDecisionValue = "accepted" | "edited" | "rejected";

export type ClaimDecision = {
  variantKey: string;
  decision: ClaimDecisionValue;
  originalSummary: string; // the AI's draft text, always preserved even when edited
  editedSummary: string | null; // only set when decision === "edited"
  reviewerNote: string | null;
  reviewer: string;
  decidedAt: string;
};

export type AuditLogEntry = {
  timestamp: string;
  reviewer: string;
  action: "decide_claim" | "revise_claim" | "approve_report";
  variantKey: string | null;
  details: Record<string, unknown>;
};

export type Approval = {
  approvedBy: string;
  approvedAt: string;
  attestationText: string;
};

export type ReviewState = {
  reportGeneratedAt: string;
  decisions: Record<string, ClaimDecision>;
  approval: Approval | null;
};

export const REQUIRED_ATTESTATION_TEXT =
  "I confirm I have reviewed each AI-drafted claim in this report and I approve it for release, understanding this is a portfolio/demo tool and not a validated clinical device.";

export function variantKey(v: { chrom: string; pos: number }): string {
  return `${v.chrom}:${v.pos}`;
}

export function emptyReviewState(reportGeneratedAt: string): ReviewState {
  return { reportGeneratedAt, decisions: {}, approval: null };
}

/**
 * Records a reviewer's decision on one AI-drafted claim. Re-deciding an
 * already-decided claim is allowed (a reviewer can change their mind before
 * final approval) but is logged as "revise_claim", not silently overwritten,
 * so the audit trail shows the change happened.
 */
export function decideClaim(
  state: ReviewState,
  draft: VariantDraft,
  decision: ClaimDecisionValue,
  reviewer: string,
  opts: { editedSummary?: string; note?: string } = {},
): { state: ReviewState; auditEntry: AuditLogEntry } {
  if (!reviewer.trim()) throw new Error("A reviewer name is required to decide a claim.");
  if (decision === "edited" && !opts.editedSummary?.trim()) {
    throw new Error('An "edited" decision requires editedSummary text.');
  }

  const key = variantKey(draft);
  const isRevision = key in state.decisions;
  const now = new Date().toISOString();

  const newDecision: ClaimDecision = {
    variantKey: key,
    decision,
    originalSummary: draft.summary,
    editedSummary: decision === "edited" ? opts.editedSummary!.trim() : null,
    reviewerNote: opts.note?.trim() || null,
    reviewer,
    decidedAt: now,
  };

  const auditEntry: AuditLogEntry = {
    timestamp: now,
    reviewer,
    action: isRevision ? "revise_claim" : "decide_claim",
    variantKey: key,
    details: isRevision
      ? { from: state.decisions[key], to: newDecision }
      : { decision: newDecision },
  };

  return {
    state: { ...state, decisions: { ...state.decisions, [key]: newDecision } },
    auditEntry,
  };
}

export type ApprovalCheck =
  | { canApprove: true }
  | { canApprove: false; reason: string; undecidedVariantKeys: string[] };

/**
 * The approval gate. Every significant AI-drafted claim must have an
 * explicit decision — "we didn't get to it" is not the same as "we
 * reviewed it and it's fine," so an undecided claim blocks approval outright
 * rather than defaulting to accepted.
 */
export function checkApproval(state: ReviewState, drafts: VariantDraft[]): ApprovalCheck {
  const undecided = drafts.filter((d) => !(variantKey(d) in state.decisions)).map(variantKey);
  if (undecided.length > 0) {
    return {
      canApprove: false,
      reason: `${undecided.length} of ${drafts.length} AI-drafted claim(s) have not been reviewed yet.`,
      undecidedVariantKeys: undecided,
    };
  }
  return { canApprove: true };
}

/**
 * Approves the report. Requires the exact attestation text (a deliberate
 * typed confirmation, not a boolean flag someone could pass without
 * reading) and fails closed if any claim is still undecided.
 */
export function approveReport(
  state: ReviewState,
  drafts: VariantDraft[],
  reviewer: string,
  attestationText: string,
): { state: ReviewState; auditEntry: AuditLogEntry } {
  if (!reviewer.trim()) throw new Error("A reviewer name is required to approve a report.");
  if (attestationText.trim() !== REQUIRED_ATTESTATION_TEXT) {
    throw new Error("Attestation text does not match the required confirmation statement exactly.");
  }
  const check = checkApproval(state, drafts);
  if (!check.canApprove) throw new Error(check.reason);

  const now = new Date().toISOString();
  const approval: Approval = { approvedBy: reviewer, approvedAt: now, attestationText };
  const auditEntry: AuditLogEntry = {
    timestamp: now,
    reviewer,
    action: "approve_report",
    variantKey: null,
    details: { decisionCount: Object.keys(state.decisions).length },
  };
  return { state: { ...state, approval }, auditEntry };
}

export type FinalVariantEntry = {
  variantKey: string;
  gene: string | null;
  tier: string;
  finalSummary: string;
  wasEdited: boolean;
  reviewerNote: string | null;
};

export const PORTFOLIO_DISCLAIMER =
  "This is a portfolio/demo project, not a validated clinical device. Human review and approval confirm the reviewer's read of the AI's draft and the simplified scoring behind it — they do not certify medical accuracy or turn this into a real diagnostic report. Nothing here should inform an actual medical decision.";

export type FinalReport = {
  status: "reviewed_and_approved";
  disclaimer: string; // stays present even after approval — approval never removes this
  approvedBy: string;
  approvedAt: string;
  variants: FinalVariantEntry[];
  excludedByReviewer: string[]; // rejected variant keys — omitted from the report body but never hidden from the audit trail
};

/**
 * THE safety enforcement point: this is the only function that produces a
 * "final" report shape, and it refuses outright unless state.approval is
 * set. There is no other code path in this project that assembles a
 * finalized report — Phase 5's UI must call this, not reassemble the pieces
 * itself, so the gate can't be bypassed by a UI that forgets to check.
 */
export function buildFinalReport(state: ReviewState, drafts: VariantDraft[]): FinalReport {
  if (!state.approval) {
    throw new Error(
      "Cannot finalize: this report has not been Reviewed & Approved. " +
        "Every draft stays labeled ai_drafted_pending_review until an explicit approval action exists.",
    );
  }

  const variants: FinalVariantEntry[] = [];
  const excludedByReviewer: string[] = [];

  for (const draft of drafts) {
    const key = variantKey(draft);
    const decision = state.decisions[key];
    if (!decision) {
      // Should be unreachable if approveReport's gate ran correctly — fail
      // loudly rather than silently including an undecided claim.
      throw new Error(`Invariant violated: approved report has an undecided claim (${key}).`);
    }
    if (decision.decision === "rejected") {
      excludedByReviewer.push(key);
      continue;
    }
    variants.push({
      variantKey: key,
      gene: draft.gene,
      tier: draft.tier,
      finalSummary: decision.decision === "edited" ? decision.editedSummary! : decision.originalSummary,
      wasEdited: decision.decision === "edited",
      reviewerNote: decision.reviewerNote,
    });
  }

  return {
    status: "reviewed_and_approved",
    disclaimer: PORTFOLIO_DISCLAIMER,
    approvedBy: state.approval.approvedBy,
    approvedAt: state.approval.approvedAt,
    variants,
    excludedByReviewer,
  };
}
