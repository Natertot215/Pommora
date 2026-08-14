// The editor's bracket around the shared pointer-gesture skeleton. A CodeMirror extension has no
// React component to hang an unmount abort on, and the skeleton drives its drags from window
// listeners — so an editor destroyed mid-drag would leave the gesture running against a dead view.
// `editorGestureCleanup` is that abort, and it goes in every extension array that starts one.
import { ViewPlugin } from '@codemirror/view'
import {
  beginPointerGesture,
  type GestureHandle,
  type PointerGestureSpec,
} from '../../design-system/interactions/gesture'

// One handle, matching the skeleton's own singleton: only one gesture is live app-wide, and the
// handle refuses to tear down a gesture that is no longer its own.
let live: GestureHandle | null = null

export function beginEditorGesture(spec: PointerGestureSpec): boolean {
  const h = beginPointerGesture(spec)
  if (h) live = h
  return h !== null
}

export const editorGestureCleanup = ViewPlugin.define(() => ({
  destroy: () => live?.abort(),
}))
