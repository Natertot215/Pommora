## Property Syntax Unification — Decision Log

### Frame

- **Purpose:** Page property values leave the ULID-keyed `properties:` map and become wrapped, name-keyed entries at the frontmatter root — the shape Contexts already use — so one syntax governs every Pommora-owned frontmatter key.
- **Core Value:** A page's frontmatter reads as that page's attributes in plain language, with no machine identifiers and no wrapper map, while every property definition keeps the configuration it carries today.
- **Success Criteria:** Frontmatter for a page carrying a Context and three properties reads end to end with no registry lookup; every per-type customization survives untouched; a rename never loses a concurrent edit and never leaves a value invisible; and the change is a net reduction in both code and mechanism count.

### Sources

- `.claude/Features/Properties.md` — the three-layer model (definition → assignment → value), type catalog, schema mutations, the non-uniqueness of names.
- `.claude/Features/Contexts.md` — registry model, title-keyed membership, the rename cascade.
- `.claude/CLAUDE.md` — the storage line ("the line for content runs at assignment"); docs-name-code-holds-exacts; no-empties.
- Contexts decision log, entries A-4 / A-8 / A-9 / A-10 / A-11 and its Considered & Rejected list — `git show 'bfebc33d^:.claude/Planning/Contexts & Spaces — Decision Log.md'`. A-8 states the sigil's purposes; the rejected list records the choice of name-keyed root frontmatter over properties-map unification.
- `src/shared/contexts.ts` · `contextResolve.ts` · `crud/contextWrite.ts` · `crud/contextCascade.ts` · `crud/contextJournal.ts` — the existing governed-key implementation.
- `src/shared/propertyValue.ts` — the shape-classification codec and the value write rule.
- `src/main/crud/removeProperty.ts` — `reconcileCachedValue`, the second on-disk decoder.
- `src/main/crud/optionOps.ts` — `renameOption`, the registry-only rename precedent.
- `src/main/io/pageFile.ts` — `mergeFrontmatter`; the set/delete-only writer that preserves foreign keys and comments.
- `src/shared/schemas.ts` · `views.ts` · `io/propertiesRegistry.ts` · `crud/registryProperty.ts` — the stored shapes.
- `~/NexusOS` and `~/Test` — read directly for real on-disk bytes and counts.

### Decisions

#### A — Ground Truth

- **A-1:** [confirmed] Page property values live in a nested `properties:` map keyed by `prop_<ULID>`; the registry is `.nexus/properties.json` = `{ order: string[], defs: { propId → def } }`.
- **A-2:** [confirmed] Property names are **deliberately non-unique** today — both registry write paths opt out of the uniqueness check, with a test asserting twin names are legal. Agenda's own definitions keep the unique rule.
- **A-3:** [confirmed] A property rename is a **single registry write with zero cascade**; members are ULID-keyed so nothing propagates.
- **A-4:** [confirmed] Contexts are name-keyed at the frontmatter root behind a sigil; values are **bare Space titles in an array**, never ids.
- **A-5:** [confirmed] **Context values carry no wrapper.** The docs' `"[Projects]": [Pommora]` is YAML flow shorthand for a one-element array; the serializer emits a block sequence of bare titles.
- **A-6a:** [confirmed] **The sigil governs; the registry registers. They are different questions and the sigil answers only the first.** A wrapped key is *Pommora's* — that is what makes it safe to sweep, safe to hide from Obsidian's panel, and distinguishable from foreign frontmatter. It does **not** make it a property. A key registers as a live property value only when its name matches a definition in `.nexus/properties.json`, whose ULID is what every other layer then references. `<Whatever>` with no matching definition is inert: preserved by value, read by nothing (`H-5`). This mirrors the Contexts rule exactly — a bracketed key registers only on an exact registry title match — and it is why C-5's uniqueness is structural rather than cosmetic.
- **A-6:** [confirmed] The sigil buys four things, all load-bearing: it partitions the keyspace so no reserved-word blocklist is needed; it keeps the walk's key retention **registry-independent**, so a registry edit never busts the parse cache; it lets a root rewrite sweep governed keys by shape alone, preserving foreign keys and comments; and it gives Sapphire a single prefix rule to hide them all.
- **A-7:** [confirmed] Today's Context rename is a journaled three-scope cascade with crash replay — the price paid for name-keying, and the thing S-3 shows a property rename does not need.
- **A-8:** [confirmed] `properties: {}` is written into every new page — an empty map violating the no-empties rule, present on 33 live pages.
- **A-9:** [confirmed] The on-disk encoding has **two production decoders**: the shape-classifying codec, and `reconcileCachedValue`, which decodes `$status` and `$ctx` by hand against the definition's current type. The second is documented as a deliberate non-reuse — the shape-blind codec would re-infer a select value like `2024-01-01` as a date and destroy it.
- **A-10:** [confirmed] Contexts and Properties are mirror images. Contexts pay a rename cascade to buy file legibility; Properties pay file illegibility to buy free renames. They share no code.

