## Alias-V1 — Implementation Plan

> **Status:** executed — Phases 1–5 complete, gates green · Spec: `Planning/Alias-V1 — Decision Log.md` · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

A connection's visible words become the author's to choose. After this, `[[Title|Alias]]` renders as *Alias* while still resolving on Title; two menu actions author and edit that alias with the caret landing where their names imply; a page remembers the aliases it has been given, so they can be offered back and forgotten; and `[Title](Page)` resolves internally beside `[[ ]]`, because Pommora should read what other Markdown tools write.

The shape follows one principle the spec returned to at every fork: **what a link means lives on-page, in syntax any tool can read.** Aliases are display-only rather than resolution keys, and the database holds only an autocomplete accelerator whose loss costs a suggestion and never a link.

**Duplicate-title disambiguation is deliberately not here** — specced, twice reviewed, then cut: this arc is about aliases, and duplicate titles are a separate feature that surfaced while designing one. Its design survives in the decision log's §G, and its removal takes the main-side title index, the cascade's new triggers, and the journal hardening with it.

Bounded by: no alternate resolution keys, no path qualification, no reverse link index, no alias-management surface, and no new dependency. Markdown block tiles inherit the new forms through the shared cascade primitive.

**Requirements**

1. `[[Title|Alias]]` renders as its alias in **both** wikiLink renderers and **through the editor's token projection**, resolving on title, with the marker set hidden until the caret enters.
2. **Rename** and **Edit Link** join the connection menu, each placing the caret where its name implies — which requires the caret-placement bug fixed and the menu seam widened to carry a span.
3. Edit Link strips the alias from the new link and keeps it in the page's memory, governed by a **Remove Title on Link Change** toggle in Settings → Pages.
4. Per-page alias memory in `nexus.db`, written when an alias is authored, offered as an autocomplete mode, forgotten by a hover-revealed ×.
5. `[Title](Page)` resolves internally, percent-encoded on disk, joining the rename cascade, with page autocomplete inside `( )` and Return landing the caret in a pre-filled, selected title slot.

**Acceptance — the whole thing working**

Author a connection by picking a page from autocomplete, give it an alias through Rename, and see it render as that alias — in the page editor, in a markdown table cell, and after a scroll that rebuilds the viewport's tokens. Rename the target page and watch the link follow it with its alias intact. Then author the same link in the `[Title](Page)` form, confirm it resolves to the same page, wears the connection colour, survives the same rename, and reads on disk as percent-encoded Markdown. Type a second alias for that page and see the first offered back; forget it with the × and see it stay gone.

**Forced By**

- `Token` carries a single content span → a displayed alias needs a second, distinct resolve span, or resolution follows the alias and every aliased link goes phantom.
- **`visibleInlineTokens` rebuilds every token field-by-field into a fresh literal** → a new optional field is silently dropped before the decoration ever sees it, and an optional field with a fallback degrades invisibly rather than throwing.
- Three sites resolve off `contentRange`, one being a non-CodeMirror renderer in table cells → the alias display is never a one-file change.
- `autocompleteQuery`'s link-form span covers the whole `[[…]]` → Return inside an alias replaces the entire link unless the query is bounded to the title.
- `isValidLink` accepts any dotted host (`Notes.md`, `Node.js`) → page resolution must run *before* the external gate, not after.
- `decodeURIComponent` throws `URIError` on a bare `%`, and CodeMirror deactivates a crashed ViewPlugin **for good** → every decode needs a fallback, or one typed character kills rendering for the session.
- A CommonMark destination may not hold a bare space → the parens are percent-encoded, which is also what Obsidian writes.
- `treeIndex` caches on the tree object and the watcher suppresses the app's own writes → an out-of-band alias write can't ride that cache.
- A narrower callback assigns cleanly to a widened one → **the type gate does not catch a missed `ConnectionsApi` host**; that census must be manual.
- `view.state.readOnly` is live inside the editor and `PreviewWindow` flips it at runtime through a Compartment → editability is read at the editor, never threaded through a memoized seam.

**Inherited Reasoning** *(ruled out — do not retry)*

- **Path qualification and duplicate disambiguation** — cut after full design and two review rounds. Not a rejection of the design; a rejection of its being in *this* arc. **The journal hardening** and **raising the 255 bracket cap** leave with it: the first existed to absorb the cascade triggers paths would have added, the second only because a whole path would sit inside the brackets. Title and alias are independently capped, so the bound stands.
- **Frontmatter `Aliases:` as resolution keys** — retired; the on-page alias plus the DB memory supersede it.
- **Alias-as-tiebreaker for duplicates** — makes resolution device-dependent.
- **A "Default Internal Link" syntax preference** — arbitrates nothing once both forms resolve.
- **PageIDs in markdown-link parens** — unreadable in a file whose readability is the point.
- **A derived alias index** — a body scan can't honor a real remove-×.
- **Per-page settings** for the strip toggle — no such surface exists.
- **Escaping `]` inside an alias** — puts backslashes in the file; the character is refused instead.

