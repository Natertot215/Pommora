import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { contextWorldOf, resolveContextKeys } from '../Contexts/contextResolve'
import {
  type GovernedWorld,
  reconcileGovernedRoot,
  gonePageEntry,
  pageWorldOf,
  rewriteRaw,
  rewriteRootAt,
  writtenRoot,
  writtenSpelling,
} from './governedRoot'
import { fail, fault } from '../Contract/result'
import { landValue } from '../Files/rootValues'
import { splitFrontmatter, UNPARSED_FRONTMATTER } from '../Files/pageFile'
import { byKey, type PropertyDefinition } from '../Properties/properties'
import { decodeValue, encodeValue } from '../Properties/propertyValue'
import type { ContextGroup, SpaceNode } from './tree'
import * as liveTree from './liveTree'
import { settledMutate } from '../Testing/settledMutate'
import { createFolderEntity } from './folderEntity'
import { newId } from './ids'
import { createTestPage } from '../Testing/createTestPage'
import { createProperty } from '../Properties/registryProperty'
import { openSession } from './session'

const space = (id: string, title: string, contextId: string): SpaceNode => ({
  id,
  kind: 'space',
  title,
  path: `.nexus/contexts/X/${title}`,
  contextId,
})

const groups: ContextGroup[] = [
  {
    def: { id: 'ctx_projects', title: 'Projects', singular: 'Project' },
    spaces: [space('sp1', 'Pommora', 'ctx_projects'), space('sp2', 'CS 161', 'ctx_projects')],
  },
  {
    def: { id: 'ctxA', title: 'Classes', singular: 'Class' },
    spaces: [space('sp3', '2024', 'ctxA'), space('sp4', 'true', 'ctxA')],
  },
]

const contexts = contextWorldOf(groups)

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  label: 'Status',
  key: 'Status',
  type: 'select',
  select_options: [
    { id: 'opt_Open', key: 'Open', label: 'Open' },
    { id: 'opt_Active', key: 'Active', label: 'Active' },
  ],
}
const tagsDef: PropertyDefinition = {
  id: 'prop_tags',
  label: 'Tags',
  key: 'Tags',
  type: 'multiSelect',
  select_options: [{ id: 'opt_alpha', key: 'alpha', label: 'alpha' }],
}
const stageDef: PropertyDefinition = {
  id: 'prop_stage',
  label: 'Stage',
  key: 'Stage',
  type: 'select',
  select_options: [
    { id: 'opt_Done', key: 'Done', label: 'Done' },
    { id: 'opt_Open', key: 'Open', label: 'Open' },
  ],
}
const notesDef: PropertyDefinition = {
  id: 'prop_notes',
  label: 'Notes',
  key: 'Notes',
  type: 'text',
}
const world: GovernedWorld = {
  contexts,
  defs: byKey([statusDef, tagsDef, stageDef, notesDef]),
}

