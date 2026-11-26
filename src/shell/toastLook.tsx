/**
 * How a toast looks (DESIGN.md "Toast", proposed): Sonner unstyled, dressed in the app's own classes.
 * Every toast has a 28 mark: a typed toast's icon from here, a call's own icon (an artist's mark, a
 * glyph), or, for a plain one, a well with an info glyph (CSS). The action is "Undo" with a ring that
 * empties over the toast's 6 s.
 */
import { CircleAlert, Check, Info, TriangleAlert } from "lucide-react";

export const TOAST_ICONS = {
  success: <Check data-tone="ok" />,
  error: <CircleAlert data-tone="danger" />,
  info: <Info />,
  warning: <TriangleAlert data-tone="danger" />,
};

export const TOAST_CLASSES = {
  toast: "toast6",
  icon: "toast6-mark",
  content: "toast6-text",
  title: "toast6-title",
  description: "toast6-sub",
  actionButton: "toast6-undo",
  cancelButton: "toast6-undo",
};

/** A toast with an action stays 6 s (UX.md), one without 4 s. */
export const ACTION_MS = 6000;

let ring = 0;
/** For a toast with an action: its ring restarts even when the toast is updated in place. */
export const actionLook = () => ({ duration: ACTION_MS, classNames: { actionButton: `toast6-undo${++ring % 2 ? "" : " ring-b"}` } });
