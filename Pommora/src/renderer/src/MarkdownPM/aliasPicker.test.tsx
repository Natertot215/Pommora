// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { aliasSpanAt, emptyAliasPipeAt, linkAt } from '@shared/connections'
import { aliasRows } from './autocomplete'
import { AutocompletePanel } from './AutocompletePanel'
import { buildPageIndex } from './connections'
import { useSession } from '../store'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const index = buildPageIndex([
  { id: 'p1', title: 'Q3 Plan', path: 'Notes/Q3 Plan.md' },
  { id: 'p2', title: 'Other', path: 'Notes/Other.md' },
])
const duplicated = buildPageIndex([
  { id: 'b1', title: 'Beta', path: 'One/Beta.md' },
  { id: 'b2', title: 'Beta', path: 'Two/Beta.md' },
])

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = {
    aliases: { set: vi.fn(async () => ({ ok: true, value: null })) },
  }
  useSession.setState({ pageAliases: { p1: ['the plan', 'Q3 doc'] } })
})

describe('the picker offers what a page has been called before', () => {
  it('offers every remembered alias on an empty query, most recent first', () => {
    expect(aliasRows(index, 'Q3 Plan', '').map((r) => r.label)).toEqual(['the plan', 'Q3 doc'])
  })

  it('filters by what has been typed', () => {
    expect(aliasRows(index, 'Q3 Plan', 'the').map((r) => r.label)).toEqual(['the plan'])
    expect(aliasRows(index, 'Q3 Plan', 'zzz')).toEqual([])
  })

  it('a row inserts its own words rather than a link', () => {
    const [row] = aliasRows(index, 'Q3 Plan', '')
    expect(row.value).toBe('the plan')
    expect(row.isPage).toBe(false)
  })

  it('a page with nothing remembered offers nothing', () => {
    expect(aliasRows(index, 'Other', '')).toEqual([])
  })

  // The memory is keyed by PageID, so a title naming no single page names no memory either.
  it('a phantom or ambiguous title offers nothing', () => {
    expect(aliasRows(index, 'No Such Page', '')).toEqual([])
    expect(aliasRows(duplicated, 'Beta', '')).toEqual([])
  })

  it('a row forgets itself, and the rest survive', () => {
    aliasRows(index, 'Q3 Plan', '')[0].forget?.()
    expect(useSession.getState().pageAliases.p1).toEqual(['Q3 doc'])
  })
})

describe('the forget × is inert until it is revealed', () => {
  let host: HTMLDivElement | null = null
  let root: Root | null = null

  afterEach(async () => {
    await act(async () => root?.unmount())
    host?.remove()
    root = null
    host = null
  })

  // ChipRemoveButton gates its own click on computed opacity, so the reveal is what makes the ×
  // clickable at all. Opacity is set directly here rather than by hovering: jsdom applies no
  // stylesheet, and the point being pinned is the gate, not the CSS that drives it.
  const mountRow = async (forget: () => void): Promise<HTMLButtonElement> => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(
        <AutocompletePanel
          open
          candidates={[{ value: 'the plan', label: 'the plan', isPage: false, forget }]}
          index={0}
          left={0}
          top={0}
          query=""
          onPick={() => {}}
        />,
      )
    })
    return document.querySelector('.mdpm-ac-forget') as HTMLButtonElement
  }

  it('a click on a hidden × forgets nothing', async () => {
    const forget = vi.fn()
    const btn = await mountRow(forget)
    btn.style.opacity = '0'
    await act(async () => btn.click())
    expect(forget).not.toHaveBeenCalled()
  })

  it('a click on a revealed × forgets', async () => {
    const forget = vi.fn()
    const btn = await mountRow(forget)
    btn.style.opacity = '1'
    await act(async () => btn.click())
    expect(forget).toHaveBeenCalled()
  })
})

// One containment test behind all four callers, so they can't drift into disagreeing about which
// link the caret is in.
describe('linkAt is the one answer to which link holds an offset', () => {
  const line = 'see [[Q3 Plan|the plan]] and [[Other]] end'

  it('finds the link an offset sits in, at either bracket edge', () => {
    expect(linkAt(line, 4)?.full).toEqual([4, 24])
    expect(linkAt(line, 24)?.full).toEqual([4, 24])
    expect(linkAt(line, 30)?.full).toEqual([29, 38])
    expect(linkAt(line, 26)).toBeNull()
  })

  // The caret being somewhere in a link is not the caret being in its alias — the whole reason the
  // blur path needed the same guard the update listener already had.
  it('the alias span demands the caret be in the alias itself', () => {
    expect(aliasSpanAt(line, 6)).toBeNull() // inside the title
    expect(aliasSpanAt(line, 16)).toEqual([14, 22]) // inside the alias
  })

  it('an opened-but-empty alias reports its pipe and nothing else does', () => {
    expect(emptyAliasPipeAt('a [[Alpha|]] b', 10)).toBe(9)
    expect(emptyAliasPipeAt('a [[Alpha|x]] b', 10)).toBeNull()
    expect(emptyAliasPipeAt('a [[Alpha]] b', 5)).toBeNull()
  })
})
