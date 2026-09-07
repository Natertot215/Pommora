## Hover Previews (Glance) — Cross-Surface, Persistence & Lock — Implementation Plan

> **Status:** ratified — in execution · Spec: this conversation's ratified decisions (no separate spec doc) · Execute tasks in order.
> Citations name files and symbols; re-derive before editing — the tree moves. Runs alongside a parallel PropertyPanel session on a shared tree: **commit only glance files by explicit path**, never `git add -A`/`.`.

**Goal**

Extend the existing Glance hover-preview pane from its single editor host to every page-nav surface, put its whole persistence story under one settings control, and let a preview be pinned in place. At the end: hovering a resolvable page anywhere except trash/history raises a preview; one **Preview Persistence** setting turns previews off or sets how long they linger (Off / 1s / 5s / 10s / Until Closed); a lock icon pins a page preview so it survives navigation, scroll, and tab-switching until closed; and Esc closes any preview.

This takes the shape it does because the pane was **built for it**: the Glance pane was documented from the start as reachable by any host — a sidebar row, a tab, a view row — through one call, the dwell map is a documented per-surface enum (`glanceAction.ts:9-11`, *"further surfaces add their own rows"*), and PickerMenu already floats at a fixed unanchored point (`picker-base.tsx:162-174`). So the surface work is wiring, not invention. The one new file is `Core/Session/glanceSlice.ts` — the missing member of the established Session-slice convention (`configSlice`, `navigationSlice`, `cacheSlice`, `chromeSlice`, `layoutSlice`, `windowSlice`) and the home glance state grows into (pins now; detach / move / multi-window later). Everything else widens in place: `GlancePane` renders the pinned panes too, `glanceLink.ts` grows into the app-side facade. Alternatives weighed and rejected (see Inherited Reasoning): a global "everything sticky" mode; pins piggybacked on the warm cache; three separate settings; a new pane/card component. The user ratified: one unified setting, lock kept as a per-pane override, pins page-only, pins in `glanceSlice` (explicit, never LRU-evicted), nav views included, and no new component.

Bounding constraints: **least moving parts** — reuse the pane, the editor-state cache, the dwell enum, the settings-row kinds, the modifier idioms; the only new file is the slice. Pins are **page-only** — a website (webview) preview is never pinned. This does **not** add durable/on-disk pin persistence (session-memory only), does not touch trash or history.

**Requirements**

1. A settings control enables/disables hover previews. *(satisfied by R10's "Off" rung)*
2. Previews work across page-nav surfaces: editor connections/links + table cells (existing), sidebar rows, tabs, nav-view rows (recents/pins), cards, table rows.
3. Trash and history surfaces never raise a preview.
4. On surfaces that host ghostCreate (sidebar, cards, tables), **Shift**+hover raises the preview; plain hover keeps the create-ghost. Plain hover raises the preview on surfaces without ghostCreate (tabs, nav views).
5. An open live preview suppresses ghostCreate.
6. The dismiss timer pauses while the cursor is over the pane, so an in-use preview isn't clobbered.
7. A top-right lock icon pins a **page** preview: frozen position, auto-dismiss dropped, until unlocked. Editor (MarkdownPM) page glances only.
8. A pinned preview survives nav-off and scroll-out-of-view; is scrubbed when its tab closes; re-keys with its tab when the tab is pinned/unpinned; multiple pinned previews coexist per tab; never silently evicted.
9. Esc closes a glance, locked or not.
10. A stepped **Preview Persistence** setting (Off / 1s / 5s / 10s / Until Closed) replaces both the `hoverPreviewLinger` slider and the (never-built) enable toggle.

**Acceptance — the whole thing working:** With Preview Persistence at "5s", hovering a page on each of the six surface groups (Shift-held where the surface has ghostCreate) raises the preview within its dwell and it lingers 5s after leave; hovering trash or history rows raises nothing; over-pane keeps it open; locking an editor page glance pins it, and it stays through a same-tab navigation and a scroll that removes its anchor, reappears after switching away and back to its tab, survives pinning/unpinning that tab, and vanishes when that tab closes; Esc closes whichever is open; setting Preview Persistence to "Off" stops every surface from raising anything.

**Forced By** *(what each grounded fact makes mandatory or free)*
- `editorHost.tsx:94` binds `arm: glanceLink` → **free:** widening `glanceLink`'s module with an Off-gated `armPreview` covers editor + all new surfaces from one place; `glanceLink` staying a thin `armPreview(…, 'link')` wrapper leaves editorHost untouched. → Task 2.
- `picker-base.tsx:162-174` returns a static point rect when `anchorX`/`anchorY` are set and skips the trigger observer → **free:** a pinned pane is another `PickerMenu` at a frozen point, no new positioning; `modal={false}` (already the glance mode) lets app dismissals through. → Task 10.
- `warmSeam.ts:25-26` `capture` wholesale-replaces `{editorState, scrollTop}` on every editor unmount (incl. the unmount locking triggers), and `restore` deletes a stale entry → **forbids** piggybacking pin data on the warm cache; **forces** pins into their own store (`glanceSlice`). The pinned page's editor state still rides the warm cache normally. → Task 9.
- `navigationSlice.ts:302,448` `graduatePinCovered`/`unpinTab` re-key a *surviving* tab (new id, tab lives on); `:413,685` are real closes → **forces:** tab-close scrubs pins, but the two re-key sites **re-tag** pins `oldId→newId` — never a blanket scrub-all-four. → Task 10.
- `glanceAction.ts:28` no-ops when the anchor sits inside an existing glance (`insideGlance`) → **free:** hovering the pane can't clobber it (R6 half-satisfied). → Task 8.
- `ghostCreate.ts:24` `onHover(id, entering)` carries no event/modifier, and `suppressed()` is re-read ~1.5s later at dwell-fire → **forces:** Shift is read as `e.shiftKey` off the surface's own `onPointerEnter` event to *arm* (the browser's read at dispatch time — never stale, no listener); ghost suppression keys on `glanceShown()` (a preview is open), **not** on the Shift state — otherwise pressing Shift mid-hover suppresses the ghost while arming nothing (the F5 dead zone). Preview dwell (600ms) < ghost dwell (1500ms), so a shift-armed preview is shown before the ghost checks. *(An ambient `shiftDown()` tracker was built and removed — attack-review L1: it read stale after app-switch-with-Shift; the pointer event is the accurate read F5 always wanted.)* → Task 5, Task 8.
- `navResolve.ts` yields `ResolvedNav.path` as a breadcrumb (`TrailSegment[]`), not a file path; `treeIndex.ts:243` `pagesByIdOf(tree).get(id)?.path` is the id→file-path map → **forces:** nav-view arming resolves path via `pagesByIdOf`, not the nav resolver. → Task 7.
- `navRef.ts:52-54` a tab target may be homepage/context/space/collection/set, not only page → **forces:** tab arming gates on `target.kind === 'page'`. → Task 6.
- Pins are page-only (ratified) → **forbids:** locking a `kind:'site'` glance; the lock icon shows only for page targets. → Task 10.
- `picker-base.tsx:161,340` — placement runs only when `open === true`, and the portal branch requires `selfManaged` (`open !== undefined`); an uncontrolled pane renders inline and ignores `anchorX/anchorY` → **forces:** a pin renders a `PickerMenu` **controlled with a constant `open`** to float at its frozen anchor. Removal drops it from the list → instant unmount (no exit phase), and the DEV unmount-while-open guard (`:118-127`) is exempted for point-anchored menus (one line) so the intentional instant close logs nothing. → Task 10.
- `nexusSlice.ts:43-51,146-148` — `resetNexusSession` calls a `resetX` per slice (and bulk-clears tabs *without* `closeTab`), and `applyTree` reconciles each slice → **forces:** `glanceSlice` adds `resetGlance` (wired into `resetNexusSession`) and `reconcileGlance` (wired beside `reconcileNavigation`/`reconcileWindow`), or a nexus switch leaks pins across nexuses and a rename orphans a pin as a dead-path fetch. → Task 9.

**Inherited Reasoning**
- **Global "everything sticky" instead of a per-pane lock — rejected.** A global "Until Closed" that makes every hover persist buries the user in panes to close; the lock keeps the default transient and pins the chosen few. The two live on one axis (the lock = per-pane "Until Closed").
- **Pins piggybacked on the warm cache — rejected** (attack F1/F3, verified). The warm cache's only writer wholesale-replaces the entry on editor unmount — including the unmount that locking triggers — so a piggybacked pin is dropped instantly; and the map is id-keyed, capping at one pin per page. Pins are explicit user artifacts, so they live in `glanceSlice` and are never LRU-evicted; the pinned page's editor *state* still rides the warm cache.
- **A bespoke restore-on-activate mechanism — rejected.** A pin reappears on tab-return because `pinnedGlances` still holds it and it renders whenever `pin.tabId === activeTabId` — no restore code.
- **Three separate settings (enable toggle + linger slider + lock) — rejected.** One `picker` row (Off/1s/5s/10s/Until Closed) subsumes enable (Off) and linger; the lock is the only additional control, a per-pane override of the same axis.
- **Pinning websites — rejected.** A persistent floating webview per pin is a Chromium-deferred, resource-heavy guest for negligible value; pins are page-only.
- **Extracting a new pane/card/body component — rejected** (user directive). A pinned pane reuses `GlancePane`'s own `.glance-body` page markup via a local render helper inside the component; the live-only machinery (webview lifecycle, resize, leave-grace, `watchAnchor`, retarget, anchor-band `maxSize`) simply isn't invoked on the pinned path.
- **Per-surface dwell timings are KNOBs, not decisions.** `link` stays 1000ms; `detail`/`views` seed at 600ms and are tuned on sight (build-then-show).

