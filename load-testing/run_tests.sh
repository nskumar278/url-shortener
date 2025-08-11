#!/bin/bash

# Performance Monitoring Script for URL Shortener
# This script runs comprehensive load tests and monitors performance metrics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORTS_DIR="./load-testing/reports"
PROMETHEUS_URL="http://localhost:9090"
GRAFANA_URL="http://localhost:3001"
APP_URL="http://localhost"

# Create reports directory
mkdir -p $REPORTS_DIR

echo -e "${BLUE}🚀 Starting URL Shortener Performance Testing Suite${NC}"
echo "=========================================================="

# Function to check if services are healthy
check_services() {
    echo -e "${YELLOW}📋 Checking service health...${NC}"
    
    # Check nginx
    if curl -s $APP_URL/nginx-health > /dev/null; then
        echo -e "${GREEN}✅ Nginx is healthy${NC}"
    else
        echo -e "${RED}❌ Nginx is not responding${NC}"
        exit 1
    fi
    
    # Check Prometheus
    if curl -s $PROMETHEUS_URL/-/healthy > /dev/null; then
        echo -e "${GREEN}✅ Prometheus is healthy${NC}"
    else
        echo -e "${RED}❌ Prometheus is not responding${NC}"
        exit 1
    fi
    
    # Check Grafana
    if curl -s $GRAFANA_URL/api/health > /dev/null; then
        echo -e "${GREEN}✅ Grafana is healthy${NC}"
    else
        echo -e "${RED}❌ Grafana is not responding${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All services are healthy!${NC}"
}

# Function to run a specific load test
run_load_test() {
    local test_name=$1
    local users=$2
    local spawn_rate=$3
    local duration=$4
    local user_class=${5:-""}
    
    echo -e "${BLUE}🔥 Running $test_name...${NC}"
    echo "Users: $users, Spawn Rate: $spawn_rate/s, Duration: ${duration}s"
    
    # Build locust command
    local cmd="locust -f ./load-testing/locustfile.py --host=$APP_URL -u $users -r $spawn_rate -t ${duration}s --html=$REPORTS_DIR/${test_name}.html --csv=$REPORTS_DIR/${test_name}"
    
    if [ ! -z "$user_class" ]; then
        cmd="$cmd $user_class"
    fi
    
    # Run the test
    echo "Command: $cmd"
    eval $cmd
    
    echo -e "${GREEN}✅ $test_name completed${NC}"
    echo "Report saved to: $REPORTS_DIR/${test_name}.html"
    echo ""
}

# Function to analyze results
analyze_results() {
    echo -e "${BLUE}📊 Analyzing Performance Results...${NC}"
    
    # Query Prometheus for key metrics
    echo "Fetching metrics from Prometheus..."
    
    # Response time (95th percentile)
    response_time=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=histogram_quantile(0.95,%20rate(http_request_duration_seconds_bucket[5m]))" | jq -r '.data.result[0].value[1] // "N/A"')
    
    # Request rate
    request_rate=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(http_requests_total[5m])" | jq -r '.data.result[0].value[1] // "N/A"')
    
    # Error rate
    error_rate=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" | jq -r '.data.result[0].value[1] // "N/A"')
    
    # Cache hit ratio (if available)
    cache_hits=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(redis_cache_hits_total[5m])" | jq -r '.data.result[0].value[1] // "0"')
    cache_misses=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(redis_cache_misses_total[5m])" | jq -r '.data.result[0].value[1] // "0"')
    
    echo ""
    echo "=========================================================="
    echo -e "${BLUE}📈 PERFORMANCE SUMMARY${NC}"
    echo "=========================================================="
    echo -e "95th Percentile Response Time: ${YELLOW}${response_time}s${NC} (Target: <0.05s)"
    echo -e "Request Rate: ${YELLOW}${request_rate} req/s${NC} (Target: >1000 req/s)"
    echo -e "Error Rate: ${YELLOW}${error_rate} req/s${NC} (Target: <1%)"
    
    if [ "$cache_hits" != "0" ] && [ "$cache_misses" != "0" ]; then
        cache_ratio=$(echo "scale=4; $cache_hits / ($cache_hits + $cache_misses)" | bc)
        echo -e "Cache Hit Ratio: ${YELLOW}${cache_ratio}${NC} (Target: >0.9)"
    fi
    
    echo "=========================================================="
    echo ""
    
    # Performance evaluation
    echo -e "${BLUE}🎯 PERFORMANCE EVALUATION${NC}"
    echo "=========================================================="
    
    # Check response time
    if (( $(echo "$response_time < 0.05" | bc -l) )); then
        echo -e "${GREEN}✅ Response Time: PASS${NC}"
    else
        echo -e "${RED}❌ Response Time: FAIL (>50ms)${NC}"
    fi
    
    # Check throughput
    if (( $(echo "$request_rate > 1000" | bc -l) )); then
        echo -e "${GREEN}✅ Throughput: PASS${NC}"
    else
        echo -e "${RED}❌ Throughput: FAIL (<1000 req/s)${NC}"
    fi
    
    echo "=========================================================="
}

