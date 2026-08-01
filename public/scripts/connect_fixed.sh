#!/bin/bash
# AD TERMINAL - Fixed Connection Script
set -e

NODE_TOKEN="${1:-}"
SERVER_URL="${2:-https://your-app.vercel.app}"
POLL_INTERVAL=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}[AD TERMINAL]${NC} Worker Client v2.0"
echo -e "${CYAN}[AD TERMINAL]${NC} Server: $SERVER_URL"

if [ -z "$NODE_TOKEN" ]; then
    echo -e "${RED}[ERROR]${NC} Node token required!"
    exit 1
fi

echo -e "${GREEN}[AD TERMINAL]${NC} Token: ${NODE_TOKEN:0:12}..."

# Detect OS
OS_TYPE="unknown"
if [ -d /data/data/com.termux/files ]; then
    OS_TYPE="android"
elif [ -f /etc/os-release ]; then
    OS_TYPE="linux"
fi

echo -e "${CYAN}[AD TERMINAL]${NC} OS: $OS_TYPE"

# Setup
mkdir -p "$HOME/ad_terminal_workspace"

# Polling loop
echo -e "${GREEN}[AD TERMINAL]${NC} Starting..."

while true; do
    # Poll for commands
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"poll\",\"nodeToken\":\"$NODE_TOKEN\",\"telemetry\":{\"osType\":\"$OS_TYPE\"}}" \
        "$SERVER_URL/api/ws" 2>/dev/null || echo "{}")
    
    # Check for command
    if echo "$RESPONSE" | grep -q 'hasCommand.*true' 2>/dev/null; then
        CMD=$(echo "$RESPONSE" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)
        CMD_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        if [ -n "$CMD" ] && [ -n "$CMD_ID" ]; then
            echo -e "${CYAN}[EXEC]${NC} $CMD"
            
            # Execute
            cd "$HOME/ad_terminal_workspace" 2>/dev/null || cd "$HOME"
            STDOUT=$(eval "$CMD" 2>&1) || true
            EXIT_CODE=$?
            
            # Send result
            curl -s -X POST \
                -H "Content-Type: application/json" \
                -d "{\"action\":\"result\",\"commandId\":\"$CMD_ID\",\"stdout\":\"$STDOUT\",\"exitCode\":$EXIT_CODE}" \
                "$SERVER_URL/api/ws" 2>/dev/null || true
        fi
    fi
    
    sleep $POLL_INTERVAL
done
