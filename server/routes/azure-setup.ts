import { Router } from 'express';

const router = Router();

/**
 * Configure Azure OpenAI credentials
 */
router.post('/configure', async (req, res) => {
  try {
    const { apiKey, endpoint } = req.body;

    if (!apiKey || !endpoint) {
      return res.status(400).json({ 
        error: 'Both API key and endpoint are required' 
      });
    }

    // Validate endpoint format
    if (!endpoint.includes('openai.azure.com')) {
      return res.status(400).json({ 
        error: 'Invalid Azure OpenAI endpoint. Should contain "openai.azure.com"' 
      });
    }

    // Test the credentials by making a simple API call
    const testResponse = await fetch(`${endpoint}/openai/deployments/gpt-4/chat/completions?api-version=2024-02-15-preview`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 10
      }),
    });

    if (!testResponse.ok) {
      return res.status(400).json({ 
        error: 'Invalid credentials or GPT-4 model not deployed. Please check your Azure OpenAI setup.' 
      });
    }

    // Store credentials in environment (in production, use secure storage)
    process.env.AZURE_OPENAI_API_KEY = apiKey;
    process.env.AZURE_OPENAI_ENDPOINT = endpoint;

    res.json({ 
      success: true, 
      message: 'Azure OpenAI credentials configured successfully. Microsoft Copilot is now active!' 
    });

  } catch (error) {
    console.error('Azure configuration error:', error);
    res.status(500).json({ 
      error: 'Failed to configure Azure OpenAI. Please check your credentials and try again.' 
    });
  }
});

/**
 * Check Azure OpenAI connection status
 */
router.get('/status', async (req, res) => {
  try {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

    if (!apiKey || !endpoint) {
      return res.json({ 
        configured: false,
        message: 'Azure OpenAI credentials not configured' 
      });
    }

    // Test connection
    const testResponse = await fetch(`${endpoint}/openai/deployments/gpt-4/chat/completions?api-version=2024-02-15-preview`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Status check' }],
        max_tokens: 5
      }),
    });

    res.json({ 
      configured: true,
      connected: testResponse.ok,
      message: testResponse.ok ? 'Microsoft Copilot active' : 'Connection issue detected'
    });

  } catch (error) {
    res.json({ 
      configured: true,
      connected: false,
      message: 'Connection test failed'
    });
  }
});

export default router;