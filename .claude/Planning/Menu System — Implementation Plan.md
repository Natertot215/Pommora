## Menu System — Implementation Plan

> **Status:** Ratified — in execution · Spec: audit topic 5 (`Codebase Audit — Report.md`) plus the rulings of 09-08-2026 recorded under Rulings · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

One menu system with one door, one model, and two renderers that cannot drift. Afterward every menu in Pommora opens through `popMenu`; a right-click on content is the operating system's menu, and a menu hanging from a control draws natively or in-app by the Use Native Menus preference, from the same `ActionItem` tree. The tile handle menu is an ordinary consumer of that door instead of a second hand-built pane; `PickerControl` is another. Every piece of plumbing that existed only because a menu was native and that the platform already performs is gone. Escape has one arbiter for dismissal, and every keyboard chord has one table, live in every reader.

The shape was settled against the alternative the audit's own ruling implied, in-app by default with native optional. Nathan ruled the inverse: a right-click on content stays native always because Pommora never paints its own menu for a right-click action, and the preference is about click-triggered lists (pickers, the tile handle, a future slash-command menu), whose correctness for future consumers matters more than the two that exist today. The presence of a trigger element is what distinguishes the two, and that rule is the door's contract. The editor's own right-click menu (spelling, Speech, Share) stays Electron-built for the same reason.

Deliberately not solved here: touch reachability of content right-click menus (a mobile host answers the `menu` channel with its own native menu), and the Mobile package itself.

**Requirements**

1. One door, `popMenu`, in `Core/Actions/menuActions.ts`; no trigger means native at the cursor, a trigger means the preference decides. Every current `popRowMenu` caller goes through it unchanged in behavior.
2. One in-app presenter, `MenuPresenter`, drawing any `ActionItem` tree: drill-in submenus, each level capped and scrolling on its own, leading icons, and rows carrying `checked` drawn as `PickerRow`s with the ring.
3. One test proving both renderers draw the same rows from one model.
4. The tile handle menu has one definition, `tileMenuItems`, and opens through the door on click and right-click alike. Lock is a row, Scale is a checked submenu, the title is an icon row whose action opens the page, "+ Custom" is a separated last row. The grip stays pinned until the door's promise settles, on both paths.
5. `PickerControl` opens its list through the door; its own `PickerMenu` list is gone.
6. The connection menu model lives in `Core/Actions` beside the other models; its presenter stays in `Core/Interface/Menus`.
7. The six window-level Escape listeners join the dismissal stack for Escape; the most recently opened layer dismisses first; each site's own outside-press behavior is kept as it is; the gesture engine's capture-phase swallow stays as drag-cancel.
8. One chord table in `Core/Actions/commands.ts` that the native application menu, the editor's keymap, the editor's context-menu display, and every renderer key handler derive from; one chord parser; no chord literal outside the table; every id rebindable from `settings.json`, the format chords included.
9. Dead fields and dead code deleted: `ActionItem.confirm`, `MenuAnchor.width`, `useNativeMenus`, `NativePickerContext`, the tile pane and its stylesheet, `Desktop/Actions/accelerators.ts`, the leading-separator rule's second writer.
10. The grip-hot stand-down chain deleted: the renderer's `preventDefault` on `contextmenu` already withholds main's `context-menu` event, which the citation and link right-clicks have relied on since they shipped.

**Acceptance — the whole thing working:** with Use Native Menus off, clicking a tile handle and a Settings picker each open an in-app pane drawn by `MenuPresenter`, centered under its trigger, whose rows match `tileMenuItems` and the picker's options; with it on, the same two clicks open anchored system menus with the same rows; a right-click on a sidebar row opens a system menu either way; a right-click on a block grip opens the grip's menu and never the editor's; with a glance pinned and then a tile put in edit, Escape leaves the edit first and closes the glance second; and ⌘N still opens a tab and ⌘B still bolds after no file but `commands.ts` spells a chord.

**Forced By**

- UIX reaches nothing outside itself → `PickerControl` receives the door through a React context App provides, never by import (Task 3).
- `Core/Actions` sits in the engine graph (`bridge.ts` imports `menuModel.ts`; `codec.ts` imports `commands.ts`), and `Core/Testing/engineGraph.ts` follows type-only imports → the model's icon is a `string`, not `IconName`, and `chords.ts` joins the engine test's UIX allowlist (Tasks 1, 8).
- `FrameSlide` never caps or scrolls a slot (`frame-slide.tsx:9`) → each presenter level wraps its own `MenuScrollFrame`, and `PickerMenu` is given no `maxHeight`, `header`, or `footer` (Task 2).
- `PickerMenu` holds only `children` through its exit (`picker-base.tsx:145`); `triggerRef` and `open` read live → the presenter keeps `useHeld` over its pending request (Task 2).
- The dismissal stack's outside press is button 0 only (`dismissalStack.ts:37`), while three of the six Escape sites clear on any button → those sites keep their own pointerdown listeners and join the stack for Escape alone (Task 7).
- `formatKeymap.ts:16` is a module-level `keymap.of`, evaluated at import → the format chords are live only through a `Compartment`, which `MarkdownEditor.tsx:119` already uses for read-only (Task 8).
- `refreshMenu()` at `Desktop/main.ts:140` rebuilds the application menu at startup and on adopt → native accelerators read the session's commands there; a rebind reaches the native menu at the next adopt or launch (Task 8, Ruling 6).

**Inherited Reasoning**

- The audit's item 4 claimed the connection menu model was mixed into its presenter. It isn't: the model is `Core/MarkdownPM/Links/connMenu.ts`, the presenter is `Core/Interface/Menus/connectionMenu.ts`. Item 4 is a relocation.
- The audit's ruling that `popRowMenu` honors the preference was read as "the preference governs right-click." Nathan corrected it: the preference governs click-triggered lists, a right-click on content is native always.
- In-app by default with native optional was weighed and rejected; it would have made every content right-click a Pommora-painted pane.
- `presentRowMenu` has zero production callers and `RowMenuHost` has rendered `null` since it was written. The in-app half was built and never wired; this plan wires it rather than deleting it.
- A `MenuTrigger` union (element or rect) with an `origin` option was drafted for a future caret-anchored consumer and cut: it had no writer, `PickerMenu` centers from an element's width, and both live consumers already center from an element.
- A per-level "all rows checked" rule for choice sets was drafted and cut: the native renderer decides per row, and mixed levels exist (`columnMenu.ts:101`, `tableMenu.ts:56-61`).
- A CDP experiment to learn whether main's `context-menu` event fires past a renderer `preventDefault` was drafted and cut: `citationPointer.ts:165` and `pointerPath.ts:92` already prevent the default on editable targets and pop renderer menus with no stand-down flag, so if main fired anyway every footnote and link right-click would show two menus today.
- Moving the three any-button outside-press sites onto the stack's outside press was drafted and cut: it would leave a table selection live under a right-click and let ⌘C copy the wrong thing.

**Grounding**

