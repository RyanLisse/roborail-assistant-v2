# Mastra RAG Migration Guide

This guide helps you migrate from the existing custom RAG implementation to the new Mastra-powered RAG system.

## 🎯 Migration Overview

The new Mastra integration provides:
- **Better Performance**: Optimized vector operations with proper pgvector integration
- **Advanced Features**: Graph RAG, improved chunking strategies, better embeddings (Cohere embed-v4.0)
- **Scalability**: Production-ready vector database with proper indexing
- **Observability**: Enhanced monitoring and health checks

## 📋 Migration Steps

### 1. Test Mastra Endpoints

First, verify that the Mastra integration is working:

```bash
# Test Mastra health
curl http://localhost:4001/mastra/test

# Test document processing
curl -X POST http://localhost:4001/mastra/test/document \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a test document about artificial intelligence and machine learning.",
    "filename": "test-ai.txt"
  }'

# Test vector search
curl -X POST http://localhost:4001/mastra/test/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence",
    "topK": 3
  }'

# Test complete RAG workflow
curl -X POST http://localhost:4001/mastra/test/rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is machine learning?",
    "topK": 3
  }'
```

### 2. Frontend API Endpoint Changes

Update your frontend to use the new Mastra endpoints:

#### Document Upload

**Old:**
```typescript
// POST /upload/file
const response = await fetch('/upload/file', {
  method: 'POST',
  body: JSON.stringify({
    fileName: 'document.pdf',
    fileData: base64Data,
    contentType: 'application/pdf'
  })
});
```

**New:**
```typescript
// POST /upload/file-mastra
const response = await fetch('/upload/file-mastra', {
  method: 'POST',
  body: JSON.stringify({
    fileName: 'document.pdf',
    fileData: base64Data,
    contentType: 'application/pdf',
    options: {
      processWithMastra: true,
      chunkingStrategy: 'recursive',
      chunkSize: 1000,
      chunkOverlap: 200,
      generateEmbeddings: true
    }
  })
});

// Response includes Mastra processing details
const result = await response.json();
console.log('Chunks created:', result.mastraProcessing.chunksCreated);
console.log('Embeddings generated:', result.mastraProcessing.embeddingsGenerated);
```

#### Search

**Old:**
```typescript
// POST /search/hybrid
const response = await fetch('/search/hybrid', {
  method: 'POST',
  body: JSON.stringify({
    query: 'machine learning',
    userID: 'user123',
    limit: 10
  })
});
```

**New:**
```typescript
// POST /search/mastra/vector (with optional Graph RAG)
const response = await fetch('/search/mastra/vector', {
  method: 'POST',
  body: JSON.stringify({
    query: 'machine learning',
    userID: 'user123',
    limit: 10,
    threshold: 0.7,
    options: {
      useGraphRAG: true,  // Enable Graph RAG for better context
      includeContext: true
    }
  })
});

// Or use complete RAG workflow
// POST /search/mastra/rag
const ragResponse = await fetch('/search/mastra/rag', {
  method: 'POST',
  body: JSON.stringify({
    query: 'Explain machine learning concepts',
    userID: 'user123',
    options: {
      useGraphRAG: true,
      systemPrompt: 'You are a helpful AI tutor.',
      temperature: 0.1,
      maxTokens: 800
    }
  })
});

const ragResult = await ragResponse.json();
console.log('Generated response:', ragResult.data.response);
console.log('Sources used:', ragResult.data.sources.length);
```

#### Chat

**Old:**
```typescript
// POST /chat
const response = await fetch('/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: 'What is deep learning?',
    conversationId: 'conv-123',
    userId: 'user123',
    responseMode: 'detailed'
  })
});
```

**New:**
```typescript
// POST /chat/mastra
const response = await fetch('/chat/mastra', {
  method: 'POST',
  body: JSON.stringify({
    message: 'What is deep learning?',
    conversationId: 'conv-123',
    userId: 'user123',
    responseMode: 'detailed',
    options: {
      useGraphRAG: true,
      includeContext: true,
      maxResults: 8,
      threshold: 0.7,
      temperature: 0.1,
      documentFilters: {
        tags: ['ai', 'machine-learning'],
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      }
    }
  })
});

const result = await response.json();
console.log('Response:', result.content);
console.log('Citations:', result.citations);
console.log('Follow-ups:', result.followUpQuestions);
console.log('RAG type:', result.metadata.ragType); // 'vector' or 'graph'
```

### 3. Response Format Changes

#### Enhanced Responses

The new Mastra endpoints provide richer response data:

```typescript
// Search Response
interface MastraSearchResponse {
  results: MastraSearchResult[];
  totalFound: number;
  query: string;
  processingTime: number;
  searchType: "vector" | "fulltext" | "hybrid" | "graph";
  retrievalDetails: {
    retrievalTime: number;
    rerankingTime?: number;
    graphWalkSteps?: number;
    cacheHit?: boolean;
  };
  generatedResponse?: {
    text: string;
    sources: MastraSearchResult[];
    generationTime: number;
    tokensUsed?: number;
  };
}

// Chat Response  
interface MastraChatResponse {
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
    chunkId?: string;
    metadata?: Record<string, any>;
  }>;
  metadata: {
    searchTime: number;
    llmTime: number;
    totalTime: number;
    tokensUsed?: number;
    documentsFound: number;
    chunksRetrieved: number;
    ragType: "vector" | "graph" | "hybrid";
    cacheHit?: boolean;
    graphWalkSteps?: number;
  };
  followUpQuestions?: string[];
  context?: {
    conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }>;
    documentsUsed: string[];
  };
}
```

