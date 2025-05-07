// src/server.ts (or your main backend file)
import tempWrite from 'temp-write'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import multer from 'multer'
// path and fs are not explicitly used in the provided snippet for streaming logic,
// but are present for file uploads. Keep them if they are used elsewhere.
// import path from 'path';
// import fs from 'fs';
import { z, ZodError } from 'zod'
import { ask_ai_stream } from './lib/basic_chain' // Assuming ask_ai is not needed for streaming focus
import { askQuestion, processDocuments } from './lib/rag'

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use((req: Request, res: Response, next: NextFunction) => {
  const { body } = req
  const now = new Date()
  console.log(
    `[${now.toISOString()}] ${req.method} ${req.url} body - ${
      JSON.stringify(body, null, 2) || 'E'
    } `
  )
  next()
})

const SimpleChatRequestSchema = z.object({
  question: z.string().min(1, 'Input cannot be empty'),
})

const RagChatRequestSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
  history: z.string().optional(),
})

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log('[Multer File Filter] File received:', file)
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
      'application/pdf', // pdf
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'text/plain', // txt
    ]
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      // cb(null, false) // This silently rejects
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed types: PDF, DOCX, PPTX, TXT.`
        )
      )
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
}).single('file')

app.get('/z', (req: Request, res: Response) =>
  res.status(200).send({ status: 'ok', timestamp: new Date().toISOString() })
)

app.post('/ask', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedBody = SimpleChatRequestSchema.parse(req.body)
    console.log(`[SERVER /ask] Validated question: "${validatedBody.question}"`)

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('X-Accel-Buffering', 'no') // Often helps disable buffering in Nginx/proxies
    res.setHeader('Connection', 'keep-alive')

    // Send an initial small chunk (heartbeat) to potentially open the connection faster
    // and prevent proxy buffering or timeouts on idle connections.
    res.write(' ') // A single space or a more structured ping like ":ping\n\n"

    const stream = ask_ai_stream(validatedBody.question, '') // Assuming history is handled or not needed here as per original
    console.log(
      '[SERVER /ask] Obtained stream from ask_ai_stream. Starting iteration...'
    )

    if (!stream) {
      console.error(
        '[SERVER /ask] Stream is null or undefined after calling ask_ai_stream.'
      )
      // Ensure headers are set for an error response if we haven't sent any body yet.
      // However, we already sent a heartbeat. This scenario should ideally not happen if ask_ai_stream is robust.
      return res.status(500).end('Failed to initialize stream.') // Or handle more gracefully
    }

    let chunkCounter = 0
    for await (const chunk of stream) {
      chunkCounter++
      // console.log(`[SERVER /ask] Writing chunk ${chunkCounter}: "${chunk}"`) // Can be very verbose
      if (chunk && chunk.length > 0) {
        res.write(chunk)
      } else {
        // console.log(`[SERVER /ask] Received empty or null chunk ${chunkCounter}. Skipping write.`);
      }
    }
    console.log(
      `[SERVER /ask] Finished writing ${chunkCounter} chunks. Ending response.`
    )
    res.end()
  } catch (error) {
    console.error('[SERVER /ask] Error in /ask route:', error)
    if (!res.headersSent) {
      // If headers haven't been sent, we can still send a proper error status
      next(error) // Pass to global error handler
    } else {
      // If headers were already sent (e.g., after the initial res.write(' ')),
      // we can't change the status code. We should just end the response.
      // The client will likely detect a broken stream.
      console.error(
        '[SERVER /ask] Headers already sent, cannot set error status. Ending response.'
      )
      res.end() // End the response abruptly. Client needs to handle this.
    }
  }
})

app.post('/rag', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedBody = RagChatRequestSchema.parse(req.body)
    console.log(
      `[SERVER /rag] Validated question: "${
        validatedBody.question
      }", History: "${validatedBody.history?.substring(0, 50)}..."`
    )

    res.setHeader('Content-Type', 'text/plain; charset=utf-8') // Added charset
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('X-Accel-Buffering', 'no') // Crucial for proxies like Nginx
    res.setHeader('Connection', 'keep-alive')

    // Send an initial small chunk (heartbeat)
    res.write(' ')

    const stream = await askQuestion(
      validatedBody.question,
      validatedBody.history || ''
    )
    console.log(
      '[SERVER /rag] Obtained stream from askQuestion. Starting iteration...'
    )

    if (!stream) {
      console.error(
        '[SERVER /rag] Stream is null or undefined after calling askQuestion.'
      )
      return res.status(500).end('Failed to initialize RAG stream.')
    }

    let chunkCounter = 0
    for await (const chunk of stream) {
      chunkCounter++
      // console.log(`[SERVER /rag] Writing chunk ${chunkCounter}: "${chunk}"`)
      if (chunk && chunk.length > 0) {
        res.write(chunk)
      }
    }
    console.log(
      `[SERVER /rag] Finished writing ${chunkCounter} chunks. Ending response.`
    )
    res.end()
  } catch (error: any) {
    console.error('[SERVER /rag] Error in /rag route:', error)
    if (!res.headersSent) {
      if (
        error instanceof Error &&
        error.message.includes('Retriever not initialized')
      ) {
        res.status(400).json({
          error: 'RAG not ready. Please add documents first via /add-document.',
        })
        return
      }
      next(error)
    } else {
      console.error(
        '[SERVER /rag] Headers already sent, cannot set error status. Ending response.'
      )
      res.end()
    }
  }
})

