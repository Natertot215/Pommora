### Info Buttons — Investigation

**DATE:** 10-27-2026
**HEAD:** `6f283376f` on `active`, verified against the working tree, which is clean outside `.claude/Planning/Info Buttons/`.

This document reconciles four planning scouts (rows and captions; the InfoButton's behavior; the index, the pane's body, and the test; tooling and the drive) against *Info Buttons — Decisions & Intention* as ratified on 10-27-2026 with its Planning Rulings: no real row carries an InfoButton; the Label Format and Value Format rows carry example InfoButtons with example entries in Claude's wording through the implementation and its verification, removed after (G-2); the Aliases row carries none, so `ManageRow` gains no `info` prop; `MenuCaption` becomes `MenuDesc` (F-4); and an InfoButton defaults to the `info` glyph, the `filled` type, and no border. Each load-bearing claim was re-read in the code, in `~/.claude/scripts/`, and in `~/The Studio/.claude/`; the cleaned scout reports sit in `Scouts/` beside this document.

---

#### What's True

##### Rows and Captions

**One Recipe:** every titled row ends in `MenuItem` (`UIX/Menus/MenuRows.tsx:94-164`). The `MenuRow` item branch (`UIX/Menus/MenuIndex.tsx:28-38`) reaches it through `rowNode` (`MenuIndex.tsx:139-153`), which passes each field one-for-one, and `MenuRowView` wraps it (`:122-131`).

**Three Names for One Line:** a row's secondary line is `hint` in Settings, `caption` on `MenuRow`, and `subLabel` on `MenuItem`.

- `hint`: `RowText.hint` (`Core/Settings/frames.ts:76`, the interface at `:74-78`) with 63 `hint:` keys in the roster; `settingsRow` maps it to `caption` (`Core/Settings/SettingsWindow.tsx:54-59`, the map at `:57`); `SettingsFieldRow` maps it again (`Core/Settings/SettingsFieldRow.tsx:16`); `ManageRow`'s `hint` prop maps it a third time (`UIX/Menus/ManageRow.tsx:12`, `:20`, `:37`). The four special Settings rows take it as a prop (`AssetDirectoryRow.tsx:9`, `:12`; `ClearActionRow.tsx:7`, `:11`; `ExcludedDirectoriesRow.tsx:15`, `:18`; `PreviewRulesRow.tsx:12`, `:15`), and two tests pass it (`Core/Settings/ExclusionRows.test.tsx:30`, `Core/Settings/PreviewRulesRow.test.tsx:42`).
- `caption`: the item field (`MenuIndex.tsx:32`), translated to `subLabel` at `MenuIndex.tsx:145`; bare rows already write it (`Core/Settings/NexusRows.tsx:165`, `:231`).
- `subLabel`: the prop (`MenuRows.tsx:71`, `:96`), its render (`:153`), and its class (`UIX/Menus/menu-row.css.ts:205`). Direct callers: `Core/Interface/Windows/PageReaderWindow.tsx:227`, `:239`; `Core/MarkdownPM/Autocomplete/AutocompletePane.tsx:99`; and, outside Pommora's repo, `~/The Studio/.claude/dashboard/src/showcase/MenuLeaf.tsx:32`, `:59`, which Pommora's own gate compiles (`package.json:20` ends with `tsc -p ../../.claude/dashboard`).

**The Name `caption` Is Already Taken:** `menu-row.css.ts:234-237` exports `caption`, the style of `MenuCaption` (`MenuRows.tsx:182-184`), the centered pane note exported at `UIX/Menus/index.ts:4` and used at `Core/Interface/Toolbar/OutlineMenu.tsx:4`, `:92`; `Core/Properties/Schema/PropertyFrame.tsx:22`, `:99`; `Core/Views/Settings/FilterFrame.tsx:17`, `:520`; and `Core/Views/Settings/LocationField.tsx:9`, `:86`. No test names it, and the dashboard doesn't use it. Once `ManageRow`'s prop is renamed, `hint` in UIX means only a field's value affix (`UIX/Fields/EditableInput.tsx:35`, `:58`; `UIX/Pickers/FieldPicker.tsx:12`, `:21`, `:53`), which is F-4's purpose.

**`SettingsFieldRow`:** a 19-line second map from a label and hint to a `MenuRow` (`SettingsFieldRow.tsx:5-19`), used by `AssetDirectoryRow.tsx:24`, `ClearActionRow.tsx:19`, and five `NexusRows` rows: This Device (`NexusRows.tsx:125`), Nexus ID (`:141`), Nexus Password (`:145`), Server (`:171`), and Sync (`:208`). The same file already writes bare `MenuRowView` rows beside them.

**The Four Special Rows:** `SettingsWindow.tsx:194-201` splits each row into `label` and `hint`, while every other case passes `row` (`:186-193`, `:202-205`). `path` and `clear` reach `SettingsFieldRow`; `exclusions` and `previewRules` reach `ManageRow` (`ExcludedDirectoriesRow.tsx:22`, `PreviewRulesRow.tsx:22`), which builds its own `MenuRow` in UIX (`ManageRow.tsx:32-64`) and can't take Core's `RowText`. `settingsRow` is private to `SettingsWindow.tsx`, which imports these row files, so a row file calling it would import back into its importer. `frames.ts` imports none of the row components (`frames.ts:1-46`) and declares `RowOf` (`:136`).

**The Title Line:** `titleWrap` is a column flex (`menu-row.css.ts:190-197`); `titleText` wears `overScrollEllipsis` (`MenuRows.tsx:152`), whose cap clips its own box (`UIX/Interactions/over-scroll.css:2-9`) and scrolls on hover (`:11-14`). A glyph inside `titleText` would clip and scroll with the text, so it sits as a flex sibling in a row-direction line around `titleText`; `.detail-title-slot-run` (`Core/Interface/Header/content-title.css:83`) is the precedent. `${titleWrap} + ${side}` (`menu-row.css.ts:277`) is unaffected by a wrapper inside `titleWrap`.

**The Example Rows:** `formatRows`' local helper (`Core/Properties/Schema/formatRows.ts:16-29`) passes `{ inert: true }` (`:28`); Label Format is `:30`, and Value Format (`:36`) appears only on option types (`:33-38`). `PropertyFrame.tsx:342-345` renders them through `MenuIndex` inside `ruleFrame`, the compact density whose `--row-line` is 15px (`menu-row.css.ts:109-116`; `UIX/Theme/typography.css.ts:23`). An inert row has no `onClick` and no role (`MenuRows.tsx:123`, `:129`, `:140-143`), and neither row is ever disabled, so A-3 and A-4 have no live case on the examples.

