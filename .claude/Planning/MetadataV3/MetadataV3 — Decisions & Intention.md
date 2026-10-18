### MetadataV3 — Decisions & Intention

**DATE:** 10-17-2026
**STATUS:** RATIFIED 10-17-2026

### Context

Pommora stores a property's values as YAML frontmatter keys on pages and as bare keys on Space sidecars, and its definitions in `.nexus/properties.json`. A property's `name` is at once its title in the app and its key on disk, and an option's `value` is at once its title, its word on disk, and its identity. Since Nathan's 10-03-2026 ruling, every key and option word matches without regard to case through one fold, `foldKey` in `Core/Paths/caseFold.ts`, and the spelling helpers in `Core/Files/heldKeys.ts`. A write keeps the file's spelling, two spellings of one key collapse into the registered one, and Context `<Title>:` keys and the Space titles under them ride the same machinery.

The fold makes NexusOS's lowercase, Obsidian-written `tags:` (337 pages), `description:` (15), and `version:` (29) read under the capitalized `Tags`, `Description`, and `Version`. It also means Pommora can't write the lowercase keys that tooling such as Claude Code agent and skill files expects (`model:`, `effort:`, `description:`) while the app shows capitalized titles. *MetadataV3 — Brief* carries the idea, and *MetadataV3 — Investigation* the verified state of the code at `3d191b895`.

### Overview

MetadataV3 replaces case-insensitive metadata identity with exact identity and per-property formats. Every property and every option stores two words: a `label`, shown in the app, and a `key`, written to disk. A property's Key Format writes its `key` from its `label`, and a Select, Status, or Multi-Select property's Value Format writes each option's `key` from its `label`. Reads and writes match the stored `key` exactly, on pages and Space sidecars alike, and Context keys and Space titles match exactly as titled.

A format change is a rename of stored keys on the rename and option-rename paths that already exist, confirmed with a count of the items it rewrites. Foreign Multi-Select words are adopted only when the Value Format could have produced them, and a page restored from the Trash has its keys and option words re-spelled into the current formats. The case-insensitive spelling machinery leaves every metadata read and write. The fold remains where case shouldn't separate two things: uniqueness of labels, keys, and titles, the reserved-key refusal, the restore's match, configuration references to options and Space `$order`, search, sort, and file names.

#### Concepts

- **Label:** the name a property or option shows in the app, stored as typed.
- **Key:** the word a property or option writes to disk, stored beside its label; for a property it's the frontmatter or sidecar key, for an option the word held under that key.
- **Key Format:** a property's setting that writes its key from its label.
- **Value Format:** a Select, Status, or Multi-Select property's setting that writes each option's key from its label.
- **Match Title:** the default for both formats; the key is the label exactly.
- **The Fold:** today's case-insensitive matching through `foldKey`, lowercase plus NFC.
- **Foreign Data:** a key no property claims, or an option word no option claims. Pommora leaves it on disk and doesn't read it as a property or an option; a page rename still rewrites a `[[…]]` link inside a foreign key, as it does today (`schema.ts:34`).
- **Adoption:** a foreign Multi-Select word becoming an option of its property.
- **Format Change:** changing a Key Format or Value Format, which rewrites every stored key it changes and every file holding one.
- **Restore Re-Spell:** matching a restored page's keys and option words to the current properties whatever casing or format spelled them, and writing them back in each one's current key.

---

### Decisions

#### A — Exact Identity

- **A-1 [CONFIRMED]:** Case-insensitive identity should end for properties wherever their values are stored: a property's key and each option's word on disk match with regard to case, so `Name:` and `name:` are two different keys. This knowingly supersedes Nathan's 10-03-2026 ruling that introduced the fold.
- **A-2 [CONFIRMED]:** `<Title>:` Context keys and the Space titles under them should match exactly as titled, so `<areas>:` or `- area one` reads as foreign data. Every Context value on NexusOS pages already matches its Space title exactly.
- **A-3 [CONFIRMED]:** Quote, number, Boolean, and link preservation should stay untouched. `"Foo"`, `Foo`, and `'Foo'` stay one word on read wherever the word conforms to the format. Today's other tolerances stay as well: a word with stray spaces around it, an unquoted numeral such as `- 2024` naming the option "2024", and a word stored in a different Unicode composition match as they do today.

#### B — Formats

