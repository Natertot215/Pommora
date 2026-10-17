// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { ConnectionsApi } from './connectionsApi'
import { buildPageIndex } from '../../Connections/pageIndex'
import {
  cleanupEditor,
  harnessState,
  mountEditor,
  stubEditorBridge,
  typeInto,
} from '../../Testing/editorHarness'
import { linkSettle, linkSettled, linkWriting } from './linkSettle'
import { paste } from './pasteLink'
import { linkRest, restedOnLink } from './linkReveal'

stubEditorBridge()
afterEach(async () => {
  await cleanupEditor()
})

const conn: ConnectionsApi = {
  index: buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  headingsOf: () => undefined,
  open: () => {},
}

const emptyBefore = async (view: EditorView, at: number): Promise<void> => {
  await act(async () => {
    view.dispatch({
      changes: { from: at - 1, to: at },
      selection: { anchor: at - 1 },
      userEvent: 'delete.backward',
    })
  })
}

const caretTo = async (view: EditorView, anchor: number): Promise<void> => {
  await act(async () => {
    view.dispatch({ selection: { anchor } })
    await new Promise((r) => setTimeout(r, 0))
  })
}

// Clicking into a connection that names no page is inspecting an unresolved link, and it should look unresolved — so the field follows the typing, not the caret.
describe('the link being written is the one an edit landed in', () => {
  const state = (doc: string): EditorState => EditorState.create({ doc, extensions: [linkWriting] })
  const edit = (
    s: EditorState,
    from: number,
    to: number,
    insert: string,
    userEvent = 'input.type',
  ): EditorState =>
    s.update({
      changes: { from, to, insert },
      selection: { anchor: from + insert.length },
      userEvent,
    }).state

  it('an edit landing inside a link arms it with how it read before', () => {
    expect(edit(state('a [[Alph]] b'), 8, 8, 'a').field(linkWriting)).toEqual({
      start: 2,
      was: '[[Alph]]',
    })
  })

  it('an edit landing in a markdown label arms it', () => {
    expect(edit(state('a [x](Alpha) b'), 4, 4, 'y').field(linkWriting)).toEqual({
      start: 2,
      was: '[x](Alpha)',
    })
  })

  it('a drop landing in a link arms it, since a drop reads as input', () => {
    expect(edit(state('a [[Alph]] b'), 8, 8, 'a', 'input.drop').field(linkWriting)?.start).toBe(2)
  })

  it('an edit outside every link, or just past a closer, arms nothing', () => {
    expect(edit(state('a [[Alpha]] b'), 0, 0, 'x').field(linkWriting)).toBeNull()
    expect(edit(state('a [[Alpha]] b'), 11, 11, 'x').field(linkWriting)).toBeNull()
  })

  it('a change no one typed arms nothing', () => {
    const s = state('a [[Alph]] b').update({ changes: { from: 8, insert: 'a' } }).state
    expect(s.field(linkWriting)).toBeNull()
  })

  it('a bare caret move keeps it, since only leaving the whole link settles it', () => {
    const typed = edit(state('a [[Alph]] b'), 8, 8, 'a')
    expect(typed.update({ selection: { anchor: 0 } }).state.field(linkWriting)?.start).toBe(2)
  })

  it('a settle clears it', () => {
    const typed = edit(state('a [[Alph]] b'), 8, 8, 'a')
    expect(typed.update({ effects: linkSettled.of(null) }).state.field(linkWriting)).toBeNull()
  })

  it('maps through an insertion before the link, baseline kept', () => {
    const typed = edit(state('a [[Alph]] b'), 8, 8, 'a')
    expect(edit(typed, 0, 0, 'xy').field(linkWriting)).toEqual({ start: 4, was: '[[Alph]]' })
  })

  it('keeps the baseline it first read while the edit continues', () => {
    const opened = edit(state('[x]()'), 4, 4, 'A')
    expect(opened.field(linkWriting)).toEqual({ start: 0, was: '' })
    expect(edit(opened, 5, 5, 'l').field(linkWriting)).toEqual({ start: 0, was: '' })
  })

  it('reads a closed link retyped over a selection, and keeps it through a second retype', () => {
    const retyped = edit(state('[Mine](Old) x'), 7, 10, 'Gam')
    expect(retyped.field(linkWriting)).toEqual({ start: 0, was: '[Mine](Old)' })
    expect(edit(retyped, 7, 10, 'Gr').field(linkWriting)?.was).toBe('[Mine](Old)')
  })

  it('an edit in another link re-arms on that link', () => {
    const first = edit(state('[[Old|Mine]] [[New]]'), 4, 4, 'x')
    expect(edit(first, 17, 17, 'y').field(linkWriting)).toEqual({ start: 14, was: '[[New]]' })
  })

  it('a heading slot opened and backed out of is the same link, its baseline what never closed', () => {
    const sliding = edit(state('[x]()'), 4, 4, 'Alpha#')
    expect(sliding.field(linkWriting)).toEqual({ start: 0, was: '' })
    const back = sliding.update({
      changes: { from: 9, to: 10 },
      selection: { anchor: 9 },
      userEvent: 'delete',
    }).state
    expect(back.field(linkWriting)).toEqual({ start: 0, was: '' })
  })

  it('typing on inside the link keeps the very same field', () => {
    const typed = edit(state('a [[Alph]] b'), 8, 8, 'a')
    expect(edit(typed, 9, 9, 'z').field(linkWriting)).toBe(typed.field(linkWriting))
  })

  it('a paste retargeting the whole link keeps how it read before the edit began', () => {
    const typed = edit(state('a [[Alpha|x]] b'), 11, 11, 'y')
    expect(edit(typed, 2, 14, '[[Beta|xy]]', 'input.paste').field(linkWriting)).toEqual({
      start: 2,
      was: '[[Alpha|x]]',
    })
  })

  it('deleting the link clears it, leaving the link beside it unarmed', () => {
    const typed = edit(state('a [[Alpha|x]][[Beta|Nice]] b'), 11, 11, 'y')
    expect(edit(typed, 2, 14, '', 'input').field(linkWriting)).toBeNull()
  })

  it('an undo taking back a typed link clears it', () => {
    const typed = edit(state('a  b'), 2, 2, '[[Alpha]]', 'input.paste')
    expect(typed.field(linkWriting)).toEqual({ start: 2, was: '' })
    expect(edit(typed, 2, 11, '', 'undo').field(linkWriting)).toBeNull()
  })
})

