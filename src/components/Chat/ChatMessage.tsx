
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export interface ChatMessageProps {
  content: string;
  isUser: boolean;
  isError?: boolean;
  isLoading?: boolean;
}

const ChatMessage = ({ content, isUser, isError, isLoading }: ChatMessageProps) => {
  const messageRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div
      ref={messageRef}
      className={cn(
        "chat-message",
        isUser ? "chat-message-user" : "chat-message-bot",
        isError && "bg-destructive text-destructive-foreground"
      )}
    >
      {isLoading ? (
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      ) : (
        <p className="break-words">{content}</p>
      )}
    </div>
  );
};

export default ChatMessage;
