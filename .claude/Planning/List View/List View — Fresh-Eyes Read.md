### List View — Fresh-Eyes Read

**DATE:** 11-09-2026
**READ AGAINST:** `4b18149ac`
**SOURCE:** *List View — Decisions & Intention*, read alone, then checked against the code. *List View — Brief*, *Investigation*, and *Scout Findings* weren't opened.

#### How I Read the Document

List becomes the third view kind with a renderer. A row is Table's row with its cells replaced by two runs of values, a left run beside the title and a right run against the row's right edge, divided by bars between properties. Each property's side is a per-view setting over a per-type default. The view's property pane becomes two side-by-side columns for List. Bands, grouping, sorting, creation, and drag come from the shared host unchanged. Three new per-view switches arrive: Title Icons (shared), Outlines, and Wrap Rows. The work also consolidates what Table, Cards, and the Properties panel each hold privately: the row frame, the clickable value, the add-show-hide rules, and the hover **+**. It also changes how a hidden property keeps its place through a reorder in every kind.

Each question below carries **Touches** (the decision IDs), **Evidence** (what I found in the code), and **Weight**. **Blocks** means I couldn't build that part without the answer, and **Clarifies** means I could build it but would be guessing.

---

#### The Sources I Couldn't Read

1. **Should this document stand alone?** B-8 rests on "as *List View — Brief* describes," and Open Item 3 points at the Investigation's live-check list without naming the checks. An outsider can't verify either one. What does the Brief say about where the **+** sits on a row with left values and no right values, and what are the live checks?
   - **Touches:** B-8 · Open Item 3
   - **Weight:** Clarifies

#### Order and Sides

2. **How does one `property_order` hold two columns that read in opposite directions?** E-3 puts the value nearest the title at the top of Left, and the value nearest the row's right edge at the top of Right. Take `property_order = [Title, Status, Date, Tags, Link]` with the default sides. Is the right group drawn in `property_order` sequence, so Link lands at the edge and the Right column lists Link, Date (the reverse of the stored order)? Or does the right group draw in reverse order? Whichever it is, what does a drop within Right, or from Left to Right, write to `property_order`?
   - **Touches:** E-3 · E-7 · I-4
   - **Evidence:** `resolveColumns` and `placeInShown` in `Core/Views/Pipeline/columns.ts` know one flat sequence.
   - **Weight:** Blocks

3. **Is the cross-kind coupling through `property_order` intended?** `property_order` is shared by every kind a view is switched to, so reordering List's pane also reshuffles Table's columns and Cards' properties. Title is itself an entry in that order. In Table, nothing in `startColumnDrag` excludes it, and `DataRow` puts the grip on whichever column comes first (`i === 0`). So a Table view can carry Title mid-order, which means nothing in List.
   - **Touches:** I-4
   - **Weight:** Clarifies

4. **What exactly is a hidden property's "remembered position" through a reorder?** Two candidate rules:
   - **Index:** It keeps its index.
   - **Neighbor:** It stays after the shown property that preceded it. What happens when that neighbor itself moves?

   E-6 changes this for every kind, including Table's column drag. Today `useColumns` calls `placeInShown`, which writes shown ids first and appends the rest. A Table column unhidden after a reorder would therefore land somewhere new. Is that behavior change wanted in Table?
   - **Touches:** E-5 · E-6
   - **Weight:** Blocks

5. **Where does a property that was never placed belong?** That covers a property created after the view exists, and every Context by default. It's hidden because it's absent from `property_order`, so it has no slot and no stored side. `hiddenListIds` lists such properties in Context → schema → stamp order. In List's pane, do they sit at the foot of their type-default column in that order? When one is shown, by eye or from a row's Add list, `unhide` appends it to the end of `property_order`. Under the answer to Q2, does that mean "farthest from the title" on the left and "nearest the title" on the right?
   - **Touches:** D-2 · E-5 · C-2
   - **Weight:** Blocks

