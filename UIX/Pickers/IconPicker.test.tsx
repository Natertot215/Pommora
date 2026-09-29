// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { IconPicker } from './IconPicker'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

it('names an icon favourite by its words, and announces that name on lift', async () => {
  await act(async () =>
    root.render(
      <IconPicker
        open
        onClose={() => {}}
        iconFavorites={{ ids: ['alarm-clock'], onChange: () => {} }}
      />,
    ),
  )
  const fav = document.querySelector('button[aria-label="Alarm Clock"]') as HTMLButtonElement
  expect(fav.title).toBe('Alarm Clock')
  await act(async () => {
    fav.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
  })
  const region = document.querySelector('[role="status"][aria-live="assertive"]')
  expect(region?.textContent).toBe('Picked up Alarm Clock.')
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
})
