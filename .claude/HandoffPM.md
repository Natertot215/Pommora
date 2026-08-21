## Handoff — Pommora

> **User Prompt:** *"I want you to create a framework or prompt to take a look at Pommora's architecture as a whole across all lines of code… I'm really asking for a complete audit."* — then *"Kick off bundle 1… run the cycle… commit final tree before the prompt is given."*

#### Current Focus

**Session ID:** 3e3b1d3a-51d4-4651-905c-daa38b8c0e63
**Date:** 08-21-2026
**Model:** Fable 5

**The whole-codebase architecture audit ran, and its verdict is no rebuild — of anything.** Six parallel domain audits (data core, process boundary, MarkdownPM, view layer, design system, shell) each independently landed on healthy, every load-bearing claim re-verified at its cited lines before acceptance. The finding record is [[Architecture Audit — Full-Codebase Report]]; the work it produced is [[Codebase-Cleanup-Checklist]] — eight session bundles, each with verification and the documentation entries it retires, run under a fixed cycle: block → execution → full review → checklist + scrub → report → continuation prompt. `ArchitecturePM.md` was rewritten as the whole-app architecture guide, and `Cohesive-Cleanup.md` retired (queue absorbed into the bundles, sweep records moved to [[Cohesion-Rulings]]).

**Bundle 1 landed the same day, full cycle.** Seven fixes: the four `raw`-registered write channels enveloped; a shared journal-slot primitive with the slot law both crash journals now share — plus a `supersedes` arm the attack pass demanded, or a rename-back would replay the abandoned rename at every open; the select/status option twins parameterized; block tiles resolving their Space host from the live tree with a stale-folder guard; Cards' structural drag writing canonical `page_order` location-scoped, with a `resolveIndex` seam on `DragGroup` so a cross-location landing displaces nothing and flies home; card column-styles applying optimistically; Table's column readers fully memoized. Two build-breaking passes produced five real findings — all folded and test-pinned, including the viewOrders-mask coherence fix (a held mask is what the pipeline paints in structural views, so both views' structural drags now maintain it beside the canonical write).

**Verified live on the real nexus** through a throwaway collection driven over CDP: a same-location card drag wrote `page_order` = the gesture's exact intent; a cross-location hover displaced nothing and wrote nothing (sidecar hash byte-identical); a Sub-set drag wrote its own sidecar alone. Fixture deleted, trash bundle emptied, zero residue.

#### Completion Criteria

- [x] **Audit complete** — six domains, verdicts evidenced, findings verified at cited lines.
- [x] **Checklist written** — bundles, cycle, rulings (location-scoped canonical card drag; accepted write-silence), open questions quarantined.
- [x] **Bundle 1 landed** — gates green (3,358 tests), simplify + attack cycles run, findings folded.
- [x] **Live interaction pass** — three drag behaviors driven and file-verified on the real nexus.
- [x] **Nathan confirmed the flat-mode boundary live** — his first try exposed the legacy-mask hole (a held viewOrder row interleaving the paint), the mask-suppression fix landed at `5e424c28`, and his retry confirmed the refusal works. Style optimism remains his to eyeball in passing; the main-process half of Bundle 1 loads on his next dev restart.

#### Next Session — Two Parallel Tracks

1. **Finding the next thing to work on** — §Next-Feature Candidates in ContextPM, or wherever the day points. The footnotes Verification Checklist walk (plan document, eighteen lines) is still owed an eyeball, and the native right-click menu check with it.
2. **The continuous codebase cleanup** — [[Codebase-Cleanup-Checklist]], Bundle 2a (editor keystroke plumbing) next unblocked; 6a → 6b (the rehome, then Table hoisting) are the high-priority pair after. Any session starts it with "Run the next bundle from Codebase-Cleanup-Checklist."

#### Feedback

- "Keep comments minimal" — mid-implementation; the diff's comments were trimmed to 1–2-line whys and the simplifier briefed the same.
- The flat-mode drag ruling came with its reason stated: location-scoped so ordering "remains file-system but doesn't confuse with cross-location drag when no visible boundaries exist" — and cross-location drops should *literally look non-valid, not displacing*. Built exactly so, verified visually.
- Bundle 1 ran as "everything besides the cards first, run the cycle, then the cards" — Cards carrying a double-check for cohesion plus full live-interaction testing with file-tree and screenshot confirmation.

#### Session Pointers

- `main/crud/journalSlot.ts` — the slot law + `supersedes`, stated once; both journals are codecs on it.
- `design-system/interactions/group.tsx` — `resolveIndex` is the landing-resolver seam; null = refused landing, origin preview, fly-home no-op.
- `Detail/Views/Cards/CardsView.tsx` — `structuralSlotFor` (the location scope), the structural arm in `reorderInBandByIndex` (canonical write + mask maintenance + painted-order no-op guard), `stylePatch` → `liveView` → card faces.
- `Detail/Views/creationOrder.ts` — `sameIds` joined `spliceBeside`/`tieOrderWith` as the shared order helpers.
- The audit report's §Redundancy Ledger maps every remaining bundle to the documentation entries it deletes on landing.

#### Working Notes

- **`sortedOrGrouped` is true for every view** — `mintNewView` stamps `group: {kind:'structural'}` — which is why both views suppress a held `viewOrder` mask at the order source when `structuralOrder` holds: structural paints are filesystem order, and a mask interleaving locations dissolves the drag boundary (found live in the Studio flat view, whose 3KB legacy mask let a drag cross locations). The mask stays the sorted/grouped tiebreaker.
- **The engine's refused-landing preview is the origin slot** — `resolveIndex` returning null re-aims `zid/idx` at the source; on release the origin commit is caught by the painted-order no-op guard, not by the engine.
- **A journal whose replay trusts the record's before-state needs the `supersedes` arm; one that verifies against current state does not** — that's the whole context/property asymmetry.
- **`styleFor` is read from the `view` prop by `CardFace`/`CardProperties`, never through `resolveColumns`** — an optimistic style layer must ride the view prop to the card faces; routing it through `columns` paints nothing.
- **The single-instance lock yields to a running dev session** — an agent relaunch with a debug port dies quietly if `electron-vite dev` holds the app; check `ps` before diagnosing a dead CDP port.
