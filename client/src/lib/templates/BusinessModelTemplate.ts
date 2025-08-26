import { Color3 } from '@babylonjs/core';
import { createEnvisionerTemplate, EnvisionerTemplate } from './EnvisionerTemplate';

// Business Model Canvas template - extracted from current Canvas3DBabylon configuration
export const BusinessModelTemplate: EnvisionerTemplate = createEnvisionerTemplate(
  'Business Model',
  [
    { color: new Color3(0.3, 0.6, 0.9), name: "Value Propositions" },      // Blue
    { color: new Color3(0.4, 0.8, 0.4), name: "Key Partners" },           // Green  
    { color: new Color3(0.9, 0.9, 0.3), name: "Key Activities" },         // Yellow
    { color: new Color3(0.9, 0.3, 0.3), name: "Key Resources" },          // Red
    { color: new Color3(0.8, 0.4, 0.9), name: "Customer Relationships" }, // Purple
    { color: new Color3(0.6, 0.9, 0.9), name: "CustomerChannels" },       // Cyan
    { color: new Color3(0.9, 0.6, 0.3), name: "Customer Segments" },      // Orange
  ],
  {
    revenueStreamsEnabled: true,
    costStructureEnabled: true,
    showGroundPlane: true,
    showBorderGeometry: true,
  }
);