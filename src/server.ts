import tempWrite from 'temp-write'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { z, ZodError } from 'zod'
import { ask_ai, ask_ai_stream } from './lib/basic_chain'
import { askQuestion, processDocuments } from './lib/rag'

const app = express()
const port = process.env.PORT || 3001 // Use environment variable or default

// Middleware
app.use(cors()) // Enable CORS for all origins
app.use(express.json()) // Parse JSON bodies

// Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const { body } = req

  const now = new Date()
  console.log(
    `[${now.getHours()}:${now.getMinutes()}] ${req.method} ${
      req.url
    } body - ${JSON.stringify(body, null, 2)}`
  )
  next()
})

// --- Zod Schemas for Validation ---

const SimpleChatRequestSchema = z.object({
  question: z.string().min(1, 'Input cannot be empty'),
})

const RagChatRequestSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
  history: z.string().optional(), // History is optional
})

// --- File Upload Setup (Multer) ---

const storage = multer.memoryStorage()

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log(file)
    const allowedFiles = ['pptx', 'pdf', 'docx', 'txt']
    if (allowedFiles.includes(file.mimetype.split('/')[1])) {
      cb(null, true)
    } else {
      cb(null, false)
    }
  },
}).single('file')

// --- API Endpoints ---

app.get('/z', (req: Request, res: Response) =>
  res.status(200).send({ status: 'ok' })
)

/**
 * @swagger
 * /ask:
 *   post:
 *     summary: Interact with the simple AI chat chain.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               input:
 *                 type: string
 *                 description: The user's message to the AI.
 *             required:
 *               - input
 *             example:
 *               input: "Hello Nova!"
 *     responses:
 *       200:
 *         description: Successful response from the AI.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   description: The AI's response.
 *       400:
 *         description: Bad Request - Invalid input.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/ask', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedBody = SimpleChatRequestSchema.parse(req.body)
    console.log(`[SERVER /ask] Validated question: ${validatedBody.question}`)

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = ask_ai_stream(validatedBody.question, '')
    console.log(
      '[SERVER /ask] Obtained stream from ask_ai_stream. Starting iteration...'
    )

    let chunkCounter = 0
    for await (const chunk of stream) {
      chunkCounter++
      console.log(`[SERVER /ask] Writing chunk ${chunkCounter}`)
      res.write(chunk)
    }
    console.log(`[SERVER /ask] Finished writing ${chunkCounter} chunks.`)
    res.end()
  } catch (error) {
    console.error('[SERVER /ask] Error in /ask route:', error) // Log the error
    next(error)
  }
})

/**
 * @swagger
 * /rag:
 *   post:
 *     summary: Interact with the RAG (Retrieval-Augmented Generation) chat chain.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 description: The user's question for the RAG chain.
 *               history:
 *                 type: string
 *                 description: Optional conversation history.
 *             required:
 *               - question
 *             example:
 *               question: "What is the main topic of the document?"
 *               history: "User: Hi\nNova: Hello!"
 *     responses:
 *       200:
 *         description: Successful streaming response from the RAG chain. The response is streamed chunk by chunk.
 *         content:
 *           text/plain: # Indicate streaming response
 *             schema:
 *               type: string
 *               description: Streamed chunks of the AI's response.
 *       400:
 *         description: Bad Request - Invalid input or RAG not initialized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/rag', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedBody = RagChatRequestSchema.parse(req.body)

    // Check if the retriever (and thus vectorstore) is initialized
    // Note: This requires exposing or checking the retriever's state from rag.ts
    // For simplicity, we'll assume it might throw if not ready, or handle inside askQuestion
    // A more robust check might be needed depending on rag.ts implementation details.

    const stream = await askQuestion(
      validatedBody.question,
      validatedBody.history || ''
    )

    res.setHeader('Content-Type', 'text/plain') // Set header for streaming
    res.setHeader('Transfer-Encoding', 'chunked')

    for await (const chunk of stream) {
      res.write(chunk) // Stream chunks to the client
    }
    res.end() // End the stream
  } catch (error) {
    // Specific check if RAG isn't ready
    if (
      error instanceof Error &&
      error.message.includes('Retriever not initialized') // Check for the specific error message
    ) {
      res.status(400).json({
        error: 'RAG not ready. Please add documents first via /add-document.',
      })
      return // Explicitly return void
    }
    next(error) // Pass other errors to the general handler
  }
})

/**
 * @swagger
 * /add-document:
 *   post:
 *     summary: Upload a document to be processed and added to the RAG vector store.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: The document file to upload (PDF, DOCX, PPTX, TXT). Max 10MB.
 *             required:
 *               - document
 *     responses:
 *       200:
 *         description: Document processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Document processed successfully."
 *                 filename:
 *                   type: string
 *                   example: "document-1678886400000-123456789.pdf"
 *       400:
 *         description: Bad Request - No file uploaded, invalid file type, or file too large.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error during processing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post(
  '/add-document',
  upload,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded.' })
        return // Explicitly return void
      }

      const filePath = tempWrite.sync(req.file.buffer, req.file.originalname)

      console.log(`File uploaded to: ${filePath}`)

      // Process the document using the function from rag.ts
      await processDocuments(filePath)

      // Optional: Delete the file after processing if no longer needed
      // fs.unlinkSync(filePath);
      // console.log(`Deleted uploaded file: ${filePath}`);

      res.json({
        message: 'Document processed successfully.',
        filename: req.file.originalname, // Use non-null assertion as we checked req.file
      })
    } catch (error) {
      // Clean up uploaded file on error if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
        console.log(`Cleaned up failed upload: ${req.file.path}`)
      }
      next(error) // Pass error to the error handler
    }
  }
)

// --- Global Error Handler ---
/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: A description of the error.
 *         details:
 *           type: array
 *           items:
 *             type: object
 *           description: Optional details, often present for validation errors.
 *       example:
 *         error: "Validation failed"
 *         details: [{ "path": ["input"], "message": "Input cannot be empty" }]
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', err) // Log the error

  if (err instanceof ZodError) {
    // Handle validation errors from Zod
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path, message: e.message })),
    })
    return // Explicitly return void
  }

  if (err instanceof multer.MulterError) {
    // Handle file upload errors from Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large. Max 10MB allowed.' })
      return // Explicitly return void
    }
    res.status(400).json({ error: `File upload error: ${err.message}` })
    return // Explicitly return void
  }

  if (err.message.includes('Invalid file type')) {
    // Handle custom file type error from multer filter
    res.status(400).json({ error: err.message })
    return // Explicitly return void
  }

  // Handle generic errors
  res.status(500).json({ error: err.message || 'Internal Server Error' })
  // No explicit return needed here as it's the end of the function
})

// --- Start Server ---
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})

// Export app for potential testing or other uses
export default app
