## Links & Paths — Implementation Plan

### Context

Settings › Files & Links opens with a Pasted Links section that holds two Nexus-scoped keys, `defaultLinkFormat` and `pasteLinkIntoText`, read by MarkdownPM's link paste (`Core/MarkdownPM/Links/pasteLink.ts`, through `editorSettingsOf` in `Core/MarkdownPM/api.ts`) and by an untitled web tile's label (`Core/Tiles/Surfaces/WebTile.tsx`). Copy Path exists only for pages. It writes `pagePathText(path)` (`Core/Actions/pageMenu.ts`), the Nexus-relative path with `.md` stripped, through `clipboard:write` in `runPageAction` (`Core/Interface/Menus/pageMenuActions.ts`). This plan turns that section into **Links & Paths**: four per-machine preferences in `Core/Settings/devicePrefs.ts`, the store Interface Scale already uses, with each row marked `device: true` in `Core/Settings/frames.ts`. Two rows are the existing link settings, moved and relabeled. Two are new and govern Copy Path's text: a format, and whether the extension stays. Copy Path's text is composed host-side by one formatter (`Core/Paths/pathFormat.ts`) behind a new `path:copy` channel beside `path:reveal`. The home folder comes from a new `Machine.home`. Copy Path also reaches every Collection and Set menu that carries Reveal Location today.

The plan leaves alone what Default Link Format does (the paste-time form of an external address), Copy Link, Link properties' own Format, and Spaces and Contexts. It doesn't add Copy Path to tabs, navigation rows, or banner menus for containers, since none of those carry Reveal Location. It writes no migration code. The Nexus keys simply leave the schema, and NexusOS's two values are re-set by hand.

### Summary

Files & Links gets a **Links & Paths** section with four settings: Default Link Format, Paste Links Into Text, Default Path Format, and Include Extensions. All four belong to this computer rather than to the Nexus, so they don't travel with it. They're stored the same way Interface Scale is: this machine, for this Nexus. The first two behave exactly as Default Format and Paste Link Into Text do today. They only change name and storage.

Default Path Format decides what Copy Path puts on the clipboard. **Absolute** gives `/Users/nathantaichman/NexusOS/Collection/Set/page`. **Home Anchored** gives `~/NexusOS/Collection/Set/page` and is the default. **Relative** gives `Collection/Set/page`. Include Extensions adds `.md` to a page's path when on. Copy Path now also appears on Collections, Sets, and every folder inside them, wherever Reveal Location does, and in a page's own Settings menu. On Windows the copied path uses backslashes, the way that machine writes paths.

#### Constraints

- **Gates:** `npm run typecheck` · `npm run test` · `npm run lint`, from the repo root. Each exits 0, the test run ends in a passing count, and lint reports no warnings or unformatted files. The final pass adds `npm run build` and confirms `✓ built in`. Biome formats every TS/CSS/JSON write, so an Edit that fails on whitespace means the file was reformatted: re-read it and retry.
- **Hard rules:** The home folder reaches Core only through `Core/Platform/machine.ts`. `path:copy` is declared once in `Core/Contract/bridge.ts` and answers with the `Result` envelope.
- **One writer per fact:** Copy Path's text is formed only by `formatPath` and written only by the `path:copy` handler. The four preferences are read only through `devicePref`.
- **Keys:** `defaultLinkFormat`, `pasteLinksIntoText`, `defaultPathFormat`, and `includeExtensions` live in device prefs alone. Nothing reads the retired Nexus keys, and no migration code reads them.
- **Behavior held:** Link paste and web-tile labels behave identically. Every existing paste test passes with only the key rename. `pageMetaMenuItems`' rows and order are unchanged.
- **Copy:** Labels and hints are exactly those in Task 1.4. No other user-facing text is added.
- **Comments:** Only where the code can't say it, matching the surrounding density. No trial-and-error code survives a task.
- **Commits:** Each phase commits on `active` once its gates are green, with `git commit --only -m "…" -- <paths>` (a new file is `git add`ed first). Another session is mid-work in this tree on MarkdownPM's codeblock deltas, so stage only the paths a task names and never run whole-tree commands. A gate failing in a file no task names is that session's work: confirm it with `git status`, and check this plan's files in isolation. A doc a task falsifies is rewritten in that task's commit.
- **Live instances:** Nathan's dev instance (`electron-vite dev`, default userData) and another session's scratch instance are running. Neither is restarted or stopped. Live checks run on a scratch instance of this plan's own (Task 2.4).

#### Baseline

Recorded at ratification on 10-06-2026, at `fcddee588`. The plan's own commit follows it. The working tree held the parallel session's uncommitted MarkdownPM, UIX, and Dashboard edits.

- Gates: green. `npm run typecheck` exit 0 · `npm run lint` exit 0, 1417 files, no fixes · `npm run test` exit 0.
- `npm run test` → 517 files · 7378 passed, 2 skipped (7380). Adds the tests below.
- `grep -rn "pagePathText" Core | wc -l` → 6. Retires to 0.
- `grep -rn "pasteLinkIntoText" Core | wc -l` → 6. Retires to 0.
- `grep -rn "action: 'reveal'\|'reveal'" Core/Actions Core/Interface | wc -l` → 3. Retires to 0.

