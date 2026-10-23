// @vitest-environment jsdom
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { RefObject } from 'react'
import type { PageFrontmatter } from '../Nexus/schemas'
import type { MutateOutcome, MutateRequest } from '../Nexus/mutateRequest'
import type { ViewRow } from '../Views/viewRow'
import type { PropertyDefinition } from './properties'
import { assignValue, type ValueWriter } from './assignValue'
import { groupUndo, resetUndo, undoValue } from '../Session/undo'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'

const schema: PropertyDefinition[] = [
  {
    id: 'prop_tag',
    label: 'Tag',
    key: 'Tag',
    type: 'select',
    select_options: [
      { key: 'red', label: 'red' },
      { key: 'blue', label: 'blue' },
    ],
  },
]

const rowOf = (fm: Record<string, unknown>): ViewRow => ({
  id: 'page1',
  title: 'One',
  path: '/nexus/Notes/One.md',
  frontmatter: fm as PageFrontmatter,
  createdAt: null,
  modifiedAt: null,
})

const BEFORE = 'Tag:\n  - red\n'
/** A value write's reply, carrying the record that takes it back. */
const recorded = (req: MutateRequest): MutateOutcome =>
  req.op === 'setProperty' || req.op === 'setContext'
    ? {
        undo: { op: 'putBack', entries: [{ file: req.path, fieldId: 'prop_tag', before: BEFORE }] },
      }
    : {}

const settled = () => new Promise((r) => setTimeout(r))

let apply: Mock<ValueWriter['apply']>
let mutate: Mock<ValueWriter['mutate']>
let row: ViewRow
let live: ValueWriter
let writer: RefObject<ValueWriter | null>

beforeEach(() => {
  apply = vi.fn()
  mutate = vi.fn(async (req: MutateRequest) => recorded(req))
  row = rowOf({ id: 'page1', Tag: ['red'] })
  live = { schema, mutate, rowOf: (id) => (id === row.id ? row : undefined), apply }
  writer = { current: live }
  resetUndo()
  useSession.setState({ tree: null })
})

