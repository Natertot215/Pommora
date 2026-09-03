import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_TIME_FORMAT, embedZoom, type SnapshotRow } from '@shared/types'
import { parentOf } from '@shared/treePatch'
import { Button } from '@renderer/DesignSystem/Buttons'
import { Checkbox } from '@renderer/DesignSystem/Controls/Checkbox'
import { NavTrail, type TrailSegment } from '@renderer/DesignSystem/Elements/NavTrail'
import { MenuFooting, MenuItem, MenuSegments, MenuSeparator } from '@renderer/DesignSystem/Menus'
import { gutter } from '@renderer/DesignSystem/Menus/menu-base.css'
import { useExitPresence } from '@renderer/DesignSystem/Animation/useExitPresence'
import { MarkdownEditor } from '@renderer/MarkdownPM'
import type { ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import { clockOf, formatDate, nexusDateFormat } from '@renderer/Properties/Assignment/formatValue'
import { restoreSnapshot } from '../Interface/restoreSnapshot'
import { fetchPageDetail } from '../Store/tabState'
import { ancestryOf, pageIndexOf } from '../treeIndex'
import { useEmbedScale, useSession, type PreviewTarget } from '../store'
import { askDeleteSnapshots, askRestoreSnapshot } from './confirmations'
import { historyRowModel } from './pageHistoryModel'
import { WINDOW_BASE_INSPECTOR, WindowBase } from './window-base'
import '../Navigation/nav-list.css'
import './page-history-window.css'

const NO_TRAIL: TrailSegment[] = []
// A non-path host chain: embeds inside a snapshot render inert, and no page path can collide with it.
const HISTORY_ANCESTOR = 'page-history'

export function PageHistoryWindow(): React.JSX.Element | null {
  const target = useSession((s) => s.historyTarget)
  const { mounted, closing } = useExitPresence(target !== null)
  const held = useRef(target)
  if (target) held.current = target
  if (!mounted || !held.current) return null
  return <PageHistoryBody key={held.current.id} target={held.current} closing={closing} />
}

function PageHistoryBody({
  target,
  closing,
}: {
  target: PreviewTarget
  closing: boolean
}): React.JSX.Element {
  const closeHistory = useSession((s) => s.closeHistory)
  const tree = useSession((s) => s.tree)
  const embedScale = useEmbedScale()
  const nexusClock = useSession((s) => s.personalization.timeFormat ?? DEFAULT_TIME_FORMAT)
  const dateFormat = nexusDateFormat(useSession((s) => s.personalization.dateFormat))

  const [rows, setRows] = useState<SnapshotRow[]>([])
  const [modifiedAt, setModifiedAt] = useState<number | null>(null)
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set())
  const [reload, setReload] = useState(0)
  const { shown, restoreEnabled } = historyRowModel(checked)

  const refresh = useCallback(async (): Promise<void> => {
    const [list, values] = await Promise.all([
      window.nexus.listHistory(target.id),
      window.nexus.loadValues(parentOf(target.path), [target.id]),
    ])
    if (list.ok) {
      setRows(list.value)
      setChecked((prev) => {
        const live = new Set(list.value.map((r) => r.ts))
        const next = new Set([...prev].filter((ts) => live.has(ts)))
        return next.size === prev.size ? prev : next
      })
    }
    const stamp = values.ok ? values.value[target.id]?.modifiedAt : null
    setModifiedAt(stamp ? new Date(stamp).getTime() : null)
    setReload((n) => n + 1)
  }, [target.id, target.path])
  useEffect(() => {
    void refresh()
  }, [refresh])

  const [body, setBody] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setBody(null)
    const read =
      shown === null
        ? fetchPageDetail(target.path).then((d) => d?.body ?? null)
        : window.nexus.readSnapshot(target.id, shown).then((r) => (r.ok ? r.value : null))
    void read.then((b) => {
      if (live) setBody(b)
    })
    return () => {
      live = false
    }
    // reload re-reads the same selection after an action moved the file or the store.
  }, [shown, reload, target.id, target.path])

  const resolveOnly = useMemo<ConnectionsApi | undefined>(
    () => (tree ? { ...pageIndexOf(tree), open: () => {} } : undefined),
    [tree],
  )
  const trail = (tree && ancestryOf(tree, { kind: 'page', id: target.id })) ?? NO_TRAIL

  const toggle = (ts: number): void =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (!next.delete(ts)) next.add(ts)
      return next
    })
  const showCurrent = (): void => setChecked(new Set())

  const restore = async (ts: number): Promise<void> => {
    if (!(await askRestoreSnapshot())) return
    const r = await restoreSnapshot(target, ts)
    if (!r.ok) window.nexus.showError(r.error.message)
    showCurrent()
    await refresh()
  }
  const remove = async (ts: readonly number[]): Promise<void> => {
    if (!(await askDeleteSnapshots())) return
    const r = await window.nexus.deleteSnapshots(target.id, [...ts])
    if (!r.ok) window.nexus.showError(r.error.message)
    await refresh()
  }
  const openMenu = async (ts: number): Promise<void> => {
    const inSet = checked.has(ts) ? [...checked] : []
    const batch = inSet.length > 1
    const action = await window.nexus.historyMenu({ batch })
    if (action === 'restore') await restore(ts)
    else if (action === 'delete') await remove(batch ? inSet : [ts])
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
    <div className="page-history-pane-inner">
      <div className="window-pane-scroll nav-list page-history-list">
        <MenuItem
          className="page-history-row"
          subLabel={modifiedAt === null ? undefined : when(modifiedAt)}
          selected={shown === null}
          overlay={<Checkbox className={gutter} size="compact" state={shown === null} readOnly />}
          onClick={showCurrent}
        >
          Current Version
        </MenuItem>
        <MenuSeparator />
        {rows.map((row) => (
          <MenuItem
            key={row.ts}
            className="page-history-row"
            subLabel={when(row.ts)}
            selected={shown === row.ts}
            overlay={
              <Checkbox
                className={gutter}
                size="compact"
                state={checked.has(row.ts)}
                onChange={() => toggle(row.ts)}
                ariaLabel="Select snapshot"
              />
            }
            trailing={
              checked.has(row.ts) ? (
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
            onClick={() => toggle(row.ts)}
            onContextMenu={(e) => {
              e.preventDefault()
              void openMenu(row.ts)
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
            disabled={!restoreEnabled}
            onClick={() => {
              if (shown !== null) void restore(shown)
            }}
          />
        }
      />
    </div>
  )

  return (
    <WindowBase
      id="page-history"
      className="page-history-window"
      closing={closing}
      onClose={closeHistory}
      onEscape={closeHistory}
      ariaLabel="File History"
      title={<NavTrail segments={trail} selected className="page-window-crumbs" />}
      right={{
        windowId: 'page-history-list',
        bounds: WINDOW_BASE_INSPECTOR,
        mode: 'overlay',
        open: true,
        className: 'page-history-pane',
        children: list,
      }}
    >
      <div
        className="window-body page-history-body over-scroll page-tile-grows"
        style={{ '--page-detail-scale': embedScale, '--editor-scale': 1 } as React.CSSProperties}
      >
        {body !== null && (
          <MarkdownEditor
            initialBody={body}
            onChange={() => {}}
            readOnly
            connections={resolveOnly}
            embedAncestors={[HISTORY_ANCESTOR, target.path]}
            zoom={embedZoom(embedScale)}
            edgeFade
          />
        )}
      </div>
    </WindowBase>
  )
}
