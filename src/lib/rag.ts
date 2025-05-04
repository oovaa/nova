import { CohereEmbeddings } from '@langchain/cohere'
import { parser } from './parser'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import {
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables'
import { PromptTemplate } from '@langchain/core/prompts'
import { llm } from './basic_chain'
import { StringOutputParser } from '@langchain/core/output_parsers'
import dotenv from 'dotenv'

dotenv.config()

let vectorstore: MemoryVectorStore | undefined
let retriever: any | undefined

export const processDocuments = async (filePath: string) => {
  const loaded = await parser(filePath)

  let textContent: string | string[]
  if (
    Array.isArray(loaded) &&
    loaded.length > 0 &&
    typeof loaded[0] === 'object' &&
    loaded[0] !== null &&
    'content' in loaded[0]
  ) {
    textContent = loaded.map((item) => item.content)
  } else if (
    typeof loaded === 'string' ||
    (Array.isArray(loaded) && loaded.every((item) => typeof item === 'string'))
  ) {
    textContent = loaded
  } else {
    textContent = loaded
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 0,
  })

  const docs = await splitter.createDocuments(textContent)

  if (!vectorstore) {
    try {
      vectorstore = await MemoryVectorStore.fromDocuments(
        docs,
        new CohereEmbeddings({
          apiKey: process.env.VITE_COHERE_API_KEY,
          model: 'embed-v4.0',
        })
      )
      retriever = vectorstore.asRetriever()
    } catch (embeddingError) {
      throw embeddingError
    }
  } else {
    try {
      await vectorstore.addDocuments(docs)
    } catch (addDocError) {
      throw addDocError
    }
  }
}

export function combine(docs) {
  if (
    !Array.isArray(docs) ||
    !docs.every(
      (doc) =>
        typeof doc === 'object' &&
        doc !== null &&
        'pageContent' in doc &&
        typeof doc.pageContent === 'string'
    )
  ) {
    return ''
  }
  return docs.map((doc) => doc.pageContent).join('\n\n')
}

const retrieve_chain = RunnableSequence.from([
  async ({ question }) => {
    if (!retriever) {
      throw new Error(
        'Retriever not initialized in retrieve_chain. Process documents first.'
      )
    }
    return await retriever.invoke(question)
  },
  combine,
  new RunnablePassthrough(),
])

const template = `
You are a helpful assistant. Use the following context, conversation history and the user's question to provide an accurate and concise response.

Conversation History:
{history}

Context:
{context}


User's Question:
{question}

Your Response:
`

const prompt = PromptTemplate.fromTemplate(template)

const chain = RunnableSequence.from([
  {
    context: retrieve_chain,
    question: (input: { question: string; history?: string }) => input.question,
    history: (input: { question: string; history?: string }) =>
      input.history ?? '',
  },
  prompt,
  llm,
  new StringOutputParser(),
])

export const askQuestion = async (question: string, history: string) => {
  if (!retriever) {
    throw new Error('Retriever not initialized. Process documents first.')
  }
  return chain.stream({ question, history })
}

const main = async () => {
  const question1 = 'What is the capital of France?'
  const history1 = 'User previously asked about European countries.'

  try {
    await processDocuments('brooch.pdf')

    const stream1 = await askQuestion(question1, history1)
    process.stdout.write('Assistant: ')
    for await (const chunk of stream1) {
      process.stdout.write(chunk)
    }

    const question2 = 'What is the population of Paris?'
    const history2 =
      history1 +
      `\nUser: ${question1}\nAssistant: ${'Paris is the capital of France.'}`

    const stream2 = await askQuestion(question2, history2)
    process.stdout.write('Assistant: ')
    for await (const chunk of stream2) {
      process.stdout.write(chunk)
    }
  } catch (err) {
    if (err.response && err.response.data) {
      console.error('Error Details from API Response:', err.response.data)
    }
    if (err.errors) {
      console.error('Validation Errors:', err.errors)
    }
  }
}

main().catch((err) => console.error('Unhandled error in main:', err))
