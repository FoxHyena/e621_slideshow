import { afterEach, describe, expect, it } from "vitest";
import { makePost } from "@/lib/__tests__/fixtures";
import type { Credentials } from "@/lib/e621/client";
import type { Post } from "@/lib/e621/types";
import { createStore } from "@/state/store";
import { askPost, hasKnownPost, onAccountLeft, rememberPosts, watchAccounts } from "../postCache";

const creds = (username: string): Credentials => ({ username, apiKey: "k" });
/** A stand-in for the session's store: only who is signed in matters here. */
const session = () => createStore<{ creds: Credentials | null }>({ creds: creds("fox") });
/** An ask that answers when told to. */
function later() {
  let answer!: (ps: Post[]) => void;
  const asked = new Promise<Post[]>((r) => (answer = r));
  return { ask: () => asked, answer };
}

const undo: (() => void)[] = [];
afterEach(() => {
  for (const f of undo.splice(0)) f();
});

describe("postCache: an account's sign-in ending", () => {
  it("drops that account's posts, and only those", () => {
    const s = session();
    undo.push(watchAccounts(s));
    const left: string[] = [];
    undo.push(onAccountLeft((n) => left.push(n)));
    rememberPosts("fox", [7], new Map([[7, makePost({ id: 7 })]]));
    rememberPosts("wolf", [7], new Map([[7, makePost({ id: 7 })]]));
    rememberPosts(undefined, [7], new Map([[7, makePost({ id: 7 })]]));
    // the same name again (a key re-saved) is no leaving
    s.set({ creds: creds("fox") });
    expect(left).toEqual([]);
    s.set({ creds: null });
    expect(left).toEqual(["fox"]);
    expect(hasKnownPost("fox", 7)).toBe(false);
    expect(hasKnownPost("wolf", 7)).toBe(true);
    // what anyone signed out can see stays
    expect(hasKnownPost(undefined, 7)).toBe(true);
  });

  it("doesn't keep an answer that comes after its account left", async () => {
    const s = session();
    undo.push(watchAccounts(s));
    const a = later();
    const p = askPost("fox", 8, a.ask);
    s.set({ creds: null });
    a.answer([makePost({ id: 8 })]);
    expect((await p)?.id).toBe(8);
    expect(hasKnownPost("fox", 8)).toBe(false);
  });

  it("an old ask settling doesn't end a newer one's sharing", async () => {
    const s = session();
    undo.push(watchAccounts(s));
    const old = later();
    void askPost("fox", 9, old.ask);
    s.set({ creds: null });
    s.set({ creds: creds("fox") });
    const now = later();
    const first = askPost("fox", 9, now.ask);
    old.answer([]);
    await new Promise((r) => setTimeout(r, 0));
    // still shared: a second ask while the first is out doesn't go again
    expect(askPost("fox", 9, () => Promise.reject(new Error("asked twice")))).toBe(first);
    now.answer([makePost({ id: 9 })]);
    expect((await first)?.id).toBe(9);
    expect(hasKnownPost("fox", 9)).toBe(true);
  });
});
