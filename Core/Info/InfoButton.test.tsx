// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { REVEAL_GRACE_MS } from '@pommora/uix/Interactions/hoverReveal'
import { InfoButton } from './InfoButton'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
const clicked = vi.fn()

const stubCoarse = (matches: boolean): void => {
  window.matchMedia = ((query: string) => ({
    matches: matches && query === '(hover: none)',
  })) as never
}
const render = (): Promise<void> =>
  act(async () =>
    root.render(
      // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a clickable row's stand-in
      <div onClick={clicked}>
        <InfoButton title="Label Format">
          <p data-id="label">Label</p>
        </InfoButton>
        <InfoButton title="Value Format">
          <p data-id="value">Value</p>
        </InfoButton>
      </div>,
    ),
  )
const glyph = (title: string): HTMLButtonElement =>
  document.querySelector(`button[aria-label="${title} - Info"]`) as HTMLButtonElement
const isOpen = (title: string): boolean => glyph(title).getAttribute('aria-pressed') === 'true'
const pane = (id: string): HTMLElement => document.querySelector(`[data-id="${id}"]`) as HTMLElement
const run = async (fn: () => void): Promise<void> => {
  await act(async () => fn())
}
const tick = (ms: number): Promise<void> => run(() => vi.advanceTimersByTime(ms))
const move = (
  type: 'pointerover' | 'pointerout',
  el: Element,
  relatedTarget: Element,
): Promise<void> =>
  run(() => el.dispatchEvent(new PointerEvent(type, { bubbles: true, relatedTarget })))
const enter = (el: Element): Promise<void> => move('pointerover', el, document.body)
const leave = (el: Element): Promise<void> => move('pointerout', el, document.body)
const pressEsc = (): Promise<void> =>
  run(() =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    ),
  )

beforeEach(async () => {
  vi.useFakeTimers()
  stubCoarse(false)
  clicked.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await render()
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

describe('the InfoButton', () => {
  it('opens on a half-second rest', async () => {
    await enter(glyph('Label Format'))
    await tick(499)
    expect(isOpen('Label Format')).toBe(false)
    await tick(1)
    expect(isOpen('Label Format')).toBe(true)
  })

  it('stays open as the pointer crosses into its pane, and closes on the grace once it leaves', async () => {
    await enter(glyph('Label Format'))
    await tick(500)
    await move('pointerout', glyph('Label Format'), pane('label'))
    await tick(REVEAL_GRACE_MS)
    expect(isOpen('Label Format')).toBe(true)
    await leave(pane('label'))
    await tick(REVEAL_GRACE_MS)
    expect(isOpen('Label Format')).toBe(false)
  })

  it('holds on a click past a leave, and a second click closes it', async () => {
    await run(() => glyph('Label Format').click())
    await leave(glyph('Label Format'))
    await tick(REVEAL_GRACE_MS)
    expect(isOpen('Label Format')).toBe(true)
    await run(() => glyph('Label Format').click())
    expect(isOpen('Label Format')).toBe(false)
  })

  it('closes on Escape while the pointer still rests on it', async () => {
    await enter(glyph('Label Format'))
    await tick(500)
    await pressEsc()
    expect(isOpen('Label Format')).toBe(false)
  })

  it('shows one pane at a time', async () => {
    await run(() => glyph('Label Format').click())
    await enter(glyph('Value Format'))
    await tick(500)
    expect(isOpen('Value Format')).toBe(true)
    expect(isOpen('Label Format')).toBe(false)
  })

  it('opens on a tap under (hover: none), and never on a rest', async () => {
    stubCoarse(true)
    await render()
    await enter(glyph('Label Format'))
    await tick(1000)
    expect(isOpen('Label Format')).toBe(false)
    await run(() => glyph('Label Format').click())
    expect(isOpen('Label Format')).toBe(true)
  })

  it("keeps the glyph's and the pane's clicks from the row beneath", async () => {
    await run(() => glyph('Label Format').click())
    await run(() => pane('label').click())
    expect(clicked).not.toHaveBeenCalled()
  })
})
