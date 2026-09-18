// Validates the deterministic citation-building logic (the part that must
// never hallucinate, since it's the ground truth Gemini is only allowed to
// explain, not invent) against fixtures — no real Gemini call needed here.
import { buildCitations } from "../lib/report-drafter.js";
import type { ClassifiedVariant } from "../lib/classify-pipeline.js";

function base(overrides: Partial<ClassifiedVariant>): ClassifiedVariant {
  return {
    chrom: "chr20",
    pos: 1,
    alleleString: "A/T",
    rsIds: [],
    gene: "TESTGENE",
    consequence: "missense_variant",
    consequenceTerms: ["missense_variant"],
    impact: "MODERATE",
    hgvsc: null,
    hgvsp: null,
    siftPrediction: null,
    polyphenPrediction: null,
    populationAf: null,
    clinvar: { source: "none", exactMatch: false, records: [] },
    classification: { source: "simplified-scorer", tier: "VUS", confidence: "low", evidence: [], simplified: true },
    ...overrides,
  } as ClassifiedVariant;
}

console.log("--- ClinVar-sourced citation (expect 1 citation, kind=clinvar) ---");
console.log(
  buildCitations(
    base({
      classification: {
        source: "clinvar",
        tier: "Pathogenic",
        confidence: "confirmed",
        clinvarRecord: {
          uid: "1",
          accession: "VCV000017677",
          title: "test",
          objType: "Duplication",
          geneSymbol: "BRCA1",
          clinicalSignificance: "Pathogenic",
          reviewStatus: "reviewed by expert panel",
          starRating: 3,
          lastEvaluated: null,
          conditions: ["Breast-ovarian cancer"],
          isConflicting: false,
          url: "https://www.ncbi.nlm.nih.gov/clinvar/variation/17677/",
        },
      },
    }),
  ),
);

console.log("\n--- Simplified-scorer citation, 2 evidence entries (expect 2 citations, indexes 1 and 2) ---");
console.log(
  buildCitations(
    base({
      classification: {
        source: "simplified-scorer",
        tier: "Likely Pathogenic",
        confidence: "medium",
        simplified: true,
        evidence: [
          { code: "PM2-like", description: "Absent from population data", direction: "pathogenic", strength: "moderate" },
          { code: "PP3-like", description: "Both predictors damaging", direction: "pathogenic", strength: "supporting" },
        ],
      },
    }),
  ),
);

console.log("\n--- Simplified-scorer, zero evidence (expect 1 fallback citation) ---");
console.log(buildCitations(base({})));
