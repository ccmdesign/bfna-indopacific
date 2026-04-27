"""
Build asean-headline-stats.json — cite-ready numbers extracted from
wrangled CSVs + manual entries from policy/IEA/USGS sources.

Output format: nested JSON, grouped by thesis. Each stat is a dict with
{value, unit, year, source, note}.
"""
from pathlib import Path
import json
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
WRANGLED = ROOT / "data-wrangled"
OUT = WRANGLED / "asean-headline-stats.json"


def num(v): return float(v) if pd.notna(v) else None


def main():
    flows = pd.read_csv(WRANGLED / "asean-flows-yearly.csv")
    minerals_prod = pd.read_csv(WRANGLED / "asean-minerals-production.csv")
    minerals_flows = pd.read_csv(WRANGLED / "asean-minerals-flows.csv")
    defense = pd.read_csv(WRANGLED / "asean-defense-yearly.csv")
    norm = pd.read_csv(WRANGLED / "asean-normalization-wide.csv")

    H = {
        "_meta": {
            "compiled": "2026-04-27",
            "source_files": [
                "asean-normalization-wide.csv",
                "asean-flows-yearly.csv",
                "asean-minerals-production.csv",
                "asean-minerals-flows.csv",
                "asean-defense-yearly.csv",
            ],
            "purpose": "Cite-ready headlines for the BFNA ASEAN infographic. Use sparingly — one or two anchors per layer.",
        },
        "thesis_b_minerals": {},
        "thesis_a_d_flows": {},
        "thesis_c_defense": {},
        "policy_anchors": {},
    }

    # ---------- B: Minerals production headlines ----------
    def share(country_iso3, mineral, year=2025):
        s = minerals_prod[(minerals_prod["country_iso3"] == country_iso3) &
                          (minerals_prod["mineral"] == mineral) &
                          (minerals_prod["year"] == year)]
        if not len(s): return None
        r = s.iloc[0]
        return {
            "country": country_iso3,
            "mineral": mineral,
            "year": int(r["year"]),
            "production": num(r["production"]),
            "unit": r["unit"],
            "world_total": num(r["world_total"]),
            "share_of_world_pct": num(r["share_of_world_pct"]),
            "source": "USGS MCS2026",
        }

    H["thesis_b_minerals"]["indonesia_nickel_2025"]   = share("IDN", "Nickel")
    H["thesis_b_minerals"]["philippines_nickel_2025"] = share("PHL", "Nickel")
    H["thesis_b_minerals"]["indonesia_cobalt_2025"]   = share("IDN", "Cobalt")
    H["thesis_b_minerals"]["indonesia_tin_2025"]      = share("IDN", "Tin")
    H["thesis_b_minerals"]["myanmar_rare_earths_2025"]= share("MMR", "Rare Earths")

    # ASEAN-cumulative-share for nickel
    ni25 = minerals_prod[(minerals_prod["mineral"] == "Nickel") & (minerals_prod["year"] == 2025)]
    asean = {"BRN","KHM","IDN","LAO","MYS","MMR","PHL","SGP","THA","VNM"}
    asean_ni_share = ni25[ni25["country_iso3"].isin(asean)]["share_of_world_pct"].sum()
    H["thesis_b_minerals"]["asean_nickel_share_2025_pct"] = {
        "value": float(asean_ni_share), "unit": "%",
        "note": "Sum of Indonesia + Philippines (only ASEAN producers in MCS2026).",
        "source": "USGS MCS2026",
    }

    # Indonesia 2024 nickel exports total + by partner
    idn_ni_2024 = minerals_flows[(minerals_flows["asean_country"] == "IDN") &
                                  (minerals_flows["mineral_class"] == "Nickel") &
                                  (minerals_flows["asean_role"] == "exporter") &
                                  (minerals_flows["year"] == 2024)]
    by_pg = idn_ni_2024.groupby("partner_group")["value_usd_millions"].sum().to_dict()
    H["thesis_b_minerals"]["indonesia_nickel_exports_2024"] = {
        "total_usd_millions": float(idn_ni_2024["value_usd_millions"].sum()),
        "by_partner_group_usd_millions": {k: float(v) for k, v in by_pg.items()},
        "note": "All HS6 nickel-related products (ore, matte, sinter, refined, sulfate, ferronickel).",
        "source": "BACI HS07 V202601",
    }

    # ASEAN nickel exports growth
    asean_ni_yr = (minerals_flows[(minerals_flows["mineral_class"] == "Nickel") &
                                  (minerals_flows["asean_role"] == "exporter")]
                   .groupby("year")["value_usd_millions"].sum())
    H["thesis_b_minerals"]["asean_nickel_exports_growth"] = {
        "2010_usd_millions": float(asean_ni_yr.get(2010, 0)),
        "2024_usd_millions": float(asean_ni_yr.get(2024, 0)),
        "multiple": round(asean_ni_yr.get(2024, 0) / asean_ni_yr.get(2010, 1), 1),
        "source": "BACI HS07 V202601",
    }

    H["thesis_b_minerals"]["iea_nickel_growth_indonesia_share"] = {
        "value": 90, "unit": "%",
        "year_range": "2020–2024",
        "note": "Indonesia's share of global nickel supply *growth* during 2020–2024 (not stock share).",
        "source": "IEA Global Critical Minerals Outlook 2025, Executive Summary",
    }

    H["thesis_b_minerals"]["china_critical_minerals_refining_share"] = {
        "value": 70, "unit": "%",
        "scope": "19 of 20 minerals analysed",
        "year": 2024,
        "source": "IEA Global Critical Minerals Outlook 2025",
    }

    # ---------- A/D: Flow headlines ----------
    # Indonesia 2024 trade with China
    idn_chn_24 = flows[(flows["country_iso3"] == "IDN") & (flows["year"] == 2024) &
                       (flows["partner_group"] == "CHN") & (flows["metric"] == "trade_goods")]
    H["thesis_a_d_flows"]["indonesia_china_trade_2024"] = {
        "exports_usd_millions": float(idn_chn_24[idn_chn_24["direction"] == "asean_to_partner"]["value_usd_millions"].iloc[0]) if len(idn_chn_24[idn_chn_24["direction"] == "asean_to_partner"]) else None,
        "imports_usd_millions": float(idn_chn_24[idn_chn_24["direction"] == "partner_to_asean"]["value_usd_millions"].iloc[0]) if len(idn_chn_24[idn_chn_24["direction"] == "partner_to_asean"]) else None,
        "source": "BACI HS07 V202601",
    }

    # GCDF cumulative ASEAN
    gcdf = flows[flows["metric"] == "china_dev_finance"]
    H["thesis_a_d_flows"]["china_dev_finance_to_asean_2010_2021_usd_millions"] = {
        "total": float(gcdf[gcdf["year"].between(2010, 2021)]["value_usd_millions"].sum()),
        "top_3_recipients": gcdf[gcdf["year"].between(2010, 2021)]
                               .groupby("country_iso3")["value_usd_millions"].sum()
                               .sort_values(ascending=False).head(3).round(0).to_dict(),
        "unit": "USD millions, constant 2021 USD",
        "source": "AidData GCDF 3.0",
    }

    # Japan stock in Indonesia growth (JETRO)
    jpn_idn = flows[(flows["country_iso3"] == "IDN") &
                    (flows["partner_group"] == "JPN") &
                    (flows["metric"] == "fdi_position") &
                    (flows["source"] == "JETRO/BOJ")]
    H["thesis_a_d_flows"]["japan_indonesia_fdi_stock_growth"] = {
        "2010_usd_millions": float(jpn_idn[jpn_idn["year"] == 2010]["value_usd_millions"].iloc[0]) if len(jpn_idn[jpn_idn["year"] == 2010]) else None,
        "2024_usd_millions": float(jpn_idn[jpn_idn["year"] == 2024]["value_usd_millions"].iloc[0]) if len(jpn_idn[jpn_idn["year"] == 2024]) else None,
        "source": "JETRO/BOJ",
    }

    # ---------- C: Defense ----------
    def def_lookup(iso3, year, metric):
        s = defense[(defense["country_iso3"] == iso3) & (defense["year"] == year) & (defense["metric"] == metric)]
        return float(s["value"].iloc[0]) if len(s) else None

    H["thesis_c_defense"]["china_milex_2024_usd_millions"]   = def_lookup("CHN", 2024, "milex_constant_2024_usd_millions")
    H["thesis_c_defense"]["usa_milex_2024_usd_millions"]     = def_lookup("USA", 2024, "milex_constant_2024_usd_millions")
    H["thesis_c_defense"]["singapore_milex_share_gdp_2024_pct"] = def_lookup("SGP", 2024, "milex_share_of_gdp_pct")
    H["thesis_c_defense"]["myanmar_milex_share_gdp_2024_pct"]   = def_lookup("MMR", 2024, "milex_share_of_gdp_pct")
    H["thesis_c_defense"]["indonesia_milex_share_gdp_2024_pct"] = def_lookup("IDN", 2024, "milex_share_of_gdp_pct")
    H["thesis_c_defense"]["_source"] = "SIPRI Military Expenditure Database 2026 release (1949–2025)"

    # ---------- Policy anchors ----------
    H["policy_anchors"]["indonesia_esdm_17_2025_quota_cut"] = {
        "from_2024_quota_mt": 272,
        "to_2025_quota_mt": 150,
        "cut_mt": 122,
        "cut_pct": 44.85,
        "regulation": "ESDM Ministerial Regulation No. 17 of 2025",
        "effective_date": "2025-10-03",
        "source": "Carbon Credits, S&P Global, SMM Analysis",
    }

    H["policy_anchors"]["oecd_export_restrictions_growth_2009_2023"] = {
        "value": "more than fivefold",
        "value_x": 5.0,
        "scope": "Industrial raw materials, count of export restrictions",
        "source": "OECD Inventory of Export Restrictions on Industrial Raw Materials 2025",
    }

    H["policy_anchors"]["oecd_critical_minerals_restriction_share_2021_2023"] = {
        "cobalt_pct": 67,
        "rare_earths_pct": 46,
        "all_industrial_raw_materials_pct": 14,
        "source": "OECD Inventory 2025",
    }

    H["policy_anchors"]["eu_crma_2030_targets"] = {
        "extraction_pct": 10, "processing_pct": 40, "recycling_pct": 25,
        "max_share_one_third_country_pct": 65,
        "regulation": "Regulation (EU) 2024/1252",
        "in_force_date": "2024-05-23",
        "strategic_materials_count": 17,
        "source": "EUR-Lex",
    }

    H["policy_anchors"]["lynas_lamp_world_rare_earths_share"] = {
        "value_range_pct": [12, 15],
        "scope": "Lynas Malaysia LAMP processing share of global rare earths",
        "source": "Lynas FY2024 Annual Report",
    }

    OUT.write_text(json.dumps(H, indent=2, default=str))
    print(f"Wrote {OUT}")
    print(f"Top-level keys: {list(H.keys())}")
    print(f"\nIndonesia 2024 nickel exports total: ${H['thesis_b_minerals']['indonesia_nickel_exports_2024']['total_usd_millions']:,.0f}M")
    print(f"Indonesia 2024 nickel → CHN: ${H['thesis_b_minerals']['indonesia_nickel_exports_2024']['by_partner_group_usd_millions'].get('CHN', 0):,.0f}M")
    print(f"Indonesia 2024 nickel → USA: ${H['thesis_b_minerals']['indonesia_nickel_exports_2024']['by_partner_group_usd_millions'].get('USA', 0):,.0f}M")


if __name__ == "__main__":
    main()
