**Re-grounded:** 10-07-2026 at `32d3fa62c`

### D — Assignment Surfaces

The value-assignment surfaces are the Properties panel, the PropertyPicker and its chooser drill-in, the native **Properties ▸** menu, the shared `valueClick` intent table, and the Property Frame's create path and per-type editor frames. Each is traced below for Number and Link (and Date where the menu is concerned), followed by what a `text` type would reuse unchanged and what it would need.

#### Task 1: The Panel

One component, `PropertyPanel` (`Core/Properties/PropertyPanel.tsx:76`), is the body of all three hosts: the page settings dropdown (`Core/Pages/PageMenu.tsx:92`), the Space settings dropdown (`Core/Contexts/SpaceMenu.tsx:103`), and the page window's SidePane (`Core/Interface/Windows/WindowTabBody.tsx:215`). A page reads its Collection's schema and a Space reads the whole registry (`PropertyPanel.tsx:152-155`); after that the two subjects share every path below, including the commit, which goes through `assignValue` with no per-type branch (`PropertyPanel.tsx:188-190`, `Core/Properties/assignValue.ts:31-40`).

##### Empty, Edit, Commit

| Step | Number | Link | Where |
| --- | --- | --- | --- |
| Empty at rest | `Cell` returns the `empty` prop for a blank value, rendered as `EmptyValue` (an em dash) | same | `PropertyPanel.tsx:391-399`, `Cells/Cell.tsx:66`, `UIX/Elements/EmptyValue.tsx:5` |
| Click | the value span calls `editRow`, which runs `valueClickIntent(def.type, current)` with no look or config | same | `PropertyPanel.tsx:381`, `:289-297` |
| Intent | `edit` (no look is passed, and `barDivisor` returns a divisor only for the `bar` look, so the panel never reaches `numberPicker`) | `edit` when empty or a non-URL, non-page string; `open` for a valid address; `null` for a page connection | `valueClick.ts:43-50`, `formatValue.ts:230-231` |
| Enter editing | `edit` sets `editing = { mode: 'editor' }` | same | `PropertyPanel.tsx:276`, `:282` |
| Field | the row swaps `Cell` for `PropertyValueInput` inline, an `EditableInput` with `fillInput` | same, tinted with `link_color` | `PropertyPanel.tsx:383-389`, `Pickers/PropertyValueInput.tsx:59-69` |
| Commit | blur (Enter blurs) → `parseEditorValue` → `commit(id, next)`; `undefined` refuses, `null` clears | same; a filled URL's edit comes from the right-click **Edit** (`editLink`) | `PropertyValueInput.tsx:39-46`, `parseEditorValue.ts:13-31`, `PropertyPanel.tsx:310-324` |

A chooser pick in the panel reveals the row and then runs the same `editRow` on the revealed value span a frame later (`PropertyPanel.tsx:325-336`), so adding a Number or Link from the panel's `+` lands in the same inline field.

##### What a Text Row Reuses and Needs

The panel itself has no per-type code on the `edit` path. `renderRow`, `runIntent`, the inline `PropertyValueInput` slot, `rowMenu` (**Clear** · **Remove**), the Space host, and the commit are all type-agnostic (`PropertyPanel.tsx:270-309`, `:359-412`). `panelTarget` only branches for `picker` mode (`:339-355`), which an `edit` intent never enters. `valueMenu` intercepts only File and Link (`:310-324`), so a Text value's right-click falls through to the row's **Clear** · **Remove** menu.

What a Text row needs lives outside the panel:

- **`valueClickIntent` arm** — returning `edit` (Task 5).
- **`editorText` and `parseEditorValue` arms** — both fall through for an unknown type: `editorText` returns `''` (`parseEditorValue.ts:7-11`), so a filled Text would open blank, and `parseEditorValue` returns `undefined` (`:30`), so every commit would be refused as invalid.
- **`Cell` arm** — `Cell` switches on the value's kind with no default (`Cells/Cell.tsx:70-162`); a new `ValueKind` has no render until an arm is added.

##### Long Values and Single-Line Assumptions

