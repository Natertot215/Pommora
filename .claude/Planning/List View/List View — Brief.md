### List View — Brief

**DATE:** 11-09-2026
**SOURCE:** Nathan's opening message, verbatim.

### Process

Start with exploration and investigating what relates to what I'm presenting — assume what you’re looking for may already exist in some sense.

Use the NexusOS/Studio/Athena/II. Draft versions of Plan-Creation and Studio-Brainstorm-V2 for the process that should act as the replacement for the existing writing-plans and studio-brainstorm skills. These are the work-in-progress updates; fall back to the current skills where there are any gaps, but assume the drafted versions are the ones you should prioritize.

Use the recently completed planning documents to inherit the Constraints — the principles the plan must adhere to and the requirements for having any agent dispatch follow and inherit them — as well as the two-wave + neutral perspective review process for *both* the pre-implementation planning phase and the post-implementation final integration reviews. MetadataV3 is a very good reference.

If planning doesn’t really need much from me, or there really isn’t much for me to decide on, that should be an acceptable option. Consider that rework in this area has already happened before, so there’s likely intention behind anything you’d flag as “unintentional” — that doesn’t mean it’s beyond changing when it makes sense.

Keep responses brief and to-the-point. Use proper formatting and don’t bury me in information. Present what I actually want to know.

Don't start planning based on any decision log. The Intention document is the intention doc that goes to planning; we don't need review waves for that alone. When that happens, go back through what we've gathered so far and send an agent with zero context. Ask them to simply digest the idea and search the codebase with just the decision log in hand. Tell them to find or ask questions THEY have, or that may seem known from this context, while an outsider would not understand.

Don't describe it. Just tell them to read the log and infer from what that agent can find alone. Don't describe the feature in your prompt at all. No "Locked — Don't re-raise" or anything like that; if they find something we've already decided, that's the point. This should be an effective fresh-eyes perspective that breeds honest questions and discussions.

### Context

- Pommora’s views are quite decentralized to allow for swap-in-like addition of new views with shared behavior where possible; this was the recent focus of a prerequisite cleanup arc in anticipation for future views.
- Pommora’s UIX and interaction layer is well-established. What I’m describing and what exists almost certainly already exists. If you’re looking at potentially adding UIX/Interaction, look for the thing within the codebase first.
- <the-idea> is my rough notes based on my limited understanding of the codebase. it’s a rough draft. It should also be useful for looking at the stuff I already describe as hints towards what I’m confident in already existing — it’s what *I* design, based on *my* understanding of the codebase, so it’s almost certainly grounded in real evidence.
- I’d like to see if `UIX/Menu`s is the actual basis for creating list-rows, or if it’s own `ListRow` component would actually be more appropriate. 

### The Idea

Lists will be Pommora’s third view-type under `Core/Views/ListView`. ListView would use very similar components to TableView — it would reuse the same drag-handles, content inset, and indentation-nesting methods. ListView would essentially be a compact-row style TableView, with the values of properties being shown as “Card-Like” side-by-side values rather than within individual cells.

ListRows would show the items title with a hover-plus button to the right of the title which would open `MetadataPicker` to select and add properties/contexts like how CardView does it when Style = Compact. When you select a property/space to add, it would go onto the row itself with a spacing token between values decided by either reusing the ones given on Cards, or with our own spacing token (around 4-6px between values). When multiple different properties are assigned to the same row, they’d be separated with segments like seen within SegmentRun; this would be between properties, not values — it would allow multiple chips of a multi-select right next to singular select value to be distinguished. Here’s an example where `|` is the segment:

`(Icon)(Page) | [value] [value] | [value] +`

There wouldn’t be segments for the trailing edge, and the hover-plus would be aligned to the right-most position of the list’s row (the title when blank, or the left-most value). Single-click within that properties segment would open its picker. 

Text properties would be given max-widths before ellipsis  and prompting the TextPane opening glyph. 

ListView would use the exact same “Bands” as TableView and CardView — folders, values, and anything that can take the form of a collapsing and dragged grouping band would remain unchanged within ListView as it does everywhere else in terms of the design I’m going for.

ListView would use right-left positioning for it’s properties. They’d either default to the right of the view’s row, or go to the left. This would be manageable through the views LayoutFrame

```
< Settings.       Layout
--——-
    Right.       |    Left
Property.  (Eye) | Property.  (Eye)
--—
```

