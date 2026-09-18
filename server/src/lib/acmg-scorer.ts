/**
 * SIMPLIFIED ACMG-INSPIRED VARIANT SCORER — NOT A CLINICAL-GRADE CLASSIFIER.
 *
 * The real ACMG/AMP guidelines (Richards et al. 2015) combine ~28 weighted
 * evidence codes (PVS1, PS1-4, PM1-6, PP1-5, BA1, BS1-4, BP1-7) — things
 * like segregation studies, functional assays, and de novo confirmation —
 * into a formal points system. This scorer implements a small, honest
 * subset of that logic using only what's computable from VEP annotation
 * and public population frequency data: predicted loss-of-function status,
 * in-silico deleteriousness (SIFT/PolyPhen), and population allele
 * frequency. It exists to give unclassified variants a starting-point tier
 * and a citable reason, not a diagnosis. Every output must be labeled
 * "simplified, not a clinical-grade classifier" everywhere it's shown.
 */

export type AcmgTier =
  | "Pathogenic"
  | "Likely Pathogenic"
  | "VUS"
  | "Likely Benign"
  | "Benign";

/**
 * Maps a real ClinVar clinical significance string to our 5-tier display
 * enum. This is just a display-normalization step (ClinVar's classification
 * IS the real, authoritative one here) — not the simplified scorer, which
 * only ever runs for variants ClinVar hasn't confirmed a classification for.
 */
export function mapClinvarSignificanceToTier(clinicalSignificance: string): AcmgTier {
  const s = clinicalSignificance.toLowerCase();
  if (s.includes("likely pathogenic")) return "Likely Pathogenic";
  if (s.includes("pathogenic")) return "Pathogenic";
  if (s.includes("likely benign")) return "Likely Benign";
  if (s.includes("benign")) return "Benign";
  return "VUS"; // covers "uncertain significance", "conflicting", "not provided", etc.
}

export type ScoringEvidence = {
  code: string; // e.g. "PVS1-like", "BA1-like" — named after the real ACMG code it's *inspired by*, not a real assertion of that code
  description: string;
  direction: "pathogenic" | "benign";
  strength: "strong" | "moderate" | "supporting";
};

export type ScoreInput = {
  consequenceTerms: string[];
  impact: "HIGH" | "MODERATE" | "LOW" | "MODIFIER" | null;
  siftPrediction: string | null; // e.g. "deleterious", "tolerated"
  polyphenPrediction: string | null; // e.g. "probably_damaging", "benign"
  populationAf: number | null; // max population allele frequency found, 0-1
  hasKnownExistingVariant: boolean; // any colocated rsID at all (proxy for "not brand new")
};

export type AcmgScore = {
  tier: AcmgTier;
  confidence: "high" | "medium" | "low";
  evidence: ScoringEvidence[];
  simplified: true; // always present — a structural reminder this is not clinical-grade
};

const LOF_CONSEQUENCES = new Set([
  "transcript_ablation",
  "splice_acceptor_variant",
  "splice_donor_variant",
  "stop_gained",
  "frameshift_variant",
  "stop_lost",
  "start_lost",
]);

const BENIGN_LEANING_CONSEQUENCES = new Set([
  "synonymous_variant",
  "intron_variant",
  "5_prime_UTR_variant",
  "3_prime_UTR_variant",
  "upstream_gene_variant",
  "downstream_gene_variant",
  "non_coding_transcript_exon_variant",
  "non_coding_transcript_variant",
]);

