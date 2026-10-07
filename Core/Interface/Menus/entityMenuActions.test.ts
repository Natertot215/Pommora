// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { ok } from '../../Contract/result'
import { stubDialer } from '../../vitest.setup'
import { showEntityMenu } from './entityMenuActions'

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
