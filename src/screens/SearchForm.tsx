"use client";

/**
 * The tag search form: the field with autocomplete, the tag counter, and Search. Shared by the Search
 * screen and the Results edit sheet; apart from the Search screen so the first load (which has Results'
 * code through the feed screens) doesn't carry the rest of Search.
 */
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import TagInput from "@/components/TagInput";
import { normTags } from "@/lib/feed/filters";
import { buildQuery, DEFAULT_TAG_LIMIT } from "@/lib/query/build";
import { DEFAULT_SEARCH } from "@/lib/settings";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";

/** Show the tag counter once a search uses this many. */
const COUNT_FROM = 30;

export function SearchForm({
  initial,
  onSubmit,
  onBack,
}: {
  initial: string;
  onSubmit: (tags: string) => void;
  /** the Search screen's top row: back, the field, and Search once there's something to search */
  onBack?: () => void;
}) {
  const [tags, setTags] = useState(initial);
  const { creds, user } = useStore(getSession().store, (s) => s);
  const limit = user?.tag_query_limit ?? DEFAULT_TAG_LIMIT;
  const used = buildQuery({ ...DEFAULT_SEARCH, tags }, limit).tagCount;
  const over = used > limit;
  const submit = () => {
    if (!over) onSubmit(normTags(tags));
  };
  const go = (
    <button type="submit" className="btn-gold" data-size="compact" disabled={over} data-testid="search-submit">
      Search
    </button>
  );
  const field = (
    <TagInput
      value={tags}
      onChange={setTags}
      creds={creds}
      label="Search tags"
      placeholder="Search tags"
      onSubmit={submit}
      testId="search-tags"
      variant="field"
      autoFocus={!!onBack}
    />
  );
  return (
    <form
      className="search-form"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {onBack ? (
        <div className="head-row">
          <button type="button" className="toolbar-circle" aria-label="Back" onClick={onBack}>
            <ChevronLeft aria-hidden />
          </button>
          <div className="grow">{field}</div>
          {tags.trim() && go}
        </div>
      ) : (
        field
      )}
      {used > COUNT_FROM && (
        <p className="search-count" data-over={over || undefined} aria-live="polite">
          {used} / {limit} tags{over && ": take some out to search"}
        </p>
      )}
      {!onBack && <div className="search-go">{go}</div>}
    </form>
  );
}