**START:** `<date -u +"%Y-%m-%dT%H:%M:%SZ" as Task 1.1 begins>`
**END:** `<same, as the report is given>`

#### Implementation Process

- [ ] **Phase 1** — Links & Paths Settings
  - [ ] Task 1.1
  - [ ] Task 1.2
  - [ ] Task 1.3
  - [ ] Task 1.4
- [ ] **Phase 2** — Copy Path
  - [ ] Task 2.1
  - [ ] Task 2.2
  - [ ] Task 2.3
  - [ ] Task 2.4

### Phase 1 — Links & Paths Settings

**GOAL:** Move the two link settings from the Nexus to the device, add the two path settings beside them, and draw all four as the Links & Paths section. Each task depends on the one before it to compile, so the phase lands as one commit.

#### Task 1.1

**TASK:** Retire `defaultLinkFormat` and `pasteLinkIntoText` from the Nexus personalization table, along with the test that ran the enum coercer through `defaultLinkFormat`. The `dateFormat` case beside it already covers the coercer both ways.

**FILES:** `Core/Settings/personalization.ts`, `Core/Nexus/readNexus.test.ts`

**DEPENDENCIES:** Turns `api.ts`, `frames.ts`, `WebTile.tsx`, and the paste test red until Tasks 1.2–1.4 land. Shares Phase 1's commit.

**NOW**

```ts
import { DEFAULT_LINK_DISPLAY, LINK_DISPLAYS } from '../Properties/properties'
// …
  trashColumnStyle: setting(columnStyle),
  pasteLinkIntoText: flag(false),
  defaultLinkFormat: oneOf(LINK_DISPLAYS, DEFAULT_LINK_DISPLAY),
  openLinksInApp: flag(false),
```

```ts
  it('the default link format survives the round-trip, and an unrecognized one reads as absent', async () => {
    const at = async (v: unknown): Promise<string | undefined> =>
      (await readNexus(mk({ personalization: { defaultLinkFormat: v } }))).config.personalization
        .defaultLinkFormat
    expect(await at('link-short')).toBe('link-short')
    // …
```

**CHANGE**

- [ ] Delete the `pasteLinkIntoText` and `defaultLinkFormat` entries from `SETTINGS`, and the `Properties/properties` import, which nothing else in the file uses.
- [ ] Delete the `readNexus.test.ts` case "the default link format survives the round-trip, and an unrecognized one reads as absent", together with its comment.

**AFTER**

```ts
  trashColumnStyle: setting(columnStyle),
  openLinksInApp: flag(false),
```

**VERIFY**

- [ ] `grep -n "defaultLinkFormat\|pasteLinkIntoText\|LINK_DISPLAY" Core/Settings/personalization.ts` → no hits.
- [ ] `npx vitest run Core/Nexus/readNexus.test.ts` → passes.

#### Task 1.2

**TASK:** Declare the path-format values, and add the four Links & Paths preferences to the device-prefs decoder and defaults.

**FILES:** `Core/Paths/pathFormat.ts` (new), `Core/Settings/devicePrefs.ts`

**NOW:** `devicePrefs` decodes `nativeMenus`, `interfaceScale`, `brightness`, `scrollbars`, `scrollbarReveal`, `panes`, `disclosure`, `windows`, `navWindowGallery`, and `navViewGallery`. `DEVICE_DEFAULTS` holds `nativeMenus`, `interfaceScale`, `brightness`, `scrollbars`, and `scrollbarReveal`. `Core/Paths/pathFormat.ts` doesn't exist.

**CHANGE**

- [ ] Create `Core/Paths/pathFormat.ts` holding the values and the type alone. Task 2.1 adds the formatter.
- [ ] In `devicePrefs.ts`, import `DEFAULT_LINK_DISPLAY`/`LINK_DISPLAYS` from `../Properties/properties` and `PATH_FORMATS` from `../Paths/pathFormat`. Add the four decoder fields and the four defaults.
- [ ] Rewrite `devicePrefs.ts`'s header comment, whose rationale ("all true of the display and operating system") doesn't hold for a paste format. It becomes: `// Preferences that belong to the MACHINE rather than the Nexus: menu style, interface scale, brightness, scrollbars, pane widths, sidebar and footer folds, window sizes, the navigation layouts, and how links paste and paths copy stay with the device and travel nowhere.`

**AFTER**

```ts
// Core/Paths/pathFormat.ts
export const PATH_FORMATS = ['absolute', 'home', 'relative'] as const
export type PathFormat = (typeof PATH_FORMATS)[number]
```

```ts
// Core/Settings/devicePrefs.ts, inside the decoder's z.object
    defaultLinkFormat: z.enum(LINK_DISPLAYS).optional().catch(undefined),
    pasteLinksIntoText: flag,
    defaultPathFormat: z.enum(PATH_FORMATS).optional().catch(undefined),
    includeExtensions: flag,

export const DEVICE_DEFAULTS = {
  nativeMenus: false,
  interfaceScale: TENTHS_SCALE.default,
  brightness: TENTHS_SCALE.default,
  scrollbars: 'pages',
  scrollbarReveal: 'hover',
  defaultLinkFormat: DEFAULT_LINK_DISPLAY,
  pasteLinksIntoText: false,
  defaultPathFormat: 'home',
  includeExtensions: false,
} as const satisfies Partial<Record<keyof DevicePrefs, unknown>>
```

