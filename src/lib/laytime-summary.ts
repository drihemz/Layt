// Types are intentionally permissive so app-specific models can be passed in without casting.
export type LaytimeEvent = {
  id?: string;
  deduction_name?: string | null;
  from_datetime?: string | null;
  to_datetime?: string | null;
  rate_of_calculation?: number | null;
  time_used?: number | null;
  port_call_id?: string | null;
  [key: string]: any;
};

export type LaytimeClaim = {
  id: string;
  port_call_id?: string | null;
  reversible?: boolean | null;
  reversible_scope?: "all_ports" | "load_only" | "discharge_only" | string | null;
  reversible_pool_ids?: string[];
  laytime_start?: string | null;
  laytime_end?: string | null;
  load_discharge_rate?: number | null;
  load_discharge_rate_unit?: "per_hour" | "per_day" | "fixed_duration" | string | null;
  fixed_rate_duration_hours?: number | null;
  demurrage_rate?: number | null;
  despatch_rate_value?: number | null;
  despatch_type?: "percent" | "absolute" | null;
  voyages?: { cargo_quantity?: number | null };
  port_calls?: {
    id: string;
    port_name?: string | null;
    activity?: string | null;
    allowed_hours?: number | null;
    sequence?: number | null;
  }[];
  [key: string]: any;
};

export type SiblingSummary = {
  claim_id: string;
  port_call_id?: string | null;
  port_name?: string | null;
  activity?: string | null;
  allowed?: number | null;
  base_hours?: number | null;
  deductions?: number | null;
  used?: number | null;
};

