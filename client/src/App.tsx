import React, { Suspense, useState, useEffect } from "react";
import { HomePage } from "./components/HomePage";
import { ExplorePage } from "./components/ExplorePage";
import { OverviewPage } from "./components/OverviewPage";
import { AzureCredentialSetup } from "./components/AzureCredentialSetup";
import { useCanvas } from "./lib/stores/useCanvas";
import "@fontsource/inter";

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'explore' | 'overview'>('home');
  const [azureConfigured, setAzureConfigured] = useState<boolean | null>(null);
  const [showCredentialSetup, setShowCredentialSetup] = useState(false);
  const { toggleChat } = useCanvas();

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

  const navigateToHome = React.useCallback(() => {
    console.log('Navigating to Home');
    setCurrentPage('home');
  }, []);
  const navigateToExplore = React.useCallback(() => {
    console.log('Navigating to Explore');
    setCurrentPage('explore');
  }, []);
  const navigateToOverview = React.useCallback(() => {
    console.log('Navigating to Overview');
    setCurrentPage('overview');
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
      minHeight: '100vh', 
      position: 'relative', 
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
        {currentPage === 'explore' ? (
          <ExplorePage 
            onNavigateHome={navigateToHome} 
            onNavigateExplore={navigateToExplore}
            onNavigateOverview={navigateToOverview}
            currentPage={currentPage}
          />
        ) : currentPage === 'overview' ? (
          <OverviewPage 
            onNavigateHome={navigateToHome} 
            onNavigateExplore={navigateToExplore}
            onNavigateOverview={navigateToOverview}
            currentPage={currentPage}
          />
        ) : (
          <HomePage 
            onNavigateHome={navigateToHome} 
            onNavigateExplore={navigateToExplore}
            onNavigateOverview={navigateToOverview}
            currentPage={currentPage}
          />
        )}
      </Suspense>

      {showCredentialSetup && (
        <AzureCredentialSetup onCredentialsSubmit={handleCredentialsSubmit} />
      )}

      {azureConfigured === true && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-300 rounded-lg p-3 w-72 z-50">
          <div className="flex items-center">
            <img 
              src="/copilot-logo.png" 
              alt="Microsoft Copilot" 
              className="w-8 h-8 mr-3 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={toggleChat}
              title="Click to open AI Assistant"
            />
            <div>
              <p className="text-sm text-green-800 mb-1">
                <strong>🔒 Microsoft Copilot Active</strong>
              </p>
              <p className="text-xs text-green-600 leading-relaxed">
                Azure OpenAI connected with encrypted credential storage
              </p>
            </div>
          </div>
        </div>
      )}

      {azureConfigured === false && (
        <div className="fixed bottom-4 right-4 bg-blue-100 border border-blue-300 rounded-lg p-3 w-72 z-50">
          <div className="flex items-start">
            <img 
              src="/copilot-logo.png" 
              alt="Microsoft Copilot" 
              className="w-8 h-8 mr-3 flex-shrink-0 mt-1"
            />
            <div>
              <p className="text-sm text-blue-800 mb-2">
                <strong>Microsoft Copilot Ready</strong>
              </p>
              <p className="text-xs text-blue-600 mb-2 leading-relaxed">
                AI chat active with OpenAI fallback. Azure setup optional for enterprise features.
              </p>
              <button
                onClick={() => setShowCredentialSetup(true)}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Configure Azure (Optional)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
