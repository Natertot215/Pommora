// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import type { Personalization } from '@shared/types'
import { useSession } from '@renderer/store'
import {
  stubEditorBridge,
  mountEditor,
  cleanupEditor,
} from '@renderer/testing/editorHarness'

const URL = 'https://www.example.com/a/b'

// jsdom ships neither ClipboardEvent nor DataTransfer, so the event is fabricated: a plain Event
// with the one method the handler reads hung off it.
function paste(view: EditorView, text: string | null): void {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: text === null ? null : { getData: () => text },
  })
  view.contentDOM.dispatchEvent(event)
}

const settings = (p: Partial<Personalization>): void => {
  useSession.setState({ personalization: p })
}

beforeEach(() => {
  stubEditorBridge()
  settings({})
})
afterEach(async () => {
  await cleanupEditor()
})

describe('pasting an address into the editor', () => {
  // Declining hands the event back to CodeMirror, which inserts the text as typed — so the address
  // landing bare is the positive evidence that the settings gate held.
  it('leaves it literal while the setting is off', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(URL)
  })

  it('writes a link when the setting is on', async () => {
    settings({ autoFormatPastedLinks: true })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(`[${URL}](${URL})`)
  })

  it('writes the chosen form', async () => {
    settings({ autoFormatPastedLinks: true, defaultLinkFormat: 'link-short' })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(`[example.com](${URL})`)
  })

  it('wraps a selection when that setting is on', async () => {
    settings({ pasteLinkIntoText: true })
    const view = await mountEditor({ initialBody: 'read the docs now' })
    view.dispatch({ selection: { anchor: 9, head: 13 } })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(`read the [docs](${URL}) now`)
  })

  it('leaves a non-address alone even with the setting on', async () => {
    settings({ autoFormatPastedLinks: true })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, 'App.tsx'))
    expect(view.state.doc.toString()).toBe('App.tsx')
  })

  it('declines when the clipboard cannot be read', async () => {
    settings({ autoFormatPastedLinks: true })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, null))
    expect(view.state.doc.toString()).toBe('')
  })

  it('leaves a read-only surface untouched', async () => {
    settings({ autoFormatPastedLinks: true })
    const view = await mountEditor({ initialBody: 'body', readOnly: true })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe('body')
  })

  it('puts the caret after the link it wrote', async () => {
    settings({ autoFormatPastedLinks: true })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    expect(view.state.selection.main.head).toBe(view.state.doc.length)
  })
})
