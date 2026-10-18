import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from '../properties'
import { optionGlyph } from './OptionChip'

const def: PropertyDefinition = {
  id: 'prop_status',
  label: 'Status',
  key: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'upcoming',
      label: 'Upcoming',
      color: 'gray',
      options: [{ key: 'not_started', label: 'not_started', group_id: 'upcoming' }],
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      color: 'blue',
      options: [{ key: 'active', label: 'active', group_id: 'in_progress' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ key: 'complete', label: 'complete', group_id: 'done' }],
    },
  ],
}

describe('optionGlyph', () => {
  it('draws a Multi-Select option as tags and a Select option as a tag when the option has no icon', () => {
    expect(optionGlyph('multiSelect', { label: 'a' })).toBe('tags')
    expect(optionGlyph('select', { label: 'a' })).toBe('tag')
  })

  it('draws a Status option by its group when the option has no icon', () => {
    expect(optionGlyph('status', { label: 'not_started' }, def)).toBe('circle-dashed')
    expect(optionGlyph('status', { label: 'active' }, def)).toBe('minus')
    expect(optionGlyph('status', { label: 'complete' }, def)).toBe('check')
  })

  it('falls back to the upcoming glyph for an unknown value or a missing def', () => {
    expect(optionGlyph('status', { label: 'nope' }, def)).toBe('circle-dashed')
    expect(optionGlyph('status', { label: 'active' })).toBe('circle-dashed')
  })
})
