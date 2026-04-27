"""
Wrangle 6 raw sources → asean-flows-yearly.csv

Canonical bilateral-flow layer. One row per:
  (asean_country × year × partner_group × direction × metric × source)

Partner groups: USA, CHN, JPN, KOR, EU, GBR, OTHER
Directions:     asean_to_partner, partner_to_asean
Metrics:        trade_goods, fdi_flow, fdi_position,
                china_dev_finance, china_commercial_investment, china_commercial_construction

Inputs:
  data-raw/baci-trade/baci-asean-by-partner-group-2010-2024.csv
  data-raw/oecd-fdi/oecd-fdi-flows-asean-2010-2024.csv
  data-raw/oecd-fdi/oecd-fdi-positions-asean-2010-2024.csv
  data-raw/bea-fdi/bea-usdia-asean-2010-2024-detailedcountry.csv
  data-raw/jetro-fdi/jetro-japan-outward-fdi-asean-2010-2024.csv
  data-raw/aiddata-gcdf/gcdf-asean-country-year-totals.csv
  data-raw/china-gi-tracker/china-global-investment-tracker-2023-fall.xlsx

Output:
  data-wrangled/asean-flows-yearly.csv
"""
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data-raw"
OUT = ROOT / "data-wrangled" / "asean-flows-yearly.csv"

