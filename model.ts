import { createCohere } from '@ai-sdk/cohere'

export const cohere = createCohere({
  apiKey: Deno.env.get('COHERE_API_KEY')
})
