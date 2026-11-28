"use client";

/**
 * Tune (`/for-you/tune`, UX §5): For You's profile. Sync status and Rebuild, Breadth, Filter
 * artists, and every profile tag with Pin and Mute. Nothing re-ranks from here: For You offers Update ranking on return.
 */
import { ChevronLeft, Pin, RefreshCw, Search, VolumeX } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { InlineLoader, stepText } from "@/components/Loader";
import { Field, Slider } from "@/components/v6";
import { buildRecommendedQuery, DEFAULT_TAG_LIMIT } from "@/lib/query/build";
import { SEARCH_TIERS, searchTiers } from "@/lib/recommend/stream";
import { isName, searchPlan, topTags, type SearchKind } from "@/lib/recommend/weights";
import { QUALITY_WEIGHT } from "@/lib/recommend/rank";
import { BREADTH_MAX, BREADTH_MIN, DEFAULT_SEARCH, QUALITY_WEIGHT_MAX } from "@/lib/settings";
import { getNav } from "@/nav/history";
import { blacklistOf, getPrefs } from "@/state/prefs";
import { getRec, weightsOf } from "@/state/rec";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";
import { countsOf } from "@/lib/recommend/sync";
import { Pips, pipsOf, TunePicture, type TagShare } from "./TunePicture";

