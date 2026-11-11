import type { CSSProperties, ReactNode } from 'react'
import type { SetNode } from '../../Nexus/tree'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { AccessoryButton } from '@pommora/uix/Menus/MenuRows'
import { base } from '@pommora/uix/Fields/fields.css'
import { isCmd } from '@pommora/uix/Interactions/chords'
import { LineRow, type LineSpec, useLineGroup, useLineSpring } from '@pommora/uix/Interactions/drag'
import { DisclosureChevron } from '@pommora/uix/Elements/DisclosureChevron'
import type { Disclosure } from '@pommora/uix/Menus/DisclosureRow'
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
import type { BandRouting } from './bandRouter'
import './group-band.css'

// ── The spec ────────────────────────────────────────────────────────────────

export interface BandView extends Disclosure {
  add: (key: string) => void
  open: (set: SetNode, newTab: boolean) => void
  springs: (dragged: string, node: BandNode) => boolean
  immovable: boolean
}

export function bandSpec({
  bands,
  disclosure,
  nests,
  routing,
  indent,
}: {
  bands: BandModel
  disclosure: Disclosure
  nests: boolean
  routing: BandRouting
  indent?: (depth: number) => CSSProperties
}): LineSpec<BandSlot, BandSnap> {
  const nodeOf = (key: string): BandNode | undefined => bands.byKey.get(key)
  return {
    snap: (key, g) =>
      bandSnap(g, shownHeads(bands.nodes, disclosure.isOpen), key, nests, routing.moves),
    resolve: (_key, p, s) => bandSlot(s, p.y),
    commit: (_key, slot, s) => routing.drop(s.dragged, slot.drop),
    line: (slot) => ({ ...indent?.(slot.depth), top: slot.top }),
    step: (slot) => slot.step,
    label: (key) => nodeLabel(nodeOf(key)),
    glyph: (key) => {
      const node = nodeOf(key)
      return node && node.kind !== 'tail' ? bandIcon(node) : null
    },
    chip: (key) => {
      const node = nodeOf(key)
      return node?.kind === 'bucket' && node.face.kind === 'option' ? (
        <BandGlyph node={node} />
      ) : null
    },
    disclose: true,
    watch: [bands],
  }
}

// ── The band ────────────────────────────────────────────────────────────────

export function GroupBand({
  node,
  bands,
  indent,
  fill = false,
  endsOnRow = false,
  children,
}: {
  node: BandNode | undefined
  bands: BandView
  indent?: string
  fill?: boolean
  endsOnRow?: boolean
  children: ReactNode
}): React.JSX.Element {
  if (node === undefined || node.kind === 'tail')
    return (
      <div className="group-band band-tail">
        <Reveal open fill={fill}>
          {children}
        </Reveal>
      </div>
    )
  return (
    <HeadedBand node={node} bands={bands} indent={indent} fill={fill} endsOnRow={endsOnRow}>
      {children}
    </HeadedBand>
  )
}

function HeadedBand({
  node,
  bands,
  indent,
  fill,
  endsOnRow,
  children,
}: {
  node: SetBand | BucketBand
  bands: BandView
  indent: string | undefined
  fill: boolean
  endsOnRow: boolean
  children: ReactNode
}): React.JSX.Element {
  const open = bands.isOpen(node.key)
  const toggle = (): void => bands.toggle(node.key)
  const box = useLineGroup(bandBox(node.key))
  const springRow = useLineSpring(
    open
      ? undefined
      : (dragged) => {
          if (bands.springs(dragged, node)) toggle()
        },
  )
  const set = node.kind === 'set' ? node : undefined
  const outsideRename = (e: React.MouseEvent): boolean =>
    !(e.target as HTMLElement).closest?.('input')
  return (
    <div
      ref={box}
      className={cx('group-band', node.kind === 'bucket' && node.parentKey !== null && 'sub-band')}
      style={indent ? ({ '--band-indent': indent } as React.CSSProperties) : undefined}
      data-ends-on-row={endsOnRow ? '' : undefined}
    >
      <div
        ref={springRow}
        className="group-band-row"
        data-view-lead="band"
        data-collapsed={open ? undefined : ''}
        data-empty={node.empty ? '' : undefined}
      >
        <LineRow
          id={node.key}
          open={toggle}
          immovable={bands.immovable || !draggable(node)}
          className={cx('group-band-head', text.body.emphasized)}
          role="treeitem"
          aria-expanded={open}
          aria-label={nodeLabel(node)}
          onContextMenu={
            set
              ? (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void showEntityMenu(
                    { kind: 'set', path: set.set.path, title: set.set.title, host: 'band' },
                    null,
                    () => bands.add(set.key),
                  )
                }
              : undefined
          }
          data-reveal-host=""
        >
          <span className="row-chevron">
            <DisclosureChevron open={open} onToggle={toggle} />
          </span>
          {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: pointer shortcuts over the title — the head carries the keyboard */}
          <span
            className="group-band-glyph"
            onClick={(e) => {
              if (!set?.opens && outsideRename(e)) toggle()
            }}
            onDoubleClick={
              set?.opens
                ? (e) => {
                    if (outsideRename(e)) bands.open(set.set, isCmd(e))
                  }
                : undefined
            }
          >
            <BandGlyph node={node} renamable />
          </span>
          {set ? (
            <AccessoryButton
              icon="plus"
              size="body"
              ariaLabel="New page in group"
              create
              reveal
              tabIndex={-1}
              onClick={() => bands.add(set.key)}
            />
          ) : null}
        </LineRow>
      </div>
      <Reveal open={open} fill={fill}>
        {children}
      </Reveal>
    </div>
  )
}

const bandIcon = (node: SetBand | BucketBand): ReactNode =>
  node.kind === 'set' ? (
    <EntityIcon kind="set" icon={node.set.icon} size="body" />
  ) : node.face.kind === 'date' && node.face.icon ? (
    <Icon name={node.face.icon} size="body" />
  ) : null

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
        {bandIcon(node)}
        {renamable ? (
          <RenamableTitle
            path={node.set.path}
            kind="set"
            title={node.set.title}
            className={cx(base, 'band-title-input')}
            renames="title"
            host="band"
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
          {bandIcon(node)}
          {node.label}
        </span>
      )
  }
}
