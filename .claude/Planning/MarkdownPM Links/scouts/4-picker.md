## Scout 4 — The `[[` Picker, Heading Lists, and Alias Memory

Read-only. "Verified" = read in source; "inferred" = follows from reading, not run. In-flight files (`Links/*`, `decorations.ts`, `Engine/tokens.ts`, `Engine/detect.ts`, `Input/format.ts`) are cited by function name.

### 1. Surface Map

| File | Lines | Rule(s) it owns | Read by | Why separate |
|---|---|---|---|---|
| `Autocomplete/autocomplete.ts` | 284 | `autocompleteQuery` (caret → form/query/spans), `ConnectionForm` union, row builders (`pageRow`, `headingRows`, `openHeadingRows`, `aliasRows`), commit spelling (`formSyntax` → `connectionInsert` → `commitEdit`), `AC_MAX` | `useConnectionAutocomplete.ts:4-15`, `AutocompletePane.tsx:26` | Pure half of the picker (testable without React) |
| `Autocomplete/useConnectionAutocomplete.ts` | 273 | The picker's lifecycle: query listener, `§` arming (`sectionArmAfter`), heading target/fetch, candidates, commit, aside/back | `MarkdownEditor.tsx:127`, `Tables/CellEditor.tsx:136`, `Properties/Pickers/TextPane.tsx:100` | React owner of the pane state |
| `Autocomplete/AutocompletePane.tsx` | 215 | Row rendering, heading tree, FrameSlide root/detail | same three mounts (`:298`, `:288`, `:180`) | View |
| `Autocomplete/headingTarget.ts` | 28 | Warm/cold heading source (`headingTargetOf`, `pageHeadingTarget`) | `useConnectionAutocomplete.ts:24,97,100` only | Nothing earns the separation; two callers, one file |
| `Links/headingHash.ts` | 35 | Typing `§` inside a link's title/destination writes `#` | `Input/markdownInput.ts:43,247,254` | A typing transform living in `Links/`; every sibling transform is in `Input/edits.ts` |
| `Connections/connections.ts` | 109 | Wikilink grammar (`pageLinkPattern`, `linkSpans`, `linkAt`), slot wrappers (`aliasSpanAt`, `emptyAliasPipeAt`, `emptyHeadingHashAt`), `connectionText`, `expressibleHeading`, `pageEmbedText` | 9 readers in §2.1; `connectionText` by 8 production sites | Shared grammar both processes read |
| `Connections/aliasMemory.ts` | 9 | MRU insert / remove on a string list | `Pages/editorHost.tsx:23,62-63` | Pure helpers for the host |
| `Links/linkEdit.ts` (in-flight) | 172 | `commitAliasOnEnter`, `rememberAliasNear`, `slotNear`, `leaveSlot`, `aliasOnLeave`, `typedInto` (+ `wikiAuthorTarget`/`applyLinkAction`) | `markdownInput.ts:42,271`; `surface.ts:20,55` | Slot-leave and alias-memory writer |
| `Links/linkReveal.ts` (in-flight) | 26 | `linkRest`, `linkTyping` | `decorations.ts` (`build`), `surface.ts:56-57` | Reveal state |
| `Input/edits.ts` (slices) | 808 total | `inAliasAt` :323-327, `isInsideWikilink` :601-616, `inBracket` :635-639, `isLiteralAt` :627-632 | `markdownInput.ts:249`, `autocomplete.ts:12,61`, `useConnectionAutocomplete.ts:22,268` | Typing guards |
| Host seam | — | `EditorHost.aliases` (`api.ts:162-167`), `warmBody`/`fetchBody` (`api.ts:191-193`) built at `Pages/editorHost.tsx:46-68,139-143` | picker + `rememberAliasNear` | MarkdownPM can't reach the store |

### 2. Duplicated or Parallel Rules

**2.1 "Where is the caret inside a connection" — nine readers, four grammars (verified).**

