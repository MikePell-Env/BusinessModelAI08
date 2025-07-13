# Azure Deployment Guide

This guide covers deploying the Business Model Canvas AI application to Microsoft Azure, leveraging the full Microsoft ecosystem.

## Prerequisites

- Azure subscription
- Azure CLI installed
- GitHub account (for CI/CD)
- Node.js 18+ locally

## Azure Services Required

### Core Services
- **Azure App Service** - Web application hosting
- **Azure Database for PostgreSQL** - Database hosting
- **Azure OpenAI Service** - AI/ML capabilities
- **Azure Key Vault** - Secrets management
- **Azure Application Insights** - Monitoring and analytics

### Optional Services
- **Azure CDN** - Content delivery
- **Azure Front Door** - Global load balancing
- **Azure Container Registry** - If using containers
- **Azure Static Web Apps** - Alternative for frontend

## Step 1: Create Azure Resources

### 1.1 Create Resource Group
```bash
az group create --name businessmodel-ai-rg --location eastus
```

### 1.2 Create App Service Plan
```bash
az appservice plan create \
  --name businessmodel-ai-plan \
  --resource-group businessmodel-ai-rg \
  --sku B1 \
  --is-linux
```

### 1.3 Create Web App
```bash
az webapp create \
  --resource-group businessmodel-ai-rg \
  --plan businessmodel-ai-plan \
  --name businessmodel-ai \
  --runtime "NODE|18-lts"
```

### 1.4 Create PostgreSQL Database
```bash
az postgres flexible-server create \
  --resource-group businessmodel-ai-rg \
  --name businessmodel-ai-db \
  --admin-user dbadmin \
  --admin-password <secure-password> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14
```

### 1.5 Create Azure OpenAI Service
```bash
az cognitiveservices account create \
  --name businessmodel-ai-openai \
  --resource-group businessmodel-ai-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus
```

## Step 2: Configure Environment Variables

### 2.1 Set Application Settings
```bash
az webapp config appsettings set \
  --resource-group businessmodel-ai-rg \
  --name businessmodel-ai \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="postgresql://dbadmin:<password>@businessmodel-ai-db.postgres.database.azure.com:5432/postgres?sslmode=require" \
    AZURE_OPENAI_ENDPOINT="https://businessmodel-ai-openai.openai.azure.com/" \
    AZURE_OPENAI_API_KEY="<api-key>" \
    MICROSOFT_CLIENT_ID="<client-id>" \
    MICROSOFT_CLIENT_SECRET="<client-secret>" \
    MICROSOFT_TENANT_ID="<tenant-id>"
```

### 2.2 Create Key Vault (Recommended for Production)
```bash
az keyvault create \
  --name businessmodel-ai-kv \
  --resource-group businessmodel-ai-rg \
  --location eastus
```

## Step 3: Configure Microsoft Graph API

### 3.1 Register Azure AD Application
1. Go to Azure Portal → Azure Active Directory
2. App registrations → New registration
3. Name: "Business Model Canvas AI"
4. Supported account types: "Accounts in this organizational directory only"
5. Redirect URI: `https://businessmodel-ai.azurewebsites.net/auth/callback`

### 3.2 Configure API Permissions
Add these Microsoft Graph permissions:
- `User.Read` (Delegated)
- `Files.Read.All` (Application)
- `Sites.Read.All` (Application)
- `Group.Read.All` (Application)

### 3.3 Create Client Secret
1. Certificates & secrets → New client secret
2. Description: "Production secret"
3. Expires: 24 months
4. Copy the secret value immediately

## Step 4: Deploy Application

### 4.1 GitHub Actions Deployment (Recommended)

1. **Get Publish Profile:**
```bash
az webapp deployment list-publishing-profiles \
  --name businessmodel-ai \
  --resource-group businessmodel-ai-rg \
  --xml
```

2. **Add GitHub Secrets:**
   - `AZURE_WEBAPP_PUBLISH_PROFILE` - The XML content from step 1
   - `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key
   - `DATABASE_URL` - PostgreSQL connection string

3. **Push to GitHub:**
The GitHub Actions workflow in `azure-deploy.yml` will automatically deploy on push to main branch.

### 4.2 Manual Deployment
```bash
# Build the application
npm run build

# Deploy using Azure CLI
az webapp deployment source config-zip \
  --resource-group businessmodel-ai-rg \
  --name businessmodel-ai \
  --src ./dist.zip
```

## Step 5: Configure Database

### 5.1 Run Database Migrations
```bash
# Connect to your deployed app
az webapp ssh --resource-group businessmodel-ai-rg --name businessmodel-ai

# Run migrations
npm run db:migrate
```

### 5.2 Configure Firewall Rules
```bash
az postgres flexible-server firewall-rule create \
  --resource-group businessmodel-ai-rg \
  --name businessmodel-ai-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## Step 6: Configure Monitoring

### 6.1 Enable Application Insights
```bash
az extension add --name application-insights

az monitor app-insights component create \
  --app businessmodel-ai-insights \
  --location eastus \
  --resource-group businessmodel-ai-rg
```

### 6.2 Connect to Web App
```bash
az webapp config appsettings set \
  --resource-group businessmodel-ai-rg \
  --name businessmodel-ai \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="<connection-string>"
```

## Step 7: Configure Custom Domain (Optional)

### 7.1 Add Custom Domain
```bash
az webapp config hostname add \
  --webapp-name businessmodel-ai \
  --resource-group businessmodel-ai-rg \
  --hostname yourdomain.com
```

### 7.2 Enable SSL
```bash
az webapp config ssl bind \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI \
  --name businessmodel-ai \
  --resource-group businessmodel-ai-rg
```

## Step 8: Production Optimization

### 8.1 Scale Settings
```bash
# Auto-scaling rules
az monitor autoscale create \
  --resource-group businessmodel-ai-rg \
  --resource businessmodel-ai \
  --resource-type Microsoft.Web/sites \
  --name businessmodel-ai-autoscale \
  --min-count 1 \
  --max-count 5 \
  --count 2
```

### 8.2 Performance Monitoring
- Configure Application Insights alerts
- Set up availability tests
- Monitor database performance
- Configure log analytics

## Environment Variables Reference

### Required
- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL connection string
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI service endpoint
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `MICROSOFT_CLIENT_ID` - Azure AD app client ID
- `MICROSOFT_CLIENT_SECRET` - Azure AD app client secret
- `MICROSOFT_TENANT_ID` - Azure AD tenant ID

### Optional
- `APPLICATIONINSIGHTS_CONNECTION_STRING` - Application Insights
- `AZURE_KEY_VAULT_URL` - Key Vault for secrets
- `SESSION_SECRET` - Session encryption key
- `CORS_ORIGIN` - Allowed CORS origins

## Troubleshooting

### Common Issues

1. **Database Connection Fails**
   - Check firewall rules
   - Verify connection string
   - Ensure SSL is configured

2. **Microsoft Graph API Errors**
   - Verify app permissions
   - Check tenant ID
   - Ensure admin consent given

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs in GitHub Actions

4. **Performance Issues**
   - Enable Application Insights
   - Review App Service plan size
   - Check database performance metrics

### Support Resources

- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Azure OpenAI Service](https://docs.microsoft.com/en-us/azure/cognitive-services/openai/)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/en-us/azure/postgresql/)

## Cost Optimization

- Use Azure Cost Management to monitor spending
- Consider Azure Reserved Instances for predictable workloads
- Implement auto-scaling to optimize resource usage
- Use Azure CDN for static content delivery
- Monitor and optimize database query performance