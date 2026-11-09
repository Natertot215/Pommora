import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { duration, easing } from '@pommora/uix/Animations/motion'
import { accessoryButton, flushAffordance } from '@pommora/uix/Menus/menu-row.css'
import { optionRow } from '@pommora/uix/Menus/frames.css'
import { revealDim } from '@pommora/uix/Interactions/hover-reveal.css'
import { text } from '@pommora/uix/Theme/typography.css'

const c = colorVars.color

const OPTION = {
  gapAroundLabel: 6, // "Options" → first chip (the gap ABOVE "Options" is the header's own bottom pad)
  gapBetweenChips: 6,
  chipPadX: 6,
  groupGap: 12,
  compactTitleGap: 8,
}

export const assignedFill = style({
  flex: '1 1 0px',
  transition: `flex-grow ${duration.base} ${easing.baseEase}`,
})
export const assignedFillNone = style({ flexGrow: 0 })

export const allHeading = style([flushAffordance, { vars: { '--chevron-beat': duration.base } }])

export const allRow = style({ color: c.label.secondary })

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
    font: 'inherit',
    textAlign: 'left',
  },
])

export const ghostChip = style({
  selectors: {
    '&&': { background: 'transparent', vars: { '--melt-ground': 'transparent' } },
  },
})

export const optionEditButton = style([accessoryButton, revealDim])

/** A type editor's rows, 8px apart. A collapsed `Reveal` stays mounted and would hold a flex `gap`, so the margin rides on the row inside each `Reveal` and folds away with it. */
export const configEditor = style({
  display: 'flex',
  flexDirection: 'column',
  paddingTop: `${OPTION.gapAroundLabel}px`,
})
globalStyle(
  `${configEditor} > * + :not([data-reveal]), ${configEditor} > * + [data-reveal] > * > *`,
  {
    marginTop: '8px',
  },
)
