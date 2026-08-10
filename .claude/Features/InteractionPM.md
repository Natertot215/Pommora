## Interaction & Motion

The single home for the React build's animation system: the motion token vocabulary, the named animation aliases, the shell's one-progress driver, and the expand/collapse primitive. Drag-specific motion (the reorder "feel", insertion line, auto-scroll) lives in [[PommoraDND]] and is only cross-referenced here. Code holds the exact values; this doc names the system and the canonical decisions. Motion is **Pommora-native, inspired by Apple** — adopted only when it deepens the minimalism, never when it clutters it.

### Motion Tokens — The Shared Vocabulary

The single source is `design-system/tokens/motion.ts`, surfaced as CSS vars through `tokens/theme-vars.css.ts`. Every permanent transition references these, not literals.

- **Durations:** `fast` (hover feedback and affordance reveal) · `disclosure` (chevron and disclosure open/close, app-wide) · `dropdown` (the inline picker and autocomplete, Bloom at a snappier pace) · `base` (the shell slides and the reflow tracking them) · `slow` (the menu Bloom and the hover-pop swell). Every step publishes as a `--duration-*` var, with `disclosure` on its own `--disclosure` so it stays tunable apart from `fast`.

- **Easings:** `standard` (the everyday ease) · `inOut` (a symmetric fade — in as fast as out) · `out` (emphatic moves, also the drag "out" curve). All three publish as `--ease-*` vars.

- **Bloom curve** (Pommora-native, Apple-inspired) is the open + close curve for both dropdown motions, which share one set of keyframes. It's the one special-cased named curve, living in `animations.css.ts` rather than the everyday token set.

**z-index** is formalized as three separate ladders in `tokens/stack.ts` — the shell frame, in-context lifts, and the top layer of fixed and portalled surfaces — published as named `--z-*` steps; a step ranks only within its own ladder, never against another's. **Shadow** is one `--shadow-standard` token feeding every frost surface. **Spacing and radius** stay partly ad-hoc pending a Figma lift (see [[DesignSystemPM]]).

### Named Animations

There are **two** dropdown motions, and they're the same animation at two speeds: both reuse the one `dropdown-menu` (open) + `dropdown-menu-out` (close) keyframe pair and the one **Bloom curve** in `design-system/animations.css.ts` — they differ only in which duration token they run.

#### Bloom

Pommora's canonical pane/menu open — a zoom-from-the-trigger (`scale → 1` + fade on the Bloom curve, no blur), inspired by Apple's popover motion but Pommora-native. The `dropdownMenu` / `dropdownMenuClosing` classes run the shared keyframes on the **`slow`** token, **symmetric** (open + close match), so a click-off **retracts** the pane instead of cutting it; the parent keeps it mounted through the exit via the shared **`useExitPresence`** hook. The origin point is the consumer's: the class reads `--dropdown-origin` so the pane blooms from its own trigger, and the shared beaked shell (`NotchedPane`) computes that origin as its own beak tip and writes it on the pane — so a beaked surface always blooms from the beak, whatever keyword an outer anchor declares. This is the **menus'** motion, carried by `MenuSurface`, the shell every large toolbar dropdown mounts; inline surfaces take the snappier `dropdown`-token variant.

A menu row's hover is an instant state swap with no transition: the pane animates, its contents don't.

#### Dropdown

The same zoom — the same keyframes + Bloom curve — mounted on the **`dropdown`** token instead: snappier than the menu Bloom, also **symmetric**. The `dropdownOpen` / `dropdownClose` classes read the same `--dropdown-origin` and retract through the shared `useExitPresence`. The split is deliberate: menus get the deliberate Bloom, inline surfaces the quicker Dropdown.

- **Placement + caps:** a `PickerMenu` anchors either to an element or to a bare point — a right-click's cursor, which every placement branch reads as a zero-size rect — and declares which edge it PINS to (`origin`: right — the stable dropdown — center, or left), and therefore which way it grows when its content resizes; a left-anchored pane leaves every row where the cursor found it as a disclosure widens it. The collision flip is decided once per open, never per re-measure, so growing content can't teleport a pane above its trigger mid-gesture. A height cap routes through the shared scroll frame (one overflow region, edge-fade included), and a fixed width removes horizontal resize entirely for a tree picker. Selected rows may wear the shared ring, which merges vertically across an adjacent run so a block of selections reads as one region.

- **The one non-`PickerMenu` consumer** is the wikilink autocomplete, a liquid `GlassControls` panel carrying the same classes. Liquid re-samples its refraction per frame, so the zoom reads slightly less crisp mid-flight than on the frost panes; timing and scale are identical.

