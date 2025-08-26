import { Vector3, Color3 } from '@babylonjs/core';

/**
 * Business Model Canvas Architecture - Complete State Management System
 * 
 * The BMC consists of 9 core components that collectively represent a business model:
 * 1. Key Partners - Strategic alliances and partnerships
 * 2. Key Activities - Critical activities for business operations  
 * 3. Key Resources - Essential assets required for the business
 * 4. Value Proposition - Products/services that create value for customers
 * 5. Customer Relationships - Types of relationships with customer segments
 * 6. Customer Channels - How the company reaches and delivers to customers
 * 7. Customer Segments - Different groups of people/organizations to reach
 * 8. Cost Structure - All costs incurred to operate the business model
 * 9. Revenue Streams - Cash generated from each customer segment
 */

// Core BMC Component Names - these match our GLB model sections
export const BMC_COMPONENTS = [
  'KeyPartners',
  'KeyActivities', 
  'KeyResources',
  'ValueProposition',
  'CustomerRelationships',
  'CustomerChannels',
  'CustomerSegments',
  'CostStructure',
  'RevenueStreams'
] as const;

export type BMCComponentName = typeof BMC_COMPONENTS[number];

// Object types in our 3D system
export type BMCObjectType = 'main_bmc' | 'separate_glb';

// View modes supported by the application
export type ViewMode = 'view2D' | 'view3DPerspective';

/**
 * Visual state for each BMC object - controls appearance and interaction
 */
export interface BMCVisualState {
  isSelected: boolean;
  isHovered: boolean;
  opacity: number;
  baseColor: Color3;
  hoverColor: Color3;
  selectedColor: Color3;
  emissiveColor: Color3;
}

/**
 * Transform state for each BMC object - controls position, scale, rotation
 */
export interface BMCTransformState {
  position: Vector3;
  scaling: Vector3;
  rotation: Vector3;
  originalHeight: number;
  currentHeight: number;
  originalScaling: Vector3;
}

/**
 * UI state for each BMC object - controls panels, labels, interactions
 */
export interface BMCUIState {
  contentPanelVisible: boolean;
  labelVisible: boolean;
  isInteractable: boolean;
}

/**
 * Camera state for 3D views
 */
export interface BMCCameraState {
  alpha: number;
  beta: number;
  radius: number;
  target: Vector3;
  position?: Vector3; // For free camera modes
}

/**
 * Complete state for a single BMC object/component
 */
export interface BMCObjectState {
  sectionName: BMCComponentName;
  objectType: BMCObjectType;
  
  visual: BMCVisualState;
  transform: BMCTransformState;
  ui: BMCUIState;
  
  // Metadata
  lastUpdated: number;
  isDirty: boolean; // Needs visual update
}

/**
 * State for an entire view (2D, 3D Perspective, 3D Orthographic)
 */
export interface BMCViewState {
  viewMode: ViewMode;
  selectedObject: BMCComponentName | null;
  cameraState: BMCCameraState | null;
  objectStates: Map<BMCComponentName, BMCObjectState>;
  
  // View-specific settings
  viewSettings: {
    showLabels: boolean;
    showContentPanels: boolean;
    enableInteractions: boolean;
  };
  
  lastSaved: number;
}

/**
 * Complete BMC State Manager - handles all state preservation and coordination
 */
export interface BMCStateManager {
  // Current state
  currentView: ViewMode;
  activeSelection: BMCComponentName | null;
  
  // View-specific states
  viewStates: Map<ViewMode, BMCViewState>;
  
  // Global settings that persist across views
  globalSettings: {
    transitionDuration: number;
    preserveSelectionOnViewChange: boolean;
    autoSaveInterval: number;
  };
}

/**
 * State update operations - defines all possible state changes
 */
export interface BMCStateOperations {
  // View management
  switchView(newView: ViewMode): void;
  saveCurrentViewState(): void;
  restoreViewState(view: ViewMode): void;
  
  // Object selection
  selectObject(sectionName: BMCComponentName | null): void;
  getSelectedObject(): BMCComponentName | null;
  clearSelection(): void;
  
  // Visual state updates
  updateVisualState(sectionName: BMCComponentName, updates: Partial<BMCVisualState>): void;
  updateTransformState(sectionName: BMCComponentName, updates: Partial<BMCTransformState>): void;
  updateUIState(sectionName: BMCComponentName, updates: Partial<BMCUIState>): void;
  
  // Bulk operations
  resetAllObjects(): void;
  setAllOpacity(opacity: number, except?: BMCComponentName): void;
  restoreAllOriginalHeights(): void;
  
  // State queries
  getObjectState(sectionName: BMCComponentName): BMCObjectState | null;
  getAllObjectStates(): Map<BMCComponentName, BMCObjectState>;
  isObjectSelected(sectionName: BMCComponentName): boolean;
  
  // Camera management
  saveCameraState(state: BMCCameraState): void;
  getCameraState(): BMCCameraState | null;
}

/**
 * Default states for initialization
 */
export const DEFAULT_VISUAL_STATE: BMCVisualState = {
  isSelected: false,
  isHovered: false,
  opacity: 1.0,
  baseColor: new Color3(0.07, 0.07, 0.07), // Medium dark grey
  hoverColor: new Color3(0.0, 0.3, 0.8),   // Bright blue
  selectedColor: new Color3(0.0, 0.3, 0.8), // Bright blue
  emissiveColor: new Color3(0, 0, 0)
};

export const DEFAULT_TRANSFORM_STATE: BMCTransformState = {
  position: Vector3.Zero(),
  scaling: Vector3.One(),
  rotation: Vector3.Zero(),
  originalHeight: 1.0,
  currentHeight: 1.0,
  originalScaling: Vector3.One()
};

export const DEFAULT_UI_STATE: BMCUIState = {
  contentPanelVisible: false,
  labelVisible: true,
  isInteractable: true
};

export const DEFAULT_CAMERA_STATE: BMCCameraState = {
  alpha: Math.PI / 4,
  beta: Math.PI / 3,
  radius: 50,
  target: Vector3.Zero()
};

/**
 * Factory function to create a new BMC object state
 */
export function createBMCObjectState(
  sectionName: BMCComponentName,
  objectType: BMCObjectType,
  overrides?: {
    visual?: Partial<BMCVisualState>;
    transform?: Partial<BMCTransformState>;
    ui?: Partial<BMCUIState>;
  }
): BMCObjectState {
  return {
    sectionName,
    objectType,
    visual: { ...DEFAULT_VISUAL_STATE, ...overrides?.visual },
    transform: { ...DEFAULT_TRANSFORM_STATE, ...overrides?.transform },
    ui: { ...DEFAULT_UI_STATE, ...overrides?.ui },
    lastUpdated: Date.now(),
    isDirty: false
  };
}

/**
 * Factory function to create a new view state
 */
export function createBMCViewState(viewMode: ViewMode): BMCViewState {
  return {
    viewMode,
    selectedObject: null,
    cameraState: { ...DEFAULT_CAMERA_STATE },
    objectStates: new Map(),
    viewSettings: {
      showLabels: true,
      showContentPanels: false,
      enableInteractions: true
    },
    lastSaved: Date.now()
  };
}