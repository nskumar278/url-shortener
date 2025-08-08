# Load Testing Scenarios

## Scenario 1: Baseline Performance Test
# Target: 1000 users, 10 requests/second per user
# Expected: ~10,000 requests/second total
# Duration: 5 minutes
locust -f locustfile.py --host=http://localhost -u 100 -r 10 -t 300s --html=reports/baseline_performance.html

## Scenario 2: Cache Hit Ratio Test  
# Target: Build cache with popular URLs, then test hit ratio
# Expected: >90% cache hit ratio
locust -f locustfile.py --host=http://localhost -u 50 -r 5 -t 600s --html=reports/cache_performance.html CacheWarmupUser

## Scenario 3: Stress Test
# Target: Push beyond limits to find breaking point
# Expected: Graceful degradation, no failures
locust -f locustfile.py --host=http://localhost -u 500 -r 50 -t 300s --html=reports/stress_test.html HighLoadUser

## Scenario 4: Latency Test
# Target: Focus on redirect latency <50ms
# Expected: 95th percentile <50ms
locust -f locustfile.py --host=http://localhost -u 200 -r 20 -t 300s --html=reports/latency_test.html

## Scenario 5: Sustained Load Test
# Target: 1000 req/s for 30 minutes
# Expected: Stable performance, no memory leaks
locust -f locustfile.py --host=http://localhost -u 100 -r 5 -t 1800s --html=reports/sustained_load.html

## Scenario 6: Ramp-up Test
# Target: Gradually increase load to test scaling
# Expected: Linear performance scaling
locust -f locustfile.py --host=http://localhost -u 1000 -r 10 -t 600s --html=reports/ramp_up_test.html
