import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'

const c = colorVars.color

export const section = style({ display: 'flex', flexDirection: 'column', gap: '4px' })

/** One config row — leading glyph, label, trailing picker trigger. */
export const row = style({ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '28px' })

export const leading = style({ display: 'inline-flex', color: c.label.secondary })

/** The row label (Date · Day · Time) — matching the URL editor's rows. */
export const label = style([text.control.emphasized, { flex: '1 1 auto', color: c.label.primary }])
