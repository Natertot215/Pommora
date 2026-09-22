// @vitest-environment jsdom
import { describe, expect, it, afterEach, beforeEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { TabTarget } from './navRef'
import { useTabExchange } from './tabRows'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const TARGETS: Record<string, TabTarget> = {
  page: { kind: 'page', id: 'p1', path: 'Notes/A.md' },
  space: { kind: 'space', id: 's1' },
  collection: { kind: 'collection', id: 'c1' },
  newtab: { kind: 'newtab' },
}

let container: HTMLDivElement
let root: Root
let carry: ((id: string) => unknown) | undefined

function Probe(): null {
  carry = useTabExchange(
    (id) => TARGETS[id],
    () => {},
  ).carry
  return null
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(createElement(Probe)))
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('the tab exchange', () => {
  it('carries a page and a Space between the rows', () => {
    expect(carry?.('page')).toEqual({ kind: 'page', id: 'p1', path: 'Notes/A.md' })
    expect(carry?.('space')).toEqual({ kind: 'space', id: 's1' })
  })

  it('withholds every kind no window can hold, and an id with no tab', () => {
    expect(carry?.('collection')).toBeNull()
    expect(carry?.('newtab')).toBeNull()
    expect(carry?.('missing')).toBeNull()
  })
})
