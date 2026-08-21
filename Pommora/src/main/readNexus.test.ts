import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'
import { readCommands, readNexus, readPersonalization, splitFrontmatter } from './readNexus'
import { DEFAULT_ACCENT, DEFAULT_COMMANDS } from '@shared/types'

const PAGE_A = '01KVGMT8BFG350FZZXAMG1QDRP'
const PG_LINKED = '01KVGMT8BFG350FZZXAMG1QDRQ'
const PG_PLAIN = '01KVGMT8BFG350FZZXAMG1QDRR'

describe('readCommands', () => {
  it('falls back to DEFAULT_COMMANDS when the block is absent or malformed', () => {
    expect(readCommands(undefined)).toEqual(DEFAULT_COMMANDS)
    expect(readCommands('nope')).toEqual(DEFAULT_COMMANDS)
    expect(readCommands([])).toEqual(DEFAULT_COMMANDS)
  })
  it('overlays user bindings and keeps unknown-but-valid ids', () => {
    const c = readCommands({ 'toggle-ribbon': 'cmd+shift+e', 'future-thing': 'ctrl+k' })
    expect(c['toggle-ribbon']).toBe('cmd+shift+e')
    expect(c['future-thing']).toBe('ctrl+k')
  })
  it('a non-string or empty value falls back to the default binding', () => {
    const c = readCommands({ 'toggle-ribbon': 42, other: '' })
    expect(c['toggle-ribbon']).toBe(DEFAULT_COMMANDS['toggle-ribbon'])
    expect(c.other).toBeUndefined()
  })
})

describe('readPersonalization: ribbon knobs', () => {
  it('coerces a valid sidebarMode + ribbonOrder', () => {
    const p = readPersonalization({ sidebarMode: 'agenda', ribbonOrder: ['agenda', 'collections'] })
    expect(p.sidebarMode).toBe('agenda')
    expect(p.ribbonOrder).toEqual(['agenda', 'collections'])
  })
  it('drops an invalid sidebarMode and filters garbage from ribbonOrder', () => {
    const p = readPersonalization({ sidebarMode: 'bogus', ribbonOrder: [1, '', 'contexts'] })
    expect(p.sidebarMode).toBeUndefined()
    expect(p.ribbonOrder).toEqual(['contexts'])
  })
  it('leaves both undefined when absent', () => {
    const p = readPersonalization({})
    expect(p.sidebarMode).toBeUndefined()
    expect(p.ribbonOrder).toBeUndefined()
  })
})

describe('readPersonalization: picker selection', () => {
  it('reads the stored mode back so a set survives the next tree push', () => {
    expect(readPersonalization({ pickerSelection: 'checked' }).pickerSelection).toBe('checked')
  })
  it('holds nothing for the default or for a value it does not offer', () => {
    expect(readPersonalization({ pickerSelection: 'outlined' }).pickerSelection).toBeUndefined()
    expect(readPersonalization({ pickerSelection: 'bogus' }).pickerSelection).toBeUndefined()
    expect(readPersonalization({}).pickerSelection).toBeUndefined()
  })
})

const d = (p: string): void => {
  mkdirSync(p, { recursive: true })
}
const w = (p: string, c = ''): void => {
  writeFileSync(p, c)
}

let raw: string
let sidecar: string

