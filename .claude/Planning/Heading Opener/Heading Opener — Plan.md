## Heading Opener — Implementation Plan

**DATE:** 10-16-2026
**STATUS:** Ratified 10-16-2026
**SOURCE:** The 10-16-2026 planning conversation: the `§`-as-opener mandate, its HEAD probe, four scouts' reports, and the owner's rulings — a part edit keeps the author's opener; shown text spelling the target with `§` repeats it as `#` does; a wikilink title refuses `§` while a heading may hold it; the sibling odd-ones-out are folded in wherever the core principles call for them.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `8606e26e8` | 8049 passed, 2 skipped | 10-16-2026 07:13 PM | |

### Context

Pommora's links come in two syntaxes, wikilinks `[[Title#Heading|Alias]]` and markdown links `[Label](Title#Heading)`. One grammar in `Core/Connections/connections.ts` and `links.ts` yields one `LinkOccurrence` per link, with `title`, `heading`, and `shown` spans, and every reader downstream (the resolver, the index, the rename rewriter, the tokens, the decorations, the resting cell, Text and Link values, sort and filter, Paste As, the picker, the Trash sweep, Tiles) reads that occurrence. Only `#` opens a link's heading today, so a `§` that reaches a target by paste, by hand, or from another tool reads as part of a page title that can never exist, since a page title refuses `§` at creation and rename (`Core/Paths/names.ts:28`): `[[Notes§Setup]]` and `[x](Notes§Setup)` are phantoms to a page named `Notes§Setup`, and `[[§Setup]]` to one named `§Setup`. Separately, a bare `§Heading` in prose is a section run under In-Page Heading Resolution set to Automatic, read by `sectionRunsIn` (`Core/Connections/scan.ts:30`), which skips any `§` inside a link.

The scouts confirmed every reading surface goes through the occurrence, Desktop and Sync included, so a grammar change reaches them all, and found six places where the rest of the system disagrees with itself around the opener; each is one task below. A page named outside Pommora with `§` in its title (Obsidian allows it) is still admitted, and a link to it written as `[[A§B]]` now reads as A › B; the ruling accepts that, and every writer spells such a title in the markdown form.

### Overview

`§` becomes the second heading opener in the grammar itself: the wikilink pattern's page half stops at `#` or `§` and its heading opens after either, `markdownSpans` splits a destination at its first `#` or `§`, and one `OPENER` pattern beside the wikilink pattern serves every other rule that asks about the opener. The first opener wins, so `[[A#B§C]]` names heading `B§C`, and an address keeps its `§` because `namesPage` already refuses a page half carrying a scheme or a separator. The writer keeps writing `#`, the `§` → `#` typing transform stays, and a part edit (a rename, a heading pick) changes only its part, so an author's `§` opener stays as written; `#` is the canonical spelling every writer emits, and `§` is what the grammar tolerates on arrival.

