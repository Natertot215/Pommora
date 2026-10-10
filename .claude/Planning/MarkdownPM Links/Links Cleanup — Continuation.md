## Links Cleanup — Continuation

```markdown
You're picking up the Links Cleanup for Project Pommora (`~/The Studio/Projects/Project Pommora`, branch `active`) at the plan-review stage. The plan is drafted and committed at `.claude/Planning/MarkdownPM Links — Implementation Plan.md` (STATUS Draft, eleven phases); nothing is implemented, and production code is unchanged since `42a18f4a5`. This document, `.claude/Planning/MarkdownPM Links/Links Cleanup — Continuation.md`, is the current source of truth: what the work is, the principles that bind it, every ruling Nathan has made, the design as the plan commits to it, what was settled at the two planning checkpoints so reviewers don't re-litigate it, the review chain and how each reviewer is briefed, and the traps. `synthesis.md` beside it holds the code-level reasons; the scout and verifier reports behind it are the evidence trail; the transcript at `~/.claude/projects/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/cc8fe384-19e9-4334-bcd1-cd76e245f1be.jsonl` has Nathan's exact words if you ever need them.

Read this whole document, then the plan top to bottom, before doing anything. Then run §4.2 in order: the simplification review, the adversarial review, the neutral plan review, each folded into the plan before the next is dispatched, with Nathan's calls brought to him as they arise; then the skill's own self-review of the plan; then the advisor; then present the plan to Nathan with every veto shown, and he ratifies it (STATUS, the BASELINE head and test count). Implementation starts only after ratification. Load `agent-orchestration` before dispatching any agent, and `writing-plans-v3` for the review and presentation steps. Nathan is not technical: explain in plain terms, and don't assume he knows how the code works.

One working practice Nathan asked to be passed on explicitly. When an answer can be read two ways, contradicts an earlier ruling, or leaves a case unnamed, stop and ask before building on it. Lay out the readings side by side (a small table of concrete outcomes works best) and give your recommendation. It can feel like pushback or like slowing down, but he values it; it's what kept these rulings coherent. Consult the advisor at each step.
```

*The block above is the handoff prompt. Nathan removes it once it's been given.*

---

### 1. Where Things Stand

