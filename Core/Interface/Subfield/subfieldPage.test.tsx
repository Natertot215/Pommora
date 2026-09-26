// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useSubfieldPage } from './subfieldPage'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let seen: string | undefined

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  seen = undefined
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

// Reports from a mount effect, as the page tile does when its body is already in memory.
function Tile({ body, onBody }: { body: string; onBody: (b: string) => void }): null {
  useEffect(() => onBody(body), [body])
  return null
}

function Window({ path, body }: { path: string; body: string }): React.JSX.Element {
  const { page, onBody } = useSubfieldPage({ id: path, path })
  seen = page?.body
  return <Tile key={path} body={body} onBody={onBody} />
}

describe('the window footer reads the body its tile reports', () => {
  it('shows a body already in memory at once, on open and after a switch', () => {
    act(() => root.render(<Window path="a.md" body="one two" />))
    expect(seen).toBe('one two')
    act(() => root.render(<Window path="b.md" body="three" />))
    expect(seen).toBe('three')
  })

  it('an edit after the first body waits out the pause', () => {
    vi.useFakeTimers()
    act(() => root.render(<Window path="a.md" body="one" />))
    act(() => root.render(<Window path="a.md" body="one two" />))
    expect(seen).toBe('one')
    act(() => {
      vi.advanceTimersByTime(120)
    })
    expect(seen).toBe('one two')
  })
})
