import { describe, expect, it } from "vitest";
import { normalizeSofPayload, RawSofOcrResponse } from "../src/lib/sof-parser";
import { mapCanonicalEvent } from "../src/lib/sof-mapper";

describe("SOF parser header and mapping", () => {
  it("extracts header fields (port/terminal/cargo/IMO) from typical lines", () => {
    const payload: RawSofOcrResponse = {
      events: [
        { event: "Vessel: MV TESTER", confidence: 0.9, page: 1, line: 1 },
        { event: "IMO: 9876543", confidence: 0.9, page: 1, line: 2 },
        { event: "Port of Vancouver, Canada", confidence: 0.9, page: 1, line: 3 },
        { event: "Terminal: Cascade Grain Berth 2", confidence: 0.9, page: 1, line: 4 },
        { event: "Cargo: Wheat Grain 51900 MT", confidence: 0.9, page: 1, line: 5 },
        { event: "15 FEB 2025 – 02:30", confidence: 0.9, page: 1, line: 6 },
        { event: "All fast alongside", confidence: 0.9, page: 1, line: 7 },
      ],
    };

    const result = normalizeSofPayload(payload, { confidenceFloor: 0.1 });

    expect(result.summary?.port_name).toContain("Vancouver");
    expect(result.summary?.terminal).toContain("Cascade Grain");
    expect(result.summary?.cargo_name?.toLowerCase()).toContain("wheat");
    expect(result.summary?.cargo_quantity?.toLowerCase()).toContain("51900");
    expect(result.summary?.imo).toBe("9876543");
    expect(result.events.length).toBeGreaterThan(0);
  });

  it("maps canonical event NAV_ALL_FAST from wording variations", () => {
    const mapped = mapCanonicalEvent("All fast alongside new berth");
    expect(mapped.canonical).toBe("NAV_ALL_FAST");
    expect(mapped.confidence).toBeGreaterThan(0.5);
  });
});
