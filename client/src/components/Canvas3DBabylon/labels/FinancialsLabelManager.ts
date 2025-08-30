import { Scene, Vector3, Mesh, StandardMaterial, Texture, TransformNode, MeshBuilder, AbstractMesh, Color3 } from '@babylonjs/core';
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
    this.createGeometryLabel(mesh, config);
    debugLog.info('financials-labels', `Registered ${mesh.name} for geometry labeling`);
  }

  /**
   * Create geometry-positioned label for Financial objects
   */
  private createGeometryLabel(mesh: AbstractMesh, config: FinancialLabelConfig): void {
    // Calculate position based on mesh bounds and object type
    const boundingInfo = mesh.getBoundingInfo();
    const center = boundingInfo.boundingBox.center;
    const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
    
    // Create label plane with proper sizing for Financial objects
    const labelWidth = config.baseWidth * 0.8; // Slightly smaller for geometry placement
    const labelHeight = labelWidth / config.aspectRatio;
    
    const labelPlane = MeshBuilder.CreatePlane(`${config.objectName}_Label`, {
      width: labelWidth,
      height: labelHeight
    }, this.scene);

    // Position based on object type and geometry bounds
    let labelPosition: Vector3;
    
    if (config.objectName === 'Revenue') {
      // Revenue: Position on front face, centered
      labelPosition = new Vector3(
        center.x, 
        center.y, 
        center.z + (size.z * 0.51) // Front face
      );
      labelPlane.rotation.x = 0; // Face forward
    } else if (config.objectName === 'RevenuePL') {
      // RevenuePL (Loss): Position on front face, centered
      labelPosition = new Vector3(
        center.x, 
        center.y, 
        center.z + (size.z * 0.51) // Front face
      );
      labelPlane.rotation.x = 0; // Face forward
    } else if (config.objectName === 'Expenses') {
      // Expenses: Position on front face, centered
      labelPosition = new Vector3(
        center.x, 
        center.y, 
        center.z + (size.z * 0.51) // Front face
      );
      labelPlane.rotation.x = 0; // Face forward
    } else if (config.objectName === 'ExpensesPL') {
      // ExpensesPL (Profit): Position on front face, centered
      labelPosition = new Vector3(
        center.x, 
        center.y, 
        center.z + (size.z * 0.51) // Front face
      );
      labelPlane.rotation.x = 0; // Face forward
    } else {
      // Default: top face positioning
      labelPosition = new Vector3(
        center.x, 
        center.y + (size.y * 0.6), 
        center.z
      );
      labelPlane.rotation.x = Math.PI / 2; // Flat on top
    }

    labelPlane.position = labelPosition;

    // Create material with texture
    const labelMaterial = new StandardMaterial(`${config.objectName}_LabelMat`, this.scene);
    const labelTexture = new Texture(config.texturePath, this.scene);
    labelTexture.hasAlpha = true;
    
    labelMaterial.diffuseTexture = labelTexture;
    labelMaterial.emissiveTexture = labelTexture;
    labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8); // Brighter for front-facing visibility
    labelMaterial.useAlphaFromDiffuseTexture = true;
    labelMaterial.disableLighting = true;
    labelMaterial.backFaceCulling = false;

    labelPlane.material = labelMaterial;
    labelPlane.isPickable = false;

    // Store references without transform node (direct positioning)
    this.labelMeshes.set(config.objectName, labelPlane);
    this.labelMaterials.set(config.objectName, labelMaterial);

    debugLog.info('financials-labels', 
      `Created geometry label for ${config.objectName} at position (${labelPosition.x.toFixed(3)}, ${labelPosition.y.toFixed(3)}, ${labelPosition.z.toFixed(3)})`
    );
  }

  /**
   * Update label position when object moves or scales (maintain geometry positioning)
   */
  public updateLabelPosition(objectName: string): void {
    const mesh = this.objectMeshes.get(objectName);
    const labelPlane = this.labelMeshes.get(objectName);
    
    if (!mesh || !labelPlane) {
      debugLog.warn('financials-labels', `Cannot update label position for ${objectName} - missing mesh or label`);
      return;
    }

    // Recalculate position based on current mesh bounds (accounts for scaling)
    const boundingInfo = mesh.getBoundingInfo();
    const center = boundingInfo.boundingBox.center;
    const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
    
    // Update label position based on object type
    if (objectName === 'Revenue' || objectName === 'RevenuePL' || 
        objectName === 'Expenses' || objectName === 'ExpensesPL') {
      // Front face positioning for all Financial objects
      labelPlane.position.x = center.x;
      labelPlane.position.y = center.y;
      labelPlane.position.z = center.z + (size.z * 0.51); // Front face
    } else {
      // Default: top face positioning
      labelPlane.position.x = center.x;
      labelPlane.position.y = center.y + (size.y * 0.6);
      labelPlane.position.z = center.z;
    }

    debugLog.verbose('financials-labels', 
      `Updated ${objectName} label position: (${labelPlane.position.x.toFixed(3)}, ${labelPlane.position.y.toFixed(3)}, ${labelPlane.position.z.toFixed(3)})`
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
    
    this.labelMeshes.clear();
    this.labelMaterials.clear();
    this.objectMeshes.clear();

    debugLog.info('financials-labels', 'FinancialsLabelManager disposed');
  }
}