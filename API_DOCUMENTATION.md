# API Documentation - URL Shortener Service

## 📋 Table of Contents
- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)
- [Response Formats](#response-formats)
- [Examples](#examples)

## 🌐 Overview

The URL Shortener API provides endpoints for creating short URLs, redirecting to original URLs, and retrieving analytics. The API follows RESTful principles and returns JSON responses.

### Version: v1
### Base Path: `/api/v1`

## 🔗 Base URL

```
Production:  https://short.xyz/api/v1
Development: http://localhost/api/v1
```

## 🔐 Authentication

Currently, the API is publicly accessible without authentication. Future versions may include API key authentication for premium features.

## 🚦 Rate Limiting

Rate limits are applied per IP address:
- **URL Creation**: 10 requests per minute
- **URL Retrieval**: 100 requests per minute
- **Analytics**: 20 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1635724800
```

## 📚 API Endpoints

### 1. Create Short URL

Creates a new short URL for the provided original URL.

**Endpoint:** `POST /urls`

**Request Body:**
```json
{
  "originalUrl": "https://example.com/very/long/url/path?param=value"
}
```

**Request Schema:**
```json
{
  "type": "object",
  "properties": {
    "originalUrl": {
      "type": "string",
      "format": "uri",
      "pattern": "^https?://",
      "maxLength": 2048,
      "description": "The original URL to be shortened"
    }
  },
  "required": ["originalUrl"],
  "additionalProperties": false
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Short URL created successfully",
  "data": {
    "shortUrlId": "abc123Xy",
    "originalUrl": "https://example.com/very/long/url/path?param=value",
    "shortUrl": "https://short.xyz/abc123Xy",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "expiresAt": null
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Validation Rules:**
- URL must be valid HTTP/HTTPS format
- URL must be accessible (returns 2xx status)
- URL length must not exceed 2048 characters
- Malicious domains are blocked

---

### 2. Redirect to Original URL

Redirects the client to the original URL associated with the short ID.

**Endpoint:** `GET /{shortUrlId}`

**Parameters:**
- `shortUrlId` (path): The short URL identifier (8 characters)

**Response (302 Found):**
```
Location: https://example.com/very/long/url/path?param=value
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Short URL not found",
  "error": {
    "code": "URL_NOT_FOUND",
    "details": "The requested short URL does not exist or has expired"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Performance Notes:**
- Average response time: ~35ms
- Cache hit ratio: >90%
- Automatic click tracking (non-blocking)

---

### 3. Get URL Analytics

Retrieves analytics and statistics for a specific short URL.

**Endpoint:** `GET /urls/{shortUrlId}/stats`

**Parameters:**
- `shortUrlId` (path): The short URL identifier

**Response (200 OK):**
```json
{
  "success": true,
  "message": "URL statistics retrieved successfully",
  "data": {
    "shortUrlId": "abc123Xy",
    "originalUrl": "https://example.com/very/long/url/path?param=value",
    "shortUrl": "https://short.xyz/abc123Xy",
    "clickCount": 1247,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T15:45:30.000Z",
    "analytics": {
      "totalClicks": 1247,
      "uniqueClicks": 892,
      "clicksToday": 45,
      "clicksThisWeek": 312,
      "clicksThisMonth": 1247,
      "topReferrers": [
        { "domain": "google.com", "clicks": 234 },
        { "domain": "twitter.com", "clicks": 189 },
        { "domain": "direct", "clicks": 456 }
      ],
      "topCountries": [
        { "country": "United States", "clicks": 567 },
        { "country": "United Kingdom", "clicks": 234 },
        { "country": "Germany", "clicks": 189 }
      ]
    }
  },
  "timestamp": "2025-01-15T15:45:30.000Z"
}
```

---

### 4. Health Check

Returns the health status of the service and its dependencies.

**Endpoint:** `GET /health`

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T15:45:30.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "5ms",
      "connections": {
        "active": 3,
        "idle": 2,
        "total": 5
      }
    },
    "cache": {
      "status": "healthy",
      "responseTime": "1ms",
      "memory": {
        "used": "234MB",
        "total": "512MB",
        "percentage": 45.7
      }
    },
    "application": {
      "status": "healthy",
      "memory": {
        "rss": "180MB",
        "heapUsed": "145MB",
        "heapTotal": "170MB"
      },
      "uptime": "2h 34m 12s"
    }
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T15:45:30.000Z",
  "checks": {
    "database": {
      "status": "unhealthy",
      "error": "Connection timeout after 5000ms",
      "lastSuccessful": "2025-01-15T15:40:00.000Z"
    },
    "cache": {
      "status": "healthy",
      "responseTime": "1ms"
    }
  }
}
```

---

### 5. Service Metrics

Returns Prometheus-formatted metrics for monitoring.

**Endpoint:** `GET /metrics`

**Response (200 OK):**
```prometheus
# HELP urls_created_total Total number of URLs created
# TYPE urls_created_total counter
urls_created_total 15420

# HELP redirects_processed_total Total number of redirects processed
# TYPE redirects_processed_total counter
redirects_processed_total{source="cache"} 142891
redirects_processed_total{source="database"} 11234

# HELP redirect_duration_seconds Redirect processing latency
# TYPE redirect_duration_seconds histogram
redirect_duration_seconds_bucket{le="0.001"} 1234
redirect_duration_seconds_bucket{le="0.005"} 12340
redirect_duration_seconds_bucket{le="0.01"} 45678
redirect_duration_seconds_bucket{le="0.025"} 89012
redirect_duration_seconds_bucket{le="0.05"} 142890
redirect_duration_seconds_bucket{le="+Inf"} 154124

# HELP cache_hit_ratio Cache hit ratio percentage
# TYPE cache_hit_ratio gauge
cache_hit_ratio 92.3
```

## ❌ Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error description",
    "field": "fieldName" // For validation errors
  },
  "timestamp": "2025-01-15T15:45:30.000Z",
  "requestId": "req_abc123xyz789" // For debugging
}
```

### HTTP Status Codes

| Status Code | Description | When Used |
|-------------|-------------|-----------|
| 200 | OK | Successful GET requests |
| 201 | Created | Successful URL creation |
| 302 | Found | Successful redirect |
| 400 | Bad Request | Invalid request data |
| 404 | Not Found | URL not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily down |

### Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `INVALID_URL` | 400 | Provided URL is not valid |
| `URL_NOT_ACCESSIBLE` | 400 | URL is not accessible |
| `URL_TOO_LONG` | 400 | URL exceeds maximum length |
| `URL_BLOCKED` | 400 | URL domain is blocked |
| `URL_NOT_FOUND` | 404 | Short URL does not exist |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVICE_UNAVAILABLE` | 503 | Database or cache unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## 📝 Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data specific to the endpoint
  },
  "timestamp": "2025-01-15T15:45:30.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Operation failed",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error description"
  },
  "timestamp": "2025-01-15T15:45:30.000Z"
}
```

## 💡 Examples

### Example 1: Create and Use Short URL

```bash
# 1. Create short URL
curl -X POST http://localhost/api/v1/urls \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://github.com/user/very-long-repository-name"
  }'

