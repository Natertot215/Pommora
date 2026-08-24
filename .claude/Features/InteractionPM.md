## Interaction & Motion

```
Interaction & Motion
├── Motion Tokens
├── Named Animations
│   ├── Bloom
│   ├── Dropdown
│   └── Header Scroll-Park
├── The `--io` Progress
├── Reveal
├── Pane Slide + Resize
├── DualSwitch
├── Drag Motion
├── Scroll Glide
├── Floating Windows
├── Timing Sources
├── The Caret
├── Over Scroll
├── Hover Remove
├── Autoscroll Tuning
├── Principles
└── Pending
```

The single home for the animation system: the motion token vocabulary, the named animation aliases, the shell's one-progress driver, and the expand/collapse primitive. Drag-specific motion — the reorder feel, the insertion line, auto-scroll behavior — lives in [[PommoraDND]]. Motion is Pommora-native, inspired by Apple, adopted only where it deepens the minimalism.

### Motion Tokens

The single source is `design-system/tokens/motion.ts`, surfaced as CSS vars through `tokens/theme-vars.css.ts`. Every permanent transition references these rather than literals.

- **Durations:** `fast` (hover feedback and affordance reveal) · `disclosure` (chevron and disclosure open/close, app-wide) · `dropdown` (the inline picker and autocomplete, Bloom at a snappier pace) · `base` (the shell slides and the reflow tracking them) · `slow` (the menu Bloom and the hover-pop swell). Every step publishes as a `--duration-*` var, with `disclosure` on its own `--disclosure` so it stays tunable apart from `fast`.
- **Easings:** `standard` (the everyday ease) · `inOut` (a symmetric fade) · `out` (emphatic moves, also the drag "out" curve). All three publish as `--ease-*` vars.
- **Bloom curve** — the open and close curve for both dropdown motions, which share one set of keyframes. It's the one special-cased named curve, living in `animations.css.ts` rather than the everyday token set.

**z-index** rides the named stacking ladders, and **shadow** the two-token family every frost surface ends its stack in — both live with the geometry and shadow tokens.[^1]

### Named Animations

The two dropdown motions are the same animation at two speeds — one `dropdown-menu` (open) + `dropdown-menu-out` (close) keyframe pair on the one Bloom curve, differing only in which duration token they run.

#### Bloom

Pommora's canonical pane and menu open — a zoom-from-the-trigger (`scale → 1` + fade on the Bloom curve, no blur). The `dropdownMenu` / `dropdownMenuClosing` classes run the shared keyframes on the **`slow`** token, symmetric, so a click-off retracts the pane instead of cutting it; the parent keeps it mounted through the exit via the shared **`useExitPresence`** hook. The origin point is the consumer's: the class reads `--dropdown-origin` so the pane blooms from its own trigger, and the shared beaked shell (`NotchedPane`) computes that origin as its own beak tip and writes it on the pane, so a beaked surface always blooms from the beak. This is the menu's motion, carried by `MenuSurface`, the shell every large toolbar dropdown mounts.

#### Dropdown

The same keyframes and curve on the **`dropdown`** token — snappier, also symmetric, reading the same `--dropdown-origin` and retracting through the same `useExitPresence`. Inline surfaces take this variant.

A surface riding either token stays mounted through its exit and drives an `open` prop; a surface torn out on dismissal skips its retract entirely, and `PickerMenu` says so in development when a consumer does it. Because the rows a pane holds are usually built from the state that opened it, and dismissing clears that state in the same tick, the pane keeps its last rows for the length of the exit rather than retracting empty.

