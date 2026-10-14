import { describe, expect, it } from 'vitest'
import { idAt } from '../Nexus/ids'
import type { NexusTree } from '../Nexus/tree'
import { makeTree } from '../Testing/testTree'
import type { FilterRule, StandaloneFilter } from '../Views/filterRules'
import { opensInPreview } from './previewRules'

const JUNE_1 = new Date(2026, 5, 1, 9).getTime()
const top = { id: idAt(JUNE_1), path: 'Notes/Alpha.md' }
const deep = { id: idAt(JUNE_1 - 30 * 86_400_000), path: 'Notes/Ideas/Drafts/Deep.md' }

function treeWith(openInPreview?: StandaloneFilter): NexusTree {
  const base = makeTree({ personalization: { openInPreview } })
  return {
    ...base,
    collections: [
      {
        kind: 'collection',
        id: 'c1',
        title: 'Notes',
        path: 'Notes',
        pages: [{ kind: 'page', title: 'Alpha Plan', contextValues: { g1: ['a1'] }, ...top }],
        sets: [
          {
            kind: 'set',
            id: 's1',
            title: 'Ideas',
            path: 'Notes/Ideas',
            pages: [],
            sets: [
              {
                kind: 'set',
                id: 's2',
                title: 'Drafts',
                path: 'Notes/Ideas/Drafts',
                pages: [{ kind: 'page', title: 'Deep', ...deep }],
                sets: [],
              },
            ],
          },
        ],
      },
    ],
  }
}

const any = (...rules: FilterRule[]): StandaloneFilter => ({
  rules: { match: 'any', rules },
  enabled: true,
})
const judge = (filter: StandaloneFilter | undefined, page: { id: string; path: string }) =>
  opensInPreview(treeWith(filter), page)

describe('opensInPreview', () => {
  const title: FilterRule = { property_id: '_title', op: 'contains', value: 'alpha' }

  it('opens nothing without rules, with rules off, or with an emptied group', () => {
    expect(judge(undefined, top)).toBe(false)
    expect(judge({ ...any(title), enabled: false }, top)).toBe(false)
    expect(judge({ rules: { match: 'any', rules: [] }, enabled: true }, top)).toBe(false)
  })

  it('folds case on a Title rule', () => {
    expect(judge(any(title), top)).toBe(true)
    expect(judge(any(title), deep)).toBe(false)
  })

  it('reads Location Is as the page’s own Collection', () => {
    const rule = { property_id: '_location', op: 'is', values: ['c1'] }
    expect(judge(any(rule), top)).toBe(true)
    expect(judge(any(rule), deep)).toBe(false)
  })

  it('reads Location Contains through every level beneath a Set', () => {
    const rule = { property_id: '_location', op: 'is_inside', values: ['s1'] }
    expect(judge(any(rule), deep)).toBe(true)
    expect(judge(any(rule), top)).toBe(false)
  })

  it('reads a typed folder name, and a name no folder holds matches nothing', () => {
    expect(judge(any({ property_id: '_location', op: 'is_inside', values: ['ideas'] }), deep)).toBe(
      true,
    )
    expect(judge(any({ property_id: '_location', op: 'is_inside', values: ['Gone'] }), deep)).toBe(
      false,
    )
  })

  it('reads a Context Is Any from the tree’s own context values', () => {
    const rule = { property_id: 'g1', op: 'contains_any', values: ['a1', 't1'] }
    expect(judge(any(rule), top)).toBe(true)
    expect(judge(any(rule), deep)).toBe(false)
  })

  it('reads Created from the page’s id', () => {
    const rule = { property_id: '_created_at', op: 'on_or_after', value: '2026-05-15' }
    expect(judge(any(rule), top)).toBe(true)
    expect(judge(any(rule), deep)).toBe(false)
  })

  it('rejudges the same folders when the rules or the Contexts change', () => {
    const context = { property_id: 'g1', op: 'contains_any', values: ['a1'] }
    const on = treeWith(any(title, context))
    const withRules = (openInPreview: StandaloneFilter): NexusTree => ({
      ...on,
      config: { ...on.config, personalization: { openInPreview } },
    })
    expect(opensInPreview(on, top)).toBe(true)
    expect(opensInPreview(withRules({ ...any(title), enabled: false }), top)).toBe(false)
    const byContext = withRules(any(context))
    expect(opensInPreview(byContext, top)).toBe(true)
    expect(opensInPreview({ ...byContext, contexts: [] }, top)).toBe(false)
  })

  it('opens nothing for a path that no longer holds the page', () => {
    expect(judge(any(title), { ...top, path: 'Notes/Ideas/Alpha.md' })).toBe(false)
  })
})
