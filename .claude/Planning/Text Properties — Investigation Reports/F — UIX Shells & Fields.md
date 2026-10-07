**Re-grounded:** 10-07-2026 at `32d3fa62c`

### F — UIX Shells & Fields

The slice covers the kit pieces a TextPane and a card-level Text field would be assembled from: `PickerMenu` and its resize opt-in, the glass shells, the field primitives and their ring channel, the frame slide, the icon registry, and the styling constraints that bind them. Citations are `file:line` at the commit above.

#### Task 1: PickerMenu as a Pane Shell

##### Props and Ownership

| Prop | What It Does | Source |
| --- | --- | --- |
| `open` · `onExited` | Drives `useExitPresence(open, 'menu')`; `onExited` fires once the Bloom-out has played and the pane unmounted | `UIX/Pickers/PickerMenu.tsx:115`, `:136-143` |
| `enter` | `false` skips the Bloom-in (a pinned glance); the close still blooms | `PickerMenu.tsx:95-96`, `:290` |
| `onDismiss` · `modal` | `useDismissal` registers the pane; a shield is drawn only when `onDismiss` is given; `modal={false}` opts out of the stack | `PickerMenu.tsx:118-123`, `:312-321` |
| `triggerRef` · `anchorX/Y/Height` | Element or bare-point anchoring; without either, the marker's parent is the trigger | `PickerMenu.tsx:182-195` |
| `direction` | The preferred side; the flip is decided once per open, toward the side with more room, only when the pane exceeds the preferred room | `PickerMenu.tsx:202-212` |
| `origin` | `auto` · `center` · `left` · `right` horizontal seating, decided once per open | `PickerMenu.tsx:218-238` |
| `bounds` | Horizontal containment `{ left, right }` for the edges, not a size bound | `PickerMenu.tsx:104`, `:199-200` |
| `glass` · `solid` | Picks the Shell: `GlassSurface` or `GlassWindow`; `solid` is passed only to the surface and ignored for `window` | `PickerMenu.tsx:92-94`, `:280`, `:284` |
| `bareSurface` | Drops `s.surface` (4px padding, flex column) | `PickerMenu.tsx:287`, `picker-base.css.ts:36-41` |
| `focus` | `trap` takes focus and holds Tab; `leave` takes none; `keep` prevents a press from moving focus | `PickerMenu.tsx:106-107`, `:275-278`, `:327-331` |
| `contentClassName` · `style` | Both land on the Shell root, after `s.pane` and `s.surface` | `PickerMenu.tsx:285-298` |
| `resize` | A `PaneResize` from `usePaneResize`: adds `s.resizing` during a drag, renders the edges as Shell children, and receives the decided side and room | `PickerMenu.tsx:112-113`, `:211`, `:289`, `:301` |

The pane re-places itself whenever its own box changes through a `ResizeObserver` (`PickerMenu.tsx:163-177`), snaps to whole pixels so the frost composites sharply (`:57-64`), and keeps `VIEWPORT_MARGIN` 8px from the window edges (`:28`). PickerMenu applies no size of its own; the pane fits its content unless the host sizes the body.

##### Fixed Size Without Drag-to-Resize

`usePaneResize` has no path to a bounded size without handles. An axis resizes only when `PaneBounds.min` names it (`UIX/Pickers/usePaneResize.tsx:11-16`); `fit()` returns `undefined` for an axis without a floor (`:71-77`), and the edge filter drops the same axes (`:118-122`). An axis with a floor always yields edges, and an axis without one yields no size. The host applies `resize.size` itself (`Core/Interface/Glance/GlancePane.tsx:364`; `Core/MarkdownPM/Autocomplete/AutocompletePane.tsx:73`, `:203-204`).

A fixed size today is CSS on the body, bypassing the hook entirely:

| Precedent | Sizing | Source |
| --- | --- | --- |
| Pinned glance | Inline `width`/`height` from the stored size; no `resize` prop | `GlancePane.tsx:409-427` |
| CalendarPicker | Root fixed at `215px` | `UIX/Pickers/calendar-picker.css.ts:20` |
| TextPicker (bare) | `minWidth 100` · `maxWidth 200` · `fieldSizing: content` | `UIX/Pickers/text-picker.css.ts:68-72` |
| TextPicker (affixed) | `width 140px` | `text-picker.css.ts:17` |
| Tree panes | `minWidth 140` · `maxWidth 260` | `picker-base.css.ts:10-13` |
| List ceilings | `PICKER_MAX_HEIGHT` 240, passed as `MenuScrollFrame`'s `maxHeight` (its default is `MENU_MAX_HEIGHT`) | `picker-base.css.ts:8`, `UIX/Menus/MenuRows.tsx:384-403` |