- **B-1 [CONFIRMED]:** Each format should be a standing setting of its property that governs how Pommora reads and writes the property's metadata: the format writes the stored key, and every read and write matches that key.
- **B-2 [CONFIRMED]:** The format list should be `Match Title` plus nine conventions (`lowercase`, `UPPERCASE`, `kebab-case`, `PascalCase`, `camelCase`, `snake_case`, `Train-Case`, `UPPER_SNAKE_CASE`, `UPPER-KEBAB-CASE`), with `Match Title` the default for both rows.
- **B-3 [CONFIRMED]:** A Value Format should exist for Select, Status, and Multi-Select only; every other type keeps its current value formatting and gets no Value Format.
- **B-4 [CONFIRMED]:** Both formats should apply to properties wherever their values are stored, on page frontmatter and Space sidecars alike, under one rule. Contexts and Spaces themselves get no format: a `<Title>:` key and a Space title under it are written as the title.
- **B-5 [CONFIRMED]:** The converter should split a label into words at spaces, hyphens, underscores, and lowercase-to-uppercase humps, and keep every other punctuation mark inside its word, so `v5.0` stays `v5.0` and `J. Crew` in `kebab-case` is `j.-crew`. A label that converts to an empty key is refused. `lowercase` and `UPPERCASE` write the label fully lowercased or uppercased with its spaces and separators kept, so `New Property` gives `new property` and `Due-Date` gives `due-date`.
  - **[INFERRED]** A word also starts at an uppercase letter that follows another uppercase letter and precedes a lowercase one, so `IPhone` splits as `I` and `Phone` and `XMLHttp` as `XML` and `Http`. With it, a format converts its own output back to itself, as `iPhone 17` in `PascalCase` (`IPhone17`) and `A B Test` in `camelCase` (`aBTest`) do. Labels made of consecutive single letters are the exception: `A B` in `PascalCase` gives `AB`, which converts to `Ab`. The plan checks the round trip over a corpus of titles.
  - **[INFERRED]** Adoption (E-1) tests a foreign word by converting it: a word the format leaves unchanged is one it could have produced. A foreign word from the single-letter exception, such as `AB` under `PascalCase`, isn't adopted; a key Pommora writes itself is stored and read by its stored key, and a restore compares against what each format writes from the label (G-1), so the exception never touches Pommora's own keys.
  - **[INFERRED]** A format may write a word a YAML 1.1 reader would type, such as a bare `yes`, `on`, or a date-shaped word; Pommora's YAML 1.2 writer and reader keep it a string, and it's accepted.
- **B-6 [CONFIRMED]:** Under `PascalCase`, `camelCase`, and `Train-Case`, each word's first letter takes the format's case and the rest lowercase, so `URL Slug` gives `UrlSlug`, `urlSlug`, and `Url-Slug`. Adoption (E-1) recognizes accordingly: `Red` is valid under `Match Title`, `PascalCase`, and `Train-Case`; `RED` under `Match Title`, `UPPERCASE`, `UPPER-KEBAB-CASE`, and `UPPER_SNAKE_CASE`; `green` under `Match Title`, `lowercase`, `kebab-case`, `snake_case`, and `camelCase`.

#### C — The Registry

- **C-1 [CONFIRMED]:** Properties and options should share one pair of names: `label`, the name shown in the app, and `key`, the word written to disk.
- **C-2 [CONFIRMED]:** `properties.json` should store both words on every property and every option, even where the two are equal under `Match Title`. A property's `label` takes the place of today's `name`, and an option's `key` takes the place of today's `value`. The format writes `key` whenever the label or the format changes.
  - **[INFERRED]** A stored key that differs from what the format would write, as from a registry edited by hand or by an agent, stays the key: reads and writes trust it, and the format rewrites it at the next label or format change.
- **C-3 [INFERRED]:** The registries on disk should be rewritten once into the new shape by a step run during implementation, so no shipped decoder reads the old field names. That covers NexusOS's and `~/Test`'s `properties.json` and the six deleted-property records in their `.trash` folders (five in NexusOS, one in `~/Test`). A `label` a registry omits defaults to its `key`, as the standing rule for a registry written by hand or by an agent. The code that strips a leftover option `label` on each write goes.

#### D — Uniqueness

