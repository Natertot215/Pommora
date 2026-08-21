// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SubfieldItem } from './subfieldItems'
import { useSession } from '../../store'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const written: [string, boolean | null][] = []
;(window as unknown as { nexus: unknown }).nexus = {
  citations: { set: (id: string, v: boolean | null) => void written.push([id, v]) },
}

const CITED = 'body[^a] here\n\n[^a]: the citation'
const target = { id: 'page-1', path: 'Notes/A.md' }

let container: HTMLDivElement
let root: Root

async function mount(body: string): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(SubfieldItem, { id: 'citations', scope: { target, body } }))
  })
}

const button = (): HTMLButtonElement | null => container.querySelector('.subfield-citations')
const click = async (): Promise<void> => {
  await act(async () => {
    button()?.click()
  })
}

beforeEach(() => {
  written.length = 0
  useSession.setState({ citationsShown: {}, personalization: {} })
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe('the footnotes control appears only where there is something to disclose', () => {
  it('a page with no citations renders nothing at all', async () => {
    await mount('just a body, no footnotes here')
    expect(button()).toBeNull()
  })

  it('a page with citations offers to show them, hidden being the factory default', async () => {
    await mount(CITED)
    expect(button()?.textContent).toBe('Show Footnotes')
  })

  // An orphan is still a citation line, and a section that exists must stay reachable.
  it('a page whose only citation is an orphan still offers the control', async () => {
    await mount('body with no marker\n\n[^a]: nothing points here')
    expect(button()?.textContent).toBe('Show Footnotes')
  })
})

describe('the control writes one row, and clears it on the default', () => {
  it('showing a page writes its override and flips the label', async () => {
    await mount(CITED)
    await click()
    expect(useSession.getState().citationsShown).toEqual({ 'page-1': true })
    expect(written).toEqual([['page-1', true]])
    expect(button()?.textContent).toBe('Hide Footnotes')
  })

  // A row written to the value it already follows would pin the page forever — a later change to
  // the nexus-wide default could never reach it again.
  it('toggling back to the default deletes the row rather than restating it', async () => {
    await mount(CITED)
    await click()
    await click()
    expect(useSession.getState().citationsShown).toEqual({})
    expect(written[written.length - 1]).toEqual(['page-1', null])
  })

  it('and the same holds when the nexus-wide default is shown', async () => {
    useSession.setState({ personalization: { citationsShown: true } })
    await mount(CITED)
    expect(button()?.textContent).toBe('Hide Footnotes')
    await click()
    expect(useSession.getState().citationsShown).toEqual({ 'page-1': false })
    await click()
    expect(useSession.getState().citationsShown).toEqual({})
  })
})
