import { SearchField } from '@pommora/uix/Fields/SearchField'
import { input } from '@pommora/uix/Fields/fields.css'
import { FACETS, type Filters, type Finding, NO_FILTERS, matches, ordered } from './auditModel'
import { FindingReport } from './FindingReport'

export function FindingsView({
  findings,
  filters,
  onFilters,
}: {
  findings: readonly Finding[]
  filters: Filters
  onFilters: (next: Filters) => void
}): React.JSX.Element {
  const shown = new Set(findings.filter((f) => matches(f, filters)))
  const filtered = Object.values(filters).some(Boolean)
  return (
    <>
      <div className="au-filters">
        <SearchField
          className={`${input} au-search`}
          aria-label="Search titles and findings"
          value={filters.query}
          onValueChange={(query) => onFilters({ ...filters, query })}
        />
        {FACETS.map(({ key, label, canon }) => (
          <select
            key={key}
            className={`${input} au-select`}
            aria-label={label}
            value={filters[key]}
            onChange={(e) => onFilters({ ...filters, [key]: e.target.value })}
          >
            <option value="">Any {label}</option>
            {ordered(
              findings.map((f) => f[key]),
              canon,
            ).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ))}
      </div>
      <div className="au-filter-status">
        <span>
          {shown.size} of {findings.length}
        </span>
        {filtered && (
          <button type="button" className="au-clear" onClick={() => onFilters(NO_FILTERS)}>
            Clear Filters
          </button>
        )}
      </div>
      <div className="au-results">
        {findings.map((f, i) => shown.has(f) && <FindingReport key={i} finding={f} level={3} />)}
      </div>
    </>
  )
}
