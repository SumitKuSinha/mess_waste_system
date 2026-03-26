# Smart Mess System - Microservices Architecture

## Project Structure

- **auth-service** (Port: 5001) - Authentication & JWT
- **menu-service** (Port: 5002) - Menu management with caching
- **response-service** (Port: 5003) - Student meal responses
- **calculation-service** (Port: 5004) - Calculate ingredients & meals
- **staff-service** (Port: 5005) - Staff operations & food tracking
- **notification-service** (Port: 5006) - Async notifications & reminders
- **gateway** - API Gateway (Optional)

## Setup Instructions

### 1. Install Dependencies for All Services

```bash
# Navigate to each service folder and run:
npm install

# Or use this bash script to install all at once
for service in auth-service menu-service response-service calculation-service staff-service notification-service; do
  cd $service
  npm install
  cd ..
done
```

### 2. Database Setup

- Ensure MongoDB is running locally on `mongodb://localhost:27017`
- Redis (optional) for caching on `redis://localhost:6379`

### 3. Run All Services

```bash
# Terminal 1 - Auth Service
cd auth-service && npm run dev

# Terminal 2 - Menu Service
cd menu-service && npm run dev

# Terminal 3 - Response Service
cd response-service && npm run dev

# Terminal 4 - Calculation Service
cd calculation-service && npm run dev

# Terminal 5 - Staff Service
cd staff-service && npm run dev

# Terminal 6 - Notification Service
cd notification-service && npm run dev
```

### 4. Test Services

```bash
# Check if all services are running
curl http://localhost:5001/health
curl http://localhost:5002/health
curl http://localhost:5003/health
curl http://localhost:5004/health
curl http://localhost:5005/health
curl http://localhost:5006/health
```

## Environment Variables

Each service has a `.env` file with:
-`PORT` -Service port
-`MONGO_URI`-MongoDB connection
-`NODE_ENV` - Development/Production
-Service-specific variables (JWT_SECRET, REDIS_URL, etc.)

## Architecture Benefits

✅ Independent deployments
✅ Easy to scale individual services
✅ Separate databases per service
✅ Clear responsibilities
✅ Fault isolation
