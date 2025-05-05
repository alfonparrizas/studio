'use client';

import { useState } from 'react';
import ChatArea from '@/components/chat/ChatArea';
import ChatInput from '@/components/chat/ChatInput';
import { type ChatMessageProps } from '@/components/chat/ChatMessage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { Bot } from 'lucide-react';
import { callFoncorpAgent } from '@/actions/foncorpAgentAction'; // Import the server action

export default function Home() {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async (message: string) => {
    const newUserMessage: ChatMessageProps = { role: 'user', content: message };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    try {
      // Call the server action
      const aiResponse = await callFoncorpAgent(message, messages); // Pass history

      if (aiResponse && aiResponse.response) {
         const newAiMessage: ChatMessageProps = { role: 'assistant', content: aiResponse.response };
         setMessages((prevMessages) => [...prevMessages, newAiMessage]);
      } else {
        // Handle cases where the response might be empty or error occurred upstream
        toast({
          title: "Error",
          description: aiResponse?.error || "Failed to get response from AI agent.",
          variant: "destructive",
        });
         // Optionally remove the user message or add an error message to the chat
         setMessages((prevMessages) => prevMessages.slice(0, -1)); // Remove last user message on error
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while communicating with the AI.",
        variant: "destructive",
      });
       // Optionally remove the user message or add an error message to the chat
       setMessages((prevMessages) => prevMessages.slice(0, -1)); // Remove last user message on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <header className="flex items-center justify-center p-4 border-b bg-background shadow-sm">
         <Bot className="h-6 w-6 mr-2 text-primary" />
         <h1 className="text-xl font-semibold">Foncorp Chat UI</h1>
      </header>
      <main className="flex-1 flex justify-center items-center p-4 md:p-8">
         <Card className="w-full max-w-3xl h-full flex flex-col shadow-lg">
           <CardHeader className="border-b p-4">
             <CardTitle className="text-lg text-center">AI Agent Chat</CardTitle>
           </CardHeader>
           <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
             <ChatArea messages={messages} isLoading={isLoading} />
             <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
           </CardContent>
         </Card>
      </main>
    </div>
  );
}
