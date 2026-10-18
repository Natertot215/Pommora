## MetadataV3 — Implementation Plan

**DATE:** 10-17-2026
**STATUS:** Ratified 10-18-2026
**SOURCE:** *MetadataV3 — Decisions & Intention* (ratified 10-17-2026, with the planning session's rulings recorded in its *§Session Questionnaire · Planning*), *MetadataV3 — Brief* (Nathan's principles and approach), *MetadataV3 — Investigation* (the code at `988f6ee43`, re-read at `204f16671`), and the advisor checkpoint on the approach (10-17-2026).

**BASELINE** (filled after ratification; the end logged in the final report)

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `56514cfb1` | 8,184 passed, 2 skipped (535 files) | 10-18-2026 11:00 AM | |

### Context

Pommora stores a property's values as frontmatter keys on pages and as bare keys on Space sidecars, and its definitions in `.nexus/properties.json`. A definition's `name` is at once its title in the app and its key on disk, and an option's `value` is at once its title, its word on disk, and its identity. Every key, option word, `<Title>:` Context key, and Space title under one matches without regard to case through `foldKey` (`Core/Paths/caseFold.ts`) and the spelling helpers in `Core/Files/heldKeys.ts`: a read finds the first spelling that folds to the name, a write keeps the file's spelling or collapses two into the registered one, and every rename, strip, and list edit acts on every spelling. The content index carries a folded column for those lookups, and a Space's `$order` lists its rows by folded name while every other order in the Nexus lists ids.

The fold reads NexusOS's Obsidian-written lowercase `tags`, `description`, and `version` under capitalized properties, and it keeps Pommora from writing the lowercase keys that tooling such as agent and skill files expects while the app shows capitalized titles. It also hides a hazard: a rename whose words differ only by case deletes the key from every file, and only a skip that leaves such a rename unswept keeps it from running.

### Overview

Every property and option stores two words in `properties.json`: a `label` shown in the app and a `key` written to disk. A property's Key Format writes its key from its label, and a Select, Status, or Multi-Select property's Value Format writes each option's key from its label, through one converter over `Match Title` and nine conventions. Reads and writes match the stored key exactly on pages and Space sidecars alike, `<Title>:` keys and Space titles match exactly as titled, configuration matches option labels exactly, and a Space's row order is kept by id. A format change is a rename of stored keys on the rename paths that already exist, counted by a dry run of the sweep it runs and confirmed past one item; a Multi-Select adopts only foreign words its Value Format could have produced and keeps the rest on disk through an edit; a page returning from the Trash is re-spelled into the current keys. The case-insensitive spelling machinery leaves every metadata read and write; the fold remains for uniqueness, the reserved-key refusal, the restore's match, search, sort, and file names.

The work lands in ten phases in dependency order, removal first: the Space order by id, exact keys, exact words and the index, one counter, the registry's label and key, the journal and cascades on keys, the formats, the restore re-spell, the interface and drives, and the reconciliation of the documents. Exact matching lands before any phase writes a key that differs from its label.

**The System, Layer by Layer:**

- **Space Order** (`Core/Contexts/spaceSidecar.ts`, `contextWrite.ts`, `Core/Properties/PropertyPanel.tsx`): `$order` is one id list, a field of the Space like its icon and color, ordered through the one `resolveRowOrder`; no rename touches it, and a delete drops its id inside the sweep it already runs (Phase 1).
- **Keys** (`Core/Files/heldKeys.ts`, `pageFile.ts`, `Core/Contexts/contextResolve.ts`, `Core/Properties/governedWrite.ts`, `keyHolders.ts`, `registryProperty.ts`, `replaySchemaCascade.ts`): a read is `root[key]`, a write lands on the key, a rename moves one exact key under the rival rule, a case-only rename sweeps, and the replay follows a property off its old key; the spelling helpers leave (Phases 2A, 2B).
- **Words and the Index** (`Core/Paths/caseFold.ts`, `Core/Properties/propertyValue.ts`, `Core/Views/Pipeline/filter.ts`, `Desktop/Store/`): members match by `exactTitle` (trimmed NFC, no fold); a Multi-Select decodes its registered options and carries its foreign words after the picked ones through `joinValues`; Select and Status Is and Is Not compare exactly; `page_values` loses `fold`, keyed by `(key, path)` at generation 19 (Phase 3).
- **Counts** (`Core/Properties/governedSweep.ts`, `deleteProperty.ts`, `optionOps.ts`, `Core/Interface/Confirm/confirmations.ts`): every confirmation counts its own operation's plan run dry through `sweepCount`; the dialog skips at each caller's count; notices say Items (Phase 4).
- **Label and Key** (`Core/Properties/properties.ts` and every reader of `name` and `value`): definitions and options store `label` and `key`, a missing label reading its key; decode yields labels and `encodeValue(def, value)` writes keys; the renderer names options by label and the host resolves the key; every uniqueness and reserved-key check reads both words; the registries are rewritten once at a Stop (Phases 5A, 5B).
- **Journal and Cascades** (`Core/Properties/pageValue.ts`, `optionOps.ts`, `propertyJournal.ts`, `replaySchemaCascade.ts`, `Core/Nexus/configReach.ts`): one key map edits every list; the option cascade rewrites files and caches by key and configuration by label; every record carries keys; option changes wait for an owed record (Phase 6).
- **Formats** (`Core/Properties/keyFormat.ts`, `registryProperty.ts`, `optionOps.ts`, `Core/Properties/Schema/FormatRows.tsx`): one converter over `Match Title` and nine conventions; a create writes its key through the Key Format, and a rename and a Key Format change are one rekey; an option rename and a Value Format change are one option rekey, the format change re-keying every option under one key-only record and refusing a collision or a crossing; adoption takes only words the Value Format leaves unchanged; two rows at the top of every property's settings confirm with a count past one item (Phases 7A, 7B).
- **Restore** (`Core/Trash/restoreScrub.ts`): one matcher per restore re-spells a returning page's or sidecar's keys, option words, `<Title>:` keys, and Space titles into the current ones before the reconcile; links stay Path Links' (Phase 8).
- **Interface, Drives, and Documents:** the Settings leaf reads Metadata with a Maintenance section; both live drives assert exact identity, and every other drive and the registry watcher read the new shape; the feature documents describe it (Phases 9, 10).

**The Number:** counted from the AFTER blocks as `view-delta` measures a diff (blank lines in; comments, tests, and documents out), with the lines past Biome's 100 columns counted as Biome reflows them, the phases add about 1,340 lines and remove about 1,000, roughly +342 net. The blocks elide unchanged code with `…`, so a measured phase can run higher, and a line one phase writes and a later phase rewrites counts in both, so the columns sum above the final diff while the net holds. Phases 1 through 6 remove more than they add (about +764 / −871, net −107): the spelling machinery, the name-keyed Space order, `heldPropertyValue`, `sameRecord`, `cellResolve.ts`, `withOrder`, three duplicate helpers, the hand-written counters, and the cache arm leave. Phases 7A, 7B, and 8 add about +449 net, behaviors the decisions require that nothing in the tree did: the converter (+69), the Key Format's field, create, and one rekey (+55), the Value Format's keys, plan, crossing refusal, adoption, and count riding the option rekey (+99), the two rows with their counted confirmation and the Key Format's count (+129), and the restore's one matcher (+97). Phase 7A replaces `renameProperty`'s body and Phase 7B `renameOption`'s rather than adding beside them, and Phase 8 rides the existing renames and list edit. In *§Concepts*' rows, Phases 1 through 6 take out 21 and add 19, six of those a removed one renamed or moved; Phases 7A to 8 add twelve, the formats' own surface, and take out one. Each phase's measured delta is recorded in the Net Ledger, and growth past an estimate is reported with what it buys.

**Net Ledger** (the Actionable column of `view-delta --exclude .claude`, per phase, cumulative from the BASELINE head):

| Phase | Estimate | Measured | Cumulative |
| ----- | -------- | -------- | ---------- |
| 1 | +63 / −102 | +66 / −102 | −36 (+66 / −102) |
| 2A | +34 / −50 | +33 / −54 | −57 (+99 / −156) |
| 2B | +110 / −225 | +109 / −254 | −202 (+208 / −410) |
| 3 | +80 / −64 | +203 / −121 | −120 (+399 / −519) |
| 4 | +67 / −58 | +125 / −108 | −103 (+488 / −591) |
| 5A | +96 / −82 | | |
| 5B | +163 / −139 | | |
| 6 | +151 / −151 | | |
| 7A | +163 / −39 | | |
| 7B | +305 / −77 | | |
| 8 | +106 / −9 | | |
| 9 | +3 / −3 | | |

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `withIds` · `withoutId` • functions | An id list written under a key, the key leaving once it's empty, and one id dropped from it; a Space's `$order` and a container's child order share both. | `Core/Files/atomicWrite.ts` |
| `withoutOrderId` • function | A sidecar rewrite with an id dropped from `$order`, composed with a delete's strip. | `Core/Contexts/spaceSidecar.ts` |
| `SpaceNode.rowOrder` • field | A Space's row order, the ids `$order` lists. | `Core/Nexus/tree.ts` |
| `byKey` • function | Definitions by stored key, in place of `byFoldedName`. | `Core/Properties/properties.ts` |
| `exactTitle` • function | A scalar's trimmed NFC text, what a member matches by; absorbs `normalizePropertyName`. | `Core/Paths/caseFold.ts` |
| `keepingForeignWords` • function | A Multi-Select write with the file's unrecognized words joined after the picked ones. | `Core/Properties/propertyValue.ts` |
| `evaluateMembers` • evaluator | A member test over a Multi-Select, a Context, or a Select read as a list of one; a Select's and a Status's Is and Is Not read it. | `Core/Views/Pipeline/filter.ts` |
| `page_values_by_key` • index | The exact holder lookup's index, `(key, path)`. | `Desktop/Store/ddl.ts` |
| `sweepCount` • function | How many files a sweep plan would rewrite, run dry. | `Core/Properties/governedSweep.ts` |
| `deletePlan` • function | The one plan a delete's count, live run, and replay share. | `Core/Properties/deleteProperty.ts` |
| `itemCount` • function | The one "N Items" a count reads as. | `Core/Properties/properties.ts` |
| `labelled` • function | C-3's rule: a word with no label reads its key. | `Core/Properties/properties.ts` |
| `propertyDraft` · `PropertyDraft` • decoder · type | What a create is handed: a definition without its key. | `Core/Properties/properties.ts` |
| `optionLabels` • function | An option list's labels, in place of `optionValues`. | `Core/Properties/properties.ts` |
| `restoreValue` • mutate op | An undo's put-back: the raw value the file held under a property's key, written as it was, or the key removed when it held none. | `Core/Nexus/mutateRequest.ts`, `Core/Properties/setProperty.ts` |
| `findOption` • function | The option a label names, for the host's option channels and the renderer alike, moved from `Cells/cellResolve.ts`. | `Core/Properties/properties.ts` |
| `KEY_REFUSAL.duplicateKey` · `KEY_REFUSAL.noKey` • refusals | Another property writes this key; a label that leaves its key empty. | `Core/Properties/properties.ts` |
| `wordsOf` · `OptionWords` · `keyOf` • function · type · function | One cached map per definition, key to label and label to key. | `Core/Properties/propertyValue.ts` |
| `cacheSweep` • function | The Collection caches edited by key beside the file sweep. | `Core/Properties/optionOps.ts` |
| `OWED` · `CROSSED` • refusals | An option change waiting for an owed record; a Value Format change crossing two options' keys. | `Core/Properties/optionOps.ts` |
| `keyFormat.ts` • module | `KEY_FORMATS`, `KeyFormat`, `DEFAULT_KEY_FORMAT`, `isKeyFormat`, `formatKey`, `spellingsOf`, and `FormatChange`: the one converter. | `Core/Properties/keyFormat.ts` |
| `key_format` · `value_format` • fields | A property's Key Format and Value Format. | `Core/Properties/properties.ts` |
| `rekeyProperty` · `rekeyPlan` · `renamePlan` · `retitled` · `Retitle` · `freeLabel` • functions · type | The one rekey a rename and a Key Format change enter, the check it runs first, the sweep plan a rename and its count share, the definition it writes, and the create's step-aside on both words. | `Core/Properties/registryProperty.ts` |
| `setKeyFormat` · `keyFormatHolders` • functions | The Key Format change and its count. | `Core/Properties/registryProperty.ts` |
| `withOptionKeys` • function | A seed's option keys written through the Value Format. | `Core/Properties/registryProperty.ts` |
| `rekeyOptions` • function | The one option rekey an option rename and a Value Format change enter, committing and cascading from its record. | `Core/Properties/optionOps.ts` |
| `setValueFormat` · `valueFormatPlan` · `valueFormatHolders` • functions | The Value Format change, its key map, and its count. | `Core/Properties/optionOps.ts` |
| `property:setKeyFormat` · `property:setValueFormat` · `idAndFormat` • channels · decoder | The two format changes and their argument decoder. | `Core/Contract/bridge.ts`, `Core/Properties/handlers.ts` |
| `FormatRows` • component | The Key Format and Value Format rows. | `Core/Properties/Schema/FormatRows.tsx` |
| `askFormatChange` • confirmation | A format change's counted confirmation. | `Core/Interface/Confirm/confirmations.ts` |
| `PickerRowLook.caption` • field | A picker row's hint. | `UIX/Menus/MenuIndex.tsx` |
| `matchOf` · `Match` · `currentKeys` • functions · type | The restore's one matcher over the ten spellings, built once per restore. | `Core/Trash/restoreScrub.ts` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `withOrderEntry` • function | Edited `$order` by folded name on every rename and delete. | `Core/Contexts/spaceSidecar.ts` |
| `SpaceRowOrder` · `readSpaceRowOrder` • type · function | `$order`'s two name lists. | `Core/Contexts/spaceSidecar.ts` |
| `heldKeys` · `heldKey` · `heldValue` · `writeTarget` · `WriteTarget` · `stripHeld` • functions · type | The spelling resolution behind every read, write, and strip. | `Core/Files/heldKeys.ts` |
| `heldPropertyValue` • function | A property's value off a root, now the key's own read. | `Core/Properties/propertyValue.ts` |
| `byFoldedName` · `holdsList` • functions | The folded definition map and whether spellings join. | `Core/Properties/properties.ts` |
| `joins` · `joinsSpellings` · `Governor.name` • functions · field | Whether a governed key joins its spellings. | `Core/Contexts/contextResolve.ts` |
| `spellings` • function | Every spelling a name list holds; its last reader keeps its one use inline. | `Core/Paths/caseFold.ts` |
| `normalizePropertyName` • function | A second trim-and-NFC, folded into `exactTitle`. | `Core/Properties/properties.ts` |
| `optionsByFold` • function | The folded option map, replaced by `wordsOf`. | `Core/Properties/propertyValue.ts` |
| `optionValues` • function | One word per option, renamed `optionLabels`; the keys read through `optionsOf`. | `Core/Properties/properties.ts` |
| `Cells/cellResolve.ts` • module | `findOption`'s own file. | `Core/Properties/Cells/cellResolve.ts` |
| `stored` • function | Stripped a leftover option `label` on every write. | `Core/Properties/properties.ts` |
| `renameOption` (option groups) • function | An option's label and key renamed inside its groups, replaced by `rekeyOptions`' one edit. | `Core/Properties/optionModel.ts` |
| `items` • function | The dialog's own pluralization, replaced by `itemCount`. | `Core/Interface/Confirm/confirmations.ts` |
| `cacheEdit` • function | The cache arm inside the configuration pass. | `Core/Nexus/configReach.ts` |
| `valueEditSweep` • function | The option cascade's file half, folded into its plan and the sweep. | `Core/Properties/optionOps.ts` |
| `sameRecord` • function | Each journal record's fields compared by hand, replaced by `same`. | `Core/Properties/propertyJournal.ts` |
| `named` • function | The replay's folded name compare, inline once exact. | `Core/Properties/replaySchemaCascade.ts` |
| `withOrder` • function | A container's child order written or dropped by hand, replaced by `withIds`. | `Core/Nexus/reorder.ts` |
| `evaluateSet` • function | The list evaluator, merged into `evaluateMembers`. | `Core/Views/Pipeline/filter.ts` |
| `page_values.fold` · `page_values_by_fold` • column · index | The folded holder lookup. | `Desktop/Store/ddl.ts` |
| `name` (definition) · `value` (option) • fields | One word as title, key, and identity, replaced by `label` and `key`. | `Core/Properties/properties.ts` |

#### Constraints

- **Mandate (Nathan's guiding principles, verbatim from *MetadataV3 — Brief*):**
  - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
  - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
  - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
  - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
  - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
  - **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
  - Anything introduced has independent justification behind its existence that isn't simply self-induced requirements; anything changed is reflected across the board; no data-level spaghetti, complexity, or additional "stuff" is added without reason.
- **Approach (Nathan's, from *MetadataV3 — Brief*):** what's true now is assessed for removal, deletion, consolidation, or replacement before anything is designed on it; nothing is added without evidence it's required; net-negative lines are the north star, and a net-positive result states its rationale against these principles; the outcome reads as always-intended, looking outward for shared design rather than hand-rolling.
- **The Plan's Own Mandate (Nathan, 10-17-2026):** the plan follows these principles throughout. It ends net-negative in issues, mechanisms, and complexity; the line count attempts to follow in principle, while the total is whatever is genuinely necessary without sacrifice. The measure is the codebase, not the product: the work leaves the codebase unarguably in a better state than it began with.
- **Plan Rules (Nathan, 10-17-2026):** removal comes first in every phase. Tasks build necessity-first, written to their result, so no executing agent reads an opening to do more than they say. A test that changes asserts the new behavior the decisions name rather than being bent to pass. AFTER blocks leave the codebase with fewer comments than it has, and add one only where the code would otherwise be misread. Any cautionary code has its reason asked of Nathan before it's written. Consolidation that's unambiguously right needs no separate sign-off, and dead or dormant code inside the surface is removed rather than left.
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint`, from the repo root; each prints its own failures, and lint runs clean. Biome formats every TS write, so an edit failing on whitespace means it reformatted: re-read and retry. "Run the gates" in a task means these three. A VERIFY grep that uses `\b` runs under `git grep -P`, since this toolchain's `git grep -E` matches nothing at a `\b`. From Phase 2B on, each Review Checkpoint also runs the Metadata Drive (`.claude/scripts/Metadata Drive/live-drive.mjs`) over the groups of every phase landed so far, group N for Phase N (group 2 covering 2A and 2B, group 5 waiting for Task 5B-4, group 9 for Phase 9), from a worktree of the phase's head built by `editor-parity/worktree.sh` and named by `POMMORA_DRIVE_REPO`; a failing case is fixed in the code, or in the drive where the case misreads a decision, never bent to pass.
- **Frozen:**
  - Path Links' link machinery: `respell`, `respellings`, `relink`, `renameCascade`'s link arms, and every `[[…]]` target a restore repairs (Path Links Phase 8 owns them).
  - Quote, number, Boolean, and link preservation (A-3): `nodeSpelledAs`, `checkedSpelling`, and the number shapes.
  - The search and sort folds (`compareTitles`, `matchQuery`, `rankMatches`) and the file-name folds (`heldName`, `recase`).
  - `Core/Sync/`, and Project Sapphire.
- **The Number:** every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <BASELINE>..HEAD --exclude .claude` and records the **Actionable** column in the Net Ledger beside the phase's estimate, removals and additions apart. A phase that lands above its estimate is reported in chat before the next phase opens, with what the increase buys.
- **Shape:** a removal and a refactor with one migration inside it. The behavioral baseline is today's behavior as *MetadataV3 — Decisions & Intention · §Context* states it, kept except where a decision names a change and proven by the tests each task rewrites or adds. Every removal task lists its consumers. The registry rewrite (Task 5B-4) runs once, after both Phase 5 halves land, on Nathan's word at its Stop: NexusOS is committed first, the six deleted-property Trash records are deleted rather than migrated, and `~/Test`'s registry is copied for the run. The index generation bump (Task 3-4) drops and reseeds the content index on first open.
- **Conventions:** finite states are unions plus exhaustive switches; no format conversion, fold, or allocation lands on a keystroke, a decode, or a settle that nothing owes, so live reads are exact lookups by stored key, the converter runs where a label or a format is written, adoption runs on its existing triggers, and the restore's match runs once per restore; host-run code imports no React or UIX, and `Desktop/hostGraph.test.ts` and `Core/Contract/engineGraph.test.ts` stay green; user-facing words are the ones the decisions quote; a test whose body inverts takes a title stating the behavior it now asserts; commit messages are past tense and one to four sentences; nothing temporary, transitional, or compatibility-kept remains at a phase's end.
- **Execution:** the plan runs end to end through `c/plan-execution`, Nathan reachable at check-ins and Stops. Each task goes to an `execution-agent` (`opus-medium`) informed of *§Context* and *§Overview*, which reports insights, concerns, and suggestions rather than diverging, and the orchestrator checks its result against the task's AFTER and VERIFY. Every review checkpoint dispatches two read-only agents, one under `code-simplification` and one under `adversarial-review`, each weighing the phase against these constraints and its place in the plan, reading outward rather than in isolation, with no implementation running meanwhile; the orchestrator reconciles both reports and weighs the landed work against the **Mandate** before the next phase opens. An in-flight call is weighed against those and the plan's objectives, disclosed in chat, and recorded under *§Deviations* only where it changes an outcome. Each compaction checkpoint in *§Process Overview* runs `c/pre-compaction` and stops until Nathan re-prompts; on the re-prompt the orchestrator rereads *§Constraints* and `c/plan-execution` from the files themselves, rather than from the handoff's summary of them, before the next phase opens.
- **Rulings (Not Re-Raised):** every entry in *MetadataV3 — Decisions & Intention* and its *§Rejected* list, including the planning rulings: configuration matches option labels exactly (F-2); a Space's `$order` names rows by id (F-5); a Multi-Select keeps foreign words after the picked options and emptying it removes them (E-3); an option rename, an option removal, or a Value Format change waits for Try Again while another record is owed (F-1); the row hints and the Metadata leaf's Maintenance section (H-1, J-1).
- **Neutral Gate:** the work ends with a `fable-high` neutral reviewer given only the BASELINE head, HEAD, and this intention, with no plan, log, or document: *"Pommora matched every property key, option word, Context key, and Space title without regard to case through one fold and a set of spelling helpers, so it couldn't write the lowercase keys tools expect while showing capitalized titles, two spellings of one key quietly merged, and a Space ordered its rows by name where everything else ordered by id. This work gives every property and option a label shown in the app and a key written to disk, writes the key from the label through per-property Key and Value Formats, matches every key and word exactly, keeps a Space's row order by id, carries format changes on the rename, journal, and restore machinery that already existed, and removes the spelling machinery, with each rule stated once, built from what the architecture already had, and nothing left over."* It answers, without hedging, whether the result holds to every principle under **Mandate**, **Approach**, and **Plan Rules**, and what it would correct. Every phase is written so that review passes.
- **Other Workstreams:** Path Links is paused before its Phase 8 at `204f16671` and lands after this plan, re-fitting its Trash phase onto what this plan leaves; it owns the restore tests it pins (`spend.test.ts:1031`, `restoreScrub.test.ts:320`), which this plan inverts to exact matching first. `INDEX_GENERATION` is 18 at the baseline; this plan's bump is 19, which the last phase reports to the Path Links session.
- **Out of Scope Everywhere:** Indexed Trash, Format Detection at Create, and Option IDs (*§Prospects*); pages outside every Collection, and `/Tasks` and `/Events` until Agenda lands; Sync's per-field merge of a label and a format edited on two devices; NexusOS's cutover (I-1), which follows the plan on Nathan's word.

#### Process Overview

- [x] **Phase 1** — Space Order by Id
  - [x] Task 1-1 · `$order` leaves the rename cascades, and a delete drops the id
  - [x] Task 1-2 · `$order` is one id list on the Space, and the panel orders by id
  - [x] Review Checkpoint
- [x] **Phase 2A** — Exact Renames
  - [x] Task 2A-1 · The YAML and JSON renames move one exact key
  - [x] Task 2A-2 · The case-only skips go, and the rename replay follows its property
  - [x] Review Checkpoint
- [x] **Phase 2B** — Reads and Writes Land on the Key
  - [x] Task 2B-1 · The spelling resolution behind reads, writes, and strips leaves
  - [x] Task 2B-2 · `heldKeys` and `heldKey` leave, and every gate reads the exact key
  - [x] Review Checkpoint
- [x] **Phase 3** — Exact Words and the Index
  - [x] Task 3-1 · Members and Space titles match by `exactTitle`
  - [x] Task 3-2 · Option words decode exactly, and a Multi-Select carries its foreign words
  - [x] Task 3-3 · Select and Status Is and Is Not compare exactly
  - [x] Task 3-4 · The index keys exactly, at generation 19
  - [x] Review Checkpoint
- [x] `[Compaction checkpoint: c/pre-compaction; on the re-prompt, reread §Constraints and c/plan-execution before Phase 4 opens]`
- [x] **Phase 4** — One Counter
  - [x] Task 4-1 · The sweep runs dry
  - [x] Task 4-2 · Every count is its operation's dry run
  - [x] Task 4-3 · The dialog skips at each caller's count, and notices say Items
  - [x] Review Checkpoint
- [ ] **Phase 5A** — Definitions Carry a Label and a Key
  - [x] `[Stop: Nathan words the six messages, quits Pommora on both Nexuses through Task 5B-4, and gives his word for 5B-4]`
  - [ ] Task 5A-1 · `name` becomes `label` and `key` at every reader and writer
  - [ ] Task 5A-2 · Every name check reads both words
  - [ ] Review Checkpoint
- [ ] **Phase 5B** — Options Carry a Key and a Label
  - [ ] Task 5B-1 · An option's `value` becomes `key` and `label`
  - [ ] Task 5B-2 · The encode writes keys, and adoption subtracts labels and keys
  - [ ] Task 5B-3 · Option labels and keys are unique and non-blank, Status included
  - [ ] Task 5B-4 · NexusOS committed, the six Trash records deleted, both registries rewritten
  - [ ] Review Checkpoint
- [ ] **Phase 6** — Label and Key: the Journal and Cascades
  - [ ] Task 6-1 · The caches leave the configuration pass
  - [ ] Task 6-2 · One key map edits every list; files by key, configuration by label
  - [ ] Task 6-3 · Every journal record carries keys
  - [ ] Task 6-4 · Option changes wait for an owed record
  - [ ] Review Checkpoint
- [ ] `[Compaction checkpoint: c/pre-compaction; on the re-prompt, reread §Constraints and c/plan-execution before Phase 7A opens]`
- [ ] **Phase 7A** — The Converter and the Key Format
  - [ ] Task 7A-1 · The converter
  - [ ] Task 7A-2 · The Key Format field, and a create keyed through it
  - [ ] Task 7A-3 · One move for a rename and a Key Format change
  - [ ] Review Checkpoint
- [ ] **Phase 7B** — The Value Format, Adoption, and the Rows
  - [ ] Task 7B-1 · The Value Format field, its seeds, adds, and renames, and one option rekey
  - [ ] Task 7B-2 · The Value Format change
  - [ ] Task 7B-3 · Adoption follows the Value Format
  - [ ] Task 7B-4 · The two rows and the counted confirmation
  - [ ] Review Checkpoint
- [ ] **Phase 8** — The Restore Re-Spell
  - [ ] Task 8-1 · Keys and words re-spell in the restore scrub
  - [ ] Review Checkpoint
- [ ] **Phase 9** — Interface and Drives
  - [ ] Task 9-1 · The Metadata leaf
  - [ ] Task 9-2 · The two live drives
  - [ ] Review Checkpoint
- [ ] **Phase 10** — Reconciliation
  - [ ] Tasks 10-1 to 10-7 · The feature documents and the PRD
  - [ ] Review Checkpoint
- [ ] `[Compaction checkpoint: c/pre-compaction; on the re-prompt, reread §Constraints and c/plan-execution before §Final Verification opens]`
- [ ] `[Stop: the final verification's report, per §Final Verification]`

---

### Phase 1 — Space Order by Id

**GOAL:** A Space's `$order` becomes one list of property and Context ids, read as a field of the Space beside its icon and color, so no property rename, Context rename, or later format change touches it (F-5). The name-keyed order machinery leaves: `withOrderEntry` and its four call sites, `SpaceRowOrder`, `readSpaceRowOrder`, and the panel's name folds. A property delete and a Context delete drop the id inside the sweep each already runs over every Space sidecar. Neither Nexus holds a `$order`, so nothing migrates. It's a separate phase because it removes `$order` from every cascade before Phase 2 makes those cascades exact.

#### Task 1-1

**TASK:** Take `$order` out of the rename cascades and replace `withOrderEntry` with an id-only drop that the property delete and the Context unlink compose with the strip they already run, sharing the one id drop a container's child order already makes.

**NOW:** `withOrderEntry(inner, list, from, to)` (`Core/Contexts/spaceSidecar.ts:98-114`) edits `$order.{contexts|properties}` by folded name through `editList`, over whatever `inner` returned. It wraps the sidecar arm of `renameSweep` (`Core/Properties/registryProperty.ts:95`, renaming the property's title), `rekeyContext` (`Core/Contexts/contextCascade.ts:36-43`, renaming the Context's title; also called by the Context restore at `Core/Trash/spend.ts:230`), `stripAndRemove` (`Core/Properties/deleteProperty.ts:119-123`, dropping the title), and `unlinkContextKey` (`contextCascade.ts:146`, dropping the title). `stripAndRemove` already holds `propertyId`; `unlinkContextKey(root, contextTitle, skipUnder?)` doesn't hold the Context's id, and its one production caller, `deleteOp` (`Core/Trash/delete.ts:80`), holds it as `entry?.id` (`:68-69`). Each sidecar arm runs over every Space sidecar (`Core/Properties/governedSweep.ts:86-107`), and that arm writes any non-null answer. `dropFromChildOrder` (`Core/Nexus/reorder.ts:76-89`) already drops one id from an id list under a key, the key leaving once the list empties, through the module-private `withOrder` (`:66-73`), which `setChildOrder` (`:96`) also reads and which is `setOrDrop(cur, key, ids.length > 0 && ids)` spelled with a destructure; `setOrDrop` (`Core/Files/atomicWrite.ts:273-282`) drops a key on a falsy value.

**CHANGE**

- [ ] Write and watch fail: `spaceSidecar.test.ts` — the `withOrderEntry` describe (`:98-137`) becomes `withoutOrderId`: over an inner rewrite answering null, `{ Status: 'Active', $order: ['g1', 'g2'] }` drops `'g1'` to `$order: ['g2']`; `{ $order: ['g1'] }` loses the key; an order not listing the id answers the inner answer (`null`); over an inner that added `Stage`, the drop applies to the object it returned. `contextCascade.test.ts:701-735` becomes `describe('the Context cascades and $order')`: the rename case (`:703-712`) seeds `$order: ['ctxC', 'ctx_projects']` on Pommora and asserts its sidecar bytes under `Ventures` equal what was seeded; the other-casing case (`:714-722`) is deleted (its subject leaves); the delete case (`:724-735`) seeds `$order: ['ctx_projects']`, calls `unlinkContextKey(root, 'Projects', 'ctx_projects')`, and asserts `'$order' in pom` is false and nothing is captured for `sp-pom`. `renameSweep.test.ts`: `:121-132` seeds `$order: ['ctxA', 'prop_other', 'prop_s']` and asserts the key moves while `$order` stays `['ctxA', 'prop_other', 'prop_s']`; `:134-138` and `:140-144` are deleted (their subject leaves); `:145-152` stays. `deleteProperty.test.ts:200-216` seeds `$order: [id, 'prop_other']` and asserts `['prop_other']`, and adds a second Space `{ id: 'sp2', $order: [id] }` that loses its `$order` key. `replaySchemaCascade.test.ts:186-201` seeds `$order: ['prop_s']` and asserts `'$order' in raw` is false. `spend.test.ts:1263-1289` is deleted (its subject leaves: a re-keyed Context carries no `$order` entry, since the restored entry keeps `record.registry.id`). `spend.test.ts:334`'s fixture becomes `$order: ['ctx_projects']`, so the refused Context delete puts back a sidecar the id drop wrote.
- [ ] `atomicWrite.ts`: add `withIds(cur, key, ids)` beside `setOrDrop`, the id list under `key` or the key dropped once it's empty, and `withoutId(cur, key, id)`, null when the list doesn't hold `id` and otherwise `withIds` of the rest.
- [ ] `reorder.ts`: delete `withOrder`; `dropFromChildOrder` patches through `withoutId(cur, key, id)` and `setChildOrder` through `withIds(cur, key, ids)`.
- [ ] `spaceSidecar.ts`: delete `withOrderEntry` and the `editList` import, its last use (`isPlainObject` stays for `readSpaceRowOrder` until Task 1-2); add `withoutOrderId(inner, id)`: `withoutId` over the inner answer (or the root when the inner answers null), and the inner answer when the order doesn't hold `id`.
- [ ] `registryProperty.ts`: `renameSweep`'s sidecar arm is `rekey`; delete the `withOrderEntry` import.
- [ ] `contextCascade.ts`: `rekeyContext` is the `rekeyHeld` call alone (its caller at `spend.ts:230` is unchanged); `unlinkContextKey(root, contextTitle, contextId, skipUnder?)` composes `withoutOrderId(strip, contextId)`; import `withoutOrderId` in place of `withOrderEntry`.
- [ ] `deleteProperty.ts`: `stripAndRemove`'s sidecar arm is `withoutOrderId(raw, propertyId)`.
- [ ] `delete.ts:80`: `unlinkContextKey(root, title, entry?.id, abs)`.
- [ ] Sibling sweep: the `vi.mock`/`vi.spyOn` wrappers of `unlinkContextKey` in `Core/Trash/deleteOrder.test.ts:51-54` and `Core/Nexus/mutate.test.ts:2614-2626` forward `...args` and take the new parameter unchanged; the other `unlinkContextKey` calls in `contextCascade.test.ts` (`:111` `'Classes'` → `(root, 'Classes', 'ctxC')`, `:634` likewise, `:234,606,659` → `(root, 'Projects', 'ctx_projects')`, `:744` → `(root, 'Projects', 'ctx_projects', join(contextsDir(root), 'Projects'))`) take the id.

**AFTER**

```Core/Files/atomicWrite.ts diff
@@ setOrDrop @@
   return next
 }
+
+export const withIds = (
+  cur: Record<string, unknown>,
+  key: string,
+  ids: string[],
+): Record<string, unknown> => setOrDrop(cur, key, ids.length > 0 && ids)
+
+export function withoutId(
+  cur: Record<string, unknown>,
+  key: string,
+  id: string,
+): Record<string, unknown> | null {
+  const ids = cur[key]
+  if (!Array.isArray(ids) || !ids.includes(id)) return null
+  return withIds(cur, key, ids.filter((x) => x !== id))
+}
```

```Core/Nexus/reorder.ts diff
@@ imports @@
-import { pathExists, updateNexusConfig } from '../Files/atomicWrite'
+import { pathExists, updateNexusConfig, withIds, withoutId } from '../Files/atomicWrite'
@@ withOrder @@
-const withOrder = (
-  cur: Record<string, unknown>,
-  key: ContainerOrderKey,
-  ids: string[],
-): Record<string, unknown> => {
-  const { [key]: _, ...rest } = cur
-  return ids.length > 0 ? { ...cur, [key]: ids } : rest
-}
-
@@ dropFromChildOrder @@
 export const dropFromChildOrder = (
   absFolder: string,
   key: ContainerOrderKey,
   id: string,
 ): Promise<Result<unknown>> =>
-  patchContainer(absFolder, (cur) => {
-    const ids = cur[key]
-    return Array.isArray(ids) && ids.includes(id)
-      ? withOrder(
-          cur,
-          key,
-          ids.filter((x) => x !== id),
-        )
-      : null
-  })
+  patchContainer(absFolder, (cur) => withoutId(cur, key, id))
@@ setChildOrder @@
-  const r = await patchContainer(absFolder, (cur) => withOrder(cur, key, ids))
+  const r = await patchContainer(absFolder, (cur) => withIds(cur, key, ids))
```

```Core/Contexts/spaceSidecar.ts diff
@@ imports @@
 import { parseContextKey } from './contexts'
 import type { Json } from '../Files/stableJson'
 import type { Rewrite } from '../Properties/governedSweep'
-import { editList } from '../Properties/pageValue'
-import { pathExists, readJsonObject } from '../Files/atomicWrite'
+import { pathExists, readJsonObject, withoutId } from '../Files/atomicWrite'
@@ withOrderEntry @@
-export function withOrderEntry(
-  inner: Rewrite,
-  list: keyof SpaceRowOrder,
-  from: string,
-  to: string | null,
-): Rewrite {
-  return (raw, file) => {
-    const keyed = inner(raw, file)
-    const cur = keyed ?? raw
-    const order = cur[ORDER_KEY]
-    const entries = isPlainObject(order) ? order[list] : undefined
-    const next =
-      Array.isArray(entries) &&
-      editList(entries, from, to === null ? { op: 'strip' } : { op: 'replace', to })
-    if (!isPlainObject(order) || !next) return keyed
-    return { ...cur, [ORDER_KEY]: { ...order, [list]: next } }
-  }
-}
+export const withoutOrderId =
+  (inner: Rewrite, id: string): Rewrite =>
+  (raw, file) => {
+    const kept = inner(raw, file)
+    return withoutId(kept ?? raw, ORDER_KEY, id) ?? kept
+  }
```

```Core/Properties/registryProperty.ts diff
@@ imports @@
-import { withOrderEntry } from '../Contexts/spaceSidecar'
@@ renameSweep @@
   const rekey: Rewrite = (raw) => rekeyHeld(raw, oldName, def.name, NEW_KEY_IS_FRESHER, join)
-  const swept = await sweepGovernedRoots(root, files, {
-    text,
-    sidecars: withOrderEntry(rekey, 'properties', oldName, def.name),
-  })
+  const swept = await sweepGovernedRoots(root, files, { text, sidecars: rekey })
```

```Core/Contexts/contextCascade.ts diff
@@ imports @@
-import { withOrderEntry } from './spaceSidecar'
+import { withoutOrderId } from './spaceSidecar'
@@ rekeyContext @@
-export const rekeyContext = (oldTitle: string, newTitle: string): Rewrite =>
-  withOrderEntry(
-    (raw) =>
-      rekeyHeld(raw, contextKey(oldTitle), contextKey(newTitle), NEITHER_KEY_IS_FRESHER, true),
-    'contexts',
-    oldTitle,
-    newTitle,
-  )
+export const rekeyContext =
+  (oldTitle: string, newTitle: string): Rewrite =>
+  (raw) =>
+    rekeyHeld(raw, contextKey(oldTitle), contextKey(newTitle), NEITHER_KEY_IS_FRESHER, true)
@@ unlinkContextKey @@
 export async function unlinkContextKey(
   root: string,
   contextTitle: string,
+  contextId: string | undefined,
   skipUnder?: string,
 ): Promise<Result<UnlinkOutcome>> {
   …
-  const entry = withOrderEntry(strip, 'contexts', contextTitle, null)
+  const entry = contextId === undefined ? strip : withoutOrderId(strip, contextId)
   const swept = await unlinkMembers(root, { key }, entry, skipUnder)
```

```Core/Properties/deleteProperty.ts diff
@@ imports @@
-import { spaceSidecars, withOrderEntry } from '../Contexts/spaceSidecar'
+import { spaceSidecars, withoutOrderId } from '../Contexts/spaceSidecar'
@@ stripAndRemove @@
   const raw = stripHeld(key)
   const swept = await sweepGovernedRoots(root, files, {
     raw,
-    sidecars: withOrderEntry(raw, 'properties', key, null),
+    sidecars: withoutOrderId(raw, propertyId),
   })
```

```Core/Trash/delete.ts diff
@@ deleteOp @@
-    const swept = await unlinkContextKey(root, title, abs).catch(async (e) => {
+    const swept = await unlinkContextKey(root, title, entry?.id, abs).catch(async (e) => {
```

**VERIFY**

- [ ] The listed tests pass; `renameSweep.test.ts:145-152` (a sidecar with neither key nor entry stays byte-identical) passes unchanged.
- [ ] `git grep -n "withOrderEntry" -- Core Desktop` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-2

**TASK:** Make `$order` one id list modeled on the Space, written by `setSpaceRowOrder(absSpaceDir, ids)`, and let the panel order both of its groups by id through `resolveRowOrder`.

**NOW:** `$order` rides in `SpaceNode.values` (`ORDER_KEY` is missing from `SPACE_MODELED_KEYS`, `spaceSidecar.ts:18-24`) as `{ contexts, properties }` of titles; `readSpaceRowOrder` (`:89-96`) reads it, typed by `SpaceRowOrder` (`:60-63`). `setSpaceRowOrder(absSpaceDir, contexts, properties)` (`Core/Contexts/contextWrite.ts:198-209`) writes both lists, from `op('setSpaceRowOrder', { path, contexts, properties })` (`Core/Nexus/mutateRequest.ts:105`) through `Core/Nexus/mutate.ts:244-249`. The panel (`Core/Properties/PropertyPanel.tsx:218-225`) orders both groups by `normalizeTitle(nameOf(f))` against the folded lists, and a Space reorder (`:250-257`) sends the shown rows of both groups as names, with the moved group applied, undoing to the prior `spaceOrder`.

**CHANGE**

- [ ] Write and watch fail: `spaceSidecar.test.ts` — the `readSpaceRowOrder` describe (`:79-96`) goes (its subject leaves) and the import (`:6`) drops it; `:52-67`: `values` is `{ Status: 'Active' }` and `node.rowOrder` is `['g1', 'prop_a']` for a sidecar holding `$order: ['g1', 'prop_a']`; a new case: `$order: { contexts: ['g1'] }` and `$order: ['g1', 7]` each read `rowOrder` as `undefined` and stay out of `values`. `readNexus.test.ts:330,375`: the fixture holds `$order: ['ctxC']`, `values` is `{ Status: ['Active'] }`, and the node's `rowOrder` is `['ctxC']`. `contextWrite.test.ts:381-392`: `setSpaceRowOrder(dir(), ['ctxC', 'prop_a'])` writes `$order: ['ctxC', 'prop_a']`, `['ctx_projects']` replaces it wholesale, and `[]` removes the key. `PropertyPanel.test.tsx`: `spaceNode(values, rowOrder?)` and `setTree(values, contextOrder, spaceOrder?)` carry the Space's `rowOrder`; `:348-355` becomes `setTree({ Stage: 'Alpha', Note: 5, Rank: 7 }, undefined, ['prop_note', 'prop_stage'])` with the same Note < Stage < Rank expectation; `:357-361` is deleted (its subject leaves); a new drag case renders `SPACE` over `{ Stage: 'Alpha', Note: 3 }`, drags `prop_note` above `prop_stage`, and expects `useSession.getState().mutate` called with `{ op: 'setSpaceRowOrder', path: '.nexus/contexts/Areas/Work', ids: ['prop_note', 'prop_stage'] }`.
- [ ] `spaceSidecar.ts`: delete `SpaceRowOrder` and `readSpaceRowOrder` (consumers: `PropertyPanel.tsx:48,218,252` and `spaceSidecar.test.ts:6,79-96`) and the `isPlainObject` import; `ORDER_KEY` joins `SPACE_MODELED_KEYS` (the reserved-key set at `Core/Properties/schema.ts:17-19` already refuses any `$` name, so no refusal changes); `spaceNodeFrom` reads `rowOrder: asStringArray(sc[ORDER_KEY])`, the reader `readOrder` already uses for `state.json` (`Core/Nexus/readNexus.ts:68-75`), so a list holding a non-string reads as no order.
- [ ] `Core/Nexus/tree.ts`: `SpaceNode` gains `rowOrder?: string[]`, the panel's rows by property and Context id as `$order` lists them.
- [ ] `contextWrite.ts`: `setSpaceRowOrder(absSpaceDir, ids)` writes `ids` through `withIds`, the key leaving on an empty list.
- [ ] `mutateRequest.ts:105`: `op('setSpaceRowOrder', { path: z.string(), ids })`; `mutate.ts:248`: `setSpaceRowOrder(resolved.value, req.ids)`.
- [ ] `PropertyPanel.tsx`: delete the `readSpaceRowOrder`/`SpaceRowOrder` import, the `normalizeTitle` import (its last reader is `orderKey`), `spaceOrder`, `nameOf`, and `orderKey`; both groups resolve by `(f) => f.id` against `spaceNode?.rowOrder`; the Space reorder sends the shown ids of both groups with the moved group applied, undoing to `spaceNode?.rowOrder ?? []`.

**AFTER**

```Core/Contexts/spaceSidecar.ts diff
@@ imports @@
-import { isPlainObject } from '../Contract/validators'
-import { asString } from '../Nexus/coerce'
+import { asString, asStringArray } from '../Nexus/coerce'
@@ SPACE_MODELED_KEYS @@
 export const SPACE_MODELED_KEYS = new Set([
   'id',
   ICON_KEY,
   'banner',
   'heading_icon_hidden',
   COLOR_KEY,
+  ORDER_KEY,
 ])
@@ SpaceRowOrder @@
-export interface SpaceRowOrder {
-  contexts: string[]
-  properties: string[]
-}
-
@@ spaceNodeFrom @@
     color: asString(sc[COLOR_KEY]),
+    rowOrder: asStringArray(sc[ORDER_KEY]),
     values,
   }
 }
@@ readSpaceRowOrder @@
-export function readSpaceRowOrder(values: Json | undefined): SpaceRowOrder {
-  const order = values?.[ORDER_KEY]
-  const list = (k: keyof SpaceRowOrder): string[] => {
-    const entries = isPlainObject(order) ? order[k] : undefined
-    return Array.isArray(entries) ? entries.filter((e): e is string => typeof e === 'string') : []
-  }
-  return { contexts: list('contexts'), properties: list('properties') }
-}
-
```

```Core/Nexus/tree.ts diff
@@ SpaceNode @@
 export interface SpaceNode extends ChromeNode {
   kind: 'space'
   contextId: string
   color?: string
+  rowOrder?: string[]
   contextValues?: Record<string, string[]>
   values?: Record<string, unknown>
 }
```

```Core/Contexts/contextWrite.ts diff
@@ imports @@
-import { atomicWriteFile, pathExists, rmwJsonStrict, setOrDrop } from '../Files/atomicWrite'
+import {
+  atomicWriteFile,
+  pathExists,
+  rmwJsonStrict,
+  setOrDrop,
+  withIds,
+} from '../Files/atomicWrite'
@@ setSpaceRowOrder @@
-export const setSpaceRowOrder = (
-  absSpaceDir: string,
-  contexts: string[],
-  properties: string[],
-): Promise<Result<null>> =>
-  writeSpaceSidecar(absSpaceDir, (raw) =>
-    setOrDrop(
-      raw,
-      ORDER_KEY,
-      (contexts.length > 0 || properties.length > 0) && { contexts, properties },
-    ),
-  )
+export const setSpaceRowOrder = (absSpaceDir: string, ids: string[]): Promise<Result<null>> =>
+  writeSpaceSidecar(absSpaceDir, (raw) => withIds(raw, ORDER_KEY, ids))
```

```Core/Nexus/mutateRequest.ts diff
-  op('setSpaceRowOrder', { path: z.string(), contexts: ids, properties: ids }),
+  op('setSpaceRowOrder', { path: z.string(), ids }),
```

```Core/Nexus/mutate.ts diff
@@ setSpaceRowOrder @@
-        return done(await setSpaceRowOrder(resolved.value, req.contexts, req.properties))
+        return done(await setSpaceRowOrder(resolved.value, req.ids))
```

```Core/Properties/PropertyPanel.tsx diff
@@ imports @@
-import { readSpaceRowOrder, type SpaceRowOrder } from '../Contexts/spaceSidecar'
-import { normalizeTitle } from '../Paths/caseFold'
@@ fields @@
   const isShown = (f: Field): boolean => held(f) || revealed.has(f.id)
-  const spaceOrder = useMemo(() => readSpaceRowOrder(spaceNode?.values), [spaceNode])
-  const nameOf = (f: Field): string => f.def?.name ?? f.label
-  const orderKey = (f: Field): string => normalizeTitle(nameOf(f))
   const nexusWide = resolveRowOrder(contextFields, (f) => f.id, tree?.config.order.contexts)
   const fields: Record<GroupKey, Field[]> = {
-    contexts: resolveRowOrder(nexusWide, orderKey, spaceOrder.contexts.map(normalizeTitle)),
-    properties: resolveRowOrder(schemaFields, orderKey, spaceOrder.properties.map(normalizeTitle)),
+    contexts: resolveRowOrder(nexusWide, (f) => f.id, spaceNode?.rowOrder),
+    properties: resolveRowOrder(schemaFields, (f) => f.id, spaceNode?.rowOrder),
   }
@@ commitOrder @@
   const commitOrder = (group: GroupKey, id: string, toIndex: number): void => {
     const shownIds = shown[group].map((f) => f.id)
     if (isSpace) {
       const moved = moveItem(shown[group], shownIds.indexOf(id), toIndex)
-      const next: SpaceRowOrder = {
-        contexts: (group === 'contexts' ? moved : shown.contexts).map(nameOf),
-        properties: (group === 'properties' ? moved : shown.properties).map(nameOf),
-      }
-      sendWithUndo((o) => void mutate({ op: 'setSpaceRowOrder', path, ...o }), next, spaceOrder)
+      const next = [
+        ...(group === 'contexts' ? moved : shown.contexts),
+        ...(group === 'properties' ? moved : shown.properties),
+      ].map((f) => f.id)
+      sendWithUndo(
+        (ids) => void mutate({ op: 'setSpaceRowOrder', path, ids }),
+        next,
+        spaceNode?.rowOrder ?? [],
+      )
       return
     }
```

**VERIFY**

- [ ] The listed tests pass; `spaceSidecar.test.ts:40-50` (`toEqual` on the whole node) passes with `rowOrder` absent.
- [ ] `git grep -nP '\bSpaceRowOrder\b|readSpaceRowOrder|req\.contexts|req\.properties' -- Core Desktop` finds nothing.
- [ ] Run the gates, then `view-delta` for Phase 1.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, reading outward: no reader still expects `$order` inside `SpaceNode.values` or in the `{ contexts, properties }` shape (`Core/Nexus/fileEvents.ts:453`'s `spaceNodeFrom` call, `Core/Properties/optionOps.ts:117`'s `space.values` read, the Matrix and tile readers of `values`); no rename path writes `$order` (`renameSweep`, `rekeyContext` and its `spend.ts:230` caller, the Space retitle); the property delete and the Context delete drop the id on every Space sidecar, and a refused Context delete puts the order back through `undoSweep`; the panel's three reorder paths each write ids, and undo returns the Space's prior list.

### Phase 2A — Exact Renames

**GOAL:** A property rename and a Context rename move one exact key, under the rival rule each already uses, so a case-only pair such as `Tags` to `tags` renames the key instead of deleting it. With the renames exact, the case-only skips leave: a case-only property, Context, or Space rename sweeps its holders, the rename refusal counts holders by exact key, and the rename replay compares names exactly. It's a separate phase because the case-only skips can only leave once the YAML and JSON renames are exact (*MetadataV3 — Decisions & Intention*, *§Constraints*), and it leaves reads and writes on today's spellings for Phase 2B. The index query stays folded through Phase 3: a folded holder query is a superset every caller re-reads exactly.

#### Task 2A-1

**TASK:** Make `renameFrontmatterKey` and `rekeyHeld` exact moves of one key under the rival rule, with their `join` parameter gone, and drop it at their three callers.

**NOW:** `renameFrontmatterKey(content, oldName, newName, collision, join)` (`Core/Files/pageFile.ts:207-243`) resolves the old key and the rival through `spellings` (`:221-225`), so on `Tags` to `tags` both name one node: `prefer-new` drops it (`:229-230`) and `merge` joins it and renames a node no longer in the document (`:231-240`). With `join`, every old spelling's value joins through `heldValue` (`:232`). `rekeyHeld(raw, oldName, newName, collision, join)` (`Core/Files/heldKeys.ts:94-110`) is the JSON twin over `heldKeys`/`heldKey`/`heldValue`/`landValue`, and leaves the key unchanged under `prefer-new` and re-cases it under `merge` on a case-only pair. The callers pass `join`: `renameSweep` (`Core/Properties/registryProperty.ts:87-92`, `holdsList(def)`) and the Context cascade's `rekeyContext` and `pageLeg` (`Core/Contexts/contextCascade.ts:36-39,85-90`, `true`, as Phase 1 left them).

**CHANGE**

- [ ] Write and watch fail: `pageFile.test.ts` — every `renameFrontmatterKey` call drops its last argument; a new case in *§the key keeps its place* (`:215`): `Tags: [a]` renamed to `tags` reads `tags: [a]` at the same line under `prefer-new` and under `merge`; the *§every spelling of the old name* describe (`:287-354`) is retitled *§a key in another casing is another key*: `:292-306` inverts (renaming `Tags` to `Labels` over `a: 1\nTags: ["b"]\ntags: [a, B]\nz: 2` holds `[['a', 1], ['Labels', ['b']], ['tags', ['a', 'B']], ['z', 2]]`, the `tags: [a, B]` line byte-identical), `:308-320` and `:322-331` go (their subject leaves; `renameSweep.test.ts:110` pins the rival rule), `:333` (a scalar rival merging, exact keys) moves into *§the key keeps its place* and `:344` moves with its fixture spelled `Tags:` (a lone key renamed with its comments kept); a new case: `Tags: [b]\nlabels: [x]` renamed `Tags` to `Labels` under `prefer-new` is `Labels: [b]\nlabels: [x]`, since a key in another casing is no rival. `heldKeys.test.ts:77-95`: the twin's `cases` drop the `join` column and become `['a: 1\nTags: [b]\nz: 2', 'Tags', 'tags', 'prefer-new']`, the same under `'merge'`, `['Tags: [b]\nLabels: [x]', 'Tags', 'Labels', 'prefer-new']`, `['<Projects>: [Y]\n<Ventures>: X', '<Projects>', '<Ventures>', 'merge']`, `['Tags: [b]\nlabels: [x]', 'Tags', 'Labels', 'prefer-new']`, and `['<Other>: x', 'Status', 'Stage', 'prefer-new']`, and each asserts the JSON rename equals the page rename. `renameSweep.test.ts:86-118` (*§reaches every spelling*): `:87-93` inverts (a page holding `status: Old` and a Space holding `status` are byte-identical after renaming `Status` to `Stage`); `:95-102` and `:104-108` go (their subject leaves); `:110-114` inverts (`Status: Stale\nstage: Fresh` becomes `Stage: Stale\nstage: Fresh`); a new case renames `Status` to `status` on a page and a Space holding `Status`, and both hold `status` after. `contextCascade.test.ts:185-191` inverts (a page and a Space holding `<projects>` keep it, byte-identical, through renaming `Projects` to `Ventures`), and `:193-217` goes (its subject leaves). `replaySchemaCascade.test.ts:75` drops the argument.
- [ ] `pageFile.ts`: `renameFrontmatterKey` drops `join` and the spelling lookup, finds `oldName` and the rival by exact key, removes the old pair under `prefer-new` when the rival is held, and otherwise joins the rival's value into the old pair through `joinValues`, drops the rival, and renames the pair in place; delete the `heldValue` import (the `spellings` import stays for `mergeInto` until Task 2B-1).
- [ ] `heldKeys.ts`: `rekeyHeld` drops `join` and moves `oldName` exactly: a held rival keeps its value under `prefer-new` and joins `oldName`'s under `merge`.
- [ ] `registryProperty.ts`: `renameSweep` drops `join` and its comment's spelling sentence; delete the `holdsList` import (its other readers leave in Task 2B-1).
- [ ] `contextCascade.ts`: `rekeyContext` and `pageLeg` drop the trailing `true`.

**AFTER**

```Core/Files/pageFile.ts diff
@@ imports @@
-  type Pair,
-  type ParsedNode,
   …
-import { heldValue, joinValues, type KeyCollision } from './heldKeys'
+import { joinValues, type KeyCollision } from './heldKeys'
@@ FrontmatterPair @@
-type FrontmatterPair = Pair<ParsedNode, ParsedNode | null>
-
@@ renameFrontmatterKey @@
-/** Renames every spelling of `oldName` the frontmatter holds to `newName`, at the first one's place. A held spelling of `newName` is the rival: under `'prefer-new'` it keeps its value and the old spellings go; otherwise the rival, the first old spelling, and with `join` the other old spellings combine through `joinValues`. */
+/** Renames `oldName` to `newName` in its place; null when nothing moves. A held `newName` is the rival: under `'prefer-new'` it keeps its value and `oldName` goes; under `'merge'` the two combine through `joinValues` in `oldName`'s place. */
 export function renameFrontmatterKey(
   content: string,
   oldName: string,
   newName: string,
   collision: KeyCollision,
-  join: boolean,
 ): string | null {
+  if (oldName === newName) return null
   const { frontmatter, body } = splitEnvelope(content)
   const doc = parseDocument(frontmatter)
   if (doc.errors.length > 0 || !isMap(doc.contents)) return null
   const items = doc.contents.items
-  const keys = items.map((i) => String(i.key))
-  const values = valuesOf(doc)
-  const held = (name: string): FrontmatterPair[] =>
-    spellings(keys, name).map((k) => items[keys.indexOf(k)])
-  const [pair, ...variants] = held(oldName)
+  const held = (name: string) => items.find((i) => String(i.key) === name)
+  const pair = held(oldName)
   if (!pair) return null
-  const [rival] = held(newName)
-  const drop = (p: FrontmatterPair): void => {
-    items.splice(items.indexOf(p), 1)
-  }
+  const rival = held(newName)
   if (rival && collision === 'prefer-new') {
-    for (const p of [pair, ...variants]) drop(p)
+    items.splice(items.indexOf(pair), 1)
   } else {
-    const moved = heldValue(values, oldName, join)
-    const value = rival ? joinValues(values[String(rival.key)], moved) : moved
-    const joined = [...variants, ...(rival ? [rival] : [])]
-    const spelled = [pair, ...joined].map((p) => p.value)
-    if (value !== values[String(pair.key)])
-      doc.set(String(pair.key), nodeSpelledAs(doc, value, spelled))
-    for (const p of joined) drop(p)
+    if (rival) {
+      const values = valuesOf(doc)
+      const joined = joinValues(values[newName], values[oldName])
+      doc.set(oldName, nodeSpelledAs(doc, joined, [pair.value, rival.value]))
+      items.splice(items.indexOf(rival), 1)
+    }
     ;(pair.key as { value: string }).value = newName
   }
```

```Core/Files/heldKeys.ts diff
@@ rekeyHeld @@
-/** A JSON root with every spelling of `oldName` moved to `newName`; the twin of `renameFrontmatterKey`, by the same collision and join rules. */
+/** A JSON root with `oldName` moved to `newName`, null when nothing moves; the twin of `renameFrontmatterKey`, by the same collision rule. */
 export function rekeyHeld(
   raw: Json,
   oldName: string,
   newName: string,
   collision: KeyCollision,
-  join: boolean,
 ): Json | null {
-  const olds = heldKeys(raw, oldName)
-  if (!olds.length) return null
-  const rival = heldKey(raw, newName)
-  if (rival !== undefined && collision === 'prefer-new')
-    return landValue(raw, { key: rival, govern: olds }, raw[rival])
-  const moved = heldValue(raw, oldName, join)
-  if (rival === undefined) return landValue(raw, { key: newName, govern: olds }, moved)
-  return landValue(raw, { key: newName, govern: [...olds, rival] }, joinValues(raw[rival], moved))
+  if (oldName === newName || !Object.hasOwn(raw, oldName)) return null
+  const { [oldName]: moved, ...rest } = raw
+  if (!Object.hasOwn(rest, newName)) return { ...rest, [newName]: moved }
+  return collision === 'prefer-new' ? rest : { ...rest, [newName]: joinValues(rest[newName], moved) }
 }
```

```Core/Properties/registryProperty.ts diff
@@ imports @@
 import {
   defaultStatusSeed,
   defaultSelectSeed,
-  holdsList,
   KEY_REFUSAL,
@@ renameSweep @@
-  // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too. A list property's spellings join; any other keeps the value its read key holds.
+  // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too.
   const files = await keyHolderFiles(root, oldName, await collectionFolders(root))
-  const join = holdsList(def)
   const text = (content: string): string | null =>
-    renameFrontmatterKey(content, oldName, def.name, NEW_KEY_IS_FRESHER, join)
-  const rekey: Rewrite = (raw) => rekeyHeld(raw, oldName, def.name, NEW_KEY_IS_FRESHER, join)
+    renameFrontmatterKey(content, oldName, def.name, NEW_KEY_IS_FRESHER)
+  const rekey: Rewrite = (raw) => rekeyHeld(raw, oldName, def.name, NEW_KEY_IS_FRESHER)
   const swept = await sweepGovernedRoots(root, files, { text, sidecars: rekey })
```

```Core/Contexts/contextCascade.ts diff
@@ rekeyContext @@
-    rekeyHeld(raw, contextKey(oldTitle), contextKey(newTitle), NEITHER_KEY_IS_FRESHER, true)
+    rekeyHeld(raw, contextKey(oldTitle), contextKey(newTitle), NEITHER_KEY_IS_FRESHER)
@@ pageLeg @@
-  return (content) => renameFrontmatterKey(content, oldKey, newKey, NEITHER_KEY_IS_FRESHER, true)
+  return (content) => renameFrontmatterKey(content, oldKey, newKey, NEITHER_KEY_IS_FRESHER)
```

**VERIFY**

- [ ] The listed tests pass; `heldKeys.test.ts`'s twin answers the page rename's keys and values for every case.
- [ ] `git grep -nP "(renameFrontmatterKey|rekeyHeld)\(.*(FRESHER|'prefer-new'|'merge'|collision), (true|false|join)\)" -- Core` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2A-2

**TASK:** Delete the property and Context case-only skips, count rename clashes by exact key, let the rename replay act while no definition holds `from` exactly, and let the Context and Space rename replay tell a case-only pair's two titles apart on a disk that folds case, so a case-only rename and its owed record sweep like any other.

**NOW:** `renameProperty` computes `recased` (`registryProperty.ts:124-126`), skips the clash check and the sweep on it (`:126,150`), and so commits a case-only rename as a registry edit; `bothKeyHolders` (`:102-108`) intersects `confirmedKeyHolders`, which reads each candidate through `heldKey` (`Core/Properties/keyHolders.ts:33,38`), so a file holding `Status` "holds" `STATUS` too. `cascadeTitle` (`contextCascade.ts:115-119`) returns an empty sweep for a case-only Context or Space retitle and owes a walk. Replay's `named` folds (`Core/Properties/replaySchemaCascade.ts:38-41`): the rename arm acts while the definition is named `to` in any casing and none is named `from` (`:50-56`), so an owed case-only rename clears itself and a chained rename (`from` → `to` → a third name) is dropped. The delete arm's `crashed` and `freed` (`:60-61`) and the create supersede (`registryProperty.ts:68-76`) keep their fold until Task 2B-1, since the strip they guard stays folded until then. `replayPendingRename` (`Core/Contexts/contextCascade.ts:303-362`) finds a Context's folder by `pathExists` (`:326-328`) and a Space's by reading `join(ctxDir, title, SPACE_SIDECAR)` (`:338-342`), and checks a re-mint and a move target by `pathExists` (`:348-357`); on a disk that folds case, `Pommora` and `pommora` are one folder, so a case-only Space retitle's owed record reads as re-minted and clears unswept, and a case-only Context rename that crashed before its folder move never moves it. The live rename already tells them apart through `targetTaken` (`:280`), and `heldName` (`Core/Files/atomicWrite.ts:320-323`) answers the spelling a folder holds.

**CHANGE**

- [ ] Write and watch fail: `registryProperty.test.ts:157-177` inverts — a case-only rename `Status` to `STATUS` rewrites the page's `Status: Active` to `STATUS: Active` and the Space's `Status` to `STATUS`, leaves a second Space holding `status` byte-identical, and clears the journal; `:142-155` seeds the page with `Description: a page about bars` (exactly the new name) and still asserts the bytes unchanged. `replaySchemaCascade.test.ts`: `:125-144` passes unchanged; a new case: a record `{ from: 'Status', to: 'Stage' }` replayed while the definition is named `Phase` sweeps the pages' `Status` to `Phase`; a new case: an owed `{ from: 'Stage', to: 'stage' }` with the definition named `stage` sweeps `Stage:` to `stage:` and clears; `contextCascade.test.ts` (*§case folding on renames*, `:131-216`): `:132-138` passes unchanged (D-3); `:143-151` inverts — renaming the Context to `projects` rewrites `page()`'s and `csSidecar()`'s `<Projects>` to `<projects>`, leaves `other()`, which already holds `<projects>`, byte-identical, and clears the journal; `:153-174` inverts — renaming the Context to `projects` over a page holding `<projects>: [Sapphire]` and `<Projects>: [Pommora]` merges them into `<projects>: [Sapphire, Pommora]`, and the page's `contextValues` read `{ ctx_projects: ['sp-sap', 'sp-pom'] }` before and after; `:176-183` inverts, its `other()` seed dropped — renaming Space `Pommora` to `pommora` rewrites `page()`'s and `csSidecar()`'s `<Projects>` to `['pommora']` and clears the journal. `keyHolders.test.ts:120-128` inverts: `confirmedKeyHolders(root, 'Phase', …)` over a page holding `phase` and a Space holding `PHASE` is `[]`, and a page holding `Phase` is listed. `settle.test.ts:1059-1066` inverts, retitled *a rename that changes only the name's casing moves the key*: the page reads `TAGS:` after the rename, and the `registerHeldOptions` spy assertion goes (Task 2B-2 pins the adoption a re-cased name owes). `contextCascade.test.ts`, new cases under *§case folding on renames*: a held journal `{ contextId: 'ctx_projects', spaceId: 'sp-pom', oldTitle: 'Pommora', newTitle: 'pommora', skipped: [page] }` with the Space's folder already `pommora` and `page()` still holding `<Projects>: [Pommora]` makes `replayPendingRename(root)` rewrite it to `['pommora']` and clear the journal; the same journal with the folder still `Pommora` (a crash before the move) renames the folder to `pommora`, rewrites the page, and clears; a held Context journal `{ contextId: 'ctx_projects', oldTitle: 'Projects', newTitle: 'projects', skipped: [] }` with the registry still `Projects` and the folder `Projects` renames the folder to `projects`, rewrites `<Projects>` to `<projects>`, commits the title, and clears.
- [ ] `registryProperty.ts`: delete `recased` and its comment's last sentence; `clashes` is `bothKeyHolders(root, prior.name, to)` and the sweep always runs.
- [ ] `keyHolders.ts`: `confirmedKeyHolders` reads `Object.hasOwn` at both loops (the `heldKey` import stays for `keyedHolders` until Task 2B-1).
- [ ] `contextCascade.ts`: delete the case-only branch and its comment at `cascadeTitle` (`:115-119`) and the `oweWalk` import (its one reader); `replayPendingRename` moves a Context's folder only while the old title is the folder's exact spelling and the new title isn't taken (`targetTaken`), its Space arm finds a title only where it's the folder's exact spelling, reads a re-mint only when the old title is held exactly, and moves only when `targetTaken` answers false; `heldName` joins the `atomicWrite` import.
- [ ] `replaySchemaCascade.ts`: the rename arm acts while no definition's name is exactly `from`, sweeping to the definition's current name, and its comment says so (`named` keeps its fold for the delete arm until Task 2B-1).

**AFTER**

```Core/Properties/registryProperty.ts diff
@@ renameProperty @@
-    // A file holding only the new key is adopted, its value going live as a create's would; one holding both would lose a value to the merge. A change of case alone moves no key, and the holders a folded query finds are its own.
-    const recased = normalizeTitle(to) === normalizeTitle(prior.name)
-    const clashes = recased ? [] : await bothKeyHolders(root, prior.name, to)
+    // A file holding only the new key is adopted, its value going live as a create's would; one holding both would lose its old value.
+    const clashes = await bothKeyHolders(root, prior.name, to)
@@
     const { from, def } = edit.value
-    const skipped = recased ? 0 : await renameSweep(root, from, def)
+    const skipped = await renameSweep(root, from, def)
```

```Core/Properties/keyHolders.ts diff
@@ confirmedKeyHolders @@
-    if (content === null ? indexed !== null : heldKey(splitFrontmatter(content), key) !== undefined)
+    if (content === null ? indexed !== null : Object.hasOwn(splitFrontmatter(content), key))
       holders.push(file)
   }
   for (const file of await spaceSidecars(root)) {
     const raw = await readJsonObject(file)
-    if (raw && heldKey(raw, key) !== undefined) holders.push(file)
+    if (raw && Object.hasOwn(raw, key)) holders.push(file)
   }
```

```Core/Contexts/contextCascade.ts diff
@@ imports @@
-import { oweWalk } from '../Nexus/fileEvents'
@@ cascadeTitle @@
 ): Promise<SweepResult> {
-  // A title that changes only its case moves no key or value: every file's spelling already resolves to it. A file holding two spellings of a Context's key is read under the one the new title matches, so the held tree is owed a walk.
-  if (normalizeTitle(j.oldTitle) === normalizeTitle(j.newTitle)) {
-    if (j.spaceId === undefined) oweWalk(root)
-    return { touched: new Map(), skipped: [], refused: [] }
-  }
   // The key being rewritten comes from the journal, never the registry title, which may already read old or new.
```

```Core/Contexts/contextCascade.ts diff
@@ imports @@
-import { pathExists, readJsonStrict, relocate, targetTaken } from '../Files/atomicWrite'
+import { heldName, pathExists, readJsonStrict, relocate, targetTaken } from '../Files/atomicWrite'
@@ replayPendingRename (Context arm) @@
-    if ((await pathExists(oldDir)) && !(await pathExists(newDir))) await relocate(oldDir, newDir)
+    if ((await heldName(oldDir)) === j.oldTitle && !(await targetTaken(oldDir, newDir)))
+      await relocate(oldDir, newDir)
@@ replayPendingRename (Space arm) @@
   const findTitle = async (title: string): Promise<boolean | null> => {
+    if ((await heldName(join(ctxDir, title))) !== title) return false
     const sc = await readJsonStrict(join(ctxDir, title, SPACE_SIDECAR))
   …
-  if (atNew && (await pathExists(join(ctxDir, j.oldTitle)))) {
+  if (atNew && (await heldName(join(ctxDir, j.oldTitle))) === j.oldTitle) {
     // The freed old title was re-minted by another Space — discard, never hijack.
   …
   if (atOld) {
     const target = join(ctxDir, j.newTitle)
-    if (await pathExists(target)) {
+    if (await targetTaken(join(ctxDir, j.oldTitle), target)) {
```

```Core/Properties/replaySchemaCascade.ts diff
@@ rename @@
     case 'rename': {
-      // The def still named `to` in any casing, with `from` taken by none, means the commit landed and the sweep is owed, to the name the def holds now; anything else is a state the record no longer maps.
+      // The def alive while no definition is named `from` means the commit landed and the sweep is owed, to the name the def holds now, however many renames have followed; anything else is a state the record no longer maps.
       const def = defs[journal.id]
-      if (!def || !named(journal.to)(def) || Object.values(defs).some(named(journal.from)))
-        return NO_REACH
+      if (!def || Object.values(defs).some((d) => d.name === journal.from)) return NO_REACH
       return { skipped: await renameSweep(root, journal.from, def), hosts: [] }
```

**VERIFY**

- [ ] The listed tests pass; `contextCascade.test.ts:132-138` still refuses `classes` over another Context's title, and `registryProperty.test.ts:178-196` still refuses a rename onto a key a file holds beside the old one.
- [ ] `git grep -n "recased" -- Core/Properties` and `git grep -n "oweWalk" -- Core/Contexts/contextCascade.ts` find nothing.
- [ ] Run the gates, then `view-delta` for Phase 2A.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, reading outward: no rename path still resolves a key through a spelling (`renameSweep`, `rekeyContext` and its `spend.ts:230` caller, `pageLeg`, the rename replay); a case-only property, Context, and Space rename each sweep their holders and clear their journal, and a crash before or after the folder move, or a skipped holder, replays them on the next open; `bothKeyHolders` refuses only a file holding both exact keys; the rename replay sweeps a chained rename to the current name and clears a record whose `from` a live definition holds; the delete replay and the create supersede still fold, guarding a strip that still folds; nothing reads `recased` or the deleted skip's walk.

### Phase 2B — Reads and Writes Land on the Key

**GOAL:** Every read and write of a property or `<Title>:` key lands on that key exactly, and the spelling machinery in `Core/Files/heldKeys.ts` leaves: `heldKeys`, `heldKey`, `heldValue`, `writeTarget`, `WriteTarget`, `stripHeld`, `byFoldedName`, `holdsList`, `joins`, `joinsSpellings`, `Governor.name`, the reconcile's join-and-retire branch, and `mergeInto`'s spelling step. `landValue` becomes one set-or-delete, `editHeldList` one exact list edit, and `spellings` leaves `caseFold.ts`, folding into `heldName`, its last reader. Option words and Space titles keep their fold until Phase 3.

#### Task 2B-1

**TASK:** Remove the spelling resolution behind every value read, write, and strip: `heldValue`, `writeTarget`, `WriteTarget`, `stripHeld`, `holdsList`, `joins`, `joinsSpellings`, `Governor.name`, the reconcile's join-and-retire branch, and `mergeInto`'s spelling step; reduce `landValue` to a set-or-delete and `editHeldList` to one key; delete `heldPropertyValue`, which becomes the key's own read; replace `byFoldedName` with an exact `byKey`; and sweep every consumer.

**NOW:** `heldValue` joins a list property's spellings (`heldKeys.ts:14-26`); `writeTarget` collapses two or more held spellings (`:28-39`); `landValue(root, { key, govern }, value)` retires the governed spellings (`:41-48`); `editHeldList(raw, name, join, edit)` edits joined or per-spelling (`:60-78`). `byFoldedName` maps a folded title to its definition (`Core/Properties/properties.ts:49-50`) and `holdsList` says whether spellings join (`:65-69`). `reconcileGovernedRoot` (`Core/Contexts/contextResolve.ts:110-157`) reconciles a key only when `heldKey` reads it, joins its spellings through `joins` and `heldValue`, and retires the others through `writeTarget`; `governorOf` looks up by fold and carries `name` (`:91-98`); `resolveContextKeys` reads a `<Title>:` key only when `heldKey` names it and joins its spellings (`:67-84`); `groupOf` and `idByTitle` fold the Context title (`:33,61-65`). `writtenRoot` collapses and spells through `writeTarget`, `heldValue`, and `joinsSpellings` (`Core/Properties/governedWrite.ts:15-21`). `mergeInto` lets a written key take a dropped spelling's place (`Core/Files/pageFile.ts:171-177,181`). The other consumers: `heldPropertyValue` (`Core/Properties/propertyValue.ts:240-244`), read by `refillValues` (`Core/Properties/assignment.ts:60`), the delete snapshot (`Core/Properties/deleteProperty.ts:65`), `keyedHolders` (`Core/Properties/keyHolders.ts:66`), `registerHeldOptions` (`Core/Properties/optionOps.ts:102`), and `resolveFieldValue` (`Core/Properties/value.ts:57`); `applyValueAtRoot` (`propertyValue.ts:246-256`), `valueEditRewrite` (`Core/Properties/pageValue.ts:36-43`), `refillValues` and `assignedDefs` (`Core/Properties/assignment.ts:41,45,61-65`), `refillTrashed` (`Core/Trash/holdings.ts:128-148`), the Trash re-tag's `reapply` (`Core/Trash/spend.ts:297-301`), `setSpaceContext`'s far read (`Core/Contexts/contextWrite.ts:103-105`), `retitleSpace` and `unlinkSpaceValue` (`contextCascade.ts:45-48,161`), `linkKeysOf` (`Core/Properties/schema.ts:29-36`), the delete cascade's Link map (`Core/Nexus/cascade.ts:80,87`), the restore scrub's Link map (`Core/Trash/restoreScrub.ts:35,41,47`), and the property delete and Remove, whose holders `keyedHolders` reads through `heldKey` (`Core/Properties/keyHolders.ts:59`), whose snapshot reads Space sidecars through `heldKey` (`Core/Properties/deleteProperty.ts:62`), and whose strips go through `stripHeld` (`heldKeys.ts:86-90`; `deleteProperty.ts:119`; `Core/Properties/removeProperty.ts:55`).

**CHANGE**

- [ ] Write and watch fail: `heldKeys.test.ts` — its imports drop `heldValue` and `stripHeld`; `:31-38` (`heldValue`) and `:97-105` (`stripHeld`) go; the `editHeldList` describe (`:40-75`) takes `(raw, key, edit)`: `:43-47` and `:56-65` go (their subject leaves), `:49-54` strips `'a'` from `{ ID: 'p', Tags: ['a', 'b'] }` to `{ ID: 'p', Tags: ['b'] }`, `:67-69` empties `{ Tags: ['a'] }` to `{}`, and `:71-74` answers null for `{ Tags: ['b'] }` and for `{ tags: ['a'] }` (another casing holds nothing). `properties.test.ts`: imports take `byKey` for `byFoldedName` and drop `holdsList`; `:310` inverts (`byKey` keys `Due Date` as written, `[['Due Date', def]]`); `:315` goes; the `:309` describe is retitled *byKey*. `governedWorld.test.ts:49,69` invert (the assigned map's keys are `['Status']` as written, and `defs.get('Status')` answers the definition). `contextResolve.test.ts`: `:8,102,239,252` take `byKey`; `:332` passes `'Status'` for `['Status']`; `:64` inverts (`{ '<projects>': ['Pommora'] }` resolves nothing, and beside `<Projects>` only `<Projects>` reads, `['sp1']`); `:75` goes; `:259` inverts (`{ status: 'Open' }` passes through verbatim with `changed` `[]`); `:272`, `:278`, `:283`, `:303`, and `:321` go (their subject leaves); `:265`, `:296`, and `:311` keep their assertions with the spelling clause gone from their titles. `governedWrite.test.ts`: `:7,104,158,177` take `byKey`; `:183` inverts (`status: 'Open'` stays and `Status` is written `['Done']` after the other keys); `:191` and `:241` seed `Tags:` for `tags:` and keep their assertions; `:212`, `:221`, and `:231` go. `setSpaceProperty.test.ts:163` inverts (`status` keeps `'Option 1'` and `Status` is written `['Option 2']`); `:171`, `:179`, and `:187` go. `value.test.ts:115` inverts (`{ status: 'in_progress' }` reads `{ kind: 'null' }`, `{ status, Status }` reads `Status`'s value, `{ STATUS, status }` reads `{ kind: 'null' }`); `:134` goes. `propertyValue.test.ts:378` inverts (`{ status: 'Open' }` takes `Status: ['Done']` beside it, and a clear leaves `{ status: 'Open' }`); `:385` goes. `assignValue.test.ts:47` goes. `assignment.test.ts:121` inverts (`Status` fills `['hi']` and `status` stays null); `:137` and `:144` go. `keyHolders.test.ts:141` inverts (a page holding `tags` files no value: `{ values: {}, strip: [file], partial: false }`); `:151` and `:157` go. `deleteProperty.test.ts:218` inverts (the page keeps `tags: [b]`, the Space keeps `tags: ['a', 'B']`, and the bundle's values are `{ [pid]: ['a'], sp1: ['b'] }`, each root's exact `Tags`). `removeProperty.test.ts:116` inverts (the page keeps `stage`, and the cache holds nothing for it). `repairSweep.test.ts:179` goes (both keys are foreign and the file stays byte-identical); `:171` keeps its assertions with its title's spelling clause gone. `schema.test.ts:132` inverts (`linkKeysOf`'s `holds('rank')` is true as an untyped key and `holds('Rank')` false as the Number it names). `optionOps.test.ts:437` inverts (`{ ID, status: 'Done', Tags: ['Finished', 'Keep'], tags: ['Done'] }`: only the exact keys are rewritten). `contextWrite.test.ts:296` inverts (the far half edits `<Projects>` to `['B', 'Pommora']` and leaves `<projects>: ['C']`); `:308` goes. `contextCascade.test.ts:221` inverts (both `<projects>` holders keep `['Pommora']` through the Space rename). `spend.test.ts:862` inverts (`<projects>` keeps `['sapphire']` and `<Projects>` is written `['Pommora']`); `:868` goes; `:1031` inverts (`Related` takes `'[[Alpha]]'` and `related` stays null). `trashRecovery.test.ts:367` and `:714` go. `restoreScrub.test.ts:320` inverts (a gone Link under `related` stays, since `related` is no Link property's key; *MetadataV3 — Investigation* listed it under *Stay*, which predates exact keys). `cascade.test.ts:561` inverts (`related` stays and `r.links` is `[]`); `:216` is retitled *moves a connection held under a key no property claims*. `pageFile.test.ts:357`, `:368`, and `:379` go, `:390` stays, and the `:356` describe is retitled *mergeFrontmatter — a written key and a dropped one*. `settle.test.ts:1028` seeds `Labels:` and `:1037` seeds the Space's `Labels`, each keeping its assertions. `replaySchemaCascade.test.ts:203-215` inverts — a create named `example` leaves the `{ op: 'delete', name: 'Example' }` record in the slot, and a create named `Example` clears it; a new case: a record `{ op: 'delete', name: 'Example' }` with skipped files, followed by a create of `example` and a replay, strips `Example:` and leaves the pages holding `example:` byte-identical.
- [ ] `heldKeys.ts`: delete the header comment (it describes spelling resolution), `heldValue`, `WriteTarget`, `writeTarget`, `stripHeld`, and the `foldKey` and `setOrDrop` imports; `landValue(root, key, value)` sets or, on `undefined`, deletes (`setOrDrop` stays separate, since it drops every falsy value and a Number `0` is a value); `editHeldList(raw, key, edit)` edits the one key's list.
- [ ] `properties.ts`: delete `holdsList`; `byFoldedName` becomes `byKey`, keyed by `name` exactly (Phase 5 re-keys it to `key`); the `foldKey` import goes.
- [ ] `contextResolve.ts`: `Governor` is `{ def } | { group }`; `governorOf` looks up by the exact key; delete `joins` and `joinsSpellings`; `reconcileGovernedRoot` reconciles each governed key from its own value, drops a frozen blank, and pushes `changed` when the written value differs; `resolveContextKeys` reads each `<Title>:` key's own value; `idByTitle` and `groupOf` key by the exact Context title; `spaceWorldOf` uses `byKey`; the `heldKey`, `heldValue`, `writeTarget`, `holdsList`, `contextKey`, and `foldKey` imports go; the docs at `:19,45` and the comments at `:110,137` lose their spelling clauses.
- [ ] `governedWrite.ts`: `writtenRoot` skips `name` in the reconcile and lands `writtenSpelling(value, raw[name])` under `name`; `setGovernedRootKey`'s worldless branch is `landValue(raw, name, value)`.
- [ ] `propertyValue.ts`: delete `heldPropertyValue`; its five callers read the key itself (`raw[def.name]`, `values[def.name]`, `fields[def.name]`, `row.frontmatter[def.name]`), each import following; `applyValueAtRoot` lands under `def.name`; the `holdsList`, `heldValue`, and `writeTarget` imports go.
- [ ] `pageValue.ts`: `valueEditRewrite` edits `def.name` through `editHeldList(raw, def.name, edit)`, over `Pick<PropertyDefinition, 'name'>`; the `holdsList` import goes.
- [ ] `pageFile.ts`: `mergeInto` deletes the spelling step (`:171-177`) and spells each written key from its own held node; `nodeSpelledAs`'s doc says "the `held` nodes" for "the `held` spellings of its key"; the `spellings` import goes.
- [ ] Sibling sweep: `assignment.ts` (`byKey` at `:41,45`; `refillValues` lands under `def.name`); `holdings.ts:140-141` (`isBlankRaw(next[name])`, `landValue(next, name, value)`, its doc losing "landing where `writeTarget` places it"); `spend.ts:299` (`landValue(raw, key, joinValues(raw[key], titles))`); `contextWrite.ts:103-105` (`listOf(raw[backKey] ?? [])`, its comment's "every spelling's members" clause becoming "its other members"); `contextCascade.ts:46,161` (`editHeldList(raw, key, edit)`); `schema.ts:29-36` (`byKey`, `names.get(key)`, the doc's "One folded lookup" becoming "One lookup", the `foldKey` import going); `cascade.ts:80,87` (`byKey`, `defs.get(key)`, the `foldKey` import going); `restoreScrub.ts:35,41,47` (`byKey`, `links.has(k)`, `links.get(key)`, the `foldKey` import going) and `:74-75` (the reconcile skips `inTransitKey` itself, the one key `skip` now takes, and its `heldKeys` import goes); `keyHolders.ts:59` (`Object.hasOwn`, the `heldKey` import going); `deleteProperty.ts:62` (`Object.hasOwn`) and `:119` (`(r) => stripKeys(r, [key])`, typed `Rewrite`), its `heldKey`/`stripHeld` import becoming `stripKeys`; `removeProperty.ts:55` likewise; `replaySchemaCascade.ts` deletes `named`, the delete arm comparing `journal.name` inline as Task 2A-2's rename arm already does, and the `normalizeTitle` import goes; `registryProperty.ts:68-76`'s create supersede compares `journal.name === landed`, and the `normalizeTitle` import goes (its last reader).

**AFTER**

```Core/Files/heldKeys.ts diff
@@ header @@
-// What a root holds for a name, and where a write to it lands. A name is held under its exact spelling, else the first key that folds to it, in the root's order: a scalar read acts on that one key and a list read joins every spelling in the root's order; a write lands on a lone spelling where it sits and, when it collapses, puts the name in place of two or more, and a rename, a strip, or a list edit acts on every spelling.
-
-import { setOrDrop } from './atomicWrite'
 import type { Json } from './stableJson'
-import { foldKey, spellings, normalizeTitle } from '../Paths/caseFold'
+import { spellings, normalizeTitle } from '../Paths/caseFold'
 import { isScalar, listOf } from '../Contract/validators'
@@ heldValue @@
-/** What `root` holds for `name`: the value under the key `heldKey` reads, or with `join` every spelling's value as one list, in the root's order. */
-export function heldValue(root: Json, name: string, join: boolean): unknown {
-  …
-}
-
-interface WriteTarget {
-  key: string
-  govern: readonly string[]
-}
-
-/** Where a write to `name` lands on `root` and the spellings it replaces: … */
-export function writeTarget(root: Json, name: string, collapse = true): WriteTarget {
-  …
-}
@@ landValue @@
-/** `root` with `value` under the target's key in place of every key it governs, the target keeping its place when the root holds it; `undefined` drops the key. */
-export function landValue(root: Json, { key, govern }: WriteTarget, value: unknown): Json {
+/** `root` with `value` under `key`, in its place when the root holds it; `undefined` drops the key. */
+export function landValue(root: Json, key: string, value: unknown): Json {
   const next = { ...root }
-  for (const k of govern) if (k !== key) delete next[k]
   if (value === undefined) delete next[key]
   else next[key] = value
   return next
 }
@@ editHeldList @@
-/** Edits what `name` holds as a list; null when nothing changed. With `join`, every spelling is edited as one list landing where `writeTarget` places it; otherwise each spelling is edited where it sits. A list the edit empties drops its key. */
-export function editHeldList(
-  raw: Json,
-  name: string,
-  join: boolean,
-  edit: (held: unknown[]) => unknown[] | null,
-): Json | null {
-  if (join) {
-    const held = heldValue(raw, name, true)
-    const list = held === undefined ? null : edit(listOf(held))
-    return list && landValue(raw, writeTarget(raw, name), list.length ? list : undefined)
-  }
-  let next: Json | null = null
-  for (const key of heldKeys(raw, name)) {
-    const list = edit(listOf(raw[key]))
-    if (list) next = setOrDrop(next ?? raw, key, list.length ? list : undefined)
-  }
-  return next
-}
+/** Edits what `key` holds as a list; null when nothing changed. A list the edit empties drops its key. */
+export function editHeldList(
+  raw: Json,
+  key: string,
+  edit: (held: unknown[]) => unknown[] | null,
+): Json | null {
+  const list = Object.hasOwn(raw, key) ? edit(listOf(raw[key])) : null
+  return list && landValue(raw, key, list.length ? list : undefined)
+}
@@ joinValues doc @@
-/** Two values as one list: `keep`'s members, then each of `from`'s that matches none of them by `memberKey`; a single value reads as a list of one. Every join of two spellings, and a `'merge'` rename, uses it. */
+/** Two values as one list: `keep`'s members, then each of `from`'s that matches none of them by `memberKey`; a single value reads as a list of one. */
@@ stripKeys @@
-  if (!keys.some((k) => k in root)) return null
+  if (!keys.some((k) => Object.hasOwn(root, k))) return null
@@ stripHeld @@
-/** Strips every spelling of `name` from a root; null when it holds none. */
-export const stripHeld =
-  (name: string) =>
-  (root: Json): Json | null =>
-    stripKeys(root, heldKeys(root, name))
-
```

```Core/Properties/properties.ts diff
@@ imports @@
-import { foldKey, normalizeTitle } from '../Paths/caseFold'
+import { normalizeTitle } from '../Paths/caseFold'
@@ byFoldedName @@
-export const byFoldedName = <D extends { name: string }>(defs: Iterable<D>): Map<string, D> =>
-  new Map(Array.from(defs, (d) => [foldKey(d.name), d]))
+export const byKey = <D extends { name: string }>(defs: Iterable<D>): Map<string, D> =>
+  new Map(Array.from(defs, (d) => [d.name, d]))
@@ holdsList @@
-/** Whether two spellings of the property's key join into one list; every other type keeps the value its read key holds. */
-export function holdsList(def: Pick<PropertyDefinition, 'type'>): boolean {
-  const kind = PROPERTY_TYPES[def.type].kind
-  return kind === 'multiSelect' || kind === 'file'
-}
-
```

```Core/Contexts/contextResolve.ts diff
@@ imports @@
-import { foldKey, normalizeTitle } from '../Paths/caseFold'
-import { heldKey, heldValue, memberKey, writeTarget } from '../Files/heldKeys'
-import { contextKey, contextTitles, parseContextKey } from './contexts'
-import { byFoldedName, holdsList, type PropertyDefinition } from '../Properties/properties'
+import { normalizeTitle } from '../Paths/caseFold'
+import { memberKey } from '../Files/heldKeys'
+import { contextTitles, parseContextKey } from './contexts'
+import { byKey, type PropertyDefinition } from '../Properties/properties'
@@ ContextWorld @@
   groupById: ReadonlyMap<string, ContextGroup>
-  /** Keyed by folded title. */
   idByTitle: ReadonlyMap<string, string>
@@ contextWorldOf @@
-    idByTitle: new Map(groups.map((g) => [foldKey(g.def.title), g.def.id])),
+    idByTitle: new Map(groups.map((g) => [g.def.title, g.def.id])),
@@ GovernedWorld @@
   contexts: ContextWorld
-  /** Keyed by folded name. */
   defs: ReadonlyMap<string, PropertyDefinition>
@@ spaceWorldOf @@
-// A Space holds any registry property, so its own values reconcile against every definition, by name.
+// A Space holds any registry property, so its own values reconcile against every definition, by key.
 export const spaceWorldOf = (tree: NexusTree): GovernedWorld =>
-  governedWorld(tree, byFoldedName(tree.config.registry))
+  governedWorld(tree, byKey(tree.config.registry))
@@ groupOf @@
-  const id = title === null ? undefined : world.idByTitle.get(foldKey(title))
+  const id = title === null ? undefined : world.idByTitle.get(title)
@@ resolveContextKeys @@
   const links: ResolvedLinks = new Map()
-  for (const key of Object.keys(root)) {
+  for (const [key, raw] of Object.entries(root)) {
     const group = groupOf(key, world)
     if (!group) continue
-    const name = contextKey(group.def.title)
-    if (heldKey(root, name) !== key) continue
     const byTitle = world.spacesByTitle.get(group.def.id)
-    const ids = contextTitles(heldValue(root, name, true)).flatMap(
-      (title) => byTitle?.get(title)?.id ?? [],
-    )
+    const ids = contextTitles(raw).flatMap((title) => byTitle?.get(title)?.id ?? [])
     if (ids.length) links.set(group.def.id, ids)
   }
@@ Governor @@
-type Governor = { name: string; def: PropertyDefinition } | { name: string; group: ContextGroup }
+type Governor = { def: PropertyDefinition } | { group: ContextGroup }
 
 function governorOf(key: string, world: GovernedWorld): Governor | undefined {
-  const def = world.defs.get(foldKey(key))
-  if (def) return { name: def.name, def }
+  const def = world.defs.get(key)
+  if (def) return { def }
   const group = groupOf(key, world.contexts)
-  return group && { name: contextKey(group.def.title), group }
+  return group && { group }
 }
-
-const joins = (governor: Governor): boolean => 'group' in governor || holdsList(governor.def)
-
-/** Whether a read of `name` joins its spellings: a Context key's or a list-holding property's does. */
-export function joinsSpellings(name: string, world: GovernedWorld): boolean {
-  const governor = governorOf(name, world)
-  return governor !== undefined && joins(governor)
-}
@@ reconcileGovernedRoot @@
-// A governed name reconciles once, under the key `heldKey` reads: a list's spellings join it under the registered spelling and leave once that key is written, while a scalar's other spellings pass through as foreign, for a write to settle. A key in `skip` passes through verbatim.
 export function reconcileGovernedRoot(
   root: Record<string, unknown>,
   world: GovernedWorld,
   frozen?: Frozen,
-  skip: readonly string[] = [],
+  skip?: string,
 ): Reconciled {
   const out: Record<string, unknown> = {}
   const changed: string[] = []
-  const retired = new Set<string>()
   for (const [key, raw] of Object.entries(root)) {
-    const governor = skip.includes(key) ? undefined : governorOf(key, world)
+    const governor = key === skip ? undefined : governorOf(key, world)
-    if (!governor || heldKey(root, governor.name) !== key) {
+    if (!governor) {
       out[key] = raw
       continue
     }
-    const join = joins(governor)
-    const held = heldValue(root, governor.name, join)
     let next: unknown
     if ('def' in governor) {
-      const reconciled = reconcilePropertyValue(governor.def, held, frozen)
+      const reconciled = reconcilePropertyValue(governor.def, raw, frozen)
       if (!isBlankValue(reconciled)) next = encodeValue(reconciled)
     } else {
       const byTitle = world.contexts.spacesByTitle.get(governor.group.def.id)
-      const titles = contextTitles(held).flatMap((title) => byTitle?.get(title)?.title ?? [])
+      const titles = contextTitles(raw).flatMap((title) => byTitle?.get(title)?.title ?? [])
       if (titles.length) next = [...new Set(titles)]
     }
-    // A live reconcile never shrinks or blanks a value: one holding a member it can't resolve, or reading as nothing, stays as written, every spelling of it, for the user to settle.
-    if (!frozen && (next === undefined || memberCount(next) < memberCount(held))) {
+    // A live reconcile never shrinks or blanks a value: one holding a member it can't resolve, or reading as nothing, stays as written, for the user to settle.
+    if (!frozen && (next === undefined || memberCount(next) < memberCount(raw))) {
       out[key] = raw
       continue
     }
-    const { key: target, govern } = writeTarget(root, governor.name, join)
-    if (next === undefined) {
-      for (const k of govern) retired.add(k)
-      continue
-    }
-    const joined = govern.filter((k) => k !== target)
-    for (const k of joined) retired.add(k)
-    out[target] = writtenSpelling(next, held)
-    if (joined.length || JSON.stringify(out[target]) !== JSON.stringify(raw)) changed.push(target)
-  }
-  for (const k of retired) {
-    delete out[k]
-    changed.push(k)
+    if (next === undefined) {
+      changed.push(key)
+      continue
+    }
+    out[key] = writtenSpelling(next, raw)
+    if (JSON.stringify(out[key]) !== JSON.stringify(raw)) changed.push(key)
   }
   return { root: out, changed }
 }
```

```Core/Properties/governedWrite.ts diff
@@ imports @@
-import {
-  joinsSpellings,
-  reconcileGovernedRoot,
-  type GovernedWorld,
-} from '../Contexts/contextResolve'
+import { reconcileGovernedRoot, type GovernedWorld } from '../Contexts/contextResolve'
-import { heldValue, landValue, writeTarget } from '../Files/heldKeys'
+import { landValue } from '../Files/heldKeys'
@@ writtenRoot @@
-/** `raw` with `value` written where `writeTarget` places it, collapsing every spelling of `name`, its members spelled as the root already spells them, after the reconcile repairs every other governed key. */
+/** `raw` with `value` under `name`, its members spelled as the root already spells them, after the reconcile repairs every other governed key. */
 export function writtenRoot(raw: Json, name: string, value: unknown, world: GovernedWorld): Json {
-  const target = writeTarget(raw, name)
-  const reconciled = reconcileGovernedRoot(raw, world, undefined, target.govern).root
-  const written = writtenSpelling(value, heldValue(raw, name, joinsSpellings(name, world)))
-  return landValue(reconciled, target, written)
+  const reconciled = reconcileGovernedRoot(raw, world, undefined, name).root
+  return landValue(reconciled, name, writtenSpelling(value, raw[name]))
 }
@@ setGovernedRootKey @@
   const next = world
     ? writtenRoot(raw, name, value, world)
-    : landValue(raw, { key: name, govern: [] }, value)
+    : landValue(raw, name, value)
```

```Core/Properties/propertyValue.ts diff
@@ imports @@
 import {
   firstPerTitle,
-  holdsList,
   optionValues,
   PROPERTY_TYPES,
   type PropertyDefinition,
 } from './properties'
-import { heldValue, landValue, writeTarget } from '../Files/heldKeys'
+import { landValue } from '../Files/heldKeys'
@@ heldPropertyValue @@
-/** What `root` holds for `def`: a list property's every spelling joined, any other's the one key it reads. */
-export const heldPropertyValue = (
-  root: Record<string, unknown>,
-  def: Pick<PropertyDefinition, 'name' | 'type'>,
-): unknown => heldValue(root, def.name, holdsList(def))
-
@@ applyValueAtRoot @@
   landValue(
     root,
-    writeTarget(root, def.name),
+    def.name,
     value === null || isBlankValue(value) ? undefined : encodeValue(value),
   )
```

```Core/Properties/pageValue.ts diff
@@ imports @@
 import { editHeldList, memberKey } from '../Files/heldKeys'
-import { holdsList, type PropertyDefinition } from './properties'
+import type { PropertyDefinition } from './properties'
@@ valueEditRewrite @@
 export function valueEditRewrite(
-  def: Pick<PropertyDefinition, 'name' | 'type'>,
+  def: Pick<PropertyDefinition, 'name'>,
   target: string,
   edit: ValueEdit,
 ): Rewrite {
-  return (raw) =>
-    editHeldList(raw, def.name, holdsList(def), (held) => editList(held, target, edit))
+  return (raw) => editHeldList(raw, def.name, (held) => editList(held, target, edit))
 }
```

```Core/Files/pageFile.ts diff
@@ imports @@
-import { spellings } from '../Paths/caseFold'
@@ nodeSpelledAs doc @@
-/** `value` as a node spelled as the `held` spellings of its key are, the first the one it lands on: …
+/** `value` as a node spelled as the `held` nodes are, the first the one it lands on: …
@@ mergeInto @@
   if (mergeable(doc)) {
     const written = (key: string): boolean => modeled[key] !== undefined
-    const items = isMap(doc.contents) ? doc.contents.items : []
     const dropped = modeledKeys.filter((k) => !written(k) && doc.has(k))
-    // A key written beside a dropped spelling of itself takes that spelling's place.
-    for (const key of modeledKeys.filter((k) => written(k) && !doc.has(k))) {
-      const was = spellings(dropped, key)[0]
-      const pair = items.find((i) => String(i.key) === was)
-      if (pair) (pair.key as { value: string }).value = key
-    }
     const held = valuesOf(doc)
     for (const key of modeledKeys.filter(written)) {
       if (JSON.stringify(held[key]) === JSON.stringify(modeled[key])) continue
-      const spelled = [key, ...spellings(dropped, key)].map((k) => doc.get(k, true))
-      doc.set(key, nodeSpelledAs(doc, modeled[key], spelled))
+      doc.set(key, nodeSpelledAs(doc, modeled[key], [doc.get(key, true)]))
     }
```

```Core/Properties/assignment.ts diff
@@ imports @@
-import { byFoldedName, holdsList, type PropertyDefinition } from './properties'
+import { byKey, type PropertyDefinition } from './properties'
-  heldPropertyValue,
-import { landValue, writeTarget } from '../Files/heldKeys'
+import { landValue } from '../Files/heldKeys'
@@ assignedDefs @@
-    if (node) return byFoldedName(node.properties ?? [])
+    if (node) return byKey(node.properties ?? [])
   …
-  return byFoldedName(assigned.flatMap((id) => registry[id] ?? []))
+  return byKey(assigned.flatMap((id) => registry[id] ?? []))
@@ refillValues @@
-    if (!isBlankValue(reconcilePropertyValue(def, heldPropertyValue(raw, def), {}))) return null
+    if (!isBlankValue(reconcilePropertyValue(def, raw[def.name], {}))) return null
-    return landValue(
-      raw,
-      writeTarget(raw, def.name, holdsList(def)),
-      writtenSpelling(encoded, value),
-    )
+    return landValue(raw, def.name, writtenSpelling(encoded, value))
```

```Core/Trash/holdings.ts diff
@@ imports @@
-import { heldValue, landValue, writeTarget } from '../Files/heldKeys'
+import { landValue } from '../Files/heldKeys'
@@ refillTrashed @@
-/** A Link value whose page or Space sits in the Trash goes back into its trashed copy wherever that property reads blank, landing where `writeTarget` places it, so it returns with it; `names` maps each property's ID to its name. */
+/** A Link value whose page or Space sits in the Trash goes back into its trashed copy wherever that property reads blank, so it returns with it; `names` maps each property's ID to its name. */
   …
-      if (page === id && name && isBlankRaw(heldValue(next, name, false)))
-        next = landValue(next, writeTarget(next, name, false), value)
+      if (page === id && name && isBlankRaw(next[name])) next = landValue(next, name, value)
```

```Core/Trash/spend.ts diff
@@ imports @@
-import { heldValue, joinValues, landValue, writeTarget } from '../Files/heldKeys'
+import { joinValues, landValue } from '../Files/heldKeys'
@@ reapply @@
   const taken = await sweepRootsById(root, roots, additions, (raw, titles) =>
-    landValue(raw, writeTarget(raw, key), joinValues(heldValue(raw, key, true), titles)),
+    landValue(raw, key, joinValues(raw[key], titles)),
   )
```

```Core/Contexts/contextWrite.ts diff
@@ imports @@
-import { heldValue } from '../Files/heldKeys'
@@ setSpaceContext @@
-    // Decided on what the far file holds, inside its own read-modify-write, never on the tree's copy of it. The far list is edited rather than replaced, so every spelling's members stay.
+    // Decided on what the far file holds, inside its own read-modify-write, never on the tree's copy of it. The far list is edited rather than replaced, so its other members stay.
     const half = await writeSpaceSidecar(join(root, far.path), (raw) => {
-      const held = listOf(heldValue(raw, backKey, true) ?? [])
+      const held = listOf(raw[backKey] ?? [])
```

```Core/Contexts/contextCascade.ts diff
@@ retitleSpace @@
 const retitleSpace = (raw: Json, contextTitle: string, j: RenameJournal): Json | null =>
-  editHeldList(raw, contextKey(contextTitle), true, (held) =>
+  editHeldList(raw, contextKey(contextTitle), (held) =>
     editList(held, j.oldTitle, { op: 'replace', to: j.newTitle }),
   )
@@ unlinkSpaceValue @@
-    const next = editHeldList(raw, key, true, (held) => {
+    const next = editHeldList(raw, key, (held) => {
```

```Core/Properties/schema.ts diff
@@ imports @@
 import {
-  byFoldedName,
+  byKey,
   firstPerTitle,
   …
-import { foldKey, normalizeTitle } from '../Paths/caseFold'
+import { normalizeTitle } from '../Paths/caseFold'
@@ linkKeysOf @@
-/** Which frontmatter keys hold links …; never File, whose references name assets. One folded lookup, built once per reader. */
+/** Which frontmatter keys hold links …; never File, whose references name assets. One lookup, built once per reader. */
 export const linkKeysOf = (defs: readonly PropertyDefinition[]): ((key: string) => boolean) => {
-  const names = byFoldedName(defs)
+  const names = byKey(defs)
   return (key) => {
-    const type = names.get(foldKey(key))?.type
+    const type = names.get(key)?.type
```

```Core/Nexus/cascade.ts diff
@@ imports @@
-import { foldKey, normalizeTitle } from '../Paths/caseFold'
+import { normalizeTitle } from '../Paths/caseFold'
-import { byFoldedName } from '../Properties/properties'
+import { byKey } from '../Properties/properties'
@@ deleteCascade @@
-    const defs = byFoldedName(linkDefsOf(tree?.config.registry ?? []))
+    const defs = byKey(linkDefsOf(tree?.config.registry ?? []))
   …
-        const def = defs.get(foldKey(key))
+        const def = defs.get(key)
```

```Core/Trash/restoreScrub.ts diff
@@ imports @@
-import { foldKey } from '../Paths/caseFold'
-import { byFoldedName } from '../Properties/properties'
+import { byKey } from '../Properties/properties'
-import { heldKeys, stripKeys } from '../Files/heldKeys'
+import { stripKeys } from '../Files/heldKeys'
@@ sidecars @@
-      const skip = inTransitKey === undefined ? [] : heldKeys(raw, inTransitKey)
-      const r = reconcileGovernedRoot(raw, spaceWorld, {}, skip)
+      const r = reconcileGovernedRoot(raw, spaceWorld, {}, inTransitKey)
@@ scrubReturning @@
-  const links = byFoldedName(tree.config.registry.filter((d) => d.type === 'link'))
+  const links = byKey(tree.config.registry.filter((d) => d.type === 'link'))
   …
-        const entry = links.has(foldKey(k)) ? gonePageEntry(v, frozen) : null
+        const entry = links.has(k) ? gonePageEntry(v, frozen) : null
   …
-      const def = links.get(foldKey(key))
+      const def = links.get(key)
```

```Core/Properties/keyHolders.ts diff
@@ imports @@
-import { heldKey } from '../Files/heldKeys'
-import { heldPropertyValue, isBlankRaw } from './propertyValue'
+import { isBlankRaw } from './propertyValue'
@@ keyedHolders @@
-  def: Pick<PropertyDefinition, 'name' | 'type'>,
+  def: Pick<PropertyDefinition, 'name'>,
-    if (heldKey(fields, def.name) === undefined) continue
+    if (!Object.hasOwn(fields, def.name)) continue
   …
-    const held = heldPropertyValue(fields, def)
+    const held = fields[def.name]
```

```Core/Properties/optionOps.ts diff
@@ imports @@
-import { heldPropertyValue, unregisteredMembers } from './propertyValue'
+import { unregisteredMembers } from './propertyValue'
@@ registerHeldOptions @@
-          const members = unregisteredMembers(def, heldPropertyValue(values, def))
+          const members = unregisteredMembers(def, values[def.name])
```

```Core/Properties/value.ts diff
@@ imports @@
-import { decodeValue, heldPropertyValue, NULL_VALUE, type PropertyValue } from './propertyValue'
+import { decodeValue, NULL_VALUE, type PropertyValue } from './propertyValue'
@@ resolveFieldValue @@
-    v = decodeValue(def, heldPropertyValue(row.frontmatter as Record<string, unknown>, def))
+    v = decodeValue(def, (row.frontmatter as Record<string, unknown>)[def.name])
```

```Core/Properties/deleteProperty.ts diff
@@ imports @@
-import { sweepGovernedRoots } from './governedSweep'
-import { heldKey, stripHeld } from '../Files/heldKeys'
+import { type Rewrite, sweepGovernedRoots } from './governedSweep'
+import { stripKeys } from '../Files/heldKeys'
-import { heldPropertyValue } from './propertyValue'
@@ snapshot @@
-    if (heldKey(raw, key) === undefined) continue
+    if (!Object.hasOwn(raw, key)) continue
   …
-    else values[id] = heldPropertyValue(raw, def)
+    else values[id] = raw[key]
@@ stripAndRemove @@
-  const raw = stripHeld(key)
+  const raw: Rewrite = (r) => stripKeys(r, [key])
```

```Core/Properties/removeProperty.ts diff
@@ imports @@
-import { stripHeld } from '../Files/heldKeys'
+import { stripKeys } from '../Files/heldKeys'
@@ removeInner @@
-  const { skipped } = await sweepGovernedRoots(root, strip, { raw: stripHeld(key) })
+  const { skipped } = await sweepGovernedRoots(root, strip, { raw: (r) => stripKeys(r, [key]) })
```

```Core/Properties/replaySchemaCascade.ts diff
@@ imports @@
-import { normalizeTitle } from '../Paths/caseFold'
@@ named @@
-const named =
-  (name: string) =>
-  (d: { name: string }): boolean =>
-    normalizeTitle(d.name) === normalizeTitle(name)
-
@@ delete @@
-      const crashed = !answered && def !== undefined && named(journal.name)(def)
-      const freed = !def && !Object.values(defs).some(named(journal.name))
+      const crashed = !answered && def !== undefined && def.name === journal.name
+      const freed = !def && !Object.values(defs).some((d) => d.name === journal.name)
```

```Core/Properties/registryProperty.ts diff
@@ imports @@
-import { normalizeTitle } from '../Paths/caseFold'
@@ createProperty @@
     if (
       journal?.op === 'delete' &&
-      (normalizeTitle(journal.name) === normalizeTitle(landed) || journal.id === created.value.id)
+      (journal.name === landed || journal.id === created.value.id)
     )
```

**VERIFY**

- [ ] The listed tests pass.
- [ ] `git grep -nE "heldValue|writeTarget|WriteTarget|stripHeld|holdsList|joinsSpellings|byFoldedName" -- Core Desktop` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2B-2

**TASK:** Remove `heldKeys` and `heldKey`, so every remaining holder check and gate reads the exact key; fold `spellings` into `heldName`, its last reader; and compare names exactly where a registry change owes adoption.

**NOW:** `heldKey` answers a folded key (`heldKeys.ts:10-12`), read by the panel's `held` (`Core/Properties/PropertyPanel.tsx:213-216`), the Matrix's `answers` (`Core/Matrix/matrixInput.ts:97-98`), the delete cascade's Link capture (`cascade.ts:125`, a dedupe among spellings), `setSpaceProperty`'s clear check (`Core/Properties/setProperty.ts:26`), and `rekeyOverrides` (`Core/Views/Host/useContainerValues.ts:16-27`). `heldKeys` is read by `unlinkContextKey` (`contextCascade.ts:139-145`) and the restore scrub's in-transit skip (`restoreScrub.ts:74`). `spellings` (`Core/Paths/caseFold.ts:16-21`) is read by `heldKeys` and `heldName` (`Core/Files/atomicWrite.ts:320-323`). `oweNamedKeys` owes adoption on a folded name change (`Core/Nexus/fileEvents.ts:522-534`), so a case-only rename of a Multi-Select owes none.

**CHANGE**

- [ ] Write and watch fail: `heldKeys.test.ts:14-20` goes and its import drops `heldKey`. `caseFold.test.ts:85-91` goes with `spellings`' import, and a new `atomicWrite.test.ts` case pins `heldName`: in a folder holding `TAGS.md`, `heldName(join(dir, 'Tags.md'))` and `heldName(join(dir, 'TAGS.md'))` answer `'TAGS.md'`, and a missing name answers null. `PropertyPanel.test.tsx:137` inverts (a page holding `stage` shows no Stage row). `matrixInput.test.ts:172` inverts (the Space holding another spelling abstains: `['a1', 'b1']`). `useViewHost.test.tsx:525` inverts (an override holding `status` stays `{ id: 'p2', status: ['Done'] }` through a rename of `Status`). `contextCascade.test.ts:229` inverts (unlinking `Projects` captures `{ kind: 'page', values: ['Sapphire'] }` and leaves `other()` holding `<projects>: ['Pommora']`). `settle.test.ts`: a new case beside `:1047`: an outside `properties.json` edit re-casing `tags` to `TAGS`, with no file changed, calls `registerHeldOptions`.
- [ ] `heldKeys.ts`: delete `heldKeys`, `heldKey`, and the `spellings` import.
- [ ] `caseFold.ts`: delete `spellings`; `atomicWrite.ts`: `heldName` answers the exact name when the folder holds it, else the first name that folds to it, the `spellings` import going (`spellings` had no other reader, so it folds into its one caller rather than moving).
- [ ] Sibling sweep, each reading `Object.hasOwn(root, key)` or the key itself: `PropertyPanel.tsx:215` and its import; `matrixInput.ts:98` and its import; `cascade.ts:125` pushes every named entry (one key names one definition) and its `heldKey` import goes; `setProperty.ts:26` and its import; `useContainerValues.ts:16-27` (`rekeyOverrides` moves each override's key through `rekeyHeld` under `'prefer-new'`, the host rename's rule); `contextCascade.ts:139-145` (`unlinkContextKey`'s strip reads and captures `raw[key]` alone).
- [ ] `fileEvents.ts:530`: `p.name !== d.name`; the `foldKey` import goes (its one reader).

**AFTER**

```Core/Files/heldKeys.ts diff
@@ imports @@
-import { spellings, normalizeTitle } from '../Paths/caseFold'
+import { normalizeTitle } from '../Paths/caseFold'
@@ heldKeys @@
-export const heldKeys = (root: object, name: string): string[] => spellings(Object.keys(root), name)
-
-/** The key `root` reads `name` under; an exact spelling answers before anything folds. */
-export const heldKey = (root: object, name: string): string | undefined =>
-  Object.hasOwn(root, name) ? name : heldKeys(root, name)[0]
-
```

```Core/Paths/caseFold.ts diff
@@ spellings @@
-/** Every spelling `names` holds of `name`: its exact spelling first, then each other that folds to it, in order. */
-export function spellings(names: readonly string[], name: string): string[] {
-  const fold = foldKey(name)
-  const others = names.filter((n) => n !== name && foldKey(n) === fold)
-  return names.includes(name) ? [name, ...others] : others
-}
-
```

```Core/Files/atomicWrite.ts diff
@@ imports @@
-import { foldKey, spellings } from '../Paths/caseFold'
+import { foldKey } from '../Paths/caseFold'
@@ heldName @@
 export async function heldName(abs: string): Promise<string | null> {
   const names = (await machine().readDir(dirname(abs))).map((e) => e.name)
-  return spellings(names, basename(abs))[0] ?? null
+  const name = basename(abs)
+  const fold = foldKey(name)
+  return names.includes(name) ? name : (names.find((n) => foldKey(n) === fold) ?? null)
 }
```

```Core/Properties/PropertyPanel.tsx diff
@@ imports @@
-import { heldKey } from '../Files/heldKeys'
@@ held @@
   const held = (f: Field): boolean =>
     f.def
-      ? fm !== null && heldKey(fm, f.def.name) !== undefined
+      ? fm !== null && Object.hasOwn(fm, f.def.name)
       : (contextValues?.[f.id]?.length ?? 0) > 0
```

```Core/Matrix/matrixInput.ts diff
@@ imports @@
-import { heldKey } from '../Files/heldKeys'
@@ answers @@
       const name = schema.find((d) => d.id === rule.property_id)?.name
-      return name !== undefined && heldKey(row.frontmatter, name) !== undefined
+      return name !== undefined && Object.hasOwn(row.frontmatter, name)
```

```Core/Nexus/cascade.ts diff
@@ imports @@
-import { heldKey, stripKeys } from '../Files/heldKeys'
+import { stripKeys } from '../Files/heldKeys'
@@ deleteCascade @@
-      for (const { key, def, value } of named(raw))
-        if (key === heldKey(raw, def.name)) links.push({ page: id, property: def.id, value })
+      for (const { def, value } of named(raw)) links.push({ page: id, property: def.id, value })
```

```Core/Properties/setProperty.ts diff
@@ imports @@
-import { heldKey } from '../Files/heldKeys'
@@ setSpaceProperty @@
   return writeSpaceSidecar(absSpaceDir, (raw) =>
-    clear && heldKey(raw, def.name) === undefined
-      ? null
-      : writtenRoot(raw, def.name, encoded, world),
+    clear && !Object.hasOwn(raw, def.name) ? null : writtenRoot(raw, def.name, encoded, world),
   )
```

```Core/Views/Host/useContainerValues.ts diff
@@ imports @@
-import { heldKey } from '../../Files/heldKeys'
@@ imports @@
+import { rekeyHeld } from '../../Files/heldKeys'
+import type { Json } from '../../Files/stableJson'
@@ rekeyOverrides @@
-      const root = entry.fm as unknown as Record<string, unknown>
-      const held = heldKey(root, oldKey)
-      if (held === undefined) return [id, entry]
-      const { [held]: moved, ...rest } = root
-      return [id, { ...entry, fm: { ...rest, [newKey]: moved } as PageFrontmatter }]
+      const fm = rekeyHeld(entry.fm as unknown as Json, oldKey, newKey, 'prefer-new')
+      return [id, fm ? { ...entry, fm: fm as PageFrontmatter } : entry]
```

```Core/Contexts/contextCascade.ts diff
@@ imports @@
-import { editHeldList, heldKeys, rekeyHeld, stripKeys, type KeyCollision } from '../Files/heldKeys'
+import { editHeldList, rekeyHeld, stripKeys, type KeyCollision } from '../Files/heldKeys'
@@ unlinkContextKey @@
   const strip: Rewrite = (raw, file) => {
-    const keys = heldKeys(raw, key)
-    if (!keys.length) return null
-    const values = keys.flatMap((k) => scalarMembers(raw[k]))
-    captured.push(captureRoot(raw, file, values))
-    return stripKeys(raw, keys)
+    if (!Object.hasOwn(raw, key)) return null
+    captured.push(captureRoot(raw, file, scalarMembers(raw[key])))
+    return stripKeys(raw, [key])
   }
```

```Core/Nexus/fileEvents.ts diff
@@ imports @@
-import { foldKey } from '../Paths/caseFold'
@@ oweNamedKeys @@
         return (
           d.type === 'multiSelect' &&
-          (p?.type !== 'multiSelect' || foldKey(p.name) !== foldKey(d.name))
+          (p?.type !== 'multiSelect' || p.name !== d.name)
         )
```

**VERIFY**

- [ ] The listed tests pass.
- [ ] `git grep -nP "\b(heldKeys?|spellings)\(" -- Core Desktop` finds nothing.
- [ ] Run the gates, then `view-delta` for Phase 2B.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, reading outward: no read or write still resolves a property or `<Title>:` key through a fold (`git grep foldKey -- Core` lists only uniqueness, reserved keys, paths, search, the Sync base, option words, and Space titles); both hosts' writes land the same key through `writtenRoot` and `applyValueAtRoot`; the reconcile repairs each governed key on its own and never shrinks a live value; `heldKeys.ts` holds only `landValue`, `memberKey`, `joinValues`, `editHeldList`, `stripKeys`, `KeyCollision`, and `rekeyHeld`; the Trash refill, re-tag, and restore scrub write and skip the exact key; a case-only Multi-Select rename owes adoption; no caller reads a property's value through a helper rather than its key.
- [ ] The orchestrator tells Nathan in chat: from this phase until NexusOS's Key Format cutover (I-1), NexusOS's `tags`, `description`, and `version` keys read as foreign to `Tags`, `Description`, and `Version`, so an edit of those three in Pommora lands a second key the cutover then refuses (`KEY_REFUSAL.held`), and a rename or delete of `Description` or `Version`, or a rename or removal of a `Tags` option, leaves the lowercase keys and words as they were; edit them in Obsidian and hold those changes until the cutover.

### Phase 3 — Exact Words and the Index

**GOAL:** Option words, the Space titles under `<Title>:` keys, and the option names configuration holds match exactly, with stray spaces, numerals, and Unicode composition still tolerated (A-3). A Multi-Select keeps the words it doesn't recognize on disk through an in-app edit and out of its decoded value (E-3), adoption reads those raw words, and a Select's or Status's Is and Is Not filters compare exactly (F-2). The content index drops its folded column and keys holders and Space relations exactly, moving to generation 19 (F-3). It's a separate phase because it changes what a value decodes to, which every display, filter, and adoption trigger reads, and it closes the read side Phase 2B left folded.

#### Task 3-1

**TASK:** Add `exactTitle`, the trimmed NFC text a member matches by, and route member identity and Space titles through it: `memberKey`, `namesValue`'s operand, `contextTitles`, `contextWorldOf`'s `spacesByTitle`, `sweepMembers`' title, and the deleted Context's record of its Spaces.

**NOW:** `caseFold.ts` holds one scalar normalizer, `normalizeTitle`, which stringifies, trims, lowercases, and NFC-normalizes (`Core/Paths/caseFold.ts:11-14`); `foldKey`'s doc (`:6`) names frontmatter keys and a stored membership key among what it matches. `memberKey` matches a scalar member through it (`Core/Files/heldKeys.ts:50-51`), so `joinValues` (`:53-58`), `namesValue`, `editList`, and `stripList` (`Core/Properties/pageValue.ts:11-34`, `namesValue` folding its own operand through `normalizeTitle` at `:12`), the reconcile's `memberCount` (`Core/Contexts/contextResolve.ts:108`), `writtenSpelling`'s list arm (`Core/Properties/propertyValue.ts:184-189`), `setSpaceContext`'s far match (`Core/Contexts/contextWrite.ts:99-110`), and every configuration arm in `Core/Nexus/configReach.ts` that edits through `editList` or `stripList` (`:142-159,220,313`) fold. `contextTitles` folds each member (`Core/Contexts/contexts.ts:37-39`); `contextWorldOf` keys each Context's Spaces by `normalizeTitle` (`contextResolve.ts:34-36`); `sweepMembers` folds the Space title it queries the index with (`Core/Contexts/contextCascade.ts:70`), and the index's `space` rows hold `contextTitles`' answer (`Core/Index/indexSeed.ts:63-71`), so query and rows agree through the change. A Context delete records its members' Space ids by folding each captured title against the folder names (`Core/Trash/gather.ts:81,94`), so a restore re-tags a member in another casing as the Space.

**CHANGE**

- [ ] Write and watch fail: `heldKeys.test.ts:22-29` inverts, its title saying "exact title" for "folded title": `joinValues(['b'], ['a', 'B'])` is `['b', 'a', 'B']`, the other three lines unchanged. `pageValue.test.ts`: `:92` and `:99` go (`:88` already pins the exact dedupe); `:103` inverts, retitled *leaves an option written in another casing alone* (`editList(['done', 'Active'], 'Done', finished)` and `editList(['done', 'finished'], 'Done', finished)` are null); `:115` inverts, retitled *names a value by its exact trimmed title* (`'Done'` and `' Done '` match, `'done'`, `'DONE'`, and `'Open'` don't). `propertyValue.test.ts`: `:407` keeps `:408-409` and its `:410` becomes `writtenSpelling(['Done', 'Active'], 'done')` is `['Done', 'Active']`, retitled "names exactly" for "folds to"; `:413`'s `:415` becomes `writtenSpelling(['[[A.png]]'], [['a.png']])` is `['[[A.png]]']`. `governedWrite.test.ts:191` goes (a held member's spelling in another casing no longer names the written one). `contextResolve.test.ts`: `:47` seeds `'<Projects>': [' Pommora ']` and still resolves `['sp1']`, and adds `resolveContextKeys({ '<Projects>': ['pommora'] }, contexts).has('ctx_projects')` false, its title dropping "case"; `:106` expects `root['<Projects>']` `['CS 161']` with `changed` `['<Projects>']`; `:147` becomes `{ '<Projects>': ['Pommora', 'Pommora'] }` written `['Pommora']`, retitled *writes a Space named twice once*; `:157` seeds `'<Projects>': 'Pommora'` and expects root `['Pommora']`, `changed` `['<Projects>']`, and the link `['sp1']`. `contextWrite.test.ts:150` expects `['Pommora', 'Other']`, retitled *writes each Space under its own title*. `contextCascade.test.ts`: the shared seed (`:76`) becomes `<Projects>:\n  - Pommora`, and every assertion of `['Pommora', 'pommora']` or `values: ['Pommora', 'pommora']` (`:257,287,306,309,353,619,667,692,778,792,805,831,890`) becomes `['Pommora']`; a new case beside `:94`: with `page()` holding `[Pommora, pommora]`, renaming the Space to `Pom` writes `['Pom', 'pommora']`, the member in another casing left as written. `restoreScrub.test.ts:196` inverts, retitled *prunes a member naming no Space exactly* (`<Projects>` is undefined after the restore); `:234`'s `prunedTag` fixture (`:227`) holds `- Pommora` and expects `['Pommora']`. `spend.test.ts:959` goes (a member in another casing names no Space, so the round trip has nothing to write back). `indexSeed.test.ts:134`'s `:142` queries `('<Projects>', 'Sapphire')`, retitled "one row per exact value". `indexMaintenance.test.ts:154` queries `('<Projects>', 'Pommora')` at `:166` and `:174` and `('<Projects>', 'Pom')` at `:175`. `contextCascade.test.ts:500` passes unchanged: the Space retry guard at `contextCascade.ts:273` is a title clash and stays folded (D-3). `spend.test.ts`, a new case under *§restore — the record spends, headless*: with `Alpha.md` holding `<Projects>: [pommora]` beside the Space `Pommora`, a delete of the Context `Projects` and its restore leave `Alpha.md` holding no `<Projects>` (the word names no Space exactly, A-2).
- [ ] `caseFold.ts`: add `exactTitle(raw)`, `String(raw).trim().normalize('NFC')`, beside `normalizeTitle`, which stays for uniqueness, reserved keys, search, sort, and paths; `foldKey`'s doc names what still folds, and `normalizeTitle`'s leaves member matching to `exactTitle`.
- [ ] `properties.ts`: delete `normalizePropertyName` (`:272-274`), which trims and NFC-normalizes as `exactTitle` does; its two callers (`registryProperty.ts:54,116`) call `exactTitle`, and the import follows.
- [ ] `heldKeys.ts`: `memberKey` matches by `exactTitle`; its doc and `joinValues`' say "its trimmed text" for "its folded title". Every reader above turns exact with it.
- [ ] `pageValue.ts`: `namesValue` builds its operand through `memberKey`, so an operand and a member match by one rule; the `normalizeTitle` import goes (its one reader).
- [ ] `contexts.ts`: `contextTitles` maps `exactTitle`; its doc drops "folded".
- [ ] `contextResolve.ts`: `spacesByTitle` keys by `exactTitle(s.title)`; the `normalizeTitle` import goes.
- [ ] `contextCascade.ts:70`: `sweepMembers` queries with `exactTitle(member.spaceTitle)`.
- [ ] `gather.ts:81,94`: `gatherContextEvidence` keys the Space ids by `exactTitle(name)` and `buildContextRecord` looks each captured title up by `exactTitle(title)`; the import follows.
- [ ] `propertyValue.ts`: `writtenSpelling`'s doc says "whose title is its own" for "whose title folds to its own".

**AFTER**

```Core/Paths/caseFold.ts diff
@@ foldKey @@
-/** The locale-independent comparison key a path segment, title, or frontmatter key matches by. Lowercase precedes NFC so a title's stored membership key is byte-identical to what the index already holds. */
+/** The locale-independent comparison key a path segment or a title matches by wherever case doesn't separate two things: uniqueness, the reserved-key refusal, search, sort, and file names. Lowercase precedes NFC so a stored fold, such as `sync_base`'s path key, stays byte-identical. */
@@ normalizeTitle doc @@
-/** `foldKey` of any scalar's trimmed text: a YAML scalar `- 2024` off disk still matches "2024", and NFC lets an NFD-composed outside write match the NFC title it names. */
+/** `foldKey` of any scalar's trimmed text. */
@@ normalizeTitle @@
 export function normalizeTitle(raw: unknown): string {
   return foldKey(String(raw).trim())
 }
+
+/** A scalar's trimmed NFC text: what a member, an option word, or a Space title matches by. */
+export function exactTitle(raw: unknown): string {
+  return String(raw).trim().normalize('NFC')
+}
```

```Core/Properties/properties.ts diff
@@ normalizePropertyName @@
-export function normalizePropertyName(raw: string): string {
-  return raw.trim().normalize('NFC')
-}
```

```Core/Properties/registryProperty.ts diff
@@ imports @@
-  normalizePropertyName,
+import { exactTitle } from '../Paths/caseFold'
@@ createProperty @@
-      normalizePropertyName(def.name ?? ''),
+      exactTitle(def.name ?? ''),
@@ renameProperty @@
-  const to = normalizePropertyName(name)
+  const to = exactTitle(name)
```

```Core/Files/heldKeys.ts diff
@@ imports @@
-import { normalizeTitle } from '../Paths/caseFold'
+import { exactTitle } from '../Paths/caseFold'
@@ memberKey @@
-/** What a member matches by: a scalar's folded title, or the member itself. */
-export const memberKey = (v: unknown): unknown => (isScalar(v) ? normalizeTitle(v) : v)
+/** What a member matches by: a scalar's trimmed text, or the member itself. */
+export const memberKey = (v: unknown): unknown => (isScalar(v) ? exactTitle(v) : v)
```

```Core/Properties/pageValue.ts diff
@@ imports @@
-import { normalizeTitle } from '../Paths/caseFold'
@@ namesValue @@
 export const namesValue = (value: string): Matcher => {
-  const want = normalizeTitle(value)
+  const want = memberKey(value)
   return (el) => memberKey(el) === want
 }
```

```Core/Trash/gather.ts diff
@@ imports @@
-import { normalizeTitle } from '../Paths/caseFold'
+import { exactTitle } from '../Paths/caseFold'
@@ gatherContextEvidence @@
-  const spaceIds = new Map([...ids].map(([name, id]) => [normalizeTitle(name), id]))
+  const spaceIds = new Map([...ids].map(([name, id]) => [exactTitle(name), id]))
@@ buildContextRecord @@
-          const id = evidence.spaceIds.get(normalizeTitle(title))
+          const id = evidence.spaceIds.get(exactTitle(title))
```

```Core/Contexts/contexts.ts diff
@@ imports @@
-import { normalizeTitle } from '../Paths/caseFold'
+import { exactTitle } from '../Paths/caseFold'
@@ contextTitles @@
-/** The folded titles a Context value names: each scalar member's, a lone scalar read as a list of one. A member of any other shape names nothing. */
+/** The titles a Context value names: each scalar member's, a lone scalar read as a list of one. A member of any other shape names nothing. */
 export const contextTitles = (raw: unknown): string[] =>
-  scalarMembers(raw).map(normalizeTitle).filter(Boolean)
+  scalarMembers(raw).map(exactTitle).filter(Boolean)
```

```Core/Contexts/contextResolve.ts diff
@@ imports @@
-import { normalizeTitle } from '../Paths/caseFold'
+import { exactTitle } from '../Paths/caseFold'
@@ contextWorldOf @@
     spacesByTitle: new Map(
-      groups.map((g) => [g.def.id, new Map(g.spaces.map((s) => [normalizeTitle(s.title), s]))]),
+      groups.map((g) => [g.def.id, new Map(g.spaces.map((s) => [exactTitle(s.title), s]))]),
     ),
```

```Core/Contexts/contextCascade.ts diff
@@ imports @@
-import { normalizeTitle } from '../Paths/caseFold'
+import { exactTitle, normalizeTitle } from '../Paths/caseFold'
@@ sweepMembers @@
-  const title = member.spaceTitle === undefined ? undefined : normalizeTitle(member.spaceTitle)
+  const title = member.spaceTitle === undefined ? undefined : exactTitle(member.spaceTitle)
```

```Core/Properties/propertyValue.ts diff
@@ writtenSpelling doc @@
-/** … and each member takes the one member of `raw` whose title folds to its own — a scalar of any shape, or an unquoted wikilink. …
+/** … and each member takes the one member of `raw` whose title is its own — a scalar of any shape, or an unquoted wikilink. …
```

**VERIFY**

- [ ] The listed tests pass; `contextCascade.test.ts`'s index-scoped cases (*§the cascades open only the members the index names*, `:84-129`) still open exactly the holders the index names, the query and the `space` rows agreeing on exact titles.
- [ ] `git grep -n "normalizeTitle" -- Core/Contexts/contextResolve.ts Core/Contexts/contexts.ts Core/Files/heldKeys.ts Core/Properties/pageValue.ts Core/Trash/gather.ts` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-2

**TASK:** Decode option words exactly, drop a Multi-Select's unrecognized words from its decoded value, let adoption read the raw words, and keep those words on disk through an in-app write.

**NOW:** `optionsByFold` caches each definition's options by fold, first wins (`propertyValue.ts:46-56`), and `registeredOption` reads it (`:58-60`), so a Select holding `red` reads option `Red`; `optionList` drops a blank word through `normalizeTitle` (`:42-44`). `applyValueAtRoot`'s doc (`:246`) says a read decodes members by fold, and the comment above the File decode (`:113`) warns against merging it with the Multi-Select one. A Multi-Select dedupes by fold, maps a registered member to its option, and keeps an unregistered one verbatim (`:108-112`), and `unregisteredMembers` reads those verbatim members back out of the decode, behind a type check (`:128-134`) its one caller already makes (`Core/Properties/optionOps.ts:113-115`). The frozen reconcile filters a Multi-Select down to registered options (`:161-163`). `writtenRoot` (`Core/Properties/governedWrite.ts:16-19`, as Phase 2B left it) and `applyValueAtRoot` (`propertyValue.ts:247-256`) land the encoded value alone, so the unregistered words survive a pick only because the decode carried them into the picked value.

**CHANGE**

- [ ] Write and watch fail: `propertyValue.test.ts`: the fixtures at `:102` (options `a`, `b`), `:117` (`'true'`, `'x'`), `:124` (`'zeta'`), and `:282` (`a`, `b`) register the words they decode; `:193` inverts, retitled *a multi-select drops a value the schema does not offer* (`['A', 'Gone']` reads `['A']`, `['Gone']` reads `{ kind: 'null' }`); `:446` reads `'done'` as `{ kind: 'null' }`; `:450` reads `['claude', 'Docs', 'new']` as `['Docs']`; `:458` becomes `['Docs', 'new', 'Docs']` read as `['Docs']`, retitled *a member held twice reads once*; `:473` stays `['Ideas']` and `:474` goes (the type check leaves); new cases: under options `red` and `blue`, `unregisteredMembers` over `['green', 'Red', 'PURPLE']` is `['green', 'PURPLE']` (`Red` duplicates `red`); `keepingForeignWords` over options `Work` and `Docs` appends a held `work` and `Ideas` after a written `['Work']`, giving `['Work', 'work', 'Ideas']`, answers `[]` and a Select's value as given, and keeps a written `['Ideas']` over a held `Ideas` as `['Ideas']`; `applyValueAtRoot` over `{ Tags: ['Docs', 'Ideas'] }` picking `['Docs', 'Work']` lands `['Docs', 'Work', 'Ideas']`, and a blank value drops the key. The `:437` describe is retitled *options decode exactly; checkboxes without regard to case*, and its checkbox cases (`:423`, `:465`) stay. `governedWrite.test.ts`: the describe's `tags` registers option `a` so `:241` stays byte-identical; a new case: a page holding `Tags: [Docs, Ideas]` written `['Docs', 'Work']` reads `Tags: [Docs, Work, Ideas]`, and written blank loses the key. `contextResolve.test.ts:242`'s `:245` decodes `root.Stage` as `{ kind: 'null' }`; `:250` goes (the live reconcile keeps `['done', 'Done', 'x']` as written). `assignment.test.ts:133` inverts, retitled *a cached member naming no option exactly doesn't come back* (`Tags` is undefined after the reassign). `Cells/Cell.test.tsx:50` registers `a`, `b`, and `c` on `prop_tags` (`:204` reorders chips that now decode). `Views/Pipeline/filter.test.ts:36` registers `x`, `y`, `z`, `a`, `b`, and `c` on `prop_tags` (`:323`, `:734`, and `:764` filter decoded members). `settle.test.ts:906` passes unchanged: `unregisteredMembers` dedupes by fold, so two pages holding `Claude` and `claude` register one option.
- [ ] `propertyValue.ts`: `optionsByFold` becomes `wordsOf`, held in `optionWords` per definition: `labelOf`, an exact map from each option's `exactTitle` to the option, and `folds`, each option's fold; `registeredOption` reads it by `exactTitle(written)`; `optionList` drops a blank word through `exactTitle`; the File decode's comment goes, since the Multi-Select decode now reads options and the File decode links, and nothing invites merging them; the Multi-Select decode keeps each registered option once, in the file's order, and drops every other word; delete the frozen reconcile's Multi-Select filter (`:161-163`), which the decode now makes a no-op; `unregisteredMembers` reads `optionList(raw)`, once per fold with the first spelling kept, minus every word whose fold is in `wordsOf`' `folds`, its type check gone; add `keepingForeignWords(def, written, held)`, which joins to a non-empty Multi-Select list, through `joinValues`, the words `held` holds that `registeredOption` doesn't name, after the written ones, and answers anything else as given; the join is the one the `merge` rename and the Trash re-tag already use, so a word the list already holds isn't carried twice; `applyValueAtRoot` lands through it, and its doc says what it lands.
- [ ] `governedWrite.ts`: `writtenRoot` passes the value through `keepingForeignWords` when `world.defs` holds a definition under `name` (a `<Title>:` key holds none) before `writtenSpelling` re-spells it against the held value.
- [ ] `Core/Properties/Pickers/PropertyPicker.tsx` keeps its code: `selectedValues` (`:60-65`) and `toggleValue` (`:86-87`) read whatever the decoded value holds, so a toggle now carries registered options alone, and the host's append keeps the rest on disk; `MassPropertyPicker.tsx:29` reads through the same `selectedValues`. Nothing there exists only for unregistered members, so nothing leaves.

**AFTER**

```Core/Properties/propertyValue.ts diff
@@ imports @@
-import { normalizeTitle } from '../Paths/caseFold'
+import { exactTitle, normalizeTitle } from '../Paths/caseFold'
-import { landValue } from '../Files/heldKeys'
+import { joinValues, landValue } from '../Files/heldKeys'
@@ optionList @@
 const optionList = (raw: unknown): string[] =>
-  scalarMembers(raw).filter((x) => normalizeTitle(x) !== '')
+  scalarMembers(raw).filter((x) => exactTitle(x) !== '')
@@ optionsByFold @@
-const foldedOptions = new WeakMap<PropertyDefinition, Map<string, string>>()
+type OptionWords = { labelOf: Map<string, string>; folds: ReadonlySet<string> }
+
+const optionWords = new WeakMap<PropertyDefinition, OptionWords>()
 
 // Held against the definition it was built from, which an edit replaces rather than mutates.
-function optionsByFold(def: PropertyDefinition): Map<string, string> {
-  let byFold = foldedOptions.get(def)
-  if (!byFold) {
-    byFold = firstPerTitle(optionValues(def))
-    foldedOptions.set(def, byFold)
+function wordsOf(def: PropertyDefinition): OptionWords {
+  let words = optionWords.get(def)
+  if (!words) {
+    const values = optionValues(def)
+    words = {
+      labelOf: new Map(values.map((v) => [exactTitle(v), v])),
+      folds: new Set(values.map(normalizeTitle)),
+    }
+    optionWords.set(def, words)
   }
-  return byFold
+  return words
 }
 
 /** The option `written` names, as its definition spells it. */
 const registeredOption = (def: PropertyDefinition, written: string): string | undefined =>
-  optionsByFold(def).get(normalizeTitle(written))
+  wordsOf(def).labelOf.get(exactTitle(written))
@@ decodeValue multiSelect @@
     case 'multiSelect': {
-      const byFold = optionsByFold(def)
-      const value = Array.from(firstPerTitle(optionList(raw)), ([fold, x]) => byFold.get(fold) ?? x)
+      const value = [...new Set(optionList(raw).flatMap((x) => registeredOption(def, x) ?? []))]
       return value.length === 0 ? NULL_VALUE : { kind, value }
     }
-    // Deliberately NOT merged with multiSelect: optionValues on a file def returns [], so a merged case would discard every attachment through the restore path.
     case 'file': {
@@ unregisteredMembers @@
-/** The members `raw` holds that a Multi-Select `def` doesn't register, each once; none for any other type. */
+/** The words a Multi-Select's `raw` holds that no option's title claims without regard to case, each once by fold. */
 export function unregisteredMembers(def: PropertyDefinition, raw: unknown): string[] {
-  const value = decodeValue(def, raw)
-  return value.kind === 'multiSelect'
-    ? value.value.filter((v) => registeredOption(def, v) === undefined)
-    : []
+  const { folds } = wordsOf(def)
+  return [...firstPerTitle(optionList(raw))].flatMap(([fold, w]) => (folds.has(fold) ? [] : [w]))
 }
+
+export function keepingForeignWords(
+  def: PropertyDefinition,
+  written: unknown,
+  held: unknown,
+): unknown {
+  if (PROPERTY_TYPES[def.type].kind !== 'multiSelect' || !Array.isArray(written) || !written.length)
+    return written
+  return joinValues(
+    written,
+    optionList(held).filter((w) => registeredOption(def, w) === undefined),
+  )
+}
@@ reconcilePropertyValue @@
   if (value.kind === 'link') return gonePageEntry(value.value, frozen) === null ? value : NULL_VALUE
-  if (value.kind !== 'multiSelect') return value
-  const kept = value.value.filter((v) => registeredOption(def, v) !== undefined)
-  return kept.length ? { kind: 'multiSelect', value: kept } : NULL_VALUE
+  return value
 }
@@ applyValueAtRoot @@
-/** The renderer's copy of a value write, landed where the host's lands; its members keep the spelling given, since a read decodes them by fold. */
+/** The renderer's copy of a value write, landed where the host's lands, a Multi-Select keeping the words no option claims after the picked ones. */
 …
   landValue(
     root,
     def.name,
-    value === null || isBlankValue(value) ? undefined : encodeValue(value),
+    value === null || isBlankValue(value)
+      ? undefined
+      : keepingForeignWords(def, encodeValue(value), root[def.name]),
   )
```

```Core/Properties/governedWrite.ts diff
@@ imports @@
-import { writtenSpelling } from './propertyValue'
+import { keepingForeignWords, writtenSpelling } from './propertyValue'
@@ writtenRoot @@
 export function writtenRoot(raw: Json, name: string, value: unknown, world: GovernedWorld): Json {
   const reconciled = reconcileGovernedRoot(raw, world, undefined, name).root
-  return landValue(reconciled, name, writtenSpelling(value, raw[name]))
+  const def = world.defs.get(name)
+  const kept = def ? keepingForeignWords(def, value, raw[name]) : value
+  return landValue(reconciled, name, writtenSpelling(kept, raw[name]))
 }
```

**VERIFY**

- [ ] The listed tests pass.
- [ ] `git grep -n "optionsByFold\|foldedOptions\|decodes them by fold" -- Core` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-3

**TASK:** Let a Select's or Status's Is and Is Not filters compare the option exactly, as the Multi-Select filter does, while Contains, Does Not Contain, and Starts With stay folded as search.

**NOW:** `evaluatorOf` sends `select` to `evaluateText` with `link` and `text` (`Core/Views/Pipeline/filter.ts:116-128`), whose operands `prepare` folds once (`:82-84`) and whose Is and Is Not compare folded strings (`:244-262`). The title column reaches `evaluateText` directly (`:82`), not through `evaluatorOf`. A Multi-Select or Context reaches `evaluateSet` (`:269-287`) through an inline evaluator (`:128-131`), whose Is answers whether any operand is a member and Is Not the reverse, over operands `prepare` leaves exact.

**CHANGE**

- [ ] Write and watch fail: `filter.test.ts:288` inverts, retitled *select is / is_not compare exactly; title folds*: `run('prop_sel', 'is', 'ALPHA')` is `[]`, `run('prop_sel', 'is', 'alpha')` is `['Bread']`, `run('prop_sel', 'is_not', 'ALPHA')` is `['Bread', 'Milk']`, and the `_title` lines (`:297-298`) are unchanged; a new case: `contains` with `'ALP'` on `prop_sel` still finds `Bread`. `:366` (Status) passes unchanged.
- [ ] `filter.ts`: `evaluateSet`, which only the Multi-Select and Context evaluator reads, becomes `evaluateMembers(v, op, want)`, which reads a Select's value as a list of one and a Multi-Select's or Context's as its list; `evaluatorOf(kind, op)` sends a `select` Is or Is Not to it and every other `select` operator to `evaluateText`; `prepare` passes `op`.

**AFTER**

```Core/Views/Pipeline/filter.ts diff
@@ prepare @@
-  const evaluate = t === 'title' ? evaluateText : evaluatorOf(PROPERTY_TYPES[t].kind)
+  const evaluate = t === 'title' ? evaluateText : evaluatorOf(PROPERTY_TYPES[t].kind, op)
   const operands = evaluate === evaluateText ? want.map(foldKey) : want
@@ evaluatorOf @@
-function evaluatorOf(kind: ValueKind): Evaluator {
+function evaluatorOf(kind: ValueKind, op: string): Evaluator {
   switch (kind) {
     …
     case 'select':
+      return op === FILTER_OPS.is || op === FILTER_OPS.isNot ? evaluateMembers : evaluateText
     case 'link':
     case 'text':
       return evaluateText
     case 'multiSelect':
     case 'context':
-      return (v, op, want) =>
-        evaluateSet(v.kind === 'multiSelect' || v.kind === 'context' ? v.value : [], op, want)
+      return evaluateMembers
@@ evaluateSet @@
-function evaluateSet(xs: string[], op: string, want: string[]): boolean {
+function evaluateMembers(v: PropertyValue, op: string, want: string[]): boolean {
+  const xs =
+    v.kind === 'select' ? [v.value] : v.kind === 'multiSelect' || v.kind === 'context' ? v.value : []
   switch (op) {
```

**VERIFY**

- [ ] The listed tests pass.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-4

**TASK:** Drop the index's folded column and its index, key holder queries and `space` rows exactly, and move the index generation to 19.

**NOW:** `page_values` carries `fold` with `page_values_by_fold ON (fold)` (`Desktop/Store/ddl.ts:34-41`); `INDEX_GENERATION` is 18 (`:3`), and a stale generation drops every index table and recreates it (`:80-92`). The writer stores `foldKey(key)` (`Desktop/Store/stores.ts:67-69,82`); `queryKeyHolders` is `WHERE fold = ?` (`:167-173`) and `queryMembers` folds the key against the `space` row's `qualifier` (`:174-182`), which the seed writes as `foldKey(key)` (`Core/Index/indexSeed.ts:63-71`). The memory double re-folds every row (`Core/Testing/memoryStores.ts:182-194`), the contract builds `space` rows with `foldKey` (`Core/Testing/storesContract.ts:74`) and asserts folded holders (`:166-171`), and `Core/Platform/stores.ts:11,66-69` describe folded rows and lookups "in any casing". A `key`-only predicate can't use the primary key, led by `path` (`ddl.ts:39`).

**CHANGE**

- [ ] Write and watch fail: `storesContract.ts:74` builds `space` rows as `relation('space', title, key)` and drops the `foldKey` import; `:166-171` inverts, retitled *answers a key holder by its exact key* (`queryKeyHolders('status')` and `('TAGS')` are `[]`, `('Status')` is `['Notes/A.md']`, `('Tags')` is `['Notes/B.md']`); the contract runs over both stores (`Core/Testing/contracts.test.ts:24`, `Desktop/Store/stores.test.ts:46`). `Desktop/Store/open.test.ts`: `:79` and `:169` insert `(path, key, value)`; `:148` inverts, retitled *a generation-18 index whose page_values carries a fold column rebuilds without it*: it seeds the generation-18 shape with `fold` and `page_values_by_fold` under meta `'18'`, then expects the columns `['path', 'key', 'value']` and `PRAGMA index_list(page_values)` listing `page_values_by_key` and not `page_values_by_fold`. `indexSeed.test.ts:355` expects `{ kind: 'space', target: 'Pommora', qualifier: '<Projects>', key: '' }`; `:366` goes (two casings of a key are two rows, which `:355` covers). `contentIndex.test.ts`: the hand-built rows (`:28,42,57,58,82`) carry qualifier `'<Projects>'` and the queries (`:70,104,116,160,170`) ask by it.
- [ ] `ddl.ts`: delete `fold` and `page_values_by_fold`; add `page_values_by_key ON page_values (key, path)`; `INDEX_GENERATION = 19` (the stale-generation drop recreates `page_values` without the old index, so nothing joins `RETIRED_TABLES`).
- [ ] `stores.ts`: the `page_values` insert drops `fold`; `queryKeyHolders` is `SELECT path FROM page_values WHERE key = ? ORDER BY path` (the primary key makes each path unique per key, so `DISTINCT` goes); `queryMembers` binds `key` as given; its comment drops "folded". The `foldKey` import stays for `sync_base`.
- [ ] `indexSeed.ts:69`: a `space` row's `qualifier` is the key as written; the `foldKey` import goes.
- [ ] `memoryStores.ts:182-194`: both queries compare `r.key === key` and `r.qualifier === key`.
- [ ] `Core/Platform/stores.ts`: the `Relation` doc says "the Space's title" and "a Context key"; `queryKeyHolders`' and `queryMembers`' docs drop "in any casing", and `queryMembers`' says "the trimmed NFC `title`". `Core/Index/contentIndex.ts:84`'s `queryMembers` doc drops "in any casing" and says "a trimmed NFC Space title".

**AFTER**

```Desktop/Store/ddl.ts diff
-export const INDEX_GENERATION = 18
+export const INDEX_GENERATION = 19
@@ DDL @@
   CREATE TABLE IF NOT EXISTS page_values (
     path TEXT NOT NULL,
     key TEXT NOT NULL,
-    fold TEXT NOT NULL,
     value TEXT NOT NULL,
     PRIMARY KEY (path, key)
   );
-  CREATE INDEX IF NOT EXISTS page_values_by_fold ON page_values (fold);
+  CREATE INDEX IF NOT EXISTS page_values_by_key ON page_values (key, path);
```

```Desktop/Store/stores.ts diff
@@ upsertPageIndexes @@
     const insValue = db.prepare(
-      'INSERT OR REPLACE INTO page_values (path, key, fold, value) VALUES (?, ?, ?, ?)',
+      'INSERT OR REPLACE INTO page_values (path, key, value) VALUES (?, ?, ?)',
     )
   …
-          insValue.run(path, key, foldKey(key), JSON.stringify(value) ?? 'null')
+          insValue.run(path, key, JSON.stringify(value) ?? 'null')
@@ queryKeyHolders @@
   queryKeyHolders(key) {
-    return paths(
-      db,
-      'SELECT DISTINCT path FROM page_values WHERE fold = ? ORDER BY path',
-      foldKey(key),
-    )
+    return paths(db, 'SELECT path FROM page_values WHERE key = ? ORDER BY path', key)
   },
-  // A `space` row holds the folded Context key in `qualifier` and the Space title in `target`.
+  // A `space` row holds the Context key in `qualifier` and the Space title in `target`.
   queryMembers(key, title) {
     return paths(
       db,
       "SELECT DISTINCT path FROM relations WHERE kind = 'space' AND qualifier = ? AND target = ? ORDER BY path",
-      foldKey(key),
+      key,
       title,
     )
   },
```

```Core/Index/indexSeed.ts diff
@@ imports @@
-import { foldKey, normalizeTitle } from '../Paths/caseFold'
+import { normalizeTitle } from '../Paths/caseFold'
@@ spaceRelations @@
-    for (const target of new Set(contextTitles(raw))) yield { target, qualifier: foldKey(key) }
+    for (const target of new Set(contextTitles(raw))) yield { target, qualifier: key }
```

```Core/Testing/memoryStores.ts diff
@@ queryKeyHolders @@
     queryKeyHolders(key) {
-      const fold = foldKey(key)
       return sortedPaths(
-        [...index.values.values()].filter((r) => foldKey(r.key) === fold).map((r) => r.path),
+        [...index.values.values()].filter((r) => r.key === key).map((r) => r.path),
       )
     },
     queryMembers(key, title) {
-      const fold = foldKey(key)
       return sortedPaths(
         relationRows()
-          .filter((r) => r.kind === 'space' && r.qualifier === fold && r.target === title)
+          .filter((r) => r.kind === 'space' && r.qualifier === key && r.target === title)
           .map((r) => r.path),
       )
     },
```

```Core/Platform/stores.ts diff
@@ Relation doc @@
-/** `target` is … '' for a page's own heading, or the Space's folded title in a `space` row — resolution happens at read time. `qualifier` is a normalized heading key for a heading-naming link, a folded Context key for a `space` row, and '' otherwise. */
+/** `target` is … '' for a page's own heading, or the Space's title in a `space` row — resolution happens at read time. `qualifier` is a normalized heading key for a heading-naming link, a Context key for a `space` row, and '' otherwise. */
@@ ContentIndexStore @@
-  /** Every page holding `key` in any casing. */
+  /** Every page holding `key`. */
   queryKeyHolders(key: string): string[]
-  /** Every page whose Context `key`, in any casing, names the Space of the normalized `title`. */
+  /** Every page whose Context `key` names the Space of the trimmed NFC `title`. */
   queryMembers(key: string, title: string): string[]
```

```Core/Index/contentIndex.ts diff
@@ queryMembers @@
-/** The pages holding a Context key in any casing, or — given a normalized Space title — those whose key names that Space. */
+/** The pages holding a Context key, or — given a trimmed NFC Space title — those whose key names that Space. */
```

**VERIFY**

- [ ] The listed tests pass against both stores (`storesContract.ts` runs over the memory store and the SQLite store).
- [ ] `EXPLAIN QUERY PLAN SELECT path FROM page_values WHERE key = ? ORDER BY path` searches `page_values_by_key` with no temporary B-tree (once, by hand, in the drive harness), and an index stamped 18 rebuilds on open and reads `index_generation` 19 (open `~/Test` in the harness).
- [ ] `git grep -n "page_values_by_fold\|WHERE fold = ?" -- Desktop Core ':!*.test.ts'` finds only `sync_base`'s queries.
- [ ] Run the gates, then `view-delta` for Phase 3.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, reading outward: every member match (option words, Context values, configuration operands and orders, bucket renames, the cache edit) reads `exactTitle` through `memberKey`, and every surviving `normalizeTitle` is a uniqueness, reserved-key, search, sort, heading, or path fold; a Multi-Select's decoded value holds registered options only, adoption reads raw words under the E-1 duplicate rule, and both hosts' writes append the unrecognized words after the picked ones while an emptied list clears the key; the reconcile and the refill don't carry unrecognized words (G-2); Select and Status Is and Is Not compare exactly while the text operators stay folded; the index writer, both stores, the seed, and the contract agree on exact keys and titles, and generation 19 is MetadataV3's only migration.

### Phase 4 — One Counter

**GOAL:** Every confirmation counts the items its operation would rewrite by running that operation's own plan dry, so the count and the write can't disagree (F-4's INFERRED counter, J-1's delete count). Every rewrite a count runs already answers null for a file it leaves alone, so a dry run's `touched` is the rewrite count; the property delete builds one plan that its count, its live run, and its replay share; the dialog skips at the count each caller names; and the rename refusal and every unswept notice say Items. It's a separate phase because Phase 7's format changes ask through this counter, and Phases 5 and 6 rename what the plans read without changing how they count.

#### Task 4-1

**TASK:** Give the sweep a dry mode that plans every write and makes none, and add `sweepCount`, the one helper a confirmation counts through.

**NOW:** `sweepGovernedRoots(root, files, plan)` (`Core/Properties/governedSweep.ts:59-109`) writes whatever its arms answer: the page arm writes any non-null `next` (`:79-82`) and the sidecar arm any non-null object (`:101-105`), and `rewriteRaw` drops a rewrite that changes no key (`:48-56`). Every rewrite a count runs answers null for a file it leaves alone (the option strip through `editHeldList`, the delete's `stripKeys` and `withoutOrderId`, the renames' `renameFrontmatterKey` and `rekeyHeld`), so `touched` holds exactly the files a sweep writes. `SweepPlan` is module-private (`:28`). The counters elsewhere re-read files by hand (`Core/Properties/optionOps.ts:269-285`) or count holders rather than writes (`Core/Properties/deleteProperty.ts:80-84`).

**CHANGE**

- [ ] Write and watch fail: `governedSweep.test.ts` — a new case *a dry run writes nothing and reports each write it would make*: `sweepGovernedRoots(root, [a], { text: (c) => `${c}x`, sidecars: (raw) => ({ ...raw, Tags: ['b'] }) }, true)` answers `touched` holding `a` (`before` its bytes, `after` them plus `x`) and the sidecar (`after` its `jsonText` with `Tags: ['b']`), and both files keep their bytes; a new case: `sweepCount` over the same plan answers `2`, and both files keep their bytes; a new case: a dry run files a file it can't read under `skipped`, not `touched`, and `sweepCount` leaves it out. `:27-51` and `:53-61` pass unchanged.
- [ ] `governedSweep.ts`: export `SweepPlan`; `sweepGovernedRoots` takes `dry = false`, and neither arm writes when `dry`; `SweepResult.touched`'s doc says "would write" for a dry run; add `sweepCount(root, files, plan)`, the dry run's `touched.size`.

**AFTER**

```Core/Properties/governedSweep.ts diff
@@ SweepResult @@
 export interface SweepResult {
-  /** Each file the sweep wrote, with the text it held before the write and the text the write left. */
+  /** Each file the sweep wrote, or a dry run would write, with the text it held before and the text the write leaves. */
   touched: Map<string, { before: string; after: string }>
@@ SweepPlan @@
-type SweepPlan = ({ raw: Rewrite } | { text: RewriteText }) & { sidecars?: Rewrite }
+export type SweepPlan = ({ raw: Rewrite } | { text: RewriteText }) & { sidecars?: Rewrite }
@@ sweepGovernedRoots @@
 export async function sweepGovernedRoots(
   root: string,
   files: string[],
   plan: SweepPlan,
+  dry = false,
 ): Promise<SweepResult> {
   …
       const next = 'text' in plan ? plan.text(content, file) : rewriteRaw(plan.raw, page, file)
       if (next === null) return
-      await rewritePreservingTimes(file, next)
+      if (!dry) await rewritePreservingTimes(file, next)
       out.touched.set(file, { before: content, after: next })
   …
         const after = jsonText(next)
-        await atomicWriteFile(file, after)
+        if (!dry) await atomicWriteFile(file, after)
         out.touched.set(file, { before: text, after })
@@ sweepCount @@
+
+export const sweepCount = async (root: string, files: string[], plan: SweepPlan): Promise<number> =>
+  (await sweepGovernedRoots(root, files, plan, true)).touched.size
```

**VERIFY**

- [ ] The listed tests pass; every other sweep caller's suite passes unchanged (`contextCascade.test.ts`, `cascade.test.ts`, `renameSweep.test.ts`, `restoreScrub.test.ts`, `repairSweep.test.ts`, and `exclusionScan`'s).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-2

**TASK:** Delete `optionHolders`' hand-written loop and `propertyHolders`' holder count, and answer both through `sweepCount` over the plan each operation runs: Clear's and Remove's strip, and one delete plan that the delete's count, its live run, and its replay share.

**NOW:** `optionHolders` (`optionOps.ts:269-285`) builds `valueEditPlan`'s strip (`:183-191`), then re-reads every page and Space sidecar itself and counts a non-null strip, while `valueEditSweep` (`:193-201`) sweeps the same rewrite as `{ raw, sidecars: raw }`. `propertyHolders` (`deleteProperty.ts:80-84`) counts `confirmedKeyHolders`, so it counts ID-less and duplicate-ID pages the strip leaves alone, and misses a Space touched only for its `$order` (*MetadataV3 — Investigation*, *§Confirmations and Counts*). `deleteInner` (`:93-110`) strips `keyedHolders(…).strip` (`Core/Properties/keyHolders.ts:43-74`), which keeps out a holder whose value no bundle can file, while the delete replay (`Core/Properties/replaySchemaCascade.ts:57-73`) strips every `keyHolderFiles` result, ID-less pages included; `stripAndRemove` (`deleteProperty.ts:112-131`, as Phases 1 and 2B leave it) builds the strip and its `$order` drop for both. `keyedHolders(files, def)` reads only the definition's key, and its other caller is Remove (`Core/Properties/removeProperty.ts:36-39`). With this task, `confirmedKeyHolders` keeps one caller, `bothKeyHolders` (`Core/Properties/registryProperty.ts:102-108`).

**CHANGE**

- [ ] Write and watch fail: `deleteProperty.test.ts` — the `propertyHolders` describe (`:152-173`) keeps its case (`ok(2)`) and adds *counts what the delete strips, writing nothing*: beside the page and Space holding `Priority`, an ID-less page in `Notes` holding `Priority: [hi]` and a page whose `ID` copies the first page's are not counted, a Space `{ id: 'sp2', $order: [id] }` holding no value is, so the count is `ok(3)`, and every one of those files keeps its bytes. `optionOps.test.ts`'s `optionHolders` case (`:616-624`) adds that the page and both sidecars keep their bytes after counting. `replaySchemaCascade.test.ts`: a new case in *§delete replay*: a record `{ op: 'delete', id: 'prop_s', name: 'Stage' }` replayed over `seedNexus()` plus an ID-less `Col/C.md` holding `Stage: Draft` strips `A.md` and `B.md` and leaves `C.md` byte-identical, as the live delete does. `keyHolders.test.ts`: the `keyedHolders` describe drops its `tags` fixture and calls `keyedHolders([file], 'Tags')`.
- [ ] `optionOps.ts`: delete `optionHolders`' loop and the `parseJsonObject`, `readTextOrNull`, `sweepParse`, `spaceSidecars`, and `Rewrite` imports (their one reader); `valueEditPlan` answers `{ pages, plan }` with `plan` the `SweepPlan` `{ raw, sidecars: raw }`; `valueEditSweep` sweeps that plan; `optionHolders` answers `sweepCount(root, pages, plan)`.
- [ ] `keyHolders.ts`: `keyedHolders(files, key)` takes the key it reads, files `fields[key]`, answers the exported `KeyedHolders`, and drops the `PropertyDefinition` import; `removeProperty.ts:36-39` passes `key`.
- [ ] `deleteProperty.ts`: delete `propertyHolders`' `confirmedKeyHolders` count and that import; add `deletePlan(root, propertyId, key, folders)`, answering a `DeletePlan`: the `keyedHolders` result as `held` and the sweep plan (the key strip, and the strip composed with `withoutOrderId` for sidecars); `snapshot` reads `KeyedHolders`; `propertyHolders` answers `sweepCount(root, held.strip, plan)`; `deleteInner` builds the plan once and hands its `held` to `snapshot` and the plan whole to `stripAndRemove`; `stripAndRemove(root, propertyId, folders, { held, plan })` sweeps `held.strip` under the plan, its `key` parameter gone.
- [ ] `replaySchemaCascade.ts`: the delete arm hands `deletePlan(root, journal.id, journal.name, folders)` to `stripAndRemove`; the `keyHolderFiles` import goes (its one reader). The replay then leaves alone the ID-less pages the live delete leaves alone. A page copying another's ID is told apart only while the other still holds the key, so a replay after a partial strip strips it, as the replay did before.

**AFTER**

```Core/Properties/optionOps.ts diff
@@ imports @@
-import { type Rewrite, sweepGovernedRoots, unsweptLine } from './governedSweep'
-import { parseJsonObject, readTextOrNull } from '../Files/atomicWrite'
-import { sweepParse } from '../Files/pageFile'
-import { spaceSidecars } from '../Contexts/spaceSidecar'
+import { sweepCount, sweepGovernedRoots, type SweepPlan, unsweptLine } from './governedSweep'
@@ valueEditPlan @@
 async function valueEditPlan(
   root: string,
   def: PropertyDefinition,
   target: string,
   edit: ValueEdit,
-): Promise<{ pages: string[]; raw: Rewrite }> {
+): Promise<{ pages: string[]; plan: SweepPlan }> {
   const pages = await keyHolderFiles(root, def.name, await collectionFolders(root))
-  return { pages, raw: valueEditRewrite(def, target, edit) }
+  const raw = valueEditRewrite(def, target, edit)
+  return { pages, plan: { raw, sidecars: raw } }
 }
@@ valueEditSweep @@
-  const { pages, raw } = await valueEditPlan(root, def, target, edit)
-  return (await sweepGovernedRoots(root, pages, { raw, sidecars: raw })).skipped.length
+  const { pages, plan } = await valueEditPlan(root, def, target, edit)
+  return (await sweepGovernedRoots(root, pages, plan)).skipped.length
@@ optionHolders @@
   const r = await resolveForCascade(root, propertyId, value)
   if (!r.ok) return r
-  const { pages, raw: strip } = await valueEditPlan(root, r.value, value, { op: 'strip' })
-  let held = 0
-  for (const file of [...pages, ...(await spaceSidecars(root))]) {
-    const text = await readTextOrNull(file)
-    if (text === null) continue
-    const raw = isMarkdownFile(file) ? sweepParse(text)?.raw : parseJsonObject(text)
-    if (raw && strip(raw, file) !== null) held++
-  }
-  return ok(held)
+  const { pages, plan } = await valueEditPlan(root, r.value, value, { op: 'strip' })
+  return ok(await sweepCount(root, pages, plan))
 }
```

```Core/Properties/keyHolders.ts diff
@@ imports @@
-import type { PropertyDefinition } from './properties'
@@ keyedHolders @@
+export interface KeyedHolders {
+  values: Record<string, unknown>
+  strip: string[]
+  partial: boolean
+}
+
-export async function keyedHolders(
-  files: string[],
-  def: Pick<PropertyDefinition, 'name'>,
-): Promise<{ values: Record<string, unknown>; strip: string[]; partial: boolean }> {
+export async function keyedHolders(files: string[], key: string): Promise<KeyedHolders> {
   …
     const fields = splitFrontmatter(content) as Record<string, unknown>
-    if (!Object.hasOwn(fields, def.name)) continue
+    if (!Object.hasOwn(fields, key)) continue
   …
     seen.add(id)
-    const held = fields[def.name]
-    if (!isBlankRaw(held)) values[id] = held
+    if (!isBlankRaw(fields[key])) values[id] = fields[key]
```

```Core/Properties/removeProperty.ts diff
@@ removeInner @@
   const { values, strip } = await keyedHolders(
     await keyHolderFiles(root, key, [collectionFolder]),
-    def,
+    key,
   )
```

```Core/Properties/deleteProperty.ts diff
@@ imports @@
-import { confirmedKeyHolders, keyedHolders, keyHolderFiles } from './keyHolders'
+import { type KeyedHolders, keyedHolders, keyHolderFiles } from './keyHolders'
-import { type Rewrite, sweepGovernedRoots } from './governedSweep'
+import { type Rewrite, sweepCount, sweepGovernedRoots, type SweepPlan } from './governedSweep'
@@ snapshot @@
-  held: Awaited<ReturnType<typeof keyedHolders>>,
+  held: KeyedHolders,
@@ propertyHolders @@
 export async function propertyHolders(root: string, propertyId: string): Promise<Result<number>> {
   const def = (await readRegistry(root)).defs[propertyId]
   if (!def) return NO_PROPERTY
-  return ok((await confirmedKeyHolders(root, def.name, await collectionFolders(root))).length)
+  const { held, plan } = await deletePlan(root, propertyId, def.name, await collectionFolders(root))
+  return ok(await sweepCount(root, held.strip, plan))
 }
@@ deleteInner @@
   const folders = await collectionFolders(root)
-  const held = await keyedHolders(await keyHolderFiles(root, key, folders), def)
-  const bundle = await snapshot(root, propertyId, def, folders, held)
+  const planned = await deletePlan(root, propertyId, key, folders)
+  const bundle = await snapshot(root, propertyId, def, folders, planned.held)
   …
-  const { removed, ...reach } = await stripAndRemove(root, propertyId, key, folders, held.strip)
+  const { removed, ...reach } = await stripAndRemove(root, propertyId, folders, planned)
@@ deletePlan @@
+interface DeletePlan {
+  held: KeyedHolders
+  plan: SweepPlan
+}
+
+export async function deletePlan(
+  root: string,
+  propertyId: string,
+  key: string,
+  folders: string[],
+): Promise<DeletePlan> {
+  const held = await keyedHolders(await keyHolderFiles(root, key, folders), key)
+  const raw: Rewrite = (r) => stripKeys(r, [key])
+  return { held, plan: { raw, sidecars: withoutOrderId(raw, propertyId) } }
+}
+
@@ stripAndRemove @@
 export async function stripAndRemove(
   root: string,
   propertyId: string,
-  key: string,
   folders: string[],
-  files: string[],
+  { held, plan }: DeletePlan,
 ): Promise<ConfigReach & { removed: Result<null> }> {
-  const raw: Rewrite = (r) => stripKeys(r, [key])
-  const swept = await sweepGovernedRoots(root, files, {
-    raw,
-    sidecars: withoutOrderId(raw, propertyId),
-  })
+  const swept = await sweepGovernedRoots(root, held.strip, plan)
   for (const folder of folders) await unassignAndPurge(folder, propertyId)
```

```Core/Properties/replaySchemaCascade.ts diff
@@ imports @@
-import { keyHolderFiles } from './keyHolders'
-import { stripAndRemove } from './deleteProperty'
+import { deletePlan, stripAndRemove } from './deleteProperty'
@@ delete @@
       const folders = await collectionFolders(root)
-      const files = await keyHolderFiles(root, journal.name, folders)
       const { skipped, hosts, removed } = await stripAndRemove(
         root,
         journal.id,
-        journal.name,
         folders,
-        files,
+        await deletePlan(root, journal.id, journal.name, folders),
       )
```

**VERIFY**

- [ ] The listed tests pass; `deleteProperty.test.ts`'s *§a global delete reaches a Space sidecar* and `replaySchemaCascade.test.ts`'s *§delete replay*, *§unreadable holders hold the record*, and *§the index seam* pass unchanged.
- [ ] `git grep -n "confirmedKeyHolders" -- Core` lists only `keyHolders.ts`, `registryProperty.ts`, and `keyHolders.test.ts`; `git grep -n "readTextOrNull\|sweepParse" -- Core/Properties/optionOps.ts` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-3

**TASK:** Let `askHolding` take the count at or under which it doesn't ask, with Clear passing zero, and say Items in the rename refusal and every unswept notice through one `itemCount` beside `KEY_REFUSAL`.

**NOW:** `askHolding` (`Core/Interface/Confirm/confirmations.ts:109-116`) asks at any count, from `askDestroyProperty`, `askRemoveOption`, and `askClearOption` (`:118-140`; callers `Core/Properties/Schema/PropertyFrame.tsx:279`, `Core/Properties/Schema/useOptionEdit.tsx:110,114`). Three sites pluralize a count: the dialog's `items` (`confirmations.ts:107`, "Items"), `unsweptLine` (`Core/Properties/governedSweep.ts:30-31`, "file"/"files"), and `KEY_REFUSAL.held` (`Core/Properties/properties.ts:268-269`, "file holds"/"files hold"). `unsweptLine` carries every unswept notice: the property, option, and Context cascades, the page-rename and delete Link cascades (`Core/Nexus/cascade.ts:132,230`, "links in …"), the configuration pass (`Core/Nexus/configReach.ts:274`), the exclusion clear (`Core/Settings/exclusionScan.ts:86`), and the restore scrub (`Core/Trash/restoreScrub.ts:66`). The renderer may import `properties.ts`; the host can't import the Interface.

**CHANGE**

- [ ] Write and watch fail: `confirmations.test.ts` — a new case beside `:39`: with `property:holders` answering `ok(0)`, `askClearOption('p1', 'Active')` resolves `true` without asking, while `askDestroyProperty('p1', 'Status')` and `askRemoveOption('p1', 'Active')` still ask (`asked` holds both, the first containing "stripped from 0 Items;"); `:39-60` passes unchanged; `:139`'s warning fixture reads `'Couldn’t update 1 Item.'`. `registryProperty.test.ts:189` expects `'1 Item holds both "Status" and "Stage".'`. `cascade.test.ts:120` expects `'Couldn’t update links to “Target” in 1 Item.'` and `mutate.test.ts:1347` `'Couldn’t update links to “Beta” in 1 Item.'`. `notifications.test.ts:44-45,69,73,86`'s warning fixtures read `1 Item` for `1 file`. Every other suite compares against `unsweptLine(n)` itself and passes unchanged.
- [ ] `confirmations.ts`: delete `items`; `askHolding(propertyId, value, req, quietAt?)` answers `true` without asking when `quietAt` is given and the count is at or under it, and otherwise asks as today; `askClearOption` passes `0`; `askDestroyProperty` and `askRemoveOption` pass none; `askEmptyTrash`'s count reads through `itemCount` too; import `itemCount`.
- [ ] `properties.ts`: add `itemCount(n)` (`1 Item`, `n Items`) above `KEY_REFUSAL`; `KEY_REFUSAL.held` reads `${itemCount(n)} ${n === 1 ? 'holds' : 'hold'} both …`.
- [ ] `governedSweep.ts`: `unsweptLine` reads `` `Couldn’t update ${what}${itemCount(count)}.` `` and imports `itemCount`.

**AFTER**

```Core/Properties/properties.ts diff
@@ KEY_REFUSAL @@
+export const itemCount = (n: number): string => `${n} ${n === 1 ? 'Item' : 'Items'}`
+
 export const KEY_REFUSAL = {
   …
   held: (from: string, to: string, n: number) =>
-    `${n} ${n === 1 ? 'file holds' : 'files hold'} both "${from}" and "${to}".`,
+    `${itemCount(n)} ${n === 1 ? 'holds' : 'hold'} both "${from}" and "${to}".`,
 } as const
```

```Core/Properties/governedSweep.ts diff
@@ imports @@
+import { itemCount } from './properties'
@@ unsweptLine @@
 export const unsweptLine = (count: number, what = ''): string =>
-  `Couldn’t update ${what}${count} ${count === 1 ? 'file' : 'files'}.`
+  `Couldn’t update ${what}${itemCount(count)}.`
```

```Core/Interface/Confirm/confirmations.ts diff
@@ imports @@
+import { itemCount } from '../../Properties/properties'
@@ askHolding @@
-const items = (count: number): string => `${count} ${count === 1 ? 'Item' : 'Items'}`
-
 const askHolding = async (
   propertyId: string,
   value: string | undefined,
   req: (held: string) => ConfirmRequest,
+  quietAt?: number,
 ): Promise<boolean> => {
   const r = await dialer().ask('property:holders', propertyId, value)
-  return reportRefusal(r) && ask(req(items(r.value)))
+  if (!reportRefusal(r)) return false
+  return (quietAt !== undefined && r.value <= quietAt) || ask(req(itemCount(r.value)))
 }
@@ askClearOption @@
 export const askClearOption = (propertyId: string, name: string): Promise<boolean> =>
-  askHolding(propertyId, name, (held) => ({
-    message: `Clear “${name}” from ${held}?`,
-    detail: 'The option stays; only its assigned values are removed.',
-    action: 'Clear',
-    tone: 'destructive',
-  }))
+  askHolding(
+    propertyId,
+    name,
+    (held) => ({
+      message: `Clear “${name}” from ${held}?`,
+      detail: 'The option stays; only its assigned values are removed.',
+      action: 'Clear',
+      tone: 'destructive',
+    }),
+    0,
+  )
@@ askEmptyTrash @@
-    message: count === 1 ? 'Delete this item?' : `Delete these ${count} items?`,
+    message: count === 1 ? 'Delete this Item?' : `Delete these ${itemCount(count)}?`,
```

**VERIFY**

- [ ] The listed tests pass.
- [ ] `git grep -nE "'file holds'|'files hold'|=== 1 \? 'file' : 'files'" -- Core` and `git grep -n "const items = (" -- Core/Interface/Confirm` find nothing.
- [ ] Run the gates, then `view-delta` for Phase 4.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, reading outward: every rewrite a count runs answers null for a file it leaves alone, so `touched` counts the files a live run writes; a dry run writes nothing on either arm and still files unreadable files under `skipped`; Delete's count, its live strip, and its replay strip the same files through `deletePlan`, and the count includes a Space touched only for `$order`; Clear's and Remove's count is their strip's dry run; Clear skips its dialog at zero while Delete and Remove ask at any count; every notice and refusal that counts says Items through `itemCount`.

### Phase 5A — Definitions Carry a Label and a Key

**GOAL:** Every property definition stores a `label`, its title in the app, and a `key`, the word it writes to disk, in place of `name` (C-1, C-2); a registry entry omitting `label` reads its `key` (C-3). Every read that used `name` as the on-disk key reads `key`, every read that used it as a title reads `label`, and every uniqueness and reserved-key check reads both words without regard to case (D-1). Keys equal labels this phase, since no Key Format exists yet: a create and a rename write `key = label`, so nothing a user does behaves differently, and the divergent pairs C-2's INFERRED rule trusts (a key edited by hand) are what the tests pin. From this phase's first commit until Task 5B-4 rewrites the registries, a build reads neither Nexus, so the gates run on fixtures and neither phase's checkpoint drives the app. It's a separate phase from 5B because the definition's field rename and the option's field rename are two compile units, each touching every reader of its field and a few hundred test fixtures; together they're past one run.

- [x] `[Stop: before Task 5A-1 — Nathan words the six messages in §Open Items, which every task from Task 5A-2 on writes; quits every Pommora window on NexusOS and ~/Test, keeping them closed through Task 5B-4; and gives his word for Task 5B-4; the orchestrator then writes the copy into the tasks and runs Phases 5A and 5B through Task 5B-4]`

#### Task 5A-1

**TASK:** Replace the definition's `name` with `key` and `label` and give creates their own `PropertyDraft`, then move every reader and writer of `name` to the word it means, the Investigation's classification (*§Readers and Writers of `def.name`*), with keys equal to labels.

**NOW:** `propertyDefinitionFields` holds `name: z.string()` (`Core/Properties/properties.ts:169-199`), and `propertyDefinition` is its loose decoder (`:200-201`). As Phases 2B and 3 leave them, `byKey` keys by `d.name` (`properties.ts`, the old `byFoldedName`, with six callers: `Core/Properties/assignment.ts:41,45`, `Core/Contexts/contextResolve.ts` `spaceWorldOf`, `Core/Properties/schema.ts` `linkKeysOf`, `Core/Nexus/cascade.ts:80`, `Core/Trash/restoreScrub.ts:35`), and these production reads remain (HEAD lines):
- **Key (`def.name` as the word on disk):** `Core/Matrix/matrixInput.ts:97`; `Core/Nexus/cascade.ts:218`; `Core/Nexus/fileEvents.ts:530` (`p.name !== d.name`); `Core/Nexus/page.ts`' `createPage` (`modeled[def.name]`, `keys.push(def.name)`); `Core/Properties/assignValue.ts`' `held` read (`target.frontmatter[name]`) and `restore`'s `landValue(row.frontmatter, def.name, held)`; `Core/Properties/PropertyPanel.tsx:215`; `assignment.ts:63` (`refillValues`' `landValue`); `Core/Properties/deleteProperty.ts:40,96` and `propertyHolders` (as Phase 4 leaves it); `Core/Properties/optionOps.ts:189`; `Core/Properties/pageValue.ts:42`; `Core/Properties/propertyValue.ts`' `applyValueAtRoot` (both reads); the reads Task 2B-1 inlined in place of `heldPropertyValue` (`assignment.ts:60`, `deleteProperty.ts:65` through its `key`, `optionOps.ts:102`, `Core/Properties/value.ts:57`); `Core/Properties/registryProperty.ts:91,92` (`renameSweep`), `:126,128` (`bothKeyHolders`, `KEY_REFUSAL.held`), `:129` (the record's `from`), `:141` (the reply's `from`); `Core/Properties/removeProperty.ts:34`; `Core/Properties/setProperty.ts`' two ops' `landSpaceValue`/`landPageValue` calls, and the two test writes in `Core/Testing/propertyWrites.ts`; `Core/Trash/spend.ts:281`; `deleteProperty.ts:103` (the delete record's `name`, which holds the key until Phase 6 renames the field); `Core/Properties/replaySchemaCascade.ts`' three definition compares; `registryProperty.ts`' create supersede (`journal.name === landed`).
- **Title (`def.name` as the shown name):** `page.ts`' `valueToWrite` (its no-shape refusal); `Core/Properties/Cells/PropertyTypes.tsx:88`; `Core/Properties/Cells/columnLabel.ts:18`; `Core/Properties/Pickers/PropertyPicker.tsx:150`; `Core/Properties/Schema/PropertyFrame.tsx:98,151,157,270,277,279,284,288,420`; `registryProperty.ts:54` (the label `freeName` steps aside); `Core/Trash/trashRows.ts:59` (a property record's title, read untyped).
- **Identity (uniqueness, reserved keys, no-ops):** `Core/Properties/propertiesRegistry.ts:32,34`; `registryProperty.ts:55,121`; `schema.ts:47,56`. Task 5A-2 makes each read both words; this task points them at `label`.
- **Writes:** `properties.ts:171` (the field); `PropertyPicker.tsx:91` (`syntheticContextDef`); `PropertyFrame.tsx:229` (the `schema:add` payload); `registryProperty.ts:57` (`createProperty`'s candidate) and `:138` (`renameProperty`'s commit).

`createProperty(root, def: PropertyDefinition)` (`registryProperty.ts:46-78`) steps the name aside and overwrites it, from `schema:add` (`Core/Properties/handlers.ts:137-150`, parsing `propertyDefinition`; bridge `Core/Contract/bridge.ts:133-135`), the property restore (`Core/Trash/restoreProperty.ts:38-41`), and tests. `editProperty` excludes `id` and `name` (`registryProperty.ts:156-173`). The rename reply is `{ from, to }` in names (`registryProperty.ts:100,152`), which `PropertyFrame.tsx:237` hands to `bumpValuesEpoch` (`Core/Session/cacheSlice.ts:55-58`) for `rekeyOverrides` (`Core/Views/Host/useContainerValues.ts:16-27`), a re-key by on-disk key. Desktop, UIX, and Sync read no definition field. `Core/Testing/pageValues.ts:15`, `Core/Testing/viewHarness.tsx:58-77` (`STATUS_DEF`), `Core/Testing/fixtures/registry.json`, and `.claude/scripts/make-benchmark-nexus.mjs:146-160` write the old shape.

**CHANGE**

- [ ] Write and watch fail, with divergent pairs, since keys equal labels everywhere else: `page.test.ts` — `defOf` returns `{ id, label, key, type }` with `key` the label lowercased; `updatePageProperty` over `{ id: 'prop_stage', label: 'Stage', key: 'stage', type: 'select', … }` writes `stage:` and leaves a held `Stage:` as written, and a value with no shape refuses with `"Stage" was given a value it has no shape for.` `value.test.ts` — a new case: `resolveFieldValue` under `{ id: 'prop_s', label: 'S', key: 's', … }` reads a row's `s:` and ignores `S:`. `columnLabel.test.ts` — a definition `{ label: 'Due Date', key: 'due_date' }` labels its column `Due Date`. `propertiesRegistry.test.ts` — a new case: a stored definition `{ id: 'prop_a', key: 'Tags', type: 'text' }` with no `label` reads `label: 'Tags'` (C-3), and a mutation of another definition leaves it byte-identical on disk. `registryProperty.test.ts` — `createProperty(root, { id: '', label: 'Priority', type: 'number' })` stores `label` and `key` both `Priority`; a restored record's stale `key` is overwritten by the landed label (`restoreProperty.test.ts:168` asserts `label` and `key` both `Priority (2)`).
- [ ] The fixture rename, assertions unchanged: every definition literal's `name: X` becomes `label: X, key: X`, except a literal handed to `createProperty` or `schema:add`, which carries `label: X` alone (its type is now `PropertyDraft`), and every read of `.name` on a definition becomes `.label` where the test asserts a title and `.key` where it reads a frontmatter key. The typecheck finds every typed site; the ledger (HEAD lines, located by content after Phases 1–4):
  - **Typed literals:** `contextResolve.test.ts:83,89,95,99,237,238`; `contextWrite.test.ts:253`; `writePathRace.test.ts:79`; `indexMaintenance.test.ts:132`; `ValuePickPresenter.test.tsx:31`; `propertyMenuActions.test.ts:19,25,29,30,31,144`; `matrixInput.test.ts:88,95,102,103,104,135`; `matrixRuntime.test.ts:638,700`; `cascade.test.ts:188,190,191,264,265,373,403,422,469,513,518,835,883`; `configReach.test.ts:25,31`; `mutate.test.ts:173,1984,1985,2316,2361,2559,2703,2801,3434`; `page.test.ts:17`; `settle.test.ts:1041`; `Cell.test.tsx:22,45-51`; `OptionChip.test.tsx:7`; `cellResolve.test.ts:8`; `columnLabel.test.ts:7,8`; `PropertyPicker.pane.test.tsx:22,26,27,325`; `PropertyValueInput.test.tsx:111,149,162,170,185,352`; `filePick.test.ts:18`; `PropertyPanel.test.tsx:20,24,25,162,199`; `PropertyFrame.dateTime.test.tsx:16`; `PropertyFrame.test.tsx:34,35,134,143,181`; `assignValue.test.ts:15,231`; `assignment.test.ts:71,95,128`; `cascadeRace.test.ts:23,43`; `deleteProperty.test.ts:73,129,156,183,221,243,312`; `governedWorld.test.ts:29,34`; `governedWorldWrite.test.ts:47,53`; `governedWrite.test.ts:87,93,151,166-168,171`; `handlers.test.ts:57,316`; `journalWiring.test.ts:52,133,146,189,275,281,287,298,355`; `keyHolders.test.ts:39,71`; `optionModel.test.ts:130,151`; `optionOps.test.ts:53,55,404,439,444`; `properties.test.ts:311`; `propertiesRegistry.test.ts:25,177,205`; `propertyValue.test.ts:16`; `registryProperty.test.ts:42,45,50,56,66,79,80,87,88,92,95,102,108,112,113,120-122,136,143,158,179,199,200,207,233,244,257,265`; `removeProperty.test.ts:41,340,364`; `renameSweep.test.ts:12,98,106`; `repairSweep.test.ts:46,51`; `replaySchemaCascade.test.ts:47,71,135,210`; `schema.test.ts:14,50,53,60,64,67,75,85,89,95,116,133`; `setSpaceProperty.test.ts:42,103,107`; `value.test.ts:11,22,25,29,30,85,135,231,259,262`; `PreviewRulesRow.test.tsx:33`; `deleteReach.test.ts:57`; `restoreProperty.test.ts:48,161,177,318,340,361`; `GroupBand.test.tsx:21,34,38`; `bandRouter.test.ts:24`; `cardGestures.test.tsx:15,176`; `cardValueInput.test.ts:75,79`; `useActiveView.test.tsx:11`; `useColumnStyles.test.ts:15-17,90`; `useViewHost.test.tsx:35,824`; `columns.test.ts:9,10`; `creationSeeds.test.ts:10-16`; `filter.test.ts:12,28,32-37`; `group.test.ts:71,492,528,548,557,595,631,645,686,687,720`; `resolveView.test.ts:130,263,456,587,651,679,720,721`; `sort.test.ts:13,19,42-45,48,51-53,140,169`; `FilterFrame.test.tsx:16,30`; `GroupFrame.test.tsx:18,29`; `OptionOrderList.test.tsx:20,27`; `SortFrame.test.tsx:16,30-32`; `ViewFrame.test.tsx:14`; `VisibilityFrame.test.tsx:17-19`; `bandCommits.test.tsx:21`; `cellGestures.test.tsx:19,42-45,48,498`; `useColumns.test.ts:14-21`; `filterModel.test.ts:47-49,54,55`; `manualOrderDrops.test.tsx:18`; `viewWrite.test.tsx:19`; `visibilityModel.test.ts:10`.
  - **Untyped registry JSON the typecheck can't see:** `properties.test.ts:57,69,76,85,94,104,119,128,132,140,148,154,156,222,237,263`; `migrateConfig.test.ts:30-34,42-46,52` (its legacy-type assertions unchanged); `propertiesRegistry.test.ts:76,77,162,191,212,222,238`; `fileEvents.test.ts:484,491,499,503,504,1102,1211`; `optionOps.test.ts:247,248,251,361,370,387`; `cardValueInput.test.ts:62-66`; `restoreScrub.test.ts:79,262,281,303,325`; `journalWiring.test.ts:274,280,286,297,300`; `readNexus.test.ts:196,497,832,836`; `trashRecovery.test.ts:75,79,80`; `spend.test.ts:1024,1691,1738`; `settle.test.ts:821,825,1077`; `governedWorldWrite.test.ts:134,135`; `mutate.test.ts:1427,1457`; `Nexus/handlers.test.ts:167,183`; `writeGate.test.ts:63,136`; `restoreProperty.test.ts:148`; `deleteOrder.test.ts:111`; `keyHolders.test.ts:139`; `assignment.test.ts:59`; `LinkCell.test.tsx:41`; `matrixRuntime.test.ts:713`; `Core/Testing/fixtures/registry.json:4,32`.
  - **Reads:** `fileEvents.test.ts:493`, `readNexus.test.ts:849`, `governedWorldWrite.test.ts:154`, `handlers.test.ts:179`, `propertiesRegistry.test.ts:113`, `registryProperty.test.ts:83,104,128,139,153,169`, `replaySchemaCascade.test.ts:150`, `restoreProperty.test.ts:168` read `.label` (they assert titles), and `restoreProperty.test.ts:185`'s `toMatchObject({ name: 'Urgency' })` matches `{ label: 'Urgency', key: 'Urgency' }`; `removeProperty.test.ts:82,286,358` and `cardValueInput.test.ts:96` read `.key` (they index frontmatter).
- [ ] `properties.ts`: the field `name` goes; add `key: z.string()` and `label: z.string().optional()`; add `labelled`, the C-3 rule (a missing `label` reads the `key`), declared above `selectOption` (`:130-133`) so Task 5B-1's option decoders can reach it, and `propertyDefinition` decodes through it, so a decoded definition always holds both; add `propertyDraft` (the fields without `key`, `label` required) and its type `PropertyDraft`; `byKey` keys by `d.key`.
- [ ] `registryProperty.ts`: `createProperty(root, def: PropertyDraft)` steps `def.label` aside over the registry's labels and writes the landed word as `label` and `key`; its supersede reads `journal.name === landed`, the landed key; `renameSweep(root, oldKey, def)` moves `oldKey` to `def.key`; `renameProperty` no-ops on `to === prior.label`, refuses over `bothKeyHolders(root, prior.key, to)` and `KEY_REFUSAL.held(prior.key, to, n)`, journals `{ from: prior.key, to }`, commits `{ ...current, label: to, key: to }`, and answers `{ from: current.key, to }`, the key pair; `editProperty` excludes `id`, `label`, and `key`, its doc saying "but the label and key".
- [ ] `handlers.ts`: `schema:add` parses `propertyDraft`; `bridge.ts:134` types the payload `PropertyDraft`, and `property:rename`'s argument is `label`.
- [ ] Every key read in the NOW list reads `.key` and every title read `.label`; `schema.ts:47,56`, `propertiesRegistry.ts:32,34`, and `registryProperty.ts:55,121` read `.label` (Task 5A-2 adds the key). `replaySchemaCascade.ts`' delete and rename arms compare `.key`; `refillTrashed`'s doc (`Core/Trash/holdings.ts:128`) says `names` "maps each property's ID to its key"; `trashRows.ts:59` reads `record.def.label`; `PropertyPicker.tsx:91` writes `label: ''` and `key: ''`; `PropertyFrame.tsx:229` sends `label`.
- [ ] `Core/Testing`: `pageValues.ts:15` reads `d.key` and its header says "keyed by the property KEY"; `viewHarness.tsx:60` writes `label` and `key`; `fixtures/registry.json:4,32` hold `"key"` and `"label"`.
- [ ] `.claude/scripts/make-benchmark-nexus.mjs:147`: `definition` writes `{ id: p.id, key: p.name, label: p.name, type: p.type }`.

**AFTER**

```Core/Properties/properties.ts diff
@@ byKey @@
-export const byKey = <D extends { name: string }>(defs: Iterable<D>): Map<string, D> =>
-  new Map(Array.from(defs, (d) => [d.name, d]))
+export const byKey = <D extends { key: string }>(defs: Iterable<D>): Map<string, D> =>
+  new Map(Array.from(defs, (d) => [d.key, d]))
@@ propertyDefinitionFields @@
 const propertyDefinitionFields = z.object({
   id: z.string(),
-  name: z.string(),
+  key: z.string(),
+  label: z.string().optional(),
   type: propertyType,
@@ optionAppearance @@
 export type OptionAppearance = z.infer<typeof optionAppearance>
+
+/** A word a registry gives no label reads its key as its label (C-3). */
+export const labelled = <W extends { key: string; label?: string }>(w: W): W & { label: string } => ({
+  ...w,
+  label: w.label ?? w.key,
+})
@@ propertyDefinition @@
-export const propertyDefinition = looseDecoder(propertyDefinitionFields)
+export const propertyDefinition = looseDecoder(propertyDefinitionFields).transform(labelled)
 export type PropertyDefinition = z.infer<typeof propertyDefinition>
+
+/** What a create is handed: the create writes the key from the label it lands. */
+export const propertyDraft = looseDecoder(
+  propertyDefinitionFields.omit({ key: true }).extend({ label: z.string() }),
+)
+export type PropertyDraft = z.infer<typeof propertyDraft>
```

```Core/Properties/registryProperty.ts diff
@@ imports @@
   PROPERTY_TYPES,
   type PropertyDefinition,
+  type PropertyDraft,
 } from './properties'
@@ createProperty @@
 export async function createProperty(
   root: string,
-  def: PropertyDefinition,
+  def: PropertyDraft,
 ): Promise<Result<{ id: string }>> {
   …
     landed = freeName(
-      exactTitle(def.name ?? ''),
-      defs.map((d) => d.name),
+      exactTitle(def.label),
+      defs.map((d) => d.label),
     )
-    const candidate = seeded({ ...def, name: landed, id: def.id || mintPropertyId() })
+    const candidate = seeded({ ...def, label: landed, key: landed, id: def.id || mintPropertyId() })
@@ renameSweep @@
 export async function renameSweep(
   root: string,
-  oldName: string,
+  oldKey: string,
   def: PropertyDefinition,
 ): Promise<number> {
   // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too.
-  const files = await keyHolderFiles(root, oldName, await collectionFolders(root))
+  const files = await keyHolderFiles(root, oldKey, await collectionFolders(root))
   const text = (content: string): string | null =>
-    renameFrontmatterKey(content, oldName, def.name, NEW_KEY_IS_FRESHER)
-  const rekey: Rewrite = (raw) => rekeyHeld(raw, oldName, def.name, NEW_KEY_IS_FRESHER)
+    renameFrontmatterKey(content, oldKey, def.key, NEW_KEY_IS_FRESHER)
+  const rekey: Rewrite = (raw) => rekeyHeld(raw, oldKey, def.key, NEW_KEY_IS_FRESHER)
@@ renameProperty @@
-    if (to === prior.name) return ok(null)
+    if (to === prior.label) return ok(null)
     …
-    const clashes = await bothKeyHolders(root, prior.name, to)
+    const clashes = await bothKeyHolders(root, prior.key, to)
     if (clashes.length)
-      return fail('invalid-property', KEY_REFUSAL.held(prior.name, to, clashes.length))
-    const record: SchemaJournal = { op: 'rename', id: propertyId, from: prior.name, to }
+      return fail('invalid-property', KEY_REFUSAL.held(prior.key, to, clashes.length))
+    const record: SchemaJournal = { op: 'rename', id: propertyId, from: prior.key, to }
     …
-        const def = { ...current, name: to }
+        const def = { ...current, label: to, key: to }
         return {
           next: { ...registry, defs: { ...registry.defs, [propertyId]: def } },
-          result: ok({ from: current.name, def }),
+          result: ok({ from: current.key, def }),
         }
@@ editProperty @@
-/** Every definition edit but the name, which is renameProperty's since it cascades into every page. */
+/** Every definition edit but the label and key, which are renameProperty's since the key cascades into every page. */
 export function editProperty(
   root: string,
   propertyId: string,
-  changes: Omit<Partial<PropertyDefinition>, 'id' | 'name'>,
+  changes: Omit<Partial<PropertyDefinition>, 'id' | 'label' | 'key'>,
```

```Core/Properties/handlers.ts diff
@@ imports @@
-  propertyDefinition,
+  propertyDraft,
 } from './properties'
@@ schema:add @@
-    const parsed = propertyDefinition.safeParse(def)
+    const parsed = propertyDraft.safeParse(def)
```

```Core/Contract/bridge.ts diff
@@ schema:add @@
-    args: [containerPath: string, def: PropertyDefinition]
+    args: [containerPath: string, def: PropertyDraft]
@@ property:rename @@
-    args: [propertyId: string, name: string]
+    args: [propertyId: string, label: string]
```

```Core/Properties/replaySchemaCascade.ts diff
@@ delete @@
-      const crashed = !answered && def !== undefined && def.name === journal.name
-      const freed = !def && !Object.values(defs).some((d) => d.name === journal.name)
+      const crashed = !answered && def !== undefined && def.key === journal.name
+      const freed = !def && !Object.values(defs).some((d) => d.key === journal.name)
@@ rename @@
-      if (!def || Object.values(defs).some((d) => d.name === journal.from)) return NO_REACH
+      if (!def || Object.values(defs).some((d) => d.key === journal.from)) return NO_REACH
```

```Core/Nexus/page.ts diff
@@ createPage @@
     if (encoded.value === undefined) continue
-    modeled[def.name] = encoded.value
-    keys.push(def.name)
+    modeled[def.key] = encoded.value
+    keys.push(def.key)
@@ valueToWrite @@
-    ? fail('invalid-property', `"${def.name}" was given a value it has no shape for.`)
+    ? fail('invalid-property', `"${def.label}" was given a value it has no shape for.`)
```

```Core/Properties/setProperty.ts diff
@@ setSpacePropertyOp @@
-  return done(value.ok ? await landSpaceValue(root, resolved.value, def.name, value.value) : value)
+  return done(value.ok ? await landSpaceValue(root, resolved.value, def.key, value.value) : value)
@@ setPagePropertyOp @@
         ? landPageValue(
             resolved.value,
-            def.name,
+            def.key,
```

```Core/Testing/propertyWrites.ts diff
@@ updatePageProperty @@
-  return encoded.ok ? landPageValue(absFile, def.name, encoded.value, world) : encoded
+  return encoded.ok ? landPageValue(absFile, def.key, encoded.value, world) : encoded
@@ setSpaceProperty @@
-  return encoded.ok ? landSpaceValue(root, absSpaceDir, def.name, encoded.value) : encoded
+  return encoded.ok ? landSpaceValue(root, absSpaceDir, def.key, encoded.value) : encoded
```

```Core/Properties/propertyValue.ts diff
@@ applyValueAtRoot @@
   landValue(
     root,
-    def.name,
+    def.key,
     value === null || isBlankValue(value)
       ? undefined
-      : keepingForeignWords(def, encodeValue(value), root[def.name]),
+      : keepingForeignWords(def, encodeValue(value), root[def.key]),
   )
```

```Core/Properties/pageValue.ts diff
@@ valueEditRewrite @@
 export function valueEditRewrite(
-  def: Pick<PropertyDefinition, 'name'>,
+  def: Pick<PropertyDefinition, 'key'>,
   target: string,
   edit: ValueEdit,
 ): Rewrite {
-  return (raw) => editHeldList(raw, def.name, (held) => editList(held, target, edit))
+  return (raw) => editHeldList(raw, def.key, (held) => editList(held, target, edit))
 }
```

```Core/Properties/assignment.ts diff
@@ refillValues @@
-    if (!isBlankRaw(raw[def.name])) return null
-    return landValue(raw, def.name, writtenSpelling(encoded, value))
+    if (!isBlankRaw(raw[def.key])) return null
+    return landValue(raw, def.key, writtenSpelling(encoded, value))
```

```Core/Properties/deleteProperty.ts diff
@@ snapshot @@
-  const key = def.name
+  const key = def.key
@@ propertyHolders @@
-  const { held, plan } = await deletePlan(root, propertyId, def.name, await collectionFolders(root))
+  const { held, plan } = await deletePlan(root, propertyId, def.key, await collectionFolders(root))
@@ deleteInner @@
-  const key = def.name
+  const key = def.key
   …
-  const record: SchemaJournal = { op: 'delete', id: propertyId, name: def.name }
+  const record: SchemaJournal = { op: 'delete', id: propertyId, name: key }
```

```Core/Properties/removeProperty.ts diff
@@ removeInner @@
-  const key = def.name
+  const key = def.key
```

```Core/Properties/optionOps.ts diff
@@ valueEditPlan @@
-  const pages = await keyHolderFiles(root, def.name, await collectionFolders(root))
+  const pages = await keyHolderFiles(root, def.key, await collectionFolders(root))
```

```Core/Nexus/cascade.ts diff
@@ renameCascade @@
-    const cachedIds = new Set(defs.filter((d) => holds(d.name)).map((d) => d.id))
+    const cachedIds = new Set(defs.filter((d) => holds(d.key)).map((d) => d.id))
```

```Core/Nexus/fileEvents.ts diff
@@ oweNamedKeys @@
-          (p?.type !== 'multiSelect' || p.name !== d.name)
+          (p?.type !== 'multiSelect' || p.key !== d.key)
```

```Core/Matrix/matrixInput.ts diff
@@ answers @@
-      const name = schema.find((d) => d.id === rule.property_id)?.name
-      return name !== undefined && Object.hasOwn(row.frontmatter, name)
+      const key = schema.find((d) => d.id === rule.property_id)?.key
+      return key !== undefined && Object.hasOwn(row.frontmatter, key)
```

```Core/Properties/PropertyPanel.tsx diff
@@ held @@
-      ? fm !== null && Object.hasOwn(fm, f.def.name)
+      ? fm !== null && Object.hasOwn(fm, f.def.key)
```

```Core/Trash/spend.ts diff
@@ reTag @@
-    await refillTrashed(root, trashed, new Map(defs.map((d) => [d.id, d.name])))
+    await refillTrashed(root, trashed, new Map(defs.map((d) => [d.id, d.key])))
```

```Core/Trash/holdings.ts diff
@@ refillTrashed doc @@
-/** … so it returns with it; `names` maps each property's ID to its name. */
+/** … so it returns with it; `names` maps each property's ID to its key. */
```

```Core/Trash/trashRows.ts diff
@@ trashRowOf @@
-      title: typeof record.def.name === 'string' ? record.def.name : record.id,
+      title: typeof record.def.label === 'string' ? record.def.label : record.id,
```

```Core/Properties/schema.ts diff
@@ validateName @@
-  const clash = existing.some((d) => d.id !== excludeId && normalizeTitle(d.name) === folded)
+  const clash = existing.some((d) => d.id !== excludeId && normalizeTitle(d.label) === folded)
@@ validateDefinition @@
-  const nameCheck = validateName(def.name, existing, def.id)
+  const nameCheck = validateName(def.label, existing, def.id)
```

```Core/Properties/propertiesRegistry.ts diff
@@ normalizeRegistry @@
-    const name = parsed.success ? normalizeTitle(parsed.data.name) : ''
+    const name = parsed.success ? normalizeTitle(parsed.data.label) : ''
     // A name is one key on disk, so the first definition to hold it in any casing is the one admitted.
-    if (parsed.success && keyRefusal(parsed.data.name) === null && !names.has(name)) {
+    if (parsed.success && keyRefusal(parsed.data.label) === null && !names.has(name)) {
```

```Core/Properties/Pickers/PropertyPicker.tsx diff
@@ syntheticContextDef @@
 export const syntheticContextDef = (id: string): PropertyDefinition => ({
   id,
-  name: '',
+  label: '',
+  key: '',
   type: 'context',
 })
@@ FilePick @@
-      label={t.def.name}
+      label={t.def.label}
```

```Core/Properties/Schema/PropertyFrame.tsx diff
@@ create @@
     const res = await dialer().ask('schema:add', collectionPath, {
       id: '',
-      name: `New ${propertyTypeLabel(type)}`,
+      label: `New ${propertyTypeLabel(type)}`,
       type,
     })
@@ every title read (:98, :151, :157, :270, :277, :279, :284, :288, :420) @@
-      value={d.name}
+      value={d.label}
   … and likewise `d.label` / `def.label` at each of the other eight
```

```Core/Properties/Cells/PropertyTypes.tsx diff
-    label: d.name,
+    label: d.label,
```

```Core/Properties/Cells/columnLabel.ts diff
-  return RESERVED_LABEL[columnId] ?? schema.find((d) => d.id === columnId)?.name ?? columnId
+  return RESERVED_LABEL[columnId] ?? schema.find((d) => d.id === columnId)?.label ?? columnId
```

```Core/Testing/pageValues.ts diff
@@ header @@
-// Per-page value fixtures for view and property suites: frontmatter keyed by the property NAME the file carries, …
+// Per-page value fixtures for view and property suites: frontmatter keyed by the property KEY the file carries, …
@@ propsAtRoot @@
-      return [d ? d.name : id, v]
+      return [d ? d.key : id, v]
```

```.claude/scripts/make-benchmark-nexus.mjs diff
@@ definition @@
-  const def = { id: p.id, name: p.name, type: p.type }
+  const def = { id: p.id, key: p.name, label: p.name, type: p.type }
```

**VERIFY**

- [ ] The listed tests pass.
- [ ] The typecheck passes with `name` gone from `propertyDefinitionFields`, so no typed read survives; `git grep -nP "\.name\b" -- Core/Properties Core/Nexus/page.ts Core/Trash Core/Matrix/matrixInput.ts | grep -iE "def|prior|current|\bd\.name|\bp\.name"` lists only `replaySchemaCascade.ts`' two delete-arm reads of `journal.name`, the record's field, which Task 6-3 renames.
- [ ] `git grep -nP '\bname"?: ' -- .claude/scripts/make-benchmark-nexus.mjs Core/Testing/fixtures` lists only the benchmark's own `TYPES` and `PROPS` fields, its Set names, and the view fixture's `"name": "Table"`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 5A-2

**TASK:** Check both words wherever a property's name is checked: the reserved-key refusal, nexus-wide uniqueness, and registry admission, which reads them through the one name gate, each read the label and the key without regard to case (D-1); and let a rename that leaves the key where it sits commit the label alone, with the renderer re-keying only when the key moved.

**NOW:** After Task 5A-1, `validateName(name, existing, excludeId)` (`Core/Properties/schema.ts:39-50`) refuses a reserved or empty word through `keyRefusal` (`:22-27`) and a folded clash among labels; `validateDefinition` (`:52-69`) and `renameProperty` (`registryProperty.ts:122,136`) call it with the label. Admission (`propertiesRegistry.ts:29-37`) restates the gate by hand, admitting the first definition per folded label whose label `keyRefusal` passes. `KEY_REFUSAL` holds no key clash (`properties.ts:263-270`), and `keyRefusal`'s doc (`schema.ts:21`) speaks of `name`. With keys equal to labels these already cover the key; a divergent stored key (C-2 INFERRED) escapes them: `{ label: 'My Banner', key: 'banner' }` is admitted. The create's step-aside over labels (`registryProperty.ts:53-56`) is Task 7A-2's, which writes it once with the Key Format. A rename whose new label equals the old key (`{ label: 'Status', key: 'status' }` renamed to `status`) runs `bothKeyHolders(root, 'status', 'status')`, which refuses whenever any file holds `status`, and its sweep would rename `status` to itself, which under `prefer-new` drops the pair (`Core/Files/pageFile.ts`' `renameFrontmatterKey`, as Phase 2A leaves it: `rival && collision === 'prefer-new'` splices `pair`). `PropertyFrame.tsx:237` bumps the values epoch on every rename.

**CHANGE**

- [ ] Write and watch fail: `schema.test.ts` *§validateName* takes `{ label, key }`: `{ label: 'stage', key: 'stage' }` beside `{ label: 'Stage', key: 'Stage' }` refuses `KEY_REFUSAL.duplicate('stage')`; `{ label: 'Stage', key: 'Stage' }` beside `{ label: 'Phase', key: 'stage' }` refuses `KEY_REFUSAL.duplicateKey('Stage')`; `{ label: 'My Banner', key: 'banner' }` refuses `KEY_REFUSAL.reserved('banner')` and `{ label: 'ID', key: 'x' }` refuses `KEY_REFUSAL.reserved('ID')`; `{ label: '---', key: '' }` refuses `KEY_REFUSAL.noKey`; the existing cases (`:16-47`) pass each word as both. `propertiesRegistry.test.ts:70` adds: of `{ label: 'A', key: 'x' }` and `{ label: 'B', key: 'X' }`, the second is unadmitted and rides through a write; `{ label: 'My Banner', key: 'banner' }` is unadmitted. `registryProperty.test.ts`: a rename of `{ label: 'Status', key: 'status' }` with a page holding `status: Open` to `status` writes the label `status`, leaves the journal slot empty, leaves the page byte-identical, and answers `{ from: 'status', to: 'status' }`. `PropertyFrame.test.tsx`: a rename answering `{ from: 'status', to: 'status' }` leaves `valuesEpoch` as it was; one answering `{ from: 'Stage', to: 'Phase' }` bumps it with that pair.
- [ ] `schema.ts`: `validateName(words, existing, excludeId)` takes `Pick<PropertyDefinition, 'label' | 'key'>`, refuses `keyRefusal(words.label)`, then an empty key (`KEY_REFUSAL.noKey`) or `keyRefusal(words.key)`, then a folded label clash (`KEY_REFUSAL.duplicate(label)`), then a folded key clash (`KEY_REFUSAL.duplicateKey(key)`); its doc says it checks both words; `validateDefinition` passes `def`; `keyRefusal`'s doc names a label or a key.
- [ ] `properties.ts`: `KEY_REFUSAL.duplicateKey(key)` reads `A property already writes "{key}" to files.`, and `KEY_REFUSAL.noKey` reads `Properties cannot contain an invalid name.`
- [ ] `propertiesRegistry.ts`: admission admits a definition when `validateName` passes it against the definitions already admitted, its comment saying the first to hold a label or a key in any casing is the one admitted; the `keyRefusal` and `normalizeTitle` imports go.
- [ ] `registryProperty.ts`: `renameProperty` validates `{ label: to, key: to }`, refuses on clashes only when `to !== prior.key`, sweeps only when the committed `from` differs from `def.key`, and answers `{ from, to: def.key }`.
- [ ] `PropertyFrame.tsx:237`: `bumpValuesEpoch` runs only when `res.value.from !== res.value.to`.

**AFTER**

```Core/Properties/schema.ts diff
@@ validateName @@
-/** The whole name gate: an admissible key, unique nexus-wide, compared case-folded because the name is the on-disk key. */
+/** The whole name gate: neither word a key Pommora manages, the label unique among labels and the key among keys nexus-wide, each compared case-folded. */
 export function validateName(
-  name: string,
+  { label, key }: Pick<PropertyDefinition, 'label' | 'key'>,
   existing: PropertyDefinition[],
   excludeId?: string,
 ): Result<null> {
-  const refusal = keyRefusal(name)
+  const refusal = keyRefusal(label) ?? (normalizeTitle(key) ? keyRefusal(key) : KEY_REFUSAL.noKey)
   if (refusal) return fail('invalid-property', refusal)
-  const folded = normalizeTitle(name)
-  const clash = existing.some((d) => d.id !== excludeId && normalizeTitle(d.label) === folded)
-  if (clash) return fail('invalid-property', KEY_REFUSAL.duplicate(name))
+  const others = existing.filter((d) => d.id !== excludeId)
+  const holds = (word: string, of: (d: PropertyDefinition) => string): boolean =>
+    others.some((d) => normalizeTitle(of(d)) === normalizeTitle(word))
+  if (holds(label, (d) => d.label)) return fail('invalid-property', KEY_REFUSAL.duplicate(label))
+  if (holds(key, (d) => d.key)) return fail('invalid-property', KEY_REFUSAL.duplicateKey(key))
   return ok(null)
 }
@@ validateDefinition @@
-  const nameCheck = validateName(def.label, existing, def.id)
+  const nameCheck = validateName(def, existing, def.id)
@@ keyRefusal @@
-/** Why `name` can't be a property's on-disk key — empty, a key Pommora manages in any casing, or a name every object already answers to — or null when it can. */
+/** Why a word can't be a property's label or key — empty, a key Pommora manages in any casing, or a name every object already answers to — or null when it can. */
```

```Core/Properties/properties.ts diff
@@ KEY_REFUSAL @@
   duplicate: (name: string) => `A property named "${name}" already exists.`,
+  duplicateKey: (key: string) => `A property already writes "${key}" to files.`,
+  noKey: 'Properties cannot contain an invalid name.',
```

```Core/Properties/propertiesRegistry.ts diff
@@ imports @@
-import { keyRefusal, withUniqueOptions } from './schema'
-import { normalizeTitle } from '../Paths/caseFold'
+import { validateName, withUniqueOptions } from './schema'
@@ normalizeRegistry @@
-  const names = new Set<string>()
   for (const [id, value] of Object.entries(rawDefs)) {
     const parsed = propertyDefinition.safeParse(value)
-    const name = parsed.success ? normalizeTitle(parsed.data.label) : ''
-    // A name is one key on disk, so the first definition to hold it in any casing is the one admitted.
-    if (parsed.success && keyRefusal(parsed.data.label) === null && !names.has(name)) {
-      names.add(name)
-      defs[id] = withUniqueOptions(parsed.data)
-    }
+    // The first definition to hold a label or a key in any casing is the one admitted.
+    if (parsed.success && validateName(parsed.data, Object.values(defs)).ok)
+      defs[id] = withUniqueOptions(parsed.data)
```

```Core/Properties/registryProperty.ts diff
@@ renameProperty @@
     if (to === prior.label) return ok(null)
-    const named = validateName(to, Object.values(defs), propertyId)
+    const named = validateName({ label: to, key: to }, Object.values(defs), propertyId)
     if (!named.ok) return named
     // A file holding only the new key is adopted, its value going live as a create's would; one holding both would lose its old value.
-    const clashes = await bothKeyHolders(root, prior.key, to)
+    const clashes = to === prior.key ? [] : await bothKeyHolders(root, prior.key, to)
     …
-        const v = validateName(to, Object.values(registry.defs), propertyId)
+        const v = validateName({ label: to, key: to }, Object.values(registry.defs), propertyId)
     …
     const { from, def } = edit.value
-    const skipped = await renameSweep(root, from, def)
+    const skipped = from === def.key ? 0 : await renameSweep(root, from, def)
     if (!skipped) await clearSchemaJournal(root, record)
-    return ok({ from, to, ...schemaCascade({ skipped, hosts: [] }, record) })
+    return ok({ from, to: def.key, ...schemaCascade({ skipped, hosts: [] }, record) })
```

```Core/Properties/Schema/PropertyFrame.tsx diff
@@ rename @@
     if (!reportRefusal(res) || !res.value) return
-    bumpValuesEpoch(res.value.from, res.value.to)
+    if (res.value.from !== res.value.to) bumpValuesEpoch(res.value.from, res.value.to)
     retryOwed(res.value)
```

**VERIFY**

- [ ] The listed tests pass; `registryProperty.test.ts:178-196` (a rename onto a key a file holds beside the old one refuses) passes unchanged.
- [ ] `git grep -n "validateName(" -- Core` shows every call passing both words.
- [ ] Run the gates, then `view-delta` for Phase 5A.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, reading outward: no production read of a definition's `name` remains, and each former read reads the word its role names (a frontmatter or sidecar key reads `key`; a title, menu, notice, or dialog reads `label`); a decoded definition always holds both words and a stored one omitting `label` reads its key; `byKey`'s six callers and `linkKeysOf` key by `key`; every create writes `key` from the landed label, the restore's stale key included; the rename journal, reply, and refusal name keys, and a rename keeping its key journals, sweeps, and re-keys nothing; reserved keys, uniqueness, and admission each read both words through `validateName`; the benchmark script and `Core/Testing` write the new shape.

### Phase 5B — Options Carry a Key and a Label

**GOAL:** Every option stores a `key`, the word on disk, and a `label`, its title in the app, in place of `value` (C-1, C-2), and the leftover-label strip leaves (C-3). A decoded Select, Status, or Multi-Select value holds labels, so every display, filter, sort, group, and saved reference keeps naming options by label (F-2), and `encodeValue(def, value)` writes each label's key. Adoption subtracts registered keys and the folded labels and keys of every option (E-1, D-2). The renderer names an option by label everywhere, and the host resolves the label to the option and its key at every option channel. Option labels and keys are each unique without regard to case and non-blank (D-2), and a Status's options are checked at create (J-1). Its last task rewrites both registries once at a Stop, after the new decoders land, and opens both Nexuses on the new build.

#### Task 5B-1

**TASK:** Delete the leftover-label strip, replace the option's `value` with `key` and `label`, rename `optionValues` to `optionLabels`, give the host and the renderer one `findOption` in `properties.ts`, and move every option read to the word its role names: the renderer reads labels, the decode map reads keys and yields labels, the registry ops find an option by label, and the cascades and replay act on keys.

**NOW:** `selectOption` and `statusOption` hold `value: z.string()` (`Core/Properties/properties.ts:133-156`); `stored()` strips a leftover option `label` on every option write (`:308-311`), through `withOptionGroups` (`:313-321`). `optionValues` (`:294-296`) has callers needing keys (the replay arms, `Core/Properties/replaySchemaCascade.ts:77,87`; the decode map, `Core/Properties/propertyValue.ts:52`, as Phase 3's `wordsOf`; `unregisteredMembers`' fold set, Phase 3) and labels (`Core/Views/Pipeline/group.ts:199,219`; `Core/Views/Pipeline/sort.ts:87`; the registry ops, which match what the renderer names: `Core/Properties/optionOps.ts:63,179,235`). Seeds write `{ value }` (`properties.ts:323-348`); `addOption` mints `{ value: title }` and `renameOption` sets `value` (`Core/Properties/optionModel.ts:25-45`); `mapOption`, `withField`, and `moveOption` match `o.value` (`:5-23,47-62`); `OptionEdit`'s `recolor`, `icon`, `appearance`, and `move` name an option as `value` (`:64-75`), beside `relabelGroup`'s group `label`. `dropOptionFromDef` filters `o.value` (`optionOps.ts:152-168`); `resolveForCascade` (`:170-181`) answers the definition. The renderer reads an option's `value` as both its title and its identity: `OptionChipData.value` (`Core/Properties/Cells/OptionChip.tsx:8-13,26-28,47`), `findOption` (`Core/Properties/Cells/cellResolve.ts:3-4`) and its fallbacks (`Core/Properties/Cells/Cell.tsx:71,85`; `Core/Views/Bands/bandModel.ts:81`; `Core/Views/Settings/FilterFrame.tsx:179`), `pickGroups` (`Core/Properties/Pickers/PropertyPicker.tsx:73`, which fills `label: o.value`), `OptionEditor.tsx:62,99-112`, `OptionRow.tsx:32,33,43,53`, `OptionEditPopup.tsx:70`, `useOptionEdit.tsx:69,76,126-137,149-170`, `Core/Views/Settings/GroupFrame.tsx:375,392,394,415-420`, and `Core/Views/Settings/OptionOrderList.tsx:54,71`. A `PickOption` keeps `{ value, label }` (`properties.ts:284`), its `value` what a pick writes; Context pick options hold a Space id and title (`Core/Contexts/contextOptions.ts:27-37`). The option channels take the option's word (`Core/Contract/bridge.ts:170-180`).

**CHANGE**

- [ ] Write and watch fail: `properties.test.ts` — a stored option `{ key: 'a' }` reads `{ key: 'a', label: 'a' }`, and `withOptionGroups` keeps an option's `label` through a write (it was stripped); `:253`'s Status seed asserts each option's `key` and `label` equal its group label. `optionModel.test.ts` — `addOption(groups, 'upcoming', 'Triage', 0)` mints `{ key: 'Triage', label: 'Triage', group_id: 'upcoming' }`; `renameOption(groups, 'A', 'Z')` sets both words; `applyOptionEdit` names options by `option`. `optionOps.test.ts` — a new case: under `{ key: 'urgent', label: 'Urgent' }`, `clearOption(root, id, 'Urgent')` strips a page's `urgent` and leaves `Urgent` as written; a new case: a stored Select holding `[{ key: 'a' }, { key: 'b' }, { key: 'c', label: 'C' }]`, edited with `{ op: 'recolor', option: 'C', color: 'red' }`, stores all three options, `a` and `b` gaining their labels; `renameOption(root, id, 'Gone', 'X')` refuses `NO_OPTION`; the describe *§an option write drops a stored label* (`:349-401`) goes, its subject leaving with `stored()` (C-3), and a new case in its place: a rename of one option keeps every option's stored `label`. `OptionEditor.test.tsx` — the edits it expects name the option as `option` (`:244,247,257,273,296,315,335,346,394,470,480,504`).
- [ ] The fixture rename, assertions unchanged: every option literal `{ value: X, … }` becomes `{ key: X, label: X, … }`; every `OptionChipData` literal's `value` becomes `label`; every `OptionEdit` literal's `value` becomes `option`; a `.map((o) => o.value)` over a definition's options reads `o.label` (each asserts option titles). `PickOption` literals keep `value`. The typecheck finds the typed sites; the ledger (HEAD lines):
  - **Typed literals:** `contextResolve.test.ts:85,91,97,251`; `contextWrite.test.ts:255`; `propertyMenuActions.test.ts:21,27,151,159,160`; `matrixInput.test.ts:137`; `configReach.test.ts:27,33`; `Cell.test.tsx:29,35,41`; `OptionChip.test.tsx:14,20,26`; `cellResolve.test.ts:10` (the case moving into `properties.test.ts`); `PropertyPicker.pane.test.tsx:24`; `PropertyPanel.test.tsx:22`; `OptionEditor.test.tsx:23,33,34,202,304,311,325,329,354,361,439,440,444`; `assignValue.test.ts:17`; `assignment.test.ts:97,130`; `cascadeRace.test.ts:45`; `deleteProperty.test.ts:75,131,158,185,223,314`; `governedWorldWrite.test.ts:49`; `governedWrite.test.ts:89,95,153,173`; `handlers.test.ts:59`; `journalWiring.test.ts:191`; `keyHolders.test.ts:41`; `optionModel.test.ts:16,22,35`; `optionOps.test.ts:79,87,94,108,137,144,174,189,203,426,441,446,468,476,488,504,535,551,582,596,617,627,634,644,654,720`; `propertiesRegistry.test.ts:27`; `propertyValue.test.ts:26,27,35,66,114,194,438,441`; `removeProperty.test.ts:48,54,304,343-345,366`; `repairSweep.test.ts:53`; `replaySchemaCascade.test.ts:49,265,339,369`; `schema.test.ts:77`; `setSpaceProperty.test.ts:109`; `value.test.ts:18,22,27,264`; `Core/Testing/viewHarness.tsx:67,73`; `restoreProperty.test.ts:51,52,179,363`; `GroupBand.test.tsx:28,36`; `bandRouter.test.ts:27,33,34,37`; `cardValueInput.test.ts:77`; `useViewHost.test.tsx:42,173-175`; `filter.test.ts:20,21`; `group.test.ts:79,80,87,93,494`; `resolveView.test.ts:137,270,458,681`; `sort.test.ts:15,26,32,38,142,148,171,178,179`; `FilterFrame.test.tsx:24,25`; `GroupFrame.test.tsx:25,370,376`; `OptionOrderList.test.tsx:22,34,40,46,88,94`; `SortFrame.test.tsx:24,25`; `bandCommits.test.tsx:28,34,40`; `cellGestures.test.tsx:26,32,38,50`; `manualOrderDrops.test.tsx:25`; `viewWrite.test.tsx:26`.
  - **Untyped:** `writeGate.test.ts:63` and its `recolor` edit (`:150`, `option: 'A'`); `Nexus/handlers.test.ts:185,202`; `readNexus.test.ts:198,834`; `settle.test.ts:823,832,865` (`:865` expects `[{ key: 'alpha', label: 'alpha', color: 'blue' }, { key: 'Ideas', label: 'Ideas' }]`); `OptionChip.test.tsx:33-45`; `cellResolve.test.ts:16` (the case moving into `properties.test.ts`, expecting `{ key: 'opt_a', label: 'opt_a', color: 'green' }`); `OptionEditor.test.tsx:285,357`; `optionModel.test.ts:92,93,101,127,145`; `optionOps.test.ts:90,100,140,146,153,154,177,183,196,211,219-221,229-231,234,236,275,279,283,304-306,308,321-323,325,342,344,352,364,365,377,383,394,396,397,431,472,540,567,587`; `properties.test.ts:224,240,266,273`; `propertiesRegistry.test.ts:72`; `replaySchemaCascade.test.ts:409`; `schema.test.ts:103,104,109,110`; `value.test.ts:213`; `Core/Testing/fixtures/registry.json:12,13,20,26`; `restoreScrub.test.ts:82,83,264,284,285,305,313`; `spend.test.ts:1693,1740`; `trashRecovery.test.ts:77`.
  - **Reads:** `contextWrite.test.ts:269`, `handlers.test.ts:358`, `journalWiring.test.ts:232,261`, `optionModel.test.ts:30,116,118,120`, `optionOps.test.ts:74,789,828`, `properties.test.ts:226,242,253`, `propertiesRegistry.test.ts:83`, `removeProperty.test.ts:381`, `setSpaceProperty.test.ts:145`, `restoreProperty.test.ts:377` read `o.label`.
- [ ] `properties.ts`: delete `stored()` and its two uses in `withOptionGroups`; the options' `value` goes, and each holds `key: z.string()` and `label: z.string().optional()`, decoding through `labelled` (Task 5A-1); `optionValues` becomes `optionLabels`; `findOption(def, label)` moves here from `Core/Properties/Cells/cellResolve.ts`, which goes, its test case (`cellResolve.test.ts`) moving into `properties.test.ts`; the Status seed writes `key` and `label` per option; `defaultSelectSeed` returns `SelectOption[]` holding `{ key: 'Option 1', label: 'Option 1' }`.
- [ ] `optionModel.ts`: `mapOption`, `withField`, and `moveOption` match `o.label`; `addOption` mints `{ key: title, label: title, group_id }`; `renameOption(groups, label, to)` writes `label: to, key: to`; `OptionEdit`'s option-naming field is `option`, the label (`relabelGroup` keeps its group `label`).
- [ ] `optionOps.ts`: `editStoredOptions` reads each stored option through `labelled` (exported from `properties.ts`) before `withUniqueOptions` dedupes them, so an option a registry stores without a `label` (C-3's standing rule) keeps its place and matches by its key's label in every edit; `admitOptionEdit` reads `'option' in e` through `findOption`; `resolveForCascade(root, propertyId, label)` answers `{ def, key }` of the option `findOption` finds; `renameOption` resolves first, journals `{ from: key, to: newLabel }`, checks the label inside the commit through `findOption`, and cascades by key; `clearOption`, `optionHolders`, and `removeOption` cascade the resolved key, and `removeOption` journals and drops it; `dropOptionFromDef(root, propertyId, key)` filters `o.key`.
- [ ] `schema.ts`: `withUniqueOptions` (`:76,79`) folds `o.label`, and `validateOptionValues` (`:85-86`) takes `{ key: string; label: string }[]` and folds `o.label` (Task 5B-3 adds the key).
- [ ] `replaySchemaCascade.ts:77,87` read the definition's keys through `optionsOf(def)`. `group.ts:199,219` and `sort.ts:87`: `optionLabels`. `propertyValue.ts`: Phase 3's `wordsOf` maps `exactTitle(o.key)` to `o.label` and folds each label, over `optionsOf(def)` (Task 5B-2 adds the keys).
- [ ] The renderer: `OptionChipData.value` becomes `label`, and each read in the NOW list reads `.label`; `pickGroups` builds `{ ...o, value: o.label }`; `useOptionEdit`'s edits send `option`; `Cell.tsx` and `bandModel.ts` import `findOption` from `properties.ts`, and its fallbacks build `{ label }`.
- [ ] `bridge.ts:170-180`: `property:renameOption` takes `[propertyId, oldLabel, newLabel]`, and `removeOption`, `clearOption`, and `holders` take `label`; `handlers.ts`' `idOldNew` (`:113-116`) names its arguments `oldLabel` and `newLabel`, and `NEEDS_RENAME_ARGS` (`:36`) reads `'propertyId, oldLabel, and newLabel are required.'`.
- [ ] `.claude/scripts/make-benchmark-nexus.mjs:148,154`: options write `{ key: value, label: value }`.

**AFTER**

```Core/Properties/properties.ts diff
@@ selectOption @@
 const selectOption = looseDecoder(
   z.object({
-    value: z.string(),
+    key: z.string(),
+    label: z.string().optional(),
     icon: z.string().optional().catch(undefined),
     …
   }),
-)
+).transform(labelled)
@@ statusOption @@
 const statusOption = looseDecoder(
   z.object({
-    value: z.string(),
+    key: z.string(),
+    label: z.string().optional(),
     …
     group_id: statusGroupId,
   }),
-)
+).transform(labelled)
@@ optionValues @@
-export const optionValues = (
+export const optionLabels = (
   def: Pick<PropertyDefinition, 'type' | 'status_groups' | 'select_options'>,
-): string[] => optionsOf(def).map((o) => o.value)
+): string[] => optionsOf(def).map((o) => o.label)
+
+export const findOption = (def: PropertyDefinition | undefined, label: string) =>
+  optionsOf(def).find((o) => o.label === label)
@@ stored @@
-const stored = <O extends object>({
-  label: _stale,
-  ...o
-}: O & { label?: string }): Omit<O, 'label'> => o
-
 export function withOptionGroups(
   def: PropertyDefinition,
   groups: StatusGroup[],
 ): PropertyDefinition {
   if (PROPERTY_TYPES[def.type].options === 'status')
-    return { ...def, status_groups: groups.map((g) => ({ ...g, options: g.options.map(stored) })) }
-  const select_options = (groups[0]?.options ?? []).map(({ group_id: _drop, ...o }) => stored(o))
+    return { ...def, status_groups: groups }
+  const select_options = (groups[0]?.options ?? []).map(({ group_id: _drop, ...o }) => o)
   return { ...def, select_options }
 }
@@ defaultStatusSeed @@
-      options: [{ value: 'Open', color: 'grey', group_id: 'upcoming' }],
+      options: [{ key: 'Open', label: 'Open', color: 'grey', group_id: 'upcoming' }],
   …
-      options: [{ value: 'Active', color: 'blue', group_id: 'in_progress' }],
+      options: [{ key: 'Active', label: 'Active', color: 'blue', group_id: 'in_progress' }],
   …
-      options: [{ value: 'Done', color: 'green', group_id: 'done' }],
+      options: [{ key: 'Done', label: 'Done', color: 'green', group_id: 'done' }],
@@ defaultSelectSeed @@
-export function defaultSelectSeed(): { value: string }[] {
-  return [{ value: 'Option 1' }]
+export function defaultSelectSeed(): SelectOption[] {
+  return [{ key: 'Option 1', label: 'Option 1' }]
 }
```

```Core/Properties/optionModel.ts diff
@@ mapOption @@
 function mapOption(
   groups: StatusGroup[],
-  value: string,
+  label: string,
   fn: (o: StatusOption) => StatusOption,
 ): StatusGroup[] {
   return groups.map((g) => ({
     ...g,
-    options: g.options.map((o) => (o.value === value ? fn(o) : o)),
+    options: g.options.map((o) => (o.label === label ? fn(o) : o)),
   }))
 }
@@ withField @@
-function withField<T extends { value: string }, K extends keyof T>(
+function withField<T extends { label: string }, K extends keyof T>(
@@ addOption @@
-    const next = { value: title, group_id: g.id }
+    const next = { key: title, label: title, group_id: g.id }
@@ renameOption @@
 export function renameOption(
   groups: StatusGroup[],
-  oldValue: string,
-  newTitle: string,
+  label: string,
+  to: string,
 ): StatusGroup[] {
-  return mapOption(groups, oldValue, (o) => ({ ...o, value: newTitle }))
+  return mapOption(groups, label, (o) => ({ ...o, label: to, key: to }))
 }
@@ moveOption @@
 export function moveOption(
   groups: StatusGroup[],
-  value: string,
+  label: string,
   toGroupId: string,
   toIndex: number,
 ): StatusGroup[] {
-  const moved = groups.flatMap((g) => g.options).find((o) => o.value === value)
+  const moved = groups.flatMap((g) => g.options).find((o) => o.label === label)
   …
-    const without = g.options.filter((o) => o.value !== value)
+    const without = g.options.filter((o) => o.label !== label)
@@ optionEdit @@
-const value = z.string()
+const option = z.string()
 const groupId = z.string()
 
 export const optionEdit = z.discriminatedUnion('op', [
   op('add', { groupId, title: z.string(), atIndex: index.optional() }),
-  op('recolor', { value, color: z.string().optional() }),
-  op('icon', { value, icon: z.string().optional() }),
-  op('appearance', { value, appearance: optionAppearance }),
-  op('move', { value, groupId, toIndex: index }),
+  op('recolor', { option, color: z.string().optional() }),
+  op('icon', { option, icon: z.string().optional() }),
+  op('appearance', { option, appearance: optionAppearance }),
+  op('move', { option, groupId, toIndex: index }),
   op('relabelGroup', { groupId, label: z.string() }),
 ])
@@ applyOptionEdit @@
     case 'recolor':
-      return mapOption(groups, e.value, (o) => withField(o, 'color', e.color))
+      return mapOption(groups, e.option, (o) => withField(o, 'color', e.color))
   … likewise `e.option` in `icon`, `appearance`, and `move`
```

```Core/Properties/optionOps.ts diff
@@ editStoredOptions @@
-  const raw = withUniqueOptions({ ...(stored as PropertyDefinition), type: def.type })
-  return withOptionGroups(def, edit(optionGroupsOf(raw)))
+  const raw = { ...(stored as PropertyDefinition), type: def.type }
+  const named = optionGroupsOf(raw).map((g) => ({ ...g, options: g.options.map(labelled) }))
+  const unique = withUniqueOptions(withOptionGroups(raw, named))
+  return withOptionGroups(def, edit(optionGroupsOf(unique)))
@@ imports @@
 import {
+  findOption,
+  labelled,
   optionGroupsOf,
   optionsOf,
-  optionValues,
   PROPERTY_TYPES,
@@ admitOptionEdit @@
-  if ('value' in e && !optionValues(def).includes(e.value)) return NO_OPTION
+  if ('option' in e && !findOption(def, e.option)) return NO_OPTION
@@ dropOptionFromDef @@
 export function dropOptionFromDef(
   root: string,
   propertyId: string,
-  value: string,
+  key: string,
 ): Promise<Result<null>> {
   …
-      groups.map((g) => ({ ...g, options: g.options.filter((o) => o.value !== value) })),
+      groups.map((g) => ({ ...g, options: g.options.filter((o) => o.key !== key) })),
@@ resolveForCascade @@
 async function resolveForCascade(
   root: string,
   propertyId: string,
-  value: string,
-): Promise<Result<PropertyDefinition>> {
+  label: string,
+): Promise<Result<{ def: PropertyDefinition; key: string }>> {
   const def = (await readRegistry(root)).defs[propertyId]
   if (!def) return NO_PROPERTY
   const typeCheck = requireOptions(def)
   if (!typeCheck.ok) return typeCheck
-  if (!optionValues(def).includes(value)) return NO_OPTION
-  return ok(def)
+  const option = findOption(def, label)
+  return option ? ok({ def, key: option.key }) : NO_OPTION
 }
@@ renameOption @@
 export function renameOption(
   root: string,
   propertyId: string,
-  oldValue: string,
-  newTitle: string,
+  oldLabel: string,
+  newLabel: string,
 ): Promise<Result<SchemaCascade>> {
   return serializeSchemaOp(root, async () => {
+    const r = await resolveForCascade(root, propertyId, oldLabel)
+    if (!r.ok) return r
     const record: SchemaJournal = {
       op: 'option-rename',
       id: propertyId,
-      from: oldValue,
-      to: newTitle,
+      from: r.value.key,
+      to: newLabel,
     }
     // Staged BEFORE the commit: a crash between commit and cascade is recoverable only from this record, and one stranded by a refusal is disposed of by the replay's holds-to-and-not-from gate.
-    if ((await readRegistry(root)).defs[propertyId]) await writeSchemaJournal(root, record)
+    await writeSchemaJournal(root, record)
     const edit = await mutateRegistry<Result<PropertyDefinition>>(root, (registry, stored) => {
       …
-      if (!optionValues(def).includes(oldValue)) return { result: NO_OPTION }
+      if (!findOption(def, oldLabel)) return { result: NO_OPTION }
       const next = editStoredOptions(def, stored[propertyId], (groups) =>
-        renameInGroups(groups, oldValue, newTitle),
+        renameInGroups(groups, oldLabel, newLabel),
       )
     …
-    const reach = await optionCascade(root, edit.value, oldValue, { op: 'replace', to: newTitle })
+    const reach = await optionCascade(root, edit.value, record.from, { op: 'replace', to: record.to })
@@ clearOption @@
-    const skipped = await valueEditSweep(root, r.value, value, { op: 'strip' })
+    const skipped = await valueEditSweep(root, r.value.def, r.value.key, { op: 'strip' })
@@ optionHolders @@
-  const { pages, plan } = await valueEditPlan(root, r.value, value, { op: 'strip' })
+  const { pages, plan } = await valueEditPlan(root, r.value.def, r.value.key, { op: 'strip' })
@@ removeOption @@
     const r = await resolveForCascade(root, propertyId, value)
     if (!r.ok) return r
-    const record: SchemaJournal = { op: 'option-remove', id: propertyId, value }
+    const { def, key } = r.value
+    const record: SchemaJournal = { op: 'option-remove', id: propertyId, value: key }
     const journaled = await writeSchemaJournal(root, record)
-    const reach = await optionCascade(root, r.value, value, { op: 'strip' })
+    const reach = await optionCascade(root, def, key, { op: 'strip' })
     if (!reach.skipped) {
-      const dropped = await dropOptionFromDef(root, propertyId, value)
+      const dropped = await dropOptionFromDef(root, propertyId, key)
```

`clearOption`, `optionHolders`, and `removeOption` rename their `value` parameter to `label`.

```Core/Properties/replaySchemaCascade.ts diff
@@ imports @@
-import { optionValues } from './properties'
+import { optionsOf } from './properties'
@@ option-rename @@
-      const values = optionValues(def)
+      const keys = optionsOf(def).map((o) => o.key)
       // Holds `to` and not `from` = the commit landed cleanly; every other state is not this record's.
-      if (!values.includes(journal.to) || values.includes(journal.from)) return NO_REACH
+      if (!keys.includes(journal.to) || keys.includes(journal.from)) return NO_REACH
@@ option-remove @@
-      if (!optionValues(def).includes(journal.value)) return NO_REACH
+      if (!optionsOf(def).some((o) => o.key === journal.value)) return NO_REACH
```

```Core/Properties/propertyValue.ts diff
@@ imports @@
 import {
   firstPerTitle,
-  optionValues,
+  optionsOf,
   PROPERTY_TYPES,
@@ wordsOf @@
-    const values = optionValues(def)
-    words = {
-      labelOf: new Map(values.map((v) => [exactTitle(v), v])),
-      folds: new Set(values.map(normalizeTitle)),
-    }
+    const options = optionsOf(def)
+    words = {
+      labelOf: new Map(options.map((o) => [exactTitle(o.key), o.label])),
+      folds: new Set(options.map((o) => normalizeTitle(o.label))),
+    }
@@ registeredOption @@
-/** The option `written` names, as its definition spells it. */
+/** The label of the option whose key `written` names. */
```

```Core/Views/Pipeline/group.ts diff
-import { groupable, optionValues, type PropertyDefinition } from '../../Properties/properties'
+import { groupable, optionLabels, type PropertyDefinition } from '../../Properties/properties'
@@ schemaOptionOrder @@
-  const values = optionValues(def)
+  const values = optionLabels(def)
@@ liveBucketOrder @@
-  return bucketOrder(config, def, new Set([...(def ? optionValues(def) : []), ...present]))
+  return bucketOrder(config, def, new Set([...(def ? optionLabels(def) : []), ...present]))
```

```Core/Views/Pipeline/sort.ts diff
-  optionValues,
+  optionLabels,
@@ select @@
-      const tail = (def ? optionValues(def) : []).filter((v) => !listed.has(v))
+      const tail = (def ? optionLabels(def) : []).filter((v) => !listed.has(v))
```

```Core/Properties/Cells/OptionChip.tsx diff
@@ OptionChipData @@
 export interface OptionChipData {
-  value: string
+  label: string
@@ optionGlyph @@
-  const value = option?.value ?? ''
-  const group = def?.status_groups?.find((g) => g.options.some((o) => o.value === value))
+  const label = option?.label ?? ''
+  const group = def?.status_groups?.find((g) => g.options.some((o) => o.label === label))
@@ OptionChip @@
-  const value = option?.value ?? ''
+  const label = option?.label ?? ''
   …
-        : { text: value })}
+        : { text: label })}
```

```Core/Properties/Cells/cellResolve.ts diff
-import { optionsOf, type PropertyDefinition } from '../properties'
-
-export const findOption = (def: PropertyDefinition | undefined, value: string) =>
-  optionsOf(def).find((o) => o.value === value)
```

```Core/Properties/Pickers/PropertyPicker.tsx diff
@@ pickGroups @@
-        .map((g) => ({ id: g.id, options: groupOptions(g).map((o) => ({ ...o, label: o.value })) }))
+        .map((g) => ({ id: g.id, options: groupOptions(g).map((o) => ({ ...o, value: o.label })) }))
```

```Core/Properties/Schema/useOptionEdit.tsx diff
@@ OptionEditApi @@
-  moves: (groups: readonly { id: string; options: readonly { value: string }[] }[]) => {
+  moves: (groups: readonly { id: string; options: readonly { label: string }[] }[]) => {
@@ useOptionEdit @@
   const keys = useRenameKeys(
-    options.map((o) => o.value),
+    options.map((o) => o.label),
     editing?.value,
   )
   …
-  const enteringKey = useEntrance(options, (o) => keyOf(o.value))
+  const enteringKey = useEntrance(options, (o) => keyOf(o.label))
@@ moves @@
-      const laneOf = new Map(groups.flatMap((g) => g.options.map((o) => [o.value, g.id] as const)))
+      const laneOf = new Map(groups.flatMap((g) => g.options.map((o) => [o.label, g.id] as const)))
   …
-      void editOption({ op: 'move', value, groupId: slot.lane, toIndex: slot.index }),
+      void editOption({ op: 'move', option: value, groupId: slot.lane, toIndex: slot.index }),
   …
-        option={options.find((o) => o.value === value)}
+        option={options.find((o) => o.label === value)}
@@ drafted, option @@
-  const drafted = draft && !options.some((o) => keyOf(o.value) === draft.key) ? draft : null
+  const drafted = draft && !options.some((o) => keyOf(o.label) === draft.key) ? draft : null
-  const option = editing && options.find((o) => keyOf(o.value) === keyOf(editing.row))
+  const option = editing && options.find((o) => keyOf(o.label) === keyOf(editing.row))
@@ popup @@
-      option={{ ...held.option, value: held.value }}
+      option={{ ...held.option, label: held.value }}
   …
-      onPickIcon={(icon) => void editOption({ op: 'icon', value: held.value, icon })}
-      onPickColor={(color) => void editOption({ op: 'recolor', value: held.value, color })}
+      onPickIcon={(icon) => void editOption({ op: 'icon', option: held.value, icon })}
+      onPickColor={(color) => void editOption({ op: 'recolor', option: held.value, color })}
       onPickAppearance={(appearance) =>
-        void editOption({ op: 'appearance', value: held.value, appearance })
+        void editOption({ op: 'appearance', option: held.value, appearance })
```

```Core/Properties/Schema/OptionEditor.tsx diff
-        label: (value) => (options.some((o) => o.value === value) ? value : headingOf(value)),
+        label: (value) => (options.some((o) => o.label === value) ? value : headingOf(value)),
   …
-              <Fragment key={edit.keyOf(o.value)}>
-                <Reveal open enterOnMount={edit.entering(o.value)} fill>
+              <Fragment key={edit.keyOf(o.label)}>
+                <Reveal open enterOnMount={edit.entering(o.label)} fill>
   … and `o.label` at `:106`, `:108`, `:109`, `:112`
```

```Core/Properties/Schema/OptionRow.tsx diff
-      id={option.value}
-      {...ghostAnchorProps(ghost, option.value)}
+      id={option.label}
+      {...ghostAnchorProps(ghost, option.label)}
   …
-        {look === 'compact' && <span className={compactTitle}>{option.value}</span>}
+        {look === 'compact' && <span className={compactTitle}>{option.label}</span>}
   …
-        onClick={() => onToggleEditing(rowEl(option.value))}
+        onClick={() => onToggleEditing(rowEl(option.label))}
```

```Core/Properties/Schema/OptionEditPopup.tsx diff
-              initial={option.value}
+              initial={option.label}
```

```Core/Properties/Cells/Cell.tsx diff
-import { findOption } from './cellResolve'
+import { findOption } from '../properties'
   …
-            option={opt ?? { value: v.value }}
+            option={opt ?? { label: v.value }}
   …
-              option={findOption(def, val) ?? { value: val }}
+              option={findOption(def, val) ?? { label: val }}
```

```Core/Views/Bands/bandModel.ts diff
-import type { PropertyDefinition } from '../../Properties/properties'
-import { findOption } from '../../Properties/Cells/cellResolve'
+import { findOption, type PropertyDefinition } from '../../Properties/properties'
   …
-              option: findOption(def, value) ?? { value },
+              option: findOption(def, value) ?? { label: value },
```

```Core/Views/Settings/FilterFrame.tsx diff
-                  option={o ?? { value: v }}
+                  option={o ?? { label: v }}
```

```Core/Views/Settings/GroupFrame.tsx diff
-    const byValue = new Map(optionsOf(subDef).map((o) => [o.value, o]))
+    const byValue = new Map(optionsOf(subDef).map((o) => [o.label, o]))
   …
-                  key: subGroupKey(id, o.value),
+                  key: subGroupKey(id, o.label),
                   kind: 'bucket',
-                  value: o.value,
+                  value: o.label,
   … and `o.label` at `:415`, `:416`, `:417`, `:420` (both arguments)
```

```Core/Views/Settings/OptionOrderList.tsx diff
-    const values = g.options.map((o) => o.value)
+    const values = g.options.map((o) => o.label)
   …
-  const byValue = new Map(optionsOf(def).map((o) => [o.value, o]))
+  const byValue = new Map(optionsOf(def).map((o) => [o.label, o]))
```

```Core/Contract/bridge.ts diff
   'property:renameOption': {
-    args: [propertyId: string, oldValue: string, newTitle: string]
+    args: [propertyId: string, oldLabel: string, newLabel: string]
   …
   'property:removeOption': {
-    args: [propertyId: string, value: string]
+    args: [propertyId: string, label: string]
   …
-  'property:clearOption': { args: [propertyId: string, value: string]; reply: Result<null> }
-  'property:holders': { args: [propertyId: string, value?: string]; reply: Result<number> }
+  'property:clearOption': { args: [propertyId: string, label: string]; reply: Result<null> }
+  'property:holders': { args: [propertyId: string, label?: string]; reply: Result<number> }
```

```.claude/scripts/make-benchmark-nexus.mjs diff
@@ definition @@
-  if (p.type === 'select' || p.type === 'multiSelect') def.select_options = p.options.map((value) => ({ value }))
+  if (p.type === 'select' || p.type === 'multiSelect') def.select_options = p.options.map((value) => ({ key: value, label: value }))
   …
-        .map((value) => ({ value, color: g.color, group_id: g.id })),
+        .map((value) => ({ key: value, label: value, color: g.color, group_id: g.id })),
```

**VERIFY**

- [ ] The listed tests pass.
- [ ] `git grep -nP "optionValues|\bo\.value\b|\boption\.value\b" -- Core ':!*.test.ts' ':!*.test.tsx'` lists only `PickOption` reads (`PropertyPicker.tsx`, `MassPropertyPicker.tsx`, `FilterFrame.tsx:148`, `propertyMenuActions.ts`, `propertyRows.ts`, `contextOptions.ts`), `SortFrame.tsx:137` (a UIX `PickerOption`), and `massAssign.ts`' parameter name; `git grep -n "stored(" -- Core/Properties/properties.ts` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 5B-2

**TASK:** Make `encodeValue(def, value)` write each label's key at its four callers, and let adoption subtract every option's label and key without regard to case, so the decode of Task 5B-1 and the encode agree on a key that differs from its label.

**NOW:** After Task 5B-1, `registeredOption(def, written)` answers the label of the option whose key `written` names (`propertyValue.ts`' `wordsOf`), so a Select holding `done` under `{ key: 'done', label: 'Done' }` decodes `Done`; `encodeValue(value)` (`propertyValue.ts:192-214`) still writes the decoded word, so writing that value back lands `Done`, a word no option's key names. Its callers each hold the definition: `applyValueAtRoot` (`propertyValue.ts:255`), `valueToWrite` (`Core/Nexus/page.ts`, the one encode a page create and every page and Space value write go through), the reconcile (`Core/Contexts/contextResolve.ts:131`), and `refillValues` (`Core/Properties/assignment.ts:58`). `unregisteredMembers` subtracts words whose fold an option's label holds; a word whose fold a key holds (`IN-PROGRESS` beside `{ key: 'in-progress', label: 'In Progress' }`) would be adopted as a second option with a key that folds to a held one (D-2 INFERRED). `keepingForeignWords` (Phase 3) appends held words `registeredOption` doesn't name, which now means words no key names. A label no option holds reaches `encodeValue` when a pick or an undo races the option's rename or removal, or a creation seed names a label a view still holds (`Core/Views/Pipeline/creationSeeds.ts:32,41`).

**CHANGE**

- [ ] Write and watch fail: `propertyValue.test.ts` — the *§encodeValue* describe (`:266-293`) passes a definition: under `{ key: 'done', label: 'Done' }` and `{ key: 'in-progress', label: 'In Progress' }`, `encodeValue(def, { kind: 'select', value: 'Done' })` is `['done']`, a Multi-Select `['In Progress', 'Done']` is `['in-progress', 'done']`, a label no option holds (`'Gone'`) is written as given, `['Gone']`, and the other kinds encode as before; the round-trip case (`:275-287`) passes each pair's definition, and a new pair decodes `['done']` to `Done` and encodes it back to `['done']`; `unregisteredMembers` under those options over `['IN-PROGRESS', 'done', 'DONE', 'new']` is `['new']`; `keepingForeignWords` under them keeps a held `Doing` after a written `['done']`. `governedWrite.test.ts` — a page holding `Stage: [done]` under `{ key: 'done', label: 'Done' }` written `{ kind: 'select', value: 'Done' }` stays byte-identical, and the reconcile (`reconcileGovernedRoot`) leaves it unchanged. `page.test.ts` — `createPage` with a Multi-Select value `['In Progress']` writes `- in-progress`.
- [ ] `propertyValue.ts`: the cached words hold both directions per definition, the decode reading key to label and the encode label to key, and their folds take each option's key beside its label; `encodeValue(def, value)` writes each Select and Multi-Select label's key, and a label no option holds as given; `unregisteredMembers`, reading those folds, subtracts every word whose fold any option's label or key holds; `applyValueAtRoot` passes `def`.
- [ ] The three other callers pass the definition they hold: `valueToWrite` (`page.ts`, `def`), `contextResolve.ts:131` (`governor.def`), `assignment.ts:58` (`def`).

**AFTER**

```Core/Properties/propertyValue.ts diff
@@ wordsOf @@
-type OptionWords = { labelOf: Map<string, string>; folds: ReadonlySet<string> }
+type OptionWords = {
+  labelOf: Map<string, string>
+  keyOf: Map<string, string>
+  folds: ReadonlySet<string>
+}
   …
     words = {
       labelOf: new Map(options.map((o) => [exactTitle(o.key), o.label])),
-      folds: new Set(options.map((o) => normalizeTitle(o.label))),
+      keyOf: new Map(options.map((o) => [o.label, o.key])),
+      folds: new Set(options.flatMap((o) => [normalizeTitle(o.label), normalizeTitle(o.key)])),
     }
@@ keyOf @@
+
+/** The key of the option `label` names; a label no option holds is written as given. */
+const keyOf = (def: PropertyDefinition, label: string): string =>
+  wordsOf(def).keyOf.get(label) ?? label
@@ unregisteredMembers @@
-/** The words a Multi-Select's `raw` holds that no option's title claims without regard to case, each once by fold. */
+/** The words a Multi-Select's `raw` holds that no option's label or key claims without regard to case, each once by fold. */
 export function unregisteredMembers(def: PropertyDefinition, raw: unknown): string[] {
@@ encodeValue @@
-export function encodeValue(value: PropertyValue): unknown {
+export function encodeValue(def: PropertyDefinition, value: PropertyValue): unknown {
   switch (value.kind) {
     case 'select':
-      return [value.value]
+      return [keyOf(def, value.value)]
+    case 'multiSelect':
+      return value.value.map((label) => keyOf(def, label))
     case 'number':
     case 'checkbox':
     case 'link':
     case 'dateTime':
     case 'text':
-    case 'multiSelect':
     case 'file':
     case 'context':
       return value.value
@@ applyValueAtRoot @@
-      : keepingForeignWords(def, encodeValue(value), root[def.key]),
+      : keepingForeignWords(def, encodeValue(def, value), root[def.key]),
```

```Core/Nexus/page.ts diff
@@ valueToWrite @@
-  const encoded = encodeValue(value)
+  const encoded = encodeValue(def, value)
```

```Core/Contexts/contextResolve.ts diff
-      if (!isBlankValue(reconciled)) next = encodeValue(reconciled)
+      if (!isBlankValue(reconciled)) next = encodeValue(governor.def, reconciled)
```

```Core/Properties/assignment.ts diff
-    const encoded = isBlankValue(restored) ? undefined : encodeValue(restored)
+    const encoded = isBlankValue(restored) ? undefined : encodeValue(def, restored)
```

**VERIFY**

- [ ] The listed tests pass; `settle.test.ts:906` (two pages holding `Claude` and `claude` register one option) passes unchanged.
- [ ] `git grep -n "encodeValue(" -- Core | grep -v "encodeValue(def\|encodeValue(governor.def\|encodeValue(decodeValue\|function encodeValue"` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 5B-3

**TASK:** Check option labels and option keys each non-blank and unique without regard to case within their property (D-2), at create, on every option edit, and at admission, and check a Status property's options at create as a Select's are (J-1).

**NOW:** `validateOptionValues(options: { value: string }[])` (`Core/Properties/schema.ts:85-91`, folding labels alone after Task 5B-1) refuses a blank or fold-duplicate title, from `editOption` and `renameOption` (`optionOps.ts:83,239`) and `validateDefinition`, which checks a Select's and a Multi-Select's `select_options` and skips Status (`schema.ts:64-67`). `withUniqueOptions` (`:72-82`) keeps the first option per folded label and none blank, at admission (`propertiesRegistry.ts:36`) and before every option edit (`optionOps.ts:58`). Neither reads the key, so a hand-edited `{ key: 'x', label: 'A' }` beside `{ key: 'X', label: 'B' }` passes both, and Phase 7's Value Format collision refusal (spec 7-3) rides this check.

**CHANGE**

- [ ] Write and watch fail: `schema.test.ts` *§validateOptionValues* (`:101-112`) takes `{ key, label }` options: `[{ key: 'A', label: 'A' }, { key: 'a', label: 'B' }]` refuses `'An option with this title already exists, please choose another name.'`, and with a second argument refuses that one instead; `[{ key: '', label: 'A' }]` refuses `'Options cannot contain an invalid name.'`; the existing four cases pass with each word as both. *§validateDefinition*: a Status whose groups hold `Done` and `done` refuses `'Option titles must be unique.'`, and a Status holding `{ key: ' ', label: 'Open' }` refuses `'Options cannot contain an invalid name.'`. *§withUniqueOptions* (new): of `{ key: 'x', label: 'A' }` and `{ key: 'X', label: 'B' }` it keeps the first; it drops `{ key: '', label: 'C' }`. `propertiesRegistry.test.ts:70` adds the key-fold pair, admitted with its first option.
- [ ] `schema.ts`: `validateOptionValues(options: { key: string; label: string }[], taken?)` refuses a blank label (`'Option titles can’t be blank.'`), then a blank key (`'Options cannot contain an invalid name.'`), then a folded label clash (`'Option titles must be unique.'`), then a folded key clash (`taken`, by default `'An option with this title already exists, please choose another name.'`); its doc says labels and keys compare case-folded; `withUniqueOptions` drops every option with a blank label or key, then keeps the first per folded label through `firstPerTitle`, then the first per folded key among those; `validateDefinition` checks `optionsOf(def)` whenever `PROPERTY_TYPES[def.type].options` is set.

**AFTER**

```Core/Properties/schema.ts diff
@@ imports @@
 import {
   byKey,
   firstPerTitle,
   isReservedPropertyId,
   KEY_REFUSAL,
   optionGroupsOf,
+  optionsOf,
   PROPERTY_TYPES,
@@ validateDefinition @@
-  if (PROPERTY_TYPES[def.type].options === 'select') {
-    const check = validateOptionValues(def.select_options ?? [])
+  if (PROPERTY_TYPES[def.type].options) {
+    const check = validateOptionValues(optionsOf(def))
     if (!check.ok) return check
   }
@@ withUniqueOptions @@
-/** `def` holding each option title once, the first of any that fold alike, and none blank; a definition already so is answered as it is. */
+/** `def` holding each option label and each key once, the first of any that fold alike, and none blank; a definition already so is answered as it is. */
 export function withUniqueOptions(def: PropertyDefinition): PropertyDefinition {
   const groups = optionGroupsOf(def)
   const options = groups.flatMap((g) => g.options)
   if (validateOptionValues(options).ok) return def
-  const first = new Set(firstPerTitle(options, (o) => o.label).values())
+  const named = options.filter((o) => normalizeTitle(o.label) !== '' && normalizeTitle(o.key) !== '')
+  const first = new Set(firstPerTitle(firstPerTitle(named, (o) => o.label).values(), (o) => o.key).values())
   const kept = groups.map((g) => ({
     ...g,
-    options: g.options.filter((o) => first.has(o) && normalizeTitle(o.label) !== ''),
+    options: g.options.filter((o) => first.has(o)),
   }))
   return withOptionGroups(def, kept)
 }
@@ validateOptionValues @@
-/** No minimum count — a Select may hold zero options. Enforced at create AND on every option edit; titles compare case-folded. */
-export function validateOptionValues(options: { key: string; label: string }[]): Result<null> {
-  const titles = options.map((o) => normalizeTitle(o.label))
-  if (titles.includes('')) return fail('invalid-property', 'Option titles can’t be blank.')
-  if (new Set(titles).size < titles.length) {
-    return fail('invalid-property', 'Option titles must be unique.')
-  }
+/** No minimum count — a Select may hold zero options. Enforced at create AND on every option edit; labels and keys each compare case-folded. */
+export function validateOptionValues(
+  options: { key: string; label: string }[],
+  taken = 'An option with this title already exists, please choose another name.',
+): Result<null> {
+  const labels = options.map((o) => normalizeTitle(o.label))
+  const keys = options.map((o) => normalizeTitle(o.key))
+  if (labels.includes('')) return fail('invalid-property', 'Option titles can’t be blank.')
+  if (keys.includes('')) return fail('invalid-property', 'Options cannot contain an invalid name.')
+  if (new Set(labels).size < labels.length)
+    return fail('invalid-property', 'Option titles must be unique.')
+  if (new Set(keys).size < keys.length) return fail('invalid-property', taken)
   return ok(null)
 }
```

**VERIFY**

- [ ] The listed tests pass; `optionOps.test.ts`' rename and add refusals over a duplicate title pass unchanged.
- [ ] Run the gates, then `view-delta` for Phase 5B.
- [ ] Check for unnecessary code or mistakes.

#### Task 5B-4

**TASK:** On the word given at the Stop before Task 5A-1, once Phases 5A and 5B have landed and their gates are green, commit NexusOS, delete the six deleted-property Trash records rather than migrate them, rewrite both registries once into the new shape with a scratch script that isn't committed (C-3), and open both Nexuses on the new build. The orchestrator runs this task; it touches no code.

**NOW:** NexusOS's `.nexus/properties.json` (tracked in NexusOS's git) holds 15 definitions and 59 options, `~/Test`'s (no git) 9 definitions and 5 options, all as `{ id, name, type, … }` with options `{ value, … }`; 32 options carry a leftover `label` equal to their `value`, and none differs (read at drafting). The six deleted-property records sit in `.trash/*__property-*.deleted/` bundles, five in NexusOS (`New Text`, `New Text (2)`, `New Number (2)` to `(4)`, none with options, none committed) and one in `~/Test` (`Fixture Retired`); each holds the old shape under `def` (`Core/Trash/record.ts:54-63`), which the new decoder doesn't read. The app writes the registry through `jsonText` (`Core/Files/atomicWrite.ts:90`), `stableStringify` with sorted keys, a two-space indent, and a trailing newline (`Core/Files/stableJson.ts:4-19`). Neither Nexus holds a schema journal.

**CHANGE**

- [ ] `pgrep -fl 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'` lists no process (a dev or built Pommora main, a worktree's, or a scratch instance's); if one runs, stop and ask Nathan before anything below.
- [ ] Commit NexusOS as it stands (`add -A`, then a commit whose message reads "Committed before the registry rewrite."); copy `~/Test/.nexus/properties.json` to the session scratchpad.
- [ ] List `~/NexusOS/.trash/*__property-*.deleted` and `~/Test/.trash/*__property-*.deleted`, read that they are the six bundles above, and delete them with `rm -r`.
- [ ] Write `rewrite-registries.mjs` to the session scratchpad, exactly:

```rewrite-registries.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const sortKeys = (v) =>
  Array.isArray(v)
    ? v.map(sortKeys)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]))
      : v
const jsonText = (v) => `${JSON.stringify(sortKeys(v), null, 2)}\n`

const option = ({ value, label: _leftover, ...o }) => ({ ...o, key: value, label: value })
const definition = ({ name, ...d }) => ({
  ...d,
  key: name,
  label: name,
  ...(Array.isArray(d.select_options) ? { select_options: d.select_options.map(option) } : {}),
  ...(Array.isArray(d.status_groups)
    ? { status_groups: d.status_groups.map((g) => ({ ...g, options: g.options.map(option) })) }
    : {}),
})
const oldShape = (d) =>
  typeof d.name === 'string' &&
  !('key' in d) &&
  [...(d.select_options ?? []), ...(d.status_groups ?? []).flatMap((g) => g.options)].every(
    (o) => typeof o.value === 'string' && !('key' in o),
  )

const files = ['NexusOS', 'Test'].map((n) => join(homedir(), n, '.nexus', 'properties.json'))
const registries = files.map((f) => JSON.parse(readFileSync(f, 'utf8')))
const stale = files.filter((_, i) => !Object.values(registries[i].defs).every(oldShape))
if (stale.length) throw new Error(`Not in the old shape, nothing written: ${stale.join(', ')}`)
files.forEach((f, i) => {
  const reg = registries[i]
  const defs = Object.fromEntries(Object.entries(reg.defs).map(([id, d]) => [id, definition(d)]))
  writeFileSync(f, jsonText({ ...reg, defs }))
})
console.log(files.join('\n'))
```

- [ ] Run `node rewrite-registries.mjs` from the scratchpad; it prints two paths.
- [ ] Delete `rewrite-registries.mjs` and the `~/Test` copy once VERIFY passes.

**VERIFY**

- [ ] `node -e` over both registries: no definition holds `name` and none an option `value`; every definition's `key` and `label` are the committed or copied `name`, every option's `key` and `label` its `value`, in the same order; NexusOS reads 15 definitions and 59 options, `~/Test` 9 and 5.
- [ ] NexusOS's diff of `.nexus/properties.json` against its pre-rewrite commit shows only `name` lines turned into `key`/`label` pairs and `value` lines into `key`/`label` pairs (the leftover `label` lines replaced); no `__property-` bundle remains in either `.trash`.
- [ ] Open `~/Test` and NexusOS in the drive harness (`node .claude/scripts/drive-harness.mjs`): the registry reads 9 and 15 definitions, every option chip shows its label, and a `~/Test` Select pick writes its key; close both.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, reading outward: no production read of an option's `value` remains outside `PickOption`; the renderer names options by label everywhere, and each option channel and `OptionEdit` resolves the label to its option host-side, journaling and cascading the key; a decoded value holds labels and every encode writes keys, at all six callers; the reconcile, the repair, the refill, and the restore scrub leave a page holding an option's key byte-identical; adoption subtracts folded labels and keys, and an adopted word is its own label and key; option labels and keys are each unique and non-blank at create, every edit, and admission, Status included; the leftover-label strip is gone and labels persist; the rewrite ran once after its backup, and both Nexuses open and read on the new build.

### Phase 6 — Label and Key: the Journal and Cascades

**GOAL:** The option cascade rewrites files and the Collection value caches by key and the configuration by label (F-2), so a key change never touches a view and a label change never touches a file it doesn't have to; one key map edits every list in one pass, which is the shape a Value Format change needs (F-1); Clear strips the caches too, so a cleared value doesn't come back at the next assign (J-1). The journal's records carry stored keys, an option rename's record carries a key list and the label pair, and replay compares keys exactly. An option rename or removal waits while another record is owed, and the adoption shield covers every old key the owed record names (F-1). It's a separate phase because it changes what the cascades and the journal carry, after Phase 5 gave every option both words; Phase 7's format changes ride exactly these paths.

#### Task 6-1

**TASK:** Delete `cacheEdit` from the configuration pass and edit the Collection caches through `editCaches` beside the file sweep, in the option cascade and in Clear.

**NOW:** `reachConfig` edits a Collection's `property_cache` inside its container loop through `cacheEdit` (`Core/Nexus/configReach.ts:308-320,364-369`), with the one word `OptionReach` carries for views too (`:92`); as Phase 5B leaves it, `optionCascade(root, def, value, edit)` (`Core/Properties/optionOps.ts:203-213`) passes it the option's key, so the configuration arms match a key and the cache arm a key. Clear sweeps files and Spaces alone (`optionOps.ts:256-267`), so its cached words come back when the property is assigned again (`Core/Properties/assignment.ts:69-108`, *MetadataV3 — Investigation*, *§The Cache's Writers*). `editCaches(root, collections, propertyIds, edit)` (`Core/Properties/propertyCache.ts:52-68`) edits each Collection the tree lists as caching a property, scoped by `node.cached`, and answers the Collections it couldn't write; the page-rename cascade already uses it (`Core/Nexus/cascade.ts:225`). A Collection whose sidecar doesn't parse is out of the tree, and `reachConfig` counts each as a skip (`configReach.ts:351-353`, through `damagedFolders`, `Core/Nexus/treePatch.ts:271-272`); `collectionFolders` (`Core/Properties/assignment.ts:156-160`), which the file sweep reads first, lists that Collection's folder, so its pages are swept, and reads the tree uncaught. The page-rename cascade's cache pass counts only the Collections `editCaches` couldn't write (`Core/Nexus/cascade.ts:216-226`).

**CHANGE**

- [ ] Write and watch fail: `configReach.test.ts` — `:157-197` and `:249-270` keep their view assertions and assert `property_cache.prop_s` unchanged (`{ values: { p1: 'Done', p2: ['Done', 'Todo'], p3: 'Todo' } }`), the configuration pass no longer reaching the cache. `optionOps.test.ts` — a new describe *§the option cascades reach the Collection caches*: with `Col`'s sidecar holding `property_cache: { [id]: { values: { p1: ['A'], p2: ['A', 'B'], p3: 'B' } } }`, `renameOption(root, id, 'A', 'Z')` leaves `{ p1: ['Z'], p2: ['Z', 'B'], p3: 'B' }`; `removeOption(root, id, 'A')` leaves `{ p2: ['B'], p3: 'B' }`; `clearOption(root, id, 'A')` leaves `{ p2: ['B'], p3: 'B' }`, and a reassign of the property to `Col` (`removeProperty` then `assignProperty`) refills no page with `A`; with a second Collection whose sidecar is a directory, `renameOption(root, id, 'A', 'Z')` reports one skip (`unsweptLine(1)`), the configuration pass's, and keeps its record owed.
- [ ] `configReach.ts`: delete `cacheEdit` and the container loop's cache branch; the loop writes `mapViews(cur, edit)`; the `editCacheBlocks` and `listOf` imports go (their one reader).
- [ ] `optionOps.ts`: add `cacheSweep(root, def, target, edit)`, which edits every cached list of `def` through `editHeldList` and `editList` by way of `editCaches` and answers the Collections it couldn't write, as page-rename's cache pass does (a damaged Collection is out of the tree: the configuration pass counts it where one runs, and a Clear, which runs none after Task 6-2, leaves it uncounted, as page-rename does); `optionCascade` runs it after the file sweep and before the configuration pass, behind the same Remove-skipped-a-file stop; `clearOption` answers the skips of its sweep and its cache sweep.

**AFTER**

```Core/Nexus/configReach.ts diff
@@ imports @@
-import { editCacheBlocks } from '../Properties/propertyCache'
-import { isPlainObject, listOf } from '../Contract/validators'
+import { isPlainObject } from '../Contract/validators'
@@ cacheEdit @@
-const cacheEdit = (e: OptionReach, cur: Raw): Raw | null =>
-  editCacheBlocks(cur, [e.def.id], (cached) => {
-    const values = { ...cached }
-    let touched = false
-    for (const [id, held] of Object.entries(cached)) {
-      const edited = editList(listOf(held), e.value, e.edit)
-      if (!edited) continue
-      touched = true
-      if (edited.length) values[id] = edited
-      else delete values[id]
-    }
-    return touched ? values : null
-  })
-
@@ reachConfig @@
   for (const { kind, dir } of containers) {
-    await written(sidecarPath(dir, kind), (cur) => {
-      const views = mapViews(cur, edit)
-      const cache = kind === 'collection' && e.kind === 'option' ? cacheEdit(e, views ?? cur) : null
-      return cache ?? views
-    })
+    await written(sidecarPath(dir, kind), (cur) => mapViews(cur, edit))
   }
```

```Core/Properties/optionOps.ts diff
@@ imports @@
-import { namesValue, valueEditRewrite, type ValueEdit } from './pageValue'
+import { editList, namesValue, valueEditRewrite, type ValueEdit } from './pageValue'
+import { editCaches } from './propertyCache'
+import { editHeldList } from '../Files/heldKeys'
-import { heldTreeOf } from '../Nexus/liveTree'
+import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
@@ cacheSweep @@
+async function cacheSweep(
+  root: string,
+  def: PropertyDefinition,
+  target: string,
+  edit: ValueEdit,
+): Promise<number> {
+  const { collections } = await liveTreeOf(root)
+  return editCaches(root, collections, new Set([def.id]), (values) =>
+    Object.keys(values).reduce<Json | null>(
+      (next, id) => editHeldList(next ?? values, id, (held) => editList(held, target, edit)) ?? next,
+      null,
+    ),
+  )
+}
+
@@ optionCascade @@
   const pages = await valueEditSweep(root, def, value, edit)
   if (pages && edit.op === 'strip') return { skipped: pages, hosts: [] }
+  const caches = await cacheSweep(root, def, value, edit)
   const reach = await reachConfig(root, { kind: 'option', def, value, edit })
-  return { skipped: pages + reach.skipped, hosts: reach.hosts }
+  return { skipped: pages + caches + reach.skipped, hosts: reach.hosts }
@@ clearOption @@
     const r = await resolveForCascade(root, propertyId, label)
     if (!r.ok) return r
-    const skipped = await valueEditSweep(root, r.value.def, r.value.key, { op: 'strip' })
+    const { def, key } = r.value
+    const strip: ValueEdit = { op: 'strip' }
+    const skipped =
+      (await valueEditSweep(root, def, key, strip)) + (await cacheSweep(root, def, key, strip))
     return skipped ? fault(unsweptLine(skipped)) : ok(null)
```

**VERIFY**

- [ ] The listed tests pass; `configReach.test.ts`' *§what the pass skips* and *§a pass scoped under one Collection* pass unchanged.
- [ ] `git grep -n "cacheEdit\|editCacheBlocks" -- Core/Nexus/configReach.ts` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-2

**TASK:** Replace `ValueEdit`'s two branches with one key map, let `editList` rename and strip any number of members in one pass, fold `valueEditSweep` into its plan and the sweep, and split the option cascade's one word into the key map for files and caches and the label pair for configuration.

**NOW:** `ValueEdit` is `{ op: 'strip' } | { op: 'replace'; to }` (`Core/Properties/pageValue.ts:8`), and `editList(xs, target, edit)` (`:19-34`) edits one member through `namesValue` (`:11-14`, exact by `memberKey` since Phase 3), deduping onto the one target. Its callers: `valueEditRewrite(def, target, edit)` (`:36-43`, as Phase 5A leaves it, over `def.key`), `retitleSpace` (`Core/Contexts/contextCascade.ts:45-48`), the configuration arms `optionRule` and `scopedOrder` (`configReach.ts:142-159`), and Task 6-1's `cacheSweep`. `collapsedKeys` and the `hiddenKeys` arm read `e.value` and `e.edit` (`configReach.ts:161-195`), and `editHiddenBucket(v, propertyId, from, to)` (`Core/Views/views.ts:359-375`) takes one pair. `namesValue` also serves as a matcher, apart from `editList`: `setSpaceContext`'s far check and strip (`Core/Contexts/contextWrite.ts:99-108`), `unlinkSpaceValue`'s capture and strip (`contextCascade.ts:150-169`), `writtenSpelling`'s held-member match (`Core/Properties/propertyValue.ts:185-188`), and the adoption shield (`optionOps.ts:133-135`). `optionCascade(root, def, value, edit)` hands one word to the files, the caches, and configuration; `valueEditSweep` (`optionOps.ts:193-201`) is its file half, also called by Clear; `valueEditPlan(root, def, target, edit)` (`:183-191`) serves both and Clear's count. Its callers: `renameOption` and `removeOption` (`optionOps.ts:250,297`), the replay arms (`Core/Properties/replaySchemaCascade.ts:80,88`), whose `option-remove` gate checks `optionsOf(def).some((o) => o.key === journal.value)`.

**CHANGE**

- [ ] Write and watch fail: `pageValue.test.ts` — the helpers build `valueEditRewrite({ key }, new Map([[value, null]]))` and `new Map([[old, next]])`, and every *§valueEditRewrite* and *§the option list is the one shape* case keeps its expectation; *§editList*: `:80-90` and `:109-111` take one-pair maps and keep their expectations; new cases: `editList(['a', 'x', 'b'], new Map([['a', null], ['b', 'c']]))` is `['x', 'c']`; `editList(['a', 'b', 'c'], new Map([['a', 'A'], ['b', 'B']]))` is `['A', 'B', 'c']`; `editList(['b', 'b'], new Map([['a', 'b']]))` is null (no member the map names, so an unrelated duplicate stays); `editList(['a', 'b'], new Map([['a', 'b']]))` is `['b']`; `editList(['a', null, 5], new Map([['a', 'b']]))` is `['b', null, 5]` (a foreign `null` isn't a strip). *§namesValue* (`:114-121`) stays. `configReach.test.ts:35-46`: `rename` is `{ kind: 'option', def: STAGE, labels: ['Done', 'Closed'] }` and `removal` `{ …, labels: ['Done', null] }`; `:219`'s reach likewise; every assertion stays. `optionOps.test.ts` — a new case: under `{ key: 'urgent', label: 'Urgent' }` with a page holding `Tags: [urgent]` and a view filtering `is` `Urgent`, `renameOption(root, id, 'Urgent', 'Critical')` writes the page `Tags: [Critical]` and the view's operand `Critical`, and `removeOption(root, id, 'Critical')` strips both.
- [ ] `pageValue.ts`: `ValueEdit` is `ReadonlyMap<string, string | null>`; `editList(xs, edit)` answers null when no member is one the map names, and otherwise each named member renamed or dropped in one pass, a member landing on a target the list already holds kept once where it first lands; `valueEditRewrite(def, edit)`; `namesValue`, `stripList`, and `Matcher` stay for their matcher readers and `configReach`'s gone arms.
- [ ] `contextCascade.ts:45-48`: `retitleSpace` edits with `new Map([[j.oldTitle, j.newTitle]])`.
- [ ] `configReach.ts`: `OptionReach` is `{ def, labels: readonly [string, string | null] }`; `optionRule` and `scopedOrder` edit through `new Map([e.labels])`; `collapsedKeys` and the `hiddenKeys` arm destructure `e.labels`; the `ValueEdit` import goes.
- [ ] `optionOps.ts`: delete `valueEditSweep`; `valueEditPlan(root, def, keys)`; `cacheSweep(root, def, keys)`; `optionCascade(root, def, keys, labels?)` sweeps the plan, stops when a Remove (`labels[1] === null`) skipped a file, sweeps the caches, and runs `reachConfig` only with `labels`; `renameOption` cascades `new Map([[record.from, record.to]])` with `[oldLabel, newLabel]`; `removeOption` `new Map([[key, null]])` with `[label, null]`; `clearOption` answers the skips of `optionCascade(root, def, new Map([[key, null]]))`, no label, so no configuration; `optionHolders` plans `new Map([[key, null]])`.
- [ ] `replaySchemaCascade.ts`: the `option-rename` arm cascades `new Map([[journal.from, journal.to]])` with `[journal.from, journal.to]` as the labels (one word per side until Task 6-3 records the pair); the `option-remove` arm finds the option whose key is `journal.value`, `NO_REACH` without one, and cascades `new Map([[journal.value, null]])` with `[option.label, null]`.

**AFTER**

```Core/Properties/pageValue.ts diff
@@ ValueEdit @@
-export type ValueEdit = { op: 'strip' } | { op: 'replace'; to: string }
+/** Each member an edit names, matched by `memberKey`, and the member it becomes, or null to strip it. */
+export type ValueEdit = ReadonlyMap<string, string | null>
@@ editList @@
-export function editList(
-  xs: readonly unknown[],
-  target: string,
-  edit: ValueEdit,
-): unknown[] | null {
-  const matches = namesValue(target)
-  if (edit.op === 'strip') return stripList(xs, matches)
-  if (!xs.some(matches)) return null
-  const isTo = namesValue(edit.to)
-  const out: unknown[] = []
-  for (const el of xs) {
-    const next = matches(el) || isTo(el) ? edit.to : el
-    if (next !== edit.to || !out.includes(edit.to)) out.push(next)
-  }
-  return out
-}
+/** `xs` with every member `edit` names renamed or stripped in one pass, a member landing on a target the list holds kept once where it first lands; null when `edit` names no member. */
+export function editList(xs: readonly unknown[], edit: ValueEdit): unknown[] | null {
+  const to = new Map<unknown, string | null>([...edit].map(([from, next]) => [memberKey(from), next]))
+  if (!xs.some((el) => to.has(memberKey(el)))) return null
+  const targets = new Set([...edit.values()].flatMap((t) => (t === null ? [] : [memberKey(t)])))
+  const landed = new Set<unknown>()
+  const out: unknown[] = []
+  for (const el of xs) {
+    const named = to.has(memberKey(el))
+    const next = named ? to.get(memberKey(el)) : el
+    if (named && next === null) continue
+    const key = memberKey(next)
+    if (targets.has(key)) {
+      if (landed.has(key)) continue
+      landed.add(key)
+    }
+    out.push(next)
+  }
+  return out
+}
@@ valueEditRewrite @@
-export function valueEditRewrite(
-  def: Pick<PropertyDefinition, 'key'>,
-  target: string,
-  edit: ValueEdit,
-): Rewrite {
-  return (raw) => editHeldList(raw, def.key, (held) => editList(held, target, edit))
-}
+export const valueEditRewrite =
+  (def: Pick<PropertyDefinition, 'key'>, edit: ValueEdit): Rewrite =>
+  (raw) =>
+    editHeldList(raw, def.key, (held) => editList(held, edit))
```

```Core/Contexts/contextCascade.ts diff
@@ retitleSpace @@
 const retitleSpace = (raw: Json, contextTitle: string, j: RenameJournal): Json | null =>
   editHeldList(raw, contextKey(contextTitle), (held) =>
-    editList(held, j.oldTitle, { op: 'replace', to: j.newTitle }),
+    editList(held, new Map([[j.oldTitle, j.newTitle]])),
   )
```

```Core/Nexus/configReach.ts diff
@@ imports @@
-import { editList, type Matcher, stripList, type ValueEdit } from '../Properties/pageValue'
+import { editList, type Matcher, stripList } from '../Properties/pageValue'
@@ OptionReach @@
-type OptionReach = { def: PropertyDefinition; value: string; edit: ValueEdit }
+type OptionReach = { def: PropertyDefinition; labels: readonly [string, string | null] }
@@ optionRule @@
 const optionRule = (e: OptionReach, rule: Raw): Raw | null =>
   onProperty(e.def.id, rule) && wholeValues(e.def, rule.op)
-    ? editOperands(rule, (xs) => editList(xs, e.value, e.edit))
+    ? editOperands(rule, (xs) => editList(xs, new Map([e.labels])))
     : rule
@@ scopedOrder @@
-  const order = editList(holder.order, e.value, e.edit)
+  const order = editList(holder.order, new Map([e.labels]))
@@ collapsedKeys @@
 function collapsedKeys(e: OptionReach, view: SavedView, keys: unknown[]): unknown[] {
   const top = groupsOn(view, 'group', e.def.id)
   const sub = groupsOn(view, 'sub', e.def.id)
-  const to = e.edit.op === 'replace' ? e.edit.to : null
+  const [from, to] = e.labels
   const rename = (k: string): string | null => {
-    if (top && k === e.value) return to
-    if (!sub || !k.endsWith(`/${e.value}`)) return k
-    return to === null ? null : `${k.slice(0, -e.value.length)}${to}`
+    if (top && k === from) return to
+    if (!sub || !k.endsWith(`/${from}`)) return k
+    return to === null ? null : `${k.slice(0, -from.length)}${to}`
   }
@@ RENAME hiddenKeys @@
   hiddenKeys: (e, held, view) =>
     overStrings(held, (keys) =>
-      editHiddenBucket(
-        { ...view, hidden_groups: keys },
-        e.def.id,
-        e.value,
-        e.edit.op === 'replace' ? e.edit.to : null,
-      ),
+      editHiddenBucket({ ...view, hidden_groups: keys }, e.def.id, ...e.labels),
     ),
```

```Core/Properties/optionOps.ts diff
@@ valueEditPlan @@
 async function valueEditPlan(
   root: string,
   def: PropertyDefinition,
-  target: string,
-  edit: ValueEdit,
+  keys: ValueEdit,
 ): Promise<{ pages: string[]; plan: SweepPlan }> {
   const pages = await keyHolderFiles(root, def.key, await collectionFolders(root))
-  const raw = valueEditRewrite(def, target, edit)
+  const raw = valueEditRewrite(def, keys)
   return { pages, plan: { raw, sidecars: raw } }
 }
-
-async function valueEditSweep(
-  root: string,
-  def: PropertyDefinition,
-  target: string,
-  edit: ValueEdit,
-): Promise<number> {
-  const { pages, plan } = await valueEditPlan(root, def, target, edit)
-  return (await sweepGovernedRoots(root, pages, plan)).skipped.length
-}
@@ cacheSweep @@
-async function cacheSweep(
-  root: string,
-  def: PropertyDefinition,
-  target: string,
-  edit: ValueEdit,
-): Promise<number> {
+async function cacheSweep(root: string, def: PropertyDefinition, keys: ValueEdit): Promise<number> {
   …
-      (next, id) => editHeldList(next ?? values, id, (held) => editList(held, target, edit)) ?? next,
+      (next, id) => editHeldList(next ?? values, id, (held) => editList(held, keys)) ?? next,
@@ optionCascade @@
+/** Rewrites the files and caches holding `keys`' old keys, and with `labels` every configuration reference to the option's label. */
 export async function optionCascade(
   root: string,
   def: PropertyDefinition,
-  value: string,
-  edit: ValueEdit,
+  keys: ValueEdit,
+  labels?: readonly [string, string | null],
 ): Promise<ConfigReach> {
-  const pages = await valueEditSweep(root, def, value, edit)
-  if (pages && edit.op === 'strip') return { skipped: pages, hosts: [] }
-  const caches = await cacheSweep(root, def, value, edit)
-  const reach = await reachConfig(root, { kind: 'option', def, value, edit })
-  return { skipped: pages + caches + reach.skipped, hosts: reach.hosts }
+  let skipped = 0
+  if (keys.size) {
+    const { pages, plan } = await valueEditPlan(root, def, keys)
+    skipped = (await sweepGovernedRoots(root, pages, plan)).skipped.length
+    // A Remove that skipped a file stops here, so the option and every reference to it stay while its replay is owed.
+    if (skipped && labels?.[1] === null) return { skipped, hosts: [] }
+    skipped += await cacheSweep(root, def, keys)
+  }
+  const reach = labels ? await reachConfig(root, { kind: 'option', def, labels }) : NO_REACH
+  return { skipped: skipped + reach.skipped, hosts: reach.hosts }
 }
@@ renameOption @@
-    const reach = await optionCascade(root, edit.value, record.from, { op: 'replace', to: record.to })
+    const reach = await optionCascade(root, edit.value, new Map([[record.from, record.to]]), [
+      oldLabel,
+      newLabel,
+    ])
@@ clearOption @@
-    const { def, key } = r.value
-    const strip: ValueEdit = { op: 'strip' }
-    const skipped =
-      (await valueEditSweep(root, def, key, strip)) + (await cacheSweep(root, def, key, strip))
+    const { skipped } = await optionCascade(root, r.value.def, new Map([[r.value.key, null]]))
     return skipped ? fault(unsweptLine(skipped)) : ok(null)
@@ optionHolders @@
-  const { pages, plan } = await valueEditPlan(root, r.value.def, r.value.key, { op: 'strip' })
+  const { pages, plan } = await valueEditPlan(root, r.value.def, new Map([[r.value.key, null]]))
@@ removeOption @@
-    const reach = await optionCascade(root, def, key, { op: 'strip' })
+    const reach = await optionCascade(root, def, new Map([[key, null]]), [label, null])
```

`optionOps.ts` imports `NO_REACH` beside `reachConfig`.

```Core/Properties/replaySchemaCascade.ts diff
@@ option-rename @@
-      return optionCascade(root, def, journal.from, { op: 'replace', to: journal.to })
+      return optionCascade(root, def, new Map([[journal.from, journal.to]]), [journal.from, journal.to])
@@ option-remove @@
-      if (!optionsOf(def).some((o) => o.key === journal.value)) return NO_REACH
-      const owed = await optionCascade(root, def, journal.value, { op: 'strip' })
+      const option = optionsOf(def).find((o) => o.key === journal.value)
+      if (!option) return NO_REACH
+      const owed = await optionCascade(root, def, new Map([[journal.value, null]]), [option.label, null])
```

**VERIFY**

- [ ] The listed tests pass; `contextCascade.test.ts`' Space retitle cases and `optionOps.test.ts`' *§option cascades reach a Space sidecar* pass unchanged.
- [ ] `git grep -nE "op: 'strip'|op: 'replace'|valueEditSweep" -- Core ':!*.test.ts'` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-3

**TASK:** Make every journal record carry stored keys: `rename { from, to }` in keys, `delete { key }`, `option-rename { keys: [from, to][], labels?: [from, to] }`, and `option-remove { key }`; delete `sameRecord`, the slot and the replay comparing records through `same`; follow the shapes through every producer and replay arm, and let the adoption shield take every `from` key of an owed rename.

**NOW:** `SchemaJournal` (`Core/Properties/propertyJournal.ts:8-12`) is `rename { from, to }`, `delete { name }`, `option-rename { from, to }`, and `option-remove { value }`; after Phase 5 each holds keys under those names (`Core/Properties/registryProperty.ts:129`; `Core/Properties/deleteProperty.ts:103`; `Core/Properties/optionOps.ts` `renameOption`, `removeOption`). `sameRecord` (`:14-25`) compares each arm's fields by hand, and `decodeSchemaJournal` (`:27-43`) reads them. The replay (`Core/Properties/replaySchemaCascade.ts:50-93`) reads `journal.name` in the delete arm, and the option-rename arm gates on one pair (`:77-79`) and, after Task 6-2, passes the record's one pair as the labels. The create supersede reads `journal.name` (`registryProperty.ts:68-76`). `registerHeldOptions` shields the owed rename's one `from` through `namesValue` (`optionOps.ts:125-135`). An option label rename always changes the label and, under Match Title, the key with it; the key stays only where a stored key already equals the new label.

**CHANGE**

- [ ] Write and watch fail: `propertyJournal.test.ts` — `SHAPES` (`:27-31`) holds `{ op: 'delete', id: 'prop_a', key: 'Foo' }`, `{ op: 'option-rename', id: 'prop_a', keys: [['Draft', 'Done']], labels: ['Draft', 'Done'] }`, `{ op: 'option-rename', id: 'prop_a', keys: [['draft', 'done'], ['open', 'opened']] }`, and `{ op: 'option-remove', id: 'prop_a', key: 'Draft' }`, each round-tripping; the refusal table (`:52-66`) renames its cases *delete without key* and *remove without key* and adds `{ op: 'option-rename', id: 'x', keys: [['a']] }` and `{ op: 'option-rename', id: 'x', keys: [], labels: 'a' }` → null. `replaySchemaCascade.test.ts` — every record literal takes the new shape (`:175,195,205,220,231,253,281,301,317,327,353,379,402,418,423,461,483`); a new case: a record with `keys: [['Draft', 'Done'], ['Todo', 'Later']]` and no labels, over a definition holding `Done` and `Later`, rewrites both words on every page and leaves a view filtering `Draft` as written; a new case: a record whose `labels` gate fails (the definition labelled `Draft` again) clears untouched. `optionOps.test.ts:779,788,805,824,827,838`, `handlers.test.ts:118,136,147,190,259,280,339,350`, `journalWiring.test.ts:274,280,286,289,297,300`, `deleteProperty.test.ts:342,353,362`, `mutate.test.ts:1438`, and `OptionEditor.test.tsx:149` take the new shapes; `optionOps.test.ts:805` expects `keys: [['Done', 'Closed']]` and `labels: ['Done', 'Closed']`. `settle.test.ts:1017` writes `{ op: 'option-rename', id: 'tags', keys: [['alpha', 'beta']], labels: ['alpha', 'beta'] }` and keeps its assertions; a new case beside it: a record with `keys: [['alpha', 'beta'], ['gamma', 'delta']]` over pages holding `alpha` and `gamma` registers neither.
- [ ] Before any edit: `ls ~/NexusOS/.nexus/property-cascade.json ~/Test/.nexus/property-cascade.json` finds neither file; if one is held, stop and ask Nathan to Try Again it on the current build, since its old shape won't decode after this task.
- [ ] `propertyJournal.ts`: the four shapes; delete `sameRecord`, and the slot compares through `same` (`Core/Files/stableJson.ts:8`), every record being plain JSON its decoder writes back field for field; `decodeSchemaJournal` reads `key` for `delete` and `option-remove`, and for `option-rename` a `keys` list of string pairs and an optional `labels` pair.
- [ ] `deleteProperty.ts`: the record is `{ op: 'delete', id: propertyId, key }`. `registryProperty.ts`: the create supersede reads `journal.key === landed`.
- [ ] `optionOps.ts`: `renameOption`'s record is `{ op: 'option-rename', id, keys, labels: [oldLabel, newLabel] }` with `keys` empty when the option's key already equals `newLabel`, and it cascades `new Map(record.keys)` with `record.labels`; `removeOption`'s is `{ op: 'option-remove', id, key }`; the shield holds the owed rename's every `from` and skips a word one of them names by `memberKey`, as every other member match does.
- [ ] `replaySchemaCascade.ts`: the delete arm reads `journal.key`; the option-rename arm acts while the definition's keys hold every `to` and no `from`, and, with `labels`, its labels hold the new and not the old, then cascades `new Map(journal.keys)` with `journal.labels`; the option-remove arm reads `journal.key`.

**AFTER**

```Core/Properties/propertyJournal.ts diff
@@ imports @@
+import { same } from '../Files/stableJson'
@@ SchemaJournal @@
 export type SchemaJournal =
   | { op: 'rename'; id: string; from: string; to: string }
-  | { op: 'delete'; id: string; name: string }
-  | { op: 'option-rename'; id: string; from: string; to: string }
-  | { op: 'option-remove'; id: string; value: string }
+  | { op: 'delete'; id: string; key: string }
+  | { op: 'option-rename'; id: string; keys: [string, string][]; labels?: [string, string] }
+  | { op: 'option-remove'; id: string; key: string }
@@ sameRecord @@
-export function sameRecord(a: SchemaJournal, b: SchemaJournal): boolean {
-  if (a.op !== b.op || a.id !== b.id) return false
-  switch (a.op) {
-    case 'rename':
-    case 'option-rename':
-      return b.op === a.op && a.from === b.from && a.to === b.to
-    case 'delete':
-      return b.op === 'delete' && a.name === b.name
-    case 'option-remove':
-      return b.op === 'option-remove' && a.value === b.value
-  }
-}
+const isPair = (v: unknown): v is [string, string] =>
+  Array.isArray(v) && v.length === 2 && v.every((w) => typeof w === 'string')
@@ decodeSchemaJournal @@
   switch (raw.op) {
     case 'rename':
-    case 'option-rename':
       if (typeof raw.from !== 'string' || typeof raw.to !== 'string') return null
       return { op: raw.op, id: raw.id, from: raw.from, to: raw.to }
     case 'delete':
-      if (typeof raw.name !== 'string') return null
-      return { op: 'delete', id: raw.id, name: raw.name }
     case 'option-remove':
-      if (typeof raw.value !== 'string') return null
-      return { op: 'option-remove', id: raw.id, value: raw.value }
+      if (typeof raw.key !== 'string') return null
+      return { op: raw.op, id: raw.id, key: raw.key }
+    case 'option-rename':
+      if (!Array.isArray(raw.keys) || !raw.keys.every(isPair)) return null
+      if (raw.labels !== undefined && !isPair(raw.labels)) return null
+      return { op: raw.op, id: raw.id, keys: raw.keys, ...(raw.labels ? { labels: raw.labels } : {}) }
     default:
@@ slot @@
-const slot = journalSlot<SchemaJournal>(PROPERTY_JOURNAL_FILENAME, decodeSchemaJournal, sameRecord)
+const slot = journalSlot<SchemaJournal>(PROPERTY_JOURNAL_FILENAME, decodeSchemaJournal, same)
```

```Core/Properties/deleteProperty.ts diff
@@ deleteInner @@
-  const record: SchemaJournal = { op: 'delete', id: propertyId, name: key }
+  const record: SchemaJournal = { op: 'delete', id: propertyId, key }
```

```Core/Properties/registryProperty.ts diff
@@ createProperty @@
-      (journal.name === landed || journal.id === created.value.id)
+      (journal.key === landed || journal.id === created.value.id)
```

```Core/Properties/optionOps.ts diff
@@ imports @@
-import { editList, namesValue, valueEditRewrite, type ValueEdit } from './pageValue'
+import { editList, valueEditRewrite, type ValueEdit } from './pageValue'
-import { editHeldList } from '../Files/heldKeys'
+import { editHeldList, memberKey } from '../Files/heldKeys'
@@ registerHeldOptions @@
-      // A rename still owed to the files its sweep skipped leaves its old value held, and registering it would end the rename's replay.
+      // A rename still owed to the files its sweep skipped leaves its old keys held, and registering one would end the rename's replay.
       const journal = await readSchemaJournal(root)
       const renamed = journal?.op === 'option-rename' ? journal : null
       await mutateRegistry(root, (registry, stored) => {
         let defs = registry.defs
         for (const [id, members] of held) {
           const def = defs[id]
           if (!def) continue
-          const fresh = unregisteredMembers(def, members).filter(
-            (v) => !(renamed?.id === id && namesValue(renamed.from)(v)),
-          )
+          const owed = new Set(renamed?.id === id ? renamed.keys.map(([from]) => memberKey(from)) : [])
+          const fresh = unregisteredMembers(def, members).filter((v) => !owed.has(memberKey(v)))
@@ renameOption @@
+    const { key } = r.value
     const record: SchemaJournal = {
       op: 'option-rename',
       id: propertyId,
-      from: r.value.key,
-      to: newLabel,
+      keys: key === newLabel ? [] : [[key, newLabel]],
+      labels: [oldLabel, newLabel],
     }
   …
-    const reach = await optionCascade(root, edit.value, new Map([[record.from, record.to]]), [
-      oldLabel,
-      newLabel,
-    ])
+    const reach = await optionCascade(root, edit.value, new Map(record.keys), record.labels)
@@ removeOption @@
-    const record: SchemaJournal = { op: 'option-remove', id: propertyId, value: key }
+    const record: SchemaJournal = { op: 'option-remove', id: propertyId, key }
```

```Core/Properties/replaySchemaCascade.ts diff
@@ imports @@
-import { optionsOf } from './properties'
+import { optionLabels, optionsOf } from './properties'
-  sameRecord,
+import { same } from '../Files/stableJson'
@@ landed @@
+const landed = (pairs: readonly (readonly [string, string])[], held: readonly string[]): boolean =>
+  pairs.every(([from, to]) => held.includes(to) && !held.includes(from))
+
@@ delete @@
-      const crashed = !answered && def !== undefined && def.key === journal.name
-      const freed = !def && !Object.values(defs).some((d) => d.key === journal.name)
+      const crashed = !answered && def !== undefined && def.key === journal.key
+      const freed = !def && !Object.values(defs).some((d) => d.key === journal.key)
   …
-      const { held, plan } = await deletePlan(root, journal.id, journal.name, folders)
+      const { held, plan } = await deletePlan(root, journal.id, journal.key, folders)
@@ option-rename @@
       const def = defs[journal.id]
       if (!def) return NO_REACH
-      const keys = optionsOf(def).map((o) => o.key)
-      // Holds `to` and not `from` = the commit landed cleanly; every other state is not this record's.
-      if (!keys.includes(journal.to) || keys.includes(journal.from)) return NO_REACH
-      return optionCascade(root, def, new Map([[journal.from, journal.to]]), [journal.from, journal.to])
+      // Every new key and the new label held, and no old one, = the commit landed cleanly; every other state is not this record's.
+      if (!landed(journal.keys, optionsOf(def).map((o) => o.key))) return NO_REACH
+      if (journal.labels && !landed([journal.labels], optionLabels(def))) return NO_REACH
+      return optionCascade(root, def, new Map(journal.keys), journal.labels)
@@ option-remove @@
-      if (!def || !held || !sameRecord(held, journal)) return NO_REACH
+      if (!def || !held || !same(held, journal)) return NO_REACH
   …
-      const option = optionsOf(def).find((o) => o.key === journal.value)
+      const option = optionsOf(def).find((o) => o.key === journal.key)
       if (!option) return NO_REACH
-      const owed = await optionCascade(root, def, new Map([[journal.value, null]]), [option.label, null])
+      const owed = await optionCascade(root, def, new Map([[journal.key, null]]), [option.label, null])
   …
-      return (await dropOptionFromDef(root, journal.id, journal.value)).ok
+      return (await dropOptionFromDef(root, journal.id, journal.key)).ok
```

**VERIFY**

- [ ] The listed tests pass.
- [ ] `git grep -nP "journal\.(name|value)\b|op: 'delete', id: [^,]+, name:|op: 'option-remove', id: [^,]+, value:" -- Core` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-4

**TASK:** Refuse an option rename or removal while another journal record is owed, pointing to Try Again, and delete `removeOption`'s run-anyway branch.

**NOW:** `writeSchemaJournal` answers false when the slot holds a different record or can't be read (`Core/Properties/journalSlot.ts:33-41`). `renameOption` ignores the answer (`optionOps.ts`, as Task 6-3 leaves it) and still answers its record as owed; `removeOption` runs anyway and answers `journaled ? record : undefined` (`optionOps.ts:296,303`), since its replay acts only while the slot holds its record (`replaySchemaCascade.ts:82-86`). Unjournaled, a settle can adopt an owed rename's old keys back as options, which the shield can't stop, and Try Again then finds nothing to do (*MetadataV3 — Investigation*, *§Recording a Format Change*). A property rename and a delete keep running unjournaled, since their replay follows the property's id (F-1). `'busy'` is the session refusal's code alone (`Core/Contract/result.ts:44-46`), and `fault(message)` (`:41`) is the one spelling of an operation that failed. `journalSlot.ts:1`'s header says the op a stranded record outranks runs unjournaled.

**CHANGE**

- [ ] Write and watch fail: `optionOps.test.ts` — a new describe *§an owed record holds option changes*: with `{ op: 'rename', id: 'prop_x', from: 'Old', to: 'New' }` held, `renameOption(root, id, 'A', 'B')` and `removeOption(root, id, 'A')` each answer `fault(OWED_MESSAGE)`, the registry still lists `A`, every holder keeps its bytes, and the held record is unchanged; `clearOption(root, id, 'A')` still strips (it writes no record); a held record identical to the one an op would write (the op re-run) doesn't refuse. `journalWiring.test.ts:305-317` passes unchanged (a delete still runs over a held record).
- [ ] `optionOps.ts`: delete `removeOption`'s `journaled` and its conditional; add `OWED`, `fault('An earlier change hasn’t reached every file yet. Use Try Again on its notice first.')`; `renameOption` and `removeOption` answer `OWED` when `writeSchemaJournal` answers false, before any commit or sweep; `removeOption` answers `schemaCascade(reach, record)`.
- [ ] `journalSlot.ts:1`: the header says the op now starting runs unjournaled or refuses, as its owner decides.

**AFTER**

```Core/Properties/optionOps.ts diff
@@ constants @@
 const NO_GROUP = fail('not-found', 'That group no longer exists.')
+const OWED = fault('An earlier change hasn’t reached every file yet. Use Try Again on its notice first.')
@@ renameOption @@
     // Staged BEFORE the commit: a crash between commit and cascade is recoverable only from this record, and one stranded by a refusal is disposed of by the replay's holds-to-and-not-from gate.
-    await writeSchemaJournal(root, record)
+    if (!(await writeSchemaJournal(root, record))) return OWED
@@ removeOption @@
     const record: SchemaJournal = { op: 'option-remove', id: propertyId, key }
-    const journaled = await writeSchemaJournal(root, record)
+    if (!(await writeSchemaJournal(root, record))) return OWED
     const reach = await optionCascade(root, def, new Map([[key, null]]), [label, null])
     …
-    return ok(schemaCascade(reach, journaled ? record : undefined))
+    return ok(schemaCascade(reach, record))
```

```Core/Properties/journalSlot.ts diff
@@ header @@
-// A write displaces nothing it can't read and no different stranded record — its owed heal outranks the op now starting, which runs unjournaled — while a corrupt slot is set aside by the next write, and a clear lands only for the caller's own record.
+// A write displaces nothing it can't read and no different stranded record — its owed heal outranks the op now starting, which runs unjournaled or refuses, as its owner decides — while a corrupt slot is set aside by the next write, and a clear lands only for the caller's own record.
```

**VERIFY**

- [ ] The listed tests pass; `optionOps.test.ts`' *§a removal with a page skip* and *§a pass skip holds the drop and the journal* pass unchanged.
- [ ] `git grep -nw "journaled" -- Core/Properties/optionOps.ts` finds nothing.
- [ ] Run the gates, then `view-delta` for Phase 6.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, reading outward: no file sweep, cache edit, or replay gate reads a label, and no configuration arm reads a key; a key change with no label pair writes no saved view, tile, Matrix filter, or preview rule, and a label change with no key pair writes no page or Space; every list edit goes through the one map-taking `editList`, and a list it names nothing in comes back null; Clear, Remove, and rename edit the caches of every Collection they can write, a damaged Collection counted once by the configuration pass on a rename or a Remove and not on a Clear, as page-rename leaves it, and a cleared value doesn't return at the next assign; every record carries keys, `same` and the decoder agree on the four shapes, and each replay arm acts only on the state its record maps; an option rename or removal refuses over a different owed record while a property rename and a delete still run; the shield covers every old key of an owed rename.

### Phase 7A — The Converter and the Key Format

**GOAL:** One converter, `Core/Properties/keyFormat.ts`, writes a key from a label under `Match Title` or any of the nine conventions (B-2, B-5, B-6), and a property's Key Format decides its key: a create and a rename write `key = formatKey(label, key_format)`, the create's step-aside clears both words (D-1), and a Key Format change runs the rename path with the new key, refused where a rename onto that key would be (F-1, D-1). It's a separate phase from 7B because the property key and the option keys are two halves with their own paths, records, and tests: 7A rides the rename record and the property sweep, and 7B the option-rename record, the option cascade, adoption, and the renderer. No task here is a pure removal; within each task the CHANGE list removes before it adds, and Task 7A-3's hoist replaces `renameProperty`'s body rather than adding beside it.

#### Task 7A-1

**TASK:** Add the converter: `KEY_FORMATS` with `Match Title` first, `KeyFormat`, `DEFAULT_KEY_FORMAT`, `isKeyFormat`, and `formatKey(label, format)`, splitting and casing per B-5 and B-6 and the Investigation's must-dos.

**NOW:** Nothing in the tree splits a free-typed title into words or re-cases one by convention (*MetadataV3 — Investigation*, *§The Case-Conversion Module*). `capitalize` (`UIX/Utilities/capitalize.ts:1`) uppercases a first character and leaves the rest, which B-6's `UrlSlug` can't use; `toKebabIconId` (`UIX/Symbols/iconRoster.ts:4-11`) splits digits from letters for icon ids, which B-5 doesn't want (`v5.0` stays one word); `foldKey` (`Core/Paths/caseFold.ts:7`) only folds. The link-format list is the shape to copy: `LINK_DISPLAYS` as a tuple, `DEFAULT_LINK_DISPLAY = LINK_DISPLAYS[0]`, `isLinkDisplay` (`Core/Properties/properties.ts:106-112`). JavaScript's case methods change length on `ß` and `ﬁ`, and lowercasing a sliced remainder loses final sigma; an NFD label doesn't hump after a combining mark (*§The Converter Against Real Titles*).

**CHANGE**

- [ ] Write and watch fail: `Core/Properties/keyFormat.test.ts` (new) — `KEY_FORMATS` is the ten in B-2's order with `Match Title` first, and `DEFAULT_KEY_FORMAT` is `'Match Title'`; `formatKey('Due Date')` (no format) is `'Due Date'`; B-5: `formatKey('v5.0', 'kebab-case')` is `'v5.0'`, `formatKey('J. Crew', 'kebab-case')` is `'j.-crew'`, `formatKey('New Property', 'lowercase')` is `'new property'`, `formatKey('Due-Date', 'lowercase')` is `'due-date'`; the humps: `formatKey('IPhone', 'kebab-case')` is `'i-phone'`, `formatKey('XMLHttp', 'kebab-case')` is `'xml-http'`, `formatKey('iPhone 17', 'PascalCase')` is `'IPhone17'` and converts to itself, `formatKey('A B Test', 'camelCase')` is `'aBTest'` and converts to itself; B-6: `URL Slug` is `UrlSlug`, `urlSlug`, `Url-Slug`, `url_slug`, `URL_SLUG`, and `URL-SLUG` under `PascalCase`, `camelCase`, `Train-Case`, `snake_case`, `UPPER_SNAKE_CASE`, and `UPPER-KEBAB-CASE`; B-6's adoption table: the formats leaving `Red` unchanged are exactly `['Match Title', 'PascalCase', 'Train-Case']`, `RED` exactly `['Match Title', 'UPPERCASE', 'UPPER_SNAKE_CASE', 'UPPER-KEBAB-CASE']`, and `green` exactly `['Match Title', 'lowercase', 'kebab-case', 'camelCase', 'snake_case']`; D-1's example: `formatKey('Heading Icon Hidden', 'snake_case')` is `'heading_icon_hidden'`; `ß`: `formatKey('Straße', 'UPPERCASE')` is `'STRASSE'` and `formatKey('Straße', 'lowercase')` is `'straße'`; final sigma: `formatKey('ΑΣ Σ', 'PascalCase')` is `'ΑςΣ'`; NFD: `formatKey('CaféBar', 'kebab-case')` is `'café-bar'`, equal to the NFC label's; the round-trip exception: `formatKey('J. Crew', 'PascalCase')` is `'J.Crew'` and `formatKey('J.Crew', 'PascalCase')` is `'J.crew'`; an all-separator label: `formatKey('---', 'kebab-case')` is `''` and `formatKey('---', 'lowercase')` is `'---'`; `isKeyFormat('kebab-case')` is true and `isKeyFormat('Kebab')` and `isKeyFormat(undefined)` are false.
- [ ] `Core/Properties/keyFormat.ts` (new): the module below, importing nothing, so the engine, the Trash, and the renderer all reach it (`Core/Contract/engineGraph.test.ts` stays green).

**AFTER**

```Core/Properties/keyFormat.ts diff
@@ keyFormat.ts @@
+export const KEY_FORMATS = [
+  'Match Title',
+  'lowercase',
+  'UPPERCASE',
+  'kebab-case',
+  'PascalCase',
+  'camelCase',
+  'snake_case',
+  'Train-Case',
+  'UPPER_SNAKE_CASE',
+  'UPPER-KEBAB-CASE',
+] as const
+export type KeyFormat = (typeof KEY_FORMATS)[number]
+
+export const DEFAULT_KEY_FORMAT: KeyFormat = KEY_FORMATS[0]
+
+export const isKeyFormat = (v: unknown): v is KeyFormat =>
+  (KEY_FORMATS as readonly unknown[]).includes(v)
+
+const LOWER = /\p{Ll}/u
+const UPPER = /\p{Lu}/u
+
+/** A label's words: split at spaces, hyphens, and underscores, before an uppercase letter that follows a lowercase one, and before one that follows an uppercase letter and precedes a lowercase one (`XMLHttp` is `XML` and `Http`); every other mark stays inside its word. */
+function splitWords(label: string): string[] {
+  const words: string[] = []
+  for (const chunk of label.split(/[\s_-]+/)) {
+    const chars = Array.from(chunk)
+    let word = ''
+    for (const [i, c] of chars.entries()) {
+      const prev = chars[i - 1] ?? ''
+      const hump = LOWER.test(prev) || (UPPER.test(prev) && LOWER.test(chars[i + 1] ?? ''))
+      if (UPPER.test(c) && hump) {
+        words.push(word)
+        word = ''
+      }
+      word += c
+    }
+    if (word) words.push(word)
+  }
+  return words
+}
+
+const lower = (w: string): string => w.toLowerCase()
+const upper = (w: string): string => w.toUpperCase()
+
+const capital = (w: string): string => {
+  const [first = '', ...rest] = Array.from(w.toLowerCase())
+  return first.toUpperCase() + rest.join('')
+}
+
+const joined =
+  (separator: string, word: (w: string, i: number) => string) =>
+  (label: string): string =>
+    splitWords(label).map(word).join(separator)
+
+const FORMAT: Record<KeyFormat, (label: string) => string> = {
+  'Match Title': (label) => label,
+  lowercase: lower,
+  UPPERCASE: upper,
+  'kebab-case': joined('-', lower),
+  PascalCase: joined('', capital),
+  camelCase: joined('', (w, i) => (i ? capital(w) : lower(w))),
+  snake_case: joined('_', lower),
+  'Train-Case': joined('-', capital),
+  UPPER_SNAKE_CASE: joined('_', upper),
+  'UPPER-KEBAB-CASE': joined('-', upper),
+}
+
+export const formatKey = (label: string, format: KeyFormat = DEFAULT_KEY_FORMAT): string =>
+  FORMAT[format](label.normalize('NFC')).normalize('NFC')
```

**VERIFY**

- [ ] The listed tests pass.
- [ ] The corpus check, read-only and not committed: write `corpus-check.mjs` to the session scratchpad exactly as below, run `node <scratchpad>/corpus-check.mjs 2>/dev/null` from the repo root (Node 24 strips the types of the import-free `keyFormat.ts` it imports; stderr carries only Node's module-type warning), read its output, then delete the script. It reads both Nexuses' property labels, option labels, Context titles, and Space titles in the shape Task 5B-4 rewrote, converts each unique one under all ten formats through the real `formatKey`, and prints the label count, the unique count, the conversions, and each miss. The check passes only when every miss is a `PascalCase` or `camelCase` label whose word ends in a digit, a mark, or a capital (B-5's INFERRED exception); at drafting the misses were `["J. Crew","PascalCase","J.Crew","J.crew"]` and `["J. Crew","camelCase","j.Crew","j.crew"]`.

```corpus-check.mjs
import { readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const { formatKey, KEY_FORMATS } = await import(
  pathToFileURL(join(process.cwd(), 'Core', 'Properties', 'keyFormat.ts')).href
)
const json = (...p) => JSON.parse(readFileSync(join(...p), 'utf8'))
const labels = []
for (const nexus of ['NexusOS', 'Test'].map((n) => join(homedir(), n))) {
  for (const d of Object.values(json(nexus, '.nexus', 'properties.json').defs)) {
    labels.push(d.label ?? d.key)
    for (const o of [...(d.select_options ?? []), ...(d.status_groups ?? []).flatMap((g) => g.options)])
      labels.push(o.label ?? o.key)
  }
  for (const { title } of json(nexus, '.nexus', 'contexts', 'contexts.json').contexts) {
    labels.push(title)
    for (const s of readdirSync(join(nexus, '.nexus', 'contexts', title), { withFileTypes: true }))
      if (s.isDirectory()) labels.push(s.name)
  }
}
const unique = [...new Set(labels)]
const misses = unique.flatMap((label) =>
  KEY_FORMATS.flatMap((f) => {
    const key = formatKey(label, f)
    return formatKey(key, f) === key ? [] : [[label, f, key, formatKey(key, f)]]
  }),
)
console.log(labels.length, unique.length, unique.length * KEY_FORMATS.length, misses.length)
for (const miss of misses) console.log(JSON.stringify(miss))
```
- [ ] `git grep -n "from '" -- Core/Properties/keyFormat.ts` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 7A-2

**TASK:** Give the definition its `key_format` field, and make a create write its key from the landed label through the Key Format, stepping the label aside until neither the label nor the key it writes is held; `editProperty` can't reach the format.

**NOW:** `propertyDefinitionFields` (`Core/Properties/properties.ts:169-199`, after Phase 5A: `id`, `key`, `label`, `type`, …) holds `link_display: z.enum(LINK_DISPLAYS).optional().catch(undefined)` (`:178`), absent reading as its default at each reader. `createProperty(root, def: PropertyDraft)` (`Core/Properties/registryProperty.ts:46-78`, as Phases 5A and 6 leave it) lands `freeName(exactTitle(def.label), defs.map((d) => d.label))` and writes it as both words (`{ ...def, label: landed, key: landed, … }`), and its supersede clears a delete record when `journal.key === landed`. `freeName` (`Core/Paths/names.ts:56-64`) steps one word aside over a held list by fold. Stepping aside over labels alone can't see a held key: a create labelled `Stage` beside `{ label: 'Phase', key: 'stage' }` refuses `KEY_REFUSAL.duplicateKey` rather than stepping aside, and under a format `Name (2)` writes `name-(2)` (*MetadataV3 — Investigation*, *§Uniqueness and Collisions*). `editProperty`'s changes omit `id`, `label`, and `key` (`registryProperty.ts:156-161`, after Phase 5A); every `defEditOp` narrower already names its own fields (`Core/Properties/handlers.ts:121-134,165-176`), so no channel can send a format through it today. `schema:add` decodes `propertyDraft`, which keeps a payload's unknown fields loose, so a caller's `key` rides in and `{ ...def, key }` overwrites it (C-2 settled for Phase 7: a channel's key is replaced).

**CHANGE**

- [ ] Write and watch fail: `registryProperty.test.ts` *§createProperty* — `createProperty(root, { id: '', label: 'Due Date', type: 'dateTime', key_format: 'snake_case' })` stores `label: 'Due Date'`, `key: 'due_date'`, `key_format: 'snake_case'`; beside `{ label: 'Name', key: 'Name' }`, a create labelled `Name` under `kebab-case` lands `label: 'Name (2)'`, `key: 'name-(2)'`; beside a stored `{ id: 'prop_d', label: 'Due', key: 'due_date', type: 'text' }` (seeded as registry JSON), a create labelled `Due Date` under `snake_case` lands `label: 'Due Date (2)'`, `key: 'due_date_(2)'`; beside a stored `{ id: 'prop_x', label: 'X', key: 'due date', type: 'text' }`, a create labelled `Due Date` under `kebab-case` lands `label: 'Due Date'`, `key: 'due-date'` (a label another definition holds only as its key isn't a held label; D-1); beside a stored `{ label: 'Phase', key: 'stage' }`, a create labelled `Stage` lands `Stage (2)` as label and key (the key `Stage` folds onto the held `stage`). `handlers.test.ts` *§the property channels*: `schema:add` given `{ id: '', label: 'Due Date', key: 'whatever', type: 'text' }` stores `key: 'Due Date'`. `propertiesRegistry.test.ts`: a stored `{ key_format: 'Shouting' }` decodes with `key_format` undefined, as `link_display` does.
- [ ] `properties.ts`: add `key_format`, `z.enum(KEY_FORMATS).optional().catch(undefined)`, beside `type`; import `KEY_FORMATS`.
- [ ] `registryProperty.ts`: replace the create's `freeName` call with `freeLabel(label, format, defs)`, which steps the label aside over every label by fold and again while the key the format writes from it folds onto a held key; the create writes `key = formatKey(label, def.key_format)`; `createProperty` holds the landed key in place of `landed`, and the supersede compares `journal.key === key`, its comment saying "key or id"; `editProperty` omits `key_format`, its doc saying so.

**AFTER**

```Core/Properties/properties.ts diff
@@ imports @@
+import { KEY_FORMATS } from './keyFormat'
@@ propertyDefinitionFields @@
   type: propertyType,
+  key_format: z.enum(KEY_FORMATS).optional().catch(undefined),
   icon: z.string().optional(),
```

```Core/Properties/registryProperty.ts diff
@@ imports @@
-import { exactTitle } from '../Paths/caseFold'
+import { exactTitle, normalizeTitle } from '../Paths/caseFold'
+import { formatKey, type KeyFormat } from './keyFormat'
@@ freeLabel @@
+function freeLabel(label: string, format: KeyFormat | undefined, defs: PropertyDefinition[]): string {
+  const labels = defs.map((d) => d.label)
+  const keys = new Set(defs.map((d) => normalizeTitle(d.key)))
+  let free = freeName(label, labels)
+  while (keys.has(normalizeTitle(formatKey(free, format)))) {
+    labels.push(free)
+    free = freeName(free, labels)
+  }
+  return free
+}
+
@@ createProperty @@
-  let landed = ''
+  let key = ''
   const created = await mutateRegistry<Result<{ id: string }>>(root, (registry) => {
     const defs = Object.values(registry.defs)
-    landed = freeName(
-      exactTitle(def.label),
-      defs.map((d) => d.label),
-    )
-    const candidate = seeded({ ...def, label: landed, key: landed, id: def.id || mintPropertyId() })
+    const label = freeLabel(exactTitle(def.label), def.key_format, defs)
+    key = formatKey(label, def.key_format)
+    const candidate = seeded({ ...def, label, key, id: def.id || mintPropertyId() })
     const v = validateDefinition(candidate, defs)
   …
-  // A landed create wearing a journaled delete's name or id supersedes the record, or a later replay would strip the living property. Only after commit: a refused create must not spend a record it never displaced.
+  // A landed create wearing a journaled delete's key or id supersedes the record, or a later replay would strip the living property. Only after commit: a refused create must not spend a record it never displaced.
   …
-      (journal.key === landed || journal.id === created.value.id)
+      (journal.key === key || journal.id === created.value.id)
@@ editProperty @@
-/** Every definition edit but the label and key, which are renameProperty's since the key cascades into every page. */
+/** Every definition edit but the label, the key, and the Key Format, which ride the rename path since each rewrites the key in every file. */
 export function editProperty(
   root: string,
   propertyId: string,
-  changes: Omit<Partial<PropertyDefinition>, 'id' | 'label' | 'key'>,
+  changes: Omit<Partial<PropertyDefinition>, 'id' | 'label' | 'key' | 'key_format'>,
 ): Promise<Result<null>> {
```

**VERIFY**

- [ ] The listed tests pass; `restoreProperty.test.ts:168` (a restored record's label and key both `Priority (2)`) and `registryProperty.test.ts:78` (a create labelled `priority` beside `Priority` lands `priority (2)`) pass unchanged.
- [ ] `git grep -n "freeName(" -- Core/Properties` lists only `freeLabel`'s two calls.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 7A-3

**TASK:** Hoist `renameProperty`'s body into one rekey that a rename and a Key Format change both enter, writing the key through the Key Format, with the rename sweep taking keys; add the `property:setKeyFormat` channel.

**NOW:** `renameProperty(root, propertyId, name)` (`Core/Properties/registryProperty.ts:110-154`, as Phases 2A, 5A, and 6 leave it) trims the label (`exactTitle`), no-ops on `to === prior.label`, validates `{ label: to, key: to }` before the journal and again inside the commit, skips the clash check when `to === prior.key`, refuses through `bothKeyHolders` and `KEY_REFUSAL.held(prior.key, to, n)`, journals `{ op: 'rename', id, from: prior.key, to }` unconditionally before the commit, commits `{ ...current, label: to, key: to }`, sweeps only when the committed `from` differs from `def.key`, and answers `{ from, to: def.key, … }`. `renameSweep(root, oldKey, def)` (`:82-98`, after Phase 1: sidecars through `rekeyHeld` alone) queries `keyHolderFiles` by the old key and sweeps `{ text, sidecars }`; its callers are `renameProperty` and the rename replay (`Core/Properties/replaySchemaCascade.ts:55`, `renameSweep(root, journal.from, def)`). Phase 4 left `sweepCount(root, files, plan)` and the exported `SweepPlan` (`Core/Properties/governedSweep.ts`), and `deletePlan` beside `stripAndRemove` (`Core/Properties/deleteProperty.ts`) as the plan-builder precedent. `property:rename` is `registryChannel(idAndValue, renameProperty)` with the default reply (`Core/Properties/handlers.ts:157`); the bridge declares it at `Core/Contract/bridge.ts:147-150`. The rename replay sweeps from `journal.from` to the definition's current key while no definition holds `from` (Phase 2A), which serves a Key Format change's record unchanged.

**CHANGE**

- [ ] Write and watch fail: `registryProperty.test.ts`, a new describe *§a Key Format change is a rename of the key*: with `Tags` (Match Title) assigned to `Col`, a page holding `Tags: [a]` between two other keys and a Space holding `Tags: ['b']`, `setKeyFormat(root, id, 'lowercase')` stores `{ label: 'Tags', key: 'tags', key_format: 'lowercase' }`, the page reads `tags: [a]` on the same line, the Space holds `tags: ['b']`, the journal is null, and it answers `ok` with `from: 'Tags'` and `to: 'tags'`; under `Heading Icon Hidden`, `setKeyFormat(root, id, 'snake_case')` refuses `KEY_REFUSAL.reserved('heading_icon_hidden')` and the registry, the holders, and the journal are unchanged; beside `{ label: 'Due_Date', key: 'Due_Date' }`, `Due Date` under `snake_case` refuses `KEY_REFUSAL.duplicateKey('due_date')`; under a property labelled `---`, `kebab-case` refuses `KEY_REFUSAL.empty`; with a page holding both `Tags: [a]` and `tags: [b]`, `lowercase` refuses `KEY_REFUSAL.held('Tags', 'tags', 1)` and stages no journal; `setKeyFormat(root, id, 'Match Title')` on a definition already storing `key_format: 'Match Title'` answers `ok(null)` and writes nothing; under `{ label: 'Tags', key: 'tags', key_format: 'lowercase' }`, `renameProperty(root, id, 'Labels')` writes `key: 'labels'` and moves the page's `tags:` to `labels:`, and `renameProperty(root, id, 'TAGS')` writes `label: 'TAGS'`, keeps `key: 'tags'`, leaves the page byte-identical, and answers `from` and `to` both `'tags'`. `handlers.test.ts` *§the property channels*: `property:setKeyFormat` with `'Shouting'` answers the `NEEDS_ID_AND_VALUE` fault. `replaySchemaCascade.test.ts`: an owed `{ op: 'rename', id, from: 'Tags', to: 'tags' }` over a definition storing `key: 'tags'` sweeps a page's `Tags:` to `tags:` and clears. `renameSweep.test.ts`: every call, as Phase 2A leaves the file, passes the new key in place of the definition (`renameSweep(root, 'Status', stage)` becomes `renameSweep(root, 'Status', 'Stage')`), every expectation unchanged, and the `stage` fixture (`:12`) and the `PropertyDefinition` import go, since no call reads them.
- [ ] `registryProperty.ts`: delete `renameProperty`'s body; add `retitled(def, change)` (the definition with `change` applied and its key written from its label through its Key Format), `rekeyPlan(root, propertyId, change)` (the prior definition and the moved one, or the refusal, or null when neither the label nor the Key Format moves), and `rekeyProperty(root, propertyId, change)` (the journal, the commit re-checking `validateName` on `retitled(current, change)`, and the sweep); `renameProperty` enters it with `{ label: exactTitle(label) }` and `setKeyFormat` with `{ key_format }`; `renameSweep(root, from, to)` takes keys.
- [ ] `replaySchemaCascade.ts:55`: `renameSweep(root, journal.from, def.key)`.
- [ ] `handlers.ts`: add `idAndFormat` and `'property:setKeyFormat': registryChannel(idAndFormat, setKeyFormat)`; `bridge.ts`: declare `'property:setKeyFormat'`, and `property:rename`'s reply keeps `PropertyRename | null`.

**AFTER**

```Core/Properties/registryProperty.ts diff
@@ renameSweep @@
-export async function renameSweep(
-  root: string,
-  oldKey: string,
-  def: PropertyDefinition,
-): Promise<number> {
+export async function renameSweep(root: string, from: string, to: string): Promise<number> {
   // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too.
-  const files = await keyHolderFiles(root, oldKey, await collectionFolders(root))
+  const files = await keyHolderFiles(root, from, await collectionFolders(root))
   const text = (content: string): string | null =>
-    renameFrontmatterKey(content, oldKey, def.key, NEW_KEY_IS_FRESHER)
-  const rekey: Rewrite = (raw) => rekeyHeld(raw, oldKey, def.key, NEW_KEY_IS_FRESHER)
+    renameFrontmatterKey(content, from, to, NEW_KEY_IS_FRESHER)
+  const rekey: Rewrite = (raw) => rekeyHeld(raw, from, to, NEW_KEY_IS_FRESHER)
   const swept = await sweepGovernedRoots(root, files, { text, sidecars: rekey })
   return swept.skipped.length
 }
@@ retitled @@
+type Retitle = Pick<PropertyDefinition, 'label'> | Pick<PropertyDefinition, 'key_format'>
+
+const retitled = (def: PropertyDefinition, change: Retitle): PropertyDefinition => {
+  const next = { ...def, ...change }
+  return { ...next, key: formatKey(next.label, next.key_format) }
+}
+
+async function rekeyPlan(
+  root: string,
+  propertyId: string,
+  change: Retitle,
+): Promise<Result<{ prior: PropertyDefinition; moved: PropertyDefinition } | null>> {
+  const { defs } = await readRegistry(root)
+  const prior = defs[propertyId]
+  if (!prior) return NO_PROPERTY
+  const moved = retitled(prior, change)
+  if (moved.label === prior.label && moved.key_format === prior.key_format) return ok(null)
+  const named = validateName(moved, Object.values(defs), propertyId)
+  if (!named.ok) return named
+  // A file holding only the new key is adopted, its value going live as a create's would; one holding both would lose its old value.
+  const clashes = moved.key === prior.key ? [] : await bothKeyHolders(root, prior.key, moved.key)
+  if (clashes.length)
+    return fail('invalid-property', KEY_REFUSAL.held(prior.key, moved.key, clashes.length))
+  return ok({ prior, moved })
+}
+
@@ renameProperty @@
-/** Validated before the journal and again on the registry it commits to, since a create can land between the two. The journal is staged BEFORE the commit: registry-first ordering means a crash between commit and sweep is recoverable from nowhere else, so the old name survives only there. */
-export function renameProperty(
-  root: string,
-  propertyId: string,
-  name: string,
-): Promise<Result<PropertyRename | null>> {
-  const to = exactTitle(name)
-  return serializeSchemaOp(root, async () => {
-    const { defs } = await readRegistry(root)
-    const prior = defs[propertyId]
-    if (!prior) return NO_PROPERTY
-    if (to === prior.label) return ok(null)
-    const named = validateName({ label: to, key: to }, Object.values(defs), propertyId)
-    if (!named.ok) return named
-    // A file holding only the new key is adopted, its value going live as a create's would; one holding both would lose its old value.
-    const clashes = to === prior.key ? [] : await bothKeyHolders(root, prior.key, to)
-    if (clashes.length)
-      return fail('invalid-property', KEY_REFUSAL.held(prior.key, to, clashes.length))
-    const record: SchemaJournal = { op: 'rename', id: propertyId, from: prior.key, to }
-    await writeSchemaJournal(root, record)
+/** Validated before the journal and again on the registry it commits to, since a create can land between the two. The journal is staged BEFORE the commit: registry-first ordering means a crash between commit and sweep is recoverable from nowhere else, so the old key survives only there. */
+function rekeyProperty(
+  root: string,
+  propertyId: string,
+  change: Retitle,
+): Promise<Result<PropertyRename | null>> {
+  return serializeSchemaOp(root, async () => {
+    const planned = await rekeyPlan(root, propertyId, change)
+    if (!planned.ok) return planned
+    if (!planned.value) return ok(null)
+    const { prior, moved } = planned.value
+    const record: SchemaJournal = { op: 'rename', id: propertyId, from: prior.key, to: moved.key }
+    await writeSchemaJournal(root, record)
     const edit = await mutateRegistry<Result<{ from: string; def: PropertyDefinition }>>(
       root,
       (registry) => {
         const current = registry.defs[propertyId]
         if (!current) return { result: NO_PROPERTY }
-        const v = validateName({ label: to, key: to }, Object.values(registry.defs), propertyId)
+        const def = retitled(current, change)
+        const v = validateName(def, Object.values(registry.defs), propertyId)
         if (!v.ok) return { result: v }
-        const def = { ...current, label: to, key: to }
         return {
           next: { ...registry, defs: { ...registry.defs, [propertyId]: def } },
           result: ok({ from: current.key, def }),
         }
       },
     )
     if (!edit.ok) {
       await clearSchemaJournal(root, record)
       return edit
     }
     const { from, def } = edit.value
-    const skipped = from === def.key ? 0 : await renameSweep(root, from, def)
+    const skipped = from === def.key ? 0 : await renameSweep(root, from, def.key)
     if (!skipped) await clearSchemaJournal(root, record)
     return ok({ from, to: def.key, ...schemaCascade({ skipped, hosts: [] }, record) })
   })
 }
+
+export const renameProperty = (
+  root: string,
+  propertyId: string,
+  label: string,
+): Promise<Result<PropertyRename | null>> =>
+  rekeyProperty(root, propertyId, { label: exactTitle(label) })
+
+export const setKeyFormat = (
+  root: string,
+  propertyId: string,
+  key_format: KeyFormat,
+): Promise<Result<PropertyRename | null>> => rekeyProperty(root, propertyId, { key_format })
```

```Core/Properties/replaySchemaCascade.ts diff
@@ rename @@
-      return { skipped: await renameSweep(root, journal.from, def), hosts: [] }
+      return { skipped: await renameSweep(root, journal.from, def.key), hosts: [] }
```

```Core/Properties/handlers.ts diff
@@ imports @@
+import { isKeyFormat, type KeyFormat } from './keyFormat'
 import {
   createProperty,
   editProperty,
   removeFromRegistry,
   renameProperty,
   reorderRegistry,
+  setKeyFormat,
 } from './registryProperty'
@@ idAndFormat @@
+const idAndFormat = ([id, format]: unknown[]): [string, KeyFormat] | Result<never> =>
+  typeof id === 'string' && isKeyFormat(format) ? [id, format] : NEEDS_ID_AND_VALUE
+
@@ propertiesHandlers @@
   'property:rename': registryChannel(idAndValue, renameProperty),
+  'property:setKeyFormat': registryChannel(idAndFormat, setKeyFormat),
```

```Core/Contract/bridge.ts diff
@@ imports @@
+import type { KeyFormat } from '../Properties/keyFormat'
@@ property:rename @@
   'property:rename': {
     args: [propertyId: string, label: string]
     reply: Result<PropertyRename | null>
   }
+  'property:setKeyFormat': {
+    args: [propertyId: string, format: KeyFormat]
+    reply: Result<PropertyRename | null>
+  }
```

**VERIFY**

- [ ] The listed tests pass; `registryProperty.test.ts:142-196` (adoption of a held key, the case-only rename Phase 2A inverted, the both-keys refusal), `settle.test.ts`' rename cases, `replaySchemaCascade.test.ts`' chained-rename case, and `handlers.test.ts`' *§a property rename* pass unchanged.
- [ ] `git grep -n "renameSweep(" -- Core ':!*.test.ts'` lists `rekeyProperty` and the replay, each passing two keys.
- [ ] Run the gates, then `view-delta` for Phase 7A.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, reading outward: `formatKey` holds B-5 and B-6 and the must-dos (NFC before the split and after the case, `\p{Lu}`/`\p{Ll}` humps, upper-upper-lower, whole-word lowercasing, non-locale case methods) and imports nothing; every write of a property label (the create, the property restore through it, the rename) writes its key through the Key Format, and a caller's key never survives a create; the step-aside keeps the label free among labels and its key free among keys; a Key Format change and a rename share one rekey, one record shape, one clash check, one sweep, and one replay; a refusal (reserved, duplicate, empty, held both) leaves the registry, the holders, and the journal as they were; `editProperty` can't reach a format.

### Phase 7B — The Value Format, Adoption, and the Rows

**GOAL:** Every option's key is written from its label through the property's Value Format wherever a label is written: seeded, added, and renamed options alike, while a create keeps the keys it's handed (C-2), and a Value Format change re-keys every option at once through the one rekey an option rename enters, refused when two options would share a key or one would take a key another holds before the change, journaled as one key-only record, and cascading through files and caches with no configuration pass (D-2, F-1, F-2). Adoption takes only words the Value Format could have produced (E-1). The two settings rows sit at the top of every property's settings with H-1's hints, and a format change confirms with the count of items it rewrites, silent at one or fewer (F-4, H-1). It's a separate phase because it rides the option cascade and the renderer, after 7A gave the definition its fields and the converter. Its removal lines lead each CHANGE list; no task is a pure removal.

#### Task 7B-1

**TASK:** Give the definition its `value_format`, key every option through it where an option's label is written (a seed, an added option, and an option label rename), and let an option rename enter one record-driven `rekeyOptions`, which Task 7B-2's Value Format change enters too; a create keeps the option keys it's handed, and an adopted word stays its own label and key.

**NOW:** `seeded(def)` (`Core/Properties/registryProperty.ts:33-44`) fills an undefined `status_groups` or `select_options` with `defaultStatusSeed()` or `defaultSelectSeed()` (`Core/Properties/properties.ts:323-348`, keys equal to labels after Phase 5B), on create and on every `editProperty`, which is how a type changed outside the app gets its seed (C-2 INFERRED). A create keeps the options its draft carries as they come, and a property restore hands its record's definition through that create (`Core/Trash/restoreProperty.ts:38-41`) before `refillValues` decodes the record's values against it (`Core/Properties/assignment.ts:48-66`), so a create that re-keyed a hand-keyed option would leave its values unrestored. `addOption(groups, groupId, title, atIndex?)` (`Core/Properties/optionModel.ts:25-37`) mints `{ key: title, label: title, group_id }`, from `applyOptionEdit`'s `add` arm (`:80`), whose one caller is `editOption` (`Core/Properties/optionOps.ts:80-82`), and from adoption (`optionOps.ts:138`). `renameOption(groups, label, to)` (`optionModel.ts:39-45`) writes `{ label: to, key: to }`; its one caller is `optionOps.renameOption` (`:15,237`), which, as Phase 6 leaves it, resolves the option, journals `{ op: 'option-rename', id, keys: key === newLabel ? [] : [[key, newLabel]], labels: [oldLabel, newLabel] }` or refuses `OWED`, commits through `editStoredOptions` and `validateOptionValues`, clears the record on a refusal, cascades `new Map(record.keys)` with `record.labels`, clears it when nothing was skipped, and answers `schemaCascade`. The live cascade and the replay already run from the record alone; the commit is the one half that doesn't.

**CHANGE**

- [ ] Write and watch fail: `registryProperty.test.ts` *§createProperty* — a Status created with `value_format: 'kebab-case'` seeds options `{ key: 'open', label: 'Open' }`, `{ key: 'active', label: 'Active' }`, `{ key: 'done', label: 'Done' }`; a Select created with `value_format: 'UPPERCASE'` seeds `{ key: 'OPTION 1', label: 'Option 1' }`; a Select created under `kebab-case` with `select_options: [{ key: 'x', label: 'Light Blue' }]` stores `{ key: 'x', label: 'Light Blue' }` (a create keeps the keys it's handed, C-2 INFERRED). *§renameProperty and editProperty*: a stored `{ id, label: 'Kind', key: 'Kind', type: 'select', value_format: 'lowercase' }` with no `select_options` (seeded as registry JSON), edited with `editProperty(root, id, { icon: 'tag' })`, stores `select_options: [{ key: 'option 1', label: 'Option 1' }]`. `restoreProperty.test.ts`: a deleted Select holding `{ key: 'wip', label: 'In Progress' }` under Match Title, with a page holding `wip`, restores with `key: 'wip'` and refills the page. `propertiesRegistry.test.ts`: a stored `{ value_format: 'Shouting' }` decodes with `value_format` undefined. `optionOps.test.ts` *§editOption*: under `kebab-case`, `{ op: 'add', groupId: 'select', title: 'Light Blue' }` stores `{ key: 'light-blue', label: 'Light Blue' }`. *§renameOption*: under `kebab-case`, an adopted `{ key: 'in-progress', label: 'in-progress' }` held by a page and named by a view, renamed to `In Progress`, stores `{ key: 'in-progress', label: 'In Progress' }`, leaves the page byte-identical (its `mtimeMs` too), and rewrites the view's operand to `In Progress` (E-1); `Light Blue` renamed to `Dark Blue` under `kebab-case` rewrites a page's `light-blue` to `dark-blue`. `optionModel.test.ts:29-47`: `addOption(groups, 'upcoming', 'Triage', 'triage', 0)` mints `{ key: 'triage', label: 'Triage', group_id: 'upcoming' }` and `addOption(groups, 'upcoming', 'Backlog', 'Backlog')` mints its pair; the `renameOption` cases go with their subject.
- [ ] `optionModel.ts`: delete `renameOption`; `addOption(groups, groupId, label, key, atIndex?)` mints `{ key, label, group_id }`; `applyOptionEdit(groups, e, format?)` keys an added option `formatKey(e.title, format)`.
- [ ] `properties.ts`: add `value_format`, `z.enum(KEY_FORMATS).optional().catch(undefined)`, beside `key_format`.
- [ ] `registryProperty.ts`: add `withOptionKeys(def)` beside `seeded`, its one reader, writing each option's key from its label through the Value Format; `seeded` keys each seed through it; `editProperty` omits `value_format` beside `key_format`, its doc naming the formats.
- [ ] `optionOps.ts`: delete the `renameOption as renameInGroups` import; `editOption` passes `def.value_format` to `applyOptionEdit`; adoption adds `addOption(g, SELECT_GROUP, v, v)`; add `rekeyOptions(root, record)`, holding what `renameOption`'s body held after its resolve: the journal write (refusing `OWED`), a commit re-keying every stored option through `record.keys` and, with `record.labels`, relabelling the option its old label names (refusing a gone definition, a type without options, `NO_OPTION` when no option holds the old label, and `validateOptionValues`), the clear on a refusal, `optionCascade(root, def, new Map(record.keys), record.labels)`, and the clear when nothing was skipped; `renameOption` resolves the option, writes `to = formatKey(newLabel, def.value_format)`, and enters `rekeyOptions` with `keys: key === to ? [] : [[key, to]]` and `labels: [oldLabel, newLabel]`.

**AFTER**

```Core/Properties/optionModel.ts diff
@@ imports @@
+import { formatKey, type KeyFormat } from './keyFormat'
@@ addOption @@
 export function addOption(
   groups: StatusGroup[],
   groupId: string,
-  title: string,
+  label: string,
+  key: string,
   atIndex?: number,
 ): StatusGroup[] {
   return groups.map((g) => {
     if (g.id !== groupId) return g
-    const next = { key: title, label: title, group_id: g.id }
+    const next = { key, label, group_id: g.id }
@@ renameOption @@
-export function renameOption(
-  groups: StatusGroup[],
-  label: string,
-  to: string,
-): StatusGroup[] {
-  return mapOption(groups, label, (o) => ({ ...o, label: to, key: to }))
-}
-
@@ applyOptionEdit @@
-export function applyOptionEdit(groups: StatusGroup[], e: OptionEdit): StatusGroup[] {
+export function applyOptionEdit(groups: StatusGroup[], e: OptionEdit, format?: KeyFormat): StatusGroup[] {
   switch (e.op) {
     case 'add':
-      return addOption(groups, e.groupId, e.title, e.atIndex)
+      return addOption(groups, e.groupId, e.title, formatKey(e.title, format), e.atIndex)
```

```Core/Properties/properties.ts diff
@@ propertyDefinitionFields @@
   key_format: z.enum(KEY_FORMATS).optional().catch(undefined),
+  value_format: z.enum(KEY_FORMATS).optional().catch(undefined),
```

```Core/Properties/registryProperty.ts diff
@@ imports @@
   defaultStatusSeed,
   defaultSelectSeed,
   KEY_REFUSAL,
+  optionGroupsOf,
   PROPERTY_TYPES,
   type PropertyDefinition,
   type PropertyDraft,
+  withOptionGroups,
 } from './properties'
@@ withOptionKeys @@
+const withOptionKeys = (def: PropertyDefinition): PropertyDefinition =>
+  withOptionGroups(
+    def,
+    optionGroupsOf(def).map((g) => ({
+      ...g,
+      options: g.options.map((o) => ({ ...o, key: formatKey(o.label, def.value_format) })),
+    })),
+  )
+
@@ seeded @@
 function seeded(def: PropertyDefinition): PropertyDefinition {
   switch (PROPERTY_TYPES[def.type].options) {
     case 'status':
-      return def.status_groups === undefined ? { ...def, status_groups: defaultStatusSeed() } : def
+      return def.status_groups === undefined
+        ? withOptionKeys({ ...def, status_groups: defaultStatusSeed() })
+        : def
     case 'select':
       return def.select_options === undefined
-        ? { ...def, select_options: defaultSelectSeed() }
+        ? withOptionKeys({ ...def, select_options: defaultSelectSeed() })
         : def
@@ editProperty @@
-/** Every definition edit but the label, the key, and the Key Format, which ride the rename path since each rewrites the key in every file. */
+/** Every definition edit but the label, the key, and the formats, which ride the rename paths since each rewrites keys in every file. */
 export function editProperty(
   root: string,
   propertyId: string,
-  changes: Omit<Partial<PropertyDefinition>, 'id' | 'label' | 'key' | 'key_format'>,
+  changes: Omit<Partial<PropertyDefinition>, 'id' | 'label' | 'key' | 'key_format' | 'value_format'>,
```

```Core/Properties/optionOps.ts diff
@@ imports @@
+import { formatKey } from './keyFormat'
 import {
   addOption,
   applyOptionEdit,
-  renameOption as renameInGroups,
   type OptionEdit,
 } from './optionModel'
@@ editOption @@
       const next = editStoredOptions(def, stored[propertyId], (groups) =>
-        applyOptionEdit(groups, e),
+        applyOptionEdit(groups, e, def.value_format),
       )
@@ registerHeldOptions @@
           const next = editStoredOptions(def, stored[id], (groups) =>
-            fresh.reduce((g, v) => addOption(g, SELECT_GROUP, v), groups),
+            fresh.reduce((g, v) => addOption(g, SELECT_GROUP, v, v), groups),
           )
@@ rekeyOptions @@
+async function rekeyOptions(
+  root: string,
+  record: Extract<SchemaJournal, { op: 'option-rename' }>,
+): Promise<Result<SchemaCascade>> {
+  // Staged BEFORE the commit: a crash between commit and cascade is recoverable only from this record, and one stranded by a refusal is disposed of by the replay's holds-to-and-not-from gate.
+  if (!(await writeSchemaJournal(root, record))) return OWED
+  const keys = new Map(record.keys)
+  const relabel = (label: string): string =>
+    record.labels && label === record.labels[0] ? record.labels[1] : label
+  const edit = await mutateRegistry<Result<PropertyDefinition>>(root, (registry, stored) => {
+    const def = registry.defs[record.id]
+    if (!def) return { result: NO_PROPERTY }
+    const typeCheck = requireOptions(def)
+    if (!typeCheck.ok) return { result: typeCheck }
+    if (record.labels && !findOption(def, record.labels[0])) return { result: NO_OPTION }
+    const next = editStoredOptions(def, stored[record.id], (groups) =>
+      groups.map((g) => ({
+        ...g,
+        options: g.options.map((o) => ({
+          ...o,
+          key: keys.get(o.key) ?? o.key,
+          label: relabel(o.label),
+        })),
+      })),
+    )
+    const check = validateOptionValues(optionsOf(next))
+    if (!check.ok) return { result: check }
+    return { next: { ...registry, defs: { ...registry.defs, [record.id]: next } }, result: ok(def) }
+  })
+  if (!edit.ok) {
+    await clearSchemaJournal(root, record)
+    return edit
+  }
+  const reach = await optionCascade(root, edit.value, keys, record.labels)
+  if (!reach.skipped) await clearSchemaJournal(root, record)
+  return ok(schemaCascade(reach, record))
+}
+
@@ renameOption @@
   return serializeSchemaOp(root, async () => {
     const r = await resolveForCascade(root, propertyId, oldLabel)
     if (!r.ok) return r
-    const { key } = r.value
-    const record: SchemaJournal = {
-      op: 'option-rename',
-      id: propertyId,
-      keys: key === newLabel ? [] : [[key, newLabel]],
-      labels: [oldLabel, newLabel],
-    }
-    // Staged BEFORE the commit: a crash between commit and cascade is recoverable only from this record, and one stranded by a refusal is disposed of by the replay's holds-to-and-not-from gate.
-    if (!(await writeSchemaJournal(root, record))) return OWED
-    const edit = await mutateRegistry<Result<PropertyDefinition>>(root, (registry, stored) => {
-      const def = registry.defs[propertyId]
-      if (!def) return { result: NO_PROPERTY }
-      const typeCheck = requireOptions(def)
-      if (!typeCheck.ok) return { result: typeCheck }
-      if (!findOption(def, oldLabel)) return { result: NO_OPTION }
-      const next = editStoredOptions(def, stored[propertyId], (groups) =>
-        renameInGroups(groups, oldLabel, newLabel),
-      )
-      const check = validateOptionValues(optionsOf(next))
-      if (!check.ok) return { result: check }
-      return {
-        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
-        result: ok(def),
-      }
-    })
-    if (!edit.ok) {
-      await clearSchemaJournal(root, record)
-      return edit
-    }
-    const reach = await optionCascade(root, edit.value, new Map(record.keys), record.labels)
-    if (!reach.skipped) await clearSchemaJournal(root, record)
-    return ok(schemaCascade(reach, record))
+    const { def, key } = r.value
+    const to = formatKey(newLabel, def.value_format)
+    return rekeyOptions(root, {
+      op: 'option-rename',
+      id: propertyId,
+      keys: key === to ? [] : [[key, to]],
+      labels: [oldLabel, newLabel],
+    })
   })
```

**VERIFY**

- [ ] The listed tests pass; `optionOps.test.ts:78` (an emptied options list isn't re-seeded by an unrelated edit), `:143-185` (blank and fold-alike stored options), every earlier rename and refusal case, and `settle.test.ts`' *§held options* registrations pass unchanged.
- [ ] `git grep -nE "addOption\([^)]*\)" -- Core ':!*.test.ts'` shows every call passing a label and a key; `git grep -n "renameInGroups\|withOptionKeys(" -- Core ':!*.test.ts'` lists only `seeded`'s two calls.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 7B-2

**TASK:** Add the Value Format change: one plan computes each moved option's key pair under the new format and refuses a collision or a crossing; the change enters `rekeyOptions` with one key-only `option-rename` record and the format, so it commits every key and the format and runs the option cascade over the key map with no configuration pass, as an option rename does; its count is that cascade's file sweep run dry. Add the `property:setValueFormat` channel.

**NOW:** After Task 7B-1 an option rename enters `rekeyOptions(root, record)` (`Core/Properties/optionOps.ts`), which journals the record or refuses `OWED`, re-keys every stored option through `record.keys` and relabels through `record.labels`, and cascades from the record. After Phase 6 the option cascade takes a key map and an optional label pair (`optionCascade(root, def, keys, labels?)`, `Core/Properties/optionOps.ts`), sweeping files and caches when the map isn't empty and configuration only with `labels`; `valueEditPlan(root, def, keys)` builds its file plan; `OWED` refuses an option change while another record is owed; the `option-rename` record is `{ id, keys: [from, to][], labels? }`, its replay acting while the definition holds every `to` and no `from` and cascading `new Map(journal.keys)` with `journal.labels` (`Core/Properties/replaySchemaCascade.ts`), and the adoption shield covers every `from` of an owed record. `validateOptionValues` (`Core/Properties/schema.ts:85-91`, after Phase 5B) refuses a blank label, a blank key, a fold-duplicate label, and a fold-duplicate key, the last with its `taken` argument, by default `'An option with this title already exists, please choose another name.'`. `editStoredOptions(def, stored, edit)` (`optionOps.ts:53-60`) edits the stored entry's groups and writes them onto `def`. Nothing refuses a crossing: under `lowercase` to `kebab-case`, `WifiPro` moves `wifipro` → `wifi-pro` while `WiFi-Pro` moves `wifi-pro` → `wi-fi-pro`, and every uniqueness check passes (F-1 INFERRED; *MetadataV3 — Investigation*, *§Uniqueness and Collisions*). `memberKey` (`Core/Files/heldKeys.ts:51`, the trimmed NFC text after Phase 3) is what the replay's `editList` matches by.

**CHANGE**

- [ ] Write and watch fail: `optionOps.test.ts`, a new describe *§a Value Format change re-keys every option*: a Multi-Select `Tones` with `Light Blue` and `Dark Red` (Match Title) assigned to `Col`, a page holding `Tones: [Light Blue, "Dark Red"]`, a Space holding `Tones: ['Light Blue']`, `Col`'s cache block holding `{ p1: ['Light Blue'] }`, and a view filtering `Light Blue` (`seedConfigSurfaces`); `setValueFormat(root, id, 'kebab-case')` stores `value_format: 'kebab-case'` and the options `{ key: 'light-blue', label: 'Light Blue' }` and `{ key: 'dark-red', label: 'Dark Red' }`, the page reads `Tones: ["light-blue", "dark-red"]` (a renamed member with no exact held match takes the file's first quoted style, as A-3 writes), the Space `['light-blue']`, the cache `{ p1: ['light-blue'] }`, every configuration surface reads as it did, the journal is null, and the answer holds no `owed`; with `Wifi Pro` and `Wifi-Pro`, `kebab-case` refuses `'This format would give two options the same key, please rename one first.'` and the registry, the page, and the journal are unchanged; created under `lowercase` with `WifiPro` and `WiFi-Pro` (keys `wifipro` and `wifi-pro`), `kebab-case` refuses `CROSSED` and nothing changes; with `{ op: 'rename', id: 'prop_other', from: 'A', to: 'B' }` held, it answers `OWED` and nothing changes; with the page unreadable (`it.skipIf(noModeBits)`), it answers `owed: { op: 'option-rename', id, keys: [['Light Blue', 'light-blue'], ['Dark Red', 'dark-red']] }`, and `replaySchemaCascade(root, owed)` brings the page current and clears; `setValueFormat(root, id, 'Match Title')` under Match Title keeps every option and writes no holder; `setValueFormat` on a Text refuses `NO_OPTIONS`. A new describe *§valueFormatHolders*: the page and the Space count `ok(2)` for `kebab-case` and every file keeps its bytes; the crossing pair answers `CROSSED`; `Match Title` over keys equal to labels answers `ok(0)`. `handlers.test.ts` *§the property channels*: `property:setValueFormat` with `'Shouting'` answers the `NEEDS_ID_AND_VALUE` fault.
- [ ] `optionOps.ts`: add `CROSSED`, `fail('invalid-property', 'This format would give one option the key another option writes now, please rename one first.')`; `valueFormatPlan(root, propertyId, format)`, answering the definition and the key pair of each option `format` moves, refused by `validateOptionValues` over the moved options, with `'This format would give two options the same key, please rename one first.'` for a key clash, and by `CROSSED` when a pair's new key is another pair's old key by `memberKey`; `rekeyOptions` takes an optional `value_format`, committing it on the definition it re-keys; `setValueFormat(root, propertyId, format)` enters `rekeyOptions` with `{ op: 'option-rename', id, keys }` from the plan and `format`; `valueFormatHolders(root, propertyId, format)`, answering `0` when no key moves and otherwise `sweepCount` over `valueEditPlan(root, def, new Map(keys))`.
- [ ] `handlers.ts`: `'property:setValueFormat': registryChannel(idAndFormat, setValueFormat, cascadeReply)`; `bridge.ts` declares it with the `Result<SchemaCascade>` reply.

**AFTER**

```Core/Properties/optionOps.ts diff
@@ imports @@
-import { formatKey } from './keyFormat'
+import { formatKey, type KeyFormat } from './keyFormat'
@@ constants @@
 const OWED = fault('An earlier change hasn’t reached every file yet. Use Try Again on its notice first.')
+// A replay over a partly swept file can't tell a moved word from an unmoved one.
+const CROSSED = fail(
+  'invalid-property',
+  'This format would give one option the key another option writes now, please rename one first.',
+)
@@ valueFormatPlan @@
+async function valueFormatPlan(
+  root: string,
+  propertyId: string,
+  format: KeyFormat,
+): Promise<Result<{ def: PropertyDefinition; keys: [string, string][] }>> {
+  const def = (await readRegistry(root)).defs[propertyId]
+  if (!def) return NO_PROPERTY
+  const typeCheck = requireOptions(def)
+  if (!typeCheck.ok) return typeCheck
+  const moved = optionsOf(def).map((o) => ({ ...o, was: o.key, key: formatKey(o.label, format) }))
+  const check = validateOptionValues(
+    moved,
+    'This format would give two options the same key, please rename one first.',
+  )
+  if (!check.ok) return check
+  const keys = moved.flatMap(({ was, key }): [string, string][] => (key === was ? [] : [[was, key]]))
+  const olds = new Set(keys.map(([from]) => memberKey(from)))
+  if (keys.some(([, to]) => olds.has(memberKey(to)))) return CROSSED
+  return ok({ def, keys })
+}
+
+export function setValueFormat(
+  root: string,
+  propertyId: string,
+  format: KeyFormat,
+): Promise<Result<SchemaCascade>> {
+  return serializeSchemaOp(root, async () => {
+    const planned = await valueFormatPlan(root, propertyId, format)
+    if (!planned.ok) return planned
+    return rekeyOptions(
+      root,
+      { op: 'option-rename', id: propertyId, keys: planned.value.keys },
+      format,
+    )
+  })
+}
+
@@ rekeyOptions @@
 async function rekeyOptions(
   root: string,
   record: Extract<SchemaJournal, { op: 'option-rename' }>,
+  value_format?: KeyFormat,
 ): Promise<Result<SchemaCascade>> {
   …
-    const next = editStoredOptions(def, stored[record.id], (groups) =>
+    const current = value_format ? { ...def, value_format } : def
+    const next = editStoredOptions(current, stored[record.id], (groups) =>
@@ valueFormatHolders @@
+export async function valueFormatHolders(
+  root: string,
+  propertyId: string,
+  format: KeyFormat,
+): Promise<Result<number>> {
+  const planned = await valueFormatPlan(root, propertyId, format)
+  if (!planned.ok) return planned
+  const { def, keys } = planned.value
+  if (!keys.length) return ok(0)
+  const { pages, plan } = await valueEditPlan(root, def, new Map(keys))
+  return ok(await sweepCount(root, pages, plan))
+}
```

```Core/Properties/handlers.ts diff
@@ imports @@
-import { clearOption, editOption, optionHolders, removeOption, renameOption } from './optionOps'
+import {
+  clearOption,
+  editOption,
+  optionHolders,
+  removeOption,
+  renameOption,
+  setValueFormat,
+} from './optionOps'
@@ propertiesHandlers @@
   'property:renameOption': registryChannel(idOldNew, renameOption, cascadeReply),
+  'property:setValueFormat': registryChannel(idAndFormat, setValueFormat, cascadeReply),
```

```Core/Contract/bridge.ts diff
@@ property:renameOption @@
   'property:renameOption': {
     args: [propertyId: string, oldLabel: string, newLabel: string]
     reply: Result<SchemaCascade>
   }
+  'property:setValueFormat': {
+    args: [propertyId: string, format: KeyFormat]
+    reply: Result<SchemaCascade>
+  }
```

**VERIFY**

- [ ] The listed tests pass; `replaySchemaCascade.test.ts`' Phase 6-3 case (a key-only record with two pairs rewrites both words and leaves a view naming the old label) and `settle.test.ts`' two-pair shield case pass unchanged.
- [ ] `setValueFormat`'s record holds no `labels`, so `rekeyOptions` relabels nothing and `optionCascade` runs no configuration pass.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 7B-3

**TASK:** Let adoption take only a foreign Multi-Select word the Value Format leaves unchanged, and owe adoption when a Multi-Select's Value Format changes.

**NOW:** `unregisteredMembers(def, raw)` (`Core/Properties/propertyValue.ts:128-134`, as Phase 5B leaves it) answers the raw words (`optionList`, `:43-44`: scalar members, blanks dropped) once per fold, first spelling kept, minus every word whose fold an option's label or key holds; its one caller is `registerHeldOptions` (`Core/Properties/optionOps.ts:102,133`), which adds each answered word as its own label and key. Under any format a word of any casing is adopted, so `PURPLE` beside a `lowercase` property becomes an option (E-1 refuses it). `oweNamedKeys` (`Core/Nexus/fileEvents.ts:521-539`, after Phase 5A) owes adoption for a Multi-Select whose type or key changed (`p.key !== d.key`, `:530`), on the registry event of the app's own write and on a walk (`fileEvents.ts:497`; `Core/Nexus/settle.ts:117`); a Value Format change keeps the key, so it owes none. A word with stray spaces or in another Unicode composition matches as it does today (A-3), which `exactTitle` (Phase 3) gives.

**CHANGE**

- [ ] Write and watch fail: `propertyValue.test.ts` *§unregisteredMembers* — under `color` with options `red` and `blue` and `value_format: 'lowercase'`, `['green', 'PURPLE', 'Red']` answers `['green']` (E-1's example); under `kebab-case` with no options, `['due_date', 'in-progress']` answers `['in-progress']`; under `PascalCase`, `['AB', 'J.Crew', 'Red']` answers `['Red']` (B-5 INFERRED: the round-trip exception isn't adopted); under `lowercase`, `['Green', 'green']` answers `['green']` (a word the format can't produce doesn't win the fold); under `lowercase`, `[' green ']` answers `[' green ']` (A-3); Phase 3's Match Title case (`['green', 'Red', 'PURPLE']` over `red` and `blue` answers `['green', 'PURPLE']`) passes unchanged. `settle.test.ts` *§held options*: with `tags` stored under `value_format: 'UPPERCASE'` and a page holding `Tags: [alpha, green]`, a settle of the page registers nothing; `setValueFormat(root, 'tags', 'lowercase')` and a settle register `green` (`options()` is `['alpha', 'green']`); a registry edit changing only an option's color still owes no file (`:1052` unchanged).
- [ ] `propertyValue.ts`: `unregisteredMembers` keeps a raw word only when `formatKey` of its trimmed NFC text under the definition's Value Format answers that text, before the fold dedupe; its doc says so; import `formatKey`.
- [ ] `fileEvents.ts`: `oweNamedKeys` owes a Multi-Select whose `value_format` changed; its comment names a Value Format change.

**AFTER**

```Core/Properties/propertyValue.ts diff
@@ imports @@
+import { formatKey } from './keyFormat'
@@ unregisteredMembers @@
-/** The words a Multi-Select's `raw` holds that no option's label or key claims without regard to case, each once by fold. */
+/** The words a Multi-Select's `raw` holds that its Value Format could have written and no option's label or key claims without regard to case, each once by fold. */
 export function unregisteredMembers(def: PropertyDefinition, raw: unknown): string[] {
   const { folds } = wordsOf(def)
-  return [...firstPerTitle(optionList(raw))].flatMap(([fold, w]) => (folds.has(fold) ? [] : [w]))
+  const writable = optionList(raw).filter((w) => formatKey(exactTitle(w), def.value_format) === exactTitle(w))
+  return [...firstPerTitle(writable)].flatMap(([fold, w]) => (folds.has(fold) ? [] : [w]))
 }
```

```Core/Nexus/fileEvents.ts diff
@@ oweNamedKeys @@
-// A rename names a new key as a create does; every Space is owed because the registrar reads their values from the tree.
+// A new key or a new Value Format names words a Multi-Select can adopt, as a create does; every Space is owed because the registrar reads their values from the tree.
 export function oweNamedKeys(owed: Owed, was: PropertyDefinition[], tree: NexusTree): void {
   …
         return (
           d.type === 'multiSelect' &&
-          (p?.type !== 'multiSelect' || p.key !== d.key)
+          (p?.type !== 'multiSelect' || p.key !== d.key || p.value_format !== d.value_format)
         )
```

**VERIFY**

- [ ] The listed tests pass; `settle.test.ts:906` (two pages holding `Claude` and `claude` register one option) passes unchanged.
- [ ] `git grep -n "formatKey(" -- Core/Properties/propertyValue.ts` lists `unregisteredMembers` alone: no decode or encode converts.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 7B-4

**TASK:** Add the two settings rows at the top of every property's settings, each with its H-1 hint, sending through the two format channels after a confirmation that counts the items the change rewrites and skips at one or fewer; split the rename sweep into a plan and its sweep so a Key Format change's count runs that plan dry; widen `property:holders` to count a format change.

**NOW:** The editor (`Core/Properties/Schema/PropertyFrame.tsx:379-431`) renders the header, `<MenuSeparator flush />` (`:427`), and `SETTINGS[def.type](def, columnStyle)` (`:428`); every user type reaches it (`:194`, `:374-376`'s arms are unreachable; *MetadataV3 — Investigation*, *§The Settings Rows and the Leaf*). Its `rename` (`:234-239`, after Phase 5A) asks `property:rename`, bumps the values epoch when `from !== to`, and runs `retryOwed`. `pickerRow(glyph, label, value, options, onPick, look?)` (`UIX/Menus/MenuIndex.tsx:54-77`) builds an inert picker item; its `PickerRowLook` (`:43-52`) has no caption, while the item row it returns renders `caption` as its sub-label (`MenuIndex.tsx:30,145`; `Core/Settings/SettingsWindow.tsx:51` writes one directly). `LinkEditor.tsx:21-61` wraps its rows in `s.configEditor`. `PickerControl` fires `onPick` only for a value other than the one shown (`UIX/Pickers/PickerControl.tsx:113`). `askHolding(propertyId, value, req, quietAt?)` (`Core/Interface/Confirm/confirmations.ts:109-116`, as Phase 4 leaves it) counts through `property:holders(propertyId, label?)` (`Core/Contract/bridge.ts:180`; `Core/Properties/handlers.ts:181-185`) and asks unless the count is at or under `quietAt`. `warnOwed` (`Core/Properties/propertyWrite.ts:20-25`) reports a `SchemaCascade` answer.

**CHANGE**

- [ ] Write and watch fail: `confirmations.test.ts` — a new case: with `property:holders` answering `ok(2)`, `askFormatChange('p1', { key_format: 'lowercase' })` asks `'This action would rewrite metadata in 2 Items.'` and the holders stub saw `['p1', { key_format: 'lowercase' }]`; answering `ok(1)` and `ok(0)`, it resolves `true` without asking; refused, it resolves `false` without asking. `PropertyFrame.test.tsx` *§native menus + the inline-rename channel*: the `Count` (Number) editor shows a `Key Format` row reading `Match Title` with the hint "How this property’s name is written into each file’s metadata key." and no `Value Format` row; the `Status` editor shows both, `Value Format` with "How each value is written in the file’s metadata."; the picker's list is driven as `MatrixMenu.test.tsx:17-18` drives it, `setMenuDoor(door)` with a `vi.fn<MenuDoor>` answering the picked format (the harness installs no door, so `PickerControl.tsx:102` opens nothing without one): in the `Count` editor, with `property:holders` answering `ok(3)` and the door answering `'lowercase'`, a click on `button[aria-label="Key Format"]` raises a pending confirm reading `This action would rewrite metadata in 3 Items.`, and settling it `true` asks `property:setKeyFormat('prop_n', 'lowercase')` and bumps the values epoch with the answered key pair; with `property:holders` answering `ok(1)`, the pick asks `property:setKeyFormat` with no confirm; in the `Status` editor, a `Value Format` pick of `kebab-case` over a count of `ok(0)` asks `property:setValueFormat('prop_status', 'kebab-case')`. `handlers.test.ts` *§the property channels*: `property:holders(propId, { value_format: 'kebab-case' })` and `property:holders(propId, { key_format: 'lowercase' })` answer their counts; `property:holders(propId, { key_format: 'Shouting' })` answers the `NEEDS_ID_AND_VALUE` fault; `confirmations.test.ts:39-59` passes unchanged.
- [ ] `registryProperty.test.ts`, a new describe *§keyFormatHolders*: the page and the Space holding `Tags` count `ok(2)`, a page holding only `tags` isn't counted, every file keeps its bytes; the `Heading Icon Hidden` case answers the reserved refusal; a format whose key equals the stored key (`lowercase` over `{ label: 'tags', key: 'tags' }`) answers `ok(0)`.
- [ ] `registryProperty.ts`: `renameSweep(root, from, to)` sweeps `renamePlan(root, from, to)`, split out of it; add `keyFormatHolders(root, propertyId, format)`, answering the dry run of that plan for the rekey `rekeyPlan` checks, `0` when the key stays, and its refusal otherwise.
- [ ] `UIX/Menus/MenuIndex.tsx`: `PickerRowLook` gains `caption?: ReactNode`, and `pickerRow` passes `caption: look?.caption`.
- [ ] `keyFormat.ts`: add `FormatChange`.
- [ ] `Core/Properties/Schema/FormatRows.tsx` (new): one `MenuIndex` section inside `s.configEditor`, the `Key Format` row and, when `PROPERTY_TYPES[def.type].options`, the `Value Format` row, each a `pickerRow` over the ten formats (labels as written, the stored format or `DEFAULT_KEY_FORMAT` as the value), inert, its H-1 hint as the caption, answering a `FormatChange`. The format options live here, their one reader.
- [ ] `confirmations.ts`: `askHolding`'s second parameter is `of: string | FormatChange | undefined`; add `askFormatChange(propertyId, change)`, quiet at `1`, its message the Brief's sentence with the count, its detail `Each key changes to the new format; values stay the same.`, and its action `Rewrite`.
- [ ] `PropertyFrame.tsx`: `rename`'s answer handling becomes `renamed(res)`, shared with the Key Format change; add `setFormat(id, change)`, asking `askFormatChange` and then `property:setKeyFormat` (through `renamed`) or `property:setValueFormat` (through `warnOwed`); render `FormatRows` after `:427`, and a second `<MenuSeparator flush />` before the type's settings only where it has some: `NO_SETTINGS` (`:310`) answers null in place of its 8 px spacer, since every editor now has the rows as its body, and `SETTINGS`' value type admits null.
- [ ] `handlers.ts`: `property:holders` answers `keyFormatHolders` for `{ key_format }` and `valueFormatHolders` for `{ value_format }`; `bridge.ts`: its second argument is `of?: string | FormatChange`.

**AFTER**

```UIX/Menus/MenuIndex.tsx diff
@@ PickerRowLook @@
 export interface PickerRowLook {
   ariaLabel?: string
+  caption?: ReactNode
   iconSize?: IconSize
@@ pickerRow @@
   label: look?.labelClassName ? <span className={look.labelClassName}>{label}</span> : label,
+  caption: look?.caption,
   trailing: {
```

```Core/Properties/keyFormat.ts diff
@@ FormatChange @@
+export type FormatChange = { key_format: KeyFormat } | { value_format: KeyFormat }
+
```

```Core/Properties/Schema/FormatRows.tsx diff
@@ FormatRows.tsx @@
+import { MenuIndex, pickerRow } from '@pommora/uix/Menus'
+import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
+import * as s from '@pommora/uix/Menus/frames.css'
+import { DEFAULT_KEY_FORMAT, type FormatChange, KEY_FORMATS, type KeyFormat } from '../keyFormat'
+import { type PropertyDefinition, PROPERTY_TYPES } from '../properties'
+
+const FORMAT_OPTIONS: PickerOption<KeyFormat>[] = KEY_FORMATS.map((value) => ({ value, label: value }))
+
+export function FormatRows({
+  def,
+  onPick,
+}: {
+  def: PropertyDefinition
+  onPick: (change: FormatChange) => void
+}): React.JSX.Element {
+  const row = (
+    label: string,
+    value: KeyFormat | undefined,
+    caption: string,
+    change: (format: KeyFormat) => FormatChange,
+  ) =>
+    pickerRow(undefined, label, value ?? DEFAULT_KEY_FORMAT, FORMAT_OPTIONS, (v: KeyFormat) => onPick(change(v)), {
+      inert: true,
+      caption,
+    })
+  return (
+    <div className={s.configEditor}>
+      <MenuIndex
+        sections={[
+          {
+            rows: [
+              row(
+                'Key Format',
+                def.key_format,
+                'How this property’s name is written into each file’s metadata key.',
+                (key_format) => ({ key_format }),
+              ),
+              ...(PROPERTY_TYPES[def.type].options
+                ? [
+                    row(
+                      'Value Format',
+                      def.value_format,
+                      'How each value is written in the file’s metadata.',
+                      (value_format) => ({ value_format }),
+                    ),
+                  ]
+                : []),
+            ],
+          },
+        ]}
+      />
+    </div>
+  )
+}
```

```Core/Interface/Confirm/confirmations.ts diff
@@ imports @@
 import { itemCount } from '../../Properties/properties'
+import type { FormatChange } from '../../Properties/keyFormat'
@@ askHolding @@
 const askHolding = async (
   propertyId: string,
-  value: string | undefined,
+  of: string | FormatChange | undefined,
   req: (held: string) => ConfirmRequest,
   quietAt?: number,
 ): Promise<boolean> => {
-  const r = await dialer().ask('property:holders', propertyId, value)
+  const r = await dialer().ask('property:holders', propertyId, of)
   if (!reportRefusal(r)) return false
@@ askFormatChange @@
+
+export const askFormatChange = (propertyId: string, change: FormatChange): Promise<boolean> =>
+  askHolding(
+    propertyId,
+    change,
+    (held) => ({
+      message: `This action would rewrite metadata in ${held}.`,
+      detail: 'Each key changes to the new format; values stay the same.',
+      action: 'Rewrite',
+      tone: 'positive',
+    }),
+    1,
+  )
```

```Core/Properties/Schema/PropertyFrame.tsx diff
@@ imports @@
-import { replay, retryOwed, write } from '../propertyWrite'
+import { replay, retryOwed, warnOwed, write } from '../propertyWrite'
+import type { Result } from '../../Contract/result'
+import type { FormatChange } from '../keyFormat'
+import type { PropertyRename } from '../registryProperty'
+import { FormatRows } from './FormatRows'
-import { askDestroyProperty, notifyTrashed } from '../../Interface/Confirm/confirmations'
+import {
+  askDestroyProperty,
+  askFormatChange,
+  notifyTrashed,
+} from '../../Interface/Confirm/confirmations'
@@ rename @@
-  const rename = async (id: string, name: string): Promise<void> => {
-    const res = await dialer().ask('property:rename', id, name)
-    if (!reportRefusal(res) || !res.value) return
-    if (res.value.from !== res.value.to) bumpValuesEpoch(res.value.from, res.value.to)
-    retryOwed(res.value)
-  }
+  const renamed = (res: Result<PropertyRename | null>): void => {
+    if (!reportRefusal(res) || !res.value) return
+    if (res.value.from !== res.value.to) bumpValuesEpoch(res.value.from, res.value.to)
+    retryOwed(res.value)
+  }
+  const rename = async (id: string, name: string): Promise<void> =>
+    renamed(await dialer().ask('property:rename', id, name))
+  const setFormat = async (id: string, change: FormatChange): Promise<void> => {
+    if (!(await askFormatChange(id, change))) return
+    if ('key_format' in change)
+      renamed(await dialer().ask('property:setKeyFormat', id, change.key_format))
+    else await warnOwed(dialer().ask('property:setValueFormat', id, change.value_format))
+  }
@@ NO_SETTINGS @@
-  const NO_SETTINGS = (): React.JSX.Element => <div style={{ minHeight: 8 }} />
+  const NO_SETTINGS = (): null => null
@@ SETTINGS @@
   const SETTINGS: Record<
     PropertyType,
-    (def: PropertyDefinition, style: ColumnStyle) => React.JSX.Element
+    (def: PropertyDefinition, style: ColumnStyle) => React.JSX.Element | null
   > = {
@@ editor @@
+    const settings = SETTINGS[def.type](def, columnStyle)
   …
         <MenuSeparator flush />
-        {SETTINGS[def.type](def, columnStyle)}
+        <FormatRows def={def} onPick={(change) => void setFormat(def.id, change)} />
+        {settings && <MenuSeparator flush />}
+        {settings}
```

```Core/Properties/registryProperty.ts diff
@@ imports @@
-import { sweepGovernedRoots, type Rewrite } from './governedSweep'
+import { sweepCount, sweepGovernedRoots, type SweepPlan } from './governedSweep'
@@ renameSweep @@
-export async function renameSweep(root: string, from: string, to: string): Promise<number> {
+async function renamePlan(
+  root: string,
+  from: string,
+  to: string,
+): Promise<{ files: string[]; plan: SweepPlan }> {
   // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too.
   const files = await keyHolderFiles(root, from, await collectionFolders(root))
   const text = (content: string): string | null =>
     renameFrontmatterKey(content, from, to, NEW_KEY_IS_FRESHER)
-  const rekey: Rewrite = (raw) => rekeyHeld(raw, from, to, NEW_KEY_IS_FRESHER)
-  const swept = await sweepGovernedRoots(root, files, { text, sidecars: rekey })
-  return swept.skipped.length
+  return { files, plan: { text, sidecars: (raw) => rekeyHeld(raw, from, to, NEW_KEY_IS_FRESHER) } }
+}
+
+export async function renameSweep(root: string, from: string, to: string): Promise<number> {
+  const { files, plan } = await renamePlan(root, from, to)
+  return (await sweepGovernedRoots(root, files, plan)).skipped.length
 }
@@ keyFormatHolders @@
+
+export async function keyFormatHolders(
+  root: string,
+  propertyId: string,
+  key_format: KeyFormat,
+): Promise<Result<number>> {
+  const planned = await rekeyPlan(root, propertyId, { key_format })
+  if (!planned.ok) return planned
+  if (!planned.value || planned.value.moved.key === planned.value.prior.key) return ok(0)
+  const { files, plan } = await renamePlan(root, planned.value.prior.key, planned.value.moved.key)
+  return ok(await sweepCount(root, files, plan))
+}
```

```Core/Properties/handlers.ts diff
@@ imports @@
 import {
   clearOption,
   editOption,
   optionHolders,
   removeOption,
   renameOption,
   setValueFormat,
+  valueFormatHolders,
 } from './optionOps'
 import {
   createProperty,
   editProperty,
+  keyFormatHolders,
   removeFromRegistry,
@@ property:holders @@
-  'property:holders': withRoot(async (root, _ctx, id: unknown, value: unknown) => {
+  'property:holders': withRoot(async (root, _ctx, id: unknown, of: unknown) => {
     if (typeof id !== 'string') return NEEDS_PROPERTY_ID
-    if (value === undefined) return propertyHolders(root, id)
-    return typeof value === 'string' ? optionHolders(root, id, value) : NEEDS_ID_AND_VALUE
+    if (of === undefined) return propertyHolders(root, id)
+    if (typeof of === 'string') return optionHolders(root, id, of)
+    if (isPlainObject(of) && isKeyFormat(of.key_format)) return keyFormatHolders(root, id, of.key_format)
+    if (isPlainObject(of) && isKeyFormat(of.value_format))
+      return valueFormatHolders(root, id, of.value_format)
+    return NEEDS_ID_AND_VALUE
   }),
```

```Core/Contract/bridge.ts diff
@@ imports @@
-import type { KeyFormat } from '../Properties/keyFormat'
+import type { FormatChange, KeyFormat } from '../Properties/keyFormat'
@@ property:holders @@
-  'property:holders': { args: [propertyId: string, label?: string]; reply: Result<number> }
+  'property:holders': {
+    args: [propertyId: string, of?: string | FormatChange]
+    reply: Result<number>
+  }
```

**VERIFY**

- [ ] The listed tests pass; `PropertyFrame.test.tsx`' rename cases (`:455-480`, the epoch bump) and `confirmations.test.ts:39-68` pass unchanged.
- [ ] Live, in `~/Test` (`Guidelines/Development-Environment.md`'s launch, then `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`): a Select and a Status editor each show the rows above the type's own settings with a separator between, and a Text editor ends at the rows; the ten-format pane opens and scrolls; a Key Format change over two or more holders asks with the count, over one doesn't; revert every change made and close the app.
- [ ] Run the gates, then `view-delta` for Phase 7B.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, reading outward: every option label a write lands (seed, add, rename) takes its key through the Value Format, a create and a restore keep the keys they're handed, an adopted word stays its own label and key, and nothing re-keys an option outside a label or format change (C-2 INFERRED); a Value Format change journals one key-only record, refuses a collision, a crossing, and an owed record before anything writes, re-keys files and caches through the same `rekeyOptions`, cascade, and replay an option rename uses, and leaves every view, tile, preview rule, and Matrix filter byte-identical; adoption converts only on its existing triggers and takes only words the format leaves unchanged, and a Value Format change owes it; the rows sit between the header's separator and the type's settings, Value Format only on option types; both format confirmations count the dry run of the plan their change runs, skip at one or fewer, and a collision or a crossing the plan answers shows before any dialog (an owed record refuses at the change, after the dialog, as an option rename's does); no new copy beyond H-1's hints and the Brief's sentence.

### Phase 8 — The Restore Re-Spell (G-1)

**GOAL:** A page, a Set, a Collection, a Space, or a Context returning from the Trash has each key and option word matched to the current properties, options, Contexts, and Spaces whatever casing or format spelled it, and written back in each one's current key, so a rename of case or a format change made while it sat in the Trash reaches it at restore (G-1). A held word that is exactly a current key keeps it, a variant beside a held current key stays foreign, and a spelling two current words share, or one no current word has, returns as foreign data for the reconcile to judge as it does today (G-2). The match runs once per restore over the whole registry, and live reads stay exact (*§Constraints · Cost*). Links are untouched: the Link keys re-spell like any key, before `unlinked` reads them, and every `[[…]]` target stays Path Links Phase 8's. It's a separate phase because it's the Trash's half of the formats, which needs Phase 7's converter and keys and touches nothing Phase 7 rewrites. The task isn't a pure removal; the closures' CHANGE lines replace before they add.

#### Task 8-1

**TASK:** Add `spellingsOf(label)` to the converter, and re-spell keys and words in `scrubReturning`'s page and sidecar closures, before the reconcile and `unlinked`, through one set of matchers built per restore: property keys and `<Title>:` keys moved in place (`renameFrontmatterKey` on page text, `rekeyHeld` on sidecars), and option words and Space titles through the key-map list edit.

**NOW:** `scrubReturning(root, tree, absArtifact, destCollectionFolder, frozen, inTransitKey?)` (`Core/Trash/restoreScrub.ts:25-82`, as Phase 2B leaves it) reconciles each returning page in its `text` closure (`:53-64`: `splitFrontmatter`, `reconcileGovernedRoot` against the destination's world, `unlinked` for Link values naming a gone page, `mergeFrontmatter` over the changed and gone keys) through `sweepGovernedRoots`, whose page arm writes any non-null answer, and each returning Space sidecar in an `rmwJsonStrict` closure (`:72-80`), skipping the in-transit Context key; the Link map is `byKey` over Link definitions, so a Link value under a key in another casing isn't a Link (`restoreScrub.test.ts:320`, as Phase 2B inverted it). The callers are the page, Set, Collection, Space, and Context restores (`Core/Trash/spend.ts:190-197`). Nothing re-spells: since Phases 2B and 3, a returning `priority:` beside `Priority` is foreign, a `- pommora` under `<Projects>` names no Space (`restoreScrub.test.ts:196`, as Phase 3 inverted it), and a key or option word written under an earlier format matches nothing. `renameFrontmatterKey(content, from, to, collision)` (`Core/Files/pageFile.ts:208-243`) moves one key in its place, keeping its line and comments, and `rekeyHeld(raw, from, to, collision)` (`Core/Files/heldKeys.ts:95-110`) is its JSON twin (both exact since Phase 2A); under either collision rule a held `to` loses or merges the moved value, so neither leaves a variant as it stands. `editHeldList(raw, key, edit)` (Phase 2B) and `editList(xs, map)` (Phase 6) edit a held list by `memberKey` in one pass, deduping onto a target. `parseContextKey` and `contextKey` (`Core/Contexts/contexts.ts:25-35`) read and write a `<Title>` key. `refillTrashed` can land the current key in a trashed copy that still holds an old spelling (`Core/Trash/holdings.ts:128-148`; `spend.test.ts:1031`, as Phase 2B left it).

**CHANGE**

- [ ] Write and watch fail: `keyFormat.test.ts` — `spellingsOf('Value One')` is `['Value One', 'value one', 'VALUE ONE', 'value-one', 'ValueOne', 'valueOne', 'value_one', 'Value-One', 'VALUE_ONE', 'VALUE-ONE']`, which holds every spelling G-1 names. `restoreScrub.test.ts` (fixtures in Phase 5B's `{ label, key }` shape), a new describe *§a returning page takes the current keys*: a page holding `priority: hi` restores with `fm(…).Priority` reading `['hi']` (the reconcile writes a governed Select as a list, as `:110-112` already expects) and no `priority` key; a Key Format change made while the page sat in the Trash (the registry rewritten in `cycle`'s world step to `{ label: 'Priority', key: 'priority', key_format: 'lowercase', … }`) restores its `Priority: hi` under `priority` (`fm(…).priority` is `['hi']`, and no `Priority` key); a Value Format change made in the Trash (the options rewritten to `{ key: 'HI', label: 'hi' }` and `{ key: 'LO', label: 'lo' }` under `value_format: 'UPPERCASE'`) restores `Priority: hi` holding the current key (`fm(…).Priority` is `['HI']`); a page holding `Priority: hi` and `priority: lo` restores with `Priority` reading `['hi']` and `priority` still `'lo'` (the exact key keeps its value and the variant stays foreign); with Text properties `Due Date` and `Due-Date` in the registry, a page holding `due-date: x` restores it as written (a spelling both share); a property renamed `Urgency` (label and key) while the page sat in the Trash leaves the page's `Priority: hi` as written. `:196` inverts again, retitled *rewrites a Space title in another casing into the current title*: `<Projects>` reads `['Pommora']`; `:234` reads `['Pommora']`, retitled *prunes the dead Space from a tag and rewrites the survivor*; `:320` inverts again (Path Links' case, its key now matched before `unlinked`): the restored page holds neither `related` nor `Related`, and the gone Link is parked. *§a Space sidecar is a context root too*, a new case: Sapphire's sidecar seeded as `{ id: 'sp-sap', '<areas>': ['work'], priority: ['hi'] }` (Areas holding Work, `seedPassenger`), its Space deleted and restored, reads `{ id: 'sp-sap', '<Areas>': ['Work'], Priority: ['hi'] }`; a new case: with a Text property labelled `Heading Icon Hidden`, a Space sidecar holding `heading_icon_hidden: true` (`Core/Pages/setHeadingIconHidden.ts:15`) restores byte-identical, since a key Pommora manages is no property's spelling (D-1). `:418` (a returning Context's own key left for the rekey while a live Context holds its title) passes unchanged, and a new case beside it: a trashed Context `projects` restored beside a live `Projects` holding `Pommora` leaves its returning Space sidecars' `<projects>` and their titles for the rekey, which writes `<projects (2)>: ['Pommora']`.
- [ ] `keyFormat.ts`: add `spellingsOf(label)`, the key each format writes from it, `Match Title`'s first.
- [ ] `restoreScrub.ts`: add `matchOf(words)`, a matcher answering a word itself when it's one of the current keys, else the one key whose label any of `spellingsOf`' spellings writes as the word without regard to case, and nothing when no key or more than one does; add `currentKeys(tree, skip?)`, built once per restore, holding a matcher over the registry's definitions, which a key `keyRefusal` refuses (a key Pommora manages, such as `ID` or `heading_icon_hidden`) never reaches, one over the Contexts' titles, and one per option-bearing definition's options and per Context's Spaces under its key, with `text(content)` and `json(raw)` moving each held key to the key its matcher answers unless the root already holds that key, and `words(raw)` moving each option word and Space title to its current key through `editHeldList` and `editList`, answering the keys it changed; the page closure re-spells `content` and then its words before the reconcile, `unlinked`, and the merge, writing the re-spelled keys with the rest; the sidecar closure re-spells its keys and words before the reconcile; `currentKeys` takes the in-transit key the reconcile already skips and leaves it and its words alone, so a returning Context's own key waits for `rekeyContext`.

**AFTER**

```Core/Properties/keyFormat.ts diff
@@ spellingsOf @@
+
+export const spellingsOf = (label: string): string[] => KEY_FORMATS.map((f) => formatKey(label, f))
```

```Core/Trash/restoreScrub.ts diff
@@ imports @@
-import { stripKeys } from '../Files/heldKeys'
-import { byKey } from '../Properties/properties'
+import { editHeldList, rekeyHeld, stripKeys } from '../Files/heldKeys'
+import { byKey, optionsOf, PROPERTY_TYPES } from '../Properties/properties'
+import { spellingsOf } from '../Properties/keyFormat'
+import { editList } from '../Properties/pageValue'
+import { contextKey, parseContextKey } from '../Contexts/contexts'
+import { exactTitle, normalizeTitle } from '../Paths/caseFold'
+import { keyRefusal } from '../Properties/schema'
+import { scalarMembers } from '../Contract/validators'
+import type { Json } from '../Files/stableJson'
 import { governedWorld, reconcileGovernedRoot, spaceWorldOf } from '../Contexts/contextResolve'
@@
-import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
+import {
+  mergeFrontmatter,
+  renameFrontmatterKey,
+  splitEnvelope,
+  splitFrontmatter,
+} from '../Files/pageFile'
@@ matchOf @@
+type Match = (word: string) => string | undefined
+
+/** The current word a returning word names among `words`: the word itself when it is one, else the one key whose label any format spells as the word without regard to case; none when no key does, or more than one. */
+function matchOf(words: Iterable<{ label: string; key: string }>): Match {
+  const keys = new Set<string>()
+  const bySpelling = new Map<string, string | null>()
+  for (const { label, key } of words) {
+    keys.add(key)
+    for (const fold of spellingsOf(label).map(normalizeTitle)) {
+      const held = bySpelling.get(fold)
+      bySpelling.set(fold, held === undefined || held === key ? key : null)
+    }
+  }
+  return (word) => (keys.has(word) ? word : (bySpelling.get(normalizeTitle(word)) ?? undefined))
+}
+
+function currentKeys(tree: NexusTree, skip?: string) {
+  const titled = (title: string) => ({ label: title, key: title })
+  const property = matchOf(tree.config.registry)
+  const context = matchOf(tree.contexts.map((g) => titled(g.def.title)))
+  const words = new Map<string, Match>([
+    ...tree.config.registry.flatMap((d) =>
+      PROPERTY_TYPES[d.type].options ? [[d.key, matchOf(optionsOf(d))] as const] : [],
+    ),
+    ...tree.contexts.map(
+      (g) => [contextKey(g.def.title), matchOf(g.spaces.map((s) => titled(s.title)))] as const,
+    ),
+  ])
+  const targetOf = (k: string): string | undefined => {
+    const title = parseContextKey(k)
+    if (title === null) return keyRefusal(k) === null ? property(k) : undefined
+    const to = context(title)
+    return to === undefined ? undefined : contextKey(to)
+  }
+  /** Each held key and the key it moves to; a key the root holds is no target, so an exact current key keeps its value and a variant beside it stays foreign. */
+  const moves = (held: string[]): [string, string][] => {
+    const taken = new Set(held)
+    return held.flatMap((k): [string, string][] => {
+      const to = k === skip ? undefined : targetOf(k)
+      if (to === undefined || taken.has(to)) return []
+      taken.add(to)
+      return [[k, to]]
+    })
+  }
+  const listed =
+    (match: Match) =>
+    (held: unknown[]): unknown[] | null =>
+      editList(
+        held,
+        new Map(
+          scalarMembers(held).flatMap((w): [string, string][] => {
+            const to = match(w)
+            return to === undefined || to === exactTitle(w) ? [] : [[w, to]]
+          }),
+        ),
+      )
+  return {
+    text: (content: string): string =>
+      moves(Object.keys(splitFrontmatter(content))).reduce(
+        (t, [from, to]) => renameFrontmatterKey(t, from, to, 'prefer-new') ?? t,
+        content,
+      ),
+    json: (raw: Json): Json =>
+      moves(Object.keys(raw)).reduce((r, [from, to]) => rekeyHeld(r, from, to, 'prefer-new') ?? r, raw),
+    words: (raw: Json): { root: Json; changed: string[] } => {
+      let root = raw
+      const changed: string[] = []
+      for (const key of Object.keys(raw)) {
+        const match = key === skip ? undefined : words.get(key)
+        const next = match && editHeldList(root, key, listed(match))
+        if (!next) continue
+        root = next
+        changed.push(key)
+      }
+      return { root, changed }
+    },
+  }
+}
+
@@ scrubReturning @@
   const world = governedWorld(tree, await assignedDefs(root, destCollectionFolder))
   const spaceWorld = spaceWorldOf(tree)
+  const current = currentKeys(tree, inTransitKey)
   const links = byKey(tree.config.registry.filter((d) => d.type === 'link'))
   …
-  const text = (content: string, file: string): string | null => {
-    const raw = splitFrontmatter(content)
+  const text = (held: string, file: string): string | null => {
+    const content = current.text(held)
+    const { root: raw, changed } = current.words(splitFrontmatter(content))
     const r = reconcileGovernedRoot(raw, world, frozen)
     const gone = unlinked(raw)
     const goneKeys = Object.keys(gone)
-    if (!r.changed.length && !goneKeys.length) return null
+    const keys = [...new Set([...changed, ...r.changed, ...goneKeys])]
+    if (!keys.length) return content === held ? null : content
     if (raw[ID_KEY] === undefined && goneKeys.length) unstamped.set(file, gone)
     else note(gone, asString(raw[ID_KEY]))
-    const keys = [...new Set([...r.changed, ...goneKeys])]
     const kept = stripKeys(r.root, goneKeys) ?? r.root
     return mergeFrontmatter(content, kept, keys, splitEnvelope(content).body)
   }
   …
   for (const rel of sidecars)
-    await rmwJsonStrict(join(root, rel), (raw) => {
+    await rmwJsonStrict(join(root, rel), (held) => {
+      const raw = current.words(current.json(held)).root
       const r = reconcileGovernedRoot(raw, spaceWorld, {}, inTransitKey)
-      const next = r.changed.length ? r.root : null
+      const next = r.changed.length ? r.root : raw === held ? null : raw
       const gone = unlinked(next ?? raw)
       note(gone, asString(raw.id))
       return stripKeys(next ?? raw, Object.keys(gone)) ?? next
     })
```

**VERIFY**

- [ ] The listed tests pass; `spend.test.ts:862` (a Space restore appends to a live page's `<projects>`) and `:1031` (a refilled `Related` beside a trashed `related`, the variant staying foreign) pass as Phase 2B left them, and `restoreScrub.test.ts:109-160` and `:252-318` (the reconcile's keeps and drops) pass unchanged.
- [ ] `git grep -n "spellingsOf\|matchOf\|currentKeys" -- Core ':!*.test.ts'` lists `keyFormat.ts` and `restoreScrub.ts` alone: no live read, write, or repair converts.
- [ ] `git grep -n "gonePageEntry" -- Core/Trash/restoreScrub.ts` shows only `unlinked`'s untouched call: no link target changes.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, reading outward: the match runs once per restore and nowhere else (no live read, write, repair-on-open, or refill converts); a held word that is exactly a current key keeps it, a variant beside a held current key stays foreign with its value, and a spelling two current words share or none has returns as foreign data; property keys, `<Title>:` keys, option words, and Space titles re-spell on pages and Space sidecars alike, through `renameFrontmatterKey` on page text (each key on its own line) and `rekeyHeld` on sidecars, before the reconcile and `unlinked`; no `[[…]]` target or Link value is touched, so Path Links Phase 8's `repairLanded` after the relocate meets nothing this phase wrote; G-2's drops (an unmatched key ignored, an unmatched word reconciled away) hold as before.

### Phase 9 — Interface and Drives

**GOAL:** The Settings window's Properties leaf reads Metadata, and the two live drives that pin metadata behavior assert the exact identity Phases 1 through 8 leave: seeds in `{label, key}`, every folded expectation inverted, and new rows for the formats, adoption, the Restore Re-Spell, and a case-only rename. It runs last among the code phases because both drives exercise the finished app end to end.

#### Task 9-1

**TASK:** Rename the Settings window's Properties leaf to Metadata, its key following as `metadata`, and retitle its one section Maintenance.

**NOW:** `Core/Settings/frames.ts:636-651` declares the leaf `key: 'properties'`, `label: 'Properties'`, with one section titled `'Metadata'` (`:642`) holding the Repair Properties On Open toggle. `CategoryKey` (`frames.ts:911`) is consumed only by `Core/Settings/SettingsWindow.tsx`, whose active frame is component state reset on every open; no store, `settings.json`, recents entry, deep link, or test names the `properties` key. The Collection's Settings menu (`Core/Views/Settings/SettingsFrame.tsx`) keeps its own Properties entry, and the row's label and hint are unchanged.

**CHANGE**

- [ ] `Core/Settings/frames.ts:642` — `title: 'Metadata',` reads `title: 'Maintenance',`.
- [ ] `Core/Settings/frames.ts:637` — `key: 'properties',` reads `key: 'metadata',`.
- [ ] `Core/Settings/frames.ts:638` — `label: 'Properties',` reads `label: 'Metadata',`.

**AFTER**

```Core/Settings/frames.ts diff
@@ FRAMES @@

   {
-    key: 'properties',
-    label: 'Properties',
+    key: 'metadata',
+    label: 'Metadata',
     icon: 'server',
     sections: [
       {
-        title: 'Metadata',
+        title: 'Maintenance',
         rows: [
```

**VERIFY**

- [ ] `grep -n "key: 'properties'\|label: 'Properties'\|title: 'Metadata'" Core/Settings/frames.ts` returns nothing.
- [ ] `grep -rn "'metadata'" Core/Settings` returns the one `frames.ts` line, and `Core/Settings/TrashFrame.tsx:41`'s `property: 'properties'` is unchanged.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 9-2

**TASK:** Finish the Metadata Drive and move every other drive to the exact identity. The Metadata Drive (`.claude/scripts/Metadata Drive/`), grown during Phase 2B from the Metadata Spelling Drive into the behavior matrix its `MATRIX.md` lays out, drops its one seed adapter and runs all nine groups. In `.claude/scripts/Option Picker Drive/live-drive.mjs`, the registry field reads move to `label` and `key`. The three other drives that seed through `schema:add` and the registry watcher move to the new shape.

**NOW:** The Metadata Drive seeds through `define`, which sends each definition through `shaped`: while the registry still reads `name`, `inToday` and `todayOption` map the end-state `{ label, key }` seed onto `name` and option `value`, a no-op once Task 5B-4 rewrites the registry. Its `COPY` table holds the messages Nathan worded at the Stop before Task 5A-1. Each Review Checkpoint from Phase 2B on ran the groups for the phases landed by then. The Option Picker Drive reads the registry as `d.name` and `o.value`. The drive harness restores `~/Test` when a drive ends, so no data persists; both drives launch the app themselves on ports 9363 and 9343.

**CHANGE**

- [ ] `Metadata Drive/live-drive.mjs`: delete the seed-shape block (`today`, `todayOption`, `inToday`, `shaped`) and send each definition as written.
- [ ] `Option Picker Drive/live-drive.mjs`: `:24-25`, `:33`, `:94`, `:155-156`, `:250`, `:254`, `:272` as below.
- [ ] The seeds that send `{ id: '', name, type }` to `schema:add` send `label`: `Text Property Drive/live-drive.mjs:65,448`, `Alias Drive/live-drive.mjs:75`, and `Path Links Drive/live-drive.mjs:178,1222`; the Alias Drive's `optionValues` (`:35`) finds its definition by `d.label` and reads `o.label`; `nexus-watch.mjs:27-31` reads `d.label` and `o.label`.

**AFTER**

```.claude/scripts/Metadata Drive/live-drive.mjs diff
@@ the seed shape @@
-// ── The seed shape ──────────────────────────────────────────────────────────
-// Task 9-2 removes this block: until Task 5B-4 rewrites the registry, the build reads a definition's `name` and an
-// option's `value`, so a seed written in the final shape is sent in today's.
-let today
-const todayOption = ({ key, label, ...rest }) => ({ ...rest, value: key })
-const inToday = ({ label, key_format, value_format, select_options, status_groups, ...rest }) => ({
-  …
-})
-function shaped(def) {
-  today ??= Object.values(registry().defs).some((d) => 'name' in d)
-  return today ? inToday(def) : def
-}
-// ────────────────────────────────────────────────────────────────────────────
@@ add @@
-const add = (cdp, def, container = COLLECTION) => ask(cdp, 'schema:add', container, { id: '', ...shaped(def) })
+const add = (cdp, def, container = COLLECTION) => ask(cdp, 'schema:add', container, { id: '', ...def })
```

```.claude/scripts/Option Picker Drive/live-drive.mjs diff
@@ registry reads @@

-const defNamed = (name) => Object.values(registry()).find((d) => d.name === name)
-const optionValues = (name) => (defNamed(name).select_options ?? []).map((o) => o.value)
+const defNamed = (label) => Object.values(registry()).find((d) => d.label === label)
+const optionValues = (label) => (defNamed(label).select_options ?? []).map((o) => o.label)

@@ seed @@

-    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', name, type })
+    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', label: name, type })

@@ stepCreate @@

-  const fresh = defNamed('Drive Select').select_options.find((o) => o.value === 'Fresh')
+  const fresh = defNamed('Drive Select').select_options.find((o) => o.label === 'Fresh')

@@ stepEditOption @@

-  const gamma = defNamed('Drive Select').select_options.find((o) => o.value === 'Gamma')
-  check('popup: color, appearance, and icon land on Gamma', gamma?.color !== undefined && gamma?.appearance === 'clear' && gamma?.icon !== undefined, JSON.stringify(gamma))
+  const gamma = defNamed('Drive Select').select_options.find((o) => o.label === 'Gamma')
+  check('popup: color, appearance, and icon land on Gamma', gamma?.key === 'Gamma' && gamma?.color !== undefined && gamma?.appearance === 'clear' && gamma?.icon !== undefined, JSON.stringify(gamma))

@@ stepEditor @@

-  const first = statusGroups()[0].options[0].value
+  const first = statusGroups()[0].options[0].key
 ...
-  check('editor: the popup rename lands in status_groups', statusGroups()[0].options[0].value === 'Opened' && !statusGroups().flatMap((g) => g.options).some((o) => o.value === first), JSON.stringify(statusGroups()[0].options))
+  check('editor: the popup rename lands in status_groups', statusGroups()[0].options[0].label === 'Opened' && statusGroups()[0].options[0].key === 'Opened' && !statusGroups().flatMap((g) => g.options).some((o) => o.key === first), JSON.stringify(statusGroups()[0].options))
 ...
-  check('editor: + appends Added to the first group', statusGroups()[0].options.at(-1)?.value === 'Added' && statusGroups().flatMap((g) => g.options).length === count + 1, JSON.stringify(statusGroups()[0].options))
+  check('editor: + appends Added to the first group', statusGroups()[0].options.at(-1)?.label === 'Added' && statusGroups()[0].options.at(-1)?.key === 'Added' && statusGroups().flatMap((g) => g.options).length === count + 1, JSON.stringify(statusGroups()[0].options))
```

```.claude/scripts/Text Property Drive/live-drive.mjs diff
@@ seed @@
-    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', name, type })
+    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', label: name, type })
@@ group 3 @@
-  await must('description as Text', ask(cdp, 'schema:add', 'Collection A', { id: '', name: 'description', type: 'text' }))
+  await must('description as Text', ask(cdp, 'schema:add', 'Collection A', { id: '', label: 'description', type: 'text' }))
```

```.claude/scripts/Alias Drive/live-drive.mjs diff
@@ optionValues @@
-const optionValues = () => (Object.values(JSON.parse(read(REGISTRY)).defs).find((d) => d.name === CHOICE).select_options ?? []).map((o) => o.value)
+const optionValues = () => (Object.values(JSON.parse(read(REGISTRY)).defs).find((d) => d.label === CHOICE).select_options ?? []).map((o) => o.label)
@@ seed @@
-    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', name, type })
+    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', label: name, type })
```

```.claude/scripts/Path Links Drive/live-drive.mjs diff
@@ seed @@
-    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', name, type })
+    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', label: name, type })
@@ bench @@
-  const added = await ask(cdp, 'schema:add', seeded.first, { id: '', name: BENCH_LINK, type: 'link' })
+  const added = await ask(cdp, 'schema:add', seeded.first, { id: '', label: BENCH_LINK, type: 'link' })
```

```.claude/scripts/nexus-watch.mjs diff
@@ snapshot @@
-  const names = Object.values(defs).map((d) => d.name)
+  const names = Object.values(defs).map((d) => d.label)
   // A name two definitions share labels each by its id as well, so neither hides the other.
-  const label = (d) => (names.indexOf(d.name) === names.lastIndexOf(d.name) ? d.name : `${d.name} ${d.id}`)
+  const label = (d) => (names.indexOf(d.label) === names.lastIndexOf(d.label) ? d.label : `${d.label} ${d.id}`)
   const registry = Object.fromEntries(
-    Object.values(defs).map((d) => [label(d), `${d.type}[${(d.select_options ?? []).map((o) => o.value).join(', ')}]`]),
+    Object.values(defs).map((d) => [label(d), `${d.type}[${(d.select_options ?? []).map((o) => o.label).join(', ')}]`]),
   )
```

**VERIFY**

- [ ] `grep -n "shaped\|inToday\|todayOption" ".claude/scripts/Metadata Drive/live-drive.mjs"` returns nothing.
- [ ] `grep -n "d\.name\|o\.value\|\.options\[0\]\.value\|at(-1)?\.value" ".claude/scripts/Option Picker Drive/live-drive.mjs"` returns nothing; its zero-count Remove check (`:174`, "stripped from 0 Items.") and Clear at one (`:168`, `Clear “Alpha” from 1 Item?`) are unchanged and pass.
- [ ] `env -u ELECTRON_RUN_AS_NODE node live-drive.mjs 1 2 3 4 5 6 7 8 9`, run from `.claude/scripts/Metadata Drive/`, exits 0 with every check passing, each of the six messages asserted by its worded text; the harness's `restore()` returns `~/Test` to its pre-run state.
- [ ] `env -u ELECTRON_RUN_AS_NODE node ".claude/scripts/Option Picker Drive/live-drive.mjs"` exits 0 with every check passing.
- [ ] `grep -n "{ id: '', name\|d\.name\|o\.value" ".claude/scripts/Text Property Drive/live-drive.mjs" ".claude/scripts/Alias Drive/live-drive.mjs" ".claude/scripts/Path Links Drive/live-drive.mjs" .claude/scripts/nexus-watch.mjs` lists no registry read or `schema:add` payload; the Text Property and Alias drives' first groups and the Path Links Drive's seed run green.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, read outward over Phases 1 through 9 against the Done criteria in *MetadataV3 — Decisions & Intention*: a property titled `Description` under `lowercase` shows its title and writes `description:`; `Name:` and `name:` are two keys; a Multi-Select under `lowercase` adopts `green`, leaves `PURPLE` unread, and keeps it through an edit; a Value Format change leaves views untouched; a restored page returns in the current spelling; the leaf reads Metadata.
- [ ] The Metadata Drive's `MATRIX.md` and the Option Picker Drive are read against the decisions line by line: each case asserts the behavior its decision names, and no case was adjusted to pass around a behavior.
- [ ] `/view-delta` shows the phase: `frames.ts`, the drives, the three seeds, and the watcher.

### Phase 10 — Reconciliation

**GOAL:** Every living document and the comments no earlier phase owns read true of the code Phases 1 through 9 leave, by surgical in-place rewrite of the sentences they falsify, with nothing amended, superseded, or narrated. The documents describe identity as it stands: a `label` and a `key` on every property and option, exact matching, the two formats, adoption, and the Restore Re-Spell. No production behavior changes here.

The listed sentences are quoted from the tree at the plan's baseline. Each task replaces the quoted text in place with the text after `reads`; a sentence the decisions keep stays as written (the Checkbox word pairs "in any casing" per A-3, the reserved-key refusal "in any casing" per D-1, Context and Space title uniqueness per D-3, search and sort folds per F-2).

#### Task 10-1

**TASK:** Rewrite `Features/PropertiesPM.md`'s type table, *§Identity & Values*, option sections, Property Frame paragraph, mutation table, repairs, and validation for label, key, formats, adoption, and the Clear skip.

**NOW:** The document gives a property one `name` that is both its title and its key, matched and joined across spellings; says an option stores its word once as its `value`; says a Multi-Select reads members its definition doesn't list and a write collapses spellings into the registered one; and describes renames, deletes, option edits, repairs, and validation in terms of "any casing" and "every spelling".

**CHANGE**

- [ ] `PropertiesPM.md:18` — "The option's own value, in a list of one" reads "The option's own key, in a list of one"
- [ ] `PropertiesPM.md:27` — "Every property carries two independent identifiers." reads "Every property carries an identifier and two names."
- [ ] `PropertiesPM.md:27` — "Its **`name`** is the key a value is written under, bare and matched without regard to case — unique nexus-wide, case-folded, trimmed and NFC-normalized once at write; a name one of Pommora's own keys uses (`ID`, `banner`) in any casing, or one starting with `<`, is refused. A rename cascades the key across every page and Space holding it in any casing, joining the spellings a file holds into the one key (lists combine; any other value is kept from the spelling that's read), and a rename that changes only case changes the registry alone. A rename onto a taken name is refused. A rename onto a key that pages or Spaces already hold in any casing adopts their values, as registering the name would, and is refused only where a file holds both the old and the new key, naming how many do." reads "Its **`label`** is the name the app shows, stored as typed, and its **`key`** is the word a value is written under, bare and matched exactly, stored beside the label and written from it by the property's **Key Format**: `Match Title`, the default, makes the key the label, and `lowercase`, `UPPERCASE`, `kebab-case`, `PascalCase`, `camelCase`, `snake_case`, `Train-Case`, `UPPER_SNAKE_CASE`, and `UPPER-KEBAB-CASE` convert it. A key that differs from what the format would write, as in a hand-edited registry, stays the key until the next label or format change rewrites it. Both are trimmed and NFC-normalized once at write, and *Validation* holds what each may be. A label rename writes the key the format gives the new label and, where that key changes, cascades it across every page and Space holding the old key, a change of case alone included. A rename onto a taken label or key is refused. A rename onto a key that pages or Spaces already hold adopts their values, as registering the name would, and is refused only where a file holds both the old and the new key, naming how many do."
- [ ] `PropertiesPM.md:29` — "a Multi-Select reads members its definition doesn't list," reads "a Multi-Select adopts the members its Value Format could have produced and leaves any other word on the page unread,"
- [ ] `PropertiesPM.md:29` — "Keys and scalar values match without regard to case or quoting." reads "Keys and option words match exactly, whatever their quoting."
- [ ] `PropertiesPM.md:29` — "**A write keeps the file's spelling** — it lands on the key spelling the file holds, keeps a list's flow or block style and each unchanged value as written, and gives a changed string the quotes the file chose, never quotes YAML needed only for another value; a file without the key takes the registered spelling. When a file holds two or more spellings of one name, a list-holding property reads every spelling's members as one list, and any other property reads the registered spelling, else the first in the file; a write collapses the spellings into the registered one, a list holding every spelling's members." reads "**A write keeps the file's style** — it lands on the property's key, keeps a list's flow or block style and each unchanged value as written, and gives a changed string the quotes the file chose, never quotes YAML needed only for another value. A key in another casing is a different key, foreign to the property. A Multi-Select write keeps every word on the page that no option claims, after the options the write leaves picked, and emptying the property removes the key and those words with it."
- [ ] `PropertiesPM.md:53` — "An option stores its word once, as its `value`, so a rename rewrites that one word and cascades it onto every assigning page;" reads "An option stores a `label`, shown in the app, and a `key`, the word written to disk, so a rename rewrites the key on every assigning page wherever the new label gives a different one;"
- [ ] `PropertiesPM.md:74` — "Select stores a one-element list and renders one colored tag chip; Multi-Select stores a list and renders several." reads "Select stores a one-element list and renders one colored tag chip; Multi-Select stores a list and renders several. A **Value Format**, offering the Key Format's ten choices, writes each option's key from its label for Select, Status, and Multi-Select alone."
- [ ] `PropertiesPM.md:74` — "Select and Status keep the last element that names a registered option without regard to case, read as the option's own spelling (an unregistered one reads as no value; removing that option from the property reveals the registered one before it), Multi-Select keeps each element once, reading one that names a registered option as that option." reads "Select and Status keep the last element whose word is a registered option's key, read as that option's label (an unregistered one reads as no value; removing that option from the property reveals the registered one before it), Multi-Select keeps each such element once, reading it as that option's label and leaving any other word on the page unread."
- [ ] `PropertiesPM.md:74` — "A Multi-Select member a Space or a page of an assigning Collection holds that its definition doesn't list is registered as an option when the file changes" reads "A Multi-Select member a Space or a page of an assigning Collection holds that its definition doesn't list is registered as an option, its word becoming the option's key and label, provided the Value Format could have produced it and no option's label or key matches it without regard to case, when the file changes"
- [ ] `PropertiesPM.md:74` — "when the property is assigned to the page's Collection or the registry gains its key, and for every file once the Nexus opens." reads "when the property is assigned to the page's Collection, the registry gains its key, or its Key Format or Value Format changes, and for every file once the Nexus opens."
- [ ] `PropertiesPM.md:76` — "and Clear and Remove each ask first, naming the Items holding the option." reads "and Clear asks first, naming the Items holding the option, and skips the question when none holds it, while Remove always asks, naming them."
- [ ] `PropertiesPM.md:115` — "Renames and option edits change the global definition for every assigner." reads "Renames, format changes, and option edits change the global definition for every assigner. A property's editor opens with its **Key Format** row and, for a Select, Status, or Multi-Select, its **Value Format** row, divided from the type's own settings below."
- [ ] `PropertiesPM.md:129` — "then strips the value, under every spelling, from every member page" reads "then strips the value from every member page"
- [ ] `PropertiesPM.md:130` — "then sweeps every page and Space holding the old key in any casing; a change of case alone sweeps nothing." reads "then sweeps every page and Space holding the old key, a change of case alone included, to the key the Key Format gives the new label."
- [ ] `PropertiesPM.md:132` — "then the value is stripped everywhere, under every spelling, every cache block is purged" reads "then the value is stripped everywhere, every cache block is purged"
- [ ] `PropertiesPM.md:133` — "renaming an option rewrites its value, in any casing, on every page, Space, saved view, View Tile, and the Matrix filter, and removing one strips that value, in any casing, from the same and drops a filter rule left with nothing to match. A rename that couldn't update every file offers Try Again, and a removal offers it while the journal holds its record." reads "renaming an option rewrites its key, where the new label gives a different one, on every page, Space, and Collection value cache holding it, and its label in every saved view, View Tile, and the Matrix filter naming it; removing one strips its key from the pages, Spaces, and caches and drops a filter rule left with nothing to match. A rename or removal is refused while another record is owed, pointing to Try Again, and a rename that couldn't update every file offers Try Again, as a removal does while the journal holds its record."
- [ ] `PropertiesPM.md:137` — "The same reconcile joins the spellings a file holds of one list-holding property or Context key into the registered spelling and leaves a second spelling of any other property for a write to settle. A list naming one option or Space more than once is written with it once, in its registered spelling. Apart from a spelling it joins and a member it collapses, the reconcile removes nothing:" reads "A list naming one option or Space more than once is written with it once. Apart from a member it collapses, the reconcile removes nothing:"
- [ ] `PropertiesPM.md:139` — "A property's name is non-empty, unique nexus-wide (compared case-folded, because the name is the on-disk key), and may not start with `$`, which is reserved for system roles, start with `<`, which marks a Context key, or take a name Pommora keeps for itself on a page or a sidecar (`ID`, `banner`, `heading_icon_hidden`) in any casing; a leading `_` is allowed." reads "A property's label and key are each non-empty and unique nexus-wide (compared case-folded, since Obsidian reads two keys that differ only in case as one property), and may not start with `$`, which is reserved for system roles, or with `<`, which marks a Context key; neither may be a name Pommora keeps for itself on a page or a sidecar (`ID`, `banner`, `heading_icon_hidden`) in any casing, nor a name every object already answers to (`constructor`, `toString`) in its exact spelling, so a format change that would give the key one is refused, as is one that converts a label to an empty key; a leading `_` is allowed."
- [ ] `PropertiesPM.md:139` — "A definition a hand-edited registry holds under a refused name, or under a name an earlier definition holds in another casing, stays in the file and reaches no reader; two options that fold alike read as the first, and the second leaves the file on that property's next option edit." reads "A definition a hand-edited registry holds under a refused key, or under a label or key an earlier definition holds in another casing, stays in the file and reaches no reader; two options whose labels or keys fold alike read as the first, and the second leaves the file on that property's next option edit."
- [ ] `PropertiesPM.md:139` — "A create under a taken name steps aside with a numbered suffix, as any create does, while a rename onto one is refused." reads "A create under a taken label or key steps aside with a numbered suffix, as any create does, while a rename onto one is refused."
- [ ] `PropertiesPM.md:139` — "Option titles are non-empty and unique within their property, compared without regard to case, a Status group's label is non-empty," reads "Option labels and keys are each non-empty and unique within their property, compared without regard to case, a Status's options are checked at create as a Select's are, a Status group's label is non-empty,"
- [ ] `PropertiesPM.md`, *§Schema Mutations* table — one row is inserted directly after the `| Rename a property |` row:
  `| Change a format | Renames the property's stored key (Key Format) or every option's stored key (Value Format) on every page and Space holding it, with a Value Format change rewriting the Collection value caches alongside, after a confirmation counting the pages and Spaces it rewrites. Saved views, View Tiles, and the Matrix filter name options by label and stay as they are. A Value Format change is refused when it would give two options one key or give an option a key another option holds before the change, and it waits while another journal record is owed. Files the sweep skipped are reported with Try Again. |`

**VERIFY**

- [ ] `grep -n -i "every spelling\|file's spelling\|stores its word once" .claude/Features/PropertiesPM.md` returns nothing.
- [ ] `grep -n -i "any casing\|without regard to case\|case-folded" .claude/Features/PropertiesPM.md` returns only the Checkbox words (*§Identity & Values*), the duplicate check in the adoption sentence, and *Validation*'s reserved-key refusal and uniqueness comparisons.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 10-2

**TASK:** Rewrite `Features/CorePM.md` and `Features/PagesPM.md` where they say a key matches a property or a Context title without regard to case, that a rename or write reaches every spelling, and that the index finds a key by its folded form.

**NOW:** CorePM *§Foreign data survives* and *§Governed keys* describe spelling collapses and case-insensitive key matching, and its *Content index* row says each governed value is "findable by its folded key". PagesPM names a page's property keys "without regard to case".

**CHANGE**

- [ ] `CorePM.md:93` — "preserves every foreign key and YAML comment by value; a second spelling of a governed key leaves when a write collapses it into the registered spelling, or when a rename, removal, or delete reaches every spelling." reads "preserves every foreign key and YAML comment by value, a key that differs from a property's only in case included."
- [ ] `CorePM.md:94` — "A frontmatter key is a property's when it matches a registered property name without regard to case, and a Context's when it is a registered title, in any casing, wrapped as `<Title>`" reads "A frontmatter key is a property's when it matches a registered property's key exactly, and a Context's when it is a registered title exactly as titled, wrapped as `<Title>`"
- [ ] `CorePM.md:94` — "A property may not take a name Pommora's own keys use (`ID`, `banner`) in any casing, or one starting with `<`." reads "A property may not take a label or key Pommora's own keys use (`ID`, `banner`) in any casing, or one starting with `<`."
- [ ] `CorePM.md:155` — "each findable by its folded key," reads "each findable by its exact key,"
- [ ] `PagesPM.md:8` — "named as the property without regard to case and conforming" reads "named as the property's key and conforming"

**VERIFY**

- [ ] `grep -n -i "folded key\|second spelling\|every spelling" .claude/Features/CorePM.md` returns nothing.
- [ ] `grep -n -i "without regard to case" .claude/Features/PagesPM.md` returns nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 10-3

**TASK:** Rewrite `Features/ContextsPM.md`'s key and title matching, case-only rename, and member-cascade sentences for exact matching.

**NOW:** *Validation* says a key matches a registry title without regard to case and that two spellings of a key read and join as one list; *Renames* says the key is renamed "in every spelling a file holds" and that a case-only rename rewrites no member file; *Cascades open only members* says the index normalizes keys and titles "the way resolution matches" and that the rewrite changes "every spelling". Title uniqueness folding (`:13`) stays per D-3.

**CHANGE**

- [ ] `ContextsPM.md:12` — "A key matches a registry title without regard to case, and a file holding two spellings of one key reads their members as one list, which a write to that key joins under the registered spelling; a value matches, quoted or bare, through one normalizer (`normalizeTitle`) that folds case, whitespace, composition, and scalar drift, so `- 2024` still finds the Space titled "2024"." reads "A key matches a registry title exactly, so `<areas>:` is a foreign key; a value matches, quoted or bare, exactly as the Space is titled once its whitespace, composition, and scalar drift are read past, so `- 2024` still finds the Space titled "2024" and `- area one` finds no Space titled "Area One"."
- [ ] `ContextsPM.md:26` — "The key is renamed where it sits, in every spelling a file holds, keeping its position and any comment attached to it; a rename of a Context or a Space that changes only case rewrites no member file." reads "The key is renamed where it sits, keeping its position and any comment attached to it; a rename of a Context or a Space that changes only case rewrites its member files like any other."
- [ ] `ContextsPM.md:27` — "each Space title under it, normalized the way resolution matches, so a rename" reads "each Space title under it, exactly as titled, so a rename"
- [ ] `ContextsPM.md:27` — "the rewrite changes every spelling of the key and the title that resolution matches, a single value included." reads "the rewrite changes the key and the title as the file holds them, a single value included."

**VERIFY**

- [ ] `grep -n -i "two spellings\|every spelling\|spelling a file holds\|the way resolution matches" .claude/Features/ContextsPM.md` returns nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 10-4

**TASK:** Rewrite `Features/NexusRecordPM.md`'s *Restore* sentence for the Restore Re-Spell.

**NOW:** The reconciliation sentence says values "come back exactly as the file spelled them"; a restored page's keys and option words are now matched to the current properties and options whatever casing or format spelled them (G-1), and what matches nothing or more than one stays as G-2 handles it today.

**CHANGE**

- [ ] `NexusRecordPM.md:14` — "A returning artifact is reconciled against the world it comes back to: a governed key survives only if what it names still exists, values come back exactly as the file spelled them with a multi-value key narrowing to its survivors, and foreign frontmatter and the body never move." reads "A returning artifact is reconciled against the world it comes back to: its keys and option words are first matched to the property or option each names, whatever casing or Key or Value Format spelled it, and rewritten in its current key, its `<Title>` keys and the Space titles under them likewise, a key Pommora manages staying where it is and a spelling that names more than one returning as foreign data; a governed key then survives only if what it names still exists, values come back as the file spelled them with a multi-value key narrowing to its survivors, and foreign frontmatter and the body never move."

**VERIFY**

- [ ] `grep -c "exactly as the file spelled them" .claude/Features/NexusRecordPM.md` returns 0.
- [ ] The sentence keeps "A returning artifact is reconciled against the world it comes back to:" as its opening, the anchor Path Links' Task 9-1 inserts after.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 10-5

**TASK:** Rewrite `Features/ViewTypesPM.md:41` so Select and Status filters compare exactly.

**NOW:** The sentence says text comparisons ignore case on Select and Status; after Phase 3 their Is and Isn't compare an option exactly, while Title, Text, and Link keep the fold. Sort (`:55`) and Location's name match stay.

**CHANGE**

- [ ] `ViewTypesPM.md:41` — "Text comparisons ignore case on Title, Text, Link, Select, and Status." reads "Text comparisons ignore case on Title, Text, and Link, and Select and Status compare an option exactly by its label."

**VERIFY**

- [ ] `grep -n "ignore case on Title, Text, Link, Select" .claude/Features/ViewTypesPM.md` returns nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 10-6

**TASK:** Rename the Settings window's Properties leaf in `Features/InterfacePM.md` and `Features/ConfigurationPM.md` to Metadata, with its section Maintenance.

**NOW:** InterfacePM's rail list names "Properties"; ConfigurationPM's frame heading is `#### Properties` over the `**Metadata**` table (Task 9-1 renames the leaf and retitles its section). The Collection's Settings menu keeps its Properties entry, and the row's label and hint stay.

**CHANGE**

- [ ] `InterfacePM.md:76` — "Files & Links, Properties, Pages & Writing" reads "Files & Links, Metadata, Pages & Writing"
- [ ] `ConfigurationPM.md:135` — the heading "#### Properties" reads "#### Metadata".
- [ ] `ConfigurationPM.md:137` — the table label "**Metadata**" reads "**Maintenance**".

**VERIFY**

- [ ] `grep -n "Files & Links, Properties" .claude/Features/InterfacePM.md` returns nothing, and `grep -n "^#### Properties$" .claude/Features/ConfigurationPM.md` returns nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 10-7

**TASK:** Rewrite the four `PommoraPRD.md` sentences that describe folded matching and `name` as the key.

**NOW:** The PRD is maintained beside the feature documents (commit `21b35cf2d` brought it to the folded rule) and still says a Context key matches without regard to case (`:75`), that a write collapses a second spelling of a recognized key (`:101`), that a property's name is its key (`:141`), and that a Status stores its label and keys and options match without regard to case (`:145`).

**CHANGE**

- [ ] `PommoraPRD.md:75` — "a key matches its Context's title without regard to case." reads "a key matches its Context's title exactly."
- [ ] `PommoraPRD.md:101` — "Frontmatter and sidecar keys Pommora doesn't recognize are carried through untouched on every write, apart from a second spelling of a recognized key, which a write to that key collapses into its registered spelling and that property's rename, removal, or delete reaches — and" reads "Frontmatter and sidecar keys Pommora doesn't recognize, a key that differs from a property's only in case included, are carried through untouched on every write — and"
- [ ] `PommoraPRD.md:141` — "its name is the key its values write under, unique nexus-wide, and a rename sweeps every page holding it." reads "it carries a label shown in the app and a key its values write under, the key written from the label by its Key Format, each unique nexus-wide, and a change of key sweeps every page holding it."
- [ ] `PommoraPRD.md:145` — "a Status stores its label" reads "a Status stores its option's key", and "a key and an option match without regard to case." reads "a key and an option match exactly, each option carrying a label shown in the app and a key written from it by the property's Value Format."

**VERIFY**

- [ ] `grep -n -i "without regard to case\|second spelling\|its name is the key" .claude/PommoraPRD.md` returns nothing.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two review agents, `code-simplification` and `adversarial-review`, read outward over `.claude/Features`, `.claude/PommoraPRD.md`, `.claude/scripts/README.md`, and the Reconciliation list: every quoted sentence reads as replaced, no document still describes a folded key or option match, and no sentence the decisions keep (A-3, D-1, D-3, F-2) was rewritten.
- [ ] `node .claude/scripts/check-atlas.mjs` exits 0.
- [ ] `/view-delta` shows the phase: documentation and one comment only.

---

### Completion Criteria

- **Conformance:** every change sits under *§Constraints*; no mechanism landed that an existing one already provided (one key per property and option, one converter, one matcher for keys and labels, one key map for every list edit, one counter, one order resolver, one restore matcher); nothing changed outside the files the tasks name, and `Core/Sync/`, Path Links' link machinery, and Project Sapphire are untouched.
- **Correctness:** each behavior Nathan named is observably true in `~/Test` as the VERIFY lines exercise it: a property titled `Description` under `lowercase` shows `Description` and writes `description:`; a format change asks "This action would rewrite metadata in N Items" past one item and every file then reads the new spelling; `Name:` and `name:` on one page are two keys, the property's own key read and the other left on disk; a Multi-Select under `lowercase` adopts a hand-typed `green`, leaves `PURPLE` unread, and keeps it after the picked options through an edit; a Value Format change leaves saved views, View Tiles, and the Matrix filter working untouched; a page restored after a format change returns in the current spelling; the Key Format and Value Format rows sit at the top of every property's settings and the Settings leaf reads Metadata. NexusOS's cutover, run after the plan, reads its 337, 15, and 29 lowercase pages and moves the two `Tags:` pages to `tags:`.
- **Completeness:** every task and checkpoint in *§Process Overview* is ticked; every removal *§Concepts* names is gone; no scaffolding, debug output, or unauthorized TODO remains.
- **Confirmation:** every "write and watch fail" test went red before its change and green after; every VERIFY ran and its output was read; the registry rewrite ran on Nathan's word after its backup.
- **Continuity:** *§Reconciliation* is walked; the documents Phase 10 names read true; every deviation is fixed or ruled on under *§Deviations*.
- **Confidence:** the three gates are green from a clean checkout at HEAD; `view-delta <BASELINE>..HEAD` is reported with additions and removals apart, per phase and in total, against *§Overview · The Number*, and growth past it states what it bought; the neutral reviewer answers without ambiguity that the result holds to every principle this work set.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity encountered during execution was taken at its simplest reading and recorded; it didn't stop the run.

- [ ] Phase Review: Phase 1 · Phase 2 · Phase 3 · Phase 4 · Phase 5 · Phase 6 · Phase 7 · Phase 8 · Phase 9 · Phase 10
- [ ] **Simplification lens** — one `opus-xhigh` agent reads `<BASELINE>..HEAD` whole for what can be removed, folded, or hoisted now that every phase has landed: a duplicated decision, a helper used once, a guard whose cause the plan removed, a type arm no caller reaches. Its findings are applied before any adversarial read.
- [ ] **Adversarial lens** — two `opus-xhigh` agents over `<BASELINE>..HEAD`, one reading inward (each rule against its tests and the decisions) and one outward (cohesion with the rest of Core, Desktop, and UIX; anything that reads as an odd-one-out). The orchestrator verifies each finding against the code before applying it.
- [ ] **Neutral verification** — one `fable-high` agent, given only the BASELINE head, HEAD, and the intention under *§Constraints · Neutral Gate*, with no plan, log, or document, answers whether the result holds to every principle it states and what it would correct.
- [ ] **Own pass** — the live checks in `~/Test` once more end to end as Nathan would use them; the gates from a clean state; baseline counts; the diff read once; *§Completion Criteria* ticked.
- [ ] **Reconciliation** — *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled; the Path Links session sent the final generation (19), the Path Links Drive's seed now sending `label` (Task 9-2), `spend.test.ts:1031`'s end state (a trashed copy's blank `related:` beside the refilled `Related:`, the variant left foreign under G-1), the restore scrub's vocabulary (its comments, tests, and `NexusRecordPM.md:14` speak of keys and words matched and rewritten, leaving "re-spell" to links), and that Path Links' Task 8-2 `scrubReturning` hunk meets a sidecar closure taking `held` and a reconcile taking `inTransitKey` directly, its `skip` line gone (Task 8-1, Phase 2B).
- [ ] **Report** — in `closeout-review`'s closeout format, with the range presented through `/view-changes`, the per-phase and total delta, every deviation, and the neutral reviewer's answer verbatim.

#### Reconciliation

**Documentation**

- `.claude/PommoraPRD.md:75` — "a key matches its Context's title without regard to case." — Task 10-7
- `.claude/PommoraPRD.md:101` — "apart from a second spelling of a recognized key, which a write to that key collapses …" — Task 10-7
- `.claude/PommoraPRD.md:141` — "its name is the key its values write under, unique nexus-wide …" — Task 10-7
- `.claude/PommoraPRD.md:145` — "a Status stores its label … a key and an option match without regard to case." — Task 10-7
- `.claude/Features/PropertiesPM.md:18` — "The option's own value, in a list of one" — Task 10-1
- `.claude/Features/PropertiesPM.md:27` — "Every property carries two independent identifiers." — Task 10-1
- `.claude/Features/PropertiesPM.md:27` — "Its **`name`** is the key a value is written under, bare and matched without regard to case — unique …" — Task 10-1
- `.claude/Features/PropertiesPM.md:29` — "a Multi-Select reads members its definition doesn't list," — Task 10-1
- `.claude/Features/PropertiesPM.md:29` — "Keys and scalar values match without regard to case or quoting." — Task 10-1
- `.claude/Features/PropertiesPM.md:29` — "**A write keeps the file's spelling** — it lands on the key spelling the file holds, keeps a list's flow or …" — Task 10-1
- `.claude/Features/PropertiesPM.md:53` — "An option stores its word once, as its `value`, so a rename rewrites that one word and cascades it onto every …" — Task 10-1
- `.claude/Features/PropertiesPM.md:74` — "Select stores a one-element list and renders one colored tag chip; Multi-Select stores a list and renders …" — Task 10-1
- `.claude/Features/PropertiesPM.md:74` — "Select and Status keep the last element that names a registered option without regard to case, read as the …" — Task 10-1
- `.claude/Features/PropertiesPM.md:74` — "A Multi-Select member a Space or a page of an assigning Collection holds that its definition doesn't list is …" — Task 10-1
- `.claude/Features/PropertiesPM.md:74` — "adoption runs when the property is assigned to the page's Collection or the registry gains its key" (no Key Format or Value Format change) — Task 10-1
- `.claude/Features/PropertiesPM.md:76` — "and Clear and Remove each ask first, naming the Items holding the option." — Task 10-1
- `.claude/Features/PropertiesPM.md:115` — "Renames and option edits change the global definition for every assigner." — Task 10-1
- `.claude/Features/PropertiesPM.md:129` — "then strips the value, under every spelling, from every member page" — Task 10-1
- `.claude/Features/PropertiesPM.md:130` — "then sweeps every page and Space holding the old key in any casing; a change of case alone sweeps nothing." — Task 10-1
- `.claude/Features/PropertiesPM.md:132` — "then the value is stripped everywhere, under every spelling, every cache block is purged" — Task 10-1
- `.claude/Features/PropertiesPM.md:133` — "renaming an option rewrites its value, in any casing, on every page, Space, saved view, View Tile, and the …" — Task 10-1
- `.claude/Features/PropertiesPM.md:137` — "The same reconcile joins the spellings a file holds of one list-holding property or Context key into the …" — Task 10-1
- `.claude/Features/PropertiesPM.md:139` — "A property's name is non-empty, unique nexus-wide (compared case-folded, because the name is the on-disk …" — Task 10-1
- `.claude/Features/PropertiesPM.md:139` — "A definition a hand-edited registry holds under a refused name, or under a name an earlier definition holds …" — Task 10-1
- `.claude/Features/PropertiesPM.md:139` — "A create under a taken name steps aside with a numbered suffix, as any create does, while a rename onto one …" — Task 10-1
- `.claude/Features/PropertiesPM.md:139` — "Option titles are non-empty and unique within their property, compared without regard to case, a Status …" — Task 10-1
- `.claude/Features/CorePM.md:93` — "preserves every foreign key and YAML comment by value; a second spelling of a governed key leaves when a …" — Task 10-2
- `.claude/Features/CorePM.md:94` — "A frontmatter key is a property's when it matches a registered property name without regard to case, and a …" — Task 10-2
- `.claude/Features/CorePM.md:94` — "A property may not take a name Pommora's own keys use (`ID`, `banner`) in any casing, or one starting with …" — Task 10-2
- `.claude/Features/CorePM.md:155` — "each findable by its folded key," — Task 10-2
- `.claude/Features/PagesPM.md:8` — "named as the property without regard to case and conforming" — Task 10-2
- `.claude/Features/ContextsPM.md:12` — "A key matches a registry title without regard to case, and a file holding two spellings of one key reads …" — Task 10-3
- `.claude/Features/ContextsPM.md:26` — "The key is renamed where it sits, in every spelling a file holds, keeping its position and any comment …" — Task 10-3
- `.claude/Features/ContextsPM.md:27` — "each Space title under it, normalized the way resolution matches, so a rename" — Task 10-3
- `.claude/Features/ContextsPM.md:27` — "the rewrite changes every spelling of the key and the title that resolution matches, a single value included." — Task 10-3
- `.claude/Features/NexusRecordPM.md:14` — "A returning artifact is reconciled against the world it comes back to: a governed key survives only if what …" — Task 10-4
- `.claude/Features/ViewTypesPM.md:41` — "Text comparisons ignore case on Title, Text, Link, Select, and Status." — Task 10-5
- `.claude/Features/InterfacePM.md:76` — "Files & Links, Properties, Pages & Writing" — Task 10-6
- `Core/Index/contentIndex.ts:84` — "/** The pages holding a Context key in any casing, or — given a normalized Space title — those whose key …" — Task 3-4
- `.claude/Features/ConfigurationPM.md:135` — "#### Properties" (the Settings window's leaf heading) — Task 10-6
- `.claude/Features/ConfigurationPM.md:137` — "**Metadata**" (the leaf's section title) — Task 10-6

**Settings and Drives**

- `Core/Settings/frames.ts:637` — "key: 'properties'" (the Settings leaf's key) — Task 9-1
- `Core/Settings/frames.ts:638` — "label: 'Properties'" (the Settings leaf's label) — Task 9-1
- `Core/Settings/frames.ts:642` — "title: 'Metadata'" (the leaf's one section) — Task 9-1
- `.claude/scripts/Option Picker Drive/live-drive.mjs:24-25` — "reads the registry as `d.name` and `o.value`" — Task 9-2
- `.claude/scripts/Option Picker Drive/live-drive.mjs:33` — "`schema:add` takes `{name, type}`" — Task 9-2
- `.claude/scripts/Option Picker Drive/live-drive.mjs:94` — "finds an option by `o.value`" — Task 9-2
- `.claude/scripts/Option Picker Drive/live-drive.mjs:155-156` — "finds Gamma by `o.value`" — Task 9-2
- `.claude/scripts/Option Picker Drive/live-drive.mjs:250,254,272` — "reads a Status option's `.value`" — Task 9-2

**Code Comments**

- `Core/Files/heldKeys.ts:1` — "A name is held under its exact spelling, else the first key that folds to it ... a list read joins every spelling" — Phase 2
- `Core/Files/heldKeys.ts:10` — "The key `root` reads `name` under; an exact spelling answers before anything folds" — Phase 2
- `Core/Files/heldKeys.ts:14` — "What `root` holds for `name` ... or with `join` every spelling's value as one list" — Phase 2
- `Core/Files/heldKeys.ts:33` — "Where a write to `name` lands on `root` and the spellings it replaces" — Phase 2
- `Core/Files/heldKeys.ts:50` — "What a member matches by: a scalar's folded title" — Phase 3
- `Core/Files/heldKeys.ts:53` — "Every join of two spellings, and a `'merge'` rename, uses it" — Phase 2
- `Core/Files/heldKeys.ts:60` — "With `join`, every spelling is edited as one list landing where `writeTarget` places it" — Phase 2
- `Core/Files/heldKeys.ts:86` — "Strips every spelling of `name` from a root" — Phase 2
- `Core/Files/heldKeys.ts:94` — "A JSON root with every spelling of `oldName` moved to `newName`; the twin of `renameFrontmatterKey`, by the same collision and join rules" — Phase 2
- `Core/Files/pageFile.ts:142` — "a node spelled as the `held` spellings of its key are, the first the one it lands on" — Phase 2
- `Core/Files/pageFile.ts:172` — "A key written beside a dropped spelling of itself takes that spelling's place" — Phase 2
- `Core/Files/pageFile.ts:207` — "Renames every spelling of `oldName` the frontmatter holds to `newName`" — Phase 2
- `Core/Properties/governedWrite.ts:15` — "`raw` with `value` written where `writeTarget` places it, collapsing every spelling of `name`" — Phase 2
- `Core/Contexts/contextResolve.ts:19` — "Keyed by folded title" — Phase 2
- `Core/Contexts/contextResolve.ts:45` — "Keyed by folded name" — Phase 2
- `Core/Contexts/contextResolve.ts:102` — "Whether a read of `name` joins its spellings" — Phase 2
- `Core/Contexts/contextResolve.ts:110` — "A governed name reconciles once, under the key `heldKey` reads: a list's spellings join it under the registered spelling" — Phase 2
- `Core/Contexts/contextResolve.ts:137` — "one holding a member it can't resolve ... stays as written, every spelling of it" — Phase 2
- `Core/Contexts/contextCascade.ts:115` — "A title that changes only its case moves no key or value: every file's spelling already resolves to it" — Phase 2
- `Core/Contexts/contextWrite.ts:103` — "The far list is edited rather than replaced, so every spelling's members stay" — Phase 2
- `Core/Properties/registryProperty.ts:87` — "A list property's spellings join; any other keeps the value its read key holds" — Phase 2
- `Core/Properties/registryProperty.ts:124` — "A change of case alone moves no key, and the holders a folded query finds are ..." — Phase 2
- `Core/Properties/replaySchemaCascade.ts:51` — "The def still named `to` in any casing ... the sweep is owed, to the name the def holds now" — Phase 2
- `Core/Properties/properties.ts:65` — "Whether two spellings of the property's key join into one list" — Phase 2
- `Core/Properties/propertyValue.ts:240` — "a list property's every spelling joined, any other's the one key it reads" — Phase 2
- `Core/Properties/propertyValue.ts:246` — "its members keep the spelling given, since a read decodes them by fold" — Phase 3
- `Core/Properties/schema.ts:29` — "One folded lookup, built once per reader" — Phase 2
- `Core/Properties/schema.ts:21` — "Why `name` can't be a property's on-disk key" — Phase 5
- `Core/Properties/schema.ts:71` — "`def` holding each option title once, the first of any that fold alike" — Phase 5
- `Core/Properties/schema.ts:84` — "titles compare case-folded" (an option's uniqueness, now label and key) — Phase 5
- `Core/Properties/schema.ts:38` — "unique nexus-wide, compared case-folded because the name is the on-disk key" — Phase 5
- `Core/Contexts/contexts.ts:37` — "The folded titles a Context value names" — Phase 3
- `Core/Platform/stores.ts:11` — "the Space's folded title in a `space` row ... a folded Context key for a `space` row" — Phase 3
- `Core/Platform/stores.ts:66` — "Every page holding `key` in any casing" — Phase 3
- `Core/Platform/stores.ts:68` — "Every page whose Context `key`, in any casing, names the Space of the normalized `title`" — Phase 3
- `Desktop/Store/stores.ts:174` — "A `space` row holds the folded Context key in `qualifier`" — Phase 3
- `Core/Paths/caseFold.ts:6` — "the comparison key a path segment, title, or frontmatter key matches by … a title's stored membership key" — Task 3-1
- `Core/Properties/journalSlot.ts:1` — "the op now starting, which runs unjournaled" — Task 6-4

**Notes**

- A comment that stays true is left out: the Checkbox words "in any casing" (`Core/Properties/propertyValue.ts:75`, A-3), the reserved-key refusal (`Core/Properties/schema.ts:21`'s "in any casing" clause, D-1), label and key uniqueness (`Core/Properties/propertiesRegistry.ts:33`, D-1), and the search and sort folds (`Core/Paths/caseFold.ts`, F-2).
- `Core/Properties/schema.ts:21` is listed once, for the `name` wording, even though its reserved-key clause stays.

#### Open Items

Nathan's copy, decided at the Stop before Task 5A-1:

- **A Key Another Property Writes** (Task 5A-2, `KEY_REFUSAL.duplicateKey`): "A property already writes "{key}" to files."
- **Two Options Writing One Key** (Task 5B-3's `validateOptionValues`): "An option with this title already exists, please choose another name."; a Value Format change (Task 7B-2) refuses "This format would give two options the same key, please rename one first."
- **An Option Change Waiting for Try Again** (Task 6-4, `OWED`): "An earlier change hasn’t reached every file yet. Use Try Again on its notice first."
- **A Label That Leaves Its Key Empty** (Task 5A-2's `KEY_REFUSAL.noKey`, Task 5B-3's `validateOptionValues`): "Properties cannot contain an invalid name." and "Options cannot contain an invalid name.", reached through a format (Tasks 7A-3, 7B-2) or a registry written by hand; a blank label keeps "A name cannot be empty." and "Option titles can’t be blank."
- **A Value Format Change Crossing Two Options' Keys** (Task 7B-2, `CROSSED`): "This format would give one option the key another option writes now, please rename one first."
- **The Format Change's Confirmation** (Task 7B-4, `askFormatChange`): "This action would rewrite metadata in {N Items}.", detail "Each key changes to the new format; values stay the same.", action "Rewrite", tone `positive`.

Behaviors to read once before ratifying, each following the decisions:

- **A Context Edit Replaces a Foreign Space Title:** E-3's carry is a Multi-Select's alone, so picking Spaces on a page holding `- area one` beside a Space `Area One` writes the picked titles and drops `area one`, as a Context write already replaces its value.
- **Foreign Words Move After the Picks, and Emptying Removes Them** (E-3, Nathan's rulings).
- **The Registry Rewrite's Window:** from Phase 5A's first commit until Task 5B-4, a build reads neither Nexus; the gates run on fixtures, and the Stop before Task 5A-1 asks Nathan to keep Pommora closed through it.
- **A Restore Renames a Foreign Key a Format Could Have Written** (G-1, G-2): a page returning from the Trash holding an agent's `due_date` beside a Date property `Due Date` comes back holding `Due Date`, and the reconcile then drops a value the Date can't read; a key hand-edited away from every spelling of its label is matched only as written.
- **A Restore Keeps Pommora's Own Keys** (Task 8-1): G-1 matches a returning key against every format's spelling of every label, and D-1 refuses a key Pommora manages, so a Space's `heading_icon_hidden` or a page's `ID` stays where it is even beside a property labelled `Heading Icon Hidden` or `I-D`, whose `snake_case` or `PascalCase` spelling it is.
- **A Restored Collection's Saved Values Keep Their Old Keys:** a Collection in the Trash through a Value Format change comes back with its `property_cache` as it left, so a value removed from it before the delete doesn't return on reassign under the new format. No decision names that cache at restore, and re-spelling it costs a second cache pass in the scrub; the plan leaves it out.

An alternative Nathan raised during Phase 4, held open while the plan runs as written:

- **Label and Key Without Formats:** every property, and each Select, Multi-Select, and Status option, carries a label shown in the app and a key written to disk, the key taking the label at creation and edited beside it in one Label | Key field, and Pommora reads and writes only the key. It keeps Phases 1 to 6 and drops the Key and Value Formats, the converter, format-led adoption, and the restore re-spell (Phases 7A, 7B, and 8), at the cost of editing option keys one by one where a Value Format changes every option at once, and of a rule for whether a label rename moves its key.

#### Deviations

- **Undo Puts Back What the File Held** (Phase 3 review, Nathan's ruling): an undo wrote the decoded prior, so once words matched exactly a page holding only words no option names (`Tags: [work]`), a Select in another casing (`Status: done`), or a value its type can't read (`Count: abc`) lost its key on ⌘Z, confirmed live through the table's picker. `assignValue` now captures the raw value beside the decoded one, and the revert sends `restoreValue`, which the page and Space handlers land through the same resolve-and-lock and `writtenRoot` a `setProperty` does, `valueToWrite` being the one encode both share; a Context column's undo still writes its prior ids.

- **A Refill Never Replaces Words** (Phase 3 review): `refillValues` asked whether a root's value reconciles blank, so once words matched exactly a page holding only words no option names (`Tags: [ideas]`, or `Status: done` under `Done`) read as holding none and the re-assign replaced them with the cached value. It now skips any root whose key holds anything (`isBlankRaw`), as `refillTrashed` already did, and the cached value stays cached.

- **The Behavior Matrix** (Nathan, during Phase 2B): the Metadata Spelling Drive grew into the Metadata Drive, a nine-group matrix of every combination the decisions guarantee, by channel and by gesture, written to the end-state contract with one seed adapter and the six messages held open; each Review Checkpoint runs the groups landed so far, Task 9-2 finishes it rather than rewriting the old drive, and the README paragraph Task 10-7 rewrote came with it, so the PRD task is now 10-7.

- **Built-In Object Names Are Reserved** (Phase 2B review, Nathan's ruling): with reads landing on `root[key]`, a property named exactly `constructor`, `toString`, `valueOf`, `hasOwnProperty`, `__proto__`, or another name `Object.prototype` holds read a function off every page, so its column threw at render and its value couldn't be set. `keyRefusal` refuses those exact spellings with `KEY_REFUSAL.reserved`, so every read, write, admission, and later format is covered at the one gate; `Constructor` stays a free name.

- **A Rename Onto Itself Moves Nothing** (Task 2A-1, from the Phase 2A review): with the case-only skips gone, a Context's Try Again whose old title the Context holds again (a rename, a skip, then a rename back) swept `<Projects>` onto itself, and `renameFrontmatterKey` read the pair as its own rival and deleted the key from every holder. Both twins now answer null when `oldName` is `newName`, so the retry, the Space retry, and a replayed same-title record write nothing; `FrontmatterPair` went with it, the one lookup typing itself.
