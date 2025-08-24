# 3D View Interaction Rules

## Default State (No Selection)
1. All BMC objects are at full height
2. All BMC objects show their original colors
3. All objects are 100% opaque

## Hover Behavior
2. When hovering over an object:
   - Main BMC sections: Turn bright blue
   - Cost Structure & Revenue Streams: Get brighter shades of their original colors (not blue)
   - Height: Stays at current height (no change)
   - Opacity: 100% opaque

## Single Click Behavior
3. When clicking an object (with no prior selection):
   - Clicked object: Turns bright blue, becomes full height (if flattened), 100% opaque
   - All other objects: Flatten to 0.01 height, 30% opacity
   
4. When clicking background (not on any BMC object):
   - Deselect all objects
   - Animate all objects returning to full height (slow animation)
   - All objects return to 100% opacity

## Double Click Behavior
5. When double-clicking any BMC object:
   - Show the popup panel with that object's bullet point data

## Important Notes
- Cost Structure and Revenue Streams NEVER turn blue - they only get brighter versions of their colors
- Height animations should be smooth and visible
- These rules apply ONLY to 3D View, not 3D Top view