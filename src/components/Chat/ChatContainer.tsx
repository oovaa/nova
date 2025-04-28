// src/components/Chat/ChatContainer.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import ChatMessage, { ChatMessageProps } from './ChatMessage'
import ChatInput from './ChatInput'
import DarkModeToggle from './DarkModeToggle'
import { ask_ai_stream } from '../../lib/basic_chain'
import { useDropzone } from 'react-dropzone'
import { toast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
// import { addDocumentToVectorStore } from '../../lib/rag'; // We'll create this next

interface Message extends ChatMessageProps {
  id: string
  isError?: boolean
}

const ChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content:
        'Hello! How can I help you today? You can upload documents for me to reference.',
      isUser: false,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  )
  const [isUploading, setIsUploading] = useState(false)
  const [isRagActive, setIsRagActive] = useState(false) // State for RAG indicator
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
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

      let fullResponse = ''
      for await (const chunk of ask_ai_stream(content)) {
        fullResponse += chunk
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? { ...msg, content: fullResponse, isLoading: false }
              : msg
          )
        )
      }

      setError(null)
    } catch (err) {
      console.error('Failed to get bot response', err)
      setError("Sorry, I couldn't process your request. Please try again.")
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: 'An error occurred while processing your request.',
          isUser: false,
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
      setStreamingMessageId(null)
    }
  }

  const handleDocumentUpload = useCallback(async (file: File) => {
    if (!file) return
    setIsUploading(true)
    try {
      // Placeholder for actual RAG processing
      // await addDocumentToVectorStore(file);
      console.log('Simulating document processing for:', file.name)
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate upload/processing time

      setIsRagActive(true) // Activate RAG indicator
      toast({
        title: 'Document Ready',
        description: `${file.name} is ready to be used for reference.`,
        variant: 'default',
      })
    } catch (error) {
      console.error('Error uploading document:', error)
      toast({
        title: 'Upload failed',
        description: 'There was an error processing your document.',
        variant: 'destructive',
      })
      setIsRagActive(false) // Ensure indicator is off on error
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
    },
    maxFiles: 1,
    noClick: true, // Prevent opening file dialog on click, only drag/drop
    disabled: isUploading,
  })

  return (
    // Apply dropzone props to the main container
    <div
      {...getRootProps()}
      className={`flex flex-col h-screen bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:from-gray-800 dark:via-gray-900 dark:to-black text-foreground dark:text-foreground rounded-none shadow-none relative transition-colors ${
        isDragActive
          ? 'border-4 border-dashed border-primary bg-primary/10'
          : ''
      } ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {/* Input element for dropzone */}
      <input {...getInputProps()} />

      {/* Optional: Overlay for upload/drag state */}
      {isDragActive && !isUploading && (
        <div className='absolute inset-0 bg-primary/20 flex items-center justify-center z-10 pointer-events-none'>
          <p className='text-lg font-semibold text-primary-foreground bg-primary p-4 rounded-lg'>
            Drop document here
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

      <div className='p-4 bg-secondary dark:bg-secondary/50 text-secondary-foreground text-center relative flex justify-center items-center'>
        <div className='flex items-center justify-center flex-1'>
          {/* RAG Active Indicator */}
          {isRagActive && (
            <span className='w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse'></span>
          )}
          <h2 className='font-semibold text-lg sm:text-xl md:text-2xl'>Nova</h2>
        </div>
        <div className='absolute right-4 top-1/2 -translate-y-1/2'>
          <DarkModeToggle />
        </div>
      </div>

      <div
        ref={containerRef}
        className='flex-1 overflow-y-auto p-4 flex flex-col space-y-2 bg-white/70 dark:bg-gray-800/70 sm:p-6 md:p-8 rounded-lg shadow-lg'
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} {...message} />
        ))}
      </div>

      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  )
}

export default ChatContainer
