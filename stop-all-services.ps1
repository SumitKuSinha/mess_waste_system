# ========================================
# STOP ALL RUNNING SERVICES
# ========================================

Write-Host "
================================================================
              STOPPING ALL SERVICES
================================================================

Killing all Node.js service processes...
" -ForegroundColor Yellow

$stopped = 0

@(5000, 5001, 5002, 5003, 5004, 5010, 5011, 5012, 5013, 5014, 5020, 5021, 5022, 5023, 5024) | ForEach-Object {
    $port = $_
    try {
        $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($process) {
            $pid = $process.OwningProcess
            if ($pid) {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc -and $proc.ProcessName -eq "node") {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "[OK] Killed process on port $port (PID: $pid)" -ForegroundColor Green
                    $stopped++
                }
            }
        }
    } catch {
        # Ignore errors
    }
}

Write-Host "
================================================================
                    ALL SERVICES STOPPED!
================================================================

[INFO] Stopped $stopped service instances
[INFO] Nginx is still running (port 8080) - not affected
" -ForegroundColor Green