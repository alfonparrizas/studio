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
  const [sessionId, setSessionId] = useState<string | null>(null); // State for session ID
  const { toast } = useToast();

  // Callback to handle agent selection
  const handleAgentSelect = useCallback((agentId: string) => {
    const newAgent = agents.find((agent) => agent.id === agentId);
    if (newAgent && newAgent.id !== selectedAgent.id) {
      setSelectedAgent(newAgent);
      setMessages([]); // Clear chat history
      setSessionId(null); // Reset session ID when agent changes
      toast({
        title: "Agente Cambiado",
        description: `Ahora estás hablando con ${newAgent.name}.`,
      });
    }
  }, [selectedAgent.id, toast]);

  // Updated to include agentId and sessionId
  const handleSendMessage = async (message: string) => {
    const newUserMessage: ChatMessageProps = { role: 'user', content: message };
    // Add user message immediately for responsiveness
    // We keep the full message history in the UI state, but only send the session ID to the backend
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    try {
      console.log(`Sending message with sessionId: ${sessionId}`); // Log current session ID

      // Call the server action with message, agentId, and sessionId
      const aiResponse = await callFoncorpAgent(
        message,
        selectedAgent.id, // Pass the selected agent ID
        sessionId // Pass the current session ID (can be null)
      );

      console.log("Response from callFoncorpAgent:", aiResponse); // Log the response

      // Update session ID with the one received from the backend
      // ADK should return the same session ID or a new one if it wasn't provided
      if (aiResponse?.session_id) {
        console.log(`Updating sessionId to: ${aiResponse.session_id}`);
        setSessionId(aiResponse.session_id);
      }

      if (aiResponse && aiResponse.response) {
        const newAiMessage: ChatMessageProps = {
          role: 'assistant',
          content: aiResponse.response,
          agentId: selectedAgent.id, // Store agentId with the message for UI purposes
        };
        setMessages((prevMessages) => [...prevMessages, newAiMessage]);
      } else {
        // Handle errors returned in the response body
        const errorMsg = aiResponse?.error || "Failed to get response from AI agent.";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        // Remove the user message optimistic update if there was an error
        setMessages((prevMessages) => prevMessages.slice(0, -1));
      }
    } catch (error) {
      // Handle fetch/network errors or unexpected errors in the action
      console.error('Error in handleSendMessage:', error);
      toast({
        title: "Error",
        description:
          "An unexpected error occurred while communicating with the AI.",
        variant: "destructive",
      });
      // Remove the user message optimistic update if there was an error
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
        <AgentSelector
          selectedAgent={selectedAgent}
          onAgentSelect={handleAgentSelect}
        />
      </header>
      <main className="flex-1 flex justify-center items-center p-4 md:p-8">
        <Card className="w-full max-w-3xl h-full flex flex-col shadow-lg">
          <CardHeader className="border-b p-4 flex flex-row items-center justify-center space-x-2">
            <selectedAgent.icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg text-center">
              {selectedAgent.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ChatArea
              messages={messages}
              isLoading={isLoading}
              selectedAgent={selectedAgent}
            />
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
