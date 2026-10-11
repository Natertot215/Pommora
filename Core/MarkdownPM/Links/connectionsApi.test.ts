import { describe, expect, it } from 'vitest'
import { linkMenuTarget } from './connectionsApi'

const page = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }

describe('the one builder of a link menu target', () => {
  it('a page carries whether the surface authors it', () => {
    expect(linkMenuTarget({ kind: 'page', page }, true)).toEqual({
      kind: 'page',
      page,
      editable: true,
    })
  })

  it('a value carries whether its surface can remove it', () => {
    expect(
      linkMenuTarget({ kind: 'url', url: 'https://a.com' }, false, { hideable: true }),
    ).toEqual({ kind: 'url', url: 'https://a.com', editable: false, value: { hideable: true } })
  })

  it('a link naming nothing, or a heading no page holds, has no menu of its own', () => {
    expect(linkMenuTarget({ kind: 'invalid' }, true)).toBeNull()
    expect(linkMenuTarget({ kind: 'self', heading: 'H' }, true)).toBeNull()
  })
})
