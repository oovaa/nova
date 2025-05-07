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
  const stream = await streamingChain.stream({
    input,
    chat_history,
  })

  // Iterate over the LangChain stream (which yields objects like AIMessageChunk)
  // and yield the string content of each chunk.
  for await (const chunk of stream) {
    // Assuming the chunk object has a 'content' property that is a string.
    // Adjust 'chunk.content' if the actual property name is different (e.g., chunk.text, etc.)
    // You might also need to check the type of the chunk if it can vary.
    if (typeof chunk.content === 'string') {
      yield chunk.content
    }
  }
}
