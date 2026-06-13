/**
 * Phase 3 Visual Quality Effects
 *
 * Three non-destructive post-processing layers:
 *   1. GlowLayer              — halo on emissive label surfaces
 *   2. DefaultRenderingPipeline — bloom on lit surfaces + FXAA anti-aliasing
 *   3. Sharpening             — crispens edges of 3D blocks (most visible change)
 *
 * Fully disposable: call dispose() to remove every effect cleanly.
 * No geometry, no materials, no mesh changes — pure visual overlay.
 *
 * To disable everything instantly without reverting code:
 *   Set PHASE3_ENABLED = false in Phase3Config.ts
 */

import { Scene, Camera, GlowLayer, DefaultRenderingPipeline } from '@babylonjs/core';

export class Phase3VisualEffects {
  private glowLayer: GlowLayer | null = null;
  private pipeline: DefaultRenderingPipeline | null = null;

  constructor(scene: Scene, camera: Camera) {
    try {
      // ── 1. Glow Layer ──────────────────────────────────────────────────────
      // Labels already have emissiveColor = (0.7, 0.7, 0.7) so they light up.
      // Intensity raised now that 2 redundant scene lights have been removed.
      this.glowLayer = new GlowLayer('phase3Glow', scene, {
        mainTextureFixedSize: 512,
        blurKernelSize: 48,
      });
      this.glowLayer.intensity = 0.6;

      // ── 2. Rendering Pipeline ──────────────────────────────────────────────
      // hdr: false keeps LDR pipeline — StandardMaterial colours unaffected.
      this.pipeline = new DefaultRenderingPipeline('phase3Pipeline', false, scene, [camera]);

      // FXAA — smooth jagged edges without MSAA overhead
      this.pipeline.fxaaEnabled = true;

      // Sharpening — most immediately visible quality improvement.
      // Makes the edges of 3D blocks look crisp rather than soft.
      this.pipeline.sharpenEnabled = true;
      if (this.pipeline.sharpen) {
        this.pipeline.sharpen.edgeAmount = 0.4;  // 0 = off, 1 = very sharp
        this.pipeline.sharpen.colorAmount = 0;   // 0 = only sharpen edges, not colours
      }

      // Bloom — lower threshold so lit coloured surfaces actually bloom.
      // With 3 lights (not 5), surfaces are no longer washed out, so this
      // threshold of 0.45 catches specular highlights without blooming the background.
      this.pipeline.bloomEnabled = true;
      this.pipeline.bloomWeight = 0.3;
      this.pipeline.bloomThreshold = 0.45;
      this.pipeline.bloomScale = 0.5;
      this.pipeline.bloomKernel = 48;

      // Subtle contrast boost via image processing — makes colours pop slightly.
      this.pipeline.imageProcessingEnabled = true;
      this.pipeline.imageProcessing.contrast = 1.08;
      this.pipeline.imageProcessing.exposure = 1.0;   // no brightness change

      console.log('[Phase3] Visual effects active: glow + sharpening + bloom + FXAA');

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
