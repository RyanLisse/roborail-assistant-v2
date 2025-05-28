#!/bin/bash

# Quick verification script for RoboRail Assistant environment
# Run this to verify the environment is properly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verification function
verify_environment() {
    local errors=0
    
    log_info "=== RoboRail Assistant Environment Verification ==="
    echo ""
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        log_success "Node.js $NODE_VERSION"
    else
        log_error "Node.js not found"
        ((errors++))
    fi
    
    # Check Bun
    if command_exists bun; then
        BUN_VERSION=$(bun --version)
        log_success "Bun $BUN_VERSION"
    else
        log_error "Bun not found"
        ((errors++))
    fi
    
    # Check Encore
    if command_exists encore; then
        ENCORE_VERSION=$(encore version | head -n1)
        log_success "Encore $ENCORE_VERSION"
    else
        log_error "Encore not found"
        ((errors++))
    fi
    
    # Check TaskMaster
    if command_exists task-master; then
        log_success "TaskMaster available"
    else
        log_warning "TaskMaster not found (optional but recommended)"
    fi
    
    echo ""
    log_info "=== Project Dependencies ==="
    
    # Check if dependencies are installed
    if [ -d "node_modules" ]; then
        log_success "Root dependencies installed"
    else
        log_error "Root dependencies not installed"
        ((errors++))
    fi
    
    if [ -d "backend/node_modules" ]; then
        log_success "Backend dependencies installed"
    else
        log_error "Backend dependencies not installed"
        ((errors++))
    fi
    
    if [ -d "frontend/node_modules" ]; then
        log_success "Frontend dependencies installed"
    else
        log_error "Frontend dependencies not installed"
        ((errors++))
    fi
    
    echo ""
    log_info "=== Project Structure ==="
    
    # Check key files
    local key_files=(
        "package.json"
        "backend/encore.app"
        "frontend/next.config.ts"
        "scripts/prd.txt"
        "tasks/tasks.json"
    )
    
    for file in "${key_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "$file exists"
        else
            log_warning "$file not found"
        fi
    done
    
    echo ""
    log_info "=== Quick Tests ==="
    
    # Test TypeScript compilation
    if bun run type-check >/dev/null 2>&1; then
        log_success "TypeScript compilation works"
    else
        log_error "TypeScript compilation failed"
        ((errors++))
    fi
    
    # Test linting
    if bun run lint >/dev/null 2>&1; then
        log_success "Linting works"
    else
        log_warning "Linting has issues"
    fi
    
    # Test Encore configuration
    cd backend
    if encore check >/dev/null 2>&1; then
        log_success "Encore configuration valid"
    else
        log_error "Encore configuration invalid"
        ((errors++))
    fi
    cd ..
    
    echo ""
    if [ $errors -eq 0 ]; then
        log_success "=== Environment is ready! ==="
        echo ""
        log_info "Next steps:"
        echo "  1. Start development: bun run dev"
        echo "  2. Check tasks: task-master next"
        echo "  3. Run tests: bun run test"
        echo ""
        return 0
    else
        log_error "=== Environment has $errors error(s) ==="
        echo ""
        log_info "To fix issues, run: ./scripts/setup.sh"
        echo ""
        return 1
    fi
}

# Main execution
if [ ! -f "package.json" ]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

verify_environment