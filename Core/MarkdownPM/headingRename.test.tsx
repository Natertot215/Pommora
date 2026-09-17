// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { undo } from '@codemirror/commands'
import { cleanupEditor, mountEditor, stubEditorBridge } from './editorHarness'

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

describe('the editor reports a settled heading rename', () => {
  it('typing three characters into a heading then moving the caret to another line calls onHeadingRename once', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\nnext line',
      onHeadingRename,
    })
    await act(async () => {
      view.dispatch({ changes: { from: 8, to: 8, insert: 'x' } })
    })
    await act(async () => {
      view.dispatch({ changes: { from: 9, to: 9, insert: 'y' } })
    })
    await act(async () => {
      view.dispatch({ changes: { from: 10, to: 10, insert: 'z' } })
    })
    expect(onHeadingRename).not.toHaveBeenCalled()
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onHeadingRename).toHaveBeenCalledTimes(1)
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Setupxyz')
  })

  it('undoing a settled rename is itself a rename, so the consult fires back', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\n[[#Setup]] next',
      onHeadingRename,
    })
    await act(async () => {
      view.dispatch({ changes: { from: 8, to: 8, insert: 'x' }, userEvent: 'input.type' })
    })
    expect(view.state.doc.toString()).toBe('## Setupx\n[[#Setupx]] next')
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Setupx')
    await act(async () => {
      undo(view)
    })
    expect(view.state.doc.toString()).toBe('## Setup\n[[#Setup]] next')
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onHeadingRename).toHaveBeenLastCalledWith('Setupx', 'Setup')
    expect(onHeadingRename).toHaveBeenCalledTimes(2)
  })

  it('blurring settles a pending rename too', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\nnext line',
      onHeadingRename,
    })
    await act(async () => {
      view.focus()
      view.dispatch({ changes: { from: 8, to: 8, insert: 'x' } })
    })
    await act(async () => {
      view.contentDOM.blur()
      // CodeMirror's own focus/blur observer confirms the change on a 10ms timer before it dispatches the focus-change transaction.
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(onHeadingRename).toHaveBeenCalledTimes(1)
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Setupx')
  })

  it('deleting the heading line fires nothing', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\nnext line',
      onHeadingRename,
    })
    await act(async () => {
      view.dispatch({ changes: { from: 8, to: 8, insert: 'x' } })
    })
    await act(async () => {
      // Delete the whole heading line, including its trailing newline.
      view.dispatch({ changes: { from: 0, to: 9, insert: '' } })
    })
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onHeadingRename).not.toHaveBeenCalled()
  })

  it('clearing Setup to nothing and retyping Intro leaves [[#Intro]] in the body and fires (Setup, Intro)', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\n[[#Setup]]',
      onHeadingRename,
    })
    await act(async () => {
      view.dispatch({ changes: { from: 3, to: 8, insert: '' } })
    })
    for (const ch of 'Intro') {
      const at = view.state.doc.line(1).to
      await act(async () => {
        view.dispatch({ changes: { from: at, to: at, insert: ch } })
      })
    }
    expect(view.state.doc.line(1).text).toBe('## Intro')
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onHeadingRename).toHaveBeenCalledTimes(1)
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Intro')
    expect(view.state.doc.toString()).toBe('## Intro\n[[#Intro]]')
  })

  it('a settled retype rewrites a bare §run too under Automatic', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\nsee §Setup and [[#Setup]]',
      onHeadingRename,
      host: { settings: { inPageHeadingResolution: 'automatic' } },
    })
    await act(async () => {
      view.dispatch({ changes: { from: 3, to: 8, insert: '' } })
    })
    await act(async () => {
      view.dispatch({ changes: { from: 3, to: 3, insert: 'Intro' } })
    })
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe('## Intro\nsee §Intro and [[#Intro]]')
    expect(onHeadingRename).toHaveBeenCalledWith('Setup', 'Intro')
  })

  it('renaming one of two identical headings fires nothing (the survivor keeps the links)', async () => {
    const onHeadingRename = vi.fn()
    const view = await mountEditor({
      initialBody: '## Setup\ntext\n## Setup\nmore',
      onHeadingRename,
    })
    await act(async () => {
      view.dispatch({ changes: { from: 8, to: 8, insert: 'x' } })
    })
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onHeadingRename).not.toHaveBeenCalled()
  })
})
