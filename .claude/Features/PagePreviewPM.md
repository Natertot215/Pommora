## Page Preview

The floating page window — a movable, resizable, fully-editable glass window that opens Pages without touching the main pane's selection, tabs, history, or recents (tab-neutral by construction). It is a semi-multi-tabbed mini-app: wiki-links clicked inside it open as tabs beside the origin instead of navigating away, and the whole tab set persists per origin across sessions. One preview exists at a time; a new summon overtakes the window in place.

### The Window

The window is a **PreviewPane** — the shared floating chassis every in-app window mounts. It owns the glass shell, the per-window-id geometry (size persists across opens, position opens centered), the dismissal contract, the toolbar, the side-pane slots, and the footer. Glass colour and opacity are properties of that surface; the preview runs edge-to-edge with no inset ring. The toolbar takes its **band** form here — a full-width strip that is itself a move surface — and content scrolls beneath it: the body is the one scroller, and the editor chain grows to its content instead of scrolling internally. The window opens and closes on a scale-fade.

The toolbar: the scan glyph on the left promotes the page — it opens for real through the normal select while the window plays the **engulf**, a FLIP measured from the window's own rect onto the detail pane's. The same scan targets by the active flavor: on the NavWindow's **map flavor** it promotes the *window* into **NavView** instead, closing the nav window and opening or focusing the single NavView tab — a fixed toolbar target-switch, no engulf. The scan therefore shows on both flavors; the trailing pair stays page-tab-only. Dismiss plays the plain scale-out, and the close reason threads through the store so a promote can never replay as a dismiss or vice versa. The right cluster is a parked Settings glyph, the inspector toggle, and the ×, the pair riding the inspector pane's edge on the same swallow the main toolbar uses while the × holds home.

**Titles morph into tabs.** A single-tab window shows the centered two-tone breadcrumb. The second tab's birth collapses the title left into a standard icon-leading tab in a left-aligned strip; closing back to one tab returns the title the same way. The strip is built on the container-agnostic tab motion layer with its own overflow scroller and edge fade. A label that outruns its tab **eclipses** on the same truncate-then-hover-scroll box every other overflowing surface uses — a fade at the hiding edge, never a hard cut. The map tab is the one exception: it is icon-only, so its name lives in the tooltip.

**The strip compacts off an open side pane.** A wide title stops at the pane's *leading* edge rather than merely clearing the trailing button pair — the pair deliberately lands inside the pane's corner, so a strip that only cleared it would still lay a sliver of tab over the pane. The squeeze derives from the same driver that carries the pane slide and the button swallow, which is why it must never carry a transition of its own: the value is already animating, and transitioning it would retarget every frame and leave the strip chasing the pane. That driver is declared **per window**, never at app level, so one window's pane state can never leak into another's. No pins, no manual +: tabs are born from navigation only. Page tabs drag-reorder within the strip on the toolbar strip's sortable pattern — the map sentinel and closing ghosts stay out of the item set — and the new order persists with the set.

### The Tab Model

A pure model plus store slice, deliberately separate from the app tabs' model: its last-tab close kills the *window* and never reseeds a NavView. Wiki-clicks dedup-focus an existing tab for the same page; closing the active tab falls to its left neighbor; closing the origin re-parents the window to the left-most surviving page tab; the last close kills the window. In the **floating window**, tab switches slide the content on the preview's own slide stamp, and an open inspector rides the same keyframes — the tab slide and pane push are one motion. The NavWindow's flavor hard-swaps its body instead.

### Persistence & Warmth

One device-local row holds the NavWindow flavor's set, the per-origin page sets — re-keyed to the new origin on re-parent, retiring when emptied — and the open pointer, recorded but never auto-summoned at launch. Two machines with different previews open have no correct merge, so each keeps its own. Stored sets hold bare refs; restores hydrate against the live tree before showing — a dead ref drops, a resolving one gets its path minted fresh, an emptied set falls back to the bare origin. A save is one statement, so nothing coalesces and nothing is owed at quit. A foreign-root tree push wipes the per-nexus session state before any reconcile can leak one nexus's sets into another's.

Warmth is session-only and per-tab: serialized editor state, undo included, plus the body's scroll, restored on switch-back with the fetch skipped entirely so the doc mounts synchronously. Captures are liveness-gated so a closed tab's trailing unmount capture can never resurrect its entry.

### Routing In

- **Container views**: a `page-preview` Collection's title clicks open the preview; ⌘-click is always the explicit full-page bypass to a new tab.

