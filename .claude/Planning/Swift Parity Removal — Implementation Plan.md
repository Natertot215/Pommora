## Swift Parity Removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every helper, translator, seed, fallback, legacy field, and comment that exists to keep Pommora's on-disk files compatible with the dead, archived Swift build — leaving no evidence it ever existed.

**Architecture:** Pure removal against a verified inventory (≈107 code lines, ≈143 comment lines, ~160 test lines across twelve source files). Each task deletes one compat cluster with its consumer trail, trues the tests that pinned it, and lands green. Where a legacy value is live on real disks (`accent_color`, `gray`, `tablecells`), the two real nexuses are hand-swept first in the same task, so no fallback code is ever needed.

**Tech Stack:** Electron main (Node fs) + React renderer, TypeScript, zod, Vitest. Repo root for all commands: `Pommora/`.

#### Global Constraints

- Gates after every task, exit codes read directly (never piped): `npm run typecheck` · `npx biome lint src` · `npx vitest run`. All must be 0.
- A PostToolUse hook runs Biome on every write — never hand-format or run Biome; an Edit failing on whitespace means re-read and retry.
- Stage explicit paths only (parallel sessions share the tree); commit style: lowercase `type(scope): descriptive sentence`, ending `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- The two real nexuses are `~/NexusOS` and `~/test`. Hand-edits to them are part of the named task, done with a one-off command, never with shipped migration code.
- Rewritten comments state the durable truth in native voice — no supersedes framing, no "was Swift's" phrasing, no reference to this plan.
- **Do not touch:** the `adopted-` id machinery (`ids.ts`, `adopt.ts`, `reorder.ts`'s `persistable`); general hand-edit validation (files are a public interface); the on-disk snake_case key names; anything under `.nexus/pins/`, `navState.ts`, `pinsState.ts`, or `RecentEntry.pinned` (those die in the Navigation Consolidation plan, as whole modules).

---

### Task 1: settings.ts Sheds the Swift Seed

**Files:**
- Modify: `src/main/settings.ts` (delete lines 1–4 header claims, 20–23 `SWIFT_DEFAULTS_VERSION`, 25–36 `labelsToDisk`, 38–50 `defaultSettingsSeed`, 52–78 `ensureSettings`; the three `await ensureSettings(root)` pre-calls at 122, 138, 151; comments at 120, 136)
- Modify: `src/main/index.ts:455` (the `ensureSettings` open-time call and its rationale comment at 448–449; the `ensureSettings` import)
- Modify: `src/main/mutate.ts:268–269` (the "so Swift's version/defaults_version/labels/modified_at survive" comment — restate as plain foreign-key preservation)
- Test: `src/main/settings.test.ts`

**Interfaces:**
- Consumes: `rmwJsonStrict(path, mutate, seedOnAbsent?)` from `io/atomicWrite.ts` — the third parameter is optional.
- Produces: `updateSettings(root, patch)` unchanged in signature, now seeding `() => ({})` on an absent file. No other module may reference `ensureSettings`, `defaultSettingsSeed`, `labelsToDisk`, or `SWIFT_DEFAULTS_VERSION` after this task.

- [ ] **Step 1: True the tests first.** In `settings.test.ts`, delete `assertFullSettings` (lines 24–44, including the no-milliseconds `modified_at` regex) and the whole `describe('ensureSettings')` block (46–67). Add the one new contract in their place:

```ts
it('a write to a missing settings.json creates it holding only the patch', async () => {
  const written = await updateSettings(root, (cur) => ({ ...cur, time_format: 'twentyFourHour' }))
  expect(written.ok).toBe(true)
  const onDisk = JSON.parse(await readFile(join(root, '.nexus', 'settings.json'), 'utf8'))
  expect(onDisk).toEqual({ time_format: 'twentyFourHour' })
})
```

- [ ] **Step 2: Run `npx vitest run src/main/settings.test.ts` — expect FAIL** (the new test sees the full Swift seed on disk, not the bare patch).
- [ ] **Step 3: Delete the machinery.** Remove the items listed under Files. In `updateSettings`, replace the `defaultSettingsSeed` seed argument with `() => ({})`. Rewrite the module header to the surviving truth: per-nexus settings live in `.nexus/settings.json`; reads tolerate absence; writes create on demand and preserve foreign keys.
- [ ] **Step 4: Run `npx vitest run src/main/settings.test.ts` — expect PASS**, then full gates (`npm run typecheck` → 0, `npx biome lint src` → 0, `npx vitest run` → all pass; fix any test elsewhere that pinned the seed, updating it to the new contract, never re-adding the seed).
- [ ] **Step 5: Commit** `refactor(settings): the file serves its own reader now` with the explicitly staged files.

---

### Task 2: identity.ts Sheds the Date Shim and the Unread Fields

**Files:**
- Modify: `src/main/identity.ts` (delete `swiftISODate` (12–18) and use `nowIso` from `crud/util.ts` at its mint site; delete `NEXUS_SCHEMA_VERSION` (20–21) and the `schemaVersion` field from `defaultIdentity`; delete the backfill block (44–48) so a present file with an id returns as-is and a present file without one mints an id preserving foreign keys; rewrite the header (1–4) and doc comments (23–24, 29–32) in native voice — the file exists so sidecar mode has an identity, `createdAt` is the nexus's birth date)
- Test: `src/main/identity.test.ts`

**Interfaces:**
- Consumes: `nowIso()` from `src/main/crud/util.ts:29`.
- Produces: `defaultIdentity(): { id: string; createdAt: string }` — `schemaVersion` no longer exists anywhere; `ensureIdentity(root)` signature unchanged.

- [ ] **Step 1: True the tests.** In `identity.test.ts`, delete the Swift-shape creation assertions and the `schemaVersion`/`createdAt` backfill cases (26–46, including the no-milliseconds regexes). Replace with: a fresh mint writes `{ id, createdAt }`; an existing file with an id is returned untouched byte-for-byte; an id-less file gains an id while keeping its foreign keys.
- [ ] **Step 2: Run `npx vitest run src/main/identity.test.ts` — expect FAIL** (the backfill still stamps `schemaVersion`).
- [ ] **Step 3: Implement the deletions** listed under Files.
- [ ] **Step 4: Hand-clean the real disks** — remove the dead version keys from both identity files:

```bash
python3 - <<'EOF'
import json
for p in ['/Users/nathantaichman/NexusOS/.nexus/nexus.json', '/Users/nathantaichman/test/.nexus/nexus.json']:
    d = json.load(open(p))
    d.pop('schemaVersion', None); d.pop('schema_version', None)
    json.dump(d, open(p, 'w'), indent=2, sort_keys=True)
