import { useEffect, useState } from 'react'
import { titleFromPath } from '../../Paths/posix'
import { coverOf, type PageDetail } from '../../Pages/pageDetail'
import { MarkdownEditor } from '../../MarkdownPM/MarkdownEditor'
import type { WarmSeam } from '../../MarkdownPM/warmSeam'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { useEditorHost } from '../../Pages/editorHost'
import { PageHeader } from '../../Pages/PageHeader'
import { pageWriter } from '../../Session/saveScheduler'
import { useBodyMount } from '../../Pages/bodyMount'
import { fetchPageDetail, readPageDetail, useBodyEpoch } from '../../Session/pageDetailCache'
import { useSession } from '../../Session/store'
import { usePublishSelection } from '../../Interface/Subfield/publish'
import { Banner } from '../../Interface/Header/Banner'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { ancestryOf, reconcileIndexOf } from '../../Nexus/treeIndex'

import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { cx } from '@pommora/uix/Utilities/cx'
import '../tile-base.css'
import '../tile-title.css'
import { PICKER_PORTAL_ATTR } from '@pommora/uix/Pickers/PickerMenu'

interface EmbedEntry {
  path: string
  body: string | null
  id?: string
  title?: string
  cover?: string
}

const entryFrom = (path: string, detail: PageDetail): EmbedEntry => ({
  path,
  body: detail.body,
  id: detail.id,
  title: detail.title,
  cover: coverOf(detail),
})

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
  arrive,
  onArrived,
  preview,
}: {
  path: string
  editing: boolean
  onBeginEdit: () => void
  connections?: ConnectionsApi
  locked?: boolean
  onBody?: (body: string) => void
  warm?: WarmSeam
  ancestors?: readonly string[]
  chrome?: 'none' | 'page' | 'window'
  arrive?: string
  onArrived?: () => void
  preview?: boolean
}): React.JSX.Element {
  const publishSelection = usePublishSelection(path)
  // The seed and the editor's key move in one render: a replaced body re-seeds from the fresh slot before the remounting editor reads it.
  const epoch = useBodyEpoch(path)
  const [seed, setSeed] = useState(() => {
    const doc = (warm?.restore()?.editorState as { doc?: unknown } | undefined)?.doc
    const cached = readPageDetail(path)
    const slot = cached ? entryFrom(path, cached) : null
    if (typeof doc !== 'string') return { epoch, entry: slot }
    const tree = useSession.getState().tree
    const id = tree ? reconcileIndexOf(tree).pagesByPath.get(path) : undefined
    return { epoch, entry: { path, id, ...slot, body: doc } }
  })
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

  const host = useEditorHost({ pageId: entry?.id, connections, preview })
  const onBodyRef = useLatest(onBody)
  useEffect(() => {
    if (body !== null) onBodyRef.current?.(body)
  }, [body])
  const seat = useBodyMount(path, (next) => onBodyRef.current?.(next))

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

  useEffect(() => () => void pageWriter.flush(path), [editing, path])

  if (failed) return <div className="page-tile page-tile-failed">{titleFromPath(path)}</div>
  if (body === null) return <div className="page-tile" />
  // Merge the cover only — nulling would unmount the live editor mid-edit and race the debounced body write.
  const refreshCover = (): void => {
    void fetchPageDetail(path).then((detail) => {
      if (detail) setLoaded((l) => (l ? { ...l, cover: coverOf(detail) } : l))
    })
  }
  const header = ((): React.ReactNode => {
    switch (chrome) {
      case 'none':
        return null
      case 'window':
        return entry?.id ? (
          <PageHeader
            page={{
              id: entry.id,
              path,
              title: entry.title ?? titleFromPath(path),
              cover: entry.cover,
            }}
            onBannerDone={refreshCover}
            chrome="window"
          />
        ) : null
      case 'page':
        return entry?.cover ? (
          <Banner
            path={path}
            kind="page"
            value={entry.cover}
            onDone={refreshCover}
            className="header-park"
            titleClassName="banner-overlay"
            title={<span className="detail-title-text">{entry.title ?? titleFromPath(path)}</span>}
            empty={() => null}
          />
        ) : entry?.id ? (
          <EmbedCrumbs id={entry.id} />
        ) : null
    }
  })()
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click-to-edit surface over a contenteditable that is already keyboard-reachable
    <div
      className={cx(
        'page-tile',
        chrome === 'page' && entry?.cover && 'has-banner',
        chrome === 'window' && 'is-window-chrome',
      )}
      onClick={(e) => {
        if (editing || locked) return
        if ((e.target as HTMLElement).closest?.(`.mdpm-header, .banner, [${PICKER_PORTAL_ATTR}]`))
          return
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
          seat.save(next)
        }}
        register={seat.register}
        host={host}
        connections={connections}
        onSelection={publishSelection}
        readOnly={!editing}
        autoFocus
        edgeFade
        warm={warm}
        embedAncestors={[...(ancestors ?? []), path]}
        arrive={arrive}
        onArrived={onArrived}
        onHeadingRename={(heading, to) =>
          void useSession.getState().mutate({ op: 'renameHeading', path, heading, to })
        }
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
