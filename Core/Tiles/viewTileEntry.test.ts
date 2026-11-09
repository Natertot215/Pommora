import { describe, expect, it } from 'vitest'
import { DEFAULT_VIEW_ID } from '../Views/views'
import { embeddedViews } from './viewTileEntry'

const el = (id?: unknown): unknown => ({ source_id: 'c', config: id === undefined ? {} : { id } })
const idsOf = (els: unknown[], entryId: string): string[] =>
  embeddedViews(els, entryId).map((v) => v.id)

describe('embeddedViews', () => {
  it('keeps every stored id that no earlier sibling claimed', () => {
    expect(idsOf([el('view_a'), el('view_b')], 'T')).toEqual(['view_a', 'view_b'])
  })

  it('gives a missing, unsaved, or repeated id a positional one no sibling holds', () => {
    const ids = idsOf([el('embed:T:1'), el(), el(DEFAULT_VIEW_ID), el('embed:T:1'), 'junk'], 'T')
    expect(ids).toEqual(['embed:T:1', 'embed:T:2', 'embed:T:3', 'embed:T:4', 'embed:T:5'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never lets a positional id take a stored one from a later sibling', () => {
    expect(idsOf([el(), el('embed:T:0')], 'T')).toEqual(['embed:T:1', 'embed:T:0'])
  })
})
