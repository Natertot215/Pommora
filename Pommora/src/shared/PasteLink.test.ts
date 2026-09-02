import { describe, it, expect } from 'vitest'
import { decidePaste, pastedUrl, type PasteInput } from './pasteLink'
import { linkDisplayText } from './linkValue'

const URL = 'https://www.example.com/a/b'

const at = (over: Partial<PasteInput> = {}): ReturnType<typeof decidePaste> =>
  decidePaste({
    clipboard: URL,
    selectionText: '',
    pasteIntoText: false,
    inverse: false,
    format: 'link-full',
    ...over,
  })

const textOf = (d: ReturnType<typeof decidePaste>): string | null =>
  d.kind === 'link' ? d.text : null

describe('pastedUrl — what counts as a pasted address', () => {
  it('takes an ordinary http(s) address', () => {
    expect(pastedUrl(URL)).toBe(URL)
    expect(pastedUrl('http://example.com')).toBe('http://example.com')
    expect(pastedUrl(`  ${URL}  `)).toBe(URL)
  })

  // The regression this predicate exists for. `isValidLink` asks whether something WOULD open, and
  // says yes to all of these — so gating on it turned a filename copied out of a terminal into a
  // link, and `3.14` into a label reading `3.0.0.14`.
  it('refuses a dotted token that is not an address', () => {
    for (const s of ['App.tsx', 'readme.md', 'package.json', 'Node.js', '3.14', 'v1.2'])
      expect(pastedUrl(s), s).toBeNull()
  })

  it('refuses a schemeless host — an explicit scheme is what says "I copied an address"', () => {
    expect(pastedUrl('www.example.com')).toBeNull()
    expect(pastedUrl('example.com/path')).toBeNull()
  })

  it('refuses anything that is a document rather than an address', () => {
    expect(pastedUrl('')).toBeNull()
    expect(pastedUrl('   ')).toBeNull()
    expect(pastedUrl(`see ${URL} here`)).toBeNull()
    expect(pastedUrl(`${URL}\nhttps://other.example.com`)).toBeNull()
  })

  it('refuses a scheme it cannot open as a page', () => {
    expect(pastedUrl('mailto:a@b.com')).toBeNull()
    expect(pastedUrl('ftp://example.com')).toBeNull()
  })

  it('refuses a malformed http address', () => {
    expect(pastedUrl('https://')).toBeNull()
    expect(pastedUrl('https://nodot')).toBeNull()
  })
})

// ⌘⇧V is the inverse of ⌘V, and which axis it inverts is chosen by whether a selection exists.
describe('decidePaste — no selection, the format axis', () => {
  it('formats on ⌘V, and pastes literally under the inverse', () => {
    expect(textOf(at({}))).toBe(`[${URL}](${URL})`)
    expect(at({ inverse: true }).kind).toBe('literal')
  })
})

describe('decidePaste — a selection, the wrap axis', () => {
  const sel = { selectionText: 'the docs' }

  it('wraps the selection on ⌘V when the setting is on', () => {
    expect(textOf(at({ ...sel, pasteIntoText: true }))).toBe(`[the docs](${URL})`)
  })

  it('wraps under the inverse when the setting is off', () => {
    expect(textOf(at({ ...sel, pasteIntoText: false, inverse: true }))).toBe(`[the docs](${URL})`)
  })

  // Not wrapping means the selection is replaced, which is an ordinary paste at a caret — and a
  // caret paste formats. The inverse was already spent choosing the axis, so it does not flip the
  // format a second time.
  it('formats when it does not wrap', () => {
    expect(textOf(at({ ...sel, pasteIntoText: false }))).toBe(`[${URL}](${URL})`)
    expect(textOf(at({ ...sel, pasteIntoText: true, inverse: true }))).toBe(`[${URL}](${URL})`)
  })

  it('escapes a selection carrying the characters that would break the shape', () => {
    expect(textOf(at({ selectionText: 'Chapter [2]', pasteIntoText: true }))).toBe(
      `[Chapter [2\\]](${URL})`,
    )
  })

  // A multi-line selection is not a label — the link would straddle a line break and stop being one.
  // The selection is replaced by the caret paste's formatted link instead.
  it('does not wrap a selection spanning a line break', () => {
    expect(textOf(at({ selectionText: 'two\nlines', pasteIntoText: true }))).toBe(
      `[${URL}](${URL})`,
    )
  })

  // The whole point of the wrap: your words are the label, so the nexus-wide format has nothing to
  // say about it.
  it('ignores the default format when wrapping', () => {
    expect(textOf(at({ ...sel, pasteIntoText: true, format: 'link-short' }))).toBe(
      `[the docs](${URL})`,
    )
  })
})

describe('decidePaste — which form the label takes', () => {
  it('writes the whole address for Full Link', () => {
    expect(textOf(at({ format: 'link-full' }))).toBe(`[${URL}](${URL})`)
  })

  it('writes the bare domain for Short Link', () => {
    expect(textOf(at({ format: 'link-short' }))).toBe(`[example.com](${URL})`)
  })

  it('writes a resolved title for Page Title, and asks for no fetch', () => {
    const d = at({ format: 'link-title', title: 'Example Domain' })
    expect(textOf(d)).toBe(`[Example Domain](${URL})`)
    expect(d.kind === 'link' && d.wantsTitle).toBe(false)
  })

  it('writes Short Link for Page Title until the fetch lands, and asks for one', () => {
    const d = at({ format: 'link-title' })
    expect(textOf(d)).toBe(`[example.com](${URL})`)
    expect(d.kind === 'link' && d.wantsTitle).toBe(true)
  })

  it('never asks for a fetch in a form that has no title to show', () => {
    for (const format of ['link-full', 'link-short'] as const) {
      const d = at({ format })
      expect(d.kind === 'link' && d.wantsTitle, format).toBe(false)
    }
  })

  it('reports the target it pointed at, whatever the label reads', () => {
    const d = at({ format: 'link-short' })
    expect(d.kind === 'link' && d.target).toBe(URL)
  })
})

// One formatter, or a pasted link and the same URL in a property cell read differently. If the paste
// path ever grows its own domain-stripping, this is what catches it.
describe('the label agrees with the property cell', () => {
  it('matches linkDisplayText for every form', () => {
    for (const format of ['link-full', 'link-short', 'link-title'] as const) {
      const d = at({ format, title: 'Example Domain' })
      expect(textOf(d), format).toBe(`[${linkDisplayText(URL, format, 'Example Domain')}](${URL})`)
    }
  })
})