- `Core/Actions/nativeMenus.ts` — the door today; 21 lines; `popRowMenu` never reads the preference.
- `Core/Actions/menuModel.ts` — `ActionItem`, `afterSeparator`, `MenuAnchor`, `RowMenuRequest`; `confirm` and `width` have no reader.
- `Core/Session/chromeSlice.ts` — `presentRowMenu` and `pendingRowMenu`, the pending-promise pattern the confirm dialog also uses.
- `Core/Interface/Menus/RowMenuHost.tsx`, `rowMenuRows.ts` — the dead in-app renderer; mounted at `Core/Interface/App.tsx:184`; `rowMenuRows.ts:10` and `Desktop/Actions/rowMenu.ts:49` are two writers of the leading-separator rule.
- `Desktop/Actions/rowMenu.ts`, `returningMenu.ts` — the native renderer and its returning promise; `anchorPoint` is the CSS-px to DIP conversion and reads `left`, `top`, `height`.
- `Core/Tiles/TileHandleMenu.tsx` (413 lines), `handle-menu.css.ts`, `TileHost.tsx:187-201, 306-343, 358-379` — the twice-defined menu and its host wiring; the pane opens `origin="center"` at `:388` with no `maxHeight`, each `DrillLevel` wrapping its own `MenuScrollFrame` with the back row as its header (`:147-186`).
- `Core/Tiles/TileGrid.tsx:143-152` — `onHandleMenu` fires on click and on contextmenu with the same `currentTarget`.
- `UIX/Pickers/PickerControl.tsx` — `NativePickerContext`, its own `PickerMenu` list at lines 124-149 opening `origin="center"`; three consumers pass `solid`; the `<span ref>` wraps both branches and is never unmounted while the button exists.
- `UIX/Pickers/picker-base.tsx` — `PickerMenu` centers from `triggerRef` width (`:195`), holds `children` through exit (`:145`), DEV-guards an unmount mid-exit (`:126`); `PickerRow` has no `disabled` prop (`:411-425`).
- `UIX/Menus/frame-slide.tsx:9` — a slot never caps or scrolls; it wraps its own `MenuScrollFrame`.
- `UIX/Symbols/index.tsx:171, 181` — `IconName`, `iconNameOr(value, fallback)`.
- `UIX/Interactions/dismissalStack.ts` — `pushDismissal`, `useDismissal`, LIFO Escape in push order, capture-phase outside press for button 0; a `layer` returning null holds nothing.
- `UIX/Interactions/chords.ts:14-34` — `chordOf`, the memoized parser of the `cmd+shift+k` grammar; `matchesCommand`.
- `Core/Contract/engineGraph.test.ts:15-19` — the engine's UIX allowlist is three pure files, compared sorted.
- `Core/MarkdownPM/Input/formatKeymap.ts:8-16`, `MarkdownEditor.tsx:119` — the module-level format keymap; the read-only `Compartment`.
- `Desktop/main.ts:140, 262, 315` — `refreshMenu()` and its two callers.
- `Core/MarkdownPM/Citations/citationPointer.ts:165`, `Core/MarkdownPM/Gestures/pointerPath.ts:92` — renderer `preventDefault` on `contextmenu` over editable content, with no stand-down flag.
- `Core/MarkdownPM/blockHandles.ts:40-54` — `setHot` (`:43-48`) paints the hot grip; `report` (`:41, :49-54`) is the main-side flag.
- `Core/Actions/commands.ts`, `Core/Settings/codec.ts:116-124`, `Core/Actions/editorMenu.ts:27-42`, `Desktop/Actions/accelerators.ts`, `Desktop/Actions/appMenu.ts:57-141`, `Core/Interface/App.tsx:76-92`, `Core/Navigation/TabBar.tsx:94-100`, `Core/Properties/valueUndo.ts:11` — every chord spelling.
- The six Escape listeners: `Core/Tiles/TileHost.tsx:141-154`, `Core/Interface/Glance/GlancePane.tsx:452-463`, `Core/Interface/Glance/glanceAction.ts:76-82`, `Core/MarkdownPM/Embeds/embedWidget.tsx:543-563`, `Core/MarkdownPM/Tables/MarkdownTable.tsx:222-268`, `UIX/Windows/window-base.tsx:145-152`.
- `.claude/Features/SurfacePM.md:24, 34, 36`, `ConfigurationPM.md:23`, `DesktopPM.md`, `MarkdownPM.md:86` — the claims this plan touches.

**Environment:** Plan directory `.claude/Planning/`. Explorer: general-purpose Opus. Simplification: `.claude/agents/code-simplifier.md`. Attack: `.claude/agents/build-breaking-agent.md`. Code reviewer: general-purpose Opus scoped to correctness. Neutral verifier: general-purpose Opus. Gates from `package.json`: `npm run typecheck`, `npm run test`, `npm run lint`. Rules: `.claude/Guidelines/`.

**Shapes:** removal · refactor · fix · user-visible

**Declared Stops**

- Gate 1 — the tile handle menu and the Settings pickers are the two surfaces whose look changes; Nathan sees them before the residue phases build on the presenter.

**Global Constraints (every task inherits these)**

- Gates: `npm run typecheck`, `npm run test`, `npm run lint`, each read directly, never piped. Biome formats every write through the hook; a shell edit is followed by `npm run format`.
- `Core/Actions` imports no React and nothing from `Core/Interface`. UIX imports nothing outside UIX. Desktop is the only caller of Electron. `Core/Contract/engineGraph.test.ts` stays green.
- Comments are `//` full lines, only where the why can't be inferred. Nothing labels a state as pending or describes what used to be there.
- Naming: component `.tsx` PascalCase, `.ts` camelCase.
- Commit per task with `git commit --only -- <paths>`; new files `git add`ed first. No History entry for this plan.
- Out of scope everywhere: `Showcase/`, `Mobile/`, the editor's Electron-built context menu, touch gestures.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `SurfacePM.md:34` | "whose rows are the tile's linking, style, and Scale entries over a pinned **Lock** footer" | Lock becomes a row | 4 |
| `SurfacePM.md:36` | "while the footer stays live to unlock" | no footer | 4 |
| `SurfacePM.md:24` | "both menu presenters, the menu model" | one presenter | 4 |
| `ConfigurationPM.md:23` | "Draws plain-list menus as system menus" | true for click-triggered lists; the row says so | 3 |
| `DesktopPM.md:26` | "`rowMenu.ts` is the one popper" and "A host without a popper answers the same channel with the in-app presenter" | the popper is `menu.ts`; the channel is native-only and the door reaches the presenter inside the renderer | 2 |
| `ConnectionsPM.md:34` | "`Core/MarkdownPM/Links/connMenu.ts`" | the model moved | 5 |
| `MarkdownPM.md:86` | the paragraph's implication that main must be told to stand down | the chain is gone | 6 |
| `Codebase Audit — Report.md` topic 5, R-21 to R-24, Appendix C's Use Native Menus line | the whole topic | delivered, removed rather than amended | 9 |
| Audit artifact `a9f3a52c` | its topic 5 section | same | 9 |

**Dead Vocabulary**

