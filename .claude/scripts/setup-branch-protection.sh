#!/bin/bash

# GitHub Branch Protection Setup Script
# This script configures branch protection rules via GitHub API

set -e

# Configuration
REPO_OWNER="${GITHUB_REPOSITORY_OWNER:-}"
REPO_NAME="${GITHUB_REPOSITORY_NAME:-}"
BRANCH="${BRANCH:-main}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if gh CLI is installed
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed. Please install it first."
        log_info "Install guide: https://cli.github.com/"
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gh auth status &> /dev/null; then
        log_error "Not authenticated with GitHub. Please run 'gh auth login' first."
        exit 1
    fi
    
    log_info "Prerequisites check passed ✓"
}

# Get repository info
get_repo_info() {
    if [[ -z "$REPO_OWNER" || -z "$REPO_NAME" ]]; then
        # Try to get from git remote
        local git_remote=$(git remote get-url origin 2>/dev/null || echo "")
        if [[ $git_remote =~ github\.com[:/]([^/]+)/([^/]+)(\.git)?$ ]]; then
            REPO_OWNER="${BASH_REMATCH[1]}"
            REPO_NAME="${BASH_REMATCH[2]}"
            REPO_NAME="${REPO_NAME%.git}"  # Remove .git suffix if present
        else
            log_error "Could not determine repository owner and name."
            log_info "Please set GITHUB_REPOSITORY_OWNER and GITHUB_REPOSITORY_NAME environment variables."
            exit 1
        fi
    fi
    
    log_info "Repository: $REPO_OWNER/$REPO_NAME"
    log_info "Branch: $BRANCH"
}

# Configure branch protection
setup_branch_protection() {
    log_info "Configuring branch protection for $BRANCH..."
    
    # Branch protection configuration
    local protection_config='{
        "required_status_checks": {
            "strict": true,
            "contexts": ["CI Status Check", "Code Quality Checks", "Security Audit", "TypeScript Type Checking"]
        },
        "enforce_admins": true,
        "required_pull_request_reviews": {
            "required_approving_review_count": 1,
            "dismiss_stale_reviews": true,
            "require_code_owner_reviews": false,
            "require_last_push_approval": false
        },
        "restrictions": null,
        "allow_force_pushes": false,
        "allow_deletions": false,
        "block_creations": false,
        "required_conversation_resolution": true,
        "lock_branch": false,
        "allow_fork_syncing": true
    }'
    
    # Apply branch protection
    if gh api "repos/$REPO_OWNER/$REPO_NAME/branches/$BRANCH/protection" \
        --method PUT \
        --input <(echo "$protection_config") > /dev/null 2>&1; then
        log_info "Branch protection configured successfully ✓"
    else
        log_error "Failed to configure branch protection"
        log_warn "Make sure you have admin access to the repository"
        return 1
    fi
}

# Verify configuration
verify_protection() {
    log_info "Verifying branch protection settings..."
    
    local protection_info
    if protection_info=$(gh api "repos/$REPO_OWNER/$REPO_NAME/branches/$BRANCH/protection" 2>/dev/null); then
        log_info "Current protection settings:"
        echo "$protection_info" | jq -r '
            "- Required status checks: " + (.required_status_checks.contexts | join(", ")) +
            "\n- Enforce admins: " + (.enforce_admins | tostring) +
            "\n- Required PR reviews: " + (.required_pull_request_reviews.required_approving_review_count | tostring) +
            "\n- Dismiss stale reviews: " + (.required_pull_request_reviews.dismiss_stale_reviews | tostring) +
            "\n- Conversation resolution: " + (.required_conversation_resolution | tostring) +
            "\n- Allow force pushes: " + (.allow_force_pushes | tostring) +
            "\n- Allow deletions: " + (.allow_deletions | tostring)
        '
    else
        log_warn "Could not retrieve protection settings for verification"
    fi
}

# Main execution
main() {
    echo "🛡️  GitHub Branch Protection Setup"
    echo "=================================="
    
    check_prerequisites
    get_repo_info
    setup_branch_protection
    verify_protection
    
    log_info "Branch protection setup completed! 🎉"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --branch NAME  Set target branch (default: main)"
        echo ""
        echo "Environment variables:"
        echo "  GITHUB_REPOSITORY_OWNER  Repository owner"
        echo "  GITHUB_REPOSITORY_NAME   Repository name"
        echo "  BRANCH                   Target branch (default: main)"
        echo ""
        echo "Prerequisites:"
        echo "  - GitHub CLI (gh) installed and authenticated"
        echo "  - Admin access to the target repository"
        exit 0
        ;;
    --branch)
        if [[ -n "${2:-}" ]]; then
            BRANCH="$2"
            shift 2
        else
            log_error "--branch requires a branch name"
            exit 1
        fi
        ;;
    --*)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac

# Run main function
main "$@"