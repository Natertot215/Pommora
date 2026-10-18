### MetadataV3 — Scout Findings

**DATE:** 10-17-2026
**BASELINE:** `e6e851183`

The four read-only scouts dispatched to ground *MetadataV3 — Brief*, each brief and report kept verbatim. Every scout worked at `e6e851183`; the planning session's scouts start here and re-verify each citation at their own HEAD. Spot-checks made before the brief was written are listed at the end.

#### The Scouts

| Scout | Model | Mandate |
| --- | --- | --- |
| A — Key Identity | `opus-high` | Every mechanism that folds a property key or preserves a file's key spelling, classified by what exact matching would remove |
| B — Option Model | `opus-high` | The option schema, option-value matching, adoption, and option cascades |
| C — Editor & Confirmations | `opus-medium` | The definition editor surface, the holder counts and confirmation dialog, the rewrite sweeps, Checkbox and Number vocabularies, casing utilities |
| D — History & Interop | `sonnet-medium` | Why case-insensitivity exists, Obsidian and Sapphire interop, real Nexus data, planning-folder convention |

---

#### A — Key Identity

**Brief:**

> You're a read-only scout in Pommora, a local-first Electron/React/TypeScript productivity app at `~/The Studio/Projects/Project Pommora`. Do not edit any file, run the app, or commit. Read `.claude/CLAUDE.md` and `.claude/Features/PropertiesPM.md` first for orientation; treat docs and code comments as claims, and the code as the truth.
>
> #### Background
>
> Pages are Markdown files whose YAML frontmatter holds property values; Spaces hold the same values as bare keys on a JSON sidecar (`_space.json`). Property definitions live in `.nexus/properties.json`. Nathan (the owner, non-technical) believes property *keys* are currently matched case-insensitively: a property named `Name` reads a page holding `name:`, writes new keys as `Name:`, and keeps `name:` when editing a page that already holds it.
>
> He's considering replacing that across-the-board case-insensitivity with a per-property **Key Format** setting (`Match Title` default, plus lowercase, UPPERCASE, kebab-case, PascalCase, camelCase, snake_case, Train-Case, UPPER_SNAKE_CASE, UPPER-KEBAB-CASE). The user-facing title stays as typed; the setting decides the exact on-disk key spelling, which would be read AND written exactly — so `Name` and `name` would no longer be the same key. It would apply to Pages and Spaces alike. Nothing is decided; your job is grounding a later planning session, not designing it. The planning session works removal-first: before anything is added, it wants to know everything that exists today that this idea would delete, collapse, or make unreachable.
>
> #### Your Mandate: Key Identity, Matching, and Spelling Preservation
>
> Map, with `file:line` evidence, every mechanism that makes a property key's identity case-insensitive or preserves a file's key spelling, across read and write paths. Include at least, and follow wherever they lead:
>
> - How a property's `name` is normalized/folded (registry write, validation, uniqueness, reserved names like `ID`/`banner`/`heading_icon_hidden`, `$`/`<` prefixes) — `Core/Properties/propertiesRegistry.ts`, `registryProperty.ts`, `Core/Contract/validators.ts`, and whatever they call.
> - How a held key is matched to a definition on read (frontmatter parse, `Core/Files/heldKeys.ts`, `Core/Files/pageFile.ts`, the content index in `Core/Index`, view pipeline filters/sorts/grouping, Space sidecars).
> - How writes keep the file's key spelling vs. the registered one (`mergeInto`, `nodeSpelledAs`, `renameFrontmatterKey`, `Core/Contexts/contextResolve.ts` `reconcileGovernedRoot`, the "two or more spellings of one name" join/collapse rules).
> - Renames: the rename cascade sweeping "any casing", the "case-only rename changes the registry alone" rule, the "rename onto held keys adopts them" rule, `renameSweep`, `repairSweep`, `governedSweep`, the journal.
> - Foreign keys: how a key the registry doesn't name is preserved and becomes live when a definition names it.
> - Context keys (`<Title>:`), which aren't schema definitions — note whether they share the same case-folding machinery, since a per-property format wouldn't obviously cover them.
>
> For each mechanism, report: what it does, where it lives, who calls it, and whether it exists *only* to serve case-insensitive key identity (removable/simplifiable under exact matching), serves it *partly* (would change), or is independent (stays). Count call sites where it matters.
>
> #### Also Report
>
> - Every point where Nathan's description above is inaccurate or incomplete, stated plainly.
> - Where key spelling is computed or compared in more than one way (duplicated folding, divergent normalizers) — consolidation opportunities.
> - Existing case-conversion utilities anywhere in `Core/` or `UIX/` (e.g. `capitalize`, camelCase handling of type ids) that a format setting could reuse.
> - Hazards you see: e.g. two properties whose titles differ but whose formatted keys collide, uniqueness moving from title to key, what happens to existing Nexuses holding mixed casings, Obsidian/YAML-tool interop, sync/journal implications.
> - Your own opinions and concerns, clearly labeled as opinion.
>
> #### Report Format
>
> Markdown, H4/H5 headings, `file:line` citations on every factual claim. Sections: Findings (mechanism inventory as a table: Mechanism • Location • Role • Classification • Notes), Corrections to Nathan's Claims, Consolidation Opportunities, Hazards & Open Questions, Opinions. No preamble. Be complete but don't pad.

**Report:**

##### Findings

###### The Shape of It

All key folding goes through one primitive, `foldKey` (lowercase, then NFC) at `Core/Paths/caseFold.ts:7-9`. `normalizeTitle` is `foldKey` after a trim (`caseFold.ts:12-14`), and `spellings` returns every key that folds to a name, with the exact spelling first (`caseFold.ts:17-21`). There are roughly 130 non-test call sites of `foldKey`/`normalizeTitle`/`spellings`, but only about 30 of them fold **property or Context keys**. The rest fold option values, Space, Context and page titles, headings, aliases, asset basenames and file paths, and the Key Format idea leaves all of those alone. Key identity is spread across two layers:

- **Name → Definition Lookup:** this maps a held key to its definition. `byFoldedName` (`Core/Properties/properties.ts:49-50`) builds a folded-name map, which is then queried with `foldKey(key)`.
- **Definition → Held Keys:** this finds the keys a root holds for a name. `Core/Files/heldKeys.ts` holds the functions `heldKeys`, `heldKey`, `heldValue`, `writeTarget`, `rekeyHeld`, `stripHeld` and `editHeldList`, all built on `spellings`.

**Context keys (`<Title>:`) use the same machinery.** `governorOf` resolves a property def and a Context group in one function (`Core/Contexts/contextResolve.ts:93-98`), and a Context always joins its spellings (`'group' in governor`, `contextResolve.ts:100`). Context renames use the same `rekeyHeld`/`renameFrontmatterKey`/`editHeldList` (`Core/Contexts/contextCascade.ts:39,46,89,140-144,161`). Context titles are also folder names (`contexts.ts:16` `holdsName`; `contextCascade.ts:231-235` relocates the directory), so their folding also reflects case-insensitive filesystems. **Most of `heldKeys.ts` therefore stays unless Context keys go exact too.**

`Core/Contract/validators.ts` holds shape helpers only: `isScalar`, `listOf` and `scalarMembers` at `validators.ts:7-11`. It has no key-identity logic. The view pipeline (filters, sorts, grouping) never touches keys directly. Rows are read through `resolveFieldValue` by property **id** (`Core/Properties/value.ts:37-61`), which calls `heldPropertyValue` (`value.ts:57`). The `foldKey` calls in `Core/Views/Pipeline/filter.ts:83,97-98,252` fold filter **values** and Set titles, not keys.

###### Mechanism Inventory

Classification key:
- **Only:** exists only for case-insensitive key identity, so it can be removed or simplified under exact matching.
- **Partly:** would change.
- **Independent:** stays.
- **Stays (Context):** survives a properties-only change because Context keys use it.