The one thing `usePaneResize` does that CSS clamps don't: it caps height at the room the pane opened into (`usePaneResize.tsx:65-68`). PickerMenu itself only flips; it never clamps height (`PickerMenu.tsx:209`), so a fixed-height pane taller than the room on both sides runs past the viewport.

##### Shells in Use

| Consumer | Shell | Resize | Focus | Source |
| --- | --- | --- | --- | --- |
| GlancePane | `glass="window"` | Yes (`min 180×100`, default `260×120`) | `leave`, `modal={false}` | `GlancePane.tsx:38-40`, `:79`, `:348-356` |
| Pinned glance | `glass="window"` | No | `leave`, `modal={false}` | `GlancePane.tsx:409-420` |
| CaretPane (Autocomplete, Block Menu) | `glass="window"` | Yes | `keep`, no `onDismiss` | `Core/MarkdownPM/Menus/caretPane.tsx:63-74` |
| PropertyPicker | `solid` surface | No | `trap` | `Core/Properties/Pickers/PropertyPicker.tsx:185-191` |
| CalendarPicker month/year/time dropdowns | `solid` surface | No | `trap` | `UIX/Pickers/CalendarPicker.tsx:415-429`, `:535-548` |
| TextPicker | Default surface | No | `trap` | `UIX/Pickers/TextPicker.tsx:42-50` |
| ImagePicker | `GlassWindow` directly inside a `ModalScrim` — not a PickerMenu | — | — | `Core/Assets/ImagePicker.tsx:214-215` |

"A PickerMenu on the GlassWindow surface" is `glass="window"`. `GlassWindow` wears `WINDOW_FROST` (the 90% `--bg-window` fill, which holds its content legible over whatever it floats above) with its rim drawn by a separate child above the content (`UIX/Glass/GlassWindow.tsx:6-9`, `:20-22`; `glassBase.ts:22`, `:35`, `:67-81`). A `solid` GlassSurface wears the same `WINDOW_FROST` parameters with the rim inline on the root (`GlassSurface.tsx:37-40`); PickerMenu's own comment separates the two as distinct opt-ins (`PickerMenu.tsx:92`). The practical differences are the rim layer drawing over content run to the edge, and the rim's own `box-shadow` transition (`glass-window.css.ts:8-14`).

##### Hosting an Editor

GlancePane is the only PickerMenu hosting MarkdownPM: a `PageTile` inside the window shell, with `.cm-scroller` overflow forced through `!important` and the caret disabled (`Core/Interface/Glance/glance-pane.css:31-52`). It is a read-only precedent.

- **Initial Focus:** `useFocusScope`'s `FOCUSABLE` lists inputs, buttons, textareas, and `[tabindex]` but no `[contenteditable]` (`UIX/Interactions/focusScope.ts:3-4`). CodeMirror 6.43.1's content node carries no `tabindex` (`node_modules/@codemirror/view/dist/index.js:8219-8230`), and MarkdownPM's content attributes add none (`Core/MarkdownPM/surface.ts:47-53`). Under `focus="trap"`, the open focuses the first tab stop or the layer root (`focusScope.ts:34`, `PickerMenu.tsx:327`), so the editor doesn't receive focus without a host call.
- **Tab:** The trap's handler sits on the layer's React `onKeyDown` (`PickerMenu.tsx:331`) and returns early while focus is on a non-edge element (`focusScope.ts:56-59`); with zero tab stops it prevents the default (`:60-61`). MarkdownPM binds Tab for list nesting (`Core/MarkdownPM/Input/markdownInput.ts:267-268`).
- **Escape:** The dismissal stack stands down on a prevented Escape (`UIX/Interactions/dismissalStack.ts:78`).
- **Nested Panes:** An editor's autocomplete opens its own `CaretPane` with `bounds` set to the editor's nearest vertical scroller (`caretPane.tsx:25-45`, `:69`), and PickerMenu clamps its horizontal edges to those bounds (`PickerMenu.tsx:199-200`). Inside a scrolling TextPane body, that scroller is the TextPane's own, against an autocomplete width floor of 180px (`AutocompletePane.tsx:48-52`). Unverified live.

