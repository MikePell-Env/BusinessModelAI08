# Canvas3DBabylon Architecture Documentation

## Overview
The Canvas3DBabylon system is a sophisticated 3D visualization framework for Business Model Canvas (BMC) data, built on Babylon.js. It supports multiple view modes (2D, 3D Perspective, 3D Top), interactive elements, and dynamic content panels.

## Core Architecture

### Module Structure
```
Canvas3DBabylon.tsx (Main Orchestrator)
├── scene/SceneSetup.ts         - Scene, lighting, and engine lifecycle
├── models/BMCModelLoader.ts    - GLB model loading for all components
├── interactions/InteractionHandler.ts - Unified interaction management
├── ui/PanelManager.tsx         - Content panel UI management
└── lib/cleanBMCSystem.ts       - State management and visual states
```

## Coordinate System & Positioning

### Coordinate System Documentation
The system uses a **right-handed coordinate system** with specific workarounds for GLB model alignment:

- **X-axis**: Left/Right (negative X = left, positive X = right)
- **Z-axis**: Forward/Back (negative Z = back/bottom, positive Z = forward/top)
- **Y-axis**: Height above ground plane (Y=0.1 is standard base height)

### Object Types & Their Coordinate Handling

#### 1. Main BMC Model
- **Type**: Single GLB file containing 7 sections
- **Sections**: Key Partners, Key Activities, Key Resources, Value Propositions, Customer Relationships, Customer Channels, Customer Segments
- **Coordinate Handling**: Uses `transformNode` for scaling (not direct mesh scaling)
- **Position**: Fixed at origin, individual sections cannot be repositioned
- **Oddity**: Sections are part of a single mesh, so they scale together via transformNode

#### 2. Revenue Streams (Separate GLB)
- **Position**: `(-0.221, 0.1, -10.5)` - precisely aligned with Customer Channels left edge
- **Scaling**: Direct mesh scaling `(7.7, 8, 8)`
- **Coordinate Oddity**: X position seems inverted - negative X value places it on the right side visually
- **Alignment Strategy**: Calculated based on Customer Channels bounding box measurements

#### 3. Cost Structure (Separate GLB)
- **Position**: `(-10.1, 0.1, -10.5)` - positioned farther left
- **Scaling**: Direct mesh scaling `(8.0, 8, 8)`
- **Coordinate Oddity**: Same X-axis inversion as Revenue Streams

### Coordinate System Workarounds

#### 1. X-Axis Inversion
The GLB models appear to have their X-axis inverted compared to the Babylon.js world space:
- Negative X values position objects to the right (opposite of expected)
- This affects Revenue Streams and Cost Structure positioning
- Main BMC model seems unaffected as it's positioned at origin

#### 2. Alignment Calculations
```javascript
// Customer Channels reference point
Customer Channels left edge: X ≈ 0.467

// Revenue Streams alignment
Revenue Streams X = -0.221  // Aligns with Customer Channels left edge

// Cost Structure positioning
Cost Structure X = -10.1    // Spans from Key Partners to Key Resources
```

#### 3. Label Positioning
Labels use different coordinate spaces:
- **Floating labels**: Position relative to mesh bounds, then rotated
- **Ground labels**: Direct world positioning with Y=0.001 (just above ground)
- **Billboard labels**: Screen-space positioning linked to 3D mesh positions

## Material System

### Material Types
1. **StandardMaterial** - Used for all BMC sections
   - Diffuse color: Section-specific colors
   - Specular: `Color3(0.2, 0.2, 0.2)` with power 64
   - Ambient: Base color scaled by 0.4 for depth

2. **Label Materials**
   - PNG textures with alpha transparency
   - Emissive texture for visibility
   - `disableLighting: false` for proper depth testing

