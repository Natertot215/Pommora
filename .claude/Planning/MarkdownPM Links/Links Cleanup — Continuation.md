## Links Cleanup — Continuation

```markdown
You're picking up the Links Cleanup for Project Pommora (`~/The Studio/Projects/Project Pommora`), and your job is to plan it. A previous session investigated every link surface with scouts and verifiers, settled the design with Nathan over several rounds of questions, and had the reading foundation prototyped on a scratch copy of the code. Nothing has been implemented, and the code is unchanged since `42a18f4a5`. What that session decided lives in this document, and you're reading its top: `.claude/Planning/MarkdownPM Links/Links Cleanup — Continuation.md`. What it learned about the code, with the reasons behind the design, lives in `synthesis.md` beside it, and the scout and verifier reports in that folder are the evidence trail behind the synthesis. The full conversation is the transcript at `~/.claude/projects/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/cc8fe384-19e9-4334-bcd1-cd76e245f1be.jsonl`, if you ever need Nathan's exact words. The document already states every ruling as it stands now, so you shouldn't need to reconstruct anything from the transcript.

The work is a complete cleanup of how Pommora and its MarkdownPM editor handle links: reading, drawing, clicking, menus, typing, pasting, copying, opening, titles, embeds, renames, and the Link property. The goal is one source of truth per rule, no odd-ones-out, no confusing names, and no machinery that exists only because an earlier shape made it look necessary. The codebase should come out smaller and plainer; Nathan's line target is roughly −200 to −400 production lines, treated as a philosophy rather than a number to chase. Nathan has ruled on every product question the investigation could put to him, and the questions that remain for you are in §12. He is not technical: explain in plain terms, and don't assume he knows how the code works.

Read this whole document, then the synthesis, before doing anything. §5 holds the rulings: what the cleanup makes true. §6 is the design that serves them, each row pointing to the synthesis section that holds its detail and reasons. §7 describes the proven foundation and its diff. §10 gives dependencies, §11 the live checks still owed, §12 the questions for your checkpoint, and §14 the traps.

Then work in this order, as Nathan asked. **Search:** read the code behind every load-bearing part of §6 yourself, starting with the prototype diff, and don't relay the reports. **Assess:** decide what the evidence and rulings leave to you, the phase order, and whether the prototype's shape holds. **Explain:** before any plan line is written, bring Nathan the approach you've chosen and a short version of the plan in plain language, together with §12's questions and any new ambiguity you find. Establish that you both understand the work the same way, and fold in his adjustments. Only then plan, using the `writing-plans-v3` skill with this effort's adaptations (§4). Once the plan is drafted, walk Nathan through the approach again before any reviewer sees it. After that, the review chain in §4.3 runs.

One working practice Nathan asked to be passed on explicitly. When an answer can be read two ways, contradicts an earlier ruling, or leaves a case unnamed, stop and ask before building on it. Lay out the readings side by side (a small table of concrete outcomes works best) and give your recommendation. It can feel like pushback or like slowing down, but he values it; it's what kept these rulings coherent. Consult the advisor at each step if you have one, and load `agent-orchestration` before dispatching any agent.
```

*The block above is the handoff prompt. Nathan removes it once it's been given.*

---

### 1. Where Things Stand

- **Repository:** `~/The Studio/Projects/Project Pommora`, branch `active`. Production code is unchanged since `42a18f4a5`, which is the Link Gestures commit `75c3bcb9c` plus its docs reconcile; later commits touch docs only. Nothing from this effort is implemented.
- **Baseline Before This Effort:** Link Gestures already landed, giving one pointer handler (`linkPointer`) for both link kinds, a `drawnLinkAt` hit test, one menu rule (`tokenMenuTarget`), `literalAt`, `linkAddress`, `mdLinkClass`, and `linkInCode`. Audit findings F-033, F-034, F-036, F-037, F-038, F-039, and F-068 are resolved.
- **Next:** The planning session. It runs search, then assess, then the explain checkpoint with Nathan, then planning (§4).
- **The Plan's Home:** `.claude/Planning/MarkdownPM Links — Implementation Plan.md`, following the folder's naming. `.claude/Planning/` is tracked, and every commit on `active` is hook-pushed.
- **The Evidence:** `synthesis.md` and every report behind it live beside this document in `.claude/Planning/MarkdownPM Links/` (§8). Paths in §7 and §8 are relative to that folder.

### 2. The Mandate

In Nathan's words, with typos corrected:

> We're planning the complete cleanup of how Pommora and MarkdownPM handle links: pasting them, copying them, reading them… all of it. We want a single source of truth for how this works. No odd-ones-out behavior. No confusing names, no complexity that only exists because previous and right-now architecture makes it "look" correct, and nothing that doesn't end up reading totally intentional and simple.
>
> The new system can take on a different look than what's currently there and may constitute a major refactor, deletion, behavioral changes, or anything required to make Pommora's codebase and MarkdownPM much more maintainable, cohesive, clear in where things belong, how things work, and what things do. There should be clear ownership where required, shared behavior where appropriate, and deletions when best made. Things previously engineered as independently constructed when their actual behavior should simply be inherited from its primary source and derived from shared reasoning should be reconciled. Anything that’s different, appears “correct” in isolation, but whose reasoning for being different collapses on further assessment should be reconciled and considered as opportunities for codebase enhancing changes.
>
> The goal here is to reduce the codebase by around 200-400 lines of code. Remove any spaghetti architecture or "fancy systems" that don't provide any actual value and simply fulfill self-induced responsibilities that wouldn't be needed if the more appropriate and actually coherent approach was taken in the first place.
>
> What we do may not reflect the current codebase, but the outcome may ensure the codebase is reflective as a whole on the broader level as a result. We’re chasing parity, clarity, maintainability, consistency, and reliability — not what’s the most fancy or expensive way to achieve the same behaviors. 

