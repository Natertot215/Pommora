// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { EditorView, runScopeHandlers } from '@codemirror/view'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  stubEditorBridge,
  typeInto,
} from '../../Testing/editorHarness'
import { linkTokenAt, tokenize } from '../Engine/tokens'
import { decorationsFor } from '../../Testing/markdownEngine'
import { GRIP_LINE } from '../Engine/intents'
import { blockStarts } from '../Engine/blockModel'
import { scanDoc } from '../Engine/docScan'
import { editFor } from '../Input/format'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderCellContent } from './cellStatic'

stubEditorBridge()
afterEach(cleanupEditor)

const table = (cell: string): string => `| A | B |\n| --- | --- |\n| ${cell} | z |`

async function tableEl(): Promise<Element> {
  let el = editorContainer().querySelector('table.mdpm-tbl')
  for (let i = 0; !el && i < 50; i++) {
    await act(() => new Promise((r) => setTimeout(r, 20)))
    el = editorContainer().querySelector('table.mdpm-tbl')
  }
  if (!el) throw new Error('the table widget never rendered')
  return el
}

// The widget replaces its DOM on every commit, so nothing about the live cell is held across a keystroke.
function liveCell(): { td: HTMLTableCellElement; view: EditorView } {
  const dom = editorContainer().querySelector('.mdpm-tbl-cell-editor .cm-content')
  const view = dom && EditorView.findFromDOM(dom as HTMLElement)
  if (!dom || !view) throw new Error('no cell is live')
  return { td: dom.closest('td, th') as HTMLTableCellElement, view }
}

// jsdom measures every rect as zero, so the click's own caret placement lands at 0; a list key is about where the caret IS.
async function enterCell(col = 0, at: 'end' | 'start' = 'end'): Promise<void> {
  const cell = (await tableEl()).querySelector('tbody')!.children[0].children[col]
  const div = cell.querySelector('.mdpm-tbl-cell-static') as HTMLElement
  const ev = { bubbles: true, cancelable: true, button: 0, clientX: 4, clientY: 4 }
  await act(async () => {
    div.dispatchEvent(new MouseEvent('pointerdown', ev))
    div.dispatchEvent(new MouseEvent('mousedown', ev))
    div.dispatchEvent(new MouseEvent('click', { ...ev, detail: 1 }))
  })
  if (at === 'start') return
  await act(async () => {
    const { view } = liveCell()
    view.dispatch({ selection: { anchor: view.state.doc.length } })
  })
}

async function press(key: string, shiftKey = false): Promise<void> {
  const dom = editorContainer().querySelector('.mdpm-tbl-cell-editor .cm-content')
  if (!dom) throw new Error('no cell is live')
  await act(async () => {
    dom.dispatchEvent(
      new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }),
    )
  })
}

const cellSource = (): string => liveCell().view.state.doc.toString()

const liveColumn = (): number => liveCell().td.cellIndex

const anyCellLive = (): boolean =>
  editorContainer().querySelector('.mdpm-tbl-cell-editor .cm-content') !== null

