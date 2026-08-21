## Handoff — Pommora

> **User Prompt:** *"Run it end-to-end. Every deviation needs to be logged in the plan, I won't be able to re-direct or give you my live verification. Test every single combination of breakage that you can find. A future review of this whole arc should find no issues, consolidations, or errors to correct; the only things that can be left are things that require me to actually make a decision."*

#### Current Focus

**Session ID:** c4f4da52-41c4-44a8-8d74-c3d59695d897
**Dates:** 08-20-2026 → 08-21-2026
**Model:** Opus 5 (1M context)

**Footnotes were executed end to end, and the code is closed. What is open is the walkthrough.** All 23 tasks of `.claude/Planning/Footnotes — Implementation Plan.md` landed across six phases, each gate running its simplification alone and first, then the comment pass, then a correctness review; the closeout added a whole-range simplification, a neutral verification of the Delivery Claim and an attack pass. The record is PM-111, and the plan's Implementation Log is the authority on every deviation and in-flight decision.

**Four review rounds found real defects, each confirmed red before its fix.** `normalizeCitations` was renaming two independent footnotes onto one label — an orphan blocking one row's rename left that row's number standing, and the next row was renamed onto it. `onForwardDelete` bailed on any non-empty selection, so sweeping one citation row and pressing Delete removed it with no marker cascade where Backspace over the same range cascaded both. And a citation was seated at the body's last line holding content, which sits *above* the caret on any document ending in a newline — so the first footnote written from the empty last line landed its section before its own marker. The closing review added two more: the tail guard seated the text it rescues at the anchor line's start, which is the end of the body only while that line is blank, so a paste below the section of an externally-authored page landed above the first paragraph; and the seat rule answered for a selection's start where every creation writes the marker at its end, so a sweep out of the body and into the section wrote a marker inside a citation's text.

**A breakage sweep drives every key and twelve construct characters across every seat in and around the section** — roughly fourteen hundred pairs, plus selection sweeps and seven degenerate documents — asserting the corrupted state itself: a `[^label]:` line the scan does not read as a live citation. Building it turned up a pre-existing import cycle between `Embeds/ConnectionHoverCard` and MarkdownPM that made the first mount to render a table throw; the presenter moved to its own leaf.

**Verified:** typecheck clean, Biome clean, 3,330 tests, run repeatedly. **Not verified:** the interaction passes for Phases 4 through 6. The dev session was up with the fixture page open and Phase 5 touches the main process, which needs a full restart rather than ⌘R.

#### Completion Criteria

- [x] **The boundary is derived once** and every layer reads it.
- [x] **Markers draw positional and act** — click travels or follows, both menus, cascades keyed to the range and answering the same over both deletion keys.
- [x] **The section hides and shows** through one per-page override the Subfield control, the divider and a marker jump all write.
- [x] **Creation is complete and reversible** — three doors, each one transaction one undo takes back whole, each renormalizing.
- [x] **Nothing strands the section** — the tail guard, proven against the sweep and an attack pass.
- [x] **The record is written** — the feature's section, PM-111, Context restated, five entries routed to `Editor-Internals.md`.
- [ ] **Nathan has walked the Verification Checklist** — eighteen lines in the plan document.
- [x] **Nathan has ruled on the two flagged decisions** — the relocate rule with the pasted footnote's shaping stands as built, and the setting keeps the name it shipped with (08-21).

#### Next Session

- **Walk the Verification Checklist** (plan document, §Verification Checklist), and the eight-step creation pass in Gate 5.
- **The two flagged decisions want a word**, both in the plan's Deviations. Reversing either is small; neither is painted into a corner.
- **Three items are sequenced after, not part of this arc:** `revealBar.ts` names `.footnotes-toggle` directly; two exported `CitationSubject` types share a name; and the Subfield reading the editor's cached scan closes the standing table-miscount issue.

#### Feedback

- "Jump To Citation applies to typing too — please change; only clicking the resolved glyph should." Then: "typing jump honors the setting." Built, reverted, ruling recorded.
- "Would it be simpler to just remove transformation / rendering below the line?" It already is: a line starting a block construct can never sit inside the section, so nothing draws one there.
- Sizing and placement came in as you saw it: the marker at 0.65em, the control above the Subfield and to the left, the reveal zone matching the Subfield toggle's coverage, the document ending at its footnotes, the divider ghosting at `--state-ghost`.

#### Session Pointers

- `MarkdownPM/detect/index.ts` — `citationScan` is THE boundary derivation; `foldLabel`, `citationFor`, `markersFor`, `isLastReference`, `markerEndingAt` are its queries.
- `MarkdownPM/editor/citationEdits.ts` — `citationDeleteIntent` is the one range→intent rule, `normalizeCitations` the one renumber, `citationGesture` composes both halves into one change set.
- `MarkdownPM/editor/citationActions.ts` — `commitCitation` is the one dispatch; `citationHost` is the facet a surface answers through.
- `MarkdownPM/editor/citationGuard.ts` — the tail guard, on `calloutGuard.ts`'s shared `verdictFilter`.
- `MarkdownPM/editor/citationBreakage.test.tsx` — the sweep. Add a corpus here before trusting any change to the guard or the gestures.
- `.claude/Guidelines/Editor-Internals.md` — five new entries at the end.

#### Working Notes

- **A fold entry maps its start forward and its end backward.** An edit that grows a folded region leaves the new lines outside the collapsed widget. Measured: a pure reorder never changes the section's length and survives, so the leak is specifically growth.
- **`isInsideCode` splits the whole document** — asked per caret move it cost 26× the cached fences plus the caret's own line. `isInsideInlineCode` is the line-local half.
- **The guard is blind to a document with no section yet** — `citationTailVerdict` returns `ok` when the start document holds none, which is always true of a page's first footnote. Anything about creating the first section has to be correct on its own.
- **Your own KNOB edits ride into commits through the staging hook.** The marker's ink is `--label-control`, not the accent, because you retuned it on 08-20. Check the declaration, not the prose.

#### Changes

- 68 commits, `71fe5be2^..HEAD`, six of them the unrelated embed-Scale arc. Net +1,277 code lines across 48 files, comments/blanks/tests excluded, from +1,433 and −156. The plan carries a hash per task and Gates 1–6 each closed with their evidence.

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
