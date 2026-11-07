import { describe, expect, it } from 'vitest'
import { editorText, parseEditorValue } from './parseEditorValue'

describe('parseEditorValue', () => {
  it('number: parses a finite value, trims, clears on empty, rejects garbage', () => {
    expect(parseEditorValue('number', '42')).toEqual({ kind: 'number', value: 42 })
    expect(parseEditorValue('number', '  3.5 ')).toEqual({ kind: 'number', value: 3.5 })
    expect(parseEditorValue('number', '$1,200')).toEqual({ kind: 'number', value: 1200 })
    expect(parseEditorValue('number', '')).toBeNull()
    expect(parseEditorValue('number', 'abc')).toBeUndefined()
  })

  it('link: normalizes + serializes a valid link, clears on empty, rejects invalid', () => {
    const link = { index: undefined, own: undefined }
    expect(parseEditorValue('link', 'example.com', null, link)).toEqual({
      kind: 'link',
      value: 'https://example.com',
    })
    expect(parseEditorValue('link', '', null, link)).toBeNull()
    expect(parseEditorValue('link', 'not a url', null, link)).toBeUndefined()
  })

  it('text: opens on its trimmed first line, rejoins it with the lines behind, drops an emptied first line, clears a blank', () => {
    const text = (value: string) => ({ kind: 'text', value }) as const
    expect(editorText(text('first \nsecond\nthird'))).toBe('first')
    expect(editorText(text('- milk\n- eggs'))).toBe('- milk')
    expect(editorText(text(''))).toBe('')
    expect(parseEditorValue('text', 'changed', text('first\nsecond'))).toEqual(
      text('changed\nsecond'),
    )
    expect(parseEditorValue('text', 'fresh', null)).toEqual(text('fresh'))
    expect(parseEditorValue('text', '  padded  ', text('first\nsecond'))).toEqual(
      text('padded\nsecond'),
    )
    expect(parseEditorValue('text', '', text('first\nsecond'))).toEqual(text('second'))
    expect(parseEditorValue('text', '', text('first\n\n  \nsecond\n\nthird'))).toEqual(
      text('second\n\nthird'),
    )
    expect(parseEditorValue('text', '', text('only'))).toBeNull()
    expect(parseEditorValue('text', '', text('a\n\n'))).toBeNull()
    expect(parseEditorValue('text', '   ', null)).toBeNull()
  })

  it('an unsupported type never commits', () => {
    expect(parseEditorValue('status', 'x')).toBeUndefined()
  })
})