describe('an alias opened and abandoned leaves nothing behind', () => {
  it('leaving an emptied alias collapses its pipe', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|x]] b', connections: conn })
    await act(async () => view.focus())
    await caretTo(view, 11)
    await emptyBefore(view, 11)
    await caretTo(view, 0)
    expect(view.state.doc.toString()).toBe('a [[Alpha]] b')
  })

  it('leaving an emptied alias on a path link collapses its pipe as for any wikilink', async () => {
    const paths: ConnectionsApi = {
      ...conn,
      index: buildPageIndex([
        { id: 'a', title: 'Notes', path: 'A/Notes.md' },
        { id: 'b', title: 'Notes', path: 'B/Notes.md' },
      ]),
    }
    const view = await mountEditor({ initialBody: 'a [[A/Notes|x]] b', connections: paths })
    await act(async () => view.focus())
    await caretTo(view, 13)
    await emptyBefore(view, 13)
    await caretTo(view, 0)
    expect(view.state.doc.toString()).toBe('a [[A/Notes]] b')
  })

  it('collapses on blur without waiting for a timer', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|x]] b', connections: conn })
    await act(async () => view.focus())
    await caretTo(view, 11)
    await emptyBefore(view, 11)
    view.contentDOM.dispatchEvent(new FocusEvent('blur'))
    expect(view.state.doc.toString()).toBe('a [[Alpha]] b')
  })

  it('an empty alias the caret only passes through stays as written, so reading a note never rewrites it', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|]] b', connections: conn })
    await act(async () => view.focus())
    await caretTo(view, 10)
    await caretTo(view, 0)
    view.contentDOM.dispatchEvent(new FocusEvent('blur'))
    expect(view.state.doc.toString()).toBe('a [[Alpha|]] b')
  })

  it('an emptied alias keeps its pipe while the caret is in the title, and collapses once it leaves the whole link', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|x]] b', connections: conn })
    await act(async () => view.focus())
    await caretTo(view, 11)
    await emptyBefore(view, 11)
    await caretTo(view, 5)
    expect(view.state.doc.toString()).toBe('a [[Alpha|]] b')
    await caretTo(view, 0)
    expect(view.state.doc.toString()).toBe('a [[Alpha]] b')
  })

  it('an empty alias behind a retyped title tidies on leave', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpa|]] b', connections: conn })
    await act(async () => view.focus())
    await caretTo(view, 7)
    await act(async () => {
      view.dispatch({
        changes: { from: 7, insert: 'h' },
        selection: { anchor: 8 },
        userEvent: 'input.type',
      })
    })
    await caretTo(view, 0)
    expect(view.state.doc.toString()).toBe('a [[Alpha]] b')
  })

  it('a caret back in the link before the deferred collapse runs keeps its empty slot', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|x]] b', connections: conn })
    await act(async () => view.focus())
    await caretTo(view, 11)
    await emptyBefore(view, 11)
    await act(async () => {
      view.dispatch({ selection: { anchor: 0 } })
      view.dispatch({ selection: { anchor: 10 } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('a [[Alpha|]] b')
  })

  it('a flush after a deferred settle collapses at once, and the timer then changes nothing', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|x]] b', connections: conn })
    await act(async () => view.focus())
    await caretTo(view, 11)
    await emptyBefore(view, 11)
    await act(async () => {
      view.dispatch({ selection: { anchor: 0 } })
      view.plugin(linkSettle)?.flush()
      expect(view.state.doc.toString()).toBe('a [[Alpha]] b')
      expect(view.state.field(linkWriting)).toBeNull()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('a [[Alpha]] b')
  })

  it('a written alias is left alone', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 12 } })
    })
    await act(async () => {
      view.dispatch({ selection: { anchor: 0 } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('a [[Alpha|the one]] b')
  })
})

