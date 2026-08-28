import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NavTrail } from './NavTrail'
import * as s from './navTrail.css'

const three = [{ title: 'A', icon: 'folder' }, { title: 'B' }, { title: 'C', ghost: true }]

describe('NavTrail', () => {
  it('draws one chevron between each pair of segments', () => {
    const html = renderToStaticMarkup(<NavTrail segments={three} />)
    expect(html.split('›').length - 1).toBe(2)
  })

  it('renders a segment as a button only when it can be selected', () => {
    const html = renderToStaticMarkup(
      <NavTrail segments={[{ title: 'A', onSelect: () => {} }, { title: 'B' }]} />,
    )
    expect(html.match(/<button/g)?.length).toBe(1)
  })

  it('emphasizes the last segment that is not a ghost', () => {
    const html = renderToStaticMarkup(<NavTrail segments={three} emphasize />)
    const cur = html.indexOf(s.current)
    expect(cur).toBeGreaterThan(-1)
    expect(html.indexOf('>B<')).toBeGreaterThan(cur)
    expect(html.indexOf('>C<')).toBeGreaterThan(html.indexOf('>B<'))
    expect(html.indexOf(s.current, cur + 1)).toBe(-1)
  })

  it('renders nothing for an empty trail', () => {
    expect(renderToStaticMarkup(<NavTrail segments={[]} />)).toBe('')
  })
})
