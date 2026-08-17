## Native Menus — Execution Prompt

A self-contained brief for the session that finishes PM-104. Every claim below was verified against
the code on 08-16-2026; re-check anything you intend to lean on, but nothing here is guesswork.

---

### What Already Landed

PM-104's first half is committed (`eade51a1^..0c77a842`) and needs no revisiting:

- `PickerMenu` is the app's one rectangular, beak-less menu surface. `MenuSurface` alone keeps a
  beak, for the toolbar dropdown that hangs off a named button.
- Rows split by content: `MenuOption` (leading label, trailing accent mark on the chosen row) for a
  fixed option set, `PickerOption` (chip) for a user-authored value. `rowShell` in
  `design-system/components/menu/menu.css.ts` is the one hover-and-focus recipe both compose.
- Glass has three honest tiers — `GlassSurface` (fixed chrome, 95%, clear), `GlassPane` (floating,
  90%, clear), `GlassWindow` (that pane carrying `SOLID_FILL`).
- `PickerMenu` places itself: `origin="auto"` centres on the trigger where the whole pane fits and
  edge-anchors where centring would be clamped, decided once per open. It also takes `anchorHeight`
  (for a caret, which is a line) and `bounds` (the box a pane slides within, viewport by default).
- The wikilink autocomplete rides that same shell.

**Do not re-open any of the above.** If something there looks wrong, say so before changing it.

### The Remaining Arc, In Two Phases

The goal is one menu model with two renderers — an in-app pane and an OS menu — chosen by a setting.
Phase 1 is the prerequisite and is worth doing even if Phase 2 never ships.

---

### Phase 1 — One Row Shape For Every Menu Model

**The problem, verified.** `ActionItem<A>` is declared at `src/main/returningMenu.ts:45`:

```ts
export interface ActionItem<A> {
  label: string
  action: A
  separatorBefore?: boolean
  disabled?: boolean
}
```

It lives in `src/main`, so `src/shared` cannot import it — and `src/shared` is where the menu models
actually live. So the same shape is hand-restated across the shared modules. Confirmed sites:

- `src/shared/cardMenu.ts:24`
- `src/shared/cellMenu.ts:48`
- `src/shared/columnMenu.ts:57` and `:67`
- `src/shared/connections.ts:165`
- `src/shared/pageMenu.ts:101`, `:142`, `:149`
- `src/shared/rowGripMenu.ts:20`
- `src/shared/viewRowMenu.ts:20`

`ActionItem<A>` is Electron-free — it imports nothing. It belongs in `src/shared/pageMenu.ts`, with
`src/main/returningMenu.ts` importing it back.

**The second vocabulary.** Two words mean "a divider goes above this row", each with its own
expander in main:

- `separatorBefore` → expanded at `src/main/pageMenu.ts:16`
- `destructive` (declared `src/shared/propertyMenu.ts:25`) → expanded at `src/main/propertyMenu.ts:19`

`destructive` carries a second meaning at its call site — main gates it behind a confirm dialog — so
this is **not** a pure rename. Decide deliberately whether the confirm gate rides a separate field
or stays keyed to the same word, and say which before changing it.

**Scope guard.** `src/main/styleMenu.ts:40` also expands `separatorBefore`, and its comment notes
Electron scopes radio groups per separator run. Read it before touching separator expansion.

**Gates for Phase 1:** the shared menu modules have real tests (`pageMenu.test.ts`,
`propertyMenu.test.ts`, `cardMenu.test.ts`, `cellMenu.test.ts`, `columnMenu.test.ts`,
`rowGripMenu.test.ts`, `viewRowMenu.test.ts`). They should keep passing untouched; if one needs
editing, that is a signal the shape changed rather than consolidated.

---

### Phase 2 — Use Native Menus

**The seam that makes this possible.** `popReturningMenu` (`src/main/returningMenu.ts:11`) gives
every native menu the signature `(ctx) => Promise<A | null>`: the renderer asks, main pops the OS
menu, the chosen action returns, dismissal resolves `null`. There are **22 reply-bearing menu
channels** in `src/shared/bridge.ts` on that pattern.