#### B — The Syntax

- **B-1:** [confirmed] **A Pommora-governed frontmatter key is wrapped in a single non-YAML delimiter**: `(Context)` for the organization layer, `<Property>` for the attribute layer. Two sigils, so a Context and a property may share a name without colliding.
- **B-2:** [confirmed] **Neither glyph is a YAML flow indicator, and that is the whole point.** Verified by execution across representative names: `[[…]]` and `{{…}}` produce **zero** clean parses and silently mangle almost everything — an unquoted key parses with no errors into a collection node that never matches, and the next ordinary write rewrites the line into explicit-key form, permanently. `(…)`, `<…>` and `/…/` parse clean unquoted every time and strip bijectively even when the name contains the closing glyph. So Pommora writes the key **plain**, and what the app writes and what a person types are byte-identical. There is no quoting invariant because there is nothing to quote.
- **B-3:** [confirmed] **`[[…]]` is reserved and unused here** — kept free in case Connections ever move into frontmatter, and because in a dual Obsidian vault a wikilink is a *value* (`Projects: - "[[NexusOS]]"`), so a `[[…]]` key would read as the same construct in a different position.
- **B-4:** [confirmed] **Values stay bare.** No wrapper. Native YAML types — number, boolean, timestamp — survive on disk and stay readable to every tool. Context values remain arrays of bare Space titles.
- **B-5:** [confirmed] **The `$status` and `$ctx` tagged shapes are removed.** A named key answers the question the tag existed to answer, so a status value stores as its bare label. The removal must include `reconcileCachedValue` (A-9): its `status` case is live, and leaving it decoding an object shape nothing writes would silently drop every cached status value on re-assign.
- **B-6:** [confirmed] **Foreign frontmatter stays invisible on purpose.** A bare `Projects:` from Obsidian never resolves. The sigil is the isolation boundary in both directions, and Sapphire's hide rule covers Pommora's keys by prefix.
- **B-7:** [confirmed] The new keys need **no schema work** — page frontmatter is a loose object already carrying dynamic per-nexus keys unmodeled, which is how Context keys ride today.
- **B-8:** [confirmed] **Agenda item values take the same wrapped keys; agenda's definitions stay a separate namespace.** The shape change is free — agenda values run through the same writer as pages, and **neither nexus holds a single agenda item**, so there is nothing to convert. What stays separate is the *resolution*: an agenda value resolves against its kind's own `property_definitions`, so an agenda property and a page property may share a name with no collision, and a rename on either side never reaches the other's files. JSON quotes every key, so the unquoted-key property is YAML-only.
- **B-9:** [confirmed] **An agenda-definition rename needs its own sweep over `.task.json` / `.event.json`, and it defers.** Agenda's schema ops have no IPC handler at all — they are parked scaffold for the pending Agenda Status feature — so no reachable path can rename an agenda definition today. The sweep lands with those ops, using the same commit-then-sweep shape.
- **B-10:** [confirmed] **`folded_headings` leaves the modeled page keys with `properties`.** It is declared in the frontmatter schema and listed in the modeled set with **no reader and no writer** anywhere in the source; folds live in `nexus.db`, and no file in either nexus carries the key. It is inert rather than hazardous — the modeled set has a single consumer, page creation, and every other write path passes its own inline key list — but a schema field nothing reads or writes is dead weight in a list this change is already opening.

