import { describe, expect, it } from "vitest";
import { TUCK_BOTTOM, TUCK_TOP, tuckOf } from "../tuck";

const H = 812;

describe("Tuck", () => {
  it("leaves a card alone in the middle of the view", () => {
    expect(tuckOf(200, 300, H)).toEqual({ origin: "50% 0", transform: "", opacity: "" });
  });

  it("grows a card in from 95% and 16 px low as its top passes above the tab bar", () => {
    const t = tuckOf(H, 400, H);
    expect(t.transform).toBe("translateY(16.00px) scale(0.9500)");
    expect(t.opacity).toBe("");
    // and it settles once its top is well inside
    expect(tuckOf(H - TUCK_BOTTOM - 120, 400, H).transform).toBe("");
  });

  it("shrinks a leaving card's end to 95% and dims it to 55% under the top edge", () => {
    const t = tuckOf(-400, 400 + TUCK_TOP - 20, H);
    expect(t.origin).toBe("50% 100%");
    expect(t.transform).toBe("translateY(0.00px) scale(0.9500)");
    expect(t.opacity).toBe("0.550");
  });

  it("runs the same both ways: it depends on position only", () => {
    expect(tuckOf(700, 300, H)).toEqual(tuckOf(700, 300, H));
  });
});
