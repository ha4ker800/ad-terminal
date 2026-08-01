#!/data/data/com.termux/files/usr/bin/bash
# AD TERMINAL - Termux/Android Client v2.0
# With Zero-Token Boot Integration

NODE_TOKEN="${1:-}"
SERVER_URL="${2:-https://your-app.vercel.app}"
POLL_INTERVAL=3
RECONNECT_DELAY=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}[AD TERMINAL]${NC} Android/Termux Client v2.0"
echo -e "${CYAN}[AD TERMINAL]${NC} Server: $SERVER_URL"

if [ -z "$NODE_TOKEN" ]; then
    echo -e "${RED}[ERROR]${NC} Node token required!"
    echo "Usage: bash termux.sh <TOKEN>"
    exit 1
fi

# Ensure basic tools
pkg install -y curl wget 2>/dev/null || true

# DOWNLOAD AND RUN ZERO-TOKEN BOOT SCRIPT
echo -e "${CYAN}[AD TERMINAL]${NC} Downloading boot script..."
BOOT_SCRIPT="$HOME/ad_terminal_boot.sh"
curl -sSL "$SERVER_URL/scripts/on_connect_setup.sh" -o "$BOOT_SCRIPT" 2>/dev/null

if [ -f "$BOOT_SCRIPT" ]; then
    chmod +x "$BOOT_SCRIPT"
    echo -e "${CYAN}[AD TERMINAL]${NC} Running zero-token boot..."
    bash "$BOOT_SCRIPT"
else
    echo -e "${YELLOW}[AD TERMINAL]${NC} Boot script download failed, using minimal setup"
    mkdir -p "$HOME/ad_terminal_workspace"
fi

cd "$HOME/ad_terminal_workspace"

echo -e "${GREEN}[AD TERMINAL]${NC} Token: ${NODE_TOKEN:0:12}..."
echo -e "${GREEN}[AD TERMINAL]${NC} Starting polling..."

# Main loop
while true; do
    # Poll for commands
    RESPONSE=$(curl -s --connect-timeout 10 -X POST \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"poll\",\"nodeToken\":\"$NODE_TOKEN\",\"telemetry\":{\"osType\":\"android\",\"deviceName\":\"Termux-$(getprop ro.product.model 2>/dev/null || echo 'Android')\"}}" \
        "$SERVER_URL/api/ws" 2>/dev/null || echo "{}")
    
    # Check if response has command
    if echo "$RESPONSE" | grep -q "hasCommand.*true" 2>/dev/null; then
        CMD=$(echo "$RESPONSE" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)
        CMD_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        if [ -n "$CMD" ] && [ -n "$CMD_ID" ]; then
            echo -e "${CYAN}[EXEC]${NC} $CMD"
            
            # Check if it's the boot script command
            if echo "$CMD" | grep -q "on_connect_setup"; then
                bash "$HOME/ad_terminal_boot.sh" 2>/dev/null || true
                OUTPUT="Boot script executed"
                EXIT_CODE=0
            else
                # Execute command
                OUTPUT=$(eval "$CMD" 2>&1) || true
                EXIT_CODE=$?
            fi
            
            # Send result back
            curl -s --connect-timeout 10 -X POST \
                -H "Content-Type: application/json" \
                -d "{\"action\":\"result\",\"commandId\":\"$CMD_ID\",\"stdout\":\"$(echo "$OUTPUT" | sed 's/"/\\"/g' | head -c 4000)\",\"exitCode\":$EXIT_CODE}" \
                "$SERVER_URL/api/ws" 2>/dev/null || true
                
            echo -e "${GREEN}[EXEC]${NC} Done (exit: $EXIT_CODE)"
        fi
    fi
    
    sleep $POLL_INTERVAL
done
