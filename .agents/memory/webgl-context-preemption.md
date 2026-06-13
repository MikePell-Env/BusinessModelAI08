---
name: WebGL context pre-emption
description: Raw canvas.getContext('webgl2') call before Babylon.js init breaks post-processing pipelines
---

# WebGL context pre-emption bug

## The rule
Never call `canvas.getContext('webgl2'|'webgl', options)` for capability checking before Babylon.js initialises on that canvas.

## Why
The browser locks a canvas to the WebGL context attributes set on the FIRST `getContext` call. Any subsequent call returns the same context, ignoring new options. The old "WebGL support check" in `Canvas3DBabylon.tsx` used `{ alpha: false }`, which locked the backbuffer to no-alpha. `DefaultRenderingPipeline` (and other Babylon post-processing) needs alpha in its render targets — without it, the pipeline outputs a solid black screen.

## How to apply
Check WebGL availability via `window.WebGLRenderingContext` (object existence) — this does NOT create a context. Let Babylon.js call `getContext` itself with its own preferred attributes. Fixed in `Canvas3DBabylon.tsx` around line 699.