- **D-1 [CONFIRMED]:** Property labels and property keys should stay unique without regard to case, so `Name:` and `name:` can never belong to two properties. Obsidian treats them as one property, and a Sapphire write for one would land on the other. The reserved-key refusal runs on the key as well as the label, without regard to case as it does today. `Banner` and `Id` stay refused at creation, as they are now, and a format change can't reach a reserved key after the fact: `Heading Icon Hidden` is allowed under `Match Title`, and `snake_case`, which would give it `heading_icon_hidden`, is refused.
- **D-2 [CONFIRMED]:** Option labels should stay unique without regard to case within their property, so `Red` and `red` can't be two options.
  - **[INFERRED]** Option keys follow the same rule within their property, and a format change that would give two options one key is refused.
- **D-3 [CONFIRMED]:** Context and Space titles stay unique without regard to case, since they're folder names on a case-insensitive disk.

#### E — Adoption and Foreign Words

- **E-1 [CONFIRMED]:** Option adoption should follow the Value Format: a foreign Multi-Select word is adopted only when the format could have produced it, and the adopted word becomes the option's `key` and its `label`. Under `Match Title` a word of any casing qualifies; under `PascalCase` or `Train-Case` only `Red` does, and under `lowercase`, `kebab-case`, `snake_case`, or `camelCase` only `red`. A word whose label would match an existing option's without regard to case isn't adopted, and neither is a word the format couldn't produce, such as `due_date` under `kebab-case`; both stay foreign. With `color:` holding `red` and `blue` under `lowercase`, a foreign `green` is adopted, `PURPLE` isn't, and `Red` isn't, since it duplicates `red` whatever the format. Renaming an adopted option's label touches no files when the format writes the same key from the new label, as `in-progress` to `In Progress` under `kebab-case`; under `Match Title` the key follows the label (C-2).
- **E-2 [CONFIRMED]:** Select and Status should stay out of option adoption, since their groups, their order, and several foreign words held on one key all matter. Multi-Select adopts. Every other type keeps reading foreign-written values as it does today.
- **E-3 [CONFIRMED]:** An in-app edit of a Multi-Select should leave every word on the page it doesn't recognize untouched on disk. A Select or Status pick replaces the value, as it does today. A word adoption doesn't take (E-1) becomes an option only when the user adds it to the registry.
  - **[CONFIRMED]** An unrecognized word isn't read or shown until the property's format matches it, and never while it duplicates an existing option without regard to case (E-1).
  - **[INFERRED]** The Multi-Select write carries an unrecognized word from the file into the written list, the way the option cascades' `editList` already edits a held list in place (`pageValue.ts:19-34`).

#### F — Cascades and Confirmation

- **F-1 [CONFIRMED]:** Format changes should ride the sweep, journal, Try Again, and crash-replay machinery that already exists, with nothing rebuilt. A Key Format change is a rename of the property's stored key on the rename path. A Value Format change is a rename of every option's stored key on the option-rename path, widened from one pair of words to the whole list in one pass under one journal record.
  - **[INFERRED]** A format field is edited only through that path, never through the registry-only edit every other definition setting uses. Journal records carry stored keys, replay compares them exactly, and the widened record shields every owed old key from adoption while its sweep is outstanding.
- **F-2 [CONFIRMED]:** Everything in the app that names an option (saved view filters, sorts, groups, collapsed and hidden bands, View Tiles, the Matrix filter) should name it by `label`, which is what each holds today. A format change then rewrites only files holding the option's key and the Collection value cache (`property_cache`), and never the configuration.
  - **[CONFIRMED]** Those references, with the property and Context titles a Space's `$order` lists, follow one matching rule. Recognizing labels without regard to case only reconciles references edited outside the app, and labels can't differ only by case, so either rule picks one option. The planning agent decides between case-insensitive and exact by the honest amount of extra each introduces against today's mixed matching, and applies the one it picks everywhere.
- **F-3 [INFERRED]:** Holder lookups should query the content index by exact key. The index's folded column and its index go, which rebuilds the index once on first open.
- **F-4 [CONFIRMED]:** Changing a format should confirm with the count of items it would rewrite. It skips the confirmation when that count is zero, as when the format is changed right after the property is created, and when it is one, since asking about a single rewritten page is friction. Clear skips its confirmation at zero. Delete and Remove keep theirs at any count, since they still delete the property or the option. A label rename keeps rewriting its holders without a confirmation, as it does today.
  - **[INFERRED]** Clear keeps its confirmation at one, because it removes a value rather than re-spelling it.
  - **[INFERRED]** One dry-run counter beside the sweep serves every one of these confirmations, so each count equals what its operation rewrites.

