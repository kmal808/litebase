#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Installing Litebase...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating environment file...${NC}"
    cp .env.example .env
    
    # Generate random passwords and secrets
    DB_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 32)
    
    # Replace default values
    sed -i '' "s/your_secure_password_here/$DB_PASSWORD/" .env
    sed -i '' "s/your_jwt_secret_here/$JWT_SECRET/" .env
fi

# Start services
echo -e "${BLUE}Starting services...${NC}"
docker compose up -d

# Wait for services to be ready
echo -e "${BLUE}Waiting for services to be ready...${NC}"
sleep 5

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo -e "${GREEN}Installation complete!${NC}"
    echo -e "${GREEN}Admin dashboard: http://localhost:8080${NC}"
    echo -e "${GREEN}API endpoint: http://localhost:3000${NC}"
else
    echo "Something went wrong. Please check the logs with 'docker compose logs'"
    exit 1
fi 
