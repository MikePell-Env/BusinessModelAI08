
# 3D Top View Selection Behavior Rules

## Overview
This document defines the exact behavior for object selection in the 3D Top view mode of the Business Model Canvas visualization.

## Selection Rules

### Rule 1: No Object Selected (Default State)
- **Visual State**: All objects are flattened to original height, 100% opaque, original material colors
- **Height**: `item.originalHeight` (flattened in top view)
- **Opacity**: `1.0` (100% opaque)
- **Colors**: Original section colors (Cost Structure: red, Revenue Streams: green, others: dark grey)

### Rule 2: Object Selection Behavior
- **Single Click on Unselected Object**: 
  - Selected object gets bright blue treatment
  - All other objects remain visible, flattened, original colors, 100% opaque
  - No dimming or transparency changes
- **Single Click on Already Selected Object**: 
  - Deselects the object
  - Returns to Rule 1 state (all objects normal)

### Rule 3: Selected Object Visual State
- **Color**: Bright blue (`Color3(0.0, 0.3, 0.8)`)
- **Emissive**: Slight blue glow (`Color3(0.0, 0.1, 0.2)`)
- **Height**: `item.originalHeight` (flattened)
- **Opacity**: `1.0` (100% opaque)

### Rule 4: Double-Click Behavior
- **Double-Click on Selected Object**: Shows popup content panel
- **Double-Click on Unselected Object**: Selects object first, then shows popup panel

### Rule 5: Background Click Behavior
- **Click on Empty Space**: Deselects all objects, returns to Rule 1 state

## Key Differences from 3D View
- **No Height Animation**: Objects remain at original height in top view
- **No Dimming**: Non-selected objects maintain 100% opacity and original colors
- **No Transparency**: All objects always remain fully opaque
- **Flattened Appearance**: All objects use `originalHeight` which appears flattened in top view

## Implementation Methods

### State Application Methods
- `apply3DTopNormalState()`: Rule 1 - Default state
- `apply3DTopSelectedState()`: Rule 3 - Selected object appearance  
- `apply3DTopNonSelectedState()`: Rule 2 - Non-selected objects when something is selected

### Selection Logic
- `onSelect()`: Handles toggle behavior (select/deselect)
- `clearSelection()`: Resets to Rule 1 state
- `updateAllVisuals()`: Applies appropriate state based on current selection and view mode

## Color Standards
- **Default Grey**: `Color3(0.07, 0.07, 0.07)`
- **Cost Structure Red**: `Color3(0.35, 0.0, 0.0)`
- **Revenue Streams Green**: `Color3(0.0, 0.20, 0.12)`
- **Selection Blue**: `Color3(0.0, 0.3, 0.8)`
- **Selection Emissive**: `Color3(0.0, 0.1, 0.2)`

## Code Files
- **Selection Logic**: `client/src/lib/cleanBMCSystem.ts`
- **Click Handling**: `client/src/components/Canvas3DBabylon/interactions/InteractionHandler.ts`
- **Main Canvas**: `client/src/components/Canvas3DBabylon.tsx`