**`pickerRow` Returns the Whole Union:** `pickerRow` and `steppedRow` return `MenuRow` (`MenuIndex.tsx:54-61`, `:79-87`), so `{ ...pickerRow(…), info }` fails TypeScript's excess-property check on the heading branch; narrowing the return to `Extract<MenuRow, { kind: 'item' }>` passes. Both results were checked with `tsc --strict` on a replica of the type.

**Clickable Rows:** `MenuItem` takes `role="button"`, a tab stop, and `onActivateClick` when `onClick` is set and the row is neither disabled nor inert (`MenuRows.tsx:123`, `:140-143`). The row's key handler ignores keys from descendants (`UIX/Interactions/activate.ts:7`), but a native button's Enter or Space fires a `click` that bubbles to the row's `onClick`; `AccessoryButton` stops it (`MenuRows.tsx:315-318`). `MenuRow` items with `onSelect` reach `onClick` at `MenuIndex.tsx:149`.

##### The InfoButton's Behavior

**The Glyph:** `Button` takes `type`, `outline`, `icon`, `iconSize`, `size`, `pressed`, `ref`, and `aria-label` through its rest props (`UIX/Buttons/Button.tsx:13-33`, `:74-133`) and inks from `--button-ink` (`UIX/Buttons/button-base.css.ts:83`). `filled` sets `fill.secondary` behind `label.primary` ink (`:184-190`); `button-inline` is 20px tall with a 6px radius (`:25-32`) against a 16px row line (`typography.css.ts:21`), 15px under `menuCompact`. `accessoryButton`'s `marginBlock` overhang, scoped to `${rowBox} &` (`menu-row.css.ts:264-266`), is the one place that fit is written. `AccessoryButton` fixes size and padding and takes no `type` or `outline` (`MenuRows.tsx:276-321`), and its class forces tertiary ink (`menu-row.css.ts:261`), so it can't carry A-2 as it stands. The three glyphs exist: `circle-alert` (`UIX/Symbols/iconNames.ts:359`), `circle-question-mark` (`:395`), and `info` (`:840`).

**The Dwell:** `useHoverReveal`'s `dwell` is a boolean (`UIX/Interactions/hoverReveal.ts:31`, `:37`), and the open timer reads the module constant `REVEAL_DWELL_MS = 1500` (`:12`) at `:77`. Its callers are `DetailTitleHeader.tsx:62-64` and `ViewTile.tsx:275-276` (`dwell: true`) and `Disclosure.tsx:84` (no dwell). `REVEAL_DWELL_MS` is also named as their own dwell by `GhostOptionChip.tsx:11` and `useViewInteractions.tsx:440`, and by `DetailTitleHeader.test.tsx:63`, `PropertyPanel.test.tsx:488`, `cardCreation.test.tsx:100`, `:176`, and `hoverReveal.test.tsx`. The kit's other dwell API names its duration `dwellMs` (`UIX/Interactions/ghostCreate.ts:14-15`; callers `Sidebar.tsx:326`, `TileGrid.tsx:511`).

**Touch:** the hook returns `on: dwell && coarse() ? active : active && on` (`hoverReveal.ts:156`), so every dwell instance is on whenever it's active under `(hover: none)` (pinned by `hoverReveal.test.tsx:191`). `coarse` is private (`:18`) and read per render. With no dwell, `settle` never opens (`:68`), the pointer-move and window press listeners never register (`:126-131`, `:140-154`), and a tap's click is the only opener.

**Close Paths:** the hook returns `on`, `hover`, and `press` (`:156`); `reset` exists inside the stable `api` (`:81-86`, `:122`). With the pane open while `held || reveal.on`, a second click un-holds the pane while `reveal.on` stays true under the resting pointer, and Escape on an unheld, hover-opened pane is consumed (`UIX/Interactions/dismissalStack.ts:86-88`) while nothing turns the reveal off. An `engaged` flip without a press resets the reveal (`hoverReveal.ts:133-139`; `hoverReveal.test.tsx:173`, `:258`), which covers the second click but not Escape; a returned `reset` covers both.

**`focus="keep"`:** the trigger counts as inside the layer (`UIX/Pickers/PickerMenu.tsx:120`; `dismissalStack.ts:41-48`), so a press on the glyph neither dismisses nor suppresses the release click (`dismissalStack.ts:76-78`), and the glyph's own `onClick` is the toggle. No shield draws (`PickerMenu.tsx:122`), so an outside press closes the pane and still lands; the pane stays modal, so Escape reaches it first (`dismissalStack.ts:81-91`), scoped to its trigger's window (`:31-38`). A nested pane keeps its parent open (`dismissalStack.ts:64-79`; `PickerMenu.test.tsx:230`).

**Hover Across the Portal:** React 19.2.7 computes enter and leave by the component tree, skipping portal fibers (`node_modules/react-dom/cjs/react-dom-client.development.js:19803-19808`), so a wrapper enclosing both the glyph and its `PickerMenu` sees no leave as the pointer crosses into the pane. The 6px gap (`UIX/Menus/menuAnchor.ts:4`) falls within the 150ms grace (`hoverReveal.ts:13`; `hoverReveal.test.tsx:79`). A `PickerMenu` nested inside the `<button>` would deliver every pane click to the glyph's toggle.

**Click Bubbling:** `PickerMenu`'s layer stops `pointerdown` and `contextmenu` (`PickerMenu.tsx:30-37`, `:328-330`) but not `click`, so a click in the pane bubbles by the component tree to an ancestor row's `onClick` (`MenuRows.tsx:142`).

**One at a Time:** the dismissal stack closes on presses and Escape only (`dismissalStack.ts:64-91`). A click on a second glyph is an outside press for the first; a hover-open of a second glyph while the first is held shows two panes. Module-level slots are the UIX precedent for one-of-a-kind state (`UIX/Interactions/OverScroll.tsx:33`, `UIX/Interactions/gesture.ts:57`, `UIX/Interactions/dragDisclose.ts:11-13`), as `let present` is Core's for the glance (`Core/Interface/Glance/glanceAction.ts:24`).

**Disabled Rows:** `rowDisabled` sets opacity and `pointer-events: none` (`menu-row.css.ts:156-160`). `pointer-events` is inherited, so the glyph's own `auto` restores it while the row's opacity still dims it; the portalled pane sits outside the row and isn't dimmed. Hovering the glyph puts a non-inert disabled row under `rowShell`'s hover wash (`menu-row.css.ts:38`).

**Keyboard:** a native button turns Enter and Space into `click`; `focus="keep"` takes no focus on open, so focus stays on the glyph and Escape reaches the stack. `Button` draws no focus ring anywhere in `button-base.css.ts`, which every button shares.

**The Pane's Frame:** without `resize`, `PickerMenu` draws no edges and places no resize (`PickerMenu.tsx:146`, `:301`), which satisfies C-4. A width class passed as `contentClassName` lands on the measured shell (`:283-291`, `:166-171`). The pane flips upward once per open when there's less room below (`:203-211`) and centers on the trigger when it fits, otherwise right-anchoring (`:218-238`).

