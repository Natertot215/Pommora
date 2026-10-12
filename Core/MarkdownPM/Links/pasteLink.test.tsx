// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import type { EditorSettings } from '../api'
import {
  stubEditorBridge,
  mountEditor,
  cleanupEditor,
  seedHost,
  settleTitle,
  testHost,
} from '../../Testing/editorHarness'
import { pendingTitles } from './pendingTitle'
import { paste, pastedCellText, pasteFromClipboard } from './pasteLink'

const URL = 'https://www.example.com/a/b'

// jsdom ships neither ClipboardEvent nor DataTransfer, so the event is fabricated with the one method the handler reads.
function pasteEvent(view: EditorView, text: string | null): void {
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

const settings = (p: Partial<EditorSettings>): void => {
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
    await act(async () => pasteEvent(view, URL))
    expect(view.state.doc.toString()).toBe(`[${URL}](${URL})`)
  })

  it('writes the chosen form', async () => {
    settings({ defaultLinkFormat: 'link-short' })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => pasteEvent(view, URL))
    expect(view.state.doc.toString()).toBe(`[example.com](${URL})`)
  })

  it('wraps a selection', async () => {
    const view = await mountEditor({ initialBody: 'read the docs now' })
    view.dispatch({ selection: { anchor: 9, head: 13 } })
    await act(async () => pasteEvent(view, URL))
    expect(view.state.doc.toString()).toBe(`read the [docs](${URL}) now`)
  })

  it('leaves a non-address alone', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => pasteEvent(view, 'App.tsx'))
    expect(view.state.doc.toString()).toBe('App.tsx')
  })

  it('declines when the clipboard cannot be read', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => pasteEvent(view, null))
    expect(view.state.doc.toString()).toBe('')
  })

  it('leaves a read-only surface untouched', async () => {
    const view = await mountEditor({ initialBody: 'body', readOnly: true })
    await act(async () => pasteEvent(view, URL))
    expect(view.state.doc.toString()).toBe('body')
  })

  it('writes the domain in Page Title form, then swaps the title in when it lands', async () => {
    settings({ defaultLinkFormat: 'link-title' })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => pasteEvent(view, URL))
    expect(view.state.doc.toString()).toBe(`[example.com](${URL})`)

    await settleTitle(URL, 'Example Domain')
    expect(view.state.doc.toString()).toBe(`[Example Domain](${URL})`)
  })

  it('leaves the label alone if it was retitled before the fetch landed', async () => {
    settings({ defaultLinkFormat: 'link-title' })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => pasteEvent(view, URL))
    await act(async () => {
      view.dispatch({ changes: { from: 1, to: 12, insert: 'My Words' } })
    })
    await settleTitle(URL, 'Example Domain')
    expect(view.state.doc.toString()).toBe(`[My Words](${URL})`)
  })

  it('stops waiting even when the fetched title reads exactly as the domain did', async () => {
    settings({ defaultLinkFormat: 'link-title' })
    const view = await mountEditor({ initialBody: '' })
    await act(async () => pasteEvent(view, URL))
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
    await act(async () => pasteEvent(view, URL))
    expect(view.state.doc.toString()).toBe(`[Example Domain](${URL})`)
  })

  const LINKED = '[docs]() tail'

  it('lands literal inside a link destination', async () => {
    const view = await mountEditor({ initialBody: LINKED })
    view.dispatch({ selection: { anchor: 7 } })
    await act(async () => pasteEvent(view, URL))
    expect(view.state.doc.toString()).toBe(`[docs](${URL}) tail`)
  })

  it('formats outside a link destination on the same line', async () => {
    const view = await mountEditor({ initialBody: LINKED })
    view.dispatch({ selection: { anchor: LINKED.length } })
    await act(async () => pasteEvent(view, URL))
    expect(view.state.doc.toString()).toBe(`[docs]() tail[${URL}](${URL})`)
  })

  it('puts the caret after the link it wrote', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => pasteEvent(view, URL))
    expect(view.state.selection.main.head).toBe(view.state.doc.length)
  })

  it('lands literal inside a fenced code block', async () => {
    const body = '```\ncurl \n```'
    const view = await mountEditor({ initialBody: body })
    view.dispatch({ selection: { anchor: 9 } })
    await act(async () => pasteEvent(view, URL))
    expect(view.state.doc.toString()).toBe(`\`\`\`\ncurl ${URL}\n\`\`\``)
  })

  it('lands literal inside an inline code span', async () => {
    const body = '`fetch ` after'
    const view = await mountEditor({ initialBody: body })
    view.dispatch({ selection: { anchor: 7 } })
    await act(async () => pasteEvent(view, URL))
    expect(view.state.doc.toString()).toBe(`\`fetch ${URL}\` after`)
  })
})

