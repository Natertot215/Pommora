// @vitest-environment jsdom
// The glyph is one press with two meanings: released in place it's a click, carried past the activation threshold it's a drag. Geometry stays with the model suite; jsdom measures every rect as zero.
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../../Testing/editorHarness'
import { moveRange } from '../Engine/blockMove'
import { beginRelocateDrag } from './editorGesture'
import { firePointer, stubPointerCapture } from '@pommora/uix/Utilities/pointerHarness'

stubPointerCapture()
stubEditorBridge()

afterEach(async () => {
  await cleanupEditor()
})

const glyphOf = (view: EditorView): HTMLElement => {
  const el = view.dom.querySelector('.md-list-glyph')
  if (!el) throw new Error('no list glyph rendered')
  return el as HTMLElement
}

async function pressGlyph(view: EditorView, dx: number): Promise<void> {
  await act(async () => {
    firePointer(glyphOf(view), 'pointerdown', { x: 0, y: 0 })
    firePointer(window, 'pointermove', { x: dx, y: 0 })
    firePointer(window, 'pointerup', { x: dx, y: 0 })
    await Promise.resolve()
  })
}

describe('a list glyph press is a click or a drag, never both', () => {
  it('released in place, a checkbox glyph toggles, and a Mac Ctrl-click is its menu’s alone', async () => {
    const view = await mountEditor({ initialBody: '- [ ] task' })
    const ctrl = { bubbles: true, cancelable: true, button: 0, ctrlKey: true }
    const down = new MouseEvent('mousedown', ctrl)
    const press = new MouseEvent('pointerdown', { ...ctrl, buttons: 1 })
    Object.defineProperties(press, { pointerId: { value: 1 }, isPrimary: { value: true } })
    await act(async () => {
      glyphOf(view).dispatchEvent(press)
      glyphOf(view).dispatchEvent(down)
      firePointer(window, 'pointerup')
      await Promise.resolve()
    })
    expect(down.defaultPrevented).toBe(true)
    expect(view.state.doc.toString()).toBe('- [ ] task')
    await pressGlyph(view, 2)
    expect(view.state.doc.toString()).toBe('- [x] task')
  })

  it('carried past the threshold, the same press leaves the checkbox alone', async () => {
    const view = await mountEditor({ initialBody: '- [ ] task' })
    await pressGlyph(view, 40)
    expect(view.state.doc.toString()).toBe('- [ ] task')
  })
})

describe('a drop is a move, whatever selection stands', () => {
  it('a list moved with lines selected elsewhere keeps its numbers', async () => {
    const doc = 'intro\n\n1. one\n1. two\n1. three\n\nnotes\nmore'
    const view = await mountEditor({ initialBody: doc })
    const list = { from: doc.indexOf('1. one'), to: doc.indexOf('\n\nnotes') }
    const carry = (e: Event): void =>
      beginRelocateDrag(view, e as PointerEvent, list, {
        measure: () => [{ at: 0, y: 0, slot: null }],
        lineFor: () => null,
        commit: ({ at }) => moveRange(doc, list, { at }),
      })
    await act(async () => {
      view.dispatch({ selection: { anchor: doc.indexOf('notes'), head: doc.length } })
      view.dom.addEventListener('pointerdown', carry, { once: true })
      firePointer(view.dom, 'pointerdown', { x: 0, y: 0 })
      firePointer(window, 'pointermove', { x: 40, y: 0 })
      firePointer(window, 'pointerup', { x: 40, y: 0 })
      await Promise.resolve()
    })
    expect(view.state.doc.toString()).toBe('1. one\n1. two\n1. three\n\nintro\n\nnotes\nmore')
  })
})

// A page runs several editors at once, each mounting the cleanup plugin: a sibling unmounting mid-drag must leave the drag in progress alone.
describe('a sibling editor tearing down leaves a live drag alone', () => {
  it('only the view that started the gesture can abort it', async () => {
    const dragged = await mountEditor({ initialBody: '- [ ] task' })
    const bystander = await mountEditor({ initialBody: 'unrelated' })
    await act(async () => {
      firePointer(glyphOf(dragged), 'pointerdown', { x: 0, y: 0 })
      firePointer(window, 'pointermove', { x: 40, y: 0 })
      await Promise.resolve()
    })
    expect(document.querySelector('[data-grabbing]')).not.toBeNull()
    await act(async () => {
      bystander.destroy()
      await Promise.resolve()
    })
    expect(document.querySelector('[data-grabbing]')).not.toBeNull()
    await act(async () => {
      firePointer(window, 'pointerup', { x: 40, y: 0 })
      await Promise.resolve()
    })
    expect(document.querySelector('[data-grabbing]')).toBeNull()
  })
})