- `popRowMenu` → 0. `Actions/nativeMenus` → 0. `RowMenuHost` → 0. `rowMenuRows` → 0. `presentRowMenu` → 0. `pendingRowMenu` → 0. `row-menu` → 0, tests included. `NativePickerContext` → 0. `TileHandleMenu` → 0. `handle-menu.css` → 0. `acceleratorFor` → 0. `useNativeMenus` → 0. `connMenuModel` → 0. `FORMAT_CHORDS` → 0. `menuTemplate` → 0. `gripHot` → 0. `editor:grip-hot` → 0. `HOT_MENU_LINES` → 0. `md-grip-hot`, the class `setHot` paints, survives.
- Control: `ActionItem` → 100+. Zero here means the sweep never ran.

---

### Phase 1 — One Door, One Presenter

#### Task 1: The model carries what both renderers read

**Requirement:** 2, 9

**Why:** The presenter draws icons and the native renderer ignores them; `confirm` and `width` are read by nobody. The model has to say exactly what a renderer may draw before Task 2 builds two of them from it.

**Now** — `Core/Actions/menuModel.ts`, 28 lines:

```ts
export interface ActionItem<A> {
  label: string
  action: A
  separatorBefore?: boolean
  disabled?: boolean
  confirm?: boolean
  checked?: boolean
  submenu?: ActionItem<A>[]
}
export function afterSeparator<A>(rows: readonly ActionItem<A>[]): ActionItem<A>[]
export interface MenuAnchor { left: number; top: number; width: number; height: number }
export interface RowMenuRequest { items: readonly ActionItem<string>[]; anchor?: MenuAnchor }
// confirm set only at Core/Actions/optionMenu.ts:11-12, read only by optionMenu.test.ts:22
// width populated at nativeMenus.ts:18 and by two test fixtures (RowMenuHost.test.tsx:24, rowMenu.test.ts:10,17), read nowhere
```

**Becomes**

```ts
// Core/Actions/menuModel.ts
export interface ActionItem<A> {
  label: string
  action: A
  separatorBefore?: boolean
  disabled?: boolean
  checked?: boolean
  // A registry icon name, drawn by the in-app presenter; an OS menu draws its own marks. A string, since this file sits in the engine graph and IconName would pull the registry in.
  icon?: string
  submenu?: ActionItem<A>[]
}
export function afterSeparator<A>(rows: readonly ActionItem<A>[]): ActionItem<A>[]  // unchanged

// Viewport-relative CSS pixels; the host converts to DIPs.
export interface MenuAnchor { left: number; top: number; height: number }
export interface MenuRequest { items: readonly ActionItem<string>[]; anchor?: MenuAnchor }
```

**Assumed by:** Tasks 2, 3, 4.

**Verify — Automated**

- [x] `rg -F "confirm?:" Core/Actions` → 0 and `rg -F ".confirm" Core/Actions Desktop/Actions Core/Interface/Menus` → 0 after; the `optionMenu.test.ts:22` assertion removed in the same commit. Control: `rg -F "checked" Core/Actions` → 10+.
- [x] `rg -F "width" Core/Actions/menuModel.ts` → 0.
- [x] Gates green, `engineGraph.test.ts` included.

**Verify — User**

- [ ] *(none — nothing draws yet)*

#### Task 2: The door, the channel, and the presenter

**Requirement:** 1, 2, 3, 9

**Why:** This is the single source of truth the whole plan exists for. After it, a menu is one `popMenu` call, and which renderer draws it is the door's business alone.

**Now** — `rg -F "popRowMenu(" Core --glob '!*.test.*'` → 36 sites, one with a trigger (`TileHost.tsx:327`); `rg -F "'row-menu'" Core Desktop --glob '!node_modules' --glob '!out'` → 3 production lines plus 18 test-stub lines across 13 test files:

```ts
// Core/Actions/nativeMenus.ts — 21 lines
export function useNativeMenus(): boolean
export async function popRowMenu<A extends string>(items, trigger?: HTMLElement | null): Promise<A | null>
// Core/Contract/bridge.ts:233
'row-menu': { args: [req: RowMenuRequest]; reply: Result<string | null> }
// Core/Actions/handlers.ts:5 · Desktop/main.ts:237 (ctx.menu → popRowMenu(win, req))
// Core/Session/chromeSlice.ts:6-11, 16-18, 26, 41-50, 59-60 — RowMenuPending, presentRowMenu, pendingRowMenu
// Core/Interface/Menus/RowMenuHost.tsx (63): Level with its own FrameSlide, no scroll frame; PickerMenu origin="left" from anchor coordinates; useHeld
// Core/Interface/Menus/rowMenuRows.ts (21): drops a leading separator at i === 0
// Desktop/Actions/rowMenu.ts (58): anchorPoint, rowTemplate, menuTemplate (drops a leading separator again), popRowMenu(win, req)
```

**Becomes**

```ts
// Core/Actions/menuActions.ts (replaces nativeMenus.ts)
// No trigger: a context menu at the cursor, native always. A trigger: a list hanging from a control, native or in-app by the Use Native Menus preference.
export async function popMenu<A extends string>(
  items: readonly ActionItem<A>[],
  trigger?: HTMLElement | null,
): Promise<A | null>
// items normalized once here: a leading separatorBefore is dropped, so both renderers expand verbatim
// !trigger || useSession.getState().devicePrefs.nativeMenus → host().ask('menu', { items, anchor: trigger ? rectOf(trigger) : undefined })
// otherwise → useSession.getState().presentMenu(items, trigger)

// Core/Contract/bridge.ts
'menu': { args: [req: MenuRequest]; reply: Result<string | null> }
// Core/Actions/handlers.ts: 'menu' · Desktop/main.ts: menu: (req) => win ? popNativeMenu(win, req) : Promise.resolve(null)
// every test stub of 'row-menu' → 'menu'

// Core/Session/chromeSlice.ts
pendingMenu: { id: number; items: readonly ActionItem<string>[]; trigger: HTMLElement; settle: (action: string | null) => void } | null
presentMenu: (items, trigger: HTMLElement) => Promise<string | null>
// resetChrome settles pendingMenu with null

// Core/Interface/Menus/menuRows.ts (replaces rowMenuRows.ts) — the presenter's pure projection, verbatim
export type PresenterRow<A> =
  | { kind: 'separator' }
  | { kind: 'choice'; label: string; checked: boolean; disabled?: boolean; icon?: string; action: A }
  | { kind: 'item'; label: string; disabled?: boolean; icon?: string; action: A; submenu?: ActionItem<A>[] }
export function menuRows<A extends string>(items: readonly ActionItem<A>[]): PresenterRow<A>[]
// checked !== undefined → 'choice', as Desktop's nativeRow decides per row

// Core/Interface/Menus/MenuPresenter.tsx (replaces RowMenuHost.tsx; mounted where it was)
export function MenuPresenter(): React.JSX.Element
// const shown = useHeld(pending, pending !== null)
// <PickerMenu open={pending !== null} onDismiss triggerRef={{ current: shown.trigger }} origin="center">  — no maxHeight, header, or footer
// Level: FrameSlide root/detail as today; each level wraps its own <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT} header={<MenuTopRow/> when nested}>
// 'choice' → PickerRow ring selected leading={icon}; 'item' → MenuItem leading={icon} trailing chevron when submenu
// icon resolved with iconNameOr(icon, <an existing registry name>)

// Desktop/Actions/menu.ts (replaces rowMenu.ts)
export function anchorPoint(win, anchor): { x; y } | undefined       // unchanged
export function rowTemplate<A>(items, pick): MenuItemConstructorOptions[]  // unchanged, now the only template
export function popNativeMenu(win: BrowserWindow, req: MenuRequest): Promise<string | null>
// menuTemplate deleted

// Desktop/Actions/menu.test.ts (from rowMenu.test.ts) — requirement 3:
// one fixture tree with a separator, a submenu, a checked row, a disabled row, an icon;
// project rowTemplate(fixture) and menuRows(fixture) onto { label | 'separator', disabled, checked, depth } and deep-equal them
```

