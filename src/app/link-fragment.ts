/**
 * Runs inline in <head>, before Next hydrates and records the URL: moves a share link's
 * sign-in fragment (`#u=…&k=…`) into memory and strips it from the address bar and the
 * history entry, so the key never sits in a URL Next or the shell keeps (ENGINEERING.md §1).
 */
export const LINK_FRAGMENT_SCRIPT = `(function(){try{var h=location.hash;if(!new URLSearchParams(h.slice(1)).has("k"))return;window.__e6link=h;history.replaceState(history.state,"",location.pathname+location.search)}catch(e){}})();`;
