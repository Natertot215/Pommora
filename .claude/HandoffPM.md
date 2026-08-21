## Handoff — Pommora

> **User Prompt:** *"Setup task-tracking to do these one by one, then drive the live footnote test page to confirm each change lands. Use my live nexus and reload dev instance if necessary. Each claim needs a verification criteria. And also target any other issues un-seen."*

#### Current Focus

**Session ID:** c4f4da52-41c4-44a8-8d74-c3d59695d897
**Dates:** 08-20-2026 → 08-21-2026
**Model:** Opus 5 (1M context)

**Footnotes have now been driven against the running application, and the interaction pass is closed.** All 23 tasks of `.claude/Planning/Footnotes — Implementation Plan.md` landed across six phases; the closeout added a whole-range simplification, a neutral verification of the Delivery Claim and an attack pass, and a later review swept the arc for duplication, bloat and errors. Every claim now carries a falsifiable criterion, recorded in the plan's §Interaction Pass table, and each was driven over CDP against `Footnote-Testing` in the live nexus. The record is PM-111, and the Implementation Log remains the authority on every deviation and in-flight decision.

**The live pass made findings, and each needed a fix rather than a note.** Nine reports came in and nine landed. Two were not what they read as. *"Clicking a line in the footnotes doesn't place the caret there"* was a table defect: a block widget's vertical margin sits outside the box it measures, so CodeMirror's height model ran short by the gap for every table on the page — 24px by the citations of a two-table page, more than a 21px row, seating every click one row low. It affected everything below a table on any page. *"Verify the cascade works across duplicate defs"* was false: deleting the last reference took only the row that binds and left a same-label duplicate standing as an orphan, where the renumber had always moved the pair together. The rest: the marker's hit-test came off its offset range and onto the drawn glyph, so a press beside it seats a caret; a resting table cell claims its own marker's press and travels; the tail guard refuses whitespace alone rather than writing a blank line into the body; the citation row's number glyph stopped swallowing its right-press; and the footnote section's disclosure became one page-keyed state every surface resolves, which is what makes the toggle work in the floating preview and the hover card.

**Verified live:** the caret seats in the row it is aimed at (per-line drift 24px → 0) · a press beside a marker holds the scroll and a press on it travels (0 → 396) · a cell's marker travels without opening the cell · starting a list at the foot of the section adds no whitespace-only line to the body · the citation glyph claims its right-press · a hover card draws the page's own footnote state rather than the nexus-wide default. **Not driven:** the native right-click menu's own pop, which cannot be screenshotted.

#### Completion Criteria

- [x] **The boundary is derived once** and every layer reads it.
- [x] **Markers draw positional and act** — the glyph travels or follows, both menus, cascades keyed to the range and answering the same over both deletion keys.
- [x] **The section hides and shows** through one page-keyed state that the Subfield control, the divider, a marker jump, the floating preview and a hover card all resolve and write.
- [x] **Creation is complete and reversible** — three doors, each one transaction one undo takes back whole, each renormalizing.
- [x] **Nothing strands the section** — the tail guard, proven against the sweep and an attack pass.
- [x] **The record is written** — the feature's section, PM-111, Context restated, six entries routed to `Editor-Internals.md`.
- [x] **Nathan has ruled on the two flagged decisions** — the relocate rule with the pasted footnote's shaping stands as built, and the setting keeps the name it shipped with (08-21).
- [x] **The interaction pass has been driven** against the live nexus, every claim against a stated criterion.
- [ ] **Nathan has walked the Verification Checklist** — eighteen lines in the plan document — and eyeballed the native menu.

#### Next Session

