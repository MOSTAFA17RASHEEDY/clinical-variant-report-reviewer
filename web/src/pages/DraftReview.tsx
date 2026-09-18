import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { CaseInfo, DraftReport } from "../api/types";
import { AcmgChip } from "../components/AcmgChip";
import { ErrorPanel, LoadingPanel } from "./Worklist";

const TIER_ORDER = ["Pathogenic", "Likely Pathogenic", "VUS", "Likely Benign", "Benign"] as const;

export function DraftReview() {
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [report, setReport] = useState<DraftReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getCase(), api.getReport()])
      .then(([c, r]) => {
        setCaseInfo(c);
        setReport(r);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorPanel message={error} />;
  if (!caseInfo || !report) return <LoadingPanel />;

  const tierCounts = TIER_ORDER.map((tier) => ({
    tier,
    count: report.drafts.filter((d) => d.tier === tier).length,
  }));

  return (
    <div className="w-full py-8 px-4 flex justify-center bg-canvas">
      <article className="relative w-full max-w-[816px] bg-white shadow-md border border-hairline p-9 text-ink overflow-hidden">
        {/* Pending Review watermark — the visual distinction this whole app hinges on */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden select-none">
          <div className="transform -rotate-45 whitespace-nowrap font-headline text-headline-lg font-bold uppercase tracking-[0.25em] text-pending opacity-[0.08] text-center leading-relaxed">
            AI DRAFT — PENDING HUMAN REVIEW &amp; SIGN-OFF
            <br />
            NOT VALID FOR CLINICAL DECISION-MAKING
          </div>
        </div>

        <div className="relative z-20 mb-6 bg-surface-container-low border-l-4 border-pending p-3.5 flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary text-[20px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            assignment_late
          </span>
          <div className="flex flex-col">
            <span className="font-ui text-ui-label-bold uppercase tracking-wider text-tertiary">Pending Human Review</span>
            <p className="font-ui text-ui-body-md text-on-surface-variant mt-0.5">
              This draft was synthesized by <strong className="text-primary font-ui-label-bold">{caseInfo.aiModel}</strong> from real
              VEP + ClinVar annotation. It stays in Pending Review and cannot be exported or finalized until a human explicitly
              approves it in Review &amp; Sign-Off — this is a portfolio/demo tool, not a validated clinical device.
            </p>
          </div>
        </div>

        <header className="relative z-20 pb-4 mb-5 border-b-2 border-primary">
          <h1 className="font-headline text-headline-md text-primary tracking-tight font-bold">CLINICAL VARIANT REPORT REVIEWER</h1>
          <span className="font-ui text-caption uppercase tracking-wider text-on-surface-variant mt-0.5 block">
            Automated draft — portfolio/demo project, not a real diagnostic laboratory
          </span>
        </header>

        <section className="relative z-20 mb-6 bg-surface-container-lowest border border-hairline">
          <div className="grid grid-cols-2 divide-x divide-y divide-hairline">
            <Field label="Sample" value={`${caseInfo.sampleId} (${caseInfo.sampleDescription})`} />
            <Field label="Region" value={`${caseInfo.region} (${caseInfo.assembly})`} />
            <Field label="Variant Caller" value={`${caseInfo.variantCaller} via ${caseInfo.pipeline}`} />
            <Field label="Annotation" value={`${caseInfo.annotationTool} • ${caseInfo.clinvarSource}`} />
          </div>
        </section>

        <section className="relative z-20 mb-6 bg-surface-container-lowest border-2 border-secondary p-4">
          <div className="flex items-center gap-3">
            <div>
              <span className="font-ui text-caption uppercase tracking-wider text-secondary font-bold">Summary</span>
              <h2 className="font-headline text-headline-sm text-primary tracking-tight">
                {report.totalVariantsReviewed} variants annotated — {report.significantVariantCount} significant enough for an
                individual AI-drafted explanation
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {tierCounts.map(({ tier, count }) => (
              <div key={tier} className="flex items-center gap-1.5">
                <AcmgChip tier={tier} />
                <span className="font-genomic text-code-genomic-sm text-on-surface-variant">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="relative z-20 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-ui text-caption uppercase tracking-wider text-primary">Drafted Variants ({caseInfo.assembly})</span>
          </div>
          <div className="overflow-x-auto border border-hairline">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container text-primary font-ui text-caption uppercase tracking-wider border-b border-hairline">
                  <th className="py-2 px-2.5">Gene</th>
                  <th className="py-2 px-2.5">cDNA Change</th>
                  <th className="py-2 px-2.5">Consequence</th>
                  <th className="py-2 px-2.5 text-right">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline font-genomic text-code-genomic">
                {report.drafts.map((d) => {
                  const key = `${d.chrom}:${d.pos}`;
                  return (
                    <tr key={key} className="bg-white hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-2.5 px-2.5 font-ui text-ui-body-md text-primary font-semibold">{d.gene ?? "—"}</td>
                      <td className="py-2.5 px-2.5 text-primary">{d.hgvsc ?? key}</td>
                      <td className="py-2.5 px-2.5 text-on-surface-variant text-code-genomic-sm">{d.consequence}</td>
                      <td className="py-2.5 px-2.5 text-right">
                        <Link to={`/variant/${encodeURIComponent(key)}`}>
                          <AcmgChip tier={d.tier} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-1 font-ui text-caption text-outline">
            {report.nonSignificantSummary.count} additional lower-impact variants were reviewed but not individually drafted — see
            Worklist for the full breakdown. {report.disclaimer}
          </p>
        </section>

        <footer className="relative z-20 mt-8 border-2 border-dashed border-pending bg-surface-container-low p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary-container text-[24px]">pending_actions</span>
            <div>
              <span className="font-ui text-ui-label-bold uppercase tracking-wider text-tertiary block">
                SIGNATURE PENDING — DRAFT UNLOCKED FOR REVIEW
              </span>
              <span className="font-ui text-caption text-on-surface-variant">
                This document cannot be finalized without an explicit human Reviewed &amp; Approved action.
              </span>
            </div>
          </div>
          <Link
            to="/sign-off"
            className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-on-secondary font-ui text-ui-label-bold uppercase tracking-wider transition-colors"
          >
            Go to Review &amp; Sign-Off
          </Link>
        </footer>
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5">
      <span className="block font-ui text-caption uppercase tracking-wider text-outline">{label}</span>
      <span className="font-ui text-ui-body-md text-primary">{value}</span>
    </div>
  );
}
