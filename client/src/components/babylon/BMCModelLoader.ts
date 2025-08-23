
import { Scene, SceneLoader, StandardMaterial, Color3, Vector3, ActionManager, ExecuteCodeAction, MeshBuilder, Texture } from '@babylonjs/core';
import { BusinessModelCanvas } from '@/types/canvas';

export class BMCModelLoader {
  private scene: Scene;
  private canvas: BusinessModelCanvas;
  private cleanBMCRef: any;

  constructor(scene: Scene, canvas: BusinessModelCanvas, cleanBMCRef: any) {
    this.scene = scene;
    this.canvas = canvas;
    this.cleanBMCRef = cleanBMCRef;
  }

  async loadMainBMC() {
    try {
      const result = await SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_09_complete_1753576063858.glb", this.scene);
      
      if (result.meshes.length > 0) {
        console.log(`✅ BMC model loaded with ${result.meshes.length} meshes`);
        
        const rootMesh = result.meshes[0];
        rootMesh.position = new Vector3(0, 0.1, 0.9);
        rootMesh.rotation = Vector3.Zero();
        rootMesh.scaling = new Vector3(8, 8, 8);

        this.setupBMCMeshes(result.meshes);
        return rootMesh;
      }
    } catch (error) {
      console.error("❌ Failed to load BMC model:", error);
    }
    return null;
  }

  async loadRevenueStreams() {
    try {
      const result = await SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_07_RevenueStreams_1754360428541.glb", this.scene);
      
      if (result.meshes.length > 0) {
        const revenueRootMesh = result.meshes[0];
        revenueRootMesh.position = new Vector3(-0.221, 0.1, -10.5);
        revenueRootMesh.rotation = Vector3.Zero();
        revenueRootMesh.scaling = new Vector3(7.7, 8, 8);

        this.setupRevenueStreamsMeshes(result.meshes);
        return revenueRootMesh;
      }
    } catch (error) {
      console.error("❌ Failed to load Revenue Streams model:", error);
    }
    return null;
  }

  async loadCostStructure() {
    try {
      const result = await SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_07_RevenueStreams_1754360428541.glb", this.scene);
      
      if (result.meshes.length > 0) {
        const costRootMesh = result.meshes[0];
        costRootMesh.position = new Vector3(-10.1, 0.1, -10.5);
        costRootMesh.rotation = Vector3.Zero();
        costRootMesh.scaling = new Vector3(8.0, 8, 8);

        this.setupCostStructureMeshes(result.meshes);
        return costRootMesh;
      }
    } catch (error) {
      console.error("❌ Failed to load Cost Structure model:", error);
    }
    return null;
  }

  private setupBMCMeshes(meshes: any[]) {
    const correctLabelMapping: Record<number, { color: Color3; name: string }> = {
      0: { color: new Color3(0.07, 0.07, 0.07), name: "Value Propositions" },
      1: { color: new Color3(0.07, 0.07, 0.07), name: "Key Partners" },
      2: { color: new Color3(0.07, 0.07, 0.07), name: "Customer Segments" },
      3: { color: new Color3(0.07, 0.07, 0.07), name: "Key Resources" },
      4: { color: new Color3(0.07, 0.07, 0.07), name: "Key Activities" },
      5: { color: new Color3(0.07, 0.07, 0.07), name: "CustomerChannels" },
      6: { color: new Color3(0.07, 0.07, 0.07), name: "Customer Relationships" },
      7: { color: new Color3(0.07, 0.07, 0.07), name: "Cost Structure" },
      8: { color: new Color3(0.07, 0.07, 0.07), name: "Revenue Streams" },
    };

    let sectionIndex = 0;
    meshes.forEach((mesh, index) => {
      if (mesh.material && mesh.name !== "__root__") {
        const section = correctLabelMapping[sectionIndex] || correctLabelMapping[0];
        const baseColor = section.color;
        const sectionName = section.name;
        
        (mesh as any).bmcSectionName = sectionName;
        
        const sectionMaterial = new StandardMaterial(`bmcSection_${index}`, this.scene) as any;
        sectionMaterial.diffuseColor = baseColor;
        sectionMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        sectionMaterial.specularPower = 32;
        sectionMaterial.baseColor = baseColor;
        (sectionMaterial as any).originalBaseColor = baseColor.clone();
        (sectionMaterial as any).originalDiffuseColor = baseColor.clone();
        
        mesh.material = sectionMaterial;
        mesh.receiveShadows = true;
        
        (mesh as any).originalColor = baseColor.clone();
        (mesh as any).originalMaterial = sectionMaterial;
        (mesh as any).isClicked = false;

        this.setupMeshInteractions(mesh, sectionName);
        this.createMeshLabel(mesh, sectionName);
        
        if (this.cleanBMCRef.current) {
          this.cleanBMCRef.current.registerItem(sectionName, mesh, sectionMaterial, mesh.scaling.y);
        }
        
        sectionIndex++;
      }
    });
  }

