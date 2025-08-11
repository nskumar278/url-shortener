#!/bin/bash

set -e

echo "🚀 Starting URL Shortener Production Environment"
echo "================================================"

# Check if docker-compose is available
if ! command -v docker compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install docker-compose first."
    exit 1
fi

# Build and start services
echo "📦 Building base services..."
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d mysql redis

echo "⏳ Waiting for database to be ready..."
echo "   Checking MySQL..."
until docker compose exec mysql mysqladmin ping -h"localhost" -u"url_shortener_user" -p"pass" --silent 2>/dev/null; do
    echo "   MySQL not ready yet, waiting..."
    sleep 3
done
echo "   ✅ MySQL is ready!"


# Run migrations
echo "🔄 Running database migrations..."
docker compose --profile migration run --rm migrate

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo "   ✅ Migrations completed successfully!"
else
    echo "   ❌ Migration failed! Check the logs above."
    exit 1
fi

echo "📦 Building application containers..."
docker compose build url-shortener-app1 url-shortener-app2 url-shortener-app3 nginx

echo "🚀 Starting application services..."
docker compose up -d url-shortener-app1 url-shortener-app2 url-shortener-app3

echo "⏳ Waiting for app services to be ready..."
sleep 15

echo "🌐 Starting NGINX load balancer..."
docker compose up -d nginx

echo "✅ Deployment complete!"
echo ""
echo "🔗 Service URLs:"
echo "   Main Application: http://localhost"
echo "   Health Check: http://localhost/health"
echo "   NGINX Status: http://localhost/nginx-status"
echo ""
echo "📊 Resource Usage:"
echo "   App Containers: 3 × (256MB RAM, 0.5 vCPU)"
echo "   Redis Cache: 512MB RAM"
echo "   MySQL Database: 1GB RAM, 1.0 vCPU"
echo "   NGINX Load Balancer: Default limits"
echo ""
echo "🔍 Check container status:"
echo "   docker-compose ps"
echo ""
echo "📝 View logs:"
echo "   docker compose logs -f [service-name]"
