// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import type { Personalization } from '@shared/types'
import { useSession } from '@renderer/store'
import { stubEditorBridge, mountEditor, cleanupEditor } from '@renderer/testing/editorHarness'
import { pendingTitles } from './PendingTitle'
import { pasteAs } from './PasteLink'

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

// The chord carries no clipboard of its own — a keypress has no `clipboardData` — so it reads the
// system clipboard back over the bridge, which is what this stands in for.
let clipboard = ''

/** ⌘⇧V, as the default binding spells it. */
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
  useSession.setState({ personalization: p })
}

beforeEach(() => {
  clipboard = URL
  // The title never arrives over the bridge: every test that needs one writes it into the shared
  // cache, which is the only thing the swap watches.
  stubEditorBridge({
    readClipboard: async () => clipboard,
    linkTitles: { fetch: async () => ({ ok: false, error: { code: 'offline' } }) },
  })
  // The title cache is store state and outlives a test — one left populated makes the next paste
  // resolve instantly and shifts every offset a hand-written edit depends on.
  useSession.setState({ personalization: {}, linkTitles: {} })
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

  // Declining hands the event back to CodeMirror, which inserts the text as typed — so the address
  // landing bare is the positive evidence that the gate held.
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

    await act(async () => {
      useSession.setState({ linkTitles: { [URL]: 'Example Domain' } })
    })
    expect(view.state.doc.toString()).toBe(`[Example Domain](${URL})`)
  })

  it('leaves the label alone if it was retitled before the fetch landed', async () => {
    settings({ defaultLinkFormat: 'link-title' })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    // Retitle it by hand, the way Format or a plain edit would.
    await act(async () => {
      view.dispatch({ changes: { from: 1, to: 12, insert: 'My Words' } })
    })
    await act(async () => {
      useSession.setState({ linkTitles: { [URL]: 'Example Domain' } })
    })
    expect(view.state.doc.toString()).toBe(`[My Words](${URL})`)
  })

  // A site whose <title> IS its domain resolves to the text already on the page, so the swap writes
  // nothing and the document never changes — meaning the validity prune, which only runs on a doc
  // change, never fires. Without an explicit withdrawal the anchor would sit pending forever and
  // re-dispatch on every store write thereafter.
  it('stops waiting even when the fetched title reads exactly as the domain did', async () => {
    settings({ defaultLinkFormat: 'link-title' })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    expect(view.state.field(pendingTitles)).toHaveLength(1)

    await act(async () => {
      useSession.setState({ linkTitles: { [URL]: 'example.com' } })
    })
    expect(view.state.doc.toString()).toBe(`[example.com](${URL})`)
    expect(view.state.field(pendingTitles)).toHaveLength(0)
  })

  it('asks for no title when the cache already holds one', async () => {
    settings({ defaultLinkFormat: 'link-title' })
    useSession.setState({ linkTitles: { [URL]: 'Example Domain' } })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, URL))
    expect(view.state.doc.toString()).toBe(`[Example Domain](${URL})`)
  })

  // The pair reads together: the same clipboard on the same line lands literal inside a destination
  // (no nested `[` written) and formats outside one — proof the guard reads the column, not the line.
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

  // A code span or fence renders nothing — a markdown link written there is corrupted code.
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

// ⌘⇧V does the opposite of ⌘V, on whichever axis a selection selects: with text selected the
// question is whether a paste wraps it, and without one it is the literal escape from the
// always-formatted paste.
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

  // The chord was spent choosing not to wrap; the replacing paste is an ordinary caret paste,
  // and those format.
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

// Paste As names the form outright. The two embeds are the only forms whose placement is a question:
// each takes a line to itself, so each is written onto the blank line the caret already sits on and
// nowhere else — the menu that offered it can hang open while the document moves.
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

  // An indented token is list continuation to both grammars, so the whole line goes — a caret parked
  // after stray spaces must not leave the tile un-formed.
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

  // A blank line inside a fence is code, and a tile line written there is corrupted code.
  it('writes nothing on a blank line inside a fence', async () => {
    const body = '```\n\n```'
    const view = await seated(body, 4)
    await act(async () => await pasteAs(view, 'embedLink'))
    expect(view.state.doc.toString()).toBe(body)
  })
})