**On the Line Target:** "Net-negative" is the simplicity philosophy, not a literal chase. Don't write denser code to hit a number; report the real figure. Additions are accepted when they're surgical and collapse drift. Overall, the line count still goes down, and the neutral perspective's "less stuff, fewer ways, less confusion, less complexity" stays the core emphasis.

**Scope:** Everything link-shaped is in scope wherever leaving it out would leave odd-ones-out behavior:
- the Connections layer
- the `[[` picker
- Paste As and the clipboard
- opening links and fetching titles
- embeds and citations
- Link property values
- MarkdownPM table cells

### 3. Principles

These bind every task and every in-flight decision. They go into the plan's *§Constraints* as written here, merged only where one restates another.

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
- Prioritize addressing the high-level origin rather than compounding patch-on fixes or amendments — don't just pass it along

**The Plan-Stage Reviewers' Rubric** (Nathan's six, from earlier audits; used by plan reviewers, not written into Constraints):
- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, making a wrong behavior correct, or delivering a required behavior in minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules.
- **Better, Rather Than Moved:** Complexity that's relocated, renamed, or exchanged for new complexity of similar weight counts as no improvement.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.

### 4. Process

#### 4.1 The Planning Session, Before the Plan

- **Search:** Read the code behind every load-bearing part of §6 and the prototype diff (§7) yourself. Verify before relying on anything; the evidence is a map, not truth.
- **Assess:** Decide the phase order around §10's edges, what's left to your judgment (§6 lists it), and whether the prototype's shape holds.
- **Explain (Checkpoint):** Bring Nathan the chosen approach and a short version of the plan in plain, non-technical terms, plus §12's questions and any new ambiguity. Explain how each approach fits his principles, and say plainly where one strains them. Establish mutual understanding and fold in his adjustments. Ask only what he can honestly answer; pure implementation calls stay yours, and you disclose them.

#### 4.2 Planning

- **Skill:** `writing-plans-v3` (`~/.claude/skills/writing-plans-v3/SKILL.md`), as-is, with this effort's adaptations below.
- **AFTER Blocks:** Write them as close to the final code as possible, citing by file and function, with red-first tests whose mutation is named.
- **Agents:** Load `agent-orchestration` before every dispatch. Scouts that prove a design-heavy phase on a scratch worktree before it's planned have saved earlier plans; the foundation already has one (§7).
- **Second Checkpoint:** Once the plan is drafted, explain the chosen approach and a short version of the plan to Nathan again, and take his adjustments, *before* any plan reviewer sees it. This is separate from the first checkpoint.
- **Open Items:** The plan's *§Open Items* lists §13.

#### 4.3 Plan Reviews (Sequential, Each Folded Before the Next)

1. **Simplification:** fable-high, with the `code-simplification` lens.
2. **Adversarial:** fable-high, with the `adversarial-review` lens. Bring the calls that are Nathan's to him.
3. **Neutral Plan Review:** `fable-extra`
   - **Gets:** The plan, its intent, and the whole codebase.
   - **Lens:** The blind reviewer's mandate without the blindness. Nathan's six (§3) are its rubric, read simplicity first and outward against the rest of the codebase for cohesion.
   - **Judges Outward Cohesion:** Does the plan truly advance what the code holds? Does each AFTER read as always-intended next to the code it doesn't touch? Does it leave nothing dead behind and zero gaps, add no complexity that needn't exist, and create no friction with future work?
   - **Findings:** A finding names a mechanism: a real incorrect behavior or an actionable concern, at a `file:line` it read. Cosmetic observations, style preferences, and "could break" without a path aren't findings, and a reviewer that finds nothing wrong has done its job.
   - **Returns:** A verdict and a ranked list.
   - **Veto:** You may veto a suggestion, keeping an open mind, by answering it with the code that shows why it shouldn't be taken; "the plan called for it" answers nothing. Every veto appears in the plan presentation.
4. **Advisor**, then present the plan.

#### 4.4 Post-Implementation Verification

1. **Phase Review:** Per the skill's §5.1.
2. **Simplification Lens, Then Adversarial Lens:** Over `baseline..HEAD`.
3. **Neutral Before/After Review:** fable-high, zero context, judging with §4.5's rubric.
   - **Gets:** The file list only, with production files and tests marked. Before is `git show <baseline>:<path>`; After is the working tree. It may read untouched code for comparison.
   - **Forbidden:** `git diff`, `git log`, commit messages, `.claude/`, the plan, and any statement of intent.
   - **Returns:** A Positive, Neutral, or Negative verdict; a per-file account; a ranked list of anything worse in After, with `file:line`; and before/after line counts.
   - **The One Question:** Is the change genuinely positive, or does it pass the ball forward?
   - **Findings:** Counted as in §4.3.
   - **Closing the List:** Every item it ranks worse is verified. If it holds, fix it at its cause; code is never added only to answer a critique. If it's rejected, the report answers it with the code that shows why. A standing disagreement goes to Nathan. A second pass runs on the fixed state, at most two passes.
   - **Order:** It runs after every other finding is closed.
4. **Own Pass, Reconciliation, Report:** Per the skill. Completion requires a Positive verdict, with every ranked-worse item fixed or ruled on by Nathan.

**The Skill's Own §5.3:** It gives the neutral verifier "a plain statement of what the change intended". For this effort, the post-implementation neutral gets no intent at all; only the plan-stage neutral gets the plan and intent. The skill file itself stays unchanged.

#### 4.5 The Blind Reviewer's Rubric (Broadly Principled, Not Confirmatory)

