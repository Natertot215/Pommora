import { Segmented, type Segment } from '@pommora/uix/Buttons/Button'

/** In-flow so the liquid glass measures and clips crisply (absolute renders soft). Editing this re-inits liquid glass — dev hot-reload shows a broken frame until a full reload. */
export function ToolbarTrio({
  segments,
  flat,
}: {
  segments: Segment[]
  flat: boolean
}): React.JSX.Element {
  if (flat)
    return (
      <div className="toolbar-trio toolbar-trio--flat">
        <Segmented radius="var(--trio-radius)" segments={segments} trailingDivider />
      </div>
    )
  return (
    <div className="toolbar-trio">
      <div className="toolbar-trio-glass" aria-hidden inert>
        <Segmented glass radius="var(--trio-radius)" segments={segments} />
      </div>
      <div className="toolbar-trio-cover">
        <Segmented radius="var(--trio-radius)" segments={segments} />
      </div>
    </div>
  )
}
