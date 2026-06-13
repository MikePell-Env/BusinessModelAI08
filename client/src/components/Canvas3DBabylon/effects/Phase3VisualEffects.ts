/**
 * Phase 3 Visual Quality Effects
 *
 * Conservative post-processing — does NOT touch lighting or colours:
 *   1. GlowLayer  — halo on emissive label surfaces (safe, additive only)
 *   2. FXAA       — anti-aliasing (safe, no colour change)
 *   3. Sharpening — crisper edges on 3D blocks (safe, edge-only)
 *
 * Bloom and image-processing intentionally omitted — they conflict with the
 * scene's StandardMaterial / LDR setup and cause tone-mapping darkening.
 *
 * To disable everything instantly: set PHASE3_ENABLED = false in Phase3Config.ts
 */

import { Scene, Camera, GlowLayer, DefaultRenderingPipeline } from '@babylonjs/core';

export class Phase3VisualEffects {
  private glowLayer: GlowLayer | null = null;
  private pipeline: DefaultRenderingPipeline | null = null;

  constructor(scene: Scene, camera: Camera) {
    try {
      // ── 1. Glow Layer ──────────────────────────────────────────────────────
      // Labels have emissiveColor = (0.7, 0.7, 0.7) so they get a soft halo.
      // Purely additive — cannot darken anything.
      this.glowLayer = new GlowLayer('phase3Glow', scene, {
        mainTextureFixedSize: 512,
        blurKernelSize: 32,
      });
      this.glowLayer.intensity = 0.5;

      // ── 2. Pipeline: FXAA + Sharpening only ───────────────────────────────
      // hdr: false = LDR pipeline, imageProcessingEnabled = false = NO tone
      // mapping. Only FXAA and sharpening are switched on.
      this.pipeline = new DefaultRenderingPipeline('phase3Pipeline', false, scene, [camera]);

      // Disable image processing entirely — default tone mapping darkens LDR scenes
      this.pipeline.imageProcessingEnabled = false;

      // Disable bloom — safe default; can re-enable once scene is PBR-based
      this.pipeline.bloomEnabled = false;

      // FXAA — smooth jagged edges, zero visual downside
      this.pipeline.fxaaEnabled = true;

      // Sharpening — makes 3D block edges look crisp
      this.pipeline.sharpenEnabled = true;
      if (this.pipeline.sharpen) {
        this.pipeline.sharpen.edgeAmount = 0.3;
        this.pipeline.sharpen.colorAmount = 0;
      }

      console.log('[Phase3] Visual effects active: glow + FXAA + sharpening');

    } catch (err) {
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
