import { describe, it, expect } from 'vitest'
import { aliasSpanAt, normalizeTitle } from './connections'

describe('normalizeTitle', () => {
  it('trims surrounding whitespace/newlines and case-folds', () => {
    expect(normalizeTitle('  My Page \n')).toBe('my page')
    expect(normalizeTitle('PROJECT')).toBe('project')
  })

  it('collapses titles that differ only by case/whitespace to one key', () => {
    expect(normalizeTitle(' Notes')).toBe(normalizeTitle('notes '))
  })

  it('NFC-normalizes so NFD and NFC spellings collapse to one key', () => {
    expect(normalizeTitle('Café')).toBe(normalizeTitle('Café'))
  })
})

// Where a typed `]` is refused: it would close the link early and truncate the alias being written.
describe('aliasSpanAt', () => {
  const line = 'see [[Q3 Plan|the plan]] end'
  it('finds the alias span from anywhere inside it', () => {
    expect(line.slice(...(aliasSpanAt(line, line.indexOf('the plan') + 3) as [number, number]))).toBe(
      'the plan',
    )
  })
  it('includes both ends, so a `]` at either is still refused', () => {
    expect(aliasSpanAt(line, line.indexOf('the plan'))).not.toBeNull()
    expect(aliasSpanAt(line, line.indexOf('the plan') + 'the plan'.length)).not.toBeNull()
  })
  it('is null in the title, in the prose, and in an unaliased link', () => {
    expect(aliasSpanAt(line, line.indexOf('Q3') + 1)).toBeNull()
    expect(aliasSpanAt(line, 1)).toBeNull()
    expect(aliasSpanAt('see [[Q3 Plan]] end', 8)).toBeNull()
  })
})