beforeAll(() => {
  // --- raw / un-adopted nexus (the ~/test shape: no .nexus, no sidecars):
  //     root folder = Collection, every subfolder = Set, recursive (no depth cap). ---
  raw = mkdtempSync(join(tmpdir(), 'pom-raw-'))
  d(join(raw, 'Collection A', 'Set A', 'Sub A'))
  w(join(raw, 'Collection A', 'Set A', 'Sub A', 'Deep.md'), '# deep (depth-3, proves no cap)')
  w(
    join(raw, 'Collection A', 'Set A', 'Page A.md'),
    '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRP\nicon: star\n---\n\nbody',
  )
  w(join(raw, 'Collection A', 'Set A', 'Page B.md'), 'no frontmatter, just body')
  w(join(raw, 'Collection A', 'Root Page.md'), '# collection-root page')
  d(join(raw, 'Collection B'))
  d(join(raw, '_internal'))
  w(join(raw, '_internal', 'x.md'), 'should be skipped')
  // Agenda singleton — hidden from Collections by its CONFIG sidecar, not its name.
  d(join(raw, 'Tasks'))
  w(join(raw, 'Tasks', '_taskconfig.json'), '{}')
  w(join(raw, 'Tasks', 'Submit.md'), '# a member')

  // --- sidecar-driven nexus (_pagecollection.json at the top, recursive _pageset.json below) ---
  sidecar = mkdtempSync(join(tmpdir(), 'pom-sc-'))
  d(join(sidecar, '.nexus'))
  w(join(sidecar, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1', createdAt: '2026' }))
  w(join(sidecar, '.nexus', 'settings.json'), JSON.stringify({ excluded_folders: ['Archive'] }))
  w(
    join(sidecar, '.nexus', 'properties.json'),
    JSON.stringify({
      prop_p1: {
        id: 'prop_p1',
        name: 'Status',
        type: 'select',
        select_options: [{ value: 'a', label: 'A', color: 'blue' }],
      },
    }),
  )
  d(join(sidecar, 'Notes', 'Daily'))
  w(
    join(sidecar, 'Notes', '_pagecollection.json'),
    JSON.stringify({ id: 'col-notes', properties: ['prop_p1'] }),
  )
  w(join(sidecar, 'Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 'set-daily' }))
  w(join(sidecar, 'Notes', 'Daily', 'Entry.md'), '---\nid: e1\n---\n')
  w(join(sidecar, 'Notes', 'Loose.md'), 'collection-root page')
  d(join(sidecar, 'Archive'))
  w(join(sidecar, 'Archive', '_pagecollection.json'), JSON.stringify({ id: 'col-arch' }))
  d(join(sidecar, 'PlainFolder')) // no sidecar -> not a Collection in sidecar mode
})

afterAll(() => {
  rmSync(raw, { recursive: true, force: true })
  rmSync(sidecar, { recursive: true, force: true })
})

describe('splitFrontmatter', () => {
  it('parses fenced frontmatter', () => {
    expect(splitFrontmatter('---\nid: x\n---\nbody')).toEqual({ id: 'x' })
  })
  it('returns empty for no fence', () => {
    expect(splitFrontmatter('# just markdown')).toEqual({})
  })
  it('returns empty for unterminated fence', () => {
    expect(splitFrontmatter('---\nid: x\nno close')).toEqual({})
  })
})

describe('readNexus — structure mode (raw, like ~/test)', () => {
  it('classifies collections/sets/pages recursively; hides agenda + internal', async () => {
    const t = await readNexus(raw)
    const collections = t.collections!
    expect(collections.map((c) => c.title)).toEqual(['Collection A', 'Collection B']) // title fallback order
    const a = collections.find((c) => c.title === 'Collection A')!
    expect(a.sets.map((s) => s.title)).toEqual(['Set A'])
    expect(a.pages.map((p) => p.title)).toEqual(['Root Page'])
    const setA = a.sets[0]
    expect(setA.pages.map((p) => p.title)).toEqual(['Page A', 'Page B'])
    // depth-3 sub-set loads as a nested Set (no cap, no roll-up)
    expect(setA.sets!.map((s) => s.title)).toEqual(['Sub A'])
    expect(setA.sets![0].pages.map((p) => p.title)).toEqual(['Deep'])
    expect(collections.find((c) => c.title === 'Tasks')).toBeUndefined()
    expect(collections.find((c) => c.title === '_internal')).toBeUndefined()
    expect(t.contexts).toEqual([])
  })

  it('synthesizes stable adopted ids across reads', async () => {
    const t1 = await readNexus(raw)
    const t2 = await readNexus(raw)
    expect(t1.collections![0].id).toBe(t2.collections![0].id)
    expect(t1.collections![0].id.startsWith('adopted-')).toBe(true)
  })

  it('reads frontmatter id+icon; adopts no-frontmatter pages', async () => {
    const t = await readNexus(raw)
    const setA = t.collections!.find((c) => c.title === 'Collection A')!.sets[0]
    const pa = setA.pages.find((p) => p.title === 'Page A')!
    const pb = setA.pages.find((p) => p.title === 'Page B')!
    expect(pa.id).toBe(PAGE_A)
    expect(pa.icon).toBe('star')
    expect(pa.path).toBe('Collection A/Set A/Page A.md')
    expect(pb.id.startsWith('adopted-')).toBe(true)
  })
})

describe('readNexus — sidecar mode', () => {
  it('gates on _pagecollection.json, applies exclusion, reads schema + area color', async () => {
    const t = await readNexus(sidecar)
    expect(t.nexus.id).toBe('nx1')
    // Archive excluded; PlainFolder has no sidecar
    expect(t.collections!.map((c) => c.title)).toEqual(['Notes'])
    const notes = t.collections![0]
    expect(notes.sets.map((s) => s.title)).toEqual(['Daily'])
    expect(notes.pages.map((p) => p.title)).toEqual(['Loose'])
    expect(notes.sets[0].pages.map((p) => p.title)).toEqual(['Entry'])
    expect(notes.properties?.length).toBe(1)
    expect((notes.properties?.[0] as { name?: string })?.name).toBe('Status')
  })
})

describe('readNexus — agenda is config-driven, never name-reserved', () => {
  const roots: string[] = []
  const mk = (build: (root: string) => void): string => {
    const root = mkdtempSync(join(tmpdir(), 'pom-agenda-'))
    roots.push(root)
    d(join(root, '.nexus'))
    w(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nxg', createdAt: '2026' }))
    build(root)
    return root
  }
  afterAll(() =>
    roots.forEach((r) => {
      rmSync(r, { recursive: true, force: true })
    }),
  )

  it('hides a folder carrying _taskconfig/_eventconfig, whatever its name', async () => {
    const root = mk((r) => {
      d(join(r, 'My Reminders'))
      w(join(r, 'My Reminders', '_taskconfig.json'), '{}') // renamed Tasks singleton
      d(join(r, 'Real'))
      w(join(r, 'Real', '_pagecollection.json'), JSON.stringify({ id: 'c' }))
    })
    expect((await readNexus(root)).collections!.map((c) => c.title)).toEqual(['Real'])
  })

  it('shows a folder NAMED Agenda/Tasks that has a collection sidecar + no agenda config', async () => {
    const root = mk((r) => {
      d(join(r, 'Agenda'))
      w(join(r, 'Agenda', '_pagecollection.json'), JSON.stringify({ id: 'a' }))
      d(join(r, 'Tasks'))
      w(join(r, 'Tasks', '_pagecollection.json'), JSON.stringify({ id: 't' }))
    })
    // The names aren't reserved — only the agenda config sidecar hides a folder.
    expect((await readNexus(root)).collections!.map((c) => c.title).sort()).toEqual([
      'Agenda',
      'Tasks',
    ])
  })
})

describe('readNexus — registry-backed contexts', () => {
  let reg: string
  beforeAll(() => {
    reg = mkdtempSync(join(tmpdir(), 'pom-reg-'))
    d(join(reg, '.nexus'))
    w(join(reg, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nxr', createdAt: '2026' }))
    w(
      join(reg, '.nexus', 'contexts.json'),
      JSON.stringify({
        contexts: [
          { id: 'ctx_areas', title: 'Areas', singular: 'Area' },
          { id: 'ctx_topics', title: 'Topics', singular: 'Topic' },
          { id: 'ctx_projects', title: 'Projects', singular: 'Project' },
          { id: 'ctxC', title: 'Classes', singular: 'Class', icon: 'book' },
        ],
      }),
    )
    w(
      join(reg, '.nexus', 'state.json'),
      JSON.stringify({ space_orders: { ctx_projects: ['sp-cs-proj', 'sp-pom'] } }),
    )
    d(join(reg, '.nexus', 'contexts', 'Areas', 'Work'))
    w(
      join(reg, '.nexus', 'contexts', 'Areas', 'Work', '_space.json'),
      JSON.stringify({ id: 'sp-work', color: 'blue' }),
    )
    d(join(reg, '.nexus', 'contexts', 'Projects', 'Pommora'))
    w(
      join(reg, '.nexus', 'contexts', 'Projects', 'Pommora', '_space.json'),
      JSON.stringify({ id: 'sp-pom', color: 'cyan', '(Classes)': ['CS 161'] }),
    )
    d(join(reg, '.nexus', 'contexts', 'Projects', 'CS Project'))
    w(
      join(reg, '.nexus', 'contexts', 'Projects', 'CS Project', '_space.json'),
      JSON.stringify({ id: 'sp-cs-proj' }),
    )
    d(join(reg, '.nexus', 'contexts', 'Classes', 'CS 161'))
    w(
      join(reg, '.nexus', 'contexts', 'Classes', 'CS 161', '_space.json'),
      JSON.stringify({ id: 'sp-cs' }),
    )
    d(join(reg, 'Notes'))
    w(join(reg, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'col-n' }))
    w(
      join(reg, 'Notes', 'Linked.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRQ\n(Projects):\n  - Pommora\n---\nbody',
    )
    w(join(reg, 'Notes', 'Plain.md'), '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRR\n---\nbody')
  })
  afterAll(() => rmSync(reg, { recursive: true, force: true }))

  it('builds contexts in registry order with ordered spaces', async () => {
    const t = await readNexus(reg)
    expect(t.contexts?.map((g) => g.def.id)).toEqual([
      'ctx_areas',
      'ctx_topics',
      'ctx_projects',
      'ctxC',
    ])
    const projects = t.contexts?.find((g) => g.def.id === 'ctx_projects')
    expect(projects?.spaces.map((s) => s.id)).toEqual(['sp-cs-proj', 'sp-pom'])
    const pom = projects?.spaces.find((s) => s.id === 'sp-pom')
    expect(pom?.kind).toBe('space')
    expect(pom?.contextId).toBe('ctx_projects')
    expect(pom?.color).toBe('cyan')
    expect(pom?.path).toBe('.nexus/contexts/Projects/Pommora')
  })

  it('resolves wrapped page keys onto the node contextValues', async () => {
    const t = await readNexus(reg)
    const page = t.collections![0].pages.find((p) => p.id === PG_LINKED)
    expect(page?.contextValues).toEqual({ ctx_projects: ['sp-pom'] })
    const plain = t.collections![0].pages.find((p) => p.id === PG_PLAIN)
    expect(plain?.contextValues).toBeUndefined()
  })

  it('resolves a space sidecar own wrapped keys (space-to-space, cross-context)', async () => {
    const t = await readNexus(reg)
    const pom = t.contexts
      ?.find((g) => g.def.id === 'ctx_projects')
      ?.spaces.find((s) => s.id === 'sp-pom')
    expect(pom?.contextValues).toEqual({ ctxC: ['sp-cs'] })
  })
})

describe('readNexus — the walk names what it cannot read', () => {
  const INSIDE = '01KVGMT8BFG350FZZXAMG1QDRT'
  let root: string
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'pom-unread-'))
    d(join(root, '.nexus'))
    w(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nxu', createdAt: '2026' }))
    w(
      join(root, '.nexus', 'contexts.json'),
      JSON.stringify({ contexts: [{ id: 'ctx_a', title: 'Areas', singular: 'Area' }] }),
    )
    d(join(root, '.nexus', 'contexts', 'Areas', 'Good'))
    w(
      join(root, '.nexus', 'contexts', 'Areas', 'Good', '_space.json'),
      JSON.stringify({ id: 'sp-good' }),
    )
    d(join(root, '.nexus', 'contexts', 'Areas', 'Bad'))
    w(join(root, '.nexus', 'contexts', 'Areas', 'Bad', '_space.json'), '{corrupt')
    d(join(root, '.nexus', 'contexts', 'Areas', 'Plain')) // no _space.json -> not a Space, silent
    d(join(root, 'Notes'))
    w(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'col-n' }))
    w(join(root, 'Notes', 'Entry.md'), '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRS\n---\nbody')
    w(join(root, 'Notes', 'Alien.md'), '---\nTaskID: 01KVGMT8BFG350FZZXAMG1QDRV\n---\nbody')
    w(
      join(root, 'Notes', 'Dual.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRS\nTaskID: 01KVGMT8BFG350FZZXAMG1QDRV\n---\n',
    )
    w(join(root, 'Notes', 'Malformed.md'), '---\nPageID: not-a-ulid\n---\nbody')
    d(join(root, 'Broken'))
    w(join(root, 'Broken', '_pagecollection.json'), '{nope')
    w(join(root, 'Broken', 'Inside.md'), `---\nPageID: ${INSIDE}\n---\nbody`)
    d(join(root, 'PlainFolder')) // un-adopted, no sidecar -> silent
  })
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  it('records the corrupt sidecars and every Unknown admission; absence stays silent', async () => {
    const t = await readNexus(root)
    expect((t.unreadable ?? []).map((u) => u.path).sort()).toEqual([
      '.nexus/contexts/Areas/Bad',
      'Broken',
      'Notes/Alien.md',
      'Notes/Dual.md',
      'Notes/Malformed.md',
    ])
  })

  it('an unreadable container still walks — its children keep their identity', async () => {
    const t = await readNexus(root)
    const broken = t.collections!.find((c) => c.title === 'Broken')!
    expect(broken.id.startsWith('adopted-')).toBe(true)
    expect(broken.pages.map((p) => p.id)).toEqual([INSIDE])
  })

  it('a clean walk carries no list', async () => {
    expect((await readNexus(sidecar)).unreadable).toBeUndefined()
  })

  it('an unusable registry names itself — a blank Contexts layer is not mass deletion', async () => {
    const r = mkdtempSync(join(tmpdir(), 'pom-unread-reg-'))
    try {
      d(join(r, '.nexus'))
      w(join(r, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nxc', createdAt: '2026' }))
      w(join(r, '.nexus', 'contexts.json'), '{corrupt')
      const t = await readNexus(r)
      expect(t.contexts).toEqual([])
      expect(t.unreadable?.map((u) => u.path)).toEqual(['.nexus/contexts.json'])
    } finally {
      rmSync(r, { recursive: true, force: true })
    }
  })
})

describe('readNexus — real test nexus (optional smoke)', () => {
  const real = process.env.TEST_NEXUS_PATH || join(homedir(), 'test')
  it.runIf(existsSync(real))('reads the real nexus without throwing', async () => {
    const t = await readNexus(real)
    expect(Array.isArray(t.collections)).toBe(true)
  })
})

describe('readNexus — personalization', () => {
  const roots: string[] = []
  const mk = (settings: object): string => {
    const root = mkdtempSync(join(tmpdir(), 'pom-pers-'))
    roots.push(root)
    d(join(root, '.nexus'))
    w(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nxp', createdAt: '2026' }))
    w(join(root, '.nexus', 'settings.json'), JSON.stringify(settings))
    return root
  }
  afterAll(() =>
    roots.forEach((r) => {
      rmSync(r, { recursive: true, force: true })
    }),
  )

  it('reads accent from personalization.accent — its one home', async () => {
    expect((await readNexus(mk({ personalization: { accent: 'blue' } }))).accent).toBe('blue')
    expect((await readNexus(mk({ personalization: { accent: 'system' } }))).accent).toBe('system')
  })
  // The accent speaks the ramp's grammar now, so a stepped cell survives the read; a legacy solid
  // name still does too, since nothing on disk was rewritten.
  it('accepts a ramp cell as the accent', async () => {
    expect((await readNexus(mk({ personalization: { accent: 'purple-6' } }))).accent).toBe(
      'purple-6',
    )
    expect((await readNexus(mk({ personalization: { accent: 'grey-0' } }))).accent).toBe('grey-0')
  })
  it('an unknown accent name or a foreign top-level key resolves the default', async () => {
    expect((await readNexus(mk({ personalization: { accent: 'chartreuse' } }))).accent).toBe(
      DEFAULT_ACCENT,
    )
    expect((await readNexus(mk({ outside_accent: 'red' }))).accent).toBe(DEFAULT_ACCENT)
    expect((await readNexus(mk({ personalization: { accent: 'purple-8' } }))).accent).toBe(
      DEFAULT_ACCENT,
    )
  })

  // Each link color defers differently when unset, so each keeps its own sentinel on disk.
  it('reads both link colors, cells and sentinels alike', async () => {
    const read = async (p: Record<string, unknown>): Promise<Record<string, unknown>> =>
      (await readNexus(mk({ personalization: p }))).personalization as Record<string, unknown>
    expect((await read({ connectionColor: 'accent' })).connectionColor).toBe('accent')
    expect((await read({ connectionColor: 'red-6' })).connectionColor).toBe('red-6')
    expect((await read({ externalLinkColor: 'system' })).externalLinkColor).toBe('system')
    expect((await read({ externalLinkColor: 'blue-1' })).externalLinkColor).toBe('blue-1')
    expect((await read({ externalLinkColor: 'chartreuse' })).externalLinkColor).toBeUndefined()
    // The sentinels are not interchangeable — each names what its own setting inherits.
    expect((await read({ externalLinkColor: 'accent' })).externalLinkColor).toBeUndefined()
    expect((await read({ connectionColor: 'system' })).connectionColor).toBeUndefined()
  })
  it('reads the block, dropping invalid fields + unknown icon kinds', async () => {
    const t = await readNexus(
      mk({
        personalization: {
          connectionColor: 'cyan',
          hideChevrons: true,
          outlinerLines: 'nope', // not a boolean → dropped
          defaultIcons: { collection: 'gallery-vertical-end', bogus: 'x' },
        },
      }),
    )
    expect(t.personalization.connectionColor).toBe('cyan')
    expect(t.personalization.hideChevrons).toBe(true)
    expect(t.personalization.outlinerLines).toBeUndefined()
    expect(t.personalization.defaultIcons).toEqual({ collection: 'gallery-vertical-end' })
  })
  // The coercer gates the KIND key, never the glyph name — an override naming a glyph this build
  // won't draw survives the disk round trip intact, and the renderer decides what to do with it
  // (`entityIcon.test.ts` holds the resolving half). Validating names here would put the curated
  // roster, which is a renderer fact, on the other side of the process boundary.
  it('keeps an override verbatim, whatever glyph it names', async () => {
    const t = await readNexus(mk({ personalization: { defaultIcons: { context: 'anchor' } } }))
    expect(t.personalization.defaultIcons).toEqual({ context: 'anchor' })
  })
  // Every boolean knob at once: a key the writer persists but the reader never parses is silently
  // dropped, so the toggle appears to work and reverts on relaunch. Adding a knob adds it here.
  it('every boolean knob survives the round-trip', async () => {
    const keys = [
      'hideChevrons',
      'outlinerLines',
      'codeblockLineCount',
      'navCloseOnSelect',
      'revealTabBarOnHover',
      'connectionsOpenInPreview',
      'permanentDelete',
      'pasteLinkIntoText',
      'citationsShown',
      'jumpToCitation',
    ] as const
    const t = await readNexus(
      mk({ personalization: Object.fromEntries(keys.map((k) => [k, true])) }),
    )
    for (const k of keys) expect(t.personalization[k], k).toBe(true)
  })
  it('the linger survives the round-trip, clamped; zero and junk read as None', async () => {
    const at = async (v: unknown): Promise<number | undefined> =>
      (await readNexus(mk({ personalization: { hoverPreviewLinger: v } }))).personalization
        .hoverPreviewLinger
    expect(await at(5)).toBe(5)
    expect(await at(900)).toBe(30)
    expect(await at(0)).toBeUndefined()
    expect(await at('abc')).toBeUndefined()
  })
  it('the nexus date format survives the round-trip, and an unrecognized one reads as absent', async () => {
    const at = async (v: unknown): Promise<string | undefined> =>
      (await readNexus(mk({ personalization: { dateFormat: v } }))).personalization.dateFormat
    expect(await at('relative')).toBe('relative')
    expect(await at('nonsense')).toBeUndefined()
  })
  it('the clock reads from personalization; absent and junk alike read as the default', async () => {
    const at = async (settings: Record<string, unknown>): Promise<string | undefined> =>
      (await readNexus(mk(settings))).personalization.timeFormat
    expect(await at({ personalization: { timeFormat: 'twentyFourHour' } })).toBe('twentyFourHour')
    expect(await at({})).toBeUndefined()
    expect(await at({ personalization: { timeFormat: 'nonsense' } })).toBeUndefined()
  })
  it('the trash date format survives the round-trip, and an unrecognized one reads as absent', async () => {
    const at = async (v: unknown): Promise<string | undefined> =>
      (await readNexus(mk({ personalization: { trashDateFormat: v } }))).personalization
        .trashDateFormat
    expect(await at('dayMonthYear')).toBe('dayMonthYear')
    expect(await at('nonsense')).toBeUndefined()
  })
  // Both halves in one test on purpose: a coercer that returned undefined unconditionally would
  // satisfy a round-trip that only ever checked the default, so it has to be caught admitting a real
  // value as well as refusing a junk one.
  it('the default link format survives the round-trip, and an unrecognized one reads as absent', async () => {
    const at = async (v: unknown): Promise<string | undefined> =>
      (await readNexus(mk({ personalization: { defaultLinkFormat: v } }))).personalization
        .defaultLinkFormat
    expect(await at('link-short')).toBe('link-short')
    expect(await at('link-title')).toBe('link-title')
    expect(await at('link-url')).toBeUndefined()
    expect(await at('nonsense')).toBeUndefined()
    expect(await at(42)).toBeUndefined()
  })
  it('absent personalization → empty block', async () => {
    const t = await readNexus(mk({}))
    expect(t.personalization.connectionColor).toBeUndefined()
    expect(t.personalization.defaultIcons).toBeUndefined()
  })
})

describe('readNexus — structured labels', () => {
  const roots: string[] = []
  const mk = (settings: object): string => {
    const root = mkdtempSync(join(tmpdir(), 'pom-labels-'))
    roots.push(root)
    d(join(root, '.nexus'))
    w(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nxl', createdAt: '2026' }))
    w(join(root, '.nexus', 'settings.json'), JSON.stringify(settings))
    return root
  }
  afterAll(() =>
    roots.forEach((r) => {
      rmSync(r, { recursive: true, force: true })
    }),
  )

  it('parses the labels blob into the structured shape, defaulting absent pairs', async () => {
    const t = await readNexus(
      mk({
        labels: {
          page_collection: { singular: 'Library', plural: 'Libraries' },
          page_set: { singular: 'Shelf', plural: 'Shelves' },
          project: { singular: 'Initiative', plural: 'Initiatives' },
          agenda_task: { singular: 'Todo', plural: 'Todos' },
          agenda_event: { singular: 'Happening', plural: 'Happenings' },
        },
      }),
    )
    expect(t.labels.area).toEqual({ singular: 'Area', plural: 'Areas' })
    expect(t.labels.topic).toEqual({ singular: 'Topic', plural: 'Topics' })
    expect(t.labels.pageCollection).toEqual({ singular: 'Library', plural: 'Libraries' })
    expect(t.labels.pageSet).toEqual({ singular: 'Shelf', plural: 'Shelves' })
    expect(t.labels.project).toEqual({ singular: 'Initiative', plural: 'Initiatives' })
    expect(t.labels.agendaTask).toEqual({ singular: 'Todo', plural: 'Todos' })
    expect(t.labels.agendaEvent).toEqual({ singular: 'Happening', plural: 'Happenings' })
  })

  it('reads area/topic LabelPairs directly; a foreign key inside labels is inert', async () => {
    const t = await readNexus(
      mk({
        labels: {
          area: { singular: 'Zone', plural: 'Zones' },
          topic: { singular: 'Theme', plural: 'Themes' },
          outside_sections: { areas: 'IGNORED', topics: 'IGNORED' },
        },
      }),
    )
    expect(t.labels.area).toEqual({ singular: 'Zone', plural: 'Zones' })
    expect(t.labels.topic).toEqual({ singular: 'Theme', plural: 'Themes' })
  })

  it('falls back to defaults on missing keys (area/topic → Area(s)/Topic(s))', async () => {
    const t = await readNexus(mk({}))
    expect(t.labels.area).toEqual({ singular: 'Area', plural: 'Areas' })
    expect(t.labels.topic).toEqual({ singular: 'Topic', plural: 'Topics' })
    expect(t.labels.pageCollection).toEqual({ singular: 'Collection', plural: 'Collections' })
    expect(t.labels.pageSet).toEqual({ singular: 'Set', plural: 'Sets' })
    expect(t.labels.project.plural).toBe('Projects')
  })
})

describe('readNexus — profile (from settings)', () => {
  const roots: string[] = []
  const mk = (settings: object): string => {
    const root = mkdtempSync(join(tmpdir(), 'pom-profile-'))
    roots.push(root)
    d(join(root, '.nexus'))
    w(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nxp', createdAt: '2026' }))
    w(join(root, '.nexus', 'settings.json'), JSON.stringify(settings))
    return root
  }
  afterAll(() =>
    roots.forEach((r) => {
      rmSync(r, { recursive: true, force: true })
    }),
  )

  it('reads profile_image (rel path) + profile_subtitle from settings', async () => {
    const t = await readNexus(
      mk({ profile_image: '.nexus/assets/nxp/profile-abc.png', profile_subtitle: 'Mine' }),
    )
    expect(t.nexus.profileImage).toBe('.nexus/assets/nxp/profile-abc.png')
    expect(t.nexus.profileSubtitle).toBe('Mine')
  })

  it('defaults to null image + empty subtitle when absent', async () => {
    const t = await readNexus(mk({}))
    expect(t.nexus.profileImage).toBeNull()
    expect(t.nexus.profileSubtitle).toBe('')
  })
})

describe('readNexus — container paths (nexus-relative, for mutation addressing)', () => {
  let root: string
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'pom-paths-'))
    d(join(root, '.nexus'))
    // Collection -> Set -> Sub-Set -> Page.
    d(join(root, 'Notes', 'Daily', 'Morning'))
    w(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nxp', createdAt: '2026' }))
    w(join(root, '.nexus', 'settings.json'), '{}')
    w(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'c-notes' }))
    w(join(root, 'Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 's-daily' }))
    w(join(root, 'Notes', 'Daily', 'Morning', '_pageset.json'), JSON.stringify({ id: 's-morning' }))
    w(join(root, 'Notes', 'Daily', 'Morning', 'Entry.md'), '---\nid: e1\n---\n')
  })
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  it('carries each container + context path, POSIX-relative to the root', async () => {
    const t = await readNexus(root)
    const notes = t.collections![0]
    expect(notes.path).toBe('Notes')
    expect(notes.sets[0].path).toBe('Notes/Daily')
    expect(notes.sets[0].sets![0].path).toBe('Notes/Daily/Morning')
    expect(notes.sets[0].sets![0].pages[0].path).toBe('Notes/Daily/Morning/Entry.md')
  })
})

describe('PropertiesV2 — registry-resolved collection schema', () => {
  it('resolves assignment ids to registry defs in order, dropping dangling refs', async () => {
    const root = mkdtempSync(join(tmpdir(), 'pom-readnexus-v2-'))
    d(join(root, '.nexus'))
    w(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx' }))
    w(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        prop_a: {
          id: 'prop_a',
          name: 'Priority',
          type: 'select',
          select_options: [{ value: 'hi', label: 'High', color: 'red' }],
        },
        prop_b: { id: 'prop_b', name: 'Done', type: 'checkbox' },
      }),
    )
    d(join(root, 'Notes'))
    w(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col_notes', properties: ['prop_a', 'prop_gone', 'prop_b'] }),
    )

    const tree = await readNexus(root)
    const notes = tree.collections!.find((c) => c.id === 'col_notes')!
    expect(notes.properties?.map((p) => p.id)).toEqual(['prop_a', 'prop_b'])
    expect(notes.properties?.map((p) => p.name)).toEqual(['Priority', 'Done'])
    rmSync(root, { recursive: true, force: true })
  })
})
