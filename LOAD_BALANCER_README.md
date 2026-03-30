# 🚀 Load Balancer Setup - Usage Guide

## 📋 Overview

Your Smart Mess System is now configured with a **two-layer load balancing architecture**:

```
Client Request
    ↓
Nginx (Port 8080) - Layer 1 Load Balancer
    ↓ (Round-robin to: 5000, 5010, 5020)
Gateway Service (3 instances)
    ↓ (Round-robin to individual services)
Microservices (3 instances each):
    ├→ Auth-Service (5001, 5011, 5021)
    ├→ Menu-Service (5002, 5012, 5022)
    ├→ Response-Service (5003, 5013, 5023)
    └→ Calculation-Service (5004, 5014, 5024)
```

---

## 🎯 Quick Start

### Option 1: Start Everything at Once
Open PowerShell and run:
```powershell
cd "C:\VIT\CAT1\web dev\smart-mess-system_2"
.\start-all-services.ps1
```

This will:
- ✅ Open 18 new PowerShell windows
- ✅ Start 3 Gateway instances
- ✅ Start 3 instances of each service (Auth, Menu, Response, Calculation)
- ✅ All instances auto-configured with correct ports

**Wait 30-45 seconds** for all services to initialize.

### Option 2: Start Manually (Per Terminal)
For testing, you can start individual services:

```powershell
# Terminal 1: Gateway Instance 1
cd gateway
$env:PORT=5000; npm start

# Terminal 2: Gateway Instance 2
cd gateway
$env:PORT=5010; npm start

# Terminal 3: Auth Instance 1
cd auth-service
$env:PORT=5001; npm start

# And so on for each service/port combination...
```

---

## 🔗 Access Points

Once all services are running:

| Access Point | URL | Purpose |
|---|---|---|
| **Frontend** | `http://localhost` | Your React app (via Nginx reverse proxy) |
| **Nginx Load Balancer** | `http://localhost:8080` | Main entry point |
| **Gateway Health** | `http://localhost:8080/health` | Check load balancer status |
| **Direct Gateway** | `http://localhost:5000` | Direct access (for testing) |
| **API Auth** | `http://localhost:8080/api/auth/...` | Auth endpoints |
| **API Menu** | `http://localhost:8080/api/menu/...` | Menu endpoints |
| **API Response** | `http://localhost:8080/api/response/...` | Response endpoints |
| **API Calculate** | `http://localhost:8080/api/calculate/...` | Calculation endpoints |

---

## 📊 Service Port Mapping

### Gateway (3 instances)
- **Instance 1**: Port 5000
- **Instance 2**: Port 5010
- **Instance 3**: Port 5020

### Auth-Service (3 instances)
- **Instance 1**: Port 5001
- **Instance 2**: Port 5011
- **Instance 3**: Port 5021

### Menu-Service (3 instances)
- **Instance 1**: Port 5002
- **Instance 2**: Port 5012
- **Instance 3**: Port 5022

### Response-Service (3 instances)
- **Instance 1**: Port 5003
- **Instance 2**: Port 5013
- **Instance 3**: Port 5023

### Calculation-Service (3 instances)
- **Instance 1**: Port 5004
- **Instance 2**: Port 5014
- **Instance 3**: Port 5024

---

## 🛑 Stopping Services

### Option 1: Stop All at Once
```powershell
.\stop-all-services.ps1
```

This will:
- ✅ Kill all 18 Node.js service processes
- ❌ Leave Nginx running (can be restarted separately)

### Option 2: Stop Individual Service
Press `Ctrl+C` in any PowerShell window to stop that specific service.

---

## ✅ Testing Load Balancing

### Test 1: Check Load Distribution
Make multiple requests and watch the console logs to see which port handles each request:

```powershell
# Make 9 requests to Auth API
for ($i = 1; $i -le 9; $i++) {
    curl http://localhost:8080/api/auth/health
    Start-Sleep -Milliseconds 500
}
```

You should see them distributed across ports **5001, 5011, 5021** in round-robin fashion.

### Test 2: Verify High Availability
1. Keep all services running
2. Stop one instance (e.g., Auth on port 5001)
3. Make requests - they should still work via port 5011 or 5021
4. Restart that instance - it joins the pool again

### Test 3: Monitor Nginx
Check Nginx access logs:
```powershell
type "C:\nginx-1.28.3\logs\access.log"
```

---

## 🔍 Troubleshooting

### Port Already in Use
If a port is already in use:
```powershell
# Find process using port 5001
Get-NetTCPConnection -LocalPort 5001 | Select OwningProcess
Get-Process -Id <PID>

# Kill the process
Stop-Process -Id <PID> -Force
```

### Service Fails to Start
Check the error message in the PowerShell window. Common issues:
- **MongoDB not running**: Start MongoDB service
- **Redis not running**: Start Redis server
- **RabbitMQ not running**: Start RabbitMQ service
- **Dependencies not installed**: Run `npm install` in the service directory

### Nginx Not Responding
Reload Nginx:
```powershell
cd C:\nginx-1.28.3
.\nginx.exe -s reload
```

### Clear Logs
Each service stores logs in its `/logs/` directory:
```powershell
rm gateway/logs/*
rm auth-service/logs/*
# etc...
```

---

## 📝 How It Works

### Layer 1: Nginx Load Balancing
- Nginx listens on **port 8080**
- Receives all client requests
- Distributes them to Gateway instances (5000, 5010, 5020) using **round-robin**
- Checks health via `/health` endpoint
- Automatically removes unhealthy instances

### Layer 2: Gateway Load Balancing
- Each Gateway instance listens on a different port
- Routes requests to backend services
- Uses **round-robin algorithm** to distribute across service instances
- Maintains separate load balancer for each service (Auth, Menu, Response, Calculation)

### Example Request Flow
```
Request: http://localhost:8080/api/auth/login
    ↓
Nginx: Pick Gateway instance (round-robin):
    → localhost:5000/api/auth/login
    ↓
Gateway (5000): Pick Auth instance (round-robin):
    → localhost:5001/api/auth/login
    ↓
Auth-Service (5001): Process request
    ↓
Response back to client
```

Next request would go to different Gateway instance and different Auth instance.

---

## 🎓 Learning Resources

- **Nginx Load Balancing**: See `nginx/nginx.conf`
- **Gateway Load Balancer**: See `gateway/load-balancer.js`
- **Service Configuration**: Each service's `src/server.js` accepts `PORT` environment variable

---

## 📞 Support

If you need to:
- **Modify port numbers**: Update port arrays in `gateway/load-balancer.js` and `nginx/nginx.conf`
- **Change load balancing algorithm**: Edit `gateway/load-balancer.js` (currently uses round-robin)
- **Add new service**: Follow the pattern in `gateway/server.js` and create LoadBalancer instance

---

**Status**: ✅ Load Balancer Setup Complete!

Execute `.\start-all-services.ps1` to start your entire system.
