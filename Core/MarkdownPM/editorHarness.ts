// jsdom mounting for MarkdownPM's component suites: the host is an in-memory stand-in a suite overrides piecewise, so nothing a test types can reach a store, a bridge, or a real file. A claimed embed line mounts a real tile whose PageTile fetches through the bridge, so that one read channel is stubbed here. Every rect measures zero — geometry truth stays with the CDP passes.
import { act, createElement, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import type { PickNode } from '@pommora/core/Actions/gripMenu'
import { MarkdownEditor } from './MarkdownEditor'
import { DEFAULT_COMMANDS } from '@pommora/core/Actions/commands'
import type { EditorHost, EditorSettings } from './api'
import { stubDialer } from '../vitest.setup'

type EditorProps = Parameters<typeof MarkdownEditor>[0]

interface HarnessHost {
  settings?: Partial<EditorSettings>
  aliases?: Record<string, string[]>
  linkTitles?: Record<string, string>
  clipboard?: Partial<EditorHost['clipboard']>
  menus?: Partial<EditorHost['menus']>
  glance?: EditorHost['glance'] | false
  pickTree?: PickNode[]
  openLink?: EditorHost['openLink']
}

type HarnessProps = Partial<Omit<EditorProps, 'host'>> & {
  initialBody: string
  citationsShown?: boolean
  host?: HarnessHost
}

interface HarnessState {
  settings: EditorSettings
  aliases: Record<string, string[]>
  linkTitles: Record<string, string>
  titleWatchers: Set<() => void>
  citationsShown: boolean
  host: EditorHost
}

const NO_GLANCE = {
  arm: (): void => {},
  cancel: (): void => {},
  close: (): void => {},
  contains: (el: Element): boolean => el.closest('[data-glance]') !== null,
}

function harnessHost(
  spec: HarnessHost,
  setShown: (v: boolean) => void,
  bump: () => void,
): HarnessState {
  const state = {
    settings: { commands: DEFAULT_COMMANDS, ...spec.settings },
    aliases: { ...spec.aliases },
    linkTitles: { ...spec.linkTitles },
    titleWatchers: new Set<() => void>(),
    citationsShown: false,
  } as HarnessState
  state.host = {
    settings: () => state.settings,
    aliases: {
      list: (id) => state.aliases[id] ?? [],
      remember: (id, alias) => {
        state.aliases[id] = [alias, ...(state.aliases[id] ?? []).filter((a) => a !== alias)]
        bump()
      },
      forget: (id, alias) => {
        state.aliases[id] = (state.aliases[id] ?? []).filter((a) => a !== alias)
        bump()
      },
    },
    linkTitles: {
      get: (url) => state.linkTitles[url] ?? null,
      resolve: () => {},
      subscribe: (cb) => {
        state.titleWatchers.add(cb)
        return () => state.titleWatchers.delete(cb)
      },
    },
    citations: {
      shown: () => state.citationsShown,
      set: (v) => {
        state.citationsShown = v
        setShown(v)
      },
    },
    clipboard: { read: async () => '', write: async () => {}, ...spec.clipboard },
    menus: {
      grip: async () => null,
      table: async () => null,
      citation: async () => null,
      ...spec.menus,
    },
    glance: spec.glance === false ? undefined : (spec.glance ?? NO_GLANCE),
    renderTile: () => null,
    pickTree: () => spec.pickTree ?? [],
    openLink: spec.openLink ?? (() => {}),
  }
  return state
}

export const testHost = (spec: HarnessHost = {}): EditorHost =>
  harnessHost(
    spec,
    () => {},
    () => {},
  ).host

let container: HTMLDivElement | null = null
let root: Root | null = null
let mounted: HarnessState | null = null
let stateSlot: ((s: HarnessState) => void) | null = null
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

function Harnessed({ citationsShown, host: spec, ...props }: HarnessProps): React.JSX.Element {
  const [shown, setShown] = useState(citationsShown ?? false)
  const seen = useRef(citationsShown)
  if (citationsShown !== seen.current) {
    seen.current = citationsShown
    if (citationsShown !== undefined) setShown(citationsShown)
  }
  const [, setTick] = useState(0)
  const held = useRef<HarnessState | null>(null)
  if (!held.current) {
    held.current = harnessHost(layered(seeded, spec ?? {}), setShown, () => setTick((t) => t + 1))
    stateSlot?.(held.current)
  }
  held.current.citationsShown = shown
  return createElement(MarkdownEditor, {
    onChange: () => {},
    ...props,
    // A fresh object per render, the way a store-backed host re-identifies on its facts.
    host: { ...held.current.host },
  })
}

export async function mountEditor(props: HarnessProps): Promise<EditorView> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  stateSlot = (s) => {
    mounted = s
  }
  await act(async () => {
    root?.render(createElement(Harnessed, props))
  })
  const dom = container.querySelector('.cm-editor')
  const view = dom && EditorView.findFromDOM(dom as HTMLElement)
  if (!view) throw new Error('no EditorView')
  return view
}

export function harnessState(): HarnessState {
  if (!mounted) throw new Error('no mounted editor')
  return mounted
}

export async function settleTitle(url: string, title: string): Promise<void> {
  const s = harnessState()
  s.linkTitles[url] = title
  await act(async () => {
    for (const cb of s.titleWatchers) cb()
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