- **Placement + caps:** a `PickerMenu` anchors either to an element or to a bare point — a right-click's cursor, read as a zero-size rect, or a text caret, which carries the line's height so a flip clears it — and declares which edge it pins to, and therefore which way it grows when its content resizes. Left to itself it straddles the trigger where the whole pane fits there, and falls back to the right edge where centering would have to be clamped — a centered pane that gets clamped sits off its trigger anyway, and an edge anchor at least stays put as content grows. A pane whose content resizes while open names an edge instead, since a centered one grows both ways and walks its rows sideways. Both that choice and the collision flip are decided once per open, never per re-measure, so growing content can't teleport a pane mid-gesture. A height cap routes through the shared scroll frame (one overflow region, its fade included), and a fixed width removes horizontal resize for a tree picker. Selected rows may wear the shared ring, which merges vertically across an adjacent run.
- **Two shells, one beak between them.** `MenuSurface` — the large toolbar dropdown, hanging off a named button — wears the beak, which points back at the button that opened it. A beak is not a shape a border can trace, so that shell alone draws its outline by hand: one curve cutting the frost and the same curve stroked as an SVG line. Every other pane is a plain rounded rect and mounts the pane material directly, keeping the material's own border, lighting and shadow. The rectangle is what makes a menu read as the OS's rather than as a bubble.
- **The Bloom starts where the beak would have been.** A beaked pane takes its origin from the tip; a rectangular one takes the same figure from its placement pass — the point on the anchored edge nearest the trigger, held clear of the corner arc. Neither pane blooms from its own middle.
- **The rows are the consumer's, not the shell's.** A fixed option set and a set of user-authored values take the same row, and how it states the chosen one is the nexus's `pickerSelection` setting — the row's own fill, or a trailing mark with the fill standing down. Where a pane holds a mark at all, the slot is laid out on every row inside it, so the pane can't resize as the selection moves. The icon grid, swatch grid, calendar and hover card were never rows at all and bring their own content.
- **The wikilink autocomplete rides the same shell as everything else**, anchored to the caret rather than an element — which is a line, not a point, so the anchor carries a height and a pane flipping above it clears the line rather than landing back over it. It centers on the caret and slides within the editor's own surface, not the viewport: a pane stopping at the window edge has already crossed whatever pane sits beside its own. It takes no backdrop and no focus, since the editor's keymap owns arrows, Return and Escape.

#### Header Scroll-Park

The page banner/title zone slides up under the toolbar on scroll — a **scroll-timeline** animation (`MarkdownPM/Styles.css`) bound to the `.cm-scroller` timeline and ranged over `--header-zone`, the live header height set by a ResizeObserver. Compositor-driven, no duration.

### The `--io` Progress

A single registered `@property --io` (`<number>`, 0 = closed → 1 = open, `styles.css`) transitions once on `--duration-base`/`--ease-standard` and drives the inspector's moving parts in lockstep: the inspector slide (`InspectorPanel` reads `--io` and carries no transition of its own), the toolbar trio "swallow" (the pill rides the pane edge via a gated `max()`, holding home until the inspector reaches it — the tab bar's right-edge condense shares that one swallow magnitude), and the trio's glass void (the pill's glass fades over the first fraction of the ramp while the bare icons stay solid). `.shell.is-resizing` sets `transition: none` for 1:1 cursor tracking during an edge-drag. The sidebar collapse is a sibling `transform` slide on the same base token, and a floating window parks a leading pane on the mirrored `--io-l`.

The content-inset reflow does not ride the progress — `--content-inset-right` is a plain custom property that flips between two values, and each surface reading it runs its own padding transition on the shared base token. The glass void renders as a two-layer pill because liquid glass can't be CSS-faded in place.[^2]

### Reveal

`design-system/components/Reveal.tsx` is the canonical body open/close: a `grid-template-rows: 0fr ↔ 1fr` transition on the `disclosure` token / `easing.standard`, mounting at 0fr then flipping on the next frame, and unmounting on `transitionend`. It stops clipping once open and idle, so affordances that overhang a row aren't cut off. It backs the sidebar nested trees, the settings panes, and the heading-fold body.

Disclosure **chevrons** rotate 90° through the shared `twisty` (`menu.css.ts`) — one definition for the sidebar, the grouping and filter panes, the group bands, and the properties pane. Its beat is a channel, `--twisty-beat`, defaulting to `--disclosure`, and `Reveal` takes a matching duration override so rotate and unfold land together. The editor fold rotates its own `::before` on the same disclosure beat; the drag-engine's tree collapse rides the drag feel (`--ix-dur`) instead.

### Pane Slide + Resize

`Components/Detail/PaneSlider.tsx` is the one two-slot drill-down primitive every pane rides — root ↔ detail on the shared `--duration-base`/`--ease-standard` — and it nests, since a detail may itself be a slider. The horizontal slide runs on that beat and width eases with it; height joins the ease only across a navigation flip, tracking its content untransitioned between flips since the animating child owns that beat.

Both slots stay mounted, each measured by a `ResizeObserver`, so the target size is known the instant the active slot flips, and the outgoing detail is held through the slide-out. Optional width and height floors keep a sparse pane from shrink-wrapping, and transitions arm only after first paint, so a pane snaps to its measured size on open. The slider only slides and resizes — a slot needing a ceiling, a scroll region, or a bottom-pinned footer wraps its content in the shared menu scroll frame, and the slider animates to the already-capped height.

### DualSwitch

`design-system/components/Switches/` — the knob slides between its on/off ticks, the ticks cross-fade, and the track tint crossfades, all on the `fast` beat under one easing const, so the toggle reads as a single move.

### Drag Motion

