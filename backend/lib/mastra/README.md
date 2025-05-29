# Mastra RAG Integration with Encore Backend

This document outlines the comprehensive integration of Mastra's RAG (Retrieval Augmented Generation) capabilities with the Encore.dev TypeScript backend.

## Overview

The integration provides:
- **Document Processing**: Advanced chunking strategies using Mastra
- **Embedding Generation**: Cohere embeddings via Mastra's AI SDK integration
- **Vector Storage**: PostgreSQL with pgvector extension
- **Retrieval**: Vector similarity search with optional Graph RAG
- **Response Generation**: Google Gemini LLM integration
- **Observability**: Comprehensive logging and metrics

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Encore.dev    │    │      Mastra      │    │   External      │
│   Services      │    │   RAG Engine     │    │   Services      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ upload-mastra   │───▶│ Document         │───▶│ Cohere API      │
│ search-mastra   │───▶│ Processing       │    │ (Embeddings)    │
│ chat-mastra     │───▶│ & Retrieval      │───▶│ Google Gemini   │
│ mastra-rag      │───▶│ & Generation     │    │ (LLM)           │
└─────────────────┘    └──────────────────┘    ├─────────────────┤
                                │               │ PostgreSQL      │
                                └──────────────▶│ + pgvector      │
                                                └─────────────────┘
```

## Core Components

### 1. Configuration (`config.ts`)

Central configuration for Mastra integration:

- **Mastra Instance**: Configured with Google Gemini LLM
- **Vector Store**: PostgreSQL with pgvector extension
- **Embedding Model**: Cohere embed-english-v3.0
- **RAG Settings**: Chunking, retrieval, and generation parameters

### 2. RAG Service (`rag-service.ts`)

Main service class providing:

```typescript
class MastraRAGService {
  // Document processing with chunking and embedding
  processDocument(request: ProcessDocumentRequest): Promise<ProcessDocumentResponse>
  
  // Vector similarity search with optional Graph RAG
  retrieveChunks(query: string, options: RetrievalOptions): Promise<RetrievalResult>
  
  // Response generation using LLM
  generateResponse(query: string, chunks: DocumentChunk[], options: GenerationOptions): Promise<GenerationResult>
  
  // Document management
  deleteDocument(documentId: string): Promise<{deletedCount: number}>
}
```

### 3. API Endpoints (`mastra-rag.ts`)

RESTful API endpoints exposing Mastra functionality:

- `POST /mastra/process-document` - Process and embed documents
- `POST /mastra/search` - Vector similarity search
- `POST /mastra/generate` - Generate responses from chunks
- `POST /mastra/rag` - Complete RAG workflow
- `DELETE /mastra/document/:id` - Delete document
- `GET /mastra/health` - Health check

## Enhanced Services

### Upload Service (`upload-mastra.ts`)

Enhanced file upload with Mastra processing:

```typescript
// Upload with automatic Mastra processing
POST /upload/file-mastra
{
  "fileName": "document.pdf",
  "fileData": "base64...",
  "options": {
    "processWithMastra": true,
    "chunkingStrategy": "recursive",
    "chunkSize": 1000,
    "chunkOverlap": 200
  }
}
```

Features:
- Automatic document parsing (PDF, DOCX, TXT)
- Intelligent chunking with multiple strategies
- Batch embedding generation
- Progress tracking and status updates

### Search Service (`search-mastra.ts`)

Advanced search capabilities using Mastra:

```typescript
// Vector search with optional Graph RAG
POST /search/mastra/vector
{
  "query": "How to implement authentication?",
  "options": {
    "useGraphRAG": true,
    "topK": 10,
    "threshold": 0.7
  }
}