describe('the list vocabulary inside a table cell', () => {
  it('draws a bullet and its level, and leaves a heading, a rule and a quote as prose', () => {
    const list = decorationsFor('- a\n\t- b', [], new Set(), -1, scanDoc('- a\n\t- b', 'lists'))
    expect(
      list.filter((i) => i.kind === 'line' && i.className.includes('md-list-item')),
    ).toHaveLength(2)
    expect(list.some((i) => i.kind === 'widget' && i.spec.type === 'bullet')).toBe(true)
    expect(list.find((i) => i.kind === 'line' && i.level === 1)).toBeTruthy()

    const prose = '# h\n---\n> q\n```\nx\n```'
    expect(decorationsFor(prose, [], new Set(), -1, scanDoc(prose, 'lists'))).toHaveLength(0)
    expect(decorationsFor(prose, [], new Set(), -1).length).toBeGreaterThan(0)
  })

  it('renders a resting list as glyphs, not as markers', async () => {
    await mountEditor({ initialBody: table('- a<br>\t- [x] b') })
    const cell = (await tableEl()).querySelector('tbody')!.children[0].children[0]
    expect(cell.querySelectorAll('.md-list-item')).toHaveLength(2)
    expect(cell.querySelector('.md-list-bullet')?.textContent).toBe('•')
    expect(cell.querySelector('.md-list-task.md-list-done')).toBeTruthy()
    expect(cell.querySelector('.checkbox-checked')).toBeTruthy()
    expect(cell.textContent).not.toContain('- a')
  })

  it('Enter continues a list, and still leaves a cell that has none', async () => {
    await mountEditor({ initialBody: table('- a') })
    await enterCell()
    await press('Enter')
    expect(cellSource()).toBe('- a\n- ')
    expect(liveColumn()).toBe(0)

    await cleanupEditor()
    await mountEditor({ initialBody: table('plain') })
    await enterCell()
    await press('Enter')
    expect(anyCellLive()).toBe(false)
  })

  it('Tab nests a list item, and still moves on from a cell that has none', async () => {
    await mountEditor({ initialBody: table('- a') })
    await enterCell()
    await press('Tab')
    expect(cellSource()).toBe('\t- a')
    expect(liveColumn()).toBe(0)

    await cleanupEditor()
    await mountEditor({ initialBody: table('plain') })
    await enterCell()
    await press('Tab')
    expect(liveColumn()).toBe(1)
  })

  it('a page holds Tab off an item and over a range, where a cell moves on', async () => {
    const view = await mountEditor({ initialBody: 'plain\n- a' })
    for (const selection of [{ anchor: 2 }, { anchor: 8, head: 9 }]) {
      await act(async () => view.dispatch({ selection }))
      for (const shiftKey of [false, true]) {
        const tab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey })
        expect(runScopeHandlers(view, tab, 'editor')).toBe(true)
      }
    }
    expect(view.state.doc.toString()).toBe('plain\n- a')
  })

  it('Tab holds the cell at the deepest level, as Shift-Tab holds it at the shallowest', async () => {
    await mountEditor({ initialBody: table('- a') })
    await enterCell()
    for (let i = 0; i < 5; i++) await press('Tab')
    expect(cellSource()).toBe('\t\t\t- a')
    expect(liveColumn()).toBe(0)
  })

  it('Shift-Tab outdents a nested item and holds the cell at level zero', async () => {
    await mountEditor({ initialBody: table('- a') })
    await enterCell()
    await press('Tab')
    expect(cellSource()).toBe('\t- a')
    await press('Tab', true)
    expect(cellSource()).toBe('- a')
    expect(liveColumn()).toBe(0)
    await press('Tab', true)
    expect(cellSource()).toBe('- a')
    expect(liveColumn()).toBe(0)
  })

  it('Backspace strips the whole marker instead of eating one character', async () => {
    await mountEditor({ initialBody: table('- a') })
    await enterCell()
    await press('Enter')
    expect(cellSource()).toBe('- a\n- ')
    await press('Backspace')
    expect(cellSource()).toBe('- a\n')
  })

  it('clears an empty head line and seats the caret on the item it pulls up', async () => {
    for (const key of ['Backspace', 'Delete']) {
      await mountEditor({ initialBody: table('<br>2. a<br>3. b') })
      await enterCell()
      await act(async () => {
        liveCell().view.dispatch({ selection: { anchor: 0 } })
      })
      await press(key)
      expect(cellSource()).toBe('2. a\n3. b')
      expect(liveCell().view.state.selection.main.head).toBe('2. '.length)
      await cleanupEditor()
    }
  })

  it('Shift-Enter breaks the line while a list continues below the caret', async () => {
    await mountEditor({ initialBody: table('- a<br>- b') })
    await enterCell()
    await act(async () => {
      const { view } = liveCell()
      view.dispatch({ selection: { anchor: view.state.doc.line(1).to } })
    })
    await press('Enter', true)
    expect(cellSource()).toBe('- a\n\n- b')
    expect(liveColumn()).toBe(0)
  })

  it('Shift-Enter leaves from the final item even with prose under it', async () => {
    await mountEditor({ initialBody: table('- a<br>- b<br>tail') })
    await enterCell()
    await act(async () => {
      const { view } = liveCell()
      view.dispatch({ selection: { anchor: view.state.doc.line(2).to } })
    })
    await press('Enter', true)
    expect(anyCellLive()).toBe(false)
  })

  it('Shift-Enter leaves a list and writes a line break everywhere else', async () => {
    await mountEditor({ initialBody: table('- a') })
    await enterCell()
    await press('Enter')
    await press('Enter', true)
    expect(anyCellLive()).toBe(false)

    await cleanupEditor()
    await mountEditor({ initialBody: table('plain') })
    await enterCell()
    await press('Enter', true)
    expect(cellSource()).toBe('plain\n')
  })

  it('numbers an ordered run once, not twice', async () => {
    await mountEditor({ initialBody: table('1. a') })
    await enterCell()
    await press('Enter')
    expect(cellSource()).toBe('1. a\n2. ')
    await act(async () => {
      const { view } = liveCell()
      const end = view.state.doc.length
      view.dispatch({ changes: { from: end, insert: 'b' }, selection: { anchor: end + 1 } })
    })
    await press('Enter')
    expect(cellSource()).toBe('1. a\n2. b\n3. ')
  })

  it('writes a checkbox from the shorthand the body accepts', async () => {
    await mountEditor({ initialBody: table('x') })
    await enterCell()
    const { view } = liveCell()
    await act(async () => {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '-[]' } })
    })
    const at = view.state.doc.length
    const claimed = view.state
      .facet(EditorView.inputHandler)
      .some((h) => h(view, at, at, ' ', () => view.state.update()))
    expect(claimed).toBe(true)
    expect(view.state.doc.toString()).toBe('- [ ] ')
  })

  it('draws an empty checkbox at rest, where the trim leaves only its box behind', async () => {
    await mountEditor({ initialBody: table('- [ ] ') })
    const cell = (await tableEl()).querySelector('tbody')!.children[0].children[0]
    expect(cell.querySelector('.md-list-task')).toBeTruthy()
    expect(cell.querySelector('.md-list-checkbox-seat .checkbox')).toBeTruthy()
    expect(cell.textContent).not.toContain('[ ]')
  })

  it('seats the caret past a replaced marker, so entering never reveals its source', async () => {
    // jsdom measures every rect as zero, so the promoting click lands the caret at 0 — which is the state the seat exists for.
    for (const [cellText, seat] of [
      ['- [ ] ', 6],
      ['- a', 2],
    ] as const) {
      await mountEditor({ initialBody: table(cellText) })
      await enterCell(0, 'start')
      const { view } = liveCell()
      expect(view.state.doc.toString()).toBe(cellText)
      expect(view.state.selection.main.head).toBe(seat)
      await cleanupEditor()
    }
  })

  it('numbers a link span from the cell, not from the line it was rendered on', async () => {
    const display = '- see [go](https://example.com)'
    await mountEditor({ initialBody: table(display) })
    const cell = (await tableEl()).querySelector('tbody')!.children[0].children[0]
    const marked = cell.querySelector('[data-link]') as HTMLElement
    const from = Number(marked.dataset.src!.split(',')[0])
    expect(linkTokenAt(tokenize(display), from)).toBeTruthy()
  })

  it('leaves Tab to the cell when a range is selected, rather than eating it', async () => {
    await mountEditor({ initialBody: table('- a') })
    await enterCell()
    await act(async () => {
      liveCell().view.dispatch({ selection: { anchor: 2, head: 3 } })
    })
    await press('Tab')
    expect(liveColumn()).toBe(1)
  })

  it('Enter before the marker writes a break, as the body does, rather than leaving', async () => {
    await mountEditor({ initialBody: table('- a') })
    await enterCell(0, 'start')
    await act(async () => {
      liveCell().view.dispatch({ selection: { anchor: 0 } })
    })
    await press('Enter')
    expect(cellSource()).toBe('\n- a')
    expect(liveColumn()).toBe(0)
  })

  it('reads an empty box as a bullet’s text and a plus as a bullet, at rest exactly as when live', async () => {
    for (const [source, text] of [
      ['- [] x', '[] x'],
      ['+ a', 'a'],
    ]) {
      const live = decorationsFor(source, [], new Set(), -1, scanDoc(source, 'lists'))
      expect(live.some((d) => d.kind === 'widget' && d.spec.type === 'bullet')).toBe(true)
      await mountEditor({ initialBody: table(source) })
      const cell = (await tableEl()).querySelector('tbody')!.children[0].children[0]
      expect(cell.querySelector('.md-list-bullet')?.textContent).toBe('•')
      expect(cell.querySelector('.md-list-text')?.textContent).toBe(text)
      await cleanupEditor()
    }
  })

  it('hangs a grip on a list block in a cell, and on nothing else there', async () => {
    await mountEditor({ initialBody: table('- a<br>- b') })
    await enterCell()
    expect(editorContainer().querySelectorAll(`.mdpm-tbl-cell-editor ${GRIP_LINE}`)).toHaveLength(1)

    await cleanupEditor()
    await mountEditor({ initialBody: table('plain') })
    await enterCell()
    expect(editorContainer().querySelectorAll(`.mdpm-tbl-cell-editor ${GRIP_LINE}`)).toHaveLength(0)
  })

  it('toggles a resting checkbox without promoting the cell to an editor', async () => {
    const view = await mountEditor({ initialBody: table('- [ ] a') })
    const seat = (await tableEl()).querySelector('.md-list-checkbox-seat') as HTMLElement
    const ev = { bubbles: true, cancelable: true, button: 0, clientX: 4, clientY: 4 }
    await act(async () => {
      seat.dispatchEvent(new MouseEvent('mousedown', ev))
      seat.dispatchEvent(new MouseEvent('click', { ...ev, detail: 1 }))
    })
    expect(view.state.doc.toString()).toContain('- [x] a')
    expect(anyCellLive()).toBe(false)
  })

  it('toggles a resting cell’s second box on its own line', async () => {
    const view = await mountEditor({ initialBody: table('- [ ] a<br>- [ ] b') })
    const seats = (await tableEl()).querySelectorAll('.md-list-checkbox-seat')
    const ev = { bubbles: true, cancelable: true, button: 0, clientX: 4, clientY: 4 }
    await act(async () => {
      seats[1].dispatchEvent(new MouseEvent('mousedown', ev))
      seats[1].dispatchEvent(new MouseEvent('click', { ...ev, detail: 1 }))
    })
    expect(view.state.doc.toString()).toBe(table('- [ ] a<br>- [x] b'))
  })

  it('toggles a resting checkbox in its own table after a table is inserted above it', async () => {
    // The paragraph keeps the insert clear of the lower table, so its node is reused under a new index rather than handed to the new table.
    const view = await mountEditor({ initialBody: `intro\n\n${table('- [ ] b')}` })
    await tableEl()
    const upper = table('- [ ] n')
    await act(async () => {
      view.dispatch({ changes: { from: 0, insert: `${upper}\n\n` } })
    })
    const tables = editorContainer().querySelectorAll('table.mdpm-tbl')
    const seat = tables[1].querySelector('.md-list-checkbox-seat') as HTMLElement
    const ev = { bubbles: true, cancelable: true, button: 0, clientX: 4, clientY: 4 }
    await act(async () => {
      seat.dispatchEvent(new MouseEvent('mousedown', ev))
      seat.dispatchEvent(new MouseEvent('click', { ...ev, detail: 1 }))
    })
    expect(view.state.doc.toString()).toBe(`${upper}\n\nintro\n\n${table('- [x] b')}`)
    expect(tables[1].querySelector('.checkbox-checked')).not.toBeNull()
  })

  it('leaves a hand-formatted table as written when a whole table is pasted into its cell', async () => {
    const body = '| A | B |\n|---|---|\n| x | z |'
    const view = await mountEditor({ initialBody: body })
    await enterCell()
    const paste = { changes: { from: 0, insert: table('q') }, userEvent: 'input.paste' }
    await act(async () => {
      liveCell().view.dispatch(paste)
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe(body)
  })

  it('continues a bullet holding an empty box', async () => {
    await mountEditor({ initialBody: table('- [] x') })
    await enterCell()
    await press('Enter')
    expect(cellSource()).toBe('- [] x\n- ')
  })

  it('Shift-Enter writes a break over a selection, even on the final item', async () => {
    await mountEditor({ initialBody: table('- a') })
    await enterCell()
    await act(async () => {
      liveCell().view.dispatch({ selection: { anchor: 2, head: 3 } })
    })
    await press('Enter', true)
    expect(cellSource()).toBe('- \n')
    expect(liveColumn()).toBe(0)
  })

  it('styles a highlight at rest, which the token prefilter used to skip', async () => {
    await mountEditor({ initialBody: table('==hi==') })
    const cell = (await tableEl()).querySelector('tbody')!.children[0].children[0]
    expect(cell.querySelector('.md-highlight')?.textContent).toBe('hi')
  })
})

