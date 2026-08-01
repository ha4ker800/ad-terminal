# =============================================================================
# AD TERMINAL - Windows PowerShell Worker Client
# Universal connection script for Windows systems
# Usage: iwr -useb https://your-app.vercel.app/connect.ps1 | iex -args "<NODE_TOKEN>"
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$NodeToken,
    
    [string]$ServerUrl = "wss://your-app.vercel.app/ws"
)

$ErrorActionPreference = "Stop"
$ReconnectDelay = 5
$MaxReconnectAttempts = 0  # 0 = infinite

# Console colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) { Write-Output $args }
    $host.UI.RawUI.ForegroundColor = $fc
}

# ASCII Art Header
@"
    _    ____  _____ ____  _____ ____  _       _    
   / \  |  _ \|_   _|  _ \| ____|  _ \| |     / \   
  / _ \ | | | | | | | |_) |  _| | |_) | |    / _ \  
 / ___ \| |_| | | | |  _ <| |___|  __/| |___/ ___ \ 
/_/   \_\____/  |_| |_| \_\_____|_|   |_____/_/   \_\
                                                      
"@ | Write-Output

Write-ColorOutput Cyan "[AD TERMINAL :: CONNECTOR] v1.0 - Autonomous C2 Platform"
Write-ColorOutput Cyan "[AD TERMINAL :: CONNECTOR] Server: $ServerUrl"
Write-Output ""

Write-ColorOutput Green "[AD TERMINAL :: CONNECTOR] Node Token: $NodeToken"

# Detect OS and gather telemetry
function Get-SystemTelemetry {
    Write-ColorOutput Cyan "[AD TERMINAL :: CONNECTOR] Gathering system telemetry..."
    
    $osInfo = Get-CimInstance Win32_OperatingSystem
    $cpuInfo = Get-CimInstance Win32_Processor
    $computerInfo = Get-CimInstance Win32_ComputerSystem
    
    $osType = "windows"
    $osVersion = $osInfo.Version
    $kernel = $osInfo.BuildNumber
    $cpuCores = $cpuInfo.NumberOfLogicalProcessors
    $totalRamMb = [math]::Round($computerInfo.TotalPhysicalMemory / 1MB)
    $freeRamMb = [math]::Round($osInfo.FreePhysicalMemory / 1KB)
    
    # Battery info
    $batteryLevel = $null
    try {
        $battery = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
        if ($battery) {
            $batteryLevel = $battery.EstimatedChargeRemaining
        }
    } catch {}
    
    # Check installed tools
    $tools = @()
    
    if (Get-Command python -ErrorAction SilentlyContinue) { $tools += "python" }
    if (Get-Command python3 -ErrorAction SilentlyContinue) { $tools += "python3" }
    if (Get-Command node -ErrorAction SilentlyContinue) { $tools += "node" }
    if (Get-Command npm -ErrorAction SilentlyContinue) { $tools += "npm" }
    if (Get-Command git -ErrorAction SilentlyContinue) { $tools += "git" }
    if (Get-Command curl -ErrorAction SilentlyContinue) { $tools += "curl" }
    if (Get-Command ffmpeg -ErrorAction SilentlyContinue) { $tools += "ffmpeg" }
    if (Get-Command docker -ErrorAction SilentlyContinue) { $tools += "docker" }
    if (Get-Command gcc -ErrorAction SilentlyContinue) { $tools += "gcc" }
    
    # IP Address
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" } | Select-Object -First 1).IPAddress
    
    $telemetry = @{
        osType = $osType
        osVersion = $osVersion
        kernel = "Windows Build $kernel"
        cpuCores = $cpuCores
        totalRamMb = $totalRamMb
        freeRamMb = $freeRamMb
        batteryLevel = $batteryLevel
        installedTools = $tools
        ipAddress = $ipAddress
    } | ConvertTo-Json -Compress
    
    Write-ColorOutput Cyan "[AD TERMINAL :: CONNECTOR] Telemetry gathered"
    Write-ColorOutput Cyan "[AD TERMINAL :: CONNECTOR] Tools: $($tools -join ', ')"
    
    return $telemetry
}

# Send WebSocket message
function Send-Message($Type, $Payload) {
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $message = @{
        type = $Type
        payload = $Payload
        timestamp = $timestamp
        nodeToken = $NodeToken
    } | ConvertTo-Json -Compress -Depth 10
    
    return $message
}