#### C — Identity & Keying

- **C-1:** [confirmed] **ULIDs stay in `properties.json`.** The definition keeps its stable id.
- **C-2:** [confirmed] **Only page frontmatter and agenda item values speak names.** Collection sidecar assignment lists, `property_cache`, and SavedView configs all stay ULID-keyed. The view configs are **nine** propId-keyed fields — column order, hidden set, widths, alignments, styles, sort criteria, the recursive filter rule tree, group, and sub-group — and they are also embedded in block documents inside `nexus.db`, so name-keying them would make a file sweep write into the database. Two of those fields carry sentinels rather than real ids, so propId-keyed never implies a registry lookup succeeds.
- **C-3:** [confirmed] **`property_cache` is already rename-immune, for free** — keyed by property id with page ids inside, and restore fetches the definition by id and revalidates against its current type. Name-keying it would make a rename-proof structure fragile and then require cascade scope to manage the fragility. It is also a derived cache, which the storage line places in the database rather than in hand-readable JSON.
- **C-4:** [confirmed] **The sidecar's shape does not change.** Within the id constraint there is nothing legible to gain: a name stored beside each id reintroduces the drift ids prevent, and a regenerated display hint is stale the moment anything renames. The `prop_` prefix says what the id is and the registry sits one file away holding the mapping.
- **C-5:** [confirmed] **Property titles are unique nexus-wide, case-folded. Duplicates are not allowed, and this is not a tradeoff.** The title *is* the resolution key: a frontmatter key carries a name and nothing else, so two definitions sharing a title would leave that key unresolvable. Uniqueness is what makes the format work, not a policy accepted alongside it. It is enforced on create and on rename, against the whole registry.
- **C-6:** [confirmed] **Option values are siloed per property** — two properties may each carry an option named "Active", because options live on their own definition and resolve only through it. Already true; no change.
- **C-7:** [confirmed] **A name is trimmed and NFC-normalized once, at write.** Validation already computes the trimmed form and discards it, persisting the raw string. Normalizing at the single write point means an untrimmed name cannot exist, which retires any question of whether key parsing trims. Contexts share the rule.
- **C-8:** [confirmed] The registry's `order` array **stays**; it drives pickers and column ordering.

#### D — Validation & Reserved Syntax

- **D-1:** [confirmed] **One module owns the reserved syntax, and every consumer reads from it** — the sigil pair, key build and parse, the governed-key predicate, the reserved leading `$`, whatever the validators refuse, and every refusal message. Changing a glyph must be a one-line edit cascading to identification, indexing, validation and error text without a sweep. Today that knowledge is spread across the contexts module, three validators, and message strings written inline at their throw sites; consolidating it comes first, because it is what makes B-1 cheap to revisit.
- **D-2:** [confirmed] **A leading `$` is refused on names**, reserving `$`-prefixed keys for system-assigned roles — the convention the `_`-prefixed reserved ids already use. The motivating case is marking an ordinary Select as Agenda's status property rather than shipping a pre-configured one. Interior `$` stays legal, so "Budget ($)" survives.
- **D-3:** [confirmed] **No leading-`_` ban.** The wrap is the namespace boundary: reserved ids appear only unwrapped, in view configs that stay ULID-keyed, so a property named `_title` writes `<_title>` and can never meet the reserved `_title`.
- **D-4:** [confirmed] **Character bans are scoped to what the sigil actually needs.** Positional stripping is unambiguous even for a name containing the closing glyph, and the writer quotes defensively when a name contains `: ` or ` #`, so a blanket ban on brackets and braces in names and option values earns nothing. What survives is the `$` reservation plus the existing basename rules for entity titles.
- **D-5:** [confirmed] **The three overlapping validators become one core with thin wrappers.** Property names go through a validator with **zero** character bans today; the file-basename validator that does carry bans never sees a property name; and the Context-title validator re-implements a subset of the basename rules while its own comment claims it shares them.
- **D-6:** [assumed] **A rename onto an existing name fails rather than disambiguating.** Contexts disambiguate on *create*; a rename is an explicit act on a string the user typed, so it reports the clash. Create may still disambiguate.
- **D-7:** [confirmed] **This change introduces validation with nowhere to surface.** A failed rename closes its field before the call and reports through a native OS dialog, so the typed text is gone; the editable input has no error state; and the closed `ErrorCode` union never reaches the renderer because the boundary flattens every failure to a message string. The renderer already holds the full registry, so both new guards are answerable locally with no round trip — which means preventing the failing call, not reporting it. The surface is scoped separately and does not gate this work.

