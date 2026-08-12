## Alias-V1 — Decision Log

### Frame

- **Purpose:** Give `[[Title|Alias]]` a real display treatment in MarkdownPM, add the two authoring gestures that create and edit one (Rename · Edit Link), give alias typing an autocomplete over a page's previously-used aliases, and settle whether Markdown-link syntax resolves internally alongside wikilinks.
- **Core Value:** The words shown for a connection become the author's to choose, without ever putting the link itself at risk.
- **Success Criteria:** An aliased connection renders as its alias and navigates correctly; both authoring gestures place the caret exactly where the author expects; nothing in the rename cascade, the resolution index, or an existing body is made less correct by any of it.

### Sources

- [[ConnectionsPM]] — the connection contract. §Syntax + Scope states `[[Title|alias]]` already parses and resolves on the title, with the tail rendering as plain text; §Prospects lists **Aliases** as "parses and survives every rewrite, but nothing renders it and no surface authors one."
- [[ContextPM]] §Immediate Work — **Display-alias is the locked next arc**, already sequenced.
- [[ContextPM]] §Next-Feature Candidates — **Page aliases** (frontmatter `Aliases:` as *resolution* keys) is parked whole, and explicitly flags a **naming collision** with the display-alias vocabulary.
- [[ContextPM]] §Known Issues — clicking beside connection syntax navigates instead of placing the caret, deferred by name to "when alias and link management becomes a current focus."
- `src/shared/connections.ts` — `pageLinkPattern()` captures group 1 = title, group 2 = alias; both length-capped at 255 (a load-bearing ReDoS guard, not cosmetic). `ConnMenuAction` is currently the single value `'preview'`.
- `src/renderer/src/MarkdownPM/tokens/index.ts` — `wikiLinkTokens` sets `contentRange` to the **title span only** and `markerRanges` to `[[` and `]]` only; the `|alias` tail belongs to neither, which is the exact mechanical reason it renders as raw text.
- `src/renderer/src/MarkdownPM/editor/decorations.ts` — the `kind === 'link'` block (markdown links) already implements the alias-forward treatment: content styled, `](url)` hidden at rest, revealed on caret. The `wikiLink` block sits directly beneath it and hides only its brackets.
- `src/shared/links.ts` + `src/renderer/src/Detail/Views/Table/linkValue.ts` — the shipped `[alias](url)` seam for URL *properties*, with `escapeAlias`/`unescapeAlias`. `urlValueFromEdit` **deliberately preserves the alias when the URL is edited**.
- `src/shared/cellMenu.ts` — a filled URL cell's menu is **Edit · Rename · Clear**, the vocabulary Alias-V1 mirrors.
- `src/main/connections/rewrite.ts` — the cascade sweeps `[[ ]]` and `![[ ]]` only; an alias rides through a rename untouched. **Markdown links are not swept.**
- `src/main/connections/scan.ts` — the cascade prefilter, same two patterns, code-masked.
- `src/main/db/schema.ts` — nexus.db's charter: "Nothing here is content — the filesystem stays canonical — so a version mismatch **drops the file and starts clean**."
- `src/main/db/localState.ts` — the keyed scope store (`Scope` union, single-row upserts, null deletes the key).
- `src/renderer/src/MarkdownPM/useConnectionAutocomplete.ts` + `autocomplete.ts` — the `[[…]]` autocomplete state machine; `commit()` inserts `page.title` via `connectionInsert` and has no alias branch.
- `src/renderer/src/Components/Chip.tsx` — the shared chip with the hover-revealed remove-×.

### Decisions

#### A — Rendering

