import React, { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "model";
  parts: { text: string }[];
};

export const AITutorChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { mutate: sendMessage, isPending: isLoading } = useMutation({
    mutationFn: async (newMessages: Message[]) => {
      const { data, error } = await supabase.functions.invoke("ai-tutor", {
        body: { history: newMessages },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      
      return data.reply as string;
    },
    onSuccess: (reply) => {
      setMessages((prev) => [...prev, { role: "model", parts: [{ text: reply }] }]);
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          parts: [{ text: `Sorry, something went wrong: ${error.message}` }],
        },
      ]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", parts: [{ text: input }] };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    sendMessage(newMessages);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="h-[70vh] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot /> AI Tutor
        </CardTitle>
        <CardDescription>
          Ask questions about any subject, and I'll help you understand.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pr-4">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "model" && <Bot className="w-6 h-6 flex-shrink-0" />}
              <div className={`rounded-lg p-3 max-w-lg ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.parts[0].text}
                  </ReactMarkdown>
                </div>
              </div>
              {msg.role === "user" && <User className="w-6 h-6 flex-shrink-0" />}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <Bot className="w-6 h-6 flex-shrink-0" />
              <div className="bg-muted rounded-lg p-3 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about chemistry, history, math..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};
