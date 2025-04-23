
import ChatContainer from "@/components/Chat/ChatContainer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white p-4 sm:p-6 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl h-[600px] shadow-xl rounded-xl overflow-hidden border border-gray-100">
        <ChatContainer />
      </div>
    </div>
  );
};

export default Index;
