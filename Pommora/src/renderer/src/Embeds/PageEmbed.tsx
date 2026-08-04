import { useEffect, useRef, useState } from 'react'
import { MarkdownEditor, type WarmSeam } from '@renderer/MarkdownPM'
import type { ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { flushPageSave, schedulePageSave } from '@renderer/Detail/pageFlush'
import { useSession } from '../store'
import { useBannerMenu } from '../Detail/Banner/useBannerMenu'
import { NavCrumbs } from '../Navigation/NavList'
import { resolveWith } from '../Navigation/navResolve'
import { resolveIndexOf } from '../treeIndex'
import { assetUrl } from '../assetUrl'
import './embeds.css'
import { EMBED_SCALE, EMBED_ZOOM } from './embedScale'

// Entering edit reconfigures the SAME CM6 view's editability — no remount, no jitter. Header
// chrome (banner + title) is parked; returns with the ⋮ toggle pass.

const titleOf = (path: string): string => (path.split('/').pop() ?? path).replace(/\.md$/i, '')

export function PageEmbed({
  path,
  editing,
  onBeginEdit,
  connections,
  locked = false,
  onBody,
  warm,
  ancestors,
  chrome = 'none',
}: {
  path: string
  editing: boolean
  onBeginEdit: () => void
  connections?: ConnectionsApi
  locked?: boolean
  /** The floating preview drives its own Subfield stats from a LOCAL buffer via this — never the
   *  shared `liveBody` slot (single-owner; a second writer would evict the main pane's count). */
  onBody?: (body: string) => void
  /** A restored entry mounts synchronously (its doc IS the body — no fetch/blank frame); capture
   *  fires at unmount. Block tiles mount cold (no warm prop passed). */
  warm?: WarmSeam
  /** The embed-host chain above this page, cycle guard + nesting depth for the tiles inside it —
   *  this embed appends its own path before handing down. Absent = a top-level embed host. */
  ancestors?: readonly string[]
  /** 'page' renders the page-follows header rule: the banner with its static title when the page
   *  has a cover, the centered hover breadcrumb otherwise. Hosts that carry the location
   *  themselves (the preview's title, a SurfacePM tile's handle menu) stay 'none'. */
  chrome?: 'none' | 'page'
}): React.JSX.Element {
  // Bound to the path it was loaded FOR — an un-keyed host re-aiming `path` blanks and refetches
  // exactly as a fresh mount would. A failed open is NOT an empty page: body stays null and the
  // render shows the inert fallback, never an editable blank that would overwrite the real file
  // on the first keystroke.
  const [loaded, setLoaded] = useState<{
    path: string
    body: string | null
    id?: string
    title?: string
    cover?: string
  } | null>(() => {
    const doc = (warm?.restore()?.editorState as { doc?: unknown } | undefined)?.doc
    return typeof doc === 'string' ? { path, body: doc } : null
  })
  const entry = loaded?.path === path ? loaded : null
  const body = entry?.body ?? null
  const failed = entry !== null && entry.body === null

  const onBodyRef = useRef(onBody)
  onBodyRef.current = onBody
  useEffect(() => {
    if (body !== null) onBodyRef.current?.(body)
  }, [body])

  useEffect(() => {
    if (entry !== null) return
    let live = true
    void window.nexus.openPage(path).then((r) => {
      if (!live) return
      if (!r.ok) {
        setLoaded({ path, body: null })
        return
      }
      const cover = r.value.frontmatter.cover
      setLoaded({
        path,
        body: r.value.body,
        id: r.value.id,
        title: r.value.title,
        cover: typeof cover === 'string' ? cover : undefined,
      })
    })
    return () => {
      live = false
    }
  }, [path, entry])

  // Writes are keyed to the path they were scheduled under (pageFlush) — a host re-aiming `path`
  // can never land the old page's body on the new one.
  useEffect(() => {
    if (!editing) void flushPageSave(path)
    return () => void flushPageSave(path)
  }, [editing, path])

  if (failed) return <div className="pgembed pgembed-failed">{titleOf(path)}</div>
  if (body === null) return <div className="pgembed" />
  const header =
    chrome === 'page' ? (
      entry?.cover ? (
        <EmbedBanner
          path={path}
          title={entry.title ?? titleOf(path)}
          cover={entry.cover}
          onChanged={() => setLoaded(null)}
        />
      ) : entry?.id ? (
        <EmbedCrumbs id={entry.id} />
      ) : null
    ) : null
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click-to-edit surface over a contenteditable that is already keyboard-reachable
    <div
      className={`pgembed${editing ? ' is-editing' : ''}`}
      style={{ '--mdpm-scale': EMBED_SCALE } as React.CSSProperties}
      onClick={() => {
        if (editing || locked) return // locked: no edit entry; selection still works
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed) return
        onBeginEdit()
      }}
    >
      {header}
      <MarkdownEditor
        initialBody={body}
        onChange={(next) => {
          onBodyRef.current?.(next)
          schedulePageSave(path, next)
        }}
        connections={connections}
        readOnly={!editing}
        autoFocus
        zoom={EMBED_ZOOM}
        edgeFade
        warm={warm}
        embedAncestors={[...(ancestors ?? []), path]}
      />
    </div>
  )
}

/** The page's own banner with its title as static text — display-only chrome. The banner band keeps
 *  its change/remove context menu (the page-surface control); rename and add-banner stay behind. */
function EmbedBanner({
  path,
  title,
  cover,
  onChanged,
}: {
  path: string
  title: string
  cover: string
  onChanged: () => void
}): React.JSX.Element {
  const { openMenu: bannerMenu } = useBannerMenu(path, 'page', onChanged)
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control
    <div
      className="mdpm-banner"
      onContextMenu={(e) => {
        e.preventDefault()
        void bannerMenu()
      }}
    >
      <img className="mdpm-banner-img" src={assetUrl(cover)} alt="" />
      <div className="mdpm-banner-overlay">
        <span className="detail-title-text">{title}</span>
      </div>
    </div>
  )
}

/** The coverless header: where the page lives, revealed on tile hover — Collection › Set › Page on
 *  the shared two-tone treatment. */
function EmbedCrumbs({ id }: { id: string }): React.JSX.Element | null {
  const tree = useSession((s) => s.tree)
  if (!tree) return null
  const res = resolveWith(resolveIndexOf(tree), { kind: 'page', id })
  if (!res) return null
  const crumbs = [...res.path, { icon: res.icon, title: res.title }]
  return <NavCrumbs path={crumbs} className="pgembed-crumbs crumb-two-tone" iconSize={11} />
}
