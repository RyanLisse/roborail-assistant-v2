# Frontend-Backend Integration Guide

This document describes the integration between the Next.js frontend and EncoreTS backend for the RAG chat application.

## Architecture Overview

The application now follows a proper client-server architecture:

- **Frontend (Next.js)**: User interface and client-side logic
- **Backend (EncoreTS)**: RAG services, document processing, and data management
- **Database (NeonDB)**: Centralized data storage with PGVector for embeddings

## API Integration

### Backend Client

The frontend uses a centralized API client (`/frontend/lib/api/backend-client.ts`) to communicate with the backend services.

### Available APIs

#### Chat APIs
- `POST /api/chat-rag` - Send messages using backend RAG system
- `GET /api/conversations` - List user conversations
- `GET /api/conversations/[id]` - Get conversation with messages
- `DELETE /api/conversations/[id]` - Delete conversation

#### Document APIs
- `POST /api/files/upload-rag` - Upload documents to backend processing
- `GET /api/files/upload-rag?documentId=X` - Check document processing status
- `POST /api/search` - Search knowledge base

### Backend Services

The backend provides these EncoreTS services:

#### Chat Service (`/backend/chat/`)
- `chat.ts` - Main chat API endpoints
- `rag-orchestration.ts` - RAG query processing pipeline
- `conversation-management.ts` - Conversation CRUD operations

#### Upload Service (`/backend/upload/`)
- Document upload and validation
- File storage in Encore buckets
- Processing status tracking

#### Search Service (`/backend/search/`)
- Vector search with Cohere embeddings
- Full-text search with PostgreSQL
- Hybrid search with reranking

#### LLM Service (`/backend/llm/`)
- Google Gemini integration
- RAG response generation
- Token usage tracking

## Data Flow

### Document Upload & Processing
1. User uploads document via frontend
2. Frontend calls `/api/files/upload-rag`
3. Frontend API proxies to backend upload service
4. Backend stores file and triggers processing
5. Document is parsed, chunked, and embedded
6. Status updates available via status endpoint

### Chat with RAG
1. User sends message via chat interface
2. Frontend calls `/api/chat-rag`
3. Frontend API proxies to backend chat service
4. Backend performs:
   - Query intent detection
   - Document retrieval and reranking
   - LLM response generation with context
   - Citation extraction
5. Response returned with citations and metadata

### Conversation Management
1. Conversations auto-created on first message
2. Message history stored in backend database
3. Frontend retrieves conversations via API
4. Full conversation context maintained

## Environment Configuration

### Frontend (.env.local)
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_USE_BACKEND_RAG=true
NEXT_PUBLIC_USE_BACKEND_UPLOAD=true
```

### Backend (Encore secrets)
```bash
# Set via: encore secret set
GeminiApiKey=your_gemini_api_key
CohereApiKey=your_cohere_api_key
UnstructuredApiKey=your_unstructured_api_key
NEON_DATABASE_URL=your_neon_connection_string
```

## Development Workflow

### Running Both Services

1. **Start Backend (Terminal 1):**
```bash
cd backend
encore run
# Backend runs on http://localhost:4000
```

2. **Start Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

### Testing Integration

1. **Upload a document:**
   - Use frontend upload interface
   - Check processing status
   - Verify document appears in backend database

2. **Test RAG chat:**
   - Ask questions about uploaded documents
   - Verify citations are returned
   - Check conversation history

3. **Health checks:**
   - Visit `/api/chat-rag` (GET) for backend health
   - Visit `/api/search` (GET) for search health

## Migration from Standalone Frontend

The following frontend components were updated:

### Removed
- `frontend/lib/db/schema.ts` - Replaced by backend database
- `frontend/lib/db/queries.ts` - Replaced by API calls
- Direct database connections from frontend

### Added
- `frontend/lib/api/backend-client.ts` - Backend API client
- `frontend/app/(chat)/api/chat-rag/` - RAG chat endpoint
- `frontend/app/(chat)/api/files/upload-rag/` - Document upload
- `frontend/app/(chat)/api/conversations/` - Conversation management
- `frontend/app/(chat)/api/search/` - Document search

### Modified
- Updated environment configuration
- Added feature flags for RAG integration
- Maintained existing UI components

## Authentication

Currently simplified to use anonymous users (`userId: "anonymous"`). 

To restore authentication:
1. Re-implement auth components in frontend
2. Update backend services to handle authenticated users
3. Pass user tokens in API requests
4. Update database queries to filter by user

## Error Handling

The integration includes comprehensive error handling:

- **Network errors**: Graceful degradation when backend is unavailable
- **Validation errors**: Clear error messages for invalid requests
- **Service errors**: Detailed error logging for debugging
- **Fallback responses**: Alternative responses when RAG fails

## Performance Considerations

- **Streaming**: Backend supports streaming responses (future enhancement)
- **Caching**: Backend includes embedding caching
- **Concurrency**: Backend handles concurrent requests efficiently
- **Rate limiting**: Consider adding rate limiting for production

## Monitoring

Health check endpoints available:
- Backend services: `GET /chat/health`, `/chat/rag/health`
- Frontend proxies: `GET /api/chat-rag`, `/api/search`

## Next Steps

1. **Implement streaming responses** for real-time chat
2. **Add authentication** for user-specific data
3. **Implement document management UI** for uploaded files
4. **Add analytics and monitoring** for usage tracking
5. **Optimize caching** for better performance