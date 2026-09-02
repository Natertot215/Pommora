import { describe, it, expect } from 'vitest'
import { markdownLinkRegex } from './links'
import { pasteAsRows, pasteAsTarget, pasteAsWrite, type PasteAsForm } from './pasteAsMenu'

const URL = 'https://www.example.com/a/b'

// Off both seats unless a test says otherwise: the rows every other case offers are the ones that
// don't depend on where the caret is, and holding the seats off keeps them readable on their own.
const labels = (clipboard: string, seat = false, cite = false): string[] =>
  pasteAsRows(clipboard, seat, cite).map((r) => r.label)
const forms = (clipboard: string, seat = false, cite = false): PasteAsForm[] =>
  pasteAsRows(clipboard, seat, cite).map((r) => r.form)

/** What `form` writes for whatever `clipboard` holds. */
const written = (clipboard: string, form: PasteAsForm, title?: string): string | undefined =>
  pasteAsWrite(pasteAsTarget(clipboard), form, title)?.text

describe('the footnote form answers to the clipboard alone', () => {
  it('is offered for a multi-paragraph clipboard, where no other form is', () => {
    expect(labels('one para\n\ntwo para', true, true)).toEqual(['Footnote'])
  })

  it('leads the list where the clipboard also names something', () => {
    expect(labels('[[Alpha]]', false, true)).toEqual(['Footnote', 'Connection', 'Markdown Link'])
    expect(forms(URL, false, true)[0]).toBe('footnote')
  })

  it('is not offered off a seat a marker cannot bind from', () => {
    expect(labels('one para\n\ntwo para', true, false)).toEqual([])
    expect(labels('[[Alpha]]', false, false)).toEqual(['Connection', 'Markdown Link'])
  })

  it('is not offered for an empty clipboard', () => {
    expect(labels('   ', true, true)).toEqual([])
  })

  // The pair is two disjoint sites, so the single-range writer has nothing to say about it.
  it('writes nothing through the shared writer', () => {
    expect(pasteAsWrite(pasteAsTarget(URL), 'footnote')).toBeNull()
    expect(pasteAsWrite(pasteAsTarget('[[Alpha]]'), 'footnote')).toBeNull()
  })
})

describe('what the clipboard offers to become', () => {
  it('offers a bare address every link form, and the address itself', () => {
    expect(labels(URL)).toEqual(['Full Link', 'Short Link', 'Page Title', 'Plain Text'])
    expect(forms(URL)).toEqual(['link-full', 'link-short', 'link-title', 'plain'])
  })

  it('offers a copied connection the two ways of naming a page', () => {
    expect(labels('[[Alpha]]')).toEqual(['Connection', 'Markdown Link'])
  })

  // A markdown link is offered what its target names, not what its syntax is — the same rule the
  // editor's own menu follows.
  it('reads a markdown link through its target', () => {
    expect(forms(`[Home](${URL})`)).toEqual(['link-full', 'link-short', 'link-title', 'plain'])
    expect(labels('[Alpha](Alpha)')).toEqual(['Connection', 'Markdown Link'])
  })

  it('offers nothing for a clipboard holding neither', () => {
    expect(pasteAsRows('some ordinary prose', true, false)).toEqual([])
    expect(pasteAsRows('', true, false)).toEqual([])
    expect(pasteAsRows('   ', true, false)).toEqual([])
  })

  // Every form writes one line; a clipboard carrying more than one is prose, whatever the first
  // line looks like.
  it('offers nothing for more than one line', () => {
    expect(pasteAsRows(`${URL}\nand more`, true, false)).toEqual([])
  })

  // Both embeds take a line to themselves, so the offer follows the placement: on a blank line each
  // list gains its embed, and everywhere else the lists read as they always have.
  it('offers each embed only where one can be written', () => {
    expect(labels(URL, true)).toEqual([
      'Full Link',
      'Short Link',
      'Page Title',
      'Plain Text',
      'Embedded Link',
    ])
    expect(labels('[[Alpha]]', true)).toEqual(['Connection', 'Markdown Link', 'Embedded Page'])
  })

  // A tile only forms over an explicit http(s) address, and `![[…]]` has no way to carry a `]` —
  // an offer either grammar would refuse is never made in the first place.
  it('withholds an embed the syntax could not spell', () => {
    expect(labels('mailto:someone@example.com', true)).not.toContain('Embedded Link')
    expect(labels('[[Notes [WIP] final]]', true)).not.toContain('Embedded Page')
  })
})