describe('the inverse chord', () => {
  it('leaves the address where a plain paste would have written a link', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => chord(view))
    expect(view.state.doc.toString()).toBe(URL)
  })

  it('replaces a selection with the formatted link where a plain paste would have wrapped it', async () => {
    const view = await mountEditor({ initialBody: 'read the docs now' })
    view.dispatch({ selection: { anchor: 9, head: 13 } })
    await act(async () => chord(view))
    expect(view.state.doc.toString()).toBe(`read the [${URL}](${URL}) now`)
  })

  it('writes the address as text over a selection inside a link', async () => {
    clipboard = 'https://a.co'
    for (const [body, anchor, head, out] of [
      ['[[Foo]]', 2, 5, '[[https://a.co]]'],
      ['[docs](https://b.co)', 1, 5, '[https://a.co](https://b.co)'],
    ] as const) {
      const view = await mountEditor({ initialBody: body })
      view.dispatch({ selection: { anchor, head } })
      await act(async () => chord(view))
      expect(view.state.doc.toString(), body).toBe(out)
      await cleanupEditor()
    }
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

  it('Plain Text writes the address a copied link points at, and Paste Without Formatting the clipboard as it is', async () => {
    clipboard = `[Home](${URL})`
    const plain = await seated('x ', 2)
    await act(async () => await pasteFromClipboard(plain, 'plain'))
    expect(plain.state.doc.toString()).toBe(`x ${URL}`)
    await cleanupEditor()
    const literal = await seated('x ', 2)
    await act(async () => await pasteFromClipboard(literal, 'literal'))
    expect(literal.state.doc.toString()).toBe(`x [Home](${URL})`)
  })

  it('writes a page embed onto the blank line the caret is on', async () => {
    clipboard = '[[Alpha]]'
    const view = await seated('intro\n\ntail', 6)
    await act(async () => await pasteFromClipboard(view, 'embedPage'))
    expect(view.state.doc.toString()).toBe('intro\n![[Alpha]]\ntail')
  })

  it('writes a webpage embed onto the blank line the caret is on', async () => {
    const view = await seated('intro\n\ntail', 6)
    await act(async () => await pasteFromClipboard(view, 'embedLink'))
    expect(view.state.doc.toString()).toBe(`intro\n![](${URL})\ntail`)
  })

  it('takes the whole line, not the caret', async () => {
    const view = await seated('intro\n   \ntail', 9)
    await act(async () => await pasteFromClipboard(view, 'embedLink'))
    expect(view.state.doc.toString()).toBe(`intro\n![](${URL})\ntail`)
  })

  it("writes nothing where the line is not the embed's to take", async () => {
    const view = await seated('intro tail', 6)
    await act(async () => await pasteFromClipboard(view, 'embedLink'))
    expect(view.state.doc.toString()).toBe('intro tail')
  })

  it('lands the address as plain text on a blank line inside a fence', async () => {
    const view = await seated('```\n\n```', 4)
    await act(async () => await pasteFromClipboard(view, 'embedLink'))
    expect(view.state.doc.toString()).toBe(`\`\`\`\n${URL}\n\`\`\``)
  })
})

describe('what a paste reads from the clipboard', () => {
  it('formats a bare address only with its scheme written, unless a form was picked', async () => {
    const view = await mountEditor({ initialBody: '' })
    for (const text of ['3.14', 'App.tsx', 'example.com', 'www.example.com', 'mailto:a@b.co']) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length } })
      await act(async () => paste(view, text, 'auto'))
      expect(view.state.doc.toString(), text).toBe(text)
    }
    view.dispatch({ changes: { from: 0, to: view.state.doc.length } })
    await act(async () => paste(view, 'example.com', 'link-short'))
    expect(view.state.doc.toString()).toBe('[example.com](https://example.com)')
  })

  it('leaves a written link as written at a bare caret', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, '[Docs](https://a.com)', 'auto'))
    expect(view.state.doc.toString()).toBe('[Docs](https://a.com)')
  })

  it('writes the clipboard as typed for a literal paste', async () => {
    const view = await mountEditor({ initialBody: '' })
    await act(async () => paste(view, '[x](u)', 'literal'))
    expect(view.state.doc.toString()).toBe('[x](u)')
  })
})

