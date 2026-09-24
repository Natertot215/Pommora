import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { WindowBase } from '@pommora/uix/Windows/window-base'
import { footerLabel } from '../Actions/toggleLabels'
import { Subfield } from '../Interface/Subfield/Subfield'
import { shellRegion, useWindowGeometry } from '../Interface/Windows/useWindowGeometry'
import { useSession } from '../Session/store'
import { matrixWindow } from './matrix.css'
import { MatrixView } from './MatrixView'
import { MATRIX_REF, MATRIX_TITLE } from './matrixKind'
import { useMatrixCount } from './useMatrixRuntime'

export function MatrixWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.pageWindow?.kind === 'matrix')
  const { mounted, closing } = useExitPresence(open)
  if (!mounted) return null
  return <MatrixWindowBody closing={closing} />
}

function MatrixWindowBody({ closing }: { closing: boolean }): React.JSX.Element {
  const geometry = useWindowGeometry('matrix')
  const closeWindow = useSession((s) => s.closeWindow)
  const select = useSession((s) => s.select)
  const count = useMatrixCount()
  const promote = (): void => {
    closeWindow()
    void select(MATRIX_REF)
  }
  return (
    <WindowBase
      {...geometry}
      region={shellRegion}
      className={matrixWindow}
      closing={closing}
      onClose={() => closeWindow()}
      ariaLabel={MATRIX_TITLE}
      onScan={promote}
      scanLabel="New Tab"
      footer={<Subfield page={null} count={count} selection={MATRIX_REF} />}
      footerLabel={footerLabel}
    >
      <MatrixView />
    </WindowBase>
  )
}
