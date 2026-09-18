import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { getReviewerName } from "../lib/settings";

const NAV_ITEMS = [
  { path: "/", label: "Worklist" },
  { path: "/draft-review", label: "Draft Review" },
  { path: "/sign-off", label: "Review & Sign-Off" },
  { path: "/audit-trail", label: "Audit Trail" },
  { path: "/settings", label: "Settings" },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    "relative flex items-center h-full px-3.5 transition-colors uppercase tracking-wider font-ui text-ui-label-bold",
    isActive
      ? "bg-surface-container text-primary border-b-2 border-secondary"
      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
  ].join(" ");
}

export function Layout() {
  const [reviewerName, setReviewerNameState] = useState(getReviewerName());

  useEffect(() => {
    const onFocus = () => setReviewerNameState(getReviewerName());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <div className="min-h-screen bg-canvas font-ui text-ui-body-md text-on-surface antialiased flex flex-col">
      <header className="sticky top-0 z-50 bg-surface-container-lowest border-b border-hairline">
        <div className="h-16 w-full px-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-max">
            <img src="/favicon.svg" alt="" className="w-8 h-8" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-ui text-headline-sm text-primary tracking-tight font-semibold">
                  Clinical Variant Report Reviewer
                </span>
                <span className="px-1.5 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed-variant font-genomic text-caption rounded uppercase tracking-wide">
                  Portfolio / Demo
                </span>
              </div>
              <span className="font-ui text-caption text-on-surface-variant">
                Not a validated clinical device — nothing here should inform a real medical decision
              </span>
            </div>
          </div>
          <nav className="flex items-center h-full gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.path === "/"} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 min-w-max pl-4 border-l border-hairline">
            <div className="flex flex-col text-right">
              <span className="font-ui text-ui-label-bold text-primary">
                {reviewerName || "No reviewer name set"}
              </span>
              <span className="font-ui text-caption text-on-surface-variant">
                {reviewerName ? "Signed in as reviewer" : "Set your name in Settings"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        <Outlet />
      </main>

      <footer className="w-full bg-surface-container-lowest border-t border-hairline py-3">
        <div className="w-full px-8 flex flex-wrap items-center justify-between gap-2 text-on-surface-variant">
          <span className="font-ui text-caption">
            Real VEP annotation, real ClinVar cross-reference, real Gemini drafts — free tools only, runs entirely on your machine.
          </span>
          <span className="font-genomic text-caption text-outline">
            Clinical Variant Report Reviewer — portfolio project, not a clinical device
          </span>
        </div>
      </footer>
    </div>
  );
}
