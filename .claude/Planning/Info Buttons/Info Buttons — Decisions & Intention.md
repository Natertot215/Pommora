### Info Buttons — Decisions & Intention

**DATE:** 10-27-2026
**STATUS:** RATIFIED 10-27-2026

### Context

Pommora explains its rows through one-line captions beneath each title, which Settings calls hints: 63 in the Settings window's frame roster (`Core/Settings/frames.ts`), carried to the row as its `caption` and drawn as the row's `subLabel` (`UIX/Menus/MenuIndex.tsx`, `MenuRows.tsx`). A caption can't explain what each option of a picker does, and many rows carry none. What the idea builds on already exists: a read-only MarkdownPM editor (`PageReaderWindow`) and a dwell-opened `PickerMenu` holding one (the glance, `GlancePane`), MarkdownPM editing inside a dropdown (`TextPane`), UIX's own hover reveal (`useHoverReveal`), the button types (`base`, `tinted`, `solid`, `filled`, `destructive`) with an optional outline, and a mirror watcher that keeps codebase documents and NexusOS notes in two-way sync (`~/.claude/scripts/cross-file-mirroring/`).

### Overview

An **InfoButton** glyph sits at the end of a row's title; resting on it or clicking it opens an **InfoPane**, a dropdown that reads a Markdown explanation of the row and its options. Every explanation lives once, under its own ID, in an **InfoIndex** Markdown file that rows cite by ID and that Nathan edits from NexusOS. The work also gives a row's secondary line one name, `caption`, along the path the InfoButton's slot travels.

#### Concepts

- **InfoButton:** the small glyph button a row carries beside its title; the citing row picks its glyph, button type, and border.
- **InfoPane:** the dropdown an InfoButton opens, reading one InfoIndex entry as read-only Markdown.
- **InfoIndex:** the one Markdown file holding every entry, each wrapped in a tag naming its ID.
- **Caption:** a row's secondary line beneath its title — Settings' "hint," `MenuRow`'s `caption`, `MenuItem`'s `subLabel` today.
- **MenuDesc:** the centered note a pane shows on its own, such as "No headings" — `MenuCaption` today.
- **The Glance:** Pommora's link and location preview — a dwell-opened pane showing a page, one at a time app-wide, governed by the Hover Previews setting (`Core/Interface/Glance/`).
- **Live Drive:** a script under `.claude/scripts/<Name> Drive/` that builds the app, launches it against `~/Test`, and drives it over CDP through the cases its `MATRIX.md` lists.
- **Two-Wave and Neutral Review:** two rounds of paired reviewers (one reading the diff or plan inward, one outward against the codebase), each round folded before the next, then a reviewer given only the before and after and a plain statement of intent (*Disclosable Bundles — Plan · §Final Verification*).

---

### Decisions

#### A - The InfoButton

- **A-1 [CONFIRMED]:** An InfoButton sits at the right end of a row's title, always shown, and opens an InfoPane below it reading a Markdown explanation of what the row is attached to. It's named InfoButton, since it's a button and UIX's `Label` is the chip.
- **A-2 [CONFIRMED]:** An InfoButton takes its glyph, its button type, and its border as independent props — exclamation point, question mark, and "i" to start, over the existing button types, Nathan's "clear" being `base`, bordered or borderless as `Button`'s `outline` offers — open to a narrower set later. [INFERRED] The three glyphs are `circle-alert`, `circle-question-mark`, and `info`.
- **A-3 [INFERRED]:** A click on the glyph, or anywhere in its pane, never reaches a clickable row beneath it; `PickerMenu` stops pointerdown and contextmenu bubbling but not click.
- **A-4 [CONFIRMED]:** An InfoButton works on a disabled row, dimmed with the row. [INFERRED] That overrides the disabled row's `pointer-events: none` (`UIX/Menus/menu-row.css.ts:158`) for the glyph alone.
- **A-5 [CONFIRMED]:** An InfoButton's accessible name is its row's title, a spaced hyphen, and "Info": "Date Format - Info."

#### B - Opening & Closing

