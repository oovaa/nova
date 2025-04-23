import { useState, useRef, useEffect } from 'react'
import ChatMessage, { ChatMessageProps } from './ChatMessage'
import ChatInput from './ChatInput'
import DarkModeToggle from './DarkModeToggle'
import { ask_ai, ask_ai_stream } from '../../lib/basic_chain'

interface Message extends ChatMessageProps {
  id: string
  isError?: boolean
}

const ChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: 'Hello! How can I help you today?',
      isUser: false,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  )
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
      // Create a temporary bot message that will be updated during streaming
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

      // Process the stream
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

  return (
    <div className='flex flex-col h-screen bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:from-gray-800 dark:via-gray-900 dark:to-black text-foreground dark:text-foreground rounded-none shadow-none'>
      <div className='p-4 bg-secondary dark:bg-secondary/50 text-secondary-foreground text-center relative flex justify-center items-center'>
        <h2 className='font-semibold flex-1 text-center text-lg sm:text-xl md:text-2xl'>
          Nova
        </h2>
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