- **At Rest:** Number, Link, and Date render inside `OverScroll` with `cell-text-scroll` (`Cell.tsx:129`, `:142`, `Cells/LinkCell.tsx:40`). `.over-scroll-cap` is `white-space: nowrap`, horizontally clipped, and scrolls on hover (`UIX/Interactions/over-scroll.css:2-15`); `.cell-text-scroll` caps at `max-width: 100%` (`UIX/Table/table.css:189-193`). A long value is one clipped line.
- **Panel Width:** the dropdown frame grows to content up to 350px (`property-panel.css.ts:9-16`). The value span is `flex: 0 1 auto; min-width: 0` (`:46-53`) and the trailing side is made shrinkable (`:55`); the 55% trailing cap in `menu-row.css.ts:267` applies only to rows with a `detail`, which panel rows don't use. A long value therefore competes with the property name for width rather than being capped.
- **Editing:** `EditableInput` is a single-line `<input>` (`UIX/Fields/EditableInput.tsx:49`); Enter commits (`:80-83`), and blur commits `value.trim()` (`:94-103`). `PropertyValueInput` skips the commit only when the trimmed text equals the untrimmed `initial` (`PropertyValueInput.tsx:38`, `:44`). For a Text value holding edge whitespace or a newline — a hand-edited or foreign value — opening the field and blurring with no edit rewrites it trimmed, and an `<input>` drops line breaks from its value. Number and Link avoid this because `editorText` produces their canonical form.

#### Task 2: The Picker and Its Drill-In

`PropertyPicker` (`Pickers/PropertyPicker.tsx:95`) renders inside one `PickerMenu` (`:185-226`). Its pane is chosen by `PickTarget.kind`, a three-arm union (`:41-49`):

| `PickTarget.kind` | Pane | Where |
| --- | --- | --- |
| `options` | `PropertyOptionRows` (editable rows, drag, New Option for Select and Multi-Select) | `:127-140`, `:230-256`, `:318-339` |
| `dateTime` | `DateTimeValuePicker` → `CalendarPicker` | `:141-147`, `DateTimeValuePicker.tsx:7-33` |
| `file` | `PathField` | `:148-165` |

There is no text-field arm. Number and Link never reach `PropertyPicker`; they use `PropertyValueInput` directly, as an inline `EditableInput` or as a `TextPicker` popover, with `NumberValuePicker` for the popover look of a Number (`PropertyValueInput.tsx:27-58`, `NumberValuePicker.tsx:24-38`). The view host's `pickTarget` falls through to `options` for every type that isn't a user Date or a File (`Core/Views/Host/useViewHost.ts:200-223`), so a Number, Link, or Text handed to it reads as an empty option list.

##### The Chooser and the Drill-In

With `chooser` set, the picker shows `PickEntry` rows inside a `FrameSlide` (`PropertyPicker.tsx:193-222`). An entry with `drillable` slides to the detail slot (`:173`), whose top row is `MenuTopRow` with the label `picked.group ?? 'Properties'`, the entry's name as `current`, and a back action (`:212-217`). `MenuTopRow` renders a chevron-left, the label, and the current name right-aligned with an ellipsis (`UIX/Menus/MenuRows.tsx:41-78`); it blocks pointer-down so a commit-on-blur pane beneath doesn't commit before Back lands (`:70-71`). The detail's pane is the same `pane` computed from `resolveTarget(picked)` (`PropertyPicker.tsx:122`, `:218`). `FrameSlide` (`UIX/Menus/FrameSlide.tsx:10-104`) is content-agnostic: two measured slots and a translate.

Only one surface drills. Cards marks an entry `drillable` when it isn't reveal-only and `pickKindOf(type) !== null` — Select, Multi-Select, Status, and Context (`Core/Views/Cards/CardsView.tsx:507`, `properties.ts:77-92`). Every other entry that fills a blank (Number, Link, Date, File) hands back through `onReveal`, which closes the chooser and opens a separate value picker at the same card anchor: a `popover` (`TextPicker`) for Number and Link, the calendar or file field for Date and File (`CardsView.tsx:518-531`, `Cards/cardValueInput.ts:17-21`, `:66`). The panel's chooser marks every entry `revealOnly: true, drillable: false` (`PropertyPanel.tsx:214`), shows no chevron (`PropertyPicker.tsx:171`), and reveals the row and edits it inline (Task 1).

##### Number and Link in the Detail Pane

