## Link Formatting — Session Prompt

Paste this into a fresh session to finish the feature and close it out.

---

You're finishing pasted-link formatting in Pommora. **Phases 1–3 are built, tested and live in the app.** What remains is Phase 4 — two right-click menus and one keyboard chord — and then closeout.

### Read these before touching anything

1. `.claude/Planning/Link Formatting — Implementation Plan.md` — the plan. Read it whole, **starting with the Implementation Log at the bottom**, which is where the real state lives: Progress, Rulings, Observations, Deviations.
2. `.claude/Planning/Link Formatting — Decision Log.md` — the spec. Every decision is `[confirmed]`; **Considered & Rejected lists approaches already ruled out, and retrying one is a defect, not an idea.**
3. `.claude/Guidelines/Editor-Internals.md` and `.claude/Guidelines/Build-Gotchas.md`.

Don't trust the plan's citations or this prompt's. Re-derive every `rg` count before editing the file it points at — several counts in the original plan were wrong, and one was still stale when Task 1 ran.

### Where things stand

Shipped and live: the link grammar reads balanced parentheses two levels deep; one `link-full`/`link-short`/`link-title` vocabulary spans URL properties and the editor; three per-Nexus settings under Pages; the paste path in both editors; and the deferred Page Title swap. Gates 1, 2 and 3 all passed Nathan's live tests.

**Left to build — Phase 4, Tasks 8, 9, 10.** All three touch `src/main`, so none of them appear on a ⌘R; they need a full dev restart to see.

### Task 8 — the link menu

A markdown link pointing at a website is offered **Copy Link and nothing else** today (`main/connMenu.ts`, the `ctx.external` branch). It gains five items — **Rename · Format ▸ · Copy Link**, then a separator, then **Remove Link · Delete** (Requirement 9, ruling R5).

- **Rename** edits the `[…]` label. `applyLinkAction` matches `t.kind === 'wikiLink'` and returns silently otherwise, so the markdown form needs its own applier over the `link` token's `contentRange`.
- **Format ▸** is Full Link · Short Link · Page Title, rewriting the label only. Page Title with nothing cached writes Short Link and registers a `PendingTitle` anchor — reuse Task 7's machinery, never a second mechanism.
- **Remove Link** unwraps to the bare label text — `Mercury` where `[Mercury](https://…)` stood. It writes the *unescaped* label, since that text is prose now.
- **Delete** removes the whole token, text and all.
- The last two sit below a separator, built through `main/pageMenu.ts`'s `separatorBefore` flag rather than a hand-placed separator object.
- Task 8 also **mounts `markdownLinkClicks` in `Tables/CellEditor.tsx`** — per observation O-2 it is absent there, so a link in a table cell has no menu at all.

**Still open, ask before widening:** whether the *connection* menu (a markdown link whose target resolves to a page, plus wikilinks) also gains Remove Link and Delete. It already has Rename, and Format has nothing to offer it. This task ships the external-URL branch only.

Three of Task 8's original premises were wrong and the task body has been rewritten; read it rather than the summary. In particular: `apply` sits only on `ConnMenuTarget`'s `page` variant and must be *added* to the `url` variant, `ConnMenuContext.external` already distinguishes the two cases, and the `default: target.apply?.(action)` that was supposed to catch a missed id lives in the page branch, which Format never reaches — so add an explicit exhaustive switch in the url branch.

### Task 9 — the inverse-paste chord

⌘⇧V does the opposite of whatever ⌘V is set to do. It is currently registered main-side by `{ role: 'editMenu' }` for Paste and Match Style, so **the keypress never reaches the renderer** until that role is expanded into an explicit submenu and the item dropped from both the app menu and the editor context menu. Nathan ruled that trade acceptable (E-7).

The chord is matched renderer-side on keydown, where there is no `clipboardData` — so it reads the clipboard through a `clipboard:read` channel that **does not exist yet** and lands with this task. The paste handler currently passes `inverse: false`; that is the one line to change.

Until this ships, ⌘⇧V behaves like ⌘V, because macOS's Paste and Match Style fires an ordinary paste event into the same handler. That is expected, not a bug.

### Task 10 — `Paste As ▸`

Built **on the menu `installEditorContextMenu` already pops**, never a renderer menu of its own (ruling R2). Offers what the clipboard's target can become, resolved through the existing `resolveMdTarget`: a page target offers Connection and Markdown Link; a URL target offers Full Link, Short Link, Page Title and Plain Text. A clipboard holding neither shows no submenu at all.

Reach into blocks and embeds comes from wiring `menu={{ pushState, onAction }}` in `Blocks/MarkdownBlock.tsx` and `Embeds/PageEmbed.tsx`, which don't pass it today — that also repairs the existing `Format ▸`, `Heading ▸`, `Lists ▸` and `Insert ▸`, all currently inert in those surfaces.

**Not in table cells.** The prose menu never pops over the non-editable table widget, and Nathan accepted its absence there (R4). Requirement 8 states the exception; don't quietly "fix" it.

### Environment, non-negotiable

