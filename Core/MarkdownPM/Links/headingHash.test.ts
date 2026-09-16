import { describe, it, expect } from 'vitest'
import { scanDoc } from '../Engine/docScan'
import { headingHash } from './headingHash'

describe('headingHash', () => {
  it('a § typed inside a wikilink writes #', () => {
    const doc = '[[Page|'
    const scan = scanDoc(doc)
    const e = headingHash(scan, doc.length, doc.length, '§')
    expect(e).toEqual({ from: doc.length, to: doc.length, insert: '#', selection: doc.length + 1 })
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
