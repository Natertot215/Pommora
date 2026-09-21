import { describe, expect, it } from 'vitest'
import { cardMenuModel } from './cardMenu'

describe('cardMenuModel', () => {
  it('lists the page-meta actions with one New Page — the grid has no above', () => {
    const m = cardMenuModel({})
    expect(m.map((i) => [i.label, i.action])).toEqual([
      ['New Tab', 'title:newtab'],
      ['Rename', 'title:rename'],
      ['Edit Icon', 'title:icon'],
      ['New Page', 'title:newbelow'],
      ['Copy Link', 'title:copylink'],
      ['Copy Path', 'title:copypath'],
      ['View History', 'title:history'],
      ['Delete', 'title:delete'],
    ])
    expect(m.find((i) => i.action === 'title:rename')?.separatorBefore).toBe(true)
    expect(m.find((i) => i.action === 'title:newbelow')?.separatorBefore).toBe(true)
    expect(m.find((i) => i.action === 'title:delete')?.separatorBefore).toBe(true)
  })

  it('carries both page branches after Edit Icon', () => {
    const half = [{ id: 'g1', name: 'Realms', options: [] }]
    const m = cardMenuModel({ spaces: half, properties: half })
    const at = m.findIndex((i) => i.label === 'Edit Icon')
    expect(m.slice(at + 1, at + 3).map((i) => i.label)).toEqual(['Spaces', 'Properties'])
  })

  it('an open page reads "Open"', () => {
    expect(cardMenuModel({ alreadyOpen: true })[0].label).toBe('Open')
  })

  it('carries no Add Property row; Properties covers it', () => {
    expect(cardMenuModel({}).some((i) => i.label === 'Add Property')).toBe(false)
  })

  it('leads with Edit Image only when the image is editable', () => {
    expect(cardMenuModel({}).some((i) => i.action === 'image:edit')).toBe(false)
    const m = cardMenuModel({ editableImage: true })
    expect(m[0]).toMatchObject({ label: 'Edit Image', action: 'image:edit' })
  })

  it('opens the send block with Move To once the card is given destinations', () => {
    const m = cardMenuModel({
      moveTargets: [{ id: 'c1', label: 'Notes', path: 'Notes' }],
    })
    const actions = m.map((i) => i.action)
    const at = actions.indexOf('title:moveto')
    expect(actions.slice(at, at + 4)).toEqual([
      'title:moveto',
      'title:copylink',
      'title:copypath',
      'title:history',
    ])
  })
})
