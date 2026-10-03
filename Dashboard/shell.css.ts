import { style } from '@vanilla-extract/css'
import { stack } from '@pommora/uix/Theme/stack'

const INSET = '12px'

export const corner = {
  left: style({ position: 'fixed', top: INSET, left: INSET, zIndex: stack.local.overlay }),
  right: style({ position: 'fixed', top: INSET, right: INSET, zIndex: stack.local.overlay }),
}
