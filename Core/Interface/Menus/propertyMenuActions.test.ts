// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { assignValue, type ValueWriter } from '@pommora/core/Properties/assignValue'
import { applyValueAtRoot } from '@pommora/core/Properties/propertyValue'
import { pageRowOf } from '@pommora/core/Properties/pageRow'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import { makeTree } from '../../Testing/testTree'
import { propertyMenuRows, runPropertyAction } from './propertyMenuActions'

const SCHEMA: PropertyDefinition[] = [
  {
    id: 'prop_sel',
    name: 'stage',
    type: 'select',
    select_options: [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ],
  },
  {
    id: 'prop_tags',
    name: 'Tags',
    type: 'multi_select',
    select_options: [
      { value: 'x', label: 'Ex' },
      { value: 'y', label: 'Why' },
    ],
  },
  { id: 'prop_num', name: 'Count', type: 'number' },
  { id: 'prop_box', name: 'Done', type: 'checkbox' },
  { id: 'prop_made', name: 'Made', type: 'created_time' },
]

const CONTEXT_ID = makeTree().contexts[0].def.id

const treeWithSchema = (): NexusTree => {
  const tree = makeTree()
  tree.collections[0].properties = SCHEMA
  return tree
}

function harness(frontmatter: Record<string, unknown> = {}) {
  const tree = treeWithSchema()
  const row = pageRowOf(tree, { id: 'p1', path: 'Notes/Alpha.md', title: 'Alpha' }, {
    ID: 'p1',
    ...frontmatter,
  } as unknown as PageFrontmatter)
  const sent: MutateRequest[] = []
  const writer: { current: ValueWriter | null } = {
    current: {
      schema: SCHEMA,
      mutate: async (req) => {
        sent.push(req)
        return true
      },
      rowOf: (id) => (id === row.id ? row : undefined),
      apply: () => undefined,
    },
  }
  const run = (action: string): boolean =>
    runPropertyAction(action, {
      tree,
      schema: SCHEMA,
      row,
      trigger: {} as HTMLElement,
      commit: (column, value) => {
        assignValue(writer, row, column, value)
      },
    })
  return { run, sent }
}

const row = (frontmatter: Record<string, unknown> = {}): ViewRow =>
  pageRowOf(treeWithSchema(), { id: 'p1', path: 'Notes/Alpha.md', title: 'Alpha' }, {
    ID: 'p1',
    ...frontmatter,
  } as unknown as PageFrontmatter)

const rowsFor = (frontmatter: Record<string, unknown> = {}): ReturnType<typeof propertyMenuRows> =>
  propertyMenuRows({ tree: treeWithSchema(), schema: SCHEMA, row: row(frontmatter) })

describe('propertyMenuRows', () => {
  it('leads with the registry contexts, then the schema behind a divider, and drops the stamps', () => {
    const rows = rowsFor()
    expect(rows.map((r) => r.name)).toEqual(['Realms', 'stage', 'Tags', 'Done', 'Count'])
    expect(rows[1].separatorBefore).toBe(true)
    expect(rows[0].separatorBefore).toBeUndefined()
  })

  it('orders every property that opens a subtree ahead of the leaves, with no divider between them', () => {
    const rows = rowsFor().slice(1)
    expect(rows.map((r) => [r.name, r.options !== undefined])).toEqual([
      ['stage', true],
      ['Tags', true],
      ['Done', true],
      ['Count', false],
    ])
    expect(rows.slice(1).every((r) => r.separatorBefore === undefined)).toBe(true)
  })

  it('a context offers its spaces, checked against the page', () => {
    const [realms] = rowsFor({ '<Realms>': ['Reading'] })
    expect(realms.options).toEqual([
      { value: 'a1', label: 'Work', checked: false },
      { value: 't1', label: 'Reading', checked: true },
      { value: 'pr1', label: 'Pommora', checked: false },
    ])
  })

  it('a checkbox offers Check and Uncheck, marking the standing state', () => {
    expect(rowsFor().find((r) => r.name === 'Done')?.options).toEqual([
      { value: 'true', label: 'Check', checked: false },
      { value: '', label: 'Uncheck', checked: true },
    ])
    expect(rowsFor({ Done: true }).find((r) => r.name === 'Done')?.options?.[0].checked).toBe(true)
  })

  it('a select marks the held option; a number stays a leaf for its own picker', () => {
    const rows = rowsFor({ stage: 'b' })
    expect(rows.find((r) => r.name === 'stage')?.options).toEqual([
      { value: 'a', label: 'Alpha', checked: false },
      { value: 'b', label: 'Beta', checked: true },
    ])
    expect(rows.find((r) => r.name === 'Count')?.options).toBeUndefined()
  })
})

