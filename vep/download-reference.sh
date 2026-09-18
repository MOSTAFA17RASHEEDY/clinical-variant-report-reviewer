#!/usr/bin/env bash
# Downloads chr20's reference FASTA (~18MB) from Ensembl — needed by VEP's
# --hgvs flag either way (offline cache or --database mode).
set -euo pipefail
cd "$(dirname "$0")/../vep-cache"

GZFASTA="Homo_sapiens.GRCh38.dna.chromosome.20.fa.gz"
FASTA="Homo_sapiens.GRCh38.dna.chromosome.20.fa"
URL="https://ftp.ensembl.org/pub/release-116/fasta/homo_sapiens/dna/${GZFASTA}"

if [ -f "$FASTA" ]; then
  echo "Already have $FASTA, skipping."
else
  echo "Downloading $GZFASTA (~18MB)..."
  curl -L -o "$GZFASTA" "$URL"
  # Ensembl's FTP files are plain gzip, not bgzip — samtools faidx needs
  # either uncompressed or bgzip, so decompress rather than re-bgzip.
  gunzip "$GZFASTA"
fi

# No standalone `samtools` binary in the ensemblorg/ensembl-vep image (it
# uses the Perl Bio::DB::HTS::Faidx bindings internally instead) — found by
# checking inside the container rather than assuming. VEP auto-indexes a
# --fasta file on first use if no .fai/.gzi exists yet, so no manual
# indexing step is needed; run-vep.sh's first run will create it.
echo "Done: vep-cache/$FASTA (VEP will auto-index it on first run)"
