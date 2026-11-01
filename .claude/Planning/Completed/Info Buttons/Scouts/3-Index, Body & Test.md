### Scout 3 — Index, Body & Test

**DATE:** 10-27-2026
**SCOPE:** the InfoIndex and its loading, the citation call, the pane's body, the no-selection rule, and the test (C-1 to C-3, D-1 to D-5, the IDs ruling), under the examples-only scope. Cleaned against *Info Buttons — Investigation*.

---

#### Contradictions With the Log

1. **C-2's "As the History Reader's Is":** `PageReaderWindow.tsx:89-90` passes `useConnections('inert')`, which builds a full `{ index, open: () => {}, headingsOf }` over the open Nexus (`Core/Session/pageConnections.ts:32`). Under that host, `[[Some Page]]` in an entry resolves and colors against whatever Nexus is open, and `![[Some Page]]` renders an inert page tile. Passing no connections is what makes them meaningless: tiles build from `conn ? scan.embeds : []` (`Core/MarkdownPM/Embeds/embedWidget.tsx:394`), and `linkUnder` acts on web links alone when `api` is absent (`Core/MarkdownPM/Links/linkClicks.ts:56`). The inert flag matches the reader's; the connections don't.
2. **The Precedent `TextPane` Isn't `MarkdownEditor`:** `TextPane` mounts `ValueEditor` (`Core/Properties/Pickers/TextPane.tsx:7`), whose shell carries no `mdpm-fill`. The sizing precedent for a `MarkdownEditor` in a `PickerMenu` is the glance (`Core/Interface/Glance/glance-pane.css:32-49`), which renders through `PageTile`.
3. **`focus="keep"` Contributes Nothing to C-3:** `keepFocus` exempts `[contenteditable="true"]` targets (`UIX/Interactions/shared.ts:15-19`), and a read-only `MarkdownEditor`'s content is `contenteditable="true"` (`Core/MarkdownPM/readOnlySelection.test.tsx:16`), so a press on the text is never prevented by the pane, and React's bubble phase runs after CodeMirror's own listener on `contentDOM`.

---

#### Findings

##### Loading the InfoIndex (D-1, D-2)

- **Typing:** `vite/client` declares `'*?raw'` as `string` (Vite 7.3.5). Every config that compiles Core carries it: `Core/tsconfig.json:10`, `Core/tsconfig.src.json:4`, `UIX/tsconfig.json:11`, and `Desktop/Renderer/env.d.ts:1` for `Desktop/tsconfig.web.json`. No tsconfig change is needed, and nothing in the tree uses `?raw` yet.
- **Build and Dev:** Vite's asset plugin reads a `?raw` file as UTF-8, emits it as a default-exported string, and watches it, so a mirror write in dev invalidates the loader. `Desktop/electron.vite.config.ts:14-18` sets the renderer root to `Desktop/Renderer` with `server.fs.strict: false`, so a Core-side `.md` resolves in dev.
- **Tests:** `Core/vitest.config.ts` runs Vite's plugins, so `?raw` resolves identically in tests.
- **Parse Shape:** one global multiline regex over the raw text, `^<([a-z0-9]+(?:-[a-z0-9]+)*)>\r?\n([\s\S]*?)\r?\n</\1>[ \t]*$` with `gm`, each match trimmed into a `Map<string, string>`. The kebab pattern enforces the IDs ruling, the back-reference closes each tag on its own ID, the line anchors keep an inline `<u>` or a `</x>` inside a sentence from matching, and `\r?\n` survives a Windows checkout. Headings and any frontmatter sit outside every match and are ignored with no frontmatter handling, which matters since the mirror's `description` and `version` keys cross into the source when either side carries them (`~/.claude/scripts/cross-file-mirroring/mirror-map.md:13-18`). An empty file yields an empty `Map`.
- **The Blank Lines:** under CommonMark's HTML-block rule, a line holding only a complete open or closing tag starts an HTML block that ends at the next blank line, so the blank line after `<label-format>` lets the Markdown between render, in Obsidian and in Pommora (`.claude/Features/MarkdownPM.md:27`). The parser only needs the tag line, the body, and the closing tag line, so it doesn't enforce them.
- **The Graphs:** `engineGraph`'s `resolveBase` tries code extensions only (`Core/Testing/engineGraph.ts:64-75`), so `./InfoIndex.md?raw` lands in `externals` (`:95-97`); reached from `Core/Contract/serve.ts`, it would fail `Core/Contract/engineGraph.test.ts:13-23`. The loader stays renderer-side. `Core/manifest.test.ts:31` skips relative specifiers.
- **Lint:** Biome ignores `.md`; `no-wrapped-comments.mjs --scan` reads code files only; `no-name-mentions.mjs --scan` reads every tracked file outside `.claude/` (`~/The Studio/.claude/hooks/no-name-mentions.mjs:19-21`), so the InfoIndex can't carry Nathan's name.

