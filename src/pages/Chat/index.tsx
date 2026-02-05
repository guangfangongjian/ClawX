/**
 * Chat Page
 * Conversation interface with AI
 */
import { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useChatStore } from '@/stores/chat';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn, formatRelativeTime } from '@/lib/utils';

export function Chat() {
  const { messages, loading, sending, fetchHistory, sendMessage, clearHistory } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    
    const content = input.trim();
    setInput('');
    await sendMessage(content);
  };
  
  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Bot className="h-16 w-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No messages yet</h3>
            <p className="text-sm">Start a conversation with your AI assistant</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                
                {/* Message Content */}
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={cn(
                      'mt-1 text-xs',
                      message.role === 'user'
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    )}
                  >
                    {formatRelativeTime(message.timestamp)}
                  </p>
                  
                  {/* Tool Calls */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.toolCalls.map((tool) => (
                        <Card key={tool.id} className="bg-background/50">
                          <CardContent className="p-2">
                            <p className="text-xs font-medium">
                              Tool: {tool.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Status: {tool.status}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearHistory}
            disabled={messages.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          
          <Button onClick={handleSend} disabled={!input.trim() || sending}>
            {sending ? (
              <LoadingSpinner size="sm" className="text-primary-foreground" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
