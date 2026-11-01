### Scout 1 — Rows & Captions

**DATE:** 10-27-2026
**SCOPE:** the row recipe, the secondary line's rename, `MenuCaption` → `MenuDesc`, `SettingsFieldRow`'s removal, the InfoButton's slot, and clickable rows (F-1 to F-5, A-3). Cleaned against *Info Buttons — Investigation*; no real row cites an entry, the examples sit on Label Format and Value Format, and `ManageRow` gains no `info`.

---

#### Findings

##### The Secondary Line: `hint` / `caption` / `subLabel` (F-3)

**`hint` (Settings) → `caption`:**

- `Core/Settings/frames.ts:76` — `RowText.hint?: string` (the interface at `:74-78`), with 63 `hint:` keys at lines 197 204 237 255 261 268 274 281 287 294 320 327 334 346 352 376 382 388 393 399 412 458 465 476 482 488 506 513 520 547 555 563 574 580 590 600 605 617 623 629 635 646 652 659 671 689 695 706 779 785 791 802 810 816 822 833 841 847 858 866 877 900 906.
- `Core/Settings/SettingsWindow.tsx:57` — `caption: row.hint` in `settingsRow` (`:54-59`).
- `Core/Settings/SettingsWindow.tsx:195`, `:197`, `:199`, `:201` — `hint={row.hint}` into the four special rows.
- `Core/Settings/AssetDirectoryRow.tsx:9`, `:12`, `:24`; `ClearActionRow.tsx:7`, `:11`, `:19`; `ExcludedDirectoriesRow.tsx:15`, `:18`, `:22`; `PreviewRulesRow.tsx:12`, `:15`, `:22`.
- `Core/Settings/SettingsFieldRow.tsx:7`, `:11`, `:16` — the file leaves (F-5).
- `Core/Settings/NexusRows.tsx:171`, `:208` — `hint=` on `SettingsFieldRow`, gone with F-5.
- `UIX/Menus/ManageRow.tsx:12`, `:20`, `:37` — the `hint` prop, mapped to `caption:`.
- **Tests:** `Core/Settings/ExclusionRows.test.tsx:30` (`hint="h"`) and `Core/Settings/PreviewRulesRow.test.tsx:42`.

**`caption` (the `MenuRow` field), already the target name:**

- `UIX/Menus/MenuIndex.tsx:32` — the field; `:145` translates it to `subLabel`.
- `Core/Settings/NexusRows.tsx:165`, `:231` — bare `caption:` rows, which stay.
- `UIX/Menus/MenuIndex.test.tsx:117` and `Core/Settings/NexusRows.test.tsx:130` — test titles that say "caption," which stay true.

**`subLabel` (the `MenuItem` prop and class) → `caption`:**

- `UIX/Menus/MenuRows.tsx:71` (type), `:96` (destructure), `:153` (render and `s.subLabel`).
- `UIX/Menus/menu-row.css.ts:205` — `export const subLabel`.
- **Direct `MenuItem` callers:** `Core/Interface/Windows/PageReaderWindow.tsx:227`, `:239`; `Core/MarkdownPM/Autocomplete/AutocompletePane.tsx:99`. The Studio's dashboard is a third (*4-Tooling & Docs*).

**Not in scope** — the same word, another meaning:

- `UIX/Fields/EditableInput.tsx:35`, `:55`, `:58` and `UIX/Pickers/FieldPicker.tsx:12`, `:21`, `:53` — a field's value affix, such as "/ 10"; after F-3 and F-4 it's UIX's only `hint`.
- `Core/Interface/Header/DetailTitleHeader.tsx:62` — the title-search reveal, named `hint`.
- `Core/Settings/NexusRows.tsx:20`, `:31` — `captionFor` and `syncCaption`, already caption-named.

##### `MenuCaption` → `MenuDesc` (F-4)

- **Definition:** `UIX/Menus/MenuRows.tsx:182-184`.
- **Style:** `UIX/Menus/menu-row.css.ts:234-237` (`caption`, which becomes `desc`).
- **Export:** `UIX/Menus/index.ts:4`.
- **Users** (import, then use): `Core/Interface/Toolbar/OutlineMenu.tsx:4`, `:92` ("No headings"); `Core/Properties/Schema/PropertyFrame.tsx:22`, `:99` ("No properties yet."); `Core/Views/Settings/FilterFrame.tsx:17`, `:520` ("Hand-authored filter — edited outside the pane."); `Core/Views/Settings/LocationField.tsx:9`, `:86` ("No Sets in this collection.").
- No test names the component; `.claude/Planning/Completed/Alias Management/…Results.md:1829` is a historical diff and stays.

##### The Landing Order

