### Views Cleanup — Fresh-Eyes Read

**DATE:** 11-07-2026
**READ AT:** `cae07c129`
**SOURCES:** *Views Cleanup — Decisions & Intention* and the code. No other planning file, Issues entry, or Feature document was opened.

#### Verified

The *§Context* figures hold: 69 non-test TS/TSX/CSS files in `Core/Views` total 9,801 lines; a kind is spread across `VIEW_KINDS` (`Core/Views/views.ts:24-31`), `VIEW_RENDERERS` (`Core/Views/Host/ViewHost.tsx:11-14`), and `LAYOUT_OPTIONS` (`Core/Views/Settings/LayoutFrame.tsx:52-64`); the Table fallback is written at `ViewHost.tsx:19` and `LayoutFrame.tsx:130`; unbuilt tiles no-op at `LayoutFrame.tsx:185`; `useViewHost` returns 42 fields (`Core/Views/Host/useViewHost.ts:212-255`); Table and Cards each hold a rename path, a ghost splice, and a `useStableApi` record. `views.ts` is host-reachable (the engine graph from `Core/Contract/serve.ts` reaches it through `Core/Nexus/*`), so B-1's reason for keeping React out of it is real. Status is a select-kind (`Core/Properties/properties.ts:44`), so "Select and Status" in *§Concepts* and E-3 resolve through one path.

#### Code Contradicts the Document

- **B-2:** the host has no rename slot to replace; the slot is in the interactions and creation layers (Question 1).
- **C-4:** the setting already reaches the Grouping pane, through a second mechanism (Question 17).
- **C-5:** the two trees differ in far more than what a row does (Question 18).
- **D-1:** a third rename pattern already exists in four places (Question 8).
- **F-5:** duplicate and delete differ between main pane and tiles in more than the switch to the copy (Question 23).
- **G-3:** the reader the clause names doesn't exist, since `Properties/columnStyles.ts` never references `ResolvedColumn`. A type import from `viewRow.ts` wouldn't break the engine graph either, so the move's actual reason would be the Properties-to-Views boundary, which the document doesn't state (Question 29).
- ***§Context*:** "one line-row engine" serves the Grouping pane's tree (`Core/Views/Settings/GroupFrame.tsx:446-460`) but not the Location tree, which has no `LineRow` (`Core/Views/Settings/LocationField.tsx:39-85`).

#### Questions

1. **B-2 cites "the rename state C-1 gives it" — is D-1 meant, and which slot does it replace?**
   **Found:** C-1 covers disclosure only; the rename state is D-1's. `useViewHost`'s return has no rename field (`useViewHost.ts:212-255`). The slot lives in the interaction policy (`Core/Views/Host/useViewInteractions.tsx:45`) and the creation config (`Core/Views/Host/useViewCreation.ts:51`, fired at `:158`).
   **Why It Matters:** An executor following B-2 literally finds nothing on the host to replace.

2. **Which sense of "host" does each decision mean, and what is "window-side"?**
   **Found:** "Host-side" in B-1 and G-3 means the engine half reached from `serve.ts`; *View Host* in *§Concepts* is window-side React (`useViewHost.ts:42`). The code adds `useContentHost`, `RenameHost` (`Core/Session/editSlice.ts:8`), and `SeatHost` (`useViewHost.ts:36`). "Window-side" isn't defined anywhere in the document.
   **Why It Matters:** "`VIEW_KINDS` should stay the host-side registry" reads naturally as "the View Host's registry", the opposite of what B-1 means.

3. **B-1: why does `nests` stay host-side when nothing host-side reads it?**
   **Found:** Host code reads `VIEW_KINDS` for label and icon only (`views.ts:169`, `:392`, `:401`). Every `nests` read is window-side: `ViewHost.tsx:23`, `GroupFrame.tsx:142`, `Core/Views/Settings/SortFrame.tsx:89`. The pipeline takes `nests` as a parameter (`group.ts:384-403`). Once the presented kind resolves an unbuilt view to Table, the four unbuilt `nests` values (`views.ts:27-30`) have no reader.
   **Why It Matters:** Keeping `nests` host-side splits one kind's definition across two records with no host consumer, and leaves unread data in the registry.

