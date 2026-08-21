// jsdom mounting for MarkdownPM's component suites — one React root per test, torn down through
// `cleanupEditor`. A claimed embed line mounts a real tile whose PageEmbed fetches through the
// bridge, so the read channel is stubbed here; a suite driving its own channels passes them in.
// Geometry truth stays with the CDP passes, never jsdom (every rect measures zero).
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { MarkdownEditor } from '@renderer/MarkdownPM'
import { useSession } from '@renderer/store'

type EditorProps = Parameters<typeof MarkdownEditor>[0]

/** The page every mounted editor draws. The footnotes section's disclosure is a page's own state, so
 *  a suite asking for a shown section writes that page's row rather than passing the editor a value
 *  the store would disagree with. */
export const HARNESS_PAGE_ID = 'harness-page'

/** Props a suite states in its own terms, resolved into the state the editor actually reads. */
type HarnessProps = Partial<EditorProps> & { initialBody: string; citationsShown?: boolean }

function seed({ citationsShown, ...props }: HarnessProps): EditorProps {
  // Written every mount, not only when asked for: the row outlives a test otherwise, and the next
  // suite would mount on whatever the last one left behind.
  useSession.setState({
    citationsShown: citationsShown === undefined ? {} : { [HARNESS_PAGE_ID]: citationsShown },
    // The nexus-wide default is what an unset row falls back to, so it is reset alongside the row —
    // otherwise a suite that flips the setting decides what the next one mounts on.
    personalization: { ...useSession.getState().personalization, citationsShown: undefined },
  })
  return { onChange: () => {}, pageId: HARNESS_PAGE_ID, ...props }
}

let container: HTMLDivElement | null = null
let root: Root | null = null

/** The bridge a mounted tile reads, plus whatever channels the suite itself drives. Reads only —
 *  no write channel exists here, so nothing a test types can reach a real file. */
export function stubEditorBridge(extra: Record<string, unknown> = {}): void {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  ;(window as unknown as { nexus: unknown }).nexus = {
    // Every editor surface takes the native-menu seam, and it is read at mount.
    setEditorFormatState: () => {},
    // The footnotes section's disclosure is a per-page row the editor writes through the store.
    citations: { get: async () => ({}), set: () => {} },
    onMenuAction: () => () => {},
    openPage: async () => ({
      ok: true,
      value: { id: 'x', title: 'Alpha', path: 'Notes/Alpha.md', frontmatter: {}, body: 'inner' },
    }),
    ...extra,
  }
}

export async function mountEditor(props: HarnessProps): Promise<EditorView> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const el = createElement(MarkdownEditor, seed(props))
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
export async function rerenderEditor(props: HarnessProps): Promise<void> {
  await act(async () => {
    root?.render(createElement(MarkdownEditor, seed(props)))
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