All of it can land as one commit; the order inside `menu-row.css.ts` and `MenuRows.tsx` keeps the two `caption` meanings from colliding.

1. **Free the Name:** rename the `caption` style (`menu-row.css.ts:234`) to `desc`, its use at `MenuRows.tsx:183`, and `MenuCaption` to `MenuDesc` with its export and four users.
2. **Take the Name for the Row:** rename the `subLabel` class (`menu-row.css.ts:205`) and prop (`MenuRows.tsx:71`, `:96`, `:153`) to `caption`, and update `MenuIndex.tsx:145`, `PageReaderWindow.tsx:227`, `:239`, and `AutocompletePane.tsx:99`.
3. **Settings:** rename `RowText.hint` and the 63 keys (a line-anchored `hint:` → `caption:` over `frames.ts` alone), `SettingsWindow.tsx:57`, `ManageRow`'s prop, the four special rows, and the two tests, merged with F-5.

Typecheck catches every miss in steps 2 and 3, since all of them are typed props, and step 1's class rename through the `s.*` namespace import. Biome may reflow a few `frames.ts` lines where `caption:` crosses the print width.

##### `SettingsFieldRow` Leaves (F-5)

**Definition:** `Core/Settings/SettingsFieldRow.tsx` (19 lines), `MenuRowView` of `{ kind: 'item', label, caption: hint, trailing: { kind: 'field', children } }`, duplicating `settingsRow`'s map.

**Its consumers and what each becomes:**

- **`AssetDirectoryRow`** (`:3`, `:24`, `:32`): takes `{ row }: { row: RowOf<'path'> }` and returns `<MenuRowView row={settingsRow(row, { kind: 'field', children: <PathField label={row.label} … /> })} />`.
- **`ClearActionRow`** (`:3`, `:19`, `:21`): takes `{ row }: { row: RowOf<'clear'> }`, reads `row.clear`, and returns `settingsRow(row, { kind: 'field', children: <Button … /> })`.
- **`NexusRows`** (`:11`, `:125`, `:141`, `:145`, `:171`, `:208`): its five uses become bare `MenuRowView` literals, the form the file already writes for its other rows. Its frame row `{ kind: 'nexus', label: 'Nexus' }` only supplies a React key (`SettingsWindow.tsx:156`).

**Rows that never used it but take their whole row under F-5:**

- **`ExcludedDirectoriesRow`** (`:13-26`) and **`PreviewRulesRow`** (`:10-34`): take `RowOf<'exclusions'>` and `RowOf<'previewRules'>` and pass `label={row.label} caption={row.caption}` to `ManageRow`. They don't go through `settingsRow`, since `ManageRow` builds its row in UIX (`UIX/Menus/ManageRow.tsx:32-64`); F-5's "built through `settingsRow` as the rest are" holds for the path and clear rows alone.

**`SettingsWindow.tsx:194-201`** becomes, uniformly with `:186-193` and `:202-205`:

```
case 'path': return <AssetDirectoryRow row={row} />
case 'exclusions': return <ExcludedDirectoriesRow row={row} />
case 'previewRules': return <PreviewRulesRow row={row} />
case 'clear': return <ClearActionRow row={row} />
```

**Tests that change with it:** `ExclusionRows.test.tsx:30` takes `row={{ kind: 'exclusions', label: 'Excluded Directories' }}` (the caption is unused by its assertions); `PreviewRulesRow.test.tsx:39-44` takes `row={{ kind: 'previewRules', label: 'Open In Preview', caption: '…' }}`. `ClearActionRow` and `AssetDirectoryRow` have no render tests; `ExclusionRows.test.tsx:198-205` reads `row.clear` off `FRAMES` and is unaffected.

**Imports:** `RowOf` comes from `./frames` (`frames.ts:136`, type-only). `frames.ts` imports `TrashFrame` but none of these rows (`frames.ts:1-46`). `settingsRow` is private to `SettingsWindow.tsx`, which imports these row files, so a row calling it needs it moved (*§Placement Candidates*).

##### The InfoButton's Slot (F-1)

**Today's title line** (`UIX/Menus/MenuRows.tsx:151-154`):

```
<span class=titleWrap(column flex, minWidth 0)>
  <span class="titleText over-scroll-cap scroll-fade-x over-scroll-ellipsis">{children}</span>
  {subLabel && <span class=subLabel/>}
</span>
```

- `over-scroll-cap` clips its own box (`min-width: 0; white-space: nowrap; overflow-x: hidden`, `UIX/Interactions/over-scroll.css:2-9`) and scrolls on hover (`:11-14`), so a glyph inside `titleText` would clip, scroll, and fade with the text.

