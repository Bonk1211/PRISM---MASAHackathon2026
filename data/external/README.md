# External Data — Sources, Licences, Reproducibility

The R Markdown and Python pipelines pull two public datasets in addition to the
World Bank WDI panel. This directory holds the local snapshot used in the
submission and the scripts to reproduce it.

> Snapshot date: **2026-04-29**. All quantitative claims that touch external
> data in `deliverables/` trace back to the files listed below.

---

## 1. EM-DAT — International Disaster Database (country profiles)

| Field | Value |
|---|---|
| Originator | Centre for Research on the Epidemiology of Disasters (CRED), Université catholique de Louvain (UCLouvain), Brussels |
| Distributor | Humanitarian Data Exchange (HDX), OCHA |
| Dataset page | <https://data.humdata.org/dataset/emdat-country-profiles> |
| File pulled | `emdat-country-profiles_2026_04_24.xlsx` (404 KB) |
| Direct URL | <https://data.humdata.org/dataset/74163686-a029-4e27-8fbf-c5bfcd13f953/resource/c5ce40d6-07b1-4f36-955a-d6196436ff6b/download/emdat-country-profiles_2026_04_24.xlsx> |
| Coverage | 1900–2026 (we use **2000–2024**); 217 countries × disaster sub-types |
| Granularity | one row per `(year, country, disaster sub-type)` |
| Licence | HDX-Other; non-commercial use permitted with attribution to CRED/UCLouvain (see <https://doc.emdat.be/docs/legal/terms-of-use/>) |
| Update cadence | Weekly |

**Why used.** The brief (§Key Considerations, third bullet) requires SEA
natural-disaster claims comparison supported by external research. This is the
authoritative public source quoted in Swiss Re *sigma* and Munich Re NatCat
reports for event counts, deaths, persons affected, and damage in USD.

**Pre-processing applied** (`build_external_panel.py`):
1. Drop the HXL-tag header row (row 1 contains `#date +occurred` etc.).
2. Filter to ten ASEAN ISO3 codes (BRN, KHM, IDN, LAO, MYS, MMR, PHL, SGP, THA, VNM).
3. Map ISO3 → canonical country name to match `data/sea_panel_clean.csv`.
4. Output two granularities:
   - `emdat_sea_country_year.csv` — preserves disaster type/sub-type breakdown
   - `emdat_sea_annual.csv` — aggregated to country-year (sum of events/affected/deaths/damage)

**Citation.** EM-DAT, CRED / UCLouvain (2026). *EM-DAT Country Profiles*.
Distributed via HDX. Downloaded 2026-04-29.

---

## 2. ND-GAIN — Notre Dame Global Adaptation Initiative Country Index

| Field | Value |
|---|---|
| Originator | University of Notre Dame, Global Adaptation Initiative |
| Dataset page | <https://gain.nd.edu/our-work/country-index/download-data/> |
| File pulled | `ndgain_countryindex_2026.zip` (4.5 MB) — three CSVs extracted: `gain.csv`, `vulnerability.csv`, `readiness.csv` |
| Direct URL | <https://gain.nd.edu/assets/647440/ndgain_countryindex_2026.zip> |
| Coverage | 1995–2023; 192 countries (we filter to 10 SEA) |
| Granularity | one row per country (ISO3 + Name) × wide year columns |
| Licence | Free / open access for non-commercial research with attribution; technical report at <https://gain.nd.edu/assets/581554/nd_gain_countryindex_technicalreport_2024.pdf> |
| Methodology citation | Chen, C., Noble, I., Hellmann, J., Coffee, J., Murillo, M., & Chawla, N. (2015). *University of Notre Dame Global Adaptation Index Country Index Technical Report.* Notre Dame, IN. |

**Why used.** Adds an *adaptive-capacity* dimension that the WDI panel only
captures indirectly through GDP-per-capita and renewable-energy share. The
ND-GAIN composite is the standard reference index in IPCC AR6 WG2 and in
sovereign climate-risk pricing (Volz et al. 2020). It improves cedent screening
(`05_cedent_screening_framework.md`) by giving a single normalised
country-readiness score independent of the WDI scale variables.

**Three pillars retained:**

| Variable | Pillar | Range | Direction |
|---|---|---|---|
| `ndgain_index` | Combined GAIN score | 0–100 | higher = better placed for climate change |
| `ndgain_vulnerability` | Vulnerability pillar | 0–1 | **higher = more vulnerable** |
| `ndgain_readiness` | Readiness pillar | 0–1 | higher = better governance/economic/social readiness |

**Pre-processing applied:** wide → long melt on year columns; SEA filter; merge
the three pillars on `(iso3, year)`.

**Citation.** Notre Dame Global Adaptation Initiative (2026). *ND-GAIN Country
Index — 2026 release*. University of Notre Dame. Downloaded 2026-04-29.

---

## Reproducing the snapshot

```bash
cd data/external
./fetch_external.sh
```

The script (i) downloads the two source files using the URLs above, (ii)
unzips ND-GAIN to extract the three pillar CSVs, and (iii) runs
`build_external_panel.py` to produce SEA country-year derivatives. Outputs are
deterministic — no random ops, no API keys. Re-running on a different day will
pick up newer EM-DAT weekly snapshots; pin the URL in `fetch_external.sh` for
exact reproducibility.

---

## Files committed to the repo

| File | Rows | Years | Purpose |
|---|---:|---|---|
| `emdat/emdat_country_profiles.xlsx` | ~25 k | 1900–2026 | Raw HDX snapshot (kept for traceability; only SEA portion is used downstream) |
| `emdat/emdat_sea_country_year.csv` | 466 | 2000–2024 | SEA × disaster-type — drives §5 disaster-claims chapter and `04_vietnam_vs_philippines_deep_dive.md` |
| `emdat/emdat_sea_annual.csv` | 194 | 2000–2024 | SEA × year totals — joined into modelling panel as exposure feature |
| `ndgain/gain.csv`, `vulnerability.csv`, `readiness.csv` | 192 each | wide 1995–2023 | Raw ND-GAIN extracts |
| `ndgain/ndgain_sea_country_year.csv` | 290 | 1995–2023 | SEA-filtered long-form three pillars — adaptive-capacity feature for §3 driver mix and §7 cedent screening |
| `ndgain/ndgain_countryindex_2026.zip` | — | — | Original zip, retained for licence/checksum trail |
| `external_features_sea.csv` | 290 | 1995–2024 | EM-DAT annual + ND-GAIN merged for one-line join with WDI panel |

---

## How downstream code joins these

```r
# R (analysis/R/analysis.Rmd, data-load chunk)
ext <- readr::read_csv("../../data/external/external_features_sea.csv", show_col_types = FALSE)
sea_panel_ext <- sea_panel %>% dplyr::left_join(ext, by = c("country", "year"))
```

```python
# Python (analysis/python/analysis.ipynb, KEY_INDICATORS section)
ext = pd.read_csv("../../data/external/external_features_sea.csv")
sea_panel_ext = sea_panel.merge(ext, on=["country", "year"], how="left")
```

The merged frame is what feeds the §3 partial-correlation table, the §5
disaster-claims comparison, and the §7 cedent-screening tier matrix.
