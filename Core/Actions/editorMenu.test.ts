import { describe, expect, it } from 'vitest'
import { DEFAULT_COMMANDS } from './commands'
import {
  type EditorMenuRequest,
  changeColorItems,
  editorContextItems,
  editorMenuRequest,
} from './editorMenu'

const state: EditorMenuRequest = {
  scope: 'page',
  x: 0,
  y: 0,
  bold: true,
  italic: false,
  strikethrough: false,
  painted: null,
  inlineCode: false,
  link: false,
  connection: false,
  heading: 2,
  list: 'arrow',
  block: 'quote',
  embedSeat: false,
  citeSeat: true,
  resting: null,
}

const items = editorContextItems(state, DEFAULT_COMMANDS, '')
const branch = (label: string) => items.find((i) => i.label === label)?.submenu ?? []

describe('the editor’s right-click block', () => {
  it('words and orders its submenus as the block menu does', () => {
    expect(items.map((i) => i.label)).toEqual(['Lists', 'Insert', 'Format', 'Embed', 'Heading'])
    expect(branch('Insert').map((r) => r.label)).toEqual([
      'Blockquote',
      'Callout',
      'Code Block',
      'Table',
      'Horizontal Rule',
      'Footnote',
    ])
    expect(branch('Embed').map((r) => r.label)).toEqual(['Internal Page', 'External Link'])
    expect(branch('Format').map((r) => r.label)).toEqual([
      'Italic',
      'Inline Code',
      'Bold',
      'Strikethrough',
      'Text Color',
      'Highlight',
      'Connection',
      'External Link',
    ])
  })

  it('checks what the caret sits in, Paragraph included, and leaves command rows unchecked', () => {
    expect(branch('Insert').map((r) => r.checked)).toEqual([
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ])
    expect(branch('Heading').find((r) => r.checked)?.label).toBe('Heading 2')
    expect(branch('Heading')[0]).toMatchObject({ label: 'Paragraph', action: 'heading:0' })
    expect(branch('Lists').find((r) => r.checked)?.label).toBe('Arrowed List')
    expect(branch('Format').find((r) => r.checked)?.label).toBe('Bold')
  })

  it('shows each format row’s chord, and offers Insert Link only over an address', () => {
    expect(branch('Format')[2]).toMatchObject({ label: 'Bold', chord: 'cmd+b' })
    expect(editorContextItems(state, DEFAULT_COMMANDS, 'https://a.com')[0].label).toBe(
      'Insert Link',
    )
  })

  it('trims a cell’s block to Insert Link, Format, and Lists', () => {
    expect(
      editorContextItems({ ...state, scope: 'cell' }, DEFAULT_COMMANDS, '').map((i) => i.label),
    ).toEqual(['Lists', 'Format'])
    expect(
      editorContextItems({ ...state, scope: 'cell' }, DEFAULT_COMMANDS, 'https://a.com')[0].label,
    ).toBe('Insert Link')
  })

  it('trims a Text value’s block to Insert Link and Format', () => {
    expect(
      editorContextItems({ ...state, scope: 'text' }, DEFAULT_COMMANDS, '').map((i) => i.label),
    ).toEqual(['Format'])
    expect(
      editorContextItems({ ...state, scope: 'text' }, DEFAULT_COMMANDS, 'https://a.com').map(
        (i) => i.label,
      ),
    ).toEqual(['Insert Link', 'Format'])
  })
})

describe('the color rows', () => {
  const rowsOf = (label: string, s: EditorMenuRequest) =>
    editorContextItems(s, DEFAULT_COMMANDS, '')
      .find((i) => i.label === 'Format')
      ?.submenu?.find((r) => r.label === label)?.submenu ?? []
  const highlight = (s: EditorMenuRequest) => rowsOf('Highlight', s)
  const textColor = (s: EditorMenuRequest) => rowsOf('Text Color', s)
  const lit = { ...state, painted: { paint: 'highlight', color: 'red' } } as const
  const inked = { ...state, painted: { paint: 'textColor', color: 'green' } } as const

  it('lead with the accent on the highlight chord, the colors set apart under it', () => {
    const rows = highlight(state)
    expect(rows[0]).toMatchObject({ label: 'Accent', action: 'highlight:accent', chord: 'cmd+l' })
    expect(rows.map((r) => r.label).slice(1)).toEqual([
      'Red',
      'Orange',
      'Yellow',
      'Green',
      'Blue',
      'Purple',
      'Brown',
      'Black',
      'White',
    ])
    expect(rows[1]).toMatchObject({ action: 'highlight:red', separatorBefore: true })
    expect(rows.filter((r) => r.checked)).toEqual([])
  })

  it('give Text Color the colors text takes, with no accent, chord, or divider', () => {
    const rows = textColor(state)
    expect(rows.map((r) => r.label)).toEqual([
      'Red',
      'Orange',
      'Yellow',
      'Green',
      'Blue',
      'Purple',
      'Brown',
    ])
    expect(rows[0]).toMatchObject({ action: 'textColor:red' })
    expect(rows.some((r) => 'chord' in r || r.separatorBefore)).toBe(false)
  })

  it('check the color the caret sits in, under its own paint alone', () => {
    expect(
      highlight({ ...state, painted: { paint: 'highlight', color: 'accent' } }).find(
        (r) => r.checked,
      )?.label,
    ).toBe('Accent')
    expect(highlight(lit).find((r) => r.checked)?.label).toBe('Red')
    expect(textColor(inked).find((r) => r.checked)?.label).toBe('Green')
    expect(highlight(inked).filter((r) => r.checked)).toEqual([])
  })

  it('offer Change Color over a painted span, with its own paint’s rows', () => {
    expect(changeColorItems(state, DEFAULT_COMMANDS)).toEqual([])
    const [row] = changeColorItems(lit, DEFAULT_COMMANDS)
    expect(row.label).toBe('Change Color')
    expect(row.submenu).toEqual(highlight(lit))
    expect(changeColorItems(inked, DEFAULT_COMMANDS)[0].submenu).toEqual(textColor(inked))
  })
})

describe('the request main accepts', () => {
  it('takes a paint color and refuses any other', () => {
    const asked = (color: string) =>
      editorMenuRequest.safeParse({ ...state, painted: { paint: 'textColor', color } }).success
    expect(asked('green')).toBe(true)
    expect(asked('pink')).toBe(false)
  })
})