**Exit Timing:** a pane's exit holds 255ms (`UIX/Animations/motion.ts:5`, `:19`), and `PickerMenu`'s dev guard logs an unmount during it (`PickerMenu.tsx:125-134`). The property frame's slide holds its leaving view 310ms (`UIX/Menus/FrameSlide.tsx:42`), so the examples' Back path doesn't trip the guard. The Settings window's 210ms exit (`SettingsWindow.tsx:63`) and its instant frame swap would, which matters only once a Settings row cites an entry; `ManageRow` carries the same exposure today.

##### The Index and the Pane's Body

**Reading Markdown as Text:** `vite/client` types `?raw` for every config that compiles Core (`Core/tsconfig.json:10`, `Core/tsconfig.src.json:4`, `UIX/tsconfig.json:11`, `Desktop/Renderer/env.d.ts:1`); the renderer's root is `Desktop/Renderer` with `server.fs.strict: false` (`Desktop/electron.vite.config.ts:14-18`), and `Core/vitest.config.ts` runs Vite's plugins, so the import resolves in the build, in dev, and in tests. No `?raw` import exists in the tree. The only tracked `.md` files under Core are `Core/Matrix/README.md` and `Core/Tiles/README.md`.

**Lint Reach:** `npm run lint` runs `no-name-mentions.mjs --scan` over every tracked file outside `.claude/` (`package.json:22`; `~/The Studio/.claude/hooks/no-name-mentions.mjs:19-21`), so the InfoIndex can't carry Nathan's name; `no-wrapped-comments.mjs` reads code files only.

**The Graphs:** `engineGraph` resolves a specifier against code extensions only (`Core/Testing/engineGraph.ts:64-75`), so a `?raw` import reached from `Core/Contract/serve.ts` would land in `externals` and fail `Core/Contract/engineGraph.test.ts:13-23`; a renderer-side loader stays out of it. `Core/manifest.test.ts:31` skips relative specifiers.

**What Crosses the Mirror:** the mirror strips only a body's surrounding blank lines (`~/.claude/scripts/cross-file-mirroring/cross-file-mirroring:622-624`) and treats only a leading `---` block as frontmatter (`:610-620`); the `description` and `version` keys cross with the body (`mirror-map.md:13-18`). A parser that reads tag lines and ignores the rest is indifferent to headings and to any frontmatter the vault side adds. Under CommonMark's HTML-block rule, the blank line after an open tag lets the Markdown between render, in Obsidian and in Pommora (`.claude/Features/MarkdownPM.md:27`).

**The Citation's Constraints:** `formatRows.ts` is a `.ts` file building rows through `pickerRow`, so the citing call is a function in a `.tsx` that returns a `ReactNode`. UIX can't take an ID, since it can't reach the InfoIndex (C-1). A-5's name needs the row's title as a string, which UIX can't derive: `MenuRow.label` and `MenuItem`'s children are `ReactNode` (`MenuIndex.tsx:31`; `MenuRows.tsx:90`). A kebab converter already exists in `formatKey(label, 'kebab-case')` (`Core/Properties/keyFormat.ts:67`, `:76-77`): it splits on whitespace, underscores, hyphens, and case humps but keeps an all-caps run whole (`keyFormat.ts:29-41`), so "Nexus ID" yields `nexus-id`, while punctuation survives as its own word ("Date & Time" yields `date-&-time`). No other function in the tree is called bare `info(`.

**The Body's Host:** `MarkdownEditor` always runs the page scope (`Core/MarkdownPM/MarkdownEditor.tsx:149-154`). `useEditorHost` takes `connections` as optional (`Core/Pages/editorHost.tsx:29-36`); `inert` drops the format menu and the glance (`:106-113`), and web links still follow through `openLink` (`:144`). The history reader passes `useConnections('inert')` (`PageReaderWindow.tsx:89-90`), which builds a Nexus-wide page index (`Core/Session/pageConnections.ts:32`), so `[[links]]` would resolve and color against the open Nexus; with no connections, embeds don't build (`Core/MarkdownPM/Embeds/embedWidget.tsx:394`), link hits are web links only (`Core/MarkdownPM/Links/linkClicks.ts:56`), and no link menu is claimed (`linkClicks.ts:148`). Without a `pageId`, the editor has no prefs and lands on an animation frame (`MarkdownEditor.tsx:233-243`).

**The Body's Sizing:** the shell is `mdpm-shell mdpm-fill` (`MarkdownEditor.tsx:292`), whose `height: 100%` resolves to auto inside an auto-height pane (`Core/MarkdownPM/markdown-pm.css:27-34`). `.mdpm-editor .cm-content` pads for a header zone and a rail (`markdown-pm.css:55`, `:67`), overridden by `Core/Properties/Pickers/text-pane.css:18-22` and `Core/Interface/Glance/glance-pane.css:43-45`; the glance also zeroes `--rail-inset`, hides the fold chevron, and forces the scroller's overflow over CodeMirror's runtime rule (`glance-pane.css:32-41`, `:47-49`), all under `.glance-body .page-tile`, while an InfoPane mounts `MarkdownEditor` without a page tile. `markdown-pm.css:79` lists the surfaces that hide the placeholder. The editor's `interface-inset` reads `--sidebar-clearance`, defined only on `.shell` and `.window` (`Core/Interface/styles.css:58`, `:76-78`), so it computes to nothing in a body-portalled pane, as it does in the glance.

**Selection:** the app sets `user-select: none` on `body` and restores it for `[contenteditable="true"]` (`styles.css:30-39`); a read-only editor stays `contenteditable="true"` on purpose (`Core/MarkdownPM/readOnlySelection.test.tsx:12-17`), and `keepFocus` exempts editable targets (`UIX/Interactions/shared.ts:15-19`), so `focus="keep"` blocks neither selection nor focus, and a press in the pane focuses the editor. In `@codemirror/view` 6.43.1, an event already default-prevented doesn't belong to the editor (`dist/index.js:4828-4832`), a handler returning true prevents default and stops the rest (`:4533-4545`), and `contenteditable` follows the `editable` facet (`:8225`). Right-click on prose is already covered: `PickerMenu`'s layer prevents `contextmenu` (`PickerMenu.tsx:31-37`, `:330`), and an editor without connections claims no link menu (`linkClicks.ts:148`), so main's Copy and Select All menu (`Desktop/Actions/editorMenu.ts:77-99`, `:134-137`) isn't reached inside a pane. The inert host still supplies the grip, table, and citation menus (`editorHost.tsx:101-105`), whose handlers run on `contentDOM` before the layer, so a table or a citation row inside an entry pops the editor's own menu. What remains is the pointer (CodeMirror's mouse selection) and the keyboard (an editable element in tab order, where ⌘A and ⌘C work).

