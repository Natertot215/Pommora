### MetadataV3 — Brief

**DATE:** 10-17-2026
**STATUS:** Draft
**BASELINE:** `988f6ee43`, the HEAD *MetadataV3 — Investigation* verified, with Path Links' last three phases still executing in a parallel session

Nathan's 10-17-2026 prompt for per-property metadata formats, kept as the basis every planning session and review starts from. *§The Idea* is his intent as the brainstorm sharpened it; *§Settled* lists his decisions, which *MetadataV3 — Decisions & Intention* records in full; *§Context* is his recollection of today's Pommora corrected against the code; *§Open Within the Idea* names each question the prompt left and the decision that settles it.

#### The Documents

- ***MetadataV3 — Brief***: this document.
- ***MetadataV3 — Scout Findings***: the first four scouts' briefs and reports at `e6e851183`, verbatim, with the main session's spot-checks.
- ***MetadataV3 — Investigation***: the planning session's three scouts reconciled with the earlier scouting against the code at `988f6ee43`, with the removal inventory, the reusable mechanisms, the approaches, and the cleaned reports.
- ***MetadataV3 — Decisions & Intention***: the brainstorm's decision log and its session questionnaire.
- ***MetadataV3 — Implementation Plan***: written through Plan-Creation on the ratified decisions.

---

#### The Idea

Pommora should replace its across-the-board case-insensitivity with exact metadata identity and a per-property casing format.

- **Key Format:** every property gets a "Key Format" setting choosing between `lowercase`, `UPPERCASE`, `kebab-case`, `PascalCase`, `camelCase`, `snake_case`, `Train-Case`, `UPPER_SNAKE_CASE`, and `UPPER-KEBAB-CASE`, with `Match Title` as the default. The format writes the property's stored key, and Pommora reads and writes that key exactly. The title stays exactly as typed in the app; each format concerns only what's in the raw file. `Match Title` writes the key exactly as the title is written, so "New Property" appears as `New Property:`.
- **Value Format:** a second row, "Value Format", with the same options and default, for Select, Status, and Multi-Select. Every other type keeps Pommora's existing value formatting unchanged and gets no Value Format.
- **Where It Applies:** both formats govern a property wherever its values are stored, on page frontmatter and Space sidecars alike. Contexts and Spaces get no format: a `<Title>:` key and the Space titles under it are written as titled and match exactly.
- **The Settings Rows:** "Key Format" and "Value Format" sit at the top of the property's own customization panel (the per-type editor `PropertyFrame` opens; see *§Context*), divided from the type's settings below, each with a hint Nathan words during planning.
- **Confirmation:** changing either format asks for confirmation ("This action would rewrite metadata in N items"), counted by one dry run of the rewrite, the shape the option confirmations already use (F-4); a change that affects no items, or a single one, doesn't ask.
- **Exact Keys:** case-varied keys stop being the same key, so `Name:` and `name:` are two different keys. Uniqueness keeps ignoring case: `Name` and `name` can't be two properties, and `Red` and `red` can't be two options.
- **What Stays:** value recognition, format preservation, and writing logic for YAML quote pairing, number formatting, Boolean syntax, links, and the like don't change. Only casing identity does.
- **The Basis:** every property and every option stores two words in `properties.json`, `label` (the name shown in the app) and `key` (the word on disk), and the format writes the key from the label. `Match Title` is the case where the two words coincide, which is every property and option today. *§The Basis* covers its history and precedents.

##### Why

Many materials use hard-coded keys backed by real industry standards, such as `model:`, `effort:`, `description:`, `status:`, and `name:`, and YAML and Markdown conventions set their own expectations for frontmatter. Users, Nathan included, may prefer capitalized names for their metadata in the app, but not at the expense of whatever purpose the keys serve outside it. The formats make Pommora development-friendly: the app shows the title the user wants, and the file holds the spelling its tools expect.

##### Recognition and Adoption

Nathan wants foreign frontmatter still recognized and its values still adopted into `properties.json`; the immediate logic is that recognition follows the property's own format. His examples:

- An externally added `- Red` is recognized under `Color:` when its Value Format is `Match Title`.
- `- RED` is recognized when the Value Format is `Match Title`, `UPPERCASE`, `UPPER_SNAKE_CASE`, or `UPPER-KEBAB-CASE`.
- `- red` is recognized when the Value Format is `Match Title`, `lowercase`, `kebab-case`, `snake_case`, or `camelCase`.
- `- RED`, `- Red`, and `- red` are all eligible under `Match Title`. Option labels never differ only by case, so a word whose label would match an existing option's that way stays foreign.

So a format recognizes the foreign spellings it could itself have produced, and `Match Title` recognizes every casing. Multi-Select adopts; Select and Status read only their registered options, as they do today.

---

#### Settled

Nathan's decisions in the prompt and its follow-ups; *MetadataV3 — Decisions & Intention* records them with everything the brainstorm settled. A planning session builds on them and raises one again only where evidence shows it can't hold as stated, naming that evidence.

1. Case-insensitive identity ends for properties wherever they're stored, and for Context keys and the Space titles under them. Nathan made the 10-03-2026 ruling that introduced it (*§Context*), and this idea supersedes it knowingly.
2. Each format is a standing setting of the property that governs both reads and writes, not a one-time reformat.
3. The format list is the nine conventions plus `Match Title`, which is the default for both rows.
4. Value Format exists, for Select, Status, and Multi-Select only.
5. Formats apply to properties on page frontmatter and Space sidecars alike; Contexts and Spaces get no format and match exactly as titled.
6. A format change confirms with the item count, and skips confirmation at zero or one item.
7. Quote, number, Boolean, and link preservation are untouched.
8. The `label`/`key` split, stored on every property and option, is the basis the design starts from.
9. Planning runs on the draft Studio-Brainstorm-V2 and Plan-Creation (*§The Planning Session*).

---

#### Context

Nathan's recollection of how Pommora works today, corrected where the code differs; each correction is cited in *Scout Findings* and re-verified in *Investigation*.

##### How Casing Got Here

1. **Exact Keys and a Display Toggle (08-31-2026):** keys were bare and matched exactly as the registered name, and "Capitalize All Metadata", which Nathan asked for "for this exact reason", title-cased names at every label surface while files kept their keys (`.claude/sessions/08-31-2026-Pommora-Properties.md:141`).
2. **The Fold (10-03 to 10-12-2026):** Nathan ruled that keys and option values match without regard to case while a write keeps the file's spelling, which retired the toggle (`.claude/sessions/10-03-2026-Pommora-Case-ID.md:15`); the 10-12 Number & Checkbox plan extended the rule to quoting and checkbox words. About twelve commits carry it (`c141e4814` through `2d0526bb9`).
3. **MetadataV3:** the fold gives way to per-property formats.

##### Corrections

| Recollection | What the Code Does |
| --- | --- |
| Options have separate `name:` and `value:` fields | The pair was `label` and `value`, and it isn't live. An option today is `{value, color?, icon?, appearance?}` (Status adds `group_id`); `value` is at once its title, its on-disk word, and its identity, and there is no option id (`Core/Properties/properties.ts:133-156`; `replaySchemaCascade.ts:83`). The `label` some options still carry always equaled `value` and is no longer read; *§The Basis* covers its history. |
| The settings rows live in `PropertyPanel` | `PropertyPanel` is the value surface on a page or Space. A property's own settings live in the per-type editors `Core/Properties/Schema/PropertyFrame.tsx` slides to, opened from a Collection's Settings › Properties. Text, Context, Creation Time, and Last Modified have no settings rows today; option types show their option list. |
| The existing count can be reused, and zero needs no confirmation | One channel, `property:holders`, runs two algorithms: key presence in any casing (`keyHolders.ts`) and a dry-run strip for options (`optionOps.ts:269-285`). Neither counts "files a format change would rewrite"; the dry-run shape is the one that fits. `askHolding` asks even at zero today (`confirmations.ts:109-116`). |
| External option values are adopted | Only Multi-Select adopts, registering the first spelling it meets verbatim. Select and Status decode an unregistered value to nothing and leave it on disk until an in-app edit of that property replaces it (`propertyValue.ts:104,195`). |
| Keys are read case-insensitively while new keys take the title | Accurate, with more reach than recalled. The fold is lowercase plus NFC; names are stored as typed and folded only to compare. A file holding two spellings has them collapsed into the registered one on write, and every governed write reconciles the whole root. The fold also governs uniqueness, reserved names, create step-aside, registry admission, the index's `page_values.fold` column, and Space `$order`. |
| Booleans write new values as true/false | A fresh check writes the YAML boolean `true`; an untick removes the key, so `false` is never written. A held word keeps its casing, and a tick over an unchecked word writes its partner in the same casing (`propertyValue.ts:167-174`). |
| Numbers have similar preservation logic | Accurate: symbol, percent sign, grouping, and decimals carry through (`formatValue.ts:277-289`). |
| A format change rewrites N items | On today's paths a case-only change rewrites nothing: a case-only property rename skips its sweep (`registryProperty.ts:125-126, 150`) and writes keep the file's spelling. The same change to an option *does* sweep every holder (`pageValue.ts:26-33`), so the two disagree today. The rewrite a format change needs rides on the rename machinery once that skip goes. |