**VERIFY**

- [ ] `npx vitest run Core/Settings/devicePrefs.test.ts` → passes unchanged. The decoder's per-field catch already has a test, and Task 1.4's typecheck proves each key's value type through `DeviceKeyOf`.
- [ ] Both new toggles default to `false`, so `packDevicePrefs` dropping `false` stores nothing at rest. No special case is added.

#### Task 1.3

**TASK:** Feed the two link preferences to MarkdownPM through `editorSettingsOf`, which keeps MarkdownPM reaching the app only through its `editorHost` facet, and point `WebTile` at the device preference.

**FILES:** `Core/MarkdownPM/api.ts`, `Core/Pages/editorHost.tsx`, `Core/Pages/editorHost.test.ts`, `Core/Testing/editorHarness.ts`, `Core/MarkdownPM/Links/pasteLink.ts`, `Core/MarkdownPM/Links/pasteLink.test.tsx`, `Core/Tiles/Surfaces/WebTile.tsx`

**NOW**

```ts
// api.ts
const EDITOR_SETTING_KEYS = [ /* … */ 'pasteLinkIntoText', 'defaultLinkFormat', /* … */ ] as const

export type EditorSettings = {
  [K in (typeof EDITOR_SETTING_KEYS)[number]]: SettingValue<K>
} & { commands: Commands }

let resolved: { p: Personalization; commands: Commands; settings: EditorSettings } | null = null

// Read on per-transaction paths, so it resolves again only when the personalization or the commands change, and stays the same object until an editor setting does.
export function editorSettingsOf(p: Personalization, commands: Commands): EditorSettings {
  if (resolved?.p !== p || resolved.commands !== commands) {
    const was = resolved?.commands === commands ? resolved.settings : null
    const values = Object.fromEntries(EDITOR_SETTING_KEYS.map((k) => [k, settingOf(p, k)]))
    const same = was !== null && EDITOR_SETTING_KEYS.every((k) => was[k] === values[k])
    resolved = { p, commands, settings: same ? was : { ...(values as Omit<EditorSettings, 'commands'>), commands } }
  }
  return resolved.settings
}
```

```ts
// editorHost.tsx — buildEditorHost.settings and useEditorHost
editorSettingsOf(personalizationOf(s), commandsOf(s))
// editorHarness.ts — harnessHost
settings: { ...editorSettingsOf({}, DEFAULT_COMMANDS), ...spec.settings },
// pasteLink.ts — linkFor
pasteIntoText: settings.pasteLinkIntoText,
// pasteLink.test.tsx
const settings = (p: Partial<Personalization>): void => { /* … */ }
// WebTile.tsx — useWebpageTitle
const display = useSetting('defaultLinkFormat')
```

**CHANGE**

- [ ] Write the failing test first. In `editorHost.test.ts` › "the host follows the editor settings", add "re-identifies on an editor device preference, and stays put on any other":
  - `useSession.setState({ devicePrefs: { pasteLinksIntoText: true } })` yields a new host whose `settings().pasteLinksIntoText` is `true`.
  - A following `useSession.setState({ devicePrefs: { pasteLinksIntoText: true, windows: { nav: { w: 400, h: 300 } } } })` keeps that same host.
  - The paste tests seed `settings` over the harness, so this is the only test that runs the device read.
- [ ] `api.ts`:
  - Drop the two keys from `EDITOR_SETTING_KEYS` and add `EDITOR_DEVICE_KEYS = ['defaultLinkFormat', 'pasteLinksIntoText'] as const`.
  - `EditorSettings` gains the device half, typed `NonNullable<DevicePrefs[K]>`.
  - `editorSettingsOf(p, d, commands)` caches on all three identities, reads the device half through `devicePref`, and runs the `same` check across both halves. The cache comment names the device preferences.
- [ ] `editorHost.tsx`: both calls pass `s.devicePrefs` as the second argument.
- [ ] `editorHarness.ts`: `editorSettingsOf({}, {}, DEFAULT_COMMANDS)`.
- [ ] `pasteLink.ts`: `settings.pasteLinksIntoText`.
- [ ] `pasteLink.test.tsx`: the `settings` helper takes `Partial<EditorSettings>`, its `Personalization` import goes, and `pasteLinkIntoText` becomes `pasteLinksIntoText` at each call.
- [ ] `WebTile.tsx`: read through the established idiom (`App.tsx` reads scrollbars the same way) and import `devicePref`. `useSetting` stays imported for its other use.

**AFTER**

