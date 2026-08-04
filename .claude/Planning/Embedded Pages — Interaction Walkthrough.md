## Embedded Pages — Interaction Walkthrough

The pre-ship interaction checklist, hand-walked across every surface an embed can appear on or interact with. ✔ = already verified live this arc (evidence in the Plan's Log); ▢ = the live-test agent drives it against the scratch ManualNexus instance (CDP, port 9333 — no Playwright). Anything broken or finnicky gets the most minimal fix.

### A — The Page Editor (the feature's home)

- ✔ Lone-line `![[Title]]` renders the tile; raw syntax never shows; prose neighbors untouched.
- ✔ ArrowUp/Down hop the tile both directions; no caret seat on the line.
- ✔ Sliver clicks above/below the tile snap to legal boundary seats.
- ✔ Boundary Backspace and Delete refused; the lone fencing blank refuses deletion; spanning-selection delete removes the tile as its absorbed unit; fenced shape deletes clean.
- ✔ Partial drag-selection into the tile cannot capture it; Delete removes only outside text.
- ✔ Typing `![[` opens the panel; filtered candidates; Enter commits the embed form; tile mounts instantly.
- ▢ The panel's flip-above math at the viewport bottom (the NotchedPane wrapper changed the box).
- ▢ The panel's chrome after the frame fix: rounded frame + shadow + clip present (was a bare blur rectangle).
- ▢ Escape/click-away dismiss the panel; the retract plays.
- ▢ Typing a non-matching query closes the panel; deleting back reopens it.
- ✔ Duplicate lone-line keeps the dim token (first occurrence owns the tile).
- ✔ Unresolved title stays dim; a page appearing under that title mounts the tile (nudge).
- ✔ Deleting/renaming the target on disk degrades the tile without interaction; restore re-mounts it.
- ▢ In-app rename of an embedded page (the cascade): `![[Old]]` rewrites to `![[New]]` in the host file AND the tile survives without degrading (needs a rename via the sidebar/title menu).
- ▢ In-app delete of an embedded page → tile degrades to dim token; restore from trash → tile returns.
- ▢ Undo after: menu delete · menu insert · re-aim · a refused boundary key (nothing to undo) · the boundary-seat repair (one undo unit, caret sane).
- ▢ Mid-document interior seat, both routes: (1) click the tile's very top/bottom edge, (2) caret at the end of the line above + `Ctrl-→` (syntax word-motion — note whether macOS delivers it or Mission Control eats it). From any seat that lands: Backspace, Delete, and typing must all be REFUSED (doc unchanged) — interior damage refuses whole; a boundary-seat insertion repairs onto its own line.

### B — The Tile Itself

- ✔ Rest border = separator token; hover flips to accent at `--duration-base`; editing keeps accent; Escape/click-out exits editing.
- ✔ Click-to-edit → type → 400ms debounce → disk write with frontmatter + foreign keys preserved.
- ✔ Tile rest-scrolls its own overflow; host page scroll untouched; every construct renders inside (headings, marks, lists, checkboxes, quote, callout, hr, code, math, table widget, connections, links).
- ▢ Scroll the tile fully out of view and back: rehydrates from the slot with NO `page:open` refetch (watch main-process log) and no blank frame.
- ▢ Editing continuity: type in a tile, scroll it out and back — the accepted residual is undo-history loss; the TEXT must survive (write-through).
- ▢ Wikilink inside a tile: click navigates (main pane or preview per the nexus setting); hover card triggers; ⌘-click bypass.
- ▢ Checkbox toggle inside a tile at rest (read-only: must NOT toggle) and while editing (must toggle + save).
- ▢ List drag inside an EDITING tile (glyph drag) — works within the tile; autoscroll climbs to the page scroller if the tile can't scroll (the guard).
- ▢ Table interactions inside an editing tile: cell edit, grip menus (the OS table menu should pop — and the embed grip menu must NOT hijack table grips).
- ✔ Grip arms on the tile's line in the gutter.
- ▢ Grip drag relocates the whole tile block (block drag) — insertion line snaps to outer edges; drop above/below other blocks; never into another tile.

### C — Chrome

- ✔ Coverless: centered two-tone breadcrumb reveals on hover at accent timing; correct trail (Collection › Page).
- ✔ Covered: banner band at the KNOB height, absolute, body reserved below; static title over the band.
- ▢ Change Banner from inside a tile (right-click the band): picker → new image → band updates in place, editor NOT remounted (type before/after to confirm no editor teardown). Remove Banner → breadcrumb takes over.
- ▢ Banner change from the MAIN pane while the same page's tile is visible elsewhere — tile updates on next rehydration (accepted: not live).
- ▢ Banner img drag: dragging the band's image must not drop an image ghost into the host contenteditable.
- ▢ Deep-zoom check: tile chrome at the app's zoom steps (grip glyph hit-test still lands).

### D — Grip Menus (all grip kinds)

- ✔ (jsdom) Create/re-aim/delete/dismiss flows with exclusions.
- ▢ LIVE native menu: right-click a paragraph grip → "Embed Page ▸" tree pops (Collections → Sets → Pages); pick inserts fenced below; the generic editor menu does NOT double-pop.
- ▢ Right-click the TILE's grip → "Page Source ▸" + "Delete Embed"; re-aim swaps the tile in place; delete removes tile + one fencing blank.
- ▢ Right-click a callout grip → Delete Callout only (unchanged); a table grip → the table menu (unchanged); a blockquote grip → the GENERIC editor menu (the predicate no longer promises one).
- ▢ Right-click a resolved `[[connection]]` → exactly ONE menu (the gripHot-suppression semantics unknown).
- ▢ A rail grip inside an EDITING tile: the inner editor's own grips work (inner embed menu offers the tree minus the chain); a rail grip in a RESTING tile pops nothing.
- ▢ Right-click a grip when every page is embedded/host → single disabled "Embed Page".

### E — SurfacePM (regression + parity)

- ▢ VISUAL BASELINE after the chassis fold: a block surface's tiles — rest border/radius, hover accent on page tiles, drag (move transition), resize (accent + tracking), borderless style, per-block Scale animation, host lock suppressing accent. One drag + one resize minimum.
- ▢ A `![[Title]]` typed inside a SurfacePM markdown BLOCK: tile mounts, interactive, click-to-edit works; the double-context-menu seam (tile menu vs the surface's background menu).
- ▢ A SurfacePM page-embed TILE whose page contains embeds: nested tiles inert; the outer tile's accent/border states never leak into nested tiles (the F3 chassis fix, visually).
- ▢ Rename a page embedded in a markdown block (the F3 sweep fix): the block's `![[Old]]` heals.

### F — Page Preview + NavWindow

- ▢ A page with tiles opened in the floating preview: tiles render and are interactive (chain [path] → depth 1); editing inside a preview tile saves; the preview's own title/crumbs unaffected.
- ▢ The preview's warm restore on a page with tiles (close, reopen — warm mounts synchronously; tiles rebuild).
- ▢ `![[` autocomplete inside the preview's editor (should work — same editor) and inside a TABLE CELL (must NOT fire — the leak guard).
- ▢ Promote (scan glyph) a previewed page with tiles → main pane keeps the tiles.

### G — Cross-Cutting Lifecycle

- ▢ Two tabs: page A with a tile of B in tab 1; open B in tab 2, edit B, switch back to tab 1 → the tile shows B's new text (remount refetch or slot write-through).
- ▢ Tab switch away + back: tiles rebuild from warm restore; no duplicate editors, no stray listeners (editing state cleared).
- ▢ Nexus-level: quit + relaunch mid-debounce (beforeunload flush) — the tile edit survives on disk.
- ▢ The gallery page (Alpha) end-to-end after everything: all constructs + nested + cycle + image token still render.

### Known-Accepted (do not flag)

Undo loss on scroll-away inside a tile · nested tiles beyond the nudge's reach until a doc change · fresh-on-rehydration (not live) cross-surface body updates · ambiguous titles get no tile · `*` bullets stay plain (standing known issue) · the callout grip's read-only twin (pre-existing, recorded).
