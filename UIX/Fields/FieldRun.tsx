import { Fragment } from 'react'
import { OverScroll } from '../Interactions/OverScroll'
import * as fr from './field-run.css'
import { PlainLabel } from '../Labels/recipes'

interface RunEntry {
  key: string
  label: string
  icon?: React.ReactNode
  /** Opts into the hover-×. It removes THIS entry, so the handler owns what that means. */
  onRemove?: () => void
}

export function FieldRun({ entries }: { entries: RunEntry[] }): React.JSX.Element {
  return (
    <OverScroll className={fr.fieldRun}>
      {entries.map((e, i) => (
        <Fragment key={e.key}>
          {i > 0 && <span className={fr.runDivider} />}
          <span className={fr.runItem}>
            <PlainLabel
              text={e.label}
              icon={e.icon}
              {...(e.onRemove ? { onRemove: e.onRemove } : {})}
            />
          </span>
        </Fragment>
      ))}
    </OverScroll>
  )
}
