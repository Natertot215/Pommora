import { GlassSurface } from '../Materials'
import { Icon } from '../Symbols'
import { NavSections } from './NavSections'

export function ShowcaseSidebar({
  activeId,
  onSelect,
  onCollapse,
}: {
  activeId: string
  onSelect: (id: string) => void
  onCollapse: () => void
}): React.JSX.Element {
  return (
    <GlassSurface className="sc-sidebar">
      <div className="sc-sidebar-head">
        <span className="sc-brand">Pommora</span>
        <button
          type="button"
          className="sc-icon-btn"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          onClick={onCollapse}
        >
          <Icon name="log-out" size={16} className="flip-x" />
        </button>
      </div>
      <nav className="sc-nav">
        <NavSections activeId={activeId} onSelect={onSelect} />
      </nav>
    </GlassSurface>
  )
}
