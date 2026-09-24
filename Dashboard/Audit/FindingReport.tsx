import { Fragment, type ReactNode } from 'react'
import { Label } from '@pommora/uix/Labels/Label'
import { Icon, type IconName } from '@pommora/uix/Symbols'
import { ANCHOR_CELLS, type CellKey, cellColor } from '@pommora/uix/Theme/ramp'
import { type Finding, change, formatNet, netSum, weightCounts } from './auditModel'
import { Inline } from './markdown'

// Weight, Size and fix kind share one scale: the heavier, larger or less settled, the hotter.
const TONE: Record<string, CellKey> = {
  High: ANCHOR_CELLS.red,
  Medium: ANCHOR_CELLS.orange,
  Low: ANCHOR_CELLS.green,
  L: ANCHOR_CELLS.red,
  M: ANCHOR_CELLS.orange,
  S: ANCHOR_CELLS.green,
  TBD: ANCHOR_CELLS.red,
  Proposed: ANCHOR_CELLS.orange,
  Literal: ANCHOR_CELLS.green,
}

const AREA_ICON: Record<string, IconName> = {
  Actions: 'zap',
  Assets: 'image',
  Connections: 'link',
  Contexts: 'tags',
  Contract: 'send',
  'Cross-Cutting': 'shapes',
  Desktop: 'laptop',
  Files: 'folder-open',
  Index: 'table',
  Interface: 'app-window',
  MarkdownPM: 'type',
  Matrix: 'atom',
  Navigation: 'list-tree',
  Nexus: 'orbit',
  Pages: 'file-text',
  Paths: 'folder-tree',
  Platform: 'server',
  Properties: 'sliders-horizontal',
  Session: 'layers',
  Settings: 'cog',
  Sync: 'arrow-up-down',
  Tiles: 'cards-grid',
  Trash: 'trash',
  UIX: 'palette',
  Views: 'layout-grid',
}

const toneColor = (cell: CellKey | undefined): string | undefined => cell && cellColor(cell)

export function Weight({
  weight,
  children,
}: {
  weight: string
  children?: ReactNode
}): React.JSX.Element {
  return (
    <span className="au-weight" style={{ color: toneColor(TONE[weight]) }}>
      {children ?? weight}
    </span>
  )
}

export function FixTag({ kind, text }: { kind: string; text?: string }): React.JSX.Element {
  return <Label shape="tag" color={TONE[kind] ?? 'default'} fill="none" text={text ?? kind} />
}

export function netColor(net: number): string | undefined {
  return toneColor(net < 0 ? ANCHOR_CELLS.red : net > 0 ? ANCHOR_CELLS.green : undefined)
}

function Net({ net }: { net: number }): React.JSX.Element {
  return (
    <span style={{ color: netColor(net) }}>
      Net {formatNet(net)} line{Math.abs(net) === 1 ? '' : 's'}
    </span>
  )
}

function Dots({ parts }: { parts: ReactNode[] }): React.JSX.Element {
  return (
    <>
      {parts.filter(Boolean).map((p, i) => (
        <Fragment key={i}>
          {i > 0 && ' · '}
          {p}
        </Fragment>
      ))}
    </>
  )
}

export function Totals({ findings }: { findings: readonly Finding[] }): React.JSX.Element {
  const n = findings.length
  return (
    <p className="au-totals">
      <Dots
        parts={[
          `${n} finding${n === 1 ? '' : 's'}`,
          <Net key="net" net={netSum(findings)} />,
          ...weightCounts(findings).map(
            ([w, count]) => count > 0 && <Weight key={w} weight={w}>{`${count} ${w}`}</Weight>,
          ),
        ]}
      />
    </p>
  )
}

export function FindingReport({
  finding: f,
  level,
}: {
  finding: Finding
  level: 3 | 5
}): React.JSX.Element {
  const Heading = level === 3 ? 'h3' : 'h5'
  const { steps, call } = change(f.fix)
  return (
    <article className="au-finding">
      <Heading className="au-finding-title">
        {f.id && `${f.id} || `}
        <Inline text={f.title} />
      </Heading>
      <div className="au-meta">
        {f.weight && <Label shape="pill" color={TONE[f.weight] ?? 'default'} text={f.weight} />}
        {f.size && (
          <Label
            shape="tag"
            color={TONE[f.size] ?? 'default'}
            fill="none"
            text={`Effort ${f.size}`}
          />
        )}
        {f.area && (
          <Label
            shape="tag"
            color="default"
            icon={<Icon name={AREA_ICON[f.area] ?? 'tag'} />}
            text={f.area}
          />
        )}
        <span>
          <Dots parts={[f.lens, f.net !== undefined && <Net net={f.net} />, f.origin]} />
        </span>
      </div>
      {f.finding && (
        <>
          <p className="au-lead">
            <strong>Finding</strong>
          </p>
          <p>
            <Inline text={f.finding} />
          </p>
        </>
      )}
      {f.fixKind && (
        <>
          <p className="au-lead au-fix">
            <strong>Fix</strong>
            <FixTag kind={f.fixKind} />
          </p>
          {f.fix && (
            <ol className="au-steps">
              {steps.map((s, i) => (
                <li key={i}>
                  <Inline text={s} />
                  {i === steps.length - 1 && f.size && (
                    <>
                      {' '}
                      <em>({f.size})</em>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
          {call && (
            <p>
              <strong>Nathan's call:</strong> <Inline text={call} />
            </p>
          )}
        </>
      )}
      {f.sources && <p className="au-sources">Sources: {f.sources.replace(/`/g, '')}</p>}
    </article>
  )
}
