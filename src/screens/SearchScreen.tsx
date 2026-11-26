"use client";

/**
 * Search (`/search`, UX §5): the tag box with autocomplete, recent and saved searches, and a way to
 * your favorites. Submitting opens Results.
 */
import { ChevronLeft, ChevronRight, ExternalLink, Heart, Search, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import TagInput from "@/components/TagInput";
import { normTags } from "@/lib/feed/filters";
import { buildQuery, DEFAULT_TAG_LIMIT } from "@/lib/query/build";
import { DEFAULT_SEARCH } from "@/lib/settings";
import { getNav } from "@/nav/history";
import { getPrefs } from "@/state/prefs";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";
import { defaultFilters, openResults } from "./actions";

/** Show the tag counter once a search uses this many. */
const COUNT_FROM = 30;

export function SearchForm({ initial, onSubmit }: { initial: string; onSubmit: (tags: string) => void }) {
  const [tags, setTags] = useState(initial);
  const { creds, user } = useStore(getSession().store, (s) => s);
  const limit = user?.tag_query_limit ?? DEFAULT_TAG_LIMIT;
  const used = buildQuery({ ...DEFAULT_SEARCH, tags }, limit).tagCount;
  const over = used > limit;
  const submit = () => {
    if (!over) onSubmit(normTags(tags));
  };
  return (
    <form
      className="search-form"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <TagInput value={tags} onChange={setTags} creds={creds} label="Tags" placeholder="wolf solo -feral" onSubmit={submit} testId="search-tags" />
      {used > COUNT_FROM && (
        <p className="search-count" data-over={over || undefined} aria-live="polite">
          {used} / {limit} tags{over && ": take some out to search"}
        </p>
      )}
      <button type="submit" className="btn-gold search-go" disabled={over} data-testid="search-submit">
        <Search aria-hidden /> Search
      </button>
    </form>
  );
}

export function SearchScreen() {
  const nav = getNav();
  const history = useStore(getPrefs().store, (p) => p.history);
  const saved = useStore(getPrefs().store, (p) => p.saved);
  return (
    <div className="screen-frame">
      <div className="screen-toolbar">
        <button type="button" className="toolbar-circle" aria-label="Back" onClick={() => void nav.back()}>
          <ChevronLeft aria-hidden />
        </button>
      </div>
      <h1 tabIndex={-1} className="screen-title">
        Search
      </h1>
      <SearchForm initial="" onSubmit={(t) => openResults(t)} />

      {history.length > 0 && (
        <section className="search-section" aria-labelledby="recent-h">
          <div className="search-section-head">
            <h2 id="recent-h" className="group-label">
              Recent
            </h2>
            <button type="button" className="text-btn" onClick={() => getPrefs().clearHistory()}>
              Clear
            </button>
          </div>
          <div className="chips chips-wrap">
            {history.map((h) => (
              <button key={h.tags} type="button" className="chip" onClick={() => openResults(h.tags)} data-testid="recent-search">
                {h.tags}
              </button>
            ))}
          </div>
        </section>
      )}

      {saved.length > 0 && (
        <section className="search-section" aria-labelledby="saved-h">
          <h2 id="saved-h" className="group-label">
            Saved
          </h2>
          <ul className="settings-group">
            {saved.map((s) => (
              <li key={s.id} className="saved-row">
                <button
                  type="button"
                  className="settings-row saved-open"
                  onClick={() => openResults(s.tags, { ...defaultFilters(), order: s.order, date: s.date })}
                  data-testid="saved-search"
                >
                  <Star aria-hidden className="saved-star" />
                  <span className="saved-text">
                    <span className="saved-name">{s.name}</span>
                    {s.name !== s.tags && <span className="saved-tags">{s.tags}</span>}
                  </span>
                </button>
                <button
                  type="button"
                  className="saved-delete"
                  aria-label={`Delete ${s.name}`}
                  onClick={() => getPrefs().setSaved(saved.filter((x) => x.id !== s.id))}
                >
                  <Trash2 aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="settings-group search-section">
        <li>
          <a
            href="/favorites"
            className="settings-row"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              nav.push({ screen: { kind: "favorites", params: "" }, play: null });
            }}
            data-testid="open-favorites"
          >
            <span className="row-with-icon">
              <Heart aria-hidden className="text-heart" /> Your favorites
            </span>
            <ChevronRight aria-hidden className="settings-chevron" />
          </a>
        </li>
        <li>
          <a href="https://e621.net/help/cheatsheet" target="_blank" rel="noopener" className="settings-row">
            <span>Search cheatsheet</span>
            <ExternalLink aria-hidden className="settings-chevron" />
          </a>
        </li>
      </ul>
    </div>
  );
}