4. **B-1: what does the type grid do with unbuilt kinds, and which tile shows as selected?**
   **Found:** The grid lists all six kinds (`LayoutFrame.tsx:179-189`); unbuilt tiles silently do nothing (`:185`); selection matches the saved type (`:183`), so a saved List view highlights List while it draws as Table.
   **Why It Matters:** B-1 routes seat, settings, and `nests` through the presented kind but says nothing about the grid. A silent no-op tile is an odd-one-out the principles target.

5. **B-1: is `GroupFrame`'s hardcoded `nests: true` one of "every `nests` read"?**
   **Found:** The Grouping pane's tree passes `nests: true` to `bandSpec` regardless of kind (`GroupFrame.tsx:472`), while the same pane reads the kind's flag at `:142`.
   **Why It Matters:** Either the lookup replaces it, or the pane tree always nesting is stated where it sits.

6. **B-1: does each kind's record carry its own Layout rows, or keep flags that `LayoutFrame` interprets?**
   **Found:** `LayoutOptions` is `switches`, `cardRows: boolean`, and `leaf` (`LayoutFrame.tsx:36-40`); the Cards rows themselves are built inline in `LayoutFrame` behind the flag (`:137-175`).
   **Why It Matters:** "Layout options beside the renderer" can mean moving the Cards rows into `Cards/` or keeping a flag record; each changes what adding a kind requires.

7. **D-1: how does a rename state "keyed by the row's ID" with a create-open reuse `PageNameRename`, which is path-keyed and has no create flag?**
   **Found:** `PageNameRename` is `{ path, editing, onBegin?, onEnd }` (`Core/Interface/RenamableTitle.tsx:63-68`). `RenamablePageName` fixes `renames="row"`, `titleInput`, and `autoSize` (`:79-85`) and commits through `submitRename` (`:88`), which takes `fromCreate` from the fence's `renamingCreate` and clears fence state on every submit (`editSlice.ts:109-111`). The Table's title needs `renames="title"`, `fillInput`, `emptyInitial`, a children render, and `fromCreate` (`Core/Views/Table/TableView.tsx:112-138`).
   **Why It Matters:** Once views leave the fence, a view-created page loses `fromCreate` on commit unless the shape grows. "Reusing" may mean the interface only or the component as well.

8. **D-1: "rather than adding a third" — which two exist, and which local renames does D-1 absorb?**
   **Found:** Three patterns exist today: the fence (`RenamableTitle`), surface-held (`Core/Navigation/TabItem.tsx:106`, `Core/Interface/Windows/PageWindow.tsx:63`), and a raw `RenamableLabel` with local `useState` (`TableView.tsx:73`, `:117`; `Core/Interface/Header/DetailTitleHeader.tsx:60`, `:118`; `Core/Views/Settings/ViewFrame.tsx:177`; `Core/Tiles/Surfaces/ViewTile.tsx:489`).
   **Why It Matters:** The count decides what's removed. The view-name renames in `ViewFrame` and `ViewTile` are local-state renames the document doesn't mention.

9. **D-1: what does the `'detail'` fence host become, and who claims a page created from a Set band's menu?**
   **Found:** After Cards leaves (`Core/Views/Cards/CardsView.tsx:161`, `:840`), `'detail'` is held by the Set band title (`Core/Views/Bands/GroupBand.tsx:242-249`) and the Set band menu (`:167-172`), whose creates rename through `createNamed(req, 'detail')` (`Core/Interface/Menus/entityMenuActions.ts:158-161`; `Core/Actions/createActions.ts:52-58`). In a Table today nothing claims that page on `'detail'`: the sidebar wins by rank if the Set is open there (`editSlice.ts:41`, `:53-61`), otherwise the orphan sweep cancels it after 2 seconds (`:101-106`).
   **Why It Matters:** "The fence's surface names follow what remains" names nothing, and the band-menu page needs D-2's route or it keeps falling through.

