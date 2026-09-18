/**
 * Real, static metadata about the one real dataset this project runs
 * against — shown in the UI instead of a fabricated patient case. NA12878
 * is a real, publicly-consented reference sample (Coriell/Genome in a
 * Bottle) used worldwide for pipeline validation, not a fictional person.
 */
export const CASE_INFO = {
  sampleId: "NA12878",
  sampleDescription: "Coriell/GIAB reference sample (public, de-identified — not a real patient)",
  region: "chr20:1-10,000,000",
  assembly: "GRCh38",
  variantCaller: "Strelka2",
  pipeline: "nf-core/sarek",
  sourceNote: "Real VCF output copied from the Bio Pipeline Dashboard project's sarek-reproduction run",
  annotationTool: "Ensembl VEP (Docker, --database mode)",
  clinvarSource: "Live NCBI E-utilities",
  aiModel: "Google Gemini (gemini-flash-lite-latest, free tier)",
};
