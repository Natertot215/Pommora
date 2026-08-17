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
- [x] **The autocomplete rides the shared pane.** It centres on the caret and slides within the
      editor's nearest scrolling ancestor — the detail pane in the main window, a floating window's
      body inside one, a tile's own box on a dashboard — rather than the viewport. `PickerMenu`
      gained `anchorHeight`, since a caret is a line and a pane flipping above a zero-height point
      lands back on it, and `bounds`, the box a pane slides within.

### Open

- [ ] **The hover card's beak.** `ConnectionHoverCard` rode the picker chassis, so it lost a beak
      that used to slide along the card's edge to keep pointing at the live link. It still tracks
      the link. **Waiting on:** a ruling — restore it as the one picker-family exception, or accept
      the loss as landed.
- [ ] **`PhotoCropModal` on the window tier.** It moved from clear chrome to a filled window — the
      one consumer whose TIER changed rather than its name. **Waiting on:** a look.
- [ ] **The `PaneSlider` panes under auto-centring.** Add Property, the block handle menu and the
      tile Settings pane swap between panes of different widths while open, and now grow in both
      directions rather than one. **Waiting on:** use — obvious in seconds, invisible in a
      screenshot. One word per surface (`origin="left"`) if any reads unsteady.
- [ ] **PM-104's second half — one row shape for every menu model.** Stated in full in
      `ContextPM.md` §Immediate Work, which owns it. Named here only because it belongs to the same
      PM number. **Waiting on:** nothing — untouched by the surface work, and it never depended on
      it.

### Deferred By Ruling

- **`MenuSurface` keeps its beak.** The large toolbar dropdown hangs off a named button, and the
  beak points back at it. This is the line: one beaked shell for toolbar dropdowns, one beak-less
  shell for everything else.
- **The block Scale picker stays as it is.**
- **Two-option controls are out of scope by construction** — a dual-option control toggles in place
  and opens no menu.