#### E — Storage of Definitions

- **E-1:** [confirmed] **Moving definitions to `nexus.db` is sanctioned** by the storage line, and this change makes it materially safer: once frontmatter is self-describing, losing the registry costs presentation config rather than making every stored value undecodable.
- **E-2:** [confirmed] **A hard prerequisite exists.** The database is deleted and recreated empty on any schema-version mismatch; there is no migration path, because nothing in it has ever been worth migrating. Definitions cannot move in until that changes.
- **E-3:** [confirmed] **Do not reshape `properties.json`** while that move is on the roadmap. Ordering becomes a column and both the `order` array and the `defs` map dissolve together.

#### F — Migration

- **F-1:** [confirmed] **No migration code is written.** One user; the affected files are converted by hand. Nothing is built to read, detect, or convert the outgoing shape.
- **F-2:** [confirmed] **Outgoing data goes inert for free** — verified by execution. Once `properties` leaves the modeled key set, an unconverted map is an ordinary foreign key: the writer only sets and deletes named keys and never reconstructs the document, and a legacy map survives every narrow write path verbatim. This is the ruled `tierN` posture and requires no code.
- **F-3:** [confirmed] **The surface is 39 files plus the sidecar cache blocks** — 6 pages carrying real property values, 33 carrying an empty `properties: {}`, and every collection sidecar holding a `property_cache` block (J-3). `~/Test` has no page values. No live file carries `$status` or `$ctx`.
- **F-4:** [confirmed] **The Context half is free.** Both live nexuses carry zero wrapped context keys — nothing has ever written one — so the Context sigil is still costless to choose, and gets more expensive with every context assignment made before it lands.

#### G — Read Path

- **G-1:** [confirmed] **Values keep loading lazily per container, not at walk.** The walk resolves Context keys for every entity because they are cheap and registry-independent; property values load when a container opens. Resolving them at walk would be more uniform and is the trap — it puts per-entity work on the read path the hard rules forbid.
- **G-2:** [confirmed] **One id→definition index per container, built once**, riding the existing resolve context. The direction matters: value resolution is called *with* a property id and needs the definition to learn the name it writes under, so a name→definition map would be unusable. A per-cell linear scan of the schema is already the measured hot spot, and the same index retires roughly two dozen of them.
- **G-3:** [confirmed] **The value memo needs its key revisited.** It is keyed by frontmatter object identity plus property id; once the read goes through a name, a rename that does not swap the frontmatter identity would serve a stale value.

#### H — Rename