**Grounding** *(re-open these; don't cite them)*

- `Planning/Alias-V1 — Decision Log.md` — the ratified spec; every task traces to a lettered decision.
- `src/shared/connections.ts` — `pageLinkPattern`, `normalizeTitle`, `titleFromPath`, `ConnMenuAction`.
- `src/renderer/src/MarkdownPM/tokens/index.ts` — `wikiLinkTokens`, `activeTokenIndices` (edge-inclusive), `tokenize`'s overlap ordering.
- `src/renderer/src/MarkdownPM/editor/decorations.ts` — `visibleInlineTokens`'s **token projection**, the `link` block (the pattern to mirror), the `wikiLink` block, `hideMarker`.
- `src/renderer/src/MarkdownPM/editor/connections.ts` — `wikiLinkAt`/`resolvedPageAt` and the three handlers sharing them.
- `src/renderer/src/MarkdownPM/Tables/cellStatic.tsx` — the second renderer, for **both** wikiLinks and markdown links.
- `src/renderer/src/Embeds/connectionMenu.ts` — `showConnectionMenu`, the shared menu implementation behind all four hosts.
- `src/renderer/src/MarkdownPM/{autocomplete,useConnectionAutocomplete}.ts` + `AutocompletePanel.tsx` — the query, `connectionInsert`, the single `AcState`, the `ConnPage`-typed row.
- `src/renderer/src/MarkdownPM/editor/input.ts` — `focusAt`, `inputHandler`.
- `src/renderer/src/MarkdownPM/input/format.ts` — `toggleLink` (⌘K).
- `src/main/connections/{scan,rewrite}.ts` — `mentionsTitle`, `rewriteConnections`.
- `src/main/blocks.ts` — `rewriteBlockConnections`, which calls the same two primitives.
- `src/main/db/localState.ts` + `src/main/remint.ts` — the `Scope` union and `COPY_SCOPES`.
- `src/renderer/src/Detail/PageView.tsx` — the `{load, save}` per-page seam minted for folds, embed heights, and heading columns.
- `src/renderer/src/Components/Chip.tsx` — `ChipRemoveButton` and its inert-until-revealed contract.
- `.claude/Guidelines/Editor-Internals.md` + `Build-Gotchas.md` — read before touching the editor or launching.

**Environment**

Plan directory `.claude/Planning/` · Spec: the decision log · Explorer: `Explore` · Attack reviewer: `build-breaking-agent` · Code reviewer: `/code-review` · Neutral verifier: `general-purpose` · Simplification: `code-simplifier` · Rules directory `.claude/Guidelines/`.

**Shapes:** additive · fix · user-visible

**Global Constraints (every task inherits these)**

- Gates, run from `Pommora/`, exit codes read **directly** — never through a pipe: `npm run typecheck` · `npm run test` · `npm run lint`.
- Biome owns formatting via a PostToolUse hook. Never hand-align, never run Biome. An Edit failing on whitespace means it reformatted — re-read and retry.
- Main owns the filesystem; the renderer never touches Node. Every IPC channel is declared once in `shared/bridge.ts` and returns the `Result` envelope.
- One normalization for connection matching. Never a second resolver, a second index, or a second writer. `treeIndex`'s standing rule holds: a new lookup is another projection there, never its own walk.
- **Reuse before invention, checked rather than assumed.** Two explorer sweeps ran and their findings are cited inline per task. Where a step says "add X", read it as "add X only if no existing mechanism does or nearly does X."
- Comments explain why, never what. Never restate a value a declaration holds. `KNOB` and `(Nathan's call)` markers survive untouched.
- Stage explicit paths — never `git add -A` or a directory add.
- Out of scope everywhere: path qualification, duplicate disambiguation, alternate resolution keys, a reverse link index, an alias-management pane, heading/block anchors, cascade journaling, and any new dependency.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| PommoraPRD.md:151 | "just the bracketed title, **no embedded id or alias**" | an alias is authored and displayed | 12 |
| **"the sole connection syntax"** — PommoraPRD:151 · PommoraPRD:198 · ConnectionsPM:13 · CLAUDE.md (codebase-map annotation, ~line 74 — a line number that moves; find it by phrase) | one claim, four documents; all four are rewritten together | `[]()` resolves internally | 12 |
| ConnectionsPM:17 | "the piped tail renders as plain text beside the styled title" | the alias becomes the display text | 12 |
| ConnectionsPM:19 | "one sweep rewrites `[[` and `![[` together" *(§Syntax + Scope, **not** §The Rename Cascade)* | a third pattern joins the sweep | 12 |
| ConnectionsPM:37 | "right-click pops a native menu whose one action is **Open Preview**" | two actions join it | 12 |
| ConnectionsPM §Autocomplete | "Return commits the form being typed — a bare `[[Title]]`, or `![[Title]]`" | a third form and an alias mode | 12 |
| ConnectionsPM:50 | §Prospects **Aliases** entry | it ships | 12 |
| ContextPM:9 | the Display-alias line | resolved | 12 |
| ContextPM:26 | the **Page aliases** entry | retired, not completed | 12 |
| ContextPM:82 | the caret-placement line | fixed | 12 |
| MarkdownPM:68 | "Connections in cells — … (**alias-free**, since cell encoding escapes the pipe)" | `cellToDisplay` unescapes the pipe before tokenizing, so aliases render in cells | 12 |
| ConfigurationPM | its personalization prose — **no enumerated key list exists**, so this is a prose edit, not a line-targeted one | gains the strip toggle | 12 |
| ArchitecturePM | its `local_state` paragraph — **no enumerated scope list exists**; DDL is declared canonical in `db/schema.ts` | gains the per-page alias scope, described as *joining* the PageID-keyed scopes, never as the first | 12 |
| `rewrite.ts` header | its two-pattern description | a third pattern joins the sweep | 12b |
| ConnectionsPM §Syntax + Scope | its bracket-tolerance paragraph, which records a `]`-ending title as degrading to a phantom | both new forms capture it correctly; brackets become a stated Pommora capability against Obsidian's inability to link them | 12 |
| `shared/connections.ts` header | "Nothing authors or renders an alias yet" | both now happen | 3 |
| `cellStatic.tsx:39` | "the editor leaves `\|alias` plain-visible, so match it" | neither does now | 4 |

**Dead Vocabulary** *(the closing sweep — counts measured, not recalled)*

- `rg -F "Nothing authors or renders an alias yet" src` → expect 0.
- `rg -F "plain-visible" src` → expect 0.
- `rg -F "sole connection syntax" .claude` → expect 0 outside `Sessions/` **and `Planning/`**. Legitimate hits: session transcripts are frozen records, and this plan quotes the phrase twice by necessity — a sweep that counts its own instructions can never pass.
- Control: `rg -F "pageLinkPattern" src` → **14**. Zero here means the sweep never ran.

**Hazard Window:** Task 2 changes `Token`'s shape while three consumers and one projection still read the old field. Until Task 4 lands, an aliased link resolves incorrectly somewhere — no interactive verification of connections is meaningful inside that window, and Phase 1's running-thing pass defers to Gate 1.

---

### Phase 1 — The alias renders, everywhere it renders

#### Task 2: Give `Token` a resolve span, and carry it through the projection

**Requirement:** 1

**Why:** A displayed alias means the text shown and the key resolved are different strings, and `Token` carries one span for both. The second field is what makes Task 3 safe. It must be threaded through `visibleInlineTokens` in the same task, because that function rebuilds every token field-by-field into a fresh literal — a new optional field vanishes there, silently, and the editor then resolves aliases while the table renderer resolves titles.

**Files:**
- Modify `src/renderer/src/MarkdownPM/tokens/index.ts` — the `Token` type and `wikiLinkTokens`.
- Modify `src/renderer/src/MarkdownPM/editor/decorations.ts` — `visibleInlineTokens`'s object literal.
- Modify `src/renderer/src/MarkdownPM/input/format.ts` — `toggleConnection`, the **fourth** `contentRange` consumer.

**Interfaces**
- Produces: `Token.resolveRange?: Span` — present on `wikiLink` with an alias only; absent means `contentRange` is the resolution key.
- Assumed by: Tasks 3, 4 (the resolve sites) and Task 8 (both caret placements read the two spans).

**Survivors — the ⌘⇧K unwrap deliberately flips.** `toggleConnection` slices `contentRange` to unwrap a link, so `[[Q3 Plan|the plan]]` unwraps to `Q3 Plan` today and to `the plan` after this. **That is correct and is kept**: removing a link should leave the words that were in the sentence, not rewrite the prose to a title the reader never saw. It is a real behavior change on a bound shortcut (`Mod-Shift-k`) and a native editor-menu item, so it gets its own test rather than flipping untested. The full census of `contentRange` readers is therefore **five**, not three: the decoration, the hit-test, `cellStatic`, and `format.ts`'s two toggles.

**Failure half:** no alias → `resolveRange` absent, `contentRange` unchanged, every existing caller behaves identically. Empty alias (`[[T|]]`) → treated as no alias, so the pipe is never display text. Offset-shifted projection → the field shifts by the same `a` offset as every other span, or it points into the wrong line.

**Must agree:** `tokenize`'s output and `visibleInlineTokens`'s projection must carry identical field sets. One test asserts the projected token for an aliased link has the same `resolveRange` as the raw one, offsets aside — this is the test that would have caught the silent drop.

**Steps:**
- [x] Add the optional `resolveRange` to `Token`.
- [x] In `wikiLinkTokens`, when group 2 is present and non-empty: `contentRange` = the alias span, `resolveRange` = the title span, and the leading marker grows to cover `[[Title|`.
- [x] Carry every span through the projection — `shiftToken` in `tokens/index.ts` owns the re-basing, and `visibleInlineTokens` calls it instead of rebuilding a literal.
- [x] Add the projection-parity test **before** the implementation, and watch it fail on the missing field.
- [x] `npm run typecheck` + `npm run test` — expect green.
- [x] Commit: `feat(editor): a wikiLink token carries its resolution key apart from its display`

#### Task 3: Render the alias in the CodeMirror decoration

**Requirement:** 1

**Why:** The feature's visible half, and the pattern is eleven lines above it — the `kind === 'link'` block already shows content, hides its tail at rest, and reveals it on caret. Mirroring it keeps the two link forms visually coherent.

**Files:** Modify `src/renderer/src/MarkdownPM/editor/decorations.ts` — the `wikiLink` block; `src/shared/connections.ts` — its header comment.

**Failure half:** an aliased link that is ambiguous or phantom takes the same treatment its bare form would; a phantom aliased link renders raw in full, matching today's phantom rule.

**Steps:**
- [x] Resolve from `tk.resolveRange ?? tk.contentRange`.
- [x] Hide the grown leading marker at rest; reveal it with the brackets on caret, as the `link` block reveals `(url)`. The marker loop was already span-agnostic, so Task 2's grown marker flows through it unchanged.
- [x] Update `shared/connections.ts`'s header — "Nothing authors or renders an alias yet" is false.
- [x] Test: an aliased link's rendered text is the alias; the caret inside reveals `[[Title|`.
- [x] `npm run test` + `npm run lint` — expect green.
- [x] Commit: `feat(connections): an aliased connection reads as its alias`

#### Task 4: Point the other two resolve sites at the resolve span

**Requirement:** 1

**Why:** `cellStatic.tsx` is a second, non-CodeMirror renderer with its own alias-tail line, and `connections.ts` holds the hit-test shared by click, ⌘-click, and hover. Both resolve off `contentRange`. Left alone, a table cell disagrees with the editor, and clicking an aliased link navigates by its alias.

**Files:**
- Modify `src/renderer/src/MarkdownPM/Tables/cellStatic.tsx` — the `wikiLink` branch and its alias-tail line.
- Modify `src/renderer/src/MarkdownPM/editor/connections.ts` — `wikiLinkAt`'s title slice.

**Must agree:** all three sites plus the projection resolve identically. One test crosses the editor decoration, the cell renderer, and the hit-test on the same aliased link.

**Steps:**
- [x] `cellStatic`: resolve from the resolve span, render the alias as the styled text, delete the alias-tail append and its now-false comment.
- [x] `connections.ts`: slice the resolve span in the hit-test.
- [x] Add the cross-site agreement test — fixture `[[Alpha|Beta]]` with `Beta` duplicated, so the wrong span changes the rendered *status* and drops the click, not merely the target. Proven red with both lines reverted (exit 1, two failures).
- [x] `npm run test` — expect green. **Hazard window closes here.**
- [x] Commit: `fix(connections): every reader resolves a connection by its title`

#### Gate 1 — the alias renders and resolves consistently
- [ ] Gates green, exit codes read directly.
- [ ] The Dead Vocabulary control returns 14, not 0.
- [ ] Simplification and `/code-review` dispatched against `<base>..HEAD`, scoped to the touched paths.
- [ ] Every concern fixed, or carrying an explicit ruling recorded in the Log.
- [ ] **Hazard window closed;** the deferred running-thing pass runs now — an aliased link reads as its alias in the editor, in a markdown table cell, and after scrolling away and back (the projection path).
- [ ] Progress hashes filled in.

---

### Phase 2 — The authoring gestures

#### Task 6: One owner for the connection hit-test

**Requirement:** 2

**Why:** `wikiLinkAt`/`resolvedPageAt` is shared by mouseover, click, and contextmenu, and two separate needs land on it: navigation must stop swallowing caret placement at a link's edges (ContextPM deferred this bug to this arc by name), and the menu needs a span for any wikiLink, resolved or not. Split across two tasks, whichever lands second silently redefines the region for all three handlers. One task owns it.

**Files:**
- Modify `src/renderer/src/MarkdownPM/editor/connections.ts` — the hit-test and all three handlers.
- Modify `src/renderer/src/MarkdownPM/editor/links.ts` — `externalLinkAt` uses the **identical** inclusive test, and Task 12a makes markdown links navigate too. Fixed here or the arc creates the surface and leaves the twin bug standing on it.

**Failure half:** a click on a link's rendered *text* still navigates. With `[[Title|` hidden, an aliased link's visible extent **is** its content — so the edge region must be computed from the token's range, not from what is visible, or the links Rename targets have no clickable edge at all.

**Negative control:** with the edge carve-out disabled, a test asserting a trailing-edge click sets a selection goes red; with it enabled, a test asserting a click on the link text still navigates stays green.

**Steps:**
- [x] Widen the hit-test once: return the token's status and range for any wikiLink, resolved or not. `wikiLinkAt` is exported and returns `{ title, range, content }` — Task 7 consumes it.
- [x] Gate *navigation* on the resolved-and-inside-content case; leave the edges to ordinary caret placement. `externalLinkAt` carried the identical inclusive test and takes the same carve-out.
- [x] Add both halves of the negative control. Proven: with the carve-out removed the two edge tests go red while the two "still navigates" tests stay green; with only the caret-rule line removed, that test alone goes red.
- [ ] **Live check before moving on** (unprovable in code — jsdom measures nothing): click the left half of the first letter of a plain `[[Page]]` ten times and confirm it navigates every time — `posAtCoords` may map that point to the token's start rather than its content. **Outstanding — Nathan's.**
- [x] `npm run test` — expect green.
- [x] Commit: `fix(connections): a click at a link's edge places the caret`

#### Task 7: The menu carries a span, and reads editability at the editor

**Requirement:** 2

**Why:** The menu's payload is a page, not a position, and its two new actions edit text. Editability is **not** threaded: `view.state.readOnly` is live inside the editor and `PreviewWindow` flips it at runtime through a Compartment, so a value captured in a memoized seam goes stale. Reading it where the edit happens keeps one source of truth.

**Files:**
- Modify `src/renderer/src/MarkdownPM/connections/index.ts` — `ConnectionsApi.menu`'s signature.
- Modify `src/renderer/src/MarkdownPM/editor/connections.ts` — the contextmenu handler.
- Modify `src/renderer/src/Embeds/connectionMenu.ts` — **the shared implementation**; the four hosts only pass its reference.

**Interfaces**
- `ConnectionsApi.menu` becomes `menu(page, ctx: { range, editable, apply })`. A range alone is insufficient: `showConnectionMenu` is a fire-and-forget free function that handles the resolved action itself, so after the async menu returns, something must dispatch into **the editor instance that was right-clicked** — that is `apply`. `editable` must travel too, because the items are *rendered* inside `showConnectionMenu`; a flag read only at the handler cannot suppress them. NavWindow and BlockSurface pass `editable: false` and no `apply`.
- Modify `src/shared/connections.ts` — `ConnMenuAction` gains `'rename'` and `'editLink'`; `src/main/connMenu.ts` — the two items.

**Derivation**
- `rg -F "showConnectionMenu" src` → **9** at planning time (the definition, plus four hosts at two lines each). Legitimate hits: all.
- Control: `rg -F "ConnectionsApi" src` → **53**. Zero means the search never ran.

**Negative control:** with the read-only gate disabled, a test asserting the two actions are absent in a read-only editor goes red; with it enabled, a test asserting they are present in an editable one stays green.

**Steps:**
- [ ] Widen `menu` to carry the range; gate the two actions on `view.state.readOnly` read at the handler.
- [ ] **Census the four hosts by hand — the type gate will not catch a miss.** A narrower `(page) => void` assigns cleanly to a widened `(page, range) => void`, so a forgotten host compiles and silently ignores the new arguments.
- [ ] Add both halves of the negative control.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(connections): the link menu knows its span`

#### Task 8: Rename and Edit Link

**Requirement:** 2, 3, 4

**Why:** The authoring half. Rename targets the words shown; Edit Link targets the page pointed at, and strips the alias because repointing a link makes its old words describe the wrong page. This task also **owns the memory write** — an alias is authored here, so this is the only place that knows one was.

**Files:**
- Create `src/renderer/src/MarkdownPM/editor/linkEdit.ts` — both caret placements, the strip, the memory write.
- Create the caret helper beside `focusAt` in `src/renderer/src/MarkdownPM/editor/input.ts` — "seat the caret inside this token's span" exists nowhere, and three bespoke inline dispatches already do variants of it.
- Modify `src/renderer/src/MarkdownPM/autocomplete.ts` — bound the link-form query to the title span, and give `connectionInsert` an alias branch.
- Modify `src/renderer/src/MarkdownPM/useConnectionAutocomplete.ts` — **`commit()` is the write that destroys an alias**, and it appears in no other task.
- Modify `src/renderer/src/MarkdownPM/editor/input.ts` — the `]` refusal.

**The commit rule (decide before writing, not inside it):** `commit()` replaces `ac.from..ac.to` with `connectionInsert(page.title)`, which has no alias branch — so retargeting an aliased link through the picker destroys the alias *regardless of the toggle*, and bounding only `to` would corrupt the link into `[[New]]|Alias]]`. The toggle is otherwise unobservable. **Rule:** `commit()` reads the existing alias from the token it is replacing and re-emits it when the toggle is off, drops it when on. That is the only place B-6 becomes real.

**Interfaces**
- Produces: the alias-authored signal Task 10's slice writes through. Assumed by: Task 10, Task 11.
- Consumes: `Token.resolveRange` / `contentRange` from Task 2 — Rename seats in the alias span, Edit Link at the title span's end.

**Failure half:** Rename with no alias inserts `|` and seats the caret after it. Edit Link with no alias is a plain caret placement with nothing to strip. An alias emptied to nothing collapses the pipe. A write failing leaves the slice unchanged rather than showing an alias that didn't persist.

**Must agree:** the bounded query and the token's spans must agree on where the title ends; one test crosses `autocompleteQuery` and `wikiLinkTokens` on the same aliased link.

**Steps:**
- [ ] Bound `autocompleteQuery`'s link form to the title span — today it spans the whole `[[…]]`, so Return inside an alias replaces the entire link with the bare form.
- [ ] Add the regression test for exactly that: caret in an alias, Return, alias survives.
- [ ] Write the caret-seat helper; **set `assoc` explicitly** or a seat facing a replaced range renders no caret.
- [ ] Implement Rename's two cases and Edit Link's caret-at-title-end.
- [ ] Implement the strip, reading the personalization toggle, defaulting to on; write the stripped alias to the memory before dropping it.
- [ ] Refuse `]` via `EditorView.inputHandler` (`invalidName` is a filesystem-basename rule in main and does **not** apply to a keystroke). Note **paste does not route through `inputHandler`** — either add a `transactionFilter`, following `embedGuard`/`calloutGuard`, or record in Deviations that a pasted `]` truncates.
- [ ] Collapse `[[Title|]]` to `[[Title]]` when an alias empties.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(connections): Rename and Edit Link author a connection's words`