#### Caret Blink

The drawn editor caret (and the native-field overlay) fades on a symmetric on/off cycle via twin keyframes in `Carets.css`; `editor/caret.ts` swaps the keyframe name on selection change to restart the cycle without reflow. `:root` knobs tune it — `--caret-width`, `--caret-color`, the `--caret-gap` cycle, and the `--caret-dim` dip, whose ceiling is a solid, non-blinking bar. On a fresh focus the overlay **settles by convergence** — re-measuring each frame until the bar holds still, deadline-capped — because a pane may still be animating open (the Bloom scale, a placement correction) with moves no resize or input event ever reports; timing guesses strand the bar, convergence can't. The caret is drawn wherever text is edited: every CodeMirror surface mounts the caret layer — the page editor and the table cell editors alike — while the overlay covers the native text fields, the inline-rename inputs among them. The overlay stands down only once the caret has genuinely scrolled out of its field, which is an intersection test rather than a containment one — a line-height tighter than the font's own content area gives the line box negative half-leading, so a resting bar can overhang the field's box without having gone anywhere.

#### Header Scroll-Park

The page banner/title zone slides up under the toolbar as you scroll — a **scroll-timeline** animation (`MarkdownPM/Styles.css`) bound to the `.cm-scroller` timeline and ranged over `--header-zone`, the live header height set by a ResizeObserver. Compositor-driven, zero JS lag, no duration (scroll-linked).

### The `--io` Progress — The Shell's One Motion Driver

A single registered `@property --io` (`<number>`, 0 = closed → 1 = open, `styles.css`) transitions once on `--duration-base`/`--ease-standard` and drives the inspector's moving parts in lockstep: the inspector slide (`InspectorPanel` reads `--io` and carries no transition of its own), the toolbar **trio "swallow"** (the pill rides the pane edge via a gated `max()` so it holds home until the inspector reaches it — the tab bar's right-edge condense shares that one swallow magnitude), and the trio's **glass void** (the pill's glass fades over the first fraction of the ramp while the bare icons stay solid). `.shell.is-resizing` sets `transition: none` for 1:1 cursor tracking during an edge-drag. The **sidebar collapse** is a sibling `transform` slide on the same base token, and a floating window parks a leading pane on the mirrored `--io-l`.

The **content-inset reflow does not ride the progress.** `--content-inset-right` is a plain, unregistered custom property that flips between two values, and each surface reading it — the detail body, the editor, the subfield, the banner — runs its own padding transition and re-declares its own resize suppression. They land together because they share the base token, not because one variable carries them. Whether the insets should be derived from `--io` or stay independent is open.

**Why the glass voids as a two-layer pill, not a fade:** liquid glass can't be CSS-faded in place (its `backdrop-filter` displacement is a generated SVG-filter id CSS can't interpolate), so `Toolbar/ToolbarTrio` is a fading glass layer behind a solid bare-button layer. Full rationale → [[DesignSystemPM]].

### Reveal — The Expand/Collapse Primitive

`design-system/components/Reveal.tsx` is the canonical body open/close: a `grid-template-rows: 0fr ↔ 1fr` transition on the `disclosure` token / `easing.standard`, mounting at 0fr then flipping on the next frame, and unmounting on `transitionend`. It stops clipping once open and idle, so affordances that overhang a row aren't cut off. It (or the same `grid-template-rows` pattern) backs the sidebar nested trees, the settings panes, and the heading-fold body.

Disclosure **chevrons** rotate 90° through the shared `twisty` (`menu.css.ts`) — one definition for the sidebar, the grouping/filter panes, the group bands and the properties pane. Its beat is a channel, `--twisty-beat`, defaulting to `--disclosure`, and `Reveal` takes a matching duration override: a surface whose body unfolds on a different beat pins both to it so rotate and unfold land together. The editor fold rotates its own `::before` on the same disclosure beat; the drag-engine's tree collapse + `.ix-caret` ride the drag feel (`--ix-dur`) instead, separate by design.

### Pane Slide + Resize

`Components/Detail/PaneSlider.tsx` is the one two-slot drill-down primitive every pane rides — root ↔ detail on the shared `--duration-base`/`--ease-standard` — and it nests, since a detail may itself be a slider. The horizontal slide runs on that beat and **width** eases with it; **height** joins the ease only across a navigation flip. Between flips the height tracks its content untransitioned, because a child animating in place feeds the `ResizeObserver` every frame and a lagging viewport transition chases it into a bounce — the child owns that beat.