**Test Precedents:** the syntax-tree walk `importSpecifiers` (`engineGraph.ts:13-41`) is the shape a citation scan takes. `Core/manifest.test.ts:20-36` and `Desktop/hostGraph.test.ts:8-15` each parse a tsconfig into its file list, a third copy of which the citation test would need.

##### Tooling and the Drive

**The Pinned Row:** in a **Project:** table, `~`-anchored `.md` rows are pinned source files (`~/.claude/scripts/cross-file-mirroring/mirror-map.md:5`). The parser routes them to the project's `extra` list (`cross-file-mirroring:362-370`), pairs one only while its source is a file (`:1032-1034`), and counts it among the explicit pairs every prune exempts (`:530-538`, `:980`). Its Mirror cell is relative to the table's vault base, `Studio // Pommora` (`mirror-map.md:90`). A **Files** row behaves differently when the source is missing: it seeds the source from the vault (`cross-file-mirroring:794-807`), which a pinned row can't do. The Files table's precedent for a Pommora file is `~/.claude/memory/pommora/MEMORY.md` (`mirror-map.md:38`).

**A Dead Row Beside It:** `| // Resources | // II. Resources |` (`mirror-map.md:101`) maps a folder that doesn't exist (`.claude/Resources` is absent and untracked), so its scope is offline every pass (`cross-file-mirroring:1022-1025`). The three notes in `~/NexusOS/Studio/Pommora/II. Resources/` (`Deployment.md`, `Distribution.md`, `Libraries.md`) are recorded as mirrored in `.mirror-state.json`, so a recreated `.claude/Resources/` would bring the scope online and `prune_orphans` would trash all three (`cross-file-mirroring:1258-1291`). The folder is a Pommora Set in NexusOS (it holds `_pageset.json`), so the vault side of a pinned note there gains an `ID` that stays on that side.

**The Watcher:** the mirror runs under launchd (`com.nexus.claude-mirror`), re-reads the map every pass, and holds pruning until the map has been still for 15 seconds (`cross-file-mirroring:148`).

**The Daily Commit:** `~/.claude/scripts/auto-push.sh:4-9` commits and pushes The Studio, NexusOS, and `~/.claude` daily at 5:00 PM under launchd; The Studio's `.gitignore` admits only `.gitignore`, `.claude/`, and `.github/`, so Pommora's repo is never visited. A `git commit -- <path>` commits that path's working-tree content alone, leaving anything else staged (the tooling scout's probe in a throwaway repo); an unchanged path exits with a "no changes added to commit" status, and an untracked one errors.

**The Hooks on That Commit:** Pommora's `core.hooksPath` is `.claude/hooks`. Its pre-commit runs `check-atlas.mjs` and always exits 0 (`.claude/hooks/pre-commit`); its post-commit runs `sync.mjs pommora` (`.claude/hooks/post-commit`), which, on a settled `active`, counts lines (`.ts`, `.tsx`, and `.css` only, `~/The Studio/.claude/dashboard/line-count.mjs:19`), copies `IssuesPM.md`, commits The Studio's dashboard, and pushes both Pommora and The Studio (`~/The Studio/.claude/dashboard/sync.mjs:105-118`). The name hook is a Claude Code `PreToolUse` hook on Bash and a `--scan` mode, so launchd's run isn't subject to it.

**The Drive Harness:** `REPO` defaults to the main checkout (`.claude/scripts/drive-harness.mjs:10`); `launch` builds it, backs up `~/Test`, and launches the build, and `restore` rsyncs `~/Test` back (`drive-harness.mjs:562-620`). Ports 9343 through 9403 are taken, so 9413 is next. `hover` moves 20px off the target, onto it, and waits (`:227-233`); `mouseAt` and `mouseClick` send real press and release events (`:188-194`); `click` fires only `el.click()` (`:235`). The Metadata Drive's `openEditor` reaches a property's settings and waits on `button[aria-label="Label Format"]` (`.claude/scripts/Metadata Drive/live-drive.mjs:1337-1349`), an exact match that "Label Format - Info" doesn't collide with. `MATRIX.md` sits beside the Archive, Metadata, and Properties drives. `Core/Interface/Windows/IterationWindow.tsx:25` is the empty preview slot ⌘⇧T opens. No drive has emulated touch, and since `coarse()` reads at render, emulation has to precede the row's mount.

---

#### What's Reusable

- **`MenuItem` and `MenuRow`:** the slot enters as one `info?: ReactNode` on `MenuItemProps` and on the `MenuRow` item branch, passed through `rowNode`; the title gains a row-direction line, rendered only when `info` is set so every existing row's DOM stays as it is. The trade is two DOM shapes for a titled row; an unconditional wrapper keeps one shape and touches every row's layout, which no selector reads today (`titleText` is worn only at `MenuRows.tsx:152`). `PickerRowLook` needs nothing; the examples spread `info` onto `pickerRow`'s result once its return narrows to the item branch, which is truthful for both `pickerRow` and `steppedRow`.
- **`Button`:** the glyph is a `Button` at `button-inline` with `type`, `outline`, `icon`, and `aria-label` as they are. The overhang leaves `accessoryButton` for one shared class both wear, so the tertiary ink stays `AccessoryButton`'s alone and the fit is written once.
- **`useHoverReveal`:** it takes a per-caller dwell, exports `coarse`, and returns `reset`. Nothing else in it changes, and its other callers keep 1.5 seconds and their touch behavior.
- **`PickerMenu`:** `focus="keep"`, `triggerRef` on the glyph, `onDismiss` as the one close, `contentClassName` for the 285px width, and no `resize`, unchanged.
- **The Dismissal Stack:** Escape, outside presses, the trigger counting as inside, and nested panes, unchanged.
- **`MarkdownEditor` and `useEditorHost`:** read-only, `useEditorHost({ inert: true })` with no connections, and no `pageId`. The editor gains the one opt-out C-3 needs (*§Approaches Worth Weighing*).
- **The Glance's and the Text Pane's Body Rules:** the rail inset, the fold chevron, the scroller's overflow cap, and the content padding are overridden as those two panes do.
- **`formatKey`:** the citation's ID comes from the title through the existing kebab converter, which the test uses too.
- **`importSpecifiers` and the Tsconfig File List:** the scan walks calls as `importSpecifiers` walks imports; the file list, read today by `manifest.test.ts` and `hostGraph.test.ts`, lifts into one `Core/Testing/engineGraph.ts` helper all three use.
- **The Mirror and the Hooks:** one pinned map row and one `auto-push.sh` line; the post-commit hook already pushes and refreshes the dashboard, so the line only commits, in the pathspec form `sync.mjs` itself uses (`sync.mjs:80`).
- **The Drive Harness:** `launch`, `restore`, `hover`, `mouseAt`, `pressKey`, `shot`, `item`, and `tally`; the Metadata Drive's `openEditor` and `trigger` are copied into the new drive, as drives share only the harness.

