import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Button, type ButtonType } from '@pommora/uix/Buttons/Button'
import { coarse, useHoverReveal } from '@pommora/uix/Interactions/hoverReveal'
import { rowAccessory } from '@pommora/uix/Menus/menu-row.css'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import type { IconName } from '@pommora/uix/Symbols'
import { MarkdownEditor } from '../MarkdownPM/MarkdownEditor'
import { useEditorHost } from '../Pages/editorHost'
import { ENTRIES } from './infoIndex'
import './info-button.css'

const INFO_DWELL_MS = 500 // KNOB

// One pane shows at a time: an opening pane closes whichever was open, which the dismissal stack doesn't do, closing only on presses and Escape.
let shown: (() => void) | null = null

type InfoLook = { icon?: IconName; type?: ButtonType; outline?: boolean }

/** The glyph a row carries after its title, opening the row's explanation: resting on it opens the pane, a click holds it open, and a tap opens it on touch. */
export function InfoButton({
  title,
  icon = 'info',
  type = 'filled',
  outline = false,
  children,
}: { title: string; children: ReactNode } & InfoLook): React.JSX.Element {
  const [held, setHeld] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // A dwelling reveal rests open on a touch screen, so there the pane takes no dwell and opens on a tap alone.
  const { on, hover, reset } = useHoverReveal({ dwellMs: coarse() ? undefined : INFO_DWELL_MS })
  const open = held || on
  const close = useCallback((): void => {
    setHeld(false)
    reset()
  }, [reset])
  useEffect(() => {
    if (!open) return
    shown?.()
    shown = close
    return () => {
      if (shown === close) shown = null
    }
  }, [open, close])
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a hover host and a click boundary; the glyph inside is the keyboard's control
    <span
      className="info-button"
      onPointerEnter={() => hover(true)}
      onPointerLeave={() => hover(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        ref={triggerRef}
        type={type}
        outline={outline}
        size="button-inline"
        paddingX="0"
        icon={icon}
        pressed={open}
        className={rowAccessory}
        aria-label={`${title} - Info`}
        onClick={() => (held ? close() : setHeld(true))}
      />
      <PickerMenu
        open={open}
        onDismiss={close}
        triggerRef={triggerRef}
        focus="keep"
        contentClassName="info-pane"
      >
        {children}
      </PickerMenu>
    </span>
  )
}

/** The InfoButton a row carries for the InfoIndex entry its ID names. */
export const infoFor = (id: string, title: string, look?: InfoLook): React.JSX.Element => (
  <InfoButton title={title} {...look}>
    <Entry body={ENTRIES.get(id) ?? ''} />
  </InfoButton>
)

function Entry({ body }: { body: string }): React.JSX.Element {
  const host = useEditorHost({ inert: true })
  return (
    <MarkdownEditor
      initialBody={body}
      onChange={() => {}}
      host={host}
      readOnly
      selectable={false}
    />
  )
}
