
import { Scene, SceneLoader, StandardMaterial, Color3, Vector3, ActionManager, ExecuteCodeAction, MeshBuilder, Texture, AbstractMesh } from '@babylonjs/core';
import { BusinessModelCanvas } from '@/types/canvas';

export class BMCModelLoader {
  private scene: Scene;
  private canvas: BusinessModelCanvas;
  private cleanBMCSystem: any;

  constructor(scene: Scene, canvas: BusinessModelCanvas, cleanBMCSystem: any) {
    this.scene = scene;
    this.canvas = canvas;
    this.cleanBMCSystem = cleanBMCSystem;
  }

  async loadMainBMC(): Promise<AbstractMesh[]> {
    console.log("🔄 Loading main BMC components...");
    const meshes: AbstractMesh[] = [];

    const bmcComponents = [
      { name: 'Key Partners', file: 'BMC_blender_06_KeyPartners.glb', position: new Vector3(-6, 1, 2) },
      { name: 'Key Activities', file: 'BMC_blender_06_KeyActivities.glb', position: new Vector3(-6, 1, 0) },
      { name: 'Key Resources', file: 'BMC_blender_06_KeyResources.glb', position: new Vector3(-6, 1, -2) },
      { name: 'Value Propositions', file: 'BMC_blender_06_ValueProposition.glb', position: new Vector3(0, 1, 0) },
      { name: 'Customer Relationships', file: 'BMC_blender_06_CustomerRelationships.glb', position: new Vector3(6, 1, 2) },
      { name: 'CustomerChannels', file: 'BMC_blender_06_CustomerChannels.glb', position: new Vector3(6, 1, 0) },
      { name: 'Customer Segments', file: 'BMC_blender_06_CustomerSegments.glb', position: new Vector3(6, 1, -2) }
    ];

    for (const component of bmcComponents) {
      try {
        console.log(`🔄 Attempting to load: ${component.file}`);
        const result = await SceneLoader.ImportMeshAsync("", "/models/", component.file, this.scene);
        
        if (result.meshes && result.meshes.length > 0) {
          const rootMesh = result.meshes[0];
          rootMesh.position = component.position;
          rootMesh.name = `BMC_${component.name}`;
          (rootMesh as any).bmcSectionName = component.name;
          
          // Apply base material
          this.applyBaseMaterial(rootMesh);
          
          // Register with cleanBMCSystem
          if (this.cleanBMCSystem) {
            this.cleanBMCSystem.registerMesh(component.name, rootMesh);
          }
          
          meshes.push(rootMesh);
          console.log(`✅ Loaded ${component.name}`);
        } else {
          throw new Error('No meshes found in loaded file');
        }
      } catch (error) {
        console.warn(`⚠️ Could not load ${component.name} from ${component.file}:`, error);
        // Create fallback geometry
        const fallbackMesh = this.createFallbackGeometry(component.name, component.position);
        meshes.push(fallbackMesh);
      }
    }

    console.log(`🔄 Loaded ${meshes.length} BMC components`);
    return meshes;
  }

  async loadRevenueStreams(): Promise<AbstractMesh[]> {
    console.log("🔄 Loading Revenue Streams model...");
    try {
      const result = await SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_07_RevenueStreams_1754360428541.glb", this.scene);
      
      if (result.meshes && result.meshes.length > 0) {
        const rootMesh = result.meshes[0];
        rootMesh.position = new Vector3(0, 1, -4);
        rootMesh.name = "BMC_Revenue Streams";
        (rootMesh as any).bmcSectionName = "Revenue Streams";
        
        this.applyBaseMaterial(rootMesh);
        console.log("✅ Loaded Revenue Streams");
        return [rootMesh];
      }
    } catch (error) {
      console.warn("⚠️ Could not load Revenue Streams:", error);
      const fallbackMesh = this.createFallbackGeometry("Revenue Streams", new Vector3(0, 1, -4));
      return [fallbackMesh];
    }
    
    return [];
  }

