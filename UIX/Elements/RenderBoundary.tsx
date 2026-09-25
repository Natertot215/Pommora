import { Component, type ReactNode } from 'react'

interface RenderBoundaryProps {
  resetKey: unknown
  children: ReactNode
}

/** A throw while drawing the children blanks this region alone, in place of the whole window, until `resetKey` changes. */
export class RenderBoundary extends Component<RenderBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidUpdate(prev: RenderBoundaryProps, was: { failed: boolean }): void {
    if (was.failed && this.state.failed && prev.resetKey !== this.props.resetKey)
      this.setState({ failed: false })
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}
