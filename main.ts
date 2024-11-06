import { generateText } from 'ai'
import { searchWeb, writeNews } from './one-news.ts'
import { cohere } from './model.ts'
import { commitContent } from './commit.ts'

const TARGET = Deno.args[0]

if (!TARGET) {
  throw new Error('Target prompt is needed.')
}

const searched = await searchWeb(TARGET)

console.log(searched.aiChose, searched.random())

const sources = new Set<string>()
const newses = await Promise.all([searched.aiChose, searched.random(), searched.random()].map((urls, id) => {
  for (const url of urls) {
    sources.add(url)
  }
  return writeNews(TARGET, urls, id.toString())
}))

const generated = (await generateText({
  model: cohere('command-r-plus'),
  system: `Generate a news from 3 articles, about "${TARGET}". At least, 5 sections are needed. Analysis from multiple perspectives. News generated should have a top-level heading in output markdown.`,
  prompt: newses.map(({ news }) => news).join('\n\n\n---\n\n\n'),
  maxTokens: 4096
})).text

const generatedTime = new Date()
const yaml = `---
title: ${generated.match(/^# .+$/m)![0].slice(2)}
generated: ${generatedTime.toISOString()}
prompt: ${TARGET}
sources:
${[...sources].map(source => `  - ${source}`).join('\n')}
---`
const markdown = `${yaml}

${generated}

${newses.map(({ news }, i) => `<details>
<summary>Source ${i}</summary>

${news}

</details>`).join('\n')}`
await commitContent(new Date(), markdown)
