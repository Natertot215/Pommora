## Wrapped Table Cells — Brainstorm Brief

A starting point for a brainstorm on a per-view Table layout toggle under which a cell wraps its content and shows its line breaks — text values, links, chips, and titles — in place of one `nowrap` line.

### Where Table Cells Stand Today

- **Single-line layers:** a cell's content passes several `nowrap` rules. `.data-cell` clips with an ellipsis (`UIX/Table/table.css:76-83`), the `OverScroll` cap every title, chip run, link, and number sits in holds one line and scrolls it on hover (`UIX/Interactions/over-scroll.css:2-15`), and each chip's label is `nowrap` on its own (`UIX/Labels/label-base.css.ts:35`). Clearing these to `white-space: normal` still collapses a `\n`; showing line breaks takes `pre-line` or `pre-wrap`.
- **Row height:** rows already follow their content. `.data-row` stretches its cells (`UIX/Table/table.css:4-9`), the token sheet holds no row height (`UIX/Table/table-tokens.css:2-28`), and neither renderer virtualizes (*ViewTypesPM §Known Issues*), so a taller row costs no fixed-height assumption.
- **Column widths:** each type carries a `{min, default, max}` from `WIDTHS` in `Core/Views/Table/useColumns.ts:32-45`; Title alone is uncapped, and a sum past the pane scrolls the whole view horizontally.
- **Chip runs:** Select, Multi-Select, Status, and file chips sit in an `OverScroll` run (`Core/Properties/Cells/Cell.tsx:74-82, 187-206`); a reorderable Multi-Select run is a `SortableZone` on the `x` axis.
- **The cell sweep:** a drag down an option column measures each row's live rect with `getBoundingClientRect` when the sweep activates and again on scroll, and maps the pointer's height onto those rects (`Core/Views/Table/cellSweep.ts:26-34, 60-81`).
- **The Cards precedent:** `wrap_titles` is a Cards-only switch in the Layout frame (`Core/Views/Settings/LayoutFrame.tsx:58`). `CardTitle` (`UIX/Cards/Card.tsx:65-73`) offers scroll, wrap, or static modes; wrap drops the `OverScroll` and sets `.card-title.is-wrap` inline (`UIX/Cards/cards.css:143-149`).
- **Registering a view flag:** a Table's Layout frame lists the switches in `TABLE_LAYOUT` (`LayoutFrame.tsx:43-51`). A new flag enters the saved-view schema and `VIEW_DEFAULTS` (`Core/Views/views.ts:241-278, 296-311`), which the compiler enforces through `ViewDefaults`, and `ROLES` (`Core/Nexus/configReach.ts:51`) and `TABLE_LAYOUT`, which it doesn't.
- **Text's resting renderer:** the Text property brainstorm settled that a multi-line value at rest in a single-line cell shows its first line with an ellipsis, and that the renderer draws `\n` as a line break wherever its container allows wrapping (*Text Properties — Decision Log §Prospects*).

### The Idea

A view flag switches a Table into a wrapped regime where each cell's content flows onto as many lines as its column width needs and keeps the value's own line breaks, and rows grow to their tallest cell. The single-line `nowrap` rules and the `OverScroll` caps give way under the flag, while the default regime stays as it is. Edit In Place, where a cell becomes a live editor on entry, is an adjacent and separate prospect.

### Questions for the Brainstorm

- **Scope of the flag:** whether one view-wide flag covers text, links, chips, and titles together, or wrapping is chosen per column through `column_styles`.
- **Wrapped chip runs:** whether a chip run wraps its chips onto further lines or keeps scrolling as one line, and how a wrapped Multi-Select run reorders when its `SortableZone` moves on one axis.
- **Relation to `wrap_titles`:** whether the Table shares the Cards flag, so one key means a wrapped title in Cards and wrapped cells in a Table, or the two stay separate flags with one meaning each.
- **Widths and horizontal scroll:** how wrapping interacts with each type's `max`, and whether an uncapped Title column wraps at its saved width or keeps growing the horizontal-scroll regime.
- **The cell sweep:** whether rects measured on activation and scroll stay accurate when rows of uneven height reflow mid-sweep, such as a chip added to a swept row.
- **The Title cell:** how a wrapped title sits beside its page icon, and how it composes with the location subtitle pending in *ViewTypesPM §Pending*.
- **Where the toggle lives:** whether it joins `TABLE_LAYOUT` in the Layout frame beside the visibility list, or sits on the column header's Style menu.
