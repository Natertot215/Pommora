## Heading Links — Decision Log

### Frame

- **Purpose:** Connections that reach a heading inside a Page — `[[Page#Heading]]`, `[[#Heading]]` for the page's own headings, with an alias as today — typed with `#` or `§`, completed from the target page's heading structure, opened by scrolling to the heading, and kept true when a linked heading is renamed.
- **Core Value:** A link lands on a section, not just a page, and stays readable by any Markdown tool.
- **Success Criteria:** Typing `[[Page#` lists that page's headings; the committed link renders per the display setting; a click opens the page scrolled to the heading with folds opened; a page rename still cascades through heading links; a linked heading's rename rewrites its inbound links and nothing else; `![[Page#Heading]]` stays inert.

### Sources

- [[ConnectionsPM]] — the connection grammar, the three resolution states, the rename cascade, the link menu, the autocomplete; lists heading anchors as a Prospect (§Prospects).
- [[MarkdownPM]] — heading grip rows (Rename · Size ▸ · Delete); embeds leave `#heading`, `^block`, and `|alias` sub-targets as an inert token (§Embeds); the fold layer publishes a reveal seam; a heading inside a callout has no chevron (§Pending).
- [[ConfigurationPM]] — Files & Links › Connections holds the existing connection settings; Pages & Writing holds editor settings.
- [[PagesPM]] §Outline — the outline menu scrolls to a heading through `travelPageTo` and renames one in place.
- `Core/Connections/connections.ts` — `pageLinkPattern` admits `#` in a title; `titleOf` strips a table cell's trailing backslash; `embeddableTitle`.
- `Core/Connections/scan.ts`, `rewrite.ts`, `pageIndex.ts` — mention extraction, the three-pattern rewrite, title resolution.
- `Core/Nexus/cascade.ts` — `renameCascade` reads `queryMentions(oldKey)` then rewrites each file.
- `Desktop/Store/ddl.ts` — `mentions(path, title)` behind `CREATE TABLE IF NOT EXISTS` and `INDEX_GENERATION`; `local_state(scope, key, value)` carries `folds`, `aliases`, `tabs` scopes.
- `Core/Contract/bridge.ts` — `folds:get` / `folds:set`; `page:open` returns the body; `pages:changed` is the index's push.
- `Core/Connections/links.ts` — `targetTitle` decodes the raw target before returning it.
- `Core/Assets/adoptFile.ts`, `Core/Actions/pasteAsMenu.ts`, `Core/MarkdownPM/Engine/embedRanges.ts` — the three callers of `embeddableTitle`.
- `Core/Properties/governedSweep.ts` — the cascade's file writes, outside any editor's undo.
- `Core/MarkdownPM/Engine/headingScan.ts` — `headingOutline` gives `{from, level, text, key}`; duplicate texts key as `Text`, `Text 2`; folds persist against the same key.
- `Core/MarkdownPM/docCache.ts` — the per-document-version derivations; `headingOutline` has no cache today.
- `Core/MarkdownPM/Menus/blockQuery.ts` — the `/` trigger is line shape at the caret, not a keystroke.
- `Core/MarkdownPM/travel.ts`, `Core/Pages/pageEditor.ts` — `travelTo(view, pos)` opens folds and scrolls the mounted page; no open-then-travel path exists.
- `Core/MarkdownPM/Links/connectionsApi.ts` — `openPage(api, page, bypass)` takes no position.
- `Core/Session/navigationSlice.ts` — a page already ready at its path only re-selects; nothing re-mounts.
- `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts` — an exact single match closes the pane; `candidatesFor` is synchronous.
- `Core/MarkdownPM/Links/connectionClicks.ts`, `linkClicks.ts`, `Tables/cellStatic.tsx`, `markdown-pm.css` — the status class selectors spelled by hand.
- `Core/MarkdownPM/api.ts` — `GlanceTarget` carries no position.
- `Core/MarkdownPM/decorations.ts` (wikiLink block), `Engine/tokens.ts` `wikiLinkTokens`, `markdown-pm.css` `.md-connection-*` — the alias/target rendering.
- `Core/MarkdownPM/Autocomplete/autocomplete.ts` — `autocompleteQuery` forms: link · alias · embed · target.
- `Core/Actions/gripMenu.ts`, `Core/MarkdownPM/Menus/gripMenu.ts` — heading menu model and handler; Rename only selects the text.
- `Core/Actions/pageMenu.ts`, `Core/Pages/PageMenu.tsx` — `title:copylink` writes `pageLinkText(title)` to the clipboard.
- `Core/Paths/names.ts` — `nameError` rejects `|` and not `#`; enforced at creation and rename only (`Core/Nexus/page.ts`), never on the walk.
- `Core/Settings/frames.ts` — `toggle` and `picker` row kinds; the `pages` frame; `connectionsOpenInPreview`.
- `Core/MarkdownPM/Input/edits.ts` — the Dashes/Arrows typing transforms.
- Outward: GitHub slugs (github-slugger); Obsidian `[[Page#Heading]]` grammar and its forbidden `# ^ [ ] |`; Obsidian community heading-rename plugins detect the heading-line edit rather than diffing.