describe('what each form writes', () => {
  it('writes the three link forms exactly as a paste in that form would', () => {
    expect(written(URL, 'link-full')).toBe(`[${URL}](${URL})`)
    expect(written(URL, 'link-short')).toBe(`[example.com](${URL})`)
    expect(written(URL, 'link-title', 'Example Domain')).toBe(`[Example Domain](${URL})`)
  })

  it('stands the domain in for a title it does not have yet, and says so', () => {
    const w = pasteAsWrite(pasteAsTarget(URL), 'link-title')
    expect(w).toEqual({
      kind: 'link',
      text: `[example.com](${URL})`,
      target: URL,
      wantsTitle: true,
    })
  })

  it('writes the address alone as plain text', () => {
    expect(written(URL, 'plain')).toBe(URL)
    expect(written(`[Home](${URL})`, 'plain')).toBe(URL)
  })

  it('writes a page as either syntax that reaches it', () => {
    expect(written('[[Alpha]]', 'connection')).toBe('[[Alpha]]')
    expect(written('[[Alpha]]', 'markdown')).toBe('[Alpha](Alpha)')
  })

  // A title's spaces and parentheses answer to nobody's grammar, so the markdown form encodes them
  // the same way every other writer of that syntax does.
  it('encodes a page title the markdown form cannot carry raw', () => {
    expect(written('[[Notes (draft)]]', 'markdown')).toBe('[Notes (draft)](Notes%20%28draft%29)')
  })

  // The label has its own grammar to survive, and an unescaped `]` ends it early — the whole link
  // then tokenizes as nothing rather than as a link with a truncated name. An opening `[` is
  // ordinary label text and is left as the title wrote it.
  it('escapes the bracket that would end the label early', () => {
    const text = written('[[Notes [WIP] final]]', 'markdown')
    expect(text).toBe('[Notes [WIP\\] final](Notes%20%5BWIP%5D%20final)')
    // The claim under the escape: what it wrote is a link the grammar reads back whole.
    expect(markdownLinkRegex().exec(text ?? '')?.[0]).toBe(text)
  })

  it('writes each embed as the line its grammar reads', () => {
    expect(written('[[Alpha]]', 'embedPage')).toBe('![[Alpha]]')
    // No label: a pasted address brings no words of its own, and an empty one leaves the tile's
    // title to the nexus's link format at render.
    expect(written(URL, 'embedLink')).toBe(`![](${URL})`)
    expect(pasteAsWrite(pasteAsTarget('[[Alpha]]'), 'embedPage')?.kind).toBe('line')
  })

  it('writes nothing for a form the clipboard cannot take', () => {
    expect(pasteAsWrite(pasteAsTarget(URL), 'embedPage')).toBeNull()
    expect(pasteAsWrite(pasteAsTarget('[[Alpha]]'), 'embedLink')).toBeNull()
    expect(pasteAsWrite(pasteAsTarget('[[Notes [WIP] final]]'), 'embedPage')).toBeNull()
    expect(pasteAsWrite(pasteAsTarget(URL), 'connection')).toBeNull()
    expect(pasteAsWrite(pasteAsTarget('[[Alpha]]'), 'link-short')).toBeNull()
    expect(pasteAsWrite(null, 'plain')).toBeNull()
  })
})
