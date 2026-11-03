// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { MutateRequest } from '../Nexus/mutateRequest'
import type { PageFrontmatter } from '../Nexus/schemas'
import type { NexusTree } from '../Nexus/tree'
import type { PropertyDefinition } from '../Properties/properties'
import { assignValue, oneShotWriter } from '../Properties/assignValue'
import { pageRowOf, spaceRowOf } from '../Views/pageRow'
import type { ViewRow } from '../Views/viewRow'
import { makeTree } from '../Testing/testTree'
import { type MetadataTarget, metadataBranches, runMetadataAction } from './metadataMenu'
import type { ActionItem } from './menuModel'
import { dateDefaults } from '../Properties/columnStyles'
import { useSession } from '../Session/store'
import { encodeValue } from '../Properties/propertyValue'

const SCHEMA: PropertyDefinition[] = [
  {
    id: 'prop_sel',
    label: 'stage',
    key: 'stage',
    type: 'select',
    select_options: [
      { id: 'opt_a', key: 'a', label: 'a' },
      { id: 'opt_b', key: 'b', label: 'b' },
    ],
  },
  {
    id: 'prop_tags',
    label: 'Tags',
    key: 'Tags',
    type: 'multiSelect',
    select_options: [
      { id: 'opt_x', key: 'x', label: 'x' },
      { id: 'opt_y', key: 'y', label: 'y' },
    ],
  },
  { id: 'prop_num', label: 'Count', key: 'Count', type: 'number' },
  { id: 'prop_box', label: 'Done', key: 'Done', type: 'checkbox' },
]

const CONTEXT_ID = makeTree().contexts[0].def.id

const treeWithSchema = (): NexusTree => {
  const tree = makeTree()
  tree.collections[0].propertyIds = SCHEMA.map((d) => d.id)
  tree.config.registry = SCHEMA
  return tree
}

const row = (frontmatter: Record<string, unknown> = {}): ViewRow =>
  pageRowOf(treeWithSchema(), { id: 'p1', path: 'Notes/Alpha.md', title: 'Alpha' }, {
    ID: 'p1',
    ...frontmatter,
  } as unknown as PageFrontmatter)

const target = (r: ViewRow, schema = SCHEMA): MetadataTarget => ({
  row: r,
  schema,
  rowOf: () => r,
  commit: () => undefined,
  trigger: {} as HTMLElement,
})

const branch = (
  items: ActionItem<string>[],
  label: 'Spaces' | 'Properties',
): readonly ActionItem<string>[] => items.find((i) => i.label === label)?.submenu ?? []

const rowsFor = (
  frontmatter: Record<string, unknown> = {},
): { spaces: readonly ActionItem<string>[]; properties: readonly ActionItem<string>[] } => {
  const items = metadataBranches(target(row(frontmatter)), treeWithSchema())
  return { spaces: branch(items, 'Spaces'), properties: branch(items, 'Properties') }
}

function harness(frontmatter: Record<string, unknown> = {}) {
  const tree = treeWithSchema()
  const page = row(frontmatter)
  const sent: MutateRequest[] = []
  useSession.setState({
    tree,
    mutate: async (req) => {
      sent.push(req)
      return {}
    },
  })
  const writer = oneShotWriter(page)
  const run = (action: string): boolean =>
    runMetadataAction(action, {
      row: page,
      schema: SCHEMA,
      rowOf: () => writer.current.rowOf(page.id),
      trigger: {} as HTMLElement,
      commit: (column, value) => {
        assignValue(writer, page, column, value)
      },
    })
  return { run, sent }
}

