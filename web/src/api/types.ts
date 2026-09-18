export type CaseInfo = {
  sampleId: string;
  sampleDescription: string;
  region: string;
  assembly: string;
  variantCaller: string;
  pipeline: string;
  sourceNote: string;
  annotationTool: string;
  clinvarSource: string;
  aiModel: string;
};

export type ClinVarRecord = {
  uid: string;
  accession: string;
  title: string;
  objType: string;
  geneSymbol: string | null;
  clinicalSignificance: string;
  reviewStatus: string;
  starRating: 0 | 1 | 2 | 3 | 4;
  lastEvaluated: string | null;
  conditions: string[];
  isConflicting: boolean;
  url: string;
};

export type ScoringEvidence = {
  code: string;
  description: string;
  direction: "pathogenic" | "benign";
  strength: "strong" | "moderate" | "supporting";
};

export type AcmgTier = "Pathogenic" | "Likely Pathogenic" | "VUS" | "Likely Benign" | "Benign";

export type Citation = {
  index: number;
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
  tier: AcmgTier;
  classificationSource: "clinvar" | "simplified-scorer";
  confidence: string;
  citations: Citation[];
  summary: string;
  citationCoverageWarning: boolean;
  status: "ai_drafted_pending_review";
};

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

export type ClassifiedVariant = {
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
  clinvar: { source: "rsid" | "coordinate" | "none"; exactMatch: boolean; records: ClinVarRecord[] };
  classification:
    | { source: "clinvar"; tier: AcmgTier; confidence: "confirmed"; clinvarRecord: ClinVarRecord }
    | {
        source: "simplified-scorer";
        tier: AcmgTier;
        confidence: "high" | "medium" | "low";
        evidence: ScoringEvidence[];
        simplified: true;
      };
};

export type ClaimDecisionValue = "accepted" | "edited" | "rejected";

export type ClaimDecision = {
  variantKey: string;
  decision: ClaimDecisionValue;
  originalSummary: string;
  editedSummary: string | null;
  reviewerNote: string | null;
  reviewer: string;
  decidedAt: string;
};

export type Approval = { approvedBy: string; approvedAt: string; attestationText: string };

export type ReviewState = {
  reportGeneratedAt: string;
  decisions: Record<string, ClaimDecision>;
  approval: Approval | null;
};

export type AuditLogEntry = {
  timestamp: string;
  reviewer: string;
  action: "decide_claim" | "revise_claim" | "approve_report";
  variantKey: string | null;
  details: Record<string, unknown>;
};

export type ApprovalCheck =
  | { canApprove: true }
  | { canApprove: false; reason: string; undecidedVariantKeys: string[] };

export type ReviewStatusResponse = {
  state: ReviewState;
  auditLog: AuditLogEntry[];
  approvalCheck: ApprovalCheck;
  requiredAttestationText: string;
};

export type FinalReport = {
  status: "reviewed_and_approved";
  disclaimer: string;
  approvedBy: string;
  approvedAt: string;
  variants: { variantKey: string; gene: string | null; tier: string; finalSummary: string; wasEdited: boolean; reviewerNote: string | null }[];
  excludedByReviewer: string[];
};
