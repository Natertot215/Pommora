// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { dropAllTileDocs, dropTileBodies } from '../tileDocStore'
import { MarkdownTile } from './MarkdownTile'
import { stubDialer } from '../../vitest.setup'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// The real editor, so a mirrored body can revert what a stub would keep.
const HOST = { kind: 'space', id: 'sp1' } as const
let onDisk: string
let root: Root
let container: HTMLDivElement

const tile = (editing: boolean, key = 'a'): React.ReactNode =>
  createElement(MarkdownTile, { key, host: HOST, tileId: 't1', editing, onBeginEdit: () => {} })
const views = (): EditorView[] =>
  [...container.querySelectorAll('.cm-editor')].map(
    (el) => EditorView.findFromDOM(el as HTMLElement) as EditorView,
  )
const type = (v: EditorView, text: string, at = v.state.doc.length): void =>
  v.dispatch({
    changes: { from: at, insert: text },
    selection: EditorSelection.cursor(at + text.length),
    userEvent: 'input.type',
  })
const wait = (ms: number): Promise<void> => act(() => new Promise<void>((r) => setTimeout(r, ms)))
const show = (node: React.ReactNode): Promise<void> => act(async () => root.render(node))

beforeEach(() => {
  dropAllTileDocs()
  onDisk = 'on disk'
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'tiles:readMarkdown': vi.fn(async () => ({
      ok: true,
      value: { body: onDisk, hash: `h:${onDisk}` },
    })),
    'tiles:writeMarkdown': vi.fn(async (_h: unknown, _id: string, body: string, base: string) => {
      if (base !== `h:${onDisk}`) return { ok: true, value: { stale: true } }
      onDisk = body
      return { ok: true, value: { stale: false, hash: `h:${body}` } }
    }),
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

describe('a markdown tile over the real editor', () => {
  it('rests on its typed text once editing ends, and the next edit builds on it', async () => {
    await show(tile(true))
    type(views()[0], ' typed')
    await wait(500)
    await show(tile(false))
    expect(views()[0].state.doc.toString()).toBe('on disk typed')
    await show(tile(true))
    type(views()[0], '!')
    await wait(500)
    expect(onDisk).toBe('on disk typed!')
  })

  it('a second mount keeps following the typing through a drop of its host', async () => {
    await show(createElement('div', null, tile(true, 'a'), tile(false, 'b')))
    type(views()[0], ' typed')
    await act(async () => dropTileBodies(['t1']))
    await wait(520)
    expect(views()[1].state.doc.toString()).toBe('on disk typed')
    await show(createElement('div', null, tile(false, 'a'), tile(true, 'b')))
    type(views()[1], '!')
    await wait(500)
    expect(onDisk).toBe('on disk typed!')
  })

  it('a save the file moved past merges the typing onto the file', async () => {
    await show(tile(true))
    onDisk = 'synced: on disk'
    type(views()[0], ' typed')
    await wait(560)
    expect(views()[0].state.doc.toString()).toBe('synced: on disk typed')
    await wait(500)
    expect(onDisk).toBe('synced: on disk typed')
  })
})