Neither reaches the detail pane today. "An input either empty or filled with the current value" is close to what Number and Link already show — a `TextPicker` popover seeded by `editorText(current)` from the Cards chooser, or an inline field seeded the same way in the panel — but it appears in place of the chooser, not under a `< Properties  Name` top row. A Text detail pane would be new behavior on three counts: a fourth `PickTarget` arm with a text-field pane, a `pickTarget` branch returning it, and a `drillable` predicate wider than `pickKindOf`. Number and Link would then follow a different flow from Text in the same chooser unless they moved with it.

#### Task 3: The Native Menu

##### Rows

`propertyMenuBranches` (`Core/Interface/Menus/propertyMenuActions.ts:38-75`) builds the rows; `propertyBranchRows` and `propertyRow` (`Core/Actions/propertyRows.ts:19-50`) turn them into menu items. Stamps are skipped by keeping only `origin === 'user'` definitions (`propertyMenuActions.ts:68-70`). Checkbox gets **Check** · **Uncheck** options (`:46-54`); any type whose `pickKindOf` is `null` returns a bare row with no `options` (`:55`); option kinds and Contexts get their option runs (`:56-66`). Rows with options sort before leaves (`:73`). A row without `options` becomes a leaf with action `prop:<id>`; with options, a submenu of `prop:<id>:<value>` (`propertyRows.ts:19-33`). Pages carry the branches through `pageMetaMenuItems` (`Core/Actions/pageMenu.ts:116-123`), shared by cards (`Core/Actions/cardMenu.ts:17-22`), view title cells (`Core/Actions/cellMenu.ts:100-106`), and entity menus (`Core/Actions/entityMenu.ts:42-50`); Spaces carry them in the entity menu's identity group (`entityMenu.ts:81-89`).

##### The Leaf Handler

`parsePropertyAction` (`propertyRows.ts:52-59`) has one consumer, `runPropertyAction` (`propertyMenuActions.ts:77-112`), called from `showEntityMenu` for sidebar rows, Spaces, and Matrix nodes (`Core/Interface/Menus/entityMenuActions.ts:72-75`) and from `runTitleAction` for view title cells and cards (`Core/Views/Host/useViewInteractions.tsx:415-427`). A leaf parses to `value: null`; File opens the dialog, and every other type calls `requestPick({ def, current, trigger, commit, style })` (`propertyMenuActions.ts:100-106`). The request lands in the session's `pendingPick` (`Core/Session/chromeSlice.ts:16-22`, `:73`), and `ValuePickPresenter`, mounted once in the app (`Core/Interface/App.tsx:197`), renders it anchored to `trigger` — the element the menu was opened from, not the menu row (`Core/Interface/Menus/ValuePickPresenter.tsx:9-46`):

| Type | Presenter Branch | Result |
| --- | --- | --- |
| Date | `def.type === 'dateTime'` | `PropertyPicker` with a `dateTime` target (`ValuePickPresenter.tsx:18-36`) |
| Number | fallthrough → `PropertyValueInput` popover | `NumberValuePicker` (`PropertyValueInput.tsx:27-36`) |
| Link | fallthrough → `PropertyValueInput` popover | `TextPicker` tinted with `link_color`, editing the address (no alias) (`PropertyValueInput.tsx:47-58`) |

A menu opened without a trigger carries no property branches at all (`entityMenuActions.ts:55-65`).

##### Text as a Leaf

Text-as-leaf reuses the whole chain unchanged. `pickKindOf('text')` returning `null` makes it a leaf at `propertyMenuActions.ts:55`, `runPropertyAction` sends it to `requestPick`, and the presenter's fallthrough renders it as a `TextPicker` popover. The only additions are the `editorText` and `parseEditorValue` arms already required by Task 1.

##### Muted Rows

The menu model carries `disabled` on every row (`Core/Actions/menuModel.ts:3-8`, validated at `:79`). The native renderer maps it to `enabled: false` (`Desktop/Actions/menu.ts:24`), and the in-app presenter carries it through `menuRows` (`Core/Interface/Menus/menuRows.ts:8`); `popMenu` chooses between them (`Core/Actions/menuActions.ts:12`). Precedents: **Open** on the active tab (`Core/Actions/tabMenu.ts:51`), **Preview** while the Matrix window stands (`:54-58`), **Duplicate** and **Delete** on view rows (`Core/Actions/viewRowMenu.ts:19-25`), and destination rows (`pageMenu.ts:42-52`). Each marks an action unavailable in the current state; none marks a type the menu doesn't support. A muted Text row would need a `disabled` field on `PropertyMenuRow` (`propertyRows.ts:9-13`), its pass-through in `propertyRow` (`:19-20`), and `build` setting it for Text (`propertyMenuActions.ts:43-67`). The leaf is the path with no new code in the menu layer; the muted row is the one that adds code.

