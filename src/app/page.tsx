'use client';

import { useState, useCallback } from 'react';
import ChatArea from '@/components/chat/ChatArea';
import ChatInput from '@/components/chat/ChatInput';
import { type ChatMessageProps } from '@/components/chat/ChatMessage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { Bot } from 'lucide-react';
import { callFoncorpAgent } from '@/actions/foncorpAgentAction'; // Import the server action
import {
  AgentSelector,
  agents,
  type Agent,
} from "@/components/chat/AgentSelector"; // Import Agent Selector

export default function Home() {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(agents[0]); // Default to first agent
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Callback to handle agent selection
  const handleAgentSelect = useCallback((agentId: string) => {
    const newAgent = agents.find((agent) => agent.id === agentId);
    if (newAgent && newAgent.id !== selectedAgent.id) {
      setSelectedAgent(newAgent);
      setMessages([]); // Clear chat history when agent changes
      toast({
        title: "Agente Cambiado",
        description: `Ahora estás hablando con ${newAgent.name}.`,
      });
    }
  }, [selectedAgent.id, toast]);

  // Updated to include agentId
  const handleSendMessage = async (message: string) => {
    const newUserMessage: ChatMessageProps = { role: 'user', content: message };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    try {
      // Call the server action with agentId
      const aiResponse = await callFoncorpAgent(
        message,
        messages, // Pass previous messages for history
        selectedAgent.id // Pass the selected agent ID
      );

      if (aiResponse && aiResponse.response) {
        const newAiMessage: ChatMessageProps = {
          role: 'assistant',
          content: aiResponse.response,
          agentId: selectedAgent.id, // Store agentId with the message
        };
        setMessages((prevMessages) => [...prevMessages, newAiMessage]);
      } else {
        toast({
          title: "Error",
          description:
            aiResponse?.error || "Failed to get response from AI agent.",
          variant: "destructive",
        });
        setMessages((prevMessages) => prevMessages.slice(0, -1));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description:
          "An unexpected error occurred while communicating with the AI.",
        variant: "destructive",
      });
      setMessages((prevMessages) => prevMessages.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <header className="flex items-center justify-between p-4 border-b bg-background shadow-sm">
        <div className="flex items-center">
          <Bot className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-xl font-semibold">Foncorp Chat UI</h1>
        </div>
        {/* Add Agent Selector to the header */}
        <AgentSelector
          selectedAgent={selectedAgent}
          onAgentSelect={handleAgentSelect}
        />
      </header>
      <main className="flex-1 flex justify-center items-center p-4 md:p-8">
        <Card className="w-full max-w-3xl h-full flex flex-col shadow-lg">
          {/* Update CardHeader to show selected agent */}
          <CardHeader className="border-b p-4 flex flex-row items-center justify-center space-x-2">
            <selectedAgent.icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg text-center">
              {selectedAgent.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Pass selectedAgent to ChatArea */}
            <ChatArea
              messages={messages}
              isLoading={isLoading}
              selectedAgent={selectedAgent} // Pass agent info
            />
            {/* Pass handleSendMessage and isLoading to ChatInput */}
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
