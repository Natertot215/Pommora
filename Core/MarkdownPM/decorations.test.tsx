// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { buildPageIndex } from '../Connections/pageIndex'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../Testing/editorHarness'
import { holdPane } from './Menus/caretPane'

stubEditorBridge()

afterEach(async () => {
  await cleanupEditor()
})

describe('the visible drawing', () => {
  it('marks each two-way arrow where it sits within the visible range', async () => {
    const view = await mountEditor({ initialBody: 'a ↔ b\n↔' })
    Object.defineProperty(view, 'visibleRanges', { get: () => [{ from: 4, to: 7 }] })
    await act(async () => {
      view.dispatch({ selection: { anchor: 1 } })
    })
    const arrows = [...view.contentDOM.querySelectorAll('.dual-direction-arrow')]
    expect(arrows.map((el) => view.posAtDOM(el))).toEqual([6])
  })
})

describe('an edit in the caret pane', () => {
  it('keeps the alias slot drawn as editing while the pane holds it, and rests it once it clears', async () => {
    const view = await mountEditor({
      initialBody: '[[Alpha|]]',
      connections: {
        index: buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
        headingsOf: () => undefined,
        open: () => {},
      },
      host: { aliases: { p1: ['one'] } },
    })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 8 } })
    })
    const revealed = (): string[] =>
      [...view.dom.querySelectorAll('.md-bracket')].map((e) => e.textContent ?? '')
    expect(revealed()).toEqual(['[[', '|]]'])
    await act(async () =>
      (document.querySelector('[aria-label="Add alias"]') as HTMLElement).click(),
    )
    expect(view.hasFocus).toBe(false)
    expect(revealed()).toEqual(['[[', '|]]'])
    await act(async () => {
      view.dispatch({ effects: holdPane.of(false) })
    })
    expect(revealed()).toEqual([])
  })
})

describe('a markdown link with an empty label', () => {
  const connections = {
    index: buildPageIndex([
      { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' },
      { id: 'p2', title: 'notes.io', path: 'Notes/notes.io.md' },
    ]),
    headingsOf: () => undefined,
    open: () => {},
  }
  const drawn = async (body: string, className: string): Promise<string | null> => {
    const view = await mountEditor({ initialBody: `x ${body}`, connections })
    await act(async () => {
      view.dispatch({ selection: { anchor: 0 } })
    })
    return view.dom.querySelector(`.${className}`)?.textContent ?? null
  }

  it('draws its target’s default label, as the link is drawn', async () => {
    expect(await drawn('[](Alpha)', 'md-connection-resolved')).toBe('Alpha')
    expect(await drawn('[](Alpha#Setup)', 'md-connection-resolved')).toBe('Setup')
    expect(await drawn('[](notes.io#Intro)', 'md-connection-resolved')).toBe('Intro')
    expect(await drawn('[](Nowhere)', 'md-connection-phantom')).toBe('Nowhere')
  })

  it('hides the escaping backslash in a label with the brackets, and reveals it with them once the caret is inside', async () => {
    const view = await mountEditor({ initialBody: 'x [a\\]b](Alpha)', connections })
    await act(async () => {
      view.dispatch({ selection: { anchor: 0 } })
    })
    expect(view.dom.querySelector('.md-connection-resolved')?.textContent).toBe('a]b')
    expect(view.dom.querySelector('.cm-line')?.textContent).toBe('x a]b')
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    expect(view.dom.querySelector('.cm-line')?.textContent).toBe('x [a\\]b](Alpha)')
    expect([...view.dom.querySelectorAll('.md-control')].map((e) => e.textContent)).toEqual([
      '[',
      '\\',
      ']',
    ])
  })
})