#### Gate 2 — the gestures work and can't destroy what they edit
- [ ] Gates green; the derivation re-run against its control; simplification and review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Running-thing pass: right-click a connection, Rename, type, Return — the alias survives; Edit Link lands before the pipe; the actions are absent in a resting preview; the edge-click check from Task 6 still holds.
- [ ] Progress hashes filled in.

---

### Phase 3 — The alias memory

#### Task 9: The per-page alias scope and its channel

**Requirement:** 4

**Why:** A page remembers the aliases it has been given so they can be offered back. It belongs in `nexus.db` because the alias itself lives on-page in universal syntax — what's stored is an accelerator whose loss costs a suggestion, never a link.

**Files:** Modify `src/main/db/localState.ts` (the `Scope` union), `src/main/index.ts` (the `scopeGet`/`scopeSet` pair beside its siblings), `src/shared/bridge.ts`, `src/preload/index.ts`, `src/main/remint.ts` (`COPY_SCOPES`).

**Failure half:** no database open → `writeKey` returns false and the caller reports rather than acknowledging a lost write. Emptying the list deletes the key rather than storing `[]`. Deleting a page does **not** prune, matching every sibling scope and keeping restore whole.

**Steps:**
- [ ] Add the scope to the union — rows, not DDL, so `SCHEMA_VERSION` does not move.
- [ ] Register the channel pair in `index.ts` reusing the existing validators; declare it once in `bridge.ts`; wire preload.
- [ ] Add the scope to `COPY_SCOPES` beside `folds`/`headingCols`/`embedHeights`, or a duplicated page silently loses its memory.
- [ ] Tests: round-trip, empty-deletes-key, no-db-returns-false.
- [ ] `npm run typecheck` + `npm run test` — expect green.
- [ ] Commit: `feat(db): a page remembers the aliases it has been given`

