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
  Mesh
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { debugLog } from '@/lib/debug/DebugLogger';

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
   * Load the main BMC model with 9 sections (Business Model template)
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
   * Load the Financials model (single Value Propositions cylinder)
   */
  public async loadFinancialsModel(): Promise<LoadedModel> {
    debugLog.info('model', 'Loading Financials model...');
    
    try {
      const result = await SceneLoader.ImportMeshAsync(
        "", 
        "/models/", 
        "Financials_blender_02_1756252040436.glb",
        this.scene
      );
      
      if (result.meshes.length === 0) {
        throw new Error('No meshes found in Financials model');
      }
      
      const rootMesh = result.meshes[0];
      rootMesh.position = new Vector3(0, 0.1, 0);
      rootMesh.rotation = Vector3.Zero();
      rootMesh.scaling = new Vector3(1, 1, 1);
      
      // Adjust positions for stacked financial objects
      result.meshes.forEach((mesh) => {
        console.log(`🔍 Found mesh: "${mesh.name}"`);
        
        // Move P&L objects down slightly to rest on base objects
        if (mesh.name === "RevenuePL") {
          mesh.position.y -= 0.05; // Move down to rest on Revenue
          console.log(`📦 Adjusted RevenuePL position: y=${mesh.position.y} (moved down 0.05)`);
        } else if (mesh.name === "ExpensesPL") {
          mesh.position.y -= 0.05; // Move down to rest on Expenses
          console.log(`📦 Adjusted ExpensesPL position: y=${mesh.position.y} (moved down 0.05)`);
        }
      });
      
      const model: LoadedModel = {
        rootMesh,
        meshes: result.meshes,
        sectionName: 'FinancialsMain',
        position: rootMesh.position.clone(),
        scale: rootMesh.scaling.clone()
      };
      
      this.loadedModels.set('FinancialsMain', model);
      debugLog.info('model', `Financials model loaded with ${result.meshes.length} meshes`);
      
      return model;
    } catch (error) {
      debugLog.error('model', 'Failed to load Financials model', error);
      throw error;
    }
  }

  /**
   * Load template-specific model based on template type
   */
  public async loadTemplateModel(templateName: string): Promise<LoadedModel> {
    debugLog.info('model', `Loading model for template: ${templateName}`);
    console.log(`🔧 Template name received: "${templateName}"`);
    
    switch (templateName.toLowerCase()) {
      case 'business model':
      case 'businessmodel':
        console.log(`✅ Loading Business Model (main BMC)`);
        return this.loadMainBMC();
      
      case 'financials':
        console.log(`✅ Loading Financials model`);
        return this.loadFinancialsModel();
      
      default:
        console.log(`❌ Unknown template: "${templateName}", falling back to main BMC`);
        debugLog.warn('model', `Unknown template: ${templateName}, falling back to main BMC`);
        return this.loadMainBMC();
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
        "BMC_blender_07_RevenueStreams_1754360428541.glb", 
        this.scene
      );
      
      if (result.meshes.length === 0) {
        throw new Error('No meshes found in Revenue Streams model');
      }
      
      const rootMesh = result.meshes[0];
      // SCIENTIFIC FIX: Revenue Streams needs POSITIVE X to appear RIGHT
      rootMesh.position = new Vector3(10.1, 0.1, -10.5);
      rootMesh.rotation = Vector3.Zero();
      rootMesh.scaling = new Vector3(8.0, 8, 8); // Match Cost Structure exact size
      
      const model: LoadedModel = {
        rootMesh,
        meshes: result.meshes,
        sectionName: 'Revenue Streams',
        position: rootMesh.position.clone(),
        scale: rootMesh.scaling.clone()
      };
      
      this.loadedModels.set('Revenue Streams', model);
      debugLog.info('model', `Revenue Streams loaded at position ${rootMesh.position}`);
      
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
        "BMC_blender_07_RevenueStreams_1754360428541.glb", 
        this.scene
      );
      
      if (result.meshes.length === 0) {
        throw new Error('No meshes found in Cost Structure model');
      }
      
      // CRITICAL FIX: Rename ALL meshes to avoid naming conflicts with Revenue Streams
      result.meshes.forEach((mesh, index) => {
        const originalName = mesh.name;
        if (mesh.name === "RevenueStreams") {
          mesh.name = "CostStructure";
          console.log(`🔧 Renamed main mesh from "${originalName}" to "${mesh.name}"`);
        } else if (mesh.name !== "__root__") {
          // Rename any other meshes to avoid conflicts
          mesh.name = `CostStructure_${originalName}_${index}`;
          console.log(`🔧 Renamed child mesh from "${originalName}" to "${mesh.name}"`);
        }
      });
      
      const rootMesh = result.meshes[0];
      // SCIENTIFIC FIX: Cost Structure needs NEGATIVE X to appear LEFT  
      rootMesh.position = new Vector3(-0.221, 0.1, -10.5);
      rootMesh.rotation = Vector3.Zero();
      rootMesh.scaling = new Vector3(8.0, 8, 8);
      
      const model: LoadedModel = {
        rootMesh,
        meshes: result.meshes,
        sectionName: 'Cost Structure',
        position: rootMesh.position.clone(),
        scale: rootMesh.scaling.clone()
      };
      
      this.loadedModels.set('Cost Structure', model);
      debugLog.info('model', `Cost Structure loaded at position ${rootMesh.position}`);
      
      return model;
    } catch (error) {
      debugLog.error('model', 'Failed to load Cost Structure model', error);
      throw error;
    }
  }

  /**
   * Apply material to a section
   */
  public applySectionMaterial(mesh: AbstractMesh, sectionName: string, baseColor: Color3): StandardMaterial {
    const material = new StandardMaterial(`${sectionName}_material`, this.scene);
    material.diffuseColor = baseColor;
    material.specularColor = new Color3(0.2, 0.2, 0.2);
    material.specularPower = 32;
    
    if (mesh instanceof Mesh) {
      mesh.material = material;
    }
    
    // Store metadata for interactions
    (mesh as any).bmcSectionName = sectionName;
    (mesh as any).originalColor = baseColor.clone();
    (mesh as any).isClicked = false;
    
    // Ensure mesh is pickable
    mesh.isPickable = true;
    if (!mesh.actionManager) {
      mesh.actionManager = new ActionManager(this.scene);
    }
    
    debugLog.verbose('model', `Applied material to ${sectionName}`);
    
    return material;
  }

  /**
   * Get all loaded models
   */
  public getLoadedModels(): Map<string, LoadedModel> {
    return this.loadedModels;
  }

  /**
   * Get a specific loaded model
   */
  public getModel(sectionName: string): LoadedModel | undefined {
    return this.loadedModels.get(sectionName);
  }

  /**
   * Load all BMC models
   */
  public async loadAllModels(): Promise<void> {
    debugLog.info('model', 'Loading all BMC models...');
    
    try {
      await Promise.all([
        this.loadMainBMC(),
        this.loadRevenueStreams(),
        this.loadCostStructure()
      ]);
      
      debugLog.info('model', 'All BMC models loaded successfully');
    } catch (error) {
      debugLog.error('model', 'Failed to load all models', error);
      throw error;
    }
  }
}