- **Walk the Verification Checklist** (plan document, §Verification Checklist), and confirm the native right-click menu reads **Edit · Copy · ─── · Delete** on a marker and **Copy · Delete** on a citation row.
- **Multi-citation markers are the named next candidate** — `[^#-#]`, a dash inside one marker binding it to two footnotes at once. Recorded in `Features/MarkdownPM.md` §Pending.
- **Four items are sequenced after, not part of this arc:** `revealBar.ts` names `.footnotes-toggle` directly; two exported `CitationSubject` types share a name; the Subfield reading the editor's cached scan closes the standing table-miscount issue; and a marker in a resting table cell travels but has no right-click menu, since Delete from a cell would have to edit the outer document at the cell's offsets.

#### Feedback

- The footnote menus read as bare verbs — **Edit · Copy · ─── · Delete** on a marker, **Copy · Delete** on a citation row — rather than naming the construct in every row. The divider stands above Delete only where a group stands above it to be divided from.
- "If that's the correct behavior that's already done, make it default but verify it actually works across duplicate defs, and all cases." The last-reference cascade stands; verifying it is what found the orphaned duplicate.
- "Each claim needs a verification criteria." Every report in this pass is stated in the plan as a claim with the one observation that would falsify it, and the result observed.
- Sizing and placement came in as you saw it: the marker at 0.65em, the control above the Subfield and to the left, the reveal zone matching the Subfield toggle's coverage, the document ending at its footnotes, the divider ghosting at `--state-ghost`.

#### Session Pointers

- `MarkdownPM/detect/index.ts` — `citationScan` is THE boundary derivation; `foldLabel`, `citationsFor`, `citationFor`, `markersFor`, `isLastReference`, `markerEndingAt` are its queries.
- `MarkdownPM/editor/citationEdits.ts` — `citationDeleteIntent` is the one range→intent rule, `cutFootnotes` the one definition of what the whole footnote is, `normalizeCitations` the one renumber, `citationGesture` composes both halves into one change set.
- `MarkdownPM/editor/citationActions.ts` — `commitCitation` is the one dispatch, `travelToCitation` the one arrival, `citationHost` the facet a surface answers through.
- `MarkdownPM/editor/citationGuard.ts` — the tail guard, on `calloutGuard.ts`'s shared `verdictFilter`.
- `MarkdownPM/index.tsx` — `pageId` is the whole footnote-visibility seam: the editor resolves `citationsVisible` from the store and writes back through it, so a preview and a hover card need nothing threaded to them.
- `MarkdownPM/editor/citationBreakage.test.tsx` — the sweep. Add a corpus here before trusting any change to the guard or the gestures.
- `.claude/Guidelines/Editor-Internals.md` — six entries at the end.

#### Working Notes

- **A block widget must answer CodeMirror for its MARGIN box.** A margin sits outside the box the widget measures, so the height model never hears about it and every widget of that kind under-reports by its own gap. Below them the caret seats on whichever line the accumulated error points at — a defect that reads as the construct underneath being broken. Two of the three block widgets had it.
- **CodeMirror picks the line from its height model before it consults the DOM**, so any model↔DOM disagreement surfaces as the caret landing in the wrong line rather than as visible broken layout.
- **A widget swallows its own events unless it says otherwise.** `WidgetType.ignoreEvent` defaults to `true`, which is why the citation row's number glyph reached no menu while the row's text did.
- **The floating preview and the hover card are both `PageEmbed`**, so anything either of them needs is one prop on that component and nothing more.
- **A fold entry maps its start forward and its end backward.** An edit that grows a folded region leaves the new lines outside the collapsed widget. Measured: a pure reorder never changes the section's length and survives, so the leak is specifically growth.
- **Your own KNOB edits ride into commits through the staging hook.** The marker's ink is `--label-control`, not the accent, because you retuned it on 08-20. Check the declaration, not the prose.

#### Changes

- The arc is `71fe5be2^..HEAD`, six of its commits belonging to an unrelated embed-Scale arc that ran through the same window. Net +1,277 code lines across 48 files at closeout, plus the review and interaction passes since. The plan carries a hash per task, Gates 1–6 each closed with their evidence, and §Closing Review and §Interaction Pass carry what came after.

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