Read both versions honestly and at an overview level, as code you'd inherit and maintain. For each axis, judge which version is better and why, in your own terms:
- **Simplicity:** Less to carry and less to trace. Does each piece earn its existence, or does some exist only to serve another piece's shape?
- **Cohesion:** Does it read like the codebase around it, in its idioms and ownership patterns, with one home per concern, nothing hand-rolled that the codebase already provides, and nothing behaving differently from its siblings without reason?
- **Direct Purpose:** Does each file, function, and type do what its name says, directly, with nothing over-engineered and no detours, shims, defensive layers, or speculative generality?
- **Legibility:** Could a newcomer find where a behavior lives and understand it in one read? Do the names say what things are?
- **Ownership:** Is it clear who owns each rule, and would the next change of this kind have one obvious place to go?
- **Honest Weight:** Was complexity removed, or relocated, renamed, or exchanged for new complexity of similar weight?
- **Settledness:** Does anything read transitional, half-finished, leftover, or inconsistent with itself?

**The One Question:** Is After genuinely better for the codebase, with no reason left to think anything in Before was the better choice, or does it pass the ball forward? Would you accept it?

#### 4.6 Working Practices Nathan Asked to Carry Forward

- **Refuse Ambiguity Out Loud:** When an answer has two readings, contradicts an earlier ruling, or leaves a case unnamed, stop and ask. Put the readings side by side, ideally as a table of concrete outcomes, and give a recommendation. He values this pushback.
- **Disclose:** Disclose in-flight decisions immediately.
- **Report Honestly:** Report line deltas excluding comments and tests, real gate output, and honest behavior claims.
- **Consult the Advisor:** At each step, if one is available.

### 5. Rulings

Every entry is the final state of what’s intended to become absolutely true — what’s currently in the codebase changes to reflect these rulings. `Ruling Log.md` holds the questions that produced them.

#### 5.1 Vocabulary

- **Connection:** Any link to a page or heading, whichever syntax wrote it: `[[Page]]`, `[[#H]]`, `[x](Page)`, `[x](#H)`.
- **Weblink:** The code's name for any link to a URL. The docs call it a **link**.
- **`'wikiLink'`:** The token kind keeps its name.
- **The Two Cells:** A **MarkdownPM table cell** is a table inside a page body. A **property value cell** is a Link or Text value in a Table view, a Card, or the Panel. They are two different things and are never conflated.

#### 5.2 Reading and Code

- **One Reader:** Link syntax is read in one place, `Core/Connections`. The editor's drawing, its typing behavior, the index, and renames all go through it.
- **Code:** A link written inside code acts like code everywhere: the picker, Enter, slot cleanup, alias memory, and the Format menu.
- **Raw HTML:** Inside a raw-HTML block on a page, the picker, slot cleanup, and alias memory stand down, as Enter already does.

#### 5.3 Embeds

