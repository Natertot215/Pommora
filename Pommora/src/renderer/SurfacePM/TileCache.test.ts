import { describe, expect, it } from 'vitest'
import { cachePageDetail } from '../Store/TabState'
import { tileWarmSeam } from './TileCache'

const detail = (path: string, body: string) => ({
  id: path,
  title: path,
  path,
  frontmatter: {},
  body,
})

describe('tileWarmSeam', () => {
  it('round-trips a capture per host chain', () => {
    const seam = tileWarmSeam(['Host.md', 'Target.md'])
    cachePageDetail(detail('Target.md', 'hello'))
    seam.capture({ editorState: { doc: 'hello' }, scrollTop: 42 })
    expect(seam.restore()).toEqual({ editorState: { doc: 'hello' }, scrollTop: 42 })
    expect(tileWarmSeam(['Other.md', 'Target.md']).restore()).toBeUndefined()
  })

  it('a foreign edit to the page drops the entry', () => {
    const seam = tileWarmSeam(['Host.md', 'Edited.md'])
    cachePageDetail(detail('Edited.md', 'v1'))
    seam.capture({ editorState: { doc: 'v1' }, scrollTop: 10 })
    cachePageDetail(detail('Edited.md', 'v2'))
    expect(seam.restore()).toBeUndefined()
    cachePageDetail(detail('Edited.md', 'v1'))
    expect(seam.restore()).toBeUndefined()
  })
})
