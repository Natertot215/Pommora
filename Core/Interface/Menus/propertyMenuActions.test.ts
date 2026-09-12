import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import { makeTree } from '../../Testing/testTree'
import { propertyMenuRows } from './propertyMenuActions'

const SCHEMA: PropertyDefinition[] = [
  {
    id: 'sel',
    name: 'stage',
    type: 'select',
    select_options: [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ],
  },
  { id: 'box', name: 'Done', type: 'checkbox' },
  { id: 'num', name: 'Count', type: 'number' },
  { id: 'made', name: 'Made', type: 'created_time' },
]

const row = (
  frontmatter: Record<string, unknown> = {},
  contextValues?: Record<string, string[]>,
): ViewRow => ({
  id: 'p1',
  title: 'Alpha',
  path: 'Notes/Alpha.md',
  frontmatter: { ID: 'p1', ...frontmatter } as PageFrontmatter,
  createdAt: null,
  modifiedAt: null,
  ...(contextValues ? { contextValues } : {}),
})

const rowsFor = (r: ViewRow) => propertyMenuRows({ tree: makeTree(), schema: SCHEMA, row: r })

describe('propertyMenuRows', () => {
  it('leads with the registry contexts, then the schema behind a divider, and drops the stamps', () => {
    const rows = rowsFor(row())
    expect(rows.map((r) => r.name)).toEqual(['Realms', 'stage', 'Done', 'Count'])
    expect(rows[1].separatorBefore).toBe(true)
    expect(rows[0].separatorBefore).toBeUndefined()
  })

  it('a context offers its spaces, checked against the page', () => {
    const [realms] = rowsFor(row({}, { g1: ['t1'] }))
    expect(realms.options).toEqual([
      { value: 'a1', label: 'Work', checked: false },
      { value: 't1', label: 'Reading', checked: true },
      { value: 'pr1', label: 'Pommora', checked: false },
    ])
  })

  it('a checkbox offers Check and Uncheck, marking the standing state', () => {
    expect(rowsFor(row()).find((r) => r.name === 'Done')?.options).toEqual([
      { value: 'true', label: 'Check', checked: false },
      { value: '', label: 'Uncheck', checked: true },
    ])
    expect(rowsFor(row({ Done: true })).find((r) => r.name === 'Done')?.options?.[0].checked).toBe(
      true,
    )
  })

  it('a select marks the held option; a number stays a leaf for its own picker', () => {
    const rows = rowsFor(row({ stage: 'b' }))
    expect(rows.find((r) => r.name === 'stage')?.options).toEqual([
      { value: 'a', label: 'Alpha', checked: false },
      { value: 'b', label: 'Beta', checked: true },
    ])
    expect(rows.find((r) => r.name === 'Count')?.options).toBeUndefined()
  })
})