describe('reconcileGovernedRoot — the context arm', () => {
  it('a live reconcile leaves a list naming an unknown Space, or holding a wikilink, as written', () => {
    const input = { '<Projects>': ['pommora', 'Pomora', 'CS 161'] }
    const root = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    const linked = { '<Projects>': ['pommora', [['Pommora']]] }
    expect(reconcileGovernedRoot(linked, world)).toEqual(linked)
  })

  it('keeps a scalar-typed member as the file spells it', () => {
    const root = reconcileGovernedRoot({ '<Classes>': [2024, true] }, world)
    expect(root['<Classes>']).toEqual([2024, true])
  })

  const withAreas = contextWorldOf([...groups, { def: { id: 'ctxB', title: 'Areas' }, spaces: [] }])
  const emptied = { '<Projects>': ['Pomora'], '<Classes>': [], '<Areas>': null }

  it('a live reconcile removes an empty list and a bare key, and keeps a key naming only an unknown Space as written', () => {
    const r = reconcileGovernedRoot(emptied, { ...world, contexts: withAreas })
    expect(r).toEqual({ '<Projects>': ['Pomora'] })
  })

  it('writes a Space named twice once', () => {
    expect(
      reconcileGovernedRoot({ '<Projects>': ['Pommora', 'Pommora'] }, world)['<Projects>'],
    ).toEqual(['Pommora'])
  })

  it('keeps a scalar Context value naming a Space as written, and reads it as a list of one, so a hand-typed tag resolves', () => {
    const root = reconcileGovernedRoot({ '<Projects>': 'Pommora' }, world)
    expect(root['<Projects>']).toBe('Pommora')
    expect(resolveContextKeys({ '<Projects>': 'Pommora' }, contexts).get('ctx_projects')).toEqual([
      'sp1',
    ])
  })

  it('leaves unknown wrapped keys and foreign keys verbatim', () => {
    const input = { '<Nonexistent>': ['x'], title_note: 'keep', '<Projects>': ['Pommora'] }
    const root = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
  })

  it('a world holding no Contexts skips the context arm while the property arm still runs', () => {
    const root = reconcileGovernedRoot(
      { '<Projects>': ['pommora'], Status: ['Active', 'Active'] },
      { ...world, contexts: contextWorldOf([]) },
    )
    expect(root['<Projects>']).toEqual(['pommora'])
    expect(root.Status).toEqual(['Active'])
  })
})

describe('reconcileGovernedRoot — the property arm', () => {
  it('a free-typed key keeps a foreign shape as written', () => {
    for (const raw of [42, true, ['milk', 'eggs'], [['Page']]]) {
      const root = reconcileGovernedRoot({ Notes: raw }, world)
      expect(root).toEqual({ Notes: raw })
    }
  })

  it('re-encodes an assigned key as its definition reads it, keeping a scalar that spells its option', () => {
    const collapsed = reconcileGovernedRoot({ Status: ['Active', 'Active'] }, world)
    expect(collapsed.Status).toEqual(['Active'])
    const kept = reconcileGovernedRoot({ Status: 'Active' }, world)
    expect(kept.Status).toBe('Active')
  })

  it('keeps a list that already reads canonically, unchanged', () => {
    expect(reconcileGovernedRoot({ Status: ['Active'] }, world)).toEqual({ Status: ['Active'] })
  })

  it('keeps an assigned key whose value reads as nothing as written', () => {
    const root = reconcileGovernedRoot({ Status: ['Wip'] }, world)
    expect(root).toEqual({ Status: ['Wip'] })
  })

  it('a Multi-Select keeps an unregistered option', () => {
    const root = reconcileGovernedRoot({ Tags: ['alpha', 'zeta'] }, world)
    expect(root.Tags).toEqual(['alpha', 'zeta'])
  })

  it('a Select holding several words lands as the one option it shows, and one naming no option stays as written', () => {
    const several = reconcileGovernedRoot({ Stage: ['Open', 'Done'] }, world)
    expect(several.Stage).toEqual(['Done'])
    const mixed = reconcileGovernedRoot({ Stage: ['Open', 'Zed'] }, world)
    expect(mixed.Stage).toEqual(['Open'])
    const none = reconcileGovernedRoot({ Stage: ['Zed'] }, world)
    expect(none.Stage).toEqual(['Zed'])
  })

  it('a Multi-Select holding a word no option names collapses its duplicates, keeping the word', () => {
    const root = reconcileGovernedRoot({ Tags: ['alpha', 'zeta', 'alpha'] }, world)
    expect(root.Tags).toEqual(['alpha', 'zeta'])
  })

  it('a Multi-Select’s options move ahead of the words no option names, as its own pick writes them', () => {
    const root = reconcileGovernedRoot({ Tags: ['zeta', 'alpha'] }, world)
    expect(root.Tags).toEqual(['alpha', 'zeta'])
  })

  it('a spaces-only Text value reads as nothing, so a reconcile drops it', () => {
    const root = reconcileGovernedRoot({ Notes: '   ' }, world)
    expect(root).toEqual({})
  })

  it('a registered key the Collection does not assign passes verbatim', () => {
    const root = reconcileGovernedRoot({ Priority: 5 }, world)
    expect(root.Priority).toBe(5)
  })

  it('agrees with decodeValue on every fixture (the crossing)', () => {
    for (const raw of [['Active'], 'Active', ['Open', 'Active'], ['Active', 'Wip'], ['Wip'], ''])
      expect(decodeValue(statusDef, reconcileGovernedRoot({ Status: raw }, world).Status)).toEqual(
        decodeValue(statusDef, raw),
      )
  })
})

