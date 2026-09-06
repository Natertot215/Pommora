## Hover Previews (Glance) — Cross-Surface, Persistence & Lock — Implementation Plan

> **Status:** written, pending review · Spec: this conversation's ratified decisions (no separate spec doc) · Execute tasks in order.
> Citations name files and symbols; re-derive before editing — the tree moves.

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
- `ghostCreate.ts:24` `onHover(id, entering)` carries no event/modifier, and `suppressed()` is re-read ~1.5s later at dwell-fire → **forces:** Shift is read from an ambient tracker (`shiftDown`) in the enter branch to *arm*; ghost suppression keys on `glanceShown()` (a preview is open), **not** on `shiftDown()` — otherwise pressing Shift mid-hover suppresses the ghost while arming nothing (the F5 dead zone). Preview dwell (600ms) < ghost dwell (1500ms), so a shift-armed preview is shown before the ghost checks. → Task 5, Task 8.
- `navResolve.ts` yields `ResolvedNav.path` as a breadcrumb (`TrailSegment[]`), not a file path; `treeIndex.ts:243` `pagesByIdOf(tree).get(id)?.path` is the id→file-path map → **forces:** nav-view arming resolves path via `pagesByIdOf`, not the nav resolver. → Task 7.
- `navRef.ts:52-54` a tab target may be homepage/context/space/collection/set, not only page → **forces:** tab arming gates on `target.kind === 'page'`. → Task 6.
- Pins are page-only (ratified) → **forbids:** locking a `kind:'site'` glance; the lock icon shows only for page targets. → Task 10.
- `picker-base.tsx` DEV-errors on unmount-while-`open`, and `useExitPresence` (its self-managed bloom) doesn't export the exit duration → **forces:** pins mount persistently with `open` toggled by `activeTabId`; removal is two-phase (mark `.closing` → bloom → `onExited` → drop), and `PickerMenu` gains a one-line `onExited` so the drop self-times against the real bloom. → Task 10.
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
- **One sanctioned shared-UIX widen:** a one-line `onExited?: () => void` prop on `PickerMenu` (`UIX/Pickers/picker-base.tsx`), fired when its `useExitPresence` settles to `mounted:false` — so a list of pinned panes drops each entry against the real bloom instead of duplicating the unexported exit duration. Additive and inert for every existing consumer.
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
- [ ] Red first: unit test `coercePreviewPersistence('5s'|undefined|'garbage'|7)` and `previewLingerMs('1s'|'10s'|'always'|undefined)` — expect module-export failures, then green.
- [ ] Degenerate: `coercePreviewPersistence(undefined)` → `undefined`; `previewLingerMs(undefined)` → 1000.
- [ ] `npm run typecheck` green.

**Verify — user**
- [ ] *(none.)*


#### Task 2: Widen `glanceLink.ts` into the app-side facade

**Requirement:** 1, 2, 5, 6

**Why:** One app-side owner of glance policy, grown from the file that already owns editor arming: an Off-gated `armPreview(target, el, slot)` (matching the house imperative-personalization-gate idiom — `confirmations.ts:20`, `openWebLink.ts:7`) plus an ambient `shiftDown` tracker. `glanceShown`/`setGlanceShown` go to `glanceAction.ts` instead — "a glance is on screen" is presenter-domain, sitting beside the existing `present`/`pending` module state, and `GlancePane` already imports from there. `glanceLink` stays the editor's bound-slot wrapper, so `editorHost` is untouched. `glanceAction.ts` stays a pure leaf and **exports** `GlanceDwell` (used by `armPreview`'s signature now, values widened in Task 4).

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
export function shiftDown(): boolean   // ambient: one lazily-attached window keydown/keyup pair (no existing tracker to reuse)
```

**Assumed by:** Tasks 5–7 (`armPreview` + `shiftDown`), Task 8 (`glanceShown`/`setGlanceShown` from `glanceAction`).

**Verify — automated**
- [ ] `rg -F 'armPreview' Core` → ≥1; `glanceLink` still resolves (kept); no new file.
- [ ] Guard both halves: persistence 'off' → `armPreview` presents nothing (spy the presenter); '1s' → presents. Disabling the gate makes the 'off' case fail. Editor path proven via `glanceLink`.
- [ ] `shiftDown()` flips on synthetic Shift keydown/keyup; `glanceShown()` reflects `setGlanceShown`.
- [ ] `npm run typecheck` · `npm run test` green.

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
// GlancePane.tsx:245-246 — narrow 'off' before the resolver (its domain excludes 'off'); 'always' → Infinity → schedule NO leave timer
const persistence = useSession((s) => s.personalization.previewPersistence)
const graceMs = persistence === 'off' ? LEAVE_GRACE_MS : previewLingerMs(persistence)
```

