import type { AnnotatedVariant } from "./annotate-pipeline.js";
import { scoreVariant, mapClinvarSignificanceToTier, type AcmgTier, type AcmgScore } from "./acmg-scorer.js";
import type { ClinVarRecord } from "./ncbi.js";

export type Classification =
  | {
      source: "clinvar";
      tier: AcmgTier;
      confidence: "confirmed"; // a real, cited ClinVar classification — not a confidence *level*, a source distinction
      clinvarRecord: ClinVarRecord;
    }
  | ({ source: "simplified-scorer" } & AcmgScore);

export type ClassifiedVariant = AnnotatedVariant & { classification: Classification };

/**
 * A variant only counts as "ClinVar-confirmed" if it has an exact-match
 * record that actually carries a clinical significance string. Being merely
 * *present* in ClinVar (a registered record with no interpretation, like
 * the SNAP25-AS1 variant found in the real Phase 1 run) is not a
 * classification — those variants still go through the simplified scorer.
 */
function confirmedClinvarRecord(v: AnnotatedVariant): ClinVarRecord | null {
  if (!v.clinvar.exactMatch) return null;
  const withSignificance = v.clinvar.records.find(
    (r) => r.clinicalSignificance && r.clinicalSignificance.trim() !== "",
  );
  return withSignificance ?? null;
}

export function classifyVariant(v: AnnotatedVariant): ClassifiedVariant {
  const confirmed = confirmedClinvarRecord(v);
  if (confirmed) {
    return {
      ...v,
      classification: {
        source: "clinvar",
        tier: mapClinvarSignificanceToTier(confirmed.clinicalSignificance),
        confidence: "confirmed",
        clinvarRecord: confirmed,
      },
    };
  }

  const score = scoreVariant({
    consequenceTerms: v.consequenceTerms,
    impact: v.impact as "HIGH" | "MODERATE" | "LOW" | "MODIFIER" | null,
    siftPrediction: v.siftPrediction,
    polyphenPrediction: v.polyphenPrediction,
    populationAf: v.populationAf,
    hasKnownExistingVariant: v.rsIds.length > 0,
  });

  return { ...v, classification: { source: "simplified-scorer", ...score } };
}