- **Tiles:** An embed forms a tile **only** when it stands alone on its own line in a body that mounts the tile field, meaning the page editor.
- **Everywhere Else:** `![[Page]]` is a literal `!` followed by the connection `[[Page]]`, and `![x](url)` is `!` followed by a weblink. Each draws, follows, glances, and offers its menu as any link does.
- **No Special Case:** Frontmatter is excluded inherently. Table cells and Text values never tile.
- **Lone Embeds That Are Links:** A lone embed that is a duplicate of an already-tiled page, a self-embed, or a headed `![[P#H]]` is a link, not a tile. The cycle placeholder goes.
- **Aliased Lone Embeds (Disclosed Call):** A lone aliased `![[P|a]]` is also a link, since a tile has nowhere to show an alias (the prototype report's §9, M11-06). This is a disclosed call, not one of Nathan's rulings.
- **Matrix:** It stays out. Tiled embeds keep their own relation kind (`embed`) and stay excluded from the graph; a mid-line embed is an ordinary `body` relation.

#### 5.4 Looks

- **One Treatment for Unresolved Links:** Every unresolved link looks the same whichever syntax wrote it, and a link to a page looks the same whichever syntax wrote it. A markdown link to an ambiguous title draws in the ambiguous tone.
- **Display Unresolved Links As Plain Syntax:** It applies everywhere: body, MarkdownPM table cells live and at rest, and Text values live and at rest. It doesn't restyle the `/` menu's query.
- **Parity Through Shared Behavior:** A `§Heading` run draws at rest as it does live, riding shared behavior rather than added lines.
- **At Rest:** A resting Text value's heading links use its page's headings and Heading Link Style (F-062), and a link nested in bold or italic in a resting cell draws and acts as a link (X-12).

#### 5.5 Menus

- **Shared Rows:** Every link's menu shares the same rows:
  - open rows (none on an unresolved link)
  - Copy Link (plus Copy Path on a page)
  - **Rename**, which edits the shown text, adding one if there's none
  - **Edit Title** on a connection, or **Edit Link** on a weblink, which edits what the link points to
- **Labels:** No row label depends on an alias existing, and there is no "Add Title" anywhere. The second row's label is the only thing that differs for a weblink.
- **In Editors:** The body, MarkdownPM table cells live and at rest, and Text-value panes add **Format ▸** for weblinks and **Remove Link** and **Delete** for every link, connections included. Remove Link keeps the shown text.
- **`[x](Page)`:** It authors like `[[Page]]`.
- **Unresolved and Held Links:** Whether phantom, ambiguous, invalid, and held `[[#H]]` links get a menu is the planner's call (X-02). Nathan leans that it shouldn't add weight.
- **Copy Labels:** "Preview" and "Page Title" stay as they are.
- **Menus Answer:** The link menu hands back what was picked, like every other menu in the app, so the create-ghost stays hidden while a Link value's menu is open (B-68).

#### 5.6 MarkdownPM Table Cells at Rest

- **Everything at Rest:** Every construct in an unfocused cell gets its right-click menu, and the right-click itself never focuses the cell. That includes the link menu, Format ▸, Lists ▸, Insert Link, and the system rows Cut, Copy, Paste, Paste As, and Paste Without Formatting. Undo and Redo stay out.
- **Writes Commit at Rest:** A chosen row that writes (Bold, Remove Link, Delete, Format, Paste…) commits at rest **without placing the caret** in the cell. Rows that need typing (Rename, Edit Title / Edit Link) enter the cell with the selection seated, unchanged.
- **One Paste Path:** The resting rows that paste reuse the paste logic rather than restating it, with the shared paste pipeline landing first (synthesis §3.9, §3.11).
- **Read-Only:** A read-only resting cell (an embedded page at rest) offers no authoring rows (B-56).

#### 5.7 Property Value Cells (Link and Text)

- **Resting Right-Click:** At rest, a property value keeps its current rows; what changes is only what the rulings below name (labels, the Panel's Remove, and link menus on values that lack one).
  - **Link Values:** The current rows (open rows, Copy, the two authoring rows, Clear, Remove where the surface hides values, and the fallback menu's Edit). Labels follow §5.5's one source.
  - **The One Possible Change:** The column's **Format ▸** on a Link cell, matching Number, Select, and Date cells, if the planner judges it cheap and unconstrained. Otherwise it's left out.
  - **Text Values:** Non-link content's menu is unchanged. The links inside get only what rides along through the shared link-menu builder: the same rows and labels, and whatever §5.5's unresolved-link decision gives. No authoring plumbing is added.
- **Active Surfaces:** A Text value's TextPane is a real editor with full parity, and needs no change.
- **Link Values Behave Like Every Link:** They draw, follow, glance, and route the same way: Open Connections In Preview, window mode, Tab Open Behavior, phantom and ambiguous tones, `Alpha § Setup`, and the missing-heading mark. Only what's genuine to the data layer, the cascade, property handling, and destructive actions differs.
- **Clicks:** Clicking the text follows the link; clicking the padding edits the value. The same holds for page and address values.
- **Aliases:** Link properties allow an alias.
- **Format on Values:** Hidden. The property's own Format (`link_display`, and the view column's look) determines a value's look (Q-17). A label pasted onto a value is its alias, and Rename to empty clears it.
- **Committing a Link Value:**
  - It's a page if a page has that title, with ambiguity refused explicitly.
  - Otherwise it's a weblink if valid, normalized to a scheme.
  - Otherwise it's refused.
  - `[[#Heading]]` commits when the value has a holder page and is refused on a Space.
  - Pages are stored as `[[…]]` (P-02).
- **Rename and Delete:** A hand-written `[x](Page)` value is renamed (keeping its written syntax), stripped, parked, and restored like `[[Page]]`.
- **Panel Remove:** The Panel's value menu offers Remove, meaning what its row menu's Remove does: it clears this page's value and hides the row on this page. The schema and other pages are untouched.

#### 5.8 Paste, Paste As, Copy, and Retarget

- **One Retarget Rule:** Paste-into-link, the picker, and a Link value's Edit Title / Edit Link all change a link's target under one rule, written once in `retarget`; the picker's markdown-target arm keeps its own edit and applies the same shown-text rule (synthesis §3.12). Its rules:
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

- **Paste Anywhere Inside a Link:** Pasting a link anywhere inside a link retargets it, wherever the caret sits.
- **Paste As Inside a Link:** It retargets in the form you pick.
- **Literal Pastes:** Plain Text, Paste Without Formatting, and ⌘⇧V paste literally. Plain text pastes as text.
- **Remove Title On Link Change:** It governs every syntax, markdown links in the picker included. With it on (the default), Edit Link followed by pasting a URL drops the old label, so the site's own title can be written once it resolves; this is intentional.
- **Typing:** Typing a replacement isn't the app rewriting the link, so typing keeps the label.
- **Paste As Keeps Title and Heading:** `[[T#H]]`, Copy Link's own output, offers Connection and Markdown Link, and `[x](#H)` offers nothing broken.
- **Plain Text vs Paste Without Formatting:** Paste As ▸ Plain Text stays, since it's more literal than Paste Without Formatting. The two share one system.
- **Parity:** Pasting a link over several selected MarkdownPM table cells, and dropping an address into a page, format as a normal paste does. This is achieved through shared behavior.

#### 5.9 The `[[` Picker

- **Openers:** Typing `[[` or `[label](` opens the picker whether or not Pair Brackets is on. (`![[` is `!` plus `[[`.)
  - Enter or a pick completes the link, writes the closer, and places the caret outside the syntax, as Enter already does.
  - Dismissing it leaves the typed text.
  - With Pair Brackets on, `[[` opens the picker on the brackets.
- **Heading Lists:** The picker's heading list and the missing-heading mark both read the index. The lag is unreachable in practice.
- **`##` → `§`:** It opens the heading list, as typing `§` does.
- **Alias List:** It slides in only when the picker opened that slot.

#### 5.10 Opening and Titles

- **Non-Web Addresses:** `mailto:` and other non-web addresses go to the system even with Open Links In Pommora on. The in-app row hides for them, and Page Title isn't offered for them.
- **Failed Title Fetches:** A failed fetch stops waiting.
- **Pending Titles:** One fallback serves every surface that can't hold a pending swap.
  - It waits for the title, then commits once under a whole-text guard.
  - Resting MarkdownPM table cells use it directly.
  - A live cell or TextPane closing with a swap still pending forwards it to the same wait. This fixes F-043 and B-158.
  - Live editors otherwise keep the pending-title swap.
  - **What the User Sees:** At rest, Page Title updates once when the title arrives; in a live editor, it writes the short form and then swaps.

#### 5.11 Rename, Index, and Seams

- **F-094:** Taken now: connections become an `EditorHost` member, and the hand-threaded getter goes. If it needs a roster of the functions it rewrites, the plan lists them in a table.

#### 5.12 Out of Scope and Unchanged

- How Text values sort and filter.
- The Footnote Paste As row.
- Footnote-marker menus in cells: neither live nor resting cells get one.

### 6. Design (What Owns What)

What the cleanup makes true, concern by concern. Each row's detail, evidence, and reasons are in the synthesis section in its last column. Nothing here exists in the code yet; the rows marked as built exist only in the prototype's diff (§7). Calls marked **Planner** are yours, to be disclosed.

| Concern | After the Cleanup | Goes | Synthesis |
|---|---|---|---|
| **Reading** | One walk, `linkOccurrences(text, inCode)` in `Core/Connections/connections.ts`, will read every connection and markdown link, embeds included as connections, with empty slots kept and one code rule, `codeTouches`. The tokenizer will map it to tokens, and `linksIn` will yield it with spans. The caret reader becomes `connectionAt(scan, at)` in `Input/edits.ts`, one pass over the caret's line with the document scan's mask. *Built.* | `linkAt`, `aliasSpanAt`, `emptyAliasPipeAt`, `emptyHeadingHashAt`, `linkInCode`, `wikiLinkTokens`, the markdown `RegexSpec`, the `'embed'` token kind, `pageEmbedPattern` | §3.1, §3.3, §3.4 |
| **Code Gates Left** | Gate 3, a caret-position `inCodeAt` for unclosed openers, will remain. Gate 4 (`readFormatState`, `toggleInline`, `toggleWrap`) will read with the document's fence context; its shape is a **Planner** call. | — | §3.4 |
| **Grammar and Writers** | One markdown grammar, with `MD_LINK` rebuilt from the anchored tolerant regex. `connectionText` becomes the only wikilink spelling, beside one `markdownPageLink(title, heading?, label?)`, `serializeLink(url, label?)`, and one `composeWebpageEmbedLine`. Wrap and unwrap will share one escape rule, and titles will gain an expressibility check. | Hand spellings in the picker and `webpageInsertAtCaret`; `ConnectionParts`, `LinkValue`, `parseLink` | §3.1, §3.2 |
| **Value Reading** | `readLink` will report a value's written syntax as a `ParsedLink` and classify nothing. The four host readers (`goneEntry`, `parkLinks`, `namesGonePage`, `frontmatterMentions`) will move together onto a name-match against the title they hold, and the restore notes will write `linkEntry(raw, 2)`. | — | §3.1, §3.16 |
| **Resolution** | Every target question will run `PageIndex.resolve` → `titleTarget`/`MdTarget` → `heldTarget`. A Link value's target becomes `valueTarget`, and its commit will refuse any status but `resolved` explicitly. Moving the token-free half to `Core/Connections/target.ts` is a **Planner** call. | `resolveConnection`, `linkResolve.ts`, `ResolveTitle`, the hand adapters | §3.5 |
| **Clipboard and Commit Reader** | One `readLinkText(text, resolve?)` will read a page if it resolves, else a weblink if valid (normalized), else nothing, and refuse `[x](#H)`. Without a resolver (main's Paste As rows), a page will need a title-shaped target that isn't a valid address. | `parsePastedLink`, `pasteAsTarget`, `wholeWikiLink`, `PasteAsTarget` | §3.1 |
| **Drawing** | One `linkLook` will decide both renderers' look. The unresolved classes merge into `md-connection-phantom` and `md-phantom-syntax`, and `LINK_SELECTOR` becomes `[data-link-span]`. With `md-unresolved-fixed` gone, the existing root plain-syntax rule will reach every surface, and the `/` menu will get a look of its own. Nested links, `§` runs, and a Text value's heading links (F-062) will draw at rest. | `wikiLinkView`, `WikiLinkView`, `linkStatus`, `mdLinkClass`, `MD_LINK_CLASS`, `md-unresolved-fixed`, `cellStatic`'s import of `decorations.ts` | §3.6 |
| **Gestures** | `linkPointer` and `linkGestures` will share one hit shape, and `dwellTarget` will read `isHttpLink`. | The resting `heldTarget` re-conversions | §3.7 |
| **Menus** | `showConnectionMenu` will return a promise of the picked action. One builder, `linkMenuTarget(target, editable, value?)` with `tokenMenuTarget` folded in, and one model join will build every link's menu. One pure `linkEdit` with one live applier, in a merged `linkActions.ts` (its name is a **Planner** call), will announce titles through `writeLinkAt`. | `apply`, `onCell`, `ConnCellApply`, `isConnCellAction`, `hasAlias`, `surface`, `LinkCellAction`, `linkValueMenuTarget`, `linkFormat.ts`, `wikiAuthorTarget`, `linkActionText` | §3.8 |
| **MarkdownPM Table Cells at Rest** | Every construct will answer its right-click at rest, through the link door or the `editor:menu` door with a `resting` flag. Writes will commit through one `commitEdit` under a whole-text guard. A `Seat` union, one read-only consult, and a pointer-to-offset mapper will serve it, and the system rows will act at rest, pasting through the paste pipeline. | `menuTarget`, `still()`, `onSelect`, `initialSelect`/`caretCoords`/`sweepFrom`, the right-click focus fallback | §3.9 |
| **Link Values** | Every whole-token value but an external one will render through `TextCell` with a menu decline; a bare or external value keeps the URL half with the property's look and the shared gestures. Clicking the text will follow and clicking the padding will edit. The commit will run through `readLinkText` and `retarget`, with the holder and `connections` threaded to the inline editors, and the three parents will call the one builder. | `ConnectionCell`, `.cell-connection`, `urlClickTarget`, `linkAlias`, the `open` intent and its three handlers | §3.10 |
| **Paste and Retarget** | One `pasteAsWrite(target, how)` in `Actions/pasteAsMenu.ts`, one `paste(view, text, how)`, one `writeLinkAt` beside `awaitTitle`, and one `isWebAddress`. A pure `retarget` in `linkValue.ts` will serve paste inside a link, the picker, and Link value commits. Paste As ▸ Plain Text stays. | `pasteDecision.ts`, `linkFor`, `LinkActionText`, `formatted`, the duplicate address-gate spellings | §3.11 |
| **Picker** | One opener rule, `openLinkAt`, will serve `[[` and `[label](`; the query becomes a `StateField`; the commit will write through `connectionText`, one `behind`, and a heading tree built once; heading rows will read the index once it's extended to carry raw heading text and level (the extension's shape is a **Planner** call). The link-form commit will ride `retarget`; the target arm keeps its span edit and applies the same title rule. | `isInsideWikilink`, the `![[` loop and embed form, the pool filter, `armed`/`measured`/`formRef`/`sectionArmAfter`, `connectionInsert`, `cameFrom`/`viaChevron`, `openHeadingRows`, the fake outline, `AcQuery`, `NONE`; `headingTarget.ts` and `warmBody`/`fetchBody` if the index holds headings | §3.12 |
| **Opening and Titles** | `ConnectionsApi.open(page, heading?, newTab?)` will replace `open`, `bypass`, and `openPage`, and `openWebLink` will normalize and gate its in-app arm on `isHttpLink`. One `useLinkTitle` (its home is a **Planner** call), Page Title gated on `isHttpLink`, a failed fetch that settles, and one title fallback for every surface that can't hold a swap. | `openPage`, `bypass`, the duplicate title hook | §3.13 |
| **Embeds** | A tile will form only from a lone embed in the page editor, claimed only in `buildTiles`; every other `![[P]]` will read as `!` plus a connection. *Built, apart from the picker's half.* | `embedClaims.ts`, the cycle stub, `build`'s claim filter | §3.14 |
| **Section Runs** | `sectionRunsIn` will exclude links through the walk (*built*), and runs will draw at rest. | `sectionRunsIn`'s regex re-match | §3.15 |
| **Rename and Index** | Rename becomes span edits over the walk, and Link keys will ride the body rewrite with F-035's alias drop. *Built.* | `rewrite.ts`'s chained passes, `groupsOf`/`offsetOf`/`escapedPipe`, `rewriteFrontmatterConnections` | §3.16 |
| **Seams** | F-094 whole: `EditorHost.connections()` read live, `tableConnections` folded in, and `ConnectionsApi` as its type in `MarkdownPM/api.ts`. Moving `aliasMemory` into `editorHost` is a **Planner** call. | The getter through about 22 signatures, `embedHost.getConn`, the `tableConnections` facet | §3.17 |
| **Names** | Renames will ride lines a shape change already rewrites: `'external'` and `'site'` → `'url'`, a destination vocabulary, `ParsedLink`, `LinkMenuTarget`, `escapeLabel`, `LinkWrapKind`. Persisted keys keep their names. | — | §3.18 |

**Open Calls Beyond the Table:** Each is yours to settle and disclose; the synthesis section holds what bears on it.
- What Copy Link, Paste As Connection, and the picker do with a title a connection can't express, and the wikilink wrap's fix for a selection holding `]]` (§3.2).
- Where the raw-HTML stand-down check lives (§3.3).
- Whether `TextCell` stops a click only when the link can follow, so an ambiguous value's text edits like an invalid one's (§3.10).
- How the resting renderer nests spans, and how a page's outline reaches a resting cell or Text value for `§` runs (§3.6, §3.15).
- Where a resting commit guards identical text (§3.9).
- Whether a strict in-link field joins the editor-menu request, or Paste As keeps the edge-inclusive flags (§3.11).
- Whether the picker's query field stays per mount once the embed form goes, one rule for ArrowRight and the chevron on an empty markdown target, and whether a pick in `[[Page#H` keeps or refuses the typed heading (§3.12).
- Excluding a lone embed line inside a `$$` block from the index, and `loneWebpageEmbed` returning its span (§3.14).
- Memoizing `sectionRunsIn`'s `byLength` (§3.15) and hoisting `headingOutline` once per file in the rename cascade (§3.16).
- Whether the host readers bring back `targetNamesTitle` or name-match through `readLink`'s reported title (§3.16).
- Making `ConnectionsApi.location` and `headingsOf` required (§3.17).
- Whether the `'url'` tag and type names follow the ruled word "weblink", and `Token.fragment` → `heading` (§3.18).
- A `wikiLink`-narrowed `Token` union in place of the four `tk.resolveRange!` assertions (§3.19).
- The folders for `headingHash.ts`, the resting renderer, and `linkPaste`/`linkMarkdown`/`LinkPaste` (§3.20).

### 7. The Foundation Prototype

A proving scout built the reader foundation on a scratch worktree from `42a18f4a5`. Nothing was committed, and the worktree was removed after its diff was saved.

- **Report:** `proving/report.md`
- **Diff:** `proving/foundation.diff`, 37 files.
- **Measured:** −114 production TS and −5 CSS.
- **Gates:** Typecheck, tests, and lint all green.
- **Built:**
  - the one walk with `codeTouches`
  - `connectionAt`
  - `LinkHit` spans
  - the tokenizer mapping and the settled token shape
  - embeds as connections, with the claim only in `buildTiles` (E-11's option proven in `embedSuppression.test.tsx`)
  - rename as span edits, with the `names()` rule
  - Link keys riding the body rewrite
  - F-035's alias drop in the body rename
- **The Foundation's Remaining Work:**
  - the four host readers and the nested-YAML notes
  - gate 4's mask
  - the E-11 live check (§11)
- **Left for the Picker Work:** the picker's half of the embed change, which the opener rule has to precede (§10).

### 8. Evidence Index

Paths are relative to `.claude/Planning/MarkdownPM Links/`.

| File | Holds |
|---|---|
| `synthesis.md` | The code-level account, by rule: the current shape, the defects, the design and its reasons, the traps, and what goes false. Every §6 row's detail. |
| `Ruling Log.md` | Every question put to Nathan, with his answer |
| `proving/report.md`, `proving/foundation.diff` | The prototype (§7) |
| `brief.md`, `scouts/`, `verified/`, `probe*/` | The evidence trail behind the synthesis: the scout brief, twelve scout reports, three verifier reports with their probe runs, and the probe scripts (`npx vite-node`). A trailing ID in the synthesis, such as (B-35) or (E-23), finds its source here; where a report and the synthesis differ, the synthesis holds. |

**Repository Sources:**
- `.claude/Planning/Pommora Codebase Audit.md`: W6 and the link findings F-035, F-041, F-042, F-043, F-054, F-062, F-094, F-114.
- `.claude/Planning/Link Gestures — Implementation Plan.md`: the baseline's own plan.
- `.claude/Features/MarkdownPM.md`, `ConnectionsPM.md`, `PropertiesPM.md`, `ConfigurationPM.md`, `WebviewPM.md`, and `.claude/Guidelines/Editor-Internals.md`. The synthesis's *Would Go False* entries name which of their sentences are false today or go false.

### 9. Delta

The estimates run optimistic against measurement; report the measured figure.

**Additions, Each Listed on Its Own Line in the Plan:**

| Piece | Lines | What It Buys |
|---|---|---|
| Resting cell core (mapper, resting ask, `editFor` export, schema flag) | +36 to +50 | Every construct's menu at rest without focusing (§5.6) |
| System rows at rest (Undo/Redo out) | +34 to +47 | Cut, Copy (source form), Paste, Paste As, and Paste Without Formatting at rest, with the table payload still filling cells |
| Title fallback | +10 to +16 | F-043 and B-158, as one mechanism |
| Retarget | +20 to +30 | Ends three verified corrupting pastes (E-19, E-20, E-21); one rule for paste, the picker, and Link value commits |
| Value commit rule, host readers, nested-YAML notes | about +9 | `[[#H]]` and `[x](example.com)` commit; hand-written `[x](Page)` values handled like `[[Page]]` |
| Column Format ▸ on Link cells (optional) | about +4 | Link cells match Number, Select, and Date cells |
| Unresolved-link menus (**Planner**) | +4 to +8 | Menus on phantom, ambiguous, and held links |
| Nested links at rest | +8 to +15 | Links inside emphasis draw and act at rest |
| `§` runs at rest | uncosted | A `§Heading` run draws at rest as it does live (§5.4) |
| The index's raw heading text and level | uncosted | The picker's heading rows read the index (§5.9) |

### 10. Dependencies

The planner sets the phase order around these edges.

- **The Foundation First:** The walk, the caret reader, and the token shape (§7) are what most other pieces read.
- **The Builder and Retarget Before Link Values:** A Link value's menu comes from the one menu builder, and its commit runs through `readLinkText` and `retarget` (synthesis §3.10).
- **The Title Fallback Before Resting Titles:** Format ▸ Page Title at rest waits through the title fallback (§3.9, §3.13).
- **The Paste Pipeline Before the Resting Paste:** The pure paste pipeline precedes the resting cell's Paste and Paste As rows, which run through it rather than restating it.
- **The Answering Menu Before the One Builder:** The promise-returning link menu precedes the one menu builder, since `onCell`'s deletion depends on it.
- **The Opener Rule With or Before the `![[` Loop's Removal:** Insert ▸ Embed ▸ Internal Page writes `![[]]`, which only that loop opens today (E-31).
- **The Four Host Readers Move Together:** `goneEntry`, `parkLinks`, `namesGonePage`, and `frontmatterMentions` change in one step (T-01).
- **F-094 Early:** It rewrites the editor mounts and about 22 signatures. Landing it before the menu and resting-cell work avoids rewriting the same lines twice.

### 11. Live Checks Owed

Write each into the VERIFY step of the task that proves it. Drive the app per `.claude/Guidelines/Development-Environment.md`, on `~/Test`, and restore it afterward.

- **Tile Glyph (E-11):** With a selection spanning a page tile (drag or Select All), the tile's `wikiLink` draws no `connGlyph` inside the tile (synthesis §3.14).
- **Non-Web and Invalid Addresses:** With Open Links In Pommora on, `[x](example.com)` opens an in-app window on `https://example.com`, a `mailto:` link goes to the system, and an invalid Link value's text edits (§3.10, §3.13).
- **Link Value Layout:** A Link value rendered through `TextCell` truncates and shows its ellipsis as today's `OverScroll` does, in a Table, a Card, and the Panel (§3.10).
- **Create-Ghost (B-68):** No create-ghost appears while a Link value's menu is open in a Table or a Card (§3.8, §3.10).
- **Read-Only Embedded Pages (B-56):** A read-only embedded page's resting cells offer no authoring rows (§3.9).
- **System Rows at Rest:** Paste Without Formatting enables correctly at rest, and no role row reaches the page body's caret (§3.9).
- **Two Doors at Rest:** The link door's `preventDefault` and the editor door's undefaulted event stay exclusive (§3.9).
- **Titles (F-043, B-158):** At rest, Format ▸ Page Title writes the title once it arrives, and a pending title survives a live cell closing (§3.13).
- **Raw HTML:** On a page with HTML Formatting on, inside a raw-HTML block, the picker, Enter, slot cleanup, and alias memory don't act on `[[Foo|]]` (§3.3).
- **Hand-Checks to Offer Nathan:** A visual pass on link looks across the body, cells, and Text values; on Link values in tables and cards; and on resting-cell menus (§3.6).

### 12. Questions for the Checkpoint

Bring these to Nathan with your recommendation.

1. **Value-Menu Row Order:** The one menu model would move a URL value's Copy Link after Rename and Edit Link, while §5.7 keeps values' current menu. Keep the current order (the model takes a value branch) or accept the move? The lean is the current order unless the one model clearly wants it (synthesis §3.8, §3.10).
2. **Unresolved and Held-Link Menus:** Nathan leans "no extra weight". Decide with the measured cost and tell him which way you went (§3.8).
3. **Column Format ▸ on Link Cells:** Include it only if it's cheap and unconstrained. Tell him which (§3.10).
4. **One Word for Leave-As-Typed:** Pick "plain" or "literal" across the paste code and disclose it. It's an implementation name, not a product label (§3.11).

5. **Writes That Leave a Slot at Rest:** Bold at a plain point writes `****`, and Format ▸ Link or Connection writes `[]()` or `[[]]` at a point and `[word]()` over a range, each a slot meant for typing. Committed at rest without entering the cell, these strand the empty slot. Should they enter the cell like the typing rows, or commit as written (synthesis §3.9)?
6. **Focus After Writes:** The one applier would focus the editor after Remove Link, Delete, and Format, which the body doesn't do for a weblink today. Accept the focus, or keep today's behavior (§3.8)?
7. **`§` Runs at Rest:** A resting `§` run will draw as a live one does. Should clicking it also follow, as a live one does (§3.6)?

8. **Duplicate Copy:** Paste As says "Embedded Link" where the `/` menu says "Webpage" for the same embed, "External Link" and "Website Link" name one link, and "Remove Title On Link Change" says "Title" for the shown text. Leave them, or align each on one word (synthesis §3.18)?

9. **Lone Links and the Matrix:** Main has no resolver, so the index can't tell a lone embed line that tiles from one that draws as a link; as designed, every lone embed line stays `embed`, so a lone duplicate, self-embed, or headed embed that draws as a link stays out of the Matrix graph too. Accept that, or find another way to tell them apart (synthesis §3.14)?

### 13. Open Items (Out of Scope; List in the Plan's *§Open Items*)

- **Column Format on Cell Right-Clicks:** Whether every cell right-click should offer its column's Format, app-wide. Number, Select, and Date cells do today; Link cells' parity with them is §12's question 3.
- **Word Count:** `subfieldStats.ts`'s word count zeroes every lone `![[…]]` line, including lone embeds that are links. It belongs to the audit's deferred counter rework (M11-08).
- **Deferred Audit Findings:** F-093, F-095, and F-097 stay deferred; F-094 is taken. F-093 and F-095 rewrite the same editor mounts F-094 does (audit W21), so those mounts get rewritten again when they land.

### 14. Traps

Things that look removable or simple but aren't. Each is detailed, with its evidence, in the synthesis section that owns it.

- **Ambiguity Refusal:** The Link value commit has to refuse `status !== 'resolved'` explicitly once `resolveConnection` goes (B-153, T-06).
- **The Four Host Readers:** They move in one step, or a value is stripped but never parked (T-01). `spend.ts` keeps its `landed === was` guard when it maps stored values through the body rewrite (T-02).
- **Main Builds the Paste As Rows:** Main has to read the clipboard to build them; `askEditorMenu` parks until Chromium's `context-menu` (A-117).
- **`input.paste` Tags:** Every paste write keeps the `input.paste` tag, since the cell's and the table guard's paste filters key on it (A-119).
- **Pending-Title Matching:** The exact-text match survives (`pendingTitle.ts:33`).
- **Cell Writes Escape `|`:** A title or alias holding `|` written into a MarkdownPM table cell goes through `cellToSource`, or the row splits (R-11, B-176, E-35).
- **`TextCell` Decline:** Link values need a declined link menu on `TextCell`, or its read-only menu pre-empts the parent's value menu (T-04).
- **Pasted URLs Need a Scheme:** `pastedUrl`'s scheme rule stays for bare addresses, or `3.14` pasted into a link retargets it (E-36).
- **Paste Inside a Link Is Strict:** It reads the container strictly inside the token, since `linkTokenAt` is inclusive at the resting seat (E-25).
- **One Tile per Page per Document:** First-per-page stays, so two editors never write one page (E-32).
- **Caret Paths Can't Use the Draw:** `drawnTokens` can't serve the caret paths (B-163), and a caret/draw chunk memo can't be shared (B-114).
- **Load-Bearing Pieces:** The lazy alphabetical sort in `pageIndex.ts` (A-130) and `linkEntry`'s YAML unwrap (A-50) both stay.
- **Persisted Keys:** `link_display` and the settings keys can't be renamed for vocabulary (B-184).
- **What Can't Move to `Core/Connections`:** `ConnectionsApi` (it imports UIX), `ConnMenuTarget`, and `tokenTarget` (B-185…B-187).
- **Right-Click Doors at Rest:** The resting editor door needs `stopPropagation` without `preventDefault` (R-20, Q-37). At rest, role rows act on whatever element has focus, so Cut, Copy, and Paste are renderer-resolved (R-19).
- **Identical-Text Commits:** A resting commit of identical text records an empty undo step unless the commit guards it (M10-04).
- **A Raw `![[]]`:** An inserted `![[]]` shows raw while its picker is open (M11-02). An embed commit can open the alias slot, and `leaveSlot` collapses it (M11-04).
