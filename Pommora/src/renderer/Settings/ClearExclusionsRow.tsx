import { Button } from '@renderer/DesignSystem/Buttons'
import { MenuRowView } from '@renderer/DesignSystem/Menus'

export function ClearExclusionsRow({
  label,
  hint,
}: {
  label: string
  hint: string
}): React.JSX.Element {
  const clear = (): void => {
    void window.nexus.clearExclusions().then((r) => {
      if (!r.ok) void window.nexus.showError(r.error.message)
    })
  }
  return (
    <MenuRowView
      row={{
        kind: 'item',
        label,
        caption: hint,
        trailing: {
          kind: 'field',
          children: <Button type="destructive" label="Clear" onClick={clear} />,
        },
      }}
    />
  )
}
