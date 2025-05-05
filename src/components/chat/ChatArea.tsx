'use client';

import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import ChatMessage, { type ChatMessageProps } from './ChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatAreaProps {
  messages: ChatMessageProps[];
  isLoading: boolean; // To potentially show a loading message at the end
}

const ChatArea: FC<ChatAreaProps> = ({ messages, isLoading }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages are added or loading state changes
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);


  return (
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
       <div ref={viewportRef} className="h-full">
        {messages.map((msg, index) => (
          <ChatMessage key={index} {...msg} />
        ))}
        {isLoading && messages.length > 0 && messages[messages.length -1].role === 'user' && (
          <ChatMessage role="assistant" content="" isLoading={true} />
        )}
       </div>
    </ScrollArea>
  );
};

export default ChatArea;