// Complete RAG workflow
POST /search/mastra/rag
{
  "query": "Explain the deployment process",
  "options": {
    "systemPrompt": "You are a DevOps expert...",
    "temperature": 0.1
  }
}
```

Search Types:
- **Vector Search**: Semantic similarity using embeddings
- **Graph RAG**: Knowledge graph traversal for related content
- **Hybrid Search**: Combination of vector and full-text search
- **RAG Workflow**: Search + response generation

### Chat Service (`chat-mastra.ts`)

Conversational interface with Mastra RAG:

```typescript
// Enhanced chat with RAG
POST /chat/mastra
{
  "message": "What are the security best practices?",
  "responseMode": "detailed",
  "options": {
    "useGraphRAG": true,
    "includeContext": true,
    "temperature": 0.1
  }
}
```

Features:
- Conversation management with context
- Multiple response modes (detailed, concise, technical, conversational)
- Automatic citation generation
- Follow-up question suggestions
- Document filtering and metadata search

## Configuration

### Environment Variables

Required secrets in Encore:

```bash
# Mastra Configuration
CohereApiKey="your-cohere-api-key"
GoogleGenerativeAIApiKey="your-google-api-key"
PostgresConnectionString="postgresql://..."

# Optional
OTEL_ENDPOINT="https://your-observability-endpoint"
```

### Mastra Settings

Key configuration options in `config.ts`:

```typescript
export const RAG_CONFIG = {
  // Document chunking
  chunking: {
    strategy: 'recursive',
    size: 1000,
    overlap: 200,
    separators: ['\n\n', '\n', '. ', '? ', '! ', ' ']
  },
  
  // Embedding settings
  embedding: {
    model: "embed-english-v3.0",
    dimensions: 1024,
    batchSize: 100
  },
  
  // Vector store
  vectorStore: {
    indexName: "document_chunks",
    metricType: "cosine"
  },
  
  // Retrieval settings
  retrieval: {
    topK: 10,
    threshold: 0.7,
    rerankTopK: 5
  },
  
  // Graph RAG settings
  graphRag: {
    enabled: true,
    randomWalkSteps: 100,
    restartProb: 0.15,
    threshold: 0.75
  }
} as const;
```

## Usage Examples

### 1. Document Upload and Processing

```typescript
// Upload document with Mastra processing
const uploadResponse = await fetch('/upload/file-mastra', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'user-manual.pdf',
    fileSize: 2048576,
    contentType: 'application/pdf',
    fileData: base64Data,
    options: {
      processWithMastra: true,
      chunkingStrategy: 'recursive',
      chunkSize: 1200,
      chunkOverlap: 100
    }
  })
});

const result = await uploadResponse.json();
console.log(`Processed ${result.mastraProcessing.chunksCreated} chunks`);
```

### 2. Vector Search

```typescript
// Perform semantic search
const searchResponse = await fetch('/search/mastra/vector', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'How to configure SSL certificates?',
    userID: 'user123',
    limit: 5,
    threshold: 0.8,
    options: {
      useGraphRAG: false
    }
  })
});

const searchResults = await searchResponse.json();
console.log(`Found ${searchResults.data.totalFound} relevant chunks`);
```

### 3. Complete RAG Workflow

```typescript
// Get answer with sources
const ragResponse = await fetch('/search/mastra/rag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What are the deployment requirements?',
    userID: 'user123',
    options: {
      useGraphRAG: true,
      systemPrompt: 'You are a technical documentation expert.',
      maxTokens: 800,
      temperature: 0.1
    }
  })
});

const ragResult = await ragResponse.json();
console.log('Answer:', ragResult.data.response);
console.log('Sources:', ragResult.data.sources.length);
```

### 4. Conversational Chat

```typescript
// Start conversation with RAG
const chatResponse = await fetch('/chat/mastra', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'How do I set up monitoring?',
    userId: 'user123',
    responseMode: 'detailed',
    options: {
      useGraphRAG: true,
      includeContext: true,
      maxResults: 8,
      threshold: 0.7
    }
  })
});

