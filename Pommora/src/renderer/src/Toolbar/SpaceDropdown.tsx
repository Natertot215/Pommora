import { useRef, useState } from 'react'
import {
  SegmentedButton,
  type Segment,
} from '@renderer/design-system/components/Segmented-Controls'
import { useDismiss } from '@renderer/design-system/components/useDismiss'
import { MenuSurface } from '@renderer/design-system/components/menu'
import { defaultEntityIcon } from '@renderer/design-system/symbols'
import { useExitPresence } from '@renderer/design-system/useExitPresence'
import { useSession } from '../store'
import * as s from './viewDropdown.css'

// The pane opens at the ViewPane's footprint — same square, blank body until its content lands.
const PANE_SQUARE = 225

/**
 * The Space dropdown — the ViewDropdown's slot when a Space is active. The glyph is the
 * contexts default icon; clicking opens the ViewPane-footprint pane, deliberately blank
 * until its content is designed.
 */
export function SpaceDropdown(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useDismiss(wrapRef, () => setOpen(false), open)
  const paneP = useExitPresence(open)
  if (selection.kind !== 'space') return null

  const segment: Segment = {
    icon: defaultEntityIcon('space', defaultIcons),
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
