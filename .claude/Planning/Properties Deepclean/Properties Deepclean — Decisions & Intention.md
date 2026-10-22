### Properties Deepclean — Decisions & Intention

**DATE:** 10-21-2026
**STATUS:** ACTIVE

### Context

Pommora's Properties system is everything whose job is properties: the property list in `.nexus/properties.json`, the values pages carry in their front matter and Spaces carry in their settings files, the editors and pickers that change them, the views that filter, sort, and group by them, and the machinery that rewrites many files when a property changes. It grew across many sessions, and most of its data-level mechanics reflect what earlier agents judged appropriate rather than Nathan's stated intent.

The deepclean began with a full-sweep inventory at `d0595b22d`, verified at `a0f7dc6ff`: nine domain scouts, two reconcilers, and a synthesis produced *Properties Deepclean — Scout Reports* and *Properties Deepclean — Investigation*. Every finding that changes something a user sees or something saved to disk was then put to Nathan in plain terms, and his answers are recorded here and in *§Session Questionnaire*.

### Overview

This log is the authority on intent for the deepclean. It records which of today's behaviors are kept as intentional, which change and how, and what planning investigates against the code before designing each change. *BRIEF.md* holds the principles every planning document answers to, the Investigation and the Scout Reports hold the technical evidence and cite the entries here, and the plan is built from this log once Nathan ratifies it.

Most decisions fix accidents or fold duplicated machinery into one shape; a few change visible behavior on purpose, such as giving every option a permanent id, giving every property, Context, and Space its own crash-recovery note, and making undo put back what the file held. Sync's merge rules stay as they are while Sync awaits its rebuild, so the merge losses found here are recorded under *§Prospects* as inputs for that rebuild.

#### Concepts

- **Property List:** `.nexus/properties.json`, the Nexus-wide list of property definitions, each with a permanent id, a label, a type, and its type's settings.
- **Front Matter:** the block of properties at the top of a page's Markdown file, where a page holds its values; a Space holds its values in its own settings file, `_space.json`.
- **Label Format and Value Format:** a property's settings for how its key and its values are spelled in front matter; changing either rewrites every file that holds the property.
- **The Stash:** the store of values a Remove takes off a Collection's pages, kept in that Collection's settings file (`property_cache` in `_pagecollection.json`) so re-adding the property brings them back.
- **Crash-Recovery Note:** a record written before a change that rewrites many files, saying what the change is, so Pommora can finish it after a crash or an unreachable file; such a change is "owed" until it reaches every file.
- **Try Again:** the action offered when a change couldn't reach every file, which runs the unfinished part again.
- **Option Id:** a permanent id on each Select, Multi-Select, or Status option, which views, tiles, and the Matrix filter refer to in place of the option's word; pages keep storing the word.
- **File-Derived Fields:** values Pommora reads from a file itself rather than from its front matter, such as Created Time and Last Modified Time, in the same category as a page's Aliases and its ID.
- **Reach:** the set of files a change rewrites; today a property change reaches the pages of Collections and the Archive, while a Context or Space change reaches any page in the Nexus.
- **Tidy-Ups:** the small rewrites any edit applies to a page's other properties, such as turning a single-word Select into a one-item list or collapsing duplicates.
- **Partial Mark:** a Trash entry's flag recording that some values couldn't be read when the entry was made.
- **Format and Style:** a property's Format is set on the property and applies across the Nexus; a column's style is a per-view display setting.

---

### Decisions

#### A - Deepclean Setup

- **A-1 [CONFIRMED]:** The deepclean answers to *BRIEF.md*'s *§Principles* and *§Look Out For*, which every planning document, agent dispatch, session handoff, and continuation procedure copies one-for-one.
- **A-2 [CONFIRMED]:** The scope is the Properties system by responsibility — `Core/Properties` and the property logic held anywhere else — including the journal, replay, and sweep machinery Contexts and Properties each carry for one pattern (I-036).
- **A-3 [CONFIRMED]:** The Archive work is complete, and how it changed the Properties system's reach into archived files is current ground truth for the inventory.
- **A-4 [CONFIRMED]:** No Nexus beyond NexusOS, `~/Test`, and the Benchmark Nexuses needs to keep reading, so a read path for a shape only earlier Pommora builds wrote becomes removable once a scan of those Nexuses finds nothing holding it.
- **A-5 [CONFIRMED]:** A Multi-Select registering the unknown and externally-added words its members hold as options is intended behavior and stays.
- **A-6 [CONFIRMED]:** Finding the behaviors Nathan never asked for is part of the deepclean's mandate, and each one reaches him as a decision carrying its explanation.
- **A-7 [ASSUMED]:** This session runs through *§Decisions*, and possibly the plan, with execution continuing in fresh sessions from *BRIEF.md* and a handoff.

