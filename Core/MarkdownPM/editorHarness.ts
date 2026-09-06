// jsdom mounting for MarkdownPM's component suites. A claimed embed line mounts a real tile whose PageTile fetches
// through the bridge, so the read channel is stubbed here. Geometry truth stays with the CDP passes (every rect measures zero).
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { MarkdownEditor } from './MarkdownEditor'
import { useSession } from '../Session/store'
import { stubDialer } from '../vitest.setup'

type EditorProps = Parameters<typeof MarkdownEditor>[0]

/** A suite asking for a shown section writes that page's row rather than passing a value the store would disagree with. */
export const HARNESS_PAGE_ID = 'harness-page'

type HarnessProps = Partial<EditorProps> & { initialBody: string; citationsShown?: boolean }

function seed({ citationsShown, ...props }: HarnessProps): EditorProps {
  // Written every mount: the row outlives a test otherwise, and the next suite would mount on what the last left behind.
  useSession.setState({
    citationsShown: citationsShown === undefined ? {} : { [HARNESS_PAGE_ID]: citationsShown },
    personalization: { ...useSession.getState().personalization, citationsShown: undefined },
  })
  return { onChange: () => {}, pageId: HARNESS_PAGE_ID, ...props }
}

let container: HTMLDivElement | null = null
let root: Root | null = null

/** Reads only — no write channel exists here, so nothing a test types can reach a real file. */
export function stubEditorBridge(extra: Record<string, unknown> = {}): void {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'editor:format-state': () => {},
    'citations:get': async () => ({}),
    'citations:set': () => {},
    'menu:action': () => () => {},
    'page:open': async () => ({
      ok: true,
      value: { id: 'x', title: 'Alpha', path: 'Notes/Alpha.md', frontmatter: {}, body: 'inner' },
    }),
    ...extra,
  })
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

/** For the behavior a prop CHANGE carries — a value arriving after mount reads differently from the same value at mount. */
export async function rerenderEditor(props: HarnessProps): Promise<void> {
  await act(async () => {
    root?.render(createElement(MarkdownEditor, seed(props)))
  })
}

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