describe('the edges a paste leaves out', () => {
  const CASES: [string, string, [number, number], string, Parameters<typeof paste>[2], string][] = [
    ['the copied edges', 'ab', [1, 1], ' x ', 'auto', 'axb'],
    ['the selected edges', 'read the old now', [8, 13], 'docs', 'auto', 'read the docs now'],
    ['a selected line break', 'one\ntwo', [0, 4], 'x', 'auto', 'x\ntwo'],
    [
      'nothing of a multi-line paste',
      'read the old now',
      [8, 13],
      'a\n  b',
      'auto',
      'read thea\n  bnow',
    ],
    ['nothing of a literal paste', 'ab', [1, 1], ' x ', 'literal', 'a x b'],
    ['nothing of a clipboard that is only whitespace', 'ab', [1, 1], '\t', 'auto', 'a\tb'],
    [
      'the line break a copied address ends on',
      'see foo now',
      [4, 7],
      'https://a.com\n',
      'auto',
      'see [foo](https://a.com) now',
    ],
    [
      'the line break a copied connection ends on',
      '',
      [0, 0],
      '[[Alpha]]\n',
      'connection',
      '[[Alpha]]',
    ],
    [
      'the selected edges for a picked form',
      'read the old now',
      [8, 13],
      '[[Alpha]]',
      'connection',
      'read the [[Alpha]] now',
    ],
  ]

  it.each(CASES)('leaves out %s, in a body and a cell alike', async (_, body, [
    from,
    to,
  ], text, how, out) => {
    const view = await mountEditor({ initialBody: body })
    view.dispatch({ selection: { anchor: from, head: to } })
    await act(async () => paste(view, text, how))
    expect(view.state.doc.toString()).toBe(out)
    const cell = await pastedCellText(testHost(), body, { from, to }, text, how)
    expect(body.slice(0, cell.from) + cell.insert + body.slice(cell.to)).toBe(out)
  })
})

describe('pasting inside a link', () => {
  const pastedAt = async (
    body: string,
    anchor: number,
    text: string,
    how: 'event' | Parameters<typeof paste>[2] = 'event',
  ): Promise<string> => {
    const view = await mountEditor({ initialBody: body })
    view.dispatch({ selection: { anchor } })
    clipboard = text
    await act(async () => {
      if (how === 'event') pasteEvent(view, text)
      else if (how === 'inverse') chord(view)
      else paste(view, text, how)
    })
    const out = view.state.doc.toString()
    await cleanupEditor()
    return out
  }

  const RETARGETS: [string, number[], string, string, string][] = [
    ['[[Page1]]', [2, 4], '[x](Page2)', '[[Page2|x]]', '[[Page2|x]]'],
    ['[[Page1#H]]', [4, 9], '[x](Page2)', '[[Page2|x]]', '[[Page2|x]]'],
    ['[[Page1|Mine]]', [4, 10], '[[Page2]]', '[[Page2|Mine]]', '[[Page2]]'],
    ['[y](Page1)', [1, 6], '[[Page2]]', '[y](Page2)', '[Page2](Page2)'],
    ['[[Page1]]', [4], 'https://x.com', '[x.com](https://x.com)', '[x.com](https://x.com)'],
  ]

  for (const [container, carets, text, kept, removed] of RETARGETS)
    it(`retargets ${container} with ${text} wherever the caret sits inside it`, async () => {
      for (const keep of [true, false]) {
        settings({ defaultLinkFormat: 'link-short', removeTitleOnLinkChange: !keep })
        for (const at of carets)
          expect(await pastedAt(`a ${container} b`, at + 2, text), `${at} ${keep}`).toBe(
            `a ${keep ? kept : removed} b`,
          )
      }
    })

  it('writes the Default Link Format for an address pasted into an empty alias', async () => {
    settings({ defaultLinkFormat: 'link-short' })
    expect(await pastedAt('[[Foo|]]', 6, 'https://a.co')).toBe('[a.co](https://a.co)')
  })

  it("retargets a weblink's destination, keeping its label unless Remove Title On Link Change is on", async () => {
    settings({ removeTitleOnLinkChange: false })
    expect(await pastedAt('[x](https://b.co)', 8, 'https://c.co')).toBe('[x](https://c.co)')
    settings({ defaultLinkFormat: 'link-short', removeTitleOnLinkChange: true })
    expect(await pastedAt('[x](https://b.co)', 8, 'https://c.co')).toBe('[c.co](https://c.co)')
  })

  it('inserts text and a schemeless address as text', async () => {
    expect(await pastedAt('[[P]]', 3, '3.14')).toBe('[[P3.14]]')
    expect(await pastedAt('[[P]]', 2, 'hello')).toBe('[[helloP]]')
  })

  it('inserts the address as text under Plain Text and the inverse chord', async () => {
    expect(await pastedAt('[[P1]]', 4, 'https://a.co', 'plain')).toBe('[[P1https://a.co]]')
    expect(await pastedAt('[[P1]]', 4, 'https://a.co', 'inverse')).toBe('[[P1https://a.co]]')
  })

  it('writes the address under Plain Text inside a link destination', async () => {
    expect(await pastedAt('[docs]() tail', 7, '[Home](https://a.com)', 'plain')).toBe(
      '[docs](https://a.com) tail',
    )
  })

  it('writes the form a Paste As pick names', async () => {
    settings({ removeTitleOnLinkChange: false })
    expect(await pastedAt('[[P1|a]]', 3, '[[P2]]', 'markdown')).toBe('[a](P2)')
    expect(await pastedAt('[y](P1)', 5, '[x](P2)', 'connection')).toBe('[[P2|x]]')
    settings({ defaultLinkFormat: 'link-full' })
    expect(await pastedAt('[x](https://b.co)', 8, 'https://c.co', 'link-short')).toBe(
      '[c.co](https://c.co)',
    )
  })

  it('writes a picked link format over the label a link or the clipboard carried, as outside a link', async () => {
    settings({ removeTitleOnLinkChange: false })
    expect(await pastedAt('[x](https://b.co)', 8, 'https://c.co', 'link-short')).toBe(
      '[c.co](https://c.co)',
    )
    expect(await pastedAt('[x](https://b.co)', 8, 'https://c.co', 'link-full')).toBe(
      '[https://c.co](https://c.co)',
    )
    expect(await pastedAt('[x](https://b.co)', 8, '[y](https://c.co)', 'link-short')).toBe(
      '[c.co](https://c.co)',
    )
    expect(await pastedAt('[x](https://b.co)', 8, 'https://c.co')).toBe('[x](https://c.co)')
  })

  it('appends at the resting seat after a link', async () => {
    expect(await pastedAt('[[P]]', 5, '[[Q]]')).toBe('[[P]][[Q]]')
  })

  it("retargets an embed's connection mid-line", async () => {
    expect(await pastedAt('see ![[Q]] x', 7, '[[P]]')).toBe('see ![[P]] x')
  })
})