---

#### The Basis: Label and Key

##### The Split Has Existed Before

- **05-16-2026, the Swift Build:** an option held `value` as a canonical key fixed at creation, which pages stored, and `label` as its display name, so a rename changed the label and left pages untouched.
- **07-03-2026, the React Rebuild:** options moved to "value = title throughout"; a rename rewrites every page, and `label` was carried along, always equal to `value`.
- **09-27-2026, the Removal:** `a28c340df` dropped `label` from the decoders and writers (decisions B-9 and B-10), on the 09-26 reasoning that the fixed-key design had "lost to readable files" (`.claude/sessions/09-26-2026-W10-Implementation.md`, around line 375).

MetadataV3's `key` differs from the Swift one: it's a readable spelling of the label, rewritten when the label or the format changes, rather than a word frozen at creation, so files stay readable.

##### Precedents Already in the Tree

- **Status Groups** hold `{id, label, color, options}`, the one option-side structure with a separate label (`Core/Properties/properties.ts:158-165`).
- **Context Picks** use the pair as a real split, `{value: spaceId, label: title}` (`Core/Contexts/contextOptions.ts:31-36`).
- **`PickOption`** carries `label` and `value` for every picker row; options currently fill both with the same word (`properties.ts:284`; `Pickers/PropertyPicker.tsx:73`).
- **The Leftover `label`** still sits on 28 of NexusOS's 59 options and on the `~/Test` fixtures, always equal to `value`, until each property's next option edit strips it.

---

#### The Removal-First Inventory

The fold rests on one primitive, `foldKey` in `Core/Paths/caseFold.ts`. With every metadata key and value matching exactly, the spelling machinery built on it leaves metadata identity: `heldKeys`, `heldKey`, `heldValue`, `writeTarget`, and `stripHeld` in `Core/Files/heldKeys.ts`, with `editHeldList` and `rekeyHeld` reduced to single-key forms; `byFoldedName` and `holdsList`; `joins` and `joinsSpellings` with the reconcile's join-and-retire branch; `mergeInto`'s spelling step and `renameFrontmatterKey`'s variants; the property and Context case-only rename skips; the folded replay gate; the `stored()` label strip; `withOrderEntry` and every `$order` title edit; and the index's `fold` column with its index. The fold remains where case shouldn't separate two things: uniqueness of labels, keys, and titles, the reserved-key refusal, the restore's match, search, sort, and file names on a case-insensitive disk.

- **What the Idea Adds:** `label` and `key` on every property and option with a one-time rewrite of the registries on disk; a case-conversion module (nothing in the tree splits free-typed titles into words); key-uniqueness and reserved-key checks on keys; the two settings rows; a format change on the rename path and a widened option rename with its journal record; the restore re-spell; an exact key index; one dry-run counter for every holder confirmation; the Multi-Select write carrying unrecognized words from the file; the adoption shield widened from one owed word to the list a Value Format change owes; and the create step-aside clearing keys as well as labels. Each answers a decision in *MetadataV3 — Decisions & Intention*, and the plan states what it lets go.
- **The Table:** *MetadataV3 — Investigation*, *§What Leaves, Narrows, and Changes*, classifies every mechanism with its citations, and a planning session re-derives it at its own HEAD.

---

#### Open Within the Idea

What the prompt left unanswered, each settled in *MetadataV3 — Decisions & Intention*, some as inferred readings the plan confirms against the code.

