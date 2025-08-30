import { create } from 'zustand';
import { EnvisionerTemplate } from '../templates/EnvisionerTemplate';
import { BusinessModelTemplate } from '../templates/BusinessModelTemplate';
import { FinancialsTemplate } from '../templates/FinancialsTemplate';

export type EnvisionerType = 'business-model' | 'financials';

interface EnvisionerTypeState {
  currentType: EnvisionerType;
  currentTemplate: EnvisionerTemplate;
  isTransitioning: boolean;
  transitionProgress: number;
  
  // Actions
  switchToBusinessModel: () => void;
  switchToFinancials: () => void;
  setEnvisionerType: (type: EnvisionerType) => void;
  
  // REVERTIBLE: Original functions preserved for easy rollback
  _revertToOriginal: () => void;
}

// Template registry
const TEMPLATES: Record<EnvisionerType, EnvisionerTemplate> = {
  'business-model': BusinessModelTemplate,
  'financials': FinancialsTemplate,
};

export const useEnvisionerType = create<EnvisionerTypeState>((set, get) => {
  // REVERTIBLE: Store original simple switching functions
  const originalSwitchToBusinessModel = () => {
    set({
      currentType: 'business-model',
      currentTemplate: TEMPLATES['business-model'],
    });
  };

  const originalSwitchToFinancials = () => {
    set({
      currentType: 'financials',
      currentTemplate: TEMPLATES['financials'],
    });
  };

  const originalSetEnvisionerType = (type: EnvisionerType) => {
    set({
      currentType: type,
      currentTemplate: TEMPLATES[type],
    });
  };

  // Enhanced smooth transition function with polished animations
  const smoothTransition = async (targetType: EnvisionerType, duration: number = 800) => {
    const currentState = get();
    
    // Prevent duplicate transitions or same-state switches
    if (currentState.isTransitioning || currentState.currentType === targetType) {
      return;
    }

    console.log(`🎬 Starting smooth transition to ${targetType}...`);
    
    // Initialize transition state
    set({ isTransitioning: true, transitionProgress: 0 });

    // Smooth animation with professional easing
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      
      // Professional ease-in-out-cubic easing for smooth feel
      const easedProgress = rawProgress < 0.5 
        ? 4 * rawProgress * rawProgress * rawProgress 
        : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
      
      set({ transitionProgress: easedProgress });
      
      // Continue animation or complete transition
      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Complete the transition
        set({
          currentType: targetType,
          currentTemplate: TEMPLATES[targetType],
          isTransitioning: false,
          transitionProgress: 1
        });
        console.log(`✅ Transition to ${targetType} completed`);
      }
    };
    
    // Start the animation
    requestAnimationFrame(animate);
  };

  return {
    currentType: 'business-model',
    currentTemplate: BusinessModelTemplate,
    isTransitioning: false,
    transitionProgress: 0,

    // Enhanced switching with smooth transitions
    switchToBusinessModel: () => smoothTransition('business-model'),
    switchToFinancials: () => smoothTransition('financials'),
    setEnvisionerType: (type: EnvisionerType) => smoothTransition(type),

    // REVERTIBLE: Function to restore original behavior
    _revertToOriginal: () => {
      const state = get();
      set({
        ...state,
        switchToBusinessModel: originalSwitchToBusinessModel,
        switchToFinancials: originalSwitchToFinancials,
        setEnvisionerType: originalSetEnvisionerType,
        isTransitioning: false,
        transitionProgress: 0
      });
      console.log('🔄 Reverted to original template switching behavior');
    },
  };
});