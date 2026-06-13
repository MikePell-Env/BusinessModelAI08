/**
 * Phase 3 Visual Quality Effects
 *
 * Adds two non-destructive post-processing layers to the existing scene:
 *   1. GlowLayer  — soft emissive glow on bright surfaces
 *   2. DefaultRenderingPipeline — subtle bloom + FXAA anti-aliasing
 *
 * Fully disposable: call dispose() to remove every effect cleanly.
 * No geometry, no materials, no mesh changes — pure visual overlay.
 */

import { Scene, Camera, GlowLayer, DefaultRenderingPipeline } from '@babylonjs/core';

export class Phase3VisualEffects {
  private glowLayer: GlowLayer | null = null;
  private pipeline: DefaultRenderingPipeline | null = null;

  constructor(scene: Scene, camera: Camera) {
    try {
      // ── 1. Glow Layer ──────────────────────────────────────────────────────
      // Adds a soft halo to any mesh that has emissive colour/texture.
      // mainTextureFixedSize keeps the glow buffer small for performance.
      this.glowLayer = new GlowLayer('phase3Glow', scene, {
        mainTextureFixedSize: 512,
        blurKernelSize: 32,
      });
      this.glowLayer.intensity = 0.35;

      // ── 2. Rendering Pipeline (bloom + FXAA) ──────────────────────────────
      // hdr: false — keep LDR pipeline so existing StandardMaterial colours
      //              are unaffected; we only want bloom + anti-aliasing.
      this.pipeline = new DefaultRenderingPipeline('phase3Pipeline', false, scene, [camera]);

      // FXAA — smooth jagged edges without MSAA overhead
      this.pipeline.fxaaEnabled = true;

      // Bloom — only extremely bright pixels bloom (threshold 0.85 means
      // the grey background at ~0.91 brightness does NOT bloom noticeably,
      // but emissive-lit object tops do get a gentle halo).
      this.pipeline.bloomEnabled = true;
      this.pipeline.bloomWeight = 0.22;
      this.pipeline.bloomThreshold = 0.85;
      this.pipeline.bloomScale = 0.5;
      this.pipeline.bloomKernel = 32;

      // Keep built-in image processing off — it would shift colours/contrast.
      this.pipeline.imageProcessingEnabled = false;

    } catch (err) {
      // Never crash the app over a visual enhancement
      console.warn('[Phase3] Failed to initialise visual effects:', err);
      this.dispose();
    }
  }

  public dispose(): void {
    try {
      this.glowLayer?.dispose();
      this.pipeline?.dispose();
    } catch (err) {
      console.warn('[Phase3] Error during dispose:', err);
    }
    this.glowLayer = null;
    this.pipeline = null;
  }
}
