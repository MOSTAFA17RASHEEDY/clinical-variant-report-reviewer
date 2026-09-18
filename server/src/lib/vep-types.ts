// Shape of one line of VEP's --json output (JSON Lines format — one object
// per variant per line, not a wrapped array). Only the fields this project
// actually uses are typed; VEP's real output has more.
export type VepColocatedVariant = {
  id: string; // rsID, e.g. "rs334"
  clin_sig?: string[];
  allele_string?: string;
  // Present only when --af finds 1000-Genomes frequency data for this
  // variant — found (by testing, not assuming) to come back empty/absent
  // for most variants even with --af set in --database mode, since
  // population frequency annotation is normally a cache/plugin-backed
  // feature. Kept optional and the scorer treats "absent" as "unknown", not
  // "definitely rare" — see acmg-scorer.ts / PLAN.md for how this was found.
  frequencies?: Record<string, Record<string, number>>;
};

export type VepTranscriptConsequence = {
  gene_symbol?: string;
  gene_id?: string;
  transcript_id?: string;
  consequence_terms: string[];
  biotype?: string;
  canonical?: number; // 1 = canonical transcript
  impact?: "HIGH" | "MODERATE" | "LOW" | "MODIFIER";
  hgvsc?: string;
  hgvsp?: string;
  amino_acids?: string;
  sift_prediction?: string; // e.g. "deleterious", "tolerated" — missense only
  sift_score?: number;
  polyphen_prediction?: string; // e.g. "probably_damaging", "benign" — missense only
  polyphen_score?: number;
};

export type VepVariant = {
  input: string;
  id?: string;
  seq_region_name: string;
  start: number;
  end: number;
  allele_string: string;
  most_severe_consequence: string;
  colocated_variants?: VepColocatedVariant[];
  transcript_consequences?: VepTranscriptConsequence[];
};
