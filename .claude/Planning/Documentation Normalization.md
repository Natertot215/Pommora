### Documentation Normalization

A documentation-only pass normalizing every Feature doc against one written standard, then carrying the same standard into `VersioningPM.md` and `PommoraPRD.md`. Chapter 1 ratifies the standard and works through the Feature docs per-file; Chapter 2 takes Versioning and the PRD with the ownership insights Chapter 1 produces. The standard below is derived from Nathan's own recent edits (SymbolsPM, SurfacePM, MarkdownPM, PommoraDND, CollectionsPM — all uncommitted in the working tree), Studio-Documentation.md's General Guidelines, and his stated preferences; nothing here is invented.

---

### Chapter 1 — The Standard

#### Content Rules

- **Audience:** Official product documentation for a company — encyclopedic-neutral, grammatically complete, connective prose that advances naturally. Documentation states; it never argues, convinces, or re-emphasizes a settled point.
- **Mechanism narration goes.** A sentence whose only content is which internal function, flag, cache, or class-list two features share is the source's job, not the doc's. The archetype: "The hover flag that keeps the generic editor menu out of the gutter reads the same grip-bearing line-class list as the menu's hit-test, so the two can't disagree." The inventory found roughly forty of these per major cluster; they are removed, not rewritten.
- **The insistent register goes with it.** "Deliberately," "load-bearing," "by construction," "is what lets," "one source," "THE x," shouted mid-sentence caps (IS / AND / EVERY), and worked mini-proofs mounted to convince the reader. The claim survives plainly stated once; the argument for it does not.
- **No intra-doc deferrals.** "The full law lives in §Non-Obvious" — a fact is stated once, where it belongs, and nowhere else in the same document.
- **Status lives in the tail.** Limitations, unbuilt surfaces, verification notes, and workarounds belong in the tail sections, never in the body. "End-to-end tested," "no surface reads it yet," and shipped/unshipped framing are tail material or nothing.
- **Neutral, tense-clean claims.** No absolutes or double negatives where the plain statement reads the same; no "now," "no longer," "the new default," no session, port, or Swift references. Feature docs are tense-neutral present.
- **No over-specification.** Hard counts baked into headings or prose ("Three seams," "Two Laws"), exhaustive edge-case enumerations, and on-disk asides repeating another doc's ownership all manufacture drift. **Exception:** the token atlas — `DesignSystemPM.md` and every `**SOURCE:**`-tagged table states literals on purpose, and `node scripts/check-atlas.mjs` stays green through every commit of this pass.
- **One owner per fact.** A claim two docs both state gets one owner and one pointer; the Ownership Map below assigns them.

#### Formatting Rules

- **Lists are tight** — no blank lines between items, long items included. A blank line appears only between paragraphs and sections.
- **No table or list preamble** when the heading already says what follows; annotation paragraphs trailing a table fold into its cells or rows.
- **Table headers are Title-Case / Train-Case** — "On-Disk," "Token," "Value." (Checker-safe: `check-atlas.mjs` parses cells positionally.)
- **No isolated sentences.** A single-sentence paragraph joins the paragraph it belongs to or wasn't worth recording.
- **No in-sentence colons** outside `**Label:**` forms, `**SOURCE:**` tags, and table cells — the "claim: elaboration" construction restructures into a natural sentence. Baseline counts per file are in the inventory; SymbolsPM (freshly edited) sits at one, untouched docs at fifteen to twenty.
- **American spelling** ("centered," "color," "behavior"), standard apostrophes, no informal register ("wonky," "janks").

#### Structure Rules