### Decisions

#### A — Grammar

- **A-1:** [confirmed] `pageLinkPattern` admits `#`, so `[[Page#Heading]]` today parses as one title, is indexed under the key `page#heading`, and a rename of `Page` doesn't reach it. The grammar splits page from fragment once, in `connections.ts`, and scan, rewrite, resolve, tokens, `linkAt`, `embeddableTitle`, `linkValue`, and the embed pattern inherit the split. The embed pattern splits for the index and the cascade so `![[Page#Heading]]` follows a page rename; its tile stays inert (F-2).
- **A-2:** [confirmed] The fragment is the literal heading text after `#`, Obsidian's form; no GitHub slug is generated. `[Alias](Page#Heading)` and `[Alias](#Heading)` carry the same fragment through the markdown-link grammar in `links.ts`, a bare `#` target naming the current page and drawn and followed as `[[#Heading]]` is; the split reads the raw target before it's decoded, so an encoded `%23` inside a title stays a title.
- **A-3:** [confirmed] `#` and `§` leave the name alphabet in `nameError` the way `|` did, ungated by role, so one rule covers pages and directories alike. The rule holds at creation and rename only, at every site `nameError` serves, so a Context group or Space can't be named with `#` either; nothing links to those by syntax, and NexusOS holds none. A title admitted from disk with `#` keeps its page, and every `[[Old #Title]]` link to it re-parses as a page and a fragment, goes phantom, and drops out of that page's rename cascade. NexusOS holds no such title today and no heading-form link outside documentation samples.
- **A-4:** [confirmed] `[[#Heading]]` names a heading on the page it sits in; the page half is absent in the file. A markdown tile's body has no page, so a bare fragment there resolves to nothing and indexes nothing.
- **A-5:** [confirmed] Same-page duplicates resolve to the heading nearest the link's own position. Cross-page duplicates resolve to the heading nearest the target page's warm scroll position when that page is warm, else the first top-to-bottom. Both are read target-side, after the page mounts, by the travel; the link's own rendering never needs another page's headings.
- **A-6:** [assumed] The fragment is the plain heading text, never the outline's ordinal key (`Text 2`); duplicates are a resolution rule (A-5), not a spelling, so a duplicate heading lists once in the pane. A fragment normalizes as a title does, through `normalizeTitle`, and matches the marker-stripped text the outline shows.
- **A-7:** [assumed] A heading whose text holds `]]`, `|`, or `#` can't be expressed and is omitted from the heading pane and offered no Copy Link, the way the embed picker omits inexpressible titles.
- **A-8:** [assumed] The fragment is everything after the first `#`. An Obsidian nested path (`#H1#H2`) or block anchor (`#^id`) read from disk matches no heading and lands in the fourth status (E-3); the file is left as written.
- **A-9:** [assumed] Inside a table cell, `[[Page#Heading\|alias]]` carries the cell's pipe-escape on the fragment; `titleOf`'s trailing-backslash strip applies to whichever half precedes the pipe.
- **A-10:** [assumed] A Link property value holding a fragment reads as its page half; property values never carry or write a fragment, and a page rename re-emits the value without one.
- **A-12:** [confirmed] An empty fragment (`[[Page#]]`, `[[#]]`, the state the pane opens in) is no fragment: `[[Page#]]` resolves, renders, and indexes as a page link, `[[#]]` parses, renders, and indexes as nothing, and no empty key is ever written to the index; an empty heading slot drops its `#` when the caret leaves it, as an empty alias drops its pipe.
- **A-13:** [assumed] `extractMentions` learns the containing page's title and outline so a bare fragment `[[#H]]` and a bare `§Heading` index under `(ownTitle, heading)`; the seed passes them, `mentionsTitle`'s two callers (the cascade and the tile rewriter) pass none, and the scanner's `[[` / `](` early-out widens to `§`.
- **A-14:** [confirmed] The markdown-link form is typed literally: no `§` rewrite and no heading pane inside `( )`; `[Alias](Page#Heading)` reads and cascades the same.
- **A-11:** [confirmed] `embeddableTitle` gates asset adoption, the embed picker, and Paste As, and stays one predicate: a `#` title is inexpressible in every wikilink, so an asset named `Chart #3.png` is refused at adoption with the existing "can't be written as a link" fault.