```ts
// api.ts
const EDITOR_DEVICE_KEYS = ['defaultLinkFormat', 'pasteLinksIntoText'] as const

export type EditorSettings = {
  [K in (typeof EDITOR_SETTING_KEYS)[number]]: SettingValue<K>
} & {
  [K in (typeof EDITOR_DEVICE_KEYS)[number]]: NonNullable<DevicePrefs[K]>
} & { commands: Commands }

let resolved: {
  p: Personalization
  d: DevicePrefs
  commands: Commands
  settings: EditorSettings
} | null = null

// Read on per-transaction paths, so it resolves again only when the personalization, the device preferences, or the commands change, and stays the same object until an editor setting does.
export function editorSettingsOf(p: Personalization, d: DevicePrefs, commands: Commands): EditorSettings {
  if (resolved?.p !== p || resolved.d !== d || resolved.commands !== commands) {
    const was = resolved?.commands === commands ? resolved.settings : null
    const values: Record<string, unknown> = {
      ...Object.fromEntries(EDITOR_SETTING_KEYS.map((k) => [k, settingOf(p, k)])),
      ...Object.fromEntries(EDITOR_DEVICE_KEYS.map((k) => [k, devicePref(d, k)])),
    }
    const same = was !== null && Object.keys(values).every((k) => was[k as keyof EditorSettings] === values[k])
    resolved = { p, d, commands, settings: same ? was : { ...(values as Omit<EditorSettings, 'commands'>), commands } }
  }
  return resolved.settings
}
```

```ts
// WebTile.tsx
const display = useSession((s) => devicePref(s.devicePrefs, 'defaultLinkFormat'))
```

**VERIFY**

- [ ] `npx vitest run Core/Pages/editorHost.test.ts` → the new case fails before the device half lands and passes after.
- [ ] `npx vitest run Core/MarkdownPM/Links` → every paste and link-format test passes unchanged apart from the key rename.
- [ ] `grep -rn "pasteLinkIntoText" Core` → no hits.
- [ ] Check that no second cache or per-call allocation entered `editorSettingsOf`'s hit path.

#### Task 1.4

**TASK:** Draw the Links & Paths section with four device rows, and rewrite the docs that name the old section.

**FILES:** `Core/Settings/frames.ts`, `.claude/Features/ConfigurationPM.md`, `.claude/Features/MarkdownPM.md`, `.claude/Features/CorePM.md`, `.claude/Features/WebviewPM.md`

**NOW**

```ts
      {
        title: 'Pasted Links',
        rows: [
          { kind: 'picker', key: 'defaultLinkFormat', label: 'Default Format', hint: 'How a pasted link reads.', options: LINK_FORMAT_OPTIONS },
          { kind: 'toggle', key: 'pasteLinkIntoText', label: 'Paste Link Into Text', hint: 'Pasting an address over selected text turns that text into the link, instead of replacing it.' },
        ],
      },
```

**CHANGE**

- [ ] `frames.ts`:
  - Add `PATH_FORMAT_OPTIONS` beside `SCROLLBAR_REVEAL_OPTIONS`.
  - Import `type PathFormat` from `../Paths/pathFormat`.
  - Add `| PickerControlRow<PathFormat>` to the `Row` union.
  - Replace the section with the one shown under AFTER.
- [ ] `ConfigurationPM.md` › Files & Links:
  - Retitle **Pasted Links** to **Links & Paths**.
  - Add the sentence "Every setting here is a machine-level preference, stored in the device database rather than the Nexus."
  - Replace the two rows with the four shown under AFTER.
- [ ] `ConfigurationPM.md` › App Configuration: delete "; Use Native Menus is the first", which is already stale, so the sentence ends at "a machine-and-Nexus pair."
- [ ] `MarkdownPM.md` › Pasted Links: change "**Default Format** picks the form and **Paste Link Into Text** decides" to "**Default Link Format** picks the form and **Paste Links Into Text** decides".
- [ ] `CorePM.md` › the stored-data table's **Device preferences** row: after "Use Native Menus, Interface Scale, Brightness," add "the Links & Paths settings,".
- [ ] `WebviewPM.md`: change "derives through the Nexus's default link format" to "derives through Default Link Format".

**AFTER**

```ts
const PATH_FORMAT_OPTIONS: readonly PickerOption<PathFormat>[] = [
  { value: 'absolute', label: 'Absolute' },
  { value: 'home', label: 'Home Anchored' },
  { value: 'relative', label: 'Relative' },
]
// …
      {
        title: 'Links & Paths',
        rows: [
          {
            kind: 'picker',
            key: 'defaultLinkFormat',
            device: true,
            label: 'Default Link Format',
            hint: 'The format an external link is pasted with by default.',
            options: LINK_FORMAT_OPTIONS,
          },
          {
            kind: 'toggle',
            key: 'pasteLinksIntoText',
            device: true,
            label: 'Paste Links Into Text',
            hint: 'Pasting an address over selected text turns that text into the link, instead of replacing it.',
          },
          {
            kind: 'picker',
            key: 'defaultPathFormat',
            device: true,
            label: 'Default Path Format',
            hint: 'How file paths on this machine are copied to the clipboard.',
            options: PATH_FORMAT_OPTIONS,
          },
          {
            kind: 'toggle',
            key: 'includeExtensions',
            device: true,
            label: 'Include Extensions',
            hint: "Include file extensions in the clipboard's path.",
          },
        ],
      },
```