export function buildStatementSnapshot({
  claim,
  events,
  siblings = [],
  manualDeductions = [],
  manualAdditions = [],
}: {
  claim: LaytimeClaim;
  events: LaytimeEvent[];
  siblings?: SiblingSummary[];
  manualDeductions?: LaytimeEvent[];
  manualAdditions?: LaytimeEvent[];
}) {
  const toNaiveUtc = (value?: string | null) => {
    if (!value) return NaN;
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      const [, y, mo, d, h, mi, s] = m;
      return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), s ? Number(s) : 0);
    }
    return new Date(value).getTime();
  };

  const scopeAllows = (activity?: string | null) => {
    if (!claim.reversible_scope || claim.reversible_scope === "all_ports") return true;
    if (claim.reversible_scope === "load_only") return activity === "load";
    if (claim.reversible_scope === "discharge_only") return activity === "discharge";
    return true;
  };

  const laytimeStart = claim.laytime_start ?? null;
  const laytimeEnd = claim.laytime_end ?? null;
  const allPorts = claim.port_calls || [];
  const scopedPorts = allPorts.filter((pc) => scopeAllows(pc.activity));

  const isInScope = (ev: LaytimeEvent) => {
    if (!claim.reversible) {
      if (claim.port_call_id) {
        return ev.port_call_id === claim.port_call_id || !ev.port_call_id;
      }
      return true; // no specific port_call_id on claim -> include all
    }
    const pc = allPorts.find((p) => p.id === ev.port_call_id);
    const act = pc?.activity;
    if (!act) return true;
    if (!claim.reversible_scope || claim.reversible_scope === "all_ports") return true;
    if (claim.reversible_scope === "load_only") return act === "load";
    if (claim.reversible_scope === "discharge_only") return act === "discharge";
    return true;
  };

  const scopedEvents = events.filter(isInScope);
  const scopedManualDeductions = (manualDeductions || []).filter(isInScope);
  const scopedManualAdditions = (manualAdditions || []).filter(isInScope);

  const deductionsByPort: Record<string, number> = {};
  const addHours = (key: string, hours: number) => {
    deductionsByPort[key] = (deductionsByPort[key] || 0) + hours;
  };

  // Auto deductions from events are currently disabled; we rely on manual deductions/additions only.
  scopedManualDeductions.forEach((ev) => addHours(ev.port_call_id || "unassigned", ev.time_used || 0));
  scopedManualAdditions.forEach((ev) => addHours(ev.port_call_id || "unassigned", -(ev.time_used || 0)));

  const totalDeductionsAll = Math.max(
    Object.values(deductionsByPort).reduce((a, b) => a + (b || 0), 0),
    0,
  );

  const baseSpanHours = (() => {
    if (laytimeStart && laytimeEnd) {
      const start = toNaiveUtc(laytimeStart);
      const end = toNaiveUtc(laytimeEnd);
      if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
        return (end - start) / 3600000;
      }
    }
    return 0;
  })();

  const scopedSiblings = siblings.filter((s) => scopeAllows(s.activity));
  const pooledIds = claim.reversible ? new Set<string>([claim.id, ...(claim.reversible_pool_ids || [])]) : new Set<string>();
  const pooledSelection =
    claim.reversible && pooledIds.size > 0
      ? scopedSiblings.filter((s) => pooledIds.has(s.claim_id))
      : [];
  const effectiveSiblings =
    claim.reversible && pooledSelection.length > 0 ? pooledSelection : scopedSiblings;

  const fallbackAllowed = (() => {
    const cargoQty = claim.voyages?.cargo_quantity || 0;
    if (!claim.load_discharge_rate || claim.load_discharge_rate <= 0) return 0;
    if (claim.load_discharge_rate_unit === "per_hour") return cargoQty / (claim.load_discharge_rate || 1);
    if (claim.load_discharge_rate_unit === "fixed_duration") return claim.fixed_rate_duration_hours || 0;
    return (cargoQty / (claim.load_discharge_rate || 1)) * 24;
  })();

  const primaryPort = claim.port_call_id ? allPorts.find((p) => p.id === claim.port_call_id) : allPorts[0];

  const totalAllowed = claim.reversible
    ? effectiveSiblings.length > 0
      ? Math.max(effectiveSiblings.reduce((acc, s) => acc + (s.allowed || 0), 0), 0)
      : fallbackAllowed
    : primaryPort && primaryPort.allowed_hours !== null && primaryPort.allowed_hours !== undefined
    ? Number(primaryPort.allowed_hours)
    : fallbackAllowed;

  const fallbackUsed = (() => {
    if (baseSpanHours > 0 && scopedEvents.length === 0 && scopedManualDeductions.length === 0 && scopedManualAdditions.length === 0) {
      return baseSpanHours; // no spans recorded; use pure laytime window
    }
    if (baseSpanHours > 0) {
      return Math.max(baseSpanHours - totalDeductionsAll, 0); // additions reduce deductions; cap at 0
    }
    return Math.max(totalDeductionsAll, 0);
  })();
  const onceOnDemurrage = baseSpanHours > 0 && totalAllowed !== null && totalAllowed >= 0 && baseSpanHours > totalAllowed;
  const usedWithRule = onceOnDemurrage ? baseSpanHours : fallbackUsed;

  const totalUsed = claim.reversible
    ? effectiveSiblings.length > 0
      ? Math.max(effectiveSiblings.reduce((acc, s) => acc + (s.used || 0), 0), 0)
      : usedWithRule
    : usedWithRule;

  const timeOver = totalAllowed - totalUsed;

  const demRate = claim.demurrage_rate || 0;
  const despatchRate =
    claim.despatch_type === "percent"
      ? demRate * ((claim.despatch_rate_value || 0) / 100)
      : claim.despatch_rate_value || 0;

  const demurrage = timeOver < 0 ? Math.abs(timeOver) * (demRate / 24) : 0;
  const despatch = timeOver > 0 ? timeOver * (despatchRate / 24) : 0;

  const breakdown = (() => {
    if (!claim.reversible) {
      return (claim.port_calls || []).map((pc) => {
        const bucket = deductionsByPort[pc.id] || 0;
        const used = baseSpanHours > 0 ? Math.max(baseSpanHours - bucket, 0) : bucket;
        const allowed =
          pc.allowed_hours !== null && pc.allowed_hours !== undefined ? Number(pc.allowed_hours) : null;
        const overUnder = allowed !== null ? (allowed || 0) - used : null;
        return {
          id: pc.id,
          label: pc.port_name || "Port",
          activity: pc.activity || "",
          allowed,
          used,
          deductions: bucket,
          base: baseSpanHours,
          overUnder,
          inScope: true,
          note: undefined as string | undefined,
        };
      });
    }

    const pooledPortIds = new Set(
      effectiveSiblings
        .map((s) => s.port_call_id)
        .filter((id): id is string => !!id),
    );
    const ordered = scopedPorts
      .filter((pc) => pooledPortIds.size === 0 || pooledPortIds.has(pc.id))
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    const rows = ordered.map((pc) => {
      const sibling =
        effectiveSiblings.find((s) => s.claim_id === claim.id && s.port_call_id === pc.id) ||
        effectiveSiblings.find((s) => s.port_call_id === pc.id) ||
        effectiveSiblings.find((s) => !s.port_call_id && (!s.activity || s.activity === pc.activity));
      if (!sibling) {
        return {
          id: pc.id,
          label: pc.port_name || "Port",
          activity: pc.activity || "",
          allowed: null as number | null,
          base: 0,
          deductions: 0,
          used: 0,
          inScope: true,
          overUnder: null as number | null,
          note: "Claim not created yet",
        };
      }
      const overUnder =
        sibling.allowed !== null && sibling.allowed !== undefined
          ? (sibling.allowed || 0) - (sibling.used || 0)
          : null;

      return {
        id: pc.id,
        label: pc.port_name || "Port",
        activity: pc.activity || "",
        allowed: sibling.allowed,
        base: sibling.base_hours,
        deductions: sibling.deductions,
        used: sibling.used,
        inScope: true,
        overUnder,
        note: undefined as string | undefined,
      };
    });

    if (deductionsByPort["unassigned"]) {
      rows.push({
        id: "unassigned",
        label: "Unassigned events",
        activity: "",
        allowed: null,
        base: 0,
        deductions: deductionsByPort["unassigned"],
        used: deductionsByPort["unassigned"],
        inScope: true,
        overUnder: null,
        note: undefined,
      });
    }
    return rows;
  })();

  return {
    totalAllowed,
    totalUsed,
    timeOver,
    onceOnDemurrage,
    demurrage,
    despatch,
    scopedEvents,
    breakdown,
    baseSpanHours,
    totalDeductionsAll,
    fallbackAllowed,
  };
}