#### B - Crash Recovery

- **B-1 [CONFIRMED]:** Every property, Context, and Space is meant to keep its own crash-recovery note, so unfinished work on one never blocks or unprotects a change on another, and every change that rewrites many files writes one. Planning presents the current file structure — which recovery files exist, which part of Pommora owns each, and how a change flows through them today — beside the proposed revision before designing it.
- **B-2 [CONFIRMED]:** Every change that rewrites many files is meant to update the property or Context list first and the files second, as a property rename does today.
- **B-3 [CONFIRMED]:** A delete that can't reach every page finishes what it can and offers Try Again for the rest, for properties, Contexts, and Spaces alike.
- **B-4 [CONFIRMED]:** Creating a property under the name of a deleted property whose cleanup is still unfinished is refused with the general unfinished-change message, and its Try Again gives that cleanup another run; the new property doesn't take the cleanup over.

#### C - The Removed-Values Stash

- **C-1 [CONFIRMED]:** Removing a property from a Collection keeps taking its values off the Collection's pages and keeping them in the stash, so re-adding the property brings them back; Nathan's July ruling of no dormant foreign values on pages (7-2 C-3, C-6) stands.
- **C-2 [CONFIRMED]:** The stash is meant to lose nothing under sync, drop entries for pages that have left the Collection, and let a Remove that missed pages be retried. Planning investigates every issue around the stash that keeps this behavior intact, and proposes a better home for it than the Collection's settings file where it finds one.

#### D - Options and Groups

- **D-1 [CONFIRMED]:** Every option is meant to carry a permanent id, the way properties already do, so views, tiles, and the Matrix filter refer to options by id, a rename touches only the property list, and sync can merge options one at a time; pages keep storing the option's word. NexusOS's views, tiles, and property list that name options by label are converted once.
- **D-2 [CONFIRMED]:** Collapsed groups are meant to be remembered per property, as hidden groups already are, with NexusOS's existing collapsed groups converted rather than reopening once.
- **D-3 [CONFIRMED]:** Status options stop storing their group's id, with NexusOS's property list stripped of it once.

#### E - Undo

- **E-1 [CONFIRMED]:** Undo is meant to put back what the file held, recorded by the part of Pommora that writes the file, rather than re-sending what a cell or the panel showed.
- **E-2 [CONFIRMED]:** Undo puts back only the property that was edited, leaving the tidy-ups the edit made to other properties on the page in place.
- **E-3 [CONFIRMED]:** Undoing a Link value also takes back the page alias that value added.

#### F - Property Types

- **F-1 [CONFIRMED]:** Context stays a property type.
- **F-2 [CONFIRMED]:** Created Time and Last Modified Time are meant to leave the property types and become their own kind of file-derived field, named something like Filedata or Metadata, in the same category as a page's Aliases and its ID where that fits. Planning investigates what already exists for those fields and where they belong before naming or placing them, noting that "metadata" already names the page metadata in `Core/Nexus/pageMetadata.ts` and `.nexus/metadata/`.
- **F-3 [CONFIRMED]:** Title and Icon are built-in fields rather than property types, so the property types hold the nine user types plus Context. Planning investigates how Icon is held today alongside Title.

#### G - Reach

- **G-1 [CONFIRMED]:** Finding which pages and Spaces hold a property or a tag is meant to run through one shared mechanism, the best available scan for both, unless planning finds evidence that one of them needs its own.
- **G-2 [INFERRED]:** A change reaches every file where its key means something: a property's key means something on the pages of Collections and the Archive, and a Context tag means something on any page, including loose pages outside every Collection, so the one mechanism keeps that difference as its stated rule.
- **G-3 [INFERRED]:** A restore from the Trash that can't update a Space's settings file reports it as a warning.

#### H - Sync