- Gates, from `Pommora/`: `npm run typecheck` · `npm run test` · `npm run lint`. **Read exit codes directly.** Never pipe a gate into `tail` — you get the pipe's status. A vitest run can also exit non-zero with every test green when a jsdom suite throws in a `requestAnimationFrame`; check for an `Errors` line.
- Launch with `env -u ELECTRON_RUN_AS_NODE npm run dev`. This environment sets that variable, and with it set Electron runs as plain Node and the app crashes.
- Biome owns formatting via a PostToolUse hook. Never hand-align, never run Biome. An Edit failing on whitespace means Biome reformatted — re-read and retry.
- Baseline at handoff: **2675 tests, 232 files, all green.**

### Per task

1. **Re-derive** every count and citation the task names.
2. Read the task's **Why**, the Global Constraints, and Inherited Reasoning. If the Why doesn't justify what you're about to write, say so instead of building it.
3. **Failing test first**, run it, watch it fail for the right reason.
4. Implement. One writer on the tree at a time — if you dispatch an agent, give it a disjoint file set and **forbid every git command**; you stage and commit.
5. If the real shape departed from the written one, rewrite the later tasks that assumed it and record it under **Deviations** *before* committing.
6. Full gate. Never claim a result you didn't watch happen.
7. **Commit the work and tick the task's boxes in the same commit.** Stage explicit paths — never `git add -A`.

### Per phase, at its gate

- Dispatch `code-simplifier` against the phase's commit range, scoped to its paths. A reviewer given no range reads an empty tree and the gate ticks green having looked at nothing.
- **Verify every finding against the code before folding it.** Two agent findings this cycle were right, one corrected the brief, and one defended a mechanism with an argument that turned out to be worth pinning as a test. Fold none on an agent's word.
- Every concern fixed, or carrying Nathan's explicit ruling in the Log.
- Fill in the commit hashes. Then **stop and hand it to Nathan to test.**

### Gate 4 — what Nathan tests

**Full dev restart**; Phase 4 is nearly all main-process.

- **Format ▸** on a real link, cycling all three forms, and the label changing in the document each time. Use a *real* parenthesized address for the Page Title check — `…/wiki/Mercury_(planet)` resolves; a made-up article 404s and correctly keeps its Short Link.
- **Rename** retitling a link. **Remove Link** leaving the bare label as prose. **Delete** taking the whole thing.
- All five items present on an external link, with the separator above the last two, and a page-resolving link still getting the connection menu instead.
- `Format ▸` reaching a link **inside a table cell** — it has no menu at all today.
- **Paste As ▸** on prose, offering the right set for a URL, a `[[Connection]]`, and a non-link clipboard; present in a page, a block and an embed; absent in a table cell.
- **⌘⇧V** doing the inverse of ⌘V in every matrix cell, and Paste and Match Style gone from the Edit menu.

### Closeout, once Gate 4 passes

1. **Write the Delivery Claim** in the plan's Log: every requirement traces to a landed task; the end-to-end acceptance criterion and how it was observed; no new dependency; no mechanism duplicated; nothing left with nothing to vary.
2. **Dispatch a neutral verifier** — "is this true?" — handed the Decision Log, the plan, and the full commit range. Adjudication, not attack. It must read the *spec*, or the one gate positioned to catch "you built less than was agreed" can't see what was agreed.
3. **Then** dispatch `build-breaking-agent` to attack. Two dispatches, never one brief — an agent asked to do both does neither.
4. Run the **Dead Vocabulary sweep**: `rg -F "'link-url'" Pommora/src` → expect 0, with `rg -F "'link-title'" Pommora/src` above 0 as the control. A bare zero from a sweep that never ran looks identical to a clean one.
5. Reconcile the **Made False** table — every doc rewritten in the commit that falsified it. `MarkdownPM.md`, `ConfigurationPM.md`, `PropertiesPM.md` and `ConnectionsPM.md` have all been touched; check what Phase 4 adds.
6. Route **Lessons** to `.claude/Guidelines/`, and write the Log's **Closeout**, including anything that contradicts what the plan asserted.

### Standing rules that bit this cycle

- **Fix causes, not symptoms.** The parenthesized-URL fix is the model: the grammar was wrong, so the grammar was fixed once for all four of its consumers rather than encoded around at the writer.
- **Don't build a thing before it has a consumer.** The picker row variant and `clipboard:read` were both deferred to the task that actually needed them, and both deferrals are logged as Deviations.
- **DRY is hard.** Two writers for one shape is a defect even when both are correct — the paste and its title swap-in had to compose the same markdown, and the byte-for-byte agreement between them is load-bearing.
- **Comments are minimum and why-only.** Never restate a value its declaration holds. `KNOB` and `(Nathan's call)` markers are functional — leave them.
- **Ask before designing.** Anything visual or interactive the plan doesn't already specify — stop and ask.
- **If a task is wrong as specified, stop and say so.** Never satisfy a criterion by weakening it. Reporting a task impossible is a success; a green gate reached by moving the gate is a failure that hides itself.
