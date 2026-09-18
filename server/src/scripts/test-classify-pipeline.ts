// Validates the classify pipeline's routing logic (ClinVar-confirmed vs
// simplified-scorer) against hand-built fixtures before running it on the
// real 464-variant Phase 1 output.
import { classifyVariant } from "../lib/classify-pipeline.js";
import type { AnnotatedVariant } from "../lib/annotate-pipeline.js";

function baseVariant(overrides: Partial<AnnotatedVariant>): AnnotatedVariant {
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
    ...overrides,
  };
}

console.log("--- Real ClinVar Pathogenic classification (expect source: clinvar) ---");
const clinvarCase = classifyVariant(
  baseVariant({
    clinvar: {
      source: "rsid",
      exactMatch: true,
      records: [
        {
          uid: "1",
          accession: "VCV000000001",
          title: "test",
          objType: "single nucleotide variant",
          geneSymbol: "TESTGENE",
          clinicalSignificance: "Pathogenic",
          reviewStatus: "reviewed by expert panel",
          starRating: 3,
          lastEvaluated: null,
          conditions: [],
          isConflicting: false,
          url: "",
        },
      ],
    },
  }),
);
console.log(clinvarCase.classification);

console.log("\n--- ClinVar record present but no clinical significance (expect source: simplified-scorer) ---");
const noSignificanceCase = classifyVariant(
  baseVariant({
    consequenceTerms: ["frameshift_variant"],
    impact: "HIGH",
    clinvar: {
      source: "coordinate",
      exactMatch: false,
      records: [
        {
          uid: "2",
          accession: "VCV000000002",
          title: "test2",
          objType: "single nucleotide variant",
          geneSymbol: "TESTGENE",
          clinicalSignificance: "",
          reviewStatus: "",
          starRating: 0,
          lastEvaluated: null,
          conditions: [],
          isConflicting: false,
          url: "",
        },
      ],
    },
  }),
);
console.log(noSignificanceCase.classification);

console.log("\n--- No ClinVar data at all (expect source: simplified-scorer) ---");
const noDataCase = classifyVariant(baseVariant({}));
console.log(noDataCase.classification);
