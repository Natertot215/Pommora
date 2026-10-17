// jsdom mounting for MarkdownPM's component suites: the host is an in-memory stand-in a suite overrides piecewise, so nothing a test types can reach a store, a bridge, or a real file. A claimed embed line mounts a real tile whose PageTile fetches through the bridge, so that one read channel is stubbed here. Every rect measures zero — geometry truth stays with the CDP passes.
import { act, createElement, useReducer, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import type { PickItem } from '../Actions/menuModel'
import { MarkdownEditor } from '../MarkdownPM/MarkdownEditor'
import type { MarkdownTable } from '../MarkdownPM/Tables/MarkdownTable'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import type { ConnPage } from '../Connections/pageIndex'
import { DEFAULT_COMMANDS } from '../Actions/commands'
import { type AliasEdit, applyAliasEdit, heldAliases } from '../Connections/aliasMemory'
import { type EditorHost, type EditorSettings, editorSettingsOf } from '../MarkdownPM/api'
import type { EditorPrefs } from '../Contract/bridge'
import { normalizeLinkUrl } from '../Paths/urlPath'
import { stubDialer } from '../vitest.setup'

type EditorProps = Parameters<typeof MarkdownEditor>[0]

interface HarnessHost {
  settings?: Partial<EditorSettings>
  aliases?: Record<string, string[]>
  linkTitles?: Record<string, string>
  clipboard?: Partial<EditorHost['clipboard']>
  menus?: Partial<EditorHost['menus']>
  glance?: EditorHost['glance'] | false
  pickTree?: PickItem<string>[]
  openLink?: EditorHost['openLink']
  page?: ConnPage
  pageSurface?: boolean
  prefs?: EditorHost['prefs']
}

export const NO_PREFS: EditorPrefs = {
  folds: [],
  embedHeights: {},
  embedZooms: {},
  headingCols: [],
}

export const prefsOf = (
  seed: Partial<EditorPrefs> = {},
  save: NonNullable<EditorHost['prefs']>['save'] = () => {},
): EditorHost['prefs'] => ({ load: async () => ({ ...NO_PREFS, ...seed }), save })

type HarnessProps = Partial<Omit<EditorProps, 'host'>> & {
  initialBody: string
  connections?: ConnectionsApi
  citationsShown?: boolean
  host?: HarnessHost
}

interface HarnessState {
  settings: EditorSettings
  connections: ConnectionsApi | undefined
  aliases: Record<string, string[]>
  linkTitles: Record<string, string>
  titleFetches: Map<
    string,
    { promise: Promise<string | null>; settle: (title: string | null) => void }
  >
  citationsShown: boolean
  host: EditorHost
}

const NO_GLANCE = {
  arm: (): void => {},
  cancel: (): void => {},
  close: (): void => {},
  contains: (el: Element): boolean => el.closest('[data-glance]') !== null,
}

function harnessHost(spec: HarnessHost, rerender: () => void = () => {}): HarnessState {
  const state = {
    settings: { ...editorSettingsOf({}, {}, DEFAULT_COMMANDS), ...spec.settings },
    connections: undefined,
    aliases: { ...spec.aliases },
    linkTitles: { ...spec.linkTitles },
    titleFetches: new Map(),
    citationsShown: false,
  } as HarnessState
  const watchers = new Set<() => void>()
  const worn = (id: string): string[] => state.aliases[id] ?? []
  const wear = (id: string, edit: AliasEdit): void => {
    state.aliases[id] = applyAliasEdit(worn(id), edit, spec.page?.title ?? '')
    for (const cb of watchers) cb()
  }
  state.host = {
    settings: () => state.settings,
    connections: () => state.connections,
    aliases: {
      list: (id) => heldAliases(worn(id), spec.page?.title ?? ''),
      edit: async (id, edit) => {
        wear(id, edit)
        return true
      },
      subscribe: (cb) => {
        watchers.add(cb)
        return () => watchers.delete(cb)
      },
    },
    linkTitles: {
      get: (url) => state.linkTitles[normalizeLinkUrl(url)] ?? null,
      resolve: (url) => {
        const held = state.linkTitles[url]
        if (held) return Promise.resolve(held)
        const pending = state.titleFetches.get(url)
        if (pending) return pending.promise
        let settle!: (title: string | null) => void
        const promise = new Promise<string | null>((r) => {
          settle = r
        })
        state.titleFetches.set(url, { promise, settle })
        return promise
      },
    },
    citations: {
      shown: () => state.citationsShown,
      set: (v) => {
        state.citationsShown = v
        rerender()
      },
    },
    clipboard: { read: async () => '', write: async () => {}, ...spec.clipboard },
    menus: {
      grip: async () => null,
      table: async () => null,
      citation: async () => null,
      alias: async () => null,
      ...spec.menus,
    },
    glance: spec.glance === false ? undefined : (spec.glance ?? NO_GLANCE),
    renderTile: () => null,
    pickTree: () => spec.pickTree ?? [],
    location: () => [],
    openLink: spec.openLink ?? (() => {}),
    page: () => spec.page ?? null,
    pageSurface: spec.pageSurface,
    prefs: spec.prefs,
    paneGeometry: () => ({ onSizeChange: () => {} }),
  }
  return state
}

export const testHost = (spec: HarnessHost = {}): EditorHost => harnessHost(spec).host

/** Every `MarkdownTable` prop but its host and model, as a table on a page with no footnotes or headings that writes nowhere. */
export const tableStubs: Omit<Parameters<typeof MarkdownTable>[0], 'host' | 'model'> = {
  around: { ordinalOf: () => null, keys: [], texts: [] },
  headingColumn: false,
  onCellCommit: () => {},
  cellAt: () => null,
  onSettled: () => {},
  onExit: () => {},
  onReorder: () => false,
  onResize: () => false,
  onAppend: () => {},
  onClearCells: () => {},
  onFill: () => {},
  onMenu: () => {},
  onTableDrag: () => {},
  onUndo: () => {},
  onRedo: () => {},
  readOnly: () => false,
  linkStyle: 'page-heading',
}

let container: HTMLDivElement | null = null
let root: Root | null = null
let mounted: HarnessState | null = null
let seeded: HarnessHost = {}

export function seedHost(spec: HarnessHost): void {
  seeded = spec
}

const layered = (base: HarnessHost, over: HarnessHost): HarnessHost => ({
  ...base,
  ...over,
  settings: { ...base.settings, ...over.settings },
  clipboard: { ...base.clipboard, ...over.clipboard },
  menus: { ...base.menus, ...over.menus },
})

/** Reads only — no write channel exists here, so nothing a test types can reach a real file. */
export function stubEditorBridge(extra: Record<string, unknown> = {}): void {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'page:open': async () => ({
      ok: true,
      value: { id: 'x', title: 'Alpha', path: 'Notes/Alpha.md', frontmatter: {}, body: 'inner' },
    }),
    ...extra,
  })
}

