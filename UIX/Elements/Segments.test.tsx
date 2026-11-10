// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Segments } from './Segments'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

  it('a keyed part keeps its key', () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const part = (key: string) => <b key={key}>{key}</b>
    act(() => root.render(<Segments parts={[part('b'), part('c')]} />))
    const [b, c] = host.querySelectorAll('b')
    act(() => root.render(<Segments parts={[part('a'), part('b'), part('c')]} />))
    const after = host.querySelectorAll('b')
    expect(after[1]).toBe(b)
    expect(after[2]).toBe(c)
    act(() => root.unmount())
  })
})
