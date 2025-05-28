# Encore.dev Integration Guide

This document outlines the Encore.dev integration improvements implemented in the roborail-assistant application.

## Overview

The application has been enhanced to follow Encore.dev best practices for:
- ✅ **Secrets Management**: Secure API key handling
- ✅ **Frontend Request Client**: Type-safe API communication
- ✅ **Redis Configuration**: Production-ready caching
- ✅ **Infrastructure Configuration**: Deployment-ready setup

## 1. Secrets Management

### Implementation
- **Backend Services**: Use `secret()` function from `encore.dev/config`
- **Standardized Names**: `CohereApiKey`, `GeminiApiKey`, `UnstructuredApiKey`
- **Local Development**: `.secrets.local.cue` file for overrides
- **Production**: Set via Encore Cloud dashboard or CLI

### Usage Example
```typescript
import { secret } from "encore.dev/config";

const cohereApiKey = secret("CohereApiKey");

// Use in API calls
const response = await fetch(COHERE_API_BASE, {
  headers: {
    Authorization: `Bearer ${cohereApiKey()}`,
  },
});
```

### Setting Secrets
```bash
# Development
encore secret set --type=development CohereApiKey

# Production
encore secret set --type=production CohereApiKey
```

## 2. Frontend Request Client

### Enhanced Client (`frontend/lib/api/encore-client.ts`)
- **Type-Safe**: Full TypeScript support with proper error handling
- **Encore Error Format**: Handles Encore API error responses
- **React Query Integration**: Optimized for async state management
- **Service Organization**: Mirrors backend service structure

### Usage Example
```typescript
import { encoreClient } from '@/lib/api/encore-client';

// Type-safe API calls
const response = await encoreClient.chat.sendMessage({
  message: "Hello",
  userId: "user123",
  responseMode: "detailed"
});

// With React Query
const { data, error, isLoading } = useQuery({
  queryKey: ['chat', 'health'],
  queryFn: () => encoreClient.chat.healthCheck(),
});
```

### Error Handling
```typescript
try {
  const result = await encoreClient.upload.uploadFile(request);
} catch (error) {
  if (error.code === 'invalid_argument') {
    // Handle validation error
  } else if (error.code === 'unauthenticated') {
    // Handle auth error
  }
}
```

## 3. Redis Configuration

### Current Status
- **Development**: Redis disabled (secrets limitation in shared lib)
- **Production**: Configured via infrastructure config
- **Fallback**: L1 memory cache ensures functionality

### Production Configuration
```json
{
  "redis": {
    "embedding_cache": {
      "host": "redis.example.com:6379",
      "database_index": 0,
      "auth": {
        "type": "auth",
        "auth_string": {"$env": "REDIS_AUTH_STRING"}
      },
      "max_connections": 50,
      "min_connections": 5,
      "key_prefix": "roborail:"
    }
  }
}
```

### Cache Architecture
- **L1 Cache**: In-memory LRU cache (always available)
- **L2 Cache**: Redis (production only)
- **Graceful Degradation**: Falls back to L1 if Redis unavailable

## 4. Infrastructure Configuration

### File: `backend/infra-config.json`
Production-ready configuration including:
- **Database**: PostgreSQL with connection pooling
- **Redis**: Caching layer configuration
- **Secrets**: Environment variable mapping
- **Metrics**: Prometheus integration
- **Object Storage**: S3-compatible storage
- **Authentication**: Service-to-service auth

### Deployment Usage
```bash
encore build docker --config backend/infra-config.json roborail-assistant:latest
```

## 5. Development Workflow

### Local Development
1. **Start Services**: `bun run dev` (runs both backend and frontend)
2. **Backend**: `http://127.0.0.1:4000`
3. **Frontend**: `http://localhost:3000`
4. **Dashboard**: `http://127.0.0.1:9400/roborail-assistant-w34i`

### Secret Management
1. **Set Development Secrets**:
   ```bash
   cd backend
   encore secret set --type=development CohereApiKey
   encore secret set --type=development GeminiApiKey
   encore secret set --type=development UnstructuredApiKey
   ```

2. **Or Use Local Override**: Edit `.secrets.local.cue`

### Production Deployment
1. **Set Production Secrets**: Via Encore Cloud dashboard
2. **Configure Infrastructure**: Update `infra-config.json`
3. **Build Docker Image**: With infrastructure config
4. **Deploy**: To your preferred cloud provider

## 6. Best Practices

### Secrets
- ✅ Never commit actual API keys
- ✅ Use environment variables in production
- ✅ Use Encore's secret management system
- ✅ Rotate secrets regularly

### Frontend-Backend Communication
- ✅ Use generated Encore client for type safety
- ✅ Implement proper error handling
- ✅ Use React Query for state management
- ✅ Handle offline scenarios

### Caching
- ✅ Design for Redis unavailability
- ✅ Use appropriate TTL values
- ✅ Monitor cache hit rates
- ✅ Implement cache warming strategies

### Infrastructure
- ✅ Use infrastructure as code
- ✅ Configure monitoring and metrics
- ✅ Plan for horizontal scaling
- ✅ Implement health checks

## 7. Monitoring and Observability

### Available Endpoints
- **Health Check**: `/chat/health`
- **RAG Health**: `/chat/rag/health`
- **Cache Metrics**: Available via cache manager
- **Development Dashboard**: Real-time service monitoring

### Metrics
- **Cache Performance**: Hit rates, response times
- **API Performance**: Request latency, error rates
- **Resource Usage**: Memory, CPU, database connections

## 8. Troubleshooting

### Common Issues

**Secrets Not Defined Warning**
```
warning: secrets not defined: CohereApiKey, GeminiApiKey, UnstructuredApiKey
```
**Solution**: Set secrets via CLI or use local override file

**Redis Connection Failed**
```
Failed to initialize Redis for embedding cache. Falling back to L1 only
```
**Solution**: Expected in development. Configure Redis for production.

**Version Mismatch Warning**
```
WARNING: The version of the Encore runtime this JS bundle was built for (v1.48.0) does not match...
```
**Solution**: Update Encore CLI and dependencies:
```bash
encore version update
bun add encore.dev@latest
```

## 9. Next Steps

### Recommended Improvements
1. **Redis Service**: Move Redis client to dedicated service
2. **Monitoring**: Implement comprehensive metrics
3. **Testing**: Add integration tests for Encore client
4. **Documentation**: API documentation generation
5. **Performance**: Implement caching strategies
6. **Security**: Add rate limiting and authentication

### Production Readiness Checklist
- [ ] Set all production secrets
- [ ] Configure Redis cluster
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategies
- [ ] Implement CI/CD pipeline
- [ ] Load testing and performance optimization
- [ ] Security audit and penetration testing