Every rule that answers a question about the opener then reads it from the grammar: the title spelling rule refuses both openers while the heading rule keeps refusing `#` alone (Obsidian's nested path), so a File reference, a wikilink like any other, can't name a file holding `§` any more than one holding `#`; `repeatsTarget` accepts the target spelled with either opener, and `carry` keeps the author's opener; the `§` transform fires wherever the `§` would open the heading; the prose `§` arm stands down wherever a link holds the caret or where `##` would stay `##`, through one predicate the transforms share; the run reader skips a `§` inside a bare address, as the transforms do; an emptied heading is tidied in both syntaxes wherever a title remains to keep the link a link; and the asset writer refuses a name no link can spell, as adoption does.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `OPENER` • Const | What opens a link's heading, `/[#§]/`, beside the wikilink pattern that spells the same pair; read by the markdown split, the title spelling rule, `openerOf`, and `nameError`. | `Core/Connections/connections.ts` |
| `openerOf` • Function | The opener at which shown text repeats a title and heading; read by `repeatsTarget` and `carry`. | `Core/Connections/connections.ts` |
| `UNSPELLABLE` • Const | Adoption's refusal of a file name no link can spell, shared with the asset writer. | `Core/Assets/assetWrite.ts` |
| `spells` • Function | The slot tail every title and heading shares (the cap, no pipe, no closer), which the title rule and `spellsAsWiki`'s heading check each extend. | `Core/Connections/connections.ts` |
| `literalOrBracketAt` • Function | Where a prose construct typed at `c` stays text: a literal spot or an unclosed bracket; `sectionSign`, `bullet`, and the prose `§` arm all ask it. | `Core/MarkdownPM/Input/edits.ts` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `inBracket` export | Stays as `edits.ts`'s private half of `literalOrBracketAt`; `acQuery.ts` and `autocomplete.ts` stop importing it. | `Core/MarkdownPM/Input/edits.ts` |

#### Constraints

- **Gates:** `npm run typecheck && npm run test && npm run lint && npm run build` from the repo root, confirming `✓ built in` on every build and reading each exit code rather than a piped tail.
- **Frozen:** `LinkOccurrence`'s shape, the opener every writer writes (`#`), `encodeLinkTarget` (`encodeURI` already writes `§` as `%C2%A7`), the names `names.ts` refuses and its messages, the `headingHash` binding order in `markdownInput.ts`, and the plan's Rulings in *Connections & Aliases Restructure — Plan.md* *§Constraints*.
- **One Owner:** The opener is a grammar fact. No reader, resolver, cell, or menu gains a `§` branch or normalizes `§` to `#`; every new consumer of the opener reads `OPENER`.
- **Part Edits:** A rename or a heading pick edits only its slot and leaves the opener as written; only a whole-link write goes through `pageLinkText` and comes out `#`.
- **Shared Tree:** Other sessions have uncommitted files (`.claude/Features/MarkdownPM.md`, `.claude/IssuesPM.md`, the Tables files); commit by explicit path with `git commit --only`, never `git stash`, `reset`, `checkout .`, or a blanket `git add`, and bundle the owner's unattributed doc edits only in files this plan touches.
- **Diff Notation:** `~` marks a changed line and `…` inside one stands for text left as it is.
- **Never Drive 9333:** A live drive, if one runs, goes through `.claude/scripts/drive-harness.mjs` on 9373 after reading `Development-Environment.md`.
- **Fix Sweep:** Every consumer of the old reading was swept by the scouts; Phase 1's review re-greps for `'#'` opener assumptions outside the grammar before Phase 2 opens.

#### Process Overview

- [x] **Phase 1** — The Grammar And Its Rules
  - [x] Task 1-1 — `§` opens the heading in both syntaxes
  - [x] Task 1-2 — The title spelling rule refuses both openers
  - [x] Task 1-3 — Shown text repeats a target at either opener
  - [x] Task 1-4 — The asset writer refuses an unspellable name
  - [x] Review Checkpoint
- [ ] **Phase 2** — Input, The Picker, And The Edges
  - [ ] Task 2-1 — The `§` transform fires wherever the `§` would open the heading
  - [ ] Task 2-2 — One predicate for prose constructs, and the arm stands down inside links
  - [ ] Task 2-3 — A run never starts inside a bare address
  - [ ] Task 2-4 — An emptied heading tidies in both syntaxes
  - [ ] Review Checkpoint
- [ ] **Phase 3** — Reconciliation
  - [ ] Task 3-1 — Comments and documents

---

#### Core Principles

- **Always Intended:** Anything within the plan's surface area should be left reading as always-intentional, without any unnecessary odd-ones-out designs, and read cohesively with whatever shape the codebase takes.
- **Look Outward:** Look *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly.
- **Right-Sized:** Anything implemented or designed with the intention of being implemented should have its specifics reflect what's actually necessary, without unnecessary sacrifices or negligence, and without over-engineering or over-complicating things when their maintainability and complexity outweigh the actual purpose.
- **Reflected Everywhere:** Anything changed or implemented should be reflected across the board — nothing that's done this way here while something else works differently elsewhere, unless that's *genuinely* correct.
- **Leave Nothing to Interpretation:** Implementation doesn’t decide — write tasks as close to their result as possible so both plan reviews and execution reference the most accurate version of what's intended to be implemented.
- **Ask First:** Anything assumed gets properly surfaced and clarified before anything is designed around its interpretation. If you're on the fence about different options or approaches, that's your sign to ask.

---

### Phase 1 — The Grammar And Its Rules

**GOAL:** The grammar reads `§` as the heading opener in both syntaxes, and every rule that asks about the opener or a title's spelling reads it from the grammar. Every reading surface inherits the behavior through the occurrence; this phase is the foundation Phase 2's input paths stand on.

#### Task 1-1

**TASK:** Teach the wikilink pattern and the markdown split the second opener, with `OPENER` beside the pattern for every other rule to read.

**NOW:** `pageLinkPattern` (`connections.ts:19-21`) excludes only `#` from the page half and opens the heading with `#`; `markdownSpans` (`:89-101`) walks to the first `#`. The heading class already admits `#` and `§`, so the first opener wins once the page half stops at either.

**CHANGE**

- [ ] Write the pins and watch them fail: in `connections.test.ts` *linkOccurrences*, `walk('[[Notes§Setup]]')`, `walk('[x](Notes§Setup)')`, `walk('[[§Setup]]')`, `walk('[](§Setup)')`, `walk('[[Notes§Setup|Mine]]')` read the same spans as their `#` twins; `[[A#B§C]]` and `[[A§B#C]]` split at the first opener; `[a](https://x.io/§Setup)` and `[a](dir/Pa§ge)` keep one undivided title; `[x](Notes%C2%A7Setup)` keeps its title whole. In `linkValue.test.ts` *readLinkText* and *resolveLink*, `[[Notes§Setup]]` reads `{ title: 'Notes', heading: 'Setup' }` and resolves to Notes › Setup, `[](§Setup)` and `[[§Setup]]` resolve to the own page's heading. In `scan.test.ts` *linksIn*, `[[Notes§Setup]]` and `[x](Notes§Setup)` yield `target` `notes`, `qualifier` `setup`. In `rewrite.test.ts`, `rewriteConnections('[[Notes§Setup]] [x](Notes§Setup)', 'Notes', 'Docs')` returns `[[Docs§Setup]] [x](Docs§Setup)` and `rewriteHeadingConnections('[[Notes§Setup]]', 'Notes', 'Setup', 'Start')` returns `[[Notes§Start]]`.
- [ ] Write the surface pins beside them and watch them fail: in `aliasRender.test.tsx` *a heading link reads per the two heading settings*, `[[Alpha§Setup]]` draws as `[[Alpha#Setup]]` does (the `.md-heading-symbol-spaced` join and the `.md-connection-heading` text) and `[x](Alpha§Setup)` draws resolved; in `cellStatic.test.tsx` *a resting cell draws every token as a span*, `[[P§Setup]]` draws the resolved page, the join, and the heading, and `[](P§Setup)` draws `Setup`; in `TextCell.test.tsx`, a Text value `[[#Setup]] and [[§Setup]]` on a page holding Setup draws both as own-page heading links.
- [ ] Add `OPENER`, widen the pattern, and split the markdown destination through `OPENER`.
- [ ] Bump `INDEX_GENERATION` to 16 (`Desktop/Store/ddl.ts:3`), so files unchanged since the change re-index their `§` links and the rename cascades find them.
- [ ] Pin the extension ruling in `linkValue.test.ts` *readLinkText*: `[[File§Text.md]]` and `[[File§Text.png]]` read heading `Text.md` and `Text.png`, and `[x](File.md§Setup)` reads `File` › `Setup`; an extension after the opener is heading text, and a link naming a heading carries its extension on the page half.

**AFTER**

```Core/Connections/connections.ts diff
@@ pageLinkPattern @@

+export const OPENER = /[#§]/
+
~// … The page half stops at the first opener; the heading takes the rest up to the pipe.
 export function pageLinkPattern(): RegExp {
-  return /\[\[(?<page>(?:[^\]\r\n|#]|\](?!\])){0,255})(?:#(?<heading>(?:[^\]\r\n|]|\](?!\])){0,255}))?(?:\|(?<alias>[^\]\r\n]{0,255}))?\]\]/dg
+  return /\[\[(?<page>(?:[^\]\r\n|#§]|\](?!\])){0,255})(?:[#§](?<heading>(?:[^\]\r\n|]|\](?!\])){0,255}))?(?:\|(?<alias>[^\]\r\n]{0,255}))?\]\]/dg
 }

@@ mayNameHeading, mayNameOwnHeading @@

~/** Whether `text` could name a heading: a `#` inside either syntax's destination, or a `§`. */
~/** Whether `text` could name the document's own heading: a bare fragment in either syntax, or a `§`. */

@@ LinkOccurrence @@

~/** … a markdown destination up to a page-naming opener (the whole destination otherwise, trimmed), `heading` what follows that opener, … */

@@ markdownSpans @@

~// The destination splits at its first raw opener only when the half before names a page, … so `%23` stays inside the title.
 function markdownSpans(text: string, [full, label, dest]: [Span, Span, Span]): LinkOccurrence {
   const [from, to] = trimmedRange(text, dest[0], dest[1])
   let hash = from
-  while (hash < to && text[hash] !== '#') hash++
+  while (hash < to && !OPENER.test(text[hash])) hash++
   const splits = hash < to && namesPage(text.slice(from, hash))
```

```Core/Connections/links.ts diff
@@ namesPage @@

~// Only the half before the first opener decides: …
```

```Core/MarkdownPM/Engine/detect.ts diff
@@ webpageEmbedLink @@

~// … an address never splits at an opener, so its title is the whole trimmed destination.
```

**VERIFY**

- [ ] The new pins, the surface pins included, fail before the change and pass after; `scan.test.ts`, `rewrite.test.ts:227-232`, and every existing `connections.test.ts` case stay green.
- [ ] `grep -n "'#'" Core/Connections/connections.ts Core/Connections/links.ts` shows no opener read outside `OPENER`, the pattern, and the writers.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-2

**TASK:** Split the slot spelling rule so a title refuses both openers and a heading keeps refusing `#` alone.

**NOW:** `expressibleInLink` (`connections.ts:132-133`) refuses `|` and `#`, and every caller but one asks it of a title (`names.ts:29`, `pasteAsMenu.ts:46`, `gripMenu.ts:29`, `embedWidget.tsx:397`, `adoptFile.ts:24`, `spellsAsWiki`'s title); `spellsAsWiki` (`:139-142`) also asks it of a heading. Once `§` opens a heading, `pageLinkText({ title: 'A§B' }, 'wiki')` writes `[[A§B]]`, which reads back as `A` › `B`; `linkValueFromEdit('[x](A%C2%A7B)')` round-trips to `[[A§B|x]]`; `fileLinkText` mints `[[foo§bar.png]]`; and `![[Notes§Setup]]` would tile a page literally titled `Notes§Setup`.

**CHANGE**

- [ ] Write the pins in `connections.test.ts` *pageLinkText and the slot rules* and watch them fail: `expressibleInLink('A§B')` is false; `spellsAsWiki({ title: 'A', heading: '§H' })` is true; `pageLinkText({ title: 'A§B' }, 'wiki')` is `[A§B](A%C2%A7B)`; `pageLinkText({ title: 'P', heading: '§Intro' }, 'wiki')` is `[[P#§Intro]]`.
- [ ] Pin the user-facing consequence in `Core/Nexus/mutate.test.ts` *adoptFile — the shared adoption seam*: adopting `Cover§1.png` faults with "That file’s name can’t be written as a link.", as `Cover#1.png` already does.
- [ ] Factor the shared tail into `spells` and state each slot's refusal; `names.ts:28` reads the openers from `OPENER` rather than spelling `#§` again.

**AFTER**

```Core/Connections/connections.ts diff
@@ expressibleInLink, spellsAsWiki @@

-/** What the title or heading slot can spell: `|` and `#` would open the next slot, and `]]` or a trailing `]` would close the link. */
-export const expressibleInLink = (text: string): boolean =>
-  fitsSlot(text) && !/[|#]/.test(text) && !text.includes(']]') && !text.endsWith(']')
+const spells = (text: string): boolean =>
+  fitsSlot(text) && !text.includes('|') && !text.includes(']]') && !text.endsWith(']')
+
+/** What the title slot can spell: `|` or an opener would open the next slot, and `]]` or a trailing `]` would close the link. */
+export const expressibleInLink = (title: string): boolean => spells(title) && !OPENER.test(title)

 /** Whether a wikilink can spell every slot of a page link; every writer falls back to the markdown form otherwise. */
 export const spellsAsWiki = (t: PageName & { shown?: string }): boolean =>
   expressibleInLink(t.title) &&
-  (t.heading === undefined || expressibleInLink(t.heading)) &&
+  (t.heading === undefined || (spells(t.heading) && !t.heading.includes('#'))) &&
   (t.shown === undefined || aliasSpells(t.shown))
```

```Core/Paths/names.ts diff
@@ imports @@

-import { expressibleInLink } from '../Connections/connections'
+import { expressibleInLink, OPENER } from '../Connections/connections'

@@ nameError @@

-  if (/[|#§]/.test(name)) return `"${name}" can't contain "|", "#", or "§".`
+  if (name.includes('|') || OPENER.test(name)) return `"${name}" can't contain "|", "#", or "§".`
```

**VERIFY**

- [ ] The five pins fail before and pass after; `rewrite.test.ts:227-232` still writes `[[P#§Start]]`.
- [ ] `names.test.ts`, `adoptFile`'s tests, `pasteAsMenu`'s and `gripMenu`'s tests stay green.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-3

**TASK:** `repeatsTarget` accepts the target spelled at either opener, and `carry` keeps the opener the shown text spelled it with when shown text names both parts.

**NOW:** `repeatsTarget` (`connections.ts:145-146`) compares shown text to `` `${title}#${heading}` ``, so `[[Notes#Setup|Notes§Setup]]` keeps a stale alias through a heading rename that `|Notes#Setup` follows and drops. `carry` (`rewrite.ts:31-42`) writes `` `${to.title}#${to.heading}` `` for shown text that named both.

**CHANGE**

- [ ] Write the pins and watch them fail: in `connections.test.ts` *repeatsTarget and namesTarget*, `repeatsTarget('Notes§Setup', 'Notes', 'Setup')`, `repeatsTarget('§Setup', '', 'Setup')`, and `namesTarget('Notes§Setup', { title: 'Notes', heading: 'Setup' }) === 'both'` are true, while `repeatsTarget('Notes § Setup', 'Notes', 'Setup')` stays false, as `'Notes # Setup'` is today. In `rewrite.test.ts` *rewriteHeadingConnections*, `[[Notes#Setup|Notes§Setup]]` renamed Setup → Start becomes `[[Notes#Start]]`, and `[Notes§Setup](Notes#Setup)` becomes `[Notes§Start](Notes#Start)`.
- [ ] Pin a title holding an opener: `repeatsTarget('A§B#H', 'A§B', 'H')` and `repeatsTarget('C# Notes§H', 'C# Notes', 'H')` are true, and `rewriteConnections('[A§B#H](A%C2%A7B#H)', 'A§B', 'C')` carries the label to `[C#H](C#H)`, as it did at baseline.
- [ ] Add `openerOf`, the opener at which shown text repeats `title` › `heading`, and have `repeatsTarget` and `carry`'s `'both'` arm read it.

**AFTER**

```Core/Connections/connections.ts diff
@@ repeatsTarget @@

+/** The opener shown text spells `title` › `heading` with, where it only repeats that target. */
+export const openerOf = (shown: string, title: string, heading: string): string | undefined =>
+  ['#', '§'].find((o) => normalizeTitle(shown) === normalizeTitle(title + o + heading))
+
~/** Whether shown text only repeats a target, `title` or `title` and `heading` at either opener, so the link draws the same without it: the one drop rule. */
 export const repeatsTarget = (shown: string, title: string, heading?: string): boolean =>
-  normalizeTitle(shown) === normalizeTitle(heading === undefined ? title : `${title}#${heading}`)
+  heading === undefined
+    ? normalizeTitle(shown) === normalizeTitle(title)
+    : openerOf(shown, title, heading) !== undefined
```

```Core/Connections/rewrite.ts diff
@@ imports @@

 import {
   mayNameHeading,
   namesTarget,
+  openerOf,
   type PageName,

@@ carry @@

     case 'both':
-      return `${to.title}#${to.heading}`
+      return to.title + openerOf(shown, from.title, from.heading!)! + to.heading
```

**VERIFY**

- [ ] The pins fail before and pass after; every existing `repeatsTarget`, `namesTarget`, `keepsAlias`, `shownAlias`, and `rewrite.test.ts` case stays green.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-4

**TASK:** The asset writer refuses a file name no link can spell through the same refusal adoption gives, so the migration can't mint a File value that reads back wrong.

**NOW:** `writeAssetFile` (`assetWrite.ts:10-34`) returns `fileLinkText(file)` for any name; `adoptFile.ts:24-25` gates its own entry with an inline `fault('That file’s name can’t be written as a link.')` (it has to keep a gate, since `:52` and `:63` return `fileLinkText(base)` without writing), but `assetMigrate.ts:195-198` calls `writeAssetFile` with a legacy file's name ungated, so `foo§bar.png` (and today `foo#bar.png`, `a|b.png`) becomes a File value `wikiTitle` misreads. `assetMigrate` already records a failed write as skipped with its message.

**CHANGE**

- [ ] Write the pin in `assetWrite.test.ts` and watch it fail: `writeAssetFile(root, assetDir, 'foo§bar.png', bytes)` returns `UNSPELLABLE` and writes nothing.
- [ ] Hoist adoption's refusal into `UNSPELLABLE` beside the writer, as `NOT_A_PROPERTY_DIR` and `NO_NEXUS` are shared refusals, and gate the name before the reserved-leaf check.

**AFTER**

```Core/Assets/assetWrite.ts diff
@@ writeAssetFile @@

 import { basename, extname, join, relative } from '../Paths/posix'
 import { machine } from '../Platform/machine'
-import { fileLinkText } from '../Connections/connections'
-import { ok, fail, type Result } from '../Contract/result'
+import { expressibleInLink, fileLinkText } from '../Connections/connections'
+import { fault, ok, fail, type Result } from '../Contract/result'
 ...
+export const UNSPELLABLE = fault('That file’s name can’t be written as a link.')
+
 export async function writeAssetFile(
@@
+  if (!expressibleInLink(base)) return UNSPELLABLE
   const dir = assetsDir(root, assetDir)
   if (reservedAssetLeaf(relative(root, join(dir, base))))
```

```Core/Assets/adoptFile.ts diff
@@ adoptFile @@

-import { writeAssetFile } from './assetWrite'
+import { UNSPELLABLE, writeAssetFile } from './assetWrite'
@@
   if (!base || !expressibleInLink(base) || neverWatched([base]))
-    return fault('That file’s name can’t be written as a link.')
+    return UNSPELLABLE
```

**VERIFY**

- [ ] The pin fails before and passes after; `assetMigrate.test.ts` and `adoptFile`'s tests stay green.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] `grep -rn "'#'\|\"#\"\|split('#')\|indexOf('#')" Core --include='*.ts' --include='*.tsx'` outside tests finds no target-opener read beyond the grammar and its writers.
- [ ] A simplification reviewer and a correctness reviewer (`opus-medium`, `opus-high`) read Phase 1 against *§Constraints* and the rulings; every holding finding is fixed before Phase 2.

---

### Phase 2 — Input, The Picker, And The Edges

**GOAL:** Every input path and edge agrees with the grammar Phase 1 lands; each task closes one odd-one-out named in *§Context*.

#### Task 2-1

**TASK:** `headingHash` fires wherever the typed `§` would become the link's opener: in a title, whatever the selection, and in a markdown destination whose half before the caret names a page.

**NOW:** `headingHash` (`edits.ts:459-473`) refuses a selection reaching past the title (`selEnd - ls > o.title[1]`) and asks `namesPage` of the whole destination. So `[[Alpha]] x` with 2..10 selected leaves `[[§`, and `[a](Page/x)` with the caret after `Page` leaves `[a](Page§/x)`; under the new grammar both `§`s open a heading, so the file loses its canonical `#`.

**CHANGE**

- [ ] Write the pins in `edits.test.ts` and watch them fail: `headingHash(scanDoc('[a](Page/x)'), 8, 8, '§')` writes `#`. Rewrite `:791` and `:818-819` to expect `{ insert: '#' }` for `[[Alpha]] x` 2..10 and `[a](Page) x` 5..11, under titles that say a `§` replacing a selection from inside the title opens the heading.
- [ ] Drop the selection gate and ask `namesPage` of the half before the caret.

**AFTER**

```Core/MarkdownPM/Input/edits.ts diff
@@ headingHash @@

~/** The one transform that fires wherever a typed `§` would open a link's heading: … */
 export function headingHash(
@@
   const o = linkAt(scan, selStart) ?? openLinkAt(scan, selStart)
-  if (!o || partOf(o, selStart - ls) !== 'title' || selEnd - ls > o.title[1]) return null
-  if (o.syntax === 'markdown' && !namesPage(scan.lines[li].slice(o.title[0], o.title[1])))
+  if (!o || partOf(o, selStart - ls) !== 'title') return null
+  if (o.syntax === 'markdown' && !namesPage(scan.lines[li].slice(o.title[0], selStart - ls)))
     return null
```

**VERIFY**

- [ ] The pins fail before and pass after; `edits.test.ts:733-822`'s other cases stay green, `[a](dir/Page)` and `[a](https://x.com)` among them.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-2

**TASK:** One predicate decides where a prose construct stays text, shared by `sectionSign`, `bullet`, and the prose `§` arm, and the picker reads a link holding the caret before it considers the arm.

**NOW:** `sectionSign` (`edits.ts:740`) and `bullet` (`:756`) ask `isLiteralAt(scan, c) || inBracket(doc, c)`. The arm asks only `inBracket`, twice (`acQuery.ts:46`, `autocomplete.ts:65`), which misses a markdown destination, and `autocompleteQuery` takes the armed branch before reading the link. Probes at HEAD under Automatic: `[x](Notes#Set` + `§` and `[a](https://x.io/` + `§` give a prose query that writes the page's own heading into the destination; `[x](Notes#Set§)` with the caret moved past `)` keeps the arm and queries `) Intro`; `§Set [[A` queries prose `Set [[A` instead of the wikilink's title.

**CHANGE**

- [ ] Write the pins in `autocomplete.test.ts` beside `:594-600` and watch them fail: `autocompleteQuery('[x](Notes#Set§', 14, 13)` is `{ syntax: 'markdown', part: 'heading' }`; `autocompleteQuery('[a](https://x.io/§', 18, 17)?.syntax` is not `'prose'`; `autocompleteQuery('[x](Notes#Set§) Intro', 21, 13)` is null; `autocompleteQuery('§Set [[A', 8, 0)` is `{ syntax: 'wiki', part: 'title', query: 'A' }`. Pin `` autocompleteQuery('`x`§Set', 7, 3) `` and `autocompleteQuery('[[A]]§Set', 9, 5)` as prose queries `Set`, which arm at HEAD and must keep arming; the pinned armed cases (`autocomplete.test.ts:569-600`) stay green.
- [ ] Add `literalOrBracketAt`, route `sectionSign` and `bullet` through it, make `inBracket` private, reorder `autocompleteQuery` link-first with the arm asking `literalOrBracketAt(scan, armed + 1)`, and reduce `armedBy` to detecting a lone typed `§`.

**AFTER**

```Core/MarkdownPM/Input/edits.ts diff
@@ isLiteralAt, inBracket @@

 // Inside a link's slots or a link still being written; a transform typed just past `]]` is prose.
 const isLiteralAt = (scan: DocScan, c: number): boolean =>
@@
 // An unclosed `[` holds a citation's label or a link's text: a glyph written there lands inside the reference.
-export const inBracket = (doc: string, c: number): boolean => {
+const inBracket = (doc: string, c: number): boolean => {
@@
+export const literalOrBracketAt = (scan: DocScan, c: number): boolean =>
+  isLiteralAt(scan, c) || inBracket(scan.text, c)

@@ sectionSign @@

-  if (opensLine(doc, c - 1) || isLiteralAt(scan, c) || inBracket(doc, c)) return null
+  if (opensLine(doc, c - 1) || literalOrBracketAt(scan, c)) return null

@@ bullet @@

-  if (isLiteralAt(scan, c) || inBracket(doc, c) || !/\S/.test(lineBodyBefore(doc, c - 2)))
+  if (literalOrBracketAt(scan, c) || !/\S/.test(lineBodyBefore(doc, c - 2)))
```

```Core/MarkdownPM/Autocomplete/autocomplete.ts diff
@@ imports @@

-import { inBracket, linkAt, openLinkAt, partOf } from '../Input/edits'
+import { linkAt, literalOrBracketAt, openLinkAt, partOf } from '../Input/edits'

@@ autocompleteQuery @@

   const rel = caret - lineStart
+  const closedLink = linkAt(scan, caret)
+  const o = closedLink ?? openLinkAt(scan, caret)
+  const part = o && partOf(o, rel)
-  if (armed !== undefined) {
+  if (armed !== undefined && !part) {
     const armedRel = armed - lineStart
     if (
       armedRel >= 0 &&
       armedRel < line.length &&
       caret >= armed + 1 &&
-      !inBracket(line, armedRel) &&
+      !literalOrBracketAt(scan, armed + 1) &&
       !/^\s/.test(line.slice(armedRel + 1, rel))
     )
       return {
@@
   }
-  const closedLink = linkAt(scan, caret)
-  const o = closedLink ?? openLinkAt(scan, caret)
-  const part = o && partOf(o, rel)
   if (!o || !part) return null
```

```Core/MarkdownPM/Autocomplete/acQuery.ts diff
@@ imports @@

 import { docScan } from '../docCache'
-import { inCodeAt } from '../Engine/docScan'
-import { inBracket } from '../Input/edits'
 import { editorHost, inRawHtml } from '../api'

@@ armedBy @@

   tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
     seen++
     if (toB - fromB === 1 && tr.newDoc.sliceString(fromB, toB) === '§') at = fromB
   })
-  if (seen !== 1 || at === null) return null
-  const line = tr.newDoc.lineAt(at)
-  return inBracket(line.text, at - line.from) || inCodeAt(docScan(tr.newDoc), at) ? null : at
+  return seen === 1 ? at : null
 }
```

**VERIFY**

- [ ] The four pins fail before and pass after; `acQuery.test.ts`'s *the § arm* cases and every `sectionSign` and `bullet` case in `edits.test.ts` stay green.
- [ ] `grep -rn "inBracket" Core --include='*.ts' --include='*.tsx'` finds it only inside `edits.ts`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-3

**TASK:** A `§` inside a bare address never starts a run, the rule the typing transforms and now the arm already follow, sharing the one address-run test.

**NOW:** `inUrlRun` lives privately in `edits.ts:684-686`; `sectionRunsIn` (`scan.ts:44-49`) skips code, heading lines, and links but not a bare address, so `see https://x.io/§Setup` draws `§Setup` as a run inside the address while Task 2-2's arm and `##` stay text there. `scan.ts` runs on the host, so the shared test lives in `Core/MarkdownPM/Engine/markdownCode.ts`, the pure text module both files already import.

**CHANGE**

- [ ] Write the pin in `scan.test.ts` *sectionRunsIn* and watch it fail: `sectionRunsIn('see https://x.io/§Setup and §Setup', ['Setup'], codeMask(''))` yields one run, the second.
- [ ] Move `urlRunRe` and `inUrlRun` to `markdownCode.ts` beside `lineStartAt`, export `inUrlRun`, import it in `edits.ts` and `scan.ts`, and skip it in `sectionRunsIn`.

**AFTER**

```Core/MarkdownPM/Engine/markdownCode.ts diff
@@ after lineEndAt @@

+// A URL-shaped run is link content: converting `--` → `—` would corrupt the path.
+const urlRunRe = /(?:^|[\s([{<"'])[a-z][a-z0-9+.-]*:\/\/\S*$/i
+export const inUrlRun = (doc: string, c: number): boolean =>
+  urlRunRe.test(doc.slice(lineStartAt(doc, c), c))
```

```Core/MarkdownPM/Input/edits.ts diff
@@ isLiteralAt @@

-// A URL-shaped run is link content: converting `--` → `—` would corrupt the path.
-const urlRunRe = /(?:^|[\s([{<"'])[a-z][a-z0-9+.-]*:\/\/\S*$/i
-const inUrlRun = (doc: string, c: number): boolean =>
-  urlRunRe.test(doc.slice(lineStartAt(doc, c), c))
```

```Core/MarkdownPM/Input/edits.ts diff
@@ imports from '../Engine/markdownCode' @@

+  inUrlRun,
```

```Core/Connections/scan.ts diff
@@ imports @@

 import {
   codeMask,
   type CodeMask,
+  inUrlRun,
   lineEndAt,
   lineStartAt,

@@ sectionRunsIn @@

~// … Runs inside code, a link, a bare address, or a heading line (whose `§` is the heading's own text) are never runs.
@@
-    if (inCode(i) || onHeading(i) || (link < links.length && links[link][0] <= i)) continue
+    const inLink = link < links.length && links[link][0] <= i
+    if (inLink || inCode(i) || onHeading(i) || inUrlRun(text, i)) continue
```

**VERIFY**

- [ ] The pin fails before and passes after; every `sectionRunsIn`, `linksIn`, cell-run, and `edits.test.ts` transform case stays green.
- [ ] `engineGraph.test.ts` and `hostGraph.test.ts` stay green.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-4

**TASK:** An emptied heading tidies in both syntaxes when the caret leaves the link, as the Rulings say both syntaxes tidy an emptied part, wherever a title remains so the link stays a link.

**NOW:** `emptied` (`linkSettle.ts:106-127`) drops an empty heading's opener only in a wikilink; a markdown `[a](Page#)` left by the caret keeps its `#`. The opener is one character wide whichever it is (`heading[0] - 1`). Dropping the opener of a bare fragment leaves no target: `[[#]]` becomes `[[]]` today, and `[x](#)` would become `[x]()`, which `LINK_DEST` (`links.ts:6`) refuses, turning the author's label into bracketed text.

**CHANGE**

- [ ] Write the pins in `linkSettle.test.ts` beside *an emptied markdown label shows its target* and watch them fail: `[a](Page#)` left becomes `[a](Page)`; `[](Page#)` left becomes `[Page](Page)`; `[a](Page§)` left becomes `[a](Page)`; `[[Page§]]` left becomes `[[Page]]`; `a [x](#H) b` with `H` deleted and left stays `a [x](#) b`, and `[[#]]` left stays `[[#]]`.
- [ ] Hoist the heading tidy out of the wikilink arm and make it ask that a title remains.

**AFTER**

```Core/MarkdownPM/Links/linkSettle.ts diff
@@ emptied @@

~/** Every empty part of the link at `start`: an empty alias takes its pipe and an empty heading after a title its opener, … */
 function emptied(state: EditorState, start: number): ChangeSpec[] {
   const hit = linkStartingAt(state, start)
   if (!hit) return []
   const { line, o } = hit
   const empty = (s: Span | null): s is Span => s !== null && s[0] === s[1]
+  const heading =
+    empty(o.heading) && !empty(o.title)
+      ? [{ from: line.from + o.heading[0] - 1, to: line.from + o.heading[1] }]
+      : []
   if (o.syntax === 'wiki')
     return [
-      ...(empty(o.heading)
-        ? [{ from: line.from + o.heading[0] - 1, to: line.from + o.heading[1] }]
-        : []),
+      ...heading,
       ...(empty(o.shown)
         ? [{ from: line.from + targetSpan(o)[1], to: line.from + o.shown[1] }]
         : []),
     ]
-  if (!empty(o.shown)) return []
+  if (!empty(o.shown)) return heading
   const written = readOccurrence(line.text, o)
   const index = state.facet(editorHost).connections()?.index
   const label = pageLabel(written, resolveLink(written, index))
   return label && fitsSlot(label)
-    ? [{ from: line.from + o.shown[0], insert: escapeLabel(label) }]
-    : []
+    ? [...heading, { from: line.from + o.shown[0], insert: escapeLabel(label) }]
+    : heading
 }
```

**VERIFY**

- [ ] The pins fail before and pass after; every `linkSettle.test.ts` case stays green.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Every input surface (body, table cell, Text pane, the one-line fields) binds the same `typedInput` and `acQuery`, so the Phase 2 pins speak for all of them; a reviewer confirms nothing binds a second path.
- [ ] A simplification reviewer and a correctness reviewer (`opus-medium`, `opus-high`) read Phase 2 against *§Constraints* and the rulings; every holding finding is fixed before Phase 3.

---

### Phase 3 — Reconciliation

**GOAL:** Every comment and document the plan makes false reads true. This phase is separate because it writes no behavior, only record.

#### Task 3-1

**TASK:** Reconcile every comment and document the plan makes false, surgically, per *§Reconciliation*.

**NOW:** *§Reconciliation* lists each claim.

**CHANGE**

- [ ] Rewrite each entry in place; add no new sections.
- [ ] `ConnectionsPM.md:10` reads: "…`[[#Heading]]` names a heading on the page it sits in; the fragment after the first `#` or `§` is the heading's own text. … A title can't contain `|`, `#`, or `§`, and the name rule rejects them at creation; every writer spells the opener `#`, and a `§` typed where a title is being written becomes `#`, while a `§` that arrives some other way reads as the same opener."
- [ ] `ConnectionsPM.md:11` reads: "…carry the same fragments the wikilink does, opened by the first `#` or `§`; a `§` typed in the target before its fragment becomes `#` the same way."
- [ ] `ConnectionsPM.md:60` reads "A heading accepted after the opener, …".

**VERIFY**

- [ ] `grep -rn "first \`#\`\|only ever holds" .claude/Features .claude/Guidelines Core --include='*.md' --include='*.ts'` finds nothing stale.
- [ ] Run the gates.

---

### Completion Criteria

- **Conformance:** The opener lives in the grammar alone; no reader, cell, or menu gained a `§` branch; nothing changed outside what the plan named.
- **Correctness:** `[[Notes§Setup]]`, `[x](Notes§Setup)`, `[[§Setup]]`, and `[](§Setup)` read, resolve, index, draw, click, rename, sort, and filter exactly as their `#` twins on every surface; addresses, labels, and aliases keep their `§` as text; the prose arm never opens inside a link or an address.
- **Completeness:** Every task landed and is ticked; no scaffolding, probe file, or debug output remains.
- **Confirmation:** Every new pin was watched red, then green.
- **Continuity:** *§Reconciliation* is walked and the Feature documents read true.
- **Confidence:** Gates green from a clean state over `$BASE..HEAD`; the delta is near the estimate below, reported as `<net> (+added / −removed)` with tests and comments excluded.

**ESTIMATE:** About +10, tests and comments excluded: the grammar 0, `OPENER` +1, the spelling split +1, `openerOf` and `repeatsTarget` +2, `carry` +1 (its import), `UNSPELLABLE` and the asset gate +3, the transform gates 0, `literalOrBracketAt` +2, the link-first picker 0, `armedBy` and its imports −4, the address run +3 (the skip, its line, and its imports), the heading tidy +2. The `§` change alone is about +2; the rest is the sibling fixes, each closing an odd-one-out.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [ ] Phase review (`opus-medium` simplification, `opus-high` correctness): Phase 1 · Phase 2 · Phase 3
- [ ] Simplification lens → adversarial lens (`opus-high`) over `$BASE..HEAD`
- [ ] Neutral verification (`opus-high`) over `$BASE..HEAD`
- [ ] Own pass: gates · diff · deviations · criteria
- [ ] Reconciliation walked
- [ ] Report delivered

#### Reconciliation

- `Core/Connections/connections.ts:18` — "The page half stops at the first `#`" — Task 1-1
- `Core/Connections/connections.ts:26, :29` — "a `#` … or a `§` run" — Task 1-1
- `Core/Connections/connections.ts:34` — "up to a page-naming `#` … what follows that `#`" — Task 1-1
- `Core/Connections/connections.ts:88` — "splits at its first raw `#`" — Task 1-1
- `Core/Connections/connections.ts:131` — "`|` and `#` would open the next slot" — Task 1-2
- `Core/Connections/links.ts:37` — "the half before the first `#`" — Task 1-1
- `Core/MarkdownPM/Input/edits.ts:458` — "fires only where a link names its page" — Task 2-1
- `Core/Connections/scan.ts:29` — the runs that are never runs — Task 2-3
- `Core/MarkdownPM/Links/linkSettle.ts:105` — "an empty heading its hash" — Task 2-4
- `Core/MarkdownPM/Engine/detect.ts:429` — "an address never splits at `#`" — Task 1-1
- `Core/MarkdownPM/Input/edits.test.ts:791, :818-819` — a selection reaching past the title stays `§` — Task 2-1
- `.claude/Features/ConnectionsPM.md:10` — "the fragment after the `#`", "so the file only ever holds `#`" — Task 3-1
- `.claude/Features/ConnectionsPM.md:11` — the markdown fragment's opener — Task 3-1
- `.claude/Features/ConnectionsPM.md:60` — "A heading accepted after the `#`" — Task 3-1

#### Open Items

- A `§` typed into a markdown destination's surrounding whitespace (`[a]( Page)` with the caret before `Page`) sits in no slot, so it stays `§`; it still reads as the opener, so only the file's spelling differs. Left as is: the grammar trims that whitespace, and covering it would make `headingHash` re-derive the raw destination.

#### Deviations

- **Phase 1 — `openerOf`:** the plan's first shape took the first opener in the shown text, which misread a title holding an opener (`A§B#H` against `A§B` › `H`, true at baseline); `openerOf` now tests both spellings against the title and heading. Both reviewers found it.
- **Phase 1 — `INDEX_GENERATION`:** bumped to 16, which the plan missed; the project bumps it whenever a reader change alters how unchanged files index.
- **Phase 1 — Red-before:** five pins were already green at HEAD and stand as guards: the address and encoded `§` case, `[[A#B§C]]`, `spellsAsWiki({ title: 'A', heading: '§H' })`, `[[P#§Intro]]`, and the `Cover#1.png` adoption case.
- **Phase 1 — File values:** a File value adopted before this change with `§` in its name (`[[Cover§1.png]]`) now reads as `Cover` › `1.png`, as `#` would; the owner ruled file references read like any wikilink. No such value exists in the owner's Nexuses.
- **Phase 1 — Extensions:** the owner ruled that an extension after the opener is heading text (`[[File§Text.md]]` is `File` › `Text.md`) and a link naming a heading carries its extension on the page half (`[[File.md§Heading]]`); relayed to the Path Links session for its `.md` reading.
