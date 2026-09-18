import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { DraftReport, ReviewStatusResponse, FinalReport } from "../api/types";
import { ErrorPanel, LoadingPanel } from "./Worklist";
import { ApprovedBadge, DecisionBadge } from "../components/StatusBadge";
import { getReviewerName, setReviewerName } from "../lib/settings";

export function SignOff() {
  const [report, setReport] = useState<DraftReport | null>(null);
  const [review, setReview] = useState<ReviewStatusResponse | null>(null);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState(getReviewerName());
  const [attestation, setAttestation] = useState("");
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  function reload() {
    Promise.all([api.getReport(), api.getReview()])
      .then(([r, rv]) => {
        setReport(r);
        setReview(rv);
        if (rv.state.approval) api.getFinalReport().then(setFinalReport).catch(() => {});
      })
      .catch((err) => setError(err.message));
  }

  useEffect(reload, []);

  if (error) return <ErrorPanel message={error} />;
  if (!report || !review) return <LoadingPanel />;

  const decisions = review.state.decisions;
  const decidedCount = Object.keys(decisions).length;
  const counts = { accepted: 0, edited: 0, rejected: 0 };
  for (const d of Object.values(decisions)) counts[d.decision]++;

  async function handleApprove() {
    setApproving(true);
    setApproveError(null);
    try {
      setReviewerName(reviewer);
      await api.approve(reviewer, attestation);
      reload();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : String(err));
    } finally {
      setApproving(false);
    }
  }

  if (review.state.approval) {
    return (
      <div className="w-full max-w-[900px] mx-auto p-8">
        <div className="bg-surface-container-lowest shadow-md p-6 flex flex-col gap-4">
          <ApprovedBadge />
          <div className="grid grid-cols-2 gap-2 text-caption font-genomic text-on-surface-variant">
            <div>
              Approved by: <span className="text-primary font-ui-label-bold">{review.state.approval.approvedBy}</span>
            </div>
            <div>
              At: <span className="text-primary font-ui-label-bold">{new Date(review.state.approval.approvedAt).toLocaleString()}</span>
            </div>
          </div>
          {finalReport && (
            <div className="mt-2 border-t border-hairline pt-4">
              <h2 className="font-headline text-headline-sm text-primary mb-2">
                Final Report — {finalReport.variants.length} variant(s) included, {finalReport.excludedByReviewer.length} excluded
              </h2>
              <p className="font-ui text-caption text-on-surface-variant mb-3">{finalReport.disclaimer}</p>
              <div className="flex flex-col gap-2">
                {finalReport.variants.map((v) => (
                  <div key={v.variantKey} className="p-2.5 bg-surface-container-low text-caption">
                    <span className="font-ui-label-bold text-primary">{v.gene ?? v.variantKey}</span> — {v.tier}
                    {v.wasEdited && <span className="ml-2 text-secondary">(edited by reviewer)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const canApprove = review.approvalCheck.canApprove;
  const attestationMatches = attestation.trim() === review.requiredAttestationText;

  return (
    <div className="w-full max-w-[1200px] mx-auto p-6 md:p-8">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
          <div className="bg-surface-container-lowest shadow-sm p-5">
            <h2 className="font-headline text-headline-md text-primary mb-1">Claim-by-Claim Review Status</h2>
            <p className="font-ui text-caption text-on-surface-variant mb-3">
              {decidedCount} of {report.significantVariantCount} decided — {counts.accepted} accepted, {counts.edited} edited,{" "}
              {counts.rejected} rejected.
            </p>
            <div className="flex flex-col divide-y divide-hairline-soft">
              {report.drafts.map((d) => {
                const key = `${d.chrom}:${d.pos}`;
                const decision = decisions[key];
                return (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div>
                      <span className="font-ui-label-bold text-ui-body-md text-primary">{d.gene ?? key}</span>
                      <span className="ml-2 font-genomic text-code-genomic-sm text-on-surface-variant">{d.hgvsc ?? key}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <DecisionBadge decision={decision?.decision ?? null} />
                      <Link
                        to={`/variant/${encodeURIComponent(key)}`}
                        className="text-caption font-ui text-secondary hover:underline uppercase tracking-wider"
                      >
                        {decision ? "Change" : "Decide"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
          <div className="bg-surface-container-lowest shadow-md p-6 flex flex-col gap-4">
            <h3 className="font-headline text-headline-sm text-primary">Reviewed &amp; Approved</h3>

            {!canApprove && (
              <div className="p-2.5 bg-surface-container-low text-caption font-ui text-on-surface-variant">
                {review.approvalCheck.canApprove === false ? review.approvalCheck.reason : ""}
              </div>
            )}

            <label className="flex flex-col gap-1">
              <span className="font-ui text-caption uppercase tracking-wider text-primary">Your name</span>
              <input
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                placeholder="Enter your name"
                className="px-3 py-2 bg-surface-container-low text-primary font-ui text-ui-body-md focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none p-2.5 bg-surface-container-low">
              <input
                type="checkbox"
                checked={attestationMatches}
                onChange={(e) => setAttestation(e.target.checked ? review.requiredAttestationText : "")}
                className="mt-1 h-4 w-4"
              />
              <span className="font-ui text-ui-body-md text-primary">{review.requiredAttestationText}</span>
            </label>

            {approveError && <div className="p-2.5 bg-error-container text-on-error-container text-caption font-ui">{approveError}</div>}

            <button
              disabled={!canApprove || !attestationMatches || !reviewer.trim() || approving}
              onClick={handleApprove}
              className="w-full py-3 bg-secondary text-on-secondary font-ui text-ui-label-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              {approving ? "Approving…" : "Sign & Formally Approve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
