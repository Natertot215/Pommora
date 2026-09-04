## Glance Pane — Decision Log

### Frame

- **Purpose:** Retire `renderer/Links/`, rebuild the hover-preview surface as one host-neutral **Glance Pane** any anchor in the app can raise, re-home the non-glance helpers that live beside it, and settle the code vocabulary so **Window** names the floating secondary window and **Glance** names the hover surface. UI copy is untouched: the user still reads "Open Preview", "Open Connections In Preview", "Hover Preview Linger", and the Open In toggle's "Preview / Full Page".
- **Core Value:** One glance pane with one imperative entry, callable from any anchor element with a page or web target, no editor assumptions baked in.
- **Success Criteria:** Editor links, table cells, and tile bodies glance exactly as today through the new entry; a non-editor host could raise the same pane with no pane-side change; no *code identifier* says "preview" while meaning the floating window or the hover surface. On-disk values, settings keys, and labels keep their words.

### Sources

- `Pommora/src/renderer/Links/ConnectionPane.tsx` — the hover pane today: PickerMenu chassis, page + site flavors, leave lifecycle, five resize strips, focus hand-back through `EditorView.findFromDOM(...).focus()`, double-rAF detachment check, `:hover` re-check after a cold fetch, `pendingFetch` supersession token.
- `Pommora/src/renderer/Links/panePresenter.ts` — the presenter leaf. Its one import is type-only, so no runtime cycle exists today; the leaf is what keeps it that way (`Guidelines/Editor-Internals.md`).
- `Pommora/src/renderer/Links/hoverPaneSize.ts` — one universal size, local_state key `hoverCard`, IPC `hoverCard:load/save`.
- `Pommora/src/renderer/Links/connection-pane.css` — the guest + load shield, the page-tile scroll/inset/fold rules, the portal accent-stroke hook, and five resize strips. The strips share nothing with the col-resize family in `Interactions/resize-strip.css` (different cursors, offsets, corners) and are addressed by a `[class^=]` prefix the accent-stroke rule also reads.
- `Pommora/src/renderer/Links/connectionMenu.ts`, `linkResolve.ts`, `openWebLink.ts` — link menu dispatcher, Link-property resolver, external-link adjudicator. Not glance concerns.
- `Pommora/src/renderer/MarkdownPM/Editor/pointerPath.ts` — `hoverIntent()` + `CONN_HOVER_INTENT_MS`. `pointerHandlers` is instantiated four times per editor (`MarkdownPM/index.tsx:309,318,319,321`: `connectionClicks`, `citationPointer`, `citationRowPointer`, `markdownLinkClicks`), and each instance's `mouseover` calls `intent.cancel()` **before** its `armable()` gate (`pointerPath.ts:119`). Its `mouseout` also cancels. `Tables/cellStatic.tsx:263` has the same pre-gate `onHoverLeave()` in `onMouseOver`, and `onMouseOut` also cancels.
- `Pommora/src/renderer/MarkdownPM/Connections/index.ts` — `ConnectionsApi.hover(page, el)` / `hoverSite(url, el)`. Receivers: `Interface/PageView.tsx:116`, `SurfacePM/TileSurface.tsx:141`, `Windows/PageWindow.tsx:120`, `Windows/NavWindow.tsx:140` (hosts); `Editor/links.ts:70-92` (`dwellTarget`, `armable`), `Editor/connections.ts:68,76`, `Tables/cellStatic.tsx:265` (producers). The `armable` gate reads `api.hover !== undefined`; the pane's own body is fed `resolveOnlyConnections(tree)` which has no `hover`, and that absence is what stops a glance from glancing its own contents.
- `Pommora/src/renderer/MarkdownPM/Editor/connectionHover.test.tsx` — asserts the bloom fires past the dwell by spying `ConnectionsApi.hover`.
- `Pommora/src/renderer/Store/tabState.ts` — `readPageDetail` / `fetchPageDetail` / `fenceWarm`. The pane passes no warm seam today, so each open rebuilds its editor.
- `Pommora/src/renderer/SurfacePM/tileCache.ts` — `tileWarmSeam`: the id/chain-keyed warm store with a `fenceWarm` staleness fence and self-delete. The precedent the glance store copies. `Windows/windowCache.ts` is the unfenced sibling (`useWindowWarm.ts:28-31` fences it).
- `Pommora/src/renderer/SurfacePM/PageTile.tsx:39-44` — `initialEntry` prefers the warm doc over the fresh detail; an unfenced warm store shows stale bodies.
- `Pommora/src/renderer/DesignSystem/Pickers/picker-base.tsx` + `picker-base.css.ts` — the anchored-pane chassis and its shared style layer; `MarkdownPM/AutocompletePane.tsx` styles from it with no sheet of its own.
- `Pommora/src/renderer/MarkdownPM/index.tsx:327-333` — a comment claims a blur handler closes "the connection pane"; the handler closes only the autocomplete (`setAc(null)`), twin at `Tables/CellEditor.tsx:207`. Nothing closes the glance on blur.
- `Pommora/src/renderer/Store/previewSlice.ts`, `Windows/windowTabs.ts`, `main/IO/previewState.ts`, `main/remint.ts:158-163` (fourth writer of the `previews` row), `Store/nexusSlice.ts:125` (`window.nexus.previews.load`) — the floating-window state named "preview".
- `Pommora/src/shared/types.ts` — `OpenIn = 'full-page' | 'page-preview'` (the on-disk sidecar value; `openInField` in `schemas.ts:10` is read by both `coerceOpenIn` and `pageCollectionSidecar.open_in`, the read half of every sidecar read-modify-write in `main/CRUD/containerConfig.ts:37`), `PreviewsFile`, `HoverCardSize`, `Personalization.connectionsOpenInPreview` + `hoverPreviewLinger` (on-disk `.nexus/settings.json` keys, read bare at `main/readNexus.ts:152,156`, pinned by `readNexus.test.ts:639,668`).
- `Pommora/src/shared/bridge.ts` — `previews:load/save`, `hoverCard:load/save`, push `open-in-preview` (sole sender `main/contextMenu.ts:100`; preload method `onOpenInPreview` at `preload/index.ts:184`).
- `Pommora/src/main/Database/localState.ts:24,26` — persisted keys `previews`, `hoverCard`. The ids `page-preview` (`Windows/PageWindow.tsx:186`) and `preview-inspector` (`PageWindow.tsx:209`, `NavWindow.tsx:187`) key **in-memory** session maps (`Interactions/FloatingWindow.tsx:27`, `Windows/window-panel.tsx:19`), not disk.
- Menu action strings: `'title:preview'` (`shared/pageMenu.ts`, `connMenu.ts`, `main/contextMenu.ts:99`), `'link:preview'` (`connMenu.ts`), `'open-preview'` (`shared/navRowMenu.ts:19`), `'preview'` (`shared/tabMenu.ts:16`); flags `preview?: boolean` / `previewing?: boolean`; `shared/cellMenu.ts:133`.
- Non-window "preview" that must NOT rename: `card_banner: 'preview'` (`shared/views.ts:21,121,267`, `Frames/LayoutFrame.tsx:48`, `CardsView.tsx:161`), `stack.top.dropPreview`, `PropertyPreview` (`Frames/GroupFrame.tsx:388`), `AssetImage`'s `preview?: Crop`, `--card-preview-zoom` (`Cards/cards.css`), Showcase `.gl-preview*`, `main/IO/thumbnails.ts`, `Interactions/group.tsx` prose.
- Docs naming Links/ or the hover pane: [[InterfacePM]], [[ConnectionsPM]], [[WebviewPM]], [[ArchitecturePM]], [[DesignSystemPM]], [[ConfigurationPM]], [[SurfacePM]], [[MarkdownPM]], [[InteractionPM]], `Guidelines/Editor-Internals.md` (names `Links/PanePresenter.ts`, wrong casing), `Guidelines/Web-Guests.md`, the Codebase Map in `.claude/CLAUDE.md`, `Planning/RendererRework.md` (R2 cites `Links/connectionMenu`), `scripts/comment-baseline.json` + `comment-units.json` (path-keyed rows under `renderer/Links/`, regenerated by `scripts/comment-ledger.mjs`).

