import { cn } from '../../lib/utlis'
import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export interface ChatMessageProps {
  content: string
  isUser: boolean
  isError?: boolean
}

const ChatMessage = ({
  content,
  isUser,
  isError,
}: ChatMessageProps) => {
  const messageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [content]) // Update when content changes for streaming

  return (
    <div
      ref={messageRef}
      className={cn(
        'chat-message',
        isUser
          ? 'chat-message-user bg-secondary/20 dark:bg-secondary/30 text-foreground'
          : 'chat-message-bot bg-primary/10 dark:bg-primary/20 text-foreground',
        isError && 'bg-destructive text-destructive-foreground'
      )}
    >
      {/* Removed typing indicator logic. Always render content. */}
      <div className='break-words whitespace-pre-wrap'>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  )
}

export default ChatMessage
