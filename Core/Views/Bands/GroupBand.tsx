import type { CSSProperties, ReactNode } from 'react'
import type { SetNode } from '@pommora/core/Nexus/tree'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { Button } from '@pommora/uix/Buttons/Button'
import { base } from '@pommora/uix/Fields/fields.css'
import { LineRow, type LineSpec, useLineGroup, useLineSpring } from '@pommora/uix/Interactions/drag'
import { DropOutline } from '@pommora/uix/Menus'
import { Icon } from '@pommora/uix/Symbols'
import { text } from '@pommora/uix/Theme'
import { cx } from '@pommora/uix/Utilities/cx'
import { EntityIcon } from '../../Assets/EntityIcon'
import { showEntityMenu } from '../../Interface/Menus/entityMenuActions'
import { RenamableTitle } from '../../Interface/RenamableTitle'
import { OptionChip } from '../../Properties/Cells/OptionChip'
import {
  type BandModel,
  type BandNode,
  type BandSlot,
  type BandSnap,
  type BucketBand,
  bandBox,
  nodeLabel,
  bandSlot,
  bandSnap,
  draggable,
  type SetBand,
  shownHeads,
} from './bandModel'
import type { BandDrop, BandRef } from './bandRouter'
import './group-band.css'

// ── The spec ────────────────────────────────────────────────────────────────

export interface BandView {
  collapsed: ReadonlySet<string>
  toggle: (key: string) => void
  add: (key: string) => void
  open: (set: SetNode) => void
  springs: (dragged: string, node: BandNode) => boolean
}

export function bandSpec({
  bands,
  collapsed,
  nests,
  drop,
  indent,
  disabled,
}: {
  bands: BandModel
  collapsed: ReadonlySet<string>
  nests: boolean
  drop: (dragged: BandRef, drop: BandDrop) => void
  indent?: (depth: number) => CSSProperties
  disabled?: boolean
}): LineSpec<BandSlot, BandSnap> {
  const nodeOf = (key: string): BandNode | undefined => bands.byKey.get(key)
  return {
    snap: (key, g) => {
      const node = nodeOf(key)
      return node && draggable(node)
        ? bandSnap(g, shownHeads(bands.nodes, collapsed), key, nests)
        : null
    },
    resolve: (_key, p, s) => bandSlot(s, p.y),
    commit: (_key, slot, s) => drop(s.dragged, slot.drop),
    line: (slot) => ({ ...indent?.(slot.depth), top: slot.top }),
    slotKey: (slot) => slot.key,
    step: (slot) => slot.step,
    label: (key) => nodeLabel(nodeOf(key)),
    chip: (key) => {
      const node = nodeOf(key)
      return node && node.kind !== 'tail' ? <BandGlyph node={node} /> : null
    },
    disabled,
    disclose: true,
    watch: [bands],
  }
}

type BandedSnap<RS, B> = { row: RS } | { band: B }

export function bandedSpec<R, RS, S, B>(
  isRow: (id: string) => boolean,
  rows: LineSpec<R, RS>,
  bands: LineSpec<S, B>,
): LineSpec<R | S, BandedSnap<RS, B>> {
  return {
    snap: (id, g) => {
      if (isRow(id)) {
        const row = rows.snap(id, g)
        return row === null ? null : { row }
      }
      const band = bands.disabled ? null : bands.snap(id, g)
      return band === null ? null : { band }
    },
    resolve: (id, p, s) => ('row' in s ? rows.resolve(id, p, s.row) : bands.resolve(id, p, s.band)),
    commit: (id, slot, s) =>
      'row' in s ? rows.commit(id, slot as R, s.row) : bands.commit(id, slot as S, s.band),
    line: (slot, s) =>
      ('row' in s ? rows.line?.(slot as R, s.row) : bands.line?.(slot as S, s.band)) ?? null,
    label: (id) => (isRow(id) ? rows.label(id) : bands.label(id)),
    glyph: (id) => (isRow(id) ? rows.glyph?.(id) : bands.glyph?.(id)),
    chip: (id) => (isRow(id) ? rows.chip?.(id) : bands.chip?.(id)),
    carry: rows.carry,
    step: (slot, s) =>
      ('row' in s ? rows.step?.(slot as R, s.row) : bands.step?.(slot as S, s.band)) ?? null,
    disclose: (id) => {
      const d = isRow(id) ? rows.disclose : bands.disclose
      return typeof d === 'function' ? d(id) : d === true
    },
    watch: [...rows.watch, ...bands.watch],
  }
}

