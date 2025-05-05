import { cn } from '../../lib/utlis'
import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export interface ChatMessageProps {
  content: string
  isUser: boolean
  isError?: boolean
  isLoading?: boolean
}

const ChatMessage = ({
  content,
  isUser,
  isError,
  isLoading,
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
      {isLoading ? (
        <div className='typing-indicator'>
          <span className='bg-foreground/50 dark:bg-foreground/70'></span>
          <span className='bg-foreground/50 dark:bg-foreground/70'></span>
          <span className='bg-foreground/50 dark:bg-foreground/70'></span>
        </div>
      ) : (
        <div className='break-words whitespace-pre-wrap'>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export default ChatMessage
