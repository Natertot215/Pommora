// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { dropAllTileDocs, tileBody } from '../tileDocStore'
import { absorbLanding } from '../../Pages/bodyMount'
import { clearCache, knownBody } from '../../Session/pageDetailCache'
import { MarkdownTile } from './MarkdownTile'
import { useTileDoc } from '../useTileDoc'
import type { TilesChanged } from '../tiles'
import { stubDialer } from '../../vitest.setup'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// The real editor, so a mirrored body can revert what a stub would keep.
const HOST = { kind: 'space', id: 'sp1' } as const
let onDisk: string
let root: Root
let container: HTMLDivElement
const write = vi.fn()
const capture = vi.fn(async () => ({ ok: true, value: null }))
const read = vi.fn(async () => ({ ok: true, value: { body: onDisk, hash: `h:${onDisk}` } }))
let push: (changed: TilesChanged) => void = () => {}
const doc = {
  layout: { bands: [{ node: { kind: 'tile', id: 't1', h: 100 } }] },
  tiles: [{ id: 't1', type: 'markdown' }],
  locked: false,
}

function Board(): null {
  useTileDoc(HOST)
  return null
}

const tile = (editing: boolean, key = 'a'): React.ReactNode =>
  createElement(MarkdownTile, { key, host: HOST, tileId: 't1', editing, onBeginEdit: () => {} })
const views = (): EditorView[] =>
  [...container.querySelectorAll('.cm-editor')].map(
    (el) => EditorView.findFromDOM(el as HTMLElement) as EditorView,
  )
const docOf = (n = 0): string => views()[n].state.doc.toString()
const type = (v: EditorView, text: string, at = v.state.doc.length): void =>
  v.dispatch({
    changes: { from: at, insert: text },
    selection: EditorSelection.cursor(at + text.length),
    userEvent: 'input.type',
  })
const wait = (ms: number): Promise<void> => act(() => new Promise<void>((r) => setTimeout(r, ms)))
const show = (node: React.ReactNode): Promise<void> => act(async () => root.render(node))
const both = (a: boolean, b: boolean): React.ReactNode =>
  createElement('div', null, tile(a, 'a'), tile(b, 'b'))
const land = (): Promise<void> => act(() => absorbLanding('t1', tileBody(HOST)))

beforeEach(() => {
  clearCache()
  dropAllTileDocs()
  onDisk = 'on disk'
  write.mockReset()
  write.mockImplementation(async (_h: unknown, _id: string, body: string, base: string) => {
    if (base !== `h:${onDisk}`) return { ok: true, value: { stale: true } }
    onDisk = body
    return { ok: true, value: { stale: false, hash: `h:${body}` } }
  })
  capture.mockClear()
  read.mockClear()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'tiles:readMarkdown': read,
    'tiles:writeMarkdown': write,
    'tiles:captureMarkdown': capture,
    'tiles:get': async () => ({ ok: true, value: doc }),
    'tiles:changed': (fn: (changed: TilesChanged) => void) => {
      push = fn
      return () => {}
    },
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  clearCache()
  dropAllTileDocs()
})

