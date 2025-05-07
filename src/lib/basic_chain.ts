// src/lib/basic_chain.ts
import { ChatCohere } from '@langchain/cohere'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import {
  RunnableSequence,
  RunnablePassthrough,
} from '@langchain/core/runnables' // RunnablePassthrough if needed
import { AIMessageChunk } from '@langchain/core/messages' // For type checking chunk
import dotenv from 'dotenv'

dotenv.config()


export const llm = new ChatCohere({
  apiKey: process.env.VITE_COHERE_API_KEY,
  model: 'command-r-plus',
  temperature: 0.4,
  maxRetries: 3, // Slightly increased retries
})

const template = `You are Nova, a friendly and helpful AI assistant. Your responses should be conversational and direct.
Answer the user's message. Use the provided chat history for context if available.

Current conversation:
{chat_history}

User: {input}
Nova:`

const prompt = PromptTemplate.fromTemplate(template)

// For streaming, we want the raw chunks from the LLM, then format them.
// The StringOutputParser is usually for when you want the final aggregated string.
// For streaming, we typically pipe the LLM output directly or map its chunks.
const streamingChain = RunnableSequence.from([
  prompt,
  llm, // This will output AIMessageChunk objects when streamed
])

// This non-streaming chain is fine if you have use cases for it
const chain = prompt.pipe(llm).pipe(new StringOutputParser())
let global_chat_history = '' // Note: global chat history is problematic for concurrent users. Consider session-based history.

export async function ask_ai(input: string): Promise<string> {
  // This is non-streaming
  console.log(`[ask_ai] Invoking non-streaming chain with input: "${input}"`)
  const res = await chain.invoke({
    input,
    chat_history: global_chat_history, // Be cautious with global state
  })
  global_chat_history += `User: ${input}\nNova: ${res}\n`
  console.log(`[ask_ai] Non-streaming response: "${res}"`)
  return res
}

export async function* ask_ai_stream(
  input: string,
  chat_history_param: string // Use parameter for history
): AsyncGenerator<string> {
  try {
    console.log(
      `[ask_ai_stream] Received input: "${input}", history: "${chat_history_param.substring(
        0,
        100
      )}..."`
    )
    const stream = await streamingChain.stream({
      input,
      chat_history: chat_history_param,
    })
    console.log(
      '[ask_ai_stream] Obtained stream from streamingChain. Iterating...'
    )
    let chunkCounter = 0
    let accumulatedResponseForHistory = '' // For updating history after stream

    for await (const chunk of stream) {
      chunkCounter++
      // Langchain's Cohere stream typically yields AIMessageChunk objects
      // The actual content is in chunk.content
      if (chunk && chunk.content && typeof chunk.content === 'string') {
        // console.log( // This can be too verbose for production
        //   `[ask_ai_stream] Yielding content of chunk ${chunkCounter}: '${chunk.content}'`
        // )
        yield chunk.content
        accumulatedResponseForHistory += chunk.content
      } else if (typeof chunk === 'string') {
        // Fallback if the chunk is already a string (less common for ChatModels)
        // console.log(
        //   `[ask_ai_stream] Yielding string chunk ${chunkCounter}: '${chunk}'`
        // )
        yield chunk
        accumulatedResponseForHistory += chunk
      } else {
        // console.warn( // Log less critical structural issues as warnings
        //   `[ask_ai_stream] Chunk ${chunkCounter} content is not a string or chunk structure is unexpected:`,
        //   chunk
        // )
        // Consider not yielding anything or an empty string if chunks are not as expected.
      }
    }
    console.log(`[ask_ai_stream] Finished yielding ${chunkCounter} chunks.`)
    // Update history after the full response is streamed for this call
    // Note: If you pass chat_history_param into this function, you might want to return the new history
    // or handle history updates outside if this function is purely for getting the LLM stream.
    // For simplicity here, if you need to update a global_chat_history (again, be careful with global state):
    // global_chat_history += `User: ${input}\nNova: ${accumulatedResponseForHistory}\n`;
  } catch (error) {
    console.error('[ask_ai_stream] Error during streaming:', error)
    // Optionally, you could yield a user-friendly error message as part of the stream:
    // yield "Sorry, an error occurred while generating the response.";
    throw error // Re-throw to be caught by the route handler
  }
}

// // Example usage in a main function
// async function main() {
//   const input = "Hello Nova, how are you today?";
//   console.log("[main] Sending input to ask_ai:", input);

//   // Non-streaming example
//   try {
//     const response = await ask_ai(input);
//     console.log("[main] Non-streaming response:", response);
//   } catch (error) {
//     console.error("[main] Error in non-streaming example:", error);
//   }

//   // Streaming example
//   console.log("[main] Starting streaming example...");
//   const chatHistory = ""; // Initialize with empty or previous chat history
//   try {
//     const stream = ask_ai_stream(input, chatHistory);
//     for await (const chunk of stream) {
//       process.stdout.write(chunk); // Print chunks as they arrive
//     }
//     console.log("\n[main] Streaming example completed.");
//   } catch (error) {
//     console.error("[main] Error in streaming example:", error);
//   }
// }

// // Run the main function
// main().catch((error) => {
//   console.error("[main] Unhandled error:", error);
// });
