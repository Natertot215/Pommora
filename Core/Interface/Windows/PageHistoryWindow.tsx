import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_TIME_FORMAT, embedZoom } from '@pommora/core/Settings/personalization'
import { parentOf } from '@pommora/core/Nexus/treePatch'
import { Button } from '@pommora/uix/Buttons'
import { Checkbox } from '@pommora/uix/Controls/Checkbox'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { MenuFooting, MenuItem, MenuSegments, MenuSeparator } from '@pommora/uix/Menus'
import { gutter } from '@pommora/uix/Menus/menu-base.css'
import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
import { retained, toggled } from '../../Utilities/checkSet'
import { MarkdownEditor } from '../../MarkdownPM'
import { clockOf, formatDate, nexusDateFormat } from '../../Properties/formatValue'
import { restoreSnapshot } from '../../Pages/restoreSnapshot'
import { fetchPageDetail } from '../../Session/pageDetailCache'
import { livePagePath, resolveOnlyConnections, trailOf } from '../../Session/treeIndex'
import { useEmbedScale, useSession, type WindowTarget } from '../../Session/store'
import { askDeleteSnapshots, askRestoreSnapshot } from '../confirmations'
import { WINDOW_BASE_PANEL, WindowBase } from '@pommora/uix/Windows/window-base'
import { host } from '../../Platform/dialer'
import '../../Navigation/nav-list.css'
import '../../Tiles/tile-base.css'
import './page-window.css'

// A non-path host chain: embeds inside a snapshot render inert, and no page path can collide with it.
const HISTORY_ANCESTOR = 'page-history'

export function PageHistoryWindow(): React.JSX.Element | null {
  const target = useSession((s) => s.historyTarget)
  const shown = useHeldPresence(target)
  if (!shown) return null
  return <PageHistoryBody key={shown.held.id} target={shown.held} closing={shown.closing} />
}

function PageHistoryBody({
  target,
  closing,
}: {
  target: WindowTarget
  closing: boolean
}): React.JSX.Element {
  const closeHistory = useSession((s) => s.closeHistory)
  const tree = useSession((s) => s.tree)
  const embedScale = useEmbedScale()
  const nexusClock = useSession((s) => s.personalization.timeFormat ?? DEFAULT_TIME_FORMAT)
  const dateFormat = nexusDateFormat(useSession((s) => s.personalization.dateFormat))

  const [rows, setRows] = useState<number[]>([])
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set())
  const [shown, setShown] = useState<number | null>(null)
  // Bumped by a restore: the file's stamp and its body re-read under the same highlight.
  const [reload, setReload] = useState(0)
  const livePath = livePagePath(tree, target)
  const restoreTarget = checked.size === 1 ? [...checked][0] : null

  const refresh = useCallback(async (): Promise<void> => {
    const list = await host().ask('history:list', target.id)
    if (!list.ok) {
      host().ask('error:show', list.error.message)
      return
    }
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
    void host()
      .ask('view:loadValues', parentOf(livePath), [target.id])
      .then((values) => {
        const stamp = values.ok ? values.value[target.id]?.modifiedAt : null
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
        ? fetchPageDetail(livePath).then((d) => d?.body ?? null)
        : host()
            .ask('history:read', target.id, shown)
            .then((r) => (r.ok ? r.value : null))
    void read.then((b) => {
      if (live) setBody(b)
    })
    return () => {
      live = false
    }
  }, [shown, reload, target.id, livePath])

  const resolveOnly = useMemo(() => resolveOnlyConnections(tree), [tree])
  const trail = trailOf(tree, { kind: 'page', id: target.id })

  const toggle = (ts: number): void => setChecked((prev) => toggled(prev, ts))

  const restore = async (ts: number): Promise<void> => {
    if (!(await askRestoreSnapshot())) return
    const r = await restoreSnapshot(target, ts)
    if (!r.ok) host().ask('error:show', r.error.message)
    else {
      setChecked((prev) => (prev.has(ts) ? toggled(prev, ts) : prev))
      setShown(null)
      setReload((n) => n + 1)
    }
    await refresh()
  }
  const remove = async (ts: readonly number[]): Promise<void> => {
    if (!(await askDeleteSnapshots())) return
    const r = await host().ask('history:delete', target.id, [...ts])
    if (!r.ok) host().ask('error:show', r.error.message)
    await refresh()
  }
  const openMenu = async (ts: number): Promise<void> => {
    const keys = checked.has(ts) ? [...checked] : [ts]
    const action = await host().ask('history:menu', { batch: keys.length > 1 })
    if (action === 'restore') await restore(ts)
    else if (action === 'delete') await remove(keys)
  }

  const when = (ms: number): React.JSX.Element => {
    const date = new Date(ms)
    return (
      <MenuSegments
        parts={[formatDate(date.toISOString(), dateFormat, 'none'), clockOf(date, nexusClock)]}
      />
    )
  }

  const list = (
    <div className="page-window-insp">
      <div className="window-pane-scroll nav-list page-history-list">
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
    <WindowBase
      id="page-history"
      closing={closing}
      onClose={closeHistory}
      onEscape={closeHistory}
      ariaLabel="File History"
      title={
        <div className="window-toolbar-title">
          <NavTrail segments={trail} selected className="page-window-crumbs" />
        </div>
      }
      right={{
        windowId: 'page-history-list',
        bounds: WINDOW_BASE_PANEL,
        mode: 'overlay',
        open: true,
        children: list,
      }}
    >
      <div
        className="window-body page-window-body over-scroll page-tile-grows"
        style={{ '--page-detail-scale': embedScale, '--editor-scale': 1 } as React.CSSProperties}
      >
        {body !== null && (
          <div className="page-tile page-history-page">
            <MarkdownEditor
              initialBody={body}
              onChange={() => {}}
              readOnly
              connections={resolveOnly}
              embedAncestors={[HISTORY_ANCESTOR, livePath]}
              zoom={embedZoom(embedScale)}
              edgeFade
            />
          </div>
        )}
      </div>
    </WindowBase>
  )
}
