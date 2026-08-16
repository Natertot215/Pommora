import { describe, it, expect } from 'vitest'
import { pasteAsRows, pasteAsTarget, pasteAsWrite, type PasteAsForm } from './PasteAsMenu'

const URL = 'https://www.example.com/a/b'

const labels = (clipboard: string): string[] => pasteAsRows(clipboard).map((r) => r.label)
const forms = (clipboard: string): PasteAsForm[] => pasteAsRows(clipboard).map((r) => r.form)

/** What `form` writes for whatever `clipboard` holds. */
const written = (clipboard: string, form: PasteAsForm, title?: string): string | undefined =>
  pasteAsWrite(pasteAsTarget(clipboard), form, title)?.text

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
    expect(pasteAsRows('some ordinary prose')).toEqual([])
    expect(pasteAsRows('')).toEqual([])
    expect(pasteAsRows('   ')).toEqual([])
  })

  // Every form writes one line; a clipboard carrying more than one is prose, whatever the first
  // line looks like.
  it('offers nothing for more than one line', () => {
    expect(pasteAsRows(`${URL}\nand more`)).toEqual([])
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
    expect(w).toEqual({ kind: 'link', text: `[example.com](${URL})`, target: URL, wantsTitle: true })
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

  it('writes nothing for a form the clipboard cannot take', () => {
    expect(pasteAsWrite(pasteAsTarget(URL), 'connection')).toBeNull()
    expect(pasteAsWrite(pasteAsTarget('[[Alpha]]'), 'link-short')).toBeNull()
    expect(pasteAsWrite(null, 'plain')).toBeNull()
  })
})
