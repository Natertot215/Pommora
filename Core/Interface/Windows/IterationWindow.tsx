import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { WindowBase } from '@pommora/uix/Windows/WindowBase'
import { useSession } from '../../Session/store'
import { Menu, MenuItem } from '@pommora/uix/Menus'
import { infoFor } from '../../Info/InfoButton'

const VARIANTS = [
  ...(['info', 'circle-question-mark', 'circle-alert'] as const).map((icon) => ({ icon })),
  ...(['base', 'filled', 'tinted', 'solid', 'destructive'] as const).flatMap((type) => [
    { type },
    { type, outline: true },
  ]),
]

/** A blank floating surface summoned by its chord (App.tsx) for previewing a component in isolation. */
export function IterationWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.iterationOpen)
  const closeIteration = useSession((s) => s.closeIteration)
  const { mounted, closing } = useExitPresence(open, 'fast')
  if (!mounted) return null
  return (
    <WindowBase closing={closing} onClose={closeIteration} ariaLabel="Iteration" title="Iteration">
      <div
        style={{
          flex: '1',
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--window-toolbar-h) var(--app-inset) var(--app-inset)',
          overflow: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <Menu>
          <MenuItem disabled info={infoFor('label-format', 'Disabled Row')}>
            Disabled Row
          </MenuItem>
          {VARIANTS.map((look) => {
            const title = JSON.stringify(look)
            return (
              <MenuItem key={title} info={infoFor('value-format', title, look)}>
                {title}
              </MenuItem>
            )
          })}
        </Menu>
      </div>
    </WindowBase>
  )
}