ASEAN_10 = ["BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "THA", "VNM"]
ASEAN_NAMES_TO_ISO = {
    "Brunei": "BRN", "Brunei Darussalam": "BRN",
    "Cambodia": "KHM",
    "Indonesia": "IDN",
    "Laos": "LAO", "Lao People's Democratic Republic": "LAO", "Lao PDR": "LAO",
    "Lao People’s Democratic Republic": "LAO",
    "Malaysia": "MYS",
    "Myanmar": "MMR", "Burma": "MMR",
    "Philippines": "PHL",
    "Singapore": "SGP",
    "Thailand": "THA",
    "Vietnam": "VNM", "Viet Nam": "VNM", "Viet Nam ": "VNM",
}

# Reporter ISO3 → partner_group
PARTNER_GROUP = {
    "USA": "USA",
    "CHN": "CHN",
    "JPN": "JPN",
    "KOR": "KOR",
    "GBR": "GBR",
    # EU members aggregated as "EU"
    "DEU": "EU", "FRA": "EU", "NLD": "EU", "ITA": "EU", "ESP": "EU",
    "BEL": "EU", "POL": "EU", "SWE": "EU",
    # Other catch
    "AUS": "OTHER", "CAN": "OTHER", "IND": "OTHER",
}


def baci_trade():
    df = pd.read_csv(RAW / "baci-trade" / "baci-asean-by-partner-group-2010-2024.csv")
    # Already country-year-partner_group aggregated
    df = df.rename(columns={
        "asean_country": "country_iso3",
        "t": "year",
        "trade_usd_millions": "value_usd_millions",
    })
    df["metric"] = "trade_goods"
    df["source"] = "BACI HS07 V202601"
    df = df[["country_iso3", "year", "partner_group", "direction", "metric", "value_usd_millions", "source"]]
    return df


def oecd_fdi(measure_label, fname):
    df = pd.read_csv(RAW / "oecd-fdi" / fname)
    df = df.rename(columns={
        "REF_AREA": "reporter_iso3",
        "COUNTERPART_AREA": "asean_iso3",
        "TIME_PERIOD": "year",
        "OBS_VALUE": "value_usd_millions",
    })
    df = df[df["value_usd_millions"].notna()].copy()
    df["partner_group"] = df["reporter_iso3"].map(PARTNER_GROUP)
    df = df.dropna(subset=["partner_group"])
    df["country_iso3"] = df["asean_iso3"]
    df["direction"] = "partner_to_asean"   # OECD reports outward from REPORTER
    df["metric"] = measure_label
    df["source"] = f"OECD BMD4 ({measure_label})"
    # Aggregate EU members → EU group
    out = (df.groupby(["country_iso3", "year", "partner_group", "direction", "metric", "source"])
              ["value_usd_millions"].sum().reset_index())
    return out


def bea_fdi():
    df = pd.read_csv(RAW / "bea-fdi" / "bea-usdia-asean-2010-2024-detailedcountry.csv")
    df["country_iso3"] = df["country"].map(ASEAN_NAMES_TO_ISO)
    df = df.dropna(subset=["country_iso3"])
    # Convert string flags ((D), (*)) to numeric NaN/0
    df["value_usd_millions"] = pd.to_numeric(df["value"], errors="coerce")
    df = df[df["value_usd_millions"].notna()]
    metric_map = {"Position": "fdi_position", "Financial transactions": "fdi_flow"}
    df["metric"] = df["metric"].map(metric_map)
    df["partner_group"] = "USA"
    df["direction"] = "partner_to_asean"
    df["source"] = "BEA USDIA"
    return df[["country_iso3", "year", "partner_group", "direction", "metric", "value_usd_millions", "source"]]


def jetro_fdi():
    df = pd.read_csv(RAW / "jetro-fdi" / "jetro-japan-outward-fdi-asean-2010-2024.csv")
    df["country_iso3"] = df["country"].map(ASEAN_NAMES_TO_ISO)
    df = df.dropna(subset=["country_iso3"])
    metric_map = {"Flow": "fdi_flow", "Stock": "fdi_position"}
    df["metric"] = df["metric"].map(metric_map)
    df["partner_group"] = "JPN"
    df["direction"] = "partner_to_asean"
    df["source"] = "JETRO/BOJ"
    df = df.rename(columns={"value_usd_millions": "value_usd_millions"})
    return df[["country_iso3", "year", "partner_group", "direction", "metric", "value_usd_millions", "source"]]


def aiddata_gcdf():
    df = pd.read_csv(RAW / "aiddata-gcdf" / "gcdf-asean-country-year-totals.csv")
    df = df.rename(columns={
        "Recipient ISO-3": "country_iso3",
        "Commitment Year": "year",
        "Amount_USD_M_2021": "value_usd_millions",
    })
    df["partner_group"] = "CHN"
    df["direction"] = "partner_to_asean"
    df["metric"] = "china_dev_finance"
    df["source"] = "AidData GCDF 3.0 (constant 2021 USD)"
    df = df[df["year"].between(2010, 2024)]
    return df[["country_iso3", "year", "partner_group", "direction", "metric", "value_usd_millions", "source"]]


def cgit():
    """Parse CGIT 2023-Fall XLSX. Header row at index 5. Tabs: Dataset 1/2/3."""
    path = RAW / "china-gi-tracker" / "china-global-investment-tracker-2023-fall.xlsx"
    rows = []
    tabs = {
        "Dataset 1": "china_commercial_investment",   # equity/M&A/greenfield
        "Dataset 2": "china_commercial_construction", # EPC contracts
    }
    for tab, metric in tabs.items():
        df = pd.read_excel(path, sheet_name=tab, header=5)
        col_year = next((c for c in df.columns if str(c).lower().strip() == "year"), None)
        col_qty  = next((c for c in df.columns if "quantity" in str(c).lower() and "million" in str(c).lower()), None)
        col_ctry = next((c for c in df.columns if str(c).lower().strip() == "country"), None)
        if not all([col_year, col_qty, col_ctry]):
            print(f"  CGIT {tab}: missing required cols  Y={col_year} Q={col_qty} C={col_ctry}")
            continue
        d = df[[col_year, col_qty, col_ctry]].rename(
            columns={col_year: "year", col_qty: "value_usd_millions", col_ctry: "country_name"}
        )
        d["country_iso3"] = d["country_name"].map(ASEAN_NAMES_TO_ISO)
        d = d.dropna(subset=["country_iso3"])
        d["value_usd_millions"] = pd.to_numeric(d["value_usd_millions"], errors="coerce")
        d = d.dropna(subset=["value_usd_millions"])
        d["year"] = pd.to_numeric(d["year"], errors="coerce")
        d = d.dropna(subset=["year"])
        d["year"] = d["year"].astype(int)
        d = d[d["year"].between(2010, 2024)]
        agg = d.groupby(["country_iso3", "year"])["value_usd_millions"].sum().reset_index()
        agg["partner_group"] = "CHN"
        agg["direction"] = "partner_to_asean"
        agg["metric"] = metric
        agg["source"] = "CGIT 2023-Fall (>=$95M)"
        rows.append(agg)
    return pd.concat(rows, ignore_index=True) if rows else pd.DataFrame()


def main():
    parts = []
    for fn, label in [
        (baci_trade,                                   "BACI trade"),
        (lambda: oecd_fdi("fdi_flow",     "oecd-fdi-flows-asean-2010-2024.csv"),     "OECD flows"),
        (lambda: oecd_fdi("fdi_position", "oecd-fdi-positions-asean-2010-2024.csv"), "OECD positions"),
        (bea_fdi,    "BEA USDIA"),
        (jetro_fdi,  "JETRO"),
        (aiddata_gcdf, "AidData GCDF"),
        (cgit, "CGIT"),
    ]:
        df = fn()
        print(f"  {label:24s} {len(df):>5d} rows")
        parts.append(df)

    flows = pd.concat(parts, ignore_index=True)
    # Filter to ASEAN-10 + clean partner_group
    flows = flows[flows["country_iso3"].isin(ASEAN_10)]
    flows = flows[flows["year"].between(2010, 2024)]
    flows = flows.sort_values(["country_iso3", "year", "partner_group", "metric", "source"]).reset_index(drop=True)

    flows.to_csv(OUT, index=False)
    print(f"\nWrote {OUT}: {len(flows)} rows")

    print("\nRows per (metric, source):")
    print(flows.groupby(["metric", "source"]).size().to_string())

    print("\nSpot-check: Indonesia 2024 flows ($M):")
    idn24 = flows[(flows["country_iso3"] == "IDN") & (flows["year"] == 2024)]
    pivot = idn24.pivot_table(
        index=["partner_group", "direction"],
        columns="metric",
        values="value_usd_millions",
        aggfunc="sum",
    ).round(0)
    print(pivot.to_string())


if __name__ == "__main__":
    main()