1. **Recognition Across Separators:** a word the format couldn't produce, such as `due_date` under `kebab-case`, stays foreign (E-1).
2. **What an Adopted Value Becomes:** the held word becomes the option's key and label, and only Multi-Select adopts (E-1, E-2).
3. **Stored or Derived:** both words are stored on every property and option (C-2).
4. **What References Point At:** configuration names options by label, so a format change rewrites only the files holding the key and `property_cache` (F-2).
5. **Uniqueness and Collisions:** labels and keys stay unique without regard to case, reserved keys are checked on the key, a label that converts to nothing is refused, and a format change that collides two keys is refused (B-5, D-1, D-2).
6. **Data Held Today:** NexusOS's `Tags`, `Description`, and `Version` take a `lowercase` Key Format after landing (I-1).
7. **One Property, Two Rules:** one rule covers pages and Space sidecars (B-4).
8. **Sapphire and Obsidian:** Sapphire needs no change (I-2), and Obsidian's case-blind property names are verified in its bundled code (*Decisions & Intention*, *§Constraints*).

#### Adjacent Findings

Divergences the scouts found inside this surface, and where each lands.

- **The Write-Time Collapse Rules:** four rules answered one question differently, and PropertiesPM stated one. They leave with exact identity (A-1).
- **The Two Folds in `heldKeys.ts`:** `heldKeys` through `spellings` and `heldValue` filtering on its own, with name comparisons mixing `foldKey` and `normalizeTitle`. They leave with the spelling machinery (A-1).
- **Mixed Matching in Configuration:** `configReach.ts` folds filter operands, sort and group orders, and the cache while matching collapsed and hidden bands exactly, and the Select filter folds where the Multi-Select filter matches exactly. Option references match exactly (F-2).
- **The Case-Only Rename Asymmetry:** a case-only option rename swept files while a case-only property rename didn't. Both sweep when the stored key changes (A-1, F-1).
- **Files and Items:** the rename refusal and unswept notices say files where confirmations say Items for the same count; they say Items (J-1).
- **The Delete Count:** it counts pages the delete leaves alone and misses Spaces touched only for `$order`; it equals what the delete rewrites (F-4, J-1).
- **Space `$order`:** it stores property and Context names where everything else orders by id; it orders by id (F-5).
- **The Leftover Option `label`:** it becomes the stored field (C-2).
- **Status at Create:** a Status's options go unchecked when the property is created; they're checked (J-1).
- **PropertiesPM:** its "Edit options" row omits the `property_cache` cascade, and "case-folded … once at write" misstates how names are stored; it's rewritten to describe identity as it becomes (J-1).
- **The Replay Hazard:** rename replay drops a case-only rename by folded `named()` (`replaySchemaCascade.ts:53`); replay compares stored keys exactly (F-1).

---

#### Guiding Principles

Nathan's, verbatim from the prompt.

- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
- Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.

#### Approach

Nathan's, from the prompt, with typos corrected.

- Any approaches being considered here must first assess what's true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We're not going to design based on what's currently there and simply adjust course, we're ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what's ultimately going to be replaced.
- We're approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- We shouldn't add anything new unless there's evidence that it's required. We'd approach this through the perspective of ending up with cumulatively "less stuff" in the codebase overall — less ways to do similar things, less complexity, less paths to go through, less tech-debt waiting to surface, less things to maintain, and less headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines is the north-star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our principles.
- Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebase's resulting shape — not just maintaining remnants or adherence to what's true *now* that's ultimately going to change. The approach reflects the outcome and shouldn't be bound to constraints that are only relevant before it.
- Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we're not starting from scratch.
- The complex data-level mechanics of the codebase is what least reflects *Nathan's* intentions and are primarily reflective of what's determined appropriate via past session agents. Treat it with care and respect, but don't assume it's beyond changing within reason where simply presenting the approach to Nathan may be all that's required to genuinely change the codebase for the betterment of everything within it and future iteration.

---

#### The Planning Session

