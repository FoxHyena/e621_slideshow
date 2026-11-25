// ==UserScript==
// @name         e621 Slideshow button
// @namespace    https://e621.cumdump.dog/
// @version      1.0.0
// @description  Adds Slideshow and Recommended buttons under the e621 search box that open e621.cumdump.dog.
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
 *   2. Open https://e621.cumdump.dog/e621-slideshow.user.js; the manager shows an install page.
 *   3. Click Install, then reload any e621 page.
 *   The manager checks that same URL for updates.
 *
 * Use
 *   ▶ Slideshow plays what's in the search box (or the pool you're on) with your saved
 *   slideshow settings. ★ Recommended plays from your favorites; sign in on the
 *   slideshow site first.
 *
 * Editing: bump @version on every change, or installed copies won't update.
 */

(() => {
  "use strict";

  const SITE = "https://e621.cumdump.dog/";
  const ID = "e6ss-buttons";
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

  function button(label, title) {
    const a = document.createElement("a");
    a.textContent = label;
    a.title = title;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    Object.assign(a.style, {
      flex: "1",
      padding: "4px 8px",
      borderRadius: "4px",
      background: "#fcb328",
      color: "#152f56",
      fontWeight: "bold",
      textAlign: "center",
      textDecoration: "none",
    });
    return a;
  }

  const row = document.createElement("div");
  row.id = ID;
  Object.assign(row.style, { display: "flex", gap: "6px", margin: "6px 0" });

  const play = button("▶ Slideshow", "Play this search as a slideshow");
  play.href = slideshowUrl();
  // Keep the link in step with the box, so middle-click and copy-link work too.
  const refresh = () => (play.href = slideshowUrl());
  input.addEventListener("input", refresh);
  play.addEventListener("mousedown", refresh);
  play.addEventListener("focus", refresh);

  const rec = button("★ Recommended", "Recommended posts from your favorites (sign in on the slideshow site)");
  rec.href = `${SITE}?mode=recommended`;
  rec.style.flex = "0 0 auto";

  row.append(play, rec);
  const form = input.closest("form");
  const anchor = (form && form.closest("section.post-search, #search-box")) || form || input;
  anchor.insertAdjacentElement("afterend", row);
})();