describe('reconcileGovernedRoot — option, checkbox, and number spellings (the crossing)', () => {
  const doneDef: PropertyDefinition = {
    id: 'prop_done',
    label: 'Done',
    key: 'Done',
    type: 'checkbox',
  }
  const priceDef: PropertyDefinition = {
    id: 'prop_price',
    label: 'Price',
    key: 'Price',
    type: 'number',
  }
  const spelled: GovernedWorld = { ...world, defs: byKey([stageDef, doneDef, priceDef]) }
  const input = { Stage: ['done'], Done: 'Yes', Price: '$1,200.00' }

  it('keeps an option word in another casing as written, naming no option, beside the checkbox and number spellings', () => {
    const root = reconcileGovernedRoot(input, spelled)
    expect(root).toEqual(input)
    expect(decodeValue(stageDef, root.Stage)).toEqual({ kind: 'null' })
    expect(decodeValue(doneDef, root.Done)).toEqual({ kind: 'checkbox', value: true })
    expect(decodeValue(priceDef, root.Price)).toEqual({ kind: 'number', value: 1200 })
  })
})

describe('reconcileGovernedRoot — another casing', () => {
  it('leaves another casing of a list key and of a Context key as written', () => {
    const input = { tags: ['a'], '<projects>': ['pommora'] }
    const root = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
  })

  it("leaves a scalar key in another casing beside the property's own as written, as foreign", () => {
    const root = reconcileGovernedRoot({ Status: ['Open'], status: 'Done' }, world)
    expect(root).toEqual({ Status: ['Open'], status: 'Done' })
  })

  it('leaves a Context key naming an unknown Space wholly as written', () => {
    const input = { '<Projects>': ['pommora', 'Ghost'], '<projects>': ['CS 161'] }
    const root = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
  })
})

describe('reconcileGovernedRoot — skip', () => {
  it('passes the skipped key verbatim, and a key in another casing as foreign', () => {
    const input = { Status: 'Open', status: 'Done' }
    const root = reconcileGovernedRoot(input, world, 'Status')
    expect(root).toEqual(input)
  })
})

describe('gonePageEntry — the entry a restore parks', () => {
  const gone = { holds: () => false }
  it('reads an unquoted `[[Page]]` as the entry it spells', () => {
    expect(gonePageEntry([['Gone']], gone)).toBe('[[Gone]]')
  })
  it('reads a hand-written markdown link to a page', () => {
    expect(gonePageEntry('[x](Gone)', gone)).toBe('[x](Gone)')
  })
  it('leaves an address, a bare heading, and a page the world holds', () => {
    expect(gonePageEntry('[x](example.com)', gone)).toBeNull()
    expect(gonePageEntry('[[#Intro]]', gone)).toBeNull()
    expect(gonePageEntry('[[Alpha]]', { holds: (t) => t === 'Alpha' })).toBeNull()
  })
})

