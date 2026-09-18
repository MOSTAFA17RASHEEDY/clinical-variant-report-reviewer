import { useState } from "react";
import { api } from "../api/client";
import type { ClaimDecision, VariantDraft } from "../api/types";

export function DecisionPanel({
  variantKey,
  draft,
  decision,
  reviewer,
  onDecided,
}: {
  variantKey: string;
  draft: VariantDraft;
  decision: ClaimDecision | null;
  reviewer: string;
  onDecided: () => void;
}) {
  const [editText, setEditText] = useState(decision?.editedSummary ?? draft.summary);
  const [note, setNote] = useState(decision?.reviewerNote ?? "");
  const [mode, setMode] = useState<"idle" | "editing">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(kind: "accepted" | "edited" | "rejected") {
    if (!reviewer.trim()) {
      setError("Set your reviewer name in Settings before deciding on a claim.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.decide(variantKey, kind, reviewer, {
        editedSummary: kind === "edited" ? editText : undefined,
        note: note.trim() || undefined,
      });
      setMode("idle");
      onDecided();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-headline text-headline-sm text-primary">Your Decision</h3>
        {decision && (
          <span className="font-ui text-caption text-on-surface-variant">
            {decision.decision} by {decision.reviewer}
          </span>
        )}
      </div>

      {error && <div className="p-2 bg-error-container text-on-error-container text-caption font-ui">{error}</div>}

      {mode === "editing" ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={5}
            className="w-full bg-surface-container-low text-on-surface font-ui text-ui-body-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-secondary"
          />
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => submit("edited")}
              className="px-3 py-1.5 bg-secondary text-on-secondary font-ui text-ui-label-bold uppercase disabled:opacity-50"
            >
              Save Edit
            </button>
            <button onClick={() => setMode("idle")} className="px-3 py-1.5 bg-surface-container text-on-surface-variant font-ui text-ui-label-bold uppercase">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => submit("accepted")}
            className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-primary font-ui text-ui-label-bold uppercase flex items-center gap-1 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">check</span> Accept
          </button>
          <button
            disabled={busy}
            onClick={() => setMode("editing")}
            className="px-3 py-1.5 bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-ui text-ui-label-bold uppercase disabled:opacity-50"
          >
            Edit
          </button>
          <button
            disabled={busy}
            onClick={() => submit("rejected")}
            className="px-3 py-1.5 bg-surface-container-low text-error hover:bg-error-container font-ui text-ui-label-bold uppercase disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      <label className="flex flex-col gap-1 mt-2">
        <span className="font-ui text-caption uppercase tracking-wider text-on-surface-variant">Reviewer note (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Why did you accept/edit/reject this?"
          className="w-full bg-surface-container-low text-on-surface font-ui text-ui-body-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </label>
    </div>
  );
}
