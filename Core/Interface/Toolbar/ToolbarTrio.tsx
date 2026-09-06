import { Segmented, type Segment } from '@pommora/uix/Buttons/Button'

/** In-flow so the liquid glass measures and clips crisply (absolute renders soft). Editing this re-inits liquid glass — dev hot-reload shows a broken frame until a full reload. */
export function ToolbarTrio({ segments }: { segments: Segment[] }): React.JSX.Element {
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