**Where it lands:** one title-line wrapper inside `titleWrap`, `<span class=titleLine>{titleText}{info}</span>`, rendered only when `info` is set so every existing row's DOM stays as it is.

- `titleLine` is `display: flex; align-items: center; gap; min-width: 0`; `titleText` takes `flex: 0 1 auto` and keeps its cap; the glyph is a `flex: 0 0 auto` sibling, sitting right after short text and pinning to the line's end once a long title ellipsizes.
- `titleCentered` (chip rows) would need the line centered too; the conditional wrapper leaves chip rows untouched.
- `${titleWrap} + ${side}` (`menu-row.css.ts:277`) is unaffected, since the wrapper sits inside `titleWrap`; no selector reads `titleWrap > titleText`.
- **Precedent:** `.detail-title-slot-run` (`Core/Interface/Header/content-title.css:83`).
- With the glyph outside the cap, hovering a long title scrolls the text while the glyph stays pinned; a row wearing `.over-scroll-host` (`AutocompletePane.tsx:97`) scrolls its title when the glyph is hovered, which is harmless.

**The prop's path**, existing hops only:

- **`MenuItem`:** `MenuItemProps.info?: ReactNode` (`MenuRows.tsx:69-92`), the same shape as `leading` and `trailing`.
- **`MenuRow`:** an item-branch `info?: ReactNode` (`MenuIndex.tsx:28-38`), passed at `MenuIndex.tsx:142-152`.
- **`pickerRow`:** gains nothing. The examples spread `info` onto `pickerRow`'s result, which needs its return narrowed to `Extract<MenuRow, { kind: 'item' }>`: spreading the full union fails the excess-property check on the heading branch, and the narrowed return passes (checked with `tsc --strict` on a replica). The narrowing is truthful for `pickerRow` and `steppedRow` (`MenuIndex.tsx:54-87`).
- **`formatRows.ts`** (example-only): two call sites (`:30`, `:36`) through the local `row` helper (`:16-29`).
- **`RowText`:** gains nothing; no Settings row cites an entry, and the next one goes through `settingsRow`, the single map from `RowText` to `MenuRow`. Deriving `RowText` from the row recipe doesn't work as written: `MenuRow.label` is a `ReactNode`, while `RowText.label` is the string `SettingsWindow.tsx:156`, `:158` key on.

##### Clickable Rows (A-3)

`MenuItem` takes `role="button"`, a tab stop, and `onActivateClick` when `onClick` is set and the row is neither disabled nor inert (`MenuRows.tsx:123`, `:140-143`).

**Direct `MenuItem` users with `onClick`:** `Core/Interface/Menus/MenuPresenter.tsx:42`; `Core/Interface/Sidebar/Disclosure.tsx:161`; `Core/Interface/Sidebar/sidebarRows.tsx:56`; `Core/Interface/Windows/PageReaderWindow.tsx:225`, `:236`; `Core/MarkdownPM/Autocomplete/AliasList.tsx:139`; `Core/Navigation/NavList.tsx:107`; `Core/Properties/Pickers/PropertyPicker.tsx:127`, `:223`, `:326`; `Core/Properties/PropertyPanel.tsx:276`, `:333`; `Core/Properties/Schema/PropertyFrame.tsx:106`, `:260`; `Core/Settings/SettingsWindow.tsx:127`; `Core/Tiles/Surfaces/ViewTile.tsx:660`; `Core/Views/Settings/FilterFrame.tsx:294`, `:437`; `Core/Views/Settings/ViewFrame.tsx:158`, `:192`; `Core/Views/Settings/ViewItemMenu.tsx:39`, `:52`; `UIX/Menus/DisclosureRow.tsx:97`; `UIX/Menus/MenuRows.tsx:50` (`MenuTopRow`); `FootingItem`; `UIX/Pickers/CalendarPicker.tsx:270`, `:280`, `:510`.

**`MenuRow` items with `onSelect`** (rendered through `MenuIndex.tsx:149`): `Core/Matrix/MatrixMenu.tsx:63`, `Core/Views/Settings/LayoutFrame.tsx:266`, `Core/Views/Settings/SettingsFrame.tsx:115`.

**The example rows aren't clickable:** `formatRows` passes `inert: true` (`formatRows.ts:28`), so `act` is undefined and the row draws as `rowBox` with no role. A-3 matters for F-1's "any surface built on it."

**What a button inside a clickable row needs:**

