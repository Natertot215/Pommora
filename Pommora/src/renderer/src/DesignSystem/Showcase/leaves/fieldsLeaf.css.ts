import { style } from '@vanilla-extract/css'
import { errorRing } from '../../Components/Fields/fieldRing'
import { field } from '../../Components/Fields/fields.css'

export const errorField = style([field, errorRing()])

export const rows = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  maxWidth: '340px',
})
