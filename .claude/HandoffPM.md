## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** 7b787ee9-ba96-4f37-a817-09c49647943a
**Dates:** 08-13-2026 → 08-14-2026
**Model:** Opus 5 (1M context)

**Trash Surface V1 — executed end to end, and finished.** The ratified plan's fifteen tasks ran phase by phase with a gate between each, and the record is PM-100. `.trash` had held three complete, tested, unreachable mechanisms; the Settings rail now carries a Trash leaf that lists every bundle and puts any of it back, including into a home the user picks when the recorded one is gone.

The plan's shape held, with two departures. Tasks 4 and 5 shipped as one commit because `bridge.ts` is pure shared types — a main-side record shape can never be a reply, so `TrashRow` had to exist the moment the channel did. And the spec's ruling that the heading read as bare column labels was superseded live: Nathan ruled the columns should take the table's own CSS, borders and segment included, which is what shipped. Both are recorded in the plan's Deviations and Rulings rather than left to be rediscovered.

Four review passes ran — one per phase, then one across the whole arc looking only for seam defects a phase-scoped read structurally cannot reach. Between them they found and closed: `emptyBundle` reading a bundle holding anything beside its artifact as holding none and removing the folder wholesale, which destroyed the file with the switch off; `resolveRecord` rebuilding a full-nexus projection once per listed row; a Space's fallback breadcrumb wearing the internal `.nexus/contexts` chain; a batch whose menu voice came from the whole checked set while its action came from the visible part; and a batch reporting the homeless remedy for rows that had been attempted and refused, discarding the reason main had already computed. The last of those only a whole-arc read could see — main's refusal taxonomy and the renderer's report wording were each correct alone.

The visual pass was Nathan's, driven against the running app across a dozen corrections. Its one durable finding sits outside the trash: `FloatingWindow`'s move armed on any pointer button, and arming calls `preventDefault`, so **every drag surface in every floating window had been silently swallowing the context menu of whatever was drawn on it**. Nothing had noticed because nothing on those surfaces had a menu to lose.