6. **How should the side map be stored?** Does it record only sides that differ from the type default, the way `column_styles` drops empty entries and `card_size` writes `undefined` at its default? Should it join `ENTRY_KEYS` and `mergeViewEdit`'s depth map, so that two concurrent edits merge per property the way `column_alignments` does?
   - **Touches:** I-4 · J-6
   - **Evidence:** `Core/Views/views.ts`
   - **Weight:** Clarifies

#### The Property Pane

7. **Who decides that List's Visibility row opens the two-column pane?** `ViewPane`'s `visibility` case always returns `VisibilityFrame` and never consults the kind. Does the kind record gain a pane field beside `layout.leaf`, or does `leaf` grow a third value? Table and Cards keep the flat single list, so the "one property pane per kind" principle in the Rejections would mean two pane designs. Is that accepted? The alternative is one pane component that draws one column for Table and Cards and two for List.
   - **Touches:** E-1 · E-2
   - **Evidence:** `Core/Views/Settings/ViewPane.tsx` · `Core/Views/Host/viewKinds.ts`
   - **Weight:** Blocks

8. **What does displacement give up that the Visibility pane does today?** `PommoraDND.md` says settings frames and the Properties panel use the line treatment "where the drop point has to be exact." `VisibilityFrame` is a line zone (`paneSpec`) with drag-to-hide (its `leave` drop) and Title pinned. Under displacement:
   - **Drag to Hide:** Can a property be dragged into its column's hidden foot to hide it, or does only the eye hide it?
   - **Hidden Rows:** Do hidden rows drag at all?
   - **Title:** Is Title listed in the pane, pinned, or absent?
   - **Keyboard:** `PommoraDND.md` says a cross-zone move is pointer-only, so a keyboard user can't change a side by dragging. Is there another way to change a side, such as a menu row?
   - **Touches:** E-7 · Rejections ("A Drop Line in the Two-Column Pane")
   - **Evidence:** `UIX/Menus/paneDrop.tsx` · `Core/Views/Settings/VisibilityFrame.tsx`
   - **Weight:** Blocks

9. **Should the settings menu nearly double in width for List?** `SETTINGS_PANE_FLOOR` is 225px wide. Two columns capped at 200px each, plus padding, put the pane around 430–450px. Is the menu meant to widen that much when List's pane opens, including in a View Tile's scope?
   - **Touches:** E-4
   - **Evidence:** `UIX/Menus/frames.css.ts`
   - **Weight:** Clarifies

#### Switches and the Kind Record

10. **Is putting List's switches in `rows` the intended outcome?** `kindSwitches` draws `layout.switches` in Layout's body, and `kindRows` draws `layout.rows` in the footer, which is the slot ViewFrame's editor root also draws. If List's three switches ride `rows`, three things follow:
    - **Empty Section:** List's `switches` is empty, so `kindSwitches` draws an empty section.
    - **Footer Placement:** In SettingsFrame's Layout, List's switches land in the footer, while Table's and Cards' sit in the body.
    - **Split Flag:** Title Icons is one flag (`hide_page_icons`), but it would live in `switches` for two kinds and in `rows` for the third.

    Is that the result F-2 means? The alternative is a flag on a switch entry saying "also draw at the root."
    - **Touches:** F-1 · F-2 · I-5
    - **Evidence:** `Core/Views/Settings/LayoutFrame.tsx` · `ViewFrame.tsx` `ViewEditor`
    - **Weight:** Blocks

11. **Is it acceptable that ViewFrame's Layout row means three things?** For Table it opens the property list plus switches (`leaf: 'visibility'`), for Cards the switches alone, and for List the two-column pane alone. Is that intended, or should Cards' Layout also reach its property pane?
    - **Touches:** E-2 · F-2
    - **Weight:** Clarifies

12. **How should the new flags default and be named?** `VIEW_DEFAULTS` holds one default per flag, with no per-kind defaults. "On for a new List view" therefore means on for any view switched to List. Should the flag be `outlines` defaulting to true, or `hide_outlines` defaulting to false with `invert`, the pattern Title Icons and Column Icons use?
    - **Touches:** G-1 · H-1
    - **Weight:** Clarifies