Every one of the 36 callers becomes `popMenu(...)` with the same arguments. `App.tsx:75` and the `NativePickerContext` provider change in Task 3.

**Assumed by:** Tasks 3, 4, 5, 6.

**Verify — Automated**

- [x] Red first: `menu.test.ts` fails on module not found; `MenuPresenter.test.tsx` (moved from `RowMenuHost.test.tsx`) fails on the `presentMenu` name; then green.
- [x] `MenuPresenter.test.tsx` asserts a checked row renders `PickerRow` beside an unchecked `MenuItem` in the same level; asserts an icon reaches the row's leading slot; asserts a dismissal keeps the rows drawn through the exit.
- [x] `menuActions.test.ts` asserts a tree whose first row carries `separatorBefore` reaches the presenter without it, and that a trigger with the preference off reaches `presentMenu` while no trigger reaches the host.
- [x] `rg -F "popRowMenu" Core Desktop --glob '!node_modules' --glob '!out'` → 0. `rg -F "row-menu" Core Desktop --glob '!node_modules' --glob '!out'` → 0. `rg -F "menuTemplate" Desktop --glob '!node_modules' --glob '!out'` → 0. Control: `rg -F "popMenu(" Core --glob '!*.test.*'` → 36.
- [x] Gates green.

**Verify — User**

- [ ] *(none — no call site changes renderer until Task 3)*

#### Task 3: PickerControl opens through the door

**Requirement:** 5, 9

**Why:** A picker's list is a plain-list menu and the preference already claims it. Drawing it through the presenter deletes the second in-app list renderer and makes the preference true for pickers by construction.

**Now** — `UIX/Pickers/PickerControl.tsx`, 149 lines; `rg -F "NativePickerContext" Core UIX` → 5 lines in 2 files:

```tsx
export type NativePicker = (rows: { label: string; action: string; checked: boolean }[], trigger: HTMLElement | null) => Promise<string | null>
export const NativePickerContext = createContext<NativePicker | null>(null)
// lines 56-67 popNative; 71-73 onTrigger branches native/setOpen; 124-149 its own PickerMenu origin="center" + PickerRow list
// Core/Interface/App.tsx:75  const nativePicker = useNativeMenus() ? popRowMenu : null
// Core/Interface/App.tsx:98  <NativePickerContext.Provider value={nativePicker}>
// solid: declared at :40/:48, forwarded at :132, passed by PropertyFrame.tsx:422, LayoutFrame.tsx:171, SettingsFrame.tsx:194 to draw those three lists on WINDOW_FROST
// Core/Views/Settings/SortFrame.test.tsx:78-84 and GroupFrame.test.tsx drive the rendered list by row text (pickOption)
```

**Becomes**

```tsx
// UIX/Pickers/PickerControl.tsx
export type MenuDoor = (
  rows: { label: string; action: string; checked: boolean; icon?: string }[],
  trigger: HTMLElement,
) => Promise<string | null>
export const MenuDoorContext = createContext<MenuDoor | null>(null)
// onTrigger: a toggle flips; otherwise door(options as rows with checked on the current value, ref.current)
// no own PickerMenu; `open`, `solid`, and the PickerRow list are gone
// Core/Interface/App.tsx: <MenuDoorContext.Provider value={popMenu}>
// Core/Testing (or the nearest existing render helper): a picker test renders <MenuPresenter/> and provides popMenu, so pickOption keeps clicking rows by text
```

The row shape stays structural inside UIX, as `NativePicker` already is; `popMenu` satisfies it by assignment at the provider.

**Assumed by:** Task 9 (ConfigurationPM row).

**Verify — Automated**

- [x] `PickerControl.typeable.test.tsx`, `SortFrame.test.tsx`, `GroupFrame.test.tsx`, and any other test rendering `PickerControl` green through the shared helper; one asserts the door receives `checked` on the current value and the trigger element.
- [x] `rg -F "NativePickerContext" Core UIX` → 0. `rg -F "useNativeMenus" Core` → 0. Control: `rg -F "MenuDoorContext" Core UIX` → 3+.
- [x] `ConfigurationPM.md:23` rewritten in this commit.
- [x] Gates green.

**Verify — User**

- [x] A Settings picker (Interface Scale) opens centered under its trigger with the ring on the current value, preference off; opens as a system menu, preference on.

#### Task 4: The tile handle menu is one definition

**Requirement:** 4

**Why:** The one menu the app defined twice becomes the first ordinary consumer of the door, which is the whole point of having one.

**Now** — `Core/Tiles/TileHandleMenu.tsx` 413 lines, `handle-menu.css.ts` 59 lines, `TileHost.tsx`:

```tsx
// TileHandleMenu.tsx:51-124 tileMenuItems({ entry, pageItems, viewItems, pageInfo?: { title }, containerLocked })
//   title → { label, action: 'tile:open', disabled: true }
//   drill() ignores DrillPickItem.footer (tiles.ts:181); the pane renders footer nodes as footing buttons
//   lock → last row, separatorBefore
// TileHandleMenu.tsx:126-413 GLYPH, LOC_GLYPH, CHEVRON, DrillLevel, TileHandleMenu — the pane, origin="center"
// TileHost.tsx:187-201 handleMenu state, useNativeMenus, popNativeMenu ref, onHandleMenu, two useHeld
// TileHost.tsx:254 'handle-pinned' while handleMenu?.id === id
// TileHost.tsx:306-315 menuPageInfo (title, icon), menuLocInfo
// TileHost.tsx:316-343 popNativeMenu.current = … popRowMenu(items, el).then(dispatch)
// TileHost.tsx:358-379 <TileHandleMenu … />
// TileGrid.tsx:143-152 — click and contextmenu both call onHandleMenu(id, e)
```

**Becomes**

