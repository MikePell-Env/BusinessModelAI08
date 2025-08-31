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
  },

  setEnvisionerType: (type: EnvisionerType) => {
    set({
      currentType: type,
      currentTemplate: TEMPLATES[type],
    });
  },
}));