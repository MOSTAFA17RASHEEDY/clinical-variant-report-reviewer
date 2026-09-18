import { clinvarLookupByRsId, clinvarLookupByCoordinate, type ClinVarRecord } from "./ncbi.js";
import type { VepVariant, VepTranscriptConsequence } from "./vep-types.js";

export type AnnotatedVariant = {
  chrom: string;
  pos: number;
  alleleString: string;
  rsIds: string[];
  gene: string | null;
  consequence: string;
  consequenceTerms: string[];
  impact: string | null;
  hgvsc: string | null;
  hgvsp: string | null;
  siftPrediction: string | null;
  polyphenPrediction: string | null;
  populationAf: number | null;
  clinvar: {
    source: "rsid" | "coordinate" | "none";
    exactMatch: boolean;
    records: ClinVarRecord[];
  };
};

export function pickTranscriptConsequence(v: VepVariant): VepTranscriptConsequence | undefined {
  const tcs = v.transcript_consequences ?? [];
  return tcs.find((tc) => tc.canonical === 1) ?? tcs[0];
}

export function parseVepJsonLines(raw: string): VepVariant[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as VepVariant);
}

// --af's 1000-Genomes frequency data is stored per-allele, per-population
// (e.g. {"T": {"af": 0.23, "eas_af": 0.1, ...}}) — take the highest value
// found anywhere as a conservative "at least this common" signal, since the
// scorer only needs "is this plausibly common" rather than a specific
// population breakdown.
function extractMaxPopulationAf(v: VepVariant): number | null {
  let max: number | null = null;
  for (const cv of v.colocated_variants ?? []) {
    if (!cv.frequencies) continue;
    for (const alleleFreqs of Object.values(cv.frequencies)) {
      for (const val of Object.values(alleleFreqs)) {
        if (typeof val === "number" && (max === null || val > max)) max = val;
      }
    }
  }
  return max;
}

export async function annotateVariant(v: VepVariant): Promise<AnnotatedVariant> {
  const tc = pickTranscriptConsequence(v);
  const gene = tc?.gene_symbol ?? null;
  const hgvsc = tc?.hgvsc ?? null;
  const rsIds = (v.colocated_variants ?? [])
    .map((cv) => cv.id)
    .filter((id) => id.startsWith("rs"));

  const base = {
    chrom: v.seq_region_name,
    pos: v.start,
    alleleString: v.allele_string,
    rsIds,
    gene,
    consequence: v.most_severe_consequence,
    consequenceTerms: tc?.consequence_terms ?? [v.most_severe_consequence],
    impact: tc?.impact ?? null,
    hgvsc,
    hgvsp: tc?.hgvsp ?? null,
    siftPrediction: tc?.sift_prediction ?? null,
    polyphenPrediction: tc?.polyphen_prediction ?? null,
    populationAf: extractMaxPopulationAf(v),
  };

  if (rsIds.length > 0) {
    const records = await clinvarLookupByRsId(rsIds[0]);
    if (records.length > 0) {
      return { ...base, clinvar: { source: "rsid", exactMatch: true, records } };
    }
  }

  if (gene && hgvsc) {
    const { records, exactMatch } = await clinvarLookupByCoordinate(v.seq_region_name, v.start, hgvsc, gene);
    if (records.length > 0) {
      return { ...base, clinvar: { source: "coordinate", exactMatch, records } };
    }
  }

  return { ...base, clinvar: { source: "none", exactMatch: false, records: [] } };
}
