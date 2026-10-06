"use client";

import dynamic from "next/dynamic";

// Everything reads localStorage on first render; skip SSR to avoid hydration mismatches.
const App = dynamic(() => import("./App"), { ssr: false });

export default function ClientApp() {
  return <App />;
}
