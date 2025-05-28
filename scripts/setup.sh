#!/bin/bash

# Setup script for RoboRail Assistant remote environment
# This script prepares the development environment for better agent workflow

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check minimum version requirement
check_version() {
    local cmd=$1
    local min_version=$2
    local current_version=$3
    
    if [ "$(printf '%s\n' "$min_version" "$current_version" | sort -V | head -n1)" = "$min_version" ]; then
        return 0
    else
        return 1
    fi
}

# Function to install bun if not present
install_bun() {
    if ! command_exists bun; then
        log_info "Installing Bun package manager..."
        curl -fsSL https://bun.sh/install | bash
        export PATH="$HOME/.bun/bin:$PATH"
        # Add to shell profile
        echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
        echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
        log_success "Bun installed successfully"
    else
        log_success "Bun is already installed"
    fi
}

# Function to install encore if not present
install_encore() {
    if ! command_exists encore; then
        log_info "Installing Encore..."
        curl -L https://encore.dev/install.sh | bash
        export PATH="$HOME/.encore/bin:$PATH"
        # Add to shell profile
        echo 'export PATH="$HOME/.encore/bin:$PATH"' >> ~/.bashrc
        echo 'export PATH="$HOME/.encore/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
        log_success "Encore installed successfully"
    else
        log_success "Encore is already installed"
    fi
}

# Function to install task-master if not present
install_taskmaster() {
    if ! command_exists task-master; then
        log_info "Installing TaskMaster..."
        # Check if npm is available first
        if command_exists npm; then
            npm install -g @taskmaster-ai/taskmaster-ai
        elif command_exists bun; then
            bun install -g @taskmaster-ai/taskmaster-ai
        else
            log_error "Neither npm nor bun found. Cannot install TaskMaster."
            return 1
        fi
        log_success "TaskMaster installed successfully"
    else
        log_success "TaskMaster is already installed"
    fi
}