```tsx
// Core/Tiles/tileHandleMenu.ts (renamed from TileHandleMenu.tsx; no JSX remains)
export function tileMenuItems({ entry, pageItems, viewItems, pageInfo, containerLocked }: {
  …
  pageInfo?: { title: string; icon: string }
  …
}): { items: ActionItem<TileMenuAction>[]; picks: TilePick[] }
// title row: { label: pageInfo.title, icon: pageInfo.icon, action: 'tile:open' } — enabled
// drill(): footer nodes are split out and appended as ...afterSeparator(footerRows)
// Style, Scale: unchanged checked submenus · Lock: unchanged last row

// Core/Tiles/TileHost.tsx
const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
const onHandleMenu = useCallback((id, e) => {
  const entry = entries.get(id); if (!entry || !pickers) return
  const page = tileSourceInfo(entry, pagesById)
  const { items, picks } = tileMenuItems({ entry, ...pickers, pageInfo: page && { title: page.title, icon: entityIcon('page', page.icon, defaultIcons) }, containerLocked: hostLocked })
  setMenuOpenId(id)
  void popMenu(items, e.currentTarget).then((action) => { setMenuOpenId(null); …dispatch as today, plus 'tile:open' → page && select({ kind: 'page', id: page.id, path: page.path }) })
}, [entries, pickers, pagesById, defaultIcons, hostLocked, …])
// 'handle-pinned' while menuOpenId === id
// handle-menu.css.ts deleted; TileHandleMenu JSX deleted; useHeld import gone
```

The handle is a control, so its menu takes the trigger path on click and right-click alike, which is what it does today (Ruling 8). The pane's location line under the title does not survive as a row; SurfacePM's rewrite in this commit says the title row opens the page.

**Assumed by:** Task 9 (the audit removal); SurfacePM is rewritten in this commit.

**Verify — Automated**

- [x] `tileHandleMenu.test.ts`: red first on the title row now enabled with an icon and on a footer node becoming a separated last row; then green.
- [x] `rg -F "TileHandleMenu" Core` → 0. `rg -F "handle-menu.css" Core` → 0. `rg -F "useHeld" Core/Tiles/TileHost.tsx` → 0. Control: `rg -F "tileMenuItems" Core` → 3+.
- [x] `SurfacePM.md:24, 34, 36` rewritten in this commit.
- [x] Gates green.

**Verify — User**

- [x] Preference off: clicking a tile handle opens the presenter centered under the handle; the page's link rows drill with a back row and scroll within the cap; Style and Scale show the ring on the current value; Lock is the last row; "+ Custom" sits separated at the bottom of its level; the grip stays visible while the menu is open.
- [x] Preference on: the same click opens a system menu with the same rows.

#### Gate 1 — one door, two renderers, first consumers

- [x] Gate commands green, exit codes read directly.
- [x] Every task's **Verify — automated** list ticked, each against a result just watched.
- [x] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [x] Every task that diverged had its dependents re-derived and rewritten.
- [x] Simplification and review dispatched against `<base>..HEAD`; the reports cite files inside it.
- [x] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [x] Progress hashes filled in; lessons written into the later tasks they change.
- [x] **Declared stop.** Execution halts here until Nathan closes Task 3's and Task 4's user boxes.

---

### Phase 2 — Native Residue

#### Task 5: The connection menu model lives with the models

**Requirement:** 6

**Why:** Every other menu model sits in `Core/Actions`; one folder for models is what lets the parity test and any second renderer find them all.

**Now** — `rg -F "connMenuModel" Core` → count at execution (production and tests):

```ts
// Core/MarkdownPM/Links/connMenu.ts — imports only ../../Actions/menuModel, ../../Actions/pageMenu, ../../Properties/properties
export function connMenuModel(ctx: …): ActionItem<…>[]
// Core/Interface/Menus/connectionMenu.ts — the presenter: showConnectionMenu, popMenu at :35 and :61 after Task 2
// Core/Interface/Menus/connectionMenu.test.ts
```

**Becomes**

```ts
// Core/Actions/connectionMenu.ts (moved)
export function connectionMenuModel(ctx: …): ActionItem<…>[]
// Core/Interface/Menus/connectionMenuActions.ts (renamed presenter, beside entityMenuActions.ts and pageMenuActions.ts)
// Core/Interface/Menus/connectionMenuActions.test.ts
```

**Verify — Automated**

- [x] `rg -F "connMenuModel" Core` → 0. `rg -F "Menus/connectionMenu'" Core` → 0. Control: `rg -F "connectionMenuActions" Core` → 3+.
- [x] Gates green.

**Verify — User**

- [ ] *(none — a move)*

#### Task 6: The grip-hot chain goes

**Requirement:** 10

**Why:** Nine files tell main that a grip is hot so its editor menu stands down. Chromium already withholds main's `context-menu` event when the renderer prevents the default, and two other right-clicks in the editor have relied on that since they shipped; the chain guards a state the platform never produces.

**Now** — `rg -F "gripHot" Core Desktop --glob '!node_modules' --glob '!out'`, `rg -F "grip-hot"`, `rg -F "HOT_MENU_LINES"` → counts at execution:

```ts
// Desktop/Actions/editorMenu.ts:25-28 gripHot/setGripHot · :203 if (gripHot) return
// Core/Contract/bridge.ts:240 'editor:grip-hot' · Desktop/main.ts:271 tells entry
// Core/MarkdownPM/api.ts:71 menus.gripHot · Core/Pages/editorHost.tsx:93 · Core/MarkdownPM/editorHarness.ts:89
// Core/MarkdownPM/MarkdownEditor.tsx:23 HOT_MENU_LINES import, :238-242 blockGripHover(…, report)
// Core/MarkdownPM/blockHandles.ts:41, :49-54 report and its four call sites — setHot at :43-48 stays, it paints the hot grip
// Core/MarkdownPM/Menus/gripMenu.ts:1 file-head comment · :20 HOT_MENU_LINES · :107, :180 host.menus.gripHot(false)
// Core/MarkdownPM/folding … foldState.test.tsx:24, 278, 286 reference HOT_MENU_LINES
// Core/Tiles/SpaceMenu.tsx:50 — a comment claiming preventDefault can't stop main's menu; :51's guard is correct on its own (an input mid-rename needs native Cut/Copy/Paste)
// gripMenu.ts:130 bails on readOnly without preventDefault: on a read-only surface a gutter right-click shows nothing today, because the flag stood main down
```

**Becomes** — the chain deleted end to end; `setHot` and the `md-grip-hot` class stay; `SpaceMenu.tsx:50`'s comment goes and its guard stays; `MarkdownPM.md:86` rewritten in this commit.

**Verify — Automated**

- [x] `rg -F "gripHot" Core Desktop --glob '!node_modules' --glob '!out'` → 0; `rg -F "editor:grip-hot"` → 0; `rg -F "HOT_MENU_LINES"` → 0. Control: `rg -F "format-state" Core Desktop --glob '!node_modules' --glob '!out'` → 3+.
- [ ] One smoke launch by an Opus agent: right-click a block grip on a page, the grip's menu appears and the editor menu does not; right-click a gutter on a read-only surface (Page History), the editor menu appears.
- [x] Gates green.

**Verify — User**

- [ ] *(none — the smoke launch covers it)*

#### Gate 2 — residue settled

- [x] Gate commands green, exit codes read directly.
- [x] Every task's **Verify — automated** list ticked.
- [x] Every Now count re-run against its control.
- [x] Simplification and review dispatched against `<base>..HEAD`.
- [x] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [x] Progress hashes filled in. The next phase opens automatically.

