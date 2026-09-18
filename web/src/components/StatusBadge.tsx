import type { ClaimDecisionValue } from "../api/types";

/**
 * The Pending Review vs Approved visual distinction the whole app hinges
 * on — amber/pulsing for anything not yet finalized, teal/solid only once
 * genuinely approved. There is no third "in-between" style: a report is
 * either still pending a human, or it's been through the real approval
 * gate — nothing in between reads as more final than it is.
 */
export function PendingBadge({ label = "Pending Review" }: { label?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-pending animate-pulse" />
      <span className="font-ui text-ui-label-bold uppercase text-pending">{label}</span>
    </div>
  );
}

export function ApprovedBadge({ label = "Reviewed & Approved" }: { label?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="material-symbols-outlined text-[16px] text-approved" style={{ fontVariationSettings: "'FILL' 1" }}>
        verified
      </span>
      <span className="font-ui text-ui-label-bold uppercase text-approved">{label}</span>
    </div>
  );
}

const DECISION_LABEL: Record<ClaimDecisionValue, string> = {
  accepted: "Accepted",
  edited: "Edited",
  rejected: "Rejected",
};

const DECISION_STYLE: Record<ClaimDecisionValue, string> = {
  accepted: "text-approved",
  edited: "text-secondary",
  rejected: "text-error",
};

export function DecisionBadge({ decision }: { decision: ClaimDecisionValue | null }) {
  if (!decision) return <PendingBadge label="Pending" />;
  return (
    <span className={`font-ui text-ui-label-bold uppercase ${DECISION_STYLE[decision]}`}>
      {DECISION_LABEL[decision]}
    </span>
  );
}
