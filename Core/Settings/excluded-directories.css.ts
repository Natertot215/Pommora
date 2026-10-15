import { style } from '@vanilla-extract/css'

export const list = style({ display: 'flex', flexDirection: 'column', gap: '6px' })

export const row = style({ display: 'flex', alignItems: 'center', gap: '4px' })

export const field = style({ flex: '1 1 auto', minWidth: 0 })
