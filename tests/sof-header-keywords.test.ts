import { describe, expect, it } from "vitest";
import { normalizeSofPayload, RawSofOcrResponse } from "../src/lib/sof-parser";

describe("SOF header keyword coverage", () => {
  it("extracts port/terminal from variations (port of / berth / quay)", () => {
    const payload: RawSofOcrResponse = {
      events: [
        { event: "Port of Santos - Brazil", confidence: 0.9, page: 1, line: 1 },
        { event: "Berth: TEV Quay 3", confidence: 0.9, page: 1, line: 2 },
      ],
    };
    const res = normalizeSofPayload(payload, { confidenceFloor: 0.1 });
    expect(res.summary?.port_name?.toLowerCase()).toContain("santos");
    expect(res.summary?.terminal?.toLowerCase()).toContain("tev quay 3");
  });

  it("captures IMO even when unlabeled", () => {
    const payload: RawSofOcrResponse = {
      events: [
        { event: "MV TESTER", confidence: 0.9, page: 1, line: 1 },
        { event: "9876543", confidence: 0.9, page: 1, line: 2 },
      ],
    };
    const res = normalizeSofPayload(payload, { confidenceFloor: 0.1 });
    expect(res.summary?.imo).toBe("9876543");
  });
});
