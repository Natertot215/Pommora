## Hover Preview — Implementation Plan

> **Status:** written, pending review · Spec: [[Hover Preview — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

The connection hover card gains its body: resting on a resolved `[[Connection]]` shows the target page's real content in a compact, glanceable floating preview — no navigation, no window. At the end, a card that today blooms empty shows the page (no banner, no inline title), scrolls internally, resizes from its free edges to one universally-remembered size, points its beak at the link from wherever it sits, lingers a user-chosen duration after hover-off, and fires from resting table cells too.

The shape was settled in the decision log through one adversarial round: fill the existing `ConnectionHoverCard` shell with the existing `PageEmbed` renderer rather than building a mini window or a second renderer (both rejected — chassis duplication and the DRY violation the embed framework exists to prevent). The card is glance-only by construction: a resolve-only connections API and an ancestor chain make everything inside it inert. Placement centers on the link with a sliding beak — the toolbar trio's existing pattern, not new machinery.

Deliberately not solved here: in-card clicks opening previews (parked), live-cell connection handlers (parked), per-page default sizes (prospect), the 450ms intent delay as a setting.

**Requirements**

1. The card body renders the target page via read-only `PageEmbed` — no banner, no inline title, embed-scale condensation, internal scroll; the pointer inside the card never counts as hovered-off (A-2, A-3).
2. Everything inside the card is inert: no editing (including nested embed tiles), links styled but dead, clicks do nothing (A-4, A-6, F6/F7 provenance).
3. A failed or unfinished fetch means no card — the body is resolved before the bloom (A-5).
4. The card closes on: leave past the grace/linger, Escape, host navigation, the link leaving the viewport; a click/context-menu on the link cancels a pending intent timer (A-7, A-8, B-4).
5. Placement centers the card on the link clamped to the viewport, the beak sliding to keep pointing at it (B-4).
6. Resize on the right edge, bottom edge, and their corner — height grows downward only; a card flipped above its link offers width alone; the close lifecycle suspends during the drag (B-2, B-5).
7. One universal size, persisted per-machine in `nexus.db`, read through one clamping accessor; max is the viewport, never a knob (B-1, B-3, B-6).
8. At most one card is live app-wide (B-7).
9. Settings ▸ Pages gains the linger slider: None default (stores no key), 0–30s in 1s steps, a per-Nexus personalization key landing in all three contract sites (C-1..C-5).
10. Resting table cells raise the same card; cell activation closes it (D-1..D-3).

**Acceptance — the whole thing working:** In the running app: hover a resolved connection → the card blooms with the page's content, beak on the link; scroll inside it; resize it; hover a different link → the new card opens at the resized size; set the linger to 5s → leaving holds the card five seconds and re-entering cancels; set None → it closes on the short grace; hover a `[[link]]` in a resting table cell → same card; click a link mid-intent → no orphan card blooms; hover a link to a deleted page's title → nothing opens.

**Forced By**

- The card must never eat clicks or steal focus (shell contract, `ConnectionHoverCard.tsx:5-6`) → no dismiss backdrop, `manageFocus` stays false, nothing inside may capture focus.
- `EditorState.readOnly` doesn't block `setEmbedEditing` (a StateEffect), and `interactive = ancestors.length <= 1` (`embedWidget.tsx:280`) → inertness must come from the ancestor chain, not the read-only flag.
- `decorations.ts` gates all connection styling on the api's presence → the body needs a resolve-only api, not an absent one.
- PickerMenu's flip is decided once per open and resets only on `open === false` → retargeting to another link must route through a closed beat.
- `readPersonalization` silently drops unknown keys → the linger key must land in `shared/types.ts`, the coercion pass, and the round-trip test together.
- `localState.ts` deliberately doesn't validate on read → the size clamps in the renderer accessor.
- A hover affordance fires on every mouseover → the class gate stays first; nothing added to the mouseover path may read layout before it.

**Inherited Reasoning**

- Eight resize zones were rejected: an anchored pane has pinned edges, and honest zones are only where the drag can track the pointer. FloatingWindow's grips were rejected for position-coupling.
- The frozen-rect anchor was the placeholder's design; every "the 200ms grace hides it" behavior resurfaces under a 30s linger — that's why the lifecycle work in Phase 1 precedes the body.
- The card resolving content *before* opening is a deliberate divergence from PageEmbed's self-fetching (reconciles A-2 with A-5 and kills the blank-frame bloom).
- The single-card registry, resize flag, and size cache are renderer-module singletons — sanctioned by B-7 (one card app-wide) under today's single `BrowserWindow`. If the preview/nav windows ever become real OS windows, B-7 degrades to one-card-per-window and the size cache needs cross-window invalidation; that's a named revisit, not a today-problem.

**Grounding** *(re-open these; don't cite them)*

- `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx` — the shell this plan fills; every lifecycle change lands here.
- `Pommora/src/renderer/src/MarkdownPM/editor/connections.ts` — the trigger; `CONN_HOVER_INTENT_MS`, the class gate, `resolvedPageAt`.
- `Pommora/src/renderer/src/Embeds/PageEmbed.tsx` — the body renderer; props `{path, editing, onBeginEdit, connections?, locked?, onBody?, warm?, ancestors?, chrome?}`.
- `Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx` — placement (`measure()`, `decidedDir`, origin branches), portal, dismiss.
- `Pommora/src/renderer/src/design-system/components/NotchedPane.tsx` — beak insets (`notchInsetLeft/Right/Bottom`), radius clamping, Bloom origin.
- `Pommora/src/renderer/src/Toolbar/Toolbar.tsx:40-55` — the flow-beak measurement precedent.
- `Pommora/src/renderer/src/design-system/interactions/gesture.ts` — `usePointerGesture`, `swallowActiveEscape`.
- `Pommora/src/renderer/src/MarkdownPM/Tables/cellStatic.tsx` + `TableView.tsx` — static cells; `connections` getter already threaded.
- `Pommora/src/main/db/localState.ts` + `Pommora/src/shared/bridge.ts` — the scope union, `SINGLETON` key, channel declaration pattern.
- `Pommora/src/renderer/src/Settings/SettingsWindow.tsx` — `CATEGORIES`, `TOGGLES`, `ToggleRow`; `design-system/components/Slider/Slider.tsx`.
- `Pommora/src/shared/types.ts` (`Personalization`), `Pommora/src/main/readNexus.ts` (`readPersonalization`), `Pommora/src/main/readNexus.test.ts` (the round-trip key list).
- The four hosts: `Detail/PageView.tsx`, `Blocks/BlockSurface.tsx`, `NavWindow/NavWindow.tsx`, `PagePreview/PreviewWindow.tsx`.

**Environment:** Plan directory `.claude/Planning`. Reviewers: `build-breaking-agent` (attack), `code-simplifier` + `comment-killer-agent` (phase gates), general-purpose as neutral verifier at closeout. Gates below. No sub-agents inside any dispatched brief; one tree-touching writer at a time.

**Shapes:** additive (new behavior → tests first where the seam is testable) · fix (the intent-timer cancel — sibling sweep: contextmenu gets the same cancel) · user-visible (interaction sweep runs at each gate; CDP screenshot per house rule).

**Global Constraints (every task inherits these):**

- Gates: `npm run typecheck` · `npx vitest run` (baseline 2173; read the summary line, `set -o pipefail` on any pipe) · `npx biome lint src`. All three green before every commit.
- Stage explicit paths only (parallel-session discipline). Docs made false ride the commit that falsifies them.
- Comments: why-only, no value restating, no plan references. KNOB markers where Nathan tunes.
- Never add layout reads or allocation to the mouseover path ahead of the class gate.
- Out of scope everywhere: the preview window's own behavior, the intent delay's value, live-cell connection handlers, `PickerMenu`'s non-center origins.

**Made False** *(each rewrite lands in the commit that falsifies it)*

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| [[PagePreviewPM]] :35 | "The trigger, chassis, and dismissal are live; the card's page content is a blank pane." | The body renders the page | 4 |
| [[PagePreviewPM]] :49 (Pending) | "The hover card's embedded page content — its body is a blank pane." | Same | 4 |
| [[PagePreviewPM]] :35 (same paragraph, later beats) | Hover paragraph silent on beak flow / resize / remembered size | Tasks 5–7 add each behavior | 5, 6, 7 |
| [[ConfigurationPM]] :3 | Per-machine chrome enumeration omits hover-card geometry | The size joins `nexus.db` | 7 |
| [[ConfigurationPM]] §Knobs + §Settings Window | Knob list lacks the linger; "rows are the per-Nexus boolean knobs"; "the boolean knobs are round-trip tested together" | New numeric key + slider row | 8 |
| [[ArchitecturePM]] (scope-pair count) | "the four per-machine scope pairs ride one generator" — five exist pre-plan | Already stale; restated countlessly in passing | 7 |
| [[MarkdownPM]] §Tables (grips bullet region) | Cells' connections described without hover | Static cells raise the card | 9 |
| `.claude/Planning/Pending-Work 8-5.md` (hover-card entry) | Lists the card body as pending work | It ships | 10 |

**Dead Vocabulary**

- `PLACEHOLDER contract` (ConnectionHoverCard) → expect 0 in `src`. Legitimate hits: none — the contract stays, the PLACEHOLDER framing goes.
- Control: `LEAVE_GRACE_MS` → ≥1. Zero means the sweep never ran.

---

### Phase 1 — The lifecycle earns the linger

*Base commit recorded in the Log when the phase opens.*

#### Task 1: The trigger cancels on click, and hover hands over a live measure

**Requirement:** 4 (partial: intent cancel + live anchor groundwork)

**Why:** A click inside the 450ms window leaves the timer armed and a card blooms over whatever the click opened — invisible today, an artifact under a linger. And the card's anchor is a rect frozen at fire time; a lingering card must track the link through editor scroll and know when it's gone. Both live in the same file and the same signature, so they're one task.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/connections.ts` — `cancelHover()` added to the `click` and `contextmenu` handlers; the hover fire builds a measure closure.
- Modify: `Pommora/src/renderer/src/MarkdownPM/connections/index.ts` — `ConnectionsApi.hover` signature.
- Modify: `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx` — the hook's `hover` signature takes `measure` and calls it once at open (frozen-rect behavior preserved this commit; Task 2 makes it live). Without this the tree doesn't typecheck between the two commits — the four hosts thread the card's `hover` straight into the api.
- Test: extend the editor-harness coverage beside the existing connection tests (locate via `grep -rn "connectionClicks" --include="*.test.*"`; if none exists, add one on `testing/editorHarness.ts`).

**Interfaces**
- Produces: `hover?: (page: ConnPage, measure: () => DOMRect | null) => void` — `measure` returns the link's current viewport rect, or `null` once the link can't be measured (out of viewport / node gone). Editor-side it wraps the fire-time element: `el.isConnected ? el.getBoundingClientRect() : null`.
- Assumed by: Task 2 (the card stores `measure` instead of a rect), Task 9 (table cells build their own closure over the span).

**Failure half:** a measure whose element detached mid-linger returns `null`, never a zero rect; the card treats `null` as a close condition (Task 2), so nothing downstream sees `0×0` coordinates.

**Steps:**
- [ ] Update the signature in `connections/index.ts`; let typecheck enumerate every consumer (the four hosts' `hover` wiring plus the card).
- [ ] Add `cancelHover()` first in both `click` and `contextmenu`; build the measure closure in the `mouseover` timer fire.
- [ ] Test: armed timer + click → no hover fires past the click (fake timers over the harness).
- [ ] Gates green → commit `fix(connections): a click consumes the hover intent — and hover hands over a live measure`.

#### Task 2: The card lifecycle — live anchor, close conditions, one card, retarget beat

**Requirement:** 4, 8 (and the B-5 grace re-arm groundwork Task 7 rides)

**Why:** Every placeholder behavior the 200ms grace was hiding must go before the body makes cards worth keeping open: the frozen anchor, the ready-branch teardown, per-host duplication, and the per-open flip decision that a linger lets go stale across retargets.

**Files:**
- Modify: `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx` — the bulk of the task.
- Modify: `Pommora/src/renderer/src/Detail/PageView.tsx` — `{hoverCard}` hoisted out of the `'ready'` case; close-on-navigation effect keyed on the page path.
- Modify: `Blocks/BlockSurface.tsx`, `NavWindow/NavWindow.tsx`, `PagePreview/PreviewWindow.tsx` — the same close-on-target-change effect where the host has a changing target.

**Interfaces**
- Produces: module-level `closeActiveHoverCard(): void` exported from `ConnectionHoverCard.tsx` — closes whichever host's card is live. The hook registers/unregisters its own closer on open/close; a second host's `hover` firing calls the previous closer first (one card app-wide).
- The hook stores `{ page, measure }`; the fixed anchor div's position updates from `measure()` on the same rAF-coalesced scroll/resize listeners the grace already needs, and `measure() === null` closes the card.
- Retarget (hover fires while a card is open, same host or other): close, then open the new target on the next frame — the closed beat resets PickerMenu's flip decision and replays the Bloom at the new link.
- Assumed by: Task 6 (suspend flag around the resize drag), Task 7 (grace duration becomes a parameter), Task 9 (cell activation calls `closeActiveHoverCard`).

**Failure half:** a host unmounting with its card open unregisters its closer (effect cleanup) — `closeActiveHoverCard` after that is a no-op, never a call into a dead setter.

**Steps:**
- [ ] Rework the hook: `measure` storage, anchor-div tracking, null-measure close, single-card registry, retarget-through-null.
- [ ] Hoist the card in `PageView` above the status switch; add the navigation-close effects per host.
- [ ] Verify in the running app (CDP): card tracks editor scroll; scrolling the link out closes it; click a link → destination loads with no re-bloom; two hosts → one card; retarget link A → link B **re-blooms from B's beak** rather than teleporting (the closed beat must actually restart the animation — if it doesn't, key the PickerMenu mount per target).
- [ ] Gates green → commit `fix(embeds): the hover card earns a lifetime — live anchor, one card, honest closes`.

#### Gate 1 — lifecycle sound while the body is still blank

- [ ] Gate commands green, exit codes read directly.
- [ ] Simplification + review dispatched against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Running-app pass: the four close conditions + single-card + scroll tracking observed.
- [ ] Re-assess later tasks against what landed; rewrite before dispatching Phase 2.

---

### Phase 2 — The body

#### Task 3: Resolve-first content, resolve-only connections

**Requirement:** 3 (and the data half of 1, 2)

**Why:** A-5 forbids blooming before content exists, and the body needs a connections API that styles links without arming anything. Both are pure logic ahead of the visual mount, testable without a DOM.

**Files:**
- Modify: `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx` — the hover entry resolves the detail before setting state: `readPageDetail(path)` synchronously, else `window.nexus.openPage(path)` → `cachePageDetail` → open only if this hover is still the pending one; a failed result opens nothing.
- Create: the resolve-only api builder beside the hook — `{ resolve, candidates }` passed through, `open` a no-op, `hover`/`menu`/`bypass` absent (satisfies `ConnectionsApi` with its optional members omitted; `open` is required, so it's an explicit no-op with a why-comment).

**Must agree:** the card's "openable" predicate (detail resolved, body non-null) and PageEmbed's own failure render must reach the same answer — the card never opens on a detail PageEmbed would refuse. One test: a `body: null` detail never sets `hovered`.

**Failure half:** the fetch resolving after the pointer left (intent fired, fetch slow, pointer flicked away) → no card. A last-hover-wins token alone can't see a pointer that merely *left*, so the card's lifecycle listeners start at **pending**, not at open: from the moment the fetch begins, the mousemove watcher runs against the link's `measure()` — a pointer observed outside marks the pending open stale, and a resolve landing on a stale token opens nothing. A pointer that never moved is still on the link (the intent delay proves it was there), so opening is correct and the watcher is already live for the grace the moment it moves. A second hover mid-fetch supersedes the first.

**Steps:**
- [ ] Implement resolve-first open + pending-phase lifecycle + the staleness token; unit-test the gate over a stubbed `window.nexus.openPage` (the store tests' stubbing pattern) — including the flick-away-during-fetch case.
- [ ] Measure the cold-open window once in the dev console (`performance.now()` around `openPage` on an untouched page) and note it in the Log — it sizes how routine the stale path is.
- [ ] Build the resolve-only api.
- [ ] Gates green → commit `feat(embeds): the hover card resolves before it blooms`.

#### Task 4: Mount the body

**Requirement:** 1, 2

**Why:** The actual fill. PageEmbed with the card's divergences: inert one level down, chrome-free, internally scrolling at embed scale.

**Files:**
- Modify: `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx` — the empty div becomes: `<PageEmbed path={…} editing={false} onBeginEdit={noop} locked connections={resolveOnly} ancestors={[hostSentinel]} />` inside a sizing/scroll wrapper. `ancestors` non-empty makes every nested tile inert (`interactive = length <= 1` with the embed appending its own path → 2). `--mdpm-scale`/zoom via the same `EMBED_SCALE` pair the preview window sets.
- Modify: `Pommora/src/renderer/src/Embeds/embeds.css` (or a card-scoped block beside it) — the card's scroll-owning wrapper: fixed card size, body `overflow-y: auto`; content wraps to card width (the condensation is width + embed scale, per the log). Plain `.pgembed` inside it, **never** `.pgembed-grows` (that class hands scroll to the host and the CM scroller then owns the wheel correctly at rest); the edge fade comes from PageEmbed's own `edgeFade` prop — don't add it twice.
- Docs (falsified here): `.claude/Features/PagePreviewPM.md` — the hover paragraph (:35) rewritten to the real behavior; the Pending blank-pane line removed.

**Failure half:** a page whose body is empty string renders as an empty scroll area (valid page, valid card), never the failure fallback — `body: ''` ≠ `body: null`.

**Steps:**
- [ ] Mount, style, verify with CDP screenshots: banner-bearing page shows no banner; embed-bearing page's tiles are inert (click → nothing); links styled, clicks dead; wheel scrolls the card only.
- [ ] Rewrite the PagePreviewPM lines in this commit.
- [ ] Gates green → commit `feat(embeds): the hover card shows the page`.

#### Gate 2 — the card is a real preview

- [ ] Gates + simplification + review against the phase range; concerns fixed or ruled.
- [ ] Running-app pass on requirement 1 + 2 behaviors; screenshot shown to Nathan.
- [ ] Re-assess later tasks.

---

### Phase 3 — The beak flows

#### Task 5: Center placement with a sliding beak

**Requirement:** 5

**Why:** The ratified placement — card centered on the link, clamped, beak pointing at it from wherever the card settles — via the toolbar trio's pattern: NotchedPane already takes an arbitrary inset and clamps it clear of the corners; only PickerMenu's centered branch fails to compute one.

**Files:**
- Modify: `Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx` — the `origin === 'center'` branch computes **`notchInsetLeft = c − (left − pw / 2)`** and passes it in `setPos`. `pos.left` is the pane's *center* (the layer renders `translateX(-50%)` under center origin, `PickerMenu.tsx:368-371`) while NotchedPane measures the inset from the left *edge* — subtract the half-width or the beak lands half a card off the link. Unclamped this reduces to `pw / 2`, today's centered beak exactly. Also: an optional `onDirection?: (dir) => void` reports the effective direction (Task 6's flipped-up rule needs it).
- Modify: `ConnectionHoverCard.tsx` — the PickerMenu mount gains `origin="center"`.

**Derivation**
- `rg -l 'origin="center"' src/renderer` → 6 files at planning time: `Blocks/BlockHandleMenu.tsx`, `Components/IconPicker.tsx`, `Components/Detail/PickerControl.tsx`, `design-system/components/TextPicker/TextPicker.tsx`, `PagePreview/PreviewInspector.tsx` (×2 mounts), `Detail/Views/PropertyEditing/PropertyPicker.tsx` (conditional, when `anchorX` set — fed by `CardPickerHost.tsx:179`). Legitimate hits: all keep working — unclamped panes render the identical centered beak; a *clamped* pane's beak now aims at its anchor instead of the pane center, which is the fix, not a regression (the Cards click-anchored picker gains click-aimed beaks near viewport edges).
- Control: `rg -F "PickerMenu" src/renderer` → >10. Zero means the search never ran.

**Steps:**
- [ ] Implement; CDP-verify the three sketch cases: left-edge link (beak left of card center), right-edge link, mid-page link — screenshots to Nathan.
- [ ] Spot-check the six existing consumers unclamped (beak centered as before) and one clamped (beak aims the anchor); state the result in the commit body.
- [ ] Gates green → commit `feat(design-system): the centered pane's beak slides to its anchor`.

#### Gate 3 — placement

- [ ] Gates + review against the range; the beak cases seen running; re-assess.

---

### Phase 4 — Size

#### Task 6: Free-edge resize

**Requirement:** 6

**Why:** The ratified resize: right edge, bottom edge, corner; height downward only; width-only when flipped above; lifecycle suspended mid-drag.

**Files:**
- Modify: `ConnectionHoverCard.tsx` — three strips (`e`, `s`, `se`) absolutely positioned on the card wrapper, cursors `ew-resize`/`ns-resize`/`nwse-resize`, driven by `usePointerGesture` (`activation: 0`, `swallowActiveEscape: true`, the embed-tile resize precedent at `embedWidget.tsx:94-142`); drag writes the size state live (placement re-derives per frame — width distributes around the beak); a module `resizing` flag gates the grace `onMove` (B-5), and after the drop the grace arms only once the pointer has been seen inside again.
- The flipped-up rule: `onDirection` from Task 5 — direction `'up'` hides the `s` and `se` strips.
- Size floors: `KNOB` block — default `{w, h}` and min `{w, h}` (seed sensibly, Nathan tunes). The max is **rendered, not stored**: the card wrapper's width caps at `innerWidth − 2·VIEWPORT_MARGIN` and its height at the band actually available on the placed side of the link (from `measure()` + gap + margin) — PickerMenu's centered branch has no vertical clamp and its flip never re-checks, so a viewport-tall stored size would otherwise open with its top third above the screen where the card's own scroller can't reach.
- Post-drop rule: the grace re-arms on the **first pointer movement after the drop** — not on inside-then-out, which leaves a card released beyond the size cap standing forever (the pointer never re-crosses it).
- Docs (falsified here): the `PagePreviewPM.md` hover paragraph gains the free-edge resize.

**Failure half:** Escape mid-drag aborts the drag to the pre-drag size and the card stays open (`swallowActiveEscape`); `pointercancel`/`lostpointercapture` abort identically (the gesture skeleton owns this).

**Steps:**
- [ ] Build; CDP-verify: e/s/se track the pointer 1:1 on their axes (centered card width grows both sides — expected), drag released outside the card doesn't close it and the next movement arms the grace, Escape aborts without closing, flipped-up card shows no bottom/corner strips, a tall card near a mid-page link caps to the available band.
- [ ] Corner reachability check: NotchedPane clips via `path()` and clip-path clips hit-testing — press the exact rounded corner; if the `se` strip is unreachable there, seat the strips on the un-clipped wrapper layer.
- [ ] Gates green → commit `feat(embeds): the hover card resizes from its free edges`.

#### Task 7: The universal size persists — and the grace learns to read

**Requirement:** 7 (+ the B-5/C-2 grace parameterization Task 8 consumes)

**Why:** The size must survive relaunch per-machine, clamped on read; and the grace duration becomes data so the linger key can drive it.

**Files:**
- Modify: `Pommora/src/main/db/localState.ts` — `'hoverCard'` joins the `Scope` union (singleton key).
- Modify: `Pommora/src/shared/bridge.ts` + `Pommora/src/preload/index.ts` + `Pommora/src/main/index.ts` — `hoverCard:get` / `hoverCard:set` channels on the **tabs/previews/recents singleton shape** (`readValue`/`writeValue`), not the key-scoped embedHeights generator; main-side shape check (`{w: number, h: number}`).
- Create: `Pommora/src/renderer/src/Embeds/hoverCardSize.ts` — THE accessor: async-seeded module cache, clamp against min on read (the sidebar-width precedent, `store.ts:83-92`), write-through on set. Signature takes an optional page path from day one (`size(pagePath?)` — today it ignores it) so the per-page-default prospect adds rows beside the singleton without touching call sites.
- Modify: `ConnectionHoverCard.tsx` — grace duration read from a parameter with the 200ms default (Task 8 wires the setting).
- Docs (falsified here): `ConfigurationPM.md:3` — the per-machine-chrome enumeration gains the hover-card size; the `PagePreviewPM.md` hover paragraph gains the one remembered size; `ArchitecturePM.md`'s per-machine scope-pair count is already stale (says four, five exist) — restate it countlessly while in the file.

**Failure half:** an absent row → defaults; a malformed stored value (hand-edited db, stale shape) → the clamp floor/defaults, never NaN into layout.

**Steps:**
- [ ] Bridge entry + scope + accessor + tests for the clamp (absent, out-of-bounds, valid).
- [ ] Wire the card; relaunch-verify persistence in the dev app.
- [ ] Gates green → commit `feat(embeds): one remembered size for every hover card`.

#### Gate 4 — size

- [ ] Gates + simplification + review against the range; resize + persistence seen running; re-assess.

---

### Phase 5 — The linger

#### Task 8: The Settings ▸ Pages slider

**Requirement:** 9

**Why:** The user-facing knob. None = today's travel-grace; N seconds = the card survives N after leaving link+card, re-entry cancels (already the timer's shape — only the duration changes).

**Files:**
- Modify: `Pommora/src/shared/types.ts` — `hoverPreviewLinger?: number` on `Personalization` (seconds, 1–30; absent = None) + a `coerceHoverLinger` beside `coerceViewScale` (round, clamp, drop 0/invalid to undefined).
- Modify: `Pommora/src/main/readNexus.ts` — the key joins `readPersonalization`'s explicit field list through the coercion.
- Modify: `Pommora/src/main/readNexus.test.ts` — the round-trip key list gains it (the C-3 three-site contract).
- Modify: `Pommora/src/renderer/src/Settings/SettingsWindow.tsx` — `Toggle` becomes a discriminated `Row` union (`{kind:'toggle',…} | {kind:'slider', key, label, hint, min, max, step, format}`); the render path switches on `kind`; the slider row mounts `design-system/components/Slider` (min 0, max 30, step 1, `format: v => v === 0 ? 'None' : `${v}s``), committing 0 as `undefined` (the clean-file discipline).
- Modify: `ConnectionHoverCard.tsx` hosts' wiring — the grace parameter reads the store's `personalization.hoverPreviewLinger` (seconds → ms; absent → 200).
- Docs (falsified here): `.claude/Features/ConfigurationPM.md` — the knob joins §Knobs; the Settings-window "boolean knobs" phrasing widened; §Knobs' closing "the **boolean** knobs are round-trip tested together" widens too, since the numeric key joins that test.

**Negative control:** the round-trip test red with the `readNexus.ts` line removed (the silent-drop failure this key class breeds), green with it — prove both halves once while writing it.

**Failure half:** a hand-typed `"hoverPreviewLinger": 900` clamps to 30 on read; `"abc"` drops to None; `0` stored by an older write reads as None and the next Settings commit removes it.

**Steps:**
- [ ] Types + coercion + test first (red/green against the coercion), then the row union + slider, then the card wiring.
- [ ] Running-app verify: slider live-updates the linger; None restores the quick close; relaunch keeps the value; ConfigurationPM rewritten in this commit.
- [ ] Gates green → commit `feat(settings): the hover preview learns to linger`.

#### Gate 5 — linger

- [ ] Gates + review; the countdown/cancel/None behaviors seen running; re-assess.

---

### Phase 6 — Table cells

#### Task 9: Resting cells join the trigger

**Requirement:** 10

**Why:** D-1: in tables the hover is the *only* link affordance (the live cell has none — D-3, verified), and the card already floats above the table by portal. The trigger logic hoists out of the editor closure so both surfaces share one intent behavior.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/connections.ts` — the intent arm/cancel extracted as a small shared helper (same file or beside it; the editor handler keeps its CM hit-test, the helper owns the timer + delay constant).
- Modify: `Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx` — delegated `onMouseOver`/`onMouseOut` on the table root: class-gate `closest('.md-connection-resolved')` first, resolve by the span's textContent through the threaded `connections` getter, arm the helper with `measure = () => span.isConnected ? span.getBoundingClientRect() : null`.
- Modify: `Pommora/src/renderer/src/MarkdownPM/Tables/cellStatic.tsx` — `StaticCell`'s activate calls `closeActiveHoverCard()` (import from Embeds) alongside its editor swap; the pending intent cancels on the same mousedown.
- Docs (falsified here): `.claude/Features/MarkdownPM.md` — the cells' connections line gains hover; `.claude/Features/TableViewPM.md` if it describes cell link behavior (check at execution).

**Failure half:** an aliased `[[Title|alias]]` span's textContent is the title alone (cellStatic renders content only) → resolves correctly; an ambiguous/phantom title renders without the resolved class → the gate never fires.

**Steps:**
- [ ] Hoist the helper (editor behavior byte-identical — the existing hover test still green unmodified).
- [ ] Wire the table trigger + activation close; CDP-verify: cell hover raises the card above the table, click-to-edit closes it, live cell arms nothing.
- [ ] Docs in this commit; gates green → commit `feat(tables): resting cells raise the hover preview`.

#### Gate 6 — cells

- [ ] Gates + review; the cell flow seen running; re-assess.

---

### Phase 7 — Closeout

#### Task 10: Sweep, claim, verify, attack

- [ ] `.claude/Planning/Pending-Work 8-5.md` hover-card entry removed; `Context.md` untouched here (the handoff owns it).
- [ ] Dead-vocabulary sweep with its control; full gates; the Delivery Claim written.
- [ ] Neutral verifier (claim vs spec vs commit range), then the attack pass, then the running-thing interface pass.
- [ ] Lessons routed; Log closed.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — lifecycle · base `<commit>`
  - [ ] Task 1 — trigger cancel + live measure
  - [ ] Task 2 — card lifecycle
- [ ] **Phase 2** — body
  - [ ] Task 3 — resolve-first + resolve-only
  - [ ] Task 4 — mount
- [ ] **Phase 3** — beak
  - [ ] Task 5 — center placement + sliding beak
- [ ] **Phase 4** — size
  - [ ] Task 6 — free-edge resize
  - [ ] Task 7 — persisted universal size
- [ ] **Phase 5** — linger
  - [ ] Task 8 — the Settings slider
- [ ] **Phase 6** — cells
  - [ ] Task 9 — resting-cell trigger
- [ ] **Phase 7** — closeout
  - [ ] Task 10

### Rulings

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- In-card connection clicks opening a preview (Nathan's parked call) · live-cell connection handlers · per-page default size (prospect; the accessor seam is the door).

### Closeout