/** Rows shown before Filter tags is needed. */
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
  const qw = search.qualityWeight ?? QUALITY_WEIGHT;
  const forYou = useStore(prefs.store, (p) => p.forYou);
  const blacklist = useStore(prefs.store, blacklistOf);
  const [filter, setFilter] = useState("");

  const weights = useMemo(() => weightsOf(r), [r.profile, r.cache, r.overrides]); // eslint-disable-line react-hooks/exhaustive-deps
  const tags = useMemo(() => topTags(weights, weights.size), [weights]);
  // What For You actually searches: the plan (and with Search further, its next rounds), each cut to
  // what e621's tag limit leaves room for.
  const { searched, capped, firstRound } = useMemo(() => {
    const named = (t: string) => isName(r.profile?.tags[t]?.cat);
    const rounds = search.moreTags ? SEARCH_TIERS : 1;
    const plan = r.profile ? searchPlan(weights, r.overrides, search.breadth * rounds, named) : [];
    const tiers = r.profile ? searchTiers(weights, r.overrides, search.breadth, named, rounds) : [];
    const s = { ...DEFAULT_SEARCH, ratings: search.ratings, media: forYou.media, date: forYou.date, minScore: forYou.minScore, breadth: search.breadth };
    const limit = session.user?.tag_query_limit ?? DEFAULT_TAG_LIMIT;
    const built = tiers.map((t) => buildRecommendedQuery(s, t, limit));
    const inQuery = new Set(built.flatMap((q) => q.candidates));
    return {
      searched: new Map(plan.filter((p) => inQuery.has(p.tag)).map((p) => [p.tag, p.kind] as const)),
      capped: !!built[0]?.capped,
      // one search's tags (the first round), for the card: Breadth, or fewer when the tag limit cuts it
      firstRound: built[0]?.candidates.length ?? 0,
    };
  }, [weights, r.profile, r.overrides, search.breadth, search.moreTags, search.ratings, forYou, session.user]);

  // Dots on each row (DESIGN.md "Tune"): weight against the strongest tag's, in fifths. A pin sets its tag
  // to at least 1 (weights.ts), so the strongest is measured without pins unless only pins are left.
  const strongest = useMemo(() => {
    let max = 0;
    for (const [t, w] of weights) if (!r.overrides.pinned.includes(t)) max = Math.max(max, w);
    if (max === 0) for (const w of weights.values()) max = Math.max(max, w);
    return max;
  }, [weights, r.overrides.pinned]);
  const pipsFor = (tag: string) => (r.overrides.muted.includes(tag) ? 0 : pipsOf(weights.get(tag) ?? 0, strongest, r.overrides.pinned.includes(tag)));
  // The card's two tags: the strongest one not pinned, and the one on the most favorites among those with one dot
  const pictured = useMemo((): TagShare[] => {
    const p = r.profile;
    const nSite = r.cache.site?.n ?? 0;
    if (!p || p.favIds.length === 0 || nSite === 0) return [];
    const counts = countsOf(r.cache);
    const share = (tag: string): TagShare | null => {
      const st = p.tags[tag];
      const c = counts[tag];
      if (!st || !c) return null;
      return { tag, cat: st.cat, mine: st.n / p.favIds.length, site: c / nSite, pips: pipsOf(weights.get(tag) ?? 0, strongest, false) };
    };
    const free = tags.filter((t) => !r.overrides.pinned.includes(t));
    let first: TagShare | null = null;
    for (const t of free) if ((first = share(t))) break;
    const rest = free.filter((t) => t !== first?.tag).map(share).filter((t): t is TagShare => t !== null);
    // one dot, or the fewest when none has one
    const fewest = rest.reduce((m, t) => Math.min(m, t.pips), Infinity);
    const second = rest.filter((t) => t.pips === fewest).sort((a, b) => b.mine - a.mine || a.tag.localeCompare(b.tag))[0] ?? null;
    return [first, second].filter((t): t is TagShare => t !== null);
  }, [r.profile, r.cache, r.overrides, weights, tags, strongest]);

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
      <li
        key={tag}
        className="list-row tune-tag"
        data-testid="rec-tag"
        data-searched={!dim && !muted}
        data-dim={dim || undefined}
        data-muted={muted || undefined}
      >
        <span className="row-text">
          <span className="tune-tag-name" style={{ color: `var(--color-tag-${cat})` }}>
            {label(tag)}
          </span>
          {!muted && profile?.tags[tag] && (
            <small className="tune-tag-count">
              {profile.tags[tag].n.toLocaleString("en")} {profile.tags[tag].n === 1 ? "favorite" : "favorites"}
            </small>
          )}
        </span>
        <Pips n={pipsFor(tag)} cat={cat} />
        <button
          type="button"
          className="toggle"
          onClick={() => rec.togglePin(tag)}
          aria-label={`${pinned ? "Unpin" : "Pin"} ${label(tag)}`}
          aria-pressed={pinned}
        >
          <Pin aria-hidden />
        </button>
        <button
          type="button"
          className="toggle"
          data-danger
          onClick={() => rec.toggleMute(tag)}
          aria-label={`${muted ? "Unmute" : "Mute"} ${label(tag)}`}
          aria-pressed={muted}
        >
          <VolumeX aria-hidden />
        </button>
      </li>
    );
  };

  return (
    <div className="screen-frame" data-testid="tune">
      <div className="head-row">
        <button type="button" className="toolbar-circle" aria-label="Back" onClick={() => void getNav().back()}>
          <ChevronLeft aria-hidden />
        </button>
      </div>
      <h1 tabIndex={-1} className="screen-title">
        Tune
      </h1>
      <p className="screen-lede">For You learns from your favorites.</p>
      {!signedIn ? (
        <p className="screen-note" data-testid="rec-signin">
          Sign in to tune For You. It learns from the favorites on your e621 account.
        </p>
      ) : (
        <>
          {profile && profile.favIds.length > 0 && (
            <TunePicture
              profile={profile}
              creds={session.creds}
              search={search}
              blacklist={blacklist}
              date={forYou.date}
              shown={pictured}
              breadth={capped ? firstRound : search.breadth}
              qw={qw}
            />
          )}
          <div className="list-group tune-sync">
            <div className="list-row">
              <span className="row-text" data-testid="rec-status" aria-live="polite">
                {r.syncing ? (
                  <InlineLoader label={r.step ? stepText(r.step) : "Syncing favorites…"} size="xs" />
                ) : profile ? (
                  <>
                    <b>{profile.favIds.length.toLocaleString("en")} favorites read</b>
                    <small>Synced {syncedLabel(profile.syncedAt)}</small>
                  </>
                ) : (
                  <b>No favorites read yet</b>
                )}
              </span>
              <button type="button" className="btn-tonal" data-size="compact" onClick={rec.rebuild} disabled={r.syncing} data-testid="rec-rebuild">
                <RefreshCw aria-hidden /> Rebuild
              </button>
            </div>
          </div>
          {r.error && (
            <p className="tune-error" role="alert">
              Couldn&rsquo;t read favorites: {r.error}
            </p>
          )}

          <section className="panel-card" aria-labelledby="tune-breadth">
            <label htmlFor="rec-breadth" className="panel-card-head">
              <span id="tune-breadth">Breadth</span>
              <span data-testid="rec-breadth-value">{capped ? `${searched.size} tags (e621 tag limit)` : `${search.breadth} tags`}</span>
            </label>
            <Slider
              id="rec-breadth"
              min={BREADTH_MIN}
              max={BREADTH_MAX}
              step={1}
              value={search.breadth}
              onChange={(e) => prefs.setSearch({ ...prefs.store.get().search, breadth: Number(e.target.value) })}
              data-testid="rec-breadth"
            />
            <div className="slider-ends" aria-hidden>
              <span>{BREADTH_MIN}</span>
              <span>{BREADTH_MAX}</span>
            </div>
            <p className="tune-note">
              How many of your top tags For You searches. Each one uses one of e621&rsquo;s search-tag slots.
            </p>
          </section>

          {/* a friend's ask, via the owner (2026-11-27): "a useful slider (tag vs favcount weight)" */}
          <section className="panel-card" aria-labelledby="tune-taste">
            <label htmlFor="rec-taste" className="panel-card-head">
              <span id="tune-taste">Taste or popular</span>
              <span data-testid="rec-taste-value">{tasteLabel(qw)}</span>
            </label>
            <Slider
              id="rec-taste"
              min={0}
              max={QUALITY_WEIGHT_MAX}
              step={0.25}
              value={qw}
              aria-valuetext={tasteLabel(qw)}
              onChange={(e) => prefs.setSearch({ ...prefs.store.get().search, qualityWeight: Number(e.target.value) })}
              data-testid="rec-taste"
            />
            <div className="slider-ends" aria-hidden>
              <span>Taste</span>
              <span>Popular</span>
            </div>
            <p className="tune-note">How much a post&rsquo;s favorites count beside how well its tags match yours. Moving it re-sorts the list.</p>
          </section>

          <div className="list-group tune-switches">
            {/* the owner's ask (2026-11-27): the wider search made the feed less tuned; off by default */}
            <label className="list-row">
              <span className="row-text">
                <b>Search further</b>
                <small>When your top tags run out, go on with the next ones</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={!!search.moreTags}
                onChange={(e) => prefs.setSearch({ ...prefs.store.get().search, moreTags: e.target.checked })}
                data-testid="rec-more-tags"
              />
            </label>
            {/* the owner's ask (2026-11-26): taste without who drew it; a pinned artist still counts */}
            <label className="list-row">
              <span className="row-text">
                <b>Filter artists</b>
                <small>Ranks without artist tags</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={!!overrides.noArtists}
                onChange={(e) => rec.setNoArtists(e.target.checked)}
                data-testid="rec-no-artists"
              />
            </label>
          </div>

          {tags.length > 0 ? (
            <section className="tune-tags" aria-labelledby="tune-profile">
              <p className="tune-note">
                {tags.length.toLocaleString()} {tags.length === 1 ? "tag" : "tags"} you favorite far more than e621 at large. {searched.size}{" "}
                {searched.size === 1 ? "is" : "are"} searched; all of them count when ranking.
              </p>
              <Field
                className="tune-find"
                type="search"
                icon={<Search aria-hidden />}
                value={filter}
                onChange={setFilter}
                placeholder="Filter tags"
                aria-label="Find a profile tag"
                data-testid="rec-filter"
                after={
                  <span className="field-value">
                    {matched.length.toLocaleString()} of {tags.length.toLocaleString()}
                  </span>
                }
              />
              <h2 id="tune-profile" className="list-label">
                <span>Your tags</span>
                <span aria-hidden>Pin · Mute</span>
              </h2>
              <ul className="list-group" data-flat data-testid="rec-tags" aria-label="Profile tags, strongest first">
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
                  Showing the top {shown.length} of {matched.length.toLocaleString()}. Filter tags to find the rest.
                </p>
              )}
            </section>
          ) : (
            !r.syncing && <p className="screen-note">Not enough favorites yet: a tag needs to be on at least 3 of them.</p>
          )}

          {overrides.muted.length > 0 && (
            <section className="tune-tags" aria-labelledby="tune-muted">
              <h2 id="tune-muted" className="list-label">
                Muted: posts with these tags stay out of For You
              </h2>
              <ul className="list-group" data-flat data-testid="rec-muted">
                {overrides.muted.map(row)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Taste ↔ Popular in words, with the number (popularity's weight; the middle, 1, is rank.ts's even blend). */
function tasteLabel(w: number): string {
  if (w === 0) return "Taste only";
  if (w === QUALITY_WEIGHT) return "Even";
  return `${w < QUALITY_WEIGHT ? "More taste" : "More popular"} · ${w}`;
}
