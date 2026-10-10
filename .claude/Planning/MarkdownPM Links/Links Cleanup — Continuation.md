## Links Cleanup — Continuation

```markdown
You're picking up the Links Cleanup for Project Pommora (`~/The Studio/Projects/Project Pommora`), and your job is to plan it. A previous session spent a long stretch investigating and settling the design with Nathan. It dispatched eight scouts across every link surface, had two verifiers check each claim against the code, merged everything into one synthesis, and asked Nathan several rounds of design questions. After his answers, it sent four more investigation lanes and a third verifier, and had a prototype of the foundation built and proven on a scratch copy of the code. Nothing has been implemented, and the repository is clean at `42a18f4a5`. Everything that session learned and decided lives in one document, and you're reading its top: `.claude/Planning/MarkdownPM Links/Links Cleanup — Continuation.md`. Every investigation report it cites sits beside it in that folder. The full conversation is the transcript at `~/.claude/projects/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/cc8fe384-19e9-4334-bcd1-cd76e245f1be.jsonl`, if you ever need Nathan's exact words. The document already states every ruling as it stands now, so you shouldn't need to reconstruct anything from the transcript.

The work is a complete cleanup of how Pommora and its MarkdownPM editor handle links: reading, drawing, clicking, menus, typing, pasting, copying, opening, titles, embeds, renames, and the Link property. The goal is one source of truth per rule, no odd-ones-out, no confusing names, and no machinery that exists only because an earlier shape made it look necessary. The codebase should come out smaller and plainer; Nathan's line target is roughly −200 to −400 production lines, treated as a philosophy rather than a number to chase. Nathan has ruled on every product question the investigation could put to him, and four small questions remain for you (§13). He is not technical: explain in plain terms, and don't assume he knows how the code works.

Read the whole document before doing anything. §5 holds the rulings, which are the current truth with every superseded version already removed. §6 is the design that the evidence and rulings converge on. §7 describes the proven foundation and its diff. §8 indexes every investigation report by path. §9 lists the places where those reports turned out wrong, so you don't trust a superseded entry. §11 gives dependencies, §12 the live checks still owed, §13 the questions for your checkpoint, and §15 the traps.

Then work in this order, as Nathan asked. **Search:** read the code behind every load-bearing part of §6 yourself, starting with the prototype diff, and don't relay the reports. **Assess:** decide what the evidence and rulings leave to you, the phase order, and whether the prototype's shape holds. **Explain:** before any plan line is written, bring Nathan the approach you've chosen and a short version of the plan in plain language, together with §13's questions and any new ambiguity you find. Establish that you both understand the work the same way, and fold in his adjustments. Only then plan, using the `writing-plans-v3` skill with this effort's adaptations (§4). Once the plan is drafted, walk Nathan through the approach again before any reviewer sees it. After that, the review chain in §4.3 runs.

One working practice Nathan asked to be passed on explicitly. When an answer can be read two ways, contradicts an earlier ruling, or leaves a case unnamed, stop and ask before building on it. Lay out the readings side by side (a small table of concrete outcomes works best) and give your recommendation. It can feel like pushback or like slowing down, but he values it; it's what kept these rulings coherent. Consult the advisor at each step if you have one, and load `agent-deployment` before dispatching any agent.
```

*The block above is the handoff prompt. Nathan removes it once it's been given.*

---

### 1. Where Things Stand

- **Repository:** `~/The Studio/Projects/Project Pommora`, branch `active`, HEAD `42a18f4a5`. The code is identical to `75c3bcb9c` (Link Gestures; `42a18f4a5` is its docs reconcile). The tree is clean; nothing from this effort is committed.
- **Baseline Before This Effort:** Link Gestures already landed, giving one pointer handler (`linkPointer`) for both link kinds, a `drawnLinkAt` hit test, one menu rule (`tokenMenuTarget`), `literalAt`, `linkAddress`, `mdLinkClass`, and `linkInCode`. Audit findings F-033, F-034, F-036, F-037, F-038, F-039, and F-068 are resolved.
- **Done:** Eight scouts, verifiers A/B, the synthesis, Nathan's design rounds, lanes 9/9b/10/11, verifier C, and the foundation prototype (§7).
- **Next:** The planning session. It runs search, then assess, then the explain checkpoint with Nathan, then planning (§4).
- **The Plan's Home:** `.claude/Planning/MarkdownPM Links — Implementation Plan.md`, following the folder's naming. `.claude/Planning/` is tracked, and every commit on `active` is hook-pushed.
- **The Evidence:** This document and every report it cites live in `.claude/Planning/MarkdownPM Links/`. Paths in §7 and §8 are relative to that folder.

### 2. The Mandate

In Nathan's words, with typos corrected:

> We're planning the complete cleanup of how Pommora and MarkdownPM handle links: pasting them, copying them, reading them… all of it. We want a single source of truth for how this works. No odd-ones-out behavior. No confusing names, no complexity that only exists because previous and right-now architecture makes it "look" correct, and nothing that doesn't end up reading totally intentional and simple.
>
> The new system can take on a different look than what's currently there and may constitute a major refactor, deletion, behavioral changes, or anything required to make Pommora's codebase and MarkdownPM much more maintainable, cohesive, clear in where things belong, how things work, and what things do. There should be clear ownership where required, shared behavior where appropriate, and deletions when best made.
>
> The goal here is to reduce the codebase by around 200-400 lines of code. Remove any spaghetti architecture or "fancy systems" that don't provide any actual value and simply fulfill self-induced responsibilities that wouldn't be needed if the more appropriate and actually coherent approach was taken in the first place.
>
> What we do may not reflect the current codebase, but the outcome may ensure the codebase is reflective as a whole on the broader level as a result.

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

