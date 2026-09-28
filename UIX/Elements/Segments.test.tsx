import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Segments } from './Segments'

const drawn = (parts: string[]): string =>
  renderToStaticMarkup(<Segments parts={parts} />)
    .replace(/<span[^>]*aria-hidden="true"[^>]*><\/span>/g, '|')
    .replace(/<[^>]+>/g, '')

describe('Segments', () => {
  it('draws one hidden divider between each pair of parts, in order', () => {
    expect(drawn(['A', 'B', 'C'])).toBe('A|B|C')
  })

  it('draws no divider around a lone part', () => {
    expect(drawn(['A'])).toBe('A')
  })
})