- **H-1:** [confirmed] **A rename is instant and cascades.** No intermediate state renders: the tree re-reads once the mutation returns, and the displayed label is a read of the definition.
- **H-2:** [confirmed] **A rename is the registry commit, then one sweep.** Commit the registry to the new name, then sweep `.md` once: on each page, **if the new key is present, drop the old; otherwise rename old → new.** The IPC awaits the sweep, so the renderer never observes a partial state.
- **H-3:** [confirmed] **The new key always wins, and it needs no comparison to know that.** Because the registry switched first, every value write during the sweep resolved the *new* name and wrote the new key. A page holding both therefore holds a fresh value under the new key and a stale one under the old — always, with no second case. The sweep needs no timestamp, no manifest and no policy argument, because there is only ever one window.
- **H-3a:** [confirmed] **Two windows cannot be told apart, which is why there is only one.** An expand-then-merge shape — plant the new key everywhere, commit, then fold back — creates two windows with opposite answers: a write before the commit lands on the old key and is newer, a write after it lands on the new key and is newer. Both are bare scalars; nothing on disk records which key moved, and no-empties makes a deliberate clear byte-identical to "never written". A fold-back would destroy every post-commit edit and resurrect every post-commit clear. Committing first collapses both windows into one and removes the question rather than answering it.
- **H-3b:** [confirmed] **The cost is a brief invisibility, not a loss.** Between the commit and a page being swept, that page's value sits under a key the registry no longer names, so it does not render. The sweep is sub-second over a few hundred files and the IPC awaits it, so no user observes it; and after a crash the value is intact on disk, under its old name, in plain language. Invisible-and-recoverable is the trade against silently-destroyed, and the Success Criteria demand a rename never lose a concurrent edit.
- **H-3c:** [confirmed] **The rename joins the schema-op chain.** Today it runs on the registry file's own chain while assign, remove, delete and the option cascades run on the shared one — harmless while a rename touched no files, and unsafe the moment it sweeps. An option cascade interleaving with a rename sweep writes the old key onto already-migrated pages. The chain's own note says serialization costs nothing for ops this rare, and moving the rename onto it closes rename-against-remove, delete, option-cascade and rename in one line.
- **H-3d:** [confirmed] **The open view must refetch values when a rename lands.** The values snapshot is fetched once per container open, keyed on the container path, and deliberately never re-reads mid-session. A rename does not change that path, so a mounted view would keep frontmatter carrying the old key while the schema names the new one — blanking the whole column until the user navigates away and back. Left unfixed this is not cosmetic: a user seeing an empty column retypes the values, which is precisely the concurrent-edit case.
- **H-4:** [confirmed] **No journal, no replay, no rollback.** The journal exists for Contexts because a Context rename also renames a *folder*, leaving a state nothing in the data records. A property owns no folder, so a crash leaves only "some files updated, some not" — visible on disk in plain language and healed by re-running. The option rename, the true sibling as the other registry-only rename, already works exactly this way.
- **H-5:** [confirmed] **An unmatched wrapped key persists inert and is never dropped.** Stated as a rule rather than left as an emergent property of the writer. This is what makes the sweep safe to re-run and an interrupted rename readable rather than lost.
- **H-5a:** [confirmed] **An orphan surviving a crash and then being inherited by a reused name is accepted, not guarded.** It needs a crash inside a sub-second sweep, then a later property created under the exact abandoned name, and it yields readable values on a page rather than corruption. Guarding it would cost a full-nexus scan on every property create and rename — expensive machinery for a three-step coincidence in a single-user local app. A page whose frontmatter is too malformed to parse is skipped by the sweep for the same reason it is already broken everywhere else; that is not this change's problem to report.
- **H-6:** [confirmed] **A page-property rename sweeps `.md` only.** Agenda values resolve against a separate namespace, so a registry rename never reaches them — the nexus-wide property delete already works this way. Sidecars stay out because C-2 keeps them ULID-keyed.
- **H-7:** [confirmed] **Nothing orders a value write against a rename.** The value write takes only a per-file lock; a property rename runs through the registry file's own separate chain and does not take the schema-op chain at all. There is no shared serialization point — which is precisely why H-2's ordering and H-3's merge carry the safety instead of a lock.
- **H-8:** [confirmed] **No frontmatter key is built renderer-side except for the optimistic patch.** The value-write path holds no registry reference, so main resolves the name inside the file lock — the pattern Contexts already use. The rename path ships the new name because that is the operation.
- **H-9:** [confirmed] **Foreign frontmatter and comments survive untouched**, because the writer never reconstructs the document. Verified by execution.

