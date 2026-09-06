import { describe, expect, it } from 'vitest'
import { gripMenuItems } from './gripMenu'

const STEPS = [
  { label: '1.00x', factor: 1 },
  { label: '0.50x', factor: 0.5 },
]

describe('the block grip menu', () => {
  it('a heading offers Rename, a Size set with its level in force, and a divided Delete', () => {
    const items = gripMenuItems({ kind: 'heading', level: 2 })
    expect(items.map((i) => i.label)).toEqual(['Rename', 'Size', 'Delete'])
    expect(items[1].submenu?.find((r) => r.checked)).toMatchObject({
      label: 'Heading 2',
      action: 'size:2',
    })
    expect(items[2].separatorBefore).toBe(true)
  })

  it('an embed drills its source tree to page leaves and scales only once claimed', () => {
    const items = gripMenuItems({
      kind: 'embed',
      tree: [{ label: 'Notes', children: [{ label: 'Alpha', title: 'Alpha' }] }],
      zoomSteps: STEPS,
      zoom: null,
    })
    expect(items[0].submenu?.[0].submenu?.[0]).toEqual({ label: 'Alpha', action: 'source:Alpha' })
    expect(items[1]).toMatchObject({ label: 'Scale', disabled: true })
    const claimed = gripMenuItems({ kind: 'embed', tree: [], zoomSteps: STEPS, zoom: 0.5 })
    expect(claimed[0]).toMatchObject({ label: 'Source', disabled: true })
    expect(claimed[1].submenu?.find((r) => r.checked)?.action).toBe('zoom:0.5')
  })

  it('a webpage offers Edit Link and Scale', () => {
    expect(
      gripMenuItems({ kind: 'webpage', zoomSteps: STEPS, zoom: 1 }).map((i) => i.label),
    ).toEqual(['Edit Link', 'Scale', 'Delete'])
  })

  it('a list offers its Type set with the current kind in force', () => {
    const items = gripMenuItems({ kind: 'list', current: 'bullet' })
    expect(items[0].submenu?.map((r) => [r.action, r.checked])).toEqual([
      ['listKind:ordered', false],
      ['listKind:bullet', true],
      ['listKind:checkbox', false],
      ['listKind:arrow', false],
    ])
  })

  it('a plain block offers Delete alone, undivided', () => {
    expect(gripMenuItems({ kind: 'plain' })).toEqual([
      { label: 'Delete', action: 'delete', separatorBefore: false },
    ])
  })
})
