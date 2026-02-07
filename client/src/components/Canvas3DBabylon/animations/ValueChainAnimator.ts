import { 
  Scene,
  AbstractMesh,
  Color3,
  Observer,
  StandardMaterial,
  PBRMetallicRoughnessMaterial
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';
import { BMCComponentName } from '@/types/bmcState';

export interface ValueChainStep {
  sectionName: BMCComponentName;
  displayName: string;
  description: string;
}

type AnimPhase = 'pulse' | 'pause' | 'loopPause' | 'idle';

export class ValueChainAnimator {
  private scene: Scene;
  private isRunning: boolean = false;
  private meshMap: Map<BMCComponentName, AbstractMesh> = new Map();
  private originalMaterials: Map<BMCComponentName, any> = new Map();
  private renderObserver: Observer<Scene> | null = null;

  private currentStepIndex: number = 0;
  private phase: AnimPhase = 'idle';
  private phaseElapsed: number = 0;

  private readonly pulseDurationMs: number = 667;
  private readonly pauseDurationMs: number = 167;
  private readonly loopPauseDurationMs: number = 500;

  private readonly valueChainSequence: ValueChainStep[] = [
    { sectionName: 'KeyResources', displayName: 'Key Resources', description: 'Essential assets required for the business' },
    { sectionName: 'KeyActivities', displayName: 'Key Activities', description: 'Critical activities that create value' },
    { sectionName: 'ValueProposition', displayName: 'Value Proposition', description: 'Products/services that create customer value' },
    { sectionName: 'CustomerRelationships', displayName: 'Customer Relationships', description: 'How we maintain and grow customer connections' },
    { sectionName: 'RevenueStreams', displayName: 'Revenue Streams', description: 'Cash generated from value delivered to customers' }
  ];

  private readonly colors = {
    idle: new Color3(0.07, 0.07, 0.07),
    active: new Color3(0.5, 0.3, 0.7),
    trail: new Color3(0.25, 0.15, 0.35),
    emissive: new Color3(0.7, 0.4, 0.9),
    trailEmissive: new Color3(0.1, 0.06, 0.15)
  };

  constructor(scene: Scene) {
    this.scene = scene;
    debugLog.info('animator', 'ValueChainAnimator initialized');
  }

  public registerMesh(sectionName: BMCComponentName, mesh: AbstractMesh): void {
    this.meshMap.set(sectionName, mesh);
    
    if (mesh.material) {
      this.originalMaterials.set(sectionName, {
        diffuseColor: mesh.material instanceof StandardMaterial ? 
          mesh.material.diffuseColor?.clone() : null,
        baseColor: mesh.material instanceof PBRMetallicRoughnessMaterial ? 
          mesh.material.baseColor?.clone() : null,
        emissiveColor: mesh.material instanceof StandardMaterial ?
          mesh.material.emissiveColor?.clone() : 
          mesh.material instanceof PBRMetallicRoughnessMaterial ?
          mesh.material.emissiveColor?.clone() : null
      });
    }
  }

  public startAnimation(): void {
    if (this.isRunning) return;
    if (this.meshMap.size === 0) return;

    this.isRunning = true;
    this.currentStepIndex = 0;
    this.phase = 'pulse';
    this.phaseElapsed = 0;

    this.beginStep(0);
    this.attachRenderLoop();
  }

  public stopAnimation(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.phase = 'idle';
    this.detachRenderLoop();
    this.restoreOriginalStates();
  }

  public toggleAnimation(): boolean {
    if (this.isRunning) {
      this.stopAnimation();
      return false;
    } else {
      this.startAnimation();
      return true;
    }
  }

  public isAnimationRunning(): boolean {
    return this.isRunning;
  }

  private attachRenderLoop(): void {
    this.detachRenderLoop();
    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.onFrame();
    });
  }

  private detachRenderLoop(): void {
    if (this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }
  }

  private onFrame(): void {
    if (!this.isRunning) return;

    const deltaMs = this.scene.getEngine().getDeltaTime();
    this.phaseElapsed += deltaMs;

    if (this.phase === 'pulse') {
      const t = Math.min(this.phaseElapsed / this.pulseDurationMs, 1.0);
      this.updatePulse(t);

      if (t >= 1.0) {
        this.finishStep(this.currentStepIndex);
        this.phaseElapsed = 0;
        this.currentStepIndex++;

        if (this.currentStepIndex >= this.valueChainSequence.length) {
          this.phase = 'loopPause';
        } else {
          this.phase = 'pause';
        }
      }
    } else if (this.phase === 'pause') {
      if (this.phaseElapsed >= this.pauseDurationMs) {
        this.phaseElapsed = 0;
        this.phase = 'pulse';
        this.beginStep(this.currentStepIndex);
      }
    } else if (this.phase === 'loopPause') {
      if (this.phaseElapsed >= this.loopPauseDurationMs) {
        this.resetAllToIdle();
        this.currentStepIndex = 0;
        this.phaseElapsed = 0;
        this.phase = 'pulse';
        this.beginStep(0);
      }
    }
  }

  private beginStep(stepIndex: number): void {
    const step = this.valueChainSequence[stepIndex];
    if (!step) return;
    const mesh = this.meshMap.get(step.sectionName);
    if (!mesh) return;

    this.setMeshColor(mesh, this.colors.active);
    this.updateTrailEffect(stepIndex);
  }

  private smoothstep(x: number): number {
    const c = Math.max(0, Math.min(1, x));
    return c * c * (3 - 2 * c);
  }

  private updatePulse(t: number): void {
    const step = this.valueChainSequence[this.currentStepIndex];
    if (!step) return;
    const mesh = this.meshMap.get(step.sectionName);
    if (!mesh) return;

    let emissive: Color3;
    if (t < 0.2) {
      const rampUp = this.smoothstep(t / 0.2);
      emissive = Color3.Lerp(new Color3(0, 0, 0), this.colors.emissive, rampUp);
    } else if (t < 0.4) {
      emissive = this.colors.emissive;
    } else {
      const fadeOut = this.smoothstep((t - 0.4) / 0.6);
      emissive = Color3.Lerp(this.colors.emissive, this.colors.trail, fadeOut);
    }

    this.setMeshEmissive(mesh, emissive);
  }

  private finishStep(stepIndex: number): void {
    const step = this.valueChainSequence[stepIndex];
    if (!step) return;
    const mesh = this.meshMap.get(step.sectionName);
    if (!mesh) return;

    this.setMeshEmissive(mesh, this.colors.trail);
  }

  private updateTrailEffect(currentStepIndex: number): void {
    for (let i = 0; i < currentStepIndex; i++) {
      const previousStep = this.valueChainSequence[i];
      const previousMesh = this.meshMap.get(previousStep.sectionName);
      if (previousMesh) {
        this.setMeshColor(previousMesh, this.colors.trail);
        this.setMeshEmissive(previousMesh, this.colors.trailEmissive);
      }
    }
  }

  private resetAllToIdle(): void {
    this.meshMap.forEach((mesh) => {
      this.setMeshColor(mesh, this.colors.idle);
      this.setMeshEmissive(mesh, new Color3(0, 0, 0));
    });
  }

  private restoreOriginalStates(): void {
    this.meshMap.forEach((mesh, sectionName) => {
      const original = this.originalMaterials.get(sectionName);
      if (original && mesh.material) {
        if (mesh.material instanceof StandardMaterial) {
          if (original.diffuseColor) mesh.material.diffuseColor = original.diffuseColor;
          if (original.emissiveColor) mesh.material.emissiveColor = original.emissiveColor;
        } else if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
          if (original.baseColor) mesh.material.baseColor = original.baseColor;
          if (original.emissiveColor) mesh.material.emissiveColor = original.emissiveColor;
        }
      }
    });
  }

  private setMeshColor(mesh: AbstractMesh, color: Color3): void {
    if (!this.isRunning || !mesh.material) return;
    if (mesh.material instanceof StandardMaterial) {
      mesh.material.diffuseColor = color;
    } else if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
      mesh.material.baseColor = color;
    }
  }

  private setMeshEmissive(mesh: AbstractMesh, color: Color3): void {
    if (!this.isRunning || !mesh.material) return;
    if (mesh.material instanceof StandardMaterial) {
      mesh.material.emissiveColor = color;
    } else if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
      mesh.material.emissiveColor = color;
    }
  }

  public getAnimationInfo() {
    return {
      isRunning: this.isRunning,
      sequence: this.valueChainSequence,
      registeredMeshes: Array.from(this.meshMap.keys()),
    };
  }

  public dispose(): void {
    this.stopAnimation();
    this.meshMap.clear();
    this.originalMaterials.clear();
  }
}