- **H-1 [CONFIRMED]:** Sync's merge rules stay as they are, since Sync is expected to be rebuilt soon. The losses that come from how Sync merges are recorded under *§Prospects* as inputs for that rebuild, and a fix here is taken only where it removes the problem without adding a rule to how Sync works.
- **H-2 [INFERRED]:** The stash losing nothing under sync (C-2) and options merging one at a time under sync (D-1) become inputs for the Sync rebuild, unless planning's placement or shape for them achieves it without adding a rule to Sync; option ids still land for what they fix outside Sync.

#### I - Formats and Styles

- **I-1 [CONFIRMED]:** Settings that apply only to the current view share one word, and the Properties pane shows one row for a view's look on every type that has more than one look.
- **I-2 [CONFIRMED]:** A Date property is meant to carry its own format, which its columns follow unless a column overrides how it displays, and a date column with no style keeps showing no time.
- **I-3 [INFERRED]:** The same pattern — the format on the property, display overrides per column — holds for Number and Link.

#### J - Value Surfaces

- **J-1 [CONFIRMED]:** A filter's date picker is meant to use the column's clock, and text holding only spaces counts as empty on every surface.
- **J-2 [CONFIRMED]:** Unchecking a checkbox keeps removing its key by default.
- **J-3 [CONFIRMED]:** A Link row's label in the Properties panel gains the value's Edit and Rename on right-click, where planning finds that's the cohesive move.
- **J-4 [CONFIRMED]:** The text editor pen's spoken label reads "Open In Editor."
- **J-5 [CONFIRMED]:** A row added in the Properties panel stays shown until it resets on another page.
- **J-6 [CONFIRMED]:** Cards keep hiding a chip's remove button below 80% zoom.
- **J-7 [CONFIRMED]:** Adding a File value from a card's chooser keeps its typed-path field, as cards' file handling is intended.
- **J-8 [CONFIRMED]:** Whether the value picker can create Status options is planning's to recommend.

#### K - View Edges

- **K-1 [CONFIRMED]:** A filter value Pommora can't read is meant to be ignored rather than matching every page, a Checkbox's "is not empty" filter is meant to work, and deleting the property a view groups by keeps which folders were collapsed.
- **K-2 [INFERRED]:** Empty values sort last for every type, and dragging a row into another value's run in a sorted view keeps reassigning its value.

#### L - Property Editors

- **L-1 [CONFIRMED]:** Every type's editor is meant to share one layout with its spacing fixed.
- **L-2 [CONFIRMED]:** Every type's editor rows carry icons as the Date editor's do.
- **L-3 [CONFIRMED]:** The Decimals picker keeps reading "Hidden" when unset, and a fraction denominator of zero or less is refused.
- **L-4 [CONFIRMED]:** The option popup's title field and footer stay as they are, and planning raises where they differ from the app's standard pieces.

#### M - Chip Glyphs

- **M-1 [CONFIRMED]:** A Select's compact chip keeps its tag icon, with the feature document corrected to match.
- **M-2 [CONFIRMED]:** Status groups a user creates keep the dashed-circle icon.

#### N - Trash Records

- **N-1 [CONFIRMED]:** A Trash entry's partial mark is meant to show on the entry in the Trash, and a restore that comes back partial tells the user so in one form or another.
- **N-2 [CONFIRMED]:** Deleting a property keeps creating a Pommora Trash entry in either Trash mode.

#### O - Confirmations and Defaults

- **O-1 [CONFIRMED]:** An option's Remove is labeled Delete, so Remove only names something that can be undone or restored.
- **O-2 [CONFIRMED]:** Every confirmation for removing, clearing, or deleting a property or an option is meant to count the Items it affects correctly, zero included, and name them in one consistent vocabulary, with that counting and wording living in one appropriately placed home that the Archive's and the Trash's confirmations share where they ask the same kind of question.
- **O-3 [CONFIRMED]:** Repair Properties On Open is on by default.
- **O-4 [CONFIRMED]:** Creating a property under a taken name tells the user it took a numbered name.
- **O-5 [CONFIRMED]:** An editor whose property disappears returns to the property list.
- **O-6 [CONFIRMED]:** A damaged property list opens the Nexus with Properties marked unreadable, as Contexts already do.

#### P - Edge Rules

