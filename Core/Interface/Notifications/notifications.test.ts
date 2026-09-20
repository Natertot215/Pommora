// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notifyDeleted } from './notifications'
import { useSession } from '../../Session/store'

const cmdZ = (): boolean => {
  const e = new KeyboardEvent('keydown', {
    key: 'z',
    metaKey: true,
    bubbles: true,
    cancelable: true,
  })
  window.dispatchEvent(e)
  return e.defaultPrevented
}

beforeEach(() => {
  while (cmdZ()) {}
})

describe('a delete notification', () => {
  it('offers no Undo when the delete left nothing to restore', () => {
    notifyDeleted('Ideas')
    expect(useSession.getState().notification?.action).toBeUndefined()
    expect(cmdZ()).toBe(false)
  })

  it('restores once whether the label or the chord asks', () => {
    const undo = vi.fn()
    notifyDeleted('Ideas', undo)
    void useSession.getState().notification?.action?.run()
    expect(cmdZ()).toBe(false)
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('takes the chord and clears the label it spent', () => {
    const undo = vi.fn()
    notifyDeleted('Ideas', undo)
    expect(cmdZ()).toBe(true)
    expect(undo).toHaveBeenCalledTimes(1)
    expect(useSession.getState().notification).toBeNull()
    void useSession.getState().notification?.action?.run()
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('walks past a spent entry to the one beneath it', () => {
    const older = vi.fn()
    const newer = vi.fn()
    notifyDeleted('Older', older)
    notifyDeleted('Newer', newer)
    void useSession.getState().notification?.action?.run()
    expect(cmdZ()).toBe(true)
    expect(newer).toHaveBeenCalledTimes(1)
    expect(older).toHaveBeenCalledTimes(1)
  })
})