| Reader | Grammar | Code gate | Raw-HTML gate | Empty slot visible? |
|---|---|---|---|---|
| `autocompleteQuery` (`autocomplete.ts:72-94`) | `linkAt` (closed `]]` only) | `inCodeAt(caret)` :50 | no | yes |
| `slotNear` (linkEdit) | `aliasSpanAt` then `linkAt` again — two regex passes | `inCodeAt` | no | yes |
| `commitAliasOnEnter` (linkEdit) | `linkAt` then `aliasSpanAt` — two passes | `inCodeAt` | **yes** (`htmlFormatting && spanAt(scan.html, …)`) | yes |
| `rememberAliasNear` (linkEdit) | `linkAt` (third pass on leave, after `emptyAliasPipeAt`'s) | via `slotNear` upstream | no | n/a |
| `inAliasAt` (`edits.ts:323`) | `aliasSpanAt` → `linkAt` | `inCodeAt` | no | yes |
| `titleSpanAt` (`headingHash.ts:7-12`) | `linkAt` + hand sniff for a just-opened `[[` followed by `|` or `]]` | `inCodeAt(sel)`, `inCodeAt(sel-1)` :21 | no | yes |
| `linkTyping` (linkReveal) | `linkAt` | **none** | no | yes |
| commit's worn alias (`useConnectionAutocomplete.ts:166-169`) | raw `pageLinkPattern().exec(slice).groups.alias` | n/a | n/a | — |
| `isInsideWikilink` (`edits.ts:601-616`) | bracket-depth counter; counts **unclosed** `[[` and `![[` | via `isLiteralAt` | no | — |

Per keystroke, three listeners each run `pageLinkPattern` over the caret's line: `linkTyping` once, the picker's listener once (plus `markdownDestinationAt` and the `![[` loop), and `aliasOnLeave` twice through `slotNear` — up to four more passes on a leave (`emptyAliasPipeAt`/`emptyHeadingHashAt`, `rememberAliasNear`). Line-scoped, so no rule is broken; it's the concrete case for one reader per update.

Plus `inBracket` (`edits.ts:635`, any unclosed `[`) used by `sectionSign`, `bullet`, the `§` arm (`useConnectionAutocomplete.ts:268`) and re-checked in `autocompleteQuery:61`; and the embed branch's own `indexOf('![[')` loop (`autocomplete.ts:121-133`).

How they disagree:
- **Raw HTML:** only `commitAliasOnEnter` refuses an HTML block that HTML Formatting draws raw — the same rule `decorations.ts` `build` applies by dropping `tk.inHtml` tokens. In that block the picker still opens, `]` is still refused in an alias, empty slots still collapse on leave, and aliases still get remembered (inferred from the missing gate).
- **Code:** the tokenizer (`wikiLinkTokens`) gates on the link's opener `inCode(s.full[0])`; every editor reader gates on the caret position; `headingHash` and `pasteLink`'s `literalAt` additionally check `pos-1`. `linkTyping` has no gate (harmless today because no `wikiLink` token exists in code for it to color — inferred).
- **Unclosed `[[`:** `isInsideWikilink` says the caret is in a connection; `linkAt` says it isn't. With **Pair Brackets** off, `autoPair` returns `null` (`edits.ts:342`), `[[Foo` never gets `]]`, `pageLinkPattern` requires `]]` (`connections.ts:8`), so `autocompleteQuery` returns `null` — the `[[` picker never opens unless the user types the closer by hand (verified by reading; not run). The markdown-link branch solves the same "mid-authoring" problem with `emptyTolerantLinkRegex` (`links.ts:16`), and the embed branch with its `indexOf` loop — three different answers to one question.
- **Slot classification** (title vs heading vs alias) is decided four times: `autocompleteQuery:76-93`, `slotNear`, `titleSpanAt`, `commitAliasOnEnter`/`inAliasAt` via `aliasSpanAt`. `aliasSpanAt` (`connections.ts:50`), `emptyAliasPipeAt` (:55), `emptyHeadingHashAt` (:61) each re-run `linkAt` to read one field of the same `LinkSpans`.

**2.2 Link syntax spelled by hand (verified).**
- `formSyntax` 'link' (`autocomplete.ts:210`) writes `[[v|a]]` beside `connectionText` (`connections.ts:89-96`), which drops an alias equal to the target or containing `]`/newline — F-035.
- Slot openers: `[[v#]]` (`autocomplete.ts:238`), `[[v|]]` (:247), `v|` (:256), `encode(v)#` (:271), plus the Add-Title pipe in `wikiAuthorTarget` (linkEdit). Slot closers: `leaveSlot`/`collapseAt` (linkEdit). Opening lives in two files, closing in a third reader.
- Caret arithmetic tied to syntax length: `ac.from + text.length - 2` (:241, :250), `caret + 2` (:268), `caret + label.length + 1` (:276).
- Embed with a heading is spelled by hand in `rewrite.ts:48` (`![[${newTitle}#${heading}]]`) because `pageEmbedText` takes no heading; the picker's embed commit (`formSyntax` 'embed') replaces the whole `![[…]]` and drops a typed `#heading` (inferred).

**2.3 "Which headings does page X have" — two sources (verified).**
- Picker: `warmBody` (store slot, lags typing ~120 ms — F-041) or `fetchBody` (disk), then `headingOutline` (raw text + level).
- Drawing a missing heading: `ConnectionsApi.headingsOf(path)` (`Session/pageConnections.ts:31`) from the index's normalized keys (`indexSeed.ts:73`), read by `headingMissing` (`connectionsApi.ts`) and by `decorations.ts`'s held-page branch (`own.kind === 'held' ? conn?.headingsOf?.(own.page.path)`).
- The same held page in a Text value's pane is read through `pageHeadingTarget(host, own.page)` by the picker (`useConnectionAutocomplete.ts:100`) and through `conn.headingsOf` by the decorations — the list can offer a heading the link then draws as missing until the index catches up, or vice versa (inferred).

**2.4 Heading-tree derivation twice (verified).** `openHeadingRows` (`autocomplete.ts:159-171`) walks levels to hide collapsed descendants for the flat keyboard list; `AutocompletePane`'s `nested()` (:174-187) rebuilds a tree through `outlineTree` from `HeadingRow`s re-shaped into fake `OutlineHeading`s (`{ from: 0, key, text, level }`, :184) and then filters it by the flat list. The hook already holds real `OutlineHeading`s (`outline`, :103).

**2.5 The `§`-arm gate is checked twice (verified).** `sectionArmAfter` refuses a `§` in a bracket or code at arm time (`:268`); `autocompleteQuery` re-checks `inBracket` at query time (`:61`). The query-time copy is the one that must stay — it covers a `[` typed after arming on the same line and is pinned by `autocomplete.test.ts:389`; the arm-time `inBracket` is the redundant one (the arm-time code check isn't: `autocompleteQuery` gates code on the caret, not the `§`).

**2.6 "Literal here" written three times.** `isLiteralAt` (`edits.ts:627`: code, code at `c-1`, math, `isInsideWikilink`, `inUrlRun`→`linkDestinationStart`), `literalAt` (pasteLink: destination, code, code at `pos-1`), `headingHash`'s `inCodeAt(sel) || inCodeAt(sel-1)`. Same "position behind the caret counts" rule, three spellings; `literalAt` doesn't treat wikilink interiors as literal while `isLiteralAt` does.

### 3. Odd-Ones-Out

- **The picker's state lives in React; its sibling's lives in CodeMirror.** `useBlockMenu` (`Menus/useBlockMenu.ts:21-60`) reads a `blockQuery` `StateField` (`Menus/blockQuery.ts:32-54`) derived per transaction, closed by an effect, identity-compared in one listener. The `[[` picker re-derives in an `updateListener` and keeps `ac` (useState), `armed` (ref, a doc position never mapped through changes), `measured` (ref mirroring `ac` minus geometry so the listener can compare), `sameQuery` (:242-248), and `formRef` + effect (:79-83) whose only job is to clear `armed` when the section form closes. Doesn't earn itself.
- **Typed `§` arms the heading list; `##`→`§` doesn't.** `sectionArmAfter` needs `isUserEvent('input.type')` and a pure one-character insertion (:255, :263); `sectionSign` (`edits.ts:667-681`) replaces `#` through `applyEdit` with `userEvent: 'input'` (`applyEdit.ts:26`). Verified by reading; intent unknown.
- **Alias slide inferred, heading slide recorded.** Heading slide = `viaChevron` state set at commit (`:182`). Alias slide = `form === 'alias' && cameFrom.current.length > 0` (`AutocompletePane.tsx:90`), where `cameFrom` is a ref written during render (:84) and cleared only when `ac === null` (:85-87). Walking the caret from a title list straight into a typed `|` (ac never null) slides from a page list nothing was picked from (inferred).
- **Chevron vs ArrowRight on a markdown target.** The pane draws the chevron on every `link`/`target` page row (`AutocompletePane.tsx:83,123`), and clicking it commits with `openHeading` (:235). ArrowRight's `aside` requires `ac.query !== ''` for `target` (`useConnectionAutocomplete.ts:203`). In an empty `[label]()`, `lookup('')` still lists pages (:146 empties only the `link` form), so the mouse opens headings and the key doesn't.
- **`openAlias` and `aliasRows` key the page differently.** `openAlias` checks `host.aliases.list(target?.pageId)` (:170-176); `aliasRows` resolves `ac.title` (`autocomplete.ts:179-182`). For `[[#Heading` in a Text value pane, `target.pageId` is the held page while `title` is `''`, so the pipe opens and the list is empty — the empty slot the comment at :171 says shouldn't be opened (inferred).
- **`AcRow` alias rows carry a closure** (`forget`, `autocomplete.ts:35,192`); page and heading rows are data.
- **`headingRows` applies the wikilink grammar's `expressibleHeading` to every heading form** (`autocomplete.ts:151`), including `fragment`, which writes through `encodeLinkTarget` and could express `|` or `#` (inferred; `targetFragment` decodes, `links.ts:102-105`).
- **Scope split (probably intended):** `commitAliasOnEnter` is page-only (`markdownInput` mounts at `MarkdownEditor.tsx:142`), while `aliasOnLeave` and `typedInput` sit in `inlineSurface` for all three scopes (`surface.ts:55,68`); a cell's or Text value's Enter commits its surface.
- **`headingHash` lives in `Links/`** while every other typed-character transform it chains with in `typedInput` is in `Input/edits.ts`, which already imports from Connections and `links.ts` (`edits.ts:2-3`).
- **Comment premise looks false:** `autocompleteQuery:119` says "`[` doesn't auto-pair after `!`, so an in-progress embed is usually unclosed." `autoPair` refuses the first `[` after `!` (:363) but the second `[` takes the doubled branch (:346-358: `glued` is false for `!`, no open doubles) and writes `[]]`, so `![[` becomes `![[]]` with Pair Brackets on (inferred by reading).

### 4. Self-Induced Machinery

| Machinery | What produces the need | Removing the cause deletes |
|---|---|---|
| `measured` ref + `sameQuery` + `formRef` effect + unmapped `armed` ref + `sectionArmAfter`'s same-line check (`:272`) | Query held in React state, not in CM state | A `blockQuery`-shaped field maps `armed` through `tr.changes`, closes via an effect (Escape, blur, section close all one path), and the listener compares field identity. `sameQuery` moves into the field (still needed for identity); the rest goes |
| Commit's `pageLinkPattern().exec` (`:166-169`) | `autocompleteQuery` discards the alias span it already held (it carries `title` and md `label`, not the worn alias) | Carry `alias` on the `link` form result; the re-parse and its import go |
| `connectionInsert` (`autocomplete.ts:214-222`) | Layer between `formSyntax` and `commitEdit`; its only production caller is `commitEdit:263` | Inline into `commitEdit` |
| `cameFrom` ref + clear effect (pane) and `viaChevron` state + reset effect (hook) | Two ways of recording "this list slid from the page list" | One `behind: AcRow[] \| null` set at commit when a slot opens |
| Fake `OutlineHeading` re-shape (`AutocompletePane.tsx:184`) + `openHeadingRows` | Hook passes filtered `HeadingRow`s, pane rebuilds the tree | Hook builds the tree once from the real outline and flattens visible nodes for the keyboard list |
| `fetched` state reset in an effect (`:107-115`) | Warm/cold split with an un-keyed cache | Keyed by `pageId`; also removes a painted frame where a second cold page shows the first one's headings until the effect runs (inferred) |
| `aliasEpoch` reducer + subscribe (`:123-125`) | Host seam reads the store imperatively | Not removable while MarkdownPM can't subscribe to the store — the seam's price, same shape as `linkTitles.subscribe` |
| Seven optional `AutocompletePane` props with defaults (`:35-42`, `:63-69`) + `NONE` (`:45`) | Only `aliasPicker.test.tsx:97,193` mounts the pane without them; the hook's `pane` object (`:224-238`) supplies all | Make them required; same shape as F-069's `paneGeometry`. Also `ConnectionsApi.location?`/`headingsOf?` (`connectionsApi.ts:42-43`): both production builders supply them (`pageConnections.ts:34,44-45`) |
| `leaveSlot`'s `setTimeout` defer | Collapse dispatched from an `updateListener` | A `transactionFilter` appending the collapse when the selection leaves an empty slot would remove it — not measured; the blur path still needs its own handler |

### 5. Confusing Names

- **`linkAt`** = Connections' wikilink span reader (`connections.ts:42`) and the DOM link finder destructured from `linkGestures` (`Tables/cellStatic.tsx` `linkGestures`, and `Properties/Cells/TextCell.tsx:28,37`). Siblings `linkTokenAt` (`Engine/tokens.ts`), `drawnLinkAt` (`decorations.ts`) are a third and fourth "link at".
- **`ConnectionForm`'s `'link'`** means "a wikilink's title half," not "a link"; `'target'` means a markdown link's page half (collides with `MdTarget`, `tokenTarget`, `HeadingTarget`, `LinkTarget`); `'heading'` (wikilink) vs `'fragment'` (markdown) vs `'section'` (`§` run) are one concept in three syntaxes.
- **`AutocompleteQuery.title`** is the page a heading/alias belongs to, while for the `'link'` form the title is `query`.
- **`warmBody`** (`api.ts:192`) vs `WarmSeam`/`warmSeamOf`/`tileWarmSeam` (`editorHost.tsx:10,15,36`) — "warm" names a store slot in one and retained editor state in the other.
- **`headingHash`** names its output (`#`), not its trigger (`§`); `sectionSign` names its output (`§`). `'section'` form and `sectionSign` are unrelated to each other's triggers.
- **`HeadingTarget`'s `'warm' | 'cold'`** read as cache temperatures, but `'warm'` also covers "no page" (`headingTarget.ts:16` returns `{ kind: 'warm', outline: [] }`).
- **`aliasOnLeave`** handles heading slots too (`Slot.kind: 'alias' | 'heading'`).
- **"Title" means the page in code and the alias in the product.** Code: `AutocompleteQuery.title`, `LinkSpans.title`, `EditorHost.pageTitle()`. Product: the setting `removeTitleOnLinkChange` (`personalization.ts:153`) is labelled "Remove Title On Link Change" with the hint "drops the alias it was wearing" (`Settings/frames.ts:530-533`), and `wikiAuthorTarget`'s comment calls an alias slot "an Add Title." Both meanings meet in one line: `keepAlias: settings.removeTitleOnLinkChange ? undefined : worn` (`useConnectionAutocomplete.ts:178`).
- **`AcQuery`** is dead (F-069); `AcRow`/`AcState`/`ac` abbreviations sit beside full-word `AutocompleteQuery`.

### 6. Approaches

**A · One slot reader.** Replace `aliasSpanAt`, `emptyAliasPipeAt`, `emptyHeadingHashAt` with one `slotAt(line, rel): { spans: LinkSpans; slot: 'title' | 'heading' | 'alias' } | null` in `connections.ts` (code-blind, per F-033's ruling that Connections can't take `DocScan`; the gate stays at call sites). `autocompleteQuery`'s wikilink branch switches on `slot`; `slotNear` becomes a call plus offset; `commitAliasOnEnter`, `inAliasAt`, `rememberAliasNear` read it once instead of twice; `leaveSlot`'s emptiness is `start === end` on the slot it already has. Optionally put the raw-HTML gate beside the code gate in one MarkdownPM helper (`liveLinkAt(scan, pos)`) so all editor readers agree with `decorations.ts`.
- **Delta:** −13 (three wrappers) +8 (`slotAt`) −4 (`autocompleteQuery` branches) −5 (`slotNear`) −2 (double reads in `commitAliasOnEnter`/`rememberAliasNear`) ≈ **−16**; the shared gate adds ~+5 and removes `commitAliasOnEnter`'s 2-line HTML check → ≈ **−13** with it.
- **User-visible:** with the shared gate, the picker, slot collapse, `]` refusal and alias memory stand down in a raw-HTML block.
- **Depends on:** `Links/linkEdit.ts` (in-flight), `connections.test.ts` (12 references).

**B · Picker query as a StateField (the `blockQuery` shape).** One `acQuery` field holds `{ q, armed }`: arms on a typed `§` (or on `sectionSign`'s conversion, if wanted — see §3), maps `armed` with `tr.changes.mapPos`, clears on a `closeAcQuery` effect (Escape, blur, commit-to-finished), and keeps `q`'s identity when `sameQuery`. The hook's listener only measures geometry when the field's identity changes, as `useBlockMenu` does.
- **Delete:** `armed` ref + comment (2), `measured` (1 + 3 uses), `formRef` + effect (6), `sectionArmAfter` (23), listener body (18), `close: () => setAc(null)` → effect (0) ≈ 53.
- **Add:** field (~28 incl. arm logic), listener (~6), effect def (1) ≈ 35.
- **Scope:** `autocompleteQuery` needs `allowEmbeds = scope === 'page'`, and no facet in MarkdownPM carries `MarkdownScope` (`Facet.define` sites: `embedWidget.tsx:46`, `Tables/widget.tsx:56`, `api.ts:44,206`). So the field is defined per mount inside the hook's existing `useState(() => …)` (where the extension already lives), unlike the module-level `blockQuery`; a scope facet would be +3 and is only worth it if F-098's `surfaces.ts` lands.
- **Delta:** ≈ **−18**. Folding `linkTyping` into it (the field already runs `linkAt` at the caret on every doc change) would save ~10 more, but couples the decorations' color rule to the picker and lands in in-flight files; not counted.
- **User-visible:** none intended; `armed` stops drifting when text shifts before the `§` on its line.
- **Depends on:** `caretPane.tsx`'s `usePaneCtl` unchanged; tests in `autocomplete.test.ts:363-395` drive `autocompleteQuery(…, armed)` directly and still work.

**C · Commit and phase cleanup.**
- Carry the worn `alias` on the `link`-form query; delete `pageLinkPattern().exec` + import (−6, +2).
- `formSyntax` 'link' → `connectionText(value, alias)` (F-035, 0).
- Inline `connectionInsert` into `commitEdit` (−8).
- One `behind: AcRow[] | null` replaces `viaChevron` + `cameFrom` (−7). **User-visible:** the alias list slides only when the picker opened the slot, not when the caret walks into a typed `|`.
- Build the heading tree once in the hook; delete `openHeadingRows` and the fake-outline re-shape (≈ −8, estimate).
- Fold `headingTarget.ts` into one `headingSource` beside the hook, keyed by `pageId` so `fetched` can't go stale (≈ −6).
- Required pane props, `NONE` gone (−2; mostly a readability win since defaults become plain names).
- `AcQuery` (F-069, −1); `warmBody` reads `knownBody` (F-041, as specified).
- **Delta:** −6 +2 −8 −7 −8 −6 −2 −1 ≈ **−36**.
- **Depends on:** `aliasPicker.test.tsx` gains the props; `connectionCommit.test.tsx`/`autocomplete.test.ts` cases on `connectionInsert` re-point at `commitEdit`.

**Combined A+B+C ≈ −65 to −70.** This surface is ~830 production lines, so the 200-400 target has to come mostly from elsewhere. The largest further lever here is §2.3: if the index stored raw heading text and level (not just normalized keys), the picker could read `conn.headingsOf` synchronously and delete `headingTarget.ts` (28), `warmBody`/`fetchBody` on the seam (`api.ts` 3, `editorHost.tsx` 5, harness 2), and the `fetched` state/effect (~10) ≈ −45 here. That trades away offering a heading typed moments ago (the index lags saves) — Nathan's call.

### 7. Would Go False

- **A:** `connections.test.ts` (12 refs to the three wrappers); `edits.test.ts` (5 refs incl. `isInsideWikilink`/`inAliasAt`); `mdLinkTarget.test.tsx` (2). The `commitAliasOnEnter` comment "Code holds no live link, and neither does an HTML block…" stays true but stops being unique.
- **B:** comments at `useConnectionAutocomplete.ts:47`, `:71`, `:78`, `:189` ("NOT cleared here…"), `:250`. `Editor-Internals.md:39` ("the `[[` pane's commit reads the live ctl's `open`, and the block menu's pick reads the live query field") — both would read the field.
- **C:** `autocomplete.test.ts` (19 refs to `connectionInsert`/`commitEdit`/`AcQuery`); `aliasPicker.test.tsx` (6, mounts the pane with omitted props); `autocomplete.ts:197` comment ("A carried `alias` rides only the link form…"); `headingTarget.ts:9` comment; `api.ts:191` comment on `warmBody`. `ConnectionsPM.md:53` ("Accepting a page that opens an alias slot doesn't close the panel: the suggestions push aside…") stays true; the alias-slide-without-commit behavior it doesn't describe goes.
- **Already false today:** `autocomplete.ts:119` ("`[` doesn't auto-pair after `!`, so an in-progress embed is usually unclosed") — see §3.

### 8. Traps

- **`index:headings` (`bridge.ts:69`) looks like a ready heading source** but `indexSeed.ts:73` stores normalized keys only, with no level or display text; `headingRows` and the tree need both. It also lags saves, which the picker's "a heading typed moments ago is offered" (`headingTarget.ts:9`) rules out.
- **Tokens can't replace `linkAt` for slots.** `wikiLinkTokens` drops an empty alias and an empty fragment (`alias = s.alias && s.alias[1] > s.alias[0] ? … : null`), and `drawnLinkAt` reads only the last draw's visible tokens. The empty `[[v|]]` / `[[v#]]` slots the picker opens and `leaveSlot` collapses are invisible to them.
- **The embed branch can't fold into `linkAt`:** `pageLinkPattern`'s `(?<!!)` excludes `![[` by design (`connections.ts:8`).
- **`isInsideWikilink` isn't a duplicate of `linkAt`:** it deliberately counts unclosed `[[` so typography transforms stand down mid-authoring. The divergence to fix is the picker's dependence on Pair Brackets, not this counter.
- **`backedTo`** (`:88`, `:153`) guards a real rule — an exact single match closes the list (`:143`) — with Back as the stated exception. It's sync machinery for a behavior, not instead of one.
- **`authored` + `typedInto` in `aliasOnLeave`** keep caret pass-through from MRU-bumping or re-remembering an alias already in the body; `editorHost`'s `rememberAlias` writes a `setPageMeta` mutation each time (`editorHost.tsx:47-53,62`). Dropping them changes ordering and adds synced writes.
- **`cold` stays after F-041:** `knownBody` (`pageDetailCache.ts:41-42`) is `undefined` for a page never loaded this session.
- **`aliasEpoch`** looks like an unneeded counter, but `host.aliases.list` reads the store imperatively and the `candidates` memo can't see a forget without it.
- **`sameQuery` survives approach B:** a selection move inside a finished link re-derives an equal query; without the compare, every arrow key re-measures layout (the comment at `:71`).
- **Alias memory has one writer** (`rememberAliasNear`, only from `leaveSlot` when the slot was typed into) **and one forgetter** (the pane's HoverRemove through `row.forget`); readers are `aliasRows` and the `openAlias` length check. No other path writes `aliases` (`git grep` of `.aliases`/`aliases:` finds only the schema, the mutate request, and the host). Nothing in it exists only to patch another path.