---

### Phase 3 — One Arbiter For Escape

#### Task 7: Six listeners join the dismissal stack

**Requirement:** 7

**Why:** Escape today is resolved by whichever window listener registered first and by `defaultPrevented` handshakes between layers that don't know each other. The kit already holds an ordered stack; joining it makes "most recently opened dismisses first" the rule instead of the accident.

**Now** — six sites, each its own `keydown` listener:

```ts
// Core/Tiles/TileHost.tsx:141-154 — editingId; own capture pointerdown, any button, outside .tile.is-editing-tile; window keydown
// Core/Interface/Glance/GlancePane.tsx:452-463 — newest pinned glance on the active tab; keydown only; bails when a live pane is shown
// Core/Interface/Glance/glanceAction.ts:76-82 watchAnchor — live glance; preventDefault unconditionally
// Core/MarkdownPM/Embeds/embedWidget.tsx:543-563 — a ViewPlugin; own capture pointerdown doing two things (:545-550 blurs the host on a press inside any tile, :551-553 exits edit on a press outside the editing tile); window keydown
// Core/MarkdownPM/Tables/MarkdownTable.tsx:222-268 — cell rect selection; own capture pointerdown, any button, outside wrapRef; capture keydown claiming Escape/Backspace/Delete/⌘C/⌘X/⌘V
// UIX/Windows/window-base.tsx:145-152 — escapeRef.current(); keydown only; never prevents default, so one Escape closes every open window
```

**Becomes**

```ts
// Each site keeps its pointerdown behavior exactly as it is and joins the stack for Escape alone:
//   { layer: () => null, dismiss, outsidePress: false }  — a null layer holds nothing, so the stack's outside press never touches these entries
// TileHost.tsx      useDismissal(editingId !== null, false, { layer: () => null, dismiss: () => setEditingId(null), outsidePress: false }); the window keydown deleted, the pointerdown kept
// GlancePane.tsx    useDismissal(newestPin !== undefined && shown === null, false, { …, dismiss: () => beginExit([newest.pinId]) }); the keydown deleted
// glanceAction.ts   watchAnchor pushes pushDismissal({ …, dismiss: watch.onEscape }) and releases in its cleanup; the keydown listener keeps only onShift
// embedWidget.tsx   the ViewPlugin gains update(): pushes when editing becomes set, releases when cleared or on destroy; the keydown deleted, the pointerdown kept whole
// MarkdownTable.tsx useDismissal(rect !== null, false, { …, dismiss: () => setSel(null) }); Escape leaves the capture keydown, the other keys and the pointerdown stay
// window-base.tsx   useDismissal(!closing, false, { …, dismiss: () => escapeRef.current() }); the keydown deleted
```

Two behaviors change and are named here: one Escape closes only the most recently opened floating window rather than every open window (Ruling 7), and the live glance claims Escape only when it is the top layer rather than unconditionally. The gesture engine's capture-phase swallow (`UIX/Interactions/gesture.ts:134-135, :161`) is untouched: a drag in progress cancels on Escape before the stack sees it. CM6's keymap runs at the editor element before the document listener; where it prevents the default (an open autocomplete, `simplifySelection` on a non-empty state selection) the stack yields, which is the order these sites get by `defaultPrevented` today.

**Verify — Automated**

- [ ] For each of the six, an existing test that presses Escape stays green, or a new one is added where none exists (TileHost editing, MarkdownTable selection, window-base).
- [ ] The table's Escape moves from a capture listener to the stack's bubble listener, so CM6's `simplifySelection` now runs first: the smoke launch sweeps a cell rect and presses Escape. If the rect survives, the table keeps Escape in its capture handler and the plan records it under Deviations.
- [ ] A crossing test in `dismissalStack.test.ts`: two entries pushed in order, Escape dismisses the second only, a second Escape dismisses the first; an entry with a null layer survives an outside press.
- [ ] `rg -F "'keydown'" Core/Tiles/TileHost.tsx Core/Interface/Glance/GlancePane.tsx Core/MarkdownPM/Embeds/embedWidget.tsx UIX/Windows/window-base.tsx` → 0. Control: `rg -F "useDismissal(" Core UIX` → 8+.
- [ ] Gates green.

**Verify — User**

- [ ] Glance pinned, then a tile put in edit: Escape leaves the edit, a second Escape closes the glance. A cell rect swept in a table: Escape clears it.
- [ ] Two floating windows open: Escape closes the newer one only.

#### Gate 3 — Escape has one arbiter

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked.
- [ ] Simplification and review dispatched against `<base>..HEAD`.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in. The next phase opens automatically.

---

### Phase 4 — One Chord Table

#### Task 8: Every chord is a row in one table, live everywhere

**Requirement:** 8, 9

**Why:** A chord spelled in the native menu and a chord spelled in a renderer handler can't see each other, so a rebind silently loses. One table every reader derives from, with every reader live, is the prerequisite for the Shortcuts settings pane the docs already promise.

**Now** — the spellings:

```ts
// UIX/Interactions/chords.ts:14-34 chordOf(spec) → { key, cmd, ctrl, alt, shift } | null, memoized, module-private
// Core/Actions/commands.ts DEFAULT_COMMANDS: 'toggle-ribbon': 'cmd+t', 'toggle-nav': 'cmd+o', 'paste-inverse': 'cmd+shift+v'
// Core/Actions/editorMenu.ts:27-35 FORMAT_CHORDS as { shift, key } objects; keyBindingFor → 'Mod-Shift-x'
// Core/MarkdownPM/Input/formatKeymap.ts:16 formatKeymap = keymap.of(…) at module level
// Desktop/Actions/accelerators.ts acceleratorFor(FormatChordAction) → 'CmdOrCtrl+Shift+X' (display-only, editorMenu.ts:135)
// Desktop/Actions/appMenu.ts:57 'CmdOrCtrl+N' · :63 'CmdOrCtrl+Shift+N' · :78 'CmdOrCtrl+R' · :117 'CmdOrCtrl+\\' · :124 'CmdOrCtrl+0' · :133 'CmdOrCtrl+Plus' · :137 'CmdOrCtrl+=' hidden alias · :141 'CmdOrCtrl+-'
// Desktop/main.ts:140 refreshMenu() → installAppMenu; called at :262 (adopt) and :315 (startup)
// Core/Interface/App.tsx:86 matchesCommand('cmd+shift+t', e)
// Core/Navigation/TabBar.tsx:96 e.key !== 'Tab' || !e.ctrlKey || e.metaKey || e.altKey; shiftKey reverses
// Core/Properties/valueUndo.ts:11 matchesCommand('cmd+z', e)
// Core/Settings/codec.ts:116-124 readCommands(raw) overlays any string key from settings.json onto DEFAULT_COMMANDS
// Core/Session/configSlice.ts:52 seeds commands: DEFAULT_COMMANDS; tests seed commands: {} at store.test.tsx:385, selection.test.ts:25, devicePrefsSeed.test.ts:17, disclosure.test.tsx:29, treePatch.test.ts
// Core/Contract/engineGraph.test.ts:15-19 — UIX allowlist: Theme/colors.ts, Utilities/clamp.ts, Utilities/moveItem.ts, compared sorted
```