# Execute command and capture output
function Invoke-TerminalCommand($Command, $CommandId) {
    Write-ColorOutput Cyan "[AD TERMINAL :: EXECUTE] $Command"
    
    $startTime = Get-Date
    $stdout = ""
    $stderr = ""
    $exitCode = 0
    
    try {
        $workspace = "$env:USERPROFILE\ad_terminal_workspace"
        if (-not (Test-Path $workspace)) {
            New-Item -ItemType Directory -Path $workspace -Force | Out-Null
        }
        
        Push-Location $workspace
        
        # Create process to capture both stdout and stderr
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "powershell.exe"
        $psi.Arguments = "-Command `"$Command`""
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.UseShellExecute = $false
        $psi.WorkingDirectory = $workspace
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $psi
        $process.Start() | Out-Null
        
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        $exitCode = $process.ExitCode
        
        Pop-Location
        
    } catch {
        $stderr = $_.Exception.Message
        $exitCode = 1
    }
    
    $elapsed = ([DateTime]::UtcNow - $startTime).TotalMilliseconds
    
    # Base64 encode outputs
    $stdoutB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($stdout))
    $stderrB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($stderr))
    
    $result = @{
        commandId = $CommandId
        stdout = $stdoutB64
        stderr = $stderrB64
        exitCode = $exitCode
        executionTimeMs = [math]::Round($elapsed)
    }
    
    return Send-Message "execute_result" $result
}

# WebSocket client using .NET
function Connect-WebSocketClient {
    param($Telemetry)
    
    $attempt = 0
    
    while (($MaxReconnectAttempts -eq 0) -or ($attempt -lt $MaxReconnectAttempts)) {
        $attempt++
        
        Write-ColorOutput Cyan "[AD TERMINAL :: CONNECTOR] Connection attempt $attempt..."
        
        try {
            # Create WebSocket client
            $ws = New-Object System.Net.WebSockets.ClientWebSocket
            $ws.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(30)
            
            # Connect
            $uri = New-Object System.Uri($ServerUrl)
            $connectTask = $ws.ConnectAsync($uri, [System.Threading.CancellationToken]::None)
            $connectTask.Wait()
            
            if ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
                Write-ColorOutput Green "[AD TERMINAL :: CONNECTOR] WebSocket connected!"
                
                # Send auth
                $authMessage = Send-Message "auth" @{ nodeToken = $NodeToken }
                Send-WebSocketMessage $ws $authMessage
                
                # Send telemetry
                $telemetryMessage = Send-Message "telemetry" ($Telemetry | ConvertFrom-Json)
                Send-WebSocketMessage $ws ($telemetryMessage | ConvertTo-Json -Compress)
                
                # Start receive loop
                $buffer = New-Object byte[] 4096
                $ct = [System.Threading.CancellationToken]::None
                
                while ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
                    $segment = New-Object System.ArraySegment[byte] -ArgumentList (, $buffer)
                    $result = $ws.ReceiveAsync($segment, $ct).Result
                    
                    if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
                        Write-ColorOutput Yellow "[AD TERMINAL :: CONNECTOR] Server closed connection"
                        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "", $ct).Wait()
                        break
                    }
                    
                    $message = [Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
                    
                    try {
                        $data = $message | ConvertFrom-Json
                        
                        switch ($data.type) {
                            "auth_success" {
                                Write-ColorOutput Green "[AD TERMINAL :: CONNECTOR] $($data.payload.message)"
                            }
                            "auth_failed" {
                                Write-ColorOutput Red "[AD TERMINAL :: CONNECTOR] Authentication failed!"
                                return
                            }
                            "execute" {
                                $cmd = $data.payload.command
                                $cmdId = $data.payload.commandId
                                $result = Invoke-TerminalCommand $cmd $cmdId
                                Send-WebSocketMessage $ws $result
                            }
                            "ping" {
                                $pong = Send-Message "pong" @{}
                                Send-WebSocketMessage $ws $pong
                            }
                        }
                    } catch {
                        Write-ColorOutput Red "[AD TERMINAL :: ERROR] Message parse error: $_"
                    }
                }
            }
            
        } catch {
            Write-ColorOutput Red "[AD TERMINAL :: CONNECTOR] Connection error: $_"
        } finally {
            if ($ws -and $ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
                $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "", [System.Threading.CancellationToken]::None).Wait()
            }
            if ($ws) {
                $ws.Dispose()
            }
        }
        
        Write-ColorOutput Yellow "[AD TERMINAL :: CONNECTOR] Connection lost. Reconnecting in ${ReconnectDelay}s..."
        Start-Sleep -Seconds $ReconnectDelay
    }
}

function Send-WebSocketMessage($WebSocket, $Message) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($Message)
    $segment = New-Object System.ArraySegment[byte] -ArgumentList (, $bytes)
    $WebSocket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [System.Threading.CancellationToken]::None).Wait()
}

# HTTP Long-polling fallback
function Connect-HttpPollClient {
    param($Telemetry)
    
    Write-ColorOutput Yellow "[AD TERMINAL :: CONNECTOR] Using HTTP polling fallback..."
    
    $pollUrl = $ServerUrl -replace "wss:", "https:" -replace "ws:", "http:"
    
    while ($true) {
        try {
            $body = @{
                nodeToken = $NodeToken
                telemetry = $Telemetry | ConvertFrom-Json
            } | ConvertTo-Json -Compress
            
            $response = Invoke-RestMethod -Uri "$pollUrl/poll" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 60
            
            if ($response -and $response.command) {
                $result = Invoke-TerminalCommand $response.command $response.commandId
                
                # Send result back
                Invoke-RestMethod -Uri "$pollUrl/result" -Method POST -Body $result -ContentType "application/json" | Out-Null
            }
            
        } catch {
            # Silently continue on poll errors
        }
        
        Start-Sleep -Seconds 5
    }
}

# Check .NET WebSocket support
function Test-WebSocketSupport {
    try {
        [System.Reflection.Assembly]::LoadWithPartialName("System.Net.WebSockets.Client") | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Main execution
function Main {
    Write-ColorOutput Cyan "[AD TERMINAL :: CONNECTOR] Initializing..."
    
    $telemetry = Get-SystemTelemetry
    
    # Create workspace
    $workspace = "$env:USERPROFILE\ad_terminal_workspace"
    New-Item -ItemType Directory -Path $workspace -Force -ErrorAction SilentlyContinue | Out-Null
    New-Item -ItemType Directory -Path "$workspace\projects" -Force -ErrorAction SilentlyContinue | Out-Null
    New-Item -ItemType Directory -Path "$workspace\logs" -Force -ErrorAction SilentlyContinue | Out-Null
    
    Write-ColorOutput Green "[AD TERMINAL :: CONNECTOR] Ready. Connecting to C2..."
    
    if (Test-WebSocketSupport) {
        Connect-WebSocketClient $telemetry
    } else {
        Connect-HttpPollClient $telemetry
    }
}

# Handle cleanup
trap {
    Write-ColorOutput Yellow "`n[AD TERMINAL :: CONNECTOR] Shutting down..."
    exit 0
}

# Run main
Main