- **P-1 [CONFIRMED]:** A Select or Status holding several words ignores the ones no option names, shows the most recently added valid option, and tidies to that one value on the next change. Planning checks where this differs from today's rule of showing the last registered word.
- **P-2 [CONFIRMED]:** Picking a Select value drops words no option names, a Multi-Select pick keeps them after the picked options, and a Context pick drops Space names Pommora can't find, as today.
- **P-3 [CONFIRMED]:** The remaining edge rules *Properties Deepclean — Investigation*'s *§Edge Rules* lists stay as they are.

---

#### Constraints

- Nathan's drafts `Studio-Brainstorm-V2` and `Plan-Creation` govern the decisions and the plan, with their blank sections filled as *BRIEF.md*'s *§Procedure Sources* lists.
- Every finding or decision put to Nathan carries an explanation in plain, non-technical English, with its technical evidence kept apart and complete.
- Planning re-investigates the mechanics behind every decision here against the code before designing it, rather than designing from the Investigation's summary alone.

#### Rejected

- **No Crash-Recovery Notes:** dropping the notes would leave a change the app quit during split between old and new names, with nothing able to finish it.
- **Retiring the Stash:** leaving a removed property's values on the pages, hidden in that Collection, puts back the dormant foreign values Nathan ruled out in July (7-2 C-3).
- **Numbered Names for an Owed Delete's Key:** a new property reusing a deleted property's name while its cleanup is unfinished would sidestep the cleanup instead of finishing it (B-4).
- **Changing Sync's Merge Rules Here:** Sync is expected to be rebuilt, so a merge-rule change now would add rules to a design about to be replaced (H-1).
- **Moving Context Out of the Property Types:** Context stays a property type (F-1).

#### Open Items

1. Nathan ratifies this log after a plain-English overview of everything the prospective plan changes against what's true now, and planning reuses that overview.
2. Today the Properties panel resets an added row only when the Nexus changes (`PropertyPanel.tsx:151-157`), so J-5's "resets on another page" reads as a change to that behavior while the session recorded it as kept; Nathan confirms which is meant.
3. A clear of a key a page doesn't hold still tidies that page's other properties, while the same clear on a Space changes nothing (02-14); which one is intended hasn't been asked.
4. The Properties panel's right-click on a File value offers less than the same right-click on a card (B-06-01); whether the panel gains the card's actions hasn't been asked.
5. Outside Properties: `.claude/scripts/reveal-parity/run.mjs` looks for a button that now reads "Delete alias" and needs fixtures the rebuilt `~/Test` doesn't hold.

#### Prospects

- **Checkbox False on Uncheck:** a per-property choice for a Checkbox to write `false` when unchecked, in place of removing its key.
- **Option Approval:** a Multi-Select's unknown and externally-added words are scanned and offered to the user to approve or deny as options, in place of registering them on their own.
- **Sync Rebuild Inputs:** a property deleted on one device while edited on another leaves a fragment that stays in `properties.json` (pinned as intended by `mergePolicy.test.ts:130-136`); two devices creating one name leave the later definition hidden; two devices editing one page lose one edit outside the conflict capture; option lists, a Collection's assignment list, and the stash each merge whole. The scouts' candidate rules for the rebuild are a whole-on-absent rule for a property deleted on one side (08-01), per-option merging (`{defs: 3}`, 08 Approach B), per-property and per-page merging for the stash (03-02, 08-06), and front-matter merging key by key at sync landing (08 Approach D).

---

#### Sources

- `.claude/Planning/Properties Deepclean/BRIEF.md`
- `.claude/Planning/Properties Deepclean/Properties Deepclean — Investigation.md`
- `.claude/Planning/Properties Deepclean/Properties Deepclean — Scout Reports.md`
- `.claude/Planning/7-2 - ViewPane Properties Flow — Decision Log.md` at `052ceec63` — C-3 and C-6, the stash's origin
- `.claude/Features/PropertiesPM.md`
- `.claude/IssuesPM.md` — I-006, I-032, I-035, I-036, I-039, I-042, I-063, I-064
- `~/NexusOS/.nexus/properties.json` — no type id an earlier build wrote
- `~/NexusOS/Studio/Athena/II. Drafts/Studio-Brainstorm-V2.md` — this log's template and confidence tags

---

### Session Questionnaire

#### Setup and Alignment

