import { useState } from 'react'
import { paneMaterial } from '@renderer/DesignSystem/Glass'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { leafById } from './leaves/registry'
import { NavSections } from './NavSections'

// CSS hides this above the breakpoint and hides the sidebar below it, so the two never show at once.
export function ShowcaseMobileNav({
  activeId,
  onSelect,
}: {
  activeId: string
  onSelect: (id: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const active = leafById(activeId)
  const choose = (id: string): void => {
    onSelect(id)
    setOpen(false)
  }
  return (
    <div className="sc-mobile">
      <button
        type="button"
        className="sc-mobile-trigger"
        style={paneMaterial}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={active.icon} size={15} />
        <span className="sc-mobile-active">{active.label}</span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={15} />
      </button>
      {open && (
        <div className="sc-mobile-menu" style={paneMaterial}>
          <NavSections activeId={activeId} onSelect={choose} />
        </div>
      )}
    </div>
  )
}
