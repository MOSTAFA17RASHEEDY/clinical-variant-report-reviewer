import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import type { VariantDraft } from "./report-drafter.js";

export const REPORT_PATH = path.join(config.projectRoot, "data/annotated/draft-report.json");
export const FINAL_REPORT_PATH = path.join(config.projectRoot, "data/annotated/final-report.json");
export const CLASSIFIED_VARIANTS_PATH = path.join(config.projectRoot, "data/annotated/classified-variants.json");

export type DraftReport = {
  generatedAt: string;
  status: "pending_review";
  disclaimer: string;
  totalVariantsReviewed: number;
  significantVariantCount: number;
  drafts: VariantDraft[];
  failures: { variant: string; error: string }[];
  nonSignificantSummary: { count: number; note: string; byConsequence: Record<string, number> };
};

export function loadDraftReport(): DraftReport {
  if (!fs.existsSync(REPORT_PATH)) {
    throw new Error(`${REPORT_PATH} not found — run "npm run draft-report" first (Phase 3).`);
  }
  return JSON.parse(fs.readFileSync(REPORT_PATH, "utf-8"));
}

export function saveDraftReport(report: DraftReport): void {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}
