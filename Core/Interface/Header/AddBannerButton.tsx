import { Button } from '@pommora/uix/Buttons/Button'

export function AddBannerButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <div className="add-banner-strip" data-reveal-host="">
      <Button
        size="button-inline"
        icon="square-plus"
        iconSize="body"
        label="Add Banner"
        reveal
        className="add-banner-btn"
        onClick={onClick}
        data-create
        aria-label="Add banner"
        title="Add a banner"
      />
    </div>
  )
}
