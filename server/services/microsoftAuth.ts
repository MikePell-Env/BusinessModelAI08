import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

interface AuthConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

interface AccessToken {
  token: string;
  expiresAt: Date;
}

class MicrosoftAuthService {
  private authConfig: AuthConfig;
  private cachedToken: AccessToken | null = null;
  private graphClient: Client | null = null;

  constructor() {
    this.authConfig = {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID!,
    };

    if (!this.authConfig.clientId || !this.authConfig.clientSecret || !this.authConfig.tenantId) {
      throw new Error('Microsoft authentication credentials not configured. Please set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID environment variables.');
    }
  }

  /**
   * Get a valid access token for Microsoft Graph API
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.cachedToken && this.cachedToken.expiresAt > new Date()) {
      return this.cachedToken.token;
    }

    try {
      // Create Azure Identity credential
      const credential = new ClientSecretCredential(
        this.authConfig.tenantId,
        this.authConfig.clientId,
        this.authConfig.clientSecret
      );

      // Get access token for Microsoft Graph
      const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
      
      if (!tokenResponse) {
        throw new Error('Failed to obtain access token from Microsoft Graph');
      }

      // Cache the token with expiration
      this.cachedToken = {
        token: tokenResponse.token,
        expiresAt: new Date(tokenResponse.expiresOnTimestamp)
      };

      return tokenResponse.token;
    } catch (error) {
      console.error('Microsoft Graph authentication failed:', error);
      throw new Error(`Microsoft Graph authentication failed: ${error.message}`);
    }
  }

  /**
   * Get authenticated Microsoft Graph client
   */
  async getGraphClient(): Promise<Client> {
    if (!this.graphClient) {
      const accessToken = await this.getAccessToken();
      
      this.graphClient = Client.init({
        authProvider: async (done) => {
          done(null, accessToken);
        }
      });
    }

    return this.graphClient;
  }

  /**
   * Test the Microsoft Graph connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; userInfo?: any }> {
    try {
      const graphClient = await this.getGraphClient();
      
      // Try to get user information as a connection test
      const me = await graphClient.api('/me').get();
      
      return {
        success: true,
        message: 'Microsoft Graph connection successful',
        userInfo: {
          displayName: me.displayName,
          mail: me.mail,
          id: me.id
        }
      };
    } catch (error) {
      console.error('Microsoft Graph connection test failed:', error);
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }

  /**
   * Search for organizational content using Microsoft Search API
   */
  async searchOrganizationalContent(query: string): Promise<any[]> {
    try {
      const graphClient = await this.getGraphClient();
      
      const searchRequest = {
        requests: [{
          entityTypes: ['driveItem', 'site', 'list'],
          query: {
            queryString: query
          },
          from: 0,
          size: 25
        }]
      };

      const searchResponse = await graphClient.api('/search/query').post(searchRequest);
      
      return searchResponse.value[0]?.hitsContainers[0]?.hits || [];
    } catch (error) {
      console.error('Microsoft Search API failed:', error);
      return [];
    }
  }

  /**
   * Get user's organizational context for business insights
   */
  async getOrganizationalContext(): Promise<any> {
    try {
      const graphClient = await this.getGraphClient();
      
      // Get user's organization and profile information
      const [me, organization] = await Promise.all([
        graphClient.api('/me').get(),
        graphClient.api('/organization').get()
      ]);

      return {
        user: me,
        organization: organization.value[0]
      };
    } catch (error) {
      console.error('Failed to get organizational context:', error);
      return null;
    }
  }
}

export const microsoftAuth = new MicrosoftAuthService();