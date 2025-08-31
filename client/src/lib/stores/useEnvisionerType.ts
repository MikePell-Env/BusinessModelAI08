import { create } from 'zustand';
import { EnvisionerTemplate } from '../templates/EnvisionerTemplate';
import { BusinessModelTemplate } from '../templates/BusinessModelTemplate';
import { FinancialsTemplate } from '../templates/FinancialsTemplate';

export type EnvisionerType = 'business-model' | 'financials';

interface EnvisionerTypeState {
  currentType: EnvisionerType;
  currentTemplate: EnvisionerTemplate;
  
  // Actions
  switchToBusinessModel: () => void;
  switchToFinancials: () => void;
  setEnvisionerType: (type: EnvisionerType) => void;
}

// Template registry
const TEMPLATES: Record<EnvisionerType, EnvisionerTemplate> = {
  'business-model': BusinessModelTemplate,
  'financials': FinancialsTemplate,
};

export const useEnvisionerType = create<EnvisionerTypeState>((set) => ({
  currentType: 'business-model',
  currentTemplate: BusinessModelTemplate,

  switchToBusinessModel: () => {
    // Save current financial state before switching away from Financials
    const currentState = useEnvisionerType.getState();
    if (currentState.currentType === 'financials') {
      const controller = (window as any).financialsController;
      if (controller) {
        controller.saveFinancialState();
        console.log('💾 Saved financial state before switching to Business Model');
      }
    }
    
    set({
      currentType: 'business-model',
      currentTemplate: TEMPLATES['business-model'],
    });
  },

  switchToFinancials: () => {
    set({
      currentType: 'financials',
      currentTemplate: TEMPLATES['financials'],
    });
    
    // Restore financial state after switching to Financials
    setTimeout(() => {
      const controller = (window as any).financialsController;
      if (controller) {
        controller.restoreFinancialState();
        console.log('🔄 Restored financial state after switching to Financials');
      }
    }, 100); // Small delay to ensure 3D objects are loaded
  },

  setEnvisionerType: (type: EnvisionerType) => {
    set({
      currentType: type,
      currentTemplate: TEMPLATES[type],
    });
  },
}));