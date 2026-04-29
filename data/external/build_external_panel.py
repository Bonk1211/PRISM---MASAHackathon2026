"""Build SEA-filtered country-year tables from external sources.

Inputs (placed by `fetch_external.sh` next to this script):
  emdat/emdat_country_profiles.xlsx   - HDX EM-DAT country profiles
  ndgain/gain.csv                     - ND-GAIN composite index (wide)
  ndgain/vulnerability.csv            - ND-GAIN vulnerability pillar (wide)
  ndgain/readiness.csv                - ND-GAIN readiness pillar (wide)

Outputs (committed to data/external/):
  emdat/emdat_sea_country_year.csv    - VN/PH/etc. × year × disaster_type
  emdat/emdat_sea_annual.csv          - VN/PH/etc. × year, all disasters aggregated
  ndgain/ndgain_sea_country_year.csv  - country × year × {gain, vulnerability, readiness}
  external_features_sea.csv           - merged country-year frame ready to join WDI panel

Reproducibility: deterministic; no random ops.
"""
from __future__ import annotations

import pathlib
import pandas as pd

HERE = pathlib.Path(__file__).resolve().parent

SEA_ISO3 = {
    "BRN": "Brunei Darussalam",
    "KHM": "Cambodia",
    "IDN": "Indonesia",
    "LAO": "Lao PDR",
    "MYS": "Malaysia",
    "MMR": "Myanmar",
    "PHL": "Philippines",
    "SGP": "Singapore",
    "THA": "Thailand",
    "VNM": "Vietnam",
}


def build_emdat() -> pd.DataFrame:
    """Reshape HDX EM-DAT country profiles to SEA country-year-disaster-type."""
    src = HERE / "emdat" / "emdat_country_profiles.xlsx"
    raw = pd.read_excel(src, sheet_name=0, header=0)
    # row 0 contains HXL tags (#date +occurred etc.) — drop
    raw = raw[raw["Year"].astype(str).str.match(r"^\d{4}$")].copy()
    raw["Year"] = raw["Year"].astype(int)

    sea = raw[raw["ISO"].isin(SEA_ISO3)].copy()
    sea = sea.rename(columns={
        "ISO": "iso3",
        "Country": "country",
        "Year": "year",
        "Disaster Type": "disaster_type",
        "Disaster Subtype": "disaster_subtype",
        "Total Events": "events",
        "Total Affected": "affected",
        "Total Deaths": "deaths",
        "Total Damage (USD, original)": "damage_usd_nominal",
        "Total Damage (USD, adjusted)": "damage_usd_2024",
    })
    sea["country"] = sea["iso3"].map(SEA_ISO3)  # canonical names match WDI panel

    keep = [
        "country", "iso3", "year", "disaster_type", "disaster_subtype",
        "events", "affected", "deaths", "damage_usd_nominal", "damage_usd_2024",
    ]
    sea = sea[keep].sort_values(["country", "year", "disaster_type"])
    sea.to_csv(HERE / "emdat" / "emdat_sea_country_year.csv", index=False)

    annual = (
        sea.groupby(["country", "iso3", "year"], as_index=False)
        .agg(
            events=("events", "sum"),
            affected=("affected", "sum"),
            deaths=("deaths", "sum"),
            damage_usd_nominal=("damage_usd_nominal", "sum"),
            damage_usd_2024=("damage_usd_2024", "sum"),
        )
    )
    annual.to_csv(HERE / "emdat" / "emdat_sea_annual.csv", index=False)
    return annual


def _melt_ndgain(name: str, value_col: str) -> pd.DataFrame:
    src = HERE / "ndgain" / f"{name}.csv"
    wide = pd.read_csv(src)
    year_cols = [c for c in wide.columns if c.isdigit()]
    long = wide.melt(
        id_vars=["ISO3", "Name"], value_vars=year_cols,
        var_name="year", value_name=value_col,
    )
    long["year"] = long["year"].astype(int)
    long = long[long["ISO3"].isin(SEA_ISO3)].copy()
    long["country"] = long["ISO3"].map(SEA_ISO3)
    return long[["country", "ISO3", "year", value_col]].rename(columns={"ISO3": "iso3"})


def build_ndgain() -> pd.DataFrame:
    gain = _melt_ndgain("gain", "ndgain_index")
    vuln = _melt_ndgain("vulnerability", "ndgain_vulnerability")
    read = _melt_ndgain("readiness", "ndgain_readiness")
    out = gain.merge(vuln, on=["country", "iso3", "year"], how="outer")
    out = out.merge(read, on=["country", "iso3", "year"], how="outer")
    out = out.sort_values(["country", "year"])
    out.to_csv(HERE / "ndgain" / "ndgain_sea_country_year.csv", index=False)
    return out


def build_merged(emdat_annual: pd.DataFrame, ndgain: pd.DataFrame) -> None:
    merged = ndgain.merge(emdat_annual, on=["country", "iso3", "year"], how="outer")
    merged = merged.sort_values(["country", "year"])
    merged.to_csv(HERE / "external_features_sea.csv", index=False)


def main() -> None:
    emdat_annual = build_emdat()
    ndgain = build_ndgain()
    build_merged(emdat_annual, ndgain)
    print("OK — wrote:")
    for p in [
        "emdat/emdat_sea_country_year.csv",
        "emdat/emdat_sea_annual.csv",
        "ndgain/ndgain_sea_country_year.csv",
        "external_features_sea.csv",
    ]:
        size = (HERE / p).stat().st_size
        print(f"  {p}  ({size:,} bytes)")


if __name__ == "__main__":
    main()
