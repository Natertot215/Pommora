import { Fragment, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { Icon } from '@pommora/uix/Symbols'
import {
  type Audit as AuditDoc,
  type Filters,
  type Group,
  NO_FILTERS,
  parseAudit,
} from './auditModel'
import { FindingReport, Totals } from './FindingReport'
import { FindingsView } from './FindingsView'
import { Inline, Markdown } from './markdown'
import { HeatMap, Overview } from './Overview'
import source from './audit.md?raw'
import './audit.css'

type Load = { state: 'error'; message: string } | { state: 'ready'; audit: AuditDoc }

function parse(): Load {
  try {
    return { state: 'ready', audit: parseAudit(source) }
  } catch (err) {
    return { state: 'error', message: err instanceof Error ? err.message : String(err) }
  }
}

const load = parse()

function GroupSection({
  group,
  open,
  onToggle,
}: {
  group: Group
  open: boolean
  onToggle: () => void
}): React.JSX.Element {
  const panel = `${group.id}-findings`
  return (
    <section className="au-group">
      <h4 className="au-group-title">
        <button
          type="button"
          className="au-toggle"
          aria-expanded={open}
          aria-controls={panel}
          onClick={onToggle}
        >
          <Icon name="chevron-right" size={15} className="au-chevron" />
          <Inline text={group.label} />
        </button>
      </h4>
      {group.body && <Markdown source={group.body} />}
      <Totals findings={group.findings} />
      <div id={panel} hidden={!open}>
        {open && group.findings.map((f) => <FindingReport key={f.id} finding={f} level={5} />)}
      </div>
    </section>
  )
}

function Document({ audit }: { audit: AuditDoc }): React.JSX.Element {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const groups = [...audit.workstreams, ...audit.rideAlongs]
  const toggle = (id: string): void =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const parts = [
    { title: 'Workstreams', groups: audit.workstreams },
    { title: 'Ride-Alongs', groups: audit.rideAlongs },
  ]
  return (
    <section className="au-section" aria-labelledby="au-document-title">
      <div className="au-section-head">
        <h2 id="au-document-title">Codebase Audit</h2>
        <div className="au-bulk">
          <Button
            label="Expand All"
            disabled={open.size === groups.length}
            onClick={() => setOpen(new Set(groups.map((g) => g.id)))}
          />
          <Button
            label="Collapse All"
            disabled={open.size === 0}
            onClick={() => setOpen(new Set())}
          />
        </div>
      </div>
      {parts.map(
        (part) =>
          part.groups.length > 0 && (
            <Fragment key={part.title}>
              <h3 className="au-part">{part.title}</h3>
              {part.groups.map((g) => (
                <GroupSection
                  key={g.id}
                  group={g}
                  open={open.has(g.id)}
                  onToggle={() => toggle(g.id)}
                />
              ))}
            </Fragment>
          ),
      )}
    </section>
  )
}

export function Audit(): React.JSX.Element {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)

  const audit = load.state === 'ready' ? load.audit : undefined
  return (
    <main className="au-page">
      <header className="au-head">
        <h1>Pommora Audit</h1>
        {audit?.pin && (
          <p className="au-pin">
            <Inline text={audit.pin} />
          </p>
        )}
      </header>
      {load.state === 'error' && (
        <div className="au-status" role="alert">
          <p>The audit couldn't be loaded.</p>
          <p className="au-status-detail">{load.message}</p>
        </div>
      )}
      {audit && (
        <>
          <Overview findings={audit.findings} />
          <Document audit={audit} />
          <section className="au-section" aria-labelledby="au-heatmap-title">
            <h2 id="au-heatmap-title">Heatmap</h2>
            <HeatMap
              findings={audit.findings}
              onPick={(area, lens) => {
                setFilters({ ...NO_FILTERS, area, lens })
                document.getElementById('au-search-title')?.scrollIntoView()
              }}
            />
          </section>
          <section className="au-section au-search-section" aria-labelledby="au-search-title">
            <h2 id="au-search-title">Search</h2>
            <FindingsView findings={audit.findings} filters={filters} onFilters={setFilters} />
          </section>
        </>
      )}
    </main>
  )
}