- **Q:** Do the ratified principles stand — Nathan's fifteen reconciled into ten, plus ten new *§Look Out For* entries? **A:** Yes.
- **Q:** Does "the Properties system" mean property logic wherever it lives, including the crash-recovery and sweep machinery Contexts carry in parallel (I-036)? **A:** Yes.
- **Q:** Is the Archive work finished? Its plan reads Ratified with nothing ticked. **A:** It's done; "Ratified" was stale, "Complete" is the right status, and its implications are relevant.
- **Q:** Does any Nexus besides NexusOS, `~/Test`, and the Benchmark Nexuses need to keep reading? **A:** No.
- **Q:** Is there any property behavior you know you never asked for? **A:** Finding those is the purpose of the deepclean. A Multi-Select registering unknown and externally added words as options on its own is intended; scanning them for approval or denial is a prospect.
- **Q:** Does the session shape stand — decisions this session, execution in later sessions — along with the scout roster? **A:** Not answered; taken as proposed.
- **Q:** Was `~/Test` deleted on purpose? **A:** It was accidentally removed. **Q:** Rebuild it through a `test` preset in the benchmark generator? **A:** Yes.
- **Instruction:** Every explanation put to Nathan is in plain, non-technical English, with the technical evidence kept apart and complete.

#### Crash Recovery

- **Q:** Before a change that rewrites many files, Pommora writes one crash-recovery note, and there's room for only one at a time. Should every property get its own note, should there be no notes at all, and how should deletes and reused names behave? **A:** Unsure — he didn't understand what the note is or why the choices matter.
- **Q:** Re-explained through renaming Priority to Urgency: should every property, Context, and Space get its own note, or should there be none? **A:** One note each. Planning presents the file structure, which part owns which, how it works now, and the proposed revision.
- **Q:** Should every change that rewrites many files update the list first, then the files? **A:** Agreed.
- **Q:** Should a delete that can't reach every page finish what it can and offer Try Again, everywhere? **A:** Yes.
- **Q:** Should a new property reusing a deleted property's name, while that delete's cleanup is unfinished, take a numbered name such as "Name 2"? **A:** No — it shows an error with Try Again that gives the cleanup another run, using the general copy.

#### The Removed-Values Stash

- **Q:** In July you ruled that removing a property from a Collection takes its values off the pages and keeps them in the Collection's settings file. The Investigation recommended retiring that store and leaving the values on the pages. Which stands? **A:** Remove the value, but stash it within the Collection, or see if there are issues around that which keep the behavior intact. Planning raising a better placement for that store is encouraged.

#### Option Identity

- **Q:** Should every option get a permanent id, with NexusOS's views, tiles, and property list converted once? **A:** ID.
- **Q:** Should collapsed groups be remembered per property, converting NexusOS's existing ones? **A:** Correct.

#### Undo

- **Q:** Should undo be built from the file's own text, should it put back other properties' tidy-ups, and should it take back a Link value's alias? **A:** Unsure — he didn't understand.
- **Q:** Re-explained through a "Pomora" typo and a bare `Status:` key coming back as `Status: null`. **A:** "When you Undo we should be looking at the FILE, not the cell — how come it's done differently?"
- **Q:** Should undo put back only the edited property, leaving other properties' tidy-ups? **A:** Yes.
- **Q:** Should undoing a Link value also remove the alias it added? **A:** Yes.

#### What Counts as a Property

- **A (Volunteered):** Contexts can stay a property type; Created At and Modified At shouldn't — they can become "Filedata" or "Metadata". Investigate what may already exist placement-wise. They'd go under a similar category as Aliases or ID if possible.
- **Q:** Is Title, like the timestamps, not a property type? **A:** Yes, same with Icon.

#### Where Changes Reach

- **Q:** A Context change reaches loose pages while a property change reaches only Collections and the Archive; Spaces are found by scanning the disk while pages are found from memory; and a failed Space update during a restore is ignored. Which should each be? **A:** "Whatever makes sense. I don't understand why you're recommending things here. Pommora should use whatever scan is best for this; I don't know why properties and Spaces work differently here, but I'd assume they should take one shared mechanism unless there's evidence why that may not be smart."

#### Sync Conflicts

- **Q:** How should a property deleted on one device and edited on another resolve, along with two devices creating one name and two devices editing one page? **A:** Whatever choice fixes the issue without adding rules or making decisions about how Sync actually works; Sync is likely going to be taken down and rebuilt soon.