It’s hard to explain in codeblocks, but essentially it would be a dual-column with `fill-quaternary` columns. Left + Right would use centered menu heading parts. You’d be able to re-order these from left-to-right within this pane. Left column would be top-to-bottom, right-to-left within the actual views layout; right would be left-to-right. So the top of the “Left” column would be the right-most positioned property; the top of the “Right” column would be the one right next to the pages title. Horizontal-drag would use the existing `UIX/Interactions` displacement-like behavior while vertical would use the tried-and-true drag-line method used by pretty much everything else. This also means the MaxWidth of the LayoutPane would be increased due to the need to fit side-by-side rows; with that being given though both columns getting their own max-width before ellipses and OverScroll — I’d go with 200px each column to begin with. The columns side-to-side padding would be quite small; probably the current compact menu-row style.

Hiding views here would remember their position. This “LayoutFrame” would replace “VisibilityFrame” for ListView settings — there wouldn’t be an individual `VisibilityFrame` for ListView. Alternatively, SettingsFrame can keep the `Visibility` leaf as another entry point to just the single-column list — I’d *prefer* this for menu-parity sake, although I recognize the redundancy. 

ViewFrame for lists would look like this. I’m using `Item Icons` as whatever toggles whether pages show their icons — I don’t exactly remember what that setting is called. “Wrap Rows” would be another toggle depending on if that’s added or now.

```
< Views. Settings
---
[3x2 view grid]
---
Layout >
Filter >
Group >
Sort >
---
Item Icons (Toggle)
Outlines (Toggle)
--
```

Each property type would default to left-or-right positioning. Dates, Numbers, Links, and Checkboxes would allign and assign themselves to the right by default. Chip-based Multi-Select, Select, Status, and Contexts would default to the left. Metadata such as created/modified would go to the right.

Right-clicking a value would show `Format > / Style >` options for the properties (chip style, date format, ect…) like how TableView does so via its column styles.

ListView Layout options would also have the ability to show or hide indentation lines. This is the disclosure-row indentation used across things like tree-like pickers as seen within grouping and filtering, and also the PageOutline menu. It would be managed through the LayoutFrame `Outlines [On/Off]` behind the LayoutFrame for the main-views setting frame; it would be at the root-level for when it’s within ViewFrame. This would do exactly what it says. 

Grouping and filtering mechanics *should* be almost or literally identical to how TableView works — I don’t anticipate or require any differences here, but I may be wrong. I don’t see why they would work any differently since they’re both quite similar views. 

ListView would also get the same Scale options for the entire view as CardView and TableView does. Unlike TableView’s “Borderless” and CardView’s “Compact/Standard” full-view-level formatting options; ListView wouldn’t have on that I can immediately think of besides the prospective wrapping option.

Visibility when assigning properties via `MetadatePicker` would automatically make the property visible, like how cards work. Hiding a property visibility-wise, while still being able to manage it would work the same way. This is another example of cross-view similarity — this time with CardView — and potential one-for-one reuse that would be part of ListView’s core design.

Group-level drag-and-drop, nesting and indentation, and other interactions of reordering within the view would use the same design-level rules and behavior as TableView. I’m not anticipating any differences here since both views are pretty much the same in terms of vertical layout and behavior, with the horizontal and lack-of-columns design being the only material difference.

Value-Wrapping could be included if it’s determined that it makes sense. This would be based on a padding value between the closest right-to-left distance between properties placed on the left of the view versus the right, so they don’t squash up against each-other. There would be a padding value that defines how close `Page (Left value) <-> (right value)` can get before wrapping. I’d assume 12-16px would be a good starting point here.

It’s either we build wrapping now, or simply have the view itself expand like tables do. This should be weighed depending on how “easy” adding row-wrapping would be, and how it could potentially go towards TableView and cell-wrapping which was already something I’ve discussed and entertained the value of during the text properties implementation.

### Constraints

- Any planning must include removal-first emphasis. We’re tackling cross-feature work that likely has room to result in “less” within other areas. Nothing is added unless it’s determined its own absence would leave a real gap.
- Nathan's <approach> and <principles> govern every phase and task, and every agent brief on this topic — scouts, executors, and reviewers — carries both sections in full.
- And any and all placements of these files would need to come to me first so I approve of where they go within the codebase.
- Nothing here should be designed in isolation where it should actually adhere to the shared-first design priorities of the remaining view structure.
- Documentation changes should be surgical and follow `c/studio-documentation`. ListView is the least unique of the view types, so its own doc and mention within others should be feature-overview-level and quite brief in comparison.

### Approach

- Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
- We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and fewer headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
- Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
- Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
- The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.

### Principles

- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on. 
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated from the perspective of its value in enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements. 
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
- Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.

### Planning