```markdown
| Default Link Format | `defaultLinkFormat` | Which form a pasted external address is written in. | **Full Link** · Short Link · Page Title |
| Paste Links Into Text | `pasteLinksIntoText` | Pasting an address over selected text turns that text into the link instead of replacing it. | On · **Off** |
| Default Path Format | `defaultPathFormat` | How Copy Path writes a page's or folder's location: from the filesystem root, from the home folder as `~/`, or from the Nexus root. A Nexus outside the home folder copies Home Anchored paths as Absolute, and a Windows machine writes them with backslashes. | Absolute · **Home Anchored** · Relative |
| Include Extensions | `includeExtensions` | Copy Path keeps a page's `.md` extension. | On · **Off** |
```

**VERIFY**

- [ ] Run the gates. All green, including typecheck's proof that each `device: true` row's key resolves through `DeviceKeyOf`.
- [ ] `grep -rn "Default Format\|Paste Link Into Text\|Pasted Links" Core .claude/Features` → only `MarkdownPM.md`'s own **Pasted Links** feature bullet remains. That bullet names the editor feature, not the section.
- [ ] Commit Phase 1: `feat(settings, markdownpm): Files & Links' Links & Paths section holds Default Link Format, Paste Links Into Text, Default Path Format, and Include Extensions as machine-level preferences`.

### Phase 2 — Copy Path

**GOAL:** Compose Copy Path's text host-side from the two path preferences, and give Collections, Sets, and a page's own Settings menu the row. This is separate from Phase 1 because it consumes Phase 1's keys and adds a host channel that only a freshly launched main serves, so it's driven live on a built scratch instance.

#### Task 2.1

**TASK:** Add `formatPath`, the one formatter for Copy Path's text, and test every format, the extension toggle, a Nexus outside home, and Windows.

**FILES:** `Core/Paths/pathFormat.ts`, `Core/Paths/pathFormat.test.ts` (new)

**NOW:** `pathFormat.ts` holds `PATH_FORMATS` and `PathFormat`. The stripping rule lives in `pagePathText` (`Core/Actions/pageMenu.ts`) as `/\.md$/i`.

**CHANGE**

- [ ] Write `pathFormat.test.ts` first, with a root of `/Users/nathan/NexusOS`, a home of `/Users/nathan`, and the posix platform unless a case says otherwise:
  - Relative gives `Notes/Set/Page` for `Notes/Set/Page.md`. With extensions on, `Notes/Set/Page.md` stays as it is, and a folder `Notes/Set` is unchanged either way.
  - Absolute gives `/Users/nathan/NexusOS/Notes/Page`.
  - Home gives `~/NexusOS/Notes/Page`. A root of `/Volumes/Drive/NexusOS` gives the absolute path. A home of `/Users/nat` against a root under `/Users/nathan` gives the absolute path.
  - On Windows, a root of `C:/Users/nathan/NexusOS` and a home of `C:/Users/nathan` give `~\NexusOS\Notes\Page` for Home.
- [ ] Add `formatPath` to `pathFormat.ts`, built from `posix.ts`'s existing `join`, `isAtOrUnder`, `relDirname`, `relJoin`, and `titleFromPath`. No new regex.

**AFTER**

```ts
import type { HostPlatform } from '../Contract/bridge'
import { isAtOrUnder, join, relDirname, relJoin, titleFromPath } from './posix'

export const PATH_FORMATS = ['absolute', 'home', 'relative'] as const
export type PathFormat = (typeof PATH_FORMATS)[number]

interface PathForm {
  format: PathFormat
  extensions: boolean
  root: string
  home: string
  platform: HostPlatform
}

/** A Nexus-relative path as Copy Path writes it; a Nexus outside the home folder copies its home-anchored paths whole. */
export function formatPath(rel: string, form: PathForm): string {
  const named = form.extensions ? rel : relJoin(relDirname(rel), titleFromPath(rel))
  const text = anchored(named, form)
  return form.platform === 'windows' ? text.replaceAll('/', '\\') : text
}

function anchored(rel: string, { format, root, home }: PathForm): string {
  switch (format) {
    case 'relative':
      return rel
    case 'absolute':
      return join(root, rel)
    case 'home': {
      const abs = join(root, rel)
      return isAtOrUnder(abs, home) ? `~${abs.slice(home.length)}` : abs
    }
  }
}
```

**VERIFY**

- [ ] `npx vitest run Core/Paths/pathFormat.test.ts` fails before `formatPath` exists and passes after.
- [ ] Check that `formatPath` reads nothing global. Every input arrives in `form`.

#### Task 2.2

**TASK:** Give `Machine` the home folder and declare `path:copy`, whose handler reads the two preferences, formats the path, and writes the clipboard.

**FILES:** `Core/Platform/machine.ts`, `Desktop/Platform/nodeMachine.ts`, `Core/Testing/machines.ts`, `Core/Contract/bridge.ts`, `Core/Nexus/handlers.ts`, `Core/Nexus/handlers.test.ts`

**NOW**

```ts
// machine.ts
  sha256Hex(input: string | Uint8Array): string
  platform: HostPlatform
// nodeMachine.ts
  platform: isWindows ? 'windows' : 'posix',
// bridge.ts
  'path:reveal': { args: [nexusRelativePath: string]; reply: Result<null> }
// Nexus/handlers.ts
  'path:reveal': withRoot(async (root, ctx, p: unknown) => {
    if (typeof p !== 'string') return ok(null)
    const r = await resolveUnderRoot(root, p)
    if (r.ok) ctx.reveal(r.value)
    return ok(null)
  }, ok(null)),
```

