// src/components/Chat/ChatContainer.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import ChatMessage, { ChatMessageProps } from './ChatMessage'
import ChatInput from './ChatInput'
import DarkModeToggle from './DarkModeToggle'
import { useDropzone } from 'react-dropzone'
import { toast } from '@/components/ui/use-toast'
import { Loader2, FilePlus } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://nova-8x6l.onrender.com'

interface Message extends ChatMessageProps {
  id: string
  isError?: boolean
}

const ChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content:
        'Hello! How can I help you today? You can upload documents (PDF, DOCX, TXT, PPTX) for me to reference.',
      isUser: false,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  )
  const [isUploading, setIsUploading] = useState(false)
  const [isRagActive, setIsRagActive] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobileView = useIsMobile()

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  const getHistory = () => {
    return messages
      .filter((msg) => msg.id !== 'welcome' && !msg.isLoading && !msg.isError)
      .map((msg) => `${msg.isUser ? 'User' : 'Nova'}: ${msg.content}`)
      .join('\n')
  }

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    const botMessageId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      {
        id: botMessageId,
        content: '',
        isUser: false,
        isLoading: true,
      },
    ])
    setStreamingMessageId(botMessageId)

    try {
      const endpoint = isRagActive
        ? `${API_BASE_URL}/rag`
        : `${API_BASE_URL}/ask`

      const body = isRagActive
        ? JSON.stringify({ question: content, history: getHistory() })
        : JSON.stringify({ question: content })

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: isRagActive ? 'text/plain' : 'text/event-stream',
        },
        body: body,
      })

      if (!response.ok) {
        let errorData = { error: `HTTP error! status: ${response.status}` }
        try {
          errorData = await response.json()
        } catch (e) {
          console.error('Could not parse error response JSON', e)
        }
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        )
      }

      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        if (!isRagActive) {
          // SSE processing for /ask endpoint
          let buffer = ''
          let accumulatedContent = '' // Stores the full processed, displayable content for the current bot message

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            let eolIndex // End of an SSE message (\n\n)

            // Process all complete SSE messages in the buffer
            while ((eolIndex = buffer.indexOf('\n\n')) >= 0) {
              const sseMessagePayload = buffer.slice(0, eolIndex) // Data for one SSE event
              buffer = buffer.slice(eolIndex + 2) // Consume the message and its trailing \n\n
              const lines = sseMessagePayload.split('\n')
              const dataParts: string[] = []
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  dataParts.push(line.substring('data: '.length))
                } else if (line.startsWith('data:')) {
                  // Handles "data:" (empty data line) or "data:actualdata"
                  dataParts.push(line.substring('data:'.length))
                }
                // Other SSE lines like 'event:', 'id:', 'retry:', or comments (':') are ignored here.
              }

              // Only proceed if the current SSE event actually contained data lines.
              if (dataParts.length > 0) {
                const currentEventData = dataParts.join('\n') // Standard way to reconstruct SSE data field
                accumulatedContent += currentEventData // Append data from THIS event to the total for this response

                // Update the UI incrementally with the latest accumulated displayable content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? { ...msg, content: accumulatedContent, isLoading: true } // Update content, keep isLoading true
                      : msg
                  )
                )
              }
            }
          }
          // Final update for the message when stream is done, setting isLoading to false
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: accumulatedContent, isLoading: false } // Use final accumulatedContent
                : msg
            )
          )
        } else {
          // Existing plain text stream processing for /rag endpoint
          let fullResponse = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            fullResponse += chunk

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? { ...msg, content: fullResponse, isLoading: true }
                  : msg
              )
            )
          }

          // Final update when stream is complete
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: fullResponse, isLoading: false }
                : msg
            )
          )
        }
      }
      setError(null)
    } catch (err: any) {
      console.error('Failed to get bot response', err)
      const errorMessage =
        err.message ||
        "Sorry, I couldn't process your request. Please try again."
      setError(errorMessage)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                content: `Error: ${errorMessage}`,
                isUser: false,
                isLoading: false,
                isError: true,
              }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
      setStreamingMessageId(null)
    }
  }

  const handleDocumentUpload = useCallback(async (file: File) => {
    if (!file) return
    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/add-document`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`
        )
      }

      setIsRagActive(true)
      toast({
        title: 'Document Ready',
        description: `${
          result.filename || file.name
        } processed successfully and is ready for reference.`,
        variant: 'default',
      })
    } catch (error: any) {
      console.error('Error uploading document:', error)
      const errorMessage =
        error.message || 'There was an error processing your document.'
      setError(`Upload failed: ${errorMessage}`)
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      })
      setIsRagActive(false)
    } finally {
      setIsUploading(false)
    }
  }, [])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleDocumentUpload(acceptedFiles[0])
      }
    },
    [handleDocumentUpload]
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        ['.pptx'],
    },
    maxFiles: 1,
    noClick: true,
    disabled: isUploading || isLoading,
  })

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col h-screen bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:from-gray-800 dark:via-gray-900 dark:to-black text-foreground dark:text-foreground rounded-none shadow-none relative transition-colors ${
        isDragActive && !(isUploading || isLoading)
          ? 'border-4 border-dashed border-primary bg-primary/10'
          : ''
      } ${isUploading || isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} disabled={isUploading || isLoading} />

      {isDragActive && !(isUploading || isLoading) && (
        <div className='absolute inset-0 bg-primary/20 flex items-center justify-center z-10 pointer-events-none'>
          <p className='text-lg font-semibold text-primary-foreground bg-primary p-4 rounded-lg'>
            Drop document here (PDF, DOCX, TXT, PPTX)
          </p>
        </div>
      )}
      {isUploading && (
        <div className='absolute inset-0 bg-black/30 flex items-center justify-center z-10 pointer-events-none'>
          <Loader2 className='h-12 w-12 animate-spin text-white' />
          <p className='ml-4 text-lg font-semibold text-white'>
            Processing document...
          </p>
        </div>
      )}
      {error && !streamingMessageId && (
        <div className='absolute top-20 left-1/2 transform -translate-x-1/2 z-20 bg-destructive text-destructive-foreground p-3 rounded-md shadow-lg max-w-md text-center'>
          {error}
          <button
            onClick={() => setError(null)}
            className='ml-4 text-sm font-bold'
          >
            X
          </button>
        </div>
      )}

      <div className='p-4 bg-secondary dark:bg-secondary/50 text-secondary-foreground text-center relative flex justify-center items-center'>
        <div className='flex items-center justify-center flex-1'>
          {isRagActive && (
            <span
              className='w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse'
              title='RAG Active: Chatting with document context'
            ></span>
          )}
          <h2 className='font-semibold text-lg sm:text-xl md:text-2xl'>Nova</h2>
        </div>
        <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2'>
          <Button
            variant='ghost'
            size={isMobileView ? 'icon' : 'default'}
            onClick={(e) => {
              e.stopPropagation()
              open()
            }}
            disabled={isUploading || isLoading}
            aria-label='Upload Document'
            title='Upload Document (PDF, DOCX, TXT, PPTX)'
          >
            <FilePlus className={`h-5 w-5 ${isMobileView ? '' : 'mr-2'}`} />
            {!isMobileView && 'Upload Doc'}
          </Button>
          <DarkModeToggle />
        </div>
      </div>

      <div
        ref={containerRef}
        className='flex-1 overflow-y-auto p-4 flex flex-col space-y-2 bg-white/70 dark:bg-gray-800/70 sm:p-6 md:p-8 rounded-lg shadow-inner'
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} {...message} />
        ))}
        {isLoading &&
          streamingMessageId &&
          messages.find((m) => m.id === streamingMessageId)?.isLoading && (
            <div className='flex justify-start'>
              <div className='flex items-center space-x-2 bg-muted p-3 rounded-lg max-w-xs sm:max-w-md md:max-w-lg'>
                <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                <span className='text-muted-foreground text-sm'>
                  Nova is thinking...
                </span>
              </div>
            </div>
          )}
      </div>

      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading || isUploading}
        isRagActive={isRagActive}
      />
    </div>
  )
}

export default ChatContainer
