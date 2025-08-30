# BMC Coordinate System & Unified Transformation Documentation

## Overview
This document provides comprehensive documentation of the Business Model Canvas 3D coordinate system, including the complex coordinate reversals and the unified transformation system that manages all BMC objects consistently.

## BMC Coordinate System Mapping

### World Coordinate System (Babylon.js Standard)
- **X-axis**: RIGHT = positive, LEFT = negative 
- **Y-axis**: UP = positive, DOWN = negative
- **Z-axis**: FORWARD = positive, BACKWARD = negative

### BMC Screen Layout Mapping
- **X-axis**: negative = LEFT side of screen, positive = RIGHT side of screen
- **Z-axis**: negative = UPPER part of screen, positive = LOWER part of screen
- **Y-axis**: height above ground plane (Y=0.1 is standard base height)

### Strange Coordinate System Reversals
The BMC system has several coordinate system quirks that must be carefully managed:

1. **3D Top View Rotation**: Main BMC model requires 180° Y-axis rotation in orthographic view
2. **Camera Compensation**: Orthographic camera position adjusted to compensate for model rotation
3. **GLB Model Orientation**: Blender exports have different orientation than expected Babylon.js layout
4. **Label Rotation**: Revenue Streams and Cost Structure labels require 90° counterclockwise rotation

## Object Types in the System

### 1. Main BMC Model
- **Type**: Single GLB file with 7 sections
- **File**: `BMC_blender_09_complete_1753576063858.glb`
- **Position**: (0, 0.1, 0.9)
- **Scaling**: (8, 8, 8)
- **Height Control**: Uses transformNode scaling on Y-axis
- **Sections**: Key Partners, Key Activities, Value Propositions, Customer Relationships, Customer Segments, Key Resources, Customer Channels

### 2. Revenue Streams
- **Type**: Separate GLB positioned below main BMC
- **File**: `BMC_blender_07_RevenueStreams_1754360428541.glb`
- **Position**: (-0.221, 0.1, -10.5)
- **Scaling**: (7.7, 8, 8)
- **Height Control**: Uses direct mesh scaling on Y-axis
- **Alignment**: Left edge aligned with Customer Channels left edge (X ≈ 0.467)

### 3. Cost Structure
- **Type**: Separate GLB positioned in lower left area
- **File**: `BMC_blender_07_RevenueStreams_1754360428541.glb` (same model as Revenue Streams)
- **Position**: (-10.1, 0.1, -10.5)
- **Scaling**: (8.0, 8, 8)
- **Height Control**: Uses direct mesh scaling on Y-axis
- **Alignment**: Spans from Key Partners to Key Resources alignment

## Unified Transformation System

### Class: UnifiedBMCTransformSystem
Provides consistent interface for manipulating all BMC objects regardless of their coordinate system differences.

### Key Features:
1. **Universal Height Control**: Handles different scaling methods for main BMC vs separate GLB objects
2. **Position Management**: Manages repositioning capabilities based on object type
3. **Coordinate System Abstraction**: Hides coordinate system complexities from calling code
4. **Debug Utilities**: Provides debugging tools for coordinate analysis

### Object Registration:
```typescript
// Main BMC sections (registered automatically during mesh processing)
unifiedTransformRef.current.registerObject(sectionName, {
  mesh: mesh,
  sectionName: sectionName,
  objectType: 'main_bmc',
  transformNode: transformNode
});

// Separate GLB objects
unifiedTransformRef.current.registerObject("Revenue Streams", {
  mesh: mesh,
  sectionName: "Revenue Streams",
  objectType: 'separate_glb',
  rootMesh: revenueRootMesh
});
```

### Height Manipulation:
```typescript
// Universal height setting across all object types
unifiedTransformRef.current.setHeight("Revenue Streams", 2.5);
unifiedTransformRef.current.setHeight("Key Partners", 1.8);
```

## Unified Interaction System

