// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import type { Personalization } from '@pommora/core/Settings/personalization'
import {
  stubEditorBridge,
  mountEditor,
  cleanupEditor,
  seedHost,
  settleTitle,
} from '../editorHarness'
import { pendingTitles } from './pendingTitle'
import { pasteAs } from './pasteLink'

const URL = 'https://www.example.com/a/b'

// jsdom ships neither ClipboardEvent nor DataTransfer, so the event is fabricated with the one method the handler reads.
function paste(view: EditorView, text: string | null): void {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: text === null ? null : { getData: () => text },
  })
  view.contentDOM.dispatchEvent(event)
}

let clipboard = ''

function chord(view: EditorView): void {
  view.contentDOM.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'v',
      metaKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }),
  )
}

const settings = (p: Partial<Personalization>): void => {
  seedHost({ settings: p, clipboard: { read: async () => clipboard } })
}

beforeEach(() => {
  clipboard = URL
  stubEditorBridge()
  settings({})
})
afterEach(async () => {
  await cleanupEditor()
})

describe('pasting an address into the editor', () => {
  it('writes a link', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(`[${URL}](${URL})`)
  })

  it('writes the chosen form', async () => {
    settings({ defaultLinkFormat: 'link-short' })
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

  it('leaves a non-address alone', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, 'App.tsx'))
    expect(view.state.doc.toString()).toBe('App.tsx')
  })

  it('declines when the clipboard cannot be read', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, null))
    expect(view.state.doc.toString()).toBe('')
  })

  it('leaves a read-only surface untouched', async () => {
    const view = await mountEditor({ initialBody: 'body', readOnly: true })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe('body')
  })

  it('writes the domain in Page Title form, then swaps the title in when it lands', async () => {
    settings({ defaultLinkFormat: 'link-title' })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(`[example.com](${URL})`)

    await settleTitle(URL, 'Example Domain')
    expect(view.state.doc.toString()).toBe(`[Example Domain](${URL})`)
  })

  it('leaves the label alone if it was retitled before the fetch landed', async () => {
    settings({ defaultLinkFormat: 'link-title' })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    await act(async () => {
      view.dispatch({ changes: { from: 1, to: 12, insert: 'My Words' } })
    })
    await settleTitle(URL, 'Example Domain')
    expect(view.state.doc.toString()).toBe(`[My Words](${URL})`)
  })

  it('stops waiting even when the fetched title reads exactly as the domain did', async () => {
    settings({ defaultLinkFormat: 'link-title' })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    expect(view.state.field(pendingTitles)).toHaveLength(1)

    await settleTitle(URL, 'example.com')
    expect(view.state.doc.toString()).toBe(`[example.com](${URL})`)
    expect(view.state.field(pendingTitles)).toHaveLength(0)
  })

  it('asks for no title when the cache already holds one', async () => {
    settings({ defaultLinkFormat: 'link-title' })
    const view = await mountEditor({
      initialBody: '',
      host: { linkTitles: { [URL]: 'Example Domain' } },
    })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(`[Example Domain](${URL})`)
  })

  const LINKED = '[docs]() tail'

  it('lands literal inside a link destination', async () => {
    const view = await mountEditor({ initialBody: LINKED })
    view.dispatch({ selection: { anchor: 7 } })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(`[docs](${URL}) tail`)
  })

  it('formats outside a link destination on the same line', async () => {
    const view = await mountEditor({ initialBody: LINKED })
    view.dispatch({ selection: { anchor: LINKED.length } })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(`[docs]() tail[${URL}](${URL})`)
  })

  it('puts the caret after the link it wrote', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    expect(view.state.selection.main.head).toBe(view.state.doc.length)
  })

  it('lands literal inside a fenced code block', async () => {
    const body = '```\ncurl \n```'
    const view = await mountEditor({ initialBody: body })
    view.dispatch({ selection: { anchor: 9 } })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(`\`\`\`\ncurl ${URL}\n\`\`\``)
  })

  it('lands literal inside an inline code span', async () => {
    const body = '`fetch ` after'
    const view = await mountEditor({ initialBody: body })
    view.dispatch({ selection: { anchor: 7 } })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(`\`fetch ${URL}\` after`)
  })
})

describe('the inverse chord', () => {
  it('leaves the address where a plain paste would have written a link', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => chord(view))
    expect(view.state.doc.toString()).toBe(URL)
  })

  it('wraps a selection where a plain paste would have replaced it', async () => {
    const view = await mountEditor({ initialBody: 'read the docs now' })
    view.dispatch({ selection: { anchor: 9, head: 13 } })
    await act(async () => chord(view))
    expect(view.state.doc.toString()).toBe(`read the [docs](${URL}) now`)
  })

  it('replaces a selection with the formatted link where a plain paste would have wrapped it', async () => {
    settings({ pasteLinkIntoText: true })
    const view = await mountEditor({ initialBody: 'read the docs now' })
    view.dispatch({ selection: { anchor: 9, head: 13 } })
    await act(async () => chord(view))
    expect(view.state.doc.toString()).toBe(`read the [${URL}](${URL}) now`)
  })

  it('writes a non-address as the text it is', async () => {
    clipboard = 'App.tsx'
    const view = await mountEditor({ initialBody: '' })
    await act(async () => chord(view))
    expect(view.state.doc.toString()).toBe('App.tsx')
  })

  it('leaves a read-only surface untouched', async () => {
    const view = await mountEditor({ initialBody: 'body', readOnly: true })
    await act(async () => chord(view))
    expect(view.state.doc.toString()).toBe('body')
  })
})

describe('pasting as an embed', () => {
  const seated = async (body: string, anchor: number): Promise<EditorView> => {
    const view = await mountEditor({ initialBody: body })
    view.dispatch({ selection: { anchor } })
    return view
  }

  it('writes a page embed onto the blank line the caret is on', async () => {
    clipboard = '[[Alpha]]'
    const view = await seated('intro\n\ntail', 6)
    await act(async () => await pasteAs(view, 'embedPage'))
    expect(view.state.doc.toString()).toBe('intro\n![[Alpha]]\ntail')
  })

  it('writes a webpage embed onto the blank line the caret is on', async () => {
    const view = await seated('intro\n\ntail', 6)
    await act(async () => await pasteAs(view, 'embedLink'))
    expect(view.state.doc.toString()).toBe(`intro\n![](${URL})\ntail`)
  })

  it('takes the whole line, not the caret', async () => {
    const view = await seated('intro\n   \ntail', 9)
    await act(async () => await pasteAs(view, 'embedLink'))
    expect(view.state.doc.toString()).toBe(`intro\n![](${URL})\ntail`)
  })

  it("writes nothing where the line is not the embed's to take", async () => {
    const view = await seated('intro tail', 6)
    await act(async () => await pasteAs(view, 'embedLink'))
    expect(view.state.doc.toString()).toBe('intro tail')
  })

  it('writes nothing on a blank line inside a fence', async () => {
    const body = '```\n\n```'
    const view = await seated(body, 4)
    await act(async () => await pasteAs(view, 'embedLink'))
    expect(view.state.doc.toString()).toBe(body)
  })
})
