"use client";

import type { Vote } from "@/lib/db/schema";
import { cn, sanitizeText } from "@/lib/utils";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import cx from "classnames";
import equal from "fast-deep-equal";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useState } from "react";
import { DocumentToolCall, DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { PencilEditIcon, SparklesIcon } from "./icons";
import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Weather } from "./weather";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

// Define types for citations and sources based on Slice 7-9 & backend schema
// These might come from a shared types file in a real scenario
interface CitationSource {
  id: number | string; // Corresponds to documentChunk.id
  documentId?: number; // Added from schema.ts CitationData
  title?: string | null; // Corresponds to documents.title
  documentSource?: string | null; // Corresponds to documents.source (original filename/URL)
  snippet?: string; // A snippet of the chunk content
  score?: number; // Relevance score from reranker/search
  pageNumber?: number;
}
interface CitationData {
  sourceId: string; // documentChunk.id (or a unique reference to it)
  documentId: number;
  documentTitle: string;
  documentSource: string; // e.g. original filename or URL
  quote: string; // The specific text snippet from the chunk that supports the claim
  pageNumber?: number;
  // confidence?: number; // If reranker provides it (from schema.ts example)
}

// Augment UIMessage if necessary, or assume citations/sources are in message.data
interface ExtendedUIMessage extends UIMessage {
  citations?: CitationData[];
  sources?: CitationSource[];
}

