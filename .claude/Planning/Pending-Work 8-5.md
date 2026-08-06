## Pending Work — 8-5

Three independent scouts surveyed the codebase and its record, each on its own mandate, with past sessions' priority claims deliberately set aside. Their recommendations sit here unranked within each section; sequencing is adjudicated in conversation, not in this file.

### Hardening & Cleanup

#### Break the IPC Handler Map Out of the Main Entry File

`src/main/index.ts` is the largest file in the repo: the window lifecycle plus one `serveBridge({...})` call inlining roughly sixty channel handlers in a single scroll, none importable or testable on its own. Splitting the handler object into per-domain modules (`ipc/properties.ts`, `ipc/blocks.ts`, `ipc/menus.ts`, `ipc/views.ts`) that `index.ts` composes changes no behavior — `serveBridge` already takes an exhaustive object, so the compiler still catches a missing or extra channel. Purely mechanical, and most other main-process work gets cheaper once it lands.

#### Stop Handlers From Throwing Away the Bridge's Type Contract

`shared/bridge.ts` declares every channel's arguments precisely, but dozens of handler signatures in `index.ts` re-declare their parameters as `unknown` and re-derive the types by hand — and the hand-rolled ladders silently substitute defaults rather than refusing (`view-button-menu` turns any unrecognized value into `'icon'`; `property:setNumberFormat` quietly drops fields it doesn't recognize). Narrowing these back to the declared types, keeping real validation only where a payload is genuinely open, restores a guarantee the codebase currently believes it has but doesn't.

#### Finish the "One Walk" That `governedSweep` Started

`crud/governedSweep.ts` declares itself the single walk every governed-key sweep shares — and has exactly two callers. Option renames, property removal and restore, and the restore scrub still roll their own walk-and-rewrite loops. Not cosmetic: the shared sweep gates on `changedKeys` before writing, which is exactly the guard missing from the option cascade — a no-op option rename still rewrites and re-dates every page holding the option. Migrating the remaining callers fixes that defect at its source and closes the drift the module was written to prevent.

#### Give the Shared View Modules a Home Outside `Table/`

Fourteen files with nothing to do with tables import from `Detail/Views/Table/` — Cards pulls seven modules from it, the panes five more — and ten-line pure helpers exported from the top of the 1600-line `TableView.tsx` drag the whole table component's import graph in to answer one call. Moving the genuinely shared pieces (`Cell`, `resolveContext`, `columnStyles`, `columnLabel`, `linkValue`, and kin) up into `Views/` is import-rewriting only; the four unbuilt renderers would otherwise each add another set of reach-ins.

#### Split the Store Into Domain Slices

`store.ts` is one interface with over a hundred members and one giant object literal covering tree loading, selection, tabs, history, previews, and the rest. The hard part is already done — the pure models live in their own tested modules — so what remains is wiring: composing four or five slice files into the same single store keeps every cross-domain read working exactly as it does now, and makes the file safely editable again.

#### Move `mutate.ts`'s Identity-and-Appearance Arms Into a Crud Module

Six of the dispatcher's operations write inline, and they share one shape: decide whether the target's appearance lives in page frontmatter, a folder sidecar, or the contexts registry, then write the asset and clean up what it replaced. Because that branch is copied per-arm, `setIcon` and `setBanner` already disagree slightly about a missing sidecar id. One `crud/identityWrite.ts` owning the kind-to-location decision is a small, self-contained job.

#### Make the Mid-Adopt Write Guard a Policy Rather Than an Opt-In

Renderer writes must be dropped while the session root swaps — and the `if (adopting()) return BUSY` check covers exactly four channels. Every other write touching synced files (views, container config, the whole schema and property family, `mutate` itself) runs unguarded through a non-modal adopt window. The window is narrow but the failure class is bad — a property edit written into the wrong nexus — and attaching the guard to the entry kind in `ipc.ts` lets a new write channel inherit it instead of remembering it.

#### Retire or Wire `schema:changeType`

Declared, dialed, and fully implemented — and nothing in the renderer calls it. Its only outside references are test mocks, which read as coverage for a path that has never run against a real payload. Either point the properties pane's type picker at it or take the whole path out; leaving it is a standing lie about coverage.

#### Sweep the Small Verified Debts While Their Files Are Open

Three ledger items check out exactly as written and are each a few lines: `useExitPresence` hard-codes an exit window decoupled from the motion tokens (retuning them would make menus flash on close), the preview window fetches the same page twice, and several renderer sites repeat the same `if (!res.ok) showError(...)` line. None is worth a session; all are safe ride-alongs for whatever next touches those files.

### Next Feature

#### Global Search Over a Real Content Index

Pommora can only find things by title, and only from the navigation window — there is no way to search what's inside pages, and the database that would answer holds nothing but window state and folds. This is the single biggest daily-use gap versus Obsidian, and the one piece of plumbing several other features wait on: backlinks, a Space's member list, a Context's aggregate view, and the eventual escape from re-reading the whole vault per change. Build the index and the query layer together, with a ⌘K search surface on top.

#### Backlinks, Linked-From, and Context Surfaces

