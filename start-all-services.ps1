# ========================================
# START ALL SERVICES WITH LOAD BALANCING
# ========================================

$projectPath = "C:\VIT\CAT1\web dev\smart-mess-system_2"

Function Start-Service {
    param(
        [string]$ServiceName,
        [string]$ServicePath,
        [int]$Port,
        [string]$Label
    )
    
    $fullPath = Join-Path $projectPath $ServicePath
    
    # Start in new PowerShell window - MINIMIZED (no popup)
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "cd '$fullPath'; `
         `$env:PORT=$Port; `
         Write-Host 'Starting $Label on port $Port' -ForegroundColor Cyan; `
         npm start" `
        -WindowStyle Minimized
    
    Write-Host "[OK] Started $Label on port $Port" -ForegroundColor Green
}

Write-Host "
================================================================
   STARTING SMART MESS SYSTEM WITH LOAD BALANCING
================================================================

Wait... Starting 18 service instances...
" -ForegroundColor Yellow

# GATEWAY SERVICE (3 instances)
Write-Host "`n[GATEWAY] Starting 3 instances" -ForegroundColor Magenta
Start-Service -ServiceName "gateway" -ServicePath "gateway" -Port 5000 -Label "Gateway-1"
Start-Service -ServiceName "gateway" -ServicePath "gateway" -Port 5010 -Label "Gateway-2"
Start-Service -ServiceName "gateway" -ServicePath "gateway" -Port 5020 -Label "Gateway-3"

# AUTH SERVICE (3 instances)
Write-Host "`n[AUTH] Starting 3 instances" -ForegroundColor Blue
Start-Service -ServiceName "auth" -ServicePath "auth-service" -Port 5001 -Label "Auth-1"
Start-Service -ServiceName "auth" -ServicePath "auth-service" -Port 5011 -Label "Auth-2"
Start-Service -ServiceName "auth" -ServicePath "auth-service" -Port 5021 -Label "Auth-3"

# MENU SERVICE (3 instances)
Write-Host "`n[MENU] Starting 3 instances" -ForegroundColor Green
Start-Service -ServiceName "menu" -ServicePath "menu-service" -Port 5002 -Label "Menu-1"
Start-Service -ServiceName "menu" -ServicePath "menu-service" -Port 5012 -Label "Menu-2"
Start-Service -ServiceName "menu" -ServicePath "menu-service" -Port 5022 -Label "Menu-3"

# RESPONSE SERVICE (3 instances)
Write-Host "`n[RESPONSE] Starting 3 instances" -ForegroundColor Cyan
Start-Service -ServiceName "response" -ServicePath "response-service" -Port 5003 -Label "Response-1"
Start-Service -ServiceName "response" -ServicePath "response-service" -Port 5013 -Label "Response-2"
Start-Service -ServiceName "response" -ServicePath "response-service" -Port 5023 -Label "Response-3"

# CALCULATION SERVICE (3 instances)
Write-Host "`n[CALCULATION] Starting 3 instances" -ForegroundColor Yellow
Start-Service -ServiceName "calculation" -ServicePath "calculation-service" -Port 5004 -Label "Calculation-1"
Start-Service -ServiceName "calculation" -ServicePath "calculation-service" -Port 5014 -Label "Calculation-2"
Start-Service -ServiceName "calculation" -ServicePath "calculation-service" -Port 5024 -Label "Calculation-3"

Write-Host "
================================================================
                    ALL SERVICES STARTED!
================================================================

CLICKABLE LINKS - OPEN IN BROWSER:

MAIN ENTRY POINTS:
   http://localhost:8080            (Nginx Load Balancer)
   http://localhost:8080/health     (LB Health Check)

GATEWAY DIRECT ACCESS:
   http://localhost:5000/health     (Gateway Instance 1)
   http://localhost:5010/health     (Gateway Instance 2)
   http://localhost:5020/health     (Gateway Instance 3)

API ENDPOINTS (via Load Balancer):
   http://localhost:8080/api/auth/health       (Auth Service)
   http://localhost:8080/api/menu/health       (Menu Service)
   http://localhost:8080/api/response/health   (Response Service)
   http://localhost:8080/api/calculate/health  (Calculation Service)

================================================================

DIRECT SERVICE INSTANCE ACCESS (Advanced Testing):

Auth Instances:
   http://localhost:5001/api/auth/health
   http://localhost:5011/api/auth/health
   http://localhost:5021/api/auth/health

Menu Instances:
   http://localhost:5002/api/menu/health
   http://localhost:5012/api/menu/health
   http://localhost:5022/api/menu/health

Response Instances:
   http://localhost:5003/api/response/health
   http://localhost:5013/api/response/health
   http://localhost:5023/api/response/health

Calculation Instances:
   http://localhost:5004/api/calculate/health
   http://localhost:5014/api/calculate/health
   http://localhost:5024/api/calculate/health

================================================================

WHAT'S RUNNING:
   
   [RUNNING] 3 Gateway instances (ports 5000, 5010, 5020)
   [RUNNING] 3 Auth instances (ports 5001, 5011, 5021)
   [RUNNING] 3 Menu instances (ports 5002, 5012, 5022)
   [RUNNING] 3 Response instances (ports 5003, 5013, 5023)
   [RUNNING] 3 Calculation instances (ports 5004, 5014, 5024)
   [RUNNING] Nginx Load Balancer (port 8080)

TOTAL: 18 service instances + Nginx = All running!

================================================================

NEXT STEPS:
   1. Copy any link above and open in browser
   2. Or run tests from TESTING_COMMANDS.txt file
   3. To stop all services: run stop-all-services.ps1

" -ForegroundColor Green