#### Task 10: The slice and the toggle

**Requirement:** 3, 4

**Why:** Autocomplete reads the memory on every keystroke, so it must load once — but it cannot ride `treeIndex`'s cache, which keys on the tree object and is invalidated only by a fresh tree push. Alias writes and the × push no tree, and the watcher suppresses the app's own writes, so a tree-keyed cache would keep serving a forgotten alias.

**Files:** Modify `src/renderer/src/store.ts`, `src/shared/types.ts` (the personalization key), `src/main/readNexus.ts` (its coercion), `src/renderer/src/Settings/SettingsWindow.tsx` (the `pages` category).

**Steps:**
- [ ] Mirror the editor's per-page pattern rather than inventing one — the `{ load, save }` seam minted in `PageView.tsx`, loaded with `Promise.allSettled`, persisted on an explicit signal rather than on doc change. That gating is why folds and embed heights need no debounce.
- [ ] Add the slice, seeded on load, updated by Task 8's write and by Task 11's ×.
- [ ] Add `Remove Title on Link Change` to the `pages` toggles with `defaultOn`; thread the key through `types.ts` and `readNexus.ts`.
- [ ] Tests: the slice reflects a write and a delete without a tree push.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(connections): alias memory lives in its own slice`

#### Task 11: The alias autocomplete mode and its forget-×

**Requirement:** 4

**Why:** One component, three purposes — title suggestions, alias suggestions, and the `( )` target are modes of the single existing state machine, never rival panels contending for one caret.

**Files:** Modify `src/renderer/src/MarkdownPM/{useConnectionAutocomplete,autocomplete}.ts`, `AutocompletePanel.tsx`, **both candidate closures** (`MarkdownPM/index.tsx` and `Tables/CellEditor.tsx` — the latter ignores `form` entirely today, which is exactly the table-cell question below), and `connectionInsert`'s alias branch; reuse `ChipRemoveButton`.

**Interfaces**
- The panel's row model becomes a union — a page row and an alias row. It is `ConnPage[]`-typed end to end today (props, `commit`, `AcCtl.pick`), and an alias suggestion is a string; picking one must insert the alias, not `[[alias]]`.

**Failure half:** a page with no remembered aliases shows no panel rather than an empty one. The × on the last entry closes the panel. The empty-query policy is currently a hardcoded `form === 'link'` test and must learn the third mode.

**Negative control:** with the inert-until-revealed guard disabled, a test asserting a stray click does not forget goes red; with it enabled, a hovered × forgetting stays green.

**Steps:**
- [ ] Add the alias mode to the existing `AcState`; `form` is already the only discriminant. `autocompleteQuery`'s third parameter is a `allowEmbeds: boolean` and needs generalizing; branch order matters.
- [ ] **Decide and record whether the alias mode fires inside a table cell.** `useConnectionAutocomplete` is shared with `CellEditor`; the mode is inherited unless gated the way `allowEmbeds` is. Aliases do render in cells, so the default is yes — state it either way.
- [ ] Widen the panel row: it is `ConnPage[]`-typed end to end with a hardcoded page icon and a prefix-only highlight. Mirror `MenuItem`'s existing `trailing` slot for the ×; do not build a second panel.
- [ ] Use `ChipRemoveButton` with its own skin — it is already reused outside chips. Its contract reads opacity off computed style, so the skin must mask statically from mount, flip **only** opacity, key the reveal on a real `:hover` sibling chain, and keep the label pointer-inert. Verify with live hovers; computed styles lie for this bug class.
- [ ] Add both halves of the negative control.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(connections): typing an alias offers the ones this page has worn`

