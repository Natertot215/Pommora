## Alias-V1 — Implementation Plan

> **Status:** written, pending review · Spec: `Planning/Alias-V1 — Decision Log.md` · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

A connection's visible words become the author's to choose. After this, `[[Title|Alias]]` renders as *Alias* while still resolving on Title; two menu actions author and edit that alias with the caret landing where their names imply; a page remembers the aliases it has been given so they can be offered back and forgotten; `[Title](Page)` resolves internally beside `[[ ]]`; and a duplicate title stops being an unusable link, because a folder in the link breaks the tie.

The shape follows one principle the spec returned to at every fork: **what a link means lives on-page, in syntax any tool can read.** That is why aliases are display-only rather than resolution keys, why duplicates are broken by a path in the body rather than by a device-local memory, and why the database holds only an autocomplete accelerator whose loss costs a suggestion and never a link. The alias-as-tiebreaker alternative was weighed and dropped for making resolution device-dependent; frontmatter `Aliases:` was retired outright.

Bounded by: no alternate resolution keys, no reverse link index, no alias-management surface, and no new dependency. Markdown block tiles inherit the new forms through the renderer but are deliberately excluded from the new cascade coverage.

**Requirements**

1. `[[Title|Alias]]` renders as its alias in **both** wikiLink renderers, resolving on title, with the marker set hidden until the caret enters.
2. **Rename** and **Edit Link** join the connection menu, each placing the caret where its name implies — which requires the caret-placement bug fixed and the menu seam widened to carry a span and host editability.
3. Edit Link strips the alias from the new link and keeps it in the page's memory, governed by a **Remove Title on Link Change** toggle in Settings → Pages.
4. Per-page alias memory in `nexus.db`, written on authoring, offered as an autocomplete mode, forgotten by a hover-revealed ×.
5. `[Title](Page)` resolves internally, percent-encoded on disk, with page autocomplete inside `( )` and Return landing the caret in a pre-filled, selected title slot.
6. A path in a link breaks a duplicate-title tie; the rename cascade preserves the path prefix; a move cascades only when the moved page's title is duplicated.

**Acceptance — the whole thing working**

In a Collection holding two pages both titled `Notes`, in different Sets: author a link to one of them by picking it from autocomplete, give it an alias through Rename, and see it render as that alias and navigate to the correct page. Rename the target page and watch the link follow it with both its alias and its folder prefix intact. Move that page to another Set and watch the link still resolve. Then author the same link in the `[Title](Page)` form and confirm it resolves to the same page, survives the same rename, and reads correctly on disk as percent-encoded Markdown.

**Forced By**

- `Token` carries a single content span → a displayed alias needs a second, distinct resolve span, or resolution follows the alias and every aliased link goes phantom.
- Three consumers resolve off `contentRange`, one of them a non-CodeMirror renderer in table cells → the alias display is never a one-file change.
- `autocompleteQuery`'s link-form span covers the whole `[[…]]` → Return inside an alias replaces the entire link unless the query is bounded to the title.
- `rewriteConnections` substitutes the whole captured span → it can neither preserve a path prefix nor match on a last segment as written.
- `isValidLink` accepts any dotted host (`Notes.md`, `Node.js`) → page resolution must run *before* the external gate, not after.
- A CommonMark destination may not hold a bare space → the parens are percent-encoded, which is also what Obsidian writes.
- A path matters only when a title is ambiguous → a move needs no cascade unless the moved title is duplicated, which is one index lookup rather than a vault walk.
- `treeIndex` caches on the tree object and the watcher suppresses the app's own writes → an out-of-band alias write can't ride that cache, so the memory needs its own store slice.
- `invalidBasename` rejects `/` in every title → `[[Folder/Page]]` is unambiguous with no escape or discriminator.
- `movePage`/`moveSet` cannot revert (the file has already moved) → the journal covers rename only; move sweeps stay best-effort.
- `PreviewWindow` starts read-only and silently drops doc changes → the menu's new actions must gate on host editability.

**Inherited Reasoning** *(ruled out — do not retry)*

- **Frontmatter `Aliases:` as resolution keys** — retired; the on-page alias plus the DB memory supersede it.
- **Alias-as-tiebreaker for duplicates** — makes resolution device-dependent; path qualification answers it deterministically, and two mechanisms for one ambiguity is a second writer.
- **A suffix-keyed path index** — over-built; paths exist only to break ties, so they belong in the tiebreak, not the key.
- **A "Default Internal Link" syntax preference** — arbitrates nothing once both forms resolve, since the caret's context already names the syntax.
- **PageIDs in markdown-link parens** — rename-proof but unreadable in a file whose readability is the point.
- **A derived alias index** — a body scan can't honor a real remove-×.
- **Per-page settings** for the strip toggle — no such surface exists.
- **Escaping `]` inside an alias** — puts backslashes in the file; the character is refused instead.

