import React, { Suspense } from "react";
import { BusinessModelCanvas } from "./components/BusinessModelCanvas";
import "@fontsource/inter";

function App() {
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
        <BusinessModelCanvas />
      </Suspense>
    </div>
  );
}

export default App;