**Becomes**

```ts
// UIX/Interactions/chords.ts — the one parser, now exported
export interface Chord { key: string; cmd: boolean; ctrl: boolean; alt: boolean; shift: boolean }
export function chordOf(spec: string): Chord | null   // unchanged body
export function matchesCommand(spec: string | undefined, e: KeyboardEvent): boolean  // unchanged

// Core/Actions/commands.ts — the one table, in the grammar chordOf parses
export const DEFAULT_COMMANDS = {
  'new-tab': 'cmd+n',
  'new-page': 'cmd+shift+n',
  'reload': 'cmd+r',
  'toggle-sidebar': 'cmd+\\',
  'actual-size': 'cmd+0',
  'zoom-in': 'cmd+plus',
  'zoom-in-alias': 'cmd+=',
  'zoom-out': 'cmd+-',
  'toggle-ribbon': 'cmd+t',
  'toggle-nav': 'cmd+o',
  'toggle-iteration': 'cmd+shift+t',
  'next-tab': 'ctrl+tab',
  'previous-tab': 'ctrl+shift+tab',
  'undo-value': 'cmd+z',
  'paste-inverse': 'cmd+shift+v',
  'format:bold': 'cmd+b',
  'format:italic': 'cmd+i',
  'format:strikethrough': 'cmd+shift+x',
  'format:highlight': 'cmd+l',
  'format:inlineCode': 'cmd+e',
  'format:link': 'cmd+k',
  'format:connection': 'cmd+shift+k',
} satisfies Record<string, string>
export type CommandId = keyof typeof DEFAULT_COMMANDS
export type Commands = Record<CommandId, string>
export function toAccelerator(chord: string): string   // from chordOf: 'cmd+shift+n' → 'CmdOrCtrl+Shift+N'; 'cmd+plus' → 'CmdOrCtrl+Plus'; 'cmd+\\' → 'CmdOrCtrl+\\'
export function toKeyBinding(chord: string): string    // from chordOf: 'cmd+shift+x' → 'Mod-Shift-x'

// Core/Contract/engineGraph.test.ts — UIX allowlist gains 'UIX/Interactions/chords.ts' in sorted position
// Core/Settings/codec.ts readCommands(raw): Commands — keeps only CommandId keys; an unknown id is ignored
// Core/Settings/settings.ts readLiveCommands(root): Promise<Commands> beside readLivePersonalization, for the host
// the five test seeds of commands: {} → DEFAULT_COMMANDS
// Core/Actions/editorMenu.ts — FORMAT_CHORDS deleted; FormatChordAction = Extract<CommandId, `format:${string}`>; keyBindingFor(commands, action) = toKeyBinding(commands[action])
// Core/MarkdownPM/Input/formatKeymap.ts — formatKeymap(commands: Commands): Extension; MarkdownEditor holds it in a Compartment beside readOnlyGate and reconfigures it when the store's commands change
// Desktop/Actions/accelerators.ts deleted; editorMenu.ts:135 uses toAccelerator(commands[action]) with commands captured by the same refresh the application menu uses
// Desktop/Actions/appMenu.ts — installAppMenu reads readLiveCommands(sessionRoot()) (defaults when no session) and writes accelerator: toAccelerator(commands['new-tab']) etc.; no literal remains
// Core/Interface/App.tsx:86 matchesCommand(commands['toggle-iteration'], e)
// Core/Navigation/TabBar.tsx: matchesCommand(commands['next-tab'], e) / commands['previous-tab'], commands from the store
// Core/Properties/valueUndo.ts: matchesCommand(commands['undo-value'], e), commands read from the store at press time since the module installs once
```

`chordOf('cmd+plus')` yields key `plus`, which `matchesCommand` never matches against `e.key === '+'`; zoom is main-side only, so nothing in the renderer matches it. `toAccelerator` maps `plus` to Electron's `Plus`. `zoom-in-alias` keeps the unshifted ⌘= alias the hidden native row exists for.

**Verify — Automated**

- [ ] Red first: `commands.test.ts` asserts `toAccelerator` and `toKeyBinding` on the four shapes (plain, shift, symbol, `plus`); module not found; then green. `accelerators.test.ts` moves into it.
- [ ] A crossing test: for every `format:*` id, `toKeyBinding` of the table's chord is the key the editor's keymap binds, and the format keymap rebinds after a Compartment reconfigure with `format:bold` set to `cmd+shift+b`.
- [ ] `rg -F "CmdOrCtrl+" Desktop --glob '!node_modules' --glob '!out'` → 0. `rg -F "matchesCommand('" Core` → 0. `rg -F "FORMAT_CHORDS" Core Desktop --glob '!node_modules' --glob '!out'` → 0. Control: `rg -F "DEFAULT_COMMANDS" Core Desktop --glob '!node_modules' --glob '!out'` → 5+.
- [ ] `codec.test` (or its nearest) asserts an unknown command id in settings is ignored.
- [ ] `engineGraph.test.ts` green with `chords.ts` in the allowlist and nothing else added.
- [ ] Gates green.

**Verify — User**

- [ ] ⌘N opens a tab, ⌘⇧N a page, ⌘\ toggles the sidebar, ⌃Tab cycles tabs, ⌘⇧T opens the iteration window, ⌘B bolds, after a full dev-process restart.

#### Gate 4 — one chord table

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked.
- [ ] Simplification and review dispatched against `<base>..HEAD`.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in. The next phase opens automatically.

---

### Phase 5 — The Record

#### Task 9: What went false is rewritten, what was delivered is removed

**Requirement:** all

**Why:** The audit topic this plan delivers is removed rather than amended, per Nathan's standing rule, and the Features docs describe the menu system as it now is.

**Now**

```
// .claude/Planning/Codebase Audit — Report.md — topic 5 (lines ~122-139), R-21..R-24 rows, Appendix C's Use Native Menus line, the topic 5 mentions in the share table (:40) and the decisions paragraph (:252)
// Audit artifact https://claude.ai/code/artifact/a9f3a52c-cb0f-45dc-900d-03275fd87e9c — the same topic
// .claude/Features/DesktopPM.md — nothing names the menu channel or the door's contract
// .claude/ContextPM.md
```

**Becomes** — the audit doc and artifact carry no topic 5 and no R-21..R-24; the share table and decisions paragraph read as if the topic never existed. DesktopPM names the `menu` channel and the door's contract in one paragraph. Context is current. No History entry.

**Verify — Automated**

- [ ] `rg -F "R-21" .claude/Planning` → 0. `rg -F "Menus And Shortcuts" .claude/Planning` → 0. Control: `rg -F "R-17" .claude/Planning` → 1+.
- [ ] Artifact read, edited, republished to the same URL; `rg -F "Menus And Shortcuts"` over the fetched HTML → 0.
- [ ] Dead Vocabulary sweep at zero against its control.

**Verify — User**

- [ ] *(none)*

#### Gate 5 — closeout