10. **D-2: does a Set band menu's New Page move onto the view's creation, or only onto its naming?**
    **Found:** The band's button runs `bandAdd`: seeds, a manual-order write, and a glide (`useViewCreation.ts:141-186`). The band's menu runs the generic `createNamed`: placement by setting, no seeds, no view order, rename after the reply (`entityMenuActions.ts:158-161`; `createActions.ts:52-58`). Both create a page in the same Set.
    **Why It Matters:** "Under the ID minted at the gesture" needs the ID before the mutate, which `createNamed` mints internally. Two creation paths for one gesture is a One Way case; fixing it means `GroupBand` hands `showEntityMenu` a create override, as `showPageMenu` already takes (`entityMenuActions.ts:89`).

11. **D-2: how does a rename opened before its row exists survive the Table's stranded-edit clear?**
    **Found:** `TableView.tsx:74-77` clears the rename as soon as its `rowId` is absent from `rowById`. Cards holds a `pendingSeat` until the row paints (`CardsView.tsx:145`, `:278-285`). The fence uses a 2-second orphan beat (`editSlice.ts:38-39`, `:101-106`). A refused create "leaves an id no row paints" (`useViewCreation.ts:140`).
    **Why It Matters:** A gesture-time key is absent from `rowById` until the push lands, so today's clear cancels it immediately. The state needs to tell "not yet arrived" from "gone" and settle a refused create.

12. **C-1: does "one open-or-collapsed state" mean one hook shape or one store?**
    **Found:** Four owners with different persistence and semantics: a device pref through `useFold` (`Core/Session/store.ts:71-81`; `Core/Interface/Sidebar/Disclosure.tsx:65`); the sidecar's `collapsed_groups`, a view-state key (`views.ts:113`; `useViewHost.ts:58`, `:145-151`); ephemeral exceptions-to-default in `useDisclosureSet` (`UIX/Menus/DisclosureRow.tsx:10-24`); and the bundle browser's open map, which also holds loaded children (`Core/Bundles/browser.ts:50-59`).
    **Why It Matters:** One store would move synced or persisted state, against A-4 and the sync constraint. One interface over four stores is feasible; the document should say which.

13. **C-1 and C-3: which chevron control becomes the one, and what happens to the Trash and Archive table's?**
    **Found:** `DropOutline` is wrapped three ways: a `<button>` (`GroupBand.tsx:178-185`), its own `onToggle` (`Disclosure.tsx:177`; `DisclosureRow.tsx:105`), and an inert glyph in a span (`Core/Bundles/BundleTable.tsx:256`, `:288`). The bundle table also puts the chevron before the title below the top level and after it at the top (`:288` vs `:295`).
    **Why It Matters:** C-3 picks the sidebar's pattern for bands but doesn't cover the bundle table, and the side flip reads as an odd-one-out unless it's intended.

14. **C-2: which indent implementation survives, and where does it live?**
    **Found:** One 14px step (`UIX/Theme/theme-vars.css.ts:36`) is implemented twice: CSS `rowIndent` through `--row-indent` (`UIX/Table/rowIndent.ts:2`; `UIX/Table/table-tokens.css:8`), used by the Table and the bundle table; and JS `rowLead`, 8 plus 14 per level (`UIX/Menus/MenuRows.tsx:13-16`), used only by the sidebar through `MenuItem`'s `indent` (`Disclosure.tsx:166`; `Core/Interface/Sidebar/sidebarRows.tsx:61`) and by `menuDropLine` (`MenuRows.tsx:18-27`; `GroupFrame.tsx:474`). The Table adds `--loose-inset` for tail rows (`TableView.tsx:212-213`, `:229`).
    **Why It Matters:** Consolidating crosses `UIX/Table` and `UIX/Menus` and needs a placement ruling. The document also doesn't say whether the 8px base and the loose inset stay distinct leads.