describe('writtenSpelling', () => {
  it('a string keeps a number, a list, and an unquoted wikilink the file spells when it reads as that text, and takes a typed string over anything else', () => {
    expect(writtenSpelling('42', 42)).toBe(42)
    expect(writtenSpelling('[milk, eggs]', ['milk', 'eggs'])).toEqual(['milk', 'eggs'])
    // The same link a Link key decodes an unquoted `[[Page]]` to, so re-saving it leaves the file alone; a different link lands as typed.
    expect(writtenSpelling('[[Page]]', [['Page']])).toEqual([['Page']])
    expect(writtenSpelling('[[007]]', [['007']])).toEqual([['007']])
    expect(writtenSpelling('[[Other|Page]]', [['Page']])).toBe('[[Other|Page]]')
    expect(writtenSpelling('forty-two', 42)).toBe('forty-two')
    expect(writtenSpelling('note', 'note')).toBe('note')
    expect(writtenSpelling('note', undefined)).toBe('note')
  })

  it('a one-member list keeps a scalar that spells its member, while another word or a second member writes the list', () => {
    expect(writtenSpelling(['Done'], 'Done')).toBe('Done')
    expect(writtenSpelling(['2024'], 2024)).toBe(2024)
    expect(writtenSpelling(['Done'], 'done')).toEqual(['Done'])
    expect(writtenSpelling(['Open'], 'Done')).toEqual(['Open'])
    expect(writtenSpelling(['alpha', 'beta'], 'alpha')).toEqual(['alpha', 'beta'])
  })

  it('gives each member the one held member its title names exactly; a member held twice keeps the registered spelling', () => {
    expect(writtenSpelling(['Done'], ['done', 'Done'])).toEqual(['Done'])
    expect(writtenSpelling(['Done'], ['done', 'DONE'])).toEqual(['Done'])
    expect(writtenSpelling(['Done', 'Active'], 'done')).toEqual(['Done', 'Active'])
  })

  it('a member keeps the held member that names it, of any scalar shape or as an unquoted wikilink, and a whole unquoted wikilink stays whole', () => {
    expect(writtenSpelling(['2024'], [2024])).toEqual([2024])
    expect(writtenSpelling(['[[A.png]]'], [[['a.png']]])).toEqual(['[[A.png]]'])
    expect(writtenSpelling(['[[a.png]]'], [['a.png']])).toEqual([['a.png']])
    expect(writtenSpelling(['[[a.png]]', '[[b.png]]'], [['a.png']])).toEqual([
      '[[a.png]]',
      '[[b.png]]',
    ])
  })

  it('a checked value keeps the checked word the file holds, and takes its unchecked word’s partner in the same casing', () => {
    expect(writtenSpelling(true, 'Yes')).toBe('Yes')
    expect(writtenSpelling(true, 'no')).toBe('yes')
    expect(writtenSpelling(true, 'No')).toBe('Yes')
    expect(writtenSpelling(true, 'OFF')).toBe('ON')
    expect(writtenSpelling(true, 'N')).toBe('Y')
    expect(writtenSpelling(true, 'false')).toBe('true')
  })

  it('a checked value the file never held stays true', () => {
    expect(writtenSpelling(true, undefined)).toBe(true)
  })
})

let dir: string
let page: string

