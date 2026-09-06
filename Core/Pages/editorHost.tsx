import { useMemo } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import { type PickNode, gripMenuItems } from '@pommora/core/Actions/gripMenu'
import { tableMenuItems } from '@pommora/core/Actions/tableMenu'
import { citationMenuModel } from '@pommora/core/Actions/citationMenu'
import type { EditorHost, EditorMenuApi } from '../MarkdownPM/api'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import type { WarmSeam } from '../MarkdownPM/warmSeam'
import { citationsVisible, useSession } from '../Session/store'
import { readPageDetail } from '../Session/pageDetailCache'
import { fenceWarm } from '../Navigation/warmTabs'
import { host } from '../Platform/dialer'
import { popRowMenu } from '../Platform/nativeMenus'
import { cancelGlance, closeGlance, insideGlance } from '../Interface/Glance/glanceAction'
import { glanceLink } from '../Interface/Glance/glanceLink'
import { PageTile } from '../Tiles/Surfaces/PageTile'
import { WebTile } from '../Tiles/Surfaces/WebTile'

export interface EditorHostOptions {
  pageId?: string
  connections?: ConnectionsApi
  /** A surface that only shows a document neither glances nor drives the native format menu. */
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
  const key = chain.join('\n')
  const path = chain[chain.length - 1]
  return {
    restore: () => {
      // A page edited elsewhere since the capture invalidates the whole entry — selection and history are positions into a doc that no longer exists.
      const kept = fenceWarm(tileCache.get(key), readPageDetail(path)?.body)
      if (!kept) tileCache.delete(key)
      return kept
    },
    capture: (state) => tileCache.set(key, state),
  }
}

const pickNode = (c: CollectionNode | SetNode): PickNode => ({
  label: c.title,
  children: [
    ...(c.sets ?? []).map(pickNode),
    ...c.pages.map((p) => ({ label: p.title, title: p.title })),
  ],
})

/** Every member reads the store when called, so one host serves an editor for its whole mount. */
export function buildEditorHost({ pageId, connections, inert }: EditorHostOptions): EditorHost {
  const state = useSession.getState
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
        pasteInverse: commands['paste-inverse'],
      }
    },
    aliases: {
      list: (id) => state().pageAliases[id] ?? [],
      remember: (id, alias) => state().rememberAlias(id, alias),
      forget: (id, alias) => state().forgetAlias(id, alias),
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
      read: () => host().ask('clipboard:read'),
      write: (text) => host().ask('clipboard:write', text),
    },
    menus: {
      grip: (ctx) => popRowMenu(gripMenuItems(ctx)),
      table: (ctx) => popRowMenu(tableMenuItems(ctx)),
      citation: (ctx) => popRowMenu(citationMenuModel(ctx)),
      format: inert ? undefined : nativeEditorMenu,
      gripHot: (hot) => host().tell('editor:grip-hot', hot),
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
          connections={connections}
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
  }
}

/** Re-identified on the store facts the editor renders from, so its effects follow a toggle made anywhere. */
export function useEditorHost({ pageId, connections, inert }: EditorHostOptions): EditorHost {
  const shown = useSession((s) => citationsVisible(s, pageId))
  const cbLineCount = useSession((s) => s.personalization.codeblockLineCount)
  const aliases = useSession((s) => s.pageAliases)
  return useMemo(
    () => buildEditorHost({ pageId, connections, inert }),
    [pageId, connections, inert, shown, cbLineCount, aliases],
  )
}
