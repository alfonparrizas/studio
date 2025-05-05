'use client';

import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import ChatMessage, { type ChatMessageProps } from './ChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Agent } from './AgentSelector'; // Import Agent type
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ChatAreaProps {
  messages: ChatMessageProps[];
  isLoading: boolean; // To potentially show a loading message at the end
  selectedAgent: Agent; // Add selectedAgent prop
}

const ChatArea: FC<ChatAreaProps> = ({ messages, isLoading, selectedAgent }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Scroll to bottom when new messages are added or loading state changes
  useEffect(() => {
    if (viewportRef.current) {
      // Skip smooth scroll on initial load or agent change to avoid weird jumps
      const behavior = isFirstRender.current ? 'auto' : 'smooth';
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior });
      isFirstRender.current = false;
    }
  }, [messages, isLoading]);

  // Reset first render flag when agent changes
  useEffect(() => {
    isFirstRender.current = true;
  }, [selectedAgent]);


  return (
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
       <div ref={viewportRef} className="h-full space-y-4">
        {/* Display initial message if chat is empty */}
        {messages.length === 0 && !isLoading && (
          <Alert className="bg-card border-primary/20">
             <selectedAgent.icon className="h-4 w-4 !text-primary" />
             <AlertTitle className="text-primary">Hola!</AlertTitle>
             <AlertDescription>
               Estás chateando con {selectedAgent.name}. ¿En qué puedo ayudarte hoy?
             </AlertDescription>
           </Alert>
        )}
        {messages.map((msg, index) => (
          <ChatMessage key={index} {...msg} />
        ))}
        {/* Show loading indicator only when assistant is 'thinking' */}
        {isLoading && messages.length > 0 && messages[messages.length -1].role === 'user' && (
          <ChatMessage role="assistant" content="" isLoading={true} agentId={selectedAgent.id} />
        )}
       </div>
    </ScrollArea>
  );
};

export default ChatArea;
