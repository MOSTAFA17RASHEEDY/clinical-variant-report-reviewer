import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { ClassifiedVariant, DraftReport, ReviewStatusResponse } from "../api/types";
import { AcmgChip } from "../components/AcmgChip";
import { ErrorPanel, LoadingPanel } from "./Worklist";
import { getReviewerName } from "../lib/settings";
import { DecisionPanel } from "../components/DecisionPanel";

export function VariantDetail() {
  const { variantKey = "" } = useParams();
  const [report, setReport] = useState<DraftReport | null>(null);
  const [classified, setClassified] = useState<ClassifiedVariant | null>(null);
  const [review, setReview] = useState<ReviewStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redrafting, setRedrafting] = useState(false);
  const [redraftError, setRedraftError] = useState<string | null>(null);

  function reload() {
    Promise.all([api.getReport(), api.getVariants(), api.getReview()])
      .then(([r, variants, rv]) => {
        setReport(r);
        setClassified(variants.find((v) => `${v.chrom}:${v.pos}` === variantKey) ?? null);
        setReview(rv);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(reload, [variantKey]);

  if (error) return <ErrorPanel message={error} />;
  if (!report || !review) return <LoadingPanel />;

  const draft = report.drafts.find((d) => `${d.chrom}:${d.pos}` === variantKey);
  if (!draft) return <ErrorPanel message={`No AI draft exists for ${variantKey} — it wasn't significant enough to draft (see Worklist).`} />;

  const decision = review.state.decisions[variantKey] ?? null;

  async function handleRedraft() {
    setRedrafting(true);
    setRedraftError(null);
    try {
      await api.redraft(variantKey);
      reload();
    } catch (err) {
      setRedraftError(err instanceof Error ? err.message : String(err));
    } finally {
      setRedrafting(false);
    }
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-6 shadow-sm relative">
            <div className="absolute top-6 right-6">
              <AcmgChip tier={draft.tier} />
            </div>
            <div className="flex flex-col gap-1 max-w-[70%]">
              <div className="flex items-center gap-2.5">
                <span className="font-ui text-headline-md text-primary tracking-tight font-semibold">{draft.gene ?? "—"}</span>
                <span className="px-2 py-0.5 bg-surface-container text-on-surface font-genomic text-caption rounded">
                  {draft.consequence}
                </span>
              </div>
              <div className="font-headline text-headline-lg text-primary tracking-tight mt-1 flex flex-wrap items-baseline gap-3">
                <span className="font-genomic text-[18px] font-semibold text-primary">{draft.hgvsc ?? variantKey}</span>
                {draft.hgvsp && <span className="font-genomic text-[15px] text-on-surface-variant">{draft.hgvsp}</span>}
              </div>
            </div>
            {classified && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 bg-surface-container-low p-4">
                <MiniField label="Coordinate" value={`${classified.chrom}:${classified.pos}`} mono />
                <MiniField label="Allele" value={classified.alleleString} mono />
                <MiniField label="rsID" value={classified.rsIds[0] ?? "none"} mono />
                <MiniField
                  label="Classification source"
                  value={draft.classificationSource === "clinvar" ? "Real ClinVar record" : "Simplified scorer"}
                />
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[20px]">neurology</span>
                <h2 className="font-headline text-headline-sm text-primary">AI-Drafted Explanation</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-surface-container-low text-secondary font-genomic text-caption rounded">
                  confidence: {draft.confidence}
                </span>
                <button
                  onClick={handleRedraft}
                  disabled={redrafting}
                  className="px-2.5 py-1 bg-surface-container-highest hover:bg-surface-variant text-primary font-ui text-ui-label-bold rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[14px] ${redrafting ? "animate-spin" : ""}`}>autorenew</span>
                  {redrafting ? "Re-drafting…" : "Re-draft with AI"}
                </button>
              </div>
            </div>
            {draft.citationCoverageWarning && (
              <div className="mb-3 p-2.5 bg-error-container text-on-error-container text-caption font-ui">
                Citation coverage warning: part of this draft may not cite the evidence list below. Review carefully.
              </div>
            )}
            {redraftError && <div className="mb-3 p-2.5 bg-error-container text-on-error-container text-caption font-ui">{redraftError}</div>}
            <p className="font-headline text-body-narrative text-on-background leading-relaxed">{draft.summary}</p>
          </div>

          <div className="bg-surface-container-lowest p-6 shadow-sm">
            <h3 className="font-headline text-headline-sm text-primary mb-3">
              Evidence ({draft.classificationSource === "clinvar" ? "real ClinVar record" : "simplified scoring signals — not real ACMG criteria"})
            </h3>
            <div className="flex flex-col gap-2.5">
              {draft.citations.map((c) => (
                <div key={c.index} className="p-2.5 bg-surface-container-low border-l-2 border-secondary text-caption">
                  <div className="font-ui text-ui-label-bold text-secondary">
                    [{c.index}] {c.label}
                  </div>
                  <p className="font-ui text-ui-body-md text-on-surface-variant mt-0.5">{c.description}</p>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noreferrer" className="font-ui text-caption text-secondary hover:underline">
                      View source →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <DecisionPanel
            variantKey={variantKey}
            draft={draft}
            decision={decision}
            reviewer={getReviewerName()}
            onDecided={reload}
          />
          <Link
            to="/sign-off"
            className="w-full py-3 px-4 bg-secondary hover:bg-secondary/90 text-on-secondary font-ui text-ui-label-bold uppercase tracking-wider text-center transition-colors"
          >
            Go to Review &amp; Sign-Off
          </Link>
        </div>
      </div>
    </div>
  );
}

function MiniField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="font-ui text-caption text-on-surface-variant uppercase tracking-wider">{label}</span>
      <span className={`${mono ? "font-genomic text-code-genomic-sm" : "font-ui text-ui-body-md"} text-primary mt-0.5`}>{value}</span>
    </div>
  );
}
