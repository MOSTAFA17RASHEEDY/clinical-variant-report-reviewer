import fs from "node:fs";
import path from "node:path";
import { config } from "../lib/config.js";
import { parseVepJsonLines, annotateVariant, type AnnotatedVariant } from "../lib/annotate-pipeline.js";

const VEP_OUTPUT = path.join(config.projectRoot, "data/annotated/NA12878.vep.json");
const OUTPUT = path.join(config.projectRoot, "data/annotated/variants.json");

async function main() {
  if (!fs.existsSync(VEP_OUTPUT)) {
    console.error(`VEP output not found at ${VEP_OUTPUT}.`);
    console.error("Run vep/run-vep.sh first (see vep/README.md for the offline-cache vs --database choice).");
    process.exit(1);
  }

  const variants = parseVepJsonLines(fs.readFileSync(VEP_OUTPUT, "utf-8"));
  console.log(`Loaded ${variants.length} VEP-annotated variants. Cross-referencing ClinVar...`);

  const annotated: AnnotatedVariant[] = [];
  for (const [i, v] of variants.entries()) {
    const result = await annotateVariant(v);
    annotated.push(result);
    if ((i + 1) % 25 === 0 || i === variants.length - 1) {
      console.log(`  ${i + 1}/${variants.length}`);
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(annotated, null, 2));

  const withRsidHit = annotated.filter((a) => a.clinvar.source === "rsid").length;
  const withCoordHit = annotated.filter((a) => a.clinvar.source === "coordinate").length;
  const unclassified = annotated.filter((a) => a.clinvar.source === "none").length;
  console.log(`\nDone. Wrote ${OUTPUT}`);
  console.log(`  ClinVar match via rsID:       ${withRsidHit}`);
  console.log(`  ClinVar match via coordinate: ${withCoordHit}`);
  console.log(`  No ClinVar classification:    ${unclassified} (candidates for Phase 2 scoring)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