describe('pasting into a cell that holds no editor', () => {
  const A = 'https://a.com'
  const at0 = { from: 0, to: 0 }

  it('formats an address in the Default Link Format', async () => {
    const host = testHost({ settings: { defaultLinkFormat: 'link-short' } })
    expect(await pastedCellText(host, '', at0, A, 'auto')).toEqual({
      from: 0,
      to: 0,
      insert: `[a.com](${A})`,
    })
  })

  it('awaits a Page Title, and writes the short form when the fetch fails', async () => {
    const titled = (title: string | null) => ({
      ...testHost({ settings: { defaultLinkFormat: 'link-title' } }),
      linkTitles: { get: () => null, resolve: async () => title },
    })
    expect((await pastedCellText(titled('Hello'), '', at0, A, 'auto')).insert).toBe(`[Hello](${A})`)
    expect((await pastedCellText(titled(null), '', at0, A, 'auto')).insert).toBe(`[a.com](${A})`)
  })

  it('lands plain text as typed', async () => {
    expect(await pastedCellText(testHost(), '', at0, 'plain', 'auto')).toEqual({
      from: 0,
      to: 0,
      insert: 'plain',
    })
  })

  it('retargets the link the seat sits inside', async () => {
    const seat = { from: 6, to: 6 }
    expect(await pastedCellText(testHost(), 'see [[Nope]] x', seat, '[[P2]]', 'auto')).toEqual({
      from: 4,
      to: 12,
      insert: '[[P2]]',
    })
  })

  it('lands an address as typed inside code', async () => {
    const seat = { from: 4, to: 4 }
    expect(await pastedCellText(testHost(), '`npm i`', seat, A, 'auto')).toEqual({
      ...seat,
      insert: A,
    })
  })
})

describe('dropping into the editor', () => {
  const drop = async (view: EditorView, data: Record<string, string>): Promise<void> => {
    const event = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'dataTransfer', {
      value: { types: Object.keys(data), files: [], getData: (t: string) => data[t] ?? '' },
    })
    await act(async () => view.contentDOM.dispatchEvent(event))
  }

  it('writes an address dragged in from outside as a formatted link at the drop point', async () => {
    settings({ defaultLinkFormat: 'link-short' })
    const view = await mountEditor({ initialBody: 'one two' })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(4)
    await drop(view, { 'text/uri-list': URL, 'text/plain': URL })
    expect(view.state.doc.toString()).toBe(`one [example.com](${URL})two`)
  })

  it('leaves a drop carrying text alone to CodeMirror', async () => {
    const view = await mountEditor({ initialBody: 'one two' })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(4)
    await drop(view, { 'text/plain': URL })
    expect(view.state.doc.toString()).toBe('one two')
  })
})