**CHANGE**

- [ ] Write the failing handler test first, in `handlers.test.ts` › a new `describe('path:copy')`, on the file's `beforeEach` Nexus (`root` with `Library/Notes.md`):
  - Set `ctx.clipboard = { read: async () => '', write: vi.fn(async () => {}) }`.
  - Run `await openNexusSequence(ctx, root, false)` first. Without an open session, `withRoot` answers `ok(null)` without running the handler, which would pass vacuously.
  - Then install `{ ...machine(), home: dirname(sessionRoot()!) }`, which takes the home from the canonical root the handler receives. Reinstall `diskMachine()` in the describe's `afterEach`, as `Core/Paths/names.test.ts` does.
  - With no stored preferences, `nexusHandlers['path:copy'](ctx, 'Library/Notes.md')` writes `~/<basename(root)>/Library/Notes`.
  - After `writeValue('devicePrefs', { defaultPathFormat: 'relative', includeExtensions: true })` it writes `Library/Notes.md`.
- [ ] `machine.ts`: add `home: string` beside `platform`.
- [ ] `nodeMachine.ts`: set `home: posixPath(realpathSync.native(homedir()))`, computed once, importing `realpathSync` from `node:fs` and `homedir` from `node:os`. The file imports only from `node:fs/promises` today. The native realpath canonicalizes the way the session root's `fs/promises` `realpath` does, letter case included.
- [ ] `Core/Testing/machines.ts`: the memory machine gets `home: '/Users/test'`, and `diskMachine` gets `home: homedir()`.
- [ ] `bridge.ts`: declare `'path:copy': { args: [nexusRelativePath: string]; reply: Result<null> }` under `path:reveal`.
- [ ] `Nexus/handlers.ts`: add the handler under `path:reveal`. It narrows the argument and formats the path. It doesn't resolve against the disk, since a copied path is text and nothing is opened.

**AFTER**

```ts
  'path:copy': withRoot(async (root, ctx, p: unknown) => {
    if (typeof p !== 'string') return ok(null)
    const prefs = readDevicePrefs()
    const { home, platform } = machine()
    await ctx.clipboard.write(
      formatPath(p, {
        format: devicePref(prefs, 'defaultPathFormat'),
        extensions: devicePref(prefs, 'includeExtensions'),
        root,
        home,
        platform,
      }),
    )
    return ok(null)
  }, ok(null)),
```

**VERIFY**

- [ ] The new test fails before the handler lands and passes after: `npx vitest run Core/Nexus/handlers.test.ts`. Its `write` spy is called exactly once per ask.
- [ ] Run the gates. `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` stay green.

#### Task 2.3

**TASK:** Route every Copy Path through `path:copy`, with Copy Path and Reveal Location answered by one `runPathAction` that page and container menus share. Retire `pagePathText`, and give container menus Copy Path beside the shared Reveal Location row. A page's own Settings menu gains Copy Path too.

**FILES:** `Core/Interface/Menus/pageMenuActions.ts`, `Core/Actions/pageMenu.ts`, `Core/Actions/pageMenu.test.ts`, `Core/Actions/entityMenu.ts`, `Core/Actions/entityMenu.test.ts`, `Core/Interface/Menus/entityMenuActions.ts`, `Core/Pages/PageMenu.tsx`, `Core/MarkdownPM/Links/externalLink.test.tsx`, `.claude/Features/InterfacePM.md`

**NOW**

```ts
// pageMenuActions.ts — runPageAction
    case 'title:copypath':
      void dialer().ask('clipboard:write', pagePathText(path))
      return true
    // …
    case 'title:reveal':
      void dialer().ask('path:reveal', path)
      return true
// entityMenu.ts — container branch, last group
        { label: 'Reveal Location', action: 'reveal' },
// entityMenu.ts — EntityMenuAction
  | 'reveal'
// entityMenuActions.ts — runEntityAction
    case 'reveal':
      void dialer().ask('path:reveal', path)
// PageMenu.tsx
  [COPY_LINK_ROW, HISTORY_ROW, REVEAL_ROW],
// externalLink.test.tsx — "a target naming a page is offered the page menu, path included"
    expect(writeClipboard).toHaveBeenCalledWith('Notes/Alpha')
```

**CHANGE**

- [ ] Removal first:
  - Delete `pagePathText` from `pageMenu.ts`, its import in `pageMenuActions.ts`, and its test case and import in `pageMenu.test.ts`.
  - Delete `'reveal'` from `EntityMenuAction`.
  - Delete the `'title:copypath'` and `'title:reveal'` cases from `runPageAction`, and the `'reveal'` case from `runEntityAction`.
- [ ] Update the tests first, so they fail:
  - `entityMenu.test.ts`: both container shapes read `…, 'Copy Path', 'Reveal Location'`, the sidebar collection's last group is `Lock Folder`, `Copy Path`, `Reveal Location`, and container Reveal's action is `'title:reveal'`.
  - `externalLink.test.tsx`: add a `'path:copy'` `vi.fn()` beside `'clipboard:write'` in the file's `stubEditorBridge` call and reset it with the others. The page case expects it asked with `'Notes/Alpha.md'`, and `writeClipboard` not called.
