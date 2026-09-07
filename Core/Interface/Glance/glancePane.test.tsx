// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { bloomOpen } from '@pommora/uix/Animations/animations.css'
import { MENU_GAP } from '@pommora/uix/Menus/menu-anchor'
import { GLANCE_DEFAULT, GlancePane, glanceSize, glanceWarmSeam, setGlanceSize } from './GlancePane'
import { armGlance, closeGlance, glanceShown, setGlancePresenter } from './glanceAction'
import type { GlanceTarget } from '../../MarkdownPM/api'
import { cachePageDetail, dropPageDetail } from '../../Session/pageDetailCache'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const page = { kind: 'page', id: 'p1', path: 'Notes/Alpha.md' } as const
const detail = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md', frontmatter: {}, body: 'hi' }

const glanceStore = {
  load: vi.fn(async () => ({ ok: true as const, value: null })),
  save: vi.fn(async () => ({ ok: true as const, value: null })),
}

const stubNexus = (extra: Record<string, unknown>): void => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'editor:format-state': () => {},
    'menu:action': () => () => {},
    'glance:load': glanceStore.load,
    'glance:save': glanceStore.save,
    ...extra,
  })
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  useSession.setState({ activeTabId: 'tab-1' })
  stubNexus({})
  cachePageDetail(detail)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<GlancePane />))
})

afterEach(() => {
  act(() => closeGlance())
  act(() => useSession.getState().resetGlance())
  act(() => root.unmount())
  host.remove()
  dropPageDetail(page.path)
  useSession.setState((s) => ({
    personalization: { ...s.personalization, previewPersistence: undefined },
    selection: { kind: 'none' },
  }))
  for (const n of document.querySelectorAll('[data-picker-portal]')) n.remove()
})

const link = (): HTMLElement => {
  const el = document.createElement('span')
  document.body.appendChild(el)
  return el
}
const paneOpen = (): boolean => document.querySelector('[data-picker-portal]') !== null
const flush = async (): Promise<void> => await act(async () => {})
const present = (el: Element, target: GlanceTarget = page): void => {
  vi.useFakeTimers()
  try {
    act(() => {
      armGlance(target, el, 'link')
      vi.runAllTimers()
    })
  } finally {
    vi.useRealTimers()
  }
}

