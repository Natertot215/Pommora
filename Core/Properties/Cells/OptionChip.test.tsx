import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from '../properties'
import { optionGlyph } from './OptionChip'

const def: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'upcoming',
      label: 'Upcoming',
      color: 'gray',
      options: [{ value: 'not_started', group_id: 'upcoming' }],
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      color: 'blue',
      options: [{ value: 'active', group_id: 'in_progress' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ value: 'complete', group_id: 'done' }],
    },
  ],
}

describe('optionGlyph', () => {
  it('draws a Multi-Select option as tags and a Select option as a tag when the option has no icon', () => {
    expect(optionGlyph('multiSelect', { value: 'a' })).toBe('tags')
    expect(optionGlyph('select', { value: 'a' })).toBe('tag')
  })

  it('draws a Status option by its group when the option has no icon', () => {
    expect(optionGlyph('status', { value: 'not_started' }, def)).toBe('circle-dashed')
    expect(optionGlyph('status', { value: 'active' }, def)).toBe('minus')
    expect(optionGlyph('status', { value: 'complete' }, def)).toBe('check')
  })

  it('falls back to the upcoming glyph for an unknown value or a missing def', () => {
    expect(optionGlyph('status', { value: 'nope' }, def)).toBe('circle-dashed')
    expect(optionGlyph('status', { value: 'active' })).toBe('circle-dashed')
  })
})
