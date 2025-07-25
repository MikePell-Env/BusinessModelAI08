import React, { useState } from 'react';

interface AzureCredentialSetupProps {
  onCredentialsSubmit: (apiKey: string, endpoint: string) => void;
}

export const AzureCredentialSetup: React.FC<AzureCredentialSetupProps> = ({ onCredentialsSubmit }) => {
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onCredentialsSubmit(apiKey, endpoint);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidEndpoint = endpoint.includes('openai.azure.com');
  const isValidApiKey = apiKey.length > 30;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Enable Microsoft Copilot
          </h2>
          <p className="text-gray-600">
            Connect your Azure OpenAI Service to enable enterprise-grade Microsoft Copilot integration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700 mb-2">
              Azure OpenAI Endpoint
            </label>
            <input
              type="url"
              id="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://yourname.openai.azure.com/"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in Azure Portal → Your OpenAI Resource → Keys and Endpoint
            </p>
          </div>

          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your Azure OpenAI API Key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Copy Key 1 from Azure Portal → Your OpenAI Resource → Keys and Endpoint
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-1">Quick Setup Guide:</h4>
            <ol className="text-xs text-blue-800 space-y-1">
              <li>1. Go to <a href="https://portal.azure.com" className="underline" target="_blank" rel="noopener noreferrer">portal.azure.com</a></li>
              <li>2. Create Azure OpenAI Resource</li>
              <li>3. Deploy GPT-4 model (name it "gpt-4")</li>
              <li>4. Copy endpoint and API key from "Keys and Endpoint" tab</li>
            </ol>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={!isValidEndpoint || !isValidApiKey || isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Connecting...' : 'Enable Microsoft Copilot'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Your credentials are stored securely and used only for Microsoft Copilot integration
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};