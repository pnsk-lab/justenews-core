import { generateText, streamText } from 'ai'
import { cohere } from './model.ts'
import { search } from './search.ts'
import { htmlToMarkdown } from 'webforai'

const generateSearchQuery = async (prompt: string) => {
  const generated = await generateText({
    model: cohere('command-r'),
    system:
      'Create search queries more than 5 from inputted text. Queries should be splitted by newlines.',
    prompt,
  })

  return generated.text.split('\n').filter(Boolean)
}
const searchFromQueries = async (queries: string[], target: string) => {
  const searchedPages: Record<string, {
    title: string
    description: string
  }> = {}

  for (const urls of await Promise.all(queries.map((query) => search(query)))) {
    for (const [url, data] of urls) {
      searchedPages[url] = data
    }
  }

  const searchedIndex: string[] = Object.keys(searchedPages)
  const toPassAI = Object.fromEntries(
    Object.values(searchedPages).map((d, i) => {
      return [i, d]
    }).sort(() => Math.random() - 0.5),
  )

  const choseUrls = (JSON.parse(
    (await generateText({
      model: cohere('command-r'),
      system:
        `「${target}」についてのニュースを書くのに必要な記事をJSONから3つ選択し、number[]の形のJSONで答えよ。コードブロックで囲まないで。JSON以外の出力禁止。`,
      prompt: JSON.stringify(toPassAI),
      temperature: 1,
    })).text,
  ) as number[]).map((i) => searchedIndex[i]).filter(Boolean)

  return {
    aiChose: choseUrls,
    random() {
      const result = new Set<string>()
      for (let i = 0; i < 3; i++) {
        result.add(
          searchedIndex[Math.floor(Math.random() * searchedIndex.length)],
        )
      }
      return [...result]
    },
  }
}
const markdownNewsFromURLs = async (urls: string[]) => {
  const images: { alt: string; src: string }[] = []
  const processHTML = (html: string) => {
    /*const dom = new DOMParser().parseFromString(html, 'text/html')
    for (const img of dom.querySelectorAll('img[src][alt]')) {
      const src = img.getAttribute('src')
      let alt = img.getAttribute('alt')

      let parent = img.parentElement
      while (true) {
        if (!parent) break
        parent = parent.parentElement
        if (parent?.tagName === 'figure') {
          const figcaption = parent.getElementsByClassName('figcaption')[0]
          if (figcaption) {
            alt = figcaption.textContent
          }
          break
        }
      }
      if ((alt?.length ?? 0) < 10) {
        continue
      }
      src && alt && images.push({
        src,
        alt
      })
    }
    console.log(images)*/
    return htmlToMarkdown(html)
  }
  return (await Promise.all(
    urls.map((url) => fetch(url).then((res) => res.text()).then(processHTML)),
  ))
    .join('\n\n\n---\n\n\n')
}

export const searchWeb = async (target: string) => {
  console.log('Generating queries...')
  const queries = await generateSearchQuery(target)

  console.log('Searching web...')
  const searched = await searchFromQueries(queries, target)

  return searched
}

type Searched = Record<string, {
  title: string
  description: string
}>
export const writeNews = async (
  target: string,
  urls: string[],
  id?: string,
) => {
  console.log('Generate source article...', id)
  const news = await generateText({
    model: cohere('command-r-plus'),
    system:
      `"${target}"の観点から3記事を Markdown を使ったニュースとしてまとめて。`,
    prompt: await markdownNewsFromURLs(urls),
    maxTokens: 2048,
  })

  return {
    news: news.text,
  }
}
