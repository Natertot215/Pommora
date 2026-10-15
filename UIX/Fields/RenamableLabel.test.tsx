// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RenamableLabel } from './RenamableLabel'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function deferred(): { promise: Promise<boolean>; settle: (ok: boolean) => void } {
  let settle!: (ok: boolean) => void
  const promise = new Promise<boolean>((resolve) => {
    settle = resolve
  })
  return { promise, settle }
}

function commitAs(text: string): void {
  const input = host.querySelector('input')
  if (!input) throw new Error('no field')
  act(() => {
    input.focus()
    input.value = text
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })
}

function Label({
  landing,
  value = 'Alpha',
}: {
  landing?: Promise<boolean>
  value?: string
}): React.JSX.Element {
  const [editing, setEditing] = useState(true)
  return (
    <RenamableLabel
      renames="row"
      editing={editing}
      value={value}
      className="field"
      onCommit={() => {
        setEditing(false)
        return landing
      }}
      onCancel={() => setEditing(false)}
    />
  )
}

describe('RenamableLabel', () => {
  it('shows the committed text until its landing settles, then the live value', async () => {
    const { promise, settle } = deferred()
    act(() => root.render(<Label landing={promise} />))
    commitAs('Beta')
    expect(host.textContent).toBe('Beta')
    act(() => root.render(<Label landing={promise} value="Beta" />))
    await act(async () => settle(true))
    expect(host.textContent).toBe('Beta')
  })

  it('returns to the live value when a refused landing leaves it unchanged', async () => {
    const { promise, settle } = deferred()
    act(() => root.render(<Label landing={promise} />))
    commitAs('Beta')
    expect(host.textContent).toBe('Beta')
    await act(async () => settle(false))
    expect(host.textContent).toBe('Alpha')
  })

  it('shows the live value at once when the commit returns nothing to wait on', () => {
    act(() => root.render(<Label />))
    commitAs('Beta')
    expect(host.textContent).toBe('Alpha')
  })
})
