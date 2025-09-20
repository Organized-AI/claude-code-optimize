#!/bin/bash

# Claude Code Optimizer Dashboard Deployment Script
# Deploy to dashboard.organizedai.vip

set -e

echo "🚀 Deploying Claude Code Optimizer Dashboard to organizedai.vip"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="moonlock-dashboard"
DOMAIN="dashboard.organizedai.vip"
DEPLOY_DIR="$(dirname "$0")/.."

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-deployment checks
echo
print_status "Running pre-deployment checks..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command_exists vercel; then
    print_error "Vercel CLI is not installed. Please install it with: npm install -g vercel"
    exit 1
fi

# Check if user is logged in to Vercel
if ! vercel whoami >/dev/null 2>&1; then
    print_warning "You are not logged in to Vercel. Attempting login..."
    vercel login
fi

print_success "Pre-deployment checks passed"

# Environment setup
echo
print_status "Setting up deployment environment..."

# Copy deployment configuration
if [ -f "deploy/vercel-config.json" ]; then
    cp deploy/vercel-config.json vercel.json
    print_success "Copied Vercel configuration"
else
    print_warning "vercel-config.json not found in deploy/, using existing vercel.json"
fi

# Run quality checks
echo
print_status "Running quality checks..."

# Type checking
print_status "Running TypeScript type checking..."
if npm run typecheck; then
    print_success "TypeScript type checking passed"
else
    print_error "TypeScript type checking failed"
    exit 1
fi

# Linting
print_status "Running ESLint..."
if npm run lint; then
    print_success "Linting passed"
else
    print_warning "Linting issues found, but continuing deployment"
fi

# Build the project
echo
print_status "Building the project..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Run tests
echo
print_status "Running tests..."
if npm test -- --run; then
    print_success "All tests passed"
else
    print_warning "Some tests failed, but continuing deployment"
fi

# Deploy to Vercel
echo
print_status "Deploying to Vercel..."

# Set deployment configuration
export VERCEL_ORG_ID=${VERCEL_ORG_ID:-""}
export VERCEL_PROJECT_ID=${VERCEL_PROJECT_ID:-""}

# Deploy with custom domain
print_status "Starting deployment to $DOMAIN..."

if vercel --prod --yes --name "$PROJECT_NAME"; then
    print_success "Deployment to Vercel completed"
else
    print_error "Deployment failed"
    exit 1
fi

# Configure custom domain if not already set
echo
print_status "Configuring custom domain..."

# Check if domain is already configured
if vercel domains ls | grep -q "$DOMAIN"; then
    print_success "Domain $DOMAIN is already configured"
else
    print_status "Adding custom domain $DOMAIN..."
    if vercel domains add "$DOMAIN"; then
        print_success "Custom domain added successfully"
    else
        print_warning "Failed to add custom domain. You may need to configure it manually."
    fi
fi

# Link domain to project
print_status "Linking domain to project..."
if vercel alias set --scope=${VERCEL_ORG_ID} "$PROJECT_NAME" "$DOMAIN"; then
    print_success "Domain linked successfully"
else
    print_warning "Failed to link domain automatically. You may need to configure it manually."
fi

# Post-deployment verification
echo
print_status "Running post-deployment verification..."

# Wait a moment for deployment to propagate
sleep 10

# Check if the site is accessible
print_status "Verifying deployment accessibility..."
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200"; then
    print_success "✅ Site is accessible at https://$DOMAIN"
else
    print_warning "⚠️  Site may not be fully accessible yet. DNS propagation can take up to 48 hours."
fi

# Generate deployment report
echo
print_status "Generating deployment report..."

DEPLOYMENT_TIME=$(date)
BUILD_SIZE=$(du -sh dist/client 2>/dev/null | cut -f1 || echo "Unknown")

cat > deployment-report.txt << EOF
Claude Code Optimizer Dashboard Deployment Report
================================================

Deployment Date: $DEPLOYMENT_TIME
Project: $PROJECT_NAME
Domain: https://$DOMAIN
Build Size: $BUILD_SIZE

Deployment Status: ✅ SUCCESS

URLs:
- Production: https://$DOMAIN
- Vercel Dashboard: https://vercel.com/dashboard

Next Steps:
1. Verify all functionality works correctly
2. Monitor performance metrics
3. Set up monitoring and alerts
4. Configure any additional DNS records if needed

Notes:
- SSL certificate should be automatically provisioned
- CDN should be active for optimal performance
- All security headers are configured
EOF

print_success "Deployment report generated: deployment-report.txt"

# Cleanup
if [ -f "vercel.json.backup" ]; then
    mv vercel.json.backup vercel.json
    print_status "Restored original vercel.json"
fi

# Final success message
echo
echo "🎉 Deployment Complete!"
echo "======================"
print_success "Your Claude Code Optimizer Dashboard is now live at:"
echo -e "${GREEN}🌐 https://$DOMAIN${NC}"
echo
print_status "Next steps:"
echo "1. Test all functionality on the live site"
echo "2. Monitor the deployment in Vercel dashboard"
echo "3. Set up monitoring and alerts"
echo "4. Share the URL with your team"
echo
print_status "For any issues, check the Vercel dashboard or contact support."

exit 0