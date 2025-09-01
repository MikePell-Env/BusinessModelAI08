# Financials Template Coordinate System Documentation

## Overview
This document provides comprehensive documentation of the Financials template 3D coordinate system, including critical positioning requirements, master transform hierarchy, and verified coordinate ranges for object placement.

## Master Transform Hierarchy

### Critical Requirement: Master Transform Parenting
All objects in the Financials template MUST be parented to the master transform to appear in the correct coordinate space.

```typescript
// REQUIRED: Parent all objects to master transform
const persistence = EnvisionerPersistence.getInstance();
const masterTransform = persistence.getMasterTransform();
object.parent = masterTransform;
```

### Master Transform Properties
- **World Position**: Y = 2 (fixed vertical offset)
- **Template Rotation**: 180° Y-axis rotation for camera facing
- **Coordinate System**: Relative positioning within master transform space

## Verified Coordinate Ranges

### Ground Plane Reference System
The ground plane provides the baseline coordinate reference:
- **Ground Level**: Y = 0 (relative to master transform)
- **Standard Object Base**: Y = 0.1 (financial objects baseline)
- **Visibility Range**: Y = 0.1 to 0.5 (confirmed visible above ground)

### Spatial Positioning (Verified with Test Cube)

#### X-Axis Positioning
- **Center**: X = 0
- **Right Side**: X = 2 (confirmed visible placement)
- **Left Side**: X = -2 (mirrored positioning)

#### Y-Axis Positioning  
- **Ground Plane**: Y = 0
- **Object Base**: Y = 0.1 (standard financial object height)
- **Above Ground**: Y = 0.35 (confirmed visible - 0.1 base + 0.25 object height)
- **Maximum Safe**: Y = 0.5 (upper limit for ground plane visibility)

#### Z-Axis Positioning
- **Front Area**: Z = -6 (confirmed visible in camera view)
- **Center**: Z = 0 
- **Back Area**: Z = 6
- **Camera View Range**: Z = -8 to -4 (optimal visibility zone)

## Financial Objects Layout

### Revenue Group (Green/Gold)
- **Revenue**: Left-front position, bottom-anchored
- **RevenuePL**: Left-back position, top-anchored

### Expenses Group (Red/Black)  
- **Expenses**: Right-front position, bottom-anchored
- **ExpensesPL**: Right-back position, top-anchored

### Ground Plane Labels
- **"Revenue"**: Visible on left side of ground plane
- **"Expenses"**: Visible on right side of ground plane

## EnvisionerPersistence Integration

### Ground Plane Reference Access
```typescript
const persistence = EnvisionerPersistence.getInstance();
const groundRef = persistence.getGroundPlaneReference();

if (groundRef) {
  // Access ground plane bounds
  const bounds = groundRef.bounds;
  // bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ, bounds.centerY
}
```

### Object Positioning Best Practices
```typescript
// Create object
const object = MeshBuilder.CreateBox("ObjectName", {...}, scene);

// CRITICAL: Parent to master transform
object.parent = masterTransform;

// Position using verified coordinate ranges
object.position.x = 2;    // Right side placement
object.position.y = 0.35; // Above ground plane
object.position.z = -6;   // Front area visibility
```

## Coordinate System Validation

### Test Cube Verification Results
A bright green test cube was successfully positioned using the coordinate system:
- **Position**: (X=2, Y=0.35, Z=-6)
- **Result**: Visible on ground plane in front area
- **Validation**: Confirms master transform parenting and coordinate ranges

### Visual Confirmation
The test cube appeared correctly positioned:
- On the ground plane surface (not underground)
- In the front portion between financial objects and camera
- At the expected right-side offset from center
- Above ground plane with proper visibility

## Critical Implementation Notes

### Object Creation Requirements
1. **Master Transform Parenting**: Essential for correct positioning
2. **Coordinate Ranges**: Use verified X/Y/Z ranges for visibility
3. **Ground Plane Reference**: Available through EnvisionerPersistence
4. **Camera Visibility**: Z range -8 to -4 optimal for front view

### Common Positioning Issues
- **Underground Objects**: Missing master transform parenting
- **Invisible Objects**: Z positioning outside camera view range
- **Floating Objects**: Y positioning above visible range
- **Off-Screen Objects**: X positioning outside ground plane bounds

### Debug Positioning Strategy
1. Create test object with bright color
2. Parent to master transform
3. Start with verified coordinates (2, 0.35, -6)
4. Adjust incrementally from working position
5. Verify visibility before applying to production objects

## Template-Specific Behaviors

### Vertex Manipulation System
- **Bottom-Anchored**: Objects grow upward from Y base position
- **Top-Anchored**: Objects grow downward from Y top position
- **Position Stability**: Object positions remain fixed during height changes

### Label Positioning Solution
Based on coordinate system validation, labels should be positioned:
- **Y Position**: 0.15-0.2 (slightly above object base)
- **Parenting**: Master transform (critical for visibility)
- **Z Position**: Front of object for camera visibility

## Last Updated
January 2, 2025 - Initial documentation based on test cube verification and coordinate system analysis