#!/bin/bash

# Azure Deployment Script for Business Model Canvas AI
# This script builds and deploys the application to Azure App Service

set -e

echo "🚀 Starting Azure deployment..."

# Configuration
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-businessmodel-ai-rg}"
APP_NAME="${AZURE_APP_NAME:-businessmodel-ai}"
BUILD_DIR="dist"
DEPLOY_ZIP="deployment.zip"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged into Azure. Please run 'az login' first."
        exit 1
    fi
    
    log_info "All prerequisites met!"
}

# Build the application
build_application() {
    log_info "Building application..."
    
    # Install dependencies
    npm ci
    
    # Run build
    npm run build
    
    # Copy package.json for runtime dependencies
    cp package.json $BUILD_DIR/
    
    log_info "Build completed successfully!"
}

# Create deployment package
create_deployment_package() {
    log_info "Creating deployment package..."
    
    # Clean up previous deployment package
    rm -f $DEPLOY_ZIP
    
    # Create zip file with built application
    cd $BUILD_DIR
    zip -r "../$DEPLOY_ZIP" . -x "*.map" "*.md" "*.txt"
    cd ..
    
    log_info "Deployment package created: $DEPLOY_ZIP"
}

# Deploy to Azure
deploy_to_azure() {
    log_info "Deploying to Azure App Service..."
    
    # Deploy using Azure CLI
    az webapp deployment source config-zip \
        --resource-group "$RESOURCE_GROUP" \
        --name "$APP_NAME" \
        --src "$DEPLOY_ZIP"
    
    log_info "Deployment completed!"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Note: This would typically be done through Azure App Service SSH or a separate migration job
    log_warn "Database migrations should be run manually after deployment"
    log_warn "Connect to your app via SSH and run: npm run db:push"
}

# Get deployment info
get_deployment_info() {
    log_info "Getting deployment information..."
    
    APP_URL=$(az webapp show --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --query "defaultHostName" --output tsv)
    
    echo ""
    log_info "🎉 Deployment successful!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "  • Resource Group: $RESOURCE_GROUP"
    echo "  • App Name: $APP_NAME"
    echo "  • App URL: https://$APP_URL"
    echo ""
    echo "🔧 Next steps:"
    echo "  1. Run database migrations"
    echo "  2. Configure custom domain (optional)"
    echo "  3. Set up monitoring and alerts"
    echo "  4. Test the application"
    echo ""
}

# Clean up
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f "$DEPLOY_ZIP"
}

# Main deployment process
main() {
    echo "🔧 Azure Deployment for Business Model Canvas AI"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    build_application
    create_deployment_package
    deploy_to_azure
    run_migrations
    get_deployment_info
    cleanup
    
    echo "✅ Deployment process completed!"
}

# Handle errors
trap 'log_error "Deployment failed! Check the logs above for details."; cleanup; exit 1' ERR

# Run main function
main "$@"