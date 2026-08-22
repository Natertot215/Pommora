import { style } from '@vanilla-extract/css'

/** A name that answers to no file — the same dim the editor gives a link leading nowhere, so a
 *  reference that resolves to nothing reads the one way across the app. */
export const fileLabelUnresolved = style({ opacity: 'var(--state-inactive)' })

/** The click wrapper a replaceable label wears. The chip itself stays a plain span, so a label
 *  rendered read-only carries no cursor promising a gesture it doesn't have. */
export const fileLabelClickable = style({ display: 'inline-flex', cursor: 'pointer' })
