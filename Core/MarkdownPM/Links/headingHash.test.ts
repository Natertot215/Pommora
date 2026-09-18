import { describe, it, expect } from 'vitest'
import { scanDoc } from '../Engine/docScan'
import { headingHash } from './headingHash'

describe('headingHash', () => {
  it("a § typed in a wikilink's title half writes #", () => {
    const doc = '[[Page]]'
    const scan = scanDoc(doc)
    expect(headingHash(scan, 6, 6, '§')).toEqual({ from: 6, to: 6, insert: '#', selection: 7 })
  })

  it('a § typed in the alias half, in an embed, or in the heading stays §', () => {
    for (const [doc, at] of [
      ['[[Page|al]]', 9],
      ['![[Page]]', 7],
      ['[[Page#Se]]', 9],
    ] as const)
      expect(headingHash(scanDoc(doc), at, at, '§')).toBeNull()
  })

  it('a § typed in prose does nothing', () => {
    const doc = 'plain prose '
    const scan = scanDoc(doc)
    expect(headingHash(scan, doc.length, doc.length, '§')).toBeNull()
  })

  it('a § typed inside a code span inside a link does nothing', () => {
    const doc = '[[`abc`]]'
    const scan = scanDoc(doc)
    expect(headingHash(scan, 4, 4, '§')).toBeNull()
  })

  it('a § at the closing backtick stays, and one past it writes #', () => {
    const scan = scanDoc('[[`Page`]]')
    expect(headingHash(scan, 7, 7, '§')).toBeNull()
    expect(headingHash(scan, 8, 8, '§')).toEqual({ from: 8, to: 8, insert: '#', selection: 9 })
  })

  it('an empty title, [[ then §, is the title half', () => {
    expect(headingHash(scanDoc('[[]]'), 2, 2, '§')).toEqual({
      from: 2,
      to: 2,
      insert: '#',
      selection: 3,
    })
    expect(headingHash(scanDoc('![[]]'), 3, 3, '§')).toBeNull()
  })

  it('a § typed over a selection inside the title replaces it with #', () => {
    expect(headingHash(scanDoc('[[Alpha]]'), 2, 7, '§')).toEqual({
      from: 2,
      to: 7,
      insert: '#',
      selection: 3,
    })
    expect(headingHash(scanDoc('[[Alpha]] x'), 2, 10, '§')).toBeNull()
  })
})