EOF
```

- [ ] **Step 5: Full gates — expect all 0.** Commit `refactor(identity): the nexus card holds an id and a birth date`.

---

### Task 3: readNexus Sheds the Accent and Label Fallbacks

**Files:**
- Modify: `src/main/readNexus.ts` (delete `SWIFT_ONLY_ACCENT` (67–70) and its use in `resolveAccent`; collapse the accent read at 467–471 to `resolveAccent(asString(rawPersonalization.accent))`; delete the `sidebar_sections` tolerance (154–162's `ss`/`labelled` scaffold, collapsing to plain `pair(...)` reads); rewrite the `readLabels` comment (141–142) and the profile-placement comment (476–477) in native voice)
- Test: `src/main/readNexus.test.ts`

**Interfaces:**
- Produces: `resolveAccent(raw: string | undefined)` accepting only canonical spectrum names or `system` — no alias map exists. Anything else resolves to the default accent.

- [ ] **Step 1: Hand-migrate the one live legacy value first** (the test nexus still carries top-level `accent_color: "cyan"`; NexusOS is already migrated):

```bash
python3 - <<'EOF'
import json
p = '/Users/nathantaichman/test/.nexus/settings.json'
d = json.load(open(p))
accent = d.pop('accent_color', None)
if accent: d.setdefault('personalization', {})['accent'] = accent
json.dump(d, open(p, 'w'), indent=2, sort_keys=True)
EOF
```

- [ ] **Step 2: True the tests.** In `readNexus.test.ts`, delete the Swift-only-accent cases (335–338), the `accent_color` read cases (331–334, 345), the personalization-wins case (372–376, now vacuous), and the `sidebar_sections` label fixtures (438, 456–468); retitle the labels describe (480). Add one case: `personalization.accent` is the only accent source, and an unknown name resolves to the default.
- [ ] **Step 3: Run `npx vitest run src/main/readNexus.test.ts` — expect FAIL** (the fallback still reads `accent_color`).
- [ ] **Step 4: Implement the deletions.** Full gates — expect all 0.
- [ ] **Step 5: Commit** `refactor(read): accent and labels speak only the native vocabulary`.

---

### Task 4: The Chip-Color Exchange Map Dies

**Files:**
- Modify: `src/shared/types.ts` (delete `LEGACY_CHIP_COLOR_MAP` (22–37) and its doc comment)
- Modify: `src/renderer/src/design-system/tokens/colorMap.ts` (delete the `MAP` alias and the legacy branch; rewrite the header — this is the palette accessor, not an exchange layer)
- Test: whatever pins `chipColorFor`'s legacy branch (locate with `grep -rn "chipColorFor" --include="*.test.*" src`)

**Interfaces:**
- Produces: `chipColorFor(color: string | undefined): ChipColorName` — exactly:

```ts
export function chipColorFor(color: string | undefined): ChipColorName {
  return color && PALETTE.has(color) ? (color as ChipColorName) : 'default'
}
```

- [ ] **Step 1: Hand-sweep the five legacy values on disk** (verified: the only legacy color anywhere is `gray`, once live in the NexusOS properties registry and four times in test-nexus trash):

```bash
python3 - <<'EOF'
import json, pathlib
paths = ['/Users/nathantaichman/NexusOS/.nexus/properties.json',
         *[str(p) for p in pathlib.Path('/Users/nathantaichman/test/.trash').rglob('_collection.json')]]
