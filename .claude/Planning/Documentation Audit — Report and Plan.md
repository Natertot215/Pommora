## Documentation Audit — Report and Plan

A grounding document for reworking the PRD and the Features docs. It records the problem as diagnosed, the rulings that resolve most of it, the per-doc verdicts, and the verified findings those verdicts rest on, so the rewrite can run as an unambiguous process across sessions. Nothing here edits a doc; it decides how each doc looks afterward.

**Scope:** `PommoraPRD.md` and every doc in `// Features`. Adjacent and noted where they overlap: the project `CLAUDE.md`, `FrameworkPM.md`. Out: `// Mobile`, `// Guidelines`, `HistoryPM.md`, `ContextPM.md`, `HandoffPM.md`.

### The Problem

The corpus is 26 docs, ~53,700 words, ~3,800 lines. It reads as an implementation log written in the voice of the agent that shipped each piece rather than as documentation of a product. The recurring shapes:

- **Argument in place of description.** "Never X", "rather than Y", "so that Z can't happen" — prose that defends a decision instead of stating behavior. Rough counts across the Features docs: 165 `never`, 150 `rather than`, 170 `so that…` constructions. The reader is being convinced, not informed.
- **Enumeration at menu-item depth.** Right-click menus listed item by item, in order, with the gating for each item, in three or four docs for the same menu (the link menu appears in MarkdownPM, ConnectionsPM, PropertiesPM, TableViewPM, CardViewPM, PagePreviewPM, SidebarPM).
- **Implementation internals presented as feature behavior.** Lock ordering, journal replay, index fallback paths, per-file confirmation reads, structural-sharing passes, `ResizeObserver`s, `@property` registrations. This is code-level detail that belongs in the code or in `ArchitecturePM` once, not in every doc whose feature touches it.
- **Token ledgers that mirror CSS files.** Full `--var · value · scope` tables in DesignSystemPM (roughly 60% of its 395 lines), MarkdownPM §Design System (~75 lines), TableViewPM §The Table Sheet, CardViewPM §Card Tokens, InteractionPM (four tables), SymbolsPM §Sizes. Every one is a copy of a source file that will drift the next time the file changes.
- **Exclusivity framing.** "The only relation-type connection", "four doors", "three states", "exactly one", "two hosts", "the sole connection syntax" — the writing keeps closing sets that the codebase either already exceeds or is designed to extend.
- **Session residue.** `Pending`, `Known Issues`, and `Prospects` sections carry 11–19 lines per doc — a third of some docs — and read as a handoff's open-items list. Several describe what an agent decided to defer rather than what a user or agent needs to know.
- **Footnote-as-prose.** The clearest example is MarkdownPM §Footnotes: one 20-line paragraph describing every edge of the citation mechanism, including which transaction reorders the section and what a whitespace-only edit does. Nathan's own framing of the target: cut by roughly 3× by dropping the notes-to-self.
- **Docs that exist because a feature was a session.** PageSetsPM (37 lines), AgendaPM (38, "no on-disk format, no CRUD, no read surface"), QuickCapturePM (34, "unbuilt — a design"), SubfieldPM (41). Each is a section of something else wearing a filename.

The target: docs that tell a user or an agent *what* a feature is and *how* it behaves, with *why* only where it is non-obvious and not inferable from the code. Official-documentation voice — GitHub-and-company-docs register, not agent-to-agent.

### Global Rulings

Ruled by Nathan on 08-25-2026. Anything marked *open* is still his call.

#### I. Token Tables

**Ruled: they stay, exact.** DesignSystemPM's Token Atlas and the token-specific tables elsewhere are deliberately exhaustive — rarely updated and held to strict truth. The rewrite corrects the five stale rows the audit found (three in MarkdownPM §Design System, two in TableViewPM §The Table Sheet) and adds nothing.

#### II. Pending, Known Issues, and Prospects

**Ruled: Prospects and Known Issues stay per doc.** FrameworkPM needs its own pass and isn't the destination for anything in this arc. *Pending* is trimmed to genuine incomplete features (one line each); deferred-decision notes go. *Open:* whether Pending stays as a heading at all or folds into Known Issues.

#### III. PRD Altitude

**Ruled: the PRD stays large.** It is the one-doc overview of the *product* — the durable-truth home for everything product-level, intentionally broad. This arc only makes sure it is that home rather than a second copy of codebase mechanics: mechanism paragraphs (sidecar-kind rules, Unknown handling, atomic writes, seeding order) point at ArchitecturePM; product decisions stay. **Locked Decisions move to the bottom of the PRD**; Core Constraints stay as their two bullets. The v1 Scope section gets its own pass later and is out of scope here beyond fixing the Settings contradiction. FrameworkPM is out of scope.

#### IV. Shared-Mechanic Ownership

**Ruled as recommended:** one owner per mechanic; every other doc gets a pointer or a short blurb with a footnote. Footnotes are the cross-reference instrument.

#### V. Enumeration Depth

**Ruled:** enumeration is fine when it is purposeful and visibly exact — an index, a table, a catalog. A *sentence* enumerating rows is what goes, unless the enumeration is necessary. The two shared menus (`pageMenu`, `connMenu`) qualify as tables, once, in their owners.

#### VI. Untrue and Stale Statements

**Ruled:** removal preferred; where the fact has *changed*, changing the statement is fine.

#### VII. Argumentative Prose

**Ruled as recommended.**

#### VIII. Doc Roles

- **ArchitecturePM** — the map plus an overview of how each subsystem works in the codebase. Its Renderer subsections stay as overviews, condensed; it owns the cross-cutting rules no feature owns.
- **PropertiesPM** — what properties are, then per-property specifics, with a Shared Mechanisms heading where a mechanic spans types.
- **ViewTypesPM** — replaces ViewsPM + TableViewPM + CardViewPM: what views are, then a section per view type. Longer doc, fewer docs.
- **InterfacePM** — a new doc for the shell's surfaces: the preview window and its flavors, sidebar, subfield, inspector, and their kin. Absorbs PagePreviewPM, SidebarPM, SubfieldPM. *Open:* its boundary with NavigationPM (see Remaining Questions).
- **Embeds stay in SurfacePM.** No EmbedsPM; SurfacePM owns the embed framework as the shared source, MarkdownPM points at it — the two run one embedding system under different constraints.
- **QuickCapturePM** retires to a FrameworkPM prospect line.

### Shared Mechanics

Draft ownership map. Each mechanic is currently restated in every doc listed; the recommendation is the single owner. Verified against code in §Verification.

| Mechanic | Currently in | Recommended owner |
| --- | --- | --- |
| The link / connection right-click menu | MarkdownPM, ConnectionsPM, PropertiesPM, TableViewPM, CardViewPM, PagePreviewPM | ConnectionsPM, once, at behavior level |
| The page right-click menu ("page-meta block", Move To ▸, Copy Link, Copy Path) | SidebarPM, TableViewPM, CardViewPM, NavigationPM | One doc — SidebarPM or a short "Page Actions" section in PagesPM |
| `open_in` + ⌘-click bypass | PagesPM, CollectionsPM, PagePreviewPM, SidebarPM, ConnectionsPM | CollectionsPM (it's the Collection's setting) |
| The hover preview card (page flavor + site flavor) | PagePreviewPM, ConnectionsPM, MarkdownPM, WebviewPM, TableViewPM | One component (`Embeds/ConnectionHoverCard.tsx`): ConnectionsPM (page flavor) · WebviewPM (site flavor) |
| The `[[` autocomplete | MarkdownPM, ConnectionsPM, InteractionPM | ConnectionsPM |
| The creation act (Untitled on disk, uncommitted rename) | PagesPM, ViewsPM, TableViewPM, CardViewPM, SidebarPM | PagesPM |
| The hover ghost row | SidebarPM, TableViewPM, CardViewPM, ViewsPM | ViewsPM (one sentence per renderer) |
| The embed framework / tile chassis / Scale ramp | SurfacePM, MarkdownPM, WebviewPM, DesignSystemPM, TableViewPM | EmbedsPM (new) — the code is in `Embeds/`, not `SurfacePM/` |
| The floating window chassis (PreviewPane) | PagePreviewPM, NavigationPM, WebviewPM, ConfigurationPM, InteractionPM, DesignSystemPM | DesignSystemPM §Detail names it; PagePreviewPM describes the window |
| Rename cascades (title, property, Context) | ConnectionsPM, PropertiesPM, ContextsPM, PagesPM, ArchitecturePM | ArchitecturePM §Mutations at mechanism level; each entity doc says "renames cascade" |
| Delete → `.trash` bundle + record + restore | NexusRecordPM, ArchitecturePM, CollectionsPM, PageSetsPM, ContextsPM, PropertiesPM | NexusRecordPM |
| The Unknown-file rule | PagesPM, ArchitecturePM, AgendaPM, PRD, CLAUDE.md | ArchitecturePM §Adoption |
| Name collision (create disambiguates, rename refuses) | PagesPM, CollectionsPM, ContextsPM, PropertiesPM, TableViewPM, CardViewPM | ArchitecturePM §Mutations |
| The generic folder-entity CRUD | CollectionsPM, PageSetsPM, ContextsPM | CollectionsPM |
| Truncate-then-hover-scroll label | SidebarPM, PagePreviewPM, ViewsPM, CardViewPM, InteractionPM | InteractionPM §OverScroll |
| The band seam law | TableViewPM, CardViewPM | ViewsPM |
| Structural sharing / push path | ArchitecturePM (three times), NavigationPM | ArchitecturePM §The Push Path, once |
| Personalization knob names | Named inline in ~10 docs | ConfigurationPM's tables; other docs name the setting's label, not its key |

