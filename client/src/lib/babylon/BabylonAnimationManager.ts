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
    this.activeAnimations.forEach(animation => {
      if (animation.update) {
        animation.update();
      }
    });
  }

  public createColorSequence(sequence: ColorSequenceStep[]): Promise<void> {
    console.log(`🎨 Starting color sequence with ${sequence.length} steps`);
    
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
    console.log(`🎭 Applying ${performanceLevel} theme to ${sectionName}`);
    
    // Get all meshes with materials and apply theme to ALL visible BMC meshes for demonstration
    const allBMCMeshes = this.scene.meshes.filter(mesh => 
      mesh.material && 
      mesh.name !== "__root__" && 
      !mesh.name.toLowerCase().includes('ground') &&
      !mesh.name.toLowerCase().includes('label') &&
      !mesh.name.toLowerCase().includes('rail')
    );

    console.log(`🔍 Found ${allBMCMeshes.length} BMC meshes for theme application`);
    console.log(`🔍 Mesh names:`, allBMCMeshes.map(m => m.name));

    // Get the appropriate business material type
    let materialType: 'metal' | 'wood' | 'plastic' | 'glass' | 'fabric' | 'gold';
    switch (performanceLevel) {
      case 'high': materialType = 'metal'; break;
      case 'medium': materialType = 'plastic'; break;
      case 'low': materialType = 'wood'; break;
      case 'revenue': materialType = 'gold'; break;
      case 'cost': materialType = 'fabric'; break;
      default: materialType = 'plastic';
    }

    allBMCMeshes.forEach(mesh => {
      if (this.materialManager && (mesh as Mesh).material) {
        try {
          // Store original state
          const originalVisibility = mesh.isVisible;
          const originalEnabled = mesh.isEnabled();
          
          // Get safe business material
          const material = this.materialManager.getBusinessMaterial(materialType);
          
          // Apply material safely
          (mesh as Mesh).material = material;
          
          // Restore visibility
          mesh.isVisible = originalVisibility;
          mesh.setEnabled(originalEnabled);
          
          console.log(`✅ Applied ${materialType} material to ${mesh.name}`);
        } catch (error) {
          console.error(`❌ Failed to apply ${materialType} material to ${mesh.name}:`, error);
          
          // Fallback: create a simple visible material
          const fallbackMaterial = new StandardMaterial(`fallback_${mesh.name}`, this.scene);
          fallbackMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
          fallbackMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);
          fallbackMaterial.backFaceCulling = false;
          (mesh as Mesh).material = fallbackMaterial;
        }
      }
    });

    console.log(`🎭 Applied business theme: ${sectionName} → ${performanceLevel} (${materialType})`);
  }

  public clearAllAnimations(): void {
    this.activeAnimations.clear();
    console.log('🧹 BabylonAnimationManager: All animations cleared');
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

  public dispose(): void {
    this.pauseAnimations();
    this.activeAnimations.clear();
    if (this.materialManager) {
      this.materialManager.dispose();
    }
    console.log('🗑️ BabylonAnimationManager: Disposed');
  }
}