#### J — Consequences of the Bare Status Value

- **J-1:** [confirmed] **Making a status value bare silently degrades three Status behaviours, and none of them errors.** The read side re-tags a shape-guessed string to its column's declared type, but its lookup table holds only `url`, `select` and `datetime` — status was never in it, because the tagged object made status unambiguous. Remove the tag and every Status cell resolves as a select: the chip renders as a **label instead of a pill** (from the one helper whose own comment says it exists "so no surface renders a status as a label by accident"), and the **Capsule and Checkbox looks stop rendering**, both gated on the value's kind. Per-option colours and labels survive, because option lookup searches both option sources by column id; sorting, grouping and filtering survive, because they dispatch on the declared type.
- **J-2:** [confirmed] **The redundant value tag goes, as a consequence of K-1 rather than as a fix.** `PropertyValue.kind = 'status'` is an in-memory discriminant that never touches disk. It is already redundant: four of its production sites read `select || status` — treating them identically — and the picker *constructs* the tag from `def.type`, so the declared type is already its source. A type-directed decoder derives the kind from the type by construction, at which point a tag byte-identical to select and sourced from the same place carries nothing. The three Status looks key off the declared type, which the cell computes one branch earlier.

  **Status as a property type is untouched** — the type, its `status_groups`, the grouped option editor, per-option colours, the pill chip and the Capsule and Checkbox looks all survive exactly as they are. What is removed is a runtime copy of a fact the schema already holds.
- **J-3:** [confirmed] **The remove-cache stores the raw on-disk encoding, so it inherits the same break.** A Status value cached before the change decodes to null afterwards and is **silently skipped** on restore. `~/NexusOS` carries a `property_cache` block on one collection sidecar; it holds an empty `values` map today, so live exposure is zero — but the window stays open until this lands. Sidecar cache blocks join the hand-conversion surface, and that empty `values: {}` is the same no-empties violation as `properties: {}`, written unconditionally by the same code path.

#### K — The Decoder

- **K-1:** [confirmed] **One type-directed decoder replaces the shape-blind codec.** The value codec guesses a value's type from its shape, and that single fact is why two other decoders exist: the read-side re-tagger corrects its guesses, and the remove-cache decodes by hand precisely because the shape-blind codec would re-infer a select option like `2024-01-01` as a date and destroy it. A named key resolves to its definition before the value is read, so the guess becomes unnecessary — and the codec has exactly **one** production call site, where the schema is already in hand. All three collapse into one type-directed decoder, permanently closing the duplication J-3 shows is a silent-data-loss trap.

  The read-side re-tagger exists only to correct the guess, and the hand-rolled cache decoder exists only to avoid it. Neither has a reason once the guess is gone.
- **K-1a:** [confirmed] **The merge names its loser: read's leniency wins, and restore's strictness becomes a named argument.** The two decoders diverge on three axes, not one — option membership, raw-JS-type strictness, and emptiness rejection — and thirteen of seventeen cases differ. Taking restore's semantics for reads would kill the raw-value fallback that renders a value whose option was edited outside the app; taking read's for restore would break its stated contract that a restore never plants a value the schema cannot validate. One decoder with a `strict` flag: restore passes it, the read path does not.
- **K-1b:** [confirmed] **The rule scopes to `status` alone; `kind: 'context'` is exempt.** Status is redundant because the declared type is derivable wherever the value is read. Context is not: the type resolver is called without the Context id list on that path, so nothing downstream can derive it from the schema, and the resolved kind is the only reliable Context test. An implementer applying J-2 uniformly would break Context cells.
- **K-2:** [confirmed] **It is also the reduction's safety margin, not a bonus.** With it, the change removes roughly 222 lines against ~111 added. Without it, 182 against ~111. The added column is the estimate; if it comes in at double, the attributable net stays negative with the decoder and turns positive without it.

