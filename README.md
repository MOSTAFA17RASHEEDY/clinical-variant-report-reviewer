# Clinical Variant Report Reviewer

A portfolio project: takes a real VCF, annotates each variant with VEP,
cross-checks known classifications against ClinVar, scores unclassified
variants with a simplified ACMG-inspired system, and has an AI agent draft a
plain-language report — but the report can never be exported or marked final
without an explicit human "Reviewed & Approved" action. The AI's draft is
always clearly labeled as a draft, never presented as a finished clinical
result.

**This is a portfolio/demo tool, not a validated clinical device.** Nothing
here should inform an actual medical decision — see "What this is not"
below.

This is a separate project from Bio Pipeline Dashboard and Genomic Evidence
Copilot, though it reuses one of Bio Pipeline Dashboard's real pipeline runs
as test input (see "Test data" below) and follows the same free-tools,
real-data discipline as Genomic Evidence Copilot.

## Architecture

```
data/input/*.vcf.gz  →  VEP (Docker)  →  data/annotated/*.vep.json
                                              │
                                              ▼
                              ClinVar cross-reference (NCBI E-utilities)
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                                ▼
                    already classified                  unclassified
                    (cite ClinVar directly)      simplified ACMG-inspired scorer
                              │                                │
                              └───────────────┬────────────────┘
                                               ▼
                                 Gemini drafts plain-language report
                                        (cites every claim)
                                               │
                                               ▼
                                  "Pending Review" — human reviewer
                                  accepts/edits/rejects each claim,
                                  then explicitly "Reviewed & Approved"
```

| Layer | What it is | Details |
|---|---|---|
| `vep/` | Docker scripts | Runs the official `ensemblorg/ensembl-vep` image against `data/input/` |
| [`server/`](server) | Node/TypeScript | ClinVar cross-reference, ACMG-inspired scorer, Gemini report drafting |
| `web/` | React + TypeScript UI (Phase 5) | Design system from `stitch_clinical_variant_report_reviewer/` |

`PLAN.md` is the build log — every phase, decision, and real bug hit along
the way, kept for anyone picking this project back up later.

## Test data

`data/input/NA12878.strelka.variants.vcf.gz` is copied directly from
`Bio Pipeline Dashboard/sarek-reproduction/results/na12878_subset/` — real
Strelka output from an actual nf-core/sarek run against NA12878
(chr20:1-10,000,000, GRCh38, 464 variants). Not simulated, not hand-written.

## Quick start

*(Phase 1 in progress — this section will be filled in as each phase lands;
see `PLAN.md` for current status.)*

1. **VEP annotation**: see `vep/README.md` — pick offline cache
   (~25.7GB one-time download, then fast/offline forever) or `--database`
   mode (no download, slower, live). Then:
   ```bash
   cd vep && ./download-reference.sh && ./run-vep.sh   # (+ ./download-cache.sh first, for offline mode)
   ```
2. **ClinVar cross-reference**:
   ```bash
   cd server && npm install && npm run annotate
   ```

## Confirming it's free

- **VEP**: free official Docker image (`ensemblorg/ensembl-vep`), either the
  free downloadable cache or Ensembl's free public database server. No paid
  annotation service anywhere.
- **ClinVar**: free NCBI E-utilities, no key required (an optional free key
  just raises the rate limit).
- **Report drafting**: Google Gemini free-tier API key only, never a paid
  tier.
- **No cloud hosting, no paid infrastructure** — everything runs on the
  user's own laptop.

## What this is not

- Not a CAP/CLIA-accredited or FDA-cleared diagnostic tool.
- Not a replacement for a board-certified clinical geneticist or molecular
  pathologist's judgment.
- The Phase 2 ACMG-inspired scorer is explicitly **simplified** — it is
  labeled as such everywhere it appears in the code and UI, and does not
  implement the full real ACMG/AMP evidence framework.
- No report this tool produces can be exported, finalized, or treated as a
  clinical result without an explicit human "Reviewed & Approved" action —
  this is enforced in the workflow, not just a suggestion in the copy.
