import { Color3 } from '@babylonjs/core';
import { createEnvisionerTemplate, EnvisionerTemplate } from './EnvisionerTemplate';

// Financials Envisioner template - 4 financial objects with grouped stacking behavior
export const FinancialsTemplate: EnvisionerTemplate = createEnvisionerTemplate(
  'Financials',
  [
    { color: new Color3(0.0, 0.40, 0.24), name: "Revenue", displayName: "Revenue" }, // Revenue Streams Green (bright)
    { color: new Color3(1.0, 0.75, 0.0), name: "RevenuePL", displayName: "Revenue P&L" }, // Gold #FFC000  
    { color: new Color3(0.70, 0.0, 0.0), name: "Expenses", displayName: "Expenses" }, // Cost Structure Red (bright)
    { color: new Color3(0.15, 0.0, 0.0), name: "ExpensesPL", displayName: "Expenses P&L" }, // Much darker red
  ],
  {
    revenueStreamsEnabled: false,
    costStructureEnabled: false,
    showGroundPlane: true,
    showBorderGeometry: true,
  }
);