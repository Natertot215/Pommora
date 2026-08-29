import { Segmented, type Segment } from '@renderer/DesignSystem/Buttons'

/**
 * The glass pill is a separate in-flow layer from the live buttons so it can fade independently as
 * the inspector swallows the trio, leaving the icons riding on the inspector's glass with no
 * double-glass — driven by --io (toolbar.css). In-flow so the liquid glass measures + clips crisply
 * (absolute renders soft). `inert` + `aria-hidden` keep its duplicate buttons decorative.
 *
 * Editing this re-inits liquid glass — dev hot-reload shows a broken frame until a full reload; cold
 * loads and the production build are clean.
 */
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