- **A-1:** [confirmed] `[[Title|Alias]]` renders the **alias** as the connection's visible text; the `Title|` portion joins the hidden marker set. Grounded: this is precisely what the adjacent markdown-link decoration block already does for `[alias](url)`, so the treatment is a mirror, not an invention.
- **A-2:** [confirmed] A displayed alias gives a wikiLink **two meaningful spans** — the text shown and the key resolved — where `Token` carries only one. `Token` therefore gains a distinct resolve span beside `contentRange`, and the three consumers that resolve off `contentRange` today read the new field: the CodeMirror decoration, the click/hover hit-test, and `Tables/cellStatic.tsx`. Moving `contentRange` alone would make an aliased link resolve its *alias* — phantom, raw, and unnavigable.
- **A-4:** [confirmed] **There are two wikiLink renderers.** `Tables/cellStatic.tsx` is a second, non-CodeMirror renderer with its own alias-tail line and its own resolve call. Both change together or a markdown table cell disagrees with the editor about what an aliased link looks like.
- **A-3:** [assumed] Resolution status styling is unchanged — an aliased link that is ambiguous or phantom takes the same treatment its bare form would. A phantom aliased link therefore renders raw (`[[Nothing|Alias]]` visible in full), matching today's phantom rule.

#### B — Authoring Gestures

- **B-1:** [confirmed] Two new actions join the connection's native right-click menu, which today holds only **Open Preview**.
- **B-2:** [assumed] **Rename** targets the display text: with no alias it inserts `|` after the title and places the caret after it; with an alias it selects/enters the existing alias.
- **B-3:** [assumed] **Edit Link** targets the target: the caret lands at the trailing character of the *title*, before any `|alias`.
- **B-4:** [confirmed] **Edit Link strips the alias from the new link but remembers it** — the alias stays in the *original* page's remembered list, it simply doesn't ride to the new target. Repointing a connection means the old words describe the wrong page. This deliberately diverges from the URL-property convention, which preserves an alias across a URL edit; the two differ because a URL correction keeps naming the same thing while a link change does not.
- **B-6:** [confirmed] Strip-on-change is the high-likelihood preference, not a law — it gets a **"Remove Title on Link Change"** nexus-level personalization toggle in `SettingsWindow.tsx`'s **`pages`** category, defaulting to on. Per-page settings were considered and dropped: no such surface exists, and building one to hold a boolean is its own feature.
- **B-5:** [assumed] The caret-placement bug in [[ContextPM]] §Known Issues (clicking beside connection syntax navigates rather than placing the caret) is **in scope for this arc**, per its own deferral note — both gestures are unusable while a click near the syntax navigates away.

#### C — Alias Memory

- **C-1:** [confirmed] Remembered aliases live in **nexus.db**, and this sits squarely inside its charter: the alias itself is written on-page in universal `[[Title|Alias]]` syntax, so nothing about resolution or portability depends on the database. What the DB holds is the **autocomplete accelerator** — a Pommora-unique convenience whose loss costs a suggestion list, never a link.
- **C-2:** [confirmed] The list is **written on authoring**, not derived from a body scan. This is why the remove-× can be a genuine deletion rather than a suppression row, and it needs no nexus-wide scan.
- **C-3:** [confirmed] The **×** drops that alias from the page's remembered list. Bodies already carrying it are untouched — forgetting a suggestion never edits a document.
- **C-4:** [confirmed] Resolution is **via title**. There are no alternate resolution keys: a bare `[[Nickname]]` never resolves through the alias memory, and the parked frontmatter `Aliases:` idea is retired by Nathan.
#### G — Duplicate Disambiguation *(cut from Alias-V1)*

> **Scope ruling — Nathan, final.** Duplicate disambiguation **leaves this arc entirely**. Alias-V1 is about aliases; duplicate titles are a different feature that arrived as an answer to a good question and grew into the largest thing in the log. Connections do none of this today, and nothing about the alias work depends on it.
>
> What leaves with it: path qualification, the path-keyed tiebreak, the move-cascade gate, the prefix-preserving rewrite, the main-side title index it needed, and the journal hardening — whose entire justification was the three new cascade triggers path qualification would have added. The rename cascade's known non-atomicity returns to being a pre-existing [[ConnectionsPM]] Known Issue rather than something this arc multiplies.
>
> The material below is preserved as the settled design for whoever picks the feature up, not as scope.

