import { config } from "./config.js";

// "-latest" alias tracks Google's current recommended model instead of a
// dated snapshot, so this doesn't go stale as the model lineup moves — same
// approach Genomic Evidence Copilot uses. Using the *lite* variant
// specifically: Copilot's PLAN.md documents "gemini-flash-latest" resolving
// to a brand-new preview capped at 20 requests/day on the free tier, too
// tight for drafting ~39 variant explanations in one run. Verified live
// against this project's own key: "gemini-flash-lite-latest" resolves to
// gemini-3.5-flash-lite and returns valid structured JSON.
// Override via GEMINI_MODEL if this ever needs pinning to a specific model.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export class GeminiError extends Error {}

/**
 * Raw fetch against the Gemini REST API rather than an SDK — Genomic
 * Evidence Copilot found the `@google/generative-ai` SDK added a very slow
 * (~95s) cold-start call that plain fetch didn't have, and this project has
 * no other need for an SDK's extra surface (no chat history, no tool use).
 */
export class GeminiRateLimitError extends GeminiError {}

/**
 * apiKeyOverride supports the web UI's "bring your own key" pattern (same
 * as Genomic Evidence Copilot): a visitor's own free key, sent per-request
 * from their browser, takes priority over the shared .env key so running
 * this as a published demo never bills one shared key on everyone's behalf.
 */
export async function generateJson<T>(prompt: string, apiKeyOverride?: string): Promise<T> {
  const apiKey = apiKeyOverride || config.geminiApiKey;
  if (!apiKey) {
    throw new GeminiError(
      "No Gemini API key available. Get a free key at https://aistudio.google.com/apikey and add it in Settings (or .env for the server).",
    );
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    });

    if (res.status === 429) {
      if (attempt === 2) {
        throw new GeminiRateLimitError(
          "Gemini free-tier rate/quota limit hit repeatedly — see Genomic Evidence Copilot's PLAN.md for a prior instance of this (a preview flash model capped at 20 requests/day). Try again later or switch GEMINI_MODEL.",
        );
      }
      await new Promise((r) => setTimeout(r, 5000 * 2 ** attempt));
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new GeminiError(`Gemini API request failed: ${res.status} ${res.statusText} — ${body}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new GeminiError(`Gemini response had no text content: ${JSON.stringify(data)}`);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new GeminiError(`Gemini did not return valid JSON: ${text}`);
    }
  }
  throw new GeminiError("unreachable");
}
