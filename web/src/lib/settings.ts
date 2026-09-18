// Per-viewer settings live only in this browser's localStorage — never sent
// anywhere except this app's own API (the Gemini key travels only as the
// X-Gemini-Api-Key header on /api/redraft calls, never logged, never stored
// server-side). Same "bring your own key" pattern as Genomic Evidence
// Copilot: no shared key anyone else has to pay for.
const REVIEWER_NAME_KEY = "cvrr.reviewerName";
const GEMINI_KEY_KEY = "cvrr.geminiApiKey";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing / blocked storage — setting just won't persist.
  }
}

export const getReviewerName = () => safeGet(REVIEWER_NAME_KEY) ?? "";
export const setReviewerName = (name: string) => safeSet(REVIEWER_NAME_KEY, name);

export const getGeminiKey = () => safeGet(GEMINI_KEY_KEY);
export const setGeminiKey = (key: string) => safeSet(GEMINI_KEY_KEY, key);
