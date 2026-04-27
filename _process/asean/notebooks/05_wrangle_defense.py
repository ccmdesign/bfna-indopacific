"""
Wrangle SIPRI Milex 2025 release → asean-defense-yearly.csv

Country × year × series for ASEAN-10 + 7 benchmark powers (US, CN, RU, IN, JP, KR, AU).
Series = constant 2024 USD, current USD, share of GDP, per capita, share of govt spending.

Inputs:  data-raw/sipri-milex/SIPRI-Milex-data-1949-2025.xlsx (gitignored; refetch from URL)
Outputs: data-wrangled/asean-defense-yearly.csv (long format)
"""
from pathlib import Path
import pandas as pd
import re

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data-raw" / "sipri-milex" / "SIPRI-Milex-data-1949-2025.xlsx"
OUT = ROOT / "data-wrangled" / "asean-defense-yearly.csv"

# ASEAN-10 + benchmark countries
TARGETS = {
    "Brunei": "BRN", "Cambodia": "KHM", "Indonesia": "IDN", "Laos": "LAO",
    "Malaysia": "MYS", "Myanmar": "MMR", "Burma": "MMR",
    "Philippines": "PHL", "Singapore": "SGP", "Thailand": "THA", "Viet Nam": "VNM",
    "Vietnam": "VNM", "Timor Leste": "TLS", "Timor-Leste": "TLS",
    "United States of America": "USA", "USA": "USA", "United States": "USA",
    "China": "CHN", "Russia": "RUS", "USSR": "RUS",
    "Japan": "JPN", "Korea, South": "KOR", "South Korea": "KOR", "Korea, Republic of": "KOR",
    "India": "IND", "Australia": "AUS",
}

SHEET_TO_METRIC = {
    "Constant (2024) US$":       ("milex_constant_2024_usd_millions", "USD millions, constant 2024"),
    "Current US$":               ("milex_current_usd_millions",       "USD millions, current"),
    "Share of GDP":              ("milex_share_of_gdp_pct",           "% of GDP"),
    "Per capita":                ("milex_per_capita_usd",             "USD per capita"),
    "Share of Govt. spending":   ("milex_share_of_govt_pct",          "% of govt spending"),
}


def parse_sheet(path, sheet, metric_label, unit):
    df = pd.read_excel(path, sheet_name=sheet, header=None)
    # Find year row: must have at least 5 numeric values 1949+
    year_row_idx = None
    for i in range(min(20, len(df))):
        cnt = sum(1 for v in df.iloc[i].values if isinstance(v, (int, float)) and 1948 < (v or 0) < 2030)
        if cnt >= 5:
            year_row_idx = i; break
    if year_row_idx is None:
        return pd.DataFrame()
    years = []; cols = []
    for j, v in enumerate(df.iloc[year_row_idx].values):
        if isinstance(v, (int, float)) and 1948 < (v or 0) < 2030:
            years.append(int(v)); cols.append(j)

    rows = []
    for i in range(year_row_idx + 1, len(df)):
        country = df.iloc[i, 0]
        if not isinstance(country, str):
            continue
        country = country.strip()
        iso3 = TARGETS.get(country)
        if not iso3:
            continue
        for y, jcol in zip(years, cols):
            v = df.iloc[i, jcol]
            if pd.isna(v) or v in {"...", "xxx", "..", "-", ". ."}:
                continue
            try: vf = float(v)
            except (ValueError, TypeError): continue
            rows.append({
                "country_iso3": iso3,
                "country_name": country,
                "year": y,
                "metric": metric_label,
                "unit": unit,
                "value": vf,
            })
    return pd.DataFrame(rows)


def main():
    parts = []
    for sheet, (metric_label, unit) in SHEET_TO_METRIC.items():
        df = parse_sheet(RAW, sheet, metric_label, unit)
        print(f"  {sheet:30s} {len(df):>5d} rows")
        parts.append(df)
    out = pd.concat(parts, ignore_index=True)
    out = out[out["year"].between(2000, 2024)]
    # SIPRI stores GDP-share + govt-share as fractions; convert to percent.
    pct_metrics = {"milex_share_of_gdp_pct", "milex_share_of_govt_pct"}
    mask_pct = out["metric"].isin(pct_metrics)
    out.loc[mask_pct, "value"] = out.loc[mask_pct, "value"] * 100.0
    out["country_group"] = out["country_iso3"].apply(
        lambda c: "ASEAN" if c in {"BRN","KHM","IDN","LAO","MYS","MMR","PHL","SGP","THA","VNM","TLS"} else "PARTNER"
    )
    out = out[["country_iso3", "country_name", "country_group", "year", "metric", "unit", "value"]]
    out = out.sort_values(["country_iso3", "year", "metric"]).reset_index(drop=True)

    out.to_csv(OUT, index=False)
    print(f"\nWrote {OUT}: {len(out)} rows")

    print("\n2024 milex (constant 2024 USD millions), top 10 of selection:")
    sub = out[(out["year"] == 2024) & (out["metric"] == "milex_constant_2024_usd_millions")]
    print(sub[["country_iso3", "country_name", "value"]].sort_values("value", ascending=False).head(15).to_string(index=False))

    print("\n2024 milex share of GDP %:")
    sub = out[(out["year"] == 2024) & (out["metric"] == "milex_share_of_gdp_pct")]
    print(sub[["country_iso3", "country_name", "value"]].sort_values("value", ascending=False).to_string(index=False))


if __name__ == "__main__":
    main()