- **B-1 [CONFIRMED]:** With a cursor, resting on the glyph for 0.5 seconds opens the InfoPane, and a click on the glyph opens it and holds it open; on touch, a tap opens it. [INFERRED] A held pane closes on a second click of its glyph, on Escape, or on a press outside it (`PickerMenu`'s `focus="keep"`: modal, no shield, the trigger counting as inside); a hover-opened pane closes the same ways, which takes `useHoverReveal` returning its `reset` (`UIX/Interactions/hoverReveal.ts:81-86`, `:156`).
- **B-2 [CONFIRMED]:** Hover Previews doesn't govern InfoPanes, and the 0.5-second dwell is the InfoPane's own value, separate from every other dwell for now. [INFERRED] The hover comes from UIX's `useHoverReveal`, whose fixed 1.5-second dwell (`hoverReveal.ts:12`, `:77`) becomes a duration each caller passes; its other callers keep 1.5 seconds. The glance can't serve: it's Core's, one pane app-wide, and switched off by Hover Previews: Off.
- **B-3 [CONFIRMED]:** One InfoPane is open at a time; opening one switches from whichever is open. [INFERRED] Leaving an unheld pane already closes it, and a click on another glyph is an outside press that closes a held one, but nothing closes a held pane when another glyph's hover opens its own (the dismissal stack closes on presses and Escape only, `UIX/Interactions/dismissalStack.ts:77`, `:88`), so the InfoButtons share one open slot in UIX that a new open takes over.
- **B-4 [INFERRED]:** On touch, the InfoButton passes no dwell, reading the reveal's coarse-pointer test once it's exported (`UIX/Interactions/hoverReveal.ts:18`), and opens on a tap; the reveal's other callers keep resting open on touch, as they do today (`:156`).

#### C - The InfoPane

- **C-1 [CONFIRMED]:** Core owns the InfoButton, its pane, and the InfoIndex, building the button from UIX's button, hover reveal, and dropdown and filling the pane with read-only MarkdownPM; UIX gains no InfoButton file, only generic pieces such as a row's slot after its title. [INFERRED] The pane's body mounts only while the pane is open, since `PickerMenu` renders nothing closed (`UIX/Pickers/PickerMenu.tsx:305`), so a frame of rows citing entries builds no editor until one opens.
- **C-2 [INFERRED]:** Entries read as page-scope Markdown — headings, lists, code, emphasis, and web links — through `MarkdownEditor`, the one renderer that draws blocks; the table cells' static renderer (`Core/MarkdownPM/Tables/cellStatic.tsx`) draws inline marks and lists only. The host is inert and passes no connections, so `[[connections]]` carry no meaning and embeds don't build in an entry (`Core/MarkdownPM/Embeds/embedWidget.tsx:394`, `Core/MarkdownPM/Links/linkClicks.ts:56`); the history reader's host, which resolves links against the Nexus, isn't copied.
- **C-3 [CONFIRMED]:** The InfoPane's text can't be selected or copied. [INFERRED] That takes a rule of the pane's own, since Pommora's read-only editors keep their content selectable on purpose (`Core/MarkdownPM/readOnlySelection.test.tsx:14`).
- **C-4 [CONFIRMED]:** The InfoPane doesn't size itself by dragging, as `PickerMenu`'s optional `resize` would let it.

#### D - The InfoIndex

- **D-1 [CONFIRMED]:** Every explanation lives once in an InfoIndex file of Markdown entries, each wrapped in a tag naming its ID (`<date-format>`, a blank line, the Markdown, a blank line, `</date-format>`); a row cites its entry by ID, and no copy is duplicated or inlined. Headings stay free for organizing the file.
- **D-2 [CONFIRMED]:** Rows cite entries by ID through one Core call, the pattern the test scans for, so one entry can serve several rows; the call also takes the row's title for A-5's accessible name. [INFERRED] The app reads the InfoIndex as text through Vite's `?raw` import and parses its entries once, when the module loads.
- **D-3 [CONFIRMED]:** A minimal test holds the InfoIndex and its citations together: every cited ID resolves to an entry and no cited entry is empty, so a row carries an InfoButton only once its entry has wording. An entry no row cites is a draft and passes, so nothing written in NexusOS breaks the tests. The test is written last, while the examples still cite their entries.
- **D-4 [CONFIRMED]:** Nathan writes every InfoIndex entry's wording. The work's only entries are the four examples, `label-format`, `value-format`, `date-format`, and `aliases`, in Claude's wording, exercising formatting, layout, and syntax for the live drive's matrix; they leave with their citations, and the InfoIndex ends empty.
- **D-5 [CONFIRMED]:** The InfoIndex is in-app information, a step toward release, not the user guide the Locked Decisions name.

#### E - Editing From NexusOS

- **E-1 [CONFIRMED]:** Nathan edits the InfoIndex's wording from a NexusOS document, `Studio/Pommora/II. Resources/PM-Info-Index.md`. It gets there through `.claude/Resources/`, which holds `PM-Info-Index.md`, a symlink to `Core/Info/InfoIndex.md`, so the folder's own doc-tree row in the mirror map carries it to NexusOS and the mirror keeps NexusOS's frontmatter on the vault side.
- **E-2 [CONFIRMED]:** Wording edits made in NexusOS land in Pommora's working tree and commit with the next session's work, as Nathan's other edits do; `auto-push.sh` doesn't change.

#### F - Rows & Captions

- **F-1 [CONFIRMED]:** The InfoButton enters through the shared menu-row recipe (`MenuItem`, reached through `MenuRow`), so any surface built on it can carry one. This work ships no citing row: the Label Format and Value Format rows in a property's settings (`Core/Properties/Schema/formatRows.ts`; Nathan's "Key Format" is the one labeled Label Format), Settings' Date Format row, and a page's Aliases row carry example InfoButtons while the work is built and verified, and the work's last step removes them, so Nathan's own rows are implemented on the finished mechanism.
- **F-2 [CONFIRMED]:** Captions stay as they are; nothing migrates into the InfoIndex. InfoButtons sit beside captions.
- **F-3 [CONFIRMED]:** A row's secondary line takes one name, `caption`, in place of `hint`, `caption`, and `subLabel`. It rides with this work because the InfoButton's slot travels the same three seams (`SettingsWindow.tsx:57`, `SettingsFieldRow.tsx:16`, `ManageRow.tsx:37`).
- **F-4 [CONFIRMED]:** `MenuCaption`, the centered note a pane shows on its own — empty states such as "No headings," and the filter's hand-authored note — becomes `MenuDesc`, so `caption` names only a row's secondary line and `hint` keeps its one meaning in UIX, a field's value affix (`FieldPicker`, `EditableInput`).
- **F-5 [INFERRED]:** `SettingsFieldRow` leaves, and the `path`, `exclusions`, `previewRules`, and `clear` Settings rows take their whole row rather than a label and a hint (`SettingsWindow.tsx:194-201`): the path and clear rows build through `settingsRow`, the exclusions and preview-rules rows through `ManageRow`, which takes their label and caption; `NexusRows`' five field rows build through `settingsRow` too, its inert rows staying literal.

