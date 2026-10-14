import { describe, expect, it } from 'vitest'
import { type AliasEdit, applyAliasEdit } from './aliasMemory'

const edit = (worn: string[], e: AliasEdit, title = 'Alpha') => applyAliasEdit(worn, e, title)

describe('remembering an alias', () => {
  it('remembers the trimmed words', () => {
    expect(edit([], { op: 'remember', alias: '  the notes  ' })).toEqual(['the notes'])
  })

  it('a blank alias leaves the list', () => {
    expect(edit(['the notes'], { op: 'remember', alias: '   ' })).toEqual(['the notes'])
  })

  it('a new alias goes first', () => {
    expect(edit(['the notes'], { op: 'remember', alias: 'my draft' })).toEqual([
      'my draft',
      'the notes',
    ])
  })

  it('an existing alias moves first', () => {
    expect(edit(['my draft', 'the notes'], { op: 'remember', alias: 'the notes' })).toEqual([
      'the notes',
      'my draft',
    ])
  })

  it('a new spelling of an existing alias replaces it at the front', () => {
    expect(edit(['my draft', 'the notes'], { op: 'remember', alias: 'The Notes' })).toEqual([
      'The Notes',
      'my draft',
    ])
  })

  it("the page's own title leaves the list", () => {
    expect(edit(['my draft'], { op: 'remember', alias: 'alpha' })).toEqual(['my draft'])
  })
})

describe('adding an alias', () => {
  it('appends', () => {
    expect(edit(['a'], { op: 'add', alias: 'b' })).toEqual(['a', 'b'])
  })

  it('a new spelling of an existing alias moves to the end', () => {
    expect(edit(['draft', 'x'], { op: 'add', alias: 'Draft' })).toEqual(['x', 'Draft'])
  })

  it("a blank alias or the page's own title leaves the list", () => {
    expect(edit(['a'], { op: 'add', alias: '  ' })).toEqual(['a'])
    expect(edit(['a'], { op: 'add', alias: 'ALPHA' })).toEqual(['a'])
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
  it("any edit returns one spelling per name and none of the page's title", () => {
    expect(edit(['Plan', 'plan', 'Alpha'], { op: 'forget', alias: 'zzz' })).toEqual(['Plan'])
  })
})