#### Task 2: The Resize Tint and an Error Outline

##### What Paints the Resize Tint

| Piece | Value | Source |
| --- | --- | --- |
| Writer | `--glass-outline: var(--accent-stroke-hot)` on the parent of an edge that is hovered or active | `UIX/Interactions/resizable.css:72-75` |
| Edge class | `usePaneResize` passes `outlined: true`; edges get `resize-outlined` and `is-active` | `usePaneResize.tsx:85`, `UIX/Interactions/useResizable.tsx:146-151` |
| Tint | `--accent-stroke-hot` = `tintAt('var(--accent)', 'primary')` = 60%, declared at `:root` | `UIX/Theme/theme-vars.css.ts:51`, `:97`; `UIX/Theme/colors.ts:42-44`, `:65-66` |
| Readers | `border: var(--width-100) solid var(--glass-outline, white@12%)` and `inset 0 0 0 1px var(--glass-outline, transparent)` | `UIX/Glass/glassBase.ts:75-77`, `:83` |
| GlassSurface element | Border and inset both on the Shell root | `GlassSurface.tsx:37-40`; `glassBase.ts:57`, `:68` |
| GlassWindow element | Border on the root; inset on the rim child | `GlassWindow.tsx:6-7`, `:20-22` |
| Transition (root) | `border-color` and `box-shadow`, `--duration-base` (280ms) · `--ease-base` (`ease`), on `:has(> .resize-outlined)` | `resizable.css:66-71`; `UIX/Animations/motion.ts:6`, `:11`; `theme-vars.css.ts:163`, `:165` |
| Transition (rim) | `box-shadow`, `duration.base` · `easing.baseEase`, always | `UIX/Glass/glass-window.css.ts:13` |

The tint shows on edge hover as well as during a drag (`resizable.css:72-73`). The root's transition exists only while the Shell has `.resize-outlined` children, which a pane without a `resize` prop never has. On a fixed GlassSurface pane, a `--glass-outline` swap snaps; on a fixed GlassWindow pane, the rim's inset eases while the root's border snaps — the mismatch `resizable.css:66` names as a white flash. Reusing "the same ease and tint" on a non-resizing pane therefore needs its own `transition` on the Shell alongside a writer for the variable.

`PommoraUIX.md:313` describes `--glass-outline` recoloring for "a resize in flight, an active embed." The only writer in the repo is `resizable.css:74`.

##### The Error Variant Against `errorRing()`

| | Glass Outline | Field Ring |
| --- | --- | --- |
| Variable | `--glass-outline` | `--field-ring` |
| Element | The Shell (pane edge) | A field box |
| Geometry | 1px border + 1px inset | 2px inset (`fieldRing()` default) |
| Error color today | None | `tintAt('var(--error)', 'primary')` |
| Transition | 280ms `ease`, only with resize edges present | None from `errorRing()`; 180ms `ease` on `box-shadow` when `focusRing()` is composed on the same element |
| App consumers of the error preset | — | None; the only consumer is the Dashboard showcase |
| Source | `glassBase.ts:76`, `:83` | `UIX/Fields/fieldRing.ts:9-17`, `:20-33`; `UIX/Fields/fields.css.ts:33`; `Dashboard/Leaves/fields-leaf.css.ts:2-5` |

An `--error` variant of the resize tint is the same variable with a different value: `--glass-outline` set to `tintAt('var(--error)', 'primary')`, the step `errorRing()` and `--accent-stroke-hot` share. No `--error-stroke-hot` token exists (`theme-vars.css.ts:80`, `:95-97`). The two channels share a color step but sit on different elements with different widths and durations; they become one mechanism only once the session decides which element wears the error. Where `focusRing()` and `errorRing()` compose on one field, the error swap inherits the focus transition, since both write the same `box-shadow`.

Scoping `--accent` to `--error` on the pane doesn't reach the glass outline: `--accent-stroke-hot` is substituted at `:root` (`theme-vars.css.ts:51`, `:97`), so a descendant's `--accent` doesn't change it. TextPicker's `accent` prop works because `focusRing()` resolves `var(--accent)` on the field itself (`TextPicker.tsx:49`, `fieldRing.ts:30`).

