// ==UserScript==
// @name         e621 Slideshow button
// @namespace    https://e621.cumdump.dog/
// @version      1.2.0
// @description  Adds an eLicks21 button under the e621 search box that plays the search in eLicks21 (e621.cumdump.dog).
// @match        https://e621.net/*
// @match        https://e926.net/*
// @grant        none
// @run-at       document-end
// @downloadURL  https://e621.cumdump.dog/e621-slideshow.user.js
// @updateURL    https://e621.cumdump.dog/e621-slideshow.user.js
// ==/UserScript==

/*
 * Install
 *   1. Add a userscript manager to your browser:
 *      - Chrome, Edge, Brave, Firefox: Violentmonkey (https://violentmonkey.github.io/)
 *        or Tampermonkey (https://www.tampermonkey.net/)
 *      - Safari (Mac, iPhone, iPad): the free "Userscripts" app from the App Store,
 *        then turn it on in Safari > Settings > Extensions
 *   2. Chrome, Edge, Brave only: open chrome://extensions, click Details on the manager,
 *      and turn on "Allow User Scripts" (older versions: turn on Developer mode instead).
 *      Without this the script installs but never runs.
 *   3. Open https://e621.cumdump.dog/e621-slideshow.user.js; the manager shows an install page.
 *   4. Click Install, then reload any e621 page.
 *   The manager checks that same URL for updates.
 *
 *   No button? Click the manager's toolbar icon on an e621 page: this script should be
 *   listed and switched on. If the list is empty, recheck step 2.
 *
 * Use
 *   ▶ eLicks21 plays what's in the search box (or the pool you're on), the same posts
 *   e621 shows, in your saved slideshow style and speed.
 *
 * Editing: bump @version on every change, or installed copies won't update. @name stays
 * "e621 Slideshow button" (the app's old name): managers know the script by it, so renaming it
 * could leave installed copies behind.
 */

(() => {
  "use strict";

  const SITE = "https://e621.cumdump.dog/";
  const ID = "e6ss-slideshow";
  if (document.getElementById(ID)) return;

  const input =
    document.querySelector('form.post-search-form [name="tags"]') ||
    document.querySelector('#search-box [name="tags"]') ||
    document.querySelector('form[action="/posts"] [name="tags"]');
  if (!input) return;

  /** What the slideshow should play: the search box, else the page's own query, else the pool. */
  function currentTags() {
    const typed = input.value.trim();
    if (typed) return typed;
    const params = new URLSearchParams(location.search);
    const fromUrl = (params.get("tags") || params.get("q") || "").trim();
    if (fromUrl) return fromUrl;
    const pool = location.pathname.match(/^\/pools\/(\d+)/);
    return pool ? `pool:${pool[1]}` : "";
  }

  function slideshowUrl() {
    const tags = currentTags().split(/\s+/).filter(Boolean).join(" ");
    return tags ? `${SITE}?${new URLSearchParams({ tags })}` : SITE;
  }

  const play = document.createElement("a");
  play.id = ID;
  play.textContent = "▶ eLicks21";
  play.title = "Play this search in eLicks21";
  play.target = "_blank";
  play.rel = "noopener noreferrer";
  Object.assign(play.style, {
    display: "block",
    margin: "6px 0",
    padding: "4px 8px",
    borderRadius: "4px",
    background: "#fcb328",
    color: "#152f56",
    fontWeight: "bold",
    textAlign: "center",
    textDecoration: "none",
  });
  play.href = slideshowUrl();
  // Keep the link in step with the box, so middle-click and copy-link work too.
  const refresh = () => (play.href = slideshowUrl());
  input.addEventListener("input", refresh);
  play.addEventListener("mousedown", refresh);
  play.addEventListener("focus", refresh);

  const form = input.closest("form");
  const anchor = (form && form.closest("section.post-search, #search-box")) || form || input;
  anchor.insertAdjacentElement("afterend", play);
})();
