### Properties Deepclean — Decisions & Intention

**DATE:** 10-21-2026
**STATUS:** ACTIVE

### Context

### Overview

#### Concepts

---

### Decisions

1. [CONFIRMED] The deepclean answers to *BRIEF.md*'s *§Principles* and *§Look Out For*, which every planning document, agent dispatch, session handoff, and continuation procedure copies one-for-one.
2. [CONFIRMED] The scope is the Properties system by responsibility — `Core/Properties` and the property logic held anywhere else — including the journal, replay, and sweep machinery Contexts and Properties each carry for one pattern (I-036).
3. [CONFIRMED] The Archive work is complete, and how it changed the Properties system's reach into archived files is current ground truth for the inventory.
4. [CONFIRMED] No Nexus beyond NexusOS, `~/Test`, and the Benchmark Nexuses needs to keep reading, so a read path for a shape only earlier Pommora builds wrote becomes removable once a scan of those Nexuses finds nothing holding it.
5. [CONFIRMED] A Multi-Select registering the unknown and externally-added words its members hold as options is intended current behavior.
6. [CONFIRMED] Finding the behaviors Nathan never asked for is part of the deepclean's mandate, and each one reaches him as a decision carrying its explanation.
7. [ASSUMED] This session runs through *§Decisions*, and possibly the plan, with execution continuing in fresh sessions from *BRIEF.md* and a handoff.
8. [CONFIRMED] Removing a property from a Collection keeps taking its values off the Collection's pages and keeping them in that Collection's own settings file, so re-adding the property brings them back; Nathan's July ruling of no dormant foreign values on pages (7-2 C-3, C-6) stands. The stash is meant to lose nothing under sync, drop entries for pages that have left the Collection, and let a Remove that missed pages be retried, and planning investigates every issue around it that keeps this behavior intact, with a better home for the stash than the Collection's settings file encouraged where planning finds one.
9. [CONFIRMED] Every option is meant to carry a permanent id, the way properties already do, so views, tiles, and the Matrix filter refer to options by id, a rename touches only the property list, and sync can merge options one at a time; pages keep storing the option's word. NexusOS's views, tiles, and property list that name options by label are converted once.
10. [CONFIRMED] Collapsed groups are meant to be remembered per property, as hidden groups already are, with NexusOS's existing collapsed groups converted rather than reopening once.
11. [CONFIRMED] Context stays a property type. Created Time and Last Modified Time are meant to leave the property types and become their own kind of file-derived field, with a name such as Filedata or Metadata, sitting in the same category as a page's Aliases and its ID where that fits; planning investigates what already exists for them and where they belong before naming or placing them, noting that "metadata" already names the page metadata in `Core/Nexus/pageMetadata.ts` and `.nexus/metadata/`.
12. [CONFIRMED] Title and Icon, built-in fields like the two timestamps, aren't property types either, so the split leaves the property types holding the nine user types plus Context; planning investigates how Icon is held today alongside Title.
13. [CONFIRMED] Every property, Context, and Space is meant to keep its own crash-recovery note, so unfinished work on one never blocks or unprotects a change on another, and every change that rewrites many files writes one. Planning presents the current file structure — which recovery files exist, which part of Pommora owns each, and how a change flows through them today — beside the proposed revision before designing it.
14. [CONFIRMED] Every change that rewrites many files updates the property or Context list first and the files second, as a property rename does today.
15. [CONFIRMED] A delete that can't reach every page finishes what it can and offers Try Again for the rest, for properties, Contexts, and Spaces alike.
16. [CONFIRMED] Creating a property under the name of a deleted property whose cleanup is still unfinished is refused with the general unfinished-change message, and its Try Again gives that cleanup another run; the new property never takes the cleanup over.
17. [CONFIRMED] Undo is meant to put back what the file held, recorded by the part of Pommora that writes the file, rather than re-sending what a cell or the panel showed.
18. [CONFIRMED] Undo puts back only the property that was edited, leaving the small tidy-ups the edit made to other properties on the page in place.
19. [CONFIRMED] Undoing a Link value also takes back the page alias that value added.
20. [CONFIRMED] Finding which pages and Spaces hold a property or a tag is meant to run through one shared mechanism, the best available scan for both, unless planning finds evidence that one of them needs its own.
21. [INFERRED] A change reaches every file where its key means something: a property's key means something on the pages of Collections and the Archive, and a Context tag means something on any page, including loose pages outside every Collection, so the one mechanism keeps that difference as its stated rule.
22. [INFERRED] A restore from the Trash that can't update a Space's settings file reports it as a warning rather than ignoring it.
23. [CONFIRMED] Sync's merge rules stay as they are, since Sync is expected to be rebuilt soon. The losses that come from how Sync merges — a property deleted on one device while edited on another, two devices creating the same name, two devices editing one page, and option lists, assignment lists, and the removed-values stash each merging whole — are recorded as inputs for that rebuild, and a fix here is taken only where it removes the problem without adding a rule to how Sync works.
24. [CONFIRMED] Settings that apply only to the current view share one word, and the Properties pane shows one row for a view's look on every type that has more than one look.
26. [CONFIRMED] Status options stop storing their group's id, with NexusOS's property list stripped of it once.
27. [ASSUMED] A Trash entry's "partial" mark, recording that some values couldn't be read when it was made, is shown where its restore is offered rather than removed.
28. [CONFIRMED] Deleting a property keeps creating a Pommora Trash entry in either Trash mode.
29. [INFERRED] Under decision 23, the stash losing nothing under sync (decision 8) and options merging one at a time under sync (decision 9) become inputs for the Sync rebuild, unless planning's placement or shape for them achieves it without adding a rule to Sync; option ids still land for what they fix outside Sync.
30. [CONFIRMED] An option's Remove is labeled Delete, so Remove only ever names something that can be undone or restored.
31. [INFERRED] Deleting a property or an option asks first only when at least one Item holds it, following the rule the Archive's deletes use, through one shared confirmation rule rather than another copy; planning finds the Archive's rule and reuses it.
32. [CONFIRMED] A filter's date picker uses the column's clock, and text holding only spaces counts as empty on every surface.
33. [CONFIRMED] Unchecking a checkbox keeps removing its key by default.
34. [CONFIRMED] A Link row's label gains the value's Edit and Rename on right-click, where planning finds that's the cohesive move.
35. [CONFIRMED] The text editor pen's spoken label reads "Open In Editor."
36. [CONFIRMED] Kept as intentional: a row added in the Properties panel stays shown until it resets on another page, and cards hide a chip's remove button below 80% zoom.
37. [CONFIRMED] The view accidents are fixed: a filter value Pommora can't read is ignored rather than matching every page, a Checkbox's "is not empty" filter works, and deleting the property a view groups by keeps which folders were collapsed.
38. [INFERRED] Empty values sort last for every type, and dragging a row into another value's run in a sorted view keeps reassigning its value.
39. [CONFIRMED] Every type's editor shares one layout with its spacing fixed, and every type's editor rows carry icons as the Date editor's do. The Decimals picker keeps reading "Hidden" when unset, and a fraction denominator of zero or less is refused. The option popup's title field and footer stay as they are, and planning raises where they differ from the app's standard pieces.
40. [CONFIRMED] A Date property carries its own format, which its columns follow unless a column overrides how it displays, and a date column with no style shows no time.
41. [INFERRED] The same pattern — the format on the property, display overrides per column — holds for Number and Link.
42. [CONFIRMED] Kept as intentional: a Select's compact chip keeps its tag icon, with the feature document corrected, and Status groups a user creates keep the dashed-circle icon.
43. [CONFIRMED] Repair Properties On Open is on by default, and creating a property under a taken name tells the user it took a numbered name.
44. [CONFIRMED] An editor whose property disappears returns to the property list, and a damaged property list opens the Nexus with Properties marked unreadable, as Contexts already do.
45. [CONFIRMED] Whether the value picker can create Status options is planning's to recommend.
46. [CONFIRMED] The edge rules *Properties Deepclean — Investigation*'s *§Edge Rules to Confirm* lists stay, apart from the questions still open under *§Open Items*.

