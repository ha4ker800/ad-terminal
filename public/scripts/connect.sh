#!/bin/bash
# =============================================================================
# AD TERMINAL - Termux/Linux Worker Client
# Universal connection script for Android Termux and Linux systems
# Usage: curl -sSL https://your-app.vercel.app/connect.sh | bash -s <NODE_TOKEN>
# =============================================================================

set -e

NODE_TOKEN="$1"
SERVER_URL="${2:-wss://your-app.vercel.app/ws}"
RECONNECT_DELAY=5
MAX_RECONNECT_ATTEMPTS=0  # 0 = infinite

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ASCII Art Header
cat << 'EOF'
    _    ____  _____ ____  _____ ____  _       _    
   / \  |  _ \|_   _|  _ \| ____|  _ \| |     / \   
  / _ \ | | | | | | | |_) |  _| | |_) | |    / _ \  
 / ___ \| |_| | | | |  _ <| |___|  __/| |___/ ___ \ 
/_/   \_\____/  |_| |_| \_\_____|_|   |_____/_/   \_\
                                                      
EOF

echo -e "${CYAN}[AD TERMINAL :: CONNECTOR]${NC} v1.0 - Autonomous C2 Platform"
echo -e "${CYAN}[AD TERMINAL :: CONNECTOR]${NC} Server: $SERVER_URL"
echo ""

# Validate node token
if [ -z "$NODE_TOKEN" ]; then
    echo -e "${RED}[AD TERMINAL :: ERROR]${NC} Node token required!"
    echo "Usage: curl -sSL https://your-app.vercel.app/connect.sh | bash -s <NODE_TOKEN>"
    exit 1
fi

echo -e "${GREEN}[AD TERMINAL :: CONNECTOR]${NC} Node Token: $NODE_TOKEN"