- **Sidebar rows**: the same owner-resolution branch, resolved by tree position.

- **Connections**: the nexus-wide `connectionsOpenInPreview` key routes wiki-link clicks to the preview. Being per-nexus, its home is the Settings window's General panel rather than the SettingsPane configuration leaf. ⌘-click always takes the full-page route; from inside a preview it's additive — a new app tab opens behind, the preview stays.

- **⌘N while the floating preview is open** promotes the active tab to a new app tab and closes it (the window when it was the last) — routed through the native menu's new-tab message, since a renderer keydown can't beat a native accelerator.

- **Hover**: resting on a resolved connection past the intent delay blooms the hover card — a backdrop-free pane anchored to the live link, showing a compact read-only preview of the target page through the shared embed framework: no banner and no inline title, the body scrolling inside the card with its scroll contained, links styled but inert, and any embed tiles within rendered inert — a glance surface, never an editor. The card resolves its content before it opens, so a page that can't load simply blooms nothing. One card exists app-wide, mounted once at app level; it follows the link through editor scroll and closes on grace-timed pointer-leave, Escape, any navigation, or the link leaving the viewport. The pointer entering the card never counts as leaving. The card centers itself on the link clamped inside the viewport while the beak slides along its edge to keep pointing at it, and it resizes from its free edges — the right edge, the bottom edge, and their corner, height growing downward only, a card flipped above its link offering width alone. One universal size persists per-machine: every card opens at it, resizing any card updates it for all, floored by knobs and ceilinged by the viewport band actually available beside the link.

### The NavWindow Flavor

The NavWindow is tab 1 of its own flavor: a perma-pinned, icon-only, non-orderable map tab whose content IS the window's whole body. "Open in Preview" from its rows adds page tabs beside it when the window's routing override is on — persisted with the preview sets, default on, with no UI control over it; off routes to the floating window. An active page tab swaps the body for the editable embed and slides the rail closed; the map tab is the return, refocusing the search. The strip lives in the content column beside the full-height rail, so tabs start right of the sidebar exactly like the app's tab bar, and the row exists only past one tab, its height nudging the search down. A page tab whose own icon is the map glyph renders its type icon instead, so nothing masquerades as the pinned tab. Opening the window over a live page preview morphs it — a FLIP from the preview's rect, the outgoing preview hiding instantly — one window changing shape, never a dismiss and a fresh open. The two windows carry different tint opacities, the NavWindow the more opaque of the pair, so the morph steps. The window's tab set is durable multi-session, restored on every open.

### The Inspector

The right-hand pane is a PreviewPane **side slot** in its overlay mode — it rides the window's inset ring and is carried by the window's own openness driver, declared per-window so the main pane's inspector state can never leak into a floating one. The NavWindow hosts the same inspector on its page tabs only, dying on the map return, and the two deliberately **share one remembered width**: one pane, one slot. The favorites rail is the same slot mechanism in its in-flow mode, taking a column in the body row rather than sliding over it. Its body is the front-matter inspector, properties only — no title or banner rows. Two group fields, contexts then properties, sit in rounded quaternary fills below the toolbar strip, each rendering only once something is assigned into it; on an empty page the Add affordance sits alone. Each row is an icon-leading label with its value hugging the right edge, and pickers anchor to that right-side value field. Properties are *assigned*: a row shows once its key exists in front-matter or was revealed this session, assigned-but-empty is valid, "+ Add Property" reveals one, and right-click offers Remove Property — Remove Context on a context row. Editing runs through the table views' own primitives on the optimistic-patch write path.

**The window has a real Subfield footer.** It fills PreviewPane's **footer slot** — the surface owns the bar's collapse, its squeeze away from an open side pane, and the chevron's reveal; the preview supplies the content. The floating window mounts the shared Subfield scoped to its active tab, re-scoping when you switch tabs, so it carries the same location breadcrumb and live counts a full page does. The counts come from a **local** body the window owns, never the app-wide live-body slot, so editing a preview never disturbs the main pane's live count. The footer content aligns to the embed's text column.

### Pending

- The engulf's landing when the promoted page's main-pane fetch outlasts the FLIP; the pane can show the prior view for a beat, usually masked by warmth.

- The nav flavor's last-tab close motion is clipped by the strip row's height collapse (cosmetic).

- Whether the NavWindow should adopt the floating preview's tint so the flavor morph carries one background, or the two stay a step apart — no ruling either way.

- Multi-preview (A-B testing two windows) — the geometry store and slice shapes are ready; the singleton rule is product, not architecture.