15. **C-2 and *§Rejections*: "rail" names two unrelated things — which one is meant where?**
    **Found:** `RowRail` (`UIX/Table/RowRail.tsx:1-12`) is the table's lead-cell gutter that swallows pointer events; `railRow` (`UIX/Menus/listed-outline.css.ts:15-31`) is the drawn vertical line in menu trees. A-1 lists `RowRail` in scope; C-2 and the rejection mean `railRow`.
    **Why It Matters:** An executor can easily touch the wrong one. It also looks like a rename candidate for *§G*.

16. **C-3: is "one Tab stop" the zone's, the head's, or the chevron's?**
    **Found:** The `LineZone` container is the list's single Tab stop, with arrows moving between rows (`UIX/Interactions/engine.tsx:1237-1286`); rows are `tabIndex: -1` (`:1370`) and Enter runs `open` (`:1363-1366`), which the band head wires to its toggle (`GroupBand.tsx:155-157`). Inside the head, the chevron button (`:178`) and New Page button (`:203-212`) are extra Tab stops. Bucket bands have neither a button nor a menu (`:162-175`, `:202`).
    **Why It Matters:** Read literally, "one Tab stop" conflicts with a model where the head isn't a Tab stop at all. The likely intent is that nothing in the head is a Tab stop, Enter toggles, and the context-menu key opens the menu.

17. **C-4: the setting already reaches two of the three trees through two mechanisms — which survives, and does "Navigation Trees" cover only the setting?**
    **Found:** The caption reads "Collapse the sidebar's chevron gutter." (`Core/Settings/frames.ts:262-264`). The sidebar hides through a class on `<html>` and a structure-specific selector (`Core/Settings/applyPersonalization.ts:55`; `Core/Interface/Sidebar/sidebar.css:197-208`); the Grouping pane already reads it in React and renders `'none'` (`GroupFrame.tsx:356`, `:430`); the Location tree ignores it (`LocationField.tsx:68`). The sidebar indents by step while both pane trees sit on the drawn rail (`DisclosureRow.tsx:120-124`).
    **Why It Matters:** C-4 is framed as a wording change, but the code needs one mechanism. The three trees render disclosure differently, so it should be confirmed that the concept groups them for this setting only.

18. **C-5: the two trees differ in more than what a row does — which side wins each difference?**
    **Found:** Leaf gutter `'none'` (`GroupFrame.tsx:430`) vs `'spacer'` (`LocationField.tsx:68`). Set order honors `group_order` through `orderedChildren` (`GroupFrame.tsx:415-416`) vs raw `n.sets` (`LocationField.tsx:54-60`). A row click toggles (`GroupFrame.tsx:433`) vs picks (`LocationField.tsx:71`). Drag-reorder wrap (`GroupFrame.tsx:446-460`) vs none. Search narrowing, pick runs, and a keyboard-active row (`LocationField.tsx:24-34`, `:55-58`, `:65`) vs none. A trailing eye vs none. When sub-grouped, Grouping's Set rows hold option chips as children (`GroupFrame.tsx:418-419`).
    **Why It Matters:** "Identical" needs a ruling per difference, and the sub-group chips mean the Grouping list isn't purely a folder tree.

19. **E-2: does the reorder reach every gather, including Sort by Location, and what is "filesystem order" in code terms?**
    **Found:** Pages from nested Sets are gathered in Set-tree order through `subtreeIds` (`group.ts:74-76`) in `structuralFlat` (`:266-283`), `structuralSubGrouped` (`:308`), and `locationFlat`, which is built on `structuralFlat` (`:285-293`). The Set tree is the Nexus's own order (`:140`), which the code calls `'location'` (`views.ts:56`). `group_order` is applied only to band order after resolution (`Core/Views/Pipeline/bandOrder.ts:6-22`; `Core/Views/Pipeline/resolveView.ts:55`).
    **Why It Matters:** Whether E-2 covers the Location-sorted flat list isn't stated, and "filesystem order" isn't a term the code uses.