Owned by the in-house engine.[^3] In brief: one fixed "feel" (duration + easing) — `DEFAULT_FEEL` in `interactions/feel.tsx`, its named presets kept for the surfaces that pass one explicitly — read as a constant by every drag surface; decide-then-animate commits on `transitionend`; and the app-wide auto-scroll primitive every drag feeds. Every insertion-line surface draws its chrome from the shared owners in `design-system/interactions` — the `DragGhost` component (its glass the `GHOST_FROST` recipe) and the `drop-line`/`drop-dot`/`drop-line-host` classes on the drag-line tokens; the editor block-drag keeps its own lifecycle while its overlay wears the same classes (`editor/dragChrome.ts`) — all positioned 1:1 with the pointer, not timed.

### Scroll Glide

Travel to a known destination, for a surface sending the reader somewhere in a document they're already in — the page Outline's jump is its first caller.[^4] It shares its module with the drag auto-scroll and reuses that primitive's scroller resolution and one-owner-at-a-time rule, but not its motion — a drag beginning mid-travel claims the scroller and the glide stands down.

The destination is re-read every frame rather than resolved once: a host that renders lazily only estimates the height of what it hasn't drawn, and easing toward a live measurement absorbs that drift into the motion. The beat is fixed from the opening distance, proportional to it and clamped at both ends, so near and far jumps move the document at one apparent speed. The curve is the `out` easing token, mirrored as a function because a CSS cubic-bezier cannot drive a `scrollTop`. Any real scroll input cancels the travel, and reduced-motion arrives immediately.

### Floating Windows

Every in-app window mounts the shared `PreviewPane` surface on a `GlassWindow` foundation and opens and closes on the floating-window in/out it owns — a scale-fade on `--disclosure`, exit held by `useExitPresence`. A window that wants its own exit suppresses that scale-out rather than layering a second motion on top: the Page Preview's promote does exactly this and plays the **engulf**, a WAAPI FLIP from the window's live rect onto the detail pane's (translate to center, scale to box, fade) on `base`/`easing.standard`. A FLIP measures the window from the surface's own root, never by walking up from an inner node. Tab switches slide content on the preview's own stamp, and an open side pane rides the same keyframes. A window carries a pane on either edge at once, and its own edge never moves: the pane opens exactly as the detail inspector does — parked off the edge and carried home by `--io` with no transition of its own, while the body and footer beside it give up that width on the base tokens. The title ↔ tab morph rides the tab-open `@starting-style` growth (`tabStrip.css`) with the title fading and sliding on the base tokens.

### Timing Sources