describe('a property pick from the page menu', () => {
  it('writes the option it landed on', () => {
    const { run, sent } = harness()
    expect(run('prop:prop_sel:b')).toBe(true)
    expect(sent).toEqual([
      {
        op: 'setProperty',
        path: 'Notes/Alpha.md',
        propertyId: 'prop_sel',
        value: { kind: 'select', value: 'b' },
      },
    ])
  })

  it('clears a select when the option it already holds is picked again', () => {
    const { run, sent } = harness({ stage: 'b' })
    run('prop:prop_sel:b')
    expect(sent[0]).toMatchObject({ propertyId: 'prop_sel', value: null })
  })

  it('appends to a multi-select without disturbing what stands', () => {
    const { run, sent } = harness({ Tags: ['x'] })
    run('prop:prop_tags:y')
    expect(sent[0]).toMatchObject({ value: { kind: 'multiSelect', value: ['x', 'y'] } })
  })

  it('toggles a held multi-select option off', () => {
    const { run, sent } = harness({ Tags: ['x', 'y'] })
    run('prop:prop_tags:x')
    expect(sent[0]).toMatchObject({ value: { kind: 'multiSelect', value: ['y'] } })
  })

  it('checks a box, and unchecks it by clearing rather than storing false', () => {
    const on = harness()
    on.run('prop:prop_box:true')
    expect(on.sent[0]).toMatchObject({ value: { kind: 'checkbox', value: true } })
    const off = harness({ Done: true })
    off.run('prop:prop_box:')
    expect(off.sent[0]).toMatchObject({ value: null })
  })

  it('routes a Space pick to its own Context group', () => {
    const { run, sent } = harness()
    expect(run(`prop:${CONTEXT_ID}:t1`)).toBe(true)
    expect(sent).toEqual([
      { op: 'setContext', path: 'Notes/Alpha.md', contextId: CONTEXT_ID, spaceIds: ['t1'] },
    ])
  })

  it('keeps the Spaces a group already holds when another is added', () => {
    const { run, sent } = harness({ '<Realms>': ['Work'] })
    run(`prop:${CONTEXT_ID}:t1`)
    expect(sent[0]).toMatchObject({ op: 'setContext', spaceIds: ['a1', 't1'] })
  })

  it('removes only the Space picked when the page already holds it', () => {
    const { run, sent } = harness({ '<Realms>': ['Work', 'Reading'] })
    run(`prop:${CONTEXT_ID}:a1`)
    expect(sent[0]).toMatchObject({ op: 'setContext', spaceIds: ['t1'] })
  })

  it('accumulates across two menus, each opened on a fresh read of the page', () => {
    let frontmatter: Record<string, unknown> = { ID: 'p1' }
    const pick = (action: string): MutateRequest => {
      const { run, sent } = harness(frontmatter)
      run(action)
      const req = sent[0]
      if (req.op === 'setProperty') {
        const def = SCHEMA.find((d) => d.id === req.propertyId)
        if (def) frontmatter = applyValueAtRoot(frontmatter as PageFrontmatter, def, req.value)
      }
      return req
    }
    expect(pick('prop:prop_tags:x')).toMatchObject({
      value: { kind: 'multiSelect', value: ['x'] },
    })
    expect(pick('prop:prop_tags:y')).toMatchObject({
      value: { kind: 'multiSelect', value: ['x', 'y'] },
    })
    expect(frontmatter.Tags).toEqual(['x', 'y'])
  })

  it('passes on an action that is not a property pick', () => {
    const { run, sent } = harness()
    expect(run('title:rename')).toBe(false)
    expect(sent).toEqual([])
  })
})
