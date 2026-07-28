/** Resize is a viewport, never a scale. EMBED_SCALE is the one tunable both embed kinds derive
 *  from: page embeds use it directly (px-fixed dims + log-curved zoom); view embeds first
 *  normalize the table's body text to the editor's, then apply the same zoom, so both read at
 *  one text level. */
export const EMBED_SCALE = 0.9
export const EMBED_ZOOM = 1 + Math.log2(EMBED_SCALE)
export const VIEW_EMBED_ZOOM = (15 / 13) * EMBED_ZOOM