13. **Does Open Item 2 cover edits to existing files, or only new files?** J-6 names `views.ts`, but every new saved-view key also forces an edit to `ROLES` in `Core/Nexus/configReach.ts`, which is compile-enforced. The side map would also be an `idMap` that the property-deletion sweep has to clean. Do edits like that return to Nathan, or only new files?
    - **Touches:** J-6 · Open Item 2 · Constraints (Placement)
    - **Weight:** Clarifies

#### The Row Frame

14. **What is the lifted frame's shape?** Table's lead isn't anchored to the title. `DataRow` gives `RowLead`, which holds the grip and rail, to whatever column is first, and applies the indent only when that column is left-aligned. Is the frame a `LineRow` plus `RowLead` plus title, with Table supplying cells and List supplying the two groups? Does Table's grip then move onto Title, or does the frame keep "whatever comes first leads"?
    - **Touches:** I-1 · J-2
    - **Evidence:** `Core/Views/Table/TableView.tsx` `DataRow`
    - **Weight:** Blocks

15. **Is `BundleTable` in scope?** Archive and Trash already compose a third copy of this row: `LineRow`, then `RowLead` with a check in the rail slot, then the title, then a trail pushed to the right with `margin-right: auto`. It's structurally a List row. It also hard-codes `ROW_H = 29.75` as "TableView's row as it draws" for its virtual window, and it imports Table's `COLUMN_LAYOUT`. Does `BundleRow` compose the lifted frame? If it does, does the frame guarantee the row height `BundleTable`'s virtual window assumes, or does that constant need another source?
    - **Touches:** I-1 · J-2 · Approach ("looking outward")
    - **Evidence:** `Core/Bundles/BundleTable.tsx`
    - **Weight:** Blocks (scope)

16. **How does `Core/Views/Rows/` divide from `UIX/Table/`?** The Context section calls the grip, rail, and indent "private to `TableView.tsx` and Table's sheet." Yet `RowLead`, `rowIndent`, and the `.row-grip` and `.row-rail` rules already live in `UIX/Table/`, and Bundles, menus, bands, and the host all use them. What moves to `Core/Views/Rows/`, and what stays in UIX? `table-view.css` also mixes the shell (margins, band rhythm, the sticky band head) with rules only Table uses (horizontal overflow, column hide and slide, cell sweep). Is the split shell → `Core/Views/Rows/`, with the column rules staying in Table? Does TrashFrame, which wears `.table` without `.table-shell`, stay outside?
    - **Touches:** J-2 · I-1 · Context
    - **Weight:** Clarifies

17. **Does a List row wear the table sheet?** The UIX sheet makes `.data-row` a grid on `--cols` with a top border, and gives `.data-cell` a right border. Does a List row take the `.table` tokens (padding, hover, selection) without the grid? Is `.no-borders` List's fixed state?
    - **Touches:** B-5 · I-1
    - **Evidence:** `UIX/Table/table.css`
    - **Weight:** Clarifies

18. **Does List drop Table's cell sweep?** Table's drag-down sweep over an option column (`useCellSweep`) needs aligned columns, and A-2's list of shared behavior doesn't include it. Confirm List has no sweep.
    - **Touches:** A-2
    - **Weight:** Clarifies

19. **Does first-line grip anchoring ship in List's first version?** `.row-grip` sits at `top: 50%`, so on a wrapped two-line row it centers between the lines. Since Wrap Rows ships in v1 (H-1), does that anchoring land now, as one rule Table shares?
    - **Touches:** H-1 · Prospects (Wrapped Table Cells)
    - **Weight:** Clarifies

#### Values

