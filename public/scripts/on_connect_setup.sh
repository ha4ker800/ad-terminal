#!/bin/bash
# =============================================================================
# AD TERMINAL - Zero-Token On-Connect Boot Script v2.0
# Auto-runs when device connects - NO AI API CALLS
# Installs base dependencies and creates workspace
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Zero-Token Setup Starting..."

# Detect OS
detect_os() {
    if [ -d /data/data/com.termux/files ]; then
        echo "android"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS_TYPE=$(detect_os)
echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Detected OS: $OS_TYPE"

# Create workspace directories
echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Creating workspace..."
mkdir -p "$HOME/ad_terminal_workspace"
mkdir -p "$HOME/ad_terminal_workspace/projects"
mkdir -p "$HOME/ad_terminal_workspace/logs"
mkdir -p "$HOME/ad_terminal_workspace/downloads"
mkdir -p "$HOME/ad_terminal_workspace/scripts"

echo -e "${GREEN}[AD TERMINAL :: BOOT]${NC} Workspace ready at ~/ad_terminal_workspace"

# Install base dependencies based on OS
install_deps() {
    case $OS_TYPE in
        "android")
            echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Updating Termux packages..."
            pkg update -y -o Dpkg::Options::="--force-confold" 2>/dev/null || true
            
            echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Installing Termux dependencies..."
            pkg install -y -o Dpkg::Options::="--force-confold" \
                curl wget git python nodejs npm \
                ffmpeg openssh termux-api \
                2>/dev/null || true
            ;;
            
        "linux")
            if command -v apt-get &>/dev/null; then
                echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Updating apt packages..."
                apt-get update -qq 2>/dev/null || sudo apt-get update -qq 2>/dev/null || true
                
                echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Installing apt dependencies..."
                apt-get install -y -qq \
                    curl wget git python3 python3-pip \
                    nodejs npm ffmpeg \
                    2>/dev/null || sudo apt-get install -y -qq \
                        curl wget git python3 python3-pip \
                        nodejs npm ffmpeg \
                        2>/dev/null || true
                        
            elif command -v yum &>/dev/null; then
                echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Installing yum dependencies..."
                yum install -y -q \
                    curl wget git python3 nodejs \
                    2>/dev/null || sudo yum install -y -q \
                        curl wget git python3 nodejs \
                        2>/dev/null || true
                        
            elif command -v pacman &>/dev/null; then
                echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Installing pacman dependencies..."
                pacman -Sy --noconfirm \
                    curl wget git python nodejs npm \
                    2>/dev/null || sudo pacman -Sy --noconfirm \
                        curl wget git python nodejs npm \
                        2>/dev/null || true
            fi
            ;;
            
        "macos")
            if command -v brew &>/dev/null; then
                echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Installing Homebrew dependencies..."
                brew install curl wget git python node ffmpeg 2>/dev/null || true
            else
                echo -e "${YELLOW}[AD TERMINAL :: BOOT]${NC} Homebrew not found. Please install manually."
            fi
            ;;
            
        "windows")
            echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Windows detected. Checking for package managers..."
            if command -v winget &>/dev/null; then
                echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Installing via winget..."
                winget install -e --id Git.Git 2>/dev/null || true
                winget install -e --id OpenJS.NodeJS 2>/dev/null || true
                winget install -e --id Python.Python.3 2>/dev/null || true
            elif command -v choco &>/dev/null; then
                echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Installing via Chocolatey..."
                choco install -y git nodejs python ffmpeg 2>/dev/null || true
            fi
            ;;
    esac
}

# Run installation
install_deps

# Verify installations
echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Verifying installations..."

verify_tool() {
    local tool=$1
    local version_cmd=$2
    
    if command -v $tool &>/dev/null; then
        local version=$(eval "$version_cmd" 2>/dev/null | head -1 || echo "installed")
        echo -e "${GREEN}[AD TERMINAL :: BOOT]${NC} ✓ $tool: $version"
        return 0
    else
        echo -e "${YELLOW}[AD TERMINAL :: BOOT]${NC} ✗ $tool: not found"
        return 1
    fi
}

verify_tool "curl" "curl --version"
verify_tool "wget" "wget --version"
verify_tool "git" "git --version"
verify_tool "python3" "python3 --version" || verify_tool "python" "python --version"
verify_tool "node" "node --version"
verify_tool "npm" "npm --version"
verify_tool "ffmpeg" "ffmpeg -version"

# Setup git config if not exists
if ! git config --global user.email &>/dev/null; then
    git config --global user.email "adterminal@localhost" 2>/dev/null || true
    git config --global user.name "AD Terminal" 2>/dev/null || true
fi

# Create welcome file
cat > "$HOME/ad_terminal_workspace/README.txt" << 'EOF'
AD TERMINAL Workspace
=====================

This directory was auto-created by the AD TERMINAL on-connect boot script.

Directories:
- projects/    : Your project files
- logs/        : Execution logs
- downloads/   : Downloaded files
- scripts/     : Custom scripts

NO AI API calls were made during setup.
EOF

echo -e "${GREEN}[AD TERMINAL :: BOOT]${NC} Zero-Token Setup Complete!"
echo -e "${CYAN}[AD TERMINAL :: BOOT]${NC} Ready for commands."
