# UN General Assembly Voting — Scout
Scouted: 2026-04-25

## 1. Primary Source — Bailey-Strezhnev-Voeten (BSV) Ideal Points

**Canonical (new DOI):** https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ
**Legacy persistent ID (still resolves):** https://dataverse.harvard.edu/dataset.xhtml?persistentId=hdl:1902.1/12379
**Voeten data page (Georgetown):** https://erikvoeten.georgetown.domains/data/
**GitHub (code + raw):** https://github.com/evoeten/United-Nations-General-Assembly-Votes-and-Ideal-Points

**Latest update:** July 2025. **First version organized by calendar year, not session.** Coverage 1946–2024 (UNGA 79th).

## 2. Files

| File | Use | Size |
|---|---|---|
| `IdealPointsJuly2025.tab` | **Primary — ideal-point panel, year-indexed** | 2–5 MB |
| `UNVotes.Rdata` | Raw vote-by-resolution-by-country | 50–100 MB |
| `AgreementScoresAll_*.csv` | Dyadic agreement scores (verify July 2025 equivalent) | small |

**Two ideal-point series:**
- `idealpointfp` — final-passage votes only; updated most reliably
- `idealpointall` — all procedural + final votes
- Correlation r = 0.9846. Use `idealpointfp` for the visualization.
- Legacy session-based `idealpointlegacy` retained.

## 3. Auth

Harvard Dataverse free account required for download. Guest browsing = metadata only.

## 4. Tooling

**R package `unvotes` (CRAN, July 2025 update):** wraps BSV in tidy tables — `un_votes`, `un_roll_calls`, `un_roll_call_issues`. **Easiest path for ASEAN subsetting** without parsing `.Rdata`.
https://cran.r-project.org/web/packages/unvotes/unvotes.pdf

## 5. Companion Sources

**US State Dept "Voting Practices of UN Members" — annual PDF**
- 2024 report: https://www.state.gov/wp-content/uploads/2025/07/Voting-Practices-in-the-United-Nations-for-2024.pdf
- 2023 report: https://www.state.gov/wp-content/uploads/2024/10/Voting-Practices-of-UN-Members_2023-Report.pdf
- **Fast path for US-alignment % per country** including all ASEAN-10. Use as sanity-check against ideal-point distance.

**Dreher-Sturm UNGA affinity dataset:** https://axel-dreher.de/wp-content/uploads/UNGAvoting.xls — 1970–2008 only. **Outdated for 2010–2024 window.** Skip.

**Federal Reserve FEDS Note (Mar 2025):** https://www.federalreserve.gov/econres/notes/feds-notes/fragmentation-revisiting-the-ideal-point-distance-measure-of-geopolitical-distance-20250321.html — confirms BSV is field standard but flags **48% of countries change "blocs" depending on vote subset + time window**. Direct warning for infographic framing.

## 6. Filter Strategy

Subset to ISO3: `BRN, KHM, IDN, LAO, MYS, MMR, PHL, SGP, THA, VNM` + `USA, CHN, RUS` + maybe `JPN, KOR, IND, AUS`.

Compute:
- **% same vote with USA/CHN/RUS** per country-year (from `UNVotes.Rdata` via `DyadicAgreementScores.R`)
- **Ideal-point distance to USA/CHN** using `idealpointfp` (from `IdealPointsJuly2025.tab`)
- Cross-check ideal-point results vs. State Dept coincidence % for sanity check

## 7. ASEAN Voting Signal Patterns (cite-ready context)

- **Ukraine 2022 ES-11/1:** 8 of 10 ASEAN voted Yes (Brunei, Cambodia, Indonesia, Malaysia, Myanmar-NUG, Philippines, Singapore, Thailand). **Vietnam + Laos abstained.**
- **Ukraine 2025 reaffirmation:** pattern held — cautious support or abstention, not monolithic.
- **Palestine/Gaza:** ASEAN votes near-unanimously as bloc → poor discriminator for US-vs-CN alignment.
- **Russia annexation resolution (Oct 2022):** Most ASEAN voted Yes, breaking from China's abstention → genuine divergence signal.
- BRI membership + defense ties with Russia = strongest predictors of ASEAN abstention on Ukraine votes (Bruegel analysis).

## 8. Gotchas

1. **Abstention treatment:** `idealpointfp` treats abstentions as partial agreement (between yes/no). Agreement-score approaches vary (exclude vs. half-vote). State the definition in the chart.
2. **Myanmar seat post-2021:** UNGA credentials committee deferred junta claim Dec 2022. Ambassador Kyaw Moe Tun (NUG-aligned) holds the seat. **Myanmar's UNGA votes 2021–2024 reflect NUG diplomatic stance (pro-Western on Ukraine), NOT the junta's position.** Flag explicitly in infographic — country governance ≠ UN seat representation.
3. **Bloc vs. independent voting:** use Ukraine resolutions to expose fault lines; avoid Palestine resolutions for great-power alignment claims.
4. **Session vs. year indexing:** pre-July 2025 versions were session-indexed. New year-indexed version is cleaner for merging with economic panel data.

## 9. Next action

1. Register Harvard Dataverse account
2. Download `IdealPointsJuly2025.tab` to this dir
3. R: `install.packages("unvotes")` for tidy access to votes
4. Build per-ASEAN-country annual series: `idealpoint_distance_USA`, `idealpoint_distance_CHN`, `pct_same_vote_USA`, `pct_same_vote_CHN`
5. Save derived → `un-voting-asean-alignment-2010-2024.csv`
