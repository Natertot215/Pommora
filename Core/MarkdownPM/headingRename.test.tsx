// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { deleteLine, moveLineUp, redo, undo } from '@codemirror/commands'
import { cleanupEditor, mountEditor, rerenderEditor, stubEditorBridge } from './editorHarness'
import { mirrorBody } from './api'

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

const typeAt = (view: EditorView, at: number, text: string): Promise<void> =>
  act(async () => {
    view.dispatch({
      changes: { from: at, insert: text },
      selection: { anchor: at + text.length },
      userEvent: 'input.type',
    })
  })

const leave = (view: EditorView, at = view.state.doc.length): Promise<void> =>
  act(async () => {
    view.dispatch({ selection: { anchor: at } })
    await new Promise((r) => setTimeout(r, 0))
  })

describe('the editor reports a settled heading rename', () => {
  it('typing three characters into a heading then moving the caret to another line calls onHeadingRename once', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\nnext line',
      onHeadingRename,
      autoFocus: true,
    })
    for (const ch of 'xyz') await typeAt(view, view.state.doc.line(1).to, ch)
    expect(onHeadingRename).not.toHaveBeenCalled()
    await leave(view)
    expect(onHeadingRename).toHaveBeenCalledTimes(1)
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Setupxyz')
  })

  it('same-page links wait while the heading is edited; an undo reverts the heading and its own settle moves the links back; a redo replays both', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\n[[#Setup]] next',
      onHeadingRename,
      autoFocus: true,
    })
    await typeAt(view, 8, 'x')
    expect(view.state.doc.toString()).toBe('## Setupx\n[[#Setup]] next')
    await leave(view)
    expect(view.state.doc.toString()).toBe('## Setupx\n[[#Setupx]] next')
    await act(async () => {
      undo(view)
    })
    expect(view.state.doc.toString()).toBe('## Setup\n[[#Setupx]] next')
    await leave(view)
    expect(view.state.doc.toString()).toBe('## Setup\n[[#Setup]] next')
    expect(onHeadingRename).toHaveBeenLastCalledWith('Setupx', 'Setup')
    await act(async () => {
      redo(view)
    })
    await leave(view)
    expect(view.state.doc.toString()).toBe('## Setupx\n[[#Setupx]] next')
    expect(onHeadingRename).toHaveBeenCalledTimes(3)
  })

  it('a rename on a second line settles the first before it opens', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## A\n[[#A]]\n## B\n[[#B]]',
      onHeadingRename,
      autoFocus: true,
    })
    await typeAt(view, 4, 'x')
    await act(async () => {
      const at = view.state.doc.line(3).to
      view.dispatch({ changes: { from: at, insert: 'y' }, userEvent: 'input.type' })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onHeadingRename).toHaveBeenCalledWith('A', 'Ax')
    await leave(view, 0)
    expect(onHeadingRename).toHaveBeenLastCalledWith('B', 'By')
    expect(view.state.doc.toString()).toBe('## Ax\n[[#Ax]]\n## By\n[[#By]]')
  })

  it('Enter at the start of a pending heading line still settles it', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\ntext',
      onHeadingRename,
      autoFocus: true,
    })
    await typeAt(view, 8, 'x')
    await act(async () => {
      view.dispatch({
        changes: { from: 0, insert: '\n' },
        selection: { anchor: 0 },
        userEvent: 'input.type',
      })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Setupx')
  })

  it('blurring settles a pending rename too', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\nnext line',
      onHeadingRename,
      autoFocus: true,
    })
    await typeAt(view, 8, 'x')
    await act(async () => {
      view.contentDOM.blur()
      // CodeMirror's own focus/blur observer confirms the change on a 10ms timer before it dispatches the focus-change transaction.
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(onHeadingRename).toHaveBeenCalledTimes(1)
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Setupx')
  })

  it('a heading edited while the editor is unfocused settles at once, even with the caret on its line', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({ initialBody: '## Setup\n[[#Setup]]', onHeadingRename })
    await act(async () => {
      view.dispatch({ selection: { anchor: 5 } })
      view.dispatch({ changes: { from: 3, to: 8, insert: 'Intro' } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Intro')
    expect(view.state.doc.toString()).toBe('## Intro\n[[#Intro]]')
  })

  for (const [shape, remove] of [
    ['Delete Line', (v: EditorView) => deleteLine(v)],
    [
      'a selection from its start to the next line',
      (v: EditorView) => {
        const l = v.state.doc.line(2)
        v.dispatch({ changes: { from: l.from, to: l.to + 1 }, userEvent: 'delete' })
      },
    ],
  ] as const)
    it(`deleting a pending heading line between two headings by ${shape} renames neither neighbor`, async () => {
      const onHeadingRename = vi.fn()
      const view = await mountEditor({
        initialBody: '## A\n## Setup\n## B\n[[#Setup]] [[#A]] [[#B]]',
        onHeadingRename,
        autoFocus: true,
      })
      await typeAt(view, view.state.doc.line(2).to, 'x')
      await act(async () => {
        remove(view)
      })
      await leave(view)
      expect(onHeadingRename).not.toHaveBeenCalled()
      expect(view.state.doc.toString()).toBe('## A\n## B\n[[#Setup]] [[#A]] [[#B]]')
    })

  it('a held rename moved up a line and then deleted renames neither neighbor', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## A\n## Setup\n[[#Setup]] [[#A]]',
      onHeadingRename,
      autoFocus: true,
    })
    await typeAt(view, view.state.doc.line(2).to, 'x')
    await act(async () => {
      moveLineUp(view)
    })
    await act(async () => {
      const l = view.state.doc.line(1)
      view.dispatch({ changes: { from: l.from, to: l.to + 1 }, userEvent: 'delete' })
    })
    await leave(view)
    expect(onHeadingRename).not.toHaveBeenCalled()
    expect(view.state.doc.toString()).toBe('## A\n[[#Setup]] [[#A]]')
  })

  it('a rename pending when the editor turns read-only still moves its own links on blur', async () => {
    const onHeadingRename = vi.fn()
    const onChange = vi.fn()
    const props = {
      initialBody: '## Setup\n[[#Setup]] next',
      onHeadingRename,
      onChange,
      autoFocus: true,
    }
    const view = await mountEditor(props)
    await typeAt(view, 8, 'x')
    await rerenderEditor({ ...props, readOnly: true })
    await act(async () => {
      view.contentDOM.blur()
      await new Promise((r) => setTimeout(r, 20))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Setupx')
    expect(view.state.doc.toString()).toBe('## Setupx\n[[#Setupx]] next')
    expect(onChange).toHaveBeenLastCalledWith('## Setupx\n[[#Setupx]] next')
  })

  it('clearing a heading to nothing and leaving fires nothing and moves no link', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\n[[#Setup]]',
      onHeadingRename,
      autoFocus: true,
    })
    await act(async () => {
      view.dispatch({ changes: { from: 3, to: 8, insert: '' }, selection: { anchor: 3 } })
    })
    await leave(view)
    expect(onHeadingRename).not.toHaveBeenCalled()
    expect(view.state.doc.toString()).toBe('## \n[[#Setup]]')
  })

  it('clearing Setup to nothing and retyping Intro moves [[#Setup]] and, under Automatic, a bare §Setup, and fires (Setup, Intro) once', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\nsee §Setup and [[#Setup]]',
      onHeadingRename,
      autoFocus: true,
      host: { settings: { inPageHeadingResolution: 'automatic' } },
    })
    await act(async () => {
      view.dispatch({ changes: { from: 3, to: 8, insert: '' }, selection: { anchor: 3 } })
    })
    for (const ch of 'Intro') await typeAt(view, view.state.doc.line(1).to, ch)
    expect(view.state.doc.line(1).text).toBe('## Intro')
    await leave(view)
    expect(onHeadingRename).toHaveBeenCalledTimes(1)
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Intro')
    expect(view.state.doc.toString()).toBe('## Intro\nsee §Intro and [[#Intro]]')
  })

  it('a rename passing through another heading’s text leaves that heading’s links alone', async () => {
    const onHeadingRename = vi.fn()
    const body = '## Setup\n[[#Setup]] a\n## Setups\n[[#Setups]] b'
    const view = await mountEditor({ initialBody: body, onHeadingRename, autoFocus: true })
    const end = body.indexOf('## Setups') + '## Setups'.length
    await act(async () => {
      view.dispatch({ changes: { from: end - 1, to: end }, selection: { anchor: end - 1 } })
    })
    await typeAt(view, end - 1, '2')
    await leave(view)
    expect(view.state.doc.toString()).toBe('## Setup\n[[#Setup]] a\n## Setup2\n[[#Setup2]] b')
    expect(onHeadingRename).toHaveBeenCalledWith('Setups', 'Setup2')
  })

  it('renaming one of two identical headings moves no link and fires nothing', async () => {
    const onHeadingRename = vi.fn()
    const body = '## Notes\n[[#Notes]] first\n## Notes\n[[#Notes]] second'
    const view = await mountEditor({ initialBody: body, onHeadingRename, autoFocus: true })
    await typeAt(view, 8, 'x')
    await leave(view)
    expect(view.state.doc.toString()).toBe(
      '## Notesx\n[[#Notes]] first\n## Notes\n[[#Notes]] second',
    )
    expect(onHeadingRename).not.toHaveBeenCalled()
  })

  it('renaming a heading into another heading’s text moves no link and fires nothing', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\n## Intro\n[[#Intro]]',
      onHeadingRename,
      autoFocus: true,
    })
    await act(async () => {
      const line = view.state.doc.line(2)
      view.dispatch({
        changes: { from: line.from + 3, to: line.to, insert: 'Setup' },
        selection: { anchor: line.from + 8 },
        userEvent: 'input.type',
      })
    })
    await leave(view)
    expect(view.state.doc.toString()).toBe('## Setup\n## Setup\n[[#Intro]]')
    expect(onHeadingRename).not.toHaveBeenCalled()
  })

  it('a `## ` line inside a fence is a sample, not a rename', async () => {
    const onHeadingRename = vi.fn()
    const body = '## Intro\n[[#Setup]]\n```\n## Setup\n```'
    const view = await mountEditor({ initialBody: body, onHeadingRename, autoFocus: true })
    await typeAt(view, body.lastIndexOf('## Setup') + 8, 'x')
    await leave(view, 0)
    expect(view.state.doc.toString()).toBe('## Intro\n[[#Setup]]\n```\n## Setupx\n```')
    expect(onHeadingRename).not.toHaveBeenCalled()
  })

  it('typing a heading fresh on an empty line fires nothing', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({ initialBody: '\ntext', onHeadingRename, autoFocus: true })
    await typeAt(view, 0, '## New')
    await leave(view)
    expect(onHeadingRename).not.toHaveBeenCalled()
  })

  it('a multi-line paste over a heading fires nothing', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\n[[#Setup]]',
      onHeadingRename,
      autoFocus: true,
    })
    await act(async () => {
      view.dispatch({
        changes: { from: 0, to: 8, insert: '## A\nx\n## B' },
        userEvent: 'input.paste',
      })
    })
    await leave(view)
    expect(onHeadingRename).not.toHaveBeenCalled()
  })

  it('a mirrored body renaming a heading fires nothing in the follower', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\n[[#Setup]]',
      onHeadingRename,
      autoFocus: true,
    })
    await act(async () => {
      mirrorBody(view, '## Setupx\n[[#Setupx]]')
    })
    await leave(view)
    expect(onHeadingRename).not.toHaveBeenCalled()
    expect(view.state.doc.toString()).toBe('## Setupx\n[[#Setupx]]')
  })

  it('unmounting with a rename pending settles it: onChange and the warm capture get the moved links and onHeadingRename fires once', async () => {
    const onHeadingRename = vi.fn()
    const onChange = vi.fn()
    const capture = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\n[[#Setup]] next',
      onHeadingRename,
      onChange,
      autoFocus: true,
      warm: { restore: () => undefined, capture },
    })
    await typeAt(view, 8, 'x')
    expect(onHeadingRename).not.toHaveBeenCalled()
    await cleanupEditor()
    expect(onChange).toHaveBeenLastCalledWith('## Setupx\n[[#Setupx]] next')
    expect(onHeadingRename).toHaveBeenCalledTimes(1)
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Setupx')
    expect(capture).toHaveBeenCalledTimes(1)
    expect(capture.mock.calls[0][0].editorState.doc).toBe('## Setupx\n[[#Setupx]] next')
  })
})
