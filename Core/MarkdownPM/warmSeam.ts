/** The mount-once effect freezes the seam a host passes at mount, so the seam alone resolves the (owner, entity) identity it restores and captures under. */
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
