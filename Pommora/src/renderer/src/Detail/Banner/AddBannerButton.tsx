import { Icon } from '@renderer/design-system/symbols'

export function AddBannerButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <div className="add-banner-strip">
      <button
        type="button"
        className="add-banner-btn"
        onClick={onClick}
        data-create
        aria-label="Add banner"
        title="Add a banner"
      >
        <Icon name="square-plus" size={14} />
        Add Banner
      </button>
    </div>
  )
}
