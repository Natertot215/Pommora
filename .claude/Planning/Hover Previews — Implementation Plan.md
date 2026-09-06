## Hover Previews (Glance) — Cross-Surface, Persistence & Lock — Implementation Plan

> **Status:** written, pending review · Spec: this conversation's ratified decisions (no separate spec doc) · Execute tasks in order.
> Citations name files and symbols; re-derive before editing — the tree moves.

**Goal**

Extend the existing Glance hover-preview pane from its single editor host to every page-nav surface, put its whole persistence story under one settings control, and let a preview be pinned in place. At the end: hovering a resolvable page anywhere except trash/history raises a preview; one **Preview Persistence** setting turns previews off or sets how long they linger (Off / 1s / 5s / 10s / Until Closed); a lock icon pins a page preview so it survives navigation, scroll, and tab-switching until closed; and Esc closes any preview.

This takes the shape it does because the pane was **built for it**: `InterfacePM.md:75` already states *"a sidebar row, a tab, or a view row could raise the same pane through the same call,"* the dwell map is a documented per-surface enum (`glanceAction.ts:9-11`, *"further surfaces add their own rows"*), and PickerMenu already floats at a fixed unanchored point (`picker-base.tsx:162-174`). So the work is wiring, not invention — **no new pane, no new component, no new positioning engine, no new cache, no new files.** The existing pieces are widened in place: `GlancePane` renders the pinned panes too, `glanceLink.ts` grows into the app-side facade, and pins ride the pane's existing `warm` map. Alternatives weighed and rejected (see Inherited Reasoning): a global "everything sticky" mode instead of a per-pane lock; a bespoke per-tab pin store instead of the existing 10-slot warm cache; three separate settings instead of one; and extracting any new component. The user ratified: one unified setting, lock kept as a per-pane override, pins page-only, sharing the 10-slot cache, nav views included, and nothing new created that already exists.

