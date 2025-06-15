
import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { toast } from "@/components/ui/use-toast";

type Message = {
  role: "user" | "model";
  parts: { text: string }[];
};

const suggestedPrompts = [
  "Explain photosynthesis like I'm five.",
  "What were the main causes of World War I?",
  "Can you help me with the Pythagorean theorem?",
  "Tell me a fun fact about the Roman Empire.",
];

export const AITutorChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getAIResponse = async (history: Message[]) => {
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "model", parts: [{ text: "" }] }]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("User is not authenticated.");
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ history }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: "Failed to get a response from the AI tutor." }));
        throw new Error(errorData.error);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === "model") {
            lastMessage.parts[0].text += chunk;
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error streaming message:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === "model" && lastMessage.parts[0].text === "") {
          lastMessage.parts[0].text = `Sorry, something went wrong: ${errorMessage}`;
        } else {
            newMessages.push({
                role: "model",
                parts: [{ text: `Sorry, something went wrong: ${errorMessage}` }],
            });
        }
        return newMessages;
      });
      toast({
        title: "Error",
        description: "Could not get response from AI Tutor.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    if (isLoading) return;

    const userMessage: Message = { role: "user", parts: [{ text: prompt }] };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    getAIResponse(newMessages);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", parts: [{ text: input }] };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    getAIResponse(newMessages);
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
        <div className="space-y-4 h-full">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-12 h-12 mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Ready to help!</h3>
              <p className="text-sm text-muted-foreground mb-6">Ask me anything or try a suggestion below.</p>
              <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedPrompts.map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-left h-auto whitespace-normal p-3"
                    onClick={() => handlePromptClick(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "model" && <Bot className="w-6 h-6 flex-shrink-0" />}
              <div className={`rounded-lg p-3 max-w-lg ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {msg.parts[0].text}
                  </ReactMarkdown>
                </div>
              </div>
              {msg.role === "user" && <User className="w-6 h-6 flex-shrink-0" />}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.parts[0].text === "" && (
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
