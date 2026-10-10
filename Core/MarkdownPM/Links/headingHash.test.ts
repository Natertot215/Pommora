import { describe, it, expect } from 'vitest'
import { scanDoc } from '../Engine/docScan'
import { headingHash } from './headingHash'

describe('headingHash', () => {
  it("a § typed in a wikilink's title half writes #", () => {
    const doc = '[[Page]]'
    const scan = scanDoc(doc)
    expect(headingHash(scan, 6, 6, '§')).toEqual({ from: 6, to: 6, insert: '#', selection: 7 })
  })

  it('a § typed in the alias half or in the heading stays §', () => {
    for (const [doc, at] of [
      ['[[Page|al]]', 9],
      ['[[Page#Se]]', 9],
    ] as const)
      expect(headingHash(scanDoc(doc), at, at, '§')).toBeNull()
  })

  it("a § typed in an embed's title writes #, since an embed is a connection", () => {
    expect(headingHash(scanDoc('![[Page]]'), 7, 7, '§')).toMatchObject({ insert: '#' })
    expect(headingHash(scanDoc('![[]]'), 3, 3, '§')).toMatchObject({ insert: '#' })
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

  it('a connection code touches is text, so a § anywhere in it stays', () => {
    const scan = scanDoc('[[`Page`]]')
    expect(headingHash(scan, 7, 7, '§')).toBeNull()
    expect(headingHash(scan, 8, 8, '§')).toBeNull()
    expect(headingHash(scanDoc('x `[[A`]] y'), 7, 7, '§')).toBeNull()
  })

  it('an empty title, [[ then §, is the title half', () => {
    expect(headingHash(scanDoc('[[]]'), 2, 2, '§')).toEqual({
      from: 2,
      to: 2,
      insert: '#',
      selection: 3,
    })
  })

  it('an unclosed title, [[Pa then §, is the title half', () => {
    expect(headingHash(scanDoc('[[Pa'), 4, 4, '§')).toMatchObject({ insert: '#' })
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

  it("a § typed in a markdown link's destination writes #, complete or still open", () => {
    for (const [doc, at] of [
      ['[a](Page)', 8],
      ['[a]()', 4],
      ['[a](Pa', 6],
    ] as const)
      expect(headingHash(scanDoc(doc), at, at, '§')).toEqual({
        from: at,
        to: at,
        insert: '#',
        selection: at + 1,
      })
  })

  it('a § typed in the label, in the fragment, or in an address stays §', () => {
    for (const [doc, at] of [
      ['[al](Page)', 2],
      ['[a](Page#Se)', 11],
      ['[a](https://x.com)', 17],
      ['[a](dir/Page)', 12],
    ] as const)
      expect(headingHash(scanDoc(doc), at, at, '§')).toBeNull()
  })

  it('a selection reaching past the destination stays §', () => {
    expect(headingHash(scanDoc('[a](Page) x'), 5, 11, '§')).toBeNull()
  })
})