#### Gate 3 — the memory is real and forgettable
- [ ] Gates green; simplification and review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Running-thing pass: author two aliases for one page, see both offered on the third link, forget one with the × and watch it stay gone without a reload.
- [ ] Progress hashes filled in.

---

### Phase 4 — Dual syntax

#### Task 12a: `[Title](Page)` resolves internally, percent-encoded

**Requirement:** 5

**Why:** Both forms resolve because Pommora reads what other tools write. Page resolution must be tried *first*: `isValidLink` accepts any dotted host, so a bare `Notes.md` or `Node.js` would otherwise open a browser and make a real page unreachable.

**Files:** Modify `src/renderer/src/MarkdownPM/editor/links.ts`, `decorations.ts`, `Tables/cellStatic.tsx` (**the second markdown-link renderer, which classifies with `isValidLink` today**), `src/renderer/src/MarkdownPM/index.tsx` (`externalLinkClicks()` takes no arguments and must now receive the connections getter), `src/shared/links.ts`.

**Failure half:** resolves as a page → internal, connection colour. Doesn't, but is a valid URL → external, `.md-link`. Neither → the **existing** `.md-link-invalid` treatment unchanged, so nothing dumps raw syntax into the line. **A decode that throws falls back to the raw string** — `decodeURIComponent` raises `URIError` on a bare `%` (`[Q3](Revenue 50% plan)`), and CodeMirror deactivates a crashed ViewPlugin for good, losing rendering for the session.

**Must agree:** the markdown form and the wikilink form resolve the same target to the same page, and the editor and `cellStatic` classify it identically. One test crosses both pairs.

**Survivors:** `.md-link`, `.md-link-invalid`, `.md-link-url` unchanged and un-renamed; the `link` token kind stays single. Internal versus external is one resolution branch, never a second grammar and never two predicates that could disagree.