describe('the alias memory hears only what was authored', () => {
  it('walking the caret through existing aliases and labels remembers nothing', async () => {
    const view = await mountEditor({
      initialBody: 'a [[Alpha|one]] [two](Alpha) b',
      connections: conn,
    })
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () => view.focus())
    await caretTo(view, 12)
    await caretTo(view, 18)
    await caretTo(view, 0)
    await caretTo(view, 12)
    view.contentDOM.dispatchEvent(new FocusEvent('blur'))
    expect(edit).not.toHaveBeenCalled()
  })

  it('typing an alias and leaving remembers it once', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|]] b', connections: conn })
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () => view.focus())
    await caretTo(view, 10)
    await act(async () => {
      view.dispatch({
        changes: { from: 10, insert: 'new' },
        selection: { anchor: 13 },
        userEvent: 'input.type',
      })
    })
    await caretTo(view, 0)
    await caretTo(view, 12)
    await caretTo(view, 0)
    expect(edit).toHaveBeenCalledTimes(1)
    expect(edit).toHaveBeenCalledWith('p1', { op: 'add', alias: 'new' })
  })

  it('two caret moves outside the link before the settle lands remember once', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|]] b', connections: conn })
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () => view.focus())
    await caretTo(view, 10)
    await act(async () => {
      view.dispatch({
        changes: { from: 10, insert: 'new' },
        selection: { anchor: 13 },
        userEvent: 'input.type',
      })
    })
    await act(async () => {
      view.dispatch({ selection: { anchor: 0 } })
      view.dispatch({ selection: { anchor: 1 } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(edit.mock.calls).toEqual([['p1', { op: 'add', alias: 'new' }]])
  })

  it('an alias typed and left by unmounting is remembered through the flush', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|]] b', connections: conn })
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () => view.focus())
    await caretTo(view, 10)
    await act(async () => {
      view.dispatch({
        changes: { from: 10, insert: 'new' },
        selection: { anchor: 13 },
        userEvent: 'input.type',
      })
    })
    await cleanupEditor()
    expect(edit.mock.calls).toEqual([['p1', { op: 'add', alias: 'new' }]])
  })

  it('a paste retargeting a link arms the tracker against the link as it read before', async () => {
    const pages: ConnectionsApi = {
      ...conn,
      index: buildPageIndex([
        { id: 'p1', title: 'Page1', path: 'Page1.md' },
        { id: 'p2', title: 'Page2', path: 'Page2.md' },
      ]),
    }
    for (const [container, at, text] of [
      ['[[Page1]]', 4, '[x](Page2)'],
      ['[[Page1#H]]', 6, '[x](Page2)'],
      ['[[Page1|Mine]]', 6, '[[Page2]]'],
      ['[y](Page1)', 3, '[[Page2]]'],
      ['[[Page1]]', 6, 'https://x.com'],
    ] as const) {
      const view = await mountEditor({ initialBody: `a ${container} b`, connections: pages })
      await act(async () => {
        view.focus()
        view.dispatch({ selection: { anchor: at } })
      })
      paste(view, text, 'auto')
      expect(view.state.field(linkWriting)).toEqual({ start: 2, was: container })
      await cleanupEditor()
    }
  })

  it('typing into a markdown label and leaving remembers the label', async () => {
    const view = await mountEditor({ initialBody: 'a [x](Alpha) b', connections: conn })
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () => view.focus())
    await caretTo(view, 4)
    await act(async () => {
      view.dispatch({
        changes: { from: 4, insert: 'yz' },
        selection: { anchor: 6 },
        userEvent: 'input.type',
      })
    })
    await caretTo(view, 0)
    expect(edit).toHaveBeenCalledTimes(1)
    expect(edit).toHaveBeenCalledWith('p1', { op: 'add', alias: 'xyz' })
  })

  it('a markdown link typed out in full remembers its label once the caret leaves it', async () => {
    const view = await mountEditor({ initialBody: '', connections: conn })
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () => view.focus())
    await typeInto(view, '[x](Alpha')
    expect(view.state.doc.toString()).toBe('[x](Alpha)')
    expect(edit).not.toHaveBeenCalled()
    await caretTo(view, view.state.doc.length)
    expect(edit.mock.calls).toEqual([['p1', { op: 'add', alias: 'x' }]])
  })

  const retype = (view: EditorView, at: number, insert: string, userEvent: string) =>
    act(async () => {
      view.dispatch({
        changes: { from: at - 1, to: at, insert },
        selection: { anchor: at },
        userEvent,
      })
    })

  it('a heading retyped behind an alias it already showed remembers nothing', async () => {
    const view = await mountEditor({ initialBody: 'a [n](Alpha#A) b', connections: conn })
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () => view.focus())
    await caretTo(view, 13)
    await retype(view, 13, 'B', 'input.type')
    await caretTo(view, 0)
    expect(edit).not.toHaveBeenCalled()
  })

  it('a typed alias undone remembers nothing', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha|one]] b', connections: conn })
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () => view.focus())
    await caretTo(view, 13)
    await retype(view, 13, 'x', 'input.type')
    await retype(view, 13, 'e', 'undo')
    await caretTo(view, 0)
    expect(edit).not.toHaveBeenCalled()
  })

  it('focus moving into the caret pane neither collapses nor remembers', async () => {
    for (const [initialBody, typed] of [
      ['a [[Alpha|]] b', ''],
      ['a [[Alpha|]] b', 'on'],
    ] as const) {
      const view = await mountEditor({
        initialBody,
        connections: conn,
        host: { aliases: { p1: ['one'] } },
      })
      vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
      const edit = vi.spyOn(harnessState().host.aliases, 'edit')
      await act(async () => view.focus())
      await caretTo(view, 10)
      if (typed)
        await act(async () => {
          view.dispatch({
            changes: { from: 10, insert: typed },
            selection: { anchor: 10 + typed.length },
            userEvent: 'input.type',
          })
        })
      const pane = document.querySelector('.mdpm-ac') as HTMLElement
      await act(async () => {
        view.contentDOM.dispatchEvent(new FocusEvent('blur', { relatedTarget: pane }))
      })
      expect(view.state.doc.toString()).toBe(`a [[Alpha|${typed}]] b`)
      expect(edit).not.toHaveBeenCalled()
      await cleanupEditor()
    }
  })
})