### Hover Behavior (Consistent Across All Objects):
- **Hover Enter**: Object turns bright blue (#0066CC), all objects stay 100% opacity
- **Hover Exit**: Object returns to original color, all objects stay 100% opacity
- **Blocked Conditions**: Hover blocked if any object is currently selected

### Selection Behavior (Consistent Across All Objects):
- **First Click**: Object highlighted bright blue, others fade to 50% opacity and flatten
- **Second Click**: Object deselected, all objects return to original colors and heights
- **Cross-Selection**: Selecting different object clears previous selection

### Visual Standards:
- **Base Color**: Color3(0.07, 0.07, 0.07) - Medium dark grey
- **Hover Color**: Color3(0.0, 0.3, 0.8) - Bright blue
- **Selected Opacity**: 100% (selected), 50% (others)
- **Normal Opacity**: 100% (all objects)

## Critical Implementation Notes

### Height Management:
- Main BMC sections: Use `transformNode.scaling.y`
- Separate GLB objects: Use `mesh.scaling.y`
- Height restoration managed by `applyHeightState()` function

### Material Properties:
- Main BMC: PBR materials with baseColor/emissiveColor
- Revenue Streams/Cost Structure: StandardMaterial with diffuseColor

### Label System:
- Main BMC: Integrated label textures on mesh surfaces
- Separate GLBs: Billboard label planes with 90° counterclockwise rotation

## Debugging Tools

### Available Debug Functions:
```typescript
// Export current coordinate state
const state = unifiedTransformRef.current.exportAllTransforms();

// Debug coordinate system mapping
unifiedTransformRef.current.debugCoordinateSystem();

// Get transformation data for specific object
const transform = unifiedTransformRef.current.getTransformData("Revenue Streams");
```

### Console Logging:
All interactions include detailed console logging for debugging:
- Hover enter/exit events
- Selection/deselection events
- Height and opacity changes
- Coordinate transformations

## Future Considerations

### Coordinate System Normalization:
- Consider standardizing all objects to use same coordinate system
- May require rebuilding GLB models with consistent orientation
- Would simplify transformation logic significantly

### Performance Optimization:
- Current system works but has some coordinate conversion overhead
- Unified coordinate system would improve performance
- Consider batching transformation operations

## Financials Template Camera System

### Critical Camera Preset: FRONT View
The Financials template FRONT preset required extensive debugging to achieve the correct viewing angle for Revenue and Expenses objects.

**Final Working Coordinates:**
```typescript
FRONT: {
  alpha: 0.036182071468275234 + Math.PI/2, // ~92.1° - looks down Z-axis
  beta: 0.8696527613715385 + (20 * Math.PI / 180), // ~70° - forward tilt
  radius: 55.068748126797715   // Distance from target
}
```

### Coordinate System Conflicts Resolved
**CRITICAL ISSUE**: Master transform rotations were interfering with camera coordinates.

**Problem Location**: `EnvisionerPersistence.ts` lines 48-54
- Master transform was applying extra X-axis rotations for FRONT preset
- These competing transformations caused incorrect camera positioning

**Solution Applied**: 
- Removed special FRONT preset handling in master transform
- Financials template now uses consistent `rotation.x = 0` for all presets
- Only camera coordinates control view positioning

### Camera Coordinate System Notes
**Spherical to Cartesian Conversion:**
- X = radius * sin(beta) * cos(alpha)
- Y = radius * cos(beta) 
- Z = radius * sin(beta) * sin(alpha)

**FRONT View Requirements:**
1. **Alpha adjustment**: Add 90° to look down Z-axis instead of X-axis
2. **Beta adjustment**: Add 20° for proper forward tilt angle
3. **No master transform interference**: Template-specific rotations must not compete

### Debugging Process Documentation
1. **Add debug logging** to capture real camera coordinates during transitions
2. **Check for master transform conflicts** in EnvisionerPersistence system
3. **Verify coordinate system alignment** between camera and scene objects
4. **Test axis orientation** - ensure looking down correct axis (Z vs X)

### Template-Specific Camera Behavior
- **Business Model**: Auto-animation enabled (TOP → PERSPECTIVE_RIGHT)
- **Financials**: Manual camera control, no auto-animation interference
- **Rotation Persistence**: Position/scale preserved, rotation template-specific

## Last Updated
August 30, 2025 - Added comprehensive Financials camera system documentation and coordinate system conflict resolution