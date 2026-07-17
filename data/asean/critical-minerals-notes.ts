// Critical-minerals fact-card copy for the seven countries where the nickel
// flow chart (CountryMineralFlowBand) is not meaningful (BF-97, Feedback 2).
// The nickel chart stays only for Indonesia, Malaysia, Vietnam and the
// Philippines — see NICKEL_CHART_SLUGS in AseanInfographic.vue. These seven
// slugs render CountryCrmBox in the same CardFlip back-face slot instead.
//
// Copy is client-provided (verbatim, light copy-edit for style only — no
// Oxford comma). Each entry is split at the client's own "lead clause:
// supporting detail(s)" pattern into a bold `leadIn` + supporting `lines`.

export interface CrmNote {
  /** Short bold statement — rendered as the card's lead line. */
  leadIn: string
  /** Supporting sentences, rendered as short lines under the lead-in. */
  lines: string[]
  /** Short citation, matching the plain-text "Source: X" style used by
   *  every other CountryChartCard on this tab (never a hyperlink). */
  source?: string
}

export const CRM_NOTES_BY_SLUG: Record<string, CrmNote> = {
  thailand: {
    leadIn: 'Thailand-U.S. Critical Minerals MoU',
    lines: [
      'Thailand committed to give U.S. companies the first opportunity to invest in Thai critical-mineral assets.'
    ]
  },

  singapore: {
    leadIn: 'Not a producer, but a key supply-chain hub',
    lines: [
      'Hub for high-tech materials, recycling and resilient supply chains.',
      'Supports diversification through trade, stockpiling, regional partnerships and the U.S.-led Pax Silica initiative.'
    ]
  },

  brunei: {
    leadIn: 'Not a critical-minerals producer at scale',
    lines: [
      'Aims to grow the sector, especially as it diversifies its energy sources to renewables.'
    ]
  },

  cambodia: {
    leadIn: 'Not a producer, but trying to grow the sector',
    lines: [
      'Strong subsoil potential across both metallic and industrial minerals.',
      'Cambodia offers a competitive fiscal regime for mining investors.'
    ]
  },

  laos: {
    leadIn: 'Not a producer at scale, but deepening Laos-China cooperation',
    lines: [
      '2017 Minerals Law, banning rare earth extraction, under revision.',
      'Chinese rail, road and SEZ investments driving raw material exports to China.',
      'Chinese JV to focus on rare earth exploration in Laos.'
    ]
  },

  myanmar: {
    leadIn: 'Deepening Myanmar-China cooperation',
    lines: [
      "Myanmar accounted for about 57% of China's total rare earth imports last year."
    ],
    source: 'Heinrich Böll Stiftung Southeast Asia, 2026'
  },

  timor_leste: {
    leadIn: 'Not a producer at scale, but deepening ties with Australia',
    lines: [
      'Four of five mining leases were awarded to Australian companies.'
    ]
  }
}
