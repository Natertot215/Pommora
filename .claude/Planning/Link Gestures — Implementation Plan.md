## Link Gestures — Implementation Plan

**DATE:** 10-09-2026
**STATUS:** Ratified 10-09-2026
**SOURCE:** Pommora Codebase Audit (W6 · Links and the Picker, W12 · Residue and Small Duplications): F-034, F-033, F-038, F-068, F-036, F-037, F-039, and the conversation's rulings of 10-09-2026.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `cc725b334` | 7523 passed, 2 skipped (522 files) | 10-09-2026 6:21 PM | |

### Context

MarkdownPM's page body handles a link under the pointer through two near-identical CodeMirror handlers mounted by `inlineSurface` (`Core/MarkdownPM/surface.ts`): `connectionClicks` (`Links/connectionClicks.ts`) for `[[…]]` and `markdownLinkClicks` (`Links/linkClicks.ts`) for `[label](target)`. Each hit-test calls `linkTokenAt(line.text, …)` (`Engine/tokens.ts`), which re-tokenizes the clicked line alone, without a cache and without the fence around it, then asks `drawnRawAt` (`decorations.ts`) whether an HTML block drew the line raw. The menu appliers (`applyLinkAction` in `Links/linkEdit.ts`, `applyUrlLinkAction` in `Links/linkFormat.ts`) and Enter's `commitAliasOnEnter` re-tokenize the same way. A resting table cell (`Tables/cellStatic.tsx`) builds its menu through `menuTarget`, the same rule the body's two handlers each write out, and also calls `linkTokenAt(text, …)` uncached. Meanwhile `build` in `decorations.ts` already holds the exact token list it drew: chunk-tokenized with fence and inline-code context, HTML-raw tokens filtered, claimed embeds removed.

Every other caret-driven link path already reads the written document: `headingHash`, `autocompleteQuery`, `linkTyping`, `slotNear`, `rememberAliasNear`, `autoPair`, and `citationSeatAt` read the caret's line through Connections' `linkAt`/`aliasSpanAt` and refuse code through `inCodeAt` on the per-version `docScan`. `commitAliasOnEnter` is the one caret path that tokenizes and asks the viewport-bound `drawnRawAt`.

