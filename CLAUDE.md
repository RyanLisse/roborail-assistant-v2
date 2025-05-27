# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-grade RAG (Retrieval Augmented Generation) chat application built with EncoreTS, enabling knowledge workers to upload documents and query them through an intelligent chat interface. The project follows a microservices architecture with modular design and comprehensive testing.

## Tech Stack & Key Dependencies

- **Backend Framework**: EncoreTS (TypeScript microservices platform)
- **AI Orchestration**: Mastra AI (workflows, agents)
- **Database**: NeonDB (PostgreSQL + PGVector extension)
- **ORM**: Drizzle ORM
- **LLM**: Google Gemini 2.5 Flash
- **Embeddings**: Cohere embed-v4.0 (multimodal)
- **Document Processing**: Unstructured.io
- **Frontend**: Next.js, Shadcn UI, Tanstack Query
- **Testing**: Vitest, DeepEval (RAG evaluation)

## Common Development Commands

### Encore Commands
```bash
# Local development
encore run

# Testing
encore test

# Database operations
encore db shell    # Access database
encore db migrate  # Run migrations

# Deployment
git push encore     # Deploy to staging
```

### Task Management (TaskMaster)
```bash
# View all tasks
task-master list

# Get next task to work on
task-master next

# Set task status
task-master set-status --id=<id> --status=done

# Break down complex tasks
task-master expand --id=<id> --research

# View specific task details
task-master show <id>
```

### Package Management
```bash
bun install         # Install dependencies
bun run lint        # Run linting (if configured)
bun run typecheck   # TypeScript compilation check
```

## Architecture Overview

### Service Structure
The application follows EncoreTS microservices pattern with these core services:
- **UploadService**: Document upload handling
- **DocProcessingService**: Document parsing, chunking, embedding
- **SearchService**: Hybrid search with vector + FTS
- **ChatService**: Conversation management and RAG orchestration
- **DocMgmtService**: Document CRUD operations
- **LLMService**: Gemini API integration

### Data Models
- **documents**: Document metadata and status
- **document_chunks**: Semantic chunks with embeddings (PGVector)
- **conversations**: Chat session management
- **conversation_messages**: Message history with citations

### AI Pipeline Flow
1. Document upload → Unstructured.io parsing
2. Semantic chunking → Cohere embeddings
3. Vector storage in PGVector with HNSW indexing
4. Query → Hybrid search → Cohere reranking
5. Context assembly → Gemini response generation

## Development Workflow

### File Organization
- Keep files under 500 lines of code
- Use modular, service-based architecture
- Place secrets in Encore secrets (never hardcode)
- Follow EncoreTS service patterns

### Testing Strategy
- Write tests first (TDD approach)
- Use Vitest for unit/integration tests
- Use DeepEval for RAG evaluation
- Aim for 80%+ test coverage

### Code Quality Standards
- TypeScript strict mode enabled
- No hardcoded secrets or API keys
- Comprehensive error handling
- Structured logging throughout

## Project Context

### Current State
This is a new project with memory-bank documentation and TaskMaster integration. The core structure is being established following the PRD specifications in `scripts/prd.txt`.

### Key Implementation Slices
The project is organized into 15 vertical implementation slices covering:
- Backend foundation & database setup
- Document processing pipeline
- Search & retrieval systems
- Chat interface & RAG integration
- Frontend development
- Testing & monitoring

### Memory Bank Files
- `memory-bank/projectbrief.md`: Project overview and goals
- `memory-bank/techContext.md`: Technology stack details
- `memory-bank/activeContext.md`: Current development focus
- `memory-bank/progress.md`: Implementation progress tracking

## Secret Management

All secrets are managed through Encore's secret system:
- Database credentials
- API keys (Cohere, Gemini, Unstructured.io)
- Authentication tokens
- Never commit secrets to repository

## Special Considerations

### Performance Requirements
- Chat responses < 3 seconds
- Document processing < 5 minutes
- Support 100+ concurrent users
- 80%+ cache hit rate for embeddings

### Security Requirements
- User authentication for all endpoints
- Input validation and sanitization
- Access control for user-scoped data
- HTTPS and secure secret storage

### Monitoring & Observability
- Custom metrics for document processing, embedding generation, RAG retrieval
- Structured logging with context preservation
- Error tracking and alerting
- Performance monitoring via Encore dashboard

## TaskMaster Integration

This project uses the TaskMaster workflow system for task-driven development. Always check current tasks and update progress using the TaskMaster CLI commands listed above.