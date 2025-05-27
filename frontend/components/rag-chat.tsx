"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Clock, Database, Zap } from "lucide-react";
import { backendClient, type ChatResponse } from "@/lib/api/backend-client";

// Types for RAG messages
interface RAGMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{
    id: number;
    documentId: string;
    filename: string;
    pageNumber?: number;
    content: string;
    relevanceScore: number;
    quote: string;
  }>;
  metadata?: {
    searchTime: number;
    llmTime: number;
    totalTime: number;
    tokensUsed: number;
    documentsFound: number;
  };
  followUpQuestions?: string[];
  timestamp: Date;
}

interface RAGChatProps {
  chatId?: string;
  className?: string;
}

export function RAGChat({ chatId, className }: RAGChatProps) {
  const [messages, setMessages] = useState<RAGMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(chatId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Load existing conversation if chatId is provided
  useEffect(() => {
    if (chatId) {
      loadConversation(chatId);
    }
  }, [chatId]);

  const loadConversation = async (convId: string) => {
    try {
      const response = await backendClient.getConversationMessages(convId, "anonymous");
      const loadedMessages: RAGMessage[] = response.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        citations: msg.citations?.map((citation, index) => ({
          id: index + 1,
          documentId: citation.documentId,
          filename: citation.filename,
          pageNumber: citation.pageNumber,
          content: citation.chunkContent,
          relevanceScore: citation.relevanceScore,
          quote: citation.chunkContent.substring(0, 150) + "...",
        })),
        timestamp: new Date(msg.createdAt),
      }));
      setMessages(loadedMessages);
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: RAGMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat-rag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input.trim(),
          conversationId,
          responseMode: "detailed",
          enableReranking: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ragResponse = await response.json();

      // Update conversation ID if this is a new conversation
      if (!conversationId && ragResponse.conversationId) {
        setConversationId(ragResponse.conversationId);
      }

      const assistantMessage: RAGMessage = {
        id: ragResponse.id,
        role: "assistant",
        content: ragResponse.content,
        citations: ragResponse.citations,
        metadata: ragResponse.metadata,
        followUpQuestions: ragResponse.followUpQuestions,
        timestamp: new Date(ragResponse.createdAt),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: RAGMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `I apologize, but I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUpClick = (question: string) => {
    setInput(question);
  };

  const renderMessageContent = (message: RAGMessage) => {
    if (message.role === "user" || !message.citations || message.citations.length === 0) {
      return <p className="whitespace-pre-wrap">{message.content}</p>;
    }

    // Parse citations and render with hover cards
    const parts = message.content.split(/(\[Source\s*\d+\])/g);
    
    return (
      <div className="space-y-2">
        <div>
          {parts.map((part, index) => {
            const match = /\[Source\s*(\d+)\]/.exec(part);
            if (match) {
              const sourceNum = parseInt(match[1], 10);
              const citation = message.citations?.find(c => c.id === sourceNum);
              
              if (citation) {
                return (
                  <HoverCard key={index} openDelay={200}>
                    <HoverCardTrigger asChild>
                      <span className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 cursor-pointer font-medium text-sm bg-blue-50 px-2 py-1 rounded">
                        <Database className="w-3 h-3" />
                        {sourceNum}
                      </span>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-96">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-semibold truncate">{citation.filename}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {(citation.relevanceScore * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        {citation.pageNumber && (
                          <p className="text-xs text-muted-foreground">Page {citation.pageNumber}</p>
                        )}
                        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-blue-200 pl-3">
                          &ldquo;{citation.quote}&rdquo;
                        </blockquote>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              }
            }
            return <span key={index}>{part}</span>;
          })}
        </div>
        
        {message.metadata && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {message.metadata.totalTime}ms
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Database className="w-3 h-3 mr-1" />
              {message.metadata.documentsFound} docs
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              {message.metadata.tokensUsed} tokens
            </Badge>
          </div>
        )}
        
        {message.followUpQuestions && message.followUpQuestions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-sm text-muted-foreground mb-2">Suggested follow-up questions:</p>
            <div className="space-y-1">
              {message.followUpQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFollowUpClick(question)}
                  className="block text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors w-full"
                  disabled={isLoading}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Card className="flex-1 flex flex-col h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            RAG Knowledge Chat
            {conversationId && (
              <Badge variant="secondary" className="text-xs">
                ID: {conversationId.slice(-8)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full pr-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation with your knowledge base!</p>
                  <p className="text-sm mt-2">Ask questions about your uploaded documents.</p>
                </div>
              )}
              
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white ml-12"
                        : "bg-gray-100 text-gray-900 mr-12"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium uppercase tracking-wide">
                        {msg.role === "user" ? "You" : "Assistant"}
                      </span>
                      <span className="text-xs opacity-70">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {renderMessageContent(msg)}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 p-3 rounded-lg mr-12">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Searching knowledge base...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter>
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}