##### The Citation Call (D-2, C-1)

- **The Constraint:** `Core/Properties/Schema/formatRows.ts` is a `.ts` file building rows through `pickerRow` (`UIX/Menus/MenuIndex.tsx:54-77`), so the citing call is a function in a `.tsx` that returns a `ReactNode`, the UIX `InfoButton` element with the pane's body as its child.
- **The Slot:** `info?: ReactNode` on `MenuItem` and on the `MenuRow` item, passed through `rowNode` (*1-Rows & Captions · §The InfoButton's Slot*). `look` is the InfoButton's own props minus its children (glyph, type, outline), so the call declares no new type.
- **A-5's Name and the Call's Arity:** "Label Format - Info" needs the row's title as a string. Three shapes:
  - **The title alone, `info('Label Format', look?)`:** the IDs ruling makes the ID the title in kebab case, and the converter exists (`formatKey(label, 'kebab-case')`, `Core/Properties/keyFormat.ts:67`, `:76-77`), so one string yields the ID and the name; the test kebabs each cited title with the same converter. A renamed title renames its entry, which the test catches. The converter keeps an all-caps run whole ("Nexus ID" → `nexus-id`) and keeps punctuation as a word ("Date & Time" → `date-&-time`, which the tag pattern rejects) (`keyFormat.ts:29-41`).
  - **An ID and a title, `info('label-format', 'Label Format', look?)`:** the ID survives a title rename, at the cost of stating one fact twice.
  - **An ID alone, with `aria-labelledby`:** `MenuItem` gives its title span an ID and hands it to the InfoButton through a context, which every host outside menus would repeat.
- **The Literal:** whichever shape, the cited string stays a literal at the call site so a scan reads it; a parameter (`info(label)` inside `formatRows`' helper) hides the citation, so the scan fails on a non-literal argument rather than skipping it. No other function in the tree is called bare `info(`.
- **Absent Entries at Runtime:** the test guarantees committed citations resolve, but the InfoIndex changes outside sessions: the mirror writes NexusOS edits into the working tree while dev runs, and the daily commit lands them without tests. Drawing no InfoButton for an absent or empty entry is one conditional with that producer behind it.

##### The Body (C-1, C-2)

- **What Mounts:** `MarkdownEditor` with `initialBody={entry}`, `onChange={() => {}}`, `readOnly`, and `host={useEditorHost({ inert: true })}`; `connections` is optional (`Core/Pages/editorHost.tsx:29-36`). With no `pageId`, `prefs` is undefined and the editor lands on an animation frame (`Core/MarkdownPM/MarkdownEditor.tsx:233-243`); with no connections, `embedAncestors` is moot. `inert` drops the glance and the format menu (`editorHost.tsx:106-113`), and web links still follow through `openLink` (`:144`). `MarkdownEditor` always runs the `page` scope (`MarkdownEditor.tsx:149-154`), so headings, lists, code, and emphasis draw.
- **Sizing Inside 285px:** the shell is `mdpm-shell mdpm-fill` (`MarkdownEditor.tsx:292`), whose `height: 100%` resolves to auto inside the auto-height pane (`Core/MarkdownPM/markdown-pm.css:27-34`), so the pane sizes to content without an override. What does need overriding, by precedent:
  - `.mdpm-editor .cm-content`'s `padding: var(--header-zone, 90px) 0 90px var(--rail-inset)` (`markdown-pm.css:55`, `:67`), which `Core/Properties/Pickers/text-pane.css:18-22` and `glance-pane.css:43-45` both override.
  - `--rail-inset: 0px` and the fold chevron hidden (`glance-pane.css:32-34`, `:47-49`), since the pane has no rail.
  - A height cap on `.cm-scroller` with `overflow-y: auto !important` over CodeMirror's runtime overflow rule (`glance-pane.css:35-41`), so the editor's own `Scrollbar` (`MarkdownEditor.tsx:295`) keeps drawing.
  - `cursor: default` and the caret layer hidden (`Core/Interface/Windows/page-window.css:30-36`).
  - The editor's `interface-inset` reads `--sidebar-clearance`, defined only on `.shell` and `.window` (`Core/Interface/styles.css:58`, `:76-78`); the pane portals to `document.body` (`UIX/Pickers/PickerMenu.tsx:310-347`), so it computes to nothing there, as in the glance.
  - A cited entry is never empty (D-3), so the placeholder list (`markdown-pm.css:79`) doesn't need the pane.
- **Sharing the Glance's Rules:** the glance's rules hang off `.glance-body .page-tile`, and the InfoPane mounts `MarkdownEditor` without a page tile, so a shared selector would reach from one pane's file into the other's class.
- **First-Open Cost:** the editor's module graph is already in the renderer bundle, so nothing new loads. Each open builds one `EditorView` over a short document with the page extension set (`MarkdownEditor.tsx:133-189`) plus two store subscriptions from `useEditorHost` (`editorHost.tsx:166-170`), the per-open mount the glance and `TextPane` already pay; `PickerMenu` renders nothing closed (`PickerMenu.tsx:305`).

##### No Selection (C-3)

- **Why CSS Alone Fails:** `body` is `user-select: none`, restored for `input, textarea, [contenteditable="true"]` (`Core/Interface/styles.css:30-39`), and a read-only editor keeps `contenteditable="true"` on purpose (`readOnlySelection.test.tsx:12-17`). CodeMirror also handles a primary press itself: its `mousedown` starts a mouse selection and focuses `contentDOM`, and it writes the DOM selection whenever a change comes from the pointer (`@codemirror/view` 6.43.1).
- **The Paths That Leak:**
  1. **Pointer:** a press or drag selects, through CodeMirror's mouse selection and native selection.
  2. **Keyboard:** a `contenteditable="true"` element sits in tab order; once focused, ⌘A and ⌘C work.
- **Right-Click on Prose Is Already Covered:** `PickerMenu`'s layer prevents `contextmenu` (`PickerMenu.tsx:31-37`, `:330`), and an editor without connections claims no link menu (`linkClicks.ts:148`), so main's menu with Copy and Select All (`Desktop/Actions/editorMenu.ts:77-99`, `:134-137`) isn't reached inside a pane. The inert host still supplies the grip, table, and citation menus (`Core/Pages/editorHost.tsx:101-105`), whose handlers run on `contentDOM` first, so a table or citation row in an entry pops the editor's own menu. To confirm live.
- **The CodeMirror Lever:** an event already default-prevented doesn't belong to the editor (`node_modules/@codemirror/view/dist/index.js:4828-4832`), and a handler returning true prevents default and stops the rest (`:4533-4545`). React 19 listens on every portal container, so a React `onMouseDownCapture` on the body's wrapper runs before CodeMirror's `contentDOM` listener, and one `preventDefault` there stops the mouse selection, native selection, and the focus a press would give.
- **Links Survive:** a prevented `mousedown` doesn't suppress `click`; only a prevented `pointerdown` suppresses the mouse events (`.claude/Guidelines/Editor-Internals.md:41`). Web links follow on `click` (`Core/MarkdownPM/Gestures/pointerPath.ts:82-93`), where the selection is empty, so they keep opening. To verify live.
- **The Keyboard Path:** only `EditorView.editable.of(false)` closes it: `contenteditable` becomes `"false"` (`index.js:8225`), the content leaves tab order, and `body`'s `user-select: none` applies once the opt-in stops matching. On its own it doesn't stop the pointer's selection write, so it pairs with the `mousedown` claim.
- **Other Read-Only Surfaces** stay as they are under either approach: the reader and the glance don't pass the opt-out.

##### The Test (D-3)

- **Finding Citations:** a syntax-tree walk in the shape of `importSpecifiers` (`Core/Testing/engineGraph.ts:13-41`): every call whose callee is the citation's identifier yields its first argument, and a non-literal argument fails the test. A text regex would miss a non-literal call silently.
- **The File List:** `Core/manifest.test.ts:20-36` and `Desktop/hostGraph.test.ts:8-15` each parse a tsconfig into its file list; a third copy is the reason to lift one helper into `Core/Testing/engineGraph.ts` beside `importSpecifiers` for all three. `Core/Matrix/Engine/engine.test.ts:7-10` is the "read from disk, never a fixed list" precedent.
- **What It Pins Once the Examples Leave:**
  - **The parse, on inline samples:** an entry parses and trims; headings and a frontmatter block are ignored; CRLF parses; a mismatched closing tag yields no entry; uppercase or underscored IDs don't match; the empty string yields nothing. This pins D-1's format apart from the shipped file.
  - **Every cited title resolves to a non-empty entry:** vacuous with no citations, and the gate on the first citing row.
  - **The real file parses**, to an empty map today. A "no malformed tags anywhere" check would fail on a draft typed in NexusOS, against D-3's draft allowance, so it stays out.
- **What It Doesn't Pin:** "the file is empty" or "nothing cites," which would fix today's temporary state into the suite.

---

#### Chain of Logic & Reuse

- **Content:** `InfoIndex.md` → a `?raw` string at module load → one regex → `Map<id, body>`.
- **Citation:** a row's call → the `InfoButton` element (UIX) wrapping the body (Core) → `MenuItem`'s `info` slot.
- **Body:** the pane opens → `PickerMenu` mounts its children → `MarkdownEditor` (read-only, inert host, no connections, unselectable), styled by the glance's and text pane's overrides.
- **Reused As-Is:** `vite/client`'s `?raw` typing, `MarkdownEditor`, `useEditorHost`, `formatKey`, `importSpecifiers`-style scanning, and `Editor-Internals.md:41`'s mousedown rule.

---

#### Removal & Simplification

- Nothing in this domain exists to remove: there's no prior help text, loader, or index, and captions stay (F-2).
- The InfoPane's host drops `resolveOnly` and the embed sentinel, which serve page bodies that cite the Nexus.
- The tsconfig file lists consolidate across `manifest.test.ts`, `hostGraph.test.ts`, and the citation test.
- The loader, the call, and the body fold into one `.tsx`, unless the test's import weight argues for splitting the parse out.

---

#### Approaches

##### Approach 1 — Wrapper Handlers, No MarkdownPM Change

- **Files:** one Core `.tsx` holding the `?raw` import, the parse, the call, and a private body component (a `div.info-pane` with `onMouseDownCapture` preventing default, around `MarkdownEditor`), plus one CSS file and one test.
- **Reasoning:** it touches no shared editor API.
- **Cost:** it leaves the keyboard path open: tabbing past the app's last control into the body-portalled pane reaches a focusable `contenteditable`, where ⌘A and ⌘C work. C-3 is confirmed, and this doesn't fully meet it.

##### Approach 2 — One Opt-In `MarkdownEditor` Prop

- **The Prop:** `selectable?: boolean` (default `true`). When false, it adds `EditorView.editable.of(false)` and a highest-precedence `EditorView.domEventHandlers({ mousedown: () => true })`, which makes CodeMirror prevent the press itself.
- **Reasoning:** one owner for "an editor nothing can select" closes the pointer and keyboard paths, and `body`'s `user-select: none` takes over natively; a press no longer focuses the editor, which also ends the focus leak the behavior scout found. `readOnlySelection.test.tsx:12`'s comment gains its scope, and the test gains a case pinning `contenteditable="false"` for the opt-out.
- **Cost:** about six lines in `MarkdownEditor.tsx` and one prop, a shared editor API gaining a mode with one user.
- **Risk:** the link path reads `view.hasFocus` and the selection (`pointerPath.ts:7-10`, `:82-88`); with `editable` false the content can't take focus, so the follow still runs. Verify live that web links follow.

##### Approach 3 — Split the Parse From the Pane (With 1 or 2)

- **Files:** `infoIndex.ts` (the `?raw` import, the parse, the map) beside the `.tsx` holding the call and the body.
- **Reasoning:** the parse test imports no React, CodeMirror, or CSS, and the file names read as "the data" and "the pane."
- **Cost:** one more file and its import overhead; without it, the test imports the `.tsx`, which pulls the editor graph into the test, as other tests already do.

---

#### Placement Candidates

Nathan approves every placement (H-1).

1. **`Core/Interface/Info/`:** `InfoIndex.md`, the loader and call (`.tsx`), `info-pane.css`, and the colocated test. Its structural twin is `Core/Interface/Glance/` (a Core pane over UIX's `PickerMenu` holding a read-only editor, with `GlancePane.tsx`, `glance-pane.css`, and tests together). `Core/Matrix/README.md` and `Core/Tiles/README.md` show a tracked `.md` under Core.
2. **A top-level `Core/Info/`:** its own domain in the Codebase Structure, with room for the *User Guide* prospect; a new top-level folder for three small files, while `Interface/` already holds the glance and the confirmation dialogs.
3. **`Core/Settings/` or `Core/MarkdownPM/`:** Settings ties the index to one surface, and MarkdownPM is the editor rather than content written for it.

The file-list helper goes in `Core/Testing/engineGraph.ts` beside `importSpecifiers`.

---

#### What Becomes False

- `.claude/Features/MarkdownPM.md:10` — the surfaces "the same editor run[s] inside" (a page, a window, a tile, a Text value's pane, the one-line field, a test harness) gain the InfoPane, and the editor's opt-out of selection.
- `Core/MarkdownPM/readOnlySelection.test.tsx:12` — "A read-only portal must stay SELECTABLE" frames every read-only editor; the InfoPane opts out.
- **Staying True:** `Core/Session/pageConnections.ts:14` ("`inert` … for a glance or a page's history"), since the InfoPane passes no connections; `Core/Interface/Windows/page-window.css:30`; `Core/Properties/Pickers/text-pane.css:17`; `PageReaderWindow.tsx:69` ("The one read-only page window"); `Editor-Internals.md:41`; `engineGraph.test.ts`, `hostGraph.test.ts`, and `manifest.test.ts`.

---

#### Risks

- **HMR on a Mirror Write in Dev:** the loader `.tsx` exports a non-component, so React Fast Refresh can't accept it, and an InfoIndex edit likely reloads the renderer; dev-only and harmless.
- **Tag Rendering in NexusOS** (Open Item 1): with HTML Formatting on, Pommora draws `<label-format>` lines in the HTML Tag Color and reads the Markdown between as written (`MarkdownPM.md:27`); Obsidian treats each tag line as a one-line HTML block.
- **Scheduled Commits:** the daily commit of a NexusOS edit lands without lint or tests; a name mention, or a cited entry emptied or renamed, reaches `active` failing. Nothing cites in this pass, so it becomes real with the first citation.
- **Touch Long-Press** (the Mobile Companion): a WebView long-press selects inside a `contenteditable="true"`; Approach 2's `editable` false and `body`'s `user-select: none` cover it.
