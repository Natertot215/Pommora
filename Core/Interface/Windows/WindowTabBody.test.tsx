// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, Children, createElement, isValidElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { useSession } from '../../Session/store'
import { useWindowTabBody } from './WindowTabBody'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const target = { kind: 'page' as const, id: 'a', path: 'Notes/a.md' }
let body: ReactNode
function Probe(): null {
  body = useWindowTabBody(target).body
  return null
}
const pageBodies = (): number =>
  Children.toArray((body as { props: { children: ReactNode[] } }).props.children[0]).filter(
    isValidElement,
  ).length

describe('useWindowTabBody', () => {
  it('keeps drawing the page it closes on while the store has already dropped the window', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    useSession.setState({
      windowSlot: { kind: 'page', tabs: [{ id: 't1', target }], activeTabId: 't1' },
    })
    await act(async () => root.render(createElement(Probe)))
    expect(pageBodies()).toBe(1)
    await act(async () => useSession.setState({ windowSlot: null }))
    expect(pageBodies()).toBe(1)
    await act(async () => root.unmount())
    host.remove()
  })
})
