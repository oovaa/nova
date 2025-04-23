
import { useState, useRef, useEffect } from "react";
import ChatMessage, { ChatMessageProps } from "./ChatMessage";
import ChatInput from "./ChatInput";

interface Message extends ChatMessageProps {
  id: string;
}

const ChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", content: "Hello! How can I help you today?", isUser: false }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // In a real app, this is where you'd connect to your LangChain.js logic
    try {
      // Simulating a bot response after a short delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Sample bot response
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `I received your message: "${content}"`,
        isUser: false
      };
      
      setMessages(prev => [...prev, botResponse]);
      setError(null);
    } catch (err) {
      console.error("Failed to get bot response", err);
      setError("Sorry, I couldn't process your request. Please try again.");
      setMessages(prev => [
        ...prev, 
        { 
          id: (Date.now() + 1).toString(), 
          content: "An error occurred while processing your request.", 
          isUser: false, 
          isError: true 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-primary text-white text-center">
        <h2 className="font-semibold">Chat Assistant</h2>
      </div>
      
      {/* Message container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2"
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} {...message} />
        ))}
        
        {isLoading && (
          <ChatMessage content="" isUser={false} isLoading={true} />
        )}
      </div>
      
      {/* Input area */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChatContainer;
