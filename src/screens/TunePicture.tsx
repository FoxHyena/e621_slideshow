"use client";

/**
 * Tune's picture of how For You picks (DESIGN.md "Tune", "How For You picks (the card)"; the owner,
 * 2026-11-27: "Lock it"). Five stops joined by goo, from the favorites to the feed. Each stop names
 * the control on Tune that changes it, and the numbers are the person's own.
 */
import { ArrowDownWideNarrow, Heart, Search, Sparkle, Tag, type LucideIcon } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { searchPosts, type Credentials } from "@/lib/e621/client";
import type { Post } from "@/lib/e621/types";
import { dateMetatag, type DateFilter } from "@/lib/query/date";
import { recommendedWindow } from "@/lib/query/build";
import { blacklistedBy, parseBlacklist } from "@/lib/query/blacklist";
import type { Profile } from "@/lib/recommend/profile";
import { storage } from "@/lib/storage";
import { getSession } from "@/state/session";
import type { SearchSettings } from "@/lib/settings";

/** A tag's weight against the strongest tag's, in fifths, rounded up; a pinned tag has five, a muted one none. */
export function pipsOf(weight: number, max: number, pinned: boolean): number {
  if (pinned) return 5;
  if (!(weight > 0) || !(max > 0)) return 0;
  return Math.min(5, Math.max(1, Math.ceil((5 * weight) / max - 1e-9)));
}

/** Five dots in the tag's colour: "Weight 4 of 5". */
export function Pips({ n, cat }: { n: number; cat: string }) {
  return (
    <span className="pips" role="img" aria-label={`Weight ${n} of 5`} style={{ color: `var(--color-tag-${cat})` }} data-testid="rec-pips" data-n={n}>
      {[1, 2, 3, 4, 5].map((k) => (
        <i key={k} data-on={k <= n || undefined} />
      ))}
    </span>
  );
}

/** "8", "1.1": your share divided by e621's. */
function times(x: number): string {
  return x >= 10 ? Math.round(x).toLocaleString("en") : String(Math.round(x * 10) / 10);
}
/** "62%", "2.4%", "0.3%", "<0.1%" */
function pct(share: number): string {
  const v = share * 100;
  if (v >= 10) return `${Math.round(v)}%`;
  if (v >= 0.1) return `${Math.round(v * 10) / 10}%`;
  return "<0.1%";
}

/** "the last 7 days" and "the week's": the window For You searches, in the card's two clauses. */
export function windowWords(date: DateFilter): { span: string; whose: string } {
  const d = recommendedWindow(date);
  if (!dateMetatag(d)) return { span: "the last 7 days", whose: "the week's" };
  switch (d.mode) {
    case "preset":
      return {
        today: { span: "today", whose: "today's" },
        yesterday: { span: "yesterday", whose: "yesterday's" },
        week: { span: "this week", whose: "the week's" },
        month: { span: "this month", whose: "the month's" },
        year: { span: "this year", whose: "the year's" },
      }[d.preset];
    case "within": {
      const n = Math.floor(d.amount);
      const unit = d.unit.replace(/s$/, "");
      const span = n === 1 ? `the last ${unit}` : `the last ${n} ${d.unit}`;
      const week = (unit === "day" && n === 7) || (unit === "week" && n === 1);
      return { span, whose: week ? "the week's" : n === 1 ? `the ${unit}'s` : "their" };
    }
    case "on":
      return { span: `posts from ${d.date}`, whose: "the day's" };
    case "after":
      return { span: `posts since ${d.date}`, whose: "their" };
    case "before":
      return { span: `posts before ${d.date}`, whose: "their" };
    case "between":
      return { span: `posts from ${d.date} to ${d.date2}`, whose: "their" };
  }
}

/**
 * The newest favorites' thumbs, asked once per account and newest favorite while signed in. In memory
 * only, and forgotten on sign-out. A failed ask is forgotten too, so the next visit asks again.
 */
