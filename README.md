# URL Shortener Service

A containerized, high-performance URL shortener service designed for scalability and reliability.

## 🔧 Resilience Features

### Circuit Breaker Pattern

The service implements a comprehensive circuit breaker pattern to handle failures gracefully and prevent cascade failures:

#### **States**
- **CLOSED**: Normal operation, requests flow through
- **OPEN**: Failures exceeded threshold, requests fail fast
- **HALF_OPEN**: Testing if service recovered, limited requests allowed

#### **Configuration**
```typescript
// Database operations
{
  failureThreshold: 5,        // Failures before opening
  successThreshold: 2,        // Successes to close from half-open
  timeout: 30000,            // Time in OPEN before trying HALF_OPEN
  resetTimeout: 60000        // Time to reset failure count
}

// External service operations  
{
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 15000,
  resetTimeout: 30000
}
```

#### **Graceful Degradation**
When circuit breakers are OPEN, the service provides fallback responses:

- **URL Creation**: Returns 503 with retry-after header
- **URL Retrieval**: Falls back to cache-only lookup
- **Stats**: Returns cached data with degraded accuracy warning

#### **Monitoring**
Circuit breaker metrics are exposed via:
- `/api/v1/health` endpoint
- Prometheus metrics for each breaker
- Grafana dashboards for visualization

#### **Usage Example**
```bash
# Test circuit breaker functionality
node scripts/test-circuit-breaker.js

# Monitor circuit breaker status
curl http://localhost:3000/api/v1/health | jq '.data.circuitBreakers'
```

### Connection Pool Optimization

Optimized for 256MB memory constraint:
- **Max Connections**: 5 per container
- **Idle Timeout**: 10 seconds  
- **Acquire Timeout**: 5 seconds
- **Connection Reuse**: Aggressive recycling

### Performance Monitoring

Real-time metrics collection:
- Database connection pool utilization
- Circuit breaker state changes
- Request latency and throughput
- Cache hit/miss ratios
- Error rates by operation type

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for development)
- MySQL 8.0+
- Redis 7.0+

### Quick Start
```bash
# Start all services
docker-compose up -d

# Check service health
curl http://localhost:3000/api/v1/health

# View metrics dashboard
open http://localhost:3001  # Grafana (admin/admin)
```

### API Endpoints

```bash
# Create short URL
POST /api/v1/urls
{
  "originalUrl": "https://example.com"
}

# Redirect to original URL
GET /api/v1/urls/{shortId}/redirect

# Get URL statistics
GET /api/v1/urls/{shortId}/stats

# Health check with circuit breaker status
GET /api/v1/health
```

## 📊 Load Testing

The service includes comprehensive load testing:

```bash
# Run baseline performance test
cd load-testing
./run_tests.sh

# Test circuit breaker resilience
node scripts/test-circuit-breaker.js
```

## 🏗️ Architecture

- **Containers**: 3 app instances with NGINX load balancer
- **Database**: MySQL with optimized connection pooling
- **Cache**: Redis for URL mapping and click counting
- **Monitoring**: Prometheus + Grafana stack
- **Resilience**: Circuit breakers + graceful degradation

## 📝 Performance Targets

- **Memory**: ≤256MB per container
- **CPU**: ≤0.5 vCPU per container  
- **Throughput**: 1000+ RPS
- **Latency**: <50ms p95
- **Availability**: 99.9% uptime
