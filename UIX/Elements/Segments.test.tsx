import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Segments } from './Segments'

const dividers = (html: string): number => html.split('aria-hidden="true"').length - 1

describe('Segments', () => {
  it('draws one hidden divider between each pair of parts, in order', () => {
    const html = renderToStaticMarkup(<Segments parts={['A', 'B', 'C']} />)
    expect(dividers(html)).toBe(2)
    expect(html.replace(/<[^>]+>/g, '')).toBe('ABC')
  })

  it('draws no divider around a lone part', () => {
    expect(dividers(renderToStaticMarkup(<Segments parts={['A']} />))).toBe(0)
  })
})
