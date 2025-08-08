# Load Testing & Monitoring Setup

This directory contains comprehensive load testing and monitoring configurations for the URL Shortener service.

## 🎯 Performance Goals

- **Throughput**: >1000 redirects/second
- **Latency**: <50ms (95th percentile)
- **Cache Hit Ratio**: >90%
- **Resource Efficiency**: Within container constraints (256MB/0.5vCPU per app)

## 🚀 Quick Start

### 1. Setup
```bash
cd load-testing
./setup.sh
```

### 2. Start Services
```bash
# Start the main application stack
docker compose -f docker-compose.dev.yml up -d

# Wait for services to be ready, then run health check
./run_tests.sh health
```

### 3. Run Load Tests
```bash
# Run complete test suite
./run_tests.sh all

# Or run individual tests
./run_tests.sh baseline    # Baseline performance
./run_tests.sh cache       # Cache hit ratio test  
./run_tests.sh stress      # Stress test
./run_tests.sh latency     # Latency-focused test
./run_tests.sh sustained   # 30-minute sustained load
```

## 📊 Monitoring

### Access Points
- **Locust UI**: http://localhost:8089 (when using Docker)
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Application**: http://localhost

### Key Metrics
- Response time percentiles (50th, 95th, 99th)
- Request rate and throughput
- Error rates by status code
- Cache hit/miss ratios
- Resource utilization (CPU, Memory)
- Container health status

## 🧪 Test Scenarios

### 1. Baseline Performance Test
- **Users**: 100
- **Duration**: 5 minutes
- **Goal**: Establish baseline metrics

### 2. Cache Hit Ratio Test
- **Users**: 50 
- **Duration**: 10 minutes
- **Goal**: Achieve >90% cache hit ratio

### 3. Stress Test
- **Users**: 500 (aggressive)
- **Duration**: 5 minutes
- **Goal**: Find breaking point, test graceful degradation

### 4. Latency Test
- **Users**: 200
- **Duration**: 5 minutes
- **Goal**: Validate <50ms redirect latency

### 5. Sustained Load Test
- **Users**: 100
- **Duration**: 30 minutes
- **Goal**: Test stability, memory leaks

## 🐳 Docker-based Load Testing

```bash
# Start Locust with workers
docker compose --profile load-testing up

# Access Locust web UI at http://localhost:8089
# Configure test parameters in the UI
```

## 📁 File Structure

```
load-testing/
├── locustfile.py           # Main Locust test definitions
├── run_tests.sh            # Comprehensive test runner
├── setup.sh                # Environment setup
├── test_scenarios.sh       # Individual test commands
├── README.md              # This file
└── reports/               # Generated test reports (created during tests)
    ├── baseline_performance.html
    ├── cache_performance.html
    ├── stress_test.html
    ├── latency_test.html
    ├── sustained_load.html
    └── summary.md
```

## 🎛️ Locust User Classes

### URLShortenerUser (Default)
- **70%** redirect requests (most critical)
- **30%** URL creation requests
- **10%** stats retrieval requests
- Simulates normal user behavior

### HighLoadUser
- Aggressive request frequency (10-100ms intervals)
- Used for stress testing

### CacheWarmupUser  
- Creates popular URLs and accesses them repeatedly
- Used to test cache performance

## 📈 Performance Analysis

After running tests, check:

1. **Locust Reports**: HTML reports in `reports/` directory
2. **Prometheus Metrics**: Query for detailed time-series data
3. **Grafana Dashboard**: Visual monitoring and alerting
4. **Summary Report**: `reports/summary.md` with key findings

## 🚨 Alerts & Thresholds

Prometheus alerts are configured for:
- Response time >50ms
- Cache hit ratio <90%
- Error rate >1%
- Throughput <1000 req/s
- High resource usage

## 🔧 Customization

### Modify Test Parameters
Edit `locustfile.py` to:
- Change request patterns
- Add new endpoints
- Modify user behavior
- Adjust timing

### Add New Test Scenarios
1. Add new function in `run_tests.sh`
2. Define test parameters
3. Update help text

### Custom Metrics
1. Add Prometheus queries in `run_tests.sh`
2. Update Grafana dashboard JSON
3. Add new alert rules in `prometheus/alert_rules.yml`

## 🎯 Success Criteria

### ✅ Performance Targets
- [ ] >1000 redirects/second sustained
- [ ] <50ms average redirect latency  
- [ ] >90% cache hit ratio
- [ ] <1% error rate
- [ ] Graceful degradation under stress

### ✅ Resource Constraints
- [ ] Apps stay within 256MB memory
- [ ] Apps stay within 0.5 vCPU
- [ ] Redis stays within 512MB
- [ ] No memory leaks during sustained load

## 🐛 Troubleshooting

### Common Issues
1. **Services not responding**: Check `docker compose ps` and logs
2. **Locust connection errors**: Verify network connectivity
3. **Missing metrics**: Ensure Prometheus scraping is configured
4. **High resource usage**: Check container limits and app efficiency

### Debug Commands
```bash
# Check service health
curl http://localhost/nginx-health

# View container resources
docker stats

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# View application logs
docker compose logs url-shortener-dev-app1
```
