import { useEffect, useRef, useState } from 'react'
import { titleFromPath } from '@shared/connections'
import type { PageDetail } from '@shared/types'
import { MarkdownEditor } from '@renderer/MarkdownPM'
import type { WarmSeam } from '@renderer/MarkdownPM/warmSeam'
import type { ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import { nativeEditorMenu } from '@renderer/MarkdownPM/Editor/menu'
import { flushPageSave, schedulePageSave } from '@renderer/Interface/pageFlush'
import { fetchPageDetail, readPageDetail, useBodyEpoch } from '@renderer/Store/tabState'
import { useAssetUrl, useEmbedScale, useSession } from '../../store'
import { AssetImage } from '@renderer/Assets/AssetImage'
import { ImagePicker } from '@renderer/DesignSystem/Pickers/ImagePicker/ImagePicker'
import { useBannerMenu } from '../../Interface/useBannerMenu'
import { NavTrail } from '@renderer/DesignSystem/Elements/NavTrail'
import { ancestryOf } from '../../treeIndex'

import '../tile-base.css'
import '@renderer/Tiles/tile-title.css'
import { embedZoom } from '@shared/types'

interface EmbedEntry {
  path: string
  body: string | null
  id?: string
  title?: string
  cover?: string
}

const coverOf = (detail: PageDetail): string | undefined =>
  typeof detail.frontmatter.banner === 'string' ? detail.frontmatter.banner : undefined

const entryFrom = (path: string, detail: PageDetail): EmbedEntry => ({
  path,
  body: detail.body,
  id: detail.id,
  title: detail.title,
  cover: coverOf(detail),
})

const initialEntry = (path: string, warm: WarmSeam | undefined): EmbedEntry | null => {
  const doc = (warm?.restore()?.editorState as { doc?: unknown } | undefined)?.doc
  const cached = readPageDetail(path)
  const slot = cached ? entryFrom(path, cached) : null
  return typeof doc === 'string' ? { path, ...slot, body: doc } : slot
}

export function PageTile({
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
  onBody?: (body: string) => void
  warm?: WarmSeam
  ancestors?: readonly string[]
  chrome?: 'none' | 'page'
}): React.JSX.Element {
  // The seed and the editor's key move in one render: a replaced body re-seeds from the fresh
  // slot before the remounting editor reads it.
  const epoch = useBodyEpoch(path)
  const [seed, setSeed] = useState(() => ({ epoch, entry: initialEntry(path, warm) }))
  if (seed.epoch !== epoch) {
    const fresh = readPageDetail(path)
    setSeed({ epoch, entry: fresh ? entryFrom(path, fresh) : null })
  }
  const setLoaded = (next: (l: EmbedEntry | null) => EmbedEntry | null): void =>
    setSeed((s) => ({ epoch: s.epoch, entry: next(s.entry) }))
  const loaded = seed.entry
  const entry = loaded?.path === path ? loaded : null
  const body = entry?.body ?? null
  const failed = entry !== null && entry.body === null

  const embedScale = useEmbedScale()
  const onBodyRef = useRef(onBody)
  onBodyRef.current = onBody
  useEffect(() => {
    if (body !== null) onBodyRef.current?.(body)
  }, [body])

  useEffect(() => {
    if (entry !== null) return
    let live = true
    void fetchPageDetail(path).then((detail) => {
      if (!live) return
      setLoaded(() => (detail ? entryFrom(path, detail) : { path, body: null }))
    })
    return () => {
      live = false
    }
  }, [path, entry])

  useEffect(() => {
    if (!editing) void flushPageSave(path)
    return () => void flushPageSave(path)
  }, [editing, path])

  if (failed) return <div className="page-tile page-tile-failed">{titleFromPath(path)}</div>
  if (body === null) return <div className="page-tile" />
  const header =
    chrome === 'page' ? (
      entry?.cover ? (
        <EmbedBanner
          path={path}
          title={entry.title ?? titleFromPath(path)}
          cover={entry.cover}
          onChanged={() =>
            void fetchPageDetail(path).then((detail) => {
              // Merge the cover only — nulling would unmount the live editor mid-edit and race the
              // debounced body write; the body seed stays untouched.
              if (detail) setLoaded((l) => (l ? { ...l, cover: coverOf(detail) } : l))
            })
          }
        />
      ) : entry?.id ? (
        <EmbedCrumbs id={entry.id} />
      ) : null
    ) : null
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click-to-edit surface over a contenteditable that is already keyboard-reachable
    <div
      className={`page-tile${editing ? ' is-editing' : ''}${chrome === 'page' && entry?.cover ? ' has-banner' : ''}`}
      style={{ '--page-detail-scale': embedScale, '--editor-scale': 1 } as React.CSSProperties}
      onClick={(e) => {
        if (editing || locked) return
        if ((e.target as HTMLElement).closest?.('.mdpm-banner')) return
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed) return
        onBeginEdit()
      }}
    >
      {header}
      <MarkdownEditor
        key={epoch}
        initialBody={body}
        onChange={(next) => {
          onBodyRef.current?.(next)
          schedulePageSave(path, next)
        }}
        connections={connections}
        menu={nativeEditorMenu}
        readOnly={!editing}
        autoFocus
        zoom={embedZoom(embedScale)}
        edgeFade
        warm={warm}
        pageId={entry?.id}
        embedAncestors={[...(ancestors ?? []), path]}
      />
    </div>
  )
}

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
}): React.JSX.Element | null {
  const bannerRef = useRef<HTMLDivElement>(null)
  const {
    openMenu: bannerMenu,
    editing,
    closeEditor,
    boxAspect,
    onSave,
    onRepick,
  } = useBannerMenu(path, 'page', { value: cover, frame: bannerRef, onDone: onChanged })
  const coverSrc = useAssetUrl(cover)
  if (!coverSrc) return null
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control
    <div
      ref={bannerRef}
      className="mdpm-banner"
      onContextMenu={(e) => {
        e.preventDefault()
        void bannerMenu()
      }}
    >
      <AssetImage value={cover} className="mdpm-banner-img" />
      <div className="mdpm-banner-overlay title-shadow">
        <span className="detail-title-text">{title}</span>
      </div>
      <ImagePicker
        open={editing}
        value={cover ?? ''}
        shape="rect"
        boxAspect={boxAspect}
        onCancel={closeEditor}
        onSave={onSave}
        onRepick={onRepick}
      />
    </div>
  )
}

function EmbedCrumbs({ id }: { id: string }): React.JSX.Element | null {
  const tree = useSession((s) => s.tree)
  const trail = tree && ancestryOf(tree, { kind: 'page', id })
  if (!trail) return null
  return <NavTrail segments={trail} selected className="page-tile-crumbs" />
}