function gatherEvidence(input: ScoreInput): ScoringEvidence[] {
  const evidence: ScoringEvidence[] = [];
  const isLof = input.consequenceTerms.some((c) => LOF_CONSEQUENCES.has(c));
  const isBenignLeaningConsequence = input.consequenceTerms.every((c) =>
    BENIGN_LEANING_CONSEQUENCES.has(c),
  );
  const isMissense = input.consequenceTerms.includes("missense_variant");

  // PVS1-like: predicted loss-of-function.
  if (isLof && input.impact === "HIGH") {
    evidence.push({
      code: "PVS1-like",
      description: `Predicted loss-of-function consequence (${input.consequenceTerms.join(", ")})`,
      direction: "pathogenic",
      strength: "strong",
    });
  }

  // BA1-like / BS1-like: population frequency.
  if (input.populationAf !== null) {
    if (input.populationAf > 0.05) {
      evidence.push({
        code: "BA1-like",
        description: `Population allele frequency ${(input.populationAf * 100).toFixed(2)}% exceeds the 5% threshold ACMG uses to stand alone as benign`,
        direction: "benign",
        strength: "strong",
      });
    } else if (input.populationAf > 0.01) {
      evidence.push({
        code: "BS1-like",
        description: `Population allele frequency ${(input.populationAf * 100).toFixed(2)}% is higher than expected for a rare disease-causing variant`,
        direction: "benign",
        strength: "moderate",
      });
    } else if (input.populationAf < 0.0001) {
      evidence.push({
        code: "PM2-like",
        description: "Absent or extremely rare in population frequency data",
        direction: "pathogenic",
        strength: "moderate",
      });
    }
  } else if (!input.hasKnownExistingVariant) {
    evidence.push({
      code: "PM2-like",
      description: "Not found in any known variant database (no population frequency data at all)",
      direction: "pathogenic",
      strength: "supporting",
    });
  }

  // PP3-like / BP4-like: in-silico predictions, only meaningful for missense.
  if (isMissense && input.siftPrediction && input.polyphenPrediction) {
    const siftDeleterious = input.siftPrediction.includes("deleterious");
    const polyphenDamaging = input.polyphenPrediction.includes("damaging");
    if (siftDeleterious && polyphenDamaging) {
      evidence.push({
        code: "PP3-like",
        description: `Both SIFT (${input.siftPrediction}) and PolyPhen (${input.polyphenPrediction}) predict a deleterious effect`,
        direction: "pathogenic",
        strength: "supporting",
      });
    } else if (!siftDeleterious && !polyphenDamaging) {
      evidence.push({
        code: "BP4-like",
        description: `Both SIFT (${input.siftPrediction}) and PolyPhen (${input.polyphenPrediction}) predict a benign effect`,
        direction: "benign",
        strength: "supporting",
      });
    }
  }

  // BP7-like: synonymous/non-coding consequence with no other pathogenic signal.
  if (isBenignLeaningConsequence) {
    evidence.push({
      code: "BP7-like",
      description: `Consequence (${input.consequenceTerms.join(", ")}) is not expected to alter protein function`,
      direction: "benign",
      strength: "supporting",
    });
  }

  return evidence;
}

const STRENGTH_WEIGHT: Record<ScoringEvidence["strength"], number> = {
  strong: 4,
  moderate: 2,
  supporting: 1,
};

/**
 * Combines evidence into a tier using a simplified points threshold —
 * NOT the real ACMG/AMP combining rules (which use specific combinations of
 * evidence codes, not a plain weighted sum). This is a deliberately cruder
 * approximation, labeled as such everywhere it surfaces.
 */
export function scoreVariant(input: ScoreInput): AcmgScore {
  const evidence = gatherEvidence(input);

  let pathogenicScore = 0;
  let benignScore = 0;
  for (const e of evidence) {
    const weight = STRENGTH_WEIGHT[e.strength];
    if (e.direction === "pathogenic") pathogenicScore += weight;
    else benignScore += weight;
  }

  const netScore = pathogenicScore - benignScore;
  let tier: AcmgTier;
  if (netScore >= 4) tier = "Pathogenic";
  else if (netScore >= 2) tier = "Likely Pathogenic";
  else if (netScore <= -4) tier = "Benign";
  else if (netScore <= -2) tier = "Likely Benign";
  else tier = "VUS";

  // Confidence reflects how much evidence exists at all, not how "sure" the
  // tier is — a VUS from zero evidence and a VUS from conflicting strong
  // evidence are both real outcomes but very different situations.
  const totalEvidenceWeight = pathogenicScore + benignScore;
  let confidence: AcmgScore["confidence"];
  if (evidence.some((e) => e.strength === "strong") || totalEvidenceWeight >= 5) {
    confidence = "high";
  } else if (totalEvidenceWeight >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return { tier, confidence, evidence, simplified: true };
}
