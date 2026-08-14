## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** 1ac0afda-02f0-4fec-9e6e-71bec15c2cb0
**Dates:** 08-13-2026
**Model:** Opus 5 (1M context)

**The table scroll fix landed, and four more surfaces came with it; the next thing is the trash.** The table block was collapsing to one line's height on every keystroke because `TableWidget` never answered CodeMirror's height question — measured directly, a 400px table reported 18px. Alongside it: the nested code block's horizontal measures collapsed onto `--cb-inset`/`--cb-pad`, the hover-ghost effect became one shared primitive with a New Option slot riding it, `shared/pageMenu.ts` became the only definition of a page's actions, and a page's header began drawing the icon it has always stored. The record is PM-099.

**Two things were built and taken back out.** The callout architecture — a collapsed tag line with the caret skipping it — was reverted on request after three rounds; a fence on a callout's head line is now a recorded limitation rather than a half-built feature. The link-glyph selection fix was reverted for the same reason: giving the glyph an invisible space to carry the highlight worked in an isolated page and never in the editor, and leaving it would have meant a DOM space and a test workaround bought for nothing.

#### Completion Criteria

**Trash Surface V1** — `Planning/Trash Recovery — Implementation Plan.md`, 15 tasks over 4 phases, executed in order with a gate between each.

- [ ] **Phase 1 · Clearing the ground** — the stray lint diagnostic gone, four search inputs folded into one component with all three existing surfaces pixel-identical, and Context and Space carrying distinct kind glyphs across all six borrowing sites.
- [ ] **Phase 2 · Main** — `listBundles` widened and on the bridge, a bundle shaped into a row that knows its kind and whether its home resolves, the delete switch read main-side per operation, the empty op guarded to bundles alone, restore accepting a chosen destination, and the destination tree hoisted out of the cards view.
- [ ] **Phase 3 · The surface** — `NexusSettings` renamed and resized with its phantom padding gone, the Trash leaf listing rows under their headings, selection and the native menu, restore single and batch, and emptying with its switch and confirms.
- [ ] **Phase 4 · Reconciliation** — every document the work made false rewritten in the commit that falsified it, including NexusRecord's new **Trash & Deletion** section.
- [ ] **Every gate passed on its own commit range** — typecheck, test, lint at zero diagnostics of any severity, plus simplification and review dispatched per phase with every concern fixed rather than deferred.
- [ ] **End-to-end proven against a real nexus** — an entity deleted, restored, and restored again with its parent gone; the property-strip behavior observed; the restoration matrix walked.
- [ ] **The screenshot read and acted on** — the trash browser with a checked row and one of every kind seeded, inspected for real and its defects fixed.
- [ ] **The closeout run whole** and the History entry committed under the arc name **Trash Surface V1**.

**Done means nothing is left that could have been done now.** The only work that may follow is stylistic tweaks Nathan finds on his own screen.

**Unattributed documentation changes appearing mid-execution are Nathan's own.** Fold them into the commit at hand, never revert them, and never leave them hanging in the working tree.

#### Next Session

- **The trash browser.** The restore path ships and is tested end-to-end; enumeration is the missing half. One channel and a UI on a finished engine.
- Anything the ghost slot or the unified menu turns up in use.

#### Feedback

- "stop fucking around. I can verify if the fix works. Just fix it" — driving a live instance to verify my own work cost real time twice this session. Build it, hand it over, let it be verified.
- "it must use the same hover-timing as tables, and disclose the pane rather than adding it dedicated space" — the correction that found `useGhostAnchor`; a surface joining an existing family inherits its timing rather than choosing its own.
- "the new option should come from the hovered chip itself, so that its placed in order rather than just the last one" — a creation affordance shows where the thing will land, not merely that it can be made.
- "Please look at if this is currently how it works or not" — asked instead of assumed, and it was the right instinct: the callout's head line WAS the first typable line.
- "Any report-backs to Nathan should be simple and explained briefly." — standing.

#### Session Pointers

- `Pommora/src/renderer/src/MarkdownPM/Tables/widget.tsx` — `HeightBox` and `estimatedHeight` are what stop the block collapsing; the observer is disconnected in `destroy(dom)`, which only fires when a node is genuinely dropped.
- `Pommora/src/renderer/src/design-system/interactions/ghost.css` — the ghost effect and the creation-affordance cursor rule. `data-ghost-root` holds the state, `ghost-worn` marks what wears the dim, `data-create` marks a creator that isn't a ghost.
- `Pommora/src/renderer/src/Components/Detail/GhostOptionChip.tsx` — the New Option seat and the name caret both property editors share.
- `Pommora/src/shared/pageMenu.ts` — the one definition of a page's actions and their order; `pageMetaMenuSubset` draws a named slice without letting it drift.
- `Pommora/src/main/returningMenu.ts` — `menuTemplate` and `popModelMenu`, the shell every model-driven native menu pops through.

