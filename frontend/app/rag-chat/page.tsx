"use client";

import { RAGChat } from "@/components/rag-chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { backendClient } from "@/lib/api/backend-client";
import { Database, Upload, Search, MessageCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function RAGChatPage() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const health = await backendClient.healthCheck();
      setHealthStatus(health);
    } catch (error) {
      console.error("Health check failed:", error);
      setHealthStatus({ status: "unhealthy", error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto animate-pulse mb-4" />
          <p>Connecting to RAG backend...</p>
        </div>
      </div>
    );
  }

  if (healthStatus?.status !== "healthy") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Backend Service Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The RAG backend service is currently unavailable. Please check:
            </p>
            <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
              <li>Backend server is running on port 4000</li>
              <li>All required services are healthy</li>
              <li>Database connections are working</li>
            </ul>
            <div className="text-xs bg-gray-100 p-3 rounded font-mono">
              Error: {healthStatus?.error || "Service unreachable"}
            </div>
            <Button onClick={checkBackendHealth} className="w-full">
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold">RAG Knowledge Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Chat with your uploaded documents using retrieval-augmented generation
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={healthStatus.status === "healthy" ? "default" : "destructive"}
              className="text-xs"
            >
              {healthStatus.status}
            </Badge>
            
            <div className="flex gap-1">
              <Link href="/documents/upload">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
              </Link>
              <Link href="/documents">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Search className="w-4 h-4" />
                  Search
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-120px)]">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <RAGChat className="h-full" />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {healthStatus.services && Object.entries(healthStatus.services).map(([service, isHealthy]) => (
                  <div key={service} className="flex items-center justify-between text-xs">
                    <span className="capitalize">{service}:</span>
                    <Badge 
                      variant={isHealthy ? "default" : "destructive"} 
                      className="text-xs"
                    >
                      {isHealthy ? "✓" : "✗"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/documents/upload" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Documents
                  </Button>
                </Link>
                <Link href="/documents" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Database className="w-4 h-4 mr-2" />
                    Browse Knowledge Base
                  </Button>
                </Link>
                <Link href="/search" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Search className="w-4 h-4 mr-2" />
                    Advanced Search
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• Ask specific questions about your documents</p>
                <p>• Use follow-up questions for deeper insights</p>
                <p>• Citations show source relevance scores</p>
                <p>• Hover over citations to see source details</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}