describe('a markdown tile over the real editor', () => {
  it('rests on its typed text once editing ends, and the next edit builds on it', async () => {
    await show(tile(true))
    type(views()[0], ' typed')
    await wait(500)
    await show(tile(false))
    expect(docOf()).toBe('on disk typed')
    await show(tile(true))
    type(views()[0], '!')
    await wait(500)
    expect(onDisk).toBe('on disk typed!')
  })

  it('a mount that is not editing follows a landed save in place', async () => {
    await show(both(true, false))
    const follower = views()[1]
    type(views()[0], '!')
    expect(docOf(1)).toBe('on disk')
    await wait(500)
    expect(docOf(1)).toBe('on disk!')
    expect(views()[1]).toBe(follower)
  })

  it('starts the mount clicked into from the text the other mount typed', async () => {
    await show(both(true, false))
    type(views()[0], '!')
    await show(both(false, true))
    expect(docOf(1)).toBe('on disk!')
    type(views()[1], '!')
    await wait(500)
    expect(onDisk).toBe('on disk!!')
    expect(write).toHaveBeenLastCalledWith(HOST, 't1', 'on disk!!', 'h:on disk!')
  })

  it('a mount arriving while a save is out seeds on the typing, not the file before it', async () => {
    let release = (): void => {}
    const landed = write.getMockImplementation()
    write.mockImplementationOnce(
      (...args: unknown[]) => new Promise((r) => (release = () => r(landed?.(...args)))),
    )
    await show(tile(true))
    type(views()[0], ' typed')
    await show(null)
    await show(tile(true, 'again'))
    expect(docOf()).toBe('on disk typed')
    await act(async () => release())
    type(views()[0], '!')
    await wait(500)
    expect(onDisk).toBe('on disk typed!')
  })

  it('a save the file moved past merges the typing onto the file, with no capture', async () => {
    await show(tile(true))
    onDisk = 'synced: on disk'
    type(views()[0], ' typed')
    await wait(560)
    expect(docOf()).toBe('synced: on disk typed')
    await wait(500)
    expect(onDisk).toBe('synced: on disk typed')
    expect(capture).not.toHaveBeenCalled()
  })

  it('a refused save that conflicts takes the file in every mount and keeps the typing', async () => {
    await show(both(true, false))
    onDisk = 'synced'
    type(views()[0], '!')
    await wait(520)
    expect(docOf(0)).toBe('synced')
    expect(docOf(1)).toBe('synced')
    expect(capture).toHaveBeenCalledWith(HOST, 't1', 'on disk!')
  })

  it('an outside edit follows into a mount that is not editing without rebuilding its editor', async () => {
    await show(tile(false))
    const view = views()[0]
    onDisk = 'renamed [[Link]]'
    await land()
    expect(docOf()).toBe('renamed [[Link]]')
    expect(views()[0]).toBe(view)
  })

  it('typing that landed survives a later landing and a return to the edit', async () => {
    await show(tile(true))
    type(views()[0], ' typed')
    await wait(500)
    await land()
    await show(tile(false))
    expect(docOf()).toBe('on disk typed')
    await show(tile(true))
    type(views()[0], '!')
    await wait(500)
    expect(onDisk).toBe('on disk typed!')
  })

  it('typing a landing arrives ahead of survives leaving the edit before its save', async () => {
    await show(tile(true))
    type(views()[0], ' typed')
    await land()
    await show(tile(false))
    expect(docOf()).toBe('on disk typed')
    await wait(10)
    expect(onDisk).toBe('on disk typed')
    await show(tile(true))
    type(views()[0], '!')
    await wait(500)
    expect(onDisk).toBe('on disk typed!')
  })

  it('an outside edit while one of two mounts types merges instead of being saved over', async () => {
    await show(both(true, false))
    type(views()[0], ' typed')
    await wait(500)
    onDisk = 'outside: on disk typed'
    await land()
    expect(docOf(0)).toBe('outside: on disk typed')
    expect(docOf(1)).toBe('outside: on disk typed')
    type(views()[0], '!')
    await wait(500)
    expect(onDisk).toBe('outside: on disk typed!')
    expect(capture).not.toHaveBeenCalled()
  })

  it('an outside edit taken whole is what the next mount seeds on and saves over', async () => {
    await show(tile(true))
    type(views()[0], ' typed')
    await wait(500)
    onDisk = 'outside'
    await land()
    await show(null)
    await show(tile(true, 'again'))
    expect(docOf()).toBe('outside')
    type(views()[0], '!')
    await wait(500)
    expect(onDisk).toBe('outside!')
  })

  it('a refused save no mount holds any longer is kept, and the next mount reads the file', async () => {
    await show(tile(true))
    type(views()[0], ' typed')
    onDisk = 'outside'
    await show(null)
    expect(capture).toHaveBeenCalledWith(HOST, 't1', 'on disk typed')
    await show(tile(false, 'again'))
    expect(docOf()).toBe('outside')
  })

  it('an outside edit landing during one mount’s unsaved typing merges into both and saves on the fresh hash', async () => {
    await show(both(true, false))
    type(views()[0], ' typed')
    onDisk = 'outside: on disk'
    await land()
    expect(docOf(0)).toBe('outside: on disk typed')
    expect(docOf(1)).toBe('outside: on disk typed')
    await wait(500)
    expect(write).toHaveBeenLastCalledWith(
      HOST,
      't1',
      'outside: on disk typed',
      'h:outside: on disk',
    )
    expect(onDisk).toBe('outside: on disk typed')
    expect(capture).not.toHaveBeenCalled()
  })

  it('a board push lands the tiles it names and reads none it does not', async () => {
    await show(createElement('div', null, createElement(Board), tile(false)))
    read.mockClear()
    onDisk = 'outside'
    await act(async () => push({ host: HOST, ids: [] }))
    await wait(10)
    expect(read).not.toHaveBeenCalled()
    expect(docOf()).toBe('on disk')
    await act(async () => push({ host: HOST, ids: ['t1'] }))
    await wait(10)
    expect(docOf()).toBe('outside')
  })

  it('a concurrent first read in a second mount leaves the base the first one holds', async () => {
    await show(both(true, false))
    expect(read).toHaveBeenCalledTimes(2)
    expect(knownBody('t1')).toBe('on disk')
  })
})
