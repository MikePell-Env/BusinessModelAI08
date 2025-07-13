#!/usr/bin/env node

/**
 * Azure Setup Script for Business Model Canvas AI
 * This script helps set up Azure resources for hosting the application
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function execCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully`);
    return result;
  } catch (error) {
    console.error(`❌ Failed: ${description}`);
    console.error(error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Azure Setup for Business Model Canvas AI\n');

  // Get configuration from user
  const resourceGroup = await prompt('Resource Group name (default: businessmodel-ai-rg): ') || 'businessmodel-ai-rg';
  const appName = await prompt('App Service name (default: businessmodel-ai): ') || 'businessmodel-ai';
  const location = await prompt('Azure region (default: eastus): ') || 'eastus';
  const dbName = await prompt('Database name (default: businessmodel-ai-db): ') || 'businessmodel-ai-db';
  const dbPassword = await prompt('Database admin password: ');
  
  console.log('\n📋 Configuration Summary:');
  console.log(`Resource Group: ${resourceGroup}`);
  console.log(`App Name: ${appName}`);
  console.log(`Location: ${location}`);
  console.log(`Database: ${dbName}`);

  const confirm = await prompt('\nProceed with setup? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Setup cancelled.');
    process.exit(0);
  }

  try {
    // Check if Azure CLI is installed
    execCommand('az --version', 'Checking Azure CLI installation');

    // Login to Azure (if not already logged in)
    console.log('\n🔐 Please ensure you are logged into Azure CLI');
    execCommand('az account show', 'Checking Azure login status');

    // Create resource group
    execCommand(
      `az group create --name ${resourceGroup} --location ${location}`,
      'Creating resource group'
    );

    // Create App Service plan
    execCommand(
      `az appservice plan create --name ${appName}-plan --resource-group ${resourceGroup} --sku B1 --is-linux`,
      'Creating App Service plan'
    );

    // Create Web App
    execCommand(
      `az webapp create --resource-group ${resourceGroup} --plan ${appName}-plan --name ${appName} --runtime "NODE|18-lts"`,
      'Creating Web App'
    );

    // Create PostgreSQL database
    execCommand(
      `az postgres flexible-server create --resource-group ${resourceGroup} --name ${dbName} --admin-user dbadmin --admin-password "${dbPassword}" --sku-name Standard_B1ms --tier Burstable --version 14 --location ${location}`,
      'Creating PostgreSQL database'
    );

    // Create Azure OpenAI service
    execCommand(
      `az cognitiveservices account create --name ${appName}-openai --resource-group ${resourceGroup} --kind OpenAI --sku S0 --location ${location}`,
      'Creating Azure OpenAI service'
    );

    // Configure firewall for database
    execCommand(
      `az postgres flexible-server firewall-rule create --resource-group ${resourceGroup} --name ${dbName} --rule-name AllowAzureServices --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0`,
      'Configuring database firewall'
    );

    // Get connection information
    console.log('\n📝 Getting connection information...');
    
    const openaiEndpoint = execSync(`az cognitiveservices account show --name ${appName}-openai --resource-group ${resourceGroup} --query "properties.endpoint" --output tsv`, { encoding: 'utf8' }).trim();
    const openaiKey = execSync(`az cognitiveservices account keys list --name ${appName}-openai --resource-group ${resourceGroup} --query "key1" --output tsv`, { encoding: 'utf8' }).trim();

    // Set app settings
    const databaseUrl = `postgresql://dbadmin:${dbPassword}@${dbName}.postgres.database.azure.com:5432/postgres?sslmode=require`;
    
    execCommand(
      `az webapp config appsettings set --resource-group ${resourceGroup} --name ${appName} --settings NODE_ENV=production DATABASE_URL="${databaseUrl}" AZURE_OPENAI_ENDPOINT="${openaiEndpoint}" AZURE_OPENAI_API_KEY="${openaiKey}"`,
      'Setting application configuration'
    );

    console.log('\n🎉 Azure setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Configure Microsoft Graph API permissions in Azure Portal');
    console.log('2. Add GitHub secrets for CI/CD deployment');
    console.log('3. Deploy your application using GitHub Actions');
    console.log(`4. Your app will be available at: https://${appName}.azurewebsites.net`);
    
    console.log('\n🔐 Important information:');
    console.log(`Azure OpenAI Endpoint: ${openaiEndpoint}`);
    console.log(`Database Connection: ${databaseUrl}`);
    console.log('\n⚠️  Store these credentials securely!');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(console.error);