1. **Look Outward First:** before designing any piece, name every function, field, file, or rule it would add, and scout what already exists for each.
2. **Verify Nathan's Claims:** check every architectural claim he makes against the tree and report what contradicts it, plainly; he wants it. Many previous plans had corrections that were flagged against what went unnoticed during the brainstorming process, and each correction changed the design.
3. **Ask, With a Read Attached:** where an answer reads more than one way, stop and ask, with what was found, what it implies, and the call put up for correction; Nathan isn't technical, so each question is explained in plain terms.
4. **Disclose In-Flight Calls:** a judgment made during planning or execution is stated in chat when it's made, and recorded where it changes an outcome.
5. **Write With Intent:** decisions and plans state intended behavior as intent ("should"), separate from statements of how the code works today, so a future reader never takes a decision for a fact or a fact for a decision.
6. **Explain:** Don't assume Nathan reads the docs you’re writing, let him know what needs to be known and explain things in chat directly; don’t leave things ambiguous or unresolvable from discussion alone.

### Planning Directives

**DATE:** 11-09-2026
**SOURCE:** Nathan's message opening the planning handoff, verbatim.

I want you to write a handoff prompt that captures my directives and allows you to best complete headless and unatended end-to-end planning and reviews. Each phase and task's are investigated by the code yourself, and written yourself; agent's do reviews, syntehsis and cross-source elimination. Just like both views existing files, comments stay very, very brief and minimal; mostly file-level format sectioning. Documentation changes should be surgical, the Archive section of Collections was written by me, so that's good reference. Describe the feature in enough detail without over-detailing the code or things that dont actually matter, net-negative edits to adjacent claims are encouraged. Weigh in-flight decisions against approach and principles, make the best choice, and make the choice known In-chat if you'd think its something I'd reasonable want to change -- don't obsess over things I couldnt care less about. When the session of planning and review is done, give me the full plan summary + the same "outside-perspective" yet detailed overview of what gets built. If anything genunelly needs my decision, make it known, and also ensure its alternatives have been properly scoped so you know if its even worth mentioning at all. Use the multi-wave review process. Every future handoff must carry my directives. Use the send notification tool at key moments.

**Mid-Session, 11-09-2026 (on the property pane's column headings):**

the headingROw Left Right should use the actual menuheading style. Don't handroll

**Mid-Session, 11-10-2026 (on row height):**

List rows must be less tall than tables. They’re compact

**Mid-Session, 11-10-2026 (on a selected row's highlight; "ris" confirmed as "row"):**

The highlight thing works — trust me. If it doesnt work properly for lists, have it highlight the ris

**At the Tuning Stop, 11-10-2026 (the numbers stand as landed):**

Looks good, fix the pane overlap and have it compress the view like tables and cards do. Also make the banner-line inset that of cards, not tables. Otherwise you need to live-test this yourself since I'm unavailable

**Mid-Session, 11-10-2026 (on the pane's column width):**

Also make pane-max 180px each column instead of 200

**Mid-Session, 11-10-2026 (on the spacing between groups):**

Also lists should use the dynamically slightly larger padding between the bottom row of a group and the next band. I beleive cards or tables already solved this so that groups have slightly larger indentation between the last row of that group and the top of the next when open, but even while closed

**Mid-Session, 11-10-2026 (on screenshots):**

I also want to see screenshots of wrapped rows at multiple indentation levels, chips before titles, and grouped-properties

**Mid-Session, 11-10-2026 (on live testing):**

Take it through the full testing of every single possible configuration matrix of behavior and interacrion

**Mid-Session, 11-10-2026 (on the title's weight):**

lets also have lists have titles using emphasied text like card titles do so their titles are more pronounced

**Mid-Session, 11-10-2026 (told that a List row's content sits 4px nearer the next group's heading than a Table's):**

thats what i was talking about earlier

**Mid-Session, 11-10-2026 (on the pane's columns sizing to their names):**

have the columns expand to that max width; but not use it when there arent properties that require it

**Mid-Session, 11-10-2026 (answering three questions in order: whether the pane's two columns stay equal; whether the room from a group's heading to its first row should match a Table's; where the selected row's highlight shows):**

They should stay equal to each other. 
No, it shouldn't; it should be scaled accordingly as compact, which it already should be.
I can't reproduce it, so either force it, or figure out how to implement it where the row gets highlighted in accordance to it's indentation level with 2px border-radius

**Mid-Session, 11-11-2026 (shown the selected row's highlight at each indentation level):**

Nevermind, just remove the selected row highlighting for now

**Mid-Session, 11-11-2026 (told the removal left a selected List row with a Table row's full-width highlight):**

No highlights for lists

**After the Final Report, 11-11-2026 (shown the neutral reviewer's "no" and its eleven corrections):**

Fix the neutral review issues
