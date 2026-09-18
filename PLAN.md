# Clinical Variant Report Reviewer — Build Plan

A separate, standalone project (not part of Bio Pipeline Dashboard or Genomic
Evidence Copilot): takes a real VCF, annotates each variant with VEP,
cross-checks known classifications against ClinVar, scores unclassified
variants with a simplified ACMG-inspired system, and has an AI agent draft a
plain-language report — but the report stays in "Pending Review" and cannot
be finalized without an explicit human "Reviewed & Approved" action. This
file tracks phases so work can resume in a new session without re-deriving
context.

## Decisions locked in

- **Everything free, no exceptions**: VEP via its free official Docker image
  (`ensemblorg/ensembl-vep`), ClinVar via free NCBI E-utilities, report
  drafting via Google Gemini's free tier only. No cloud hosting — everything
  runs on the user's laptop. If anything would require payment, stop and say
  so instead of substituting a paid service.
- **Test data is real, not generated**: `data/input/NA12878.strelka.variants.vcf.gz`
  is copied straight from `Bio Pipeline Dashboard/sarek-reproduction/results/
  na12878_subset/` — real Strelka output from an actual nf-core/sarek run,
  chr20:1-10,000,000 (GRCh38), 464 variants. Not simulated.
- **UI design**: already generated via Stitch, saved in
  `stitch_clinical_variant_report_reviewer/`. `clinical_diagnostic_document_engine/
  DESIGN.md` is the design system source of truth ("archival clinical
  dossier" theme — Literata / IBM Plex Sans / JetBrains Mono, zero
  border-radius, hairline rules, no shadows, muted 5-tier ACMG palette). 6
  reference screens: worklist, draft report (pending review, with diagonal
  watermark), formal sign-off modal, variant evidence detail (BRCA1
  c.5266dupC — a real, well-known pathogenic variant), compliance audit
  trail, and a small institutional logo mark. These screens map directly
  onto Phases 3-4's review workflow.
- **No npm workspaces**: same reasoning as the other two projects (Windows
  npm symlink bug) — `server/` (and later `web/`) are independent npm
  projects with their own `package.json`.
- **Node/TypeScript stack for `server/`**: ESM, `tsx` for direct execution,
  matching Genomic Evidence Copilot's pattern.

## Phase 0 — Design & data review

- [x] Found the real test VCF: `Bio Pipeline Dashboard/sarek-reproduction/
      results/na12878_subset/NA12878.strelka.variants.vcf.gz` — confirmed
      it's real (chr20, GRCh38, 464 variants, no fabricated rows) and copied
      it into `data/input/` so this project is self-contained.
- [x] Found the design folder: `stitch_clinical_variant_report_reviewer/`
      (user had named it slightly differently than discussed — confirmed the
      exact name by listing the directory rather than guessing). Read
      `clinical_diagnostic_document_engine/DESIGN.md` in full and skimmed all
      6 screen `code.html` files to understand the ACMG chip styling, the
      Pending Review watermark/seal treatment, and the sign-off modal's
      legal-affirmation checkbox pattern before writing any backend data
      model that needs to feed these screens.
- [x] Read Genomic Evidence Copilot's README/PLAN for documentation
      style/tone and its NCBI E-utilities approach to reuse the same
      discipline (rate limiting, citation-worthy structured records).

## Phase 1 — VEP annotation + ClinVar cross-reference

- [x] **Resource check before touching Docker** (as required): confirmed
      Docker is installed but the engine wasn't running; confirmed 252GB
      free on the project's drive. Asked the user how to handle VEP's cache
      before downloading anything — they chose to defer that decision, so
      Phase 1 built and tested everything that doesn't require it yet, with
      the VEP run itself ready to go the moment it's picked.
- [x] **Verified real numbers directly against Ensembl's FTP** rather than
      trusting older estimates from search results: the GRCh38 indexed VEP
      cache (release 116) is **~25.7GB download**, needs **~55-60GB disk**
      during extraction (tarball + extracted copy, settles to ~30GB after
      deleting the tarball). Time depends entirely on connection speed.
      Documented both this offline-cache option and the no-download
      `--database` (live Ensembl DB) alternative in `vep/README.md`, along
      with a real caveat found while researching: Ensembl is mid-migration
      to a new GraphQL-based platform as of mid-2026, making `--database`
      mode the less actively-maintained path right now.
- [x] `server/` scaffolded (TypeScript, ESM, `tsx`), `.env.example` with
      `NCBI_API_KEY`/`NCBI_TOOL_NAME`/`NCBI_CONTACT_EMAIL` (optional) and
      `GEMINI_API_KEY` (required later, Phase 3).
