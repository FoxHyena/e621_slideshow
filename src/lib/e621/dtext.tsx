/**
 * A post's description, from e621's DText (https://e621.net/help/dtext) to React: the common parts
 * only, and never as HTML. Headers (h1. to h6.) are bold lines; [b] [i] [u] [s] [sup] [sub] keep
 * their look; [spoiler] is hidden until tapped; links open in a new tab (web links only); "post #123"
 * opens that post's page here; [[wiki]] and {{tags}} show their words. Quote, section, code and the
 * like keep their text without the tags. Anything else stays as written.
 */
import { Fragment, type ReactNode } from "react";

/** A link e621 would make: only web addresses (no javascript:, data: and the like). */
function webUrl(u: string): string | null {
  const url = u.startsWith("/") ? `https://e621.net${u}` : u;
  try {
    const p = new URL(url);
    return p.protocol === "https:" || p.protocol === "http:" ? p.href : null;
  } catch {
    return null;
  }
}

const ext = (href: string, kids: ReactNode, key: number) => (
  <a key={key} href={href} target="_blank" rel="noopener noreferrer">
    {kids}
  </a>
);

const STYLE: Record<string, string> = { b: "strong", i: "em", u: "u", s: "s", sup: "sup", sub: "sub" };

/**
 * Inline DText, earliest match first. `post` opens a post's page in the app (a click handler, so
 * the description stays plain links for screen readers).
 */
const INLINE = new RegExp(
  [
    String.raw`\[(?<tag>b|i|u|s|sup|sub|spoiler)\](?<inner>[\s\S]*?)\[\/\k<tag>\]`,
    String.raw`\[color(?:=[^\]]*)?\](?<colored>[\s\S]*?)\[\/color\]`,
    String.raw`"(?<qText>[^"\n]+)":\[(?<qUrl>[^\]\s]+)\]`,
    String.raw`"(?<lText>[^"\n]+)":(?<lUrl>(?:https?:\/\/|\/)[^\s<>"]*[^\s<>".,;:!?)\]])`,
    String.raw`<(?<angle>https?:\/\/[^>\s]+)>`,
    String.raw`(?<bare>https?:\/\/[^\s<>"]*[^\s<>".,;:!?)\]])`,
    String.raw`\[\[(?<wiki>[^\]|\n]+)(?:\|(?<wikiText>[^\]\n]*))?\]\]`,
    String.raw`\{\{(?<tags>[^}\n]+)\}\}`,
    String.raw`\bpost #(?<postId>\d{1,10})\b`,
    String.raw`\[\/?[a-z]+(?:[=,][^\]]*)?\]`,
  ].join("|"),
  "gi",
);

export function inline(text: string, post: (id: number) => void, key = { n: 0 }): ReactNode[] {
  const out: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > at) out.push(text.slice(at, m.index));
    at = m.index + m[0].length;
    const k = key.n++;
    const whole = m[0];
    const { tag, inner, colored, qText, qUrl, lText, lUrl, angle, bare, wiki, wikiText, tags, postId } = m.groups ?? {};
    if (colored !== undefined) out.push(<Fragment key={k}>{inline(colored, post, key)}</Fragment>);
    else if (tag !== undefined) {
      const t = tag.toLowerCase();
      const kids = inline(inner, post, key);
      if (t === "spoiler")
        out.push(
          <span
            key={k}
            className="dtext-spoiler"
            tabIndex={0}
            role="button"
            aria-label="Spoiler: tap to show"
            onClick={(e) => e.currentTarget.setAttribute("data-shown", "")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), e.currentTarget.setAttribute("data-shown", ""))}
          >
            {kids}
          </span>,
        );
      else {
        const El = STYLE[t] as "strong";
        out.push(<El key={k}>{kids}</El>);
      }
    } else if (qText !== undefined || lText !== undefined) {
      const href = webUrl(qUrl ?? lUrl);
      const label = qText ?? lText;
      out.push(href ? ext(href, label, k) : label);
    } else if (angle !== undefined || bare !== undefined) {
      const href = webUrl(angle ?? bare);
      out.push(href ? ext(href, angle ?? bare, k) : whole);
    } else if (wiki !== undefined) out.push((wikiText || wiki).replaceAll("_", " "));
    else if (tags !== undefined) out.push(tags.replaceAll("_", " "));
    else if (postId !== undefined) {
      const id = Number(postId);
      out.push(
        <a
          key={k}
          href={`/post/${id}`}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            post(id);
          }}
        >
          post #{id}
        </a>,
      );
    }
    // else: a tag with no partner ([quote], [section=…], [/code]…): left out, its text stays
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

/** The description's blocks: paragraphs, headers and list items, one line break apart inside. */
export function DText({ text, onPost }: { text: string; onPost: (id: number) => void }) {
  const key = { n: 0 };
  const blocks: ReactNode[] = [];
  const paras = text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/);
  for (const para of paras) {
    const lines = para.split("\n");
    let run: string[] = [];
    let items: ReactNode[] = [];
    const flush = () => {
      if (run.length) {
        const k = key.n++;
        blocks.push(
          <p key={k}>
            {run.map((l, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {inline(l, onPost, key)}
              </Fragment>
            ))}
          </p>,
        );
        run = [];
      }
      if (items.length) {
        blocks.push(<ul key={key.n++}>{items}</ul>);
        items = [];
      }
    };
    for (const line of lines) {
      const h = line.match(/^h[1-6](?:#[\w-]+)?\.\s*(.*)$/i);
      const li = line.match(/^(\*+)\s+(.*)$/);
      if (h) {
        flush();
        if (h[1].trim())
          blocks.push(
            <p key={key.n++} className="dtext-h">
              {inline(h[1], onPost, key)}
            </p>,
          );
      } else if (li) {
        if (run.length) flush();
        items.push(
          <li key={key.n++} data-depth={li[1].length > 1 ? li[1].length : undefined}>
            {inline(li[2], onPost, key)}
          </li>,
        );
      } else {
        if (items.length) flush();
        if (/^\s*\[\/?(?:quote|section|code|table|tr|td|th|thead|tbody)(?:[=,][^\]]*)?\]\s*$/i.test(line)) continue;
        run.push(line);
      }
    }
    flush();
  }
  return <>{blocks}</>;
}