---

#### Constraints

- Nathan's drafts `Studio-Brainstorm-V2` and `Plan-Creation` govern the decisions and the plan, with their blank sections filled as *BRIEF.md*'s *§Procedure Sources* lists.
- Every finding or decision put to Nathan carries an explanation in plain, non-technical English, with its technical evidence kept apart and complete.
- Planning re-investigates the mechanics behind every decision here against the code before designing it, rather than designing from the Investigation's summary alone.

#### Rejected

- **No Crash-Recovery Notes:** dropping the notes would leave a change the app quit during split between old and new names, with nothing able to finish it.

- **Retiring the Removed-Values Stash:** leaving a removed property's values on the pages, hidden in that Collection, puts back the dormant foreign values Nathan ruled out in July (7-2 C-3).

#### Open Items

- **File Values on Cards:** whether adding a File value from a card's chooser keeps its typed-path field or opens the system file dialog as every other route does.
- **Deleting With No Holders:** what "the same none-before-one as archive does" names, which decision 31 reads as asking only from one holding Item up.
- **The Partial Mark:** whether "add Partial accordingly" means showing the mark where a restore is offered (decision 27) or something else.
- **Several Words Under a Select:** whether a Select or Status holding several words keeps showing the last one Pommora recognizes.
- **Unrecognized Words on a Pick:** whether picking a Select value, a Multi-Select value, and a Context tag all keep or all drop the words Pommora doesn't recognize.
- **Checkbox Unchecking Option:** whether a per-property choice to write `false` on uncheck belongs in this work or under *§Prospects*.

Outside Properties: `.claude/scripts/reveal-parity/run.mjs` looks for a button that now reads "Delete alias" and needs fixtures the rebuilt `~/Test` doesn't hold.

#### Prospects

- **Sync Rebuild Inputs:** a property deleted on one device while edited on another leaves a fragment that stays in `properties.json` (pinned as intended by `mergePolicy.test.ts:130-136`); two devices creating one name leave the later definition hidden; two devices editing one page lose one edit outside the conflict capture; option lists, a Collection's assignment list, and the removed-values stash each merge whole.

- **Option Approval:** a Multi-Select's unknown and externally-added words are scanned and offered to the user to approve or deny as options, in place of registering them on their own.

---

#### Sources

- `.claude/Planning/Properties Deepclean/BRIEF.md`
- `.claude/Planning/Properties Deepclean/Properties Deepclean — Investigation.md`
- `.claude/Planning/Properties Deepclean/Properties Deepclean — Scout Reports.md`
- `.claude/Planning/7-2 - ViewPane Properties Flow — Decision Log.md` at `052ceec63` — C-3 and C-6, the Remove stash's origin
- `.claude/Features/PropertiesPM.md`
- `.claude/IssuesPM.md` — I-006, I-032, I-035, I-036, I-039, I-042, I-063, I-064
- `~/NexusOS/.nexus/properties.json` — no type id an earlier build wrote
