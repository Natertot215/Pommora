## Connections & Aliases Restructure — Implementation Plan

**DATE:** 10-15-2026
**STATUS:** Complete 10-16-2026 — `abfbf0798..0d686c2e9`
**SOURCE:** W22 of the *Pommora Codebase Audit* (F-114, F-116 to F-131), the *Architecture Brief* (the behavior specification), the *Architecture Design* (the rulings and principles), the *Investigation* (the verified chain, the corrected AFTER shapes, and the reconciliation list), and the planning conversation's rulings (10-15-2026): Remove Title's one rule everywhere, Text values sorting and filtering on shown text as one rule, the resolver in `Core/Connections/`, no Save Heading Aliases setting, Return inside a link resting past it everywhere, the Link field opening on the whole written link with Rename folded into it, the one-line fields keeping a plain field's feel, the frontmatter-keys rule chosen by principle, the table cell's pipe folded into the one writer, and the floor set at −100 with the net count of things that disappear or consolidate stated exactly.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `abfbf0798` | 7919 passed, 2 skipped (536 files) | 10-15-2026 09:04 PM | 10-16-2026 06:10 PM (8042 passed, 2 skipped, 535 files) |

### Context

Connections are Pommora's page-to-page links, wikilinks `[[Page#Heading|Alias]]` and markdown links `[Label](Page#Heading)`, written in page bodies, table cells, markdown tiles, and Link and Text property values, and resolved against the title index built from the page tree. Aliases are the alternate names a page remembers, kept per page ID in the Nexus's `.nexus/metadata/` shards, offered by the connection picker, and added when a link's shown text names a page by a new name. The Alias Management work and the three commits after it that made a markdown label behave as an alias were review-driven and patch-heavy, so the surface reached `5272eb82f` with two markdown grammars, two readers resolving a link into two shapes, two closure trackers in one listener beside a third for the typing color and a fourth inside the picker, a picker keyed by seven flat form names, a second title index on the host over a second tree walk, and most rules about a link's shown text stated two or three times, with small wrong results where the copies disagree.

The audit's W22 maps the fresh-eyes architecture onto the code, finding by finding, and the Investigation verified every citation at HEAD, overturned the typed fixes where the ledger's text was right, and converged the scouts on one AFTER shape per layer. This plan lands that shape as one system: one grammar producing one occurrence per link, one reader set over it in the editor, one written shape and one resolver, one tree walk and one title index both processes import, one tracker for an edit inside a link whose baseline the picker and paste share, one picker model keyed by syntax and part, one set of shown-text rules behind one page writer with one slot check, one index that records facts and two readers that apply one keys rule, and one editor surface in every place a connection is typed. The data layer (`aliasMemory.ts`, the `editAliases` operation, `updatePageMetadata`, and the metadata shard) already follows the codebase's established paths and stays as it is.

### Overview

The work lands in nine phases, each the next layer of the system and each the largest run one agent can carry, in dependency order. The host's title index comes first, since the resolver phase edits the same imports. The grammar comes second, since the resolver, the tracker, the picker, and the rules all read the occurrence it produces. The resolver, the tracker, and the picker follow, each on the shape the one before leaves. The rules and the one writer come after the resolver changes the remember rule's signature and before the index phase reuses the writer's slot check. The one-line fields come last, since they mount everything the earlier phases built, and the documentation closes.

**The System, Layer by Layer:**

- **Grammar** (`Core/Connections/connections.ts`, `links.ts`): one wikilink pattern and one markdown pattern (an empty label kept, an empty destination refused), one walk yielding one flat `LinkOccurrence { syntax, full, title, heading, shown }` per link in start order, one `namesPage` deciding whether a destination's first `#` opens a heading, one `markdownLink(dest, label)` template, one `defaultLabel(title, heading)`, and one `encodeLinkTarget` that escapes `#`. The index's `LinkHit` carries the occurrence's spans under the occurrence's names, plus `embed: boolean` asked of both syntaxes.
- **Editor Readers** (`Core/MarkdownPM/Input/edits.ts`): `linkAt` (the later-starting link at a boundary), `openLinkAt` (a link still being written, read through a placeholder at the caret), and `slotAt` (the link and the slot holding the caret), with `partOf` the one "which slot holds the caret" rule that Return, `]`, `[`, the typing transforms, the `§` transform, and the picker all ask. Tokens carry their occurrence, so no reader rebuilds one. One `shownEnd(state, at, scope)` serves Return, the `]` swallow, and the `[` stand-down, and Return in a shown slot rests the caret past the link in every editor place.
- **Written and Resolved** (`Core/Connections/linkValue.ts`): `readLinkText` reads a whole link once into `LinkTarget` (a url arm may carry `page?` for a destination a page could also hold); `resolveLink(written, index, own?)` returns `page | self | url | unresolved(status)` and alone holds the page-before-address rule, the bare-heading rule (`bareHeading`), and the status. Addresses resolve as written; the writers that store them normalize at their own entry. `ConnectionsApi` becomes `{ index, open, menu?, headingsOf }`, `location` moves to `EditorHost`, and `[](Page)` draws its default label from the written target the look already reads.
- **One Walk** (`Core/Nexus/record.ts`, `treeIndex.ts`, `heldPages.ts`): `recordsOf` is the only tree walk; `pagesOf`, `pagesByIdOf`, and `pageIndexOf` sit beside it keyed on collections alone; `PageIndex.holders(title)` serves the host's delete, rename, and restore checks, and `titlesOf` goes.
- **One Tracker** (`Core/MarkdownPM/Links/linkSettle.ts`, beside `headingRenameSettle.ts`): `linkWriting`, a state field holding `{ start, was }` for the link an edit is being made inside, armed by a user input or delete reaching into a link, mapped through changes, dropped with its opener, and cleared by `linkSettled`; `linkSettle`, one plugin mounted as `linkSettle.of(scope)`, settles on the caret leaving the whole link, on a blur not into the caret pane, or on a host's flush through `view.plugin(linkSettle)`: it remembers through the one remember rule and collapses emptied parts. The typing color reads the same field, in both syntaxes. `baselineAt` answers how a link read before the edit inside it began, and the picker and paste decide Remove Title from it through one `keepsShown`, with `retarget` only writing.
- **One Picker** (`Core/MarkdownPM/Autocomplete/`): the query is `{ syntax: 'wiki' | 'markdown' | 'prose', part: 'title' | 'heading' | 'shown', start, end, … }`; `commitEdit` switches on `part`, writes page picks through the writer with the shown text decided once, and reads an opened slot's caret back from the written text through the grammar. Markdown picks open the alias list as wikilink picks do; Return in a markdown destination rests in its label.
- **Rules and the Writer** (`connections.ts`, `links.ts`, `linkValue.ts`, `rewrite.ts`): one slot check (`fitsSlot`, `expressibleInLink`, `aliasSpells`, `spellsAsWiki`); one `pageLinkText({ title, heading, shown }, prefer)` writing a wikilink only when every slot spells and the markdown form otherwise; `repeatsTarget` as the one drop rule, `namesTarget` as the one carry-and-never-remember rule; one `keepsShown(baseline, next, removeTitle, index)` deciding Remove Title for the picker and paste, and for the Link field through the picker inside it; one `follower` serving both rename arms, with the table codec's cell escape applied where a hit sits in a table; one `linkDisplayText` behind `shownProse`, serving Remove Link, sort, and filter for Link and Text values alike; one `resolvedTarget` writing a page-held address as that page for the Link field and paste; `fileLinkText` for a File value's reference, which never falls back.
- **Index Facts and Readers' Rule** (`Core/Connections/scan.ts`, `Core/Index/indexSeed.ts`, `Desktop/Store/`, `Core/Matrix/`, `Core/Nexus/cascade.ts`, `Core/Properties/schema.ts`): every link in a frontmatter value becomes one `value` row carrying its key; `linkKeysOf(defs)` sits beside `keyRefusal`, and the graph and the rename cascade each apply it at the moment of use with the registry in memory, so nothing bakes a verdict that can go stale.
- **One Editor Surface** (`Core/Properties/Pickers/`): the Text pane's editor generalizes into one value editor with a one-line mode and an alias seat; the Link field, the Link value's Rename, and the single-line Text field mount it, keeping a plain field's feel and gaining the picker, the tracker, and alias memory (the Link instance leaves memory to the write layer, which already owns it).

**The Number:** the Net Ledger carries two estimates per phase: the Investigation's (typed where a diff survived) and the plan's own, counted from the AFTER blocks with every elided removal measured at HEAD and every long line expanded as the formatter will. The two agreed on Phases 1 and 4 and disagreed on the rest, spanning about −240 to −80; the work landed at +45 (the Net Ledger row by row), every phase measured on its own commits, the fields phase typed on a scratch worktree and measured before it was committed, and each phase that landed above its band reported with what the increase bought (*§Constraints · The Number*).

