import type { FC } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { agents, type Agent } from './AgentSelector'; // Import agent data

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  agentId?: string; // Add agentId prop
}

const ChatMessage: FC<ChatMessageProps> = ({ role, content, isLoading, agentId }) => {
  const isUser = role === 'user';
  const agent = agents.find(a => a.id === agentId);
  const AgentIcon = agent ? agent.icon : Bot; // Fallback to Bot icon

  return (
    <div className={cn('flex items-start space-x-3 py-4', isUser ? 'justify-end' : 'justify-start')}>
      {/* Assistant Avatar/Icon */}
      {!isUser && (
        <Avatar className="h-8 w-8">
          {/* You could add specific images based on agentId if needed */}
          {/* <AvatarImage src={`/agent-${agentId}-avatar.jpg`} alt={`${agent?.name} Avatar`} /> */}
          <AvatarFallback className="bg-secondary">
            <AgentIcon className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      )}
      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[70%] rounded-lg p-3 text-sm shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground' // Keep assistant messages in secondary color
        )}
      >
        {isLoading ? (
          <div className="flex space-x-1 items-center">
             <span className="text-xs text-muted-foreground">Pensando</span> {/* Changed text */}
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-dot"></div>
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-dot"></div>
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-dot"></div>
          </div>
        ) : (
          <p style={{ whiteSpace: 'pre-wrap' }}>{content}</p>
        )}
      </div>
      {/* User Avatar */}
      {isUser && (
        <Avatar className="h-8 w-8">
          {/* If you have user avatars, add logic here */}
          <AvatarFallback>
            <User className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;
