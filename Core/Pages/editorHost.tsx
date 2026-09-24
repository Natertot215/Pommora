import { useMemo, useRef } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import { type PickNode, gripMenuItems } from '@pommora/core/Actions/gripMenu'
import { valueOr } from '@pommora/core/Contract/result'
import { tableMenuItems } from '@pommora/core/MarkdownPM/Tables/tableMenu'
import { citationMenuModel } from '@pommora/core/MarkdownPM/Citations/citationMenu'
import type { EditorHost, EditorMenuApi } from '../MarkdownPM/api'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import { mapWarmSeam, type WarmSeam } from '../MarkdownPM/warmSeam'
import { citationsVisible, pageMetaOf, useSession } from '../Session/store'
import { pagesByIdOf } from '../Nexus/treeIndex'
import { fetchPageDetail, readPageDetail } from '../Session/pageDetailCache'
import { host } from '../Platform/dialer'
import { popMenu } from '../Actions/menuActions'
import { cancelGlance, closeGlance, insideGlance } from '../Interface/Glance/glanceAction'
import { glanceLink } from '../Interface/Glance/glanceLink'
import { PageTile } from '../Tiles/Surfaces/PageTile'
import { WebTile } from '../Tiles/Surfaces/WebTile'
import { openWebLink } from '../Web/openWebLink'
import { forgetAlias, rememberAlias } from '../Connections/aliasMemory'

interface EditorHostOptions {
  pageId?: string
  connections?: ConnectionsApi
  inert?: boolean
}

/** The bridge's listener is per-caller, so every mounted editor hears every action; both directions answer to `subject`. */
const nativeEditorMenu: EditorMenuApi = {
  pushState: (s) => host().tell('editor:format-state', s),
  onAction: (cb) => host().on('menu:action', cb),
}

// The outer editor tears a tile's DOM down whenever it leaves the viewport; this holds the nested editor's doc, selection, history and scroll, keyed by the full host chain.
const tileCache = new Map<string, { editorState: unknown; scrollTop: number }>()

export function tileWarmSeam(chain: readonly string[]): WarmSeam {
  const path = chain[chain.length - 1]
  return mapWarmSeam(tileCache, chain.join('\n'), () => readPageDetail(path)?.body)
}

const pickNode = (c: CollectionNode | SetNode): PickNode => ({
  label: c.title,
  children: [
    ...(c.sets ?? []).map(pickNode),
    ...c.pages.map((p) => ({ label: p.title, title: p.title })),
  ],
})