#### G — Trash Restore

- **G-1 [CONFIRMED]:** A page restored from the Trash should have each key and option word matched to the current properties whatever casing or format spelled it, and re-spelled into the current key where a match exists, so a format change made while the page sat in the Trash reaches it at restore. A property labelled `Value One` takes back a trashed `VALUE ONE`, `value one`, `Value One`, `value-one`, `valueOne`, `VALUE-ONE`, `VALUE_ONE`, or `value_one` in its current spelling. Option words match the current options the same way, and a Space restored from the Trash follows the same rule.
  - **[INFERRED]** The match writes the current label in each of the ten formats with the converter (B-5) and compares the held word with those spellings without regard to case. A key Pommora wrote under any earlier format is one of them, `STRASSE` and `AB` included, so no word-splitting edge case reaches the match. It runs only when a restore lands, so live reads keep their exact lookup.
  - **[INFERRED]** A held key that is exactly a current key takes that property. A match naming more than one property or option, as `due-date` against both `Due Date` and `Due-Date`, returns as foreign data, and so does a key left from before a label rename made while the page sat in the Trash.
  - **[INFERRED]** `<Title>:` keys and the Space titles under them match the current Contexts and Spaces the same way at restore, so a retitle made while the page sat in the Trash reaches it when the held key is one of the new title's spellings.
- **G-2 [CONFIRMED]:** A key matching no current property, and an option word matching no current option, should be handled as the restore handles them today: the key returns as foreign data and is ignored, and the restore's reconcile drops the word. A live edit keeps an unrecognized word on disk (E-3), while a restore reconciles a returning page against the current registry, which is why the two differ. No cascade into `.trash` is added, and live reads and repair-on-open stay exact. NexusOS's `.trash` holds 254 pages.

#### H — The Settings Rows

- **H-1 [CONFIRMED]:** The rows should be named "Key Format" and "Value Format" and sit at the top of every property's settings, divided from the type's own settings below them. Each row carries a hint whose wording Nathan decides during planning.

#### I — Cutover and Interop

- **I-1 [CONFIRMED]:** NexusOS's cutover should be a format change and nothing more: once MetadataV3 lands, `Tags`, `Description`, and `Version` take a `lowercase` Key Format, which reads their 337, 15, and 29 lowercase pages and moves the two `Tags:` pages to `tags:`. Nathan makes the change in the app, or Claude makes it as a quick update; it blocks nothing.
- **I-2 [CONFIRMED]:** Sapphire needs no change: Nathan's own properties take the formats their Sapphire automations and frontmatter already use, so nothing conflicts.

#### J — Scope

- **J-1 [CONFIRMED]:** Five changes inside this surface ride along:
  - The property-delete count should equal what the delete rewrites.
  - The rename refusal and unswept notices should say Items, as the confirmations do.
  - A Status should have its options checked at create.
  - PropertiesPM should describe identity as it becomes.
  - The Settings window's Properties leaf should be named Metadata (`Core/Settings/frames.ts:637`).
- **J-2 [CONFIRMED]:** The brainstorm runs on the draft Studio-Brainstorm-V2, with the installed `studio-brainstorm` skill filling its blank sections. Planning runs on the draft Plan-Creation: where a section is blank or names a process it doesn't spell out, such as *Neutral Verification*, the planning session inherits it from the active Path Links plan (`.claude/Planning/Path Links/Path Links — Plan.md`) and the project's other documentation, and Plan-Creation wins wherever they conflict.

---

#### Constraints

