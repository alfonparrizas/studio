// src/components/chat/ChatMessage.tsx
import type { FC } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { agents, type Agent } from './AgentSelector';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  agentId?: string; 
}

// Helper function to check if content is JSON representing an array of objects
const tryParseJsonTable = (content: string): Record<string, any>[] | null => {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
      // Basic check: is it an array of objects?
      // More robust checks could verify keys if needed.
      return parsed;
    }
    return null;
  } catch (error) {
    return null; // Not valid JSON
  }
};

const ChatMessage: FC<ChatMessageProps> = ({ role, content, isLoading, agentId }) => {
  const isUser = role === 'user';
  const agent = agents.find(a => a.id === agentId);
  const AgentIcon = agent ? agent.icon : Bot;

  // Attempt to parse the content as table data for assistant messages
  const tableData = !isUser ? tryParseJsonTable(content) : null;

  // Define headers based on the keys of the first object in tableData
  const tableHeaders = tableData && tableData.length > 0 ? Object.keys(tableData[0]) : [];

  // Markdown components (keep for fallback/other markdown)
  const markdownComponents = {
    // Keep previous markdown components for general rendering
    table: ({ node, ...props }) => <Table className="my-2 border border-collapse w-full text-xs" {...props} />, 
    thead: ({ node, ...props }) => <TableHeader className="bg-muted/50" {...props} />, 
    tbody: ({ node, ...props }) => <TableBody {...props} />,
    tr: ({ node, ...props }) => <TableRow className="border-t" {...props} />, 
    th: ({ node, ...props }) => <TableHead className="border px-2 py-1 text-left font-semibold" {...props} />, 
    td: ({ node, ...props }) => <TableCell className="border px-2 py-1" {...props} />, 
    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '')
      return !inline ? (
        <pre className="bg-muted p-2 rounded-md overflow-x-auto my-2 text-xs">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>
          {children}
        </code>
      )
    },
  };

  return (
    <div className={cn('flex items-start space-x-3 py-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-secondary">
            <AgentIcon className="h-5 w-5 text-muted-foreground" />
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
            <span className="text-xs text-muted-foreground">Pensando</span>
            {/* ... loading dots ... */}
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-dot"></div>
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-dot"></div>
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse-dot"></div>
          </div>
        ) : (
          // CONDITIONAL RENDERING:
          // If tableData is found, render the shadcn Table
          // Otherwise, fall back to ReactMarkdown for regular text/markdown
          tableData ? (
            <Table className="my-0 border border-collapse w-full text-xs bg-background"> {/* Adjust styling */}
              <TableHeader className="bg-muted/60"> {/* Darker header */}
                <TableRow className="border-b">
                  {tableHeaders.map((header) => (
                    <TableHead key={header} className="border px-2 py-1 text-left font-semibold text-foreground">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="border-t">
                    {tableHeaders.map((header) => (
                      <TableCell key={`${rowIndex}-${header}`} className="border px-2 py-1 align-top">
                        {/* Convert potential objects/arrays in cells to string */} 
                        {typeof row[header] === 'object' ? JSON.stringify(row[header]) : String(row[header])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            // Fallback to rendering content as Markdown (if it's not table JSON)
            <ReactMarkdown
              remarkPlugins={[remarkGfm]} 
              components={markdownComponents}
            >
              {content} 
            </ReactMarkdown>
          )
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