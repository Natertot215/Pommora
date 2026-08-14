## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** 7b787ee9-ba96-4f37-a817-09c49647943a
**Dates:** 08-13-2026 → 08-14-2026
**Model:** Opus 5 (1M context)

**The menu system, closed out.** The session opened on a feature — a page's right-click menu should say where the page can go — and ended by making that the only way any native menu is built. Move To ▸ joined the send block above Copy Link and Copy Path, and every surface that right-clicks a page now carries the whole block: the table's title cell and row grip, a card, a sidebar row, a tab, and a NavWindow row. Before this they disagreed six ways — cards had Move To under Open and no clipboard items, tabs and the sidebar had the clipboard items and no Move To, and the table's two menus had neither.

That raised the real question, which Nathan asked directly: what else in the menus never joined the shared structure? Three scouts answered it — one auditing menu divergence, one mining the docs for pending work, one surveying the codebase for what the docs don't say. The menu audit found no structural gap (every right-click surface routes to a native channel, and the native-vs-renderer split held up) but five genuine duplications, all now closed. Eight menus hand-rolled the popup promise `popReturningMenu` exists to hold; they route through it, and the two whose rows ask a confirm first use the `pickAfter` it gained. The Align radios and the view Style pair each existed twice and are `styleMenu.ts` builders now. The saved-view row menu was built twice and **disagreed** — Edit Color was unreachable from the toolbar purely because that list was written separately — and is one component. The preview inspector's hand-rolled Remove gave way to the native property menu its twin already used, which is where its missing Clear came from. Finally `menuTemplate` had become a strict subset of the page template, so it and `popModelMenu` moved behind the one builder.

**What is verified:** every gate green on the final state — typecheck 0, 2598 tests across 227 files, lint at zero diagnostics, the atlas's 20 tables, and `biome format` reporting no drift across `src`. Each duplication was read at both sites before being called one. The audit's findings were opened and confirmed rather than folded on report, and one reviewer claim was checked and found wrong: the preview inspector is not missing its twin's set-aside path, because its single `revealed` set does what the pane needs two sets for. **What is assumed:** nothing about the native menus as rendered — no automation can click one, so the destination submenu, the Style ▸ checkboxes and the create menu's dismissal are the paths only a person can drive.

#### Completion Criteria

- [x] **Every page right-click surface carries the same send block** — Move To ▸ · Copy Link · Copy Path, built from one model, on all six surfaces.
- [x] **No menu file builds its own popup promise** — `Menu.buildFromTemplate` survives only in the helper, the app menu bar, and the two owning menus that run their actions in place rather than returning them.
- [x] **Every duplication the audit found is closed or adjudicated** — five closed; the two confirm-dialog bodies and the six `showMessageBox` call sites are reported rather than built, since a wrapper was scoped out.
- [x] **One model becomes a native menu through one path** — `menuTemplate` and `popModelMenu` retired into `pageMenuTemplate`.
- [x] **Gates green on the final state**, with formatting verified rather than assumed.
- [x] **Every document the work made false corrected in the commit that falsified it** — SidebarPM, CardViewPM, NavigationPM, ViewsPM, PagePreviewPM.
- [x] **The re-walk recorded once**, as a queued arc rather than a scatter of tasks.

#### Next Session

- **A nexus-wide date-format setting**, if wanted. The nexus has a `time_format` and no date equivalent; the trash column defaults to `defaultStyleFor('datetime')` for want of one.
- **The one unverified trash path**, carried through three reviews: whether Electron renders a disabled `Restore ▸` with an empty submenu as a grayed row rather than swallowing it.

#### Feedback

- "I want you to scope out the menu changes surgically and without adding abstractions, or any useless things you don't need."
- "consolidate the menus where they differ" — the standard is that two surfaces doing one job can't drift, not that the code got shorter.
- "Explain it simply and tell me the files it would touch and net-code it would mean." — a proposal is sized before it's offered: the files, the net lines, and what the work is actually insurance against.
- "Any report-backs to Nathan should be simple and explained briefly." — standing.

#### Session Pointers

