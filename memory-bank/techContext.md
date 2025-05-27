# Technical Context

## Core Technology Stack

### Backend Framework
- **EncoreTS**: TypeScript microservices with built-in infrastructure
- **Services**: Independent, scalable services with auto-generated APIs
- **Pub/Sub**: Async communication via Encore topics and subscriptions
- **Object Storage**: Encore buckets for raw document storage
- **Secrets Management**: Secure configuration via Encore secrets

### Database & Storage
- **Primary Database**: NeonDB (PostgreSQL with PGVector extension)
- **ORM**: Drizzle ORM with type-safe queries and migrations
- **Vector Storage**: PGVector for embedding storage with HNSW indexing
- **Caching**: Multi-level caching (in-memory + Redis)
- **Search**: Hybrid vector similarity + full-text search with RRF

### AI & ML Stack
- **Orchestration**: Mastra AI for workflows and agent management
- **LLM**: Google Gemini 2.5 Flash for response generation
- **Embeddings**: Cohere embed-v4.0 (multimodal text + image)
- **Reranking**: Cohere Rerank v3.0 for relevance optimization
- **Document Processing**: Unstructured.io for PDF/DOCX parsing

### Frontend Technology
- **Framework**: Next.js 14 with App Router
- **UI Components**: Shadcn UI with Tailwind CSS
- **State Management**: Tanstack Query for server state
- **Type Safety**: TypeScript throughout the stack
- **Styling**: Tailwind CSS with responsive design

### Testing & Quality
- **Unit/Integration**: Vitest with comprehensive test coverage
- **RAG Evaluation**: DeepEval for semantic similarity and LLM rubrics
- **Code Quality**: ESLint, Prettier, strict TypeScript
- **Performance**: Custom metrics and monitoring

## Infrastructure & Deployment

### Development Environment
- **Package Manager**: bun (primary) with npm fallback
- **Development Server**: Encore local development with hot reload
- **Database**: Local NeonDB or development instance
- **External Services**: Development API keys for testing

### Production Environment
- **Hosting**: Encore Cloud with auto-scaling
- **Database**: NeonDB production instance with connection pooling
- **Caching**: Redis Cloud or managed Redis instance
- **Monitoring**: Encore metrics + custom application metrics
- **Logging**: Structured logging with request tracing

### Security & Configuration
- **Secret Management**: All API keys and credentials via Encore secrets
- **Environment Variables**: Environment-specific configuration
- **Authentication**: User-scoped access with session management
- **CORS**: Configured for frontend domain access

## External Service Integration

### AI/ML APIs
- **Cohere API**:
  - Embeddings: embed-v4.0 model for multimodal content
  - Reranking: rerank-english-v3.0 for relevance optimization
  - Rate limits and cost optimization via caching
- **Google Gemini API**:
  - Model: gemini-2.5-flash for fast response generation
  - Structured prompting for consistent output format
  - Citation parsing and source attribution
- **Unstructured.io API**:
  - High-resolution document parsing
  - Table and image extraction
  - Semantic element identification

### Infrastructure Services
- **NeonDB**:
  - PostgreSQL with PGVector extension
  - Automatic scaling and connection pooling
  - Point-in-time recovery and backups
- **Redis** (for caching):
  - Embedding cache with TTL management
  - Session storage and rate limiting
  - High availability configuration

## Development Workflow

### Code Organization
- **Monorepo Structure**: Backend and frontend in single repository
- **Feature-Based**: Code organized by business capability
- **Shared Libraries**: Common utilities and types
- **Strict Modularity**: <500 lines per file, clear interfaces

### Quality Assurance
- **Test-Driven Development**: Tests written before implementation
- **Continuous Integration**: Automated testing and quality checks
- **Code Review**: Peer review for all changes
- **Performance Monitoring**: Real-time metrics and alerting

### Deployment Strategy
- **Environment Promotion**: Local → Preview → Production
- **Feature Flags**: Gradual rollout of new features
- **Database Migrations**: Automated schema updates
- **Zero-Downtime Deployment**: Rolling updates with health checks

## Performance & Scalability

### Optimization Strategies
- **Caching**: Multi-level caching for expensive operations
- **Connection Pooling**: Efficient database connection management
- **Async Processing**: Non-blocking document processing
- **Resource Allocation**: Auto-scaling based on demand

### Monitoring & Observability
- **Custom Metrics**: Business-specific measurements
- **Performance Tracking**: Response times and throughput
- **Error Monitoring**: Comprehensive error tracking and alerting
- **User Analytics**: Usage patterns and feature adoption

### Cost Management
- **API Optimization**: Caching to reduce external API calls
- **Resource Efficiency**: Right-sizing compute resources
- **Usage Monitoring**: Tracking and optimizing service costs
- **Performance Budgets**: Maintaining response time SLAs

## Development Constraints & Standards

### Code Quality Standards
- **File Size Limit**: <500 lines per file for maintainability
- **Modularity**: Clear separation of concerns and interfaces
- **Security**: No hardcoded secrets, comprehensive input validation
- **Testing**: 80%+ test coverage with TDD approach
- **Documentation**: Comprehensive inline and API documentation