- **Click:** a stop, as `AccessoryButton`'s `onClick` (`MenuRows.tsx:315-318`) and `ViewFrame.tsx:168-171`'s chevron do.
- **Keyboard:** the row's key handlers ignore the glyph (`UIX/Interactions/activate.ts:7`; `LineRow`'s at `UIX/Interactions/engine.tsx:1303`), but Enter or Space on a native `<button>` fires a `click` that bubbles to the row's `onClick`, so the click stop covers keyboard activation too.
- **Pane Clicks:** a click in the pane bubbles to the row through the portal (*2-Behavior · §Click Containment*).
- **Pointerdown in a Draggable `LineRow`:** `api.begin` (`engine.tsx:1034`) activates on movement, as for existing in-row buttons, so a click doesn't lift; rows with their own `onPointerDown` (`Disclosure.tsx:161`, `MenuTopRow`'s `keepFocus`) still receive the glyph's pointerdown, which is harmless for `keepFocus`.

---

#### Removal & Simplification

- **Delete `Core/Settings/SettingsFieldRow.tsx`** (19 lines), the second label-to-`MenuRow` map beside `settingsRow`.
- **Remove four `hint` props and destructures** (`AssetDirectoryRow`, `ClearActionRow`, `ExcludedDirectoriesRow`, `PreviewRulesRow`); each takes `row`, so the `SettingsWindow` switch stops splitting rows.
- **Three names become one**, so `MenuIndex.tsx:145` and `ManageRow.tsx:37` stop translating (the latter becoming shorthand).
- **`NexusRows`** ends with one row form instead of two.
- **Approximate delta** for F-3, F-4, and F-5: about −25 to −35 lines (the deleted file and the prop declarations), about +5 for the five `NexusRows` literals; the 63-key rename is line-neutral.

---

#### Placement Candidates

**`settingsRow`'s home**, needed once the path and clear rows call it:

- **`Core/Settings/frames.ts`, beside `RowText` (`:74-78`):** it owns `RowText`, already isn't pure data (it imports `TrashFrame`), and needs only type imports from `@pommora/uix/Menus`; the map then lives with the text it maps.
- **Stay in `Core/Settings/SettingsWindow.tsx:54`,** with the path and clear rows reduced to trailing controls the switch wraps; it contradicts F-5's "take their whole row."
- **A new `Core/Settings/settingsRow.ts`:** a file for a five-line function.

**The title-line class:** `UIX/Menus/menu-row.css.ts`, beside `titleWrap` and `titleText` (`:190-201`).

---

#### What Becomes False

**Code:**

- `Core/Settings/SettingsFieldRow.tsx:4` — the docstring leaves with the file.
- `ExclusionRows.test.tsx:30` and `PreviewRulesRow.test.tsx:42` stop compiling until they pass a row.

**Feature docs:**

- `.claude/Features/PommoraUIX.md:361` (the Menu row): "`MenuCaption`" → `MenuDesc`; the stacking order "…separator, caption, footing" → "…separator, desc, footing"; "`MenuItem` carries `leading` · title · `subLabel` · `detail`…" → "· title · `caption` · …", plus the info slot.
- `.claude/Features/PommoraUIX.md:199` — "row sub-label → Caption" → "row caption → Caption."
- `.claude/Features/PommoraUIX.md:195` (`text.caption`, "The secondary line under a title") stays true.
- `.claude/Features/ConfigurationPM.md:20` — "This Device, … whose hint is the first twelve characters of the device fingerprint" is already false: the This Device row (`NexusRows.tsx:125`) carries no caption, and the fingerprint is each device row's caption (`:231`). "A Sync row whose hint reports…" → caption.
- `.claude/Features/ConfigurationPM.md:22` — "The Sync row's hint follows…" → caption.

**Issues:**

- `.claude/IssuesPM.md:98`, `:1142`, `:1150`, `:1154` (I-061) — "a row's hint" → caption. Its substance (a caption widens a content-sized pane, so the format rows carry none) stands, since captions stay (F-2) and the format rows ship no InfoButton.
- `.claude/IssuesPM.md:1439` (`[^61]`) — "`MenuItem`'s hint" at `MenuRows.tsx:153`, "(`subLabel`)" at `menu-row.css.ts:205`, and `settingsRow` at `SettingsWindow.tsx:47-52`, already stale (it's `:54-59`).
- `.claude/IssuesPM.md:79`, `:996`, `:1004`, `:1008`, `:1457` (I-079) — a Settings row's "hint" → caption.

**No hits:** `.claude/Guidelines/*.md`, `.claude/PommoraPRD.md`, `ContextPM.md`, `FrameworkPM.md`, and `HandoffPM.md` name none of `hint` (in this sense), `subLabel`, `MenuCaption`, or `SettingsFieldRow`. `InterfacePM.md:8` and `ViewTypesPM.md:75` (the title-search hint) and `PropertiesPM.md:64` and `PommoraUIX.md:288` (the field affix) are other meanings.
