### Path Links — Decisions & Intention

**DATE:** 10-16-2026
**STATUS:** RATIFIED 10-16-2026

### Context

Connections resolve by title through one title index (`Core/Connections/pageIndex.ts`) that both processes build from the one tree walk (`Core/Nexus/record.ts`). A page's title is its file basename, so two pages in different folders can share one; a bare link to a shared title reads **Ambiguous**, muted and following nowhere, and while clicking an unaliased one opens the picker on both holders, a pick writes the same bare title back. Wikilinks admit `/` in their title slot but resolve `[[A/Notes]]` as the title `A/Notes`, which nothing holds, and markdown links refuse any destination holding `/` as an address (`namesPage`, `Core/Connections/links.ts`). A link names a heading after a `#` (`[[Page#Heading]]`); a `§` typed into a link's title becomes that `#` on the keystroke, and under Automatic In-Page Heading Resolution a bare `§Heading` in prose reaches a heading on its own page. The app's searches match three ways: the sidebar, a view, and a filter's Contains field match titles fuzzily, the Trash matches a title or a location, and the picker matches a title prefix.

Every cascade decides which links name a page by comparing normalized title keys rather than by resolving them. A page rename rewrites links by title and skips entirely when another page holds the old title; a page move, a set move, and a collection or set rename rewrite nothing; a heading rename on one of two same-titled pages also rewrites links aimed at the other page's heading. A delete strips other pages' Link values by title and a restore refills them, while a page sitting in the Trash, a hidden folder, is reached by no cascade, so its own links go stale and its restore drops a returning Link value whose title nothing holds. A move or rename made outside the app reaches Pommora as an unrelated delete and add, and cascades nothing. Nathan's own Nexus holds real duplicates of the shape this targets (`Studio/Sapphire/ClaudeMD.md` and `Studio/Pommora/ClaudeMD.md`).

### Overview

The intent is that two pages sharing a title stop being a dead end. Pommora should write a link to such a page in Obsidian's path form, `[[Folder/Sub/Title]]` and `[Label](Folder/Sub/Title)`, the full path from the Nexus root without the extension, and keep writing a bare title wherever the title is unique, as Obsidian's own writer does; it should read partial paths as Obsidian does, so a shortened path that still names one page resolves.

One naming rule should serve every writer, one resolver should read every form in every syntax and surface, and one resolution-based re-spell should keep every link pointing at the page it pointed at through a rename, a move, a folder rename or move, a collision, or a restore, wherever the change was made. Every search should match one way, and a click on an unresolved link should land in its title so the picker can resolve it. Since path links are rare, the machinery is meant to stay cheap, reuse what the architecture already has, and leave the codebase with less.

#### Concepts

