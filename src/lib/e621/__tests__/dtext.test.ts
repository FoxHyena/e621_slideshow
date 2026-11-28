import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DText } from "../dtext";

const html = (text: string) => renderToStaticMarkup(createElement(DText, { text, onPost: () => {} }));

describe("DText", () => {
  it("makes a header a bold line, not 'h2.' (a friend's report, 2026-11-27)", () => {
    expect(html("h2. behold, the most effective stress relief")).toBe('<p class="dtext-h">behold, the most effective stress relief</p>');
    expect(html("h4#intro. Hello\nworld")).toBe('<p class="dtext-h">Hello</p><p>world</p>');
  });

  it("keeps bold, italic, underline and strike, nested", () => {
    expect(html("[b]big [i]and slanted[/i][/b] [u]u[/u] [s]gone[/s]")).toBe("<p><strong>big <em>and slanted</em></strong> <u>u</u> <s>gone</s></p>");
  });

  it("links open in a new tab; only web links", () => {
    expect(html('"my site":https://example.com/a.')).toBe('<p><a href="https://example.com/a" target="_blank" rel="noopener noreferrer">my site</a>.</p>');
    expect(html('"wiki":[/wiki_pages/help]')).toBe('<p><a href="https://e621.net/wiki_pages/help" target="_blank" rel="noopener noreferrer">wiki</a></p>');
    expect(html("see https://example.com/x, ok")).toBe(
      '<p>see <a href="https://example.com/x" target="_blank" rel="noopener noreferrer">https://example.com/x</a>, ok</p>',
    );
    expect(html('"bad":[javascript:alert(1)]')).toBe("<p>bad</p>");
  });

  it("post #N opens the post page here; wiki and tag links show their words", () => {
    expect(html("after post #123")).toBe('<p>after <a href="/post/123">post #123</a></p>');
    expect(html("[[red_fox]] and [[fox|foxes]] {{wolf solo}}")).toBe("<p>red fox and foxes wolf solo</p>");
  });

  it("paragraphs, line breaks, lists; quote and section tags go, their words stay", () => {
    expect(html("one\ntwo\n\nthree")).toBe("<p>one<br/>two</p><p>three</p>");
    expect(html("* a\n** b\nafter")).toBe('<ul><li>a</li><li data-depth="2">b</li></ul><p>after</p>');
    expect(html("[quote]\nhi\n[/quote]")).toBe("<p>hi</p>");
    expect(html("[section=More]inside[/section]")).toBe("<p>inside</p>");
  });

  it("a spoiler is hidden until tapped", () => {
    expect(html("[spoiler]twist[/spoiler]")).toBe(
      '<p><span class="dtext-spoiler" tabindex="0" role="button" aria-label="Spoiler: tap to show">twist</span></p>',
    );
  });

  it("never makes HTML from the text", () => {
    expect(html("<img src=x onerror=alert(1)>")).toBe("<p>&lt;img src=x onerror=alert(1)&gt;</p>");
  });
});
