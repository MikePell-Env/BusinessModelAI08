/**
 * Envisioner Foundation Platform
 * 
 * Contains the persistent base components that remain constant across all template switches:
 * - Ground plane with powder blue grid
 * - Rails and borders
 * - Internal/External labels
 * - Lighting system
 * - Core interaction handlers
 * 
 * This foundation is created once and reused by all 4DVL templates.
 */

import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  FresnelParameters
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';
import { MATERIAL_COLORS } from '../constants/BMCConstants';
import { enhanceLabelTexture } from '../utils/BMCUtilities';

export interface EnvisionerFoundationConfig {
  groundPlane: {
    width: number;
    height: number;
    gridColor: string;
    backgroundColor: string;
  };
  rails: {
    enabled: boolean;
    color: string;
    thickness: number;
  };
  labels: {
    internal: { text: string; color: string; };
    external: { text: string; color: string; };
    divider: { text: string; color: string; };
  };
  lighting: {
    ambient: { color: Color3; intensity: number; };
    directional: { color: Color3; intensity: number; direction: Vector3; };
  };
}

/**
 * Default configuration for the Envisioner Foundation
 */
export const DEFAULT_FOUNDATION_CONFIG: EnvisionerFoundationConfig = {
  groundPlane: {
    width: 20,
    height: 14,
    gridColor: "#FFFFFF",
    backgroundColor: "#a7dbfc"
  },
  rails: {
    enabled: true,
    color: "#606060", // FRAME_GREY as default
    thickness: 0.15
  },
  labels: {
    internal: { text: "Internal", color: "#999999" },
    external: { text: "External", color: "#999999" },
    divider: { text: "Partners | Activities | Resources | Propositions | Relationships | Channels | Segments", color: "#999999" }
  },
  lighting: {
    ambient: { color: new Color3(0.8, 0.8, 0.8), intensity: 0.6 },
    directional: { color: new Color3(1.0, 1.0, 1.0), intensity: 0.4, direction: new Vector3(-1, -1, 0) }
  }
};

/**
 * Envisioner Foundation Platform
 * 
 * Creates and manages the persistent base components that remain constant across templates.
 * Templates draw their 4DVL content on top of this foundation.
 */
export class EnvisionerFoundation {
  private scene: Scene;
  private masterTransform: TransformNode;
  private config: EnvisionerFoundationConfig;
  private foundationComponents: Map<string, any> = new Map();

  constructor(scene: Scene, masterTransform: TransformNode, config: EnvisionerFoundationConfig = DEFAULT_FOUNDATION_CONFIG) {
    this.scene = scene;
    this.masterTransform = masterTransform;
    this.config = config;
  }

  /**
   * Initialize the complete foundation platform
   */
  public async initialize(): Promise<void> {
    debugLog.info('envisioner', '🏗️ Initializing Envisioner Foundation Platform...');
    
    await this.createGroundPlane();
    await this.createRails();
    // Labels removed - they should be template-specific, not foundation-level
    await this.setupLighting();
    
    debugLog.info('envisioner', '✅ Envisioner Foundation Platform initialized');
  }

  /**
   * Create the powder blue ground plane with white grid
   */
  private async createGroundPlane(): Promise<void> {
    const ground = MeshBuilder.CreateGround("envisionerGround", { 
      width: this.config.groundPlane.width, 
      height: this.config.groundPlane.height 
    }, this.scene);
    ground.parent = this.masterTransform;

    // Create dynamic texture for powder blue grid pattern with white lines
    const gridTexture = new DynamicTexture("envisionerGridTexture", { width: 1024, height: 1024 }, this.scene, false);
    const gridContext = gridTexture.getContext();

    // Fill with custom powder blue background
    gridContext.fillStyle = this.config.groundPlane.backgroundColor;
    gridContext.fillRect(0, 0, 1024, 1024);

    // Draw white grid lines
    gridContext.strokeStyle = this.config.groundPlane.gridColor;
    gridContext.lineWidth = 1;

    // Draw vertical lines (spacing every 32 pixels)
    for (let i = 0; i <= 1024; i += 32) {
      gridContext.beginPath();
      gridContext.moveTo(i, 0);
      gridContext.lineTo(i, 1024);
      gridContext.stroke();
    }

    // Draw horizontal lines (spacing every 32 pixels)
    for (let i = 0; i <= 1024; i += 32) {
      gridContext.beginPath();
      gridContext.moveTo(0, i);
      gridContext.lineTo(1024, i);
      gridContext.stroke();
    }

    gridTexture.update();

    // Apply powder blue material with white grid texture to ground
    const groundMaterial = new StandardMaterial("envisionerGroundMaterial", this.scene);
    groundMaterial.diffuseTexture = gridTexture;
    groundMaterial.specularColor = MATERIAL_COLORS.GROUND_SPECULAR;
    groundMaterial.specularPower = 64;
    groundMaterial.alpha = 0.5;
    groundMaterial.backFaceCulling = false;
    ground.material = groundMaterial;

    ground.isPickable = false; // Foundation components are not interactive
    this.foundationComponents.set('ground', ground);
    
    debugLog.verbose('envisioner', '🌍 Ground plane created');
  }

