// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode } from '../../Nexus/tree'
import { type EntryOp, mergeEntry, type ViewTileEntry } from '../tiles'
import { ok } from '../../Contract/result'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
import { makeTree } from '../../Testing/testTree'
import { mountEachTest } from '../../Testing/viewHarness'
import { firePointer, stubRect } from '@pommora/uix/Utilities/pointerHarness'

vi.mock('../../Views/Host/ViewHost', () => ({ ViewHost: () => null }))
vi.mock('../../Views/Settings/SettingsFrame', () => ({ SettingsFrame: () => null }))

import { ViewTile } from './ViewTile'

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})

const source = { kind: 'collection', id: 'c1', title: 'Col', path: 'Col' } as CollectionNode

describe('ViewTile', () => {
  it('a lock from another window stops an icon pick already open', async () => {
    useSession.setState({ tree: { ...makeTree(), collections: [source] } })
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ menu: () => ok('icon') })
    let stored: Record<string, unknown> = {
      id: '01J0000000000000000000000A',
      type: 'view',
      views: [{ source_id: 'c1', config: { id: 'view_a', name: 'A', type: 'table' } }],
    }
    const written: unknown[] = []
    const mutateEntry = (_id: string, op: EntryOp): void => {
      const patch = op(stored)
      if (patch) written.push(patch)
    }
    const show = (): Promise<void> =>
      act(async () => {
        root.render(<ViewTile entry={stored as ViewTileEntry} mutateEntry={mutateEntry} />)
      })
    await show()
    const pill = [...host.querySelectorAll('button')].find((b) => b.textContent === 'A')!
    await act(async () => {
      pill.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(useSession.getState().pendingChoice?.of).toBe('icon')
    stored = mergeEntry(stored, { locked: true })
    await show()
    await act(async () => useSession.getState().pendingChoice!.onPick('star'))
    expect(written).toEqual([])
  })

  describe("the dropdown's list reorders by drag", () => {
    const views = [
      { source_id: 'c1', config: { id: 'view_a', name: 'A', type: 'table' } },
      { source_id: 'c1', config: { id: 'view_b', name: 'B', type: 'table' } },
    ]
    const drag = async (locked: boolean): Promise<{ lifted: boolean; written: unknown[] }> => {
      useSession.setState({ tree: { ...makeTree(), collections: [source] } })
      const stored = {
        id: '01J0000000000000000000000A',
        type: 'view',
        view_style: 'dropdown',
        views,
        locked,
      }
      const written: unknown[] = []
      const mutateEntry = (_id: string, op: EntryOp): void => {
        const patch = op(stored)
        if (patch) written.push(patch)
      }
      await act(async () => {
        root.render(<ViewTile entry={stored as ViewTileEntry} mutateEntry={mutateEntry} />)
      })
      const pill = [...host.querySelectorAll('button')].find((b) => b.textContent === 'A')!
      await act(async () => pill.click())
      const row = (name: string): Element =>
        [...document.querySelectorAll('[data-line-row]')].find((e) => e.textContent === name)!
      stubRect(document.querySelector('.line-zone')!, { top: 0, bottom: 40 })
      stubRect(row('A'), { top: 0, bottom: 20 })
      stubRect(row('B'), { top: 20, bottom: 40 })
      await act(async () => {
        firePointer(row('B'), 'pointerdown', { x: 50, y: 30 })
        for (const y of [15, 2]) firePointer(window, 'pointermove', { x: 50, y })
      })
      const lifted = document.querySelector('.drag-ghost') !== null
      await act(async () => {
        firePointer(window, 'pointerup', { x: 50, y: 2 })
      })
      return { lifted, written }
    }

    it("writes the tile's view order", async () => {
      expect(await drag(false)).toEqual({
        lifted: true,
        written: [{ views: [views[1], views[0]], active: 1 }],
      })
    })

    it('a locked tile never lifts a row', async () => {
      expect(await drag(true)).toEqual({ lifted: false, written: [] })
    })
  })
})