# Main setup function
main() {
    log_info "Starting RoboRail Assistant environment setup..."
    
    # Check if we're in the correct directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the project root directory."
        exit 1
    fi
    
    # Update PATH for current session
    export PATH="$HOME/.bun/bin:$HOME/.encore/bin:$PATH"
    
    log_info "=== Environment Requirements Check ==="
    
    # Check Node.js version
    if command_exists node; then
        NODE_VERSION=$(node --version | sed 's/v//')
        if check_version "18.0.0" "$NODE_VERSION"; then
            log_success "Node.js $NODE_VERSION detected (>= 18.0.0 required)"
        else
            log_error "Node.js version $NODE_VERSION is too old. Minimum required: 18.0.0"
            exit 1
        fi
    else
        log_error "Node.js not found. Please install Node.js 18.0.0 or later."
        exit 1
    fi
    
    # Install required tools
    log_info "=== Installing Required Tools ==="
    install_bun
    install_encore
    install_taskmaster
    
    # Verify installations
    log_info "=== Verifying Tool Installations ==="
    if command_exists bun; then
        BUN_VERSION=$(bun --version)
        log_success "Bun $BUN_VERSION is available"
    else
        log_error "Bun installation failed"
        exit 1
    fi
    
    if command_exists encore; then
        ENCORE_VERSION=$(encore version | head -n1)
        log_success "Encore $ENCORE_VERSION is available"
    else
        log_error "Encore installation failed"
        exit 1
    fi
    
    if command_exists task-master; then
        log_success "TaskMaster is available"
    else
        log_warning "TaskMaster installation may have failed, but continuing..."
    fi
    
    # Install project dependencies
    log_info "=== Installing Project Dependencies ==="
    
    log_info "Installing root dependencies..."
    bun install
    
    log_info "Installing backend dependencies..."
    cd backend && bun install && cd ..
    
    log_info "Installing frontend dependencies..."
    cd frontend && bun install && cd ..
    
    log_info "Installing shared dependencies..."
    cd shared && bun install && cd ..
    
    log_success "All dependencies installed successfully"
    
    # Setup Git hooks
    log_info "=== Setting up Git Hooks ==="
    if [ -f ".husky/pre-commit" ]; then
        bun run prepare
        log_success "Git hooks configured"
    else
        log_warning "Husky pre-commit hook not found, skipping..."
    fi
    
    # Initialize TaskMaster if possible
    log_info "=== TaskMaster Setup ==="
    if command_exists task-master && [ -f "scripts/prd.txt" ]; then
        log_info "Initializing TaskMaster project..."
        if task-master init --project-root="$(pwd)" --yes; then
            log_success "TaskMaster initialized successfully"
            
            # Parse PRD if available
            if [ -f "scripts/prd.txt" ]; then
                log_info "Parsing PRD document..."
                task-master parse-prd --project-root="$(pwd)" --input="scripts/prd.txt" --num-tasks=15
                log_success "PRD parsed and tasks generated"
            fi
        else
            log_warning "TaskMaster initialization failed, but continuing..."
        fi
    else
        log_warning "TaskMaster or PRD not available, skipping initialization..."
    fi
    
    # Environment validation
    log_info "=== Environment Validation ==="
    
    # Check TypeScript compilation
    log_info "Checking TypeScript compilation..."
    if bun run type-check; then
        log_success "TypeScript compilation successful"
    else
        log_warning "TypeScript compilation issues detected"
    fi
    
    # Check linting
    log_info "Checking code linting..."
    if bun run lint; then
        log_success "Code linting passed"
    else
        log_warning "Code linting issues detected"
    fi
    
    # Run basic tests
    log_info "Running basic tests..."
    if bun run test:unit; then
        log_success "Unit tests passed"
    else
        log_warning "Some unit tests failed"
    fi
    
    # Check Encore services
    log_info "Validating Encore configuration..."
    cd backend
    if encore check; then
        log_success "Encore configuration is valid"
    else
        log_warning "Encore configuration issues detected"
    fi
    cd ..
    
    # Create helpful aliases
    log_info "=== Creating Development Aliases ==="
    cat > ~/.roborail_aliases << 'EOF'
# RoboRail Assistant Development Aliases
alias rr-dev="bun run dev"
alias rr-test="bun run test"
alias rr-build="bun run build"
alias rr-lint="bun run lint"
alias rr-typecheck="bun run type-check"
alias rr-backend="cd backend && encore run"
alias rr-frontend="cd frontend && bun run dev"
alias rr-db="encore db shell"
alias rr-migrate="encore db migrate"
alias rr-task="task-master"
alias rr-next="task-master next"
alias rr-status="task-master list"
EOF
    
    # Add source command to shell profiles
    echo "source ~/.roborail_aliases" >> ~/.bashrc
    echo "source ~/.roborail_aliases" >> ~/.zshrc 2>/dev/null || true
    
    log_success "Development aliases created"
    
    # Final setup summary
    log_info "=== Setup Complete ==="
    log_success "RoboRail Assistant environment is ready!"
    
    echo ""
    log_info "Available commands:"
    echo "  • bun run dev          - Start full development environment"
    echo "  • bun run test         - Run all tests"
    echo "  • bun run build        - Build the entire project"
    echo "  • bun run lint         - Run linting"
    echo "  • bun run type-check   - Check TypeScript compilation"
    echo "  • encore db shell      - Access database"
    echo "  • task-master next     - Get next task to work on"
    echo "  • task-master list     - View all tasks"
    echo ""
    
    log_info "Development aliases (after reloading shell):"
    echo "  • rr-dev, rr-test, rr-build, rr-lint, rr-typecheck"
    echo "  • rr-backend, rr-frontend, rr-db, rr-migrate"
    echo "  • rr-task, rr-next, rr-status"
    echo ""
    
    log_info "To reload your shell configuration:"
    echo "  source ~/.bashrc  # or source ~/.zshrc"
    echo ""
    
    log_success "Setup completed successfully! 🚀"
    
    # Show next steps
    log_info "=== Next Steps ==="
    echo "1. Reload your shell: source ~/.bashrc (or ~/.zshrc)"
    echo "2. Start development: bun run dev"
    echo "3. Check next task: task-master next"
    echo "4. Run tests: bun run test"
    echo ""
}

# Run main function
main "$@"