### Decisions

#### A — Decomposition

- **A-1:** [confirmed] Three separable jobs: (1) the code-vocabulary migration, (2) dissolving Links/ and re-homing its helpers, (3) rebuilding the pane host-neutral. Only (3) is design work.

#### B — Vocabulary

- **B-1:** [confirmed] The hover surface is the **Glance**; the action is `glance`. The floating window stays the **Page Window** in code. "Preview" no longer names either in *identifiers*.
- **B-2:** [confirmed] UI copy stands unchanged: "Open Preview", "Open Connections In Preview" and its hint, "Hover Preview Linger", "Preview / Full Page", the `aria-label="Page Preview"`.
- **B-3:** [confirmed] Every on-disk word stands unchanged, because it is the user-facing word: sidecar `open_in: 'page-preview'` (and so the `OpenIn` TS union, which *is* the disk enum), settings.json keys `connectionsOpenInPreview` and `hoverPreviewLinger` (the `Personalization` field names are the disk keys and stay). No coerce, no migration, no format change.
- **B-4:** [confirmed] Renderer + shared + main identifiers meaning the window rename: `previewSlice` → `windowSlice`, `PreviewSlice` → `WindowSlice`, `PreviewState/Tab` → `WindowState/Tab`, `PreviewTabTarget` → `WindowTabTarget`, `PreviewTarget` → `WindowTarget`, `openPreview` → `openWindow`, `openPreviewTab` → `openWindowTab`, `activatePreviewTab` → `activateWindowTab`, `reorderPreviewTabs` → `reorderWindowTabs`, `closePreviewTab` → `closeWindowTab`, `closePreview` → `closeWindow`, `openNavPreview` → `openNavWindow`, `previewsFile` / `PreviewsFile` → `windowsFile` / `WindowsFile`, `PreviewSetRecord` → `WindowSetRecord`, `EMPTY_PREVIEWS` → `EMPTY_WINDOWS`, `previewSlide` → `windowSlide`, `previewExit` → `windowExit`, `previewTargetOf` → `windowTargetOf`, `reconcilePreview` → `reconcileWindow`, `resetPreview` → `resetWindow`, `s.preview` → `s.window`, `main/IO/previewState.ts` → `windowState.ts` (`readWindowsState`, `writeWindowsState`, `sanitizeWindows`), `HoverCardSize` → `GlanceSize`, the in-memory ids `page-preview` → `page-window` and `preview-inspector` → `window-inspector`, `openInPreview` local names → `openInWindow`, `previewing` (menu ctx) → `windowed`, `preview?: boolean` (pageMenu opts) → `window?: boolean`, `setPreviewBody/onPreviewBody/previewBody` → window forms. Preload namespaces: `nexus.previews` → `nexus.windows`, `nexus.hoverCard` → `nexus.glance`, `onOpenInPreview` → `onOpenInWindow`.
- **B-5:** [confirmed] Menu action strings are internal vocabulary and rename: `'title:preview'` → `'title:window'`, `'link:preview'` → `'link:window'`, `'open-preview'` → `'open-window'`, tab menu `'preview'` → `'window'`. Labels beside them keep "Open Preview" (B-2).
- **B-6:** [confirmed] IPC channels rename: `windows:load/save`, `glance:load/save`, push `open-in-window`. Both bridge ends derive from the map; the hand-written preload `on*` method names are the one place the compiler doesn't reach, so they are listed in B-4.
- **B-7:** [assumed] The two persisted local_state keys rename: `previews` → `windows`, `hoverCard` → `glance`. Cost, accepted: one machine loses its remembered window tab sets and glance size once. Window geometry is session-only already and costs nothing.
- **B-8:** [confirmed] Do-not-rename list: everything in the Sources "non-window preview" line. The success criterion is scoped to window/glance senses only.

