import { persist } from '../Interface/Notifications/notifications'
import { useMemo } from 'react'
import { ALIAS_ROW_MENU } from '../Actions/aliasRowMenu'
import { gripMenuItems } from '../Actions/gripMenu'
import { pagePickTree } from '../Actions/pickTree'
import { valueOr } from '../Contract/result'
import { tableMenuItems } from '../MarkdownPM/Tables/tableMenu'
import { citationMenuModel } from '../MarkdownPM/Citations/citationMenu'
import { type EditorHost, editorSettingsOf } from '../MarkdownPM/api'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import type { WarmSeam } from '../MarkdownPM/warmSeam'
import { citationsVisible, pageMetaOf, useSession } from '../Session/store'
import { commandsOf, personalizationOf } from '../Session/configSlice'
import { pagesByIdOf } from '../Nexus/treeIndex'
import { knownBody } from '../Session/pageDetailCache'
import { warmSeamOf } from '../Session/warmCache'
import { dialer } from '../Platform/dialer'
import { popMenu } from '../Actions/menuActions'
import { glanceHost } from '../Interface/Glance/glanceAction'
import { PageTile } from '../Tiles/Surfaces/PageTile'
import { WebTile } from '../Tiles/Surfaces/WebTile'
import { windowGeometry } from '../Interface/Windows/useWindowGeometry'
import { openWebLink } from '../Web/openWebLink'
import { type AliasEdit, heldAliases } from '../Connections/aliasMemory'
import { useLatest } from '@pommora/uix/Utilities/stableApi'

interface EditorHostOptions {
  pageId?: string
  connections?: ConnectionsApi
  inert?: boolean
  pageSurface?: boolean
  // A preview shows the page's saved prefs without writing them back.
  preview?: boolean
}

// The outer editor tears a tile's DOM down whenever it leaves the viewport; this holds the nested editor's doc, selection, history and scroll, keyed by the full host chain.
function tileWarmSeam(chain: readonly string[]): WarmSeam {
  return warmSeamOf(
    () => 'embed',
    chain.join('\n'),
    () => knownBody(chain[chain.length - 1]),
  )
}

/** Every member reads the store when called, so one host serves an editor for its whole mount; the editor seats the host once, so the tile reads the ref rather than a mount-time capture. */
function buildEditorHost(
  { pageId, inert, pageSurface, preview }: EditorHostOptions,
  connRef: { readonly current: ConnectionsApi | undefined },
): EditorHost {
  const state = useSession.getState
  const pageOf = (id: string) => {
    const tree = state().tree
    return tree ? pagesByIdOf(tree).get(id) : undefined
  }
  return {
    settings: () => {
      const s = state()
      return editorSettingsOf(personalizationOf(s), s.devicePrefs, commandsOf(s))
    },
    connections: () => connRef.current,
    aliases: {
      list: (id) => heldAliases(pageMetaOf(id)(state())?.aliases ?? [], pageOf(id)?.title ?? ''),
      edit: async (id, edit) => {
        const path = pageOf(id)?.path
        return !!path && (await editAliasesIn(path)(edit))
      },
      subscribe: (cb) =>
        useSession.subscribe((s, prev) => {
          if (s.tree?.config.pageMetadata !== prev.tree?.config.pageMetadata) cb()
        }),
    },
    linkTitles: {
      get: (url) => state().linkTitles[url] ?? null,
      resolve: (url) => state().resolveLinkTitle(url),
    },
    citations: {
      shown: () => citationsVisible(state(), pageId),
      set: (v) => {
        if (pageId) state().setCitationsVisible(pageId, v)
      },
    },
    pageSurface,
    prefs: pageId
      ? {
          load: async () => valueOr(await dialer().ask('editorPrefs:get', pageId), null),
          save: preview
            ? () => {}
            : (...write) =>
                void persist(write[0], dialer().ask('editorPrefs:set', pageId, ...write), true),
        }
      : undefined,
    paneGeometry: windowGeometry,
    clipboard: {
      read: async () => valueOr(await dialer().ask('clipboard:read'), ''),
      write: async (text) => {
        await dialer().ask('clipboard:write', text)
      },
    },
    menus: {
      grip: (ctx) => popMenu(gripMenuItems(ctx)),
      table: (ctx) => popMenu(tableMenuItems(ctx)),
      citation: (ctx) => popMenu(citationMenuModel(ctx)),
      alias: () => popMenu(ALIAS_ROW_MENU),
      format: inert
        ? undefined
        : (req) =>
            dialer()
              .ask('editor:menu', req)
              .then((r) => valueOr(r, null)),
    },
    glance: inert ? undefined : glanceHost,
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
    pickTree: () => {
      const s = state()
      return s.tree ? pagePickTree(s.tree, personalizationOf(s).defaultIcons, (p) => p.title) : []
    },
    openLink: openWebLink,
    pageTitle: () => (pageId && pageOf(pageId)?.title) ?? null,
  }
}

export const renameHeadingIn =
  (path: string) =>
  (heading: string, to: string): void =>
    void useSession.getState().mutate({ op: 'renameHeading', path, heading, to })

export const editAliasesIn =
  (path: string) =>
  async (edit: AliasEdit): Promise<boolean> =>
    (await useSession.getState().mutate({ op: 'editAliases', path, edit })) !== null

/** Re-identified on the store facts the editor renders from, so its effects follow a toggle made anywhere. */
export function useEditorHost({
  pageId,
  connections,
  inert,
  pageSurface,
  preview,
}: EditorHostOptions): EditorHost {
  const connRef = useLatest(connections)
  const shown = useSession((s) => citationsVisible(s, pageId))
  const settings = useSession((s) =>
    editorSettingsOf(personalizationOf(s), s.devicePrefs, commandsOf(s)),
  )
  return useMemo(
    () => buildEditorHost({ pageId, inert, pageSurface, preview }, connRef),
    [pageId, connections, inert, pageSurface, preview, shown, settings],
  )
}
