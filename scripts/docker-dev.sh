#!/bin/bash

# Development Docker management script for NWScore API

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 {start|stop|restart|logs|status|clean|redis-cli}"
    echo ""
    echo "Commands:"
    echo "  start     - Start Redis and Redis Commander for development"
    echo "  stop      - Stop all development containers"
    echo "  restart   - Restart all development containers"
    echo "  logs      - Show logs from all containers"
    echo "  status    - Show status of all containers"
    echo "  clean     - Stop and remove all containers and volumes"
    echo "  redis-cli - Open Redis CLI"
    echo ""
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Start Redis and Redis Commander
    docker-compose -f docker-compose.dev.yml up -d
    
    print_success "Development environment started!"
    print_status "Redis is available at: redis://localhost:6379"
    print_status "Redis Commander is available at: http://localhost:8081"
    print_status "Login credentials: admin / admin123"
    echo ""
    print_status "To view logs: $0 logs"
    print_status "To stop: $0 stop"
}

# Function to stop development environment
stop_dev() {
    print_status "Stopping development environment..."
    docker-compose -f docker-compose.dev.yml down
    print_success "Development environment stopped!"
}

# Function to restart development environment
restart_dev() {
    print_status "Restarting development environment..."
    docker-compose -f docker-compose.dev.yml restart
    print_success "Development environment restarted!"
}

# Function to show logs
show_logs() {
    print_status "Showing logs from development containers..."
    docker-compose -f docker-compose.dev.yml logs -f
}

# Function to show status
show_status() {
    print_status "Development containers status:"
    docker-compose -f docker-compose.dev.yml ps
}

# Function to clean everything
clean_dev() {
    print_warning "This will stop and remove all development containers and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning development environment..."
        docker-compose -f docker-compose.dev.yml down -v
        print_success "Development environment cleaned!"
    else
        print_status "Clean operation cancelled."
    fi
}

# Function to open Redis CLI
redis_cli() {
    print_status "Opening Redis CLI..."
    docker exec -it nwscore-redis-dev redis-cli
}

# Main script logic
case "$1" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    restart)
        restart_dev
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    clean)
        clean_dev
        ;;
    redis-cli)
        redis_cli
        ;;
    *)
        show_usage
        exit 1
        ;;
esac 