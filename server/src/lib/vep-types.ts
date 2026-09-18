// Shape of one line of VEP's --json output (JSON Lines format — one object
// per variant per line, not a wrapped array). Only the fields this project
// actually uses are typed; VEP's real output has more.
export type VepColocatedVariant = {
  id: string; // rsID, e.g. "rs334"
  clin_sig?: string[];
  allele_string?: string;
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
