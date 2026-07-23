import { useState, type CSSProperties } from 'react'
import { Icon, defaultEntityIcon, iconNameOr } from '@renderer/design-system/symbols'
import { cx } from '@renderer/design-system/cx'
import { text } from '@renderer/design-system/tokens'
import { SidePane, sidePaneWidth } from '@renderer/design-system/components/SidePane/SidePane'
import { FloatingPaneShell } from '@renderer/design-system/components/FloatingPane/FloatingPane'
import { useExitPresence } from '@renderer/design-system/useExitPresence'
import { useSession } from '../../store'
import { ContextSettings } from './ContextSettings'
import { SpaceSettings } from './SpaceSettings'
import './settingsWindow.css'

// The unified floating-chrome opening size (NavWindow/PreviewWindow's WIN block) and the
// NavWindow rail bounds — the same chrome, one column narrower.
const WIN = { minW: 360, minH: 280, defW: 700, defH: 500 }
const RAIL = { min: 120, def: 200, max: 320 }

// The bare backgrounds a window-move may start from (the NavWindow allow-list pattern).
const DRAG_SURFACES =
  '.settingswindow, .settingswindow-body, .settingswindow-rail, .settingswindow-rail-list, .settingswindow-main'

/**
 * The entity Settings window — the same floating chrome as NavWindow (one shell:
 * FloatingPaneShell + a left SidePane rail), listing every Context and its Spaces on the
 * rail with the targeted entity's settings content beside it.
 */
export function SettingsWindow(): React.JSX.Element | null {
  const target = useSession((s) => s.settingsTarget)
  const { mounted, closing } = useExitPresence(target !== null)
  // The last real target renders through the exit animation (the NavWindow presence pattern).
  const [shown, setShown] = useState(target)
  if (target !== null && target !== shown) setShown(target)
  if (!mounted || !shown) return null
  return <SettingsWindowBody closing={closing} target={shown} />
}

function SettingsWindowBody({
  closing,
  target,
}: {
  closing: boolean
  target: { kind: 'context' | 'space'; id: string }
}): React.JSX.Element {
  const close = useSession((s) => s.closeEntitySettings)
  const retarget = useSession((s) => s.openEntitySettings)
  const groups = useSession((s) => s.tree?.contextGroups ?? [])
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const [railW, setRailW] = useState(() => sidePaneWidth('settingswindow', RAIL.def))
  const style = { '--settingswindow-rail': `${railW}px` } as CSSProperties

  return (
    <FloatingPaneShell
      id="settingswindow"
      closing={closing}
      onClose={close}
      bounds={WIN}
      dragSurfaces={DRAG_SURFACES}
      className="settingswindow"
      style={style}
      ariaLabel="Settings"
    >
      <div className="settingswindow-body">
        <SidePane
          windowId="settingswindow"
          side="left"
          bounds={RAIL}
          className="settingswindow-rail"
          resizeClassName="settingswindow-rail-resize"
          resizeLabel="Resize list"
          onWidthChange={setRailW}
        >
          <div className="settingswindow-rail-list edge-fade">
            {groups.map((g) => (
              <div key={g.def.id}>
                <button
                  type="button"
                  className={cx(
                    'settingswindow-rail-row',
                    text.footnote.emphasized,
                    target.kind === 'context' && target.id === g.def.id && 'is-active',
                  )}
                  onClick={() => retarget({ kind: 'context', id: g.def.id })}
                >
                  <Icon
                    name={iconNameOr(g.def.icon, defaultEntityIcon('space', defaultIcons))}
                    size={14}
                  />
                  <span>{g.def.title}</span>
                </button>
                {g.spaces.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    className={cx(
                      'settingswindow-rail-row',
                      'is-space',
                      text.footnote.emphasized,
                      target.kind === 'space' && target.id === sp.id && 'is-active',
                    )}
                    onClick={() => retarget({ kind: 'space', id: sp.id })}
                  >
                    <Icon
                      name={iconNameOr(sp.icon, defaultEntityIcon('space', defaultIcons))}
                      size={14}
                    />
                    <span>{sp.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </SidePane>
        <div className="settingswindow-main">
          {target.kind === 'space' ? (
            <SpaceSettings id={target.id} />
          ) : (
            <ContextSettings id={target.id} />
          )}
        </div>
      </div>
    </FloatingPaneShell>
  )
}