#### G - Verification & Completion

- **G-1 [CONFIRMED]:** The live drive drives the example rows in the working tree's own build; unit tests carry their own samples.
- **G-2 [CONFIRMED]:** The examples stay live through the implementation and its verification, and are removed after it, leaving nothing of them in the tree; the work is complete then. [INFERRED] Every review's statement of intent says real rows come later, so a mechanism without production callers reads as intended, and the unit tests keep exercising the InfoButton and the pane directly.

#### H - Scope & Process

- **H-1 [CONFIRMED]:** Every placement of a new file comes to Nathan before it's written.
- **H-2 [CONFIRMED]:** The work reuses what UIX and MarkdownPM already hold — the row recipe, the buttons, the hover reveal, `PickerMenu`, and the read-only editor — rather than hand-rolling them.
- **H-3 [CONFIRMED]:** There's no Figma design for the glyph or the pane.

#### Planning Rulings (10-27-2026)

- **No Real Rows Yet:** no row carries a real InfoButton in this pass; temporary examples on Label Format, Value Format, Settings' Date Format row, and a page's Aliases row show the proof of concept, each entry exercising every Markdown construct the editor draws, and leave after verification (F-1).
- **No Headings in Entries:** an entry carries no heading, since the row's title already names what its pane explains.
- **The Overnight Run:** execution runs headlessly; the drive's screenshots are read and shown in chat; the docs gain about four lines (InterfacePM's *§InfoPanes*, `CLAUDE.md`'s structure line), with renamed identifiers corrected in place; `HistoryPM.md` gains one entry, *App Information Index*.
- **IDs:** an entry's ID is its row's title in lowercase kebab case — the examples' are `label-format` and `value-format`.
- **Default Look:** an InfoButton defaults to the `info` glyph, the `filled` type — the button's grey rounded square behind the outlined glyph — and no border; a citing row overrides any of the three.
- **Live Testing:** the live drive carries example entries for formatting and layout (D-4, G-1).
- **Pane Width:** the InfoPane starts at 285px wide.
- **No Screenshot Stop:** Nathan takes no visual pass of his own before the final report.

