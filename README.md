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
| [`server/`](server) | Node/TypeScript | ClinVar cross-reference, ACMG-inspired scorer, Gemini drafting, Express API, review workflow |
| [`web/`](web) | React + TypeScript UI | Vite, Tailwind CSS v4, design system from `stitch_clinical_variant_report_reviewer/` |

Two independent projects, each with its own `package.json` (not an npm
workspace — same Windows npm symlink issue documented in the other two
projects' PLAN.md files): `server/` and `web/`.

`PLAN.md` is the build log — every phase, decision, and real bug hit along
the way, kept for anyone picking this project back up later.

## Test data

`data/input/NA12878.strelka.variants.vcf.gz` is copied directly from
`Bio Pipeline Dashboard/sarek-reproduction/results/na12878_subset/` — real
Strelka output from an actual nf-core/sarek run against NA12878
(chr20:1-10,000,000, GRCh38, 464 variants). Not simulated, not hand-written.

## Quick start

**1. Get a free Gemini API key** at https://aistudio.google.com/apikey
(Google account, no payment info needed), then copy `.env.example` to `.env`
in the project root and paste it in as `GEMINI_API_KEY`. (You can also skip
this and paste a personal key into the running app's Settings page instead —
see "Publishing it for others to use" below.)

**2. Run the pipeline once** to produce real annotated/drafted data (only
needs to be re-run if you change the input VCF or want fresh AI drafts):
```bash
cd server && npm install
```
```bash
cd ../vep && ./download-reference.sh && ./run-vep.sh --database   # or omit --database + ./download-cache.sh first for the offline-cache option — see vep/README.md
cd ../server && npm run annotate && npm run classify && npm run draft-report
```
This writes `data/annotated/classified-variants.json` and `draft-report.json`
— the real VEP + ClinVar + Gemini output the UI reads.

**3. Run the app** — two processes:
```bash
cd server && npm run http   # → http://localhost:4400
cd web && npm install && npm run dev   # → http://localhost:5173
```
Open the frontend URL. You'll see the real 39 significant variants from the
real NA12878 sample, each with a real AI-drafted explanation you can accept,
edit, or reject — then formally approve once every claim has a decision.

*(You can also drive the whole review workflow from the terminal instead of
the UI: `cd server && npm run review -- <list|decide|status|approve|
finalize|audit>` — see `server/src/scripts/review.ts`.)*

## Publishing it for others to use

Same bring-your-own-key pattern as Genomic Evidence Copilot: each visitor
pastes their own free Gemini key into the app's **Settings** page (stored
only in their browser's `localStorage`, sent only as a header on
`/api/redraft` calls, never logged or persisted server-side). If the server
*does* have `GEMINI_API_KEY` set in `.env`, that's used as a fallback for
anyone who hasn't set their own — handy for running it just for yourself.
There's no login/accounts; review decisions and the audit trail are shared
project-wide state (this is a single-sample demo tool, not a multi-tenant
system), so treat a public deployment as a shared demo, not a private
workspace.

## Live deployment

Deployed on Vercel using [Services](https://vercel.com/docs/services)
(`vercel.json` at the repo root): the `web/` frontend and `server/` Express
API deploy together as one project, `/api/*` routed to the backend.

Vercel's serverless functions have a **read-only filesystem in
production**, so the review/approve workflow (which needs to actually
persist decisions) uses free [Upstash Redis](https://upstash.com/) via the
Vercel Marketplace instead of local JSON files there —
`server/src/lib/review-store.ts` supports both backends behind the same
interface, auto-detected by which environment variables are set. Running
locally with no Redis configured still works exactly as before (local
files, zero setup); see `PLAN.md` Phase 6 for the full story, including a
real deployment bug found and fixed (`vercel deploy` uploading local
gitignored files despite `.gitignore` — fixed with `.vercelignore`) and a
mismatch between two valid Upstash env var naming conventions.

To deploy your own copy:
```bash
cd server && npm run sync-data   # copies data/annotated/ into server/data/annotated/ (see PLAN.md Phase 6 for why)
vercel link
vercel integration add upstash/upstash-kv   # provisions free Redis, connects it automatically
vercel deploy --prod
```
No `GEMINI_API_KEY` is set on the deployed project — it runs bring-your-own-key
only (Settings page) unless you deliberately add one with `vercel env add`.

## Confirming it's free

- **VEP**: free official Docker image (`ensemblorg/ensembl-vep`), either the
  free downloadable cache or Ensembl's free public database server. No paid
  annotation service anywhere.
- **ClinVar**: free NCBI E-utilities, no key required (an optional free key
  just raises the rate limit).
- **Report drafting**: Google Gemini free-tier API key only, never a paid
  tier.
- **Frontend/backend**: React, Vite, Express, Tailwind — all open-source
  npm packages, zero cost.
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
