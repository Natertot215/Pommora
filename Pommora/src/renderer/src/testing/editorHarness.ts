// jsdom mounting for MarkdownPM's component suites — one React root per test, torn down through
// `cleanupEditor`. A claimed embed line mounts a real tile whose PageEmbed fetches through the
// bridge, so the read channel is stubbed here; a suite driving its own channels passes them in.
// Geometry truth stays with the CDP passes, never jsdom (every rect measures zero).
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { MarkdownEditor } from '@renderer/MarkdownPM'

type EditorProps = Parameters<typeof MarkdownEditor>[0]

let container: HTMLDivElement | null = null
let root: Root | null = null

/** The bridge a mounted tile reads, plus whatever channels the suite itself drives. Reads only —
 *  no write channel exists here, so nothing a test types can reach a real file. */
export function stubEditorBridge(extra: Record<string, unknown> = {}): void {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  ;(window as unknown as { nexus: unknown }).nexus = {
    // Every editor surface takes the native-menu seam, and it is read at mount.
    setEditorFormatState: () => {},
    onMenuAction: () => () => {},
    openPage: async () => ({
      ok: true,
      value: { id: 'x', title: 'Alpha', path: 'Notes/Alpha.md', frontmatter: {}, body: 'inner' },
    }),
    ...extra,
  }
}

export async function mountEditor(
  props: Partial<EditorProps> & { initialBody: string },
): Promise<EditorView> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const el = createElement(MarkdownEditor, { onChange: () => {}, ...props })
  await act(async () => {
    root?.render(el)
  })
  const dom = container.querySelector('.cm-editor')
  const view = dom && EditorView.findFromDOM(dom as HTMLElement)
  if (!view) throw new Error('no EditorView')
  return view
}

/** Re-render the mounted editor with new props, for the behavior a prop CHANGE carries — a value
 *  that arrives after mount reads differently from the same value passed at mount. */
export async function rerenderEditor(
  props: Partial<EditorProps> & { initialBody: string },
): Promise<void> {
  await act(async () => {
    root?.render(createElement(MarkdownEditor, { onChange: () => {}, ...props }))
  })
}

/** The mounted editor's host element — for assertions that read the rendered DOM directly. */
export function editorContainer(): HTMLDivElement {
  if (!container) throw new Error('no mounted editor')
  return container
}

export async function cleanupEditor(): Promise<void> {
  const r = root
  root = null
  if (r) await act(async () => r.unmount())
  container?.remove()
  container = null
}
