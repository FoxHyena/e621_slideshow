"use client";

import dynamic from "next/dynamic";

// The shell reads history and localStorage on its first render, so it never renders on the
// server. Loaded once from the root layout, so it never remounts between routes.
const Shell = dynamic(() => import("./Shell"), { ssr: false });

export default function ClientShell() {
  return <Shell />;
}
