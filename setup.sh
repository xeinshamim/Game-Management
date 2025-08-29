#!/bin/bash

# Gaming Tournament Platform Setup Script
# This script sets up the entire platform including backend services, mobile app, and admin dashboard

set -e

echo "🚀 Starting Gaming Tournament Platform Setup..."
echo "================================================"

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

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) is installed"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "npm $(npm -v) is installed"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p backend/logs
    mkdir -p mobile-app/logs
    mkdir -p admin-dashboard/logs
    mkdir -p docs
    mkdir -p shared
    
    print_success "Directories created successfully"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Copy environment example files
    if [ ! -f backend/.env ]; then
        cp backend/env.example backend/.env
        print_warning "Please update backend/.env with your configuration"
    fi
    
    # Create mobile app environment
    if [ ! -f mobile-app/.env ]; then
        cat > mobile-app/.env << EOF
# Mobile App Environment Configuration
API_BASE_URL=http://localhost:3000
AUTH_SERVICE_URL=http://localhost:3001
TOURNAMENT_SERVICE_URL=http://localhost:3002
PAYMENT_SERVICE_URL=http://localhost:3003
MATCH_SERVICE_URL=http://localhost:3004
SOCIAL_SERVICE_URL=http://localhost:3005
ANTI_CHEAT_SERVICE_URL=http://localhost:3006
EOF
        print_success "Mobile app environment file created"
    fi
    
    # Create admin dashboard environment
    if [ ! -f admin-dashboard/.env ]; then
        cat > admin-dashboard/.env << EOF
# Admin Dashboard Environment Configuration
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_AUTH_SERVICE_URL=http://localhost:3001
REACT_APP_TOURNAMENT_SERVICE_URL=http://localhost:3002
REACT_APP_PAYMENT_SERVICE_URL=http://localhost:3003
REACT_APP_MATCH_SERVICE_URL=http://localhost:3004
REACT_APP_SOCIAL_SERVICE_URL=http://localhost:3005
REACT_APP_ANTI_CHEAT_SERVICE_URL=http://localhost:3006
EOF
        print_success "Admin dashboard environment file created"
    fi
}

# Install backend dependencies
install_backend_dependencies() {
    print_status "Installing backend service dependencies..."
    
    cd backend
    
    # Install dependencies for each service
    for service in auth-service tournament-service payment-service match-service social-service anti-cheat-service; do
        if [ -d "$service" ]; then
            print_status "Installing dependencies for $service..."
            cd "$service"
            npm install
            cd ..
        fi
    done
    
    # Install scheduler service dependencies
    if [ -d "scheduler-service" ]; then
        print_status "Installing dependencies for scheduler-service..."
        cd scheduler-service
        npm install
        cd ..
    fi
    
    cd ..
    print_success "Backend dependencies installed successfully"
}

# Install frontend dependencies
install_frontend_dependencies() {
    print_status "Installing frontend dependencies..."
    
    # Install mobile app dependencies
    if [ -d "mobile-app" ]; then
        print_status "Installing mobile app dependencies..."
        cd mobile-app
        npm install
        cd ..
    fi
    
    # Install admin dashboard dependencies
    if [ -d "admin-dashboard" ]; then
        print_status "Installing admin dashboard dependencies..."
        cd admin-dashboard
        npm install
        cd ..
    fi
    
    print_success "Frontend dependencies installed successfully"
}

# Build Docker images
build_docker_images() {
    print_status "Building Docker images..."
    
    # Build backend service images
    cd backend
    
    for service in auth-service tournament-service payment-service match-service social-service anti-cheat-service; do
        if [ -d "$service" ]; then
            print_status "Building Docker image for $service..."
            cd "$service"
            docker build -t gaming-$service:latest .
            cd ..
        fi
    done
    
    # Build scheduler service image
    if [ -d "scheduler-service" ]; then
        print_status "Building Docker image for scheduler-service..."
        cd scheduler-service
        docker build -t gaming-scheduler-service:latest .
        cd ..
    fi
    
    cd ..
    print_success "Docker images built successfully"
}

# Start services with Docker Compose
start_services() {
    print_status "Starting services with Docker Compose..."
    
    cd backend
    
    # Start database services first
    print_status "Starting MongoDB and Redis..."
    docker-compose up -d mongodb redis
    
    # Wait for databases to be ready
    print_status "Waiting for databases to be ready..."
    sleep 10
    
    # Start all services
    print_status "Starting all services..."
    docker-compose up -d
    
    cd ..
    
    print_success "Services started successfully"
    print_status "Services are running on the following ports:"
    echo "  - API Gateway: http://localhost:3000"
    echo "  - Auth Service: http://localhost:3001"
    echo "  - Tournament Service: http://localhost:3002"
    echo "  - Payment Service: http://localhost:3003"
    echo "  - Match Service: http://localhost:3004"
    echo "  - Social Service: http://localhost:3005"
    echo "  - Anti-Cheat Service: http://localhost:3006"
    echo "  - MongoDB: localhost:27017"
    echo "  - Redis: localhost:6379"
}

# Setup development environment
setup_development() {
    print_status "Setting up development environment..."
    
    # Create development scripts
    cat > dev-start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Gaming Tournament Platform in development mode..."

# Start backend services
cd backend
echo "Starting backend services..."
docker-compose up -d mongodb redis
sleep 5

# Start each service in development mode
cd auth-service && npm run dev &
cd ../tournament-service && npm run dev &
cd ../payment-service && npm run dev &
cd ../match-service && npm run dev &
cd ../social-service && npm run dev &
cd ../anti-cheat-service && npm run dev &
cd ../scheduler-service && npm run dev &

# Start frontend applications
cd ../../mobile-app && npm start &
cd ../admin-dashboard && npm start &

echo "✅ All services started in development mode"
echo "Press Ctrl+C to stop all services"
wait
EOF
    
    chmod +x dev-start.sh
    
    # Create stop script
    cat > dev-stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping all development services..."

# Stop all Node.js processes
pkill -f "npm run dev"
pkill -f "npm start"

# Stop Docker services
cd backend
docker-compose down

echo "✅ All services stopped"
EOF
    
    chmod +x dev-stop.sh
    
    print_success "Development environment setup completed"
}

