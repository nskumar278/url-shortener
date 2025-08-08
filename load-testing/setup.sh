#!/bin/bash

# Quick setup script for Locust load testing

echo "🚀 Setting up Locust for URL Shortener Load Testing"
echo "=================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is required but not installed."
    exit 1
fi

# Install Locust
echo "📦 Installing Locust..."
pip3 install locust

# Create virtual environment (optional but recommended)
if [ "$1" = "--venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv locust-env
    source locust-env/bin/activate
    pip install locust
    echo "✅ Virtual environment created. Activate with: source locust-env/bin/activate"
fi

echo ""
echo "✅ Setup complete! You can now run load tests:"
echo ""
echo "Quick start commands:"
echo "  ./run_tests.sh health          # Check service health"
echo "  ./run_tests.sh baseline        # Run baseline test"
echo "  ./run_tests.sh all             # Run complete test suite"
echo ""
echo "Manual Locust commands:"
echo "  locust -f locustfile.py --host=http://localhost"
echo "  # Then open http://localhost:8089 for the web UI"
echo ""
echo "Docker-based testing:"
echo "  docker compose --profile load-testing up"
echo "  # Access Locust at http://localhost:8089"