for p in paths:
    s = open(p).read()
    if '"gray"' in s: open(p, 'w').write(s.replace('"color": "gray"', '"color": "grey"'))
EOF
```

- [ ] **Step 2: True the tests** — rewrite any case asserting a legacy-name mapping (`teal→cyan`, `pink→lavender`, `gray→grey`) to assert it now resolves `'default'`; keep the canonical pass-through cases.
- [ ] **Step 3: Run the touched test files — expect FAIL.** Implement the deletions. Re-run — expect PASS. Full gates — all 0.
- [ ] **Step 4: Commit** `refactor(colors): the palette answers for itself`.

---

### Task 5: views.ts and schemas.ts Shed the Legacy Vocabularies

**Files:**
- Modify: `src/shared/views.ts` (delete `CARD_SIZES`/`LEGACY_CARD_SIZE` (32–38) and collapse `card_size` (284–286) to `z.number().optional().catch(undefined)`; delete `decodeGroupConfig`'s keyless-legacy `case undefined:` arm (264–265) and its comment (233–235) — the surrounding never-throws leniency stays untouched; rewrite the header (1–16) and the parity comments at 75, 95, 102, 166, 272, 339 in native voice)
- Modify: `src/shared/schemas.ts` (delete `OPEN_IN_LEGACY` (11–17) and collapse `openInField` to `z.enum(['full-page', 'page-preview']).optional().catch(undefined)`; delete the `schema_version` line (32); rewrite the header's Codable framing (1–4) — `looseObject` foreign-key survival serves Obsidian and agents)
- Test: `src/shared/views.test.ts` (legacy bare-group and word-size cases at 62, 158, 183, 215), `src/main/mutate.test.ts` (the `schema_version: 0` fixture at ~181)

**Interfaces:**
- Produces: `savedView.card_size` is a bare optional number; `open_in` accepts only `'full-page' | 'page-preview'`; a keyless `{property_id}` group decodes to no group (the catch arm), not a property group.

- [ ] **Step 1: True the four test cases** to the new contracts (word sizes and keyless groups now decode to undefined/absent).
- [ ] **Step 2: Run `npx vitest run src/shared/views.test.ts` — expect FAIL.** Implement. Re-run — PASS. Full gates — all 0.
- [ ] **Step 3: Commit** `refactor(views): the saved-view vocabulary is singular`.

---

### Task 6: tablecells Leaves the Disks, Then the Code

**Files:**
- Modify: `src/renderer/src/Components/Detail/viewIcon.ts` (delete the `tablecells` clause at 14 and its comment at 4)
- Modify: `src/renderer/src/Blocks/ViewEmbedBlock.tsx:60` (delete the parenthetical)
- Test: `src/renderer/src/Components/Detail/viewIcon.test.ts:21–23`

- [ ] **Step 1: Hand-sweep both nexuses** — a view icon equal to the Swift-era name is the same as no icon, so the key deletes (absent means default):

```bash
python3 - <<'EOF'
import json, pathlib, re
for root in ['/Users/nathantaichman/NexusOS', '/Users/nathantaichman/test']:
    for p in pathlib.Path(root).rglob('_page*.json'):
        s = p.read_text()
        if 'tablecells' in s:
            d = json.loads(s)
            for v in d.get('views', []):
                if v.get('icon') == 'tablecells': v.pop('icon')
            p.write_text(json.dumps(d, indent=2, sort_keys=True))
