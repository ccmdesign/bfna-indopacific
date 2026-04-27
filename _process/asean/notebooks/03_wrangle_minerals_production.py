"""
Wrangle USGS MCS2026 → asean-minerals-production.csv

Country × mineral × year × volume × world-share for the critical minerals
relevant to Thesis B. Focuses on ASEAN producers + key benchmark countries.

Inputs:  data-raw/usgs-minerals/MCS2026_Commodities_Data.csv
Outputs: data-wrangled/asean-minerals-production.csv
"""
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data-raw" / "usgs-minerals" / "MCS2026_Commodities_Data.csv"
OUT = ROOT / "data-wrangled" / "asean-minerals-production.csv"

# Critical minerals we care about (USGS commodity names)
COMMODITIES = [
    "Nickel", "Cobalt", "Tin", "Bauxite", "Copper",
    "Rare Earths", "Lithium", "Graphite (Natural)",
]

# Country names → ISO-3
COUNTRY_TO_ISO = {
    # ASEAN
    "Indonesia": "IDN", "Philippines": "PHL", "Malaysia": "MYS",
    "Thailand": "THA", "Vietnam": "VNM", "Singapore": "SGP",
    "Cambodia": "KHM", "Laos": "LAO", "Myanmar": "MMR", "Brunei": "BRN",
    "Burma": "MMR",
    # Major partners + benchmarks
    "United States": "USA", "China": "CHN", "Japan": "JPN",
    "Korea, Republic of": "KOR", "South Korea": "KOR",
    "Australia": "AUS", "Russia": "RUS", "Canada": "CAN", "Brazil": "BRA",
    "Chile": "CHL", "Peru": "PER", "Argentina": "ARG", "Mexico": "MEX",
    "India": "IND", "South Africa": "ZAF", "Congo (Kinshasa)": "COD",
    "Democratic Republic of the Congo": "COD",
    "Madagascar": "MDG", "New Caledonia": "NCL", "Cuba": "CUB",
    "Turkey": "TUR", "Finland": "FIN", "Sweden": "SWE", "Germany": "DEU",
    "France": "FRA", "United Kingdom": "GBR",
    "Bolivia": "BOL", "Zimbabwe": "ZWE", "Portugal": "PRT", "Ukraine": "UKR",
}


def main():
    df = pd.read_csv(RAW, encoding_errors="replace")
    df.columns = [c.strip() for c in df.columns]

    # Keep just production rows for our 8 commodities
    prod_keywords = ("Mine production",)
    mask_commodity = df["Commodity"].isin(COMMODITIES)
    mask_stat = df["Statistics"].astype(str).str.lower() == "production"
    mask_detail = df["Statistics_detail"].astype(str).str.contains("Mine production", case=False, na=False)
    sub = df[mask_commodity & mask_stat & mask_detail].copy()

    # Year normalization: keep numeric 2021–2025 only
    sub["year_str"] = sub["Year"].astype(str).str.strip()
    sub = sub[sub["year_str"].str.match(r"^\d{4}$")]
    sub["year"] = sub["year_str"].astype(int)
    sub = sub[sub["year"].between(2021, 2025)]

    # Value cleaning: strip commas, drop "W" (withheld), "(D)" suppressed
    def to_float(v):
        if pd.isna(v): return None
        s = str(v).strip().replace(",", "")
        if s in {"W", "(D)", "(*)", "—", "-", "NA"}: return None
        try: return float(s)
        except ValueError: return None
    sub["value"] = sub["Value"].map(to_float)

    # Map country → ISO-3 (drop unknown for now; world totals retained separately)
    sub["country_iso3"] = sub["Country"].map(COUNTRY_TO_ISO)

    # Compute world total per (commodity, year) using rows where Country == "World total"
    world = sub[sub["Country"].str.strip().str.lower().str.startswith("world", na=False)].copy()
    world_totals = (world.groupby(["Commodity", "year"])["value"].sum().reset_index()
                    .rename(columns={"value": "world_total"}))

    # Country-level rows
    country = sub[sub["country_iso3"].notna()].copy()
    country = country.merge(world_totals, on=["Commodity", "year"], how="left")
    country["share_of_world_pct"] = (country["value"] / country["world_total"] * 100).round(2)

    out = country.rename(columns={
        "Commodity": "mineral",
        "Country": "country_name",
        "Unit": "unit",
        "value": "production",
    })[[
        "country_iso3", "country_name", "mineral", "year", "production",
        "unit", "world_total", "share_of_world_pct",
    ]].sort_values(["mineral", "year", "country_iso3"]).reset_index(drop=True)

    out.to_csv(OUT, index=False)
    print(f"Wrote {OUT}: {len(out)} rows")

    print("\nIndonesia nickel share of world (USGS, mine production, contained Ni):")
    idn_ni = out[(out["mineral"] == "Nickel") & (out["country_iso3"] == "IDN")]
    print(idn_ni[["year", "production", "world_total", "share_of_world_pct"]].to_string(index=False))

    print("\nTop 5 producers per mineral, latest year:")
    latest_per_mineral = out.groupby("mineral")["year"].max().to_dict()
    for m, y in latest_per_mineral.items():
        top = (out[(out["mineral"] == m) & (out["year"] == y)]
               .sort_values("production", ascending=False).head(5))
        if len(top):
            print(f"\n  {m} ({y}):")
            for _, r in top.iterrows():
                print(f"    {r['country_iso3']:3} {r['country_name']:25}  {r['production']:>12,.0f} {r['unit']:<15}  {r['share_of_world_pct']:>5.1f}%")

if __name__ == "__main__":
    main()
