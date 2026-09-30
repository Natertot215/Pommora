// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '../Contract/result'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { NavPinButton, showNavRowMenu } from './NavList'
import { useSession } from '../Session/store'
import type { ResolvedNav } from './navResolve'
import { stubDialer } from '../vitest.setup'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const item = {
  key: 'page:1',
  target: { kind: 'page', id: '1' },
  title: 'A Page',
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
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    menu: async (req: unknown) => ok(await (popup as (r: unknown) => Promise<unknown>)(req)),
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('the nav row menu', () => {
  it('pops one native menu and runs the chosen action', async () => {
    const onOpenNewTab = vi.fn()
    const shown = showNavRowMenu(item, onOpenNewTab)
    expect(popup).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(answers).toHaveLength(1))
    answers[0]('open-new-tab')
    await shown
    expect(onOpenNewTab).toHaveBeenCalledWith(item.target)
  })
})

describe('the pin button', () => {
  it('reads Unpin on a row whose target is in the pin list', () => {
    useSession.setState({ pinned: [{ kind: 'page', id: '1' }] })
    act(() => root.render(<NavPinButton it={item} />))
    const button = host.querySelector('button')
    expect(button?.getAttribute('aria-label')).toBe('Unpin')
    expect(button?.classList.contains('is-pinned')).toBe(true)
    useSession.setState({ pinned: [] })
  })
})