---

#### Removal & Simplification

- **`SettingsFieldRow.tsx` Leaves:** its consumers become `AssetDirectoryRow` and `ClearActionRow` taking `row` and building through `settingsRow`, and five bare `MenuRowView` rows in `NexusRows`, the form that file already uses for its other rows.
- **The Four Split Props Leave:** `AssetDirectoryRow`, `ClearActionRow`, `ExcludedDirectoriesRow`, and `PreviewRulesRow` take `row`, so `SettingsWindow.tsx:194-201` reads as the rest of the switch; the two ManageRow-built rows pass `label` and `caption` from it. `ExclusionRows.test.tsx:30` and `PreviewRulesRow.test.tsx:39-44` pass a row.
- **Three Names Become One:** `hint` and `subLabel` become `caption`, so `MenuIndex.tsx:145`, `SettingsWindow.tsx:57`, and `ManageRow.tsx:37` stop translating; the 63 frame keys rename in place.
- **`MenuCaption` Becomes `MenuDesc`:** its style becomes `desc`, freeing `caption` for the row's line.
- **`ManageRow`'s `hint` Prop Becomes `caption`:** it gains no `info`.
- **`RowText` Gains Nothing:** no Settings row cites an entry, and `settingsRow` is the one place the next one goes.
- **The Overhang Merges:** the `accessoryButton` overhang becomes one shared class.
- **The Tsconfig File Lists Merge:** `manifest.test.ts` and `hostGraph.test.ts` call one helper beside `importSpecifiers`.
- **The Reader's Host Isn't Copied:** the InfoPane passes neither `resolveOnly` nor the embed sentinel `PageReaderWindow` needs.
- **`mirror-map.md:101` Leaves:** dead configuration that names a nonexistent source and holds a latent trash of three vault notes.
- **The Examples Leave:** their entries, their two citations, the drive that drives them, its README paragraph, and anything placed in `IterationWindow.tsx` for the drive, leaving an empty InfoIndex.
- **Already False, on This Surface:** `.claude/CLAUDE.md:117`'s `// Dashboard` line names a folder Pommora no longer has; `.claude/Features/ConfigurationPM.md:20` gives This Device a fingerprint hint it doesn't carry.
- **What Stays:** `MenuDropdown`, `paneCtl`, and the glance presenter are different machines; captions stay as they are (F-2).

---

#### Approaches Worth Weighing

##### The Dwell Option's Shape

- **`dwellMs?: number` in Place of `dwell`:** one option, named as the kit's other dwell names its duration (`ghostCreate.ts:14`); a reveal dwells when it carries one. `DetailTitleHeader.tsx:64` and `ViewTile.tsx:276` pass `REVEAL_DWELL_MS`, which then reads as the app's shared reveal dwell, the way `GhostOptionChip` and `useViewInteractions` already name it; `hoverReveal.test.tsx:54` and `:202` change with them, and the hook's four truthiness reads become presence reads.
- **`dwell?: boolean | number`:** no caller changes, and `true` means the default; the option mixes a switch and a duration, and `:68` needs a coercion.
- **`dwellMs` Beside `dwell: boolean`:** two options for one concept.
- **Recommendation:** `dwellMs` in place of `dwell`. It's four caller lines more than the union, and it leaves one shape across the kit's dwells, ready for the *Shared Dwells* prospect.

##### The Touch Opt-Out

- **Exported `coarse`:** the InfoButton passes no dwell when the screen is coarse, so the hook never opens it, registers no listeners, and the tap's click drives the held state; the other callers keep resting open (`hoverReveal.test.tsx:191` stays true). It costs one `export`.
- **A Hook Option (`touch: 'rest' | 'tap'`):** more surface for one caller, beside a policy the log keeps for everyone else (*§Rejected · Changing the Reveal on Touch for Everyone*).
- **Recommendation:** export `coarse`.

##### The One-Open Slot

- **A Module Slot in the InfoButton's File:** a closer the newest open takes over, cleared on close or unmount; about six lines, and the closer is the same function as the second click and `onDismiss`.
- **A Group Key in `dismissalStack`:** an entry field, a loop in `pushDismissal`, and a `PickerMenu` prop, for one consumer.
- **Recommendation:** the module slot, matching the kit's other one-of-a-kind slots; the stack earns a group once a second kind of pane needs one.

##### Click Containment

- **The InfoButton's Wrapper:** one `onClick` stop on the span that already hosts the hover handlers covers the glyph's click and every click from the pane, since the pane is the wrapper's child in the component tree. It matches `AccessoryButton`'s stop.
- **`PickerMenu`'s Layer:** stopping `click` beside `pointerdown` and `contextmenu` makes every pane a full bubble guard. It touches 16 `PickerMenu` users that no one has audited for a parent relying on a click escaping, and the glyph still needs its own stop.
- **Recommendation:** the wrapper. No other pane sits inside a clickable row today, so the layer change has no case to fix yet.

##### The No-Selection Rule

- **A `MarkdownEditor` Opt-Out:** `selectable={false}` adds `EditorView.editable.of(false)` and a highest-precedence `mousedown` handler that claims the press. It closes the pointer and keyboard paths, takes the content out of tab order, lets `body`'s `user-select: none` apply, and stops a press from focusing the editor, which also settles the behavior scout's focus leak. `readOnlySelection.test.tsx` gains the opt-out's case and its comment gains its scope. Web links following on `click` with the press claimed is verified live.
- **Capture-Phase Handlers on the Pane's Wrapper:** a prevented `mousedown` before CodeMirror's listener closes the pointer path with no shared API change, and leaves the keyboard path open.
- **Recommendation:** the opt-out. It's the only approach that meets C-3 as confirmed, and it gives "an editor nothing can select" one owner.

##### The Citation Call's Shape and File Type

- **The Title Alone, `info('Label Format', look?)`:** the IDs ruling makes an ID the title in kebab case, so one string yields both the ID (`formatKey(title, 'kebab-case')`) and A-5's name (`` `${title} - Info` ``, composed once in UIX). The test kebabs each cited title with the same converter. A renamed title renames its entry's tag, which the test catches, and a title carrying punctuation yields an ID the tag pattern can't hold, which the test catches too; the call's documentation states the converter's rule so the next citer can predict its ID.
- **An ID and a Title, `info('label-format', 'Label Format', look?)`:** the ID survives a title rename, at the cost of two statements of one fact that the ruling ties together.
- **An ID Alone, With the Name From the Row:** `MenuItem` hands its title's element ID to the InfoButton through a context for `aria-labelledby`; it's plumbing every future host outside menus would repeat.
- **File Type:** a `.tsx` holding the `?raw` import, the parse, the call, and the pane's body, since the call returns an element and `formatRows.ts` can't write JSX. Splitting the parse into a `.ts` keeps React and CodeMirror out of the test's imports, at one more file.
- **Recommendation:** the title alone, in one `.tsx`. The scan reads the call's first argument as a literal and fails on anything else.

