import { describe, expect, it } from 'vitest'
import { DEFAULT_COMMANDS } from './commands'
import { type EditorMenuRequest, editorContextItems } from './editorMenu'

const state: EditorMenuRequest = {
  scope: 'page',
  x: 0,
  y: 0,
  bold: true,
  italic: false,
  strikethrough: false,
  highlight: false,
  inlineCode: false,
  link: false,
  connection: false,
  heading: 2,
  list: 'arrow',
  block: 'quote',
  embedSeat: false,
  citeSeat: true,
}

const items = editorContextItems(state, DEFAULT_COMMANDS, '')
const branch = (label: string) => items.find((i) => i.label === label)?.submenu ?? []

describe('the editor’s right-click block', () => {
  it('words and orders its submenus as the block menu does', () => {
    expect(items.map((i) => i.label)).toEqual(['Insert', 'Format', 'Embed', 'Heading', 'Lists'])
    expect(branch('Insert').map((r) => r.label)).toEqual([
      'Blockquote',
      'Callout',
      'Code Block',
      'Table',
      'Horizontal Rule',
      'Footnote',
    ])
    expect(branch('Embed').map((r) => r.label)).toEqual(['Internal Page', 'Webpage'])
    expect(
      branch('Format')
        .map((r) => r.label)
        .slice(-2),
    ).toEqual(['Connection', 'External Link'])
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
    ).toEqual(['Format', 'Lists'])
    expect(
      editorContextItems({ ...state, scope: 'cell' }, DEFAULT_COMMANDS, 'https://a.com')[0].label,
    ).toBe('Insert Link')
  })
})
