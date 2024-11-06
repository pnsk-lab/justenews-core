import '@std/dotenv/load'
import { Buffer } from 'node:buffer'

export const commitContent = async (
  generated: Date,
  content: string
) => {
  const base64 = Buffer.from(content).toString('base64')
  const path = `news/${generated.getFullYear()}/${(generated.getMonth() + 1).toString().padStart(2, '0')}-${generated.getDate().toString().padStart(2, '0')}/${Date.now()}.md`

  await fetch(`https://api.github.com/repos/pnsk-lab/justenews-contents/contents/${path}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${Deno.env.get('GH_TOKEN')}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      message: 'Add file',
      content: base64,
      branch: 'main'
    })
  })
}
