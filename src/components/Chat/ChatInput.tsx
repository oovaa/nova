import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SendHorizontal, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  isLoading: boolean
  isRagActive: boolean
}

const ChatInput = ({
  onSendMessage,
  isLoading,
  isRagActive,
}: ChatInputProps) => {
  const [inputValue, setInputValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value)
    adjustTextareaHeight()
  }

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [inputValue])

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim())
      setInputValue('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isLoading) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const placeholderText = isRagActive
    ? 'Ask a question about the uploaded document...'
    : 'Type your message here...'

  return (
    <form
      onSubmit={handleSubmit}
      className='flex items-end space-x-2 p-4 bg-background border-t border-border'
    >
      <Textarea
        ref={textareaRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholderText}
        className='flex-1 resize-none overflow-y-hidden max-h-40 min-h-[40px] rounded-full px-4 py-2 focus-visible:ring-1 focus-visible:ring-ring'
        rows={1}
        disabled={isLoading}
        aria-label='Chat message input'
      />
      <Button
        type='submit'
        size='icon'
        disabled={isLoading || !inputValue.trim()}
        className='rounded-full'
        aria-label='Send message'
      >
        {isLoading ? (
          <Loader2 className='h-5 w-5 animate-spin' />
        ) : (
          <SendHorizontal className='h-5 w-5' />
        )}
      </Button>
    </form>
  )
}

export default ChatInput
