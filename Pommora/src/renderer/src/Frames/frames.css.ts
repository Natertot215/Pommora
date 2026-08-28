import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import type { IconSize } from '@renderer/DesignSystem/Tokens/size.css'
import { duration, easing } from '@renderer/DesignSystem/Animation'
import {
  accessoryButton,
  flushAffordance,
  footing,
  rowBox,
  rowDragging,
} from '@renderer/DesignSystem/Menus/menu-base.css'
import { button as eyeToggleButton } from '@renderer/DesignSystem/Elements/EyeToggle/eyeToggle.css'
import { menuAnchor } from '@renderer/DesignSystem/Menus/menu-anchor'
import { stack } from '@renderer/DesignSystem/Tokens/stack'
import { fieldRing } from '@renderer/DesignSystem/Components/Fields/fieldRing'
const c = colorVars.color

// KNOBS — every ViewFrame tunable, grouped by what it controls.
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
  dropOutline: 'control',
  rowPlus: 'control',
  optionsAdd: 'control',
  palette: 'body',
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
  color: c.label.tertiary,
  boxShadow: fieldRing(),
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
  { vars: { '--drop-outline-beat': 'var(--duration-base)' } },
])

export const allRow = style({ color: c.label.secondary })

export { rowDragging }

export const hiddenRow = style({
  opacity: 'var(--state-ghost)',
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

export const optionEditor = style({ display: 'flex', flexDirection: 'column' })

export const statusGroups = style({
  display: 'flex',
  flexDirection: 'column',
  gap: `${OPTION.groupGap}px`,
})
export const statusGroup = style({ display: 'flex', flexDirection: 'column' })

export const groupAdd = style([
  accessoryButton,
  {
    opacity: 0,
    selectors: { [`${statusGroup}:hover &`]: { opacity: 1 } },
  },
])

export const optionList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: `${OPTION.gapBetweenChips}px`,
  paddingTop: `${OPTION.gapAroundLabel}px`,
  vars: { '--label-pad-x': `${OPTION.chipPadX}px` },
})

export const optionRow = style([rowBox, { justifyContent: 'space-between' }])

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

export const paletteAnchor = style({ position: 'relative', display: 'flex', alignItems: 'center' })

export const paletteButton = style([
  accessoryButton,
  {
    opacity: 0,
    selectors: {
      [`${optionRow}:hover &`]: { opacity: 'var(--state-ghost)' },
      [`${optionRow}:hover &:hover`]: { opacity: 1, background: c.state.hover },
    },
  },
])

export const configEditor = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  paddingTop: `${OPTION.gapAroundLabel}px`,
})

export const footerLock = style({
  selectors: { [`${footing} &`]: { color: c.label.tertiary } },
})