##### The Runtime Behavior When an Entry Is Missing

- **Cause:** the InfoIndex changes outside sessions. The mirror writes NexusOS edits into the working tree, where dev's watch re-reads them, and E-2's daily commit lands them without running tests, so a renamed or emptied entry can reach a build while a row still cites it.
- **Draw Nothing:** the call returns nothing for an absent or empty entry; one conditional.
- **Draw the Glyph Over an Empty Pane, or Throw:** a broken affordance in the first case and a crashed surface in the second.
- **Recommendation:** draw nothing.

##### The Drive After the Examples Leave

- **Retire:** the drive leaves with the examples, its matrix and results recorded in the plan's Results document, as *Disclosable Bundles — Results* keeps its own.
- **Keep, Rebased on Real Rows:** runs once a real row cites an entry; until then it can't open anything, since the InfoIndex is bundled at build time.
- **Keep, Self-Seeding:** writes examples into the InfoIndex before its build and restores the bytes after; with the mirror row live, each write reaches NexusOS within seconds, and a run near 5:00 PM could be swept into the daily commit.
- **Recommendation:** retire.

##### The Mirror Row

- **Pinned Project Row:** the source decides; with the source absent there's no pair, so the vault can never seed the shipped file.
- **Files Row:** seeds the source from the vault when it's absent, and a deleted vault note strikes the row from the map.
- **Recommendation:** the pinned row, grouped with Pommora's other documents.

##### The Daily Commit Line

- **Shape:** `git -C ~/"The Studio/Projects/Project Pommora" commit -qm "<message>" -- <the InfoIndex's path> >> ~/Library/Logs/auto-push.log 2>&1`, placed before the loop; the post-commit hook pushes.
- **Guards:** a branch check and a `diff --quiet` prefix each guard something real but harmless (a commit landing off `active` that the hook then doesn't push; a daily "no changes" status in a log that already records The Studio's "nothing to commit"). The Studio's own loop carries neither.
- **Recommendation:** the bare line.

##### Wiring the Mirror Early or Late

- **Late:** the mirror row and the commit line land after the examples leave, so nothing of Claude's reaches NexusOS or a "wording" commit, and the vault note seeds empty.
- **Early:** Nathan sees the file while the work runs and Open Item 1 is checked against the examples, but Claude's examples sit in the vault, a vault edit is a live write into the source under a running drive, and the removal has to strip only the example tags.
- **Recommendation:** late; Pommora's half of Open Item 1 is checked against the examples in `~/Test` (*§Questions for Nathan*).

---

#### Placement Candidates

Every new file's placement goes to Nathan before it's written (H-1).

##### The InfoButton

- **`UIX/Menus/InfoButton.tsx` + `UIX/Menus/info-button.css.ts`:** beside its nearest precedent, `ManageRow.tsx` + `manage-row.css.ts` (a row-borne button with its own `PickerMenu`); it enters through the row recipe (F-1), and its disabled override and shared overhang read `menu-row.css.ts` without a cross-folder import. The 285px pane width and the 500ms dwell sit in it as knobs. **Recommended.**
- **`UIX/Buttons/InfoButton.tsx` + `info-button.css.ts`:** the name says button, and the prospects put InfoButtons on column headers and dialogs; it makes `PommoraUIX.md:221`'s "the one button recipe" false, and the overhang would cross folders.
- **`UIX/Pickers/`:** home of `PickerMenu`, but every member chooses a value.

##### The InfoIndex, Its Loader, and Its Call

- **`Core/Interface/Info/`:** `InfoIndex.md`, `InfoPane.tsx` (the `?raw` import, the parse, the call, and the pane's body), and `info-pane.css`. Its structural twin is `Core/Interface/Glance/` (a Core pane over UIX's `PickerMenu` holding a read-only editor, with its `.tsx`, `.css`, and tests together), and the Codebase Structure's Interface line already covers it. The file sits outside every mirrored `.claude` tree, as the pinned row requires. **Recommended.**
- **`Core/Info/`:** reads as its own domain and leaves room for the *User Guide* prospect, at the cost of a new top-level folder and a Codebase Structure line for three files.
- **`Core/Settings/` or `Core/MarkdownPM/`:** the first ties the index to one surface, and the second is the editor rather than content written for it.

##### The Pane Body's Styles

- **`Core/Interface/Info/info-pane.css`:** plain CSS, as `glance-pane.css` and `text-pane.css` override MarkdownPM's plain-CSS classes: the padding, a max height on the scroller with its overflow forced, the rail inset, the fold chevron, the arrow cursor, and the caret layer. **Recommended.**
- **Merged With the Glance:** a shared selector for the three rules both panes state (rail inset, chevron, scroller overflow), at the cost of one file reaching into the other's class, since the glance's rules hang off `.page-tile`.

##### The Tests

- **`Core/Interface/Info/InfoIndex.test.ts`:** the parse on inline samples (an entry trims; headings and frontmatter are ignored; CRLF parses; a mismatched or uppercase tag yields nothing; an empty file yields nothing), and every cited title resolving to a non-empty entry; written last, while the examples still cite. **Recommended.**
- **`UIX/Menus/InfoButton.test.tsx`:** the dwell, the hold, the second click, Escape, the one-open slot, the touch tap, the click stop, and the accessible name, beside `ManageRow`'s neighbors; it keeps exercising the InfoButton once the examples leave (G-2).
- **The File-List Helper:** `Core/Testing/engineGraph.ts`, beside `importSpecifiers`, used by the citation test, `manifest.test.ts`, and `hostGraph.test.ts`.
- **Cases Added to Existing Tests:** `hoverReveal.test.tsx` (a per-caller dwell, `reset`) and `readOnlySelection.test.tsx` (the opt-out).

##### The Drive

- **`.claude/scripts/Info Buttons Drive/`:** `live-drive.mjs` and `MATRIX.md`, port 9413, shots `info-shots`; named for the feature, as the Archive and Alias drives are. **Recommended.**
- **`.claude/scripts/InfoPane Drive/`:** names a component, which no other drive does.

##### `settingsRow`'s Home

- **`Core/Settings/frames.ts`, Beside `RowText`:** the map from Settings' row text to the menu row lives with the text it maps; it needs only type imports from UIX. **Recommended.**
- **Stays in `SettingsWindow.tsx`:** the path and clear rows become trailing controls the switch wraps, which contradicts F-5's "take their whole row."
- **A New `Core/Settings/settingsRow.ts`:** a file for a five-line function.

