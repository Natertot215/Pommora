import { useRef, useState } from 'react'
import {
  SegmentedButton,
  type Segment,
} from '@renderer/design-system/components/Segmented-Controls'
import { useDismiss } from '@renderer/design-system/components/useDismiss'
import { MenuSurface } from '@renderer/design-system/components/menu'
import { entityIcon } from '@renderer/design-system/symbols'
import { useExitPresence } from '@renderer/design-system/useExitPresence'
import { useSession } from '../store'
import * as s from './viewDropdown.css'

// Matches ViewPane's footprint — blank until its content lands.
const PANE_SQUARE = 225

export function SpaceDropdown(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useDismiss(wrapRef, () => setOpen(false), open)
  const paneP = useExitPresence(open)
  if (selection.kind !== 'space') return null

  const segment: Segment = {
    icon: entityIcon('space', undefined, defaultIcons),
    title: 'Space',
    active: open,
    onClick: () => setOpen((o) => !o),
  }

  return (
    <div ref={wrapRef} className={s.wrapper}>
      <SegmentedButton segments={[segment]} className={s.button} labelCollapsed />
      {paneP.mounted && (
        <div className={s.anchor}>
          <MenuSurface closing={paneP.closing}>
            <div style={{ width: PANE_SQUARE, height: PANE_SQUARE }} />
          </MenuSurface>
        </div>
      )}
    </div>
  )
}
