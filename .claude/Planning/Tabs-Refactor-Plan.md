## Tabs Refactor — Scope

A full consolidation of tab CSS into one source of truth, a unified mechanism with **Standard** (detail/content) and **Compact** (preview) density variants, and every consumer refactored down to "pick a variant + mount." Then a follow-on Settings panel. Phase 1 is the refactor; Phase 2 is the settings.

### End State

- **One tab CSS file:** `Tabs/tab-base.css` — the unified `.tab` mechanism, both variant knob blocks, the toolbar-only chrome (`+`, pinned zone, divider), the shared scroller/strip, the trailing-grow rule, and the map-tab geometry. Every `--tab-*` knob and every `.tab*` rule lives here and nowhere else.
- **`Windows/window-base.css` grows:** receives the breadcrumb→strip **morph** (`.page-window-title`, `--page-window-morph-slide`, its `@starting-style` + `.is-collapsing`), plus `.page-window-tabwrap` (the squeeze container) and `.page-window-crumbs` (used by `PageWindow.tsx:177` + `PageHistoryWindow.tsx:139` via NavTrail). These go to `window-base.css` specifically — **not** `page-window.css` — because `WindowTabStrip` renders inside **both** PageWindow and NavWindow, and only `window-base.css` is loaded by both. It already owns `--window-title-squeeze`.
- **Deleted:** `Tabs/tab-strip.css`, `Tabs/tab-bar.css`, `Windows/window-tab-strip.css`.

---

## Phase 1 — The CSS + Consumer Refactor

### 1. The unified mechanism (`tab-base.css`)

One `.tab` rule set (geometry, width-motion transition, `@starting-style`, `is-closing`, hover/active/dragging, `.tab-seg`, `.tab-icon`, `.tab-label`, `.tab-x`, the nav-slide keyframes). Every dimension reads a `--tab-*` knob; the variant classes set the knobs.

**Knobs authored as indirection** so Phase 2 can override them from `:root` without the variant's own declaration shadowing the inherited value:

```
--tab-min:  var(--tab-min-user, 70px);
--tab-max:  var(--tab-max-user, 200px);
```

A variant that declares `--tab-max` directly would win over a `:root`-inherited `--tab-max` and make Phase 2 silently inert. Routing through `--tab-*-user` means Phase 2 is a one-line runtime writer, and clearing the setting (`removeProperty` → the fallback) restores the default. **This must be verified live before Phase 1 closes.**

### 2. The two variants

| Knob | `.tabs-standard` (detail) | `.tabs-compact` (preview) |
|---|---|---|
| `--tab-min` | `var(--tab-min-user, 70px)` | `70px` |
| `--tab-max` | `var(--tab-max-user, 250px)` | `200px` |
| `--tab-pref` | `180px` | `150px` |
| `--tab-pad-x` | `12px` | `10px` |
| `--tab-gap` | `6px` | `6px` |
| `--tab-height` | `--button-large-height` (32px) | inherited from host — **verify 36 (PageWindow toolbar) / 28 (NavWindow row)**; compact sets no `--tab-height` today |
| `border-radius` | `12px` (on `.tab`, both variants) | `12px` |
| `--tab-trail-reserve` | `28px` (the `+` gutter) | mechanism only (strip `padding-right`); **each host sets the value** — see §4 |
| pinned / divider / nav-slide | present | absent |

Standard/Compact are **tab-local** (there is no app-wide density system to hook — Standard/Compact is a per-component convention here: menus, checkboxes, labels each redefine it locally). Compact keeps fixed values; only Standard routes through the `-user` indirection. `.tabs-compact` attaches to `.page-window-tabwrap` (the shared ancestor in both preview hosts).

### 3. Recommendations needing your nod