#### C — The Glance Pane

- **C-1:** [confirmed] One component on the PickerMenu chassis. Files: `Glance/GlancePane.tsx` (component, size accessor + persistence, the bounded warm store), `Glance/glance.ts` (the import-free seam MarkdownPM calls), `Glance/glance-pane.css`, `Glance/glancePane.test.tsx` (ports `connectionPane.test.tsx` + `hoverPaneSize.test.ts`). No `pane-base.css`: `picker-base.css.ts` is the shared base.
- **C-2:** [confirmed] `glance-pane.css` stays and stays small. PickerMenu owns the chassis, but the glance needs rules PickerMenu can't express and inline styles can't reach: the `::before` chevron suppression and `cursor` on `.md-foldable` lines, the `.cm-content` inset KNOB, the `.page-tile` scroll rules, the `:has()` accent-stroke on the portal, and the resize strips. The strips stay here rather than joining `resize-strip.css`: they are a different family and share a `[class^=]` contract with the accent-stroke rule. Class prefix `glance-`.
- **C-3:** [confirmed] Entry contract in `glance.ts`: `armGlance(target, el, dwellMs)`, `cancelGlance()`, `closeGlance()`, plus the presenter slot the pane claims at mount. Target type declared in `glance.ts`: `{ kind: 'page'; id; path } | { kind: 'site'; url }`. The seam imports nothing.
- **C-4:** [confirmed] The seam owns one dwell timer: `armGlance` starts it (re-arm replaces), `cancelGlance` clears it, and the delay is per call. `hoverIntent()` dissolves. **Consequence, load-bearing:** with one timer, the pre-gate `intent.cancel()` at `pointerPath.ts:119` and the pre-gate `onHoverLeave()` at `cellStatic.tsx:263` become killers (three sibling handlers cancel the one that armed). Both are redundant today (`mouseout` already cancels) and are deleted. `connectionHover.test.tsx` keeps asserting the bloom *fires* past the dwell; a test that only asserts `armGlance` was called is vacuous.
- **C-5:** [confirmed] `ConnectionsApi.hover` / `hoverSite` collapse to one hook `glance?: (target, el) => void`, kept **as a hook** (not a direct `armGlance` call from the editor): `armable()` reads its presence, and that is the mechanism by which the pane's own read-only body arms nothing. The four hosts wire `glance: armGlanceAfter(CONN_HOVER_INTENT_MS)` or equivalent; MarkdownPM stays the sole caller and its knob stays in `pointerPath.ts`.
- **C-6:** [confirmed] Resolution order inside the pane: warm store by id → page-detail cache by path → fetch. Open only if `el.isConnected && el.matches(':hover')` after resolution. A newer arm supersedes an in-flight fetch (the token pattern survives).
- **C-7:** [confirmed] The presenter seam stays an import-free leaf (type-only imports at most, declared in the leaf itself).
- **C-8:** [confirmed] Focus: on the pane's `onMouseDown` (before focus moves) record `document.activeElement`; on close, if focus is inside the pane, restore through `EditorView.findFromDOM(recorded)?.focus() ?? recorded.focus()`. `findFromDOM` returns null for a non-editor host, so it is host-neutral, and for an editor it keeps `preventScroll` and the DOM-selection rewrite a bare `.focus()` loses. The pane already imports `EditorView` for the fold toggle.
- **C-9:** [confirmed] Glance-only contract unchanged: no focus on open, no clicks through, text selects read-only, headings fold on click, site flavor takes no clicks and passes only the wheel. No blur-close is added (there is none today; the comment claiming one is fixed).
- **C-10:** [confirmed] Warmth: an id-keyed bounded LRU (KNOB, default 8) of `{ editorState, scrollTop }` inside `GlancePane.tsx`, exposed to `PageTile` as a `WarmSeam` whose `restore` runs `fenceWarm(entry, readPageDetail(path)?.body)` and self-deletes on stale, exactly as `tileWarmSeam` does. Never touches the tab cache or the window cache. No reconcile hook: a deleted page's link no longer resolves, so no glance can be raised on it, and the LRU reclaims the slot.
- **C-11:** [confirmed] `HOVER_ANCESTORS` sentinel becomes `['glance']`; the embed depth guard reads only length and path membership, so it keeps working.
- **C-12:** [confirmed] Detachment check (double rAF on scroll/keydown, `el.isConnected`) is already host-agnostic and stays.