# Function to generate summary report
generate_summary() {
    echo -e "${BLUE}📝 Generating Summary Report...${NC}"
    
    cat > $REPORTS_DIR/summary.md << EOF
# URL Shortener Load Testing Summary

**Test Date:** $(date)
**Target Performance:**
- Throughput: >1000 redirects/second
- Latency: <50ms (95th percentile)
- Cache Hit Ratio: >90%

## Test Results

### Key Metrics
- **95th Percentile Response Time:** ${response_time}s
- **Average Request Rate:** ${request_rate} req/s
- **Error Rate:** ${error_rate} req/s
- **Cache Hit Ratio:** ${cache_ratio:-"N/A"}

### Test Reports
- [Baseline Performance](./baseline_performance.html)
- [Cache Performance](./cache_performance.html) 
- [Stress Test](./stress_test.html)
- [Latency Test](./latency_test.html)
- [Sustained Load](./sustained_load.html)

### Monitoring URLs
- **Prometheus:** $PROMETHEUS_URL
- **Grafana:** $GRAFANA_URL
- **Application:** $APP_URL

### Resource Utilization
- **App Containers:** 3 × (256MB RAM, 0.5 vCPU)
- **Redis Cache:** 512MB RAM
- **MySQL Database:** 1GB RAM, 1 vCPU

EOF

    echo -e "${GREEN}✅ Summary report generated: $REPORTS_DIR/summary.md${NC}"
}

# Main execution
main() {
    case "${1:-all}" in
        "health")
            check_services
            ;;
        "baseline")
            check_services
            run_load_test "baseline_performance" 100 10 300
            analyze_results
            ;;
        "cache")
            check_services
            run_load_test "cache_performance" 50 5 600 "CacheWarmupUser"
            analyze_results
            ;;
        "stress")
            check_services
            run_load_test "stress_test" 500 50 300 "HighLoadUser"
            analyze_results
            ;;
        "latency")
            check_services
            run_load_test "latency_test" 200 20 300
            analyze_results
            ;;
        "sustained")
            check_services
            run_load_test "sustained_load" 100 5 1800
            analyze_results
            ;;
        "all")
            check_services
            echo -e "${BLUE}🔥 Running Complete Test Suite...${NC}"
            
            run_load_test "baseline_performance" 100 10 300
            sleep 30
            
            run_load_test "cache_performance" 50 5 600 "CacheWarmupUser"
            sleep 30
            
            run_load_test "stress_test" 500 50 300 "HighLoadUser"
            sleep 30
            
            run_load_test "latency_test" 200 20 300
            sleep 30
            
            analyze_results
            generate_summary
            ;;
        *)
            echo "Usage: $0 {health|baseline|cache|stress|latency|sustained|all}"
            echo ""
            echo "Options:"
            echo "  health    - Check service health"
            echo "  baseline  - Run baseline performance test"
            echo "  cache     - Run cache hit ratio test"
            echo "  stress    - Run stress test"
            echo "  latency   - Run latency-focused test"
            echo "  sustained - Run sustained load test"
            echo "  all       - Run complete test suite"
            exit 1
            ;;
    esac
}

# Install dependencies if needed
if ! command -v locust &> /dev/null; then
    echo -e "${YELLOW}⚠️  Locust not found. Installing...${NC}"
    pip install locust
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not found. Installing...${NC}"
    sudo apt-get update && sudo apt-get install -y jq
fi

if ! command -v bc &> /dev/null; then
    echo -e "${YELLOW}⚠️  bc not found. Installing...${NC}"
    sudo apt-get update && sudo apt-get install -y bc
fi

# Run main function
main "$@"
