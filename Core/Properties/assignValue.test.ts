// @vitest-environment jsdom
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { RefObject } from 'react'
import type { PageFrontmatter } from '../Nexus/schemas'
import type { ViewRow } from '../Views/viewRow'
import type { PropertyDefinition } from './properties'
import { assignValue, type ValueWriter } from './assignValue'
import { groupUndo, resetUndo, undoValue } from '../Session/undo'

const schema: PropertyDefinition[] = [
  {
    id: 'prop_tag',
    name: 'Tag',
    type: 'select',
    select_options: [{ value: 'red' }, { value: 'blue' }],
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

let apply: Mock<ValueWriter['apply']>
let mutate: Mock<ValueWriter['mutate']>
let row: ViewRow
let live: ValueWriter
let writer: RefObject<ValueWriter | null>

beforeEach(() => {
  apply = vi.fn()
  mutate = vi.fn(async () => ({}))
  row = rowOf({ id: 'page1', Tag: ['red'] })
  live = { schema, mutate, rowOf: (id) => (id === row.id ? row : undefined), apply }
  writer = { current: live }
  resetUndo()
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

  it('records a revert that writes the prior value back', async () => {
    await assignValue(
      writer,
      row,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    row = rowOf({ id: 'page1', Tag: ['blue'] })
    expect(undoValue(null)).toBe(true)
    expect(apply).toHaveBeenLastCalledWith(
      'page1',
      { id: 'page1', Tag: ['red'] },
      expect.anything(),
      undefined,
    )
    expect(mutate).toHaveBeenLastCalledWith({
      op: 'setProperty',
      path: row.path,
      propertyId: 'prop_tag',
      value: { kind: 'select', value: 'red' },
    })
  })

  it('reverts a blank prior as a clear, and pushes no second entry', async () => {
    row = rowOf({ id: 'page1' })
    await assignValue(
      writer,
      row,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    row = rowOf({ id: 'page1', Tag: ['blue'] })
    expect(undoValue(null)).toBe(true)
    expect(apply).toHaveBeenLastCalledWith('page1', { id: 'page1' }, expect.anything(), undefined)
    expect(mutate).toHaveBeenLastCalledWith({
      op: 'setProperty',
      path: row.path,
      propertyId: 'prop_tag',
      value: null,
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

  it('lays the Context patch beside the frontmatter and mutates the context', () => {
    assignValue(
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
    apply.mockClear()
    mutate.mockClear()
    live.rowOf = () => undefined
    expect(undoValue(null)).toBe(false)
    expect(apply).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('a refused write records nothing to undo', async () => {
    mutate.mockResolvedValueOnce(null)
    await assignValue(
      writer,
      row,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    expect(undoValue(null)).toBe(false)
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
    expect(undoValue(null)).toBe(true)
    expect(mutate).toHaveBeenCalledTimes(2)
    expect(undoValue(null)).toBe(false)
  })
})
