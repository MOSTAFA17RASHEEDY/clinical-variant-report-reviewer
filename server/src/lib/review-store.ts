import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { emptyReviewState, type ReviewState, type AuditLogEntry } from "./review-workflow.js";

const STATE_PATH = path.join(config.projectRoot, "data/annotated/review-state.json");
const AUDIT_LOG_PATH = path.join(config.projectRoot, "data/annotated/audit-log.json");

/**
 * Review state is tied to a specific report generation (by its
 * generatedAt timestamp). If Phase 3's draft-report.ts is re-run, it
 * produces new AI text that has never been reviewed — silently carrying an
 * old approval or old per-claim decisions forward onto different text would
 * be a real integrity bug, not a convenience. Loading against a mismatched
 * report refuses rather than guessing.
 */
export function loadReviewState(reportGeneratedAt: string): ReviewState {
  if (!fs.existsSync(STATE_PATH)) return emptyReviewState(reportGeneratedAt);

  const existing: ReviewState = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
  if (existing.reportGeneratedAt !== reportGeneratedAt) {
    throw new Error(
      `Review state on disk was recorded against a report generated at ${existing.reportGeneratedAt}, ` +
        `but the current report was generated at ${reportGeneratedAt}. The draft report changed since ` +
        `it was reviewed — refusing to reuse stale review decisions. Delete ${STATE_PATH} to start a fresh review.`,
    );
  }
  return existing;
}

export function saveReviewState(state: ReviewState): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

/** Audit log is append-only by construction — there is no delete/edit function. */
export function appendAuditLog(entry: AuditLogEntry): void {
  const existing: AuditLogEntry[] = fs.existsSync(AUDIT_LOG_PATH)
    ? JSON.parse(fs.readFileSync(AUDIT_LOG_PATH, "utf-8"))
    : [];
  existing.push(entry);
  fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(existing, null, 2));
}

export function readAuditLog(): AuditLogEntry[] {
  if (!fs.existsSync(AUDIT_LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(AUDIT_LOG_PATH, "utf-8"));
}