#### B — Rename Cascade

- **B-1:** [confirmed] The index answers, per page, which of its headings carry inbound links; a rename of a listed heading rewrites its inbound links across the files the index names, and an unlisted heading edits at no cost. Two tables join `mentions`, which is untouched: `heading_mentions(path, title, heading)` for the links and `headings(path, heading, ordinal)` for each page's own keys in outline order, and `INDEX_GENERATION` steps so an existing database recreates and re-seeds them. A heading consult runs only against a ready index and no-ops otherwise; it never takes the page cascade's full-corpus fallback. The governed sweep already re-indexes every file it writes, so an immediate undo's consult finds the new key.
- **B-2:** [confirmed] A rename is recognized on a settled heading-line text change in the editor, whichever way it arrives: typing, the outline's rename, the grip's Rename, or undo. It's also recognized where the index re-scans a landed file, which is the one path a sync landing, an Obsidian edit, and a saved editor merge all arrive on. The editor's own save reaches that re-scan too; by then the inbound files are already rewritten, so the diff sees nothing and the second pass is a no-op. The live detector stands down on a `syncLanding` transaction; the landed file's re-scan owns that rename.
- **B-8:** [assumed] What "settled" means for the live detector is the plan's, under these bounds: one consult per rename, after the heading line's text has been stable and the caret has left it or the editor has blurred; a heading typed fresh from an empty line and a heading deleted are not renames.
- **B-9:** [confirmed] A rename whose old text survives on the same page (one of two `## Notes` renamed) can't be told apart by a text key across pages, so the cross-page cascade does nothing and those links keep resolving to the surviving heading by A-5's rule. Same-page links know their position, so the ones whose nearest heading was the renamed one rewrite with it; how the filter treats a rename that momentarily equals another heading's text mid-word is the plan's.
- **B-3:** [assumed] The consult lives in main: the editor sends one `(page, oldHeading, newHeading)` per settled rename, and `renameCascade` answers with the index and rewrites or does nothing, so the live path and the external path are one function keyed `(title, heading)` rather than a bare title. No linked set crosses into the renderer and nothing runs per caret move.
- **B-4:** [assumed] External recognition is best-effort: it diffs the file's heading keys as the index last recorded them (E-6's `headings` table) against its new headings, joined to which of the old keys carry inbound links, and anything it can't call a rename falls to the fourth status. The exact rule is the plan's, where it can be tested.
- **B-5:** [confirmed] Same-page links (`[[#Heading]]`, the page's own `[[Page#Heading]]`, and a bare `§Heading` under I-1) rewrite inside the editor transaction that edits the heading line, appended by a transaction filter that has the document in hand, so each keystroke of the rename and its links are one undo step and no settle is waited for. Only cross-page rewrites wait for B-8's settle. The filter inherits B-8's two exclusions: a heading typed fresh from an empty line and a heading deleted rewrite nothing. Cross-page rewrites go through main and sit outside the editor's undo; undoing or redoing the rename in the editor is read as a rename by the settle listener, since CodeMirror's history bypasses transaction filters, and re-fires the consult, which rewrites the other files back. That matches the page-rename cascade today and is a stated limit, not symmetry.
- **B-6:** [assumed] A page rename keeps every fragment as written: `rewriteConnections` rewrites the title half and re-emits the fragment.
- **B-7:** [assumed] The fold rekey is a pre-existing defect riding along: fold keys are the same heading text keys, so every heading rename orphans its saved fold today. The rekey rides B-8's settle, never B-5's per-keystroke filter, and rewrites the page's `folds` scope entry with every key the rename shifted (a duplicate's ordinal moves too); it's declared here so the plan treats it as its own item.