  /**
   * Create the rails around the ground plane
   */
  private async createRails(): Promise<void> {
    if (!this.config.rails.enabled) return;

    const railMaterial = new StandardMaterial("envisionerRailMaterial", this.scene);
    railMaterial.diffuseColor = Color3.FromHexString(this.config.rails.color);
    
    // Make rails reflective like shiny metal
    railMaterial.specularColor = new Color3(1.0, 1.0, 1.0); // Bright white specular highlights
    railMaterial.specularPower = 256; // Very high specular power for mirror-like reflections
    railMaterial.reflectionFresnelParameters = new FresnelParameters();
    railMaterial.reflectionFresnelParameters.bias = 0.1;
    railMaterial.reflectionFresnelParameters.power = 0.5;
    railMaterial.reflectionFresnelParameters.leftColor = Color3.White();
    railMaterial.reflectionFresnelParameters.rightColor = Color3.Black();

    // North rail (top)
    const northRail = MeshBuilder.CreateBox("envisionerNorthRail", {
      width: this.config.groundPlane.width + (this.config.rails.thickness * 2),
      height: 0.25,
      depth: this.config.rails.thickness
    }, this.scene);
    northRail.position.z = this.config.groundPlane.height / 2 + this.config.rails.thickness / 2;
    northRail.material = railMaterial;
    northRail.parent = this.masterTransform;

    // South rail (bottom)
    const southRail = MeshBuilder.CreateBox("envisionerSouthRail", {
      width: this.config.groundPlane.width + (this.config.rails.thickness * 2),
      height: 0.25,
      depth: this.config.rails.thickness
    }, this.scene);
    southRail.position.z = -(this.config.groundPlane.height / 2 + this.config.rails.thickness / 2);
    southRail.material = railMaterial;
    southRail.parent = this.masterTransform;

    // East rail (right)
    const eastRail = MeshBuilder.CreateBox("envisionerEastRail", {
      width: this.config.rails.thickness,
      height: 0.25,
      depth: this.config.groundPlane.height
    }, this.scene);
    eastRail.position.x = this.config.groundPlane.width / 2 + this.config.rails.thickness / 2;
    eastRail.material = railMaterial;
    eastRail.parent = this.masterTransform;

    // West rail (left)
    const westRail = MeshBuilder.CreateBox("envisionerWestRail", {
      width: this.config.rails.thickness,
      height: 0.25,
      depth: this.config.groundPlane.height
    }, this.scene);
    westRail.position.x = -(this.config.groundPlane.width / 2 + this.config.rails.thickness / 2);
    westRail.material = railMaterial;
    westRail.parent = this.masterTransform;

    this.foundationComponents.set('rails', { north: northRail, south: southRail, east: eastRail, west: westRail });
    debugLog.verbose('envisioner', '🛤️ Rails created');
  }

  /**
   * Clear all template-specific labels
   */
  public clearTemplateLabels(): void {
    const labelNames = ['internalLabel', 'externalLabel', 'revenueLabel', 'expensesLabel', 'verticalDividerLabel'];
    
    labelNames.forEach(labelName => {
      const component = this.foundationComponents.get(labelName);
      if (component && typeof component.dispose === 'function') {
        component.dispose();
        this.foundationComponents.delete(labelName);
        debugLog.verbose('envisioner', `🗑️ Cleared label: ${labelName}`);
      }
    });
  }

  /**
   * Create template-specific foundation labels
   */
  public async createTemplateLabels(templateName: string): Promise<void> {
    // Clear any existing template labels first
    this.clearTemplateLabels();
    
    if (templateName.toLowerCase() === 'business-model') {
      await this.createInternalLabel();
      await this.createExternalLabel();
      await this.createVerticalDividerLabel();
      debugLog.verbose('envisioner', '🏷️ BMC foundation labels created');
    } else if (templateName.toLowerCase() === 'financials') {
      // No separate labels for Financials - the ground texture already has Revenue/Expenses built in
      debugLog.verbose('envisioner', '🏷️ Financials uses ground texture labels (no separate planes)');
    }
  }

