import React, { Suspense, useState, useEffect } from "react";
import { HomePage } from "./components/HomePage";
import { AzureCredentialSetup } from "./components/AzureCredentialSetup";
import "@fontsource/inter";

function App() {
  const [azureConfigured, setAzureConfigured] = useState<boolean | null>(null);
  const [showCredentialSetup, setShowCredentialSetup] = useState(false);

  useEffect(() => {
    // Check Azure OpenAI status on app load
    fetch('/api/azure/status')
      .then(res => res.json())
      .then(data => {
        setAzureConfigured(data.configured && data.connected);
        if (!data.configured || !data.connected) {
          setShowCredentialSetup(true);
        }
      })
      .catch(() => {
        setAzureConfigured(false);
        setShowCredentialSetup(true);
      });
  }, []);

  const handleCredentialsSubmit = async (apiKey: string, endpoint: string) => {
    try {
      const response = await fetch('/api/azure/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, endpoint })
      });

      const data = await response.json();
      
      if (data.success) {
        setAzureConfigured(true);
        setShowCredentialSetup(false);
        alert('Microsoft Copilot activated successfully!');
      } else {
        alert(data.error || 'Failed to configure Azure OpenAI');
      }
    } catch (error) {
      alert('Failed to configure Azure OpenAI. Please try again.');
    }
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative', 
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
    }}>
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading application...</p>
          </div>
        </div>
      }>
        <HomePage />
      </Suspense>

      {showCredentialSetup && (
        <AzureCredentialSetup onCredentialsSubmit={handleCredentialsSubmit} />
      )}

      {azureConfigured === true && (
        <div className="fixed bottom-20 right-4 bg-green-100 border border-green-300 rounded-lg p-3 w-96 z-50">
          <p className="text-sm text-green-800 mb-1">
            <strong>🔒 Microsoft Copilot Active</strong>
          </p>
          <p className="text-xs text-green-600">
            Azure OpenAI connected with encrypted credential storage
          </p>
        </div>
      )}

      {azureConfigured === false && (
        <div className="fixed bottom-20 right-4 bg-blue-100 border border-blue-300 rounded-lg p-3 w-96 z-50">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Microsoft Copilot Ready</strong>
          </p>
          <p className="text-xs text-blue-600 mb-2">
            AI chat active with OpenAI fallback. Azure setup optional for enterprise features.
          </p>
          <button
            onClick={() => setShowCredentialSetup(true)}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Configure Azure (Optional)
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
