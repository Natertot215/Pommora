## Link Formatting — Decision Log

### Frame
- **Purpose:** Give a pasted URL a chosen display form in MarkdownPM, defaulted nexus-wide and overridable per link.
- **Core Value:** A pasted address reads as something a person recognizes instead of a raw URL, without the user having to author markdown link syntax by hand.
- **Success Criteria:** Pasting a URL into a page produces the chosen form; a per-link right-click changes that one link; nothing about the toggle-off path differs from today's behavior.

### Sources
- `Pommora/src/shared/links.ts` — the whole external-URL vocabulary already exists: `linkDomain` (Short Link's exact function), `isHttpLink` (the title-fetch gate), `isValidLink`, `normalizeLinkUrl`, `markdownLinkRegex`, `escapeAlias`/`unescapeAlias`.
- `Pommora/src/main/linkTitles.ts` + `src/main/index.ts:1376-1383` — `linkTitles:get` / `linkTitles:fetch` IPC, main-side persistent cache. **Page Title's fetcher is already shipped.**
- `Pommora/src/renderer/src/store.ts:993-1008` — `linkTitles` map + `resolveLinkTitle`, with in-flight and failed sets. Async, fire-and-forget.
- `Pommora/src/renderer/src/Detail/Views/Table/linkValue.ts:64-74` — `linkDisplayText`: `link-title` shows the fetched title, **falling back to `linkDomain(url)`**. Domain is a fallback there, not a mode.
- `Pommora/src/shared/properties.ts:82-84` — `link_display: 'link-url' | 'link-title'` on URL properties. The same vocabulary, two-valued.
- `Pommora/src/renderer/src/Components/Detail/URLEditor.tsx:59-68` — drives it as a **Switch labelled "Full URL"**, not a picker.
- `Pommora/src/renderer/src/MarkdownPM/index.tsx:195-199` — `pasteURLAsLink: false`, disabled on purpose against a stated "paste-preserves-literal-text rule".
- `Pommora/src/renderer/src/MarkdownPM/editor/links.ts` — the markdown-link gesture layer: click follows, `contextmenu` hands `{kind:'url'|'page'}` to the host menu hook.
- `Pommora/src/main/connMenu.ts` — the link right-click menu is a **native Electron menu**; an external URL currently gets only Copy Link.
- `Pommora/src/renderer/src/Embeds/connectionMenu.ts` — the renderer side that pops it and dispatches the chosen action.
- `Pommora/src/renderer/src/Components/Detail/PickerControl.tsx` — **already is** the double-chevron control: two options toggle in place, three+ pop a centered `PickerMenu` of radio options.
- `Pommora/src/renderer/src/Settings/NexusSettings.tsx:50-102, 199-224` — the settings leaf schema is `toggles` only, plus one bespoke `LingerRow`; its own comment says the row schema generalizes when a second non-toggle row exists.
- `Pommora/src/renderer/src/MarkdownPM/AutocompletePanel.tsx:44-61` — the autocomplete surface: `NotchedPane` with `notchHeight={0}`, body-portalled, caret-anchored, **no backdrop**, `dropdownOpen`/`dropdownClose` motion.
- `Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx` — the beaked pane: placement, flip, backdrop, focus trap and return.
- [[ConfigurationPM]] — the personalization key roster and the clean-file discipline (a default-valued knob stores no key).
- [[MarkdownPM]] §Inline marks — markdown links resolve through one shared resolver for editor, cell renderer, and click path.
- `Pommora/src/main/editorMenu.ts` — the prose context menu, installed on the window's `context-menu` event; its `Format ▸` submenu and its `menu:action` push channel.
- `Pommora/src/main/menu.ts:81` — `{ role: 'editMenu' }`, which registers ⌘⇧V for Paste and Match Style main-side.
- `Pommora/src/main/returningMenu.ts` + `Pommora/src/main/gripMenu.ts` — the returning-ask menu pattern and the submenu shapes (radio, checkbox, parameterized action) to follow.
- `Pommora/src/renderer/src/MarkdownPM/Tables/CellEditor.tsx` — the second `EditorView` and its own extension array.
- `Pommora/src/renderer/src/MarkdownPM/editor/folding.ts` — `tr.changes.mapPos` with per-end assoc plus a validity prune: the range-anchoring shape C-4 needs.
- `Pommora/src/renderer/src/Components/Detail/NumberEditor.tsx` — `PickerControl` rows and `Reveal`-disclosed rows in one file.
- `Pommora/src/renderer/src/testing/editorHarness.ts` — `stubEditorBridge` / `mountEditor`; jsdom lacks `ClipboardEvent` and `DataTransfer`, so a paste test fabricates the event.

### Decisions
#### A — Scope
- **A-1:** [confirmed] The `PopupMenu` design-system split is a separate cycle, specced after this one. It formalizes the beak-less pane the autocomplete panel uses — `NotchedPane` with `notchHeight={0}`, body-portalled, no backdrop, Bloom motion — and replaces the beaked `PickerMenu` in fixed-option pickers only; PropertyPickers and variable-input pickers keep what they have.
- **A-2:** [confirmed] Paste As is in scope for this cycle, not deferred.

#### B — Vocabulary
- **B-1:** [confirmed] "Page Title" is not a second phase. `linkTitles:fetch`, its main-side cache, and the renderer resolver ship today for URL property cells.
- **B-2:** [confirmed] "Short Link" is `linkDomain(url)` — host with `www.` stripped — which already exists and is already the title mode's fallback.
- **B-3:** [confirmed] The three-option double-chevron control is `PickerControl`; no new control is needed for "Default Format".
- **B-4:** [confirmed] One vocabulary nexus-wide: **Full Link · Short Link · Page Title**, stored as `link-full` / `link-short` / `link-title`. URL properties adopt it, so their "Full URL" Switch becomes a three-option `PickerControl`.
- **B-5:** [confirmed] Renaming `link-url` → `link-full` costs nothing on disk. `link_display` is validated `.catch(undefined)`, so an unrecognized stored value falls back to the default — and `link-url` *is* the default, so every affected property lands exactly where it already was. `link-title` keeps its spelling and its configured pages keep their mode.
- **B-6:** [confirmed] Page Title keeps falling back to Short Link while the fetch is in flight or after it fails. There is nothing else to show, and it is what the property cell already does.

#### C — Paste semantics
- **C-1:** [confirmed] Full Link writes `[https://host/path](https://host/path)` — the whole address as its own label, wrapped so it is a real link rather than inert text.
- **C-2:** [confirmed] Two settings govern paste, and **⌘⇧V always performs the inverse of whatever ⌘V is set to do.** *Automatically Format Pasted Links* governs a paste at a bare caret; *Paste Link Into Text* governs a paste over a selection. One rule, two axes, selected by whether a selection exists.
- **C-3:** [confirmed] Page Title writes **Short Link immediately** and rewrites the label in place when the fetch lands.
- **C-4:** [assumed] The late rewrite targets the range the paste inserted, mapped forward through intervening edits, and only lands if that label is still exactly what was written. Text-matching alone is insufficient — the same URL pasted twice would match in both places. `linkGestures.ts` already models "remember where a gesture put something" as a `StateEffect` + `StateField`, and this follows it.
- **C-5:** [assumed] The late rewrite is **undo-transparent** (`addToHistory: false`). Otherwise a single paste costs two ⌘Z presses to remove, which no other paste in the app does.
- **C-6:** [assumed] A rewrite whose editor has since unmounted is dropped. The deferred-work-outruns-teardown trap is the one `aliasOnLeave` is written against.
- **C-7:** [assumed] Flipping the Default Format after pasting does not cancel an in-flight rewrite: the setting governed the paste, and the fetch is finishing what that paste asked for.
- **C-8:** [confirmed] A URL carrying parentheses is fixed **at the grammar**, not at the writer. `markdownLinkRegex`'s target group is `[^)\r\n]`, which ends at the first `)` — so `…/wiki/Foo_(bar)` already truncates mid-address today, wherever it is authored. CommonMark's link destination allows *balanced* parentheses, and widening the target group to `(?:[^()\r\n]|\([^()\r\n]*\)){1,2048}` matches that: no encoding anywhere, the address stays on disk exactly as a person would type it, and every other reader of the file agrees with Pommora about where the link ends (→ Reasonable Translation).
  - One grammar, so one edit reaches every consumer: the editor tokenizer, `detect`, the rename scanner (`main/connections/scan.ts`), and the rename rewriter (`main/connections/rewrite.ts`). `MD_LINK` — the anchored property-cell form — already reads a greedy target and needs no change.
  - ReDoS-safe by construction: the two alternatives are disjoint on their first character (`(` versus not-`(`), so the quantifier cannot backtrack ambiguously — the failure mode the label group's cap exists against. Verified against unbalanced-open, unclosed-label, and long nested-run inputs; all return immediately.
  - Targets containing spaces and an unbalanced trailing `)` behave exactly as they do today.
  - **It is not fully behavior-preserving, and that needs a ruling.** A target carrying an *unmatched opening* paren — `[t](https://a.com/a_(b)` — matches today and does not match after the widening, at any nesting depth. CommonMark agrees with the new reading (an unmatched `(` in a bare destination is invalid), so the change is correct rather than a regression, but it is a change and the link becomes plain text.
  - **Nesting depth is a live choice.** The one-level pattern refuses a two-deep balanced target (`…/a_(b_(c)_d)`) that cmark renders as a link; a two-level pattern accepts it, costs one more alternative, and shows no backtracking on the same pathological inputs. Depth is Nathan's call.
- **C-9:** [assumed] Auto-format applies only when the clipboard holds a lone URL. Multi-line text, or a URL embedded in prose, pastes literally — it is a pasted document, not a pasted address.

#### D — Per-link Format
- **D-1:** [confirmed] Format rewrites the `[…]` label in the document and stores nothing. No sidecar, no per-link state, nothing to sync; the nexus-wide default applies at paste time only, so it stands on its own without an override layer to defer to.
- **D-2:** [confirmed] Only `[label](target)` tokenizes as a link — MarkdownPM has no bare-URL autolink, so a bare address in prose carries no Format menu. Accepted; autolinking is a Prospect.

#### E — Paste As
- **E-1:** [confirmed] The prose right-click menu already exists — `installEditorContextMenu` (`main/editorMenu.ts:190`) listens on the window's `context-menu` event rather than registering a CodeMirror handler, and already carries the system edit items, a `Format ▸` submenu, and Speech/Share. `Paste As ▸` is a new submenu on it.
- **E-1a:** [confirmed] That menu's actions travel back on the `menu:action` push channel, and `menu={{ pushState, onAction }}` is passed **only** by `Detail/PageView.tsx:134` — `Blocks/MarkdownBlock.tsx:76` and `Embeds/PageEmbed.tsx:152` mount the editor without it, so the existing `Format ▸` is already inert in blocks and embeds. Paste As uses the **returning-ask** pattern instead (`popReturningMenu`, as `popConnMenu` and `popGripMenu` do), which works in every surface and carries the context payload E-3 needs.
- **E-2:** [confirmed] The clipboard is write-only (`clipboard:write`); Paste As needs a `clipboard:read` channel to know what it is offering.
- **E-3:** [confirmed] The submenu offers what the clipboard's target can become, resolved through the existing `resolveMdTarget`: a page target offers Connection and Markdown Link; a URL target offers Full Link, Short Link, Page Title, and Plain Text.
- **E-4:** [confirmed] A target that resolves to a page wins outright — the existing resolver already rules this way on purpose, so that `Node.js` and `Notes.md` reach the pages they name rather than being read as websites. Page titles may contain periods (`invalidName` bans only `|`, hidden prefixes, and a trailing `.md`), but a copied URL carries a scheme or a slash, both of which `targetTitle` refuses. No new decision needed.
- **E-5:** [confirmed] Paste Link is removed as a menu item; ⌘⇧V covers it under the C-2 inverse rule.
- **E-6:** [confirmed] Grips are already excluded from the prose menu by the `gripHot` flag main checks first (`editorMenu.ts:192`). Links and connections are not: they `preventDefault()` in the renderer, which does not stop main's `context-menu` event. Whether both menus currently appear over a link is the one behavior to check on the running app before building; if they do, links and connections need the same hot-flag treatment grips have.
- **E-7:** [confirmed] ⌘⇧V is **already claimed**. `main/menu.ts:81` is a bare `{ role: 'editMenu' }`, whose `pasteAndMatchStyle` carries ⌘⇧V as its default macOS accelerator and registers it main-side — so the keypress never reaches the renderer and no renderer-side binding can fire. It also sits in the editor's own context menu (`editorMenu.ts:57`). Taking the chord requires expanding that role into an explicit submenu and dropping the item from both places.

#### F — Reach
- **F-1:** [confirmed] Auto-format applies in every MarkdownPM surface — table cells, page preview, embedded editors. A URL pasted into a cell has the same problem as one pasted into the body.
- **F-1a:** [confirmed] That costs two mounts, not one: `Tables/CellEditor.tsx:94` builds its **own** `EditorView` with its own extension array, sharing only some extensions with `MarkdownPM/index.tsx`. The paste handler goes in both, or F-1 is half-true. A cell is single-line GFM, so the label it writes must carry no newline and must escape `|`.
- **F-5:** [confirmed] No `paste` DOM handler exists anywhere in the editor today — this is the first. CodeMirror runs plugin handlers before its own, so position in the array does not affect preemption; the handler must check `state.readOnly` itself, because the read-only change filter (`index.tsx:182`) would otherwise drop its transaction silently.
- **F-6:** [confirmed] `Tables/guard.ts`'s `tableMergeGuard` is a `transactionFilter` that cancels multi-line or replacing inserts near a table outright. A paste transaction can be swallowed there without a trace.
- **F-7:** [confirmed] Personalization reaches the editor only through Zustand — no facet, no field. The extension array is built once (`index.tsx:378`, dep array `[]`), so a new setting must be read at dispatch time via `useSession.getState()` or through a ref, never captured into the array.
- **F-8:** [confirmed] `readNexus.ts:81-134` hand-coerces personalization; there is no zod for it. A key the writer persists but the reader never parses is silently dropped — it appears to work and reverts on relaunch. `readNexus.test.ts:441` pins every boolean knob against exactly this, and the new keys belong in that list.
- **F-9:** [confirmed] `main/index.ts:987` guards the link-config write with a hand-written `link_display === 'link-url' || === 'link-title'` chain. Widening the vocabulary without widening that guard silently drops the write.
- **F-10:** [confirmed] `ConfigurationPM.md` needs reconciling either way: its personalization roster already omits several shipped keys, and its Settings Window section states the rows are "boolean switches plus the hover-preview linger's slider", which a picker row falsifies.
- **F-11:** [confirmed] `Components/Detail/NumberEditor.tsx` is the precedent for both halves of the settings work at once — `PickerControl` rows and rows disclosed by another row's value via `Reveal`. `Settings/TrashLeaf.tsx:186` is the precedent for an **enum** knob storing no key at its default.
- **F-2:** [confirmed] "Default Format" ships on the existing `PickerControl`, which pops the beaked `PickerMenu`. It inherits the beak-less surface when the `PopupMenu` cycle lands; that is a swap at one call site, not a rebuild.
- **F-3:** [assumed] The Settings leaf schema grows a picker row kind. `NexusSettings.tsx` currently models toggles plus one bespoke `LingerRow`, and its own comment names this as the moment the schema generalizes.
- **F-4:** [assumed] *Default Format* is disclosed only while *Automatically Format Pasted Links* is on — a dependent row, which the settings surface has no precedent for yet.

### Core (must-have)
- One shared `LinkDisplay` vocabulary — `link-full` / `link-short` / `link-title`, labelled Full Link · Short Link · Page Title — with a single formatter turning a URL and a mode into a label. URL properties adopt it; their Switch becomes a three-option `PickerControl`.
- Two personalization keys: *Automatically Format Pasted Links* and *Paste Link Into Text*, both clean-file (a default-valued knob stores no key), plus *Default Format*.
- A paste path over `[label](target)` honouring the C-2 inverse rule.
- `markdownLinkRegex` widened to CommonMark's balanced-parens destination, so a parenthesized address survives wherever it is authored.
- Page Title's deferred rewrite: Short Link now, the fetched title when it lands, anchored to the inserted range and undo-transparent.
- `Format >` on a markdown link's native right-click menu — three items, rewriting the label only.
- `clipboard:read` and the prose `Paste As >` menu.
- ⌘⇧V registered in the `commands` map as data, not baked into the editor keymap.

#### Prospects (allowed later, not now)
- **Bare-URL autolinking** — a GFM-style token so an unwrapped address is clickable, styled, and Format-able. Needs a tokenizer rule, a decoration, a click path, and a call on CommonMark vs GFM semantics. Don't-foreclose: the formatter and the Format menu both read from the token, so an autolink token slots in as a second producer without touching either.
- **Fetched titles beyond `<title>`** — favicon, OpenGraph, description. The fetcher is already main-side and cached; nothing here forecloses widening what it returns.
- **A general prose context menu** — Paste As is deliberately alone in it. If cut/copy/paste/format items are ever wanted, that is its own decision about what the editor's right-click means.

#### Out of Scope (won't do)
- **The `PopupMenu` split** — separate cycle (A-1). Named here only so its one call site is known.
- **A per-link stored display mode** — D-1 settles that Format is a text rewrite. No sidecar, no state, nothing to sync.

#### Considered & Rejected
- **Await the fetch before writing** — a clean single write, rejected because a slow host makes ⌘V appear to do nothing.
- **Never rewrite; Page Title only via right-click once cached** — the most predictable option, rejected because it makes the setting's own default mode do nothing on first paste.
- **A timer gating the late rewrite** — rejected for a text-identity gate, which self-cancels on any edit and needs no threshold anyone has to justify.
- **Keeping `link-url` on disk to avoid a reset** — unnecessary; the value being renamed is the default one, so the fallback lands where it already was.
- **Percent-encoding parentheses as the paste path writes the target** — rejected as symptom handling. It leaves every hand-authored and externally-written link still broken, puts `%28` on disk where a person would read a `(`, and makes the encoder a second authority on the grammar. Widening the grammar fixes the cause once, for every author.

#### Lessons
- A feature described as "a future second phase" may already be shipped elsewhere in the app — `linkTitles` was fully built for URL property cells. Grep the vocabulary before sizing anything as new.