**Grounding** *(re-open these; don't cite them)*

- `Planning/Alias-V1 — Decision Log.md` — the ratified spec; every task traces to a lettered decision.
- `src/shared/connections.ts` — `pageLinkPattern` (group 1 title, group 2 alias, the 255 cap and its ReDoS rationale), `normalizeTitle`, `ConnMenuAction`.
- `src/renderer/src/MarkdownPM/tokens/index.ts` — `wikiLinkTokens`, and `tokenize`'s overlap ordering.
- `src/renderer/src/MarkdownPM/editor/decorations.ts` — the `link` block (the alias-forward pattern to mirror) and the `wikiLink` block beneath it.
- `src/renderer/src/MarkdownPM/editor/connections.ts` — `resolvedPageAt`, the click/hover/contextmenu handlers.
- `src/renderer/src/MarkdownPM/Tables/cellStatic.tsx` — the **second** wikiLink renderer, with its own alias-tail line.
- `src/renderer/src/MarkdownPM/connections/index.ts` — `buildPageIndex`, `ConnectionsApi`.
- `src/renderer/src/MarkdownPM/autocomplete.ts` + `useConnectionAutocomplete.ts` — the query, `connectionInsert`, the single `AcState`.
- `src/renderer/src/MarkdownPM/input/format.ts` — `toggleLink` (⌘K) and its caret.
- `src/main/connections/{scan,rewrite}.ts` — `mentionsTitle`, `rewriteConnections`.
- `src/main/crud/{contextJournal,contextCascade}.ts` + `src/main/index.ts` — the journal and `replayPendingRename`, the pattern the rename cascade adopts.
- `src/main/mutate.ts` — the `rename`, `movePage`, `moveSet` arms.
- `src/main/db/{schema,localState}.ts` — the `Scope` union and the single-row upsert.
- `src/main/crud/util.ts` — `invalidName`, `invalidBasename`.
- `src/shared/links.ts` — `isValidLink`, `escapeAlias`, `normalizeLinkUrl`.
- `src/renderer/src/Settings/SettingsWindow.tsx` — the `TOGGLES` map and its `pages` category.
- `src/renderer/src/Components/Chip.tsx` — the hover-revealed remove-×.
- `.claude/Guidelines/Editor-Internals.md` + `Build-Gotchas.md` — read before touching the editor or launching.

**Environment**

Plan directory `.claude/Planning/` · Spec: the decision log · Explorer: `Explore` (no project explorer is designated) · Attack reviewer: `build-breaking-agent` · Code reviewer: `/code-review` (no correctness agent is designated) · Neutral verifier: `general-purpose` · Simplification: `code-simplifier` · Rules directory `.claude/Guidelines/`.

**Shapes:** additive · fix · refactor · user-visible

**Known gaps Phase 0 must close** *(named here so they can't be discovered mid-execution)*
- **Main holds no title index.** Task 14's duplicate-title gate needs a cheap "how many pages hold this title?" in the file-owning process, and `src/main` has nothing that answers it — the renderer's `buildPageIndex` is the only such structure. Either main gains one, the gate moves, or the move cascade loses its cheap escape.
- ~~**Whether a caret can sit inside a hidden marker region.**~~ **Answered by the sweep — it can.** `hideMarker` is a bare `Decoration.replace({})` and is never registered in `EditorView.atomicRanges`; and even declared-atomic ranges "don't block a programmatic dispatch, only CM's own default cursor-motion/deletion" (`calloutAtomic.ts`). A large hidden span is also already proven in production — the whole `](url)` tail is one hide of arbitrary length. Two things the caret work still owns: **set `assoc` explicitly** or the drawn caret may not render (`caret.ts` documents `RectangleMarker.forRange` returning nothing for a seat facing a replaced range), and note that arrow-walking never traverses the grown marker invisibly because `activeTokenIndices` is edge-inclusive — entering the token's range reveals it.

**Global Constraints (every task inherits these)**

- Gates, run from `Pommora/`, exit codes read **directly** — never through a pipe: `npm run typecheck` · `npm run test` · `npm run lint`.
- Biome owns formatting via a PostToolUse hook. Never hand-align, never run Biome. An Edit failing on whitespace means it reformatted — re-read and retry.
- Main owns the filesystem; the renderer never touches Node. Every IPC channel is declared once in `shared/bridge.ts` and returns the `Result` envelope.
- One normalization for connection matching. Never a second resolver, a second index, or a second writer.
- **Reuse before invention, checked rather than assumed.** Before writing *any* new helper, predicate, encoder, cache, or state shape, search for an existing one — Pommora is mature and the mechanism usually exists. Task 0's explorer reports are the standing reference; a task that authors something the reports name as existing is a defect, not a style preference. Where a task's step says "add X", read it as "add X only if the sweep found nothing that does or nearly does X."
- Comments explain why, never what. Never restate a value a declaration holds. `KNOB` and `(Nathan's call)` markers survive untouched.
- Stage explicit paths — never `git add -A` or a directory add.
- Out of scope everywhere: alternate resolution keys, a reverse link index, an alias-management pane, heading/block anchors, `rewriteBlockConnections` gaining new patterns, and any new dependency.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| ConnectionsPM §Syntax + Scope | "the piped tail renders as plain text beside the styled title" | the alias becomes the display text | 3 |
| ConnectionsPM §Rendering | "right-click pops a native menu whose one action is **Open Preview**" | two actions join it | 7 |
| ConnectionsPM §Resolution | the three states with no path escape | a path breaks a duplicate tie | 5 |
| ConnectionsPM §The Rename Cascade | one sweep rewrites `[[` and `![[` | a third pattern and prefix preservation | 15 |
| ConnectionsPM §Prospects | **Aliases** and **Duplicate disambiguation** entries | both ship | 18 |
| ContextPM §Immediate Work | the Display-alias line | resolved | 18 |
| ContextPM §Next-Feature Candidates | the **Page aliases** entry | retired, not completed | 18 |
| ContextPM §Known Issues | the caret-placement line | fixed | 6 |
| MarkdownPM | the autocomplete's form list; ⌘K's caret behavior | a third form; the caret returns to the title | 18 |
| ConfigurationPM | the personalization key list | gains the strip toggle | 10 |
| ArchitecturePM | the nexus.db scope list | gains the per-page alias scope | 9 |
| `shared/connections.ts` header | "Nothing authors or renders an alias yet" | both now happen | 3 |
| `rewrite.ts` header | an alias "rides through" as the whole story | prefix preservation joins it | 15 |
| `cellStatic.tsx` | "the editor leaves `\|alias` plain-visible, so match it" | neither does now | 4 |

**Dead Vocabulary** *(the closing sweep)*

- `rg -F "Nothing authors or renders an alias yet" src` → expect 0.
- `rg -F "plain-visible" src` → expect 0.
- `rg -F "{1,255}" src/shared/connections.ts` → expect 0.
- Control: `rg -F "pageLinkPattern" src` → 8 at planning time. Zero here means the sweep never ran.

**Hazard Window:** Task 2 changes `Token`'s shape while three consumers still read the old field. Until Task 4 lands, an aliased link resolves incorrectly in at least one renderer — no interactive verification of connections is meaningful inside that window, and the running-thing pass for Phase 1 defers to Gate 1.

---

### Phase 0 — Ground every addition in what already exists

#### Task 0: Consume the reuse sweep before any code is written

**Requirement:** 1–6

**Why:** Pommora has existed long enough that most of what this plan calls "new" probably isn't. Hand-rolled parallels to existing mechanisms are the project's most repeated avoidable defect, and the cost of finding one *after* it ships is a second writer nobody notices. This task exists so every later task starts from an inventory rather than an assumption.

**Files:** Modify this plan — each task's steps, rewritten against what the sweep found.

**Steps:**
- [ ] Read both explorer reports in full: the main-side sweep (encoding · path segments · journal reusability · title-uniqueness in main · the cascade's enumeration) and the renderer-side sweep (per-page store slices · hover-destructive controls · caret placement · marker hiding and whether a caret can sit inside a hidden region · autocomplete modes · every existing string-to-page resolver).
- [ ] For every "add", "create", or "write" step in Tasks 1–16, name the existing mechanism it reuses, or record that the sweep found none. Rewrite the step to cite the mechanism.
- [ ] **Close the two known gaps the sweep was aimed at.** Main holds no title index, so Task 14's duplicate-title gate has no cheap source — record what the sweep found and rewrite Task 14 against it. And confirm whether a caret can be placed *inside* a hidden marker region, since Tasks 3, 8, and 13 all depend on it; if it can't, those tasks need the reveal to precede the placement.
- [ ] Record every substitution in Deviations, so the reasoning survives.
- [ ] Commit: `docs(pommora): Alias-V1 grounds its additions in what already exists`

#### Gate 0 — nothing is invented that already exists
- [ ] Both explorer reports read; every authoring step in the plan cites a reuse or a recorded absence.
- [ ] Task 14 rewritten against a real main-side mechanism, or its gap escalated.
- [ ] The hidden-region caret question answered against the code, not assumed.

---

### Phase 1 — Resolution: one index, two spans, paths as tiebreakers

#### Task 1: Raise the bracket-content cap to 1024

**Requirement:** 6

**Why:** At 255 an over-cap link produces no token at all — invisible to rendering, scanning, and the cascade alike rather than degrading to a phantom. The cap was sized as a filename limit when brackets held only a title; a path consumes it quickly under nesting. Done first because every later task's fixtures may exceed the old bound.

**Files:** Modify `src/shared/connections.ts` — `pageLinkPattern`'s two quantifiers and the comment paragraph explaining the cap.

**Steps:**
- [ ] Change both `{1,255}` / `{0,255}` bounds to 1024.
- [ ] Rewrite the cap's comment: the bound exists as the ReDoS guard; drop the filename-limit rationale, which a path invalidates.
- [ ] Add a test: a 300-char path-qualified link produces exactly one token.
- [ ] `npm run test` — expect green.
- [ ] Commit: `fix(connections): the bracket cap bounds a path, not a filename`

#### Task 2: Give `Token` a resolve span distinct from its content span

**Requirement:** 1

**Why:** A displayed alias means the text shown and the key resolved are different strings, and `Token` carries one span for both. Adding a second field is what makes Task 3's display change safe; moving `contentRange` alone would make every aliased link resolve its *alias* — phantom, raw, unnavigable.

**Files:** Modify `src/renderer/src/MarkdownPM/tokens/index.ts` — the `Token` type and `wikiLinkTokens`.

**Interfaces**
- Produces: `Token.resolveRange?: Span` — present on `wikiLink` only; absent means `contentRange` is the resolution key.
- Assumed by: Tasks 3, 4, 5 (all three resolve sites), Task 7 (the menu's span).

**Failure half:** no alias → `resolveRange` absent and `contentRange` unchanged, so every existing caller behaves identically. Empty alias (`[[T|]]`) → group 2 matches empty; treat as no alias so the pipe is never the display text.

**Steps:**
- [ ] Add the optional `resolveRange` to `Token`.
- [ ] In `wikiLinkTokens`, when group 2 is present and non-empty: `contentRange` = the alias span, `resolveRange` = the title span, and the leading marker grows to cover `[[Title|`.
- [ ] Add tests: bare link unchanged; aliased link's two spans; empty alias degrades to bare.
- [ ] `npm run typecheck` — expect green (the field is optional, so no caller breaks yet).
- [ ] Commit: `feat(editor): a wikiLink token carries its resolution key apart from its display`

#### Task 3: Render the alias in the CodeMirror decoration

**Requirement:** 1

**Why:** This is the feature's visible half, and the pattern is eleven lines above it — the `kind === 'link'` block already shows content, hides its tail at rest, and reveals it on caret. Mirroring it rather than inventing a treatment is what keeps the two link forms visually coherent.

**Files:** Modify `src/renderer/src/MarkdownPM/editor/decorations.ts` — the `wikiLink` block (`conn.resolve` call and the marker loop).

**Must agree:** the decoration and `connections.ts`'s hit-test must resolve the same string for the same token; Task 4's test crosses both.

**Steps:**
- [ ] Resolve from `tk.resolveRange ?? tk.contentRange`.
- [ ] Hide the grown leading marker at rest and reveal it with the brackets on caret, exactly as the `link` block reveals `(url)`.
- [ ] Update `shared/connections.ts`'s header comment — "Nothing authors or renders an alias yet" is now false.
- [ ] Add a test: an aliased link's rendered text is the alias, and the caret inside reveals `[[Title|`.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(connections): an aliased connection reads as its alias`

#### Task 4: Point the other two resolve sites at the resolve span

**Requirement:** 1

**Why:** `cellStatic.tsx` is a second, non-CodeMirror wikiLink renderer with its own alias-tail line, and `connections.ts` holds the click/⌘-click/hover hit-test. Both resolve off `contentRange`. Left alone, a table cell disagrees with the editor about what a link looks like, and clicking an aliased link navigates by its alias.

**Files:**
- Modify `src/renderer/src/MarkdownPM/Tables/cellStatic.tsx` — the `wikiLink` branch and its alias-tail line.
- Modify `src/renderer/src/MarkdownPM/editor/connections.ts` — `resolvedPageAt`'s title slice.

**Must agree:** all three sites resolve identically; add one test asserting the editor, the cell renderer, and the hit-test agree on the same aliased link.

**Steps:**
- [ ] `cellStatic`: resolve from the resolve span, render the alias as the styled text, and delete the alias-tail append and its now-false comment.
- [ ] `connections.ts`: slice the resolve span for the hit-test.
- [ ] Add the cross-site agreement test.
- [ ] `npm run test` — expect green. **Hazard window closes here.**
- [ ] Commit: `fix(connections): every reader resolves a connection by its title`

#### Task 5: A path in a link breaks a duplicate-title tie

**Requirement:** 6

**Why:** A duplicate title makes a link permanently unusable today. Because a path matters *only* when a title is ambiguous, this needs no second index and no second normalization — the last segment is the title, and the prefix narrows the holders. That is also what makes a stale path harmless and a move cheap.

**Files:** Modify `src/renderer/src/MarkdownPM/connections/index.ts` — `buildPageIndex`'s `resolve`.

**Survivors:** `treeIndex.ts`'s standing rule — "a new lookup belongs here as another projection, never as its own walk." The tiebreak extends the existing `pageIndexOf` projection; it does not add a walk or a rival resolver. The sweep confirms there are no rogue string-to-page resolvers anywhere in the renderer, and that must stay true.

**Interfaces**
- Consumes: `ConnPage.path` — nexus-relative, POSIX, including `.md`.
- Assumed by: Task 14 (the move gate reads the same holder count).

**Failure half:** no `/` → today's behavior exactly. Path matching zero holders → `phantom`, not a silent fallback to the title. Path matching several → `ambiguous`. Degenerate forms (`/Notes`, `Work//Notes`, `Work/Notes/`) → phantom, never a crash.

**Must agree:** `mentionsTitle` (Task 15's prefilter) and this resolver must agree on which links name a given page; one test crosses both.

**Steps:**
- [ ] **Reuse, don't author:** `titleFromPath` (`shared/connections.ts`) already does basename-plus-`.md`-strip and is importable from main; `normalizeSeg` (`main/exclusion.ts`) is NFC + case-fold per segment, which is exactly the per-segment comparison this needs. Path split/parent/join exist as **four private duplicates** (`mutate.ts`, `store.ts`, `treeMove.ts`, `BlockSurface.tsx`) — consolidate onto one exported helper rather than adding a fifth.
- [ ] Split the raw link on `/`; the last segment is the title, trimmed per segment.
- [ ] Look the title up in the existing `byTitle` map — unchanged.
- [ ] One holder → resolved, prefix ignored. Several → keep those whose `path` ends with the written suffix (segment-wise, `.md` stripped, normalized); exactly one survivor → resolved, else `ambiguous`.
- [ ] Add tests for each branch plus the degenerate forms.
- [ ] `npm run test` — expect green.
- [ ] Commit: `feat(connections): a folder in a link breaks a duplicate-title tie`

#### Gate 1 — resolution is correct and single-sourced
- [ ] Gates green, exit codes read directly.
- [ ] The Dead Vocabulary control returns non-zero.
- [ ] Simplification and `/code-review` dispatched against `<base>..HEAD`, scoped to the touched paths.
- [ ] Every concern fixed, or carrying an explicit ruling recorded in the Log.
- [ ] **Hazard window closed** (Task 4 landed); the deferred running-thing pass runs now — an aliased link renders as its alias in both the editor and a markdown table cell, and clicking it opens the right page.
- [ ] Progress hashes filled in.

---

### Phase 2 — The authoring gestures

#### Task 6: Place the caret beside connection syntax instead of navigating

**Requirement:** 2

**Why:** Clicking near a connection navigates rather than placing the caret, which ContextPM already deferred to this arc by name. Both new gestures are unusable until it's fixed — Rename and Edit Link exist to put a caret exactly where a click currently refuses to.

**Files:** Modify `src/renderer/src/MarkdownPM/editor/connections.ts` — `connectionClicks`' click handler.

**Failure half:** a click on the *text* of a resolved link still navigates — this narrows the navigating region, it doesn't remove it.

**Steps:**
- [ ] Confirm the current hit region by reading `resolvedPageAt` and the handler's guards.
- [ ] Restrict navigation to the link's rendered content, leaving its edges to ordinary caret placement.
- [ ] Add a test: a click at the link's trailing edge sets a selection and does not call `open`.
- [ ] `npm run test` — expect green.
- [ ] Commit: `fix(connections): a click at a link's edge places the caret`

#### Task 7: Widen the menu seam to carry a span and host editability

**Requirement:** 2

**Why:** The menu pops only for a *resolved* link and its payload is a page, not a position — so right-clicking a duplicate-title link, the exact case Task 5 exists to serve, pops the general editor menu instead. The two new actions need a span to edit and a host that accepts edits: `PreviewWindow` starts read-only and silently drops doc changes, so Rename there would place a caret and swallow every keystroke.

**Files:**
- Modify `src/renderer/src/MarkdownPM/connections/index.ts` — `ConnectionsApi.menu`'s signature.
- Modify `src/renderer/src/MarkdownPM/editor/connections.ts` — the contextmenu handler and the hit-test's return.
- Modify `src/shared/connections.ts` — `ConnMenuAction` gains `'rename'` and `'editLink'`.
- Modify `src/main/connMenu.ts` — the two items, gated.
- Modify the four `ConnectionsApi` hosts named by the derivation.

**Derivation**
- `rg -F "showConnectionMenu" src` → expect 4 call sites at planning time. Legitimate hits: none, all four pass through.
- Control: `rg -F "ConnectionsApi" src` → 9. Zero means the search never ran.

**Negative control:** with the editability gate disabled, a test asserting Rename is absent in a read-only host goes red; with it enabled, a test asserting Rename is *present* in an editable host stays green. One that passes either way proves nothing.

**Steps:**
- [ ] Widen the hit-test to return status and range for any wikiLink token, resolved or not.
- [ ] Widen `menu` to carry the range and host editability alongside the page.
- [ ] Add the two actions to `ConnMenuAction` and `connMenu.ts`, omitted when the host isn't editable.
- [ ] Update all four hosts; `npm run typecheck` — a missed host is a compile error.
- [ ] Add both halves of the negative control.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(connections): the link menu knows its span and its host`

#### Task 8: Rename and Edit Link

**Requirement:** 2, 3

**Why:** These are the feature's authoring half. Rename targets the words shown; Edit Link targets the page pointed at. Edit Link strips the alias because repointing a link makes its old words describe the wrong page — deliberately unlike the URL-property convention, where a corrected URL still names the same thing.

**Files:**
- Create `src/renderer/src/MarkdownPM/editor/linkEdit.ts` — both caret placements and the strip.
- Modify `src/renderer/src/MarkdownPM/editor/connections.ts` — route the two actions.
- Modify `src/renderer/src/MarkdownPM/autocomplete.ts` — bound the link-form query to the title span.

**Failure half:** Rename on a link with no alias inserts `|` and places the caret after it. Edit Link on a link with no alias is a plain caret placement with nothing to strip. An alias emptied to nothing collapses the pipe.

**Must agree:** the bounded query and the token's spans must agree on where the title ends; one test crosses `autocompleteQuery` and `wikiLinkTokens` on the same aliased link.

**Steps:**
- [ ] Bound `autocompleteQuery`'s link form to the title span — today it spans the whole `[[…]]`, so Return inside an alias replaces the entire link with the bare form.
- [ ] Add a regression test for exactly that: caret in an alias, Return, alias survives.
- [ ] **The caret helper is genuinely absent** — `focusAt(view, pos)` in `editor/input.ts` is the only shared placement, and "seat the caret inside this token's Nth span" exists nowhere (the nearest precedent is the embed insert's `anchor: caret - ']]'.length`). Build one helper beside `focusAt` rather than inlining a fourth bespoke dispatch, and **set `assoc` explicitly** — a seat facing a replaced range renders no caret otherwise.
- [ ] Implement Rename's two cases and Edit Link's caret-at-title-end.
- [ ] Implement the strip, reading the personalization toggle, defaulting to on.
- [ ] Refuse `]` inside an alias, the way `invalidName` refuses `|` in a title.
- [ ] Collapse `[[Title|]]` to `[[Title]]` when an alias empties.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(connections): Rename and Edit Link author a connection's words`

#### Gate 2 — the gestures work and can't destroy what they edit
- [ ] Gates green, exit codes read directly.
- [ ] The derivation re-run against its control; the count matched or the divergence rewrote the plan.
- [ ] Simplification and review dispatched against `<base>..HEAD`.
- [ ] Every concern fixed or ruled on.
- [ ] Running-thing pass: right-click a connection, Rename, type, Return — the alias survives; Edit Link lands before the pipe; the menu pops on an ambiguous link and omits both actions in a resting preview.
- [ ] Progress hashes filled in.

---

### Phase 3 — The alias memory

#### Task 9: The per-page alias scope and its channel

**Requirement:** 4

**Why:** A page remembers the aliases it has been given so they can be offered back. It belongs in `nexus.db` because the alias itself lives on-page in universal syntax — what's stored is an accelerator whose loss costs a suggestion, never a link. It joins the existing PageID-keyed scopes rather than being an alias-specific store.

**Files:** Modify `src/main/db/localState.ts` (the `Scope` union), `src/shared/bridge.ts`, `src/main/ipc.ts`, `src/preload/index.ts`, and the copy-scope set.

**Failure half:** no database open → `writeKey` returns false and the caller reports rather than acknowledging a lost write. Emptying the list deletes the key rather than storing `[]`. Deleting a page does **not** prune, matching every sibling scope and keeping restore whole.

**Steps:**
- [ ] Add the scope to the union — rows, not DDL, so `SCHEMA_VERSION` does not move.
- [ ] Declare the channel once in `bridge.ts`; wire main and preload.
- [ ] Add the scope to the copied-scope set, or a duplicated page silently loses its memory.
- [ ] Tests: round-trip, empty-deletes-key, no-db-returns-false.
- [ ] `npm run typecheck` + `npm run test` — expect green.
- [ ] Commit: `feat(db): a page remembers the aliases it has been given`

#### Task 10: The store slice, the write, and the toggle

**Requirement:** 3, 4

**Why:** Autocomplete reads the memory on every keystroke, so it must load once — but it cannot ride `treeIndex`'s cache, which keys on the tree object and is invalidated only by a fresh tree push. Alias writes and the × push no tree, and the watcher suppresses the app's own writes, so a tree-keyed cache would keep serving a deleted alias. Its own slice is what makes the × actually visible.

**Files:** Modify `src/renderer/src/store.ts`, `src/shared/types.ts` (the personalization key), `src/main/readNexus.ts` (its coercion), `src/renderer/src/Settings/SettingsWindow.tsx` (the `pages` category).

**Failure half:** a write failing leaves the slice unchanged rather than optimistically showing an alias that didn't persist.

**Steps:**
- [ ] **Copy the editor's per-page pattern, don't invent one.** `folds`, `embedHeights`, and `tableHeadingColumns` all use one shape: a `{ load, save }` seam minted in `PageView.tsx`, stashed in a ref so the mount-once extension array reads live, loaded with `Promise.allSettled` (never `all`), and persisted by an `updateListener` **gated on its own StateEffect** — which is exactly why a keystroke dispatches nothing and no debounce is needed. Mirror that gating rather than writing on doc change.
- [ ] Add the scope to `remint.ts`'s `COPY_SCOPES` beside `folds`/`headingCols`/`embedHeights`, or a duplicated page silently loses its memory.
- [ ] Add the slice, seeded on nexus load, updated on every write and every ×.
- [ ] Write the alias on authoring — on commit, not per keystroke.
- [ ] Add `Remove Title on Link Change` to the `pages` toggles with `defaultOn`.
- [ ] Thread the personalization key through `types.ts` and `readNexus.ts`.
- [ ] Tests: the slice reflects a write and a delete without a tree push.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(connections): alias memory lives in its own slice`

#### Task 11: The alias autocomplete mode and its forget-×

**Requirement:** 4

**Why:** One component, three purposes — the title suggestions, the alias suggestions, and (in Phase 4) the `( )` target are modes of the single existing state machine, never rival panels contending for one caret. The × reuses the chip's hover contract, which already solved the hazard that a click ending a hover must not kill the thing being clicked.

**Files:** Modify `src/renderer/src/MarkdownPM/useConnectionAutocomplete.ts`, `AutocompletePanel.tsx`; reuse `src/renderer/src/Components/Chip.tsx`'s remove-×.

**Failure half:** a page with no remembered aliases shows no panel rather than an empty one. The × on the last entry closes the panel rather than leaving a husk.

**Negative control:** with the inert-until-hover guard disabled, a test asserting a stray click does not forget goes red; with it enabled, a test asserting a hovered × *does* forget stays green.

**Steps:**
- [ ] Add the alias mode to the existing `AcState` — a mode, not a second panel. `form` is already the only discriminant and the hook passes it through untouched, so the state machine is nearly free; the real work is that `autocompleteQuery`'s third parameter is a `allowEmbeds: boolean` needing generalization, and branch order matters.
- [ ] **`ChipRemoveButton` is reusable as-is** — it is already used outside chips with a custom skin (`FilterPane`'s location segment), taking `className`/`label`/`size`. Its inert-until-revealed contract reads opacity off computed style, so the skin must apply masks statically from mount, flip **only** opacity, key the reveal on a real `:hover` sibling chain, and keep the surrounding label pointer-inert. That CSS carries a LOAD-BEARING banner; computed styles lie for this bug class, so verify with live hovers only.
- [ ] Widen the panel row deliberately: `AutocompletePanel` is typed to `ConnPage[]` end to end with a hardcoded page icon and a prefix-only highlight. Mirror `MenuItem`'s existing `trailing` slot for the ×; do not build a second panel.
- [ ] Wire the × to the slice's delete.
- [ ] Add both halves of the negative control.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(connections): typing an alias offers the ones this page has worn`

#### Gate 3 — the memory is real and forgettable
- [ ] Gates green; simplification and review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Running-thing pass: author two aliases for one page, see both offered on the third link, forget one with the × and watch it stay gone without a reload.
- [ ] Progress hashes filled in.

---

### Phase 4 — Dual syntax

#### Task 12: `[Title](Page)` resolves internally, percent-encoded

**Requirement:** 5

**Why:** Both forms resolve because Pommora reads what other tools write. The discriminator must try page resolution *first*: `isValidLink` accepts any dotted host, so a bare `Notes.md` (`.md` is Moldova's TLD) or `Node.js` would otherwise open a browser and make a real page unreachable. Percent-encoding is what CommonMark requires and what Obsidian writes; a bare space isn't a valid destination at all.

**Files:** Modify `src/renderer/src/MarkdownPM/editor/links.ts`, `decorations.ts` (the `link` block's valid test), and `src/shared/links.ts` (an encode/decode pair beside `escapeAlias`).

**Failure half:** target resolving as a page → internal. Not resolving and valid as a URL → external. Neither → the **existing** `.md-link-invalid` treatment, unchanged: dimmed display text, no pointer cursor, target still hidden at rest. Anchors and file references land here, as they render today. Nothing dumps raw syntax into the line.

**Must agree:** the markdown form and the wikilink form must resolve the same target to the same page; one test crosses both. One branch decides among the three outcomes — never two predicates that could disagree about whether a target is internal.

**Survivors:** `.md-link`, `.md-link-invalid`, and `.md-link-url` are unchanged and un-renamed. Three outcomes reuse two existing classes plus the connection colour; no new link styling is authored. The `link` token kind stays single — internal versus external is a resolution branch, never a second grammar or tokenizer.

**Steps:**
- [ ] Re-read the explorer reports before writing: use whatever encoding, path-segment, and page-resolution helpers already exist rather than authoring parallels.
- [ ] Add percent encode/decode — the sweep confirms **no codec exists**, only `encodeURI` at `assetUrl.ts` and two `decodeURIComponent` at the protocol boundaries. Follow that precedent: **`encodeURI`, not `encodeURIComponent`**, so `/` survives a path target. Note `unescapeAlias` is asymmetric with `escapeAlias` (it unescapes any `\x`) — don't widen it into this.
- [ ] Write one resolver returning a three-way outcome — internal page · external URL · broken — so no two predicates can disagree.
- [ ] Try page resolution first (extension stripped, path tiebreak from Task 5), then the external gate.
- [ ] Route an internal hit to navigation instead of `openExternal`; give it the connection colour (D-8).
- [ ] Tests: `Notes`, `Work/Notes`, `Work/Notes.md`, `My%20Page`, `Node.js`, a real URL, an anchor — and one asserting a broken internal target renders dimmed with its target hidden, identically to a broken external one.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(connections): a markdown link can name a page`

#### Task 13: Autocomplete inside `( )`, and ⌘K's caret returns to the title

**Requirement:** 5

**Why:** Without a picker in the parens there's no discoverable way to author an internal markdown link but to type a path by hand. And since a markdown link's display text is free — unlike a connection, whose title *is* its target — finishing the target should hand the caret back to the label rather than exiting.

**Files:** Modify `src/renderer/src/MarkdownPM/autocomplete.ts` (a third form), `useConnectionAutocomplete.ts` (its commit), `input/format.ts` (`toggleLink`'s caret).

**Failure half:** ⌘K over a selection keeps the selection as the label; with no selection the slot is filled by the picked page's title.

**Steps:**
- [ ] Add the `( )` form to `autocompleteQuery` beside `link` and `embed`.
- [ ] On commit: insert the encoded target **and** carry the caret to the title slot, pre-filled with the page's title and selected — one press, not two.
- [ ] Tests: the third form detects; Return fills both slots; a second Return keeps the label.
- [ ] `npm run test` + `npm run lint` — expect green.
- [ ] Commit: `feat(editor): picking a page in a markdown link lands you in its label`

#### Gate 4 — both syntaxes reach the same page
- [ ] Gates green; simplification and review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Running-thing pass: ⌘K, pick a page, Return, type a label, Return — the link resolves and reads as percent-encoded Markdown on disk.
- [ ] Progress hashes filled in.

---

### Phase 5 — Keeping it true

#### Task 14: A move cascades only when the title is duplicated

**Requirement:** 6

**Why:** A move is a drag. Without a gate every drop would read every markdown file in the nexus, which is exactly the "never reload the entire Y" rule. Because a path is consulted only under ambiguity, the gate is one index lookup: a unique title resolves wherever it lives, so no body needs touching at all.

**Files:** Modify `src/main/mutate.ts` — the `movePage`, `moveSet`, and container `rename` arms.

**Failure half:** unique title → no body is read, and the move behaves exactly as today. Duplicated → the sweep runs. A container move collects its affected members into **one** sweep, never one per page. Moves don't change titles, so ambiguity can't shift under the gate.

**Survivors:** `movePage`/`moveSet` sweeps stay **best-effort** — the file has already moved and there is nothing to revert. Task 16's journal covers rename, where a revert exists.

**Steps:**
- [ ] Add the duplicate-title gate, reading the same holder count Task 5's resolver uses.
- [ ] On a hit, rewrite links that resolved to this page by path, to the shortest path that still identifies it.
- [ ] Collect a container's affected members into a single sweep.
- [ ] Tests: unique title reads nothing; duplicated title rewrites; container move sweeps once.
- [ ] `npm run test` — expect green.
- [ ] Commit: `feat(connections): a move only cascades when a path is load-bearing`

#### Task 15: The cascade preserves the path and learns the third pattern

**Requirement:** 6

**Why:** `rewriteConnections` substitutes the whole captured span, so a rename would flatten `[[Work/Notes]]` to `[[Ideas]]` — discarding a qualification the author added deliberately — while a title-only match skips the qualified form and orphans it. And `[]()` links now name pages, so the cascade must reach them or every markdown link breaks on the first rename.

**Files:** Modify `src/main/connections/rewrite.ts` and `scan.ts`.

**Must agree:** `mentionsTitle` and `rewriteConnections` must agree on which links name a page — a prefilter that misses what the rewriter would change means a body never gets opened. One test crosses both.

**Failure half:** a link inside code stays a sample for all three patterns. A path-qualified link to a *different* page sharing the last segment is left alone.

**Steps:**
- [ ] Match on the span's last segment and replace only that, preserving any prefix; `![[ ]]` takes the identical treatment.
- [ ] Add the `[]()` pattern to both the prefilter and the rewriter, percent-encoding preserved.
- [ ] **Free win while here:** `mentionsTitle` is a full parse with no cheap gate in front of it, and the cascade reads every `.md` in the nexus without touching `walkCache`. Add a `body.includes` substring gate before the parse — it costs nothing on the common miss path, which is nearly every file.
- [ ] **Don't reach for `sweepGovernedRoots`** — it is frontmatter-key-shaped and this cascade is body-shaped; it is the wrong reuse despite looking like the right one.
- [ ] Call `recordWrite` on both sides of any rename this touches, or the watcher re-walks the whole nexus.
- [ ] Update `rewrite.ts`'s header comment — the alias-rides-through line is no longer the whole story.
- [ ] Tests: prefix preserved; last-segment match; `[]()` rewritten; code-fenced samples untouched; the prefilter/rewriter agreement test.
- [ ] `npm run test` — expect green.
- [ ] Commit: `fix(connections): a rename keeps the folder it was given`

#### Task 16: Journal the rename cascade

**Requirement:** 6

**Why:** The cascade is per-file and not cross-file atomic — a failure partway leaves some bodies rewritten and the rename reverted, so links point at a name nothing holds. `contextJournal` already solves exactly this a few files away: record the intent, cascade, clear, and forward-complete at next open. Adoption, not invention.

**Files:** Create `src/main/crud/pageJournal.ts` on `contextJournal`'s shape; modify `src/main/mutate.ts` (the `rename` arm) and `src/main/index.ts` (the startup replay).

**Failure half:** a crash between record and clear → the next open forward-completes. A replay running twice → idempotent, exactly as the context journal's record is.

**Negative control:** with the journal disabled, a test simulating a mid-cascade failure leaves a stale body and goes red; with it enabled the replay heals it and the test passes.

**Steps:**
- [ ] Read `contextJournal.ts` and `contextCascade.ts`'s `replayPendingRename` before writing anything. The journal *record* is Context-shaped in three ways — `contextId` is required and its absence rejects the record, `spaceId`'s presence is the only discriminant, and one fixed filename holds one record, so a page journal would clobber a pending Context one. Widen with a real `kind` discriminant or key the file per kind.
- [ ] **The replay's rules are the actual asset, not its code** — copy them deliberately: re-verify the exact old→new mapping still holds or discard; **discard rather than hijack when the freed old title has been re-minted by another entity**; stay idempotent; keep the journal alive while any file remains unread so an unreadable file means retry-later rather than silent loss.
- [ ] Write the page journal; commit the record before the cascade, clear after.
- [ ] Call the replay at startup beside `replayPendingRename`, before anything reads.
- [ ] Add both halves of the negative control.
- [ ] `npm run test` + `npm run typecheck` — expect green.
- [ ] Commit: `feat(connections): an interrupted rename finishes on next open`

#### Gate 5 — links stay true through rename, move, and crash
- [ ] Gates green; simplification and review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Running-thing pass: rename a page with an aliased, path-qualified link pointing at it — alias and folder both survive; move it and the link still resolves.
- [ ] Progress hashes filled in.

---

### Phase 6 — Closeout

#### Task 17: The end-to-end acceptance run

**Requirement:** 1–6

**Why:** Per-task green is systematically optimistic. This is the only check that catches "every task passed, the feature doesn't work."

**Steps:**
- [ ] Build a throwaway Collection with two same-titled pages in different Sets.
- [ ] Drive the full acceptance criterion from the header, verifying on disk at each step.
- [ ] Tear the fixture down through the app; scrub its trash bundle after verifying the record.
- [ ] Record the evidence in the Log.

#### Task 18: Reconcile every document the arc made false

**Requirement:** 1–6

**Why:** The falsifying commit is the only moment anyone knows what went false. Each row of **Made False** names its sentence; a doc still false at closeout is a defect in the commit that should have carried it.

**Steps:**
- [ ] Work the **Made False** table row by row.
- [ ] Retire ConnectionsPM's **Aliases** and **Duplicate disambiguation** prospects; retire ContextPM's **Page aliases** entry rather than completing it; resolve its Immediate Work and caret-bug lines.
- [ ] Run the Dead Vocabulary sweep against its control.
- [ ] `node scripts/check-atlas.mjs` from `Pommora/` — expect green.
- [ ] Write the HistoryPM entry.
- [ ] Commit: `docs(pommora): Alias-V1 closes — a connection wears the words you chose`

#### Task 19: Claim, verify, then attack

**Steps:**
- [ ] Write the Delivery Claim into the Log.
- [ ] Dispatch the **neutral verifier** with the claim, the decision log, the plan, and the full commit range — "is this true?", adjudication only.
- [ ] Fix and re-claim if the answer is no.
- [ ] Only then dispatch `build-breaking-agent` against the shipped code.
- [ ] Verify every finding against the code before folding; a flagged concern is unfinished work.
- [ ] Route lessons to `.claude/Guidelines/`.

---

## Implementation Log

### Progress
- [ ] **Phase 0** — Grounding · base `<commit>`
  - [ ] Task 0 — Consume the reuse sweep · `<commit>`
- [ ] **Phase 1** — Resolution · base `<commit>`
  - [ ] Task 1 — Raise the bracket cap · `<commit>`
  - [ ] Task 2 — Token resolve span · `<commit>`
  - [ ] Task 3 — Render the alias · `<commit>`
  - [ ] Task 4 — The other two resolve sites · `<commit>`
  - [ ] Task 5 — Path as tiebreaker · `<commit>`
- [ ] **Phase 2** — Authoring gestures
  - [ ] Task 6 — Caret at the link's edge
  - [ ] Task 7 — Widen the menu seam
  - [ ] Task 8 — Rename and Edit Link
- [ ] **Phase 3** — Alias memory
  - [ ] Task 9 — Scope and channel
  - [ ] Task 10 — Slice, write, toggle
  - [ ] Task 11 — Alias mode and forget-×
- [ ] **Phase 4** — Dual syntax
  - [ ] Task 12 — Markdown links resolve internally
  - [ ] Task 13 — `( )` autocomplete and the ⌘K caret
- [ ] **Phase 5** — Keeping it true
  - [ ] Task 14 — The move gate
  - [ ] Task 15 — Prefix-preserving cascade
  - [ ] Task 16 — The rename journal
- [ ] **Phase 6** — Closeout
  - [ ] Task 17 — Acceptance run
  - [ ] Task 18 — Documentation
  - [ ] Task 19 — Claim, verify, attack

### Rulings
### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- **Markdown block tiles** keep title-only cascade healing, so a `[]()` or path-qualified link inside a tile can go stale where the same link in a page heals. `rewriteBlockConnections` is the existing seam; widening it is additive.
- **An advisory path goes stale on disk** after a move of a uniquely-titled page — the link resolves, but names a folder the page has left. Correcting it means sweeping every move, which is the cost the gate exists to remove.
- **The alias-management pane** — curating a page's aliases wholesale rather than one × at a time.

### Closeout
