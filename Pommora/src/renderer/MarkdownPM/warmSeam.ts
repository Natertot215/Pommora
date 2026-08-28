/** The host binds `restore`/`capture` to a (tab, entity) identity at mount time — the mount-once
 *  effect freezes that binding, so a capture can never land under the NEXT tab's identity mid-switch.
 *
 *  Declared apart from the editor it is handed to: the surfaces that build a seam are the same ones
 *  the editor mounts, so a seam type living on the editor's entry makes every builder import the
 *  thing it is being built for. */
export interface WarmSeam {
  restore: () => { editorState?: unknown; scrollTop?: number } | undefined
  capture: (state: { editorState: unknown; scrollTop: number }) => void
}
