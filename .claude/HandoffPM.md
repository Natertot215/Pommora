## Handoff — Pommora

> **User Prompt:** *"Find what already exists first before scoping out or trying to make any change."*

#### Current Focus

**Session ID:** e019edf8-752e-43c2-a5a8-d2c34ad3f36a
**Dates:** 08-14-2026
**Model:** Opus 4.8 (1M context)

**Interaction polish, then the outline earned its drag.** The session opened on a batch of small interaction asks and closed with the Page Outline becoming a real working surface. The Subfield breadcrumb was the largest piece: it collapsed the moment you backed up a path, and it now keeps the deeper segments dimmed and re-navigable. The first attempt keyed the tail off the tab's forward `navStack` — wrong, because walking *up* a breadcrumb never puts the deeper nodes ahead in history — so it was rebuilt around `crumbDepth`, the deepest node visited on the current path, held while walking its own spine and reset on a branch. A breadcrumb click was then made to switch to a tab already showing its target while still holding the tail. The smaller asks landed alongside: ViewEmbed's title row gained **Change Icon** anchored to the glyph, and MarkdownPM's Insert and Format submenus reordered by inserted-character count.

**Then the outline.** It closes only on Escape or a re-press now (so it survives a click into the page), its rail centres on the chevron at the shared disclosure step, a right-click renames a heading inline, and a heading row drags to reorder its whole section — reusing the editor's `blockMoveChanges`, with the range trimmed to the last non-blank line so the single-blank fencing never compounds on repeated reorders. The editor's fold chevron gained its own menu (Rename / Size / Delete-line-only) on the one shared hot-line list the grip menu already reads. Closed out with a simplification pass (the tripled section-span walk consolidated into `folding.sectionEnd`) and an adversarial review.

**What is verified:** every gate green on the final state — typecheck 0, lint 0, 2618 tests across 229 files. The breadcrumb and the outline drag were driven live by Nathan and confirmed. The build-breaking review surfaced one real Medium — the global `crumbDepth` leaking a wrong tail across tabs — which was fixed by resetting it in `syncActiveDetail` (the tab-focus choke point), not the navigation path. **What is assumed:** the heading chevron menu (Rename / Size / Delete) is unrun — it touches the main process, so it needs a dev restart, and no automation clicks a native menu.

#### Completion Criteria

- [x] **Breadcrumb keeps the full path dimmed on nav-back**, re-navigable, driven by per-path `crumbDepth`; the old single-ghost `trail` removed.
- [x] **Breadcrumb clicks switch to an open tab yet hold the tail**; a tab-focus change resets it (the cross-tab leak the review found, fixed).
- [x] **ViewEmbed title menu offers Change Icon**, anchored to the title glyph.
- [x] **Insert + Format submenus ordered by inserted-character count.**
- [x] **Outline closes on Esc/re-press only, rail on the chevron, inline rename, drag-to-reorder sections** — fenced to one blank, no compounding.
- [x] **Editor fold-chevron menu — Rename / Size / Delete (heading line only)** — on the shared hot-line list, generic menu stands down over the chevron.
- [x] **Gates green; the review's one finding fixed and re-verified; section-walk consolidated.**

#### Next Session

- **The Page Outline dropdown has no feature doc.** Its close behaviour, inline rename, and section drag now warrant one — MarkdownPM covers only the editor-side chevron menu.
- **Per-tab `crumbDepth`, if cross-tab tail memory is ever wanted.** It resets on tab switch today (correct, no leak); a per-tab field would let each tab remember its own dimmed tail across switches — a feature, not a fix.
- **The editor's own heading grip-drag likely compounds a trailing blank** the same way the outline did before the range-trim — only the outline path was fixed. `blockMoveChanges` passes a heading section range that includes the trailing blank.
- **ContextPM §Debt line on the drag spec-folds** is stale by one: `OutlineDnd` added a fifth `startAutoScroll` site.

#### Feedback

- "Find what already exists first before scoping out or trying to make any change." — standing; every fixture opened with a read of what was reusable.
- "Make it so that the breadcrumb NAVIGATES to the opened tab rather than creating it in place, but still preserves the path." — the tail is a property of the path, not the tab, so a switch can hold it.
- "it should not auto-add a space, all it should do is ensure one exists" — idempotent fencing; a reorder must not accrete blanks.
- "change icon needs to use the icons placement as the geometrical binding" — a picker anchors to the thing it edits, not the row around it.
- "keep both" — the Insert *and* Format reorders, not one instead of the other.

#### Session Pointers

- `Pommora/src/renderer/src/Detail/Subfield/crumbs.ts` — `subfieldCrumbs` builds the spine from `crumbDepth` and dims past the current node; `crumbDepthFor` is the hold-while-ancestor rule.
- `Pommora/src/renderer/src/store.ts` — `crumbDepth` updates at the top of `select`; `navigateCrumb` delegates to `select` and flips the slide; `syncActiveDetail` resets the depth on a tab-focus change.
- `Pommora/src/renderer/src/Toolbar/OutlineDnd.tsx` — the trimmed drag engine (snapshot, autoscroll, DropLine); `pageEditor.moveHeadingSection` is the document mutation it commits.
- `Pommora/src/renderer/src/MarkdownPM/editor/gripMenu.ts` + `src/main/gripMenu.ts` — the chevron menu rides the grip-menu IPC; `HOT_MENU_LINES` is the one list the hit-tests and the hover flag share.
- `Pommora/src/renderer/src/MarkdownPM/editor/folding.ts` — `sectionEnd` is the single section-span walk (was tripled across the outline and the mover).

#### Working Notes

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.
- If additional guidelines appear here that aren't in the handoffs template, it means they've been user-added and should be preserved.
