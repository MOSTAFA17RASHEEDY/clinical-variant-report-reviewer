import { generateJson } from "./gemini.js";
import type { ClassifiedVariant } from "./classify-pipeline.js";

export type Citation = {
  index: number; // 1-based, matches the [n] markers the drafted text uses
  kind: "clinvar" | "scoring-evidence";
  label: string;
  description: string;
  url: string | null;
};

export type VariantDraft = {
  chrom: string;
  pos: number;
  gene: string | null;
  hgvsc: string | null;
  hgvsp: string | null;
  consequence: string;
  tier: string;
  classificationSource: "clinvar" | "simplified-scorer";
  confidence: string;
  citations: Citation[];
  summary: string;
  citationCoverageWarning: boolean;
  status: "ai_drafted_pending_review";
};

/**
 * Citations are built entirely from our own Phase 1/2 data, never from the
 * model — Gemini is only asked to explain evidence we already trust, not to
 * produce the evidence list itself. This is what makes "every claim must
 * cite its evidence source" actually enforceable rather than a hopeful
 * instruction: the citations exist and are correct before the model ever
 * runs, so the model's only job is attribution, which we can then verify.
 */
export function buildCitations(v: ClassifiedVariant): Citation[] {
  if (v.classification.source === "clinvar") {
    const r = v.classification.clinvarRecord;
    return [
      {
        index: 1,
        kind: "clinvar",
        label: `ClinVar ${r.accession}`,
        description: `${r.clinicalSignificance} (${r.reviewStatus}, ${r.starRating}-star review). Conditions: ${
          r.conditions.length > 0 ? r.conditions.join("; ") : "none listed"
        }.`,
        url: r.url,
      },
    ];
  }

  if (v.classification.evidence.length === 0) {
    return [
      {
        index: 1,
        kind: "scoring-evidence",
        label: "No scoring signals found",
        description:
          "The simplified scorer found no loss-of-function, in-silico, or population-frequency signal for this variant — classified as VUS by default absence of evidence, not because evidence points to uncertainty specifically.",
        url: null,
      },
    ];
  }

  return v.classification.evidence.map((e, i) => ({
    index: i + 1,
    kind: "scoring-evidence" as const,
    label: `${e.code} (simplified scoring signal)`,
    description: e.description,
    url: null,
  }));
}

function buildPrompt(v: ClassifiedVariant, citations: Citation[]): string {
  const evidenceList = citations.map((c) => `[${c.index}] ${c.description}`).join("\n");
  const sourceNote =
    v.classification.source === "clinvar"
      ? "This classification comes from a REAL, existing ClinVar entry — state it as an established classification."
      : "This classification comes from a SIMPLIFIED, non-clinical-grade scoring system, not a real ACMG assessment or ClinVar. Say so explicitly.";

  return `You are drafting a PRELIMINARY, PENDING-REVIEW explanation of one genetic variant for a report. A human clinical reviewer will check every word before this report can ever be finalized — nothing you write is final.

Rules, all mandatory:
- Write 2-4 plain-English sentences a non-specialist could follow. Explain any unavoidable jargon in the same sentence.
- Cover: what the variant is and where it is, what the evidence actually says, and its classification tier with how confident that is.
- You MUST support every factual claim using ONLY the numbered evidence below, with an inline [n] citation matching its number. Do not cite a number that isn't listed.
- Do NOT use any outside knowledge about this gene or condition beyond what's given below. If the evidence is thin, say so plainly instead of filling the gap with assumed general knowledge.
- Do NOT state or imply a diagnosis, a treatment recommendation, or clinical certainty. This is a draft classification tier, not a diagnosis.
- ${sourceNote}

Variant: gene ${v.gene ?? "unknown"}, ${v.hgvsc ?? v.alleleString} (${v.consequence}), chr${v.chrom}:${v.pos}
Classification tier: ${v.classification.tier}
Confidence: ${"confidence" in v.classification ? v.classification.confidence : "confirmed"}

Evidence:
${evidenceList}

Respond with JSON only, matching this shape: {"summary": "<your 2-4 sentence explanation with [n] citations>"}`;
}

/**
 * Extracts every citation number used in the drafted text. Handles both
 * "[1] [2]" and a combined "[1, 2]" — found by testing against real output:
 * despite the prompt asking for "[n]" markers, the model sometimes combines
 * adjacent citations into one bracket, which is still a real, valid
 * citation and shouldn't be flagged as a missing one over a formatting
 * difference.
 */
function extractCitedIndexes(text: string): number[] {
  const indexes: number[] = [];
  for (const match of text.matchAll(/\[([\d,\s]+)\]/g)) {
    for (const part of match[1].split(",")) {
      const n = Number(part.trim());
      if (!Number.isNaN(n)) indexes.push(n);
    }
  }
  return indexes;
}

export async function draftVariantExplanation(v: ClassifiedVariant): Promise<VariantDraft> {
  const citations = buildCitations(v);
  const prompt = buildPrompt(v, citations);
  const { summary } = await generateJson<{ summary: string }>(prompt);

  const citedIndexes = extractCitedIndexes(summary);
  const validIndexes = new Set(citations.map((c) => c.index));
  const hasAnyCitation = citedIndexes.length > 0;
  const hasOutOfRangeCitation = citedIndexes.some((i) => !validIndexes.has(i));
  // A coarse but real check: flag for human review rather than silently
  // trusting the model followed the citation rule.
  const citationCoverageWarning = !hasAnyCitation || hasOutOfRangeCitation;

  return {
    chrom: v.chrom,
    pos: v.pos,
    gene: v.gene,
    hgvsc: v.hgvsc,
    hgvsp: v.hgvsp,
    consequence: v.consequence,
    tier: v.classification.tier,
    classificationSource: v.classification.source,
    confidence: "confidence" in v.classification ? v.classification.confidence : "confirmed",
    citations,
    summary,
    citationCoverageWarning,
    status: "ai_drafted_pending_review",
  };
}