#### Task 4: Create and Per-Type Settings

##### Create

The frame's footer `+` opens the type list (`Schema/PropertyFrame.tsx:441-450`), which renders `CREATABLE_TYPES` — every `PROPERTY_TYPES` entry with `origin === 'user'`, in declaration order (`Cells/PropertyTypes.tsx:43-45`, `PropertyFrame.tsx:303-317`). A pick calls `schema:add` with the name `New <Type>` (`PropertyFrame.tsx:230-237`); the handler creates and assigns (`Core/Properties/handlers.ts:137-150`), and `createProperty` runs `seeded`, which fills options only for a type whose spec names `options` and is a no-op otherwise (`Core/Properties/registryProperty.ts:33-44`, `:57`). A `text` entry in `PROPERTY_TYPES` with `origin: 'user'` joins the list and creates with no seed; its position in the list follows its position in `PROPERTY_TYPES` (`properties.ts:33-45`).

##### Default Icons

A definition stores an icon only when the user picks one (`properties.ts:170`, `Core/Properties/handlers.ts:169`); otherwise `propertyIcon` falls back to the type glyph in `TYPE_META` (`PropertyTypes.tsx:21-41`). `TYPE_META` is typed `IconName`, which is `keyof typeof icons` — the curated registry (`UIX/Symbols/index.tsx:99-186`). `text-align-start` is in the generated full-Lucide roster (`UIX/Symbols/iconNames.ts:1530`) and passes `asRenderableIcon` for a user-picked icon (`index.tsx:191-194`), but it isn't in the curated registry, so naming it in `TYPE_META` is a type error until `TextAlignStart` is imported (`index.tsx:76-81`) and registered (`:99-184`). The curated text-shaped glyphs are `type` (`index.tsx:150`, already used at `Core/Views/Settings/GroupFrame.tsx:210`), `wrap-text` (`:159`), and `text-align-justify` (`:174`), which is Title's glyph (`PropertyTypes.tsx:22`).

##### Per-Type Editor Frames

The editor frame is chosen by `SETTINGS[def.type]`, a `Record<PropertyType, …>` (`PropertyFrame.tsx:332-385`), so a new type is a compile error until it has an arm. Every frame shares the `⋮` top row (Remove, Delete), the `InlineEditHeader` for icon and title, and a separator, all outside `SETTINGS` (`:417-437`); the Style footing appears only for option types (`:399-416`). The minimal frame already exists: `NO_SETTINGS`, an 8px spacer (`:319`), used by Context and the two stamps (`:381-384`). A Text frame holding only icon and title is `text: NO_SETTINGS`.

#### Task 5: valueClick

`valueClickIntent` switches on `specOf(type).kind` with no default (`Pickers/valueClick.ts:22-52`), so a new `ValueKind` is a compile error until it has an arm. Following the Number and Link precedent, a Text value — empty or filled — returns `{ kind: 'edit' }`. Link opens a valid address and leaves a page connection to its own text (`:45-50`); a Text value holding a `[[Page]]` string would edit rather than open unless the arm reads it.

| Surface | `edit` Handler | Declines | Where |
| --- | --- | --- | --- |
| Properties panel | inline `PropertyValueInput` in the row | `numberPicker`, `hide` | `PropertyPanel.tsx:277-287` |
| Cards | `setEditing(true)` → inline `PropertyValueInput` on the card | none | `Views/Cards/CardValue.tsx:84-96`, `:145-151` |
| Table | `editing` mode `editor` → inline `PropertyValueInput` in the cell | `hide` | `Views/Table/TableView.tsx:141-157`, `:214-223` |

No surface declines `edit`. Right-click is separate: `valueMenuIntent` maps only `editLink` to `edit` (`valueClick.ts:54-62`), and `baseCellMenu` is an exhaustive switch whose only **Edit** row is Link's (`Core/Actions/cellMenu.ts:55-84`, `:113-122`). A Text cell or card value needs a `baseCellMenu` arm; the panel's right-click falls to **Clear** · **Remove** (Task 1).