EOF
grep -rl tablecells ~/NexusOS ~/test --include="*.json" | wc -l   # expect 0
```

- [ ] **Step 2: Delete the tolerance and its test case.** Full gates — all 0.
- [ ] **Step 3: Commit** `refactor(views): a table's default glyph needs no alias`.

---

### Task 7: The Comment Sweep and the Grep Gate

**Files:**
- Modify (comments only — code unchanged): `src/main/mutate.ts` (276, 313, 349) · `src/main/watcher.ts:52` (delete the `index.db` clause — this one IS code — and `src/main/db/open.ts:1–2`'s mention) · the pipeline quartet `filter.ts`/`sort.ts`/`group.ts`/`value.ts` · `src/main/properties/schema.ts` (including the `// MARK: -` idiom) · `src/main/exclusion.ts` · `src/main/order.ts` · `src/main/paths.ts:2` · `src/main/connections/rewrite.ts`, `scan.ts` · `src/main/crud/folderEntity.ts`, `cascade.ts:20` · `src/shared/connections.ts`, `mutate.ts:18`, `properties.ts`, `columnStyles.ts:2`, `types.ts` (22–24, 219, 242, 271, 416, 496, 510) · `src/renderer/src/Detail/Views/Table/TableView.tsx:477`, `viewMerge.ts:8`, `columnReorder.ts:6` · `src/renderer/src/MarkdownPM/PageHeader.tsx:17` · `design-system/tokens/colorMap.ts` (done in Task 4 — verify) · `Sidebar/disclosureState.ts:2` · `CalendarPicker/CalendarPicker.tsx` (501, 683), `calendarPicker.css.ts:215` — each rewritten to state the design intent with no attribution
- Modify (fixture renames, assertions kept): `src/main/mutate.test.ts` (174–181, 381, 430), `src/main/sidecarIO.test.ts:27`, `src/shared/columnStyles.test.ts` (`swift_only` fixture), `src/main/blocks.test.ts` + `src/shared/blocks.test.ts` (`swift_key` fixtures), `formatValue.test.ts:5`, `filter.test.ts:252`, `src/main/watcher.test.ts` (the `index.db` case deletes)
- Modify: `src/renderer/src/design-system/interactions/Surfaces.tsx:132` (the demo tree's `Swift` label renames to any other fake project name)

- [ ] **Step 1: Sweep every file above.** A comment citing Swift as rationale either states the surviving native reason or deletes; a fixture named for Swift renames while its assertion (foreign-key survival) stays.
- [ ] **Step 2: The grep gate — every command must print 0:**

```bash
grep -rni "swift" src | grep -v node_modules | wc -l
grep -rn "defaults_version\|SWIFT_DEFAULTS_VERSION\|labelsToDisk\|swiftISODate\|ensureSettings\|defaultSettingsSeed" src | wc -l
grep -rn "accent_color\|sidebar_sections\|LEGACY_CHIP_COLOR_MAP\|OPEN_IN_LEGACY\|LEGACY_CARD_SIZE\|tablecells\|schemaVersion" src | wc -l
grep -rn "index.db" src | wc -l
```

- [ ] **Step 3: Full gates — all 0. Hand-clean the settings disks** (the seeded keys nothing reads):

```bash
python3 - <<'EOF'
import json
for p in ['/Users/nathantaichman/NexusOS/.nexus/settings.json', '/Users/nathantaichman/test/.nexus/settings.json']:
    d = json.load(open(p))
    for k in ('version', 'defaults_version', 'modified_at', 'show_page_icon'): d.pop(k, None)
    json.dump(d, open(p, 'w'), indent=2, sort_keys=True)
EOF
```

- [ ] **Step 4: Commit** `refactor(parity): the last translator leaves the building`.

---

#### Self-Review Record

Spec coverage: every inventory cluster (seed, shim, fallbacks, exchange maps, legacy fields kept out of Navigation's scope, comments, tests, disk hand-sweeps) maps to a task above. Type consistency: `defaultIdentity`'s narrowed return and `chipColorFor`'s collapse are stated where produced and nowhere contradicted. The pin-migration group is deliberately absent — it dies as whole modules in the Navigation Consolidation plan.