A page has no idea what points at it, and clicking a Space — Pommora's whole organizing idea — shows an empty dashboard with no list of the pages that tagged it. Until this lands the organization layer is write-only: things get filed everywhere and never gathered back. It rides directly on the content index, so the two are really one arc; this is the half that makes the model visibly pay off.

#### Bringing an Existing Obsidian Vault's Data In

The live nexus is full of frontmatter Obsidian wrote — bare `Status:` and `Projects:` keys Pommora deliberately ignores — so the real vault renders thousands of pages with blank property columns. A mapping surface — point an existing key at a Pommora property, preview, convert in bulk — is the concrete thing standing between "an interesting app" and "the app the notes actually live in."

#### Agenda — Tasks and Events, Built From Scratch

The PRD's own argument for Pommora existing is that Obsidian falls apart at real task management, and Agenda is currently a sidebar tab that says "No tasks or events." The old shape was deleted rather than adapted, so this starts from the settled identity model and an empty schema: decide the fields, put Tasks and Events on the tree, give them a detail surface, and route creation through the existing page writers. The largest and most product-defining cluster left — which is why it should follow the index rather than precede it.

#### Creating a Page From Inside a View

There is no "new row" at the bottom of a table and no "new card" in a grid — the gesture that defines Notion is missing everywhere it would be used. Small, felt every single day, and deserving of a real design conversation about naming-on-create and where the caret lands rather than a quick patch.

#### Images and Attachments That Actually Render

A pasted screenshot or a math formula still shows as raw text; both are explicitly parked. For a notes app this is table stakes, and cheaper than it sounds — the embedded-page tile already established the exact pattern a picture would use. Paired with paste-and-drop handling, a whole category of "I'll just do this in Obsidian instead" disappears.

#### A Trash You Can Browse and Restore From

Every deletion already writes a complete recoverable bundle, and restore is fully built and tested — none of it reachable from the running app, because the listing function has no bridge channel. The cheapest meaningful win on the board, buying something disproportionate: you cannot commit your real notes to an app you don't trust to undo a delete.

#### The Four Dead View Types

List, Gallery, Calendar, and Timeline are registered names whose picker tiles click and do nothing. List and Gallery are close to free — the pipeline behind them is shared and already live — and would make the view picker stop lying. Calendar is really Agenda's twin: build it when there are dated things worth putting on it.

#### Quick Capture From Outside the Window

A small global-shortcut capture panel — title plus a few properties, straight into the existing write path — is the difference between an app you visit and an app you reach for. Fully specced with no code written; the Page-only version can come first, while capturing tasks waits on Agenda.

#### Canvas — Later, Not Now

A complete spec for an embeddable drawing surface exists, and it should stay unbuilt for now: nothing depends on it, nothing is blocked by it, and it doesn't move the needle on replacing a daily notes-and-tasks system. Kept warm as the reward after the index, Agenda, and migration work.

### Tweaks & Completions

#### A Trash Surface So Deleting Stops Being Permanent

The restore op is a live arm in `main/mutate.ts`; what's missing is one line — `listBundles` has no entry in `shared/bridge.ts` — so nothing in the renderer can ask what's in the trash. That channel plus a simple list surface turns a fully-built mechanism into something usable, and makes deletion feel safe for the first time.

#### Render `[[Title|alias]]` as the Alias

The pipe form parses, resolves, and survives every rename cascade — but nothing draws it, so it shows as the styled title followed by a plain-text `|alias` tail. The live vault already contains these, so they read as visibly malformed links today. Hiding the tail and showing the alias when the caret is outside follows the exact bracket-reveal pattern connections already use; the authoring gesture can come later.

#### Finish Flattened Mode for Tables

Cards can turn grouping off and hide the location subtitle; tables can do neither — the Grouping pane gates "None" behind the cards type and the pipeline never flattens for a table. The Figma already shows both toggles and the table's footing is waiting to take them. Closes a story the feature half-told, and a plain ungrouped table is what many collections actually want.

#### Prefix-Aware Headings and Tables Inside Callouts

A heading inside a callout renders but gets no fold chevron — the fold scanner never strips the `>` prefix — and a table inside a callout doesn't render at all. The fix pattern already exists in the same codebase (the prefix-aware list parser strips, parses, and shifts offsets back), so this is applying a solved technique to two more constructs.

#### Give the Four Dead Buttons Their First Contents

Four affordances render at full weight and are hard-disabled: the ViewPane's More ellipsis, the Space pane's actions ellipsis, the Page Preview's Settings button, and the ViewSettings icon picker. Each has an obvious first payload the app already supports — duplicate/rename/delete for a view, the icon registry for the picker. Even one or two remove the "this app is unfinished" feeling they produce every time they're noticed.

#### Let the Filter Pane Author NOR

The `none` match mode is fully live on disk and in the evaluator, but the pane's model excludes it — a hand-authored NOR filter parks the entire pane behind a Reset button with no way to read or edit it. The locking reasoning was sound (the Matches control would misreport it), but the real fix is adding the third option: widen the mode, add the choice, and the existing encoder already handles it.
