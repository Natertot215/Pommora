// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { firePointer, stubRect } from '@pommora/uix/Testing/pointerHarness'
import { useSession } from '../../Session/store'
import { mountEachTest } from '../../Testing/viewHarness'
import { OutlineMenu } from './OutlineMenu'

const move = vi.hoisted(() => vi.fn())
vi.mock('../../Pages/pageEditor', () => ({
  usePageOutline: () => [
    { key: 'a', text: 'Alpha', level: 1, from: 0 },
    { key: 'a1', text: 'Alpha One', level: 2, from: 10 },
    { key: 'b', text: 'Beta', level: 1, from: 20 },
    { key: 'c', text: 'Gamma', level: 1, from: 30 },
  ],
  moveHeadingSection: move,
  travelPageTo: vi.fn(),
  renameHeadingAtOffset: vi.fn(),
}))

let root: Root
mountEachTest((_h, r) => {
  root = r
})

const row = (text: string): Element =>
  [...document.querySelectorAll('[data-line-row]')].find((e) => e.textContent === text)!

const open = async (): Promise<void> => {
  move.mockClear()
  useSession.setState({ selection: { kind: 'page', id: 'p1', path: 'P.md' } as never })
  await act(async () => root.render(<OutlineMenu />))
  await act(async () => {
    document.querySelector<HTMLButtonElement>('button[aria-label="Outline"]')!.click()
  })
}

const drag = async (text: string, from: number, ...to: number[]): Promise<void> => {
  await act(async () => {
    firePointer(row(text), 'pointerdown', { x: 50, y: from })
    for (const y of to) firePointer(window, 'pointermove', { x: 50, y })
    firePointer(window, 'pointerup', { x: 50, y: to.at(-1) })
  })
}

describe('OutlineMenu — the heading drag', () => {
  it('a drop just after a collapsed heading lands before the next heading, not in its section', async () => {
    await open()
    await act(async () => {
      row('Alpha')
        .querySelector('[data-drop-outline]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })
    expect(row('Alpha One')).toBeUndefined()
    stubRect(document.querySelector('.line-zone')!, { top: 0, bottom: 60 })
    stubRect(row('Alpha'), { top: 0, bottom: 20 })
    stubRect(row('Beta'), { top: 20, bottom: 40 })
    stubRect(row('Gamma'), { top: 40, bottom: 60 })
    await drag('Gamma', 50, 35, 22)
    expect(move).toHaveBeenCalledExactlyOnceWith('c', 'b')
  })

  it('a release on its own slot writes nothing', async () => {
    await open()
    stubRect(document.querySelector('.line-zone')!, { top: 0, bottom: 80 })
    for (const [i, t] of ['Alpha', 'Alpha One', 'Beta', 'Gamma'].entries())
      stubRect(row(t), { top: i * 20, bottom: i * 20 + 20 })
    await drag('Beta', 50, 62, 50)
    expect(move).not.toHaveBeenCalled()
  })
})