const thumbsAsked = new Map<string, Promise<Post[] | null>>();
let forgetOnSignOut = false;
const THUMBS = 9;

function useNewestFavorites(profile: Profile, creds: Credentials | null, search: SearchSettings, blacklist: string): Post[] | null {
  const ids = profile.favIds.slice(0, THUMBS + 6);
  const key = `${profile.username}:${ids.join(",")}`;
  const [got, setGot] = useState<{ key: string; posts: Post[] } | null>(null);
  useEffect(() => {
    if (ids.length === 0) return;
    if (!forgetOnSignOut) {
      forgetOnSignOut = true;
      const session = getSession().store;
      session.subscribe(() => {
        if (!session.get().creds) thumbsAsked.clear();
      });
    }
    let ask = thumbsAsked.get(key);
    if (!ask) {
      ask = searchPosts(`id:${ids.join(",")}`, 1, ids.length, creds, undefined, "page").catch(() => {
        thumbsAsked.delete(key);
        return null;
      });
      thumbsAsked.set(key, ask);
    }
    let live = true;
    void ask.then((posts) => live && posts && setGot({ key, posts }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` names the ids
  }, [key, creds]);
  if (!got || got.key !== key) return null;
  // newest favorite first (e621 answers by post number); the blacklist and the ratings hide here as in every feed
  const rules = parseBlacklist(blacklist);
  const byId = new Map(got.posts.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Post => !!p && !!p.files.preview.jpg && search.ratings[p.rating] !== false && !blacklistedBy(rules, p, { username: profile.username }))
    .slice(0, THUMBS);
}

export interface TagShare {
  tag: string;
  cat: string;
  /** share of the favorites, and of e621 */
  mine: number;
  site: number;
  pips: number;
}

function Stop({
  k,
  Icon,
  title,
  note,
  last,
  children,
  text,
}: {
  k: number;
  Icon: LucideIcon;
  title: string;
  note: string;
  last?: boolean;
  children?: ReactNode;
  text?: ReactNode;
}) {
  return (
    <li data-testid="tg-stop">
      <span className="tg-goo" aria-hidden style={{ "--i": k } as CSSProperties} data-last={last || undefined}>
        <i className="n" />
        {!last && (
          <>
            <i className="t" />
            <i className="d" data-testid="tg-drop" />
            <i className="n2" />
          </>
        )}
      </span>
      <span className="tg-glyph" aria-hidden>
        <Icon strokeWidth={2.4} />
      </span>
      <div className="tg-head">
        <h3>{title}</h3>
        <span>{note}</span>
      </div>
      {children && <div className="tg-mini">{children}</div>}
      {text && <p>{text}</p>}
    </li>
  );
}

function TagBars({ t }: { t: TagShare }) {
  const color = `var(--color-tag-${t.cat})`;
  const label = t.tag.replaceAll("_", " ");
  return (
    <div className="tg-tag" data-testid="tg-tag">
      <div className="tg-tag-head">
        <span className="tg-tag-name" style={{ color }}>
          {label}
        </span>
        <span className="tg-tag-x">
          {times(t.mine / t.site)}× e621
          <Pips n={t.pips} cat={t.cat} />
        </span>
      </div>
      <div className="tg-bar" style={{ color }}>
        <span>Yours</span>
        <span className="b">
          <i style={{ width: "100%" }} />
        </span>
        <span className="v">{pct(t.mine)}</span>
      </div>
      <div className="tg-bar" data-site>
        <span>e621</span>
        <span className="b">
          <i style={{ width: `${Math.min(100, (t.site / t.mine) * 100)}%` }} />
        </span>
        <span className="v">{pct(t.site)}</span>
      </div>
    </div>
  );
}

/** The search's picture: two rows of squares, about a quarter lit. A picture, not data. */
const SQUARES = Array.from({ length: 56 }, (_, k) => (k * 37 + 11) % 100 < 27);

export function TunePicture({
  profile,
  creds,
  search,
  blacklist,
  date,
  shown,
  breadth,
  qw,
}: {
  profile: Profile;
  creds: Credentials | null;
  search: SearchSettings;
  blacklist: string;
  date: DateFilter;
  /** the two tags against e621's share */
  shown: TagShare[];
  /** the top tags one search asks for: Breadth, or fewer when e621's tag limit cuts it */
  breadth: number;
  /** Taste or popular: popular's parts against taste's one */
  qw: number;
}) {
  const [hidden, setHidden] = useState(storage.loadTunePictureHidden);
  const toggle = () => {
    setHidden(!hidden);
    storage.saveTunePictureHidden(!hidden);
  };
  const thumbs = useNewestFavorites(profile, creds, search, blacklist);
  const { span, whose } = windowWords(date);
  return (
    <section className="panel-card tg-card" aria-labelledby="tg-title" data-fold={hidden || undefined} data-testid="tune-picture">
      <div className="tg-top">
        <h2 id="tg-title">How For You picks</h2>
        <button type="button" aria-expanded={!hidden} aria-controls={hidden ? undefined : "tg-path"} onClick={toggle} data-testid="tune-picture-fold">
          {hidden ? "Show" : "Hide"}
        </button>
      </div>
      {!hidden && (
        <>
          <svg width="0" height="0" className="tg-filter" aria-hidden focusable="false">
            <defs>
              <filter id="tg-goo" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation={2.4} />
                <feColorMatrix mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
              </filter>
            </defs>
          </svg>
          <ol className="tg-path" id="tg-path">
            <Stop k={0} Icon={Heart} title="Your favorites" note={`${profile.favIds.length.toLocaleString("en")} read`}>
              <div className="tg-thumbs" data-testid="tg-thumbs">
                {Array.from({ length: THUMBS }, (_, k) => {
                  const p = thumbs?.[k];
                  // eslint-disable-next-line @next/next/no-img-element -- remote CDN thumbnails
                  return p ? <img key={p.id} src={p.files.preview.jpg ?? undefined} alt="" loading="lazy" decoding="async" /> : <i key={`e${k}`} />;
                })}
              </div>
            </Stop>
            <Stop
              k={1}
              Icon={Tag}
              title="Your tags"
              note="Pin · Mute"
              text={<>A tag weighs more the further your share is above e621&rsquo;s. Pin puts one on top.</>}
            >
              {shown.length > 0 && (
                <div className="tg-tags">
                  {shown.map((t) => (
                    <TagBars key={t.tag} t={t} />
                  ))}
                </div>
              )}
            </Stop>
            <Stop
              k={2}
              Icon={Search}
              title="The search"
              note={`Breadth · ${breadth} ${breadth === 1 ? "tag" : "tags"}`}
              text={
                <span data-testid="tg-search-text">
                  It looks through {span} for your top {breadth === 1 ? "tag" : `${breadth} tags`}, and adds {whose} most popular.
                </span>
              }
            >
              <div className="tg-squares">
                {SQUARES.map((on, k) => (
                  <i key={k} data-on={on || undefined} />
                ))}
              </div>
            </Stop>
            <Stop
              k={3}
              Icon={ArrowDownWideNarrow}
              title="The order"
              note="Taste or popular"
              text="Taste is how well its tags match yours. Popular is its favorites for its age."
            >
              <div className="tg-mix" data-only={qw === 0 || undefined} data-testid="tg-mix">
                <div className="mx">
                  <i className="a" />
                  <i className="b" style={{ flexGrow: qw }} data-testid="tg-mix-popular" />
                </div>
                <div className="ml">
                  <span>Taste</span>
                  <span>Popular</span>
                </div>
              </div>
            </Stop>
            <Stop k={4} Icon={Sparkle} title="For You" note="Best first" text="Posts you favorited or muted stay out." last />
          </ol>
        </>
      )}
    </section>
  );
}