##### Transition Hazards on the Shell

- The Shell root already carries the Bloom as an `animation`, not a transition (`UIX/Animations/animations.css.ts:4-24`; `PickerMenu.tsx:290`).
- A `transition` written through `contentClassName` matches `:has(> .resize-outlined)` at equal specificity, so on an edged pane one list replaces the other by source order (Interface-Styling's shorthand rule). On an edge-free pane it's the only writer.
- An edge hover's `:has(> .resize-outlined:hover)` outranks a single-class writer of `--glass-outline`; an inline write through PickerMenu's `style` (`PickerMenu.tsx:292-297`) outranks both.
- `--glass-outline` is unregistered (the registered properties are `scroll-fade.css:2-13`, `slide-progress.css:2-9`, `Core/Interface/styles.css:45`, `Core/MarkdownPM/markdown-pm.css:1`). Its swap is discrete, so the transition sits on the derived `border-color` and `box-shadow`, as `resizable.css` already does.
- The GlassWindow rim's transition is on a child the host can't class (`GlassWindow.tsx:22`); it inherits the variable from the root.

#### Task 3: Fields

| Primitive | Purpose | Element | Commit Model | Source |
| --- | --- | --- | --- | --- |
| `EditableInput` | The committing input | `<input>` | Enter blurs; blur trims and commits; Escape restores and cancels; `required` restores a blank | `UIX/Fields/EditableInput.tsx:49-104` |
| `InputField` | Field chrome — `boxed` or `bordered`; `edit` makes it click-to-edit | `<div role="button">` holding `RenamableLabel` → `EditableInput` | Through `EditableInput` | `UIX/Fields/InputField.tsx:21-99`; `UIX/Fields/RenamableLabel.tsx:1`, `:47` |
| `PathField` | A folder path as a trail, typed in place or browsed | `InputField chrome="bordered"` | `emptyCommits`, `renames: 'row'` | `UIX/Fields/PathField.tsx:28-59` |
| `BrowseButton` | The trailing browse action alone | `Button` `base` · `button-inline` · `folder-open` | Click stops propagation | `PathField.tsx:7-26` |
| `SearchField` | A controlled filter input | `<input>` | Live `onValueChange`; Escape blurs, keeping the query | `UIX/Fields/SearchField.tsx:14-39` |

- **Invalid:** `invalid` is a caller predicate `(text) => boolean` that marks `aria-invalid` and dims the text to ghost opacity (`EditableInput.tsx:35-36`, `:65`, `:77`; `fields.css.ts:122-124`). The blur commits regardless (`EditableInput.tsx:94-103`); refusal lives in the caller's `onCommit`.
- **Chrome:** `boxed` is `s.field` — a quaternary fill with a transparent ring (`fields.css.ts:21-36`); `bordered` is `s.borderedField` — the ring channel set to `border.base`, `nowrap`, `overflow: hidden` (`:38-53`). `InputField`'s `chrome` accepts only those two (`InputField.tsx:34`, `:65`). Chromeless styles exist as raw classes, `base` and `search` (`fields.css.ts:13-19`, `:110-118`), outside `InputField`.
- **Bordered Users:** `PathField` (`PathField.tsx:46`) in Settings' asset directory and excluded directories (`Core/Settings/AssetDirectoryRow.tsx:19`, `ExcludedDirectoriesRow.tsx:68`), the File value pane (`PropertyPicker.tsx:149-163`), and the File schema editor (`Core/Properties/Schema/FileEditor.tsx:30`); ImagePicker's path field (`ImagePicker.tsx:267-285`); the filter frame's value fields as the raw class — `cellField` and `cellInput` (`Core/Views/Settings/filter-frame.css.ts:41`, `:90-98`; `FilterFrame.tsx:108`, `:484`, `:636`); and the Dashboard leaf. No card or cell mounts `InputField` today; its consumers are `NexusRows`, `HomepageMenu`, `ImagePicker`, `PathField`, and `InlineEditHeader`.
- **Multi-Line:** No UIX primitive hosts a `<textarea>` or contenteditable surface. UIX names them only in selector strings (`UIX/Interactions/shared.ts:15`; `UIX/Interactions/focusScope.ts:4`, textarea only; `UIX/Theme/caret.css:26-36`). A capped `InputField` scrolls horizontally through `overScrollLabel` (`InputField.tsx:56-57`; `UIX/Interactions/over-scroll.css:2-9`).

##### A Trailing `square-pen` Accessory

`InputField`'s `trailing` slot (`InputField.tsx:96`; `fields.css.ts:93-99`: `margin-left: auto`, 8px stand-off, tertiary label) and `BrowseButton`'s shape — an inline base `Button` that stops propagation so the click-to-edit field underneath doesn't also activate (`PathField.tsx:14-25`; `InputField.tsx:70-72`) — carry over directly. `BrowseButton` hard-codes `folder-open`, and it is always visible. A hover-revealed `square-pen` already exists as the option row's Edit button: `optionEditButton = style([accessoryButton, revealDim])` on a row marked `data-reveal-host=""`, held visible while editing through `data-reveal-held` (`UIX/Menus/frames.css.ts:161`; `Core/Properties/Schema/OptionRow.tsx:35`, `:45-54`). `Button`'s `reveal` prop applies `revealTarget` (`UIX/Buttons/Button.tsx:27`, `:64`). The new part is an accessory whose glyph and action are parameters, seated on cells and cards that aren't reveal hosts today: a table cell's nearest host is its row (`Core/Views/Table/TableView.tsx:653`), and a card value's is the View tile (`Core/Tiles/Surfaces/ViewTile.tsx:589`) or none.

#### Task 4: FrameSlide and the Top Row

- **Slots:** `root` and `detail` sit side by side on a track translated by the root's measured width (`UIX/Menus/FrameSlide.tsx:77-101`). The flip to the detail waits one frame after open so the observer has a target (`:30-39`); the detail is latched through the slide-out (`:41-44`); the inactive slot is `inert` (`:91`, `:96`) and hidden once settled (`frame-slide.css.ts:26-27`).
- **Measured Size:** A `ResizeObserver` reads both slots' `offsetWidth`/`offsetHeight` (`FrameSlide.tsx:46-58`) and writes them inline on the viewport (`:85`). Width always eases at 280ms; height eases only during a flip and otherwise tracks content instantly (`frame-slide.css.ts:10-18`; `FrameSlide.tsx:63-75`). A live pane resize turns the viewport transition off (`picker-base.css.ts:43-45`).
- **Floors and Ceilings:** `minWidth`, `maxWidth`, and `minHeight` apply per slot (`FrameSlide.tsx:14-24`, `:81`). Height is never capped (`:9`); a slot needing a ceiling wraps its content in `MenuScrollFrame`. An editor growing in place grows the viewport live, PickerMenu re-places it (`PickerMenu.tsx:163-177`) on the side already decided (`:202-212`), and growth past the room runs off-screen.
- **`frameGrowth`:** `growToContent(maxWidth)` is width-only — `minWidth: 100%`, `width: max-content`, a `maxWidth` ceiling (`UIX/Menus/frameGrowth.ts:1-8`).
- **`MenuTopRow`:** A `MenuItem` with a `chevron-left`, the back label, and `current` or a trailing glyph on the right, followed by a flush separator (`MenuRows.tsx:41-75`). It prevents default on pointer-down because "the value panes commit-on-blur" (`:70-71`), so a press on Back leaves the field focused; a focused input removed from the DOM fires no blur (`EditableInput.tsx:89`), so an uncommitted edit doesn't commit on Back.
- **In the Property Picker:** The chooser drills from a list of entries into `MenuTopRow` (`group ?? 'Properties'`, `current` = the property's name) above the type's value pane, in a `solid` PickerMenu with `minWidth 120` and `minHeight 0` (`PropertyPicker.tsx:185-226`). `PickTarget` has `options`, `dateTime`, and `file` kinds (`:41-48`); the File pane is a `PathField` (`:149-163`).

#### Task 5: Icons and Styling Constraints

##### Icons

| Glyph | Curated `icons` | Full Roster | Current Use | Source |
| --- | --- | --- | --- | --- |
| `square-pen` | Yes | Yes | Option row's Edit Option button | `UIX/Symbols/index.tsx:61`, `:148`; `OptionRow.tsx:48` |
| `text-align-start` | No | Yes | — | `UIX/Symbols/iconNames.ts:1530`; `iconTags.ts:9374` |
| `text-align-justify` | Yes | Yes | Title's type icon | `index.tsx:174`; `Core/Properties/Cells/PropertyTypes.tsx:22` |

A name outside the curated registry renders through `LazyGlyph`, showing `square-dashed` until the full Lucide set loads (`index.tsx:220-227`, `:241`). A type's default icon lives in Core, not UIX: `TYPE_META` types each entry's `icon` as `IconName` (`PropertyTypes.tsx:15-34`), which is `keyof typeof icons` (`index.tsx:186`), so a default must be curated. A user-chosen `def.icon` accepts any roster id through `asRenderableIcon` (`PropertyTypes.tsx:40-41`; `index.tsx:191-194`). Curating a glyph is one import and one registry line (`index.tsx:98`).

##### Styling Constraints That Bite

- **Transition Shorthand:** On the Shell, a new `transition` competes with `resizable.css`'s list when edges are present (*§Transition Hazards on the Shell*). On a field, `focusRing()` already owns `transition: box-shadow` (`fieldRing.ts:26`). On FrameSlide's viewport, the slide owns `width`/`height` (`frame-slide.css.ts:11-18`).
- **Custom Properties on Shared Classes:** `--glass-outline` written on `picker-base`'s `pane` or `surface` class reaches every picker. `borderedField` writes `--field-ring` (`fields.css.ts:51`), so a class composing it re-answers the ring for every bordered consumer listed in Task 3.
- **Hover Reveal for Touch:** A revealed accessory shows through `[data-reveal-host=""]` and `revealTarget`/`revealDim`; the `(hover: none)` rule pins it shown at rest (`UIX/Interactions/hover-reveal.css.ts:5-14`, `:20-35`). `data-reveal-host="off"` is a dead host (`Button.tsx:141`), and a dragged host hides its reveals (`hover-reveal.css.ts:15`). A cell or card wearing the pen needs the host attribute on its own box; without one, a cell target answers to the row host and a card target to the View tile's.
- **Variable vs Derived Transition:** `--glass-outline` is unregistered, so the guideline's rule applies in its derived form: the transition sits on `border-color` and `box-shadow`.

#### Tensions

- **4 — What an Error Outline Would Guard:** Can't speak to the guard. UIX holds no validation: `invalid` is a caller predicate that only dims, the blur commits regardless, and `errorRing()` has no app consumer. The slice speaks to the paint — two channels at one tint step, with the glass outline's ease conditional on resize edges.
- **5 and 6:** Can't speak; neither is named anywhere at `32d3fa62c`, and the decision log's Constraints, Rejected, and Open Items are empty.
- **1 — Sort:** Untouched.
- **2 — Filters:** Touched lightly. A typed filter value uses the one-line `cellInput` (`filter-frame.css.ts:90-98`).
- **3 — Cascade, 7 — Native Menu, 8 — Non-String Adoption, 9 — Foreign Recognition:** Untouched.

#### Missing

- A bounded default/min/max pane size without resize edges; `PaneBounds` sizes only resizable axes, and a non-resizing pane's height isn't clamped to the room it opened into.
- A transition on the Shell's `border-color`/`box-shadow` for a pane without resize edges.
- An error writer for `--glass-outline`, and any error-tinted glass edge.
- An app consumer of `errorRing()`.
- A multi-line or contenteditable field primitive in UIX.
- A "clear" `InputField` chrome; `chrome` is `boxed` or `bordered`.
- A parameterized trailing accessory; `BrowseButton` hard-codes `folder-open`.
- `text-align-start` in the curated registry.
- Contenteditable in `useFocusScope`'s tab stops.
- A `text` kind in `PickTarget`.
- A confirm affordance in PickerMenu; commits are blur and Enter.

#### For Figma

- Which element wears the error — the pane edge or a field box — and its width (1px border + 1px inset vs a 2px ring).
- The TextPane's shell: `glass="window"` or a `solid` surface, and the 4px `s.surface` gutter vs a bare body.
- Default, minimum, and maximum dimensions, and the overflow behavior at the maximum.
- What "clear" means for the standard card field, against `boxed` (quaternary fill) and the chromeless `base`.
- The pen's resting state on cells and cards: always shown like `BrowseButton`, or revealed like the option row's pen.
- The Text type's default icon, given that `text-align-justify` is Title's.
