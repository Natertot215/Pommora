import { useRef, useState } from 'react'
import { defaultEntityIcon, iconNameOr } from '@renderer/design-system/symbols'
import { MenuScrollFrame } from '@renderer/design-system/components/menu'
import { useSession } from '../../store'
import { IconPicker } from '../../Components/IconPicker'
import { InlineEditHeader } from '../../Components/Detail/InlineEditHeader'

/** A Context group's Settings-window content: the (Icon)(Title) heading over a divider. */
export function ContextSettings({ id }: { id: string }): React.JSX.Element | null {
  const tree = useSession((s) => s.tree)
  const mutate = useSession((s) => s.mutate)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const iconRef = useRef<HTMLButtonElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const group = (tree?.contextGroups ?? []).find((g) => g.def.id === id)
  if (!group) return null
  const path = `.nexus/contexts/${group.def.title}`

  return (
    <>
      <MenuScrollFrame>
        <InlineEditHeader
          value={group.def.title}
          icon={iconNameOr(group.def.icon, defaultEntityIcon('space', defaultIcons))}
          iconRef={iconRef}
          onIconClick={() => setPickerOpen(true)}
          onCommit={(next) => {
            if (next && next !== group.def.title)
              void mutate({ op: 'renameContext', contextId: id, newName: next })
          }}
        />
      </MenuScrollFrame>
      <IconPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        triggerRef={iconRef}
        value={group.def.icon}
        onSelect={(picked) => {
          setPickerOpen(false)
          void mutate({ op: 'setIcon', path, kind: 'context', icon: picked })
        }}
      />
    </>
  )
}
