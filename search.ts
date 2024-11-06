import { DOMParser } from '@b-fuze/deno-dom'

export const search = async (query: string) => {
  const result = new Map<string, {
    title: string
    description: string
  }>()

  const html = await fetch(`https://html.duckduckgo.com/html?q=${encodeURI(query)}`).then(res => res.text())

  const dom = new DOMParser().parseFromString(html, 'text/html')
  const links = dom.getElementById('links')
  if (!links) {
    return result
  }

  const selected = links.querySelectorAll('.result.results_links.results_links_deep.web-result')
  for (const page of selected) {
    const titleElement = page.getElementsByClassName('result__a')[0]
    const url = new URL(titleElement.getAttribute('href') ?? '', 'http://duckduckgo.com').searchParams.get('uddg')
    const description = page.getElementsByClassName('result__snippet')[0].textContent

    url && result.set(url, {
      title: titleElement.textContent,
      description
    })
  }
  return result
}