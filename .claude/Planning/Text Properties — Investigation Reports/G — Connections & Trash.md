**Re-grounded:** 10-07-2026 at `32d3fa62c`

### G — Connections & Trash

Investigator G's slice covers the connection primitives (`Core/Connections/`), the resting render of a connection held in a value, the delete-time strip and Trash restore of Link values, and Multi-Select's foreign-member recognition. The cascade *callers* and the index seed belong to Investigator B; they're cited here only where a primitive's behavior depends on what its caller hands it.

#### Task 1: The Two Grammars

Two readers decide what a connection is. The **whole-value** reader asks whether an entire string is one link; the **body** scanner finds every link inside prose. They share the regex sources but differ in which forms they accept.

| Form | Whole-value at rest (`readLink`, `parseConnectionText`) | Whole-value at commit (`linkValueFromEdit`) | Body (`linksIn`) |
| --- | --- | --- | --- |
| `[[Title]]` | page (`connections.ts:74-87`, `linkValue.ts:15-20`) | page, re-cased to the resolved title; refused if no page answers (`linkValue.ts:33-39`, `linkValue.test.ts:156-158`) | `wiki` hit (`scan.ts:80-91`) |
| `[[Title#Heading]]` | page + heading (`connections.ts:78-80`) | page + heading (`linkValue.ts:39`) | `wiki` hit, heading as qualifier (`scan.ts:89`) |
| `[[Title\|Alias]]` | page + alias, trimmed (`connections.ts:85`) | alias kept unless it folds equal to the target (`connections.ts:89-96`, `linkValue.test.ts:150-155`) | `wiki` hit; alias ignored |
| `[[#Heading]]` | `{ title: '', heading }` (`connections.ts:81-84`, `connections.test.ts:32`) | refused — `resolve('')` finds no page (`linkValue.ts:35-36`) | resolves to `ownTitle` via `titleKey('', own)`; skipped when `ownTitle` is empty (`scan.ts:18-21`, `scan.ts:87-88`) |
| `[Label](Page)` | **a URL** — `parseConnectionText` fails, `parseLink`'s `MD_LINK` matches, `url = 'Page'` (`linkValue.ts:22-27`) | converted to `[[Page\|Label]]` when the target names a page (`linkValue.ts:40-45`, `linkValue.test.ts:144-149`) | `markdown` hit when `targetTitle` names a page (`scan.ts:99-105`, `links.ts:62-78`) |
| `[Label](https://…)` | URL with alias (`linkValue.ts:22-27`) | aliased URL if `isValidLink` (`linkValue.ts:46`) | not a page hit — `targetTitle` refuses a scheme or `/` (`links.ts:62-69`) |
| bare URL | URL (`linkValue.ts:26`) | URL if `isValidLink`, normalized (`linkValue.ts:76-79`) | nothing |
| `![[Title]]` | not a connection — `pageLinkPattern`'s `(?<!!)` lookbehind (`connections.ts:8`) | refused unless a valid URL | `embed` hit (`scan.ts:92-98`) |
| `§Heading` run | nothing | nothing | `section` hit, only with an outline *and* an own title (`scan.ts:76`, `scan.ts:106-108`) |
| Prose with any link inside | URL whose address is the whole string (`linkValue.ts:26`) | refused unless the whole string is a valid URL | every hit, with offsets |

**Shared code.** `parseConnectionText` anchors `pageLinkPattern().source` as `WHOLE_LINK` (`connections.ts:66`), so wikilink acceptance is one grammar on both sides. `linksIn` reads `markdownLinkRegex()` (`links.ts:12-13`) while the whole-value side reads the separate anchored `MD_LINK` (`links.ts:5`). Both sides fold through `normalizeTitle` (`scan.ts:79`, `scan.ts:120`, `rewrite.ts:33`, `rewrite.ts:126`).

**The markdown-link asymmetry.** At rest, the whole-value reader reads `[Label](Page)` as an address; the body scanner reads it as a page connection. The two agree today only because `linkValueFromEdit` rewrites the markdown form into `[[Page|Label]]` at commit (`linkValue.ts:40-45`). A value written outside the app in markdown-link form is an address to every whole-value consumer — `frontmatterMentions` (`scan.ts:118-119`), `rewriteFrontmatterConnections` (`rewrite.ts:125-126`), `deleteCascade`'s `namesGone` (`cascade.ts:99-103`), and `LinkCell` (`LinkCell.tsx:26-27`). A Text value has no commit-time normalization unless one is built.

