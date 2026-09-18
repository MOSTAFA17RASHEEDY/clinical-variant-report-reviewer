import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ReviewStatusResponse } from "../api/types";
import { ErrorPanel, LoadingPanel } from "./Worklist";

const ACTION_LABEL: Record<string, string> = {
  decide_claim: "Claim Decided",
  revise_claim: "Claim Revised",
  approve_report: "Report Approved",
};

/**
 * Every field in AuditLogEntry.details is real and preserved in the
 * underlying JSON (nothing is dropped) — this just renders a readable
 * summary per action type instead of a raw JSON dump, since the full
 * original AI text inline made every row unreadable.
 */
function AuditDetails({ entry }: { entry: ReviewStatusResponse["auditLog"][number] }) {
  if (entry.action === "decide_claim" || entry.action === "revise_claim") {
    const d = (entry.details.decision ?? entry.details.to) as
      | { decision: string; editedSummary: string | null; reviewerNote: string | null }
      | undefined;
    if (entry.details.reason) {
      return <span className="font-ui text-ui-body-md text-on-surface-variant">{String(entry.details.reason)}</span>;
    }
    if (!d) return null;
    return (
      <div className="flex flex-col gap-1">
        <span className="font-ui text-ui-body-md text-on-surface">
          Decision: <strong className="font-ui-label-bold">{d.decision}</strong>
        </span>
        {d.editedSummary && (
          <span className="font-ui text-caption text-on-surface-variant italic">Edited text: "{d.editedSummary}"</span>
        )}
        {d.reviewerNote && <span className="font-ui text-caption text-on-surface-variant">Note: {d.reviewerNote}</span>}
      </div>
    );
  }
  if (entry.action === "approve_report") {
    return (
      <span className="font-ui text-ui-body-md text-on-surface">
        Approved with {String(entry.details.decisionCount)} claim(s) decided.
      </span>
    );
  }
  return <pre className="whitespace-pre-wrap font-genomic text-code-genomic-sm">{JSON.stringify(entry.details, null, 1)}</pre>;
}

export function AuditTrail() {
  const [review, setReview] = useState<ReviewStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getReview().then(setReview).catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorPanel message={error} />;
  if (!review) return <LoadingPanel />;

  const decisions = Object.values(review.state.decisions);
  const total = decisions.length;
  const accepted = decisions.filter((d) => d.decision === "accepted").length;
  const edited = decisions.filter((d) => d.decision === "edited").length;
  const rejected = decisions.filter((d) => d.decision === "rejected").length;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-8 py-6">
      <div className="bg-surface-container-lowest shadow-sm p-5 mb-4">
        <h1 className="font-headline text-headline-lg text-primary tracking-tight">Audit Trail</h1>
        <p className="font-ui text-caption text-on-surface-variant mt-1">
          A real, append-only log of every review action taken in this app — who, what, and when. Nothing here is cryptographically
          notarized or legally binding; this is a portfolio/demo tool, not a regulated system.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="bg-surface-container-lowest shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container text-primary font-ui text-ui-label-bold uppercase">
                  <th className="px-3 py-2.5 w-[180px]">Timestamp</th>
                  <th className="px-3 py-2.5 w-[160px]">Reviewer</th>
                  <th className="px-3 py-2.5 w-[160px]">Action</th>
                  <th className="px-3 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft font-ui text-ui-body-md">
                {review.auditLog.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-on-surface-variant">
                      No review actions recorded yet.
                    </td>
                  </tr>
                )}
                {[...review.auditLog].reverse().map((entry, i) => (
                  <tr key={i} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-3 py-2.5 align-top font-genomic text-code-genomic-sm text-on-surface-variant">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 align-top font-ui-label-bold text-primary">{entry.reviewer}</td>
                    <td className="px-3 py-2.5 align-top">
                      <span className="px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant font-genomic text-caption">
                        {ACTION_LABEL[entry.action] ?? entry.action}
                      </span>
                      {entry.variantKey && (
                        <span className="block font-genomic text-caption text-outline mt-0.5">{entry.variantKey}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top text-caption text-on-surface-variant">
                      <AuditDetails entry={entry} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="bg-surface-container-lowest shadow-sm p-4 flex flex-col gap-3">
            <span className="font-ui text-ui-label-bold text-caption text-on-surface-variant uppercase tracking-wider">
              Real AI Contribution Stats
            </span>
            {total === 0 ? (
              <span className="font-ui text-caption text-on-surface-variant">No claims decided yet.</span>
            ) : (
              <>
                <Bar label="Accepted as-is" count={accepted} total={total} colorClass="bg-approved" />
                <Bar label="Edited by reviewer" count={edited} total={total} colorClass="bg-secondary" />
                <Bar label="Rejected" count={rejected} total={total} colorClass="bg-error" />
              </>
            )}
          </div>
          <div className="bg-surface-container-lowest shadow-sm p-4 text-caption font-ui text-on-surface-variant">
            <strong className="text-primary font-ui-label-bold">About this log:</strong> each row is written the moment an action
            happens, in the order it happens, to a plain JSON file with no delete function. That's what "real" means here — not a
            cryptographic seal, just an honest record.
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ label, count, total, colorClass }: { label: string; count: number; total: number; colorClass: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-caption font-genomic">
        <span className="text-on-surface">{label}</span>
        <span className="text-primary font-bold">
          {count} ({pct}%)
        </span>
      </div>
      <div className="w-full bg-surface-container-high h-2 overflow-hidden">
        <div className={`${colorClass} h-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
