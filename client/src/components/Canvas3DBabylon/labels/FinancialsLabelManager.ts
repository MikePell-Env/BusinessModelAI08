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

  // Label configurations for each Financial object - INCREASED SIZE
  private labelConfigs: Map<string, FinancialLabelConfig> = new Map([
    ['Revenue', { 
      objectName: 'Revenue', 
      texturePath: '/textures/Label_Revenue.png', 
      aspectRatio: 2.86, // Width/Height ratio from current working system
      baseWidth: 1.5 // Much larger
    }],
    ['RevenuePL', { 
      objectName: 'RevenuePL', 
      texturePath: '/textures/Label_Loss.png', 
      aspectRatio: 4.0, // Standard ratio for PL labels
      baseWidth: 1.2 // Much larger
    }],
    ['Expenses', { 
      objectName: 'Expenses', 
      texturePath: '/textures/Label_Expenses.png', 
      aspectRatio: 4.0, // Standard ratio
      baseWidth: 1.5 // Much larger
    }],
    ['ExpensesPL', { 
      objectName: 'ExpensesPL', 
      texturePath: '/textures/Label_Profit.png', 
      aspectRatio: 4.0, // Standard ratio
      baseWidth: 1.2 // Much larger
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
    
    // Position label on the front face (camera-facing side)
    // From camera perspective (alpha: π/2, beta: π/4), front face is toward negative Z
    transformNode.position = new Vector3(
      center.x,
      center.y, // Keep at mesh center height
      boundingInfo.boundingBox.minimum.z - 0.5 // Place in front of closest face to camera
    );

    // Create label plane with fixed aspect ratio
    const labelWidth = config.baseWidth;
    const labelHeight = labelWidth / config.aspectRatio;
    
    const labelPlane = MeshBuilder.CreatePlane(`${config.objectName}_BillboardLabel`, {
      width: labelWidth,
      height: labelHeight
    }, this.scene);

    // Create material with texture
    const labelMaterial = new StandardMaterial(`${config.objectName}_LabelMaterial`, this.scene);
    const labelTexture = new Texture(config.texturePath, this.scene);
    
    // Configure material for proper label display
    labelMaterial.diffuseTexture = labelTexture;
    labelMaterial.emissiveTexture = labelTexture;
    labelMaterial.emissiveColor.set(0.9, 0.9, 0.9);
    labelMaterial.useAlphaFromDiffuseTexture = true;
    labelMaterial.backFaceCulling = false;
    labelMaterial.alpha = 1.0;

    // Apply material to plane
    labelPlane.material = labelMaterial;

    // Make label always face camera (billboard behavior)
    labelPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;

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
    
    // Update transform position (label size remains unchanged)
    transformNode.position.x = center.x;
    transformNode.position.y = center.y; // Keep at mesh center height  
    transformNode.position.z = boundingInfo.boundingBox.minimum.z - 0.5; // Front of closest face

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