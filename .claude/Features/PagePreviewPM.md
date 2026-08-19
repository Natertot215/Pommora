## Page Preview

```
Page Preview
├── The Window
├── The Tab Model
├── Persistence & Warmth
├── Routing In
├── The Browser Flavor
├── The Hover Card
├── The NavWindow Model
├── The Inspector
├── The Token Contract
└── Pending
```

The floating page window — a movable, resizable, fully-editable glass window that opens Pages without touching the main pane's selection, tabs, history, or recents. It is a semi-multi-tabbed mini-app: wiki-links clicked inside it open as tabs beside the origin instead of navigating away, and the whole tab set persists per origin across sessions. One preview exists at a time; a new summon overtakes the window in place.

### The Window

The window is a **PreviewPane** — the shared floating chassis every in-app window mounts. It owns the glass shell, the per-window-id geometry (size persists across opens, position opens centered), the dismissal contract, the toolbar, the side-pane slots, and the footer. Glass color and opacity are properties of that surface; the preview runs edge-to-edge with no inset ring. The toolbar takes its **band** form here — a full-width strip that is itself a move surface — and content scrolls beneath it: the body is the one scroller, and the editor chain grows to its content instead of scrolling internally. The window opens and closes on a scale-fade.

The toolbar's scan glyph on the left promotes the page — it opens for real through the normal select while the window plays the **engulf**, a FLIP measured from the window's own rect onto the detail pane's. The same scan targets by the active flavor: on the NavWindow's map flavor it promotes the window into **NavView** instead, closing the nav window and opening or focusing the single NavView tab, with no engulf. Dismiss plays the plain scale-out, and the close reason threads through the store so a promote and a dismiss never replay as each other. The right cluster is a parked Settings glyph, the inspector toggle, and the ×, the pair riding the inspector pane's edge on the same swallow the main toolbar uses while the × holds home.

### The Tab Model

A pure model plus store slice, separate from the app tabs' model — its last-tab close kills the window and never reseeds a NavView. Wiki-clicks dedup-focus an existing tab for the same page; closing the active tab falls to its left neighbor; closing the origin re-parents the window to the left-most surviving page tab; the last close kills the window. In the floating window, tab switches slide the content on the preview's own slide stamp, and an open inspector rides the same keyframes — the tab slide and pane push are one motion. The NavWindow's flavor hard-swaps its body instead.

**Titles morph into tabs.** A single-tab window shows the centered two-tone breadcrumb. The second tab's birth collapses the title left into a standard icon-leading tab in a left-aligned strip; closing back to one tab returns the title the same way. The strip is built on the container-agnostic tab motion layer with its own overflow scroller and edge fade. A label that outruns its tab eclipses on the same truncate-then-hover-scroll box every overflowing surface uses. The map tab is the one exception — icon-only, its name in the tooltip.

The strip compacts off an open side pane, stopping at the pane's leading edge rather than merely clearing the trailing button pair, which lands inside the pane's corner. No pins and no manual + — tabs are born from navigation only. Page tabs drag-reorder within the strip on the toolbar strip's sortable pattern, and the new order persists with the set.

### Persistence & Warmth

The window's tab sets are kept per machine (→ [[NavigationPM]] §State Persistence) — the NavWindow flavor's set, the per-origin page sets, re-keyed to the new origin on re-parent and retiring when emptied, and the open pointer, recorded but never auto-summoned at launch. Two machines with different previews open have no correct merge, so each keeps its own. Stored sets hold bare refs; restores hydrate against the live tree before showing — a dead ref drops, a resolving one gets its path minted fresh, an emptied set falls back to the bare origin. A foreign-root tree push wipes the per-nexus session state before any reconcile can leak one nexus's sets into another's.

Warmth is per-tab: serialized editor state, undo included, plus the body's scroll, restored on switch-back with the fetch skipped entirely so the doc mounts synchronously.

### Routing In

- **Container views** — a `page-preview` Collection's title clicks open the preview; ⌘-click is always the explicit full-page bypass to a new tab.
- **Sidebar rows** — the same owner-resolution branch, resolved by tree position.
- **Connections** — the nexus-wide `connectionsOpenInPreview` knob routes wiki-link clicks to the preview (→ [[ConfigurationPM]]); from inside a preview a ⌘-click is additive — a new app tab opens behind, the preview stays.
- **⌘N while the floating preview is open** promotes the active tab to a new app tab and closes it (the window when it was the last) — routed through the native menu's new-tab message, since a renderer keydown can't beat a native accelerator.

### The Browser Flavor

