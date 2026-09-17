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
})