20. **Should Table's cell use the shared clickable value too?** I-2 counts two copies (Cards and the Properties panel), but Table's `DataRow` cell is a third. It carries the same `click` / `menu` / editor-or-`Cell` wiring, placed on the `.data-cell` div along with the sweep's pointer-down. Should Table mount the shared component too, or is it exempt, and if so, why?
    - **Touches:** I-2 · J-3 · Principles (One Way)
    - **Weight:** Blocks

21. **Which link Format does C-4 extend?** Two Format families exist for links:
    - **Per View:** A per-view look (`style:look:link-*`), which Table's header menu offers through `styleBranch`.
    - **Editor Links:** The connection menu's own `format:link-*` rows (`FORMAT_ROW`), which rewrite the link's text in the editor (`MarkdownPM/Links/linkEdit.ts`) and are withheld when the link is a property value.

    Both carry the same labels. A value whose link resolves to a page or URL right-clicks into `showConnectionMenu`, while an empty or unresolved one falls to `cellMenuModel`. C-4 needs to add the per-view Format to both paths, beside a same-named submenu that does something else. A property-wide `link_display` default also sits underneath. Does "every view" include the Properties panel? The panel passes `style: () => null` and offers no Style today.
    - **Touches:** C-1 · C-4
    - **Evidence:** `Core/Actions/connectionMenu.ts` · `Core/Actions/cellMenu.ts` · `Core/Properties/Pickers/ValueSeat.tsx` `menu`
    - **Weight:** Blocks

22. **Does an unchecked checkbox stay on the row?** On Compact cards an unchecked checkbox still draws (`blankDraws`) because it's the card's toggle. "As on Compact cards" would keep an unchecked checkbox on every List row. Is that intended?
    - **Touches:** B-4
    - **Evidence:** `Core/Views/Cards/cardColumns.ts` · `PROPERTY_TYPES.checkbox`
    - **Weight:** Clarifies

23. **What are the maximum widths for the other types?** Only Text and Link get a stated maximum (~200px), and Date needs none. What about Select, Multi-Select with many chips, Contexts, File, and Number: one shared maximum or one per type? Table's `COLUMN_LAYOUT` already holds per-type ranges. Should List reuse it or keep its own table? C-3 also reads two ways. Is the maximum a fixed cap that always applies, or what values shrink toward when a row gets crowded?
    - **Touches:** C-3 · C-5
    - **Evidence:** `Core/Views/Table/useColumns.ts`
    - **Weight:** Blocks

24. **Which look does a Text value take on a row?** Compact cards wrap it in a bordered field (`card-text-value` with `borderedField`). Table shows its first line with the pen beside it. Which does a List row use?
    - **Touches:** C-3
    - **Weight:** Clarifies

25. **Where do the shared add, show, and hide rules live?** Today they're CardsView's policy passed into `useViewInteractions`: `seat.add`, `seat.hide`, and `commitOnCard` revealing a property on its first value. Do they become a kind-record declaration, or a host-side policy? The triggers also differ. Cards opens Add from a click on empty text-area space, while List opens it from a hover **+**, and B-3 makes List's empty stretch inert. Are two triggers for one list accepted, or should Cards get the **+** too?
    - **Touches:** I-2 · B-3 · B-6
    - **Weight:** Blocks (shape of I-2)

#### The Add Control

26. **Is I-3 a new primitive or a convergence onto `AccessoryButton`?** `AccessoryButton` in `UIX/Menus/MenuRows.tsx` is already the Properties panel's **+**, and it also backs `FootingCreate`, the OptionEditor group **+**, and PropertyFrame's assign **+**. Only GroupBand's **+** is a raw `Button`, and it has the same inline size, `data-create`, and `revealTarget` reveal. Is I-3 "move the band onto `AccessoryButton`" plus List's row, or a new primitive? Do the other **+** sites fold in?
    - **Touches:** I-3 · B-6
    - **Weight:** Clarifies

27. **Should the hidden **+** keep its width?** A revealed button keeps its box at opacity 0. A **+** that always trails the right group therefore reserves its width on every row, so the right group never sits exactly flush to the edge. Is that acceptable, or should the **+** take space only while shown, which shifts the layout on hover? When a row has nothing left to add, does the **+** disappear, as the panel's does when its list of unshown entries is empty?
    - **Touches:** B-1 · B-6 · B-7
    - **Weight:** Clarifies