An in-app renderer with that same signature can therefore substitute for a native one at the call
site, with no caller knowing which it got. **That is the whole design.** Build the switch at that
seam, not inside each menu.

**What currently chooses.** Right-click gestures pop native menus; click-driven affordances open
`PickerMenu`. This split is deliberate and correct today — do not treat the native count as debt.
The setting's job is to let a user move the *click-driven* ones over to the OS as well.

**What can and cannot cross over.** Only menus that are pure row lists can become an OS menu. From
the PM-104 sweep:

- **Can:** everything `PickerControl` opens (fourteen call sites — Number Format, Decimals,
  Currency, Date · Day · Time, URL Format, Card Banner, Default Format, the Sorting and Grouping
  panes' Order rows), the view ⋮ menu, the block Style rows.
- **Cannot:** the icon grid, the colour swatch grid, `CalendarPicker`, `TextPicker`, the
  `ConnectionHoverCard`, and anything holding a `PaneSlider` (Add Property, the block handle menu,
  the tile Settings pane). These are surfaces, not row lists, and an OS menu cannot draw them.

Name this boundary explicitly in whatever you build — a menu that *can't* go native must not
silently ignore the setting.

**The setting itself.** Per-Nexus personalization booleans live in `src/shared/types.ts` (see
`connectionsOpenInPreview:108`) and surface in `src/renderer/src/Settings/NexusSettings.tsx` (see
the row at `:111` for the shape). Follow that pattern rather than inventing one.

**Ask before designing.** How the setting reads in Settings — its label, its caption, and whether it
is a switch or something else — is a design decision. Disclose the proposed wording and behaviour
and get a ruling before building it.

---

### Open Decisions To Raise, Not Resolve

1. Does `destructive` keep its confirm-gate meaning, or does that split into its own field?
2. When Native Menus is on, do the menus that *can't* cross over stay as in-app panes silently, or
   is that a state worth surfacing?
3. Is this a per-Nexus setting or a per-machine one? Native menus are an OS-appearance preference,
   which argues for device-local (`nexus.db`) rather than the Nexus's own personalization.

---

### House Rules That Bite Here

- **`src/shared` holds no fs, no React, no Electron.** That constraint is exactly why `ActionItem`
  is stranded; do not solve it by relaxing it.
- **Every IPC channel is declared once in `src/shared/bridge.ts`**, both sides derive from it, and a
  mismatched end is a compile error. Data channels return the `Result` envelope and never throw.
- **Never two writers for one thing** — this whole phase is that rule being collected on.
- **Comments explain why only**, and never restate a value their own declaration holds.
- **`src/main` and `src/preload` do not hot-reload.** A new IPC channel or native-menu row needs the
  dev process restarted, not a ⌘R.

### Gates

From `Pommora/`: `npm run typecheck` (both tsconfig projects — the only type gate), `npm run test`,
`npm run lint` (Biome; a new diagnostic means not done), and `node scripts/check-atlas.mjs` if any
`SOURCE:`-tagged doc table is touched. Read the summary line rather than trusting an exit code.

### Verification

**Do not drive a browser or take screenshots.** Nathan verifies visuals himself — build it, then
hand over exactly what to look at and where. Behavioural decisions (which renderer a call site got,
whether a model expands to the right rows) belong in tests; pixels do not.

### Documentation To Reconcile When It Lands

- `.claude/Features/DesignSystemPM.md` §Component Chrome — the two-menu-shell bullets.
- `.claude/Features/InteractionPM.md` §Dropdown — placement and the shells.
- `.claude/Features/ConfigurationPM.md` — if the setting is per-Nexus.
- `.claude/ContextPM.md` §Immediate Work owns the row-shape item; retire it there when it lands.
- `.claude/Planning/PopoutMenu — Tasks.md` — the arc's tracker.

### Still Open From PM-104's First Half

Three visual calls await Nathan and are unrelated to this work: the hover card's lost beak (a
ruling), `PhotoCropModal`'s tier change, and the `PaneSlider` panes under auto-centring. Don't fold
them in.