#### C — Display

- **C-1:** [confirmed] **Heading Link Style**, a picker: Page & Heading · Heading Only. Page & Heading renders `Page § Heading`, the `§` itself the separator; Heading Only renders `§Heading`. The `§` is never hidden: it is the bare token's only marker (I-1) and the heading link's join.
- **C-2:** [confirmed] A same-page link (`[[#Heading]]`) renders the heading alone under either style.
- **C-3:** [confirmed] An alias overrides both halves and renders as an alias does today; revealed, the target half shows `Page#Heading` marked as a target.
- **C-4:** [confirmed] `§` typed in a wikilink's title half rewrites to `#` on the keystroke, so the file only ever holds `#`; in an alias, an embed, or a heading it stays the character. It lives with the connection input in `Links/`, since every transform in `Input/edits.ts` stands down inside a wikilink and this one fires only there.
- **C-5:** [confirmed] The setting sits in Pages & Writing › Links beside **Display Unresolved Links As Plain Syntax**, the existing link display setting.
- **C-6:** [confirmed] The `§`'s spacing and vertical shift are two stylesheet knobs on `.mdpm-shell` (`--heading-join-gap`, `--heading-symbol-shift`), set at the first stop.

#### D — Autocomplete

- **D-1:** [confirmed] Typing `#` or `§` after a resolvable title inside `[[ ]]` opens the pane on that page's heading structure, nested by level; `[[#` and `[[§` open it on the current page's own headings. A `#` typed inside `![[ ]]` opens nothing.
- **D-2:** [assumed] The target page's outline is built once per pane opening, from the warm editor's document when the target page has one and otherwise from the body `page:open` returns, so a heading typed moments ago is offered; filtered in memory and keyed to the opening, never to the page. The rows arrive asynchronously, so the heading form's rows are pane state rather than the synchronous `candidatesFor` memo's return, and the pane stays open while they load.
- **D-3:** [confirmed] A page row carries a hover-revealed trailing chevron; choosing it, or pressing → on the highlighted row, commits `[[Title#` and the pane slides on the shared `FrameSlide` to that page's headings under a `MenuTopRow` reading `‹ Links · Page Title`, the property picker's pick-then-assign flow. Back, or ← on a heading row, deletes the `#` and the query and slides the page list back, held open on the title it returned to, so → slides forward again. Return or a click commits `[[Title#Heading]]`, and the alias slide follows when that setting is on. A title typed out exactly closes the page list, a heading typed out exactly closes the heading list, and a caret placed inside a finished link opens nothing; from a closed title `#` is the entry.
- **D-4:** [assumed] A `#` typed by hand, and `[[#`, open the heading list bare, with no top row, since there is nothing beneath to go back to. Backspace over the `#` returns to the title span and closes the list.
- **D-5:** [confirmed] The heading list renders as the outline menu does: `DisclosureRow`s in the emphasized item style, nested by `outlineTree`, each collapsing and reopening by its chevron, without drag or rename; the collapse state is the opening's own. An empty query shows the tree; a typed query filters by prefix on the heading text and shows matches flat. A page with no headings, or a filter with no match, closes the pane as an empty page list does today.

#### E — Following

