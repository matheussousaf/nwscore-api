# Docker Setup for NWScore API

This project includes Docker configuration for Redis and Redis Commander to support the Redis-based leaderboard system.

## 🐳 Quick Start

### Development Environment

1. **Start Redis and Redis Commander:**
   ```bash
   ./scripts/docker-dev.sh start
   ```

2. **Access Redis Commander:**
   - URL: http://localhost:8081
   - Username: `admin`
   - Password: `admin123`

3. **Stop the environment:**
   ```bash
   ./scripts/docker-dev.sh stop
   ```

### Production Environment

1. **Start all services (including the API):**
   ```bash
   docker-compose up -d
   ```

2. **Start only Redis and Redis Commander:**
   ```bash
   docker-compose --profile dev up -d
   ```

## 📁 File Structure

```
├── docker-compose.yml          # Production Docker Compose
├── docker-compose.dev.yml      # Development Docker Compose
├── Dockerfile                  # Application Dockerfile
├── .dockerignore              # Docker ignore file
├── scripts/
│   └── docker-dev.sh          # Development management script
└── DOCKER.md                  # This file
```

## 🔧 Services

### Redis
- **Image:** `redis:7-alpine`
- **Port:** `6379`
- **Purpose:** Leaderboard data storage and caching
- **Features:**
  - Persistence enabled (AOF)
  - Health checks
  - Automatic restarts

### Redis Commander
- **Image:** `rediscommander/redis-commander:latest`
- **Port:** `8081`
- **Purpose:** Web-based Redis management interface
- **Features:**
  - Visual Redis data browser
  - Real-time data viewing
  - Key management
  - Sorted set visualization (perfect for leaderboards)

### Application (Production)
- **Port:** `3000`
- **Purpose:** NestJS API server
- **Features:**
  - Multi-stage build
  - Prisma migrations
  - Production optimizations

## 🚀 Development Scripts

The `scripts/docker-dev.sh` script provides easy management of the development environment:

```bash
# Start development environment
./scripts/docker-dev.sh start

# Stop development environment
./scripts/docker-dev.sh stop

# Restart development environment
./scripts/docker-dev.sh restart

# View logs
./scripts/docker-dev.sh logs

# Check container status
./scripts/docker-dev.sh status

# Clean everything (removes volumes)
./scripts/docker-dev.sh clean

# Open Redis CLI
./scripts/docker-dev.sh redis-cli
```

## 🔍 Redis Data Structure

### Leaderboard Keys
The Redis leaderboard system uses the following key structure:

```
# Player statistics (Redis Hashes)
player:{playerId}:class:{playerClass}:stats

# Leaderboards (Redis Sorted Sets)
leaderboard:winrate
leaderboard:mostwins
leaderboard:leastdeaths
leaderboard:mostkills
leaderboard:mostassists

# Filtered leaderboards
leaderboard:winrate:world:{world}
leaderboard:winrate:world:{world}:class:{class}
```

### Example Data in Redis Commander

1. **Player Stats Hash:**
   ```
   Key: player:123:class:Warrior:stats
   Fields:
   - gamesPlayed: "10"
   - totalScore: "1500.5"
   - totalKills: "45"
   - totalDeaths: "12"
   - totalAssists: "8"
   - wins: "7"
   - avgScore: "150.05"
   - avgKills: "4.5"
   - avgDeaths: "1.2"
   - avgAssists: "0.8"
   - winRate: "70.0"
   - lastUpdated: "2025-01-06T..."
   ```

2. **Leaderboard Sorted Set:**
   ```
   Key: leaderboard:winrate
   Members:
   - "{\"playerId\":\"123\",\"playerClass\":\"Warrior\",\"nickname\":\"\"}" -> 70.0
   - "{\"playerId\":\"456\",\"playerClass\":\"Mage\",\"nickname\":\"\"}" -> 65.5
   ```

## 🛠️ Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Check what's using the port
   lsof -i :6379
   lsof -i :8081
   
   # Stop conflicting containers
   docker stop $(docker ps -q)
   ```

2. **Redis connection issues:**
   ```bash
   # Check Redis logs
   docker logs nwscore-redis-dev
   
   # Test Redis connection
   docker exec -it nwscore-redis-dev redis-cli ping
   ```

3. **Redis Commander not loading:**
   ```bash
   # Check Redis Commander logs
   docker logs nwscore-redis-commander-dev
   
   # Restart the service
   ./scripts/docker-dev.sh restart
   ```

### Useful Redis Commands

```bash
# Connect to Redis CLI
./scripts/docker-dev.sh redis-cli

# View all leaderboard keys
KEYS leaderboard:*

# View player stats
HGETALL player:123:class:Warrior:stats

# View leaderboard rankings
ZREVRANGE leaderboard:winrate 0 -1 WITHSCORES

# Clear all leaderboards
DEL leaderboard:winrate leaderboard:mostwins leaderboard:leastdeaths leaderboard:mostkills leaderboard:mostassists
```

## 🔄 Environment Variables

Make sure your `.env` file includes:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Database Configuration (for production)
DATABASE_URL=your_database_url_here
```

## 📊 Monitoring

### Redis Commander Features
- **Real-time data viewing:** See leaderboard updates as they happen
- **Sorted set visualization:** Perfect for viewing leaderboard rankings
- **Key management:** Add, edit, or delete Redis keys
- **Search functionality:** Find specific keys or patterns
- **Data export:** Export Redis data for analysis

### Health Checks
Both Redis and the application include health checks:
- Redis: `redis-cli ping`
- Application: Built-in health endpoints

## 🚀 Production Deployment

For production deployment:

1. **Build and start all services:**
   ```bash
   docker-compose up -d --build
   ```

2. **Run database migrations:**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

3. **Monitor logs:**
   ```bash
   docker-compose logs -f
   ```

## 🔐 Security Notes

- Redis Commander credentials are set to `admin/admin123` for development
- In production, change these credentials or disable Redis Commander
- Redis is exposed on localhost only by default
- Consider using Redis ACLs for production environments

## 📈 Performance

- **Redis:** Sub-millisecond response times for leaderboard queries
- **Sorted Sets:** O(log N) complexity for ranking operations
- **Memory Usage:** Efficient storage with Redis data structures
- **Scalability:** Can handle thousands of concurrent players

This Docker setup provides a complete development and production environment for the Redis-based leaderboard system! 