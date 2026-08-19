## Weblink

```
Weblink
├── Webpage Embeds
├── Engagement & Retention
├── Titles & The Grip
├── Link Opening
├── Web Sessions
├── Website Hover Previews
└── Pending
```

Weblink is Pommora's web layer: live websites embedded in Page bodies, an in-app browser, one remembered web session, and live hover previews for website links. Every web surface renders through Electron's webview guests under one main-process governor — the attach validator, the popup router, and the zoom sync live in a single module, and no surface carries its own rules.

### Webpage Embeds

A markdown link alone on its own line, carrying an explicit http(s) scheme, is a webpage embed: the line renders as a live website tile on the shared [[SurfacePM|Embed Framework]] chassis, height-draggable and persisted per host and address like a page tile's. The document bytes stay plain CommonMark — the syntax is the image form, so a shared vault reads the line as an image reference pointing at a URL, a legible and translatable shape (→ [[MarkdownPM]] §Webpage Embeds). A tile inside a nested surface — a page embed's body, a page shown in the hover card — renders its face unconditionally; only a page's own body runs live tiles.

Formation is deliberate: a line the selection sits on stays raw text, and the tile forms when the selection departs — typing an address never yanks a tile in under the caret. Creation runs through the context menu's **Embed ▸ Webpage** door or by hand; pasting an address into the empty form writes the address bare rather than nesting a formatted link. The claim is keyed by the address, duplicates allowed, and owned by the same claim machinery page embeds use.

**A guest is live only while its tile is fully visible in the scrollport** — a partially clipped webview paints outside its own box, so visibility management is the rendering model, not an optimization. A tile scrolled out keeps its last frame painted on its face, so a clipped tile reads as a paused page rather than a blank; a failed load shows the site's domain, and a first load with no frame yet is simply blank. Re-entry retries a failed site in front of the user.

### Engagement & Retention

A live tile is **inert until clicked in**: wheel and pointer pass to the document, and one click engages the site — from there interaction belongs to the page until a click lands outside the tile, Escape is pressed, or the tile scrolls into the clip zone. Guests scrolled out of view hide rather than unmount, keeping the site's own state alive under a capped least-recently-hidden retention; the cap's eviction tears the oldest hidden guest down, and its tile reloads fresh on its next entry.

### Titles & The Grip

Tile titles are display-only and resolved at render — a hand-written label wins, an empty one derives through the nexus's default link format, sharing the fetched-title path table cells use. Nothing is ever written back into the document. The hover-revealed title is itself a link, opening the address per the open-in preference. The tile's grip menu carries **Edit Link** above Delete: a popover re-aims the whole line at a new address in place, migrating the tile's remembered height with it, and refusing an address the grammar can't round-trip rather than dissolving the tile into text.

### Link Opening

One renderer adjudicator decides where every external link opens — editor clicks, table cells, tile titles, and guest popups all route through it, honoring the **Open Links In Pommora** preference (→ [[ConfigurationPM]] §Files & Links): off opens the system browser, on summons the floating in-app browser (→ [[PagePreviewPM]] §The Browser Flavor). A guest's `window.open` never opens an OS window; main denies it and hands the address to the same adjudicator.

### Web Sessions

Every web surface — tiles, the browser, hover cards — shares one persistent session partition: sign into a site in any of them and every other one is signed in, per machine, surviving restarts. There is nothing to manage and no settings surface; the partition simply remembers. The session wears a cleaned user agent, with a further surgical variant for Google's sign-in host, best-effort by design. Embedded pages scale with the window's zoom times the **Webpage Zoom** preference, stamped from the main process on every navigation.

### Website Hover Previews

Dwelling on a website link raises the shared hover card as a live, non-interactive render of the site (→ [[PagePreviewPM]] §The Hover Card): the card opens wearing a quiet cover, the site fades in once it paints, and a page that fails or never paints closes the card whole. The card's guest takes no interaction and allows no popups — a glance surface by contract.

### Pending

- The browser chrome's Safari-style treatment — the bar area above a page whose color reads as the page's own — isn't settled; the resting shape is the transparent band.
- Website links in resting table cells don't arm the hover preview yet; the same link previews in the body.
- A guest's scripted popups ride the open-link chain without a user-gesture gate — acceptable for trusted embeds, ungated by decision pending.
- Retention is bounded by the editor's viewport recycling: a tile scrolled far enough loses its widget and its guest regardless of the cap.
- A retained guest keeps playing audio by design; whether scroll-out should mute is an open product call.