| Mechanism | Location | Role | Classification | Notes |
| --- | --- | --- | --- | --- |
| `foldKey` / `normalizeTitle` / `spellings` | `Core/Paths/caseFold.ts:7-21` | The fold primitive | Independent | Shared with titles, paths, options and sync. `spellings` has 5 callers: `heldKeys.ts:8`, `pageFile.ts:174,181,222`, `atomicWrite.ts:322` (a filename spelling, unrelated). |
| `normalizePropertyName` | `Core/Properties/properties.ts:272-274` | Trim + NFC on create and rename | Independent | 2 sites: `registryProperty.ts:54,116`. It does **not** fold, so names are stored as typed. A format function would run after it. |
| `byFoldedName` | `properties.ts:49-50` | Name→def map keyed by folded name | Only | 7 sites: `contextResolve.ts:59`, `restoreScrub.ts:35`, `Nexus/cascade.ts:79`, `schema.ts:31`, `assignment.ts:41,45`. Becomes a map keyed by exact key. `GovernedWorld.defs` is typed "Keyed by folded name" (`contextResolve.ts:45-46`). |
| `holdsList` | `properties.ts:65-69` | Whether a property's spellings join (multiSelect, file) | Only | 5 sites: `contextResolve.ts:100`, `assignment.ts:63`, `propertyValue.ts:244`, `registryProperty.ts:89`, `pageValue.ts:42`. With one key per property, nothing joins. Contexts don't use it because they join unconditionally. |
| `RESERVED_KEY_NAMES` / `keyRefusal` | `Core/Properties/schema.ts:17-27` | Refuses `ID`, `banner`, `id`, `heading_icon_hidden`, `$…` and `<…` in any casing | Partly | 3 callers: `schema.ts:34,44`, `propertiesRegistry.ts:34`. It would need to test the **formatted key**. Readers are exact: pages read `fm['ID']` (`Core/Nexus/identityMark.ts:34`) and Spaces test `SPACE_MODELED_KEYS.has(k)` (`Core/Contexts/spaceSidecar.ts:18-24,73`), so the fold here is only a safety margin. |
| `validateName` uniqueness | `schema.ts:39-50` | Name unique nexus-wide, compared folded | Partly | 3 sites: `schema.ts:56`, `registryProperty.ts:122,136`. Uniqueness moves from the title to the formatted key. |
| Registry admission | `Core/Properties/propertiesRegistry.ts:29-37` | The first def per folded name is admitted; later ones ride as `unadmitted` | Partly | Would admit by key. Under exact matching, a hand-edited registry holding `Name` and `name` would admit both. |
| `freeName` on create | `registryProperty.ts:53-56` → `Core/Paths/names.ts:56-64` | Steps a taken name aside (`Name (2)`), compared folded | Partly | `freeName` is shared with files, views and Spaces (8 callers). Only the property call changes, and it must step aside on the **key**. Its suffix ` (2)` also has to survive every format (kebab → `name-2`?). |
| Journal supersede on create | `registryProperty.ts:69-76` | A create under a journaled delete's name clears the record (folded compare) | Partly | 1 site. Becomes an exact key compare. |
| `heldKeys` / `heldKey` | `Core/Files/heldKeys.ts:8-12` | All spellings of a name, with the exact one first | Stays (Context); Partly for properties | `heldKey` has 12 property-side callers: `setProperty.ts:26`, `PropertyPanel.tsx:215`, `keyHolders.ts:33,38,59`, `deleteProperty.ts:62`, `Nexus/cascade.ts:124`, `useContainerValues.ts:21`, `matrixInput.ts:98`, `contextResolve.ts:76,122`, and `heldKeys.ts:104`. For properties each becomes `key in root`. |
| `heldValue` (join) | `heldKeys.ts:15-26` | Reads one spelling, or joins every spelling into one list | Stays (Context); Partly | This is a **second fold implementation**: it filters by `foldKey` in root order (`:20-21`) instead of calling `heldKeys`. Callers: `contextResolve.ts:78,127`, `contextWrite.ts:105`, `Trash/holdings.ts:140`, `Trash/spend.ts:292`, `propertyValue.ts:244`, `governedWrite.ts:19`, `pageFile.ts:232`. |
| `writeTarget` / `landValue` | `heldKeys.ts:34-48` | Where a write lands: on the lone held spelling, or collapses ≥2 spellings into the registered name | Partly (`landValue` Independent) | 7 `writeTarget` sites with **inconsistent collapse flags** (see *§Consolidation Opportunities*). Under exact keys, a property write is `landValue(root, {key, govern: []})`. |
| `memberKey` / `joinValues` | `heldKeys.ts:50-58` | Folds list members; joins two spellings' lists | `memberKey` Independent; `joinValues` Partly | `joinValues` also serves the Context rename merge (`heldKeys.ts:109`), Trash re-tagging (`spend.ts:292`) and the frontmatter rename (`pageFile.ts:233`). |
| `editHeldList` | `heldKeys.ts:61-78` | Edits every spelling's list, joined or each in place | Stays (Context); Partly | 3 sites: `contextCascade.ts:46,161`, `pageValue.ts:42`. The property call drops its `join` parameter. |
| `stripHeld` | `heldKeys.ts:87-90` | Strips every spelling of a name | Only | 2 sites: `removeProperty.ts:55`, `deleteProperty.ts:119`. Becomes `stripKeys(root, [key])`. Context unlink uses `heldKeys` + `stripKeys` directly (`contextCascade.ts:140-144`). |
| `rekeyHeld` | `heldKeys.ts:95-110` | JSON twin of the rename: moves every spelling, applies the rival/collision rule and the join | Stays (Context); Partly | 2 sites: `registryProperty.ts:92` (`prefer-new`) and `contextCascade.ts:39` (`merge`). For properties it simplifies to a single-key move plus the rival rule. |
| `renameFrontmatterKey` | `Core/Files/pageFile.ts:207-243` | YAML twin of `rekeyHeld` | Stays (Context); Partly | 2 sites: `registryProperty.ts:91`, `contextCascade.ts:89`. |
| `mergeInto`, the "spelling takes its place" step | `pageFile.ts:171-177,181` | A written key replaces a dropped spelling of itself at the same position; the dropped spellings' nodes feed style | Stays (Context); Partly | Only spelling collapse ever reaches it. With property keys exact and Contexts still folded, Contexts would be its only client. |
| `nodeSpelledAs` | `pageFile.ts:143-161` | Keeps flow/block style and quotes from the held value | Independent | Only what's passed as `held` changes (`pageFile.ts:181,235`). |
| `writtenSpelling` / `checkedSpelling` | `Core/Properties/propertyValue.ts:166-208` | Keeps a **value's** spelling (checkbox words, number text, list members) | Independent | Value spelling, not key spelling. |
| `heldPropertyValue` | `propertyValue.ts:241-244` | The single property read entry | Partly | 6 sites: `value.ts:57` (every view, filter, sort and group), `optionOps.ts:102`, `assignment.ts:60`, `keyHolders.ts:66`, `deleteProperty.ts:65`. Becomes `root[key]`. |
| `applyValueAtRoot` | `propertyValue.ts:247-256` | The renderer's optimistic copy of a host write | Partly | 2 sites: `assignValue.ts:41`, `useViewCreation.ts:53`. It must mirror the host's landing rule exactly. |
| `governorOf` / `joinsSpellings` | `contextResolve.ts:93-106` | Folded key → property def or Context group | Partly | The property branch (`:94`, `world.defs.get(foldKey(key))`) becomes an exact lookup. The Context branch stays (`:61-65`, `idByTitle` folded). |
| `reconcileGovernedRoot` | `contextResolve.ts:110-157` | The per-write reconcile: re-encodes each governed value, joins list spellings and retires the extras | Partly | 5 sites: `governedWrite.ts:18`, `repairSweep.ts:39`, `restoreScrub.ts:55,75`. The join/retire half (`:126-127,142-148`) becomes Context-only. Re-encoding stays. |
| `resolveContextKeys` | `contextResolve.ts:67-84` | Context key → Space ids, folded | Stays (Context) | 2 sites: `pageRow.ts:17`, `readNexus.ts:82`. |
| `writtenRoot` / `setGovernedRootKey` | `Core/Properties/governedWrite.ts:16-42` | Every governed page and Space value write | Partly | Callers: `Nexus/page.ts:106`, `setProperty.ts:28`, `contextWrite.ts:65,108,115`, `setBanner.ts:29`. |
| `page_values.fold` and the `queryKeyHolders` fold | `Desktop/Store/ddl.ts:37,41`; `Desktop/Store/stores.ts:73,158-164`; `Core/Testing/memoryStores.ts:176-181`; `Core/Index/contentIndex.ts:80-82` | Finds the pages holding a key in any casing | Only | The column and its index exist only for this. The replacement would query the `key` column, which needs its own index because the PK is `(path, key)`. The index is regenerative (*§Locked Decisions*: Database), so a schema change costs a rebuild. |
| `queryMembers` qualifier | `stores.ts:166-173`; `Core/Index/indexSeed.ts:67` | Context membership by folded key | Stays (Context) | |
| `relations.key` | `indexSeed.ts:56` | Value-link rows store the key exactly as spelled; the registry decides later, folded, whether that key holds links | Partly | Matched through `linkKeysOf` (below). |
| Key holders | `Core/Properties/keyHolders.ts:14-74` | Files holding a key: index plus disk confirmation, and Space sidecars | Partly | `heldKey` at `:33,38,59`. Callers include rename, delete, remove, the holder count and replay. |
| `renameSweep` | `registryProperty.ts:82-98` | The rename cascade over pages and Spaces, plus the `$order` entry | Partly | Stays as the cascade **and** becomes the migration and format-change engine. Its `join` parameter goes. Also called by replay (`replaySchemaCascade.ts:55`). |
| The "case-only rename changes the registry alone" rule | `registryProperty.ts:121,125-126,150` | `recased` skips the clash check and the sweep | Only | Under exact keys a case-only change is a real key change and needs a sweep. |
| `bothKeyHolders` / the held-key refusal | `registryProperty.ts:102-108,126-128` | A rename onto held keys adopts them, and is refused where a file holds both | Partly | The rule stays; matching becomes exact. |
| Replay rename and delete checks | `Core/Properties/replaySchemaCascade.ts:38-62` | `named()` compares folded | Partly, and a **hazard** | See *§Hazards & Open Questions*. |
| `sameRecord` | `Core/Properties/propertyJournal.ts:14-25` | Journal identity, exact | Independent | |
| Repair on open | `Core/Properties/repairSweep.ts:17-45` | Runs `reconcileGovernedRoot` over re-read pages | Partly | The property spelling joins go; re-encoding stays. |
| `governedSweep` | `Core/Properties/governedSweep.ts:59-109` | Generic per-file fan-out | Independent | |
| Delete-cascade link strip | `Core/Nexus/cascade.ts:79-91,124` | Strips Link values naming a deleted page under **every key that folds** to a Link def; `:124` dedupes back to the read key | Partly | A third matching style: per key → fold → def. |
| `linkKeysOf` | `schema.ts:29-36` | Which keys hold links (graph and heading rewrites) | Partly | 2 sites: `Nexus/cascade.ts:175`, `matrixInput.ts:66`. |
| Restore scrub | `Core/Trash/restoreScrub.ts:35-47,74-75` | Strips gone Links on restore under every folded key, then reconciles | Partly | |
| Trash refill and re-tag | `holdings.ts:140-141`; `spend.ts:292` | Puts a value back where `writeTarget` places it | `holdings` Partly; `spend` Stays (Context key) | |
| `oweNamedKeys` | `Core/Nexus/fileEvents.ts:513-530` | A multiSelect gaining a new **folded** name owes option registration | Partly | A format change would also need to count as "names a new key". |
| PropertyPanel held check and `$order` | `Core/Properties/PropertyPanel.tsx:213-224` | Row shown if `heldKey` finds it; Space row order matched by folded **name** | Partly | Space `$order.properties` stores property **names**, not ids (`spaceSidecar.ts:89-96`, renamed through `withOrderEntry` at `registryProperty.ts:95`, `deleteProperty.ts:122`, using a folded `editList` at `pageValue.ts:11-14`). |
| `rekeyOverrides` | `Core/Views/Host/useContainerValues.ts:16-27` | Re-keys optimistic overrides on a rename epoch | Partly | |
| Matrix filter `answers` | `Core/Matrix/matrixInput.ts:81-100` | A row answers a rule if `heldKey` finds the key | Partly | |
| Space property clear | `Core/Properties/setProperty.ts:21-29` | No-op when no spelling is held | Partly | |
| Context title fold and recase skip | `contextCascade.ts:115-118,212-224,271-275,318-320`; `contextResolve.ts:33,63` | Context titles unique folded; a case-only Context rename sweeps nothing | Stays (Context) | |
| Option, Space-title, heading and alias folds | e.g. `propertyValue.ts:43-60`, `schema.ts:71-92`, `contexts.ts:38-39`, `Connections/*` | Value and title identity | Independent | These are what Nathan's "case-insensitive" covers that the Key Format idea doesn't touch. |

##### Corrections to Nathan's Claims

- **The fold isn't only case.** `foldKey` is lowercase plus NFC (`caseFold.ts:7-9`), so keys are also insensitive to Unicode composition. It uses `toLowerCase`, not full Unicode case folding (`ß` doesn't match `SS`). Names are also trimmed and NFC-normalized at write (`properties.ts:272-274`).
- **The name is stored as typed, not folded.** PropertiesPM.md (line 144) says "case-folded, trimmed and NFC-normalized once at write". The code stores the trimmed, NFC form and folds only when comparing (`normalizePropertyName` vs `validateName`, `schema.ts:46-47`). The doc wording likely shaped the "it's all case-insensitive" model.
- **"Reads a page holding `name:`" is true, with a rule for multiple spellings.** When a file holds several spellings:
  - The exact registered spelling wins for scalar types (`heldKeys.ts:11-12`).
  - Multi-select and File **join** every spelling into one list (`properties.ts:66-69`, `heldKeys.ts:15-26`).
  - Select, Status, Text and the other scalar types ignore the other spellings.
- **"Keeps `name:` when editing" holds only for a lone spelling.** With two or more spellings, a write collapses them into the registered spelling (`heldKeys.ts:34-39`, `governedWrite.ts:17`). Writes also reach keys you didn't edit: every governed write runs `reconcileGovernedRoot` over the whole root (`governedWrite.ts:18`), which joins list spellings of **other** properties and Context keys into the registered spelling (`contextResolve.ts:142-150`). The repair-on-open sweep does the same to files changed outside the app (`repairSweep.ts:37-41`). So editing `Status` can turn `tags:` + `Tags:` into `Tags:`.
- **"Writes new keys as `Name:`" is accurate.** See `writeTarget` falling back to the name (`heldKeys.ts:38`) and `createPage` writing `def.name` (`Nexus/page.ts:36`).
- **Case-insensitivity covers more than key matching.** It also governs name uniqueness (`schema.ts:46-48`), reserved names (`schema.ts:17-27`), create step-aside (`names.ts:56-64`), registry admission (`propertiesRegistry.ts:32-37`), rename semantics (`registryProperty.ts:125`), the index (`stores.ts:158-164`) and Space `$order` (`PropertyPanel.tsx:220-224`).
- **Spaces already work as described, but in JSON.** They use the JSON twins (`rekeyHeld`, `landValue`), not YAML. Space `$order` also stores property **names** matched folded.
- **Context keys were left out.** They ride the same functions (`contextResolve.ts:93-100`, `contextCascade.ts:39,89`), so per-property Key Format doesn't cover them. Without a separate decision for Contexts, the fold machinery survives.
- **"The title stays as typed" assumes a title/key split that doesn't exist.** Today `name` is both the label (`Core/Properties/Cells/columnLabel.ts:18`) and the key. The idea adds a field or derivation, and every `def.name`-as-key site switches to a key accessor. That's roughly 30 sites listed above, plus the journal records (`propertyJournal.ts:8-12`) and `$order`.

##### Consolidation Opportunities

- **Three write-time collapse rules for one question:**
  - `writtenRoot` always collapses (`governedWrite.ts:17`, default `collapse=true`).
  - `refillValues` collapses only for list types (`assignment.ts:63`, `holdsList(def)`).
  - `reconcileGovernedRoot` collapses only when joining (`contextResolve.ts:142`).
  - `refillTrashed` never collapses (`holdings.ts:141`, `false`).

  PropertiesPM.md (line 146) states only the first. Exact keys remove the question for properties.
- **Two fold implementations inside `heldKeys.ts`:** `heldKeys` (via `spellings`, exact first) and `heldValue`'s own `filter(foldKey)` in root order (`heldKeys.ts:20-21`).
- **Three matching directions for "does this key belong to that def":**
  1. Name → spellings (`heldKeys`).
  2. Key → folded def lookup (`governorOf` `contextResolve.ts:94`, `linkKeysOf` `schema.ts:33`, `cascade.ts:86`, `restoreScrub.ts:41,47`).
  3. Both together to dedupe (`cascade.ts:124`, `contextResolve.ts:76,122`).

  Under exact keys, all three become `key in root` / `defs.get(key)`.
- **Mixed `foldKey`/`normalizeTitle` for the same name comparison:**
  - `byFoldedName` and `fileEvents.ts:521` use `foldKey` (no trim).
  - `validateName`, admission and replay use `normalizeTitle` (trim).

  This is harmless only because stored names are already trimmed. A hand-edited `" Name"` folds differently in the two paths.
- **YAML/JSON rename twins:** `renameFrontmatterKey` (`pageFile.ts:207-243`) and `rekeyHeld` (`heldKeys.ts:95-110`) encode one rule twice. They're justified by the YAML-AST vs JSON split, but the rival and join logic could be one pure decision feeding two appliers.
- **The index test double mirrors the fold** (`memoryStores.ts:176-189`), so any change lands in three places: the DDL, `stores.ts` and `memoryStores.ts`.

**Existing case-conversion utilities you could reuse:**
- `capitalize` (`UIX/Utilities/capitalize.ts:1`, 5 callers).
- `toKebabIconId`, a PascalCase→kebab word splitter that handles acronyms and digits (`UIX/Symbols/iconRoster.ts:4-11`).
- `iconLabel`, kebab→Title Case (`UIX/Pickers/IconPicker.tsx:23`).
- `checkedSpelling`, which mirrors a word's casing: UPPER, Capitalized or lower (`propertyValue.ts:166-174`).
- The camelCase type-id migration is a static map, not a converter (`properties.ts:97-107`).

None of these splits words from free-typed titles with spaces and punctuation, so a format module would be new code. `toKebabIconId`'s regex chain is the closest seed.

##### Hazards & Open Questions

