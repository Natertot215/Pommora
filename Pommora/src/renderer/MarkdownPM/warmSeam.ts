/** The host binds `restore`/`capture` to a (tab, entity) identity at mount time — the mount-once
 *  effect freezes that binding, so a capture can never land under the NEXT tab's identity mid-switch. */
export interface WarmSeam {
  restore: () => { editorState?: unknown; scrollTop?: number } | undefined
  capture: (state: { editorState: unknown; scrollTop: number }) => void
}