  private setupRevenueStreamsMeshes(meshes: any[]) {
    meshes.forEach((mesh, index) => {
      if (mesh.name !== "__root__") {
        const baseColor = new Color3(0.0, 0.20, 0.12);
        const sectionMaterial = new StandardMaterial(`revenueStreams_${index}`, this.scene);
        sectionMaterial.diffuseColor = baseColor;
        sectionMaterial.specularColor = new Color3(0.1, 0.3, 0.2);
        sectionMaterial.specularPower = 32;
        mesh.material = sectionMaterial;
        
        (mesh as any).bmcSectionName = "Revenue Streams";
        (mesh as any).originalColor = baseColor.clone();
        (mesh as any).isClicked = false;
        (mesh as any).hasTexture = false;
        
        this.setupMeshInteractions(mesh, "Revenue Streams");
        this.createRevenueStreamsLabel(mesh);
        
        if (this.cleanBMCRef.current) {
          this.cleanBMCRef.current.registerItem("Revenue Streams", mesh, sectionMaterial, mesh.scaling.y);
        }
      }
    });
  }

  private setupCostStructureMeshes(meshes: any[]) {
    meshes.forEach((mesh, index) => {
      if (mesh.name !== "__root__") {
        const baseColor = new Color3(0.35, 0.0, 0.0);
        const sectionMaterial = new StandardMaterial(`costStructure_${index}`, this.scene);
        sectionMaterial.diffuseColor = baseColor;
        sectionMaterial.specularColor = new Color3(0.3, 0.1, 0.1);
        sectionMaterial.specularPower = 32;
        mesh.material = sectionMaterial;
        
        (mesh as any).bmcSectionName = "Cost Structure";
        (mesh as any).originalColor = baseColor.clone();
        (mesh as any).isClicked = false;
        (mesh as any).hasTexture = false;
        
        this.setupMeshInteractions(mesh, "Cost Structure");
        this.createCostStructureLabel(mesh);
        
        if (this.cleanBMCRef.current) {
          this.cleanBMCRef.current.registerItem("Cost Structure", mesh, sectionMaterial, mesh.scaling.y);
        }
      }
    });
  }

