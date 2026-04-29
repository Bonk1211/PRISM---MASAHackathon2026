#!/usr/bin/env bash
# Fetch external datasets used by the analysis pipeline.
# Run from repo root or from this directory — paths are absolute relative to script.
#
# Sources (full attribution in data/external/README.md):
#   1. EM-DAT Country Profiles  - CRED/UCLouvain via HDX  - HDX-Other licence
#   2. ND-GAIN Country Index    - University of Notre Dame - free / open access
#
# Replays the exact retrieval used for the 2026-04-29 snapshot. URLs are stable;
# if HDX rotates the EM-DAT filename, query the package_show API to pick up the
# latest .xlsx (see comment below).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

EMDAT_URL="https://data.humdata.org/dataset/74163686-a029-4e27-8fbf-c5bfcd13f953/resource/c5ce40d6-07b1-4f36-955a-d6196436ff6b/download/emdat-country-profiles_2026_04_24.xlsx"
# To pick up the latest snapshot instead of the pinned 2026-04-24 file, run:
#   curl -sSL "https://data.humdata.org/api/3/action/package_show?id=emdat-country-profiles" \
#     | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['resources'][0]['url'])"
NDGAIN_URL="https://gain.nd.edu/assets/647440/ndgain_countryindex_2026.zip"

echo "[1/3] EM-DAT country profiles ..."
curl -fsSL -A "Mozilla/5.0" -o "${HERE}/emdat/emdat_country_profiles.xlsx" "${EMDAT_URL}"

echo "[2/3] ND-GAIN Country Index ..."
curl -fsSL -A "Mozilla/5.0" -o "${HERE}/ndgain/ndgain_countryindex_2026.zip" "${NDGAIN_URL}"
unzip -j -o "${HERE}/ndgain/ndgain_countryindex_2026.zip" \
  "resources/gain/gain.csv" \
  "resources/vulnerability/vulnerability.csv" \
  "resources/readiness/readiness.csv" \
  -d "${HERE}/ndgain/" >/dev/null

echo "[3/3] Building SEA panels ..."
python3 "${HERE}/build_external_panel.py"

echo "Done. Snapshot in ${HERE}/."