beforeEach(async () => {
  dir = tempRoot('governed-')
  page = join(dir, 'p.md')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('rewriteRootAt', () => {
  it('writes one governed key and preserves foreign keys and comments', async () => {
    await writeFile(page, '---\nid: p1\n# keep me\nfoo: bar\n---\nbody\n')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, 'Status', 'Done')),
    )
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status: Done')
    expect(out).toContain('# keep me')
    expect(out).toContain('foo: bar')
    expect(out).toContain('body')
  })

  it('a write that changes no byte leaves the file, and its modification time, alone', async () => {
    await writeFile(page, '---\nid: p1\nStatus: Done\n---\nbody\n')
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(page, past, past)
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, 'Status', 'Done')),
    )
    expect(Math.floor((await stat(page)).mtimeMs / 1000)).toBe(Math.floor(past.getTime() / 1000))
  })

  it('leaves the other layer alone — a property write never touches a Context key', async () => {
    await writeFile(
      page,
      '---\nid: p1\n# keep\nStatus: Active\nDue: 2026-08-01\n<Projects>:\n  - Pommora\n---\n',
    )
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, 'Status', 'Live')),
    )
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status: Live')
    expect(out).toContain('Due: 2026-08-01')
    expect(out).toContain('<Projects>')
    expect(out).toContain('# keep')
  })

  it('a governed key absent from the next values is deleted — that is how a clear is said', async () => {
    await writeFile(page, '---\nid: p1\nStatus: Active\n---\n')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, 'Status', undefined)),
    )
    expect(await readFile(page, 'utf8')).not.toContain('Status')
  })

  it('a Context unassign deletes its key too', async () => {
    await writeFile(page, '---\nid: p1\n<Projects>:\n  - Pommora\n---\n')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, '<Projects>', undefined)),
    )
    expect(await readFile(page, 'utf8')).not.toContain('<Projects>')
  })

  it('writes no modified_at — a legacy one survives as foreign frontmatter', async () => {
    await writeFile(page, '---\nid: p1\nmodified_at: 2020-01-01T00:00:00.000Z\n---\n')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, 'Status', 'Done')),
    )
    const out = await readFile(page, 'utf8')
    expect(out).toContain('modified_at: 2020-01-01T00:00:00.000Z')
    expect(out.match(/modified_at/g)).toHaveLength(1)
  })

  it('writes the key plain — neither glyph needs quoting', async () => {
    await writeFile(page, '---\nid: p1\n---\n')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, 'Status', 'Done')),
    )
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, '<Areas>', ['Work'])),
    )
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status: Done')
    expect(out).toContain('<Areas>:')
    expect(out).not.toContain('"Status"')
  })

  it('answers not-found for a page that isn’t there, and writes nothing', async () => {
    const missing = join(dir, 'nope.md')
    expect(await rewriteRootAt(missing, () => null)).toEqual(fail('not-found', 'Page not found.'))
    expect(existsSync(missing)).toBe(false)
  })

  it('refuses a frontmatter that can’t round-trip, leaving it byte-identical', async () => {
    const before = '---\nid: p1\nStatus: [Open\n---\nbody\n'
    await writeFile(page, before)
    expect(
      await rewriteRootAt(
        page,
        rewriteRaw((raw) => landValue(raw, 'Status', ['Open'])),
      ),
    ).toEqual(fault(UNPARSED_FRONTMATTER))
    expect(await readFile(page, 'utf8')).toBe(before)
  })
})

describe('rewriteRootAt with a world — the three precedence rules', () => {
  const priority: PropertyDefinition = {
    id: 'prop_priority',
    label: 'Priority',
    key: 'Priority',
    type: 'select',
    select_options: [{ id: 'opt_High', key: 'High', label: 'High' }],
  }
  const status: PropertyDefinition = {
    id: 'prop_status',
    label: 'Status',
    key: 'Status',
    type: 'select',
    select_options: [{ id: 'opt_Open', key: 'Open', label: 'Open' }],
  }
  const world: GovernedWorld = {
    contexts: contextWorldOf([
      {
        def: { id: 'ctx_areas', title: 'Areas' },
        spaces: [{ kind: 'space', id: 'sp', title: 'Health', path: 'x', contextId: 'ctx_areas' }],
      },
    ]),
    defs: byKey([priority, status]),
  }

  it('an unassign deletes its key while the reconcile repairs the siblings', async () => {
    await writeFile(
      page,
      '---\nid: p1\n<Areas>:\n  - Health\nPriority:\n  - High\n  - High\n---\nbody\n',
    )
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, '<Areas>', undefined, world)),
    )
    const out = await readFile(page, 'utf8')
    expect(out).not.toContain('Areas')
    expect(out).toContain('Priority:\n  - High\n---')
  })

  it('a clear deletes its key while a drifted sibling is repaired', async () => {
    await writeFile(
      page,
      '---\nid: p1\nPriority:\n  - High\nStatus:\n  - Open\n  - Open\n---\nbody\n',
    )
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, 'Priority', undefined, world)),
    )
    const out = await readFile(page, 'utf8')
    expect(out).not.toContain('Priority')
    expect(out).toContain('Status:\n  - Open\n---')
  })

  it('keeps a mixed Context list — an unresolvable Space is never dropped by a sibling write', async () => {
    await writeFile(page, '---\nid: p1\n<Areas>:\n  - Health\n  - Ghost\n---\nbody\n')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, 'Status', 'Open', world)),
    )
    const out = await readFile(page, 'utf8')
    expect(out).toContain('- Health')
    expect(out).toContain('- Ghost')
    expect(out).toContain('Status: Open')
  })

  it('keeps a wholly unresolvable Context value rather than deleting the key', async () => {
    await writeFile(page, '---\nid: p1\n<Areas>:\n  - Ghost\n---\nbody\n')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, 'Status', 'Open', world)),
    )
    const out = await readFile(page, 'utf8')
    expect(out).toContain('<Areas>')
    expect(out).toContain('- Ghost')
  })

  it('keeps an own property that reconciles to blank rather than deleting it during a sibling write', async () => {
    await writeFile(page, '---\nid: p1\nPriority: Bogus\n---\nbody\n')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, 'Status', 'Done', world)),
    )
    const fm = splitFrontmatter(await readFile(page, 'utf8'))
    expect(fm.Priority).toBe('Bogus')
    expect(fm.Status).toBe('Done')
  })

  it('withholds an own multi-select that reconciles smaller, keeping the original list', async () => {
    const tags: PropertyDefinition = {
      id: 'prop_tags',
      label: 'Tags',
      key: 'Tags',
      type: 'multiSelect',
      select_options: [{ id: 'opt_alpha', key: 'alpha', label: 'alpha' }],
    }
    await writeFile(page, "---\nid: p1\nTags:\n  - ''\n  - alpha\n---\nbody\n")
    await rewriteRootAt(
      page,
      rewriteRaw((raw) =>
        writtenRoot(raw, 'Status', 'Done', {
          ...world,
          defs: byKey([tags]),
        }),
      ),
    )
    const fm = splitFrontmatter(await readFile(page, 'utf8'))
    expect(fm.Tags).toEqual(['', 'alpha'])
  })
})

