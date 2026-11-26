"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

// Slice 1 interim home (ENGINEERING.md §11): today's settings-panel app runs in the
// Following tab until slice 3 replaces it. Its `fixed inset-0` layers stay inside the
// box because the box is a containing block (transform), which keeps them off the tab bar.
const App = dynamic(() => import("@/components/App"), { ssr: false });

export function LegacyHome({
  active,
  immersive,
  onImmersive,
}: {
  /** false while another screen is shown: the app stays mounted but goes quiet */
  active: boolean;
  immersive: boolean;
  onImmersive: (on: boolean) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  // Video keeps playing (with sound) under display: none.
  useEffect(() => {
    if (!active) box.current?.querySelectorAll("video").forEach((v) => v.pause());
  }, [active]);
  return (
    <div ref={box} className="legacy-home" data-immersive={immersive || undefined}>
      <App onScreen={active} onImmersive={onImmersive} />
    </div>
  );
}
