import { ChatCohere } from '@langchain/cohere'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'

const llm = new ChatCohere({
  apiKey: 'TmLMdVCDm0JIR0jE9XgmxTQtg6rr0xfsrMSUxlaU',
  model: 'command-r-plus',
  temperature: 0.4,
  maxRetries: 2,
})

const template = `You are Nova, a friendly assistant. answer the user message be very friendly and don't say that you are an AI 
make good use of the chat history, and just be cool 

Current conversation:
{chat_history}

User: {input}
Nova:`

const prompt = PromptTemplate.fromTemplate(template)
let chat_history = '' // Initialize as empty string

// Create both regular and streaming chains
const chain = prompt.pipe(llm).pipe(new StringOutputParser())
const streamingChain = RunnableSequence.from([prompt, llm])

export async function ask_ai(input: string): Promise<string> {
  const res = await chain.invoke({
    input,
    chat_history,
  })

  // Update chat history with consistent formatting
  chat_history += `Human: ${input}\nAI: ${res}\n`

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
      yield content
    }
  }

  // Update chat history with the full response
  chat_history += `Human: ${input}\nAI: ${fullResponse}\n`
}
