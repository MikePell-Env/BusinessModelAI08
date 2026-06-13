---
name: Babylon.js v9 upgrade
description: Results of upgrading from @babylonjs 8.x to 9.12.0 — what broke, what didn't
---

# Babylon.js 8 → 9 Upgrade

## The rule
When upgrading @babylonjs/* packages from 8.x to 9.x, install all three together at the same version: `@babylonjs/core`, `@babylonjs/gui`, `@babylonjs/loaders`. They must stay in sync.

## What broke (none in this project)
- Zero new TypeScript errors from the v9 upgrade
- All existing APIs (Engine, Scene, StandardMaterial, ArcRotateCamera, DynamicTexture, AdvancedDynamicTexture, GlowLayer, ActionManager, SceneLoader.ImportMeshAsync, Animations) work unchanged
- Pre-existing TS errors in 4DVL/ and core/templates/ files are a filename issue (digit-prefixed files), unrelated to Babylon version

## Breaking changes that exist in v9 (but didn't affect this project)
- CSG → CSG2 (not used)
- SceneLoader sync return values removed (project already uses ImportMeshAsync)
- Mesh instances now inherit parent from glTF source (no instances used)
- PBR subsurface rendering changed (escape hatch: `mat.subSurface.legacyTranslucency = true`)
- Scalar class → tree-shakeable functions (project didn't use Scalar statics)

## DefaultRenderingPipeline — permanently banned
`DefaultRenderingPipeline` causes a solid black screen in this scene regardless of settings.
Root causes identified:
1. Old code called `canvas.getContext('webgl2', {alpha:false})` BEFORE Babylon init, locking the backbuffer to alpha=false
2. DefaultRenderingPipeline needs alpha in its render targets — fails to black with alpha=false
The raw WebGL check was removed (now uses `window.WebGLRenderingContext` existence check instead).
Even after fixing the context issue, DefaultRenderingPipeline still should not be used — GlowLayer alone is the safe post-processing choice.

## GlowLayer — safe and working
`GlowLayer` (additive blend only) works in Babylon v9 without causing black screen.
Phase3VisualEffects.ts uses GlowLayer with intensity=0.5, mainTextureFixedSize=512, blurKernelSize=32.
PHASE3_ENABLED = true (enabled).
