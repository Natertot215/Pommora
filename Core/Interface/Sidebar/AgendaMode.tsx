/**
 * The Agenda sidebar mode. The slot is form-independent — whatever Agenda becomes surfaces here —
 * so it holds its place with an empty state rather than being torn down and rebuilt alongside
 * whatever read surface Agenda grows.
 */
export function AgendaMode(): React.JSX.Element {
  return <div className="agenda-empty">No tasks or events</div>
}
