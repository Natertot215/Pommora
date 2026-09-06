import { WidgetType } from '@codemirror/view'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

export interface ReactDom extends HTMLElement {
  _root?: Root
}

/** The one React-in-CodeMirror chassis: a widget whose DOM carries a React root that survives `updateDOM`, so a re-render never re-mounts the tree CodeMirror handed back. */
export abstract class ReactWidget extends WidgetType {
  protected render(dom: ReactDom, node: ReactNode): void {
    let root = dom._root
    if (!root) {
      root = createRoot(dom)
      dom._root = root
    }
    root.render(node)
  }

  protected mounted(dom: HTMLElement): boolean {
    return (dom as ReactDom)._root !== undefined
  }

  /** Connectivity is only decidable after the update settles: CM hands a widget's DOM to its successor on a rebuild. */
  protected unmountIfDetached(dom: ReactDom): void {
    queueMicrotask(() => {
      const root = dom._root
      if (dom.isConnected || !root) return
      dom._root = undefined
      root.unmount()
    })
  }

  protected unmountSoon(dom: ReactDom): void {
    const root = dom._root
    dom._root = undefined
    if (root) queueMicrotask(() => root.unmount())
  }
}