  private setupMeshInteractions(mesh: any, sectionName: string) {
    if (!mesh.actionManager) {
      mesh.actionManager = new ActionManager(this.scene);
      mesh.isPickable = true;
    }
    
    // Hover handlers
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
      if (this.cleanBMCRef.current) {
        this.cleanBMCRef.current.onHover(sectionName, true);
      }
    }));
    
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
      if (this.cleanBMCRef.current) {
        this.cleanBMCRef.current.onHover(sectionName, false);
      }
    }));
    
    // Click handlers
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
      if (this.cleanBMCRef.current) {
        this.cleanBMCRef.current.onSelect(sectionName);
      }
    }));
  }

  private createMeshLabel(mesh: any, sectionName: string) {
    // Implementation specific to each section type
    // This would contain the label creation logic for each BMC section
    console.log(`Creating label for ${sectionName}`);
  }

  private createRevenueStreamsLabel(mesh: any) {
    const boundingInfo = mesh.getBoundingInfo();
    const center = boundingInfo.boundingBox.center;
    const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
    
    const labelWidth = size.x * 0.65;
    const labelHeight = (labelWidth * 0.25) * 2.0;
    
    const labelPlane = MeshBuilder.CreatePlane("revenueStreamsLabel", {
      width: labelWidth,
      height: labelHeight
    }, this.scene);
    
    labelPlane.position.x = center.x;
    labelPlane.position.y = center.y + size.y * 0.6;
    labelPlane.position.z = center.z;
    labelPlane.rotation.x = Math.PI / 2;
    labelPlane.rotation.y = -Math.PI / 2;
    
    const labelMaterial = new StandardMaterial("revenueStreamsLabelMat", this.scene);
    const labelTexture = new Texture("/textures/Label_RevenueStreams.png", this.scene);
    labelTexture.hasAlpha = true;
    
    labelMaterial.diffuseTexture = labelTexture;
    labelMaterial.emissiveTexture = labelTexture;
    labelMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
    labelMaterial.useAlphaFromDiffuseTexture = true;
    labelMaterial.disableLighting = false;
    
    labelPlane.material = labelMaterial;
    labelPlane.parent = mesh;
    labelPlane.isPickable = false;
    labelPlane.scaling = new Vector3(1.6, 2.08, 1.0);
    
    if (this.cleanBMCRef.current) {
      this.cleanBMCRef.current.addLabel("Revenue Streams", labelPlane, labelMaterial);
    }
  }

  private createCostStructureLabel(mesh: any) {
    const boundingInfo = mesh.getBoundingInfo();
    const center = boundingInfo.boundingBox.center;
    const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
    
    const labelWidth = size.x * 0.65;
    const labelHeight = (labelWidth * 0.25) * 2.0;
    
    const labelPlane = MeshBuilder.CreatePlane("costStructureLabel", {
      width: labelWidth,
      height: labelHeight
    }, this.scene);
    
    labelPlane.position.x = center.x;
    labelPlane.position.y = center.y + size.y * 0.6;
    labelPlane.position.z = center.z;
    labelPlane.rotation.x = Math.PI / 2;
    labelPlane.rotation.y = -Math.PI / 2;
    
    const labelMaterial = new StandardMaterial("costStructureLabelMat", this.scene);
    const labelTexture = new Texture("/textures/Label_CostStructure_1754477996199.png", this.scene);
    labelTexture.hasAlpha = true;
    
    labelMaterial.diffuseTexture = labelTexture;
    labelMaterial.emissiveTexture = labelTexture;
    labelMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
    labelMaterial.useAlphaFromDiffuseTexture = true;
    labelMaterial.disableLighting = false;
    
    labelPlane.material = labelMaterial;
    labelPlane.parent = mesh;
    labelPlane.isPickable = false;
    labelPlane.scaling = new Vector3(1.6, 2.08, 1.0);
    
    if (this.cleanBMCRef.current) {
      this.cleanBMCRef.current.addLabel("Cost Structure", labelPlane, labelMaterial);
    }
  }

  // Additional methods required by Canvas3DBabylon.tsx
  setupMainBMCInteractions() {
    // Setup interactions for main BMC components
    console.log("Setting up main BMC interactions");
  }

  applyAnimations() {
    // Apply animations to BMC models
    console.log("Applying BMC animations");
  }

  setupRevenueStreamsInteractions() {
    // Setup interactions for revenue streams
    console.log("Setting up revenue streams interactions");
  }

  setupCostStructureInteractions() {
    // Setup interactions for cost structure
    console.log("Setting up cost structure interactions");
  }
}
