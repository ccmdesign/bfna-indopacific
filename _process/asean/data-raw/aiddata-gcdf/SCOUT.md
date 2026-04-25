# AidData GCDF 3.0 — Scout Report
Scouted: 2026-04-24

## 1. Best Download URL

**Release page:** https://www.aiddata.org/data/aiddatas-global-chinese-development-finance-dataset-version-3-0
**Direct ZIP:** https://docs.aiddata.org/ad4/datasets/AidDatas_Global_Chinese_Development_Finance_Dataset_Version_3_0.zip
No registration required. Free public download.

## 2. File Size and Format

ZIP contains XLSX (one row per project) + codebook + README.
~20,985 project rows × 126 columns.
Estimated size: 10–25 MB. Verify with:

```bash
curl -I "https://docs.aiddata.org/ad4/datasets/AidDatas_Global_Chinese_Development_Finance_Dataset_Version_3_0.zip"
```

## 3. Auth Required

None.

## 4. Coverage

- **Years:** 2000–2021 (commitment year) — exactly the needed window
- **Countries:** 165 low- and middle-income countries
- **ASEAN confirmed:** Indonesia, Vietnam, Thailand, Malaysia, Cambodia, Laos, Myanmar, Philippines (all LMI at some point 2000–2021)
- **ASEAN likely absent:** Singapore, Brunei — both high-income throughout the window. TUFF methodology excludes always-high-income countries. Verify by checking unique `Recipient` values after download.

## 5. Key Fields (exact XLSX column names from AidData config.ini)

| Column | Use |
|---|---|
| `Recipient` | Country name — ASEAN filter anchor |
| `Recipient ISO-3` | ISO-3 code — safer for joins |
| `Commitment Year` | Year axis (2000–2021) |
| `Amount (Constant USD 2021)` | **Primary financial field — constant 2021 USD** |
| `Flow Class` | "ODA-like" / "OOF-like" / "Vague [Official Finance]" |
| `Sector Name` / `AidData Sector Name` | Sector classification |
| `Funding Agencies` | Lender/implementing agency (ExIm, CDB, etc.) |
| `Umbrella` | TRUE = umbrella agreement (exclude from sums) |
| `Recommended For Aggregates` | YES = safe to sum — master filter |
| `Status` | Commitment / Implementation / Completion / Pledge |

**No current-USD column.** All amounts constant 2021 USD. Label infographic accordingly.

## 6. Filter Strategy

```python
ASEAN = ["Indonesia", "Vietnam", "Thailand", "Malaysia",
         "Cambodia", "Laos", "Myanmar", "Philippines"]

df = df[df["Recommended For Aggregates"] == "Yes"]   # drops umbrellas, pledges, cancelled
df = df[df["Recipient"].isin(ASEAN)]
totals = (df.groupby(["Recipient", "Commitment Year"])
            ["Amount (Constant USD 2021)"].sum().reset_index())
```

## 7. Gotchas

1. **Umbrella double-counting (critical):** Framework agreement rows + sub-project rows both exist. `Recommended For Aggregates = Yes` excludes umbrellas — apply FIRST.
2. **Pledges inflate totals:** Status filter handled by aggregates flag but understand the reason.
3. **Debt forgiveness overlap:** Rescheduling rows may duplicate original loan. Check `Flow Class` sub-types.
4. **Sector taxonomy break:** Labels changed between GCDF 2.0 and 3.0. Don't trend across versions on `Sector Name`.
5. **Null amounts (~30%):** In-kind, TA, scholarships pass aggregates filter with null amount. Treat as $0 or log + exclude — don't silently drop.
6. **Singapore/Brunei gap:** Real data gap for ASEAN narrative. Flag in footnotes.

## 8. Download Commands

```bash
cd _process/asean/data-raw/aiddata-gcdf

curl -I "https://docs.aiddata.org/ad4/datasets/AidDatas_Global_Chinese_Development_Finance_Dataset_Version_3_0.zip"

curl -L -o GCDF_3_0.zip \
  "https://docs.aiddata.org/ad4/datasets/AidDatas_Global_Chinese_Development_Finance_Dataset_Version_3_0.zip"

unzip GCDF_3_0.zip
```

## Sources

- Release page: https://www.aiddata.org/data/aiddatas-global-chinese-development-finance-dataset-version-3-0
- How-to: https://www.aiddata.org/pages/how-to-use-global-chinese-official-finance-data
- Field names (config.ini): https://github.com/aiddata/gcdf-geospatial-data/blob/main/config.ini
- R package: https://t-emery.github.io/chinadevfin3/
- TUFF 3.0 methodology: https://docs.aiddata.org/ad4/pdfs/AidData_TUFF_methodology_3_0.pdf
