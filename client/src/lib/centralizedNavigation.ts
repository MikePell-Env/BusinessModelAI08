// Centralized Navigation System
// This provides a global navigation mechanism that works regardless of page structure

export type PageType = 'home' | 'explore' | 'overview' | 'about';

// Global navigation state
let globalNavigationHandler: ((page: PageType) => void) | null = null;

// Register the global navigation handler (called from App.tsx)
export const registerGlobalNavigation = (handler: (page: PageType) => void) => {
  globalNavigationHandler = handler;
  console.log('🌐 Global navigation handler registered');
};

// Centralized navigation functions
export const centralizedNavigation = {
  navigateToHome: () => {
    console.log('🌐 Centralized: Navigate to Home');
    if (globalNavigationHandler) {
      globalNavigationHandler('home');
    } else {
      console.error('❌ Global navigation handler not registered!');
    }
  },

  navigateToExplore: () => {
    console.log('🌐 Centralized: Navigate to Explore');
    if (globalNavigationHandler) {
      globalNavigationHandler('explore');
    } else {
      console.error('❌ Global navigation handler not registered!');
    }
  },

  navigateToOverview: () => {
    console.log('🌐 Centralized: Navigate to Overview');
    if (globalNavigationHandler) {
      globalNavigationHandler('overview');
    } else {
      console.error('❌ Global navigation handler not registered!');
    }
  },

  navigateToAbout: () => {
    console.log('🌐 Centralized: Navigate to About');
    if (globalNavigationHandler) {
      globalNavigationHandler('about');
    } else {
      console.error('❌ Global navigation handler not registered!');
    }
  }
};

// Emergency fallback - direct DOM manipulation if all else fails
export const emergencyNavigateToAbout = () => {
  console.log('🚨 Emergency: Attempting direct About navigation');
  
  // Try to dispatch a custom event that the App component can listen for
  const navigationEvent = new CustomEvent('emergencyNavigation', {
    detail: { page: 'about' }
  });
  window.dispatchEvent(navigationEvent);
};