- **Replay silently drops a case-only rename under exact keys.** The rename replay returns `NO_REACH` when any def is `named(journal.from)` by fold (`replaySchemaCascade.ts:53`). Today that's correct, because a recased rename owes no sweep (`registryProperty.ts:125,150`). Under exact keys a case-only rename owes one, but the renamed def itself matches `named(from)`, so a crash mid-sweep would clear the journal and leave files on the old key. The delete arm (`:60-61`) has the same folded `named`.
- **Collisions after formatting:**
  - `Due Date` (Match Title) and `due date` → under exact matching these are distinct keys, so is that allowed?
  - `Due Date` + kebab-case and a property titled `due-date` → the same key.
  - Uniqueness has to move to the formatted key. Should titles also stay unique, folded? Two columns both labeled "Name" would be confusing.
  - Changing a format can create a collision after the fact, so the format change needs the same validate-then-journal path as a rename.
- **Formats aren't reversible and need locale pinning.** `ß`→`SS` under UPPER changes length; Turkish `I`; emoji and punctuation in titles; digits and acronyms in camel/Pascal (`URL Slug` → `urlSlug` or `uRLSlug`). Converters need the same locale pinning `caseFold.ts:1-4` gives the collator. Should NFC stay part of key identity (exact compare after NFC on both sides)? Today an NFD-composed outside key matches.
- **Reserved names must be checked on the formatted key.** `Id` + UPPERCASE → `ID`; `Heading Icon Hidden` + snake_case → `heading_icon_hidden`; `Banner` + lowercase → `banner`. Formats may also strip or create a `$`/`<` prefix. The prefix checks (`schema.ts:24`) must see the output.
- **Existing Nexuses with mixed casings.** Today `name:` and `Name:` on different pages read as one property. Under exact keys the off-spelling pages go **foreign**, and their values vanish from views, filters and the Matrix with no error. Moving to exact matching needs a one-time migration sweep onto each property's key, using the existing rename collision rules where a file holds several spellings (lists join, scalars keep the registered one). `renameSweep` and the journal are the engine. NexusOS is the obvious live case: Obsidian-authored keys with Pommora properties over them.
- **Foreign → live gets narrower.** Registering `Name` today adopts every `name:`/`NAME:` at once (read-time, via `byFoldedName`). Under exact keys only `Name:` is adopted. The rename-onto-held-keys adoption (`registryProperty.ts:124-128`) narrows the same way.
- **The format change is a rename.** Every format edit rewrites every holder (journal, sweep, Try Again, undo). It also has to fire `oweNamedKeys` (`fileEvents.ts:513-530`), update Space `$order` entries (names), and re-key renderer overrides (`useContainerValues.ts:16-27`).
- **Sync and mixed builds.** Sync folds **paths**, not keys (`Core/Sync/Client/reconcile.ts:55,63`; `push.ts:170`; `Sync/Routes/items.ts:11`), so the wire is unaffected. The hazard is an older build on another device: its collapse writes (`writeTarget`) and repair-on-open would merge `name`+`Name` back into one key. With recency-first resolution (*§Locked Decisions*), that would quietly undo distinctions the new build relies on.
- **Obsidian and Sapphire interop.** Sapphire's own guideline records that "Obsidian keys properties case-insensitively" (`~/The Studio/Projects/Sapphire/.claude/Guidelines/Native-Integration-Seams.md:70`). Sapphire mirrors exact-then-folded resolution and folds writes onto the existing entry. That's a claim from decompiled source, not verified here. If it holds:
  - Two Pommora properties that differ only by case would be one property in Obsidian.
  - Sapphire's resolver would fold them back together.

  YAML itself is case-sensitive, so exact matching is YAML-correct and Obsidian-incorrect. `NexusOS` is both.
- **The index needs a rebuild.** Dropping `page_values.fold` means a DDL change and an index on `key` (`ddl.ts:34-41`). That's cheap because the DB is regenerative, but it's still a rebuild on first open.

**Open questions:**
- Do Context keys keep folding? Their titles are folder names, and APFS is case-insensitive.
- Do Space `$order` entries move to ids?
- Should an exact-key world keep folded **refusal** of near-duplicates as a guard?

##### Opinions

- **Opinion: the idea bundles two changes, and they should be evaluated separately.**
  1. **Exact key matching** is the removal-first change. It deletes `holdsList`, `stripHeld`, the `recased` rule, `page_values.fold`, the property side of `governorOf`/`byFoldedName`, the `join` parameters threaded through rename, and the three-way collapse inconsistency. Its one-time cost is a migration sweep.
  2. **The title/key split plus the format enum** is purely additive. It generates almost every hazard above: collisions, lossy converters, locale, reserved-key leakage, and format changes as renames.

  Nail down the first before deciding the second.
- **Opinion: ten formats is a lot for what the problem needs.** Nobody needs `UPPER-KEBAB-CASE` for frontmatter. A plain "key spelling" field (defaulting to the title, editable, validated exact) gives full control with no converters. Its only gap is a quick way to apply a case style everywhere at once.
- **Opinion: Contexts are the real decision point.** If Context keys stay folded, `heldKeys.ts`, `rekeyHeld`, `renameFrontmatterKey`, `mergeInto`'s spelling step and the reconcile join branch all survive for one client. That's a two-rule system where today there's one. If they go exact too, Context titles still fold as folder names, but the `<Title>:` key could match the registered title exactly, and much more machinery goes.
- **Opinion: losing values silently is the biggest regret risk.** The migration has to be mandatory and journaled, not left to repair-on-open, which today *joins* spellings rather than renaming lone off-spellings (`contextResolve.ts:142` with a single held key lands on `held[0]`).
- **Opinion: Space `$order` storing names is already a smell.** Everything else is keyed by id (PropertiesPM.md line 144), and this change would force the question anyway.


---

#### B — Option Model

**Brief:**

