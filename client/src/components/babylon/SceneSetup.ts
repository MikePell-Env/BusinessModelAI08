
import { Scene, HemisphericLight, DirectionalLight, Vector3, Color3, Color4, MeshBuilder, StandardMaterial, DynamicTexture, ActionManager, ExecuteCodeAction } from '@babylonjs/core';

export class SceneSetup {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  setupEnvironment() {
    // Set background color
    this.scene.clearColor = new Color4(233/255, 236/255, 239/255, 1.0);
    
    // Setup lighting
    this.setupLighting();
    
    // Create ground and environment
    this.createGround();
    this.createRails();
    this.createLabels();
    
    // Create environment
    const environmentHelper = this.scene.createDefaultEnvironment({
      createGround: false,
      createSkybox: false,
      skyboxSize: 100,
      skyboxColor: new Color3(0.95, 0.95, 0.97),
      groundColor: new Color3(0.9, 0.9, 0.9)
    });
    
    if (environmentHelper) {
      this.scene.environmentIntensity = 0.5;
    }
  }

  private setupLighting() {
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), this.scene);
    hemisphericLight.intensity = 1.2;
    hemisphericLight.diffuse = new Color3(0.9, 0.9, 0.9);
    hemisphericLight.specular = new Color3(0.2, 0.2, 0.2);
    
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), this.scene);
    directionalLight.intensity = 1.8;
    directionalLight.diffuse = new Color3(1, 1, 1);
    directionalLight.specular = new Color3(0.3, 0.3, 0.3);
  }

  private createGround() {
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, this.scene);
    
    const gridTexture = new DynamicTexture("gridTexture", {width: 1024, height: 1024}, this.scene, false);
    const gridContext = gridTexture.getContext();
    
    gridContext.fillStyle = "#a7dbfc";
    gridContext.fillRect(0, 0, 1024, 1024);
    
    gridContext.strokeStyle = "#FFFFFF";
    gridContext.lineWidth = 1;
    
    for (let i = 0; i <= 1024; i += 32) {
      gridContext.beginPath();
      gridContext.moveTo(i, 0);
      gridContext.lineTo(i, 1024);
      gridContext.stroke();
    }
    
    for (let i = 0; i <= 1024; i += 32) {
      gridContext.beginPath();
      gridContext.moveTo(0, i);
      gridContext.lineTo(1024, i);
      gridContext.stroke();
    }
    
    gridTexture.update();
    
    const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
    groundMaterial.diffuseTexture = gridTexture;
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.2);
    groundMaterial.specularPower = 64;
    groundMaterial.alpha = 0.5;
    ground.material = groundMaterial;

    // Add click detection for background
    ground.actionManager = new ActionManager(this.scene);
    ground.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
      console.log('Ground clicked - clearing selection');
      // This will be handled by the main component
    }));

    return ground;
  }

  private createRails() {
    const railHeight = 0.15;
    const railWidth = 0.2;
    const railColor = new Color3(0.3, 0.3, 0.3);
    
    const railMaterial = new StandardMaterial("railMaterial", this.scene);
    railMaterial.diffuseColor = railColor;
    railMaterial.specularColor = new Color3(0, 0, 0);
    
    // Create four rails
    const positions = [
      { pos: new Vector3(0, railHeight/2, -7 - railWidth/2), size: { width: 20 + railWidth*2, height: railHeight, depth: railWidth } },
      { pos: new Vector3(0, railHeight/2, 7 + railWidth/2), size: { width: 20 + railWidth*2, height: railHeight, depth: railWidth } },
      { pos: new Vector3(10 + railWidth/2, railHeight/2, 0), size: { width: railWidth, height: railHeight, depth: 14 } },
      { pos: new Vector3(-10 - railWidth/2, railHeight/2, 0), size: { width: railWidth, height: railHeight, depth: 14 } }
    ];

    positions.forEach((rail, index) => {
      const railMesh = MeshBuilder.CreateBox(`rail_${index}`, rail.size, this.scene);
      railMesh.position = rail.pos;
      railMesh.material = railMaterial;
    });
  }

  private createLabels() {
    this.createInternalLabel();
    this.createExternalLabel();
    this.createVerticalDividerLabel();
  }

  private createInternalLabel() {
    const internalLabelPlane = MeshBuilder.CreatePlane("internalLabel", {
      width: 4.0,
      height: 1.28
    }, this.scene);
    
    internalLabelPlane.position.x = -5.0;
    internalLabelPlane.position.y = 0.001;
    internalLabelPlane.position.z = -6.2;
    internalLabelPlane.rotation.x = Math.PI / 2;
    
    const internalLabelMaterial = new StandardMaterial("internalLabelMat", this.scene);
    const internalLabelTexture = new Texture("/textures/Labels_internal_grey.png", this.scene);
    internalLabelTexture.hasAlpha = true;
    
    internalLabelMaterial.diffuseTexture = internalLabelTexture;
    internalLabelMaterial.emissiveTexture = internalLabelTexture;
    internalLabelMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0);
    internalLabelMaterial.alpha = 0.3;
    internalLabelMaterial.useAlphaFromDiffuseTexture = true;
    internalLabelMaterial.disableLighting = true;
    
    internalLabelPlane.material = internalLabelMaterial;
    internalLabelPlane.isPickable = false;
  }

  private createExternalLabel() {
    const externalLabelPlane = MeshBuilder.CreatePlane("externalLabel", {
      width: 4.0,
      height: 1.28
    }, this.scene);
    
    externalLabelPlane.position.x = 5.0;
    externalLabelPlane.position.y = 0.001;
    externalLabelPlane.position.z = -6.2;
    externalLabelPlane.rotation.x = Math.PI / 2;
    
    const externalLabelMaterial = new StandardMaterial("externalLabelMat", this.scene);
    const externalLabelTexture = new Texture("/textures/Labels_external_grey.png", this.scene);
    externalLabelTexture.hasAlpha = true;
    
    externalLabelMaterial.diffuseTexture = externalLabelTexture;
    externalLabelMaterial.emissiveTexture = externalLabelTexture;
    externalLabelMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0);
    externalLabelMaterial.alpha = 0.3;
    externalLabelMaterial.useAlphaFromDiffuseTexture = true;
    externalLabelMaterial.disableLighting = true;
    
    externalLabelPlane.material = externalLabelMaterial;
    externalLabelPlane.isPickable = false;
  }

  private createVerticalDividerLabel() {
    const verticalDividerPlane = MeshBuilder.CreatePlane("verticalDividerLabel", {
      width: 0.02,
      height: 13.0
    }, this.scene);
    
    verticalDividerPlane.position.x = 0.0;
    verticalDividerPlane.position.y = 0.001;
    verticalDividerPlane.position.z = 0.0;
    verticalDividerPlane.rotation.x = Math.PI / 2;
    
    const verticalDividerMaterial = new StandardMaterial("verticalDividerMat", this.scene);
    const verticalDividerTexture = new Texture("/textures/Labels_vertical_divider.png", this.scene);
    verticalDividerTexture.hasAlpha = true;
    
    verticalDividerMaterial.diffuseTexture = verticalDividerTexture;
    verticalDividerMaterial.emissiveTexture = verticalDividerTexture;
    verticalDividerMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0);
    verticalDividerMaterial.alpha = 0.3;
    verticalDividerMaterial.useAlphaFromDiffuseTexture = true;
    verticalDividerMaterial.disableLighting = true;
    
    verticalDividerPlane.material = verticalDividerMaterial;
    verticalDividerPlane.isPickable = false;
  }
}