---

#### What Becomes False

##### Code and Tests

- `UIX/Interactions/hoverReveal.ts:28`: "A dwell opens on REVEAL_DWELL_MS and closes on the grace." The dwell becomes the caller's.
- `UIX/Menus/menu-row.css.ts:258`: "A row's accessory overhangs into the row's padding, so an eye or × row stands as tall as a plain one." The overhang becomes a shared class worn by the InfoButton too.
- `Core/MarkdownPM/readOnlySelection.test.tsx:12`: "A read-only portal must stay SELECTABLE" frames every read-only editor; the InfoPane opts out.
- `Core/Settings/SettingsFieldRow.tsx:4`: leaves with the file.
- `Core/Settings/ExclusionRows.test.tsx:30` and `Core/Settings/PreviewRulesRow.test.tsx:42`: their `hint=` props stop compiling.
- `UIX/Interactions/hoverReveal.test.tsx:54` and `:202`: their `dwell: true` and `dwell: false` props change under the `dwellMs` shape.
- **Outside the Repo:** `~/The Studio/.claude/dashboard/src/showcase/MenuLeaf.tsx:32` (`<MenuItem leading={dashed} subLabel="Sub-label">`) and `:59` (`subLabel="Sub-label"`) fail Pommora's typecheck once `subLabel` is renamed.
- **Staying True:** `Core/Session/pageConnections.ts:14` ("`inert` … for a glance or a page's history"), since the InfoPane passes no connections; `PageReaderWindow.tsx:69` ("The one read-only page window"); `Core/Interface/Windows/page-window.css:30`; `UIX/Menus/MenuIndex.test.tsx:117` ("passes a field trailing and a caption through"); `Core/Settings/NexusRows.test.tsx:130`; and `hoverReveal.test.tsx:191`.

##### Feature Docs

