import { reportRefusal } from '../Notifications/notifications'
import { useCallback, useEffect, useState } from 'react'
import { fault, ok, type Result, valueOr } from '../../Contract/result'
import { fetchPageValues } from '../../Properties/pageRow'
import { relDirname } from '../../Paths/posix'
import { Button } from '@pommora/uix/Buttons/Button'
import { Checkbox } from '@pommora/uix/Controls/Checkbox'
import { NavTrail, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { MenuFooting, MenuItem, MenuSeparator } from '@pommora/uix/Menus'
import { Segments } from '@pommora/uix/Elements/Segments'
import { gutter } from '@pommora/uix/Menus/menu-row.css'
import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
import { actedOn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
import { Icon } from '@pommora/uix/Symbols'
import { MarkdownEditor } from '../../MarkdownPM/MarkdownEditor'
import { useEditorHost } from '../../Pages/editorHost'
import { clockOf, formatDate } from '../../Properties/formatValue'
import { pageWriter } from '../../Session/saveScheduler'
import { storesChanged } from '../../Session/nexusSlice'
import { livePagePath } from '../../Nexus/record'
import { trailOf } from '../../Nexus/treeIndex'
import { useConnections } from '../../Session/pageConnections'
import { useSession, useSetting } from '../../Session/store'
import type { Reader } from '../../Session/windowSlice'
import type { PageTarget } from '../../Navigation/navRef'
import { askDeleteSnapshots, askRestoreSnapshot } from '../Confirm/confirmations'
import {
  WINDOW_BASE_PANEL,
  WindowBase,
  type WindowBasePanel,
} from '@pommora/uix/Windows/WindowBase'
import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
import { dialer } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { restoreMenuItems } from '../../Actions/restoreMenu'
import { useWindowGeometry } from './useWindowGeometry'
import '../../Navigation/nav-list.css'
import '../../Tiles/tile-base.css'
import './page-window.css'

// A non-path host chain: embeds inside the reader render inert, and no page path can collide with it.
const READER_ANCESTOR = 'page-reader'

type Branch<K extends Reader['kind']> = { reader: Extract<Reader, { kind: K }>; closing: boolean }

async function restoreFromHistory(target: PageTarget, ts: number): Promise<Result<null>> {
  const { tree, replaceBody } = useSession.getState()
  await pageWriter.flush(livePagePath(tree, target))
  const r = await dialer().ask('history:restore', target.id, ts)
  if (!r.ok) return r
  return (await replaceBody(r.value.path))
    ? ok(null)
    : fault('The page was restored but could not be reread.')
}

export function PageReaderWindow(): React.JSX.Element | null {
  const reader = useSession((s) => s.reader)
  const shown = useHeldPresence(reader, 'fast')
  if (!shown) return null
  const { held, closing } = shown
  switch (held.kind) {
    case 'history':
      return <HistoryReader key={`history:${held.page.id}`} reader={held} closing={closing} />
    case 'archive':
      return <ArchiveReader key={`archive:${held.page.path}`} reader={held} closing={closing} />
  }
}

/** The one read-only page window: the lock where the open-fullscreen glyph sits, an inert editor, and a trail that names the page without renaming it. Both branches read a page’s body uncached through `page:open`, since an archived page sits in no cache. */
function ReaderShell({
  reader,
  closing,
  ariaLabel,
  trail,
  body,
  embedPath,
  right,
}: {
  reader: Reader
  closing: boolean
  ariaLabel: string
  trail: TrailSegment[]
  body: string | null
  embedPath: string
  right?: WindowBasePanel
}): React.JSX.Element {
  const closeReader = useSession((s) => s.closeReader)
  const geometry = useWindowGeometry('page-reader')
  const resolveOnly = useConnections('inert')
  const editorHost = useEditorHost({ connections: resolveOnly, inert: true })
  return (
    <WindowBase
      {...geometry}
      closing={closing}
      onClose={closeReader}
      raiseOn={reader}
      ariaLabel={ariaLabel}
      lead={
        <span className="reader-lock" role="img" aria-label="Read Only" title="Read Only">
          <Icon name="lock" size="body" />
        </span>
      }
      title={
        <div className="window-toolbar-title">
          <NavTrail segments={trail} selected className="page-window-crumbs" />
        </div>
      }
      right={right}
    >
      <div className="window-body scroll-fade page-tile-grows">
        {body !== null && (
          <div className="page-tile page-reader-page">
            <MarkdownEditor
              initialBody={body}
              onChange={() => {}}
              host={editorHost}
              readOnly
              embedAncestors={[READER_ANCESTOR, embedPath]}
              edgeFade
            />
          </div>
        )}
      </div>
      <Scrollbar page />
    </WindowBase>
  )
}

function HistoryReader({ reader, closing }: Branch<'history'>): React.JSX.Element {
  const target = reader.page
  const tree = useSession((s) => s.tree)
  const nexusClock = useSetting('timeFormat')
  const dateFormat = useSetting('dateFormat')

  const [rows, setRows] = useState<number[]>([])
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set())
  const [shown, setShown] = useState<number | null>(null)
  // Bumped by a restore: the file's stamp and its body re-read under the same highlight.
  const [reload, setReload] = useState(0)
  const livePath = livePagePath(tree, target)
  const restoreTarget = checked.size === 1 ? [...checked][0] : null

  const refresh = useCallback(async (): Promise<void> => {
    const list = await dialer().ask('history:list', target.id)
    if (!reportRefusal(list)) return
    setRows(list.value)
    const live = new Set(list.value)
    setChecked((prev) => retained(prev, live))
    setShown((prev) => (prev !== null && live.has(prev) ? prev : null))
  }, [target.id])
  useEffect(() => {
    void refresh()
  }, [refresh])

  const [modifiedAt, setModifiedAt] = useState<number | null>(null)
  useEffect(() => {
    let live = true
    void fetchPageValues(relDirname(livePath), [target.id]).then((values) => {
      const stamp = values?.[target.id]?.modifiedAt ?? null
      if (live) setModifiedAt(stamp ? new Date(stamp).getTime() : null)
    })
    return () => {
      live = false
    }
  }, [reload, target.id, livePath])

  const [body, setBody] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setBody(null)
    const read =
      shown === null
        ? dialer()
            .ask('page:open', livePath)
            .then((r) => valueOr(r, null)?.body ?? null)
        : dialer()
            .ask('history:read', target.id, shown)
            .then((r) => valueOr(r, null))
    void read.then((b) => {
      if (live) setBody(b)
    })
    return () => {
      live = false
    }
  }, [shown, reload, target.id, livePath])

  const trail = trailOf(tree, { kind: 'page', id: target.id })

  const toggle = (ts: number): void => setChecked((prev) => toggled(prev, ts))

  const restore = async (ts: number): Promise<void> => {
    if (!(await askRestoreSnapshot())) return
    const r = await restoreFromHistory(target, ts)
    if (reportRefusal(r)) {
      setChecked((prev) => (prev.has(ts) ? toggled(prev, ts) : prev))
      setShown(null)
      setReload((n) => n + 1)
    }
    await refresh()
  }
  const remove = async (ts: readonly number[]): Promise<void> => {
    if (!(await askDeleteSnapshots())) return
    reportRefusal(await dialer().ask('history:delete', target.id, [...ts]))
    await refresh()
  }
  const openMenu = async (ts: number): Promise<void> => {
    const keys = actedOn(checked, rows, ts, (t) => t)
    const action = await popMenu(restoreMenuItems({ batch: keys.length > 1, restoresBatch: false }))
    if (action === 'restore') await restore(ts)
    else if (action === 'delete') await remove(keys)
  }

  const when = (ms: number): React.JSX.Element => {
    const date = new Date(ms)
    return (
      <Segments
        parts={[formatDate(date.toISOString(), dateFormat, 'none'), clockOf(date, nexusClock)]}
      />
    )
  }

  const list = (
    <div className="window-panel-column">
      <div className="window-pane-scroll nav-list">
        <MenuItem
          className="page-history-row"
          subLabel={modifiedAt === null ? undefined : when(modifiedAt)}
          selected={shown === null}
          overlay={<Checkbox className={gutter} size="compact" state={shown === null} readOnly />}
          onClick={() => setShown(null)}
        >
          Current Version
        </MenuItem>
        <MenuSeparator />
        {rows.map((ts) => (
          <MenuItem
            key={ts}
            className="page-history-row"
            subLabel={when(ts)}
            selected={shown === ts}
            overlay={
              <Checkbox
                className={gutter}
                size="compact"
                state={checked.has(ts)}
                onChange={() => toggle(ts)}
                ariaLabel="Select snapshot"
              />
            }
            trailing={
              checked.has(ts) ? (
                <Button
                  size="button-inline"
                  icon="trash"
                  iconSize="body"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    void remove([...checked])
                  }}
                />
              ) : undefined
            }
            onClick={() => setShown(ts)}
            onContextMenu={(e) => {
              e.preventDefault()
              void openMenu(ts)
            }}
          >
            Untitled Snapshot
          </MenuItem>
        ))}
      </div>
      <MenuFooting
        trailing={
          <Button
            type="filled"
            size="button-inline"
            label="Restore"
            disabled={restoreTarget === null}
            onClick={() => {
              if (restoreTarget !== null) void restore(restoreTarget)
            }}
          />
        }
      />
    </div>
  )

  return (
    <ReaderShell
      reader={reader}
      closing={closing}
      ariaLabel="File History"
      trail={trail}
      body={body}
      embedPath={livePath}
      right={{
        windowId: 'page-history-list',
        bounds: WINDOW_BASE_PANEL,
        mode: 'overlay',
        open: true,
        children: list,
      }}
    />
  )
}

/** An archived page as it stood when opened, read uncached, and closed once a change to either store leaves its file gone. */
function ArchiveReader({ reader, closing }: Branch<'archive'>): React.JSX.Element {
  const closeReader = useSession((s) => s.closeReader)
  const { path } = reader.page
  const [body, setBody] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    const read = (): void =>
      void dialer()
        .ask('page:open', path)
        .then((r) => {
          if (!live) return
          if (r.ok) setBody((was) => was ?? r.value.body)
          else closeReader()
        })
    read()
    const stop = storesChanged.subscribe(read)
    return () => {
      live = false
      stop()
    }
  }, [path, closeReader])
  return (
    <ReaderShell
      reader={reader}
      closing={closing}
      ariaLabel="Archived Page"
      trail={reader.trail}
      body={body}
      embedPath={path}
    />
  )
}
