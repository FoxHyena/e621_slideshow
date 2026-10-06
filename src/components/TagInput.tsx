"use client";

import { useEffect, useId, useRef, useState } from "react";
import { autocompleteTags, type Credentials } from "@/lib/e621/client";
import { TAG_CATEGORIES, TAG_CATEGORY_COLORS, type AutocompleteTag } from "@/lib/e621/types";

interface Props {
  value: string;
  onChange: (v: string) => void;
  creds: Credentials | null;
  multiline?: boolean;
  placeholder?: string;
  label: string;
  onSubmit?: () => void;
  rows?: number;
  testId?: string;
}

interface Token {
  start: number;
  end: number;
  /** `-`, `~` or `` */
  prefix: string;
  text: string;
}

/** The whitespace-delimited token around the caret. */
export function tokenAt(value: string, caret: number): Token {
  let start = caret;
  while (start > 0 && !/\s/.test(value[start - 1])) start--;
  let end = caret;
  while (end < value.length && !/\s/.test(value[end])) end++;
  const raw = value.slice(start, end);
  const m = raw.match(/^([-~]?)(.*)$/)!;
  return { start, end, prefix: m[1], text: m[2] };
}

const cache = new Map<string, AutocompleteTag[]>();

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

export default function TagInput({
  value,
  onChange,
  creds,
  multiline,
  placeholder,
  label,
  onSubmit,
  rows = 4,
  testId,
}: Props) {
  const listId = useId();
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<Token | null>(null);
  const [found, setFound] = useState<{ term: string; tags: AutocompleteTag[] }>({ term: "", tags: [] });
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const term = query?.text.toLowerCase() ?? "";
  const searchable = term.length >= 3 && !term.includes(":") && !term.includes("(");

  useEffect(() => {
    if (!searchable) return;
    const cached = cache.get(term);
    const ctrl = new AbortController();
    const t = setTimeout(
      async () => {
        try {
          const tags = cached ?? (await autocompleteTags(term, creds, ctrl.signal));
          cache.set(term, tags);
          setFound({ term, tags });
          setActive(0);
        } catch {
          // aborted or failed: keep the old suggestions
        }
      },
      cached ? 0 : 250,
    );
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, searchable, creds]);

  // Only show suggestions for the token being typed, never stale ones.
  const results = found.term === term ? found.tags : [];
  const showList = open && searchable && results.length > 0;

  const updateToken = (el: HTMLInputElement | HTMLTextAreaElement) => {
    const caret = el.selectionStart ?? el.value.length;
    setQuery(tokenAt(el.value, caret));
    setOpen(true);
  };

  const choose = (tag: AutocompleteTag) => {
    if (!query) return;
    const before = value.slice(0, query.start);
    const after = value.slice(query.end);
    const insert = `${query.prefix}${tag.name}`;
    const spacer = after.startsWith(" ") || after.startsWith("\n") ? "" : " ";
    const next = before + insert + spacer + after;
    onChange(next);
    setOpen(false);
    setQuery(null);
    const caret = before.length + insert.length + 1;
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(caret, caret);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (showList) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % results.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + results.length) % results.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        choose(results[active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && !multiline && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  const common = {
    ref,
    value,
    placeholder,
    "aria-label": label,
    "aria-autocomplete": "list" as const,
    "data-testid": testId,
    spellCheck: false,
    autoCapitalize: "off",
    autoCorrect: "off",
    onKeyDown,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
      updateToken(e.target);
    },
    onClick: (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => updateToken(e.currentTarget),
    onBlur: () => setTimeout(() => setOpen(false), 150),
    className:
      "w-full rounded-md border border-line bg-black/40 px-3 py-2 font-mono text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent focus:outline-none",
  };

  return (
    <div className="relative">
      {multiline ? (
        <textarea rows={rows} role="combobox" aria-controls={listId} aria-expanded={showList} {...common} />
      ) : <input type="text" role="combobox" aria-controls={listId} aria-expanded={showList} {...common} />}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          data-testid="autocomplete"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-line bg-panel-2 py-1 shadow-xl"
        >
          {results.map((tag, i) => {
            const cat = TAG_CATEGORIES[tag.category] ?? "general";
            return (
              <li
                key={tag.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(tag);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-1.5 text-sm ${
                  i === active ? "bg-white/10" : ""
                }`}
              >
                <span className="truncate font-mono" style={{ color: TAG_CATEGORY_COLORS[cat] }}>
                  {tag.antecedent_name && (
                    <span className="text-neutral-400">{tag.antecedent_name} → </span>
                  )}
                  {tag.name}
                </span>
                <span className="shrink-0 text-xs text-neutral-400">{formatCount(tag.post_count)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