> You're a read-only scout in Pommora, a local-first Electron/React/TypeScript productivity app at `~/The Studio/Projects/Project Pommora`. Do not edit any file, run the app, or commit. Read `.claude/CLAUDE.md` and `.claude/Features/PropertiesPM.md` first for orientation; treat docs and code comments as claims, and the code as the truth.
>
> #### Background
>
> Pages are Markdown files whose YAML frontmatter holds property values; Spaces hold the same values on a JSON sidecar. Definitions live in `.nexus/properties.json`. Select, Status, and Multi-Select are option-based types. Nathan (the owner, non-technical) believes:
>
> - Option values are matched case-insensitively on read, while the file's casing is preserved on write.
> - In `properties.json`, an option has separate `name:` and `value:` keys that currently hold the same word in different casings (option "Red" → `name: "red"` + `value: "Red"`), and that this name/value split might be a foundation for what follows.
> - An externally written option value (e.g. `- Red` on a page) gets adopted into the property's registered options.
>
> He's considering a per-property **Value Format** setting for Select, Status, and Multi-Select (`Match Title` default, plus lowercase, UPPERCASE, kebab-case, PascalCase, camelCase, snake_case, Train-Case, UPPER_SNAKE_CASE, UPPER-KEBAB-CASE): the option's user-facing title stays as typed in the app, while the format decides how its value is spelled on disk, read and written exactly. His open question is how foreign values would still be recognized and adopted — e.g. whether `- RED` adopts under an UPPERCASE format, `- red` under lowercase/kebab/snake/camel, and whether `Match Title` should adopt all of `RED`/`Red`/`red`. Nothing is decided; you're grounding a later planning session, not designing it. That session works removal-first: it wants to know everything that exists today that this idea would delete, collapse, or make unreachable.
>
> #### Your Mandate: The Option Model, Value Matching, and Adoption
>
> Map, with `file:line` evidence:
>
> - The exact option schema in `properties.json` (open the zod schema and a real `.nexus/properties.json` under `~/Test/.nexus/` if present, read-only). Is there a `name`/`value` split, a single `value`, an `id`? What is each field for, who reads it, and is any field redundant today? Status groups too.
> - How a held value is matched to an option on read (`Core/Properties/optionModel.ts`, `propertyValue.ts` `decodeValue`, `Core/Files/heldKeys.ts` `namesValue`/`memberKey`, views pipeline filter/group/sort, Space sidecars, Matrix filter).
> - How a write spells an option value (`writtenSpelling`, `nodeSpelledAs`, `reconcileGovernedRoot` collapsing duplicates "in its registered spelling").
> - Adoption: `registerHeldOptions`, `oweNamedKeys`, the watcher/settle chain, the on-open sweep — when an unregistered Multi-Select member becomes an option, what spelling it registers with, and why only Multi-Select adopts (Select/Status don't?).
> - Option rename/removal cascades "in any casing" (`optionOps.ts`, journal, saved views, View Tiles, Matrix filter) and option-title uniqueness "compared without regard to case".
>
> For each mechanism: what it does, where, who calls it, and whether it exists *only* to serve case-insensitive value identity (removable under exact matching), *partly* (would change), or is independent. Count call sites where it matters.
>
> #### Also Report
>
> - Every point where Nathan's beliefs above are inaccurate or incomplete, stated plainly — especially the name/value claim.
> - Duplicated or divergent value-folding logic — consolidation opportunities.
> - How a Value Format would interact with the existing mechanisms: what an "exact" reading would make unreachable, and what a "recognize under compatible formats" reading would require. Present options and trade-offs neutrally; don't pick one.
> - Hazards: lossy conversions (e.g. a title "Q3 Report" → camelCase), two option titles colliding under one format, format changes rewriting existing pages, interplay with Context values (Space titles) which aren't options.
> - Your own opinions and concerns, clearly labeled.
>
> #### Report Format
>
> Markdown, H4/H5 headings, `file:line` citations on every factual claim. Sections: Findings (mechanism inventory table: Mechanism • Location • Role • Classification • Notes), The Option Schema As It Stands, Corrections to Nathan's Claims, Consolidation Opportunities, Interaction With a Value Format, Hazards & Open Questions, Opinions. No preamble.

**Report:**

##### Findings

Paths are relative to `~/The Studio/Projects/Project Pommora/Core/`. Everything below was read only. Nothing was edited, run, or committed.

**The Core Shape:** Option identity on the registry side is already exact. `admitOptionEdit` (`Properties/optionOps.ts:63`), `resolveForCascade` (`optionOps.ts:179`), `renameOption`'s guard (`optionOps.ts:235`), `mapOption`/`moveOption` (`Properties/optionModel.ts:12,53,57`), the journal replay arms (`Properties/replaySchemaCascade.ts:79,87`), and the `byValue` maps in `Views/Settings/OptionOrderList.tsx:71` and `GroupFrame.tsx:375` all compare `o.value` byte for byte. Case-insensitivity sits at one boundary: a string held in a file being matched to a registered option. That boundary is `optionsByFold`/`registeredOption` in decode, and `namesValue`/`memberKey` in cascades and `writtenSpelling`. Everything downstream of decode (views, sort, group, picker, cells) works on the already-canonical registered spelling.

**The Fold Primitive:** `normalizeTitle(raw) = foldKey(String(raw).trim())` and `foldKey = toLowerCase().normalize('NFC')` (`Paths/caseFold.ts:7-14`). It's shared by about 60 sites across Connections, Contexts, Trash, Index, MarkdownPM, Assets, property keys, and checkbox words. Dropping case-folding for option values can't mean touching `caseFold.ts` or `Files/heldKeys.ts`.

###### Mechanism Inventory

| Mechanism | Location | Role | Classification | Notes |
|---|---|---|---|---|
| `optionsByFold` + `registeredOption` | `Properties/propertyValue.ts:46-60` | Folded title → registered spelling, cached per definition | **Only** (removable under exact) | 4 call sites: `:104` (Select/Status decode), `:109-110` (Multi decode), `:132` (`unregisteredMembers`), `:162` (frozen restore filter) |
| `firstPerTitle` | `Properties/properties.ts:52-63` | "First of any that fold alike" | **Only** (option domain) | 3 call sites: `propertyValue.ts:52` (option map), `:110` (Multi member dedupe), `Properties/schema.ts:76` (`withUniqueOptions`) |
| `decodeValue` Select/Status branch | `propertyValue.ts:101-107` | Last element naming a registered option wins; an unregistered element is dropped | **Partly** | The last-registered-wins rule stays; only the lookup changes |
| `decodeValue` Multi-Select branch | `propertyValue.ts:108-112` | Dedupes members by fold, canonicalizes registered ones, keeps unregistered ones verbatim | **Partly** | Fold dedupe and canonicalization go under exact |
| `unregisteredMembers` | `propertyValue.ts:129-134` | What counts as foreign for adoption | **Partly** | Under exact, every casing variant becomes "unregistered" |
| `reconcilePropertyValue` (frozen) | `propertyValue.ts:153-164` | A Trash or cache restore keeps only members that still name an option | **Partly** | Fold-matched today |
| `writtenSpelling` list arm | `propertyValue.ts:184-189` | Each member takes the one held member that folds to it, which is the "file casing preserved" mechanism | **Partly** | Callers: `Properties/governedWrite.ts:19`, `Contexts/contextResolve.ts:149`, `Properties/assignment.ts:64`. For options it becomes identity under exact; Context and File lists still need it |
| `namesValue` / `memberKey` | `Properties/pageValue.ts:11-14`, `Files/heldKeys.ts:51` | "Element names this value" by fold | **Partly** (shared) | Option uses: `pageValue.ts:24,27` (`editList`), `optionOps.ts:134`, `propertyValue.ts:186`. Context uses: `Contexts/contextWrite.ts:99`, `Contexts/contextCascade.ts:158` |
| `editList` / `valueEditRewrite` | `pageValue.ts:19-43` | Option rename/strip "in any casing" across files | **Partly** (shared) | Also used for Space renames (`contextCascade.ts:24`). A `Matcher` type already exists (`pageValue.ts:9`) |
| `joinValues` | `heldKeys.ts:54-58` | Joins two key spellings' lists, deduping members by fold | **Partly** | Serves property-key joins and Contexts too (`Trash/spend.ts:292`, `Files/pageFile.ts:233`) |
| `reconcileGovernedRoot` property arm + `memberCount` | `Contexts/contextResolve.ts:108,111-157` | Re-encodes values; collapses duplicate members "in registered spelling"; never shrinks a live value (`:137-141`) | **Partly** | Callers: `governedWrite.ts:18`, `Properties/repairSweep.ts:39`, `Trash/restoreScrub.ts:55,75`. The duplicate collapse becomes exact dedupe; the Context arm (`:133-135`) is unaffected |
| `nodeSpelledAs` | `Files/pageFile.ts:143-161` | Preserves YAML quote and flow style per member | **Independent** | Matches by exact equality (`:155`) and has nothing to do with case |
| `validateOptionValues` | `Properties/schema.ts:85-91` | Option titles must be non-blank and unique, compared folded | **Partly** | Callers: `schema.ts:65,75`, `optionOps.ts:83,239`. The uniqueness basis would change |
| `withUniqueOptions` | `schema.ts:72-82` | Drops later fold-duplicate options a hand-edited registry holds | **Partly / Only** | Runs on every option write via `editStoredOptions` (`optionOps.ts:58`) |
| Registry option ops and journal | `optionOps.ts:63,179,235`; `Properties/propertyJournal.ts:11-12`; `replaySchemaCascade.ts:74-93` | Exact `value` identity; journal holds `{from,to}` or `{value}` | **Independent** | Already exact |
| `registerHeldOptions` | `optionOps.ts:94-150` | Adopts unregistered Multi-Select members from pages and Spaces | **Independent** in purpose, **Partly** in volume | Skips a value still owed by a pending option rename (`:126-135`) |
| Adoption triggers | `Nexus/fileEvents.ts:425-426` (Collection gains a property), `:432` (Space change), `:489` + `:513-530` (`oweNamedKeys`), `Nexus/settle.ts:112,139-145`, `Nexus/handlers.ts:105-108` (on-open, after the repair sweep) | Decide which files get re-read for adoption | **Independent** | All gated on `type === 'multiSelect'` (`fileEvents.ts:520`, `optionOps.ts:114`) |
| Option cascade into config | `Nexus/configReach.ts:142-145` (filter rules, fold), `:155-159` (sort and group order, fold), `:161-172` (collapsed bands, **exact**), `:185-193` → `Views/views.ts:359-375` (hidden buckets, **exact**), `:308-320` (Collection `property_cache`, fold), `:385-388` (Matrix filter), `:389-398` (`openInPreview` rules) | Rename/strip reaches views, View Tiles, cache, Matrix, and preview rules | **Partly** | Mixes fold and exact matching; see *§Consolidation Opportunities* |
| Filter: Select | `Views/Pipeline/filter.ts:83,245-265` (`evaluateText`) | Folds operand and value | **Independent** (shared with Text, Link, and Title) | Redundant for Select because decode already canonicalized |
| Filter: Multi-Select | `filter.ts:126-131,269-286` (`evaluateSet`) | Exact `includes` | **Independent** | Relies on decode canonicalization |
| Group and sort | `Views/Pipeline/group.ts:197-220`, `Views/Pipeline/sort.ts:30-36,84-88` | Bucket and rank by registered value, exact | **Independent** | Same reliance on decode |
| Read entry point | `Properties/value.ts:36-61` (`resolveFieldValue`, memoized); Spaces via `Properties/pageRow.ts:37` → `PropertyPanel.tsx:314` | Every surface decodes through `decodeValue` | **Independent** | Matrix (`Matrix/matrixInput.ts:117,133`) and preview rules (`Navigation/previewRules.ts:26`) use the same evaluator |
| Property-key case-insensitivity | `heldKeys.ts` (whole file), `byFoldedName` (`properties.ts:49-50`) | Key axis (`Tags:` vs `tags:`) | **Independent** | Separate from values and out of the idea's scope |

##### The Option Schema As It Stands

- **Select / Multi-Select Option:** `{ value, icon?, color?, appearance? }`, loose-decoded so unknown keys survive a rewrite (`Properties/properties.ts:133-140`).
- **Status Option:** `{ value, color?, icon?, appearance?, group_id }` (`properties.ts:147-155`).
- **Status Group:** `{ id, label, color, options[] }` (`properties.ts:158-165`). The group is the only option-side structure with an `id` and a separate `label`.
- **The `value` Field:** It's the title shown in the app, the spelling written to disk, and the option's identity. There's no option `id`. The code says so directly: "An option has no identity" (`replaySchemaCascade.ts:83`).
- **The `label` Field:** This is legacy. Commit `a28c340df` (09-27-2026) removed `label` from the decoders. Before that, `addOption` and `renameOption` always wrote `label: title` and `value: title` with the same string, so the two never held different casings. `stored()` (`properties.ts:308-311`) strips a leftover `label` on that property's next option write (`withOptionGroups`, `:313-321`).
- **What's On Disk:** `~/Test/.nexus/properties.json` still has `"label"` equal to `"value"` on Fixture Select and all three Fixture Status options, while Fixture Tags has `value` only. `~/NexusOS/.nexus/properties.json` holds 59 options: 28 still carry a `label` equal to `value`, 31 are already scrubbed, and none has a `name` key.
- **Redundant Today:** The stored `label` (dead on read). `PickOption.label` (`properties.ts:284`) is a UI shape. Options fill it with `label: o.value` (`Properties/Pickers/PropertyPicker.tsx:73`). Only Contexts use it as a real split, `{ value: spaceId, label: title }` (`Contexts/contextOptions.ts:31-36`).

##### Corrections to Nathan's Claims

- **The `name:`/`value:` Split:** It doesn't exist. Options have no `name` key. What Nathan saw is the legacy `label` key, which always held the same string as `value`, never a different casing (`a28c340df`, and the on-disk counts above). It's leftover data the code strips on the next option write, so it can't serve as a foundation. The only `name` in a definition is the **property's** name, which is the frontmatter key (`properties.ts:171`).
- **Matched Case-Insensitively on Read:** True, and broader than case. Matching also trims, applies NFC normalization, and turns a YAML number or boolean into a string, so `- 2024` names an option "2024" (`caseFold.ts:12-14`, `Contract/validators.ts:11`, `propertyValue.ts:42-44`).
- **Casing Preserved on Write:** True only for a member that is unchanged and held once (`writtenSpelling`, `propertyValue.ts:184-189`). Four exceptions:
  - If a file holds two casings of one option, they collapse to the registered spelling (`:188`).
  - A newly picked option is written in the registered spelling.
  - An option rename, including a case-only "Red" → "RED", rewrites every casing in every file to the new title (`pageValue.ts:30`). Property-name recasing, by contrast, changes the registry alone (`Properties/registryProperty.ts:125`).
  - A rename also rewrites an existing member that already matches the target: renaming "Red" → "Blue" turns a held `blue` into `Blue` and dedupes (`pageValue.ts:27-31`).
- **External Values Adopted:** Only true for Multi-Select. Select and Status never adopt, because decode drops an unregistered element (`registeredOption(def, v) ?? []`, `propertyValue.ts:104`), so nothing unregistered survives to be adopted. The live reconcile keeps it on disk but invisible (`contextResolve.ts:137-141`), and PropertiesPM says an unregistered element "reads as no value". I found no written rationale for the asymmetry; it's a property of the code. Multi-Select keeps the foreign string (`byFold.get(fold) ?? x`, `:110`), and `registerHeldOptions` filters to Multi-Select (`optionOps.ts:114`).
- **The Adopted Spelling:** Adoption registers the file's first-seen spelling verbatim: first in file order (`firstPerTitle`), then first across files in traversal order (`optionOps.ts:106-123`), then `addOption(g, SELECT_GROUP, v)` (`:138`). So `- RED` registers an option titled "RED", and later `red` and `Red` read as it.

##### Consolidation Opportunities

- **Fold Dedupe, Four Implementations:** `firstPerTitle` (`properties.ts:53`), `joinValues`'s `Set` of `memberKey` (`heldKeys.ts:56`), the Context arm's `[...new Set(titles)]` over folded titles (`contextResolve.ts:134-135`), and `memberCount` (`:108`).
- **Option Matching, Two Shapes:** `registeredOption` is a map lookup and `namesValue` is a predicate, over the same fold.
- **Trim Divergence:** The filter folds with `foldKey`, which doesn't trim (`filter.ts:83,252`), while decode and cascades use `normalizeTitle`, which trims.
- **Cascade Matching Diverges Inside One File:** `configReach.ts` cascades filter operands, sort/group order, and the cache by fold, but collapsed and hidden bucket keys by exact equality (`:166-168`, `views.ts:367-373`). It's harmless today because bucket keys come from decoded, registered values, but it's two policies for one concept.
- **Filter Divergence:** Select folds (`evaluateText`) and Multi-Select is exact (`evaluateSet`). Both work only because decode canonicalized first. A hand-edited view rule `Tags contains "red"` won't match, while `Stage is "red"` will.
- **Recase Policy Divergence:** A case-only option rename cascades into files, while a case-only property rename doesn't (`registryProperty.ts:125`).
- **Leftover `label`:** About 28 NexusOS options and the Test fixtures still carry it until their property's next option edit. That's residue to finish or accept.
- **Undocumented Cascade Reach:** The `property_cache` and `openInPreview` rule cascades (`configReach.ts:308-320,389-398`) are missing from PropertiesPM's "Edit options" row.

##### Interaction With a Value Format

**The Data Model:** A format makes title ≠ disk value for the first time, so the option needs either a stored `title` plus `value`, or a stored title with `value = F(title)` derived on read. Stored values allow hand edits and lossy adoption but can drift. A derived value has no redundancy, but every reader must apply F, and the cached map in `optionsByFold` would key by F instead.

**Config References:** Views, the cache, the journal, and Trash records currently store option *values*. Two choices:
- Keep storing the disk value. Every format change then cascades into all of them.
- Store the title. The pipeline then needs decode to map value → title. Today it relies on value equaling title (`group.ts:199`, `sort.ts:87`, `OptionOrderList.tsx:71`).

###### Reading A: Exact Matching

- **Unreachable or Deletable:** `optionsByFold`/`registeredOption`, the `firstPerTitle` dedupe in the Multi-Select decode, the option use of `writtenSpelling`'s fold arm, the "collapse duplicates in registered spelling" behavior, `withUniqueOptions`' fold logic, and the fold in option cascades. That's roughly 15–25 option-only lines.
- **Shared Helpers Stay:** `namesValue`, `memberKey`, `editList`, `joinValues`, `writtenSpelling`, and `memberCount` still serve Contexts, Files, and key joins. They'd need a `Matcher` parameter or a domain split rather than deletion.
- **Match Title Becomes Byte Equality:** `RED`, `Red`, and `red` become three distinct options, which `validateOptionValues` (folded uniqueness) currently forbids. Either uniqueness becomes exact too, or adoption hits a conflict.
- **Adoption Has No Validation Step:** Adoption doesn't validate after its edit (`editStoredOptions` dedupes *before* applying it, `optionOps.ts:58-59`). A fold-duplicate adopted under exact rules would therefore be silently dropped on the next option edit by `withUniqueOptions` while pages still hold it.
- **Foreign Values Under Exact:**
  - Select/Status: `- red` against option "Red" reads as no value and stays on disk.
  - Multi-Select: it adopts as a new option.
  - Under a non-identity format, an adopted title derived from `red` gets `F(title)`, which may not equal `red`. The new option then wouldn't match its own source unless adoption stores the held spelling as the value (bypassing F) or rewrites the file.

###### Reading B: Recognize Under Compatible Formats

- **A Wider Fold:** This needs a normalizer at the exact boundary `registeredOption` occupies today. For kebab, snake, camel, Pascal, and Train case to recognize each other, it has to be a word-token fold (split on case boundaries, `-`, `_`, and spaces, then lowercase and join), which is stronger than today's case fold. The machinery is replaced and widened rather than removed.
- **Open Decisions:**
  - Which formats count as compatible with which (a full matrix, or one token fold for all).
  - Whether a write re-spells a foreign `red` to F(title). That breaks PropertiesPM's "a write keeps the file's spelling" rule and bypasses `writtenSpelling` for options.
  - Whether `validateOptionValues` compares by the normalizer, so two titles that normalize alike are refused.

###### Under Either Reading

- **Uniqueness Runs on F(title):** It must, so a format change can be refused when it would collide two options.
- **Format Change Is a Bulk Rename:** It cascades into every page, Space, view, View Tile, cache, Matrix filter, and preview rule. The journal holds one `option-rename {id, from, to}` record (`propertyJournal.ts:11`), so a multi-option record or a new op kind is needed.
- **Free Rename Skip:** A title rename where F(old) equals F(new), such as "Red" → "RED" under lowercase, needs no file cascade.
- **Contexts Stay Folded:** Context values (Space titles) are untouched by any format. They resolve by fold (`contextResolve.ts:35`, `Contexts/contexts.ts:39`) and share the helpers above, which is why those helpers can't simply lose their fold.

##### Hazards & Open Questions

- **Lossy, Non-Invertible Formats:** "Q3 Report" becomes `q3Report` (camel) or `q3-report` (kebab), and the title can't be recovered from the value. That matters for adopting foreign values under non-identity formats.
- **Collisions:** "Q3 Report", "Q3-Report", and "q3 report" all become `q3-report`. A format change can collide existing options.
- **Unicode:** `'ß'.toUpperCase()` is `SS`, which lowercases back to `ss`, not `ß`, so UPPERCASE breaks the round trip and the fold. Other cases: dotted and dotless Turkish I, accents under kebab/snake, and scripts with no case (CJK, emoji). A title like "!!!" becomes an empty kebab value, which `validateOptionValues` refuses as blank.
- **YAML Typing:** Lowercase `true`, `yes`, `null`, and `2024` would be quoted by the YAML writer, but other tools such as Obsidian may read them as booleans or numbers. Decode stringifies scalars (`validators.ts:11`), so Pommora would still read them.
- **Format Changes Rewrite Files:** Every holder gets rewritten. Frozen copies (Trash records `Properties/deleteProperty.ts:65`, `property_cache`) keep the old spelling. Under exact matching, the restore filter (`propertyValue.ts:162`) would drop them.
- **Select's Last-Registered Rule:** With several elements, exact matching changes which element wins.
- **Status Adoption Is Undefined:** Status has groups, so if adoption ever extends to Status, which group does an adopted option join?
- **Untrimmed Adoption:** An unregistered Multi-Select member isn't trimmed before registering (`propertyValue.ts:44,110`). A quoted `" Red "` registers with its spaces.
- **Context Values:** These are Space titles that also name folders. A user may expect a property format to apply to `<Areas>` values, but it can't.
- **Open Question:** Does Match Title mean today's behavior (fold recognition, preserve file spelling) or byte equality? Today's model is effectively "Match Title, case-insensitive recognition, file spelling preserved."

##### Opinions

- **(Opinion) Small Removal Yield:** Under exact matching, the option-only fold code is about 15–25 lines. The large fold machinery (`heldKeys.ts`, `caseFold.ts`, `editList`, `joinValues`, `writtenSpelling`) stays for keys, Contexts, and Files. A Value Format adds more than it deletes under either reading.
- **(Opinion) Exact Matching Would Regress Obsidian Interop:** It would cost compatibility with NexusOS's Obsidian-written tags, since a lowercase `- red` from another tool silently stops matching on Select/Status or forks a new Multi-Select option. Reading B, a word-token fold that subsumes today's case fold with the format governing only Pommora's own writes, keeps that compatibility. It still breaks the "keep the file's spelling" rule unless writes keep held spellings.
- **(Opinion) Option IDs Would Be the Real Foundation:** It wouldn't be name/value. Every config-side reference (views, buckets, cache, journal, Trash) keys options by their value string, which is why renames fan out across five config surfaces and why a format change would too. A stable option id would make the config side immune to renames and format changes, leaving only member files to rewrite.
- **(Concern) Bulk Cascade Recovery:** A format change is a bulk cascade on a journal designed for one option at a time. It needs its own crash-recovery design before anything else.

---

#### C — Editor & Confirmations

**Brief:**

> You're a read-only scout in Pommora, a local-first Electron/React/TypeScript productivity app at `~/The Studio/Projects/Project Pommora`. Do not edit any file, run the app, or commit. Read `.claude/CLAUDE.md` and `.claude/Features/PropertiesPM.md` first; treat docs and comments as claims, and code as the truth.
>
> #### Background
>
> Nathan (the owner, non-technical) is considering a per-property **Key Format** setting (how a property's key is spelled in YAML on disk — `Match Title` default, plus lowercase, UPPERCASE, kebab-case, PascalCase, camelCase, snake_case, Train-Case, UPPER_SNAKE_CASE, UPPER-KEBAB-CASE) and, for Select/Status/Multi-Select only, a matching **Value Format** for option values. He pictures both as rows "within each property's own customization `PropertyPanel`", and changing either would ask for confirmation ("This action would rewrite metadata in N items"), reusing "the same counting system already in place for these kinds of confirmations", skipping confirmation when zero items are affected. He also believes Booleans read many word pairs and preserve them, writing new ones as true/false (unsure of casing), and that Numbers have similar preservation logic. Nothing is decided; you're grounding a later planning session.
>
> #### Your Mandate
>
> 1. **The Editing Surface:** Identify where a property's own per-type settings are actually edited (Nathan said `PropertyPanel`; PropertiesPM suggests `Core/Properties/PropertyPanel.tsx` is the *value* panel and `Core/Properties/Schema/PropertyFrame.tsx` plus per-type editor frames hold definition settings). Map the editor frame structure per type: which rows exist, what shared row primitives they use (UIX Menus/rows/toggles/segments), and how a per-type setting (e.g. Number format, Link format, Checkbox color, File directory) is stored on the definition and rendered. Identify the existing pattern a new definition-level setting row would follow, and whether any existing row is a dropdown-of-options pattern a 10-option format picker would reuse.
> 2. **Confirmations and Counts:** Find the existing confirmation flows that name "the Items holding" something (property delete, option Clear/Remove, rename refusals naming "how many do"). Trace the counting mechanism (`Core/Properties/keyHolders.ts` and whatever else), what it counts, how it's computed (index query vs. walk), and the confirmation UI component. Report whether there's one counting system or several, and whether they'd fit "items whose metadata a format change would rewrite".
> 3. **Rewrite Sweeps:** Identify the existing machinery a format change would most plausibly ride on to rewrite every holder (rename sweep, governed sweep, journal, Try Again) and how a key rename currently fans out — only at a level that shows what's reusable.
> 4. **Value Vocabularies:** Verify the Checkbox word vocabulary, how a fresh check is written (exact casing), how a held word's casing is preserved, and Number's reading/preservation. Cite `Core/Properties/propertyValue.ts`, `formatValue.ts`. Note whether these are case-related in a way a Value Format would touch, or orthogonal.
> 5. **Casing Utilities:** Inventory any existing case-conversion helpers in `UIX/Utilities`, `Core/`, and the codebase generally.
>
> #### Also Report
>
> Every point where Nathan's beliefs above are inaccurate or incomplete, stated plainly; consolidation opportunities you notice (duplicate confirmation dialogs, duplicate counting); hazards; and your own opinions, clearly labeled.
>
> #### Report Format
>
> Markdown, H4/H5 headings, `file:line` citations on every factual claim, one section per numbered mandate, then Corrections to Nathan's Claims, Consolidation Opportunities, Hazards & Open Questions, Opinions. No preamble.

**Report:**

##### 1. The Editing Surface

###### Where Definition Settings Live
- `Core/Properties/PropertyPanel.tsx` is the **value** surface. It's the body of a page's or Space's settings dropdown and the SidePane, with rows that open the value picker (`PropertyPanel.tsx:82`, imports `Cell`/`assignValue` at `:23-30`). It has no definition settings.
- Definition settings live in `Core/Properties/Schema/PropertyFrame.tsx`, which is mounted from the Collection's Settings menu (`Core/Views/Settings/SettingsFrame.tsx:158`). The frame slides from the list to the type picker to the per-property editor (`PropertyFrame.tsx:63, 482-488`).
- Each editor has the same layout (`PropertyFrame.tsx:409-430`):
  - A top row with a ⋮ menu that holds Remove and Delete (`:276-286, 411-416`).
  - An `InlineEditHeader` for the name and icon, where committing the name calls `property:rename` (`:419-426, 234-239`).
  - A separator, then the type's own settings from the `SETTINGS` record (`:428`).
  - A **Style** footing that only option types get (`:391-408`).
- `SETTINGS` has one entry per type and is compile-checked (`PropertyFrame.tsx:323-377`).

###### Rows Per Type
| Type | Editor | Rows | Where Each Setting Is Stored |
|---|---|---|---|
| Select / Multi-Select / Status | `OptionEditor` (`OptionEditor.tsx:16-122`) | Option list, grouped for Status; per-option popup; right-click menu **Style ▸ · Edit Option · Clear · Remove** (`useOptionEdit.tsx:97-122`) | Options on the definition (`properties.ts:133-167`); Style is per view in `column_styles` (`PropertyFrame.tsx:311-321, 403`) |
| Link | `LinkEditor` (`LinkEditor.tsx:7-63`) | Underline (switch), Color (color), Format (picker) | Definition: `link_underline`, `link_display`, `link_color` (`properties.ts:176-179`) |
| Checkbox | `CheckboxEditor` (`CheckboxEditor.tsx:11-52`) | Color (color), Style (picker) | Color is on the definition (`checkbox_color`, `properties.ts:181`); Style is per view (`CheckboxEditor.tsx:10`) |
| Number | `NumberEditor` (`NumberEditor.tsx:45-146`) | Format, Currency, Separators, Decimals, Fraction, Value, Style | Definition: `number_*` fields (`properties.ts:183-197`); Style is per view |
| File | `FileEditor` (`FileEditor.tsx:7-46`) | Directory (a `PathField` inside a field row) | Definition: `file_directory` (`properties.ts:198`) |
| Date & Time | `DateTimeEditor` (`DateTimeEditor.tsx:21-65`) | Heading "Format", then Date, Day, Time pickers | Per view only (`PropertyFrame.tsx:339-341`) |
| Text, Context, Creation Time, Last Modified | `NO_SETTINGS`, a blank 8px spacer (`PropertyFrame.tsx:310, 372-376`) | None | None |

###### Shared Row Primitives
- Rows are `MenuRow` objects drawn through `MenuIndex` (sections) or `MenuRowView` (one row). The available trailing kinds are `switch`, `picker`, `color`, `field`, `button` and `chevron` (`UIX/Menus/MenuIndex.tsx:15-23`).
- `pickerRow(glyph, label, value, options, onPick, look)` (`UIX/Menus/MenuIndex.tsx:54-77`) builds a dropdown row backed by `PickerControl`. It's used for Link Format, Checkbox Style, every Number picker, and the Date/Day/Time pickers.

###### The Pattern a New Definition-Level Row Would Follow
1. Add an optional field with `.catch(undefined)` to `propertyDefinitionFields` (`properties.ts:169-199`).
2. Add a `pick()`-based narrower like `narrowLinkConfig` or `narrowNumberFormat` (`properties.ts:206-223`).
3. Add a bridge channel (`Core/Contract/bridge.ts:153-169`).
4. Add a `defEditOp(narrow)` handler (`handlers.ts:121-134, 165-176`), which goes through `editProperty`, a registry-only change (`registryProperty.ts:156-173`).
5. Add a `pickerRow` inside the type's editor, wired via `write(dialer().ask(...))` (`PropertyFrame.tsx:336, 354`).

A Key Format can't stop at step 4. `editProperty` is registry-only, so the change would need a cascading channel instead (see §3).

###### Is There a Dropdown Pattern for 10 Options?
Yes. `pickerRow` with a `PickerOption[]` is the pattern. `DECIMAL_OPTIONS` is already an 11-option picker (`NumberEditor.tsx:26-29`), and `LINK_FORMAT_OPTIONS` is a const-array-plus-labels picker (`linkFormatOptions.ts:5-8`, `properties.ts:109-121`), which is the exact shape a `KEY_FORMATS` list with labels would copy.

Placement needs thought:
- Text and the option types have no settings rows today. The option frame is the `OptionEditor` list plus a footing, with no `MenuIndex` section (`PropertyFrame.tsx:311-321, 391-408`).
- Number and Link already have a row labeled "Format" (`NumberEditor.tsx:66`, `LinkEditor.tsx:51`), and Date has a "Format" heading (`DateTimeEditor.tsx:32`).

##### 2. Confirmations and Counts

###### The Confirmation UI
- There's one dialog, `ConfirmationWindow` (`Core/Interface/Confirm/ConfirmationWindow.tsx:9-40`). It's fed by `askConfirm` in the session store (`Core/Session/chromeSlice.ts:28, 52`) and takes one request shape: message, detail, action, tone, defaultsToCancel (`confirmations.ts:16-22`).
- The holder confirmations are three wrappers over one helper, `askHolding` (`confirmations.ts:107-140`):
  - `askDestroyProperty`: "…stripped from N Items" (`:118-124`)
  - `askRemoveOption` (`:126-132`)
  - `askClearOption`: "Clear "X" from N Items?" (`:134-140`)
- `items(count)` handles the "Item"/"Items" plural (`:107`).
- **`askHolding` always asks**, even when the count is 0 (`:109-116`). Nothing skips the dialog at zero today.

###### The Counting
There's one channel, `property:holders(propertyId, value?)` (`bridge.ts:180`; `handlers.ts:181-185`), but it routes to **two different algorithms**:

| Count | Code | What It Counts | How |
|---|---|---|---|
| Property holders (no `value`) | `propertyHolders` (`deleteProperty.ts:80-84`) → `confirmedKeyHolders` (`keyHolders.ts:23-41`) | Files holding the key in any casing: pages under **every** Collection folder (not just the ones assigning it), plus every Space sidecar | The index is queried by folded key (`Desktop/Store/stores.ts:158-164`), falling back to a full corpus walk when there's no index. Each candidate is then re-read from disk. All sidecars are walked. |
| Option holders (`value` given) | `optionHolders` (`optionOps.ts:269-285`) | Files where the **strip rewrite would change something** | Gets candidates from `keyHolderFiles` (index or walk) plus all sidecars, parses each file, runs `valueEditRewrite(...strip)` as a dry run, and counts the ones that don't return null. |

- There's a third use that isn't a confirmation. A rename refusal counts files holding **both** the old and new key via `bothKeyHolders` (`registryProperty.ts:102-108`). It's reported as "N files hold both…" (`properties.ts:268-269`), which says **files** where the confirmations say **Items**.
- Both counts are files: pages plus Space sidecars, with no distinction between the two.

###### Would Either Fit "Items a Format Change Would Rewrite"?
- **`confirmedKeyHolders` doesn't fit.** It matches any casing (`caseFold.ts:16-21`), so it would count files already spelled in the target format.
  - It also folds case only, through `foldKey` = lowercase + NFC (`caseFold.ts:7-9`). Separators aren't folded, so it can't see `due_date` as the same key as `Due Date`.
- **The `optionHolders` dry-run shape is the right model**: run the real rewrite and count the files where it would change something.
  - One caveat: `editList`'s `replace` returns a non-null array whenever an element matches, even if nothing actually changes (`pageValue.ts:19-34`). The sweep later filters no-op writes through `changedKeys` (`governedSweep.ts:43-56`), but a dry-run counter for a recasing would need that same comparison, or it will over-count.

##### 3. Rewrite Sweeps

###### The Core Machinery
- **`sweepGovernedRoots(root, files, plan)`** (`governedSweep.ts:59-109`) does a per-file locked rewrite of page frontmatter, using either a `raw` JSON rewrite or a `text` rewrite. An optional `sidecars` rewrite reaches **every** Space sidecar. It reports skipped (lock/read failures) and refused (unparseable) files, and it preserves file times, so Last Modified doesn't move.
- **Property rename** (`renameProperty`, `registryProperty.ts:111-154`) runs in this order:
  1. Validate the new name.
  2. If the change is more than case, refuse when any file holds both keys (`:125-128`).
  3. Write the journal record `{op:'rename'}` (`:129-130`).
  4. Commit the registry (`:131-144`).
  5. Sweep with `renameSweep` (`:82-98`), using:
     - `keyHolderFiles` on the old name (`:88`)
     - the text rewrite `renameFrontmatterKey`, which keeps list style (`:91`)
     - the sidecar rewrite `rekeyHeld` plus `withOrderEntry` for the Space `$order.properties` list (`:92-95`)
  6. Clear the journal if nothing was skipped (`:151`).
  - **A change of case alone skips the sweep entirely** (`:125, 150`).
- **Option rename and removal** go through `optionCascade` (`optionOps.ts:203-213`). It runs `valueEditSweep` over pages and sidecars, then `reachConfig` for saved views, View Tiles and the Matrix filter.
  - Unlike a property rename, an option rename **does** sweep a case-only change, because `editList` replaces the matched element with `edit.to` (`pageValue.ts:26-33`).

###### Journal, Replay and Try Again
- **The journal is a single slot.** One record lives in `.nexus` (`propertyJournal.ts:45`; `journalSlot.ts:14-49`).
  - A write that would displace a different stranded record is refused (`journalSlot.ts:37`), and the new op runs unjournaled.
- **The record type is a closed four-op union**: rename, delete, option-rename, option-remove (`propertyJournal.ts:8-12`).
  - Each op has matching code in `sameRecord` (`:14-25`), `decodeSchemaJournal` (`:27-43`) and `replay` (`replaySchemaCascade.ts:43-95`).
- **How Try Again reaches the user:** the renderer gets `owed` in the `SchemaCascade` reply (`propertyJournal.ts:51-57`). `retryOwed`/`warnOwed` then shows a notification whose Try Again calls `property:replay` (`propertyWrite.ts:10-24`; `handlers.ts:159-163`).
- **Undo:** `undoSweep` exists (`governedSweep.ts:112-122`), but only the Contexts cascade calls it (`Contexts/contextCascade.ts:184`). Property renames have no undo.

###### What a Format Change Would Reuse
- **Key Format:** `renameSweep` already does it all: moves every spelling, rekeys sidecars and fixes `$order`. It needs the case-only short-circuit removed, or a separate op.
- **Value Format:** `optionCascade` with `{op:'replace'}` handles **one** option.
  - Reformatting N options would be N cascades, each a full walk. They can't be N `renameOption` calls under one journal, because the slot holds one record.
  - It needs a new composite journal op, a new rewrite that maps every option at once, and new code in all four journal functions.

##### 4. Value Vocabularies

###### Checkbox
- **Vocabulary:** four pairs, `true/false`, `yes/no`, `on/off`, `y/n` (`propertyValue.ts:62-67`), read in any casing through `normalizeTitle` (`:76-81`). YAML booleans read as themselves (`:77`).
- **Decoding:** only a checked word decodes to a value (`:91-92`). Unchecked words decode to null.
- **Writing a fresh check:** writes the **YAML boolean `true`**, unquoted lowercase, not a string word (`checkedSpelling` returns `true` at `:171`; `writtenSpelling` at `:178`).
- **Preservation:** a held checked word is kept exactly as written (`:168`). An unchecked word that gets checked becomes its partner in matching case: ALL CAPS → ALL CAPS, Capitalized → Capitalized, otherwise lowercase (`:172-173`, using `capitalize`). For example `OFF` → `ON`, `No` → `Yes`.
- **Unchecking** removes the key; no `false` is ever written (PropertiesPM rule; `isBlankRaw`/`encodeValue`, `propertyValue.ts:163-185`).

###### Number
- **Reading:** a YAML number, or a string that spells one. Commas are accepted only as thousands separators, and a currency symbol (from `CURRENCY_CODES`) before or `%`/symbol after (`formatValue.ts:247-274`).
- **Preservation:** `spelledNumber` (`formatValue.ts:277-289`) keeps an unchanged string spelling exactly as written. A changed value keeps the file's symbol, %, grouping and decimal places. A new value, or one over a non-string, lands bare.

###### Relation to a Value Format
Both are orthogonal to it:
- Checkbox has a casing rule, but only for which word it writes. A Value Format is scoped to Select/Status/Multi-Select.
- Number has no letter casing at all.

The machinery a Value Format would actually touch is the **option** path:
- Option values are read by fold through `optionsByFold`/`registeredOption` (`propertyValue.ts:46-60, 101-111`).
- `writtenSpelling` keeps the file's existing casing for each list member on ordinary value writes (`propertyValue.ts:177-190`).
- An option's `value` is both its display title and its on-disk word (`properties.ts:133-141, 147-156`).

##### 5. Casing Utilities
- `capitalize` uppercases the first character only (`UIX/Utilities/capitalize.ts:1`).
- `toKebabIconId` converts PascalCase to kebab-case for Lucide icon ids (`UIX/Symbols/iconRoster.ts:4-11`). It's the codebase's only word-boundary splitter, and it splits on case changes, not spaces.
- `foldKey` and `normalizeTitle` do lowercase + NFC, plus trim (`Core/Paths/caseFold.ts:7-14`). `matchQuery` folds `/` to spaces for search (`:55`).
- There's nothing for snake, camel, Train, UPPER_SNAKE or UPPER-KEBAB conversion, and no helper that splits space-separated titles into words. A new helper would be needed, and `UIX/Utilities` or `Core/Paths` is the natural home.

##### Corrections to Nathan's Claims
- **"Within each property's own PropertyPanel":** `PropertyPanel` is the value panel (`PropertyPanel.tsx:82`). The per-property settings frame is the editor inside `PropertyFrame` (`PropertyFrame.tsx:379-431`), opened from a Collection's Settings → Properties (`SettingsFrame.tsx:158`).
- **"The same counting system already in place":** there are two algorithms behind one channel (§2). Neither counts "items whose metadata a format change would rewrite" correctly as they stand.
- **"Skipping confirmation when zero items are affected":** nothing does this today. `askHolding` always asks and would show "0 Items" (`confirmations.ts:109-116`).
- **"Booleans … writing new ones as true/false":** a fresh check writes the YAML boolean `true`, unquoted lowercase (`propertyValue.ts:171`). Unchecking removes the key, so `false` is never written. Held words are preserved, including casing, and an unchecked word gets its partner in matching casing (`:166-174`).
- **"Numbers have similar preservation logic":** correct. Number preserves the string spelling: symbol, %, grouping and decimal places (`formatValue.ts:277-289`). That's formatting, not casing.
- **Unstated assumption, that a format change is like a display setting:** it isn't. `def.name` **is** the on-disk key (modulo case), and an option's `value` **is** the on-disk word. A format is a rename of identity (see Hazards).

##### Consolidation Opportunities
- **Two holder counters:** `propertyHolders` (presence) and `optionHolders` (dry-run rewrite) answer differently shaped questions through one channel (`handlers.ts:181-185`). One `countRewrites(files, rewrite)` dry-run helper, built on `sweepGovernedRoots`' parse plus `changedKeys`, would serve delete (rewrite = strip key), option clear/remove, and any format change.
  - It would also remove the separate parse loop in `optionOps.ts:278-283`, which mirrors the read half of `sweepGovernedRoots` (`governedSweep.ts:66-107`).
- **Wording:** confirmations say "Items" (`confirmations.ts:107`), while the rename refusal and unswept notices say "files" (`properties.ts:268-269`; `governedSweep.ts:30-31`). Both count the same thing.
- **Case-only rename inconsistency:** a property-name case change sweeps nothing (`registryProperty.ts:125, 150`), but an option-value case change rewrites every holder (`pageValue.ts:26-33`). A format feature would force a decision on which rule is canonical.

##### Hazards & Open Questions
- **A separator-changing format breaks identity.** Every read and write finds a key by `foldKey(def.name)`:
  - `heldKey`/`heldKeys`/`heldValue`/`writeTarget` (`Files/heldKeys.ts:8-39`), the index's `page_values.fold` (`Desktop/Store/stores.ts:158-164`), and `renameFrontmatterKey`.
  - About 38 `held*` call sites in non-test code use this.
  - `Due Date` → `due_date` doesn't fold-match, so the property would stop reading its files the moment the format differed from the name.
  - That leaves two options:
    - (a) The format is a derived rename that keeps `def.name` equal to the on-disk spelling, with the display title reconstructed or stored separately.
    - (b) A second identity field that every `held*` site and the index must honor.
  - (a) is the only one that fits the codebase's "once defined" structure. It means the definition needs a display title separate from the key, which is a model change.
- **The same applies to Value Format, and worse.**
  - Select and Status read values through `optionsByFold` (`propertyValue.ts:46-60, 101-106`). A reformatted value that misses would read as **no value**.
  - Multi-Select would read the old spelling as an unregistered member and **auto-register it as a new option** through `registerHeldOptions` (`optionOps.ts:94-150`, called on open and on settle: `Nexus/handlers.ts:107`, `Nexus/settle.ts:145`).
  - Option values also live in saved views, View Tiles and the Matrix filter (`optionCascade` → `reachConfig`, `optionOps.ts:211`), so those must be rewritten too.
  - If the on-disk word differs from the displayed title, options need a separate stored form, because today `value` is both (`properties.ts:133-156`).
- **A case-only format would rewrite nothing on the existing paths.**
  - A case-only property rename sweeps nothing (`registryProperty.ts:125, 150`).
  - Value writes keep the file's key spelling (`writeTarget`, `heldKeys.ts:34-39`) and member casing (`writtenSpelling`, `propertyValue.ts:177-190`).
  - So lowercase or UPPERCASE riding on rename would change the registry and touch zero files, the opposite of the "rewrite N items" Nathan described.
  - Also, every later outside edit with a different casing stays as written. The format describes how Pommora writes files, but it wouldn't stay enforced as other tools edit them.
- **A single journal slot** means a multi-option Value Format cascade needs one composite op (`journalSlot.ts:37`; `propertyJournal.ts:8-12`). A stranded record from an earlier op would make the format sweep run unjournaled.
- **Collisions:** rename refuses when any file holds both spellings (`registryProperty.ts:126-128`). Two properties, or two options, can format to the same string (`Due Date` and `due-date` both → `due_date`). Name uniqueness is case-folded only (`schema.ts` validateName; `properties.ts:263-270`), so formatted-key uniqueness would need its own validation.
- **What's excluded:**
  - Context keys `<Title>:`, `ID`, `banner` and the `_`-prefixed built-ins (`properties.ts:244`; PropertiesPM *§Identity & Values*).
  - Creation Time and Last Modified, which are never persisted.
  - A Key Format applies to Text, which has no settings rows today (`PropertyFrame.tsx:373`).
- **Space `$order`** stores property names (`registryProperty.ts:95`). A format change has to rekey it, which `renameSweep` already does.
- **Cross-project:** NexusOS is also an Obsidian vault and Sapphire reads its keys. A separator-changing Key Format changes what Obsidian and Sapphire see.
- **Open question:** is a format a one-shot "reformat everything now" action, or a standing rule? A standing rule conflicts with "a write keeps the file's spelling" (PropertiesPM *§Identity & Values*; `heldKeys.ts:1`).
- **Label collision:** "Format" already labels Number's family row, Link's display row and Date's heading. "Key Format" sitting next to "Format" in the Number and Link editors reads ambiguously.

##### Opinions
- **(Opinion)** Key Format, as Nathan pictures it, is a rename with a computed target. The honest implementation is a "Reformat Key" action that computes the formatted name and runs it through `renameProperty`, minus the case-only short-circuit. A persistent per-property setting would fight the preserve-the-file's-spelling rule on every write.
  - The catch is that `def.name` then *becomes* `due_date`. The UI would show `due_date` unless a display title is introduced, which is the real design decision hiding under this feature.
- **(Opinion)** Value Format is materially riskier than Key Format. It touches option identity, saved views and filters, and Multi-Select's auto-registration, with a single-slot journal.
  - I'd defer it, or limit it to case-only formats, which fold-match and so can't orphan values. That still needs a forced-recase sweep over all options under one new journal op.
- **(Opinion)** Restricting Key Format to case-only formats (Match Title, lowercase, UPPERCASE, Title Case) removes the identity hazard completely. Every non-case format (kebab, snake, camel, Pascal, Train, UPPER_SNAKE, UPPER-KEBAB) is a real rename, with collision and Obsidian-interop costs.
- **(Opinion)** Whichever way it goes, build the confirmation count as a dry run of the actual rewrite, the `optionHolders` model generalized, and fold `propertyHolders` into the same helper. Add the zero-count skip there, so delete, clear and remove all gain it consistently instead of special-casing format changes.

---

#### D — History & Interop

**Brief:**

> You're a read-only research scout for Pommora, a local-first productivity app at `~/The Studio/Projects/Project Pommora`. Do not edit any file or commit.
>
> #### Background
>
> Pommora stores property values as YAML frontmatter keys in Markdown pages (and as keys on JSON Space sidecars). Today, per `.claude/Features/PropertiesPM.md` (§Identity & Values), property keys and option values match "without regard to case", writes keep the file's spelling, and a rename sweeps "any casing". Nathan (the owner) is considering replacing that with per-property **Key Format** and **Value Format** settings (Match Title, lowercase, UPPERCASE, kebab-case, PascalCase, camelCase, snake_case, Train-Case, UPPER_SNAKE_CASE, UPPER-KEBAB-CASE), read and written exactly, so `Name:` and `name:` would no longer be the same key. His motivation: industry-standard frontmatter keys (`model:`, `effort:`, `description:`, `status:`, `name:` — e.g. Claude Code agent/skill files) are lowercase, while he wants capitalized titles in-app. His Nexus (NexusOS) is simultaneously an Obsidian vault, and a sibling Obsidian plugin, Project Sapphire, bridges Pommora features into Obsidian.
>
> #### Your Mandate: Why Case-Insensitivity Exists, and What Depends On It
>
> 1. **History:** Search `.claude/HistoryPM.md`, `.claude/sessions/`, `.claude/Planning/` (all subfolders, including the Data Layer investigation reports and the Number & Checkbox Adoption plan), `.claude/IssuesPM.md`, `.claude/ContextPM.md`, `.claude/FrameworkPM.md`, `.claude/PommoraPRD.md`, and `git log` (use `git log --all --oneline | grep -i -E "case|casing|spelling|fold"` and inspect relevant commits) for when and why case-insensitive key/value matching and spelling preservation were introduced, what problems they solved, and who decided (Nathan vs. an agent). Quote the decisive passages briefly with their source path. Note any locked decision or Nathan ruling that this idea would contradict.
> 2. **Interop:** Determine, from docs and well-established knowledge, how Obsidian treats property key casing (are `Name` and `name` the same property in Obsidian's Properties view and its `types.json`?), and whether anything in Pommora's docs or code (search for "Obsidian", "Sapphire") depends on matching Obsidian's behavior. Note what Sapphire's docs say if found in the Studio (`~/The Studio/Projects/` — look for a Sapphire project; read only its docs).
> 3. **Existing Nexus Data:** Read-only, sample `~/Test` and NexusOS (`~/NexusOS/`) frontmatter to report how mixed-casing keys and option values actually appear in practice (e.g. `status:` vs `Status:`, `Areas:`), and in `.nexus/properties.json` files found there, how options are stored (fields per option). Give counts where cheap (e.g. `grep -r` over `.md` frontmatter). Don't print personal content beyond key names and option words.
> 4. **Prior Art in Planning Process:** Identify the most recent planning folders' structure (e.g. `.claude/Planning/Path Links/`) — which documents a planning session produced (Brief, Decisions, Scout Findings, Plan) and in which order — so a new brief can match convention.
>
> #### Report Format
>
> Markdown, H4/H5 headings, sections per numbered mandate, then Tensions With Prior Decisions, Hazards & Open Questions, and Opinions (clearly labeled). Cite sources by path (and commit hash where relevant). Be complete, no padding, no preamble.

**Report:**

##### Summary

Case-insensitive keys and values are Nathan's own 10-03-2026 ruling, made to solve the exact motivation he now raises (lowercase `description:` externally, `Description` in-app). The case-insensitive design replaced an earlier Title-Case display toggle ("Capitalize All Metadata"). It is a locked, Nathan-confirmed decision, built in about 12 commits over 10-03 to 10-05 and extended 10-12. Sapphire (his Obsidian plugin) is built around the same rule, and NexusOS depends on it today (337 lowercase `tags:` pages against a registered `Tags`).

---

##### 1. History: When and Why

###### Before 10-03: exact keys plus a display toggle
- **08-31/09-01:** Property values moved from wrapped `<Property>:` keys to "bare keys named exactly as the registered property" (`HistoryPM.md`, the 08-31-2026 entry, line ~442; commit `36d58d9f3`, "the registry name is the one ownership gate"). Matching was exact.
- **The toggle:** To get Title Case in-app, that entry added "Capitalize All Metadata Title Cases property names through `displayPropertyName` at every label surface while the rename fields and every frontmatter read keep the key". That is display-only, and it is Nathan's current idea again in another form.

###### 10-03-2026: Nathan's decision
Source: `.claude/sessions/10-03-2026-Pommora-Case-ID.md` (session `6c0885c7`, $310, 290M tokens), Nathan's opening prompt:
> "I want to make it so that Pommora treats properties as case-insensitive so that we can remove the 'Capitalize All Metadata' toggle. Creating a property titled 'Example' would write to a page through 'Example:' while it would read an externally added 'example:' as the same key. This would also be able to work for Values."
> "...case-sensitivity may require lowercase, while you'd create or rename the property in the app to maybe be titled with uppercase — but be able to use both interchangeable."
- He set the sole exception: Pommora's own keys (`ID`, `banner`, sidecar `id`, `heading_icon_hidden`, `$`-prefixed) stay exact.
- He demanded "no odd-ones-out behavior" and "doesn't have any hint that Pommora had any sort of previous behavior".

Claude's question round (same session) and Nathan's rulings:
- **`tags:` vs `Tags:`:** Claude noted "NexusOS has a `Tags` property and 58 pages holding lowercase `tags:` (Obsidian's)... Is that the intent?" Nathan: "Yes, that's intended."
- **File spelling:** "Keep the keys spelling, but recognize it regardless. A capitalized property writes capital, but would read an identical non-capital one all the same."
- **Values:** options and checkboxes follow (`done` = `Done`, `Yes`/`No` recognized). Context keys `<projects>:` become case-insensitive too. The exempt list was confirmed.
- **Conflicts:** Nathan floated "Automatically Resolve Case Conflicts" as a toggle.

###### Implementation commits (all 10-03 unless noted; Claude Fable 5.1 co-authored, Nathan the git author)
- `c141e4814`: "a frontmatter key matches a property name without regard to case on every read, through one held-key rule in caseFold".
- `de413068c`: option values and checkbox words fold; "option titles are unique by fold".
- `ad6ba7860` and `2d74a83f9`: writes keep the file's spelling; the reconcile is toggle-gated.
- `bb84731c8`: rename, removal, delete, and option edit reach every spelling.
- `30a88384e`: Trash restore handles any casing.
- `a05148e0c`: **removes "Capitalize All Metadata"**; "a property name displays as the registry spells it".
- `21b35cf2d`: docs.

###### 10-05-2026: the toggle retired, again by Nathan
Source: `10-05-2026-Pommora-case-agnostic-property-assignment.md`. Nathan asked what happens when `tags:` exists and the registry says `Tags`, then ruled:
- "A. Collapse obviously; all writes collapse duplicates... Please also ensure this fix applies to spaces too."
- "the property key stays the same, but the option gets replaced. So its the same behavior of casing preservation."

That became commit `2d0526bb9`, "Resolve Case Conflicts setting is gone". Session `10-05-2026-Resolve-Case-Conflicts-retired.md` records its simplification. A `.claude/scripts/Case Matrix/` test folder was deleted at Nathan's order.

###### Later extensions
- `Planning/Text Properties — Implementation Plan.md` (Text decode and spelling).
- `Planning/Number & Checkbox Adoption — Implementation Plan.md`, ratified `7d5400e2b` 10-12 (session `10-12-2026-Quote-Insensitive-Metadata.md`). Its intro states "Key matching is already type-agnostic — a key matches a name in any casing, a write lands on the spelling the file holds", and "Keys and values match without regard to case or quoting". Checkbox words keep their casing (`No` → `Yes`, `OFF` → `ON`).
- The motive for quote and case preservation was avoiding Pommora/Sapphire write ping-pong. From the 10-12 session: "Sapphire double-quotes every list item it writes... a NexusOS list would flip quotes back and forth with every edit in either app."

###### Current authoritative text
- `.claude/Features/PropertiesPM.md`, §Identity & Values (lines 27, 29):
  - Name is "unique nexus-wide, case-folded, trimmed and NFC-normalized".
  - "Keys and scalar values match without regard to case or quoting. A write keeps the file's spelling".
  - Two spellings in one file collapse into the registered spelling on write.
  - A case-only rename "changes the registry alone".
  - Validation (line 139): the name is "compared case-folded, because the name is the on-disk key".
- `.claude/PommoraPRD.md` lines 75 and 101: Context keys match "without regard to case"; foreign keys preserved apart from second spellings of a recognized key.
- `.claude/Features/CorePM.md` line 155: the content index stores each governed value "findable by its folded key".
- Code: `Core/Paths/caseFold.ts` (`foldKey` = lowercase then NFC; `spellings`; `normalizeTitle`). About 60 non-test source files reference `foldKey`, `heldKeys`, `normalizeTitle`, `namesValue`, or `spellings(`. The rename, delete, Trash restore, repair sweep, content-index key columns, option sweeps, filters, and sort comparators all depend on the fold. `ViewTypesPM.md` line 55 says text sorts are "case-insensitive", and commit `8710a2b41` made text Is/Isn't filters fold case.

###### Searches that found nothing
No `IssuesPM.md` or `FrameworkPM.md` entry covers case. `Guidelines/` has nothing on it. The Data Layer investigation reports barely touch it (Report A mentions casing in passing). No Nathan ruling exists on per-property key or value formats.

---

##### 2. Interop

###### Obsidian (well-established knowledge plus Sapphire's documented claims)
- **Properties UI:** Obsidian's Properties UI and metadata editor treat a property name case-insensitively. Sapphire's `Features/PropertiesSPH.md` §Case-Insensitive Properties says: "The rule is Obsidian's own: its metadata editor refuses a second key that differs only by case, and it reads tags and aliases in any case, so `Tags` and `Aliases` get the treatment `tags` and `aliases` get."
- **Reserved keys:** `tags`, `aliases`, and `cssclasses` are reserved lowercase names. Obsidian also accepts `Tags` and `Aliases`.
- **`types.json`:** The type manager, `.obsidian/types.json`, keys one type per name. In NexusOS it holds `tags`, `aliases`, `cssclasses`, and also `Status`, `Areas`, `Projects`, `Priority`, `Price`, `Brand`, `Color`, `banner`, `version` (read-only sample). So it stores whatever casing it first saw.
- **Not verified:** Whether `Name` and `name` collapse to one type entry in `types.json` internally. My belief is that lookup is by lowercase with display casing from first sight. Treat it as unverified and check live: add `name:` and `Name:` to two notes and watch Properties view and `types.json`. Dataview and Bases casing behavior is also unverified.
- **Consequence:** Under exact-case Key Formats, Obsidian would show `Name:` and `name:` as one property, and it refuses a second key differing only in case in its metadata editor. Pommora would treat them as two. Hand-edited YAML can still hold both.

###### Does Pommora depend on matching Obsidian?
- **No code or doc ties Pommora's fold to Obsidian's behavior**; it is derived from Nathan's lowercase-tooling motive. In the 10-03 session the NexusOS `tags:` case was the motivating example, and the Obsidian-given `tags: Ideas` case was discussed (line ~998).
- `Features/PropertiesPM.md` lines 43 and 130 mention Obsidian only as an example editor. `Features/MarkdownPM.md` and the history (line 914) call `![[Title]]` "Obsidian's own syntax, so a Nexus keeps reading outside Pommora".
- `PommoraPRD.md` §Foreign data: unknown frontmatter keys are "carried through untouched".
- `.claude/CLAUDE.md` line 63: NexusOS "is both an Obsidian vault *and* a Pommora Nexus — frontmatter appearing not to conform to Pommora's standards (e.g., bare `Areas:`, `Topics:`, `Projects:`, `Status:` etc.) isn't Pommora's concern". Line 62 says Sapphire keeps NexusOS "Pommora-compatible on a per-case basis".

###### Sapphire (`~/The Studio/Projects/Sapphire/.claude/`)
- `SapphirePRD.md` line 9: it holds "the same frontmatter conventions, so the data stays aligned for the day Pommora opens it — Pommora reads plain Obsidian-compatible files".
- `Features/PropertiesSPH.md` §Case-Insensitive Properties: "`Status` and `status` are one property everywhere Sapphire reads or writes a note. A lookup takes the note's key spelled exactly as asked when one exists, and otherwise the one that matches regardless of case; a write lands on the key the note already holds, in its own spelling and quoting, instead of adding a second key." Its setting is "always on".
- `HistorySPH.md` line 539: the rule-evaluator lookup was exact-case and "a rule typed as displayed silently never matched", so `propertyValue()` now "folds on miss (exact hit first), aligning the evaluator with the casing law everywhere".
- `Features/CoreSPH.md` line 13: records for options, icons, hidden names, and configured tags "resolve a property name regardless of case, so one property never forks into case-variant entries"; the options store in `data.json` "is keyed by property name regardless of case".
- `Features/AutomationsSPH.md` line 43: automation conditions fold, but "actions write the exact name the rule spells, so a rule naming `Status` acts on a note holding `status` by adding a second `Status` key". This is a known wart.
- `HandoffSPH.md` ("Next Session"): an unbuilt task, "Case-Insensitive Properties switch". The owner wants it as an off-able setting, default on. Off means automation rule property names match note keys exactly "Obsidian folds case on every surface it owns, so an exact-case mode can't apply there; it would show values it can't edit, or write a second case-variant key."
- `ContextSPH.md` line 58: the property menu URL zone builds its property id from `data-property-key`, which Obsidian lowercases, while the frontmatter splice matches case exactly, so "Remove URL" on a mixed-case property appends a phantom lowercase key.
- `Features/PropertiesSPH.md` line 87 and `QuickFixesSPH.md` line 36: Sapphire has a display-only Title Case labels setting for Bases ("file name" → "File Name"). This is the display-layer precedent for Nathan's "capitalized titles in-app".
- `IssuesSPH.md` I-015 and line 439: Sapphire writes a key "as given" when the note lacks it.
- Sapphire quote behavior (10-12 session): it double-quotes non-number strings and list items, and writes numbers unquoted.

---

##### 3. Existing Nexus Data (read-only samples, key names and option words only)

###### NexusOS: 558 pages with frontmatter, 17 distinct keys
- Counts: `ID` 492, `tags` 337, `Timeframe` 280, `<Projects>` 145, `Projects` 75, `Status` 61, `Topics` 35, `Areas` 31, `version` 29, `Priority` 18, `description` 15, `Pinned` 6, `banner` 4, `name` 3, `aliases` 3, `Tags` 2, `Link` 1.
- **Only one mixed-casing group exists: `tags` 337 vs `Tags` 2.** No page holds duplicate spellings of a key.
- **Registry (`~/NexusOS/.nexus/properties.json`):**
  - Defs: Status, Link, Timeframe, Pinned, Tags, File, Price, Brand, Concern, Scale, Created, Updated, Color, Description, Version.
  - Registered capitalized names versus on-disk lowercase keys today: `Tags` ↔ `tags` (337), `Description` ↔ `description` (15), `Version` ↔ `version` (29). Today's fold is what makes these live properties.
  - Under exact matching, those three properties would silently go empty on about 381 page-key occurrences, unless Key Format is set to lowercase for them.
  - `Areas`/`Projects`/`Topics`/`Priority` are "foreign" there (not registered) apart from `Status`/`Version`/`Tags`.
- **Option values:** zero case-variant option groups in `tags`, `status`, `areas`, `version`, `priority`. All are consistently capitalized (e.g. `Ideas`, `Tasks`, `Open`, `Active`, `High`; `v4.0`). So today's value-folding has not been exercised by real data. Only the key side has.
- **Obsidian `types.json`:** see §2.

###### `~/Test`: 10 pages, no mixed casing
Keys are fixtures (`Fixture Number`, `Fixture Select`, ...) plus `<Areas>`/`<Projects>`/`<Topics>`, `banner`, `ID`. The `Case Matrix` live-drive scripts that exercised casing were deleted 10-05.

###### `.nexus/properties.json` shape
- Top level `{defs: {prop_<ulid>: {...}}, order: [ids]}`.
- A def holds `id`, `name`, `type`, and optional `icon`, plus type-specific fields: `select_options`, `status_groups`, `number_decimals`, `number_family`, `link_color`, `link_underline`, `checkbox_color`.
- **Option fields:** `select_options` is a flat array of option objects with `value` (required), `color` (e.g. `grey-5`), and `appearance` (`"clear"`). Status groups are `{id, label, color, options:[{value, label, color, group_id, icon?, appearance?}]}`.
- **No per-option id.** The `value` string is both the on-disk word and the identity, so any Value Format that transforms the written word either has to transform at write time (stored `value` stays the title) or add an id.
- The registry holds no key or format field today. The property's `name` is itself the on-disk key (§Identity & Values).

---

##### 4. Planning Convention

- `.claude/Planning/Path Links/` is the most recent, ratified 10-17 in a single commit `df6b01db9` (all four files added together, so file-creation order is not recoverable from git). Content-dependency order:
  1. `Path Links — Scout Findings.md` (about 580 KB): verbatim scout briefs and reports from decision rounds, "each marked with what a later decision superseded", plus mechanism forks.
  2. `Path Links — Decisions.md` (about 25 KB): header `**DATE:**`/`**STATUS:** RATIFIED`, then `### Context`, `### Overview`, `#### Concepts`, lettered decision groups A to G, each decision tagged CONFIRMED/INFERRED/ASSUMED, then `#### Constraints`, `#### Rejected`, `#### Open Items`, `#### Prospects`, `#### Sources`. This is the studio-brainstorm skill's "decision log" output.
  3. `BRIEF.md` (about 13 KB): "The standing principles, philosophies, and working rules Nathan holds planning and execution to". Its `#### The Documents` section lists the Decisions, the Scout Findings, and the brief; it then lays out Guiding Principles (Less to Carry, Less to Understand, and so on).
  4. `Path Links — Plan.md` (about 240 KB): Context, Overview, Concepts, Constraints, Process Overview, then Phases and Tasks (`Task 1-1`...) with Review Checkpoints. Produced with the writing-plans skill.
- Older and smaller folders vary: `Alias Management/` has Plan and Results; `Text Color/` has Plan and Results; `Connections & Aliases Restructure/` has Brief, Design, Investigation, Plan, Results. Single-file plans are standalone, such as `Number & Checkbox Adoption — Implementation Plan.md` and `Sync-Scaffolding-V2 — Decision Log.md`. Brainstorm briefs exist as standalone files too (`Error Surfaces — Brainstorm Brief.md`).
- **Convention for a new brief:** `.claude/Planning/<Topic>/` containing `BRIEF.md`, `<Topic> — Decisions.md`, `<Topic> — Scout Findings.md`, then `<Topic> — Plan.md`, ratified in one commit that records the baseline commit, with `— Results.md` added after execution.

---

##### Tensions With Prior Decisions

1. **Direct reversal of Nathan's 10-03-2026 ruling.** "A capitalized property writes capital, but would read an identical non-capital one all the same." The new idea ends the fold: `Name:` and `name:` become different keys.
2. **Reverses the explicit 10-03 "Yes, that's intended" for lowercase `tags:` adopting into `Tags`.** NexusOS's 337 pages would detach unless `Tags` is set to lowercase Key Format.
3. **Reverses "no odd-ones-out"/total-consistency (10-03 and 10-05).** Per-property formats make exact-versus-folded matching a per-property attribute, and Pommora's own exempt keys (`ID`, `banner`) are already an exception to the fold.
4. **Revives the removed display-casing layer.** "Capitalize All Metadata" was removed in `a05148e0c` to get one registry spelling per name, and Nathan's own removal reason was to prevent two spellings of one concept. The new idea reintroduces a Title Case/format layer for display. The original motive was met by case-insensitivity. Is it still unmet? A third option is to keep the fold and add only a display or write-spelling setting.
5. **10-05 collapse rule:** "all writes collapse duplicates" into the registered spelling, and a rename "joins" spellings. Under exact keys, `tags:` and `Tags:` in one file are two properties or foreign keys, so there is no collapse and no join.
6. **Sapphire alignment:** it is explicitly "Obsidian's own" fold and always-on. A Pommora exact-case mode diverges from the sibling plugin Nathan designed to stay "Pommora-compatible" and from `PommoraPRD`'s interop story.
7. **Value matching and quoting:** the Number & Checkbox plan (ratified 10-12) reads checkbox words and options "in any casing". Exact Value Format would contradict those arms (`checkboxWord`, `namesValue`, `writtenSpelling` all exist because of the fold).

---

##### Hazards & Open Questions

- **Migration of existing data:** NexusOS `Tags`/`Description`/`Version` need Key Format lowercase at once, or ~381 occurrences go dark. A migration or an "adopt a held spelling" option is needed. What about `Status:` as written in 61 pages versus the registry `Status`? That case aligns.
- **Where does the on-disk spelling come from?** Today it is `def.name` (the key is the title). A Key Format makes the key a transform of the name. Key Format `Match Title` is the old behavior with exact matching. Do renames re-key files (Format changes cascade across all pages and Space sidecars, a heavier sweep than today's case-only no-op)?
- **Reads:** "read and written exactly" means a lowercase-format property ignores `Description:`. A file with both `description:` and `Description:` is no longer a conflict but two unrelated keys. The foreign-key rule (preserved, decoded by no property) applies to the loser. This is silent data hiding.
- **Name uniqueness:** names are unique case-folded because the name is the on-disk key. If Key Format decouples the key from the name, uniqueness must be re-derived over formatted keys. `Draft Status` in kebab and `draft-status` as a separate property would collide; snake_case and kebab-case can produce the same fold-free key from different names.
- **Format lossiness:** `lowercase` of `AI Model` = `ai model`, which breaks YAML keys with spaces unless quoted. PascalCase and camelCase from a multi-word title are lossy (acronyms, digits). Are non-ASCII and punctuation titles handled? Round trip from key to title does not exist.
- **Value Format on options:** options have no id, and `value` is the identity. If Value Format transforms the written word (`In Progress` → `in-progress`), reads map back via transform, and two options colliding after transform need refusal. Existing data holding `Done` while the format is lowercase would mis-read as foreign. Status groups also have `label` versus `value` (a status option already has a title/value split: `label` "Open", `value` "Open"), which may be the natural hook.
- **Index:** content-index keys are stored folded (`INDEX_GENERATION`), so a change bumps the generation and a re-index. Folded index keys exist so sweeps find "every spelling" without scanning; exact formats would simplify the index.
- **Contexts and own keys:** `<Projects>` Context keys and `ID`/`banner` exemptions are separate machinery. Do Contexts get Key Format?
- **Sapphire writers:** automation actions write the rule's literal name; Sapphire's metadata editor refuses case-only duplicates. A Pommora vault with `Name:`/`name:` as distinct properties cannot be represented in Obsidian's UI.
- **Unverified:** Obsidian's internal `types.json`/metadataCache fold; Dataview/Bases casing. A short live test settles it.
- **Cheaper alternative to test against:** keep the fold and add a per-property **write spelling** (what a new key is written as: the title or a format of it), with reads still folded. That delivers lowercase `model:` on new pages and in-app capitalized titles without the 10-03 reversal, the migration, or the Sapphire divergence. The cost is that a property's on-disk spelling can differ from its title, which `def.name` as key forbids today.

---

##### Opinions (mine, labeled)

- The idea solves a real need (new keys written lowercase for tooling) but its read side, exact matching, is what hurts. The expensive, risky part is un-folding reads; the valuable part is controlling the spelling Pommora writes. I would test whether a write-spelling-only setting covers the motive before overturning the 10-03 ruling. The earlier session already handled "another tool needs lowercase" by preserving the file's spelling, so the remaining gap is only newly created keys on files that don't hold the key.
- Value Format is the weaker half: option words are user content, nothing in the sampled data has case-variant values, and `value`/`label` already exist on Status options. It reads as speculative.
- If exact matching proceeds anyway, it needs: a key-versus-title decoupling in the registry, a migration for NexusOS, a rule for cross-case collisions, and a Sapphire decision, since its always-on fold would then misdescribe Pommora's model. The brainstorm decision log should record these as explicit Nathan rulings, since the current text says the opposite.

---

#### Spot-Checks

Made in the main session against the source after the reports landed.

- **The Case-Only Rename Skip:** `recased` skips both the clash check and the sweep (`Core/Properties/registryProperty.ts:125-126, 150`), as Scouts A and C report.
- **Zero-Count Confirmations:** `askHolding` asks unconditionally and would read "0 Items" (`Core/Interface/Confirm/confirmations.ts:109-116`), as Scout C reports.
- **The Select Drop:** Select and Status decode an unregistered element to nothing (`registeredOption(def, v) ?? []`, `Core/Properties/propertyValue.ts:104`), while Multi-Select keeps it (`:110`), as Scout B reports.
- **The Option Fields:** `~/NexusOS/.nexus/properties.json` options hold `value`, `color`, and `appearance`, some with a leftover `label`; none holds a `name`, as Scout B reports.
- **NexusOS Key Counts:** pages whose frontmatter opens a line with `tags:` 337, `Tags:` 4, `description:` 15, `Description:` 2, `version:` 29, `Version:` 0. Scout D's 337 `tags` holds; its `Tags` count of 2 reads 4 by this line-anchored grep.
- **The 10-03 Ruling:** `.claude/sessions/10-03-2026-Pommora-Case-ID.md:15, 23` holds Nathan's opening prompt as Scout D quotes it.
