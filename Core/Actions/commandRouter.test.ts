// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import { runCommand } from './commandRouter'
import { pushUndo, resetUndo } from '../Session/undo'
import { applyEditorAction } from '../MarkdownPM/Menus/menu'

vi.mock('../MarkdownPM/Menus/menu', () => ({ applyEditorAction: vi.fn() }))

const tell = vi.fn()

beforeEach(() => {
  resetUndo()
  tell.mockClear()
  vi.mocked(applyEditorAction).mockClear()
  ;(window as unknown as { nexus: unknown }).nexus = { tell }
})

describe('the Edit menu rows the window answers', () => {
  it('Undo reverts the last value outside a text field and leaves the native undo alone', () => {
    const revert = vi.fn(() => true)
    pushUndo(revert)
    expect(runCommand('undo', document.body)).toBe(true)
    expect(revert).toHaveBeenCalledOnce()
    expect(tell).not.toHaveBeenCalled()
  })

  it('Undo inside a text field hands the edit back to the field', () => {
    const revert = vi.fn(() => true)
    pushUndo(revert)
    const input = document.body.appendChild(document.createElement('input'))
    runCommand('undo', input)
    expect(revert).not.toHaveBeenCalled()
    expect(tell).toHaveBeenCalledWith('edit:native', 'undo')
    input.remove()
  })

  it('Paste Without Formatting pastes literally into the innermost focused editor', () => {
    const page = new EditorView({ doc: 'page', parent: document.body })
    const cell = new EditorView({ doc: 'cell', parent: page.contentDOM })
    runCommand('paste:plain', cell.contentDOM)
    expect(applyEditorAction).toHaveBeenCalledWith(cell, 'paste:plain')
    expect(tell).not.toHaveBeenCalled()
    page.destroy()
    cell.destroy()
  })

  it('Paste Without Formatting outside an editor pastes natively', () => {
    runCommand('paste:plain', document.body)
    expect(tell).toHaveBeenCalledWith('edit:native', 'pasteAndMatchStyle')
  })
})