- `.claude/Features/PommoraUIX.md:361`: "`MenuCaption`" and "the order a menu stacks: TopRow, heading, item, action row, separator, caption, footing" become `MenuDesc` and "desc"; "`MenuItem` carries `leading` · title · `subLabel` · `detail` · `trailing` · `overlay`" becomes `caption` and gains the info slot. The table carries no `**SOURCE:**` line, so `check-atlas` won't flag it.
- `.claude/Features/PommoraUIX.md:362`: the Row classes list and `AccessoryButton` change if the overhang becomes shared.
- `.claude/Features/PommoraUIX.md:199`: "row sub-label → Caption" becomes "row caption → Caption."
- `.claude/Features/PommoraUIX.md:336`: the Hover Reveal row stays true; the InfoButton gains its own row wherever it's placed.
- `.claude/Features/PommoraUIX.md:221`: "`UIX/Buttons/` — the one button recipe" becomes false only under the `Buttons/` placement.
- `.claude/Features/InteractionPM.md:38`: "`useHoverReveal` carries the timed cases — a dwell before opening …" gains the per-caller dwell, and the touch exception carries its reason here.
- `.claude/Features/MarkdownPM.md:10`: "the same editor run inside a page, a window, a tile, a Text value's pane, the one-line field … and a test harness" gains the InfoPane, and the editor's opt-out of selection.
- `.claude/Features/ConfigurationPM.md:20`: "whose hint is the first twelve characters of the device fingerprint" is already false (This Device carries no caption, `NexusRows.tsx:125`; the fingerprint is each device row's caption, `:231`); "a Sync row whose hint reports" becomes "caption."
- `.claude/Features/ConfigurationPM.md:22`: "The Sync row's hint follows the client's own four states" becomes "caption."
- `.claude/Features/ConfigurationPM.md:63`: the Hover Previews row stays true; B-2 earns a clause so a reader doesn't assume it governs InfoPanes.
- **A New Home:** the InfoIndex and InfoPane as an app behavior have no owning doc; `.claude/Features/InterfacePM.md`, beside *§Confirmation & Notifications*, is the natural candidate, and it's where the mechanism's reason for shipping without callers is stated (*One Way*).

##### Already False Beside the Glyph's Sizing

- `.claude/Features/PommoraUIX.md:237`: Inline's "radius `4px`" is `6px` in code (`button-base.css.ts:29`).
- `.claude/Features/PommoraUIX.md:238`: Small's "padX `4px`" is `8px` (`button-base.css.ts:35`).
- `.claude/Features/PommoraUIX.md:409`: "the button ladder's `4/6/10/12`" is `6/6/10/12`.
- The table's "segment" column (18, 20, 24, 28px) matches no field in `SIZE`; the divider heights there are 12, 14, 16, and 18px (`button-base.css.ts:30-54`). What "segment" denotes is unverified.

##### Issues

- `.claude/IssuesPM.md:79` and `:996`, `:1004`, `:1008` (I-079): a Settings row's "hint" becomes "caption."
- `.claude/IssuesPM.md:98` and `:1142`, `:1150`, `:1154` (I-061): "a row's hint" becomes "caption." Its substance stands, since captions stay (F-2) and the format rows ship no InfoButton.
- `.claude/IssuesPM.md:1439` (`[^61]`): "`MenuItem`'s hint" at `MenuRows.tsx:153`, "`subLabel`" at `menu-row.css.ts:205`, and `settingsRow` at `SettingsWindow.tsx:47-52` (already stale; it's `:54-59`).
- `~/The Studio/.claude/dashboard/data/pommora-issues.md` follows `IssuesPM.md` through the post-commit copy.

##### Structure and Tooling

- `.claude/CLAUDE.md:117`: "`// Dashboard | • The line ledger and design-system showcase pages`" is already false; the dashboard lives in `~/The Studio/.claude/dashboard/`.
- `.claude/CLAUDE.md:99`: "`Button.tsx + button-base.css`" names `button-base.css.ts`; it under-describes the folder only under the `Buttons/` placement.
- `.claude/Guidelines/Development-Environment.md` *§Gates & Commits*: gains the InfoIndex's daily commit beside its `--only` rule.
- `.claude/scripts/README.md`: gains the drive's paragraph, which leaves with the drive.
- `~/.claude/scripts/cross-file-mirroring/mirror-map.md:90-101`: gains the pinned row and loses `:101`.
- `~/.claude/scripts/auto-push.sh:4`: gains the commit line before the loop.
- **Planning Records:** *Info Buttons — Decisions & Intention* B-2's "which takes its dwell per caller" becomes true only with the hook change, and C-2's "as the history reader's is" holds for the inert flag alone; *Info Buttons — Scout Findings*' "`reset` isn't returned" becomes false.

---

#### Order Constraints

1. **Removal First:** F-5 and the renames land before the InfoButton's slot, so the slot is written once in its final vocabulary.
2. **The Rename Order:** `MenuCaption` → `MenuDesc` and its style `caption` → `desc` (`menu-row.css.ts:234`) land before `subLabel` → `caption` (`:205`, `MenuRows.tsx:71`, `:96`, `:153`, `MenuIndex.tsx:145`, the two direct callers), or two `caption` exports collide; the Settings rename (`RowText`, the 63 keys, `settingsRow`, `ManageRow`, the four rows, the two tests) follows with F-5.
3. **The Cross-Repo Edit:** The Studio's `MenuLeaf.tsx:32`, `:59` change in The Studio's repo with or before Pommora's `subLabel` commit, since Pommora's typecheck compiles the dashboard; The Studio's own post-commit pushes it.
4. **The Hook Before the Glyph:** `useHoverReveal`'s per-caller dwell, `reset`, and exported `coarse` land before the InfoButton, with their cases in `hoverReveal.test.tsx`.
5. **The Test Last, While the Examples Cite:** D-3's test is written once the examples cite their entries, and it still passes after they leave.
6. **Reviews Over the Live Examples:** the two-wave and neutral review runs while the examples are live; every statement of intent says real rows come later (G-2).
7. **The Examples' Removal and Its Re-Verification:** the entries, both citations, the drive, its README paragraph, and any `IterationWindow.tsx` preview leave in one step, followed by the three gates and a live check that no InfoButton draws.
8. **The Mirror and the Commit Line Last:** the empty InfoIndex is committed once (an untracked path errors under the commit line), then the pinned mirror row lands with `:101`'s removal, then the `auto-push.sh` line. With either live while the examples exist, Claude's wording reaches NexusOS or a "wording" commit.

---

#### Questions for Nathan

1. **Disabled and Variant Rows in the Drive:** A-4 (a disabled row) and A-2's glyph, type, and border combinations have no live case on Label Format and Value Format, and a disabled row's pointer behavior is one jsdom can't test. Should the drive use `IterationWindow.tsx` (⌘⇧T) as a third temporary example surface holding a disabled citing row and the variants, removed with the examples? **Recommendation:** yes; it's the codebase's stated scratch surface, and it's reverted in the same step.
2. **The Drive's Afterlife:** retire it with the examples, recording its matrix and results in the plan's Results document, or keep it dormant until a real row cites an entry? **Recommendation:** retire it; a drive that can't open anything reads as leftover.
3. **Open Item 1 With an Empty Index:** with the mirror wired last, the vault note seeds empty, so how the tags draw in NexusOS can't be seen until the first real entry. Should Pommora's half (HTML Formatting on and off) be checked against the examples in `~/Test` during the drive, leaving Obsidian's half to the first real entry? **Recommendation:** yes.
4. **`settingsRow`'s Home:** F-5 has the path and clear rows build their own row through `settingsRow`, which then moves to `frames.ts` beside `RowText`; the alternative keeps it in `SettingsWindow.tsx` with those two rows reduced to trailing controls the switch wraps. **Recommendation:** `frames.ts`, so every Settings row component takes its whole row.
5. **The Dead Resources Row:** remove `mirror-map.md:101`, a `~/.claude` edit, beside the pinned row? **Recommendation:** yes; it maps a folder that doesn't exist and would trash three vault notes if one were recreated.
6. **The Dashboard Line:** remove `.claude/CLAUDE.md:117`'s `// Dashboard` line, or repoint it to The Studio's dashboard? **Recommendation:** remove it; The Studio's CLAUDE.md already names the dashboard.
7. **A Failing Daily Commit:** a NexusOS wording edit that carries a personal name lands a tree whose lint fails, and an entry renamed while a row cites it lands a failing test; the daily line runs neither gate. Accept that, with the next session's gates catching it? **Recommendation:** accept it; the fix is a wording edit, and a gate in the line adds a mechanism for a case that's rare and loud.

---

#### Corrections

- **B-2's Mechanism:** `useHoverReveal` doesn't take its dwell per caller; `dwell` is a boolean and the duration a module constant (`hoverReveal.ts:31`, `:77`). The hook changes.
- **B-1's Close Paths:** they need `reset` returned from the hook (`hoverReveal.ts:156`); without it, a second click leaves the pane open under the resting pointer and Escape on an unheld pane is swallowed.
- **B-4's Opt-Out:** the hook offers none today; a dwell instance rests open under `(hover: none)` (`hoverReveal.ts:156`), and `coarse` isn't exported (`:18`).
- **F-5's "Built Through `settingsRow`":** holds for the path and clear rows only; the exclusions and preview-rules rows build through `ManageRow` (`ManageRow.tsx:32-64`).
- **C-2's "As the History Reader's Is":** the reader resolves `[[links]]` against the Nexus through `useConnections('inert')` (`PageReaderWindow.tsx:89`, `pageConnections.ts:32`); "carry no meaning" takes a host with no connections.
- **The Log's `frames.ts:72`:** `RowText` is at `:74`, its `hint` at `:76`.
- **"`TextPane` Is the Precedent for a `MarkdownEditor` in a Dropdown":** `TextPane` mounts `ValueEditor` (`TextPane.tsx:7`); the sizing precedent for `MarkdownEditor` in a pane is the glance (`glance-pane.css:32-49`).
- **The Context-Menu Leak (Index Scout):** on prose, main's Copy and Select All menu isn't reached inside a pane; `PickerMenu`'s layer already prevents `contextmenu` (`PickerMenu.tsx:31-37`, `:330`), and an editor without connections claims no link menu (`linkClicks.ts:148`). A table or citation row in an entry still pops the editor's own menu (`editorHost.tsx:101-105`). To confirm live.
- **`PickerControl`'s `door` as a One-Open Slot (Behavior Scout):** `let door` (`UIX/Pickers/PickerControl.tsx:29-33`) is an injected seam, not an open slot.
- **The Commit Line's Position (Tooling Scout):** placing it before the loop isn't what pushes The Studio's dashboard commit; the post-commit hook pushes The Studio itself (`sync.mjs:117-118`).
- **The Line Ledger's Extensions (Tooling Scout):** `EXT` lives in `~/The Studio/.claude/dashboard/line-count.mjs:19`, imported by `projects/pommora.mjs:2`.
- **The Default Look "Draws More Than a Glyph" (Behavior Scout):** settled by the Default Look ruling, which names the grey square.
- **Scope Contradictions (All Scouts):** G-2, F-1, D-3, D-4, G-1, the Aliases citation, `ManageRow`'s `info`, and the caller-less end state are settled by the current log; `MenuHint` is `MenuDesc`, which removes the row scout's "a second meaning of hint" risk.
- **`editor-parity/worktree.sh` (Tooling Scout):** outside this plan's scope.
