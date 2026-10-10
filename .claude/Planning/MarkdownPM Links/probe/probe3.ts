import { markdownLinkRegex } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Connections/links'
import { tokenize } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/tokens'
import { linksIn } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Connections/scan'
for (const s of ['[x]([[T]])', '[[T|[a](b)]]', '![[T]]']) {
  console.log(JSON.stringify(s), 'regex:', JSON.stringify([...s.matchAll(markdownLinkRegex())].map(m=>m[0])), 'tokens:', JSON.stringify(tokenize(s).map(k=>k.kind)), 'scan:', JSON.stringify([...linksIn(s)].map(h=>h.syntax+':'+h.target)))
}