**Ordered Steps** *(hazard-window order)*
1. `SettingsWindow.tsx`: swap the row; drop the unused `HOVER_LINGER_MAX` import.
2. `codec.ts`: swap the line; fix imports.
3. `GlancePane.tsx`: swap the read; guard the leave `setTimeout` (GlancePane.tsx:295) so an Infinite `graceMs` schedules nothing. **Off-mid-open (ruling):** when persistence flips to 'off' while a live pane is shown, dismiss the live pane; **pins persist** (explicit artifacts — see Rulings).
4. `personalization.ts`: delete `coerceHoverLinger` + `HOVER_LINGER_MAX`.
5. Rewrite `ConfigurationPM.md:42` (the linger row) in this commit. *(InterfacePM is Nathan's — don't touch.)*

**Assumed by:** Task 10 ('always'/Infinity distinct from a pin).

**Verify — automated**
- [ ] `rg -F 'hoverPreviewLinger' .` → 0. `rg -F 'coerceHoverLinger' .` → 0. `rg -F 'HOVER_LINGER_MAX' .` → 0. Control: `rg -F 'previewPersistence' Core` → ≥5.
- [ ] Red-green: existing linger test inverted — '5s' → 5000ms grace; 'always' → no dismiss timer scheduled; 'off' → live pane dismissed (Off-mid-open). Old assertion fails first.
- [ ] Degenerate: `previewPersistence` absent → default '1s'; a legacy `hoverPreviewLinger` on disk is ignored (codec builds fresh — no migration; note the dropped pref).
- [ ] `npm run typecheck` · `npm run test` · `npm run lint` green.

**Verify — user**
- [ ] Settings → Navigation shows "Hover Previews" as a 5-way picker; slider gone. *(Carries.)*


#### Gate 1 — one setting, on/off proven, nothing dangling

- [ ] Gates green, exit codes read directly. Tasks 1–3 automated boxes ticked against watched results.
- [ ] Hazard window closed: no reference to `hoverPreviewLinger`/`coerceHoverLinger`/`HOVER_LINGER_MAX`.
- [ ] Dead Vocabulary sweep at 0 against its control.
- [ ] Simplification + review dispatched against `<base>..HEAD` (Glance + Settings); concerns fixed or ruled.
- [ ] `ConfigurationPM.md:42` linger row rewritten in Task 3's commit.
- [ ] Not a declared stop — Phase 2 opens; the two **Verify — user** boxes carry to Completion Criteria.

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
- [ ] `npm run typecheck` green (`GlanceDwell` widens; `armPreview` accepts the new slots).
- [ ] `rg -F 'GLANCE_DWELL' Core` shows the three keys.

**Verify — user**
- [ ] *(none.)*


#### Gate 2 — infrastructure ready

- [ ] Gates green. Simplification/review folds into Phase 3's if the diff is trivial (record in the Log).
- [ ] Not a declared stop; Phase 3 opens.

---

### Phase 3 — Wire the surfaces  *(Declared Stop at the gate)*

*Each task builds `{ kind: 'page', id, path }` from the row, calls `armPreview(target, el, 'detail'|'views')` on enter (Shift-gated where noted) and `cancelGlance()` on leave. Ghost surfaces add `|| glanceShown()` to `suppressed` — **not** `shiftDown()` (F5). The Off-gate lives in `armPreview`; no surface repeats it.*

#### Task 5: Sidebar rows (Shift-gated, `detail`)

**Requirement:** 2, 4, 5 · **Why:** The sidebar hosts ghostCreate, so Shift arbitrates: plain hover keeps the create-ghost, Shift+hover previews. Its `suppressed` gains `glanceShown()` so an open preview stands the ghost down — without the mid-hover dead zone `shiftDown()` would cause.

**Now** — re-derive. `Sidebar.tsx:435-451` (`PageRow`) + `:785-789` (ghost opts):

