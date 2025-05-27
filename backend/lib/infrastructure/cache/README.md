# Embedding Cache System

This directory contains a multi-level caching system for embeddings to reduce API costs and improve performance.

## Architecture

The caching system uses a two-level approach:

- **L1 Cache**: In-memory cache for fastest access
- **L2 Cache**: Redis cache for persistence across restarts

## Components

### MultiLevelEmbeddingCache

The main cache class that handles both L1 and L2 caching with:
- Automatic fallback to L1-only if Redis is unavailable
- LRU eviction for memory management
- Configurable TTL for both cache levels
- Text normalization for consistent cache keys

### Configuration

Cache behavior is controlled through environment variables:

```bash
# L1 Memory Cache
EMBEDDING_CACHE_L1_SIZE=1000           # Max entries in memory
EMBEDDING_CACHE_L1_TTL_SECONDS=300     # 5 minutes TTL

# L2 Redis Cache  
EMBEDDING_CACHE_L2_TTL_SECONDS=86400   # 24 hours TTL

# Redis Connection
REDIS_URL=redis://localhost:6379       # Redis connection URL
REDIS_MAX_RETRIES=3                    # Max retry attempts
REDIS_RETRY_DELAY=100                  # Delay between retries (ms)
```

### Environment-Specific Defaults

The system automatically adjusts settings based on `NODE_ENV`:

- **Development**: Small cache, short TTL for rapid iteration
- **Test**: Very small cache, very short TTL for test isolation  
- **Production**: Large cache, long TTL for optimal performance

## Usage

### Basic Usage

```typescript
import { MultiLevelEmbeddingCache } from './embedding-cache';

const cache = new MultiLevelEmbeddingCache();

// Store embedding
await cache.set("Hello world", [0.1, 0.2, 0.3]);

// Retrieve embedding  
const embedding = await cache.get("Hello world");
```

### With Custom Configuration

```typescript
const cache = new MultiLevelEmbeddingCache({
  l1CacheSize: 2000,
  l1TtlSeconds: 600,
  l2TtlSeconds: 3600
});
```

### Integration with Embedding Generation

The cache is automatically integrated into the embedding generation pipeline:

1. Check L1 cache for each text
2. Check L2 cache for cache misses
3. Generate embeddings for remaining texts
4. Store new embeddings in both caches
5. Return combined results

## Monitoring

### Cache Metrics

```typescript
const metrics = cache.getMetrics();
console.log(metrics);
// {
//   l1Size: 150,
//   l1MaxSize: 1000, 
//   redisAvailable: true,
//   config: { ... }
// }
```

### Health Check

```typescript
const health = await cache.healthCheck();
console.log(health);
// {
//   l1: true,
//   l2: true, 
//   overall: true
// }
```

## Performance Considerations

### Cache Hit Rates

- **Good**: 80%+ hit rate
- **Acceptable**: 60%+ hit rate
- **Poor**: <60% hit rate (consider tuning TTL/size)

### Memory Usage

Each embedding entry uses approximately:
- Key: ~70 bytes (SHA256 hash + prefix)
- Value: ~10KB (typical embedding size)
- Overhead: ~100 bytes (Map entry, timestamps)

**Total per entry**: ~10.2KB

With default L1 cache size of 1000 entries:
**Memory usage**: ~10.2MB

### Redis Considerations

- Keys use SHA256 hashing for deduplication
- TTL is set on each key to prevent memory leaks
- Graceful degradation when Redis is unavailable
- Non-blocking cache operations (failures don't break main flow)

## Error Handling

The cache system is designed to be resilient:

1. **Redis Connection Failures**: Falls back to L1-only mode
2. **Redis Operation Failures**: Logs errors but continues operation
3. **Memory Pressure**: LRU eviction prevents memory overflow
4. **Invalid Configurations**: Validation prevents startup with bad config

## Security

- Text content is normalized and hashed for cache keys
- No sensitive data is stored in cache keys
- Redis connection supports TLS for secure communication
- Cache keys are prefixed to prevent collisions

## Testing

Run cache tests:

```bash
npm test lib/infrastructure/cache/__tests__/embedding-cache.test.ts
```

The test suite covers:
- L1 and L2 cache operations
- LRU eviction behavior
- Error handling and fallback
- Configuration validation
- Key generation and normalization

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Reduce `EMBEDDING_CACHE_L1_SIZE`
2. **Low Hit Rate**: Increase TTL values or cache size
3. **Redis Errors**: Check `REDIS_URL` and Redis server status
4. **Slow Performance**: Monitor cache response times

### Debug Logging

Enable debug logging to see cache operations:

```bash
NODE_ENV=development npm start
```

Look for log messages containing:
- "Embedding cache L1 hit"
- "Embedding cache L2 hit" 
- "Embedding cache miss"
- "Cache hit for embedding request"