**Grounding** *(re-open these; don't cite them)*
- `Core/Interface/Glance/glanceAction.ts` — the pure timer leaf: `GLANCE_DWELL` enum + `type GlanceDwell`, `armGlance/cancelGlance/closeGlance`, `insideGlance`, `watchAnchor` (its `onEscape`, :66-70).
- `Core/Interface/Glance/GlancePane.tsx` — the singleton pane: presenter slot, `warm` Map (cap 10) + `glanceWarmSeam` (73-77), size cache (44-71), leave lifecycle (253-304), resize (153-169, 377), webview guest lifecycle (222-243, 357-375), page body + fold-click + focus handoff (324-356), the `[selection, activeTabId, pageWindow]` dismiss effect (220). **All new rendering lands here.**
- `Core/Interface/Glance/glanceLink.ts` — the existing app-side arm adapter (`arm: glanceLink`); **widened in place** into the app-side facade.
- `Core/MarkdownPM/warmSeam.ts:13-28` — `mapWarmSeam`: `capture` (wholesale `capSet`) + `restore` (delete-on-stale). Why pins can't live here.
- `Core/MarkdownPM/api.ts:13-15,74-78` — `GlanceTarget`, the `glance` facet.
- `Core/Pages/editorHost.tsx:92-94` — editor glance wiring (unchanged: still `arm: glanceLink`).
- `Core/Settings/personalization.ts:90-120,146-151` · `codec.ts:100` · `SettingsWindow.tsx:77-115,317-330,851-915` — settings type, codec, row kinds, `hoverPreviewLinger` slider, `PickerControlRow`.
- `Core/Session/store.ts:28-37` + `sessionState.ts` — slice composition and the `SessionState` type.
- `Core/Session/cacheSlice.ts` · `navigationSlice.ts` — slice patterns; `navigationSlice.ts:53` imports `dropCacheTab`, called at `:311,413,448,685`; `graduatePinCovered` (:302), `unpinTab`.
- `UIX/Interactions/ghostCreate.ts:13-33` — `useGhostAnchor` options (`suppressed`) and `onHover`.
- `UIX/Pickers/picker-base.tsx:69-72,162-174,239` — fixed-point placement + the unmount-while-open DEV guard.
- `Core/Nexus/treeIndex.ts:243-246` — `pagesByIdOf(tree)`, the id→file-path map.
- `Core/MarkdownPM/Links/connectionClicks.ts:66-82` · `Links/linkClicks.ts:64-96` · `Tables/cellStatic.tsx:214-219` — existing dwell wiring.
- Surface seams (scout-verified, re-derive line numbers): `Sidebar/Sidebar.tsx:414-461,785-820` · `Views/Table/TableView.tsx:907-936,1429-1439` · `Views/Cards/CardsView.tsx:209-252,1115-1124` · `Navigation/TabBar.tsx:234-348` · `Navigation/NavList.tsx:127-155` + `NavGallery.tsx` · `navResolve.ts:7-15` · `navRef.ts:3-54`.
- `UIX/Symbols/index.tsx:166` — the curated `locked` icon (`<Icon name="locked" />`).
- `.claude/Features/ConfigurationPM.md:42` — the doc this plan updates. (`InterfacePM.md`'s Glance section is **pre-edited by Nathan and out of scope** — read-only grounding, never rewritten by this plan.)

**Environment**
- **Plan directory:** `.claude/Planning/` (project convention).
- **Explorer:** `Explore` agent. **Reviewer:** `code-simplifier` then `build-breaking-agent` (StudioMD: simplification precedes attack). **Neutral verifier:** `general-purpose`. **Simplification:** `code-simplifier` / `code-simplification` skill. **Comment pass:** `comment-killer-agent`.
- **Gate commands** (repo root): `npm run typecheck` (the only type gate; covers every tsconfig) · `npm run test` (Vitest) · `npm run lint` (`biome check` + the comment-shape scan `.claude/hooks/no-wrapped-comments.mjs`). No spec input beyond this conversation; the D-phase core list is the ratified answers above.
- **Rules directory:** `.claude/Guidelines/` (`Editor-Internals.md`, `InteractionPM` behavior) + user memory.

**Shapes:** additive (new surfaces, new setting behavior, the lock, the `glanceSlice`) · refactor (widen `glanceLink.ts`; a local body-render helper in `GlancePane` — behavior-preserving) · removal (`hoverPreviewLinger` and its coercer) · user-visible (every surface + the lock + the setting).

**Declared Stops**
- **Phase 3 gate** — the cross-surface hover interaction (which surfaces raise a preview, the Shift arbitration, the dwell feel, the "press Shift before entering" contract) is pure interaction taste and cheapest to redirect before the lock is built on top of it. Halt for the user to eyeball on real data. *(Per user's standing preference, this is the one mid-plan stop; Phase 4's lock behavior carries to the final user pass.)*

**Global Constraints (every task inherits these):**
- Gates from repo root, exit codes read directly, never piped: `npm run typecheck` · `npm run test` · `npm run lint` (`biome check` + `no-wrapped-comments`). A change that adds a diagnostic, leaves a file unformatted, or wraps a block comment across lines isn't done.
- Biome formatting is authoritative (single-quote, no semicolons); never hand-align. An Edit failing on whitespace means the hook reformatted — re-read and retry.
- Comments only where the why can't be inferred; no status/pending narration; KNOB comments carry the tunable's rationale. **A block comment must not span lines** (the `no-wrapped-comments` scan) — use a single-line `/** … */` or stacked `//` lines.
- **One new file only:** `Core/Session/glanceSlice.ts` (the missing Session slice). No new components; everything else widens `GlancePane.tsx`, `glanceLink.ts`, `glanceAction.ts`, `navigationSlice.ts`, `nexusSlice.ts` in place.
- **One sanctioned shared-UIX line:** exempt point-anchored menus (`anchorX` set) from `PickerMenu`'s DEV unmount-while-open warning (`picker-base.tsx:118-127`) — pins close instantly by design, so the guard is a false positive for them. One condition, DEV-only, inert for every other consumer. (No exit machinery / no `onExited` — pins render controlled `open` and just unmount.)
- `Core/Contract` boundary: any new channel is one `bridge.ts` entry, both ends derived, `Result` envelope. *(This plan adds none — all state is session-memory.)*
- Report +/- line counts (comments + tests excluded) after significant changes.
- Out of scope everywhere: trash (`Core/Trash/`, `Core/Settings/TrashFrame.tsx`), history (`Core/Interface/Windows/PageHistoryWindow.tsx`, `Core/Pages/fileHistory.ts`), `Showcase/`, on-disk pin persistence, website-glance pinning.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `ConfigurationPM.md:42` | "Hover Preview Linger \| `hoverPreviewLinger` \| … \| **None** · 1–30 seconds" | Row replaced by Preview Persistence (Off/1s/5s/10s/Until Closed) | 3 |

*(`InterfacePM.md`'s Glance section — linger, single-host, and dismissal claims — is falsified by this work too, but Nathan has pre-edited that doc; this plan does not touch it.)*

**Dead Vocabulary**
- `hoverPreviewLinger` → expect 0 after Phase 1. Legitimate hits: none.
- `coerceHoverLinger`, `HOVER_LINGER_MAX` → expect 0 after Phase 1.
- Control: `previewPersistence` → expect ≥5 (type, coercer, codec, settings row, pane read). Zero here means the sweep never ran.

**Hazard Window:** Task 3 removes `hoverPreviewLinger` (type + coercer + codec + slider row + pane read) in one commit — a partial removal leaves a dangling `KeyOf<number>` or orphaned coercer that fails typecheck. Opens and closes within Task 3; no task between may reference the old symbol.

---

### Phase 1 — One setting owns persistence and on/off

#### Task 1: Preview Persistence type + resolver

**Requirement:** 10, 1

**Why:** One typed axis for the whole persistence story — enable/off and linger duration — so every reader derives from a single source and the Off rung is the enable toggle. Unblocks Tasks 2–3.

**Now** — `Core/Settings/personalization.ts:100,146-151`:

```ts
// personalization.ts:100
hoverPreviewLinger?: number
// personalization.ts:146-151
export const HOVER_LINGER_MAX = 30
export function coerceHoverLinger(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  const s = Math.round(v)
  return s >= 1 ? Math.min(HOVER_LINGER_MAX, s) : undefined
}
```

**Becomes** — a stepped union, its default, a ms resolver, a coercer:

```ts
// personalization.ts — hoverPreviewLinger?: number REMOVED from the interface (its last readers die in Task 3)
previewPersistence?: PreviewPersistence

// 'off' disables all arming (the Off-gate stops arming; never reaches previewLingerMs) ·
// '1s'|'5s'|'10s' linger then dismiss · 'always' no dismiss timer (live pane stays until replaced/nav/Esc)
export type PreviewPersistence = 'off' | '1s' | '5s' | '10s' | 'always'
export const PREVIEW_PERSISTENCE_DEFAULT: PreviewPersistence = '1s'

// undefined or invalid → undefined (reader falls back to the default); a valid rung passes through
export function coercePreviewPersistence(v: unknown): PreviewPersistence | undefined

// live-pane dismiss grace; domain excludes 'off' (callers narrow first — see Task 3)
// undefined → 1000 · '1s'→1000 · '5s'→5000 · '10s'→10000 · 'always'→Number.POSITIVE_INFINITY
export function previewLingerMs(v: Exclude<PreviewPersistence, 'off'> | undefined): number
```

**Assumed by:** Task 2 (`armPreview` Off-gate), Task 3 (codec + settings row + pane grace).

**Verify — automated**
- [x] Unit test `coercePreviewPersistence('5s'|undefined|'garbage'|7)` and `previewLingerMs('1s'|'10s'|'always'|undefined)`. *(Authored alongside the impl, not red-first; each assertion discriminates — the `'always'`→Infinity and coerce-reject cases fail if their logic is removed.)*
- [x] Degenerate: `coercePreviewPersistence(undefined)` → `undefined`; `previewLingerMs(undefined)` → 1000.
- [x] `npm run typecheck` green.

**Verify — user**
- [ ] *(none.)*


#### Task 2: Widen `glanceLink.ts` into the app-side facade

**Requirement:** 1, 2, 5, 6

**Why:** One app-side owner of glance policy, grown from the file that already owns editor arming: an Off-gated `armPreview(target, el, slot)` (matching the house imperative-personalization-gate idiom — `confirmations.ts:20`, `openWebLink.ts:7`). `glanceShown`/`setGlanceShown` go to `glanceAction.ts` instead — "a glance is on screen" is presenter-domain, sitting beside the existing `present`/`pending` module state, and `GlancePane` already imports from there. `glanceLink` stays the editor's bound-slot wrapper, so `editorHost` is untouched. `glanceAction.ts` stays a pure leaf and **exports** `GlanceDwell` (used by `armPreview`'s signature now, values widened in Task 4).

**Now** — `glanceLink.ts` (whole file); `glanceAction.ts:11,19-20` (`type GlanceDwell` unexported; the presenter module state):

```ts
// glanceLink.ts
import type { GlanceTarget } from '../../MarkdownPM/api'
import { armGlance } from './glanceAction'
export const glanceLink = (target: GlanceTarget, el: Element): void => armGlance(target, el, 'link')
// glanceAction.ts:11 — type GlanceDwell = keyof typeof GLANCE_DWELL   (unexported)
// glanceAction.ts:19-20 — let present…; let pending…                  (presenter module state)
```

**Becomes** — `glanceAction.ts` exports the type + owns the shown flag; `glanceLink.ts` widened:

```ts
// glanceAction.ts — export so armPreview can type its slot (F9: needed in Phase 1, values arrive Task 4)
export type GlanceDwell = keyof typeof GLANCE_DWELL
// presenter-domain shown flag, beside present/pending; read imperatively by ghost suppressed() at dwell-fire (no reactivity)
export function glanceShown(): boolean
export function setGlanceShown(v: boolean): void   // called by GlancePane's shown effect (Task 8)

// glanceLink.ts — now the app-side glance facade
export function armPreview(target: GlanceTarget, el: Element, slot: GlanceDwell): void
//   if (useSession.getState().personalization.previewPersistence === 'off') return
//   armGlance(target, el, slot)
export const glanceLink = (t: GlanceTarget, el: Element): void => armPreview(t, el, 'link') // editor's bound slot
```
*(No ambient Shift tracker: surfaces read `e.shiftKey` off the pointer-enter event at the arm site — see F5. The attack-review's L1 removed the tracker that was here.)*

**Assumed by:** Tasks 5–7 (`armPreview`), Task 8 (`glanceShown`/`setGlanceShown` from `glanceAction`).

**Verify — automated**
- [x] `rg -F 'armPreview' Core` → ≥1; `glanceLink` still resolves (kept); no new file.
- [x] Guard both halves: persistence 'off' → `armPreview` presents nothing (spy the presenter); '1s' → presents. Disabling the gate makes the 'off' case fail. Editor path proven via `glanceLink`.
- [x] `glanceShown()` reflects `setGlanceShown`.
- [x] `npm run typecheck` · `npm run test` green.

**Verify — user**
- [ ] With Hover Previews = Off, resting on an editor `[[connection]]` raises nothing. *(Carries.)*


#### Task 3: Swap the slider for the Preview Persistence picker

**Requirement:** 10, 1 · **Hazard Window: opens and closes here.**

**Why:** The user-facing control. Replacing the slider row with a `picker` row and dropping every `hoverPreviewLinger` reader in the same commit keeps the type gate green and makes Off the enable switch.

**Now** — three surviving readers (interface field + coercer removed in Task 1's Becomes; deleted here):

```ts
// codec.ts:100
hoverPreviewLinger: coerceHoverLinger(p.hoverPreviewLinger),
// SettingsWindow.tsx:323-330 (Navigation section)
{ kind: 'slider', key: 'hoverPreviewLinger', label: 'Hover Preview Linger',
  hint: "How long a connection's hover preview stays open after hovering off.",
  max: HOVER_LINGER_MAX, format: (v) => (v === 0 ? 'None' : `${v}s`) },
// GlancePane.tsx:245-246
const linger = useSession((s) => s.personalization.hoverPreviewLinger)
const graceMs = linger !== undefined ? linger * 1000 : LEAVE_GRACE_MS
```

**Becomes** — a picker row, a picker codec line, a persistence-derived grace **narrowed for `'off'`** (F4):

```ts
// codec.ts — replaces the hoverPreviewLinger line
previewPersistence: coercePreviewPersistence(p.previewPersistence),
// SettingsWindow.tsx — replaces the slider row
{ kind: 'picker', key: 'previewPersistence', label: 'Hover Previews',
  hint: 'Show a preview when resting on a page; how long it lingers after hovering off.',
  fallback: PREVIEW_PERSISTENCE_DEFAULT,
  options: [
    { value: 'off', label: 'Off' }, { value: '1s', label: '1 Second' },
    { value: '5s', label: '5 Seconds' }, { value: '10s', label: '10 Seconds' },
    { value: 'always', label: 'Until Closed' },
  ] },
// GlancePane.tsx:245-246 — narrow 'off' before the resolver (its domain excludes 'off'); 'always' → Infinity → schedule NO leave timer.
// 'off' never has a live pane (the Off-mid-open effect dismisses it), so its grace is moot → undefined→1000; this retired LEAVE_GRACE_MS (its only reader).
const persistence = useSession((s) => s.personalization.previewPersistence)
const graceMs = previewLingerMs(persistence === 'off' ? undefined : persistence)
```

**Ordered Steps** *(hazard-window order)*
1. `SettingsWindow.tsx`: swap the row; drop the unused `HOVER_LINGER_MAX` import.
2. `codec.ts`: swap the line; fix imports.
3. `GlancePane.tsx`: swap the read; guard the leave `setTimeout` (GlancePane.tsx:295) so an Infinite `graceMs` schedules nothing. **Off-mid-open (ruling):** when persistence flips to 'off' while a live pane is shown, dismiss the live pane; **pins persist** (explicit artifacts — see Rulings).
4. `personalization.ts`: delete `coerceHoverLinger` + `HOVER_LINGER_MAX`.
5. Rewrite `ConfigurationPM.md:42` (the linger row) in this commit. *(InterfacePM is Nathan's — don't touch.)*

**Assumed by:** Task 10 ('always'/Infinity distinct from a pin).

**Verify — automated**
- [x] `rg -F 'hoverPreviewLinger' .` → 0. `rg -F 'coerceHoverLinger' .` → 0. `rg -F 'HOVER_LINGER_MAX' .` → 0. Control: `rg -F 'previewPersistence' Core` → 10.
- [x] Linger test rewritten — '5s' → 5000ms grace; 'always' → no dismiss timer scheduled; 'off' → live pane dismissed (Off-mid-open). *(The GlancePane grace tests went red-first on exit-timing; the coercer/readNexus inversions were typecheck-level rewrites authored with the impl, not run against the old codec — each still discriminates its guard.)*
- [x] Degenerate: `previewPersistence` absent → default '1s' (picker fallback + coercer undefined); a legacy `hoverPreviewLinger` on disk is ignored (codec builds fresh — no migration; the readNexus round-trip test asserts junk → undefined without naming the dead symbol).
- [x] `npm run typecheck` · `npm run test` · `npm run lint` green.

**Verify — user**
- [ ] Settings → Navigation shows "Hover Previews" as a 5-way picker; slider gone. *(Carries.)*


#### Gate 1 — one setting, on/off proven, nothing dangling

- [x] Gates green, exit codes read directly (typecheck 0 · test 0, 4071 passed · lint 0). Tasks 1–3 automated boxes ticked against watched results.
- [x] Hazard window closed: no reference to `hoverPreviewLinger`/`coerceHoverLinger`/`HOVER_LINGER_MAX` in tracked source/docs.
- [x] Dead Vocabulary sweep at 0 against its control (`previewPersistence` in Core → 10).
- [x] Simplification: supervisor inline read of the six-file diff — small, idiomatic, no cuts earned; recorded here rather than a no-op simplifier commit. Attack review (build-breaking-agent) → Fable advisor gate: one Latent finding (L1) folded subtractive, all others killed as unreachable/observations. Fixes committed by explicit path.
- [x] `ConfigurationPM.md:42` linger row rewritten in Task 3's commit.
- [x] Not a declared stop — Phase 2 opens; the two **Verify — user** boxes carry to Completion Criteria.

---

### Phase 2 — The dwell slots

#### Task 4: Add the `detail` and `views` dwell values

**Requirement:** 2, 4 · **Why:** The enumerated slot the scaffolding was built for. `link` stays; `detail` (interface nav) and `views` (Views) join. The `GlanceDwell` type was already exported in Task 2; this adds its values.

**Now** — `Core/Interface/Glance/glanceAction.ts:9-10`:

```ts
/** KNOB — one dwell per glance surface; further surfaces add their own rows. */
export const GLANCE_DWELL = { link: 1000 } as const
```

**Becomes** — three values, `detail`/`views` seeded and flagged for eyeball tuning:

```ts
// KNOB — one dwell per glance surface. link: editor. detail: sidebar/tabs/nav. views: cards/tables.
// detail/views seeded at 600 — tune on sight (shift-summon feels snappier than the 1s link rest).
export const GLANCE_DWELL = { link: 1000, detail: 600, views: 600 } as const
```

**Assumed by:** Tasks 5–7 (pass `'detail'`/`'views'` to `armPreview`).

**Verify — automated**
- [x] `npm run typecheck` green (`GlanceDwell` widens; `armPreview` accepts the new slots).
- [x] `rg -F 'GLANCE_DWELL' Core` shows the three keys (`link: 1000, detail: 600, views: 600`).

**Verify — user**
- [ ] *(none.)*


#### Gate 2 — infrastructure ready

- [x] Gates green (typecheck 0 · lint 0). Diff is a single KNOB line + comment — simplification/review folds into Phase 3's per this gate's provision; no separate pass.
- [x] Not a declared stop; Phase 3 opens.

---

### Phase 3 — Wire the surfaces  *(Declared Stop at the gate)*

*Each task builds `{ kind: 'page', id, path }` from the row, calls `armPreview(target, el, 'detail'|'views')` on enter (Shift-gated where noted, reading `e.shiftKey` off the `onPointerEnter` event) and `cancelGlance()` on leave. Ghost surfaces add `|| glanceShown()` to `suppressed` — **not** the Shift state (F5). The Off-gate lives in `armPreview`; no surface repeats it.*

#### Task 5: Sidebar rows (Shift-gated, `detail`)

**Requirement:** 2, 4, 5 · **Why:** The sidebar hosts ghostCreate, so Shift arbitrates: plain hover keeps the create-ghost, Shift+hover previews. Its `suppressed` gains `glanceShown()` so an open preview stands the ghost down — without the mid-hover dead zone keying suppression on the Shift state would cause.

**Now** — re-derive. `Sidebar.tsx:435-451` (`PageRow`) + `:785-789` (ghost opts):

```tsx
onPointerEnter={api ? () => api.onHover(page.id, true) : undefined}
onPointerLeave={api ? () => api.onHover(page.id, false) : undefined}
suppressed: () => useSession.getState().renamingPath !== null,
```

**Becomes** — Shift arms a `detail` glance; ghost self-suppresses only while a preview is shown:

```tsx
onPointerEnter={(e) => {
  api?.onHover(page.id, true)
  if (e.shiftKey) armPreview({ kind: 'page', id: page.id, path: page.path }, rowRef.current!, 'detail')
}}
onPointerLeave={() => { api?.onHover(page.id, false); cancelGlance() }}
suppressed: () => useSession.getState().renamingPath !== null || glanceShown(),
```

**Verify — automated**
- [x] `npm run typecheck` · `npm run lint` green. `rg -F 'armPreview' Core/Interface/Sidebar` → 2 (≥1).
- [x] Crossing behavior verified by diff inspection — the `PageRow` enter gates arming on `e.shiftKey` and the ghost `suppressed()` disjunction gains `|| glanceShown()`; its only new input, `glanceShown()`, is exercised by the Task 8 GlancePane lifecycle test (no sidebar-row unit harness exists to render the ghost closure).

**Verify — user**
- [ ] Shift+rest → preview; plain rest → create-ghost. *(Carries to the Phase 3 stop.)*


#### Task 6: Tabs (plain hover, `detail`)

**Requirement:** 2 · **Why:** Tabs carry no ghostCreate, so plain hover previews — gated to page tabs.

**Now** — re-derive. `TabBar.tsx` `PinnedTab`/`UnpinnedTab` `data-tab-id` divs (`:249-264`, `:310-332`), no hover handler; `target.kind === 'page'` carries `{id,path}` (`navRef.ts:12`).

**Becomes** — both tab components' row div gains (a shared row helper if both take one):

```tsx
onPointerEnter={(e) => {
  const t = entry.tab.target
  if (t.kind === 'page') armPreview({ kind: 'page', id: t.id, path: t.path }, e.currentTarget, 'detail')
}}
onPointerLeave={() => cancelGlance()}
```

**Verify — automated**
- [x] `npm run typecheck` green. `rg -F 'armPreview' Core/Navigation/TabBar.tsx` → 3 (≥1).
- [x] Degenerate guaranteed by the `t.kind === 'page'` narrow on both tab components (diff-visible; a homepage/context/space/collection/set target never calls `armPreview`). No TabBar hover unit harness exists.

**Verify — user**
- [ ] Page tab → preview; non-page tab → nothing. *(Carries.)*


#### Task 7: Nav-view rows (plain hover, `detail`, id→path via `pagesByIdOf`)

**Requirement:** 2 · **Why:** Recents/pins complete "navigation surfaces." Nav rows carry only `target.id`; the file path comes from `pagesByIdOf` (F6 — `navResolve.path` is a breadcrumb, not a file path).

**Now** — re-derive. `NavList.tsx:127-155` (`NavRow`, `onSelect(it.target)`, no hover) + `NavGallery.tsx` card; `ResolvedNav.target` is a `NavRef` with `id` only.

**Becomes** — a local `pageTargetFromNav(it)` returning `{kind:'page',id,path} | null`, wired on the row/card:

```tsx
onPointerEnter={(e) => { const t = pageTargetFromNav(it); if (t) armPreview(t, e.currentTarget, 'detail') }}
onPointerLeave={() => cancelGlance()}
// pageTargetFromNav: it.target.kind === 'page' && pagesByIdOf(tree).get(it.target.id) ? {kind:'page', id, path} : null
```

**Verify — automated**
- [x] `npm run typecheck` · `npm run lint` green. `rg -F 'armPreview' Core/Navigation/NavList.tsx Core/Navigation/NavGallery.tsx` → 4 (≥1). *(`pageTargetFromNav` lives in `navResolve.ts`, not `NavList.tsx` — it owns `ResolvedNav`, is a pure `.ts` beside the breadcrumb resolver F6 contrasts, and NavGallery + the test import it; see Deviations.)*
- [x] Crossing test: `pageTargetFromNav`'s path equals `pagesByIdOf(tree).get(id).path` for a known page id (`navResolve.test.ts`).
- [x] Degenerate: id absent from `pagesByIdOf` → null; non-page nav ref → null; tree null → null (`navResolve.test.ts`).

**Verify — user**
- [ ] Recents/pins page row → preview. *(Carries.)*


#### Task 8: Cards + Tables (Shift-gated, `views`) + over-pane + `setGlanceShown`

**Requirement:** 2, 4, 5, 6 · **Why:** The two Views surfaces host ghostCreate; Shift arbitrates as in the sidebar. This task closes R6 (the `insideGlance` guard already refuses arming from inside the pane) and wires `setGlanceShown` so `glanceShown()` is true only while a live pane shows — and flips back false on **every** hide path (dismiss + retarget-through-null), so the ghost can't stay suppressed.

**Now** — re-derive. `TableView.tsx:1429-1439` + `:907-914`; `CardsView.tsx:1115-1124` + `:209-217`. `GlancePane.tsx` shown effect doesn't yet call `setGlanceShown`.

**Becomes** — Views rows Shift-arm a `views` glance; ghost `suppressed` gains `glanceShown()`; the pane publishes shown state:

```tsx
// Table DataRow / Cards card row
onPointerEnter={(e) => { api.hover(row, true); if (e.shiftKey) armPreview({ kind: 'page', id: row.id, path: row.path }, e.currentTarget, 'views') }}
onPointerLeave={() => { api.hover(row, false); cancelGlance() }}
// both ghost opts gain: || glanceShown()
// GlancePane.tsx — `shown` is the single source; retarget-through-null and dismiss both flow through it
useEffect(() => { setGlanceShown(shown !== null); return () => setGlanceShown(false) }, [shown])
```

**Verify — automated**
- [x] `npm run typecheck` · `npm run lint` green. `rg -F 'armPreview' Core/Views` → 4 (≥2).
- [x] Both Views ghost `suppressed()` closures gain `|| glanceShown()` (diff-visible); the disjunction's only new input, `glanceShown()`, is driven by the lifecycle test below. No Table/Cards ghost-closure unit harness exists to render the closure directly.
- [x] `setGlanceShown` lifecycle: `glancePane.test.tsx` asserts `glanceShown()` true while shown, then false after `closeGlance()` (dismiss) and after a navigation retarget-through-null — the false transition, so the ghost can't stay stuck.
- [x] R6: the existing "an anchor inside the pane's own body arms nothing" (`insideGlance`) and leave-grace tests stay green in the full suite.

**Verify — user**
- [ ] Shift+rest on a card/table row → preview; plain rest → create-ghost. Over-pane keeps it open. *(Carries.)*


#### Gate 3 — cross-surface behavior  **[DECLARED STOP]**

- [x] Gates green (typecheck 0 · test 0, 4076 passed · lint 0). Every Phase 3 automated box ticked.
- [x] Simplification (supervisor inline read, done AFTER attack — see Lessons) over the six surfaces: one cut folded (TabBar's byte-identical tab-hover pair → `tabHoverProps` helper, `ab8a70e66`); Sidebar/nav/navResolve clean. Attack review (build-breaking-agent): 0 High · 0 Medium · 1 Low · 2 Latent · 1 Unknown; the headline per-hover `pagesByIdOf` perf fear killed (WeakMap-memoized, O(1) after first build). Fable advisor gate: the one Low (create-ghost doesn't resume on a resting pointer after a preview linger-closes) DEFERRED to the eyeball, not folded — it's a shared-`ghostCreate` change outside the one sanctioned UIX line, and dropping the entry-time `blocked()` guard also gates the `travelHold` branch, so it is NOT a clean one-liner and would change every suppressor's resting-pointer behavior. Latents + R6 Unknown carried to the eyeball list.
- [x] Trash/history untouched: `rg -F 'armPreview' Core/Trash Core/Settings/TrashFrame.tsx` → 0; `rg -F 'glance' Core/Interface/Windows/PageHistoryWindow.tsx` → 0. Control: `rg -F 'armPreview' Core/Navigation` → 7 (≥1).
- [ ] **Halt.** User eyeballs on real data — see the eyeball list under Rulings. Phase 4 opens only on the user's go.

---

### Phase 4 — Lock and pinned multi-pane  *(`glanceSlice.ts` + in-place `GlancePane`/`navigationSlice`)*

#### Task 9: `glanceSlice.ts` — the pin store, wired like its six siblings

**Requirement:** 8 · **Why:** Pins are explicit user artifacts, not a cache — so they live in their own Session slice (the established pattern; the growth home for future detach/move), never LRU-evicted, keyed to survive per-tab and same-page-across-tabs. The pinned page's editor *state* still rides `GlancePane`'s warm cache untouched. Critically, the slice must carry the **two lifecycle hooks every per-nexus slice wires** — a nexus-switch reset and a rename reconcile — or it reads as bolted-on and leaks pins across nexuses / orphans them on rename (both verified against `nexusSlice`).

**Now** — no glance slice; `store.ts:28-37` composes seven slices. `nexusSlice.resetNexusSession` (:43-51) calls a `resetX` per slice; `applyTree` reconciles via `reconcileNavigation`/`reconcileWindow` (:146-148). Pins have no home and no hooks.

**Becomes** — `Core/Session/glanceSlice.ts` (new), composed and hooked:

```ts
// glanceSlice.ts — reuse GlanceSize (windowRecord, = {w,h}); pinId via makeTabId (tabsModel.ts:298, the session-id minter)
// Placement is the FROZEN ANCHOR POINT, NOT the pane corner — PickerMenu re-adds gap/origin. Direction is NOT stored:
// PickerMenu re-derives it from the frozen anchor+size on each open (deterministic), exactly as it re-derives centering.
// Exit is dead simple (ratified): removing a pin from the list unmounts it — that IS the close. No .closing / exit phase —
// pins render a PickerMenu with a constant `open` (needed for anchor placement); unmount is instant, and the DEV
// unmount-while-open guard is exempted for point-anchored menus so it stays silent (Task 10).
export type PinnedGlance = {
  pinId: string
  tabId: string
  target: { kind: 'page'; id: string; path: string }
  anchorX: number; anchorY: number; anchorHeight: number   // frozen trigger point for PickerMenu
  size: GlanceSize
}
export interface GlanceSlice {
  pinnedGlances: PinnedGlance[]
  pinGlance: (p: Omit<PinnedGlance, 'pinId'>) => void        // makeTabId() pinId; appends
  unpinGlance: (pinId: string) => void                       // THE remover — filter out pinId (unlock + Esc)
  scrubTabPins: (tabId: string) => void                      // tab closed — filter out that tab's pins (one rule, no branch)
  retagTabPins: (oldId: string, newId: string) => void       // tab re-keyed (survives): move its pins oldId→newId
  reconcileGlance: (index: ReconcileIndex) => void           // rename: reconcileWith per target — repath, or drop a 'none' (same as tabs/windows)
  resetGlance: () => void                                    // per-nexus wipe
}
const PER_NEXUS = { pinnedGlances: [] } satisfies Partial<GlanceSlice>  // resetGlance: () => set({ ...PER_NEXUS })
// store.ts:36 — add `...createGlanceSlice(...a),` ; sessionState.ts — add `& GlanceSlice` to SessionState
// nexusSlice.ts:50-51 — add `s.resetGlance()` to resetNexusSession ; :148 — add `get().reconcileGlance(index)`
```

Reconcile template — mirror `windowSlice.ts:264-268`: loop `pinnedGlances` through `reconcileWith(index, p.target)`; `'page'` with a new path → repath; `'none'` → drop. A reconcile-drop of a deleted page is not "silent" (same treatment tabs/windows get), so it satisfies R8's *never-silently-evicted* wording.

**Assumed by:** Task 10 (lock/render/scrub/re-tag/Esc).

**Verify — automated**
- [x] `npm run typecheck` green; `useSession.getState().pinnedGlances` exists; `GlanceSize`/`ReconcileIndex`/`makeTabId` imported, not re-declared.
- [x] Unit: `pinGlance` appends with a fresh `pinId`; `unpinGlance('x')` filters out x; `scrubTabPins('A')` filters out only A's; `retagTabPins('A','B')` moves A's pins to B (survives); the same page under two tabIds is two entries (F3).
- [x] Reset: `resetGlance()` empties `pinnedGlances` (unit); wired into `resetNexusSession` beside the other `resetX` calls, so a nexus switch clears pins.
- [x] Reconcile (crossing): after a page repath in the index, `reconcileGlance` updates the pin's `target.path` to the same value `reconcileWith` gives a tab; a deleted page drops the pin.
- [x] Degenerate: `pinnedGlances` starts `[]`; `unpinGlance` of an unknown id is a no-op; `reconcileGlance` with no matching pins no-ops (reference-preserving — asserted `toBe`).

**Verify — user**
- [ ] *(none — no visible change yet.)*


#### Task 10: Lock button, pinned render, tab lifecycle, Esc-closes-any

**Requirement:** 7, 8, 9 · **Why:** The behavior itself, rendered by the pane that already exists. `GlancePane` gains a corner lock on the live page card and a render of the active tab's `pinnedGlances` — reusing the file's own `<PageTile>` render + fold handler (no new component) and the `Button` icon recipe for the padlock, each pin a `PickerMenu` with a constant `open` (for anchor placement) so exit is a plain unmount. A pin survives navigation and scroll because nothing dismisses it; it follows its tab through pin/unpin re-keys and vanishes on real close, via `glanceSlice` calls wired into `navigationSlice`'s existing lifecycle.

**Now** — the live pane's render and dismissal, and the tab-teardown sites:

```tsx
// GlancePane.tsx:312-377 — one PickerMenu, one .glance-body, live-only chrome
<PickerMenu glass="window" open={shown !== null} triggerRef={anchorRef}
  manageFocus={false} modal={false} origin="center" onDirection={setDir}>
  <div ref={cardRef} {...{ [GLANCE_BODY_ATTR]: '' }} className="glance-body"
    style={{ width: box.w, height: box.h }}
    onMouseDownCapture={/* focusBefore + selectingRef */} onDragStartCapture={/* prevent */}
    onClick={/* HEADING_FOLD_LINE → toggleFoldAt via EditorView.findFromDOM */}>
    {page && <PageTile key={page.path} path={page.path} editing={false} onBeginEdit={() => {}}
      locked connections={resolveOnly} warm={warmSeam} ancestors={GLANCE_ANCESTORS} />}
    {held?.target.kind === 'site' && (/* webview + shield — live-only */)}
  </div>
  {frame.edges(dir === 'up' ? EDGES_UP : EDGES_DOWN)}  {/* resize — live-only */}
</PickerMenu>
```
```ts
// GlancePane.tsx:220 — live dismiss effect; :298 watchAnchor(onGone/onEscape). Pins must escape both.
useEffect(dismiss, [dismiss, selection, activeTabId, pageWindow])
// navigationSlice.ts — dropCacheTab imported once (:53); called at :311 graduatePinCovered (per covered tab,
//   which GRADUATES to pinTabId(t.target) — a re-key, tab survives), :448 unpinTab (re-key to a fresh makeTabId),
//   :413 closeTab + :685 reconcile (real closes). Re-derive all four before editing.
```

**Becomes** —

*(a) Share only the `<PageTile>` render + the pure fold handler — NOT the wrapper (render-layer finding). The `.glance-body` wrapper is live-specific: `cardRef` is a single ref, and `onMouseDownCapture`/`selectingRef`/`focusBefore` drive text-selection + focus-handoff, moot for a frozen pin. `onFoldClick` reads `e.target` + `EditorView.findFromDOM` — pure, so it's shared.*
```tsx
// GlancePane.tsx — local const, closes over resolveOnly + GLANCE_ANCESTORS. Takes the seam as a param so the LIVE pane keeps
// its existing warmSeam memo (:307-310) — no fresh seam per render on the live path (attack LOW: "no live behavior moved").
const renderPageTile = (t: { id: string; path: string }, seam: WarmSeam): React.JSX.Element => (
  <PageTile key={t.path} path={t.path} editing={false} onBeginEdit={NOOP}
    locked connections={resolveOnly} warm={seam} ancestors={GLANCE_ANCESTORS} />
)
// live wrapper: the existing div (cardRef + its handlers) → { page ? renderPageTile(page, warmSeam) : <webview…> }{lockBtn}
// pin wrapper (minimal, own div): <div {...{[GLANCE_BODY_ATTR]:''}} className="glance-body" style={size} onClick={onFoldClick}>
//   { renderPageTile(p.target, glanceWarmSeam(p.target.id, p.target.path)) }{ unlockBtn(p.pinId) }</div>
//   — GLANCE_BODY_ATTR is REQUIRED on every pin wrapper, or insideGlance() misses it and a Shift-hover over a [[link]]
//     inside a pinned pane arms a fresh glance on top of it. (A fresh seam per pin render is benign — warm is consumed
//     mount-once, so a new seam identity doesn't remount.)
```

*(b) The padlock — reuse the `Button` icon recipe, plus the pane's never-take-focus guard. Live shows the open padlock (click to lock); a pin shows the closed padlock (click to release). Page targets only — a site live card passes no lock.*
```tsx
// Button icon recipe (UIX/Buttons/Button.tsx). onMouseDown preventDefault honors GlancePane's "never pulls focus" contract
//   (a focusable button would else steal focus, and dismiss()'s plain path can't run the effect-local focus-restore).
const lockBtn = page && (
  <Button icon="lock-open" revealOnHover ghostRest aria-label="Lock preview"
    onMouseDown={(e) => e.preventDefault()} onClick={onLock} />
)
const unlockBtn = (pinId: string) => (
  <Button icon="locked" revealOnHover ghostRest aria-label="Unlock preview"
    onMouseDown={(e) => e.preventDefault()} onClick={() => unpinGlance(pinId)} />
)
// onLock: freeze the ANCHOR point (NOT the pane corner — PickerMenu re-adds gap/origin from an anchor point) + the live
//   box size. Direction isn't stored — PickerMenu re-derives it from the frozen anchor on each open. cardRef's rect would
//   double-apply the placement offset.
const onLock = (): void => {
  if (!page || !shown) return
  const a = shown.el.getBoundingClientRect()
  pinGlance({ tabId: activeTabId, target: page,
    anchorX: a.left + a.width / 2, anchorY: a.top, anchorHeight: a.height, size: box })
  dismiss()
}
```

*(c) Rendering the pins — only the active tab's pins render, each a `PickerMenu` **controlled with a constant `open`**. Placement runs only when `open === true` (picker-base.tsx:161) and the portal branch needs `selfManaged` (:340), so a constant `open` is required to float at the frozen `anchorX/anchorY` — an uncontrolled pane renders inline and ignores the anchor. Removal (unpin/tab-close) drops the pin from the list → the pane unmounts while `open`, which is instant and skips no animation we want; picker-base's DEV unmount-while-open warning is exempted for point-anchored menus (Ordered Steps). Narrow store selectors (never `useSession(s => s)`) so a store write doesn't re-render the live editor host. A pin carries no `watchAnchor` and is outside the live dismiss effect, so nav-off and anchor-loss leave it standing; a tab switch unmounts it and a return remounts it warm.*
```tsx
const pinnedGlances = useSession((s) => s.pinnedGlances)
const activeTabId = useSession((s) => s.activeTabId)
const pinGlance = useSession((s) => s.pinGlance)
const unpinGlance = useSession((s) => s.unpinGlance)
{pinnedGlances.filter((p) => p.tabId === activeTabId).map((p) => (
  <PickerMenu key={p.pinId} glass="window" open anchorX={p.anchorX} anchorY={p.anchorY} anchorHeight={p.anchorHeight}
    manageFocus={false} modal={false} origin="center">
    <div {...{ [GLANCE_BODY_ATTR]: '' }} className="glance-body"
      style={{ width: p.size.w, height: p.size.h }} onClick={onFoldClick}>
      {renderPageTile(p.target, glanceWarmSeam(p.target.id, p.target.path))}
      {unlockBtn(p.pinId)}
    </div>
  </PickerMenu>
))}
// unpinGlance (unlock/Esc) and scrubTabPins (tab close) both just remove from the list → the pane unmounts → closed.
```

*(d) Esc — the live pane keeps `watchAnchor.onEscape` (focus-restore); this adds ONLY the pin case, bailing when a live pane is shown or the event was consumed, so no double-close. `unpinGlance` removes the newest active-tab pin.*
```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || e.defaultPrevented || shown) return
    const newest = pinnedGlances.filter((p) => p.tabId === activeTabId).at(-1)
    if (newest) { e.preventDefault(); unpinGlance(newest.pinId) }
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [shown, pinnedGlances, activeTabId, unpinGlance])
```

*(e) Tab lifecycle in `navigationSlice` — scrub on real close, re-tag on re-key. `graduatePinCovered` re-keys an ARRAY (N→N), so the retag rides its existing per-covered loop; `unpinTab` is the single pair. Re-derive each site.*
```ts
// :311 graduatePinCovered → for (const t of covered) { dropCacheTab(t.id); get().retagTabPins(t.id, pinTabId(t.target)) }
// :448 unpinTab        → get().retagTabPins(pinId, freshTabId)      // the makeTabId the unpin mints
// :413 closeTab, :685 reconcile (per dropped tab) → after dropCacheTab(id): get().scrubTabPins(id)
```

**Ordered Steps**
1. `GlancePane.tsx`: lift the `<PageTile>` call into `renderPageTile(target, seam)`; keep `onFoldClick` a shared pure handler. The live `.glance-body` wrapper (cardRef + its handlers) is unchanged and renders `renderPageTile(page, warmSeam)` — its existing memo preserved (behavior-preserving).
2. Add the `Button` lock/unlock (page-only, `onMouseDown` preventDefault) + `onLock` (freeze anchor + `box` from `shown.el`); a `glance-lock` CSS rule (corner-absolute, reuse existing button tokens).
3. Render the active tab's `pinnedGlances` as siblings of the live PickerMenu — each a `PickerMenu` with a constant `open`, own minimal `.glance-body` wrapper carrying `GLANCE_BODY_ATTR`; narrow store selectors.
4. `picker-base.tsx`: exempt point-anchored menus (`anchorX !== undefined`) from the DEV unmount-while-open warning (`:118-127`) — one condition on the existing guard.
5. Add the guarded Esc keydown (`unpinGlance` the newest active-tab pin, bails on `shown`/`defaultPrevented`).
6. `navigationSlice.ts`: `scrubTabPins` at the two real closes; `retagTabPins` N→N inside the `graduatePinCovered` loop and the `unpinTab` pair (reuse the **exact** `tab.id` the unpin mints — a second `makeTabId()` would tag the pin to a non-existent tab).
7. *(InterfacePM's navigation/anchor sentence is falsified by pinned panes, but Nathan pre-edited that doc — don't touch it.)*

**Assumed by:** — *(terminal task; nothing downstream.)*

**Verify — automated**
- [x] Guard both halves (persist): a pin survives a simulated nav (`selection` effect fires, dismissing a live pane) — asserted it still renders while the live glance under the same event dismisses (control). A pin carries no `watchAnchor`, so anchor-loss is trivially survived by construction.
- [x] Re-key (F2): a pin on a tab that is pinned (`graduatePinCovered`) re-tags to `pinTabId`, then unpinned (`unpinTab`) re-tags to the exact fresh id (both in `store.test.tsx`); `scrubTabPins` fires only at real closes (tab-close scrub tested).
- [x] Tab close: closing a tab drops its pins; another tab's remain (`store.test.tsx`).
- [x] Esc (F7): live shown → the new keydown bails on `shown` (pins untouched); only pins → newest active-tab pin closes (`glancePane.test.tsx`).
- [x] Placement (the miss that broke V1): a pin renders under `[data-picker-portal]` at `left`/`top` derived from its frozen `anchorX/anchorY` (centered branch: `left = anchorX`, `top = anchorY + anchorHeight + MENU_GAP`, `translateX(-50%)`) — NOT the inline branch.
- [x] Instant close, no noise: unpin unmounts the pin with NO DEV unmount-while-open warning (point-anchored exemption); a plain `open` menu still warns (control). A tab switch unmounts the tab's pins and a return remounts them.
- [x] Site target: `lockBtn` is `null` for a `kind:'site'` live card — the lock is unreachable for a website preview.
- [x] Focus: a `mousedown` on the lock is `defaultPrevented` (the never-take-focus contract), and clicking it appends the pin + dismisses the live pane.
- [x] `npm run typecheck` · `npm run test` · `npm run lint` (incl. `no-wrapped-comments`) green.

**Verify — user** *(your manual pass — the interaction verification I can't cheaply do myself; run at the final pass on real data)*
- [ ] Lock an editor page preview → it pins in place; navigate within the tab and scroll the anchor off screen → it stays put; switch to another tab and back → it's still there; pin the tab, then unpin it → it survives both; close the tab → it's gone.
- [ ] Esc closes whichever preview is open — live or locked.
- [ ] The lock control never appears on a website preview.
- [ ] The lock/unlock padlock reads right in the corner; unlocking (or closing/switching the tab) removes the pin cleanly.


#### Gate 4 — lock and persistence

- [x] Gates green (typecheck 0 · test 0, 4104+ passed · lint 0).
- [x] Only `glanceSlice.ts` is new; no new components (confirmed `git status`). InterfacePM untouched. One sanctioned UIX line: the picker-base point-anchored guard exemption.
- [x] Simplify (supervisor inline read: glanceSlice + pin machinery clean, no cuts) → attack (build-breaking-agent): 0 High · 0 Medium · **1 Low** + 2 ratified edges + 11 kills. Fable advisor gate: the Low (pin orphans when a nav-pinned tab's derived id vanishes) FOLDED — R8-required and one producer crosses the sync/`nav.json` boundary; the scary "revive on wrong page" variant killed (navKey is id-based). Fixed at the `setPinned` choke point + `unpinTab` retag-first reorder (`fdb57567d`), with three regression tests.
- [x] Refactor baseline (Task 10 step 1) held: no live-glance behavior moved (attack confirmed the live path keeps its `warmSeam` memo; `renderPageTile`/`onFoldClick` are pure).
- [x] Not a declared stop; carries to Completion Criteria (Phase 3 was the stop).

---

## Implementation Log

### Progress

- [x] **Phase 1** — One setting owns persistence · base `38a4d8e2c` · attack clean (L1 folded)
  - [x] Task 1 — Persistence type + resolver (additive; field removal deferred to Task 3) · `c80e39af1`
  - [x] Task 2 — Widen `glanceLink.ts` (armPreview + predicates; export GlanceDwell) · `3a03a5ef6`
  - [x] Task 3 — Picker replaces slider (hazard window) · `3fd05f8f3`
- [x] **Phase 2** — Dwell slots
  - [x] Task 4 — `detail`/`views` dwell values · `d7a88b66a`
- [ ] **Phase 3** — Wire surfaces **[STOP]**
  - [x] Task 5 — Sidebar (Shift) · `3e92af4e8`
  - [x] Task 6 — Tabs · `530899fb5`
  - [x] Task 7 — Nav views (pagesByIdOf resolve) · `c924dd6e4`
  - [x] Task 8 — Cards + Tables (Shift) + over-pane + setGlanceShown · `a93b2f802` (Table+GlancePane) · `8496e2e16` (CardsView, landed once the parallel session's CardsView refactor was done) · current-view guard `ffffd3d17` · TabBar dedup `ab8a70e66`
- [x] **Phase 4** — Lock + pinned multi-pane · attack 0H/0M/1L, the Low folded (`fdb57567d`)
  - [x] Task 9 — `glanceSlice.ts` pin store · `09d854d68`
  - [x] Task 10 — Lock button, pinned render, tab lifecycle, Esc · `50810690a` · hashes backfilled `ec2cea4d2` · orphan-scrub fold `fdb57567d`

### Rulings
- Pinned panes are non-resizable, frozen at lock-time rect (v1) — surfaced for the eyeball; revisit for resizable pins.
- **Off-mid-open:** flipping persistence to 'off' dismisses the live pane; existing pins persist (explicit artifacts, closed via unlock/Esc).
- **'always' + ghost suppression (F10):** with Until Closed, an open live preview keeps `glanceShown()` true, so create-ghosts stay suppressed until the preview is closed/replaced/navigated. Designed consequence of R5; surfaced at the Phase 3 eyeball — exempt 'always' from suppression only if Nathan dislikes it.
- **Shift-arm contract (F5):** Shift is read as `e.shiftKey` off the surface's `onPointerEnter` event (the browser's read at dispatch — never stale, no listener); pressing Shift after entering doesn't arm a preview (leave+re-enter with Shift). Chosen over a re-arm-on-keydown mechanism for least parts; the ghost still blooms in that case, so it's no dead zone. Surfaced at the eyeball.
- **Pin key (F3):** pins are a list keyed by minted `pinId`, tagged with `tabId` — multiple per tab and the same page across tabs both work.
- **Exit = removal (ratified):** unlock, Esc, and tab-close all just remove the pin from `pinnedGlances`; its `PickerMenu` (constant `open`, for correct anchor placement) unmounts instantly. No `.closing`, no `onExited`, no ghost/two-phase — the close is not animated, by choice, and the point-anchored guard-exemption keeps that silent.
- **Frozen anchor on window resize (known edge):** a pin freezes a viewport-space `anchorY` and PickerMenu applies no vertical clamp, so a pin locked in the lower band can fall partly off-screen if the window is later shrunk. Recoverable (Esc/tab-close still remove it). Named here against the v1 frozen-rect ruling; no machinery.
- **Warm-cache aliasing (known edge):** the pin's editor *state* rides the id-keyed warm cache (`glanceWarmSeam`), so the same page pinned in two tabs shares one warm entry — scroll can race on tab-switch, and a pin's editor state (not the pin) can be evicted past `GLANCE_WARM_CAP=10` warm glances. The pin *object* is safe in `glanceSlice`; only its scroll/warmth is affected. Refined by the Phase 4 attack: the pin's `restore()` runs during render while the live pane's `capture()` runs in a commit-phase effect cleanup, so **the first lock of a page always opens the pin at scroll top** (never blank/wrong content — `PageTile` seeds body synchronously from `readPageDetail`, fenced against stale warm docs). Tab-away-and-back then preserves scroll. Accepted; on the eyeball list.
- **retag ≠ drop (divergence flag):** the warm cache is *dropped* on tab re-key at all four sites; pins must *survive* re-key (R8), so `retagTabPins` is deliberately NOT `dropCacheTab`. A later "reuse" pass must not collapse them. Extended (Phase 4 attack fold): `setPinned` is the derived-tab close — when a `pin:` id vanishes there (nav-unpin, deleted target, external nav change) its glance pins ARE scrubbed, the pinned-tab analog of `closeTab`. `unpinTab` is the one path a `pin:` id must survive, so it retags **before** it reaches `setPinned`; a reorder there is load-bearing and must not be undone.
- **Current-view guard (Nathan, mid-Phase-3):** a preview never resolves for the location already in the active view. Placed at the presenter (fire time) reading the live `selection`, so it does double duty — hovering the current page's tab/row raises nothing, AND a dwell that fires after a click navigates onto that page voids itself ("2 solves 1"). `selection` is the **main content pane's** target; a page shown only in a split/secondary pane is not covered (flagged for the eyeball). One guard, `ffffd3d17`.

**Phase 3 eyeball list (the declared stop):**
1. Dwell feel — `detail`/`views` seeded at 600ms (KNOBs in `glanceAction.ts`); `link` stays 1000ms. Retune on sight.
2. Shift arbitration on ghost surfaces (sidebar, cards, tables): plain hover = create-ghost, Shift+hover = preview.
3. The press-Shift-before-entering contract (F5): pressing Shift mid-hover doesn't arm; leave+re-enter with Shift does. The ghost still blooms, so no dead zone.
4. Plain hover on tabs + nav-view rows raises a preview; non-page tabs raise nothing.
5. Off kills all — Preview Persistence = Off raises nothing on any surface.
6. Current-view guard: hover the active tab → nothing; click a tab mid-hover → no floating preview left on the page you opened.
7. **Ghost-resume gap (attack L1, deferred):** Shift-hover row A → glide to row B → rest without moving → wait ~1s for the preview to linger-close → does the missing create-ghost on B read as broken? If yes, the fix is a shared-`ghostCreate` change (NOT a clean one-liner — the entry `blocked()` guard also gates the `travelHold` branch, and it changes every suppressor's resting-pointer behavior). If no, leave it.
8. **R6 (attack Unknown, 10s):** open a preview from a nav row, move the pointer onto the pane itself — confirm no second/flickering preview arms.
9. **F10:** with 'Until Closed', an open preview keeps create-ghosts suppressed on every surface until it's closed/replaced/navigated — acceptable, or exempt 'always'?

### Open Against Later Tasks
- **Fifth pin-teardown path (Latent, Phase 4 gate) — RESOLVED (`fdb57567d`).** `setPinned` recomputed `pinnedTabs` on three paths the four `dropCacheTab` hooks missed: `unpinTarget` (nav-list unpin), `reconcileNavigation` (a pinned tab whose target is deleted, via `setPinned` at :661), and `applyNavChanged` (an external `nav.json`/sync change). A pin tagged `pin:<key>` orphaned there until the next nexus reset. The Phase 4 attack confirmed it Low (navKey is id-based, so revival is same-page-only, never wrong-page) and the Fable gate folded it: since all three route through `setPinned`, one scrub of any vanishing `pin:` id lives there — the pinned-tab analog of `closeTab`. The one path a `pin:` id must survive (`unpinTab`) retags *before* it reaches `setPinned`. Three regression tests: nav-list unpin scrubs, `pinTarget` scrubs nothing, `unpinTab` still migrates.
- **Warm handoff on lock (Latent, within the ratified warm-cache-aliasing edge).** `PickerMenu`'s `useHeld` keeps the live `PageTile` mounted through its exit, so on lock the pin's tile mounts and `restore()`s before the live tile's `capture()` fires at exit-end — the pin can inherit the pre-live warm entry (or a cold mount) rather than the exact scroll the user was viewing. This falls under the already-ratified "warm-cache-aliasing (known edge)" ruling (the pin object is safe in `glanceSlice`; only its scroll/warmth races). Not tractable to assert in jsdom (CodeMirror scrollTop stays 0 without layout); surfaced for the eyeball.

### Deviations
- **Task 10 — `data-reveal-host` added to both `.glance-body` wrappers (fence addition).** The fences specified `revealOnHover ghostRest` on the lock `Button`, but that class keys on `[data-reveal-host]:hover` (`button-base.css.ts`), so the wrappers must carry the marker or the lock never reveals. Added `data-reveal-host` to the live wrapper and every pin wrapper alongside `GLANCE_BODY_ATTR`. `unpinGlance` allocates a fresh array on a no-op (it is user-triggered, low-frequency); only `reconcileGlance` (runs on every tree push) is reference-preserving, matching `windowSlice`.
- **Task 8 — CardsView landed separately after a parallel collision (RESOLVED).** `CardsView.tsx` carried uncommitted parallel PropertyPanel-session edits throughout Phase 3, so Task 8's first commit (`a93b2f802`) was `TableView.tsx` + `GlancePane.tsx` + `glancePane.test.tsx` only. Once Nathan confirmed the parallel session was done, the three glance hunks (2 imports, the ghost `suppressed()` `|| glanceShown()`, and `PageCard`'s Shift-arm enter / cancel leave) were staged in isolation via `git apply --cached` of a hunk-scoped patch — leaving the parallel refactor in the working tree for its own session — and committed glance-only as `8496e2e16` (+13/−3). The parallel session then committed its CardsView refactor on top (`1d6cbf98c`); both coexist. Verified `8496e2e16` contains no parallel symbols.
- **Task 7 — `pageTargetFromNav` placed in `navResolve.ts`, not `NavList.tsx`.** The plan called it a "local helper," but both `NavList` (row) and `NavGallery` (card) need it and it wants a unit test, so "local" was already gone. `navResolve.ts` owns `ResolvedNav`, is a pure `.ts` that already imports from `treeIndex`, sits beside the breadcrumb resolver F6 contrasts it with, and already has `navResolve.test.ts` — the coherent home over a component file with a CSS side-effect. Nav rows read `tree` imperatively (`useSession.getState().tree`) in the hover handler — no per-row store subscription — matching `NavRowMenu`'s existing idiom. `NavRow` uses `MenuItem`'s `onMouseEnter`/`onMouseLeave` (it exposes those, not pointer-enter); `GalleryCard` uses `onPointerEnter`/`onPointerLeave` on `CardRoot`.
- **Task 1 shipped additive.** Task 1 added the `PreviewPersistence` type + resolvers but left `hoverPreviewLinger`/`coerceHoverLinger`/`HOVER_LINGER_MAX` alive; the whole removal rode Task 3's single hazard-window commit (as the Hazard Window paragraph describes). This keeps every commit's full typecheck green and let Task 2 land on its own — the plan's stated goal that the Task 1 "Becomes" field-removal note would have forced into a combined commit.
- **`readNexus.test.ts` was the fourth `hoverPreviewLinger` reader** (a codec round-trip test); it was rewritten to a `previewPersistence` round-trip in Task 3's commit.
- **L1 fold — ambient `shiftDown()` tracker dropped for `e.shiftKey`** (Phase 1 attack review, Fable-advisor-adjudicated: reachable + subtractive, not additive). The tracker read stale Shift state after app-switch-with-Shift-held (no `blur` reset) and before its first call. The fix deletes the mechanism rather than guarding it: surfaces read `e.shiftKey` off the pointer-enter event, which is where F5 always said the read happens. Removed `shift`/`tracking`/`shiftDown` from `glanceLink.ts` and its test; retired the now-single-reader `LEAVE_GRACE_MS` in `GlancePane.tsx` in the same commit (`previewLingerMs(persistence === 'off' ? undefined : persistence)`). F5, Task 2, the Phase 3 preamble, and Tasks 5/8 fences updated to match. Cleanup commit `313cc9f85` on top of Task 2's `3a03a5ef6`.

### Lessons
- **Phase 3's gate ran attack before simplify — the wrong order.** The Standard is simplify → review, always; the supervisor dispatched the build-breaking-agent first and did the simplification read after (catching the TabBar dup the attacker had already noted as an aside). No harm here (the diff was small, the one cut was independent of the findings), but attacking an un-simplified diff risks findings against complexity you were about to cut. Simplify first, then attack — every phase.

### Folded Eyeball Re-dos

Directed by Nathan during the live eyeball pass, after the four phases shipped — each folded and committed:

1. **Current-view guard** — a preview never resolves for the location already in the active view; because it's checked at the presenter (fire time) against the live selection, it also voids a dwell that lands after a click navigates onto that page ("2 solves 1"). `ffffd3d17`.
2. **Lock matches the sidebar `.row-lock`** — the corner control became a raw button styled like the disclosure lock: hidden at rest, revealed on card hover, always visible once locked. `e69bf31fe`.
3. **Shift arms anytime while hovering** — a hovered-target slot + a `!e.repeat` Shift keydown, so pressing Shift while resting on a ghost surface raises the preview without a leave-and-re-enter (fixes the sidebar and ghost-popped friction; the earlier behavior required Shift held *before* entering). `84e4f07d9`.
4. **Unlock keeps the pane open** — `PinnedGlance.locked` + `setPinLocked`; unlocking flips it in place instead of removing, and unlocked pins close on Esc / click-away / navigate while locked pins survive those. `84e4f07d9`.
5. **No jitter on lock** — the freshly-mounted pin skips the enter-bloom (`PickerMenu bloom`→`enter`, pins pass `enter={false}`) so it appears in place while the live pane blooms out behind it. `84e4f07d9`.
6. **Glance/pin exit via `useExitPresence`** — pins bloom *out* through `PickerMenu`'s `onExited` + a `wasClosing` latch and a local `exiting` set, rather than instant-splicing. `84e4f07d9`.
7. **Right-click never clobbers a preview** — one global capture-phase `contextmenu` listener cancels the pending dwell and clears the hovered surface. `84e4f07d9`.
8. **Esc closes a pin locked-or-not (R9)** — restored after the rework had scoped Esc to unlocked pins; click-away and navigate still spare locked pins. `f8a80d218`.
9. **Aborted ghost collapses via `Reveal` on cards** — Cards instant-dropped its create-ghost while sidebar and table collapsed theirs; Cards now routes through `Reveal`/`onCollapsed` too. `07f06c091`.

*(Also folded earlier, attack-driven rather than eyeball-driven: the L1 `shiftDown`→`e.shiftKey` removal `313cc9f85`, the pin-orphan `setPinned` scrub `fdb57567d`, and the TabBar tab-hover dedup `ab8a70e66`.)*

**Reversed-decision closeout audit — clean.** No trial-and-error residue from the decisions that were reversed or renamed: `shiftDown`, `LEAVE_GRACE_MS`, `hoverPreviewLinger`/`coerceHoverLinger`/`HOVER_LINGER_MAX`, `dropUnlockedPins`, and `unlockBtn` all resolve to zero references; `bloom` was fully renamed to `enter` with no residue; GlancePane carries no dead `Button` import; the `picker-base` DEV guard exemption (`anchorX === undefined`) was deliberately kept — two paths still unmount a pin while `open` (a tab-switch filter and a reconcile-drop), so it remains justified rather than reversed.

### Closeout

---

## Completion Criteria

*(Written at ratification, ticked at the end. Stands alone with the plan.)*

**The directive**

```
Execute the Hover Previews plan. <Unattended overnight | live>.
Your manual pass (no screenshots, no CDP hoops from me — the interaction things only you can judge): the
  six-surface hover walkthrough + the lock/nav/scroll/tab-switch/tab-pin/tab-close/Esc sequence on real data.
  Everything automated is gated; this is the only outstanding verification, collected in "The user's own pass" below.
Pings: at the Phase 3 stop, and at completion.
Record: History entry under the Glance arc.
Everything else is the standard below.
```

**The Standard**
- The bar: a future review of this arc finds nothing to correct.
- Only the live confirmation may be pending; no concerns carried, no deferrals when the fix is known.
- Reusability first — a second cache, resolver, pane, component, or slice means the plan is wrong or you are; log it. One new file only (`glanceSlice.ts`).
- Fix at the source; ambiguity takes the simplest reading, recorded under Rulings/Deviations.
- Per phase: implement → simplify → comment pass → gates (exit codes direct, never piped) → code review → attack review → **Fable advisor gate** → fold only surviving findings → commit (explicit glance paths only) → ping. Simplification before review.
- **Fable advisor gate (mandatory, every phase with an attack review):** before folding ANY attack finding, consult the Fable advisor to strip false positives, unreachable-state findings (no named user action/event/sequence produces them), and "fixes" that add code/guards/layers the requirements don't need. Only Reachable findings, or ones crossing a trust boundary (disk/IPC/user input), survive. Nothing flagged false-positive/unreachable/additive is folded without an explicit recorded reason.
- Comments only where the why can't be inferred; docs rewritten (not amended) where falsified; unattributed doc/style edits mid-run fold into the commit at hand.

**Then tick these.**

**The deliverable**
- [ ] Every numbered requirement (1–10) traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] Pins are page-only; only `glanceSlice.ts` is new; no new components.

**The passes**
- [ ] Simplification + comment pass over the whole range, not only per phase.
- [ ] Simplification → code review over the full implementation, in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against these ratified decisions.
- [ ] Every finding from every pass fixed or carrying a defensible ruling.

**The user's own pass** *(the only thing allowed to be outstanding)*
- [ ] Settings shows the 5-way "Hover Previews" picker; slider gone (Task 3).
- [ ] Off raises nothing on any surface (Task 2).
- [ ] Each surface raises a preview: editor, sidebar (Shift), tabs, nav views, cards (Shift), tables (Shift); trash/history raise nothing (Tasks 5–8).
- [ ] Plain hover keeps the create-ghost on sidebar/cards/tables; an open preview suppresses it (Tasks 5, 8).
- [ ] Over-pane keeps a preview open (Task 8).
- [ ] Lock pins an editor page preview; survives same-tab nav + anchor-scroll-off, tab-switch, tab pin/unpin; dies on tab-close; Esc closes any preview (Task 10).
- [ ] Dwell timings per surface feel right (the `detail`/`views` KNOBs); the Shift-before-enter contract feels acceptable.

**The record**
- [ ] `ConfigurationPM.md:42` rewritten in the commit that falsified it. (InterfacePM is Nathan's — not touched.)
- [ ] Dead Vocabulary sweep at 0 against its control.
- [ ] Context and Handoff current; History entry to its format.
- [ ] Lessons routed to `.claude/Guidelines/`; successor work named in Sequenced After.

**The report**, plain English — what shipped and why it matters · what happened worth knowing · every gate's real output · in-flight decisions a sentence each · what's left for the live pass · final +/- line count (comments + tests excluded). Honest about what didn't work.
