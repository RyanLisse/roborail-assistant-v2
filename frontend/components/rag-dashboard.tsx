"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { DocumentManager } from "./document-manager";
import { KnowledgeSearch } from "./knowledge-search";
import { RAGChat } from "./rag-chat";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { DocumentTextIcon, SearchIcon, ChatIcon, PlusIcon } from "./icons";
import type { SearchResult } from "@/lib/api/backend-client";

interface RAGDashboardProps {
  initialTab?: "chat" | "documents" | "search";
  className?: string;
}

export function RAGDashboard({ initialTab = "chat", className }: RAGDashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [uploadedDocuments, setUploadedDocuments] = useState<number>(0);

  const handleDocumentUploaded = useCallback((document: any) => {
    setUploadedDocuments(prev => prev + 1);
    // Optionally switch to chat tab after upload
    // setActiveTab("chat");
  }, []);

  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    // Could copy result content to chat input or show in a modal
    console.log("Selected search result:", result);
    setActiveTab("chat");
  }, []);

  const handleNewConversation = useCallback(() => {
    setConversationId(undefined);
    setActiveTab("chat");
  }, []);

  const handleConversationCreated = useCallback((newConversationId: string) => {
    setConversationId(newConversationId);
  }, []);

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RAG Assistant</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload documents, search your knowledge base, and chat with your data
          </p>
        </div>
        <div className="flex items-center gap-3">
          {uploadedDocuments > 0 && (
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {uploadedDocuments} document{uploadedDocuments !== 1 ? 's' : ''} uploaded
            </div>
          )}
          <Button onClick={handleNewConversation} variant="outline" size="sm">
            <PlusIcon className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="h-full flex flex-col">
          {/* Tab Navigation */}
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <ChatIcon className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <SearchIcon className="w-4 h-4" />
                Search
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden p-6">
            <TabsContent value="chat" className="h-full mt-0">
              <Card className="h-full">
                <CardContent className="p-0 h-full">
                  <RAGChat 
                    chatId={conversationId}
                    onConversationCreated={handleConversationCreated}
                    className="h-full"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="h-full mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                <div className="h-full">
                  <DocumentManager 
                    onDocumentUploaded={handleDocumentUploaded}
                    className="h-full"
                  />
                </div>
                <div className="h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Document Guidelines</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Supported Formats</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• PDF documents (.pdf)</li>
                          <li>• Microsoft Word (.doc, .docx)</li>
                          <li>• Plain text (.txt)</li>
                          <li>• Markdown (.md)</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Best Practices</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Keep files under 50MB for faster processing</li>
                          <li>• Use descriptive filenames</li>
                          <li>• Upload high-quality, readable documents</li>
                          <li>• Wait for processing to complete before querying</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Processing Status</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• <span className="text-blue-600">Uploading:</span> File is being uploaded</li>
                          <li>• <span className="text-blue-600">Processing:</span> Document is being parsed and indexed</li>
                          <li>• <span className="text-green-600">Ready:</span> Document is available for chat queries</li>
                          <li>• <span className="text-red-600">Failed:</span> Processing encountered an error</li>
                        </ul>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <Button 
                          onClick={() => setActiveTab("chat")} 
                          className="w-full"
                          disabled={uploadedDocuments === 0}
                        >
                          Start Chatting with Your Documents
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="search" className="h-full mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                <div className="h-full">
                  <KnowledgeSearch 
                    onResultSelect={handleSearchResultSelect}
                    className="h-full"
                  />
                </div>
                <div className="h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Search Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Search Techniques</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Use specific keywords and phrases</li>
                          <li>• Ask questions in natural language</li>
                          <li>• Include context for better results</li>
                          <li>• Try synonyms if initial search fails</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Example Queries</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• &ldquo;What is the company&apos;s revenue policy?&rdquo;</li>
                          <li>• &ldquo;machine learning algorithms&rdquo;</li>
                          <li>• &ldquo;How to implement authentication?&rdquo;</li>
                          <li>• &ldquo;project requirements and specifications&rdquo;</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Understanding Results</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Relevance scores show how well content matches your query</li>
                          <li>• Higher scores (closer to 100%) are more relevant</li>
                          <li>• Page numbers help locate content in source documents</li>
                          <li>• Click results to use them in chat conversations</li>
                        </ul>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <Button 
                          onClick={() => setActiveTab("chat")} 
                          className="w-full"
                        >
                          Switch to Chat for Interactive Q&A
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}