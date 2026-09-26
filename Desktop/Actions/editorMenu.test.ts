import { describe, expect, it } from 'vitest'
import type { EditorMenuRequest } from '@pommora/core/Actions/editorMenu'
import { askEditorMenu, atClick } from './editorMenu'

const req = (x: number, y: number): EditorMenuRequest => ({
  scope: 'page',
  x,
  y,
  bold: false,
  italic: false,
  strikethrough: false,
  highlight: false,
  inlineCode: false,
  link: false,
  connection: false,
  heading: 0,
  list: null,
  block: null,
  embedSeat: false,
  citeSeat: false,
})

describe('matching an editor’s ask to the click', () => {
  it('matches the click it was sent from', () => {
    expect(atClick(req(100, 40), { x: 100, y: 40 }, 1)).toBe(true)
  })

  it('converts CSS pixels to window DIPs, rounding as the event does', () => {
    expect(atClick(req(101, 41), { x: 126, y: 51 }, 1.25)).toBe(true)
  })

  it('refuses a click three pixels away', () => {
    expect(atClick(req(100, 40), { x: 103, y: 40 }, 1)).toBe(false)
  })
})

describe('the parked ask', () => {
  it('answers an earlier ask with null when a second one arrives', async () => {
    const first = askEditorMenu(req(0, 0))
    void askEditorMenu(req(1, 1))
    await expect(first).resolves.toBeNull()
  })
})
