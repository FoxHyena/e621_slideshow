import { describe, expect, it } from "vitest";
import { migrate, SCHEMA_KEY, SCHEMA_VERSION, storedVersion } from "../migrate";

function fakeStorage(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init));
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
  };
}

describe("migrate", () => {
  it("stamps a fresh profile at the current version without running steps", () => {
    const ls = fakeStorage();
    let ran = 0;
    expect(migrate(ls, [() => ran++, () => ran++])).toBe(2);
    expect(ran).toBe(0);
    expect(ls.getItem(SCHEMA_KEY)).toBe("2");
  });

  it("runs every step an old profile hasn't had, in order, and keeps its data", () => {
    const ls = fakeStorage({ "e6ss:v1:search": '{"tags":"wolf"}', "e6ss:v1:saved": "[]" });
    const order: number[] = [];
    const steps = [
      (s: Storage) => {
        order.push(0);
        s.setItem("e6ss:v1:prefs", s.getItem("e6ss:v1:search")!);
      },
      () => order.push(1),
    ];
    expect(migrate(ls, steps)).toBe(2);
    expect(order).toEqual([0, 1]);
    expect(ls.getItem("e6ss:v1:prefs")).toBe('{"tags":"wolf"}');
    // Old keys stay for one release, so a rollback still reads them.
    expect(ls.getItem("e6ss:v1:search")).toBe('{"tags":"wolf"}');
  });

  it("resumes after the last finished step", () => {
    const ls = fakeStorage({ "e6ss:v1:search": "{}", [SCHEMA_KEY]: "1" });
    const order: number[] = [];
    migrate(ls, [() => order.push(0), () => order.push(1)]);
    expect(order).toEqual([1]);
  });

  it("records progress step by step when one throws", () => {
    const ls = fakeStorage({ "e6ss:v1:search": "{}" });
    const v = migrate(ls, [
      () => {},
      () => {
        throw new Error("quota");
      },
    ]);
    expect(v).toBe(1);
    expect(storedVersion(ls)).toBe(1);
  });

  it("leaves a profile from a newer build alone", () => {
    const ls = fakeStorage({ "e6ss:v1:search": "{}", [SCHEMA_KEY]: "9" });
    expect(migrate(ls, [() => {}])).toBe(9);
    expect(ls.getItem(SCHEMA_KEY)).toBe("9");
  });

  it("ships at version 1 with no data changes", () => {
    const ls = fakeStorage({ "e6ss:v1:search": '{"tags":"fox"}' });
    expect(migrate(ls)).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBe(1);
    expect(ls.getItem("e6ss:v1:search")).toBe('{"tags":"fox"}');
  });
});