**The Things:** the line count is one measure; the one the mandate is about is how many things exist and how many ways there are of doing each. Counted from *§Concepts* as landed (the final verification's two rounds included), with a relocation on neither side and a rename or reshape under the same name counted as neither:

| | Functions, fields, plugins, components | Types | Files | Members, parameters, options | Total |
|---|---|---|---|---|---|
| **Removed** | 52 | 15 (eleven named types and four local `Span` declarations) | 1 (`headingHash.ts`) | 27 | **95** |
| **Added** | 46 (31 exported, 15 private) and 3 style rules | 7 | 2 (`linkSettle.ts`, `ValueEditor.tsx`) | 30 | **88** |
| **Moved** | 10 (and 2 made exported) | 1 | 1 moved, 1 renamed | | 12 |
| **Net** | −3 | −8 | +1 | +3 | **−7 named things** |

Every row of both tables in *§Concepts* is in that count; a reader can redo it from the tables alone. The named count understates the consolidation, because most of what arrives is the one owner that replaces several spellings. Counted as ways of doing one thing, before and after:

| The thing | Before | After |
|---|---|---|
| Markdown link patterns | 2 | 1 |
| Link occurrence shapes | 2 (different fields per syntax) | 1 |
| Destination `#` splits | 3 | 1 |
| `[label](dest)` templates | 3 | 1 |
| Default-label spellings | 2 | 1 |
| `Span` declarations | 4 | 1 |
| Whole-link readers (text to written) | 3 | 1 |
| Resolvers (written to resolved) | 2 | 1 |
| Bare-heading rule applications | 4 | 1 |
| Editor caret readers | 5 | 4 (`linkAt`, `linkWithin`, `openLinkAt`, `slotAt`, over one line walk) |
| "Which slot holds the caret" tests | 5 | 1 |
| Raw-HTML question owners | 2 | 1 |
| Tree walks | 2 | 1 |
| Title indexes | 2 | 1 |
| Trackers of an edit inside a link | 4 | 1 |
| Remove Title decisions | 3 | 1 |
| Picker query vocabulary (form names, predicates, closer switch) | 11 | 3 (two axes, one record) |
| Picker commit arms | 8 | 3 |
| "Names the target" spellings | 3 | 1 |
| Slot-spelling checks | 2 | 1 |
| Page-link writers bypassing the markdown fallback | 4 | 1 (`fileLinkText`, a File reference, which never falls back by ruling) |
| Rename carry-and-drop implementations | 2 | 1 |
| Shown-text spellings | 2 | 1 |
| Frontmatter value readers | 2 | 1 |
| Keys-hold-links rules | 2 | 1 |
| Link and Text field editors | 3 | 1 |
| Link Rename writers | 2 | 1 |
| Alias-list key sniffs | 1 | 0 |
| Relation kinds a value link can land in | 2 | 1 |
| Host interfaces spreading the title index | 1 | 0 |
| **Total ways** | **93** | **35** |

Fifty-eight ways of doing thirty things disappear (re-tallied from the landed code at the closeout); every row's "after" has one named owner in *§Concepts*, and the projections that an alias edit used to rebuild (eight, on one six-input memo) each key on what they read, so the four that don't read page metadata no longer rebuild on it. Nothing that arrives is a second way of doing something that already has one: each addition is the owner a row above names, a field the one shape needs, or an option the ruled field surface needs. The closeout re-tallies both tables from the landed code.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `Span` • type (exported) | The `[number, number]` tuple every grammar, index, and token file read, declared once. | `Core/MarkdownPM/Engine/markdownCode.ts` |
| `markdownLink`, `fitsSlot`, `labelEscapes` • functions | The one `[label](dest)` template every markdown writer spells through; the grammar's one slot cap (255 characters, no line break), which the wikilink slots and the markdown label share and which the page writer, the rename rewriter, and the settle's fill ask of a label, so no writer leaves a link the grammar can't read back (`escapeLabel` escapes `]`, `\`, and a leading `^`); where a label's escaping backslashes sit, which the editor and the resting cell hide as they hide the brackets. | `Core/Connections/links.ts` |
| `defaultLabel` • function | What a markdown link shows when its label is empty, and what a pick's label defaults to: the heading, else the title. | `Core/Connections/links.ts` |
| `namesPage` • function (exported) | Whether a destination's half before `#` names a page; shared by the occurrence split, the `§` transform, and the resolver. | `Core/Connections/links.ts` |
| `LinkHit.embed`, `LinkHit.full`, `LinkHit.shown`, `LinkHit.named` • fields | The hit carries the occurrence's spans under the occurrence's names, the page as the link reads it (what the index keyed it by and the rename rewriter follows), plus the embed-line answer for both syntaxes. | `Core/Connections/scan.ts` |
| `Token.link` • field | A link token carries the occurrence it was built from. | `Core/MarkdownPM/Engine/tokens.ts` |
| `LinkPart` • type | The three slots a caret can sit in: `'title' \| 'heading' \| 'shown'`. | `Core/Connections/connections.ts` |
| `openLinkAt`, `slotAt`, `partOf` • functions | A written link whose slot at the caret was emptied, read whole, else the link still being written, read through a placeholder at the caret; the link and the slot holding the caret; the one "which slot" rule, exported for the picker. | `Core/MarkdownPM/Input/edits.ts` |
| `targetSpan`, `mapSpans`, `mayHoldLink`, `mayNameHeading`, `mayNameOwnHeading` • functions | The destination as written, title through heading, so no reader rebuilds it; the occurrence's spans mapped with its arm kept, so no reader casts; the grammar's three fast gates (could this text hold a link, name a heading, name the document's own heading), which the shown-text reader, the index, the editor's line walk, the heading rewriter, and the cells ask before any walk. | `Core/Connections/connections.ts` |
| `headingHash` • function (relocated) | The `§` transform, folded in as "the caret is in a page-naming title slot". | `Core/MarkdownPM/Input/edits.ts` |
| `LabelWidget` • class, `LinkLook.label` • field, `.md-link-label` • style rule | Draws an empty-label link's default label in the editor; the look decides the label once, from what the link resolved to; the plain-links setting hides a phantom's label so the raw syntax reads as plain text. | `Core/MarkdownPM/decorations.ts`, `Links/connectionsApi.ts`, `markdown-pm.css` |
| `drawsRawHtml`, `inRawHtml` • functions (relocated) | The raw-HTML question, beside the host and its setting. | `Core/MarkdownPM/api.ts` |
| `shownEnd` • function (exported, scoped) | The one shown-slot question Return, `]`, and `[` ask. | `Core/MarkdownPM/Links/linkEdit.ts` |
| `EntityRecord.icon` • field | What the renderer's glyphs need from the one walk; its trails derive from paths. | `Core/Nexus/record.ts` |
| `pagesOf`, `pagesByIdOf`, `pagesByPathOf`, `livePagePath`, `pageIndexOf` • memos (relocated; `pagesByPathOf` added) | The page projections, keyed on collections alone, beside the one walk; `pagesByIdOf` derives from `recordById`, so the window and the reconcile show the first listed of two files claiming one id, and `pagesByPathOf` is the one path map the host's writers and the renderer's reconcile read. | `Core/Nexus/record.ts` |
| `PageIndex.holders` • method | Every page answering a title, from which `resolve` derives and the host's title checks read. | `Core/Connections/pageIndex.ts` |
| `ResolvedLink` • type | `page | self | url | unresolved(status)`. | `Core/Connections/linkValue.ts` |
| `LinkTarget.page?` • field (url arm) | A markdown destination a page could also hold. | `Core/Connections/linkValue.ts` |
| `readOccurrence`, `namedPage`, `resolveLink`, `bareHeading`, `wikiTitle` • functions | The one reader of an occurrence, the page a written link names (which the resolver, the label, the remember rule, `resolvedTarget`, the index, and the picker read), the one resolver, the bare-heading rule's owner, and the wikilink title a file reference spells. | `Core/Connections/linkValue.ts` |
| `heldOf` • function | The page a held value answers for, read from the editor's held-page facet, or nothing for a body; what `heldTarget` applied after resolution, now passed into it. | `Core/MarkdownPM/api.ts` |
| `EditorHost.location` • method | A page's trail for the picker's rows. | `Core/MarkdownPM/api.ts`, `Core/Pages/editorHost.tsx` |
| `LinkMenuTarget`, `linkMenuTarget` • (relocated) | Beside `LinkMenuContext`, typed on `ResolvedLink`. | `Core/Actions/connectionMenu.ts` |
| `Links/linkSettle.ts` • file | The link an edit is being made inside, from the change that arms it to the settle that remembers its alias and collapses its emptied parts; the counterpart of `headingRenameSettle.ts`. | `Core/MarkdownPM/Links/` |
| `linkWriting`, `linkSettled`, `keptShown` • field, effect, function | The link an edit is being made inside and how it read before; what clears it; whether a re-aim of the link at a start keeps its shown text, `keepsShown` asked against how the link read before the edit began (`baselineAt`, private) where the editor holds one, which the picker and paste both ask. | `Core/MarkdownPM/Links/linkSettle.ts` |
| `linkWithin` • function | The strict-reach reader, beside the other editor readers: the first link on a line that a range reaches into. | `Core/MarkdownPM/Input/edits.ts` |
| `linkSettle` • plugin | One instance, mounted as `linkSettle.of(scope)` (Task 8-1 adds `remembers`): settles the field, remembers, collapses emptied parts, flushes on unmount. | `Core/MarkdownPM/Links/linkSettle.ts` |
| `pageLabel` • function | The label a link shows for the page it names, by what it resolved to: what the draw shows for an empty label and what the settle fills an emptied label with. | `Core/Connections/linkValue.ts` |
| `Links/headingRenameSettle.ts` • file (moved) | The heading-rename settle beside the link settle. | `Core/MarkdownPM/Links/` |
| `QuerySyntax` • type (private), `CLOSER` • record | The picker's syntax axis (its part axis is the grammar's `LinkPart`); the grammar's one closer table, which the picker and the open-link reader both spell from. | `Core/MarkdownPM/Autocomplete/autocomplete.ts`, `Core/Connections/connections.ts` |
| `AutocompleteQuery.syntax`, `.part`, `.start`, `.end`, `.shown` • fields | On every query; `shown` where the link writes an alias or label, read as its slot reads. | `Core/MarkdownPM/Autocomplete/autocomplete.ts` |
| `PageName` • type | A page named by title and, where the link names one, heading: the shape every rule and writer takes. | `Core/Connections/connections.ts` |
| `aliasSpells`, `spellsAsWiki`, `repeatsTarget`, `namesTarget` • functions | What the alias slot spells; whether a wikilink spells every slot; the one drop rule; the one carry-and-never-remember rule, answering which part of the target shown text names. | `Core/Connections/connections.ts` |
| `pageLinkText`, `fileLinkText` • functions | The one page-link writer: a wikilink where every slot spells, the markdown form otherwise, the wikilink spelling its own body; a File value's reference by file name, which `wikiTitle` reads and so never falls back. | `Core/Connections/connections.ts` |
| `carry`, `follower` • functions (private) | Where shown text naming the old target follows it to; one rewrite per hit for either rename arm, the hit's halves read as names. | `Core/Connections/rewrite.ts` |
| `shownProse`, `resolvedTarget` • functions | A text with each connection replaced by what it shows (`linkDisplayText`, the one rule), for a Text value's sort and filter; a written link as the page it resolves to, which the Link field's edit and paste both write. | `Core/Connections/linkValue.ts` |
| `keepsShown(…, index)` • signature | Owns "pointed somewhere" through `resolveLink`. | `Core/Connections/linkValue.ts` |
| `linkKeysOf` • function | Which frontmatter keys hold links, asked of a registry as one folded lookup, beside `keyRefusal`; the graph, the rename cascade's patch, and the Spaces' heading check read it. | `Core/Properties/schema.ts` |
| `Relation.key`, `'value'` • field and kind | A link inside a frontmatter value, under its key; `frontmatter` renamed. | `Core/Platform/stores.ts`, `Desktop/Store/ddl.ts` (generation 15, with `count` gone) |
| `linkDefsOf` • function | The registry's Link definitions, read from the defs in hand, which the delete cascade and the Trash sweep ask of the held tree. | `Core/Properties/propertiesRegistry.ts` |
| `linkTitle` • store reader | A fetched page title by address, read and written under one normalized key, so every spelling of an address shares one entry. | `Core/Session/cacheSlice.ts` |
| `.mdpm-fill` • style rule | The page editor's own height chain (the shell, its editor, and `.cm-editor` filling their host), carried by `MarkdownEditor`'s shell alone, so the pane, the field, and the tiles inherit nothing to undo. | `Core/MarkdownPM/markdown-pm.css`, `MarkdownEditor.tsx` |
| `valueLinks(…).key` • yield | The one value reader yields each hit's key. | `Core/Connections/scan.ts` |
| `ValueEditor` • component | The one value editor, the Text pane's and in `oneLine` mode a field's, with `alias` seating the caret in the Link value's alias slot for Rename; a cancel ends the edit, so nothing after it writes. | `Core/Properties/Pickers/ValueEditor.tsx` |
| `.value-field` • style rule, `FieldPicker` `Typed \| Hosted` • props, `field` • style | The one-line editor at its seat's text metrics, one scrolling line; the one popover chrome for a typed value, holding the kit's input over a `value` with its affixes (Number) or a caller's editor as `children` (Link and Text), with one field style owning the fill, stroke, ring, type, and width band. | `Core/Properties/Pickers/text-pane.css`, `UIX/Pickers/FieldPicker.tsx`, `field-picker.css.ts` |
| `Remembers` • type, `inlineSurface(scope, { oneLine, remembers })`, `editorBase({ …, oneLine, remembers })` • options | When a surface's alias memory writes: `leave` as the caret leaves the link (a body, a cell, the pane), `flush` once the host flushes (the one-line Text field, whose Escape then remembers nothing), `never` where the write layer remembers (the Link field); and a field's surface. | `Core/MarkdownPM/Links/linkSettle.ts`, `Core/MarkdownPM/surface.ts` |
| `EditEnd` • type (`'key' \| 'blur'`), `EditableInput`/`RenamableLabel` `how` • argument | How an edit ended, by a key or by the focus leaving, passed to `onCommit` and `onCancel`. | `UIX/Fields/EditableInput.tsx`, `RenamableLabel.tsx` |
| `ConnectionsApi.index`, `LinkEditContext.index`, `LinkEditContext.own`, `commitEdit`'s `kept` • members and option | The host interface holds the index rather than spreading it; the Link field's parse carries the index and the holder; the picker's commit takes the one kept alias. | `Core/MarkdownPM/Links/connectionsApi.ts`, `Core/Properties/parseEditorValue.ts`, `Core/MarkdownPM/Autocomplete/autocomplete.ts` |
| `markdownSpans`, `embedLine`, `holdersOf`, `ancestries`, `plain`, `changedLink`, `linkStartingAt`, `liveSlotAt`, `linkLine`, `writablePathsOf` • private helpers | The markdown occurrence's split; the embed-line test for both syntaxes; the title index's holders map; the renderer's ancestry memo; the baseline's four-field strip; the tracker's changed-link read; the link starting exactly at an offset, which the remember and the collapse both ask; the slot holding the caret where it sits in live Markdown, which Return and the shown-slot question both read; the one line walk the three editor readers open with; the host's writable paths, null where two files claim one id. | `connections.ts`, `scan.ts`, `pageIndex.ts`, `treeIndex.ts`, `remintLedger.ts`, `linkSettle.ts`, `linkEdit.ts`, `edits.ts`, `heldPages.ts` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `emptyTolerantLinkRegex`, `MarkdownLinkSpans`, `markdownLinkAt`, `linkDestinationStart`, `opensFragment`, `pageTarget`, `composeWebpageEmbedLine` | The second markdown grammar, its span type, two half-typed readers, the codec's second `#` split, and one of three templates. | `Core/Connections/links.ts` |
| `LinkSpans`, the `LinkOccurrence` union, `parseConnectionText`, `ConnectionParts` | The two-armed occurrence and the asset readers' second whole-link reader. | `Core/Connections/connections.ts` |
| `LinkSyntax` (`'embed'` as a syntax), `LinkHit.at`, `LinkHit.alias`, `destinationHalves`, `loneEmbed`, `frontmatterMentions`, `wholeValueLink` | The index's second split, its wikilink-only embed test, its second value reader, and the whole-value reader whose last caller reads `linkEntry` once itself. | `Core/Connections/scan.ts`, `linkValue.ts` |
| `Token.resolveRange`, `Token.heading`, `linkAddress`, `linkTarget` | Spans the occurrence carries, and the two readers that derived the destination from marker geometry. | `Core/MarkdownPM/Engine/tokens.ts` |
| `connectionAt`, `openConnectionAt`, `inAliasAt`, `inUrlRun`'s destination arm | Three readers over the occurrence's shape. | `Core/MarkdownPM/Input/edits.ts` |
| `Links/headingHash.ts` | The `§` transform's own file. | `Core/MarkdownPM/Links/` |
| `linkContainerAt` (tokenizing form) | Paste's full-tokenizer walk to find the link under the caret. | `Core/MarkdownPM/Links/pasteLink.ts` |
| `TreeIndex`, `indexFor`, `walk` | The renderer's one-memo walk keyed on `pageMetadata`. | `Core/Nexus/treeIndex.ts` |
| `titlesOf` | The host's second title index over the second walk. | `Core/Nexus/heldPages.ts` |
| `ConnPage.icon` | The field that forced the title index onto `pageMetadata`. | `Core/Connections/pageIndex.ts` |
| `MdTarget`, `titleTarget`, `resolveMdTarget`, `tokenTarget`, `linkStatus`, `ConnectionsApi extends PageIndex`, `ConnectionsApi.location` | The second resolver and the host interface's spread index. | `Core/MarkdownPM/Links/connectionsApi.ts` |
| `heldTarget` | The bare-heading rule applied after resolution. | `Core/MarkdownPM/Links/linkClicks.ts` |
| `heldBy` | The holder wrapped as an `OwnPage` for a cell to unwrap; the cells take the holder itself, and `ownPage` spells the wrap inline. | `Core/MarkdownPM/api.ts` |
| `markdownPageLink` | The markdown page-link writer with one caller; `pageLinkText` spells the markdown form in its own body through `markdownLink`. | `Core/Connections/links.ts` |
| `Relation.count` • field and column | Written by the tally and the store, read by nothing. | `Core/Platform/stores.ts`, `Desktop/Store/ddl.ts` |
| `PageIndices`, `indicesOf`, `liveIndices` | The host's own path and id maps beside the renderer's; the path map is `pagesByPathOf`, the writers' null-on-duplicate map `writablePathsOf`. | `Core/Nexus/heldPages.ts` |
| `namedTitle`, `inlineSurface` • export | The picker's own title read (the one reader answers it); the surface composed only by `editorBase`. | `Core/MarkdownPM/Autocomplete/autocomplete.ts`, `Core/MarkdownPM/surface.ts` |
| `linkDefs`, `wholeLinkToken`, `HEADING_REFERENCE`, `readsOwnHeadings` | The disk read of the Link definitions beside the in-memory one; the tokenizing read of a citation's lone link; the two heading-reference gates spelled as regex literals away from the grammar. | `Core/Properties/propertiesRegistry.ts`, `Core/MarkdownPM/Engine/tokens.ts`, `Core/Connections/rewrite.ts`, `Core/MarkdownPM/Tables/cellStatic.tsx` |
| `valueTarget`, `valueTarget.ts` • function and file name | A value's resolution through the cell tokenizer; the file becomes `valueMenuTarget.ts`, after the one function it keeps. | `Core/Properties/Cells/valueTarget.ts` |
| `linkResolver`, `LinkEditContext.resolve`, `LinkEditContext.keepTitle`, `PropertyValueInput`'s `alias`-only field, `linkValueFromEdit`'s `current` and `keepTitle` | The Link field's resolver patch, its hidden-alias parse, and the re-applied hidden alias. | `Core/Properties/Pickers/PropertyValueInput.tsx`, `parseEditorValue.ts`, `Core/Connections/linkValue.ts` |
| `AutocompleteQuery.form`, `commitEdit`'s `container` and `keepTitle` | The flat form name and the commit's own Remove Title inputs. | `Core/MarkdownPM/Autocomplete/autocomplete.ts` |
| `readLinkText(…, resolve)` • parameter | Resolution inside a reader. | `Core/Connections/linkValue.ts` |
| `linkTyping` | The typing-color tracker. | `Core/MarkdownPM/Links/linkReveal.ts` |
| `retarget`'s `baseline`, `keepTitle`, and `index` • parameters | The writer no longer decides whether an alias rides along; `keepsShown` does, and each caller folds its answer into `next.alias`. | `Core/Connections/linkValue.ts` |
| `aliasOnLeave`, `Slot`, `slotNear`, `collapseSlot`, `Written`, `typedInto` | The two closure trackers in one listener. | `Core/MarkdownPM/Links/linkEdit.ts` |
| `LinkOrigin`, `originOf`, `originAfter`, `linkStart`, `AcField.origin` | The picker's own baseline. | `Core/MarkdownPM/Autocomplete/acQuery.ts` |
| `ConnectionForm`, `listsPages`, `listsHeadings`, `listsAliases`, `closerOf`, `AutocompleteQuery.label` | Seven form names, three predicates, the closer switch, and the label side span. | `Core/MarkdownPM/Autocomplete/autocomplete.ts` |
| `showsTarget`, `connectionSpells`, `linkEditText`, `linkValueFromRename` | Two of three "names the target" spellings, the title-and-heading-only slot check, the field-only edit text, and Rename's own writer. | `Core/Connections/linkValue.ts` |
| `connectionText` | The bare wikilink writer; its spelling is `pageLinkText`'s own body, the one way to write a page link. | `Core/Connections/connections.ts` |
| `shows` | The rewrite's private carry test. | `Core/Connections/rewrite.ts` |
| `shownConnection`, `headingOf` | Remove Link's own shown-text spelling, and the token heading reader it alone read. | `Core/MarkdownPM/Links/linkEdit.ts`, `Engine/tokens.ts` |
| `keyed`, `byKey`, the capture handler | The alias list's key sniff. | `Core/MarkdownPM/Autocomplete/AliasList.tsx` |
| `'frontmatter'` • relation kind | Renamed `value`, with its key. | `Core/Platform/stores.ts`, `Core/Matrix/Engine/graph.ts`, `forces.ts` |
| `TextPaneEditor`, `TextPane`'s own `useEditorHost` and `settled` | Generalized into `ValueEditor`; the pane takes its host from its caller. | `Core/Properties/Pickers/TextPane.tsx` |
| `TextPicker.accent`, its bare input arm (`input`, `suffixField` styles, `boxed`) | The picker's second form: the input owning its own ring and width; the one wrapper owns the chrome for whatever sits inside. | `UIX/Pickers/FieldPicker.tsx`, `field-picker.css.ts` |
| `Guards/headingRenameSettle.ts` • path | Moved to `Links/`. | `Core/MarkdownPM/Guards/` |

#### Constraints

- **Mandate:** the codebase ends with no more functions, helpers, wrappers, types, layers, and call sites than the behaviors require, and no logic stated twice; new code earns its place by removing more than it adds, by making a wrong behavior correct, or by delivering a ruled behavior in its smallest form, and a phase that nets an increase states what the increase buys. A reader finds what exists, where it lives, what owns it, and what calls it with less searching than before, through file names, file headers, and the feature documents alike, with no pass-through abstraction that doesn't need to exist. Each responsibility has one owner, and the next change of a kind (a new link syntax, a new editor surface, a new property type holding links) has one obvious place to go, with no choice left between layers, helpers, or modules; complexity relocated, renamed, or exchanged for new complexity of similar weight counts as no improvement, and restructuring is on the table. Nothing temporary, transitional, compatibility-kept, unreachable, needlessly indirect, or left over from the work remains, with zero corpses; anything changed is reflected across the board, nothing done one way here and another way elsewhere unless that's genuinely correct; one implementation, one pattern, and one source of truth per thing, an exception carrying its reason where a reader meets it; the plan reflects the intended outcome rather than confining itself to what was already slated for change. Every net is measured with removals and additions apart, zero latency is added to a keystroke, a caret move, or a decoration build, and a future audit of this surface raises zero findings.
- **Principles:** the owner's, verbatim, deciding every judgment the plan makes and every call its execution meets.
  - "Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebase."
  - "Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly."
  - "Make decisions based on actual necessity without sacrifices or being negligent, but don't overcomplicate or over-engineer things when its maintainability and complexity outweigh the actual purpose."
  - "Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements."
  - "Consider various perspectives, multiple alternatives, and potentially relevant opportunities before deciding upon an approach or isolating options."
  - "Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct."
  - "Each responsibility is clarified and reads totally intentional, and the next change of a kind has one obvious place to go, with no choice left between layers, helpers, or modules. Complexity relocated, renamed, or exchanged for new complexity of similar weight counts as no improvement."
  - "We shouldn't simply port behavior that should be relocated when that's the better long-term approach."
  - "We shouldn't leave anything half-done, deliberately divergent, or deferred when doing so would undermine cohesion, completion, and always-intended behavior."
  - "Time and time again, past sessions have hand-rolled, re-implemented, or created near-duplicate designs of what already exists instead of using established shared things, or changing the near-duplicates to allow reuse — that's one of the core perspectives we must consider when evaluating any approach."
  - "Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered."
  - "There's opportunity for ending this with 'less stuff' and 'fewer ways to do the same thing, or unifying things that are unnecessarily different'."
  - "Odd-ones-out aren't allowed. Alignment work must reduce complexity and improve the codebase overall (net-less)."
  - "They're the same picker… There's no 'needs another trigger' here. They're the same damn thing."
  - "Ensure anything that resides within the data-layer and mutation lenses of this work does so cohesively and confidently coherent with the rest of the codebase and the intended paths."
  - "Ensure the elements… are all reused implementations of what already exists and done so in the ways that honor their intentions as reusable building blocks."
  - "resolve this with totality at its simplest form and most coherent source"; "truly always intended, consistent, and architecturally aligned… total cohesion within the system as if there wasn't any asymmetry to begin with."
  - "Time and time again, plans claim negative results and end up positive." "The floor is −100, and the plan explains exactly how many net things disappear and become properly consolidated."
  - "The result should read cohesively as a system; not just patch-on or independent tweaks or fixes."
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint`, from the repo root; each prints its own failures, and lint runs clean. Biome formats every TS write, so an edit failing on whitespace means it reformatted: re-read and retry. "Run the gates" in a task means these three.
- **Frozen:** `Core/Connections/aliasMemory.ts`, the `editAliases` mutate operation and `applyAliasEdit`, `updatePageMetadata`, and the metadata shard's shape; `Core/Contract/bridge.ts` (the `matrix:graph` channel's reply type changes only through the `MatrixGraphReply` it already imports); `Core/MarkdownPM/Engine/detect.ts`'s `loneEmbedTitle` and its four editor consumers; `Links/linkRest` and `pendingTitles`; `Core/Properties/value.ts`'s `fileName` sort for File values; `deleteCascade`'s Link-only strip (`cascade.ts:89`), a different question from which keys hold links; Remove Link's leftover `Title § Heading` text and the typing color's existence (owner's rulings).
- **The Number:** every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <BASELINE>..HEAD` and records the **Actionable** column (code minus comments; tests and docs excluded) in the Net Ledger beside the phase's two estimates, with removals and additions apart. Each estimate is a ceiling: a phase that lands above its honest band is reported in chat before the next phase opens, with what the increase buys. Phase 8 is typed on a scratch worktree and measured before it's committed; a running total above −100 is reported, never tidied by thinning a ruled behavior, and never halts the run (the owner's ruling, 10-16-2026): the closeout states, as a neutral account beside the count, what collapsed, reduced, simplified, or unified and what grew and why. The final report states the measured total against the 200 to 500 the audit set out to remove.
- **Shape:** this is a refactor with removals and fixes inside it. The behavioral baseline is the Brief's specification (§1 to §12), kept except where a task names a change, and proven by the tests each task rewrites or adds rather than asserted. Every removal task lists its consumers (the sibling sweep) and the never-delete list above holds throughout. Every fix task names what else consumed the old behavior.
- **Conventions:** finite states are unions plus exhaustive switches; no O(N), allocating, or layout-reading work lands on a keystroke, a caret move, or a decoration build, and every task that touches one of those paths states its cost; host-run code imports no React or UIX, and `Desktop/hostGraph.test.ts` and `Core/Contract/engineGraph.test.ts` stay green; comments are added only where a reader meets an exception and needs its reason, and the comments the Investigation lists as false are rewritten or removed by the task that falsifies them; commit messages are past tense and one to four sentences; nothing temporary, transitional, or compatibility-kept remains at a phase's end, and a one-line interim that a later phase retires is named as such in the task that writes it.
- **Execution:** the plan runs end to end autonomously, the owner reachable only at check-ins. Every review checkpoint dispatches its two agents to the `closeout-review` skill's standards (its four perspectives, correctness, simplification, cohesiveness, and consequences, and its core principles; its closing procedures, write-guards, and output format don't apply), and the orchestrator's own post-phase look weighs the landed work against the **Mandate** and **Principles** above before the next phase opens. An in-flight call is weighed against those and the plan's objectives, disclosed in chat, and recorded under *§Deviations* only where it changes an outcome. The three compaction checkpoints in *§Process Overview* sit before Phases 4, 6, and 9 (the owner's placement, 10-15-2026); each runs `c/pre-compaction`, re-instills the Mandate and Principles in the handoff exactly as the owner gave them, and stops until the owner re-prompts.
- **Rulings (Not Re-Raised):** `[](Page)` is a link drawn with its default label and `[x]()` isn't; a wikilink heading never holds `#`, and every writer falls back to the markdown form when a wikilink can't spell a slot; any link alone on its line with `!` first is an embed line in either syntax, out of the graph and in every other rule; both syntaxes tidy an emptied part when the caret leaves the whole link; markdown picks open the alias list and Return in a markdown destination rests in the label; `§Heading` runs and `[[#Heading]]` take one approach in values and cells, menu and glance included, the run's menu offering Open and Copy only; a Link value writes a wikilink wherever one spells, on edit and Rename alike; an alias typed into a link naming a heading is never remembered, with no setting to the contrary; Remove Title On Link Change drops the shown text only when the link pointed somewhere as it read before the edit, in the picker and paste alike, and in the Link field through the picker inside it once the field is the editor (a title retyped by hand keeps its alias there as it does in a body); Text values sort and filter on their shown text through the one rule, style-free (`Title § Heading`); the resolver lives in `Core/Connections/`; Return inside a link's shown slot rests past the link everywhere; the Link field opens on the whole written link and Rename is that field seated in the alias slot; the one-line fields scroll rather than wrap, with spellcheck off and the typing transforms kept; addresses keep today's stored form and today's raw resolution.
- **Neutral Gate:** the work ends with a `fable-high` neutral reviewer given only the BASELINE head, HEAD, and this intention, with no plan, log, or document: *"Pommora's page-to-page links (wikilinks and markdown links) and the alternate names a page remembers (aliases) are parsed, resolved, edited, rewritten, and displayed across about sixty files. This work leaves that code smaller and plainer: one grammar and one link shape per layer, one resolver, one owner per rule, one tracker for edits made inside a link, one picker model, and one title index the host can import, with no logic stated twice and no behavior lost except where its findings name it."* Every phase is written so that review passes.
- **Other Workstreams:** the Text Color plan (`.claude/Planning/Text Color/`) landed on `active` through `980a8f4e8` while Phase 1 ran, touching `Engine/{tokens,detect,paints}.ts`, `Input/{edits,format,formatState,markdownInput}.ts`, `cellStatic.tsx`, and the MarkdownPM and PropertiesPM documents; Phase 2's citations are anchored on it (`tokenizeChunk` blanks links, code, and math through `outsideVerbatim` before a paint matches, `wrappedSpan` became `insideMark(tk, f, t)`, and `format.ts` exports `innerRange` and `underSelection`). Its `46441ea74` styles a link inside a text color in `markdown-pm.css` through the same class list `linkClicks.ts:56` uses for "a link" (`.md-connection-resolved, .md-connection-ambiguous, .md-heading-symbol, .md-link`); this plan keeps those classes and `linkClass`, so the selector stands, and any later change to the one "is a link" class set carries it along. F-071's MarkdownPM sentence placing the heading-rename settle under `Guards/` lands after Phase 4 moves it; F-049's heading-name change touches the file the settle moves from, so whichever lands second rebases; F-066 and F-067 read the raw-HTML spans Phase 2's one gate asks about.
- **Out of Scope Everywhere:** the data layer, address normalization's stored form, the Matrix's drawing, Project Sapphire, and any new setting.

#### Process Overview

- [x] **Phase 1** — One Walk, One Title Index
  - [x] Task 1-1 · The one walk and the host-importable projections
  - [x] Task 1-2 · The renderer's projections, each its own memo
  - [x] Task 1-3 · The host's title checks read the one index
  - [x] Review Checkpoint
- [x] **Phase 2** — One Grammar, One Reader Set `[Gates at Task 2-4 for Tasks 2-1 to 2-4]`
  - [x] Task 2-1 · The one occurrence shape, the one template, and the one encoder
  - [x] Task 2-2 · The index's hit over the occurrence
  - [x] Task 2-3 · Tokens carry their occurrence
  - [x] Task 2-4 · The editor's three readers and the `§` fold
  - [x] Task 2-5 · One shown-slot question, and Return everywhere
  - [x] Review Checkpoint
- [x] **Phase 3** — One Written Shape, One Resolver `[Gates at Task 3-3 for Tasks 3-2 and 3-3]`
  - [x] Task 3-1 · `readLinkText`, `resolveLink`, `bareHeading`, and `wikiTitle`
  - [x] Task 3-2 · `ConnectionsApi` as `{ index, open, menu?, headingsOf }`
  - [x] Task 3-3 · Every consumer resolves through the one resolver
  - [x] Task 3-4 · `[](Page)` draws its default label
  - [x] Review Checkpoint
- [x] `[Compaction Checkpoint 1: c/pre-compaction with the MANDATE and PRINCIPLES re-instilled; stop, and continue only when re-prompted]`
- [x] **Phase 4** — One Tracker, One Baseline
  - [x] Task 4-1 · `linkWriting` replaces `linkTyping`
  - [x] Task 4-2 · `linkSettle` replaces `aliasOnLeave`, and every host flushes
  - [x] Task 4-3 · One Remove Title rule over the one baseline
  - [x] Task 4-4 · The heading-rename settle lives in `Links/`
  - [x] Review Checkpoint
- [x] **Phase 5** — One Picker Model
  - [x] Task 5-1 · The query is `{ syntax, part }` over the one reader set
  - [x] Task 5-2 · `commitEdit` switches on `part` and writes through the writer
  - [x] Task 5-3 · Return in a markdown destination, and the alias list uncapped
  - [x] Review Checkpoint
- [x] `[Compaction Checkpoint 2: c/pre-compaction with the MANDATE and PRINCIPLES re-instilled; stop, and continue only when re-prompted]`
- [x] **Phase 6** — One Set of Rules, One Writer
  - [x] Task 6-1 · The slot check, the drop, the carry, and `pageLinkText`
  - [x] Task 6-2 · One `follower` for both rename arms, cell-aware
  - [x] Task 6-3 · One shown-text rule for Remove Link, sort, and filter
  - [x] Task 6-4 · The alias rename field reports how its edit ended
  - [x] Review Checkpoint
- [x] **Phase 7** — Index Facts, Readers' Rule `[Gates at Task 7-3 for Tasks 7-1 and 7-3]`
  - [x] Task 7-1 · The `value` row and `linkKeysOf`
  - [x] Task 7-2 · The graph applies the rule
  - [x] Task 7-3 · The cascade applies the rule
  - [x] Review Checkpoint
- [x] `[Phase 8's worktree measurement reported against the −100 floor; no stop (owner's ruling, 10-16-2026: the floor is the goal, not a gate; the closeout explains concretely what collapsed, reduced, or unified beside the count)]`
- [x] **Phase 8** — One Editor Surface in Every Field `[Typed on a scratch worktree and measured before commit]`
  - [x] Task 8-1 · The value editor and its one-line mode
  - [x] Task 8-2 · The Link field, Rename, and the single-line Text field mount it
  - [x] Task 8-3 · The live drive and the field tests follow
  - [x] Review Checkpoint
- [x] `[Compaction Checkpoint 3: c/pre-compaction with the MANDATE and PRINCIPLES re-instilled and the Phase 8 measurement in hand; stop, and continue only when re-prompted]`
- [x] **Phase 9** — Documentation and the Ledger
  - [x] Task 9-1 · The feature documents read true
  - [x] Task 9-2 · The planning documents and W22 reconcile

**Net Ledger** (production lines, Actionable column; the orchestrator fills Measured after each phase's VERIFY). Two estimates per phase: the Investigation's (typed where a diff survived at the audit) and the plan's own AFTER count (every `+` line, long lines expanded as Biome wraps them at 100 columns; every elided removal measured at HEAD, with whole-file deletions and moves counted on both sides). Where they disagree, the band between them is the honest estimate, and each is a ceiling the measured number is reported against.

| Phase | Investigation Net | AFTER-Count Net | Honest Band | Basis | Measured Removed | Measured Added | Measured Net | Running |
|---|---|---|---|---|---|---|---|---|
| 1 | −81 | −81 | −81 | typed (`c5`, formatted, with the baseline strip); landed 9 above it: lint refused the one-line claimant push, the formatter wrapped the record and memo lines, and the trail chain needs its own map | 261 | 189 | −72 | −72 |
| 2 | ≈ −45 | ≈ −35 | −55 to −10 | no typed grammar diff survived; the AFTER count expands the long occurrence and reader lines; landed inside the band | 516 | 468 | −48 | −120 |
| 3 | ≈ −28 | ≈ −20 | −35 to +5 | half typed (`c4` +3, corrected); the label task moved here from Phase 2 (+16); landed 2 above the band: the label widget with its phantom drawing, plain-setting rule, and exact click, the formatter wrapping the resolver, and `linkValueFromEdit` rebuilding a target from a resolution until Phase 6 | 344 | 351 | +7 | −113 |
| 4 | ≈ −49 | ≈ −40 | −55 to −25 | re-typed design (`c11`, corrected); the settle's guard and flushes added; landed at −36 (`ad220222a`), then the review's fix round (`1eaef8c88`, +38) ended it 27 above the band: the settle in its own file beside its sibling (an import block), the field dropping with its opener (a wrong remember and a wrong rewrite made right), paste reading the one baseline (the ruled parity), the typing color on both syntaxes, a pasted link arming, and the writer split from the decision | 450 | 452 | +2 | −111 |
| 5 | ≈ −26 | ≈ −60 | −90 to −16 | typed `c8` −16 kept more structure than the three-arm commit and the one-return query (about 207 lines of `autocomplete.ts` leave against about 105 formatted arriving); unverified until typed; landed at −74 (`252809203`), then the review's fix round (`fd49d1189`, +36: the open-link reader reading an emptied slot, the query's shown text, the heading pick writing in place, the collapse carrying the rest) ended it inside the band | 292 | 254 | −38 | −149 |
| 6 | ≈ −17 | ≈ +2 | −10 to +12 | the rules and `follower` add about what they remove; landed at +53 (`63f79adbc`), then the review's fix round (`af8522954`, −1) ended it 40 above the band: the AFTER count priced the rules block, the fallback writer, the table escape, `shownProse`, and the heading pick's fallback at about +2 where each one-line rule wraps to three under the formatter; buys the three wrong results made right, a heading that can't be spelled falling back instead of going stale or splitting a wikilink, and paste writing a page-held address as that page (a heading-pick carry in the picker was weighed at about 45 lines and reversed) | 251 | 303 | +52 | −97 |
| 7 | ≈ 0 | ≈ +5 | 0 to +10 | `linkKeysOf`, the dedupe, and the `key` column; landed at +26 (`6197494b4`; +9 outside `Core/Testing`, whose contract case and double the script counts as code), then the review's fix round (`9e84b9eb4`, −11: the cascade reading the one rule instead of rebuilding its lookup, the rule folded to one export, the one-caller whole-value reader inlined) ended it 5 above the band; buys the staleness fix and the post-rule dedupe that keeps a Number key from shadowing a Link key | 94 | 109 | +15 | −82 |
| 8 | ≈ +24 | ≈ +50 | +35 to +65 | the one-line mode, seat, and commit lifecycle; measured on the worktree at +107 before commit, landed at +112 (`b0a1d843c`; the AFTER priced the one-line lifecycle, the popover chrome, the two surface options, and the field rules at about +50 where they format to twice that), then the review's fix round (`df3e2e987`, −41: the Number picker and the Link and Text popover wearing one chrome, the cancel made terminal, the dedupe on what the field reopens on, the seat paths ending alike, the height chains folded) and the picker's rename with the drive's re-expectation (`ff337396d`, +4) ended it 10 above the band; buys the ruled one surface in every field | 371 | 446 | +75 | −7 |
| 9 | 0 | 0 | 0 | docs | | | | |
| FV | | | | the final verification's simplification round (`ed3dd82c0`): the index and the rename rewriter read a link's name through the one reader (a wrong result made right: `[Notes](Notes.md)` kept its label on a rename where `[Notes](Notes)` carried it), `LinkTarget.shown`, one closer table, `keptShown`, `liveSlotAt`, and four wrappers inlined (the reviewer's estimate of −45 formatted to −16 once the import blocks and the helper's signature wrapped) | 120 | 104 | −16 | −23 |
| FV | | | | the final verification's adversarial lens and the owner's ruling that nothing is carried (`b20b16a3b`): three wrong results made right (a markdown label the grammar can't read back, written by the rename cascade, the picker, and the settle's fill; a heading re-pick ignoring Remove Title; a cancelled Text field keeping an alias from an edit it discarded), the registry read in memory everywhere, one duplicate-id policy and one path map, Paste As rows resolving through the host's index, the write-only relation count gone, the page shell's height chain scoped to the page, and the harness, test placement, and Number order aligned; the memory queue, the index plumbing, and the derived maps are the weight, the rest is ruled behavior | 117 | 167 | +50 | +27 |
| FV | | | | the neutral reviewer's corrections (`0d686c2e9`): the grammar owning its three fast gates, a citation's lone link read through the one grammar (`wholeLinkToken` gone), the Trash sweep reading the registry in memory (`linkDefs` gone), the title cache keyed once, a leading caret escaped rather than dropped and a label's escapes hidden on screen in the editor and the resting cell (a pre-existing raw draw the one writer's fallback made reachable), Return asking `shownEnd` first; the hidden escapes in the resting cell are the weight (+20) | 87 | 105 | +18 | +45 |
| **Total** | **≈ −222** | **≈ −179** | **−260 to −80** | the plan's own commits, summed | **2903** | **2948** | **+45** | **+45** |

The floor was −100 (the owner's ruling, 10-15-2026), re-ruled on 10-16-2026 as the goal rather than a gate. The plan's own commits landed at +45 Actionable lines: Phases 1 to 5 removed 149, Phases 6 to 8 added 142 for the ruled behaviors and the wrong results they made right, and the final verification's three rounds added 52, of which the simplification round took 16 away and the owner's ruling that nothing is carried and the neutral reviewer's corrections put 68 back as fixes. The Results document carries the account beside the count: what collapsed per layer, what the ruled behaviors cost, and what grew and why.

---

### Phase 1 — One Walk, One Title Index

**GOAL:** `recordsOf` becomes the only tree walk, the page projections move beside it keyed on collections alone, and `PageIndex.holders(title)` lets the host's delete, rename, and restore checks read the same index the window draws from, so `titlesOf` and its second walk go. The renderer's projections become per-projection memos keyed on what each reads, so an alias, lock, or icon edit no longer rebuilds the title index. This phase waits on nothing and is typed (`c5-full.diff`, corrected by the Investigation), so it lands first and alone.

#### Task 1-1

**TASK:** Give `EntityRecord` its own icon, move `pagesOf`, `pagesByIdOf`, `livePagePath`, and `pageIndexOf` beside `recordsOf` as memos keyed on collections alone, drop `ConnPage.icon`, and add `holders` to `PageIndex`.

**NOW:** `recordsOf` (`Core/Nexus/record.ts:15-38`) lists `{ id, kind, title, path }` per entity and is read only by the host's `indicesOf` and `remintLedger`. The renderer's `pagesOf`, `pagesByIdOf`, `livePagePath`, and `pageIndexOf` live in `treeIndex.ts:159-192` over `walk`, which bakes icons and so keys on `pageMetadata`; `ConnPage` carries `icon?` (`pageIndex.ts:9`) read only by `TileHost.tsx:220`. `buildPageIndex` answers `resolve` from a private `byTitle` map (`pageIndex.ts:34-56`).

**CHANGE**

- [x] Write `Core/Connections/pageIndex.test.ts`'s `holders` cases and watch them fail: `holders('alpha')` returns every page whose normalized title matches, in tree order; `holders('nothing')` is `[]`; `resolve` derives from it (one holder resolved, two ambiguous, none phantom).
- [x] In `record.ts`, add `icon?` to `EntityRecord`, let `recordsOf`'s `add` carry it, and add `pagesOf`, `pagesByIdOf` (with its one-line reason), `livePagePath`, and `pageIndexOf` on `entityMemo([])`. A record's container is its path's directory (a page's or set's folder, a space's context folder, nothing for a collection), which the renderer derives with `relDirname` rather than the walk carrying it.
- [x] In `pageIndex.ts`, remove `ConnPage.icon`, add `holders` to the interface, and derive `resolve` from `holdersOf`.
- [x] Repoint `TileHost.tsx:220` to `tree.config.pageMetadata[page.id]?.icon`.
- [x] In `remintLedger.ts:17-27`, build `entries` and `claimants` in `projectBaseline`'s one pass through `plain`, so the persisted baseline keeps its four-field shape.
- [x] Move the eleven imports: `propertyMenuActions.ts:107`, `PageHistoryWindow.tsx:39,72` (`livePagePath` from `record`, `trailOf` stays on `treeIndex`), `matrixInput.ts:63`, `navResolve.ts:44` (and `navResolve.test.ts`), `editorHost.tsx:53`, `assignValue.ts:57`, `matrixSlice.ts:181,187` (`recordsByIdOf`, renamed `nodesByIdOf` beside `nodesOf`, stays on `treeIndex` with its five readers), `nexusSlice.ts:253`, `pageConnections.ts:31`, `useBridgeSubscriptions.ts:56`, `TileHost.tsx:100`.
- [x] `destinationTree.test.ts`'s `treeOf` fixture gains `contexts: []` (`recordsOf` reads it).

**AFTER**

```Core/Nexus/record.ts diff
@@ header @@
-// The tree's entities as one list, which the host's lookups project from.
+// The tree's one walk, and the lookups both processes project from it.
+import { buildPageIndex, type ConnPage, type PageIndex } from '../Connections/pageIndex'
@@ EntityRecord @@
   path: string
+  /** The entity's own icon field; a page's lives in its page metadata instead. */
+  icon?: string
@@ recordsOf @@
-  const add = ({ id, kind, title, path }: EntityRecord): void => {
-    records.push({ id, kind, title, path })
+  const add = ({ id, kind, title, path, icon }: EntityRecord): void => {
+    records.push({ id, kind, title, path, icon })
   }
   …
   for (const g of tree.contexts) {
-    add({ id: g.def.id, kind: 'context', title: g.def.title, path: contextDirRel(g.def.title) })
+    add({ id: g.def.id, kind: 'context', title: g.def.title, path: contextDirRel(g.def.title), icon: g.def.icon })
     g.spaces.forEach(add)
   }
@@ after recordById @@
+export const pagesOf = entityMemo([], (tree): readonly ConnPage[] =>
+  recordsOf(tree)
+    .filter((r) => r.kind === 'page')
+    .map(({ id, title, path }) => ({ id, title, path })),
+)
+
+/** Last-wins where two files claim one id: the window shows the page; the host's writers refuse it (`heldPages.ts`'s `indicesOf`). */
+export const pagesByIdOf = entityMemo(
+  [],
+  (tree): ReadonlyMap<string, ConnPage> => new Map(pagesOf(tree).map((p) => [p.id, p])),
+)
+
+export const livePagePath = (
+  tree: NexusTree | null,
+  target: { id: string; path: string },
+): string => (tree && pagesByIdOf(tree).get(target.id)?.path) ?? target.path
+
+export const pageIndexOf = entityMemo([], (tree): PageIndex => buildPageIndex(pagesOf(tree)))
```

```Core/Connections/pageIndex.ts diff
@@ ConnPage @@
   path: string
-  icon?: string
 }
@@ PageIndex @@
 export interface PageIndex {
+  holders: (rawTitle: string) => readonly ConnPage[]
   resolve: (rawTitle: string) => ConnResolution
   candidates: (query: string, limit?: number) => ConnPage[]
 }
-export function buildPageIndex(pages: ConnPage[]): PageIndex {
+export function buildPageIndex(pages: readonly ConnPage[]): PageIndex {
@@ return @@
+  const holdersOf = (rawTitle: string): readonly ConnPage[] =>
+    byTitle.get(normalizeTitle(rawTitle)) ?? []
   return {
+    holders: holdersOf,
     resolve(rawTitle) {
-      const holders = byTitle.get(normalizeTitle(rawTitle))
-      if (!holders || holders.length === 0) return { status: 'phantom' }
+      const holders = holdersOf(rawTitle)
+      if (holders.length === 0) return { status: 'phantom' }
```

```Core/Nexus/remintLedger.ts diff
@@ projectBaseline @@
+// The persisted baseline keeps the four fields it always had; a record's parent and icon are the renderer's.
+const plain = ({ id, kind, title, path }: EntityRecord): EntityRecord => ({ id, kind, title, path })
 export function projectBaseline(tree: NexusTree): Projection {
   const claimants: Record<string, EntityRecord[]> = {}
+  const entries: Record<string, EntityRecord> = {}
   for (const r of recordsOf(tree)) {
-    claimants[r.id] ??= []
-    claimants[r.id].push(r)
+    const p = plain(r)
+    ;(claimants[r.id] ??= []).push(p)
+    entries[r.id] ??= p
   }
   const duplicates = Object.fromEntries(
     Object.entries(claimants).filter(([, claims]) => claims.length > 1),
   )
-  return { entries: recordById(tree), duplicates }
+  return { entries, duplicates }
 }
```

`entries` keeps `recordById`'s first-listed-wins (`record.ts:40-47`), built in the same pass; `recordById`'s import leaves the file if nothing else in it reads it.

```Core/Tiles/TileHost.tsx diff
@@ pageInfo @@
-            icon: entityIcon('page', page.icon, defaultIcons),
+            icon: entityIcon('page', tree.config.pageMetadata[page.id]?.icon, defaultIcons),
```

**VERIFY**

- [x] `remintLedger.test.ts:76-81,98-104,191-196` pass unchanged (the `c5` `parent` edits don't carry over).
- [x] `pageIndex.test.ts`'s new `holders` cases pass.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-2

**TASK:** Rebuild `treeIndex.ts` as the renderer's projections over `recordsOf`, each its own `entityMemo` keyed on what it reads; `TreeIndex`, `indexFor`, and `walk` go.

**NOW:** `indexFor` (`treeIndex.ts:48-58`) memoizes `walk` on six inputs including `pageMetadata`, and every projection hangs off its `nodes`, so an alias edit rebuilds the search entries, the nav keys, and the title index alike. `walk` (`:60-178`) re-walks contexts, collections, sets, and pages to bake glyphs and trails.

**CHANGE**

- [x] Rewrite `treeIndex.test.ts`: `:5-16` import `pageIndexOf`, `pagesByIdOf`, `pagesOf`, `recordById`, `recordsOf` from `./record`; `:108-118` becomes "a page resolves its icon from pageMetadata, and a pageMetadata-only change yields a new trail index but keeps the title index" (`expect(pageIndexOf(iconed)).toBe(pageIndexOf(t))`); `:201-213` holds `reconcileIndexOf`, `nodesOf`, `pageIndexOf`, `recordsOf` across a settings change and rebuilds `reconcileIndexOf` when `unreadable` moves. Watch the title-index identity case fail first.
- [x] Write `treeIndex.ts` as below; `nodesOf` builds parents through a `chains` map keyed by path, looking each record's container up by `relDirname(path)` (`Paths/posix.ts:37`, the tree patcher's own spelling); `treeIndex.test.ts` pins a page in a set, a page in a collection, and a space under its context resolving the same trails as today.

**AFTER**

```Core/Nexus/treeIndex.ts diff
@@ header @@
-// One walk per tree; every table below is a lazy projection of its records, cached on the tree object. A new lookup belongs here, never as its own walk. The record LIST is the source: …
+// The renderer's projections of the one walk in `record.ts`, each cached on the tree object; glyphs and trails resolve here, beside the design kit.
-import type { EntityRecord } from './record'
+import { type EntityRecord, recordsOf } from './record'
-import type { CollectionNode, NexusTree, PageNode, SetNode, SpaceNode } from './tree'
+import type { CollectionNode, NexusTree, SetNode, SpaceNode } from './tree'
-import { buildPageIndex, type ConnPage, type PageIndex } from '../Connections/pageIndex'
@@ TreeIndex, indexFor, walk @@
-interface TreeIndex { … }
-const indexFor = entityMemo([ … six inputs … ], (tree): TreeIndex => ({ nodes: walk(tree) }))
-function walk(tree: NexusTree): NodeRecord[] { … 118 lines … }
-export const nodesOf = (tree: NexusTree): readonly NodeRecord[] => indexFor(tree).nodes
+export const nodesOf = entityMemo(
+  [(t) => t.contexts, (t) => t.nexus.name, (t) => t.config.profileIcon, (t) => t.config.pageMetadata, (t) => t.config.personalization.defaultIcons],
+  (tree): readonly NodeRecord[] => {
+  const di = tree.config.personalization.defaultIcons
+  const nodes: NodeRecord[] = [
+    { key: navKey({ kind: 'homepage' }), kind: 'homepage', id: '', title: tree.nexus.name, icon: iconNameOr(tree.config.profileIcon, DEFAULT_NEXUS_ICON), path: '', parents: [] },
+    { key: navKey({ kind: 'matrix' }), kind: 'matrix', id: '', title: MATRIX_TITLE, icon: MATRIX_ICON, path: '', parents: [] },
+  ]
+  // A record's container is its path's directory: a page's or set's folder, a space's context folder, nothing for a collection; the walk lists containers before what they hold, so the chain is always there.
+  const chains = new Map<string, TrailNode[]>()
+  for (const { kind, id, title, path, icon: own } of recordsOf(tree)) {
+    const ownIcon = kind === 'page' ? tree.config.pageMetadata[id]?.icon : own
+    const icon = entityIcon(kind, ownIcon, di)
+    if (kind === 'context') {
+      chains.set(path, [{ kind, id, title, icon, path: '' }])
+      continue
+    }
+    const parents = chains.get(relDirname(path)) ?? []
+    const node: NodeRecord = { key: navKey({ kind, id }), kind, id, title, icon, ownIcon, path, parents }
+    nodes.push(node)
+    if (kind === 'collection' || kind === 'set') chains.set(path, [...parents, node])
+  }
+  return nodes
+})
@@ reconcileIndexOf @@
-export function reconcileIndexOf(tree: NexusTree): ReconcileIndex { const ix = indexFor(tree); if (!ix.reconcile) { … for (const r of ix.nodes) switch (r.kind) { case 'homepage': case 'matrix': break; … } … } return ix.reconcile }
+export const reconcileIndexOf = entityMemo(
+  [(t) => t.contexts, (t) => t.unreadable],
+  (tree): ReconcileIndex => {
+    … the same five sets and maps …
+    for (const r of recordsOf(tree))
+      switch (r.kind) {
+        case 'context':
+          break
+        … the space, collection, set, and page cases unchanged …
+      }
+    return { spaces, collections, sets, pages, pagesByPath, withheld: withheldIn(tree.unreadable) }
+  },
+)
@@ resolveIndexOf, ancestryOf, searchEntriesOf, nodesByIdOf, navKeysOf, spaceLinksOf @@
+export const resolveIndexOf = entityMemo([nodesOf], (tree): ResolveIndex =>
+  new Map<string, NavCore>(nodesOf(tree).map((r) => [r.key, { icon: r.icon, title: r.title, path: r.parents }])),
+)
+const ancestries = entityMemo([nodesOf], (tree): ReadonlyMap<string, TrailNode[]> =>
+  new Map(nodesOf(tree).map((r) => [r.key, [...r.parents, r]])),
+)
+export const ancestryOf = (tree: NexusTree, ref: NavRef | SelectTarget): TrailNode[] | null =>
+  ancestries(tree).get(navKey(toNavRef(ref))) ?? null
+export const searchEntriesOf = entityMemo([(t) => t.contexts, (t) => t.nexus.name], (tree): SearchEntry[] => {
+  … the byKind grouping unchanged, over nodesOf(tree) …
+})
+export const nodesByIdOf = entityMemo([nodesOf], (tree): ReadonlyMap<string, NodeRecord> =>
+  new Map(nodesOf(tree).filter((r) => r.id !== '').map((r) => [r.id, r])),
+)
+export const navKeysOf = entityMemo([(t) => t.contexts], (tree): string[] => nodesOf(tree).map((r) => r.key))
+export const spaceLinksOf = entityMemo([(t) => t.contexts], (tree): ReadonlyMap<string, Record<string, string[]>> => {
+  … the body of today's spaceLinksOf, returning `out` …
+})
-export function pagesOf … / export const livePagePath … / export function pagesByIdOf … / export function pageIndexOf …   (moved to record.ts in Task 1-1)
```

`searchEntriesOf` and `navKeysOf` carry no icon, so they key on contexts (and the Nexus name for search), never on `pageMetadata`; `nodesOf` bakes glyphs, so it keys on every field it reads (`Sidebar.tsx:296` reads `ownIcon`), and `resolveIndexOf`, `ancestries`, and `nodesByIdOf` key on `nodesOf` itself, the one thing they read; `recordById` keys on `recordsOf` the same way. The elided bodies (`reconcileIndexOf`'s sets and cases, `searchEntriesOf`'s grouping, `spaceLinksOf`'s body) are today's lines moved under their memo unchanged; `Actions/destinationTree.ts:1`'s header reads "the tree index's one walk" and now names `record.ts`.

**VERIFY**

- [x] `treeIndex.test.ts` passes, the title-index identity case included; `navResolve.test.ts` and `destinationTree.test.ts` pass.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (no projection re-walks the tree; every memo lists what it reads).

#### Task 1-3

**TASK:** `titleHeldOutside` and `frozenWorld` read `pageIndexOf(tree).holders`, and `titlesOf` goes.

**NOW:** `titlesOf` (`heldPages.ts:46-56`) builds a second normalized-title map over `indicesOf` (`:16-22`, itself over `recordsOf`), read by `titleHeldOutside` (`:59-64`) and `frozenWorld` (`:67-75`) for a delete, a rename, and a Trash restore. Neither function has a direct test; `cascade.test.ts`, `rename` and `restore` tests exercise them.

**CHANGE**

- [x] Write `Core/Nexus/heldPages.test.ts` and watch it fail: `titleHeldOutside(root, 'Alpha', 'Notes/Alpha.md')` is false when only that file holds the title and true when a second page does; `frozenWorld(tree, ['Landing']).holds('landing')` is true for an arriving title and for a held one, false otherwise.
- [x] Write `heldPages.ts` as below.

**AFTER**

```Core/Nexus/heldPages.ts diff
@@ header and imports @@
-// The held tree's pages by path, by id, and by title, for the host's writers.
+// The held tree's pages by path and by id, for the host's writers; titles answer from the one index.
-import { isAtOrUnder, relative, titleFromPath } from '../Paths/posix'
+import { isAtOrUnder, relative } from '../Paths/posix'
-import { recordsOf } from './record'
+import { pageIndexOf, pagesOf } from './record'
@@ indicesOf @@
-  for (const r of recordsOf(tree)) {
-    if (r.kind !== 'page') continue
-    byPath.set(r.path, r.id)
-    byId.set(r.id, byId.has(r.id) ? null : r.path)
+  for (const p of pagesOf(tree)) {
+    byPath.set(p.path, p.id)
+    byId.set(p.id, byId.has(p.id) ? null : p.path)
   }
@@ titlesOf @@
-// Walked only when a delete, rename, or restore asks, never on the value writes that rebuild the rest.
-export const titlesOf = entityMemo([], (tree): ReadonlyMap<string, readonly string[]> => { … })
@@ titleHeldOutside @@
-  return (titlesOf(tree).get(normalizeTitle(title)) ?? []).some((path) => !isAtOrUnder(path, rel))
+  return pageIndexOf(tree)
+    .holders(title)
+    .some((p) => !isAtOrUnder(p.path, rel))
@@ frozenWorld @@
-  const held = titlesOf(tree)
+  const index = pageIndexOf(tree)
   const arriving = new Set(landing.map(normalizeTitle))
   return {
-    holds: (title) => {
-      const key = normalizeTitle(title)
-      return held.has(key) || arriving.has(key)
-    },
+    holds: (title) => index.holders(title).length > 0 || arriving.has(normalizeTitle(title)),
   }
```

**VERIFY**

- [x] `heldPages.test.ts`, `cascade.test.ts`, and the rename and restore tests pass; `Desktop/hostGraph.test.ts` and `engineGraph.test.ts` stay green (`record.ts` now imports `pageIndex.ts`, which is host-clean).
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] The host graph admits no `.tsx` and no new external through `record.ts` → `pageIndex.ts`.
- [x] A `pageMetadata`-only tree change keeps `pageIndexOf`, `searchEntriesOf`, and `navKeysOf` by identity and rebuilds `resolveIndexOf`.
- [x] Trails derived from paths match today's walked trails for a page in a set, a page in a collection, a page in a set inside a set, and a space under its context (containment is path nesting, the Nexus's locked legibility).
- [x] The persisted remint baseline keeps `{ id, kind, title, path }`.
- [x] Net Ledger: Phase 1 measured.

