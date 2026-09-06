import { describe, it, expect } from 'vitest'
import { markdownLinkRegex } from '../Connections/links'
import { pasteAsRows, pasteAsTarget, pasteAsWrite, type PasteAsForm } from './pasteAsMenu'

const URL = 'https://www.example.com/a/b'

const labels = (clipboard: string, seat = false, cite = false): string[] =>
  pasteAsRows(clipboard, seat, cite).map((r) => r.label)
const forms = (clipboard: string, seat = false, cite = false): PasteAsForm[] =>
  pasteAsRows(clipboard, seat, cite).map((r) => r.form)

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

  it('reads a markdown link through its target', () => {
    expect(forms(`[Home](${URL})`)).toEqual(['link-full', 'link-short', 'link-title', 'plain'])
    expect(labels('[Alpha](Alpha)')).toEqual(['Connection', 'Markdown Link'])
  })

  it('offers nothing for a clipboard holding neither', () => {
    expect(pasteAsRows('some ordinary prose', true, false)).toEqual([])
    expect(pasteAsRows('', true, false)).toEqual([])
    expect(pasteAsRows('   ', true, false)).toEqual([])
  })

  it('offers nothing for more than one line', () => {
    expect(pasteAsRows(`${URL}\nand more`, true, false)).toEqual([])
  })

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

  // A tile forms only over an explicit http(s) address, and `![[…]]` cannot carry a `]`.
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

  it('encodes a page title the markdown form cannot carry raw', () => {
    expect(written('[[Notes (draft)]]', 'markdown')).toBe('[Notes (draft)](Notes%20%28draft%29)')
  })

  // An unescaped `]` ends the label early and the whole link tokenizes as nothing; `[` is ordinary text.
  it('escapes the bracket that would end the label early', () => {
    const text = written('[[Notes [WIP] final]]', 'markdown')
    expect(text).toBe('[Notes [WIP\\] final](Notes%20%5BWIP%5D%20final)')
    expect(markdownLinkRegex().exec(text ?? '')?.[0]).toBe(text)
  })

  it('writes each embed as the line its grammar reads', () => {
    expect(written('[[Alpha]]', 'embedPage')).toBe('![[Alpha]]')
    // A pasted address brings no words, so an empty label leaves the title to the link format at render.
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