const PurePreviewMessage = ({
  chatId,
  message: rawMessage,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
  requiresScrollPadding,
}: {
  chatId: string;
  message: UIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${rawMessage.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={rawMessage.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            {
              "w-full": mode === "edit",
              "group-data-[role=user]/message:w-fit": mode !== "edit",
            }
          )}
        >
          {rawMessage.role === "assistant" && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div
            className={cn("flex flex-col gap-4 w-full", {
              "min-h-96": rawMessage.role === "assistant" && requiresScrollPadding,
            })}
          >
            {rawMessage.experimental_attachments && rawMessage.experimental_attachments.length > 0 && (
              <div data-testid={`message-attachments`} className="flex flex-row justify-end gap-2">
                {rawMessage.experimental_attachments.map((attachment) => (
                  <PreviewAttachment key={attachment.url} attachment={attachment} />
                ))}
              </div>
            )}

            {rawMessage.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${rawMessage.id}-part-${index}`;

              if (type === "reasoning") {
                return (
                  <MessageReasoning key={key} isLoading={isLoading} reasoning={part.reasoning} />
                );
              }

              if (type === "text") {
                if (mode === "view") {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {rawMessage.role === "user" && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode("edit");
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn("flex flex-col gap-4", {
                          "bg-primary text-primary-foreground px-3 py-2 rounded-xl":
                            rawMessage.role === "user",
                        })}
                      >
                        {rawMessage.role === "assistant" ? (
                          renderAssistantMessageContent(rawMessage as ExtendedUIMessage, part.text)
                        ) : (
                          <Markdown>{sanitizeText(part.text)}</Markdown>
                        )}
                      </div>
                    </div>
                  );
                }

                if (mode === "edit") {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={rawMessage.id}
                        message={rawMessage}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                      />
                    </div>
                  );
                }
              }

              if (type === "tool-invocation") {
                const { toolInvocation } = part;
                const { toolName, toolCallId, state } = toolInvocation;

                if (state === "call") {
                  const { args } = toolInvocation;

                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ["getWeather"].includes(toolName),
                      })}
                    >
                      {toolName === "getWeather" ? (
                        <Weather />
                      ) : toolName === "createDocument" ? (
                        <DocumentPreview isReadonly={isReadonly} args={args} />
                      ) : toolName === "updateDocument" ? (
                        <DocumentToolCall type="update" args={args} isReadonly={isReadonly} />
                      ) : toolName === "requestSuggestions" ? (
                        <DocumentToolCall
                          type="request-suggestions"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : null}
                    </div>
                  );
                }

                if (state === "result") {
                  const { result } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === "getWeather" ? (
                        <Weather weatherAtLocation={result} />
                      ) : toolName === "createDocument" ? (
                        <DocumentPreview isReadonly={isReadonly} result={result} />
                      ) : toolName === "updateDocument" ? (
                        <DocumentToolResult type="update" result={result} isReadonly={isReadonly} />
                      ) : toolName === "requestSuggestions" ? (
                        <DocumentToolResult
                          type="request-suggestions"
                          result={result}
                          isReadonly={isReadonly}
                        />
                      ) : (
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                      )}
                    </div>
                  );
                }
              }
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${rawMessage.id}`}
                chatId={chatId}
                message={rawMessage}
                vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
  if (!equal(prevProps.vote, nextProps.vote)) return false;

  return true;
});

const renderAssistantMessageContent = (message: ExtendedUIMessage, text: string) => {
  if (!message.citations || message.citations.length === 0 || !message.sources) {
    return <Markdown>{sanitizeText(text)}</Markdown>;
  }

  // Create a map of sourceId to source details for quick lookup
  const sourceDetailsMap = new Map<string, CitationSource>();
  message.sources.forEach(source => sourceDetailsMap.set(String(source.id), source));

  const parts = text.split(/(\\[Source\\s*\\d+\\])/g);

  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        const citationMatch = /\\\[Source\\s*(\\d+)\\]/.exec(part);
        if (citationMatch) {
          const sourceNum = Number.parseInt(citationMatch[1], 10);
          // Attempt to find the Nth citation in the message.citations array (1-based to 0-based)
          const citationInfo = message.citations?.[sourceNum - 1];
          
          if (citationInfo) {
            // Use citationInfo.sourceId (which should be the chunk_id) to find the full source detail
            const sourceDetail = sourceDetailsMap.get(String(citationInfo.sourceId));

            if (sourceDetail) {
              return (
                <HoverCard key={`cite-${message.id}-${index}`} openDelay={200}>
                  <HoverCardTrigger asChild>
                    <span className="citation-link cursor-pointer text-blue-500 hover:text-blue-700 font-semibold underline decoration-dotted">
                      {part}
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-96" side="top">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">{sourceDetail.title || citationInfo.documentTitle || 'Source Document'}</h4>
                      <p className="text-xs text-gray-500">
                        File: {sourceDetail.documentSource || citationInfo.documentSource || 'N/A'}
                        {sourceDetail.pageNumber || citationInfo.pageNumber ? `, Page: ${sourceDetail.pageNumber || citationInfo.pageNumber}` : ''}
                      </p>
                      <blockquote className="text-xs text-muted-foreground italic border-l-2 pl-2 max-h-24 overflow-y-auto">
                        {sanitizeText(citationInfo.quote)}
                      </blockquote>
                      {sourceDetail.snippet && sourceDetail.snippet !== citationInfo.quote && (
                        <details className="text-xs">
                          <summary className="cursor-pointer">Show context</summary>
                          <p className="text-muted-foreground mt-1 max-h-24 overflow-y-auto">{sanitizeText(sourceDetail.snippet)}</p>
                        </details>
                      )}
                      {/* <div className="text-xs text-gray-500">Confidence: {sourceDetail.score?.toFixed(2)}</div> */}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            }
          }
        }
        // Sanitize non-citation parts before rendering if they are not going through Markdown component
        // If Markdown component is used for each part, it will handle sanitization.
        // Here, we assume sanitizeText is for direct HTML rendering if not using Markdown for each part.
        return <span key={`part-${message.id}-${index}`}>{part}</span>; 
      })}
    </div>
  );
};

export const ThinkingMessage = () => {
  const role = "assistant";

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message min-h-96"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          "flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl",
          {
            "group-data-[role=user]/message:bg-muted": true,
          }
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">Hmm...</div>
        </div>
      </div>
    </motion.div>
  );
};
