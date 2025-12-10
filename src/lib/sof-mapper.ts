import { SofCanonicalEvent } from "@/types/sof";

export type SofMapping = { keywords: RegExp[]; canonical: SofCanonicalEvent; confidence: number };

export const canonicalMappings: SofMapping[] = [
  {
    canonical: "NAV_EOSP",
    confidence: 0.7,
    keywords: [
      /e\.?o\.?s\.?p\.?/i,
      /end of sea passage/i,
      /arrival at pilot station/i,
      /arrival at port limits/i,
      /arrived (at|off) pilot station/i,
      /arrived at (outer )?anchorage/i,
    ],
  },
  { canonical: "NAV_NOR_TENDERED", confidence: 0.7, keywords: [/nor tendered/i, /notice of readiness tendered/i, /n\.?o\.?r\.? presented/i, /nor t\/d/i, /tendered nor/i] },
  { canonical: "NAV_NOR_ACCEPTED", confidence: 0.7, keywords: [/nor accepted/i, /notice of readiness accepted/i, /nor signed/i, /n\.?o\.?r\.?\s*a\/c/i] },
  { canonical: "NAV_ANCHOR_DROP", confidence: 0.8, keywords: [/dropped anchor/i, /anchor(ed)?\s?(dropped|let go)/i, /\banchored at\b/i, /\blet go (port|stbd)?\s*anchor/i] },
  { canonical: "NAV_ANCHOR_AWEIGH", confidence: 0.8, keywords: [/anchor aweigh/i, /heaved up anchor/i, /anchor up/i, /commenced heaving anchor/i, /anchor clear of water/i] },
  {
    canonical: "NAV_PILOT_ON_ARR",
    confidence: 0.8,
    keywords: [
      /pob/i,
      /p\.?o\.?b\.?/i,
      /pilot on board/i,
      /pilot boarded/i,
      /pilot embarked/i,
      /pilot arrival/i,
    ],
  },
  { canonical: "NAV_TUGS_MADE_FAST", confidence: 0.7, keywords: [/tugs?\s+(fast|made fast)/i, /tug lines fast/i, /tug connected/i, /tugs? secured/i] },
  { canonical: "NAV_FIRST_LINE", confidence: 0.7, keywords: [/first line/i, /1st line ashore/i, /spring line ashore/i] },
  {
    canonical: "NAV_ALL_FAST",
    confidence: 0.9,
    keywords: [/all fast/i, /all lines fast/i, /\bmoored\b/i, /berthed all fast/i, /\bf\.?w\.?e\.?\b/i, /finished with engines/i, /fast at berth/i, /alongside berth/i],
  },
  { canonical: "OPS_GANGWAY_DOWN", confidence: 0.7, keywords: [/gangway down/i, /gangway lowered/i, /gangway secured/i, /access ladder down/i] },
  { canonical: "AUTH_FREE_PRATIQUE", confidence: 0.7, keywords: [/free pratique/i, /health clearance/i, /pratique received/i, /quarantine cleared/i] },
  { canonical: "AUTH_CUSTOMS_ON", confidence: 0.6, keywords: [/customs onboard/i, /immigration onboard/i, /authorities onboard/i, /boarding party onboard/i] },
  { canonical: "AUTH_CLEARED_INWARD", confidence: 0.6, keywords: [/customs cleared/i, /inward clearance/i, /formalities completed/i, /clearance granted/i] },
  { canonical: "PREP_HATCH_OPEN", confidence: 0.7, keywords: [/hatches?\s+opened/i, /hatch covers opened/i, /uncovered hatches/i] },
  { canonical: "PREP_HATCH_CLOSE", confidence: 0.7, keywords: [/hatches?\s+closed/i, /hatch covers closed/i, /covered hatches/i] },
  { canonical: "SURVEY_DRAFT_INITIAL", confidence: 0.75, keywords: [/initial draft survey/i, /draft survey commenced/i, /joint draft survey/i] },
  { canonical: "SURVEY_HOLD_INSP", confidence: 0.65, keywords: [/hold inspection/i, /holds passed/i, /holds failed/i, /holds accepted/i, /cleanliness inspection/i, /tank inspection/i] },
  {
    canonical: "CARGO_OPS_START",
    confidence: 0.8,
    keywords: [
      /commenced loading/i,
      /commenced discharging/i,
      /start (loading|discharge)/i,
      /cargo ops started/i,
      /commenced cargo operations/i,
      /using loader/i,
      /loading operations commenced/i,
      /cargo operations commenced/i,
      /loading resumed from stop/i,
    ],
  },
  {
    canonical: "CARGO_OPS_STOP",
    confidence: 0.75,
    keywords: [
      /stopped loading/i,
      /stopped discharging/i,
      /ceased cargo/i,
      /suspended cargo/i,
      /cargo ops stopped/i,
      /cargo operations suspended/i,
      /loading suspended/i,
      /discharging suspended/i,
    ],
  },
  {
    canonical: "CARGO_OPS_RESUME",
    confidence: 0.75,
    keywords: [
      /resumed loading/i,
      /resumed discharging/i,
      /recommenced cargo/i,
      /restarted cargo ops/i,
      /cargo operations resumed/i,
      /loading resumed/i,
      /discharging resumed/i,
    ],
  },
  { canonical: "CARGO_OPS_COMPLETE", confidence: 0.75, keywords: [/completed loading/i, /completed discharging/i, /cargo completed/i, /finished cargo/i, /loading finish/i, /discharge finish/i] },
  { canonical: "DELAY_WEATHER", confidence: 0.7, keywords: [/rain\b/i, /bad weather/i, /adverse weather/i, /suspended due to rain/i, /high winds/i, /heavy swell/i, /monsoon/i, /precipitation/i] },
  { canonical: "DELAY_MAINTENANCE", confidence: 0.7, keywords: [/crane breakdown/i, /gear failure/i, /maintenance/i, /winch problem/i, /shore crane breakdown/i, /grab repair/i, /mechanical delay/i, /belt/i, /feeder/i] },
  { canonical: "DELAY_STEVEDORE", confidence: 0.65, keywords: [/stevedore/i, /gangs/i, /shift change/i, /meal break/i, /union meeting/i, /awaiting stevedores/i] },
  { canonical: "DELAY_WAIT_CARGO", confidence: 0.65, keywords: [/awaiting cargo/i, /no trucks/i, /awaiting trucks/i, /awaiting barges/i, /wait cargo/i, /silo empty/i] },
  { canonical: "OPS_SHIFTING_START", confidence: 0.6, keywords: [/commenced shifting/i, /shifting berth/i, /warping commenced/i, /move to anchorage/i] },
  { canonical: "OPS_SHIFTING_END", confidence: 0.6, keywords: [/completed shifting/i, /shifting finished/i, /fast alongside new berth/i, /all fast after shifting/i] },
  { canonical: "AUX_BUNKER_START", confidence: 0.65, keywords: [/bunkering started/i, /commenced bunkering/i, /hose connected fuel/i, /taking bunkers/i] },
  { canonical: "AUX_BUNKER_STOP", confidence: 0.65, keywords: [/bunkering completed/i, /finished bunkering/i, /hose disconnected fuel/i, /bunkers received/i] },
  { canonical: "AUX_BALLAST_START", confidence: 0.6, keywords: [/commenced de-?ballasting/i, /commenced ballasting/i, /start ballast ops/i, /pumping ballast/i] },
  { canonical: "AUX_BALLAST_STOP", confidence: 0.6, keywords: [/completed de-?ballasting/i, /completed ballasting/i, /ballast tanks dry/i, /stop ballast ops/i] },
  { canonical: "AUX_FUMIGATION", confidence: 0.6, keywords: [/fumigation/i, /fumigators onboard/i, /tablets applied/i, /recirculation fans on/i] },
  { canonical: "SURVEY_SAMPLING", confidence: 0.6, keywords: [/sampling commenced/i, /sampling completed/i, /surveyors sampling/i, /samples taken/i] },
  { canonical: "SURVEY_DRAFT_FINAL", confidence: 0.75, keywords: [/final draft survey/i, /draft survey completed/i, /cargo figures agreed/i] },
  { canonical: "PREP_LASHING", confidence: 0.6, keywords: [/lashing/i, /securing cargo/i, /dunnage removal/i, /unlashing/i] },
  { canonical: "PREP_HATCH_SEAL", confidence: 0.6, keywords: [/hatches sealed/i, /sealing hatches/i, /seals applied/i, /security seals fixed/i] },
  { canonical: "NAV_DOCS_ONBOARD", confidence: 0.6, keywords: [/documents onboard/i, /bill of lading signed/i, /paperwork completed/i, /mate receipt signed/i] },
  { canonical: "NAV_PILOT_ON_DEP", confidence: 0.7, keywords: [/pilot onboard.*departure/i, /pob departure/i, /pilot boarded for sailing/i] },
  { canonical: "NAV_CAST_OFF", confidence: 0.7, keywords: [/cast off/i, /unberthed/i, /last line/i, /lines let go/i, /singled up/i, /all lines clear/i] },
  { canonical: "NAV_PILOT_OFF", confidence: 0.7, keywords: [/pilot off/i, /pilot disembarked/i, /pilot left vessel/i, /drop pilot/i] },
  { canonical: "NAV_COSP", confidence: 0.7, keywords: [/c\.?o\.?s\.?p\.?/i, /commencement of sea passage/i, /full away/i, /\bsailing\b/i, /departure from port limits/i] },
  // Legacy/base mappings for compatibility
  { canonical: "ARRIVAL_PILOT_STATION", confidence: 0.6, keywords: [/pilot station/i, /\barrived\b/i] },
  { canonical: "PILOT_ON_BOARD", confidence: 0.8, keywords: [/pilot on board/i, /\bpilot boarded\b/i, /\bpilot on\b/i] },
  { canonical: "ANCHOR_DROPPED", confidence: 0.8, keywords: [/anchor(ed)?\s?(dropped|let go)/i, /\bat anchor\b/i] },
  { canonical: "ANCHOR_AWEIGH", confidence: 0.8, keywords: [/anchor aweigh/i, /\bweighed anchor\b/i] },
  { canonical: "ALL_FAST", confidence: 0.9, keywords: [/all fast/i, /\balongside\b/i, /\bberthed\b/i] },
  { canonical: "GANGWAY_SECURED", confidence: 0.7, keywords: [/gangway\s+(secured|in position)/i] },
  { canonical: "HATCHES_OPENED", confidence: 0.7, keywords: [/hatches?\s+(opened|open)/i, /holds?\s+opened/i] },
  { canonical: "HATCHES_CLOSED", confidence: 0.7, keywords: [/hatches?\s+(closed|sealed)/i, /holds?\s+sealed/i] },
  { canonical: "DRAFT_SURVEY_START", confidence: 0.75, keywords: [/draft survey (commenced|started|initial)/i] },
  { canonical: "DRAFT_SURVEY_END", confidence: 0.75, keywords: [/draft survey (completed|finished|final)/i] },
  { canonical: "INSPECTION_START", confidence: 0.6, keywords: [/(inspection|survey)\s+(commenced|started)/i] },
  { canonical: "INSPECTION_END", confidence: 0.6, keywords: [/(inspection|survey)\s+(completed|finished)/i] },
  {
    canonical: "LOADING_START",
    confidence: 0.8,
    keywords: [/loading\s+(commenced|started)/i, /\bload(ing)?\s*commenced\b/i],
  },
  {
    canonical: "LOADING_STOP",
    confidence: 0.8,
    keywords: [/loading\s+suspended/i, /loading\s+stoppage/i, /high winds.*loading/i, /\bstopped loading\b/i],
  },
  { canonical: "LOADING_RESUME", confidence: 0.8, keywords: [/loading\s+resumed/i] },
  { canonical: "DISCHARGE_START", confidence: 0.75, keywords: [/discharge\s+(commenced|started)/i] },
  { canonical: "DISCHARGE_STOP", confidence: 0.75, keywords: [/discharge\s+(stopped|suspended)/i] },
  { canonical: "DISCHARGE_RESUME", confidence: 0.75, keywords: [/discharge\s+resumed/i] },
  { canonical: "SHIFTING_START", confidence: 0.6, keywords: [/shifting\s+commenced/i, /shift(ed|ing)\s+to\b/i] },
  { canonical: "SHIFTING_END", confidence: 0.6, keywords: [/shifting\s+completed/i] },
  { canonical: "DEPART_PILOT_ON_BOARD", confidence: 0.7, keywords: [/pilot on board.*departure/i, /pilot boarded.*depart/i] },
  { canonical: "CAST_OFF", confidence: 0.7, keywords: [/cast off/i, /let go (lines|ropes)/i, /unberthed/i] },
  { canonical: "DEPARTED", confidence: 0.8, keywords: [/\bsailed\b/i, /\bdeparted\b/i, /underway/i] },
];

export function mapCanonicalEvent(label: string): { canonical: SofCanonicalEvent | null; confidence: number | null } {
  if (!label) return { canonical: null, confidence: null };
  for (const m of canonicalMappings) {
    if (m.keywords.some((rx) => rx.test(label))) {
      return { canonical: m.canonical, confidence: m.confidence };
    }
  }
  return { canonical: null, confidence: null };
}