# Create documentation
create_documentation() {
    print_status "Creating documentation..."
    
    # API Documentation
    cat > docs/API.md << 'EOF'
# Gaming Tournament Platform API Documentation

## Overview
The platform consists of multiple microservices, each with its own API endpoints.

## Services

### Authentication Service (Port 3001)
- **Base URL**: `http://localhost:3001/api/auth`
- **Endpoints**:
  - `POST /register` - User registration
  - `POST /login` - User login
  - `POST /admin/login` - Admin login
  - `GET /profile` - Get user profile
  - `PUT /profile` - Update user profile
  - `POST /logout` - User logout

### Tournament Service (Port 3002)
- **Base URL**: `http://localhost:3002/api/tournaments`
- **Endpoints**:
  - `GET /` - Get all tournaments
  - `GET /:id` - Get tournament by ID
  - `POST /` - Create tournament (admin only)
  - `PUT /:id` - Update tournament
  - `DELETE /:id` - Delete tournament
  - `POST /register/:id` - Register for tournament
  - `DELETE /unregister/:id` - Unregister from tournament

### Payment Service (Port 3003)
- **Base URL**: `http://localhost:3003/api/payments`
- **Endpoints**:
  - `POST /deposit` - Deposit funds
  - `POST /withdraw` - Withdraw funds
  - `GET /transactions` - Get transaction history
  - `POST /webhooks/bkash` - bKash webhook
  - `POST /webhooks/nagad` - Nagad webhook

### Match Service (Port 3004)
- **Base URL**: `http://localhost:3004/api/matches`
- **Endpoints**:
  - `POST /results` - Submit match results (admin only)
  - `GET /:id` - Get match details
  - `PUT /:id/status` - Update match status

### Social Service (Port 3005)
- **Base URL**: `http://localhost:3005/api/social`
- **Endpoints**:
  - `POST /friends/request` - Send friend request
  - `PUT /friends/request/:id` - Accept/reject friend request
  - `GET /friends` - Get friends list
  - `DELETE /friends/:id` - Remove friend

### Anti-Cheat Service (Port 3006)
- **Base URL**: `http://localhost:3006/api/anti-cheat`
- **Endpoints**:
  - `GET /flags` - Get anti-cheat flags
  - `PUT /flags/:id` - Update flag status
  - `POST /analyze` - Analyze match for cheating

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format
All API responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling
Errors follow this format:
```json
{
  "success": false,
  "message": "Error message",
  "error": "ERROR_CODE",
  "details": [ ... ]
}
```
EOF
    
    # Development Guide
    cat > docs/DEVELOPMENT.md << 'EOF'
# Development Guide

## Prerequisites
- Node.js 18+
- Docker and Docker Compose
- MongoDB (optional, Docker will provide)
- Redis (optional, Docker will provide)

## Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd gaming-tournament-platform
```

### 2. Install dependencies
```bash
# Backend services
cd backend
for service in */; do
  cd "$service"
  npm install
  cd ..
done

# Frontend applications
cd ../mobile-app
npm install

cd ../admin-dashboard
npm install
```

### 3. Set up environment variables
Copy the example environment files and update them with your configuration:
```bash
cp backend/env.example backend/.env
# Update backend/.env with your settings
```

### 4. Start the platform
```bash
# Start all services with Docker
./setup.sh

# Or start in development mode
./dev-start.sh
```

## Development Workflow

### Backend Development
1. Each service runs independently
2. Use `npm run dev` to start a service in development mode
3. Services automatically restart when files change
4. Check logs in the `logs/` directory

### Frontend Development
1. Mobile app: `cd mobile-app && npm start`
2. Admin dashboard: `cd admin-dashboard && npm start`
3. Both use hot reloading for development

### Database
- MongoDB runs on port 27017
- Redis runs on port 6379
- Use MongoDB Compass or similar tool for database management

## Testing
```bash
# Run tests for a specific service
cd backend/auth-service
npm test

# Run all backend tests
cd backend
npm test
```

## Deployment
```bash
# Build production images
./setup.sh build

# Start production services
./setup.sh start
```

## Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure no other services are using the required ports
2. **Database connection**: Wait for MongoDB and Redis to fully start
3. **Permission errors**: Ensure Docker has proper permissions

### Logs
- Service logs: `backend/logs/`
- Docker logs: `docker-compose logs <service-name>`
- Application logs: Check individual service directories
EOF
    
    print_success "Documentation created successfully"
}

# Main setup function
main() {
    print_status "Starting setup process..."
    
    # Check prerequisites
    check_docker
    check_nodejs
    check_npm
    
    # Create directories
    create_directories
    
    # Setup environment
    setup_environment
    
    # Install dependencies
    install_backend_dependencies
    install_frontend_dependencies
    
    # Build Docker images
    build_docker_images
    
    # Setup development environment
    setup_development
    
    # Create documentation
    create_documentation
    
    print_success "Setup completed successfully!"
    echo ""
    echo "🎉 Gaming Tournament Platform is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Update environment files with your configuration"
    echo "2. Start services: ./setup.sh start"
    echo "3. Start development mode: ./dev-start.sh"
    echo "4. View documentation: docs/"
    echo ""
    echo "Happy coding! 🚀"
}

# Run main function
main "$@"