20. **E-5: which glyph does Grouping's Sets Order row take?**
    **Found:** Sort uses `arrow-down-up` for value Order rows (`SortFrame.tsx:137`, `:163`) but `folder` for its Location Order row (`:126`). Grouping's three Order rows use `arrow-up-down` (`GroupFrame.tsx:242`, `:252`, `:287`); `:252` orders Sets, the Location counterpart.
    **Why It Matters:** As written, E-5 gives the Sets row `arrow-down-up` while Sort gives the equivalent row a folder.

21. **F-2: which single icon do both "Title Icons" switches take?**
    **Found:** Table: "Page Icons", `file-text`, inverted so on means shown (`LayoutFrame.tsx:46`). Cards: "Hide Icons", `eye-off`, on means hidden (`:58`).
    **Why It Matters:** The glyph is unspecified.

22. **F-4 and F-5: is "the Settings header" difference the scoped rename target?**
    **Found:** In a tile, the Settings header renames and re-icons the view; in the main pane, it renames the container (`Core/Views/Settings/SettingsFrame.tsx:76-104`).
    **Why It Matters:** F-4 names the header without saying what differs; this is the only header difference found.

23. **F-5: with two separate stores, what exactly is the one implementation?**
    **Found:** The main pane duplicates and deletes through host handlers on the container sidecar (`ViewFrame.tsx:84-105`; `Core/Views/handlers.ts:32-34`; `Core/Views/viewsFile.ts:94-108`, `:149-160`; `Core/Views/deleteViewWithUndo.ts:7-18`). Tiles edit their own embedded copies through `mutateEntry` (`ViewTile.tsx:361-374`, `:385-399`). Beyond the switch to the copy, the tile's delete uses the `'tile'` confirmation wording (`ViewTile.tsx:481`; `Core/Interface/Confirm/confirmations.ts:214-220`), an exit animation (`ViewTile.tsx:482`), and an in-memory undo (`:395-398`) where the main pane round-trips `views:restore`.
    **Why It Matters:** "The tile's switch to the copy as the one difference" undercounts. The shareable part is likely the pure splice (`freeName` and `mintViewId`) that both stores call; confirm that, and whether the wording and animation differences stay.

24. **F-6: does dropping `solid` undo what `34234d098` set out to fix, and what does "show it" refer to?**
    **Found:** That commit's message says the card rows pass their own solid opt-in so "their stacked pickers open solid." The other settings-pane `pickerRow`s pass no `solid` (`GroupFrame.tsx:229-295`; `SortFrame.tsx:112-173`). Card Style already toggles in place, since `PickerControl` treats two options as a toggle (`UIX/Menus/PickerControl.tsx:98`, `:105-107`).
    **Why It Matters:** The document cites the commit without its reason. Confirm that the solid fill was a preference rather than a legibility fix for a picker stacked over a pane. "Card Image and Card Scale show it" most likely means only those two visibly change.

25. **F-7: what happens to the Checkbox operators' colored glyph under native menus, and does the closed field read "Checked" too?**
    **Found:** Sort and Group follow the setting because `PickerControl` opens through the menu door, set to `popMenu` at mount (`Core/Interface/mount.tsx:19`; `PickerControl.tsx:118`; `Core/Actions/menuActions.ts:14`). Filter's property and operator lists are in-app `MenuItem`s in a `PickerMenu` (`Core/Views/Settings/FilterFrame.tsx:105`, `:275-292`, `:417-449`); Checkbox operators lead with a `CheckboxGlyph` in the property's color and look (`:383-389`, `:414`, `:427`). Native rows carry an icon name only (`PickerControl.tsx:23-27`). The current labels are "Is Checked" and "Isn't Checked" (`Core/Views/valueKinds.ts:116-117`), and the closed field shows the label (`FilterFrame.tsx:413`).
    **Why It Matters:** Native menus drop the colored glyph. The document should say whether the in-app path keeps it and whether the rename applies to the field as well as the list.