Both approaches below answer the same gap: when several pages share a title, [[ConnectionsPM]] §Resolution renders the link **ambiguous** — muted and inert until one side is renamed. This is the parked **Duplicate disambiguation** prospect, which anticipated id-scoping.

- **G-1:** [confirmed] **Path qualification is the first-priority direction.** A connection may name its target by path — `[[Folder/Page|Alias]]` — so a duplicate title resolves deterministically. It is universal: the disambiguator is written in the body, so it holds in Obsidian, on another device, and after a `nexus.db` reset. `ConnPage` already carries `path`, and the form matches Obsidian's own convention.
- **G-2:** [confirmed] The cascade's reach is settled by G-9 and H-16 rather than by adding triggers wholesale: because a path only matters under ambiguity, `movePage`, `moveSet`, and container `rename` cascade **only when the moved page's title is duplicated**, gated by one index lookup. The page-rename cascade remains the one that always runs, and G-2a is what it must learn.
- **G-2a:** [confirmed] **The rename cascade rewrites the last segment and preserves the prefix.** `rewriteConnections` substitutes the entire captured span today, so `[[Work/Notes]]` would flatten to `[[Ideas]]` and discard a qualification the author added on purpose — while a title-only match skips the qualified form entirely and orphans it. The primitive matches on the span's last segment and replaces only that, leaving any folder prefix intact; `![[ ]]` embeds take the identical treatment.
- **G-3:** [confirmed] **No second index and no second normalization** — G-9 settles this: the path is a tiebreaker rather than a key, so `buildPageIndex` keeps `byTitle` unchanged. The one addition is that path *segments* trim individually on both sides of a comparison, since `normalizeTitle` only trims a string's ends and `[[Work / Notes]]` would otherwise fail to match.
- **G-9:** [confirmed] **The path is a tiebreaker, not a key.** Resolution reads the link's *last segment* as the title and looks it up in the existing index — unchanged, with no second index and no second normalization. A unique title resolves outright and the path is never consulted; only when several pages hold the title does the path narrow them, by matching which page's real location ends with what was written. A suffix-keyed index was designed and discarded as over-built: paths exist solely to break duplicate-title ties, so they belong in the tiebreak rather than in the key.
- **G-9a:** [confirmed] **A stale path on a unique title still resolves.** Because the path is consulted only under ambiguity, moving a page leaves every link to it working — which is what makes a move cheap rather than dangerous.
- **G-10:** [confirmed] **The cap rises to 1024.** At 255 an over-cap link produces no token at all — invisible to rendering, scanning, and the cascade alike rather than degrading to a phantom — and the cap was sized as a filename limit back when the brackets held only a title. A whole path eats it quickly under nesting. The reason for having *a* bound is the ReDoS guard, which is untouched by the number.
- **G-11:** [confirmed] **Markdown block tiles are out of scope.** Tiles are non-discoverable surfaces, and authoring a link inside one already behaves as intended — resolution is renderer-side, so a tile inherits every new form automatically. What tiles do *not* get is the new cascade coverage: `rewriteBlockConnections` stays title-only, so a `[]()` or path-qualified link inside a tile can go stale where the same link in a page heals. Accepted; the seam already exists, so widening it later is additive.
*(The alias-as-tiebreaker approach was weighed here and dropped — see §Considered & Rejected.)*
- **G-7:** [confirmed] Disambiguation lands **inside Alias-V1**. Nathan ruled it in with G-2's cascade cost explicitly on the table: the arc carries path qualification, its path-keyed resolution, and the move/folder-rename cascade alongside the display, authoring, and memory work.
- **G-8:** [confirmed] The alias tiebreak (G-4) is therefore **not built** — path qualification answers the same gap deterministically, and two mechanisms resolving one ambiguity would be a second writer. It stays recorded as the fallback the arc chose against.
- **C-5:** [assumed] The scope is keyed by **PageID**, not title, so the memory survives a rename. `ConnPage.id` is the PageID and `pagesByIdOf` already provides the id→page map.
- **C-6:** [confirmed] The scope is shaped as **per-page storage** rather than an alias-specific hack, joining `folds`, `headingCols`, and `embedHeights` — which are already PageID-keyed, so this is not the first such record and must not be documented as one. It also joins the copy-scope set, or a duplicated page silently loses its memory.
- **C-7:** [assumed] The autocomplete surface reuses `Chip.tsx`'s hover-revealed remove-× and the existing `AutocompletePanel` anchoring, rather than a new picker.