```tsx
onPointerEnter={api ? () => api.onHover(page.id, true) : undefined}
onPointerLeave={api ? () => api.onHover(page.id, false) : undefined}
suppressed: () => useSession.getState().renamingPath !== null,
```

**Becomes** — Shift arms a `detail` glance; ghost self-suppresses only while a preview is shown:

```tsx
onPointerEnter={() => {
  api?.onHover(page.id, true)
  if (shiftDown()) armPreview({ kind: 'page', id: page.id, path: page.path }, rowRef.current!, 'detail')
}}
onPointerLeave={() => { api?.onHover(page.id, false); cancelGlance() }}
suppressed: () => useSession.getState().renamingPath !== null || glanceShown(),
```

**Verify — automated**
- [ ] `npm run typecheck` · `npm run lint` green. `rg -F 'armPreview' Core/Interface/Sidebar` → ≥1.
- [ ] Crossing test: Shift held on enter → `armPreview` arms; once the preview shows, `suppressed()` → true. Enter without Shift → no arm, `suppressed()` false (ghost blooms). Pressing Shift after entering does not dead-zone: no preview, but the ghost still blooms.

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
- [ ] `npm run typecheck` green. `rg -F 'armPreview' Core/Navigation/TabBar.tsx` → ≥1.
- [ ] Degenerate: a non-page tab target arms nothing.

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
- [ ] `npm run typecheck` green. `rg -F 'armPreview' Core/Navigation/NavList.tsx Core/Navigation/NavGallery.tsx` → ≥1.
- [ ] Crossing test: `pageTargetFromNav`'s path equals `pagesByIdOf(tree).get(id).path` for a known page id — resolver and arm agree.
- [ ] Degenerate: id absent from `pagesByIdOf` → null → no arm; non-page nav ref → null.

**Verify — user**
- [ ] Recents/pins page row → preview. *(Carries.)*


#### Task 8: Cards + Tables (Shift-gated, `views`) + over-pane + `setGlanceShown`

**Requirement:** 2, 4, 5, 6 · **Why:** The two Views surfaces host ghostCreate; Shift arbitrates as in the sidebar. This task closes R6 (the `insideGlance` guard already refuses arming from inside the pane) and wires `setGlanceShown` so `glanceShown()` is true only while a live pane shows — and flips back false on **every** hide path (dismiss + retarget-through-null), so the ghost can't stay suppressed.

**Now** — re-derive. `TableView.tsx:1429-1439` + `:907-914`; `CardsView.tsx:1115-1124` + `:209-217`. `GlancePane.tsx` shown effect doesn't yet call `setGlanceShown`.

**Becomes** — Views rows Shift-arm a `views` glance; ghost `suppressed` gains `glanceShown()`; the pane publishes shown state:

```tsx
// Table DataRow / Cards card row
onPointerEnter={() => { api.hover(row, true); if (shiftDown()) armPreview({ kind: 'page', id: row.id, path: row.path }, /* row el */, 'views') }}
onPointerLeave={() => { api.hover(row, false); cancelGlance() }}
// both ghost opts gain: || glanceShown()
// GlancePane.tsx — `shown` is the single source; retarget-through-null and dismiss both flow through it
useEffect(() => { setGlanceShown(shown !== null); return () => setGlanceShown(false) }, [shown])
```

