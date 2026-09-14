import { describe, expect, it } from 'vitest'
import { merge3 } from './merge3'

const BASE = 'alpha\nbeta\ngamma\n'

describe('merge3', () => {
  it('keeps disjoint edits from both sides', () => {
    const local = 'alpha EDITED\nbeta\ngamma\n'
    const remote = 'alpha\nbeta\ngamma REMOTE\n'
    expect(merge3(BASE, local, remote)).toEqual({
      text: 'alpha EDITED\nbeta\ngamma REMOTE\n',
      conflicted: false,
    })
  })

  it('applies the same edit once', () => {
    const both = 'alpha\nbeta TWICE\ngamma\n'
    expect(merge3(BASE, both, both)).toEqual({ text: both, conflicted: false })
  })

  it('takes remote on an overlap and reports the conflict', () => {
    const local = 'alpha\nbeta MINE\ngamma\n'
    const remote = 'alpha\nbeta THEIRS\ngamma\n'
    expect(merge3(BASE, local, remote)).toEqual({ text: remote, conflicted: true })
  })

  it('yields remote when local equals base', () => {
    const remote = 'alpha\nbeta\ngamma\ndelta\n'
    expect(merge3(BASE, BASE, remote)).toEqual({ text: remote, conflicted: false })
  })
})