const chatResult = await chatResponse.json();
console.log('Response:', chatResult.content);
console.log('Citations:', chatResult.citations.length);
console.log('Follow-ups:', chatResult.followUpQuestions);
```

## Advanced Features

### Graph RAG

Enable Graph RAG for exploring relationships between documents:

```typescript
{
  "options": {
    "useGraphRAG": true
  }
}
```

Graph RAG performs random walks through the knowledge graph to find semantically related content that might not be directly similar to the query.

### Document Filtering

Filter searches by document metadata:

```typescript
{
  "options": {
    "documentFilters": {
      "documentTypes": ["application/pdf"],
      "dateRange": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-12-31T23:59:59Z"
      },
      "tags": ["security", "deployment"],
      "metadata": {
        "department": "engineering"
      }
    }
  }
}
```

### Response Modes

Different response styles for various use cases:

- **detailed**: Comprehensive explanations with context
- **concise**: Brief, direct answers
- **technical**: Technical details and specifications
- **conversational**: Friendly, accessible tone

### Caching

Automatic caching of search results and embeddings:

- Search results cached for 5 minutes
- Embedding cache for repeated documents
- Health check results cached

## Monitoring and Observability

### Metrics Tracked

- Document processing time and success rate
- Search latency and result counts
- LLM response time and token usage
- Cache hit rates
- Error rates by operation type

### Logging

Structured logging with context:

```typescript
logger.info("Mastra RAG search completed", {
  query: req.query.substring(0, 100),
  resultCount: results.length,
  processingTime,
  ragType: "graph",
  cacheHit: false
});
```

### Health Checks

Monitor system health:

```bash
GET /mastra/health
```

Returns status of:
- Cohere API connectivity
- Google Gemini API connectivity
- Vector database connectivity
- Overall system health

## Migration from Custom RAG

To migrate from the existing custom RAG implementation:

1. **Update imports**: Replace custom RAG imports with Mastra services
2. **Update API calls**: Use new Mastra endpoints
3. **Update frontend**: Adapt to new response formats
4. **Test thoroughly**: Ensure functionality matches or exceeds previous implementation
5. **Monitor performance**: Compare metrics with previous system

## Best Practices

### Performance

- Use appropriate chunk sizes (800-1200 tokens work well)
- Set reasonable similarity thresholds (0.7-0.8)
- Implement caching for repeated queries
- Batch process multiple documents when possible

### Quality

- Use recursive chunking for structured documents
- Implement proper error handling and fallbacks
- Validate embeddings quality with test queries
- Monitor and adjust retrieval parameters based on user feedback

### Security

- Validate all user inputs
- Implement proper access controls
- Use environment variables for API keys
- Log security-relevant events

## Troubleshooting

### Common Issues

1. **Embedding Failures**: Check Cohere API key and network connectivity
2. **Vector Store Errors**: Verify PostgreSQL connection and pgvector extension
3. **Low Relevance Scores**: Adjust similarity threshold or chunking strategy
4. **Slow Performance**: Check database indexes and consider caching

### Debug Mode

Enable debug logging:

```typescript
logger.debug("Mastra operation details", {
  operation: "chunk_retrieval",
  parameters: { topK, threshold, filters },
  results: { count, avgScore }
});
```

## Future Enhancements

Planned improvements:

- **Multi-modal Support**: Images and other media types
- **Advanced Reranking**: Integration with specialized reranking models
- **Custom Embeddings**: Support for domain-specific embedding models
- **Real-time Updates**: Live document updates and incremental processing
- **Analytics Dashboard**: Visual monitoring and analytics interface

## Support

For issues or questions:

1. Check the logs for detailed error messages
2. Verify configuration and API keys
3. Test with the health check endpoint
4. Review Mastra documentation at https://mastra.ai/docs
5. Check Encore.dev documentation for service-specific issues

---

This integration provides a production-ready RAG system combining the power of Mastra's AI capabilities with Encore.dev's robust microservices architecture.