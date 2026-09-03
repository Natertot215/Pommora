import { describe, expect, it } from 'vitest'
import { cardMenuModel } from './cardMenu'

describe('cardMenuModel', () => {
  it('lists the page-meta actions with one New Page — the grid has no above', () => {
    const m = cardMenuModel({ addable: [] })
    expect(m.items.map((i) => [i.label, i.action])).toEqual([
      ['Open New Tab', 'title:newtab'],
      ['Rename', 'title:rename'],
      ['Edit Icon', 'title:icon'],
      ['New Page', 'title:newbelow'],
      ['Copy Link', 'title:copylink'],
      ['Copy Path', 'title:copypath'],
      ['View History', 'title:history'],
      ['Delete', 'title:delete'],
    ])
    expect(m.items.find((i) => i.action === 'title:rename')?.separatorBefore).toBe(true)
    expect(m.items.find((i) => i.action === 'title:newbelow')?.separatorBefore).toBe(true)
    expect(m.items.find((i) => i.action === 'title:delete')?.separatorBefore).toBe(true)
  })

  it('an open page reads "Open"', () => {
    expect(cardMenuModel({ addable: [], alreadyOpen: true }).items[0].label).toBe('Open')
  })

  it('builds the Add Property submenu from the addable list, preserving order', () => {
    const m = cardMenuModel({
      addable: [
        { id: 'p1', name: 'Tags' },
        { id: 'p2', name: 'Due' },
      ],
    })
    expect(m.addProperty?.map((a) => [a.label, a.action])).toEqual([
      ['Tags', 'add:p1'],
      ['Due', 'add:p2'],
    ])
  })

  it('omits the Add Property submenu when nothing is addable', () => {
    expect(cardMenuModel({ addable: [] }).addProperty).toBeUndefined()
  })

  it('leads with Edit Image only when the image is editable', () => {
    expect(cardMenuModel({ addable: [] }).items.some((i) => i.action === 'image:edit')).toBe(false)
    const m = cardMenuModel({ addable: [], editableImage: true })
    expect(m.items[0]).toMatchObject({ label: 'Edit Image', action: 'image:edit' })
  })

  it('opens the send block with Move To once the card is given destinations', () => {
    const m = cardMenuModel({
      addable: [],
      moveTargets: [{ id: 'c1', label: 'Notes', path: 'Notes' }],
    })
    expect(m.items.slice(-5, -2).map((i) => i.action)).toEqual([
      'title:moveto',
      'title:copylink',
      'title:copypath',
    ])
  })
})