describe('metadataBranches', () => {
  it('draws Spaces then Properties, the schema in its own order, and leaves out an empty half', () => {
    const { spaces, properties } = rowsFor()
    expect(spaces.map((r) => r.label)).toEqual(['Realms'])
    expect(properties.map((r) => [r.label, r.submenu !== undefined])).toEqual([
      ['stage', true],
      ['Tags', true],
      ['Count', false],
      ['Done', true],
    ])
    const labels = (tree: NexusTree, schema: PropertyDefinition[]): string[] =>
      metadataBranches(target(row(), schema), tree).map((i) => i.label)
    const bare = { ...treeWithSchema(), contexts: [] }
    expect(labels(treeWithSchema(), SCHEMA)).toEqual(['Spaces', 'Properties'])
    expect(labels(treeWithSchema(), [])).toEqual(['Spaces'])
    expect(labels(bare, SCHEMA)).toEqual(['Properties'])
    expect(labels(bare, [])).toEqual([])
  })

  it('a context offers its spaces, checked against the page', () => {
    const [realms] = rowsFor({ '<Realms>': ['Reading'] }).spaces
    expect(realms.submenu).toEqual([
      { label: 'Work', action: `prop:${CONTEXT_ID}:a1`, checked: false },
      { label: 'Reading', action: `prop:${CONTEXT_ID}:t1`, checked: true },
      { label: 'Pommora', action: `prop:${CONTEXT_ID}:pr1`, checked: false },
    ])
  })

  it('a checkbox offers Check and Uncheck, marking the standing state', () => {
    const done = (fm?: Record<string, unknown>) =>
      rowsFor(fm).properties.find((r) => r.label === 'Done')?.submenu
    expect(done()).toEqual([
      { label: 'Check', action: 'prop:prop_box:true', checked: false },
      { label: 'Uncheck', action: 'prop:prop_box:', checked: true },
    ])
    expect(done({ Done: true })?.[0].checked).toBe(true)
  })

  it('a select marks the held option; a number stays a leaf for its own picker', () => {
    const { properties } = rowsFor({ stage: 'b' })
    expect(properties.find((r) => r.label === 'stage')?.submenu).toEqual([
      { label: 'a', action: 'prop:prop_sel:opt_a', checked: false },
      { label: 'b', action: 'prop:prop_sel:opt_b', checked: true },
    ])
    expect(properties.find((r) => r.label === 'Count')).toEqual({
      label: 'Count',
      action: 'prop:prop_num',
    })
  })

  it("leaves a Space out of its own Context's options", () => {
    const tree = treeWithSchema()
    const [realms] = branch(
      metadataBranches(
        target(spaceRowOf(tree, tree.contexts[0].spaces[0]), tree.config.registry),
        tree,
      ),
      'Spaces',
    )
    expect(realms.submenu?.map((o) => o.action)).toEqual([
      `prop:${CONTEXT_ID}:t1`,
      `prop:${CONTEXT_ID}:pr1`,
    ])
  })

  it('a status offers its non-empty groups as runs, each divided from the one before it', () => {
    const status: PropertyDefinition = {
      id: 'prop_st',
      label: 'Phase',
      key: 'Phase',
      type: 'status',
      status_groups: [
        {
          id: 'upcoming',
          label: 'Open',
          color: 'grey',
          options: [{ id: 'opt_Open', key: 'Open', label: 'Open' }],
        },
        { id: 'in_progress', label: 'Active', color: 'blue', options: [] },
        {
          id: 'done',
          label: 'Done',
          color: 'green',
          options: [
            { id: 'opt_Done', key: 'Done', label: 'Done' },
            { id: 'opt_Dropped', key: 'Dropped', label: 'Dropped' },
          ],
        },
      ],
    }
    const [phase] = branch(
      metadataBranches(target(row(), [status]), treeWithSchema()),
      'Properties',
    )
    expect(phase.submenu?.map((o) => [o.action, o.separatorBefore ?? false])).toEqual([
      ['prop:prop_st:opt_Open', false],
      ['prop:prop_st:opt_Done', true],
      ['prop:prop_st:opt_Dropped', false],
    ])
  })

  it('a property with no options to offer is an empty branch, which both renderers grey out', () => {
    const stage: PropertyDefinition = {
      id: 'prop_stage',
      label: 'Stage',
      key: 'Stage',
      type: 'select',
      select_options: [],
    }
    expect(
      branch(metadataBranches(target(row(), [stage]), treeWithSchema()), 'Properties'),
    ).toEqual([{ label: 'Stage', submenu: [] }])
  })
})

describe('a property pick from the page menu', () => {
  it('writes the option it landed on', () => {
    const { run, sent } = harness()
    expect(run('prop:prop_sel:opt_b')).toBe(true)
    expect(sent).toEqual([
      {
        op: 'setProperty',
        path: 'Notes/Alpha.md',
        propertyId: 'prop_sel',
        value: { kind: 'select', value: 'opt_b' },
      },
    ])
  })

  it('clears a select when the option it already holds is picked again', () => {
    const { run, sent } = harness({ stage: 'b' })
    run('prop:prop_sel:opt_b')
    expect(sent[0]).toMatchObject({ propertyId: 'prop_sel', value: null })
  })

  it('appends to a multi-select without disturbing what stands', () => {
    const { run, sent } = harness({ Tags: ['x'] })
    run('prop:prop_tags:opt_y')
    expect(sent[0]).toMatchObject({ value: { kind: 'multiSelect', value: ['opt_x', 'opt_y'] } })
  })

  it('toggles a held multi-select option off', () => {
    const { run, sent } = harness({ Tags: ['x', 'y'] })
    run('prop:prop_tags:opt_x')
    expect(sent[0]).toMatchObject({ value: { kind: 'multiSelect', value: ['opt_y'] } })
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
      if (req.op === 'setProperty')
        frontmatter = {
          ...frontmatter,
          Tags: req.value?.kind === 'multiSelect' ? encodeValue(SCHEMA[1], req.value) : undefined,
        }
      return req
    }
    expect(pick('prop:prop_tags:opt_x')).toMatchObject({
      value: { kind: 'multiSelect', value: ['opt_x'] },
    })
    expect(pick('prop:prop_tags:opt_y')).toMatchObject({
      value: { kind: 'multiSelect', value: ['opt_x', 'opt_y'] },
    })
    expect(frontmatter.Tags).toEqual(['x', 'y'])
  })

  it('hands a value picker the style of the view column the menu came from', () => {
    useSession.setState({ tree: treeWithSchema() })
    const style = { ...dateDefaults('relative'), time_format: 'twentyFourHour' as const }
    runMetadataAction('prop:prop_num', {
      ...target(row()),
      styleOf: (column) => (column.id === 'prop_num' ? style : dateDefaults('full')),
    })
    const pick = useSession.getState().pendingPick
    expect(pick?.column.id).toBe('prop_num')
    expect(pick?.style).toEqual(style)
  })

  it('passes on an action that is not a property pick', () => {
    const { run, sent } = harness()
    expect(run('title:rename')).toBe(false)
    expect(sent).toEqual([])
  })
})
