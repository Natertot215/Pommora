import { useRef, useState } from 'react'
import { Button, Segmented } from '@pommora/uix/Buttons/Button'
import { Checkbox } from '@pommora/uix/Controls/Checkbox'
import { PickerMenu, PickerRow } from '@pommora/uix/Pickers/picker-base'
import { LedgerChart, type Window, zoomed } from './LedgerChart'
import {
  DEFAULT_FILTERS,
  FILTER_ROWS,
  type Filters,
  LEDGER,
  bands,
  dayLabel,
  fmt,
  stacked,
  sum,
} from './ledgerModel'
import './ledger.css'

const CENSUS: ReadonlyArray<[string, string]> = [
  ['source', 'source files'],
  ['tests', 'test files'],
  ['config', 'config files'],
]

export function LedgerLeaf(): React.JSX.Element {
  const { series, head, files, kinds } = LEDGER
  const last = series.length - 1
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [win, setWin] = useState<Window>({ lo: 0, hi: last })
  const [filtering, setFiltering] = useState(false)
  const filterRef = useRef<HTMLButtonElement>(null)

  const stack = bands(LEDGER, filters)
  const values = series.map((s) => stacked(s, filters))
  const today = values[last]
  const total = sum(today)
  const order = today.map((_, k) => k).sort((a, b) => today[b] - today[a])
  const i0 = Math.max(0, Math.floor(win.lo))
  const i1 = Math.min(last, Math.ceil(win.hi))

  return (
    <div className="lg-page">
      <header className="lg-masthead">
        <div className="lg-eyebrow">
          <span>Pommora</span>
          <span className="lg-dot" />
          <span>main</span>
          <span className="lg-dot" />
          <span className="lg-sha">{head}</span>
        </div>
        <h1>Line Ledger</h1>
        <div className="lg-figure">
          <span className="lg-n">{fmt(total)}</span>
          <span className="lg-k">Real code lines</span>
        </div>
        <div className="lg-census">
          {CENSUS.map(([key, label]) => (
            <span key={key}>
              <b>{fmt(kinds[key])}</b> {label}
            </span>
          ))}
        </div>
      </header>

      <div className="lg-plot">
        <div className="lg-plot-head">
          <h2>Lines by system</h2>
          <span className="lg-hint">
            Hover a day for its breakdown · pinch or ⌘-scroll to zoom · drag to pan
          </span>
          <div className="lg-zoom">
            <Segmented
              type="solid"
              segments={[
                {
                  icon: 'minus',
                  title: 'Zoom out',
                  disabled: win.hi - win.lo >= last,
                  onClick: () => setWin(zoomed(win, last, 1.6)),
                },
                {
                  icon: 'plus',
                  title: 'Zoom in',
                  disabled: win.hi - win.lo <= 3,
                  onClick: () => setWin(zoomed(win, last, 1 / 1.6)),
                },
              ]}
            />
            <Button
              ref={filterRef}
              type="solid"
              size="button-large"
              icon="funnel"
              title="Include"
              aria-label="Include"
              pressed={filtering}
              onClick={() => setFiltering((o) => !o)}
            />
            <PickerMenu
              solid
              open={filtering}
              onDismiss={() => setFiltering(false)}
              triggerRef={filterRef}
            >
              {FILTER_ROWS.map((row) => (
                <PickerRow
                  key={row.key}
                  leading={<Checkbox size="compact" state={filters[row.key]} readOnly />}
                  onClick={() => setFilters({ ...filters, [row.key]: !filters[row.key] })}
                >
                  {row.label}
                </PickerRow>
              ))}
            </PickerMenu>
            <Button
              type="solid"
              size="button-large"
              label="Reset"
              onClick={() => setWin({ lo: 0, hi: last })}
            />
            <span className="lg-span">
              {dayLabel(series[i0].d)} – {dayLabel(series[i1].d)}
            </span>
          </div>
        </div>
        <LedgerChart
          dates={series.map((s) => s.d)}
          values={values}
          bands={stack}
          window={win}
          onWindow={setWin}
        />
      </div>

      <section className="lg-ledger">
        <h2>Per system</h2>
        <div className="lg-table-wrap">
          <table>
            <thead>
              <tr>
                <th>System</th>
                <th>Lines</th>
                <th>Files</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {order.map((k) => {
                const share = (today[k] / total) * 100
                return (
                  <tr key={stack[k].name}>
                    <td>
                      <div className="lg-area-name">
                        <span className="lg-sw" style={{ background: stack[k].color }} />
                        {stack[k].name}
                      </div>
                      <div className="lg-bar">
                        <i style={{ width: `${share.toFixed(1)}%`, background: stack[k].color }} />
                      </div>
                    </td>
                    <td className="lg-num">{fmt(today[k])}</td>
                    <td className="lg-num dim">{files[k] === undefined ? '—' : fmt(files[k])}</td>
                    <td className="lg-num dim">{share.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Whole app</td>
                <td>{fmt(total)}</td>
                <td>{fmt(sum(files))}</td>
                <td>100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <footer className="lg-footer">
        <p>
          Counted by <code>.claude/scripts/loc.py</code> across the app's three workspaces. Lines
          are source only: the count drops every comment and blank line, and this dashboard,{' '}
          <code>node_modules</code>, and build output are outside it entirely. The include menu
          folds three groups back in or out: import and export statements (counted inside each
          system, and on by default), comment lines (one grey band across the whole app), and the
          code lines of each system's test files. Build and tooling files —{' '}
          <code>package.json</code>, <code>tsconfig</code>, the Vite and Vitest configuration, and
          the <code>.d.ts</code> shims — stay out under every setting. The census splits the same
          tree three ways so it states what the line total leaves out. Per-system file counts are
          source files.
        </p>
      </footer>
    </div>
  )
}
