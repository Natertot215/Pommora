## Webview

```
Webview
├── Webpage Embeds
├── Engagement & Retention
├── Titles & The Grip
├── Link Opening
├── Web Sessions
├── Website Hover Previews
└── Pending
```

Webview is Pommora's web layer: live websites embedded in Page bodies, an in-app browser, one remembered web session, and live hover previews for website links. Every web surface renders through Electron's webview guests under one main-process governor — the attach validator, the popup router, and the zoom sync live in a single module, and no surface carries its own rules.

### Webpage Embeds

A markdown link alone on its own line, carrying an explicit HTTP(S) scheme, is a webpage embed: the line renders as a live website tile on the shared [[SurfacePM|Embed Framework]] chassis, height-draggable and persisted per host and address like a page tile's. The document bytes stay plain CommonMark — the syntax is the image form, so a shared vault reads the line as an image reference pointing at a URL, a legible and translatable shape.[^1] A tile inside a nested surface — a page embed's body, a page shown in the hover card — renders its face unconditionally; only a page's own body runs live tiles.

Formation is deliberate: a line the selection sits on stays raw text, and the tile forms when the selection departs — typing an address never yanks a tile in under the caret. Creation runs through the context menu's **Embed ▸ Webpage** door, through **Paste As ▸ Embedded Link** where a copied address meets a blank line, or by hand; pasting an address into the empty form writes the address bare rather than nesting a formatted link. The claim is keyed by the address, duplicates allowed, and owned by the same claim machinery page embeds use.

**A guest is live only while its tile is fully visible in the scrollport** — a partially clipped webview paints outside its own box, so visibility management is the rendering model, not an optimization. A tile scrolled out keeps its last frame painted on its face, so a clipped tile reads as a paused page rather than a blank; a failed load shows the site's domain, and a first load with no frame yet is simply blank. Re-entry retries a failed site in the user's presence.

### Engagement & Retention

A live tile is **inert until clicked in**: wheel and pointer pass to the document, and one click engages the site — from there, interaction belongs to the page until a click lands outside the tile, Escape is pressed, or the tile scrolls into the clip zone. Guests scroll out of view, hiding rather than unmounting, keeping the site's own state alive under a capped least-recently-hidden retention; the cap's eviction tears the oldest hidden guest down, and its tile reloads fresh on its next entry.

Retention carries across tab switches for as many recent page tabs as stay parked[^2]: the tab's whole surface is held rather than rebuilt, so its guests pause the way a scrolled-out tile does and resume on return with the session, scroll, and playing media they had. A tab beyond that reach rebuilds its surface, and its sites load fresh.

### Titles & The Grip

Tile titles are display-only and resolved at render — a hand-written label wins, an empty one derives through the nexus's default link format, sharing the fetched-title path table cells use. Nothing is ever written back into the document. The hover-revealed title is itself a link, opening the address per the open-in preference. The tile's grip menu carries **Edit Link** above Delete, and it edits in the line like every other Edit Link does: the tile returns to the raw address it holds with that address selected, so typing replaces it, and leaving the line re-forms the tile. The site is asked to load only once the new address is the document's — nothing reloads to show a caret.

### Link Opening

One renderer adjudicator decides where every external link opens — editor clicks, table cells, tile titles, and guest popups all route through it, honoring the **Open Links In Pommora** preferenc[^3]: off opens the system browser, on summons the floating in-app browser.[^4] A guest's `window.open` never opens an OS window; main denies it and hands the address to the same adjudicator.

### Web Sessions

Every web surface — tiles, the browser, hover cards — shares one session: sign in to a site in any of them, and every other one is signed in, per machine, surviving restarts.[^5] There is nothing to manage and no settings surface; the session simply remembers. The session wears a cleaned user agent, with a further surgical variant for Google's sign-in host, best-effort by design. Embedded pages scale with the window's zoom, times the Webpage Zoom preference, times the tile's own Scale, where one is set, stamped from the main process on every navigation; a tile's Scale applies in one step rather than animating, since a guest re-zooms the whole.

### Website Hover Previews

Dwelling on a website link raises the shared hover card as a live render of the site[^6]: the card opens wearing a quiet cover, the site fades in once it paints, and a page that fails or never paints closes the card whole. The card's guest allows no popups and takes no clicks — a glance surface by contract — but it reads past its first screen: the wheel is handed down to the guest through the main process, since the covering chrome holds the pointer on the card's behalf and the guest would otherwise never see it.

### Pending

- The browser chrome's Safari-style treatment — the bar area above a page whose color reads as the page's own — isn't settled; the resting shape is the transparent band.
- A guest's scripted popups ride the open-link chain without a user-gesture gate — acceptable for trusted embeds, ungated by decision pending.
- Retention is bounded by the editor's viewport recycling: a tile scrolled far enough loses its widget and its guest regardless of the cap.
- A retained guest keeps playing audio by design; whether scroll-out should mute is an open product call.

[^1]: [[MarkdownPM]] §Webpage Embeds
[^2]: [[NavigationPM]] §Toolbar Tabs
[^3]: [[ConfigurationPM]] §Interface
[^4]: [[PagePreviewPM]] §The Browser Flavor
[^5]: [[NavigationPM]] §State Persistence
[^6]: [[PagePreviewPM]] §The Hover Card