#### D — Re-homing

- **D-1:** [confirmed] `connectionMenu.ts`, `linkResolve.ts`, `openWebLink.ts` move to `renderer/Actions/` unchanged in behavior. Importers repoint: `App.tsx`, `SurfacePM/TileSurface.tsx`, `SurfacePM/WebTile.tsx`, `Interface/PageView.tsx`, `Properties/Assignment/LinkCell.tsx`, `Properties/Assignment/usePropertyRows.ts`, `Properties/Assignment/cardValueInput.ts`, `Properties/PageProperties.tsx`, `Windows/PageWindow.tsx`, `Windows/NavWindow.tsx`, `Views/TableView/TableView.tsx`, `Views/CardView/CardPickerHost.tsx`, `Views/CardView/CardValue.tsx`, `MarkdownPM/Editor/links.ts`, and three MarkdownPM tests.
- **D-2:** [confirmed] `AutocompletePane` keeps its name.

#### E — Reconciliation

- **E-1:** [confirmed] Docs: InterfacePM (Hover Pane section → The Glance Pane; folder list), ConnectionsPM (hover pane → glance; menu table unchanged since labels stand), WebviewPM (hover previews → glances), ArchitecturePM (local_state row, embeds paragraph, session row), DesignSystemPM (GlassPane row), ConfigurationPM (row wording), SurfacePM + MarkdownPM (PageTile consumers), InteractionPM (Bloom takers), Editor-Internals (leaf name/path), Web-Guests (hover pane → glance pane), CLAUDE.md Codebase Map (`// Links` → `// Glance`), RendererRework R2 example, the stale comment at `MarkdownPM/index.tsx:327`.
- **E-2:** [confirmed] `scripts/comment-ledger.mjs` is re-run at closeout so the path-keyed ledgers follow the moves.
- **E-3:** [confirmed] History entry + Handoff at closeout.