Because the hit-test reads the line alone, a link written inside a fenced code block still acts on a press (the caret is seated at the link's edge) and on Enter (a fenced alias commits). `slotNear` (empty-slot collapse and the alias memory) and `typedInput`'s `]` refusal skip the code check their siblings make, so they act inside fences and inline code alike, and typing an alias in a code sample writes it into another page's frontmatter. All five symptoms were reproduced at `cf0f5caa5` with dispatched selections and a direct `inputHandler` call. Around the same files, the editor spells several small rules twice: the "inside an alias" check (`Guards/aliasGuard.ts` beside `autoPair`), a markdown link's address span (`linkTarget` beside `linkHalves`), a markdown link's look (`build` beside `renderCellContent`), the callout head's prefix (`calloutLines` beside `calloutHeadPrefixLen`), the callout conversion's marker strip (`stripBlockMarkers` beside `stripInnerMarkers`), and Paste's code guard (`linkFor` checks code, `pasteAs` doesn't).

This plan leaves F-054 (embeds in cells drawn as connections), F-035, F-041, F-042, and F-043 alone, and leaves the `getConn` getter threading (F-094) as it is.

### Overview

An action that starts from the pointer reads the link exactly as the editor drew it; an action that starts from the caret reads the written text, as every caret action but one already does. The two body click handlers become one, and that handler and the right-click menu's actions look the link up in the list the last draw produced instead of re-reading the line. A link inside a code block was never drawn as a link, so pressing it behaves like ordinary code. Enter, leaving an alias slot, and typing `]` or `[` read the written text and check for code directly, so they work the same wherever the caret is. Enter keeps standing down inside an HTML block that HTML Formatting draws as raw text. In a Text value's editing pane, a bare `[[#Setup]]` now shows its preview and menu the way the resting value already does.

Alongside it, each duplicated rule is written once: which menu a link gets (shared by the body and the resting cell), the "inside an alias" check, a link's address span, a link's look, the callout head's read, the callout conversion's strip, and one Paste guard that also covers Paste As. Nothing a person sees changes beyond the code-sample fixes, the Text-pane heading link, and Paste As landing plain text inside code. The bundle removes about 70 production lines (*§Delta*).

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `linkPointer` • Function | The one pointer handler for both link kinds in an editor. | `Core/MarkdownPM/Links/linkClicks.ts` |
| `drawnLinkAt` • Function | The link or connection token the last draw tokenized at a position. | `Core/MarkdownPM/decorations.ts` |
| `tokenMenuTarget` • Function | Which menu a link token gets: a connection naming a page is authored in place, and every other link is a page or an address. | `Core/MarkdownPM/Links/connectionsApi.ts` |
| `inAliasAt` • Function | Whether an offset sits in a written connection's alias, outside code. | `Core/MarkdownPM/Input/edits.ts` |
| `literalAt` • Function | Whether a paste at a position must land as written: code, or another link's destination. | `Core/MarkdownPM/Links/pasteLink.ts` |
| `linkAddress` • Function | A markdown link token's address span. | `Core/MarkdownPM/Engine/tokens.ts` |
| `mdLinkClass` • Function | The class a markdown link's label wears for its target, read by both renderers. | `Core/MarkdownPM/decorations.ts` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `connectionClicks.ts` • File | The connection pointer handler, with `wikiLinkAt`, `connHitAt`, `WikiHit`, `ConnHit`. | `Core/MarkdownPM/Links/` |
| `markdownLinkClicks` • Function | The markdown-link pointer handler, folded into `linkPointer`. | `Core/MarkdownPM/Links/linkClicks.ts` |
| `drawnRaw` / `drawnRawAt` • WeakMap, Function | The HTML-raw spans a gesture asked about; the drawn token list already excludes them. | `Core/MarkdownPM/decorations.ts` |
| `aliasGuard.ts` • File | `refusedInAlias`, replaced by `inAliasAt`; its test goes with it. | `Core/MarkdownPM/Guards/` |
| `destinationGuard` / `insideCodeAtCaret` • Functions | Paste's two guards, folded into `literalAt`. | `Core/MarkdownPM/Links/pasteLink.ts` |
| `linkHalves` • Function | An object of label and address spans read only by a computed key; the label is the token's `contentRange`. | `Core/MarkdownPM/Links/linkFormat.ts` |
| `stripBlockMarkers` • Function | A copy of `stripInnerMarkers` plus a quote strip. | `Core/MarkdownPM/Input/format.ts` |
| `data-conn-title` • DOM attribute | Written on resting-cell link spans, read by no production code (only three test asserts). | `Core/MarkdownPM/Tables/cellStatic.tsx` |

#### Delta

Production lines per file, counted from each task's AFTER against `cc725b334` (Biome's known wrapping included). Whole-file deletions are listed at full length. Closeout replaces this estimate with the measured figure.

| File | Phase 1 | Phase 2 | Phase 3 | Net |
| --- | --- | --- | --- | --- |
| `Links/connectionClicks.ts` (deleted) | −103 | | | −103 |
| `Links/linkClicks.ts` | +33 | | | +33 |
| `Links/connectionsApi.ts` | +18 | | | +18 |
| `Tables/cellStatic.tsx` | −6 | | −4 | −10 |
| `decorations.ts` | +4 | | +12 | +16 |
| `surface.ts` | −2 | | | −2 |
| `Links/linkEdit.ts` | +2 | +1 | | +3 |
| `Links/linkFormat.ts` | −2 | | −5 | −7 |
| `Guards/aliasGuard.ts` (deleted) | | −9 | | −9 |
| `Input/edits.ts` | | +3 | | +3 |
| `Input/markdownInput.ts` | | −1 | | −1 |
| `Links/pasteLink.ts` | | −5 | | −5 |
| `Engine/tokens.ts` | 0 | | +2 | +2 |
| `Engine/detect.ts` | | | −1 | −1 |
| `Input/format.ts` | | | −6 | −6 |
| **Total** | **−56** | **−11** | **−2** | **≈ −69** |

The additions are the merged pointer handler (`sectionRunAt` and `linkUnder` now hold both kinds), `tokenMenuTarget` (one menu rule in place of three spellings), `mdLinkClass` (one look in place of two), `inAliasAt`, `literalAt`, and Enter's written-text read with its HTML check. `cellStatic.tsx`'s Phase 3 figure carries +7 for Biome wrapping its `Engine/tokens` import once `linkAddress` joins it.

#### Constraints

- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root; each exits 0. Biome formats every TS write, so an Edit failing on whitespace means it reformatted: re-read and retry. Python or sed edits run `npx biome format --write <files>` afterward.
- **Searches:** every grep in this plan is `git grep -n` from the repo root, which skips `node_modules` and the vitest cache (`Core/node_modules/.vite/vitest/…/results.json` names deleted tests).
- **The rule this plan installs:** an action that starts from the pointer reads the drawn link (`drawnLinkAt`), through to its menu's deferred action; an action that starts from the caret reads the written document (Connections' `linkAt`/`aliasSpanAt` on the caret's line, and `inCodeAt` on `docScan`). `drawnLinkAt` has exactly three readers: `linkUnder`, `applyLinkAction`, and `applyUrlLinkAction`.
- **Frozen:** `pointerHandlers`' contract (`Gestures/pointerPath.ts`), `citationPointer`, `MarkdownScope`, `EditorHost`, `ConnMenuTarget`, the `getConn` getter threading (F-094), and every class name and `data-link-span` value the renderers emit, except the removed `data-conn-title`.
- **Out of scope:** F-054's embed-as-connection behavior, the Paste As menu's rows in code (they stay offered and land literal), and every W6 finding not listed in *§Source*.
- **Exact outputs:** F-068's callout conversion keeps every output identical, including `- > foo` → `> [!callout] > foo` (owner's ruling). Enter keeps refusing an alias inside an HTML block that HTML Formatting draws raw (owner's ruling; pinned by `linkEdit.test.tsx:230`).
- **Shape — Fix:** every consumer of the old behavior is swept: `drawnRawAt`, `refusedInAlias`, `linkHalves`, `stripBlockMarkers`, `destinationGuard`, `insideCodeAtCaret`, and `data-conn-title` have zero references when their phase closes, and no call passes `linkTokenAt` a string.
- **Shape — Refactor:** the 20 link suites (`Links/`, `textScope`, `aliasSites`, `cellLinks`, `cellLists`, `tokens`, `citationCreate`, `editorMenu`, `TextPane`) pass with no assertion weakened; a changed assertion is listed in its task.
- **Tests:** every new test is proven red by reverting the one production line it pins; values are captured by running, never guessed. Vitest swallows `console.log`; probes append to the session scratchpad with `appendFileSync` and are deleted. CodeMirror's `bindHandler` catches and logs a handler's exception, so a handler broken mid-phase looks like a handler that declined; red-proofs run only on a compiling tree.
- **Vocabulary:** prose, test titles, and new comments say "connection" for `[[…]]` and "link" for `[label](url)`, never "wikilink"; the `'wikiLink'` token kind and existing code names stay (owner's ruling).
- **Comments:** only where the code can't say it; match the surrounding density. Moved comments keep their wording unless they became false.
- **Parallel work:** `cc725b334` (a parallel session) touched `decorations.ts` and `detect.ts` after the scouting at `cf0f5caa5`. At ratification, re-find `build`'s link-token block, the claimed-embed filter, and `calloutLines` by name, and re-anchor the `:NNN` citations below.
- **Known flake:** `Autocomplete/connectionCommit.test.tsx`'s "reads no layout as it moves within the link" can fail under full-suite load; rerun before suspecting a change.

#### Process Overview

- [ ] **Phase 1** — Pointer Gestures Read the Drawn Link
  - [ ] Task 1-1 · Pins at the baseline
  - [ ] Task 1-2 · The picker and the drawn list
  - [ ] Task 1-3 · One pointer handler and one menu rule
  - [ ] Task 1-4 · The appliers read the drawn link; Enter reads the written text
  - [ ] Review Checkpoint
- [ ] **Phase 2** — Written Text in Code Stays Code
  - [ ] Task 2-1 · One alias check
  - [ ] Task 2-2 · Slots in code
  - [ ] Task 2-3 · One paste guard
  - [ ] Review Checkpoint (live drive)
- [ ] **Phase 3** — One Definition Each
  - [ ] Task 3-1 · The address span
  - [ ] Task 3-2 · The markdown link's look
  - [ ] Task 3-3 · The callout head and its conversion
- [ ] Final Verification
- [ ] Commit, Reconcile, Report

---

### Phase 1 — Pointer Gestures Read the Drawn Link

**GOAL:** Every pointer-driven link gesture reads the token list `build` drew, through one picker shared with the resting cell; the body runs one pointer handler; the body and the resting cell build a link's menu through one rule; and Enter's alias commit joins the caret paths that read the written text. This fixes F-033's press and Enter symptoms and lands F-034 and F-038. Tasks 1-2 through 1-4 are one compile unit: the type check is red between them and green after Task 1-4.

#### Task 1-1

**TASK:** Write Phase 1's three tests at `cc725b334`, before any production change, and watch each fail there.

**NOW:** Nothing pins a press or Enter on a connection inside code, or a Text pane's bare heading connection on hover and right-click.

**CHANGE**

- [ ] `linkEdges.test.tsx` "a press on a connection inside a fence is left to the editor": body ```` ```\na [[Alpha]] b\n``` ````, focus, caret at 0, `posAtCoords` mocked to 12, dispatch a cancelable `mousedown` (button 0, detail 1) on `contentDOM`, and `expect(event.defaultPrevented).toBe(false)`. At `cc725b334` the handler claims the press and seats the caret at the link's edge through `seatAtNearerEdge` (probed: prevented, head at the edge). If CodeMirror's own mousedown turns out to prevent the event once the handler declines, assert instead that the head isn't the link's edge (`15`).
- [ ] `linkEdit.test.tsx` "declines in an alias inside code, so Enter still breaks the line", beside `:230`: `expect(commitAliasOnEnter(view)).toBe(false)` with the caret inside the alias of ```` ```\na [[Alpha|the one]] b\n``` ```` (caret 17) and of `` a `[[Alpha|the one]]` b `` (capture its offset by running). At `cc725b334` the fenced case commits (probed); record what the inline-code case does there.
- [ ] `textScope.test.tsx` "a bare heading in a Text value's pane acts as the resting value does": add a `menu` `vi.fn()` to the module `conn` (or to a test-local copy, if another test in the file relies on `conn.menu` being absent); mount `'[[#Setup]] x'` with `heldPage.of(holder)` and `Prec.highest(editorHost.of(testHost({ glance: { arm, cancel() {}, close() {}, contains: () => false } })))`; mock `posAtCoords` to 5. `pointerover` on `.md-connection-heading` → `arm` called with `{ kind: 'page', id: 'p1', path: 'Notes/Alpha.md', heading: 'Setup' }` and the element; `contextmenu` → `menu` called with `objectContaining({ kind: 'page', page: holder, heading: 'Setup' })`.
- [ ] Run the three at `cc725b334`; each fails for the reason named in its bullet. Keep them uncommitted in the tree.

**VERIFY**

- [ ] Three failures observed at `cc725b334`, each on its own assertion (not a setup error).

#### Task 1-2

**TASK:** Make `linkTokenAt` a pure picker over a token array, store the drawn tokens per view in place of `drawnRaw`, and point the resting cell at its existing memo.

**NOW:** `linkTokenAt(text, offset, kind?)` tokenizes `text` on every call. `build` stores only `drawnRaw` (HTML spans). `cellStatic.tsx:297,301,451` call `linkTokenAt(text, …)` uncached beside the `cellTokens` memo at `:45`.

**CHANGE**

- [ ] Rewrite `linkTokenAt` and its doc comment.
- [ ] Replace `drawnRaw`/`drawnRawAt` with `drawnTokens`/`drawnLinkAt`; set the list after the claimed-embed filter. The local `raw` stays (`sectionRunsIn`'s mask reads it), and so does the `spanAt` import (the section-run mask reads it).
- [ ] Point the three cell calls at `cellTokens(…)`.
- [ ] Reword `tokens.test.ts:285-292` (pass `tokenize('…')`) and `cellLists.test.tsx:279` (`linkTokenAt(tokenize(display), from)`), importing `tokenize` where missing.

**AFTER**

```Core/MarkdownPM/Engine/tokens.ts diff
@@ linkTokenAt @@
-/** The link or wikiLink token an offset sits in, markers included — the one read every click, hover, and resting cell shares. At a boundary two abutting tokens both contain the offset; the later-starting one wins, so a span captured at a token's own start resolves to that token and not its neighbor. */
+/** The link or connection token an offset sits in, markers included, among tokens in start order: an editor's drawn set or a resting cell's. */
 export function linkTokenAt(
-  text: string,
+  tokens: readonly Token[],
   offset: number,
   kind?: 'link' | 'wikiLink',
 ): Token | undefined {
-  return tokenize(text)
+  return tokens
     .filter(
```

```Core/MarkdownPM/decorations.ts diff
@@ imports @@
   aliasedToken,
   linkTarget,
+  linkTokenAt,
   shiftToken,
@@ module scope @@
 const chunkTokens = drawnLast(tokenizeChunk)
-const drawnRaw = new WeakMap<EditorView, readonly [number, number][]>()
+const drawnTokens = new WeakMap<EditorView, readonly Token[]>()

-/** Inside an HTML block the last draw left as written, where a link gesture has no drawn link to act on. */
-export const drawnRawAt = (view: EditorView, pos: number): boolean =>
-  spanAt(drawnRaw.get(view) ?? [], pos) !== undefined
+/** The link token the last draw tokenized at `pos`; code, and an HTML block drawn raw, hold none. */
+export const drawnLinkAt = (
+  view: EditorView,
+  pos: number,
+  kind?: 'link' | 'wikiLink',
+): Token | undefined => linkTokenAt(drawnTokens.get(view) ?? [], pos, kind)
@@ build @@
   const raw = scope === 'page' && settings.htmlFormatting ? inline.html : []
-  drawnRaw.set(view, raw)
   let tokens = raw.length > 0 ? inline.tokens.filter((tk) => !tk.inHtml) : inline.tokens
   …claimed-embed filter unchanged…
+  drawnTokens.set(view, tokens)
   const active = focused
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ StaticCellImpl · menuAt @@
-    const found = span && linkTokenAt(text, span[0])
+    const found = span && linkTokenAt(cellTokens(text), span[0])
 …
-        const now = linkTokenAt(live.current, span[0])
+        const now = linkTokenAt(cellTokens(live.current), span[0])
@@ cellLinkTarget @@
-  const tk = span && linkTokenAt(text, span[0])
+  const tk = span && linkTokenAt(cellTokens(text), span[0])
```

**VERIFY**

- [ ] Deferred to Task 1-4: the tree doesn't compile until the consumers move.

#### Task 1-3

**TASK:** Fold the two body handlers into `linkPointer` in `linkClicks.ts`, delete `connectionClicks.ts`, mount one handler, convert a token's target through `heldTarget` (F-038), and write the menu rule once as `tokenMenuTarget`, read by the body and the resting cell.

**NOW:** `connectionClicks.ts` (103 lines) and `markdownLinkClicks` (`linkClicks.ts:21-46,108-127`) each run a coordinate lookup, a line tokenize, a label selector, and a menu build. `surface.ts:52,54` mounts both. The resting cell's `menuTarget` (`cellStatic.tsx:456-491`) writes the same menu rule a third time. Hover in a Text pane passes `[[#Setup]]`'s raw `self` target, so it raises no glance and offers no menu.

**CHANGE**

- [ ] Delete `Links/connectionClicks.ts` (all 103 lines).
- [ ] Add `tokenMenuTarget` to `connectionsApi.ts` beside `linkMenuTarget`. A read-only body passes no `edit`; `showConnectionMenu` already reads `editable && apply !== undefined` (`Interface/Menus/connectionMenuActions.ts:23`), so the menu it shows is unchanged. No test asserts a body menu target's raw `editable` on a read-only editor: `linkEdit.test.tsx:107-124` and `externalLink.test.tsx:137-150` read the model `showConnectionMenu` computes, and `linkEdges.test.tsx:420`'s `editable: true` is an editable mount.
- [ ] Rewrite `linkClicks.ts`'s hit-test and handler as below; `followTarget`, `heldTarget`, `resolveFollow`, and `dwellTarget` (`:48-106`) stay unchanged. The `§`-run check runs first, so a press on a run written against a link's edge travels to its heading: `[x](https://e.com)§Setup` keeps the click `connectionClicks` gave it, and in `[[Alpha]]§Setup` the run now takes a press the connection used to claim.
- [ ] Rewrite the resting cell's `menuTarget` onto `tokenMenuTarget`, keeping its `still()` closures.
- [ ] `surface.ts`: one import and one mount, in `connectionClicks`' slot.
- [ ] `pointerPath.ts:31` "four handlers share one editor" → "several handlers share one editor"; `:25` "pays neither the layout read nor the tokenize" → "pays neither the layout read nor the token lookup".

**AFTER**

```Core/MarkdownPM/Links/connectionsApi.ts diff
-import { headingOf, linkTarget, type Token } from '../Engine/tokens'
+import { aliasedToken, headingOf, linkTarget, type Token } from '../Engine/tokens'
@@ after linkMenuTarget @@
+
+/** A connection naming a page is authored in place, and every other link is a page or an address. Without `edit`, the menu only reads. */
+export function tokenMenuTarget(
+  tk: Token | undefined,
+  target: MdTarget,
+  edit?: { wiki: (action: ConnEditAction) => void; url: (action: ConnUrlAction) => void },
+): ConnMenuTarget | null {
+  if (tk?.kind === 'wikiLink' && target.kind === 'page')
+    return {
+      kind: 'page',
+      page: target.page,
+      heading: target.heading,
+      editable: true,
+      hasAlias: aliasedToken(tk),
+      apply: edit?.wiki,
+    }
+  return linkMenuTarget(target, edit?.url)
+}
```

```Core/MarkdownPM/Links/linkClicks.ts diff
@@ imports @@
 import type { Extension } from '@codemirror/state'
 import { isCmd } from '@pommora/uix/Interactions/chords'
 import type { EditorView } from '@codemirror/view'
 import { normalizeLinkUrl, WEB_ADDRESS } from '../../Paths/urlPath'
-import { linkTarget, linkTokenAt } from '../Engine/tokens'
+import type { Token } from '../Engine/tokens'
+import { docString } from '../docCache'
 import {
-  linkMenuTarget,
   openPage,
-  resolveMdTarget,
+  titleTarget,
+  tokenMenuTarget,
+  tokenTarget,
   type ConnectionsApi,
   type MdTarget,
 } from './connectionsApi'
-import { drawnRawAt, MD_LINK_CLASS } from '../decorations'
+import { drawnLinkAt, MD_LINK_CLASS } from '../decorations'
+import { applyLinkAction } from './linkEdit'
 import { applyUrlLinkAction } from './linkFormat'
@@ hit-test @@
 interface LinkHit extends PointerTarget {
   target: MdTarget
+  /** Absent on a bare `§Heading` run, which no token holds. */
+  tk?: Token
 }

+// A bare `§Heading` run in prose: no page, no menu, no glance — the run's own text is the target.
+function sectionRunAt(view: EditorView, event: MouseEvent, pos: number): LinkHit | null {
+  const span = (event.target as HTMLElement).closest?.('.md-section-run')
+  if (!span) return null
+  const text = span.textContent ?? ''
+  const from = view.posAtDOM(span)
+  return {
+    target: titleTarget(undefined, '', text.slice(1)),
+    range: [from, from + text.length],
+    onText: true,
+    hidesSyntax: true,
+    pos,
+  }
+}
+
 // `posAtCoords` clamps to the nearest rendered position and a valid link's markers are replaced to zero width, so a click past a short label resolves onto its last character.
-function linkUnder(view: EditorView, getApi: GetApi, event: MouseEvent): LinkHit | null {
+function linkUnder(
+  view: EditorView,
+  api: ConnectionsApi | undefined,
+  event: MouseEvent,
+): LinkHit | null {
   const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
   if (pos == null) return null
-  const line = view.state.doc.lineAt(pos)
-  const rel = pos - line.from
-  const tk = linkTokenAt(line.text, rel, 'link')
-  if (!tk || drawnRawAt(view, line.from + tk.range[0])) return null
-  const url = linkTarget(line.text, tk)
-  if (!url) return null
-  const target = resolveMdTarget(getApi(), url)
+  const run = sectionRunAt(view, event, pos)
+  if (run) return run
+  // A connection acts as one only where connections resolve.
+  const tk = drawnLinkAt(view, pos, api ? undefined : 'link')
+  if (!tk) return null
+  const target = heldTarget(tokenTarget(api, docString(view.state.doc), tk), ownPage(view))
   const el = (event.target as HTMLElement).closest?.(
-    `.${MD_LINK_CLASS}, .md-link-invalid, .md-connection-resolved`,
+    `.md-connection-resolved, .md-connection-ambiguous, .md-heading-symbol, .${MD_LINK_CLASS}, .md-link-invalid`,
   )
   return {
+    tk,
     target,
-    range: [line.from + tk.range[0], line.from + tk.range[1]],
-    onText: el != null && rel >= tk.contentRange[0] && rel <= tk.contentRange[1],
-    hidesSyntax: target.kind !== 'invalid',
+    range: tk.range,
+    onText: el != null && pos >= tk.contentRange[0] && pos <= tk.contentRange[1],
+    // An ambiguous title leads nowhere, yet a connection to one still draws as a link.
+    hidesSyntax: target.kind !== 'invalid' || (tk.kind === 'wikiLink' && target.ambiguous === true),
     pos,
   }
 }
@@ handler @@
-// A link naming a page raises the same glance, which the connection handler can't do: its hit-test reads wikiLink tokens and this is a `link`.
-export function markdownLinkClicks(getApi: GetApi): Extension {
+export function linkPointer(getApi: GetApi): Extension {
   return pointerHandlers<LinkHit>({
     // Both gates are required: external links wear the link class, not the connection one.
     hoverGate: `.md-connection-resolved, .${MD_LINK_CLASS}`,
-    hitAt: (view, event) => linkUnder(view, getApi, event),
+    hitAt: (view, event) => linkUnder(view, getApi(), event),
     follow: (hit, _, event) => (hit.onText ? followTarget(hit.target, getApi(), event) : null),
     dwell: (hit, el, glance) => (hit.onText ? dwellTarget(hit.target, glance, el) : null),
     menu: (hit, view) => {
       const menu = getApi()?.menu
-      const target =
-        hit.onText &&
-        linkMenuTarget(
-          hit.target,
-          view.state.readOnly ? undefined : (action) => applyUrlLinkAction(view, action, hit.range),
-        )
+      const target =
+        hit.onText &&
+        tokenMenuTarget(
+          hit.tk,
+          hit.target,
+          // Editability is read here rather than threaded through the host: `readOnly` is live inside the editor and flips at runtime through a Compartment, so a captured value would go stale.
+          view.state.readOnly
+            ? undefined
+            : {
+                wiki: (action) => applyLinkAction(view, action, hit.range),
+                url: (action) => applyUrlLinkAction(view, action, hit.range),
+              },
+        )
       return menu && target ? () => menu(target) : null
     },
   })
 }
```

The single label selector is behavior-neutral: `md-link` and `md-link-invalid` are emitted only for `link` tokens, `md-connection-ambiguous` and `.md-heading-symbol` only for connections, tokens of the two kinds never overlap (`tokens.ts:286-291`), and `onText` also requires `pos` inside the token's content. The dropped `if (!url) return null` was dead: `markdownLinkRegex` builds its destination with `LINK_DEST(1)` (`Connections/links.ts:13`).

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ imports @@
 import {
   wikiLinkView,
   linkMenuTarget,
+  tokenMenuTarget,
   headingMissing,
   tokenTarget,
@@ menuTarget @@
 ): ConnMenuTarget | null {
-  const target = tokenTarget(api, text, tk)
-  if (target.kind === 'page' && tk.kind === 'wikiLink')
-    return {
-      kind: 'page',
-      page: target.page,
-      heading: target.heading,
-      editable: true,
-      hasAlias: aliasedToken(tk),
-      apply: (action) => {
-        const now = still()
-        if (!now) return
-        const { pipeAt, select } = wikiAuthorTarget(now.text, now.tk, action)
-        if (pipeAt !== undefined) onCommit(`${now.text.slice(0, pipeAt)}|${now.text.slice(pipeAt)}`)
-        onSelect(select)
-      },
-    }
-  return linkMenuTarget(target, (action) => {
-    const now = still()
-    if (!now) return
-    if (action === 'rename' || action === 'editLink')
-      return onSelect(linkHalves(now.tk)[action === 'rename' ? 'label' : 'address'])
-    const edit = linkActionText(now.text, now.tk, action, host.linkTitles)
-    if (!edit) return
-    onCommit(now.text.slice(0, now.tk.range[0]) + edit.insert + now.text.slice(now.tk.range[1]))
-    if (edit.wantsTitle) host.linkTitles.resolve(edit.url)
-  })
+  return tokenMenuTarget(tk, tokenTarget(api, text, tk), {
+    wiki: (action) => {
+      const now = still()
+      if (!now) return
+      const { pipeAt, select } = wikiAuthorTarget(now.text, now.tk, action)
+      if (pipeAt !== undefined) onCommit(`${now.text.slice(0, pipeAt)}|${now.text.slice(pipeAt)}`)
+      onSelect(select)
+    },
+    url: (action) => {
+      const now = still()
+      if (!now) return
+      if (action === 'rename' || action === 'editLink')
+        return onSelect(linkHalves(now.tk)[action === 'rename' ? 'label' : 'address'])
+      const edit = linkActionText(now.text, now.tk, action, host.linkTitles)
+      if (!edit) return
+      onCommit(now.text.slice(0, now.tk.range[0]) + edit.insert + now.text.slice(now.tk.range[1]))
+      if (edit.wantsTitle) host.linkTitles.resolve(edit.url)
+    },
+  })
 }
```

`linkMenuTarget` stays imported in `cellStatic.tsx` for `linkGestures`' `readOnlyMenu` (`:418`), and `aliasedToken` for `renderCellContent`.

```Core/MarkdownPM/surface.ts diff
-import { connectionClicks } from './Links/connectionClicks'
-import { markdownLinkClicks } from './Links/linkClicks'
+import { linkPointer } from './Links/linkClicks'
 …
-  connectionClicks(getConn),
+  linkPointer(getConn),
   citationPointer(getConn),
-  markdownLinkClicks(getConn),
   pasteLink,
```

**VERIFY**

- [ ] Deferred to Task 1-4.

#### Task 1-4

**TASK:** The two menu appliers read `drawnLinkAt`, since a menu's action finishes a pointer gesture; Enter's alias commit reads the written text through Connections' grammar and the scan, as its caret siblings do, and keeps standing down in an HTML block drawn raw.

**NOW:** `applyLinkAction` (`linkEdit.ts:35-50`), `applyUrlLinkAction` (`linkFormat.ts:58-93`), and `commitAliasOnEnter` (`linkEdit.ts:53-68`) each re-tokenize the line at a captured offset; the appliers guard `lineAt` against a shrunk document and map line offsets back through `at()`. Enter commits a fenced alias, and its HTML check reads the viewport-bound `drawnRawAt`.

**CHANGE**

- [ ] Rewrite the three functions as below; drop the imports that lose their last use.

**AFTER**

```Core/MarkdownPM/Links/linkEdit.ts diff
@@ imports @@
-import { aliasedToken, linkTokenAt, type Token } from '../Engine/tokens'
+import { aliasedToken, type Token } from '../Engine/tokens'
+import { docScan, docString } from '../docCache'
+import { inCodeAt, spanAt } from '../Engine/docScan'
 …
-import { drawnRawAt } from '../decorations'
+import { drawnLinkAt } from '../decorations'
@@ applyLinkAction @@
 export function applyLinkAction(
   view: EditorView,
   action: ConnEditAction,
   range: [number, number],
 ): void {
-  // The span was captured before a native menu opened, and `lineAt` throws past the document's end rather than clamping — the throw would land unhandled inside the menu's promise.
-  if (range[0] > view.state.doc.length) return
-  const line = view.state.doc.lineAt(range[0])
-  const tk = linkTokenAt(line.text, range[0] - line.from, 'wikiLink')
-  if (!tk || line.from + tk.range[0] !== range[0]) return
-  const at = (n: number): number => line.from + n
-  const { pipeAt, select } = wikiAuthorTarget(line.text, tk, action)
-  if (pipeAt !== undefined)
-    view.dispatch({ changes: { from: at(pipeAt), to: at(pipeAt), insert: '|' } })
-  focusRange(view, at(select[0]), at(select[1]))
+  const tk = drawnLinkAt(view, range[0], 'wikiLink')
+  if (!tk || tk.range[0] !== range[0]) return
+  const { pipeAt, select } = wikiAuthorTarget(docString(view.state.doc), tk, action)
+  if (pipeAt !== undefined) view.dispatch({ changes: { from: pipeAt, to: pipeAt, insert: '|' } })
+  focusRange(view, select[0], select[1])
 }
@@ commitAliasOnEnter @@
   const sel = view.state.selection.main
   if (!sel.empty) return false
   const line = view.state.doc.lineAt(sel.head)
-  const span = aliasSpanAt(line.text, sel.head - line.from)
-  if (!span) return false
-  const tk = linkTokenAt(line.text, span[0], 'wikiLink')
-  if (!tk || drawnRawAt(view, line.from + tk.range[0])) return false
-  const end = line.from + tk.range[1]
+  const rel = sel.head - line.from
+  const link = linkAt(line.text, rel)
+  if (!link || aliasSpanAt(line.text, rel) === null) return false
+  const scan = docScan(view.state.doc)
+  // Code holds no live link, and neither does an HTML block HTML Formatting draws raw.
+  const raw = view.state.facet(editorHost).settings().htmlFormatting && spanAt(scan.html, sel.head)
+  if (inCodeAt(scan, sel.head) || raw) return false
+  const end = line.from + link.full[1]
```

`commitAliasOnEnter` runs only in the page editor (`MarkdownEditor.tsx`'s keymap), so the HTML check needs no scope test, matching `build`'s page-only raw rule. The scan's HTML spans (`htmlBlocks`) and the tokenizer's (`inHtml`) can disagree on an opener nothing closes (ledger F-066, F-067); Enter reads the scan's, as the owner ruled.

```Core/MarkdownPM/Links/linkFormat.ts diff
@@ imports @@
-import { linkTarget, linkTokenAt, type Token } from '../Engine/tokens'
+import { linkTarget, type Token } from '../Engine/tokens'
+import { docString } from '../docCache'
+import { drawnLinkAt } from '../decorations'
@@ applyUrlLinkAction @@
-  // The span was captured before a native menu opened, and `lineAt` throws past the document's end rather than clamping.
-  if (range[0] > view.state.doc.length) return
-  const line = view.state.doc.lineAt(range[0])
-  const tk = linkTokenAt(line.text, range[0] - line.from, 'link')
-  if (!tk || line.from + tk.range[0] !== range[0]) return
-  const at = (n: number): number => line.from + n
+  const tk = drawnLinkAt(view, range[0], 'link')
+  if (!tk || tk.range[0] !== range[0]) return
 …
-    focusRange(view, at(half[0]), at(half[1]))
+    focusRange(view, half[0], half[1])
 …
-  const edit = linkActionText(line.text, tk, action, titles)
+  const edit = linkActionText(docString(view.state.doc), tk, action, titles)
   if (!edit) return
-  const span = { from: at(tk.range[0]), to: at(tk.range[1]) }
+  const span = { from: tk.range[0], to: tk.range[1] }
```

`decorations.ts` reaches none of `linkFormat`, `linkEdit`, `linkClicks`, or `cellStatic`, so these imports form no cycle.

**VERIFY**

- [ ] Run the gates.
- [ ] Task 1-1's three tests pass, and `linkEdit.test.tsx:230` ("declines in an alias left as written in an HTML block") passes unchanged.
- [ ] Red-proof each on the compiling tree: the fence press goes red with `linkUnder`'s `drawnLinkAt` call replaced by the line-local reading `linkTokenAt(tokenize(line.text).map((t) => shiftToken(t, line.from)), pos, …)` (with `line = view.state.doc.lineAt(pos)`); the code-Enter cases go red with `inCodeAt(scan, sel.head) ||` removed; `:230` goes red with `|| raw` removed; the Text-pane test goes red with the `heldTarget(…, ownPage(view))` wrap removed.
- [ ] `git grep -n "drawnRaw\|connectionClicks\|markdownLinkClicks" -- Core` returns nothing; `git grep -n "drawnLinkAt(" -- Core` shows exactly `linkUnder`, `applyLinkAction`, and `applyUrlLinkAction` besides its definition; `git grep -n "linkTokenAt(" -- Core` shows no string first argument, and its production hits are `tokens.ts`, `decorations.ts`, and `cellStatic.tsx` only.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] The 20 link suites pass with no assertion changed beyond Task 1-2's two rewordings.
- [ ] Every pointer consumer listed in *§Context* reads `drawnLinkAt` or `cellTokens`; nothing re-tokenizes a line for a gesture; the menu rule exists once; Enter reads the written text.
- [ ] A long-document probe: mount a 2,000-line body with `[[Alpha]]` on the last line, scroll it into view (`view.dispatch({ effects: EditorView.scrollIntoView(pos) })`), assert `view.visibleRanges` covers that line, then press and click on it and assert `conn.open` was called. Deleted afterward; the result is recorded here.

---

### Phase 2 — Written Text in Code Stays Code

**GOAL:** The remaining caret paths refuse inside code (F-033's remainder), the alias check is written once beside its readers (F-068's second item), and Paste As shares Paste's code guard (F-039).

#### Task 2-1

**TASK:** One `inAliasAt(scan, at)` in `Input/edits.ts`, outside code by its own rule, replaces `refusedInAlias` and `autoPair`'s inline copy.

**NOW:** `Guards/aliasGuard.ts:1-9` slices the line and calls `aliasSpanAt`; `edits.ts:357-361` does the same for `[`. `markdownInput.ts:249` refuses `]` in an alias inside a fence or inline code.

**CHANGE**

- [ ] Write `edits.test.ts` `describe('inAliasAt')`: "reads the alias on the line the offset sits in" (`doc = 'a first line long enough\na [[Notes|Q3]] b'`, `inAliasAt(scanDoc(doc), doc.indexOf('Q3'))` true; red when the offset isn't taken relative to the line start) and "an alias written in code is code" (`inAliasAt` false at the alias in ```` ```\na [[Alpha|al]] b\n``` ```` and in `` a `[[Alpha|al]]` b ``; red without the `inCodeAt` line). Add `expect(autoPair(scanDoc('a [[Notes|My ]] b'), 13, 13, '[')).toBeNull()` to the auto-pair block, red without `autoPair`'s alias check.
- [ ] Delete `Guards/aliasGuard.ts` (9 lines) and `Guards/aliasGuard.test.ts` (its "still pairs a bracket in ordinary prose" repeats `edits.test.ts:178`).
- [ ] Apply the AFTER.

**AFTER**

```Core/MarkdownPM/Guards/aliasGuard.ts diff
-import { aliasSpanAt } from '../../Connections/connections'
-import { lineEndAt, lineStartAt } from '../Engine/markdownCode'
-
-/** `]` would truncate the link the caret is sitting in; the guard belongs to the alias, not to the input chain that asks it. */
-export function refusedInAlias(doc: string, at: number, text: string): boolean {
-  if (text !== ']') return false
-  const ls = lineStartAt(doc, at)
-  return aliasSpanAt(doc.slice(ls, lineEndAt(doc, at)), at - ls) !== null
-}
```

```Core/MarkdownPM/Input/edits.ts diff
@@ beside autoPair @@
+/** In a written connection's alias, where a `]` would truncate the link; an alias in code is code. */
+export function inAliasAt(scan: DocScan, at: number): boolean {
+  if (inCodeAt(scan, at)) return false
+  const ls = lineStartAt(scan.text, at)
+  return aliasSpanAt(scan.text.slice(ls, lineEndAt(scan.text, at)), at - ls) !== null
+}
+
@@ autoPair @@
-  if (inserted === '[') {
-    const ls = lineStartAt(doc, c)
-    // Never inside an alias: the pair's `]` is the character the input guard refuses there, and would truncate the link.
-    if (aliasSpanAt(doc.slice(ls, lineEndAt(doc, c)), c - ls)) return null
-  }
+  if (inserted === '[' && inAliasAt(scan, c)) return null
```

```Core/MarkdownPM/Input/markdownInput.ts diff
-import { refusedInAlias } from '../Guards/aliasGuard'
 …(add `inAliasAt` to the existing `./edits` import)
-    if (refusedInAlias(scan.text, from, text)) return true
+    if (text === ']' && inAliasAt(scan, from)) return true
```

`edits.ts` already imports `aliasSpanAt`, `inCodeAt`, `lineStartAt`, `lineEndAt`, and `DocScan` (`:3-15`); `Core/Connections/connections.ts` is untouched.

**VERIFY**

- [ ] Each new assertion red with its line reverted, green restored.
- [ ] `git grep -n "refusedInAlias\|aliasGuard" -- Core` returns nothing.
- [ ] `cellAlias.test.tsx:70-87` passes unchanged (its two tests pin `inAliasAt` and `text === ']'` at the call site).

#### Task 2-2

**TASK:** `slotNear` answers nothing in code, which covers the empty-slot collapse and the alias memory.

**NOW:** `slotNear` (`linkEdit.ts:103-111`) reads `aliasSpanAt` and `linkAt` off the bare line; leaving `[[Alpha|]]` in a fence deletes its `|`, and typing an alias there calls `aliases.remember`.

**CHANGE**

- [ ] Write `linkEdit.test.tsx` "an alias left in code stays as written": an empty `[[Alpha|]]` in a fence keeps its pipe after the caret moves into it and away; an empty `` a `[[Alpha#]]` b `` keeps its hash; a fenced `[[Alpha|]]` with `new` typed (`userEvent: 'input.type'`) then left never calls `remember`. Use the file's `caretTo` pattern; capture offsets by running. Red without the gate.
- [ ] Apply the AFTER.

**AFTER**

```Core/MarkdownPM/Links/linkEdit.ts diff
 function slotNear(state: EditorState, at: number): Slot | null {
   const { line, rel } = lineNear(state, at)
+  if (inCodeAt(docScan(state.doc), line.from + rel)) return null
   const alias = aliasSpanAt(line.text, rel)
```

**VERIFY**

- [ ] The three cases red with the gate removed, green restored.
- [ ] `linkEdit.test.tsx`'s "an alias opened and abandoned" and "the alias memory hears only what was authored" pass unchanged.

#### Task 2-3

**TASK:** One `literalAt` replaces `destinationGuard` and `insideCodeAtCaret`; Paste and Paste As both ask it.

**NOW:** `linkFor` (`pasteLink.ts:25-26`) checks both guards; `pasteAs` (`:97`) checks only `destinationGuard`, so Paste As writes link syntax inside code, and on a blank fence line Embedded Link writes nothing (`pasteLink.test.tsx:245-250` pins that).

**CHANGE**

- [ ] Rewrite `pasteLink.test.tsx:245-250` in place as "lands the address as plain text on a blank line inside a fence": same body and seat, expect ```` `\`\`\`\n${URL}\n\`\`\`` ````. Red at `cc725b334` (it writes nothing) and with `pasteAs` checking the destination alone.
- [ ] Apply the AFTER.

**AFTER**

```Core/MarkdownPM/Links/pasteLink.ts diff
@@ linkFor @@
   const sel = view.state.selection.main
-  if (destinationGuard(view, sel.from)) return null
-  if (insideCodeAtCaret(view, sel.from)) return null
+  if (literalAt(view, sel.from)) return null
@@ guards @@
-function destinationGuard(view: EditorView, pos: number): boolean {
-  const line = view.state.doc.lineAt(pos)
-  return linkDestinationStart(line.text, pos - line.from) !== null
-}
-
-/** An insertion at a span's exclusive end still lands inside, so the position behind the caret answers too — except across a newline, or the first column after a fence would read as the fence's. */
-function insideCodeAtCaret(view: EditorView, pos: number): boolean {
-  const scan = docScan(view.state.doc)
-  if (inCodeAt(scan, pos)) return true
-  return pos > 0 && view.state.sliceDoc(pos - 1, pos) !== '\n' && inCodeAt(scan, pos - 1)
-}
+/** Code and another link's destination take the clipboard as written. An insertion at a code span's exclusive end still lands inside, so the position behind the caret answers too, except at the line's start, where it would read the fence above. */
+function literalAt(view: EditorView, pos: number): boolean {
+  const line = view.state.doc.lineAt(pos)
+  if (linkDestinationStart(line.text, pos - line.from) !== null) return true
+  const scan = docScan(view.state.doc)
+  return inCodeAt(scan, pos) || (pos > line.from && inCodeAt(scan, pos - 1))
+}
@@ pasteAs @@
-  if (form === 'literal' || destinationGuard(view, view.state.selection.main.from)) {
+  if (form === 'literal' || literalAt(view, view.state.selection.main.from)) {
```

`pos > line.from` is the old `pos > 0 && sliceDoc(pos - 1, pos) !== '\n'`, since `line` is `lineAt(pos)`.

**VERIFY**

- [ ] The rewritten test red with `pasteAs` reverted, green restored.
- [ ] `git grep -n "destinationGuard\|insideCodeAtCaret" -- Core` returns nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] All five F-033 symptoms named in *§Context* are each pinned by a test that is red at `cc725b334` and green now.
- [ ] `drawnLinkAt` has its three pointer-side readers only, and every caret path reads the written text.
- [ ] **Live drive (Claude, per the owner):** load the `interaction-testing` skill, then drive the built app through `.claude/scripts/drive-harness.mjs` (`launch(port, name)` backs up `~/Test`; `activate(cdp, pid)` before typing; `restore()` at the end). Seed a page through `ask(cdp, 'mutate', { op: 'createPage', … })` whose body holds ```` ```\n[[Alpha]]\n``` ````, a body `[[Alpha]]`, a fenced `[[Alpha|al]]`, and a `<div>` block holding `[[Alpha|al]]`; open it from Collection A's cards. Over CDP: a real press and click on the fenced connection leaves the page open with the caret placed; the same on the body connection opens Alpha; Enter with the caret in the fenced alias breaks the line; Enter in the `<div>` alias breaks the line; Enter in a body alias rests the caret on the closer. The drive earns trust only when the fenced press fails with `linkUnder`'s `drawnLinkAt` reverted to the line-local read; rebuild and repeat it once that way, then restore.

---

### Phase 3 — One Definition Each

**GOAL:** The address span, the markdown link's look, the callout head's prefix, and the callout conversion's strip are each written once (F-036, F-037, F-068's first and third items), and the test-only `data-conn-title` goes with the cell span it rode on. Behavior is unchanged.

#### Task 3-1

**TASK:** One `linkAddress` in `tokens.ts` gives a link's address span; `linkTarget` slices it, and `linkHalves` goes.

**NOW:** `linkTarget` (`tokens.ts:47-50`) and `linkHalves` (`linkFormat.ts:17-20`) both compute `[close[0] + 2, close[1] - 1]`. `linkHalves`' only readers (`linkFormat.ts:72`, `cellStatic.tsx:485`) both index it with `action === 'rename' ? 'label' : 'address'`, and its `label` is the token's `contentRange`.

**CHANGE**

- [ ] Apply the AFTER; `cellStatic.tsx` imports `linkAddress` from `Engine/tokens` and drops `linkHalves` from its `linkFormat` import. Biome wraps the widened `Engine/tokens` import (+7, counted in *§Delta*).

**AFTER**

```Core/MarkdownPM/Engine/tokens.ts diff
-export function linkTarget(text: string, tk: Token): string {
-  const [, close] = tk.markerRanges
-  return text.slice(close[0] + 2, close[1] - 1)
-}
+export function linkAddress(tk: Token): [number, number] {
+  const [, close] = tk.markerRanges
+  return [close[0] + 2, close[1] - 1]
+}
+
+export const linkTarget = (text: string, tk: Token): string => text.slice(...linkAddress(tk))
```

```Core/MarkdownPM/Links/linkFormat.ts diff
-import { linkTarget, type Token } from '../Engine/tokens'
+import { linkAddress, linkTarget, type Token } from '../Engine/tokens'
 …
-export function linkHalves(tk: Token): { label: [number, number]; address: [number, number] } {
-  const [, close] = tk.markerRanges
-  return { label: tk.contentRange, address: [close[0] + 2, close[1] - 1] }
-}
-
 …
-    const half = linkHalves(tk)[action === 'rename' ? 'label' : 'address']
+    const half = action === 'rename' ? tk.contentRange : linkAddress(tk)
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
-        return onSelect(linkHalves(now.tk)[action === 'rename' ? 'label' : 'address'])
+        return onSelect(action === 'rename' ? now.tk.contentRange : linkAddress(now.tk))
```

**VERIFY**

- [ ] `git grep -n "linkHalves" -- Core` returns nothing.
- [ ] `linkFormat`, `cellLinks`, `mdLinkTarget`, and `tokens` suites pass unchanged (`linkFormat.test.tsx:137-147` and `cellLinks.test.tsx:255-270` pin Rename and Edit Link's selections).

#### Task 3-2

**TASK:** One `mdLinkClass` decides a markdown link's class for both renderers; the cell's two spans become one; `data-conn-title` is removed.

**NOW:** `build`'s link-token block and `renderCellContent` (`cellStatic.tsx:122-146`) each map a target's kind to classes. The cell writes `data-conn-title` on its connection span (`:98`) and its internal markdown-link span (`:133`); no production code reads it (hover reads `data-link-span`, `cellStatic.tsx:448-452`).

**CHANGE**

- [ ] Write the pin in `mdLinkTarget.test.tsx`'s "both syntaxes and both renderers agree" block: mount `` `see [the notes](${target}) end` ``, `await act(async () => view.focus())`, set the caret to 6, and expect `.md-connection-open` to read "the notes"; render `'a [Home](not a url) b'` in a cell and expect its `.md-link-invalid` to carry `md-unresolved-fixed`. Red if either renderer's extra class is dropped.
- [ ] Remove `data-conn-title` from both cell spans. Delete `aliasSites.test.tsx`'s "a cell connection carries its resolve key, not just its text" (`:88-94`, with its stale comment); `cellLinks.test.tsx:53`'s `.md-connection-resolved` query on `[[Quarterly Plan|the plan]]` still pins that an aliased resting connection resolves by its title, since the alias names no page. Drop the `connTitle` asserts at `cellLinks.test.tsx:57` and `:98`, retitling `:53` "renders the alias, resolved by its title".
- [ ] Apply the AFTER.

**AFTER**

```Core/MarkdownPM/decorations.ts diff
@@ imports @@
   aliasedToken,
-  linkTarget,
   linkTokenAt,
 …
 import {
   headingMissing,
-  resolveMdTarget,
+  tokenTarget,
   wikiLinkView,
   type ConnectionsApi,
+  type MdTarget,
 } from './Links/connectionsApi'
@@ beside MD_LINK_CLASS @@
+
+export function mdLinkClass(
+  conn: ConnectionsApi | undefined,
+  target: MdTarget,
+  ownKeys: readonly string[] | undefined,
+): string {
+  switch (target.kind) {
+    case 'page':
+    case 'self':
+      return cx(
+        'md-connection-resolved',
+        headingMissing(conn, target, ownKeys) && 'md-connection-heading-missing',
+      )
+    case 'external':
+      return MD_LINK_CLASS
+    case 'invalid':
+      return 'md-link-invalid'
+  }
+}
@@ build · link tokens @@
-    const target = resolveMdTarget(conn, linkTarget(text, tk))
+    const target = tokenTarget(conn, text, tk)
     const valid = target.kind !== 'invalid'
     const internal = target.kind === 'page' || target.kind === 'self'
     const isActive = active.has(i)
     ranges.push(
       Decoration.mark({
-        class: internal
-          ? cx(
-              'md-connection-resolved',
-              isActive && 'md-connection-open',
-              headingMissing(conn, target, ownKeys) && 'md-connection-heading-missing',
-            )
-          : valid
-            ? MD_LINK_CLASS
-            : 'md-link-invalid',
+        class: cx(mdLinkClass(conn, target, ownKeys), internal && isActive && 'md-connection-open'),
       }).range(tk.contentRange[0], tk.contentRange[1]),
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
-import { MD_LINK_CLASS } from '../decorations'
+import { MD_LINK_CLASS, mdLinkClass } from '../decorations'
 …
-  headingMissing,
@@ renderCellContent · connection @@
-            data-conn-title={text.slice(rs, re)}
@@ renderCellContent · link @@
       const target = tokenTarget(conn, text, tk)
       out.push(
-        target.kind === 'page' || target.kind === 'self' ? (
-          <span
-            key={key++}
-            className={cx(
-              'md-connection-resolved',
-              headingMissing(conn, target, around?.ownKeys) && 'md-connection-heading-missing',
-            )}
-            data-conn-title={target.kind === 'page' ? target.page.title : undefined}
-            data-link-span={`${base + s},${base + e}`}
-          >
-            {content}
-          </span>
-        ) : (
-          <span
-            key={key++}
-            className={
-              target.kind === 'external' ? MD_LINK_CLASS : 'md-link-invalid md-unresolved-fixed'
-            }
-            data-link-span={`${base + s},${base + e}`}
-          >
-            {content}
-          </span>
-        ),
+        <span
+          key={key++}
+          className={cx(
+            mdLinkClass(conn, target, around?.ownKeys),
+            target.kind === 'invalid' && 'md-unresolved-fixed',
+          )}
+          data-link-span={`${base + s},${base + e}`}
+        >
+          {content}
+        </span>,
       )
```

`rs`/`re` stay in the cell's connection branch (`:103` reads them). `MD_LINK_CLASS` stays imported in `cellStatic.tsx` for `LINK_SELECTOR` (`:262`). The class order in `build` becomes `resolved heading-missing open`; no CSS selector or test reads class order.

**VERIFY**

- [ ] The new pin red with each extra class removed in turn, green restored.
- [ ] `git grep -n "conn-title\|connTitle" -- Core` returns nothing.
- [ ] `mdLinkTarget`, `externalLink`, `cellLinks`, `aliasRender`, `textScope`, `cellHeadings`, and `linkEdges` suites pass.

#### Task 3-3

**TASK:** `calloutLines` reads the head's prefix through `calloutHeadPrefixLen`, and `setBlock`'s callout case composes `stripInnerMarkers` and `stripQuotePrefix` with identical output.

**NOW:** `calloutLines` (`detect.ts`) asks `isCalloutHead`, then re-runs `quotePrefix` and `calloutTagRe` (with a dead `?? 0` fallback). `stripBlockMarkers` (`format.ts:347-352`) is `stripInnerMarkers` plus a quote strip outside the list branch.

**CHANGE**

- [ ] Write `format.test.ts` "callout takes a heading's or quote's marker, and a list's alone": `## hi` → `> [!callout] hi`, `> hi` → `> [!callout] hi`, `- > foo` → `> [!callout] > foo`. The `- > foo` row goes red under the unconditional compose `stripQuotePrefix(stripInnerMarkers(line))`.
- [ ] Apply the AFTER.

**AFTER**

```Core/MarkdownPM/Engine/detect.ts diff
@@ calloutLines @@
   while (i < lines.length) {
-    if (!isCalloutHead(lines[i]) || codeLine(i)) {
+    const head = codeLine(i) ? null : calloutHeadPrefixLen(lines[i])
+    if (head === null) {
       i++
       continue
     }
 …
-    const headPrefix = quotePrefix(lines[i])
-    const tag = calloutTagRe.exec(lines[i].slice(headPrefix.length))
     for (let k = i; k < j; k++) {
 …
-        prefixEnd: k === i ? headPrefix.length + (tag?.[0].length ?? 0) : oneLevel,
+        prefixEnd: k === i ? head : oneLevel,
```

```Core/MarkdownPM/Input/format.ts diff
@@ setBlock · callout @@
       if (isCalloutHead(line)) return { changes: [] }
-      const next = `> [!callout] ${stripBlockMarkers(line)}`
+      const body = stripInnerMarkers(line)
+      const next = `> [!callout] ${parseListMarker(line) ? body : stripQuotePrefix(body)}`
@@ module @@
-
-function stripBlockMarkers(line: string): string {
-  const lm = parseListMarker(line)
-  if (lm) return line.slice(lm.contentStart)
-  const h = headingParts(line)
-  return stripQuotePrefix(h ? h.indent + h.content : line)
-}
```

**VERIFY**

- [ ] `detect.test.ts:168-172` passes unchanged (it pins the head's `prefixEnd`).
- [ ] The new `format.test.ts` row red under the unconditional compose, green restored.
- [ ] `git grep -n "stripBlockMarkers" -- Core` returns nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

---

### Completion Criteria

- **Conformance:** No second reader of a link's drawn state, of the menu rule, or of the alias rule exists; nothing changed outside the files the tasks name and their tests; the owner's rulings (F-034 before F-054, exact callout output, Enter standing down in raw HTML, ride-alongs in, connection/link vocabulary) hold.
- **Correctness:** Each of F-033's five symptoms, F-038's hover and menu, and F-039's Paste As are exercised by a test that is red at `cc725b334`; a press, click, hover, and right-click on an ordinary `[[Alpha]]` and `[x](https://…)` still follow, glance, and open their menus; the live drive passes and fails with its fix reverted.
- **Completeness:** Every task ticked; every removed concept in *§Concepts* has zero references; no probe file remains.
- **Confirmation:** Every new test's red was observed with its one line reverted on a compiling tree; the long-document probe's result is recorded.
- **Continuity:** *§Reconciliation* walked; the ledger describes only what remains.
- **Confidence:** Gates green from a clean state; the measured production delta replaces *§Delta*'s estimate, and anything short of −60 is reported with its cause.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [ ] Phase review (opus-medium, a simplification and a correctness reader per phase): Phase 1 · Phase 2 · Phase 3
- [ ] Simplification (`code-simplification`) → adversarial (`adversarial-review`) over `cc725b334..HEAD`
- [ ] Neutral before/after review (opus-high): the file list only; Before is `git show cc725b334:<path>`, After is the working tree; forbidden from `git diff`, `git log`, commit messages, and `.claude/`; returns a Positive/Neutral/Negative verdict, a per-file account, a ranked list of anything worse in After with `file:line`, and before/after line counts. Everything it ranks worse is resolved or ruled on before commit.
- [ ] Own pass: gates · diff · deviations · criteria
- [ ] Commit the work, reconcile the ledger, then a docs commit whose header names the work commit
- [ ] Report delivered with `/view-changes` and the ± production delta

#### Reconciliation

- `Pommora Codebase Audit.md` — F-033, F-034, F-036, F-037, F-038, F-039, F-068 and footnotes `[^33]` `[^34]` `[^36]` `[^37]` `[^38]` `[^39]` `[^68]` — delete — Final Verification
- `Pommora Codebase Audit.md:3` — header — **Reconciled** names the closeout commit; **Findings** recounted with `grep -c '^##### F-'` (90/627 expected) — Final Verification
- `Pommora Codebase Audit.md:27` — Readiness "Page editor" row Medium count 11 → 10 (F-033 was the one Medium) — Final Verification
- `Pommora Codebase Audit.md:315` — W6 opener — rewrite for F-035, F-041, F-042, F-043 — Final Verification
- `Pommora Codebase Audit.md:739-741` — W12 title and opener — "W12 · Residue", opener for F-069 alone — Final Verification
- `Pommora Codebase Audit.md:585` — F-054's `tiles` parameter, `connectionClicks` scope threading, "Lands before F-034", the `cellTokens` sentence, and its Net — rewrite: the body's pointer gestures read what `build` draws, so its embed mapping reaches clicks, glances, and the menu with no hit-test change; the resting cell maps through `cellTokens`; re-measure the net; `[^54]` drops `connectionClicks.ts` and re-anchors — Final Verification
- `Pommora Codebase Audit.md:783` — F-071 "after F-068, F-066, F-054, F-042, and F-059" → drop F-068 — Final Verification
- `Pommora Codebase Audit.md:795,799` — F-072's `cellAlias.test.tsx:79-86` clause ("once F-068 moves that condition to the call site" → "at `typedInput`'s call site") and the `aliasGuard.test.ts:30-32` sentence (delete) — Final Verification
- `Pommora Codebase Audit.md:1171` — F-099 "through F-068 and F-072" → "through F-072" — Final Verification
- `Pommora Codebase Audit.md:1503` — appendix row `aliasSites.test.tsx :89` — delete (the test goes in Task 3-2) — Final Verification
- F-066 and F-067 — add that Enter's alias commit reads the scan's HTML spans, so an unclosed opener the scan and the parser read differently decides Enter by the scan's reading — Final Verification
- Every surviving footnote, appendix row (including bare-name rows such as `cellStatic:17-23`, `linkEdit`, `textScope:16-22`), and prose `file:line` citing a touched file — re-anchor with `difflib` from `cc725b334` — Final Verification
- `Gestures/pointerPath.ts:25,31` — "the tokenize", "four handlers" — Task 1-3
- `Engine/tokens.ts:328` — `linkTokenAt`'s "the one read every click…" — Task 1-2
- `Input/edits.ts:359` — "the character the input guard refuses" — Task 2-1
- `Core/MarkdownPM/aliasSites.test.tsx:91` — "The table's hover handler reaches a cell connection through the DOM, with no token to ask" — deleted with its test in Task 3-2
- `Dashboard/Audit/audit.md` — copied from the ledger by the pre-commit hook; nothing to do. `.claude/scripts/comment-baseline.json` and `comment-units.json` name `aliasGuard` but are point-in-time snapshots (181 of their paths already no longer exist); left as they are.
- `.claude/Features/MarkdownPM.md`, `ConnectionsPM.md`, `.claude/Guidelines/Editor-Internals.md` — no sentence describes the changed mechanics (scouted); re-read after landing — Final Verification

#### Open Items

#### Deviations
