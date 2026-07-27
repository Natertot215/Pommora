## Interaction & Motion

The single home for the React build's animation system: the motion token vocabulary, the named animation aliases, the shell's one-progress driver, the expand/collapse primitive, and the per-surface motion catalog. Drag-specific motion (the reorder "feel", insertion line, auto-scroll) lives in [[PommoraDND]] and is only cross-referenced here. Code holds the exact values; this doc names the system and the canonical decisions. Motion is **Pommora-native, inspired by Apple** — adopted only when it deepens the minimalism, never when it clutters it.

### Motion Tokens — The Shared Vocabulary

The single source is `design-system/tokens/motion.ts`, surfaced as CSS vars through `tokens/theme-vars.css.ts`. Every permanent transition references these, not literals.

- **Durations:** `disclosure` (chevron + disclosure open/close, app-wide — the shared `twisty`, the `Reveal` primitive, the editor fold; `--disclosure`) · `fast` (quick hover / affordance feedback — grips, button hovers) · `dropdown` (the inline picker + autocomplete open/close — the Bloom keyframes at a snappier pace) · `base` (the shell slides — sidebar + inspector + the reflow that tracks them) · `slow` (the menu Bloom open/close). CSS: `--disclosure` / `--duration-fast` / `--duration-dropdown` / `--duration-base`.
- **Easings:** `standard` (everyday `ease`) · `out` (`cubic-bezier(0.22, 1, 0.36, 1)` — emphatic moves, also the drag "out" curve). CSS: `--ease-standard`.
- **Bloom curve** (Pommora-native, Apple-inspired) — `cubic-bezier(0.32, 0.72, 0, 1)` — is the open + close curve for both dropdown motions (the menu **Bloom** + the inline **Dropdown**, below), which share one set of keyframes; it's special-cased as the lone literal in `animations.css.ts` rather than living in the everyday token set.

Spacing / radius / shadow / z-index scales are still partly ad-hoc literals pending a Figma lift; the **shadow** standard is the exception — one `--shadow-standard` token (`tokens/color.css.ts`) feeds every frost surface (see [[Resources/II. Pommora/II. Features/Design]]).

### Named Animations

There are **two** dropdown motions, and they're the same animation at two speeds: both reuse the one `@keyframes dropdown-menu` (open) + `dropdown-menu-out` (close) pair and the one **Bloom curve** in `design-system/animations.css.ts` — they differ only in which duration token they run.

#### Bloom

Pommora's canonical pane/menu open — a zoom-from-the-trigger (`scale → 1` + fade on the Bloom curve, no blur), inspired by Apple's popover motion but Pommora-native. The `dropdownMenu` / `dropdownMenuClosing` classes run the shared keyframes on the **`slow`** token, **symmetric** (open + close match), so a click-off **retracts** the pane instead of cutting it; the parent keeps it mounted through the exit via the shared **`useExitPresence`** hook (`design-system/useExitPresence.ts`, whose default exit window covers this slowest close). The origin point is the consumer's: the class reads `--dropdown-origin` (defaults `top center`) so the pane blooms from its own trigger. This is the **menus'** motion; the inline picker + autocomplete take the snappier `dropdown`-token variant (below).

- **Consumers:** `MenuSurface` (the toolbar Navigation + Settings panels, `--dropdown-origin: top right`).

#### Dropdown

The same zoom — the same keyframes + Bloom curve — mounted on the **`dropdown`** token instead: snappier than the menu Bloom, also **symmetric**. The `dropdownOpen` / `dropdownClose` classes (`animations.css.ts`) read the same `--dropdown-origin` and retract through the shared `useExitPresence`. The split is deliberate: menus get the deliberate Bloom, inline surfaces the quicker Dropdown.

- **Placement + caps:** a `PickerMenu` declares which edge it PINS to (`origin`: right — the stable dropdown — center, or left), and therefore which way it grows when its content resizes; a left-anchored pane leaves every row where the cursor found it as a disclosure widens it. The collision flip is decided once per open, never per re-measure, so growing content can't teleport a pane above its trigger mid-gesture. A height cap routes through the shared scroll frame (one overflow region, edge-fade included), and a fixed width removes horizontal resize entirely for a tree picker. Selected rows may wear the shared ring, which merges vertically across an adjacent run so a block of selections reads as one region.
- **Consumers:** the inline-edit `PickerMenu` (frost `GlassPane` clipped to a notch beak; origin = the notch tip) — mounted by the table's cell value picker (`PropertyPicker`, the status/select/multi dropdown, anchored in the editing cell and retracting through the shared presence hook), the `AutocompletePanel` (wikilink autocomplete, `top left` — grows from the caret; retains its last position/rows so it can retract in place after the query clears), and the `IconPicker` (a searchable full-Lucide grid + right-click favorites; centered beak, opt-in horizontal beak for side triggers, auto-flipping to down when the requested side won't fit the viewport).