- **Every doc opens `## <Name>`** with its lede directly beneath. Eight docs currently open at `###` (Agenda, Architecture, Configuration, NexusRecord, Properties, QuickCapture, Structure, Views).
- **Table of contents, codemap-format** (experimental) — directly below the opening heading, no preamble: the doc's headings as a fenced box-drawing tree without hashtags, annotations omitted. Written last, after each doc's structure settles.
- **`II.` is conditional.** It stays where a heading is a genuine enumerated sub-scope — the parent describes the overall architecture and the `II.` children are its ordered facets (PropertiesPM's type-and-behavior facets under its described opening are the sanctioned shape). It goes where it's rote numbering under a parent that describes nothing. Each file's work order proposes keep/drop; the review adjudicates.
- **Wrapper headings describe or dissolve.** Eleven docs carry a `### Features` (or `### Architecture`) level holding no content of its own. Either the wrapper gains the describing paragraph that legitimizes its children, or it dissolves and the children promote.
- **Tail sections are one vocabulary.** Current spread: Pending / Deferred / Prospects / Known Issues / Not Yet Established / Roadmap (Planned) / Known Minor Issue. Proposed canonical set — **Known Issues** (defects and accepted limitations), **Pending** (designed or accepted work, unbuilt), **Prospects** (ideas and candidates) — with Deferred, Roadmap, and the rest folding in. Naming is Call 1.
- **Not every heading needs children.** A one-table section is the heading and the table; single-sentence sections fold into their parent.

```
Canonical doc skeleton
## <Feature Name>
<lede paragraph>
<ToC block>
### <Section> …            | body sections, ### level
#### II. <Facet> …         | only under a describing parent
### Known Issues / Pending / Prospects
```

---

### Chapter 1 — The Inventory

Verdicts: **light** (mechanical sweep only) · **restructure** (heading/ownership surgery) · **rewrite** (whole-doc repass). The mechanical classes — tight lists, Title-Case headers, preamble removal, colon restructure, isolated-sentence merges, spelling — apply globally and aren't restated per file. Colon and isolated-sentence counts are measured baselines.

| File | Lines | Verdict | `II.` | Wrapper | Colons | Isolated | Spaced Lists |
| ---------------- | ----- | ----------- | ---- | ------- | ------ | -------- | ------------ |
| AgendaPM | 34 | restructure | 1 | yes | 4 | 2 | 0 |
| ArchitecturePM | 198 | restructure | 0 | — | 20 | 8 | 3 |
| CardViewPM | 85 | restructure | 8 | yes | 11 | 0 | 0 |
| CollectionsPM | 54 | light | 6 | yes | 2 | 0 | 0 |
| ConfigurationPM | 70 | restructure | 2 | — | 6 | 0 | 13 |
| ConnectionsPM | 53 | restructure | 6 | yes | 5 | 3 | 0 |
| ContextsPM | 49 | rewrite | 4 | yes | 5 | 2 | 3 |
| DesignSystemPM | 231 | restructure | 0 | — | 8 | 2 | 0 |
| InteractionPM | 157 | restructure | 3 | — | 15 | 4 | 3 |
| MarkdownPM | 194 | restructure | 6 | — | 19 | 3 | 0 |
| NavigationPM | 71 | restructure | 6 | yes | 8 | 5 | 6 |
| NexusRecordPM | 86 | restructure | 6 | — | 19 | 5 | 0 |
| PagePreviewPM | 57 | restructure | 0 | — | 9 | 0 | 5 |
| PageSetsPM | 42 | restructure | 6 | yes | 4 | 3 | 0 |
| PagesPM | 61 | restructure | 9 | yes | 7 | 3 | 0 |
| PommoraDND | 75 | rewrite | 1 | — | 10 | 4 | 0 |
| PropertiesPM | 206 | rewrite | 18 | yes | 14 | 7 | 1 |
| QuickCapturePM | 29 | light | 3 | yes | 2 | 1 | 0 |
| SidebarPM | 53 | restructure | 6 | yes | 6 | 2 | 3 |
| StructurePM | 88 | restructure | 9 | — | 4 | 3 | 1 |
| SubfieldPM | 32 | light | 0 | — | 2 | 0 | 2 |
| SurfacePM | 64 | light | 0 | — | 15 | 2 | 2 |
| SymbolsPM | 60 | light | 0 | — | 1 | 0 | 0 |
| TableViewPM | 106 | restructure | 1 | — | 8 | 1 | 2 |
| TypographyPM | 59 | light | 0 | — | 4 | 2 | 0 |
| ViewsPM | 83 | rewrite | 5 | yes | 17 | 3 | 2 |

#### Work Orders — Editor Cluster

- **MarkdownPM** — Hover Previews leaves for PagePreviewPM (the section says itself the card belongs there); the caret's identity leaves for InteractionPM, one pointer line stays; block-drag chrome specifics yield to PommoraDND. §Non-Obvious dissolves under Call 2 — product-visible facts restate neutrally in their owning sections, maintenance imperatives route to Guidelines or out. §Host Services shrinks to what §Constructs doesn't already say; §Module Shape compresses. The six `II.` atlas facets under §Design System sit under a describing parent — **keep**. Repairs: the mangled Connections-bullet backticks, trailing whitespace, "glyph-centre maths."
- **InteractionPM** — the caret unifies into one home (absorbing MarkdownPM's identity claim); §Edge Fade un-nests from Timing Sources; a Pending section is created for the three status items stranded in the body (spacing/radius Figma lift, the `--io` inset question, the consumerless Out Ease). The Autoscroll split resolves as: behavior prose is PommoraDND's, the SOURCE-tagged tuning table stays here as atlas. The three `II.` headings resolve with the restructure — **drop** (Timing Sources isn't a described enumeration).
- **PommoraDND** — §The Seam sheds its internal-API responsibility lists and failure-surface enumerations; §Relationship to dnd-kit reduces to one neutral clause in the opener; §Autoscroll promotes to its own `###` (**drop** the `II.`); a Deferred/Pending tail is created for the click-or-drag migration, the `onTap` piece, and the mobile spec's disclaimer; §Known Minor Issue renames into the canonical tail. Repairs: "bespokee—."

#### Work Orders — Data Cluster

- **ArchitecturePM** — opens `##`; gains Known Issues + Pending tails (the trash-restore blockquote, the locked-file migration cost, the Settings-editing deferral). The trash/restore/bundle story yields to NexusRecordPM (one sentence and the layout row stay); governed-key wrap detail yields to PropertiesPM/ContextsPM; the property-delete snapshot yields to PropertiesPM. §Nexus layout's eleven bolded paragraphs become honest subsections. Path-separator style normalizes to one form. "Two load-bearing principles" retitles neutrally.
- **PropertiesPM** — the worst structural case. `### Features` / `### Architecture` buckets either take their describing paragraphs or dissolve; the `II.` facets beneath a described parent are the sanctioned shape — **keep the enumeration, fix the parents**. §Where Properties Live's 500-word paragraph splits: the Properties-pane UI spec becomes its own section, the Pending line leaves for Pending. Thirteen "colour" + two "grey" normalize. Chip Tokens atlas tables untouched beyond header caps.
- **NexusRecordPM** — becomes the single owner of the trash/restore record (receiving Architecture's version). §The Sweep's Two Laws yields its fan-out mechanics to Architecture/Properties, keeping what the record itself owns; a Known Issues tail is created for the two named costs in the body. `II.` × 6 — **drop** (Provenance/Baseline aren't described enumerations; they restructure as the doc's two halves). The alternatives-considered rationale paragraphs go.

#### Work Orders — Design & View Cluster

- **DesignSystemPM** — §Source of Truth folds into the opener; the stacking-ladder paragraph moves from §Tooling to §Geometry; §Icons folds into §Where the Rest Lives; scrollbar hiding and the Liquid-Glass swallow workaround move to a Known Issues tail; the inactive-token body copy dedupes into its Pending bullet; §Materials' trailing paragraphs fold or re-home. Twelve atlas header rows Title-Case; literals untouched.
- **TableViewPM** — §Groupings promotes to `###` (**drop** the `II.`); §Non-Obvious dissolves (the sticky-header fact re-homes to Groupings, the Chromium repaint workaround to Known Issues, the rest is mechanism narration and goes); the Prospect-stated group-band "+" dedupes to its owner (ViewsPM). "Neighbours" / "off-centre" normalize; the shouted-caps register goes.
- **CardViewPM** — `### Features` dissolves, the eight facets promote to `###` (**drop** the `II.` — the wrapper describes nothing). Sort-By-Location semantics and the sort-retire rule yield to ViewsPM; the seam-law prose yields to TableViewPM (both keep their own atlas token rows); a Known Issues tail receives the merge-candidate note and the zoom-floor multi-select behavior. Repairs: the garbled "a value Compact drops mid-edit dismisses animated."
- **ViewsPM** — opens `##`; wrapper dissolves; the persisted-keys paragraph and the filter-operator matrix become tables; the write/refetch paragraph yields to ArchitecturePM; renderer-status claims dedupe into Pending; Pending/Prospects convert from bold-paragraphs to bullets. Becomes the owner of the view-generic facts (sort-retire, Location mode, the group-band "+" Pending, renderer status).
- **TypographyPM** — ramp preamble goes (charter cite compresses beside SOURCE); the two trailing annotation paragraphs fold into rows; the emphasis blockquote goes; "display step — defined, no consumer" cells compress into one Not Yet Established line (section renames to the canonical tail); the editor-zoom exception reduces to a MarkdownPM pointer.
- **SymbolsPM** — already the exemplar. Residue: six flagged sentences, the resolution-order stated twice (once), `link-2`'s reserved-unrendered state moves to the tail, §Misc renames honestly, ragged pipes realign.

#### Work Orders — Content-Model Cluster

- **StructurePM** — the aggressive shrink (Call 3): keeps the PARA mapping table, the two-layer statement, and pointers; §On-Disk Model and §The NexusTree Contract leave for ArchitecturePM, §Settings for ConfigurationPM, the Homepage config claim for ConfigurationPM/SurfacePM; the per-entity restatements reduce to table rows + pointers. Opens `##`; `II.` × 9 — **drop** with the restructure.
- **ContextsPM** — full repass: every list tightens (all three are blank-line separated); §Index's status paragraph merges into its existing Pending twin; the Pipeline bullet yields to ViewsPM/TableViewPM; the Space-settings aside reduces to a ConfigurationPM pointer. Owns the membership grammar outright. "Behaviour" normalizes.
- **CollectionsPM** — becomes the owner of schema inheritance, move semantics, open-in routing, and container CRUD; the nexus-wide-delete sentence and restore-cache paragraph yield to PropertiesPM; the Set-landing rule to PageSetsPM. Wrapper + `II.` × 6 resolve with the restructure; a Known Issues tail is created if the delete-atomicity note stays here.
- **PagesPM** — owns title-as-filename, collision behavior, and the `modified_at` stamp rule; §Connections compresses to a pointer line; §Outline rebalances (its InteractionPM/MarkdownPM detail leaves); the legacy-separator strip goes to Known Issues. `II.` × 9 — **drop**.
- **PageSetsPM** — single-sentence sections fold into the lede; the reparent/Back-nav hole merges into its existing Pending twin; duplicated move/inheritance/CRUD claims reduce to CollectionsPM pointers, keeping only "inherits whole, adds none" as its own identity.
- **AgendaPM** — opens `##`; the De-scaffolded blockquote dissolves into Pending's rethink entry (port references out — here and in StructurePM); §Architecture's wrapper dissolves; the kind-law restatement reduces to its two filenames + an ArchitecturePM pointer.

#### Work Orders — Shell & Surface Cluster

- **SidebarPM** — wrapper dissolves, six facets promote (**drop** `II.`); the shipped-then-removed read-path history goes; persistence claims (`sidebarMode`, ribbon order, ⌘E) reduce to ConfigurationPM pointers; the ellipsis/hover-scroll primitive's ownership goes to DesignSystemPM with a pointer here. Four British spellings normalize.
- **NavigationPM** — wrapper dissolves; §NavPane merges into its Pending twin; the NavWindow-flavor account reduces to a sentence + PagePreviewPM pointer; ghost-crumb and List/Gallery-toggle claims reduce to SubfieldPM pointers; the settled rail-toggle behavior moves out of Pending into the body; the token-family merge note moves to Pending.
- **ConfigurationPM** — opens `##`; §Write Discipline promotes to top level (it governs every settings write); the Knobs roster tightens (thirteen gaps — the densest list violation in the set) and gains the `subfield` key SubfieldPM declares but this roster omits; round-trip-test and no-writer build-state prose merges into Pending; three "colour" normalize.
- **PagePreviewPM** — receives MarkdownPM's Hover Previews; the tab-strip paragraphs re-home from §The Window to §The Tab Model; the Inspector's footer paragraph yields to SubfieldPM; hover-card chassis detail yields to MarkdownPM's pointer the other way. §The Window's Token Contract **stays as prose description per the PM-093 routing** (Call 4), shedding only its mechanism narration. Owns the NavWindow flavor and window geometry.
- **SurfacePM** — Pending/Prospects promote from `####` to `###`; the remaining Tile-Types gap tightens; the watcher sentence yields to ArchitecturePM; the alignment-law paragraph stays but sheds its parenthetical mechanism asides.
- **SubfieldPM** — the v1 blockquote collapses into the tail; §Roadmap (Planned) renames to the canonical tail; receives PagePreviewPM's footer paragraph as the scoped-mount owner; "wonky"/"janks" reword; heading parentheticals Title-Case.
- **QuickCapturePM** — opens `##`; wrapper + `II.` × 3 resolve; tense unifies (the banner owns the intended-design framing; the body reads flat present under it); §Single-Owner Principle shrinks to the courier rule + an ArchitecturePM cite.

#### The Ownership Map

| Fact | Owner | Pointers From |
| ------------------------------------------ | -------------- | ----------------------------- |
| Schema inheritance · move semantics · container CRUD · open-in mode | CollectionsPM | Structure, PageSets, Pages |
| Title = filename · collisions · `modified_at` rule | PagesPM | Structure, Connections |
| Connection states · ambiguity · body-canonical | ConnectionsPM | Pages, Structure |
| Membership grammar · Space links · registry order | ContextsPM | Structure, Sidebar |
| Kind-from-sidecar law · foreign keys · watcher/echo · content index · banner assets | ArchitecturePM | Agenda, Structure, Contexts, Views, Connections, Surface |
| Trash record · bundle · restore resolution | NexusRecordPM | Architecture (one line stays) |
| Property delete/remove user outcomes | PropertiesPM | NexusRecord (record shape stays), Collections, Architecture |
| The caret | InteractionPM | MarkdownPM |
| Insertion-line law · drag chrome · autoscroll behavior | PommoraDND | Navigation, MarkdownPM, InteractionPM |
| Autoscroll tuning table (atlas) | InteractionPM | PommoraDND |
| Seam law prose | TableViewPM | CardView (token rows stay both) |
| Sort-retire · Location mode · renderer status · group-band "+" | ViewsPM | TableView, CardView |
| NavWindow flavor · window geometry | PagePreviewPM | Navigation |
| Ghost crumb · List/Gallery toggle · scoped local-body counts | SubfieldPM | Navigation, PagePreview |
| Personalization knobs (incl. `connectionsOpenInPreview`, `sidebarMode`, ⌘E) | ConfigurationPM | Sidebar, Navigation, PagePreview |
| Ellipsis → hover-scroll primitive | DesignSystemPM | Sidebar, PagePreview |

---

### Chapter 2 — Versioning + The PRD

Scoped now, executed after Chapter 1 — the ownership map and trued pointers feed both documents.

- **VersioningPM** rewrites to its Studio-Documentation FORMAT: `## Pommora — Versioning` opening, EXISTING IMPLEMENTATIONS as per-version entries with summaries (the current arc-bullet list maps against HistoryPM to reconstruct version boundaries), UPCOMING VERSIONS carrying v0.6.0 → v1.0.0 as written, and the §Guidelines footer added. The `### II. Upcoming` prefix goes; the duplicated "order and grouping firm up" line states once; completed work reads past-tense; the index-deletion history in the query-consumer section restates neutrally; "recognises"/"colour" normalize.
- **PommoraPRD** normalizes under the same charter: the Why list tightens, the Agenda section's twice-stated inherited-shape line states once, tense-mixed build-state claims ("Specified, not built," "the panel ships; its body is empty") route to Versioning or restate neutrally, stale claims verify against current truth (the Collections section's "table / gallery" renderer claim predates Cards), the §Guidelines footer lands, and the curly apostrophe repairs. The checked-off Prospects/Ideas entries are Call 6.
- Both documents' Feature-doc pointers re-verify against the post-Chapter-1 tree.

---

### Sequencing

1. **Ratify** — this document reviews with Nathan; the calls below settle.
2. **Mechanical sweep** — the global formatting classes across all 26 docs, one commit per cluster, `check-atlas.mjs` green each time. All commits pathspec-scoped (`git commit -- <paths>`) while the parallel session holds the tree.
3. **Structural pass** — the work orders, cluster by cluster; ownership moves land with both sides in one commit.
4. **ToC blocks** — written last, once each doc's headings are final.
5. **Chapter 2** — Versioning, then the PRD.
6. **Deployment** — the ratified charter fills Studio-Documentation.md's empty §Features section (Call 7).

### Calls

1. **Tail vocabulary** — canonical trio proposed as Known Issues / Pending / Prospects. You named "Deferred" as a sanctioned home; if Deferred is the keeper, Pending folds into it instead. Pick the name.
2. **Non-Obvious dissolution** — MarkdownPM and TableViewPM carry §Non-Obvious annexes. Product-visible facts restate neutrally in their owning sections; the maintenance imperatives ("re-validate offsets if the parser is swapped") either move to a Guidelines file or go entirely. Recommendation: a `Guidelines/Editor-Internals.md` for the genuinely hard-won traps, deletion for the rest.
3. **StructurePM's shrink** — the hub doc reduces to the PARA map, the two-layer statement, and pointers (~half its prose is lower-fidelity restatement of its children). Sign off on the aggressive version or name what it keeps.
4. **PagePreview's token section** — the PM-093 routing said PagePreview "contains the description rather than verbatim"; the inventory recommends removing the section entirely. Recommendation: your routing stands — keep it as trimmed prose.
5. **`II.` adjudications** — each work order proposes keep/drop under the conditional rule; review them at execution rather than pre-ratifying each.
6. **PRD residue** — the Prospects/Ideas checklists carry checked-done entries and NexusOS wiki-links. Remove the completed entries, or keep the checklist form?
7. **Charter deployment** — after the pass survives execution, the standard lands in Studio-Documentation.md §Features as the Studio-wide rule. Confirm that's the intended destination.
