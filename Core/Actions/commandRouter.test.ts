// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import { runCommand } from './commandRouter'
import { pushUndo, resetUndo } from '../Session/undo'
import { pasteFromClipboard } from '../MarkdownPM/Links/pasteLink'

vi.mock('../MarkdownPM/Links/pasteLink', () => ({ pasteFromClipboard: vi.fn() }))

const tell = vi.fn()

beforeEach(() => {
  resetUndo()
  tell.mockClear()
  vi.mocked(pasteFromClipboard).mockClear()
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
    runCommand('paste:literal', cell.contentDOM)
    expect(pasteFromClipboard).toHaveBeenCalledWith(cell, 'literal')
    expect(tell).not.toHaveBeenCalled()
    page.destroy()
    cell.destroy()
  })

  it('Paste Without Formatting outside an editor pastes natively', () => {
    runCommand('paste:literal', document.body)
    expect(tell).toHaveBeenCalledWith('edit:native', 'pasteAndMatchStyle')
  })
})
