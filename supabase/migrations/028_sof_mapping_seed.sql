-- Seed canonical SOF events from current code mappings
insert into public.sof_canonical_events (id, label, keywords, confidence, created_at, updated_at)
select
  t->>'id' as id,
  coalesce(t->>'label', t->>'id') as label,
  coalesce(ARRAY(SELECT jsonb_array_elements_text(t->'keywords')), '{}') as keywords,
  (t->>'confidence')::numeric as confidence,
  now(),
  now()
from jsonb_array_elements(
$json$
[
  {
    "id": "NAV_EOSP",
    "label": "NAV_EOSP",
    "confidence": 0.7,
    "keywords": [
      "e\\.?o\\.?s\\.?p\\.?",
      "end of sea passage",
      "arrival at pilot station",
      "arrival at port limits"
    ]
  },
  {
    "id": "NAV_NOR_TENDERED",
    "label": "NAV_NOR_TENDERED",
    "confidence": 0.7,
    "keywords": [
      "nor tendered",
      "notice of readiness tendered",
      "n\\.?o\\.?r\\.? presented",
      "nor t\\/d",
      "tendered nor"
    ]
  },
  {
    "id": "NAV_NOR_ACCEPTED",
    "label": "NAV_NOR_ACCEPTED",
    "confidence": 0.7,
    "keywords": [
      "nor accepted",
      "notice of readiness accepted",
      "nor signed",
      "n\\.?o\\.?r\\.?\\s*a\\/c"
    ]
  },
  {
    "id": "NAV_ANCHOR_DROP",
    "label": "NAV_ANCHOR_DROP",
    "confidence": 0.8,
    "keywords": [
      "dropped anchor",
      "anchor(ed)?\\s?(dropped|let go)",
      "\\banchored at\\b",
      "\\blet go (port|stbd)?\\s*anchor"
    ]
  },
  {
    "id": "NAV_ANCHOR_AWEIGH",
    "label": "NAV_ANCHOR_AWEIGH",
    "confidence": 0.8,
    "keywords": [
      "anchor aweigh",
      "heaved up anchor",
      "anchor up",
      "commenced heaving anchor",
      "anchor clear of water"
    ]
  },
  {
    "id": "NAV_PILOT_ON_ARR",
    "label": "NAV_PILOT_ON_ARR",
    "confidence": 0.8,
    "keywords": [
      "pob",
      "pilot on board",
      "pilot boarded",
      "pilot embarked"
    ]
  },
  {
    "id": "NAV_TUGS_MADE_FAST",
    "label": "NAV_TUGS_MADE_FAST",
    "confidence": 0.7,
    "keywords": [
      "tugs?\\s+(fast|made fast)",
      "tug lines fast",
      "tug connected"
    ]
  },
  {
    "id": "NAV_FIRST_LINE",
    "label": "NAV_FIRST_LINE",
    "confidence": 0.7,
    "keywords": [
      "first line",
      "1st line ashore",
      "spring line ashore"
    ]
  },
  {
    "id": "NAV_ALL_FAST",
    "label": "NAV_ALL_FAST",
    "confidence": 0.9,
    "keywords": [
      "all fast",
      "all lines fast",
      "\\bmoored\\b",
      "berthed all fast",
      "\\bf\\.?w\\.?e\\.?\\b",
      "finished with engines",
      "fast at berth"
    ]
  },
  {
    "id": "OPS_GANGWAY_DOWN",
    "label": "OPS_GANGWAY_DOWN",
    "confidence": 0.7,
    "keywords": [
      "gangway down",
      "gangway lowered",
      "gangway secured",
      "access ladder down"
    ]
  },
  {
    "id": "AUTH_FREE_PRATIQUE",
    "label": "AUTH_FREE_PRATIQUE",
    "confidence": 0.7,
    "keywords": [
      "free pratique",
      "health clearance",
      "pratique received",
      "quarantine cleared"
    ]
  },
  {
    "id": "AUTH_CUSTOMS_ON",
    "label": "AUTH_CUSTOMS_ON",
    "confidence": 0.6,
    "keywords": [
      "customs onboard",
      "immigration onboard",
      "authorities onboard",
      "boarding party onboard"
    ]
  },
  {
    "id": "AUTH_CLEARED_INWARD",
    "label": "AUTH_CLEARED_INWARD",
    "confidence": 0.6,
    "keywords": [
      "customs cleared",
      "inward clearance",
      "formalities completed",
      "clearance granted"
    ]
  },
  {
    "id": "PREP_HATCH_OPEN",
    "label": "PREP_HATCH_OPEN",
    "confidence": 0.7,
    "keywords": [
      "hatches?\\s+opened",
      "hatch covers opened",
      "uncovered hatches"
    ]
  },
  {
    "id": "PREP_HATCH_CLOSE",
    "label": "PREP_HATCH_CLOSE",
    "confidence": 0.7,
    "keywords": [
      "hatches?\\s+closed",
      "hatch covers closed",
      "covered hatches"
    ]
  },
  {
    "id": "SURVEY_DRAFT_INITIAL",
    "label": "SURVEY_DRAFT_INITIAL",
    "confidence": 0.75,
    "keywords": [
      "initial draft survey",
      "draft survey commenced",
      "joint draft survey"
    ]
  },
  {
    "id": "SURVEY_HOLD_INSP",
    "label": "SURVEY_HOLD_INSP",
    "confidence": 0.65,
    "keywords": [
      "hold inspection",
      "holds passed",
      "holds failed",
      "holds accepted",
      "cleanliness inspection",
      "tank inspection"
    ]
  },
  {
    "id": "CARGO_OPS_START",
    "label": "CARGO_OPS_START",
    "confidence": 0.8,
    "keywords": [
      "commenced loading",
      "commenced discharging",
      "start (loading|discharge)",
      "cargo ops started",
      "commenced cargo operations",
      "using loader"
    ]
  },
  {
    "id": "CARGO_OPS_STOP",
    "label": "CARGO_OPS_STOP",
    "confidence": 0.75,
    "keywords": [
      "stopped loading",
      "stopped discharging",
      "ceased cargo",
      "suspended cargo",
      "cargo ops stopped"
    ]
  },
  {
    "id": "CARGO_OPS_RESUME",
    "label": "CARGO_OPS_RESUME",
    "confidence": 0.75,
    "keywords": [
      "resumed loading",
      "resumed discharging",
      "recommenced cargo",
      "restarted cargo ops"
    ]
  },
  {
    "id": "CARGO_OPS_COMPLETE",
    "label": "CARGO_OPS_COMPLETE",
    "confidence": 0.75,
    "keywords": [
      "completed loading",
      "completed discharging",
      "cargo completed",
      "finished cargo",
      "loading finish",
      "discharge finish"
    ]
  },
  {
    "id": "DELAY_WEATHER",
    "label": "DELAY_WEATHER",
    "confidence": 0.7,
    "keywords": [
      "rain\\b",
      "bad weather",
      "adverse weather",
      "suspended due to rain",
      "high winds",
      "heavy swell",
      "monsoon",
      "precipitation"
    ]
  },
  {
    "id": "DELAY_MAINTENANCE",
    "label": "DELAY_MAINTENANCE",
    "confidence": 0.7,
    "keywords": [
      "crane breakdown",
      "gear failure",
      "maintenance",
      "winch problem",
      "shore crane breakdown",
      "grab repair",
      "mechanical delay",
      "belt",
      "feeder"
    ]
  },
  {
    "id": "DELAY_STEVEDORE",
    "label": "DELAY_STEVEDORE",
    "confidence": 0.65,
    "keywords": [
      "stevedore",
      "gangs",
      "shift change",
      "meal break",
      "union meeting",
      "awaiting stevedores"
    ]
  },
  {
    "id": "DELAY_WAIT_CARGO",
    "label": "DELAY_WAIT_CARGO",
    "confidence": 0.65,
    "keywords": [
      "awaiting cargo",
      "no trucks",
      "awaiting trucks",
      "awaiting barges",
      "wait cargo",
      "silo empty"
    ]
  },
  {
    "id": "OPS_SHIFTING_START",
    "label": "OPS_SHIFTING_START",
    "confidence": 0.6,
    "keywords": [
      "commenced shifting",
      "shifting berth",
      "warping commenced",
      "move to anchorage"
    ]
  },
  {
    "id": "OPS_SHIFTING_END",
    "label": "OPS_SHIFTING_END",
    "confidence": 0.6,
    "keywords": [
      "completed shifting",
      "shifting finished",
      "fast alongside new berth",
      "all fast after shifting"
    ]
  },
  {
    "id": "AUX_BUNKER_START",
    "label": "AUX_BUNKER_START",
    "confidence": 0.65,
    "keywords": [
      "bunkering started",
      "commenced bunkering",
      "hose connected fuel",
      "taking bunkers"
    ]
  },
  {
    "id": "AUX_BUNKER_STOP",
    "label": "AUX_BUNKER_STOP",
    "confidence": 0.65,
    "keywords": [
      "bunkering completed",
      "finished bunkering",
      "hose disconnected fuel",
      "bunkers received"
    ]
  },
  {
    "id": "AUX_BALLAST_START",
    "label": "AUX_BALLAST_START",
    "confidence": 0.6,
    "keywords": [
      "commenced de-ballasting",
      "commenced ballasting",
      "start ballast ops",
      "pumping ballast"
    ]
  },
  {
    "id": "AUX_BALLAST_STOP",
    "label": "AUX_BALLAST_STOP",
    "confidence": 0.6,
    "keywords": [
      "completed de-ballasting",
      "completed ballasting",
      "ballast tanks dry",
      "stop ballast ops"
    ]
  },
  {
    "id": "AUX_FUMIGATION",
    "label": "AUX_FUMIGATION",
    "confidence": 0.6,
    "keywords": [
      "fumigation",
      "fumigators onboard",
      "tablets applied",
      "recirculation fans on"
    ]
  },
  {
    "id": "SURVEY_SAMPLING",
    "label": "SURVEY_SAMPLING",
    "confidence": 0.6,
    "keywords": [
      "sampling commenced",
      "sampling completed",
      "surveyors sampling",
      "samples taken"
    ]
  },
  {
    "id": "SURVEY_DRAFT_FINAL",
    "label": "SURVEY_DRAFT_FINAL",
    "confidence": 0.75,
    "keywords": [
      "final draft survey",
      "draft survey completed",
      "cargo figures agreed"
    ]
  },
  {
    "id": "PREP_LASHING",
    "label": "PREP_LASHING",
    "confidence": 0.6,
    "keywords": [
      "lashing",
      "securing cargo",
      "dunnage removal",
      "unlashing"
    ]
  },
  {
    "id": "PREP_HATCH_SEAL",
    "label": "PREP_HATCH_SEAL",
    "confidence": 0.6,
    "keywords": [
      "hatches sealed",
      "sealing hatches",
      "seals applied",
      "security seals fixed"
    ]
  },
  {
    "id": "NAV_DOCS_ONBOARD",
    "label": "NAV_DOCS_ONBOARD",
    "confidence": 0.6,
    "keywords": [
      "documents onboard",
      "bill of lading signed",
      "paperwork completed",
      "mate receipt signed"
    ]
  },
  {
    "id": "NAV_PILOT_ON_DEP",
    "label": "NAV_PILOT_ON_DEP",
    "confidence": 0.7,
    "keywords": [
      "pilot onboard.*departure",
      "pob departure",
      "pilot boarded for sailing"
    ]
  },
  {
    "id": "NAV_CAST_OFF",
    "label": "NAV_CAST_OFF",
    "confidence": 0.7,
    "keywords": [
      "cast off",
      "unberthed",
      "last line",
      "lines let go",
      "singled up",
      "all lines clear"
    ]
  },
  {
    "id": "NAV_PILOT_OFF",
    "label": "NAV_PILOT_OFF",
    "confidence": 0.7,
    "keywords": [
      "pilot off",
      "pilot disembarked",
      "pilot left vessel",
      "drop pilot"
    ]
  },
  {
    "id": "NAV_COSP",
    "label": "NAV_COSP",
    "confidence": 0.7,
    "keywords": [
      "c\\.?o\\.?s\\.?p\\.?",
      "commencement of sea passage",
      "full away",
      "\\bsailing\\b",
      "departure from port limits"
    ]
  },
  {
    "id": "ARRIVAL_PILOT_STATION",
    "label": "ARRIVAL_PILOT_STATION",
    "confidence": 0.6,
    "keywords": [
      "pilot station",
      "\\barrived\\b"
    ]
  },
  {
    "id": "PILOT_ON_BOARD",
    "label": "PILOT_ON_BOARD",
    "confidence": 0.8,
    "keywords": [
      "pilot on board",
      "\\bpilot boarded\\b",
      "\\bpilot on\\b"
    ]
  },
  {
    "id": "ANCHOR_DROPPED",
    "label": "ANCHOR_DROPPED",
    "confidence": 0.8,
    "keywords": [
      "anchor(ed)?\\s?(dropped|let go)",
      "\\bat anchor\\b"
    ]
  },
  {
    "id": "ANCHOR_AWEIGH",
    "label": "ANCHOR_AWEIGH",
    "confidence": 0.8,
    "keywords": [
      "anchor aweigh",
      "\\bweighed anchor\\b"
    ]
  },
  {
    "id": "ALL_FAST",
    "label": "ALL_FAST",
    "confidence": 0.9,
    "keywords": [
      "all fast",
      "\\balongside\\b",
      "\\bberthed\\b"
    ]
  },
  {
    "id": "GANGWAY_SECURED",
    "label": "GANGWAY_SECURED",
    "confidence": 0.7,
    "keywords": [
      "gangway\\s+(secured|in position)"
    ]
  },
  {
    "id": "HATCHES_OPENED",
    "label": "HATCHES_OPENED",
    "confidence": 0.7,
    "keywords": [
      "hatches?\\s+(opened|open)",
      "holds?\\s+opened"
    ]
  },
  {
    "id": "HATCHES_CLOSED",
    "label": "HATCHES_CLOSED",
    "confidence": 0.7,
    "keywords": [
      "hatches?\\s+(closed|sealed)",
      "holds?\\s+sealed"
    ]
  },
  {
    "id": "DRAFT_SURVEY_START",
    "label": "DRAFT_SURVEY_START",
    "confidence": 0.75,
    "keywords": [
      "draft survey (commenced|started|initial)"
    ]
  },
  {
    "id": "DRAFT_SURVEY_END",
    "label": "DRAFT_SURVEY_END",
    "confidence": 0.75,
    "keywords": [
      "draft survey (completed|finished|final)"
    ]
  },
  {
    "id": "INSPECTION_START",
    "label": "INSPECTION_START",
    "confidence": 0.6,
    "keywords": [
      "(inspection|survey)\\s+(commenced|started)"
    ]
  },
  {
    "id": "INSPECTION_END",
    "label": "INSPECTION_END",
    "confidence": 0.6,
    "keywords": [
      "(inspection|survey)\\s+(completed|finished)"
    ]
  },
  {
    "id": "LOADING_START",
    "label": "LOADING_START",
    "confidence": 0.8,
    "keywords": [
      "loading\\s+(commenced|started)",
      "\\bload(ing)?\\s*commenced\\b"
    ]
  },
  {
    "id": "LOADING_STOP",
    "label": "LOADING_STOP",
    "confidence": 0.8,
    "keywords": [
      "loading\\s+suspended",
      "loading\\s+stoppage",
      "high winds.*loading",
      "\\bstopped loading\\b"
    ]
  },
  {
    "id": "LOADING_RESUME",
    "label": "LOADING_RESUME",
    "confidence": 0.8,
    "keywords": [
      "loading\\s+resumed"
    ]
  },
  {
    "id": "DISCHARGE_START",
    "label": "DISCHARGE_START",
    "confidence": 0.75,
    "keywords": [
      "discharge\\s+(commenced|started)"
    ]
  },
  {
    "id": "DISCHARGE_STOP",
    "label": "DISCHARGE_STOP",
    "confidence": 0.75,
    "keywords": [
      "discharge\\s+(stopped|suspended)"
    ]
  },
  {
    "id": "DISCHARGE_RESUME",
    "label": "DISCHARGE_RESUME",
    "confidence": 0.75,
    "keywords": [
      "discharge\\s+resumed"
    ]
  },
  {
    "id": "SHIFTING_START",
    "label": "SHIFTING_START",
    "confidence": 0.6,
    "keywords": [
      "shifting\\s+commenced",
      "shift(ed|ing)\\s+to\\b"
    ]
  },
  {
    "id": "SHIFTING_END",
    "label": "SHIFTING_END",
    "confidence": 0.6,
    "keywords": [
      "shifting\\s+completed"
    ]
  },
  {
    "id": "DEPART_PILOT_ON_BOARD",
    "label": "DEPART_PILOT_ON_BOARD",
    "confidence": 0.7,
    "keywords": [
      "pilot on board.*departure",
      "pilot boarded.*depart"
    ]
  },
  {
    "id": "CAST_OFF",
    "label": "CAST_OFF",
    "confidence": 0.7,
    "keywords": [
      "cast off",
      "let go (lines|ropes)",
      "unberthed"
    ]
  },
  {
    "id": "DEPARTED",
    "label": "DEPARTED",
    "confidence": 0.8,
    "keywords": [
      "\\bsailed\\b",
      "\\bdeparted\\b",
      "underway"
    ]
  }
]
$json$
) as t;