- [ ] `pageMenuActions.ts`: add `runPathAction` above `runPageAction`, as shown under AFTER. `runPageAction` opens its switch with `if (runPathAction(action, path)) return true`.
- [ ] `entityMenuActions.ts`: `runEntityAction` calls `if (runPathAction(action, path)) return` before its switch, importing it beside `runPageAction`.
- [ ] `entityMenu.ts`: import `COPY_PATH_ROW`/`REVEAL_ROW` from `./pageMenu`. The container group becomes `[...lock, COPY_PATH_ROW, REVEAL_ROW]`, unconditioned on `host`.
- [ ] `PageMenu.tsx`: `[COPY_LINK_ROW, COPY_PATH_ROW, HISTORY_ROW, REVEAL_ROW]`. The import gains `COPY_PATH_ROW`.
- [ ] `InterfacePM.md`: in the page menu table's Send row, change "Copy Path" to "Copy Path (in Files & Links › Default Path Format)".

**AFTER**

```ts
// pageMenuActions.ts
/** The verbs every Nexus file and folder answers by its path alone; returns false for any other. */
export function runPathAction(action: string, path: string): boolean {
  switch (action) {
    case 'title:copypath':
      void dialer().ask('path:copy', path)
      return true
    case 'title:reveal':
      void dialer().ask('path:reveal', path)
      return true
    default:
      return false
  }
}
// entityMenu.ts — container branch, last group
      [
        ...(target.host === 'sidebar'
          ? [{ label: lockLabel(target.disclosureLocked ?? false, 'Folder'), action: 'lock' as const }]
          : []),
        COPY_PATH_ROW,
        REVEAL_ROW,
      ],
```

**VERIFY**

- [ ] Run the gates. The updated `entityMenu.test.ts` and `externalLink.test.tsx` cases fail before the change and pass after.
- [ ] `grep -rn "pagePathText" Core` → 0. `grep -rn "'reveal'" Core/Actions Core/Interface` → 0. `grep -rn "'path:copy'\|'path:reveal'" Core/Interface/Menus` → only `runPathAction`. `grep -rn "clipboard:write" Core/Interface/Menus` shows only Copy Link's two writers.
- [ ] Check that no surface outside the Reveal Location parity set gained a row. Tabs, navigation rows, and banners for containers are untouched.
- [ ] Commit Phase 2's Tasks 2.1–2.3: `feat(paths, menus): Copy Path writes the Default Path Format, with or without the extension, through one host-side formatter, and Collections, Sets, and a page's Settings menu carry it beside Reveal Location`.

#### Task 2.4

**TASK:** Drive the change live on a built scratch instance, carry NexusOS's two link values into Nathan's running instance, and remove the retired keys from NexusOS's `settings.json`.

**FILES:** `~/NexusOS/.nexus/settings.json` (live data, outside the repo)

**NOW:** NexusOS's `settings.json` `personalization` holds `"defaultLinkFormat": "link-title"` and `"pasteLinkIntoText": true`. After Phase 1 nothing reads them. Device preferences live in each Nexus's database under the running instance's userData, so NexusOS's values belong to Nathan's own instance (default userData), not to a scratch one.

**CHANGE**

1. `npm run build` (confirm `✓ built in`). If it fails in a file no task names, that's the parallel session's uncommitted work. Build from a worktree at HEAD instead (`git worktree add`, `npm ci`, then the build), which carries this plan's commits without their dirty files, and remove the worktree afterward. Then launch a scratch instance with its own userData and port: `cd Desktop && POMMORA_USERDATA="$HOME/Pommora-Scratch-LinksPaths" POMMORA_DEBUG_PORT=9335 env -u ELECTRON_RUN_AS_NODE ../node_modules/.bin/electron .`. Open `~/Test` over CDP with `window.nexus.ask('nexus:openPath', '/Users/nathantaichman/Test')`.
2. On the scratch instance, read the clipboard with `pbpaste` after each copy:
   - Settings › Files & Links shows Links & Paths with the four rows in order. Default Path Format reads Home Anchored and Include Extensions reads off. Picker items need `el.click()` inside `Runtime.evaluate`.
   - `window.nexus.ask('path:copy', '<a Test page>.md')` gives `~/Test/<Collection>/<Set>/<Page>`. A Collection's and a Set's folder path gives the folder in the same form.
   - Switching the Settings rows to Absolute, to Relative, and to Include Extensions on each changes the next copy to Task 2.1's form. That proves the rows write what the handler reads.
   - Pasting `https://example.com` into a throwaway page writes the Full Link form, and with Default Link Format on Short Link it writes the short form.
   - The menu wiring (which rows ask `path:copy`) is proven by Task 2.3's tests, since native context-menu items can't be picked over CDP.
