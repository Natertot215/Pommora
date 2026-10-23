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
      options: [{ id: 'opt_not_started', key: 'not_started', label: 'not_started' }],
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      color: 'blue',
      options: [{ id: 'opt_active', key: 'active', label: 'active' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ id: 'opt_complete', key: 'complete', label: 'complete' }],
    },
  ],
}

describe('optionGlyph', () => {
  it('draws a Multi-Select option as tags and a Select option as a tag when the option has no icon', () => {
    expect(optionGlyph('multiSelect', { label: 'a' })).toBe('tags')
    expect(optionGlyph('select', { label: 'a' })).toBe('tag')
  })

  it('draws a Status option by its group when the option has no icon', () => {
    expect(optionGlyph('status', { id: 'opt_not_started', label: 'not_started' }, def)).toBe(
      'circle-dashed',
    )
    expect(optionGlyph('status', { id: 'opt_active', label: 'active' }, def)).toBe('minus')
    expect(optionGlyph('status', { id: 'opt_complete', label: 'complete' }, def)).toBe('check')
  })

  it('a Status option’s glyph follows its id, so a label edited in place keeps its group’s glyph', () => {
    expect(optionGlyph('status', { id: 'opt_active', label: 'Doing' }, def)).toBe('minus')
  })

  it('falls back to the upcoming glyph for an unknown value or a missing def', () => {
    expect(optionGlyph('status', { label: 'nope' }, def)).toBe('circle-dashed')
    expect(optionGlyph('status', { id: 'opt_active', label: 'active' })).toBe('circle-dashed')
  })
})
