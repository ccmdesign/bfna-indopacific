# ACLED — Armed Conflict Location & Event Data — Scout
Scouted: 2026-04-25

## 1. Source

**Landing:** https://acleddata.com/
**API docs:** https://acleddata.com/api-documentation/acled-endpoint
**Coverage:** https://acleddata.com/methodology/countrytime-period-coverage

## 2. Access

**Registration:** Free at https://acleddata.com/user/register. No tiered data caps for free academic/journalism account — gated by registration, not payment. Self-serve OAuth, immediate turnaround. Use org-affiliated email (not Gmail) for any institutional benefits.

**Bulk export:** Export Tool in myACLED portal. API + export both require registered account.

## 3. API Pattern

OAuth password flow. POST credentials to `https://acleddata.com/oauth/token` → Bearer token. No static API key.

```
GET https://acleddata.com/api/acled/read.csv
  ?country=Myanmar|Philippines|Indonesia|Thailand|Cambodia
  &year_where=BETWEEN
  &year=2018|2024
  &event_type=Battles|Explosions%2FRemote+violence|Violence+against+civilians
  &admin1=Sagaing|Mandalay
  &limit=5000
  &page=1
```

Pipe `|` separates multiple values per filter. Paginate by `&page=N` until rows < limit. Default page = 5,000.

## 4. ASEAN Coverage 2018+

| Country | Start | 2018+ Complete? |
|---|---|---|
| Myanmar | Jan 2010 | Yes (gaps Aug 2021–Feb 2023 documented) |
| Thailand | Jan 2010 | Yes |
| Vietnam | Jan 2010 | Yes (source-bias) |
| Cambodia | Jan 2010 | Yes |
| Laos | Jan 2010 | Yes (source-bias) |
| Indonesia | Jan 2015 | Yes |
| Philippines | Jan 2016 | Yes |
| Malaysia | Jan 2018 | Yes (starts at window open) |
| Singapore | Jan 2020 | Partial — no 2018–2019 |
| Brunei | Jan 2020 | Partial — no 2018–2019 |

## 5. Key Fields

`event_id_cnty | event_date | year | event_type | sub_event_type | country | admin1 | admin2 | admin3 | location | latitude | longitude | fatalities | actor1 | assoc_actor_1 | actor2 | assoc_actor_2 | inter1 | inter2 | source | notes`

## 6. Relevant Event Types

- **Battles** (armed clash, territorial change)
- **Explosions/Remote violence** (air/drone strike, shelling, IED)
- **Violence against civilians**
- **Strategic developments** (HQ established, agreement)
- Protests + Riots — secondary, useful for political-unrest dimension

## 7. Filter Strategy Per Flashpoint

| Flashpoint | country= | admin1= |
|---|---|---|
| Myanmar civil war | Myanmar | Sagaing\|Mandalay\|Chin\|Kachin\|Shan\|Kayah\|Kayin |
| Mindanao | Philippines | Bangsamoro |
| Papua | Indonesia | Papua\|Papua Pegunungan\|Papua Selatan\|Papua Tengah |
| Thai South | Thailand | Pattani\|Yala\|Narathiwat\|Songkhla |
| Cambodia-Thailand border | Cambodia\|Thailand | omit (border spans) |
| India-Pakistan spillover | (no ASEAN anchor — separate API call to PAK/IND) | |

## 8. Size Estimate

ASEAN 2018–2024 unfiltered: 80,000–150,000 rows. ~500 B/row → 40–75 MB uncompressed. Post-flashpoint filter: 20,000–40,000 rows.

## 9. Gotchas

- **South China Sea:** ACLED only codes maritime incidents in named land-territory jurisdiction OR with fatality. Open-water harassment, water cannon, laser = NOT captured. Use **CSIS AMTI** or **ICAS** databases as complement.
- **Cyber + economic coercion:** explicitly outside ACLED scope.
- **Source bias:** Vietnam, Laos rely on state media → opposition violence under-reported. Cambodia similar post-2018.
- **Myanmar data gap:** confirmed Aug 2021–Feb 2023 incomplete; resistance-group activity being retrospectively incorporated.
- **Myanmar volume spike:** post-coup (Feb 2021) events 5–10× pre-coup. Will visually dominate per-year intensity charts unless normalized.
- **Actor disambiguation:** "China" as proxy-war backer won't appear in `actor1`/`actor2`. Cross-reference `assoc_actor` + `notes` text for great-power involvement signals.

## 10. License

Non-commercial use free with registration. Attribution required on visualizations: "ACLED" + link to acleddata.com directly on graphic. Cannot redistribute raw data. Infographic = transformative derivative work, permitted.

## 11. Companion (for South China Sea)

- **CSIS Asia Maritime Transparency Initiative (AMTI):** https://amti.csis.org/ — fills ACLED's South China Sea gap
- **ICAS** (Institute for China-America Studies) — secondary

## 12. Next action

1. Register at https://acleddata.com/user/register
2. Test OAuth flow with a single Myanmar 2024 query to validate token + filter syntax
3. Bulk-pull 2018–2024 ASEAN flashpoints, save to `_process/asean/data-raw/acled-conflict/asean-flashpoints-2018-2024.csv`
