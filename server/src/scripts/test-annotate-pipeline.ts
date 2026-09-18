// Exercises the annotate pipeline's parsing + ClinVar cross-reference logic
// against a hand-written fixture shaped like real VEP --json output for a
// real, known variant (rs334 / HBB c.20A>T). This is NOT a real VEP run —
// it's here so the pipeline logic can be validated (JSON Lines parsing,
// canonical transcript selection, rsID extraction, ClinVar matching) before
// spending the time/disk to actually run Docker + VEP on the real sarek VCF.
import { parseVepJsonLines, annotateVariant } from "../lib/annotate-pipeline.js";

const FIXTURE_JSONL = `
{"input":"20\\t5227002\\t.\\tA\\tT\\t.\\t.\\t.","id":"variant1","seq_region_name":"20","start":5227002,"end":5227002,"allele_string":"A/T","most_severe_consequence":"missense_variant","colocated_variants":[{"id":"rs334","clin_sig":["pathogenic"]}],"transcript_consequences":[{"gene_symbol":"HBB","gene_id":"ENSG00000244734","transcript_id":"ENST00000335295","consequence_terms":["missense_variant"],"biotype":"protein_coding","canonical":1,"impact":"MODERATE","hgvsc":"ENST00000335295.4:c.20A>T","hgvsp":"ENSP00000333994.4:p.Glu7Val"}]}
{"input":"1\\t123456\\t.\\tC\\tG\\t.\\t.\\t.","id":"variant2","seq_region_name":"1","start":123456,"end":123456,"allele_string":"C/G","most_severe_consequence":"intron_variant","transcript_consequences":[{"gene_symbol":"NOTAREALGENE1","consequence_terms":["intron_variant"],"biotype":"protein_coding","canonical":1,"impact":"MODIFIER"}]}
`.trim();

async function main() {
  const variants = parseVepJsonLines(FIXTURE_JSONL);
  console.log(`Parsed ${variants.length} fixture variants (expected 2).`);

  const [hbb, novel] = await Promise.all(variants.map(annotateVariant));

  console.log("\n--- rs334/HBB (expect ClinVar match via rsID, Pathogenic) ---");
  console.log({
    gene: hbb.gene,
    hgvsc: hbb.hgvsc,
    clinvarSource: hbb.clinvar.source,
    topClassification: hbb.clinvar.records[0]?.clinicalSignificance,
  });

  console.log("\n--- fabricated novel variant (expect no ClinVar match, source 'none') ---");
  console.log({
    gene: novel.gene,
    clinvarSource: novel.clinvar.source,
    recordCount: novel.clinvar.records.length,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
