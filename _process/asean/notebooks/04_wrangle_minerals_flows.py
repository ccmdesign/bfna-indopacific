"""
Wrangle BACI HS6 critical-minerals → asean-minerals-flows.csv

Bilateral mineral trade flows: origin × destination × mineral_class × year × value × tons.
Buckets HS6 codes into mineral classes (battery vs. stainless vs. other) for clarity.

Inputs:  data-raw/baci-trade-minerals/baci-asean-minerals-bilateral-2010-2024.csv
Outputs: data-wrangled/asean-minerals-flows.csv
"""
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data-raw" / "baci-trade-minerals" / "baci-asean-minerals-bilateral-2010-2024.csv"
OUT = ROOT / "data-wrangled" / "asean-minerals-flows.csv"

ASEAN_10 = {"BRN","KHM","IDN","LAO","MYS","MMR","PHL","SGP","THA","VNM"}

# HS6 → (mineral, class, end_use)
HS6_META = {
    260400: ("Nickel ore",          "Nickel",   "Upstream ore"),
    750110: ("Nickel matte",        "Nickel",   "Battery-grade chain"),
    750120: ("Nickel oxide sinter", "Nickel",   "Battery-grade chain"),
    750210: ("Refined nickel",      "Nickel",   "Battery-grade chain"),
    282736: ("Nickel sulfate",      "Nickel",   "Battery precursor"),
    720260: ("Ferronickel",         "Nickel",   "Stainless steel"),
    260500: ("Cobalt ore",          "Cobalt",   "Upstream ore"),
    260300: ("Copper ore",          "Copper",   "Upstream ore"),
    760100: ("Unwrought aluminum",  "Aluminum", "Refined metal"),
    250410: ("Natural graphite",    "Graphite", "Battery anode"),
    253090: ("Other Li-bearing",    "Lithium",  "Other"),
    283691: ("Lithium carbonate",   "Lithium",  "Battery precursor"),
    283329: ("Other sulfates",      "Other",    "Other"),
    261390: ("Molybdenum ore",      "Other",    "Upstream ore"),
    261210: ("Uranium ore",         "Other",    "Upstream ore"),
}

# Reporter ISO3 → partner_group
PARTNER_GROUP = {
    "USA":"USA","CHN":"CHN","JPN":"JPN","KOR":"KOR","GBR":"GBR",
    "DEU":"EU","FRA":"EU","NLD":"EU","ITA":"EU","ESP":"EU",
    "BEL":"EU","POL":"EU","SWE":"EU",
    "AUS":"OTHER","CAN":"OTHER","IND":"OTHER",
}


def main():
    df = pd.read_csv(RAW)
    df = df.rename(columns={"t": "year"})
    df["mineral_label"] = df["hs6"].map(lambda h: HS6_META.get(int(h), (None, None, None))[0])
    df["mineral_class"] = df["hs6"].map(lambda h: HS6_META.get(int(h), (None, None, None))[1])
    df["end_use"]       = df["hs6"].map(lambda h: HS6_META.get(int(h), (None, None, None))[2])

    # Direction: ASEAN exporter or ASEAN importer
    df["asean_role"] = df.apply(
        lambda r: "exporter" if r["i_iso3"] in ASEAN_10 else
                  "importer" if r["j_iso3"] in ASEAN_10 else "other",
        axis=1,
    )
    df["asean_country"] = df.apply(
        lambda r: r["i_iso3"] if r["asean_role"] == "exporter" else
                  r["j_iso3"] if r["asean_role"] == "importer" else None,
        axis=1,
    )
    df["partner_iso3"] = df.apply(
        lambda r: r["j_iso3"] if r["asean_role"] == "exporter" else
                  r["i_iso3"] if r["asean_role"] == "importer" else None,
        axis=1,
    )
    df["partner_group"] = df["partner_iso3"].map(PARTNER_GROUP)

    df["value_usd_millions"] = df["trade_usd_thousands"] / 1000.0

    out = (df.groupby(["asean_country", "year",
                       "partner_iso3", "partner_group", "asean_role",
                       "mineral_label", "mineral_class", "end_use", "hs6"])
           [["value_usd_millions", "qty_tons"]].sum().reset_index())

    out = out[["asean_country", "year", "partner_iso3", "partner_group",
               "asean_role", "mineral_class", "mineral_label", "end_use", "hs6",
               "value_usd_millions", "qty_tons"]]
    out = out.sort_values(["asean_country", "year", "mineral_class", "partner_group"]).reset_index(drop=True)

    out.to_csv(OUT, index=False)
    print(f"Wrote {OUT}: {len(out)} rows")

    print("\nIndonesia 2024 nickel-class exports by partner_group + end_use ($M):")
    idn = out[(out["asean_country"] == "IDN") & (out["year"] == 2024) &
              (out["mineral_class"] == "Nickel") & (out["asean_role"] == "exporter")]
    pivot = idn.pivot_table(index="partner_group", columns="end_use",
                            values="value_usd_millions", aggfunc="sum").fillna(0).round(0)
    pivot["TOTAL"] = pivot.sum(axis=1)
    print(pivot.sort_values("TOTAL", ascending=False).to_string())

    print("\nASEAN nickel exports total by year ($B):")
    yr = out[(out["mineral_class"] == "Nickel") & (out["asean_role"] == "exporter")]
    print((yr.groupby("year")["value_usd_millions"].sum() / 1000).round(2).to_string())


if __name__ == "__main__":
    main()
