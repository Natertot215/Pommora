import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import type { IconSize } from '@renderer/DesignSystem/Tokens/size.css'
import { duration, easing } from '@renderer/DesignSystem/Animation'
import {
  accessoryButton,
  footing,
  footingLabel,
  rowDragging,
} from '@renderer/DesignSystem/Menus/menu-base.css'
import { button as eyeToggleButton } from '@renderer/DesignSystem/Elements/EyeToggle/eyeToggle.css'
import { menuAnchor } from '@renderer/DesignSystem/Menus/menu-anchor'
import { stack } from '@renderer/DesignSystem/Tokens/stack'
import { fieldRing } from '@renderer/DesignSystem/Components/Fields/fieldRing'
const c = colorVars.color

// ═══════════════════════════════════════════════════════════════════════════
// KNOBS — every ViewFrame tunable, grouped by what it controls. Tune here;
// the styles below (ordered top-to-bottom as the frame renders) only consume.
// ═══════════════════════════════════════════════════════════════════════════

const SIZE = {
  topRowActionWidth: 20, // height hugs the glyph
  iconPickerButton: 28,
  dragHighlightRadius: 6,
}

const OPTION = {
  gapAroundLabel: 6, // "Options" → first chip (the gap ABOVE "Options" is the header's own bottom pad)
  gapBetweenChips: 6,
  chipPadX: 6, // option chip horizontal padding — retunes the shared label default, this frame only
  groupGap: 12, // status only: gap between one group's block (heading + chips) and the next
  compactTitleGap: 8, // a Compact chip → the name standing beside it
}

export const ICON = {
  add: 'body', // the header ⊕ (square-plus) — sized to the back-row heading
  editorMenu: 'body', // the editor header's ⋮ — sized to the back-row heading
  doc: 'control', // the property-type icon on every row (assigned · registry · type picker)
  rootEntry: 'title3', // the root menu's leading icons (Properties · Visibility · …)
  dropOutline: 'control', // the All Properties disclosure chevron
  rowPlus: 'control', // the registry row's + glyph
  optionsAdd: 'control', // the option editor's "Options" + glyph
  palette: 'body', // the option row's hover recolor glyph
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

export const topRowAction = style([
  accessoryButton,
  {
    flex: '0 0 auto',
    width: `${SIZE.topRowActionWidth}px`,
    justifyContent: 'flex-end',
    color: c.label.secondary,
  },
])

export const allSpacer = style({
  flex: '1 1 0px',
  transition: `flex-grow ${duration.base} ${easing.baseEase}`,
})
export const allSpacerCollapsed = style({ flexGrow: 0 })

export const allHeading = style({
  vars: { '--drop-outline-beat': 'var(--duration-base)', '--row-pad-lead': '0px' },
  width: '100%',
  border: 'none',
  background: 'none',
})

export const allRow = style({ color: c.label.secondary })

export const toggleRow = style({})

export const rowPlus = accessoryButton

export { rowDragging }

export const hiddenRow = style({
  opacity: 'var(--state-ghost)',
  selectors: { [`${rowDragging} &`]: { opacity: 1 } },
})

export const hiddenZone = style({ flex: '1 1 auto' })

globalStyle(`${hiddenRow} ${eyeToggleButton}`, { color: c.label.tertiary, opacity: 1 })

export const eyeInert = style([
  accessoryButton,
  {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 'var(--state-ghost)',
  },
])

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

export const optionsAdd = accessoryButton

export const groupAdd = style([
  optionsAdd,
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

export const optionRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

export const optionLead = style({
  display: 'flex',
  alignItems: 'center',
  gap: `${OPTION.compactTitleGap}px`,
  minWidth: 0,
})

export const compactTitle = style([
  text.control.standard,
  { color: c.label.control, whiteSpace: 'nowrap' },
])

export const ghostOptionRow = style([
  optionRow,
  {
    background: 'none',
    border: 'none',
    padding: 0,
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

export const configRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: '24px',
})

export const configLabel = style([text.control.emphasized, { color: c.label.primary }])

export const crumbRow = style([
  footingLabel,
  { display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 },
])

export const footerLock = style({
  selectors: { [`${footing} &`]: { color: c.label.tertiary } },
})
