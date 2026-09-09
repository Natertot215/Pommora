## Slash Command Menu — Grounding

> A grounding document for a MarkdownPM-owned slash-command menu that opens through the menu door and draws natively or in-app by the Use Native Menus preference. It records what the menu system already provides, the one gap the feature meets, and the exact points where it wires in. No design decision is made here; the open questions are listed at the end.

#### What The Menu System Provides

**The door.** Every menu opens through `popMenu` in `Core/Actions/menuActions.ts`:

```ts
popMenu<A extends string>(
  items: readonly ActionItem<A>[],
  trigger?: HTMLElement | null,
  options?: { solid?: boolean; stay?: (action: A) => readonly ActionItem<A>[]; compact?: boolean },
): Promise<A | null>
```

No trigger means a context menu at the cursor, native always, over the `menu` channel. A trigger means a list hanging from a control: native when the preference is on, otherwise the in-app presenter. The door strips a leading `separatorBefore`, resolves `null` on an empty list, and returns the picked action or `null` on dismissal. `solid` draws the pane on window glass, `compact` drops the presenter's width floor and cap, and `stay` lets a row run its action and redraw the pane in place instead of closing.

**The model.** `ActionItem<A>` in `Core/Actions/menuModel.ts` carries `label`, `action`, `icon` (a registry name as a string), `separatorBefore`, `disabled`, `checked`, `stay`, and `submenu`. Every menu model lives in `Core/Actions` beside it (`gripMenu`, `tableMenu`, `citationMenu`, `connectionMenu`, `tileHandleMenu`'s model in `Core/Tiles`). `Core/Actions` sits in the engine graph, so a model imports no React and nothing from `Core/Interface`.

**The presenter.** `Core/Interface/Menus/MenuPresenter.tsx` is mounted once in `App` and draws whatever the slice's `pendingMenu` holds: a `PickerMenu` centered under the request's trigger, each drill level in its own `MenuScrollFrame` with a back row, `MenuItem` rows with leading icons, `PickerRow` rows with the ring for `checked`, `disabled` rows dimmed. It reads the request through `presentMenu(items, trigger, options)` in `Core/Session/chromeSlice.ts`.

**The native side.** `Desktop/Actions/menu.ts` answers the `menu` channel: `rowTemplate` converts the same tree to an Electron template, and `anchorPoint` converts the request's `MenuAnchor` (`left`, `top`, `height` in CSS pixels) to the window's DIPs so the OS menu opens under the anchor. `Desktop/Actions/menu.test.ts` deep-equals the native template against the presenter's `menuRows` projection from one fixture, so a row shape that renders differently on the two paths fails there.

**Chords.** `Core/Actions/commands.ts` holds the one table, `DEFAULT_COMMANDS`, with the seven `format:*` ids among its twenty-two. `FORMAT_ACTIONS` in `Core/MarkdownPM/Input/formatKeymap.ts` is the format roster derived from it, and `toKeyBinding` and `toAccelerator` spell a chord for CodeMirror or Electron. A slash menu that lists formatting actions can show each row's chord from the table.

**Dismissal.** `UIX/Interactions/dismissalStack.ts` orders every layer; `PickerMenu` joins it with its own shield, Escape closes the newest layer, an outside press closes what the press falls outside of, and a press on an open menu's own trigger closes it. The editor's keymap runs at the editor element before the stack's document listener and wins where it prevents the default.

#### The Editor's Boundary

MarkdownPM reaches the application only through the `EditorHost` object in `Core/MarkdownPM/api.ts`, built by `useEditorHost` in `Core/Pages/editorHost.tsx`. Its `menus` member is where the editor's menus already live:

```ts
menus: {
  grip: (ctx) => popMenu(gripMenuItems(ctx)),
  table: (ctx) => popMenu(tableMenuItems(ctx)),
  citation: (ctx) => popMenu(citationMenuModel(ctx)),
  format: inert ? undefined : nativeEditorMenu,
}
```

The editor never imports `Core/Session/store` and never reaches `MenuDoorContext`: React context does not cross the detached roots `Core/MarkdownPM/Widgets/reactWidget.ts` mounts, and the host object is the injection boundary. A new editor menu is a new member of `menus`, filled by `editorHost.tsx`, mirrored in `Core/MarkdownPM/editorHarness.ts` for the tests.

The editor's actions already have one runner: `applyEditorAction(view, raw)` in `Core/MarkdownPM/Menus/menu.ts` takes an action string carrying `EDITOR_ACTION_PREFIX` (`mdpm:`) and applies it to the view; the format keymap and the editor's context menu both resolve through it.

#### The Precedent For A Caret-Anchored Pane

`Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts` watches the document for the `[[` grammar, computes the caret's geometry from `view.coordsAtPos(sel.head)` and the editor's horizontal bounds, and `AutocompletePane.tsx` draws a `PickerMenu` from that rect through `anchorX`, `anchorY`, `anchorHeight`, and `bounds`, with no `onDismiss` and no focus management because the editor's keymap owns the arrows, Return, and Escape. That pane is the editor's own and never goes through the door; it filters as the user types, which a door menu does not do.

#### The Gap

The door takes an element as its trigger, and a caret has no element. `MenuAnchor` already describes a rect, `anchorPoint` already places the native menu from one, and `PickerMenu` already accepts a rect through `anchorX`, `anchorY`, and `anchorHeight`. What is missing is the door and the presenter accepting a rect where they accept an element. The plan that built the door cut that union for having no writer; the slash menu is the writer.

The least change is to widen the trigger's type and let each side read what it needs:

```ts
// Core/Actions/menuActions.ts
popMenu(items, trigger?: HTMLElement | MenuAnchor | null, options?)
// native: anchor: trigger instanceof HTMLElement ? rectOf(trigger) : trigger
// in-app: presentMenu(rows, trigger, options)

// Core/Session/chromeSlice.ts — MenuPending.trigger: HTMLElement | MenuAnchor

// Core/Interface/Menus/MenuPresenter.tsx
// an element → triggerRef as today; a rect → anchorX/anchorY/anchorHeight on PickerMenu
```

`MenuDoor` in `UIX/Pickers/PickerControl.tsx` keeps its element signature; the picker never passes a rect. The stack's trigger-press toggle keys on an element and has nothing to hold for a rect, which is right: a caret menu closes on Escape, on a pick, or on an outside press.

#### Where It Wires In

1. **The model:** `Core/Actions/slashMenu.ts` exporting `slashMenuModel(ctx): ActionItem<SlashMenuAction>[]`, built from `FORMAT_ACTIONS` with each row's label, icon, and the `mdpm:`-prefixed action `applyEditorAction` already runs, plus any non-format rows (a link insert exists as `INSERT_LINK_ACTION` in `Core/Actions/editorMenu.ts`). The model reads the chord table only to display; it imports nothing from MarkdownPM. Its test sits beside it, and one row of it joins the parity fixture in `Desktop/Actions/menu.test.ts`.
2. **The host member:** `EditorHost.menus.slash(ctx: SlashMenuContext): Promise<SlashMenuAction | null>` in `Core/MarkdownPM/api.ts`; `editorHost.tsx` fills it with `popMenu(slashMenuModel(ctx), ctx.anchor, { compact: true })`; `editorHarness.ts` stubs it.
3. **The trigger:** a CodeMirror input handler in `Core/MarkdownPM/Input/` beside `formatKeymap.ts`, watching for the grammar (`//` is the recorded choice, since a single `\` is CommonMark's escape), computing the caret rect the way `useConnectionAutocomplete` does, calling `host.menus.slash`, and applying the result through `applyEditorAction` after removing the typed trigger from the document. The handler is an `Extension` the editor mounts beside the format keymap in `MarkdownEditor.tsx` and `CellEditor.tsx`.
4. **The door and presenter:** the rect-accepting trigger described under The Gap, with one assertion in `Core/Actions/menuActions.test.ts` (a rect reaches the host as its own anchor and reaches `presentMenu` unchanged) and one in `Core/Interface/Menus/MenuPresenter.test.tsx` (a rect request positions from `anchorX`).
5. **The record:** `MarkdownPM.md` gains the menu in its input section; `ConfigurationPM.md`'s Use Native Menus row names it among the click-triggered lists; `ContextPM.md`'s Slash Commands item closes.

#### Constraints

- `Core/Actions` stays React-free and never imports `Core/Interface`; `Core/Contract/engineGraph.test.ts` goes red otherwise.
- MarkdownPM never imports `Core/Session/store`; the door is reached only through `EditorHost.menus`.
- UIX reaches nothing outside itself; the rect type the presenter reads is `MenuAnchor` from `Core/Actions`, which is fine on the Core side and never enters UIX.
- Both renderers draw from the one tree; a row that needs something only one renderer can draw is a model change and a parity-fixture change together.
- No comments; a `//` line only where a why cannot be read from the code.

#### Verification

- `npm run typecheck`, `npm run test`, `npm run lint` from the repo root, exit codes read directly.
- `rg -F "Session/store" Core/MarkdownPM --glob '!*.test.*'` → 0.
- Manual: type the trigger in a page with the preference off and pick a row; the presenter opens under the caret, the typed trigger is gone, the format applies. Repeat with the preference on; the OS menu opens under the caret. Escape closes either with the trigger removed. The same in a table cell editor.

#### Open Questions

- The trigger grammar: `//` is recorded, and whether it must sit at a word boundary or line start is not.
- Whether the menu lists only the seven format actions or also link insertion, headings, and block kinds; each extra row is an action `applyEditorAction` has to run.
- Whether the presenter's static list is enough, or the menu filters as the user types; filtering is the autocomplete pane's shape and does not go through the door.
- Whether the typed trigger is removed before the menu opens or only on a pick.
