import type { AcmgTier } from "../api/types";

const STYLES: Record<AcmgTier, string> = {
  Pathogenic: "bg-acmg-pathogenic text-white",
  "Likely Pathogenic": "bg-acmg-likely-pathogenic text-white",
  VUS: "bg-acmg-vus text-white",
  "Likely Benign": "border border-acmg-likely-benign text-acmg-likely-benign-text bg-transparent",
  Benign: "border border-acmg-benign text-acmg-benign bg-transparent",
};

export function AcmgChip({ tier }: { tier: AcmgTier }) {
  return (
    <span
      className={`inline-block px-2.5 py-1 font-ui text-ui-label-bold uppercase tracking-wider whitespace-nowrap ${STYLES[tier]}`}
    >
      {tier}
    </span>
  );
}