describe('the presenter', () => {
  it('a warm page opens synchronously', () => {
    present(link())
    expect(paneOpen()).toBe(true)
  })

  it('a detached element is a no-op — the orphaned dwell cannot open a corner pane', () => {
    const el = link()
    el.remove()
    present(el)
    expect(paneOpen()).toBe(false)
  })

  it('a cold page opens only once its fetch lands, still under the pointer', async () => {
    dropPageDetail(page.path)
    stubNexus({ 'page:open': async () => ({ ok: true, value: detail }) })
    const el = link()
    const hoverSpy = vi.spyOn(el, 'matches').mockReturnValue(true)
    present(el)
    expect(paneOpen()).toBe(false)
    await flush()
    expect(hoverSpy).toHaveBeenCalledWith(':hover')
    expect(paneOpen()).toBe(true)
  })

  it('a flick-away during the fetch opens nothing', async () => {
    dropPageDetail(page.path)
    stubNexus({ 'page:open': async () => ({ ok: true, value: detail }) })
    const el = link()
    vi.spyOn(el, 'matches').mockReturnValue(false)
    present(el)
    await flush()
    expect(paneOpen()).toBe(false)
  })

  it('a failed open blooms nothing', async () => {
    dropPageDetail(page.path)
    stubNexus({ 'page:open': async () => ({ ok: false, error: { code: 'io', message: 'gone' } }) })
    present(link())
    await flush()
    expect(paneOpen()).toBe(false)
  })

  it('navigation closes an open pane', () => {
    present(link())
    expect(paneOpen()).toBe(true)
    vi.useFakeTimers()
    try {
      act(() => useSession.setState({ activeTabId: 'tab-2' }))
      act(() => vi.advanceTimersByTime(500))
      expect(paneOpen()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it("an anchor inside the pane's own body arms nothing", () => {
    present(link())
    const inside = document.createElement('span')
    document.querySelector('[data-glance]')?.appendChild(inside)
    const spy = vi.fn()
    setGlancePresenter(spy)
    vi.useFakeTimers()
    try {
      armGlance({ kind: 'site', url: 'https://example.com' }, inside, 'link')
      vi.runAllTimers()
    } finally {
      vi.useRealTimers()
    }
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('the current-view guard', () => {
  it('a target already in the active view arms nothing', () => {
    act(() => useSession.setState({ selection: { kind: 'page', id: page.id, path: page.path } }))
    present(link())
    expect(paneOpen()).toBe(false)
  })

  it('a target for a different page still opens', () => {
    act(() =>
      useSession.setState({ selection: { kind: 'page', id: 'other', path: 'Notes/Other.md' } }),
    )
    present(link())
    expect(paneOpen()).toBe(true)
  })
})

describe('the live-pane shown flag (ghost suppression, Task 8)', () => {
  it('is true while a live pane shows and false once dismissed', () => {
    expect(glanceShown()).toBe(false)
    present(link())
    expect(paneOpen()).toBe(true)
    expect(glanceShown()).toBe(true)
    act(() => closeGlance())
    expect(glanceShown()).toBe(false)
  })

  it('flips false when navigation retargets the pane through null', () => {
    present(link())
    expect(glanceShown()).toBe(true)
    vi.useFakeTimers()
    try {
      act(() => useSession.setState({ activeTabId: 'tab-2' }))
      act(() => vi.advanceTimersByTime(500))
    } finally {
      vi.useRealTimers()
    }
    expect(paneOpen()).toBe(false)
    expect(glanceShown()).toBe(false)
  })
})

describe('the leave grace', () => {
  const leaveMove = (): void =>
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 500 }))
    })

  const setPersistence = (v: 'off' | '5s' | 'always'): void =>
    act(() =>
      useSession.setState((s) => ({
        personalization: { ...s.personalization, previewPersistence: v },
      })),
    )

  it("'5s' holds the pane the full grace after leaving, then dismisses", () => {
    setPersistence('5s')
    present(link())
    expect(paneOpen()).toBe(true)
    vi.useFakeTimers()
    try {
      leaveMove()
      act(() => vi.advanceTimersByTime(4999))
      expect(paneOpen()).toBe(true)
      act(() => vi.advanceTimersByTime(1))
      act(() => vi.advanceTimersByTime(1000))
      expect(paneOpen()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it("'always' schedules no dismiss timer, so the pane holds indefinitely", () => {
    setPersistence('always')
    present(link())
    vi.useFakeTimers()
    try {
      leaveMove()
      act(() => vi.advanceTimersByTime(600_000))
      expect(paneOpen()).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it("flipping persistence to 'off' dismisses a live pane", () => {
    present(link())
    expect(paneOpen()).toBe(true)
    vi.useFakeTimers()
    try {
      setPersistence('off')
      act(() => vi.advanceTimersByTime(1000))
      expect(paneOpen()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('focus on close', () => {
  const body = (): HTMLElement => document.querySelector('[data-glance]') as HTMLElement
  const pressInside = (): void => {
    const b = body()
    act(() => {
      b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    })
    const editable = b.querySelector('.cm-content') as HTMLElement | null
    editable?.focus()
  }
  const closeByEscape = (): void => {
    vi.useFakeTimers()
    try {
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
      })
      act(() => vi.advanceTimersByTime(500))
    } finally {
      vi.useRealTimers()
    }
  }

  it('hands focus back to the element that held it before the press', () => {
    const field = document.createElement('input')
    document.body.appendChild(field)
    field.focus()
    present(link())
    pressInside()
    expect(body().contains(document.activeElement)).toBe(true)
    closeByEscape()
    expect(document.activeElement).toBe(field)
  })

  it('a second press inside the pane does not re-record', () => {
    const field = document.createElement('input')
    document.body.appendChild(field)
    field.focus()
    present(link())
    pressInside()
    pressInside()
    closeByEscape()
    expect(document.activeElement).toBe(field)
  })

  it('with nothing focused before the press, close leaves focus on the body', () => {
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    present(link())
    pressInside()
    closeByEscape()
    expect(document.activeElement).toBe(document.body)
  })
})

describe('pinned panes (Task 10)', () => {
  const pinTarget = { kind: 'page', id: page.id, path: page.path } as const
  const addPin = (over: Record<string, unknown> = {}): string => {
    act(() =>
      useSession.getState().pinGlance({
        tabId: 'tab-1',
        target: pinTarget,
        anchorX: 200,
        anchorY: 100,
        anchorHeight: 16,
        size: { w: 260, h: 120 },
        ...over,
      }),
    )
    const pins = useSession.getState().pinnedGlances
    return pins[pins.length - 1].pinId
  }
  const bodies = (): number => document.querySelectorAll('[data-glance]').length
  const pinCount = (): number => useSession.getState().pinnedGlances.length
  const pressEscape = (): void =>
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    })
  // A close begins a bloom-out; the store entry leaves only once that exit plays through, so these settle fake time.
  const underFakeTime = (fire: () => void): void => {
    vi.useFakeTimers()
    try {
      act(fire)
      act(() => vi.advanceTimersByTime(500))
    } finally {
      vi.useRealTimers()
    }
  }
  const escapeAndSettle = (): void =>
    underFakeTime(() =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })),
    )
  const clickAwayAndSettle = (): void =>
    underFakeTime(() => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })))
  const clickAwayInside = (target: HTMLElement): void =>
    underFakeTime(() => target.dispatchEvent(new Event('pointerdown', { bubbles: true })))

  it('the live pane plays the enter bloom', () => {
    present(link())
    expect(document.querySelector(`[data-picker-portal] .${bloomOpen}`)).not.toBeNull()
  })

  it('a pinned pane appears without the enter bloom, so a lock cannot bloom in over the pane it replaced', () => {
    addPin()
    expect(document.querySelector('[data-picker-portal]')).not.toBeNull()
    expect(document.querySelector(`[data-picker-portal] .${bloomOpen}`)).toBeNull()
  })

  it('renders at its frozen anchor under the portal, not the inline branch', () => {
    addPin({ anchorX: 200, anchorY: 100, anchorHeight: 16 })
    const layer = document.querySelector('[data-picker-portal]') as HTMLElement
    expect(layer).not.toBeNull()
    expect(layer.style.left).toBe('200px')
    expect(layer.style.top).toBe(`${100 + 16 + MENU_GAP}px`)
    expect(layer.style.transform).toContain('translateX(-50%)')
  })

  it('survives a navigation that dismisses the live pane (control)', () => {
    present(link())
    addPin()
    expect(bodies()).toBe(2)
    vi.useFakeTimers()
    try {
      act(() =>
        useSession.setState({ selection: { kind: 'page', id: 'other', path: 'Notes/Other.md' } }),
      )
      act(() => vi.advanceTimersByTime(500))
    } finally {
      vi.useRealTimers()
    }
    expect(bodies()).toBe(1)
    expect(pinCount()).toBe(1)
  })

  it('a tab switch unmounts its pins, and returning remounts them', () => {
    addPin()
    expect(bodies()).toBe(1)
    act(() => useSession.setState({ activeTabId: 'tab-2' }))
    expect(bodies()).toBe(0)
    act(() => useSession.setState({ activeTabId: 'tab-1' }))
    expect(bodies()).toBe(1)
  })

  it('shows the lock on a page live card', () => {
    present(link())
    expect(document.querySelector('.glance-lock')).not.toBeNull()
  })

  it('shows no lock on a website live card', () => {
    present(link(), { kind: 'site', url: 'https://example.com' })
    expect(paneOpen()).toBe(true)
    expect(document.querySelector('.glance-lock')).toBeNull()
  })

  it('locking a live page appends a pin, holds focus, and dismisses the live pane', () => {
    present(link())
    const lock = document.querySelector('.glance-lock') as HTMLElement
    expect(lock).not.toBeNull()
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    act(() => {
      lock.dispatchEvent(md)
    })
    expect(md.defaultPrevented).toBe(true)
    vi.useFakeTimers()
    try {
      act(() => lock.click())
      act(() => vi.advanceTimersByTime(500))
    } finally {
      vi.useRealTimers()
    }
    const pins = useSession.getState().pinnedGlances
    expect(pins).toHaveLength(1)
    expect(pins[0].tabId).toBe('tab-1')
    expect(pins[0].locked).toBe(true)
    expect(pins[0].target).toEqual({ kind: 'page', id: page.id, path: page.path })
    expect(bodies()).toBe(1)
  })

  it('unlocking a pin keeps it rendered rather than closing it', () => {
    const id = addPin()
    expect(bodies()).toBe(1)
    act(() => useSession.getState().setPinLocked(id, false))
    expect(pinCount()).toBe(1)
    expect(bodies()).toBe(1)
  })

  it('a pin close blooms out before it leaves the store, not an instant unmount', () => {
    const id = addPin()
    act(() => useSession.getState().setPinLocked(id, false))
    vi.useFakeTimers()
    try {
      act(() =>
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })),
      )
      // Mid-exit: the pane is still mounted and the pin still in the store, blooming out.
      expect(bodies()).toBe(1)
      expect(pinCount()).toBe(1)
      act(() => vi.advanceTimersByTime(500))
      expect(bodies()).toBe(0)
      expect(pinCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('Esc closes the newest unlocked active-tab pin, leaving locked ones', () => {
    const locked = addPin()
    const open = addPin({ anchorX: 300 })
    act(() => useSession.getState().setPinLocked(open, false))
    expect(pinCount()).toBe(2)
    escapeAndSettle()
    expect(pinCount()).toBe(1)
    expect(useSession.getState().pinnedGlances[0].pinId).toBe(locked)
  })

  it('Esc leaves a locked pin standing', () => {
    addPin()
    escapeAndSettle()
    expect(pinCount()).toBe(1)
  })

  it('Esc bails while a live pane is shown, leaving pins untouched', () => {
    present(link())
    addPin()
    pressEscape()
    expect(pinCount()).toBe(1)
  })

  it('a pointerdown outside every glance portal scrubs unlocked pins but spares locked ones', () => {
    const locked = addPin()
    const open = addPin({ anchorX: 300 })
    act(() => useSession.getState().setPinLocked(open, false))
    expect(pinCount()).toBe(2)
    clickAwayAndSettle()
    expect(pinCount()).toBe(1)
    expect(useSession.getState().pinnedGlances[0].pinId).toBe(locked)
  })

  it('a pointerdown inside a glance portal spares unlocked pins', () => {
    const id = addPin()
    act(() => useSession.getState().setPinLocked(id, false))
    const portal = document.querySelector('[data-picker-portal]') as HTMLElement
    clickAwayInside(portal)
    expect(pinCount()).toBe(1)
  })

  it('navigation scrubs unlocked pins while locked ones survive', () => {
    const locked = addPin()
    const open = addPin({ anchorX: 300 })
    act(() => useSession.getState().setPinLocked(open, false))
    vi.useFakeTimers()
    try {
      act(() =>
        useSession.setState({ selection: { kind: 'page', id: 'other', path: 'Notes/Other.md' } }),
      )
      act(() => vi.advanceTimersByTime(500))
    } finally {
      vi.useRealTimers()
    }
    expect(pinCount()).toBe(1)
    expect(useSession.getState().pinnedGlances[0].pinId).toBe(locked)
  })

  it('unpins instantly with no unmount-while-open warning; a plain menu still warns', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warned = (): boolean =>
      spy.mock.calls.flat().some((a) => typeof a === 'string' && a.includes('unmounted while open'))
    const pinId = addPin()
    act(() => useSession.getState().unpinGlance(pinId))
    expect(warned()).toBe(false)

    const ctlHost = document.createElement('div')
    document.body.appendChild(ctlHost)
    const ctlRoot = createRoot(ctlHost)
    act(() =>
      ctlRoot.render(
        <PickerMenu open modal={false}>
          x
        </PickerMenu>,
      ),
    )
    act(() => ctlRoot.unmount())
    expect(warned()).toBe(true)
    ctlHost.remove()
    spy.mockRestore()
  })
})

describe('the size accessor', () => {
  it('an absent row keeps the default', () => {
    expect(glanceSize()).toEqual(GLANCE_DEFAULT)
  })

  it('a set clamps, rounds, and writes through', () => {
    setGlanceSize({ w: 300.6, h: 12 })
    expect(glanceSize()).toEqual({ w: 301, h: 100 })
    expect(glanceStore.save).toHaveBeenCalledWith({ w: 301, h: 100 })
    setGlanceSize(GLANCE_DEFAULT)
  })
})

describe('warmth', () => {
  const state = (doc: string, scrollTop: number): { editorState: unknown; scrollTop: number } => ({
    editorState: { doc },
    scrollTop,
  })

  it('restores what it captured while the body is unchanged', () => {
    const seam = glanceWarmSeam('w1', 'Notes/Alpha.md')
    seam.capture(state('hi', 40))
    expect(seam.restore()).toEqual(state('hi', 40))
  })

  it('a page edited elsewhere since the capture drops the entry, so the mount is cold', () => {
    const seam = glanceWarmSeam('w2', 'Notes/Alpha.md')
    seam.capture(state('hi', 40))
    cachePageDetail({ ...detail, body: 'changed' })
    expect(seam.restore()).toBeUndefined()
    expect(seam.restore()).toBeUndefined()
  })

  it('holds a bounded number of pages, evicting the least recently captured', () => {
    for (let i = 0; i < 11; i++) glanceWarmSeam(`cap-${i}`, `Notes/${i}.md`).capture(state('hi', i))
    expect(glanceWarmSeam('cap-0', 'Notes/0.md').restore()).toBeUndefined()
    expect(glanceWarmSeam('cap-1', 'Notes/1.md').restore()).toEqual(state('hi', 1))
    expect(glanceWarmSeam('cap-10', 'Notes/10.md').restore()).toEqual(state('hi', 10))
  })

  it('the pane hands the tile a seam, so an open captures on close', async () => {
    present(link())
    await flush()
    expect(document.querySelector('[data-glance] .cm-content')).not.toBeNull()
    vi.useFakeTimers()
    try {
      act(() => closeGlance())
      act(() => vi.advanceTimersByTime(500))
    } finally {
      vi.useRealTimers()
    }
    expect(glanceWarmSeam(page.id, page.path).restore()).toMatchObject({ scrollTop: 0 })
  })
})