# Detect OS type
detect_os() {
    OS_TYPE="unknown"
    OS_VERSION=""
    KERNEL=""
    
    if [ -f /data/data/com.termux/files/usr/bin/termux-info ]; then
        OS_TYPE="android"
        OS_VERSION=$(getprop ro.build.version.release 2>/dev/null || echo "unknown")
        KERNEL=$(uname -r)
    elif [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_TYPE=$(echo "$ID" | tr '[:upper:]' '[:lower:]')
        OS_VERSION="$VERSION_ID"
        KERNEL=$(uname -r)
    elif [ -f /etc/debian_version ]; then
        OS_TYPE="debian"
        OS_VERSION=$(cat /etc/debian_version)
        KERNEL=$(uname -r)
    elif [ -f /etc/redhat-release ]; then
        OS_TYPE="rhel"
        OS_VERSION=$(cat /etc/redhat-release)
        KERNEL=$(uname -r)
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS_TYPE="linux"
        KERNEL=$(uname -r)
    fi
    
    echo -e "${CYAN}[AD TERMINAL :: CONNECTOR]${NC} Detected OS: $OS_TYPE $OS_VERSION"
}

# Gather system telemetry
gather_telemetry() {
    CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "unknown")
    
    # Memory info
    if [ -f /proc/meminfo ]; then
        TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        FREE_RAM_KB=$(grep MemAvailable /proc/meminfo 2>/dev/null || grep MemFree /proc/meminfo | awk '{print $2}')
        TOTAL_RAM_MB=$((TOTAL_RAM_KB / 1024))
        FREE_RAM_MB=$((FREE_RAM_KB / 1024))
    else
        TOTAL_RAM_MB=""
        FREE_RAM_MB=""
    fi
    
    # Battery level (Android/Termux)
    BATTERY_LEVEL=""
    if [ "$OS_TYPE" = "android" ] && command -v termux-battery-status &> /dev/null; then
        BATTERY_LEVEL=$(termux-battery-status 2>/dev/null | grep percentage | cut -d':' -f2 | tr -d ' ,' || echo "")
    fi
    
    # Check installed tools
    INSTALLED_TOOLS="[]"
    TOOLS_LIST=()
    
    command -v python3 &> /dev/null && TOOLS_LIST+=("python3")
    command -v python &> /dev/null && TOOLS_LIST+=("python")
    command -v node &> /dev/null && TOOLS_LIST+=("node")
    command -v npm &> /dev/null && TOOLS_LIST+=("npm")
    command -v git &> /dev/null && TOOLS_LIST+=("git")
    command -v curl &> /dev/null && TOOLS_LIST+=("curl")
    command -v wget &> /dev/null && TOOLS_LIST+=("wget")
    command -v ffmpeg &> /dev/null && TOOLS_LIST+=("ffmpeg")
    command -v gcc &> /dev/null && TOOLS_LIST+=("gcc")
    command -v docker &> /dev/null && TOOLS_LIST+=("docker")
    
    # Convert to JSON array
    if [ ${#TOOLS_LIST[@]} -gt 0 ]; then
        INSTALLED_TOOLS="[\"$(IFS=,; echo "${TOOLS_LIST[*]}" | sed 's/,/","/g')\"]"
    fi
    
    # IP Address
    IP_ADDRESS=$(hostname -I 2>/dev/null | awk '{print $1}' || ifconfig 2>/dev/null | grep "inet " | head -1 | awk '{print $2}' || echo "")
    
    # Build telemetry JSON
    TELEMETRY=$(cat <<EOF
{
    "osType": "$OS_TYPE",
    "osVersion": "$OS_VERSION",
    "kernel": "$KERNEL",
    "cpuCores": ${CPU_CORES:-null},
    "totalRamMb": ${TOTAL_RAM_MB:-null},
    "freeRamMb": ${FREE_RAM_MB:-null},
    "batteryLevel": ${BATTERY_LEVEL:-null},
    "installedTools": $INSTALLED_TOOLS,
    "ipAddress": "$IP_ADDRESS"
}
EOF
)
    
    echo -e "${CYAN}[AD TERMINAL :: CONNECTOR]${NC} Telemetry gathered"
    echo -e "${CYAN}[AD TERMINAL :: CONNECTOR]${NC} Tools: ${TOOLS_LIST[*]}"
}

# Check and install dependencies
check_dependencies() {
    local deps=("curl" "websocat")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${YELLOW}[AD TERMINAL :: CONNECTOR]${NC} Installing dependencies: ${missing[*]}"
        
        if [ "$OS_TYPE" = "android" ]; then
            pkg update -y
            pkg install -y curl websocat
        elif command -v apt-get &> /dev/null; then
            apt-get update -qq
            apt-get install -y -qq curl
            # Install websocat from release
            curl -sSL "https://github.com/vi/websocat/releases/latest/download/websocat.x86_64-unknown-linux-musl" -o /usr/local/bin/websocat
            chmod +x /usr/local/bin/websocat
        elif command -v yum &> /dev/null; then
            yum install -y -q curl
        fi
    fi
}

# WebSocket message handlers
send_message() {
    local type="$1"
    local payload="$2"
    local timestamp
    timestamp=$(date +%s%3N)
    
    echo "{\"type\":\"$type\",\"payload\":$payload,\"timestamp\":$timestamp,\"nodeToken\":\"$NODE_TOKEN\"}"
}

# Execute command and capture output
execute_command() {
    local command="$1"
    local command_id="$2"
    
    echo -e "${CYAN}[AD TERMINAL :: EXECUTE]${NC} $command"
    
    # Create temp files for output
    local stdout_file=$(mktemp)
    local stderr_file=$(mktemp)
    local start_time end_time elapsed
    
    start_time=$(date +%s%3N)
    
    # Execute command in subshell
    (
        cd "$HOME/ad_terminal_workspace" 2>/dev/null || cd "$HOME"
        eval "$command" > "$stdout_file" 2> "$stderr_file"
        echo $? > /tmp/ad_term_exit_code
    )
    
    local exit_code=$(cat /tmp/ad_term_exit_code 2>/dev/null || echo "1")
    end_time=$(date +%s%3N)
    elapsed=$((end_time - start_time))
    
    local stdout=$(cat "$stdout_file" | base64 -w 0 2>/dev/null || cat "$stdout_file" | base64)
    local stderr=$(cat "$stderr_file" | base64 -w 0 2>/dev/null || cat "$stderr_file" | base64)
    
    rm -f "$stdout_file" "$stderr_file" /tmp/ad_term_exit_code
    
    # Send result
    send_message "execute_result" "{\"commandId\":\"$command_id\",\"stdout\":\"$stdout\",\"stderr\":\"$stderr\",\"exitCode\":$exit_code,\"executionTimeMs\":$elapsed}"
}

# Main WebSocket connection loop
connect_websocket() {
    local attempt=0
    
    while [ $MAX_RECONNECT_ATTEMPTS -eq 0 ] || [ $attempt -lt $MAX_RECONNECT_ATTEMPTS ]; do
        attempt=$((attempt + 1))
        
        echo -e "${CYAN}[AD TERMINAL :: CONNECTOR]${NC} Connection attempt $attempt..."
        
        # Connect via websocat
        (
            # Send auth
            send_message "auth" "{\"nodeToken\":\"$NODE_TOKEN\"}"
            
            # Send telemetry
            send_message "telemetry" "$TELEMETRY"
            
            # Send periodic pings
            while true; do
                sleep 30
                send_message "ping" "{}"
            done
        ) | websocat "$SERVER_URL" 2>/dev/null | while read -r message; do
            # Parse message
            local msg_type=$(echo "$message" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
            
            case "$msg_type" in
                "auth_success")
                    echo -e "${GREEN}[AD TERMINAL :: CONNECTOR]${NC} Authenticated successfully!"
                    ;;
                "auth_failed")
                    echo -e "${RED}[AD TERMINAL :: CONNECTOR]${NC} Authentication failed!"
                    exit 1
                    ;;
                "execute")
                    local cmd=$(echo "$message" | grep -o '"command":"[^"]*"' | cut -d'"' -f4 | sed 's/\\n/\n/g')
                    local cmd_id=$(echo "$message" | grep -o '"commandId":"[^"]*"' | cut -d'"' -f4)
                    execute_command "$cmd" "$cmd_id"
                    ;;
                "pong")
                    # Heartbeat acknowledged
                    ;;
            esac
        done
        
        echo -e "${YELLOW}[AD TERMINAL :: CONNECTOR]${NC} Connection lost. Reconnecting in ${RECONNECT_DELAY}s..."
        sleep $RECONNECT_DELAY
    done
}