Both slots stay mounted (each measured by a `ResizeObserver`) so the target size is known the instant the active slot flips, and the outgoing detail is held through the slide-out so its box doesn't collapse mid-move. Optional width and height floors keep a sparse pane from shrink-wrapping, and transitions arm only after first paint, so a pane snaps to its measured size on open instead of growing from zero.

The slider only slides and resizes — it never caps, scrolls, or pins. A slot needing a ceiling, a scroll region, or a bottom-pinned footer wraps its content in the shared menu scroll frame, and the slider animates to the already-capped height. Keeping the two mechanisms apart is what stops a scrolling slot and a scrolling frame body from fighting.

### Switch

`design-system/components/Switches/` — the knob slides between its on/off ticks, the ticks cross-fade, and the track tint crossfades, all on the `fast` beat. One easing const drives the three so the toggle reads as a single move.

### Drag Motion

Owned by the in-house engine — see [[PommoraDND]]. In brief: a live "feel" (duration + easing) shared across every surface via `--ix-dur`/`--ix-ease` (presets Glide / Smooth-default / Snappy, `interactions/feel.tsx`); **decide-then-animate** (the accept/reject is resolved first, then one transition settles the item, committing on `transitionend`); and the app-wide **auto-scroll** primitive — one token-driven, edge-proximity-ramped, dampened rAF loop that every drag feeds (see [[PommoraDND]] §II. Autoscroll). Every insertion-line surface, the sidebar included, draws its chrome from the shared owners in `design-system/interactions` — the `DragGhost` component (its glass a materials recipe, `GHOST_FROST`) and the `drop-line`/`drop-dot`/`drop-line-host` classes on the drag-line tokens; the **editor block-drag** keeps its own lifecycle but its overlay wears the same classes (`editor/dragChrome.ts`) — all positioned 1:1 with the pointer, not timed.

### Scroll Glide

Travel to a known destination, for a surface sending the reader somewhere in a document they're already in — the page Outline's jump is its first caller (→ [[PagesPM]]). It shares its module with the drag auto-scroll and reuses that primitive's scroller resolution and one-owner-at-a-time rule, but not its motion: the drag loop is open-ended and takes its speed from the pointer's distance to a container edge, which is a different animation rather than a parameter of this one. A drag beginning mid-travel claims the scroller and the glide stands down.

The destination is **re-read every frame, never resolved once**. A host that renders lazily only estimates the height of what it hasn't drawn, so the true position sharpens as the travel reveals it; easing toward a live measurement absorbs that drift into the motion, while landing on the first estimate and reconciling afterwards puts a visible jump at the end of an otherwise smooth move. The beat is fixed from the opening distance, so a destination that shifts underfoot changes where the travel lands but never how long it takes.

The beat is **proportional to the distance and clamped at both ends**, so near and far jumps move the document at one apparent speed while a short hop still reads as movement and crossing a long page never becomes a wait. The curve is the `out` easing token, mirrored as a function because a CSS cubic-bezier cannot drive a `scrollTop` — the two are stated separately and change together. Any real scroll input cancels it: a travel that keeps pulling while the reader scrolls away fights them, which the drag loop never has to consider because the pointer is held. Reduced-motion arrives immediately.

### Floating Windows

Every in-app window mounts the shared `PreviewPane` surface and opens/closes on the **floating-window in/out** it owns — a scale-fade on `--disclosure`, exit held by `useExitPresence`. A window that wants its own exit suppresses that scale-out rather than layering a second motion on top. The Page Preview's promote does exactly this and plays the **engulf**: a WAAPI FLIP from the window's live rect onto the detail pane's (translate to center, scale to box, fade) on `base`/`easing.standard` — runtime rects, so no CSS keyframes. A FLIP measures the window from the surface's own root, never by walking up from an inner node. Tab switches slide content on the preview's own stamp, and an open side pane rides the same keyframes — one motion. The title ↔ tab morph rides the tab-open `@starting-style` growth (`tabStrip.css`) with the title fading and sliding on the base tokens.

### Timing Sources