describe('a block construct spelled in a cell, which reads as its text', () => {
  const kinds = (text: string): string[] =>
    blockStarts(scanDoc(text, 'lists')).map((block) => block.kind)

  it('pairs a bracket and paints a mark between fence-shaped lines', async () => {
    await mountEditor({ initialBody: table('```<br>*a*<br>```') })
    await enterCell()
    expect(liveCell().td.querySelector('.md-italic')?.textContent).toBe('a')
    await act(async () => {
      const { view } = liveCell()
      view.dispatch({ selection: { anchor: view.state.doc.line(2).to } })
    })
    await typeInto(liveCell().view, '(')
    expect(cellSource()).toBe('```\n*a*()\n```')
  })

  it('writes a format row between fence-shaped lines', () => {
    const text = '```\nword\n```'
    const edit = editFor('format:bold', scanDoc(text, 'lists'), 4, 8, {})
    expect(edit?.changes.map((c) => c.insert)).toEqual(['**', '**'])
  })

  it('gives a list between fence-shaped or `$$` lines a block, and so a grip, of its own', async () => {
    expect(kinds('```\n- a\n```')).toEqual(['paragraph', 'list', 'paragraph'])
    expect(kinds('$$\n- a\n$$')).toEqual(['paragraph', 'list', 'paragraph'])
    await mountEditor({ initialBody: table('```<br>- a<br>```') })
    await enterCell()
    expect(editorContainer().querySelectorAll(`.mdpm-tbl-cell-editor ${GRIP_LINE}`)).toHaveLength(1)
  })

  it('draws `$$` lines as text in a live cell, as a resting cell does', () => {
    expect(tokenize('$$\nx\n$$').some((t) => t.kind === 'blockLatex')).toBe(true)
    expect(tokenize('$$\nx\n$$', 'lists').some((t) => t.kind === 'blockLatex')).toBe(false)
  })

  it('draws a `§` run between fence-shaped lines at rest, as a live cell reads it', () => {
    const around = { ordinalOf: () => null, keys: [], texts: ['Setup'] }
    const drawn = renderCellContent('```\n§Setup\n```', () => undefined, { around })
    expect(renderToStaticMarkup(drawn)).toContain('md-section-run')
  })

  it('binds no `[^1]:` note, since a cell has no citation tail', () => {
    const text = '[^1] x\n[^1]: note'
    expect(scanDoc(text).citations.entries).toHaveLength(1)
    expect(scanDoc(text, 'lists').citations.entries).toHaveLength(0)
  })
})