#### Compile-Time Arms

Adding `text` to the type ids and, if it gets its own value shape, to `ValueKind` forces these arms by type error:

| Site | Shape | Where |
| --- | --- | --- |
| `PROPERTY_TYPES` | `Record<PropertyType, TypeSpec>` | `properties.ts:33` |
| `TYPE_META` | `Record<PropertyType \| 'title', …>` | `PropertyTypes.tsx:21` |
| `SETTINGS` | `Record<PropertyType, …>` | `PropertyFrame.tsx:333` |
| `pickKindOf` | switch on `ValueKind` | `properties.ts:77-92` |
| `valueClickIntent` | switch on `ValueKind` | `valueClick.ts:30-51` |
| `baseCellMenu` | switch on `ValueKind` | `cellMenu.ts:64-84` |
| `Cell` | switch on the value's kind | `Cell.tsx:70-162` |

`editorText` and `parseEditorValue` aren't on the list: they fall through silently (`parseEditorValue.ts:10`, `:30`), so their missing arms surface as a blank field and a refused commit rather than a type error.

#### Tensions

- **7 (Native Menu):** Confirmed: a muted row is the odd one out, and the leaf is the reuse path. The leaf, `runPropertyAction`, `requestPick`, and `ValuePickPresenter`'s fallthrough to a `TextPicker` popover all apply unchanged, needing only the parse and seed arms every other surface also needs. A muted row has model and renderer support (`disabled`) but no precedent for marking a type as unsupported, and needs a new `PropertyMenuRow` field. Text would be the odd one out only if muted.
- **5 (Single/Multi-Line):** Confirmed as a break. At rest every text-shaped cell is one `nowrap` line with hover scroll; the edit field is a single-line `<input>` that commits trimmed text on blur, so a stored value with a newline or edge whitespace is rewritten by opening and leaving the field.
- **8 (Non-String Adoption):** Touched. The same blur path writes back whatever `editorText` produced; a Text arm that stringifies a foreign non-string scalar (a YAML number or boolean) would re-type it on the first open-and-blur. Decoding itself belongs to another slice.
- **4 (Validation):** Touched. Nothing in the assignment surfaces validates beyond `parseEditorValue`'s `undefined`; a Text arm that never refuses leaves `invalid` inert, and an empty field clears the key (`null`).
- **6 (Table Glyph):** Touched only through `TYPE_META`; the default glyph is one entry shared by every surface, and `text-align-start` needs registering.
- **1, 2, 3, 9:** Can't speak; sort, filters, cascade, and foreign recognition sit outside these surfaces.

#### Missing

- A `PickTarget` arm and pane for a text field (`PropertyPicker.tsx:41-49`, `:127-165`); `pickTarget` returns `options` for non-option, non-Date, non-File types (`useViewHost.ts:215-222`).
- A drill-in for any non-option type: Cards drills only `pickKindOf` kinds (`CardsView.tsx:507`), and the panel never drills (`PropertyPanel.tsx:214`).
- `text` arms in `editorText` and `parseEditorValue` (`parseEditorValue.ts:7-31`).
- A `disabled` field on `PropertyMenuRow` and its pass-through, if Text is muted (`propertyRows.ts:9-20`).
- `TextAlignStart` in the curated icon registry (`UIX/Symbols/index.tsx:99-184`).
- A right-click **Edit** for any type other than Link (`cellMenu.ts:113-122`, `valueClick.ts:54-59`).
- A trim-stable, newline-preserving edit path: `EditableInput` trims and is single-line (`EditableInput.tsx:49`, `:97`).

#### For Figma

- **Long Values in the Panel:** a long Text value shares the row with the property name and has no width cap of its own (`property-panel.css.ts:46-55`); whether the value or the name gives way.
- **Inline Field Width:** the inline `EditableInput` sits in a shrink-to-fit span, so its width follows the input's intrinsic size rather than the row.
- **Default Glyph:** `text-align-start` beside Title's `text-align-justify` in the same panels and frames, against `type`.
- **Type List Position:** where Text sits in the `+` type list, which follows `PROPERTY_TYPES` order.
- **Drill-In vs Popover:** whether Text's value entry from the Cards chooser is a detail pane under `< Properties  Name` or the same popover Number and Link open.
