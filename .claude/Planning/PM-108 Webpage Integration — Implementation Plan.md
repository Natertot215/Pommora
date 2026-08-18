## PM-108 Webpage Integration — Implementation Plan

> **Status:** written, pending review · Spec: `.claude/Planning/PM-108 Webpage Integration — Decision Log.md` · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

The editor learns to embed live webpages the way it embeds Pages. At the end: a URL on its own line renders as a live, resizable website tile inside a Page body; the right-click menu is reorganized around an Embed submenu; pasting an address always writes a formatted link — auto-formatting graduates from setting to built-in behavior; external links can open in a floating in-app browser; one persistent web session authenticates every embed surface per machine, managed from a General ▸ Accounts section; and hovering a website link raises a live preview card. None of this exists today — Pommora currently renders web addresses as outbound links and nothing more.

The shape: webpage tiles ride the **existing embed framework** (chassis, fencing, guard, heights, grip) with a new React payload around a **visibility-managed `<webview>`** — the only mechanism that is process-isolated *and* a real DOM element, empirically proven to clip correctly while fully visible and to bleed when partially clipped, hence the management. The in-app browser and hover card mount the same webview inside surfaces that own their region. Alternatives — iframes (framing-blocked by most login sites), WebContentsView (cannot be DOM-clipped), static bookmark tiles (Notion's model) — were weighed and rejected in the decision log with Nathan's sign-off.

Constraints: `sandbox`/`contextIsolation` stay on; guests are validated at attach, carry no preloads, and live on one named `persist:` partition; the main window's own navigation hardening is untouched. Deliberately not solving: cross-device session roaming, per-site multiple accounts, dashboard-layer webpage tiles, image rendering — all logged Prospects.

**Requirements**

1. The editor context menu reads **Insert / Format / Embed / Heading / Lists**, Embed ▸ holds Webpage · Internal Page, Insert ▸ loses Page, conditional Insert Link keeps its top seat. (Log A-1…A-4, A-3a)
2. Pasted-link auto-formatting is **built-in**: the `autoFormatPastedLinks` toggle and key are removed, the orphaned `when` disclosure mechanism goes with it, and the Default Format row is always visible. (G-1, F-8)
3. A lone-line `![Title](url)` with an explicit http/https scheme is a webpage embed: URL-keyed claim (duplicates allowed), formation-gated (doc change · mount · selection-departure; never claims a line the selection is on), empty-label-tolerant grammar, and the paste/⌘K rewriter declines inside a link destination. (B-1, B-4, B-3a, B-7, F-1, F-2)
4. The tile renders the live site on the shared chassis, bleed-free: webview present only while the tile is fully visible in its depth-0 scrollport, loading/failure faces otherwise, height drag with an apply-and-resize-time fit cap, heights persisted host→URL. (B-5, F-5b, F-5d, F-6, F-7)
5. Engagement: the live tile is inert until clicked in; click-out disengages; scrolling an engaged tile into the clip zone disengages and swaps; swapped guests are hidden, never destroyed, under a capped LRV retention. (F-4, F-5a, F-5c)
6. The tile's hover-title is a clickable link honoring the open-in preference. (B-2, C-2a)
7. Tile labels follow `defaultLinkFormat`: local forms fill at claim formation as a retired one-shot; Page Title defers through a whole-line, escape-correct swap. (B-3, B-3a)
8. The tile's grip menu carries an Edit Link arm (TextPicker popover → whole-span re-aim with a fresh default-format label and height-key migration) above Delete. (B-6)
9. External-link opening honors a new Files & Links knob at the three renderer call sites, and the in-app browser is a PreviewPane flavor: back/forward left glyphs, no promote, the centered title tracking the current page and escalating to the external browser on click. (C-1, C-2, C-2a)
10. A main-process guest-lifecycle module owns `webviewTag: true`, `will-attach-webview` validation, guest popup routing (deferred to the renderer's knob branch), and host-zoom sync onto guests. (C-3, C-4, F-3)
11. All embed surfaces share one `persist:` partition wearing the surgical UA treatment; sign-ins persist per machine across restarts; Google is best-effort. (D-2, D-4)
12. General ▸ Accounts: an Add Account flow recording its rows on completion, per-account sign-out via full storage clear, and a Clear Browsing Data affordance. (D-1, D-1a, D-3)
13. Website links raise the hover card as a live, non-interactive render that mounts hidden and blooms on load-complete; both arming gates widened. (E-1, E-2, E-2a)

**Acceptance — the whole thing working:** In the running app: right-click shows the reordered menu; Embed ▸ Webpage types `![]()`, pasting a URL into it writes no nested link, and leaving the line forms a live tile labeled per the default format; scrolling the document never paints guest content outside a tile; a click engages the site and a click outside disengages it; the hover-title opens per the knob; a link click with the knob set to in-app opens the PreviewPane browser whose back/forward work and whose title click opens the system browser; signing into a site in one tile shows signed-in state in a second tile and after an app relaunch; the Accounts section lists that account and signs it out such that a reopened tile is logged out; hovering a website link blooms a live inert preview only after it loads; `npm run typecheck`, `npm run test`, `npm run lint` green.

**Forced By**
- The embed guard refuses changes strictly interior to a claimed range (`embedWidget.tsx` `embedGuard`) → every writer aimed at a claimed line replaces the whole line/block span.
- `markdownLinkRegex` requires a 1+ char label and non-empty destination (ReDoS-load-bearing caps) → the webpage detector and the destination guard read their own empty-tolerant grammar; the tokenizer's grammar is never the guard's oracle.
- `serializeLink` emits no bang and collapses an empty alias to the bare URL → embed-line writers hand-compose `![${escapeAlias(label)}](${url})`, reusing only the escaping and `linkDisplayText` label layers.
- `isValidLink` passes mid-typed prefixes (`https://example.c`) → the claim is formation-gated on selection-not-on-line; triggers are doc change, mount, selection-departure.
- Spike: a webview clips correctly only while fully inside the scrollport; bleeds when partially clipped → live webview only at full visibility, faces otherwise.
- Spike: a guest survives `display:none`/`visibility:hidden` with JS state intact → the engagement-era swap hides; teardown is the retention cap's job.
- Guests don't inherit host zoom (base 0.9, `setZoomFactor` main-side) → the guest module syncs zoom on attach and on every host-zoom change.
- Guest popups answer only the guest's own `setWindowOpenHandler`, reachable from main → the guest module wires it and defers to the renderer's knob branch (single adjudicator).
- Google's embed block is server-side detection → Ferdium's surgical UA recipe on the partition, best-effort.
- Editor-Internals: the embed claim has **one owner** → the webpage claim extends `claimedEmbeds` with a kind-aware key; no second predicate.
- Editor-Internals: hot-path reads share one per-doc-version derivation → webpage lines join `docScan`; the formation gate tracks only unclaimed candidates, no per-caret whole-doc read.
- Editor-Internals: `WidgetType.ignoreEvent` defaults `true`; grip hit-tests read one grip-bearing line-class list → the tile's interactive parts opt in explicitly; the webpage line class joins the existing list.

**Inherited Reasoning** (tried/ruled out in the spec — do not retry)
- `![[url]]` syntax — the wiki-embed form is reserved for images/files. Bare `[Title](url)` as trigger — would convert every pasted lone-line link.
- WebContentsView inline (can't DOM-clip) · iframe as primary (framing blocks, shared process, broken logins) · header-stripping (whack-a-mole, out of scope) · always-live webviews (spike-proven bleed) · static bookmark tiles as primary (Nathan wants live; named fallback only) · metadata-card hover previews (Nathan chose live) · cookie-store-derived account lists (can't distinguish signed-in from visited) · cookies-only sign-out (leaves localStorage logins alive) · naive Chrome UA spoof (stopped working ~2021).

**Grounding** (re-open before the task that touches each)
- The decision log (spec) — all decisions tagged; three adversarial rounds folded.
- `Pommora/src/main/editorMenu.ts` — menu assembly, `pommoraItems`, action dispatch (`mdpm:` strings over `menu:action`).
- `Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx` — tile field, `buildTiles`, `embedGuard`, `EmbedResizeHandle`, `estimatedHeight`, atomic ranges.
- `Pommora/src/renderer/src/MarkdownPM/editor/embedRanges.ts` + `detect/index.ts` — `claimedEmbeds`, `loneEmbedRe`, `docEmbedLines`.
- `Pommora/src/renderer/src/MarkdownPM/editor/PasteLink.ts` + `src/shared/PasteLink.ts` + `editor/PendingTitle.ts` — paste decision, deferred swap, `titleSettled` retirement discipline.
- `Pommora/src/shared/links.ts` + `linkValue.ts` — `markdownLinkRegex`, `MD_LINK`, `isValidLink`, `linkDomain`, `escapeAlias`, `linkDisplayText`.
- `Pommora/src/main/index.ts` (window creation ~:263, zoom ~:254, `link:open` ~:1480, `embedHeights` ~:812) · `src/main/gripMenu.ts` · `src/shared/gripMenu.ts` · `src/main/linkTitles.ts`.
- `Pommora/src/renderer/src/Settings/NexusSettings.tsx` — `LEAVES`, row kinds, the `when` gate.
- `Pommora/src/renderer/src/Embeds/PageEmbed.tsx` + `ConnectionHoverCard.tsx` + `embeds.css` · `MarkdownPM/editor/links.ts` (hover gates ~:75-78, click ~:111-123).
- `Pommora/src/renderer/src/PagePreview/` + `design-system/components/PreviewPane/` — the window chassis and its token contract.
- `.claude/Guidelines/Editor-Internals.md` — binding editor rules quoted in Forced By.
- Scratchpad spikes (clipping bleed; hidden-guest survival) — screenshot/JS-state evidence, summarized in the spec's Sources.

**Environment:** Plan dir `.claude/Planning`. Explorer: `Explore`. Attack: `build-breaking-agent`. Correctness gate: `/code-review` (project skill). Simplification: `code-simplifier` + `comment-killer-agent`. Neutral verifier: `general-purpose`. Gates (from `Pommora/`): `npm run typecheck` · `npm run test` · `npm run lint` — exit codes read directly, never piped (`set -o pipefail` if a pipe is unavoidable). Atlas check: `node scripts/check-atlas.mjs`. Rules dir `.claude/Guidelines`.

**Shapes:** additive (new tests first where the layer is pure logic) · removal (G-1: toggle, key readers, `when` mechanism — compiler-enumerable) · fix (the ⌘K destination guard repairs an existing bug; sibling sweep: the paste path, done) · user-visible (interaction sweep ran in the spec; per-phase screenshots + one final walkthrough per Nathan's convention).

**Global Constraints (every task inherits these)**
- Gates from `Pommora/`: `npm run typecheck` && `npm run test` && `npm run lint`, each exit code read directly. A change that leaves a Biome diagnostic or unformatted file isn't done; a failed Edit on whitespace means the hook reformatted — re-read and retry, never hand-align.
- Renderer never touches Node; every new channel is one entry in `src/shared/bridge.ts` with the `Result` envelope; `src/shared/types.ts` stays fs- and React-free.
- One claim owner; protect embed edits at the transaction layer; no per-caret whole-doc reads; no O(N) work on scroll/mousemove triggers — visibility swaps fire on observer transitions only.
- Comments: why-only, minimum; no state/pending labels; never restate values. `KNOB` and `(Nathan's call)` markers survive every pass.
- Tokens from `design-system` sources only; no hand-rolled styles where a token or component exists; dual-option controls are switches or double-chevron toggles.
- Docs ride the commit that falsifies them (Made False table). Stage explicit paths; Nathan's hook may pre-stage his own doc edits — bundle them, never reset them out.
- Design stops: any surface whose look isn't pinned by an existing component (tile faces, hover-title, browser chrome, Accounts rows) gets disclosed to Nathan before implementation or CDP-screenshotted immediately after and shown. Final walkthrough at closeout regardless.
- CDP driving of the live editor only on a throwaway page, never an existing file. Launch: `env -u ELECTRON_RUN_AS_NODE npm run dev`. Main/preload changes need a full dev-process restart; CM6 extension changes need ⌘R.
- Out of scope everywhere: session roaming, multi-account partitions, dashboard webpage blocks, image rendering, header stripping.

**Made False** (each rewrite lands in the falsifying commit)

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| MarkdownPM.md | Context menu submenus "(Format / Heading / Lists / Insert)"; Insert ▸ holds Page | Reorder + Embed submenu | 1 |
| ConfigurationPM.md | `autoFormatPastedLinks` row; Default Format "disclosed only while the row above is on" | G-1 removal | 2 |
| MarkdownPM.md §Pasted links + ConnectionsPM.md | Pasting "can be written as a link… which form is a per-Nexus default" gated on the toggle | Always-on formatting | 2 |
| MarkdownPM.md §Pending | "Image + LaTeX render seams — both are detected and styled only" (image half) | Bang-paren lone lines become webpage embeds | 8 |
| ConnectionsPM.md | A lone-line markdown link naming a website "carries the link color, underline, and navigation" | The lone line is now an embed | 8 |
| ConfigurationPM.md | Files & Links has no link-opening knob; General has no Accounts | Knob task; Accounts task | 12 · 16 |
| PagePreviewPM.md | The window's flavors (floating page, NavWindow) | The browser flavor | 14 |
| PagePreviewPM.md §Hover Card | The card is "a compact, read-only view of the target page" | The website flavor | 18 |
| SymbolsPM.md | Registry contents | Back/forward + webpage glyphs | 14 |

**Dead Vocabulary**
- `autoFormatPastedLinks` → expect 0 in `Pommora/src`. Legitimate hits: none.
- `when:` as a settings-row field (search `when?: (p` in `NexusSettings.tsx`) → expect 0.
- Control: `rg -F "pasteLinkIntoText" Pommora/src` → 7 at planning time. Zero here means the sweep never ran.

---

### Phase 1 — Menu Redesign & Built-In Paste Formatting

#### Task 1: Reorder the editor context menu around Embed

**Requirement:** 1

**Why:** The menu is the feature's front door; reordering is independent of everything else and ships alone. Embed ▸ Webpage is deliberately *deferred to Task 9* — a menu item whose output is inert text until the tile exists would violate the no-dead-surfaces instinct; Embed opens with Internal Page only.

**Files:** Modify `Pommora/src/main/editorMenu.ts` — `pommoraItems` (currently: conditional Insert Link · Format ▸ · Heading ▸ · Lists ▸ · Insert ▸; Insert ▸ = Blockquote / Page / Horizontal Rule / Code Block / Callout / Table).

**Steps:**
- [ ] Reorder the block to: Insert Link (conditional, unchanged, top) · Insert ▸ · Format ▸ · Embed ▸ · Heading ▸ · Lists ▸.
- [ ] Embed ▸ gets one item: **Internal Page** dispatching the existing `block:page` action (exact string unchanged — `applyEditorAction` special-cases it at `menu.ts:72`). Remove Page from Insert ▸; Insert ▸ keeps Blockquote / Horizontal Rule / Code Block / Callout / Table.
- [ ] Gates green. Launch dev, right-click in a page body: order and items as specified; Insert ▸ Blockquote checkbox state still tracks a quote block.
- [ ] Rewrite the MarkdownPM.md context-menu sentence (Made False row 1) in this commit.
- [ ] Commit: `feat(menu): the editor menu reorders around the Embed submenu`

#### Task 2: Auto-format becomes built-in; the toggle and `when` mechanism go

**Requirement:** 2

**Why:** Two features (paste and embed titles) now read `defaultLinkFormat`, so its gating toggle is retired as product (Nathan's G-1). Removal shape: let the compiler enumerate — delete the key from `Personalization` and the type gate lists every reader.

**Files:** Modify `Pommora/src/shared/types.ts` (drop `autoFormatPastedLinks`), `src/main/readNexus.ts` (drop its coercion; its test `readNexus.test.ts` carries the key too), `src/renderer/src/MarkdownPM/editor/PasteLink.ts` (`autoFormat` hardwires true in the `linkFor` input), `src/shared/PasteLink.ts` (`decidePaste` loses the `autoFormat` input; the correct fold of its format branch is `if (!wrappable && input.inverse) return LITERAL` — **the no-selection inverse is the only surviving literal path**, a conditional; "always format" naively applied would delete ⌘⇧V's raw paste and its test would go green certifying the loss), `src/renderer/src/Settings/NexusSettings.tsx` (row removed; Default Format row loses its `when`; the `when` field, its `Reveal` gating in `LeafRow`, and the `RowText.when` type go — it has no other consumer). Tests: the PasteLink test files (`pasteLink.test.tsx` carries 11 key hits) — invert the toggle-off cases to always-format expectations, **except the inverse-chord block**, which is the carve-out: no-selection ⌘⇧V still expects literal.

**Failure half:** a stale `autoFormatPastedLinks` key in an existing `settings.json` is simply unread and survives round-trips under the preserve-unknown-keys write discipline — assert no reader remains rather than adding migration.

**Survivors:** `pasteLinkIntoText` (the wrap axis) and ⌘⇧V's semantics — with no selection the inverse pastes literal text; with a selection the existing Paste As ▸ Plain Text row is the literal path (already shipped; nothing to add).

**Steps:**
- [ ] Invert the existing `decidePaste` tests for the removed axis first — expect red against current code.
- [ ] Delete the key; follow the type gate through every listed reader; re-run tests — green.
- [ ] `rg -F "autoFormatPastedLinks" Pommora/src` → 0 (control: `rg -F "pasteLinkIntoText" Pommora/src` → 5).
- [ ] Gates green. Rewrite the ConfigurationPM/MarkdownPM/ConnectionsPM sentences (Made False rows 2–3) in this commit.
- [ ] Commit: `feat(links): pasted addresses always format; the toggle retires`

#### Task 3: The destination guard — no link writes inside a link's target

**Requirement:** 3 (and an existing-bug fix)

**Why:** With formatting always-on, pasting a URL where the caret sits inside a link's `()` writes a nested link. ⌘K already seats the caret there today (`input/format.ts` `selection: to + 3`), so this fixes a live bug now and protects Task 9's door before it exists. The guard reads an **empty-tolerant grammar** — every shipped grammar refuses `![]()`/`[]()`(empty halves), so a tokenizer-based guard would never fire at the door it protects.

**Files:** Create `Pommora/src/shared/webpageEmbed.ts` — the empty-tolerant lone-line grammar module (this phase ships only the pieces the guard needs; Task 6 extends it). Modify `src/renderer/src/MarkdownPM/editor/PasteLink.ts` — `linkFor` declines when the caret sits inside a markdown link's destination span on its line. Test: `src/shared/webpageEmbed.test.ts` + a PasteLink case.

**Interfaces**
- Produces: `linkDestinationAt(lineText: string, col: number): boolean` — true when `col` falls inside the `()` of any markdown link on the line, empty labels and empty destinations included (bang-stripped `MD_LINK`-style scan, length-capped like its siblings).
- Assumed by: Task 9 (the door relies on paste-into-`()` staying literal).

**Negative control:** the test proves the paste *ran* both ways — inside a destination the clipboard lands literal (no new `[` written); outside it on the same line the same clipboard writes a formatted link. With the guard disabled the first case goes red by producing the nested form.

**Steps:**
- [ ] Failing tests: caret inside `![]()` · inside `[label]()` · inside a full link's URL · outside any link (control) · at the line's other text.
- [ ] Implement; run — green. Gates green.
- [ ] Commit: `fix(paste): a link never writes into another link's destination`

#### Gate 1 — the menu leads with Insert; paste formatting is law
- [ ] Gates green, exit codes direct. Dead-vocabulary sweep for `autoFormatPastedLinks` → 0 against its control.
- [ ] Simplification (`code-simplifier`) + `/code-review` against `<base>..HEAD`, scoped to the phase's paths; reports cite files inside the range; every concern fixed or ruled.
- [ ] Menu order and the ⌘K/paste guard seen in the running app (screenshot the menu for Nathan).
- [ ] Progress hashes filled; plan re-assessed against what landed.

---

### Phase 2 — Main-Process Web Foundation

#### Task 4: The guest-lifecycle module and the partition

**Requirement:** 10, 11

**Why:** Every later phase attaches webviews; none can be correct until main validates attaches, wires guests, and owns the session identity. One module owns the whole guest story (C-4) so zoom, popups, and session access have a single home. Dormant until Phase 3 attaches the first guest — an acceptable resting state.

**Files:** Create `Pommora/src/main/webGuests.ts`. Modify `src/main/index.ts` — `webviewTag: true` in the window's `webPreferences` (sandbox/contextIsolation/nodeIntegration untouched); install the module at window creation. Modify `src/shared/bridge.ts` — one push channel `web:popup` (url: string). Modify `src/preload/index.ts` — the `onWebPopup` subscriber. Shared constant `WEB_PARTITION = 'persist:pommora-web'` in `src/shared/types.ts`.

**Interfaces**
- Produces: `installWebGuests(win)` — hooks `will-attach-webview` (strip any preload, force `partition: WEB_PARTITION`, set `params.allowpopups` — **popups are disabled by default in Electron and without this the guest's `window.open` dies inside Blink before `setWindowOpenHandler` is ever consulted**, deadening the whole F-3 story; deny `nodeintegration`/`webpreferences` overrides) and `web-contents-created` (for guest webContents: `setWindowOpenHandler` → push the URL over `web:popup` and deny; apply the current host zoom factor; `will-navigate` hardening is NOT applied to guests — guests navigate freely).
- Produces: `syncGuestZoom(factor)`, called from `applyDefaultZoom` — the **single** `setZoomFactor` owner, whose three callers are `ready-to-show`, `did-finish-load`, and the nexus switch (`adoptNexusInner`). ⌘+/⌘− are currently native `{role: 'zoomIn'/'zoomOut'}` items (`menu.ts:130-131`) that Chromium handles internally with **no JS callback to hook** — this task de-roles them into custom `click` items mirroring ⌘0's shape (zoom via `setZoomFactor` + `syncGuestZoom`), or guest zoom silently diverges on the first ⌘+.
- Step check: after install, verify in the dev harness that a webview attached with no `partition` attribute still lands on `WEB_PARTITION` (`guest.session === session.fromPartition(WEB_PARTITION)`) — the `will-attach-webview` override timing for `persist:` partitions is the one unverified Electron behavior here; if it fails, the fallback is passing the partition attribute at every surface (they all default to the shared constant anyway).
- Produces: the partition's UA treatment at install — Ferdium's surgical recipe: a UA with the `Electron/x` and app tokens stripped session-wide, plus the Chrome-version-suffix strip scoped to `accounts.google.com`, applied post-navigation. Best-effort by decision; never touches the default session.
- Assumed by: Tasks 7 (tile webview), 14 (browser), 16 (Accounts session access), 18 (hover card).

**Failure half:** a `will-attach-webview` with a hostile `src` (`file:`, `javascript:`) — the attach is denied outright (`event.preventDefault()`); the renderer's own scheme gate (Task 6) makes this unreachable from app code, so this is the trust-boundary backstop, tested by unit where separable and asserted in review otherwise.

**Steps:**
- [ ] Write the module; wire install + the channel; typecheck green (main changes need a dev-process restart to observe).
- [ ] Extend the clipping spike's harness (scratchpad) to point at the dev build's window: attach a webview from devtools, confirm the forced partition and the denied preload via `will-attach-webview` logging; confirm a guest `window.open` arrives on `web:popup` and no OS window appears.
- [ ] Gates green. Commit: `feat(main): the web-guest lifecycle module and the pommora-web partition`

#### Gate 2 — guests are governed before any ships
- [ ] Gates green. Review + simplification against the range. Concerns fixed or ruled.
- [ ] The spike-harness observations recorded in the Log (partition forced, preload stripped, popup pushed, zoom synced).

---

### Phase 3 — The Webpage Tile

#### Task 5: The webpage grammar — detection half

**Requirement:** 3

**Why:** One grammar must serve the detector, the guard (Task 3's module — same file, extended), the claim, and every writer, or two readers will disagree about the same line (the must-agree failure class). Pure logic, TDD.

**Files:** Extend `Pommora/src/shared/webpageEmbed.ts` + its test.

**Interfaces**
- Produces: `loneWebpageEmbed(lineText: string): { label: string; url: string } | null` — matches `^!\[label?\](url?)$` with trailing whitespace tolerance, escape-aware label (`\]`), balanced-paren-capped URL, then gates: non-empty URL, explicit `^https?://` scheme, `isValidLink` true. Empty label admitted; `file:`/`javascript:`/schemeless/mailto → null.
- Produces: `composeWebpageEmbedLine(label: string, url: string): string` — `` `![${escapeAlias(label)}](${url})` `` — the ONLY assembly path any writer uses (B-3's payload rule; `serializeLink` is banned for embed lines).
- **Must agree:** `loneWebpageEmbed(composeWebpageEmbedLine(l, u))` round-trips for every label the fetch layer can produce — one property-style test crosses the pair, brackets and backslashes included.
- Assumed by: Tasks 6, 8, 9, 10, 11, 13.

**Failure half:** label with unescaped `]` → null (and the compose half proves escaping prevents ever producing that line) · URL with unbalanced `(` → null · the degenerate `![]()` → null (empty URL) · indented line → null (list continuation, mirroring `loneEmbedRe`'s anchor).

**Steps:**
- [ ] Failing tests across the matrix above plus F-1's scheme table; implement; green; gates green.
- [ ] Commit: `feat(shared): the lone-line webpage-embed grammar`

#### Task 6: Detection, the kind-aware claim, and the formation gate

**Requirement:** 3

**Why:** Webpage lines must enter the **one** claim owner (Editor-Internals) with a URL key (labels collide by construction under Short Link), and claims must form only off-caret (`isValidLink` passes typed prefixes). The formation gate is the spec's most-reviewed mechanism; its triggers are doc change, mount, and selection-departure — the predicate ("selection not on the line") is what protects typing, the triggers are what reach lines the selection never visited.

**Files:** Modify `Pommora/src/renderer/src/MarkdownPM/detect/index.ts` (webpage lines join the per-doc scan beside `blockEmbedLines`, same exclusions), `editor/embedRanges.ts` (`claimedEmbeds` gains the kind-aware key: page claims key on normalized title with first-occurrence, webpage claims key on the URL with no dedupe), `editor/embedWidget.tsx` — three named owners inside it:
- the tile field carries webpage ranges; a claimed-set member survives regardless of selection once formed; `editAffectsEmbeds` extended so a doc change touching a candidate rebuilds;
- **`embedGuard` goes kind-aware**: its fence/gluing check (`loneEmbedTitle(line.text) !== r.title`) and its gone-whole test (`` line.text.includes(`![[${r.title}]]`) ``) are `![[…]]`-literal — for a webpage range both branches `continue` and a boundary-seat insertion un-forms the tile unrepaired, where a page tile gets `boundaryRepair`. Both tests branch on `r.kind`, reading Task 5's grammar and `composeWebpageEmbedLine`, so webpage tiles earn the same repair;
- **a new ViewPlugin owns the impure half** (the `sweepOnTitles` shape — a StateField cannot dispatch): it fires the formation check's selection-departure trigger and carries Task 8's fill dispatch. The field stays pure; the plugin is the dispatcher.
Tests: extend the embed-widget flow tests with webpage cases.

**Interfaces**
- Produces: `TileRange` becomes a **discriminated union** — `{ kind: 'page'; title } | { kind: 'webpage'; url; label }` — so every `t.title` reader is a compile error the executor must handle, not a silent leak.
- **Must agree:** `embedExclusions` (feeding the `![[` autocomplete pool and the grip pick tree via `embeddable`) admits **page ranges only** — a webpage label entering it would delete any identically-titled Page from both surfaces (Short Link and Page Title labels collide with real page names by construction). One test: a webpage tile labeled like an existing Page leaves that Page pickable.
- Assumed by: Tasks 7, 8, 10, 11 and the grip path.

**Failure half:** a multi-line paste containing a valid webpage line away from the landing caret → forms on that doc change · undo restoring a tile line → reforms · mount with caret at 0 over an existing tile line → forms · the selection sitting on a valid line → stays raw until departure · two tiles, same URL → both claim.

**Must agree:** the guard, the atomic ranges, the grip's block resolution, and token suppression all read the claimed set — one test asserts a claimed webpage line is guard-protected and grip-resolvable exactly as a page tile is.

**Steps:**
- [ ] Failing tests for the trigger/predicate matrix; implement scan + key + gate; green.
- [ ] Gates green. Commit: `feat(editor): webpage lines claim through the shared embed owner`

#### Task 7: The WebpageEmbed payload — a live tile at full visibility

**Requirement:** 4

**Why:** The visible half. This task ships the *simple* correct lifecycle — webview attached only while the tile is fully visible in its depth-0 scrollport, detached (destroyed) otherwise with a loading face — bleed-free by construction. Task 10 upgrades detach to hide-with-retention; building simple-first keeps each step verifiable.

**Files:** Create `Pommora/src/renderer/src/Embeds/WebpageEmbed.tsx` (+ styles in `Embeds/embeds.css`). Modify `editor/embedWidget.tsx` — `EmbedTileWidget` renders the payload by `kind`; `estimatedHeight` returns the fit-capped value. The chassis, fencing, resize handle, and grip seat are inherited untouched.

**Interfaces**
- Produces: `WebpageEmbed({ url, label, height, partition = WEB_PARTITION })` — the partition is a prop with the shared default on every webview surface (the per-account-partitions don't-foreclose: swapping partitions later is a prop, not a sweep). Renders the chassis body: the `<webview>` (`display:flex`, no preload attribute) when fully visible **at ancestor depth 0 — `state.facet(EmbedHost).ancestors.length > 0` renders the static face unconditionally**, since nested editors (a page-embed's body at depth 1, the hover card's page render) are themselves scrollable surfaces whose inner "fully visible" reading reproduces the spike's bleed against the outer clip (F-5b's second half); the loading face while attached-but-loading or detached; the failure face on `did-fail-load` (quiet, token-styled, no meta text — F-6). One `IntersectionObserver` per editor scroller (threshold 1, small negative margin as pre-arm hysteresis) and one `ResizeObserver` on the scroller re-evaluating the F-5d fit cap — both shared across tiles, transitions only, per the no-per-scroll-work rule. The component stays editor-agnostic (the dashboard-tile don't-foreclose): it receives its visibility and outside-click signals as props/hooks; nothing in it imports CodeMirror.
- Assumed by: Task 10 (engagement/retention), Task 15 (browser reuses the webview conventions, not the component), Task 18 (hover flavor).

**Failure half:** dead URL/offline → failure face, tile and document unharmed · a guest crash (`render-process-gone`) → failure face, re-attach on next visibility transition · zero-height scrollport (window mid-resize) → cap floors at `TILE_MIN_PX`.

**Steps:**
- [ ] Build; typecheck/lint green. ⌘R the dev app; on a throwaway page type a URL line, leave it: tile forms, site renders, rounded corners clip.
- [ ] Scroll the tile past the edge: face swaps at the boundary, no guest paint outside the chassis (the spike's failure case) — screenshot both states for Nathan (design stop: loading/failure faces disclosed here).
- [ ] Drag the bottom edge: height persists (host→URL rides the existing `embedHeights` blob mechanics — value-validated, keys free); relaunch: height restored, capped to the scrollport.
- [ ] Gates green. Commit: `feat(embeds): the webpage tile renders live at full visibility`

#### Task 8: Labels — the formation one-shot and the Page Title swap

**Requirement:** 7

**Why:** An empty-label tile must gain its label once, honestly undoable, and Page Title must land without destroying the tile — the exact failure surface three review rounds circled. All writes compose through Task 5's one assembly path.

**Files:** Modify `editor/embedWidget.tsx` — **Task 6's ViewPlugin is the dispatcher** (a StateField cannot dispatch): it reads freshly-formed empty-label webpage ranges out of the field and dispatches the fill as its own transaction with a retiring effect, PendingTitle's discipline. Modify `editor/PendingTitle.ts` (a webpage-line anchor swaps by whole-line `composeWebpageEmbedLine`, never `linkMarkdown`), the formation path (Page Title mode: fill with `linkDomain` placeholder, arm the deferred fetch through the existing `linkTitles` store path). Tests: fill-once/undo-honest, swap-preserves-tile, bracket-title escape survives the round trip.

**Must agree:** after any fill or swap, `loneWebpageEmbed` still matches the line and the claim key (URL) is unchanged — one test crosses writer and detector.

**Failure half:** fetch never lands → domain label stands (the cache never stores empty titles — nothing loops) · user edits the label via the raw pre-claim line then leaves → their label stands, no fill (the one-shot keys to formation of an *empty-labeled* claim only).

**Steps:**
- [ ] Failing tests; implement; green; gates green.
- [ ] Dev app: embed with each of the three formats; Page Title shows domain then swaps in place, tile persists; ⌘Z peels the fill as a real edit.
- [ ] Commit: `feat(embeds): webpage labels fill once and swap whole`

#### Task 9: The Embed ▸ Webpage door

**Requirement:** 3 (door), 1 (completes the menu)

**Why:** Deferred from Task 1 so the item never produced dead syntax. Mirrors `embedInsertAtCaret`: fenced insert, caret seated inside `()`.

**Files:** Modify `Pommora/src/main/editorMenu.ts` (Embed ▸ gains **Webpage**, action `block:webpage`), `renderer/src/MarkdownPM/editor/menu.ts` (route it), `editor/embedInsert.ts` (a sibling that types `![]()`, caret between the parens). Test: the insert helper's coordinates.

**Steps:**
- [ ] Failing coordinate test; implement; green.
- [ ] Dev app (menu = main change → restart): Embed ▸ Webpage types the pair; ⌘V of a URL lands literal inside the parens (Task 3's guard, live); caret-leave forms the tile.
- [ ] Gates green. Rewrite the MarkdownPM Pending image-seam sentence + the ConnectionsPM lone-line sentence (Made False rows 4–5) in this commit — the syntax's meaning changes here.
- [ ] Commit: `feat(menu): Embed ▸ Webpage types the empty embed and seats the target`

#### Gate 3 — a URL line is a live tile
- [ ] Gates green; derivations/controls re-run; review + simplification on the range; concerns fixed or ruled.
- [ ] Seen running: form, faces, height, labels, door — screenshots shown (design stop for the faces recorded as Nathan-approved or amended).
- [ ] Plan re-assessed; Progress hashes filled.

---

### Phase 4 — Engagement & Retention

#### Task 10: Click-in engagement, hidden retention, and the guest cap

**Requirement:** 5

**Why:** A live guest steals scroll and keys; page-embed law (click-in to interact, click-out to leave) transfers by explicit mechanism, not inheritance — `ignoreEvent` defaults true and host click paths don't exist inside a guest. The spike proved hidden guests keep state, so the visibility swap upgrades from destroy (Task 7) to hide, bounded by an LRV cap.

**Files:** Modify `Embeds/WebpageEmbed.tsx` — engagement lives in a **`useEngagement` hook owned by the component, with the outside-click source injected as a prop** (the editor host passes its outside-pointerdown seam; a future dashboard host passes its own — the standalone-component don't-foreclose): inert state (`pointer-events:none` on the webview + a transparent click-catcher that engages); engaged state (catcher gone, guest interactive); click-out disengages; disengage-and-swap on clip transition (F-5). Engagement state is the component's, never a second writer into `embedField.editing` (that field is the page-embed edit path). The detach path becomes `visibility`-hide with a module-level LRV registry — visible tiles always live, hidden retainees capped (start `KNOB`-marked at 5), evicted guests fall back to the loading face and reload on re-visibility.

**Failure half:** eviction while the site held half-typed input → that state is lost by design *only* at the cap's edge, never on a plain scroll — the ordering (visible > hidden-recent > evicted) is the test's subject · engagement requested while the guest is mid-load → catcher stays until `did-finish-load`.

**Negative control:** with the catcher disabled, a wheel over an inert tile scrolls the guest (red); with it enabled, the document scrolls (green) — both halves observed in the dev app and recorded.

**Steps:**
- [ ] Implement; gates green. Dev app: wheel over inert tile scrolls the document; click engages (guest scroll/typing work); click-out disengages; scrolling an engaged tile to the edge disengages and swaps; scrolling back shows the same guest state (retention proven); >cap tiles evict oldest.
- [ ] Two build-phase checks land here, not at Task 18: **focus return** — engage, click into a site's text box, scroll the tile away, type: keystrokes must land in the document, not a hidden guest (if focus sticks, the disengage path explicitly refocuses the editor); **mousemove starvation** — with the pointer resting on an engaged guest, host hover lifecycles must still run (informs Task 18's overlay). Record both in the Log.
- [ ] Commit: `feat(embeds): tiles engage on click and retain hidden guests under a cap`

#### Task 11: The hover-title and the grip's Edit Link arm

**Requirement:** 6, 8

**Why:** The two remaining tile affordances. The hover-title is a new small component (EmbedCrumbs is page-id-bound); the grip arm is the first grip action that opens renderer UI after the native menu returns, so the action union widens.

**Files:** Create the hover-title inside `Embeds/WebpageEmbed.tsx` + `embeds.css` (the page-crumb's reveal treatment, pointer-enabled, z-order above the webview and the click-catcher). Modify `src/shared/gripMenu.ts` (`GripMenuContext` gains the webpage kind; `GripMenuAction` gains `{ action: 'editLink' }`), `src/main/gripMenu.ts` (webpage arm: **Edit Link** above Delete), `renderer/.../editor/gripMenu.ts` (webpage context; `editLink` answer opens a `TextPicker` anchored at the tile seeded with the URL; commit = whole-block-span replace via `composeWebpageEmbedLine` with a fresh default-format label + height-key migration old→new URL). The webpage line class joins the one grip-bearing line-class list.

**Failure half:** TextPicker commit with an invalid URL → no dispatch, picker's ghost cue (existing `isValidLink` validation pattern) · re-aim to the same URL → no-op, no height churn.

**Steps:**
- [ ] Implement; gates green. Dev app: hover reveals the title, click opens per the knob (system browser until Phase 5 lands the knob — the call site routes through the existing `openExternal` until then, noted as the resting state); grip → Edit Link → new URL re-aims in place, label refills, height survives; Delete removes whole.
- [ ] Screenshot title + picker for Nathan (design stop).
- [ ] Commit: `feat(embeds): the clickable hover-title and the grip's Edit Link arm`

#### Gate 4 — the tile behaves like Pommora
- [ ] Gates green; review + simplification on the range; concerns fixed or ruled; negative-control observations in the Log.
- [ ] Full tile interaction sweep seen running (engage/disengage/retention/title/grip); screenshots shown.

---

### Phase 5 — Link Opening & the In-App Browser

#### Task 12: The open-in knob

**Requirement:** 9 (knob half)

**Why:** The preference must exist before the browser has a reason to open. One key, one coercion, one row, and the branch at the three renderer call sites — the renderer is the single adjudicator (main's popup push defers to it).

**Files:** Modify `src/shared/types.ts` (`openLinksInApp?: boolean` on `Personalization` — exact key naming per existing conventions), `src/main/readNexus.ts` (coercion line), `Settings/NexusSettings.tsx` (Files & Links row, switch control, default off = system browser), and the **four** call sites: `MarkdownPM/editor/links.ts` (~:120), `Detail/Views/Table/LinkCell.tsx` (~:54), `Detail/Views/Table/TableView.tsx` (~:738), and `Embeds/WebpageEmbed.tsx` (the hover-title, which Task 11 wired to `openExternal` as its stated resting state — this task migrates it) — each branches to a shared `openWebLink(url)` helper (renderer-side, one owner) that either calls `openExternal` or summons the browser (Task 14's entry; until it lands, the helper routes external regardless — stated resting state).

**Steps:**
- [ ] Implement key/row/helper; gates green. Rewrite ConfigurationPM (Made False row 6a) in this commit.
- [ ] Commit: `feat(links): the open-in preference and its one renderer adjudicator`

#### Task 13: Guest popups route through the knob

**Requirement:** 10 (completes F-3)

**Why:** Phase 2 pushes `web:popup`; nothing listens yet. The listener is the same `openWebLink` owner, so popups and link clicks can never disagree.

**Files:** Modify the renderer app root (subscribe `onWebPopup` → `openWebLink`), `preload` already carries the subscriber from Task 4.

**Steps:**
- [ ] Implement; gates green. Dev app: a guest `window.open` (any site's target=_blank link) opens per the knob; no OS popup ever.
- [ ] Commit: `feat(links): guest popups defer to the renderer's open-in branch`

#### Task 14: The PreviewPane browser flavor

**Requirement:** 9 (browser half)

**Why:** The in-app destination. A flavor of the existing floating window: the body is one webview owning its whole region (no clipping constraint), the toolbar drops the promote glyph for back/forward, and the centered title is the escalating link.

**Files:** Create `Pommora/src/renderer/src/PagePreview/BrowserWindow.tsx` (working name; follow PascalCase + the PagePreview module's conventions) mounting the PreviewPane chassis: band toolbar, left cluster = back/forward glyphs (registry: pull the pair into `design-system/symbols` — SymbolsPM rides this commit), right cluster = ×; no inspector, no footer, no tab strip in V1. Body: the webview on the shared partition (guest module governs it). Title: centered two-tone, live from the guest's `page-title-updated`/navigation events, click → `openExternal(currentURL)`. Back/forward drive `webview.goBack/goForward`, enabled state from `canGoBack/canGoForward` on navigation events (event-driven, no polling). The module exports **`openInAppBrowser(url)` as the direct entry**; `openWebLink` is one caller of it, and Task 16's Add Account is another — a knob-independent summon, since Accounts must open in-app regardless of the preference or the sign-in cookie lands in the wrong browser (singleton like the page preview; a new summon retakes the window). Window geometry persists per the PreviewPane's own per-window-id mechanics. The chrome also carries the **Add Account completion affordance** Task 16 consumes (shown only when summoned by that flow) — it lives in this file, so this task's Files own it even though Task 16 wires it.

**Failure half:** navigation to a dead page → the guest shows its own error surface (a browser browses; no app-level face) · the window closed mid-load → guest torn down with it.

**Steps:**
- [ ] Build; gates green. Design stop: screenshot the chrome for Nathan before polishing further (the layout is his C-2 spec; the exact glyph/spacing render needs his eyes).
- [ ] Dev app: knob on → editor link click opens the browser; back/forward truthful; title tracks navigation; title click opens the system browser at the current page; tile hover-titles honor the knob (Task 11's route now completes).
- [ ] Check the C-2 build-phase item: drag the window while a page renders — record the repaint behavior in the Log.
- [ ] Rewrite PagePreviewPM + SymbolsPM (Made False rows 7, 9) in this commit.
- [ ] Commit: `feat(preview): the in-app browser flavor of the floating window`

#### Gate 5 — links open where Nathan says
- [ ] Gates green; review + simplification on the range; concerns fixed or ruled.
- [ ] The knob's both settings exercised across all **four** call sites (editor link, table cell, table view, tile hover-title) + a guest popup; browser seen running; screenshots shown.

---

### Phase 6 — Accounts

#### Task 15: Session IPC — accounts records, sign-out, clear

**Requirement:** 12 (plumbing)

**Why:** The renderer may never touch the session; main exposes exactly the three verbs the section needs. Account rows are *recorded at Add Account completion* (the cookie store can't distinguish signed-in from visited), stored device-locally in `nexus.db` beside the other machine-scoped records.

**Files:** Modify `src/main/webGuests.ts` (or a sibling `src/main/webAccounts.ts` if it reads cleaner — one owner either way): `webAccounts:list` (recorded rows), `webAccounts:add` (record a row: domain + display name derived from the sign-in URL), `webAccounts:signOut` (delete the row + `clearStorageData({ origin })` — full storage, not cookies), `webAccounts:clearBrowsing` — **semantics are Nathan's call, presented at approval:** the ratified D-1a sentence says the affordance covers "the rest of the store," i.e. account rows and their sessions survive, which means enumerating the partition's origins and clearing the non-account ones; the alternative (partition-wide wipe, rows removed too) is simpler but reverses the ratified sentence. The plan defaults to the ratified reading pending the ruling. Bridge entries + preload for each; `db/localState.ts` gains the `webAccounts` scope.

**Failure half:** sign-out for an origin with no stored data → succeeds, row still removed · a `clearStorageData` rejection → the `Result` envelope carries the error; the row is not removed (no half-state).

**Steps:**
- [ ] Implement channels + scope; unit-test the record shape round-trip; gates green.
- [ ] Commit: `feat(main): web-account records and session clearing over the bridge`

#### Task 16: The General ▸ Accounts section

**Requirement:** 12 (surface)

**Why:** The user-facing half. **Hard design stop first:** the section's rows, the Add Account presentation, and its glyphs are undesigned — disclose a concrete proposal to Nathan (rows, controls, copy) and get his yes *before* building; D-1a pins mechanism only.

**Files:** Modify `Settings/NexusSettings.tsx` — the `general` leaf gains an Accounts `Section`: an Add Account action calling **Task 14's `openInAppBrowser` directly** (knob-independent — a default install must not route sign-in to Safari, where the cookie misses the partition), the flow recording its row on completion via `webAccounts:add` through the browser's completion affordance (Task 14's chrome owns it; this task wires it), the recorded rows with per-row Sign Out, and Clear Browsing Data. Controls compose from existing settings primitives; no new row kinds unless the ratified design demands one.

**Steps:**
- [ ] Present the design; on Nathan's yes, build; gates green.
- [ ] Dev app: add an account (sign into a real site through the flow); relaunch — a tile of that site is signed in; Sign Out — a reopened tile is logged out; the row is gone.
- [ ] Rewrite ConfigurationPM (Made False row 6b) in this commit.
- [ ] Commit: `feat(settings): the General Accounts section manages web sessions`

#### Gate 6 — one sign-in, everywhere, until revoked
- [ ] Gates green; review + simplification; concerns fixed or ruled.
- [ ] The acceptance chain's auth leg exercised end-to-end and recorded (sign in → second tile → relaunch → sign out → logged out) — **with the open-in knob explicitly set to its default (system) first**, proving Add Account is knob-independent rather than passing on a knob left flipped from Phase 5.

---

### Phase 7 — Website Hover Previews

#### Task 17: Widen the arming gates

**Requirement:** 13

**Why:** Two gates, both required — the cheap class gate (`.md-connection-resolved`) returns before the kind branch, and external links wear `.md-link`; widening only one ships a hover that never fires (E-2, verified).

**Files:** Modify `MarkdownPM/editor/links.ts` — the selector admits `.md-link`; the kind branch routes `website` targets to the website hover entry (Task 18) with the same dwell; page targets unchanged.

**Must agree:** the class the decorator assigns and the class the gate reads — one test pins both to the same constant so they can't drift.

**Steps:**
- [ ] Failing test on the gate pair; implement; green; gates green.
- [ ] Commit: `feat(editor): website links arm the hover intent`

#### Task 18: The hover card's website flavor

**Requirement:** 13

**Why:** Live, inert, resolve-before-open: a webview can't load unattached, so the card's website mode mounts the guest hidden and blooms on `did-finish-load` — preserving "a page that can't load opens nothing." Non-interactive by decision (pointer-inert overlay; no engagement path).

**Files:** Modify `Embeds/ConnectionHoverCard.tsx` — a `website` mode beside the page mode: hidden pre-mount of the webview (partition, no preload), bloom on load-complete, drop on failure/timeout (the linkTitles 6s convention), inert overlay, the card's existing anchor/track/leave/resize lifecycle untouched. The E-1/H check: verify the card's mousemove-driven leave lifecycle still fires while the pointer rests on the (inert) webview — the overlay carrying the pointer events is what makes this work; record the observation.

**Failure half:** load failure or timeout → nothing opens (contract) · a second hover retarget mid-load → the pending guest is dropped, the new one mounts (the card's existing supersession token pattern).

**Steps:**
- [ ] Implement; gates green. Dev app: hover a website link — card blooms only after load, content scrolls-with-card-not-guest (inert), leave/linger behave as page cards do.
- [ ] Rewrite PagePreviewPM §Hover Card (Made False row 8) in this commit.
- [ ] Commit: `feat(embeds): the hover card renders websites live and inert`

#### Gate 7 — hover shows the web
- [ ] Gates green; review + simplification; concerns fixed or ruled; the mousemove/leave observation in the Log.

---

### Closeout

- [ ] Delivery Claim written: each of the 13 requirements traced to landed tasks; the acceptance criterion observed in the running app; no new dependency; no duplicated mechanism (one grammar, one claim owner, one open-link adjudicator, one assembly path); nothing on a high-frequency trigger.
- [ ] Neutral verifier (general-purpose): claim vs **the decision log** and the full commit range — "is this true?"
- [ ] Then the attack pass (`build-breaking-agent`) against the shipped range — separate dispatch.
- [ ] Nathan's walkthrough of every user-visible surface (the deferred-UIX convention): menu, tile lifecycle, engagement, grip, browser, knob, Accounts, hover previews.
- [ ] Dead-vocabulary sweep against its control; Made False table audited row by row.
- [ ] Lessons routed to `.claude/Guidelines`; History entry drafted per the History format; the spec's H-section build checks all carry recorded observations.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — Menu & Built-In Formatting · base ``
  - [ ] Task 1 — Menu reorder · ``
  - [ ] Task 2 — Auto-format built-in · ``
  - [ ] Task 3 — Destination guard · ``
- [ ] **Phase 2** — Main-Process Web Foundation · base ``
  - [ ] Task 4 — Guest lifecycle + partition · ``
- [ ] **Phase 3** — The Webpage Tile · base ``
  - [ ] Task 5 — The grammar · ``
  - [ ] Task 6 — Detection, claim, formation gate · ``
  - [ ] Task 7 — The live tile · ``
  - [ ] Task 8 — Labels · ``
  - [ ] Task 9 — The Webpage door · ``
- [ ] **Phase 4** — Engagement & Retention · base ``
  - [ ] Task 10 — Engagement + retention cap · ``
  - [ ] Task 11 — Hover-title + Edit Link arm · ``
- [ ] **Phase 5** — Link Opening & Browser · base ``
  - [ ] Task 12 — The open-in knob · ``
  - [ ] Task 13 — Popup routing · ``
  - [ ] Task 14 — The browser flavor · ``
- [ ] **Phase 6** — Accounts · base ``
  - [ ] Task 15 — Session IPC · ``
  - [ ] Task 16 — The Accounts section · ``
- [ ] **Phase 7** — Hover Previews · base ``
  - [ ] Task 17 — Arming gates · ``
  - [ ] Task 18 — Website hover card · ``

### Rulings
### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- Session Roaming (passphrase-encrypted cookie vault) — the spec's committed follow-up cycle.
- Dashboard `webpage` BlockEntry · per-account partitions · image rendering via the wiki-embed form · hover/off-screen snapshot warm-cache — spec Prospects.
### Closeout