- `Pommora/src/main/returningMenu.ts` — `popReturningMenu` is the only popup wrapper; `pickAfter` is the seam for a row that asks a confirm before it resolves. `destinationNodes` builds a destination tree.
- `Pommora/src/main/pageMenu.ts` — every model becomes a native template here, including the Move To ▸ expansion. `popModelMenu` is the rows-only case.
- `Pommora/src/shared/pageMenu.ts` — the page menu's items, the send block, `MoveTarget`, and `pageSendActions` for a surface that only points at a page.
- `Pommora/src/main/styleMenu.ts` — the three shared native submenus: Style radios, Align, and the view Style pair.
- `Pommora/src/renderer/src/pageMenuActions.ts` — the renderer half: where a page may be sent, and the three actions every surface answers identically.
- `Pommora/src/renderer/src/Components/ViewRowMenu.tsx` — the saved-view row menu both the toolbar pane and the view embed pop.
- `.claude/ContextPM.md` §The Boring Work — the queued re-walk arc and the deferred cascade journal, each carrying the decision it waits on.

#### Working Notes

- **A shell-scripted file edit bypasses the formatter.** The PostToolUse hook fires on Write/Edit, not on `python3`/`perl` rewrites, and `npm run lint` is `biome lint` — it never checks formatting. Files edited through the shell drift silently past all three gates; `npx biome format <path>` is the only thing that sees it.
- **Electron fires a menu item's click before the popup's close callback.** The create menu had deferred its dismissal by a tick against the opposite possibility; had that been right, every menu on the shared helper would resolve `null` and drop its pick.
- **`Icon` takes `name: string`, not `IconName`** — it resolves the curated registry first, then any full-set Lucide id, so typing a glyph parameter as `IconName` rejects names that render fine.
- **A `const x = 'literal'` widens to `string` inside a mutable object property.** The Move To row's action needed `as const` on its own declaration before the item literal would keep the union.
- **`PageMoveContext` is an all-optional weak type**, so passing a context with no overlapping properties fails the weak-type check — which is what the `kind === 'title' ? ctx : undefined` at the cell menu's call site is buying.

**FILES ADDED**

- `Pommora/src/main/pageMenu.ts`
- `Pommora/src/renderer/src/pageMenuActions.ts`
- `Pommora/src/renderer/src/Components/ViewRowMenu.tsx`

**FILES MODIFIED**

- `Pommora/src/main/` — `returningMenu.ts` · `styleMenu.ts` · `cardMenu.ts` · `cellMenu.ts` · `columnMenu.ts` · `tableMenu.ts` · `gripMenu.ts` · `iconFavoriteMenu.ts` · `optionMenu.ts` · `propertyMenu.ts` · `connMenu.ts` · `pageActionsMenu.ts` · `navRowMenu.ts` · `rowGripMenu.ts` · `tabMenu.ts` · `viewButtonMenu.ts` · `viewEmbedMenu.ts` · `contextMenu.ts` · `index.ts`
- `Pommora/src/shared/` — `pageMenu.ts` · `cardMenu.ts` · `cellMenu.ts` · `rowGripMenu.ts` · `tabMenu.ts` · `navRowMenu.ts` · `tableMenu.ts` · `trashMenu.ts` · `viewMenus.ts` · `views.ts` · `mutate.ts` · and their tests
- `Pommora/src/renderer/src/` — `Detail/Views/Table/TableView.tsx` · `Detail/Views/Cards/CardsView.tsx` · `Tabs/TabBar.tsx` · `Navigation/NavList.tsx` · `Navigation/navList.css` · `Sidebar/Sidebar.tsx` · `Toolbar/ViewPane.tsx` · `Blocks/ViewEmbedBlock.tsx` · `PagePreview/PreviewInspector.tsx` · `destinationTree.ts`
- `.claude/` — `ContextPM.md` · `HistoryPM.md` · `FrameworkPM.md` · `Features/SidebarPM.md` · `CardViewPM.md` · `NavigationPM.md` · `ViewsPM.md` · `ContextsPM.md` · `PagePreviewPM.md`

**COMMITS**

- `22730f40` — the page menu says where a page can go
- `38f60723` — one popper, one Align, one Style, one view row menu
- `11da4b7b` — the folder-is-membership trade, stated where it lives
- `4af00045` — one template builder, and the journal deferred

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.
- If additional guidelines appear here that aren't in the handoffs template, it means they've been user-added and should be preserved.
