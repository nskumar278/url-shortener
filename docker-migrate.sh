#!/bin/sh

echo "Starting database migration process..."

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
while ! nc -z ${DB_HOST} 3306; do
  echo "MySQL is unavailable - sleeping for 2 seconds"
  sleep 2
done
echo "MySQL is up - executing migrations"

# Run database migrations
echo "Running database migrations..."
npx sequelize-cli db:migrate

# Check if migrations were successful
if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
    exit 0
else
    echo "❌ Migrations failed"
    exit 1
fi
