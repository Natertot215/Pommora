// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@pommora/core/Contract/result'
import { stubDialer } from '../vitest.setup'
import { useSession } from './store'

describe('a setting at its fallback stores no key', () => {
  const save = vi.fn(async () => ok(null))
  beforeEach(() => {
    save.mockClear()
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'personalization:set': save })
  })

  it('drops a default-off toggle switched back off', () => {
    useSession.getState().setPersonalization('hideChevrons', true)
    useSession.getState().setPersonalization('hideChevrons', false)
    expect(save).toHaveBeenLastCalledWith('hideChevrons', undefined)
    expect(useSession.getState().personalization.hideChevrons).toBeUndefined()
  })

  it('keeps the off of a default-on toggle and drops its on', () => {
    useSession.getState().setPersonalization('fileHistory', false)
    expect(save).toHaveBeenLastCalledWith('fileHistory', false)
    useSession.getState().setPersonalization('fileHistory', true)
    expect(save).toHaveBeenLastCalledWith('fileHistory', undefined)
  })

  it('drops a picker set back to its fallback', () => {
    useSession.getState().setPersonalization('tabOpenBehavior', 'newtab')
    expect(save).toHaveBeenLastCalledWith('tabOpenBehavior', 'newtab')
    useSession.getState().setPersonalization('tabOpenBehavior', 'overtake')
    expect(save).toHaveBeenLastCalledWith('tabOpenBehavior', undefined)
  })

  it('holds a typed stepped value as the host writes it', () => {
    useSession.getState().setPersonalization('tabMaxWidth', 173.6)
    expect(save).toHaveBeenLastCalledWith('tabMaxWidth', 174)
    expect(useSession.getState().personalization.tabMaxWidth).toBe(174)
    useSession.getState().setPersonalization('tabMaxWidth', 249.7)
    expect(save).toHaveBeenLastCalledWith('tabMaxWidth', undefined)
  })
})
