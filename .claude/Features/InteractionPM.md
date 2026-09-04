## Interaction & Motion

The named motions and the interaction primitives, built on the duration ladder and the two curves in the design system's `Animation/` folder. Drag-specific motion — the reorder feel, the insertion line, auto-scroll — belongs to PommoraDND. Motion is Pommora-native, inspired by Apple, and adopted only where it deepens the minimalism: one progress variable drives a coordinated move, one primitive serves each pattern, and the pointer drives what should feel attached to it.

### Motion Tokens

Every permanent transition reads `Animation/motion.ts` — `duration.fast/menu/base/slow` and `easing.baseEase/baseSnap`, bridged to CSS as `--duration-*`, `--ease-base`, and `--ease-snap`. The Bloom curve in `animations.css.ts` is the one named curve outside the token set: the open-and-close curve both Bloom rungs share. Debounces and zero-delay cleanups are not motion and never take a token.

### Named Animations

Each motion is named for what it does; the code name beside it is what a grep finds.

#### II. Bloom

Pommora's canonical menu open, the `menu-bloom` / `menu-bloom-out` keyframe pair: a zoom from the trigger — scale to 1 plus a fade on the Bloom curve, no blur — run on the `slow` token through the `menuBloom` and `menuBloomClosing` classes. It is symmetric, so a click-off retracts the menu rather than cutting it, and the parent keeps the menu mounted through the exit with `useExitPresence`. The origin is the consumer's: the class reads `--menu-origin`, and a beaked surface (`GlassSurface`'s `notch`) writes its own beak tip there, so a beaked surface blooms from its beak while a plain menu blooms from the point on its anchored edge nearest the trigger. `MenuSurface`, the shell every large toolbar menu mounts, carries this motion. A menu's placement and collision flip are decided once per open, and how a picker's rows mark the chosen one follows the **Show Selection In Pickers As** setting.

#### II. Menu

The same keyframes and curve on the `menu` token through `bloomOpen` and `bloomClose` — snappier, also symmetric, reading the same origin and retracting through the same `useExitPresence`. Pickers, the autocomplete, and the glance pane take this variant. The overtake sweep the sidebar plays when its mode switches is its own pair, `sidebar-mode-*` in `Sidebar/Sidebar.css`: the incoming mode slides in from the ribbon edge over the sitting content.

#### II. Header Scroll-Park

The page banner and title zone slides up under the toolbar on scroll: a scroll-timeline animation (`mdpm-header-park` in `MarkdownPM/Styles.css`) bound to the editor's scroller and ranged over `--header-zone`, the live header height. Compositor-driven, with no duration.

#### II. Floating Windows

Every in-app window opens and closes on the `windowIn` / `windowOut` scale-fade in `Animation`, on the `fast` token, its exit held by `useExitPresence`. The confirmation window takes the same pair, its scrim fading alongside on the same duration. A window that wants its own exit suppresses that scale-out rather than layering a second motion on top: the Page Window's promote plays the **engulf** (`engulfing` in `PageWindow.tsx`), a WAAPI FLIP from the window's live rect onto the detail pane's on the `base` token, and opening the NavWindow over a live Page Window plays the **morph**, the same FLIP between the two windows. A window moves by a press on its bare surfaces: the shell itself, the body row, the side panel, and the title-bar band spanning the toolbar clearance its host reserves — the NavWindow and Settings put their own controls at the top, reserve none, and move by their inset ring instead. A side pane opens the way the detail inspector does — parked off the edge and carried home by the `--io` progress — while the body beside it gives up that width on the base tokens.

### Primitives

The interaction layer in `Interactions/` and `Animation/`: content-agnostic pointer, scroll, and motion primitives that fields and labels depend down into.

**The `--io` progress.** One registered `@property --io` (0 closed, 1 open) transitions once on `--duration-base` and drives the inspector's moving parts in lockstep: the inspector slide, the toolbar trio's swallow as the pill rides the pane's edge, and the trio's glass void. `.shell.is-resizing` sets transitions off for 1:1 cursor tracking during an edge drag, the sidebar collapse is a sibling slide on the same token, and a floating window parks a leading pane on the mirrored `--io-l`.

**Reveal.** `Animation/Reveal.tsx` is the canonical body open and close: a `grid-template-rows: 0fr ↔ 1fr` transition on the `fast` token, mounting at 0fr and unmounting on `transitionend`, that stops clipping once open so overhanging affordances aren't cut off. It backs the sidebar's nested trees, the settings panes, and the heading-fold body. Disclosure chevrons rotate through the shared `dropOutline` on the same beat, so rotate and unfold land together.

**Entrance.** `Animation/useEntrance.ts` names which rows in a list arrived since the last render, so the list hands `enterOnMount` to those alone and a new row discloses in on the same unfold. It compares key sets rather than array identity, so a list rebuilt on every render still reports an arrival once, and a surface's first render seeds silently — an opening pane presents rather than cascading. The exclusion pane, filter rules, page-property rows, option chips, and the property frame's lists all disclose new rows on it.

**PaneSlide.** The sidebar's and the inspector's in-out: the `--io` progress carries a pane home from its parked edge while the body beside it gives up the width, on the base tokens.

**FrameSlide.** `DesignSystem/Menus/frame-slide.tsx` is the two-slot push and back every frame runs on — root and detail on the base tokens — and it nests. Both slots stay mounted and measured, so the target size is known the instant the active slot flips; a slot needing a ceiling or a pinned footer wraps its content in the shared menu scroll frame.

**Scroll Glide.** Travel to a known destination in a document you're already in — the page Outline's jump is its first caller. It shares its module with the drag auto-scroll and its one-owner-at-a-time rule, re-reads the destination every frame so a lazily rendering host's estimate is absorbed into the motion, fixes its beat from the opening distance, and cancels on any real scroll input.

**DualSwitch.** The knob slides between its ticks, the ticks cross-fade, and the track tint crossfades, all on the `fast` beat, so the toggle reads as one move.

#### II. The Caret

One text-insertion identity for the whole app: every CodeMirror surface mounts the caret layer, and the same bar paints over the native text fields, the inline-rename inputs among them, from a global caret layer (`Carets.css`, `nativeCaret.ts`, `MarkdownPM/Editor/caret.ts`). The drawn caret fades on a symmetric cycle via twin keyframes, swapped on selection change to restart the cycle without reflow; on a fresh focus the overlay settles by re-measuring each frame until the bar holds still.

**SOURCE:** `Pommora/src/renderer/Carets.css`

| Title | Token | Value |
| --- | --- | --- |
| Bar Thickness | `--caret-width` | `2px` |
| Fill | `--caret-color` | → `var(--label-primary)` |
| Blink Cycle | `--caret-gap` | `1.3s` (a blink cycle, outside the duration scale) |
| Dip Opacity | `--caret-dim` | `0` |
| I-Beam Cursor | `--caret-cursor` | inline SVG data-URI, hotspot `7 12` |

#### II. OverScroll

The overflow-fade mechanism behind every capped label: a label truncates at rest and scrolls under the pointer to reveal its full text, its hidden edge fading into the surface. Three registered properties, two axis classes, and three modifiers; `--over-scroll-fade` is non-inheriting, so the knob sits on the element carrying the class. An axis class carries the fade, `over-scroll-cap` adds a capped-label box beneath it, and a label that can't hover itself takes the scrolled state from an ancestor with `over-scroll-host`.

**SOURCE:** `Pommora/src/renderer/Interactions/OverScroll/OverScroll.tsx` · `Pommora/src/renderer/Interactions/OverScroll/over-scroll.css`

| Title | Token | Value |
| --- | --- | --- |
| Lead / Trail Progress | `@property --os-lead` / `--os-trail` | `<number>`, non-inheriting, initial `0` |
| Width Knob | `@property --over-scroll-fade` | `syntax "*"`, non-inheriting |
| House Default | `--os-fade-default` | `22px` block axis; `16px` inline; `0` under an ellipsis |
| Axis | `--os-dir` | `to bottom` fallback; `to right` on the inline axis |
| Read Distance | `--os-scroll` | live `scrollLeft` on the cap; `0px` fallback |

#### II. Hover Remove

The hover-revealed remove ×, with the label-tail melt as an option: hovering a chip's right third reveals the × while the label's tail blurs into the fill beneath it.

**SOURCE:** `Pommora/src/renderer/Interactions/HoverRemove/HoverRemove.tsx` · `Pommora/src/renderer/Interactions/HoverRemove/hover-remove.css.ts`

| Title | Token | Value |
| --- | --- | --- |
| Melt Ground | `--melt-ground` | what the blurred twin smears into; follows the host's fill |
| × Ink | `--hover-remove-ink` | `inherit` fallback; a neutral-filled label paints its own |

### Principles

- **One progress variable** drives a coordinated multi-element move rather than N independent transitions that can desync — and it is the variable that transitions, never a property derived from it.
- **One primitive per pattern** — `Reveal` for expand and collapse, the shared Bloom keyframes for a menu open, `FrameSlide` for a drill-down, the drag engine for reorder.
- **Tokens over literals** — duration and easing come from `motion.ts`; a hardcoded duration in a permanent surface reads a token or justifies a new one.
- **Compositor- and pointer-driven where it counts** — scroll-park, drag chrome, and edge-resize run 1:1 with input, so motion never lags it.

---

#### Pending

- **Spacing and radius** stay partly ad-hoc pending a Figma lift.
- **Whether the content insets derive from `--io`** or stay independent per-surface transitions is open.