**Verify — automated**
- [ ] `npm run typecheck` · `npm run lint` green. `rg -F 'armPreview' Core/Views` → ≥2.
- [ ] Guard both halves (R5): live glance shown → both Views ghosts' `suppressed()` true; none shown → false.
- [ ] `setGlanceShown` lifecycle: after dismiss and after retarget-through-null (GlancePane.tsx:171-194), `glanceShown()` is false (assert the false transition — the ghost can't stay stuck).
- [ ] R6: `armGlance` on an element inside the open pane no-ops (`insideGlance`); the leave grace clears while over the card (GlancePane.tsx:293-294 test still green).

**Verify — user**
- [ ] Shift+rest on a card/table row → preview; plain rest → create-ghost. Over-pane keeps it open. *(Carries.)*


#### Gate 3 — cross-surface behavior  **[DECLARED STOP]**

- [ ] Gates green. Every Phase 3 automated box ticked.
- [ ] Simplification → review over `<base>..HEAD` (Sidebar, Navigation, Views, Glance); concerns fixed or ruled.
- [ ] Trash/history untouched: `rg -F 'armPreview' Core/Trash Core/Settings/TrashFrame.tsx` → 0; `rg -F 'glance' Core/Interface/Windows/PageHistoryWindow.tsx` → 0. Control: `rg -F 'armPreview' Core/Navigation` → ≥1.
- [ ] **Halt.** User eyeballs on real data: dwell feel (the `detail`/`views` KNOBs), Shift arbitration, the "press Shift before entering" contract (F5), plain hover on tabs/nav, Off kills all. Record KNOB retunes under Rulings. Phase 4 opens only on the user's go.

---

### Phase 4 — Lock and pinned multi-pane  *(`glanceSlice.ts` + in-place `GlancePane`/`navigationSlice`)*

#### Task 9: `glanceSlice.ts` — the pin store, wired like its six siblings

**Requirement:** 8 · **Why:** Pins are explicit user artifacts, not a cache — so they live in their own Session slice (the established pattern; the growth home for future detach/move), never LRU-evicted, keyed to survive per-tab and same-page-across-tabs. The pinned page's editor *state* still rides `GlancePane`'s warm cache untouched. Critically, the slice must carry the **two lifecycle hooks every per-nexus slice wires** — a nexus-switch reset and a rename reconcile — or it reads as bolted-on and leaks pins across nexuses / orphans them on rename (both verified against `nexusSlice`).

**Now** — no glance slice; `store.ts:28-37` composes seven slices. `nexusSlice.resetNexusSession` (:43-51) calls a `resetX` per slice; `applyTree` reconciles via `reconcileNavigation`/`reconcileWindow` (:146-148). Pins have no home and no hooks.

**Becomes** — `Core/Session/glanceSlice.ts` (new), composed and hooked:

```ts
// glanceSlice.ts — reuse GlanceSize (windowRecord, = {w,h}); pinId via makeTabId (tabsModel.ts:298, the session-id minter)
// Placement is the FROZEN ANCHOR POINT + direction (render-layer finding), NOT the pane corner — PickerMenu re-adds gap/origin.
export type PinnedGlance = {
  pinId: string
  tabId: string
  target: { kind: 'page'; id: string; path: string }
  anchorX: number; anchorY: number; anchorHeight: number   // frozen trigger point for PickerMenu
  dir: PickerDirection                                       // frozen — decidedDir resets on open=false, would else flip
  size: GlanceSize
  closing?: boolean                                          // two-phase exit: marked here, dropped on the pane's onExited
}
export interface GlanceSlice {
  pinnedGlances: PinnedGlance[]
  pinGlance: (p: Omit<PinnedGlance, 'pinId'>) => void        // makeTabId() pinId; appends
  unpinGlance: (pinId: string) => void                       // marks .closing (rides Bloom-out); dropGlance removes on onExited
  scrubTabPins: (tabId: string) => void                      // tab closed: mark active-tab pins closing (ride exit), drop inactive directly (open already false → no unmount-while-open)
  retagTabPins: (oldId: string, newId: string) => void       // tab re-keyed (survives): move its pins oldId→newId
  dropGlance: (pinId: string) => void                        // remove; wired to each pin's onExited
  reconcileGlance: (index: ReconcileIndex) => void           // rename: reconcileWith per target — repath, or drop a 'none' (same as tabs/windows)
  resetGlance: () => void                                    // per-nexus wipe
}
const PER_NEXUS = { pinnedGlances: [] } satisfies Partial<GlanceSlice>  // resetGlance: () => set({ ...PER_NEXUS })
// store.ts:36 — add `...createGlanceSlice(...a),` ; sessionState.ts — add `& GlanceSlice` to SessionState
// nexusSlice.ts:50-51 — add `s.resetGlance()` to resetNexusSession ; :148 — add `get().reconcileGlance(index)`
```

Reconcile template — mirror `windowSlice.ts:264-268`: loop `pinnedGlances` through `reconcileWith(index, p.target)`; `'page'` with a new path → repath; `'none'` → drop. A reconcile-drop of a deleted page is not "silent" (same treatment tabs/windows get), so it satisfies R8's *never-silently-evicted* wording.

**Assumed by:** Task 10 (lock/render/scrub/re-tag/Esc/onExited).

**Verify — automated**
- [ ] `npm run typecheck` green; `useSession.getState().pinnedGlances` exists; `PickerDirection`/`GlanceSize`/`ReconcileIndex`/`makeTabId` imported, not re-declared.
- [ ] Unit: `pinGlance` appends with a fresh `pinId`; `unpinGlance` marks `.closing`; `dropGlance` removes; `scrubTabPins('A')` affects only A; `retagTabPins('A','B')` moves A's pins to B (survives); the same page under two tabIds is two entries (F3).
- [ ] Reset: `resetGlance()` empties `pinnedGlances`; a nexus switch through `resetNexusSession` clears pins (integration — the bulk `resetNavigation` path, not `closeTab`).
- [ ] Reconcile (crossing): after a page repath in the index, `reconcileGlance` updates the pin's `target.path` to the same value `reconcileWith` gives a tab; a deleted page drops the pin.
- [ ] Degenerate: `pinnedGlances` starts `[]`; `unpinGlance`/`dropGlance` of an unknown id is a no-op; `reconcileGlance` with no matching pins no-ops.

**Verify — user**
- [ ] *(none — no visible change yet.)*


#### Task 10: Lock button, pinned render, tab lifecycle, Esc-closes-any

**Requirement:** 7, 8, 9 · **Why:** The behavior itself, rendered by the pane that already exists. `GlancePane` gains a corner lock on the live page card and a render of every `pinnedGlances` entry — reusing the file's own `<PageTile>` render + fold handler (no new component), the `Button` icon recipe for the padlock, and PickerMenu's own `useExitPresence` bloom-out (no hand-rolled exit timer). A pin survives navigation and scroll because nothing dismisses it; it follows its tab through pin/unpin re-keys and vanishes on real close, via `glanceSlice` calls wired into `navigationSlice`'s existing lifecycle.

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
// GlancePane.tsx — local const, closes over resolveOnly + GLANCE_ANCESTORS (both in scope). Per-pin warm seam over the shared map.
const renderPageTile = (t: { id: string; path: string }): React.JSX.Element => (
  <PageTile key={t.path} path={t.path} editing={false} onBeginEdit={NOOP}
    locked connections={resolveOnly} warm={glanceWarmSeam(t.id, t.path)} ancestors={GLANCE_ANCESTORS} />
)
// live wrapper: the existing div (cardRef + its handlers) → { page ? renderPageTile(page) : <webview…> }{lockBtn}
// pin wrapper (minimal, own div): <div {...{[GLANCE_BODY_ATTR]:''}} className="glance-body" style={size} onClick={onFoldClick}>
//   { renderPageTile(p.target) }{ unlockBtn(p.pinId) }</div>
//   — GLANCE_BODY_ATTR is REQUIRED on every pin wrapper, or insideGlance() misses it and a Shift-hover over a [[link]]
//     inside a pinned pane arms a fresh glance on top of it.
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
// onLock: freeze the ANCHOR point + direction (NOT the pane corner — PickerMenu re-adds gap/origin from an anchor point),
//   plus the resolved live box size. cardRef's rect would double-apply the placement offset.
const onLock = (): void => {
  if (!page || !shown) return
  const a = shown.el.getBoundingClientRect()
  pinGlance({ tabId: activeTabId, target: page, dir,
    anchorX: a.left + a.width / 2, anchorY: a.top, anchorHeight: a.height, size: box })
  dismiss()
}
```

*(c) Rendering the pins — every pin mounts (a tab switch toggles `open`, never unmounts, F8); shows only on its own tab; carries no `watchAnchor` and is outside the live dismiss effect, so nav-off and anchor-loss leave it standing. `closing` lives in the SLICE, not a local Set — the tab-close removal originates in `navigationSlice`, which a GlancePane-local Set can't gate. `onExited` drops after the bloom.*
```tsx
const pinnedGlances = useSession((s) => s.pinnedGlances)
const activeTabId = useSession((s) => s.activeTabId)
const { pinGlance, unpinGlance, dropGlance } = useSession((s) => s)
{pinnedGlances.map((p) => (
  <PickerMenu key={p.pinId} glass="window" anchorX={p.anchorX} anchorY={p.anchorY} anchorHeight={p.anchorHeight}
    direction={p.dir} manageFocus={false} modal={false} origin="center"
    open={p.tabId === activeTabId && !p.closing}
    onExited={() => dropGlance(p.pinId)}>
    <div {...{ [GLANCE_BODY_ATTR]: '' }} className="glance-body"
      style={{ width: p.size.w, height: p.size.h }} onClick={onFoldClick}>
      {renderPageTile(p.target)}
      {unlockBtn(p.pinId)}
    </div>
  </PickerMenu>
))}
// unpinGlance / scrubTabPins mark .closing → open flips false → PickerMenu blooms out → onExited → dropGlance removes.
// (scrubTabPins drops an inactive tab's pins directly — their open was already false, so no unmount-while-open.)
```
*`onExited` is a one-line prop added to `PickerMenu` — see the scope note in Global Constraints. Without it, `glanceSlice` drops on a timer that must approximate the (unexported) bloom duration.*

*(d) Esc — the live pane keeps `watchAnchor.onEscape` (focus-restore); this adds ONLY the pin case, bailing when a live pane is shown or the event was consumed, so no double-close. `unpinGlance` marks `.closing` (rides the exit).*
```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || e.defaultPrevented || shown) return
    const newest = pinnedGlances.filter((p) => p.tabId === activeTabId && !p.closing).at(-1)
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
1. `GlancePane.tsx`: lift the `<PageTile>` call into `renderPageTile`; keep `onFoldClick` a shared pure handler. The live `.glance-body` wrapper (cardRef + its handlers) is unchanged and renders `renderPageTile(page)` (behavior-preserving).
2. Add `PickerMenu`'s `onExited` prop (one line in `UIX/Pickers/picker-base.tsx`, fired when its `useExitPresence` goes `mounted:false`) — see the Global Constraints scope note.
3. Add the `Button` lock/unlock (page-only, `onMouseDown` preventDefault) + `onLock` (freeze anchor + `dir` + `box` from `shown.el`); a `glance-lock` CSS rule (corner-absolute, reuse existing button tokens).
4. Render the `pinnedGlances` map as siblings of the live PickerMenu (own minimal `.glance-body` wrapper carrying `GLANCE_BODY_ATTR`), `open` toggled by `activeTabId && !p.closing`, `onExited={() => dropGlance(p.pinId)}`.
5. Add the guarded Esc keydown (marks `unpinGlance`, bails on `shown`/`defaultPrevented`).
6. `navigationSlice.ts`: `scrubTabPins` at the two real closes; `retagTabPins` N→N inside the `graduatePinCovered` loop and the `unpinTab` pair.
7. *(InterfacePM's navigation/anchor sentence is falsified by pinned panes, but Nathan pre-edited that doc — don't touch it.)*

