// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import { DEFAULT_VIEW_ID, type SavedView } from '@pommora/core/Views/views'
import { saveViewAdopting } from './viewMint'

const source = {
  kind: 'collection',
  id: 'col1',
  title: 'Col',
  path: 'Col',
  sets: [],
  pages: [],
  views: [],
} as unknown as CollectionNode

const sentinel: SavedView = {
  id: DEFAULT_VIEW_ID,
  name: 'Table',
  type: 'table',
  property_order: ['_title'],
  hidden_properties: [],
}

let calls: string[]

// Every key is recorded, not just the stubbed one: a second channel call is what this has to catch.
beforeEach(() => {
  calls = []
  ;(window as unknown as { nexus: unknown }).nexus = {
    ask: (key: string) => {
      calls.push(key)
      return Promise.resolve({ ok: true, value: { id: 'view_minted' } })
    },
  }
})

describe('saveViewAdopting', () => {
  it('a sentinel adoption issues exactly one channel call, views:save', async () => {
    const res = await saveViewAdopting(source, sentinel)
    expect(res.ok).toBe(true)
    expect(calls).toEqual(['views:save'])
  })

  it('a saved view is written the same way, with no extra call', async () => {
    await saveViewAdopting(source, { ...sentinel, id: 'view_a' })
    expect(calls).toEqual(['views:save'])
  })
})