- **Standard `--tab-max` default → 250** (currently 240; Nathan's call). CSS fallback = Phase 2 default = 250. **Visible effect:** main toolbar tabs cap 10px wider.
- **The Phase-2 min/max settings drive Standard only.** Compact (preview) stays fixed. Confirmed.
- **`--tab-radius` — 12px on BOTH variants** (Nathan's call). The button-large hover pill applies to compact too; no per-variant radius knob — plain `border-radius: 12px` on `.tab`.
- **Type scale into the variant — only if it doesn't create a second definition.** Consumers apply `text.control.standard` (toolbar) vs `text.caption.standard` (preview) in TSX. Move it to the variant **only if a token var exists for every property that class sets** (weight, size, line-height, letter-spacing); otherwise type stays a one-line `cx()` in TSX. Consumer simplicity isn't worth a DRY break in typography.

### 4. The trailing tab + the explicit cluster stop

- Trailing rule unified: `.tab:last-child:not(.tab-map) { flex: 0 1 auto; max-width: var(--tab-max-absolute); }` plus the 16px label reserve. `--tab-max-absolute: 450px` is a **named knob in the base** (Nathan-tunable), the **trailing-grow ceiling only** — normal tabs still cap at their variant `--tab-max`.
- The `:not(.tab-map)` guard is **defensive, not load-bearing** (the map tab is always slot 1; reorder/close refuse to move it). Kept for explicitness.
- **Explicit cluster stop — two Compact hosts, two reserves.** Today the preview trailing tab stops via `--window-title-squeeze` (`window-base.css:34`), whose `- 62px` term is PageWindow's toolbar cluster reserve baked into the pane-squeeze and only applied when the pane opens. **NavWindow has its own reserve** — `nav-window.css:31`: `.navwindow-tabs { padding-right: 56px + var(--window-title-squeeze) }` — so it stacks 56px on a squeeze that *also* subtracts 62px (a likely double-count today). The fix: the variant supplies the **mechanism** (`.tab-strip { padding-right: var(--tab-trail-reserve) }`), and **each host sets the value** — PageWindow's cluster width vs NavWindow's 56px. Then rework `--window-title-squeeze` to **pane-clearance only** (drop `-62px`) and **reconcile `nav-window.css:31` in the same change** so NavWindow's clearance doesn't shift. **The most delicate change — a live geometry check with equal weight on PageWindow and NavWindow, pane open + closed, trailing tab long + short**, before Phase 1 closes.

### 5. The map-tab geometry moves in

`nav-window.css:42` (`.navwindow-tabs .tab-map { flex:0 0 auto; min/max-width:34px; … }`) is tab CSS → moves into `tab-base.css`. That's part of "all tab CSS in one file."

### 6. Consumer refactor

- **`TabBar.tsx`** — apply `.tabs-standard` on `.tab-bar`; single import `./tab-base.css` (was two).
- **`WindowTabStrip.tsx`** — apply `.tabs-compact`; import `../Tabs/tab-base.css`; drop the TSX `text.caption.standard` if the variant owns type.
- **Scroller/strip class unification:** the preview's `.page-window-tabscroll` / `.page-window-tabstrip` mirror the toolbar's `.tab-scroll` / `.tab-strip` — fold to the shared classes so one rule serves both (the plus-gutter vs cluster-reserve difference is already the `--tab-trail-reserve` knob).
- **`DRAG_SURFACES` strings** (`NavWindow.tsx:32`, `PageWindow.tsx:25`) list `.page-window-tabwrap/-tabscroll/-tabstrip` — these arm window-move and are load-bearing. Update them in lockstep with the class unification.
- The breadcrumb-morph JSX (`.page-window-title` in `WindowTabStrip.tsx`) keeps its class; only its CSS relocates to `window-base.css`. The morph-owner logic (`useExitPresence`, `heldTitle`) is untouched.

### 7. Verification (Phase 1 close)

- Gates: `npm run typecheck`, `npm run lint`, `npm run test`.
- **Grep-to-zero:** old filenames, `.tab-bar`/`.tab-strip`/`.page-window-tab*` (except names deliberately kept for DRAG_SURFACES/morph), `--tab-max-last`, `--tab-plus-gutter` (renamed → trail-reserve), `--page-window-morph-slide` (moved), the three old import paths → no stranded hits. Count the +/- CSS delta (excl. comments). String literals in TSX (DRAG_SURFACES) are the blind spot.
- **The `-user` indirection check is concrete:** set `--tab-max-user` on `documentElement` over CDP, confirm a standard tab's computed `max-width` moves; `removeProperty` and confirm it falls back to 200.
- **One batched live walkthrough:** both strips — few tabs, overflow, trailing hug + 450 cap; preview with the side pane open and closed (the squeeze/reserve interplay); NavWindow with the map tab present.
- **Standing-go:** the per-phase simplify + build-break passes are pre-authorized once the scope is signed.

### 8. Process guardrails

- A **parallel session is dirty** in `Settings/` and `PickerControl/`. Phase 1 touches neither. Before every commit: `git status`, confirm nothing of the peer's is staged, `git add` explicit paths only (never `-A`).
- Phase 2 touches `SettingsWindow.tsx` — **serialize** with that session when it comes.

---

## Phase 2 — Settings › Navigation › Tabs (outline; separate execution)

Slots into the existing `navigation` frame in `SettingsWindow.tsx` (data-driven `FRAMES` roster) as a new `Tabs` section. Store: **`personalization`** (nexus-wide) for all four — width and behavior are preferences, not machine-specific.

- **Default Opening Behavior** — New Tab / Overtake. A `picker` row; feeds `openTab`'s `opts.newTab` seam (`tabsModel.ts:154`).
- **Take Focus** — toggle, **disclosed only when "New Tab" is selected.** Reuse the existing conditional/disclosed-row mechanism from `Frames/` (Nathan: it already exists there — a reuse opportunity, NOT net-new machinery; Scout B missed it by looking only in `Settings/`). Phase 2's scout confirms the Frames pattern and traces whether `openTab` sets `activeTabId` on append.
- **Minimum Tab Width** — 50–100, default 70, step 10 → writes `--tab-min-user`.
- **Maximum Tab Width** — 150–350, default 250, step 25 → writes `--tab-max-user`.
- Runtime writer: one `ROOT_VARS` entry each in `personalization.ts` (the established `--var`-write-with-null-fallback pattern).

Open question for Phase 2: `Slider` (continuous) vs `ZoomRow`-style stepper (discrete steps + typeable). The step values (10 / 25) suggest the stepper.

## Post-Work Review

Six-lens review over the folded arc (Simplicity · Duplication · Cohesion · Correctness · Stability · Debt), two agents at a time, report-only, folded by hand.

### Folds

- **The variants are the sole width writers.** The `.tab` fallback literals disagreed with the live variant values (min 90≠70, max 240 vs 250/200, pref 180 vs 150, pad 12 vs 10); stripped so `.tabs-standard`/`.tabs-compact` alone write `--tab-min/max/pref/pad-x`. `--tab-gap` never varied, so its value is a plain `6px` on `.tab` — the `--tab-gap` var is gone rather than left as a phantom knob nothing writes.
- **Two redundant fades dropped.** `.tab-scroll` and `.page-window-crumbs` each restated the 16px their own `over-scroll-x` default already supplies.
- **The four tab settings read back.** `readPersonalization` never projected `tabOpenBehavior`/`tabTakeFocus`/`tabMinWidth`/`tabMaxWidth`, so every read dropped them and the settings reverted a macrotask after being set — the feature was non-functional. Added the four rows, widths clamped like `historyDays`; `clampInt` also bars a hand-edited min>max inversion.

### Rulings

- The `.tabs-standard`/`.tabs-compact` density naming is the deliberate two-tier spec, kept though neither class is toggled on one element (unlike `menuCompact`).
- `--window-flow-inset: calc(var(--surface-inset) * 2)`, `--tab-max-absolute: 450px`, `border-radius: 12px`, the trailing `padding-right: 16px`, and the four caption-less Tabs rows are all deliberate.
- `MenuRow.reveal` stays at zero consumers as the DRY disclosure primitive.

### Named decisions (fixes are additive — out of a no-net-lines pass)

- Tab-width bounds live in two places (SettingsWindow steps + readNexus clamp) that can drift; the neighbors share a `types.ts` constant, so hoisting `TAB_MIN`/`TAB_MAX` would align them.
- The `tabTakeFocus === false` background-open guard is written in both `openNewTab` and `select`; a third open-gesture triples it.
- A future third `TabOpenBehavior` value degrades silently to overtake at both read sites with no signal.
- The `EXIT_MS`/`requestClose`/`renderEntries` ghost-close machinery is duplicated verbatim across `TabBar` and `WindowTabStrip` — inherited (pre-arc), owned by the two strip components.