#### D — Dual Syntax

- **D-1:** [confirmed] `[Title](Link)` already tokenizes as `kind: 'link'` and unconditionally routes to `openExternal`. `isValidLink` is **not** the seam it first appeared to be — it accepts any dotted host, so a bare `Notes.md` passes as a URL (see H-5, which inverts the ordering). The real seam is that page resolution is tried first and the external gate catches what's left.
- **D-4:** [confirmed] Dual syntax means `[Foo](My Page)` and `[[My Page|Foo]]` express an identical edge two ways, and every consumer — tokenizer, decorations, scan, rewrite, menu, hover, click routing, autocomplete — gains a second shape. Recorded as a deliberate price rather than a discovery. H-5's ordering is what keeps the two forms from disagreeing about what resolves.
- **D-2:** [confirmed] The `[]()` markdown-link syntax **joins the rename cascade**. `rewrite.ts` and `scan.ts` gain a third pattern so a renamed page carries its markdown-link references with it, exactly as it carries `[[ ]]` and `![[ ]]`.
- **D-3:** [confirmed] The parens hold the **page title** — `[Foo](My Page)`. Human-legible, already the shape the cascade rewrites, and correct as a relative link outside Pommora. A PageID target was weighed and rejected: rename-proof, but it turns every link into an opaque string in a file meant to be readable.
- **D-5:** [confirmed] Page autocomplete **fires inside `( )`**, so an internal markdown link is authored by picking rather than by typing a title by hand. `autocompleteQuery` gains a third form beside `link` and `embed`.

- **D-6:** [confirmed] **A broken markdown link keeps the external-link convention** — dimmed display text, no pointer cursor, and the target still hidden at rest. This is not a new treatment: `.md-link-invalid` already states the rule in its own comment ("URL stays hidden at rest so it doesn't pollute the line"), so an unresolved *internal* target simply falls through to it rather than being special-cased. Nothing dumps raw syntax into the line.
- **D-7:** [confirmed] **The two forms share one grammar, not two.** `[text](target)` is a single token kind with a single parser; internal versus external is a *resolution branch*, never a second syntax or a second tokenizer. The separation to hold is therefore in the branch's cleanliness — one place decides which of three outcomes a target has, and the three appearances follow from it.
- **D-8:** [confirmed] **An internal markdown link wears the connection colour**, matching `[[ ]]` — the two forms mean the same thing, so appearance follows meaning rather than syntax. External-valid keeps `.md-link`, broken keeps `.md-link-invalid`. Three outcomes, two existing classes plus the connection colour; no new link styling is authored.

#### E — Markdown-Link Authoring

- **E-1:** [confirmed] Committing a markdown link lands the caret **inside the `[title]` slot**, not past the syntax — the opposite of the connection form, which exits because a connection's title *is* its target and isn't free text. This holds for **external links too**, so naming a link never requires re-entering it.
- **E-2:** [confirmed] The title slot arrives **pre-filled with the page's title and selected**, so a second Return keeps a correct label and typing replaces it. An empty slot was rejected: it demands a label on every link, and `[](Page)` produces no token at all, so an unfilled one renders as nothing.
- **E-3:** [confirmed] The creating gesture already exists — **⌘K** (`format:link` → `toggleLink`) wraps a selection as `[selection]()` and places the caret inside the empty parens. E-1 extends it: finishing the target returns the caret to the title slot rather than exiting.

#### F — Authoring Syntax

