"use client";

import { ChatHeader } from "@/components/chat-header";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import { fetcher, generateUUID } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import type { Attachment, UIMessage } from "ai";
// Removed auth - using null session type
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { Artifact } from "./artifact";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";
import { Button } from "./ui/button";

// Define types based on backend API response format
interface BackendChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  citations: Array<{
    documentId: string;
    filename: string;
    pageNumber?: number;
    chunkContent: string;
    relevanceScore: number;
    citationIndex: number;
  }>;
  metadata: {
    searchTime: number;
    llmTime: number;
    totalTime: number;
    tokensUsed: number;
    documentsFound: number;
  };
  followUpQuestions?: string[];
}

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: null;
  autoResume: boolean;
}) {
  const { mutate } = useSWRConfig();

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    experimental_resume,
    data,
  } = useChat({
    id,
    initialMessages,
    api: "/api/chat-rag",
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    experimental_prepareRequestBody: (request) => {
      const lastMessage = request.messages.at(-1);
      return JSON.stringify({
        conversationId: id,
        message: lastMessage?.content || "",
        responseMode: "detailed",
        enableReranking: true,
      });
    },
    onFinish: (message) => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));

      const messageData = message.data as any;

      if (messageData && typeof messageData === 'object' && 'content' in messageData) {
        const backendResponse = messageData as BackendChatResponse;

        if (backendResponse.followUpQuestions && backendResponse.followUpQuestions.length > 0) {
          setCurrentFollowUps(backendResponse.followUpQuestions);
        }

        setMessages(prevMessages => prevMessages.map(m =>
          m.id === message.id
            ? {
                ...m,
                content: m.content || backendResponse.content,
                citations: backendResponse.citations
              }
            : m
        ));
      } else {
        console.warn("Structured data (citations, sources, follow-ups) not found in assistant message.data for message:", message.id);
      }
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: "error",
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);
  const [currentFollowUps, setCurrentFollowUps] = useState<string[]>([]);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      append({
        role: "user",
        content: query,
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, append, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume,
    data,
    setMessages,
  });

  const handleFollowUpClick = (question: string) => {
    append({
      role: "user",
      content: question,
      createdAt: new Date(),
    });
    setCurrentFollowUps([]);
  };

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={initialChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        {currentFollowUps.length > 0 && (
          <div className="flex-shrink-0 px-4 pb-2 md:pb-3 md:max-w-3xl mx-auto w-full">
            <div className="text-sm font-medium mb-2 text-muted-foreground">Suggested follow-ups:</div>
            <div className="flex flex-wrap gap-2">
              {currentFollowUps.map((fu, index) => (
                <Button key={index} variant="outline" size="sm" onClick={() => handleFollowUpClick(fu)} className="text-xs md:text-sm">
                  {fu}
                </Button>
              ))}
            </div>
          </div>
        )}

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
              selectedVisibilityType={visibilityType}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </>
  );
}
