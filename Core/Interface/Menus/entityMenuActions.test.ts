// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { ok } from '../../Contract/result'
import { stubDialer } from '../../vitest.setup'
import { showEntityMenu } from './entityMenuActions'

const { confirmArchive, confirmDelete } = vi.hoisted(() => ({
  confirmArchive: vi.fn(async () => {}),
  confirmDelete: vi.fn(async () => {}),
}))
vi.mock('../Confirm/confirmations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../Confirm/confirmations')>()),
  confirmArchive,
  confirmDelete,
}))

const picked = vi.fn<() => string | null>()
const copyPath = vi.fn(async () => ok(null))
const reveal = vi.fn(async () => ok(null))
;(window as unknown as { nexus: unknown }).nexus = stubDialer({
  menu: async () => ok(picked()),
  'path:copy': copyPath,
  'path:reveal': reveal,
})

describe('a folder answers its path verbs', () => {
  it('Copy Path and Reveal Location ask the host with the folder’s own path', async () => {
    const set = { kind: 'set', id: 's1', path: 'Notes/Drafts', title: 'Drafts' } as const
    picked.mockReturnValueOnce('title:copypath')
    await showEntityMenu({ ...set, host: 'sidebar' })
    expect(copyPath).toHaveBeenCalledWith('Notes/Drafts')
    picked.mockReturnValueOnce('title:reveal')
    await showEntityMenu({ ...set, host: 'detail' })
    expect(reveal).toHaveBeenCalledWith('Notes/Drafts')
  })
})

describe('Archive and Delete reach their confirmations', () => {
  it('a page’s and a Set’s Archive ask to archive, and a Space’s Delete asks to delete', async () => {
    picked.mockReturnValueOnce('title:archive')
    await showEntityMenu({ kind: 'page', id: 'p1', path: 'Notes/A.md', title: 'A' })
    picked.mockReturnValueOnce('title:archive')
    await showEntityMenu({ kind: 'set', path: 'Notes/S', title: 'S', host: 'detail' })
    expect(confirmArchive.mock.calls).toEqual([
      [{ path: 'Notes/A.md', kind: 'page', title: 'A' }],
      [{ path: 'Notes/S', kind: 'set', title: 'S' }],
    ])
    picked.mockReturnValueOnce('title:delete')
    await showEntityMenu({
      kind: 'space',
      id: 'a1',
      path: '.nexus/contexts/Realms/Work',
      title: 'Work',
      host: 'sidebar',
    })
    expect(confirmDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'space',
        path: '.nexus/contexts/Realms/Work',
        title: 'Work',
      }),
    )
  })
})
