// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useSession } from '../Session/store'
import { stubDialer } from '../vitest.setup'
import { useLinkTitle } from './useLinkTitle'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let answer: (v: unknown) => void = () => {}
const fetchTitle = vi.fn(() => new Promise((r) => (answer = r)))
let shown: string | undefined
let container: HTMLDivElement
let root: Root

function Probe({ url, wants }: { url: string; wants: boolean }): null {
  shown = useLinkTitle(url, wants)
  return null
}

const render = (url: string, wants: boolean): Promise<void> =>
  act(async () => root.render(<Probe url={url} wants={wants} />))

beforeEach(() => {
  fetchTitle.mockClear()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'linkTitles:fetch': fetchTitle })
  container = document.createElement('div')
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
})

describe('useLinkTitle', () => {
  it('fetches once when wanted and returns the title once the store holds it', async () => {
    await render('https://wanted.example.com', true)
    expect(shown).toBeUndefined()
    await act(async () => answer({ ok: true, value: { title: 'Wanted' } }))
    expect(shown).toBe('Wanted')
    expect(fetchTitle).toHaveBeenCalledExactlyOnceWith('https://wanted.example.com')
  })

  it('neither reads nor fetches when not wanted', async () => {
    useSession.setState({ linkTitles: { 'https://held.example.com': 'Held' } })
    await render('https://held.example.com', false)
    expect(shown).toBeUndefined()
    await render('https://unheld.example.com', false)
    expect(fetchTitle).not.toHaveBeenCalled()
  })
})
