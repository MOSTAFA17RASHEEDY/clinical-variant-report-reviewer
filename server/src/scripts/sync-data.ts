// Copies the pipeline's real output (data/annotated/ at the repo root) into
// server/data/annotated/ — a deployment-time copy so the server package is
// self-contained (see report-store.ts for why: Vercel's file tracer for the
// "server" service only reaches files inside that service's own root).
// Run this after re-running the Phase 1-3 pipeline and before deploying.
import fs from "node:fs";
import path from "node:path";
import { config } from "../lib/config.js";
import { fileURLToPath } from "node:url";

const SOURCE_DIR = path.join(config.projectRoot, "data/annotated");
const DEST_DIR = path.resolve(fileURLToPath(import.meta.url), "../../../data/annotated");
const FILES = ["draft-report.json", "classified-variants.json"];

fs.mkdirSync(DEST_DIR, { recursive: true });
for (const file of FILES) {
  const src = path.join(SOURCE_DIR, file);
  if (!fs.existsSync(src)) {
    console.error(`Missing ${src} — run the Phase 1-3 pipeline first.`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(DEST_DIR, file));
  console.log(`Synced ${file}`);
}
