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
  it('a sidebar collection opens, creates, renames, locks, copies its path, and reveals, closing on Delete alone', () => {
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
      '—',
      'Lock Folder',
      'Copy Path',
      'Reveal Location',
      '—',
      'Delete',
    ])
    expect(items.some((i) => i.action === 'title:archive')).toBe(false)
    expect(items.at(-1)?.action).toBe('title:delete')
    expect(items.find((i) => i.action === 'lock')?.label).toBe('Lock Folder')
    expect(items.find((i) => i.label === 'Reveal Location')?.action).toBe('title:reveal')
  })

  it('a band set neither opens nor locks and closes on Archive above Delete, and a context without creators starts at Rename', () => {
    expect(
      shape(
        entityMenuItems({ kind: 'set', path: 'Notes/S', title: 'S', host: 'detail' }, creators),
      ),
    ).toEqual([
      'New Page',
      '—',
      'Rename',
      '—',
      'Copy Path',
      'Reveal Location',
      '—',
      'Archive',
      'Delete',
    ])
    const context = entityMenuItems(
      { kind: 'context', path: 'Areas', title: 'Areas', host: 'sidebar' },
      [],
    )
    expect(shape(context)).toEqual(['Rename', 'Edit Icon', '—', 'Delete'])
    expect(context.at(-1)?.action).toBe('title:delete')
  })

  it('a Space draws its identity rows, then its two branches', () => {
    const metadata = [
      { label: 'Spaces', submenu: [] },
      { label: 'Properties', submenu: [] },
    ]
    expect(shape(entityMenuItems({ ...SPACE, metadata }, []))).toEqual([
      'Preview',
      'New Tab',
      '—',
      'Rename',
      'Edit Icon',
      'Spaces',
      'Properties',
      '—',
      'Delete',
    ])
    expect(shape(entityMenuItems({ ...SPACE, host: 'matrix' }, [])).slice(3, 6)).toEqual([
      'Rename',
      'Edit Icon',
      'Change Color',
    ])
  })

  it('a Space with neither half draws no branch, and follows Open with Preview once it holds a tab', () => {
    expect(shape(entityMenuItems(SPACE, []))).toEqual([
      'Preview',
      'New Tab',
      '—',
      'Rename',
      'Edit Icon',
      '—',
      'Delete',
    ])
    expect(shape(entityMenuItems({ ...SPACE, alreadyOpen: true }, [])).slice(0, 2)).toEqual([
      'Open',
      'Preview',
    ])
  })

  it('a Matrix Set never locks', () => {
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
