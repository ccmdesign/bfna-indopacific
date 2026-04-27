"""
Wrangle WDI raw → asean-normalization.csv

Canonical normalization layer: country × year × indicator
Used by viz scripts for share-of-GDP, per-capita, growth ratios.

Inputs:  data-raw/worldbank-wdi/wdi-wide-2000-2024.csv
Outputs: data-wrangled/asean-normalization.csv (long format)
         data-wrangled/asean-normalization-wide.csv (one row per country-year)
"""
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data-raw" / "worldbank-wdi" / "wdi-wide-2000-2024.csv"
OUT_DIR = ROOT / "data-wrangled"
OUT_DIR.mkdir(exist_ok=True)

# WDI ISO3 → canonical ISO3 (handle EU aggregate)
ASEAN_10 = ["BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "THA", "VNM"]
PARTNERS = ["USA", "CHN", "JPN", "KOR", "EUU"]   # EUU = WDI EU aggregate

INDICATOR_MAP = {
    "NY.GDP.MKTP.CD":   ("gdp_current_usd",         "USD"),
    "NY.GDP.PCAP.CD":   ("gdp_per_capita_usd",      "USD"),
    "NY.GDP.MKTP.KD":   ("gdp_constant_2015_usd",   "USD constant 2015"),
    "SP.POP.TOTL":      ("population",              "persons"),
    "NE.TRD.GNFS.ZS":   ("trade_pct_gdp",           "% of GDP"),
    "BX.KLT.DINV.CD.WD":("fdi_net_inflow_usd",      "USD"),
}

def main():
    df = pd.read_csv(RAW)
    df = df.rename(columns={"country_iso3": "country_iso3", "country": "country_name", "year": "year"})

    # Filter to ASEAN-10 + 5 partners
    keep = ASEAN_10 + PARTNERS
    df = df[df["country_iso3"].isin(keep)].copy()
    df["country_group"] = df["country_iso3"].apply(
        lambda c: "ASEAN" if c in ASEAN_10 else "PARTNER"
    )

    # Wide → long
    indicator_cols = [c for c in df.columns if c.startswith(("NY.", "SP.", "NE.", "BX."))]
    long_df = df.melt(
        id_vars=["country_iso3", "country_name", "country_group", "year"],
        value_vars=indicator_cols,
        var_name="indicator_code",
        value_name="value",
    )
    long_df["metric"] = long_df["indicator_code"].map(lambda c: INDICATOR_MAP[c][0])
    long_df["unit"]   = long_df["indicator_code"].map(lambda c: INDICATOR_MAP[c][1])
    long_df = long_df[["country_iso3", "country_name", "country_group", "year", "metric", "unit", "value"]]
    long_df = long_df.sort_values(["country_iso3", "year", "metric"]).reset_index(drop=True)

    long_path = OUT_DIR / "asean-normalization.csv"
    long_df.to_csv(long_path, index=False)
    print(f"Wrote {long_path}: {len(long_df)} rows")

    # Wide-by-metric for fast joins
    wide_df = (
        long_df.pivot_table(
            index=["country_iso3", "country_name", "country_group", "year"],
            columns="metric",
            values="value",
        )
        .reset_index()
    )
    wide_path = OUT_DIR / "asean-normalization-wide.csv"
    wide_df.to_csv(wide_path, index=False)
    print(f"Wrote {wide_path}: {len(wide_df)} rows")

    # Diagnostic: null counts per metric
    print("\nNull counts per metric (long):")
    print(long_df.groupby("metric")["value"].apply(lambda s: s.isna().sum()).to_string())

    print("\nCoverage spot-check (Indonesia 2024):")
    idn24 = wide_df[(wide_df["country_iso3"] == "IDN") & (wide_df["year"] == 2024)]
    if len(idn24):
        print(idn24.iloc[0].to_string())

if __name__ == "__main__":
    main()
