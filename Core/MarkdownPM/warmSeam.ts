/** The host binds `restore`/`capture` to a (tab, entity) identity at mount time — the mount-once effect freezes that binding, so a capture can never land under the NEXT tab's identity mid-switch. */
export interface WarmSeam {
  restore: () => { editorState?: unknown; scrollTop?: number } | undefined
  capture: (state: { editorState: unknown; scrollTop: number }) => void
}

/** A page edited since the capture invalidates the whole entry, since selection and history are positions into a document that no longer exists; with no known body to judge by, an entry carrying editor state mounts cold. */
export function fenceWarm<E extends { editorState?: unknown }>(
  entry: E | undefined,
  fresh: string | undefined,
): E | undefined {
  const doc = (entry?.editorState as { doc?: unknown } | undefined)?.doc
  return doc === undefined || doc === fresh ? entry : undefined
}
