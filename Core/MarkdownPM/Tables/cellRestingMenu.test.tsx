// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MarkdownTable } from './MarkdownTable'
import { tableStubs, testHost } from '../../Testing/editorHarness'
import type { EditorMenuRequest } from '../../Actions/editorMenu'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const format = vi.fn<(req: EditorMenuRequest) => Promise<string | null>>()
let readOnly = false

let container: HTMLDivElement
let root: Root
let cellText = ''

beforeEach(() => {
  format.mockReset()
  format.mockResolvedValue(null)
  readOnly = false
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  window.getSelection()?.removeAllRanges()
  delete (document as { caretPositionFromPoint?: unknown }).caretPositionFromPoint
})

const host = testHost({ menus: { format } })

function draw(): Promise<void> {
  return act(async () =>
    root.render(
      createElement(MarkdownTable, {
        ...tableStubs,
        host,
        model: { columns: [{ align: null, dashes: 3 }], header: ['A'], rows: [[cellText]] },
        readOnly: () => readOnly,
      }),
    ),
  )
}

async function mount(text: string): Promise<void> {
  cellText = text
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await draw()
}

const cell = (): HTMLElement =>
  container.querySelector('tbody .mdpm-tbl-cell-static') as HTMLElement

function textNode(drawn: string): Text {
  const walker = document.createTreeWalker(cell(), NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode())
    if (n.textContent === drawn) return n as Text
  throw new Error(`no text node "${drawn}"`)
}

async function rightClick(drawn: string, offset: number): Promise<MouseEvent> {
  const node = textNode(drawn)
  ;(document as { caretPositionFromPoint?: unknown }).caretPositionFromPoint = () => ({
    offsetNode: node,
    offset,
  })
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    clientX: 12,
    clientY: 34,
  })
  await act(async () => {
    node.parentElement?.dispatchEvent(event)
  })
  return event
}

function select(drawnFrom: string, from: number, drawnTo: string, to: number): void {
  const range = document.createRange()
  range.setStart(textNode(drawnFrom), from)
  range.setEnd(textNode(drawnTo), to)
  window.getSelection()?.removeAllRanges()
  window.getSelection()?.addRange(range)
}

const entered = (): boolean => container.querySelector('.cm-editor') !== null

describe('a right-click on a resting cell', () => {
  it('asks the editor menu at rest, at the click, and leaves the cell resting', async () => {
    await mount('plain words')
    const event = await rightClick('plain words', 3)
    expect(format).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'cell',
        x: 12,
        y: 34,
        embedSeat: false,
        citeSeat: false,
        resting: { selection: '' },
      }),
    )
    expect(event.defaultPrevented).toBe(false)
    expect(entered()).toBe(false)
  })

  it('reads the format state at the point inside a mark', async () => {
    await mount('**a** bc')
    await rightClick('a', 1)
    expect(format).toHaveBeenCalledWith(
      expect.objectContaining({ bold: true, resting: { selection: '' } }),
    )
  })

  it('sends the source a selection under the click covers', async () => {
    await mount('**a** bc')
    select('a', 0, ' bc', 3)
    await rightClick(' bc', 1)
    expect(format).toHaveBeenCalledWith(
      expect.objectContaining({ bold: false, resting: { selection: '**a** bc' } }),
    )
  })

  it('reads a point when the click lands outside the selection', async () => {
    await mount('**a** bc')
    select(' bc', 1, ' bc', 2)
    await rightClick('a', 1)
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ resting: { selection: '' } }))
  })

  it('claims the right press, so the browser seats no word before the menu', async () => {
    await mount('plain words')
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2 })
    await act(async () => {
      cell().dispatchEvent(press)
    })
    expect(press.defaultPrevented).toBe(true)
  })

  it('asks nothing of a read-only cell', async () => {
    readOnly = true
    await mount('**a** bc')
    await rightClick('a', 1)
    expect(format).not.toHaveBeenCalled()
    expect(entered()).toBe(false)
  })
})
