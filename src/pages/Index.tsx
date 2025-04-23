
import ChatContainer from "@/components/Chat/ChatContainer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground dark:text-foreground p-0 flex items-center justify-center">
      <div className="w-full h-screen max-w-full overflow-hidden">
        <ChatContainer />
      </div>
    </div>
  );
};

export default Index;
