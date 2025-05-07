// src/lib/basic_chain.ts
import { ChatCohere } from '@langchain/cohere'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import dotenv from 'dotenv'
import { stdout } from 'process'

dotenv.config() // Load environment variables from .env file

export const llm = new ChatCohere({
  apiKey: process.env.VITE_COHERE_API_KEY, // Use process.env
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

export async function* ask_ai_stream(
  input: string,
  chat_history: string
): AsyncGenerator<string> {
  try {
    console.log(`[ask_ai_stream] Received input: ${input}`)
    const stream = await streamingChain.stream({
      input,
      chat_history,
    })
    console.log('[ask_ai_stream] Got stream from streamingChain. Iterating...')
    let chunkCounter = 0
    for await (const chunk of stream) {
      chunkCounter++
      // Ensure chunk and chunk.content are what we expect
      // console.log(`[ask_ai_stream] Raw chunk ${chunkCounter}:`, chunk);
      if (chunk && typeof chunk.content === 'string') {
        console.log(
          `[ask_ai_stream] Yielding content of chunk ${chunkCounter}: '${chunk.content}'`
        )
        yield chunk.content
      } else {
        console.log(
          `[ask_ai_stream] Chunk ${chunkCounter} content is not a string or chunk is invalid:`,
          chunk
        )
        // Optionally, yield an empty string or a placeholder if appropriate,
        // or simply skip if chunks without string content are possible and ignorable.
        // For now, we'll just log and skip.
      }
    }
    console.log(`[ask_ai_stream] Finished yielding ${chunkCounter} chunks.`)
  } catch (error) {
    console.error('[ask_ai_stream] Error:', error)
    throw error // Re-throw to be caught by the route handler
  }
}
