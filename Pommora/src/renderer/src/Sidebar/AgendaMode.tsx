import type { AgendaEntry } from '@shared/types'
import { Icon } from '@renderer/design-system/symbols'

const row = (e: AgendaEntry): React.JSX.Element => (
  <div key={e.id} className="agenda-row">
    <Icon name={e.icon ?? (e.kind === 'task' ? 'circle' : 'calendar')} size={16} />
    <span className="agenda-title">{e.title}</span>
  </div>
)

/**
 * The Agenda sidebar mode — a read-only list of Tasks then Events. Presentational on purpose: the
 * sidebar owns the fetch, so the mode-exit overlay renders the SAME list the outgoing mode showed
 * instead of mounting a second one that starts empty. Rows are display-only for now — no
 * `SelectionState` kind routes an agenda entity, so clicking doesn't open anything.
 */
export function AgendaMode({
  tasks,
  events,
}: {
  tasks: AgendaEntry[]
  events: AgendaEntry[]
}): React.JSX.Element {
  if (tasks.length === 0 && events.length === 0)
    return <div className="agenda-empty">No tasks or events</div>
  return (
    <div className="agenda-mode">
      {tasks.map(row)}
      {events.map(row)}
    </div>
  )
}