28. **What exactly is the bar?** Is it the Table heading's segment (`--heading-segment`, a 16px rounded bar), or something new? Does a bar sit between the title and the first left value? Between the **+** and the value before it?
    - **Touches:** B-2
    - **Weight:** Clarifies

#### Outlines

29. **Should List's Outlines reuse the indent rails that already exist?** Two already draw:
    - **Outliner Lines:** An app-wide personalization toggle (`outlinerLines`, off by default) whose caption reads "Show indent rails on nested lists in the editor." It draws through `.outline-lines` in `markdown-pm.css`.
    - **Disclosure Rails:** `railRow` in `UIX/Elements/disclosure.css.ts`, which `DisclosureRow` wears in menus.

    Both read the shared `--list-outline-width`, `--list-outline-color`, `--list-outline-gap`, and `--list-outline-radius` tokens. Should List's lines wear those tokens and that look? And should a per-view switch exist at all, or should List follow the app-wide toggle the editor already answers to? The name also collides twice: "Outline" is already the page's heading outline (`Core/Interface/Toolbar/OutlineMenu.tsx`), and "rail" also names `.row-rail`, the grip's hover slot in the gutter.
    - **Touches:** G-1 · G-2 · F-1 · Concepts
    - **Weight:** Blocks

30. **What exactly do Outlines draw?** One line per depth level beside member rows only, or also beside band heads, sub-bands, the ghost row, and a collapsed band's space? What weight, color, and inset should they have?
    - **Touches:** G-1 · G-2
    - **Weight:** Clarifies

#### Wrapping and Overflow

31. **Who decides Open Item 1, and when?** It sets the row's whole layout model. The plausible answers are:
    - **Fade:** Clip the right group under a fade.
    - **Drop:** Drop the values that don't fit. That needs measuring, which *§Constraints (Cost)* rules out.
    - **Title First:** Let the title shrink with an ellipsis first.
    - **Scroll:** Let the row scroll sideways, which "Growing Sideways" rejects.

    Is it decided before planning or inside it? With Wrap Rows off, does the title shrink before the values do?
    - **Touches:** Open Item 1 · C-3
    - **Weight:** Blocks

32. **Which gives way first on a wrapped row, the title or the right group?** In the browser's own flex wrapping, an item wraps only when its line can't hold it. A title that can shrink with an ellipsis absorbs the squeeze first, so the right group would never wrap. Does the title have a fixed minimum width before the right group drops? Where does the 12–16px gap live: as a gap, or as the right group's margin?
    - **Touches:** H-2 · Constraints (Cost)
    - **Weight:** Blocks

#### Smaller Things

33. **Does Enter still open a focused row?** `LineRow`'s `open` fires on Enter only, so B-3's pointer rule matches Table. Confirm that Enter on a focused List row still opens the page.
    - **Touches:** B-3
    - **Weight:** Clarifies

34. **Is showing the grip and **+** permanently on touch screens acceptable?** On touch-only screens every reveal host shows its targets (`hover-reveal.css.ts`), so on the Capacitor companion every List row would show its grip and **+** at all times. Acceptable for now?
    - **Touches:** B-6
    - **Weight:** Clarifies

35. **Is there a Figma frame for List?** One covering the row, the bars, the **+**, Outlines, and the two-column pane would settle Q27–Q30 and part of Q9.
    - **Touches:** B · E-4 · G
    - **Weight:** Clarifies

36. **Can I treat A-3 as needing no migration?** No saved `list` view exists in `~/NexusOS` or `~/Test`, and `typeGrid` only accepts built kinds. So no existing view flips from Table to List when the renderer lands, unless an agent or another device has written one. Is that safe to assume?
    - **Touches:** A-3
    - **Weight:** Clarifies
