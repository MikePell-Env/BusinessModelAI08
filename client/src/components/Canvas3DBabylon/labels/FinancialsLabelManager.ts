import { Scene, Vector3, Mesh, StandardMaterial, Texture, TransformNode, MeshBuilder, AbstractMesh } from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

/**
 * Manages billboard labels for Financials objects that maintain aspect ratio
 * independent of geometry scaling
 */
export interface FinancialLabelConfig {
  objectName: string;
  texturePath: string;
  aspectRatio: number;
  baseWidth: number;
}

export class FinancialsLabelManager {
  private scene: Scene;
  private labelTransforms: Map<string, TransformNode> = new Map();
  private labelMeshes: Map<string, Mesh> = new Map();
  private labelMaterials: Map<string, StandardMaterial> = new Map();
  private objectMeshes: Map<string, AbstractMesh> = new Map();

  // Label configurations for each Financial object - USING WORKING APPROACH
  private labelConfigs: Map<string, FinancialLabelConfig> = new Map([
    ['Revenue', { 
      objectName: 'Revenue', 
      texturePath: '/textures/Label_Revenue.png', 
      aspectRatio: 2.86,
      baseWidth: 2.0 // Based on working Revenue Streams example
    }],
    ['RevenuePL', { 
      objectName: 'RevenuePL', 
      texturePath: '/textures/Label_Loss.png', 
      aspectRatio: 4.0,
      baseWidth: 1.5
    }],
    ['Expenses', { 
      objectName: 'Expenses', 
      texturePath: '/textures/Label_Expenses.png', 
      aspectRatio: 4.0,
      baseWidth: 2.0 // Based on working Cost Structure example
    }],
    ['ExpensesPL', { 
      objectName: 'ExpensesPL', 
      texturePath: '/textures/Label_Profit.png', 
      aspectRatio: 4.0,
      baseWidth: 1.5
    }]
  ]);

  constructor(scene: Scene) {
    this.scene = scene;
    debugLog.info('financials-labels', 'FinancialsLabelManager initialized');
  }

  /**
   * Register a financial object mesh for label management
   */
  public registerFinancialObject(mesh: AbstractMesh): void {
    const config = this.labelConfigs.get(mesh.name);
    if (!config) {
      debugLog.warn('financials-labels', `No label config found for ${mesh.name}`);
      return;
    }

    this.objectMeshes.set(mesh.name, mesh);
    this.createBillboardLabel(mesh, config);
    debugLog.info('financials-labels', `Registered ${mesh.name} for billboard labeling`);
  }

  /**
   * Create a billboard label that maintains aspect ratio
   */
  private createBillboardLabel(mesh: AbstractMesh, config: FinancialLabelConfig): void {
    // Create transform node for positioning (will not be scaled)
    const transformNode = new TransformNode(`${config.objectName}_LabelTransform`, this.scene);
    
    // Calculate initial position based on mesh bounds
    const boundingInfo = mesh.getBoundingInfo();
    const center = boundingInfo.boundingBox.center;
    const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
    
    // Position label using WORKING approach from successful Revenue Streams/Cost Structure labels
    // Place on top face like other working labels in the system
    transformNode.position = new Vector3(
      center.x, // Center horizontally
      center.y + (size.y * 0.6), // Position on top face (like working examples)
      center.z // Center vertically (Z-axis)
    );

    // Create label plane using WORKING sizing approach
    const labelWidth = config.baseWidth;
    const labelHeight = labelWidth / config.aspectRatio;
    
    const labelPlane = MeshBuilder.CreatePlane(`${config.objectName}_Label`, {
      width: labelWidth,
      height: labelHeight
    }, this.scene);

    // Rotate to be flat on top (like working examples)
    labelPlane.rotation.x = Math.PI / 2;

    // Create material with texture using WORKING approach
    const labelMaterial = new StandardMaterial(`${config.objectName}_LabelMat`, this.scene);
    const labelTexture = new Texture(config.texturePath, this.scene);
    labelTexture.hasAlpha = true;
    
    // Use same material setup as working labels
    labelMaterial.diffuseTexture = labelTexture;
    labelMaterial.emissiveTexture = labelTexture;
    labelMaterial.emissiveColor = new Color3(0.4, 0.4, 0.4);
    labelMaterial.useAlphaFromDiffuseTexture = true;
    labelMaterial.disableLighting = true;
    labelMaterial.backFaceCulling = false;

    // Apply material to plane
    labelPlane.material = labelMaterial;

    // Apply scaling like working examples (Revenue Streams uses scaling)
    labelPlane.scaling = new Vector3(1.6, 2.08, 1.0);

    // Parent label to transform node
    labelPlane.parent = transformNode;
    labelPlane.position = Vector3.Zero(); // Local position relative to transform

    // Store references
    this.labelTransforms.set(config.objectName, transformNode);
    this.labelMeshes.set(config.objectName, labelPlane);
    this.labelMaterials.set(config.objectName, labelMaterial);

    debugLog.info('financials-labels', 
      `Created billboard label for ${config.objectName}: ${labelWidth.toFixed(3)} x ${labelHeight.toFixed(3)}, aspect: ${config.aspectRatio}`
    );
  }

  /**
   * Update label position when object moves or scales (but maintain label size)
   */
  public updateLabelPosition(objectName: string): void {
    const mesh = this.objectMeshes.get(objectName);
    const transformNode = this.labelTransforms.get(objectName);
    
    if (!mesh || !transformNode) {
      debugLog.warn('financials-labels', `Cannot update label position for ${objectName} - missing mesh or transform`);
      return;
    }

    // Recalculate position based on current mesh bounds (accounts for scaling)
    const boundingInfo = mesh.getBoundingInfo();
    const center = boundingInfo.boundingBox.center;
    const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
    
    // Update transform position using WORKING approach
    transformNode.position.x = center.x; // Center horizontally
    transformNode.position.y = center.y + (size.y * 0.6); // Position on top face
    transformNode.position.z = center.z; // Center vertically (Z-axis)

    debugLog.verbose('financials-labels', 
      `Updated ${objectName} label position: (${transformNode.position.x.toFixed(3)}, ${transformNode.position.y.toFixed(3)}, ${transformNode.position.z.toFixed(3)})`
    );
  }

  /**
   * Update all registered label positions
   */
  public updateAllLabelPositions(): void {
    this.objectMeshes.forEach((mesh, objectName) => {
      this.updateLabelPosition(objectName);
    });
  }

  /**
   * Hide original labels in the GLB model to prevent conflicts
   */
  public hideOriginalLabels(meshes: AbstractMesh[]): void {
    meshes.forEach(mesh => {
      // Look for mesh names that might be original labels
      if (mesh.name.toLowerCase().includes('label') || 
          mesh.name.toLowerCase().includes('text') ||
          mesh.name.toLowerCase().includes('font')) {
        
        // Hide the original label by making it invisible
        mesh.isVisible = false;
        debugLog.info('financials-labels', `Hidden original label mesh: ${mesh.name}`);
      }
    });
  }

  /**
   * Clean up label resources
   */
  public dispose(): void {
    this.labelMeshes.forEach(mesh => mesh.dispose());
    this.labelMaterials.forEach(material => material.dispose());
    this.labelTransforms.forEach(transform => transform.dispose());
    
    this.labelMeshes.clear();
    this.labelMaterials.clear();
    this.labelTransforms.clear();
    this.objectMeshes.clear();

    debugLog.info('financials-labels', 'FinancialsLabelManager disposed');
  }
}