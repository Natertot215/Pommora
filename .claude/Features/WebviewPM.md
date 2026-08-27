## Webview

```
Webview
├── Webpage Embeds
├── Engagement & Retention
├── Link Opening
├── Web Sessions
├── The Browser Window
├── Website Hover Previews
└── Pending
```

Pommora's web layer: live websites embedded in Page bodies, an in-app browser, one remembered web session, and live hover previews for website links. Every web surface is an Electron webview guest under one main-process governor, `src/main/webGuests.ts`, which owns what an attach is allowed to be, which session guests live on, where their popups go, and how they track the host's zoom; no surface carries rules of its own. Exactly three renderer components mount a guest — the webpage tile, the browser window, and the hover pane — all on the shared partition.

### Webpage Embeds

A markdown link alone on its own line with an explicit http(s) scheme is a webpage embed: `![Label](url)`, recognized by the grammar in `src/shared/webpageEmbed.ts` and rendered as a live website tile on the shared embed framework, height-draggable and persisted per host and address like a page tile.[^1] The document stays plain CommonMark; a shared vault reads the line as an image reference pointing at a URL. Formation is deliberate: a line the selection sits on stays raw text, and the tile forms when the selection departs, so typing an address never pulls a tile in under the caret. A tile is created through the context menu's **Embed ▸ Webpage**, through **Paste As ▸ Embedded Link** where a copied address meets a blank line, or by hand.

A guest is live only while its tile is fully visible in the scrollport, since a partially clipped webview paints outside its own box; a tile scrolled out keeps its last frame painted on its face, a failed load shows the site's domain, and re-entry retries a failed site. Tile titles are display-only and resolved at render — a hand-written label wins, and an empty one derives through the Nexus's default link format, sharing the fetched-title path the cells use. The tile's grip menu carries **Edit Link**, which returns the tile to its raw address with the address selected, re-forming the tile when the line is left.

### Engagement & Retention

A live tile is inert until clicked in: wheel and pointer pass to the document, and one click engages the site, after which interaction belongs to the page until a click lands outside the tile, Escape is pressed, or the tile scrolls out. Guests that scroll out of view hide rather than unmount, keeping the site's state alive under a capped least-recently-hidden retention (`Embeds/webRetention.ts`); the cap's eviction tears the oldest hidden guest down and its tile reloads fresh on its next entry. Retention carries across tab switches for the page tabs that stay parked, so a site resumes with its session, scroll, and playing media; a tab beyond that reach rebuilds and its sites load fresh.[^2]

### Link Opening

One renderer adjudicator, `src/renderer/src/openWebLink.ts`, decides where every external link opens — editor clicks, table cells, tile titles, and guest popups all route through it — honoring **Open Links In Pommora**: off opens the system browser, on summons the floating in-app browser.[^3] A guest's `window.open` never opens an OS window; main denies it and hands the address to the same adjudicator.

### Web Sessions

Every web surface shares one persistent session partition per machine: sign in to a site in any of them and every other one is signed in, surviving restarts. There is nothing to manage and no settings surface. The session uses a cleaned user agent with a variant for Google's sign-in host, best-effort by design. Embedded pages scale with the window's zoom, times **Webpage Zoom**, times the tile's own Scale where one is set, stamped from main on every navigation.[^3]

### The Browser Window

The **Web Window** (`Windows/WebWindow.tsx`), the in-app browser, is a flavor of the floating window chassis:[^4] back and forward glyphs lead the toolbar, the centered title tracks the guest's current page and escalates it to the system browser on click, and one webview on the shared partition owns the whole body. It is a singleton like the Page Window — a summon while open retakes it in place, re-aiming the standing guest even at an address it has navigated away from — and its geometry persists on its own window id.

### Website Hover Previews

Dwelling on a website link raises the shared hover pane as a live render of the site.[^5] The pane's guest allows no popups and takes no clicks — a glance surface by contract — but it reads past its first screen: the wheel is handed down to the guest through main, since the covering shield holds the pointer on the pane's behalf.

---

#### Pending

- **The browser chrome's treatment** — the bar above a page whose color reads as the page's own isn't settled; the resting shape is the transparent band.
- **Scripted popups** ride the open-link chain without a user-gesture gate — acceptable for trusted embeds, ungated by decision pending.
- **Retention past viewport recycling** — a tile scrolled far enough loses its widget and its guest regardless of the cap.
- **Audio on scroll-out** — a retained guest keeps playing by design; whether scroll-out should mute is open.

[^1]: [[MarkdownPM]] §Embeds · [[SurfacePM]] §The Embed Framework
[^2]: [[NavigationPM]] §Toolbar Tabs
[^3]: [[ConfigurationPM]] §Interface
[^4]: [[InterfacePM]] §Floating Windows
[^5]: [[InterfacePM]] §The Hover Card
