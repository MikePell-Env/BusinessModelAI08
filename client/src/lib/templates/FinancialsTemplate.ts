import { Color3 } from '@babylonjs/core';
import { createEnvisionerTemplate, EnvisionerTemplate } from './EnvisionerTemplate';

// Financials Envisioner template - 4 financial objects with grouped stacking behavior
export const FinancialsTemplate: EnvisionerTemplate = createEnvisionerTemplate(
  'Financials',
  [
    { color: new Color3(0.0, 1.0, 0.0), name: "Revenue", displayName: "Revenue" }, // Bright Green
    { color: new Color3(0.0, 0.5, 0.0), name: "RevenuePL", displayName: "Revenue P&L" }, // Dark Green  
    { color: new Color3(1.0, 0.0, 0.0), name: "Expenses", displayName: "Expenses" }, // Bright Red
    { color: new Color3(0.5, 0.0, 0.0), name: "ExpensesPL", displayName: "Expenses P&L" }, // Dark Red
  ],
  {
    revenueStreamsEnabled: false,
    costStructureEnabled: false,
    showGroundPlane: true,
    showBorderGeometry: true,
  }
);