  async loadCostStructure(): Promise<AbstractMesh[]> {
    console.log("🔄 Loading Cost Structure model...");
    try {
      // Using a placeholder - you may need to create this model
      const fallbackMesh = this.createFallbackGeometry("Cost Structure", new Vector3(0, 1, 4));
      console.log("✅ Created Cost Structure placeholder");
      return [fallbackMesh];
    } catch (error) {
      console.warn("⚠️ Could not create Cost Structure:", error);
      return [];
    }
  }

  private createFallbackGeometry(name: string, position: Vector3): AbstractMesh {
    console.log(`🔧 Creating fallback geometry for: ${name}`);
    const mesh = MeshBuilder.CreateBox(`BMC_${name}`, { 
      width: 3, 
      height: 2, 
      depth: 1.5 
    }, this.scene);
    mesh.position = position;
    mesh.name = `BMC_${name}`;
    (mesh as any).bmcSectionName = name;
    
    this.applyBaseMaterial(mesh);
    
    // Register with cleanBMCSystem
    if (this.cleanBMCSystem) {
      this.cleanBMCSystem.registerMesh(name, mesh);
    }
    
    return mesh;
  }

  private applyBaseMaterial(mesh: AbstractMesh) {
    const material = new StandardMaterial(`material_${mesh.name}`, this.scene);
    material.diffuseColor = new Color3(0.07, 0.07, 0.07);
    material.specularColor = new Color3(0.1, 0.1, 0.1);
    
    if (mesh instanceof AbstractMesh) {
      mesh.material = material;
    }
  }

  setupMainBMCInteractions(meshes: AbstractMesh[], advancedTexture: any, createBillboardPanel: any) {
    console.log(`🔄 Setting up main BMC interactions for ${meshes.length} meshes`);
    
    meshes.forEach((mesh, index) => {
      if (mesh && (mesh as any).bmcSectionName) {
        const sectionName = (mesh as any).bmcSectionName;
        console.log(`🔗 Setting up interactions for: ${sectionName}`);
        
        // Setup action manager
        if (!mesh.actionManager) {
          mesh.actionManager = new ActionManager(this.scene);
        }
        
        // Click handling
        mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
          console.log(`🎯 Clicked on ${sectionName}`);
          
          if (this.cleanBMCSystem) {
            const isCurrentlySelected = this.cleanBMCSystem.getSelectedObject() === sectionName;
            
            if (isCurrentlySelected) {
              // Second click - show panel
              try {
                const panel = createBillboardPanel(sectionName, mesh.position, advancedTexture, this.scene);
                console.log(`📋 Showing panel for ${sectionName}`);
              } catch (error) {
                console.error(`❌ Error creating panel for ${sectionName}:`, error);
              }
            } else {
              // First click - select
              this.cleanBMCSystem.selectObject(sectionName);
              console.log(`🎯 Selected ${sectionName}`);
            }
          }
        }));

        // Hover effects
        mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
          console.log(`🔍 Hover enter: ${sectionName}`);
          if (this.cleanBMCSystem) {
            this.cleanBMCSystem.onHover(sectionName, true);
          }
        }));

        mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
          console.log(`🔍 Hover exit: ${sectionName}`);
          if (this.cleanBMCSystem) {
            this.cleanBMCSystem.onHover(sectionName, false);
          }
        }));
        
        console.log(`✅ Interactions set up for: ${sectionName}`);
      } else {
        console.warn(`⚠️ Mesh ${index} missing bmcSectionName property`);
      }
    });
    
    console.log(`✅ All BMC interactions configured`);
  }

  setupRevenueStreamsInteractions(meshes: AbstractMesh[], advancedTexture: any, createBillboardPanel: any) {
    console.log("🔄 Setting up Revenue Streams interactions");
    this.setupMainBMCInteractions(meshes, advancedTexture, createBillboardPanel);
  }

  setupCostStructureInteractions(meshes: AbstractMesh[], advancedTexture: any, createBillboardPanel: any) {
    console.log("🔄 Setting up Cost Structure interactions");
    this.setupMainBMCInteractions(meshes, advancedTexture, createBillboardPanel);
  }

  applyAnimations(meshes: AbstractMesh[]) {
    console.log("🎬 Applying BMC animations");
    // Animation logic will be handled by the BabylonAnimationManager
  }
}
