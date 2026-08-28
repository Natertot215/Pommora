// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { TrashRow } from '@shared/types'
import { TrashFrame } from './TrashFrame'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const row: TrashRow = {
  bundlePath: '.trash/Alpha.deleted',
  kind: 'page',
  title: 'Alpha',
  crumbs: [{ kind: 'collection', title: 'Notes' }],
  deletedAt: 0,
  homeResolves: true,
}

describe('a Trash row', () => {
  let host: HTMLDivElement | null = null
  let root: Root | null = null

  beforeEach(() => {
    ;(window as unknown as { nexus: unknown }).nexus = {
      listTrash: vi.fn(async () => ({ ok: true, value: [row] })),
    }
  })
  afterEach(async () => {
    await act(async () => root?.unmount())
    host?.remove()
    root = null
    host = null
  })

  it('checks itself through the checkbox in its lead inset', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root?.render(<TrashFrame />))
    const box = host.querySelector('[role="checkbox"]') as HTMLButtonElement
    expect(box.getAttribute('aria-checked')).toBe('false')
    expect(host.querySelector('.has-checked')).toBeNull()
    await act(async () => box.click())
    expect(box.getAttribute('aria-checked')).toBe('true')
    expect(host.querySelector('.has-checked')).not.toBeNull()
  })
})
