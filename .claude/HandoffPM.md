## Handoff — Pommora

> **User Prompt:** *"Run it end-to-end. Each phase follows the same cycle of simplification → fold → update in-chat. Every deviation needs to be logged in the plan, I won't be able to re-direct or give you my live verification. Test every single combination of breakage that you can find with keyboard input and any other edge-case handling. A future review of this whole arc should find no issues, consolidations, or errors to correct; the only things that can be left are things that require me to actually make a decision."*

#### Current Focus

**Session ID:** c4f4da52-41c4-44a8-8d74-c3d59695d897
**Dates:** 08-20-2026 → 08-21-2026
**Model:** Opus 5 (1M context)

**Footnotes were executed end to end, and the code is closed. What is open is your walkthrough.** All 23 tasks of `.claude/Planning/Footnotes — Implementation Plan.md` landed across six phases, each gate running its simplification alone and first, then the comment pass, then a correctness review; the closeout added a whole-range simplification, a neutral verification of the Delivery Claim and an attack pass. The record is PM-111. Every deviation and every in-flight decision is in the plan's Implementation Log, which is the authority on what actually happened.

**Three rounds of review found real defects, and all three are fixed and pinned.** The Gate 5 correctness review found `normalizeCitations` renaming two independent footnotes onto one label — an orphan blocking one row's rename left that row's own number standing, and the next row was renamed straight onto it, fusing two footnotes into a winner and a shadow. The neutral verification found forward-Delete bailing on any non-empty selection, so sweeping exactly one citation row and pressing Delete removed it with no marker cascade where Backspace over the identical range cascaded both. The attack pass found the one that mattered most: a citation seated at the body's last line holding content, which sits *above* the caret on any document ending in a newline — so the first footnote written from the empty last line landed its section before its own marker, and with two trailing newlines left `[^1]: ` standing as literal prose. Each was confirmed red before the fix.

**A breakage sweep drives every key and twelve construct characters across every seat in and around the section** — roughly fourteen hundred keystroke-and-seat pairs, plus selection sweeps and seven degenerate documents — asserting the corrupted state itself: a `[^label]:` line the scan does not read as a live citation. It never appears. Building it turned up a pre-existing import cycle between `Embeds/ConnectionHoverCard` and MarkdownPM that made the first mount to render a table throw; the presenter moved to its own leaf and the cycle is gone.

**Verified:** typecheck clean across both projects, Biome clean, 3,316 Vitest tests, run repeatedly. **Not verified, and wanting your eyes:** the interaction passes for Phases 4 through 6. Your dev session was up with the fixture page open and Phase 5 changes the main process, which needs a full restart rather than ⌘R — taking it down to screenshot was not worth it. **Restart the dev process rather than ⌘R.**

#### Completion Criteria

- [x] **The section's boundary is derived once** and every layer reads it — the decoration pass, the block resolver, the heading-fold scan, the transaction guard, the Subfield counter, the fold region.
- [x] **Markers draw positional and act** — the number their position earns, a click that travels or follows, right-click menus, cascades keyed to the range and answering the same over both deletion keys.
- [x] **The section hides and shows** through one per-page override that the Subfield control, the divider and a marker jump all write.
- [x] **Creation is complete and reversible** — Insert ▸ Footnote, Paste As ▸ Footnote and a hand-typed label, each one transaction one undo takes back whole, each renormalizing the order.
- [x] **Nothing strands the section** — the tail guard, proven against a fourteen-hundred-combination sweep and an attack pass.
- [x] **The record is written** — the feature's section in `Features/MarkdownPM.md`, PM-111 in History, Context restated.
- [ ] **Nathan has walked the Verification Checklist** — the eighteen lines in the plan document, and the one thing the harness cannot supply.
- [ ] **Nathan has ruled on the two flagged decisions** — the relocate rule and the pasted footnote's shaping, which are one ruling; and the setting shipping as **Show Footnotes By Default** where the decision log named it Default Visibility.

#### Next Session