describe('rewriteRootAt — spellings', () => {
  const tags: PropertyDefinition = {
    id: 'prop_tags',
    label: 'Tags',
    key: 'Tags',
    type: 'multiSelect',
    select_options: [
      { id: 'opt_a', key: 'a', label: 'a' },
      { id: 'opt_Docs', key: 'Docs', label: 'Docs' },
      { id: 'opt_Work', key: 'Work', label: 'Work' },
    ],
  }
  const done: PropertyDefinition = { id: 'prop_done', label: 'Done', key: 'Done', type: 'checkbox' }
  const price: PropertyDefinition = {
    id: 'prop_price',
    label: 'Price',
    key: 'Price',
    type: 'number',
  }
  const status: PropertyDefinition = {
    id: 'prop_status',
    label: 'Status',
    key: 'Status',
    type: 'select',
    select_options: [
      { id: 'opt_Open', key: 'Open', label: 'Open' },
      { id: 'opt_Done', key: 'Done', label: 'Done' },
    ],
  }
  const stage: PropertyDefinition = {
    id: 'prop_stage',
    label: 'Stage',
    key: 'Stage',
    type: 'select',
    select_options: [{ id: 'opt_done', key: 'done', label: 'Done' }],
  }
  const world: GovernedWorld = {
    contexts: contextWorldOf([]),
    defs: byKey([tags, done, status, price, stage]),
  }
  const seeded = async (keys: string): Promise<void> =>
    writeFile(page, `---\nid: p1\n${keys}\nfoo: bar\n---\nbody\n`)
  const lines = async (): Promise<string[]> => (await readFile(page, 'utf8')).split('\n')

  it('writes the exact key after the other keys, leaving another casing of it as written', async () => {
    await seeded('status: Open')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, 'Status', ['Done'], world)),
    )
    const fm = splitFrontmatter(await readFile(page, 'utf8'))
    expect(Object.keys(fm)).toEqual(['id', 'status', 'foo', 'Status'])
    expect(fm.status).toBe('Open')
    expect(fm.Status).toEqual(['Done'])
  })

  it('a checked box over an unchecked word lands as its pair’s checked word, cased alike', async () => {
    await seeded('Done: No')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, 'Done', true, world)),
    )
    expect(splitFrontmatter(await readFile(page, 'utf8')).Done).toBe('Yes')
  })

  it('a number lands in the spelling the file holds: quoted stays quoted, formatted stays formatted', async () => {
    await seeded(`Price: '30'`)
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, 'Price', 31, world)),
    )
    expect(await lines()).toContain(`Price: '31'`)
    await seeded('Price: $1,200')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, 'Price', 1300, world)),
    )
    expect(await lines()).toContain('Price: $1,300')
  })

  it('a write of the value a flow list already holds leaves the file byte-identical', async () => {
    await seeded('Tags: [a]')
    const before = await readFile(page, 'utf8')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, 'Tags', ['a'], world)),
    )
    expect(await readFile(page, 'utf8')).toBe(before)
  })

  it('a write of an option’s id over the key it holds leaves the file byte-identical, as the reconcile leaves it', async () => {
    await seeded('Stage: [done]')
    const before = await readFile(page, 'utf8')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) =>
        writtenRoot(raw, 'Stage', encodeValue(stage, { kind: 'select', value: 'opt_done' }), world),
      ),
    )
    expect(await readFile(page, 'utf8')).toBe(before)
    const held = splitFrontmatter(before)
    expect(reconcileGovernedRoot(held, world)).toEqual(held)
  })

  it('a Multi-Select write keeps the words no option names after the picked ones, and a clear drops the key', async () => {
    await seeded('Tags: [Docs, Ideas]')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, 'Tags', ['Docs', 'Work'], world)),
    )
    expect(await lines()).toContain('Tags: [Docs, Work, Ideas]')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => writtenRoot(raw, 'Tags', undefined, world)),
    )
    expect(await readFile(page, 'utf8')).not.toContain('Tags')
  })

  it('a banner write, which passes no world, writes its exact key beside another casing of it', async () => {
    await seeded('Banner: x')
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, 'banner', '[[b.png]]')),
    )
    const fm = splitFrontmatter(await readFile(page, 'utf8'))
    expect(fm.Banner).toBe('x')
    expect(fm.banner).toBe('[[b.png]]')
  })
})