### Per-Doc Verdicts

Current line count → target. Verdicts: **Keep** (trim in place), **Condense**, **Merge into X**, **Retire**. Targets are rough and assume the global rulings land as recommended.

| Doc | Lines | Verdict | Target | Notes |
| --- | --- | --- | --- | --- |
| PommoraPRD | 230 | Keep | ~200 | Ruling III: mechanism paragraphs → pointers, Locked Decisions appended at the bottom, v1 Scope left for its own pass |
| ArchitecturePM | 249 | Condense | ~200 | Map + per-subsystem overview (Ruling VIII); gains §Persistence from NavigationPM; loses the schema-transaction bullet and the justification tails |
| MarkdownPM | 217 | Condense | ~150 | §Design System tables stay, three rows corrected; Constructs and Footnotes at behavior level; Page Embeds halved, pointing at SurfacePM |
| PropertiesPM | 236 | Condense | ~120 | Type catalog stays; per-type sections halved; §Schema Mutations table stays, the journal paragraph → ArchitecturePM; §The Index and §Label Tokens fold into neighbors |
| DesignSystemPM | 395 | Keep | ~330 | Tables stay exact (Ruling I); fix the roster omissions and the four stale claims; the TOC fence and Interaction pointer table trim |
| ConfigurationPM | 205 | Keep | ~170 | The settings tables are the one place knobs are enumerated and should stay; Personalization, Write Discipline, App Config trim |
| InteractionPM | 164 | Condense | ~110 | Named motions stay, anchored to code names; token tables stay; §Drag Motion, §Autoscroll Tuning, §Timing Sources move to PommoraDND or go |
| NavigationPM | 130 | Condense | ~60 | §State Persistence moves to ArchitecturePM under a Persistence heading; the rest trims |
| TableViewPM | 115 | Merge into ViewTypesPM | ~55 as a section | Renderer-specific behavior only; token sheet stays, corrected |
| ViewsPM | 112 | Becomes ViewTypesPM | ~80 + a section per type | The pane-by-pane surface tour drops to what each configures |
| SymbolsPM | 119 | Condense | ~85 | Registry rules and the assignment tables stay, corrected; §Roles goes (no code counterpart) |
| CardViewPM | 106 | Merge into ViewTypesPM | ~45 as a section | Token table stays |
| NexusRecordPM | 95 | Condense | ~50 | Stays standalone (~1,400 lines of code behind it); provenance + restore + trash browser at behavior level; Baseline and Re-Mint one paragraph |
| PagePreviewPM | 87 | Merge into InterfacePM | ~30 as a section | Browser flavor → WebviewPM blurb; hover card owned here, pointed at from Connections / Markdown / Pages |
| PommoraDND | 82 | Condense | ~40 | Seam + the two treatments + accessibility; principles and engine internals go |
| SurfacePM | 78 | Keep | ~60 | Owner of the embed framework; MarkdownPM §Page Embeds points here |
| ConnectionsPM | 72 | Condense | ~45 | Owner of the link menu and autocomplete, stated once at behavior level; the File-value paragraph and cascade internals go |
| SidebarPM | 64 | Merge into InterfacePM | ~35 as a section | Owner of the page menu table |
| CollectionsPM | 62 | Keep + absorb PageSets | ~60 | |
| PagesPM | 62 | Keep | ~50 | |
| WebviewPM | 58 | Keep | ~45 | Owner of everything web-facing |
| ContextsPM | 50 | Condense | ~35 | Registry model stays; Writes at behavior level |
| SubfieldPM | 41 | Merge into InterfacePM | ~10 as a section | |
| AgendaPM | 38 | Merge | ~8 lines in ArchitecturePM §The Agenda Singletons + a Framework line | Nothing exists to document yet |
| PageSetsPM | 37 | Merge into CollectionsPM | ~8 as a section | |
| QuickCapturePM | 34 | Retire | 1 Framework prospect line | Unbuilt design |

Projected corpus: 26 docs → 19 (InterfacePM and ViewTypesPM absorb six); ~3,800 lines → ~2,300 with the token tables kept.

### Cross-Doc Conflicts

Contradictions found in the read, verified in §Verification where code decides.

- **PRD §Connections** says a connection "may also be assigned on the Markdown's frontmatter through the link property"; ConnectionsPM says "a **URL property** holds one". Same fact, two names — and PropertiesPM's catalog calls the type **URL** while its section heading reads **Links & URL** and SymbolsPM's icon table calls it **Link**.
- **PRD §v1 Scope** lists "Settings — storage, accent-color reading, and the full editing UI" as in, and "full Settings editing UI" as out.
- **PRD §Agenda** says agenda config "carries identity and nothing else"; PropertiesPM's scope table gives Tasks and Events `property_definitions[]` sidecars "separate from the registry; unbuilt" and states "Agenda's kinds are modeled to keep their own definitions on their config sidecars." One of these is the design; the other is a leftover.
- **SidebarPM §Ribbon** lists the default order as Navigation · Agenda · Contexts · Collections · Settings; §Content Modes calls Agenda "the ribbon's third mode".
- **PagePreviewPM** and **NavigationPM** both describe the NavWindow's tab model; **PagePreviewPM** and **WebviewPM** both describe the browser flavor and the site hover card.
- **ArchitecturePM §Principles** (Files are canonical / Agent legibility) restates PRD §Core Constraints and §Storage Philosophy nearly verbatim; **CLAUDE.md §The Model** restates the PRD's Domain Model.

### Verification

Findings from six per-cluster code audits, each load-bearing claim re-opened at the cited file before entry. Two agent findings were rejected on re-check and are recorded so they aren't re-raised. Paths are under `Pommora/src/`.

#### Untrue or Stale Statements

Default disposition is removal (Ruling VI); a **restate** mark means the doc is incomplete without the corrected fact.

