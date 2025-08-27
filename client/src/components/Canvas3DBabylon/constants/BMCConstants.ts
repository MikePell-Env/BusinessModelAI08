import { Vector3, Color3 } from '@babylonjs/core';

/**
 * Business Model Canvas 3D Constants
 * 
 * All hardcoded values used in the 3D BMC visualization
 * Extracted for better maintainability and consistency
 */

// Model Positions
export const MODEL_POSITIONS = {
  REVENUE_STREAMS: new Vector3(-0.221, 0.1, -10.5),
  COST_STRUCTURE: new Vector3(-10.1, 0.1, -10.5),
  BMC_ORIGIN: new Vector3(0, 0, 0),
} as const;

// Camera Positions and Settings
export const CAMERA_SETTINGS = {
  TOP_VIEW_POSITION: new Vector3(0, 200, 0),
  PERSPECTIVE_TARGET: new Vector3(0, 0, 0),
  TOP_VIEW_FOV: 0.2,
  PERSPECTIVE_RADIUS: 40,
  PERSPECTIVE_ALPHA: -Math.PI / 2,
  PERSPECTIVE_BETA: Math.PI / 4,
} as const;

// Camera Presets for 3D View
// These presets provide optimal viewing angles for business model canvas analysis
export const CAMERA_PRESETS = {
  // Default auto-switch target - elevated perspective showing canvas depth and structure
  PERSPECTIVE_RIGHT: {
    alpha: Math.PI/2 + Math.PI/12,  // 105° horizontal rotation (right-side view)
    beta: Math.PI/4.5,  // 40° tilt angle - elevated perspective looking down at canvas
    radius: 60  // Distance from center - pulled back for comprehensive overview
  },
  // Alternative left-side perspective with additional tilt
  PERSPECTIVE_LEFT: {
    alpha: (Math.PI/2 + Math.PI/12) - (Math.PI/6), // 75° horizontal (30° clockwise from right)
    beta: Math.PI/6 + (Math.PI/9), // 50° tilt (20° additional tilt for dynamic angle)
    radius: 55  // Closer zoom for detailed section analysis
  },
  // Initial view on 3D load - flat overview before auto-switch
  TOP: {
    alpha: Math.PI/2, // 90° rotation for proper BMC orientation alignment
    beta: 0.01, // Near-flat top-down view (minimal tilt maintains perspective camera)
    radius: 55 // Moderate zoom for complete canvas visibility
  },
  // Front view for Financials template - starts from TOP then rotates 90° around X axis
  FRONT: {
    alpha: Math.PI/2, // Same horizontal rotation as TOP
    beta: Math.PI/2, // 90° rotation around X axis from TOP (straight-on front view)
    radius: 55 // Same distance as TOP for consistency
    // REMOVED: custom target - now uses scene center (0,0,0) for steady ground plane
  }
} as const;

// Material Colors
export const MATERIAL_COLORS = {
  // BMC Section Colors
  BRITISH_RACING_GREEN: new Color3(0.0, 0.20, 0.12),
  DEEP_RED: new Color3(0.35, 0.0, 0.0),
  BRIGHT_WHITE: new Color3(1.0, 1.0, 1.0),
  
  // Ground and Rails
  GROUND_SPECULAR: new Color3(0.1, 0.1, 0.2),
  RAIL_COLOR: new Color3(0.3, 0.3, 0.3),
  RAIL_SPECULAR: new Color3(0, 0, 0),
} as const;

// Scene Scale and Transform Settings
export const TRANSFORM_SETTINGS = {
  BMC_SCALE: 8.0,
  MASTER_ROTATION_X: Math.PI / 9, // 20 degrees
  DYNAMIC_SCALE_FACTOR: 8.0,
} as const;

// Ground and Rail Dimensions
export const SCENE_DIMENSIONS = {
  RAIL_HEIGHT: 0.1,
  RAIL_WIDTH: 0.5,
  GROUND_SIZE: { width: 20, height: 14 },
  NORTH_RAIL_Z: -7,
  SOUTH_RAIL_Z: 7,
  EAST_RAIL_X: 10,
  WEST_RAIL_X: -10,
} as const;

// Standard grid positions (future use)
export const STANDARD_POSITIONS = {
  'KeyPartners': { x: -15, y: 0, z: 10 },
  'KeyActivities': { x: -5, y: 0, z: 10 },
  'ValueProposition': { x: 5, y: 0, z: 10 },
  'CustomerRelationships': { x: 15, y: 0, z: 10 },
  'CustomerSegments': { x: 25, y: 0, z: 10 },
  'KeyResources': { x: -5, y: 0, z: -10 },
  'Channels': { x: 15, y: 0, z: -10 }
} as const;

// Label and Text Settings
export const LABEL_SETTINGS = {
  TEXT_SIZE: 128,
  LABEL_SCALE: 2.0,
  VERTICAL_OFFSET: 0.2,
} as const;