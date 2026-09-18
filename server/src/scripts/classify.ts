import fs from "node:fs";
import path from "node:path";
import { config } from "../lib/config.js";
import { classifyVariant, type ClassifiedVariant } from "../lib/classify-pipeline.js";
import type { AnnotatedVariant } from "../lib/annotate-pipeline.js";

const INPUT = path.join(config.projectRoot, "data/annotated/variants.json");
const OUTPUT = path.join(config.projectRoot, "data/annotated/classified-variants.json");

function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`${INPUT} not found — run "npm run annotate" first (Phase 1).`);
    process.exit(1);
  }

  const variants: AnnotatedVariant[] = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const classified: ClassifiedVariant[] = variants.map(classifyVariant);

  fs.writeFileSync(OUTPUT, JSON.stringify(classified, null, 2));

  const fromClinvar = classified.filter((v) => v.classification.source === "clinvar").length;
  const fromScorer = classified.filter((v) => v.classification.source === "simplified-scorer").length;

  const tierCounts: Record<string, number> = {};
  for (const v of classified) {
    tierCounts[v.classification.tier] = (tierCounts[v.classification.tier] ?? 0) + 1;
  }

  console.log(`Classified ${classified.length} variants. Wrote ${OUTPUT}\n`);
  console.log(`  From real ClinVar classification: ${fromClinvar}`);
  console.log(`  From simplified ACMG-inspired scorer (not clinical-grade): ${fromScorer}\n`);
  console.log("Tier breakdown:");
  for (const tier of ["Pathogenic", "Likely Pathogenic", "VUS", "Likely Benign", "Benign"]) {
    console.log(`  ${tier.padEnd(18)} ${tierCounts[tier] ?? 0}`);
  }
}

main();