app.post(
  '/add-document',
  (req, res, next) => {
    // Middleware to handle multer errors more gracefully before main logic
    upload(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        console.error('[Multer Error] in /add-document pre-handler:', err)
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: `File too large. Max ${
              upload.opts?.limits?.fileSize || 'N/A'
            } bytes allowed.`,
            code: err.code,
          })
        }
        return res
          .status(400)
          .json({ error: `File upload error: ${err.message}`, code: err.code })
      } else if (err) {
        // An unknown error occurred when uploading.
        console.error(
          '[Unknown Upload Error] in /add-document pre-handler:',
          err
        )
        // This could be the custom error from fileFilter
        if (err.message.startsWith('Invalid file type')) {
          return res.status(400).json({ error: err.message })
        }
        return res.status(500).json({ error: `Upload failed: ${err.message}` })
      }
      // Everything went fine with upload, proceed to the route handler
      next()
    })
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        // This case should ideally be caught by multer if 'file' field is expected
        // but good to have a fallback.
        console.warn(
          '[SERVER /add-document] No file found on req.file after multer.'
        )
        res
          .status(400)
          .json({ error: 'No file uploaded or file was rejected.' })
        return
      }

      const filePath = tempWrite.sync(req.file.buffer, req.file.originalname)
      console.log(
        `[SERVER /add-document] File successfully written to temp path: ${filePath} (Original name: ${req.file.originalname})`
      )

      await processDocuments(filePath)
      console.log(
        `[SERVER /add-document] Document processed successfully: ${req.file.originalname}`
      )

      // fs.unlinkSync(filePath); // Uncomment if you want to delete after processing
      // console.log(`[SERVER /add-document] Deleted temp file: ${filePath}`);

      res.status(200).json({
        // Explicit 200 for success
        message: 'Document processed successfully.',
        filename: req.file.originalname,
      })
    } catch (error) {
      console.error('[SERVER /add-document] Error processing document:', error)
      // tempWrite.sync doesn't create req.file.path, it returns the path.
      // Cleaning up the temp file created by tempWrite might be tricky if filePath scope is an issue
      // or if processDocuments takes ownership and might delete it.
      // For now, we assume processDocuments handles its created resources or errors appropriately.
      next(error)
    }
  }
)

app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(
    `[Global Error Handler] Error for ${req.method} ${req.url}:`,
    err
  )

  if (res.headersSent) {
    console.error(
      '[Global Error Handler] Headers already sent, cannot send error response. Ending stream.'
    )
    // If headers were already sent (e.g., in a streaming route), we can't set a new status code.
    // We just end the response. The client will have to handle the broken stream.
    if (!res.writableEnded) {
      res.end()
    }
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  // Multer errors are now handled more directly in the /add-document route,
  // but a general handler here is okay as a fallback.
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: `File too large. Max ${
          upload.opts?.limits?.fileSize || 'N/A'
        } bytes allowed.`,
        code: err.code,
      })
      return
    }
    res
      .status(400)
      .json({ error: `File upload error: ${err.message}`, code: err.code })
    return
  }

  // Custom error from fileFilter in multer
  if (err.message.startsWith('Invalid file type')) {
    res.status(400).json({ error: err.message })
    return
  }

  // Default to 500 server error
  res.status(500).json({ error: err.message || 'Internal Server Error' })
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
  console.log(`Render health check endpoint available at /z`)
})

export default app