#### Style and Format

- **Q:** Should each layer of settings — the whole Nexus versus this view — get one word, with one Style row in the pane? **A:** One word per view.
- **Q:** Dates are formatted per view while numbers are formatted per property. Which way should they go? **A:** The format for a date column rides the property's own format, with per-column display overrides.

#### Value Surfaces

- **Q:** Should the table, cards, and panel match one another: the card's typed-path File field, the filter's date clock, spaces-only text, the Link label's right-click, unchecking a checkbox, the panel's added rows, the 80% zoom threshold, and the pen's spoken label? **A:** Cards and how they deal with files are intentional, so the card's typed-path field stays. Filters use the column's clock. Spaces-only text is empty. Keep the unchecking behavior; a per-property option for checkboxes to change that default is a prospect. A Link label's right-click gets Edit and Rename if it's genuinely the cohesive move. The panel's added empty row staying until it resets per page is intentional. The pen's spoken label reads "Open In Editor". The card's chip-remove behavior below 80% zoom is intentional.

#### View Edges

- **Q:** Should the view accidents be fixed: an unreadable filter value matching every page, a Checkbox's "is not empty" passing every page, empty values sorting by five rules, and deleting a grouped property forgetting collapsed folders? **A:** Fix, obviously.

#### Property Editors

- **Q:** Should every type's editor share one layout, and what about editor-row icons, the option popup's title field and footer, Decimals reading "Hidden", and a fraction denominator of zero? **A:** The Decimals picker's "Hidden" is intentional. The fraction-zero issue gets fixed. The Date editor's rows are intentional as they are; Date being the only editor whose rows carry icons gets fixed. The option popup's title field and footer are fine as-is, but planning raises where the discrepancy is. The spacing issues get fixed.

#### Display Defaults

- **Q:** Should unstyled date columns stay time-less, should a Select's compact chip use the Select type icon, and should user-made Status groups get their own glyph? **A:** A date column's format rides the property's own format, with per-column display overrides. Unstyled stays the time-less default. Keep Select's single tag icon. The user-made Status group glyph is intentional.

#### Small Things Saved to Disk

- **Q:** Should Status options stop storing their group's id, what should happen to the Trash's unread "partial" mark, and should deleting a property keep creating a Trash entry in system Trash mode? **A:** Remove Status options' group ids, stripping NexusOS once. The Trash's partial flag shows its partial declarations, and when a partial restoration happens it's shown to the user in one form or another. Keep creating a Trash entry for property deletes.

#### Confirmations and Wording

- **Q:** Deleting a property or option asks even when no page holds it, clearing asks past one page, and an option's "Remove" is permanent. How should confirmations count, and should the option's Remove read Delete? **A:** Deleting properties takes the same "none-before-one" as the Archive does, potentially as a new or reusable DRY opportunity. Clarified: in an appropriately moved location within the codebase, removing and clearing properties and options have their counts reflected properly, with the confirmation's counting and vocabulary correct. The option's "Delete" label — yes.
- **Q:** Should an editor whose property disappears return to the list, and should a damaged property list open the Nexus with Properties marked unreadable? **A:** Agreed.
- **Q:** Should Repair Properties On Open be on by default? **A:** Agreed.
- **Q:** Should Pommora tell the user when a create takes a numbered name? **A:** Yes.
- **Q:** Should the value picker create Status options? **A:** Planning approaches it with the most appropriate recommendation.

#### Edge Rules

- **Q:** Do the edge rules earlier agents chose stand? **A:** The rules seem right.
- **Q:** A Select or Status holding several words shows the last registered one. Does that stand? **A:** It ignores any unregistered values and tidies on the next change as previously established, while an added option, if it's a valid option, replaces the less recent one; this may or may not change existing behavior.
- **Q:** Select, Multi-Select, and Context picks handle unrecognized words differently. Does that stand? **A:** Current behavior is intended.

#### Inferences Recorded Without Objection

- The stash's and options' sync goals become inputs for the Sync rebuild unless placement or shape achieves them without a Sync rule; option ids land regardless.
- Number and Link follow Date's pattern: the format on the property, display overrides per column.
- Empty values sort last for every type; drag-to-reassign in a sorted view stays.
- Every type's editor rows carry icons as Date's do.
