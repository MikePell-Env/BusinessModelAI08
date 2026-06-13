/**
 * Phase 3 Visual Quality Effects — GlowLayer only
 *
 * DefaultRenderingPipeline is intentionally excluded: it overrides the main
 * render path and outputs black in this scene's StandardMaterial / LDR setup
 * regardless of which features are enabled.
 *
 * GlowLayer is purely additive — it composites on top of the normal render
 * and cannot darken or black out the scene.
 *
 * Labels already have emissiveColor = Color3(0.7, 0.7, 0.7) so they will
 * receive a visible soft halo.
 *
 * To disable: set PHASE3_ENABLED = false in Phase3Config.ts
 */

import { Scene, GlowLayer } from '@babylonjs/core';

export class Phase3VisualEffects {
  private glowLayer: GlowLayer | null = null;

  constructor(scene: Scene) {
    try {
      this.glowLayer = new GlowLayer('phase3Glow', scene, {
        mainTextureFixedSize: 512,
        blurKernelSize: 32,
      });
      this.glowLayer.intensity = 0.5;

      console.log('[Phase3] GlowLayer active');
    } catch (err) {
      console.warn('[Phase3] Failed to initialise GlowLayer:', err);
      this.dispose();
    }
  }

  public dispose(): void {
    try {
      this.glowLayer?.dispose();
    } catch (err) {
      console.warn('[Phase3] Error during dispose:', err);
    }
    this.glowLayer = null;
  }
}
