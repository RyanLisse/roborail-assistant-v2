# Project Brief

## Project Name
RAG Chat Application - Enterprise Knowledge Management Platform

## Vision
Build a production-grade Retrieval Augmented Generation (RAG) chat application that enables knowledge workers to upload internal documents and query them through an intelligent chat interface with accurate, cited responses.

## Goal
Create a modular, scalable, and secure RAG platform following enterprise best practices for modularity, security, extensibility, and comprehensive monitoring.

## Core Technology Stack
- **Backend**: EncoreTS (services, APIs, pub/sub, object storage)
- **AI Orchestration**: Mastra AI (RAG agent, document processing workflows)
- **Database**: NeonDB (PostgreSQL with PGVector extension)
- **ORM**: Drizzle ORM
- **LLM**: Google Gemini 2.5 Flash
- **Embeddings**: Cohere embed-v4.0 (multimodal)
- **Reranking**: Cohere Rerank v3.0
- **Document Parsing**: Unstructured.io
- **Frontend**: Next.js, Shadcn UI, Tailwind CSS, Tanstack Query
- **Testing**: Vitest (unit/integration), DeepEval (RAG evaluation)
- **Caching**: Multi-level (in-memory + Redis)

## Core Features
- **Document Management**: Upload, process, and manage PDFs/DOCX with semantic chunking
- **Hybrid Search**: Vector similarity + Full-text search with Reciprocal Rank Fusion
- **RAG Chat**: Contextual responses with inline citations and source attribution
- **Conversation Management**: Auto-save drafts, history pruning, follow-up questions
- **Multi-level Caching**: Embedding cache for performance optimization
- **Comprehensive Testing**: DeepEval integration for RAG-specific evaluations
- **Production Monitoring**: Custom metrics, structured logging, performance tracking

## Target Users
- **Knowledge Workers**: Internal teams needing secure, accurate document Q&A
- **Administrators**: Managing document ingestion, access control, and system monitoring
- **Developers**: Extensible API for multiple frontend integrations

## Success Criteria
- **Functional**: End-to-end RAG chat flow operational with <3s response times
- **Quality**: 80%+ test coverage, <500 lines per file, no hardcoded secrets
- **Performance**: 100+ concurrent users, 80%+ cache hit rate
- **Security**: All secrets via Encore secrets, comprehensive input validation
- **Monitoring**: Real-time metrics and alerting for all core components
