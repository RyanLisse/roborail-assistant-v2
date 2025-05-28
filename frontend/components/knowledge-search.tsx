"use client";

import { useDebouncedDocumentSearch } from "@/hooks";
import type { SearchResult } from "@/lib/api/backend-client";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { FileIcon, LoaderIcon, SearchIcon } from "./icons";

interface KnowledgeSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export function KnowledgeSearch({ onResultSelect, className }: KnowledgeSearchProps) {
  const [query, setQuery] = useState("");

  // Use debounced search with Tanstack Query
  const { 
    data: searchResults, 
    isLoading: isSearching, 
    isError, 
    error 
  } = useDebouncedDocumentSearch(query, "anonymous", 300, {
        limit: 10,
        enableReranking: true,
        threshold: 0.3,
      });

  // Show error toast when search fails
  if (isError && error) {
    toast.error("Search failed. Please try again.");
  }

  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  const truncateText = (text: string, maxLength = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const highlightQuery = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SearchIcon />
          Knowledge Base Search
        </CardTitle>
        <CardDescription>
          Search through your uploaded documents to find relevant information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Search your documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          {isSearching && (
            <div className="flex items-center px-3">
              <div className="animate-spin">
                <LoaderIcon size={16} />
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Search Results ({searchResults.totalResults} found)
              </h4>
              <p className="text-xs text-gray-500">
                Search time: {searchResults.searchTime}ms
              </p>
            </div>

            {searchResults.results.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.results.map((result) => (
                  <div
                    key={result.id}
                    className={cn(
                      "p-4 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50",
                      onResultSelect && "hover:border-blue-300"
                    )}
                    onClick={() => onResultSelect?.(result)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileIcon size={16} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="text-sm font-medium truncate">
                              {result.metadata.filename}
                            </h5>
                            {result.metadata.pageNumber && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                Page {result.metadata.pageNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {highlightQuery(truncateText(result.content), query)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Relevance: {formatScore(result.score)}</span>
                            <span>•</span>
                            <span>Chunk {result.metadata.chunkIndex + 1}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {formatScore(result.score)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <SearchIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No documents found matching your query</p>
                <p className="text-xs mt-1">Try using different keywords or uploading more documents</p>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Search uses semantic similarity to find relevant content</p>
          <p>• Results are ranked by relevance to your query</p>
          <p>• Try specific terms or questions for better results</p>
        </div>
      </CardContent>
    </Card>
  );
}