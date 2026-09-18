# Running VEP (Phase 1)

VEP (Variant Effect Predictor) runs via Ensembl's free official Docker image
(`ensemblorg/ensembl-vep`) — no paid annotation service, ever.

## Reference FASTA (small, needed either way)

`--hgvs` (turning coordinates into readable `c.` / `p.` notation) requires a
genome FASTA regardless of which cache option below you pick. Our test VCF
only covers chr20, so we only need chr20's FASTA — **~18 MB**, safe to fetch
any time:

```bash
./download-reference.sh
```

## Choose one: full offline cache, or live database mode

### Option A — Full offline cache (what the project defaults to)

**Verified real numbers (checked directly against the Ensembl FTP file, not
estimated):**
- Download: **~25.7 GB** (`homo_sapiens_vep_116_GRCh38.tar.gz`, release 116)
- Disk needed during setup: **~55-60 GB** (tarball + extracted copy;
  the tarball can be deleted after extracting, dropping to ~30 GB)
- Time: depends entirely on your internet speed — at 20 Mbps this is
  ~3 hours; at 100+ Mbps, ~35 minutes. One-time cost.
- After setup: fully offline, fast (seconds per run), works forever without
  re-downloading — every future VCF you throw at this project reuses it.

```bash
./download-cache.sh      # ~25.7GB, one-time
./run-vep.sh              # annotates data/input/*.vcf.gz, offline, fast
```

### Option B — Live `--database` mode (no big download)

No cache download at all — VEP queries Ensembl's public database server
over the internet for each variant instead of a local cache.

- Download: none
- Disk: none beyond the ~18 MB reference FASTA
- Time: slower per run (network round-trip per variant) and depends on how
  busy Ensembl's public server is
- **Caveat, found while researching this**: Ensembl is mid-migration to a
  new platform (GraphQL-based, at beta.ensembl.org) as of mid-2026, and is
  upgrading its public MySQL servers in the meantime. This mode isn't
  formally deprecated, but it's the less actively-maintained path right now
  and could degrade or break without much notice. Fine for a one-off small
  VCF like ours (464 variants); not what you'd want for anything larger or
  longer-lived.

```bash
./run-vep.sh --database   # no cache needed, hits Ensembl's public DB live
```

## What the script actually runs

```bash
docker run --rm \
  -v "$(pwd)/../data/input:/opt/vep/input" \
  -v "$(pwd)/../data/annotated:/opt/vep/output" \
  -v "$(pwd)/../vep-cache:/opt/vep/.vep" \
  ensemblorg/ensembl-vep:release_116.0 \
  vep --input_file /opt/vep/input/NA12878.strelka.variants.vcf.gz \
      --output_file /opt/vep/output/NA12878.vep.json --json --force_overwrite \
      --assembly GRCh38 --species homo_sapiens \
      --cache --offline --dir_cache /opt/vep/.vep \
      --fasta /opt/vep/.vep/Homo_sapiens.GRCh38.dna.chromosome.20.fa.gz \
      --hgvs --check_existing --symbol --biotype --numbers
```

`--json` gives one structured record per variant (gene, consequence,
transcript, HGVSc/p, existing rsIDs, etc.) that `server/src/scripts/annotate.ts`
(Phase 1, next step) reads to drive the ClinVar cross-reference.