**Assumed by:** — *(terminal task; nothing downstream.)*

**Verify — automated**
- [ ] Guard both halves (persist): a pin survives a simulated nav (`selection`/`activeTabId` effect fires) and an anchor removal (`watchAnchor` onGone) — assert it still renders; a **live** glance under the same events dismisses (control).
- [ ] Re-key (F2): a pin on a tab that is pinned (`graduatePinCovered`) then unpinned (`unpinTab`) survives both, re-tagged to the surviving id; `scrubTabPins` fires only at real closes. Control: `rg -F 'retagTabPins' Core/Session/navigationSlice.ts` → matches the two re-key sites; `rg -F 'scrubTabPins' Core/Session/navigationSlice.ts` → the two close sites (re-derive counts).
- [ ] Tab close: closing a tab drops its pins; another tab's remain; closing the tab that owns the live (non-pinned) glance behaves (live dismisses via its own effect).
- [ ] Esc (F7): live shown → `watchAnchor` closes it and the new keydown bails on `shown` (no double-close); only pins → newest active-tab pin closes; neither touches the other's panes.
- [ ] F8 (both removal paths ride the exit): a tab switch toggles pins' `open` without unmounting (no DEV "unmounted while open" error); an unpin marks `.closing` → bloom → `onExited` → `dropGlance`; closing a **background** tab drops its (already-`open:false`) pins directly with no error; closing the **active** tab marks its open pin `.closing` so it blooms rather than hard-unmounting.
- [ ] Site target: `lockBtn` is `null` for a `kind:'site'` live card — the lock is unreachable for a website preview.
- [ ] Focus: clicking the lock does not move focus off the host (the `onMouseDown` preventDefault holds the pane's never-take-focus contract).
- [ ] `npm run typecheck` · `npm run test` · `npm run lint` (incl. `no-wrapped-comments`) green.

**Verify — user** *(your manual pass — the interaction verification I can't cheaply do myself; run at the final pass on real data)*
- [ ] Lock an editor page preview → it pins in place; navigate within the tab and scroll the anchor off screen → it stays put; switch to another tab and back → it's still there; pin the tab, then unpin it → it survives both; close the tab → it's gone.
- [ ] Esc closes whichever preview is open — live or locked.
- [ ] The lock control never appears on a website preview.
- [ ] The lock/unlock padlock reads right in the corner, and a pin's Bloom-out plays on release (no instant vanish).


#### Gate 4 — lock and persistence

- [ ] Gates green. Every Phase 4 automated box ticked against watched results.
- [ ] Only `glanceSlice.ts` is new; no new components — confirm with `git status`. (InterfacePM untouched — Nathan's.)
- [ ] Simplification → review over `<base>..HEAD` (glanceSlice, Glance, navigationSlice); concerns fixed or ruled.
- [ ] Refactor baseline (Task 10 step 1) held: no live-glance behavior moved.
- [ ] Not a declared stop; carries to Completion Criteria (Phase 3 was the stop).

---

## Implementation Log

### Progress

- [ ] **Phase 1** — One setting owns persistence · base `<commit>`
  - [ ] Task 1 — Persistence type + resolver · `<commit>`
  - [ ] Task 2 — Widen `glanceLink.ts` (armPreview + predicates; export GlanceDwell) · `<commit>`
  - [ ] Task 3 — Picker replaces slider (hazard window) · `<commit>`
- [ ] **Phase 2** — Dwell slots
  - [ ] Task 4 — `detail`/`views` dwell values · `<commit>`
- [ ] **Phase 3** — Wire surfaces **[STOP]**
  - [ ] Task 5 — Sidebar (Shift) · `<commit>`
  - [ ] Task 6 — Tabs · `<commit>`
  - [ ] Task 7 — Nav views (pagesByIdOf resolve) · `<commit>`
  - [ ] Task 8 — Cards + Tables (Shift) + over-pane + setGlanceShown · `<commit>`
- [ ] **Phase 4** — Lock + pinned multi-pane
  - [ ] Task 9 — `glanceSlice.ts` pin store · `<commit>`
  - [ ] Task 10 — Lock button, pinned render, tab lifecycle, Esc · `<commit>`

### Rulings
- Pinned panes are non-resizable, frozen at lock-time rect (v1) — surfaced for the eyeball; revisit for resizable pins.
- **Off-mid-open:** flipping persistence to 'off' dismisses the live pane; existing pins persist (explicit artifacts, closed via unlock/Esc).
- **'always' + ghost suppression (F10):** with Until Closed, an open live preview keeps `glanceShown()` true, so create-ghosts stay suppressed until the preview is closed/replaced/navigated. Designed consequence of R5; surfaced at the Phase 3 eyeball — exempt 'always' from suppression only if Nathan dislikes it.
- **Shift-arm contract (F5):** Shift is read at pointer-enter; pressing Shift after entering doesn't arm a preview (leave+re-enter with Shift). Chosen over a re-arm-on-keydown mechanism for least parts; the ghost still blooms in that case, so it's no dead zone. Surfaced at the eyeball.
- **Pin key (F3):** pins are a list keyed by minted `pinId`, tagged with `tabId` — multiple per tab and the same page across tabs both work.
- **Warm-cache aliasing (known edge):** the pin's editor *state* rides the id-keyed warm cache (`glanceWarmSeam`), so the same page pinned in two tabs shares one warm entry — scroll can race on tab-switch, and a pin's editor state (not the pin) can be evicted past `GLANCE_WARM_CAP=10` warm glances. The pin *object* is safe in `glanceSlice`; only its scroll/warmth is affected. Accepted; revisit only if it reads wrong at the eyeball.
- **retag ≠ drop (divergence flag):** the warm cache is *dropped* on tab re-key at all four sites; pins must *survive* re-key (R8), so `retagTabPins` is deliberately NOT `dropCacheTab`. A later "reuse" pass must not collapse them.
- **`onExited` widen:** adding the one-line `onExited` prop to `PickerMenu` is sanctioned (Global Constraints) — the disclosed in-flight decision to touch shared UIX. Vetoable; the fallback is a `glanceSlice` drop timer approximating the bloom.

### Open Against Later Tasks

### Deviations

### Lessons

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
- Per phase: implement → simplify → comment pass → gates (exit codes direct, never piped) → code review → attack review → every finding fixed or ruled → commit → ping. Simplification before review.
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