describe('an emptied markdown label shows its target, as an emptied alias drops its pipe', () => {
  it.each([
    ['a [x](Alpha) b', 'a [Alpha](Alpha) b'],
    ['a [x](Alpha#Intro) b', 'a [Intro](Alpha#Intro) b'],
    ['a [x](https://example.com) b', 'a [](https://example.com) b'],
    ['a ![x](Alpha) b', 'a ![Alpha](Alpha) b'],
  ])('emptying and leaving %s gives %s', async (initialBody, written) => {
    const view = await mountEditor({ initialBody, connections: conn })
    const at = initialBody.indexOf('x') + 1
    await act(async () => view.focus())
    await caretTo(view, at)
    await emptyBefore(view, at)
    await caretTo(view, 0)
    expect(view.state.doc.toString()).toBe(written)
  })

  it('keeps a rest at the link’s end, mapped past the label it fills', async () => {
    const view = await mountEditor({ initialBody: 'a [x](Alpha) b', connections: conn })
    await act(async () => view.focus())
    await caretTo(view, 4)
    await emptyBefore(view, 4)
    const end = 'a [](Alpha)'.length
    await act(async () => {
      view.dispatch({ selection: { anchor: end }, effects: restedOnLink.of(end) })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('a [Alpha](Alpha) b')
    expect(view.state.field(linkRest)).toBe('a [Alpha](Alpha)'.length)
  })

  it('fills on blur without waiting for a timer', async () => {
    const view = await mountEditor({ initialBody: 'a [x](Alpha) b', connections: conn })
    await act(async () => view.focus())
    await caretTo(view, 4)
    await emptyBefore(view, 4)
    view.contentDOM.dispatchEvent(new FocusEvent('blur'))
    expect(view.state.doc.toString()).toBe('a [Alpha](Alpha) b')
  })

  it('waits for the caret to leave the whole link, the gap between label and target included', async () => {
    const view = await mountEditor({ initialBody: 'a [x](Alpha) b', connections: conn })
    await act(async () => view.focus())
    await caretTo(view, 4)
    await emptyBefore(view, 4)
    for (const at of [4, 5]) await caretTo(view, at)
    expect(view.state.doc.toString()).toBe('a [](Alpha) b')
    await caretTo(view, 0)
    expect(view.state.doc.toString()).toBe('a [Alpha](Alpha) b')
  })

  it('an empty label the caret only passes through, or arrows across, stays as written', async () => {
    const view = await mountEditor({ initialBody: 'a [](Alpha) b', connections: conn })
    await act(async () => view.focus())
    for (const at of [3, 4, 5, 0]) await caretTo(view, at)
    view.contentDOM.dispatchEvent(new FocusEvent('blur'))
    expect(view.state.doc.toString()).toBe('a [](Alpha) b')
  })

  it('a label typed empty with its page typed out in full is filled once the caret leaves', async () => {
    const view = await mountEditor({ initialBody: '', connections: conn })
    await act(async () => view.focus())
    await typeInto(view, '[](Alpha')
    await caretTo(view, view.state.doc.length)
    await caretTo(view, 0)
    expect(view.state.doc.toString()).toBe('[Alpha](Alpha)')
  })
})

describe('an emptied heading drops its opener in both syntaxes, wherever a title remains', () => {
  it.each([
    ['a [a](Page#H) b', 'a [a](Page) b'],
    ['a [](Page#H) b', 'a [Page](Page) b'],
    ['a [x](#H) b', 'a [x](#) b'],
    ['a [[#H]] b', 'a [[#]] b'],
  ])('emptying and leaving %s gives %s', async (initialBody, written) => {
    const view = await mountEditor({ initialBody, connections: conn })
    const at = initialBody.indexOf('H') + 1
    await act(async () => view.focus())
    await caretTo(view, at)
    await emptyBefore(view, at)
    await caretTo(view, 0)
    expect(view.state.doc.toString()).toBe(written)
  })
})

describe('an alias left in raw HTML stays as written', () => {
  it('keeps an emptied slot’s pipe when the caret leaves it', async () => {
    const view = await mountEditor({
      initialBody: '<div>\na [[Alpha|x]] b\n</div>',
      connections: conn,
      host: { settings: { htmlFormatting: true } },
    })
    await act(async () => view.focus())
    await caretTo(view, 17)
    await emptyBefore(view, 17)
    await caretTo(view, 0)
    expect(view.state.doc.toString()).toBe('<div>\na [[Alpha|]] b\n</div>')
  })
})

describe('an alias left in code stays as written', () => {
  it('keeps an emptied slot’s pipe or hash', async () => {
    for (const [initialBody, anchor, emptiedBody] of [
      ['```\na [[Alpha|x]] b\n```', 15, '```\na [[Alpha|]] b\n```'],
      ['a `[[Alpha#x]]` b', 12, 'a `[[Alpha#]]` b'],
    ] as const) {
      const view = await mountEditor({ initialBody, connections: conn })
      await act(async () => view.focus())
      await caretTo(view, anchor)
      await emptyBefore(view, anchor)
      await caretTo(view, 0)
      expect(view.state.doc.toString()).toBe(emptiedBody)
      await cleanupEditor()
    }
  })

  it('remembers no alias typed there', async () => {
    const view = await mountEditor({ initialBody: '```\na [[Alpha|]] b\n```', connections: conn })
    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
    await act(async () => view.focus())
    await caretTo(view, 14)
    await act(async () => {
      view.dispatch({
        changes: { from: 14, insert: 'new' },
        selection: { anchor: 17 },
        userEvent: 'input.type',
      })
    })
    await caretTo(view, 0)
    expect(edit).not.toHaveBeenCalled()
  })
})
