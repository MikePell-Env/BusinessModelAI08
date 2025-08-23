import { Scene, SceneLoader, AbstractMesh, Vector3, ActionManager, ExecuteCodeAction, StandardMaterial, Color3, Animation, MeshBuilder } from '@babylonjs/core';
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
    try {
      console.log("🔄 Loading main BMC model...");
      const result = await SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_09_complete_1753576063858.glb", this.scene);
      const meshes = result.meshes.filter(mesh => mesh.name !== "__root__");

      if (meshes.length === 0) {
        console.warn("⚠️ No meshes found in GLB, creating fallback geometry");
        return this.createFallbackBMCGeometry();
      }

      console.log(`✅ Loaded main BMC with ${meshes.length} meshes`);
      return meshes;
    } catch (error) {
      console.error("❌ Error loading main BMC:", error);
      console.log("🔄 Creating fallback geometry...");
      return this.createFallbackBMCGeometry();
    }
  }

  async loadRevenueStreams(): Promise<AbstractMesh[]> {
    try {
      console.log("🔄 Loading Revenue Streams model...");
      const result = await SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_07_RevenueStreams_1754360428541.glb", this.scene);
      const meshes = result.meshes.filter(mesh => mesh.name !== "__root__");

      if (meshes.length === 0) {
        console.warn("⚠️ No Revenue Streams meshes found, creating fallback");
        return this.createFallbackRevenueStreams();
      }

      console.log(`✅ Loaded Revenue Streams with ${meshes.length} meshes`);
      return meshes;
    } catch (error) {
      console.error("❌ Error loading Revenue Streams:", error);
      return this.createFallbackRevenueStreams();
    }
  }

  async loadCostStructure(): Promise<AbstractMesh[]> {
    try {
      console.log("🔄 Loading Cost Structure model...");
      const result = await SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_09_complete_1753576063858.glb", this.scene);
      const meshes = result.meshes.filter(mesh => mesh.name !== "__root__");

      if (meshes.length === 0) {
        console.warn("⚠️ No Cost Structure meshes found, creating fallback");
        return this.createFallbackCostStructure();
      }

      console.log(`✅ Loaded Cost Structure with ${meshes.length} meshes`);
      return meshes;
    } catch (error) {
      console.error("❌ Error loading Cost Structure:", error);
      return this.createFallbackCostStructure();
    }
  }

  private createFallbackBMCGeometry(): AbstractMesh[] {
    console.log("🔧 Creating fallback BMC geometry...");
    const meshes: AbstractMesh[] = [];

    const bmcComponents = [
      { name: 'Key Partners', position: new Vector3(-6, 1, 2) },
      { name: 'Key Activities', position: new Vector3(-6, 1, 0) },
      { name: 'Key Resources', position: new Vector3(-6, 1, -2) },
      { name: 'Value Propositions', position: new Vector3(0, 1, 0) },
      { name: 'Customer Relationships', position: new Vector3(6, 1, 2) },
      { name: 'CustomerChannels', position: new Vector3(6, 1, 0) },
      { name: 'Customer Segments', position: new Vector3(6, 1, -2) }
    ];

    bmcComponents.forEach(component => {
      const mesh = MeshBuilder.CreateBox(`BMC_${component.name}`, { width: 3, height: 2, depth: 1.5 }, this.scene);
      mesh.position = component.position;
      (mesh as any).bmcSectionName = component.name;
      this.applyBaseMaterial(mesh);
      if (this.cleanBMCSystem) {
        this.cleanBMCSystem.registerMesh(component.name, mesh);
      }
      meshes.push(mesh);
    });
    console.log(`✅ Created ${meshes.length} fallback BMC geometries`);
    return meshes;
  }

  private createFallbackRevenueStreams(): AbstractMesh[] {
    console.log("🔧 Creating fallback Revenue Streams geometry...");
    const mesh = MeshBuilder.CreateBox("BMC_RevenueStreams_Fallback", { width: 5, height: 2, depth: 2 }, this.scene);
    mesh.position = new Vector3(0, 1, -4);
    (mesh as any).bmcSectionName = "Revenue Streams";
    this.applyBaseMaterial(mesh);
    if (this.cleanBMCSystem) {
      this.cleanBMCSystem.registerMesh("Revenue Streams", mesh);
    }
    console.log("✅ Created fallback Revenue Streams geometry");
    return [mesh];
  }

  private createFallbackCostStructure(): AbstractMesh[] {
    console.log("🔧 Creating fallback Cost Structure geometry...");
    const mesh = MeshBuilder.CreateBox("BMC_CostStructure_Fallback", { width: 5, height: 2, depth: 2 }, this.scene);
    mesh.position = new Vector3(0, 1, 4);
    (mesh as any).bmcSectionName = "Cost Structure";
    this.applyBaseMaterial(mesh);
    if (this.cleanBMCSystem) {
      this.cleanBMCSystem.registerMesh("Cost Structure", mesh);
    }
    console.log("✅ Created fallback Cost Structure geometry");
    return [mesh];
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