- **Repository:** `~/The Studio/Projects/Project Pommora`, branch `active`. Production code is unchanged since `42a18f4a5`, which is the Link Gestures commit `75c3bcb9c` plus its docs reconcile; every later commit touches `.claude/` only. Nothing from this effort is implemented.
- **The Plan:** `.claude/Planning/MarkdownPM Links — Implementation Plan.md`, drafted 10-10-2026, STATUS Draft, eleven phases and forty-three tasks, with every AFTER written as the intended code. Its BASELINE table is filled at ratification: head `42a18f4a5`, 521 test files / 7,528 tests.
- **The Checkpoints:** The first (approach, phase order, ten questions, disclosed calls) was taken 10-10-2026 and its answers are folded into §5 and §12. The second (the drafted plan walked through in plain terms) was delivered with the plan; any adjustment Nathan gives lands in the plan before the first reviewer reads it.
- **Reviews:** The simplification review (fable-high) ran and was folded on 10-10-2026: eight proposals taken (the resting write awaits its title and commits once through `settledLinkText`; one `inCodeNear`; the seat and `commitAtRest` land in Task 6-4 ahead of the link door; a `§` run gets no menu; one `headingKeys`; `linkStatus` stays as the one status rule; the url menu arm drops `windowed`; `readLinkText` resolves once and reads a bare `#Heading` the same in both syntaxes), four defects fixed (the `cellTokens` memo was mutated; the resting slot rule entered the cell for list and heading rows; a type error in Task 10-3's anchor; the `[x](#H)` contradiction), and nine smaller calls folded (`PageIndex['resolve']` in place of a second type, `gonePageEntry`, an action roster, a generic `outlineTree`, an optional `ordinalOf`, `valueTarget` in `LinkCell`, `valueMenuTarget` for the three value parents, one cached-title read in `paste`, six restating comments dropped). Nothing was rejected.
- The adversarial review (Opus at xhigh) ran and was folded on 10-10-2026: two HIGH defects in AFTER blocks (`readLinkText` with a resolver refused every address and wrote the typed capitalization; `openConnectionAt` kept the virtual `]]` in its span, so a pick in an unclosed `[[` ate two characters past the caret), five MEDIUM (a plain ⌘V reformatted a written markdown weblink; the resting paste skipped the live paste's code, container, and seat gates, which one pure `pasteEdit` now serves for the editor, the resting cell, and the rectangle; the container step ignored the Paste As form and retargeted on Plain Text and ⌘⇧V; `LinkCell` classified a value twice, by two readers that disagreed, and now reads `valueTarget` alone; the fold's `[x](#H)` change and optional `ordinalOf` hadn't reached their tests), five LOW (the titled form spelled three ways, now `settledLinkText` alone; `ConnMenuAction` → `LinkMenuAction` and the resting commit named `commitAtRest`; one `drawsRawHtml`; a fence fixture that couldn't go green; the stale −250 to −350 in the Completion Criteria), and four Unsure items turned into checks or open items. Nothing was rejected; one ruling conflict went to Nathan (§5.8, Paste As inside a link).
- **Next:** The neutral review (§4.2), then presentation and ratification, then implementation in a later session.
- **The Bundle:** Phase 9 (the resting cell, about +160, ruled additive) ships inside this bundle; the delta is reported in two numbers, the cleanup and the resting cell (§9). Nathan's call, 10-10-2026.
- **Proving Work:** Two scouts built parts of the design on scratch worktrees at `42a18f4a5` and saved their diffs (§7). Neither is committed to the code; the plan applies the first in Task 1-1 and writes Phase 9 from the second.
- **The Evidence:** `synthesis.md` and every report behind it live beside this document in `.claude/Planning/MarkdownPM Links/` (§8). Paths in §7 and §8 are relative to that folder.

### 2. The Mandate

In Nathan's words, with typos corrected:

> We're planning the complete cleanup of how Pommora and MarkdownPM handle links: pasting them, copying them, reading them… all of it. We want a single source of truth for how this works. No odd-ones-out behavior. No confusing names, no complexity that only exists because previous and right-now architecture makes it "look" correct, and nothing that doesn't end up reading totally intentional and simple.
>
> The new system can take on a different look than what's currently there and may constitute a major refactor, deletion, behavioral changes, or anything required to make Pommora's codebase and MarkdownPM much more maintainable, cohesive, clear in where things belong, how things work, and what things do. There should be clear ownership where required, shared behavior where appropriate, and deletions when best made. Things previously engineered as independently constructed when their actual behavior should simply be inherited from its primary source and derived from shared reasoning should be reconciled. Anything that's different, appears "correct" in isolation, but whose reasoning for being different collapses on further assessment should be reconciled and considered as opportunities for codebase enhancing changes.
>
> The goal here is to reduce the codebase by around 200-400 lines of code. Remove any spaghetti architecture or "fancy systems" that don't provide any actual value and simply fulfill self-induced responsibilities that wouldn't be needed if the more appropriate and actually coherent approach was taken in the first place.
>
> What we do may not reflect the current codebase, but the outcome may ensure the codebase is reflective as a whole on the broader level as a result. We're chasing parity, clarity, maintainability, consistency, and reliability — not what's the most fancy or expensive way to achieve the same behaviors.

**On the Line Target:** "Net-negative" is the simplicity philosophy, not a literal chase. Don't write denser code to hit a number; report the real figure. Additions are accepted when they're surgical and collapse drift. Overall, the line count still goes down, and the neutral perspective's "less stuff, fewer ways, less confusion, less complexity" stays the core emphasis. The plan ledgers at about −120 for the bundle and about −280 for the cleanup without the resting cell (§9); the reviews keep tightening every addition that doesn't earn its place.

**Scope:** Everything link-shaped is in scope wherever leaving it out would leave odd-ones-out behavior: the Connections layer, the `[[` picker, Paste As and the clipboard, opening links and fetching titles, embeds and citations, Link property values, and MarkdownPM table cells.

### 3. Principles

These bind every task and every in-flight decision. They're in the plan's *§Constraints* as written here, merged only where one restates another.

**Nathan's Working Rules:**
- **Net Simplification Is the Bar:** In Nathan's words: "Ensure we're not adding anything more compared to what's being collapsed or removed. The codebase must be simplified and more easy to understand as a result — unambiguously and without any need to understand what this session touched." A change that relocates complexity, adds indirection, or passes the problem forward fails however correct it is. The bundle must land net negative, and an additive finding has to earn its place or Nathan will drop it.
- **Never a Half-Fix:** The work must withstand these principles as a whole. A finding is either resolved at its cause or explicitly left in the ledger at Nathan's ruling. Never patch around one caller while the shape that produced it stays.
- **Readable Over Clever:** When a written fix trades readable code for a denser form to save a cost nobody notices, find the approach that leaves the readable code alone and fixes what feeds it.
- **Source Over Patch:** Fix the shape that produces a defect rather than guarding one caller. Keep one definition per rule, placed with the code that reads it. A second copy of a mechanism is a defect even while both copies work.
- **Follow the New Input:** When a function starts reading something new, check whatever decides when it runs.
- **Removal Earns Its Place:** Delete defensive fallbacks, optional props only tests need, flags guarding states production never produces, and channels that restate another channel. Before deleting a safeguard, establish what produces the state it guards, and verify the claim that makes it removable. "This is a no-op downstream" is often true only for the canonical case.
- **Honest Behavior Descriptions:** Verify every behavior claim to Nathan against the code or a probe before stating it. Name what was reproduced only under artificial conditions, such as a selection seated by code or an insert dispatched rather than typed.

**Nathan's Design Principles:**
- Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and fit within the existing codebase naturally.
- Look *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly.
- Design what's necessary without making sacrifices or being negligent, but don't overcomplicate or "bulletproof" things when the maintainability and complexity outweigh the actual purpose.
- Consider various perspectives, multiple alternatives, and potentially relevant opportunities before deciding upon an approach or isolating options.
- Anything changed or implemented should be reflected across the board. Nothing should be done one way here while something else works differently elsewhere, unless that's *genuinely* correct.
- Prioritize addressing the high-level origin rather than compounding patch-on fixes or amendments — don't just pass it along.

**The Plan-Stage Reviewers' Rubric** (Nathan's six, from earlier audits; the neutral plan reviewer's rubric, not written into Constraints):
- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, making a wrong behavior correct, or delivering a required behavior in minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules.
- **Better, Rather Than Moved:** Complexity that's relocated, renamed, or exchanged for new complexity of similar weight counts as no improvement.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.

### 4. Process

#### 4.1 Done

- **Search:** The planning session read the code behind every design row and the foundation diff itself, probed the unclosed-link reader against the grammar, and read every Feature document the work touches.
- **Assess:** The phase order was set around the dependency edges (§10), the foundation prototype's shape was confirmed, and a second scout proved the resting-cell design on a worktree before it was planned (§7).
- **Checkpoint 1:** The approach, the phase list, ten questions, the disclosed calls, and where the design strains were put to Nathan in plain terms on 10-10-2026; his answers are in `Ruling Log.md` (*Planning Checkpoint*) and folded into §5 and §12.
- **Plan:** Written with `writing-plans-v3` and this effort's adaptations: AFTER blocks as close to final code as the design allows, cited by file and function; red-first tests with their expectations named; Nathan's hand-checks written into the VERIFY of the task each proves; *§Open Items* as §13.
- **Checkpoint 2:** The drafted plan, walked through in plain terms, with the one claim of Nathan's that the code contradicts (§12, the dotted-title case) flagged.

#### 4.2 Plan Reviews (Sequential, Each Folded Before the Next)

Each reviewer gets the plan, this document, `synthesis.md`, and the two proving diffs, and is told the settled calls (§12) so it notes rather than re-raises disagreement with them. Each reviews the plan against what it intends and how, not whether it technically works; the plan stays untouched while a reviewer reads. A finding names a mechanism: a sequence that reaches a bad state, at a `file:line` the reviewer read, or a task a fresh executor would trip on. "Could break" without a path, cosmetic observations, and style preferences aren't findings, and a reviewer that finds nothing wrong has done its job. A finding that adds a guard, a layer, or a test for a state the code can't produce is scope creep. After each review, every claim is checked against the tree before it changes anything; what holds is folded in and cascaded to the tasks that assumed the original; what doesn't is discarded with a line saying why.

1. **Simplification:** fable-high, with the `code-simplification` lens.
2. **Adversarial:** fable-high, with the `adversarial-review` lens. Bring the calls that are Nathan's to him.
3. **Neutral Plan Review:** `fable-extra`.
   - **Gets:** The plan, its intent, and the whole codebase.
   - **Lens:** The blind reviewer's mandate without the blindness. Nathan's six (§3) are its rubric, read simplicity first and outward against the rest of the codebase for cohesion.
   - **Judges Outward Cohesion:** Does the plan truly advance what the code holds? Does each AFTER read as always-intended next to the code it doesn't touch? Does it leave nothing dead behind and zero gaps, add no complexity that needn't exist, and create no friction with future work?
   - **Returns:** A verdict and a ranked list.
   - **Veto:** A suggestion may be vetoed, with an open mind, by answering it with the code that shows why it shouldn't be taken; "the plan called for it" answers nothing. Every veto appears in the plan presentation.
4. **Self-Review:** The skill's §3.2, read as the executor would: names no earlier task creates, VERIFY steps that declare instead of run, constraints restated inside tasks, sections that disagree; then the spec sweep against §5, mandate by mandate.
5. **Advisor**, then present the plan with the vetoes, and Nathan ratifies it.

#### 4.3 Post-Implementation Verification

1. **Phase Review:** fable-high, per the skill's §5.1, each phase as it lands.
2. **Simplification Lens, Then Adversarial Lens:** fable-high, over `baseline..HEAD`.
3. **Neutral Before/After Review:** fable-high, zero context, judging with §4.4's rubric.
   - **Gets:** The file list only, with production files and tests marked. Before is `git show <baseline>:<path>`; After is the working tree. It may read untouched code for comparison.
   - **Forbidden:** `git diff`, `git log`, commit messages, `.claude/`, the plan, and any statement of intent.
   - **Returns:** A Positive, Neutral, or Negative verdict; a per-file account; a ranked list of anything worse in After, with `file:line`; and before/after line counts.
   - **The One Question:** Is the change genuinely positive, or does it pass the ball forward?
   - **Findings:** Counted as in §4.2.
   - **Closing the List:** Every item it ranks worse is verified. If it holds, fix it at its cause; code is never added only to answer a critique. If it's rejected, the report answers it with the code that shows why. A standing disagreement goes to Nathan. A second pass runs on the fixed state, at most two passes.
   - **Order:** It runs after every other finding is closed.
4. **Own Pass, Reconciliation, Report:** Per the skill. Completion requires a Positive verdict, with every ranked-worse item fixed or ruled on by Nathan, and the measured delta reported.

**The Skill's Own §5.3:** It gives the neutral verifier "a plain statement of what the change intended". For this effort, the post-implementation neutral gets no intent at all; only the plan-stage neutral gets the plan and intent. The skill file itself stays unchanged.

#### 4.4 The Blind Reviewer's Rubric (Broadly Principled, Not Confirmatory)

Read both versions honestly and at an overview level, as code you'd inherit and maintain. For each axis, judge which version is better and why, in your own terms:
- **Simplicity:** Less to carry and less to trace. Does each piece earn its existence, or does some exist only to serve another piece's shape?
- **Cohesion:** Does it read like the codebase around it, in its idioms and ownership patterns, with one home per concern, nothing hand-rolled that the codebase already provides, and nothing behaving differently from its siblings without reason?
- **Direct Purpose:** Does each file, function, and type do what its name says, directly, with nothing over-engineered and no detours, shims, defensive layers, or speculative generality?
- **Legibility:** Could a newcomer find where a behavior lives and understand it in one read? Do the names say what things are?
- **Ownership:** Is it clear who owns each rule, and would the next change of this kind have one obvious place to go?
- **Honest Weight:** Was complexity removed, or relocated, renamed, or exchanged for new complexity of similar weight?
- **Settledness:** Does anything read transitional, half-finished, leftover, or inconsistent with itself?

**The One Question:** Is After genuinely better for the codebase, with no reason left to think anything in Before was the better choice, or does it pass the ball forward? Would you accept it?

#### 4.5 Working Practices Nathan Asked to Carry Forward

- **Refuse Ambiguity Out Loud:** When an answer has two readings, contradicts an earlier ruling, or leaves a case unnamed, stop and ask. Put the readings side by side, ideally as a table of concrete outcomes, and give a recommendation. He values this pushback.
- **Disclose:** Disclose in-flight decisions immediately.
- **Report Honestly:** Report line deltas excluding comments and tests, real gate output, and honest behavior claims.
- **Consult the Advisor:** At each step.

### 5. Rulings

Every entry is the final state of what's intended to become true; what's in the codebase changes to reflect it. `Ruling Log.md` holds the questions that produced each, the planning checkpoint's included.

#### 5.1 Vocabulary

- **Connection:** Any link to a page or heading, whichever syntax wrote it: `[[Page]]`, `[[#H]]`, `[x](Page)`, `[x](#H)`.
- **Weblink:** The code's prose name for any link to a URL; `'url'` is its kind tag in code. The docs call it a **link**.
- **`'wikiLink'`:** The token kind keeps its name.
- **The Two Cells:** A **MarkdownPM table cell** is a table inside a page body. A **property value cell** is a Link or Text value in a Table view, a Card, or the Panel. They are two different things and are never conflated.
- **Literal:** The code's word for a paste that lands as typed (`paste:literal`); "plain" stays the Paste As form whose label is Plain Text, the address alone.

#### 5.2 Reading and Code

- **One Reader:** Link syntax is read in one place, `Core/Connections`. The editor's drawing, its typing behavior, the index, and renames all go through it.
- **One Classifier:** Whether a whole link's text is a page or an address is answered by `readLinkText`. With the page index, a title the index resolves is that page under its own capitalization, an ambiguous one is refused, and a title the index has no page for falls to the address arm; without the index, one fixed tiebreak: a title-shaped target that isn't a valid address is a page. A Link value's draw, follow, and menu classify through `valueTarget`, the index-first chain every editor link resolves by. All four host readers (`goneEntry`, `parkLinks`, `namesGonePage`, `frontmatterMentions`) use the tiebreak, so a hand-written `[x](example.com)` value is an address everywhere; a spaceless dotted page title such as `v1.2` reads as an address there, a case Nathan conceded as unreachable in practice.
- **Code:** A link written inside code acts like code everywhere: the picker, Enter, slot cleanup, alias memory, and the Format menu. The Format menu reads the document's fence context: a fenced line reports no inline formats and its toggles do nothing.
- **Raw HTML:** Inside a raw-HTML block on a page, the picker, slot cleanup, and alias memory stand down through one predicate, `inRawHtml`, as Enter already does.

#### 5.3 Embeds

- **Tiles:** An embed forms a tile **only** when it stands alone on its own line in a body that mounts the tile field, meaning the page editor, and the claim is computed once, in `buildTiles`.
- **Everywhere Else:** `![[Page]]` is a literal `!` followed by the connection `[[Page]]`, and `![x](url)` is `!` followed by a weblink. Each draws, follows, glances, and offers its menu as any link does.
- **No Special Case:** Frontmatter is excluded inherently. Table cells and Text values never tile.
- **Lone Embeds That Are Links:** A lone embed that is a duplicate of an already-tiled page, a self-embed, a headed `![[P#H]]`, or an aliased `![[P|a]]` (a tile has nowhere to show an alias; a disclosed call, M11-06) is a link, not a tile. The cycle placeholder goes.
- **Matrix:** It stays out. The index's lone-line rule keeps every lone embed line as an `embed` relation, so a lone embed that draws as a link also stays out of the graph; a mid-line embed is an ordinary `body` relation. Nothing resolves on the host.
- **Creating One:** Insert ▸ Embed ▸ Internal Page writes `![[]]`, whose empty `[[` opens the ordinary picker's browse; the `![[` loop and the embed form go.

#### 5.4 Looks

- **One Treatment for Unresolved Links:** Every unresolved link looks the same whichever syntax wrote it, and a link to a page looks the same whichever syntax wrote it. A markdown link to an ambiguous title draws in the ambiguous tone. One `linkLook` decides both renderers' look.
- **Display Unresolved Links As Plain Syntax:** It applies everywhere: body, MarkdownPM table cells live and at rest, and Text values live and at rest. It doesn't restyle the `/` menu's query, which gets a class of its own.
- **Parity Through Shared Behavior:** A `§Heading` run draws at rest as it does live and follows when clicked, riding the resting renderer's shared follow rather than added lines; in a Text value it opens the holder page at that heading. It carries no token, so it gets no menu and no glance, at rest as in the body.
- **At Rest:** A resting Text value's heading links use its page's headings and Heading Link Style (F-062), and a link nested in bold or italic in a resting cell draws and acts as a link (X-12).

#### 5.5 Menus

- **Shared Rows:** Every link's menu is built by one builder from one model, in one order: the open rows (Preview, then New Tab or Open In Browser), then **Rename** and **Edit Title** (connection) or **Edit Link** (weblink), then Copy Link (plus Copy Path on a page) and **Format ▸** where it applies, then the closing rows. Rename edits the shown text, adding one if there's none; Edit Title / Edit Link edits what the link points to, selecting the title or address. A web-address value's Copy Link moves from beside the open rows to this order.
- **Labels:** No row label depends on an alias existing, and there is no "Add Title" anywhere. The second row's label is the only thing that differs for a weblink.
- **In Editors:** The body, MarkdownPM table cells live and at rest, and Text-value panes add **Format ▸** for weblinks and **Remove Link** and **Delete** for every link, connections included. Remove Link keeps the shown text. The applier focuses the editor after every edit, as the editor menu does.
- **`[x](Page)`:** It authors like `[[Page]]`.
- **Unresolved Links:** Phantom, ambiguous, and invalid links get no link menu; the right-click falls through to the editor menu where one exists. A held `[[#Heading]]` keeps a page menu wherever a page holds it.
- **Copy Labels:** "Preview" and "Page Title" stay as they are.
- **Menus Answer:** The link menu hands back what was picked, like every other menu in the app, so the create-ghost stays hidden while a Link value's menu is open (B-68).

#### 5.6 MarkdownPM Table Cells at Rest

- **Everything at Rest:** Every construct in an unfocused cell gets its right-click menu, and the right-click itself never focuses the cell. A link takes the link door; everything else takes the same `editor:menu` door a live cell asks through, with a `resting` field carrying the source selection, so main pops the native menu with Format ▸, Lists ▸, Insert Link, and the system rows Cut, Copy, Paste, Paste As, and Paste Without Formatting. Undo, Redo, and Select All stay out. Cut, Copy, and Paste are answered by the cell, since a native role acts on whatever has focus.
- **Writes Commit at Rest:** A chosen row that writes (Bold over a selection, Remove Link, Delete, Format, Paste…) commits through one guarded `commitAtRest` without placing the caret. Rows that need typing (Rename, Edit Title / Edit Link) enter the cell with the selection seated. A format row with nothing selected, and Format ▸ External Link over a selection (its address is empty), write their slot and enter the cell with the caret inside it.
- **One Paste Path:** The resting rows that paste run through the shared paste pipeline (`pastedCellText`), with a table-shaped clipboard still filling cells.
- **Read-Only:** A read-only resting cell (an embedded page at rest) offers no authoring rows (B-56). On an inert host (a glance, a page's history) a resting right-click on a non-link does nothing; the link door still answers.
- **Copy at Rest:** The menu's Copy copies the source slice (`[[Page|alias]]`, not `alias`); the ⌘C chord over a DOM selection copies the drawn text (§13).

#### 5.7 Property Value Cells (Link and Text)

- **Resting Right-Click:** At rest, a property value keeps its rows, built by the one builder: the open rows, Rename and Edit Title / Edit Link, Copy Link (and Copy Path), then Clear, and Remove where the surface hides values. The fallback cell menu keeps its Edit and Rename labels.
- **Column Format ▸:** Not added to Link cells; it belongs with the app-wide open item (§13).
- **Text Values:** Non-link content's menu is unchanged. The links inside get only what rides along through the shared builder. No authoring plumbing is added.
- **Active Surfaces:** A Text value's TextPane is a real editor with full parity, and needs no change beyond reading connections from the host.
- **Link Values Behave Like Every Link:** A page value renders through `TextCell` with the link menu declined, so it draws, follows, glances, and routes as every link does: Open Connections In Preview, window mode, Tab Open Behavior, phantom and ambiguous tones, `Alpha § Setup`, and the missing-heading mark. An address keeps the property's own look (Format, Underline, Color) and the shared gestures.
- **Clicks:** Clicking the text follows the link; clicking the padding edits the value. The same holds for page and address values; an ambiguous or invalid value's text edits, since nothing follows.
- **Aliases:** Link properties allow an alias; a pasted label is an alias too, and Rename to empty clears it.
- **Format on Values:** Hidden. The property's own Format (`link_display`, and the view column's look) determines a value's look (Q-17).
- **Committing a Link Value:** It's a page if a page has that title, with ambiguity refused explicitly; otherwise a weblink if valid, normalized to a scheme; otherwise refused. `[[#Heading]]` commits when the value has a holder page and is refused on a Space. Pages are stored as `[[…]]` (P-02). The commit runs through `readLinkText` and `retarget`, with the holder's index read at the gesture.
- **Rename and Delete:** A hand-written `[x](Page)` value is renamed (keeping its written syntax), stripped, parked, and restored like `[[Page]]`.
- **Panel Remove:** The Panel's value menu offers Remove, meaning what its row menu's Remove does: it clears this page's value and hides the row on this page. The schema and other pages are untouched.

#### 5.8 Paste, Paste As, Copy, and Retarget

- **One Retarget Rule:** Paste-into-link, the picker, and a Link value's Edit Title / Edit Link all change a link's target under one rule, written once in `retarget`; the picker's markdown-target arm keeps its own span edit and applies the same shown-text rule. Its rules:
  - **Target:** The link takes the new target.
  - **Shown Text:** The pasted link's alias if it has one; otherwise the link keeps its own, unless Remove Title On Link Change is on.
  - **Syntax:** The container's syntax is kept, except that a weblink pasted into `[[…]]` becomes `[…](url)`.
  - **No Shown Text:** When nothing supplies shown text for a weblink in an editor, it takes the Default Link Format, never an empty `[](url)`.
  - **Link Values:** The stored syntax follows the new target's kind, and no format label is written.
  - **Same Target:** Re-typing the same target keeps the alias.
  - **Carve-Out:** If one is ever wanted, it's the `keepTitle` argument at one call site.

| Existing Link | Clipboard | Result |
|---|---|---|
| `[[Page1]]` | `[](Page2)` | `[[Page2]]` |
| `[[Page1]]` | `[x](Page2)` | `[[Page2\|x]]` |
| `[[Page1\|Mine]]` | `[[Page2]]` | `[[Page2\|Mine]]`, or `[[Page2]]` with Remove Title On Link Change on |
| `[y](Page1)` | `[[Page2]]` | `[y](Page2)`, or `[Page2](Page2)` with Remove Title On Link Change on |
| `[[Page1]]` | `https://x.com` | `[x.com](https://x.com)` (Default Link Format) |

- **Paste Anywhere Inside a Link:** Pasting a link anywhere strictly inside a link's token retargets it, wherever the caret sits.
- **Paste As Inside a Link:** It retargets in the form you pick, under the same strict in-link test: Markdown Link or Connection sets the syntax, a link format sets the format, and Plain Text lands the address as text. (The Ruling Log's earlier "the container keeps its own syntax" is ⌘V's rule; the planner took "the form you pick" for a Paste As pick and put the conflict to Nathan on 10-10-2026.)
- **Literal Pastes:** Plain Text, Paste Without Formatting, and ⌘⇧V paste literally, inside a link included. Plain text pastes as text, and a written link (`[Docs](https://a.com)`, `[[T|a]]`) pasted at a caret lands as written; only a bare address takes the Default Link Format.
- **Remove Title On Link Change:** It governs every syntax and every retarget: paste, the picker (markdown links included), and a Link value's Edit Title / Edit Link. With it on (the default), Edit Link followed by pasting a URL drops the old label, so the site's own title can be written once it resolves; this is intentional. Its label stays; its hint is rewritten to say so.
- **Typing:** Typing a replacement isn't the app rewriting the link, so typing keeps the label.
- **Paste As Keeps Title and Heading:** `[[T#H]]`, Copy Link's own output, offers Connection and Markdown Link, and a bare `[[#H]]` or `[x](#H)` offers the same two.
- **Plain Text vs Paste Without Formatting:** Paste As ▸ Plain Text stays, since it's more literal than Paste Without Formatting. The two share one system.
- **Parity:** Pasting a link over several selected MarkdownPM table cells, and dropping an address into a page, format as a normal paste does, through the one pipeline.
- **Copy:** Paste As says **Embedded Link** for a lone webpage embed; the Embed ▸ row says **External Link** for the same thing.

#### 5.9 The `[[` Picker

- **Openers:** Typing `[[` or `[label](` opens the picker whether or not Pair Brackets is on (`![[` is `!` plus `[[`); the unclosed input is read as the link it would be once closed.
  - Enter or a pick completes the link, writes the closer when it isn't written, and places the caret outside the syntax.
  - Dismissing it leaves the typed text.
  - With Pair Brackets on, `[[` opens the picker on the brackets; an empty `[[` browses alphabetically.
- **The Query:** It lives in editor state (`acQuery`), with its `§` arm and its dismissal, so the pane measures only when the query changes.
- **Heading Lists:** The picker's heading list and the missing-heading mark both read the index, which stores each heading's text and level. The lag is unreachable in practice.
- **`##` → `§`:** It opens the heading list, as typing `§` does.
- **Alias List:** It slides in only when a pick opened that slot.
- **Picks:** The link form commits through `retarget`; a pick in the title half of `[[Page#Heading` replaces the target and drops the heading, which belongs to the target. ArrowRight and the chevron share one rule: a highlighted page row opens its headings in both link forms, query or no query.

#### 5.10 Opening and Titles

- **One Open Route:** `ConnectionsApi.open(page, heading?, newTab?)` is the one way a connection opens a page.
- **Non-Web Addresses:** `mailto:` and other non-web addresses go to the system even with Open Links In Pommora on. The in-app row hides for them, and Page Title isn't offered for them.
- **Failed Title Fetches:** A failed fetch stops waiting; `resolveLinkTitle` answers with a promise.
- **Pending Titles:** One writer, `writeLinkAt`, announces every pending title and settles it when the promise answers; the subscription sweep goes.
  - Resting MarkdownPM table cells, and cells with no editor, await the title and commit once under a whole-text guard.
  - A live cell or TextPane closing with a swap still pending forwards it through `forwardTitles`. This fixes F-043 and B-158.
  - **What the User Sees:** At rest, Page Title updates once when the title arrives; in a live editor, it writes the short form and then swaps.

#### 5.11 Rename, Index, and Seams

- **F-094:** Taken now: connections become `EditorHost.connections()`, read live through the host facet, and the hand-threaded getter goes from every signature.
- **The Heading Index:** It stores each heading's text and level; the generation bump reseeds it, nothing persists, and `Sync/` doesn't read it. The session derives the keys once, and `headingsOf` answers with both, so the picker, the missing-heading mark, and `§` runs read one source. The picker's warm-or-fetched body goes.
- **Rename:** Span edits over the walk; Link keys ride the body rewrite with F-035's alias drop.

#### 5.12 Out of Scope and Unchanged

- How Text values sort and filter.
- The Footnote Paste As row.
- Footnote-marker menus in cells: neither live nor resting cells get one.
- The column's Format ▸ on a Link cell's right-click (§13).

### 6. Design (What Owns What)

What the cleanup makes true, concern by concern, as the plan commits to it. The synthesis section in the last column holds each row's evidence and reasons.

| Concern                            | After the Cleanup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Goes                                                                                                                                                                                                                                                                                                              | Plan          | Synthesis        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------- |
| **Reading**                        | One walk, `linkOccurrences(text, inCode)` in `Core/Connections/connections.ts`, reads every connection and markdown link, embeds included as connections, with empty slots kept and one code rule, `codeTouches`. The tokenizer maps it to a `Token` union whose `wikiLink` arm always carries `resolveRange` and `heading`; `linksIn` yields it with spans. The caret readers are `connectionAt(scan, at)` and `openConnectionAt(scan, at)` in `Input/edits.ts`, the second reading unclosed input as if its `]]` were written. | `linkAt`, `aliasSpanAt`, `emptyAliasPipeAt`, `emptyHeadingHashAt`, `linkInCode`, `isInsideWikilink`, the `'embed'` token kind, `pageEmbedPattern`, `embedClaims.ts`                                                                                                                                               | 1-1, 1-2, 1-4 | §3.1, §3.3, §3.4 |
| **Code Gates Left**                | A caret-position `inCodeAt` for unclosed openers remains. The Format menu (`readFormatState`, `toggleInline`) reads the document scan, so a fenced line reports no inline formats and its toggles do nothing; `editFor` moves to `Input/format.ts` and is exported.                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                                                                                                                                 | 1-3           | §3.4             |
| **Grammar and Writers**            | One markdown grammar, `MD_LINK` rebuilt from the anchored tolerant regex. `connectionText` is the only wikilink spelling, beside `markdownPageLink(title, heading?, label?)`, `serializeLink(url, label?)`, and `composeWebpageEmbedLine`. One `expressibleInLink` check serves titles and headings; the name rule refuses a title the syntax can't hold.                                                                                                                                                                        | The picker's and `webpageInsertAtCaret`'s hand spellings; `ConnectionParts`, `LinkValue`, `parseLink`, `expressibleHeading`, `embeddableTitle`                                                                                                                                                                    | 2-1, 2-3      | §3.1, §3.2       |
| **Value and Clipboard Reading**    | One `readLinkText(text, resolve?)` returns a `LinkTarget` carrying its written syntax: a page when the index resolves the title, or, without a resolver, when the title-shaped target isn't a valid address; else a weblink if valid (normalized); else null. A bare `#Heading` in either syntax is a page with an empty title that the caller's resolver answers with the holder. The four host readers read it, and `gonePageEntry` hands the three restore paths the entry they note and park.                                                                                                                                                                                         | `readLink`, `parsePastedLink`, `pasteAsTarget`, `wholeWikiLink`, `PasteAsTarget`, `ResolveTitle`, `linkAlias`, `urlClickTarget`                                                                                                                                                                                   | 2-1, 2-2      | §3.1, §3.16      |
| **Retarget**                       | A pure `retarget(syntax, container, next, keepTitle, into?)` in `linkValue.ts` serves paste inside a link, the picker's link form, and Link value commits; `LinkPaste` carries `awaits` for a pending title.                                                                                                                                                                                                                                                                                                                     | —                                                                                                                                                                                                                                                                                                                 | 2-4           | §3.11            |
| **Address Gate**                   | One `isWebAddress` in `Core/Paths/urlPath.ts` replaces four spellings.                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `webGuests.isWebUrl` and the copies                                                                                                                                                                                                                                                                               | 2-5           | §3.11            |
| **Seams**                          | `EditorHost.connections()` read live through the facet; `linkPointer` and `citationPointer` become constants; `tableConnections` folds in; the `connections` prop leaves every mount; `inRawHtml(state, at, scope)` is the one raw-HTML predicate.                                                                                                                                                                                                                                                                               | The getter through 22 signatures, `embedHost.getConn`, the `tableConnections` facet                                                                                                                                                                                                                               | 3-1           | §3.17            |
| **Heading Index**                  | `PageHeading { text; level }` in `Core/Platform/stores.ts`; the `headings` table carries text, level, and ordinal; `INDEX_GENERATION` 12; `PageHeadings { keys; outline }` in the session, keys derived once on reply.                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                 | 3-2           | §3.12            |
| **The Bundle**                     | `ConnectionsApi.open(page, heading?, newTab?)` replaces three routes; `headingsOf` and `location` are required.                                                                                                                                                                                                                                                                                                                                                                                                                  | `open`/`bypass`/`openPage`                                                                                                                                                                                                                                                                                        | 3-3           | §3.13, §3.17     |
| **Titles**                         | `resolveLinkTitle(url)` returns a promise, deduplicated in flight; `useLinkTitle(url, wants)` in `Core/Web/` serves `LinkCell` and `WebTile`; `writeLinkAt` and `forwardTitles` in `pendingTitle.ts` announce and settle every pending title.                                                                                                                                                                                                                                                                                    | `sweepOnTitles`, `linkTitles.subscribe`, the duplicate hook                                                                                                                                                                                                                                                       | 3-4, 5-2, 5-3 | §3.13            |
| **Drawing**                        | One `linkLook` and `linkClass` in `connectionsApi.ts` decide both renderers' look; the unresolved classes merge into `md-connection-phantom` and `md-phantom-syntax`; `md-unresolved-fixed` goes so the root plain-syntax rule reaches every surface; the `/` menu wears `md-block-query`. The resting renderer nests spans recursively, marks every span with `data-src` and links with `data-link`, and draws `§` runs; a Text value draws against its holder's outline.                                                       | `wikiLinkView`, `WikiLinkView`, `linkStatus`, `mdLinkClass`, `MD_LINK_CLASS`, `md-link-invalid`, `md-unresolved-syntax`, `md-unresolved-fixed`, `LINK_SELECTOR`, `linkSpanAt`                                                                                                                                     | 4-1 to 4-4    | §3.6, §3.15      |
| **Gestures and Targets**           | `wholeLinkToken` is the one reader of a text that is exactly one link; `valueTarget(api, raw, holder)` in `Core/Properties/Cells/valueTarget.ts` resolves a value through it; `RestingHit` is the one hit shape; `dwellTarget` reads `isHttpLink`.                                                                                                                                                                                                                                                                               | `resolveConnection`, `linkResolve.ts`, the resting re-conversions                                                                                                                                                                                                                                                 | 4-5, 8-3      | §3.5, §3.7       |
| **Opening**                        | `openWebLink` normalizes and gates its in-app arm on `isHttpLink`; Page Title is offered only for http(s).                                                                                                                                                                                                                                                                                                                                                                                                                       | —                                                                                                                                                                                                                                                                                                                 | 5-1           | §3.13            |
| **Menus**                          | `showConnectionMenu(target)` returns a promise of the picked `LinkAction`. One `LinkMenuContext` model with one join; one builder `linkMenuTarget(target, editable, value?)`; one pure `linkEdit(text, tk, action, titles)` and one live `applyLinkAction` in `linkEdit.ts`; the body, the resting cell's link door, the Text value, and the three value parents (through `valueMenuTarget`) all read them; the resting cell's `Seat` and guarded `commitAtRest` land here, ahead of the link door, and a resting write awaits its title through `settledLinkText` and commits once. | `ConnMenuContext`, `ConnSurface`, `ConnCellApply`, `isConnCellAction`, `hasAlias`, `surface`, `LinkCellAction`, `linkValueMenuTarget`, `ConnMenuTarget`, `tokenMenuTarget`, `linkFormat.ts`, `wikiAuthorTarget`, `linkActionText`, `menuTarget`, `still`, `caretCoords`/`initialSelect`/`sweepFrom`, `onSelect` | 6-1 to 6-6 | §3.8, §3.9 |
| **Paste**                          | `PasteMode = PasteAsForm \| 'auto' \| 'inverse' \| 'literal'`; `pasteAsWrite(target, how, over)` in `Actions/pasteAsMenu.ts` is the one form decision; `pasteEdit(scan, sel, text, how, opts)` in `pasteLink.ts` is the one pure paste decision (code, the container retarget in the container's or the picked form's syntax, the seat, the form), read by `paste(view, text, how)` for ⌘V, ⌘⇧V, Paste As, and drop, and by `pastedCellText` for the resting cell and the rectangle, which await the title and commit once. | 'auto' \| 'inverse' \| 'literal'`; `pasteAsWrite(target, how, over)` in `Actions/pasteAsMenu.ts` is the one form decision; `paste(view, text, how)` in `pasteLink.ts` is the one entry for ⌘V, ⌘⇧V, Paste As, rectangle paste, and drop, with `linkContainerAt` strict inside the token; `pastedCellText` serves cells with no editor.                                                                                                                                                                | `pasteDecision.ts`, `linkFor`, `literalAt`, `writeLink`, `pasteAs`, `PASTE_PLAIN_ACTION`                                                                                                                                                                                                                          | 7-1 to 7-3    | §3.11            |
| **Link Values**                    | A page value renders through `TextCell` with the menu declined; the URL half keeps the property's look and the shared gestures; `valueClickIntent` joins `'link'` to `'text'`; the commit is `linkValueFromEdit(raw, current, resolve, keepTitle)` through `retarget('wiki', …)`, with `linkResolver(api, holder)` built in `PropertyValueInput`.                                                                                                                                                                                | `ConnectionCell`, `.cell-connection`, the `open` intent and its handlers                                                                                                                                                                                                                                          | 8-1 to 8-4    | §3.10            |
| **MarkdownPM Table Cells at Rest** | A right-press claimed on every press; `cellOffsetAt` maps a DOM point to the source through `data-src`, `data-at`, and `data-base`; the resting `editor:menu` ask carries `resting: { selection }`; main's `restingEditItems` answers Cut, Copy, and Paste with shown accelerators; `restingAction` dispatches through `editFor` and `insertLinkEdit` and commits through Task 6-4's `commitAtRest`, entering the cell only for a format or highlight row that leaves a slot; `pasteAtRest` runs through `pastedCellText` and `onFill`. | the right-click focus fallback, `insertLinkOverSelection` | 9-1 to 9-3 | §3.9 |
| **Picker**                         | `autocompleteQuery` reads closed and unclosed input through `connectionAt ?? openConnectionAt` and `markdownDestinationAt` over the line plus `)`, carrying `closed`; `closerOf` writes the closer; the `acQuery` `StateField` holds the query, the `§` arm, and the dismissal; the link form commits through `retarget`; the markdown arms honor the setting; one `behind`; heading rows read `headingsOf(path).outline` or the live outline; pane props are required.                                                          | `isInsideWikilink`, the `![[` loop and embed form, `allowEmbeds`, the pool filter, `embeddable`, `formSyntax`, `connectionInsert`, `AcQuery`, `sectionArmAfter`, `armed`/`measured`/`formRef`, `viaChevron`/`cameFrom`, `fetched`/`loading`, `headingTarget.ts`, `warmBody`/`fetchBody`, the fake outline, `NONE` | 10-1 to 10-4  | §3.12            |
| **Embeds**                         | A tile forms only from a lone embed in the page editor, claimed once in `buildTiles`; every other `![[P]]` reads as `!` plus a connection; the lone-line rule in the index keeps `embed` relations.                                                                                                                                                                                                                                                                                                                              | `embedClaims.ts`, the cycle stub, `build`'s claim filter                                                                                                                                                                                                                                                          | 1-1           | §3.14            |
| **Section Runs**                   | `sectionRunsIn` excludes links through the walk, and runs draw and follow at rest.                                                                                                                                                                                                                                                                                                                                                                                                                                               | The regex re-match                                                                                                                                                                                                                                                                                                | 1-1, 4-3, 4-4 | §3.15            |
| **Rename and Index**               | Span edits over the walk; Link keys ride the body rewrite with F-035's alias drop.                                                                                                                                                                                                                                                                                                                                                                                                                                               | `rewrite.ts`'s chained passes, `groupsOf`/`offsetOf`/`escapedPipe`, `rewriteFrontmatterConnections`                                                                                                                                                                                                               | 1-1           | §3.16            |
| **Names**                          | Renames ride the lines a shape change rewrites: `'external'`/`'site'` → `'url'`, `Token.fragment` → `heading`, `ConnMenuTarget` → `LinkMenuTarget`, `PASTE_PLAIN_ACTION` → `PASTE_LITERAL_ACTION`. The three that don't: `LinkFormat` → `LinkWrapKind`, `escapeAlias`/`unescapeAlias` → `escapeLabel`/`unescapeLabel`, Embed ▸ "Webpage" → "External Link". Persisted keys keep their names.                                                                                                                                     | —                                                                                                                                                                                                                                                                                                                 | 11-1          | §3.18            |
| **Documentation**                  | Every sentence the synthesis's *Would Go False* lists is rewritten as the current truth; the audit's W21 and F-094 statuses change.                                                                                                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                                                                                                                                 | 11-2          | —                |

**Placement Calls:** Resolution stays in the editor's `connectionsApi.ts` (it imports UIX; B-185); `headingHash.ts`, the resting renderer (`cellStatic.tsx`), and the paste writers stay where they are; the merged edit file keeps the name `linkEdit.ts`. Each move would delete nothing. The `acQuery` field is defined per mount because the raw-HTML stand-down reads the scope and no facet carries it.

### 7. The Proving Prototypes

Both scouts built on a scratch worktree reset to `42a18f4a5` (a worktree created from `main` is the test-stripped public branch; `git reset --hard 42a18f4a5` and `npm ci` inside it). Nothing was committed, and each worktree was removed after its diff was saved.

- **Foundation** (`proving/report.md`, `proving/foundation.diff`, 37 files): the one walk with `codeTouches`, `connectionAt`, `LinkHit` spans, the tokenizer mapping and the settled token shape, embeds as connections with the claim only in `buildTiles` (E-11's option proven in `embedSuppression.test.tsx`), rename as span edits with the `names()` rule, Link keys riding the body rewrite, F-035's alias drop. Measured −114 production TS and −5 CSS; gates green. Task 1-1 applies it with `git apply --3way`; Tasks 1-2 to 1-4 finish what it left (the token union, the Format menu's fence read, the unclosed reader); Task 2-2 moves the four host readers.
- **Resting Cell** (`proving/resting-cell.diff`, +305/−106, about +170 real; gates green at 524 files / 7,561 tests): the `Seat` union, the right-press claim, the pointer-to-offset mapper, the resting `editor:menu` ask with `resting: { selection }`, main's resting branch, `commitAtRest`, `restingAction`, `insertLinkEdit`, and the system rows. Phase 9 is written from it with five corrections: the mapper reads the `data-src` spans Phase 4 draws (the scout added its own attributes), a point bypasses the selection-edge rule, Paste and Paste As run through Phase 7's pipeline rather than the scout's own formatting, and Format ▸ External Link over a selection enters the cell. Its report is in the transcript, not a file.

### 8. Evidence Index

Paths are relative to `.claude/Planning/MarkdownPM Links/`.

| File                                                                        | Holds                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `../MarkdownPM Links — Implementation Plan.md`                              | The plan: eleven phases, every AFTER, *§Concepts*, *§Reconciliation*, *§Open Items*                                                                                                                                                                                                                                   |
| `synthesis.md`                                                              | The code-level account, by rule: the current shape, the defects, the design and its reasons, the traps, and what goes false. Every §6 row's detail.                                                                                                                                                                   |
| `Ruling Log.md`                                                             | Every question put to Nathan, with his answer; the planning checkpoint's at the end                                                                                                                                                                                                                                   |
| `proving/report.md`, `proving/foundation.diff`, `proving/resting-cell.diff` | The prototypes (§7)                                                                                                                                                                                                                                                                                                   |
| `brief.md`, `scouts/`, `verified/`, `probe*/`                               | The evidence trail behind the synthesis: the scout brief, twelve scout reports, three verifier reports with their probe runs, and the probe scripts (`npx vite-node`). A trailing ID in the synthesis, such as (B-35) or (E-23), finds its source here; where a report and the synthesis differ, the synthesis holds. |

**Repository Sources:**
- `.claude/Planning/Pommora Codebase Audit.md`: W6, W21, and the link findings F-035, F-041, F-042, F-043, F-054, F-062, F-094, F-114.
- `.claude/Planning/Link Gestures — Implementation Plan.md`: the baseline's own plan.
- `.claude/Features/MarkdownPM.md`, `ConnectionsPM.md`, `PropertiesPM.md`, `ConfigurationPM.md`, `WebviewPM.md`, and `.claude/Guidelines/Editor-Internals.md`: the plan's *§Reconciliation* names each sentence that changes and the task that changes it.
- `.claude/Guidelines/Development-Environment.md`: launching, CDP, toolchain pins, and commit mechanics; required before driving the app.

### 9. Delta

The plan's AFTER blocks show additions in full and deletions as collapsed one-liners or prose, so the plan reads greener than it is. Two ledgers were taken from the same text, one by the planner (every collapsed deletion expanded to its baseline size, prose deletions counted from the tree) and one by the simplification reviewer (whole deleted files counted, measured diffs by production lines alone); they agreed on the measured phases and disagreed on how much of a rewritten function survives. The figures below are their reconciliation, the measured prototypes substituted for their tasks and the simplification fold's own removals (about −20) applied. It's an estimate from the plan's text; closeout reports the measured figure in two numbers: the resting cell is Phase 9, Task 6-4, the resting arms of Task 6-5, and the `data-src`/`data-at`/`data-base` attributes of Task 4-3; the cleanup is everything else.

| Phase | Net | Where the weight is |
|---|---|---|
| 1 Reading Foundation | about −95 | the prototype's measured −117 production lines; the token union costs +25 |
| 2 Values and Writers | about 0 | `retarget` +22 against the readers it removes |
| 3 Seams | about −30 | F-094 typed at −50 (audit); the heading index +20 |
| 4 Looks | about +35 | the recursive resting renderer with `data-src` and `§` runs, `valueTarget` and `RestingHit` |
| 5 Opening and Titles | about +20 | `writeLinkAt`, `settledLinkText`, and the close-time forwards (F-043, B-158) |
| 6 Menus | about −125 | the one model, builder, and edit; `linkFormat.ts` (86 lines) and the callback menu go; the seat and `commitAtRest` are a transfer from Phase 9 |
| 7 Paste | about +5 | `paste()` and `pastedCellText` against `pasteDecision.ts` (47 lines) and the writers; rectangle paste and drop parity +20 |
| 8 Link Values | about −30 | `ConnectionCell` and its CSS go |
| 9 Cells at Rest | about +160 | the prototype's measured +189 less the paste rows that now ride Phase 7's pipeline; ruled additive (§5.6) |
| 10 Picker | about −45 | `headingTarget.ts`, the `![[` loop, and the React state go; the `acQuery` field costs about +20 net |
| 11 Names and Docs | 0 | |
| **Cleanup (1–8, 10, 11)** | **about −280** | |
| **Bundle** | **about −120** | |

The mandate's −200 to −400 is the philosophy. The resting cell ships inside this bundle by Nathan's call, so the bundle's single figure sits under that range while the cleanup's own figure sits inside it; the report gives both.

### 10. Phase Order

Each phase is the largest single-run implementation one agent can carry; the order avoids transitional code and rewriting the same lines twice.

1. **Reading Foundation** — the prototype applied, the token union, the Format menu's fence read, the unclosed reader. Everything else reads these.
2. **Values, Writers, and the Clipboard Reader** — `readLinkText`, the four host readers together, the writers and `expressibleInLink`, `retarget`, `isWebAddress`.
3. **Seams** — F-094, the heading index, the bundle's shape, the title promise. Before the menus and the resting cell read them.
4. **Looks and Resolution** — `linkLook`, plain syntax everywhere, the nested resting renderer with `§` runs, the Text value against its page, `valueTarget` and `RestingHit`.
5. **Opening and Titles** — the http(s) gates, `useLinkTitle`, `writeLinkAt` and `forwardTitles`.
6. **Menus and Actions** — the answering menu, one builder, `linkEdit` and the applier; the resting cell's seat and guarded commit, which the link door reads; the body, the resting link door, the Text value, and the three value parents rewired in one phase.
7. **Paste** — the one pipeline, paste inside a link, rectangle paste and drop. Before the resting cell's paste rows.
8. **Link Values** — rendering through the shared stack, clicks, the commit through `readLinkText` and `retarget`, Panel Remove.
9. **MarkdownPM Table Cells at Rest** — the mapper and the resting ask, commit at rest, the system rows.
10. **The Picker** — the opener rule with the embed form's end (the `![[` loop goes here, so the opener rule lands with it; E-31), the query as editor state, commit through `retarget`, heading rows from the index.
11. **Names and Documentation** — the three renames, the Feature docs, the guideline, the audit.

Review checkpoints follow Phases 1 through 10. Nathan's hand-checks are in Phase 4 (link looks across the body, cells, and Text values), Phase 8 (Link values in tables and cards), and Phase 9 (resting-cell menus).

### 11. Live Checks

Each is written into the VERIFY of the task that proves it, driven on `~/Test` per `Development-Environment.md` and restored afterward.

- **Tile Glyph (E-11):** Task 1-1.
- **Non-Web and Invalid Addresses:** Task 5-1 (`mailto:` to the system, `[x](example.com)` in-app) and Task 8-2 (an invalid value's text edits).
- **Link Value Layout:** Task 8-1 (truncation and ellipsis in a Table, a Card, and the Panel).
- **Create-Ghost (B-68):** Task 6-6.
- **Read-Only Embedded Pages (B-56):** Task 9-1.
- **System Rows at Rest, Two Doors at Rest:** Task 9-1.
- **Titles (F-043, B-158):** Task 5-3 and Task 6-5.
- **Raw HTML:** Task 10-2.
- **Opener Rule With Pair Brackets On and Off:** Task 10-1.

### 12. Settled at the Checkpoints (Not for Re-Litigation)

Reviewers note disagreement with these rather than raising it as a finding. Each is in §5 as a rule; this is the list, with the reason, so the plan's choices read as decided.

- **Value-menu row order moves** to the one model's order (Nathan: accept the move).
- **No link menu for unresolved links;** a held `[[#Heading]]` keeps a page menu (Nathan: the planner's choice; a phantom's menu would hold only Copy Link and carrying it means a third arm in the model and the target type).
- **Column Format ▸ on Link cells is left out** (Nathan: the open item).
- **A format row with nothing selected, and Format ▸ External Link over a selection, enter the cell** (Nathan: formatting with nothing selected opens the typing; the empty address is the same slot).
- **The applier focuses after every edit** (Nathan: yes).
- **`§` runs draw and follow at rest** (Nathan: same logic as heading links at rest).
- **Paste As "Embedded Link"; Embed ▸ "External Link"** (Nathan's words).
- **Lone embed lines keep the `embed` relation through the index's lone-line rule;** the Matrix stays out; nothing resolves on the host (Nathan: ride the lone-line logic).
- **A pick in `[[Page#Heading`'s title drops the heading** (Nathan: keep).
- **One resolver-free tiebreak for all four host readers;** a spaceless dotted title reads as an address there (Nathan: unreachable in practice; make the coherent choice). Nathan's premise that page titles can't hold a dot is wrong (`nameError` forbids a dot only in folder names), which was flagged at checkpoint 2; the ruling stands on the case's rarity, not its impossibility.
- **"literal"** is the code word for leave-as-typed.
- **The Format menu inside a code block** is gated on the fence, not a threaded mask.
- **The heading index stores text and level;** `headingTarget.ts` and the body fetch go.
- **`useLinkTitle` lives in `Core/Web/`.**
- **Paste As inside a link retargets** under the same strict in-link test ⌘V uses; no new channel field.
- **A resting commit of identical text is a no-op** at `commitAtRest`.
- **ArrowRight and the chevron share one rule.**
- **No placement-only moves** (§6, *Placement Calls*).
- **`ParsedLink` doesn't exist;** `LinkTarget` carries `syntax`, so `readLinkText` is the one reader.
- **Edit Title selects the title** (today it seats a bare caret after it), so Edit Title and Edit Link behave the same way; a small visible change the design calls for.
- **The resting cell is additive by design** (Nathan's ruling); its mapper is new machinery with no existing piece to reuse, and it earns itself by being written once for links, format, the checkbox, and the system rows.
- **A `§` run gets no menu and no glance at rest** (planner's call after the simplification review): the body's run carries no token and offers neither; a resting menu whose Rename and Edit Title couldn't apply would be a dead row.
- **Phase 9 ships inside this bundle,** the delta reported in two numbers (Nathan: phase 9 stays).
- **`PasteMode`** is the name of a paste's mode: a Paste As form, `auto`, `inverse`, or `literal` (Nathan's pick over `PasteHow`).
- **A written link pasted at a caret lands as written;** only a bare address takes the Default Link Format (the adversarial review's finding; baseline behavior kept).
- **A Link value classifies once, through `valueTarget`** (index first, as every editor link); `readLinkText` serves only its alias read and display text.
- **A resting write that awaits a title commits once** (§5.10): the cell keeps its old text until the title answers or fails, then commits under the whole-text guard; no short-form-then-swap at rest.

### 13. Open Items (The Plan's *§Open Items*)

- **Column Format on Cell Right-Clicks:** Whether every cell right-click should offer its column's Format, app-wide. Number, Select, and Date cells do today.
- **Word Count (M11-08):** `subfieldStats.ts`'s word count zeroes every lone `![[…]]` line, including lone embeds that draw as links. It belongs to the audit's deferred counter rework.
- **A Page Body Closing With a Title Pending:** a cell and a TextPane forward the swap on close; the page body has no close-time commit path, so a tab closed before the title answers keeps the short form, as today.
- **Deferred Audit Findings:** F-093, F-095, and F-097 stay deferred; F-094 is taken. F-093 and F-095 rewrite the same editor mounts F-094 does (audit W21), so those mounts get rewritten again when they land.
- **⌘C over a DOM selection in a resting cell** copies the drawn text (an alias, not its syntax); the resting menu's Copy copies the source. Matching the chord means a key handler on the resting cell.
- **A Text value's pane and a rename in another window:** With connections read from the host, an open TextPane reads the index as of its last render, so a rename made in another window while the pane is open can trail by one render (the audit's F-094 note).

### 14. Traps

Things that look removable or simple but aren't, and what the planning session learned the hard way. Each with evidence is in the synthesis section that owns it, or named here.

- **Ambiguity Refusal:** The Link value commit refuses `status !== 'resolved'` explicitly once `resolveConnection` goes (B-153, T-06).
- **The Four Host Readers:** They move in one step, or a value is stripped but never parked (T-01). `spend.ts` keeps its `landed === was` guard when it maps stored values through the body rewrite (T-02).
- **Main Builds the Paste As Rows:** Main reads the clipboard to build them; `askEditorMenu` parks until Chromium's `context-menu` (A-117). A resting cell reads as `isEditable: false` there (the static cell sits in a `contentEditable="false"` widget), which is why main's early return consults `req.resting`.
- **`input.paste` Tags:** Every paste write keeps the `input.paste` tag, since the cell's and the table guard's paste filters key on it (A-119).
- **Pending-Title Matching:** The exact-text match survives.
- **Cell Writes Escape `|`:** A title or alias holding `|` written into a MarkdownPM table cell goes through `cellToSource`, or the row splits (R-11, B-176, E-35).
- **`TextCell` Decline:** Link values need a declined link menu on `TextCell`, or its read-only menu pre-empts the parent's value menu (T-04).
- **Pasted URLs Need a Scheme:** `pastedUrl`'s scheme rule stays for bare addresses, or `3.14` pasted into a link retargets it (E-36).
- **Paste Inside a Link Is Strict:** It reads the container strictly inside the token, since `linkTokenAt` is inclusive at the resting seat (E-25).
- **One Tile per Page per Document:** First-per-page stays, so two editors never write one page (E-32).
- **Caret Paths Can't Use the Draw:** `drawnTokens` can't serve the caret paths (B-163), and a caret/draw chunk memo can't be shared (B-114).
- **Load-Bearing Pieces:** The lazy alphabetical sort in `pageIndex.ts` (A-130) and `linkEntry`'s YAML unwrap (A-50) both stay.
- **Persisted Keys:** `link_display` and the settings keys can't be renamed for vocabulary (B-184).
- **What Can't Move to `Core/Connections`:** `ConnectionsApi` (it imports UIX), `LinkMenuTarget`, and `tokenTarget` (B-185…B-187).
- **Right-Click Doors at Rest:** The resting editor door needs `stopPropagation` without `preventDefault`, since main pops the native menu only when the renderer leaves the event defaulted (R-20, Q-37); the link door prevents it. At rest, role rows act on whatever element has focus, so Cut, Copy, and Paste are renderer-resolved (R-19), and renderer-resolved rows lose their native chord hints unless given an `accelerator` with `registerAccelerator: false`.
- **`targetTitle` Is Non-Null for Any Schemeless Dotted String:** `example.com` and `Notes.md` are title-shaped to the grammar, so a reader with a resolver must let a title the index has no page for fall to the address arm, or every schemeless address is refused.
- **The Empty Opener:** The grammar refuses an empty page, so `openConnectionAt` special-cases a bare `[[` as the empty opener (`{ full: [rel-2, rel], title: [rel, rel] }`); `x ![[Pro` reads only once the baseline's `(?<!!)` is gone.
- **`editFor`'s Home:** It lives in `Input/format.ts`, not `Menus/menu.ts`, because `cellStatic.tsx` reads it and `Menus/menu.ts` would make a cycle.
- **`TableModel`:** `header: string[]` and `rows: string[][]`; a cell's text is `row === 0 ? header[col] : rows[row - 1][col]`, through `cellToDisplay`.
- **Identical-Text Commits:** A resting commit of identical text records an empty undo step unless `commitAtRest` guards it (M10-04).
- **A Raw `![[]]`:** An inserted `![[]]` shows raw while its picker is open (M11-02). An embed commit can open the alias slot, and `leaveSlot` collapses it (M11-04).
- **Worktrees:** A worktree created from `main` is the test-stripped public branch; reset it to `42a18f4a5` and `npm ci`. Other `c6c353d8*` worktrees under `.claude/worktrees/` belong to another session; leave them.
- **Hooks:** A Bash command containing both "git" and Nathan's name is blocked (`no-name-mentions.mjs`); keep names out of commit text. `no-wrapped-comments` rejects wrapped comment lines.
- **Gates in a Worktree:** `npm run typecheck`, `npm run test`, and `npx biome check Core UIX Desktop Sync`.