Motion timing has one canonical home — the duration scale and easings in the motion tokens, read through their `--duration-*` / `--ease-*` vars; the shared dropdown keyframes and the Bloom curve live in the animations layer and take their durations from those same tokens.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/motion.ts` · `Pommora/src/renderer/src/design-system/animations.css.ts`

| Title         | Token                                       | Value                                                                                              |
| ------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Fast          | `duration.fast` · `--duration-fast`         | `180ms`                                                                                            |
| Disclosure    | `duration.disclosure` · `--disclosure`      | `180ms`                                                                                            |
| Dropdown      | `duration.dropdown` · `--duration-dropdown` | `225ms`                                                                                            |
| Base          | `duration.base` · `--duration-base`         | `280ms`                                                                                            |
| Slow          | `duration.slow` · `--duration-slow`         | `350ms`                                                                                            |
| Standard Ease | `easing.standard` · `--ease-standard`       | `ease`                                                                                             |
| In-Out Ease   | `easing.inOut` · `--ease-in-out`            | `ease-in-out`                                                                                      |
| Out Ease      | `easing.out` · `--ease-out`                 | `cubic-bezier(0.22, 1, 0.36, 1)` — the drag feels read it directly; no CSS rule names the variable |
| Bloom         | `BLOOM` (`animations.css.ts`)               | `cubic-bezier(0.32, 0.72, 0, 1)` — the one special-cased named curve                               |

Two kinds of timing stay in code rather than tokens. The drag feel presets are numeric because the engine interpolates them, not CSS; the engine's settle timing is a fallback rather than a duration — a drag commit fires on the overlay's `transitionend` and only falls back to a computed deadline if that event never arrives. `useExitPresence`'s default exit window derives from the slow duration token plus a small settle slack, so retuning the token moves every pane's unmount window with it.

### The Caret

One text-insertion identity for the whole app — every CodeMirror surface mounts the caret layer (the page editor and the table cell editors alike), and the same bar paints over the native text fields, the inline-rename inputs among them, from the global caret layer. A caret that doesn't appear belongs to `nativeCaret.ts`, never to the field.

The drawn caret fades on a symmetric on/off cycle via twin keyframes in `Carets.css`; `editor/caret.ts` swaps the keyframe name on selection change to restart the cycle without reflow. On a fresh focus the overlay settles by convergence — re-measuring each frame until the bar holds still, deadline-capped — since a pane may still be animating open with moves no resize or input event reports. The overlay stands down once the caret has genuinely scrolled out of its field, an intersection test rather than a containment one — a tight line-height lets a resting bar overhang the field's box without having gone anywhere.

**SOURCE:** `Pommora/src/renderer/src/Carets.css`

| Title | Token | Value |
| --- | --- | --- |
| Bar Thickness | `--caret-width` | `2px` |
| Fill | `--caret-color` | → `var(--label-primary)` |
| Blink Cycle | `--caret-gap` | `1.3s` (a blink cycle, outside the duration scale) |
| Dip Opacity | `--caret-dim` | `0` |
| I-Beam Cursor | `--caret-cursor` | inline SVG data-URI, hotspot `7 12` |

### OverScroll

The overflow-fade mechanism: three registered properties, two axis classes, and three modifiers. `--over-scroll-fade` is non-inheriting — the knob must sit on the element carrying the class, or it does nothing. Field content applies it at source through the family's own pieces: `EditableInput` carries the caret fade, and `InputField`'s capped content row states the fade default once as its own knob. An axis class carries the fade; `over-scroll-cap` adds a capped-label box beneath it; and a label that cannot hover itself takes the scrolled state from an ancestor with `over-scroll-host`.

**SOURCE:** `Pommora/src/renderer/src/design-system/interactions/OverScroll/`

| Title                 | Token                                        | Value                                             |
| --------------------- | -------------------------------------------- | ------------------------------------------------- |
| Lead / Trail Progress | `@property --os-lead` / `--os-trail`         | `<number>`, non-inheriting, initial `0`            |
| Width Knob            | `@property --over-scroll-fade`               | `syntax "*"`, non-inheriting                      |
| House Default         | `--os-fade-default`                          | `22px` block axis; `16px` inline; `0` under an ellipsis |
| Axis                  | `--os-dir`                                   | `to bottom` fallback; `to right` on the inline axis |
| Read Distance         | `--os-scroll`                                | live `scrollLeft` on the cap; `0px` fallback       |

### Hover Remove

The hover-revealed remove ×, with the label-tail melt as an option. 

**SOURCE:** `Pommora/src/renderer/src/design-system/interactions/HoverRemove/`

| Title       | Token                  | Value                                                     |
| ----------- | ---------------------- | --------------------------------------------------------- |
| Melt Ground | `--melt-ground`        | what the blurred twin smears into; follows the host's fill |
| × Ink       | `--hover-remove-ink`   | `inherit` fallback; a neutral-filled label paints its own  |

### Autoscroll Tuning

The edge-proximity loop's knobs — declared at `:root`, overridable on any ancestor, read once at drag start via `getComputedStyle`. Because nothing consumes them through `var()`, each default is stated once as a map beside the loop, feeding both the `:root` declaration and the loop's own fallback; a token audit that finds no consumer is reading the mechanism correctly. The loop itself is [[PommoraDND]]'s.

**SOURCE:** `Pommora/src/renderer/src/design-system/interactions/autoscroll.ts`
| Title | Token | Value |
| --- | --- | --- |
| Edge Band | `--autoscroll-edge` | `48px` |
| Speed | `--autoscroll-speed` | `840px` per second |
| Proximity Ramp | `--autoscroll-ramp` | `2` |
| Accel Start / Max / Distance | `--autoscroll-accel-start` / `-max` / `-distance` | `0.5` / `1.5` / `600px` |

### Principles

- **One progress variable** drives a coordinated multi-element move rather than N independent transitions that can desync — and it is the variable that transitions, never a property derived from it, which would retarget on every frame of the ramp.
- **One primitive per pattern** — `Reveal` for expand/collapse, the shared dropdown keyframes for a pane open, `PaneSlider` for a drill-down, the drag engine for reorder.
- **Tokens over literals** — duration and easing come from `motion.ts`; a hardcoded duration in a permanent surface should read a token or justify a new one. Debounces and zero-delay event cleanups are not motion and never migrate.
- **Compositor and pointer-driven where it counts** — scroll-park (scroll-timeline), drag chrome and edge-resize (1:1, no timed transition) — so motion never lags the input.

### Pending

- **Spacing and radius** stay partly ad-hoc pending a Figma lift.[^1]
- **Whether the content insets derive from `--io`** or stay independent per-surface transitions is open.

[^1]: [[DesignSystemPM]]
[^2]: [[DesignSystemPM]] §Known Issues
[^3]: [[PommoraDND]]
[^4]: [[PagesPM]]
