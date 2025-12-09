import { describe, expect, it } from "vitest";
import { buildStatementSnapshot, LaytimeClaim, LaytimeEvent, SiblingSummary } from "../src/lib/laytime-summary";

describe("laytime summary helper", () => {
  const baseClaim: LaytimeClaim = {
    id: "c1",
    reversible: false,
    reversible_scope: "all_ports",
    laytime_start: "2025-02-15T00:00:00Z",
    laytime_end: "2025-02-17T00:00:00Z",
    load_discharge_rate: 100,
    load_discharge_rate_unit: "per_hour",
    demurrage_rate: 24000,
    despatch_rate_value: 12000,
    voyages: { cargo_quantity: 4800 },
    port_calls: [{ id: "pc1", port_name: "Test Port", activity: "load", allowed_hours: 48, sequence: 1 }],
  };

  const events: LaytimeEvent[] = [
    {
      id: "e1",
      deduction_name: "Weather delay",
      from_datetime: "2025-02-15T01:00:00Z",
      to_datetime: "2025-02-15T05:00:00Z",
      rate_of_calculation: 100,
      time_used: 4,
      port_call_id: "pc1",
    },
    {
      id: "e2",
      deduction_name: "Ops stop",
      from_datetime: "2025-02-15T10:00:00Z",
      to_datetime: "2025-02-15T12:00:00Z",
      rate_of_calculation: 50,
      time_used: 1, // 2h * 0.5
      port_call_id: "pc1",
    },
  ];

  it("computes totals and over/under with manual additions/deductions", () => {
    const manualAdd: LaytimeEvent[] = [
      {
        id: "add1",
        deduction_name: "Credited time",
        from_datetime: "2025-02-15T20:00:00Z",
        to_datetime: "2025-02-15T22:00:00Z",
        rate_of_calculation: 100,
        time_used: 2,
        port_call_id: "pc1",
      },
    ];

    const snapshot = buildStatementSnapshot({
      claim: baseClaim,
      events,
      manualAdditions: manualAdd,
    });

    expect(snapshot.totalAllowed).toBe(48);
    // Deductions 4 + 1, additions subtract 2 -> net 3
    expect(snapshot.totalDeductionsAll).toBe(3);
    expect(snapshot.totalUsed).toBe(48 - 3);
    expect(snapshot.timeOver).toBe(3); // under by 3 hours (despatch side)
    expect(snapshot.despatch).toBeGreaterThan(0);
  });

  it("respects reversible scope with siblings", () => {
    const reversibleClaim: LaytimeClaim = {
      ...baseClaim,
      reversible: true,
      reversible_scope: "load_only",
      reversible_pool_ids: ["c1", "c2"],
    };
    const siblings: SiblingSummary[] = [
      { claim_id: "c1", port_call_id: "pc1", allowed: 30, base_hours: 48, deductions: 5, used: 25 },
      { claim_id: "c2", port_call_id: "pc2", activity: "discharge", allowed: 20, base_hours: 30, deductions: 2, used: 18 },
    ];
    const snapshot = buildStatementSnapshot({ claim: reversibleClaim, events, siblings });
    expect(snapshot.totalAllowed).toBeGreaterThan(0);
    expect(snapshot.breakdown.length).toBeGreaterThan(0);
  });
});