- **Principles:** Nathan's *§Guiding Principles* and *§Approach* in *MetadataV3 — Brief* govern every phase. We assess what exists today for removal, consolidation, or replacement before adding anything; additions need evidence they're required and earn their place by what they let go. The codebase should end with fewer ways to do one thing, one owner per responsibility, and nothing transitional left behind. Net-negative lines are the north star, and a net-positive result needs its rationale stated against those principles.
- **Re-Verify, Then Reuse:** *MetadataV3 — Investigation* and *MetadataV3 — Scout Findings* are leads. A planning session or review re-verifies every claim it leans on against its own HEAD and reconciles the documents itself. On the data layer and the Trash, it finds the mechanism that already does the job and rides it before designing anything new: file counts, confirmation sweeps, property and value deletions, link strips, and the Space cascades have been worked repeatedly, and the plan extends them rather than building beside them. C-3, F-1's sub-entry, F-3, and F-4's second sub-entry are inferred readings of that machinery, which the plan confirms against the code; the other INFERRED entries are readings Nathan ratifies with this log.
- **Cost:** no format matching runs on a high-frequency trigger. Live reads become exact lookups by stored key, the restore's match runs only when a restore lands, adoption runs only on its existing triggers, and each reuses the converter rather than a second matcher.
- **Ordering:** exact matching lands before or with the formats. Under today's fold, `renameFrontmatterKey` deletes the key from every holder on a case-only pair (`pageFile.ts:221-230`), and the replay gate clears an owed case-only rename (`replaySchemaCascade.ts:53`).
- **[CONFIRMED]** Pommora runs on this Mac alone; no other device or build reads NexusOS or any shared Nexus, so no older build can collapse spellings a newer one keeps apart.
- **[CONFIRMED]** NexusOS and `~/Test` are the only Nexuses whose data must survive; benchmark Nexuses regenerate from `make-benchmark-nexus.mjs`.
- **Obsidian:** Obsidian 1.14.4 keys property types by the lowercased name, refuses a key that matches another on the note once both are lowercased, reads Bases frontmatter and tags exact-first and then case-blind, and keeps a Bases property's `displayName` apart from its key (`~/Library/Application Support/obsidian/obsidian-1.14.4.asar`).
- **Reach:** property cascades reach pages under Collection folders and every Space sidecar (`keyHolders.ts:14-41`). Pages outside every Collection aren't swept.

#### Rejected

- **Keeping the Fold With a Write Spelling:** reading keys case-insensitively and letting a format decide only the spelling of new keys. Ruled out by A-1.
- **Pages-Only Formats:** formats on page frontmatter only, with Spaces and Contexts folded. Every fold mechanism kept a Space or Context client, and about fifteen shared functions would have branched on page versus Space. Ruled out by B-4.
- **Derived Words:** storing only the label and deriving the word on disk through the format at each read and write. Ruled out by C-2, which keeps the word on disk legible in `properties.json` and lets a later converter change touch only the words it writes afterward.
- **Case-Variant Options:** `Red` and `red` adopted as two options under `Match Title`. Ruled out by D-2.
- **Token-Fold Recognition on Live Reads:** recognizing a word on every read across separators and casing by its words. It widens the fold this work removes; E-1 recognizes only what the format could produce, and only a restore matches across formats (G-1).
- **Select and Status Adoption:** ruled out by E-2.
- **Sweeping Into the Trash:** rewriting trashed pages on every format change. Done consistently, it reaches every property cascade and reads every file in `.trash` on each one, since the Trash isn't indexed; that is the cascade half of Indexed Trash. Trash indexing is an interesting idea for the codebase overall, but it should be considered separately.

#### Open Items

1. The hint wording for the Key Format and Value Format rows (H-1), and the title of the Metadata leaf's one section, which is already titled Metadata (J-1). Nathan decides both when planning reaches them.
2. Left to the plan, settled against the code it re-verifies:
   - Whether the `rename` and `option-rename` records carry label pairs beside key pairs, and how a Value Format change rewrites `property_cache` by key while leaving the configuration's labels alone, where `optionCascade` runs both from one pair today (`optionOps.ts:203-213`).
   - Whether a format change made while another journal record is owed is refused or runs unjournaled (`journalSlot.ts:37`; `registryProperty.ts:130`).
   - What a type change does with a property's Value Format and option keys across Select, Multi-Select, Status, and the types without options, given that a type change keeps the option arrays it moved away from (`properties.ts:286`).
   - Whether a Value Format change's count includes the Collection sidecars whose `property_cache` it rewrites.
   - Whether D-2's collision refusal already guarantees that no word is an old key of one option and a new key of another, or replay needs its own precheck.
   - Whether the Metadata leaf's `properties` key follows its label (J-1).

#### Prospects

- **Indexed Trash:** A page in the Nexus's own `.trash` stays indexed and inside every cascade while the app hides it. A restore then un-hides the page rather than reconciling it, and the link strip and Space unlink that a delete runs today move to the moment the Trash is emptied; system-trash mode keeps none of this. It would delete the restore reconcile, G-1's re-spell with it, and close the old-spelling gap for every cascade at once. It needs its own brainstorm: how every reader skips hidden rows, whether links to a trashed page still resolve and whether it keeps its title, and how emptying strips what a delete strips today.
- **Format Detection at Create:** a property created while pages already hold its label in another spelling takes the Key Format that matches, so creating `Tags` in NexusOS would come up `lowercase` and read its 337 pages at once. It needs a rule for a Nexus holding several spellings of one label.
- **Option IDs:** a stable id per option, as properties have, would let configuration reference an option by id and remove the configuration half of every option rename. It doesn't bear on formats.

