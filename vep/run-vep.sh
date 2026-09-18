#!/usr/bin/env bash
# Runs VEP against the real sarek NA12878 VCF via the official Ensembl
# Docker image. Pass --database to use live Ensembl DB mode instead of the
# offline cache (see README.md for the tradeoffs of each).
set -euo pipefail
cd "$(dirname "$0")"

IMAGE="ensemblorg/ensembl-vep:release_116.0"
INPUT="NA12878.strelka.variants.vcf.gz"
FASTA="Homo_sapiens.GRCh38.dna.chromosome.20.fa"

MODE_ARGS="--cache --offline --dir_cache /opt/vep/.vep"
if [ "${1:-}" = "--database" ]; then
  MODE_ARGS="--database"
  echo "Running in --database mode (live Ensembl DB, no local cache)."
fi

mkdir -p ../data/annotated

# Git Bash (MSYS) auto-rewrites Unix-looking paths in arguments as if they
# were Windows host paths — this mangles the container-internal /opt/vep/...
# paths below (found by hitting the resulting "C:/Program Files/Git/opt/..."
# error). MSYS_NO_PATHCONV=1 disables that rewriting for this command.
export MSYS_NO_PATHCONV=1

docker run --rm \
  -v "$(pwd)/../data/input:/opt/vep/input" \
  -v "$(pwd)/../data/annotated:/opt/vep/output" \
  -v "$(pwd)/../vep-cache:/opt/vep/.vep" \
  "$IMAGE" \
  vep --input_file "/opt/vep/input/${INPUT}" \
      --output_file /opt/vep/output/NA12878.vep.json \
      --json --force_overwrite \
      --assembly GRCh38 --species homo_sapiens \
      $MODE_ARGS \
      --fasta "/opt/vep/.vep/${FASTA}" \
      --hgvs --check_existing --symbol --biotype --numbers --canonical

echo "Wrote data/annotated/NA12878.vep.json"
