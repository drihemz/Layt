// Laytime engine scaffold (pure TS, no IO)
// Deterministic functions to be expanded with full rules (reversible, proration, cargo match, once-on-demurrage).

export type CalculationMethod = "STANDARD" | "REVERSIBLE" | "AVERAGE";

export interface EngineInput {
  voyage: any;
  cpList: any[]; // expected: charter_parties[]
  cargoes: any[]; // expected: cargoes[]
  portCalls: any[]; // expected: port_calls[]
  profile: any; // laytime_profiles (unused in basic calc)
  activities: any[]; // port_activities[]
  deductions: any[]; // port_deductions_additions[]
  method: CalculationMethod;
  scope?: "all_ports" | "load_only" | "discharge_only";
  reversibleGroups?: string[][];
  prorationPorts?: string[];
  cargoMatchGroups?: string[][];
}

export interface CargoPortResult {
  cargoId: string;
  portCallId: string;
  laytimeAllowedMinutes: number;
  laytimeUsedMinutes: number;
  deductionsMinutes: number;
  additionsMinutes: number;
  timeOnDemurrageMinutes: number;
  timeOnDespatchMinutes: number;
  reversibleGroupId?: string;
  prorateGroupId?: string;
  cargoMatchGroupId?: string;
}

export interface EngineResult {
  cargoPortRows: CargoPortResult[];
  totals: {
    timeAllowedMinutes: number;
    timeUsedMinutes: number;
    timeOnDemurrageMinutes: number;
    timeOnDespatchMinutes: number;
    demurrageAmount: number;
    despatchAmount: number;
  };
}

const MINUTES_PER_DAY = 1440;

function convertAllowed(cp: any, cargo: any): number {
  const val = Number(cp?.laytime_allowed_value || 0);
  if (!Number.isFinite(val) || val <= 0) return 0;
  const unit = cp?.laytime_allowed_unit;
  if (unit === "HOURS") return val * 60;
  if (unit === "DAYS") return val * MINUTES_PER_DAY;
  if (unit === "TONNES_PER_DAY") {
    const qty = Number(cargo?.quantity || 0);
    if (qty <= 0) return 0;
    const days = qty / val;
    return days * MINUTES_PER_DAY;
  }
  return 0;
}

function applyCountBehavior(durationMinutes: number, behavior: any): number {
  if (!Number.isFinite(durationMinutes)) return 0;
  if (!behavior || typeof behavior === "string") {
    if (behavior === "NONE") return 0;
    if (behavior === "HALF") return durationMinutes * 0.5;
    return durationMinutes;
  }
  if (typeof behavior === "object" && behavior.percent !== undefined) {
    const p = Number(behavior.percent);
    if (Number.isFinite(p)) return durationMinutes * (p / 100);
  }
  return durationMinutes;
}

function allowedForPort(port: any, cp: any, cargo: any): number {
  // If port has allowed_hours (current app behavior), use it (hours -> minutes)
  if (port && port.allowed_hours !== null && port.allowed_hours !== undefined) {
    const hours = Number(port.allowed_hours || 0);
    return Number.isFinite(hours) ? hours * 60 : 0;
  }
  return convertAllowed(cp, cargo);
}