  /**
   * Create "Internal" label on the ground plane
   */
  private async createInternalLabel(): Promise<void> {
    const internalLabelPlane = MeshBuilder.CreatePlane("envisionerInternalLabel", {
      width: 1.2,
      height: 0.094
    }, this.scene);

    // Position on ground plane, moved more to the right
    internalLabelPlane.position.x = 1.5;
    internalLabelPlane.position.y = 0.001; // Directly on ground plane surface
    internalLabelPlane.position.z = -3.5;

    // Rotate to lie flat on the ground
    internalLabelPlane.rotation.x = Math.PI / 2;

    // Create material and texture for Internal label
    const internalLabelMaterial = new StandardMaterial("envisionerInternalLabelMaterial", this.scene);
    const internalLabelTexture = new DynamicTexture("envisionerInternalLabelTexture", { width: 512, height: 40 }, this.scene, false);
    const internalLabelContext = internalLabelTexture.getContext();

    // Create grey text on transparent background
    internalLabelContext.fillStyle = "transparent";
    internalLabelContext.fillRect(0, 0, 512, 40);
    internalLabelContext.fillStyle = this.config.labels.internal.color;
    internalLabelContext.font = "bold 30px Arial";
    (internalLabelContext as any).textAlign = "center";
    (internalLabelContext as any).textBaseline = "middle";
    internalLabelContext.fillText(this.config.labels.internal.text, 256, 20);

    internalLabelTexture.update();
    internalLabelTexture.hasAlpha = true;
    enhanceLabelTexture(internalLabelTexture);

    internalLabelMaterial.diffuseTexture = internalLabelTexture;
    internalLabelMaterial.emissiveTexture = internalLabelTexture;
    internalLabelMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0);
    internalLabelMaterial.alpha = 0.3;
    internalLabelMaterial.useAlphaFromDiffuseTexture = true;
    internalLabelMaterial.disableLighting = true;
    internalLabelMaterial.backFaceCulling = false;

    internalLabelPlane.material = internalLabelMaterial;
    internalLabelPlane.isPickable = false;
    internalLabelPlane.parent = this.masterTransform;