#### I — Removal

The rework's second half. Cutting what the change makes obsolete is not cleanup deferred to later — it is the half that makes this a net reduction, and it runs once the new path is green.

- **I-1:** [confirmed] **`properties` is scrubbed from frontmatter entirely** — out of the modeled key set, out of the frontmatter schema, out of the writers on both pages and agenda items, and off disk in the hand-conversion pass. No key, no empty map, no reader.
- **I-2:** [confirmed] **`folded_headings` is removed.** Declared in the frontmatter schema and listed in the modeled key set with no reader and no writer anywhere; folds have lived in `nexus.db` since that migration. It is a dead entry in the one list that decides which keys count as foreign.
- **I-3:** [confirmed] **The tagged value shapes go, everywhere.** Both codec branches, the second hand-rolled decoder, and the `type` parameter they thread through the page-value writers and their option-op call sites.
- **I-4:** [confirmed] **Two write paths become one, and the loser is deleted** — not left beside its replacement. The same for the three validators and the three sidecar read-modify-write implementations.
- **I-5:** [confirmed] **Stale documentation is deleted rather than annotated.** Roughly sixty statements across fifteen docs describe the outgoing format, a registry-only rename, or non-unique names. Each is restated as durable truth so a fresh reader cannot tell the old version existed.
- **I-6:** [confirmed] **`History.md` is reframed.** Its entries carry forward-looking claims as standing invariants — an entry stating that values stay ULID-keyed in frontmatter reads as current truth rather than as what that release did. Dated entries record what shipped; they never assert what remains true. This change takes its own newest-first entry above them.
- **I-7:** [confirmed] **The PRD's identity claim is reframed, and the reframe is stronger than the sentence it replaces.** "Connections are ID-keyed; Context links are the deliberate exception" described a resolver and a SQLite index that no longer exist — connections resolve through an in-memory title map, and the database holds two tables, neither about content. The slot the sentence occupies is real, so it states the truth instead: **no on-disk reference carries an id.** A body connection is a title, a Context link is a title, and a property value sits under its property's name — each resolved at read time, each held correct across a rename by a sweep over the files that hold it. The "deliberate exception" framing dies with it; there is no exception, because there is nothing to be an exception to.

### Core (must-have)

- The reserved-syntax module (D-1) — first, because everything else reads from it.
- Wrapped name keys at the frontmatter root: `(Context)` and `<Property>`, values bare. Contexts migrate off square brackets.
- Property titles unique nexus-wide, case-folded, normalized once at write — enforced on create and rename. Registration is a registry title match, never the sigil alone (`A-6a`). The `$` reservation; three validators collapsed to one core.
- ULIDs everywhere except page frontmatter and agenda values.
- One governed-root-key writer serving both sigils, replacing the two separate write paths.
- A rename over `.md`: the registry commits first, then one sweep where the new key always wins. No journal, no replay, no rollback.
- `$status` and `$ctx` out of the codec **and** out of `reconcileCachedValue`.
- A per-container name→definition index; the value memo re-keyed.
- **The removal half (I-1 … I-7)**, run once the new path is green. It is not follow-up work; it is what makes the change a reduction rather than an addition.

#### Prospects (allowed later, not now)

- **Definitions in `nexus.db`** — sanctioned and made safer by this change; gated on E-2. Don't-foreclose: leave `properties.json`'s shape alone so the table replaces it wholesale.
- **SavedViews in `nexus.db`**, and the database↔sidecar interaction it introduces. Don't-foreclose: keeping views ULID-keyed means no sweep reaches into the database, so the move stays additive.
- **Connections in frontmatter** — why `[[…]]` stays reserved (B-3).
- **Agenda's own definitions** (B-8).
- **A `$`-prefixed system role on an ordinary property** — the reservation D-2 protects.
- **An inline field-error surface** (D-7) — its own spec.