**The Plan-Stage Reviewers' Rubric** (Nathan's six, from earlier audits; used by plan reviewers, not written into Constraints):
- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, making a wrong behavior correct, or delivering a required behavior in minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go.
- **Better, Rather Than Moved:** Complexity that's relocated, renamed, or exchanged for new complexity of similar weight counts as no improvement.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. Exceptions carry their reason where a reader meets them.

**Project Rules That Bind the Design** (from `.claude/CLAUDE.md`, corrected against the code):
- Core reaches the machine only through `Core/Platform`. Desktop is the only caller of Node and Electron. `Core/Contract/bridge.ts` declares every channel once, with a `Result` envelope.
- Host-run Core imports no React (`engineGraph.test.ts`, `hostGraph.test.ts`). The MarkdownPM Engine can't import `Links/`. `Core/Connections` already imports `MarkdownPM/Engine/` (`scan.ts`, `rewrite.ts`), which is allowed. The binding rules are "no React" and "no `Links/`".
- Finite states are unions plus `switch`. Read paths are read-only.
- No O(N) or allocating work on a keystroke, caret move, or pointer move, and no full rebuild where an incremental one works.
- Comments aren't authoritative.
- Don't add comments unless they're necessary. Commit messages are past-tense and terse.

### 4. Process

#### 4.1 The Planning Session, Before the Plan

- **Search:** Read the code behind every load-bearing part of §6 and the prototype diff (§7) yourself. Verify before relying on anything; the evidence is a map, not truth.
- **Assess:** Decide the phase order (§11), what's left to your judgment (§6 marks these), and whether the prototype's shape holds.
- **Explain (Checkpoint):** Bring Nathan the chosen approach and a short version of the plan in plain, non-technical terms, plus §13's questions and any new ambiguity. Establish mutual understanding and fold in his adjustments. Ask only what he can honestly answer; pure implementation calls stay yours, and you disclose them.

#### 4.2 Planning

- **Skill:** `writing-plans-v3` (`~/.claude/skills/writing-plans-v3/SKILL.md`), as-is, with this effort's adaptations below.
- **AFTER Blocks:** Write them as close to the final code as possible, citing by file and function, with red-first tests whose mutation is named.
- **Agents:** Load `agent-deployment` before every dispatch. Scouts that prove a design-heavy phase on a scratch worktree before it's planned have saved earlier plans; the foundation already has one (§7).
- **Second Checkpoint:** Once the plan is drafted, explain the chosen approach and a short version of the plan to Nathan again, and take his adjustments, *before* any plan reviewer sees it. This is separate from the first checkpoint.
- **Open Items:** The plan's *§Open Items* lists §14.

#### 4.3 Plan Reviews (Sequential, Each Folded Before the Next)

1. **Simplification:** opus-high, with the `code-simplification` lens.
2. **Adversarial:** opus-high, with the `adversarial-review` lens. Bring the calls that are Nathan's to him.
3. **Neutral Plan Review:** Opus at `effort: "xhigh"`, per Nathan's ruling.
   - **Gets:** The plan, its intent, and the whole codebase.
   - **Judges Outward Cohesion:** Does the plan truly advance what the code holds? Does it leave nothing dead behind and zero gaps, add no complexity that needn't exist, and create no friction with future work?
   - **Returns:** A verdict and a ranked list.
   - **Veto:** You may veto a suggestion with a stated reason, keeping an open mind. Every veto appears in the plan presentation.
4. **Advisor**, then present the plan.

#### 4.4 Post-Implementation Verification

1. **Phase Review:** Per the skill's §5.1.
2. **Simplification Lens, Then Adversarial Lens:** Over `baseline..HEAD`.
3. **Neutral Before/After Review:** opus-high, zero context.
   - **Gets:** The file list only, with production files and tests marked. Before is `git show <baseline>:<path>`; After is the working tree. It may read untouched code for comparison.
   - **Forbidden:** `git diff`, `git log`, commit messages, `.claude/`, the plan, and any statement of intent.
   - **Returns:** A Positive, Neutral, or Negative verdict; a per-file account; a ranked list of anything worse in After, with `file:line`; and before/after line counts.
   - **The One Question:** Is the change genuinely positive, or does it pass the ball forward?
   - **Closing the List:** Every item it ranks worse is verified. If it holds, fix it. If it's rejected, give a one-line reason in the report. A standing disagreement goes to Nathan. A second pass runs on the fixed state, at most two passes.
   - **Order:** It runs after every other finding is closed.
4. **Own Pass, Reconciliation, Report:** Per the skill. Completion requires a Positive verdict, with every ranked-worse item fixed or ruled on by Nathan.

**The Skill's Own §5.3:** It gives the neutral verifier "a plain statement of what the change intended". For this effort, the post-implementation neutral gets no intent at all; only the plan-stage neutral gets the plan and intent. The skill file itself stays unchanged.

#### 4.5 The Blind Reviewer's Rubric (Broadly Principled, Not Confirmatory)

Read both versions as code you'd inherit and maintain. For each axis, judge which version is better and why, in your own terms:
- **Simplicity:** Less to carry and less to trace. Does each piece earn its existence, or does some exist only to serve another piece's shape?
- **Cohesion:** Does it read like the codebase around it, in its idioms and ownership patterns, with one home per concern and nothing behaving differently from its siblings without reason?
- **Direct Purpose:** Does each file, function, and type do what its name says, directly, with no detours, shims, defensive layers, or speculative generality?
- **Legibility:** Could a newcomer find where a behavior lives and understand it in one read? Do the names say what things are?
- **Ownership:** Is it clear who owns each rule, and would the next change of this kind have one obvious place to go?
- **Honest Weight:** Was complexity removed, or relocated, renamed, or exchanged for new complexity of similar weight?
- **Settledness:** Does anything read transitional, half-finished, leftover, or inconsistent with itself?