---

#### Sources

- `.claude/Planning/MetadataV3/MetadataV3 — Brief.md`: the idea, Nathan's principles, and the planning session's shape.
- `.claude/Planning/MetadataV3/MetadataV3 — Investigation.md`: the verified state of the code at `3d191b895`, the removal inventory, and the reconciled scout reports.
- `.claude/Planning/MetadataV3/MetadataV3 — Scout Findings.md`: the earlier scouts at `e6e851183`.
- `Core/Paths/caseFold.ts`, `Core/Files/heldKeys.ts`, `Core/Files/pageFile.ts`: the fold, the spelling helpers, and the YAML rename.
- `Core/Properties/properties.ts`, `propertyValue.ts`, `schema.ts`, `registryProperty.ts`, `optionOps.ts`, `pageValue.ts`, `governedWrite.ts`, `keyHolders.ts`, `propertyJournal.ts`, `replaySchemaCascade.ts`: the registry, decode and encode, uniqueness, renames, option cascades, and the journal.
- `Core/Contexts/contextResolve.ts`, `contextCascade.ts`: governed reconcile and Context cascades.
- `Core/Properties/Schema/PropertyFrame.tsx`, `Core/Interface/Confirm/confirmations.ts`: the settings panel and the confirmations.
- `Core/Trash/restoreScrub.ts`, `restoreProperty.ts`, `holdings.ts`: restore and refill.
- `Desktop/Store/ddl.ts`, `stores.ts`: the content index.
- `~/NexusOS/.nexus/properties.json`, NexusOS frontmatter and `.trash`, and `~/Test`, read-only.
- `~/The Studio/Projects/Sapphire/src/core/store/caseFold.ts`, `src/core/frontmatter/frontmatterSplice.ts`: Sapphire's key resolution.
- `~/Library/Application Support/obsidian/obsidian-1.14.4.asar`: Obsidian's property-type registry, metadata editor, and Bases access.
- `.claude/sessions/10-03-2026-Pommora-Case-ID.md`: the ruling that introduced the fold.

---

### Session Questionnaire

The questions this session put to Nathan and his answers, cleaned up, in the order asked.

#### Alignment

- **Does Pommora run anywhere besides this Mac against NexusOS or a shared Nexus?** No.
- **Does any Nexus besides NexusOS, `~/Test`, and the regenerated benchmarks hold data that must survive?** No.

#### Trash

- **Should Indexed Trash be pursued inside MetadataV3?** No; MetadataV3 is planned alone, and Indexed Trash stays a separate later effort.
- **What should a page restored after a format change hold?** Its keys and option values are re-spelled into the current formats as it's restored.
- **Would sweeping into the Trash at each format change be better than re-spelling on restore?** The restore re-spell stays, since a consistent sweep into the Trash is the cascade half of Indexed Trash.

#### Scope and the Registry

- **Does reversing case-insensitivity reach Spaces and Contexts, or pages alone?** Everywhere for properties: their keys and option words follow the formats on pages and Space sidecars alike. Contexts and Spaces have no YAML format; they're written as their titles.
- **Should property definitions carry the same pair of names as options?** Yes: properties and options both use `label` for the display name and `key` for the word on disk, which reads less confusingly than `label` and `value`.
- **Should `<Title>:` Context keys and the Space titles under them match exactly, or keep the fold?** Exactly.

#### Formats, Uniqueness, and Adoption

