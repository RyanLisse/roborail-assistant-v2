"use client";

import type { Citation } from "@/lib/api/backend-client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { FileIcon, ExternalLinkIcon } from "./icons";
import { Button } from "./ui/button";

interface CitationCardProps {
  citation: Citation;
  index: number;
  className?: string;
}

export function CitationCard({ citation, index, className }: CitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  const truncateText = (text: string, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("group", className)}
    >
      <Card className="border border-gray-200 hover:border-blue-300 transition-colors">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-1">
                <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                  {citation.citationIndex}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileIcon size={16} />
                  <h4 className="text-sm font-medium truncate">
                    {citation.filename}
                  </h4>
                  {citation.pageNumber && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                      Page {citation.pageNumber}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isExpanded ? citation.chunkContent : truncateText(citation.chunkContent)}
                </p>
                
                {citation.chunkContent.length > 150 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto mt-1"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                {formatScore(citation.relevanceScore)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                title="View document"
              >
                <ExternalLinkIcon className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface CitationsListProps {
  citations: Citation[];
  className?: string;
}

export function CitationsList({ citations, className }: CitationsListProps) {
  if (citations.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <FileIcon size={16} />
        Sources ({citations.length})
      </h4>
      <div className="space-y-2">
        {citations.map((citation, index) => (
          <CitationCard
            key={`${citation.documentId}-${citation.citationIndex}`}
            citation={citation}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

interface InlineCitationProps {
  citationIndex: number;
  onClick?: () => void;
  className?: string;
}

export function InlineCitation({ citationIndex, onClick, className }: InlineCitationProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center w-5 h-5 text-xs font-medium",
        "bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors",
        "cursor-pointer border border-blue-200 hover:border-blue-300",
        className
      )}
      title={`View citation ${citationIndex}`}
    >
      {citationIndex}
    </button>
  );
}

// Utility function to parse citation markers in text and replace with components
export function parseCitationsInText(
  text: string,
  citations: Citation[],
  onCitationClick?: (citation: Citation) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Find all citation markers like [1], [2], etc.
  const citationRegex = /\[(\d+)\]/g;
  let match;
  
  while ((match = citationRegex.exec(text)) !== null) {
    const citationIndex = Number.parseInt(match[1]);
    const citation = citations.find(c => c.citationIndex === citationIndex);
    
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add inline citation component
    parts.push(
      <InlineCitation
        key={`citation-${citationIndex}-${match.index}`}
        citationIndex={citationIndex}
        onClick={() => citation && onCitationClick?.(citation)}
        className="mx-1"
      />
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
}