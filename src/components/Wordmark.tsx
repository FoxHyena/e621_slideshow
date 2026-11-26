/**
 * The wordmark (DESIGN.md "The wordmark", owner-picked 2026-11-26: "Two-tone"): "eLicks21" set as
 * type, "e" and "21" in Link, "Licks" in the text colour. No shape in it and no file: two tones of
 * one name, read aloud once as "eLicks21". Its size comes from where it sits.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`wm ${className ?? ""}`} role="img" aria-label="eLicks21">
      <span aria-hidden>
        <i>e</i>Licks<i>21</i>
      </span>
    </span>
  );
}