#### Out of Scope (won't do)

- Migration, detection, or dual-read code for the outgoing shape (F-1).
- Resolving property values at walk (G-1).
- Any change to what a value *means* — every property type, its per-type configuration, its editor and its per-view looks are preserved exactly. The decoder changes how a stored value is recognized, never what it is.

#### Considered & Rejected

- **Wrapping values** (`[Space]` / `{Value}`) — forces every scalar into a quoted string, destroying the native YAML type of every Number, Checkbox and Date on disk, and adds no protection the key sigil doesn't already provide.
- **Wrapping only reference-shaped values**, literals left bare — principled, but a rule with a per-type exception is worse than a uniform one in both directions.
- **Doubled delimiters** (`[[…]]` / `{{…}}`) — both are YAML flow indicators, so an unquoted hand-typed key silently becomes garbage that the next write makes permanent; and `[[…]]` is needed elsewhere (B-3).
- **One shared sigil for both layers** — would force a Context and a property to compete for one name, and loses the key's self-description of which layer it belongs to.
- **Putting the type in the key** (`<Status:status>`) — self-describing without the registry, but copies the type onto every page, so a type change becomes a second cascade.
- **Name-keying SavedView configs** — nine fields including a recursive filter tree, and they live in block documents inside the database.
- **Name-keying the sidecar assignment list and `property_cache`** — makes a rename-immune structure fragile (C-3) and adds sweep scope to manage it.
- **Reshaping `properties.json` to an ordered list** — correct in isolation, thrown away against the database move.
- **A journal and replay for the property rename** — inherited from an operation that renames a folder. Committing the registry before the sweep, plus the rule that an unmatched key persists inert, makes it unnecessary (`H-4`, `H-5`).
- **Expand-then-merge** — planting the new key everywhere, committing, then folding the old value back. Rejected: it creates two windows with opposite correct answers and no information on disk to tell them apart, so the fold destroys every post-commit edit and resurrects every post-commit clear (`H-3a`).
- **Doing nothing** — take the independent cleanups, keep ULID-keyed values. Rejected: it leaves two answers to one question permanently, and the Context half of the migration is free today and never will be again.

#### Lessons

- A doc's illustrative shorthand can be misread as the on-disk shape. Where a doc shows a format, it must show what the serializer emits.
- A guard's cost is only visible against what it protects. The registry's format defence looks load-bearing until the files stop needing the registry to be decodable.
- **"This reuses existing machinery" is where a plan breaks.** Every such claim in the first draft — the sweep, the journal, the ordering, the basename validator — carried a constraint that didn't transfer. Reuse is a hypothesis about a shape; the borrowed code's *reasons* are what have to be checked.
- **Pick the sibling that shares the constraint, not the surface.** The Context rename looked like the precedent because it is name-keyed; the real precedent was the option rename, because it is registry-only.
- **Ask whether a blocker can be deleted before hardening it.** The quoting invariant, its scanner, the journal, the replay and most of the character bans were all downstream of two choices — a glyph and a keying decision. Changing those upstream deleted every guard beneath them.
- **Never conclude "dead" from a truncated search.** A `$ctx` grep piped through `head` cut off at ten lines and hid a second live decoder, which would have silently dropped every cached status value.
- **A doc claim outlives the code it described.** "Connections are ID-keyed" survived the deletion of the resolver and the index it referred to, and then justified a whole framing built on top of it. When machinery is removed, the sentences describing it are part of the removal — but a slot that holds a real fact gets the true fact, not a gap.
- **Replacing without removing is how a codebase grows during a simplification.** Every merge in this plan names its loser, and the removal half is scheduled rather than assumed — otherwise the old path survives beside the new one and the change is an addition wearing a reduction's language.