**The One Question:** Is After genuinely better for the codebase, or does it pass the ball forward? Would you accept it?

#### 4.6 Working Practices Nathan Asked to Carry Forward

- **Refuse Ambiguity Out Loud:** When an answer has two readings, contradicts an earlier ruling, or leaves a case unnamed, stop and ask. Put the readings side by side, ideally as a table of concrete outcomes, and give a recommendation. He values this pushback.
- **Disclose:** Disclose in-flight decisions immediately.
- **Report Honestly:** Report line deltas excluding comments and tests, real gate output, and honest behavior claims.
- **Consult the Advisor:** At each step, if one is available.

### 5. Rulings (Current Truth)

Every entry is the final state; superseded versions have been removed. `Ruling Log.md` holds the questions that produced them.

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
- **Aliased Lone Embeds (Disclosed Call):** A lone aliased `![[P|a]]` is also a link, since a tile has nowhere to show an alias (prototype §9, M11-06). This is a disclosed call, not one of Nathan's rulings.
- **Matrix:** It stays out. Tiled embeds keep their own relation kind (`embed`) and stay excluded from the graph; a mid-line embed is an ordinary `body` relation.

#### 5.4 Looks

- **One Treatment for Unresolved Links:** Every unresolved link looks the same whichever syntax wrote it, and a link to a page looks the same whichever syntax wrote it. A markdown link to an ambiguous title draws in the ambiguous tone.
- **Display Unresolved Links As Plain Syntax:** It applies everywhere: body, MarkdownPM table cells live and at rest, and Text values live and at rest. It doesn't restyle the `/` menu's query.
- **Parity:** Achieved through shared behavior rather than added lines:
  - a `§Heading` run draws at rest as it does live;
  - a resting Text value's heading links use its page's headings and Heading Link Style (F-062);
  - a link nested in bold or italic in a resting cell draws and acts as a link (X-12).

#### 5.5 Menus

- **Shared Rows:** Every link's menu shares the same rows:
  - open rows (none on an unresolved link)
  - Copy Link (plus Copy Path on a page)
  - **Rename**, which edits the shown text, adding one if there's none
  - **Edit Title** on a connection, or **Edit Link** on a weblink, which edits what the link points to
- **Labels:** No row label depends on an alias existing, and there is no "Add Title" anywhere. The second row's label is the only thing that differs for a weblink.
- **In Editors:** The body, MarkdownPM table cells live and at rest, and Text-value panes add **Format ▸** for weblinks and **Remove Link** and **Delete** for every link, connections included. Remove Link keeps the shown text.
- **`[x](Page)`:** It authors like `[[Page]]`; today's read-only menu on it is drift.
- **Unresolved and Held Links:** Whether phantom, ambiguous, invalid, and held `[[#H]]` links get a menu is the planner's call (X-02). Nathan leans that it shouldn't add weight.
- **Copy Labels:** "Preview" and "Page Title" stay as they are.
- **Menus Answer:** The link menu hands back what was picked, like every other menu in the app. This fixes the create-ghost appearing behind a Link value's menu (B-68).

#### 5.6 MarkdownPM Table Cells at Rest

- **Everything at Rest:** Every construct in an unfocused cell gets its right-click menu, and the right-click itself never focuses the cell. That includes the link menu, Format ▸, Lists ▸, Insert Link, and the system rows Cut, Copy, Paste, Paste As, and Paste Without Formatting. Undo and Redo stay out.
- **Writes Commit at Rest:** A chosen row that writes (Bold, Remove Link, Delete, Format, Paste…) commits at rest **without placing the caret** in the cell. Rows that need typing (Rename, Edit Title / Edit Link) enter the cell with the selection seated, as they do today.
- **The Paste Duplication:** The rest-side path restates the paste logic. The planner must collapse that duplication while keeping this behavior; S3-2's pure pipeline landing first is the evident route (C.md, Cross-Lane Stress).
- **Read-Only:** A read-only resting cell (an embedded page at rest) offers no authoring rows (B-56).

#### 5.7 Property Value Cells (Link and Text)

- **Resting Right-Click:** At rest, a property value keeps today's right-click.
  - **Link Values:** Today's rows (open rows, Copy, the two authoring rows, Clear, Remove where the surface hides values, and the fallback menu's Edit). Labels follow §5.5's one source.
  - **The One Possible Change:** The column's **Format ▸** on a Link cell, matching Number, Select, and Date cells, if the planner judges it cheap and unconstrained. Otherwise it's left out.
  - **Text Values:** Non-link content keeps today's menu. The links inside get only what rides along through the shared link-menu builder: the same rows and labels, and whatever §5.5's unresolved-link decision gives. No authoring plumbing is added.
- **Active Surfaces:** A Text value's TextPane is a real editor and already has full parity.
- **Link Values Behave Like Every Link:** They draw, follow, glance, and route the same way: Open Connections In Preview, window mode, Tab Open Behavior, phantom and ambiguous tones, `Alpha § Setup`, and the missing-heading mark. Only what's genuine to the data layer, the cascade, property handling, and destructive actions differs.
- **Clicks:** Clicking the text follows the link; clicking the padding edits the value. The same holds for page and address values.
- **Aliases:** Link properties allow an alias.
- **Format on Values:** Hidden. The property's own Format (`link_display`, and the view column's look) determines a value's look. Lane 9b Q-17 checked that this is coherent. A label pasted onto a value is its alias, and Rename to empty clears it.
- **Committing a Link Value:**
  - It's a page if a page has that title, with ambiguity refused explicitly.
  - Otherwise it's a weblink if valid, normalized to a scheme.
  - Otherwise it's refused.
  - `[[#Heading]]` commits when the value has a holder page and is refused on a Space.
  - Pages are stored as `[[…]]` (P-02).