/** Every member reads the store when called, so one host serves an editor for its whole mount; the editor seats the host once, so the tile reads the ref rather than a mount-time capture. */
function buildEditorHost(
  { pageId, inert }: EditorHostOptions,
  connRef: { readonly current: ConnectionsApi | undefined },
): EditorHost {
  const state = useSession.getState
  const worn = (id: string): string[] => pageMetaOf(id)(state())?.aliases ?? []
  const wear = (id: string, next: string[] | null): void => {
    const tree = state().tree
    const path = tree && pagesByIdOf(tree).get(id)?.path
    if (next && path)
      void host().ask('mutate', {
        op: 'setPageMeta',
        path,
        patch: { aliases: next.length ? next : null },
      })
  }
  return {
    settings: () => {
      const { personalization: p, commands } = state()
      return {
        codeblockLineCount: p.codeblockLineCount,
        removeTitleOnLinkChange: p.removeTitleOnLinkChange,
        aliasPickerOnCommit: p.aliasPickerOnCommit,
        jumpToCitation: p.jumpToCitation,
        pasteLinkIntoText: p.pasteLinkIntoText,
        defaultLinkFormat: p.defaultLinkFormat,
        headingLinkStyle: p.headingLinkStyle,
        inPageHeadingResolution: p.inPageHeadingResolution,
        transformDashes: p.transformDashes,
        transformArrows: p.transformArrows,
        transformEquations: p.transformEquations,
        transformEllipses: p.transformEllipses,
        transformCallouts: p.transformCallouts,
        transformSections: p.transformSections,
        transformBullets: p.transformBullets,
        pairBrackets: p.pairBrackets,
        pairMarkers: p.pairMarkers,
        pairQuotes: p.pairQuotes,
        wrapSelections: p.wrapSelections,
        deletePairsTogether: p.deletePairsTogether,
        exitPairsOnEnter: p.exitPairsOnEnter,
        commands,
      }
    },
    aliases: {
      list: worn,
      remember: (id, alias) => wear(id, rememberAlias(worn(id), alias)),
      forget: (id, alias) => wear(id, forgetAlias(worn(id), alias)),
      subscribe: (cb) =>
        useSession.subscribe((s, prev) => {
          if (s.tree?.pageMetadata !== prev.tree?.pageMetadata) cb()
        }),
    },
    linkTitles: {
      get: (url) => state().linkTitles[url] ?? null,
      resolve: (url) => state().resolveLinkTitle(url),
      subscribe: (cb) => useSession.subscribe(cb),
    },
    citations: {
      shown: () => citationsVisible(state(), pageId),
      set: (v) => {
        if (pageId) state().setCitationsVisible(pageId, v)
      },
    },
    clipboard: {
      read: async () => valueOr(await host().ask('clipboard:read'), ''),
      write: async (text) => {
        await host().ask('clipboard:write', text)
      },
    },
    menus: {
      grip: (ctx) => popMenu(gripMenuItems(ctx)),
      table: (ctx) => popMenu(tableMenuItems(ctx)),
      citation: (ctx) => popMenu(citationMenuModel(ctx)),
      format: inert ? undefined : nativeEditorMenu,
    },
    glance: inert
      ? undefined
      : { arm: glanceLink, cancel: cancelGlance, close: closeGlance, contains: insideGlance },
    renderTile: (tile) =>
      tile.kind === 'page' ? (
        <PageTile
          path={tile.path}
          editing={tile.editing}
          onBeginEdit={tile.onBeginEdit}
          connections={connRef.current}
          locked={tile.locked}
          ancestors={tile.ancestors}
          chrome="page"
          warm={tileWarmSeam([...tile.ancestors, tile.path])}
        />
      ) : (
        <WebTile
          url={tile.url}
          label={tile.label}
          visible={tile.visible}
          tabInactive={tile.tabInactive}
          zoom={tile.zoom}
          refocusHost={tile.refocusHost}
        />
      ),
    pickTree: () => state().tree?.collections.map(pickNode) ?? [],
    openLink: openWebLink,
    warmBody: (page) => {
      const slot = state().pages[page.id]
      return slot?.status === 'ready' ? slot.body : null
    },
    fetchBody: (page) =>
      fetchPageDetail(page.path)
        .then((d) => d?.body ?? null)
        .catch(() => null),
    pageTitle: () => {
      const tree = state().tree
      return (pageId && tree && pagesByIdOf(tree).get(pageId)?.title) ?? null
    },
  }
}

/** Re-identified on the store facts the editor renders from, so its effects follow a toggle made anywhere. */
export function useEditorHost({ pageId, connections, inert }: EditorHostOptions): EditorHost {
  const connRef = useRef(connections)
  connRef.current = connections
  const shown = useSession((s) => citationsVisible(s, pageId))
  const cbLineCount = useSession((s) => s.personalization.codeblockLineCount)
  const headingLinkStyle = useSession((s) => s.personalization.headingLinkStyle)
  const inPageHeadingResolution = useSession((s) => s.personalization.inPageHeadingResolution)
  const commands = useSession((s) => s.commands)
  return useMemo(
    () => buildEditorHost({ pageId, inert }, connRef),
    [
      pageId,
      connections,
      inert,
      shown,
      cbLineCount,
      headingLinkStyle,
      inPageHeadingResolution,
      commands,
    ],
  )
}
