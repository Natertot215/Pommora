import { style } from '@vanilla-extract/css'

/** A name that answers to no file — the same dim the editor gives a link leading nowhere, so a
 *  reference that resolves to nothing reads the one way across the app. */
export const fileLabelUnresolved = style({ opacity: 'var(--state-inactive)' })
