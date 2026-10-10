import { tokenize } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/tokens'
for (const t of ['[x **b**](https://a.co)', '**a [x](https://a.co) b**', '[[P|a **b**]]', '**a [[P]] b**'])
  console.log(JSON.stringify(t), JSON.stringify(tokenize(t).map((k) => [k.kind, k.range])))
