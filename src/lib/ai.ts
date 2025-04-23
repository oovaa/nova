import { ChatCohere } from '@langchain/cohere'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

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

const chain = prompt.pipe(llm).pipe(new StringOutputParser())

export async function ask_ai(input: string): Promise<string> {
  const res = await chain.invoke({
    input,
    chat_history,
  })

  // Update chat history with consistent formatting
  chat_history += `Human: ${input}\nAI: ${res}\n`

  return res
}

// Example usage
// (async () => {
//   const response = await ask_ai('Hello!');
//   console.log(response);
// })();
