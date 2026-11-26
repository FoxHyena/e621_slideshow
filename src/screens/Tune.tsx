"use client";

/**
 * Tune (`/for-you/tune`, UX §5): For You's profile. Sync status and Rebuild, Breadth, and every
 * profile tag with Pin and Mute. Nothing re-ranks from here: For You offers Update ranking on return.
 */
import { ChevronLeft, Pin, RefreshCw, VolumeX } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { InlineLoader, stepText } from "@/components/Loader";
import { buildRecommendedQuery, DEFAULT_TAG_LIMIT } from "@/lib/query/build";
import { searchPlan, topTags, type SearchKind } from "@/lib/recommend/weights";
import { BREADTH_MAX, BREADTH_MIN, DEFAULT_SEARCH } from "@/lib/settings";
import { getNav } from "@/nav/history";
import { getPrefs } from "@/state/prefs";
import { getRec, weightsOf } from "@/state/rec";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";

/** Rows shown before Find a tag is needed. */
const TAG_LIST_MAX = 100;
const label = (tag: string) => tag.replaceAll("_", " ");
/** "3:41 PM" today, "Nov 24, 3:41 PM" before. */
function syncedLabel(at: number): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? time : `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

export function TuneScreen() {
  const rec = getRec();
  const r = useStore(rec.store, (s) => s);
  const session = useStore(getSession().store, (s) => s);
  const prefs = getPrefs();
  const search = useStore(prefs.store, (p) => p.search);
  const forYou = useStore(prefs.store, (p) => p.forYou);
  const [filter, setFilter] = useState("");

  const weights = useMemo(() => weightsOf(r), [r.profile, r.cache, r.overrides]); // eslint-disable-line react-hooks/exhaustive-deps
  const tags = useMemo(() => topTags(weights, weights.size), [weights]);
  // What For You actually searches: the plan, cut to what e621's tag limit leaves room for.
  const { searched, capped } = useMemo(() => {
    const plan = r.profile ? searchPlan(weights, r.overrides, search.breadth) : [];
    const s = { ...DEFAULT_SEARCH, ratings: search.ratings, media: forYou.media, date: forYou.date, minScore: forYou.minScore, breadth: search.breadth };
    const rq = buildRecommendedQuery(s, plan.map((p) => p.tag), session.user?.tag_query_limit ?? DEFAULT_TAG_LIMIT);
    const inQuery = new Set(rq.candidates);
    return { searched: new Map(plan.filter((p) => inQuery.has(p.tag)).map((p) => [p.tag, p.kind] as const)), capped: rq.capped };
  }, [weights, r.profile, r.overrides, search.breadth, search.ratings, forYou, session.user]);

  const signedIn = !!session.creds && !!session.user && !session.link;
  const { profile, overrides } = r;

  // "pink pawpads" finds pink_pawpads.
  const needle = filter.trim().toLowerCase().replace(/\s+/g, "_");
  const byWeight = (a: string, b: string) => (weights.get(b) ?? 0) - (weights.get(a) ?? 0) || a.localeCompare(b);
  const group = (kind: SearchKind | null) => tags.filter((t) => (searched.get(t) ?? null) === kind).sort(byWeight);
  const groups = [
    { kind: "pinned", label: "Pinned", tags: group("pinned") },
    { kind: "signature", label: "Searched: your most distinctive tags", tags: group("signature") },
    { kind: null, label: "Not searched. They still count when ranking; pin one to search it", tags: group(null) },
  ].filter((g) => g.tags.length > 0);
  const ordered = groups.flatMap((g) => g.tags);
  const matched = needle ? ordered.filter((t) => t.includes(needle)) : ordered;
  const shown = matched.slice(0, TAG_LIST_MAX);
  const headerAt = new Map(groups.map((g) => [g.tags[0], g]));

  const row = (tag: string) => {
    const cat = profile?.tags[tag]?.cat ?? "general";
    const pinned = overrides.pinned.includes(tag);
    const muted = overrides.muted.includes(tag);
    const dim = !muted && !searched.has(tag);
    return (
      <li key={tag} className="tune-tag" data-testid="rec-tag" data-searched={!dim && !muted} data-dim={dim || undefined} data-muted={muted || undefined}>
        <span className="tune-tag-name" style={{ color: `var(--color-tag-${cat})` }}>
          {label(tag)}
        </span>
        {!muted && (
          <span className="tune-tag-count">
            {profile?.tags[tag] ? `×${profile.tags[tag].n} · ` : ""}
            {(weights.get(tag) ?? 0).toFixed(1)}
          </span>
        )}
        <button
          type="button"
          className="tune-icon"
          onClick={() => rec.togglePin(tag)}
          aria-label={`${pinned ? "Unpin" : "Pin"} ${label(tag)}`}
          aria-pressed={pinned}
          data-on={pinned || undefined}
        >
          <Pin aria-hidden />
        </button>
        <button
          type="button"
          className="tune-icon tune-mute"
          onClick={() => rec.toggleMute(tag)}
          aria-label={`${muted ? "Unmute" : "Mute"} ${label(tag)}`}
          aria-pressed={muted}
          data-on={muted || undefined}
        >
          <VolumeX aria-hidden />
        </button>
      </li>
    );
  };

  return (
    <div className="screen-frame" data-testid="tune">
      <div className="screen-toolbar">
        <button type="button" className="toolbar-circle" aria-label="Back" onClick={() => void getNav().back()}>
          <ChevronLeft aria-hidden />
        </button>
      </div>
      <h1 tabIndex={-1} className="screen-title">
        Tune For You
      </h1>
      {!signedIn ? (
        <p className="screen-note" data-testid="rec-signin">
          Sign in to tune For You. It learns from the favorites on your e621 account.
        </p>
      ) : (
        <>
          <div className="tune-status">
            <span data-testid="rec-status" aria-live="polite">
              {r.syncing ? (
                <InlineLoader label={r.step ? stepText(r.step) : "Syncing favorites…"} size="xs" />
              ) : profile ? (
                `${profile.favIds.length.toLocaleString()} favorites · synced ${syncedLabel(profile.syncedAt)}`
              ) : (
                "No favorites read yet"
              )}
            </span>
            <button type="button" className="text-btn" onClick={rec.rebuild} disabled={r.syncing} data-testid="rec-rebuild">
              <RefreshCw aria-hidden /> Rebuild
            </button>
          </div>
          {r.error && (
            <p className="tune-error" role="alert">
              Couldn&rsquo;t read favorites: {r.error}
            </p>
          )}

          <section className="tune-card" aria-labelledby="tune-breadth">
            <label htmlFor="rec-breadth" className="tune-card-head">
              <span id="tune-breadth">Breadth</span>
              <span className="tune-value" data-testid="rec-breadth-value">
                {capped ? `${searched.size} tags (e621 tag limit)` : `${search.breadth} tags`}
              </span>
            </label>
            <input
              id="rec-breadth"
              type="range"
              min={BREADTH_MIN}
              max={BREADTH_MAX}
              step={1}
              value={search.breadth}
              onChange={(e) => prefs.setSearch({ ...prefs.store.get().search, breadth: Number(e.target.value) })}
              className="tune-range"
              data-testid="rec-breadth"
            />
            <div className="tune-ends" aria-hidden>
              <span>Focused</span>
              <span>Varied</span>
            </div>
            <p className="tune-note">
              Your strongest tags, searched together. Fewer stays close to what you love most; more brings variety. Each tag uses one of
              e621&rsquo;s search-tag slots.
            </p>
          </section>

          {tags.length > 0 ? (
            <section className="tune-tags" aria-labelledby="tune-profile">
              <h2 id="tune-profile" className="group-label">
                Your profile: {tags.length.toLocaleString()} {tags.length === 1 ? "tag" : "tags"} you favorite far more than e621 at large.{" "}
                {searched.size} {searched.size === 1 ? "is" : "are"} searched; all of them count when ranking.
              </h2>
              <div className="tune-find">
                <input
                  type="search"
                  className="field"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Find a tag"
                  aria-label="Find a profile tag"
                  data-testid="rec-filter"
                />
                {needle && (
                  <span className="tune-find-count">
                    {matched.length.toLocaleString()} of {tags.length.toLocaleString()}
                  </span>
                )}
              </div>
              <ul className="tune-list" data-testid="rec-tags" aria-label="Profile tags, strongest first">
                {shown.map((tag) => {
                  const g = needle ? undefined : headerAt.get(tag);
                  if (!g) return row(tag);
                  return (
                    <Fragment key={tag}>
                      <li className="tune-group" data-testid={g.kind ? `rec-group-${g.kind}` : "rec-cutoff"}>
                        {g.label}
                      </li>
                      {row(tag)}
                    </Fragment>
                  );
                })}
                {shown.length === 0 && <li className="tune-group">No profile tags match.</li>}
              </ul>
              {matched.length > shown.length && (
                <p className="tune-note" data-testid="rec-tags-truncated">
                  Showing the top {shown.length} of {matched.length.toLocaleString()}. Find a tag for the rest.
                </p>
              )}
            </section>
          ) : (
            !r.syncing && <p className="screen-note">Not enough favorites yet: a tag needs to be on at least 3 of them.</p>
          )}

          {overrides.muted.length > 0 && (
            <section className="tune-tags" aria-labelledby="tune-muted">
              <h2 id="tune-muted" className="group-label">
                Muted: posts with these tags stay out of For You
              </h2>
              <ul className="tune-list" data-testid="rec-muted">
                {overrides.muted.map(row)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
