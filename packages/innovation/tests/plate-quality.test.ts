import { describe, it, expect } from "vitest";
import { parseJsonFromText } from "../src/plate-quality/PlateQualityAnalyzer.js";

describe("parseJsonFromText", () => {
  it("מחלץ JSON מתוך טקסט מעורבב", () => {
    const text = "Here is the analysis:\n{\"presentation\": 8, \"portion\": 7}\nThanks";
    const j = parseJsonFromText(text);
    expect(j.presentation).toBe(8);
    expect(j.portion).toBe(7);
  });

  it("מחזיר אובייקט ריק אם אין JSON", () => {
    expect(parseJsonFromText("no json here")).toEqual({});
  });

  it("עמיד ל-JSON שבור", () => {
    expect(parseJsonFromText("{not valid")).toEqual({});
  });
});
