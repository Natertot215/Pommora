import { useRef, useState, type CSSProperties } from 'react'
import { Icon, defaultEntityIcon, iconNameOr } from '@renderer/design-system/symbols'
import { SidePane, sidePaneWidth } from '@renderer/design-system/components/SidePane/SidePane'
import { FloatingPaneShell } from '@renderer/design-system/components/FloatingPane/FloatingPane'
import { useExitPresence } from '@renderer/design-system/useExitPresence'
import { useSession } from '../../store'
import { CurrentColorIcon } from '../../Components/Detail/CurrentColorIcon'
import { IconPicker } from '../../Components/IconPicker'
import { InlineEditHeader } from '../../Components/Detail/InlineEditHeader'
import './settingsWindow.css'

// The unified floating-chrome opening size (the NavWindow/PreviewWindow WIN block) and the
// NavWindow rail bounds.
const WIN = { minW: 360, minH: 280, defW: 700, defH: 500 }
const RAIL = { min: 120, def: 200, max: 320 }

// The bare backgrounds a window-move may start from (the NavWindow allow-list pattern).
const DRAG_SURFACES =
  '.settingswindow, .settingswindow-toolbar, .settingswindow-body, .settingswindow-rail, .settingswindow-rail-fill, .settingswindow-main'

/**
 * The entity Settings window — the NavWindow/PreviewWindow floating chrome (the shared
 * shell + a left SidePane), the preview's glass tint, and one toolbar row holding
 * (Icon)(Title) with the × at its right. The color icon seats at the rail's bottom-left.
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
}): React.JSX.Element | null {
  const close = useSession((s) => s.closeEntitySettings)
  const mutate = useSession((s) => s.mutate)
  const groups = useSession((s) => s.tree?.contextGroups ?? [])
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const iconRef = useRef<HTMLButtonElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [railW, setRailW] = useState(() => sidePaneWidth('settingswindow', RAIL.def))
  const style = {
    '--settingswindow-rail': `${railW}px`,
    // The preview's one-background compose (inline because GlassPane's frost sets its own).
    background: 'color-mix(in srgb, var(--pgpreview-bg) var(--pgpreview-bg-a), transparent)',
  } as CSSProperties

  const space =
    target.kind === 'space'
      ? groups.flatMap((g) => g.spaces).find((s) => s.id === target.id)
      : undefined
  const group = target.kind === 'context' ? groups.find((g) => g.def.id === target.id) : undefined
  if (!space && !group) return null
  const title = space ? space.title : (group?.def.title ?? '')
  const icon = iconNameOr(
    space ? space.icon : group?.def.icon,
    defaultEntityIcon('space', defaultIcons),
  )
  const entityPath = space ? space.path : `.nexus/contexts/${group?.def.title}`

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
      closeClassName="settingswindow-close-slot"
    >
      {/* One row: (Icon)(Title) editable heading with the × at its right. */}
      <div className="settingswindow-toolbar">
        <div className="settingswindow-heading">
          <InlineEditHeader
            value={title}
            icon={icon}
            iconRef={iconRef}
            onIconClick={() => setPickerOpen(true)}
            onCommit={(next) => {
              if (!next || next === title) return
              void mutate(
                space
                  ? { op: 'renameSpace', spaceId: target.id, newName: next }
                  : { op: 'renameContext', contextId: target.id, newName: next },
              )
            }}
          />
        </div>
        <button type="button" className="settingswindow-close" aria-label="Close" onClick={close}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <IconPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        triggerRef={iconRef}
        value={space ? space.icon : group?.def.icon}
        onSelect={(picked) => {
          setPickerOpen(false)
          void mutate({
            op: 'setIcon',
            path: entityPath,
            kind: space ? 'space' : 'context',
            icon: picked,
          })
        }}
      />
      <div className="settingswindow-body">
        <SidePane
          windowId="settingswindow"
          side="left"
          bounds={RAIL}
          className="settingswindow-rail"
          resizeClassName="settingswindow-rail-resize"
          resizeLabel="Resize pane"
          onWidthChange={setRailW}
        >
          <div className="settingswindow-rail-fill" />
          {space && (
            <div className="settingswindow-color">
              <CurrentColorIcon
                color={space.color}
                onPick={(color) => void mutate({ op: 'setSpaceColor', spaceId: space.id, color })}
              />
            </div>
          )}
        </SidePane>
        <div className="settingswindow-main" />
      </div>
    </FloatingPaneShell>
  )
}
