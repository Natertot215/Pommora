import { describe, expect, it } from 'vitest'
import { contextWorldOf, resolveContextKeys } from '../Contexts/contextResolve'
import {
  type GovernedWorld,
  reconcileGovernedRoot,
  reencode,
  gonePageEntry,
  writtenSpelling,
} from './governedRoot'
import { byKey, type PropertyDefinition } from '../Properties/properties'
import { decodeValue } from '../Properties/propertyValue'
import type { ContextGroup, SpaceNode } from './tree'

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
    { key: 'Open', label: 'Open' },
    { key: 'Active', label: 'Active' },
  ],
}
const tagsDef: PropertyDefinition = {
  id: 'prop_tags',
  label: 'Tags',
  key: 'Tags',
  type: 'multiSelect',
  select_options: [{ key: 'alpha', label: 'alpha' }],
}
const stageDef: PropertyDefinition = {
  id: 'prop_stage',
  label: 'Stage',
  key: 'Stage',
  type: 'select',
  select_options: [
    { key: 'Done', label: 'Done' },
    { key: 'Open', label: 'Open' },
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
  it('drops unknowns, keeping each known Space as the file spells it', () => {
    const { root, changed } = reconcileGovernedRoot(
      { '<Projects>': ['pommora', 'Pomora', 'CS 161'] },
      world,
      {},
    )
    expect(root['<Projects>']).toEqual(['CS 161'])
    expect(changed).toEqual(['<Projects>'])
  })

  it('a live reconcile leaves a list naming an unknown Space, or holding a wikilink, as written', () => {
    const input = { '<Projects>': ['pommora', 'Pomora', 'CS 161'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
    const linked = { '<Projects>': ['pommora', [['Pommora']]] }
    expect(reconcileGovernedRoot(linked, world).root).toEqual(linked)
  })

  it('keeps a scalar-typed member as the file spells it', () => {
    const { root } = reconcileGovernedRoot({ '<Classes>': [2024, true] }, world)
    expect(root['<Classes>']).toEqual([2024, true])
  })

  const withAreas = contextWorldOf([...groups, { def: { id: 'ctxB', title: 'Areas' }, spaces: [] }])
  const emptied = { '<Projects>': ['Pomora'], '<Classes>': [], '<Areas>': null }

  it('removes a key whose values all drop, a present-but-empty list, and a bare key (no empties)', () => {
    const { root, changed } = reconcileGovernedRoot(emptied, { ...world, contexts: withAreas }, {})
    expect('<Projects>' in root).toBe(false)
    expect('<Classes>' in root).toBe(false)
    expect('<Areas>' in root).toBe(false)
    expect(changed.sort()).toEqual(['<Areas>', '<Classes>', '<Projects>'])
  })

  it('a live reconcile keeps an empty list, a bare key, and a key naming only an unknown Space as written', () => {
    const r = reconcileGovernedRoot(emptied, { ...world, contexts: withAreas })
    expect(r.root).toEqual(emptied)
    expect(r.changed).toEqual([])
  })

  it('writes a Space named twice once', () => {
    expect(
      reconcileGovernedRoot({ '<Projects>': ['Pommora', 'Pommora'] }, world).root['<Projects>'],
    ).toEqual(['Pommora'])
  })

  it('reads a scalar Context value as a list of one, so a hand-typed tag resolves', () => {
    const { root, changed } = reconcileGovernedRoot({ '<Projects>': 'Pommora' }, world)
    expect(root['<Projects>']).toEqual(['Pommora'])
    expect(changed).toEqual(['<Projects>'])
    expect(resolveContextKeys({ '<Projects>': 'Pommora' }, contexts).get('ctx_projects')).toEqual([
      'sp1',
    ])
  })

  it('leaves unknown wrapped keys and foreign keys verbatim', () => {
    const input = { '<Nonexistent>': ['x'], title_note: 'keep', '<Projects>': ['Pommora'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })

  it('a world holding no Contexts skips the context arm while the property arm still runs', () => {
    const { root, changed } = reconcileGovernedRoot(
      { '<Projects>': ['pommora'], Status: 'Active' },
      { ...world, contexts: contextWorldOf([]) },
    )
    expect(root['<Projects>']).toEqual(['pommora'])
    expect(root.Status).toEqual(['Active'])
    expect(changed).toEqual(['Status'])
  })
})

describe('reconcileGovernedRoot — the property arm', () => {
  it('a free-typed key keeps a foreign shape as written, live and frozen alike', () => {
    for (const raw of [42, true, ['milk', 'eggs'], [['Page']]]) {
      const live = reconcileGovernedRoot({ Notes: raw }, world)
      expect(live.root).toEqual({ Notes: raw })
      expect(live.changed).toEqual([])
      const frozen = reconcileGovernedRoot({ Notes: raw }, world, {})
      expect(frozen.root).toEqual({ Notes: raw })
      expect(frozen.changed).toEqual([])
    }
  })

  it('re-encodes an assigned key as its definition reads it', () => {
    const { root, changed } = reconcileGovernedRoot({ Status: 'Active' }, world)
    expect(root.Status).toEqual(['Active'])
    expect(changed).toEqual(['Status'])
  })

  it('keeps a list that already reads canonically, unchanged', () => {
    const { changed } = reconcileGovernedRoot({ Status: ['Active'] }, world)
    expect(changed).toEqual([])
  })

  it('keeps an assigned key whose value reads as nothing as written, and a restore deletes it', () => {
    const live = reconcileGovernedRoot({ Status: ['Wip'] }, world)
    expect(live.root).toEqual({ Status: ['Wip'] })
    expect(live.changed).toEqual([])
    const frozen = reconcileGovernedRoot({ Status: ['Wip'] }, world, {})
    expect('Status' in frozen.root).toBe(false)
    expect(frozen.changed).toEqual(['Status'])
  })

  it('a Multi-Select keeps an unregistered option', () => {
    const { root, changed } = reconcileGovernedRoot({ Tags: ['alpha', 'zeta'] }, world)
    expect(root.Tags).toEqual(['alpha', 'zeta'])
    expect(changed).toEqual([])
  })

  it('a registered key the Collection does not assign passes verbatim', () => {
    const { root, changed } = reconcileGovernedRoot({ Priority: 5 }, world)
    expect(root.Priority).toBe(5)
    expect(changed).toEqual([])
  })

  it('agrees with decodeValue on every fixture (the crossing)', () => {
    for (const raw of [['Active'], 'Active', ['Open', 'Active'], ['Active', 'Wip'], ['Wip'], ''])
      expect(
        decodeValue(statusDef, reconcileGovernedRoot({ Status: raw }, world).root.Status),
      ).toEqual(decodeValue(statusDef, raw))
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
    const { root } = reconcileGovernedRoot(input, spelled)
    expect(root).toEqual(input)
    expect(decodeValue(stageDef, root.Stage)).toEqual({ kind: 'null' })
    expect(decodeValue(doneDef, root.Done)).toEqual({ kind: 'checkbox', value: true })
    expect(decodeValue(priceDef, root.Price)).toEqual({ kind: 'number', value: 1200 })
  })
})

describe('reconcileGovernedRoot — another casing', () => {
  it('leaves another casing of a list key and of a Context key as written', () => {
    const input = { tags: ['a'], '<projects>': ['pommora'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })

  it("leaves a scalar key in another casing beside the property's own as written, as foreign", () => {
    const { root, changed } = reconcileGovernedRoot({ Status: ['Open'], status: 'Done' }, world)
    expect(root).toEqual({ Status: ['Open'], status: 'Done' })
    expect(changed).toEqual([])
  })

  it('leaves a Context key naming an unknown Space wholly as written', () => {
    const input = { '<Projects>': ['pommora', 'Ghost'], '<projects>': ['CS 161'] }
    const { root, changed } = reconcileGovernedRoot(input, world)
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })

  it('a restore drops a key reading as nothing and leaves another casing of it as written', () => {
    const { root, changed } = reconcileGovernedRoot(
      { Stage: ['Bogus'], stage: ['Done'] },
      world,
      {},
    )
    expect(root).toEqual({ stage: ['Done'] })
    expect(changed).toEqual(['Stage'])
  })
})

describe('reconcileGovernedRoot — skip', () => {
  it('passes the skipped key verbatim, and a key in another casing as foreign', () => {
    const input = { Status: 'Open', status: 'Done' }
    const { root, changed } = reconcileGovernedRoot(input, world, undefined, 'Status')
    expect(root).toEqual(input)
    expect(changed).toEqual([])
  })
})

const def = (over: Partial<PropertyDefinition>): PropertyDefinition =>
  ({ id: 'p', label: 'P', key: 'P', type: 'select', ...over }) as PropertyDefinition

describe('reencode — a frozen copy names only what still exists', () => {
  const link = def({ type: 'link' })
  const holds = (title: string): boolean => title === 'Alpha'

  it('keeps a Link value naming a page the world holds, whatever it carries', () => {
    const value = '[[Alpha#Intro|see]]'
    expect(reencode(link, value, { holds })).toBe(value)
  })

  it('drops a Link value naming a page the world doesn’t hold', () => {
    expect(reencode(link, '[[Gone]]', { holds })).toBeUndefined()
  })

  it('drops a hand-written markdown link naming a page the world doesn’t hold, and keeps an address', () => {
    expect(reencode(link, '[x](Gone)', { holds })).toBeUndefined()
    expect(reencode(link, '[x](example.com)', { holds })).toBe('[x](example.com)')
  })

  it('keeps a Link value naming only a heading of the page it sits on', () => {
    const value = '[[#Intro]]'
    expect(reencode(link, value, { holds })).toBe(value)
  })

  it('keeps an address, and a live read or an options-only freeze keeps any page', () => {
    const url = 'https://example.com'
    expect(reencode(link, url, { holds })).toBe(url)
    expect(reencode(link, '[[Gone]]')).toBe('[[Gone]]')
    expect(reencode(link, '[[Gone]]', {})).toBe('[[Gone]]')
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
