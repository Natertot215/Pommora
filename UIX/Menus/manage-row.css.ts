import { style } from '@vanilla-extract/css'

export const bounds = style({ minWidth: '250px', maxWidth: '500px' })

export const pane = style([bounds, { padding: 'var(--surface-inset)' }])
