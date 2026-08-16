## Link Formatting — Implementation Plan

> **Status:** reviewed, pending approval · Spec: [[Link Formatting — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

A URL pasted into MarkdownPM becomes a markdown link in a form the reader recognizes, chosen nexus-wide and changeable per link. At the end there are three named link forms — Full Link, Short Link, Page Title — that mean the same thing everywhere in the app; a paste that writes one of them; a right-click that changes an existing link to another; and a Paste As menu that offers whichever forms the clipboard's contents can actually take. None of that exists today: pasting a URL writes inert text, and the only place the app has an opinion about how a link reads is a two-value switch buried in a URL property's config.

The shape follows from one finding: almost all of this is already built and unwired. `linkDomain` is Short Link. The `linkTitles` fetcher, its main-side cache and its renderer resolver are Page Title, shipped for URL property cells. `PickerControl` is the three-option double-chevron. `linkDisplayText` is the formatter. So the plan wires existing mechanisms onto one vocabulary rather than building a link subsystem — which is why the vocabulary lands first and everything else consumes it. Per-link Format was weighed against a stored per-link display mode and rejected: markdown stores the label, so rewriting the label *is* the override, with nothing to persist, nothing to sync, and nothing that can disagree with the file.

Bounded to the link feature. The `PopupMenu` design-system split is a separate cycle — Default Format ships on `PickerControl` as it exists today and inherits the beak-less surface when that cycle lands, which is a swap at one call site. Bare-URL autolinking is not solved here.

**Requirements**

1. One `LinkDisplay` vocabulary — `link-full` / `link-short` / `link-title` — with a single formatter, adopted by URL properties.
2. `markdownLinkRegex` reads CommonMark's balanced-parens destination, so a parenthesized URL survives wherever it is authored.
3. Three per-Nexus settings under Pages: *Automatically Format Pasted Links*, *Paste Link Into Text*, and *Default Format* (disclosed only while the first is on), all clean-file.
4. A paste path honouring the inverse rule: ⌘V does what the settings say, the inverse chord does the other thing, selected by whether a selection exists.
5. Page Title writes Short Link immediately and rewrites the label in place when the fetch lands — anchored to the inserted range, an ordinary history entry, dropped if the editor is gone or the text has changed.
6. `Format >` on a markdown link's right-click menu, rewriting the label only.
7. `Paste As >` on the prose right-click menu, offering what the clipboard's target can become.
8. All of it applies in every MarkdownPM surface, including table cells — with one ruled exception: `Paste As` is absent inside a markdown table, because main's prose menu does not pop over a non-editable widget (O-3, R4). Paste behavior and `Format >` still reach cells.
9. A markdown link's right-click menu carries **Rename · Format ▸ · Copy Link**, then below a separator **Remove Link · Delete**. Remove Link unwraps the link to its bare label text; Delete removes the whole `[label](target)` token. Today an external-URL link is offered Copy Link alone, which is thinner than what a link needs to be editable at all. Added late, at Nathan's direction (R5).

**Acceptance — the whole thing working**

In a running nexus with *Automatically Format Pasted Links* on and Default Format set to Page Title: copy `https://en.wikipedia.org/wiki/Foo_(bar)` from a browser, paste into a page body, and the line shows the site's domain immediately and becomes the page's real title within a second or two. ⌘Z restores the domain; a second ⌘Z removes the paste. Right-click that link → `Format > Short Link` and it reads as the domain again. Right-click empty prose → `Paste As > Full Link` and the whole address appears as its own label. Repeat the paste inside a table cell and the cell behaves the same. Open the `.md` in a plain text editor: the target reads `https://en.wikipedia.org/wiki/Foo_(bar)` with no percent-encoding, and the link renders correctly in any CommonMark reader.

**Forced By**

- `linkDisplayText` is already the one formatter, and `pipeline/filter.ts` + `pipeline/sort.ts` call it with **no** display argument → the `link-full`/default branch must keep returning the raw URL, or table sorting and filtering silently change.
- `link_display` is validated `.catch(undefined)` and `link-url` **is** the default → renaming it to `link-full` needs no migration and can't lose a configured value. `link-title` must keep its spelling, or every page configured to Title mode reverts.
- `main/index.ts:987` guards the link-config write with a hand-written `=== 'link-url' || === 'link-title'` chain → widening the enum without widening that guard silently drops the write. Replace the chain with a shared const array.
- `readNexus.ts:81-134` hand-coerces personalization with no zod → a key the writer persists but the reader never parses is silently dropped, works for a session, and reverts on relaunch.
- `MarkdownPM/index.tsx:378` builds the extension array once with dep array `[]` → a new setting must be read at dispatch time via `useSession.getState()`, never captured into the array.
- `Tables/CellEditor.tsx:94` builds a **second** `EditorView` with its own extension array → the paste handler mounts twice or Requirement 8 is half-true.
- CodeMirror runs plugin `domEventHandlers` before its own `handlers.paste` → array position doesn't affect preemption, but the read-only change filter at `index.tsx:182` would silently drop the handler's transaction, so it must check `state.readOnly` itself.
- `Tables/guard.ts`'s `tableMergeGuard` is a `transactionFilter` that cancels multi-line/replacing inserts near a table → a paste transaction can be swallowed there with no trace.
- The prose menu's `menu:action` push channel is wired **only** at `PageView.tsx:134` → Paste As must use the returning-ask pattern (`popReturningMenu`) or it is dead in blocks and embeds, exactly as the existing `Format ▸` already is.
- `main/menu.ts:81` is `{ role: 'editMenu' }`, which registers ⌘⇧V for `pasteAndMatchStyle` **main-side** → the keypress never reaches the renderer, so no renderer binding fires until that role is expanded. **This is the open fork — see Task 9.**
- jsdom has no `ClipboardEvent` or `DataTransfer`, and there is no precedent in the repo → paste tests fabricate the event, and the handler must tolerate a null `clipboardData` (CodeMirror's own `brokenClipboardAPI` path).

**Inherited Reasoning**

Ruled out in the decision log; do not retry.

- **Percent-encoding parens as the paste path writes the target** — symptom handling. Leaves every hand-authored and externally-written link broken, puts `%28` on disk where a person would read a `(`, and makes the encoder a second authority on the grammar.
- **Awaiting the title fetch before writing** — a slow host makes ⌘V appear to do nothing.
- **Never rewriting; Page Title only via right-click once cached** — makes the setting's own default mode do nothing on first paste.
- **A timer gating the late rewrite** — a text-identity gate self-cancels on any edit and needs no threshold anyone has to justify.
- **A per-link stored display mode** — Format is a text rewrite; a sidecar would add a store, a sync surface, and a way for the file and the app to disagree.
- **Keeping `link-url` on disk** — unnecessary, per Forced By.
- **Flipping `pasteURLAsLink: true`** — it only fires on a non-empty selection, hardcodes `[sel](url)`, and carries no vocabulary, no settings gate and no inverse. It stays `false`.

**Grounding** *(re-open these; don't cite them)*

- `.claude/Planning/Link Formatting — Decision Log.md` — the spec. Every decision is `[confirmed]` except E-7.
- `Pommora/src/shared/links.ts` — `markdownLinkRegex`, `MD_LINK`, `linkDomain`, `isHttpLink`, `isValidLink`, `escapeAlias`/`unescapeAlias`.
- `Pommora/src/renderer/src/Detail/Views/Table/linkValue.ts` — `linkDisplayText`, the one formatter.
- `Pommora/src/shared/properties.ts` · `Pommora/src/main/index.ts` (the `property:setLinkConfig` guard) · `Pommora/src/renderer/src/Components/Detail/URLEditor.tsx`.
- `Pommora/src/shared/types.ts` (`Personalization`) · `Pommora/src/main/readNexus.ts` (`readPersonalization`) · `Pommora/src/main/settings.ts`.
- `Pommora/src/renderer/src/Settings/NexusSettings.tsx` · `Pommora/src/renderer/src/Components/Detail/NumberEditor.tsx` (picker rows + `Reveal` disclosure) · `Pommora/src/renderer/src/Settings/TrashLeaf.tsx` (an enum knob storing no key at its default).
- `Pommora/src/renderer/src/MarkdownPM/index.tsx` (the extension array) · `Pommora/src/renderer/src/MarkdownPM/Tables/CellEditor.tsx` (the second one).
- `Pommora/src/renderer/src/MarkdownPM/editor/folding.ts` (`mapPos` with per-end assoc + a validity prune) · `editor/linkGestures.ts` (the announce-by-effect shape) · `editor/linkEdit.ts` (the late-call text check, the stale-span guard, the teardown-race note).
- `Pommora/src/main/connMenu.ts` · `main/returningMenu.ts` · `main/pageMenu.ts` · `main/gripMenu.ts` (submenu shapes) · `main/editorMenu.ts` (the prose menu) · `main/menu.ts` (the `editMenu` role).
- `Pommora/src/shared/connections.ts` (`ConnMenuAction`, `CONN_OPEN_ACTIONS`) · `Pommora/src/renderer/src/Embeds/connectionMenu.ts` (the router).
- `Pommora/src/shared/bridge.ts` · `Pommora/src/preload/index.ts` · `Pommora/src/main/ipc.ts` — the three-site channel pattern.
- `Pommora/src/renderer/src/testing/editorHarness.ts` — `stubEditorBridge`, `mountEditor`.
- `.claude/Guidelines/Editor-Internals.md` — in-domain rules. Two bind here: **hot-path reads share one per-doc-version derivation** (no per-caret whole-doc read; use `docString`), and **a grip's right-press is defaulted away** with the hover flag and hit-test reading one line-class list.
- `.claude/Guidelines/Build-Gotchas.md` · `.claude/Guidelines/Lint-And-Accessibility.md`.

**Environment**

- **Plan directory:** `.claude/Planning/`
- **Spec input:** the decision log above.
- **Explorer agent:** `Explore` (project has no designated explorer; three were dispatched at Phase C and their load-bearing findings verified by hand).
- **Research agent:** not needed — nothing here turns on external prior art.
- **Code reviewer:** `feature-dev:code-reviewer`.
- **Attack reviewer:** `build-breaking-agent` (the project's designated one).
- **Neutral verifier:** `general-purpose`, handed the decision log, the plan, and the commit range.
- **Simplification pass:** `code-simplifier`, plus `comment-killer-agent` per the project's simplification convention.
- **Gate commands:** from `Pommora/package.json`, run from `Pommora/` — `npm run typecheck` · `npm run test` · `npm run lint`.
- **Rules directory:** `.claude/Guidelines/`.

**Shapes:** additive · refactor (the vocabulary rename and the settings row-kind union carry baseline invariants) · fix (Requirement 2 repairs a live defect) · user-visible.

**Global Constraints (every task inherits these)**

- Gates, from `Pommora/`: `npm run typecheck` · `npm run test` · `npm run lint`. Read exit codes directly — **never** through a pipe (`vitest | tail` returns tail's zero and has masked a red suite before).
- Biome owns formatting via a PostToolUse hook. Never hand-align, never run Biome yourself; an Edit failing on whitespace means Biome reformatted — re-read and retry.
- Main owns the filesystem. The renderer never touches Node. Every IPC channel is declared once in `shared/bridge.ts`; both sides derive from it.
- Comments are minimum and why-only. Never restate a value a declaration already holds. `KNOB` and `(Nathan's call)` markers are functional — do not strip them.
- New source files are PascalCase.
- Tokens come from `design-system/tokens`. No hand-rolled tokens.
- Clean-file discipline: a knob resting at its default stores **no key**.
- Docs land in the commit that falsifies them — never a trailing docs task.
- Out of scope everywhere: the `PopupMenu` split · bare-URL autolinking · a general prose context menu beyond the one new submenu · any keyboard binding other than the one in Task 9.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `ConfigurationPM.md` | the Personalization roster (it already omits several shipped keys) | three new keys | 5 |
| `ConfigurationPM.md` | "Its rows are per-Nexus knobs — boolean switches plus the hover-preview linger's slider" | a picker row and a disclosed row | 6 |
| `PropertiesPM.md` | "each link as its full URL, or its fetched page title" | a three-way vocabulary | 2 |
| `MarkdownPM.md` | §Inline marks / §Markdown links — the link description | paste formatting, `Format >`, balanced-parens targets | 3, 8, 10 |
| `MarkdownPM.md` | §Pending — anything the paste path resolves | the paste path shipping | 7 |
| `shared/links.ts` | `linkDomain`'s doc: "The `link-title` look shows this as its placeholder + its offline/404 fallback" | Short Link promotes it to a mode | 2 |
| `MarkdownPM/index.tsx:195-199` | the comment describing `pasteURLAsLink` as "against the paste-preserves-literal-text rule" | that rule is now a setting | 7 |
| `main/linkTitles.ts:1` | "Page-title resolution for URL properties in the `link-title` look" | the editor consumes it too | 8 |

**Dead Vocabulary** *(the closing sweep)*

- `rg -F "'link-url'" Pommora/src` → expect **1**, and only one: the `properties.test.ts` case that feeds the old value on purpose to prove it falls back to the default. Anything else is a missed rename. (`md-link-url` is an unrelated CSS class — search with the quotes.)
- Control: `rg -F "'link-title'" Pommora/src` → expect **>0**. Zero here means the sweep never ran.

**Hazard Window:** Task 2 renames the `link_display` enum; until Task 6 ships the picker, `URLEditor` is the only writer of the new values and the Settings surface has no way to set Default Format. Nothing may hand-edit a `link_display` value in a test nexus while the window is open. Opened by Task 2, closed by Task 6.

---

### Phase 1 — One grammar, one vocabulary

#### Task 1: Widen the markdown-link grammar to CommonMark's balanced-parens destination

**Requirement:** 2

**Why:** `markdownLinkRegex`'s target group is `[^)\r\n]`, so it ends at the first `)` — `…/wiki/Foo_(bar)` truncates mid-address and drops a stray `)` into the prose, today, however the link was authored. Every other requirement writes links, so this is the floor they stand on. Fixed at the grammar rather than at the paste path because the grammar has four consumers and only one of them is ours; encoding at the writer would leave hand-authored and externally-written links broken while putting `%28` on disk where a person expects a `(`.

**Files:**
- Modify: `Pommora/src/shared/links.ts` — `markdownLinkRegex`, and its doc block (the target-group rationale changes).
- Test: `Pommora/src/shared/links.test.ts`

**Derivation**
- `rg -F "markdownLinkRegex" Pommora/src` → **10**, across six files: the declaration, `MarkdownPM/detect/index.ts`'s re-export, `MarkdownPM/tokens/index.ts`, `main/connections/scan.ts`, `main/connections/rewrite.ts`, and `MarkdownPM/detect/detect.test.ts`, which asserts on the regex directly. All are consumers of the widened grammar; none needs its own edit.
- Control: `rg -F "shared/links" Pommora/src` → expect **>0**. Zero means the search never ran.

**Interfaces**
- Produces: `markdownLinkRegex(): RegExp` — unchanged signature, group 2 now admits balanced parens.
- Assumed by: Tasks 7, 8, 10 (every path that writes or rewrites a link target).

**Failure half:** unbalanced open (`[x](((((`) → no match, returns immediately · unbalanced trailing `)` → destination ends before it, per CommonMark · a target containing a space → still matches, as today · empty target → no match, as today (the `{1,…}` floor).

**Deliberate behavior change:** a target carrying an *unmatched opening* paren — `[t](https://a.com/a_(b)` — tokenizes today and will not after, at any nesting depth. CommonMark reads it the new way, so this is a correction; the link becomes plain text and the test names it as intended rather than as a regression.

**Must agree:** `MD_LINK` (the anchored, whole-string form used by `linkValue.ts`) reads a greedy `(.*)` and already handles balanced parens correctly. One test must assert both forms extract the same target from `[x](https://a.com/a_(b))`, or the tokenizer and the property cell disagree about where a link ends.

**Steps:**
- [x] Write the failing tests: single nested pair, two sequential pairs, a **two-deep** nested pair, plain URL unchanged, target-with-space unchanged, unbalanced trailing `)` unchanged, the unmatched-open case asserted as *no match*, and the `MD_LINK`-agreement case.
- [x] Run `npm run test -- links` — expect the nested cases red, the rest green. *(8 red, 30 green.)*
- [x] Widen the target group to two levels: `(?:[^()\r\n]|\((?:[^()\r\n]|\([^()\r\n]*\))*\)){1,2048}`. Rewrite the doc block: the ReDoS note now rests on the alternatives at each level being disjoint on their first character (`(` versus not-`(`), which is what keeps the quantifiers from backtracking ambiguously.
- [x] Re-run — expect all green.
- [x] Add the three pathological inputs (unbalanced-open run, unclosed-label run, long nested run) as timing-free regression cases; they assert a result, not a duration.
- [x] Full gate: `npm run typecheck && npm run test && npm run lint` — expect green.
- [x] Commit: `fix(links): the markdown-link target reads balanced parentheses`

#### Task 2: One LinkDisplay vocabulary, one formatter

**Requirement:** 1

**Why:** URL properties already carry `link_display: 'link-url' | 'link-title'` — the same concept as Full/Short/Page Title, two-valued, with the domain as a fallback inside title mode rather than a mode of its own. Shipping a second three-value vocabulary for the editor would be two definitions of one thing, which the DRY hard rule forbids outright. Consolidating first means every later task consumes one enum and one formatter. Nothing downstream can then disagree about what "Short Link" means.

**Files:**
- Modify: `Pommora/src/shared/properties.ts` — the `link_display` enum and its doc comment; export `LINK_DISPLAYS` as `as const satisfies readonly LinkDisplay[]` and the `LinkDisplay` type.
- Modify: `Pommora/src/shared/bridge.ts` — the `link_display` literal union in the `property:setLinkConfig` args, to the shared type.
- Modify: `Pommora/src/main/index.ts` — the `property:setLinkConfig` guard; replace the hand-written `||` chain with `LINK_DISPLAYS.includes(...)`.
- Move: `Pommora/src/renderer/src/Detail/Views/Table/linkValue.ts` → `Pommora/src/shared/linkValue.ts` (and its test), repointing its nine importers to `@shared/linkValue`. The whole module moves, not just `linkDisplayText`: the formatter calls `parseLink`, and splitting them would mean either a second parser or a shared module importing the renderer, neither of which is available. The file is already pure — its only imports are `@shared/links` and `@shared/propertyValue`.
- Modify: `Pommora/src/shared/linkValue.ts` — `linkDisplayText` gains the `link-short` branch and takes the shared `LinkDisplay`; its doc block is rewritten.
- Modify: `Pommora/src/renderer/src/Detail/Views/Table/LinkCell.tsx` — the fetch gate stays `=== 'link-title'`; its doc comment updates.
- Modify: `Pommora/src/renderer/src/Components/Detail/URLEditor.tsx` — the "Full URL" `Switch` becomes a three-option `PickerControl`; delete the local `LinkDisplay` alias in favour of the shared one.
- Modify: `Pommora/src/renderer/src/Components/Detail/PropertiesPane.tsx` — the call-site default `?? 'link-url'` → `?? 'link-full'`.
- Modify: `Pommora/src/shared/links.ts` — `linkDomain`'s doc block (Short Link promotes it from fallback to mode).
- Modify: `.claude/Features/PropertiesPM.md` — the Display section, to three ways.
- Test: `Pommora/src/shared/linkValue.test.ts` (moved with its module) · `Pommora/src/shared/properties.test.ts`

**Derivation**
- `rg -F "link_display" Pommora/src` → **11** at planning time. Legitimate hits after this task: all 11 remain, none spelling `'link-url'`.
- `rg -F "'link-url'" Pommora/src` → **9** at planning time → expect **0** after.
- Control: `rg -F "'link-title'" Pommora/src` → expect **>0** before and after.

**Interfaces**
- Produces: `type LinkDisplay = 'link-full' | 'link-short' | 'link-title'` and `LINK_DISPLAYS` from `shared/properties.ts`.
- Produces: `linkDisplayText(raw, display?, title?) => string`, now at `@shared/linkValue` — `link-full`/absent returns the raw URL, `link-short` returns `linkDomain(url)`, `link-title` returns `title ?? linkDomain(url)`. An alias still wins over all three.
- Assumed by: Tasks 5, 6, 7, 8, 10 — all of which import the formatter from `@shared/linkValue`, not from the Table folder.

**Failure half:** a stored `'link-url'` from an older file → `.catch(undefined)` drops it → the call-site default resolves to `link-full`, which is where it already was · an unknown string → identical path · `link-title` with no fetched title → `linkDomain`, as today · `linkDomain` on an unparseable target → returns the input trimmed, as today.

**Must agree:** `pipeline/filter.ts:254` and `pipeline/sort.ts:86` call `linkDisplayText(v.value)` with **no** display argument, deliberately, so ordering is stable regardless of a property's look. One test must pin that the no-argument call returns the raw URL — if the default branch ever becomes `link-short`, sorting and filtering change under every URL column with no other symptom.

**Survivors:** `md-link-url` (CSS class, `MarkdownPM/editor/decorations.ts` + `Styles.css` + `mdLinkTarget.test.tsx`) is unrelated to the enum and stays. Search with quotes to keep it out of the sweep.

**Steps:**
- [x] Invert the existing `linkValue.test.ts` cases from `'link-url'` to `'link-full'`, and add the `link-short` and no-argument-default cases. Run — expect red. *(4 red.)*
- [x] Widen the enum in `properties.ts`, export `LinkDisplay` + `LINK_DISPLAYS`, rewrite the doc comment.
- [x] Move `linkValue.ts` and its test into `src/shared/`, repointing the nine importers.
- [x] Add the `link-short` branch to `linkDisplayText`; rewrite its doc block. Re-run — expect green.
- [x] Widen the main-side guard to `LINK_DISPLAYS.includes(...)`; widen the bridge arg type to the shared type.
- [x] Add a `properties.test.ts` case: a three-value round-trip, and an unrecognized value falling back through `.catch` (mirroring the existing `checkbox_color` case).
- [x] Replace `URLEditor`'s "Full URL" Switch with a `PickerControl` labelled **Format**, options ordered Full Link · Short Link · Page Title (default first, so `labelOf`'s fallback reads as the default). Reuse `configRow`/`configLabel` from `settingsPane.css.ts`.
- [x] Update the `PropertiesPane` call-site default, `LinkCell`'s doc comment, and `linkDomain`'s doc block.
- [x] Rewrite the Display section of `PropertiesPM.md`.
- [x] Re-derive the two sweeps above — `'link-url'` at 1 (the deliberate migration case) and the control above 0.
- [x] Full gate — expect green.
- [x] Commit: `refactor(links): one three-way display vocabulary across properties and the editor`

#### Gate 1 — one grammar, one vocabulary, behavior unmoved
- [x] Gate commands green, exit codes read directly. *(typecheck 0 · test 0, 229 files / 2632 tests · lint 0.)*
- [x] Derivations re-run against their controls; counts matched, or the divergence rewrote the plan.
- [x] `rg -F "'link-url'" Pommora/src` → 1, the deliberate migration case only, with the control above 0.
- [x] Simplification and review dispatched against `bdf38cc7..HEAD` scoped to `Pommora/src/shared`, `Pommora/src/main/index.ts`, `Pommora/src/renderer/src/Detail/Views/Table`, `Pommora/src/renderer/src/Components/Detail`.
- [x] Every concern fixed, or carrying an explicit user ruling recorded in the Log. *(One consolidation folded; one out-of-scope DRY hit raised for a ruling — see Open Against Later Tasks.)*
- [ ] The URL property's Format picker seen running: all three modes, and a Wikipedia link rendering un-truncated in a page.
- [x] Hazard window — none. It was deleted at review as incoherent; nothing to hold open.
- [x] Progress hashes filled in.

---

### Phase 2 — The settings

#### Task 3: Three personalization keys

**Requirement:** 3

**Why:** The paste path can't be written before the knobs it reads exist, and the read path is where a new key silently dies. `readNexus.ts` hand-coerces personalization with no zod, so a key the writer persists and the reader never parses works for a session and reverts on relaunch — `readNexus.test.ts` pins exactly that class, which is why the test edit is part of this task rather than a follow-up.

**Files:**
- Modify: `Pommora/src/shared/types.ts` — three optional fields on `Personalization`, beside the existing link cluster.
- Modify: `Pommora/src/main/readNexus.ts` — `readPersonalization`: two `bool()` rows and one enum narrowing helper modelled on the existing `mode` coercer, plus three return rows.
- Test: `Pommora/src/main/readNexus.test.ts` — the boolean round-trip list, plus an enum round-trip beside the linger's.

**Interfaces**
- Produces: `autoFormatPastedLinks?: boolean` (default OFF) · `pasteLinkIntoText?: boolean` (default OFF) · `defaultLinkFormat?: LinkDisplay` (default `link-full`).
- Assumed by: Tasks 4, 6, 7.

**Failure half:** absent block → all three undefined → defaults · a hand-typed junk enum value → the narrowing helper returns undefined → default · a hand-typed non-boolean → `bool()` returns undefined, never a truthy coercion (the `readPermanentDelete` precedent) · an unknown key alongside them → preserved on write by `settings.ts`, untouched here.

**Negative control:** the enum narrowing helper must be proven to *admit* a valid value and *reject* an invalid one in the same test — a helper that returned undefined unconditionally would pass a round-trip test that only ever checked the default.

**Steps:**
- [x] Add the three cases to `readNexus.test.ts`: both booleans in the existing round-trip list, a valid enum value surviving, and an invalid enum value falling to undefined. Run — expect red. *(2 red.)*
- [x] Add the three fields to `Personalization` with why-only comments.
- [x] Add the coercers and return rows in `readPersonalization`. Re-run — expect green.
- [x] Confirm the write path needs nothing: `personalization:set` is key-agnostic (`keyof Personalization` at the type level, any string key through `writePersonalization`), so there is no whitelist to widen — the read path really was the only hazard.
- [x] Full gate — expect green.
- [x] Commit: `feat(settings): personalization keys for pasted-link formatting`

#### Task 4: Generalize the settings leaf to row kinds

**Requirement:** 3

**Why:** `NexusSettings`'s leaf schema models toggles only, with `LingerRow` hardcoded after the map as a bespoke last row — and its own comment says the schema generalizes when a second non-toggle row exists to shape it. Three new rows, one of them a picker and one disclosed by another, is that moment. Done as its own task because it is behavior-preserving over the existing eight rows and a reviewer should be able to approve it on that basis alone, separately from the rows Task 6 adds. Left ungeneralized, the picker would be a second hardcoded special-case and the disclosure a third.

**Files:**
- Modify: `Pommora/src/renderer/src/Settings/NexusSettings.tsx` — `Toggle` → a discriminated `Row` union (`toggle` · `picker` · `slider`); `LeafBody.toggles` → `rows`; fold `LingerRow` into the union and delete the `category === 'pages'` special-case; extract the duplicated row chrome into one `SettingsRow({ label, hint, children })`.
- Modify: `Pommora/src/renderer/src/Settings/nexusSettings.css` — only if the `:last-child` hairline rule needs the `[data-reveal]` hop; see Task 6.

**Interfaces**
- Produces: `type Row = { kind: 'toggle'; … } | { kind: 'picker'; … } | { kind: 'slider'; … }`, and `SettingsRow`.
- Assumed by: Task 6.

**Refactor baseline invariant:** the General leaf renders **6** rows and the Pages leaf renders **3** (2 toggles + the linger slider), before and after. Every existing row keeps its label, hint, order, default, and clean-file write behavior. This phase may not move those numbers.

**Failure half:** a picker row whose stored value is absent → the row shows the default, never blank · a picker row whose stored value is unrecognized → `labelOf` falls back to `options[0]`, which is why the default is ordered first.

**Steps:**
- [x] Introduce the `Row` union and `SettingsRow`; convert the eight existing rows, keeping every label, hint and default verbatim.
- [x] Fold `LingerRow` in as `kind: 'slider'` and delete the `category === 'pages'` conditional at the render site.
- [x] Narrow each variant's key with a `KeyOf<V>` mapped type, so a toggle row cannot name the linger's number and render it as an unchecked switch. The per-key value cast survives in the *write*, where it is irreducible — a union of keys can't correlate key to value in the setter's signature — and now carries a comment saying so.
- [x] **Deviation:** the `picker` variant is not introduced here. It has no consumer until Task 6, and a union member with no row exercising it is a type written against a guess. Task 6 adds it alongside its first row.
- [ ] Run the app: General shows 6 rows, Pages shows 3, the linger slider still sits last and still writes `undefined` at None.
- [x] Full gate — expect green.
- [x] Commit: `refactor(settings): the leaf schema models row kinds`

#### Gate 2 — the schema generalizes, nothing moves
- [x] Gate commands green, exit codes read directly. *(typecheck 0 · lint 0 · test 0, 2634 passing.)*
- [x] Baseline invariant held: 6 General rows, 3 Pages rows, every label/hint/default unchanged — counted from the `LEAVES` table, and the linger still sits last.
- [x] Simplification dispatched against `ad635af5..HEAD`. Its three findings were verified before folding, including a probe proving the removed casts had been masking a real type error. A separate comment pass was not dispatched: the simplifier audited comments as part of its sweep, found them why-only, and named the load-bearing ones (the `aliasPickerOnCommit` absence note, the `KNOB` on window bounds) — dispatching a stripper against that verdict risks losing exactly those.
- [x] Every concern fixed. The one coverage gap the pass exposed — `trashDateFormat` had no test and was being changed — got a round-trip test rather than a reverted line.
- [ ] Settings window seen running; both leaves unchanged from before the phase.
- [x] Progress hashes filled in.

---

### Phase 3 — The paste path

#### Task 5: The paste formatter

**Requirement:** 1, 4

**Why:** Deciding what a paste writes is pure logic — a clipboard string, a mode, a selection, and the two settings in, a document edit out. Split from the DOM handler so the whole decision matrix is testable in the cheap node environment rather than through fabricated clipboard events in jsdom, and so the two editor mounts in Task 6 share one answer instead of each deciding.

**Files:**
- Create: `Pommora/src/shared/PasteLink.ts` — the decision function and the label writer.
- Test: `Pommora/src/shared/PasteLink.test.ts`

**Interfaces**
- Produces: a pure function taking `{ clipboard: string; hasSelection: boolean; selectionText: string; autoFormat: boolean; pasteIntoText: boolean; inverse: boolean; format: LinkDisplay; title?: string }` and returning either the literal text to insert or a `{ label, target }` pair, plus a flag saying whether a deferred title fetch is wanted.
- Assumed by: Tasks 6, 7, 10.

**The matrix this encodes** (⌘⇧V is the inverse of ⌘V on whichever axis a selection selects):

| | ⌘V | inverse |
| --- | --- | --- |
| No selection, auto-format on | formatted link in Default Format | plain URL |
| No selection, auto-format off | plain URL | formatted link |
| Selection, paste-into-text on | `[selection](url)` | selection replaced → falls through to the no-selection row |
| Selection, paste-into-text off | selection replaced → falls through to the no-selection row | `[selection](url)` |

Default Format never applies to a wrap — the selection is the label. A clipboard holding no URL takes no special path under either chord.

**Failure half:** clipboard is empty or whitespace → plain paste · clipboard holds multi-line text, or a URL with prose around it → plain paste (a pasted document, not a pasted address) · clipboard holds a schemeless dotted host (`example.com`) → `normalizeLinkUrl` applies `https://`, as `isValidLink` already does · `mailto:` → `isValidLink` accepts it, `isHttpLink` refuses it, so Page Title mode must not request a fetch for one · the selection text contains `]` or `\` → escaped via `escapeAlias` · the selection spans a line break → treated as no wrap.

**Must agree:** the label this writes for `link-short` and `link-title` must be the same string `linkDisplayText` produces for the same URL and mode. One test crosses both — if the paste path grows its own domain-stripping, a pasted link and the same URL in a property cell read differently.

**Steps:**
- [ ] Write the failing tests: all eight matrix cells, plus every failure-half case and the `linkDisplayText`-agreement case.
- [ ] Run — expect red, module not found.
- [ ] Implement, composing `isValidLink`, `normalizeLinkUrl`, `isHttpLink`, `linkDisplayText`, and `escapeAlias` from the existing modules. Write no second URL parser.
- [ ] Re-run — expect green.
- [ ] Full gate — expect green.
- [ ] Commit: `feat(links): the pasted-link decision, as pure logic`

#### Task 6: Mount the paste handler in both editors

**Requirement:** 4, 8 · **closes the hazard window**

**Why:** This is where the feature becomes real, and it mounts twice because there are two editors: `MarkdownPM/index.tsx` builds one extension array and `Tables/CellEditor.tsx` builds a second. One mount satisfies Requirement 4 and leaves Requirement 8 half-true. The settings rows land here too, in the same commit, so the knobs and the behavior they govern ship together and `ConfigurationPM` is falsified exactly once.

**Files:**
- Create: `Pommora/src/renderer/src/MarkdownPM/editor/PasteLink.ts` — the `paste` DOM handler.
- Modify: `Pommora/src/renderer/src/MarkdownPM/index.tsx` — mount it beside the other link-gesture extensions; rewrite the `pasteURLAsLink` comment (it now describes a setting, not a rule).
- Modify: `Pommora/src/renderer/src/MarkdownPM/Tables/CellEditor.tsx` — mount it in the cell's array.
- Modify: `Pommora/src/renderer/src/Settings/NexusSettings.tsx` — the three Pages rows, with Default Format wrapped in `Reveal`.
- Modify: `Pommora/src/renderer/src/Settings/nexusSettings.css` — the `.settings-row:last-child` hairline rule needs the `[data-reveal]` hop, or the last visible row keeps a stray rule while the disclosure is collapsed.
- Modify: `.claude/Features/ConfigurationPM.md` — the roster and the Settings Window row description.
- Test: `Pommora/src/renderer/src/MarkdownPM/editor/pasteLink.test.tsx`

**Interfaces**
- Produces: the paste extension, and the settings rows that drive it.
- Assumed by: Tasks 7, 10.

**Failure half:** `event.clipboardData` is null (CodeMirror's `brokenClipboardAPI` path, and jsdom) → decline, let the default paste run · `state.readOnly` → decline before dispatching, since the read-only change filter would drop the transaction silently · a paste landing next to a table → `tableMergeGuard` may cancel the transaction outright; the handler must not assume its dispatch landed · a cell is single-line GFM → the written label carries no newline and escapes `|`.

**Negative control:** with the auto-format setting off and no inverse chord, a pasted URL must land as literal text — and the test must go red if the settings gate is removed. A test that passes with the gate disabled proves only that the handler runs.

**Steps:**
- [ ] Write the failing jsdom tests, fabricating the paste event (`new Event('paste', …)` with a defined `clipboardData`; jsdom has neither `ClipboardEvent` nor `DataTransfer`, and there is no precedent in the repo to copy). Cover: settings off → literal; settings on → formatted; selection + wrap on → `[selection](url)`; read-only → untouched; null `clipboardData` → declined. Stub personalization with `useSession.setState({ personalization: { … } })`, as `connectionCommit.test.tsx` does.
- [ ] Run — expect red.
- [ ] Implement the handler. Read settings at dispatch time via `useSession.getState()` — the extension array is built once with dep array `[]`, so a captured value would freeze at mount. Dispatch with `userEvent: 'input.paste'`, matching every other write in this editor.
- [ ] Mount in `index.tsx` beside `markdownLinkClicks` / `aliasOnLeave`, and in `CellEditor.tsx`. Rewrite the `pasteURLAsLink` comment.
- [ ] Re-run — expect green.
- [ ] Add the three Pages rows. Default Format writes `undefined` at its default, following `TrashLeaf`'s enum precedent; both toggles are default-OFF so they store `true`/`undefined`. Wrap Default Format in `Reveal` with `fill`, keyed on the auto-format toggle.
- [ ] Fix the `:last-child` hairline against the collapsed `[data-reveal]` sibling.
- [ ] Decide the `aliasPickerOnCommit` question the leaf's own comment raises: it is a Pages key deliberately unlisted pending wording. Either surface it now with wording, or leave the comment intact — do not silently drop it.
- [ ] Rewrite `ConfigurationPM.md`'s roster and Settings Window description.
- [ ] Run the app: every matrix cell by hand in a page body **and** in a table cell; confirm Default Format discloses and hides with its toggle, and that a default-valued knob writes no key.
- [ ] Full gate — expect green.
- [ ] Commit: `feat(links): pasted URLs format to the chosen link form`

#### Task 7: The deferred Page Title rewrite

**Requirement:** 5

**Why:** The title fetch is asynchronous and often slow, so Page Title writes Short Link at once and swaps the label when the answer lands. Split from Task 6 because it is the one piece with a lifetime beyond its own transaction, and every hazard it carries is a lifetime hazard: the same URL pasted twice, an edit landing in between, the page closing first, ⌘Z. A text match alone can't anchor it — two identical pastes match in both places — so it tracks the inserted range, mapped forward, and verifies the text before touching anything.

**Files:**
- Create: `Pommora/src/renderer/src/MarkdownPM/editor/PendingTitle.ts` — the `StateEffect` + `StateField` anchor and the rewrite dispatch.
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/PasteLink.ts` — announce the inserted range when the paste wants a title.
- Modify: `Pommora/src/renderer/src/MarkdownPM/index.tsx` and `Tables/CellEditor.tsx` — mount the field in both.
- Modify: `Pommora/src/main/linkTitles.ts` — its header comment ("for URL properties") is falsified by the editor consuming it.
- Modify: `.claude/Features/MarkdownPM.md` — the links description and any Pending entry this resolves.
- Test: `Pommora/src/renderer/src/MarkdownPM/editor/pendingTitle.test.ts` (pure `EditorState` drive, no jsdom) and a jsdom case for the store round-trip.

**Interfaces**
- Consumes: `useSession.getState().resolveLinkTitle(url)` and the `linkTitles` map — both shipped.
- Produces: the anchor field. Nothing later consumes it.

**Failure half:** the fetch fails or the host is offline → `failedTitles` absorbs it and the label stays Short Link, permanently and silently · the same URL pasted twice → each paste holds its own anchor, so one fetch rewrites only the link it was pasted for · the user edits the label before the title lands → the text check fails, the rewrite declines · the user deletes the link → `mapPos` plus the validity prune drops the anchor · the editor unmounts first → the rewrite is dropped rather than dispatched into a dead view · the fetch resolves after a nexus switch → harmless, a URL's title is the same in any nexus, and main won't persist it cross-nexus.

**Must agree:** the rewritten label must equal what `linkDisplayText(url, 'link-title', fetchedTitle)` returns. One test crosses both, or a link pasted in Page Title mode and a property cell in Page Title mode show different text for the same URL and the same fetch.

**Steps:**
- [ ] Write the failing pure-state tests: the anchor survives its own transaction's changes and selection (as `linkGestures.test.ts` pins for `restedOnLink`); it maps forward through an edit above it; it is pruned when its range is deleted; the text check declines after the label is edited; two anchors for the same URL stay distinct.
- [ ] Run — expect red.
- [ ] Implement the field, following `folding.ts`'s `mapPos`-with-per-end-assoc plus validity prune, and `linkGestures.ts`'s announce-by-effect. Guard the stale span the way `linkEdit.ts` does — `lineAt` throws past the document's end rather than clamping.
- [ ] Dispatch the rewrite as an **ordinary history entry** — two ⌘Z presses remove a paste whose title arrived, and that is the ruled behavior. Do not reach for `Transaction.addToHistory`: undo-transparency leaves the fetched title behind as prose the second press cannot reach, which is worse than the extra press.
- [ ] Guard against a destroyed view before dispatching. `linkEdit.ts`'s doc block on blur-versus-listener names this race directly. In a table cell the view dies when the cell deactivates, so a paste-then-tab-away keeps its Short Link permanently — a disclosed consequence, reachable later through `Format > Page Title` against the cache. Say so in a why-only comment; do not build machinery against it.
- [ ] Re-run — expect green.
- [ ] Update `linkTitles.ts`'s header comment and the `MarkdownPM.md` sections.
- [ ] Run the app: paste in Page Title mode against a live site and a dead host; paste the same URL twice; edit one label before its fetch lands; ⌘Z twice after a swap; paste into a cell and tab away before the fetch lands.
- [ ] Full gate — expect green.
- [ ] Commit: `feat(links): a pasted link takes its page title when the fetch lands`

> **Gate 3 passed** (Nathan, live). The one reported failure — a Wikipedia address never resolving its Page Title — was a bad test URL in the walkthrough, not a defect: `…/wiki/Foo_(bar)` is not a real article and returns **404**, which the fetcher correctly turns into no title, leaving the Short Link standing. Verified against the live host, where a real parenthesized article (`…/wiki/Mercury_(planet)`) returns **200** and resolves.

#### Gate 3 — pasting works, everywhere, reversibly
- [ ] Gate commands green, exit codes read directly.
- [ ] Every matrix cell exercised by hand in a page body **and** a table cell.
- [ ] Two ⌘Z presses remove a paste whose title swapped — the first restoring the Short Link.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `Pommora/src/renderer/src/MarkdownPM`, `Pommora/src/renderer/src/Settings`, `Pommora/src/shared/PasteLink.ts`.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Hazard window closed at Task 6 — confirmed in the Log.
- [ ] Progress hashes filled in.

---

### Phase 4 — The menus

#### Task 8: The link menu — Rename · Format ▸ · Copy Link · Delete

**Requirement:** 6, 9

**The whole menu, not just Format.** `popConnMenu`'s external branch offers Copy Link and nothing else (`main/connMenu.ts:16`), so a markdown link pointing at a website cannot currently be retitled, reformatted or removed from its own menu. The four items land together:

- **Rename** — edit the `[…]` label. The wikilink menu's `rename` already means exactly this for an alias; the markdown form needs its own applier because `applyLinkAction` matches `t.kind === 'wikiLink'` and returns silently otherwise.
- **Format ▸** — Full Link · Short Link · Page Title, rewriting the label only (Requirement 6). Page Title with no cached title writes Short Link and registers a `PendingTitle` anchor, reusing Task 7's machinery rather than a second mechanism.
- **Copy Link** — already there; keep it.
- **Remove Link** — unwraps to the bare label text, leaving `Mercury` where `[Mercury](https://…)` stood. What "remove link" means in every editor that has it.
- **Delete** — removes the whole token, text and all.

The last two sit **below a separator**, apart from the three that edit a link you are keeping. `main/pageMenu.ts` expands a `separatorBefore` flag into a real separator, which is the mechanism to use rather than a hand-placed `{ type: 'separator' }`.

**Failure half for the pair:** an empty label (`[](url)`) → Remove Link leaves nothing, which is the same as Delete and is fine · a label carrying escapes (`\]`, `\\`) → Remove Link writes the *unescaped* text, since it is prose now and `unescapeAlias` is what reverses the writer · both guard the stale span the way `linkEdit.ts:21` does, because a native menu can be held open indefinitely.

**Must agree:** Remove Link's output must equal the label Format would show for the same link — both read the label through the same accessor, or unwrapping a Short Link would produce different text than the link displayed.

**Scope note:** these are for the *external-URL* branch. A markdown link whose target resolves to a page is drawn and menued as a connection, and Format has nothing to offer it. **[open]** Whether that connection menu also gains Remove Link and Delete is not decided; it already has Rename. Ask before widening it — this task ships the external branch.

**Why:** The nexus-wide default applies at paste time; Format is how one link departs from it. It rewrites the `[…]` label and stores nothing — no sidecar, no per-link state, so nothing can disagree with the file and there is no override layer for the default to defer to. It lands before Paste As because it is the smaller of the two menu changes and it establishes the action-id shape Paste As reuses.

**Files:**
- Modify: `Pommora/src/shared/connections.ts` — a `ConnFormatAction` added to `ConnMenuAction`, with an `as const satisfies` array for item order.
- Modify: `Pommora/src/shared/connections.ts` — `ConnMenuContext` gains a field distinguishing a `[label](target)` link from a `[[wikilink]]`; main cannot otherwise tell them apart, since both arrive today as the same non-external context.
- Modify: `Pommora/src/main/connMenu.ts` — build the submenu, following `gripMenu.ts`'s radio-submenu-with-parameterized-action shape.
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/links.ts` — the `contextmenu` handler passes the new context field and an `apply` closure over the hit's span. It currently passes `editable: false` and **no** `apply`, so a markdown link's menu can carry no edit action at all.
- Modify: `Pommora/src/renderer/src/MarkdownPM/Tables/CellEditor.tsx` — mount `markdownLinkClicks` in the cell's extension array. Per O-2 it is absent there, so a link in a cell has no menu to put `Format >` on; without this, `Format >` is missing in cells. This is the renderer's own menu, so it is unaffected by O-3.
- Modify: `Pommora/src/renderer/src/MarkdownPM/connections/index.ts` — widen `ConnMenuTarget.apply`'s parameter beyond `ConnEditAction`.
- Modify: `Pommora/src/renderer/src/Embeds/connectionMenu.ts` — route the new ids.
- Create: the label rewrite. `applyLinkAction` only matches `t.kind === 'wikiLink'` and returns silently otherwise, so a markdown link's label needs its own function over the `link` token's `contentRange`.
- Modify: `.claude/Features/MarkdownPM.md` · `.claude/Features/ConnectionsPM.md` if it describes the link menu.
- Test: `Pommora/src/renderer/src/MarkdownPM/editor/linkFormat.test.tsx`

**Interfaces**
- Produces: the format action ids and the label rewriter.
- Assumed by: Task 10 (Paste As reuses the id shape and the same formatter).

**Failure half:** the menu is held open while the document changes beneath it → the stale-span guard (`range[0] > doc.length`, as `linkEdit.ts:21` does) declines · the link is deleted while the menu is open → same · Page Title chosen with no cached title → writes Short Link and requests the fetch, reusing Task 7's anchor rather than a second mechanism · a label containing `]` → `escapeAlias`.

**Must agree:** the label Format writes must equal what the paste path writes for the same URL and mode. Both call `linkDisplayText`; one test crosses them.

**Steps:**
- [x] Write the failing tests, modelled on `externalLink.test.tsx`: stub `connMenu`, right-click a rendered link, assert the context offered and the resulting document for each of the three modes.
- [x] Run — expect red. Ten of thirteen red; the three that passed are the ones asserting today's behaviour (read-only, Copy Link) and the stale-span decline, which cannot go red before the action exists.
- [x] Add the action ids in `shared/connections.ts`. No context field: `ConnMenuContext.external` already tells the two cases apart, and `editable` already carries whether the surface can take an edit.
- [x] Build the submenu in `connMenu.ts`. `main/editorMenu.ts`'s prose `Format ▸` never appears alongside it — O-1 observed the link menu popping alone.
- [x] Add `apply` to the url target, add the renderer routes, write the applier over the `link` token's spans.
- [x] Re-run — expect green. The predicted compile error landed, in the page branch rather than the url one: widening `ConnMenuAction` made `default: target.apply?.(action)` unassignable to `ConnEditAction`, and the two authoring ids are now named rather than caught.
- [x] Update the feature docs.
- [ ] Run the app: all three Format modes on a real link; a link whose page resolves (drawn as a connection) must still get the connection menu, not this one. → Gate 4.
- [x] Full gate — expect green.
- [x] Commit: `feat(links): a link's menu edits the link`

#### Task 9: The inverse-paste chord

**Requirement:** 4

> **E-7 ruled: the chord is taken from Paste and Match Style.** ⌘⇧V is registered main-side by `{ role: 'editMenu' }` (`main/menu.ts:81`), so the keypress never reaches the renderer until that role is expanded into an explicit submenu and the item dropped — from the app menu and from the editor's context menu (`editorMenu.ts:57`). The item costs little here: MarkdownPM is CodeMirror, so a paste is stripped to plain text regardless, and the app's other inputs are plain too.

**Why:** The settings decide what ⌘V does; the inverse chord always does the other thing. One rule rather than two, and it means the less-used behavior is always one modifier away instead of buried in a menu — which is what let the Paste Link menu item be dropped entirely.

**Files:**
- Modify: `Pommora/src/shared/types.ts` — one row in `DEFAULT_COMMANDS`, so the binding is data like every other rebindable shortcut.
- Modify: `Pommora/src/main/menu.ts` — expand the `editMenu` role into an explicit submenu, dropping Paste and Match Style.
- Modify: `Pommora/src/main/editorMenu.ts` — drop `pasteAndMatchStyle` from `systemItems`.
- Modify: the paste handler from Task 6 — read the chord and pass `inverse` through. The chord is matched renderer-side on keydown (`App.tsx:176-186`), where no `clipboardData` exists, so it reads the clipboard through the `clipboard:read` channel Task 6 brings forward.
- Modify: `.claude/Features/ConfigurationPM.md` — the Commands roster.

**Failure half:** the chord fires with an empty clipboard → ordinary paste · with a non-URL clipboard → ordinary paste · in a read-only surface → declined · outside any editor → not handled.

**Steps:**
- [x] Confirm the branch with the user before touching anything. Ruled already, as E-7.
- [x] Add the `DEFAULT_COMMANDS` row.
- [x] Branch A: expand the role, drop the item from both menus. Whether the chord now reaches the renderer is the whole risk of the branch and is observable in one keypress → Gate 4.
- [x] Wire `inverse` through the paste handler; six matrix cases cover the chord at the DOM level, where the decision's own inverse cases were already covered pure.
- [x] Update the Commands roster in `ConfigurationPM.md`.
- [ ] Run the app: every inverse cell of the matrix. → Gate 4.
- [x] Full gate — expect green.
- [x] Commit: `feat(links): the inverse paste chord`

#### Task 10: `Paste As >` on the prose menu

**Requirement:** 7

**Why:** Auto-format decides what a paste does by default; Paste As is how you choose per paste without changing the setting. It offers only forms the clipboard's contents can actually take, resolved through `resolveMdTarget` — the resolver the click path and both renderers already share — so the menu can never offer a form the writer can't produce.

It is built **on the menu `installEditorContextMenu` already pops**, not as a renderer menu of its own. Main pops for every editable target and only the renderer-set `gripHot` flag suppresses it, so a competing renderer menu would either appear alongside it or replace it — and replacing it costs the system edit items, spelling, `Format ▸`, `Heading ▸`, `Lists ▸`, `Insert ▸`, Speech and Share. One menu is the requirement; reach into blocks and embeds is bought by wiring those two surfaces, which is a smaller change than owning a second menu.

**Files:**
- Modify: `Pommora/src/shared/bridge.ts` — a channel carrying the resolved paste-as option set from the renderer to main, following `setEditorFormatState`'s precedent (main cannot resolve a page title against the renderer's index, so the renderer pushes what main can't see).
- Modify: `Pommora/src/preload/index.ts` — one line.
- Modify: `Pommora/src/main/index.ts` — the handler; `clipboard` is already imported. (`clipboard:read` itself landed in Task 6.)
- Create: `Pommora/src/shared/PasteAsMenu.ts` — the action ids and the menu model, so it is testable. There are no tests for `src/main` menu builders anywhere in the repo; the house pattern is a shared model plus template assembly in main.
- Modify: `Pommora/src/main/editorMenu.ts` — append the `Paste As ▸` submenu in `pommoraItems`, omitted entirely when the option set is empty (`cardMenu.ts`'s precedent), and route its action ids through the existing `menu:action` dispatch.
- Modify: `Pommora/src/renderer/src/Detail/PageView.tsx` — unchanged, it already wires `menu`.
- Modify: `Pommora/src/renderer/src/Blocks/MarkdownBlock.tsx` and `Pommora/src/renderer/src/Embeds/PageEmbed.tsx` — wire `menu={{ pushState, onAction }}`, which they don't today. This is what makes Paste As reach every surface, and it repairs the existing `Format ▸` in the same stroke.
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/menu.ts` — handle the new ids in `applyEditorAction`.
- Modify: `.claude/Features/MarkdownPM.md`.
- Test: `Pommora/src/shared/pasteAsMenu.test.ts` (the model) and a jsdom case for the apply path.

**Derivation**
- The three editor `contextmenu` handlers this must not collide with: `rg -n "contextmenu" Pommora/src/renderer/src/MarkdownPM` → **6** at planning time across `editor/links.ts`, `editor/connections.ts`, `editor/gripMenu.ts` (declarations plus comments).
- Control: `rg -n "domEventHandlers" Pommora/src/renderer/src/MarkdownPM` → expect **>0**.

**Interfaces**
- Consumes: `resolveMdTarget`, `linkDisplayText`, and Task 5's decision function.
- Produces: nothing later consumes it.

**The option set:** a clipboard target that resolves to a **page** offers Connection and Markdown Link; one that names a **URL** offers Full Link, Short Link, Page Title, and Plain Text. Page resolution wins outright where both could apply — the existing resolver already rules that way on purpose, so `Node.js` and `Notes.md` reach the pages they name. A clipboard holding neither offers nothing, and the submenu is omitted rather than shown empty (`cardMenu.ts`'s precedent).

**Failure half:** an empty clipboard → no submenu · clipboard holds a `[[Title]]` naming no page → the page branch is unavailable, the raw text is all there is · the menu is held open while the document changes → the stale-span guard · a cell target → single-line GFM, so the written label carries no newline and escapes `|`.

**Negative control:** with a non-link clipboard, the Paste As submenu must be **absent** — and the test must go red if the resolution gate is removed, or it proves only that the menu builds.

**Steps:**
- [x] **Observed (O-1):** one menu, not two — links need no hot-flag treatment. The contingent step this task carried is dropped.
- [x] **Observed (O-2, O-3):** a cell gets no menu at all, active or resting. The link half is Task 8's mount; the prose half never pops over the non-editable table widget, and R4 accepts Paste As as absent in cells — so this task builds nothing for them.
- [ ] Write the failing model tests: each clipboard shape → the exact option set, in order; a non-link clipboard → no submenu at all.
- [ ] Run — expect red.
- [ ] Add the option-set push channel. A channel added to `Asks` with no handler is a compile error, so all three sites land together.
- [ ] Implement the shared model; re-run — expect green.
- [ ] Append the submenu in `editorMenu.ts`'s `pommoraItems`, and handle its ids in `applyEditorAction`.
- [ ] Wire `menu={{ pushState, onAction }}` in `MarkdownBlock.tsx` and `PageEmbed.tsx`. Verify the existing `Format ▸` starts working in those surfaces — that is the observable proof the wiring landed.
- [ ] Update `MarkdownPM.md`.
- [ ] Run the app: each clipboard shape, in a page body and a table cell, in a block and an embed.
- [ ] Full gate — expect green.
- [ ] Commit: `feat(links): Paste As offers the forms the clipboard can take`

#### Gate 4 — both menus, in every surface
- [ ] Gate commands green, exit codes read directly.
- [ ] Derivations re-run against their controls.
- [ ] The link-versus-prose menu collision observed and resolved, with the observation recorded in the Log.
- [ ] Paste As exercised in a page body, a table cell, a block, and an embed — the surfaces where the existing `Format ▸` is already inert.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `Pommora/src/main`, `Pommora/src/shared`, `Pommora/src/preload`, `Pommora/src/renderer/src/MarkdownPM`, `Pommora/src/renderer/src/Embeds`.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — One grammar, one vocabulary · base `bdf38cc7`
  - [x] Task 1 — Widen the markdown-link grammar · `ee3ee22e`
  - [ ] Task 2 — One LinkDisplay vocabulary, one formatter · `<commit>`
- [ ] **Phase 2** — The settings · base `ad635af5`
  - [x] Task 3 — Three personalization keys · `360ebf91`
  - [x] Task 4 — Generalize the settings leaf to row kinds · `a450973b`, simplified in `81d80804`
- [x] **Phase 3** — The paste path · base `e84d5509`
  - [x] Task 5 — The paste formatter · `5f50d9f3`
  - [x] Task 6 — Mount the paste handler in both editors · `6ceaa384`
  - [x] Task 7 — The deferred Page Title rewrite · `44c47449`, simplified in `3db60832`
- [ ] **Phase 4** — The menus
  - [x] Task 8 — The link menu, and links in cells · `<commit>`
  - [x] Task 9 — The inverse-paste chord · `<commit>`
  - [ ] Task 10 — `Paste As >` on the prose menu · `<commit>`

### Observations

The two the review could not settle statically, taken on the running app before Phase 1.

- **O-1 — a link's menu and the prose menu do not collide.** Right-clicking a rendered link in a page body pops exactly one menu: the link's own (Open Preview · Open New Tab · Copy Link · Copy Path). The prose menu does not appear behind or beside it, so links and connections need none of the hot-flag treatment grips have, and E-6's open question closes. Task 10 loses that contingent step.
- **O-2 — a link inside a table cell gets no menu at all**, and two separate causes stack to produce it. `markdownLinkClicks` — which carries the `contextmenu` handler — is mounted only at `MarkdownPM/index.tsx:252` and is absent from `Tables/CellEditor.tsx`'s extension array, so there is no link menu in a cell under any condition. Beneath that, a resting cell is not an editor at all: it renders `Tables/cellStatic.tsx` as plain spans inside the widget's `contentEditable=false` host, so `installEditorContextMenu` bails at its `!params.isEditable` guard and the prose menu does not pop either. A cell mounts a real `EditorView` only while it is the active cell.
  - **Consequence for Task 8:** `Format >` needs `markdownLinkClicks` mounted in `CellEditor.tsx`, or Requirement 8 is false for cells. Folded into that task.
- **O-3 — the prose menu does not appear inside a table cell at all**, active or resting (observed with the caret in the cell). `editorMenu.ts:20-22` already names the cause in passing: the table widget is non-editable content, so main's `context-menu` handler bails at `!params.isEditable` over the whole widget. This is existing behavior, not something this cycle introduces — the `Format ▸`, `Heading ▸`, `Lists ▸` and `Insert ▸` submenus are all absent in cells today for the same reason.
  - **Consequence for Task 10 — R2 cannot reach table cells,** and **R4 accepts that.** Paste As rides the menu `editorMenu` already pops, and that menu never pops in a cell, so Paste As is absent there. Nothing else in the feature is affected: ⌘V and the inverse chord are DOM and keyboard paths that work in a cell once Task 6 mounts them, and Task 8's `Format >` rides the renderer's own link menu, which the cell mount restores.

### Rulings
- **R5 — the link menu carries Rename · Format ▸ · Copy Link, then Remove Link · Delete below a separator** (Nathan, added during Gate 3, settled the same session). Requirement 9. An external-URL link is offered Copy Link alone today, which is not enough to edit a link at all. The two readings of "delete the link" were both wanted, so both ship as their own item: **Remove Link** unwraps to the bare label text, **Delete** removes the whole token. Task 8 is unblocked.
- **R4 — Paste As is accepted as absent inside table cells** (Nathan: "Accept it"). The prose menu never pops over the non-editable table widget (O-3), and reversing that would mean making the widget report as editable — a change well outside this feature's blast radius. Requirement 8 now states the exception rather than being quietly false. Nothing else about cells changes: pasting still formats there, and `Format >` still reaches links there once Task 8 mounts the link handler.
- **R1 — two ⌘Z presses are accepted** (Nathan). The title swap stays an ordinary history entry rather than growing a custom undo command; the cost lands only on the first paste of a URL, since the title is cached afterwards.
- **E-7 — ⌘⇧V is taken from Paste and Match Style** (Nathan). The role is expanded and the item dropped from both menus.
- **R2 — Paste As is built on the menu `editorMenu` already pops** (Nathan: "just use the same one that editorMenu does"), rather than a renderer menu of its own. Reach into blocks and embeds comes from wiring those two surfaces' `menu` prop, which repairs the existing `Format ▸` there at the same time.
- **R3 — two levels of parenthesis nesting, and the unmatched-opening-paren case reads the CommonMark way** (Nathan: "whatever's best"; the options were gathered and the recommendation stated before the call).

### Open Against Later Tasks

All four rulings are settled. Each was raised by the attack review and verified by hand against the code.

- **R1 — the undo mechanism. RULED:** the swap is an ordinary history entry, so two ⌘Z presses remove a paste whose title arrived. Undo-transparency is unavailable — `addToHistory` is not a `TransactionSpec` key (the real API is the `Transaction.addToHistory` annotation, `@codemirror/state` d.ts:1013), and once corrected, CodeMirror maps the paste's inversion through the non-history swap and leaves the fetched title behind as prose a second press cannot reach. In a table cell the editor dies when the cell deactivates, so a paste-then-tab-away keeps its Short Link permanently and reaches its title later through `Format > Page Title` — disclosed, not guarded. → C-5, C-5a, Task 7.
- **R2 — Paste As menu ownership. RULED:** build it on the menu `editorMenu` already pops. → E-1a, Task 10 rewritten.
- **R3 — regex nesting depth. RULED:** two levels, and the unmatched-opening-paren case goes the way CommonMark reads it. → C-8, Task 1.
- **E-7 — the ⌘⇧V chord. RULED:** taken from Paste and Match Style, which is dropped from the app menu and the editor context menu. → Task 9 unblocked.

Folded without needing a ruling:

- **Auto-format fired on any dotted token.** `isValidLink` is a validity check, not an intent check: verified that `App.tsx`, `readme.md`, `package.json`, `Node.js` and `3.14` all pass it (`3.14` resolving to host `3.0.0.14`). Gating auto-format on an explicit `http(s)://` scheme; `isValidLink` still governs Paste As, where the user asked explicitly. → Task 5.
- **`src/shared/PasteLink.ts` could not compile.** `tsconfig.node.json` maps only `@shared/*` and includes only main/preload/shared, so it cannot import `linkDisplayText` from the renderer. Moving `linkDisplayText` into `src/shared/` as part of Task 2 — it has no DOM or React dependency, and Task 2 is already the consolidation task. → Tasks 2, 5.
- **Task 8's three premises were wrong.** `apply` sits only on `ConnMenuTarget`'s `page` variant, so it must be *added* to the `url` variant rather than widened; `ConnMenuContext.external` already distinguishes the two cases, so the proposed new field buys nothing; and the `default: target.apply?.(action)` claimed as the compile-time safety net lives in the page branch, which Format never reaches. An explicit exhaustive switch in the url branch replaces the imagined enforcement. → Task 8.
- **Every derivation count was wrong** (`link_display` 10 not 11 · `'link-url'` 12 not 9 · `markdownLinkRegex` 10 not 6 · `contextmenu` 14 not 6), and the `markdownLinkRegex` enumeration omitted `detect/detect.test.ts`, which asserts on the regex directly. Counts corrected; the method is `rg -c` summed across files. → Tasks 1, 2, 10.
- **The hazard window was incoherent.** Task 2's own step ships `URLEditor`'s picker, so `link_display` has a full writer the moment Task 2 lands; and Default Format is `defaultLinkFormat` in `Personalization`, a different key entirely. Deleted — there is no real window here.
- **Page Title in a table cell.** `CellEditor` mounts no `history()` and relays edits as ordinary history-recorded page transactions, and the cell view is destroyed the moment the cell stops being active — so a user who pastes and Tabs away loses the rewrite silently. Task 7 must either scope the deferred rewrite to the page editor and say so, or carry the annotation through `widget.tsx`'s relay. Rolled into R1.
- **Gate 3 could not be passed as written.** The inverse half of the paste matrix has no chord until Task 9, which sits in Phase 4 and is blocked. Gate 3 now checks the four ⌘V cells; the inverse cells move to Task 9. `clipboard:read` moves forward into Task 6, since a keydown-matched chord carries no `clipboardData` and must read the clipboard itself.
- **`tableMergeGuard` over-warned.** It cancels only when the fused-table count increases, which a single-line `[label](url)` insert cannot do. The Failure-half note is dropped.

Not blocking, still open:

- ~~**`bridge.ts`'s `setNumberFormat` duplicates its patch shape.**~~ **Resolved in `ac997c11`** (Nathan: fix it to match). The channel names `NumberConfig`, main validates the family against `NUMBER_FAMILIES`, and the whitelist object is typed rather than a hand-maintained string map. The question underneath it is answered: a bridge entry may name shared types, and the link and number entries now read alike. Original finding:
- **`bridge.ts`'s `setNumberFormat` duplicates its patch shape.** Raised at Gate 1 and verified: the channel spells its patch inline *and* re-states `'number' | 'percent' | 'currency'` as a literal union rather than deriving from `NUMBER_FAMILIES`, even though `NumberConfig` already exists in `shared/properties.ts` — the same duplication the link config just resolved. Genuinely two definitions of one thing, and outside this cycle's diff. The question underneath it is whether a bridge entry is meant to be self-describing (the channel map read as a standalone contract) or may name shared types; the link change answered that one way, and the number entry deserves the same answer deliberately rather than as a drive-by. Awaiting a ruling.

- **`aliasPickerOnCommit`.** `NexusSettings.tsx` carries a deliberately unlisted Pages key, pending wording nobody has settled. Task 6 touches that leaf and must decide rather than silently inherit.
- **Two ten-second observations** the review could not settle statically, both already steps in the plan: whether a renderer `preventDefault()` suppresses main's `context-menu` event, and whether a markdown link inside a table cell gets any right-click menu today (`markdownLinkClicks` is mounted only in `index.tsx`, not in `CellEditor`) — which decides whether Task 8 needs a cell mount for Requirement 8.

### Deviations

- **Task 9 — the chord is matched at the editor, not at the window.** The plan pointed at `App.tsx`'s window-level keydown as where chords are matched; that listener knows nothing about which editor has focus, and the paste needs the `EditorView` it is aimed at. The binding stays data in `DEFAULT_COMMANDS` as planned, but it is read live inside the paste extension — the same place and for the same reason the personalization knobs are read there rather than closed over at mount.
- **Task 9 — deciding and writing split apart.** Claiming the paste event after the write left a window where anything throwing in between produced the link *and* the platform's own literal paste, which a missing test stub surfaced as a doubled document. The decision is now its own call, so the event is claimed on the decision alone.
- **Task 8 — no new `ConnMenuContext` field, and the compile error landed in the other branch.** The plan had the context gain a field distinguishing a markdown link from a wikilink; `external` already draws that line, and `editable` already says whether the surface can take an edit, so the url branch reads both from what was there. The predicted enforcement arrived from the opposite direction: widening `ConnMenuAction` broke the *page* branch's `default: target.apply?.(action)`, whose parameter is `ConnEditAction` — so the two authoring ids are now named explicitly there, and the url branch routes through an `isConnUrlAction` guard.
- **Task 8 — the three form labels moved into `shared/`.** Main builds the Format submenu and cannot read a renderer module, so `LINK_DISPLAY_LABELS` sits beside `LINK_DISPLAYS` in `shared/properties.ts` and `LINK_FORMAT_OPTIONS` now derives its rows from it. Otherwise the menu and the two pickers would each spell "Full Link · Short Link · Page Title" separately.
- **Task 8 — mounting the link handler in a cell restores more than the menu.** `markdownLinkClicks` carries following, the hover preview and the right-click menu in one extension, so a markdown link in a focused cell now behaves as one in the body does rather than only gaining its menu. `MarkdownPM.md`'s claim that the focused cell editor carries no link behaviour is rewritten. A `[[ ]]` connection in a focused cell is unaffected — `connectionClicks` is still not mounted there.
- **Task 7 — a lint warning shipped unseen.** `PendingTitle.ts` imported `EditorView` as a value where it is only used as a type, which Biome reports as a warning rather than an error — so `npm run lint` exited 0 with the diagnostic printed, and reading the exit code alone called it clean. The house floor is zero diagnostics, not exit 0. Fixed in Task 8's commit; the lint gate is now read by diagnostic count.
- **Task 1 — two comments the Made False table missed.** `encodeLinkTarget`'s doc block and its inline note both justified escaping a page title's parens by "the grammar's target group ends at the first `)`", and `links.test.ts` carried the same sentence over the escaping test. Widening the grammar falsifies all three. The escaping itself stays load-bearing for a changed reason — a page title's parens need not balance, and a lone `(` now leaves the link untokenizable rather than merely truncated — so the comments were restated rather than dropped, in Task 1's commit.
- **Task 2 — the whole `linkValue` module moved, not just the formatter.** The correction recorded moving `linkDisplayText` into `src/shared/`; in practice it calls `parseLink` from the same file, so moving one without the other would need either a second parser or a shared module importing the renderer. The module is already pure, so it moved whole to `src/shared/linkValue.ts` beside `propertyValue.ts`, with its nine importers repointed to `@shared/linkValue`. It kept its camelCase name to match every other file in `shared/`. Later tasks import the formatter from there.
- **Task 2 — the `'link-url'` sweep floor is 1, not 0.** The migration test feeds the old value deliberately to prove `.catch(undefined)` drops it and the call-site default catches it. That is the evidence the rename is free, so it stays; the Dead Vocabulary entry now names it as the one legitimate hit.
- **Task 6 — `clipboard:read` deferred to Task 9**, for the same reason the picker variant was deferred to 6: nothing in Task 6 reads the clipboard through IPC, because a `paste` event carries its own `clipboardData`. The channel lands with the keydown-matched chord that actually needs it.
- **Task 6 — two fixes the work surfaced, neither in the plan.** The row separator had to be scoped to direct children of the section: a disclosed row sits inside `Reveal`'s wrapper, where it matches `:last-child` and loses the rule it still needs — the opposite of the stray-rule problem the plan predicted. And the test setup needed a `Range.getClientRects` stub: CodeMirror measures a Range to learn its default character size, which it only does when the document is empty, so any editor suite mounting a blank doc took an uncaught TypeError out of a `requestAnimationFrame` *after* its tests passed — vitest exits non-zero on that while reporting every test green.
- **Task 4 — the `picker` row variant deferred to Task 6.** The plan had Task 4 introduce all three variants (`toggle` · `picker` · `slider`), but only `toggle` and `slider` have rows to exercise them at this point. A `picker` member with no consumer is a type written against a guess at what Task 6 needs, and nothing verifies it until then. Task 6 adds the variant with its first row, which is a small edit to a union that has already proven it generalizes by absorbing `LingerRow`. Task 4's baseline invariant is unaffected.
- **Task 1 — the derivation count in the task body was stale.** It read 6 with an enumeration omitting `detect/detect.test.ts`; the correction to 10 had been recorded under Open Against Later Tasks but never folded into the task. Re-derived at 10 across six files and the body rewritten to match.

### Lessons

### Sequenced After
- **The `PopupMenu` split** — formalize the beak-less pane the autocomplete panel uses (`NotchedPane` with `notchHeight={0}`, body-portalled, no backdrop, Bloom motion) as a component, and move fixed-option pickers onto it. Default Format is one of its call sites. PropertyPickers and variable-input pickers keep `PickerMenu`.
- **Bare-URL autolinking** — a GFM-style token so an unwrapped address is clickable, styled, and Format-able. Needs a tokenizer rule, a decoration, a click path, and a CommonMark-versus-GFM call. Nothing here forecloses it: the formatter and the Format menu both read from the token, so an autolink token slots in as a second producer.
- **A general prose context menu** — Paste As is deliberately the only addition. What else belongs on the editor's right-click is its own decision.
- **Fetched metadata beyond `<title>`** — favicon, OpenGraph, description. The fetcher is already main-side and cached.

### Closeout
