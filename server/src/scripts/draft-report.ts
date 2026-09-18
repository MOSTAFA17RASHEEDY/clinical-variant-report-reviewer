import fs from "node:fs";
import path from "node:path";
import { config } from "../lib/config.js";
import { draftVariantExplanation, type VariantDraft } from "../lib/report-drafter.js";
import { GeminiRateLimitError } from "../lib/gemini.js";
import type { ClassifiedVariant } from "../lib/classify-pipeline.js";

const INPUT = path.join(config.projectRoot, "data/annotated/classified-variants.json");
const OUTPUT = path.join(config.projectRoot, "data/annotated/draft-report.json");

/**
 * Not every variant gets an individual AI-drafted explanation — a real
 * report wouldn't discuss every intronic SNP by name either. "Significant"
 * here means: a real confirmed ClinVar classification (always worth
 * reporting, even if benign), OR the simplified scorer found more than the
 * weakest possible signal (confidence above "low"), OR a HIGH/MODERATE
 * predicted impact regardless of confidence (a missense/LoF variant is
 * worth a written note even if the evidence for it is thin).
 */
function isSignificant(v: ClassifiedVariant): boolean {
  if (v.classification.source === "clinvar") return true;
  if (v.classification.confidence !== "low") return true;
  if (v.impact === "HIGH" || v.impact === "MODERATE") return true;
  return false;
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`${INPUT} not found — run "npm run classify" first (Phase 2).`);
    process.exit(1);
  }

  const variants: ClassifiedVariant[] = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const significant = variants.filter(isSignificant);
  const rest = variants.filter((v) => !isSignificant(v));

  console.log(`${variants.length} total variants — ${significant.length} significant enough for an individual AI-drafted explanation, ${rest.length} summarized only.`);

  const drafts: VariantDraft[] = [];
  const failures: { variant: string; error: string }[] = [];

  for (const [i, v] of significant.entries()) {
    try {
      const draft = await draftVariantExplanation(v);
      drafts.push(draft);
      console.log(`  [${i + 1}/${significant.length}] ${v.gene ?? v.chrom + ":" + v.pos} -> ${draft.tier}${draft.citationCoverageWarning ? " (citation warning)" : ""}`);
    } catch (err) {
      const label = `${v.gene ?? "unknown"} chr${v.chrom}:${v.pos}`;
      failures.push({ variant: label, error: err instanceof Error ? err.message : String(err) });
      console.error(`  [${i + 1}/${significant.length}] ${label} FAILED: ${err instanceof Error ? err.message : err}`);
      if (err instanceof GeminiRateLimitError) {
        console.error("Stopping early — quota exhausted. Saving progress so far.");
        break;
      }
    }
    // Stay well under typical free-tier per-minute limits.
    await new Promise((r) => setTimeout(r, 2000));
  }

  const restByConsequence: Record<string, number> = {};
  for (const v of rest) {
    restByConsequence[v.consequence] = (restByConsequence[v.consequence] ?? 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    status: "pending_review" as const,
    disclaimer:
      "This report is an AI-assisted DRAFT using a simplified, non-clinical-grade scoring system. It is not a validated clinical result and must not inform medical decisions until a qualified human reviewer explicitly approves it.",
    totalVariantsReviewed: variants.length,
    significantVariantCount: significant.length,
    drafts,
    failures,
    nonSignificantSummary: {
      count: rest.length,
      note: "Remaining variants were not individually drafted — low-confidence, low/modifier-impact calls a real report also wouldn't discuss variant-by-variant. Counted here for completeness, not hidden.",
      byConsequence: restByConsequence,
    },
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${OUTPUT}`);
  console.log(`  Drafted: ${drafts.length}/${significant.length}`);
  console.log(`  Failed: ${failures.length}`);
  console.log(`  Citation warnings: ${drafts.filter((d) => d.citationCoverageWarning).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
