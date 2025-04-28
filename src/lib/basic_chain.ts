// src/lib/basic_chain.ts
import { ChatCohere } from '@langchain/cohere'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'

export const llm = new ChatCohere({
  apiKey: import.meta.env.VITE_COHERE_API_KEY,
  model: 'command-r-plus',
  temperature: 0.4,
  maxRetries: 2,
})

const template = `You are Nova, a friendly assistant. Answer the user message in a friendly way. Use the chat history for context.

Current conversation:
{chat_history}

User: {input}
Nova:`

const prompt = PromptTemplate.fromTemplate(template)
let chat_history = ''

const chain = prompt.pipe(llm).pipe(new StringOutputParser())
const streamingChain = RunnableSequence.from([prompt, llm])

export async function ask_ai(input: string): Promise<string> {
  const res = await chain.invoke({
    input,
    chat_history,
  })

  chat_history += `User: ${input}\nNova: ${res}\n`
  return res
}

export async function* ask_ai_stream(input: string): AsyncGenerator<string> {
  const stream = await streamingChain.stream({
    input,
    chat_history,
  })

  let fullResponse = ''
  for await (const chunk of stream) {
    const content = chunk.content
    if (content) {
      fullResponse += content
      yield String(content)
    }
  }

  chat_history += `User: ${input}\nNova: ${fullResponse}\n`
}