3. Stop the scratch instance by exact PID and delete `~/Pommora-Scratch-LinksPaths` along with the throwaway page.
4. NexusOS carry-over. Over CDP 9333, read which Nexus Nathan's instance has open. Its renderer has hot-reloaded Phase 1, and its running main saves unknown device keys as they are. If the open Nexus is NexusOS, set the two values through the Settings rows: Default Link Format to Page Title, Paste Links Into Text on. Otherwise Nathan sets those two rows by hand once NexusOS is open. Don't restart or stop his instance.
5. Remove exactly the two retired lines from `~/NexusOS/.nexus/settings.json`, leave every other byte untouched, and confirm the file still parses: `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" ~/NexusOS/.nexus/settings.json`.

**VERIFY**

- [ ] Each clipboard read matches its expected string, recorded in the report.
- [ ] `grep -n "defaultLinkFormat\|pasteLinkIntoText" ~/NexusOS/.nexus/settings.json` → no hits. NexusOS's Settings rows read Page Title and On in Nathan's instance, or that step is handed to Nathan by name.
- [ ] User confirms, after restarting his dev process so main serves `path:copy`: the Links & Paths section reads right, and right-click Copy Path on a page, a Collection, and a Set pastes the expected form.

### Completion Criteria

**Conformance**

- [ ] No duplicated mechanism: `grep -rn "md\$/i" Core/Paths/pathFormat.ts Core/Actions Core/Interface/Menus` → none. `formatPath` is the only Copy Path formatter, the `path:copy` handler its only writer, and `runPathAction` the only asker.
- [ ] Nothing changed outside the plan: `git diff --name-only fcddee588..HEAD -- <this plan's paths>` matches the tasks' FILES lists. Commits from the parallel session in that range are theirs.

**Correctness**

- [ ] `path:copy` gives each format's expected string for a page, a Collection, and a Set on the scratch instance, and each Settings row change reaches the next copy (Task 2.4).
- [ ] Every right-click surface with Copy Path asks `path:copy`: Task 2.3's tests, and Nathan's pass in his own instance.
- [ ] Link paste and web-tile labels follow the device preference, with paste behavior unchanged.
- [ ] Links & Paths draws four device rows in the mandated order with the mandated copy. A change leaves the Nexus's `settings.json` untouched.

**Completeness**

- [ ] Every task ticked. No scaffolding, debug output, or unauthorized TODO in this plan's commits. NexusOS holds its two values on this machine and no retired keys, or the value step is handed to Nathan by name.

**Confirmation**

- [ ] Every verification result read. `pathFormat.test.ts`, the `path:copy` handler test, the editor-host device case, and the updated `entityMenu.test.ts` and `externalLink.test.tsx` cases each go red with their change reverted.
- [ ] User: the Settings frame visual pass and right-click Copy Path on a page, a Collection, and a Set.

**Continuity**

- [ ] *§Reconciliation* walked. `ConfigurationPM.md`, `MarkdownPM.md`, `CorePM.md`, `WebviewPM.md`, and `InterfacePM.md` read true. Each *§Deviations* entry is fixed or ruled on.

**Confidence**

- [ ] Gates and `npm run build` green on HEAD. *§Baseline* counts moved as planned.
- [ ] Diff size around +60 net lines, comments and tests excluded.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run. Edits found in adjacent files that no task made belong to the user and are folded into the commit at hand, except the parallel codeblock-deltas session's files, which stay out of this plan's commits.

- [ ] Phase review dispatched: Phase 1 · Phase 2
- [ ] All findings fixed or ruled on
- [ ] Neutral verification passed on this plan's commits
- [ ] Final pass: gates · baseline · diff · deviations · criteria
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

#### Reconciliation

- `.claude/Features/ConfigurationPM.md` — the Files & Links **Pasted Links** table names "Default Format" and "Paste Link Into Text" as Nexus keys — Task 1.4
- `.claude/Features/ConfigurationPM.md` — "Use Native Menus is the first" machine-and-Nexus preference — Task 1.4
- `.claude/Features/MarkdownPM.md` — "**Default Format** picks the form and **Paste Link Into Text** decides" — Task 1.4
- `.claude/Features/CorePM.md` — the **Device preferences** row lists every device preference, without the Links & Paths settings — Task 1.4
- `.claude/Features/WebviewPM.md` — an untitled tile "derives through the Nexus's default link format" — Task 1.4
- `.claude/Features/InterfacePM.md` — the Send row's bare "Copy Path", whose output now follows a setting — Task 2.3
- `Core/Nexus/readNexus.test.ts` — "the default link format survives the round-trip" as a personalization key — Task 1.1
- `Core/Settings/devicePrefs.ts` — the header comment's "all true of the display and operating system" rationale — Task 1.2
- `Core/MarkdownPM/api.ts` — the `editorSettingsOf` cache comment names only the personalization and the commands — Task 1.3
- `Core/Actions/pageMenu.test.ts` — "copies a page as its location without the extension" through `pagePathText` — Task 2.3
- `Core/Actions/entityMenu.test.ts` — container menus end in Reveal Location alone, under the `'reveal'` action — Task 2.3
- `Core/MarkdownPM/Links/externalLink.test.tsx` — a page connection's Copy Path writes `Notes/Alpha` through `clipboard:write` — Task 2.3

#### Report & Closure

Per the writing-plans 5.5 shape: what shipped, phase by phase, verification with each result read, deviations, open items, the line diff, the run time, and a closing stance.

### Open Items

### Deviations
