// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { applyEditorAction, claimEditorMenu, releaseEditorMenu } from './menu'

const views: EditorView[] = []

function mount(doc: string): EditorView {
  const view = new EditorView({ state: EditorState.create({ doc }), parent: document.body })
  views.push(view)
  return view
}

afterEach(() => {
  for (const v of views.splice(0)) {
    releaseEditorMenu(v)
    v.destroy()
  }
})

/** Every mounted editor subscribes to the same bridge listener, so a chosen action reaches all of
 *  them. Parked tabs and resting embeds stay mounted — only the editor the menu was raised over may
 *  answer it. */
describe('the native menu has one subject', () => {
  it('an unclaimed editor refuses the action outright', () => {
    const a = mount('one')
    expect(applyEditorAction(a, 'mdpm:heading:1')).toBe(false)
    expect(a.state.doc.toString()).toBe('one')
  })

  it('only the claiming editor moves; every other mounted one stays exactly as it was', () => {
    const a = mount('one')
    const b = mount('two')
    claimEditorMenu(a)

    expect(applyEditorAction(a, 'mdpm:heading:1')).toBe(true)
    expect(applyEditorAction(b, 'mdpm:heading:1')).toBe(false)

    expect(a.state.doc.toString()).toBe('# one')
    expect(b.state.doc.toString()).toBe('two')
  })

  it('the claim survives losing focus — a native menu holds it while it is open', () => {
    const a = mount('one')
    claimEditorMenu(a)
    a.contentDOM.blur()
    expect(a.hasFocus).toBe(false)
    expect(applyEditorAction(a, 'mdpm:heading:1')).toBe(true)
    expect(a.state.doc.toString()).toBe('# one')
  })

  it('an unmounted subject leaves no successor: the next action reaches nobody', () => {
    const a = mount('one')
    const b = mount('two')
    claimEditorMenu(a)
    releaseEditorMenu(a)

    expect(applyEditorAction(a, 'mdpm:heading:1')).toBe(false)
    expect(applyEditorAction(b, 'mdpm:heading:1')).toBe(false)
    expect(a.state.doc.toString()).toBe('one')
    expect(b.state.doc.toString()).toBe('two')
  })

  it('a claim by a second editor displaces the first', () => {
    const a = mount('one')
    const b = mount('two')
    claimEditorMenu(a)
    claimEditorMenu(b)

    expect(applyEditorAction(a, 'mdpm:heading:1')).toBe(false)
    expect(applyEditorAction(b, 'mdpm:heading:1')).toBe(true)
    expect(a.state.doc.toString()).toBe('one')
    expect(b.state.doc.toString()).toBe('# two')
  })

  it('an action from another sender is still none of the editor’s business', () => {
    const a = mount('one')
    claimEditorMenu(a)
    expect(applyEditorAction(a, 'nav:back')).toBe(false)
    expect(a.state.doc.toString()).toBe('one')
  })
})
