import { Fragment, type ComponentProps, type ReactNode } from 'react'
import { Icon, type IconName } from '../Symbols'
import { DualSwitch } from '../Components/Controls/Switches/DualSwitch'
import { ColorSwatch } from '../Components/Controls/Switches/ColorSwatch'
import { Slider } from '../Components/Controls/Slider/Slider'
import { PickerControl } from '../Elements/PickerControl'
import { cx } from '../Util/cx'
import { AccessoryButton, MenuCaption, MenuItem, MenuSeparator } from './menu-row'
import { actionRow, heading, headingCaps, side, titleWrap } from './menu-base.css'

export type Trailing =
  | { kind: 'chevron' }
  | { kind: 'value'; value: ReactNode; onToggle?: () => void }
  | { kind: 'switch'; checked: boolean; onChange: (next: boolean) => void; ariaLabel: string }
  | { kind: 'button'; icon: IconName; onClick: () => void; ariaLabel: string; disabled?: boolean }
  | ({ kind: 'slider' } & ComponentProps<typeof Slider>)
  | ({ kind: 'picker'; onPick(v: string): void } & Omit<
      ComponentProps<typeof PickerControl>,
      'onPick'
    >)
  | ({ kind: 'color' } & ComponentProps<typeof ColorSwatch>)
  | { kind: 'field'; children: ReactNode }

export type MenuRow =
  | { kind: 'heading'; label: string; caps?: boolean }
  | { kind: 'separator' }
  | { kind: 'caption'; text: ReactNode }
  | { kind: 'action'; label: string; trailing?: Trailing; onClick: () => void }
  | {
      kind: 'item'
      icon?: ReactNode
      label: ReactNode
      caption?: ReactNode
      trailing?: Trailing
      selected?: boolean
      disabled?: boolean
      onSelect?: () => void
      className?: string
    }

export type MenuSection = { title?: string; caps?: boolean; rows: MenuRow[] }

function trailingNode(t: Trailing): ReactNode {
  switch (t.kind) {
    case 'chevron':
      return <Icon name="chevron-right" />
    case 'value':
      return <Icon name="chevrons-up-down" size="control" />
    case 'switch':
      return <DualSwitch checked={t.checked} onChange={t.onChange} ariaLabel={t.ariaLabel} />
    case 'button':
      return (
        <AccessoryButton
          icon={t.icon}
          size="body"
          ariaLabel={t.ariaLabel}
          disabled={t.disabled}
          onClick={t.onClick}
        />
      )
    case 'slider': {
      const { kind: _, ...props } = t
      return <Slider {...props} />
    }
    case 'picker': {
      const { kind: _, ...props } = t
      return <PickerControl {...props} />
    }
    case 'color': {
      const { kind: _, ...props } = t
      return <ColorSwatch {...props} />
    }
    case 'field':
      return t.children
  }
}

export function MenuRowView({ row }: { row: MenuRow }): React.JSX.Element {
  switch (row.kind) {
    case 'heading':
      return <div className={cx(heading, row.caps && headingCaps)}>{row.label}</div>
    case 'separator':
      return <MenuSeparator />
    case 'caption':
      return <MenuCaption>{row.text}</MenuCaption>
    case 'action':
      return (
        <button type="button" className={actionRow} onClick={row.onClick}>
          <span className={titleWrap}>{row.label}</span>
          {row.trailing && <span className={side}>{trailingNode(row.trailing)}</span>}
        </button>
      )
    case 'item': {
      const t = row.trailing
      return (
        <MenuItem
          className={row.className}
          leading={row.icon}
          subLabel={row.caption}
          value={t?.kind === 'value' ? t.value : undefined}
          trailing={t && trailingNode(t)}
          selected={row.selected}
          disabled={row.disabled}
          onClick={(t?.kind === 'value' && t.onToggle) || row.onSelect}
        >
          {row.label}
        </MenuItem>
      )
    }
  }
}

const rowKey = (row: MenuRow, ordinal: number): string =>
  'label' in row && typeof row.label === 'string' ? row.label : `${row.kind}:${ordinal}`

export function MenuIndex({ sections }: { sections: MenuSection[] }): React.JSX.Element {
  let ordinal = 0
  return (
    <>
      {sections.map((section) =>
        section.title || section.rows.length ? (
          <Fragment key={section.title ?? `section:${ordinal++}`}>
            {section.title && (
              <MenuRowView row={{ kind: 'heading', label: section.title, caps: section.caps }} />
            )}
            {section.rows.map((row) => (
              <MenuRowView key={rowKey(row, ordinal++)} row={row} />
            ))}
          </Fragment>
        ) : null,
      )}
    </>
  )
}
