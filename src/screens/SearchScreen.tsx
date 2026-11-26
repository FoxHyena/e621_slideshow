"use client";

/**
 * Search (`/search`, UX §5): the tag box with autocomplete, recent and saved searches, and a way to
 * your favorites. Submitting opens Results.
 */
import { ChevronRight, ExternalLink, Heart, Star, Trash2 } from "lucide-react";
import { TagText, tagText } from "@/components/TagText";
import { SORT_LABEL } from "@/lib/feed/filters";
import type { Order } from "@/lib/settings";
import { getNav } from "@/nav/history";
import { getPrefs } from "@/state/prefs";
import { useStore } from "@/state/store";
import { defaultFilters, openResults } from "./actions";
import { SearchForm } from "./SearchForm";

/** A saved search's line: its tags and whatever it sorts or limits by. */
function savedLine(s: { name: string; tags: string; order: Order; date: { enabled: boolean } }) {
  const bits = [s.order !== "newest" ? SORT_LABEL[s.order] : null, s.date.enabled ? "Dated" : null].filter((b): b is string => !!b);
  // a search named after its tags already shows them as its name
  const tags = s.name !== s.tags;
  if (!tags && bits.length === 0) return null;
  return (
    <small>
      {tags && <TagText tags={s.tags} />}
      {bits.map((b, i) => (
        <span key={b}>
          {(tags || i > 0) && <span className="tag-dot"> · </span>}
          {b}
        </span>
      ))}
    </small>
  );
}

const plain = (e: React.MouseEvent) => !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0);

export function SearchScreen() {
  const nav = getNav();
  const history = useStore(getPrefs().store, (p) => p.history);
  const saved = useStore(getPrefs().store, (p) => p.saved);
  return (
    <div className="screen-frame">
      <h1 tabIndex={-1} className="sr-only">
        Search
      </h1>
      <SearchForm initial="" onSubmit={(t) => openResults(t)} onBack={() => void nav.back()} />

      {history.length > 0 && (
        <section aria-labelledby="recent-h">
          <div className="list-label">
            <h2 id="recent-h">Recent</h2>
            <button type="button" onClick={() => getPrefs().clearHistory()}>
              Clear
            </button>
          </div>
          <div className="chips search-recent">
            {history.map((h) => (
              <button key={h.tags} type="button" className="chip" onClick={() => openResults(h.tags)} data-testid="recent-search">
                <TagText tags={h.tags} />
              </button>
            ))}
          </div>
        </section>
      )}

      {saved.length > 0 && (
        <section aria-labelledby="saved-h">
          <h2 id="saved-h" className="list-label">
            Saved
          </h2>
          <ul className="list-group">
            {saved.map((s) => (
              <li key={s.id} className="list-row saved-row">
                <button
                  type="button"
                  className="saved-open"
                  onClick={() => openResults(s.tags, { ...defaultFilters(), order: s.order, date: s.date })}
                  data-testid="saved-search"
                >
                  <span className="row-well" aria-hidden>
                    <Star />
                  </span>
                  <span className="row-text">
                    <b>{s.name === s.tags ? tagText(s.tags) : s.name}</b>
                    {savedLine(s)}
                  </span>
                </button>
                <button
                  type="button"
                  className="row-more"
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

      <ul className={`list-group${history.length || saved.length ? "" : " search-first"}`}>
        <li>
          <a
            href="/favorites"
            className="list-row"
            onClick={(e) => {
              if (!plain(e)) return;
              e.preventDefault();
              nav.push({ screen: { kind: "favorites", params: "" }, play: null });
            }}
            data-testid="open-favorites"
          >
            <span className="row-well" data-tone="pink" aria-hidden>
              <Heart />
            </span>
            <span className="row-text">
              <b>Your favorites</b>
            </span>
            <ChevronRight aria-hidden className="row-chev" />
          </a>
        </li>
      </ul>
      <a href="https://e621.net/help/cheatsheet" target="_blank" rel="noopener" className="link-row">
        Search cheatsheet <ExternalLink aria-hidden />
      </a>
    </div>
  );
}
