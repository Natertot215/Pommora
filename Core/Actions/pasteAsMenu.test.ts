import { describe, it, expect } from 'vitest'
import { markdownLinkRegex } from '../Connections/links'
import { readLinkText, type LinkTarget } from '../Connections/linkValue'
import { buildPageIndex } from '../Connections/pageIndex'
import { PASTE_LITERAL_ACTION, RESTING_EDITS } from './editorMenu'
import { pasteAsRows, pasteAsWrite, pasteModeOf, type PasteMode } from './pasteAsMenu'

const URL = 'https://www.example.com/a/b'
const A = 'https://a.com'

const labels = (clipboard: string, seat = false, cite = false): string[] =>
  pasteAsRows(clipboard, seat, cite).map((r) => r.label)
const forms = (clipboard: string, seat = false, cite = false): (PasteMode | null)[] =>
  pasteAsRows(clipboard, seat, cite).map((r) => pasteModeOf(r.action))

const over = (selection = '', title?: string) => ({
  selection,
  format: 'link-full' as const,
  title,
})

const link = (clipboard: string): LinkTarget => {
  const target = readLinkText(clipboard)
  if (!target) throw new Error(`no link in ${clipboard}`)
  return target
}

const written = (
  clipboard: string,
  how: PasteMode,
  title?: string,
  selection = '',
): string | undefined => pasteAsWrite(link(clipboard), how, over(selection, title))?.text

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

  it('writes nothing through the shared writer', () => {
    expect(pasteAsWrite(link(URL), 'footnote', over())).toBeNull()
    expect(pasteAsWrite(link('[[Alpha]]'), 'footnote', over())).toBeNull()
  })
})