| Doc | Claim | Truth | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| MarkdownPM §Footnotes | "Right-clicking either gives Edit · Copy · Delete" | A citation row gets Copy · Delete; Edit is marker-only | `shared/citationMenu.ts:29` | restate |
| MarkdownPM §Context Menu | Paste As ▸ framed as the three link forms + address, or Connection / Markdown Link / Embedded Page | Also Plain Text, Footnote, Embedded Link | `shared/PasteAsMenu.ts:66-77` | restate at behavior level |
| MarkdownPM §Block Drag | "One grip menu serves every kind … Delete on all … Type ▸ on a list, Source ▸ / Scale ▸ on an embed" | Five kinds; webpage (Edit Link + Scale) and heading (Rename / Size / Delete-keeps-body) are absent; heading's Delete keeps the body | `shared/gripMenu.ts:25-30` | restate |
| MarkdownPM §Code | "the six with first-party grammars … plus Swift" | Seven (Markdown included); Swift is a stream mode | `editor/codeHighlight.ts:25-35` | remove the count |
| MarkdownPM §Footnotes | "hidden by default" | Governed by `citationsShown`; `jumpToCitation` also unmentioned | `shared/types.ts:190-193` | restate as "per the setting" |
| MarkdownPM §Design System | `--mdpm-scale` = `1`; `--detail-title-size` = `28px` | `var(--editor-scale)`; `calc(28px * var(--editor-scale, 1))` | `MarkdownPM/Styles.css:21,138` | removed with the table (Ruling I) |
| MarkdownPM §Known Issues | column-drop persist reverts a mid-drag hide | Belongs to TableView (`reorderColumn` is `Detail/Views/Table/columnReorder.ts`) | — | move |
| MarkdownPM §Pending | "Zoom slider UI placement" | Editor Scale is a live settings row | `Settings/NexusSettings.tsx:399` | remove or say what's actually pending |
| ConnectionsPM §Prospects | Backlinks: "no index exists" | The mentions index exists and the same doc's cascade uses it | `main/db/contentIndex.ts`, `main/db/schema.ts:24` | restate |
| ConnectionsPM §Autocomplete | alias list opens unconditionally | Governed by `aliasPickerOnCommit`; `removeTitleOnLinkChange` also unmentioned | `useConnectionAutocomplete.ts:59-60`, `types.ts:121,127` | restate |
| PagesPM §Editor UI State | per-machine list = folds + heading columns | Also `headingIcon`, `citations`, `embedHeights`, `embedZooms` | `main/db/localState.ts:11-28` | point at NavigationPM's table |
| PagesPM / PagePreviewPM | "⌘-click always bypasses" vs "⌘-click is additive" | Two rules: `open_in` bypass is one-directional; `connectionsOpenInPreview` ⌘-click inverts the knob | `types.ts:143` | restate once, in CollectionsPM |
| PagePreviewPM §Hover Card | "the Settings ▸ Pages linger slider" | Lives under Navigation | `NexusSettings.tsx:252-273` | restate |
| PropertiesPM scope table + §Context Links + §Validation | Task/Event `property_definitions[]` sidecars, "own unique-name rule over their own namespace" | Nothing of the kind exists; agenda configs are `baseSidecar` (id / icon / modified_at) | zero hits for `property_definitions`; `shared/schemas.ts:39-43` | remove (seven restatements) |
| PropertiesPM §Auto-Managed | "pages may carry a `cover` property" | `cover` is a root field, not a property — the same doc says so at §Identity | `shared/schemas.ts:81` | remove |
| PropertiesPM §Known Issues | bare-string Multi-Select "remains classified as Select" | Decode returns NULL for a non-array; no reclassification path found | `shared/propertyValue.ts:83-86` | verify or remove |
| ContextsPM §Pending | Space-to-Space rows: "the write path and index are live" | Write path yes; Context keys are outside the index (same doc's next bullet says so) | `main/crud/governedSweep.ts:36-38` | restate |
| ContextsPM §Writes | rename order omits the folder rename | journal → folder rename → cascade → registry → settle | `main/crud/contextCascade.ts:202-256` | drop the ordering (internals) |
| AgendaPM §Registration | "a nested one is inert on depth alone" | A nested folder carrying the registered id is carried home when the root slot is empty | `main/adopt.ts:34-60` | remove with the section (ArchitecturePM has it right) |
| AgendaPM intro | "no on-disk format, no CRUD" | True for items; the config sidecar, registration, classification, and NavRef plumbing exist | `main/identity.ts:65-72`, `main/folderKind.ts:22-30` | restate |
| NexusRecordPM §Pending | "crash-safe cascades beyond the delete — the rename cascades" | Context and property renames are already journaled; only moves and the `[[link]]` cascade aren't | `main/crud/contextJournal.ts`, `propertyJournal.ts` | restate |
| TableViewPM §Table Sheet | `--chips-gap` | Token is `--labels-gap` | `Detail/Views/Table/table-tokens.css:20` | removed with the table |
| TableViewPM §Table Sheet | scope `.table-view, .table-empty` | Also `.trash-leaf` | `table-tokens.css:10-12` | removed with the table |
| TableViewPM §Columns | "Select and multi carry no style submenu" | Status, Select, Multi-select share the Standard / Compact axis (HEAD commit) | `shared/columnStyles.ts:53-66` | restate |
| ViewsPM intro | "Six view types are modeled" | Two built, four registered with inert picker tiles | `Detail/Views/ViewRenderer.tsx:13-17`, `ViewSettings.tsx:45` | restate |
| NavigationPM §Toolbar Tabs | parked-surface count "a single tunable in the detail pane" | A code constant, not a setting | `Detail/DetailPane.tsx:69-71` | restate |
| SubfieldPM intro | "every content view" | Homepage and Context render no items | `Detail/Subfield/crumbs.ts:64-68` | restate |
| WebviewPM §Link Opening | "preferenc" | typo | — | fix |
| DesignSystemPM §Tooling | "only `Tokens/` and `Theming/` import from `@shared`, nothing imports the store" | `ImagePicker`, `AssetImage` import the store; `Symbols`, `ColorSwatch`, three Showcase leaves import `@shared` / app modules | `DesignSystem/Components/ImagePicker/ImagePicker.tsx:15` et al. | remove the claim |
| DesignSystemPM §Pending | "no `mono` token behind the editor's code stack" | `font.mono` exists and is consumed | `Tokens/typography.css.ts:14`, `MarkdownPM/Styles.css:374` | remove |
| DesignSystemPM §Pending | "the inactive state token" unbuilt | `--state-inactive` is tabled in the same doc; the pending item means a label tone | `Tokens/color.css.ts:88` | rename the item |
| DesignSystemPM §Pickers | ImagePicker / AssetImage listed under `Pickers/` | Root-level `Components/` folders | filesystem | fix |
| DesignSystemPM rosters | Menu, Fields, Labels, Theming rosters framed as complete | Each omits exports (`AccessoryButton`, `titleInput`, `autoSize*`, `optionShapeFor`, `applyPersonalizationKey`, …); Fields' Chrome row names non-exported names | `Components/Menu/index.ts`, `Fields/index.ts:7-17` | rosters at family level (Ruling I) |
| InteractionPM §Named Animations | Bloom / Retract / Engulf / Overtake / Scale-fade | Prose-only vocabulary; code names are `dropdown-menu(-out)`, `engulfing`, `sidebar-mode-*`, `ppane-in/out` | `Animation/animations.css.ts`, `PagePreview/PreviewWindow.tsx:40`, `Sidebar/Sidebar.css:143`, `PreviewPane/previewPane.css:66` | restate with the code name beside each |
| SymbolsPM §Registry | "the bundle carries exactly what's named" | The picker imports all of Lucide | `Symbols/AllSymbols.ts:1,23` | remove |
| SymbolsPM §Registry | Tabler sits "with no override" | `TABLER_SCALE = 1.1` | `Symbols/customGlyphs.tsx:8,49` | remove the claim |
| SymbolsPM §Property Types | "Created → `clock-plus`"; "Modified → `history`" | No `created` type; the type is `last_edited_time`, labeled "Last edited" | `Components/Detail/PropertyTypes.tsx:22-35` | fix or remove the table |
| SymbolsPM §Roles | seven roles with per-role scales | No code counterpart | — | remove |
| PommoraDND §Seam, §Displacement | "the board" | No board view exists; the sole `DragGroup` consumer is Cards | `Detail/Views/Cards/CardsView.tsx` | rename to Cards |
| PommoraDND §Seam | SOURCE `interactions/drag.tsx` | `DesignSystem/Interactions/drag.tsx` | filesystem | fix |
| PRD §Identity | "the **only** relation-type connection"; §v1 Out "the sole connection syntax" | Two body syntaxes; a URL property holds a frontmatter `[[Title]]` page link | `shared/links.ts:28`, `shared/linkValue.ts` | restate — see Open Questions |
| PRD §Connections | "through the link property" | The type is URL | `shared/properties.ts:18` | fix |
| PRD §v1 Scope | Settings "full editing UI" listed both in and out | A window with most knobs; `defaultIcons`, placement, `defaultViewScale`, `excluded_folders` hand-edited | `NexusSettings.tsx` | restate once |
| PRD §Distribution | "adds electron-builder packaging" | `electron-builder.yml` and `npm run package` exist; notarize / updater don't | `Pommora/electron-builder.yml`, `package.json:20` | restate |
| PRD footnotes 14–15 | `[[Mac-Integration]]` · `[[Distribution]]` | Not in `// Features` (they're `// Resources`) | filesystem | fix the links |
| CLAUDE.md §The Model | properties "via `[Property]:` syntax" | Property wrap is `<Property>` | `shared/governedKeys.ts:15-16` | fix |
| CLAUDE.md §The Model | Tasks "located within `/Tasks`" | Seed names, registered by sidecar id, renameable | `main/folderKind.ts:23-24` | fix |
| CLAUDE.md §The Model | connections "aren't displayed anywhere outside the Markdown body, and content-to-content relational properties don't exist" | URL cells render connections | `shared/linkValue.ts:1-5` | fix |
| CLAUDE.md §Codebase Information | `react-markdown` + `remark-gfm` in the stack | Installed, imported nowhere | grep | remove |
| ArchitecturePM §Classification | Sets carry "their own saved views wherever they sit" | Stored at any depth, offered at depth-1 only | `shared/types.ts:324,437` | restate |
| ArchitecturePM §Atomic-Write | "Schema transaction — stage every payload … roll the filesystem back" | No such mechanism; PropertiesPM says the fan-outs aren't cross-file atomic | grep (`rollback`, `staged`): no hits in `main/` | remove |
| ArchitecturePM §Nexus Layout | `.nexus/` roster | Missing `assets/` and `homepage/` | `shared/nexusPaths.ts:28`, `main/paths.ts:60-65` | fix |
| ArchitecturePM §Device-Local DB | "What lives here" list of ten | Seventeen keys | `main/db/localState.ts` | list at family level |
| ConfigurationPM §Appearance | accent default "the system accent" | `DEFAULT_ACCENT = 'cyan'`; system is opt-in | `shared/types.ts:30` | fix |
| ConfigurationPM | `excluded_folders`, `profile_*` keys untabled | Exist in `settings.json` | `types.ts:371-380,402-404` | add rows |
| FrameworkPM | "pickers (accent, connection color, default icons) … without controls" | Accent and connection color have pickers | `NexusSettings.tsx:292-309` | fix (adjacent) |

#### Rejected Findings

- **"PRD: colliding Page creation does not auto-disambiguate"** — `main/crud/page.ts:38` fails on an existing file, but every create channel wraps it in `createDisambiguated` (`main/mutate.ts:265,289,315,695`). The PRD is right.
- **"SymbolsPM: `DashIcon` does not exist"** — it does, at `Components/Detail/DashIcon`; the audit searched only `DesignSystem/`. The doc is right.

#### Token Tables

~110 value rows sampled across DesignSystemPM, InteractionPM, SymbolsPM: zero mismatches. Three mismatches in MarkdownPM's table, two in TableViewPM's. The DesignSystem tables are accurate because they've been hand-synced; they remain a third copy (TS token → `theme-vars.css.ts` bridge, which already carries a purpose comment per var → doc row). Ruling I stands on cost, not drift.

#### Structural Findings That Move Verdicts

- **The Embed Framework isn't SurfacePM's.** The code lives in `Embeds/PageEmbed.tsx`, `Embeds/embeds.css`, and `DesignSystem/Detail/tile-chassis.css` — none of it in `SurfacePM/` or `Blocks/`. SurfacePM is one of five consumers (preview, NavWindow, hover card, dashboard tiles, `![[ ]]` widget); MarkdownPM and WebviewPM currently link to `[[SurfacePM|Embed Framework]]` for a mechanism that isn't SurfacePM's. → an `EmbedsPM` candidate (§Open Questions).
- **NexusRecordPM should stay standalone.** Backed by ~1,400 lines across `provenance.ts`, `record.ts`, `remint.ts`, `restoreScrub.ts`, `trashRows.ts`; folding it into Architecture would make Architecture the dump. Condense, don't merge.
- **PagePreviewPM, after the moves, is ~30 lines** describing a window that opens Pages from three routes and holds tabs. NavigationPM already owns tabs, per-machine tab persistence, and the NavWindow. → merge candidate (§Open Questions).
- **InteractionPM ↔ PommoraDND leaks:** §Drag Motion is an explicit "in brief" of PommoraDND, §Autoscroll Tuning documents PommoraDND's loop, §Timing Sources points back at DesignSystemPM. Those three move to PommoraDND or go.
- **ConfigurationPM's tables are the most accurate content audited** (35/35 keys real). Its problem is external: eight docs re-describe knobs by key with options and defaults. It should be the one roster; feature docs name the setting's label and point.
- **`shared/pageMenu.ts`, `shared/connMenu.ts`, `PropertyEditing/valueClick.ts`, `useViewCreation.ts`, `useGhostAnchor.ts`, `GroupBand.css`** each carry a header comment naming themselves the single home of a mechanic the docs state two to six times. The code already knows who owns what.

### Rulings Given

Nathan's answers, 08-25-2026, to the questions the audit raised.

1. **Relations.** Contexts are the only relation. *Connection* is the shared name for both the `[[Title]]` and `[Label](Title)` syntaxes; a connection may also exist as a link frontmatter property. That sentence replaces every "sole syntax" / "only relation" / "don't exist" phrasing across PRD, CLAUDE.md, ConnectionsPM, PropertiesPM.
2. **Floating windows → InterfacePM.** One doc for the shell's surfaces (Ruling VIII).
3. **No EmbedsPM.** SurfacePM owns the framework; MarkdownPM points.
4. **Table + Cards → ViewTypesPM.**
5. **NavigationPM §State Persistence → ArchitecturePM**, under a Persistence heading.
6. **Prospects and Known Issues stay per doc.** FrameworkPM is out of scope and needs its own pass.
7. **Menu enumeration** — covered by Ruling V: tables are fine when visibly exact; sentences aren't.
9. **Locked Decisions → bottom of the PRD.** Core Constraints stay.
— **Hover card + Page Preview** are owned by InterfacePM; ConnectionsPM, MarkdownPM, and PagesPM carry a short blurb or a pointer with a footnote.

### Remaining Questions — Answered

1. **InterfacePM ↔ NavigationPM** — confirmed as proposed.
2. **Link** is the property's doc name (the code type stays `url`).
3. **Pending** headings stay, trimmed.
4. **CLAUDE.md §The Model** stays full; the PRD stays more descriptive. Its three errors are fixed in place.
5. **Named motions** stay as they are; each name gets its code name beside it.
6. **`createContextGroup` two-writers** — filed, not fixed in this arc.
7. **Dispatch** — none until the target outlines below are approved.
8. **SymbolsPM §Sizes** stays, duplicating DesignSystemPM's ladder by decision.
9. **PickerMenu placement** is not a doc section anywhere; docs footnote DesignSystemPM and/or InterfacePM as needed.
10. **The overtake sweep** is one or two sentences under InteractionPM §Named Animations, not a heading.
11. **ConfigurationPM §Pages** is filled. **PropertiesPM §Where Properties Live** is cut; the Properties Pane moves under Shared Mechanisms.
12. **Labels over headings** — anything under a paragraph or two is a `**Label:**`, not a heading; headings are earned by length or a table. Applied across the map.
13. **Approval runs one doc at a time.**
14. **Every heading opens with a short paragraph** that explains what the section is and grounds it in the codebase — which module or file implements it, and the mechanism at a sentence's depth — before bullets and later paragraphs carry the detail. More specific than a summary, far short of the original docs' internals.
15. **Natural prose.** Sentences flow as a person would write them — not clipped fragments stitched with semicolons and dashes. Compression comes from cutting what doesn't need saying, not from cutting the connective tissue of what does.
16. **Style notes from Nathan's post-write edits.** Plain verbs over personified ones (provides, is defined in, uses, shows — not supplies, lives in, wears, raises). Independent clauses join with semicolons or *while*, not dashes; hyphenate compounds (byte-for-byte). A sentence that restates the previous one for effect is cut. A setting's label is bolded on first mention only. The tail sections — Known Issues, Prospects, Pending — sit as H4s behind a `---` rule.

### Nathan's Rulings and Why

The cuts and adjustments Nathan made to the audit's recommendations, with the reasoning as read from them. Recorded so a later session applies the *principle*, not just the instance.

- **Token tables stay exact.** The audit read them as a drifting third copy; Nathan reads them as a deliberately rare-to-update ledger held to strict truth. The principle: a table that is *meant* to be exact is a feature of the doc, and the discipline is the price. What changes is the gate — every row re-checked against its source on each rewrite — not the table.
- **Enumeration is fine when it's visibly an index.** A table or catalog announces "this is the complete set" and is maintained as one; a sentence enumerating rows hides the same claim inside prose, where it rots unnoticed. So: tables where the set is the feature, sentences never.
- **The PRD stays large.** It is "the one doc I can give you" about the product — the overview a stranger reads first. Cutting it to a decision list would make it a summary of the feature docs rather than the product's own account. What leaves is codebase *mechanism*, because that belongs to the how-doc (ArchitecturePM), not the what-doc.
- **ArchitecturePM is map + how-it-works, not map only.** An agent landing in the codebase needs the mechanism overview in one place before opening a feature doc. The feature docs describe the feature; Architecture describes the machinery under all of them.
- **No EmbedsPM.** SurfacePM and MarkdownPM run one embedding system under different constraints; the shared source already has a home in SurfacePM, and a third doc for the shared part would split one thing across three. Fewer docs, one owner, one pointer.
- **Fewer, longer docs over doc-per-feature.** ViewTypesPM (one doc, a section per type) and InterfacePM (one doc for the shell's surfaces) follow the same instinct: a doc-per-renderer or doc-per-pane produced the restatement the audit found, because each doc had to re-explain the shared half to stand alone. A longer doc with sections shares its preamble once.
- **Prospects and Known Issues stay per doc.** FrameworkPM isn't a working destination today and needs its own pass; moving material into a doc whose role is undecided just relocates the problem. Per-doc is where a reader of that feature looks.
- **Locked Decisions move to the PRD's bottom.** They are product decisions and belong with the product; CLAUDE.md is the agent's operating file and keeps a pointer. Core Constraints stay as the PRD's two bullets because they're already there and already right.
- **Relations: Contexts only; "connection" names both syntaxes; the Link property may hold one.** One sentence, corpus-wide, ending four docs' disagreement. "Link" over "URL" because it's the word the UI uses (Insert Link, Edit Link) and the property holds connections as readily as addresses.
- **CLAUDE.md §The Model stays full.** It's the model an agent reads before anything else; a pointer would send every session to the PRD for the same paragraph. The three errors get fixed in place.
- **Named motions stay as they are.** Renaming CSS is its own arc; the docs anchor the vocabulary to the code name so it's greppable, and nothing in code moves.
- **Removal preferred; changing a changed fact is fine.** The distinction: a *wrong* statement goes; a statement that was true and is now *different* is restated. Neither gets an amendment.
- **Footnotes are the cross-reference instrument.** A pointer is a footnote to the owner, not an inline restatement. Where a blurb helps the reader (Page Preview and the hover card in Connections / Markdown / Pages), it's short and footnoted.

### Target Outlines

The shape of every surviving doc as a codemap. `// Heading` is an H3; a nested `// Heading` is an H4; a `**Label**` row is a bolded label leading a paragraph or bullet under its parent heading; a plain row is content folded in with no marker of its own. A label, not a heading, is the default for anything under a paragraph or two — a heading is earned by length or by a table. The annotation is what lives there. Marks: **NEW** — a heading that doesn't exist today; **←** — absorbed from another doc; **→** — reduced to a pointer at the named owner. Headings not listed are cut.

```
// Features                                   | • 19 docs (from 26) + the PRD and CLAUDE.md
├── [PommoraPRD.md]                           | • The product overview — large, descriptive, the one-doc account
│   ├── // Vision                             | • Unchanged
│   ├── // Why                                | • Unchanged
│   ├── // Audience and Posture               | • Unchanged
│   ├── // Domain Model                       | • PARA table, the two layers, Singletons — unchanged in substance
│   │   ├── // Organization Layer             | • Contexts & Spaces, the seeded table
│   │   ├── // Operational Layer              | • Collections, Sets, Pages, Tasks, Events table
│   │   └── // Identity and Linking           | • id, title, the Context key; Ruling 1's relation sentence
│   ├── // Core Product Decisions             | • Each subsection keeps its decisions, loses its mechanism
│   │   ├── // Stack                          | • One paragraph + no-lock-in; bridge/IPC detail → ArchitecturePM
│   │   ├── // Core Constraints               | • The two bullets, unchanged
│   │   ├── // Storage Philosophy             | • Files canonical, the line at assignment, no content in the db
│   │   │   └── sidecar-kind + Unknown rules  | • One sentence each → ArchitecturePM §Adoption
│   │   ├── // Pages                          | • Descriptive paragraph; Callouts/Columns status
│   │   ├── // Page Collections and Sets      | • Descriptive; move semantics stay
│   │   ├── // Contexts & Spaces              | • Descriptive; "journaled cascade" → ArchitecturePM
│   │   ├── // Agenda                         | • Two kinds, fields open, EventKit opt-in
│   │   ├── // Properties                     | • The catalog, no text type, no relation type, bare values
│   │   ├── // Views                          | • The model, the six types, the pipeline in one line
│   │   ├── // The Local-End Translation Principle | • Unchanged
│   │   ├── // Connections                    | • Ruling 1's sentence; resolution by title; cascade in one line
│   │   ├── // Sidebar Navigation             | • Descriptive; unchanged
│   │   ├── // App Shell                      | • Three panes, banner; inspector reserved
│   │   ├── // Navigation History             | • Descriptive; unchanged
│   │   ├── // First-Launch Experience        | • The experience; the cost-of-being-wrong argument → ArchitecturePM
│   │   ├── // Design System                  | • One paragraph
│   │   ├── // macOS Integration              | • One paragraph; footnote → Resources/Mac-Integration
│   │   └── // Distribution                   | • One paragraph, corrected; footnote → Resources/Distribution
│   ├── // v1 Scope                           | • Own pass later; only the Settings and "sole syntax" lines fixed
│   └── // Locked Decisions                   | • NEW ← CLAUDE.md, verbatim, at the bottom
│
├── [ArchitecturePM.md]                       | • The map + how each subsystem works; owner of cross-cutting rules
│   ├── // The Shape of the App               | • Two processes, one bridge, renderer as cache; no posture essay
│   ├── // The Nexus Layout                   | • The tree, corrected (assets/, homepage/)
│   │   ├── // Classification                 | • Sidecar discriminates at root, position below; depth-1 views fixed
│   │   ├── // The Agenda Singletons          | • ← AgendaPM: registration, the copy case, a Pending tail
│   │   ├── // Folder Exclusion               | • What excluded means; one predicate everywhere
│   │   └── // The Asset Directory            | • One directory, basename index, default path
│   │       └── the trash                     | • One line → NexusRecordPM
│   ├── // The Data Layer                     | • Owner of write rules every entity doc points at
│   │   ├── // The Read + State Layer         | • The walk, the live tree, treeIndex; settings-from-tree in one line
│   │   ├── // Mutations                      | • The dispatcher; journal shape, name collision, no-empties — once
│   │   ├── // The Atomic-Write Contract      | • Temp+rename, locks, page save contract; schema-transaction removed
│   │   ├── // The Device-Local Database      | • What it is, the content index, what lives here by family
│   │   │   └── migration                     | • Versioned-not-migrated in two lines; no own heading
│   │   ├── // The File Watcher               | • Halved: what reaches the tree and how
│   │   ├── // Adoption                       | • The one home of the Unknown rule; unchanged in substance
│   │   └── // Persistence                    | • NEW ← NavigationPM §State Persistence, the four-tier ledger whole
│   ├── // The Process Boundary               | • Condensed
│   │   ├── **The Bridge**                    | • One map, one dialer per channel, the Result envelope
│   │   ├── **Native Menus**                  | • Right-click native, click in-house; one chassis
│   │   └── **The Push Path**                 | • One-way, one channel, structural sharing — stated here only
│   ├── // The Renderer                       | • Per-subsystem overview + its doc (Ruling VIII)
│   │   ├── **The Store**                     | • One Zustand store, field-level subscription
│   │   ├── **Tabs, Warmth, and Navigation**  | • Overview → NavigationPM / InterfacePM
│   │   ├── **The View Pipeline**             | • Overview → ViewTypesPM
│   │   ├── **The Editor**                    | • Overview → MarkdownPM
│   │   ├── **Embeds and Floating Windows**   | • Overview → SurfacePM / InterfacePM / WebviewPM
│   │   └── **The Design System**             | • Overview → DesignSystemPM / PommoraDND
│   ├── // What the Data Layer Leaves to the OS | • Unchanged
│   ├── // Known Issues                       | • Unchanged
│   └── // Pending                            | • Unchanged (+ nothing from Agenda; that tail sits in its section)
│
├── [MarkdownPM.md]                           | • The editor: constructs, tables, block structure, menu, its token sheet — APPROVED
│   ├── // Architecture                       | • The four-bullet source-of-truth contract; the stratum table goes
│   ├── // Constructs                         | • Opens with the Dynamic Syntax paragraph (reveal / hide rule) as its intro
│   │   ├── **Inline Marks** … **Horizontal Lines** | • One labeled bullet per construct, behavior only
│   │   ├── **Connections**                   | • Two sentences → ConnectionsPM
│   │   ├── **Pasted Links**                  | • Three forms, two knobs by label, ⌘⇧V; span-tracking prose goes
│   │   ├── **The Caret**                     | • One line → InteractionPM
│   │   └── // Typing Transforms              | • H4: the input-time list, one line each
│   ├── // Tables                             | • The widget and its port; each sub-point one or two sentences
│   ├── // Embeds                             | • NEW heading holding the two forms as labels
│   │   ├── **Page Embeds**                   | • Grammar, claim rule, the four doors, one Scale line → SurfacePM
│   │   └── **Webpage Embeds**                | • The pointer it already is → WebviewPM
│   ├── // Footnotes                          | • Markers, citations, section + toggle, travel, menu (corrected), settings by label — ~8 lines
│   ├── // Block Structure                    | • Renamed from Block Drag: what a Markdown block is, the gutter handle, drag in two sentences → PommoraDND, the grip menu as a five-row table by kind
│   ├── // Context Menu + Shortcuts           | • Submenus by name; Insert ▸ / Insert Link / Paste As ▸ one sentence each, corrected
│   ├── // Design System                      | • Tables stay, three rows corrected; the "not a theme module" aside goes
│   ├── // Known Issues                       | • Column-drop item → ViewTypesPM
│   └── // Pending                            | • Zoom-slider item corrected or removed
│
├── [PagesPM.md]                              | • The Page entity; owner of the creation act and the re-dating rule — APPROVED with edits
│   ├── // On-Disk Shape                      | • Key list, foreign keys preserved, the modified_at rule in one line
│   │   ├── read + write                      | • One line: frontmatter-less files still open → ArchitecturePM
│   │   └── adoption                          | • One line → ArchitecturePM §Adoption
│   ├── // Title + Membership                 | • Filename is title; folder uniqueness; the creation act stated here once
│   ├── // Opening Behavior                   | • One line: active tab or preview per Open In → CollectionsPM; ⌘-click
│   │   └── page preview + hover card         | • Blurb + footnote → InterfacePM
│   ├── // Outline                            | • What it is, what a row does; glide mechanics go
│   ├── // Editor UI State                    | • One sentence → ArchitecturePM §Persistence
│   ├── // Pending                            | • Columns, without "specified"
│   └── // Prospects                          | • Unchanged
│
├── [ConnectionsPM.md]                        | • Both syntaxes, resolution, cascade, rendering, the link menu, autocomplete — APPROVED with edits
│   ├── // Syntax + Scope                     | • Ruling 1's sentence; alias; markdown-link target rule; the ! form → WebviewPM
│   ├── // Resolution                         | • The three states, unchanged
│   ├── // The Rename Cascade                 | • Three sentences; index internals → ArchitecturePM
│   ├── // Rendering                          | • Color, reveal, the pipe treatment, click routing by label, plainUnresolvedLinks scope
│   │   └── hover card                        | • One line + footnote → InterfacePM
│   ├── // The Link Menu                      | • NEW: one table, rows × surface; every other doc points here
│   ├── // Autocomplete                       | • The four forms, one line each; the two alias knobs by label
│   │   └── alias memory                      | • Three sentences; no own heading
│   ├── // Known Issues                       | • Unchanged
│   └── // Prospects                          | • "no index exists" corrected
│
├── [CollectionsPM.md]                        | • Collections and Sets — the schema-bearing tier
│   ├── // Sidecar + Schema                   | • What the sidecar holds (+ property_cache); title is folder name; seeds one view
│   │   └── collection settings               | • One line → PropertiesPM §The Properties Pane
│   ├── // Page Sets                          | • NEW ← PageSetsPM: one type two roles, depth-1 view rule, selection, _pageset.json
│   ├── // Open In                            | • The setting and ⌘-click, stated here once
│   ├── // Move Semantics                     | • Unchanged
│   ├── // On-Disk Layout                     | • The tree; nexus-asset:// clause goes
│   └── // CRUD                               | • Two lines → ArchitecturePM §Mutations
│
├── [ContextsPM.md]                           | • The organization layer
│   ├── // The Registry Model                 | • Five bullets shortened to facts; the YAML example stays
│   ├── // Writes                             | • **Membership** · **Renames** (one line) · **Deletes** (one line → NexusRecordPM) · **Creates**
│   ├── // Surfaces                           | • Sidebar, SpaceView, settings pane, pipeline — trimmed of chrome
│   └── // Pending                            | • Index contradiction fixed
│
├── [PropertiesPM.md]                         | • What properties are, per-type specifics, shared mechanisms
│   ├── // The Type Catalog                   | • Unchanged; scope table loses the Task/Event rows
│   ├── // Identity & Name                    | • id, name; rename in one sentence
│   ├── // Value Shapes                       | • Bare values, no empties, inert keys, the example
│   ├── // Property Types                     | • One H4 per type
│   │   ├── // Status                         | • Groups, seeds, the editor in two lines
│   │   ├── // Checkbox                       | • Look, color
│   │   ├── // Number                         | • Format property-wide, look per-view
│   │   ├── // Date & Time                    | • Formats, the picker, the Nexus defaults by label
│   │   ├── // Select                         | • Options, Style axis
│   │   ├── // Multi-Select                   | • Options, Style axis
│   │   ├── // Link                           | • Renamed; formats, alias, connection-holding; menu → ConnectionsPM
│   │   ├── // File                           | • Chips, directory, adoption in half the lines
│   │   └── // Context                        | • Two sentences → ContextsPM
│   ├── // Auto-Managed Properties            | • The three keys, Last Edited Time; cover sentence removed; re-dating → PagesPM
│   ├── // Shared Mechanisms                  | • NEW: what spans every type; Where Properties Live is cut
│   │   ├── **The Properties Pane**           | • The assign surface; the three-layer prose goes
│   │   ├── **Schema Mutations**              | • The table, kept; one paragraph on fan-out safety; journal line → ArchitecturePM
│   │   ├── **Validation**                    | • Three sentences
│   │   └── **Labels**                        | • One line → DesignSystemPM
│   ├── // Known Issues                       | • Multi-Select item verified or removed
│   └── // Pending                            | • Agenda Status item → ArchitecturePM's Agenda tail
│
├── [NexusRecordPM.md]                        | • Provenance, restore, the Trash leaf, baseline — standalone
│   ├── // Provenance                         | • Behavior level throughout
│   │   ├── **The Bundle**                    | • What's in .trash and how it's named
│   │   ├── **Write-Ahead**                   | • Record before destruction; unfinished bundles; the sweep — one paragraph
│   │   ├── **Restore**                       | • What restore checks, final titles, reconciliation, property restore
│   │   └── **The Trash Leaf**                | • The Settings leaf in readable paragraphs; knobs by label → ConfigurationPM
│   ├── // Baseline                           | • One paragraph for the open walk, one for the re-mint; no H4s
│   ├── // Known Issues                       | • Unchanged
│   └── // Pending                            | • Journaled-renames item corrected
│
├── [ViewTypesPM.md]                          | • NEW ← ViewsPM + TableViewPM + CardViewPM
│   ├── // Saved-View Model                   | • Unchanged, minus the "never empty" defense
│   ├── // The Pipeline                       | • columns → filter → group → sort
│   │   ├── // Filter                         | • Modes, negation on operators, filter_enabled; operator families as a table
│   │   ├── // Group                          | • Kinds, order, hidden groups, the ungrouped tail
│   │   ├── // Sort                           | • Multi-key, comparators, the drag-retire rule
│   │   └── // Columns                        | • Allowlist; unchanged
│   ├── // Creation                           | • NEW: the shared act → PagesPM, the hover ghost — once for every renderer
│   ├── // Group Bands                        | • NEW: the band, the seam rule, band drag → PommoraDND, what each drop writes
│   ├── // Surfaces                           | • Each pane reduced to what it configures
│   │   ├── **ViewPane** · **ViewSettings** · **SettingsPane** | • One labeled paragraph each
│   │   └── **Grouping** · **Sorting** · **Filtering** · **Visibility** | • One labeled paragraph each
│   ├── // Table                              | • ← TableViewPM
│   │   ├── // The Grid                       | • Shared tracks, filler, overflow, full-bleed heading — five lines
│   │   ├── // Columns                        | • Widths, resize, reorder, hide, header menu (Style axis corrected)
│   │   ├── // Rows & Cells                   | • Title navigates, cell clicks → PropertiesPM, row drag, the grip menu
│   │   ├── **Creation Triggers**             | • Band-add, Above/Below, the ghost — three bullets
│   │   ├── // The Table Sheet                | • Kept, two rows corrected
│   │   └── // Known Issues                   | • + the column-drop item from MarkdownPM
│   ├── // Cards                              | • ← CardViewPM
│   │   ├── **Anatomy & Sizing**              | • Image band, text area, scale
│   │   ├── **Card Image**                    | • Cover / Preview / None; banner menu → PagesPM
│   │   ├── **Layouts**                       | • Standard, Compact, the two switches
│   │   ├── // Properties on Cards            | • Gesture → PropertiesPM; the add-picker in two lines
│   │   ├── // Grouping, Location & Set Cards | • Flat bands, location footing, Set Cards
│   │   ├── // Drag & Menus                   | • Card drag, band drag → PommoraDND, the card menu
│   │   ├── // Card Tokens                    | • Kept
│   │   └── // Prospects                      | • Unchanged
│   ├── // List · Gallery · Calendar · Timeline | • One line: registered, no renderer
│   └── // Pending                            | • Unchanged
│
├── [SurfacePM.md]                            | • The dashboard layer; owner of the embed framework
│   ├── // The Block Document                 | • What it is, where it lives; render-inert in one sentence
│   ├── // Tile Types                         | • Markdown, page, view; the view header in three sentences
│   ├── // The Embed Framework                | • The shared source: PageEmbed, chassis, edit-in-place, Scale ramp, laws, consumers
│   ├── // Surface Interaction                | • Creation, handle, lock, borderless, resize in one paragraph, host lock
│   ├── // Storage + Host Rules               | • Two sentences → ArchitecturePM
│   ├── // Pending                            | • "parked by design" dropped
│   └── // Prospects                          | • Unchanged
│
├── [InterfacePM.md]                          | • NEW ← PagePreviewPM + SidebarPM + SubfieldPM: the shell's surfaces
│   ├── // The Shell                          | • Three panes, resizable side panes, the banner header, the reserved inspector
│   ├── // The Toolbar                        | • The tab bar's seat → NavigationPM; the trio; the ViewDropdown/Outline slot; Settings dropdown
│   ├── // The Sidebar                        | • ← SidebarPM
│   │   ├── **Ribbon**                        | • Launcher, modes, toggle
│   │   ├── **Content Modes**                 | • The three
│   │   ├── // Creation                       | • Right-click first; the page menu as a table, once
│   │   ├── **Drag and Drop**                 | • → PommoraDND; what persists where
│   │   └── **Selection** · **Row Labels**    | • Selection survives rename; labels → InteractionPM §OverScroll
│   ├── // The Subfield                       | • ← SubfieldPM: breadcrumb + dimmed tail, footnotes control, items, scoped mounts, persistence
│   ├── // Floating Windows                   | • The PreviewPane chassis in one paragraph
│   │   ├── // Page Preview                   | • ← PagePreviewPM: window, promote/dismiss, tab model, persistence, routing in (⌘-click correct)
│   │   ├── **The Browser**                   | • Two sentences → WebviewPM
│   │   ├── // The NavWindow                  | • Mechanics: map tab, morph, inspector; purpose → NavigationPM
│   │   └── **Settings**                      | • One sentence → ConfigurationPM
│   ├── // The Preview Inspector              | • Four sentences → PropertiesPM
│   ├── // The Hover Card                     | • Owned here: page + site flavors, dwell, anchor, dismissal, linger by label, size
│   └── // Pending                            | • The merged lists
│
├── [NavigationPM.md]                         | • Wayfinding: the layer, tabs, history, NavView
│   ├── // The Navigation Layer               | • Recents, pins, favorites, search; persistence in one line → ArchitecturePM
│   ├── // NavWindow                          | • What it's for: rail, gallery, search, row menu, reorder; mechanics → InterfacePM
│   ├── // Toolbar Tabs                       | • Warm tabs, parked ("two, a code constant"), pinned/unpinned, lifecycle, interaction, icons
│   ├── // Back and Forward                   | • Unchanged
│   ├── // NavView                            | • Condensed
│   ├── // Pending                            | • Unchanged
│   └── // Prospects                          | • Unchanged
│
├── [WebviewPM.md]                            | • Everything web-facing
│   ├── // Webpage Embeds                     | • Grammar, formation, claim, visibility in one line; tile → SurfacePM
│   ├── // Engagement & Retention             | • Three sentences
│   │   └── titles & the grip                 | • Two sentences; no own heading
│   ├── // Link Opening                       | • The adjudicator, the setting by label
│   ├── // Web Sessions                       | • One session, zoom composition; UA prose goes
│   ├── // The Browser Window                 | • NEW ← PagePreviewPM browser flavor; chassis → InterfacePM
│   ├── // Website Hover Previews             | • Two sentences → InterfacePM §The Hover Card
│   └── // Pending                            | • Unchanged
│
├── [ConfigurationPM.md]                      | • The one roster of knobs; others name a label and footnote here
│   ├── // Settings                           | • Leaf tables as they are; accent default fixed; excluded_folders + profile keys added
│   │   ├── // General · Interface · Navigation · Appearance · Files & Links | • Prose trimmed to a line or two
│   │   ├── // Properties · Automations       | • Empty leaves — one line each, no table
│   │   ├── // Pages & Editor                 | • Unchanged
│   │   ├── // Shortcuts                      | • The table; the spec prose in two lines
│   │   └── // Trash                          | • The table; body → NexusRecordPM
│   ├── // Collections                        | • Unchanged
│   ├── // Pages                              | • Filled: icon, cover (+ crop), header-icon visibility, footnotes override, embed heights and scale — with where each lives
│   ├── // Personalization                    | • Same table shape as Settings (key / writer / default)
│   ├── // App Configuration (Per-Device)     | • Four lines
│   └── // Pending                            | • Unchanged
│
├── [DesignSystemPM.md]                       | • The ledger, exact
│   ├── // Token Atlas                        | • All tables kept, verified; sub-headings unchanged
│   ├── // Materials                          | • Rosters kept
│   ├── // Labels & Chips                     | • Kept
│   ├── // Elements                           | • Kept
│   ├── // Components                         | • Rosters completed; Fields Chrome row corrected
│   │   └── // Controls · Pickers · Menu · Fields | • Unchanged headings; ImagePicker/AssetImage out of Pickers; PickerMenu's row is where its placement rules live
│   ├── // Detail                             | • Kept; PreviewPane's row names previewPane.css
│   ├── // Interaction · Animation · Symbols  | • Pointer tables, kept
│   ├── // Showcase                           | • Five lines: scripts, registry, URL
│   ├── // Known Issues                       | • Unchanged
│   └── // Pending                            | • Mono and inactive items corrected
│
├── [InteractionPM.md]                        | • Motion vocabulary + interaction primitives
│   ├── // Motion Tokens                      | • Unchanged
│   ├── // Named Animations                   | • Each with its code name beside it
│   │   ├── // Bloom · Dropdown               | • The two speeds, the origin; PickerMenu placement → footnote to DesignSystemPM / InterfacePM
│   │   ├── // Header Scroll-Park             | • Unchanged
│   │   ├── overtake                          | • One or two sentences; sidebar-mode-*; no heading
│   │   └── // Floating Windows               | • ppane-in/out, engulfing; the pane-open rule
│   ├── // Primitives                         | • NEW parent; each child condensed to behavior
│   │   ├── **The --io Progress** · **Reveal** · **Pane Slide** · **Scroll Glide** · **DualSwitch** | • One labeled paragraph each
│   │   └── // The Caret · OverScroll · Hover Remove | • H4s — each carries a token table
│   ├── // Principles                         | • Unchanged
│   └── // Pending                            | • Unchanged
│
├── [SymbolsPM.md]                            | • Registry rules, assignments, the picker
│   ├── // The Registry                       | • Three rules corrected; scale resolution
│   │   └── // Sizes                          | • Kept — duplicates DesignSystemPM's ladder by decision
│   ├── // Assignments                        | • NEW parent for the exact tables
│   │   ├── // View Settings Panes · Property Types · View Types | • Kept; Created row removed, Modified renamed
│   │   ├── // File Types                     | • The exact extension set
│   │   └── additional assignments            | • Folded in; no own heading
│   ├── // The Picker                         | • Unchanged
│   └── // Known Issues                       | • Unchanged
│
├── [PommoraDND.md]                           | • The engine's contract
│   ├── // The Seam                           | • API list; gesture in three sentences; SOURCE corrected
│   ├── // Core Principles                    | • Five one-liners
│   ├── // Displacement                       | • "board" → Cards
│   ├── // Insertion Line                     | • What each surface does; the rest → InterfacePM / ViewTypesPM
│   ├── // Autoscroll                         | • Condensed; ← InteractionPM's knob table as SOURCE
│   ├── // Constraints & Accessibility        | • Unchanged
│   ├── // Known Issues                       | • Unchanged
│   └── // Pending                            | • Unchanged
│
└── [CLAUDE.md]                               | • Agent operating file
    ├── // The Model                          | • Full, three errors fixed
    ├── // Codebase Information               | • Stack line drops react-markdown / remark-gfm
    ├── // Locked Decisions                   | • One-line pointer → PRD
    └── // Codebase Map                       | • Features roster updated to the 19

Retired: [PageSetsPM.md] [PagePreviewPM.md] [SidebarPM.md] [SubfieldPM.md] [TableViewPM.md] [CardViewPM.md] [AgendaPM.md] [QuickCapturePM.md]
Renamed: [ViewsPM.md] → [ViewTypesPM.md]
```

Headings demoted to inline rows above are the ones whose content is two or three sentences: a heading over three sentences reads as scaffolding, and the outline block at the top of each doc grows to match. Where a doc has three or more short siblings on one theme (the editor's two embed forms, Interaction's primitives, Symbols' assignment tables), they gain one parent heading and become H4s so the outline reads as structure rather than a flat list.

### Status

All nineteen docs, the PRD, and CLAUDE.md were rewritten on 08-25-2026 against the outlines below; MarkdownPM, ConnectionsPM, and PagesPM carry Nathan's post-write edits and are approved. The remaining sixteen are written and await his read. The nine absorbed docs are removed from the tree, and every cross-reference in Features, the PRD, and CLAUDE.md resolves; `Guidelines/Cohesion-Rulings.md` still names retired docs and is outside this arc's scope.

### The Per-Doc Checklist

Every doc is rewritten against this list, in order, one doc per pass. MarkdownPM is the reference for the register; the doc's row in §Target Outlines is its shape and its rows in §Verification are what must not survive.

**Before writing**

- [ ] Read the current doc whole.
- [ ] Read its outline row in §Target Outlines and its rows in §Verification.
- [ ] Open the owning code: the module folder(s), the shared models (`shared/*Menu.ts`, `shared/schemas.ts`, `shared/types.ts`), and any file a §Verification row cites. Confirm every claim the new doc will make — a menu's rows, a setting's label, a file's fields, a folder's contents — against the code as it is now, not as the old doc says.
- [ ] Confirm every doc the new one will point at exists under its new name, and note any `§` target that lands only after a later rewrite.

**Shape**

- [ ] Headings match the outline row: H3s as listed, H4s only where the map shows them, everything else a `**Label**` or folded in.
- [ ] The outline block at the top matches the headings exactly.
- [ ] Every heading opens with a paragraph that says what the section is and grounds it in the codebase — the module or file, the mechanism at a sentence's depth (ruling 14).
- [ ] Bullets and later paragraphs carry the detail; a bullet is a full sentence or two, not a fragment chain.

**Voice**

- [ ] Natural prose (ruling 15). No stitched semicolon runs; no "rather than X" or "so that Y can't" unless the why is genuinely non-obvious (ruling VII).
- [ ] No exclusivity framing a sentence can't back — "the only", "never", "exactly N" — unless the code makes it so and the sentence says how.
- [ ] Enumeration only as a visibly exact table or catalog (ruling V).
- [ ] Settings are named by their label with a footnote to ConfigurationPM, never by key with options and defaults restated.
- [ ] Shared mechanics: one owner states it; this doc gives one sentence and a footnote (ruling IV). Check the §Shared Mechanics map for each mechanic the doc touches.

**Truth**

- [ ] Every §Verification row for this doc is applied: removed, or restated as the code has it.
- [ ] Every token table row is re-checked against its source file; the `SOURCE` line is correct.
- [ ] Pending and Known Issues name real gaps a reader would hit, one line each; nothing describes a deferred decision or session residue (ruling II).
- [ ] Nothing references a planning document, a session, or Nathan.

**After writing**

- [ ] Every `[[link]]`, footnote, and `§` reference resolves, or is listed as pending a later rewrite.
- [ ] Footnote numbering is contiguous and each is used.
- [ ] The doc's row in §Target Outlines is marked APPROVED once Nathan signs off; unresolved feedback is recorded beside it.
- [ ] Line count reported: before → after.

### The Rewrite Process

How the fix runs once the rulings are set, so a session picking this up has no interpretation to do.

1. **Rulings first.** Nathan marks up §Global Rulings and §Per-Doc Verdicts in this document. Anything unmarked runs as recommended.
2. **Merges before trims.** Retire and merge the docs marked for it (PageSets → Collections; PagePreview + Sidebar + Subfield → InterfacePM; Views + Table + Cards → ViewTypesPM; Agenda → Architecture + a Framework line; QuickCapture → a Framework line), updating the Codebase Map in `CLAUDE.md` and every `[[link]]` and footnote that named a retired doc.
3. **Owners before pointers.** Rewrite each shared mechanic's owner section first, then reduce every other doc's restatement to a pointer. Doing it the other way round loses the one complete description.
4. **One doc per pass, whole-file rewrite.** A doc is rewritten top to bottom in the target voice, not edited paragraph by paragraph — patching leaves the old register intact around the patches. The verification ledger for that doc is the checklist of what must not survive — and every ledger row is re-opened at its cited file before it is acted on; roughly a third of the rows were independently re-checked in this session, the rest stand on the audit's citation alone.
5. **Gate per doc.** After each rewrite: every `[[link]]`, footnote, and `§` reference resolves; no `SOURCE` path is stale; every token table row is re-checked against its source file; the doc's own outline block matches its headings.
6. **PRD and Architecture last.** They summarize the feature docs and should be written against the finished versions.
7. **Record.** One HistoryPM entry for the arc; this document stays in `// Planning` until the arc closes, then retires.

### Post-Compact Prompt — The Two-Writers Fix

A self-contained brief for a fresh session, since the finding was filed out of this arc.

> `main/crud/contextWrite.ts` `createContextGroup` (~line 213) carries its own copy of the numeric-suffix loop that `main/disambiguate.ts` `createDisambiguated` owns — same ` 2` … ` 50` shape, same cap — because its uniqueness check runs against the registry's case-folded titles rather than by attempting a write and reading back an `exists` failure. Two writers for one rule. Fix: let `createDisambiguated` take an optional `taken(name) => boolean` predicate (or a sibling `disambiguateName(base, taken)` it shares its loop with), route `createContextGroup` through it, delete the local loop, and confirm the existing `contextWrite` tests still pass (`npm run test`, `npm run typecheck`, `npm run lint`). Report +/- lines. Don't touch the suffix shape.

