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

- [x] `server/src/lib/acmg-scorer.ts` — the simplified scorer, labeled
      "SIMPLIFIED — NOT A CLINICAL-GRADE CLASSIFIER" directly in its module
      doc comment (carried through to the UI in Phase 5). Implements a small,
      honest subset of the real ACMG/AMP evidence codes (which has ~28 in
      total): predicted loss-of-function (PVS1-like), rarity/absence from
      population data (PM2-like), SIFT+PolyPhen agreement (PP3-like /
      BP4-like), and population allele frequency (BA1-like / BS1-like).
      Evidence is combined via a simplified weighted-sum threshold — not the
      real ACMG combining rules (specific criteria combinations, not a plain
      sum) — documented as a deliberate simplification in the code.
      Confidence level reflects how much evidence exists at all (not how
      "sure" the tier is): a VUS from zero evidence and a VUS from
      conflicting evidence are both real, different outcomes.
- [x] Before running against real data, added `--sift b --polyphen b --af`
      to the VEP run and **tested each flag's actual behavior in
      `--database` mode against the real 464-variant VCF** rather than
      assuming they'd all work the same as in offline-cache mode:
      - `--af_gnomade`/`--af_gnomadg` (gnomAD): VEP refuses outright with
        `--database` — gnomAD is cache-only, confirmed by the error message
        itself, not by reading docs.
      - `--sift`/`--polyphen`: **do work live** — real run returned
        predictions for all missense variants (6 SIFT, 4 PolyPhen calls
        across 464 variants; most of this test region is intronic, so few
        variants even qualify for a missense prediction).
      - `--af` (1000 Genomes): **returned empty for all 464 real variants**,
        including ones with well-established rsIDs — a genuine, confirmed
        gap in `--database` mode, not a bug in this project's code. The
        scorer treats missing population frequency as "unknown" (no
        evidence generated either way), never as "must be rare" — a data
        gap must not silently inflate a pathogenicity score.
- [x] `server/src/lib/classify-pipeline.ts` — routes each variant to either
      its real ClinVar classification (only when there's an exact-match
      record that actually carries a clinical significance string — being
      merely *registered* in ClinVar with no interpretation, like Phase 1's
      SNAP25-AS1 finding, correctly still routes to the scorer) or the
      simplified scorer. Tested against 3 fixtures (confirmed ClinVar hit,
      ClinVar record with no classification, no ClinVar data) before running
      on real data — all routed correctly.
- [x] `server/src/scripts/classify.ts` (`npm run classify` in `server/`) —
      reads Phase 1's `variants.json`, classifies all 464, writes
      `data/annotated/classified-variants.json`.
- [x] **Ran on the real 464-variant dataset.** Honest result: all 464 landed
      as **VUS** (0 Pathogenic/Likely Pathogenic/Likely Benign/Benign). This
      is a direct, understandable consequence of two real, already-documented
      facts rather than a bug: (1) this test region has 0 confirmed ClinVar
      classifications (Phase 1 finding — not a disease-gene-dense area), and
      (2) `--database` mode can't supply population frequency (this phase's
      finding), which removes the BA1/BS1 evidence this scorer needs to
      confidently call "Likely Benign"/"Benign" for the mostly-intronic
      variants here. 463/464 got one weak benign-leaning signal
      (non-coding consequence); by design, a single supporting-level signal
      alone isn't enough to move off VUS — mirroring the real ACMG
      framework's own requirement that Likely Benign/Pathogenic needs
      *multiple* combined criteria, not just one. This is a real stress
      test of the scorer's honesty under a genuinely uninformative region,
      not a curated "nice-looking" result.

## Phase 3 — AI report-drafting agent

- **Decision, for later**: user will paste their Gemini key for now, but
  Phase 5's UI must add a Settings tab where users add their own free key
  from the browser (same "bring your own key" pattern as Genomic Evidence
  Copilot) instead of relying on a shared `.env` key.