- **Placements:** nothing new goes in UIX; `Core/Info/` holds `InfoButton.tsx` (the button, `infoFor`, and the pane's contents), `info-button.css`, `InfoButton.test.tsx`, `InfoIndex.md`, `infoIndex.ts` (its format), and `infoIndex.test.ts`; `settingsRow` moves to `Core/Settings/frames.ts` beside `RowText`; the temporary drive is `.claude/scripts/Info Buttons Drive/`.
- **Outside Pommora's Repo:** The Studio's `.claude/dashboard/src/showcase/MenuLeaf.tsx` takes the `caption` rename in The Studio's own commit; `mirror-map.md` doesn't change.
- **No Missing-Entry Guard:** a cited ID with no entry, or an empty one, fails D-3's test; nothing at runtime hides the glyph. Nathan left it to Claude.
- **The Iteration Window:** `Core/Interface/Windows/IterationWindow.tsx` holds a temporary disabled citing row and the glyph, type, and border variants for the drive, removed with the examples.
- **The Drive Retires:** it leaves with the examples; its matrix and results go into the plan's Results document.
- **The Tags in Pommora:** the drive checks how the examples' tags draw in Pommora on `~/Test` with HTML Formatting on and off.
- **The Resources Folder Returns:** `.claude/Resources/` returns holding only the InfoIndex's symlink (E-1), so `mirror-map.md:101` reads true again; `Deployment.md`, `Distribution.md`, and `Libraries.md` describe a tree that's gone and aren't restored, so the watcher moves their NexusOS copies to the vault's trash.
- **The Dropdown:** the InfoPane opens and places itself through `PickerMenu` exactly as every other dropdown and hover reveal does; `PickerMenu` doesn't change.
- **The InfoPane's Pointer:** the pane's text takes no pointer at its root, everything inside it included, so the pane has no hover behavior and nothing in it presses, selects, focuses, or copies; the web links in its prose keep theirs, and the editor's `editable` switch keeps the keyboard out (C-3). Table drag handles and reveals aren't a concern anywhere in this work.
- **The Dashboard Line:** `.claude/CLAUDE.md`'s `// Dashboard` line leaves, since the dashboard lives in The Studio.
- **Claude's Calls, Approved:** `useHoverReveal` takes `dwellMs` in place of `dwell`, its existing callers passing `REVEAL_DWELL_MS`; `MarkdownEditor` gains an opt-out of selection; the row accessory's overhang becomes one shared class; the Resources symlink lands last, after the examples leave and the empty InfoIndex is committed once.

---

#### Constraints

- **Placement:** every placement of the new files comes to Nathan for approval before it's written into the codebase.
- **Removal First:** the plan leads with what can be removed, consolidated, or replaced across the features this touches.
- **Briefs:** Nathan's *Approach* and *Principles* (below, verbatim) govern every phase and task, and every agent brief — scouts, executors, and reviewers — carries both in full.
- **Process:** the brainstorm runs on the draft Studio-Brainstorm-V2 and planning on the draft Plan-Creation (`~/NexusOS/Studio/Athena/II. Drafts/`), the installed `studio-brainstorm` and `writing-plans` skills filling their gaps; the two-wave and neutral review runs before ratification and again over the implementation, as *MetadataV3 — Implementation Plan* and *Disclosable Bundles — Plan* (`.claude/Planning/Completed/`) ran it.

**Approach (Nathan, verbatim):**

- **Removal First:** any approach first assesses what's true *now* that could be removed, deleted, changed, consolidated, or replaced. The design isn't based on what's currently there with its course adjusted; it ensures totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what's ultimately going to be replaced.
- **Consolidation First:** the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- **Less Stuff:** nothing new is added unless there's evidence it's required. The work ends with cumulatively less in the codebase overall — fewer ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, fewer things to maintain, and fewer headaches in future work — while the line count *may* end up positive. Net-negative lines are the north star, and any net-positive gain has its rationale genuinely backed by this framework and the principles below.
- **Always Intentional:** anything within the surface area reads as always-intentional, without odd-ones-out designs, and reflects the broader codebase's resulting shape rather than remnants of, or adherence to, what's true now and is ultimately going to change. The approach reflects the outcome and isn't bound by constraints that were only relevant before.
- **Look Outward:** look for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted to fit. This work doesn't start from scratch.
- **The Data Layer:** the complex data-level mechanics least reflect Nathan's intentions and mostly reflect what past session agents judged appropriate. Treat them with care and respect, without assuming they're beyond reasonable change; presenting an approach to Nathan may be all it takes to change the codebase for the betterment of everything in it and of future iterations.

**Principles (Nathan, verbatim):**

- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on. 
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements. 
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct
- Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered

#### Rejected

- **A Symlink Into NexusOS:** it commits nothing sooner than the mirror, writes NexusOS's frontmatter into the shipped file, and breaks on devices without The Studio (E-1).
- **The Glance as the Hover:** Core-bound, one pane app-wide, and switched off by Hover Previews: Off (B-2).
- **One App-Wide InfoPane:** a single presenter like the glance would rebuild the pointer tracking that a pane rendered beside its glyph gets from React's tree.
- **The Static Cell Renderer:** draws inline marks and lists only; entries need blocks (C-2).
- **A Generated ID Type:** a script and a staleness test for what one citation call and a scan already give (D-2).
- **Changing the Reveal on Touch for Everyone:** it would change the title search hint and the ViewTile strip on touch (B-4).
- **The Name InfoLabel:** UIX's `Label` is the chip (A-1).

#### Open Items

1. **The Tags in Pommora:** how `<id>` tags draw in a Pommora page under HTML Formatting, which the drive's Group 5 checks.

#### Prospects

- **A User Guide:** the InfoIndex as a step toward the single user guide the Locked Decisions name — an in-app document whose sections InfoButtons could point into.
- **User-Written Notes:** a field where users describe or annotate their own properties, values, or Collections, outside this work.
- **More Surfaces:** InfoButtons on column headers, view settings, confirmation dialogs, and the Nexus and Sync rows that explain nothing today.
- **Links and Kinds:** links between entries, an open-in-guide action, and glyph and type narrowed to named kinds.
- **Captions Into the Index:** captions moving into InfoIndex entries.
- **Shared Dwells:** one dwell value across the app's hover reveals.

---

#### Sources

- `.claude/Planning/Info Buttons/Info Buttons — Scout Findings.md` — the brainstorm scouts' findings, the fresh-eyes read, and their reconciliation
- `.claude/Planning/Info Buttons/Info Buttons — Investigation.md` — the planning investigation, with its cleaned scout reports in `Scouts/`
- `Core/Settings/frames.ts:74` — `RowText` and its `hint`; 63 hints across the roster
- `Core/Settings/SettingsWindow.tsx:54` — `settingsRow`, the hint carried as the row's caption
- `UIX/Menus/MenuIndex.tsx:25` — the `MenuRow` recipe and its `caption`; `UIX/Menus/MenuRows.tsx:94` — `MenuItem`'s `subLabel`
- `UIX/Menus/ManageRow.tsx`, `Core/Settings/SettingsFieldRow.tsx` — the other hint carriers
- `Core/Settings/NexusRows.tsx:165`, `:208`, `:231`; `Core/Settings/frames.ts:706` — captions that report status rather than explain
- `UIX/Buttons/button-base.css.ts:161` — the button types
- `UIX/Pickers/PickerMenu.tsx:111` — `resize`, an opt-in prop
- `Core/Properties/Pickers/TextPane.tsx` — MarkdownPM editing in a `PickerMenu` dropdown; `Core/Interface/Glance/GlancePane.tsx:352` — a dwell-opened `PickerMenu` holding a read-only editor
- `Core/Interface/Windows/PageReaderWindow.tsx:113` — a read-only `MarkdownEditor`
- `Core/Interface/Glance/glanceAction.ts:15` — the glance dwell (1,000 ms link, 600 ms location); `Core/Interface/Glance/GlancePane.tsx:310` — the lock that pins a glance
- `UIX/Interactions/hoverReveal.ts:12` — the reveal dwell (1,500 ms) and grace
- `UIX/Symbols/iconNames.ts` — `info`, `circle-question-mark`, `circle-alert`, `badge-info`, `badge-question-mark`, `badge-alert`, `triangle-alert`
- `~/.claude/scripts/cross-file-mirroring/mirror-map.md` — the two-way mirror between codebase documents and NexusOS notes
- `Core/MarkdownPM/readOnlySelection.test.tsx:14` — read-only editors keep their content selectable
- `Core/MarkdownPM/Tables/cellStatic.tsx:64` — the table cells' static Markdown renderer
- `Core/Properties/Schema/formatRows.ts:30` — the Label Format and Value Format rows; `Core/Pages/AliasesRow.tsx:18` — the Aliases row
- `UIX/Menus/menu-row.css.ts:158` — a disabled row's `pointer-events: none`
- `.claude/scripts/drive-harness.mjs:10`, `:566` — a drive builds and launches whatever `POMMORA_DRIVE_REPO` names
