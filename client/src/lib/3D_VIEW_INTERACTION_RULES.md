# 3D View Interaction Rules (Updated January 2025)

## Default State (No Selection)
1. All BMC objects are at full height
2. All BMC objects show their original colors
3. All objects are 100% opaque

## Hover Behavior
When hovering over an object:
- **Main BMC sections**: Turn toned blue (0.0, 0.3, 0.7) - not too bright, shows good shading
- **Cost Structure & Revenue Streams**: Get brighter shades of their original colors (never blue)
- **Height**: Stays at current height (NEVER changes on hover)
- **Opacity**: 100% opaque
- **Emissive**: Reset to (0.0, 0.0, 0.0) for clean appearance

## Single Click Selection Behavior
When clicking an object (with no prior selection):
- **Selected object**: 
  - Main BMC sections: Turn toned blue (0.0, 0.3, 0.7) with subtle emissive (0.0, 0.05, 0.1)
  - Cost Structure & Revenue Streams: Brighter versions of original colors (never blue)
  - Becomes full height, 100% opaque
- **All other objects**: Flatten to 0.01 height, 30% opacity, turn grey

## Dimmed State (When Another Object is Selected)
- **Main BMC sections**: Keep dimmed original colors (baseColor * 0.5), 30% opacity, flattened
- **Cost Structure & Revenue Streams**: Turn grey (0.25, 0.25, 0.25), 30% opacity, flattened
- **All dimmed objects**: Flattened to 0.01 height

## Background Click Behavior
When clicking background (not on any BMC object):
- Deselect all objects
- All objects return to full height and original colors
- All objects return to 100% opacity

## Double Click Behavior
When double-clicking any BMC object:
- Show the popup panel with that object's bullet point data

## Drag Detection
- Mouse press-and-drag operations (camera rotation) do not trigger selection changes
- 5-pixel movement threshold distinguishes clicks from drags
- Only clean clicks (without movement) trigger selection/deselection

## Important Notes
- **Cost Structure and Revenue Streams NEVER turn blue** - they only get brighter versions of their colors when selected/hovered
- **When flattened, Cost Structure and Revenue Streams turn grey** like other BMC objects
- **Height never changes on hover** - only color changes
- **Drag operations for camera rotation never change selection**
- These rules apply ONLY to 3D View, not 3D Top view
- Color values: Toned blue (0.0, 0.3, 0.7), Grey dimmed (0.25, 0.25, 0.25)