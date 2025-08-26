import { Color3 } from '@babylonjs/core';
import { createEnvisionerTemplate, EnvisionerTemplate } from './EnvisionerTemplate';

// Financials Envisioner template - 4 financial objects with grouped stacking behavior
export const FinancialsTemplate: EnvisionerTemplate = createEnvisionerTemplate(
  'Financials',
  [
    { color: new Color3(0.2, 0.7, 0.2), name: "Revenue", displayName: "Revenue" }, // Green
    { color: new Color3(0.3, 0.8, 0.3), name: "RevenuePL", displayName: "Revenue P&L" }, // Light Green  
    { color: new Color3(0.8, 0.2, 0.2), name: "Expenses", displayName: "Expenses" }, // Red
    { color: new Color3(0.9, 0.3, 0.3), name: "ExpensesPL", displayName: "Expenses P&L" }, // Light Red
  ],
  {
    revenueStreamsEnabled: false,
    costStructureEnabled: false,
    showGroundPlane: true,
    showBorderGeometry: true,
  }
);