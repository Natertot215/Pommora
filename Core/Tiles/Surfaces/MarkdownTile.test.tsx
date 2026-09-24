// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'

const seeds = vi.hoisted(() => [] as string[])

vi.mock('../../MarkdownPM/MarkdownEditor', () => ({
  MarkdownEditor: (p: { initialBody: string; body?: string; onChange: (next: string) => void }) => {
    const [own, setBody] = useState(p.initialBody)
    const body = p.body ?? own
    useEffect(() => {
      seeds.push(p.initialBody)
    }, [])
    return createElement(
      'button',
      {
        type: 'button',
        className: 'stub-editor',
        onClick: () => {
          const next = `${body}!`
          setBody(next)
          p.onChange(next)
        },
      },
      body,
    )
  },
}))

import { dropAllTileDocs, dropTileBodies, readTileBody } from '../tileDocStore'
import { MarkdownTile } from './MarkdownTile'
import { stubDialer } from '../../vitest.setup'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const HOST = { kind: 'space', id: 'sp1' } as const
const write = vi.fn(async (_h: unknown, _id: string, body: string, _base: string) => ({
  ok: true,
  value: { stale: false, hash: `h:${body}` },
}))

let container: HTMLDivElement
let root: Root
let onDisk: string
const editors = (): HTMLElement[] =>
  [...container.querySelectorAll('.stub-editor')] as HTMLElement[]
const text = (n = 0): string | undefined => editors()[n]?.textContent ?? undefined

const tile = (editing: boolean): React.ReactNode =>
  createElement(MarkdownTile, { host: HOST, tileId: 't1', editing, onBeginEdit: () => {} })

const mount = (editing = false): Promise<void> =>
  act(async () => {
    root.render(tile(editing))
  })

const mountBoth = (a: boolean, b: boolean): Promise<void> =>
  act(async () => {
    root.render(createElement('div', null, tile(a), tile(b)))
  })

beforeEach(() => {
  dropAllTileDocs()
  write.mockClear()
  seeds.length = 0
  onDisk = 'on disk'
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'tiles:readMarkdown': vi.fn(async () => ({
      ok: true,
      value: { body: onDisk, hash: `h:${onDisk}` },
    })),
    'tiles:writeMarkdown': write,
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  dropAllTileDocs()
})

describe("a markdown tile's shared body", () => {
  it('writes every keystroke through to the slot, synchronously', async () => {
    await mount(true)
    expect(text()).toBe('on disk')
    act(() => editors()[0]?.click())
    expect(readTileBody('t1')).toBe('on disk!')
    expect(write).not.toHaveBeenCalled()
  })

  it('never remounts the typing mount on its own slot writes', async () => {
    await mount(true)
    await act(async () => {
      editors()[0]?.click()
      await new Promise((r) => setTimeout(r, 500))
    })
    expect(write).toHaveBeenCalledOnce()
    expect(text()).toBe('on disk!')
  })

  it('seeds a fresh mount from the slot rather than the file', async () => {
    await mount(true)
    act(() => editors()[0]?.click())
    await act(async () => root.render(null))
    await mount()
    expect(text()).toBe('on disk!')
  })

  it('keeps the editor of the mount that did the typing when the edit returns to it', async () => {
    await mount(true)
    act(() => editors()[0]?.click())
    act(() => editors()[0]?.click())
    expect(readTileBody('t1')).toBe('on disk!!')
    await mount(false)
    await mount(true)
    expect(seeds).toEqual(['on disk'])
    expect(text()).toBe('on disk!!')
  })

  it('mirrors a landed save into the mount that is not editing, in place', async () => {
    await mountBoth(true, false)
    act(() => editors()[0]?.click())
    expect(text(1)).toBe('on disk')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500))
    })
    expect(write).toHaveBeenCalledOnce()
    expect(text(0)).toBe('on disk!')
    expect(text(1)).toBe('on disk!')
    expect(seeds).toEqual(['on disk', 'on disk'])
  })

  it('starts the mount clicked into from the text the other mount typed', async () => {
    await mountBoth(true, false)
    expect(text(0)).toBe('on disk')
    expect(text(1)).toBe('on disk')
    act(() => editors()[0]?.click())
    await mountBoth(false, true)
    expect(text(1)).toBe('on disk!')
    act(() => editors()[1]?.click())
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500))
    })
    expect(readTileBody('t1')).toBe('on disk!!')
    expect(write).toHaveBeenLastCalledWith(HOST, 't1', 'on disk!!', 'h:on disk!')
  })
})

describe('a tile file that moved without this window', () => {
  it('a refused save that conflicts with the file takes the file in every mount', async () => {
    await mountBoth(true, false)
    onDisk = 'synced'
    write.mockImplementationOnce(async () => ({ ok: true, value: { stale: true } }) as never)
    await act(async () => {
      editors()[0]?.click()
      await new Promise((r) => setTimeout(r, 500))
    })
    expect(write).toHaveBeenCalledWith(HOST, 't1', 'on disk!', 'h:on disk')
    expect(text(0)).toBe('synced')
    expect(text(1)).toBe('synced')
  })

  it('an outside edit re-reads the file into a mount that is not editing', async () => {
    await mount()
    onDisk = 'renamed [[Link]]'
    await act(async () => dropTileBodies(['t1']))
    expect(text()).toBe('renamed [[Link]]')
  })
})