The in-app browser is a flavor of the same floating window (→ [[WebviewPM]]): back and forward glyphs lead the toolbar where the page flavor carries its promote scan, the centered two-tone title tracks the guest's current page and escalates it to the system browser on click, and one webview on the shared web partition owns the whole body. The toolbar strip holds its own band above the page and paints nothing — the window glass shows through it. The window is a singleton like the page preview: a summon while open retakes it in place, re-aiming the standing guest even at an address it has navigated away from. Geometry persists on its own window id through the shared floating-window mechanics.

### The Hover Card

Resting on a resolved connection past a short intent delay raises the hover preview card — a compact, read-only view of the target page rendered through the shared embed framework without its banner or inline title, on the PickerMenu chassis rather than a PreviewPane, mounted once at app level so one card exists app-wide. The card resolves its content before it opens (a page that can't load opens nothing), everything inside it renders inert, and it centers on the live link, tracking it as the line reflows.

The card has a second flavor: a markdown link naming a website raises the same card as a live, non-interactive render of the site itself (→ [[WebviewPM]]). The site card opens on the dwell wearing a quiet cover that fades once the page has painted; a page that fails or never paints closes the card whole. The guest fills the card edge-to-edge, a shield above it keeps every pointer event on the card's own lifecycle — passing down the wheel alone, so the site scrolls without becoming clickable — and the same anchor, leave, linger, and resize behavior carries over unchanged.

Content scrolls within the card, headings fold on click, and the caret never enters. It anchors to the link through scroll and closes on hover-off, Escape, navigation, or the link leaving view; the Settings ▸ Pages linger slider extends the stay (→ [[ConfigurationPM]]). It resizes from its right and bottom edges to one per-machine remembered size.

### The NavWindow Model

The NavWindow is tab 1 of its own in-app pane: a perma-pinned, icon-only, non-orderable map tab whose content is the window's whole body. "Open Preview" from its rows adds page tabs beside it when the window's routing override is on; off routes to the floating window. An active page tab swaps the body for the editable embed and slides the rail closed; the map tab is the return, refocusing the search. The strip lives in the content column beside the full-height rail, so tabs start right of the sidebar exactly like the app's tab bar, and the row exists only past one tab, its height nudging the search down. A page tab whose own icon is the map glyph renders its type icon instead. Opening the window over a live page preview morphs it — a FLIP from the preview's rect, the outgoing preview hiding instantly — one window changing shape rather than a dismiss and a fresh open. Both windows wear the same window-tier glass, so the morph changes shape without changing background. The window's tab set is durable multi-session, restored on every open.

### The Inspector

The right-hand pane is a PreviewPane **side slot** in its overlay mode — it rides the window's inset ring and is carried by the window's own openness driver, declared per-window so the main pane's inspector state can't leak into a floating one. The NavWindow hosts the same inspector on its page tabs only, dying on the map return, and the two share one remembered width. The favorites rail is the same slot mechanism in its in-flow mode, taking a column in the body row rather than sliding over it.

Its body is the front-matter inspector, properties only — no title or banner rows. Two group fields, contexts then properties, sit in rounded quaternary fills below the toolbar strip, each rendering only once something is assigned into it; on an empty page the Add affordance sits alone. Each row is an icon-leading label with its value hugging the right edge, and pickers anchor to that right-side value field. Properties are assigned: a row shows once its key exists in front-matter or was revealed this session, assigned-but-empty is valid, "+ Add Property" reveals one, and right-click pops the page-value property menu the main pane's own properties pane uses — Clear on a filled row, then Remove. Editing runs through the table views' own primitives on the optimistic-patch write path.

**The window has a real Subfield footer.** It fills PreviewPane's footer slot — the surface owns the bar's collapse, its squeeze away from an open side pane, and the chevron's reveal; the preview supplies the content, mounting the shared Subfield scoped to its active tab. The footer content aligns to the embed's text column.

### The Token Contract

**SOURCE:** `Pommora/src/renderer/src/design-system/components/PreviewPane/previewPane.css`

The window states its own dimensions — its toolbar height, the width of each side pane, its footer height, and how far the trailing controls slide aside as a pane opens. A host that embeds the window may retune any of them for itself without editing the window: the navigation window widens the trailing gap and sets its own reveal distances, and the floating preview supplies its footer height.

A floating window is sealed off from the main shell's own pane geometry, so opening the inspector behind it never shifts anything inside it.

### Pending

- The engulf's landing when the promoted page's main-pane fetch outlasts the FLIP; the pane can show the prior view for a beat, usually masked by warmth.
- The nav flavor's last-tab close motion is clipped by the strip row's height collapse (cosmetic).
- Multi-preview (A-B testing two windows) — the geometry store and slice shapes are ready; the singleton rule is product, not architecture.