function Harnessed({
  citationsShown,
  connections,
  host: spec,
  ...props
}: HarnessProps): React.JSX.Element {
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [state] = useState(() => harnessHost(layered(seeded, spec ?? {}), rerender))
  const seen = useRef<boolean | undefined>(undefined)
  if (citationsShown !== seen.current) {
    seen.current = citationsShown
    if (citationsShown !== undefined) state.citationsShown = citationsShown
  }
  state.connections = connections
  mounted = state
  return createElement(MarkdownEditor, {
    onChange: () => {},
    ...props,
    // A fresh object per render, the way a store-backed host re-identifies on its facts.
    host: { ...state.host },
  })
}

/** `parent` seats the editor where a surface would, such as inside a window body. */
export async function mountEditor(
  props: HarnessProps,
  parent: HTMLElement = document.body,
): Promise<EditorView> {
  container = document.createElement('div')
  parent.appendChild(container)
  root = createRoot(container)
  await rerenderEditor(props)
  const dom = container.querySelector('.cm-editor')
  const view = dom && EditorView.findFromDOM(dom as HTMLElement)
  if (!view) throw new Error('no EditorView')
  return view
}

export function harnessState(): HarnessState {
  if (!mounted) throw new Error('no mounted editor')
  return mounted
}

export async function settleTitle(url: string, title: string | null): Promise<void> {
  const s = harnessState()
  if (title !== null) s.linkTitles[url] = title
  await act(async () => {
    s.titleFetches.get(url)?.settle(title)
    s.titleFetches.delete(url)
  })
}

export async function rerenderEditor(props: HarnessProps): Promise<void> {
  await act(async () => {
    root?.render(createElement(Harnessed, props))
  })
}

export function editorContainer(): HTMLDivElement {
  if (!container) throw new Error('no mounted editor')
  return container
}

export async function cleanupEditor(): Promise<void> {
  const r = root
  root = null
  mounted = null
  if (r) await act(async () => r.unmount())
  container?.remove()
  container = null
}

export async function typeInto(view: EditorView, text: string): Promise<void> {
  for (const ch of text)
    await act(async () => {
      const { from, to } = view.state.selection.main
      const insert = () =>
        view.state.update({
          changes: { from, to, insert: ch },
          selection: { anchor: from + ch.length },
          userEvent: 'input.type',
        })
      if (!view.state.facet(EditorView.inputHandler).some((h) => h(view, from, to, ch, insert)))
        view.dispatch(insert())
    })
}
