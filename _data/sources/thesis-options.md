---
title: "ASEAN Infographic — Thesis Options"
type: project
status: active
created: 2026-04-10
updated: 2026-04-10
tags: [bfna, infographic, asean, thesis, brainstorm]
---

# ASEAN infographic — thesis options

**Status:** Draft for discussion with Marshall Reid and Georgia (BFNA). Not yet decided.

**Context:** This is the third piece in a three-infographic BFNA engagement. The [2026-04-07 Marshall call](../../../admin/meeting-notes/) surfaced multiple candidate directions but no locked thesis. Marshall explicitly asked for "your AI magic" and said he'd send trade + investment data for us to work with. Target ship: May 2026.

**Editorial north star (Marshall's framing, repeated throughout the call):** *"Why should Washington, DC care about the Indo-Pacific?"* — especially about ASEAN specifically, which he says DC is just waking up to as strategically critical. All four theses below are ways of answering this question. They are not mutually exclusive in content, but they *are* mutually exclusive as the **headline** — the thing the reader walks away remembering.

**Data grounding:** Every thesis below is scoped against the verified dataset catalogue at [data-sources.md](data-sources.md). If the data for a given thesis doesn't exist in that catalogue, the thesis is flagged as risky. None of these require commercial or paywalled sources for V1.

---

## Thesis A — "ASEAN is the new US–China fault line"

**The claim:** ASEAN countries are being actively pulled apart by three gravitational forces (US, China, EU). The region is no longer neutral ground — it is the primary arena where great-power economic competition is being fought, and individual ASEAN countries are sorting themselves along that spectrum whether they like it or not.

**Why it's compelling:** This is the version closest to Marshall's explicit framing in the call. He kept coming back to *"they don't really want to pick a side, but China's really present, the US is really present"* and talked about finding a way to visualize *"where the tension is, where things are pulling apart."* DC audiences understand this frame immediately. It also lets the infographic double as an editorial statement of ASEAN's strategic importance.

**Data needed (all verified in catalogue):**
- **UNCTAD FDI Statistics** — bilateral FDI flows and stocks, US/China/EU → each ASEAN country, over time
- **CEPII BACI** or **UN Comtrade** — bilateral trade flows showing trade-partner shifts 2010–2024
- **ASEANstats FDI** — the regional bilateral matrices
- **AidData GCDF 3.0** + **China Global Investment Tracker** — Chinese engagement (essential to pair these two, since neither alone captures the full picture)
- **OECD FDI BMD4** — US/EU/Japan side of the same flows, properly filtered for SPE distortion
- **World Bank WDI** — GDP baselines for normalization

**Visual treatment (2 strong options):**
- **Ternary plot** — each ASEAN country is a dot inside a triangle with US, China, EU at the corners. Position reflects relative economic ties (trade + FDI). A **year scrubber (2010–2024)** animates the dots drifting — which countries are moving toward China, which toward US, which are holding steady. This is the "pulling things apart" visualization Marshall implicitly described. Ternary plots are also visually unusual enough to be screenshot-worthy.
- **Stacked area "loyalty" chart per country** — for each of the top 5 ASEAN economies, a small-multiple stacked area chart showing the US / China / EU share of their economic linkages over time. The reader can see Vietnam drifting one way, Cambodia another, Indonesia hedging.

**Strengths:**
- Matches Marshall's stated preference for "showing things over time rather than static pictures"
- Clean single-image hero shot (the ternary plot)
- Directly answers "why should DC care"
- Data is fully available from free sources

**Risks / tradeoffs:**
- Risks flattening countries into a 1-D "US vs China" frame when the reality is more complex (e.g., India, Japan, Korea, and intra-ASEAN matter too)
- Ternary plots are unfamiliar to many readers — may need explanation panel
- BFNA is under Bertelsmann Stiftung guardrails; framing must avoid hard-security framings (OK per call constraints)

---

## Thesis B — "The West's green transition runs through ASEAN"

**The claim:** Europe and America cannot hit their 2030 or 2050 climate targets without ASEAN. The energy transition depends on a handful of minerals (nickel, cobalt, rare earths, tin, bauxite) where ASEAN countries — especially Indonesia, Philippines, Malaysia, and Myanmar — hold overwhelming global supply shares. This is a dependency story, and the West has built almost no leverage against it.

**Why it's compelling:** This is the story Georgia originally pitched ("critical raw materials for each country") and the one Claudio reframed as a layer of the map. It has a concrete, quantifiable answer ("Indonesia holds ~50% of global nickel production"), a strong single image (supply flows from ASEAN to US/EU/China), and immediate policy relevance under the EU Critical Raw Materials Act and US DOE Critical Materials Strategy.

**Data needed (all verified in catalogue):**
- **USGS Mineral Commodity Summaries 2026** — world production and reserves by country for nickel, cobalt, tin, rare earths, bauxite, copper
- **IEA Critical Minerals Data Explorer + Global Critical Minerals Outlook 2025** — demand projections and clean-energy-sector share (IEA: ~90% of recent nickel supply growth came from Indonesia alone)
- **Chatham House Resource Trade Earth** — bilateral flows of natural resources (reconciled Comtrade) — this dataset is literally the kind of visualization we'd build
- **Our World in Data Minerals Explorer** — clean CSVs for charting
- **BGS World Mineral Production 2019–2023** — long historical context
- **OECD Inventory of Export Restrictions 2025** — to show Indonesia's nickel ban in context (restrictions up 5× since 2009)
- **Indonesia ESDM** — the 2025 RKAB quota story (120 million tonne cut, ESDM Regulation 17/2025)
- **EU Critical Raw Materials Act** — EU's own 17-strategic-material list as the editorial frame
- **Malaysia JMG** — for the Lynas rare-earths angle (main non-Chinese source of separated heavy REEs)

**Visual treatment:**
- **Flow map (Sankey or bezier arcs)** — ASEAN countries on one side, US/EU/China/Japan/Korea on the other, with flow widths proportional to mineral volumes. Different colors for each mineral class (battery minerals, REEs, tin, bauxite, etc.). Click a country to see *which* materials dominate its exports and *what they enable* in the importing country (e.g., nickel → batteries → EV range).
- **Dependency gauge per mineral** — small dials showing "% of EU demand that depends on ASEAN" for each strategic mineral. The reader sees instantly which materials are bottlenecked through the region.

**Strengths:**
- The hardest-hitting single number you can cite is probably in this thesis (Indonesia's nickel share)
- Naturally frames ASEAN as indispensable rather than marginal
- Data is exceptionally strong here — minerals production is one of the better-measured things in global statistics
- Connects to policy debates already happening in DC and Brussels

**Risks / tradeoffs:**
- Risks reducing ASEAN to a commodity story, erasing its role as a complex set of economies and societies
- Narrower audience (climate/industrial policy) than a pure strategic frame
- May under-emphasize the US–China dynamic that Marshall kept circling back to
- Some materials (Myanmar tin, Myanmar REEs) require Chinese customs mirror data because source-country data is unreliable — flag this

---

## Thesis C — "Local conflicts here are global proxy wars"

**The claim:** ASEAN looks like a region of localized disputes — Cambodia vs Thailand, South China Sea, Myanmar civil war, India–Pakistan spillover, Korean Peninsula. But each of these flashpoints is entangled with great-power money, arms, and influence. Nothing here is actually local anymore. Every conflict has US or China (or both) standing behind it.

**Why it's compelling:** This was Marshall's most animated moment in the call — "there's no such thing as a localized conflict anymore." It is also the most **original** of the four theses. Most ASEAN explainers don't connect local flashpoints to great-power flows. A "click a conflict → see the proxy war behind it" interaction would be genuinely fresh.

**Data needed (partial coverage — this thesis has the biggest data gap):**
- **SIPRI Military Expenditure Database** — *not in the current catalogue, needs a separate research pass*
- **ACLED (Armed Conflict Location & Event Data Project)** — *not in current catalogue*
- **UN General Assembly voting patterns** (Voeten/Dreher datasets) — *not in current catalogue*
- National defense budgets via SIPRI — *not in current catalogue*
- AidData (for military aid where tracked) — **in catalogue**
- OECD DAC CRS (for Western development + security assistance) — listed in "worth verifying"

**Editorial constraint (from call):** BFNA is structurally limited on hard security. No weapons-system detail, no troop counts. Defense *spending* and broad strategic framing are OK. This thesis sits close to that line and needs careful framing to stay on BFNA's side of it.

**Visual treatment:**
- **Force diagram / relationship map** — conflicts as nodes in the center of a map, with links fanning out to the primary parties (ASEAN countries) and the secondary parties (US, China, Russia) behind them. Click a conflict to reveal the "how much money / aid / influence is flowing in" breakdown.
- **Two-layer map** — Layer 1: conflict hotspots visible as red pins across Southeast Asia. Layer 2: toggle to reveal the flows of defense spending, military aid, and strategic investment behind each pin.

**Strengths:**
- The most original of the four theses
- The most visually memorable (relationship diagrams connecting conflicts to great powers)
- Marshall's personal interest is clearly here

**Risks / tradeoffs:**
- **Data gap is significant.** The catalogue doesn't yet cover SIPRI, ACLED, or UN voting — would need a second research pass (we had this as "topic 6 + 7" in the original plan)
- BFNA editorial guardrails are most restrictive here — risk of writing something that gets edited down post-delivery
- Harder to tell without caricaturing: "US vs China proxy war" framing can sound reductive if the data doesn't support it cleanly
- May not be shippable by May if it needs fresh data gathering
- Conflict-layer UX is a different visual language from country-dashboard UX — combining both in one piece is UX-expensive

**Recommendation if picked:** Run it as a follow-up (piece #4, a bonus or standalone) rather than cramming it into the current May deliverable.

---

## Thesis D — "ASEAN is quietly hedging"

**The claim:** Despite all the pressure, ASEAN countries are *not* picking sides. They're hedging — deepening ties with China economically while maintaining strategic relationships with the US, and now actively courting the EU as a third pole. The visible story is drift; the invisible story is a coherent regional strategy. Southeast Asia isn't being pulled apart — it's *choosing* its own equilibrium.

**Why it's compelling:** This is the most editorially sophisticated of the four theses, and arguably the most *true* read of what ASEAN is actually doing. It inverts the "fault line" frame (Thesis A) by saying: the drift isn't a symptom of weakness, it's a deliberate strategy. Readers walk away with a more nuanced view of ASEAN agency.

**Data needed (all verified in catalogue):**
- **UNCTAD FDI + ASEANstats FDI** — to show bilateral flows growing in *multiple* directions simultaneously (not zero-sum)
- **CEPII BACI** — to show trade diversification, not trade concentration
- **AidData GCDF 3.0** + **China Global Investment Tracker** — Chinese engagement growing
- **BEA + Eurostat + JETRO + Korea Eximbank** — Western and Asian engagement also growing (not declining)
- **World Bank WDI** — GDP/population for normalization
- **OECD DAC CRS** (flagged as worth verifying) — to compare Western concessional finance vs Chinese state lending growth rates

**The key visualization insight:** If Thesis A is "which direction is country X being pulled," Thesis D is "all of country X's ties are growing — the story is *multidimensional* growth, not zero-sum competition." That's a totally different chart.

**Visual treatment:**
- **Multi-line growth chart per country** — for each ASEAN country, plot the 2010–2024 growth in trade + FDI with US, China, EU, Japan on the same panel. The reader sees all lines going up, not competing — "hedging" made literal. Small-multiples across 5–10 countries.
- **"Portfolio" stacked bar** — each country's economic-relationship "portfolio" shown as a stacked bar at multiple time slices, like an investment portfolio. ASEAN countries are *diversifying* their partner mix, not concentrating it.

**Strengths:**
- Most intellectually defensible — matches what ASEAN scholars say about the region
- The data strongly supports this story (ASEAN trade + FDI with nearly all major partners has grown, not shrunk)
- Gives BFNA a distinctive POV rather than repeating the DC consensus
- Shippable with existing data

**Risks / tradeoffs:**
- Less viscerally dramatic than Thesis A (fault line) or B (green transition dependency)
- Harder headline — "ASEAN is hedging" doesn't have the gut-punch of "the EU's climate future runs through Indonesia"
- Could be read as "nothing is changing," which would be a misread but is a risk
- The hero visual is less obvious than for A or B

---

## Cross-thesis comparison

| Dimension | A — Fault Line | B — Green Transition | C — Proxy Wars | D — Hedging |
|---|---|---|---|---|
| **Data readiness (V1 by May)** | ✅ Ready | ✅ Ready | ⚠ Needs more data | ✅ Ready |
| **Editorial fit (BFNA guardrails)** | ✅ | ✅ | ⚠ Tight | ✅ |
| **Originality** | Medium | Medium–High | **Highest** | High |
| **Single-image hero shot** | ✅ Ternary plot | ✅ Flow map | ✅ Relationship diagram | Harder |
| **Time-over-time fit** (what Marshall loves) | ✅ Strong | Medium | Medium | ✅ Strongest |
| **DC policy resonance** | ✅ Direct | ✅ Direct | ✅ Direct | Medium |
| **Intellectual defensibility** | Medium | High | Medium | **Highest** |
| **Risk of caricature** | Medium | Low | **High** | Low |

---

## Recommendation framework (for the next Marshall conversation)

Three ways this could play out:

**Option 1 — Pick one cleanly.** My instinct is that **Thesis A (Fault Line)** is the safest choice and closest to Marshall's stated preferences, but **Thesis B (Green Transition)** has the strongest single data point and the most screenshot-worthy hero. Either is shippable by May.

**Option 2 — Stack them (A as headline, B and D as supporting layers).** Frame the piece as "ASEAN is the new fault line" (A), then use critical minerals (B) as evidence of *why it matters*, and show the hedging pattern (D) as a counter-intuitive footnote. This is the most editorially rich version but also the most scope-expensive.

**Option 3 — Split into two pieces.** Use V1 (May) for Thesis A or B, and pitch Thesis C (Proxy Wars) as a follow-up project. This gives BFNA two pieces for the price of one conversation and keeps each thesis clean.

**My take:** Option 2 is the most ambitious but risks scope blowout for May. Option 3 is the most realistic. **If I had to bet, I'd pitch Thesis A as the May deliverable with a single Thesis-B layer (critical minerals as supporting evidence), and save Thesis C for a follow-up pitch.** That's one clean headline, one layer of supporting depth, and a clear handoff for the next project.

---

## What Marshall needs to decide

1. **Which thesis is the headline?** (pick one, even if others are layered in)
2. **How many countries?** 5 (top economies — Thailand, Indonesia, Singapore, Malaysia, Vietnam) or all 11? Marshall floated both during the call. 5 is safer for May given data gaps in Laos/Myanmar/Timor-Leste.
3. **Is Thesis C worth scoping as a separate follow-up project?** (My read: yes)
4. **Are we waiting for Georgia's data before locking the thesis, or locking the thesis first and using her data to support it?** Order matters — if data comes first, we may drift toward what's easiest to visualize rather than what's most editorially sharp.