### 4. New Features to Leverage

#### Graph RAG

Enable Graph RAG for exploring document relationships:

```typescript
const response = await fetch('/search/mastra/vector', {
  method: 'POST',
  body: JSON.stringify({
    query: 'machine learning applications',
    userID: 'user123',
    options: {
      useGraphRAG: true  // Explores related concepts via knowledge graph
    }
  })
});
```

#### Advanced Filtering

Use sophisticated document filtering:

```typescript
const response = await fetch('/chat/mastra', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Security best practices',
    userId: 'user123',
    options: {
      documentFilters: {
        documentTypes: ['application/pdf'],
        tags: ['security', 'cybersecurity'],
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        },
        metadata: {
          department: 'engineering',
          confidentiality: 'public'
        }
      }
    }
  })
});
```

#### Response Modes

Take advantage of different response styles:

```typescript
// Technical documentation mode
const technicalResponse = await fetch('/chat/mastra', {
  method: 'POST',
  body: JSON.stringify({
    message: 'How does JWT authentication work?',
    userId: 'user123',
    responseMode: 'technical',  // Focuses on technical details
    options: {
      systemPrompt: 'You are a senior software architect. Provide detailed technical explanations.',
      temperature: 0.0  // More deterministic
    }
  })
});

// Conversational mode for general users
const conversationalResponse = await fetch('/chat/mastra', {
  method: 'POST',
  body: JSON.stringify({
    message: 'What is machine learning?',
    userId: 'user123',
    responseMode: 'conversational',  // Friendly, accessible tone
    options: {
      temperature: 0.3  // More creative
    }
  })
});
```

### 5. Performance Monitoring

#### Health Checks

Monitor system health:

```typescript
const healthCheck = await fetch('/mastra/health');
const health = await healthCheck.json();

console.log('System status:', health.status);
console.log('Cohere API:', health.components.cohere);
console.log('Google API:', health.components.google);
console.log('Vector DB:', health.components.vectorStore);
```

#### Metrics

Track enhanced metrics:

```typescript
// Response includes detailed timing
const response = await fetch('/search/mastra/rag', { /* ... */ });
const result = await response.json();

console.log('Retrieval time:', result.data.retrievalTime);
console.log('Generation time:', result.data.generationTime);
console.log('Total time:', result.data.totalTime);
console.log('Cache hit:', result.data.retrievalDetails.cacheHit);
```

### 6. Error Handling

Handle new error formats:

```typescript
try {
  const response = await fetch('/mastra/process-document', {
    method: 'POST',
    body: JSON.stringify({ /* ... */ })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    console.error('Mastra operation failed:', result.error);
    // Handle specific error cases
    if (result.error.includes('embedding')) {
      // Handle embedding generation failure
    } else if (result.error.includes('vector')) {
      // Handle vector storage failure
    }
  }
} catch (error) {
  console.error('Network or parsing error:', error);
}
```

### 7. Migration Timeline

#### Phase 1: Parallel Testing (Week 1)
- Deploy Mastra endpoints alongside existing ones
- Test functionality with existing data
- Verify performance and accuracy

#### Phase 2: Frontend Updates (Week 2) 
- Update upload components to use Mastra endpoints
- Add new features (Graph RAG, advanced filtering)
- Implement enhanced error handling

#### Phase 3: Search Migration (Week 3)
- Migrate search components to Mastra
- Test hybrid and Graph RAG functionality
- Performance comparison and optimization

#### Phase 4: Chat Migration (Week 4)
- Migrate chat interface to Mastra
- Implement new response modes
- Add follow-up questions and context features

#### Phase 5: Cleanup (Week 5)
- Remove old endpoints
- Clean up unused code
- Final performance optimization

### 8. Rollback Plan

If issues arise, you can rollback by:

1. **Frontend**: Switch API endpoints back to original URLs
2. **Backend**: Comment out Mastra service imports
3. **Database**: Keep existing data intact (Mastra uses separate vector index)

### 9. Performance Comparison

Use the test endpoints to compare:

```bash
# Test old system
time curl -X POST http://localhost:4001/search/hybrid -d '{"query":"test","userID":"user123"}'

# Test new Mastra system  
time curl -X POST http://localhost:4001/search/mastra/vector -d '{"query":"test","userID":"user123"}'

# Compare results
```

### 10. Support and Troubleshooting

#### Common Issues

1. **Cohere API Errors**: Check `CohereApiKey` secret configuration
2. **Vector Store Issues**: Verify PostgreSQL connection and pgvector extension
3. **Performance Degradation**: Check cache hit rates and index status

#### Debug Tools

```bash
# Check Mastra health
curl http://localhost:4001/mastra/health

# Test individual components
curl http://localhost:4001/mastra/test

# Monitor logs
encore logs --service=mastra-rag
```

---

This migration leverages Mastra's advanced RAG capabilities while maintaining backward compatibility during the transition period. The new system provides better performance, more features, and enhanced observability compared to the custom implementation.