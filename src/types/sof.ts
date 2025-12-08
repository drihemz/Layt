export type SofBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SofEvent = {
  id?: string;
  event: string;
  from_datetime?: string;
  to_datetime?: string;
  event_type?: "instant" | "duration";
  canonical_event?: SofCanonicalEvent | null;
  canonical_confidence?: number | null;
  page?: number | null;
  line?: number | null;
  bbox?: SofBoundingBox;
  confidence?: number | null;
  warnings?: string[];
  notes?: string | null;
  raw_label?: string | null;
  /** Compatibility: raw OCR values that may appear in responses */
  start?: string;
  end?: string;
  ratePercent?: number | null;
  behavior?: string | null;
  portCallName?: string | null;
};

export type SofCanonicalEvent =
  // Navigation / NOR / Pilotage
  | "NAV_EOSP"
  | "NAV_NOR_TENDERED"
  | "NAV_NOR_ACCEPTED"
  | "NAV_ANCHOR_DROP"
  | "NAV_ANCHOR_AWEIGH"
  | "NAV_PILOT_ON_ARR"
  | "NAV_TUGS_MADE_FAST"
  | "NAV_FIRST_LINE"
  | "NAV_ALL_FAST"
  | "NAV_DOCS_ONBOARD"
  | "NAV_PILOT_ON_DEP"
  | "NAV_CAST_OFF"
  | "NAV_PILOT_OFF"
  | "NAV_COSP"
  // Operations / Access
  | "OPS_GANGWAY_DOWN"
  // Authorities / Clearance
  | "AUTH_FREE_PRATIQUE"
  | "AUTH_CUSTOMS_ON"
  | "AUTH_CLEARED_INWARD"
  // Prep / Hatches
  | "PREP_HATCH_OPEN"
  | "PREP_HATCH_CLOSE"
  | "PREP_HATCH_SEAL"
  | "PREP_LASHING"
  // Surveys / Inspections / Sampling
  | "SURVEY_DRAFT_INITIAL"
  | "SURVEY_DRAFT_FINAL"
  | "SURVEY_HOLD_INSP"
  | "SURVEY_SAMPLING"
  // Cargo operations
  | "CARGO_OPS_START"
  | "CARGO_OPS_STOP"
  | "CARGO_OPS_RESUME"
  | "CARGO_OPS_COMPLETE"
  // Delays
  | "DELAY_WEATHER"
  | "DELAY_MAINTENANCE"
  | "DELAY_STEVEDORE"
  | "DELAY_WAIT_CARGO"
  // Shifting
  | "OPS_SHIFTING_START"
  | "OPS_SHIFTING_END"
  // Aux ops
  | "AUX_BUNKER_START"
  | "AUX_BUNKER_STOP"
  | "AUX_BALLAST_START"
  | "AUX_BALLAST_STOP"
  | "AUX_FUMIGATION"
  // Legacy/base set (kept for compatibility)
  | "ARRIVAL_PILOT_STATION"
  | "PILOT_ON_BOARD"
  | "ANCHOR_DROPPED"
  | "ANCHOR_AWEIGH"
  | "ALL_FAST"
  | "GANGWAY_SECURED"
  | "HATCHES_OPENED"
  | "HATCHES_CLOSED"
  | "DRAFT_SURVEY_START"
  | "DRAFT_SURVEY_END"
  | "INSPECTION_START"
  | "INSPECTION_END"
  | "LOADING_START"
  | "LOADING_STOP"
  | "LOADING_RESUME"
  | "DISCHARGE_START"
  | "DISCHARGE_STOP"
  | "DISCHARGE_RESUME"
  | "SHIFTING_START"
  | "SHIFTING_END"
  | "DEPART_PILOT_ON_BOARD"
  | "CAST_OFF"
  | "DEPARTED";

export type SofSummary = {
  port_name?: string | null;
  terminal?: string | null;
  vessel_name?: string | null;
  imo?: string | null;
  cargo_name?: string | null;
  cargo_quantity?: string | number | null;
  laycan_start?: string | null;
  laycan_end?: string | null;
  operation_type?: string | null;
  raw?: unknown;
};

export type SofMeta = {
  sourcePages?: number;
  durationMs?: number;
  filteredOutCount?: number;
  confidenceFloor?: number;
};

export type SofExtractResponse = {
  events: SofEvent[];
  filtered_out?: SofEvent[];
  warnings?: string[];
  error?: string;
  meta?: SofMeta;
  summary?: SofSummary | null;
  raw?: unknown;
};
