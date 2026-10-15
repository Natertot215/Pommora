import { describe, expect, it } from 'vitest'
import { type AliasEdit, aliasEdit, applyAliasEdit, heldAliases } from './aliasMemory'

const edit = (worn: string[], e: AliasEdit, title = 'Alpha') => applyAliasEdit(worn, e, title)

describe('adding an alias', () => {
  it('adds the trimmed words', () => {
    expect(edit([], { op: 'add', alias: '  the notes  ' })).toEqual(['the notes'])
  })

  it('a new alias joins the end', () => {
    expect(edit(['the notes', 'a'], { op: 'add', alias: 'my draft' })).toEqual([
      'the notes',
      'a',
      'my draft',
    ])
  })

  it('a held alias keeps its place', () => {
    expect(edit(['my draft', 'the notes', 'x'], { op: 'add', alias: 'the notes' })).toEqual([
      'my draft',
      'the notes',
      'x',
    ])
  })

  it('a held alias in another case is respelled in place', () => {
    expect(edit(['draft', 'x'], { op: 'add', alias: 'Draft' })).toEqual(['Draft', 'x'])
  })

  it("a blank alias or the page's own title leaves the list", () => {
    expect(edit(['a'], { op: 'add', alias: '  ' })).toEqual(['a'])
    expect(edit(['a'], { op: 'add', alias: 'ALPHA' })).toEqual(['a'])
  })
})

describe('moving an alias', () => {
  const list = ['a', 'b', 'c', 'd']

  it.each([
    [0, ['c', 'a', 'b', 'd']],
    [1, ['a', 'c', 'b', 'd']],
    [3, ['a', 'b', 'd', 'c']],
    [9, ['a', 'b', 'd', 'c']],
  ])('sets it at index %i among the others', (toIndex, after) => {
    expect(edit(list, { op: 'move', alias: 'c', toIndex })).toEqual(after)
  })

  it('keeps its stored spelling, matched whatever its case', () => {
    expect(edit(['Plan', 'x'], { op: 'move', alias: 'PLAN', toIndex: 1 })).toEqual(['x', 'Plan'])
  })

  it("an unknown alias, a blank name, or the page's own title leaves the list", () => {
    expect(edit(list, { op: 'move', alias: 'z', toIndex: 0 })).toEqual(list)
    expect(edit(list, { op: 'move', alias: '  ', toIndex: 0 })).toEqual(list)
    expect(edit([...list, 'Alpha'], { op: 'move', alias: 'alpha', toIndex: 0 })).toEqual(list)
  })

  it.each([-1, 1.5])('the schema refuses toIndex %d', (toIndex) => {
    expect(aliasEdit.safeParse({ op: 'move', alias: 'a', toIndex }).success).toBe(false)
  })
})

describe('renaming an alias', () => {
  it('renames in place', () => {
    expect(edit(['a', 'b', 'c'], { op: 'rename', from: 'b', to: 'B2' })).toEqual(['a', 'B2', 'c'])
  })

  it('renaming into an existing alias keeps the renamed position', () => {
    expect(edit(['a', 'b', 'c'], { op: 'rename', from: 'c', to: 'A' })).toEqual(['b', 'A'])
  })

  it('respells by case alone', () => {
    expect(edit(['a', 'notes'], { op: 'rename', from: 'notes', to: 'Notes' })).toEqual([
      'a',
      'Notes',
    ])
  })

  it("an unknown alias, a blank name, or the page's own title leaves the list", () => {
    expect(edit(['a', 'b'], { op: 'rename', from: 'z', to: 'y' })).toEqual(['a', 'b'])
    expect(edit(['a', 'b'], { op: 'rename', from: 'a', to: '  ' })).toEqual(['a', 'b'])
    expect(edit(['a', 'b'], { op: 'rename', from: 'a', to: 'alpha' })).toEqual(['a', 'b'])
  })
})

describe('forgetting an alias', () => {
  it('forgets any spelling', () => {
    expect(edit(['my draft', 'the notes'], { op: 'forget', alias: 'THE NOTES' })).toEqual([
      'my draft',
    ])
  })

  it('an unknown alias leaves the list', () => {
    expect(edit(['my draft'], { op: 'forget', alias: 'never given' })).toEqual(['my draft'])
  })
})

describe('tidying', () => {
  it('a page holds one spelling per name, the first standing, and none of its title', () => {
    expect(heldAliases(['Plan', 'plan', 'Alpha', 'x'], 'alpha')).toEqual(['Plan', 'x'])
  })

  it("any edit returns one spelling per name and none of the page's title", () => {
    expect(edit(['Plan', 'plan', 'Alpha'], { op: 'forget', alias: 'zzz' })).toEqual(['Plan'])
  })

  it('a page holds no name a link can’t carry', () => {
    expect(heldAliases(['a]b', 'x', 'two\nlines'], 'Alpha')).toEqual(['x'])
  })
})

describe('a name a link can’t carry', () => {
  it.each(['a]b', 'two\nlines', 'cr\rhere'])('%j is never added or renamed to', (n) => {
    expect(edit(['x'], { op: 'add', alias: n })).toEqual(['x'])
    expect(edit(['x'], { op: 'rename', from: 'x', to: n })).toEqual(['x'])
  })
})
