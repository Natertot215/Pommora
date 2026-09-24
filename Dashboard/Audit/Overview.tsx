import type { ReactNode } from 'react'
import { Label } from '@pommora/uix/Labels/Label'
import {
  FIX_KINDS,
  type Finding,
  LENSES,
  countBy,
  formatNet,
  netSum,
  ordered,
  weightCounts,
} from './auditModel'
import { FixTag, Weight, netColor } from './FindingReport'

export function HeatMap({
  findings,
  onPick,
}: {
  findings: readonly Finding[]
  onPick: (area: string, lens: string) => void
}): React.JSX.Element {
  const areas = ordered(findings.map((f) => f.area))
  const lenses = ordered(
    findings.map((f) => f.lens),
    LENSES,
  )
  const cell = new Map<string, number>()
  for (const f of findings) {
    const k = `${f.area}\u0000${f.lens}`
    cell.set(k, (cell.get(k) ?? 0) + 1)
  }
  const max = Math.max(1, ...cell.values())
  return (
    <div className="au-table-wrap">
      <table className="au-heat">
        <thead>
          <tr>
            <th scope="col">Area</th>
            {lenses.map((l) => (
              <th key={l} scope="col" title={l}>
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {areas.map((a) => (
            <tr key={a}>
              <th scope="row" title={a}>
                {a}
              </th>
              {lenses.map((l) => {
                const n = cell.get(`${a}\u0000${l}`) ?? 0
                return (
                  <td key={l}>
                    {n > 0 && (
                      <button
                        type="button"
                        className="au-heat-cell"
                        style={{ '--heat': `${20 + (60 * n) / max}%` } as React.CSSProperties}
                        aria-label={`${a}, ${l}: ${n} finding${n === 1 ? '' : 's'}`}
                        onClick={() => onPick(a, l)}
                      >
                        {n}
                      </button>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Stat({ value, label }: { value: ReactNode; label: ReactNode }): React.JSX.Element {
  return (
    <div className="au-stat">
      <div className="au-stat-value">{value}</div>
      <div className="au-stat-label">{label}</div>
    </div>
  )
}

export function Overview({ findings }: { findings: readonly Finding[] }): React.JSX.Element {
  const lensCounts = countBy(findings, 'lens')
  const fixCounts = countBy(findings, 'fixKind')
  return (
    <>
      <div className="au-stats">
        <Stat value={findings.length} label="Findings" />
        <Stat
          value={
            <span style={{ color: netColor(netSum(findings)) }}>{formatNet(netSum(findings))}</span>
          }
          label="Net Lines"
        />
        {weightCounts(findings).map(([w, n]) => (
          <Stat key={w} value={n} label={<Weight weight={w} />} />
        ))}
      </div>
      {lensCounts.size + fixCounts.size > 0 && (
        <div className="au-chips">
          {ordered([...lensCounts.keys()], LENSES).map((l) => (
            <Label key={l} shape="tag" color="default" text={`${l} ${lensCounts.get(l)}`} />
          ))}
          {ordered([...fixCounts.keys()], FIX_KINDS).map((k) => (
            <FixTag key={k} kind={k} text={`${k} ${fixCounts.get(k)}`} />
          ))}
        </div>
      )}
    </>
  )
}
