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

  // Anti-flash transition - completely immediate content switch with no delays
  const smoothTransition = async (targetType: EnvisionerType) => {
    const currentState = get();
    
    // Prevent duplicate transitions or same-state switches
    if (currentState.isTransitioning || currentState.currentType === targetType) {
      return;
    }

    console.log(`🎬 Switching to ${targetType}...`);
    
    // Switch content completely immediately - no delays or intermediate states
    set({
      currentType: targetType,
      currentTemplate: TEMPLATES[targetType],
      isTransitioning: false,
      transitionProgress: 1
    });
    console.log(`✅ Switched to ${targetType} (instant)`);
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