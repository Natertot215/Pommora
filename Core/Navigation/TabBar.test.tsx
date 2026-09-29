// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  firePointer,
  pressEscape,
  stubPointerCapture,
  stubRect,
} from '@pommora/uix/Testing/pointerHarness'
import type { Tab } from './navRef'
import { useSession } from '../Session/store'
import { TabBar } from './TabBar'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
stubPointerCapture()
;(globalThis as { CSS?: unknown }).CSS ??= { escape: (s: string) => s }

const tab = (id: string): Tab => ({
  id,
  target: { kind: 'space', id: `s-${id}` },
  navStack: [],
  navIndex: 0,
})

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  pressEscape()
  act(() => root.unmount())
  host.remove()
})

it('lifts a tab onto an overlay that never replays the tab’s navigation slide', async () => {
  useSession.setState({
    tabs: [tab('t1'), tab('t2')],
    activeTabId: 't1',
    navSlide: { tabId: 't1', dir: 'forward', seq: 1, source: 'history' },
  })
  await act(async () => root.render(<TabBar />))
  stubRect(host.querySelector('.tab-strip') as Element, { top: 0, bottom: 30, left: 0, right: 400 })
  const [t1, t2] = host.querySelectorAll('.tab-strip > .tab')
  stubRect(t1, { top: 0, bottom: 30, left: 0, right: 180 })
  stubRect(t2, { top: 0, bottom: 30, left: 180, right: 307 })
  expect(t1.querySelector('.nav-slide-fwd')).not.toBeNull()
  await act(async () => {
    firePointer(t1, 'pointerdown', { x: 90, y: 15 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x: 120, y: 15 })
  })
  const overlay = document.querySelector('.tab-overlay')
  expect(overlay).not.toBeNull()
  expect(overlay?.querySelector('.nav-slide-fwd')).toBeNull()
})