Bounding constraints: **least moving parts** — reuse the pane, the cache, the dwell enum, the settings-row kinds, the modifier idioms; nothing hand-rolled or newly filed that already exists. Pins are **page-only** — a website (webview) preview is never pinned. This does **not** add durable/on-disk pin persistence (session-memory only), does not restore pins by any machinery (they simply aren't evicted), and does not touch trash or history.

**Requirements**

1. A settings control enables/disables hover previews. *(satisfied by R10's "Off" rung)*
2. Previews work across page-nav surfaces: editor connections/links + table cells (existing), sidebar rows, tabs, nav-view rows (recents/pins), cards, table rows.
3. Trash and history surfaces never raise a preview.
4. On surfaces that host ghostCreate (sidebar, cards, tables), **Shift**+hover raises the preview; plain hover keeps the create-ghost. Plain hover raises the preview on surfaces without ghostCreate (tabs, nav views).
5. An open live preview suppresses ghostCreate.
6. The dismiss timer pauses while the cursor is over the pane, so an in-use preview isn't clobbered.
7. A top-right lock icon pins a **page** preview: frozen position, auto-dismiss dropped, until unlocked. Editor (MarkdownPM) page glances only.
8. A pinned preview survives nav-off and scroll-out-of-view; is scrubbed when its tab closes; occupies the existing 10-slot glance cache; multiple pinned previews coexist per tab; no restore machinery.
9. Esc closes a glance, locked or not.
10. A stepped **Preview Persistence** setting (Off / 1s / 5s / 10s / Until Closed) replaces both the `hoverPreviewLinger` slider and the (never-built) enable toggle.

**Acceptance — the whole thing working:** With Preview Persistence at "5s", hovering a page on each of the six surface groups (Shift-held where the surface has ghostCreate) raises the preview within its dwell and it lingers 5s after leave; hovering trash or history rows raises nothing; over-pane keeps it open; locking an editor page glance pins it, and it stays through a same-tab navigation and a scroll that removes its anchor, reappears after switching away and back to its tab, and vanishes when that tab closes; Esc closes whichever is open; setting Preview Persistence to "Off" stops every surface from raising anything.

**Forced By** *(what each grounded fact makes mandatory or free)*
- `editorHost.tsx:94` binds `arm: glanceLink` → **free:** widening `glanceLink`'s module with an Off-gated `armPreview` covers editor + all new surfaces from one place, and `glanceLink` staying a thin `armPreview(…, 'link')` wrapper leaves editorHost untouched. → Task 2.
- `picker-base.tsx:162-174` returns a static point rect when `anchorX`/`anchorY` are set and skips the trigger observer → **free:** a pinned pane is another `PickerMenu` at a frozen point, no new positioning; `modal={false}` (already the glance mode) lets app dismissals through. → Task 10.
- `GlancePane.tsx:63-77` already exports module functions (`glanceSize`, `setGlanceSize`, `glanceWarmSeam`) over the `warm` map → **free:** pin state and its scrub are sibling exports on that same module — no new file for `navigationSlice` to import. → Task 9.
- `glanceAction.ts:28` no-ops when the anchor sits inside an existing glance (`insideGlance`) → **free:** hovering the pane can't clobber it (R6 half-satisfied). → Task 8.
- `ghostCreate.ts:24` `onHover(id, entering)` carries no event or modifier, and `suppressed()` is re-read ~1.5s later at dwell-fire → **forces:** Shift is read from an ambient tracker (`shiftDown`), not the ghost hook or a captured event. → Task 5, Task 8.
- `navResolve.ts:7-15` nav rows carry `target.id` but no file path → **forces:** nav-view arming resolves path from id via the tree index. → Task 7.
- `navRef.ts:52-54` a tab target may be homepage/context/space/collection/set, not only page → **forces:** tab arming gates on `target.kind === 'page'`. → Task 6.
- `capMap.ts` `capSet` evicts the oldest on overflow with no pin-protection → **forces:** a pinned entry counts toward the 10 and can evict (matches "takes part of the 10"); no special protection is added. → Task 9, Task 10.
- Pins are page-only (ratified) → **forbids:** locking a `kind:'site'` glance; the lock icon shows only for page targets. → Task 10.

**Inherited Reasoning**
- **Global "everything sticky" instead of a per-pane lock — rejected.** A global "Until Closed" that makes every hover persist buries the user in panes to close; the lock keeps the default transient and pins the chosen few. The two live on one axis (the lock = per-pane "Until Closed"), so it's one concept, not two.
- **A bespoke per-tab pin store with restore-on-activate — rejected.** Pins live as a field on the existing 10-slot `warm` map inside `GlancePane`; they "reappear" on tab-return only because they were never evicted, not through restore code. No new store, no subscribe machinery — the pane re-renders on its existing triggers plus a local epoch bumped by lock/unlock.
- **Three separate settings (enable toggle + linger slider + lock) — rejected.** One `picker` row (Off/1s/5s/10s/Until Closed) subsumes enable (Off) and linger; the lock is the only additional control, and it's a per-pane override of the same axis.
- **Pinning websites — rejected.** A persistent floating webview per pin is a Chromium-deferred, resource-heavy guest for negligible value; pins are page-only.
- **Extracting any new pane/card/body component — rejected** (user directive + simplicity). `GlancePane` and `glanceLink.ts` already exist. A pinned pane reuses `GlancePane`'s own `.glance-body` page markup via a local render helper inside the component; the app-side facade widens `glanceLink.ts` in place; pin state rides `GlancePane`'s existing `warm` map. No new files, no new components — the live pane's live-only machinery (webview lifecycle, resize, leave-grace, `watchAnchor`, retarget, anchor-band `maxSize`) simply isn't invoked on the pinned render path.
- **Per-surface dwell timings are KNOBs, not decisions.** `link` stays 1000ms; `detail`/`views` seed at 600ms and are tuned on sight (build-then-show).

**Grounding** *(re-open these; don't cite them)*
- `Core/Interface/Glance/glanceAction.ts` — the pure timer leaf: `GLANCE_DWELL` enum, `armGlance/cancelGlance/closeGlance`, `insideGlance`, `watchAnchor`. Stays a leaf.
- `Core/Interface/Glance/GlancePane.tsx` — the singleton pane and its module exports: presenter slot, `warm` Map (cap 10) + `glanceWarmSeam` (73-77), size cache (44-71), leave lifecycle (253-304), resize (153-169, 377), webview guest lifecycle (222-243, 357-375), page body + fold-click + focus handoff (324-356). **All new rendering and pin state land here.**
- `Core/Interface/Glance/glanceLink.ts` — the existing app-side arm adapter (`arm: glanceLink` on the editor host); **widened in place** into the app-side facade.
- `Core/MarkdownPM/api.ts:13-15,74-78` — `GlanceTarget`, the `glance` facet.
- `Core/Pages/editorHost.tsx:92-94` — editor glance wiring (unchanged: still `arm: glanceLink`).
- `Core/Settings/personalization.ts:90-120,146-151` · `codec.ts:100` · `SettingsWindow.tsx:77-115,317-330,851-915` — settings type, codec, row kinds, `hoverPreviewLinger` slider, `ToggleRow`/`PickerControlRow`.
- `Core/Navigation/warmTabs.ts` + `UIX/Utilities/capMap.ts` — the per-tab cache pattern and `capSet` LRU.
- `Core/Session/navigationSlice.ts:53,311,413,448,685` — `dropCacheTab` imported once (:53) and called at four tab-close sites.
- `UIX/Interactions/ghostCreate.ts:13-33` — `useGhostAnchor` options (`suppressed`) and `onHover`.
- `UIX/Pickers/picker-base.tsx:69-72,162-174,239` — fixed-point placement.
- `Core/MarkdownPM/Links/connectionClicks.ts:66-82` · `Links/linkClicks.ts:64-96` · `Tables/cellStatic.tsx:214-219` — existing dwell wiring.
- Surface seams (scout-verified, re-derive line numbers): `Sidebar/Sidebar.tsx:414-461,785-820` · `Views/Table/TableView.tsx:907-936,1429-1439` · `Views/Cards/CardsView.tsx:209-252,1115-1124` · `Navigation/TabBar.tsx:234-348` · `Navigation/NavList.tsx:127-155` + `NavGallery.tsx` · `navResolve.ts:7-15` · `navRef.ts:3-54`.
- `UIX/Symbols/index.tsx:166` — the curated `locked` icon (`<Icon name="locked" />`).
- `.claude/Features/InterfacePM.md:73-75` · `.claude/Features/ConfigurationPM.md:42` — the docs this falsifies.

**Environment**
- **Plan directory:** `.claude/Planning/` (project convention).
- **Explorer:** `Explore` agent. **Reviewer:** `code-simplifier` then `build-breaking-agent` (StudioMD: simplification precedes attack). **Neutral verifier:** `general-purpose`. **Simplification:** `code-simplifier` / `code-simplification` skill. **Comment pass:** `comment-killer-agent`.
- **Gate commands** (repo root): `npm run typecheck` (the only type gate; covers every tsconfig) · `npm run test` (Vitest) · `npm run lint` (`biome check` — linter + formatter). A PostToolUse hook formats TS/CSS/JSON writes; shell-driven edits bypass it, which is why lint checks. No spec input beyond this conversation; the D-phase core list is the ratified answers above.
- **Rules directory:** `.claude/Guidelines/` (`Editor-Internals.md`, `InteractionPM` behavior) + user memory.

**Shapes:** additive (new surfaces, new setting behavior, lock) · refactor (widen `glanceLink.ts`; add a `pin` field + sibling exports to `GlancePane`'s existing `warm` cache — no new files) · removal (`hoverPreviewLinger` and its coercer) · user-visible (every surface + the lock + the setting).

**Declared Stops**
- **Phase 3 gate** — the cross-surface hover interaction (which surfaces raise a preview, the Shift arbitration, the dwell feel) is pure interaction taste and cheapest to redirect before the lock is built on top of it. Halt for the user to eyeball dwell timings + Shift behavior on real data. *(Per user's standing preference, this is the one mid-plan stop; Phase 4's lock behavior carries to the final user pass rather than halting.)*

**Global Constraints (every task inherits these):**
- Gates from repo root, exit codes read directly, never piped: `npm run typecheck` · `npm run test` · `npm run lint` (`biome check` + the comment-shape scan `.claude/hooks/no-wrapped-comments.mjs`). A change that adds a diagnostic, leaves a file unformatted, or wraps a block comment across lines isn't done.
- Biome formatting is authoritative (single-quote, no semicolons); never hand-align. An Edit failing on whitespace means the hook reformatted — re-read and retry.
- Comments only where the why can't be inferred; no status/pending narration; KNOB comments carry the tunable's rationale. **A block comment must not span lines** (the `no-wrapped-comments` scan) — use a single-line `/** … */` or stacked `//` lines.
- **No new files or components** — widen what exists (`GlancePane.tsx`, `glanceLink.ts`) in place.
- `Core/Contract` boundary: any new channel is one `bridge.ts` entry, both ends derived, `Result` envelope. *(This plan adds none — all state is session-memory.)*
- Report +/- line counts (comments + tests excluded) after significant changes.
- Out of scope everywhere: trash (`Core/Trash/`, `Core/Settings/TrashFrame.tsx`), history (`Core/Interface/Windows/PageHistoryWindow.tsx`, `Core/Pages/fileHistory.ts`), `Showcase/`, any on-disk pin persistence, any website-glance pinning.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `ConfigurationPM.md:42` | "Hover Preview Linger \| `hoverPreviewLinger` \| … \| **None** · 1–30 seconds" | Row replaced by Preview Persistence (Off/1s/5s/10s/Until Closed) | 3 |
| `InterfacePM.md:75` | "**Hover Preview Linger** extends the stay." | Persistence replaces linger; Off disables entirely | 3 |
| `InterfacePM.md:75` | "MarkdownPM is its only host today" | Sidebar, tabs, nav views, cards, tables raise it | 8 |
| `InterfacePM.md:75` | "closes on hover-off, Escape, navigation, or the anchor leaving view" | A pinned pane persists nav + anchor-loss until closed | 10 |

**Dead Vocabulary**
- `hoverPreviewLinger` → expect 0 after Phase 1. Legitimate hits: none.
- `coerceHoverLinger`, `HOVER_LINGER_MAX` → expect 0 after Phase 1.
- Control: `previewPersistence` → expect ≥5 (type, coercer, codec, settings row, pane read). Zero here means the sweep never ran.

**Hazard Window:** Task 3 removes `hoverPreviewLinger` (type + coercer + codec + slider row + pane read) in one commit — a partial removal leaves a dangling `KeyOf<number>` or orphaned coercer that fails typecheck. Opens and closes within Task 3; no task between may reference the old symbol.

---

### Phase 1 — One setting owns persistence and on/off

#### Task 1: Preview Persistence type + resolver

**Requirement:** 10, 1

**Why:** One typed axis for the whole persistence story — enable/off and linger duration — so every reader (settings row, codec, pane) derives from a single source and the Off rung is the enable toggle. Unblocks Tasks 2–3.

**Now** — `Core/Settings/personalization.ts:100,146-151`, one linger number + its coercer:

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

// 'off' disables all arming (handled by the Off-gate, never reaches previewLingerMs) ·
// '1s'|'5s'|'10s' linger then dismiss · 'always' no dismiss timer (live pane stays until replaced/nav/Esc)
export type PreviewPersistence = 'off' | '1s' | '5s' | '10s' | 'always'
export const PREVIEW_PERSISTENCE_DEFAULT: PreviewPersistence = '1s'

// undefined or invalid → undefined (reader falls back to the default); a valid rung passes through
export function coercePreviewPersistence(v: unknown): PreviewPersistence | undefined

// the live pane's dismiss grace. Domain excludes 'off' — the Off-gate stops arming before any pane exists.
// undefined → default's ms (1000) · '1s'→1000 · '5s'→5000 · '10s'→10000 · 'always'→Number.POSITIVE_INFINITY
export function previewLingerMs(v: Exclude<PreviewPersistence, 'off'> | undefined): number
```

**Assumed by:** Task 2 (`armPreview` Off-gate + pane grace read the value), Task 3 (codec + settings row).

**Verify — automated**
- [ ] Red first: unit test on `coercePreviewPersistence('5s' | undefined | 'garbage' | 7)` and `previewLingerMs('1s'|'10s'|'always'|undefined)` — expect module-export failures, then green.
- [ ] Degenerate: `coercePreviewPersistence(undefined)` → `undefined`; `previewLingerMs(undefined)` → 1000.
- [ ] `npm run typecheck` green.

**Verify — user**
- [ ] *(none — no surface ships here.)*


#### Task 2: Widen `glanceLink.ts` into the app-side facade

**Requirement:** 1, 2, 5, 6

**Why:** One app-side owner of glance policy, grown from the file that already owns editor arming: a single Off-gated `armPreview(target, el, slot)` (the slot is already a typed param on `armGlance`), plus the ambient predicates surfaces branch on (`shiftDown`, `glanceShown`). `glanceLink` stays as the editor's bound-slot wrapper, so `editorHost` is untouched and no file is created or deleted. `glanceAction.ts` stays a pure leaf (no store import).

**Now** — `Core/Interface/Glance/glanceLink.ts` (whole file); `editorHost.tsx:93-94` binds it:

```ts
// glanceLink.ts
import type { GlanceTarget } from '../../MarkdownPM/api'
import { armGlance } from './glanceAction'
export const glanceLink = (target: GlanceTarget, el: Element): void => armGlance(target, el, 'link')
// editorHost.tsx:94 — unchanged by this task
glance: inert ? undefined : { arm: glanceLink, cancel: cancelGlance, close: closeGlance, contains: insideGlance },
```

**Becomes** — the same file, widened; `editorHost` unchanged:

```ts
// glanceLink.ts — now the app-side glance facade
// one arm entry; no-ops when persistence is 'off'; slot is the caller's dwell family
export function armPreview(target: GlanceTarget, el: Element, slot: GlanceDwell): void
//   if (useSession.getState().personalization.previewPersistence === 'off') return
//   armGlance(target, el, slot)
export const glanceLink = (t: GlanceTarget, el: Element): void => armPreview(t, el, 'link') // editor's bound slot

// ambient Shift tracker — one lazily-attached window keydown/keyup pair; reads current state
export function shiftDown(): boolean
// true while a LIVE (transient) glance is shown — read by ghost `suppressed()` at dwell-fire (no reactivity needed)
export function glanceShown(): boolean
export function setGlanceShown(v: boolean): void // called by GlancePane's shown effect (Task 8)
```

**Assumed by:** Tasks 5–7 (surfaces call `armPreview(t, el, 'detail'|'views')` + read `shiftDown`), Task 8 (`shiftDown`, `setGlanceShown`).

**Verify — automated**
- [ ] `rg -F 'armPreview' Core` → ≥2 (definition + ≥1 caller after Phase 3; here just the file). `rg -F 'glanceLink' Core` still resolves (kept). No new file created.
- [ ] Guard both halves: with persistence 'off', `armPreview(pageTarget, el, 'link')` presents nothing (spy the presenter); with '1s' it presents. Disabling the gate makes the 'off' case fail. Editor path proven via `glanceLink`.
- [ ] `shiftDown()` flips on synthetic `keydown`/`keyup` `{key:'Shift'}`; `glanceShown()` reflects `setGlanceShown`.
- [ ] `npm run typecheck` · `npm run test` green.

**Verify — user**
- [ ] With Hover Previews = Off, resting on an editor `[[connection]]` raises nothing. *(Carries to Completion Criteria.)*


#### Task 3: Swap the slider for the Preview Persistence picker

**Requirement:** 10, 1 · **Hazard Window: opens and closes here** — the old symbol's last readers all die in this one commit.

**Why:** The user-facing control. Replacing the slider row with a `picker` row and dropping every `hoverPreviewLinger` reader in the same commit keeps the type gate green and makes Off the enable switch.

**Now** — three surviving readers of the old key (the interface field + coercer were removed in Task 1's Becomes; deleted here):

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

**Becomes** — a picker row (its `{value,label}` pairs hardcoded — labels differ from values), a picker codec line, a persistence-derived grace:

```ts
// codec.ts — replaces the hoverPreviewLinger line
previewPersistence: coercePreviewPersistence(p.previewPersistence),
// SettingsWindow.tsx — replaces the slider row (Navigation section)
{ kind: 'picker', key: 'previewPersistence', label: 'Hover Previews',
  hint: 'Show a preview when resting on a page; how long it lingers after hovering off.',
  fallback: PREVIEW_PERSISTENCE_DEFAULT,
  options: [
    { value: 'off', label: 'Off' }, { value: '1s', label: '1 Second' },
    { value: '5s', label: '5 Seconds' }, { value: '10s', label: '10 Seconds' },
    { value: 'always', label: 'Until Closed' },
  ] },
// GlancePane.tsx:245-246 — persistence drives the live pane's leave grace
const persistence = useSession((s) => s.personalization.previewPersistence)
const graceMs = previewLingerMs(persistence) // 'always' → Infinity: schedule NO leave timer (guard the setTimeout)
```

**Ordered Steps** *(the order the hazard window demands)*
1. `SettingsWindow.tsx`: swap the row; drop the now-unused `HOVER_LINGER_MAX` import.
2. `codec.ts`: swap the line; fix imports.
3. `GlancePane.tsx`: swap the read; an Infinite `graceMs` must schedule no dismiss timer at GlancePane.tsx:295 (guard, don't pass Infinity to `setTimeout`).
4. `personalization.ts`: delete `coerceHoverLinger` + `HOVER_LINGER_MAX`.
5. Rewrite `ConfigurationPM.md:42` + `InterfacePM.md:75` (the linger sentences) in this commit.

**Assumed by:** Task 10 ('always'/Infinity semantics distinct from a pin).

**Verify — automated**
- [ ] `rg -F 'hoverPreviewLinger' .` → 0. `rg -F 'coerceHoverLinger' .` → 0. `rg -F 'HOVER_LINGER_MAX' .` → 0. Control: `rg -F 'previewPersistence' Core` → ≥5.
- [ ] Red-green: the existing GlancePane linger test inverted to persistence — '5s' → 5000ms grace, 'always' → no dismiss timer scheduled on leave. Expect the old assertion to fail first.
- [ ] Degenerate: `previewPersistence` absent → default '1s' behavior; a legacy `hoverPreviewLinger` on disk is silently ignored (codec builds a fresh object — no migration; note the dropped pref as a consequence).
- [ ] `npm run typecheck` · `npm run test` · `npm run lint` green.

**Verify — user**
- [ ] Settings → Navigation shows "Hover Previews" as a 5-way picker; the linger slider is gone. *(Carries.)*


#### Gate 1 — one setting, on/off proven, nothing dangling

- [ ] Gates green, exit codes read directly.
- [ ] Every Task 1–3 **Verify — automated** ticked against a watched result.
- [ ] Hazard window closed: no reference to `hoverPreviewLinger`/`coerceHoverLinger`/`HOVER_LINGER_MAX` survives.
- [ ] Dead Vocabulary sweep at 0 against its control.
- [ ] Simplification + review dispatched against `<base>..HEAD` (Glance + Settings paths); concerns fixed or ruled.
- [ ] `ConfigurationPM.md` + `InterfacePM.md` linger claims rewritten in Task 3's commit.
- [ ] Not a declared stop — Phase 2 opens automatically; the two **Verify — user** boxes carry to Completion Criteria.

---

### Phase 2 — The dwell slots

#### Task 4: Add the `detail` and `views` dwell rows

**Requirement:** 2, 4 · **Why:** The enumerated slot the scaffolding was built for — one dwell duration per surface family. `link` stays; `detail` (interface nav) and `views` (Views) join. Unblocks every surface arm.

**Now** — `Core/Interface/Glance/glanceAction.ts:9-11`:

```ts
/** KNOB — one dwell per glance surface; further surfaces add their own rows. */
export const GLANCE_DWELL = { link: 1000 } as const
type GlanceDwell = keyof typeof GLANCE_DWELL
```

**Becomes** — three rows; `detail`/`views` seeded and flagged for eyeball tuning:

```ts
// KNOB — one dwell per glance surface. link: editor. detail: sidebar/tabs/nav. views: cards/tables.
// detail/views seeded at 600 — tune on sight (shift-summon feels snappier than the 1s link rest).
export const GLANCE_DWELL = { link: 1000, detail: 600, views: 600 } as const
export type GlanceDwell = keyof typeof GLANCE_DWELL
```

**Assumed by:** Task 2's `armPreview` slot param, Tasks 5–7.

**Verify — automated**
- [ ] `npm run typecheck` green (`GlanceDwell` widens; exported for `armPreview`'s signature).
- [ ] `rg -F 'GLANCE_DWELL' Core` shows the three keys.

**Verify — user**
- [ ] *(none — no surface wired yet.)*


#### Gate 2 — infrastructure ready

- [ ] Gates green. Simplification/review folds into Phase 3's review if the diff is trivial (record that choice in the Log).
- [ ] Not a declared stop; Phase 3 opens.

---

### Phase 3 — Wire the surfaces  *(Declared Stop at the gate)*

*Each task builds `{ kind: 'page', id, path }` from the row in scope, calls `armPreview(target, el, 'detail'|'views')` on enter and `cancelGlance()` on leave, and — on ghostCreate surfaces — reads `shiftDown()` to arbitrate and adds `shiftDown() || glanceShown()` to the ghost's `suppressed`. The Off-gate lives in `armPreview`, so no surface repeats it.*

#### Task 5: Sidebar rows (Shift-gated, `detail`)

**Requirement:** 2, 4, 5 · **Why:** The sidebar hosts ghostCreate, so Shift arbitrates: plain hover keeps the create-ghost, Shift+hover previews. Its `suppressed` gains the Shift/open-glance guard so the ghost never fights the preview.

**Now** — re-derive line numbers. `Sidebar.tsx:435-451` (`PageRow`) + `:785-789` (ghost opts):

```tsx
onPointerEnter={api ? () => api.onHover(page.id, true) : undefined}
onPointerLeave={api ? () => api.onHover(page.id, false) : undefined}
// useGhostAnchor opts
suppressed: () => useSession.getState().renamingPath !== null,
```

**Becomes** — Shift arms a `detail` glance; ghost self-suppresses under Shift or an open glance:

```tsx
onPointerEnter={() => {
  api?.onHover(page.id, true)
  if (shiftDown()) armPreview({ kind: 'page', id: page.id, path: page.path }, rowRef.current!, 'detail')
}}
onPointerLeave={() => { api?.onHover(page.id, false); cancelGlance() }}
suppressed: () => useSession.getState().renamingPath !== null || shiftDown() || glanceShown(),
```

**Verify — automated**
- [ ] `npm run typecheck` · `npm run lint` green. `rg -F 'armPreview' Core/Interface/Sidebar` → ≥1.
- [ ] Crossing test (shift↔ghost): with Shift held, the ghost's `suppressed()` returns true (no bloom) and `armPreview` arms; without Shift, `suppressed()` is false and no glance arms.

**Verify — user**
- [ ] Shift+rest on a sidebar page → preview; plain rest → create-ghost, no preview. *(Carries to the Phase 3 stop.)*


#### Task 6: Tabs (plain hover, `detail`)

**Requirement:** 2 · **Why:** Tabs carry no ghostCreate, so plain hover previews — gated to page tabs, since a tab may target a context/space/collection with no path.

**Now** — re-derive. `TabBar.tsx` `PinnedTab`/`UnpinnedTab` `data-tab-id` divs (`:249-264`, `:310-332`) have no hover handler; `target.kind === 'page'` carries `{id,path}` (`navRef.ts:12`).

**Becomes** — both tab components' row div gains (a shared row helper if both can take one):

```tsx
onPointerEnter={(e) => {
  const t = entry.tab.target
  if (t.kind === 'page') armPreview({ kind: 'page', id: t.id, path: t.path }, e.currentTarget, 'detail')
}}
onPointerLeave={() => cancelGlance()}
```

**Verify — automated**
- [ ] `npm run typecheck` green. `rg -F 'armPreview' Core/Navigation/TabBar.tsx` → ≥1.
- [ ] Degenerate: a non-page tab target (`newtab`/context) arms nothing (type-narrow or unit assertion).

**Verify — user**
- [ ] Resting on a page tab → preview; on a non-page tab → nothing. *(Carries.)*


#### Task 7: Nav-view rows (plain hover, `detail`, id→path resolve)

**Requirement:** 2 · **Why:** Recents/pins complete "navigation surfaces." Nav rows carry only `target.id`, so the path is resolved from the tree index — the one seam that differs from the others.

**Now** — re-derive. `NavList.tsx:127-155` (`NavRow` → `MenuItem`, `onSelect(it.target)`, no hover) + `NavGallery.tsx` card; `ResolvedNav.target` is a `NavRef` with `id` only (`navResolve.ts:7-15`, `navRef.ts:16-18`); path resolves via the tree index (re-derive the exact resolver `navResolve.ts` already uses).

**Becomes** — a small local `pageTargetFromNav(it)` returning `{kind:'page',id,path} | null` (null for non-page or unresolved), wired on the row/card:

```tsx
onPointerEnter={(e) => { const t = pageTargetFromNav(it); if (t) armPreview(t, e.currentTarget, 'detail') }}
onPointerLeave={() => cancelGlance()}
// pageTargetFromNav: it.target.kind === 'page' ? resolve path from it.target.id via the tree index → target : null
```

**Verify — automated**
- [ ] `npm run typecheck` green. `rg -F 'armPreview' Core/Navigation/NavList.tsx Core/Navigation/NavGallery.tsx` → ≥1.
- [ ] Crossing test: `pageTargetFromNav` on a known page id returns the same path `navResolve`/`select` resolves — the resolver and the arm agree.
- [ ] Degenerate: an id absent from the index → null → no arm; a non-page nav ref → null.

**Verify — user**
- [ ] Resting on a recents/pins page row → preview. *(Carries.)*


#### Task 8: Cards + Tables (Shift-gated, `views`) and the over-pane guard

**Requirement:** 2, 4, 5, 6 · **Why:** The two Views surfaces host ghostCreate, so Shift arbitrates exactly as the sidebar. This task also closes R6: the `insideGlance` guard already refuses arming from inside the pane, and this wires `setGlanceShown` so `glanceShown()` is true only while a live pane shows — and flips back false on every hide path.

**Now** — re-derive. `TableView.tsx:1429-1439` (`onPointerEnter={() => api.hover(row, true)}`, `row` a `ViewRow` with `id`+`path`) + `:907-914` ghost opts; `CardsView.tsx:1115-1124` (`onHover(row.id, true)`, `row.path` in closure) + `:209-217` ghost opts. `GlancePane.tsx` shown effect doesn't yet call `setGlanceShown`.

**Becomes** — Views rows Shift-arm a `views` glance; ghost `suppressed` gains the guard; the pane publishes its shown state on every transition:

```tsx
// Table DataRow / Cards card row
onPointerEnter={() => { api.hover(row, true); if (shiftDown()) armPreview({ kind: 'page', id: row.id, path: row.path }, /* row el */, 'views') }}
onPointerLeave={() => { api.hover(row, false); cancelGlance() }}
// both ghost opts gain: || shiftDown() || glanceShown()
// GlancePane.tsx — publish shown state; `shown` is the single source, so retarget-through-null and dismiss both flow through it
useEffect(() => { setGlanceShown(shown !== null); return () => setGlanceShown(false) }, [shown])
```

**Verify — automated**
- [ ] `npm run typecheck` · `npm run lint` green. `rg -F 'armPreview' Core/Views` → ≥2.
- [ ] Guard both halves (R5): with a live glance shown, both Views ghosts' `suppressed()` → true; with none shown and no Shift, → false.
- [ ] `setGlanceShown` lifecycle: after a dismiss and after a retarget-through-null (GlancePane.tsx:171-194), `glanceShown()` is false — the ghost can't stay suppressed forever (assert the false transition).
- [ ] R6: `armPreview`/`armGlance` on an element inside the open pane no-ops (`insideGlance`), and the leave lifecycle clears its grace while the pointer is over the card (GlancePane.tsx:293-294 test still green).

**Verify — user**
- [ ] Shift+rest on a card/table row → preview; plain rest → create-ghost. Moving onto the pane keeps it open. *(Carries.)*


#### Gate 3 — cross-surface behavior  **[DECLARED STOP]**

- [ ] Gates green, exit codes direct. Every Phase 3 task's automated boxes ticked.
- [ ] `InterfacePM.md:75` "MarkdownPM is its only host" rewritten to name the new hosts (in-range commit).
- [ ] Simplification → review over `<base>..HEAD` (Sidebar, Navigation, Views, Glance); every concern fixed or ruled in the Log.
- [ ] Trash/history untouched: `rg -F 'armPreview' Core/Trash Core/Settings/TrashFrame.tsx` → 0; `rg -F 'glance' Core/Interface/Windows/PageHistoryWindow.tsx` → 0. Control: `rg -F 'armPreview' Core/Navigation` → ≥1.
- [ ] **Halt.** User eyeballs on real data: dwell feel per surface (the `detail`/`views` KNOBs), Shift arbitration on sidebar/cards/tables, plain hover on tabs/nav, Off kills all. Record any KNOB retune under Rulings. Phase 4 opens only on the user's go.

---

### Phase 4 — Lock and pinned multi-pane  *(all in the existing `GlancePane` + `glanceLink` files)*

#### Task 9: Pin state on the existing glance warm cache

**Requirement:** 8 · **Why:** Pins live where the user said — on `GlancePane`'s existing 10-slot `warm` map, sharing its budget and LRU, added as sibling module exports next to `glanceWarmSeam`/`glanceSize` (already exported from this file). No new file; `navigationSlice` imports `scrubPins` from `GlancePane`.

**Now** — `GlancePane.tsx:73-77`, the module cache:

```ts
const warm = new Map<string, { editorState: unknown; scrollTop: number }>()
export function glanceWarmSeam(id: string, path: string): WarmSeam {
  return mapWarmSeam(warm, id, () => readPageDetail(path)?.body, GLANCE_WARM_CAP)
}
```

**Becomes** — the same map with an optional `pin` field + sibling exports (still in `GlancePane.tsx`):

```ts
// GlancePane.tsx — pins ride the existing warm entry; they count toward GLANCE_WARM_CAP and can LRU-evict
type GlanceRect = { x: number; y: number; w: number; h: number }
type PinState = { target: { kind: 'page'; id: string; path: string }; rect: GlanceRect; tabId: string }
const warm = new Map<string, { editorState?: unknown; scrollTop?: number; pin?: PinState }>()
export function glanceWarmSeam(id: string, path: string): WarmSeam // unchanged behavior
export function setPin(key: string, pin: PinState): void  // capSet-writes the entry (→ newest); an 11th evicts the oldest, pinned or not
export function clearPin(key: string): void               // drops .pin, keeps warm state
export function pinsForTab(tabId: string): { key: string; pin: PinState }[] // reads a snapshot array, not the live map
export function scrubPins(tabId: string): void            // clears every pin tagged tabId (tab close)
```

**Assumed by:** Task 10 (render + lock + scrub).

**Verify — automated**
- [ ] `npm run typecheck` green.
- [ ] Refactor baseline: the existing glance warm-cache test (re-glance returns to scroll/state) passes unchanged.
- [ ] Unit: `setPin` then `pinsForTab` returns it; an 11th `setPin` evicts the oldest (cap 10 honored); `clearPin` keeps `editorState`; `scrubPins(tab)` drops only that tab's pins; the same page pinned under two `tabId`s is two distinct entries only if keyed per-tab — **decide the key** (page id vs id+tab) here and test it.
- [ ] Degenerate: `pinsForTab` on a tab with no pins → `[]`; `pinsForTab` returns a copy so a concurrent `capSet`/eviction during render can't mutate what's being mapped.

**Verify — user**
- [ ] *(none — no visible change yet.)*


#### Task 10: Lock button, pinned render, tab-scrub, Esc-closes-any

**Requirement:** 7, 8, 9 · **Why:** The behavior, rendered by the pane that already exists. `GlancePane` gains a top-right lock button on the live page card and a render loop for the active tab's pins — both reusing the file's own `.glance-body` page markup via a **local render helper inside the component** (not a new component). Locking pins the live page glance; a pinned pane survives nav/scroll/tab-switch because nothing dismisses it and it isn't evicted; tab close scrubs it; Esc closes whatever is open.

**Now** —
- `GlancePane.tsx:324-356` renders the page body (`.glance-body` + `PageTile` + fold-click + focus-handoff) inside the single live `PickerMenu`; no lock button exists; nothing renders pins.
- Live dismissal: `GlancePane.tsx:220` (`useEffect(dismiss, [selection, activeTabId, pageWindow])`) and `watchAnchor` onGone/onEscape (`glanceAction.ts:66-70`, hooked at `GlancePane.tsx:298`) close the live pane.
- Tab close: `navigationSlice.ts:311,413,448,685` each call `dropCacheTab(id)` (imported once at :53).

**Becomes** —
```tsx
// GlancePane.tsx — a local const renders the page body from a target+warmSeam; the live PickerMenu and each pin call it.
// Live page card: a top-right lock button (Icon name="locked"), page targets only (site cards show none).
//   onLock: read the live rect + shown page target + useSession activeTabId → setPin(key, {target, rect, tabId})
//     → dismiss the live pane → bump a local pinEpoch (useState) so the pin list re-renders.
// Pins: pinsForTab(activeTabId).map(p => a PickerMenu with anchorX=p.rect.x / anchorY=p.rect.y, no triggerRef,
//   modal={false}, rendering the same page body + an unlock/close button). These mount NO watchAnchor and are NOT
//   in the [selection, activeTabId, pageWindow] dismiss effect — so nav-off + anchor-loss leave them standing.
//   They render only while p.pin.tabId === activeTabId, so a tab switch hides and re-shows them with no restore code.
// Unlock / close button / Esc-over-a-pin: clearPin(key) + pinEpoch bump.
// Esc: one window keydown owner in GlancePane — live shown → dismiss; else newest active-tab pin → clearPin.
//   (watchAnchor's onEscape already covers the live pane; the new owner adds only the pin case — no double-close.)
```
```ts
// navigationSlice.ts — one wrapper; replace all four dropCacheTab(id) call sites with it
const dropTab = (id: string): void => { dropCacheTab(id); scrubPins(id) }
```

**Ordered Steps**
1. `GlancePane.tsx`: extract the page-body JSX into a local render const; the live pane uses it (behavior-preserving refactor within the file).
2. Add the lock button (page-only) + `onLock`; add the `pinEpoch` state and the `pinsForTab(activeTabId)` render loop with unlock/close.
3. Esc: extend/own the keydown so it closes the newest active-tab pin when no live pane is shown; confirm no double-handling with `watchAnchor` onEscape.
4. `navigationSlice.ts`: add `dropTab`; replace the four `dropCacheTab(id)` call sites.
5. Rewrite `InterfacePM.md:75` (the "closes on … navigation … anchor leaving view" sentence) to carve out pinned panes, in this commit.

**Verify — automated**
- [ ] `rg -F 'dropCacheTab(' Core/Session/navigationSlice.ts` → only inside `dropTab`'s definition (call sites now use `dropTab`). Control: `rg -F 'dropTab(' Core/Session/navigationSlice.ts` → ≥4 (re-derive; rewrite if the tree moved).
- [ ] Guard both halves (persist): a pinned entry survives a simulated nav (`selection`/`activeTabId` effect fires) and an anchor removal (`watchAnchor` onGone path) — assert the pin still renders; a **live** glance under the same events dismisses (control).
- [ ] Tab scrub: `dropTab(tabId)` on close removes that tab's pins; another tab's pins remain.
- [ ] Esc: with a live glance → it closes and no pin is touched; with only pins → the newest active-tab pin closes; neither path double-fires.
- [ ] Cap crossing (R8): opening 10 fresh glances after a pin evicts the pin (it counts toward the 10); the render loop drops it cleanly (no ghost pane, no read of an evicted entry).
- [ ] Site target: `onLock`/lock button is unreachable for a `kind:'site'` glance.
- [ ] `npm run typecheck` · `npm run test` · `npm run lint` green.

**Verify — user**
- [ ] Lock an editor page preview → it pins; navigate within the tab and scroll its anchor off → it stays; switch tabs and back → still there; close the tab → gone; Esc closes an open preview (locked or not); the lock icon never shows on a website preview. *(Carries to Completion Criteria.)*


#### Gate 4 — lock and persistence

- [ ] Gates green, exit codes direct. Every Phase 4 automated box ticked against watched results.
- [ ] `InterfacePM.md:75` navigation/anchor sentence rewritten for pinned panes.
- [ ] No new files or components created — confirm with `git status` (only existing files changed).
- [ ] Simplification → review over `<base>..HEAD` (Glance, Session/navigationSlice); concerns fixed or ruled.
- [ ] Refactor baseline (Task 10 step 1) held: no live-glance behavior moved.
- [ ] Not a declared stop; carries to Completion Criteria (Phase 3 was the stop).

---

## Implementation Log

### Progress

- [ ] **Phase 1** — One setting owns persistence · base `<commit>`
  - [ ] Task 1 — Persistence type + resolver · `<commit>`
  - [ ] Task 2 — Widen `glanceLink.ts` (armPreview + predicates) · `<commit>`
  - [ ] Task 3 — Picker replaces slider (hazard window) · `<commit>`
- [ ] **Phase 2** — Dwell slots
  - [ ] Task 4 — `detail`/`views` dwell rows · `<commit>`
- [ ] **Phase 3** — Wire surfaces **[STOP]**
  - [ ] Task 5 — Sidebar (Shift) · `<commit>`
  - [ ] Task 6 — Tabs · `<commit>`
  - [ ] Task 7 — Nav views (resolve) · `<commit>`
  - [ ] Task 8 — Cards + Tables (Shift) + over-pane · `<commit>`
- [ ] **Phase 4** — Lock + pinned multi-pane
  - [ ] Task 9 — Pin state on the existing warm cache · `<commit>`
  - [ ] Task 10 — Lock button, pinned render, scrub, Esc · `<commit>`

### Rulings
- Pinned panes are non-resizable and frozen at lock-time rect (v1 simplification) — surfaced for the Phase 3/final pass; revisit if the user wants resizable pins.
- Pin key (page id vs id+tab) is decided in Task 9 against the "same page pinned in two tabs" test; record the choice here at execution.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After
- Website-glance pinning (deferred by ratification — page-only pins ship here).
- Resizable pinned panes, if wanted after the eyeball.
- Per-surface dwell KNOBs promoted to settings if Nathan asks after the Phase 3 eyeball.

### Closeout

---

## Completion Criteria

*(Written at ratification, ticked at the end. Stands alone with the plan.)*

**The directive**

```
Execute the Hover Previews plan. <Unattended overnight | live>.
Live-verify: the six-surface hover walkthrough + the lock/nav/scroll/tab-switch/tab-close/Esc sequence on real data.
Screenshots: Phase 3 (each surface raising a preview; Shift vs plain) and Phase 4 (a pinned pane surviving a nav + a tab-switch).
Pings: at the Phase 3 stop, and at completion.
Record: History entry under the Glance arc.
Everything else is the standard below.
```

**The Standard**
- The bar: a future review of this arc finds nothing to correct — laundry done, folded, lint trap emptied.
- Only the live confirmation may be pending; no concerns carried, no deferrals when the fix is known.
- Reusability first — a second cache, resolver, pane, or component means the plan is wrong or you are; log it. **No new files.**
- Fix at the source; ambiguity takes the simplest reading, recorded under Rulings/Deviations.
- Per phase: implement → simplify → comment pass → gates (exit codes direct, never piped) → code review → attack review → every finding fixed or ruled → commit → ping. Simplification before review.
- Comments only where the why can't be inferred; docs rewritten (not amended) where falsified; unattributed doc/style edits mid-run fold into the commit at hand.

**Then tick these.**

**The deliverable**
- [ ] Every numbered requirement (1–10) traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause (six surfaces + trash/history excluded + over-pane + lock persistence + Esc + Off).
- [ ] Pins are page-only; no website preview can be pinned. No new files or components were created.

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
- [ ] Lock pins an editor page preview; it survives same-tab nav + anchor-scroll-off, hides/returns across tab-switch, dies on tab-close; Esc closes any preview (Task 10).
- [ ] Dwell timings per surface feel right (the `detail`/`views` KNOBs).

**The record**
- [ ] `ConfigurationPM.md` + `InterfacePM.md` rewritten in the commits that falsified them.
- [ ] Dead Vocabulary sweep at 0 against its control.
- [ ] Context and Handoff current; History entry to its format.
- [ ] Lessons routed to `.claude/Guidelines/`; successor work named in Sequenced After.

**The report**, plain English — what shipped and why it matters · what happened worth knowing · what each screenshot showed and what changed · every gate's real output · in-flight decisions a sentence each · what's left for the live pass · final +/- line count (comments + tests excluded). Honest about what didn't work.
