import { Color3 } from '@babylonjs/core';
import { createEnvisionerTemplate, EnvisionerTemplate } from './EnvisionerTemplate';

// Financials Envisioner template - 4 financial objects with grouped stacking behavior
export const FinancialsTemplate: EnvisionerTemplate = createEnvisionerTemplate(
  'Financials',
  [
    { color: new Color3(0.0, 0.40, 0.24), name: "Revenue", displayName: "Revenue" }, // Revenue Streams Green (bright)
    { color: new Color3(0.70, 0.0, 0.0), name: "RevenuePL", displayName: "Revenue P&L" }, // Red for Loss
    { color: new Color3(0.25, 0.05, 0.05), name: "Expenses", displayName: "Expenses" }, // Very deep red, almost black
    { color: new Color3(0.7, 0.45, 0.08), name: "ExpensesPL", displayName: "Expenses P&L" }, // Toned down gold for Profit
  ],
  {
    revenueStreamsEnabled: false,
    costStructureEnabled: false,
    showGroundPlane: true,
    showBorderGeometry: true,
  }
);