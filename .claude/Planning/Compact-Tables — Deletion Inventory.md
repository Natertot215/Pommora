## Compact Tables — Deletion Inventory

The table "Compact" format is dead: the ViewSettings Table Format control writes a per-view `format` field that nothing in the table renderer has ever read — the table's density story is the borderless style (`hide_borders`, written by `Components/Detail/LayoutToggles.tsx`, read at `TableView.tsx`), a separate field needing no coordination. The complication is that the **same `format` field and the same writer power Cards' live Compact density mode**, so this is a surgical cut, not a sweep. Three scouts (code, tests, docs) produced this inventory; every load-bearing line was re-verified at the source.

### The Dead Half — Delete

- `renderer/src/Components/Detail/ViewSettings.tsx:263-266` — `formatRow`: the `view.type === 'table'` gate rendering `formatToggle('layers-2', 'Format')` in a MenuBottomRow. The only table-compact UI in the app.
- `renderer/src/Components/Detail/ViewSettings.tsx:301` — the footer switch's else-branch: `footer={view.type === 'cards' ? cardsFooting : formatRow}` collapses to `: null`.
- `renderer/src/Components/Detail/ViewSettings.tsx:61` — the max-height rationale comment names "the pinned Format"; reword to the cards footing.
- `renderer/src/Detail/Views/Table/table-tokens.css:10` — the `--zoom` comment claiming "Standard (default); Compact = 0.9" — a mechanism that was never wired; **the `--zoom: 1` token itself stays** (embed/block zoom multiplies it).
- `renderer/src/Detail/Views/Table/Table.css:32` — "zoom is the Compact density knob" comment; the `zoom: calc(...)` declaration below it stays.
- `renderer/src/design-system/symbols/index.tsx:39,137` — the `layers-2` (`Layers2`) registry entry is orphaned by the deletion; its only consumer is the dead row. Prune-or-keep is a registry curation call.

### The Shared Plumbing — Keep (Cards Depends On It)

Everything in `shared/views.ts` survives unchanged: `VIEW_FORMATS` (:15), `ViewFormat` (:16), `isCompact` (:18-20), `format?: ViewFormat` (:141), the zod entry (:288). So does the whole read/persist path (`main/readNexus.ts` parseViews, the `views:save` handler, `crud/views.ts`, the preload dialer, `viewMerge.ts` spreads) — all field-agnostic. In `ViewSettings.tsx`, `toggleFormat` (:122), the `formatToggle` factory (:145-165) with its `'Compact'`/`'Standard'` label (:155), and the `cardsFooting` call site (:167-170) are the **same writer the cards Style row uses** — deleting them breaks Cards. The Cards readers (`CardsView.tsx`, `cardValueInput.ts`, `CardPickerHost.tsx`) and the `.card-props.is-flow` CSS family are the live feature.

Not this feature, despite the names: `view_style`/`ViewStyle` in `shared/schemas.ts`/`types.ts` (per-container ViewDropdown presentation), `.cards-view.is-compact` (imageless cards, `card_banner === 'none'`), `compactRow` in the card add-picker, the showcase's `useIsCompact` media-query hook, `columnWidths.ts`'s "compact look" comment (per-column style mins), and every "compaction" mention.

### Tests — Reframe, Don't Delete

The only direct coverage is `shared/views.test.ts:191-200`, which tests the **codec** and must survive for Cards: rename the `describe('SavedView format')` framing cards-first and flip the `type: 'table'` literal at :199 to `'cards'` — after the deletion it asserts a concept that no longer exists on tables. Nothing else in the 191-file suite touches the field: no fixture carries it, all eighteen SavedView factories omit it, the four pane save-spies are blind to it, and ViewSettings has no test file. **Nothing goes red when the table half is deleted** — the real risk runs the other way: `shownColumnsFor` (`cardValueInput.ts`), the one function branching on the compact boolean, has zero coverage, so an over-eager cut into the shared plumbing would break Cards' blank-column suppression on a green suite. Add that Cards guard-rail test *before* cutting.

### Docs — The Edit List

- `Features/ViewsPM.md:11` — excise the sentence "A view also records its `format` (Standard / Compact — the density style)."; the neighboring date/time display-format clause on the same line is unrelated and stays.
- `Features/ViewsPM.md:47` — reword: the Table Layout-leaf description survives minus "with the **Format** control (Standard / Compact) pinned in the footing"; the Cards half of the sentence (Style + Scale) stays.
- `Features/ViewsPM.md:73` — delete the whole "Compact Table Density" Pending entry; its cards claim is already at CardViewPM.
- `Features/TableViewPM.md:79` — delete the whole "Compact density" Prospects bullet.
- `Planning/Pending-Work 8-5.md:103-105` — delete the "Make the Table's Compact Toggle Do Something" section; this inventory resolves it.
- `ContextPM.md` Debt line "View format/grouping/banner saves still trigger a full vault walk" — drop "format/" or leave as-is by ruling: the `format` write path still exists for Cards, so the line stays technically true.
- `HistoryPM.md` (the 0.5.x Multi-View entry naming "the Table Format control" and the `format` sidecar key) — **historical record, stays verbatim.** CardViewPM's Standard/Compact card-layout section stays — it is the live feature's home.

### Decisions the Cut Should Carry

- **Stored residue:** a table view saved with `format: "compact"` keeps the value on disk harmlessly (unread, decoded cleanly) — but if that view is later switched to Cards it renders Compact without ever being chosen. Either accept that, or strip `format` on a table→cards type switch in `setType` (`ViewSettings.tsx:116-121`). One line either way.
- **Provenance:** the field was born in this build (the six-type-roster commit absorbing Board into a Cards format) — no Swift-era residue exists.
