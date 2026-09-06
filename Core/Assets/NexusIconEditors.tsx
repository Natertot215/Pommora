import type { RefObject } from 'react'
import { IconChoice } from './IconChoice'
import { ImagePicker } from './ImagePicker'
import type { useNexusIcon } from './useNexusIcon'

/** The glyph picker and the photo cropper the nexus icon opens, anchored to whatever trigger carries it. */
export function NexusIconEditors({
  icon,
  triggerRef,
}: {
  icon: ReturnType<typeof useNexusIcon>
  triggerRef: RefObject<Element | null>
}): React.JSX.Element {
  return (
    <>
      <IconChoice
        open={icon.pickerOpen}
        onClose={() => icon.setPickerOpen(false)}
        triggerRef={triggerRef}
        value={icon.profileIcon}
        onSelect={icon.selectGlyph}
      />
      <ImagePicker
        open={icon.editing}
        value={icon.profileImage ?? ''}
        shape="circle"
        boxAspect={1}
        onCancel={icon.closeEditor}
        onSave={icon.onSave}
        onRepick={icon.onRepick}
      />
    </>
  )
}