- **Walk the Verification Checklist** (`.claude/Planning/Footnotes — Implementation Plan.md`, §Verification Checklist). Eighteen lines, each one thing to do and the one thing that must happen. A line that fails is a defect, not a preference.
- **The two flagged decisions want a word**, both recorded in the plan's Deviations. Reversing either is a small change; neither is painted into a corner.
- **Three items are sequenced after this arc, not part of it:** `revealBar.ts` names `.footnotes-toggle` directly and wants a host-named selector once a second lead control exists; two exported `CitationSubject` types share a name and want one renamed; and the Subfield reading the editor's cached document scan closes the standing table-miscount Known Issue and lets the counter drop its own boundary read.

#### Feedback

- "Jump To Citation applies to typing too — please change; only clicking the resolved glyph should." Then, on reflection: "typing jump honors the setting." Built, reverted, and the ruling recorded — the setting is the one place that decision belongs.
- "Would it be simpler to just remove transformation / rendering below the line?" It is already the behavior: a line starting a block construct can never sit inside the section, so nothing draws one there. Changing the *scan* to absorb them would diverge from GFM and would not remove the guard.
- "The 0.5 zoom needs to go to the citation glyph on the page; the 0.75 is for the citation list." · "Make footnote use 0.65 and accent color bright / align at the top." · "It goes ABOVE the subfield, to the left." · "The subfield toggle has space given so that hovering near it displays it without needing to hover EXACTLY on it — I want it the same way." · "Footnotes should also literally be at the end of the document." · "The divider should still show while hovering near it as --state-ghost."

#### Session Pointers

- `src/renderer/src/MarkdownPM/detect/index.ts` — `citationScan` is THE boundary derivation, beside its three sibling line-construct readers. `foldLabel`, `citationFor`, `markersFor`, `isLastReference`, `markerEndingAt` are its queries.
- `src/renderer/src/MarkdownPM/editor/citationEdits.ts` — what a gesture writes. `citationDeleteIntent` is the one range→intent rule; `normalizeCitations` the one renumber; `citationGesture` composes the two halves of any gesture into one change set.
- `src/renderer/src/MarkdownPM/editor/citationActions.ts` — where every gesture lands. `commitCitation` is the one dispatch; `citationHost` is the facet a surface states what it answers for through.
- `src/renderer/src/MarkdownPM/editor/citationGuard.ts` — the tail guard, on `calloutGuard.ts`'s shared `verdictFilter`. Read `citationTailVerdict`'s two repairs before touching either.
- `src/renderer/src/MarkdownPM/editor/folding.ts` — the section as a fold kind, `editAcrossCitations`, and why a fold cannot survive an edit that grows its region.
- `src/renderer/src/MarkdownPM/editor/citationBreakage.test.tsx` — the sweep. Add a corpus here before trusting any change to the guard or the gestures.
- `.claude/Guidelines/Editor-Internals.md` — five new entries at the end, each one this arc earned.

#### Working Notes

- **A fold entry maps its start forward and its end backward.** An edit that grows a folded region leaves the new lines standing outside the collapsed widget — visible on a page whose section is meant to be hidden. Measured, not theorised: a pure reorder never changes the section's length and survives intact, so the leak is specifically growth.
- **`isInsideCode` splits the whole document.** Asked on every caret move it cost 26× what the cached fences plus the caret's own line cost. `isInsideInlineCode` is the line-local half.
- **A predicate that answers "where does the body end" is not the same as "where does the body end at or after the caret."** That one word is the whole of the attack pass's High finding.
- **The guard is blind to a document with no section yet.** `citationTailVerdict` returns `ok` on its first line when the start document holds none — which is always true of the first footnote on a page. Anything about creating the first section has to be correct on its own.
- **Nathan's own KNOB edits ride into commits through the staging hook.** The marker's ink is `--label-control`, not the accent, because he retuned it on 08-20; the feature document said accent for a day. Check the declaration, not the prose.

#### Changes

- 65 commits, `71fe5be2^..HEAD`. Net +1,277 code lines across 48 files (comments, blanks and tests excluded), from +1,433 and −156.
- The plan document carries the full Progress table with a hash per task, and Gates 1 through 6 each closed with their C1–C10 evidence.

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