### Color Scheme
```javascript
// Main BMC Sections (color-coded)
Key Partners:           Color3(0.9, 0.6, 0.3)  // Orange
Key Activities:         Color3(0.8, 0.8, 0.3)  // Yellow
Key Resources:          Color3(0.8, 0.5, 0.8)  // Purple
Value Propositions:     Color3(0.3, 0.8, 0.3)  // Green
Customer Relationships: Color3(0.3, 0.5, 0.9)  // Blue
Customer Channels:      Color3(0.6, 0.9, 0.9)  // Cyan
Customer Segments:      Color3(0.9, 0.6, 0.3)  // Orange

// Additional Sections
Revenue Streams:        Color3(0.0, 0.20, 0.12) // Dark British Racing Green
Cost Structure:         Color3(0.35, 0.0, 0.0)  // Deep Red
```

## Lighting System

### Three-Light Setup
1. **Hemispheric Light**
   - Intensity: 1.3
   - Diffuse: `Color3(0.95, 0.95, 0.95)`
   - Ground color: `Color3(0.4, 0.4, 0.45)`

2. **Main Directional Light**
   - Direction: `Vector3(-1, -1, -1)`
   - Intensity: 1.9
   - Specular: `Color3(0.4, 0.4, 0.4)`

3. **Rim Light** (subtle edge definition)
   - Direction: `Vector3(1, 0.5, 1)`
   - Intensity: 0.5
   - Diffuse: `Color3(0.8, 0.8, 0.9)`

## Interaction System

### Double-Click Detection
- **Method**: Manual timing-based detection
- **Threshold**: 300ms between clicks
- **Range**: 50ms minimum (to avoid accidental triggers)
- **Handler**: Centralized in InteractionHandler module

### State Management (CleanBMCSystem)
- **Selection**: Single object selection with visual feedback
- **Hover**: Temporary highlight without selection
- **Visual States**:
  - Normal: Base material colors
  - Hover: 20% brightness increase
  - Selected: 40% brightness increase + height boost

### Content Panels
- **Billboard Panels**: Follow 3D objects in screen space
- **Positioning**: Calculated from mesh world position
- **Cleanup**: Automatic removal on background click or new selection

## Camera System

### Two Camera Modes
1. **Perspective Camera** (3D View)
   - Type: ArcRotateCamera
   - Alpha: -Math.PI / 2
   - Beta: Math.PI / 3
   - Radius: 25

2. **Pseudo-Orthographic Camera** (3D Top View)
   - Type: FreeCamera with narrow FOV to minimize perspective distortion
   - Position: `Vector3(0, 200, 0)` - High above scene looking straight down
   - Target: `Vector3(0, 0, 0)` - Looking directly at scene center
   - FOV: `0.2` - Narrow field of view for pseudo-orthographic effect
   - State persistence between view switches

### Scene Transform Configuration (3D Top View Optimized)
- **Master Transform Node**: Root transform affecting all geometry
  - Y Rotation: `Math.PI` (180° to match reference layout)
  - X Rotation: `0°` (perfectly flat, no forward/backward tilt)
  - Position Y: `2` (lifted to center scene in window)
- **Result**: Flat top-down view with Cost Structure (red) bottom-left, Revenue Streams (green) bottom-right

## Known Issues & Workarounds

### 1. Coordinate System Inversion
- **Issue**: X-axis appears inverted for separate GLB models
- **Workaround**: Use negative X values for right-side positioning
- **Affected**: Revenue Streams, Cost Structure positioning

### 2. TransformNode vs Direct Scaling
- **Issue**: Main BMC uses transformNode, separate GLBs use direct mesh scaling
- **Workaround**: Unified transformation system checks object type before applying scaling

### 3. Label Depth Fighting
- **Issue**: Labels could render on top of 3D objects
- **Solution**: Removed emissive properties that bypass depth testing

### 4. Height Manipulation
- **Issue**: Different scaling methods for different object types
- **Solution**: Unified system checks objectType and applies appropriate scaling method

## Performance Optimizations

1. **Material Caching**: Materials created once and reused
2. **Texture Management**: Single texture load with caching
3. **Render Loop**: Optimized with adaptive quality settings
4. **Module Lazy Loading**: Components loaded only when needed

## File Size Impact
- Original: ~3,300 lines in single file
- Current: ~2,900 lines with 400+ lines moved to modules
- Modules: ~500 lines across 4 separate files
- Net improvement: Better organization with minimal overhead