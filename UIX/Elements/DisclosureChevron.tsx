import { Icon } from '../Symbols'
import { cx } from '../Utilities/cx'
import { chevron, chevronOpen, chevronSpacer } from './disclosure.css'

/** 'spacer' keeps a leaf's glyph in the chevron's column; 'none' renders nothing. */
export type ChevronKind = 'chevron' | 'spacer' | 'none'

export function DisclosureChevron({
  kind = 'chevron',
  open = false,
  onToggle,
}: {
  kind?: ChevronKind
  open?: boolean
  onToggle?: () => void
}): React.JSX.Element | null {
  switch (kind) {
    case 'chevron':
      return (
        <Icon
          name="chevron-right"
          size="control"
          className={cx(chevron, open && chevronOpen)}
          data-chevron
          {...(onToggle && {
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              onToggle()
            },
            'data-drag-slop': '',
          })}
        />
      )
    case 'spacer':
      return <span className={chevronSpacer} data-chevron-spacer />
    case 'none':
      return null
  }
}