**Running `linksIn` over a value string.** `linksIn` is a pure generator over any string (`scan.ts:70-109`). `codeMask` splits on `\n` and masks fenced lines plus inline code spans (`markdownCode.ts:199-208`). A one-line value can't form a fence block, since an opener nothing closes reads as prose (`markdownCode.ts:99-114`). An unclosed backtick claims the rest of its line (`markdownCode.ts:122`), so `` use `[[X]] here `` masks the link. Indented code isn't masked anywhere.

**What `ownTitle` and `outline` would mean for a value.**

- **A page-held value:** `ownTitle` would be the holding page's title, so `[[#Heading]]` in a value names a heading of the page it sits on. Today's whole-value side drops it from the mention index (`scan.test.ts:181-186`); `namesGonePage` always lets it stand (`propertyValue.ts:120-124`); `LinkCell` resolves `''`, finds no page, renders an inert anchor whose text is `target.alias ?? target.title`, so it's empty when unaliased (`LinkCell.tsx:69`, `LinkCell.tsx:86`).
- **A Space-held value:** there's no own page. The rename cascade's Space arm runs only the whole-value patch and carries no own title (`cascade.ts:200-203`), and `connectionsApi.ts:103` notes that a surface without page identity leaves the bare fragment's keys undefined.
- **`outline`:** this is the holding page's headings, read only for `§` runs (`scan.ts:76`); the index seed always passes it (`indexSeed.ts:61`), and the cascade passes it only under Automatic In-Page Heading Resolution (`cascade.ts:176-190`). A `§` in a value would read against the page body's outline.

#### Task 2: Rewriting Inside a Value

`rewriteConnections` (`rewrite.ts:31-60`) and `rewriteHeadingConnections` (`rewrite.ts:65-111`) are pure `string → string` functions with no I/O. Each rebuilds `codeMask` between passes so offsets stay valid after length-changing rewrites (`rewrite.ts:42-43`, `rewrite.ts:49-50`). Run over a Text value, they'd behave this way:

| Input inside the value | `rewriteConnections` (title) | `rewriteHeadingConnections` |
| --- | --- | --- |
| `[[Old\|alias]]` | `[[New\|alias]]`, alias verbatim (`rewrite.ts:40`) | heading half moved, alias verbatim (`rewrite.ts:85`) |
| `[[Old\|old]]` (alias equal to the title) | `[[New\|old]]` — kept | — |
| `[[Old\\\|alias]]` (cell-escaped pipe) | `\|` re-emitted (`rewrite.ts:25-26`, `rewrite.ts:38`) — a GFM table convention with no meaning in a YAML value | same (`rewrite.ts:85`) |
| `` `[[Old]]` `` | untouched (`rewrite.ts:37`) | untouched (`rewrite.ts:83`) |
| `[L](Old)` | target re-encoded, label kept (`rewrite.ts:51-58`) | fragment re-encoded (`rewrite.ts:95-102`) |
| `[[#H]]` | untouched (empty page never folds to `oldKey`) | moved only when `ownTitle` is the page (`rewrite.ts:76-78`) |
| URL sharing the title as last segment | untouched (`rewrite.ts:49`, `rewrite.test.ts:129`) | untouched |
| A heading the grammar can't write | — | no link moves (`rewrite.ts:80`, `rewrite.test.ts:201`) |

**Today, frontmatter never reaches the body rewriters.** The cascade's `text` arm patches values through `rewriteFrontmatterConnections` over `registered(splitFrontmatter(content))` and runs `rewrite` over `splitEnvelope(content).body` alone (`cascade.ts:204-216`).