# Response:
{
  "success": true,
  "message": "Short URL created successfully",
  "data": {
    "shortUrlId": "gh789Xyz",
    "originalUrl": "https://github.com/user/very-long-repository-name",
    "shortUrl": "http://localhost/gh789Xyz",
    "createdAt": "2025-01-15T15:45:30.000Z"
  },
  "timestamp": "2025-01-15T15:45:30.000Z"
}

# 2. Use short URL (redirect)
curl -I http://localhost/gh789Xyz

# Response:
HTTP/1.1 302 Found
Location: https://github.com/user/very-long-repository-name
```

### Example 2: Get Analytics

```bash
# Get URL statistics
curl http://localhost/api/v1/urls/gh789Xyz/stats

# Response:
{
  "success": true,
  "message": "URL statistics retrieved successfully",
  "data": {
    "shortUrlId": "gh789Xyz",
    "originalUrl": "https://github.com/user/very-long-repository-name",
    "clickCount": 42,
    "createdAt": "2025-01-15T15:45:30.000Z",
    "updatedAt": "2025-01-15T16:20:15.000Z"
  },
  "timestamp": "2025-01-15T16:20:15.000Z"
}
```

### Example 3: Handle Rate Limiting

```bash
# Exceed rate limit
for i in {1..15}; do
  curl -X POST http://localhost/api/v1/urls \
    -H "Content-Type: application/json" \
    -d "{\"originalUrl\": \"https://example.com/test$i\"}"
done

# Response (after 10 requests):
{
  "success": false,
  "message": "Rate limit exceeded",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "details": "Maximum 10 requests per minute allowed"
  },
  "timestamp": "2025-01-15T16:20:15.000Z"
}
```

### Example 4: Error Handling

```bash
# Invalid URL
curl -X POST http://localhost/api/v1/urls \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "not-a-valid-url"}'

# Response:
{
  "success": false,
  "message": "Invalid URL format",
  "error": {
    "code": "INVALID_URL",
    "details": "URL must be a valid HTTP or HTTPS URL",
    "field": "originalUrl"
  },
  "timestamp": "2025-01-15T16:20:15.000Z"
}
```

## 🔧 SDKs and Integration

### JavaScript/Node.js SDK

```javascript
const UrlShortener = require('@company/url-shortener-sdk');

const client = new UrlShortener({
  baseUrl: 'https://short.xyz/api/v1',
  timeout: 5000
});

// Create short URL
const result = await client.createShortUrl('https://example.com/long-url');
console.log(result.shortUrl); // https://short.xyz/abc123Xy

// Get analytics
const stats = await client.getAnalytics('abc123Xy');
console.log(`Total clicks: ${stats.clickCount}`);
```

### Python SDK

```python
from url_shortener import UrlShortenerClient

client = UrlShortenerClient(
    base_url='https://short.xyz/api/v1',
    timeout=5.0
)

# Create short URL
result = client.create_short_url('https://example.com/long-url')
print(f"Short URL: {result.short_url}")

# Get analytics
stats = client.get_analytics('abc123Xy')
print(f"Total clicks: {stats.click_count}")
```

---

This API documentation provides comprehensive information for integrating with the URL Shortener Service. For additional support or questions, please refer to the [Architecture Documentation](./ARCHITECTURE.md) or contact the development team.
