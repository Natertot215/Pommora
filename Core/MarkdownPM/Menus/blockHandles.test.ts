// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorState } from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import { blockHandles, pointerReveal } from './blockHandles'

const BASE_PT = 15
const views: EditorView[] = []

class TagStub extends WidgetType {
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'codeblock-language'
    el.dataset.revealHost = ''
    return el
  }
}
class IgnoringWidget extends WidgetType {
  toDOM(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'ignoring-widget'
    return el
  }
  ignoreEvent(): boolean {
    return true
  }
}
const blockAt = (pos: number) =>
  EditorView.decorations.of(
    Decoration.set([Decoration.widget({ widget: new IgnoringWidget(), block: true }).range(pos)]),
  )
const tagAt = (pos: number) =>
  EditorView.decorations.of(
    Decoration.set([Decoration.widget({ widget: new TagStub() }).range(pos)]),
  )

function mount(doc: string, extra: ReturnType<typeof tagAt>[] = []): EditorView {
  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [blockHandles(), pointerReveal('page'), ...extra],
    }),
    parent: document.body,
  })
  view.contentDOM.style.fontSize = `${BASE_PT}px`
  views.push(view)
  return view
}
const rect = (left: number, top: number, width = 40, height = 16): DOMRect =>
  ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
  }) as DOMRect
const move = (view: EditorView, x: number, y: number): void => {
  view.contentDOM.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y }),
  )
}
const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()))

afterEach(() => {
  for (const v of views.splice(0)) v.destroy()
})

describe('a block grip', () => {
  it('stays lit through a transaction that leaves its block alone', () => {
    const view = mount('first block\n\nsecond block')
    vi.spyOn(view.contentDOM, 'getBoundingClientRect').mockReturnValue(rect(100, 0, 600, 200))
    vi.spyOn(view, 'posAtCoords').mockReturnValue(2)
    move(view, 50, 10)
    const line = view.contentDOM.querySelector<HTMLElement>('.cm-line')
    expect(line?.dataset.revealHost).toBe('on')
    view.dispatch({ changes: { from: view.state.doc.length, insert: '!' } })
    expect(view.contentDOM.querySelector<HTMLElement>('.cm-line')?.dataset.revealHost).toBe('on')
  })

  it('measures the text column again after the pointer leaves', () => {
    const view = mount('first block')
    const column = vi
      .spyOn(view.contentDOM, 'getBoundingClientRect')
      .mockReturnValue(rect(100, 0, 600, 200))
    vi.spyOn(view, 'posAtCoords').mockReturnValue(2)
    move(view, 50, 10)
    move(view, 60, 10)
    expect(column).toHaveBeenCalledTimes(1)
    view.contentDOM.dispatchEvent(new PointerEvent('pointerleave'))
    move(view, 50, 10)
    expect(column).toHaveBeenCalledTimes(2)
  })
})

describe('a code tag', () => {
  const mountTag = (): { view: EditorView; tag: HTMLElement } => {
    const view = mount('```js\nconst a = 1\n```', [tagAt(0)])
    const tag = view.contentDOM.querySelector<HTMLElement>('.codeblock-language') as HTMLElement
    vi.spyOn(tag, 'getBoundingClientRect').mockReturnValue(rect(500, 100))
    return { view, tag }
  }

  it('reveals its copy mark within 260px to its left at the default font', async () => {
    const { view, tag } = mountTag()
    move(view, 250, 108)
    await frame()
    expect(tag.dataset.revealHost).toBe('on')
    move(view, 230, 108)
    expect(tag.dataset.revealHost).toBe('')
  })

  it('re-tests a still pointer when the page scrolls under it', async () => {
    const { view, tag } = mountTag()
    move(view, 250, 108)
    await frame()
    expect(tag.dataset.revealHost).toBe('on')
    vi.spyOn(tag, 'getBoundingClientRect').mockReturnValue(rect(500, -400))
    view.scrollDOM.dispatchEvent(new Event('scroll'))
    await frame()
    expect(tag.dataset.revealHost).toBe('')
  })

  it('counts a move over a widget the editor ignores', async () => {
    const view = mount('```js\nconst a = 1\n```\n\nafter', [tagAt(0), blockAt(22)])
    const tag = view.contentDOM.querySelector<HTMLElement>('.codeblock-language') as HTMLElement
    vi.spyOn(tag, 'getBoundingClientRect').mockReturnValue(rect(500, 100))
    const widget = view.contentDOM.querySelector('.ignoring-widget') as HTMLElement
    widget.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 250, clientY: 108 }),
    )
    await frame()
    expect(tag.dataset.revealHost).toBe('on')
  })

  it('reaches twice as far at twice the font', async () => {
    const { view, tag } = mountTag()
    view.contentDOM.style.fontSize = `${BASE_PT * 2}px`
    move(view, 500 - 500, 108)
    await frame()
    expect(tag.dataset.revealHost).toBe('on')
    move(view, 500 - 540, 108)
    expect(tag.dataset.revealHost).toBe('')
  })
})
