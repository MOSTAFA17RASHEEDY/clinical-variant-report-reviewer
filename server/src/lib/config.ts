import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(fileURLToPath(import.meta.url), "../../../..");
loadDotenv({ path: path.join(projectRoot, ".env") });

export const config = {
  projectRoot,
  ncbiApiKey: process.env.NCBI_API_KEY || undefined,
  ncbiToolName: process.env.NCBI_TOOL_NAME || "clinical-variant-report-reviewer",
  ncbiContactEmail: process.env.NCBI_CONTACT_EMAIL || "you@example.com",
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
};
