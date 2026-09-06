import { describe, expect, it } from 'vitest'
import { entityMenuItems } from './entityMenu'

const shape = (items: ReturnType<typeof entityMenuItems>): string[] =>
  items.flatMap((i) => [...(i.separatorBefore ? ['—'] : []), i.label])

const creators = [
  { label: 'New Page', req: { op: 'createPage' as const, parentPath: 'Notes', name: 'Untitled' } },
]

describe('the sidebar entity menu', () => {
  it('a page draws the whole page menu, Reveal included', () => {
    const items = entityMenuItems(
      { kind: 'page', id: 'p1', path: 'Notes/A.md', title: 'A', alreadyOpen: true },
      [],
    )
    expect(items.map((i) => i.action)).toEqual([
      'title:window',
      'title:newtab',
      'title:rename',
      'title:icon',
      'title:newabove',
      'title:newbelow',
      'title:copylink',
      'title:copypath',
      'title:history',
      'title:reveal',
      'title:delete',
    ])
    expect(items[1].label).toBe('Open')
  })

  it('a sidebar collection opens, creates, renames, deletes, locks, and reveals in four groups', () => {
    const items = entityMenuItems(
      { kind: 'collection', id: 'c1', path: 'Notes', title: 'Notes', host: 'sidebar' },
      creators,
    )
    expect(shape(items)).toEqual([
      'Open New Tab',
      '—',
      'New Page',
      '—',
      'Rename',
      'Delete',
      '—',
      'Lock Folder',
      'Reveal Location',
    ])
    expect(items.find((i) => i.action === 'lock')?.label).toBe('Lock Folder')
  })

  it('a band set neither opens nor locks, and a context without creators starts at Rename', () => {
    expect(
      shape(
        entityMenuItems({ kind: 'set', path: 'Notes/S', title: 'S', host: 'detail' }, creators),
      ),
    ).toEqual(['New Page', '—', 'Rename', 'Delete', '—', 'Reveal Location'])
    expect(
      shape(
        entityMenuItems({ kind: 'context', path: 'Areas', title: 'Areas', host: 'sidebar' }, []),
      ),
    ).toEqual(['Rename', 'Delete', '—', 'Reveal Location'])
  })

  it('names the lock for the state it moves to', () => {
    const items = entityMenuItems(
      { kind: 'set', path: 'Notes/S', title: 'S', host: 'sidebar', disclosureLocked: true },
      [],
    )
    expect(items.find((i) => i.action === 'lock')?.label).toBe('Unlock Folder')
  })
})
