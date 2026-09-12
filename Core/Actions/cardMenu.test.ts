import { describe, expect, it } from 'vitest'
import { cardMenuModel } from './cardMenu'

describe('cardMenuModel', () => {
  it('lists the page-meta actions with one New Page — the grid has no above', () => {
    const m = cardMenuModel({ addable: false })
    expect(m.map((i) => [i.label, i.action])).toEqual([
      ['Open New Tab', 'title:newtab'],
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

  it('an open page reads "Open"', () => {
    expect(cardMenuModel({ addable: false, alreadyOpen: true })[0].label).toBe('Open')
  })

  it('leads with an Add Property leaf that routes to the in-app picker', () => {
    const m = cardMenuModel({ addable: true })
    expect(m[0]).toMatchObject({ label: 'Add Property', action: 'add' })
    expect(m[0].submenu).toBeUndefined()
    expect(m[1].separatorBefore).toBe(true)
  })

  it('omits the Add Property row when nothing is addable', () => {
    expect(cardMenuModel({ addable: false }).some((i) => i.label === 'Add Property')).toBe(false)
  })

  it('leads with Edit Image only when the image is editable', () => {
    expect(cardMenuModel({ addable: false }).some((i) => i.action === 'image:edit')).toBe(false)
    const m = cardMenuModel({ addable: false, editableImage: true })
    expect(m[0]).toMatchObject({ label: 'Edit Image', action: 'image:edit' })
  })

  it('opens the send block with Move To once the card is given destinations', () => {
    const m = cardMenuModel({
      addable: false,
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
