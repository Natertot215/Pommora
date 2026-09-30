// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '../Contract/result'
import type { NexusTree } from '../Nexus/tree'
import { makeTree } from '../Testing/testTree'
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

describe('a tree update carries a setting only when the tree itself changed it', () => {
  beforeEach(() => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'personalization:set': vi.fn(async () => ok(null)),
    })
    useSession.getState().applyTree(makeTree())
  })

  // An optimistic patch shares the tree's settings copy, and an older push stabilizes back to it; neither may undo a newer change.
  it('keeps a change the tree has not caught up with', () => {
    useSession.getState().setPersonalization('editorScale', 1.2)
    const tree = useSession.getState().tree as NexusTree
    useSession.getState().applyTree({ ...tree })
    useSession.getState().applyTree(structuredClone(tree))
    expect(useSession.getState().personalization.editorScale).toBe(1.2)
    expect(document.documentElement.style.getPropertyValue('--editor-scale')).toBe('1.2')
  })

  it('takes a change the tree brings', () => {
    const tree = makeTree()
    useSession.getState().applyTree({ ...tree, personalization: { editorScale: 1.3 } })
    expect(useSession.getState().personalization.editorScale).toBe(1.3)
  })
})
