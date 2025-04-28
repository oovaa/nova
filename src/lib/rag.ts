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

let vectorstore: MemoryVectorStore | undefined
let retriever: any | undefined

export const processDocuments = async (file_path: File) => {
  console.log(await file_path.text())

  const loaded = await parser(file_path)

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500, // Adjust chunk size as needed
    chunkOverlap: 0, // Adjust overlap as needed
  })

  const docs = await splitter.createDocuments(loaded)

  if (!vectorstore) {
    // Initialize vector store with embeddings
    vectorstore = await MemoryVectorStore.fromDocuments(
      docs,
      new CohereEmbeddings({
        model: 'embed-v4.0',
      })
    )

    // Create a retriever from the vector store
    retriever = vectorstore.asRetriever()

    console.log('Documents stored and retriever initialized.')
  } else {
    // Add new documents to the existing vector store
    await vectorstore.addDocuments(docs)
    console.log('New documents added to the vector store.')
  }
}

const retrieve_chain = RunnableSequence.from([
  async (input: { question: string }) => {
    return await retriever.invoke(input.question)
  },
  // (prevResult) => console.log(prevResult),

  new RunnablePassthrough(), // Add a passthrough runnable as the third element
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

// Modify the chain to accept history dynamically
const chain = RunnableSequence.from([
  {
    context: retrieve_chain,
    question: (input: { question: string; history?: string }) => input.question,
    history: (input: { question: string; history?: string }) =>
      input.history ?? '', // Use provided history or default to empty
  },
  prompt,
  llm,
  new StringOutputParser(),
])

// Modify askQuestion to accept history
export const askQuestion = (question: string, history: string) => {
  // Return the stream iterator from the chain, passing the history
  return chain.stream({ question, history })
}