- **Rename and Delete:** A hand-written `[x](Page)` value is renamed (keeping its written syntax), stripped, parked, and restored like `[[Page]]`.
- **Panel Remove:** The Panel's value menu offers Remove, meaning what its row menu's Remove does: it clears this page's value and hides the row on this page. The schema and other pages are untouched.

#### 5.8 Paste, Paste As, Copy, and Retarget

- **One Retarget Rule:** Paste-into-link, the picker, and a Link value's Edit Title / Edit Link all change a link's target through one `retarget`. Its rules:
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
| `[y](Page1)` | `[[Page2]]` | `[y](Page2)` |
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
  - Enter or a pick completes the link and writes the closer.
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

- **F-094:** Taken now: connections become an `EditorHost` member, and the hand-threaded getter goes. If it needs a roster, give it a table.

#### 5.12 Out of Scope and Unchanged

- How Text values sort and filter.
- The Footnote Paste As row.
- Footnote-marker menus in cells: neither live nor resting cells have one today, and parity at today's live behavior adds nothing.

### 6. Design (What Owns What)

This is the converging design: the synthesis's §4 *Converging Architecture*, amended by lanes 9/9b/10/11, verifier C, and the prototype. IDs point to evidence (§8). Calls marked **Planner** are yours, to be disclosed.

