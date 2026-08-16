## PickerMenu Rework — Task Tracking

Live tracker for the menu-surface arc. `PopoutMenu — Scope.md` holds the original scoping; this
holds what is done, what is open, and what each open item is waiting on. The scope document is
superseded where the two disagree — the beak-less surface became `PickerMenu` itself rather than a
second component beside it.

### Done

- [x] **The beak-less shell.** `PickerMenu` passes a zero notch on both axes, so the shared path
      emits a plain rounded rect. Its shape props (`radius`, `notchWidth`, `notchHeight`,
      `notchCurve`) are gone — the silhouette is the component's, not a caller's.
- [x] **`PopoutMenu` folded in.** It existed for one commit as a wrapper; `PointMenu` and the
      fixed-option row (`MenuOption`) live in `PickerMenu` now.
- [x] **`PickerControl` migrated** — the house double-chevron, and with it fourteen call sites:
      Number Format, Decimals, Currency, Date · Day · Time, URL Format, Card Banner, Default Format,
      and the Sorting and Grouping panes' Order rows.
- [x] **`PointMenu` re-homed.** The right-click header menu already rendered a `MenuItem`; only its
      shell was a picker.
- [x] **The pass-through removed.** `PickerMenu` and the autocomplete mount `GlassPane` directly,
      the way every other glass consumer does. Nothing suppresses the material's border and shadow
      any more, so the three inset lighting layers came back.
- [x] **`NotchedPane` reduced to its one consumer.** `MenuSurface` keeps the beak; the sideways
      path, the flip, three inset props and the resize publication were unreachable and went.
- [x] **The row shell unified.** Radius, rest cursor, hover wash and keyboard-focus ring were
      written twice; `rowShell` states them once and both row types compose it.
- [x] **The chosen-row mark reads accent.**
- [x] **Auto-centring.** `origin="auto"` is the default: centre when the whole pane fits there,
      fall back to the edge anchor when centring would be clamped. Decided once per open.
- [x] **`PickerOption` gained a `leading` slot**, so a glyph-led row's alignment is the component's
      business rather than six callers restating it.

### Open

- [ ] **The autocomplete's caret anchoring.** It mounts the same pane but places itself, because
      `origin="left"` insets by `ANCHOR_RESERVE` — correct against an element, wrong against a text
      caret, which wants the pane's left edge flush. **Waiting on:** a flush-left placement branch.
- [ ] **The hover card's beak.** `ConnectionHoverCard` rode the picker chassis, so it lost a beak
      that used to slide along the card's edge to keep pointing at the live link. It still tracks
      the link. **Waiting on:** a ruling — restore it as the one picker-family exception, or accept
      the loss as landed.
- [ ] **The `PaneSlider` panes under auto-centring.** Add Property, the block handle menu and the
      tile Settings pane swap between panes of different widths while open, and now grow in both
      directions rather than one. **Waiting on:** use — obvious in seconds, invisible in a
      screenshot. One word per surface (`origin="left"`) if any reads unsteady.
- [ ] **PM-104's second half — one row shape for every menu model.** `{ label, action,
      separatorBefore? }` is restated in seven shared modules because `ActionItem<A>` lives in
      `main/returningMenu.ts`, where `src/shared` can't reach it. It is Electron-free and belongs in
      `shared/pageMenu.ts`, with main importing it back. The same move settles `separatorBefore` and
      the property menu's `destructive`, which both mean "a divider goes above this row".
      **Waiting on:** nothing — untouched by the surface work, and the files are no longer open.

### Deferred By Ruling

- **`MenuSurface` keeps its beak.** The large toolbar dropdown hangs off a named button, and the
  beak points back at it. This is the line: one beaked shell for toolbar dropdowns, one beak-less
  shell for everything else.
- **The block Scale picker stays as it is.**
- **Two-option controls are out of scope by construction** — a dual-option control toggles in place
  and opens no menu.
