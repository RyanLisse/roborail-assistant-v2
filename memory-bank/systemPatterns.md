# System Patterns & Architecture

## Core Architecture Principles

### Modularity & Separation of Concerns
- **Service-Oriented Design**: Independent EncoreTS services with clear boundaries
- **Feature-Based Organization**: Code organized by business capability, not technical layer
- **Dependency Injection**: Services receive dependencies rather than creating them
- **Interface Segregation**: Small, focused interfaces for better testability

### Event-Driven Architecture
- **Pub/Sub Communication**: Async document processing via Encore topics
- **Workflow Orchestration**: Mastra workflows for complex multi-step processes
- **Event Sourcing**: Audit trail through comprehensive event logging
- **Graceful Degradation**: System continues operating when non-critical services fail

## Design Patterns

### Data Access Patterns
- **Repository Pattern**: Drizzle ORM with centralized database access
- **Unit of Work**: Transactional operations for data consistency
- **Query Object**: Complex search queries encapsulated in dedicated classes
- **Caching Strategy**: Multi-level caching (L1: memory, L2: Redis)

### Service Patterns
- **Factory Pattern**: Service instantiation with proper dependency injection
- **Strategy Pattern**: Different chunking strategies, embedding models
- **Adapter Pattern**: External API clients (Cohere, Gemini, Unstructured)
- **Circuit Breaker**: Resilient external service calls with fallbacks

### AI/ML Patterns
- **Pipeline Pattern**: Document processing → Chunking → Embedding → Storage
- **Agent Pattern**: Mastra RAG agent orchestrating retrieval and generation
- **Context Assembly**: Hybrid search → Reranking → Context formatting
- **Citation Tracking**: Source attribution throughout the RAG pipeline

## Code Organization Structure

### Backend Services (`src/features/`)
```
src/
├── features/
│   ├── document-upload/          # File upload and validation
│   ├── document-processing/      # Async processing workflows
│   ├── search/                   # Hybrid search and retrieval
│   ├── chat/                     # Conversation management
│   └── doc-mgmt/                 # Document CRUD operations
├── shared/
│   ├── infrastructure/
│   │   ├── database/             # Drizzle schema and connections
│   │   ├── caching/              # Multi-level cache implementation
│   │   ├── mastra/               # AI workflows and agents
│   │   └── monitoring/           # Metrics and observability
│   └── services/                 # External API clients
```

### Frontend Organization (`app/`)
```
app/
├── chat/                         # Chat interface pages
├── documents/                    # Document management UI
│   ├── upload/                   # Upload interface
│   └── page.tsx                  # Document list/management
├── components/
│   ├── ui/                       # Shadcn UI components
│   └── chat/                     # Chat-specific components
└── lib/                          # API clients and utilities
```

## Quality Patterns

### Error Handling
- **Structured Errors**: Consistent error types with context
- **Graceful Degradation**: Fallback behaviors for service failures
- **User-Friendly Messages**: Technical errors translated for users
- **Comprehensive Logging**: Error context preserved for debugging

### Testing Strategy
- **Test-Driven Development**: Tests written before implementation
- **Layered Testing**: Unit → Integration → E2E → RAG evaluation
- **Mock Strategies**: External services mocked for reliable testing
- **DeepEval Integration**: AI-specific testing for semantic quality

### Security Patterns
- **Secret Management**: All credentials via Encore secrets
- **Input Validation**: Server-side validation for all user inputs
- **Authentication**: Required for all endpoints with user context
- **Audit Logging**: Comprehensive activity tracking for compliance
