import { useState, useRef, useEffect } from "react";
import "./AITutorChat.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, BookOpen, Trash2, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useTutorNotes, useSaveTutorNote, useDeleteTutorNote } from "@/hooks/useTutorNotes";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  prompt?: string; // Store the prompt with AI responses for saving
  saved?: boolean; // Track if the message has been saved
}

export const AITutorChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: 'ai',
      content: 'Hello! I\'m your AI tutor. I can help you understand concepts, solve problems, and answer questions. What would you like to learn about today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: savedNotes, isLoading: isLoadingNotes } = useTutorNotes();
  const saveNoteMutation = useSaveTutorNote();
  const deleteNoteMutation = useDeleteTutorNote();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message
    setMessages(prev => [...prev, { type: 'user', content: userMessage, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-tutor', {
        body: { prompt: userMessage }
      });

      if (error) throw error;

      const aiResponse = data.response;
      
      // Add AI response      // Add AI response without auto-saving
      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: aiResponse, 
        timestamp: new Date(),
        prompt: userMessage, // Store the prompt with the response for saving later
        saved: false // Track save state
      }]);} catch (error) {
      console.error('Error calling AI tutor:', error);
      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: 'Sorry, I encountered an error. Please try again.', 
        timestamp: new Date() 
      }]);
      toast.error('Failed to get response from AI tutor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveResponse = async (message: ChatMessage, index: number) => {
    if (!message.prompt || message.saved || message.type !== 'ai') return;
    
    try {
      await saveNoteMutation.mutateAsync({
        prompt: message.prompt,
        response: message.content
      });
      
      // Update the message to show it's saved
      setMessages(prev => prev.map((msg, i) => 
        i === index ? { ...msg, saved: true } : msg
      ));
    } catch (error) {
      console.error('Error saving response:', error);
      toast.error('Failed to save response');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chat Interface */}
      <div className="lg:col-span-2">
        <Card id="ai-tutor-chat-card" className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              AI Tutor Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 min-h-0">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg relative group ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground ml-12'
                      : 'bg-muted'
                  }`}
                >                  <div className="relative">
                    <div className="whitespace-pre-wrap pr-8">{message.content}</div>
                    {message.type === 'ai' && (
                      <div className="absolute top-0 right-0 mt-1">
                        {!message.saved && message.prompt ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                            onClick={() => handleSaveResponse(message, index)}
                          >
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        ) : message.saved && (
                          <div className="text-sm text-muted-foreground p-1">
                            <Bookmark className="h-4 w-4 text-primary fill-primary" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex space-x-1">                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce typing-dot"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce typing-dot"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
          <CardFooter>
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything about your studies..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>

      {/* Saved Notes */}
      <div className="lg:col-span-1">
        <Card className="h-[600px]">
          <CardHeader>
            <CardTitle>Saved Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-y-auto min-h-0">
            {isLoadingNotes ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : savedNotes && savedNotes.length > 0 ? (
              savedNotes.map((note) => (
                <div key={note.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{note.prompt}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNoteMutation.mutate(note.id)}
                      disabled={deleteNoteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    {note.response.length > 100 
                      ? `${note.response.substring(0, 100)}...` 
                      : note.response
                    }
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No saved notes yet. Start a conversation to save notes automatically!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AITutorChat;
