import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { getRedis } from "./kv.js";
import { emptyReviewState, type ReviewState, type AuditLogEntry, type ClaimDecision } from "./review-workflow.js";

const STATE_PATH = path.join(config.projectRoot, "data/annotated/review-state.json");
const AUDIT_LOG_PATH = path.join(config.projectRoot, "data/annotated/audit-log.json");

/**
 * Two storage backends behind the same async interface:
 *
 * - Local files (default): zero setup, matches this project's original
 *   "runs entirely on your laptop" promise for anyone just running it
 *   locally. This is what `npm run review` (the CLI) and a local
 *   `npm run http` use out of the box.
 * - Upstash Redis (when configured): required for deploying live on Vercel
 *   — serverless functions have a read-only filesystem in production, so
 *   file writes for review decisions/approval/audit log would silently not
 *   persist. Upstash's free tier keeps this 100% free either way.
 *
 * Both paths are real and tested, not one "real" and one "best effort."
 *
 * Detection mirrors @upstash/redis's own Redis.fromEnv() exactly (checked
 * its source directly rather than assuming): it accepts
 * UPSTASH_REDIS_REST_URL/TOKEN *or* falls back to KV_REST_API_URL/TOKEN —
 * the names Vercel's own Marketplace `vercel integration add upstash/
 * upstash-kv` actually provisions. Checking only the UPSTASH_* names here
 * would silently miss a real, working KV_REST_API_* setup and fall back to
 * file mode without any error.
 */
export const USE_REDIS = !!(
  (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
  (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
);

const REDIS_KEYS = {
  reportGeneratedAt: "cvrr:review:reportGeneratedAt",
  decisions: "cvrr:review:decisions",
  approval: "cvrr:review:approval",
  auditLog: "cvrr:review:auditlog",
  redrafts: "cvrr:review:redrafts",
} as const;

function staleStateError(storedAt: string, currentAt: string, resetHint: string): Error {
  return new Error(
    `Review state was recorded against a report generated at ${storedAt}, but the current report was ` +
      `generated at ${currentAt}. The draft report changed since it was reviewed — refusing to reuse stale ` +
      `review decisions. ${resetHint}`,
  );
}

async function loadReviewStateRedis(reportGeneratedAt: string): Promise<ReviewState> {
  const redis = getRedis();
  const storedAt = await redis.get<string>(REDIS_KEYS.reportGeneratedAt);
  if (storedAt && storedAt !== reportGeneratedAt) {
    throw staleStateError(storedAt, reportGeneratedAt, `Clear the Redis keys under "cvrr:review:*" to start a fresh review.`);
  }

  const [decisionsRaw, approvalRaw] = await Promise.all([
    redis.hgetall<Record<string, string>>(REDIS_KEYS.decisions),
    redis.get<string>(REDIS_KEYS.approval),
  ]);

  const decisions: Record<string, ClaimDecision> = {};
  for (const [key, value] of Object.entries(decisionsRaw ?? {})) {
    decisions[key] = typeof value === "string" ? JSON.parse(value) : (value as ClaimDecision);
  }

  return {
    reportGeneratedAt,
    decisions,
    approval: approvalRaw ? (typeof approvalRaw === "string" ? JSON.parse(approvalRaw) : approvalRaw) : null,
  };
}

async function saveReviewStateRedis(state: ReviewState): Promise<void> {
  const redis = getRedis();
  await redis.set(REDIS_KEYS.reportGeneratedAt, state.reportGeneratedAt);

  await redis.del(REDIS_KEYS.decisions);
  const entries = Object.entries(state.decisions);
  if (entries.length > 0) {
    const hash: Record<string, string> = {};
    for (const [key, decision] of entries) hash[key] = JSON.stringify(decision);
    await redis.hset(REDIS_KEYS.decisions, hash);
  }

  if (state.approval) {
    await redis.set(REDIS_KEYS.approval, JSON.stringify(state.approval));
  } else {
    await redis.del(REDIS_KEYS.approval);
  }
}

function loadReviewStateFile(reportGeneratedAt: string): ReviewState {
  if (!fs.existsSync(STATE_PATH)) return emptyReviewState(reportGeneratedAt);

  const existing: ReviewState = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
  if (existing.reportGeneratedAt !== reportGeneratedAt) {
    throw staleStateError(existing.reportGeneratedAt, reportGeneratedAt, `Delete ${STATE_PATH} to start a fresh review.`);
  }
  return existing;
}

function saveReviewStateFile(state: ReviewState): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export async function loadReviewState(reportGeneratedAt: string): Promise<ReviewState> {
  return USE_REDIS ? loadReviewStateRedis(reportGeneratedAt) : loadReviewStateFile(reportGeneratedAt);
}

export async function saveReviewState(state: ReviewState): Promise<void> {
  return USE_REDIS ? saveReviewStateRedis(state) : saveReviewStateFile(state);
}

/** Audit log is append-only by construction — there is no delete/edit function in either backend. */
export async function appendAuditLog(entry: AuditLogEntry): Promise<void> {
  if (USE_REDIS) {
    await getRedis().rpush(REDIS_KEYS.auditLog, JSON.stringify(entry));
    return;
  }
  const existing: AuditLogEntry[] = fs.existsSync(AUDIT_LOG_PATH) ? JSON.parse(fs.readFileSync(AUDIT_LOG_PATH, "utf-8")) : [];
  existing.push(entry);
  fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(existing, null, 2));
}

export async function readAuditLog(): Promise<AuditLogEntry[]> {
  if (USE_REDIS) {
    const raw = await getRedis().lrange<string>(REDIS_KEYS.auditLog, 0, -1);
    return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
  }
  if (!fs.existsSync(AUDIT_LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(AUDIT_LOG_PATH, "utf-8"));
}

/**
 * Overrides for individually re-drafted variants (the /api/redraft
 * endpoint). On Vercel the bundled draft-report.json is a read-only build
 * artifact, so a live redraft can't rewrite it — the override lives here
 * instead and report-store.ts merges it in when serving the report.
 */
export async function saveRedraftOverride(variantKey: string, draftJson: string): Promise<void> {
  if (USE_REDIS) {
    await getRedis().hset(REDIS_KEYS.redrafts, { [variantKey]: draftJson });
    return;
  }
  // Local file mode still rewrites draft-report.json directly (report-store.ts's saveDraftReport) —
  // see report-store.ts for that path. Nothing to do here in file mode.
}

export async function loadRedraftOverrides(): Promise<Record<string, string>> {
  if (!USE_REDIS) return {};
  const raw = await getRedis().hgetall<Record<string, string>>(REDIS_KEYS.redrafts);
  return raw ?? {};
}
