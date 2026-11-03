import { type RefObject, useCallback, useRef } from 'react'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { ColorPicker } from '@pommora/uix/Pickers/ColorPicker'
import { type IconFavorites, IconPicker } from '@pommora/uix/Pickers/IconPicker'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { iconFavoriteMenuItems } from '../Actions/identityMenus'
import { popMenu } from '../Actions/menuActions'
import { personalizationOf } from '../Session/configSlice'
import { useSession } from '../Session/store'

const NO_FAVORITES: string[] = []

function useIconFavorites(): IconFavorites {
  const ids = useSession((st) => personalizationOf(st).iconFavorites) ?? NO_FAVORITES
  const setPersonalization = useSession((st) => st.setPersonalization)
  const onChange = useCallback(
    (next: string[]) => setPersonalization('iconFavorites', next.length ? next : undefined),
    [setPersonalization],
  )
  return {
    ids,
    onChange,
    onMenu: (isIconFavorite) => popMenu(iconFavoriteMenuItems(isIconFavorite)),
  }
}

export function chooseIcon(
  trigger: Element | null,
  value: string | undefined,
  onPick: (icon: string) => void,
): void {
  if (trigger) useSession.getState().requestChoice({ of: 'icon', trigger, value, onPick })
}

export function chooseColor(
  trigger: Element | null,
  value: string | undefined,
  onPick: (color: string | undefined) => void,
  greyscale?: boolean,
): void {
  if (trigger)
    useSession.getState().requestChoice({ of: 'color', trigger, value, onPick, greyscale })
}

export const useChoiceOpen = (trigger: RefObject<Element | null>): boolean =>
  useSession((st) => st.pendingChoice !== null && st.pendingChoice.trigger === trigger.current)

export function useIconChoice<E extends Element = HTMLButtonElement>(
  value: string | undefined,
  onPick: (icon: string) => void,
) {
  const iconRef = useRef<E>(null)
  return {
    iconRef,
    iconOpen: useChoiceOpen(iconRef),
    onIconClick: () => chooseIcon(iconRef.current, value, onPick),
  }
}

export function IdentityChoice(): React.JSX.Element {
  const pending = useSession((st) => st.pendingChoice)
  const dismiss = useSession((st) => st.dismissChoice)
  const shown = useHeld(pending, pending !== null)
  const triggerRef = useLatest(shown?.trigger ?? null)
  const iconFavorites = useIconFavorites()
  return (
    <>
      <IconPicker
        open={pending?.of === 'icon'}
        onClose={dismiss}
        triggerRef={triggerRef}
        value={pending?.value}
        onSelect={pending?.of === 'icon' ? pending.onPick : undefined}
        iconFavorites={iconFavorites}
      />
      <ColorPicker
        greyscale={pending?.of === 'color' ? pending.greyscale : undefined}
        open={pending?.of === 'color'}
        selected={colorNameFor(pending?.value)}
        onPick={(color) => {
          if (pending?.of === 'color') pending.onPick(color)
          dismiss()
        }}
        onDismiss={dismiss}
        triggerRef={triggerRef}
      />
    </>
  )
}
