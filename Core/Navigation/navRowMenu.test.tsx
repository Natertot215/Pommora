// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { NavRowMenu } from './NavList'
import type { ResolvedNav } from './navResolve'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const item = {
  key: 'page:1',
  target: { kind: 'page', id: '1' },
  title: 'A Page',
  pinned: false,
} as unknown as ResolvedNav

let host: HTMLDivElement
let root: Root
let popup: ReturnType<typeof vi.fn>
let answers: ((action: string | null) => void)[]

beforeEach(() => {
  answers = []
  popup = vi.fn(
    () =>
      new Promise<string | null>((resolve) => {
        answers.push(resolve)
      }),
  )
  ;(window as unknown as { nexus: unknown }).nexus = { navRowMenu: popup }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('the nav row menu is one act per open', () => {
  it('pops a single native menu through a StrictMode double mount', () => {
    act(() => {
      root.render(
        <React.StrictMode>
          <NavRowMenu item={item} onClose={() => {}} />
        </React.StrictMode>,
      )
    })
    expect(popup).toHaveBeenCalledTimes(1)
  })

  it('answers the first ask rather than the second', async () => {
    const onClose = vi.fn()
    const onOpenNewTab = vi.fn()
    act(() => {
      root.render(
        <React.StrictMode>
          <NavRowMenu item={item} onClose={onClose} onOpenNewTab={onOpenNewTab} />
        </React.StrictMode>,
      )
    })
    await act(async () => {
      answers[0]('open-new-tab')
    })
    expect(onOpenNewTab).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
