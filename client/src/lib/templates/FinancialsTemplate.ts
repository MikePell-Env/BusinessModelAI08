import { Color3 } from '@babylonjs/core';
import { createEnvisionerTemplate, EnvisionerTemplate } from './EnvisionerTemplate';

// Financials Envisioner template - 4 financial objects with grouped stacking behavior
export const FinancialsTemplate: EnvisionerTemplate = createEnvisionerTemplate(
  'Financials',
  [
    { color: new Color3(0.0, 0.40, 0.24), name: "Revenue", displayName: "Revenue" }, // Revenue Streams Green (bright)
    { color: new Color3(0.4, 0.08, 0.08), name: "RevenuePL", displayName: "Revenue P&L" }, // Deep red (from Expenses)
    // PRESERVED GOLD SETTING: { color: new Color3(0.7, 0.45, 0.08), name: "RevenuePL", displayName: "Revenue P&L" }, // Gold for Loss
    { color: new Color3(0.349, 0.208, 0.220), name: "Expenses", displayName: "Expenses" }, // Dark red-grey #593538
    { color: new Color3(0.1, 0.1, 0.1), name: "ExpensesPL", displayName: "Expenses P&L" }, // Black for Profit
  ],
  {
    revenueStreamsEnabled: false,
    costStructureEnabled: false,
    showGroundPlane: true,
    showBorderGeometry: true,
  }
);