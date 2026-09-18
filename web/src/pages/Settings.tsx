import { useState } from "react";
import { getReviewerName, setReviewerName, getGeminiKey, setGeminiKey } from "../lib/settings";

export function Settings() {
  const [name, setName] = useState(getReviewerName());
  const [key, setKey] = useState(getGeminiKey() ?? "");
  const [saved, setSaved] = useState(false);

  function save() {
    setReviewerName(name.trim());
    setGeminiKey(key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="w-full max-w-[700px] mx-auto px-8 py-8 flex flex-col gap-6">
      <div>
        <h1 className="font-headline text-headline-lg text-primary tracking-tight">Settings</h1>
        <p className="font-ui text-caption text-on-surface-variant mt-1">
          Stored only in this browser's local storage — never sent anywhere except this app's own server, and never persisted
          server-side.
        </p>
      </div>

      <div className="bg-surface-container-lowest shadow-sm p-5 flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-ui text-ui-label-bold uppercase tracking-wider text-primary">Your reviewer name</span>
          <span className="font-ui text-caption text-on-surface-variant">
            Used to attribute your accept/edit/reject decisions and approval in the Audit Trail.
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jane Smith"
            className="mt-1 px-3 py-2 bg-surface-container-low text-primary font-ui text-ui-body-md focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </label>
      </div>

      <div className="bg-surface-container-lowest shadow-sm p-5 flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-ui text-ui-label-bold uppercase tracking-wider text-primary">Your Gemini API key (optional)</span>
          <span className="font-ui text-caption text-on-surface-variant">
            Free at{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-secondary hover:underline">
              aistudio.google.com/apikey
            </a>
            . Only needed if you use "Re-draft with AI" on a variant — the server falls back to its own key otherwise.
          </span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste your free Gemini API key"
            className="mt-1 px-3 py-2 bg-surface-container-low text-primary font-genomic text-ui-body-md focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="px-4 py-2 bg-secondary text-on-secondary font-ui text-ui-label-bold uppercase tracking-wider"
        >
          Save
        </button>
        {saved && <span className="font-ui text-caption text-approved">Saved.</span>}
      </div>
    </div>
  );
}