describe('pageWorldOf', () => {
  let root: string
  let notes: string
  let statusId: string

  beforeEach(async () => {
    root = tempRoot('pom-world-')
    await openSession(root)
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'nexus.json'),
      JSON.stringify({ id: 'nx', createdAt: 'x' }),
    )
    const col = await createFolderEntity(root, 'collection', 'Notes', newId())
    if (!col.ok) throw new Error('setup')
    notes = col.value.path
    const status = await createProperty(root, {
      label: 'Status',
      type: 'select',
    })
    const priority = await createProperty(root, {
      label: 'Priority',
      type: 'number',
    })
    if (!status.ok || !priority.ok) throw new Error('setup')
    statusId = status.value.id
    await settledMutate(
      root,
      { op: 'assignProperty', containerPath: 'Notes', propertyId: statusId },
      { trashMode: 'nexus', trashToSystem: async () => {} },
    )
    await mkdir(join(root, 'Tasks'), { recursive: true })
    await writeFile(join(root, 'Tasks', '_taskconfig.json'), JSON.stringify({ id: 't1' }))
  })
  afterEach(async () => {
    liveTree.dropLiveTree()
    await rm(root, { recursive: true, force: true })
  })

  it('reads a page two Sets deep by its Collection’s definitions, and an Agenda page or a Space by none', async () => {
    const set = await createFolderEntity(notes, 'set', 'Daily', newId())
    if (!set.ok) throw new Error('setup')
    const inner = await createFolderEntity(set.value.path, 'set', 'Week', newId())
    if (!inner.ok) throw new Error('setup')
    const page = await createTestPage(inner.value.path, 'Deep', { body: 'b' })
    if (!page.ok) throw new Error('setup')
    const names = async (file: string): Promise<string[]> => [
      ...(await pageWorldOf(root, file)).defs.keys(),
    ]
    expect(await names(page.value.path)).toEqual(['Status'])
    expect(await names(join(root, 'Tasks', 'T.md'))).toEqual([])
    expect(await names(join(root, '.nexus', 'contexts', 'Areas', 'Home', '_space.json'))).toEqual(
      [],
    )
  })
})
