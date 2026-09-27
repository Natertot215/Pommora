import { globalStyle, style } from '@vanilla-extract/css'
import { STATE_OPACITY, vars as colorVars } from '../Theme/color.css'
import type { IconSize } from '../Theme/theme-vars.css'
import { duration, easing } from '../Animations/motion'
import { accessoryButton, flushAffordance, rowBox, rowDragging } from './menu-row.css'
import { button as eyeToggleButton } from '../Elements/eye-toggle.css'
import { menuAnchor } from './menuAnchor'
import { stack } from '../Theme/stack'
import { fieldRing } from '../Fields/fieldRing'
import { revealDim } from '../Interactions/hover-reveal.css'
import { tintAt } from '../Theme/colors'
const c = colorVars.color

// KNOBS — the ViewFrame tunables.
const SIZE = {
  iconPickerButton: 28,
  dragHighlightRadius: 6,
}

const OPTION = {
  gapAroundLabel: 6, // "Options" → first chip (the gap ABOVE "Options" is the header's own bottom pad)
  gapBetweenChips: 6,
  chipPadX: 6,
  groupGap: 12,
  compactTitleGap: 8,
}

export const ICON = {
  editorMenu: 'body',
  doc: 'control',
  rootEntry: 'headline',
  rowPlus: 'control',
  optionsAdd: 'control',
  optionEdit: 'body',
} satisfies Record<string, IconSize>

export const anchor = style(menuAnchor('right', stack.local.lifted))

export const header = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '2px 0 6px 2px',
  vars: { '--field-ring': c.border.base },
})

export const iconButton = style({
  flex: '0 0 auto',
  width: `${SIZE.iconPickerButton}px`,
  color: c.label.secondary,
  boxShadow: fieldRing(),
  selectors: {
    '&[aria-pressed="true"]': { vars: { '--field-ring': tintAt('var(--accent)', 'secondary') } },
  },
})

export const titleField = style({ flex: '1 1 auto', minWidth: 0 })

export const headerPhotoImg = style({
  borderRadius: '8px',
})

export const allSpacer = style({
  flex: '1 1 0px',
  transition: `flex-grow ${duration.base} ${easing.baseEase}`,
})
export const allSpacerCollapsed = style({ flexGrow: 0 })

export const allHeading = style([
  flushAffordance,
  { vars: { '--drop-outline-beat': duration.base } },
])

export const allRow = style({ color: c.label.secondary })

export { rowDragging }

export const hiddenRow = style({
  opacity: STATE_OPACITY.ghost,
  selectors: { [`${rowDragging} &`]: { opacity: 1 } },
})

export const hiddenZone = style({ flex: '1 1 auto' })

globalStyle(`${hiddenRow} ${eyeToggleButton}`, { color: c.label.tertiary, opacity: 1 })

export const frameDnd = style({
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
})

export const allHighlight = style({
  background: c.state.hover,
  borderRadius: `${SIZE.dragHighlightRadius}px`,
})

export const statusGroups = style({
  display: 'flex',
  flexDirection: 'column',
  gap: `${OPTION.groupGap}px`,
  vars: { '--row-pad-y': '0px' },
})
export const statusGroup = style({ display: 'flex', flexDirection: 'column' })

export const optionList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: `${OPTION.gapBetweenChips}px`,
  paddingTop: `${OPTION.gapAroundLabel}px`,
  vars: { '--label-pad-x': `${OPTION.chipPadX}px` },
})

export const optionRow = style([rowBox, { justifyContent: 'space-between' }])

/** KNOB — a pane's middle list region's scroll ceiling. */
const MIDDLE_MAX_HEIGHT = '280px'

export const middleRegion = style({
  position: 'relative',
  maxHeight: MIDDLE_MAX_HEIGHT,
  overflowY: 'auto',
  vars: { '--scroll-fade': 'var(--fade-base)' },
})

export const optionLead = style({
  display: 'flex',
  alignItems: 'center',
  gap: `${OPTION.compactTitleGap}px`,
  minWidth: 0,
})

export const ghostOptionRow = style([
  optionRow,
  {
    background: 'none',
    border: 'none',
    font: 'inherit',
    textAlign: 'left',
  },
])

export const ghostChip = style({
  selectors: {
    '&&': { background: 'transparent', vars: { '--melt-ground': 'transparent' } },
  },
})

export const optionAnchor = style({ position: 'relative', display: 'flex', alignItems: 'center' })

export const optionEditButton = style([accessoryButton, revealDim])

export const configEditor = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  paddingTop: `${OPTION.gapAroundLabel}px`,
})
