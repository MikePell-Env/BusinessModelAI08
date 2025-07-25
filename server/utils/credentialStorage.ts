import { writeFile, readFile, existsSync, unlink } from 'fs';
import { promisify } from 'util';
import path from 'path';
import crypto from 'crypto';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);

const CREDENTIALS_FILE = path.join(process.cwd(), '.azure-credentials.enc');

interface AzureCredentials {
  apiKey: string;
  endpoint: string;
  configuredAt: string;
}

interface EncryptedData {
  iv: string;
  encryptedData: string;
  salt: string;
  authTag: string;
}

// Generate a key from machine-specific information
function generateEncryptionKey(): string {
  const machineInfo = `${process.platform}-${process.arch}-${process.env.HOME || process.env.USERPROFILE || 'default'}`;
  return crypto.createHash('sha256').update(machineInfo).digest('hex');
}

function encrypt(text: string): EncryptedData {
  const key = generateEncryptionKey();
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // GCM typically uses 12 bytes for IV
  
  // Derive key using PBKDF2
  const derivedKey = crypto.pbkdf2Sync(key, salt, 10000, 32, 'sha256');
  
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    salt: salt.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedData: EncryptedData): string {
  const key = generateEncryptionKey();
  const salt = Buffer.from(encryptedData.salt, 'hex');
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');
  
  // Derive key using PBKDF2
  const derivedKey = crypto.pbkdf2Sync(key, salt, 10000, 32, 'sha256');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Save Azure OpenAI credentials to encrypted local storage
 */
export async function saveCredentials(apiKey: string, endpoint: string): Promise<void> {
  const credentials: AzureCredentials = {
    apiKey,
    endpoint,
    configuredAt: new Date().toISOString()
  };

  try {
    const credentialsJson = JSON.stringify(credentials);
    const encrypted = encrypt(credentialsJson);
    
    await writeFileAsync(CREDENTIALS_FILE, JSON.stringify(encrypted, null, 2));
    
    // Also set in environment for immediate use
    process.env.AZURE_OPENAI_API_KEY = apiKey;
    process.env.AZURE_OPENAI_ENDPOINT = endpoint;
    
    console.log('Azure credentials encrypted and saved successfully');
  } catch (error) {
    console.error('Failed to save credentials:', error);
    throw new Error('Failed to save credentials');
  }
}

/**
 * Load Azure OpenAI credentials from encrypted local storage
 */
export async function loadCredentials(): Promise<AzureCredentials | null> {
  try {
    if (!existsSync(CREDENTIALS_FILE)) {
      return null;
    }

    const data = await readFileAsync(CREDENTIALS_FILE, 'utf8');
    const encryptedData = JSON.parse(data);
    
    // Check if this is old format (missing authTag) and clear it
    if (!encryptedData.authTag) {
      console.log('Old credential format detected, clearing for re-entry');
      await clearCredentials();
      return null;
    }
    
    const decryptedJson = decrypt(encryptedData as EncryptedData);
    const credentials: AzureCredentials = JSON.parse(decryptedJson);
    
    // Set in environment variables
    process.env.AZURE_OPENAI_API_KEY = credentials.apiKey;
    process.env.AZURE_OPENAI_ENDPOINT = credentials.endpoint;
    
    console.log('Azure credentials decrypted and loaded successfully');
    return credentials;
  } catch (error) {
    console.error('Failed to load or decrypt credentials, clearing for re-entry:', error);
    // Clear corrupted credentials and let user re-enter
    await clearCredentials();
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
      await unlinkAsync(CREDENTIALS_FILE);
    }
    
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    
    console.log('Azure credentials cleared');
  } catch (error) {
    console.error('Failed to clear credentials:', error);
    throw new Error('Failed to clear credentials');
  }
}