**`rewriteFrontmatterConnections` already reaches every registered key, whatever its type.** It takes any record, skips non-strings, and patches any string `readLink` calls a page link (`rewrite.ts:114-132`). Its caller passes every registered key regardless of type (`cascade.ts:194-195`, `cascade.ts:205-209`), and the Space arm does the same (`cascade.ts:200-203`). `spacesLinkHeading` likewise reads every Space value through `readLink` with no type filter (`cascade.ts:58-73`). A Text value that is exactly `[[Old]]` would therefore be renamed by today's code with no Text-specific change. The cached-value arm, by contrast, is Link-only: `editCaches` receives `linkIds` (`cascade.ts:228-230`, `propertyCache.ts:60`).

**Double handling.** If a body rewriter were added over Text values and the whole-value patch kept running over all registered keys, a value that is only one link would match both. The two writers disagree:

- **Alias equal to the new target:** `connectionText` drops an alias that folds equal to the target (`connections.ts:92`), so `[[Old|New]]` renamed to `New` becomes `[[New]]` through the whole-value path and `[[New|New]]` through `rewriteConnections` (`rewrite.ts:40`).
- **Whitespace and escapes:** `parseConnectionText` trims title, heading, and alias (`connections.ts:79-85`); `rewriteConnections` re-emits the alias and fragment as written. `connectionText` also refuses an alias holding `]` or a newline (`connections.ts:92`).
- **Order:** if one runs on the other's output, the second finds no `Old` and no-ops; if both compute from the original and land through one `patch`, the last key write wins. The outcome is either benign or a format divergence, depending on composition.

**The `Record<string, string>` shape.** The patch is keyed by property name with a whole replacement string, and empty means "no field write" (`rewrite.ts:113`). A body-rewritten Text value is also one whole string per key, so it fits the shape. On write, `mergeFrontmatter` goes through the `yaml` Document API (`pageFile.ts:122-131`), which quotes `[[X]]` and `[[X]] and more` and leaves `see [[X]]` plain. The probe output is under *§Tensions* (8).

**What the index tells a rename to visit.** `frontmatterMentions` records only whole-value links (`scan.ts:111-125`) and feeds `extractPageIndex` (`indexSeed.ts:66`). A page whose only mention of `Old` sits inside a Text sentence isn't among the files `queryMentions` names (`cascade.ts:172-175`). Whether the seed should emit those mentions is Investigator B's question; at the primitive level, no function yields hits from inside a frontmatter value.

#### Task 3: Resting Render of a Connection in a Value

**`LinkCell` renders a whole-value connection** (`LinkCell.tsx:36-37`, `LinkCell.tsx:60-90`); it's reached from `Cell.tsx:124-125` only when the decoded value's kind is `link`.

| Aspect | `LinkCell` / `ConnectionCell` | Evidence |
| --- | --- | --- |
| Color | `.cell-connection` is a flat `var(--connection)`, with no resolved, ambiguous, or phantom variant | `table.css:210-214` |
| Text | alias, else title; the heading is never shown, and Heading Link Style isn't read | `LinkCell.tsx:86` |
| Click | `resolveConnection` returns a page only when the status is `resolved`; otherwise the click is inert | `LinkCell.tsx:69`, `LinkCell.tsx:79`, `treeIndex.ts:284-288` |
| Glance | none — every `hoverGlance` caller is a row, nav, tab, sidebar, or Matrix node | `useViewInteractions.tsx:68`, `NavList.tsx:113`, `MatrixLabel.tsx:137` |
| Menu | the connection menu when the target resolves, otherwise the plain link cell menu; the table gates on the column's type being `link`, the property panel on the decoded value's kind being `link` | `connectionMenuActions.ts:76-101`, `TableView.tsx:285-290`, `PropertyPanel.tsx:310-323`, `cellMenu.ts:113-122` |
| Resolver for commits | `resolveTitle` reads the live tree on the gesture | `linkResolve.ts:7-8` |

**A non-editor renderer of connections inside text already exists.** `renderCellContent` and `StaticCell` in `Core/MarkdownPM/Tables/cellStatic.tsx` render a GFM table cell at rest as React, without CodeMirror. The renderer:

- **Classifies wikilinks:** resolved, ambiguous, or phantom through `wikiLinkView`, the same function the editor's decoration layer calls (`cellStatic.tsx:64-110`, `decorations.ts:543`).
- **Handles headings:** draws `Page § Heading` per Heading Link Style and marks missing headings (`cellStatic.tsx:81-104`).
- **Classifies markdown links:** page, external, or invalid through `tokenTarget` (`cellStatic.tsx:111-135`).
- **Wires interaction:** click via `followTarget` (`cellStatic.tsx:291-300`), glance via `dwellTarget` (`cellStatic.tsx:366-371`), and the editable connection menu via `menuTarget` (`cellStatic.tsx:329-354`, `cellStatic.tsx:421-456`).
- **Handles block content:** multi-line cells, lists, checkboxes, and citations (`cellStatic.tsx:195-253`, `cellStatic.tsx:302-327`).

`StaticCell` is coupled to its table. It requires `host: EditorHost` for `glance` and `linkTitles` (`cellStatic.tsx:265`, `cellStatic.tsx:362`, `cellStatic.tsx:454`), `around: CellPage` for `ownKeys` and citation ordinals (`cellStatic.tsx:35-38`), and `onActivate`, `onCommit`, and `onSelect` callbacks from `MarkdownTable` (`MarkdownTable.tsx:468-494`). Its `ConnectionsApi` comes from `useConnections` (`pageConnections.ts:10-40`), which supplies `resolve`, `open`, `bypass`, `menu`, `headingsOf`, and `location`; nothing about it is table-specific. Its edit-mode counterpart is the single-cell CodeMirror `CellEditor`, which already mounts the connection autocomplete (`CellEditor.tsx:145`).

**What a Text value with inline links renders as today:** nothing. `PROPERTY_TYPES` has no `text` entry (`properties.ts:33-45`), `decodeValue` has no case for one (`propertyValue.ts:69-104`), and `Cell.tsx`'s switch has none (`Cell.tsx:70-161`).

- **Through a plain text path:** if a Text value went through the `OverScroll` text path that `number` and `dateTime` use (`Cell.tsx:127-142`), it would read as literal `[[Title]]` with brackets.
- **Through `LinkCell`:** it would become an address equal to the whole sentence, an `<a>` whose click calls `openWebLink` without an `isValidLink` check (`LinkCell.tsx:27`, `LinkCell.tsx:47-51`).
- **Through `renderCellContent`:** it would match the editor's resting look for links in a table cell.

**The "written twice" issue already understates the count.** `ConnectionsPM.md` §Known Issues names the editor decoration layer and the property-cell renderer. `cellStatic.tsx` is a third connection renderer. It shares its state mapping with the editor (`wikiLinkView`, `tokenTarget`) but writes its own DOM, so its drift risk is smaller than `LinkCell`'s. A Text resting surface built fresh would be a fourth. One built on `renderCellContent` would add none, but the function would first need to be separated from the table's `EditorHost` and `CellPage` coupling.

#### Task 4: Deletion and Restore

**The delete strip.** `deleteOp` writes a `partial` record, moves the artifact into its bundle, then runs `deleteCascade`, and rewrites the record with the stripped `links` (`delete.ts:86-103`).

- **Type-scoped to Link:** `deleteCascade` reads `linkDefs` (`propertiesRegistry.ts:71-72`, which filters `type === 'link'`) and returns early when there are none (`cascade.ts:93-94`).
- **Whole-value test:** `named` matches only keys whose definition is a Link and whose whole value `readLink` calls a page in `gone` (`cascade.ts:99-108`).
- **Whole-key strip:** `stripKeys` removes the whole key (`cascade.ts:109-113`).
- **Titles still held elsewhere:** a title held by a page outside the delete is skipped (`cascade.ts:88-90`).
- **Bodies:** untouched, and they read as phantoms (`cascade.ts:81`).

The strip runs regardless of **Restore Links On Deletion**.

**The record.** Each stripped value is a `StrippedLink { page, property, value }` with the whole string (`cascade.ts:41-45`, `record.ts:23-27`, `record.ts:36-37`). `appendLinks` adds more later (`record.ts:89-94`).

**Restore.** `restoreArtifact` (`spend.ts:131-280`) proceeds in this order:

1. **Scrub:** the returning content goes through `scrubReturning`, which drops Link values naming pages the frozen world lacks — Link-scoped (`restoreScrub.ts:35-39`) — and parks them.
2. **Gate:** only with `restoreLinksOnDeletion` on (default `true`, `personalization.ts:189`; the toggle's copy is at `frames.ts:583-587`) does it re-fill the recorded links (`spend.ts:252-273`).
3. **Re-aim:** each recorded value is re-aimed with the whole-value rewriter when the page landed under a new title (`spend.ts:263-265`).
4. **Refill:** `refillValues` writes it back only where the holder's property reads blank (`assignment.ts:49-66`, line 60).
5. **Trashed holders:** a value whose holder is itself trashed is written into the trashed copy (`spend.ts:267-272`, `holdings.ts:129-148`).

**Parking.** `parkLinks` assigns a dropped value to the newest bundle holding the title `parseConnectionText(value)` names (`holdings.ts:84-94`). `emptyBundle` re-runs `deleteCascade` permanently and parks what it finds (`spend.ts:82-89`). Property restore drops Link values naming gone pages through `namesGonePage` (`restoreProperty.ts:61-69`).

**Every link-aware piece of this path is type-scoped to Link and reads only whole values:** `linkDefs`, `scrubReturning`'s `links` map, `restoreProperty`'s `def.type !== 'link'`, `restoreCachedValues`'s `def.type === 'link'` (`assignment.ts:92-95`), and `reconcilePropertyValue`'s `value.kind === 'link'` (`propertyValue.ts:134`). A `text` definition falls outside all of them with no code change.

**The two readings for a link inside a Text value, as facts:**

- **(a) Small-body semantics.** This is what today's code yields by default. The delete strip skips the value (type gate, `cascade.ts:93`); the inline link reads as a phantom like a body link (`cascade.ts:81`). Nothing is recorded or restored; a restore makes the phantom resolve again by title, since resolution is by title (`ConnectionsPM.md` §Resolution). A page restored under a deduplicated title (`spend.ts:172`) leaves the phantom unresolved, as bodies are today, since only recorded frontmatter values are re-aimed (`spend.ts:263-264`). The rename cascade would carry inline links only through a body rewriter run over the value (*§Task 2*), and only for files the index names.
- **(b) Whole-value semantics.** The record shape holds one whole string per property per holder (`record.ts:23-27`). `stripKeys` removes the whole key (`cascade.ts:109-113`). `refillValues` and `refillTrashed` land the whole value only where blank (`assignment.ts:60`, `holdings.ts:140`). `parkLinks` and `namesGonePage` find the target through `parseConnectionText` on the whole value (`holdings.ts:89`, `propertyValue.ts:122`), so a sentence naming a page parks nowhere and is never "gone." Applying (b) to a sentence means nulling the whole prose. A sentence naming two trashed pages has no single bundle to park in, and a sub-span strip has no representation anywhere in the path.

**One mixed case exists today.** A Text value that is exactly `[[X]]` is rewritten on rename, since the whole-value patch is type-agnostic (`cascade.ts:194-209`). Under (a) it isn't stripped on delete (Link-only gate). Under (b) it would be, while a Text sentence couldn't be.

#### Task 5: Foreign Recognition

**`unregisteredMembers(def, raw)`** decodes `raw` by the definition and, for a Multi-Select only, returns each member the definition doesn't register; every other type returns `[]` (`propertyValue.ts:107-113`). `decodeValue`'s Multi-Select case keeps unregistered members as values (`propertyValue.ts:87-91`), so they render before and after registration.

**Its one writer path is `registerHeldOptions`** (`optionOps.ts:93-150`). Under the schema lock, it collects unregistered members across Multi-Select definitions for the given files, or everywhere, and adds them as options (`optionOps.ts:99-145`). It skips a value an unfinished option rename still owes (`optionOps.ts:125-135`). No setting gates it (`optionOps.ts` reads no setting).

| Trigger | Where | Scope |
| --- | --- | --- |
| Nexus open | `handlers.ts:106-107`, after the repair sweep | every Collection and Space (`optionOps.ts:106-110`) |
| Any page event whose frontmatter changed, own write or watched | `oweValue` at `fileEvents.ts:386`, drained at `settle.ts:138-141` | that page; body-only events are excluded (`settle.ts:138`) |
| A container's schema gaining a definition (an assign) | `fileEvents.ts:432-434` | that container's pages |
| Any Space sidecar event | `fileEvents.ts:439-440` | that Space |
| A path newly in reach (Try Again, rescope) | `fileEvents.ts:141`, `fileEvents.ts:514`, `settle.ts:139` | those folders |

**What "recognition" means today:** an option-bearing definition adopts foreign *values* into its option list, automatically, on open, on change, and on assign.

**Candidate meanings for Text:**

- **Adopting foreign values.** A Text definition has no options, so `unregisteredMembers` returns `[]` for it as for every non-Multi-Select type (`propertyValue.ts:110-112`). There's nothing to register, and any string decodes as itself once a `text` case exists.
- **Adopting foreign keys as new Text definitions.** This would be a registry mutation through `createProperty` (`registryProperty.ts:46-75`). Today's two callers start from a definition, never from a key: `schema:add` (`Properties/handlers.ts:137-150`) and `restoreProperty` (`restoreProperty.ts:41`). Key-holder counting lives in `keyHolders.ts`: `keyHolderFiles` (index-backed, `keyHolders.ts:14-20`), `confirmedKeyHolders` (disk-confirmed, including Spaces, `keyHolders.ts:23-41`), and `keyedHolders` (values by id, `keyHolders.ts:44-74`), backed by `queryKeyHolders` (`contentIndex.ts:79-81`). The posture toward a held key is split:
  - **Rename refuses** a target name files already hold (`registryProperty.ts:116-121`, `KEY_REFUSAL.held` at `properties.ts:265-266`).
  - **Create doesn't check holders** (`schema.ts:42-59` is synchronous over definitions only), so creating a property under a held key's name adopts those values implicitly.
  - **Counting:** `property:holders` (`deleteProperty.ts:80-84`, `bridge.ts:179`) counts holders for an existing definition.

  Nothing enumerates foreign keys or proposes a definition from one. The index's `spaceRelations` notes that unregistered property names are kept in `page_values` (`indexSeed.ts:73`).

---

#### Tensions

Tension numbers come from the brief; their wording isn't in it, so each is read from the brief's label.

- **Tension 3, read as inline connections in a Text value (render, cascade, delete):** The bet holds for rewriting: the body rewriters are pure over a value string (*§Task 2*). It partly breaks on four fronts:
  - **Commit-time grammar:** the whole-value grammar reads `[L](Page)` as an address at rest (*§Task 1*).
  - **Double handling:** the type-agnostic whole-value patch would double-handle a link-only value with divergent output (`connections.ts:92` vs `rewrite.ts:40`).
  - **Index mentions:** no index mention exists for an inline value link (`scan.ts:111-125`).
  - **Resting render:** no Text renderer exists. Assembly holds only if `renderCellContent` is freed from `EditorHost` and `CellPage`; a fresh renderer extends the "written twice" issue to four.
- **Tension 9, foreign recognition:** Confirmed as described. Recognition today is Multi-Select option adoption only, ungated, on open, change, assign, and Space events. It has no meaning for Text values. Foreign-key adoption has no precedent; rename's posture is refusal, and create's implicit adoption is the only existing route.
- **Tension 1, sort:** Partial. `linkDisplayText` documents that with no display argument it returns the raw URL, which sort and filter rely on (`linkValue.ts:94`). A Text value sorted by its raw string sorts by bracketed syntax. No sort code was read.
- **Tension 2, filters:** Can't speak.
- **Tension 4, validation:** A Link commit refuses a connection no page answers to (`linkValue.ts:74-76`, `linkValue.test.ts:156-158`). Body semantics accept phantoms; no validator over inline value links exists.
- **Tension 5, single-line or multi-line:** The link grammar excludes `\r\n` inside a link (`connections.ts:8`), and `codeMask` and the rewriters are line-aware but don't depend on line count. `renderCellContent` already renders multi-line cells with lists (`cellStatic.tsx:195-253`), and `CellEditor` is the multi-line single-cell editor precedent.
- **Tension 6, table glyph:** Can't speak.
- **Tension 7, native menu:** A connection inside text already gets the full editable connection menu at rest through `StaticCell`'s `menuTarget` (`cellStatic.tsx:421-456`). The property surfaces route connection menus only for Link: the table on the column type (`TableView.tsx:285`), the property panel on the decoded value's kind (`PropertyPanel.tsx:316`), so a Text column would need its own route.
- **Tension 8, non-string adoption:** A probe of the `yaml` package the app parses with (`pageFile.ts:1`):

  ```
  A: [[X]]              → {"A":[["X"]]}             (nested array)
  A: [[X]] and more     → parse error; recovered as {"A":[["X"]]} with the trailing text lost
  A: see [[X]] and [[Y]] → {"A":"see [[X]] and [[Y]]"}
  A: "[[X]]"            → {"A":"[[X]]"}
  ```

  An externally authored, unquoted value that begins with a link becomes an array or a broken document. Broken frontmatter reads as recovered values (`pageFile.ts:30-38`) and is never re-serialized, since `mergeInto` merges only a `mergeable` document (`pageFile.ts:55-56`, `pageFile.ts:97`). Every whole-value consumer skips non-strings (`scan.ts:117`, `rewrite.ts:124`). The app's own writes quote correctly (`A: "[[X]] and more"`, `C: "[[X]]"`, `B: see [[X]]` left plain).

#### Questions For Nathan

1. **Deletion semantics for a link inside Text.** When a page is deleted, should a Text value that mentions it keep the mention as a phantom (like page bodies, *§Task 4* (a)), or should something happen to the value? Option (b) can only null the whole text (`cascade.ts:109-113`, `record.ts:23-27`), so it'd lose the prose until a restore. A related sub-question: should **Restore Links On Deletion** — copy: "Restoring a deleted page puts it back into the Link property values that pointed at it" (`frames.ts:587`) — promise anything for Text?
2. **A Text value that is exactly one link.** Today's rename patch already treats it as a connection (`cascade.ts:194-209`), but the delete strip doesn't (`cascade.ts:93`). Should it behave like the rest of its property (decoded by type, per the Decision Log's concept) or like a Link value because of its shape?
3. **Phantoms at commit.** A Link refuses a title no page answers to (`linkValue.ts:74-76`). Should typing `[[Nowhere]]` into a Text value be accepted as prose, as a body accepts it?
4. **Resting interaction.** Should a resting Text value's connections be live — click, glance, and menu, as a table cell's are (`cellStatic.tsx:291-371`) — or display-only?
5. **`[[#Heading]]` in a value.** Should it name a heading on the holding page? A Space has no page to answer it (`cascade.ts:200-203`).
6. **Foreign keys.** Should a frontmatter key no definition names ever become a Text property without the user creating one? Today rename refuses held keys (`registryProperty.ts:116-121`), and create adopts them silently (`schema.ts:42-59`).

#### Missing

- **No Text type:** there's no `text` entry in `PROPERTY_TYPES` (`properties.ts:33-45`), no decode case (`propertyValue.ts:69-104`), and no `Cell.tsx` case (`Cell.tsx:70-161`).
- **No reader for links inside a value:** no primitive yields link hits from inside a frontmatter value; `frontmatterMentions` is whole-value only (`scan.ts:111-125`).
- **No resting markdown-link reading:** no whole-value reader recognizes `[Label](Page)` at rest (`linkValue.ts:15-27`); only the commit path converts it (`linkValue.ts:40-45`).
- **No sub-span strip:** no strip, record, park, or refill path represents part of a value; `StrippedLink.value` is the whole string (`record.ts:23-27`).
- **Flat Link cells:** `LinkCell` has no resolved, ambiguous, or phantom styling (`table.css:210-214`), no glance, and no heading display (`LinkCell.tsx:60-90`).
- **No standalone inline renderer:** no inline-markdown renderer exists apart from `EditorHost` and the table's `CellPage` (`cellStatic.tsx:35-38`, `cellStatic.tsx:264-286`).
- **No Matrix kind:** Matrix's `LinkKind` is a closed union of `body | citation | frontmatter | space | location` (`Core/Matrix/Engine/graph.ts:4`) with no kind for a link inside a frontmatter value; Matrix reads the index's relation rows (`matrixGraph.ts:18-39`).
- **No key-to-definition path:** nothing creates a definition from a held key, and nothing enumerates foreign keys.
