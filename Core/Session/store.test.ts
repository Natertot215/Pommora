import { describe, expect, it, vi } from 'vitest'
import { useSession } from './store'

describe('a write that changes nothing wakes no subscriber', () => {
  it('drops a cleared selection that was already clear', () => {
    const before = useSession.getState()
    const heard = vi.fn()
    const stop = useSession.subscribe(heard)
    useSession.getState().setEditorSelection('a.md', null)
    useSession.getState().setDetailCount(before.detailCount)
    useSession.setState({ pendingPick: before.pendingPick })
    stop()
    expect(heard).not.toHaveBeenCalled()
    expect(useSession.getState()).toBe(before)
  })

  it('still notifies a write that changes a field', () => {
    const heard = vi.fn()
    const stop = useSession.subscribe(heard)
    useSession.getState().setDetailCount(7)
    useSession.getState().setDetailCount(null)
    stop()
    expect(heard).toHaveBeenCalledTimes(2)
  })

  it('keeps a write that changes one field beside an unchanged one', () => {
    const heard = vi.fn()
    const stop = useSession.subscribe(heard)
    useSession.setState({ detailCount: 3, pendingPick: useSession.getState().pendingPick })
    useSession.getState().setDetailCount(null)
    stop()
    expect(heard).toHaveBeenCalledTimes(2)
  })
})
