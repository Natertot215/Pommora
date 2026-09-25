// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { RenderBoundary } from './RenderBoundary'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Draw({ bad }: { bad: boolean }): React.JSX.Element {
  if (bad) throw new Error('undrawable')
  return <span>drawn</span>
}

describe('RenderBoundary', () => {
  it('draws nothing for a throw while drawing and retries when the key changes', () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    const draw = (bad: boolean, key: number): void => {
      act(() => {
        root.render(
          <RenderBoundary resetKey={key}>
            <Draw bad={bad} />
          </RenderBoundary>,
        )
      })
    }
    draw(false, 1)
    expect(host.textContent).toBe('drawn')
    draw(true, 1)
    expect(host.textContent).toBe('')
    draw(false, 1)
    expect(host.textContent).toBe('')
    draw(false, 2)
    expect(host.textContent).toBe('drawn')
    quiet.mockRestore()
    act(() => root.unmount())
  })
})