---

### Phase 2 — One Grammar, One Reader Set

**GOAL:** Every link in the system is read through one walk into one flat occurrence, and every place the editor needs a link at or around the caret asks one of three readers over that walk. The second markdown grammar, its span type, three half-typed readers, the destination re-split, and the `§` transform's own file go; tokens carry their occurrence so no consumer rebuilds one; the markdown template, the default label, and the `#`-safe encoder are written once; and one slot question (`partOf`) serves Return, `]`, `[`, the typing transforms, the `§` transform, and the picker, with Return inside a link resting past it in every editor place. This phase is the foundation the resolver, the tracker, the picker, and the rules all read, so it lands as one change: Tasks 2-1 to 2-4 change the shape every reader of an occurrence holds, so their tests are written first and the gates run once all four are in, at Task 2-4; Task 2-5 runs the gates on its own.

#### Task 2-1

**TASK:** One markdown pattern (an empty label kept, an empty destination refused), one `LinkOccurrence` for both syntaxes with the same fields in start order, one `namesPage`, one `markdownLink` template, one `defaultLabel`, `encodeLinkTarget` escaping `#`, the codec decoding halves, the tuple span exported once, and `readLinkText` reading the markdown halves from the occurrence until Task 3-1 rewrites it.

**NOW:** `links.ts:6-15` holds two regexes (`markdownLinkRegex` at `min 1`, `emptyTolerantLinkRegex` at `min 0`), `markdownLinkAt` (`:46-64`) with its own `MarkdownLinkSpans` and `#` split, `linkDestinationStart` (`:67-73`), `opensFragment` (`:35`), and `pageTarget` (`:98-104`), which splits at `#` a second time for the codec. `connections.ts:21-23` is a union with `alias` on one arm and `label`/`destination` on the other, and `linkOccurrences` (`:44-57`) yields wikilinks then markdown links, unsorted. `encodeLinkTarget` (`:76-82`) leaves `#` raw (probed: `markdownPageLink('C# Notes', 'Intro')` reads back as a link to `C`). Three templates spell `[label](dest)`: `composeWebpageEmbedLine` (`links.ts:27`), `markdownPageLink` (`:86`), and `serializeLink` (`linkValue.ts:111`). `defaultLabel` is spelled title-first in `markdownPageLink` and heading-first in `emptied`. `connectionText(title, alias?, heading?)` takes the alias before the heading, so four callers pass `undefined` to reach the heading. `Span` is declared locally in `connections.ts:12`, `scan.ts:16`, `tokens.ts:30`, and as a wider union in `docScan.ts:61`.

**CHANGE**

- [x] Rewrite `connections.test.ts:15-30` for the one shape (`shown` for both syntaxes; a markdown occurrence yields `title`, `heading`, `shown`), add `[](Page)` as an occurrence with an empty `shown` and `[x]()` as none, add `[[A]] [b](B)` yielding in start order, rewrite `:88,108-111` for the `(title, heading?, alias?)` order, and watch them fail. In `links.test.ts`, drop `:154-209` (`linkDestinationStart`), rewrite `:81-118,138,145` for the half-decoders (`targetTitle('A%23B', false)` → `A#B`, `targetTitle('https://example.com', false)` → null, `targetFragment('Intro%20A')` → `Intro A`), and add `encodeLinkTarget('C# Notes')` → `C%23%20Notes`, `markdownPageLink('P', 'H')` → `[H](P#H)`, `markdownPageLink('C# Notes', 'Intro')` round-tripping through `linkOccurrences` to title `C# Notes`, and `connectionText('A', 'H', 'x')` → `[[A#H|x]]`, `connectionText('A', '', '')` → `[[A#|]]`.
- [x] Export `type Span = [number, number]` from `Engine/markdownCode.ts`; `connections.ts`, `scan.ts`, `tokens.ts`, and `links.ts` import it and drop their local declarations; `docScan.ts:61`'s union (which also admits `{ from, to }`) is renamed `SpanLike`, with its one importer `blockModel.ts:3`.
- [x] Write `links.ts` and `connections.ts` as below; `composeWebpageEmbedLine`'s two callers (`pasteAsMenu.ts:108`, `embedInsert.ts:62`) write `` `!${markdownLink(url, '')}` ``; `serializeLink` (`linkValue.ts:111`) becomes `label ? markdownLink(url, label) : url`; `detect.ts:416,427` read `markdownLinkRegex()`.
- [x] Reorder `connectionText` to `(title, heading?, alias?)` and let a present-but-empty heading or alias spell its slot (`[[A#]]`, `[[A|]]`), which Phase 5's slot-opening picks need. Sweep its eight callers: `linkValue.ts:118`, `LinkCell.tsx:48`, `pageMenuActions.ts:54`, `gripMenu.ts:92` drop their `undefined`; `linkValue.ts:205` swaps its arguments (`connectionText(next.title, next.heading, shown)`, which compiles either way); `adoptFile.ts:53,64` and `assetWrite.ts:31` pass a title only and are untouched; confirm no caller passes `''` for an absent heading (`pageTarget` builds `heading` only when non-empty; `PageTarget.heading` is optional and read with `?.`).
- [x] `connections.ts`'s `parseConnectionText` reads `o.shown` for the alias (it folds into `wikiTitle` in Phase 3); `linkValue.ts`'s `readLinkText` reads the markdown halves from the occurrence as below (Task 3-1 replaces the function).

**AFTER**

