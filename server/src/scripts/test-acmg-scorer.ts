// Sanity-checks the simplified ACMG-inspired scorer against a few
// hand-built, clearly-labeled scenarios (not real variant data) before
// wiring it to the real VEP output.
import { scoreVariant, type ScoreInput } from "../lib/acmg-scorer.js";

function run(label: string, input: ScoreInput) {
  const result = scoreVariant(input);
  console.log(`\n--- ${label} ---`);
  console.log("tier:", result.tier, "| confidence:", result.confidence);
  for (const e of result.evidence) console.log(" ", e.code, `(${e.strength}, ${e.direction})`, "-", e.description);
}

run("Frameshift, absent from population data (expect Pathogenic/high)", {
  consequenceTerms: ["frameshift_variant"],
  impact: "HIGH",
  siftPrediction: null,
  polyphenPrediction: null,
  populationAf: null,
  hasKnownExistingVariant: false,
});

run("Common synonymous variant, AF 12% (expect Benign/high)", {
  consequenceTerms: ["synonymous_variant"],
  impact: "LOW",
  siftPrediction: null,
  polyphenPrediction: null,
  populationAf: 0.12,
  hasKnownExistingVariant: true,
});

run("Rare missense, both predictors damaging (expect Likely Pathogenic)", {
  consequenceTerms: ["missense_variant"],
  impact: "MODERATE",
  siftPrediction: "deleterious",
  polyphenPrediction: "probably_damaging",
  populationAf: 0.00005,
  hasKnownExistingVariant: true,
});

run("Missense, conflicting predictors, no frequency data (expect VUS/low)", {
  consequenceTerms: ["missense_variant"],
  impact: "MODERATE",
  siftPrediction: "tolerated",
  polyphenPrediction: "probably_damaging",
  populationAf: null,
  hasKnownExistingVariant: true,
});

run("Intron variant, AF 2% (expect Likely Benign)", {
  consequenceTerms: ["intron_variant"],
  impact: "MODIFIER",
  siftPrediction: null,
  polyphenPrediction: null,
  populationAf: 0.02,
  hasKnownExistingVariant: true,
});
