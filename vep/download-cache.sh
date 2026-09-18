#!/usr/bin/env bash
# Downloads and extracts the full GRCh38 indexed VEP cache.
# Verified size (checked directly against the file, not estimated):
#   download ~25.7GB, ~55-60GB disk needed during extraction (tarball +
#   extracted copy — safe to delete the tarball afterwards, settling ~30GB).
# One-time cost; after this, VEP runs fully offline.
set -euo pipefail
cd "$(dirname "$0")/../vep-cache"

RELEASE=116
TARBALL="homo_sapiens_vep_${RELEASE}_GRCh38.tar.gz"
URL="https://ftp.ensembl.org/pub/release-${RELEASE}/variation/indexed_vep_cache/${TARBALL}"

if [ -d "homo_sapiens/${RELEASE}_GRCh38" ]; then
  echo "Cache already extracted at vep-cache/homo_sapiens/${RELEASE}_GRCh38, skipping."
  exit 0
fi

echo "Downloading $TARBALL (~25.7GB — this will take a while)..."
curl -L -o "$TARBALL" "$URL"

echo "Extracting..."
tar -xzf "$TARBALL"

echo "Done. Delete the tarball to free ~25.7GB now that it's extracted? (y/N)"
read -r ans
if [ "$ans" = "y" ] || [ "$ans" = "Y" ]; then
  rm "$TARBALL"
  echo "Deleted $TARBALL."
fi
