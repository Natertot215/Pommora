// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearNotification,
  currentNotification,
  notifyDeleted,
  persist,
  reportRefusal,
} from './notifications'
import { undoValue } from '../../Session/undo'

const cmdZ = (): boolean => undoValue(null)

beforeEach(() => {
  while (cmdZ()) {}
})

describe('a delete notification', () => {
  it('offers no Undo when the delete left nothing to restore', () => {
    notifyDeleted('Ideas')
    expect(currentNotification()?.action).toBeUndefined()
    expect(cmdZ()).toBe(false)
  })

  it('restores once whether the label or the chord asks', () => {
    const undo = vi.fn()
    notifyDeleted('Ideas', undo)
    void currentNotification()?.action?.run()
    expect(cmdZ()).toBe(false)
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('takes the chord and clears the label it spent', () => {
    const undo = vi.fn()
    notifyDeleted('Ideas', undo)
    expect(cmdZ()).toBe(true)
    expect(undo).toHaveBeenCalledTimes(1)
    expect(currentNotification()).toBeNull()
    void currentNotification()?.action?.run()
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('walks past a spent entry to the one beneath it', () => {
    const older = vi.fn()
    const newer = vi.fn()
    notifyDeleted('Older', older)
    notifyDeleted('Newer', newer)
    void currentNotification()?.action?.run()
    expect(cmdZ()).toBe(true)
    expect(newer).toHaveBeenCalledTimes(1)
    expect(older).toHaveBeenCalledTimes(1)
  })
})

describe('the refusal reporter', () => {
  const refused = {
    ok: false as const,
    error: { code: 'operation-failed' as const, message: 'disk full' },
  }

  beforeEach(() => clearNotification())

  it('posts a refusal as an error notice and answers whether it went through', () => {
    expect(reportRefusal({ ok: true, value: null })).toBe(true)
    expect(currentNotification()).toBeNull()
    expect(reportRefusal(refused)).toBe(false)
    expect(currentNotification()).toMatchObject({
      message: 'disk full',
      tone: 'error',
    })
  })

  it('names what a refused write lost, and logs it instead when quiet', async () => {
    await persist('the setting', Promise.resolve(refused))
    expect(currentNotification()?.message).toBe('Couldn’t save the setting: disk full')
    clearNotification()
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await persist('folds', Promise.resolve(refused), true)
    expect(currentNotification()).toBeNull()
    expect(log).toHaveBeenCalledWith('Couldn’t save folds: disk full')
    log.mockRestore()
  })

  it('stays silent when the write lands', async () => {
    await persist('the setting', Promise.resolve({ ok: true, value: null }))
    expect(currentNotification()).toBeNull()
  })
})