| Concern | Home and Shape | Deletes or Replaces | Evidence |
|---|---|---|---|
| **Reading** | One walk, `linkOccurrences(text, inCode)`, in `Core/Connections/connections.ts`. It covers wiki and markdown links (embeds are connections), with empty slots kept and one code rule, `codeTouches`. The tokenizer maps it to tokens. `linksIn` yields it with spans. Caret readers use `connectionAt(scan, at)` in `Input/edits.ts`: one pass over the caret's line with the document scan's mask. | `linkAt`/`aliasSpanAt`/`emptyAliasPipeAt`/`emptyHeadingHashAt`, `linkInCode`, `wikiLinkTokens`, the markdown RegexSpec, the `embed` kind, `pageEmbedPattern` | Prototype §1; synthesis §3.1, §3.3, §3.4 |
| **Code Gates Left** | Gate 3 (a caret-position `inCodeAt` for unclosed openers) remains by necessity. Gate 4 (`readFormatState`/`toggleInline`/`toggleWrap` tokenizing a line alone) takes the document scan's mask, which fixes B-35's fenced-format defect. | — | Prototype §5; B-35, B-120 |
| **Grammar and Writers** | One markdown grammar (`MD_LINK` rebuilt from the anchored tolerant regex). `connectionText` is the only wikilink spelling. One `markdownPageLink(title, heading?, label?)`. `serializeLink(url, label?)`. `composeWebpageEmbedLine` is written once. Wrap and unwrap use one escape rule. Titles get an expressibility check. | Hand spellings in the picker and `webpageInsertAtCaret`; `ConnectionParts`, `LinkValue`, `parseLink` | S1-B, S7-E, S3-3, E-29 |
| **Value Reading (Host)** | `readLink` reports the **written syntax** (wiki, markdown, or bare, with title or destination, heading, and alias) and classifies nothing. Host readers answer by name-matching the title they hold. `goneEntry`, `parkLinks`, `namesGonePage`, and `frontmatterMentions` move together; `namesGonePage` reads `wholeValueLink`. Notes write `linkEntry(raw, 2)` (M9-01). | P-21's resolver-free page arm (not taken) | X-01, T-01, M9-01 |
| **Resolution** | `PageIndex.resolve` → `titleTarget`/`MdTarget` → `heldTarget`. A whole value's target is `valueTarget = whole token ? heldTarget(tokenTarget(...)) : isValidLink ? external : invalid` (reusing `tokenTarget`). The commit refuses `status !== 'resolved'` explicitly. Moving the token-free half to `Core/Connections/target.ts` is a **Planner** call. | `resolveConnection`, `linkResolve.ts`, `ResolveTitle`, the hand adapters | C Stress 3, S2-C, A-19, B-153 |
| **Clipboard and Commit Classifier** | One `readLinkText(text, resolve?)`: a page if it resolves, else a weblink if valid (normalized), else nothing. Without a resolver (main's Paste As rows), a page needs a non-null `targetTitle` and `!isValidLink(dest)`. `[x](#H)` is refused explicitly. | `parsePastedLink`, `pasteAsTarget`, `wholeWikiLink`, `PasteAsTarget` | S3-1, A-142, X-01 |
| **Drawing** | One `linkLook` rule for both renderers. Unresolved classes merge (`md-link-invalid` → `md-connection-phantom`, `md-unresolved-syntax` → `md-phantom-syntax`). `LINK_SELECTOR` → `[data-link-span]`. Plain-unresolved is one container-scoped CSS rule everywhere; the `/` menu gets its own look. Fixes: F-062, nested links at rest (X-12), `§` runs at rest. | `wikiLinkView`/`WikiLinkView`/`linkStatus`/`mdLinkClass`, `MD_LINK_CLASS`, `md-unresolved-fixed`, `cellStatic`'s import of `decorations.ts` | S6-B, S6-C, B-60, B-62, X-12 |
| **Gestures and Opening** | `linkPointer` (body) and `linkGestures` (resting) share one hit shape (S7-C). `ConnectionsApi.open(page, heading?, newTab?)` replaces `open`+`bypass`+`openPage`. `openWebLink` normalizes and gates the in-app arm on `isHttpLink`. `dwellTarget` reads `isHttpLink`. | `openPage`, `bypass` | S5-A, S5-D1, S5-D3, S7-C |
| **Menus** | `showConnectionMenu` returns a promise of the picked action (S7-A). One builder, `linkMenuTarget(target, editable, value?: { hideable })`, with `tokenMenuTarget` folded in (9b Q-06). One model join (9b Q-07, keeping Format off values). One pure `linkEdit(text, tk, action, titles)` with one live applier (R-07), merged into `linkActions.ts` (naming is a **Planner** call). The applier lands on S3-2's `writeLinkAt` (M10-06). | `apply`/`onCell`/`ConnCellApply`/`isConnCellAction`, `hasAlias` everywhere (Q-08), `surface`, `LinkCellAction`, `linkValueMenuTarget` (Q-12), `linkFormat.ts`, `wikiAuthorTarget`, `linkActionText` | S7-A, 9b Q-06…Q-12, R-07 |
| **MarkdownPM Table Cells at Rest** | One resting `menuAt` and a commit-at-rest path under a whole-text guard (R-08). A `Seat` union replaces `initialSelect`/`caretCoords`/`sweepFrom` and `onSelect` (R-09). One read-only consult (R-13). A pointer-to-offset mapper (R-15). The resting editor-menu ask rides the same `editor:menu` door with a `resting` flag; Cut/Copy/Paste are renderer-resolved at rest and Undo/Redo/Select All are dropped (R-16). The table payload still fills cells (R-23). The rest paste runs through S3-2's pipeline, not a restatement. | `menuTarget`, `still()`, `onSelect`/`initialSelect`, the right-click focus fallback | Lane 10; C Lane 10 |
| **Link Values** | Every link-token value renders through `TextCell` with a menu decline (T-04); a bare or external value keeps the URL half with the property's look and shared gestures (P-24 corrected). Text follows and padding edits (Q-29). Commit goes through `readLinkText` and `retarget` (Q-25/Q-26), with holder threading for `[[#H]]` and `connections` at the inline editors (T-08). Link keys ride the body rewrite (P-22, with F-035's alias drop mandatory and `spend.ts`'s guard kept). The three parents call one builder (Q-11). | `ConnectionCell`, `.cell-connection`, `urlClickTarget`, `linkAlias`, the `open` intent and its three handlers, `rewriteFrontmatterConnections` | Lane 9, 9b, C Lane 9 |
| **Paste** | One `pasteAsWrite(target, how)`, where `how` is `PasteAsForm \| 'auto' \| 'inverse'`, in `Actions/pasteAsMenu.ts` (pure, main-importable). One `paste(view, text, how)`. One `writeLinkAt` beside `awaitTitle`. Retarget inside a link (E-23 as corrected, E-25 with `literalAt` kept whole for tokenless `[]()`). One `isWebAddress`. Plain Text stays. One word for leave-as-typed ("plain" vs "literal") is a **Planner** call, to be disclosed. | `pasteDecision.ts`, `linkFor`, `LinkActionText`, `formatted`, the duplicate address-gate spellings | S3-1, S3-2, E-23…E-27, C Lane 11 |
| **Picker** | One opener reader, `openLinkAt`, for `[[` and `[label](`; it replaces `isInsideWikilink` and the `![[` loop (S7-D). The query is a per-mount `StateField` (S4-B). Commit cleanup (S4-C): `connectionText`, one `behind`, the heading tree built once. Heading rows come from the index (needs the index to hold raw heading text and level; verify at plan time). The embed pool filter is dropped (E-13). The link-form commit and the target arm ride `retarget` (E-26). | `armed`/`measured`/`formRef`/`sectionArmAfter`, `connectionInsert`, `cameFrom`/`viaChevron`, `openHeadingRows`, the fake outline, `AcQuery`, `NONE`, `headingTarget.ts`, `warmBody`/`fetchBody` (if the index lever verifies) | S4-A…S4-C, S7-D, A-110, A-111 |
| **Titles** | One `useLinkTitle` (in `Session/` beside `useConnections` or in `Core/Web/`, not `cacheSlice.ts`). The rest wait and close-forward (§5.10). `wantsTitle` and the Page Title row are gated on `isHttpLink`, and a failed fetch settles. | `LinkCell` and `WebTile`'s duplicate hook | S2-C, A-61, B-158, C row 11 |
| **Embeds and Rename** | As the prototype built them (§7): the claim lives only in `buildTiles`; rename is a span edit through `applyEdits`. | `embedClaims.ts`, the cycle stub, `build`'s claim filter, `rewrite.ts`'s chained passes | Prototype; E-08…E-15 |
| **Seams** | F-094 whole: `EditorHost.connections()` is read live. `tableConnections` folds in. `ConnectionsApi` becomes `EditorHost`'s member type in `MarkdownPM/api.ts`. Moving `aliasMemory` into `editorHost` is optional. | The getter through about 22 signatures, `embedHost.getConn`, the `tableConnections` facet | F-094 (audit), B-49, B-124 |
| **Names** | Rename only where a shape change already rewrites the line: `'external'`/`'site'` → `'url'`, a destination vocabulary, `ParsedLink`, `LinkMenuTarget`, `escapeLabel`, `LinkWrapKind`. Persisted keys aren't renamed. | — | S8 §6.1, B-122, B-184 |

### 7. The Foundation Prototype

A proving scout built the reader foundation on a scratch worktree from `42a18f4a5`. Nothing was committed.

- **Report:** `proving/report.md`
- **Diff:** `proving/foundation.diff`, 37 files, +464 / −625. The worktree itself was removed after the diff was saved.
- **Measured:** −114 production TS and −5 CSS. Tests come to −42; the deleted `embedClaims.test.ts` accounts for −80 of that.
- **Gates:** All green.
  - **Typecheck:** Clean across seven projects.
  - **Tests:** 520 files, 7,524 tests. The baseline is 521 files and 7,528 tests; one file was deleted by ruling.
  - **Lint:** `biome check Core UIX Desktop Sync` is clean.
- **Built:**
  - one walk with `codeTouches`
  - `connectionAt`
  - `LinkHit` spans
  - the tokenizer mapping
  - embeds as connections (the claim in `buildTiles`; `embedClaims.ts`, the cycle stub, and the claim filter deleted; E-11 Option B proven in `embedSuppression.test.tsx`)
  - rename as span edits, with the S1-A trap proven
  - P-22 (Link keys ride the body rewrite; `spend.ts` mapped)
  - F-035's alias drop in the body rename
- **Settled Token Shape:** A `wikiLink` token always sets `resolveRange` to the title span. `fragment` is set only when the heading has text, and the token carries no slots. Four `tk.resolveRange!` sites remain, a known seam that a `wikiLink`-narrowed `Token` union would close.
- **Not Built (Phase 1's Remaining Work):**
  - the X-01 host readers and M9-01
  - gate 4's mask
  - the E-11 live check (§12)
  - the picker's `![[` loop, which is untouched; see E-31 in §11

### 8. Evidence Index

All paths are relative to `.claude/Planning/MarkdownPM Links/`. Each report tags its claims Verified, Corrected, Needs Probe, or Inferred.

| File | Holds | Status |
|---|---|---|
| `brief.md` | The shared scout brief: mandate, principles, project rules, vocabulary | Its "Connections can't import MarkdownPM" line is wrong (§3 states the binding rules) |
| `scouts/1-connections.md` … `8-names.md` | Eight scout reports (Connections, Link values, clipboard, picker, opening/embeds/citations, reading, gestures/menus, names/types/placement/docs) | Superseded by `verified/A.md` (1-4) and `verified/B.md` (5-8); open one only to recover detail |
| `verified/A.md` (A-01…A-161), `verified/B.md` (B-01…B-196) | Every scout claim checked at HEAD, with merges and corrections | Current |
| `synthesis.md` (1,766 lines) | Organized by rule: current shape, defects, options with arithmetic, traps, what goes false; §4 architecture; §5 delta ledger; §6 deletion ledger; §8 probes; §9 coverage map | §5's bundles, §7's decisions, and options superseded by rulings or later lanes are replaced by this document and `verified/C.md` |
| `scouts/9-properties.md` (P-, T-) | The Link property's whole path | P-25, P-24's click sub-bullet, and P-23's commit half are replaced by 9b; P-21 is not taken (X-01) |
| `scouts/9b-properties.md` (Q-) | The value menu, Format coherence, the commit and retarget fit, padding clicks | Q-18…Q-23 (Text-value parity) dropped by ruling |
| `scouts/10-resting.md` (R-) | Resting-cell authoring and its costs | T-A is superseded by the rest wait; the apply-live alternative was rejected |
| `scouts/11-embeds-retarget.md` (E-) | Embeds as links, paste retarget | E-23's title order and E-25's `literalAt` change are corrected in C |
| `verified/C.md` (+ `C-parts/`, `C-runs/`) | Lanes 9-11 verified; cross-lane X-01…X-12; the de-overlapped delta and revised bundle | Current |
| `proving/report.md`, `proving/foundation.diff` | The prototype (§7) | Current |
| `probe*/` | Probe scripts the lanes ran (`npx vite-node`) | Reference |
| `probe/` | Verifier A's probe scripts (`npx vite-node`) | Reference |
| `Ruling Log.md` | Every question put to Nathan with his answer, grouped by topic | Current; agrees with §5 |

**Repository Sources:**
- `.claude/Planning/Pommora Codebase Audit.md`: W6 and the link findings F-035, F-041, F-042, F-043, F-054, F-062, F-094, F-114. F-033…F-039 and F-068 are already resolved.
- `.claude/Planning/Link Gestures — Implementation Plan.md`: the baseline's own plan.
- `.claude/Features/MarkdownPM.md`, `ConnectionsPM.md`, `PropertiesPM.md`, `WebviewPM.md`, and `.claude/Guidelines/Editor-Internals.md`. The reports list which of their sentences are already false or will go false.

### 9. Corrections to the Evidence

Trust these over the entries they correct.

**The Prototype's Findings:**
- **A-45 Was Wrong:** `linkInCode` disagreed with the tokenizer (unclosed backticks, inner-text comparison). `codeTouches` is now the one rule.
- **The S1-A Trap Pointed the Wrong Way:** A title rename never risked `[[#H]]`. The real risk was a heading rename on a surface with no page title, and the `names()` rule fixes it.
- **`titleOf` Stays:** `parseConnectionText` reads it. The span edit must drop empty aliases explicitly.
- **Estimates Ran Optimistic:** The rename plus P-22 measured about −95 against −74 estimated, while `scan.ts` grew by +32. The walk plus the tokenizer comes to about −12. The foundation slice measured −114 against about −140 estimated, so the remaining estimates may also run optimistic.
- **The Synthesis's Token Options Compose:** S8 §6.2 (`resolveRange` always set) and B-127 (one reader) were called mutually exclusive, but they compose. The reader lives in `Connections`, and tokens carry no slots.

**Verifier C's Corrections:**
- **P-21's Resolver-Free Arm Is the Rejected S2-D:** It would lose data on a frozen restore (`namesGonePage`) and write phantom connections (`linkValueFromRename`). X-01's shape replaces it.
- **E-23's Title Order Was Inverted:** The correct order is `next.alias ?? (keepTitle ? container.title : undefined)`.
- **E-25:** `literalAt` stays whole, so tokenless `[]()` and `![]()` (written by ⌘K and Insert ▸ Embed ▸ Website) still paste literally.
- **P-24's Routing:** Every link-token value goes to `TextCell`. A phantom or ambiguous value sent to the URL half would draw blank.
- **Double Counts:** Lane 11's `rewrite.ts` row (−14) is inside S1-A (X-06), its picker re-parse is inside S4-C (X-07), and the `tokenMenuTarget` fold is unowned (X-08, about −5).
- **S3-2's Ledger Removed Plain Text:** The Plain Text removal (−3) is reversed by ruling (X-05).
- **T-A Is Superseded:** The rest wait replaces it. M10-04's identical-text no-op guard survives as its own fix.

### 10. Delta

- **Revised Bundle (Verifier C, Before the Prototype Measured):** About −490 mid, ranging from about −435 to −540. Without F-094 it's about −440. The synthesis's original "Full, Side 2" bundle was −382.
- **Where It Moved:** Lane 9 −62, lane 10 +48, lane 11 −44, F-094 −50. Lane 10's rows 13 and 14 were costed at rest, which §5.6's ruling keeps.
- **Expect Less:** Given §9's estimate drift, plan for real figures somewhat less negative. Report the measured figure.

**Ruled Additions, Each Listed on Its Own Line in the Plan:**

| Piece | Lines | What It Buys |
|---|---|---|
| Resting cell core (mapper, resting ask, `editFor` export, schema flag) | +36 to +50 | Every construct's menu at rest without focusing (§5.6) |
| System rows at rest (Undo/Redo out) | +34 to +47 | Cut, Copy (source form), Paste, Paste As, and Paste Without Formatting at rest, with the table payload still filling cells |
| Title fallback | +10 to +16 | F-043 and B-158, as one mechanism |
| Retarget | +20 to +30 | Fixes three verified corrupting pastes (E-19, E-20, E-21); one rule for paste, the picker, and Link value commits |
| Commit rule, X-01 readers, M9-01 | about +9 | `[[#H]]` and `[x](example.com)` commit; hand-written `[x](Page)` values handled like `[[Page]]` |
| Column Format ▸ on Link cells (optional) | about +4 | Link cells match Number, Select, and Date cells |
| Unresolved-link menus (X-02, Planner) | +4 to +8 | Menus on phantom, ambiguous, and held links |
| Nested links at rest (X-12) | +8 to +15 | Links inside emphasis draw and act at rest |

### 11. Dependencies and Suggested Order

These are non-binding; the planner decides the order. The hard edges come first.

**Hard Edges:**
- **S3-2 Before the Resting Paste:** S3-2's pure paste pipeline precedes the resting cell's Paste and Paste As rows. That's the collapse path for the duplicate paste logic.
- **S7-A Before the Menu Builder:** The promise-returning menu precedes the one value-menu builder (9b Q-12), since `onCell`'s deletion depends on it.
- **S7-D With or Before the `![[` Loop's Removal:** The opener rule lands in or before the phase that deletes the picker's `![[` loop (E-31). Insert ▸ Embed ▸ Internal Page writes `![[]]`, which only that loop opens today.
- **The Four Host Readers Move Together:** `goneEntry`, `parkLinks`, `namesGonePage`, and `frontmatterMentions` change in one step (T-01).
- **F-094 Early:** It rewrites the editor mounts and about 22 signatures. Landing it before the menu and gesture phases avoids rewriting the same lines twice.

**Suggested Order:**
1. The foundation: the prototype, plus X-01 and M9-01, gate 4, and the E-11 live check.
2. F-094 and the seams.
3. Resolution and Link values.
4. Menus.
5. Paste and retarget.
6. The picker.
7. Drawing and looks.
8. MarkdownPM table cells at rest.
9. Titles and opening.
10. Names and placement where they ride.
11. Docs and audit reconciliation.

### 12. Live Checks and Probes Owed

These come from synthesis §8, C, and the prototype. Write each into the VERIFY step of the task that proves it. Drive the app per `.claude/Guidelines/Development-Environment.md`, on `~/Test`, and restore it afterward.

- **E-11:** With a selection spanning a page tile (drag or Select All), check that the tile's `wikiLink` doesn't draw `connGlyph` inside the tile.
- **P1:** With Open Links In Pommora on, open `[x](example.com)`, a `mailto:` link, and an invalid Link value. Expected: an in-app window on `https://…`, `mailto:` going to the system, and the invalid value editing.
- **P8:** Check that a Link value rendered through `TextCell` truncates and shows its ellipsis exactly as today's `OverScroll` does, in a Table, a Card, and the Panel.
- **B-56, P3:** A read-only embedded page's resting cells offer no authoring rows.
- **P5, B-68:** No create-ghost appears while a Link value's menu is open.
- **P4, B-158:** A pending title survives a live cell closing.
- **P2, F-043:** At rest, Format ▸ Page Title writes the title once it arrives.
- **Heading-Index Lever:** Before designing the picker's heading rows on the index, verify the index can hold raw heading text and level. Today it holds normalized keys only (`indexSeed.ts:73`).
- **Hand-Checks to Offer Nathan:** A visual pass on link looks, on Link values in tables and cards, and on resting-cell menus.

### 13. Questions for the Checkpoint

Bring these to Nathan with your recommendation.

1. **Value-Menu Row Order:** 9b Q-07's one model would move a Link value's Copy Link after Rename and Edit Title, while §5.7 says values keep today's menu. Keep today's order (the model takes a value branch) or accept the move? The lean is today's order unless the one model clearly wants it.
2. **Unresolved and Held-Link Menus (X-02):** Nathan leans "no extra weight". Decide with the measured cost and tell him which way you went.
3. **Column Format ▸ on Link Cells:** Include it only if it's cheap and unconstrained. Tell him which.
4. **One Word for Leave-As-Typed:** Pick "plain" or "literal" across the paste code and disclose it. It's an implementation name, not a product label.

### 14. Open Items (Out of Scope; List in the Plan's *§Open Items*)

- **Column Format on Cell Right-Clicks:** Whether a cell right-click should ever offer its column's Format. Number, Select, and Date cells do today. This is an app-wide quality-of-life pass for later.
- **Word Count (M11-08):** `subfieldStats.ts`'s word count zeroes every lone `![[…]]` line, including lone embeds that are now links. It belongs to the audit's deferred counter rework.
- **Deferred Audit Findings:** F-093, F-095, and F-097 stay deferred; F-094 is taken.

### 15. Traps

These are things that look removable or simple but aren't. Each carries its evidence ID.

- **Ambiguity Refusal:** The Link value commit must refuse `status !== 'resolved'` explicitly once `resolveConnection` goes (B-153, T-06).
- **The Four Host Readers:** They move in one step, or a value is stripped but never parked (T-01). `spend.ts` is a second caller of the frontmatter rewrite (T-02).
- **Main Builds the Paste As Rows:** Main has to read the clipboard to build Paste As rows. `askEditorMenu` parks until Chromium's `context-menu` (A-117).
- **`input.paste` Tags:** Every paste write keeps the `input.paste` tag, since the cell's and the table guard's paste filters key on it (A-119).
- **Pending-Title Matching:** The exact-text match must survive (`pendingTitle.ts:33`).
- **Cell Writes Escape `|`:** A title or alias holding `|` written into a MarkdownPM table cell goes through `cellToSource`, or the row splits (R-11, B-176, E-35).
- **`TextCell` Decline:** Link values need a declined link menu on `TextCell`, or its read-only menu pre-empts the parent's value menu (T-04).
- **Pasted URLs Need a Scheme:** Keep `pastedUrl`'s scheme rule for bare addresses, or `3.14` pasted into a link retargets it (E-36).
- **Paste Inside a Link Is Strict:** It reads the container strictly inside the token. `linkTokenAt` is inclusive at the resting seat (E-25).
- **One Tile per Page per Document:** First-per-title stays, so two editors never write one page (E-32).
- **Caret Paths Can't Use the Draw:** `drawnTokens` can't serve the caret paths (B-163), and a caret/draw chunk memo can't be shared (B-114: 499 of 528 lines missed).
- **Load-Bearing Pieces:** The lazy alphabetical sort in `pageIndex.ts` (A-130) and `linkEntry`'s YAML unwrap (A-50) both stay.
- **Persisted Keys:** `link_display` and the settings keys can't be renamed for vocabulary (B-184).
- **What Can't Move to `Core/Connections`:** `ConnectionsApi` (it imports UIX), `ConnMenuTarget`, and `tokenTarget` (B-185…B-187).
- **Right-Click Doors at Rest:** The resting editor door needs `stopPropagation` without `preventDefault` (R-20, Q-37). At rest, role rows act on whatever element has focus, so Cut, Copy, and Paste are renderer-resolved (R-19).
- **Identical-Text Commits:** A resting commit of identical text still records an empty undo step (M10-04).
- **A Raw `![[]]`:** An inserted `![[]]` shows raw while its picker is open (M11-02). An embed commit can open the alias slot (M11-04); it self-heals.

### 16. Environment and Gates

- **Gates (From the Repo Root):**
  - `npm run typecheck` is the only type gate.
  - `npm run test`. The baseline at `42a18f4a5` is 521 files and 7,528 tests. `Autocomplete/connectionCommit.test.tsx`'s "reads no layout as it moves within the link" can flake under load; rerun it alone.
  - `npm run lint`. Inside a worktree under `.claude/`, run `npx biome check Core UIX Desktop Sync`, because `biome check .` skips the path.
  - Biome formats TS, CSS, and JSON on write. After shell edits, run `npx biome format --write <files>`.
- **Launching the App:** `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`. The test Nexus is `~/Test`. Read `.claude/Guidelines/Development-Environment.md` before driving.
- **Commits:** On `active`, hook-pushed. Messages are past-tense and terse, ending with the `Co-Authored-By` line. Unattributed changes to adjacent docs are usually Nathan's; bundle them, don't revert them.
- **Docs:** Follow `~/The Studio/.claude/references/Studio-Documentation.md`. Correct a claim surgically, with no amendments.
- **Line Deltas:** Production only, excluding comments and tests, reported as ±(+/−).

### Appendix: What Nathan Was Asked

Each topic put to Nathan in this session, with the §5 entry holding his answer. `Ruling Log.md` has each question and answer in full.

| Topic | Answer |
|---|---|
| Building on Link Gestures, the line target's baseline, scope | §1, §2 |
| Neutral reviews: who gets what, the rubric, veto, effort | §4.3, §4.4, §4.5 |
| What "connection" and "link" mean in code and docs | §5.1 |
| The resting MarkdownPM table cell: what it offers at rest, focus, writes vs typing rows | §5.6 |
| Link property pages behaving like every link; aliases; Format on values; padding clicks; `[[#H]]`; `[x](Page)` renames | §5.7 |
| One look for unresolved links; the plain-syntax setting's reach | §5.4 |
| Menu rows and labels for every link; `[x](Page)` authoring; copy labels | §5.5 |
| What a pasted `[x](Something)` means; Paste As keeping title and heading; Plain Text | §5.8 |
| Embeds: one rule, lone duplicates, self-embeds, headed embeds, the Matrix | §5.3 |
| Heading lists from the index | §5.9 |
| Parity for `§` runs at rest, rectangle paste, and drop | §5.4, §5.8 |
| F-094 now | §5.11 |
| Paste into a link, and its alias rule across syntaxes | §5.8 |
| Edit Title / Edit Link following the same alias rule (delegated to the most coherent choice) | §5.8 |
| Column Format on cells | §5.7, §14 |
| Property value cells vs MarkdownPM table cells at rest | §5.1, §5.6, §5.7 |
| `[[`, `![[`, and `[label](` opening the picker without Pair Brackets | §5.9 |
| Remove Title On Link Change when Edit Link is followed by a paste | §5.8 |
