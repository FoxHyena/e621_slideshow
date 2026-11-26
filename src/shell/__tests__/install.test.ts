import { describe, expect, it } from "vitest";
import { installWayOf } from "../pwa";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
const MAC_SAFARI = IPAD;
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const INSTAGRAM = `${IPHONE.replace(" Safari/604.1", "")} Instagram 350.0.0.0`;
const FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0";

describe("installWayOf (Settings › App's install row)", () => {
  it("the installed app says so", () => {
    expect(installWayOf({ userAgent: MAC_CHROME }, true)).toBe("installed");
    expect(installWayOf({ userAgent: IPHONE, standalone: true }, false)).toBe("installed");
  });
  it("iPhone Safari gets the steps; an iPad passing as a Mac too", () => {
    expect(installWayOf({ userAgent: IPHONE }, false)).toBe("ios");
    expect(installWayOf({ userAgent: IPAD, maxTouchPoints: 5 }, false)).toBe("ios");
  });
  it("a chat or social app's browser on an iPhone is sent to Safari", () => {
    expect(installWayOf({ userAgent: INSTAGRAM }, false)).toBe("in-app");
  });
  it("Safari on a Mac gets Add to Dock; Chrome waits for its own prompt; Firefox gets nothing", () => {
    expect(installWayOf({ userAgent: MAC_SAFARI, maxTouchPoints: 0 }, false)).toBe("mac");
    expect(installWayOf({ userAgent: MAC_CHROME }, false)).toBeNull();
    expect(installWayOf({ userAgent: FIREFOX }, false)).toBeNull();
  });
});