#### Working Notes

- **`useGhostAnchor` is more general than its consumers suggested** — dwell, grace, travel-hold, suppression and an exit watchdog. A new hover-born creator gets all of it for two lines.
- **A callout's head line was the first typable line**, which is why a fence typed after `||` never became one: the fence grammar admits only whitespace and `>` levels before its marker run.
- Every creation affordance now takes the pointer cursor, marked with `data-create` rather than blanket-applied, since the app's chrome keeps the arrow deliberately.

**FILES ADDED**

- `Pommora/src/renderer/src/design-system/interactions/ghost.css`
- `Pommora/src/renderer/src/Components/Detail/GhostOptionChip.tsx`
- `Pommora/src/main/pageActionsMenu.ts`
- `Pommora/src/shared/pageMenu.test.ts`
- `.claude/Sessions/Session - 08-12.md`

**FILES MODIFIED**

- `Pommora/src/shared/` — `pageMenu.ts` · `bridge.ts` · `tabMenu.ts` · `optionModel.ts` · `types.ts` · `optionModel.test.ts`
- `Pommora/src/main/` — `contextMenu.ts` · `returningMenu.ts` · `rowGripMenu.ts` · `tabMenu.ts` · `db/localState.ts` · `index.ts`
- `Pommora/src/preload/index.ts`
- `Pommora/src/renderer/src/MarkdownPM/` — `Tables/widget.tsx` · `Tables/TableView.tsx` · `Styles.css` · `PageHeader.tsx` · `index.tsx`
- `Pommora/src/renderer/src/Components/` — `Chip.tsx` · `RenamableLabel.tsx` · `Detail/PageMenu.tsx` · `Detail/OptionEditor.tsx` · `Detail/StatusEditor.tsx` · `Detail/PropertiesPane.tsx` · `Detail/FilterPane.tsx` · `Detail/InlineEditHeader.tsx` · `Detail/DashIcon.tsx` · `Detail/settingsPane.css.ts`
- `Pommora/src/renderer/src/Detail/` — `PageView.tsx` · `Banner/AddBannerButton.tsx` · `Views/GroupBand.tsx` · `Views/Cards/*` · `Views/Table/*` · `Views/PropertyEditing/*`
- `Pommora/src/renderer/src/` — `App.tsx` · `store.ts` · `main.tsx` · `Sidebar/*` · `Tabs/TabBar.tsx` · `Toolbar/ViewPane.tsx` · `Blocks/*` · `NavWindow/NavWindow.tsx`
- `Pommora/src/renderer/src/design-system/` — `components/menu/Menu.tsx` · `tokens/chip.css.ts` · `tokens/colorMap.ts` · `symbols/customGlyphs.tsx` · `components/interactionField.css.ts` · `components/CalendarPicker/CalendarPicker.tsx` · `components/ProgressBar/ProgressBar.tsx` · `card-tokens.css` · `tile-chassis.css`
- `Pommora/.gitignore`
- `.claude/` — `CLAUDE.md` · `ContextPM.md` · `HistoryPM.md` · `FrameworkPM.md` · `Features/MarkdownPM.md` · `Features/SidebarPM.md` · `Features/NavigationPM.md` · `Features/PagesPM.md` · `Features/ArchitecturePM.md`

**FILES REMOVED**

- `.claude/Planning/Creation Affordances — Decision Log.md`
- `.claude/Planning/Creation Affordances — Plan.md`
- `.claude/Planning/PageMenu — Decision Log.md`
- `.claude/Planning/Write-Path Consolidation — Implementation Plan.md`

**COMMITS**

- `8826de7c` — fix(tables): a cell keystroke no longer collapses the table's block height
- `1bfae784` — fix(markdown): a nested code block's fill, text and language tag move together
- `3c840e49` — feat(ghost): one hover-create effect, and a New Option seat that rides it
- `58d50268` — docs: the Fix-On-Sight rule, and the backlog reshuffled
- `1a855651` — refactor(comments): the name comes out of the codebase's comments
- `14e71c1a` — chore: ignore env files
- `3bb811b2` — feat(menus): one page menu, and the actions it was missing
- `4d76dd31` — feat(pages): a page's header wears its icon, and can put it away
- `a9e38efa` — fix(connections): a selection paints across the link glyph instead of around it
- `9c2b356d` — fix(connections): the link glyph keeps its resting shape

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs to know, remove what it doesn't.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.
- If additional guidelines appear here that aren't in the handoffs template, it means they've been user-added and should be preserved.
