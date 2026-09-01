import { describe, it, expect } from 'vitest'
import { stripPageValue, replacePageValue } from './pageValue'

const page = (props: string) => `---\nid: p1\n${props}---\nbody\n`

describe('stripPageValue', () => {
  it('select: deletes the key iff the value matches', () => {
    const hit = stripPageValue(page('S: Urgent\n'), 'S', 'Urgent')
    expect(hit).toContain('body')
    expect(hit).not.toContain('S')
    expect(stripPageValue(page('S: Other\n'), 'S', 'Urgent')).toBeNull()
  })

  it('status: strips the bare label, same as select', () => {
    const c = stripPageValue(page('S: Active\n'), 'S', 'Active')
    expect(c).not.toBeNull()
    expect(c).not.toContain('Active')
  })

  it('multi_select: filters the array, deletes the key only when empty', () => {
    const kept = stripPageValue(page('M:\n    - a\n    - x\n    - b\n'), 'M', 'x')
    expect(kept).toContain('a')
    expect(kept).toContain('b')
    expect(kept).not.toContain('- x')
    const empty = stripPageValue(page('M:\n    - x\n'), 'M', 'x')
    expect(empty).not.toBeNull()
    expect(empty).not.toContain('M')
  })

  it('multi_select: preserves foreign (non-string) array elements it never targeted', () => {
    const c = stripPageValue(page('M:\n    - x\n    - 5\n    - keep\n'), 'M', 'x')
    expect(c).not.toBeNull()
    expect(c).toContain('- 5')
    expect(c).toContain('- keep')
    expect(c).not.toContain('- x')
  })
})

describe('the option list is the one shape', () => {
  it('a list-shaped Select or Status value is renamed and stripped in place', () => {
    const renamed = replacePageValue(page('Status:\n  - Active\n'), 'Status', 'Active', 'Live')
    expect(renamed).toContain('Status:\n  - Live')
    expect(renamed).not.toContain('Active')
    const stripped = stripPageValue(page('Status:\n  - Active\n'), 'Status', 'Active')
    expect(stripped).not.toBeNull()
    expect(stripped).not.toContain('Status')
  })

  it('a YAML number names the option it spells, and the rewrite spells it back as a string', () => {
    const renamed = replacePageValue(page('Year:\n  - 2024\n'), 'Year', '2024', 'FY2024')
    expect(renamed).toContain('Year:\n  - FY2024')
    expect(stripPageValue(page('Year: 2024\n'), 'Year', '2024')).not.toContain('Year')
    expect(stripPageValue(page('Year: 2025\n'), 'Year', '2024')).toBeNull()
  })

  it('a scalar written from outside rewrites to a list of one', () => {
    expect(replacePageValue(page('Status: Active\n'), 'Status', 'Active', 'Live')).toContain(
      'Status:\n  - Live',
    )
  })
})

describe('replacePageValue (rename cascade)', () => {
  it('select: swaps the matching value', () => {
    expect(replacePageValue(page('S: Urgent\n'), 'S', 'Urgent', 'Critical')).toContain('Critical')
  })

  it('status: swaps the bare label, same as select', () => {
    const c = replacePageValue(page('S: Active\n'), 'S', 'Active', 'Doing')
    expect(c).toContain('Doing')
    expect(c).not.toContain('Active')
  })

  it('multi_select: swaps one element in place', () => {
    const c = replacePageValue(page('M:\n    - a\n    - x\n'), 'M', 'x', 'y')
    expect(c).toContain('- y')
    expect(c).not.toContain('- x')
  })

  it('multi_select: preserves foreign elements when swapping', () => {
    const c = replacePageValue(page('M:\n    - x\n    - 5\n'), 'M', 'x', 'y')
    expect(c).toContain('- y')
    expect(c).toContain('- 5')
    expect(c).not.toContain('- x')
  })

  it('multi_select: renaming into a value already present merges, never duplicates', () => {
    const c = replacePageValue(page('M:\n    - x\n    - y\n'), 'M', 'x', 'y')
    expect(c).not.toBeNull()
    expect(c?.match(/^\s*- y\s*$/gm)?.length ?? 0).toBe(1)
  })

  it('returns null when the page does not hold the value', () => {
    expect(replacePageValue(page('S: Other\n'), 'S', 'Urgent', 'Critical')).toBeNull()
  })
})
