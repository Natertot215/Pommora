import { WidgetType } from '@codemirror/view'
import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'

export interface ReactDom extends HTMLElement {
  _root?: Root
  _first?: { node: ReactNode }
}

/** The one React-in-CodeMirror chassis: a widget whose DOM carries a React root that survives `updateDOM`, so a re-render never re-mounts the tree CodeMirror handed back. */
export abstract class ReactWidget extends WidgetType {
  /** The first render flushes in a microtask: after CodeMirror's update, where a flushed effect's dispatch would throw, and before the frame paints, so a widget never shows empty. A render arriving before it replaces the pending node. */
  protected render(dom: ReactDom, node: ReactNode): void {
    const root = dom._root
    if (root) {
      if (dom._first) dom._first.node = node
      else root.render(node)
      return
    }
    const fresh = createRoot(dom)
    const first = { node }
    dom._root = fresh
    dom._first = first
    queueMicrotask(() => {
      dom._first = undefined
      if (dom._root === fresh && dom.isConnected) flushSync(() => fresh.render(first.node))
    })
  }

  protected mounted(dom: HTMLElement): boolean {
    return (dom as ReactDom)._root !== undefined
  }

  /** One teardown for both lifecycles, decided after the update settles since CM hands a widget's DOM to its successor on a rebuild. `'if-detached'` spares a node that got reused, so a re-rendered tile never flashes (the embeds); `'eager'` always releases (the table widget, whose destroy is terminal). */
  protected unmount(dom: ReactDom, when: 'if-detached' | 'eager'): void {
    queueMicrotask(() => {
      const root = dom._root
      if (!root || (when === 'if-detached' && dom.isConnected)) return
      dom._root = undefined
      root.unmount()
    })
  }
}
