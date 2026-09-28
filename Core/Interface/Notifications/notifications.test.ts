// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearNotification,
  currentNotification,
  notifyDeleted,
  persist,
  reportRefusal,
} from './notifications'
import { resetUndo, undoValue } from '../../Session/undo'

beforeEach(resetUndo)

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('a delete notification', () => {
  it('offers no Undo when the delete left nothing to restore', () => {
    notifyDeleted('Ideas')
    expect(currentNotification()?.action).toBeUndefined()
    expect(undoValue(null)).toBe(false)
  })

  it('restores once whether the label or the chord asks', async () => {
    const undo = vi.fn()
    notifyDeleted('Ideas', undo)
    void currentNotification()?.action?.run()
    expect(undoValue(null)).toBe(false)
    await settle()
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('takes the chord and clears the label it spent', async () => {
    const undo = vi.fn()
    notifyDeleted('Ideas', undo)
    expect(undoValue(null)).toBe(true)
    expect(currentNotification()).toBeNull()
    void currentNotification()?.action?.run()
    await settle()
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('carries a note beside its Undo', async () => {
    const undo = vi.fn()
    notifyDeleted('X', undo, { pages: [], warning: 'Couldn’t update 1 file.' })
    expect(currentNotification()?.message).toBe('Deleted “X”. Couldn’t update 1 file.')
    expect(currentNotification()?.segment).toBeUndefined()
    expect(currentNotification()?.tone).toBe('error')
    void currentNotification()?.action?.run()
    await settle()
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('counts the pages whose links it stripped behind a segment', () => {
    const undo = vi.fn()
    notifyDeleted('Ideas', undo, { pages: ['A.md', 'B.md'] })
    expect(currentNotification()).toMatchObject({
      message: 'Deleted “Ideas”',
      segment: '2 Internal Links',
      tone: 'normal',
      action: { label: 'Undo' },
    })
    notifyDeleted('Ideas', undo, { pages: ['A.md'] })
    expect(currentNotification()?.segment).toBe('1 Internal Link')
  })

  it('joins a warning to the count', () => {
    notifyDeleted('X', vi.fn(), {
      pages: ['A.md', 'B.md'],
      warning: 'Couldn’t update links in 1 file.',
    })
    expect(currentNotification()).toMatchObject({
      message: 'Deleted “X”',
      segment: '2 Internal Links. Couldn’t update links in 1 file.',
      tone: 'error',
    })
  })

  it('keeps Undo on the label when a count arrives without a warning', () => {
    notifyDeleted('X', vi.fn(), { pages: ['A.md'] }, vi.fn())
    expect(currentNotification()?.action?.label).toBe('Undo')
  })

  it('offers Try Again beside its note, and keeps Undo on the chord', async () => {
    const undo = vi.fn()
    const retry = vi.fn()
    notifyDeleted('X', undo, { pages: [], warning: 'Couldn’t update 1 file.' }, retry)
    expect(currentNotification()?.action?.label).toBe('Try Again')
    void currentNotification()?.action?.run()
    expect(retry).toHaveBeenCalledTimes(1)
    expect(undo).not.toHaveBeenCalled()
    expect(undoValue(null)).toBe(true)
    await settle()
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('walks past a spent entry to the one beneath it', async () => {
    const older = vi.fn()
    const newer = vi.fn()
    notifyDeleted('Older', older)
    notifyDeleted('Newer', newer)
    void currentNotification()?.action?.run()
    expect(undoValue(null)).toBe(true)
    await settle()
    expect(newer).toHaveBeenCalledTimes(1)
    expect(older).toHaveBeenCalledTimes(1)
  })

  it('once spent elsewhere, answers neither its label nor the chord, and leaves the screen', async () => {
    const older = vi.fn()
    const newer = vi.fn()
    notifyDeleted('Older', older)
    const spend = notifyDeleted('Newer', newer)
    const action = currentNotification()?.action
    spend()
    expect(currentNotification()).toBeNull()
    void action?.run()
    expect(undoValue(null)).toBe(true)
    await settle()
    expect(newer).not.toHaveBeenCalled()
    expect(older).toHaveBeenCalledTimes(1)
  })

  it('runs undos in turn, so a restore reads the tree the one before it left', async () => {
    let land = (): void => {}
    const newer = vi.fn(() => new Promise<void>((resolve) => (land = resolve)))
    const older = vi.fn()
    notifyDeleted('Older', older)
    notifyDeleted('Newer', newer)
    undoValue(null)
    undoValue(null)
    await settle()
    expect(newer).toHaveBeenCalledTimes(1)
    expect(older).not.toHaveBeenCalled()
    land()
    await settle()
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