- **E-1:** [confirmed] A click opens the page as a connection click does today, routed by **Open Connections In Preview**, then travels to the heading through `travelTo`, which opens the folds hiding it. The heading target is session state keyed by the route the open took and the page path, not a mount-time argument: the editor surface on that route, the main tab's `PageView` or the Page Window's `PageTile`, watches it and consumes it once, so a page already open travels too, and the singleton `registerPageEditor` isn't widened. A heading inside a callout has no fold chevron today ([[MarkdownPM]] §Pending), so travel there scrolls without a fold to open.
- **E-2:** [confirmed] Resting on a heading link opens the glance pane scrolled to the heading; `GlanceTarget` carries the heading and the pane's own guest editor travels on mount.
- **E-3:** [confirmed] A page that resolves whose heading doesn't is a fourth status, drawn live for same-page and cross-page links alike: connection color on the page half, muted heading half, a click opens the page without traveling. `LinkStatus` stays three-valued and `PageIndex.resolve` keeps answering for pages; the missing heading is a state of the fragment span, computed where the link is drawn. The status joins the three the emitting and consuming selectors spell out (`decorations.ts` block and glyph, `connectionClicks.ts`, `linkClicks.ts`, `Tables/cellStatic.tsx`, `markdown-pm.css`), each updated.
- **E-6:** [assumed] The renderer learns other pages' headings from the index that already hydrates the view: the seed's body scan extracts each page's heading keys beside its mentions into a `headings(path, heading, ordinal)` table, the page index the renderer resolves against gains a heading lookup by page id, and the same push that carries `pages:changed` carries the changed pages' heading keys, so the decoration pass reads a synchronous in-memory map and nothing is fetched per paint. A page absent from the map, as every page is until the seed finishes, reads as unknown and renders resolved; only a present page missing the heading is the fourth status. The body's decoration pass reads a same-page fragment against `docOutline`, a per-document-version derivation added beside the scan in `docCache.ts`, never a fresh `headingOutline` per link; a table cell holds only its own text and no page identity, so it resolves a cross-page fragment through the index lookup and renders a same-page fragment as resolved. **Display Unresolved Links As Plain Syntax** speaks to phantoms only and leaves this status alone. Every rename the detectors can't call lands here rather than being guessed.
- **E-4:** [assumed] The link menu on a heading link is the connection menu as it stands; Copy Link copies the fragment form, Edit Link edits the whole target.

#### F — Heading Menu

- **F-1:** [confirmed] The heading grip menu gains **Copy Link**, writing `[[Page#Heading]]` with the page's current title and no alias, the way `title:copylink` writes `pageLinkText`; it is offered only on a surface with a page title and for a heading the link grammar can express. A lone heading link in a citation's body makes its marker travel to the heading.
- **F-2:** [confirmed] `![[Page#Heading]]` renders as the inert token it is today; the embed path keeps answering in the three page statuses.

#### I — In-Page Heading Resolution

- **I-1:** [confirmed] **In-Page Heading Resolution**, a picker: Explicit · Automatic. Explicit is today's rule: only link syntax resolves. Automatic makes a bare `§Heading` in prose resolve to a heading on the same page without link syntax, drawn and followed as a same-page heading link. The bare token is Pommora's own reading of prose, weighed against the Legibility lock and kept: it costs nothing in another tool, where it stays prose, and the user guide states it. Bare tokens are page prose only, never table cells. `§` has no key on a stock Windows layout, so Automatic is authored there through the character's input code; a stated limit.
- **I-2:** [confirmed] Under Automatic, a `§` typed in prose outside link syntax opens the current page's heading list on the keystroke: the trigger is a user input transaction whose inserted text is exactly `§` at the caret, and the pane closes when the selection leaves the run, so existing `§` text, a backspace into one, or a sync landing never opens it. It opens on every typed `§`, a legal citation's included, which is the cost of the trigger and one reason Explicit is the default. Picking writes the bare `§Heading` text.
- **I-3:** [confirmed] A bare `§` run resolves by longest match: the text after `§` is compared against `docOutline`, normalized as a fragment is (A-6), and the longest heading it begins with is the target, provided the match ends at the run's end or at a non-word character so `§Overviewing` never links `Overview`; no match leaves plain prose, never a status. Code spans and fences are exempt, as connections are. A bare run is not a token: `tokenize` and its ten line- and cell-scoped callers stay untouched, and the run is resolved at the two sites that hold the whole document, the decoration build and the click handler. A bare run opens and travels; it carries no link menu and no glance, since both find their subject by token.
- **I-4:** [assumed] A bare `§Heading` is a same-page link to the cascade: it rewrites inside the editor transaction with the rename (B-5) only when its own longest match against the pre-edit outline is the renamed heading, so `§Notes` survives a rename of `Note`. The index records bare mentions regardless of the setting, since it holds the body and its outline, and the consumers, the cascade and the decoration pass, read the setting; flipping it is correct at once with no re-seed.
- **I-5:** [confirmed] Explicit is the default. Under Explicit, `§` typed outside `[[ ]]` is the character, and a bare `§Heading` written under Automatic reads as prose. The bare token is Pommora's alone: in Obsidian it is prose, which the user guide states, and it stays bare rather than being rewritten to link syntax.
- **I-6:** [confirmed] The setting sits with Heading Link Style under Pages & Writing › Links.