# Alternative WebSocket using curl fallback
connect_curl_fallback() {
    echo -e "${YELLOW}[AD TERMINAL :: CONNECTOR]${NC} Using curl fallback mode..."
    
    while true; do
        # Long-polling style connection
        local response
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "{\"nodeToken\":\"$NODE_TOKEN\",\"telemetry\":$TELEMETRY}" \
            "${SERVER_URL/http/ws}/poll" 2>/dev/null || echo "")
        
        if [ -n "$response" ]; then
            local cmd=$(echo "$response" | grep -o '"command":"[^"]*"' | cut -d'"' -f4)
            local cmd_id=$(echo "$response" | grep -o '"commandId":"[^"]*"' | cut -d'"' -f4)
            
            if [ -n "$cmd" ]; then
                execute_command "$cmd" "$cmd_id"
            fi
        fi
        
        sleep 5
    done
}

# Main execution
main() {
    echo -e "${CYAN}[AD TERMINAL :: CONNECTOR]${NC} Initializing..."
    
    detect_os
    gather_telemetry
    check_dependencies
    
    # Create workspace
    mkdir -p "$HOME/ad_terminal_workspace"
    mkdir -p "$HOME/ad_terminal_workspace/projects"
    mkdir -p "$HOME/ad_terminal_workspace/logs"
    
    echo -e "${GREEN}[AD TERMINAL :: CONNECTOR]${NC} Ready. Connecting to C2..."
    
    if command -v websocat &> /dev/null; then
        connect_websocket
    else
        connect_curl_fallback
    fi
}

# Trap signals for clean exit
cleanup() {
    echo -e "\n${YELLOW}[AD TERMINAL :: CONNECTOR]${NC} Shutting down..."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Run main
main "$@"
