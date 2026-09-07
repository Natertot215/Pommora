// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RefObject } from 'react'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import type { PropertyDefinition } from './properties'
import { assignValue, type ValueWriter } from './assignValue'

const schema: PropertyDefinition[] = [
  {
    id: 'prop_tag',
    name: 'Tag',
    type: 'select',
    select_options: [
      { value: 'red', label: 'Red' },
      { value: 'blue', label: 'Blue' },
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

const cmdZ = (): boolean => {
  const e = new KeyboardEvent('keydown', {
    key: 'z',
    metaKey: true,
    bubbles: true,
    cancelable: true,
  })
  window.dispatchEvent(e)
  return e.defaultPrevented
}

let apply: ReturnType<typeof vi.fn>
let mutate: ReturnType<typeof vi.fn>
let row: ViewRow
let writer: RefObject<ValueWriter | null>

beforeEach(() => {
  apply = vi.fn()
  mutate = vi.fn(() => Promise.resolve(true))
  row = rowOf({ id: 'page1', Tag: ['red'] })
  writer = {
    current: {
      schema,
      mutate: mutate as unknown as ValueWriter['mutate'],
      rowOf: (id) => (id === row.id ? row : undefined),
      apply: apply as unknown as ValueWriter['apply'],
    },
  }
  while (cmdZ()) {}
})

describe('assignValue', () => {
  it('patches the frontmatter and mutates the property', () => {
    assignValue(
      writer,
      row,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    expect(apply).toHaveBeenCalledWith('page1', { id: 'page1', Tag: ['blue'] }, expect.anything())
    expect(mutate).toHaveBeenCalledWith({
      op: 'setProperty',
      path: row.path,
      propertyId: 'prop_tag',
      value: { kind: 'select', value: 'blue' },
    })
  })

  it('records a revert that writes the prior value back', () => {
    assignValue(
      writer,
      row,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    row = rowOf({ id: 'page1', Tag: ['blue'] })
    expect(cmdZ()).toBe(true)
    expect(apply).toHaveBeenLastCalledWith(
      'page1',
      { id: 'page1', Tag: ['red'] },
      expect.anything(),
    )
    expect(mutate).toHaveBeenLastCalledWith({
      op: 'setProperty',
      path: row.path,
      propertyId: 'prop_tag',
      value: { kind: 'select', value: 'red' },
    })
  })

  it('reverts a blank prior as a clear, and pushes no second entry', () => {
    row = rowOf({ id: 'page1' })
    assignValue(
      writer,
      row,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    row = rowOf({ id: 'page1', Tag: ['blue'] })
    expect(cmdZ()).toBe(true)
    expect(apply).toHaveBeenLastCalledWith('page1', { id: 'page1' }, expect.anything())
    expect(mutate).toHaveBeenLastCalledWith({
      op: 'setProperty',
      path: row.path,
      propertyId: 'prop_tag',
      value: null,
    })
    expect(cmdZ()).toBe(false)
  })

  it('patches the contextValues rider and mutates the context', () => {
    assignValue(
      writer,
      row,
      { id: 'ctx_areas', kind: 'context' },
      {
        kind: 'context',
        value: ['space1'],
      },
    )
    expect(apply).toHaveBeenCalledWith(
      'page1',
      { id: 'page1', Tag: ['red'], contextValues: { ctx_areas: ['space1'] } },
      expect.anything(),
    )
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
    writer.current = {
      schema: [],
      mutate: mutate as unknown as ValueWriter['mutate'],
      rowOf: () => row,
      apply: apply as unknown as ValueWriter['apply'],
    }
    assignValue(writer, row, { id: 'prop_tag', kind: 'property' }, null)
    expect(apply).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
    expect(cmdZ()).toBe(false)
  })

  it('a revert whose row is gone writes nothing and drains', () => {
    assignValue(
      writer,
      row,
      { id: 'prop_tag', kind: 'property' },
      { kind: 'select', value: 'blue' },
    )
    apply.mockClear()
    mutate.mockClear()
    const live = writer.current as ValueWriter
    live.rowOf = () => undefined
    expect(cmdZ()).toBe(false)
    expect(apply).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
  })
})