describe('what the clipboard offers to become', () => {
  it('offers a bare address every link form, and the address itself', () => {
    expect(labels(URL)).toEqual(['Full Link', 'Short Link', 'Page Title', 'Plain Text'])
    expect(forms(URL)).toEqual(['link-full', 'link-short', 'link-title', 'plain'])
  })

  it('offers a non-web address no Page Title', () => {
    expect(labels('mailto:a@b.co')).toEqual(['Full Link', 'Short Link', 'Plain Text'])
  })

  it('offers a copied connection the two ways of naming a page, the wikilink only where it spells every slot', () => {
    expect(labels('[[Alpha]]')).toEqual(['Connection', 'Markdown Link'])
    expect(labels('[a\\]b](Alpha)')).toEqual(['Markdown Link'])
  })

  it('an address a held page also answers offers the page’s rows', () => {
    const index = buildPageIndex([{ id: 'p', title: 'notes.io', path: 'Notes/notes.io.md' }])
    expect(labels('[notes](notes.io)', false, false)).toEqual([
      'Full Link',
      'Short Link',
      'Page Title',
      'Plain Text',
    ])
    expect(pasteAsRows('[notes](notes.io)', false, false, index).map((r) => r.label)).toEqual([
      'Connection',
      'Markdown Link',
    ])
  })

  it('reads a markdown link through its target', () => {
    expect(forms(`[Home](${URL})`)).toEqual(['link-full', 'link-short', 'link-title', 'plain'])
    expect(labels('[Alpha](Alpha)')).toEqual(['Connection', 'Markdown Link'])
  })

  it('offers a held heading the two ways of naming a page, in either syntax', () => {
    expect(labels('[[T#H]]')).toEqual(['Connection', 'Markdown Link'])
    expect(labels('[x](#H)')).toEqual(['Connection', 'Markdown Link'])
    expect(labels('[[#H]]')).toEqual(['Connection', 'Markdown Link'])
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

  it('withholds an embed the syntax could not spell', () => {
    expect(labels('mailto:someone@example.com', true)).not.toContain('Embedded Link')
    expect(labels('example.com', true)).toContain('Embedded Link')
    expect(labels('[x](Notes.md)', true)).toEqual(['Connection', 'Markdown Link'])
    expect(labels('[x](Draft%5D)', true)).toEqual(['Markdown Link'])
    expect(labels('[x](A%7CB)', true)).toEqual(['Markdown Link'])
    expect(labels('[[Notes [WIP] final]]', true)).toContain('Embedded Page')
  })

  it('withholds Embedded Page from a page link carrying a heading or an alias', () => {
    expect(labels('[[T#H]]', true)).toEqual(['Connection', 'Markdown Link'])
    expect(labels('[[T|a]]', true)).toEqual(['Connection', 'Markdown Link'])
  })

  it('offers Embedded Page for a path link whose alias is the title its writer gave it', () => {
    const index = buildPageIndex([
      { id: 'a', title: 'Notes', path: 'A/Notes.md' },
      { id: 'b', title: 'Notes', path: 'B/Notes.md' },
    ])
    const offered = (clipboard: string) =>
      pasteAsRows(clipboard, true, false, index).map((r) => r.label)
    expect(offered('[[A/Notes|Notes]]')).toContain('Embedded Page')
    expect(offered('[[A/Notes|mine]]')).not.toContain('Embedded Page')
  })
})

describe('what each form writes', () => {
  it('writes the three link forms exactly as a paste in that form would', () => {
    expect(written(URL, 'link-full')).toBe(`[${URL}](${URL})`)
    expect(written(URL, 'link-short')).toBe(`[example.com](${URL})`)
    expect(written(URL, 'link-title', 'Example Domain')).toBe(`[Example Domain](${URL})`)
  })

  it('stands the domain in for a title it does not have yet, and says so', () => {
    const w = pasteAsWrite(link(URL), 'link-title', over())
    expect(w).toEqual({
      kind: 'link',
      text: `[example.com](${URL})`,
      awaits: URL,
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

  it('keeps the alias and heading it was handed', () => {
    expect(written('[[T|a]]', 'connection')).toBe('[[T|a]]')
    expect(written('[[T#H|a]]', 'markdown')).toBe('[a](T#H)')
    expect(written('[[#H]]', 'markdown')).toBe('[H](#H)')
  })

  it('encodes a page title the markdown form cannot carry raw', () => {
    expect(written('[[Notes (draft)]]', 'markdown')).toBe('[Notes (draft)](Notes%20%28draft%29)')
  })

  it('escapes the bracket that would end the label early', () => {
    const text = written('[[Notes [WIP] final]]', 'markdown')
    expect(text).toBe('[Notes [WIP\\] final](Notes%20%5BWIP%5D%20final)')
    expect(markdownLinkRegex().exec(text ?? '')?.[0]).toBe(text)
  })

  it('writes each embed as the line its grammar reads', () => {
    expect(written('[[Alpha]]', 'embedPage')).toBe('![[Alpha]]')
    expect(written(URL, 'embedLink')).toBe(`![](${URL})`)
    expect(pasteAsWrite(link('[[Alpha]]'), 'embedPage', over())?.kind).toBe('line')
  })

  it('writes nothing for a form the clipboard cannot take', () => {
    expect(written(URL, 'embedPage')).toBeUndefined()
    expect(written('[[Alpha]]', 'embedLink')).toBeUndefined()
    expect(written('[[T#H]]', 'embedPage')).toBeUndefined()
    expect(written(URL, 'connection')).toBeUndefined()
    expect(written('[[Alpha]]', 'link-short')).toBeUndefined()
  })
})

describe('what a plain paste writes', () => {
  it('wraps a selection, and writes the Default Link Format at a caret', () => {
    expect(written(A, 'auto', undefined, 'docs')).toBe(`[docs](${A})`)
    expect(pasteAsWrite(link(A), 'auto', { selection: '', format: 'link-short' })?.text).toBe(
      `[a.com](${A})`,
    )
  })

  it('escapes a wrapped selection, and leaves a multi-line selection unwrapped', () => {
    expect(written(A, 'auto', undefined, 'Chapter [2]')).toBe(`[Chapter [2\\]](${A})`)
    expect(written(A, 'auto', undefined, 'two\nlines')).toBe(`[${A}](${A})`)
  })

  it('flips to the format axis under the inverse chord over a selection, and to nothing at a caret', () => {
    expect(written(A, 'inverse', undefined, 'docs')).toBe(`[${A}](${A})`)
    expect(written(A, 'inverse')).toBeUndefined()
  })

  it('formats only a bare address', () => {
    expect(written(A, 'plain')).toBe(A)
    expect(written('[[Alpha]]', 'auto')).toBeUndefined()
    expect(written(`[Docs](${A})`, 'auto')).toBeUndefined()
    expect(written(A, 'literal')).toBeUndefined()
  })
})

describe('which paste an action asks for', () => {
  it('reads the literal paste, the resting Paste, and each Paste As action, and nothing else', () => {
    expect(pasteModeOf(PASTE_LITERAL_ACTION)).toBe('literal')
    expect(pasteModeOf(RESTING_EDITS.paste)).toBe('auto')
    expect(forms(URL, true)).toContain('embedLink')
    expect(pasteModeOf('format:bold')).toBeNull()
  })
})
