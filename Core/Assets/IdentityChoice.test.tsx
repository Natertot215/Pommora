// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { chooseColor, chooseIcon, IdentityChoice, useChoiceOpen } from './IdentityChoice'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let trigger: HTMLButtonElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers()
  useSession.setState({
    tree: makeTree({ personalization: { iconFavorites: ['anchor'] } }),
    pendingChoice: null,
  })
  host = document.createElement('div')
  trigger = document.createElement('button')
  document.body.append(host, trigger)
  root = createRoot(host)
})

afterEach(() => {
  act(() => useSession.getState().dismissChoice())
  act(() => vi.advanceTimersByTime(1000))
  act(() => root.unmount())
  host.remove()
  trigger.remove()
  vi.useRealTimers()
})

const cell = (label: string): HTMLButtonElement =>
  document.querySelector(`[data-picker-portal] button[aria-label="${label}"]`) as HTMLButtonElement

describe('IdentityChoice', () => {
  it('lands an icon pick and closes', async () => {
    const onPick = vi.fn()
    act(() => root.render(<IdentityChoice />))
    await act(async () => chooseIcon(trigger, undefined, onPick))
    await act(async () => cell('Anchor').click())
    expect(onPick).toHaveBeenCalledWith('anchor')
    expect(useSession.getState().pendingChoice).toBeNull()
  })

  it('lands a re-picked color as undefined and closes', async () => {
    const onPick = vi.fn()
    act(() => root.render(<IdentityChoice />))
    await act(async () => chooseColor(trigger, 'blue-4', onPick))
    await act(async () => cell('blue-4').click())
    expect(onPick).toHaveBeenCalledWith(undefined)
    expect(useSession.getState().pendingChoice).toBeNull()
  })

  it('reads open only for its own trigger, and lands nothing on a dismissal', async () => {
    const onPick = vi.fn()
    function Probe(): React.JSX.Element {
      const mine = useRef<HTMLButtonElement>(null)
      const other = useRef<HTMLButtonElement>(null)
      const mineOpen = useChoiceOpen(mine)
      const otherOpen = useChoiceOpen(other)
      return (
        <>
          <button
            type="button"
            ref={mine}
            data-open={mineOpen}
            onClick={(e) => chooseIcon(e.currentTarget, undefined, onPick)}
          />
          <button type="button" ref={other} data-open={otherOpen} />
          <IdentityChoice />
        </>
      )
    }
    act(() => root.render(<Probe />))
    const [mine, other] = Array.from(host.querySelectorAll('button'))
    await act(async () => mine.click())
    expect([mine.dataset.open, other.dataset.open]).toEqual(['true', 'false'])
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(useSession.getState().pendingChoice).toBeNull()
    expect(mine.dataset.open).toBe('false')
    expect(onPick).not.toHaveBeenCalled()
  })
})