What is verified: every gate green on the final state (typecheck 0, 2595 tests across 227 files, lint at zero diagnostics of any severity, the atlas's 20 tables, a clean build), seven end-to-end scenarios against a real nexus on disk, and every visual decision measured on the running window rather than read from source. What is assumed: nothing about the native menus as rendered — CDP can pop them and read the model, but cannot click one, so the destination submenu and the Format ▸ pick are the only paths no automation has driven.

#### Completion Criteria

- [x] **Phase 1 · Clearing the ground** — the stray lint diagnostic gone, four search inputs folded into one component with all three existing surfaces pixel-identical, and Context and Space carrying distinct kind glyphs across every borrowing site.
- [x] **Phase 2 · Main** — `listBundles` widened and on the bridge, a bundle shaped into a row that knows its kind and whether its home resolves, the delete switch read main-side per operation, the empty op guarded to bundles alone, restore accepting a chosen destination, and the destination tree hoisted out of the cards view.
- [x] **Phase 3 · The surface** — `NexusSettings` renamed and resized with its phantom padding gone, the Trash leaf listing rows under their headings, selection and the native menu, restore single and batch, and emptying with its switch and confirms.
- [x] **Phase 4 · Reconciliation** — every document the work made false rewritten in the commit that falsified it, including NexusRecord's **Trash & Deletion** section.
- [x] **Every gate passed on its own commit range** — typecheck, test, lint at zero diagnostics of any severity, plus simplification and review dispatched per phase with every concern fixed rather than deferred.
- [x] **End-to-end proven against a real nexus** — an entity deleted, restored, and restored again with its parent gone; the property-strip behavior observed; the restoration matrix walked. Kept as `crud/trashRecovery.test.ts`.
- [x] **The screenshot read and acted on** — the trash browser with a checked row and one of every kind seeded, inspected for real and its defects fixed.
- [x] **The closeout run whole** and the History entry committed under the arc name **Trash Surface V1**.

#### Next Session

- **Open on a new focus.** This one is finished; the natural next is the main pane's Inspector, which Context §Immediate Work already carries — its toggle, slide, resizable edge, persisted width and glass shell are built and its body is empty, with the Page Preview's frontmatter inspector already doing that job for another host.
- **Two calls Nathan holds** on the trash, neither blocking: whether the date column should show a year by default (`.trash` is never pruned, so two bundles a year apart read identically), and whether select-all should return somewhere other than the heading he removed it from.
- **A nexus-wide date-format setting**, if wanted. The nexus has a `time_format` and no date equivalent; the trash column defaults to `defaultStyleFor('datetime')` for want of one. A `date_format` key beside `time_format` plus its coercer line would give every unconfigured date column one owner.
- **The one unverified path**, carried through three reviews: whether Electron renders a disabled `Restore ▸` with an empty submenu as a grayed row rather than swallowing it. Right-click a homeless row in a nexus with no Collections and look.

#### Feedback


- "Any report-backs to Nathan should be simple and explained briefly." — standing.

#### Session Pointers

- `Pommora/src/main/crud/trashRows.ts` — a bundle becomes a row. The stamp parser, the live-vs-frozen breadcrumb, and the `property` filter that keys on the record's own discriminator rather than a missing artifact.
- `Pommora/src/main/provenance.ts` — `openBundle` is the assertion both spend paths make; `withDestination` substitutes a chosen parent before `resolveRecord` runs; `emptyBundle` sits beside `restoreArtifact`.
- `Pommora/src/renderer/src/Settings/TrashLeaf.tsx` — the surface. `many()` carries each refusal's reason; `openColumnMenu` writes the date column's two personalization keys.
- `Pommora/src/renderer/src/Settings/trashLeaf.css` — every knob is at the top: `--navwindow-inset`, `--trash-date-lane`, `--trash-date-inset`, `--trash-gutter`, `--heading-padding-y`. The doubled `.trash-leaf.trash-leaf` selector is deliberate.
- `Pommora/src/renderer/src/design-system/interactions/FloatingWindow.tsx` — `startDrag`'s primary-button guard is what stops a drag surface eating a right-click.
- `Pommora/src/main/crud/trashRecovery.test.ts` — the seven end-to-end scenarios, driven through `handleMutate` with the shapes the leaf actually sends.
- `.claude/Planning/Trash Recovery — Implementation Plan.md` — Deviations and Rulings carry why the plan and the shipped work differ.

#### Working Notes

- **A silent no-op replace is the failure mode of scripted editing.** Twice this session an edit anchored on comment text a simplification pass had rewritten minutes earlier; the replace found nothing, reported success, and the change never landed. Both were caught only by measuring the rendered result. Anchor on code, not prose, or read back what landed.
- **`.col-header` clips its overflow**, so a pseudo-element pushed past a lane's edge disappears rather than overhanging. Both the heading's segment and the rows' column line draw on their own lane's trailing edge for that reason.
- **`rg -r` is `--replace`, not recursive** — `rg -rn "x" src` silently rewrites every match to `n`. Several exploratory searches this session returned confident nonsense before it was caught.
- **A fixed-string search for a call plus its first argument misses every wrapped call.** The Context glyph sweep reported 13 sites and there were 14; the missed one was long enough that the formatter had broken the line.
- **Resolving an already-resolved value hides a wrong argument** — a second `entityIcon` pass over a renderable glyph returns it unchanged, which is why one site could name the wrong kind indefinitely.

**FILES ADDED**

- `Pommora/src/shared/trashMenu.ts`
- `Pommora/src/main/trashMenu.ts`
- `Pommora/src/main/crud/trashRows.ts` · `crud/trashRows.test.ts` · `crud/trashRecovery.test.ts`
- `Pommora/src/renderer/src/Settings/TrashLeaf.tsx` · `trashLeaf.css` · `trashLeaf.test.ts`
- `Pommora/src/renderer/src/destinationTree.ts` · `destinationTree.test.ts`
- `Pommora/src/renderer/src/design-system/components/SearchField.tsx` · `searchField.css.ts` · `SearchField.test.tsx`
- `Pommora/src/renderer/src/design-system/components/Checkbox.tsx` · `checkbox.css`

**FILES MODIFIED**

- `Pommora/src/shared/` — `types.ts` · `bridge.ts` · `mutate.ts` · `cardMenu.ts`
- `Pommora/src/preload/index.ts`
- `Pommora/src/main/` — `index.ts` · `mutate.ts` · `provenance.ts` · `readNexus.ts` · `record.ts` · `settings.ts` · `paths.ts` · `returningMenu.ts` · `cardMenu.ts` · `crud/contextWrite.ts` · and their tests
- `Pommora/src/renderer/src/` — `App.tsx` · `store.ts` · `treeIndex.ts` · `treeMove.ts` · `Navigation/navList.css` · `Navigation/navSearch.ts` · `NavWindow/NavWindow.tsx` · `NavWindow/navWindow.css` · `Tabs/NavView.tsx` · `Sidebar/Ribbon.tsx` · `Sidebar/Sidebar.tsx`
- `Pommora/src/renderer/src/Components/Detail/` — `PagePropertiesPane.tsx` · `PropertyTypes.tsx` · `IconPicker.tsx`
- `Pommora/src/renderer/src/Detail/Views/` — `Cards/CardsView.tsx` · `Table/table-tokens.css` · `pipeline/contextIdentity.ts`
- `Pommora/src/renderer/src/design-system/` — `symbols/index.tsx` · `tokens/chip.css.ts` · `interactions/FloatingWindow.tsx`
- `Pommora/src/renderer/src/MarkdownPM/` — `Styles.css` · `editor/decorations.ts` · `mdLinkTarget.test.tsx`
- `Pommora/src/renderer/src/PagePreview/PreviewInspector.tsx` · `Embeds/embeds.css`
- `.claude/` — `ContextPM.md` · `HistoryPM.md` · `PommoraPRD.md` · 25 `Features/*.md` · `Guidelines/Build-Gotchas.md` · `Guidelines/Lint-And-Accessibility.md` · `Mobile/NexusSync.md` · `Planning/Trash Recovery — Implementation Plan.md`

**FILES RENAMED**

- `Settings/SettingsWindow.tsx` → `Settings/NexusSettings.tsx`
- `Settings/settingsWindow.css` → `Settings/nexusSettings.css`

**COMMITS**

- `fbb45c93^..4d71553c` — 29 commits. The arc's own range for PM-100 is `fbb45c93^..97f2a406`; `0700a863` carried the Copy Link / Copy Path ride-along that preceded it.

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.
- If additional guidelines appear here that aren't in the handoffs template, it means they've been user-added and should be preserved.
