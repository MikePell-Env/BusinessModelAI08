// Centralized Navigation System
// This provides a global navigation mechanism that works regardless of page structure

export type PageType = 'home' | 'explore' | 'overview' | 'about';

// Global navigation state
let globalNavigationHandler: ((page: PageType) => void) | null = null;

// Register the global navigation handler (called from App.tsx)
export const registerGlobalNavigation = (handler: (page: PageType) => void) => {
  globalNavigationHandler = handler;
};

// Centralized navigation functions
export const centralizedNavigation = {
  navigateToHome: () => {
    if (globalNavigationHandler) {
      globalNavigationHandler('home');
    }
  },

  navigateToExplore: () => {
    if (globalNavigationHandler) {
      globalNavigationHandler('explore');
    }
  },

  navigateToOverview: () => {
    if (globalNavigationHandler) {
      globalNavigationHandler('overview');
    }
  },

  navigateToAbout: () => {
    if (globalNavigationHandler) {
      globalNavigationHandler('about');
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