Motion timing has one canonical home: the duration scale and easings in the motion tokens, which every CSS surface reads through its `--duration-*` / `--ease-*` vars. The shared dropdown keyframes and the Bloom curve live in the animations layer and take their durations from those same tokens. The tables state the literal values under the atlas convention (`DesignSystemPM.md` §charter).

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/motion.ts` · `Pommora/src/renderer/src/design-system/animations.css.ts`

| Title | token | value |
| --- | --- | --- |
| Fast | `duration.fast` · `--duration-fast` | `180ms` |
| Disclosure | `duration.disclosure` · `--disclosure` | `180ms` |
| Dropdown | `duration.dropdown` · `--duration-dropdown` | `225ms` |
| Base | `duration.base` · `--duration-base` | `280ms` |
| Slow | `duration.slow` · `--duration-slow` | `350ms` |
| Standard Ease | `easing.standard` · `--ease-standard` | `ease` |
| In-Out Ease | `easing.inOut` · `--ease-in-out` | `ease-in-out` |
| Out Ease | `easing.out` · `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` — defined, no consumer |
| Bloom | `BLOOM` (`animations.css.ts`) | `cubic-bezier(0.32, 0.72, 0, 1)` — the one special-cased named curve |

#### II. The Caret

One text-insertion identity for the whole app — the CodeMirror layer bar and the native-field overlay both read the same family. Globally scoped; a caret that doesn't appear belongs to `nativeCaret.ts`, never to the field.

**SOURCE:** `Pommora/src/renderer/src/Carets.css`

| Title | token | value |
| --- | --- | --- |
| Bar Thickness | `--caret-width` | `2px` |
| Fill | `--caret-color` | → `var(--label-primary)` |
| Blink Cycle | `--caret-gap` | `1.3s` (a blink cycle, deliberately outside the duration scale) |
| Dip Opacity | `--caret-dim` | `0` |
| I-Beam Cursor | `--caret-cursor` | inline SVG data-URI, hotspot `7 12` |

#### II. Edge Fade

The overflow-fade mechanism: three registered properties plus the four fade classes. `--edge-fade` is deliberately **non-inheriting** — the knob must sit on the element carrying the fade class, or it silently does nothing (the same silent-initial failure class as any scoped var consumed out of scope).

**SOURCE:** `Pommora/src/renderer/src/design-system/edge-fade.css`

| Title | token | value |
| --- | --- | --- |
| Lead / Trail Progress | `@property --edge-a` / `--edge-b` | `<number>`, non-inheriting, initial `0` |
| Width Knob | `@property --edge-fade` | `syntax "*"`, non-inheriting |
| House Default | `--edge-fade-default` | `22px` on the fade classes; `16px` on both eclipses |
| Axis | `--edge-dir` | `to bottom` fallback; `to right` on the x variants |

#### II. Autoscroll Tuning

The edge-proximity loop's knobs — declared at `:root`, overridable on any ancestor, read once at drag start via `getComputedStyle` (never through `var()`, so a naive dead-token grep scores them zero while all six are live).

**SOURCE:** `Pommora/src/renderer/src/design-system/interactions/autoscroll.css`

| Title | token | value |
| --- | --- | --- |
| Edge Band | `--autoscroll-edge` | `48px` |
| Speed | `--autoscroll-speed` | `840px` per second |
| Proximity Ramp | `--autoscroll-ramp` | `2` |
| Accel Start / Max / Distance | `--autoscroll-accel-start` / `-max` / `-distance` | `0.5` / `1.5` / `600px` |

Two kinds of timing deliberately stay in code rather than tokens, and neither is a DRY gap. The **drag feel presets** are numeric because the engine interpolates them, not CSS. The **engine's settle timing** is a fallback, not a duration: a drag commit fires on the overlay's `transitionend` and only falls back to a computed deadline if that event never arrives — decide-then-animate, never a blind timer. Auto-scroll's tunables are likewise motion *tuning* (edge band, speed ramp, acceleration bounds), read as root vars off the drag element.

`useExitPresence`'s default exit window derives from the slow duration token plus a small settle slack, so retuning the token moves every pane's unmount window with it — the slack is the only raw number.

A hardcoded duration in a permanent surface is a bug — it should read a token, or justify a new one. Debounces (autosave, live stats) and zero-delay event cleanups are not motion and never migrate.

### Principles

- **One progress variable** drives a coordinated multi-element move (the `--io` shell) rather than N independent transitions that can desync — and it is the *variable* that transitions, never a property derived from it. A registered custom property already carries every value computed off it, so transitioning the derived property retargets it on every frame of the ramp and it chases the progress instead of tracking it.

- **One primitive per pattern** — `Reveal` for expand/collapse, the shared dropdown keyframes for a pane open, `PaneSlider` for a drill-down, the drag engine for reorder — applied everywhere, not re-derived per surface.

- **Tokens over literals** — duration and easing come from `motion.ts`; the named curves (Bloom, drag "out") are the only special-cased ones.

- **Compositor / pointer-driven where it counts** — scroll-park (scroll-timeline), drag chrome and edge-resize (1:1, no timed transition) — so motion never lags the input.