- [x] `server/src/lib/gemini.ts` — raw `fetch` against the Gemini REST API
      (no SDK — Genomic Evidence Copilot found the `@google/generative-ai`
      SDK added a ~95s cold-start call plain fetch didn't have, and this
      project has no other need for an SDK's extra surface). Retries on 429
      with backoff.
- [x] **Verified the actual key live before picking a model**, rather than
      assuming: listed all available models, and specifically avoided
      `gemini-flash-latest` because Genomic Evidence Copilot's PLAN.md
      documents it resolving to a brand-new preview capped at 20
      requests/day — too tight for drafting ~39 variants in one run. Used
      `gemini-flash-lite-latest` instead (verified live: resolves to
      `gemini-3.5-flash-lite`, returns valid structured JSON).
- [x] `server/src/lib/report-drafter.ts` — the citation design: citations
      are built entirely from Phase 1/2's own real data (`buildCitations`),
      never invented by the model. Gemini's only job is to explain evidence
      that already exists and is already trustworthy, with inline `[n]`
      markers matching the provided numbered list. The prompt explicitly
      forbids outside knowledge about the gene/condition, forbids stating a
      diagnosis or clinical recommendation, and requires saying evidence is
      thin rather than filling gaps with assumptions.
- [x] Citation compliance is verified, not just requested: after each draft,
      the code extracts every `[n]` used and checks it against the real
      citation list, flagging `citationCoverageWarning` if a claim is
      uncited or cites a number that doesn't exist — surfaced in the output
      for Phase 4's human reviewer, never silently trusted.
- [x] Tested `buildCitations` against 3 fixtures (ClinVar-sourced,
      simplified-scorer with evidence, simplified-scorer with none) before
      running any real Gemini calls.
- [x] Not every variant gets an individually-drafted paragraph — defined
      "significant" as: a real ClinVar classification (always worth
      reporting), OR scorer confidence above "low", OR HIGH/MODERATE
      predicted impact. On the real 464-variant dataset this is 39
      variants; the other 425 (mostly intronic) are counted and
      summarized by consequence type, not hidden, but not drafted
      individually either — a real report wouldn't discuss every intronic
      SNP by name.
- [x] **Ran on all 39 real significant variants.** 39/39 drafted
      successfully, 0 failures. Found and fixed one real bug from testing
      against actual output: the model sometimes combines adjacent
      citations into one bracket (`[1, 2]`) instead of `[1] [2]` separately
      — the citation-coverage check's regex only matched single-number
      brackets, so a fully-compliant draft was wrongly flagged as missing
      citations. Fixed by parsing comma-separated numbers inside a bracket
      too, then re-ran: 0 citation warnings.
- [x] Every draft carries `status: "ai_drafted_pending_review"` and the
      output file's top-level `disclaimer` field states plainly it's a
      non-clinical-grade AI draft — Phase 4 builds the actual approval
      workflow this status feeds into.
- [x] `server/src/scripts/draft-report.ts` (`npm run draft-report`) writes
      `data/annotated/draft-report.json`: 39 drafts + citations, the 425
      non-significant variants summarized by consequence, 0 failures.

## Phase 4 — Human-in-the-loop safeguards

- [x] `server/src/lib/review-workflow.ts` — the actual enforcement point for
      the project's core safety rule. Key design decisions:
      - **Fails closed by default**: an undecided claim blocks approval —
        "we didn't get to it" is never treated as "reviewed and fine."
      - **Approval requires an exact typed attestation string**
        (`REQUIRED_ATTESTATION_TEXT`, the same text Phase 5's UI will show
        as a checkbox/confirmation), not a boolean flag — makes the action
        deliberate rather than a casual toggle, and the exact wording
        itself states plainly this is a portfolio/demo tool, tying the
        required disclaimer directly into the approval gate instead of
        just a passive footer.
      - **`buildFinalReport` is the only code path that assembles a
        "final" report shape, and it throws if `state.approval` isn't
        set** — there's no other way in this codebase to produce a
        finalized report, so Phase 5's UI can't accidentally bypass the
        gate by reassembling the pieces itself.
      - Edited claims keep the AI's `originalSummary` alongside the
        reviewer's `editedSummary` — never silently overwritten, so the
        audit trail can always show what changed.
      - Rejected claims are excluded from the final report body but stay
        fully visible in `excludedByReviewer` and the audit log — "removed
        from the report" is not the same as "hidden from the record."
      - `PORTFOLIO_DISCLAIMER` is carried into the final report output
        itself, not just the draft — approval never removes the
        not-a-clinical-device disclaimer.
- [x] **Tested the safety gate by actually trying to break it**, not just
      the happy path (`test-review-workflow.ts`, 11 assertions, all
      passing): can't finalize before any review, can't approve with
      claims still undecided, can't approve with a wrong/casual
      attestation string, still can't finalize after a failed approval
      attempt, and — once genuinely approved — the final report correctly
      uses edited text over original AI text and excludes rejected claims.
- [x] `server/src/lib/review-store.ts` — persists review state
      (`data/annotated/review-state.json`) and an append-only audit log
      (`data/annotated/audit-log.json`, no delete/edit function exists for
      it). Review state is tied to the report's `generatedAt` timestamp —
      loading it against a since-regenerated report (different AI text)
      refuses outright rather than silently reusing stale decisions.
- [x] `server/src/scripts/review.ts` (`npm run review -- <list|decide|
      status|approve|finalize|audit>`) — CLI workflow standing in for
      Phase 5's UI for now.
- [x] **Ran a full real test cycle against the real 39 drafted claims** to
      prove the gates hold outside of fixtures too: listed all 39 as
      PENDING, confirmed `status` correctly blocked approval, decided all
      39 (35 accepted, 2 edited with real reviewer corrections, 2 rejected
      with reasons), confirmed `finalize` still refused before approval and
      `approve` still refused a casual attestation string, then approved
      for real and finalized — 37 variants in the final report, 2 correctly
      excluded, full timestamped audit trail. **This test run used a
      placeholder reviewer name and decisions I made myself to prove the
      workflow end-to-end — not a genuine review by the user** — so the
      test's `review-state.json`/`audit-log.json`/`final-report.json` were
      deleted afterward rather than committed, to avoid the repo shipping a
      fake "approved" report that could be mistaken for a real one.
      `data/annotated/review-state.json`, `audit-log.json`, and
      `final-report.json` are gitignored going forward — they're live,
      per-user runtime state, not fixed pipeline output.

## Phase 5 — Real UI + polish

- [x] **Read all 6 stitch screens closely** (not just skimmed) before writing
      any frontend code: worklist, draft report, variant evidence detail,
      sign-off, audit trail, and the logo mark. Found the same pattern
      Genomic Evidence Copilot already documented needing adaptation for:
      heavy fictional "clinical production" flourishes (fake CLIA/CAP
      accreditation numbers, fake patients with names/MRNs/DOBs,
      cryptographic Merkle roots, HL7/FHIR EHR dispatch, YubiKey FIDO2
      hardware tokens, 21 CFR Part 11 / ISO 15189 compliance badges).
      **Kept exactly**: the color palette, typography scale (Literata/IBM
      Plex Sans/JetBrains Mono), the 5-tier ACMG chip styling, the paper-
      sheet document layout, the Pending Review watermark technique, the
      claim-by-claim accept/edit/reject card pattern, the audit ledger
      table layout. **Replaced** the fictional content with what's
      actually true: the real NA12878 reference sample (a real, public,
      de-identified sample — not a fabricated patient) instead of a fake
      patient case, a real user-entered reviewer name instead of a
      hardcoded "Dr. Eleanor Vance, FACMG", the real Gemini model name
      instead of fake "VariantAI Engine v2.4", a real append-only JSON
      audit log instead of cryptographic-seal theater, and a persistent
      "portfolio/demo, not a validated clinical device" disclaimer in the
      header instead of fake accreditation numbers.
- [x] One structural adaptation beyond copy: the mockup's "worklist" shows
      28 fictional patient cases across different diseases. This project
      has exactly one real sample, so the worklist instead lists the real
      39 significant variants requiring review — a more honest fit than
      inventing fake cases to match the mockup's shape.
- [x] `server/src/http/server.ts` — Express API wrapping the existing
      Phase 1-4 library code directly (no new business logic, no
      database — same file-backed state as the CLI scripts).
      Endpoints: `/api/case`, `/api/report`, `/api/variants`,
      `/api/review` (+`/decide`, `/approve`), `/api/final-report`, and
      `/api/redraft/:variantKey` (regenerates one variant's AI draft live,
      accepts a bring-your-own Gemini key via `X-Gemini-Api-Key` header,
      clears any existing decision on that variant since the text just
      changed under it). Refactored `gemini.ts`/`report-drafter.ts` to
      accept an optional per-call API key override for this.
      Factored `report-store.ts` out of the CLI's `review.ts` so both the
      CLI and the HTTP server load/save `draft-report.json` the same way.
- [x] `web/` — Vite + React + TypeScript + Tailwind CSS v4 (same stack as
      Genomic Evidence Copilot). Design tokens
      (`web/src/index.css`) copied exactly from `DESIGN.md`'s color/type
      scale using Tailwind v4's `@theme` block. Pages: Worklist, Draft
      Review (document-style report preview), Variant Detail (AI draft +
      real citations + live "Re-draft with AI" + accept/edit/reject),
      Review & Sign-Off (all 39 claims + the exact required attestation
      text + approval), Audit Trail, Settings (reviewer name + optional
      personal Gemini key, both localStorage-only per the earlier
      "Settings tab" decision).
- [x] **Real browser verification, not just a successful build** — no
      screenshot/browser tool was available directly, so installed
      Playwright + Chromium into the session's scratch directory and
      drove the actual running app (Vite dev server + Express API):
      - Screenshotted all 6 routes with real data loaded: 0 console
        errors, 0 page errors on any route.
      - **Found and diagnosed a real Tailwind v4 behavior change** while
        checking the watermark: v4 renders `rotate-45` via the standalone
        CSS `rotate` property, not the legacy `transform` property —
        `getComputedStyle(el).transform` reads `'none'` even though the
        rotation is genuinely applied (`getComputedStyle(el).rotate` shows
        `'-45deg'`). A real, worth-recording gotcha for anyone checking
        Tailwind v4 transforms programmatically.
      - Drove a full real interaction end-to-end through the browser (not
        an API test): set a reviewer name in Settings, clicked Accept on
        a real variant, confirmed the Audit Trail immediately reflected
        the real decision with the real reviewer name.
      - Tested the new **live "Re-draft with AI" button for real**: clicked
        it, watched it call Gemini through the running server, and
        confirmed the drafted text on screen genuinely changed to a new
        AI-generated explanation — not a mocked interaction.
      - Improved the Audit Trail's detail rendering after seeing it
        live: raw JSON dumps (including the full original AI paragraph
        inline) were unreadable in the table; replaced with a per-action
        human-readable summary that still surfaces every real field (full
        edited text, reviewer notes), nothing hidden, just formatted.
      - **Reset all test artifacts afterward** — the QA interaction above
        used a placeholder name ("Playwright QA Tester") and produced a
        real Gemini redraft, neither of which should ship as if it were
        genuine project data: reverted `draft-report.json` to its
        Phase 3 committed state via `git checkout`, deleted the test
        `review-state.json`/`audit-log.json` (already gitignored per
        Phase 4's decision).
