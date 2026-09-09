// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { TrashRow } from '@pommora/core/Trash/trashRow'
import { countPhrase, filterRows, TrashFrame } from './TrashFrame'
import { stubDialer } from '../vitest.setup'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const row = (over: Partial<TrashRow>): TrashRow => ({
  bundlePath: `.trash/${over.title ?? 'x'}.deleted`,
  kind: 'page',
  title: 'Alpha',
  crumbs: [{ kind: 'collection', title: 'Notes' }],
  deletedAt: 0,
  homeResolves: true,
  ...over,
})

describe('filterRows', () => {
  const rows = [
    row({ title: 'Alpha', crumbs: [{ kind: 'collection', title: 'Notes' }] }),
    row({ title: 'Beta', crumbs: [{ kind: 'collection', title: 'Journals' }] }),
    row({ title: 'Gamma', crumbs: [] }),
  ]

  it('an empty query keeps the list whole and in the order it arrived', () => {
    expect(filterRows(rows, '').map((r) => r.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(filterRows(rows, '   ')).toBe(rows)
  })

  it('matches a title', () => {
    expect(filterRows(rows, 'bet').map((r) => r.title)).toEqual(['Beta'])
  })

  it('matches a location, so a row is findable by where it lived', () => {
    expect(filterRows(rows, 'journ').map((r) => r.title)).toEqual(['Beta'])
  })

  it('a query nothing answers yields nothing', () => {
    expect(filterRows(rows, 'zzz')).toEqual([])
  })

  it('a row with no location is still matched on its title alone', () => {
    expect(filterRows(rows, 'gamma').map((r) => r.title)).toEqual(['Gamma'])
  })
})

describe('countPhrase', () => {
  it('names the kind when every row shares one', () => {
    expect(countPhrase([row({}), row({})])).toBe('2 pages')
    expect(countPhrase([row({ kind: 'set' }), row({ kind: 'set' })])).toBe('2 sets')
    expect(countPhrase([row({ kind: 'context' }), row({ kind: 'context' })])).toBe('2 contexts')
  })

  it('generalizes when they do not', () => {
    expect(countPhrase([row({}), row({ kind: 'space' })])).toBe('2 items')
  })

  it('stays singular for one', () => {
    expect(countPhrase([row({})])).toBe('1 page')
    expect(countPhrase([row({ kind: 'space' })])).toBe('1 space')
  })

  it('reports none honestly', () => {
    expect(countPhrase([])).toBe('0 items')
  })
})

describe('a Trash row', () => {
  let host: HTMLDivElement | null = null
  let root: Root | null = null

  beforeEach(() => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'trash:list': vi.fn(async () => ({ ok: true, value: [row({ title: 'Alpha' })] })),
    })
  })
  afterEach(async () => {
    await act(async () => root?.unmount())
    host?.remove()
    root = null
    host = null
  })

  it('checks itself through the checkbox in its lead inset', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root?.render(<TrashFrame />))
    const box = host.querySelector('[role="checkbox"]') as HTMLButtonElement
    expect(box.getAttribute('aria-checked')).toBe('false')
    expect(host.querySelector('.has-checked')).toBeNull()
    await act(async () => box.click())
    expect(box.getAttribute('aria-checked')).toBe('true')
    expect(host.querySelector('.has-checked')).not.toBeNull()
  })
})