26. **F-8: do the date cells follow the heading to the left?**
    **Found:** Trash's heading is already left-aligned (`Core/Trash/trash-frame.css:38-49`); Archive centers its heading (`Core/Archive/archive-view.css:1-3`). Date cells are centered in both (`Core/Bundles/bundle-table.css:1`, `:32-33`).
    **Why It Matters:** F-8 is really an Archive-only heading change, and a left heading over centered values misaligns.

27. **F-9: which control, glyph, and label does the shared placeholder use, and does a third placeholder belong?**
    **Found:** `ViewFrame.tsx:116-125` uses `AccessoryButton`, `dots`, "More"; `SettingsFrame.tsx:127` uses `FooterIconButton`, `ellipsis`, "More actions". A third `// PLACEHOLDER` sits at `Core/Views/Settings/VisibilityFrame.tsx:46`, a disabled "Always Shown" eye on Title.
    **Why It Matters:** A choice is needed for each, and the third placeholder isn't mentioned.

28. **G-2: does Trash wear `.table-shell`, and should the shell layer sit beside `.table` in `UIX/Table`?**
    **Found:** `.table-view` is worn by `TableView.tsx:284` and `Core/Archive/ArchiveView.tsx:67`, which imports `Core/Views/Table/table-view.css` (`:21`). Trash wears `trash-frame table` (`Core/Trash/TrashFrame.tsx:34`) with its own margins (`trash-frame.css:30-34`). Outside rules match the class: `Core/Interface/Header/content-banner.css:95` and `Core/Tiles/Surfaces/view-tile.css.ts:140`. Two shell layers exist: `.table` in `UIX/Table/table.css` and `.table-view` in `Core/Views`.
    **Why It Matters:** If Trash takes the class, both outside rules start matching it. The Archive importing a view's stylesheet suggests the shell belongs in `UIX/Table`, which is a placement call.

29. **G-3: what moves into Properties with `ResolvedColumn`, and is a Contract-to-`loadValues.ts` import intended?**
    **Found:** `viewRow.ts` is already host-reachable through `loadValues.ts` (engine graph). `Properties/columnStyles.ts` doesn't reference `ResolvedColumn`; the functions that do (`columnDefaults`, `styleFor`, `pickedStyle`, `columnStylePatch`) sit beside a React hook in `Core/Views/Host/useColumnStyles.ts:21-65`. `columnStylePatch` returns `ViewPatch` from `views.ts`, which imports `columnStyles.ts` (`views.ts:6`), so moving it creates a cycle. After the move, `Core/Contract/bridge.ts:17` imports `PageValues` from `Core/Views/loadValues.ts`, and the window callers of `pageValuesOf` (`useViewCreation.ts:73`; `Core/Navigation/previewRules.ts:42`; `Core/Matrix/matrixGraph.ts:28`) import a module that pulls in `readNexus`, `liveTree`, and `heldPages` (`loadValues.ts:1-6`).
    **Why It Matters:** The "so the host-side column styles can read it" clause implies an unstated move of the style functions, one with a cycle to resolve and a dependency direction to approve.

30. **G-3: which file holds `ViewRow` and "every function that builds it", and does `toRow` leave the pipeline?**
    **Found:** Builders: `pageRowOf` and `spaceRowOf` (`Core/Views/pageRow.ts:11-43`), `toRow` and `flattenContainer` (`group.ts:108-141`), and the creation blank (`useViewCreation.ts:73-83`). `pageRow.ts` also holds the dialer reads `fetchPageValues` and `fetchPageRow` (`:46-61`).
    **Why It Matters:** Pulling `toRow` and `flattenContainer` out of `Pipeline/` changes that folder's meaning; the target file needs a placement ruling.

