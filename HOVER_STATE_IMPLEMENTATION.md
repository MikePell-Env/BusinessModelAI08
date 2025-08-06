# Hover State Implementation Guide

## Overview
This document details the implementation of hover states for BMC objects, specifically for Revenue Streams and Cost Structure sections added in January 2025.

## Critical Implementation Pattern

### 1. Object Registration with contentPanelsRef
All interactive BMC objects MUST be added to `contentPanelsRef` for coordinated hover behavior:

```typescript
// Create content panel for consistency (even if unused)
const contentPanel = new Rectangle(`${sectionName}ContentPanel`);
contentPanel.isVisible = false;
advancedTexture.addControl(contentPanel);

// Add to contentPanelsRef for coordinated hover behavior
contentPanelsRef.current.push({ 
  panel: contentPanel, 
  mesh: mesh as any, 
  material: sectionMaterial 
});
```

### 2. Required Object Properties
Each interactive mesh must have these properties for hover states to work:

```typescript
(mesh as any).bmcSectionName = "Section Name";
(mesh as any).originalColor = baseColor.clone(); // CRITICAL: Store original color
(mesh as any).isClicked = false;                 // Track click state
(mesh as any).hasTexture = false;               // For material handling
```

### 3. ActionManager Setup
Create ActionManager and enable interactions:

```typescript
if (!mesh.actionManager) {
  mesh.actionManager = new ActionManager(scene);
  mesh.isPickable = true;
}
```

### 4. Hover Enter Implementation
Standard hover enter behavior:

```typescript
mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
  console.log(`🎯 HOVER DETECTED on ${sectionName}`);
  const isAnyObjectClicked = contentPanelsRef.current.some(({ mesh: otherMesh }) => (otherMesh as any).isClicked);
  
  if (!(mesh as any).isClicked && !isAnyObjectClicked) {
    // Apply bright blue hover color (STANDARD COLOR)
    const brightBlueColor = new Color3(0.0, 0.3, 0.8);
    sectionMaterial.diffuseColor = brightBlueColor;
    
    // Set all other objects to 50% opacity
    contentPanelsRef.current.forEach(({ material }) => {
      material.alpha = 0.5;
    });
    // Keep this object at full opacity
    sectionMaterial.alpha = 1.0;
    
    console.log(`💡 Hover enter: ${sectionName} bright blue, all objects 50% opacity`);
  } else {
    console.log(`🚫 Hover enter: ${sectionName} blocked - object selected or clicked`);
  }
}));
```

### 5. Hover Exit Implementation
Standard hover exit behavior:

```typescript
mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
  console.log(`🎯 HOVER EXIT DETECTED on ${sectionName}`);
  const isAnyObjectClicked = contentPanelsRef.current.some(({ mesh: otherMesh }) => (otherMesh as any).isClicked);
  
  if (!(mesh as any).isClicked && !isAnyObjectClicked) {
    // Restore original color (CRITICAL: Use stored originalColor)
    sectionMaterial.diffuseColor = (mesh as any).originalColor;
    
    // Restore all objects to full opacity
    contentPanelsRef.current.forEach(({ material }) => {
      material.alpha = 1.0;
    });
    
    console.log(`🔄 Hover exit: ${sectionName} restored, all objects full opacity`);
  } else {
    console.log(`🚫 Hover exit: ${sectionName} blocked - maintaining visual state`);
  }
}));
```

## Critical Mistakes to Avoid

### ❌ WRONG - Using Non-Existent APIs
```typescript
// NEVER USE THESE - THEY DON'T EXIST
Rectangle.CreateFullscreenUI("panel");  // ❌ No such method
material.baseColor = color;             // ❌ StandardMaterial doesn't have baseColor
```

### ✅ CORRECT - Using Proper APIs
```typescript
// Use the correct Rectangle constructor
const panel = new Rectangle("panelName");
panel.isVisible = false;
advancedTexture.addControl(panel);

// Use diffuseColor for StandardMaterial
sectionMaterial.diffuseColor = brightBlueColor;
```

### ❌ WRONG - Missing contentPanelsRef Registration
```typescript
// This will break coordinated hover behavior
// Objects won't dim properly when others are hovered
```

### ✅ CORRECT - Proper Registration
```typescript
contentPanelsRef.current.push({ 
  panel: contentPanel, 
  mesh: mesh as any, 
  material: sectionMaterial 
});
```

## Testing Checklist

When implementing hover states:

1. ✅ All objects turn bright blue (#0066CC) when hovered
2. ✅ All other objects dim to 50% opacity during hover
3. ✅ Objects restore to original color when hover exits
4. ✅ All objects restore to 100% opacity when hover exits
5. ✅ Labels remain visible and positioned correctly
6. ✅ No LSP/TypeScript errors
7. ✅ 3D view loads without runtime errors

## Color Standards

- **Base Color**: Color3(0.07, 0.07, 0.07) - Medium dark grey
- **Hover Color**: Color3(0.0, 0.3, 0.8) - Bright blue
- **Hover Opacity**: 1.0 (hovered object), 0.5 (other objects)
- **Normal Opacity**: 1.0 (all objects)

## Debugging Tips

1. Check console logs for hover detection messages
2. Verify contentPanelsRef.current contains all objects
3. Ensure originalColor is properly stored on each mesh
4. Check that ActionManager is created and isPickable is true
5. Verify no TypeScript errors in browser console

## Last Updated
January 2025 - Successfully implemented for Revenue Streams and Cost Structure objects