- [x] `server/src/lib/ncbi.ts` — ClinVar cross-reference module. Built and
      **fixed two real bugs found by testing against live ClinVar data**,
      not just compiling:
      1. **rsID lookup**: a free-text esearch for `"rs334"` returned
         unrelated multi-variant haplotype records (ClinVar has no dedicated
         rsID search field, and free text over-matches). Fixed by using
         `elink` from dbSNP to ClinVar instead — returns exactly the records
         dbSNP itself cross-references, filtered to drop compound
         Haplotype/Genotype records that describe a combination of variants
         rather than the single one being checked.
      2. **HGVS-based lookup for variants with no rsID**: found ClinVar's
         query parser silently rewrites the period in HGVS notation into a
         literal `"0x2e"` token before matching (visible in esearch's own
         `querytranslation` field) — so `"c.5266dupC"` becomes
         `"c0x2e5266dupC"` and matches ~20 unrelated records *confidently*,
         not just zero. Confirmed with the real BRCA1 c.5266dupC founder
         variant (the same one in the stitch mockup's variant-detail
         screen) — the broken query returned completely wrong ClinVar
         entries labeled as an "exact match". This is worse than Genomic
         Evidence Copilot's earlier finding of the same underlying quirk
         (which just returned nothing) and unsafe for a tool whose entire
         point is not overstating confidence. Fixed by never trusting the
         server-side text match: query ClinVar's indexed `CHR`/`CPOS` fields
         (exact chromosome + base position, no tokenizer involved) for
         candidates at that exact position, then confirm the specific
         allele client-side by comparing VEP's HGVSc against each
         candidate's own title (normalized for the HGVS 2016+
         dup/del-trailing-base formatting difference between VEP and
         ClinVar).
      3. Also found and fixed: NCBI's ClinVar esummary schema nests
         classification under `germline_classification` now (not the older
         flat `clinical_significance` field some documentation/examples
         still show) — `clinical_significance` came back `None` until this
         was corrected.
      Verified both fixes against real, known variants: rs334/HBB (the
      sickle-cell variant) correctly returns the real "Pathogenic"
      VCV000015333 record, and BRCA1 c.5266dupC correctly returns the real
      3-star expert-panel-reviewed VCV000017677 "Pathogenic" record.
- [x] `server/src/lib/vep-types.ts` + `server/src/lib/annotate-pipeline.ts`
      — typed VEP `--json` output shape (confirmed VEP's JSON output is
      JSON Lines — one object per line, not a wrapped array — by checking
      Ensembl's own docs rather than assuming) and the orchestration logic:
      pick the canonical transcript consequence, try ClinVar-by-rsID first,
      fall back to ClinVar-by-coordinate when there's no rsID, mark
      variants with neither as candidates for Phase 2's scorer.
- [x] Validated the pipeline logic against a fixture shaped like real VEP
      output for a real, known variant (rs334/HBB) — clearly labeled in
      code as a fixture, not a real VEP run — before spending the time/disk
      on an actual Docker run: `npm run test:annotate` in `server/`.
- [x] `vep/` — Docker scripts ready to run once the cache-vs-database
      decision is made: `download-reference.sh` (small, ~18MB chr20 FASTA,
      needed either way for `--hgvs`), `download-cache.sh` (the ~25.7GB
      offline cache), `run-vep.sh` (runs the container against
      `data/input/`, `--database` flag switches to live mode).
      `server/src/scripts/annotate.ts` is the next step once
      `data/annotated/NA12878.vep.json` exists — reads it, cross-references
      ClinVar for all 464 variants, writes `data/annotated/variants.json`.
- [x] **User chose `--database` mode** (no big download — both options were
      always free, this was purely about avoiding the 25.7GB download).
      Pulled `ensemblorg/ensembl-vep:release_116.0` (~1-2GB, unavoidable
      either way — it's the tool itself, not a cache). Hit and fixed two
      real environment bugs along the way:
      1. Git Bash (MSYS) auto-rewrites Unix-looking arguments as Windows
         host paths, which mangled the container-internal `/opt/vep/...`
         mount paths into `C:/Program Files/Git/opt/vep/...`. Fixed with
         `MSYS_NO_PATHCONV=1` before the `docker run` call.
      2. The image has no standalone `samtools` binary (confirmed by
         checking inside the container rather than assuming) — it uses the
         Perl `Bio::DB::HTS::Faidx` bindings internally instead. Removed the
         manual `samtools faidx` indexing step; VEP auto-indexes a `--fasta`
         file on first use.
      Also added `--canonical` after noticing the first run's transcript
      list had no way to tell which transcript was the canonical one —
      re-ran (still `--database` mode, ~6 minutes for 464 variants, no
      download).
- [x] **Ran the full pipeline on the real VCF end to end.** Real, honest
      result: of 464 real variants, **0 have a confirmed clinical
      classification in ClinVar**. One variant (chr20:10026704, SNAP25-AS1)
      is *present* in ClinVar as a registered record, but it carries no
      clinical significance at all and its transcript-relative HGVS numbering
      didn't line up exactly with VEP's — correctly flagged
      `exactMatch: false` rather than claimed as a match. This is expected,
      not a bug: the test region (chr20:1-10Mb) isn't a disease-gene-dense
      area, so most variants here are unremarkable population SNPs ClinVar
      has no reason to have assessed. This means **all 464 variants are
      candidates for Phase 2's scorer** — a good, honest stress test of that
      phase before it's even built.
- [x] Phase 1 complete: `data/annotated/NA12878.vep.json` (raw VEP output)
      and `data/annotated/variants.json` (VEP + ClinVar cross-reference,
      464 records) both exist from a real run on real data.

## Phase 2 — Simplified ACMG-inspired scoring

Not started.

## Phase 3 — AI report-drafting agent

Not started.

## Phase 4 — Human-in-the-loop safeguards

Not started.

## Phase 5 — Real UI + polish

Not started.