31. **G-4: what is the settings descriptor's new name, given a third "view row" exists?**
    **Found:** The settings descriptor `ViewRow` (`LayoutFrame.tsx:101-113`, consumed at `SettingsFrame.tsx:15`, `:37`); the page row `ViewRow` (`Core/Views/viewRow.ts:32`); and a view's own row in the dropdown, named in `Core/Actions/viewRowMenu.ts:3` (`ViewRowAction`, `viewRowMenuItems`).
    **Why It Matters:** G-4 asks for "a name of its own" without proposing one, and the dropdown's "view row" stays as a third meaning.

32. **A-1: do the shared engines enter as may-touch or as will-restructure, and why is `Core/Trash` absent?**
    **Found:** `engine.tsx` is 1,441 lines; `ghostCreate.ts` serves seven files outside the views (`Core/Interface/mount.tsx`, `Core/Interface/Sidebar/Sidebar.tsx`, `Core/Tiles/TileGrid.tsx`, `Core/Properties/PropertyPanel.tsx`, `Core/Properties/Schema/OptionSlot.tsx`, `GhostOptionChip.tsx`, `OptionEditor.tsx`). F-8 and G-2 touch `Core/Trash/TrashFrame.tsx` and `trash-frame.css`, which A-1 doesn't list.
    **Why It Matters:** This sets the blast radius and what the 300-line count runs over.

33. **What do I-040, I-059, I-070, `ViewTypesPM.md`, `FrameworkPM.md:21`, and the Wrapped Table Cells brainstorm say, and what are the "phases"?**
    **Found:** No code references any of these identifiers, and nothing in the code traces to wrapped table cells. A-5 places I-059 in "its own late phase", but the document defines no phases. D-2 describes I-040 only as "a view's create", and I-070 isn't described at all. E-1's two documents weren't opened, per this read's brief. *§Open Items* and *§Prospects* are empty headings.
    **Why It Matters:** An outsider can't evaluate A-5, A-6, or E-1 from this document. The empty sections read either as pending or as deliberate.

34. **Is the baseline counted on the same basis as the target?**
    **Found:** A raw `wc -l` of the 69 files gives exactly 9,801, which includes comments and blank lines; the north star excludes comments.
    **Why It Matters:** The reported delta should be measured the same way at both ends.

#### Inferred & Want Confirmed

- ***§Concepts* Band:** under Set grouping, the headerless tail holds the pages sitting directly in the source rather than pages "without a value" (`Core/Views/Pipeline/group.ts:250-262`). The concept's wording fits property grouping only.
- **Window-Side:** the renderer half of Core, the counterpart to the engine half that `Core/Contract/engineGraph.test.ts` guards.
- **Presented Kind:** the kind actually drawn, which is Table for any unbuilt kind.
- **Ghost-Row Loop:** the per-row splice that inserts the ghost after its anchor (`TableView.tsx:255-263`; `CardsView.tsx:421-431`), plus the standing ghost of an empty container.
- **Stable Interface:** the `useStableApi` records `RowCellApi` and `CardApi` (`TableView.tsx:178-190`; `CardsView.tsx:244-256`).
- **Line-Row Engine and Fold:** `UIX/Interactions/engine.tsx`, reached through `drag.ts`, and the `Reveal` animation.
- **Views Dropdown Editor and Toolbar Settings:** `ViewFrame` with `LayoutFrame`'s `'full'` door (type grid on the root), and `SettingsFrame` with the `'flat'` door (type grid inside Layout) (`LayoutFrame.tsx:193-283`; `SettingsFrame.tsx:176`).
- **E-4:** the code already dims Set-row eyes (`GroupFrame.tsx:441`) and leaves option-row eyes at full strength (`Core/Views/Settings/paneRows.tsx:40-54`), as the document intends; only the stated reason is missing.
- **A-4:** `RenameHost` values, CSS classes, and hook names aren't persisted, so renaming them is in bounds. `collapsed_groups` and `hide_page_icons` stay.
- **B-2's "Passthroughs No Renderer Uses":** for example `setStylePatch`, `effectiveValues`, and `setValueOverride`, which only creation or the seat read. Per-field usage was sampled with a grep and should be confirmed by the executor.