export function calculateLaytime(input: EngineInput): EngineResult {
  const cp = input.cpList?.[0] || null; // basic: single CP
  const scope = input.scope || "all_ports";
  const filteredPortCalls = (input.portCalls || []).filter((pc: any) => {
    if (scope === "load_only") return pc.activity === "load";
    if (scope === "discharge_only") return pc.activity === "discharge";
    return true;
  });
  const rows: CargoPortResult[] = [];

  input.cargoes.forEach((cargo: any) => {
    filteredPortCalls.forEach((pc: any) => {
      const allowed = allowedForPort(pc, cp, cargo);
      const portActs = (input.activities || []).filter((a: any) => a.port_call_id === pc.id);
      const portDeds = (input.deductions || []).filter((d: any) => d.port_call_id === pc.id);

      const usedRaw = portActs.reduce((sum: number, act: any) => {
        const dur = Number(act.duration_minutes || 0);
        const adj = applyCountBehavior(dur, act.count_behavior);
        return sum + adj;
      }, 0);

      const deductions = portDeds
        .filter((d: any) => d.type === "DEDUCTION" && (!d.applies_to_cargo_ids?.length || d.applies_to_cargo_ids.includes(cargo.id)))
        .reduce((sum: number, d: any) => {
          if (d.flat_duration_minutes) return sum + Number(d.flat_duration_minutes || 0);
          if (d.from_datetime && d.to_datetime) {
            const start = new Date(d.from_datetime).getTime();
            const end = new Date(d.to_datetime).getTime();
            if (end > start) return sum + (end - start) / 60000;
          }
          return sum;
        }, 0);

      const additions = portDeds
        .filter((d: any) => d.type === "ADDITION" && (!d.applies_to_cargo_ids?.length || d.applies_to_cargo_ids.includes(cargo.id)))
        .reduce((sum: number, d: any) => {
          if (d.flat_duration_minutes) return sum + Number(d.flat_duration_minutes || 0);
          if (d.from_datetime && d.to_datetime) {
            const start = new Date(d.from_datetime).getTime();
            const end = new Date(d.to_datetime).getTime();
            if (end > start) return sum + (end - start) / 60000;
          }
          return sum;
        }, 0);

      const used = Math.max(usedRaw - deductions + additions, 0);
      rows.push({
        cargoId: cargo.id,
        portCallId: pc.id,
        laytimeAllowedMinutes: allowed,
        laytimeUsedMinutes: used,
        deductionsMinutes: deductions,
        additionsMinutes: additions,
        timeOnDemurrageMinutes: 0, // set after grouping
        timeOnDespatchMinutes: 0,
      });
    });
  });

  // Grouping for reversible (optional)
  const groupIds = input.method === "REVERSIBLE"
    ? (input.reversibleGroups && input.reversibleGroups.length > 0
        ? input.reversibleGroups
        : [input.portCalls.map((p: any) => p.id)])
    : input.portCalls.map((p: any) => [p.id]);

  let totalDem = 0;
  let totalDesp = 0;

  groupIds.forEach((group, idx) => {
    const groupRows = rows.filter((r) => group.includes(r.portCallId));
    const groupAllowed = groupRows.reduce((s, r) => s + (r.laytimeAllowedMinutes || 0), 0);
    const groupUsed = groupRows.reduce((s, r) => s + (r.laytimeUsedMinutes || 0), 0);
    const over = groupUsed - groupAllowed;

    if (over > 0 && groupUsed > 0) {
      groupRows.forEach((r) => {
        const share = r.laytimeUsedMinutes / groupUsed;
        const dem = over * share;
        r.timeOnDemurrageMinutes = dem;
        r.reversibleGroupId = input.method === "REVERSIBLE" ? `rev-${idx}` : undefined;
        totalDem += dem;
      });
    } else if (over < 0 && groupAllowed > 0) {
      const under = Math.abs(over);
      groupRows.forEach((r) => {
        const share = r.laytimeAllowedMinutes / groupAllowed;
        const desp = under * share;
        r.timeOnDespatchMinutes = desp;
        r.reversibleGroupId = input.method === "REVERSIBLE" ? `rev-${idx}` : undefined;
        totalDesp += desp;
      });
    }
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.timeAllowedMinutes += r.laytimeAllowedMinutes;
      acc.timeUsedMinutes += r.laytimeUsedMinutes;
      acc.timeOnDemurrageMinutes += r.timeOnDemurrageMinutes;
      acc.timeOnDespatchMinutes += r.timeOnDespatchMinutes;
      return acc;
    },
    {
      timeAllowedMinutes: 0,
      timeUsedMinutes: 0,
      timeOnDemurrageMinutes: 0,
      timeOnDespatchMinutes: 0,
      demurrageAmount: 0,
      despatchAmount: 0,
    }
  );

  if (cp) {
    totals.demurrageAmount = (totals.timeOnDemurrageMinutes / MINUTES_PER_DAY) * Number(cp.demurrage_rate_per_day || 0);
    totals.despatchAmount = (totals.timeOnDespatchMinutes / MINUTES_PER_DAY) * Number(cp.despatch_rate_per_day || 0);
  }

  return { cargoPortRows: rows, totals };
}
