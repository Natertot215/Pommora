// The words every settings row wears, whatever writes beside them — one shape for the roster's
// config-driven rows and the fetched sections alike.
import { cx } from '@renderer/DesignSystem/Util/cx'
import { text } from '@renderer/DesignSystem/Tokens'

export interface RowText {
  label: string
  hint: string
}

export function SettingsRow({
  label,
  hint,
  children,
}: RowText & { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <span className={cx('settings-row-label', text.body.standard)}>{label}</span>
        <span className={cx('settings-row-hint', text.footnote.standard)}>{hint}</span>
      </div>
      {children}
    </div>
  )
}
