import { isMarkdownFile } from '../../Files/walk'
import { splitFrontmatter } from '../../Files/pageFile'
import { contentId } from '../../Nexus/identityMark'
import { liveIdOf } from '../../Nexus/valuesChanged'
import { join } from '../../Paths/posix'
import { captureIfDue } from '../../Pages/fileHistory'
import { type CaptureReason, captureStore } from '../../Platform/stores'

export async function captureLoser(
  root: string,
  rel: string,
  bytes: Uint8Array,
  reason: CaptureReason,
): Promise<void> {
  captureStore()?.addCapture(rel, Date.now(), reason, bytes)
  if (!isMarkdownFile(rel)) return
  const text = new TextDecoder().decode(bytes)
  const pageId = contentId(splitFrontmatter(text)) ?? liveIdOf(root, join(root, rel))
  if (pageId !== undefined) await captureIfDue(root, pageId, text, 'external')
}