// ── The band ────────────────────────────────────────────────────────────────

export function GroupBand({
  node,
  bands,
  indent,
  fill = false,
  children,
}: {
  node: BandNode | undefined
  bands: BandView
  indent?: string
  fill?: boolean
  children: ReactNode
}): React.JSX.Element {
  if (node === undefined || node.kind === 'tail')
    return (
      <div className="group-band">
        <Reveal open fill={fill}>
          {children}
        </Reveal>
      </div>
    )
  return (
    <HeadedBand node={node} bands={bands} indent={indent} fill={fill}>
      {children}
    </HeadedBand>
  )
}

function HeadedBand({
  node,
  bands,
  indent,
  fill,
  children,
}: {
  node: SetBand | BucketBand
  bands: BandView
  indent: string | undefined
  fill: boolean
  children: ReactNode
}): React.JSX.Element {
  const collapsed = bands.collapsed.has(node.key)
  const toggle = (): void => bands.toggle(node.key)
  const box = useLineGroup(bandBox(node.key))
  const springRow = useLineSpring(
    collapsed
      ? (dragged) => {
          if (bands.springs(dragged, node)) toggle()
        }
      : undefined,
  )
  const set = node.kind === 'set' ? node : undefined
  const outsideRename = (e: React.MouseEvent): boolean =>
    !(e.target as HTMLElement).closest?.('input')
  return (
    <div
      ref={box}
      className={cx('group-band', node.kind === 'bucket' && node.parentKey !== null && 'sub-band')}
    >
      <div
        ref={springRow}
        className="group-band-row"
        data-collapsed={collapsed ? '' : undefined}
        data-empty={node.empty ? '' : undefined}
        style={indent ? { paddingLeft: indent } : undefined}
      >
        <LineRow
          id={node.key}
          open={toggle}
          className={cx('group-band-head', text.body.emphasized)}
          role="treeitem"
          aria-expanded={!collapsed}
          aria-label={nodeLabel(node)}
          onContextMenu={
            set
              ? (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void showEntityMenu({
                    kind: 'set',
                    path: set.set.path,
                    title: set.set.title,
                    host: 'detail',
                  })
                }
              : undefined
          }
          data-reveal-host=""
        >
          <button
            type="button"
            className="group-band-drop-outline"
            onClick={toggle}
            aria-label={collapsed ? 'Expand group' : 'Collapse group'}
          >
            <DropOutline open={!collapsed} />
          </button>
          {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: pointer shortcuts over the title — the head carries the keyboard */}
          <span
            className="group-band-glyph"
            onClick={(e) => {
              if (!set?.opens && outsideRename(e)) toggle()
            }}
            onDoubleClick={
              set?.opens
                ? (e) => {
                    if (outsideRename(e)) bands.open(set.set)
                  }
                : undefined
            }
          >
            <BandGlyph node={node} renamable />
          </span>
          {set ? (
            <Button
              size="button-inline"
              icon="plus"
              iconSize="body"
              reveal
              className="group-band-add"
              onClick={() => bands.add(set.key)}
              data-create
              aria-label="New page in group"
            />
          ) : null}
        </LineRow>
      </div>
      <Reveal open={!collapsed} fill={fill}>
        {children}
      </Reveal>
    </div>
  )
}

export function BandGlyph({
  node,
  renamable = false,
}: {
  node: SetBand | BucketBand
  renamable?: boolean
}): React.JSX.Element {
  if (node.kind === 'set')
    return (
      <span className="group-name">
        <EntityIcon kind="set" icon={node.set.icon} size="body" />
        {renamable ? (
          <RenamableTitle
            path={node.set.path}
            kind="set"
            title={node.set.title}
            className={cx(base, 'band-title-input')}
            renames="title"
            host="detail"
            doubleClick={false}
          />
        ) : (
          node.set.title
        )}
      </span>
    )
  switch (node.face.kind) {
    case 'option':
      return <OptionChip type={node.face.type} option={node.face.option} def={node.face.def} />
    case 'date':
      return (
        <span className="group-name">
          {node.face.icon ? <Icon name={node.face.icon} size="body" /> : null}
          {node.label}
        </span>
      )
  }
}