- **Path Link:** a link whose title slot carries a folder path before the title: a full path from the Nexus root (`[[Studio/Pommora/ClaudeMD]]`) or a partial tail of one (`[[Pommora/ClaudeMD]]`).
- **Bare Link:** a link naming a page by its title alone (`[[ClaudeMD]]`), resolving only while one page holds that title.
- **Written Name:** the name Pommora writes when it names a page itself (a pick, Copy Link, a collision's re-spell): the title while the page is its sole holder, otherwise the full path.
- **Collision:** an event that gives a title a second holder, turning existing bare links to the first holder ambiguous.
- **Re-Spell:** rewriting a link that resolved to a page before an event so it resolves to the same page after.

---

### Decisions

#### A - Writing and Reading Paths

- **A-1 [CONFIRMED]:** Pages sharing a title should be treated as an expected outcome of ordinary use and resolved through path links; titles should never be forced unique.
- **A-2 [CONFIRMED]:** A link to a page whose title another page shares should be written in Obsidian's path form, the full path from the Nexus root without `.md` or a leading `/`, in wikilinks and markdown links alike; a link to a uniquely titled page should stay a bare title, matching what Obsidian's own writer produces.
- **A-3 [CONFIRMED]:** Picking a shared title from the picker should write the full path form.
- **A-4 [CONFIRMED]:** Pommora should read partial paths as Obsidian does: a path that is some page's full path should name that page; otherwise a partial path should name the one page whose path ends with it, reading Ambiguous where several do and Phantom where none does. Relative paths (`./`, `../`) aren't meant to be read.
- **A-5 [CONFIRMED]:** Pommora should read a `.md` extension in a page link of either syntax (`[[Notes.md]]`, `[Notes](Studio/Pommora/Notes.md)`) but never write one; today markdown links read it and wikilinks don't. The extension is read on the page half alone, before the `#` that opens a heading, in both syntaxes: `[[File.md#Heading]]` names page `File`, while everything after the `#` is heading text whatever it ends with, so `[[File#Text.md]]` names heading `Text.md` and no trailing extension there is ever dropped.
- **A-6 [INFERRED]:** A written name whose folder holds a character the wikilink grammar can't spell (a Finder-made folder holding `#`, `|`, or `]]`) should fall back to the markdown form as a whole, through the same fallback an unspellable title already takes.
- **A-7 [CONFIRMED]:** Nothing should shorten a link for its own sake: a written link should keep its form wherever it still resolves (on paste, Paste As, a Link field commit, Show Full Link, and every cascade) and be re-spelled only where it would otherwise break; a path link should never shorten back when a collision goes away.
- **A-8 [CONFIRMED]:** File values and asset references aren't connections, so path links don't apply to them; whatever the change touches in the shared reader should leave how they read exactly as it is.
- **A-9 [CONFIRMED]:** `#` should be the only heading opener inside a link, in both syntaxes, as in Obsidian. A `§` inside a link target is ordinary text, so files and Obsidian-made pages named with `§` (`Cover§1.png`, `Para §3`) link like any other name, and a `§` that lands in a link without being typed (pasted, or written by another tool) reads as part of the title, a phantom the click rule (C-1) resolves in one pick. `§` keeps its meaning outside the link grammar: typed into a link's title (or a markdown destination naming a page, path links included), it becomes `#` on the keystroke and opens that page's heading list, so the file only ever holds `#`; under Automatic In-Page Heading Resolution, a bare `§Heading` in prose resolves a heading on its own page and never another page's, and typing `§` in prose opens that page's heading list; and links display `Page § Heading` per Heading Link Style. This reverses the Heading Opener plan's second opener, whose standalone fixes stay.

#### B - Drawing and Ambiguity

- **B-1 [CONFIRMED]:** A path link should draw its title only, its folder path hiding with the brackets and revealing with the caret.
- **B-2 [CONFIRMED]:** Ambiguous should remain its own state, distinct from Phantom.
- **B-3 [INFERRED]:** Ambiguous should also cover two files in one folder whose names differ only by case or Unicode form (`Notes.md` and `notes.md` on a case-sensitive drive), since both answer one normalized path.
- **B-4 [CONFIRMED]:** An ambiguous link should be resolved through the picker alone: its rows list every page holding the title, and a pick writes the full path, with no machinery of its own.

#### C - Picking and Clicking

- **C-1 [CONFIRMED]:** Clicking an unresolved link, phantom or ambiguous, in any syntax and on any surface, should seat the caret in its title rather than its alias, so the picker opens on the title by itself; this should be one rule merging today's separate click-and-seat mechanisms. Its one exception carries its reason: once the caret is already inside an unresolved link being edited, a click places the caret where it lands, so the alias can still be clicked into.
- **C-2 [INFERRED]:** The click rule should ride the existing link-slot seating channel (the Rename and Edit Title seats and their appliers) as one more arm, reaching the body and every live editor through the one pointer path, a resting cell through its existing hand-off, and a Link value through the value editor's open; it changes nothing for a resolved link, whose click follows, glances, and offers its menu as today.
- **C-3 [CONFIRMED]:** A resting Text value keeps today's behavior: a click opens its field with the caret at the end, and a click on an unresolved link inside the open field then follows the one rule, so the two-click path rides the same seat rather than plumbing of its own; the planning phase should fold the field's opening into that seat wherever it does so without new machinery.
- **C-4 [CONFIRMED]:** Edit Link should select the link's target everywhere: in a page body, in a table cell, and in a Link property value's field, which today opens with the caret at the end instead.
- **C-5 [CONFIRMED]:** A title pick should keep the link's written heading where the picked page holds that heading and drop it where it doesn't, so re-aiming `[[Shared#Intro|A]]` at one of two holders keeps `#Intro`, while a pick of a page without it writes no dead heading; this is the keep-form rule applied to the heading, and it replaces today's drop of every heading on a title pick.
- **C-6 [INFERRED]:** Picks writing the path form and the location matching should land before the click rule, which does nothing useful without them.

#### D - One Search

- **D-1 [CONFIRMED]:** Every search the app has should match one way, merging today's duplication: the connection picker (pages, headings, aliases), the sidebar search, the Trash, a view's search, and the folder search inside a filter's Contains field should share one matcher that scores an item by its name or its location, so typing a folder narrows the picker as it narrows every other search. No search box is added where none exists today (option pickers, pick trees, Settings).
- **D-2 [CONFIRMED]:** The block menu's type-to-filter, a search over block labels and their sections, should join the one matcher too, keeping its sections.
- **D-3 [CONFIRMED]:** Icon search stays its own: it ranks a synonym vocabulary in tiers, a different job that fuzzy matching would flood.
- **D-4 [INFERRED]:** The one matcher should own the match test, the query fold, and the location key, and nothing else: each surface keeps its own order, ranked lists ranking by score while a view, a heading outline, a folder tree, the block menu, and the alias list keep their native order. It scores an item by its name or by its full location including its name, the better of the two, with a typed `/` read as a word break, so `Pommora/Cl` finds `Studio/Pommora/ClaudeMD` and a plain title query ranks as it does today.
- **D-5 [INFERRED]:** A view's filter rules aren't searches: their named operators (contains, starts with, is) are saved meaning and stay exact.
- **D-6 [CONFIRMED]:** Match highlighting should go everywhere rather than spread everywhere: fuzzy matching scatters the matched letters, the sidebar, the Trash, and views never highlighted, and dropping it deletes the highlight code outright; the alias list's filtering state survives as what disables dragging while a filter is typed. The plan should keep this its own task, so a reversal at ratification leaves the matcher untouched.

#### E - Re-Spelling

- **E-1 [CONFIRMED]:** Renaming or moving a page, and renaming or moving any folder a path link passes through, should keep every link naming the page pointed at it, through one shared mechanism across every format: body links, embeds, table cells, markdown tiles, Link and Text property values, Space sidecars, and property caches. The mechanism should be the most efficient or already-established one: the old-to-new mapping should come from identity (a page's or container's ID across the change), the principle views, tabs, and caches already follow folders by, while the rewrite of link text is genuinely new, since files can't carry IDs.
- **E-2 [INFERRED]:** One re-spell rule should cover every form: a link that resolved to a page before an event should become the tail of the page's new path at the depth it was written (a bare title being depth one, a full path its whole depth), or the full path where that tail wouldn't name the page alone. A link whose tail is unchanged byte for byte should be left as written, so a rename that only changes a title's case still follows into the link, as it does today. `[[A/Notes]]` renamed should read `[[A/Plan]]`, and a bare link should gain a path only where its new name would be shared.
- **E-3 [CONFIRMED]:** A collision should re-spell existing bare links to the original holder into its full path by one rule, whether it comes from a create, rename, or restore inside Pommora or a file arriving from outside it. Move pairing should run before collision detection, so a file arriving under an ID that just vanished elsewhere is read as a move, never as a collision.
- **E-4 [CONFIRMED]:** A move or rename made outside Pommora (Finder, Obsidian) should adjust links as an in-app one does; one made while the app was closed should be repaired on the next open. Nothing pairs an outside move today, but the lane outside heading renames already ride is the one to reuse: the content index notices the change, it's owed, and the next settle pays it, while the open-time seed catches what changed while the app was closed. Since an outside rename often lands as an unlink and an add in separate watcher batches, the pairing should remember a vanished page ID across settles. The first open after an index generation bump reseeds from nothing, so moves made while the app was closed before that open can't be paired, a one-time limit.
- **E-5 [INFERRED]:** In-app moves should run the re-spell inside the operation, keeping today's warning when a file can't be updated, while outside moves are paid at the settle and only logged, since no one is there to read a notice: one function with two triggers, as heading renames already work.
- **E-6 [INFERRED]:** Operations that change a page's address (rename, move, delete, restore, create) should run one at a time under one gate, and that gate should also cover the re-spell a settle pays, so an operation can't start while a settle is mid-sweep; whether that means the host lock spans the settle's payment or in-app re-spells move to the settle is the planner's call.
- **E-7 [INFERRED]:** A heading rename on one of two same-titled pages should rewrite only links that resolve to that page, ending today's cross-twin rewrite.

#### F - Trash

- **F-1 [CONFIRMED]:** A folder deleted in Pommora takes its pages to the Trash with it, so links to them read as phantoms until a restore, and a "reordered" folder means one moved into another folder, since sidebar order alone changes no path.
- **F-2 [INFERRED]:** A page that lands somewhere new because its old folder is gone (restored from the Trash after its Set was deleted, for one) should count as a move, so links still naming its old path follow it, under the move rule rather than a rule of its own.
- **F-3 [CONFIRMED]:** Link values in other pages' frontmatter should keep being stripped when a page is deleted and written back by the restore, as they are today; Pommora should never touch the body of a page in the Trash.
- **F-4 [INFERRED]:** The existing Trash link machinery (the delete's strip and record, the restore's scrub and refill rebuilt under the landed name, the parking into a trashed page's bundle, the empty's hand-off, Restore Links On Deletion) should be reused rather than rebuilt, re-keyed from a page's title to the page each value named, through the same resolution the re-spell uses.
- **F-5 [CONFIRMED]:** A page returning from the Trash should have its own stale links, in its body and its frontmatter, resolved and repaired as it comes back, so a link whose target moved or was renamed while the page sat in the Trash follows that target. The page leaves the Trash first and its links are rewritten after, so its body is never touched while it's there. Nathan expected this to work today for title-only links; it doesn't, so this is a repair folded into the restore rather than a fold of something already working.
- **F-6 [INFERRED]:** The restore's scrub (a returning page's own Link values) and its refill (other pages' values that named it) should become one rule rather than two: a link the delete recorded re-spells, at the restore, to the current name of the page it named, by that page's identity, and only a link whose page is truly gone is dropped or parked. The delete already reads every page it moves, so recording what each outbound link named costs no extra read.

#### G - The Outcome

- **G-1 [CONFIRMED]:** The outcome should read as though the architecture around it always intended it, even where that means changing root-level things. The design should stay cheap, since path links are rare; the merges this work carries (search, the unresolved-link click, the data-level rules) count toward a codebase left with less, and every addition should earn its place.

---

#### Constraints

- **Guiding Principles** (the owner's, verbatim, for planning and execution alike):
  - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, making a wrong behavior correct, or delivering a required behavior in minimal form.
  - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers.
  - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules.
  - **Better, Rather Than Moved:** Complexity that's relocated, renamed, or exchanged for new complexity of similar weight counts as no improvement.
  - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains.
  - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- *BRIEF.md*, beside this document, carries the owner's standing principles and working rules for the planning session, and the plan ends behind the same neutral `fable-high` verification gate the Connections & Aliases Restructure used.
- The Locked Decisions hold: the Nexus stays legible from its file structure alone, the database stays a regenerative index, concurrency stays recency-first, and every decision is weighed against platform scale.
- The hard rules hold: the host owns the machine, `Core/Contract` is the only channel, the app never depends on the renderer, reads and writes stay separable, and no expensive work runs on a high-frequency trigger.
- *Path Links — Scout Findings* holds every scout's verbatim brief and report from these rounds, each marked with what a later decision superseded, and names the mechanism forks the scouts left open; its citations are leads to re-verify at the planning session's HEAD.
- **Other Workstreams:** the Heading Opener plan (`.claude/Planning/Heading Opener/Heading Opener — Plan.md`) landed `§` as a second heading opener in `50a1c2cf3`; Nathan ruled (10-16-2026) that the second opener reverts while its standalone fixes stay (A-9), and the revert landed in `14da3f152`. It restored the grammar, the spelling rules, `repeatsTarget`, `carry`, and `names.ts` to `8606e26e8`, and kept `UNSPELLABLE` shared by adoption and the asset writer (with `§` allowed in file names again, refusing as an invalid name), `literalOrBracketAt` shared by the `§` transforms and the prose picker arm, `inUrlRun` in `markdownCode.ts` with section runs skipping a bare address, and the link settle dropping an emptied heading's `#` where a title remains. The plan closed with `INDEX_GENERATION` at 17 (`5f2d429d8`), since the kept address rule changes which section rows are indexed, so the generation bump Path Links needs goes to 18. A path link's page half ends at the `#`, its folder splitting off inside that half.

#### Rejected

- **Nexus-Wide Unique Titles:** forcing every page title unique, as asset names are, would remove path links but fights the per-project shape ordinary use produces and can't stop files arriving from outside.
- **Canonical Shortening:** re-spelling every written link to its shortest resolving name on paste, on a Link field commit, or when a collision goes away; machinery for no real problem.
- **An Ambiguous Link Menu:** a click or menu offering each holder; the picker already lists them and writes the path.
- **Exact Paths Only:** reading only full paths; Nathan wants Obsidian's reading of a partial path that still names one page.
- **New Search Boxes:** adding type-to-filter to the option pickers, pick trees, or Settings, which have none today; the merge covers searches that exist.
- **Per-Letter Highlighting:** emphasizing each scattered fuzzy match in every search; more code for a treatment most searches never had.
- **`§` as a Second Link Opener:** the Heading Opener plan's `§` opening a heading inside link syntax; it broke files and Obsidian-made pages named with `§` and needed rules for how two openers interact, to rescue a `§` that only arrives in a link from outside Pommora, which the click rule (C-1) now fixes in one pick.
- **A Reserved Extension List:** a list of file extensions that stop a heading opener from splitting a link; a second rule in the grammar, colliding with real headings such as `Node.js` and diverging from Obsidian.
- **Whole-Target File Reading:** file references reading everything between the brackets so an opener inside a file name survives; unneeded once `#` is the only opener, since Pommora and Obsidian alike refuse `#` in a linked name.

#### Open Items

1. **Reading `.md` (for the planning phase):** how cheaply a `.md` extension can be recognized in a wikilink's title slot, and where that belongs so both syntaxes read it through one rule, weighed with its own care. File values, banners, and covers read through `wikiTitle`, which shares the wikilink reader: if the title slot's `.md` drop reached it, a File value `[[Report.md]]` would read as `Report`, so file references must keep reading as they do today.

#### Prospects

- **Images in Page Bodies:** when a renderer draws `![[photo.png]]` in a page, a lone embed line whose whole target names an existing asset should draw that asset ahead of reading it as a page link.

---

#### Sources

- `Core/Connections/pageIndex.ts:31-69` — the title index and `resolve`
- `Core/Connections/links.ts:36-39` — `namesPage` refusing `/`
- `Core/Nexus/rename.ts:37-42` — the rename skipping when the title is held elsewhere
- `Core/Nexus/move.ts:26-67`, `Core/Nexus/folderEntity.ts:52-64` — moves and folder renames with no cascade
- `Core/Connections/rewrite.ts:26,92` — title-key equality deciding which links a cascade rewrites
- `Core/Nexus/heldPages.ts:38-53` — `titleHeldOutside` and `frozenWorld`
- `Desktop/FileWatch/watcher.ts:38,106,124-131` — external renames arriving as an unlink and an add, often in separate batches
- `Core/Index/indexSeed.ts:124-142`, `Core/Nexus/fileEvents.ts:292-309`, `Core/Nexus/settle.ts:124-178` — the outside heading-rename lane: noticed by the index, owed, paid at the settle, caught up at open
- `Core/Trash/spend.ts:59-91,185,265`, `Core/Trash/holdings.ts:69-94`, `Core/Trash/restoreScrub.ts`, `Core/Nexus/cascade.ts:82-160` — the Trash's link strip, scrub, refill, parking, and hand-off
- Commits `031952078` (the restore refill and Restore Links On Deletion), `e605d9b15` (a Link value names only a page that exists; parking and the empty's hand-off), `3f0b84bf1` (Space and cache Links follow their page), `3e0907013` (what the switch governs)
- `Core/Paths/caseFold.ts:28-74`, `Core/Navigation/navSearch.ts`, `Core/Settings/TrashFrame.tsx:51-58`, `Core/Connections/pageIndex.ts:54-67`, `Core/Views/Pipeline/search.ts`, `LocationField.tsx:22-32`, `blockMenu.ts:85-106` — the searches
- `Core/MarkdownPM/Links/linkEdit.ts:32-40`, `linkClicks.ts:63-110`, `Core/MarkdownPM/Tables/cellStatic.tsx:444-557`, `Core/Properties/Pickers/ValueEditor.tsx:145-151` — the link-slot seats and click paths
- *Path Links — Scout Findings* — every scout's verbatim brief and report
- `obsidian.d.ts` `MetadataCache.fileToLinktext` — "If file name is unique, use the filename. If not unique, use full path."
- https://obsidian.md/help/links — `%20` encoding and the optional `.md`
- https://forum.obsidian.md/t/settings-new-link-format-what-is-shortest-path-when-possible/6748
- https://forum.obsidian.md/t/absolute-link-path-has-higher-precedence-than-relative-path/69542 — a full vault path taking precedence
