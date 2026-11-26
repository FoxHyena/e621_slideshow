import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AGE_MS, BACKOFF_MS, isAbort, resetLane, searchPosts } from "../e621/client";

/** The request lane (ENGINEERING §3): one at a time, by priority with aging, a shared back-off. */

let started: { tags: string; at: number }[];
let status: (tags: string) => number;
const t0 = 1_000_000;

beforeEach(() => {
  vi.useFakeTimers({ now: t0 });
  resetLane();
  started = [];
  status = () => 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: URL) => {
      const tags = url.searchParams.get("tags") ?? "";
      started.push({ tags, at: Date.now() });
      // Each answer takes 100 ms; "slow" takes 7 s.
      await new Promise((r) => setTimeout(r, tags === "slow" ? 7000 : 100));
      const s = status(tags);
      return new Response(s === 200 ? "[]" : JSON.stringify({ message: "busy" }), { status: s });
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const run = (tags: string, lane: "user" | "page" | "bg", signal?: AbortSignal) =>
  searchPosts(tags, 1, 1, null, signal, lane).catch((e) => e);

describe("request lane", () => {
  it("runs one request at a time, 550 ms apart, the most urgent first", async () => {
    const all = [run("first", "user"), run("bg", "bg"), run("page", "page"), run("user", "user")];
    await vi.runAllTimersAsync();
    await Promise.all(all);
    expect(started.map((s) => s.tags)).toEqual(["first", "user", "page", "bg"]);
    for (let i = 1; i < started.length; i++) expect(started[i].at - started[i - 1].at).toBeGreaterThanOrEqual(550);
  });

  it("lets a task that has waited long enough go before newer, more urgent ones", async () => {
    // A slow request holds the lane while the bg task ages two levels (bg → user).
    const all = [run("slow", "user"), run("old bg", "bg")];
    await vi.advanceTimersByTimeAsync(2 * AGE_MS + 500);
    all.push(run("late user", "user"));
    await vi.runAllTimersAsync();
    await Promise.all(all);
    expect(started.map((s) => s.tags)).toEqual(["slow", "old bg", "late user"]);
  });

  it("pauses the whole lane for 5 s after a 429", async () => {
    status = (t) => (t === "busy" ? 429 : 200);
    const a = run("busy", "user");
    const b = run("other", "page");
    await vi.runAllTimersAsync();
    expect((await a).status).toBe(429);
    await b;
    expect(started[1].at - started[0].at).toBeGreaterThanOrEqual(BACKOFF_MS);
  });

  it("drops a waiting task whose signal aborts, without fetching it", async () => {
    const ctl = new AbortController();
    const a = run("first", "user");
    const b = run("dropped", "page", ctl.signal);
    ctl.abort();
    await vi.runAllTimersAsync();
    await a;
    expect(isAbort(await b)).toBe(true);
    expect(started.map((s) => s.tags)).toEqual(["first"]);
  });
});
