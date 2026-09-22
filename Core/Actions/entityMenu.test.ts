import { describe, expect, it } from 'vitest'
import { entityMenuItems } from './entityMenu'

const shape = (items: ReturnType<typeof entityMenuItems>): string[] =>
  items.flatMap((i) => [...(i.separatorBefore ? ['—'] : []), i.label])

const creators = [
  { label: 'New Page', req: { op: 'createPage' as const, parentPath: 'Notes', name: 'Untitled' } },
]

const SPACE = {
  kind: 'space' as const,
  id: 'a1',
  path: '.nexus/contexts/Realms/Work',
  title: 'Work',
  host: 'sidebar' as const,
}

describe('the sidebar entity menu', () => {
  it('a page draws the whole page menu, Reveal included', () => {
    const items = entityMenuItems(
      { kind: 'page', id: 'p1', path: 'Notes/A.md', title: 'A', alreadyOpen: true },
      [],
    )
    expect(items.map((i) => i.action)).toEqual([
      'title:newtab',
      'title:window',
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
    expect(items[0].label).toBe('Open')
  })

  it('a sidebar collection opens, creates, renames, deletes, locks, and reveals in four groups', () => {
    const items = entityMenuItems(
      { kind: 'collection', id: 'c1', path: 'Notes', title: 'Notes', host: 'sidebar' },
      creators,
    )
    expect(shape(items)).toEqual([
      'New Tab',
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
    ).toEqual(['Rename', 'Edit Icon', 'Delete', '—', 'Reveal Location'])
  })

  it('a Space draws its identity rows, then its two branches', () => {
    const half = [{ id: 'g1', name: 'Realms', options: [] }]
    expect(shape(entityMenuItems({ ...SPACE, spaces: half, properties: half }, []))).toEqual([
      'Preview',
      'New Tab',
      '—',
      'Rename',
      'Edit Icon',
      'Hide Icon',
      'Change Color',
      'Spaces',
      'Properties',
      '—',
      'Delete',
      '—',
      'Reveal Location',
    ])
    expect(
      entityMenuItems({ ...SPACE, headingIconHidden: true }, []).map((i) => i.label),
    ).toContain('Show Icon')
  })

  it('a Space with neither half draws no branch', () => {
    expect(shape(entityMenuItems(SPACE, []))).toEqual([
      'Preview',
      'New Tab',
      '—',
      'Rename',
      'Edit Icon',
      'Hide Icon',
      'Change Color',
      '—',
      'Delete',
      '—',
      'Reveal Location',
    ])
  })

  it('a Space leads with Preview, and follows Open with it once it holds a tab', () => {
    expect(shape(entityMenuItems(SPACE, [])).slice(0, 2)).toEqual(['Preview', 'New Tab'])
    expect(shape(entityMenuItems({ ...SPACE, alreadyOpen: true }, [])).slice(0, 2)).toEqual([
      'Open',
      'Preview',
    ])
  })

  it('a Context offers no Preview — only a Space and a page are window tabs', () => {
    expect(
      entityMenuItems({ kind: 'context', id: 'g1', path: 'Areas', title: 'Areas' }, []).map(
        (i) => i.action,
      ),
    ).not.toContain('preview')
  })

  it('a page carries the same two branches, after Edit Icon', () => {
    const items = entityMenuItems(
      {
        kind: 'page',
        id: 'p1',
        path: 'Notes/A.md',
        title: 'A',
        spaces: [{ id: 'g1', name: 'Realms', options: [] }],
        properties: [{ id: 'p1', name: 'Stage', options: [] }],
      },
      [],
    )
    const at = items.findIndex((i) => i.label === 'Edit Icon')
    expect(items.slice(at + 1, at + 3).map((i) => i.label)).toEqual(['Spaces', 'Properties'])
  })

  it('a Matrix node neither creates siblings nor locks', () => {
    const page = entityMenuItems(
      { kind: 'page', id: 'p1', path: 'Notes/A.md', title: 'A', host: 'matrix' },
      [],
    ).map((i) => i.action)
    expect(page).not.toContain('title:newabove')
    expect(page).not.toContain('title:newbelow')
    expect(page).toContain('title:rename')
    const set = entityMenuItems(
      { kind: 'set', id: 's1', path: 'Notes/S', title: 'S', host: 'matrix' },
      [],
    ).map((i) => i.action)
    expect(set).not.toContain('lock')
  })

  it('names the lock for the state it moves to', () => {
    const items = entityMenuItems(
      { kind: 'set', path: 'Notes/S', title: 'S', host: 'sidebar', disclosureLocked: true },
      [],
    )
    expect(items.find((i) => i.action === 'lock')?.label).toBe('Unlock Folder')
  })
})