### Core (must-have)

- Glance pane raised through `armGlance` from any anchor + target, with today's page and site behaviors intact, including the fenced warm store.
- Editor, table, and tile hosts rewired through the `glance` hook; `hoverIntent` and the two pre-gate cancels gone.
- The code-vocabulary migration (B-4 through B-7) with UI copy and disk words untouched.
- Links/ deleted; helpers in Actions/; docs and ledgers reconciled.

#### Prospects (allowed later, not now)

- **Non-editor glance hosts** — sidebar rows, tabs, view rows, PropertyPanel values. The seam takes any element; the host supplies the dwell. Don't-foreclose: keep `armGlance` free of editor types.
- **Blur-close** — closing the glance on ⌘-Tab / focus leaving the app; none exists today.
- **`remint.ts` origin-key leak** — re-parenting copies a window set to the new id and never drops the old key. Pre-existing, unrelated.

#### Out of Scope

- Any change to the floating windows' behavior or chassis.
- Making the glance interactive.
- Any on-disk or settings-file word.

#### Considered & Rejected

- **Fold the glance into the floating-window chassis** as an anchored non-interactive flavor — the Bloom pane primitive is the canonical anchored surface; a hover affordance sharing a window's focus model eats clicks.
- **A `glanceSlice` in the store** — transient pointer state; store writes on every arm.
- **`pane-base.css`** — `picker-base.css.ts` already is the base.
- **Zero CSS** — pseudo-elements, descendant overrides into MarkdownPM's DOM, and a `:has()` portal hook can't be inline styles; the alternative is pushing glance rules into MarkdownPM's sheet, which is the same CSS in the wrong file.
- **Moving the resize strips to `resize-strip.css`** — different family, splits a prefix-selector contract.
- **Renaming disk values (`page-window` + coerce) and settings.json keys** — the UI word stayed "Preview", so the disk word matches it; a coerce on `coerceOpenIn` alone would have erased the value on the next sidecar read-modify-write.
- **Editor calling `armGlance` directly** — removes the `armable` signal; a glance would glance its own body.
- **Names Peek / Quick Look / Popover** — Glance already appears in the code's own contract language.

#### Lessons

- A "one timer instead of N" change is an ownership change: every sibling that cancels defensively becomes a killer of the one that armed. Audit the cancels, not the arms.
- Distinguish identifier from persisted key by *who writes it*, not where the name appears: `Personalization` field names and the `OpenIn` union are disk keys wearing TS syntax.
- A zod field with a read-side alias must also carry it on every schema that round-trips the file, or the alias erases the value it was meant to keep.
