// The image types Pommora serves and adopts. Main's asset protocol answers with these, the
// picker offers them, and the adopter refuses anything else — one list, so a file the dialog
// offers is always one the banner can show.

export const ASSET_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export const IMAGE_EXTS = Object.keys(ASSET_MIME).map((e) => e.slice(1))
