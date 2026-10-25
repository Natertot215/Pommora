// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { useValueContext, type ValueContext } from './valueContext'
import type { NexusTree } from '../Nexus/tree'
import { useSession } from '../Session/store'
import { mountEachTest } from '../Testing/viewHarness'

const tree = {
  contexts: [
    {
      def: { id: 'ctx_areas', title: 'Areas', singular: 'Area' },
      spaces: [
        {
          id: 'a1',
          kind: 'space',
          title: 'Personal',
          path: 'P',
          contextId: 'ctx_areas',
          color: 'blue',
        },
      ],
    },
    {
      def: { id: 'ctx_topics', title: 'Topics', singular: 'Topic' },
      spaces: [{ id: 't1', kind: 'space', title: 'Reading', path: 'R', contextId: 'ctx_topics' }],
    },
  ],
  config: {
    personalization: { headingLinkStyle: 'heading-only', inPageHeadingResolution: 'automatic' },
  },
} as unknown as NexusTree

let root: Root
mountEachTest((_h, r) => {
  root = r
})

const contextOf = (t: NexusTree | null): ValueContext | null => {
  let ctx: ValueContext | null = null
  function Probe(): null {
    ctx = useValueContext(t, [])
    return null
  }
  useSession.setState({ tree })
  act(() => root.render(createElement(Probe)))
  return ctx
}

describe('useValueContext', () => {
  it('bundles schema + the identity seam Space map', () => {
    const ctx = contextOf(tree)
    expect(ctx?.schema).toEqual([])
    expect(ctx?.contextsById.get('a1')?.title).toBe('Personal')
    expect(ctx?.contextsById.get('t1')?.title).toBe('Reading')
  })

  it('returns undefined for an unknown id', () => {
    expect(contextOf(tree)?.contextsById.get('nope')).toBeUndefined()
  })

  it("carries the view's heading-link settings", () => {
    const ctx = contextOf(tree)
    expect(ctx?.headingLinkStyle).toBe('heading-only')
    expect(ctx?.inPageHeadingResolution).toBe('automatic')
  })

  it('a missing tree answers no context', () => {
    expect(contextOf(null)).toBeNull()
  })
})