- **Note:** liquid `GlassControls` (the autocomplete) re-samples its refraction per frame, so the zoom reads slightly less crisp mid-flight than on the frost panes — timing/scale are identical.

#### Caret Blink

The drawn editor caret (and native-field overlay) fades on a symmetric on/off cycle via twin keyframes (`mdpm-blink` / `mdpm-blink2`) in `Carets.css`; `editor/caret.ts` swaps the keyframe name on selection change to restart the cycle without reflow. Tunable via `:root` knobs (`--caret-width` / `--caret-color` / `--caret-gap` cycle / `--caret-dim` dip — `dim:1` = solid, no blink). Extending the drawn caret to table cells + the inline-rename input is outstanding.

#### Header Scroll-Park

The page banner/title zone slides up under the toolbar as you scroll — a **scroll-timeline** animation (`mdpm-header-park`, `MarkdownPM/Styles.css`) bound to the `.cm-scroller` timeline, ranged over `--header-zone` (the live header height, set by a ResizeObserver in `MarkdownPM/index.tsx`). Compositor-driven, zero JS lag, no duration (scroll-linked).

### The `--io` Progress — The Shell's One Motion Driver

A single registered `@property --io` (`<number>`, 0 = closed → 1 = open, `styles.css`) transitions once on `--duration-base`/`--ease-standard` and drives the **entire** inspector open/close in lockstep: the inspector slide (`InspectorPanel` reads `--io`, carries no transition of its own), the content-inset reflow (Detail body / editor / subfield padding), the toolbar **trio "swallow"** (the pill rides the pane edge via a gated `max()` so it holds home until the inspector reaches it), and the trio's **glass void** (the pill's glass fades over the first fraction of the ramp while the bare icons stay solid). `.shell.is-resizing` sets `transition: none` for 1:1 cursor tracking during an edge-drag. The **sidebar collapse** is a sibling `transform` slide on the same base token.

**Why the glass voids as a two-layer pill, not a fade:** liquid glass can't be CSS-faded in place (its `backdrop-filter` displacement is a generated SVG-filter id CSS can't interpolate), so `Toolbar/ToolbarTrio` is a fading glass layer behind a solid bare-button layer. Full rationale → [[Resources/II. Pommora/II. Features/Design]] + History.

### Reveal — The Expand/Collapse Primitive

`design-system/components/Reveal.tsx` is the canonical body open/close: a `grid-template-rows: 0fr ↔ 1fr` transition on the `disclosure` token / `easing.standard`, mounting at 0fr then flipping on the next frame, and unmounting on `transitionend`. It (or the same `grid-template-rows` pattern) backs the sidebar nested trees and the heading-fold body (`.mdpm-fold-reveal`). Disclosure **chevrons** rotate 90° through the shared `twisty` (`menu.css.ts`) — one definition for the sidebar, the grouping/filter panes, the group bands and the properties pane. Its beat is a channel, `--twisty-beat`, defaulting to `--disclosure`: a surface whose body unfolds on a different beat pins the chevron to it so rotate and unfold land together. The editor fold rotates its own `::before`; the drag-engine's tree collapse + `.ix-caret` ride the drag feel (`--ix-dur`) instead, separate by design.

### Pane Slide + Resize

`Components/Detail/PaneSlider.tsx` is the View Settings detail-pane navigator: a two-slot horizontal track (root ↔ detail) where the **slide and the width+height resize run on the one shared `--duration-base`/`--ease-standard`**, so the horizontal move and the box reshape land on the same frame. Both slots stay mounted (each measured by a `ResizeObserver`) so the target size is known the instant the active slot flips; a `minHeight` floor keeps a sparse pane from collapsing, and footer actions pin to the bottom (`margin-top: auto`) so they hold their edge as the pane grows. Transitions arm only after first paint (so a pane snaps to size on open instead of growing from zero).

### Switch

`design-system/components/Switches/` — the knob slides between its on/off ticks and the ticks cross-fade, both on `--duration-fast`; the track tint also crossfades on the same beat. One `ease` const drives all three so the toggle reads as a single move.