describe('assignValue', () => {
  it('patches the frontmatter and mutates the property', () => {
    assignValue(
      writer,
      row,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    expect(apply).toHaveBeenCalledWith(
      'page1',
      { id: 'page1', Tag: ['blue'] },
      expect.anything(),
      undefined,
    )
    expect(mutate).toHaveBeenCalledWith({
      op: 'setProperty',
      path: row.path,
      propertyId: 'prop_tag',
      value: { kind: 'select', value: 'blue' },
    })
  })

  it('undo sends the record the write’s reply carried, at the row’s current path', async () => {
    await assignValue(
      writer,
      row,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    row = { ...rowOf({ id: 'page1', Tag: ['blue'] }), path: '/nexus/Notes/Moved.md' }
    await settled()
    expect(undoValue(null)).toBe(true)
    expect(apply).toHaveBeenLastCalledWith(
      'page1',
      { id: 'page1', Tag: ['red'] },
      expect.anything(),
      undefined,
    )
    expect(mutate).toHaveBeenLastCalledWith({
      op: 'putBack',
      entries: [{ file: '/nexus/Notes/Moved.md', fieldId: 'prop_tag', before: BEFORE }],
    })
  })

  it('a record without `before` sends that entry as it came, and pushes no second entry', async () => {
    row = rowOf({ id: 'page1' })
    mutate.mockResolvedValueOnce({
      undo: { op: 'putBack', entries: [{ file: row.path, fieldId: 'prop_tag' }] },
    })
    await assignValue(
      writer,
      row,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    row = rowOf({ id: 'page1', Tag: ['blue'] })
    await settled()
    expect(undoValue(null)).toBe(true)
    expect(apply).toHaveBeenLastCalledWith('page1', { id: 'page1' }, expect.anything(), undefined)
    expect(mutate).toHaveBeenLastCalledWith({
      op: 'putBack',
      entries: [{ file: row.path, fieldId: 'prop_tag' }],
    })
    expect(undoValue(null)).toBe(false)
  })

  it('patches the live row, not the one the caller captured', () => {
    const captured = row
    row = rowOf({ id: 'page1', Tag: ['red'], Note: 'landed' })
    assignValue(
      writer,
      captured,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    expect(apply).toHaveBeenCalledWith(
      'page1',
      { id: 'page1', Tag: ['blue'], Note: 'landed' },
      expect.anything(),
      undefined,
    )
  })

  it('lays the Context patch beside the frontmatter and mutates the context', async () => {
    const record: MutateRequest = {
      op: 'putBack',
      entries: [{ file: row.path, fieldId: 'ctx_areas' }],
    }
    mutate.mockResolvedValueOnce({ undo: record })
    await assignValue(
      writer,
      row,
      { id: 'ctx_areas', kind: 'context' },
      {
        kind: 'context',
        value: ['space1'],
      },
    )
    expect(apply).toHaveBeenCalledWith('page1', { id: 'page1', Tag: ['red'] }, expect.anything(), {
      ctx_areas: ['space1'],
    })
    expect(mutate).toHaveBeenCalledWith({
      op: 'setContext',
      path: row.path,
      contextId: 'ctx_areas',
      spaceIds: ['space1'],
    })
    mutate.mockClear()
    await settled()
    expect(undoValue(null)).toBe(true)
    expect(mutate.mock.calls).toEqual([[record]])
  })

  it('writes nothing without a live writer, and nothing for an unknown property', () => {
    writer.current = null
    assignValue(writer, row, { id: 'prop_tag', kind: 'property' }, null)
    writer.current = { ...live, schema: [] }
    assignValue(writer, row, { id: 'prop_tag', kind: 'property' }, null)
    expect(apply).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
    expect(undoValue(null)).toBe(false)
  })

  it('a revert whose row is gone writes nothing and drains', async () => {
    await assignValue(
      writer,
      row,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    await settled()
    apply.mockClear()
    mutate.mockClear()
    live.rowOf = () => undefined
    expect(undoValue(null)).toBe(false)
    expect(apply).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('a refused write records nothing to undo, and a reply carrying no record leaves nothing to undo', async () => {
    for (const reply of [null, {}]) {
      mutate.mockResolvedValueOnce(reply)
      await assignValue(
        writer,
        row,
        { id: 'prop_tag', kind: 'property' },
        { kind: 'select', value: 'blue' },
      )
      await settled()
      expect(undoValue(null)).toBe(false)
    }
  })

  it('a sweep undoes as one step, even though its writes land later', async () => {
    const other = rowOf({ id: 'page2', Tag: ['red'] })
    live.rowOf = (id) => (id === row.id ? row : id === other.id ? other : undefined)
    const writes: Promise<boolean>[] = []
    groupUndo(() => {
      for (const r of [row, other])
        writes.push(
          assignValue(
            writer,
            r,
            { id: 'prop_tag', kind: 'property' },
            { kind: 'select', value: 'blue' },
          ) as Promise<boolean>,
        )
    })
    await Promise.all(writes)
    mutate.mockClear()
    await settled()
    expect(undoValue(null)).toBe(true)
    expect(mutate).toHaveBeenCalledTimes(2)
    expect(undoValue(null)).toBe(false)
  })
})

describe('a landed Link value remembers the alias it shows', () => {
  const column = { id: 'prop_link', kind: 'property' } as const
  const link = (value: string) => ({ kind: 'link', value }) as const
  const remembered = () => mutate.mock.calls.filter(([req]) => req.op === 'editAliases')

  beforeEach(() => {
    live.schema = [...schema, { id: 'prop_link', label: 'Link', key: 'Link', type: 'link' }]
    row = rowOf({ id: 'page1', Link: '[[Alpha|old]]' })
    useSession.setState({ tree: makeTree() })
  })

  it('remembers the alias once the write lands', async () => {
    await assignValue(writer, row, column, link('[[Alpha|the notes]]'))
    expect(mutate.mock.calls.map(([req]) => req.op)).toEqual(['setProperty', 'editAliases'])
    expect(mutate).toHaveBeenLastCalledWith({
      op: 'editAliases',
      path: 'Notes/Alpha.md',
      edit: { op: 'add', alias: 'the notes' },
    })
  })

  it('a refused write remembers nothing', async () => {
    mutate.mockResolvedValueOnce(null)
    await assignValue(writer, row, column, link('[[Alpha|the notes]]'))
    await settled()
    expect(remembered()).toEqual([])
  })

  it('an undo of the commit remembers nothing', async () => {
    await assignValue(writer, row, column, link('[[Alpha|the notes]]'))
    mutate.mockClear()
    expect(undoValue(null)).toBe(true)
    await settled()
    expect(mutate.mock.calls.map(([req]) => req.op)).toEqual(['putBack'])
  })

  it('an undo takes back the alias its write added', async () => {
    const forget: MutateRequest = {
      op: 'editAliases',
      path: 'Notes/Alpha.md',
      edit: { op: 'forget', alias: 'the notes' },
    }
    mutate.mockImplementation(async (req) =>
      req.op === 'editAliases' ? { undo: forget } : recorded(req),
    )
    await assignValue(writer, row, column, link('[[Alpha|the notes]]'))
    await settled()
    mutate.mockClear()
    expect(undoValue(null)).toBe(true)
    await settled()
    expect(mutate.mock.calls.map(([req]) => req)).toEqual([
      { op: 'putBack', entries: [{ file: row.path, fieldId: 'prop_tag', before: BEFORE }] },
      forget,
    ])
  })

  it('a new spelling of the alias it showed is remembered', async () => {
    await assignValue(writer, row, column, link('[[Alpha|Old]]'))
    expect(mutate).toHaveBeenLastCalledWith({
      op: 'editAliases',
      path: 'Notes/Alpha.md',
      edit: { op: 'add', alias: 'Old' },
    })
  })

  it('the alias it showed, retargeted to another page, is remembered by that page', async () => {
    await assignValue(writer, row, column, link('[[Nested Beta|old]]'))
    expect(mutate).toHaveBeenLastCalledWith({
      op: 'editAliases',
      path: 'Notes/Ideas/Beta.md',
      edit: { op: 'add', alias: 'old' },
    })
  })

  it('a markdown label is remembered as the alias it shows', async () => {
    await assignValue(writer, row, column, link('[my label](Alpha.md)'))
    expect(mutate).toHaveBeenLastCalledWith({
      op: 'editAliases',
      path: 'Notes/Alpha.md',
      edit: { op: 'add', alias: 'my label' },
    })
  })

  it.each([
    ['a phantom title', '[[Missing|x]]'],
    ['an unaliased link', '[[Alpha]]'],
    ['the alias it already showed', '[[Alpha|old]]'],
    ['an alias on a link naming a heading', '[[Alpha#Intro|my notes]]'],
    ['the same alias in the other syntax', '[old](Alpha.md)'],
    ["a label naming the page's own title", '[Alpha](Alpha.md)'],
    ['a label naming the heading', '[Intro](Alpha.md#Intro)'],
    ['an alias naming the heading', '[[Alpha#Intro|intro]]'],
    ['a website label', '[my label](https://example.com)'],
    ['a phantom markdown target', '[my label](Missing.md)'],
  ])('%s remembers nothing', async (_, value) => {
    await assignValue(writer, row, column, link(value))
    await settled()
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(remembered()).toEqual([])
  })
})
