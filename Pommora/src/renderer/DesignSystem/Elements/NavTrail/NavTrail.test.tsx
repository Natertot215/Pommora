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

  it('brightens the whole trail as an option, not a location', () => {
    const html = renderToStaticMarkup(<NavTrail segments={three} variant="option" />)
    expect(html).toContain(s.option)
  })

  it('pops the last non-ghost stop to the option tone when selected', () => {
    const html = renderToStaticMarkup(<NavTrail segments={three} selected />)
    const leaf = html.indexOf(s.option)
    expect(leaf).toBeGreaterThan(-1)
    expect(html.indexOf('>B<')).toBeGreaterThan(leaf)
    expect(html.indexOf('>C<')).toBeGreaterThan(html.indexOf('>B<'))
    expect(html.indexOf(s.option, leaf + 1)).toBe(-1)
  })

  it('renders nothing for an empty trail', () => {
    expect(renderToStaticMarkup(<NavTrail segments={[]} />)).toBe('')
  })
})