    this.foundationComponents.set('internalLabel', internalLabelPlane);
  }

  /**
   * Create "External" label on the ground plane
   */
  private async createExternalLabel(): Promise<void> {
    const externalLabelPlane = MeshBuilder.CreatePlane("envisionerExternalLabel", {
      width: 1.2,
      height: 0.094
    }, this.scene);

    // Position on ground plane on the right side
    externalLabelPlane.position.x = 8.0;
    externalLabelPlane.position.y = 0.001; // Directly on ground plane surface
    externalLabelPlane.position.z = -3.5;

    // Rotate to lie flat on the ground
    externalLabelPlane.rotation.x = Math.PI / 2;

    // Create material and texture for External label
    const externalLabelMaterial = new StandardMaterial("envisionerExternalLabelMaterial", this.scene);
    const externalLabelTexture = new DynamicTexture("envisionerExternalLabelTexture", { width: 512, height: 40 }, this.scene, false);
    const externalLabelContext = externalLabelTexture.getContext();

    // Create grey text on transparent background
    externalLabelContext.fillStyle = "transparent";
    externalLabelContext.fillRect(0, 0, 512, 40);
    externalLabelContext.fillStyle = this.config.labels.external.color;
    externalLabelContext.font = "bold 30px Arial";
    (externalLabelContext as any).textAlign = "center";
    (externalLabelContext as any).textBaseline = "middle";
    externalLabelContext.fillText(this.config.labels.external.text, 256, 20);

    externalLabelTexture.update();
    externalLabelTexture.hasAlpha = true;
    enhanceLabelTexture(externalLabelTexture);

    externalLabelMaterial.diffuseTexture = externalLabelTexture;
    externalLabelMaterial.emissiveTexture = externalLabelTexture;
    externalLabelMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0);
    externalLabelMaterial.alpha = 0.3;
    externalLabelMaterial.useAlphaFromDiffuseTexture = true;
    externalLabelMaterial.disableLighting = true;
    externalLabelMaterial.backFaceCulling = false;

    externalLabelPlane.material = externalLabelMaterial;
    externalLabelPlane.isPickable = false;
    externalLabelPlane.parent = this.masterTransform;

    this.foundationComponents.set('externalLabel', externalLabelPlane);
  }

  /**
   * Create vertical divider label in the center of the ground plane
   */
  private async createVerticalDividerLabel(): Promise<void> {
    const verticalDividerPlane = MeshBuilder.CreatePlane("envisionerVerticalDividerLabel", {
      width: 0.02,
      height: 4
    }, this.scene);

    verticalDividerPlane.position.x = 0;
    verticalDividerPlane.position.y = 0.001; // Directly on ground plane surface
    verticalDividerPlane.position.z = 0;

    // Rotate to lie flat on the ground
    verticalDividerPlane.rotation.x = Math.PI / 2;

    // Create material and texture for vertical divider label
    const verticalDividerMaterial = new StandardMaterial("envisionerVerticalDividerMaterial", this.scene);
    const verticalDividerTexture = new DynamicTexture("envisionerVerticalDividerTexture", { width: 16, height: 256 }, this.scene, false);
    const verticalDividerContext = verticalDividerTexture.getContext();

    // Create grey text on transparent background
    verticalDividerContext.fillStyle = "transparent";
    verticalDividerContext.fillRect(0, 0, 16, 256);
    verticalDividerContext.fillStyle = this.config.labels.divider.color;
    verticalDividerContext.font = "bold 16px Arial";
    (verticalDividerContext as any).textAlign = "center";
    (verticalDividerContext as any).textBaseline = "middle";

    // Split the long text and draw it vertically (much shorter divider)
    const parts = this.config.labels.divider.text.split(" | ");
    const lineHeight = 160 / (parts.length + 1); // Use only middle 160px of 256px texture
    const startY = 48; // Start 48px from top
    parts.forEach((part, index) => {
      verticalDividerContext.fillText(part, 8, startY + lineHeight * (index + 1));
    });

    verticalDividerTexture.update();
    verticalDividerTexture.hasAlpha = true;
    enhanceLabelTexture(verticalDividerTexture);

    verticalDividerMaterial.diffuseTexture = verticalDividerTexture;
    verticalDividerMaterial.emissiveTexture = verticalDividerTexture;
    verticalDividerMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0);
    verticalDividerMaterial.alpha = 0.3;
    verticalDividerMaterial.useAlphaFromDiffuseTexture = true;
    verticalDividerMaterial.disableLighting = true;
    verticalDividerMaterial.backFaceCulling = false;

    verticalDividerPlane.material = verticalDividerMaterial;
    verticalDividerPlane.isPickable = false;
    verticalDividerPlane.parent = this.masterTransform;

    this.foundationComponents.set('verticalDividerLabel', verticalDividerPlane);
  }

  /**
   * Create "Revenue" label on the ground plane for Financials template
   */
  private async createRevenueLabel(): Promise<void> {
    const revenueLabelPlane = MeshBuilder.CreatePlane("envisionerRevenueLabel", {
      width: 1.2,
      height: 0.094
    }, this.scene);

    // Position on ground plane, moved more to the right
    revenueLabelPlane.position.x = 1.5;
    revenueLabelPlane.position.y = 0.001; // Directly on ground plane surface
    revenueLabelPlane.position.z = -3.5;

    // Rotate to lie flat on the ground
    revenueLabelPlane.rotation.x = Math.PI / 2;

    // Create material and texture for Revenue label
    const revenueLabelMaterial = new StandardMaterial("envisionerRevenueLabelMaterial", this.scene);
    const revenueLabelTexture = new DynamicTexture("envisionerRevenueLabelTexture", { width: 512, height: 40 }, this.scene, false);
    const revenueLabelContext = revenueLabelTexture.getContext();

    // Create grey text on transparent background
    revenueLabelContext.fillStyle = "transparent";
    revenueLabelContext.fillRect(0, 0, 512, 40);
    revenueLabelContext.fillStyle = "#666666";
    revenueLabelContext.font = "bold 30px Arial";
    (revenueLabelContext as any).textAlign = "center";
    (revenueLabelContext as any).textBaseline = "middle";
    revenueLabelContext.fillText("Revenue", 256, 20);

    revenueLabelTexture.update();
    revenueLabelTexture.hasAlpha = true;
    enhanceLabelTexture(revenueLabelTexture);

    revenueLabelMaterial.diffuseTexture = revenueLabelTexture;
    revenueLabelMaterial.emissiveTexture = revenueLabelTexture;
    revenueLabelMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0);
    revenueLabelMaterial.alpha = 0.3;
    revenueLabelMaterial.useAlphaFromDiffuseTexture = true;
    revenueLabelMaterial.disableLighting = true;
    revenueLabelMaterial.backFaceCulling = false;

    revenueLabelPlane.material = revenueLabelMaterial;
    revenueLabelPlane.isPickable = false;
    revenueLabelPlane.parent = this.masterTransform;

    this.foundationComponents.set('revenueLabel', revenueLabelPlane);
  }

  /**
   * Create "Expenses" label on the ground plane for Financials template
   */
  private async createExpensesLabel(): Promise<void> {
    const expensesLabelPlane = MeshBuilder.CreatePlane("envisionerExpensesLabel", {
      width: 1.2,
      height: 0.094
    }, this.scene);

    // Position on ground plane on the right side
    expensesLabelPlane.position.x = 8.0;
    expensesLabelPlane.position.y = 0.001; // Directly on ground plane surface
    expensesLabelPlane.position.z = -3.5;

    // Rotate to lie flat on the ground
    expensesLabelPlane.rotation.x = Math.PI / 2;

    // Create material and texture for Expenses label
    const expensesLabelMaterial = new StandardMaterial("envisionerExpensesLabelMaterial", this.scene);
    const expensesLabelTexture = new DynamicTexture("envisionerExpensesLabelTexture", { width: 512, height: 40 }, this.scene, false);
    const expensesLabelContext = expensesLabelTexture.getContext();

    // Create grey text on transparent background
    expensesLabelContext.fillStyle = "transparent";
    expensesLabelContext.fillRect(0, 0, 512, 40);
    expensesLabelContext.fillStyle = "#666666";
    expensesLabelContext.font = "bold 30px Arial";
    (expensesLabelContext as any).textAlign = "center";
    (expensesLabelContext as any).textBaseline = "middle";
    expensesLabelContext.fillText("Expenses", 256, 20);

    expensesLabelTexture.update();
    expensesLabelTexture.hasAlpha = true;
    enhanceLabelTexture(expensesLabelTexture);

    expensesLabelMaterial.diffuseTexture = expensesLabelTexture;
    expensesLabelMaterial.emissiveTexture = expensesLabelTexture;
    expensesLabelMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0);
    expensesLabelMaterial.alpha = 0.3;
    expensesLabelMaterial.useAlphaFromDiffuseTexture = true;
    expensesLabelMaterial.disableLighting = true;
    expensesLabelMaterial.backFaceCulling = false;

    expensesLabelPlane.material = expensesLabelMaterial;
    expensesLabelPlane.isPickable = false;
    expensesLabelPlane.parent = this.masterTransform;

    this.foundationComponents.set('expensesLabel', expensesLabelPlane);
  }

  /**
   * Setup the lighting system
   */
  private async setupLighting(): Promise<void> {
    // Ambient lighting
    const ambientLight = new HemisphericLight("envisionerAmbientLight", Vector3.Up(), this.scene);
    ambientLight.diffuse = this.config.lighting.ambient.color;
    ambientLight.intensity = this.config.lighting.ambient.intensity;

    // Directional lighting
    const directionalLight = new DirectionalLight("envisionerDirectionalLight", this.config.lighting.directional.direction, this.scene);
    directionalLight.diffuse = this.config.lighting.directional.color;
    directionalLight.intensity = this.config.lighting.directional.intensity;

    this.foundationComponents.set('lights', { ambient: ambientLight, directional: directionalLight });
    debugLog.verbose('envisioner', '💡 Lighting system setup');
  }

  /**
   * Get a foundation component by name
   */
  public getComponent(name: string): any {
    return this.foundationComponents.get(name);
  }

  /**
   * Get all foundation components
   */
  public getAllComponents(): Map<string, any> {
    return new Map(this.foundationComponents);
  }

  /**
   * Update foundation configuration
   */
  public updateConfig(newConfig: Partial<EnvisionerFoundationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // TODO: Apply configuration changes to existing components
  }

  /**
   * Dispose of all foundation components
   */
  public dispose(): void {
    this.foundationComponents.forEach((component, name) => {
      if (component && typeof component.dispose === 'function') {
        component.dispose();
      } else if (component && typeof component === 'object') {
        // Handle composite components like rails
        Object.values(component).forEach((subComponent: any) => {
          if (subComponent && typeof subComponent.dispose === 'function') {
            subComponent.dispose();
          }
        });
      }
    });
    this.foundationComponents.clear();
    debugLog.verbose('envisioner', '🗑️ Foundation components disposed');
  }
}