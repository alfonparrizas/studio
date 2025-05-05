import type { FC } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

const ChatMessage: FC<ChatMessageProps> = ({ role, content, isLoading }) => {
  const isUser = role === 'user';

  return (
    <div className={cn('flex items-start space-x-3 py-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src="/placeholder-bot.jpg" alt="AI Avatar" data-ai-hint="robot face" />
          <AvatarFallback>
            <Bot className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[70%] rounded-lg p-3 text-sm shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        {isLoading ? (
          <div className="flex space-x-1 items-center">
             <span className="text-xs text-muted-foreground">Thinking</span>
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-dot"></div>
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-dot"></div>
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-dot"></div>
          </div>
        ) : (
          <p style={{ whiteSpace: 'pre-wrap' }}>{content}</p>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <User className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;
