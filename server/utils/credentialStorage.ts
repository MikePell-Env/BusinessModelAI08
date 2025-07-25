import { writeFile, readFile, existsSync } from 'fs';
import { promisify } from 'util';
import path from 'path';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);

const CREDENTIALS_FILE = path.join(process.cwd(), '.azure-credentials.json');

interface AzureCredentials {
  apiKey: string;
  endpoint: string;
  configuredAt: string;
}

/**
 * Save Azure OpenAI credentials to secure local storage
 */
export async function saveCredentials(apiKey: string, endpoint: string): Promise<void> {
  const credentials: AzureCredentials = {
    apiKey,
    endpoint,
    configuredAt: new Date().toISOString()
  };

  try {
    await writeFileAsync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
    
    // Also set in environment for immediate use
    process.env.AZURE_OPENAI_API_KEY = apiKey;
    process.env.AZURE_OPENAI_ENDPOINT = endpoint;
    
    console.log('Azure credentials saved successfully');
  } catch (error) {
    console.error('Failed to save credentials:', error);
    throw new Error('Failed to save credentials');
  }
}

/**
 * Load Azure OpenAI credentials from secure local storage
 */
export async function loadCredentials(): Promise<AzureCredentials | null> {
  try {
    if (!existsSync(CREDENTIALS_FILE)) {
      return null;
    }

    const data = await readFileAsync(CREDENTIALS_FILE, 'utf8');
    const credentials: AzureCredentials = JSON.parse(data);
    
    // Set in environment variables
    process.env.AZURE_OPENAI_API_KEY = credentials.apiKey;
    process.env.AZURE_OPENAI_ENDPOINT = credentials.endpoint;
    
    console.log('Azure credentials loaded successfully');
    return credentials;
  } catch (error) {
    console.error('Failed to load credentials:', error);
    return null;
  }
}

/**
 * Check if credentials are currently configured
 */
export function areCredentialsConfigured(): boolean {
  return !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);
}

/**
 * Clear stored credentials
 */
export async function clearCredentials(): Promise<void> {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      await promisify(require('fs').unlink)(CREDENTIALS_FILE);
    }
    
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    
    console.log('Azure credentials cleared');
  } catch (error) {
    console.error('Failed to clear credentials:', error);
    throw new Error('Failed to clear credentials');
  }
}