Planning runs on Nathan's two draft processes, kept on the NexusOS side of the Athena mirror and not yet installed as skills: `~/NexusOS/Studio/Athena/II. Drafts/Studio-Brainstorm-V2.md` and `~/NexusOS/Studio/Athena/II. Drafts/Plan-Creation.md`. They're read as files and followed in preference to the installed skills. Studio-Brainstorm-V2's blank sections (*Incremental Interrogation*, *Prioritization & Pushback*, and *Review & Reconciliation*) took the installed `studio-brainstorm` skill's matching guidance. Plan-Creation governs the planning: where a section is blank (*Exploration Principles*, *Implementation & Design*, *Review & Ratification*) or names a process it doesn't spell out, such as *Neutral Verification*, the planning session inherits it from the active Path Links plan (`.claude/Planning/Path Links/Path Links — Plan.md`) and the project's other documentation, and Plan-Creation wins wherever they conflict. Each draft's own framing, document templates, and naming stay in charge.

- **The Brainstorm:** Studio-Brainstorm-V2 produced *MetadataV3 — Decisions & Intention* from this brief and *MetadataV3 — Investigation*, and Nathan ratified it on 10-17-2026.
- **Re-Verify, Then Reuse:** the planning session runs its own exploration under Plan-Creation's *Exploration Procedures*, at a light agent count, since its job is re-searching the code against what's now intended. It treats *Investigation* and *Scout Findings* as leads, re-verifies every claim it leans on at its own HEAD, and reconciles them itself. On the data layer and the Trash, it finds the mechanism that already does the job (sweeps, the journal, Try Again, crash replay, the restore reconcile) and rides it before designing anything. Path Links and a parallel session keep moving the baseline.
- **Removal First:** every phase assesses what can go before what must be added, and removal tasks run before additions.
- **Verify, Then Ask:** every claim about the code is checked against the tree, and each open question goes to Nathan with what was found, what it implies, and a recommended answer, in plain terms.
- **The Advisor Checkpoint:** the advisor reads the approach before a line of the plan is written.
- **Nathan's Copy:** planning stops for Nathan to word the two rows' hints (H-1) and to title the renamed Metadata leaf's section (J-1).
- **The Plan:** written through Plan-Creation as *MetadataV3 — Implementation Plan*, in its document template, closing on its *Final Verification* with the neutral verification it describes. It's drafted against `204f16671` and lands before Path Links' Phase 8. Before ratification it went through two review rounds of two `opus-xhigh` reviewers per lens, the simplification and adversarial lenses running side by side on Nathan's call, each asked whether the plan follows the principles above and would leave the codebase unarguably in a better state than it began with; a finding was folded in only where it held against the code and didn't over-harden or trade one problem for two.
- **The Live Drive:** `.claude/scripts/Metadata Spelling Drive/live-drive.mjs` already drives key and value spellings across casings and quote styles on `~/Test`; it extends rather than a new drive being written.
- **The Number:** each phase is measured with `view-delta`, removals and additions apart; no plan promises a number its design can't deliver.

#### Sources

- `.claude/Features/PropertiesPM.md` (*§Identity & Values*, *§Shared Mechanisms*), `.claude/Features/CorePM.md`, `.claude/PommoraPRD.md`, `.claude/CLAUDE.md`.
- `.claude/sessions/10-03-2026-Pommora-Case-ID.md`, `10-05-2026-Pommora-case-agnostic-property-assignment.md`, `10-05-2026-Resolve-Case-Conflicts-retired.md`, `10-12-2026-Quote-Insensitive-Metadata.md`.
- `.claude/sessions/08-31-2026-Pommora-Properties.md`, `09-26-2026-W10-Implementation.md`, `09-26-2026-Rename-Fixes.md`; commit `a28c340df`.
- `.claude/Planning/Number & Checkbox Adoption — Implementation Plan.md`; `.claude/Planning/Path Links/`.
- `~/NexusOS/Studio/Athena/II. Drafts/Studio-Brainstorm-V2.md` and `Plan-Creation.md`.
- `.claude/Planning/MetadataV3/MetadataV3 — Investigation.md` and `MetadataV3 — Decisions & Intention.md`.
- `~/Library/Application Support/obsidian/obsidian-1.14.4.asar`, Obsidian's bundled code.
- `~/The Studio/Projects/Sapphire/.claude/` (`SapphirePRD.md`, `Features/PropertiesSPH.md`, `Features/CoreSPH.md`, `HandoffSPH.md`, `Guidelines/Native-Integration-Seams.md`).
- `~/NexusOS/.nexus/properties.json` and NexusOS frontmatter, read-only; `~/Test/.nexus/properties.json`.