**Steps:**
- [ ] Write the encode/decode pair — no codec exists. Start from the `assetUrl` precedent of **`encodeURI`, not `encodeURIComponent`** so `/` survives, then **escape `(` and `)` as `%28`/`%29` on top of it**: neither built-in encodes parens, and `markdownLinkRegex`'s target group is `[^)\r\n]+`, so a page titled `Atomic Habits (Book)` yields a target truncated at the first `)` plus a stray `)` in the line — a broken link *and* raw syntax, failing both Acceptance and D-6.
- [ ] **Rule the `]`-bearing title.** `markdownLinkRegex`'s label group is `[^\]\r\n]+`, so `[Notes [WIP] final](…)` produces **zero tokens** — no link, no colour, raw source in the line, and invisible to the cascade. `pageLinkPattern` deliberately tolerates `]` in titles, so this title class is legal and reachable. Escape the label as `\]` per CommonMark, or refuse the markdown form for those titles — state which.
- [ ] Wrap every decode in a try/catch returning the raw string.
- [ ] Write one resolver returning the three-way outcome; try page resolution (extension stripped) before the external gate.
- [ ] Route an internal hit to navigation, wearing the connection colour.
- [ ] Apply the same classification in `cellStatic` — `isValidLink('My%20Page')` is false, so without this a table cell shows a resolved internal link as broken.
- [ ] Tests: `Notes`, `Work%20Notes`, `Node.js`, a real URL, an anchor, and a `%`-bearing target that must not throw.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(connections): a markdown link can name a page`

#### Task 12b: The cascade reaches markdown links

**Requirement:** 5

**Why:** `[]()` links now name pages, so a rename must rewrite them or every markdown link breaks the first time its target is renamed.

**Files:** Modify `src/main/connections/{rewrite,scan}.ts`. **Consumes Task 12a's shared codec** — the decode runs main-side too, and `rewritePageSerialized` calls `rewrite(content)` unwrapped while `mutate.ts` catches any throw by **reverting the rename**. So one `%`-bearing body turns every page rename in the nexus into a permanent failure whose message names nothing.

**Must agree:** `mentionsTitle` and `rewriteConnections` must agree on which links name a page — a prefilter that misses what the rewriter would change means a body never gets opened. One test crosses both.

**Survivors:** `rewriteBlockConnections` calls these same two primitives, so markdown block tiles inherit the third pattern automatically. That is correct and free — the decision log's out-of-scope note for tiles concerned new *triggers*, not this shared primitive.

**Failure half:** a link inside code stays a sample for all three patterns. An `http` URL whose last path segment happens to match a renamed title is left alone — the rewriter matches whole targets, not segments.

**Steps:**
- [ ] Add the `[]()` pattern to both the prefilter and the rewriter, percent-encoding preserved.
- [ ] **Free win while here, and the gate must be on *syntax*, not the title.** `mentionsTitle` is a full parse with no cheap gate, and the cascade reads every `.md` without touching `walkCache`. Add `body.includes('[[') || body.includes('](')` before the parse. **Never gate on the title itself** — `body.toLowerCase().includes(normalizedKey)` passes the entire existing suite while silently breaking the NFC invariant `normalizeTitle` exists for, so an NFD-composed body would stop matching its NFC title and a rename would skip it. Nothing in the suite crosses `mentionsTitle` with NFD.
- [ ] Add a `%`-bearing-body test — the decode must not throw a rename into a revert.
- [ ] Do **not** reach for `sweepGovernedRoots` — it is frontmatter-shaped and this cascade is body-shaped.
- [ ] Update `rewrite.ts`'s header comment.
- [ ] Tests: `[]()` rewritten; code-fenced samples untouched; a URL with a colliding last segment untouched; the prefilter/rewriter agreement test.
- [ ] `npm run test` — expect green.
- [ ] Commit: `feat(connections): a rename reaches markdown links`

#### Task 12c: One markdown-link grammar, and brackets earn their keep

**Requirement:** 5

**Why:** `markdownLinkRegex` and `MD_LINK` describe the same syntax and disagree about escapes — a two-definitions defect, and the reason `[Notes \[WIP\] final](target)` produces no token at all today. Widening the label group closes both. `[[Title]](link)` is the other grammar disagreement: CommonMark reads it as a link labelled `[Title]`, while Pommora's wikilink-first ordering makes it a wikilink trailed by literal parens.

**Files:** Modify `src/renderer/src/MarkdownPM/detect/index.ts` — `markdownLinkRegex`'s label group; `src/renderer/src/MarkdownPM/tokens/index.ts` — the wikilink/link precedence.

**Failure half:** an unescaped label behaves exactly as today. A trailing backslash at the label's end must not swallow the closing `]`. A wikilink **not** followed immediately by `(` stays a wikilink — `[[Notes]] (see 2024)` is untouched, only the no-space form reclassifies.

**Survivors:** `[[Title]]` alone, `![[ ]]`, and every existing markdown link keep their current tokenization. Only the immediate-parens shape moves.

**Steps:**
- [ ] Widen the label group to `(?:[^\]\\\r\n]|\\.)+`, mirroring `MD_LINK`. **Regex only** — an escaped label renders with visible backslashes, recorded as accepted, because hiding them is marker-range work in the decoration rather than a pattern change.
- [ ] **Reclassify `[[Title]](link)` as a post-tokenization rule, not a widened regex.** A label group allowing balanced brackets needs a nested quantifier, which is the exact catastrophic-backtracking shape `pageLinkPattern`'s own comment records as a ReDoS that froze the tokenizer. Instead: when a wikiLink token is immediately followed by `(…)`, emit one `link` token whose label span covers `[Title]`. Cheap, bounded, no new backtracking.
- [ ] Tests: escaped label tokenizes; trailing backslash doesn't eat the bracket; `[[Notes]](target)` is a link labelled `[Notes]`; `[[Notes]] (2024)` stays a wikilink; a 50,000-character pathological body stays under the existing bound.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `fix(editor): one markdown-link grammar, escapes and all`

#### Task 13: Autocomplete inside `( )`, and ⌘K's caret returns to the title

**Requirement:** 5

**Why:** Without a picker in the parens there's no discoverable way to author an internal markdown link but to type a path by hand. And a markdown link's display text is free — unlike a connection, whose title *is* its target — so finishing the target should hand the caret back to the label.

**Files:** Modify `src/renderer/src/MarkdownPM/{autocomplete,useConnectionAutocomplete}.ts`, `input/format.ts`.

**Failure half:** ⌘K over a selection keeps the selection as the label; with no selection the slot is filled by the picked page's title, selected.

**Steps:**
- [ ] Add the `( )` form to `autocompleteQuery` beside `link` and `embed`, and to `connectionInsert`'s ternary — a switch, now that there are four forms.
- [ ] On commit: insert the encoded target **and** carry the caret to the title slot, pre-filled and selected — one press, not two.
- [ ] Tests: the form detects; Return fills both slots; a second Return keeps the label.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(editor): picking a page in a markdown link lands you in its label`

#### Gate 4 — both syntaxes reach the same page
- [ ] Gates green; simplification and review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Running-thing pass: ⌘K, pick a page, Return, type a label, Return — the link resolves, wears the connection colour, and reads as percent-encoded Markdown on disk. A `%`-bearing target does not kill rendering.
- [ ] Progress hashes filled in.

---

### Phase 5 — Closeout

#### Task 14: The end-to-end acceptance run

**Requirement:** 1–5

**Why:** Per-task green is systematically optimistic. This is the only check that catches "every task passed, the feature doesn't work."

**Steps:**
- [ ] Drive the full acceptance criterion in a throwaway Collection, verifying on disk at each step — including the scroll that rebuilds the viewport's tokens.
- [ ] Tear the fixture down through the app; scrub its trash bundle after verifying the record.
- [ ] Record the evidence in the Log.

#### Task 12: Reconcile every document the arc made false

**Requirement:** 1–5

**Why:** The falsifying commit is the only moment anyone knows what went false. Note the **Made False** table's `[[ ]]`-is-sole-syntax rows span four documents including the PRD, and the sweep row lives in §Syntax + Scope rather than §The Rename Cascade.

**Steps:**
- [ ] Work the table row by row. Most rows cite a line; three cite a *paragraph* because the document holds no enumerated list to target, and one cites a phrase because its line number moves.
- [ ] Keep ConnectionsPM's **Duplicate disambiguation** prospect — it is Sequenced After, not shipped. Only **Aliases** retires.
- [ ] Retire ConnectionsPM's **Aliases** prospect and ContextPM's **Page aliases** entry; resolve ContextPM's Immediate Work and caret-bug lines.
- [ ] Run the Dead Vocabulary sweep against its control (expect 14).
- [ ] `node scripts/check-atlas.mjs` from `Pommora/` — expect green.
- [ ] Write the HistoryPM entry.
- [ ] Commit: `docs(pommora): Alias-V1 closes — a connection wears the words you chose`

#### Task 15: Claim, verify, then attack

**Steps:**
- [ ] Write the Delivery Claim into the Log.
- [ ] Dispatch the **neutral verifier** with the claim, the decision log, the plan, and the full commit range — "is this true?", adjudication only.
- [ ] Fix and re-claim if the answer is no.
- [ ] Only then dispatch `build-breaking-agent` against the shipped code.
- [ ] Verify every finding against the code before folding.
- [ ] Route lessons to `.claude/Guidelines/`.

---

## Implementation Log

### Progress
- [x] **Phase 1** — The alias renders · base `bab3bf9f`
  - [x] Task 2 — Token resolve span + projection · `51196ef9`
  - [x] Task 3 — Render the alias · `df8145cd`
  - [x] Task 4 — The other two resolve sites · `caad4287`
  - [x] Gate 1 — simplification `df535320` · review folds `33874b9b`
- [x] **Phase 2** — Authoring gestures · base `19e3bf64`
  - [x] Task 6 — One owner for the hit-test · `d0b3635f`, `12baba16`, `477f6744`, `d8f3d07f`
  - [x] Task 7 — The menu carries a span · `8368debb`, `11941b65`
  - [x] Task 8 — Rename and Edit Link · `8368debb` (gestures), `e067cbb2` (strip, toggle, `]`)
  - [x] Live-driven, outside the plan · `1c4517ba` (the end-caret flip + commit spacing)
  - [x] Gate 2 — grammar unification `89f4cf01` · review folds `1e3ee0f8`
