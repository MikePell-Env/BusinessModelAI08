import { Scene, Mesh, Color3, Material, StandardMaterial } from '@babylonjs/core';
import { BabylonMaterialManager } from './BabylonMaterialManager';

export interface ColorSequenceStep {
  section: string;
  color: string;
  duration: number;
}

export interface AnimationDataBinding {
  sectionId: string;
  dataField: string;
  colorRange: [string, string];
  updateFrequency: number;
}

export class BabylonAnimationManager {
  private scene: Scene;
  private materialManager: BabylonMaterialManager;
  private globalAnimationLoop: number = 0;
  private activeAnimations: Map<string, any> = new Map();
  private isRunning: boolean = false;

  constructor(scene: Scene) {
    this.scene = scene;
    this.materialManager = new BabylonMaterialManager(scene);
    this.startGlobalAnimationLoop();
  }

  private startGlobalAnimationLoop(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const animate = () => {
      if (this.isRunning) {
        this.updateAllAnimations();
        this.globalAnimationLoop = requestAnimationFrame(animate);
      }
    };
    animate();
    
    console.log('🎬 BabylonAnimationManager: Global animation loop started');
  }

  private updateAllAnimations(): void {
    // Update all active animations
    this.activeAnimations.forEach((animation, id) => {
      if (animation.update) {
        animation.update();
      }
    });
  }

  public createColorSequence(sequence: ColorSequenceStep[]): Promise<void> {
    return new Promise((resolve) => {
      let currentStep = 0;
      
      const executeStep = () => {
        if (currentStep >= sequence.length) {
          resolve();
          return;
        }

        const step = sequence[currentStep];
        console.log(`🎨 Color sequence: Applying ${step.color} to ${step.section} for ${step.duration}ms`);
        
        // Apply color to BMC section
        this.applySectionColor(step.section, step.color);
        
        setTimeout(() => {
          currentStep++;
          executeStep();
        }, step.duration);
      };

      executeStep();
    });
  }

  private applySectionColor(sectionName: string, color: string): void {
    // Find meshes matching the section name
    const meshes = this.scene.meshes.filter(mesh => 
      mesh.name.includes(sectionName) || 
      (mesh as any).bmcSectionName === sectionName
    );

    meshes.forEach(mesh => {
      const material = this.materialManager.createColorSequenceMaterial(sectionName, color);
      (mesh as Mesh).material = material;
    });
  }

  public bindColorToData(sectionName: string, binding: AnimationDataBinding): void {
    const animationId = `color_binding_${sectionName}`;
    
    const animation = {
      sectionName,
      binding,
      lastUpdate: Date.now(),
      update: () => {
        const now = Date.now();
        if (now - animation.lastUpdate >= binding.updateFrequency) {
          // Simulate data update for now - will be replaced with real data
          const simulatedValue = Math.sin(now * 0.001) * 0.5 + 0.5; // 0 to 1
          this.updateSectionColorFromData(sectionName, simulatedValue, binding.colorRange);
          animation.lastUpdate = now;
        }
      }
    };

    this.activeAnimations.set(animationId, animation);
    console.log(`🔗 Data binding created: ${sectionName} → ${binding.dataField}`);
  }

  private updateSectionColorFromData(sectionName: string, dataValue: number, colorRange: [string, string]): void {
    // Interpolate between colors based on data value
    const startColor = this.hexToColor3(colorRange[0]);
    const endColor = this.hexToColor3(colorRange[1]);
    
    const interpolatedColor = Color3.Lerp(startColor, endColor, dataValue);
    const hexColor = this.color3ToHex(interpolatedColor);
    
    this.applySectionColor(sectionName, hexColor);
  }

  private hexToColor3(hex: string): Color3 {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substr(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substr(2, 2), 16) / 255;
    const b = parseInt(cleanHex.substr(4, 2), 16) / 255;
    return new Color3(r, g, b);
  }

  private color3ToHex(color: Color3): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  public applyBusinessTheme(sectionName: string, performanceLevel: 'high' | 'medium' | 'low' | 'growth' | 'cost' | 'revenue'): void {
    const materialKey = this.materialManager.applyBusinessTheme(sectionName, performanceLevel);
    const material = this.materialManager.getMaterial(materialKey, this.getPresetFromPerformance(performanceLevel));
    
    // Apply to section meshes
    const meshes = this.scene.meshes.filter(mesh => 
      mesh.name.includes(sectionName) || 
      (mesh as any).bmcSectionName === sectionName
    );

    meshes.forEach(mesh => {
      (mesh as Mesh).material = material;
    });

    console.log(`🎭 Applied business theme: ${sectionName} → ${performanceLevel}`);
  }

  private getPresetFromPerformance(performanceLevel: string): string {
    const presetMap = {
      'high': 'high_performance',
      'medium': 'medium_performance', 
      'low': 'needs_improvement',
      'growth': 'growth_area',
      'cost': 'cost_center',
      'revenue': 'revenue_generator'
    };

    return presetMap[performanceLevel as keyof typeof presetMap] || 'medium_performance';
  }

  public pauseAnimations(): void {
    this.isRunning = false;
    if (this.globalAnimationLoop) {
      cancelAnimationFrame(this.globalAnimationLoop);
    }
    console.log('⏸️ BabylonAnimationManager: Animations paused');
  }

  public resumeAnimations(): void {
    if (!this.isRunning) {
      this.startGlobalAnimationLoop();
      console.log('▶️ BabylonAnimationManager: Animations resumed');
    }
  }

  public clearAnimation(animationId: string): void {
    this.activeAnimations.delete(animationId);
  }

  public clearAllAnimations(): void {
    this.activeAnimations.clear();
  }

  public dispose(): void {
    this.pauseAnimations();
    this.clearAllAnimations();
    this.materialManager.dispose();
  }
}