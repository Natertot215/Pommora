// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { buildPageIndex } from '@pommora/core/Connections/pageIndex'
import {
  cleanupEditor,
  harnessState,
  mountEditor,
  seedHost,
  stubEditorBridge,
} from '../editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

stubEditorBridge()
afterEach(async () => {
  await cleanupEditor()
})

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}
const coords = { left: 10, right: 10, top: 10, bottom: 20 }

async function pickFirst(body: string, caret: number): Promise<{ doc: string; head: number }> {
  const view = await mountEditor({ initialBody: body, connections: conn })
  vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
  await act(async () => {
    view.focus()
    view.dispatch({ selection: { anchor: caret } })
  })
  expect(document.querySelector('.mdpm-ac')).toBeTruthy()
  await act(async () => {
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
  })
  return { doc: view.state.doc.toString(), head: view.state.selection.main.head }
}

describe('committing a connection leaves it reading as finished', () => {
  it('writes the link alone and rests the caret on its closer', async () => {
    const { doc, head } = await pickFirst('[[Alp]]', 4)
    expect(doc).toBe('[[Alpha]]')
    expect(head).toBe(9)
  })

  it('leaves the text that follows exactly as it was', async () => {
    const { doc, head } = await pickFirst('[[Alp]] rest', 4)
    expect(doc).toBe('[[Alpha]] rest')
    expect(head).toBe(9)
  })
})

describe('the alias picker', () => {
  const props = {
    initialBody: '[[Alpha|]]',
    connections: conn,
    host: { aliases: { p1: ['one', 'two'] } },
  }

  const openPicker = async () => {
    const view = await mountEditor(props)
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 8 } })
    })
    return view
  }

  const rows = (): number => document.querySelectorAll('.mdpm-ac .mdpm-ac-forget').length

  it('drops a row the host stops remembering, under the same query', async () => {
    await openPicker()
    expect(rows()).toBe(2)
    harnessState().aliases.p1 = ['one']
    await act(async () => {
      for (const cb of harnessState().aliasWatchers) cb()
    })
    expect(rows()).toBe(1)
  })

  it('remembers the alias a pick writes', async () => {
    const view = await openPicker()
    const remember = vi.spyOn(harnessState().host.aliases, 'remember')
    await act(async () => {
      view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('[[Alpha|one]]')
    expect(remember).toHaveBeenCalledTimes(1)
    expect(remember).toHaveBeenCalledWith('p1', 'one')
  })
})

describe('the picker stands down when it has nothing to add', () => {
  it('a sole suggestion identical to what is written opens no panel', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha]]', connections: conn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeNull()
  })

  it('refuses a click on a row held through the closing animation', async () => {
    const view = await mountEditor({ initialBody: '[[Alp]]', connections: conn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    await act(async () => {
      view.dispatch({ changes: { from: 5, insert: 'ha' }, selection: { anchor: 7 } })
    })
    const held = document.querySelector('.mdpm-ac .mdpm-autocomplete-match')
    expect(held).toBeTruthy()
    await act(async () => {
      held?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    })
    expect(view.state.doc.toString()).toBe('[[Alpha]]')
  })

  it('but a partial query still opens it', async () => {
    const view = await mountEditor({ initialBody: '[[Alp]]', connections: conn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
  })
})

describe('retargeting an aliased connection obeys the strip setting', () => {
  it('drops the alias by default — the old words describe the old page', async () => {
    seedHost({})
    const { doc } = await pickFirst('[[Alp|the one]]', 4)
    expect(doc).toBe('[[Alpha]]')
  })

  it('carries the alias across when the setting is off', async () => {
    seedHost({ settings: { removeTitleOnLinkChange: false } })
    const { doc } = await pickFirst('[[Alp|the one]]', 4)
    expect(doc).toBe('[[Alpha|the one]]')
  })
})

describe('the chevron slides in a page’s headings', () => {
  const headingConn: ConnectionsApi = {
    ...buildPageIndex([
      { id: 'pNotes', title: 'Notes', path: 'Notes.md' },
      { id: 'pBlank', title: 'Blank', path: 'Blank.md' },
    ]),
    open: () => {},
  }

  const seatReady = (id: string, body: string): void => {
    seedHost({ bodies: { [id]: body } })
  }

  it('the arrow-right chevron opens the fragment and lists the page’s headings', async () => {
    seatReady('pNotes', '## Setup\n\nbody')
    const view = await mountEditor({ initialBody: '[[Not]]', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    await act(async () => {
      view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      )
    })
    expect(view.state.doc.toString()).toBe('[[Notes#]]')
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Setup')
  })

  it('Return on a heading row finishes the link past the closer', async () => {
    seatReady('pNotes', '## Setup\n\nbody')
    const view = await mountEditor({ initialBody: '[[Not]]', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    await act(async () => {
      view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      )
    })
    await act(async () => {
      view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
    })
    expect(view.state.doc.toString()).toBe('[[Notes#Setup]]')
  })

  it('the alias slide follows a heading commit when the page has aliases', async () => {
    seatReady('pNotes', '## Setup\n\nbody')
    seedHost({ bodies: { pNotes: '## Setup\n\nbody' }, aliases: { pNotes: ['the notes'] } })
    const view = await mountEditor({ initialBody: '[[Not]]', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    for (const key of ['ArrowRight', 'Enter'])
      await act(async () => {
        view.contentDOM.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        )
      })
    expect(view.state.doc.toString()).toBe('[[Notes#Setup|]]')
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('the notes')
  })

  it('an abandoned heading slot drops its # when the caret leaves', async () => {
    seatReady('pNotes', '## Setup\n\nbody')
    const view = await mountEditor({ initialBody: '[[Not]] tail', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    await act(async () => {
      view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      )
    })
    expect(view.state.doc.toString()).toBe('[[Notes#]] tail')
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('[[Notes]] tail')
  })

  it('arrow-left backs the fragment out again', async () => {
    seatReady('pNotes', '## Setup\n\nbody')
    const view = await mountEditor({ initialBody: '[[Not]]', connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    await act(async () => {
      view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      )
    })
    expect(view.state.doc.toString()).toBe('[[Notes#]]')
    await act(async () => {
      view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      )
    })
    expect(view.state.doc.toString()).toBe('[[Notes]]')
  })

  it('a bare # lists the current document’s own headings', async () => {
    const body = '## Setup\n\n[[#]]'
    const view = await mountEditor({ initialBody: body, connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: body.lastIndexOf('#') + 1 } })
    })
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Setup')
  })

  it('a heading fragment on a page with none closes the pane', async () => {
    seatReady('pBlank', 'no headings here')
    const body = '[[Blank#]]'
    const view = await mountEditor({ initialBody: body, connections: headingConn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: body.indexOf('#') + 1 } })
    })
    expect(document.querySelectorAll('.mdpm-autocomplete-slot [class*="item"]')).toHaveLength(0)
  })
})