#### G — Documentation & Reconciliation

- **G-1:** [confirmed] [[ConnectionsPM]] rewrites §Syntax + Scope (the fragment), §Resolution (the fourth state), §The Rename Cascade (heading renames), §Rendering (the display setting), §The Link Menu, and §Autocomplete (the heading pane and the chevron flow); the heading-anchor Prospect line moves to the block-anchor remainder.
- **G-2:** [confirmed] [[MarkdownPM]]'s heading grip row list gains Copy Link, and its inline constructs gain the bare `§Heading` under Automatic; the embed sentence about inert sub-targets stays true. `Editor-Internals.md`'s line on the one fence-aware heading scan names `docOutline` beside the fold and the outline.
- **G-3:** [confirmed] [[ConfigurationPM]]'s Pages & Writing table gains Heading Link Style and In-Page Heading Resolution beside Display Unresolved Links As Plain Syntax.
- **G-4:** [confirmed] `.claude/CLAUDE.md`'s Connections line reads "connecting to another Page or a heading within one".

#### H — Process

- **H-1:** [confirmed] The implementation plan leaves the settings' hint copy blank for Nathan to describe in flight.
- **H-2:** [confirmed] Nathan is available for live interaction testing when a phase needs it; the plan names those points rather than driving CDP for what he can see.

### Core (must-have)

- The grammar split in `connections.ts` and `links.ts`, inherited by scan, rewrite, resolve, tokens, `linkAt`, `embeddableTitle`, `linkValue`, and the embed pattern; `#` and `§` leave the page name rule.
- The fourth resolution status, live for same-page and cross-page links, its rendering across the four selector sites, and the index's heading table with its push; the setting and the `Page § Heading` / `§Heading` display; same-page and alias display rules; `§` → `#` on the keystroke.
- The heading pane: typed `#`/`§`, `[[#`, and the chevron slide with its top row; outline-styled rows; flat filtering.
- Following: open-with-heading-target and travel with folds opened; the glance pane on the same target.
- Copy Link on the heading grip.
- The cascade: the heading in the `mentions` key with a generation step, the settled-change detector, the main-side consult serving live and external renames, same-page rewrites in the editor transaction, page renames preserving fragments; the fold rekey as its own item.
- In-Page Heading Resolution per I, as the last phase, since it stands on the same-page link path.
- Documentation per G.

#### Prospects (allowed later, not now)

- Nested heading paths `[[Page#H1#H2]]` — Obsidian reads them; needs a path resolver in the pane and the resolver; don't-foreclose: the fragment is one string today, split later.
- Block anchors `[[Page#^id]]` — needs block ids written into files; don't-foreclose: the heading key can hold a `^id` without schema change.
- Heading backlinks and a "linked from N pages" hint on the heading grip — the linked set makes both wiring; the backlinks arc owns the surface.

#### Out of Scope (won't do — distinct from Prospects)

- GitHub slug fragments (`#my-heading`) — lossy, one-way, unrewritable by the cascade, unreadable in Obsidian, and GitHub won't resolve a wikilink regardless.
- Fragments on page embeds `![[Page#Heading]]` as a section embed — a different construct; the token only follows page renames.

#### Considered & Rejected

- Block ids (`^id`) as the heading link's identity — sidesteps the cascade by writing ids into every linked heading line; foreign to a heading, and the file stops reading as prose.
- Ordinal fragments (`[[Page#Text 2]]`) for duplicates — Obsidian reads it as a heading named "Text 2"; resolution by position keeps the spelling portable.
- Cascade only from an explicit Rename action — the grip's Rename is a text selection and the outline's is a text edit, so a typed rename would silently strand links; the settled-change detector covers every way a heading line changes.
- A linked-heading set held in the renderer — the renderer resolves against the tree index and has no index channel; a set there is a new channel and a subscription, where one consult per settled rename in main is neither.
- Diffing every heading on every edit — the linked set is the whole point; unlinked headings cost nothing.
- Headings nested inline under the page row in the pane — one query filtering two kinds in a 180–320px pane; the slide is the pane's submenu.

#### Lessons

- A delimiter must leave the alphabet the day it's introduced: `#` was admitted by the title grammar and the name rule, so the first heading link would have parsed as a page title. Check both the pattern and the name rule whenever a syntax character is added.