- **Under `Match Title`, is a page's `- red` beside an option `Red` a second option, or foreign?** Adoption follows the format: `Match Title` accepts any casing, while `PascalCase` or `Train-Case` accept only `Red`. Option labels never differ only by case, so `red` beside `Red` isn't a second option.
- **Should two properties be barred from keys or labels differing only by case, with reserved keys checked on the key?** Yes; case-insensitivity stays for property duplication, so `Name:` and `name:` can't coexist.
- **What does "exact" include?** Quoting stays irrelevant: `"Foo"`, `Foo`, and `'Foo'` are one word on read when it conforms to the format. The other non-casing tolerances stay as they are.
- **Should only Multi-Select adopt foreign words, and only words the Value Format could have produced?** Yes. An adopted word becomes the option's key and its label as-is, and under a format such as `kebab-case` its label can be renamed (`in-progress` to `In Progress`) without touching files, since the format writes the same key; `due_date` under `kebab-case` isn't adopted or read. Select and Status stay out because their grouping, their order, and several foreign words on one key matter, and every other type keeps reading foreign values as it does today.
- **How does NexusOS cut over?** By setting `lowercase` on `Tags`, `Description`, and `Version` after landing, done by Nathan or as a quick update; it blocks nothing.
- **Which confirmations skip at zero?** A format change skips at zero, as right after creating a property, and at one page, since asking then is friction. Clear skips at zero, and Delete and Remove still ask.
- **What are the rows called and where do they sit?** "Key Format" and "Value Format", at the top of the settings and divided from everything below, each with a hint Nathan decides during planning.

#### Restore, Converter, and Edits

- **How does a restored page's key find its property?** It's matched to the current properties whatever casing or format spelled it: a trashed `VALUE ONE`, `value one`, `value-one`, `valueOne`, `VALUE-ONE`, `VALUE_ONE`, or `value_one` returns as `Value One`'s current spelling. Properties and values both restore into the current formats where they can; what can't be matched is dropped or ignored, as the restore does today. Spaces restored from the Trash follow the same rule.
- **What if a restored key matches two properties?** Left to G-1's inferred reading: a match naming more than one property returns as foreign data.
- **Should a label rename keep rewriting pages without asking while a format change asks?** Yes.
- **Should the converter split words at spaces, hyphens, underscores, and lowercase-to-uppercase humps, keep other punctuation inside its word, and refuse a label that converts to nothing?** Yes.
- **Does an in-app Multi-Select edit leave unrecognized words on disk?** Yes; a word adoption doesn't take becomes an option only when the user adds it to the registry.
- **Should Sapphire change, and should the four small fixes ride along?** Sapphire needs no change, since Nathan's own properties take the formats it already uses. The four fixes ride along, joined by the Metadata leaf below.
- **Should a property created over pages holding its label in another spelling take the matching Key Format?** Logged as a prospect.
- **Which Settings › Properties becomes Metadata?** The Settings window's Properties leaf; the Collection's Settings menu keeps its Properties entry.

#### Clarifications

- **Does the reserved-key refusal stay case-insensitive?** Yes: reserved properties and keys stay reserved without regard to case, as they are today, so no format change can rename a property's key onto a reserved one after the fact.
- **What do `lowercase` and `UPPERCASE` write?** The label fully lowercased or uppercased, spaces kept.
- **When does a foreign Multi-Select word get recognized?** Only once the property's format matches it, and never when it duplicates an existing option without regard to case. With `color:` holding `red` and `blue` under `lowercase`, `green` is adopted, `PURPLE` isn't, and `Red` isn't.
- **How careful does the matching have to be?** It's built without over-engineering and without latency that doesn't need to exist; the principles stand.

- **What fills Plan-Creation's blank sections?** Plan-Creation runs most of it. Neutral Verification and the other processes it names inherit from the active Connections planning (Path Links) and the project's other documentation, and the draft wins wherever they conflict.

- **Should configuration references match names without regard to case?** It only reconciles external edits; the planning agent decides by the honest amount of extra it introduces, and either way one rule applies everywhere.

#### Inferred Entries

- **Do PascalCase, camelCase, and Train-Case lowercase a word after its first letter?** Yes: `Red` is valid under `Match Title`, `PascalCase`, and `Train-Case`; `RED` under `Match Title`, `UPPERCASE`, `UPPER-KEBAB-CASE`, and `UPPER_SNAKE_CASE`; `green` under `Match Title`, `snake_case`, `kebab-case`, `lowercase`, and `camelCase`.
- **Should saved views, filters, and `$order` match option and property names with regard to case?** They should recognize them without regard to case, so a reference typed by hand into the JSON still works, unless that's harder to work with than it's worth.
- **The registry rewrite, format edits through the rename path, the index's exact lookup, and one counter for every confirmation?** These are implementation readings Nathan leaves to the plan. Pommora's file counts, confirmation sweeps, property and value deletions, link strips, and Space cascades already exist and have been worked many times, and the plan builds on them.
