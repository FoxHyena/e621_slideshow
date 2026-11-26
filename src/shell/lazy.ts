"use client";

/**
 * Screens that aren't on show at first load come in their own chunks, so a cold load of
 * /following stays inside the JS budget (ENGINEERING.md §5). They're fetched when the browser is
 * idle after boot, so a tap rarely waits.
 */
import { lazy } from "react";

const feedScreens = () => import("@/screens/FeedScreens");
const searchScreen = () => import("@/screens/SearchScreen");
const forYou = () => import("@/screens/ForYou");
const tune = () => import("@/screens/Tune");
const player = () => import("@/player/Player");
const settingsHome = () => import("@/screens/SettingsHome");
const filterSheets = () => import("@/feed/FilterSheets");
/** The Follow burst and the favourite drip (src/feed/motionFx.ts). */
export const motionFx = () => import("@/feed/motionFx");
/** The error, slow-down and offline states (src/components/StatePanels.tsx). */
const statePanels = () => import("@/components/StatePanels");
/** The tabs and pages not built yet ("Soon"), and Not found. */
const shellScreens = () => import("@/shell/screens");

export const ResultsScreen = lazy(() => feedScreens().then((m) => ({ default: m.ResultsScreen })));
export const FavoritesScreen = lazy(() => feedScreens().then((m) => ({ default: m.FavoritesScreen })));
export const ArtistScreen = lazy(() => feedScreens().then((m) => ({ default: m.ArtistScreen })));
export const SearchScreen = lazy(() => searchScreen().then((m) => ({ default: m.SearchScreen })));
export const ForYouScreen = lazy(() => forYou().then((m) => ({ default: m.ForYouScreen })));
export const TuneScreen = lazy(() => tune().then((m) => ({ default: m.TuneScreen })));
export const SettingsHome = lazy(() => settingsHome().then((m) => ({ default: m.SettingsHome })));
export const PlaceholderScreen = lazy(() => shellScreens().then((m) => ({ default: m.PlaceholderScreen })));
export const NotFoundScreen = lazy(() => shellScreens().then((m) => ({ default: m.NotFoundScreen })));
export const Player = lazy(() => player().then((m) => ({ default: m.Player })));

/** Fetch every screen's code once the page is idle. */
export function prefetchScreens(): () => void {
  const go = () => {
    for (const load of [feedScreens, searchScreen, forYou, tune, player, settingsHome, filterSheets, motionFx, statePanels, shellScreens]) void load().catch(() => {});
  };
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(go, { timeout: 3000 });
    return () => cancelIdleCallback(id);
  }
  const t = setTimeout(go, 1500);
  return () => clearTimeout(t);
}