- [ ] Delivery Claim written; neutral verifier dispatched against the spec and the full range; then the attack.
- [ ] Every finding fixed or ruled.
- [ ] Completion Criteria ticked where true.

---

## Implementation Log

### Progress

- [x] **Phase 1** — One Door, One Presenter · base `c530d1ca3` · simplified `8ecf6ba00` · reviewed and fixed `2f47bfff3` · stop closed `5ba96f6ef`
  - [x] Task 1 — The model · `39e8d9439`
  - [x] Task 2 — The door, the channel, the presenter · `5cc3bcf07`
  - [x] Task 3 — PickerControl through the door · `56a4621ed`
  - [x] Task 4 — The tile handle menu is one definition · `13020bac1`
- [ ] **Phase 2** — Native Residue · base `5ba96f6ef` · simplified `907ed733f` · reviewed and fixed `fb4751d71` · smoke launch pending with Task 7's
  - [x] Task 5 — Connection model relocation · `7d11e05c8`
  - [x] Task 6 — The grip-hot chain goes · `1b6c552e7`
- [ ] **Phase 3** — One Arbiter For Escape · base `fb4751d71`
  - [ ] Task 7 — Six listeners join the stack · `<commit>`
- [ ] **Phase 4** — One Chord Table
  - [ ] Task 8 — Every chord is a row, live everywhere · `<commit>`
- [ ] **Phase 5** — The Record
  - [ ] Task 9 — Docs, audit, artifact · `<commit>`

### Rulings

1. 09-08-2026, Nathan: right-click menus on content are native always; Pommora never paints its own menu for a right-click action.
2. 09-08-2026, Nathan: the preference governs click-triggered list menus (PickerControl, tile handle, future slash-command menu); correctness for future consumers is the concern, not today's two.
3. 09-08-2026, Nathan: the editor's own right-click menu stays Electron-built.
4. 09-08-2026, Nathan: names — file `menuActions.ts`, function `popMenu`, presenter `MenuPresenter` (Nathan wrote `menuPresenter`; the component file is PascalCase by the casing canon), slice `presentMenu`/`pendingMenu`, channel `menu`, Desktop `menu.ts`.
5. 09-08-2026, Nathan: the tile pane's lock, Scale value, and title fold into rows; rows carrying `checked` draw as PickerRows with the ring; Escape dismisses the most recently activated layer first; the shortcut table is in scope; no History entry for this plan.
6. 09-08-2026, Nathan: native accelerators read the session's commands at `refreshMenu()` (startup and adopt); a rebind reaches the native menu at the next adopt or launch. Every renderer reader, the format keymap included, is live.
7. 09-08-2026, Nathan: "most recently activated" is the stack's push order, which is open order. One Escape closes only the newest floating window; today it closes all of them. Focusing an older window does not re-order the stack.
8. 09-08-2026, Nathan: the tile handle is a control, so its menu takes the trigger path on click and right-click alike, exactly as today. Ruling 1 is about a right-click on content.
9. 09-08-2026, Nathan: a right-click outside an in-app surface does not close it. An outside left-click closes the whole stack, as the stack does today; Escape closes only the newest layer. No setting.
10. 09-08-2026, Nathan: raising a floating window on click, with Escape following the raise, stays parked; it is window management, not a menu fix.
11. 09-08-2026, Nathan, at the Gate 1 stop: the three `solid` pickers keep `solid`, carried through the door as `popMenu(items, trigger, { solid })`; the tile handle menu's root rows carry the glyphs the deleted pane drew; the presenter's levels take the pane width floor the deleted pane had, and its 180 cap with an ellipsized label.

### Open Against Later Tasks


### Deviations

- Task 2: the presenter passes `icon` straight to `Icon`, whose own lookup already falls back to `square-dashed`; `iconNameOr` would have been a pass-through.
- Task 2: `Core/Testing/MenuDoorHost.tsx` is the shared render helper for picker tests; no React helper existed in `Core/Testing`.
- Task 4: a drill level's footer rows take the separator only when body rows precede them; a level holding only "+ Custom" would otherwise open with a divider above its one row.
- Gate 2: `MenuTopRow`'s current label ellipsizes and its side may shrink, so a drill title fits the presenter's cap.
- Gate 1: the door resolves `null` on an empty row list, matching the native popper's own guard; a branch wins over `checked` in both projections; `PickerRow` gained `disabled`.

### Lessons

- Commit hygiene under a shared index: Task 6's commit carried Nathan's in-flight `md-bq` → `md-blockquote` hunks in two files while the rest of that rename stayed in the tree, so `1b6c552e7` alone draws no blockquote grip. The tree is consistent; the history isn't bisectable there. Nathan's class-rename sweep is his to commit.
- Task 6's "a state the platform never produces" was overstated by one band: the rail strip beside a grip but off its glyph used to show nothing (the flag stood main down) and now shows the editor's own menu, as any editor does on whitespace.

### Sequenced After

- A Shortcuts settings pane over the one table; a `refreshMenu()` on a commands change if a live native rebind is wanted.
- A MarkdownPM slash-command menu as the third consumer of the door; it will need the door to accept a caret rect, which was cut from this plan as having no writer.
- Touch reachability of content right-click menus on the mobile host.
- Raise on click for floating windows: a press inside a window lifts it above the others and to the top of the dismissal stack, so Escape follows focus rather than open order (Ruling 10). Needs a window z-order and a stack reorder, neither of which exists.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute Menu System — Implementation Plan. Live.
Live-verify: Task 3 and Task 4 user boxes at Gate 1 (declared stop); Task 7 and Task 8 user boxes at the end.
Screenshots: none unless a gate fails.
Pings: at Gate 1, at completion.
Record: no History entry.
Also: Task 6's smoke launch is delegated to an Opus agent; the supervisor never drives CDP. Opus agents only.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no "for a later session," no deferrals when the fix is known and could be done now.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding.
- **Fix at the source**, never down-river.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue.
- **Per phase:** implement → simplify → comment pass → gates, exit codes read directly → code review → attack review → every finding fixed or ruled → commit → ping. Simplification before review, never inverted.
- **Comments** only where the why can't be inferred. **Docs** stay clean; what went false gets rewritten, not amended. Unattributed doc or style edits mid-run belong to the user — fold them in, never revert them.

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] `presentMenu` has production callers; `MenuPresenter` reaches the DOM.

**The passes**

- [ ] Simplification and the comment pass over the whole range.
- [ ] Simplification then code review over the full implementation.
- [ ] Delivery Claim written, then checked by a neutral verifier against topic 5 and the Rulings.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass**

- [ ] Tile handle menu, preference off and on.
- [ ] A Settings picker, preference off and on.
- [ ] Escape ordering: tile edit over a pinned glance; a table selection; two windows.
- [ ] Every chord in the table, after a full dev-process restart.

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at zero against its control.
- [ ] Context and Handoff current.
- [ ] Lessons routed; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way worth knowing · every gate's real output · in-flight decisions, a sentence or two each · what's left for the live pass · final +/- line count, comments and tests excluded. Honest about what didn't work.
