import { describe, it, expect } from "vitest";
import { parseHebrewCommand } from "../src/kitchen-voice/KitchenVoice.js";

describe("parseHebrewCommand", () => {
  it("סמן הושלם", () => {
    const r = parseHebrewCommand("סמן הושלם");
    expect(r.kind).toBe("mark-completed");
  });

  it("סמן הושלם עם מספר משימה", () => {
    const r = parseHebrewCommand("סמן הושלם משימה 42");
    expect(r.kind).toBe("mark-completed");
    if (r.kind === "mark-completed") expect(r.taskId).toBe("42");
  });

  it("הוסף הערה", () => {
    const r = parseHebrewCommand("הוסף הערה בלי בצל");
    expect(r.kind).toBe("add-note");
    if (r.kind === "add-note") expect(r.note).toBe("בלי בצל");
  });

  it("משימה הבאה", () => {
    expect(parseHebrewCommand("משימה הבאה").kind).toBe("next-task");
    expect(parseHebrewCommand("הבא").kind).toBe("next-task");
  });

  it("קרא מלצר עם שולחן", () => {
    const r = parseHebrewCommand("קרא מלצר לשולחן 7");
    expect(r.kind).toBe("call-waiter");
    if (r.kind === "call-waiter") expect(r.tableId).toBe("7");
  });

  it("טקסט לא ידוע", () => {
    expect(parseHebrewCommand("שלום עולם").kind).toBe("unknown");
  });
});
