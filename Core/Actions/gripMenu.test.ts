import { describe, expect, it } from 'vitest'
import { gripMenuItems } from './gripMenu'

describe('the block grip menu', () => {
  it('a linkable heading offers Rename, Copy Link, a Size set with its level in force, and a divided Delete', () => {
    const items = gripMenuItems({ kind: 'heading', level: 2, linkable: true })
    expect(items.map((i) => i.label)).toEqual(['Rename', 'Copy Link', 'Size', 'Delete'])
    expect(items[2].submenu?.find((r) => r.checked)).toMatchObject({
      label: 'Heading 2',
      action: 'size:2',
    })
    expect(items[3].separatorBefore).toBe(true)
  })

  it('a heading that cannot be linked omits Copy Link', () => {
    const items = gripMenuItems({ kind: 'heading', level: 2, linkable: false })
    expect(items.map((i) => i.label)).toEqual(['Rename', 'Size', 'Delete'])
  })

  it('an embed drills its source tree to page leaves and scales only once claimed', () => {
    const items = gripMenuItems({
      kind: 'embed',
      tree: [{ label: 'Notes', children: [{ label: 'Alpha', title: 'Alpha' }] }],
      zoom: null,
    })
    expect(items[0].submenu?.[0].submenu?.[0]).toEqual({ label: 'Alpha', action: 'source:Alpha' })
    expect(items[1]).toEqual({ label: 'Scale', submenu: [] })
    const claimed = gripMenuItems({ kind: 'embed', tree: [], zoom: 0.5 })
    expect(claimed[0]).toEqual({ label: 'Source', submenu: [] })
    expect(claimed[1].submenu?.find((r) => r.checked)?.action).toBe('zoom:0.5')
  })

  it('a webpage offers Edit Link and Scale', () => {
    expect(gripMenuItems({ kind: 'webpage', zoom: 1 }).map((i) => i.label)).toEqual([
      'Edit Link',
      'Scale',
      'Delete',
    ])
  })

  it('a list offers its Type set with the current kind in force', () => {
    const items = gripMenuItems({ kind: 'list', current: 'bullet' })
    expect(items[0].submenu?.map((r) => [r.label, r.action, r.checked])).toEqual([
      ['Bulleted', 'listKind:bullet', true],
      ['Numbered', 'listKind:ordered', false],
      ['Alphabetical', 'listKind:alphabetical', false],
      ['Checklist', 'listKind:checkbox', false],
      ['Arrowed', 'listKind:arrow', false],
    ])
  })

  it('a plain block offers Delete alone, undivided', () => {
    expect(gripMenuItems({ kind: 'plain' })).toEqual([{ label: 'Delete', action: 'delete' }])
  })
})
