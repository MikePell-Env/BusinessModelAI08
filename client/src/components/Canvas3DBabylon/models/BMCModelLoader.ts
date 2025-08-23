/**
 * BMC Model Loader
 * Handles loading and positioning of GLB models for the BMC visualization
 */

import { 
  Scene,
  SceneLoader,
  AbstractMesh,
  Vector3,
  StandardMaterial,
  Color3,
  ActionManager,
  Mesh,
  TransformNode
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { debugLog } from '@/lib/debug/DebugLogger';
import { cleanBMCSystem } from '@/lib/cleanBMCSystem';

export interface LoadedModel {
  rootMesh: AbstractMesh;
  meshes: AbstractMesh[];
  sectionName: string;
  position: Vector3;
  scale: Vector3;
}

export class BMCModelLoader {
  private scene: Scene;
  private loadedModels: Map<string, LoadedModel> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Load the main BMC model with 7 sections
   */
  public async loadMainBMC(): Promise<LoadedModel> {
    debugLog.info('model', 'Loading main BMC model...');
    
    try {
      const result = await SceneLoader.ImportMeshAsync(
        "", 
        "/models/", 
        "BMC_blender_09_complete_1753576063858.glb", 
        this.scene
      );
      
      if (result.meshes.length === 0) {
        throw new Error('No meshes found in BMC model');
      }
      
      const rootMesh = result.meshes[0];
      rootMesh.position = new Vector3(0, 0.1, 0);
      rootMesh.rotation = Vector3.Zero();
      rootMesh.scaling = new Vector3(1, 1, 1);
      
      const model: LoadedModel = {
        rootMesh,
        meshes: result.meshes,
        sectionName: 'MainBMC',
        position: rootMesh.position.clone(),
        scale: rootMesh.scaling.clone()
      };
      
      this.loadedModels.set('MainBMC', model);
      debugLog.info('model', `Main BMC loaded with ${result.meshes.length} meshes`);
      
      return model;
    } catch (error) {
      debugLog.error('model', 'Failed to load main BMC model', error);
      throw error;
    }
  }

  /**
   * Load Revenue Streams model
   */
  public async loadRevenueStreams(): Promise<LoadedModel> {
    debugLog.info('model', 'Loading Revenue Streams model...');
    
    try {
      const result = await SceneLoader.ImportMeshAsync(
        "",
        "/models/",
        "RS.glb",
        this.scene
      );
      
      if (result.meshes.length === 0) {
        throw new Error('No meshes found in Revenue Streams model');
      }
      
      const rootMesh = result.meshes[0];
      
      // Create a wrapper TransformNode for proper positioning
      const wrapper = new TransformNode("RevenueStreamsWrapper", this.scene);
      result.meshes.forEach(mesh => {
        if (mesh.parent === null) {
          mesh.parent = wrapper;
        }
      });
      
      // Position Revenue Streams (note X-axis inversion)
      wrapper.position = new Vector3(-0.221, 0.1, -10.5);
      wrapper.scaling = new Vector3(-1, 1, 1); // Invert X-axis
      
      // Register with CleanBMCSystem
      const mainMesh = result.meshes.find(m => m.name.includes('Revenue')) || result.meshes[1];
      if (mainMesh && mainMesh.material) {
        // Set correct material color
        const material = mainMesh.material as StandardMaterial;
        material.diffuseColor = new Color3(0.0, 0.20, 0.12); // Green for revenue
        cleanBMCSystem.registerItem('Revenue Streams', mainMesh, material, mainMesh.scaling.y);
      }
      
      const model: LoadedModel = {
        rootMesh: wrapper as any,
        meshes: result.meshes,
        sectionName: 'Revenue Streams',
        position: wrapper.position.clone(),
        scale: wrapper.scaling.clone()
      };
      
      this.loadedModels.set('Revenue Streams', model);
      debugLog.info('model', 'Revenue Streams loaded');
      
      return model;
    } catch (error) {
      debugLog.error('model', 'Failed to load Revenue Streams model', error);
      throw error;
    }
  }

  /**
   * Load Cost Structure model
   */
  public async loadCostStructure(): Promise<LoadedModel> {
    debugLog.info('model', 'Loading Cost Structure model...');
    
    try {
      const result = await SceneLoader.ImportMeshAsync(
        "",
        "/models/",
        "CS.glb",
        this.scene
      );
      
      if (result.meshes.length === 0) {
        throw new Error('No meshes found in Cost Structure model');
      }
      
      const rootMesh = result.meshes[0];
      
      // Create a wrapper TransformNode for proper positioning
      const wrapper = new TransformNode("CostStructureWrapper", this.scene);
      result.meshes.forEach(mesh => {
        if (mesh.parent === null) {
          mesh.parent = wrapper;
        }
      });
      
      // Position Cost Structure (note X-axis inversion)
      wrapper.position = new Vector3(-10.1, 0.1, -10.5);
      wrapper.scaling = new Vector3(-1, 1, 1); // Invert X-axis
      
      // Register with CleanBMCSystem
      const mainMesh = result.meshes.find(m => m.name.includes('Cost')) || result.meshes[1];
      if (mainMesh && mainMesh.material) {
        // Set correct material color
        const material = mainMesh.material as StandardMaterial;
        material.diffuseColor = new Color3(0.35, 0.0, 0.0); // Red for costs
        cleanBMCSystem.registerItem('Cost Structure', mainMesh, material, mainMesh.scaling.y);
      }
      
      const model: LoadedModel = {
        rootMesh: wrapper as any,
        meshes: result.meshes,
        sectionName: 'Cost Structure',
        position: wrapper.position.clone(),
        scale: wrapper.scaling.clone()
      };
      
      this.loadedModels.set('Cost Structure', model);
      debugLog.info('model', 'Cost Structure loaded');
      
      return model;
    } catch (error) {
      debugLog.error('model', 'Failed to load Cost Structure model', error);
      throw error;
    }
  }

  /**
   * Get a loaded model by name
   */
  public getModel(name: string): LoadedModel | undefined {
    return this.loadedModels.get(name);
  }

  /**
   * Get all loaded models
   */
  public getAllModels(): LoadedModel[] {
    return Array.from(this.loadedModels.values());
  }

  /**
   * Dispose all loaded models
   */
  public dispose(): void {
    this.loadedModels.forEach(model => {
      model.meshes.forEach(mesh => {
        mesh.dispose();
      });
    });
    this.loadedModels.clear();
  }
}