```Core/Connections/links.ts diff
@@ patterns @@
-const LINK_LABEL = (min: 0 | 1): string => `((?!\\^)(?:[^\\]\\\\\\r\\n]|\\\\.){${min},255})`
-const LINK_DEST = (min: 0 | 1): string =>
-  `((?:[^()\\r\\n]|\\((?:[^()\\r\\n]|\\([^()\\r\\n]*\\))*\\)){${min},2048})`
-export const markdownLinkRegex = (): RegExp =>
-  new RegExp(`\\[${LINK_LABEL(1)}\\]\\(${LINK_DEST(1)}\\)`, 'dg')
-/** Every other link grammar refuses empty halves, so the surfaces that recognize a link mid-authoring read this one. */
-export const emptyTolerantLinkRegex = (): RegExp =>
-  new RegExp(`\\[${LINK_LABEL(0)}\\]\\(${LINK_DEST(0)}\\)`, 'dg')
+// The label's cap is load-bearing (an alternation under a quantifier backtracks quadratically on a long unclosed `[` run), it may be empty, and it may not open with `^`, which GFM reads as a footnote reference. The destination needs a character and admits parentheses nested two deep, what cmark renders.
+const LINK_LABEL = '((?!\\^)(?:[^\\]\\\\\\r\\n]|\\\\.){0,255})'
+const LINK_DEST = '((?:[^()\\r\\n]|\\((?:[^()\\r\\n]|\\([^()\\r\\n]*\\))*\\)){1,2048})'
+export const markdownLinkRegex = (): RegExp => new RegExp(`\\[${LINK_LABEL}\\]\\(${LINK_DEST}\\)`, 'dg')
@@ templates @@
-/** The ONLY assembly path: `serializeLink` emits no bang and collapses an empty alias to the bare URL, so composing through it would write a line the detector refuses. */
-export function composeWebpageEmbedLine(label: string, url: string): string {
-  return `![${escapeLabel(label)}](${url})`
-}
+/** The one markdown template every writer spells a link through. */
+export const markdownLink = (dest: string, label: string): string => `[${escapeLabel(label)}](${dest})`
+
+/** What a markdown link shows when its label is empty, and what a picked link's label defaults to. */
+export const defaultLabel = (title: string, heading?: string): string => heading || title
@@ namesPage @@
-const namesPage = (pageHalf: string): boolean =>
+export const namesPage = (pageHalf: string): boolean =>
   !pageHalf.includes('/') && !HAS_SCHEME.test(pageHalf.trim())
-/** Whether a `#` written after `head` … */
-export const opensFragment = …
-interface MarkdownLinkSpans { … }
-export function markdownLinkAt(…) { … }
-export function linkDestinationStart(…) { … }
@@ encodeLinkTarget @@
-// `encodeURI` leaves parens and colons alone; a raw colon declares a target a URL and a lone `(` leaves the link untokenizable, so both are escaped on top. …
+// `encodeURI` leaves parens, colons, and `#` alone; a raw colon declares a target a URL, a lone `(` leaves the link untokenizable, and a raw `#` is where the reader splits the heading off, so all three are escaped on top. …
-    return encodeURI(target).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/:/g, '%3A')
+    return encodeURI(target)
+      .replace(/\(/g, '%28')
+      .replace(/\)/g, '%29')
+      .replace(/:/g, '%3A')
+      .replace(/#/g, '%23')
@@ markdownPageLink @@
 export function markdownPageLink(title: string, heading?: string, label?: string): string {
-  const dest = encodeLinkTarget(title) + (heading ? `#${encodeLinkTarget(heading)}` : '')
-  return `[${escapeLabel(label ?? (title || heading || ''))}](${dest})`
+  const dest = encodeLinkTarget(title) + (heading === undefined ? '' : `#${encodeLinkTarget(heading)}`)
+  return markdownLink(dest, label ?? defaultLabel(title, heading))
 }
@@ codec @@
-const pageTarget = (rawTarget: string): { page: string; fragment: string } | null => { … }
-// Read on the raw target: a URL's scheme and separators are literal, while an encoded page title spells them out. The `#` is split before decoding so an encoded `%23` stays inside the title.
-export function targetTitle(rawTarget: string): string | null {
-  const t = pageTarget(rawTarget)
-  if (!t) return null
-  const decoded = decodeLinkTarget(t.page).trim()
-  if (!decoded) return t.fragment ? '' : null
-  return stripMarkdownExt(decoded)
-}
-export function targetNamesFile(rawTarget: string): boolean { … pageTarget … }
-export function targetFragment(rawTarget: string): string { … pageTarget … }
+// The halves arrive already split by the occurrence, so an encoded `%23` decodes inside the title. An address names no page; a title that decodes to nothing is the page itself when a heading follows, and no page at all otherwise.
+export const targetTitle = (titleHalf: string, hasHeading: boolean): string | null => {
+  if (!namesPage(titleHalf)) return null
+  const decoded = decodeLinkTarget(titleHalf).trim()
+  if (!decoded) return hasHeading ? '' : null
+  return stripMarkdownExt(decoded)
+}
+export const targetNamesFile = (titleHalf: string): boolean => isMarkdownFile(decodeLinkTarget(titleHalf))
+export const targetFragment = (headingHalf: string): string => decodeLinkTarget(headingHalf).trim()
```

```Core/Connections/connections.ts diff
@@ imports @@
-import { markdownLinkRegex } from './links'
-import { type CodeMask, codeTouches, overlaps } from '../MarkdownPM/Engine/markdownCode'
+import { markdownLinkRegex, namesPage } from './links'
+import { type CodeMask, codeTouches, overlaps, type Span, trimmedRange } from '../MarkdownPM/Engine/markdownCode'
@@ shapes @@
-type Span = [number, number]
-export interface LinkSpans { full: Span; title: Span; heading: Span | null; alias: Span | null }
-export type LinkOccurrence =
-  | ({ syntax: 'wiki' } & LinkSpans)
-  | { syntax: 'markdown'; full: Span; label: Span; destination: Span }
+/** One link of either syntax, its slots as spans into the text, the same fields in both arms: `title` is a wikilink's page half or a markdown destination up to a page-naming `#` (the whole destination otherwise, trimmed), `heading` what follows that `#`, and `shown` the alias or the label, which a markdown link always has. */
+export type LinkOccurrence =
+  | { syntax: 'wiki'; full: Span; title: Span; heading: Span | null; shown: Span | null }
+  | { syntax: 'markdown'; full: Span; title: Span; heading: Span | null; shown: Span }
+/** The three slots a caret can sit in. */
+export type LinkPart = 'title' | 'heading' | 'shown'
@@ linkSpans @@
-function linkSpans(m: RegExpMatchArray): LinkSpans | null {
+function wikiSpans(m: RegExpMatchArray): LinkOccurrence | null {
   const at = m.index
   const g = m.indices?.groups
   if (at == null || !g?.page) return null
   const page = g.page
   const heading = g.heading ?? null
   if (page[1] === page[0] && heading === null) return null
   const alias = g.alias ?? null
   const unescaped = (r: Span): Span =>
     alias !== null && m[0][r[1] - 1 - at] === '\\' ? [r[0], r[1] - 1] : r
   return {
+    syntax: 'wiki',
     full: [at, at + m[0].length],
     title: heading === null ? unescaped(page) : page,
     heading: heading === null ? null : unescaped(heading),
-    alias,
+    shown: alias,
   }
 }
+
+// The destination splits at its first raw `#` only when the half before names a page, so an address keeps one undivided title; it splits before decoding, so `%23` stays inside the title.
+function markdownSpans(text: string, [full, label, dest]: [Span, Span, Span]): LinkOccurrence {
+  const [from, to] = trimmedRange(text, dest[0], dest[1])
+  const hash = text.slice(from, to).indexOf('#')
+  const splits = hash !== -1 && namesPage(text.slice(from, from + hash))
+  return {
+    syntax: 'markdown',
+    full,
+    title: splits ? [from, from + hash] : [from, to],
+    heading: splits ? [from + hash + 1, to] : null,
+    shown: label,
+  }
+}
@@ linkOccurrences @@
-/** Every connection and markdown link in `text` that code doesn't touch, with empty slots kept. … */
+/** Every connection and markdown link in `text` that code doesn't touch, in start order, with empty slots kept. */
 export function linkOccurrences(text: string, inCode: CodeMask): LinkOccurrence[] {
   const out: LinkOccurrence[] = []
   for (const m of text.matchAll(pageLinkPattern())) {
-    const s = linkSpans(m)
-    if (s && !codeTouches(text, inCode, s.full)) out.push({ syntax: 'wiki', ...s })
+    const o = wikiSpans(m)
+    if (o && !codeTouches(text, inCode, o.full)) out.push(o)
   }
   for (const m of text.matchAll(markdownLinkRegex())) {
-    const [full, label, destination] = m.indices as [Span, Span, Span]
+    const spans = m.indices as [Span, Span, Span]
+    const [full] = spans
     if (codeTouches(text, inCode, full)) continue
     if (!out.some((o) => o.syntax === 'wiki' && overlaps(o.full, full)))
-      out.push({ syntax: 'markdown', full, label, destination })
+      out.push(markdownSpans(text, spans))
   }
-  return out
+  return out.sort((a, b) => a.full[0] - b.full[0])
 }
@@ connectionText @@
-export function connectionText(title: string, alias?: string, heading?: string): string {
-  const target = heading ? `${title}#${heading}` : title
-  const named = alias && keepsAlias(alias, target) ? alias : undefined
-  return named ? `[[${target}|${named}]]` : `[[${target}]]`
+/** A present-but-empty heading or alias spells its slot (`[[A#]]`, `[[A|]]`): the picker opens a slot by writing it. */
+export function connectionText(title: string, heading?: string, alias?: string): string {
+  const target = heading === undefined ? title : `${title}#${heading}`
+  const named = alias !== undefined && (alias === '' || keepsAlias(alias, target)) ? alias : undefined
+  return named === undefined ? `[[${target}]]` : `[[${target}|${named}]]`
 }
```

```Core/Connections/linkValue.ts diff
@@ readLinkText (interim until Task 3-1) @@
   const md = whole?.syntax === 'markdown' ? whole : null
-  const alias = md
-    ? unescapeLabel(s.slice(md.label[0], md.label[1])).trim() || undefined
-    : undefined
-  const dest = md ? s.slice(md.destination[0], md.destination[1]).trim() : s
-  const title = md ? targetTitle(dest) : null
+  const alias = md ? unescapeLabel(s.slice(...md.shown)).trim() || undefined : undefined
+  // The halves come from the occurrence; the address is the destination whole.
+  const titleHalf = md ? s.slice(...md.title) : s
+  const headingHalf = md?.heading ? s.slice(...md.heading) : null
+  const dest = headingHalf === null ? titleHalf : `${titleHalf}#${headingHalf}`
+  const title = md ? targetTitle(titleHalf, headingHalf !== null) : null
   const res = title === null ? undefined : resolve?.(title)
   if (
     title !== null &&
-    (targetNamesFile(dest) || (res ? res.status !== 'phantom' : !isValidLink(dest)))
+    (targetNamesFile(titleHalf) || (res ? res.status !== 'phantom' : !isValidLink(dest)))
   )
-    return pageTarget('markdown', title, targetFragment(dest) || undefined, alias, res)
+    return pageTarget('markdown', title, (headingHalf && targetFragment(headingHalf)) || undefined, alias, res)
```

`scan.ts:39-41`'s `sectionRunsIn` drops its `.sort`, since the walk yields in order. The one sort per walk replaces two loops' worth of readers re-sorting; it runs on the walk's own output and adds no allocation per keystroke beyond the array the walk already builds.

**VERIFY**

- [x] `connections.test.ts` and `links.test.ts` pass as rewritten; `detect.test.ts` passes (`loneWebpageEmbed` with an empty label still refuses an empty address).
- [x] The gates run at Task 2-4, once every reader of the occurrence has moved.
- [x] Check for unnecessary code or mistakes (no second markdown pattern, no second `#` split, no second template anywhere under `Core/`).

#### Task 2-2

**TASK:** `LinkHit` carries the occurrence's spans under the occurrence's names plus `embed: boolean` asked of both syntaxes; `linksIn` reads a wikilink's title trimmed and a markdown link's halves from the occurrence.

**NOW:** `LinkHit` (`scan.ts:71-79`) carries `at`, `title`, `heading`, `alias` and a four-way `syntax` where `'embed'` is assigned only to wikilinks (`:117`) through `loneEmbed` (`:81-84`), which reads `loneEmbedTitle` (a wikilink-only detector); a lone `![Alias](Page)` line indexes as a body row. `destinationHalves` (`:87-96`) re-splits a markdown destination the occurrence already split. `linksIn` reads `read(o.title)` untrimmed (`:113`), so `[[ #H]]` names nothing in the body index while a Link value holding it names its own heading (probed). `indexSeed.ts:56-57` reads `hit.syntax === 'embed'` and `hit.at`; `rewrite.ts` reads `alias` at `:13,17,22-28,36-41,66-70`.

**CHANGE**

- [x] In `scan.test.ts`, rewrite `:222,237` (`embed: true`), `:255-265` (the section hit: `full`, `shown: null`, `embed: false`, no `at`), and add: `[[ #H]]` yields target own and qualifier `h`; a lone `![Alias](Zeta)` line yields `embed: true` and an inline `![x](Zeta)` yields `embed: false`; `[](Page)` yields with an empty `shown`. Watch them fail.
- [x] Write `scan.ts`'s hit and walk as below; `indexSeed.ts:56-57` reads `hit.embed` and `hit.full[0]`; `rewrite.ts` renames `alias` to `shown` at its reads (one-line interim renames; Task 6-2 rewrites the file).
- [x] Add a test to `indexSeed.test.ts`: a lone `![Alias](Zeta)` line gives an `embed` row; an inline one gives a `body` row.

**AFTER**

```Core/Connections/scan.ts diff
@@ header @@
-// One walker answers for every link syntax, and `syntax` keeps them apart for a reader that cares: a connection alone on its line behind a `!` is an embed, a tile's relation rather than a body link.
+// One walker answers for every link syntax; `embed` marks a link of either syntax alone on its line behind a `!`, a tile's relation that renames as a link and relates as nothing.
-import { targetFragment, targetTitle } from './links'
+import { targetFragment, targetTitle } from './links'
-import { codeMask, type CodeMask, lineEndAt, lineStartAt, trimmedRange } from '../MarkdownPM/Engine/markdownCode'
-import { headingParts, loneEmbedTitle } from '../MarkdownPM/Engine/detect'
+import { codeMask, type CodeMask, lineEndAt, lineStartAt, type Span } from '../MarkdownPM/Engine/markdownCode'
+import { headingParts } from '../MarkdownPM/Engine/detect'
-type Span = [number, number]
@@ LinkHit @@
-type LinkSyntax = 'wiki' | 'embed' | 'markdown' | 'section'
-/** One occurrence. … `at` is the offset into `body` … `heading` and a connection's `alias` are as written. */
+/** One occurrence the index and the rename rewriter share: the occurrence's spans under its names, `target` and `qualifier` as normalized keys (`qualifier` is '' when the link names no heading), `title` empty where the link names its own page by leaving it out, and `embed` for a link alone on its line behind a `!`. */
 export interface LinkHit {
-  syntax: LinkSyntax
+  syntax: LinkOccurrence['syntax'] | 'section'
+  embed: boolean
   target: string
   qualifier: string
-  at: number
+  full: Span
   title: Span
   heading: Span | null
-  alias: Span | null
+  shown: Span | null
 }
@@ loneEmbed, destinationHalves @@
-const loneEmbed = (body: string, at: number): boolean =>
-  body[at - 1] === '!' && lineStartAt(body, at) === at - 1 && loneEmbedTitle(body.slice(at - 1, lineEndAt(body, at))) !== null
-// A markdown destination's page half and fragment, trimmed: a rename edits them in place.
-function destinationHalves(body: string, [from, to]: Span): [Span, Span | null] { … }
+const embedLine = (body: string, [from, to]: Span): boolean =>
+  body[from - 1] === '!' && lineStartAt(body, from) === from - 1 && !/\S/.test(body.slice(to, lineEndAt(body, to)))
@@ linksIn @@
   for (const o of linkOccurrences(body, mask)) {
-    const at = o.full[0]
+    const embed = embedLine(body, o.full)
     if (o.syntax === 'wiki') {
-      const written = read(o.title)
+      const written = read(o.title).trim()
       const target = titleKey(written, own)
       const qualifier = o.heading ? normalizeTitle(read(o.heading)) : ''
       if (!names(target, written, qualifier)) continue
-      const syntax = loneEmbed(body, at) ? 'embed' : 'wiki'
-      yield { syntax, target, qualifier, at, title: o.title, heading: o.heading, alias: o.alias }
+      yield { ...o, embed, target, qualifier }
       continue
     }
-    const dest = read(o.destination)
-    const written = targetTitle(dest)
+    const written = targetTitle(read(o.title), o.heading !== null)
     if (written === null) continue
     const target = titleKey(written, own)
-    const qualifier = normalizeTitle(targetFragment(dest))
+    const qualifier = normalizeTitle(o.heading ? targetFragment(read(o.heading)) : '')
     if (!names(target, written, qualifier)) continue
-    const [title, heading] = destinationHalves(body, o.destination)
-    yield { syntax: 'markdown', target, qualifier, at, title, heading, alias: o.label }
+    yield { ...o, embed, target, qualifier }
   }
   if (!runs) return
   for (const { from, to, heading } of sectionRunsIn(body, outline, mask))
     yield {
       syntax: 'section',
+      embed: false,
       target: own,
       qualifier: normalizeTitle(heading),
-      at: from,
+      full: [from, to],
       title: [from, from],
       heading: [from + 1, to],
-      alias: null,
+      shown: null,
     }
```

```Core/Index/indexSeed.ts diff
@@ extractPageIndex @@
-    add(hit.syntax === 'embed' ? 'embed' : 'body', hit.target, hit.qualifier)
-    if (hit.at >= scan.lineStarts[scan.citations.firstLine])
+    add(hit.embed ? 'embed' : 'body', hit.target, hit.qualifier)
+    if (hit.full[0] >= scan.lineStarts[scan.citations.firstLine])
```

`rewrite.ts:15,63` branch on `'markdown'` and `'section'` only and stay untouched; a markdown embed line now renames through its markdown arm rather than being mistaken for a wikilink. `rewrite.test.ts:121-128`'s `loneEmbedTitle` cases move to `detect.test.ts`, since the function's consumers are the editor's.

**VERIFY**

- [x] `scan.test.ts`, `indexSeed.test.ts`, `rewrite.test.ts` (renamed field reads only), `cascade.test.ts`, and `tilesFile` tests pass.
- [x] The gates run at Task 2-4.
- [x] Check for unnecessary code or mistakes.

#### Task 2-3

**TASK:** Link tokens carry their occurrence, so `resolveRange` and `heading` leave the wikilink token, the token helpers read `tk.link`, `shiftToken` shifts the occurrence for every caller, and `tokenTarget` hands `resolveMdTarget` the halves the occurrence holds until Task 3-2 retires both.

**NOW:** `Token`'s wikilink arm carries `resolveRange` and `heading` (`tokens.ts:46`), and `aliasedToken`, `linkAddress`, `linkTarget`, `headingOf` (`:60-71`) derive what the occurrence already holds; `linkToken` (`:262-290`) builds the token from the occurrence and drops it; `shiftToken` (`:80-96`) has a wikilink branch for the two extra spans. Readers: `decorations.ts:570-579` (`aliasedToken`, `resolveRange`, `tk.heading`), `cellStatic.tsx:150` (`tk.resolveRange`), `linkEdit.ts:44-66,93`, `connectionsApi.ts:57-59,107`, `linkClicks.ts`, `citationPointer.ts:21`, `valueTarget.ts:23`; `shiftToken` callers `decorations.ts:363`, `format.ts:130,194`, and the tokenizer's HTML pass (`tokens.ts:305`).

**CHANGE**

- [x] In `tokens.test.ts`, rewrite `:119,126,155-181` (`resolveRange` reads become `tk.link.title`; a weblink's `link.heading` is `null`) and tighten `:140-152` so a shifted token's `link` spans are asserted shifted, not merely present. Watch them fail.
- [x] Write the token shape, helpers, `shiftToken`, and `linkToken` as below; sweep the readers above to `tk.link.title`, `tk.link.heading`, `tk.link.shown`.

**AFTER**

```Core/MarkdownPM/Engine/tokens.ts diff
@@ shapes @@
-type Span = [number, number]
+import { type CodeMask, inlineSpans, overlaps, type Span } from './markdownCode'
 export type Token =
-  | (TokenBase & { kind: 'wikiLink'; resolveRange: Span; heading?: Span })
+  | { [K in LinkKind]: TokenBase & { kind: K; link: LinkOccurrence } }[LinkKind]
   | { [K in PlainKind]: TokenBase & { kind: K } }[PlainKind]
-type PlainKind = Exclude<TokenKind, 'wikiLink'>
+type PlainKind = Exclude<TokenKind, LinkKind>
@@ helpers @@
-// A connection's title half, which alone resolves; it starts the shown text unless an alias replaces it.
-export const aliasedToken = (tk: Token): boolean =>
-  tk.kind === 'wikiLink' && tk.contentRange[0] !== tk.resolveRange[0]
-export function linkAddress(tk: Token): [number, number] {
-  const [, close] = tk.markerRanges
-  return [close[0] + 2, close[1] - 1]
-}
-export const linkTarget = (text: string, tk: Token): string => text.slice(...linkAddress(tk))
-export const headingOf = (text: string, tk: TokenOf<'wikiLink'>): string | undefined =>
-  tk.heading && text.slice(tk.heading[0], tk.heading[1])
+/** A connection showing an alias rather than its title. */
+export const aliasedToken = (tk: Token): boolean =>
+  tk.kind === 'wikiLink' && tk.link.shown !== null && tk.link.shown[1] > tk.link.shown[0]
+export const headingOf = (text: string, tk: TokenOf<LinkKind>): string | undefined =>
+  tk.link.heading ? text.slice(tk.link.heading[0], tk.link.heading[1]) : undefined
@@ shiftToken @@
 export function shiftToken(tk: Token, by: number): Token {
   const move = ([s, e]: Span): Span => [s + by, e + by]
   const base: TokenBase = { … }
-  if (tk.kind !== 'wikiLink') return { ...base, kind: tk.kind }
-  return { ...base, kind: 'wikiLink', resolveRange: move(tk.resolveRange), ...(tk.heading ? { heading: move(tk.heading) } : {}) }
+  if (tk.kind !== 'wikiLink' && tk.kind !== 'link') return { ...base, kind: tk.kind }
+  const { link } = tk
+  return {
+    ...base,
+    kind: tk.kind,
+    link: { ...link, full: move(link.full), title: move(link.title), heading: link.heading && move(link.heading), shown: link.shown && move(link.shown) },
+  }
 }
@@ linkToken @@
 function linkToken(o: LinkOccurrence): Token {
   const [fs, fe] = o.full
-  if (o.syntax === 'markdown')
-    return { kind: 'link', range: o.full, contentRange: o.label, markerRanges: [[fs, o.label[0]], [o.label[1], fe]] }
-  // The leading marker swallows `[[Title|`. An opened-but-empty alias shows nothing, so it stays a plain link.
-  const alias = o.alias && o.alias[1] > o.alias[0] ? o.alias : null
+  if (o.syntax === 'markdown')
+    return { kind: 'link', range: o.full, contentRange: o.shown!, markerRanges: [[fs, o.shown![0]], [o.shown![1], fe]], link: o }
+  // The leading marker swallows `[[Title|`. An opened-but-empty alias shows nothing, so it stays a plain link.
+  const alias = o.shown && o.shown[1] > o.shown[0] ? o.shown : null
   const heading = o.heading && o.heading[1] > o.heading[0] ? o.heading : null
   const shown = alias ?? [o.title[0], heading ? heading[1] : o.title[1]]
   return {
     kind: 'wikiLink',
     range: o.full,
     contentRange: shown,
-    resolveRange: o.title,
-    ...(heading ? { heading } : {}),
+    link: o,
     markerRanges: [[fs, shown[0]], [shown[1], fe]],
   }
 }
```

```Core/MarkdownPM/Links/connectionsApi.ts diff
@@ resolveMdTarget, tokenTarget (interim until Task 3-2) @@
-export function resolveMdTarget(index: PageIndex | undefined, rawTarget: string): MdTarget {
-  const target = titleTarget(index, targetTitle(rawTarget) ?? '', targetFragment(rawTarget))
-  if (target.kind !== 'invalid' || target.ambiguous || targetNamesFile(rawTarget) || !isValidLink(rawTarget)) return target
-  return { kind: 'url', url: rawTarget }
+export function resolveMdTarget(index: PageIndex | undefined, titleHalf: string, headingHalf: string | null): MdTarget {
+  const target = titleTarget(index, targetTitle(titleHalf, headingHalf !== null) ?? '', headingHalf === null ? '' : targetFragment(headingHalf))
+  const raw = headingHalf === null ? titleHalf : `${titleHalf}#${headingHalf}`
+  if (target.kind !== 'invalid' || target.ambiguous || targetNamesFile(titleHalf) || !isValidLink(raw)) return target
+  return { kind: 'url', url: raw }
 }
 export function tokenTarget(index: PageIndex | undefined, text: string, tk: TokenOf<LinkKind>): MdTarget {
-  if (tk.kind === 'link') return resolveMdTarget(index, text.slice(...targetSpan(tk.link)))
-  const [rs, re] = tk.resolveRange
-  return titleTarget(index, text.slice(rs, re), headingOf(text, tk))
+  const { title, heading } = tk.link
+  if (tk.kind === 'link') return resolveMdTarget(index, text.slice(...title), heading && text.slice(...heading))
+  return titleTarget(index, text.slice(...title), headingOf(text, tk))
 }
```

`linkAddress` and `linkTarget` go with them: `targetSpan(o)` in `connections.ts` is the destination as written (title through heading), read by Edit Link, `formatted`, the revealed pipe, the picker's destination, and the rewriter, and `mapSpans(o, f)` maps the spans with the arm kept, so `shiftToken` and `openLinkAt` need no cast. The one cost on a decoration build: `shiftToken` now moves four spans for a markdown token where it moved none, on visible links only, the same work a wikilink token already paid for `resolveRange` and `heading`. The token's `link` arm is a mapped type over `LinkKind`, so `TokenOf<'link'>` and `TokenOf<'wikiLink'>` keep narrowing through `Extract` (`tokens.ts:48`).

**VERIFY**

- [x] `tokens.test.ts`, `decorations` tests, `cellStatic` tests, and `format` tests pass; a `tsc` probe shows `TokenOf<'link'>['link']` typed as `LinkOccurrence`.
- [x] The gates run at Task 2-4.
- [x] Check for unnecessary code or mistakes (no reader derives a span the occurrence holds).

#### Task 2-4

**TASK:** The editor's link readers become `linkAt`, `openLinkAt`, and `slotAt` over the one walk, with `partOf` the one rule for which slot holds the caret; `connectionAt`, `openConnectionAt`, `inAliasAt`, `linkContainerAt`, and `headingHash.ts` go; `isLiteralAt` and `headingHash` ask `partOf`; paste reads the same readers.

**NOW:** `edits.ts:330-368` holds `linkAt` (first match wins at a boundary), `connectionAt` (wikilinks only), `openConnectionAt` (a half-typed wikilink with a `[[` special case), and `inAliasAt` (runs `markdownLinkAt` for the label); `isLiteralAt` (`:651-655`) reads `openConnectionAt` and `inUrlRun`, which runs `linkDestinationStart` (`:643-649`); `autoPair` reads `inAliasAt` (`:406`). `headingHash.ts` (27 lines) reads `connectionAt`, `openConnectionAt`, `linkDestinationStart`, and `opensFragment`. `autocomplete.ts:83-84,126,140-141` reads `connectionAt`, `openConnectionAt`, and `markdownLinkAt` twice; `linkEdit.ts:133,138,173,183,193,199,225` reads `connectionAt`, `markdownLinkAt`, and `linkAt`; `pasteLink.ts:25-34,60,75` tokenizes the line to find the link under a paste and reads `linkDestinationStart`; `linkReveal.ts:23` reads `connectionAt`. Both patterns refuse an empty title or destination, so `[[`, `[x](`, `[x]()`, and `[]()` read as nothing once a closer is appended; six tests pin the picker opening there.

**CHANGE**

- [x] In `edits.test.ts`, rewrite `:886-898` for `slotAt` (returns the occurrence, the part, and the line start for a caret in a title, a heading, an alias, and a label, with a boundary between two slots answering the earlier slot; null in code and just past a closer) and `:901-924` for `openLinkAt` (`[[` just typed, `[[Al`, `[x](`, `[]()` with the caret between the parens, `[[A#`, each with the slot holding the placeholder cut back to the caret; a backtick before the caret keeps the code mask honest), and add a `linkAt` boundary case (a link holds the caret from past its opener through its closer, so the boundary between two abutting links belongs to the first, and an open link typed flush against a following one still reads) and an `isLiteralAt` case (a dash typed just past a closer is transformed). `headingHash.test.ts` imports `headingHash` from `../Input/edits`; its empty cases (`[[]]`, `![[]]`, `[a]()`) hold through the placeholder. `aliasPicker.test.tsx:528-558`'s `connectionAt` describe becomes `linkAt`'s. Watch them fail.
- [x] Write `edits.ts`'s readers as below; delete `headingHash.ts`; `markdownInput.ts` imports `headingHash` from `../Input/edits`.
- [x] `autocomplete.ts:83-84` reads `linkAt(scan, caret) ?? openLinkAt(scan, caret)` and `:126-141` read the same occurrence's `shown`, `title`, `heading` (the branch structure stays; Task 5-1 rewrites the query); `linkEdit.ts`'s `slotNear`, `emptied`, `linkWithin` read `linkAt` and `o.shown`/`o.heading`/`o.title` in place of `markdownLinkAt`'s `label`/`fragment`/`page` (Task 4-2 rewrites them); `linkReveal.ts:23` reads `linkAt` behind its `[[` gate (Task 4-1 retires the field).
- [x] `pasteLink.ts`: `linkContainerAt` goes; `pasteEdit` reads `linkAt(scan, sel.from)` strictly inside (`o.full[0] < sel.from - ls && sel.to - ls < o.full[1]`) and `o.syntax` where it read `tk.kind`; `:75`'s "inside a half-typed destination" becomes `openLinkAt(scan, sel.from) !== null`, the same "a link still being written" rule for both syntaxes, so a URL pasted after `[[Pa` lands literally as one pasted after `[x](ht` does.
- [x] `emptied` fills an empty image alt text like any label (the `!` check at `linkEdit.ts:184` goes); `linkEdit.test.tsx:307`'s row expects `a ![Alpha](Alpha) b`.

**AFTER**

```Core/MarkdownPM/Input/edits.ts diff
@@ imports @@
-import { type LinkSpans, linkOccurrences, type LinkOccurrence } from '../../Connections/connections'
-import { linkDestinationStart, markdownLinkAt } from '../../Connections/links'
+import { type LinkOccurrence, linkOccurrences, type LinkPart } from '../../Connections/connections'
+import { namesPage } from '../../Connections/links'
@@ readers @@
-/** The link written around `at`, either syntax, as the editor draws it, so code touching it leaves none; its spans are relative to `at`'s line, empty slots kept. */
+/** The link holding `at`, from past its opener through its closer, either syntax, as the editor draws it, so code touching it leaves none; its spans are relative to `at`'s line, empty slots kept. */
 export function linkAt(scan: DocScan, at: number): LinkOccurrence | null {
   const i = lineIndexAt(scan, at)
   const line = scan.lines[i]
   if (!line.includes('[[') && !line.includes('](')) return null
   const ls = scan.lineStarts[i]
   for (const o of linkOccurrences(line, (p) => inCodeAt(scan, ls + p)))
-    if (at - ls >= o.full[0] && at - ls <= o.full[1]) return o
+    if (at - ls > o.full[0] && at - ls <= o.full[1]) return o
   return null
 }
-export function connectionAt(scan: DocScan, at: number): LinkSpans | null { … }
-export function openConnectionAt(scan: DocScan, at: number): LinkSpans | null { … }
-/** In a written link's alias or label, where a `]` would truncate the link. */
-export function inAliasAt(scan: DocScan, at: number): boolean { … }
+/** The link still being written before `at`, as it reads once closed; a placeholder at the caret keeps an empty slot readable, since both patterns refuse an empty title or destination. */
+export function openLinkAt(scan: DocScan, at: number): LinkOccurrence | null {
+  const i = lineIndexAt(scan, at)
+  const ls = scan.lineStarts[i]
+  const head = scan.lines[i].slice(0, at - ls)
+  const wiki = head.lastIndexOf('[[')
+  const md = head.lastIndexOf('](')
+  if (wiki === -1 && md === -1) return null
+  const text = `${head}\u0000${wiki > md ? ']]' : ')'}`
+  const o = linkOccurrences(text, (p) => inCodeAt(scan, ls + p)).find((x) => x.full[1] === text.length)
+  return o ? mapSpans(o, ([a, b]) => [a, Math.min(b, head.length)]) : null
+}
+/** Which slot of `o` holds the line-relative `rel`, ends inclusive and in slot order: the one rule Return, `]`, `[`, the typing transforms, the `§` transform, and the picker ask. */
+function partOf(o: LinkOccurrence, rel: number): LinkPart | null {
+  const within = (s: Span | null): boolean => s !== null && rel >= s[0] && rel <= s[1]
+  return within(o.title) ? 'title' : within(o.heading) ? 'heading' : within(o.shown) ? 'shown' : null
+}
+/** The written link whose slot holds `at`, outside code, with that slot and the line's start. */
+export function slotAt(scan: DocScan, at: number): { link: LinkOccurrence; part: LinkPart; from: number } | null {
+  const link = linkAt(scan, at)
+  const from = scan.lineStarts[lineIndexAt(scan, at)]
+  const part = link && partOf(link, at - from)
+  return link && part ? { link, part, from } : null
+}
@@ autoPair @@
-  if (inserted === '[' && inAliasAt(scan, c)) return null
@@ headingHash (folded from Links/headingHash.ts) @@
+/** The one transform that fires only where a link names its page: a wikilink's title half, or a markdown destination's page half. An alias, a label, an address, and a heading are prose, and may hold the character. */
+export function headingHash(scan: DocScan, selStart: number, selEnd: number, inserted: string): Edit | null {
+  if (inserted !== '§' || inCodeNear(scan, selStart)) return null
+  const li = lineIndexAt(scan, selStart)
+  const ls = scan.lineStarts[li]
+  const o = linkAt(scan, selStart) ?? openLinkAt(scan, selStart)
+  if (!o || partOf(o, selStart - ls) !== 'title' || selEnd - ls > o.title[1]) return null
+  if (o.syntax === 'markdown' && !namesPage(scan.lines[li].slice(o.title[0], o.title[1]))) return null
+  return { from: selStart, to: selEnd, insert: '#', selection: selStart + 1 }
+}
@@ isLiteralAt @@
-// A URL-shaped run or a link address the caret sits in is link content: converting `--` → `—` would corrupt the path.
+// A URL-shaped run is link content: converting `--` → `—` would corrupt the path.
 const urlRunRe = …
-const inUrlRun = (doc: string, c: number): boolean => {
-  const from = lineStartAt(doc, c)
-  return urlRunRe.test(doc.slice(from, c)) || linkDestinationStart(doc.slice(from, lineEndAt(doc, c)), c - from) !== null
-}
+const inUrlRun = (doc: string, c: number): boolean => urlRunRe.test(doc.slice(lineStartAt(doc, c), c))
+// Inside a link's slots or a link still being written; a transform typed just past `]]` is prose.
 const isLiteralAt = (scan: DocScan, c: number): boolean =>
   inCodeNear(scan, c) ||
   spanAt(scan.maths, c) !== undefined ||
-  openConnectionAt(scan, c) !== null ||
+  slotAt(scan, c) !== null ||
+  openLinkAt(scan, c) !== null ||
   inUrlRun(scan.text, c)
```

```Core/MarkdownPM/Links/pasteLink.ts diff
@@ imports @@
-import { linkDestinationStart } from '../../Connections/links'
-import { linkTokenAt, tokenize, type LinkKind } from '../Engine/tokens'
+import { linkAt, openLinkAt } from '../Input/edits'
@@ linkContainerAt @@
-function linkContainerAt(line: string, ls: number, sel: { from: number; to: number }): { kind: LinkKind; range: [number, number]; text: string } | null {
-  const tk = linkTokenAt(tokenize(line), sel.from - ls)
-  if (!tk || tk.range[0] >= sel.from - ls || sel.to - ls >= tk.range[1]) return null
-  const [start, end] = tk.range
-  return { kind: tk.kind, range: [ls + start, ls + end], text: line.slice(start, end) }
-}
+/** The link of either syntax a selection sits strictly inside, as the editor draws it. */
+function linkContainerAt(scan: DocScan, ls: number, sel: { from: number; to: number }): { syntax: 'wiki' | 'markdown'; range: [number, number]; text: string } | null {
+  const o = linkAt(scan, sel.from)
+  if (!o || o.full[0] >= sel.from - ls || sel.to - ls >= o.full[1]) return null
+  return { syntax: o.syntax, range: [ls + o.full[0], ls + o.full[1]], text: scan.text.slice(ls + o.full[0], ls + o.full[1]) }
+}
@@ pasteEdit @@
-  const within = how === 'plain' ? null : linkContainerAt(line, ls, sel)
+  const within = how === 'plain' ? null : linkContainerAt(scan, ls, sel)
   …
-      how === 'connection' || (how !== 'markdown' && within.kind === 'wikiLink')
+      how === 'connection' || (how !== 'markdown' && within.syntax === 'wiki')
   …
-  if (how !== 'plain' && linkDestinationStart(line, sel.from - ls) !== null) return plain
+  // A link still being written takes the paste as its own text, in either syntax.
+  if (how !== 'plain' && openLinkAt(scan, sel.from) !== null) return plain
```

The placeholder is `\u0000`, legal in every wiki slot and in a destination; the code mask is the real document's, read through `ls + p`, so a synthetic closer never changes what code touches, and `slotAt` needs no code check of its own since the walk already drops every link code touches. `linkAt` keeps the `[[`/`](` line gate, and the readers cost one walk of the caret line each, as today's did; `isLiteralAt` runs two walks on the transform keys only.

**VERIFY**

- [x] `edits.test.ts`, `headingHash.test.ts`, `aliasPicker.test.tsx`, `autocomplete.test.ts:210-217,227-231,371-380`, `connectionCommit.test.tsx:574`, `acQuery.test.ts:72,101`, `pasteLink.test.tsx:124,388` pass; `linkEdit.test.tsx:307` passes with its new expectation.
- [x] Run the gates, for Tasks 2-1 to 2-4 together.
- [x] Check for unnecessary code or mistakes (no caller of `markdownLinkAt`, `connectionAt`, `openConnectionAt`, `inAliasAt`, `linkDestinationStart`, `opensFragment`, or `linkContainerAt` remains; "which slot holds the caret" is spelled once, in `partOf`).

#### Task 2-5

**TASK:** `inRawHtml` and `drawsRawHtml` live in `api.ts`; one `shownEnd(state, at, scope)` answers Return, the `]` swallow, and the `[` stand-down; Return in a shown slot rests the caret past the link in every editor place.

**NOW:** `drawsRawHtml` and `inRawHtml` sit in `decorations.ts:438-446`, imported by `linkEdit.ts:34` and `acQuery.ts:5`; `shownEnd` (`linkEdit.ts:128-141`) hard-codes `'page'` and reads two walkers; `commitAliasOnEnter` (`:143-153`) is bound only in `markdownInput` (`:271`), which only `MarkdownEditor.tsx:138` mounts, so a cell's Return moves to the cell below and a Text pane's closes the pane even with the caret in a link's alias; `typedInput` swallows `]` through `inAliasAt` with no raw-HTML question (`markdownInput.ts:249`), and `autoPair` stood `[` down through `inAliasAt` (removed in Task 2-4).

**CHANGE**

- [x] In `linkEdit.test.tsx`, the five `commitAliasOnEnter(view)` calls (`:417,434,452,468,479`) become `commitAliasOnEnter('page')(view)`; add: Return with the caret in a markdown label inside a raw HTML block, HTML Formatting on, breaks the line (and so does `]` land plainly there); in `CellEditor`'s tests, Return in a wikilink's alias rests the caret past the closer and a second Return moves down; in `TextPane.test.tsx`, Return in an alias rests past the link and a second Return closes the pane. Watch them fail.
- [x] Move `drawsRawHtml` and `inRawHtml` to `api.ts` beside `editorHost`; `decorations.ts`, `linkEdit.ts`, and `acQuery.ts` import them from there.
- [x] Write `shownEnd` and `commitAliasOnEnter(scope)` as below; bind Return in `editorBase`'s `Prec.highest` keymap after `paneKeys`; remove the `markdownInput.ts:271` binding; `typedInput` asks `shownEnd` for `]` and `[`.

**AFTER**

```Core/MarkdownPM/api.ts diff
@@ beside editorHost @@
+export const drawsRawHtml = (scope: MarkdownScope, settings: EditorSettings): boolean =>
+  scope === 'page' && settings.htmlFormatting
+
+/** Inside an HTML block the editor draws raw, where link syntax is source text and no link rule applies. */
+export function inRawHtml(state: EditorState, at: number, scope: MarkdownScope): boolean {
+  return drawsRawHtml(scope, state.facet(editorHost).settings()) && spanAt(docScan(state.doc).html, at) !== undefined
+}
```

```Core/MarkdownPM/Links/linkEdit.ts diff
@@ shownEnd @@
-/** Past the closer of the link whose alias or label holds `at`: a markdown label, empty or not, lies before its destination. */
-function shownEnd(state: EditorState, at: number): number | null {
-  const scan = docScan(state.doc)
-  if (inCodeAt(scan, at) || inRawHtml(state, at, 'page')) return null
-  const line = state.doc.lineAt(at)
-  const rel = at - line.from
-  const wiki = connectionAt(scan, at)
-  if (wiki) return wiki.alias && rel >= wiki.alias[0] && rel <= wiki.alias[1] ? line.from + wiki.full[1] : null
-  const md = markdownLinkAt(line.text, rel, 'label')
-  return md ? line.from + md.full[1] : null
-}
+/** Past the closer of the live link whose alias or label holds `at`: the one question Return, a typed `]`, and a typed `[` ask. */
+export function shownEnd(state: EditorState, at: number, scope: MarkdownScope): number | null {
+  if (inRawHtml(state, at, scope)) return null
+  const s = slotAt(docScan(state.doc), at)
+  return s?.part === 'shown' ? s.from + s.link.full[1] : null
+}
@@ commitAliasOnEnter @@
-export function commitAliasOnEnter(view: EditorView): boolean {
-  const sel = view.state.selection.main
-  const end = sel.empty ? shownEnd(view.state, sel.head) : null
+export const commitAliasOnEnter = (scope: MarkdownScope) => (view: EditorView): boolean => {
+  const sel = view.state.selection.main
+  const end = sel.empty ? shownEnd(view.state, sel.head, scope) : null
   if (end === null) return false
   view.dispatch({ selection: EditorSelection.cursor(end, 1), effects: restedOnLink.of(end) })
   view.focus()
   return true
 }
```

```Core/MarkdownPM/surface.ts diff
@@ editorBase @@
   Prec.highest(
     keymap.of([
       ...paneKeys(panes.map((p) => p.ctl)),
+      { key: 'Enter', run: commitAliasOnEnter(scope) },
       { key: 'Backspace', run: smartDelete(scope) },
     ]),
   ),
```

```Core/MarkdownPM/Input/markdownInput.ts diff
@@ typedInput @@
-    if (text === ']' && inAliasAt(scan, from)) return true
+    // In a live link's shown slot a `]` would truncate the link and a `[` would pair into one, so the first is swallowed and the second lands plainly.
+    if ((text === ']' || text === '[') && shownEnd(view.state, from, scope) !== null) return text === ']'
@@ markdownInput keymap @@
-      { key: 'Enter', run: commitAliasOnEnter },
```

**Behavior change:** in a table cell, Return with the caret in a link's alias or label (picker closed, outside code) rests the caret just past the closer instead of moving to the cell below or continuing a list; in a Text pane it rests past the link instead of saving and closing; a second Return does the surface's own thing. Resting past the closer leaves the link, so the first Return now settles alias memory in a cell too (Phase 4). `[` inside a shown slot no longer pairs, consistent with `]`, since `typedInput` answers before `autoPair` runs. Raw HTML gates page scope with HTML Formatting on; cells and Text values never stand down for it. The typing transforms (`--`, `->`, `...`) now hold inside a markdown label as they already did inside an alias, since `isLiteralAt` asks the one slot reader; and a destination with an unbalanced `(` before the caret is no longer read as a link being written, the grammar's own paren cap (in-app writers encode parens). The binding wins because `CellEditor` (`:160-200`) and `TextPane` (`:112-140`) list `editorBase` before their own `Prec.highest` keymaps, and equal precedence falls to list order; Task 8-1's field keeps that order.

**VERIFY**

- [x] `linkEdit.test.tsx`, the cell and Text pane Return cases, and `acQuery.test.ts` pass; an open picker still takes Return (`connectionCommit.test.tsx`).
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (`decorations.ts` no longer exports a raw-HTML question; `inAliasAt` has no reader).

#### Review Checkpoint

- [x] No file under `Core/` holds a second markdown link pattern, a second `#` split, a second `[label](dest)` template, or a second "which slot holds the caret" rule outside the picker's branch structure (Task 5-1 rewrites it) and `slotNear` (Task 4-2 rewrites it).
- [x] `grep -rn "resolveRange\|markdownLinkAt\|connectionAt\|openConnectionAt\|inAliasAt\|linkDestinationStart\|opensFragment\|destinationHalves\|composeWebpageEmbedLine\|emptyTolerantLinkRegex" Core` finds nothing outside tests that were rewritten.
- [x] The six empty-destination picker tests pass through `openLinkAt`; `[x](https://…)` yields no index hit and no `page?` on its written target.
- [x] Return in a cell and a Text pane behaves as Task 2-5 states; an open picker still takes Return.
- [x] Typing on a link-dense line costs no more walks per keystroke than HEAD (`autocompleteQuery`, `linkTyping`, `aliasOnLeave` each read the caret line once).
- [x] The two interims this phase wrote (`readLinkText`'s markdown read, `resolveMdTarget`'s halves) are named in Tasks 3-1 and 3-2, which retire them.
- [x] Net Ledger: Phase 2 measured; every untyped estimate held or the increase was reported.

---

### Phase 3 — One Written Shape, One Resolver

**GOAL:** A link string becomes one written shape through one reader and one resolved shape through one resolver, and the page-before-address rule, the bare-heading rule, and the status each have one owner in `Core/Connections/linkValue.ts`. `MdTarget`, `titleTarget`, `resolveMdTarget`, `tokenTarget`, `linkStatus`, `heldTarget`, `linkResolver`, `valueTarget`, `readLinkText`'s `resolve` parameter, and `parseConnectionText` go; `ConnectionsApi` becomes `{ index, open, menu?, headingsOf }` and `location` moves to `EditorHost`. Addresses keep today's raw resolution and today's stored form. This phase lands on Phase 2's occurrence (tokens carry it, so no reader rebuilds one) and after Phase 1 (both edit `editorHost.tsx`, `pageConnections.ts`, and `assignValue.ts`).

#### Task 3-1

**TASK:** `readOccurrence` and `readLinkText` read a link once into `LinkTarget` (a url arm carrying `page?` for a destination a page could also hold); `resolveLink(written, index, own?)` returns `ResolvedLink`; `bareHeading` is the bare-heading rule's one owner; `wikiTitle` replaces `parseConnectionText` for the asset readers; the writers that store an address normalize at their own entry.

**NOW:** `readLinkText` (`linkValue.ts:61-80`) reads through `parseConnectionText` and `wholeLink`, takes a `resolve` callback that refuses and recapitalizes (`:49-51`), and normalizes a url at `:79`, the one normalize point every stored address passes through. `MdTarget` and its three builders live in `connectionsApi.ts:19-60`; `linkStatus` unfolds a status `titleTarget` folded (`:82-85`); `heldTarget` (`linkClicks.ts:84-88`) applies the bare-heading rule after resolution at three sites and again inside `resolveFollow`; `linkResolver` (`PropertyValueInput.tsx:16-21`) patches `readLinkText('[[#H]]', resolve)` returning null. `parseConnectionText` (`connections.ts:67-83`) is read by six asset and File callers (`assetMigrate.ts:57,178`, `assetRoots.ts:22,28`, `assetUrl.ts:22`, `value.ts:67`), all of which mean a wikilink to a file. Resolution returns the destination raw today (`connectionsApi.ts:49`, `valueTarget.ts:25`); `c4` normalized it, against the ruling.

**CHANGE**

- [x] In `linkValue.test.ts`, rewrite `:107-138` as `resolveLink` cases (a held title → `page`; two holders → `unresolved ambiguous`; none → `unresolved phantom`; `[[#H]]` with `own` → `page` on `own`, without → `self`; `[x](notes.io)` with no page named `notes.io` → `url`, with one → `page`; `[[ #H]]` → `self`), rewrite `:62-73` so `readLinkText('example.com').url` reads `example.com` and `retarget('wiki', null, { kind: 'url', syntax: 'bare', url: 'example.com' }, …).text` reads `https://example.com`, rewrite `:350-354`'s `commit` helper to `linkValueFromEdit(raw, current, index, own, keepTitle)` with `own = holder` where it passed `held` and `undefined` where it passed `index.resolve`, and move `:4,93` and `connections.test.ts:7,53-84` to `wikiTitle` (a bare heading reads `''`, an empty heading reads the title, the cell escape strips). Watch them fail.
- [x] Write `linkValue.ts` as below; `parseConnectionText` and `ConnectionParts` leave `connections.ts`; the six asset callers read `wikiTitle` and test `!== null` where they tested truthiness (`assetMigrate.ts:57`'s `isConnection`).
- [x] Normalize where HEAD's behavior depends on it: `retarget`'s url arm (`linkValue.ts:209-210`), `pasteAsWrite`'s url branch (`pasteAsMenu.ts:105`, one `const url = normalizeLinkUrl(target.url)` at the top of the branch serving `plain`, `embedLink`, `serializeLink`, and the three `linkPaste` calls), the paste title lookup (`pasteLink.ts:57`), `linkDisplayText`'s default arm (`linkValue.ts:156`), and `sameTarget`'s url compare (`:185`). `linkDomain`, `isHttpLink`, and the openers already normalize internally.

**AFTER**

```Core/Connections/linkValue.ts diff
@@ imports @@
-import { connectionText, expressibleInLink, keepsAlias, parseConnectionText, wholeLink } from './connections'
+import { connectionText, expressibleInLink, keepsAlias, type LinkOccurrence, type LinkStatus, wholeLink } from './connections'
-import type { ConnPage, ConnResolution, PageIndex } from './pageIndex'
+import type { ConnPage, PageIndex } from './pageIndex'
@@ shapes @@
+/** What a link writes. A markdown destination a page could also hold rides the url arm as `page?`, since only resolution decides which it is. */
 export type LinkTarget =
   | { kind: 'page'; syntax: 'wiki' | 'markdown'; title: string; heading?: string; alias?: string }
-  | { kind: 'url'; syntax: 'markdown' | 'bare'; url: string; alias?: string }
+  | { kind: 'url'; syntax: 'markdown' | 'bare'; url: string; alias?: string; page?: { title: string; heading?: string } }
+
+/** What a written link resolves to, through the one index: a page, this document's own heading, an address, or nothing, with why. */
+export type ResolvedLink =
+  | { kind: 'page'; page: ConnPage; heading?: string }
+  | { kind: 'self'; heading: string }
+  | { kind: 'url'; url: string }
+  | { kind: 'unresolved'; status: Exclude<LinkStatus, 'resolved'> }
@@ readers @@
-function pageTarget(syntax, title, heading, alias, res): LinkTarget | null {
-  if (title === '' && !heading) return null
-  if (res && res.status !== 'resolved') return null
-  const named = title !== '' && res?.page ? res.page.title : title
-  return { kind: 'page', syntax, title: named, ...(heading ? { heading } : {}), ...(alias ? { alias } : {}) }
-}
-export function readLinkText(text: string, resolve?: PageIndex['resolve']): LinkTarget | null { … 19 lines … }
+const writtenPage = (syntax: 'wiki' | 'markdown', title: string, heading: string, alias?: string): LinkTarget | null =>
+  title === '' && !heading ? null : { kind: 'page', syntax, title, ...(heading ? { heading } : {}), ...(alias ? { alias } : {}) }
+
+/** The one reader of what a link occurrence in `text` writes; the address is kept as written. */
+export function readOccurrence(text: string, o: LinkOccurrence): LinkTarget | null {
+  const slice = ([s, e]: [number, number]): string => text.slice(s, e).trim()
+  const heading = o.heading ? slice(o.heading) : ''
+  if (o.syntax === 'wiki') return writtenPage('wiki', slice(o.title), heading, o.shown ? slice(o.shown) : undefined)
+  const alias = unescapeLabel(slice(o.shown!)) || undefined
+  const titleHalf = slice(o.title)
+  const title = targetTitle(titleHalf, o.heading !== null)
+  const fragment = targetFragment(heading)
+  if (title !== null && (targetNamesFile(titleHalf) || !isValidLink(titleHalf)))
+    return writtenPage('markdown', title, fragment, alias)
+  const url = titleHalf + (o.heading ? `#${heading}` : '')
+  if (!isValidLink(url)) return null
+  return { kind: 'url', syntax: 'markdown', url, alias, ...(title === null ? {} : { page: { title, ...(fragment ? { heading: fragment } : {}) } }) }
+}
+
+export function readLinkText(text: string): LinkTarget | null {
+  const s = text.trim()
+  const o = wholeLink(s)
+  if (o) return readOccurrence(s, o)
+  return isValidLink(s) ? { kind: 'url', syntax: 'bare', url: s } : null
+}
+
+/** A bare heading names `own`, the page holding a value, and otherwise the document it's written in. */
+export const bareHeading = (heading: string, own?: ConnPage): ResolvedLink =>
+  own ? { kind: 'page', page: own, heading } : { kind: 'self', heading }
+
+/** Page resolution comes first, deliberately: `isValidLink` accepts any dotted host, so `Notes.md` would read as a website and the page it names would be unreachable. */
+export function resolveLink(written: LinkTarget | null, index: PageIndex | undefined, own?: ConnPage): ResolvedLink {
+  if (!written) return { kind: 'unresolved', status: 'phantom' }
+  if (written.kind === 'url' && !written.page) return { kind: 'url', url: written.url }
+  const { title, heading } = written.kind === 'url' ? written.page! : written
+  if (title === '') return heading ? bareHeading(heading, own) : { kind: 'unresolved', status: 'phantom' }
+  const res = index?.resolve(title)
+  if (res?.page) return { kind: 'page', page: res.page, ...(heading ? { heading } : {}) }
+  const ambiguous = res?.status === 'ambiguous'
+  if (written.kind === 'url' && !ambiguous) return { kind: 'url', url: written.url }
+  return { kind: 'unresolved', status: ambiguous ? 'ambiguous' : 'phantom' }
+}
+
+/** The wikilink a File value or an asset reference spells, by its title alone; a markdown link to a page is never a file reference. */
+export const wikiTitle = (raw: string): string | null => {
+  const t = readLinkText(raw)
+  return t?.kind === 'page' && t.syntax === 'wiki' ? t.title : null
+}
@@ shownAlias (the index replaces the callback; Task 6-1 rewrites the rule) @@
-export function shownAlias(text: string, resolve: PageIndex['resolve'], was?: string): { page: ConnPage; alias: string } | null {
-  const target = readLinkText(text, resolve)
-  if (target?.kind !== 'page' || !target.alias) return null
-  const { alias } = target
-  const page = resolve(target.title).page
-  if (!page || !keepsAlias(alias, page.title) || showsTarget(alias, target)) return null
+export function shownAlias(text: string, index: PageIndex, was?: string): { page: ConnPage; alias: string } | null {
+  const written = readLinkText(text)
+  const target = resolveLink(written, index)
+  const alias = written?.alias
+  if (target.kind !== 'page' || !alias) return null
+  const { page, heading } = target
+  if (!keepsAlias(alias, page.title) || showsTarget(alias, { title: page.title, heading })) return null
   const before = was === undefined ? null : readLinkText(was)
   if (before?.kind === 'page') {
     if (showsTarget(alias, before)) return null
-    if (before.alias === alias && resolve(before.title).page?.id === page.id) return null
+    if (before.alias === alias && index.resolve(before.title).page?.id === page.id) return null
   }
   return { page, alias }
 }
@@ linkValueFromEdit @@
-export function linkValueFromEdit(raw: string, current: string | undefined, resolve: PageIndex['resolve'], keepTitle: boolean): PropertyValue | null | undefined {
+export function linkValueFromEdit(raw: string, current: string | undefined, index: PageIndex | undefined, own: ConnPage | undefined, keepTitle: boolean): PropertyValue | null | undefined {
   const trimmed = raw.trim()
   if (trimmed === '') return null
-  const next = readLinkText(trimmed, resolve)
-  if (!next) return undefined
+  const written = readLinkText(trimmed)
+  const target = resolveLink(written, index, own)
+  if (!written || (target.kind !== 'page' && target.kind !== 'url')) return undefined
+  // A resolved page is written by its own title; a value's bare heading keeps its empty title.
+  const named = written.kind === 'url' ? written.page! : written
+  const next: LinkTarget = target.kind === 'url' ? written : { kind: 'page', syntax: 'wiki', title: named.title === '' ? '' : target.page.title, heading: target.heading, alias: written.alias }
   const was = current ? readLinkText(current) : null
   return { kind: 'link', value: retarget('wiki', was, next, keepTitle).text }
 }
@@ linkDisplayText default arm, sameTarget, retarget url arm @@
-      return target.url
+      return normalizeLinkUrl(target.url)
-    : a.kind === 'url' && b.kind === 'url' && a.url === b.url
+    : a.kind === 'url' && b.kind === 'url' && normalizeLinkUrl(a.url) === normalizeLinkUrl(b.url)
-  if (shown) return { kind: 'link', text: serializeLink(next.url, shown) }
-  return into ? linkPaste(next.url, into.format, into.title) : { kind: 'link', text: next.url }
+  const url = normalizeLinkUrl(next.url)
+  if (shown) return { kind: 'link', text: serializeLink(url, shown) }
+  return into ? linkPaste(url, into.format, into.title) : { kind: 'link', text: url }
```

A held value's `[[#H]]` keeps drawing as `bare` because drawing calls `resolveLink` without `own` (Task 3-3); following and the menu pass the holder.

**VERIFY**

- [x] `linkValue.test.ts` and `connections.test.ts` pass as rewritten; the asset and File tests pass through `wikiTitle`.
- [x] A hand-written `example.com` Link value still sorts, filters, and shows its Full Link text as `https://example.com`, and Copy Link and `href` read it as written.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (no second normalize point in a reader; `readLinkText` takes one argument).

#### Task 3-2

**TASK:** `ConnectionsApi` becomes `{ index, open, menu?, headingsOf }`, `location` moves to `EditorHost`, `heldOf` joins `api.ts`, and `connectionsApi.ts` keeps only the host interface, `headingMissing`, `linkLook`, and `linkClass`; `LinkMenuTarget` and `linkMenuTarget` move beside `LinkMenuContext`.

**NOW:** `ConnectionsApi extends PageIndex` and carries `location` (`connectionsApi.ts:12-16`); `pageConnections.ts:33-46` builds it by spreading the index and reading `nodesByIdOf` for `location`; `pageRow` (`autocomplete.ts:169-174`) is `location`'s one reader. `connectionsApi.ts` also holds `MdTarget`, `titleTarget`, `resolveMdTarget`, `tokenTarget`, `linkStatus`, and `linkMenuTarget`.

**CHANGE**

- [x] Rewrite `connectionsApi.test.ts:6-25` for `ResolvedLink` literals (`unresolved` for `invalid`); rewrite every `ConnectionsApi` fixture to the `{ index, … }` shape and give `location` to the harness host: `Core/Testing/editorHarness.ts:45,52,87,131`, `aliasPicker.test.tsx:60-65`, `connectionCommit.test.tsx:24-35,345-356,443`, `aliasRender.test.tsx:13-18`, `connectionHover.test.tsx:27-32`, `externalLink.test.tsx:44-48`, `linkEdges.test.tsx:27-31,155-162,404`, `linkEdit.test.tsx:45-51`, `mdLinkTarget.test.tsx:19-26,151-160`, `LinkCell.test.tsx:30-40`, `TextCell.test.tsx:23-28,64-69`, `PropertyValueInput.test.tsx:114-123`, `valueTarget.test.ts:7-18`, `Cell.test.tsx:262-270` (whose cast compiled and whose `:277-289,308-331` fail at runtime until it carries `index`). The harness already threads `connections` (`editorHarness.ts:45,52,87,195-206`); its host gains `location: () => []`, and no helper is added.
- [x] Write `connectionsApi.ts`, `api.ts`, `pageConnections.ts`, and `editorHost.tsx` as below; move `LinkMenuTarget` and `linkMenuTarget` into `Actions/connectionMenu.ts`.

**AFTER**

```Core/MarkdownPM/Links/connectionsApi.ts diff
@@ imports and interface @@
-import { aliasedToken, headingOf, type LinkKind, type TokenOf } from '../Engine/tokens'
-import type { LinkAction, LinkMenuContext } from '../../Actions/connectionMenu'
-import { targetFragment, targetNamesFile, targetTitle } from '../../Connections/links'
-import { isValidLink } from '../../Paths/urlPath'
-import type { ConnPage, PageHeadings, PageIndex } from '../../Connections/pageIndex'
-import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
+import { aliasedToken, type LinkKind, type TokenOf } from '../Engine/tokens'
+import { readOccurrence, type ResolvedLink, resolveLink } from '../../Connections/linkValue'
+import type { ConnPage, PageHeadings, PageIndex } from '../../Connections/pageIndex'
-export interface ConnectionsApi extends PageIndex {
+/** What an editor needs of the page tree: the one title index, how to open a page, the connection menu where the surface has one, and a page's headings. */
+export interface ConnectionsApi {
+  index: PageIndex
   open: …
   menu?: …
   headingsOf: …
-  location: (pageId: string) => TrailSegment[]
 }
-export type MdTarget = …
-export type LinkMenuTarget = …
-export function titleTarget(…) { … }
-export function resolveMdTarget(…) { … }
-export function tokenTarget(…) { … }
-export function linkMenuTarget(…) { … }      (moves to Actions/connectionMenu.ts, typed on ResolvedLink)
-export function linkStatus(target: MdTarget): LinkStatus { … }
@@ linkLook @@
-  const target = tokenTarget(conn, text, tk)
-  const status = linkStatus(target)
+  const target = resolveLink(readOccurrence(text, tk.link), conn?.index)
+  const status = target.kind === 'unresolved' ? target.status : 'resolved'
```

```Core/MarkdownPM/api.ts diff
@@ beside heldBy @@
+/** The page a held value answers for, or nothing for a body. */
+export const heldOf = (own: OwnPage | null): ConnPage | undefined => (own?.kind === 'held' ? own.page : undefined)
@@ EditorHost @@
+  /** A page's trail, for the picker's rows; the editor holds no tree, so its host answers. */
+  location(pageId: string): TrailSegment[]
```

```Core/Session/pageConnections.ts diff
-    const location = (id: string): TrailSegment[] => nodesByIdOf(tree).get(id)?.parents ?? NO_TRAIL
-    if (mode === 'inert') return { ...index, open: () => {}, headingsOf, location }
+    if (mode === 'inert') return { index, open: () => {}, headingsOf }
     return {
-      ...index,
+      index,
       …
-      location,
```

```Core/Pages/editorHost.tsx diff
@@ buildEditorHost @@
+    location: (id) => {
+      const tree = state().tree
+      return (tree && nodesByIdOf(tree).get(id)?.parents) || NO_TRAIL
+    },
```

```Core/MarkdownPM/Autocomplete/autocomplete.ts diff
-export const pageRow = (p: ConnPage, conn: ConnectionsApi): AcRow => ({ …, location: conn.location(p.id) })
+export const pageRow = (p: ConnPage, host: EditorHost): AcRow => ({ …, location: host.location(p.id) })
```

**VERIFY**

- [x] `connectionsApi.test.ts` and every rewritten fixture compile and pass.
- [x] The gates run at Task 3-3, once its consumers have left `tokenTarget`, `MdTarget`, `titleTarget`, and `heldTarget` (`linkClicks.ts:45,53`, `cellStatic.tsx:45,613-616`, `valueTarget.ts`, `citationPointer.ts`, `useConnectionAutocomplete.ts:86`).
- [x] Check for unnecessary code or mistakes (`connectionsApi.ts` exports `ConnectionsApi`, `LinkLook`, `linkLook`, `linkClass`, and `headingMissing` only; nothing under `MarkdownPM/` imports `LinkMenuTarget` from it).

#### Task 3-3

**TASK:** Every consumer resolves through `resolveLink`: `heldTarget`, `valueTarget`, `linkResolver`, and the fabricated `§` targets go; a `§` run in a held value or cell gets the menu (Open and Copy) and the glance; `valueTarget.ts` becomes `valueMenuTarget.ts`, holding the one function left; `assignValue` keeps reading the shared index.

**NOW:** `linkClicks.ts:33` fabricates `{ kind: 'self' }` for a `§` run and `:54` applies `heldTarget` after `tokenTarget`; `resolveFollow` (`:91-110`) applies `heldTarget` again and switches on `MdTarget`; `cellStatic.tsx:611-616` does the fabrication and the two applications again, and `:583,595` guard the menu and glance on `found?.tk`; `citationPointer.ts:42`, `valueTarget.ts:17-27` (its `valueTarget` runs the cell tokenizer to find one whole link; `valueMenuTarget` is the file's other export, read by `PropertyPanel.tsx`, `LinkCell.tsx`, `TableView.tsx`, `CardValue.tsx`), `LinkCell.tsx:38-39,69`, `PropertyValueInput.tsx:16-22,60` (`linkResolver`), `parseEditorValue.ts:7-10,41-47`, `useConnectionAutocomplete.ts:86-93,117,144-147`, `embedWidget.tsx:397`, `linkEdit.ts:245`, `assignValue.ts:54-57` (which already reads the shared memoized index through `pageIndexOf(tree)`), and `TextCell.tsx:56`.

**CHANGE**

- [x] Rewrite `mdLinkTarget.test.tsx:8,52-86,192,202` and `valueTarget.test.ts:21-46` (renamed with its file) as `resolveLink` cases; add to `TextCell.test.tsx` that a `§Setup` run in a held value opens a menu whose rows are Open and Copy (no Rename, no Remove) and glances; `PropertyValueInput.test.tsx:138-146` holds through `resolveLink`. Watch them fail.
- [x] Sweep the consumers as below; `git mv Core/Properties/Cells/valueTarget.ts Core/Properties/Cells/valueMenuTarget.ts` (and its test) and repoint its four importers.

**AFTER**

```Core/MarkdownPM/Links/linkClicks.ts diff
@@ imports @@
-import { linkMenuTarget, linkStatus, tokenTarget, type ConnectionsApi, type MdTarget } from './connectionsApi'
+import type { ConnectionsApi } from './connectionsApi'
+import { linkMenuTarget } from '../../Actions/connectionMenu'
+import { bareHeading, readOccurrence, type ResolvedLink, resolveLink } from '../../Connections/linkValue'
-import { type EditorHost, editorHost, type OwnPage, ownPage, pageEditorAt } from '../api'
+import { type EditorHost, editorHost, heldOf, type OwnPage, ownPage, pageEditorAt } from '../api'
@@ LinkHit @@
-  target: MdTarget
+  target: ResolvedLink
@@ sectionRunAt @@
-    target: { kind: 'self', heading: text.slice(1) },
+    target: bareHeading(text.slice(1), heldOf(ownPage(view))),
@@ linkUnder @@
-  const target = heldTarget(tokenTarget(api, docString(view.state.doc), tk), ownPage(view))
+  const target = resolveLink(readOccurrence(docString(view.state.doc), tk.link), api?.index, heldOf(ownPage(view)))
   …
-    hidesSyntax: linkStatus(target) !== 'phantom',
+    hidesSyntax: target.kind !== 'unresolved' || target.status !== 'phantom',
@@ heldTarget, resolveFollow, dwellTarget @@
-/** A bare `#Heading` held by a value names the page holding the value. */
-export const heldTarget = (target: MdTarget, own: OwnPage | null): MdTarget =>
-  target.kind === 'self' && own?.kind === 'held'
-    ? { kind: 'page', page: own.page, heading: target.heading }
-    : target
-/** What a follow does once the surface it starts on is known: `own` is the page a bare `#Heading` answers to. */
+/** What a follow does once the surface it starts on is known: `own` is the body a bare `#Heading` travels in. */
 export function resolveFollow(
-  target: MdTarget,
+  target: ResolvedLink,
   own: OwnPage | null,
   api: ConnectionsApi | undefined,
   event: Pick<MouseEvent, 'metaKey' | 'ctrlKey'>,
   openLink: (url: string) => void,
 ): (() => void) | null {
-  const named = heldTarget(target, own)
-  switch (named.kind) {
+  switch (target.kind) {
     case 'self':
       return own?.kind === 'body'
-        ? () => travelToHeading(own.view, named.heading, own.view.posAtDOM(own.seat))
+        ? () => travelToHeading(own.view, target.heading, own.view.posAtDOM(own.seat))
         : null
     case 'page':
-      return api ? () => api.open(named.page, named.heading, isCmd(event)) : null
+      return api ? () => api.open(target.page, target.heading, isCmd(event)) : null
     case 'url':
-      return () => openLink(named.url)
-    case 'invalid':
+      return () => openLink(target.url)
+    case 'unresolved':
       return null
   }
 }
 export function dwellTarget(
-  target: MdTarget,
+  target: ResolvedLink,
@@ linkPointer @@
-      const target = hit.onText && linkMenuTarget(hit.target, !view.state.readOnly)
+      // A run has no link text to rename or remove, so its menu offers what the target alone supports.
+      const target = hit.onText && linkMenuTarget(hit.target, !!hit.tk && !view.state.readOnly)
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ imports @@
-import { dwellTarget, followTarget, heldTarget } from '../Links/linkClicks'
+import { dwellTarget, followTarget } from '../Links/linkClicks'
+import { bareHeading, readOccurrence, resolveLink } from '../../Connections/linkValue'
+import { heldOf } from '../api'
@@ cellLinkTarget @@
   if (!el || !span || !api) return null
+  const held = heldOf(own)
   if (el.classList.contains('md-section-run'))
-    return {
-      el,
-      target: heldTarget({ kind: 'self', heading: (el.textContent ?? '').slice(1) }, own),
-    }
+    return { el, target: bareHeading((el.textContent ?? '').slice(1), held) }
   const tk = linkTokenAt(cellTokens(text), span[0])
-  return tk ? { el, tk, target: heldTarget(tokenTarget(api, text, tk), own) } : null
+  return tk ? { el, tk, target: resolveLink(readOccurrence(text, tk.link), api.index, held) } : null
 }
@@ onContextMenu, onPointerOver @@
       const found = linkAt(e)
-      if (!found?.tk) return false
-      const tk = found.tk
-      const target = linkMenuTarget(found.target, authoring?.editable() ?? false)
+      if (!found) return false
+      // A run has no link text to rename or remove, so its menu offers what the target alone supports.
+      const target = linkMenuTarget(found.target, !!found.tk && (authoring?.editable() ?? false))
       if (!target) return false
       e.preventDefault()
       e.stopPropagation()
-      void api.menu(target).then((action) => action && authoring?.apply(tk, action))
+      void api.menu(target).then((action) => action && found.tk && authoring?.apply(found.tk, action))
       return true
     …
-      if (found?.tk) dwellTarget(found.target, glance, found.el)?.()
+      if (found) dwellTarget(found.target, glance, found.el)?.()
```

`cellLinkTarget` keeps its `own` parameter: a resting Text cell is a static render with no editor (`TextCell.tsx:36-50` passes `heldBy(holder)` into `linkGestures`), so the holder arrives from the caller, never from the DOM.

```Core/Properties/Cells/valueMenuTarget.ts (was valueTarget.ts) diff
-import type { ConnPage } from '../../Connections/pageIndex'
-import { wholeLinkToken } from '../../MarkdownPM/Engine/tokens'
-import { type ConnectionsApi, type LinkMenuTarget, linkMenuTarget, type MdTarget, tokenTarget } from '../../MarkdownPM/Links/connectionsApi'
-import { heldTarget } from '../../MarkdownPM/Links/linkClicks'
-import { heldBy } from '../../MarkdownPM/api'
-import { cellTokens } from '../../MarkdownPM/Tables/cellStatic'
-import { isValidLink } from '../../Paths/urlPath'
+import { type LinkMenuTarget, linkMenuTarget } from '../../Actions/connectionMenu'
+import { readLinkText, resolveLink } from '../../Connections/linkValue'
 import { holderOf, type ValueContext } from '../valueContext'
 import type { ViewRow } from '../../Views/viewRow'
-export function valueTarget(api: ConnectionsApi | undefined, raw: string, holder?: ConnPage): MdTarget {
-  const text = raw.trim()
-  const tk = wholeLinkToken(cellTokens(text), text)
-  if (tk) return heldTarget(tokenTarget(api, text, tk), heldBy(holder))
-  return isValidLink(text) ? { kind: 'url', url: text } : { kind: 'invalid' }
-}
 export const valueMenuTarget = (ctx: ValueContext, row: ViewRow, raw: string, hideable: boolean): LinkMenuTarget | null =>
-  linkMenuTarget(valueTarget(ctx.connections?.(), raw, holderOf(row, ctx)), true, { hideable })
+  linkMenuTarget(resolveLink(readLinkText(raw), ctx.connections?.()?.index, holderOf(row, ctx)), true, { hideable })
```

```Core/Properties/Cells/LinkCell.tsx diff
-import { valueTarget } from './valueTarget'
-  const target = valueTarget(api, raw, holder)
   const written = readLinkText(raw)
+  const target = resolveLink(written, api?.index, holder)
   …
-          const go = resolveFollow(target, heldBy(holder), api, e, openWebLink)
+          const go = resolveFollow(target, null, api, e, openWebLink)
```

```Core/Properties/parseEditorValue.ts + Pickers/PropertyValueInput.tsx diff
 interface LinkEditContext {
-  resolve: PageIndex['resolve']
+  index: PageIndex | undefined
+  own: ConnPage | undefined
   keepTitle: boolean
 }
   if (type === 'link' && link)
     return linkValueFromEdit(
       raw,
       current?.kind === 'link' ? current.value : undefined,
-      link.resolve,
+      link.index,
+      link.own,
       link.keepTitle,
     )
 PropertyValueInput.tsx:
-import type { ConnPage, PageIndex } from '../../Connections/pageIndex'
+import type { ConnPage } from '../../Connections/pageIndex'
-const linkResolver =
-  (api: ConnectionsApi | undefined, holder: ConnPage | undefined): PageIndex['resolve'] =>
-  (title) => {
-    if (title !== '') return api?.resolve(title) ?? { status: 'phantom' }
-    return holder ? { status: 'resolved', page: holder } : { status: 'phantom' }
-  }
       : parseEditorValue(def.type, text, current, {
-          resolve: linkResolver(connections?.(), holder),
+          index: connections?.()?.index,
+          own: holder,
           keepTitle,
         })
```

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts diff
@@ page memo @@
-    if (title) { const named = titleTarget(host.connections(), title); return named.kind === 'page' ? named.page : null }
-    if (!heading) return null
-    const own = viewRef.current && ownPage(viewRef.current)
-    return own?.kind === 'held' ? own.page : null
+    if (title) return host.connections()?.index.resolve(title).page ?? null
+    return (heading && viewRef.current && heldOf(ownPage(viewRef.current))) || null
@@ lookup @@
-    return conn.candidates(q, AC_MAX).map((p) => pageRow(p, conn))
+    return conn.index.candidates(q, AC_MAX).map((p) => pageRow(p, host))
@@ commit (interim; Task 4-3 folds `pointed` into keepsShown) @@
-    const pointed = container?.kind === 'url' || (container?.kind === 'page' && conn?.resolve(container.title).status === 'resolved')
+    const kind = resolveLink(container, conn?.index).kind
+    const pointed = kind === 'page' || kind === 'url'
```

```other one-line reads diff
 citationPointer.ts:42   followTarget(resolveLink(readOccurrence(lone.text, lone.tk.link), api?.index, heldOf(ownPage(event.target as Element))), api, event)
 embedWidget.tsx:397     conn?.index.resolve(e.title).page
 linkEdit.ts:245         shownAlias(link.text, api.index, w.was)
 assignValue.ts:57       shownAlias(value.value, pageIndexOf(tree), was)
 TextCell.tsx:56         resolveFollow(target, null, …)   (own is the holder's already inside target)
```

**VERIFY**

- [x] `linkClicks`, `cellStatic`, `citationPointer`, `LinkCell`, `TextCell`, `PropertyValueInput`, `useConnectionAutocomplete`, and `embedWidget` tests pass; `linkEdges.test.tsx:369-412` (a body's `§` run: no page, no menu) still passes, since a body passes no holder.
- [x] A held `[[#H]]` still draws bare in a Text pane (drawing passes no `own`).
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (`heldTarget`, `valueTarget`, `linkResolver`, `tokenTarget`, `titleTarget`, `resolveMdTarget`, `linkStatus`, `MdTarget`, and `parseConnectionText` have no reader; the bare-heading rule is spelled once; no file is named after a function it no longer holds).

#### Task 3-4

**TASK:** `[](Page)` draws its default label in the editor and in a resting cell, through `defaultLabel`, read from the token's occurrence.

**NOW:** The editor's markdown loop (`decorations.ts:531-536`) pushes the content mark only when `contentRange` is non-empty (CodeMirror refuses an empty mark) and hides both markers, so `[](Page)` draws as nothing; that `if` becomes the widget branch. The resting cell (`cellStatic.tsx:161`) draws `draw(cs, ce, inner)`, also nothing. Both already resolve the link through `linkLook`, which since Task 3-2 reads `readOccurrence(text, tk.link)`.

**CHANGE**

- [x] Add a decoration test: `[](Alpha)` with Alpha held draws `Alpha`, `[](Alpha#Setup)` draws `Setup`, and a phantom `[](Nowhere)` draws `Nowhere` as phantom; a `cellStatic` test for the same three. Watch them fail.
- [x] `linkLook` decides the label once, from what the link resolved to (a page reached through an address-shaped destination labels by the page, so `[](notes.io#Intro)` draws `Intro` as the emptied-label fill does); in `decorations.ts`, when `tk.contentRange` is empty, place a `Decoration.widget` carrying a `LabelWidget` (a `GlyphWidget` subclass drawing one `span` with the link's class, `md-link-label`, and `look.label`) at `tk.contentRange[0]`, `side: 1`; `linkUnder` reads a click on that span through `posAtDOM`, since `posAtCoords` resolves a point widget to a neighbour.
- [x] In `cellStatic.tsx`, the `wikiLink`/`link` case and its phantom branch render `look.label` where `cs === ce`, carrying `md-link-label`; `markdown-pm.css` hides `.md-connection-phantom.md-link-label` under `:root.plain-unresolved`, so a phantom empty label draws its label as a phantom in the editor and the cell alike and reads as its raw syntax under the plain-links setting (the owner's ruling, 10-16-2026).

**AFTER**

```Core/MarkdownPM/Links/connectionsApi.ts diff
@@ linkLook @@
-  const target = resolveLink(readOccurrence(text, tk.link), conn?.index)
+  const written = readOccurrence(text, tk.link)
+  const target = resolveLink(written, conn?.index)
   const status = target.kind === 'unresolved' ? target.status : 'resolved'
   …
+  const named = written?.kind !== 'url' ? written : target.kind === 'page' ? written.page : undefined
+  const label = named ? defaultLabel(named.title, named.heading) : written?.kind === 'url' ? written.url : ''
-  return { target, status, … }
+  return { label, target, status, … }
```

```Core/MarkdownPM/decorations.ts diff
@@ widgets @@
+/** A markdown link with an empty label still shows something: its target's default label, drawn as the link is. */
+class LabelWidget extends GlyphWidget {
+  constructor(private readonly label: string, private readonly className: string) { super() }
+  eq(other: LabelWidget): boolean { return other.label === this.label && other.className === this.className }
+  toDOM(): HTMLElement { const el = document.createElement('span'); el.className = cx(this.className, 'md-link-label'); el.textContent = this.label; return el }
+}
@@ markdown loop @@
     const look = linkLook(conn, text, tk, ownKeys, headingLinkStyle)
+    if (tk.contentRange[0] === tk.contentRange[1])
+      ranges.push(Decoration.widget({ widget: new LabelWidget(look.label, linkClass(look)), side: 1 }).range(tk.contentRange[0]))
+    else … the content mark as before …
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ the wikiLink/link case @@
             ) : (
-              draw(cs, ce, inner)
+              cs === ce ? look.label : draw(cs, ce, inner)
             )}
@@ the phantom branch @@
-              <span className="md-connection-phantom" {...verbatim(cs, ce)}>
-                {text.slice(cs, ce)}
+              <span className={cx('md-connection-phantom', cs === ce && 'md-link-label')} {...verbatim(cs, ce)}>
+                {cs === ce ? look.label : text.slice(cs, ce)}
```

```Core/MarkdownPM/markdown-pm.css diff
+:root.plain-unresolved .md-connection-phantom.md-link-label {
+  display: none;
+}
```

**VERIFY**

- [x] The decoration and cell tests pass; `linkValue.test.ts:88` reads `[](Page)` as a page link.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (the label is spelled only through `defaultLabel`; the occurrence is read once per token per build).

#### Review Checkpoint

- [x] `grep -rn "resolve(" Core --include='*.ts' --include='*.tsx' | grep -v test` shows the page-before-address rule and the bare-heading rule in `linkValue.ts` only.
- [x] A hand-written `example.com` value, Copy Link, `href`, sort, filter, Full Link text, and a pasted bare address all behave as at BASELINE (probed at the checkpoint; the live drive's group 2 confirms it in Phase 8).
- [x] `[](Page)` draws its default label in the editor and in a resting cell; no second default-label rule exists under `Core/`.
- [x] `hostGraph.test.ts` and `engineGraph.test.ts` green; `linkValue.ts` imports nothing from `MarkdownPM/` beyond `Engine/markdownCode`.
- [x] Net Ledger: Phase 3 measured.

---

### Phase 4 — One Tracker, One Baseline

**GOAL:** One state field holds the link an edit is being made inside and how it read before, one plugin settles it when the caret leaves the whole link, on a blur not into the caret pane, or on a host's flush, and the typing color, alias memory, emptied-part collapse, and the Remove Title baseline all read that one field. The two trackers in `aliasOnLeave`, `linkTyping`, and the picker's `origin` go; every host that can unmount its editor mid-edit flushes; Remove Title becomes one rule over one baseline for the picker, paste, and the Link field, with the writer only writing; and the heading-rename settle moves to `Links/`, beside the link settle's own file.

#### Task 4-1

**TASK:** `linkWriting` and `linkSettled` replace `linkTyping`; the field and its settle live in one file, `Links/linkSettle.ts`, beside `headingRenameSettle.ts`, and `linkReveal.ts` keeps the rest state alone; `linkWithin` sits beside the other editor readers in `Input/edits.ts`; decorations read the one field for both syntaxes.

**NOW (at BASELINE):** `linkTyping` (`linkReveal.ts:18-26`) marks a wikilink's start on any doc change and clears on a caret move, read by `decorations.ts:466,613-617` for wikilinks alone; `aliasOnLeave` keeps its own `writing` and `edited` closures (`linkEdit.ts:235-286`); `acQuery.ts:17-56` keeps a third copy as `origin`. Decorations read state fields synchronously inside `build`, so a field is never stale.

**CHANGE**

- [x] `linkSettle.test.ts` holds the field's cases: an edit landing in a link of either syntax arms it with how the link read before; a change outside every link leaves it; a bare caret move keeps it; a `linkSettled` effect clears it; the field maps through an insertion before the link and keeps its identity while the start stands; a paste retarget over the whole link keeps `was`; a link whose opener is deleted (Delete Link, undo of a typed link) clears it rather than handing its baseline to a neighbour starting at the same offset; a pasted `[[B|C]] x` arms it. `edits.test.ts` pins `linkWithin` reaching a link wholly inside a range.
- [x] `linkSettle.ts` as below; `decorations.ts` reads `view.state.field(linkWriting, false)?.start` in both the wikilink and the markdown pass, and rebuilds when the field's identity changes (the clearing dispatch changes neither document nor selection); `surface.ts` mounts `linkWriting` where it mounted `linkTyping`.

**AFTER**

```Core/MarkdownPM/Links/linkSettle.ts (landed)
// The link an edit is being made inside, from the change that arms it to the settle that remembers its alias and collapses its emptied parts.

export interface Writing { start: number; was: string }
export const linkSettled = StateEffect.define<null>()

/** … Armed by a typed or deleted change reaching into a link, mapped through changes, dropped with its opener, cleared when the settle lands. */
export const linkWriting = StateField.define<Writing | null>({
  create: () => null,
  update(w, tr) {
    if (tr.effects.some((e) => e.is(linkSettled))) return null
    if (!tr.docChanged) return w
    const edited = tr.isUserEvent('input') || tr.isUserEvent('delete')
    if (!w) return edited ? changedLink(tr, null) : null
    const start = tr.changes.mapPos(w.start, 1)
    const kept = start === w.start ? w : { start, was: w.was }
    const relinked = edited ? changedLink(tr, kept) : null
    return relinked ?? (tr.changes.mapPos(w.start, 1, MapMode.TrackAfter) === null ? null : kept)
  },
})

/** How the link at `start` read before the edit being made inside it began, else as it reads now; `now` is null for a link that never closed. */
export function baselineAt<T extends string | null>(state: EditorState, start: number, now: T): string | T

// The link already armed keeps its baseline, a replace over the whole of it included; only a change landing in another link reads the old document for how that link read.
function changedLink(tr: Transaction, kept: Writing | null): Writing | null  // first changed range reaching into a link, through `linkWithin(docScan.after(tr), fromB, toB)`
```

```Core/MarkdownPM/Input/edits.ts (landed, beside linkAt)
/** The first link of either syntax on the line at `from` that reaches strictly into `from`–`to`, so typing just past a closer never arms and a caret on a closer is outside. */
export function linkWithin(scan: DocScan, from: number, to = from): { start: number; text: string } | null
  // one pass over linkOccurrences(line, inCode); ls + o.full[0] < to && ls + o.full[1] > from
```

The typing color covers both syntaxes and lasts until the settle lands (standing ruling 12). Cost: an unarmed caret move is two null field reads; an armed caret move is one caret-line pass; an input is one changed-range lookup on the caret line through the cached `docScan.after(tr)`, which `linkTyping` already paid, and the old document is read only when a change lands in a link other than the armed one. A keystroke inside the armed link keeps the field object, so nothing allocates.

**VERIFY**

- [x] `linkSettle.test.ts` passes; decoration tests pass with the color read from `linkWriting`; `mdLinkTarget.test.tsx` pins the color on a markdown link being typed.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 4-2

**TASK:** `linkSettle`, one plugin mounted as `linkSettle.of(scope)` (Task 8-1 adds `remembers` when the Link field mounts the editor), replaces `aliasOnLeave`; `emptied` collapses every empty part of the settled link, in both syntaxes, when the caret leaves the whole link, filling an emptied label by the rule the draw uses (`pageLabel`, shared with `LinkLook.label`: by what the link resolved to, so an address-shaped destination a page holds fills with the page's default label); `MarkdownEditor`, `CellEditor`, and `TextPane` flush through `view.plugin(linkSettle)`.

**NOW (at BASELINE):** `aliasOnLeave` (`linkEdit.ts:162-290`) runs two machines in one listener: `writing` (remember on leaving the link) and `edited` with `slotNear` (collapse on leaving the slot), each re-reading the caret line, with a blur handler and no unmount flush; `collapseSlot` runs the deferred collapse against a stale offset (`:206-212`). `CellEditor` and `TextPane` destroy their editors in passive cleanup after React detached the node, where CodeMirror's `destroy()` fires no blur (`@codemirror/view` 6.43.1), and `TextPane`'s `save()` reads the document in `close()` before any settle, so an alias typed into a pane and left by Return, or into a cell left by Tab, is never remembered and never collapsed.

**CHANGE**

- [x] `linkSettle.test.ts` holds the settle's cases (moved from `linkEdit.test.tsx`, which keeps the alias gestures): collapse on leaving the whole link and on blur; the raw-HTML and code gates, each typing into the link first; a wikilink's emptied alias stays `|` while the caret is still in the title and collapses on leaving the link; `[[A|]]` with the title retyped tidies to `[[A]]`; a caret back in the link before the deferred collapse keeps its empty slot; two leaves before the collapse remember once; a flush after a deferred settle collapses at once; the RETARGETS paste rows arm the tracker and an unmount flush remembers; the emptied markdown label rows (`[](Alpha)` fills, `[](https://x)` stays, `[](notes.io)` fills where a page holds it). `TextPane.test.tsx`: an alias typed and closed by Return is remembered and its emptied alias collapsed in the saved value; `cellAlias.test.tsx`: the same for a Tab out.
- [x] `linkSettle` and `emptied` as below in `linkSettle.ts`; `aliasOnLeave`, `Slot`, `slotNear`, `collapseSlot`, `Written`, `typedInto`, `lineNear`, and the old `linkWithin` go; `surface.ts` mounts `linkSettle.of(scope)`.
- [x] Flush in three hosts: `MarkdownEditor.tsx` beside the heading settle's; `CellEditor.tsx` before `onClose`; `TextPane.tsx` inside `save()` before it reads the document (a Return close runs `save()` twice; the second flush finds the field clear).

**AFTER**

```Core/MarkdownPM/Links/linkSettle.ts (landed)
/** The link starting exactly at `start`, with its line. */
function linkStartingAt(state: EditorState, start: number): { line: Line; o: LinkOccurrence } | null

/** Every empty part of the link at `start`: an empty alias takes its pipe and an empty heading its hash … a markdown link can't drop its label, so an empty one shows the label the draw gives it … an emptied address label stays empty. */
function emptied(state: EditorState, start: number): ChangeSpec[]
  // wiki: the emptied heading's `#`..end and the emptied alias's `|`..end, in document order
  // markdown: pageLabel(written, resolveLink(written, state.facet(editorHost).connections()?.index)), escaped, or nothing

export const linkSettle = ViewPlugin.define(
  (view: EditorView, scope: MarkdownScope) => {
    let settling: number | null = null
    const holds = (start) => view.hasFocus && linkWithin(docScan(view.state.doc), view.state.selection.main.head)?.start === start
    const remember = (w: Writing) => { … linkStartingAt(view.state, w.start) … shownAlias(text, api.index, w.was) … host.aliases.edit(page.id, { op: 'add', alias }) }
    const settle = (w: Writing, defer: boolean) => {
      if (settling === w.start && defer) return
      const html = inRawHtml(view.state, w.start, scope)
      if (settling !== w.start && !html) remember(w)
      settling = w.start
      const collapse = () => {
        if (settling === w.start) settling = null
        if (defer && holds(w.start)) return
        const armed = view.state.field(linkWriting)?.start === w.start
        view.dispatch({ changes: html ? [] : emptied(view.state, w.start), effects: armed ? linkSettled.of(null) : [] })
      }
      if (defer) setTimeout(collapse, 0)
      else collapse()
    }
    return {
      update(u) {
        const was = u.startState.field(linkWriting)
        const now = u.state.field(linkWriting)
        if (was && now) { const start = u.changes.mapPos(was.start, 1); if (now.start !== start) settle({ start, was: was.was }, true) }
        if (now && u.selectionSet && !holds(now.start)) settle(now, true)
      },
      flush() { const w = view.state.field(linkWriting); if (w) settle(w, false) },
    }
  },
  { eventHandlers: { blur(e) { if (!inCaretPane(e.relatedTarget)) this.flush(); return false } } },
)
```

`inRawHtml` is asked once at settle time, where `scope` is closed over, covering the remember and the collapse, so the field stays scope-free; `linkAt` already masks code, so no code gate is needed. One plugin with an argument, as `headingRenameSettle` is mounted and flushed, so every host reaches it through `view.plugin(linkSettle)`. A settle inside `update` dispatches only through the deferred path; a flush after a deferred settle collapses at once, and the timer's run then finds nothing empty and the field clear. The re-arm-elsewhere branch settles the link the field left, at its mapped start.

**VERIFY**

- [x] `linkSettle.test.ts`, `linkEdit.test.tsx`, `TextPane.test.tsx`, and `cellAlias.test.tsx` pass; `connectionCommit.test.tsx` still sees one `edit` call per pick-and-leave.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (no second line read per update; `slotNear`, `typedInto`, `collapseSlot` have no reader; `linkSettle` is the one instance every host flushes).

#### Task 4-3

**TASK:** One Remove Title rule over one baseline: `keepsShown(baseline, next, removeTitle, index)` owns "pointed" (any resolution, this document's own heading included) and `sameTarget` compares what each side resolves to (page id and heading, own heading, or address), so a url arm carrying `page?` and the page it names are one target; `retarget(syntax, next, into?)` only writes, every caller folding the alias decision into `next.alias`; the picker and paste read their baseline through `baselineAt` (the field's `was` when armed at this link, else the link as it stands, null for a link that never closed) and the shown text they keep from the link as it stands; the Link field passes its `current` as both until Task 8-2 retires its field-only path; `acQuery`'s `origin` goes.

**NOW (at BASELINE):** The picker snapshots `origin` at query birth (`acQuery.ts:17-56`) and decides `pointed` itself (`useConnectionAutocomplete.ts:144-147`); paste applies the setting bare against the link as it stands (`pasteLink.ts:56,69`); the Link field applies it bare (`PropertyValueInput.tsx:42`, `parseEditorValue.ts:41-46`); `keepsShown` (`linkValue.ts:187-191`) takes a pre-folded `keepTitle`, `retarget` decides and writes in one, and `commitEdit` reads the decision at `autocomplete.ts:250,276,312` through `opts.container` and `opts.keepTitle`. `pasteLink.test.tsx:350-351` mount with no connections, so `Page1` never pointed and the rows pin a drop the ruled rule refuses.

**CHANGE**

- [x] `acQuery.test.ts`'s `origin` cases moved to `linkSettle.test.ts` as field cases; `linkValue.test.ts` holds `keepsShown` (setting off or null baseline keeps; phantom keeps; a resolved re-aim drops unless the same target, heading included; an address counts as pointed; a destination a page holds is that page; this document's own heading counts as pointed) and `retarget` as a writer; `pasteLink.test.tsx` seeds Page1 held for the RETARGETS rows, adds phantom rows that keep the shown text, and pins that a title retyped by one character and then pasted over drops the shown text under Remove Title; `connectionCommit.test.tsx` pins `[Nice](Alpha` with Pair Brackets off, then a pick, keeping `Nice`.
- [x] `keepsShown`, `sameTarget`, `retarget`, the hook's commit, `commitEdit`'s `{ kept? }`, and paste as below; `pasteAsMenu.ts:95` and `linkValueFromRename` call the writer bare; `linkValueFromEdit` folds `keepsShown(was, next, !keepTitle, index)` into `next.alias` (the Link field's one line until Task 8-2); `parseEditorValue.ts` and `PropertyValueInput.tsx` already carry `index` from Task 3-3.
- [x] `LinkOrigin`, `originOf`, `originAfter`, `linkStart`, the `origin` field, and `acQuery.ts`'s `closerOf` import deleted.

**AFTER**

```Core/Connections/linkValue.ts (landed)
const sameTarget = (a: ResolvedLink, b: ResolvedLink): boolean  // page id + normalized heading; self headings; normalized urls

/** Whether a retarget keeps the link's shown text: always with Remove Title On Link Change off, and otherwise only where the link pointed somewhere as it read before the edit (`baseline`, null for a link that never closed) and is being re-aimed elsewhere. */
export function keepsShown(baseline: LinkTarget | null, next: LinkTarget, removeTitle: boolean, index?: PageIndex): boolean {
  if (!removeTitle || baseline === null) return true
  const was = resolveLink(baseline, index)
  return was.kind === 'unresolved' || sameTarget(was, resolveLink(next, index))
}

/** Writes a link to `next` in the syntax asked for, the markdown form where a wikilink can't spell it; whether an earlier alias rides along is `keepsShown`'s decision, folded into `next.alias` by the caller. */
export function retarget(syntax: 'wiki' | 'markdown', next: LinkTarget, into?: { format: LinkDisplay; title?: string }): LinkPaste
```

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts (landed; the interim Task 5-1 retires)
    // Until Task 5-1 puts the link's span on every query, the picker reads the link here: `start` and the closer from the query, `reaims` from its form, and `shown` from the label's own span, restating the label rule because an empty destination reads as no link.
    const start = ac.label ? ac.label.from - 1 : ac.from
    const text = view.state.sliceDoc(start, ac.to) + (ac.label || !ac.closed ? closerOf(ac.form) : '')
    const written = readLinkText(text)
    const was = baselineAt(view.state, start, ac.closed ? text : null)
    const baseline = was === null ? null : readLinkText(was)
    const reaims = ac.form === 'link' ? 'wiki' : ac.form === 'target' ? 'markdown' : null
    const shown = ac.label ? unescapeLabel(view.state.sliceDoc(ac.label.from, ac.label.to).trim()) : written?.alias
    const kept = reaims && shown && keepsShown(baseline, { kind: 'page', syntax: reaims, title: row.value }, settings.removeTitleOnLinkChange, conn?.index) ? shown : undefined
    …
    const { changes, anchor } = commitEdit(ac, row.value, { kept, openAlias, openHeading: opts.openHeading })
```

```Core/MarkdownPM/Autocomplete/autocomplete.ts (landed; Task 5-2 rewrites the arms)
   opts: { kept?: string; openAlias?: boolean; openHeading?: boolean },
   … openHeading arm: const kept = opts.kept ? `|${opts.kept}` : ''
   … link arm: retarget('wiki', { kind: 'page', syntax: 'wiki', title: value, alias: opts.kept })
   … const retitles = ac.form === 'target' && opts.kept === undefined
```

```Core/MarkdownPM/Links/pasteLink.ts (landed)
    const now = scan.text.slice(start, end)
    const was = readLinkText(state ? baselineAt(state, start, now) : now)
    const alias = target.alias ?? (keepsShown(was, target, removeTitleOnLinkChange, index) ? readLinkText(now)?.alias : undefined)
    const write = isLinkDisplay(how) ? pasteAsWrite(…) : retarget(syntax, { ...target, alias }, { format, title })
```

`paste(view, …)` passes `view.state` down; the resting-cell path (`pastedCellText`) passes `null`, since a resting cell never has an edit in flight, and reads the link as it stands. Paste keeps its own strict-inside test beside `linkWithin`: it needs both edges of the selection inside the link and the link's syntax, where the field needs a change that reaches the link.

**VERIFY**

- [x] `linkValue.test.ts`, `pasteLink.test.tsx`, `connectionCommit.test.tsx`, `autocomplete.test.ts`, and `PropertyValueInput.test.tsx` pass; a URL counts as pointed.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (`removeTitleOnLinkChange` is read in three places and inverted only in the Link field's interim; `origin` has no reader; `keepsShown` runs once per commit; `retarget` decides nothing).

#### Task 4-4

**TASK:** `headingRenameSettle` moves from `Guards/` to `Links/` unchanged, with one line stating why it settles on any focus change where the link settle exempts the caret pane.

**NOW (at BASELINE):** `Guards/headingRenameSettle.ts` is imported once (`MarkdownEditor.tsx:17`); it settles on `focusChanged` (`:66`), focus into the alias rename field included, while the link settle exempts the caret pane. It has no test of its own.

**CHANGE**

- [x] `git mv Core/MarkdownPM/Guards/headingRenameSettle.ts Core/MarkdownPM/Links/headingRenameSettle.ts`; the import updated.
- [x] The reason beside `:66`: unlike the link settle, focus into the caret pane settles too, since a heading mid-rename never holds an open picker, so leaving for the pane is leaving.

**VERIFY**

- [x] `MarkdownEditor` imports from the new path; `MarkdownPM.md:8`'s folder sentence is in Phase 9's reconciliation; the settle's lack of a direct test is carried to the final report.
- [x] Run the gates.

#### Review Checkpoint

- [x] One field and one plugin track an edit inside a link; `linkTyping`, `aliasOnLeave`'s two machines, and `acQuery`'s `origin` have no reader.
- [x] An alias typed in a cell and left by Tab, and in a Text pane and left by Return, is remembered and its emptied parts collapsed (the live drive's group 3 additions; the host tests pin both).
- [x] Remove Title On Link Change decides from one rule in the picker, paste, and the Link field; the phantom-container cases keep the shown text in all three.
- [x] Per-update cost on a link-dense line is at or below BASELINE's (one caret-line read per update per reader).
- [x] Net Ledger: Phase 4 measured.

---

### Phase 5 — One Picker Model

**GOAL:** The picker's query is one flat record keyed by syntax and part, with the link's start, end, and shown text on every query; its rows, its closer, and its commit each switch on those two axes; a page pick writes the whole link through the writer with the shown text decided once; an opened slot's caret is read back from the written text through the grammar; markdown picks open the alias list as wikilink picks do; Return in a markdown destination rests in the label; and the alias list stops truncating. Seven form names, three predicates, the `label` side span, `closerOf`, the hook's Phase 4 interim, and the hand-built markdown retarget go. This phase lands on Phase 4's baseline and Phase 2's readers, and leaves the open-link reader reading an emptied slot of a written link as that whole link.

#### Task 5-1

**TASK:** `AutocompleteQuery` becomes `{ syntax, part, start, end, from, to, query, closed, title?, shown? }` built from `linkAt ?? openLinkAt` and `partOf` (exported from here); `listsPages`, `listsHeadings`, `listsAliases`, `closerOf`, `ConnectionForm`, `QueryBase`, the `label` side span, and the hook's interim go; `AutocompletePane`, `acQuery`, and the hook read `part` and `syntax`.

**NOW (at BASELINE):** `autocompleteQuery` (`autocomplete.ts:55-167`) branches seven ways over three readers and returns a union whose `label` arm alone carries `end`; `listsPages`/`listsHeadings`/`listsAliases` (`:45-53`) and `closerOf` (`:218-231`) translate the form back into axes at every consumer (`useConnectionAutocomplete.ts:81,84,116,134,149,155,188,234`, `AutocompletePane.tsx:26,56-63,87-88`, `acQuery.ts:8,27-34`).

**CHANGE**

- [x] `autocomplete.test.ts`, `acQuery.test.ts`, and `mdLinkTarget.test.tsx` assert `{ syntax, part }` with `start`, `end`, and `shown` where one is written; a markdown label query carries `syntax: 'markdown', part: 'shown'`; a `§` run carries `syntax: 'prose', part: 'heading'`; `[[Pa[x](y)` reads as the grammar yields it (a markdown link labeled `[Pa[x`), pinned as a fact of the grammar.
- [x] The query and `autocompleteQuery` as below; the predicates inline (`ac.part === 'title'` and so on) at every consumer; `CLOSER` (private to `autocomplete.ts`) replaces `closerOf`; `sameQuery` compares `syntax`, `part`, `start`, `end`, `from`, `to`, `closed`, `query`, `title`, `shown`.
- [x] `openLinkAt` reads an emptied slot of a written link as that whole link (`[[Old|Mine]]` with `Old` deleted read as `[[Alpha]]|Mine]]` after a pick, since the grammar refuses the empty title and the reader kept only the text before the caret); its first read splices the holder into the whole line and keeps the occurrence only when the holder stands alone in its slot, else it falls back to the text before the caret plus a closer. `edits.test.ts` pins `[[|Mine]]`, `[x]()`, `[]()`, and `[[` typed before `[[B]]` reading only the open link.

**AFTER**

```Core/MarkdownPM/Autocomplete/autocomplete.ts (landed)
export type QuerySyntax = 'wiki' | 'markdown' | 'prose'
/** One query, two axes: which syntax holds the caret (`prose` for a bare `§` run, always in its heading) and which part, the grammar's `LinkPart`. `start`..`end` is the whole link, `from`..`to` the part's text, `closed` whether the closer follows the caret, and `shown` the link's alias or label, read as the query reads its slot, where one is written. */
export interface AutocompleteQuery { syntax: QuerySyntax; part: LinkPart; start: number; end: number; from: number; to: number; query: string; closed: boolean; title?: string; shown?: string }
const CLOSER: Record<QuerySyntax, string> = { wiki: ']]', markdown: ')', prose: '' }

/** The title a link's heading or shown slot lists against: a wikilink's as written, a markdown destination's decoded. */
function namedTitle(line: string, o: LinkOccurrence): string

export function autocompleteQuery(scan: DocScan, caret: number, armed?: number): AutocompleteQuery | null {
  … the §-run branch returns { syntax: 'prose', part: 'heading', start: armed, end: caret, from: armed + 1, to: caret, query, closed: true, title: '' } …
  const closedLink = linkAt(scan, caret)
  const o = closedLink ?? openLinkAt(scan, caret)
  const part = o && partOf(o, rel)
  if (!o || !part) return null
  const slot = o[part]!
  const raw = line.slice(slot[0], slot[1])
  const query = o.syntax === 'wiki' ? raw : part === 'shown' ? unescapeLabel(raw) : decodeLinkTarget(raw)
  const shown = o.shown ? line.slice(o.shown[0], o.shown[1]).trim() : ''
  return {
    syntax: o.syntax, part, start: lineStart + o.full[0], end: lineStart + o.full[1], from: lineStart + slot[0], to: lineStart + slot[1], query,
    closed: closedLink !== null || o.full[1] > rel,
    ...(part === 'title' ? {} : { title: namedTitle(line, o) }),
    ...(shown ? { shown: o.syntax === 'wiki' ? shown : unescapeLabel(shown) } : {}),
  }
}
```

```Core/MarkdownPM/Input/edits.ts (landed)
const SLOT_HOLDER = '\u0000'
/** The link the grammar can't read at `at` because its slot there is empty: a written link whose slot at the caret was emptied, read whole with that slot empty, else the link still being written before `at`, as it reads once closed, its slot cut back to the caret. */
export function openLinkAt(scan: DocScan, at: number): LinkOccurrence | null
  // the whole line with the holder at the caret, kept where partOf's slot is exactly [rel, rel + 1] and mapped back; else the head plus a closer, clamped to the head
export function partOf(o: LinkOccurrence, rel: number): LinkPart | null
```

Cost: `autocompleteQuery` is one `linkAt`, one `openLinkAt` where no closed link holds the caret, and one `partOf`, as at BASELINE; `openLinkAt` pays one more occurrence walk over the line than before where the caret sits in no closed link on a line holding link syntax (the typing-a-link case with Pair Brackets off, or an emptied slot).

**VERIFY**

- [x] `autocomplete.test.ts`, `acQuery.test.ts`, `edits.test.ts`, and `mdLinkTarget.test.tsx` pass.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (`form` appears nowhere; no consumer re-derives an axis from a name).

#### Task 5-2

**TASK:** `commitEdit` becomes three arms switched on `part` (prose falling in `heading`): a page pick writes the whole link through `retarget` with the shown text decided once by the hook from the query, an opened slot's anchor read back from the written text through `wholeLink`; a heading pick inserts in place and never re-aims (one opening the alias slot inserts the heading and seats the caret in the empty label or after the pipe it writes); a shown pick inserts the escaped label or raw alias; every finishing pick rests past the closer through one anchor rule; the alias-stage gate is one rule in both syntaxes.

**NOW (at BASELINE):** `commitEdit` (`autocomplete.ts:233-320`) is eight arms: two opening-slot arms hand-build `[[value#…]]` and `[[value|]]`, the `link` arm calls `retarget`, the `target` arm hand-encodes the destination and decides the label fill itself (`:303-319`), the `label`/`alias`/`heading` arms each compute their own anchor, and a closed heading or target pick rests past the closer (`:296-299,316-318`). The alias stage opens for `link` and `heading` forms only (`useConnectionAutocomplete.ts:154-159`), so a markdown pick never offers aliases, and a heading pick into a link already showing an alias would write a second pipe.

**CHANGE**

- [x] `autocomplete.test.ts` holds the markdown parity cases for every wiki case (a page pick into `[x](Old)` with Remove Title on and `Old` resolved writes `[Gamma](Gamma)`; with `Old` phantom writes `[x](Gamma)`; a pick opening the heading slot writes `[](Gamma#)` with the caret after `#`; a pick opening the alias slot writes `[](Gamma)` with the caret in the label; a heading pick opening the alias slot into `[](Gamma#Se)` writes `[](Gamma#Setup)` with the caret in the label, into `[[Gamma#Se]]` writes `[[Gamma#Setup|]]` with the caret in the slot, and into `[](Notes.md#Se)` keeps `Notes.md`; `[[Pa]]` with the chevron on `A|B` writes `[](A%7CB#)`); the closed heading pick rests past the closer in both syntaxes, and `[[Notes#|Mine]]` rests past the link with `Mine` kept. `connectionCommit.test.tsx` holds the retarget table with a `left` column (the stage opens exactly where leaving changes the text; `[](Gamma) x` leaves as `[Gamma](Gamma) x`), the chevron label filled a tick after the pick, the heading-then-alias-stage case in both syntaxes, `[[Old|Mine]]`/`[Mine](Old)` with the title emptied and picked keeping `Mine`, and `[sel](#Setup)`/`[[#Setup|sel]]` picked under Remove Title dropping `sel` (an own-heading link pointed).
- [x] `commitEdit` and the hook's commit as below.

**AFTER**

```Core/MarkdownPM/Autocomplete/autocomplete.ts (landed)
export function commitEdit(ac: AutocompleteQuery, value: string, opts: { kept?: string; openAlias?: boolean; openHeading?: boolean }): { changes: TextEdit[]; anchor: number } {
  const syntax = ac.syntax === 'markdown' ? 'markdown' : 'wiki'
  const closer = ac.closed ? '' : CLOSER[ac.syntax]
  // A whole-link write rests past what it wrote, or inside the slot it opened, read back from the written text through the grammar, so a writer falling back to the other syntax still seats the caret right.
  const whole = (name: { title: string; heading?: string; alias?: string }, open?: 'heading' | 'shown') => {
    const { text } = retarget(syntax, { kind: 'page', syntax, ...name })
    const slot = open && wholeLink(text)?.[open]
    return { changes: [{ from: ac.start, to: ac.end, insert: text }], anchor: ac.start + (slot ? slot[0] : text.length) }
  }
  const inserted = (written: string) => ({ changes: [{ from: ac.from, to: ac.to, insert: written + closer }], anchor: ac.end + written.length - (ac.to - ac.from) + closer.length })
  switch (ac.part) {
    case 'title': {
      const open = opts.openHeading ? 'heading' : opts.openAlias ? 'shown' : undefined
      // Opening a slot writes it empty; a link written in markdown keeps an empty label when opening its heading, for the heading pick to fill, since the label's default is drawn, not written.
      const asMarkdown = !(syntax === 'wiki' && connectionSpells({ title: value }))
      const alias = open === 'shown' ? '' : (opts.kept ?? (open === 'heading' && asMarkdown ? '' : undefined))
      return whole({ title: value, heading: open === 'heading' ? '' : undefined, alias }, open)
    }
    case 'heading': {
      // A heading pick never re-aims the link, so it writes in place; one opening the alias slot finds it empty, since only a link showing nothing opens it, and a wikilink's lone empty pipe gives way to the one it writes.
      const written = ac.syntax === 'markdown' ? encodeLinkTarget(value) : value
      if (!opts.openAlias) return inserted(written)
      if (ac.syntax === 'markdown') return { changes: [{ from: ac.from, to: ac.to, insert: written + closer }], anchor: ac.start + 1 }
      return { changes: [{ from: ac.from, to: ac.end - (ac.closed ? CLOSER.wiki.length : 0), insert: `${written}|${closer}` }], anchor: ac.from + written.length + 1 }
    }
    case 'shown':
      return inserted(ac.syntax === 'markdown' ? escapeLabel(value) : value)
  }
}
```

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts (landed)
    const doc = view.state.doc
    // How the link read before this edit began decides whether the shown text survives a re-aim; the link as it stands is where that shown text is read from.
    const was = baselineAt(view.state, ac.start, ac.closed ? doc.sliceString(ac.start, ac.end) : null)
    const baseline = was === null ? null : readLinkText(was)
    const kept =
      ac.shown && (ac.part !== 'title' || keepsShown(baseline, { kind: 'page', syntax: ac.syntax === 'markdown' ? 'markdown' : 'wiki', title: row.value }, settings.removeTitleOnLinkChange, conn?.index))
        ? ac.shown
        : undefined
    const pageId = row.kind === 'page' ? row.pageId : ac.title ? page?.id : undefined
    // A page or heading pick opens the alias stage on a link left showing nothing, for a page that remembers aliases.
    const openAlias = ac.part !== 'shown' && !opts.openHeading && !kept && settings.aliasPickerOnCommit && pageId !== undefined && host.aliases.list(pageId).length > 0
    …
    const { changes, anchor } = commitEdit(ac, row.value, { kept, openAlias, openHeading: opts.openHeading })
```

The one finishing-anchor rule, `ac.end + delta + closer`, serves a closed and an unclosed link alike, since an unclosed query's `end` is the caret; a markdown heading pick into `[](Page#…)` leaves the label empty for the drawn default label (Task 3-4), and `emptied` writes it when the caret leaves, carrying the pick's rest past the filled label (Task 4-2's collapse adds `restedOnLink` mapped through its changes where `linkRest` holds one); a `§` run has no page, so the alias stage never opens for it.

**VERIFY**

- [x] `autocomplete.test.ts` and `connectionCommit.test.tsx` pass, markdown parity cases included; the alias stage follows a heading commit in both syntaxes; `linkSettle.test.ts` pins the rest carried past a filled label.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (no hand-spelled `[[`, `]]`, `](`, or `)` outside `CLOSER`, the readers, and the writers; `keepsShown` runs once per commit, in the hook).

#### Task 5-3

**TASK:** Return in a closed markdown link's destination rests the caret in its label under `aliasPickerOnCommit`; the alias list drops its 20-row cap and animates arrivals like its sibling lists.

**NOW (at BASELINE):** `commitAliasOnEnter` (`linkEdit.ts`, scoped in Task 2-5) rests past a shown slot only; `aliasRows` slices at `AC_MAX` (`autocomplete.ts:214`) where the page and heading lists don't; `AliasList` animates only drafts (`AliasList.tsx:191`'s `enterOnMount={row.draft}`).

**CHANGE**

- [x] `linkEdit.test.tsx`: Return with the caret in `[x](Alpha)`'s destination and `aliasPickerOnCommit` on rests the caret at the label's end; with the setting off it breaks the line; for a URL destination it rests in the label and the picker lists nothing. `aliasPicker.test.tsx`: 25 aliases all list.
- [x] `commitAliasOnEnter` reads the slot once: a shown slot rests at the closer with the `restedOnLink` effect; a closed markdown link's title or heading slot, with the setting on, rests at `shown[1]` with no effect (a rest applies only at a token's end).
- [x] `aliasRows` loses `.slice(0, AC_MAX)`; `AliasList` reads `const entering = useEntrance(list.rows, (r) => r.key, match === 0)` and passes `enterOnMount={row.draft || entering(row.key)}`.

**AFTER**

```Core/MarkdownPM/Links/linkEdit.ts (landed)
/** Return in an alias or label lands the caret on the closer with no separating space, since the closer is the one caret position that doesn't reveal the syntax; in a written markdown destination, the moment an address is assigned, it moves on to the label, where the picker lists the page's aliases. */
export const commitAliasOnEnter = (scope: MarkdownScope) => (view: EditorView): boolean => {
  const { state } = view
  const sel = state.selection.main
  if (!sel.empty || inRawHtml(state, sel.head, scope)) return false
  const s = slotAt(docScan(state.doc), sel.head)
  if (s?.part === 'shown') {
    const end = s.from + s.link.full[1]
    view.dispatch({ selection: EditorSelection.cursor(end, 1), effects: restedOnLink.of(end) })
  } else if (s?.link.syntax === 'markdown' && state.facet(editorHost).settings().aliasPickerOnCommit)
    view.dispatch({ selection: EditorSelection.cursor(s.from + s.link.shown[1], 1) })
  else return false
  view.focus()
  return true
}
```

**VERIFY**

- [x] `linkEdit.test.tsx` and `aliasPicker.test.tsx` pass; `connectionCommit.test.tsx` still sees one `edit` call per pick-and-leave.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] One query shape, one closer record, one commit switch; `AC_MAX` bounds the page list only.
- [x] Wiki and markdown picks behave as mirrors in every row of `connectionCommit.test.tsx`'s tables.
- [x] The live drive's group 3 (`live-drive.mjs` re-expected, with the two additions: a page picked behind an empty label lists every alias and leaves showing the title; Return in a markdown destination lists every alias) passes at Phase 8's live drive.
- [x] Net Ledger: Phase 5 measured.

---

### Phase 6 — One Set of Rules, One Writer

**GOAL:** Every rule about a link's shown text has one owner: `fitsSlot`, `expressibleInLink`, and `aliasSpells` decide what a wikilink can spell; `pageLinkText` writes a wikilink only when every slot spells and the markdown form otherwise, and every writer of a page link goes through it; `repeatsTarget` is the one drop and `namesTarget` the one carry-and-never-remember rule, answering which part of the target shown text names; `shownAlias` remembers only from a link naming the page itself; one `follower` serves both rename arms, falling back to markdown and escaping what the table codec escapes where a hit sits in a table; `linkDisplayText` and `shownProse` serve Remove Link, sort, and filter for Link and Text values alike; a File value's reference has its own writer, since it never falls back; paste and the Link field write a page-held address as that page through one `resolvedTarget`; and the alias rename field reports how its edit ended. An alias holding `]` stops vanishing, a page title holding `#` round-trips through a markdown link (Task 2-1's encoder), and a heading the wikilink grammar can't spell falls back instead of going stale. Landed as `63f79adbc` and the review's fix round `af8522954`.

#### Task 6-1

**TASK:** The slot check, the drop, the carry, and `pageLinkText` as the one exported page-link writer with the wikilink spelling as its own body; `connectionSpells`, `showsTarget`, and every page-link writer bypassing the fallback go; `shownAlias` never remembers from a link naming a heading, and asks whether shown text named the old target of the link as it was written. `fileLinkText` writes a File value's reference. `formatted` normalizes its address once, so its lookup, its write, and its `awaits` agree.

**NOW (at BASELINE):** `connectionSpells` (`linkValue.ts:178-179`) checks the title and heading only, and `connectionText` (`connections.ts:94`) silently drops an alias `keepsAlias` refuses, so `linkValueFromEdit('[a\]b](Page)')` lands as `[[Page]]` (probed). `showsTarget` (`linkValue.ts:83-89`) and `rewrite.ts`'s private `shows` restate "names the target" beside `keepsAlias`'s inline check. `shownAlias` (`:92-108`) remembers an alias typed into a link naming a heading (probed: `[[Page#H|nice]]` remembers `nice`). `pageMenuActions.ts:54` and `gripMenu.ts:92` write `connectionText` bare for Copy Link; `LinkCell.tsx:48`'s Show Full Link does the same; `expressibleInLink` (`connections.ts:98-100`) caps nothing, where `pageLinkPattern` caps both halves at 255; `headingRows` (`autocomplete.ts:182`) hides headings `expressibleInLink` refuses.

**CHANGE**

- [x] `linkValue.test.ts`: Rename on the Link cell writes `[Notes\] done](Meeting%20Notes)`; `linkValueFromRename('a]b', '[[Page]]')` → `[a\]b](Page)`; a direct `shownAlias` describe pins `[Draft](Alpha)` with `was` `[Draft](Draft)` remembering nothing (a label that only named the old target, held or phantom), `[[Alpha|Old]]` with that `was` remembering `Draft`, and the address-shaped pair (`[[notes.io|x]]` with `was` `[x](notes.io)` → nothing; `[[notes.io|y]]` → `y`). `connections.test.ts`: `pageLinkText(…, 'wiki')` cases, the markdown fallback for `a]b`, `A|B`, and a 256-character heading, `pageLinkText({ title: 'Page', heading: 'Intro', shown: 'Intro' }, 'wiki')` keeping its alias (the drop asks `Page#Intro`), `expressibleInLink('x'.repeat(256))` false, `aliasSpells`, `spellsAsWiki`, `repeatsTarget`, and `namesTarget` answering the part. `assignValue.test.ts`'s remember table: the "already showed" fixture is page-only (`[[Alpha|old]]`), and `[[Alpha#Intro|my notes]]` remembers nothing. `connectionCommit.test.tsx`: `[x](Notes#Setup)` remembers nothing. `pasteAsMenu.test.ts`: `[a\]b](Alpha)` offers Markdown Link only. `autocomplete.test.ts`: `headingRows` lists `A|B`; a heading pick a wikilink can't spell writes the whole link in the markdown form with the title as written, trimmed (`[[Notes.md#]]` + `A|B` → `[A|B](Notes.md#A%7CB)`; `[[ Notes #Se]]` → `[A|B](Notes#A%7CB)`; with the alias stage → `[](Notes#A%7CB)`, caret in the label). `linkEdit.test.tsx`: Format on `[x](a.com)` writes `https://a.com` and reads its cached title under that key. `names.test.ts`: the page-name refusal's wording.
- [x] The rules and the writer as below. Every `connectionText` caller writes through `pageLinkText({ title, heading }, 'wiki')` (`pageMenuActions.ts`, `gripMenu.ts` with `linkable = title !== null`, `LinkCell.tsx`, `linkEditText` until Task 8-2); `adoptFile.ts` and `assetWrite.ts` write `fileLinkText(name)`; `commitEdit`'s `whole` writes `pageLinkText(name, syntax)` with its parameter typed `PageName & { shown?: string }`, its `asMarkdown` asks `spellsAsWiki({ title: value, shown: opts.kept })`, and its heading arm writes a wikilink it can't spell whole through `whole` (the one in-place write that must not split the link at `|`); `pasteAsMenu`'s Connection row asks `spellsAsWiki` with the alias, so the row and the write agree; `embeddableTarget` and `embedPickTree` keep `expressibleInLink` (an embed has no fallback); `headingRows` drops its filter; `namedTitle` trims a wikilink's title; `formatted` normalizes its url once.

**AFTER**

```Core/Connections/connections.ts (landed)
/** A page named by title, and by heading where the link names one: the shape every rule and writer below takes. */
export type PageName = { title: string; heading?: string }

/** What any slot of a wikilink can hold: the grammar's 255 characters and no line break. */
const fitsSlot = (s: string): boolean => s.length <= 255 && !/[\r\n]/.test(s)

/** What the title or heading slot can spell: `|` and `#` would open the next slot, and `]]` or a trailing `]` would close the link. */
export const expressibleInLink = (text: string): boolean =>
  fitsSlot(text) && !/[|#]/.test(text) && !text.includes(']]') && !text.endsWith(']')

/** What the alias slot can spell: anything but `]`. */
export const aliasSpells = (alias: string): boolean => fitsSlot(alias) && !alias.includes(']')

/** Whether a wikilink can spell every slot of a page link; every writer falls back to the markdown form otherwise. */
export const spellsAsWiki = (t: PageName & { shown?: string }): boolean =>
  expressibleInLink(t.title) &&
  (t.heading === undefined || expressibleInLink(t.heading)) &&
  (t.shown === undefined || aliasSpells(t.shown))

/** Whether shown text only repeats a target, `title` or `title#heading`, so the link draws the same without it: the one drop rule. */
export const repeatsTarget = (shown: string, title: string, heading?: string): boolean =>
  normalizeTitle(shown) === normalizeTitle(heading === undefined ? title : `${title}#${heading}`)

/** A name a page can hold as an alias: one the alias slot spells, not blank, and never the page's title itself. */
export const keepsAlias = (name: string, title: string): boolean =>
  name.trim() !== '' && aliasSpells(name) && !repeatsTarget(name, title)

/** Which part of its target shown text names, the title, the heading, or both, rather than giving it a name: what a rename carries along and what memory never keeps. */
export function namesTarget(shown: string, t: PageName): 'title' | 'heading' | 'both' | null {
  if (repeatsTarget(shown, t.title)) return 'title'
  if (t.heading === undefined) return null
  if (repeatsTarget(shown, t.heading)) return 'heading'
  return repeatsTarget(shown, t.title, t.heading) ? 'both' : null
}

/** The one writer of a page link: a wikilink where every slot spells, the markdown form otherwise, so no writer leaves a slot unwritten, drops a name silently, or writes a link the grammar can't read back. A present-but-empty heading or alias spells its slot (`[[A#]]`, `[[A|]]`): the picker opens a slot by writing it. */
export function pageLinkText(
  t: PageName & { shown?: string },
  prefer: 'wiki' | 'markdown',
): string {
  const { title, heading, shown } = t
  if (prefer !== 'wiki' || !spellsAsWiki(t)) return markdownPageLink(title, heading, shown)
  const target = heading === undefined ? title : `${title}#${heading}`
  const named = shown !== undefined && (shown === '' || !repeatsTarget(shown, title, heading))
  return named ? `[[${target}|${shown}]]` : `[[${target}]]`
}

export function pageEmbedText(title: string): string {
  return `![[${title}]]`
}

/** A File value's reference, by file name alone: `wikiTitle` reads it and refuses the markdown form, so it never falls back as a page link does. */
export const fileLinkText = (name: string): string => `[[${name}]]`
```

```Core/Connections/linkValue.ts (landed)
/** The page a written link names: a page link's own target, or the page an address-shaped destination could also hold. */
const namedPage = (written: LinkTarget | null): PageName | undefined =>
  written?.kind === 'page' ? written : written?.page

@@ shownAlias @@
  if (target.kind !== 'page' || target.heading || !alias || !keepsAlias(alias, target.page.title))
    return null
  const { page } = target
  const wasWritten = was === undefined ? null : readLinkText(was)
  const named = namedPage(wasWritten)
  if (named && namesTarget(alias, named)) return null
  const before = resolveLink(wasWritten, index)
  if (wasWritten?.alias === alias && before.kind === 'page' && before.page.id === page.id)
    return null
  return { page, alias }

@@ retarget's page arm @@
  if (next.kind === 'page')
    return {
      kind: 'link',
      text: pageLinkText({ title: next.title, heading: next.heading, shown: next.alias }, syntax),
    }
```

`keepsAlias` stays the alias list's rule (`aliasMemory.ts`, `AliasList.tsx`), composed from `aliasSpells` and `repeatsTarget`; `names.ts`'s call inherits the 255 cap, and its message names every refusal it makes. `markdownPageLink` stays in `links.ts`, read by `pageLinkText` alone. `pageEmbedText` and `fileLinkText` are their own writers: an embed line is a tile's relation and a File reference is read by `wikiTitle`, and neither has a slot to fall back on. `resolveLink`, `pageLabel`, `shownAlias`, and `resolvedTarget` (Task 6-3) all read `namedPage`.

**VERIFY**

- [x] `linkValue.test.ts`, `connections.test.ts`, `assignValue.test.ts`, `connectionCommit.test.tsx`, `autocomplete.test.ts`, `pasteAsMenu.test.ts`, `linkEdit.test.tsx`, `names.test.ts`, and the menu tests pass.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (`showsTarget`, `connectionSpells`, `connectionText`, and `tokens.ts`'s `headingOf` have no reader; "repeats the target", "names the target", "spells as a wikilink", and "the page a written link names" are each spelled once).

#### Task 6-2

**TASK:** One private `follower` serves both rename arms: it reads the old name off the hit's halves, carries shown text through `carry` (which switches on `namesTarget`'s answer), drops through `repeatsTarget`, falls back to the markdown form over `hit.full` where a wikilink can't spell the new target, keeps in-place edits otherwise (a table cell's `\|` rides through), and escapes what the table codec escapes where the hit sits in a table region, read once on the first hit; `shows` and the heading arm's skip go.

**NOW (at BASELINE):** `rewriteConnections` (`rewrite.ts:10-31`) and `rewriteHeadingConnections` (`:47-74`) each carry and drop in their own words through `shows` (`:34-42`); the heading arm skips a wikilink whose new heading can't be spelled (`:64`), leaving it stale; the heading arm never drops an alias that comes to repeat `title#heading`; neither arm escapes a `|` landing in a markdown label inside a table row, where `escapeCell` (`Engine/Tables/codec.ts:12`) is the one rule and `tableRegions` (`Engine/Tables/regions.ts:30`) the one detector.

**CHANGE**

- [x] `rewrite.test.ts`: a heading renamed to `A | B` writes `[A | B](#A%20%7C%20B) [x](#A%20%7C%20B)` and `[[P#Old|Mine]]` → `[Mine](P#A%7CB)`; `[[P#Old|P#Old]]` and `[[P#Old|P#New]]` renamed to `New` give `[[P#New]]`; `[[Old#Intro|Old#Intro]]` with the page renamed gives `[[New#Intro]]`; `[Setup Notes](P#Setup%20Notes)` carries its label through a heading rename, compared decoded; a lone `![[A#Old]]` renamed to `A|B` becomes `![A|B](A#A%7CB)` and still indexes as an embed; inside a real table (header and delimiter rows) `[[P#Old]] | [x](P#Old) | §Old` renamed to `A|B` writes `[A\|B](P#A%7CB) | [x](P#A%7CB) | §A\|B` with its columns kept. `linkValue.test.ts`: the `A|B` move writes `[D](Meeting%20Notes#A%7CB)`.
- [x] `rewrite.ts` as below.

**AFTER**

```Core/Connections/rewrite.ts (landed)
export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
  const oldKey = normalizeTitle(oldTitle)
  const rewrite = follower(body)
  const edits: TextEdit[] = []
  for (const hit of linksIn(body))
    if (hit.target === oldKey) edits.push(...rewrite(hit, 'title', newTitle))
  return applyEdits(body, edits)
}

/** Shown text naming the old target follows it to the new one, by whichever part it named; anything else is a given name and stays. */
function carry(shown: string, from: PageName, to: PageName): string {
  switch (namesTarget(shown, from)) {
    case 'title':
      return to.title
    case 'heading':
      return to.heading!
    case 'both':
      return `${to.title}#${to.heading}`
    case null:
      return shown
  }
}

/** One rewrite per hit, for either arm, the hit's halves read as names (a markdown destination decodes, a wikilink reads as written, trimmed as the index reads them) and `part` replaced by `value`: the renamed part is edited in place (a table cell's `\|` rides through), shown text naming the old target follows it, shown text repeating the new target drops its pipe, and a wikilink whose new target it can't spell is rewritten whole through the one writer, which falls to the markdown form. Inside a table region every inserted text is escaped as the cell codec escapes, since a rename writes the row's source; the regions are read once, on the first hit. */
function follower(body: string) {
  let tables: TableRegion[] | undefined
  return (hit: LinkHit, part: 'title' | 'heading', value: string): TextEdit[] => {
    tables ??= scanDoc(body).tables
    const esc = spanAt(tables, hit.full[0]) ? escapeCell : (s: string) => s
    const markdown = hit.syntax === 'markdown'
    const half = (span: Span): string => {
      const written = body.slice(...span)
      return (markdown ? decodeLinkTarget(written) : written).trim()
    }
    const from = { title: half(hit.title), heading: hit.heading ? half(hit.heading) : undefined }
    const to = { ...from, [part]: value }
    const shownRaw = hit.shown ? body.slice(...hit.shown) : undefined
    const shown = shownRaw === undefined ? undefined : markdown ? unescapeLabel(shownRaw) : shownRaw
    const carried = shown === undefined ? undefined : carry(shown, from, to)
    const next = { title: to.title, heading: to.heading, shown: carried }
    if (hit.syntax === 'wiki' && !spellsAsWiki(next))
      return [{ from: hit.full[0], to: hit.full[1], insert: esc(pageLinkText(next, 'markdown')) }]
    const span = part === 'title' ? hit.title : hit.heading!
    const edits: TextEdit[] = [
      { from: span[0], to: span[1], insert: esc(markdown ? encodeLinkTarget(value) : value) },
    ]
    if (hit.shown && carried !== undefined) {
      if (!markdown && (carried === '' || repeatsTarget(carried, to.title, to.heading)))
        edits.push({ from: targetSpan(hit)[1], to: hit.shown[1], insert: '' })
      else if (carried !== shown)
        edits.push({
          from: hit.shown[0],
          to: hit.shown[1],
          insert: esc(markdown ? escapeLabel(carried) : carried),
        })
    }
    return edits
  }
}

@@ rewriteHeadingConnections @@
  const rewrite = follower(body)
  const edits: TextEdit[] = []
  for (const hit of linksIn(body, ownTitle, outline && [...outline, oldHeading]))
    if (hit.target === titleKey && hit.qualifier === oldKey && hit.heading)
      edits.push(...rewrite(hit, 'heading', newHeading))
  return applyEdits(body, edits)
```

A lone `![[…]]` line keeps its `!`, which sits outside `full`, so an embed line falling back stays an embed line in markdown form. `scanDoc` runs once per rewritten page that holds a hit, on the cascade's own read of that page, never on a keystroke; `docScan.ts` and the table codec are Engine modules with no window import, so the host graph stays clean. A `§` run inside a table cell renamed to a heading holding `|` is written escaped (`§A\|B`), which keeps the row's columns and the cell editor's run but is a form `sectionRunsIn` can't match again; Phase 7 weighs that where the index reads table rows.

**VERIFY**

- [x] `rewrite.test.ts`, `linkValue.test.ts`, `cascade.test.ts` pass; `rewriteConnections('[[Old#Intro|Old#Intro]]', 'Old', 'New')` gives `[[New#Intro]]`; `hostGraph.test.ts` and `engineGraph.test.ts` stay green.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (`shows` has no reader; the carry, the drop, the fallback, and the wiki-spelling check are each spelled once; a markdown hit's halves are compared decoded).

#### Task 6-3

**TASK:** `linkDisplayText` is the one rule for what a written link shows (alias, else a markdown link's default label, else `Title § Heading`, the heading, or the title for a wikilink; an address under its display); `shownProse` applies it to each connection in a text; Remove Link reads it for both token kinds; sort and filter read `shownProse` for Text values; Rename on a Link value writes a wikilink wherever one spells; `resolvedTarget` is the one "written as the page it resolves to" rule, which the Link field's edit and paste both apply.

**NOW (at BASELINE):** `linkDisplayText` (`linkValue.ts:145-158`) returns a page link's title, empty for `[[#Heading]]`; sort and filter read it for Link values only (`sort.ts:58-62`, `filter.ts:140-144`) and a Text value's raw syntax, so `[[Alpha|nice]] notes` sorts under `[`; Remove Link spells `shownConnection` (`linkEdit.ts:43-48`); `linkValueFromRename` keeps the value's syntax (`linkValue.ts:140-141`); `retarget`'s url arm normalizes `[x](notes.io)` into `[x](https://notes.io)` although a page holds `notes.io`, so paste pointed a page link at the web where the Link field's edit resolved first.

**CHANGE**

- [x] `linkValue.test.ts`: `[[#H]]` → `H`, `[[P#H]]` → `P § H`, `[](P#H)` → `H`, `[](P)` → `P`, `[[P|nice]]` → `nice`; `shownProse('[[Alpha|nice]] notes')` → `nice notes`, `[[P#H]] and [x](https://a.com)` → `P § H and x`, plain text and a code span untouched; Rename on a markdown value writes `[[Meeting Notes#H|Today]]`. `sort.test.ts` and `filter.test.ts`: a Text value holding `[[Alpha|nice]] notes` sorts under `n` and matches `contains nice`, not `contains Alpha`; a Link value `[[#Setup]]` is not empty and sorts after `[[Alpha]]`; a bare `example.com` still sorts as `https://example.com`. `linkEdit.test.tsx`: Remove Link on `[](P#H)` writes `H` and on `[](https://a.com)` writes the address. `pasteLink.test.tsx`: `[x](notes.io)` pasted over `[[Page1]]` where a page holds `notes.io` writes `[[notes.io|x]]`, over `[y](Page1)` writes `[x](notes.io)`, and `[x](nowhere.io)` still writes `[x](https://nowhere.io)`.
- [x] The rule and the pass as below; `sort.ts` and `filter.ts` read `case 'text': return shownProse(v.value)` beside their `link` case; `linkEdit.ts`'s `link:remove` writes `linkDisplayText(text.slice(s, e))`; `linkValueFromRename`'s `syntax` line goes; `linkValueFromEdit` reads `resolvedTarget`, and `pasteEdit` applies it to the clipboard target once, so both its branches write a page-held address as that page (a pasted `[[page1]]` lands as `[[Page1]]`: one written shape).

**AFTER**

```Core/Connections/linkValue.ts (landed)
/** A written link as the page it resolves to, written by that page's own title in the syntax it came in (a value's bare heading keeps its empty title); anything else as written. */
export function resolvedTarget(
  written: LinkTarget,
  index: PageIndex | undefined,
  own?: ConnPage,
): LinkTarget {
  const target = resolveLink(written, index, own)
  const named = namedPage(written)
  if (target.kind !== 'page' || !named) return written
  return {
    kind: 'page',
    syntax: written.syntax === 'wiki' ? 'wiki' : 'markdown',
    title: named.title === '' ? '' : target.page.title,
    ...(target.heading ? { heading: target.heading } : {}),
    ...(written.alias ? { alias: written.alias } : {}),
  }
}

/** What a written link shows: its alias, a markdown link's default label, a wikilink's title, heading, or `Title § Heading`, or an address under its display; no display means the raw address, so sort and filter never move when a property's look changes. */
export function linkDisplayText(raw: string, display?: LinkDisplay, title?: string): string {
  const target = readLinkText(raw)
  if (!target) return raw
  if (target.alias) return target.alias
  if (target.kind === 'page') {
    if (target.syntax === 'markdown') return defaultLabel(target.title, target.heading)
    if (!target.heading) return target.title
    return target.title ? `${target.title} § ${target.heading}` : target.heading
  }
  switch (display) { … the url arms, the default arm reading normalizeLinkUrl(target.url) … }
}

/** A text with each connection replaced by what it shows, so a Text value sorts and filters as it reads. */
export function shownProse(text: string): string {
  if (!text.includes('[[') && !text.includes('](')) return text
  let out = ''
  let at = 0
  for (const o of linkOccurrences(text, codeMask(text))) {
    out += text.slice(at, o.full[0]) + linkDisplayText(text.slice(o.full[0], o.full[1]))
    at = o.full[1]
  }
  return out + text.slice(at)
}

@@ linkValueFromEdit @@
  const next = resolvedTarget(written, index, own)
@@ linkValueFromRename @@
  return { kind: 'link', value: retarget('wiki', { ...target, alias: named }).text }
```

```Core/MarkdownPM/Links/pasteLink.ts (landed)
  const clipboard = clipboardTarget(pasted, how)
  if (!clipboard) return plain
  const { defaultLinkFormat: format, removeTitleOnLinkChange } = host.settings()
  const index = host.connections()?.index
  const target = resolvedTarget(clipboard, index)
```

Keys are extracted once per row per resolve, off every keystroke path; a plain value exits `shownProse` at its gate, and a Link value keeps `linkDisplayText`, whose bare-address arm normalizes where a Text value's prose never does. Paste As rows (`pasteAsRows`, built by the menu without an index) still label a page-held address an address; the write resolves.

**VERIFY**

- [x] `linkValue.test.ts`, `sort.test.ts`, `filter.test.ts`, `linkEdit.test.tsx`, and `pasteLink.test.tsx` pass; the page arm reads no setting, so sort and filter never move when a look changes.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (`shownConnection` has no reader; what a link shows is spelled once, in `linkDisplayText`; "written as the page it resolves to" once, in `resolvedTarget`).

#### Task 6-4

**TASK:** `EditableInput` and `RenamableLabel` pass `{ by: 'key' | 'blur' }` (`EditEnd`) to `onCommit` and `onCancel`, so `AliasList` stops sniffing keys.

**NOW (at BASELINE):** `AliasList.tsx:57,65-69,141-144` records whether the last keydown was Enter or Escape on an input and reads it back in `onCommit`/`onCancel`; `EditableInput` commits through the blur Enter causes (`EditableInput.tsx:80-83,94-103`) and cancels on Escape (`:84-91`); `RenamableLabel.tsx:71` turns an unchanged commit into `onCancel()`.

**CHANGE**

- [x] `EditableInput.test.tsx` expects `[['Alpha', { by: 'blur' }], ['Beta', { by: 'key' }]]` (the first commit there is a blur, Enter the second), `[['Gamma', { by: 'blur' }]]`, and each cancel's `how`; `aliasPicker.test.tsx` pins an alias edit ending after the pane unmounted (the `endEdit` guard's case).
- [x] `by` threaded as below; `AliasList` reads `how.by === 'key'` and drops `keyed`, `byKey`, and the capture handler.

**AFTER**

```UIX/Fields/EditableInput.tsx (landed)
/** How an edit ended: by Enter or Escape, or by the focus leaving. */
export type EditEnd = { by: 'key' | 'blur' }
  …
  onCommit: (next: string, how: EditEnd) => void
  onCancel: (how: EditEnd) => void
  …
  const byKey = useRef(false)
  …
        if (e.key === 'Enter') {
          e.preventDefault()
          byKey.current = true
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          …
          onCancel({ by: 'key' })
        }
      }}
      onBlur={(e) => {
        if (settled.current) return
        settled.current = true
        const how: EditEnd = { by: byKey.current ? 'key' : 'blur' }
        byKey.current = false
        const next = e.currentTarget.value.trim()
        if ((required && !next) || invalid?.(next)) {
          e.currentTarget.value = initial
          return onCancel(how)
        }
        onCommit(next, how)
      }}
```

```UIX/Fields/RenamableLabel.tsx + Core/MarkdownPM/Autocomplete/AliasList.tsx (landed)
RenamableLabel.tsx   onCommit={(next, how) => (next !== value ? commit(next, how) : onCancel(how))}   (commit forwards `how`)
AliasList.tsx        onCommit={(next, how) => { const landed = list.commit(row, next); end(row.key, how.by === 'key'); return landed }}
                     onCancel={(how) => { if (row.draft) list.cancel(); end(row.key, how.by === 'key') }}
```

The other `EditableInput` and `RenamableLabel` users ignore the trailing argument; `PommoraUIX.md:287` is in Phase 9.

**VERIFY**

- [x] `EditableInput.test.tsx`, `RenamableLabel.test.tsx`, `aliasPicker.test.tsx`, and `AliasesRow.test.tsx` pass.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] `grep -rn "markdownPageLink(" Core --include='*.ts' --include='*.tsx' | grep -v test` shows it only inside `pageLinkText`; `connectionText` has no definition.
- [x] The three probes that opened W22 hold: `linkValueFromEdit('[a\]b](Page)')` keeps the alias in markdown form; `markdownPageLink('C# Notes','Intro')` round-trips; `rewriteConnections('[[Old#Intro|Old#Intro]]')` follows the alias to the new target and drops it as repeating it (`[[New#Intro]]`).
- [x] A heading renamed to `A|B` inside a table keeps the table's columns.
- [x] Net Ledger: Phase 6 measured.

---

### Phase 7 — Index Facts, Readers' Rule

**GOAL:** The index records facts and no verdict that can go stale: every link inside a frontmatter value is one `value` relation row carrying its key, read by the one value reader; which keys hold links is one rule, `linkKeysOf`, beside `keyRefusal`, asked of the registry in hand by the graph before it dedupes and by the rename cascade's patch and the Spaces' heading check, so creating, renaming, or syncing a property over a held key changes the graph on the next push with no re-index. The `frontmatter` kind and its second reader go; `relations` keys on the frontmatter key at generation 14. Landed as `6197494b4` and the review's fix round `9e84b9eb4`.

#### Task 7-1

**TASK:** `valueLinks` yields every link in every frontmatter value with its key, `frontmatterMentions` folds into it, `Relation` gains `key`, `RelationKind`'s `frontmatter` becomes `value`, the `relations` table gains the column, and the keys rule is written once as `linkKeysOf`.

**NOW (at BASELINE):** `valueLinks` (`scan.ts:159-169`) walks string values under every key and yields body-shaped hits that `indexSeed.ts:61` records as `body` rows; `frontmatterMentions` (`:143-157`) records whole-value links as `frontmatter` rows; neither carries the key, so no reader can apply a keys rule later. `relations` has no key column (`ddl.ts:18-25`); `INDEX_GENERATION` is 13. `patchOf` (`cascade.ts:197-199`) rewrites Link and Text keys only and `spacesLinkHeading` (`:60-68`) reads every Space key with no gate.

**CHANGE**

- [x] `scan.test.ts`: the `frontmatterMentions` and `valueLinks` cases are `valueLinks` cases yielding `key` with each hit (a whole-value `[[Alpha]]` under `Related` yields `key: 'Related'`; an unquoted `[[Alpha]]` yaml read as a nested list yields once; a sentence with two links yields two; `[x](notes.io)` yields under its title). `indexSeed.test.ts`: value rows are `value` rows carrying their key; one target under two keys is two rows beside the body's own; a `§` run escaped inside a table cell (`§A\|B`, the form the rename writes) yields no row where the same run in prose does, pinned as the ruled form. `schema.test.ts`: `linkKeysOf` with Link and Text true, File, Number, Select false, an unregistered plain key true, `ID`, `banner`, `<Areas>`, and a `$`-prefixed key false, and the folded-name lookup. `storesContract.ts` and `memoryStores.ts` carry `key`.
- [x] The reader, the rule, the row, the DDL, and the store as below.

**AFTER**

```Core/Properties/schema.ts (landed)
/** Which frontmatter keys hold links the graph relates and a rename rewrites, asked of a registry: Link and Text, and a key the registry hasn't typed unless Pommora keeps it; never File, whose references name assets. One folded lookup, built once per reader. */
export const linkKeysOf = (defs: readonly PropertyDefinition[]): ((key: string) => boolean) => {
  const names = byFoldedName(defs)
  return (key) => {
    const type = names.get(foldKey(key))?.type
    return type === undefined ? keyRefusal(key) === null : type === 'link' || type === 'text'
  }
}
```

```Core/Connections/scan.ts (landed)
/** Every link inside every frontmatter value, each under the key it sits in, read as a small body is: a whole-value `[[Page]]` (an unquoted one yaml reads as a nested list included) and a sentence holding links alike. Which keys count is the reader's question, asked with the registry in hand. */
export function* valueLinks(
  values: Record<string, unknown>,
  ownTitle = '',
  outline: readonly string[] = [],
): Generator<LinkHit & { key: string }> {
  for (const [key, value] of Object.entries(values)) {
    const text = linkEntry(value, 2)
    if (text === null) continue
    for (const hit of linksIn(text, ownTitle, outline)) yield { ...hit, key }
  }
}
```

```Core/Platform/stores.ts (landed)
// `citation` overlays rather than replaces: a link or embed inside a footnote definition emits its own kind AND a `citation` row, so a reader asking for body links sees it and a reader weighting footnotes sees it too. A `value` row is a link inside a frontmatter value, under `key`; every other kind carries `key` as ''.
export type RelationKind = 'body' | 'citation' | 'value' | 'embed' | 'space'

/** `target` is a normalized title, never a path — resolution happens at read time. `qualifier` is a normalized heading key for a heading-naming link, a folded Context key for a `space` row, and '' otherwise. `count` is occurrences. */
export interface Relation {
  kind: RelationKind
  target: string
  qualifier: string
  key: string
  count: number
}
export interface PageRelationRow extends RelationRow {
  kind: Extract<RelationKind, 'body' | 'citation' | 'value'>
}
```

```Core/Index/indexSeed.ts (landed)
  // A NUL separator: no normalized title, Context key, or frontmatter key can hold one, so the four parts never blur.
  const add = (kind: RelationKind, target: string, qualifier: string, key = ''): void => {
    const id = `${kind}\0${target}\0${qualifier}\0${key}`
    …
    else tally.set(id, { kind, target, qualifier, key, count: 1 })
  }
  …
  for (const hit of valueLinks(values, own, outline))
    add('value', hit.target, hit.qualifier, hit.key)
```

```Desktop/Store/ddl.ts + stores.ts (landed)
export const INDEX_GENERATION = 14
  CREATE TABLE IF NOT EXISTS relations (
    path TEXT NOT NULL,
    kind TEXT NOT NULL,
    target TEXT NOT NULL,
    qualifier TEXT NOT NULL,
    key TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (path, kind, target, qualifier, key)
  );
stores.ts upsertPageIndexes:   INSERT OR REPLACE INTO relations (path, kind, target, qualifier, key, count) VALUES (?, ?, ?, ?, ?, ?)
stores.ts readPageRelations:   SELECT path, kind, target, qualifier, key, count FROM relations WHERE kind IN ('body','citation','value') …
memoryStores.ts:               the map key and the kind filter carry `key` and read `value`
```

`queryMentions` and `queryHeadingMentions` keep reading every kind but `space`, so the cascade still finds every candidate file and then applies the rule itself (Task 7-3); `ddl.ts` drops the four index tables on a generation mismatch, so a generation-13 database rebuilds on open. The index records `[x](notes.io)` under its title as a `value` row, as it recorded it as a `body` row before; `gonePageEntry` and `parkLinks` keep reading a value's written kind, so a hand-written address-shaped Link value is indexed and renamed as a page link but never stripped on delete or parked: a hand-written address stays a working address after the page it could name is deleted, which is the ruling that addresses keep today's raw resolution, and the Link field writes a wikilink wherever one spells, so only a hand-written value takes that form (the call Task 7-1 asked for, stated). A `§` run inside a table cell renamed to a heading holding `|` is ruled out of the graph: the rename writes `§A\|B`, which keeps the row and the cell editor's run; reading rows through the cell codec would need `sectionRunsIn` and the rewriter to share an offset map between escaped and unescaped text, heavier than the edge it buys.

**VERIFY**

- [x] `scan.test.ts`, `indexSeed.test.ts`, `schema.test.ts`, and the store contract pass against both the memory and the SQLite doubles; the index rebuilds from generation 13 on open.
- [x] The gates ran at Task 7-3, once `spacesLinkHeading` had left `frontmatterMentions` (Task 7-2's own run folded into it, since `cascade.ts` imported the removed reader).
- [x] Check for unnecessary code or mistakes (`frontmatterMentions`, the `frontmatter` kind, and `wholeValueLink` have no reader; `valueLinks` is the one value reader; the keys rule is spelled once).

#### Task 7-2

**TASK:** The graph applies `linkKeysOf` to `value` rows where it already resolves each link, with the registry from the tree, and dedupes a page's connections by target after the rule.

**NOW (at BASELINE):** `matrixConnections` (`matrixInput.ts:59-70`) resolves every link row against `pageIndexOf(tree)`; `readMatrixGraph` (`matrixGraph.ts:30-37`) dedupes by `path\0kind\0target`, so one target under two keys reaches the window once; `matrixRuntime.ts:140` reuses connections while `held` and `links` are unchanged; `Engine/graph.ts:4-5` and `forces.ts:7-20` name `frontmatter` and weight it below `body` (`LINK_STRENGTH` 0.8 against 1).

**CHANGE**

- [x] `matrixInput.test.ts`: a `value` row under a Number key yields no connection; under an unregistered key it does; the same rows with the registry changed to type that key Number lose the connection with no re-index; one target under a Link key and a Number key yields one connection; under two Link keys, one. `matrixGraph.test.ts`: one link per key where a value names a page under two. `matrixRuntime.test.ts`: the registry typed to refuse the row's key recomputes the connections and drops the edge; an equal-content registry through `stabilize` reuses them.
- [x] The filter as below; `frontmatter` renamed `value` in `LinkKind`, `ConnectionKind`, `LINK_MULTIPLE`, and `LINK_STRENGTH`; `readMatrixGraph`'s dedupe id carries `key`; `matrixRuntime.ts`'s connections reuse adds `b.tree.config.registry === s.tree.config.registry`.

**AFTER**

```Core/Matrix/matrixInput.ts (landed)
export function matrixConnections(
  tree: NexusTree,
  links: MatrixGraphReply['links'],
): GraphInput['connections'] {
  const resolve = pageIndexOf(tree).resolve
  // A value row relates only under a key that holds links; asked here, with the registry in hand, so a property created, renamed, or synced over a held key changes the graph without a re-index. The rule runs before the dedupe, so a Number key never shadows a Link key naming the same page.
  const holds = linkKeysOf(tree.config.registry)
  const seen = new Set<string>()
  const connections: GraphInput['connections'] = []
  for (const link of links) {
    if (link.kind === 'value' && !holds(link.key)) continue
    const id = `${link.pageId}\0${link.kind}\0${link.target}`
    if (seen.has(id)) continue
    seen.add(id)
    const hit = resolve(link.target)
    if (hit.status === 'resolved' && hit.page)
      connections.push({ from: link.pageId, to: hit.page.id, kind: link.kind })
  }
  return connections
}
```

```Core/Matrix/matrixGraph.ts (landed)
export interface MatrixLink extends Pick<PageRelationRow, 'path' | 'kind' | 'target' | 'key'> {
  pageId: string
}
  // A link to a page and links to its headings are one row each in the index, and one link here; a value's link stays one per key, so each reaches the keys rule.
  for (const { path, kind, target, key } of rows.relations) {
    const pageId = idOf.get(path)
    const id = `${path}\0${kind}\0${target}\0${key}`
    if (!pageId || seen.has(id)) continue
    seen.add(id)
    links.push({ path, kind, target, key, pageId })
  }
```

**Behavior change:** a link inside a Text value's sentence relates as a `value` link rather than a `body` link, so it takes `value`'s force weight (the weight a value relation already had); the Matrix draws the same nodes with those edges slightly weaker. The check is one map lookup per `value` row on a graph push or a registry change, never on a keystroke; the per-link resolve already there dominates it. The host's dedupe by key and the renderer's by target are two stages, not two spellings: the host collapses heading-qualified rows before the wire, the renderer collapses keys after the rule.

**VERIFY**

- [x] `matrixInput`, `matrixGraph`, and `matrixRuntime` tests pass; the `matrix:graph` channel's reply type changed through `MatrixGraphReply` alone (`bridge.ts` untouched).
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (`frontmatter` appears nowhere under `Core/Matrix` as a kind).

#### Task 7-3

**TASK:** The rename cascade's `patchOf` and `spacesLinkHeading` apply `linkKeysOf` from the registry each already reads; the index-side exception for unregistered keys goes.

**NOW (at BASELINE):** `patchOf` (`cascade.ts:190-205`) rewrites only `text` and `link` keys ("Every other type is left as written."), so a link under an unregistered key indexes but never renames; its three callers pass `byName` from the kept registry (`:186-188,211,215`) or the cached block's own type (`:245`); `spacesLinkHeading` (`:60-68`) reads `frontmatterMentions` and `valueLinks` with no gate; `deleteCascade` (`:89`) strips Link-defined keys, a different question that stays.

**CHANGE**

- [x] `cascade.test.ts`: a whole-value `[[Old]]` under an unregistered key moves on rename; `[[Old]]` under a registered Number key is left as written (the File and Select cases hold); `spacesLinkHeading` ignores a File-typed Space key and reads a sentence under a key the registry hasn't typed.
- [x] The two gates as below.

**AFTER**

```Core/Nexus/cascade.ts (landed)
/** Whether a Space the tree holds links `title#heading` under a key that holds links, which no index names. */
export function spacesLinkHeading(root: string, title: string, heading: string): boolean {
  const [page, section] = [normalizeTitle(title), normalizeTitle(heading)]
  const tree = heldTreeOf(root)
  if (!tree) return false
  const holds = linkKeysOf(tree.config.registry)
  return tree.contexts.some((g) =>
    g.spaces.some(({ values = {} }) =>
      [...valueLinks(values)].some(
        (h) => holds(h.key) && h.target === page && h.qualifier === section,
      ),
    ),
  )
}
@@ renameCascade @@
    const defs = Object.values((await readKeptRegistry(root)).defs)
    const holds = linkKeysOf(defs)
    const patchOf = (
      raw: Record<string, unknown>,
      holds: (key: string) => boolean,
      own = '',
      outlineOf = '',
    ): Record<string, string> => {
      const patch: Record<string, string> = {}
      for (const [key, value] of Object.entries(raw)) {
        if (!holds(key)) continue
        …
    const spaceMoved: Rewrite = (raw) => withPatch(raw, patchOf(raw, holds))
    …
      const patch = patchOf(splitFrontmatter(content), holds, own, body)
    …
    // A heading edit settles often and a cached Link still reaches its page, so only a title reaches the caches. A block holds one property's values, so every entry holds links when the property does.
    const cachedIds = new Set(defs.filter((d) => holds(d.name)).map((d) => d.id))
    const movedCache = (values: Record<string, unknown>): Record<string, unknown> | null =>
      withPatch(values, patchOf(values, () => true))
```

`spacesLinkHeading` reads the held tree's registry where the cascade reads the kept one on disk; both agree once a registry write has been taken into the tree, and no sequence was shown to produce a wrong result.

**VERIFY**

- [x] `cascade.test.ts` and `fileEvents` tests pass.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (the rule is read from `schema.ts` in every reader and spelled in none; `cascade.ts` builds no folded lookup of its own).

#### Review Checkpoint

- [x] One `linkKeysOf`, three readers; the index stores no registry-dependent verdict; creating a property over a held key changes the graph on the next push with no re-index.
- [x] The embed line rule (Task 2-2) and the keys rule together leave the live drive's group 1 Link-value checks and group 5 holding (run at Phase 8's live drive).
- [x] Net Ledger: Phase 7 measured; the running total is reported with Phase 8's ceiling against the −100 floor.

---

`[Present the Net Ledger through Phase 7, measured; type Phase 8 on a scratch worktree at HEAD and report its measured net against the −100 floor. The owner ruled (10-16-2026) that the floor is the goal and not a gate: no stop here; the closeout explains concretely what collapsed, reduced, simplified, or unified, as its own neutral account beside the count. Halting here leaves the Link and single-line Text fields as HEAD has them, already on the one Remove Title rule through Task 4-3's line, with linkEditText and linkValueFromRename as their writers; those two then move from the REMOVED table to the kept code, and the Phase 8 tasks are struck, so nothing transitional remains either way.]`

### Phase 8 — One Editor Surface in Every Field

**GOAL:** The Text pane's editor generalizes into one value editor with a one-line mode, and the Link field, the Link value's Rename, and the single-line Text field mount it, so every place a connection is typed is the same surface with the picker, the tracker, Return in a shown slot, and alias memory, while keeping a plain field's feel (one line that scrolls, spellcheck off, typing transforms kept, Return commits, Escape cancels, blur commits unless invalid, Tab leaves). `linkEditText`, `linkValueFromRename`, the alias-only field, and `linkValueFromEdit`'s `current` and `keepTitle` go; the Link instance leaves alias memory to the write layer, which already owns it; the Number picker and the Link and Text popover wear one chrome. Typed on a scratch worktree and measured at +107 before it was committed; landed as `b0a1d843c`, the review's fix round `df3e2e987`, and the rename and drive re-expectation `ff337396d`.

#### Task 8-1

**TASK:** `TextPaneEditor` becomes `ValueEditor` with a `oneLine` mode and an `alias` seat; `inlineSurface` takes the mode and the memory flag; `linkSettle` gains `remembers` and `editorBase` threads both; `TextPane` keeps only its popover.

**NOW (at BASELINE):** `TextPaneEditor` (`TextPane.tsx:78-180`) mounts `editorBase` with `'text'` scope, its own history, placeholder, Enter-closes and Shift-Enter-breaks keys, and saves on every way out through `save()` and a module-level `settled(doc)` that blanks whitespace; `TextPane` builds its host through `useEditorHost`. `inlineSurface` (`surface.ts:42-66`) forces `EditorView.lineWrapping` and `spellcheck: 'true'`; the Link field and the single-line Text field are an `EditableInput` or a `TextPicker` with Enter-commits, Escape-restores, blur-commits-unless-invalid, and `aria-invalid` recomputed on every input.

**CHANGE**

- [x] `ValueEditor.test.tsx`: in `oneLine` mode Return commits once (the shown-slot rest runs first), Shift-Enter and Mod-Enter insert nothing, a pasted two-line text lands with a space where the break was, Escape with the picker closed cancels without a commit, blur commits unless `invalid(text)` holds and then cancels, `aria-invalid` and the kit's `invalidInput` class follow `invalid(text)` from mount and on every change, the surface neither wraps nor spellchecks, `[[` opens the picker, `alias` on `[[Page|Alias]]` selects `Alias`, on `[[Page]]` writes `|` and seats the caret, and on `example.com` writes `[](example.com)` with the caret in the label, each seat focusing the editor; Rename `[[Alpha|Mine]]` with the alias deleted then Escape writes nothing; Tab in a field is unclaimed and the blur it causes commits, where the pane swallows it; `remembers` on and off at the editor level.
- [x] `ValueEditor` and the surface options as below; `TextPane` takes `host` from its caller, renders `ValueEditor` inside its `PickerMenu`, and drops `TextPaneEditor`, its `useEditorHost`, and `settled`; `TextPane.test.tsx` passes a harness host.

**AFTER**

```Core/MarkdownPM/surface.ts (landed)
/** … `oneLine` is a value field's surface: it scrolls where a body wraps, and it spellchecks nothing, since a field often holds an address or a name; `remembers` off leaves alias memory to the surface's write layer. */
export const inlineSurface = (
  scope: MarkdownScope,
  { oneLine = false, remembers = true } = {},
): Extension => [
  …
  linkSettle.of({ scope, remembers }),
  …
  oneLine ? [] : EditorView.lineWrapping,
  EditorView.contentAttributes.of({
    …
    spellcheck: oneLine ? 'false' : 'true',
    …
export const editorBase = ({ host, scope, panes, formatExt, oneLine, remembers }: { …; oneLine?: boolean; remembers?: boolean }): Extension => [
  editorHost.of(host),
  inlineSurface(scope, { oneLine, remembers }),
```

```Core/MarkdownPM/Links/linkSettle.ts (landed)
export const linkSettle = ViewPlugin.define(
  (view: EditorView, { scope, remembers }: { scope: MarkdownScope; remembers: boolean }) => {
    …
      if (settling !== w.start && !html && remembers) remember(w)
```

```Core/Properties/Pickers/ValueEditor.tsx (landed; TextPane.tsx's TextPaneEditor, moved and generalized)
const blanked = (doc: string): string => (doc.trim() === '' ? '' : doc)

/** The one editor every property value is typed in: the Text pane's, and in `oneLine` mode a field's. Both save once on every way out; a field also ends its own edit, Return and blur committing unless the text is invalid, Escape cancelling, with the invalid state on the editor's own node. A commit settles the link under edit first, so what the leave would have written is what's read; a cancel ends the edit, so nothing after it, the unmount's save included, writes. */
export function ValueEditor({ initial, holder, host, oneLine = false, remembers, alias, invalid, saveRef, onCommit, onClose }: {
  initial: string
  holder: ConnPage | undefined
  host: EditorHost
  oneLine?: boolean
  remembers?: boolean
  /** Once mounted, seat the caret in the value's alias slot: the Link value's Rename. */
  alias?: boolean
  invalid?: (text: string) => boolean
  saveRef?: RefObject<() => void>
  onCommit: (text: string) => void
  onClose: () => void
}): React.JSX.Element {
  …
  const committed = useRef(blanked(initial))
  const ended = useRef(false)
  …
  const commit = (): void => {
    const view = viewRef.current
    if (!view || ended.current) return
    view.plugin(linkSettle)?.flush()
    const text = blanked(view.state.doc.toString())
    if (text === committed.current) return
    committed.current = text
    onCommitRef.current(text)
  }
  const cancel = (): boolean => {
    ended.current = true
    onCloseRef.current()
    return true
  }
  const leave = (): boolean => {
    const view = viewRef.current
    if (view && invalidRef.current?.(view.state.doc.toString())) return cancel()
    commit()
    onCloseRef.current()
    return true
  }
  if (saveRef) saveRef.current = commit

  useEffect(() => {
    const view = new EditorView({
      parent: mountRef.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          editorBase({ host, scope: 'text', panes: [ac], formatExt, oneLine, remembers }),
          heldPage.of(holder ?? null),
          history(),
          oneLine
            ? [
                EditorView.editorAttributes.of({ class: invalidInput }),
                // A field holds one line: a typed or pasted break lands as a space.
                EditorState.transactionFilter.of((tr) => { … }),
                EditorView.updateListener.of((u) => { … aria-invalid … }),
                EditorView.domEventHandlers({ blur: (e) => { if (!inCaretPane(e.relatedTarget)) leave(); return false } }),
              ]
            : placeholder('Begin typing.'),
          Prec.highest(
            keymap.of([
              { key: 'Enter', run: leave },
              { key: 'Shift-Enter', run: oneLine ? () => true : insertNewline },
              ...(oneLine
                ? [{ key: 'Mod-Enter', run: () => true }, { key: 'Escape', run: cancel }]
                : [
                    // A field lets Tab move the focus as a plain field does; the pane keeps it, and Shift-Tab stops short of its focus trap, which would carry it to the ×.
                    { key: 'Tab', run: () => true },
                    { key: 'Shift-Tab', run: () => true, stopPropagation: true },
                  ]),
            ]),
          ),
          keymap.of(historyKeymap),
        ],
      }),
    })
    viewRef.current = view
    if (invalid) view.dom.setAttribute('aria-invalid', String(invalid(initial)))
    const doc = view.state.doc.toString()
    if (alias && drawnLinkAt(view, 0)) applyLinkAction(view, 'rename', [0, doc.length])
    else if (alias) {
      // A bare address draws no link token, so Rename gives it the label a markdown link has.
      view.dispatch({ changes: { from: 0, to: doc.length, insert: markdownLink(doc, '') } })
      focusRange(view, 1)
    } else {
      view.dispatch({ selection: { anchor: doc.length }, scrollIntoView: true })
      view.focus()
    }
    // A popover blooms in from a scale the caret was measured through, so the editor measures again once it settles.
    const portal = mountRef.current!.closest(`[${PICKER_PORTAL_ATTR}]`)
    …
  }, [])
  // Saved in the mutation phase: a seat unmounting with the pane retires its writer in its own passive cleanup first, so a passive save here would be dropped.
  useLayoutEffect(() => commit, [])
  // An outside write lands only in an editor that holds nothing unsaved; the editor's own close then writes last, as a page body's merge does.
  useEffect(() => { … mirrorBody(view, initial) … }, [initial])

  return (
    <>
      <div className={oneLine ? 'value-field mdpm-shell' : 'text-pane-body mdpm-shell'} onClick={stopBubble} onContextMenu={stopBubble}>
        <div ref={mountRef} className="mdpm-editor" />
      </div>
      <AutocompletePane {...ac.pane} />
    </>
  )
}
```

`.value-field` in `text-pane.css` beside `.text-pane-body`: the editor at its seat's text metrics (`font: inherit`, `color: inherit`, zero padding, `height: auto` shared with the pane through one selector list, `min-width: 0`), one line that scrolls through CodeMirror's own scroller once wrapping is off. Cost on a keystroke in a field: the filter is one integer compare (`lines === 1`), and `invalid` is one `readLinkText` plus the resolver's lookups over a short string, the work `EditableInput` did on every input; nothing runs per keystroke in the pane.

**VERIFY**

- [x] The `ValueEditor` cases and `TextPane.test.tsx` pass; a Text pane still saves on every way out and once per change.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (one mount lifecycle serves the pane and the fields; `TextPaneEditor` and the pane's own `useEditorHost` have no reader).

#### Task 8-2

**TASK:** `PropertyValueInput` builds one host and mounts `ValueEditor` for the Link field (opening on the whole written value), the Link value's Rename (the same editor, seated in its alias slot), and the single-line Text field; Number keeps the kit's input; `linkEditText`, `linkValueFromRename`, `LinkEditContext.keepTitle`, and `linkValueFromEdit`'s `current` and `keepTitle` go; `FieldPicker` is the one popover chrome, holding the kit's input over a `value` (Number, with its affixes) or a caller's editor as `children` (Link and Text).

**NOW (at BASELINE):** `PropertyValueInput.tsx:54-96` builds `initial` from `linkEditText` (the target alone) or the alias alone (`alias` mode), parses through `linkValueFromRename` or `parseEditorValue` with `keepTitle`, tints a Link field with `def.link_color`, and mounts `TextPicker` or `EditableInput`; `linkValueFromEdit` re-applies a hidden alias through `keepsShown` because the field hid it, so typing a new title into the field dropped the hidden alias when the old link pointed somewhere; `TextPicker` had two arms, a bare input owning its own ring and width (the Link popover) and an affixed input in a fixed 140px field (Number).

**CHANGE**

- [x] `PropertyValueInput.test.tsx` drives the editor through its `EditorView` (no `<input>` for Link or Text; Number stays on the input): the Link field opens showing `[[Page|Alias]]` with the caret at the end and the Link accent on its wrapper (`color` and `--link`, `--connection` unset); Rename opens the same editor with the alias selected, an empty `|` slot seated when none, or `[](url)` with the caret in the label for a bare address; typing `[[` lists pages; a bare heading commits on a page and marks invalid on a Space; retyping the title of `[[Alpha|nice]]` to `Beta` by hand keeps `nice`; the single-line Text field commits its first line and leaves the lines behind untouched; the Link instance remembers nothing on leave and the Text instance remembers once; Rename on `https://example.com` then Return writes nothing, `[[alpha]]` retyped over `[[Alpha]]` writes nothing; the Number popover shows its affixes inside the one field class and the Link popover's editor sits in the same class. `linkValue.test.ts`'s `linkEditText` and `linkValueFromRename` cases go.
- [x] `PropertyValueInput`, the value helpers, and `FieldPicker` as below; `editorText` returns the raw value for a Link.

**AFTER**

```Core/Properties/Pickers/PropertyValueInput.tsx (landed)
/** A value typed as text: a Number in the kit's input, a Text value's popover in its pane, and every other value in the one-line editor, which opens on the whole written value and, for the Link value's Rename, seats the caret in its alias slot. A Link value leaves alias memory to the write layer, which remembers once per landed value. */
export function PropertyValueInput({ def, current, holder, connections, alias, popover, onCommit, onClose }: { … }): React.JSX.Element {
  const host = useEditorHost({ connections: useSession(() => connections?.()) })
  const initial = editorText(current)
  const parse = (text: string): PropertyValue | null | undefined =>
    parseEditorValue(def.type, text, current, { index: connections?.()?.index, own: holder })
  const invalid = (text: string): boolean => parse(text) === undefined
  // Deduped on what the field would reopen on, since a seat may have rewritten the text it holds.
  const commit = (text: string): void => {
    const next = parse(text)
    if (next !== undefined && editorText(next) !== initial) onCommit(next)
  }
  if (def.type === 'number') {
    const close = (text: string): void => { onClose(); commit(text) }
    if (popover) { … <FieldPicker {...popover} value={initial} leading={numberFormatGlyph(def)} trailing={…} invalid={invalid} onCommit={close} onDismiss={onClose} /> }
    return <EditableInput initial={initial} className={fillInput} caretAtEnd invalid={invalid} onCommit={close} onCancel={onClose} />
  }
  if (popover && def.type === 'text') return <TextPane {...popover} current={current} holder={holder} host={host} onCommit={onCommit} onDismiss={onClose} />
  const editor = (
    <ValueEditor initial={initial} holder={holder} host={host} oneLine remembers={def.type !== 'link'} alias={alias} invalid={invalid} onCommit={commit} onClose={onClose} />
  )
  // The property's link color tints an address and the text around it, as the resting cell's anchor is tinted; a page link keeps the app's connection color there too.
  const accent = def.type === 'link' ? solidColorCss(def.link_color) : undefined
  const tinted = accent ? <span style={{ color: accent, '--link': accent, display: 'contents' } as CSSProperties}>{editor}</span> : editor
  return popover ? <FieldPicker {...popover} onDismiss={onClose}>{tinted}</FieldPicker> : tinted
}
```

```Core/Properties/parseEditorValue.ts + Core/Connections/linkValue.ts (landed)
interface LinkEditContext {
  index: PageIndex | undefined
  own: ConnPage | undefined
}
export function editorText(value?: PropertyValue | null): string {
  if (value?.kind === 'number') return String(value.value)
  if (value?.kind === 'link') return value.value
  …
  if (type === 'link' && link) return linkValueFromEdit(raw, link.index, link.own)

/** A Link value as the field wrote it: the page it resolves to, by title, as a wikilink wherever one spells; an address under its scheme; nothing a page or an address answers for is refused. */
export function linkValueFromEdit(raw: string, index: PageIndex | undefined, own: ConnPage | undefined): PropertyValue | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const written = readLinkText(trimmed)
  const target = resolveLink(written, index, own)
  if (!written || (target.kind !== 'page' && target.kind !== 'url')) return undefined
  return { kind: 'link', value: retarget('wiki', resolvedTarget(written, index, own)).text }
}
```

```UIX/Pickers/FieldPicker.tsx + field-picker.css.ts (landed)
/** What the one chrome holds: the kit's input over a `value`, with its affixes, or a caller's own editor as `children`. */
type Typed = { value: string; onCommit: (next: string) => void; invalid?; leading?; trailing?; children?: undefined }
type Hosted = { children: ReactNode; value?: undefined; onCommit?: undefined; invalid?: undefined; leading?: undefined; trailing?: undefined }

/** A typed value's popover: one field wrapper owning the fill, stroke, focus ring, type, and width, around either the kit's input or an editor the caller mounts. */
export function FieldPicker({ open, onDismiss, triggerRef, ...inner }: { open; onDismiss; triggerRef } & (Typed | Hosted)) {
  return (
    <PickerMenu open={open} onDismiss={onDismiss} triggerRef={triggerRef} direction="down" origin="center" contentClassName={s.content}>
      <div className={s.field}>
        {inner.value === undefined ? inner.children : (<>{leading}<EditableInput initial={inner.value} className={s.suffixInput} caretAtEnd invalid={inner.invalid} onCommit={inner.onCommit} onCancel={onDismiss} />{trailing}</>)}
      </div>
    </PickerMenu>
  )
}

/** The one chrome a typed value's popover wears: the fill, stroke, and focus ring, the control-size type, and a width that follows the content between its bounds; whatever sits inside owns no chrome of its own. */
export const field = style([kitField, { gap: '6px', width: 'auto', minWidth: '100px', maxWidth: '200px', overflow: 'hidden', lineHeight: font.scale.control.line, fontSize: font.scale.control.size, fontWeight: font.weight.emphasized, ...focusRing('within') }])
```

**Behavior change:** Remove Title reaches the Link field only through the picker inside it, as in a body: the field shows the whole link, so nothing is hidden for a parse to re-apply, and a title retyped by hand keeps its alias, where the field dropped the hidden one. Rename on a bare address seats the caret in a `[](url)` label and commits `[alias](url)`; clearing a markdown-only value's label through Rename leaves the settle's one collapse rule to fill the default label, so the raw value is `[A|B](Page#A%7CB)` from one rule rather than a writer's second spelling. The Number popover's field follows its content between 100 and 200px where it was a fixed 140px, and the two popover forms differ in nothing but what sits inside (the owner's ruling, 10-16-2026: one set of styles, different behaviors of what each accepts). A Text field's alias is remembered the moment the caret leaves the link, as a body's is, even where Escape then discards the text; a cancel itself writes nothing.

**VERIFY**

- [x] `PropertyValueInput.test.tsx`, `linkValue.test.ts`, `PropertyPanel`, `TableView`, `CardsView`, `ValuePickPresenter`, `cellGestures`, and `PickerMenu` tests pass; Number fields are untouched but for their popover's width.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes (`linkEditText`, `linkValueFromRename`, `LinkEditContext.keepTitle`, `linkResolver`, `FieldPicker.accent`, the bare input arm, and `PropertyValueInput`'s `alias`-only branches have no reader).

#### Task 8-3

**TASK:** The live drive's group 1 drives the one-line editor, the drive harness drives a field whether it is an input or the editor, and the field-level tests pin what the fields gained.

**NOW (at BASELINE):** `live-drive.mjs:212-230` drives the Link field through `field` (`drive-harness.mjs:207`), which requires an `INPUT`, and `selectAll` (`:102`) calls `.select()`; the Text Property Drive reads the single-line Text field the same way; in a one-line editor `[[` opens the picker, so Enter picks rather than commits.

**CHANGE**

- [x] `drive-harness.mjs` exports `FIELD`, `FIELD_VIEW`, `field` (the focused `<input>` or the focused `.value-field .cm-content`), `fieldValue`, `selectField`, `blurField`, and `caretAtFieldEnd`; the Alias Drive's group 1 Link-value block drives the editor through them (type, Escape where a pick isn't meant, Return to commit) and adds "a new alias typed into a heading link is never saved"; the Text Property Drive's Text-field sites read the same helpers.
- [x] `PropertyValueInput.test.tsx` pins that the Link instance remembers nothing on leave (the write layer does) and the Text instance remembers on leave; `ValueEditor.test.tsx` pins `remembers` at the editor level.

**VERIFY**

- [x] The live drive's groups 1 to 6 pass on `~/Test` (346 of 346 checks) with the Alias Drive's own harness, which builds and launches a scratch instance of its own on port 9373 with its own user data and restores `~/Test` from its snapshot afterward; one step was re-expected to the ruled two-Return shape in a Text pane (the first Return rests past the link and remembers the alias, the second closes the pane), which Phase 2 ruled and `TextPane.test.tsx` pins; the fields read through CDP as one scrolling line with no spellcheck and the picker opening on `[[`.
- [x] Run the gates.

#### Review Checkpoint

- [x] Every place a connection is typed mounts `editorBase`; `grep -rn "EditableInput\|FieldPicker" Core/Properties` shows Number only (and `OptionEditPopup`'s option-name field, a name and not a value).
- [x] A Link value's alias is remembered exactly once per write (the write layer), a Text value's single line once per leave (the tracker).
- [ ] The fields scroll, don't wrap, and show no spellcheck; the owner confirms the feel live, with the Number popover's content-sized width, the Link popover in the same chrome, and a Link field's page link in the connection color.
- [x] Net Ledger: Phase 8 measured on the worktree before commit (+107) and again after (+112, then −41 in the fix round and +4 with the rename and the drive's re-expectation); the total is reported against the −100 floor under the owner's ruling.

---

### Phase 9 — Documentation and the Ledger

**GOAL:** Every claim the work made false reads true, in the feature documents and the planning folder, and W22 reconciles per `batch-audit.md`.

#### Task 9-1

**TASK:** Rewrite the feature-document claims in *§Reconciliation* surgically, with no amendments or supersedes; where a sentence is now false it's corrected or removed.

**CHANGE**

- [x] `ConnectionsPM.md`: `:16` (both processes build the index from `record.ts`), `:22` (main holds the title index and resolves no link syntax), `:26` (alias memory doesn't cascade; Link, Text, or unregistered keys, never File), `:34` (the typing color lasts until the caret leaves), `:36` (a held value's or cell's `§` run glances and opens a menu with Open and Copy), `:55` (the Link field and the single-line Text field), `:59` (both syntaxes; Return in a destination rests in the label), `:60` (the alias stage may open; the default label is the heading, else the title), `:62` (paste over a link and the Link field; "as it read before the edit"), `:64` (a link naming a heading adds nothing; the picker still offers the page's aliases). Leave `:11-12` as the owner's in-progress edit.
- [x] `MarkdownPM.md`: `:8` (`Links/` holds the heading-rename settle; the one-line fields), `:10` (the two fields), `:31` (the picker opens in a label, a destination, a fragment, and on `§` too), `:33` (only where the link pointed somewhere), `:90` (a link's label stays literal too), `:104` (Edit Title), `:118` (a lone embed stays out of the graph), `:120` (both syntaxes; an in-paragraph `!` changes nothing), `:156` (the pointed rule reaches Paste As), `:255` (draws as a phantom connection).
- [x] `PropertiesPM.md`: `:62` (a one-line editor with the picker; sorts and filters on shown text), `:80`, `:82` (a wikilink wherever one spells, Rename included; not remembered when the value names a heading), `:117` (a number alone keeps the shared text field).
- [x] `CorePM.md:83` (the one walk is `recordsOf`; each projection its own memo) and `:108` (a link inside a frontmatter value under its key); `MatrixPM.md:7` (the `value` kind); `PommoraUIX.md:287` (`onCommit` and `onCancel` carry how the edit ended) and `:383` (`TextPicker` → `FieldPicker`, one chrome holding the kit's input or a caller's editor).

**VERIFY**

- [x] `node .claude/scripts/check-atlas.mjs` passes; each sentence was rewritten in place.

#### Task 9-2

**TASK:** The planning folder and the ledger reconcile.

**CHANGE**

- [x] *Architecture Design*: `:21` drops the Save Heading Aliases proposal (the intent stands with no setting); the *Open Calls* list goes, its three settled calls written into *Settled Decisions* as one sentence each.
- [x] `.claude/IssuesPM.md` (the ledger the *Pommora Codebase Audit* migrated into while this phase ran): delete each resolved finding's row in its Area's index table, its entry, and its footnote (F-114, F-116 to F-131), recount the **TOTALS** table, re-anchor the surviving findings' citations into the files this plan's range touched, and rewrite any sentence that still describes W22's pre-work state (the F-049 `gripMenu` linkable clause, F-071's `Guards/` and language-count clauses, F-096's three menu members, F-098's `Span` name).
- [x] `.claude/Guidelines/`: nothing changes (`Editor-Internals.md:25` stays true).

**VERIFY**

- [x] The **TOTALS** table matches a recount of the entries; no done-marks or strikethroughs anywhere in the ledger; every footnote referenced is defined and every one defined is referenced.

---

### Completion Criteria

- **Conformance:** every phase landed through `editorBase`, `linkOccurrences`, `pageLinkText`, `resolveLink`, `linkWriting`, and `linkKeysOf` where those exist, with no mechanism beside them; nothing outside the files the tasks name changed; the Frozen list held.
- **Correctness:** the Brief's behavior specification holds except where a task names a change; each named change is observed in its test and, for the editing and field behaviors, in the live drive on `~/Test`; the three probes that opened W22 hold (an alias with `]` falls back, `C# Notes` round-trips, `[[Old#Intro|Old#Intro]]` follows its alias to `New#Intro` and drops it as repeating the target); a held value's `§` run glances and opens Open and Copy; `[](Page)` reads, indexes, renames, and draws its default label; a lone `![Alias](Page)` line leaves the graph; a link naming a heading remembers nothing; Return inside a link rests past it in a cell, a pane, and a field; Remove Title keeps the shown text over a phantom container in the picker, paste, and the Link field; a Text value sorts under its shown text; creating a property over a held key changes the graph with no re-index.
- **Completeness:** every task ticked; no transitional read, shim, or rename survives (the Phase 2 interims are gone by Phase 3, Phase 3's by Phase 4, Phase 4's by Phase 5, and the Link field's by Phase 8); `grep` finds no reader of any REMOVED concept.
- **Confirmation:** every new test went red before its change; the live drive ran against a fresh instance and the instance was closed; the owner confirmed the one-line fields' feel.
- **Continuity:** *§Reconciliation* walked; ConnectionsPM, MarkdownPM, PropertiesPM, CorePM, and PommoraUIX read true; the Design doc and the ledger reconciled; every deviation fixed or ruled on.
- **Confidence:** gates green from a clean state over `BASELINE..HEAD`; the test count moved only by the tests the plan names; the Net Ledger's measured total is at or below −100 Actionable lines, or the owner ruled on the shortfall, the total is reported against the 200 to 500 the audit set out to remove, and the Things count in *§Overview* is re-tallied from the landed code and reported beside it.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [x] Full-plan simplification lens (`opus-xhigh`, `code-simplification`, looking inward at the change and outward at the codebase around it) over `BASELINE..HEAD`, then the full-plan adversarial lens (`opus-xhigh`, `adversarial-review`, inward and outward) over the same range; each finding verified, settled, and applied before the next agent runs (`ed3dd82c0`, `b20b16a3b`). These replace every per-phase review already run.
- [x] Neutral verification (`fable-high`, given the BASELINE head, HEAD, and the *§Constraints · Neutral Gate* intention and nothing else) over `abfbf0798..b20b16a3b`, after everything the two lenses raised had been addressed. Verdict: the after is the better codebase and the intention is substantially met, with one honest exception, that it is not smaller (its own count of the link work alone was roughly flat); every consolidation confirmed by reading and probing, every behavior change named by a commit. Fourteen corrections: eight fixed (`0d686c2e9`), six ruled (below).
- [x] Own pass: gates green at `0d686c2e9` · Net Ledger +45 against the −100 floor (the owner's ruling: the goal, not a gate; the account beside the count is in the Results document) · the Things count re-tallied from the landed Concepts (95 removed, 88 added, −7) and the ways table (93 → 35) · the diff read once for leftovers (none; no reader of any REMOVED concept) · deviations recorded · criteria walked
- [x] Reconciliation walked (the feature documents, the Design, the issues index, and every comment and test the list names)
- [x] Report delivered, with the range through `/save-delta` (*Connections & Aliases Restructure — Results*)

#### Reconciliation

- `.claude/Features/ConnectionsPM.md:16,22,26,34,36,55,59,60,62,64` — the claims Task 9-1 lists — Task 9-1
- `.claude/Features/MarkdownPM.md:8,10,31,33,90,104,118,120,156,255` — Task 9-1
- `.claude/Features/PropertiesPM.md:62,80,82,117` — Task 9-1
- `.claude/Features/CorePM.md:83,108` (the index records "a frontmatter Link value": every link under a key, judged at read); `.claude/Features/MatrixPM.md:7` ("body, citation, and frontmatter" link kinds: `value`); `.claude/Features/PommoraUIX.md:287,383` (the `TextPicker` row: now `FieldPicker`, one chrome holding the kit's input or a caller's editor) — Task 9-1
- `Connections & Aliases Restructure — Architecture Design.md:21,32` — "A **Save Heading Aliases** setting … is proposed" — Task 9-2
- `.claude/IssuesPM.md` (F-114, F-116 to F-131: rows, entries, footnotes, the TOTALS table) — Task 9-2
- `Core/Nexus/treeIndex.ts:1`, `record.ts:1`, `heldPages.ts:1,46`, `pageIndex.ts:42`, `Actions/destinationTree.ts:1` — the one-walk and title comments — Tasks 1-1 to 1-3
- `Core/Connections/links.ts:13,25,34,45,66,106`, `scan.ts:1,70,86`, `Input/edits.ts:329,362,641`, `Links/linkEdit.ts:127,182`, `Autocomplete/autocomplete.ts:139`, `Input/markdownInput.ts:231` — the grammar and reader comments — Phase 2
- `Core/Connections/connections.test.ts:88,108-111` (the `connectionText` argument order) and `links.test.ts:138,145` (one-argument `targetTitle`) — Task 2-1; `linkValue.test.ts:350-366` (the Link-edit `commit` helper's signature) — Task 3-1
- `Core/MarkdownPM/Links/linkClicks.ts:26,84,90`, `connectionsApi.ts:39`, `assignValue.ts:49` — the resolver and remember comments — Phase 3 and Task 6-1
- `Core/MarkdownPM/Links/linkEdit.ts:162,189,221,234,262`, `linkReveal.ts:17` — the tracker comments — Phase 4
- `Core/MarkdownPM/Autocomplete/autocomplete.ts:32,45,48,52,98,244-245,259,267,284,302,314`, `useConnectionAutocomplete.ts:153` — the picker comments — Phase 5
- `Core/Connections/linkValue.ts:82,91,144`, `rewrite.ts:9,33,46`, `Views/Pipeline/filter.ts:143`, `sort.ts:61`, `useConnectionAutocomplete.ts:206` — the rules comments — Phase 6
- `Core/Connections/scan.ts:159`, `Index/indexSeed.ts:60`, `Nexus/cascade.ts:189`, `Platform/stores.ts:8,11` — the index comments — Phase 7
- `Core/Properties/Pickers/TextPane.tsx:26` — the pane's doc — Task 8-1
- The test assertions the Investigation's §8 lists (`treeIndex.test.ts`, `remintLedger.test.ts`, `connections.test.ts`, `linkValue.test.ts`, `links.test.ts`, `edits.test.ts`, `aliasPicker.test.tsx`, `headingHash.test.ts`, `tokens.test.ts`, `pasteLink.test.tsx`, `autocomplete.test.ts`, `acQuery.test.ts`, `connectionCommit.test.tsx`, `linkReveal.test.ts`, `linkEdit.test.tsx`, `mdLinkTarget.test.tsx`, `connectionsApi.test.ts`, `valueTarget.test.ts`, `rewrite.test.ts`, `assignValue.test.ts`, `scan.test.ts`, `indexSeed.test.ts`, `cascade.test.ts`, `EditableInput.test.tsx`, `PropertyValueInput.test.tsx`, `.claude/scripts/Alias Drive/live-drive.mjs`) — the task that rewrites each, as its CHANGE names

#### Open Items

- Whether the markdown label's `|` escape should also reach the picker's label writes inside a cell editor is settled by the cell codec (the editor domain holds raw text and the codec escapes on write); nothing stands open here.
- F-071 and F-049 sequence against Phase 4's move (*§Constraints · Other Workstreams*).

#### Deviations

- Task 4-3 typed "pointed" as a page or address resolution, which left a link to this document's own heading (`[[#Intro|x]]`) keeping its alias under Remove Title on a re-aim; landed as any resolution, so an own-heading link drops its alias as every other resolved link does (`linkValue.test.ts` pins it).
- Task 4-3 disclosed that paste compares against the link as it stands, so a title retyped by hand and then pasted over kept its alias where the picker dropped it; landed reading the field's `was` through `baselineAt`, since `paste(view, …)` holds the state, so the picker and paste decide from one baseline as the ruling says.
- `retarget` decided and wrote in one, which forced paste to feed it one link for two questions (how it read before, what alias it shows now); landed as a writer alone, with `keepsShown`'s answer folded into `next.alias` by each caller, so the three writer-only callers pass no `null, false`.
- Phase 5's reviews found `openLinkAt` reading only the text before the caret, so a pick into a written link whose title had been emptied (`[[Old|Mine]]` with `Old` deleted) wrote `[[Alpha]]|Mine]]`, a wrong result from before BASELINE that the markdown twin never had; landed reading the whole line with the holder at the caret first, kept only where the holder stands alone in its slot, so the query's `closed` and `end` come from the occurrence and the mirror holds. One more occurrence walk per caret move where no closed link holds the caret on a line with link syntax.
- Task 5-2 wrote a heading pick that opens the alias slot through `whole`, which rewrote the title's spelling (`Notes.md` to `Notes`, `My Notes` to `My%20Notes`); landed inserting in place, since a heading pick never re-aims.
- The settle's collapse filling a markdown label a tick after a pick cleared the pick's rest, so the link showed raw syntax where its wiki twin read finished; landed carrying `linkRest` through the collapse's changes (the field itself is Frozen and unchanged).
- The link settle lives in `Links/linkSettle.ts` beside `headingRenameSettle.ts` rather than across `linkReveal.ts` and `linkEdit.ts`, and `linkWithin` beside the other editor readers in `Input/edits.ts`; a reader finds each settle in one file. Phase 4's count ends 27 above its band for this and the fixes the ledger row names.
- Task 6-1's `shownAlias` asked whether shown text named the old target of the *resolved* old link, so a label that only named a page since deleted or never held (`[Draft](Draft)` re-picked to Alpha, `Draft` kept under Remove Title's phantom rule) was remembered as Alpha's alias; landed asking it of the link as it was written, resolving only for the same-alias-same-page check (`linkValue.test.ts` pins it).
- Task 6-1 sent a File value's reference through `pageLinkText` claiming a readable markdown link where the wikilink grammar can't spell the file name; `wikiTitle` refuses the markdown form, so that reference would be read by nothing. Landed as `fileLinkText`, a writer with no fallback, beside `pageEmbedText`; `adoptFile`'s own gate still refuses the name first.
- Task 6-1's sentence that the writers honour a url arm's `page?` through `resolveLink` reached only the remember rule; paste still wrote `[x](notes.io)` as `[x](https://notes.io)` where a page holds `notes.io`. Landed as `resolvedTarget`, the one "written as the page it resolves to" rule the Link field's edit already spelled inline, applied to paste's clipboard target once; a `[[page1]]` pasted over a link now lands as `[[Page1]]`, one written shape, where it was written as pasted.
- Task 8-1's AFTER marked a cancelled edit's text as already committed, so the unmount's save would leave it alone; the save flushes the link settle first, and a link part emptied under the caret collapses in that flush, so Rename on `[[Alpha|Mine]]` with the alias deleted and then Escape wrote `[[Alpha]]`. Landed with a cancel that ends the edit (`ended`), so nothing after it writes.
- Task 8-2's AFTER deduped a field's commit on the raw text against `initial`; the Rename seat rewrites a bare address to `[](url)` before anything is typed, so Return wrote the unchanged value and an undo entry. Landed deduping on what the field would reopen on (`editorText(next) !== initial`).
- Task 8-1's AFTER gave the editor `onCancel?` and `onClose?` and left closing to the caller's commit, which the editor's own change-guard would never reach on an unchanged value; landed with one `onClose` and `leave` owning commit-then-close, Escape `cancel`, so Return on an unchanged field closes it.
- Task 8-2 kept `TextPicker` for Number beside a rebuilt chrome for the Link popover; the owner ruled (10-16-2026) that the two share one set of styles with different behaviors of what each accepts. Landed as `FieldPicker` (renamed from `TextPicker` at the owner's ask, since it is the one field chrome whatever sits inside) holding the kit's input over a `value` or a caller's editor as `children` inside one field style; the Number popover's width follows its content between 100 and 200px where it was a fixed 140px.
- Task 8-1's AFTER swallowed Tab in the one-line field as the pane does; landed leaving Tab unclaimed there, so it moves the focus and the blur commits, a plain field's feel.
- The final verification's simplification lens found the rename rewriter reading a markdown destination its own way (decoded, never stripped of `.md`) beside the one reader, the index, and the picker, four owners of "a slot read as a name", so `[Notes](Notes.md)` renamed to Alpha kept its label where `[Notes](Notes)` carried it. Landed with `linksIn` reading `namedPage(readOccurrence(…))` and yielding `named` on the hit, which `follower` reads; the picker's `namedTitle` went with it (`rewrite.test.ts` pins both spellings).
- `LinkTarget.alias` was the one slot the rest of the system called `shown`; renamed, so `retarget` and the Paste As rows pass a target through unchanged. The picker and paste each spelled Remove Title's baseline fold in full; `keptShown` beside the tracker asks it once, with `baselineAt` private to it. The Text pane's `saveRef`/`close` pair was weighed for removal and stays: `PickerMenu` holds the editor through its exit presence, so the unmount's commit would land after the fade.
- The neutral round's own consequences, ruled: a resting-cell click inside a label holding an escape seats at the link's edge rather than the exact character, the rule the `Title § Heading` join already follows where drawn text stops mapping to source; a title-cache entry a host persisted under a scheme-less spelling is unreachable under the normalized key and fetches once more (the cache is regenerative); an HTML tag inside a markdown label draws its own text raw, outside the label's reading; the drive harness's shared-prefix sweep means two concurrent drives would end each other's instance at launch, which the harness never supports (one `~/Test` backup).
- The neutral reviewer's six corrections ruled rather than fixed, each with its reason: the Matrix's two dedupes collapse different things on either side of the bridge (heading qualifiers before it, keys after the registry's rule); `EntityRecord.icon` and the ledger's `plain` strip were Phase 1's weighed design (the walk visits the entity's icon; the persisted baseline keeps its four fields by its own contract); `openLinkAt`'s slot holder keeps one pattern where the before kept a second grammar; `pagesByIdOf` and `writablePathsOf` are two policies by design, show and write, cross-cited; the sort extracts its key once per row, so `shownProse` costs one walk per row, not per comparison; the behaviors beyond the intention's sentence (Text values sorting as they read, `EditEnd`, `location`) are the plan's own rulings.
- The owner ruled (10-16-2026) that nothing is carried to the final report: each observation the phases parked is fixed or closed with its reason. Closed as right with a reason: the heading-rename settle is directly tested (`Links/headingRenameSettle.test.tsx`, thirty cases, moved beside its module); a pick into an unclosed link mid-title keeps the slot's remainder as prose past the closer, the only non-guess where no grammar boundary follows the caret (`edits.test.ts`, `autocomplete.test.ts` pin it); the tile handle's pick tree and the move targets fold the same containers into different products for different leaves; `linkTokenAt` filters a cached token list where `linkAt` walks text, and they answer opposite boundaries by pinned design; the plain-links setting is one root class every surface draws through; `readPageRelations`' `key` names the concept `Relation.key` names. Fixed (`b20b16a3b`): the markdown label's spelling check; a heading re-pick under Remove Title; the Text field's memory on flush; one line walk; `inlineSurface` unexported; Number committing before it closes; one duplicate-id policy (the cache refill in `assignment.ts` keeps reading the first listed, since Remove's strip is first-seen by construction and the refill is its pair, so the comments say the file writers refuse); one path map; Paste As rows through the host's index (the bare address form never diverged, the markdown form did); the cascade's registry in memory (`renameCascade` through `liveTreeOf`, as its sibling writers read it); `Relation.count` gone at generation 15; the page shell's height chain; the harness sweep; the settle's test beside it; ConnectionsPM naming the field.
- Phase 5's review observed that a heading re-pick keeps a label that named the old section (`[Setup](Notes#Setup)` re-picked to Usage keeps `Setup`) where a rename carries it. The picker sharing the rename's carry was typed and measured at about 45 Actionable lines (a shared in-place rewriter with adapter shapes, the query carrying its shown slot's position, a hook switch); reversed as weight that outruns its case. A heading pick keeps its shown text in both syntaxes, as Phase 5 landed.
