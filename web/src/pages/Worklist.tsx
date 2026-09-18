import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { CaseInfo, DraftReport, ReviewStatusResponse } from "../api/types";
import { AcmgChip } from "../components/AcmgChip";
import { DecisionBadge } from "../components/StatusBadge";

export function Worklist() {
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [report, setReport] = useState<DraftReport | null>(null);
  const [review, setReview] = useState<ReviewStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getCase(), api.getReport(), api.getReview()])
      .then(([c, r, rv]) => {
        setCaseInfo(c);
        setReport(r);
        setReview(rv);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorPanel message={error} />;
  if (!caseInfo || !report || !review) return <LoadingPanel />;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-8 py-6 flex flex-col gap-6">
      <div className="bg-surface-container-lowest shadow-sm p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-headline text-headline-md text-primary tracking-tight">Variants Requiring Review</h1>
          <span className="font-genomic text-caption text-on-surface-variant">
            Sample: {caseInfo.sampleId} • {caseInfo.region} ({caseInfo.assembly})
          </span>
        </div>
        <div className="flex items-center gap-2 font-genomic text-caption text-on-surface-variant">
          <span>{caseInfo.variantCaller} via {caseInfo.pipeline}</span>
          <span>•</span>
          <span>{report.totalVariantsReviewed} variants annotated</span>
        </div>
      </div>

      <p className="font-ui text-ui-body-md text-on-surface-variant bg-surface-container-low border-l-2 border-secondary p-3">
        {caseInfo.sampleDescription}. Annotated with {caseInfo.annotationTool}, cross-referenced against{" "}
        {caseInfo.clinvarSource}. AI drafts written by {caseInfo.aiModel}.
      </p>

      <div className="flex items-center gap-4">
        <SummaryStat label="Significant (drafted)" value={report.significantVariantCount} />
        <SummaryStat label="Reviewed" value={Object.keys(review.state.decisions).length} />
        <SummaryStat label="Not yet significant" value={report.nonSignificantSummary.count} tone="muted" />
        <SummaryStat
          label="Approval status"
          value={review.state.approval ? "Approved" : "Pending"}
          tone={review.state.approval ? "approved" : "pending"}
        />
      </div>

      <div className="w-full bg-surface-container-lowest shadow-sm overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-primary text-on-primary font-ui text-ui-label-bold uppercase tracking-wider">
              <th className="py-2.5 px-3">Gene</th>
              <th className="py-2.5 px-3">Variant</th>
              <th className="py-2.5 px-3">Consequence</th>
              <th className="py-2.5 px-3 text-center">ACMG (simplified/ClinVar)</th>
              <th className="py-2.5 px-3">Review Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-soft font-ui text-ui-body-md">
            {report.drafts.map((d) => {
              const key = `${d.chrom}:${d.pos}`;
              const decision = review.state.decisions[key];
              return (
                <tr key={key} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-2 px-3 align-top font-ui-label-bold text-primary font-semibold">{d.gene ?? "—"}</td>
                  <td className="py-2 px-3 align-top">
                    <div className="font-genomic text-code-genomic text-primary">{d.hgvsc ?? d.chrom + ":" + d.pos}</div>
                    <div className="font-genomic text-code-genomic-sm text-on-surface-variant">{d.hgvsp}</div>
                  </td>
                  <td className="py-2 px-3 align-top text-on-surface-variant">{d.consequence}</td>
                  <td className="py-2 px-3 align-top text-center">
                    <AcmgChip tier={d.tier} />
                  </td>
                  <td className="py-2 px-3 align-top">
                    <DecisionBadge decision={decision?.decision ?? null} />
                  </td>
                  <td className="py-2 px-3 align-top text-right">
                    <Link
                      to={`/variant/${encodeURIComponent(key)}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary font-ui text-ui-label-bold uppercase tracking-wider transition-colors"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "muted" | "approved" | "pending";
}) {
  const toneClass = {
    default: "text-primary",
    muted: "text-on-surface-variant",
    approved: "text-approved",
    pending: "text-pending",
  }[tone];
  return (
    <div className="bg-surface-container-lowest shadow-sm px-4 py-3 flex flex-col gap-0.5">
      <span className="font-ui text-caption uppercase tracking-wider text-on-surface-variant">{label}</span>
      <span className={`font-headline text-headline-sm ${toneClass}`}>{value}</span>
    </div>
  );
}

export function LoadingPanel() {
  return <div className="w-full max-w-[1400px] mx-auto px-8 py-10 text-on-surface-variant">Loading real data…</div>;
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-8 py-10">
      <div className="bg-error-container text-on-error-container p-4 border-l-4 border-error">
        <div className="font-ui text-ui-label-bold uppercase">Could not load data</div>
        <div className="font-ui text-ui-body-md mt-1">{message}</div>
      </div>
    </div>
  );
}
