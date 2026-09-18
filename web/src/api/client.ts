import type {
  CaseInfo,
  DraftReport,
  ClassifiedVariant,
  ReviewStatusResponse,
  FinalReport,
  ClaimDecisionValue,
  VariantDraft,
} from "./types";
import { getGeminiKey } from "../lib/settings";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getCase: () => request<CaseInfo>("/case"),
  getReport: () => request<DraftReport>("/report"),
  getVariants: () => request<ClassifiedVariant[]>("/variants"),
  getReview: () => request<ReviewStatusResponse>("/review"),
  getFinalReport: () => request<FinalReport>("/final-report"),

  decide: (variantKey: string, decision: ClaimDecisionValue, reviewer: string, opts: { editedSummary?: string; note?: string } = {}) =>
    request("/review/decide", {
      method: "POST",
      body: JSON.stringify({ variantKey, decision, reviewer, ...opts }),
    }),

  approve: (reviewer: string, attestationText: string) =>
    request<{ ok: true; approval: unknown }>("/review/approve", {
      method: "POST",
      body: JSON.stringify({ reviewer, attestationText }),
    }),

  redraft: (variantKey: string) =>
    request<VariantDraft>(`/redraft/${encodeURIComponent(variantKey)}`, {
      method: "POST",
      headers: getGeminiKey() ? { "X-Gemini-Api-Key": getGeminiKey()! } : {},
    }),
};