- **F-1:** [confirmed] There is **no default-syntax setting**. MarkdownPM resolves both forms, so which one a gesture writes is decided by the caret's own context — inside `[[ ]]` you get a wikilink, inside `( )` you get a markdown link. The syntax is always already declared by the gesture that opened it, leaving nothing for a preference to arbitrate.
- **F-2:** [confirmed] Alias-V1 therefore adds **one** personalization key (B-6's boolean), and `SettingsWindow`'s boolean-only row shape stands unchanged.

#### H — Don't-Forget Sweep

- **H-1:** [confirmed] **The path grammar is unambiguous.** `invalidBasename` rejects path separators in every title, so `/` can only ever mean a path. `[[Folder/Page]]` needs no escape, no discriminator, and no precedence rule against a title that merely looks like one.
- **H-2:** [confirmed] **`]` is refused inside an alias**, the way `|` is already refused in a title — the keystroke doesn't land rather than silently truncating the link the caret sits inside. Escaping was weighed and rejected: it would put backslashes into a file whose readability is the point.
- **H-3:** [confirmed] **Emptying an alias collapses the pipe** — `[[Title|]]` becomes `[[Title]]`, matching the nexus-wide law that an emptied value drops its key rather than persisting an empty container.
- **H-4:** [confirmed] **Existing bodies change appearance on upgrade.** Nathan's live vault already contains `[[Title|alias]]` forms that render today as a styled title plus a visible `|alias` tail. The day this ships they silently become their aliases. Correct, and wanted — but it is a retroactive change to existing documents, so it belongs in the record rather than arriving as a surprise.
- **H-5:** [confirmed — the ordering inverts] **Page resolution runs first, extension stripped; the external gate is the fallback.** `isValidLink` accepts any dotted host, so `Notes.md` (`.md` is Moldova's TLD), `image.png`, and `Node.js` all pass as URLs and open a browser — the `.md` strip sits on the page branch those targets never reach, and a page titled `Node.js` becomes unreachable through `[Foo](Node.js)`. The ordering must invert: try page resolution, extension stripped, *before* the external gate. This also makes D-4's "identical edge two ways" false today — the markdown form runs a gate the wikilink form doesn't, and `isValidLink` becomes a **second resolution authority** beside `normalizeTitle`/`buildPageIndex`, which is the arc's one live DRY violation. No live damage: of 947 markdown-link targets in NexusOS, the 28 non-URL ones all fail `isValidLink` today.
- **H-17:** [confirmed] **The parens use percent-encoding** — the published CommonMark/GitHub destination rules, and what Obsidian itself writes. A space becomes `%20`, so `[Foo](My%20Page.md)` is the on-disk form: encode on write, decode on read. This is what makes D-3's external-correctness claim actually true, where the bare-space form was rendered as literal text by both GitHub and Obsidian.
- **H-6:** [confirmed] **The cascade's blast radius multiplies, and H-16's gate is what contains it.** [[ConnectionsPM]] §Known Issues records that the cascade is per-file and not cross-file atomic; the new triggers would have given that failure three more doors on casual gestures. Gating them on a duplicated title keeps the common drag from cascading at all, and H-6b's journal covers rename, where a revert exists.
- **H-6a:** [confirmed] **The hardening pattern already ships.** `crud/contextJournal.ts` commits an old→new record before cascading, clears it after, and `replayPendingRename` forward-completes a crashed rename at startup before anything reads contexts (`main/index.ts`). Hardening the page cascade is therefore adoption of a proven in-repo mechanism, not the invention of atomicity.
- **H-6b:** [confirmed] **The cascade is hardened in this arc.** The page cascade adopts the Context journal's shape — record the old→new intent first, cascade, clear — so a crash forward-completes at next open instead of leaving links pointing at a name no page holds. Ruled in because the arc already rewrites this code, the mechanism is proven a few files away, and the new triggers are everyday gestures rather than the deliberate rename that carries the risk today.
- **H-7:** [confirmed] **A container move sweeps once, for the pages that need it.** H-16's gate is applied per member, and the members whose titles are duplicated are collected into a *single* sweep computing every affected path in one pass — never one full-vault rewrite per page, which is exactly the "never reload the entire Y" rule.
- **H-8:** [confirmed] **The alias memory lives in its own store slice, not the tree-keyed index.** It must load once rather than hitting the DB per keystroke — but it cannot ride `treeIndex`'s cache, which is keyed on the tree object and invalidated only by a fresh tree push. Alias writes and the × are out-of-band and push no tree, and the watcher suppresses the app's own writes, so a tree-keyed cache would keep serving a deleted alias until an unrelated structural mutation. Its own slice, updated on write, is what makes C-3's deletion actually visible.
- **H-9:** [confirmed] **Deleting a page does not clear its remembered aliases** — matching every sibling per-page scope, none of which prunes on delete, and keeping the restore path whole. The **×** in the picker is the only thing that forgets an alias, and it removes it from the saved options for good.
- **H-13:** [confirmed — fix applied to the spec] **Return inside the alias destroys it.** `autocompleteQuery`'s link-form span test covers the whole `[[…]]`, alias included, so with the caret in an alias the panel is open on the *title* and Return replaces the entire span with the bare `[[Title]]` — the exact sequence B-2 invites. The query must be bounded to the title span, and which panel owns the alias caret must be ruled.
- **H-14:** [confirmed] **One component, three purposes.** The title suggestions, the alias suggestions, and the `( )` target share `useConnectionAutocomplete`'s single state machine as modes of one panel — never rival surfaces contending for the same caret.
- **H-15:** [confirmed, defaulted] **The connection menu doesn't pop on an ambiguous link**, and its seam carries a page rather than a span. `resolvedPageAt` returns null unless the status is `resolved`, so right-clicking a duplicate-title link — the exact gesture path qualification exists to serve — pops the general editor menu instead. The seam also needs host editability: `PreviewWindow` starts read-only and silently drops doc changes, so Rename there would place a caret and swallow every keystroke.
- **H-16:** [confirmed] **A move cascades only when the path is load-bearing, gated by one lookup.** Since a path matters solely under ambiguity, a move asks a single question first: *is this page's title held by more than one page?* Unique — the overwhelming case — and no body is read at all, so a drag costs one map lookup. Duplicated, and the sweep runs and rewrites the links that resolved to this page by path, to the shortest path that still identifies it. Moves don't change titles, so ambiguity can't shift underneath the gate.
- **H-16a:** [confirmed] **`movePage`/`moveSet` still have no revert**, so their sweep stays best-effort as it is today — the journal covers rename, where a revert exists. Under H-16's gate the exposure is small: a failed sweep can only affect links to a duplicated title, which degrade to the ambiguous state they'd hold without a path anyway.
- **H-16b:** [assumed] **An advisory path can go stale in the file.** A link written `[[Work/Q3/Notes]]` to a uniquely-titled page keeps resolving after that page moves, but now names a folder the page has left — cosmetically wrong on disk, and mildly misleading to an agent reading the file. Correcting it would mean sweeping every move, reintroducing exactly the cost H-16 removes. Accepted as-is.
- **H-10:** [confirmed] **The remove-× inherits the chip's hover contract.** A control revealed on hover must survive the click that uses it, and the picker's primary action is *insert* — so a stray click must never delete. The Cards work already solved exactly this: a chip's remove-× stays inert until hover-revealed. This mirrors it rather than re-deriving it.
- **H-11:** [confirmed] **Return commits and moves in one press** — picking a page inside `( )` inserts it *and* carries the caret to the title slot. A second press was rejected as a worse version of the gesture E-1 asks for.
- **H-12:** [confirmed] **Escape exits without reverting** — the alias stays as typed and ⌘Z is what undoes it, matching the editor's ordinary text behavior. Clicking out commits, for both gestures.

#### I — Reconciliation Forecast

Documentation these decisions make false, to be trued as part of the arc:

- **I-1:** [confirmed] [[ConnectionsPM]] — §Syntax + Scope ("the piped tail renders as plain text beside the styled title") becomes false; §Rendering's "right-click pops a native menu whose one action is **Open Preview**" becomes false; §The Rename Cascade's two-pattern sweep becomes false; §Resolution's ambiguous state gains the path escape; §Prospects loses both **Aliases** and **Duplicate disambiguation**.
- **I-2:** [confirmed] [[ContextPM]] — §Immediate Work's display-alias line resolves; §Next-Feature Candidates' **Page aliases** entry is retired outright, not completed; §Known Issues' caret-placement line resolves with B-5.
- **I-3:** [confirmed] [[MarkdownPM]] — the autocomplete's form list, the ⌘K link gesture's caret behavior, and the connection menu's actions all change.
- **I-4:** [confirmed] [[ConfigurationPM]] — gains the "Remove Title on Link Change" personalization key.
- **I-5:** [confirmed] [[ArchitecturePM]] — nexus.db gains a per-page scope, described as the first per-page record rather than an alias-specific store.
- **I-6:** [assumed] `shared/connections.ts`'s own header comment states "Nothing authors or renders an alias yet" and `rewrite.ts`'s states an alias "rides through" — both become false and are lint by the project's own comment rule.

### Core (must-have)

- `[[Title|Alias]]` renders as its alias, resolving on title, with the marker set hidden until the caret enters.
- **Rename** and **Edit Link** on the connection menu, each placing the caret exactly where its name implies — which requires the caret-placement bug (B-5) fixed first.
- Edit Link strips the alias from the new link and keeps it in the page's remembered list, governed by the Pages-section toggle.
- Per-page alias memory in nexus.db, written on authoring, offered as autocomplete, forgettable by a hover-revealed ×.
- `[Title](Page)` resolving internally alongside `[[ ]]`, joining the rename cascade, with page autocomplete inside `( )` and the caret returning to the title slot.
- Path qualification — `[[Folder/Page|Alias]]` — with path-keyed resolution and the move / folder-rename cascade that keeps it true.

#### Prospects (allowed later, not now)

- **The alias-as-tiebreaker resolution** — using a page's remembered aliases to narrow an ambiguous title, as a pure narrowing that abstains unless exactly one candidate claims the alias. Elegant and free of new syntax, but it makes resolution device-dependent: the same body reads as a working link where the memory exists and a muted ambiguous one where it doesn't. Path qualification answers the same gap deterministically and on-page, and two mechanisms resolving one ambiguity would be a second writer.
- **A dedicated alias-management pane** — a surface for reviewing and curating a page's remembered aliases wholesale, rather than forgetting them one at a time through the picker's ×. Deferred to V2; the picker's × is the only forget gesture this arc ships. Don't-foreclose: the memory is per-page and PageID-keyed, so a pane reads the same scope without a storage change.
- **Heading and block anchors** — `#` and `#^` targets. Already a [[ConnectionsPM]] Prospect; H-5's discriminator sends them to unresolved rather than claiming them.
- **A reverse link index** — what would let a move know which bodies name it, and the thing every "which links point here" question waits on. It arrives with the content index, not here.

#### Out of Scope (won't do — distinct from Prospects)

- **Frontmatter `Aliases:` as resolution keys** — the parked feature; it needs nexus-wide frontmatter the walk doesn't carry. Alias-V1 is display-only unless C-4 rules otherwise.

#### Considered & Rejected

- **A "Default Internal Link" syntax preference** — a per-nexus double-chevron toggle choosing whether page links author as `[[Page|Title]]` or `[Title](Page)`. Dropped once dual resolution settled the question underneath it: with both forms resolving, the caret's context already names the syntax, so the setting arbitrates nothing. It would also have been Pommora's first non-boolean personalization key, bringing a new settings row shape for no behavior.
- **A derived alias index** — scanning bodies for `[[Title|Alias]]` to build the memory. Rejected against write-on-authoring: a derived list cannot honor a real remove-× (the next scan resurrects it) and would need a nexus-wide body scan that doesn't exist.
- **Per-page settings** for the strip-on-change preference — no such surface exists, and one boolean doesn't justify building it.
- **PageIDs in markdown-link parens** — rename-proof without a cascade, rejected because it makes an unreadable target in a file whose readability is the point.

#### Lessons

- Pending.