### Drag Motion

Owned by the in-house engine — see [[PommoraDND]]. In brief: a live "feel" (duration + easing) shared across every surface via `--ix-dur`/`--ix-ease` (presets Glide / Smooth-default / Snappy, `interactions/feel.tsx`); **decide-then-animate** (the accept/reject is resolved first, then one transition settles the item, committing on `transitionend`); and the app-wide **auto-scroll** primitive — one token-driven, edge-proximity-ramped, dampened rAF loop that every drag feeds (see [[PommoraDND]] §II. Autoscroll). The **sidebar** uses a bespoke insertion-line treatment (muted row in place + a portal-rendered ghost), and the **editor block-drag** has its own chrome (in-place shade decoration + a `position:fixed` accent line/dot, `editor/blockDrag.ts` + `dragChrome.ts`) — all positioned 1:1 with the pointer, not timed.

### Per-Surface Catalog

- **Sidebar** (`Sidebar/Sidebar.css`): row hover + section "+" reveal + the collapse/expand button (fade + `translateX`); the twisty rotates on `--disclosure` like every other disclosure chevron. Row and section hovers run a step faster than the rest of the sidebar's chrome.
- **Editor** (`MarkdownPM/Styles.css`): fold chevron rotate + fade and the block/blockquote **grip reveal** (hover opacity) on `--duration-fast`; fold body via the Reveal pattern; banner/editor padding reflow on `--duration-base`.
- **Subfield** (`Detail/Subfield/subfield.css`): the footer bar height-reveal + its toggle chevron ride on `--duration-base`.
- **Banner** (`Detail/Banner/Banner.css`): title inset slide on `--duration-base`; "Add Banner" hover reveal.
- **Menus** (`menu.css.ts` / `menuSurface.css.ts`): row hover is an instant state swap (no transition); the surface **opens** with the Bloom (`dropdown-menu` keyframes on the `slow` token) and **retracts** with `dropdown-menu-out` on click-off.
- **Modals / pickers:** `PhotoCropModal` is imperative (pointer-tracked, no timed motion); the `IconPicker` rides the shared `PickerMenu` (the Dropdown motion) — a beaked, trigger-anchored pane, no bespoke chrome.
- **Floating windows** (the shared `PreviewPane` surface): both open/close on the **floating-window in/out** it owns — a scale-fade on `--disclosure`, exit held by `useExitPresence`. A window that wants its own exit suppresses that scale-out rather than layering a second motion on top. The Page Preview's promote does exactly this and plays the **engulf**: a WAAPI FLIP from the window's live rect onto the detail pane's (translate to center, scale to box, fade) on `base`/`easing.standard` — runtime rects, so no CSS keyframes. A FLIP measures the window from the surface's own root, never by walking up from an inner node. Tab switches slide content on the preview's own stamp (the DetailPane view-slide values), and an open side pane rides the same keyframes — one motion. The title↔tab morph rides the tab-open `@starting-style` growth (`tabStrip.css`) with the title fading/sliding on the base tokens.

### Timing Sources

Motion timing has one canonical home: the duration scale and easings in the motion tokens, which every CSS surface reads through its `--duration-*` / `--ease-*` vars. The shared dropdown keyframes and the Bloom curve live in the animations layer and take their durations from those same tokens.

Two kinds of timing deliberately stay in code rather than tokens, and neither is a DRY gap. The **drag feel presets** are numeric because the engine interpolates them, not CSS. The **engine's settle timing** is a fallback, not a duration: a drag commit fires on the overlay's `transitionend` and only falls back to a computed deadline if that event never arrives — decide-then-animate, never a blind timer. Auto-scroll's tunables are likewise motion *tuning* (edge band, speed ramp, acceleration bounds), read as root vars off the drag element.

A hardcoded duration in a permanent surface is a bug — it should read a token, or justify a new one. Debounces (autosave, live stats) and zero-delay event cleanups are not motion and never migrate.

### Principles

- **One progress variable** drives a coordinated multi-element move (the `--io` shell) rather than N independent transitions that can desync.
- **One primitive per pattern** — Reveal for expand/collapse, `dropdown-menu` for pane open, the drag engine for reorder — applied everywhere, not re-derived per surface.
- **Tokens over literals** — duration/easing come from `motion.ts`; the named curves (Bloom, drag "out") are the only special-cased ones.
- **Compositor / pointer-driven where it counts** — scroll-park (scroll-timeline), drag chrome + resize (1:1, no timed transition) — so motion never lags the input.