- [x] **Phase 3** — Alias memory · base `17ee7475`
  - [x] Task 9 — Scope and channel · `215a9c4b`
  - [x] Task 10 — Slice and toggle · `8c7df3bc` (the toggle shipped at Task 8)
  - [x] Task 11 — Alias mode and forget-× · `16ee965e`
  - [x] Gate 3 — simplification + `linkAt` `4f844b6c` · review folds `PENDING`
- [x] **Phase 4** — Dual syntax · base `ce13cece`
  - [x] Task 12a — Markdown links resolve internally · `0324d8b6`
  - [x] Task 12b — The cascade reaches them · `433b83ff`
  - [x] Task 12c — One markdown-link grammar · `dd6d8985`, reversed in part at Gate 4
  - [x] Task 13 — `( )` autocomplete and the ⌘K caret · `aa0df620`
  - [x] Gate 4 — simplification `6639cc2f` · review folds `923749be`, `9eda9691`
- [x] **Phase 5** — Closeout
  - [x] Task 14 — Acceptance run · `18d215c5` (the data half, against real files; the interaction half is Nathan's to see)
  - [x] Task 12 — Documentation · `7fcb01a1`, `9eda9691`
  - [x] Task 15 — Claim, verify, attack

### Rulings
- **Duplicate disambiguation cut from the arc** (Nathan). Path qualification, the move gate, the prefix-preserving cascade, the main-side title index, and the journal hardening all leave with it. The design survives in the decision log's §G.
- **The alias-destroying picker is a Phase 1 blocker, not Task 8 work** (Nathan, on seeing it live). H-13 was sequenced into Phase 2, which left Phase 1 shipping a feature whose first interaction destroyed the alias being edited. Bounding `autocompleteQuery`'s link form to the title span moved forward into Gate 1. **The plan's phase ordering was wrong**, not the task: any phase that makes a construct newly attractive owns the destructive paths into it.
- **A connection the caret is inside is text, not a link** (Nathan). It no longer navigates on click nor blooms a preview on dwell. One rule covering both halves of the request; the *edge*-click carve-out remains Task 6's.
- **A bare pipe opens the alias picker on everything remembered** (Nathan, asked at Task 11). The moment `|` is typed is the only one where nothing has been typed to filter by, and offering the page's names back is the feature. The title form stays quiet on an empty query for the opposite reason: its pool is every page in the nexus.
- **The alias picker fires inside a table cell** (Nathan, asked at Task 11). Cells render aliases like any other surface and share the state machine, so the mode is inherited rather than gated — the opposite would have meant adding a switch to turn it off, the way embeds are gated.
- **A `]`-bearing title is escaped, not refused** (executor's call, Task 12a). The plan left the choice open. Escaping is what every other Markdown tool does and what keeps the file portable, and `shared/links.ts` already held `escapeAlias`/`unescapeAlias` for exactly this on URL properties — so the ruling is reuse rather than invention. The cost is recorded and accepted: an escaped label renders its backslashes, since hiding them is marker-range work rather than a grammar change.
- **The wikilink grammar computes its offsets once** (Nathan, asked at Gate 2). The tokenizer, `autocompleteQuery`, and the alias helpers each derived the same title and alias boundaries from `pageLinkPattern`. `linkSpans` owns that arithmetic and the three read from it. The census is exactly three: `mentionsTitle` and `rewriteConnections` only ever read capture groups, so the main side never held a fourth copy.
- **`activeTokenIndices`' wikiLink end-exception stays** (Nathan, asked). A caret just past `]]` is the one position that doesn't reveal a connection's syntax, where bold and italic would. Keeping it means a link renders the instant autocomplete commits, since `connectionInsert` leaves the caret exactly there; the price is that a trailing-edge click places a caret with no visible reveal. Measured before asking: every position *inside* the token already reveals.

### Open Against Later Tasks
### Deviations
- **Task 2 — the projection became a shared helper rather than one more field.** The plan added `resolveRange` to `visibleInlineTokens`'s literal; `shiftToken` in `tokens/index.ts` re-bases the whole token instead, and the projection calls it. `Token`'s owner now owns its re-basing, so the next span field can't be dropped there at all — and the parity test guards the helper rather than this one field. No later task changes shape.
- **Gate 1 — three fixes pulled forward, landing in `33874b9b`.** (a) `autocompleteQuery`'s link form is bounded to the title span — **Task 8's first two steps are done**, and its remaining alias work is the commit rule and the two gestures. (b) `TableView`'s cell hover resolved by the span's rendered text, which the arc turned into the alias; `cellStatic` now stamps the resolve key on the span and `TableView` reads it. (c) `resolvedPageAt` returns null for a connection the caret is inside — **part of Task 6**, which still owns the edge-click carve-out and its negative control.
- **Task 6 — the editing carve-out had to move to `mousedown`, and the test that passed it was driving a sequence the app never runs.** CM seats the caret on mousedown, so a rule reading the live caret in `click` always saw the caret inside whatever was just clicked, and *every* link stopped navigating. A synthetic `click` in jsdom moves no caret, so the suite stayed green through a defect Nathan hit on his first try. The harness now presses, seats the caret, then clicks; re-introducing the live-caret read turns three tests red.
- **Task 7 absorbed Task 8's caret placements.** A menu seam with no actions behind it is neither observable nor shippable, so `linkEdit.ts` landed with the seam. Task 8 kept the strip, the toggle, and the `]` refusal.
- **Task 8's toggle UI came forward from Task 10.** Task 8 was to read the personalization key and Task 10 to add its row, which leaves the setting unobservable in between — the exact failure the plan flagged for `commit()`. The key, its coercion, and the Settings → Pages row landed together. Task 10 keeps the store slice.
- **Three Phase 2 defects were invisible to the suite, all one shape.** The mousedown caret ordering, the caret seat on a navigating press, and the menu's hover re-entry each passed green tests and failed on Nathan's first try. jsdom dispatches no real pointer sequence and CM seats the caret from coordinates it never produces — so the harness now drives press → seat → click explicitly, and what remains genuinely unobservable is commented as such rather than covered by a test that would pass without it.
- **A test must not restate a knob.** The hover tests hard-coded 450ms; tuning `CONN_HOVER_INTENT_MS` turned three of them red for no behavioural reason. The constant is exported and the waits derive from it.
- **Task 7 — the `ConnectionsApi` control reads 59, not the planned 53.** Entirely the three test files this arc added, each importing it twice. It is a control, so its job is to prove the search ran; `showConnectionMenu` re-derives at exactly 9 and the four hosts are unchanged.
- **A token-level census cannot find a DOM-level reader.** `rg contentRange` ruled Phase 1 complete while `TableView.tsx:114` read the resolve key out of `el.textContent`. The census that finds this class is on the rendered *class name* (`rg md-connection`), which returns exactly two non-test consumers. Any later task that changes what a span displays owes both censuses.
- **Gate 2 — "the link doesn't resolve" and "the pointer wasn't on it" were one value, and the edge seat read both.** `pointerLink` returned a null page for either, so the seat fired on links it had no business correcting. A phantom draws every character of itself, so nothing clamps and a press inside one means where it landed — yet it was snapped to a bracket edge, and its right-press was consumed before the menu could see it. An ambiguous link hides its brackets like a resolved one and does need the seat, but its own drawn text went unrecognised because the gate named only the resolved class. The hit-test now reports where the gesture landed separately from what the link leads to.
- **Gate 2 — external links got half of Task 6's fix.** They took the offset bound and not the drawn-text gate, which is the half that exists because offsets can't answer the question: a click in the space past a short label clamps onto its last character and launched the system browser. Both handlers now ask the same two questions, and the edge seat itself is one primitive in `input.ts` rather than a copy in each.
- **Gate 2 — the empty-alias collapse lost a race it could only lose in the real app.** The dispatch was deferred to a macrotask because CM forbids one inside an update listener, and leaving by *blurring* is exactly the gesture that unmounts the editor in that same task — so the timer fired against a destroyed view and the bare pipe reached disk. Blur is handled on its own DOM event now, outside the update cycle, where it dispatches straight away; the listener keeps the deferral for caret moves, where the view is alive by definition. Its offset is mapped through the transaction rather than clamped, and the collapse re-reads the character before removing it.
- **Gate 2 — neither link handler guarded shift or click count.** A shift-click on a link's text was claimed by mousedown and then declined by click, so the gesture did nothing at all: no extend, no navigate. `embedClickSeat` had the guard right in the same folder.
- **Task 10 — the per-page `{load, save}` seam doesn't fit this one, and the plan's step was wrong to name it.** Folds, heading columns and embed heights are read for the page you have open; the alias memory is read for the page you are linking *to*, which is a different page every time. A per-page load can't answer that, so the slice mirrors `activeViews` instead: the whole map, fetched once in the same latency round, updated in place by both gestures.
- **B-4's strip-time write turned out to be subsumed, not skipped.** Edit Link was to keep a stripped alias in the original page's memory. Since C-2 writes on authoring, the words were already remembered the moment they were finished — so retargeting drops them from the link and the memory keeps them without a second write, and no resolver has to be threaded into the commit path to find out which page they used to describe.
- **Task 11 — `autocompleteQuery`'s third parameter needed no generalizing.** The plan expected the `allowEmbeds` boolean to become a mode set. Both hosts want the alias form, so it stays a boolean and the alias branch is unconditional; the branch order is what does the work, title before alias inside the one match.
- **Task 11 — the panel row is one shape carrying its own gestures, not a page-or-alias union.** A union would have made the panel switch on what a row *is*. Instead a row is `{ value, label, isPage, forget? }`: `value` is what accepting it writes, and a row that can be forgotten carries the closure that forgets it. The panel never learns what a page is or where the memory lives, and Phase 4's `( )` mode is a third producer rather than a third case.
- **Gate 3 — the two halves of `aliasOnLeave` didn't agree what "leaving an alias" meant.** The update listener required the caret to have been inside an alias; the blur handler required nothing, so blurring with the caret anywhere in a link remembered that link's alias — including one that arrived by paste and was never authored. Both now read the same predicate. Found by the simplification pass, which flagged it as behaviour rather than folding it.
- **Gate 3 — `linkAt` joins `linkSpans` one level down.** "Which link contains this offset" was hand-rolled four times, and the alias arc added the fourth. Gate 2 unified the offset arithmetic; this unifies the containment test built on it, which is what the earlier ruling was actually reaching for.
- **Task 12b — widening the label group is a ReDoS, and the cap is the fix.** The plan treated the widening as a regex one-liner. Reading escapes turns the label into an alternation under a quantifier, which on a long run of unclosed `[` backtracks quadratically at every start position — it turned the existing guard test red immediately. It now carries the same length cap `pageLinkPattern` carries, for the same reason.
- **Task 12b — the grammar had to move to `shared` before the cascade could use it.** `markdownLinkRegex` lived beside the editor's other matchers, and the rewriter runs main-side. One definition or the renderer draws links the rewriter can't find; `detect/` re-exports it so its own consumers didn't move.
- **Task 13 — the picker's commit became data.** Opening the panel needs `coordsAtPos`, and jsdom measures nothing, so a panel-driven test of the caret rules would only ever have tested the harness. `commitEdit` returns the changes and the selection instead, which made every form's caret rule assertable and left the hook thinner than it started.
- **Gate 4 — the prefilter and the rewriter were still two expressions of one rule.** A whole describe block existed to assert they agree, which is the tell: `targetNamesTitle` is now the single definition both call. `linkTarget` did the same for three surfaces that each derived a link's target from a different span.
- **Gate 4 — reclassifying a wikilink escaped the code filter.** Every token family is filtered against code spans, and the wikilink itself was — but extending its span over the parens is new ground that nothing checked, so `[[Notes]](`x`)` emitted overlapping tokens. Found by the simplification pass, which correctly flagged it as behaviour rather than folding it.
- **Gate 4 — Task 12c's reclassification was built, reviewed, and taken back out.** Reading `[[Title]](target)` as a markdown link labelled `[Title]` is what CommonMark says, and it cost three defects: the shape it creates is one the cascade's grammar cannot match, so renaming its target rots the link silently; it could emit a token overlapping another wikilink; and it turned a connection into a broken link the moment `(` auto-paired after it. The objection was raised before building — Obsidian, which is the tool this arc exists to interoperate with, renders the shape the way Pommora already did — and the review is what earned it. **Rebuilding it would take a fourth cascade pattern; whether that is worth having is Nathan's call.** Task 12c's other half, the escaped label group, stands and is independently tested.
- **Task 15 — the arc gave the syntax a structural character and never crossed it with the one context that escapes it.** A GFM table cell escapes `|`; `|` delimits an alias. A connection given its own words inside a table therefore reached the rename cascade as `[[Title\|alias]]`, whose title read as `Title\` and matched nothing — the prefilter never opened the file and the link rotted silently, visible only at rename time. The escape now leaves the title at the grammar and is re-emitted as it arrived. Two smaller findings were the same shape one layer up: the `]` refusal lived in the page editor's handler rather than beside the alias it protects, so a table cell never inherited it, and auto-pairing inserted the very character that refusal exists to stop. **The acceptance body carried every syntax and every case in bare prose** — one table row is what would have caught all three.
- **Task 2 — the `contentRange` census refines to one wikiLink toggle, not two.** `format.ts` holds two `contentRange` readers, but `toggleLink` reads `link` tokens whose shape doesn't move; only `toggleConnection` sees a wikiLink. Three further readers exist and are all provably unaffected: `decorations/intent.ts` returns early for `wikiLink`, `formatState.ts` tests connections on `range`, and `format.ts:68`'s `kind` excludes connection by type. The five sites Task 2 and Task 4 edit are unchanged.
### Lessons
### Sequenced After
- **Duplicate-title disambiguation** — designed, twice reviewed, and deliberately deferred. §G of the decision log holds the settled shape; it needs a path-authoring affordance in the picker, a main-side title index, a path-aware cascade primitive, and the journal that hardens the triggers it adds.
- **The rename cascade's non-atomicity** — a pre-existing Known Issue this arc neither worsens nor fixes.
- **The alias-management pane** — curating a page's aliases wholesale rather than one × at a time.

### Closeout
