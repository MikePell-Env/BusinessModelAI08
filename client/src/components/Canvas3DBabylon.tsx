import React, { useRef, useEffect } from 'react';
import { 
  Engine, 
  Scene, 
  ArcRotateCamera,
  FreeCamera, 
  HemisphericLight, 
  DirectionalLight,
  PointLight,
  MeshBuilder, 
  PBRMetallicRoughnessMaterial, 
  StandardMaterial,
  Color3, 
  Color4,
  Vector3, 
  Mesh, 
  ActionManager, 
  ExecuteCodeAction,
  CubeTexture,
  Texture,
  DynamicTexture,
  SceneLoader,
  AbstractMesh,
  Matrix,
  TransformNode,
  LinesMesh
} from '@babylonjs/core';
import { 
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Control
} from '@babylonjs/gui';
import '@babylonjs/loaders/glTF';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';
import { useCanvas } from '@/lib/stores/useCanvas';
import { BMCComponentName, BMC_COMPONENTS } from '@/types/bmcState';

interface Canvas3DBabylonProps {
  canvas: BusinessModelCanvas;
  isTransitioning?: boolean;
}



// UNIFIED BMC TRANSFORMATION SYSTEM
// Handles coordinate system complexities and provides consistent interface for all BMC objects

/**
 * BMC Coordinate System Documentation:
 * 
 * WORLD COORDINATE SYSTEM (Babylon.js Standard):
 * - X-axis: RIGHT = positive, LEFT = negative 
 * - Y-axis: UP = positive, DOWN = negative
 * - Z-axis: FORWARD = positive, BACKWARD = negative
 * 
 * BMC SCREEN LAYOUT MAPPING:
 * - X-axis: negative = LEFT side of screen, positive = RIGHT side of screen
 * - Z-axis: negative = UPPER part of screen, positive = LOWER part of screen
 * - Y-axis: height above ground plane (Y=0.1 is standard base height)
 * 
 * OBJECT TYPES IN SYSTEM:
 * 1. Main BMC Model: Single GLB with 7 sections, uses transformNode scaling
 * 2. Revenue Streams: Separate GLB positioned at (-0.221, 0.1, -10.5) 
 * 3. Cost Structure: Separate GLB positioned at (-10.1, 0.1, -10.5)
 * 
 * COORDINATE REFERENCE POINTS:
 * - Customer Channels left edge: X ≈ 0.467
 * - Revenue Streams aligns with Customer Channels left edge
 * - Cost Structure spans from Key Partners to Key Resources alignment
 */

interface BMCObjectDescriptor {
  mesh: AbstractMesh;
  sectionName: string;
  objectType: 'main_bmc' | 'separate_glb';
  transformNode?: TransformNode; // Only for main BMC sections
  rootMesh?: AbstractMesh; // Only for separate GLB objects
}

class UnifiedBMCTransformSystem {
  private objects = new Map<string, BMCObjectDescriptor>();
  
  // Register objects in the unified system
  registerObject(sectionName: string, descriptor: BMCObjectDescriptor) {
    this.objects.set(sectionName, descriptor);
    console.log(`🔗 Registered ${sectionName} as ${descriptor.objectType}`);
  }
  
  // Universal height manipulation (handles different object types)
  setHeight(sectionName: string, height: number): boolean {
    const obj = this.objects.get(sectionName);
    if (!obj) {
      console.warn(`⚠️ Object not found: ${sectionName}`);
      return false;
    }
    
    if (obj.objectType === 'main_bmc' && obj.transformNode) {
      // Main BMC sections use transformNode scaling
      obj.transformNode.scaling.y = height;
      console.log(`📏 Main BMC: ${sectionName} height set to ${height}`);
    } else if (obj.objectType === 'separate_glb') {
      // Separate GLB objects use mesh scaling directly
      obj.mesh.scaling.y = height;
      console.log(`📏 Separate GLB: ${sectionName} height set to ${height}`);
    }
    return true;
  }
  
  // Universal position manipulation
  setPosition(sectionName: string, x: number, y: number, z: number): boolean {
    const obj = this.objects.get(sectionName);
    if (!obj) {
      console.warn(`⚠️ Object not found: ${sectionName}`);
      return false;
    }
    
    if (obj.objectType === 'main_bmc') {
      // Main BMC sections cannot be repositioned individually (part of single mesh)
      console.warn(`⚠️ Cannot reposition main BMC section: ${sectionName}`);
      return false;
    } else if (obj.objectType === 'separate_glb' && obj.rootMesh) {
      // Separate GLB objects can be repositioned via root mesh
      obj.rootMesh.position = new Vector3(x, y, z);
      console.log(`🌍 Separate GLB: ${sectionName} moved to (${x}, ${y}, ${z})`);
    }
    return true;
  }
  
  // Universal scaling manipulation
  setScale(sectionName: string, x: number, y: number, z: number): boolean {
    const obj = this.objects.get(sectionName);
    if (!obj) {
      console.warn(`⚠️ Object not found: ${sectionName}`);
      return false;
    }
    
    if (obj.objectType === 'main_bmc' && obj.transformNode) {
      obj.transformNode.scaling = new Vector3(x, y, z);
      console.log(`📐 Main BMC: ${sectionName} scaled to (${x}, ${y}, ${z})`);
    } else if (obj.objectType === 'separate_glb' && obj.rootMesh) {
      obj.rootMesh.scaling = new Vector3(x, y, z);
      console.log(`📐 Separate GLB: ${sectionName} scaled to (${x}, ${y}, ${z})`);
    }
    return true;
  }
  
  // Get current transformation data
  getTransformData(sectionName: string): any {
    const obj = this.objects.get(sectionName);
    if (!obj) return null;
    
    if (obj.objectType === 'main_bmc' && obj.transformNode) {
      return {
        type: 'main_bmc',
        position: obj.transformNode.position.asArray(),
        rotation: obj.transformNode.rotation.asArray(),
        scaling: obj.transformNode.scaling.asArray()
      };
    } else if (obj.objectType === 'separate_glb' && obj.rootMesh) {
      return {
        type: 'separate_glb',
        position: obj.rootMesh.position.asArray(),
        rotation: obj.rootMesh.rotation.asArray(),
        scaling: obj.rootMesh.scaling.asArray(),
        meshPosition: obj.mesh.position.asArray(),
        meshScaling: obj.mesh.scaling.asArray()
      };
    }
    return null;
  }
  
  // Export all transformation data for debugging
  exportAllTransforms(): Record<string, any> {
    const transforms: Record<string, any> = {};
    this.objects.forEach((obj, name) => {
      transforms[name] = this.getTransformData(name);
    });
    return transforms;
  }
  
  // Get all registered objects
  getAllObjects(): string[] {
    return Array.from(this.objects.keys());
  }
  
  // Debug coordinate system
  debugCoordinateSystem() {
    console.log("🌐 BMC COORDINATE SYSTEM DEBUG:");
    console.log("📍 COORDINATE MAPPING:");
    console.log("  Screen LEFT = Negative X");
    console.log("  Screen RIGHT = Positive X"); 
    console.log("  Screen UP = Negative Z");
    console.log("  Screen DOWN = Positive Z");
    console.log("  Height = Positive Y");
    
    console.log("🔍 REGISTERED OBJECTS:");
    this.objects.forEach((obj, name) => {
      const transform = this.getTransformData(name);
      console.log(`  ${name} (${obj.objectType}):`, transform);
    });
  }
}

// Legacy BMCSectionController for backward compatibility
class BMCSectionController {
  constructor(private mesh: AbstractMesh, private sectionName: string) {}
  
  setHeight(height: number) {
    this.mesh.scaling.y = height;
  }
  
  getHeight(): number {
    return this.mesh.scaling.y;
  }
  
  setPosition(x: number, y: number, z: number) {
    this.mesh.position = new Vector3(x, y, z);
  }
  
  setRotation(x: number, y: number, z: number) {
    this.mesh.rotation = new Vector3(x, y, z);
  }
}

// Standard grid positions for future consistency (doesn't affect current layout)
const STANDARD_POSITIONS = {
  'KeyPartners': { x: -15, y: 0, z: 10 },
  'KeyActivities': { x: -5, y: 0, z: 10 },
  'ValueProposition': { x: 5, y: 0, z: 10 },
  'CustomerRelationships': { x: 15, y: 0, z: 10 },
  'CustomerSegments': { x: 25, y: 0, z: 10 },
  'KeyResources': { x: -5, y: 0, z: -10 },
  'Channels': { x: 15, y: 0, z: -10 }
};

export const Canvas3DBabylon: React.FC<Canvas3DBabylonProps> = ({ canvas, isTransitioning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const orthoCameraRef = useRef<FreeCamera | null>(null);
  const rootMeshRef = useRef<AbstractMesh | null>(null);
  const { 
    saveCamera3DState, 
    getCamera3DState, 
    is3D, 
    isOrthographic, 
    setSelectedObject, 
    getSelectedObject, 
    setOriginalHeights, 
    getOriginalHeights,
    // New BMC State Manager methods
    selectBMCObject,
    getBMCSelectedObject,
    bmcState
  } = useCanvas();
  
  // Unified transformation system for all BMC objects
  const unifiedTransformRef = useRef<UnifiedBMCTransformSystem>(new UnifiedBMCTransformSystem());
  
  // Section controllers for consistent manipulation (additive, doesn't change existing behavior)
  const sectionControllersRef = useRef<Map<string, BMCSectionController>>(new Map());
  
  // Store all content panels for closing functionality
  const contentPanelsRef = useRef<any[]>([]);
  
  // Store original heights for each BMC section
  const originalHeightsRef = useRef<{ [sectionName: string]: number }>({});
  
  // Transform utilities (safe wrappers around existing functionality)
  const transformUtils = {
    // Get controller for consistent manipulation
    getSectionController: (sectionName: string): BMCSectionController | undefined => {
      return sectionControllersRef.current.get(sectionName);
    },
    
    // Safe height setting that preserves all current behavior
    setSectionHeight: (sectionName: string, height: number) => {
      const controller = sectionControllersRef.current.get(sectionName);
      if (controller) {
        controller.setHeight(height);
      }
    },
    
    // Get current layout positions (for future reference)
    getCurrentPositions: (): Record<string, Vector3> => {
      const positions: Record<string, Vector3> = {};
      sectionControllersRef.current.forEach((controller, sectionName) => {
        positions[sectionName] = (controller as any).mesh.position.clone();
      });
      return positions;
    },
    
    // Development utilities (safe for debugging without affecting functionality)
    debugCoordinates: () => {
      console.log("🔍 Current BMC Section Coordinates:");
      sectionControllersRef.current.forEach((controller, sectionName) => {
        const mesh = (controller as any).mesh;
        console.log(`  ${sectionName}:`, {
          position: mesh.position.asArray(),
          rotation: mesh.rotation.asArray(),
          scaling: mesh.scaling.asArray()
        });
      });
    },
    
    // Export current state for development
    exportCurrentState: () => {
      const state: any = {};
      sectionControllersRef.current.forEach((controller, sectionName) => {
        const mesh = (controller as any).mesh;
        state[sectionName] = {
          position: mesh.position.asArray(),
          rotation: mesh.rotation.asArray(),
          scaling: mesh.scaling.asArray()
        };
      });
      return state;
    }
  };

  // BMC Section Name Mapping: Convert between display names and BMC component names
  const mapSectionNameToBMCComponent = (sectionName: string): BMCComponentName | null => {
    const nameMapping: { [key: string]: BMCComponentName } = {
      'Key Partners': 'KeyPartners',
      'Key Activities': 'KeyActivities', 
      'Key Resources': 'KeyResources',
      'Value Propositions': 'ValueProposition',
      'Customer Relationships': 'CustomerRelationships',
      'Channels': 'CustomerChannels',  // GLB mesh name is "Channels"
      'Customer Segments': 'CustomerSegments',
      'Cost Structure': 'CostStructure',
      'Revenue Streams': 'RevenueStreams'
    };
    return nameMapping[sectionName] || null;
  };

  const mapBMCComponentToSectionName = (componentName: BMCComponentName): string => {
    const nameMapping: { [key in BMCComponentName]: string } = {
      'KeyPartners': 'Key Partners',
      'KeyActivities': 'Key Activities', 
      'KeyResources': 'Key Resources',
      'ValueProposition': 'Value Propositions',
      'CustomerRelationships': 'Customer Relationships',
      'CustomerChannels': 'Channels',  // GLB mesh name is "Channels"
      'CustomerSegments': 'Customer Segments',
      'CostStructure': 'Cost Structure',
      'RevenueStreams': 'Revenue Streams'
    };
    return nameMapping[componentName];
  };

  // New BMC Selection System using our state architecture
  // Simplified click handler using BMC state manager
  const handleBMCObjectClick = (sectionName: string) => {
    const bmcComponent = mapSectionNameToBMCComponent(sectionName);
    if (!bmcComponent) {
      console.warn(`⚠️ Unknown section name: ${sectionName}`);
      return;
    }

    const currentSelection = bmcState.getSelectedObject();
    console.log(`🎯 CLICK: "${sectionName}" -> "${bmcComponent}", current="${currentSelection}"`);
    
    if (currentSelection === bmcComponent) {
      // Deselect current object
      console.log(`🔄 DESELECTING: "${bmcComponent}"`);
      bmcState.selectObject(null);
    } else {
      // Select new object
      console.log(`🎯 SELECTING: "${bmcComponent}"`);
      bmcState.selectObject(bmcComponent);
    }
    
    // Force visual update after state change
    setTimeout(() => applyBMCVisualState(), 0);
  };
  
  // Simplified hover handlers using BMC state manager
  const handleBMCObjectHoverEnter = (sectionName: string) => {
    const bmcComponent = mapSectionNameToBMCComponent(sectionName);
    if (!bmcComponent) return;
    
    const objectState = bmcState.getObjectState(bmcComponent);
    if (!objectState || objectState.visual.isSelected) return; // Don't hover if selected
    
    // Clear hover state from all other objects first
    BMC_COMPONENTS.forEach(component => {
      if (component !== bmcComponent) {
        const otherState = bmcState.getObjectState(component);
        if (otherState && otherState.visual.isHovered) {
          bmcState.updateVisualState(component, { isHovered: false });
        }
      }
    });
    
    // Set hover state on this object
    bmcState.updateVisualState(bmcComponent, { isHovered: true });
    applyBMCVisualState();
    console.log(`💡 HOVER ENTER: ${sectionName}`);
  };
  
  const handleBMCObjectHoverExit = (sectionName: string) => {
    const bmcComponent = mapSectionNameToBMCComponent(sectionName);
    if (!bmcComponent) return;
    
    const objectState = bmcState.getObjectState(bmcComponent);
    if (!objectState || objectState.visual.isSelected) return; // Don't change if selected
    
    bmcState.updateVisualState(bmcComponent, { isHovered: false });
    applyBMCVisualState();
    console.log(`🔄 HOVER EXIT: ${sectionName}`);
  };

  // SIMPLIFIED VISUAL STATE: Focus only on core requirements
  const applyBMCVisualState = () => {
    const selectedComponent = bmcState.getSelectedObject();
    
    contentPanelsRef.current.forEach(({ mesh, material }) => {
      const sectionName = (mesh as any).bmcSectionName;
      const bmcComponent = mapSectionNameToBMCComponent(sectionName);
      
      if (!bmcComponent) return;
      
      const objectState = bmcState.getObjectState(bmcComponent);
      if (!objectState) return;
      
      const isSelected = objectState.visual.isSelected;
      const isHovered = objectState.visual.isHovered;
      
      // SIMPLE STATE LOGIC
      let targetColor: Color3;
      let targetOpacity: number;
      let targetHeight: number;
      
      if (isSelected) {
        // Selected object: bright blue, full opacity, full height
        targetColor = new Color3(0.0, 0.3, 0.8);
        targetOpacity = 1.0;
        targetHeight = objectState.transform.originalHeight;
      } else if (isHovered && !selectedComponent) {
        // Hovered with nothing selected: bright blue, keep everything else normal
        targetColor = new Color3(0.0, 0.3, 0.8);
        targetOpacity = 1.0;
        targetHeight = objectState.transform.originalHeight;
      } else if (selectedComponent) {
        // Something else is selected: grey, dimmed, flattened
        targetColor = new Color3(0.07, 0.07, 0.07);
        targetOpacity = 0.5;
        targetHeight = 0.1;
      } else {
        // Default state: grey, full opacity, full height
        targetColor = new Color3(0.07, 0.07, 0.07);
        targetOpacity = 1.0;
        targetHeight = objectState.transform.originalHeight;
      }
      
      // Apply color
      if ((mesh as any).hasTexture) {
        material.emissiveColor = targetColor.scale(0.3);
      } else {
        if (material.baseColor) material.baseColor = targetColor;
        material.diffuseColor = targetColor;
      }
      
      // Apply opacity to mesh
      material.alpha = targetOpacity;
      
      // FIXED APPROACH: Use mesh.getChildren() to access labels
      // Force all child labels to stay visible regardless of parent changes
      if (mesh.getChildren) {
        mesh.getChildren().forEach((child: any) => {
          if (child.material && child.name && child.name.includes("Label")) {
            child.material.alpha = 1.0;
            child.isVisible = true;
          }
        });
      }
      
      // Apply height
      mesh.scaling.y = targetHeight;
      
      // Set click state
      (mesh as any).isClicked = isSelected;
    });
  };

  // Handle background click to clear selection
  const handleBackgroundClick = () => {
    const currentSelection = bmcState.getSelectedObject();
    if (currentSelection) {
      bmcState.selectObject(null);
      applyBMCVisualState();
    }
  };
  
  // REMOVED: Sync function caused infinite loops - legacy store no longer needed
  

  
  // REMOVED: Old height logic - now handled by applyBMCVisualState

  // REMOVED: Old restore logic - now handled by applyBMCVisualState

  // Helper function to get section content from canvas data
  const getSectionContent = (sectionName: string): string => {
    const sectionMap: { [key: string]: string } = {
      "Value Propositions": "valuePropositions",
      "Key Partners": "keyPartners",
      "Key Activities": "keyActivities", 
      "Key Resources": "keyResources",
      "Customer Relationships": "customerRelationships",
      "Channels": "channels",
      "Customer Segments": "customerSegments",
      "Cost Structure": "costStructure",
      "Revenue Streams": "revenueStreams"
    };
    
    const sectionKey = sectionMap[sectionName];
    if (!sectionKey || !canvas[sectionKey as keyof typeof canvas]) {
      return `No content available for ${sectionName}`;
    }
    
    const section = canvas[sectionKey as keyof typeof canvas] as CanvasElement;
    if (!section.content || section.content.length === 0) {
      return `No bullet points available for ${sectionName}`;
    }
    
    // Format content as bullet points
    return section.content.map(item => `• ${item}`).join('\n');
  };

  // BMC Selection State Restoration (runs after scene initialization)
  const restoreBMCSelectionState = () => {
    const selectedComponent = bmcState.getSelectedObject();
    
    if (selectedComponent) {
      console.log(`🔄 RESTORING BMC SELECTION: "${selectedComponent}" for view mode change`);
      
      // Apply visual state based on current BMC selection
      applyBMCVisualState();
      
      // Also update legacy state for backward compatibility
      const sectionName = mapBMCComponentToSectionName(selectedComponent);
      setSelectedObject(sectionName);
    } else {
      console.log(`🔄 No BMC selection to restore`);
    }
  };

  // Restore selection state when view mode changes or scene is ready
  useEffect(() => {
    // Only restore when entering 3D mode after models are loaded
    if (is3D && contentPanelsRef.current.length > 0) {
      
      applyBMCVisualState();
    }
  }, [is3D]); // Only trigger when entering/leaving 3D mode
  
  // GUI state removed since labels are no longer used

  useEffect(() => {
    if (!canvasRef.current || !canvas) return;

    // Check if Babylon.js is properly loaded
    console.log('🔍 Babylon.js library check:');
    console.log('Engine available:', typeof Engine);
    console.log('Scene available:', typeof Scene);
    console.log('Vector3 available:', typeof Vector3);
    
    if (typeof Engine === 'undefined') {
      console.error('❌ Babylon.js Engine not loaded');
      return;
    }

    // Check WebGL support first
    const canvasElement = canvasRef.current;
    const gl = canvasElement.getContext('webgl') || canvasElement.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL is not supported in this browser');
      return;
    }
    console.log('✅ WebGL context available');

    // Initialize Babylon.js engine and scene with error handling
    let engine: Engine | null = null;
    let scene: Scene | null = null;

    try {
      // Initialize engine with compatibility settings to avoid shader issues
      engine = new Engine(canvasElement, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        disableWebGL2Support: true, // Force WebGL 1.0 for better compatibility
        forceSRGBBufferSupportState: false // Disable SRGB for compatibility
      }, false);
      
      if (!engine) {
        throw new Error('Engine creation returned null');
      }
      
      scene = new Scene(engine);
      if (!scene) {
        throw new Error('Scene creation returned null');
      }
      
      console.log("✅ Babylon.js engine and scene initialized successfully");
    } catch (error) {
      console.error('Failed to initialize Babylon.js engine:', error);
      console.error('Engine object:', engine ? 'created' : 'null');
      console.error('Scene object:', scene ? 'created' : 'null');
      return;
    }

    // Ensure we have valid engine and scene before proceeding
    if (!engine || !scene) {
      console.error('❌ Engine or scene initialization failed');
      return;
    }
    
    // Set background to match 2D view (#e9ecef - light gray)
    // #e9ecef = RGB(233, 236, 239) = normalized (0.914, 0.925, 0.937)
    scene.clearColor = new Color4(233/255, 236/255, 239/255, 1.0);
    
    engineRef.current = engine;
    sceneRef.current = scene;
    
    // Enable pointer interactions on the scene
    scene.actionManager = new ActionManager(scene);
    console.log("🎯 Scene ActionManager enabled");

    // Create perspective camera (always created to preserve state)
    const savedCameraState = getCamera3DState();
    const perspectiveCamera = new ArcRotateCamera(
      "perspectiveCamera",
      savedCameraState?.alpha ?? -Math.PI / 2.5,  // Alpha - more angled from the side for better perspective
      savedCameraState?.beta ?? Math.PI / 6,      // Beta - high angle for top-down perspective
      savedCameraState?.radius ?? 25,             // Radius - further back to see entire BMC layout clearly
      Vector3.Zero(),  // Target position
      scene
    );
    perspectiveCamera.setTarget(Vector3.Zero());
    
    // Enable camera controls on the canvas for perspective camera
    perspectiveCamera.attachControl(canvasRef.current, true);
    
    // Reduce mouse wheel sensitivity for smoother zooming
    perspectiveCamera.wheelPrecision = 50;        // Default is 3, higher values = less sensitive
    
    // Set camera limits for grid layout navigation (original working values)
    perspectiveCamera.lowerRadiusLimit = 5;      // Minimum zoom distance
    perspectiveCamera.upperRadiusLimit = 25;     // Maximum zoom distance
    perspectiveCamera.lowerBetaLimit = 0.1;      // Prevent camera from going below ground
    perspectiveCamera.upperBetaLimit = Math.PI / 2.2; // Prevent camera from flipping over
    
    // Create orthographic camera for top view
    const orthoCamera = new FreeCamera("orthoCamera", new Vector3(0, 15, 0), scene);
    orthoCamera.setTarget(Vector3.Zero());
    
    // Look straight down for top view
    orthoCamera.rotation.x = Math.PI / 2;
    orthoCamera.rotation.y = 0;
    orthoCamera.rotation.z = 0;
    
    // Set orthographic projection with proper aspect ratio (optimized size for full model visibility)
    orthoCamera.mode = 1; // ORTHOGRAPHIC_CAMERA
    const aspectRatio = canvasRef.current!.width / canvasRef.current!.height;
    const orthoSize = 8.5; // Optimized size to show full model while maximizing viewport usage
    
    if (aspectRatio > 1) {
      // Wider than tall - expand horizontally
      orthoCamera.orthoTop = orthoSize;
      orthoCamera.orthoBottom = -orthoSize;
      orthoCamera.orthoLeft = -orthoSize * aspectRatio;
      orthoCamera.orthoRight = orthoSize * aspectRatio;
    } else {
      // Taller than wide - expand vertically
      orthoCamera.orthoTop = orthoSize / aspectRatio;
      orthoCamera.orthoBottom = -orthoSize / aspectRatio;
      orthoCamera.orthoLeft = -orthoSize;
      orthoCamera.orthoRight = orthoSize;
    }
    
    // Set proper clipping planes for orthographic view
    orthoCamera.minZ = 0.1;
    orthoCamera.maxZ = 100;
    
    // Disable rotation controls for pure top-down view
    orthoCamera.inputs.clear();
    
    // Store camera references
    cameraRef.current = perspectiveCamera;
    orthoCameraRef.current = orthoCamera;
    
    // Set active camera based on mode
    scene.activeCamera = isOrthographic ? orthoCamera : perspectiveCamera;

    // Enhanced lighting setup for semi-gloss black plastic with subtle reflections
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 1.2; // Moderate ambient lighting
    hemisphericLight.diffuse = new Color3(0.9, 0.9, 0.9); // Neutral ambient
    hemisphericLight.specular = new Color3(0.2, 0.2, 0.2); // Low specular for subtle shine
    
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 1.8; // Strong directional light for shape definition
    directionalLight.diffuse = new Color3(1, 1, 1);
    directionalLight.specular = new Color3(0.3, 0.3, 0.3); // Low specular for controlled shine

    // Create ground with powder blue background and white gridlines
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    
    // Create dynamic texture for powder blue grid pattern with white lines
    const gridTexture = new DynamicTexture("gridTexture", {width: 1024, height: 1024}, scene, false);
    const gridContext = gridTexture.getContext();
    
    // Fill with custom powder blue background
    gridContext.fillStyle = "#a7dbfc"; // Custom powder blue background
    gridContext.fillRect(0, 0, 1024, 1024);
    
    // Draw white grid lines
    gridContext.strokeStyle = "#FFFFFF"; // White grid lines
    gridContext.lineWidth = 1; // Thin 1px grid lines
    
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
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseTexture = gridTexture;
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.2); // Subtle blue-tinted specular reflection
    groundMaterial.specularPower = 64; // Higher value for sharper reflections
    groundMaterial.alpha = 0.5; // 50% opacity
    ground.material = groundMaterial;

    // Add click detection to ground for clearing selections
    ground.actionManager = new ActionManager(scene);
    ground.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
      // Use new BMC background click handler
      handleBackgroundClick();
    }));

    // Create extruded border rails on all sides
    const railHeight = 0.15; // Reduced from 0.3 to 0.15
    const railWidth = 0.2;
    const railColor = new Color3(0.3, 0.3, 0.3); // Darker grey rail color
    
    // Create rail material
    const railMaterial = new StandardMaterial("railMaterial", scene);
    railMaterial.diffuseColor = railColor;
    railMaterial.specularColor = new Color3(0, 0, 0);
    
    // North rail (back) - extends full width including rail thickness for flush corners
    const northRail = MeshBuilder.CreateBox("northRail", {
      width: 20 + railWidth*2, // Ground width + rail thickness on both sides for flush corners
      height: railHeight,
      depth: railWidth
    }, scene);
    northRail.position = new Vector3(0, railHeight/2, -7 - railWidth/2); // 14/2 = 7
    northRail.material = railMaterial;
    
    // South rail (front) - extends full width including rail thickness for flush corners
    const southRail = MeshBuilder.CreateBox("southRail", {
      width: 20 + railWidth*2, // Ground width + rail thickness on both sides for flush corners
      height: railHeight,
      depth: railWidth
    }, scene);
    southRail.position = new Vector3(0, railHeight/2, 7 + railWidth/2); // 14/2 = 7
    southRail.material = railMaterial;
    
    // East rail (right) - only spans ground depth (not including rail thickness to avoid overlap)
    const eastRail = MeshBuilder.CreateBox("eastRail", {
      width: railWidth,
      height: railHeight,
      depth: 14 // Only ground depth, no extension needed
    }, scene);
    eastRail.position = new Vector3(10 + railWidth/2, railHeight/2, 0); // 20/2 = 10
    eastRail.material = railMaterial;
    
    // West rail (left) - only spans ground depth (not including rail thickness to avoid overlap)
    const westRail = MeshBuilder.CreateBox("westRail", {
      width: railWidth,
      height: railHeight,
      depth: 14 // Only ground depth, no extension needed
    }, scene);
    westRail.position = new Vector3(-10 - railWidth/2, railHeight/2, 0); // 20/2 = 10
    westRail.material = railMaterial;


    


    // Create optimized environment for PBR materials to work properly
    const environmentHelper = scene.createDefaultEnvironment({
      createGround: false, // We already have ground
      createSkybox: false, // Disable skybox to show scene clearColor background
      skyboxSize: 100,
      skyboxColor: new Color3(0.95, 0.95, 0.97), // Not used since createSkybox is false
      groundColor: new Color3(0.9, 0.9, 0.9)
    });
    
    // Set environment to moderate intensity for PBR materials
    if (environmentHelper) {
      scene.environmentIntensity = 0.5; // Moderate for PBR materials to work
    }

    // Create GUI for 3D billboard labels
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    
    // Add "Internal" label directly on the ground plane near Cost Structure
    const createInternalLabel = () => {
      // Cost Structure is at (-10.1, 0.1, -10.5), Ground plane is at Y=0
      // Place Internal label on the ground plane, moved more to the right
      
      const internalLabelPlane = MeshBuilder.CreatePlane("internalLabel", {
        width: 4.0,   // Reduced by 20% (was 5.0)
        height: 1.28  // Reduced by 20% (was 1.6)
      }, scene);
      
      // Position on ground plane, moved more to the right
      internalLabelPlane.position.x = -5.0;  // Moved more to the right (was -8.0)
      internalLabelPlane.position.y = 0.001; // Directly on ground plane surface
      internalLabelPlane.position.z = -6.2;  // Move in negative Z direction (down on screen) to align with red line
      
      // Rotate to lie flat on the ground
      internalLabelPlane.rotation.x = Math.PI / 2;
      
      // Create material with the new blue Internal label at 50% transparency
      const internalLabelMaterial = new StandardMaterial("internalLabelMat", scene);
      const internalLabelTexture = new Texture("/textures/Labels_internal_blue.png", scene);
      internalLabelTexture.hasAlpha = true;
      
      internalLabelMaterial.diffuseTexture = internalLabelTexture;
      internalLabelMaterial.emissiveTexture = internalLabelTexture;
      internalLabelMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0); // Full brightness for blue label
      internalLabelMaterial.alpha = 0.3; // 30% opacity (increased by 20%)
      internalLabelMaterial.useAlphaFromDiffuseTexture = true;
      internalLabelMaterial.disableLighting = true;
      
      internalLabelPlane.material = internalLabelMaterial;
      internalLabelPlane.isPickable = false;
      
      console.log(`✅ Internal label (2x larger, medium grey) on ground plane at (${internalLabelPlane.position.x}, ${internalLabelPlane.position.y}, ${internalLabelPlane.position.z})`);
    };

    // Add "External" label on the right side of the ground plane
    const createExternalLabel = () => {
      // Position on the right side, mirroring Internal label placement
      // Based on diagram: External should be positioned below Revenue Streams area
      
      const externalLabelPlane = MeshBuilder.CreatePlane("externalLabel", {
        width: 4.0,   // Reduced by 20% (was 5.0)
        height: 1.28  // Reduced by 20% (was 1.6)
      }, scene);
      
      // Position on ground plane on the right side
      // Revenue Streams is at (-0.221, 0.1, -10.5), so External should be to the right
      externalLabelPlane.position.x = 5.0;   // Right side (positive X, mirroring Internal at -5.0)
      externalLabelPlane.position.y = 0.001; // Directly on ground plane surface
      externalLabelPlane.position.z = -6.2;  // Same Z as Internal for alignment
      
      // Rotate to lie flat on the ground
      externalLabelPlane.rotation.x = Math.PI / 2;
      
      // Create material with the External blue label at 50% transparency
      const externalLabelMaterial = new StandardMaterial("externalLabelMat", scene);
      const externalLabelTexture = new Texture("/textures/Labels_external_blue.png", scene);
      externalLabelTexture.hasAlpha = true;
      
      externalLabelMaterial.diffuseTexture = externalLabelTexture;
      externalLabelMaterial.emissiveTexture = externalLabelTexture;
      externalLabelMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0); // Full brightness for blue label
      externalLabelMaterial.alpha = 0.3; // 30% opacity (increased by 20%)
      externalLabelMaterial.useAlphaFromDiffuseTexture = true;
      externalLabelMaterial.disableLighting = true;
      
      externalLabelPlane.material = externalLabelMaterial;
      externalLabelPlane.isPickable = false;
      
      console.log(`✅ External label positioned on right side at (${externalLabelPlane.position.x}, ${externalLabelPlane.position.y}, ${externalLabelPlane.position.z})`);
    };
    
    // Create the Internal and External labels
    createInternalLabel();
    createExternalLabel();
    

    

    




    // Function to apply texture only to top face of mesh using proper UV mapping
    const applyTopFaceTexture = (mesh: Mesh, scene: Scene) => {
      console.log(`🔍 Analyzing mesh vertex data for top face identification...`);
      
      // Get vertex data
      const positions = mesh.getVerticesData("position");
      const indices = mesh.getIndices();
      let uvs = mesh.getVerticesData("uv");
      const normals = mesh.getVerticesData("normal");
      
      if (!positions || !indices || !uvs || !normals) {
        console.log(`❌ Missing vertex data for texture mapping`);
        return;
      }
      
      console.log(`📊 Mesh has ${positions.length/3} vertices, ${indices.length/3} faces`);
      
      // Find the maximum Y coordinate to identify top faces
      let maxY = -Infinity;
      for (let i = 1; i < positions.length; i += 3) { // Y coordinates are at positions 1, 4, 7, etc.
        maxY = Math.max(maxY, positions[i]);
      }
      
      console.log(`📏 Maximum Y coordinate found: ${maxY}`);
      
      // Clone UV array for modification (convert to regular array if needed)
      const newUvs = Array.from(uvs);
      
      // Process each triangle face
      let topFacesFound = 0;
      for (let i = 0; i < indices.length; i += 3) {
        const v1Index = indices[i];
        const v2Index = indices[i + 1];
        const v3Index = indices[i + 2];
        
        // Get positions for this triangle
        const v1Y = positions[v1Index * 3 + 1];
        const v2Y = positions[v2Index * 3 + 1];
        const v3Y = positions[v3Index * 3 + 1];
        
        // Get normals for this triangle
        const n1Y = normals[v1Index * 3 + 1];
        const n2Y = normals[v2Index * 3 + 1];
        const n3Y = normals[v3Index * 3 + 1];
        
        // Calculate average Y position and normal for this face
        const avgY = (v1Y + v2Y + v3Y) / 3;
        const avgNormalY = (n1Y + n2Y + n3Y) / 3;
        
        // Check if this is a top face (close to maxY and normal pointing up)
        const isTopFace = Math.abs(avgY - maxY) < 0.01 && avgNormalY > 0.5;
        
        if (isTopFace) {
          // This is a top face - create a small label in the center only
          // Get world positions
          const v1X = positions[v1Index * 3];
          const v1Z = positions[v1Index * 3 + 2];
          const v2X = positions[v2Index * 3];
          const v2Z = positions[v2Index * 3 + 2];
          const v3X = positions[v3Index * 3];
          const v3Z = positions[v3Index * 3 + 2];
          
          // Calculate triangle center
          const triCenterX = (v1X + v2X + v3X) / 3;
          const triCenterZ = (v1Z + v2Z + v3Z) / 3;
          
          // Find overall mesh bounds for this face
          let meshMinX = Infinity, meshMaxX = -Infinity;
          let meshMinZ = Infinity, meshMaxZ = -Infinity;
          
          // Sample all vertices to find true bounds
          for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            meshMinX = Math.min(meshMinX, x);
            meshMaxX = Math.max(meshMaxX, x);
            meshMinZ = Math.min(meshMinZ, z);
            meshMaxZ = Math.max(meshMaxZ, z);
          }
          
          const meshCenterX = (meshMinX + meshMaxX) / 2;
          const meshCenterZ = (meshMinZ + meshMaxZ) / 2;
          const meshWidth = meshMaxX - meshMinX;
          const meshDepth = meshMaxZ - meshMinZ;
          
          // Define tiny label area - only 5% of mesh size
          const labelSize = Math.min(meshWidth, meshDepth) * 0.05;
          
          // Check if this triangle is in the small center label area
          const distanceFromCenter = Math.sqrt(
            Math.pow(triCenterX - meshCenterX, 2) + 
            Math.pow(triCenterZ - meshCenterZ, 2)
          );
          
          if (distanceFromCenter < labelSize) {
            // This triangle is in the label area - map to texture
            newUvs[v1Index * 2] = 0.2 + 0.6 * (v1X - meshCenterX + labelSize) / (2 * labelSize);
            newUvs[v1Index * 2 + 1] = 0.2 + 0.6 * (v1Z - meshCenterZ + labelSize) / (2 * labelSize);
            
            newUvs[v2Index * 2] = 0.2 + 0.6 * (v2X - meshCenterX + labelSize) / (2 * labelSize);
            newUvs[v2Index * 2 + 1] = 0.2 + 0.6 * (v2Z - meshCenterZ + labelSize) / (2 * labelSize);
            
            newUvs[v3Index * 2] = 0.2 + 0.6 * (v3X - meshCenterX + labelSize) / (2 * labelSize);
            newUvs[v3Index * 2 + 1] = 0.2 + 0.6 * (v3Z - meshCenterZ + labelSize) / (2 * labelSize);
            
            console.log(`📝 Label triangle mapped at distance ${distanceFromCenter.toFixed(3)} from center`);
          } else {
            // This triangle is outside label area - map to edge (transparent/black area)
            newUvs[v1Index * 2] = 0.95;
            newUvs[v1Index * 2 + 1] = 0.95;
            newUvs[v2Index * 2] = 0.95;
            newUvs[v2Index * 2 + 1] = 0.95;
            newUvs[v3Index * 2] = 0.95;
            newUvs[v3Index * 2 + 1] = 0.95;
          }
          
          topFacesFound++;
          console.log(`✅ Top face ${topFacesFound} processed at Y=${avgY.toFixed(3)}`);
        }
        // For non-top faces, don't modify UVs - keep original material appearance
      }
      
      console.log(`🎯 Found and textured ${topFacesFound} top faces`);
      
      // Apply the modified UV coordinates back to the mesh
      mesh.setVerticesData("uv", newUvs);
      mesh.refreshBoundingInfo();
      
      console.log(`✅ UV mapping applied successfully to Customer Segments mesh`);
    };

    // Function to apply standard base color to a specific section
    const applyDarkTopFace = (sectionName: string) => {
      if (!scene) return;
      
      const meshes = scene.meshes;
      let foundMesh = false;
      meshes.forEach((mesh) => {
        if ((mesh as any).bmcSectionName === sectionName && mesh.material) {
          foundMesh = true;
          console.log(`🎨 Applying standard base color to ${sectionName} entire mesh`);
          
          const material = mesh.material as any;
          const standardColor = new Color3(0.07, 0.07, 0.07); // Standard base color
          
          // Apply standard color to the entire mesh for consistency
          if (material.diffuseColor) {
            material.diffuseColor = standardColor;
          }
          if (material.baseColor) {
            material.baseColor = standardColor;
          }
          
          // Update original colors for hover behavior
          if (material.originalBaseColor) {
            material.originalBaseColor = standardColor.clone();
          }
          if (material.originalDiffuseColor) {
            material.originalDiffuseColor = standardColor.clone();
          }
          
          console.log(`✅ Applied standard base color (0.07, 0.07, 0.07) to ${sectionName} entire mesh`);
        }
      });
      
      if (!foundMesh) {
        console.log(`❌ No mesh found with section name: ${sectionName}`);
      }
    };

    // Only GLB models are used now - no more box geometry functions needed

    // All BMC elements are now loaded as GLB models - circular layout matching top view

    // Define BMC section colors and names with corrected label order
    const bmcSections = [
      { color: new Color3(0.3, 0.6, 0.9), name: "Value Propositions" },      // Blue
      { color: new Color3(0.4, 0.8, 0.4), name: "Key Partners" },           // Green  
      { color: new Color3(0.9, 0.9, 0.3), name: "Key Activities" },         // Yellow (was Customer Relationships position)
      { color: new Color3(0.9, 0.3, 0.3), name: "Key Resources" },          // Red
      { color: new Color3(0.8, 0.4, 0.9), name: "Customer Relationships" }, // Purple (was Customer Segments position)
      { color: new Color3(0.6, 0.9, 0.9), name: "Channels" },               // Cyan
      { color: new Color3(0.9, 0.6, 0.3), name: "Customer Segments" },      // Orange (was Key Activities position)
    ];

    // Load complete BMC GLB model with individual section coloring
    SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_09_complete_1753576063858.glb", scene).then((result) => {
      if (result.meshes.length > 0) {
        console.log(`✅ BMC model loaded with ${result.meshes.length} meshes`);
        
        const rootMesh = result.meshes[0];
        rootMeshRef.current = rootMesh;
        
        // Position moved down by one row on ground plane
        rootMesh.position = new Vector3(0, 0.1, 0.9);
        
        // Keep model at normal rotation for all views
        rootMesh.rotation = Vector3.Zero();
        
        // Position logging removed for better performance
        
        // Start with visible scale
        rootMesh.scaling = new Vector3(8, 8, 8);
        
        console.log(`📦 BMC model positioned at origin with scale 8.0`);
        
        // Corrected BMC section mapping - based on user feedback that specific labels need to swap
        // Current observation: Key Activities label is where Customer Relationships should be
        // Customer Relationships label is where Customer Segments should be  
        // Customer Segments label is where Key Activities should be
        // GLB model mesh mapping - adding fallback entries to prevent VAO errors
        const correctLabelMapping: Record<number, { color: Color3; name: string }> = {
          0: { color: new Color3(0.07, 0.07, 0.07), name: "Value Propositions" },      // Medium Dark Grey
          1: { color: new Color3(0.07, 0.07, 0.07), name: "Key Partners" },           // Medium Dark Grey
          2: { color: new Color3(0.07, 0.07, 0.07), name: "Customer Segments" },      // Medium Dark Grey
          3: { color: new Color3(0.07, 0.07, 0.07), name: "Key Resources" },          // Medium Dark Grey
          4: { color: new Color3(0.07, 0.07, 0.07), name: "Key Activities" },         // Medium Dark Grey
          5: { color: new Color3(0.07, 0.07, 0.07), name: "Channels" },               // Medium Dark Grey
          6: { color: new Color3(0.07, 0.07, 0.07), name: "Customer Relationships" }, // Medium Dark Grey
          7: { color: new Color3(0.07, 0.07, 0.07), name: "Cost Structure" },         // Fallback - Medium Dark Grey
          8: { color: new Color3(0.07, 0.07, 0.07), name: "Revenue Streams" },        // Fallback - Medium Dark Grey
        };

        // Apply corrected colors, interactivity, and labels to each BMC section mesh
        let sectionIndex = 0;
        result.meshes.forEach((mesh, index) => {
          if (mesh.material && mesh.name !== "__root__") {
            const section = correctLabelMapping[sectionIndex] || correctLabelMapping[0];
            const baseColor = section.color;
            const sectionName = section.name;
            
            // Store section name directly on mesh for simpler approach
            (mesh as any).bmcSectionName = sectionName;
            
            // TransformNode created for coordinate control
            
            // Create StandardMaterial with PBR-compatible properties for hover behavior
            const sectionMaterial = new StandardMaterial(`bmcSection_${index}`, scene) as any;
            
            // Use very dark black color with subtle shine
            sectionMaterial.diffuseColor = baseColor;
            sectionMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
            sectionMaterial.specularPower = 32;
            
            // Add baseColor property for compatibility with hover behavior
            sectionMaterial.baseColor = baseColor;
            
            // Store original colors for hover behavior
            (sectionMaterial as any).originalBaseColor = baseColor.clone();
            (sectionMaterial as any).originalDiffuseColor = baseColor.clone();
            
            // Add floating label planes for specific sections
            if (sectionName === "Customer Segments") {
              console.log(`🏷️ Creating floating label for Customer Segments mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with larger size to match other labels
              const labelWidth = size.x * 1.0; // Full width to match font size of other labels
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger like Key Activities
              console.log(`Customer Segments Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("customerSegmentsLabel", {
                width: labelWidth,   // Larger width to match other labels
                height: labelHeight  // 50% taller to prevent squishing
              }, scene);
              
              // Position slightly above mesh center, moved left from top view
              labelPlane.position.x = center.x - size.x * 0.15; // Move left from top view perspective
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z;
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("customerSegmentsLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_CustomerSegments.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Customer Segments label plane created`);
            }
            
            if (sectionName === "Key Partners") {
              console.log(`🏷️ Creating floating label for Key Partners mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with larger size to match other labels
              const labelWidth = size.x * 0.95; // Larger width to better match font size of other labels
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger like Key Activities
              console.log(`Key Partners Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("keyPartnersLabel", {
                width: labelWidth,   // Larger width to match other labels
                height: labelHeight  // 50% taller to prevent squishing
              }, scene);
              
              // Position slightly above mesh center, moved right from top view
              labelPlane.position.x = center.x + size.x * 0.15; // Move right from top view perspective
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z;
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("keyPartnersLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_KeyPartners.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Key Partners label plane created`);
            }
            
            if (sectionName === "Customer Relationships") {
              console.log(`🏷️ Creating floating label for Customer Relationships mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with 50% taller height and slightly larger overall
              const labelWidth = size.x * 0.65; // Slightly larger than 0.6
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger than the previous calculated height
              console.log(`Customer Relationships Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("customerRelationshipsLabel", {
                width: labelWidth,   // Slightly larger width to fit better within mesh
                height: labelHeight  // 50% taller to reduce squishing
              }, scene);
              
              // Position within the mesh boundaries, moved right with margin like Customer Segments
              labelPlane.position.x = center.x + size.x * 0.15; // Move right but leave margin on right edge
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z + size.z * 0.3; // Move up more in top view
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("customerRelationshipsLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_CustomerRelationships.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Customer Relationships label plane created`);
            }
            
            if (sectionName === "Channels") {
              console.log(`🏷️ Creating floating label for Customer Channels mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with 50% taller height and slightly larger overall
              const labelWidth = size.x * 0.65; // Slightly larger than 0.6
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger than calculated height
              console.log(`Customer Channels Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("customerChannelsLabel", {
                width: labelWidth,   // Slightly larger width
                height: labelHeight  // 50% taller to reduce squishing
              }, scene);
              
              // Position within the mesh boundaries, moved right with margin like Customer Relationships  
              labelPlane.position.x = center.x + size.x * 0.15; // Move right but leave margin on right edge
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z - size.z * 0.3; // Move down toward bottom of shape
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("customerChannelsLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_CustomerChannels.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Customer Channels label plane created`);
            }
            
            // Add floating label planes for Key Activities section
            if (sectionName === "Key Activities") {
              console.log(`🏷️ Creating floating label for Key Activities mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with 50% taller height than before
              const labelWidth = size.x * 0.6;
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger than the previous calculated height
              console.log(`Key Activities Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("keyActivitiesLabel", {
                width: labelWidth,   // Smaller width to fit better within mesh
                height: labelHeight  // 50% taller to reduce squishing
              }, scene);
              
              // Position within the mesh boundaries, moved left from top view perspective
              labelPlane.position.x = center.x - size.x * 0.15; // Move left but leave margin on left edge
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z + size.z * 0.3; // Move up more in top view
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("keyActivitiesLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_KeyActivities.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Key Activities label plane created`);
            }
            
            // Add floating label planes for Key Resources section
            if (sectionName === "Key Resources") {
              console.log(`🏷️ Creating floating label for Key Resources mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with 50% taller height than before
              const labelWidth = size.x * 0.6;
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger than the previous calculated height
              console.log(`Key Resources Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("keyResourcesLabel", {
                width: labelWidth,   // Smaller width to fit better within mesh
                height: labelHeight  // 50% taller to reduce squishing
              }, scene);
              
              // Position within the mesh boundaries, moved left and down toward bottom
              labelPlane.position.x = center.x - size.x * 0.15; // Move left but leave margin on left edge
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z - size.z * 0.3; // Move down toward bottom of shape
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("keyResourcesLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_KeyResources.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Key Resources label plane created`);
            }
            
            // Add floating label planes for Value Propositions section
            if (sectionName === "Value Propositions") {
              console.log(`🏷️ Creating floating label for Value Propositions mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with slightly adjusted size for perfect proportion
              const labelWidth = size.x * 0.48; // Tiny bit larger for optimal proportion in circular area
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger like other labels
              console.log(`Value Propositions Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("valuePropositionsLabel", {
                width: labelWidth,   // Size for central prominence
                height: labelHeight  // 50% taller to prevent squishing
              }, scene);
              
              // Position centered above the circular Value Propositions area
              labelPlane.position.x = center.x; // Center position
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z; // Center in the circular area
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("valuePropositionsLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_ValueProposition.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Value Propositions label plane created`);
              
              // Add pulsating green stroke animation to the top edge of Value Propositions cylinder
              const createPulsatingEdge = () => {
                // Get mesh geometry to create edge lines
                const positions = mesh.getVerticesData("position");
                const indices = mesh.getIndices();
                
                if (!positions || !indices) {
                  console.log("❌ Could not create edge animation - no mesh data");
                  return;
                }
                
                // Find the top face vertices (highest Y values)
                const topVertices: Vector3[] = [];
                const vertices: Vector3[] = [];
                
                // Convert positions array to Vector3 array
                for (let i = 0; i < positions.length; i += 3) {
                  vertices.push(new Vector3(positions[i], positions[i + 1], positions[i + 2]));
                }
                
                // Find maximum Y value (top of cylinder)
                let maxY = -Infinity;
                vertices.forEach(vertex => {
                  if (vertex.y > maxY) maxY = vertex.y;
                });
                
                // Collect vertices near the top (within small tolerance)
                const tolerance = 0.01;
                vertices.forEach(vertex => {
                  if (Math.abs(vertex.y - maxY) < tolerance) {
                    topVertices.push(vertex);
                  }
                });
                
                // Sort top vertices by angle to create circular edge
                const center = new Vector3(0, maxY, 0); // Top center
                topVertices.sort((a, b) => {
                  const angleA = Math.atan2(a.z - center.z, a.x - center.x);
                  const angleB = Math.atan2(b.z - center.z, b.x - center.x);
                  return angleA - angleB;
                });
                
                if (topVertices.length < 3) {
                  console.log("❌ Not enough top vertices found for edge animation");
                  return;
                }
                
                // Create edge lines using points
                const edgePoints: Vector3[] = [];
                topVertices.forEach(vertex => {
                  edgePoints.push(vertex);
                });
                // Close the loop
                if (edgePoints.length > 0) {
                  edgePoints.push(edgePoints[0]);
                }
                
                // Create the pulsating green edge line
                const edgeLine = MeshBuilder.CreateLines("valuePropositionEdge", {
                  points: edgePoints,
                  updatable: true
                }, scene);
                
                // Create bright green material for the edge
                const edgeMaterial = new StandardMaterial("valuePropositionEdgeMat", scene);
                edgeMaterial.emissiveColor = new Color3(0, 1, 0); // Bright green
                edgeMaterial.disableLighting = true;
                
                // Set line properties
                edgeLine.color = new Color3(0, 1, 0); // Bright green
                edgeLine.parent = mesh;
                edgeLine.isPickable = false;
                
                // Store animation reference with pause state
                (mesh as any).pulsatingEdge = { line: edgeLine, isPaused: false };
                
                // Create pulsating animation
                let animationTime = 0;
                const animateEdge = () => {
                  if (edgeLine && !edgeLine.isDisposed()) {
                    const animationRef = (mesh as any).pulsatingEdge;
                    
                    // Check if animation should be paused (3D Top view)
                    if (!animationRef.isPaused) {
                      animationTime += 0.02; // Animation speed
                      
                      // Pulsate opacity and glow
                      const pulse = (Math.sin(animationTime * 2) + 1) / 2; // 0 to 1
                      const intensity = 0.3 + (pulse * 0.7); // 0.3 to 1.0
                      
                      // Update line color with pulsating intensity
                      edgeLine.color = new Color3(0, intensity, 0);
                    } else {
                      // Keep static bright color when paused
                      edgeLine.color = new Color3(0, 1, 0);
                    }
                    
                    // Continue animation loop
                    requestAnimationFrame(animateEdge);
                  }
                };
                
                // Start animation
                animateEdge();
                
                console.log(`✅ Pulsating green edge animation created for Value Propositions with ${topVertices.length} vertices`);
              };
              
              // Create the pulsating edge after a short delay to ensure mesh is ready
              setTimeout(createPulsatingEdge, 100);
            }

            // Create blue tracer animation for Customer Segments
            if (sectionName === "Customer Segments") {
              const createBlueTracer = () => {
                // Get mesh bounding info
                const boundingInfo = mesh.getBoundingInfo();
                const min = boundingInfo.minimum;
                const max = boundingInfo.maximum;
                
                // Calculate rectangular path with proportional steps based on edge lengths
                const padding = 0.0005; // Minimal padding to hug the top surface
                const topY = max.y + padding; // Hug the top surface closely
                
                // Calculate edge lengths for proportional speed
                const widthLength = Math.abs(max.x - min.x);
                const heightLength = Math.abs(max.z - min.z);
                const totalPerimeter = 2 * (widthLength + heightLength);
                
                // Calculate steps per edge based on their relative length
                const totalSteps = 80; // Total points around perimeter
                const bottomSteps = Math.ceil((widthLength / totalPerimeter) * totalSteps);
                const rightSteps = Math.ceil((heightLength / totalPerimeter) * totalSteps);
                const topSteps = Math.ceil((widthLength / totalPerimeter) * totalSteps);
                const leftSteps = Math.ceil((heightLength / totalPerimeter) * totalSteps);
                
                const pathPoints: Vector3[] = [];
                
                // Bottom edge (min.x, min.z) to (max.x, min.z)
                for (let i = 0; i <= bottomSteps; i++) {
                  const t = i / bottomSteps;
                  const x = min.x + (max.x - min.x) * t;
                  pathPoints.push(new Vector3(x, topY, min.z));
                }
                
                // Right edge (max.x, min.z) to (max.x, max.z) - skip first point to avoid duplicate
                for (let i = 1; i <= rightSteps; i++) {
                  const t = i / rightSteps;
                  const z = min.z + (max.z - min.z) * t;
                  pathPoints.push(new Vector3(max.x, topY, z));
                }
                
                // Top edge (max.x, max.z) to (min.x, max.z) - skip first point to avoid duplicate
                for (let i = 1; i <= topSteps; i++) {
                  const t = i / topSteps;
                  const x = max.x - (max.x - min.x) * t;
                  pathPoints.push(new Vector3(x, topY, max.z));
                }
                
                // Left edge (min.x, max.z) to (min.x, min.z) - skip first and last points to avoid duplicates
                for (let i = 1; i < leftSteps; i++) {
                  const t = i / leftSteps;
                  const z = max.z - (max.z - min.z) * t;
                  pathPoints.push(new Vector3(min.x, topY, z));
                }
                
                // Create tiny bright blue sphere (tracer head) with blur effect
                const tracerSphere = MeshBuilder.CreateSphere("customerSegmentsTracer", { diameter: 0.002 }, scene);
                const tracerMaterial = new StandardMaterial("tracerMat", scene);
                tracerMaterial.emissiveColor = new Color3(0, 0.9, 1); // Brighter blue
                tracerMaterial.disableLighting = true;
                tracerMaterial.alpha = 0.6; // More transparency for stronger blur effect
                tracerMaterial.diffuseColor = new Color3(0, 0.7, 1); // Brighter blue base
                tracerMaterial.specularColor = new Color3(0.4, 1.0, 1); // Strong highlight for glow
                tracerMaterial.useAlphaFromDiffuseTexture = true;
                tracerSphere.material = tracerMaterial;
                tracerSphere.parent = mesh;
                tracerSphere.isPickable = false;
                
                // Create a single stable trail line that gets updated safely
                const maxTrailLength = 12; // Longer trail for better visual impact
                const trailPositions: Vector3[] = [];
                
                // Initialize trail positions with current position
                for (let i = 0; i < maxTrailLength; i++) {
                  trailPositions.push(pathPoints[0].clone());
                }
                
                // Create a single trail line with initial points
                const trailLine = MeshBuilder.CreateLines("customerSegmentsTrail", {
                  points: trailPositions,
                  updatable: true
                }, scene);
                
                trailLine.color = new Color3(0, 0.7, 1); // Bright blue
                trailLine.parent = mesh;
                trailLine.isPickable = false;
                
                // Store animation reference with pause state
                (mesh as any).blueTracer = { 
                  sphere: tracerSphere, 
                  trail: trailLine, 
                  isPaused: false 
                };
                
                // Animation variables
                let animationTime = 0;
                const totalPathLength = pathPoints.length; // Use actual path length
                let updateCounter = 0;
                
                const animateTracer = () => {
                  if (tracerSphere && !tracerSphere.isDisposed() && trailLine && !trailLine.isDisposed()) {
                    const animationRef = (mesh as any).blueTracer;
                    
                    // Check if animation should be paused (3D Top view)
                    if (!animationRef.isPaused) {
                      animationTime += 0.5; // Double speed - faster movement around edges
                      
                      // Calculate position along the edge-based rectangular path
                      const effectivePathLength = pathPoints.length;
                      const progress = (animationTime % (effectivePathLength * 2)) / (effectivePathLength * 2);
                      const scaledProgress = progress * effectivePathLength;
                      const segmentIndex = Math.floor(scaledProgress) % effectivePathLength;
                      const segmentProgress = scaledProgress - Math.floor(scaledProgress);
                      
                      // Get current and next points, wrapping around for smooth loop
                      const currentPoint = pathPoints[segmentIndex];
                      const nextPoint = pathPoints[(segmentIndex + 1) % pathPoints.length];
                      
                      // Interpolate position smoothly along the rectangular edges only
                      const currentPos = Vector3.Lerp(currentPoint, nextPoint, segmentProgress);
                      tracerSphere.position = currentPos;
                      
                      // Update trail positions more frequently for smoother trail with faster speed
                      updateCounter++;
                      if (updateCounter % 3 === 0) { // Update every 3rd frame for longer trail with faster speed
                        // Shift trail positions
                        for (let i = trailPositions.length - 1; i > 0; i--) {
                          trailPositions[i] = trailPositions[i - 1].clone();
                        }
                        trailPositions[0] = currentPos.clone();
                        
                        // Safely update line geometry with simpler approach
                        try {
                          MeshBuilder.CreateLines("customerSegmentsTrail", {
                            points: trailPositions,
                            instance: trailLine
                          }, scene);
                        } catch (error) {
                          // Skip trail update if it fails
                        }
                      }
                    }
                    // Note: When paused, tracer sphere stays at current position
                    
                    // Continue animation loop
                    requestAnimationFrame(animateTracer);
                  }
                };
                
                // Start animation
                animateTracer();
                
                console.log(`✅ Blue tracer animation created for Customer Segments with ${pathPoints.length} path points:`);
                pathPoints.forEach((point, index) => {
                  console.log(`  Point ${index}: (${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)})`);
                });
              };
              
              // Create the blue tracer after a short delay to ensure mesh is ready
              setTimeout(createBlueTracer, 100);
            }
            
            mesh.material = sectionMaterial;
            mesh.receiveShadows = true;
            
            // Store original color and material for hover/click effects
            (mesh as any).originalColor = baseColor.clone();
            (mesh as any).originalMaterial = sectionMaterial;
            (mesh as any).isClicked = false;
            
            // Create billboard label above this mesh but make it invisible
            const labelContainer = new Rectangle(`label_${index}`);
            labelContainer.widthInPixels = 200;
            labelContainer.heightInPixels = 40;
            labelContainer.cornerRadius = 8;
            labelContainer.color = "white";
            labelContainer.thickness = 2;
            labelContainer.background = "rgba(0, 0, 0, 0.7)";
            // Value Propositions label should always appear in front
            labelContainer.zIndex = sectionName === "Value Propositions" ? 2000 : 1000;
            
            const labelText = new TextBlock(`labelText_${index}`, sectionName);
            labelText.color = "white";
            labelText.fontSize = "14px";
            labelText.fontFamily = "Arial, sans-serif";
            labelText.fontWeight = "bold";
            
            labelContainer.addControl(labelText);
            advancedTexture.addControl(labelContainer);
            
            // Position label higher above mesh top with billboard behavior
            // Special much higher positioning for Value Proposition label
            const labelHeight = sectionName === "Value Propositions" ? 3.5 : 1.2; // Much higher for Value Propositions
            
            // Link label to 3D position with billboard behavior
            labelContainer.linkWithMesh(mesh);
            labelContainer.linkOffsetY = `-${labelHeight * 50}px`; // Convert world units to approximate pixels
            
            // Hide the label by making it invisible
            labelContainer.isVisible = false;
            
            // Create content panel for click events (initially hidden)
            const contentPanel = new Rectangle(`contentPanel_${index}`);
            contentPanel.widthInPixels = 320;
            contentPanel.heightInPixels = 240;
            contentPanel.cornerRadius = 12;
            contentPanel.color = "white";
            contentPanel.thickness = 2;
            contentPanel.background = "rgba(255, 255, 255, 0.95)";
            contentPanel.isVisible = false; // Initially hidden
            contentPanel.zIndex = 9999; // Maximum z-index to ensure BMC panels always draw on top of all other elements
            
            // Create title text at top of panel
            const titleText = new TextBlock(`titleText_${index}`, sectionName);
            titleText.color = "black";
            titleText.fontSize = "14px";
            titleText.fontWeight = "bold";
            titleText.fontFamily = "Arial, sans-serif";
            titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
            titleText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            titleText.paddingTop = "8px";
            titleText.height = "25px";
            
            // Create close button (just X text, no box)
            const closeButton = new TextBlock(`closeButton_${index}`, "X");
            closeButton.color = "grey";
            closeButton.fontSize = "16px";
            closeButton.fontWeight = "bold";
            closeButton.fontFamily = "Arial, sans-serif";
            closeButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            closeButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            closeButton.topInPixels = 8;
            closeButton.leftInPixels = -12;
            closeButton.widthInPixels = 20;
            closeButton.heightInPixels = 20;
            closeButton.isPointerBlocker = true;
            
            // Create content text area (below title)
            const contentText = new TextBlock(`contentText_${index}`, "");
            contentText.color = "black";
            contentText.fontSize = "13px"; // Slightly larger
            contentText.fontFamily = "Arial, sans-serif";
            contentText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            contentText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            contentText.paddingTop = "45px"; // Below title
            contentText.paddingLeft = "15px";
            contentText.paddingRight = "15px";
            contentText.paddingBottom = "15px";
            contentText.textWrapping = true;
            
            contentPanel.addControl(titleText);
            contentPanel.addControl(closeButton);
            contentPanel.addControl(contentText);
            advancedTexture.addControl(contentPanel);
            
            // Position content panel above the label at moderate height
            contentPanel.linkWithMesh(mesh);
            contentPanel.linkOffsetY = `-${(labelHeight + 2.8) * 50}px`; // Moderately above the label for good visibility
            
            // Close button will be configured after interaction functions are defined
            
            // Store references for hover and click effects
            (mesh as any).labelContainer = labelContainer;
            (mesh as any).contentPanel = contentPanel;
            (mesh as any).contentText = contentText;
            
            // Add to panels array for global closing
            contentPanelsRef.current.push({ panel: contentPanel, mesh, material: sectionMaterial });
            
            // Initialize BMC state manager with this object's original height
            const bmcComponent = mapSectionNameToBMCComponent(sectionName);
            if (bmcComponent) {
              const currentHeight = mesh.scaling.y;
              bmcState.updateTransformState(bmcComponent, { 
                originalHeight: currentHeight,
                currentHeight: currentHeight 
              });
            }
            
            // Enable pointer events for this mesh with proper setup
            mesh.actionManager = new ActionManager(scene);
            mesh.isPickable = true; // Ensure mesh is pickable for hover/click
            console.log(`🎯 ${sectionName}: ActionManager and pickable state enabled`);
            
            // Unified hover handlers using BMC state manager
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              handleBMCObjectHoverEnter(sectionName);
            }));
            
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              handleBMCObjectHoverExit(sectionName);
            }));
            
            // REMOVED: Old click select function - replaced by unified BMC system
            
            // REMOVED: Old click unselect function - replaced by unified BMC system
            
            const updateContentPanel = (show: boolean, sectionContent?: string) => {
              const contentPanel = (mesh as any).contentPanel;
              const contentText = (mesh as any).contentText;
              
              if (show && contentText && contentPanel && sectionContent) {
                contentText.text = sectionContent;
                contentPanel.isVisible = true;
              } else if (contentPanel) {
                contentPanel.isVisible = false;
              }
            };
            
            // Double-click to show panel directly
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnDoublePickTrigger, () => {
              console.log(`⚡ Double-click detected on ${sectionName}`);
              
              // Ensure object is selected first
              if (!((mesh as any).isClicked)) {
                // Handle selecting a new object while another is already selected
                const previouslySelectedObject = getSelectedObject();
                
                // Close all other panels first and reset their visual states
                contentPanelsRef.current.forEach(({ panel, mesh: otherMesh, material }) => {
                  if (otherMesh !== mesh && panel.isVisible) {
                    panel.isVisible = false;
                    
                    // Properly restore other mesh based on whether it has texture
                    if ((otherMesh as any).hasTexture) {
                      // For textured mesh, remove emissive glow
                      material.emissiveColor = new Color3(0, 0, 0);
                    } else {
                      // For non-textured mesh, restore base color and diffuseColor
                      if (material.baseColor) {
                        material.baseColor = (otherMesh as any).originalColor;
                      }
                      material.diffuseColor = (otherMesh as any).originalColor;
                    }
                    
                    (otherMesh as any).isClicked = false;
                  }
                });
                
                // If there was a previously selected object, flatten it
                if (previouslySelectedObject && adjustBMCSection) {
                  adjustBMCSection(previouslySelectedObject, { height: 0.1 });
                  console.log(`📏 Flattening previously selected ${previouslySelectedObject} (height: 0.1)`);
                }
                
                // Save selected object state FIRST so applyHeightState knows what's selected
                setSelectedObject(sectionName);
                
                // REMOVED: Old click select - now handled by BMC system
              }
              
              // Show panel regardless of selection state
              const sectionContent = getSectionContent(sectionName);
              updateContentPanel(true, sectionContent);
              console.log(`⚡ Double-click: ${sectionName} selected and panel shown`);
            }));
            
            // Click - use new BMC selection system
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              // Use new BMC object click handler
              handleBMCObjectClick(sectionName);
            }));
            
            // Now configure close button functionality with access to refactored functions
            closeButton.onPointerClickObservable.add(() => {
              // Clear selected object state FIRST so applyHeightState knows nothing is selected
              setSelectedObject(null);
              
              // REMOVED: Old click unselect - now handled by BMC system
              updateContentPanel(false);
              
              console.log(`❌ Close button: ${sectionName} panel closed, mesh restored, all objects full opacity`);
            });
            
            console.log(`🎨 Mesh ${index}: ${mesh.name || 'unnamed'} - ${sectionName} - Interactive color: ${baseColor.r.toFixed(2)}, ${baseColor.g.toFixed(2)}, ${baseColor.b.toFixed(2)}`);
            sectionIndex++;
          }
        });
        
        // Apply Value Proposition height adjustment using new coordinate system
        setTimeout(() => {
          transformUtils.setSectionHeight("Value Propositions", 1.08);
          console.log("📏 Value Propositions adjusted to 1.08 height (20% taller, then 10% reduction)");
        }, 500);

        // Apply standard base color top face to Customer Channels section
        setTimeout(() => {
          console.log("🎯 About to apply standard base color to Customer Channels section");
          applyDarkTopFace("Channels");
        }, 1500);

        // Debug current coordinates to understand proper positioning
        setTimeout(() => {
          transformUtils.debugCoordinates();
          
          // Measure Customer Channels dimensions for precise Revenue Streams alignment
          const channelsMesh = scene.meshes.find(mesh => (mesh as any).bmcSectionName === "Channels");
          if (channelsMesh) {
            const boundingInfo = channelsMesh.getBoundingInfo();
            const worldMatrix = channelsMesh.getWorldMatrix();
            const min = Vector3.TransformCoordinates(boundingInfo.minimum, worldMatrix);
            const max = Vector3.TransformCoordinates(boundingInfo.maximum, worldMatrix);
            
            console.log("🔍 Customer Channels Coordinates:");
            console.log(`  Left edge (min X): ${min.x.toFixed(3)}`);
            console.log(`  Right edge (max X): ${max.x.toFixed(3)}`);
            console.log(`  Width: ${(max.x - min.x).toFixed(3)}`);
            console.log(`  Center X: ${((min.x + max.x) / 2).toFixed(3)}`);
            console.log(`  Position: (${channelsMesh.position.x.toFixed(3)}, ${channelsMesh.position.y.toFixed(3)}, ${channelsMesh.position.z.toFixed(3)})`);
            console.log(`  Scale: (${channelsMesh.scaling.x.toFixed(3)}, ${channelsMesh.scaling.y.toFixed(3)}, ${channelsMesh.scaling.z.toFixed(3)})`);
          }
          
          // Measure Customer Segments dimensions for Revenue Streams width alignment
          const segmentsMesh = scene.meshes.find(mesh => (mesh as any).bmcSectionName === "Segments");
          if (segmentsMesh) {
            const boundingInfo = segmentsMesh.getBoundingInfo();
            const worldMatrix = segmentsMesh.getWorldMatrix();
            const min = Vector3.TransformCoordinates(boundingInfo.minimum, worldMatrix);
            const max = Vector3.TransformCoordinates(boundingInfo.maximum, worldMatrix);
            
            console.log("🔍 Customer Segments Coordinates:");
            console.log(`  Left edge (min X): ${min.x.toFixed(3)}`);
            console.log(`  Right edge (max X): ${max.x.toFixed(3)}`);
            console.log(`  Width: ${(max.x - min.x).toFixed(3)}`);
            console.log(`  Center X: ${((min.x + max.x) / 2).toFixed(3)}`);
            console.log(`  Position: (${segmentsMesh.position.x.toFixed(3)}, ${segmentsMesh.position.y.toFixed(3)}, ${segmentsMesh.position.z.toFixed(3)})`);
            console.log(`  Scale: (${segmentsMesh.scaling.x.toFixed(3)}, ${segmentsMesh.scaling.y.toFixed(3)}, ${segmentsMesh.scaling.z.toFixed(3)})`);
          }
          
          // Calculate Revenue Streams scaling to align right edge with Customer Segments
          const revenueStreamsMesh = scene.meshes.find(mesh => (mesh as any).bmcSectionName === "Revenue Streams");
          if (revenueStreamsMesh && segmentsMesh) {
            // Get current Revenue Streams dimensions
            const revBoundingInfo = revenueStreamsMesh.getBoundingInfo();
            const revWorldMatrix = revenueStreamsMesh.getWorldMatrix();
            const revMin = Vector3.TransformCoordinates(revBoundingInfo.minimum, revWorldMatrix);
            const revMax = Vector3.TransformCoordinates(revBoundingInfo.maximum, revWorldMatrix);
            const currentRevWidth = revMax.x - revMin.x;
            
            // Get Customer Segments right edge
            const segBoundingInfo = segmentsMesh.getBoundingInfo();
            const segWorldMatrix = segmentsMesh.getWorldMatrix();
            const segMin = Vector3.TransformCoordinates(segBoundingInfo.minimum, segWorldMatrix);
            const segMax = Vector3.TransformCoordinates(segBoundingInfo.maximum, segWorldMatrix);
            
            // Calculate required width: Revenue Streams left edge (0.467) to Customer Segments right edge
            const requiredWidth = segMax.x - 0.467; // 0.467 is the perfect left edge alignment
            const scalingRatio = requiredWidth / currentRevWidth;
            
            // Apply only X-axis scaling to change width while keeping position
            const currentScale = revenueStreamsMesh.scaling;
            revenueStreamsMesh.scaling = new Vector3(currentScale.x * scalingRatio, currentScale.y, currentScale.z);
            
            console.log("🔧 Revenue Streams Width Adjustment:");
            console.log(`  Current width: ${currentRevWidth.toFixed(3)}`);
            console.log(`  Required width: ${requiredWidth.toFixed(3)}`);
            console.log(`  Scaling ratio: ${scalingRatio.toFixed(3)}`);
            console.log(`  New X scale: ${(currentScale.x * scalingRatio).toFixed(3)}`);
            console.log(`  Customer Segments right edge: ${segMax.x.toFixed(3)}`);
            
            console.log("✅ Revenue Streams mesh found and resized!");
            console.log(`  Has label plane children: ${revenueStreamsMesh.getChildMeshes().length > 0}`);
          } else {
            console.log("❌ Revenue Streams mesh or Customer Segments NOT found - cannot resize width");
          }
        }, 2000);
        
        // Delayed Revenue Streams width adjustment to ensure both meshes are fully loaded
        setTimeout(() => {
          console.log("🔍 DELAYED: Searching for meshes to resize Revenue Streams...");
          
          // Debug all available meshes
          console.log(`🔍 Available meshes (${scene.meshes.length}):`);
          scene.meshes.forEach((mesh, i) => {
            const sectionName = (mesh as any).bmcSectionName;
            console.log(`  ${i}: ${mesh.name} - section: ${sectionName || 'none'}`);
          });
          
          const revenueStreamsMesh = scene.meshes.find(mesh => (mesh as any).bmcSectionName === "Revenue Streams");
          const segmentsMesh = scene.meshes.find(mesh => (mesh as any).bmcSectionName === "Segments");
          
          if (revenueStreamsMesh && segmentsMesh) {
            // Get current Revenue Streams dimensions
            const revBoundingInfo = revenueStreamsMesh.getBoundingInfo();
            const revWorldMatrix = revenueStreamsMesh.getWorldMatrix();
            const revMin = Vector3.TransformCoordinates(revBoundingInfo.minimum, revWorldMatrix);
            const revMax = Vector3.TransformCoordinates(revBoundingInfo.maximum, revWorldMatrix);
            const currentRevWidth = revMax.x - revMin.x;
            
            // Get Customer Segments right edge
            const segBoundingInfo = segmentsMesh.getBoundingInfo();
            const segWorldMatrix = segmentsMesh.getWorldMatrix();
            const segMin = Vector3.TransformCoordinates(segBoundingInfo.minimum, segWorldMatrix);
            const segMax = Vector3.TransformCoordinates(segBoundingInfo.maximum, segWorldMatrix);
            
            // Calculate required width: From Revenue Streams left edge (A) to Customer Segments right edge (B)
            // This keeps left edge at A but shrinks right edge from C to B position
            const revenueLeftEdge = 0.467; // Position A - perfectly aligned with Customer Channels
            const targetWidth = segMax.x - revenueLeftEdge; // Width from A to B
            
            // Calculate scaling needed to achieve this exact width
            const baseWidth = currentRevWidth / revenueStreamsMesh.scaling.x; // Get unscaled width
            const requiredScaleX = targetWidth / baseWidth;
            
            // Apply X-axis scaling to align right edge with Customer Segments
            revenueStreamsMesh.scaling.x = requiredScaleX;
            
            console.log("🔧 DELAYED Revenue Streams Width Alignment:");
            console.log(`  Current width: ${currentRevWidth.toFixed(3)}`);
            console.log(`  Revenue left edge (A): ${revenueLeftEdge.toFixed(3)}`);
            console.log(`  Customer Segments right edge (B): ${segMax.x.toFixed(3)}`);
            console.log(`  Target width (A to B): ${targetWidth.toFixed(3)}`);
            console.log(`  Base width (unscaled): ${baseWidth.toFixed(3)}`);
            console.log(`  Required X scale: ${requiredScaleX.toFixed(3)}`);
            console.log("✅ Revenue Streams right edge aligned with Customer Segments!");
          } else {
            console.log(`❌ DELAYED: Missing meshes - Revenue Streams: ${!!revenueStreamsMesh}, Customer Segments: ${!!segmentsMesh}`);
          }
        }, 4000);
        
        // Immediate Revenue Streams width check
        setTimeout(() => {
          const revenueStreamsMesh = scene.meshes.find(mesh => (mesh as any).bmcSectionName === "Revenue Streams");
          if (revenueStreamsMesh) {
            const revBoundingInfo = revenueStreamsMesh.getBoundingInfo();
            const revWorldMatrix = revenueStreamsMesh.getWorldMatrix();
            const revMin = Vector3.TransformCoordinates(revBoundingInfo.minimum, revWorldMatrix);
            const revMax = Vector3.TransformCoordinates(revBoundingInfo.maximum, revWorldMatrix);
            const currentRevWidth = revMax.x - revMin.x;
            
            console.log("📏 CURRENT Revenue Streams Dimensions:");
            console.log(`  Left edge (min X): ${revMin.x.toFixed(3)}`);
            console.log(`  Right edge (max X): ${revMax.x.toFixed(3)}`);
            console.log(`  Current width: ${currentRevWidth.toFixed(3)}`);
            console.log(`  Current X scale: ${revenueStreamsMesh.scaling.x.toFixed(3)}`);
            console.log(`  Position: (${revenueStreamsMesh.position.x.toFixed(3)}, ${revenueStreamsMesh.position.y.toFixed(3)}, ${revenueStreamsMesh.position.z.toFixed(3)})`);
          } else {
            console.log("❌ Revenue Streams mesh not found for width check");
          }
        }, 5000);


        
      } else {
        console.error("❌ No meshes found in BMC model");
      }
    }).catch((error) => {
      console.error("❌ Failed to load BMC model:", error);
    });

    // Load Revenue Streams as separate GLB model positioned below Customer Channels
    console.log(`🔄 Starting to load Revenue Streams model...`);
    SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_07_RevenueStreams_1754360428541.glb", scene).then((result) => {
      console.log(`🔄 Revenue Streams model load completed, meshes: ${result.meshes.length}`);
      if (result.meshes.length > 0) {
        console.log(`✅ Revenue Streams model loaded with ${result.meshes.length} meshes`);
        
        const revenueRootMesh = result.meshes[0];
        
        // Position Revenue Streams to align with LEFT EDGE of Customer Channels
        // From console logs: Customer Channels left edge = 0.467, Revenue Streams left edge = 0.155
        // Need to move right by 0.312 units to align: Current X position -0.533 becomes -0.221
        // X-axis: negative = LEFT, positive = RIGHT
        // Z-axis: negative = UP (screen), positive = DOWN (screen)
        revenueRootMesh.position = new Vector3(-0.221, 0.1, -10.5); // Adjusted to align left edges
        revenueRootMesh.rotation = Vector3.Zero();
        revenueRootMesh.scaling = new Vector3(7.7, 8, 8);
        
        console.log(`📦 Revenue Streams positioned at (-0.533, 0.1, -10.5) - aligned with Customer Channels left edge`);
        
        // Apply basic material and label to Revenue Streams mesh  
        console.log(`🔍 Revenue Streams meshes found: ${result.meshes.length}`);
        result.meshes.forEach((mesh, index) => {
          console.log(`🔍 Processing Revenue Streams mesh ${index}: ${mesh.name}, has material: ${!!mesh.material}, is root: ${mesh.name === "__root__"}`);
        });
        
        result.meshes.forEach((mesh, index) => {
          if (mesh.name !== "__root__") {
            console.log(`✅ Processing non-root Revenue Streams mesh ${index}: ${mesh.name}`);
            
            // Create material for Revenue Streams mesh first (required for labels)
            const baseColor = new Color3(0.07, 0.07, 0.07);
            const sectionMaterial = new StandardMaterial(`revenueStreams_${index}`, scene);
            sectionMaterial.diffuseColor = baseColor;
            sectionMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
            sectionMaterial.specularPower = 32;
            mesh.material = sectionMaterial;
            
            // Store section name for interactions and original properties 
            (mesh as any).bmcSectionName = "Revenue Streams";
            (mesh as any).originalColor = baseColor.clone();
            (mesh as any).isClicked = false;
            (mesh as any).hasTexture = false; // Revenue Streams uses solid color
            
            // Register with unified transformation system
            unifiedTransformRef.current.registerObject("Revenue Streams", {
              mesh: mesh,
              sectionName: "Revenue Streams",
              objectType: 'separate_glb',
              rootMesh: revenueRootMesh
            });
            
            // Create content panel for consistency (hidden)
            const revenueContentPanel = new Rectangle(`revenueStreamsContentPanel`);
            revenueContentPanel.isVisible = false;
            advancedTexture.addControl(revenueContentPanel);
            
            // Add to contentPanelsRef for coordinated hover behavior
            contentPanelsRef.current.push({ 
              panel: revenueContentPanel, 
              mesh: mesh as any, 
              material: sectionMaterial 
            });
            
            // Initialize BMC state for Revenue Streams
            const currentHeight = mesh.scaling.y;
            bmcState.updateTransformState('RevenueStreams', { 
              originalHeight: currentHeight,
              currentHeight: currentHeight 
            });
            
            // Create action manager for hover interactions
            if (!mesh.actionManager) {
              mesh.actionManager = new ActionManager(scene);
              mesh.isPickable = true;
            }
            
            // Unified hover handlers using BMC state manager
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              handleBMCObjectHoverEnter("Revenue Streams");
            }));
            
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              handleBMCObjectHoverExit("Revenue Streams");
            }));
            
            // Add selection (click) behavior for Revenue Streams using new BMC system
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              // Use new BMC object click handler
              handleBMCObjectClick("Revenue Streams");
            }));

            // Double-click to show panel directly (Revenue Streams)
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnDoublePickTrigger, () => {
              console.log(`⚡ Double-click detected on Revenue Streams`);
              
              // Ensure object is selected first using unified BMC system
              handleBMCObjectClick("Revenue Streams");
              
              // Show panel (Revenue Streams content would come from getSectionContent)
              const sectionContent = getSectionContent("Revenue Streams");
              // Note: Revenue Streams may not have content panels yet, but this prepares for future implementation
              console.log(`⚡ Double-click: Revenue Streams selected and ready for panel display`);
            }));

            // Add floating label plane for Revenue Streams section (same pattern as Customer Channels)
            console.log(`🏷️ Creating floating label for Revenue Streams mesh (index ${index})`);
            
            // Get mesh bounds for positioning
            const boundingInfo = mesh.getBoundingInfo();
            const center = boundingInfo.boundingBox.center;
            const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
            
            // Create label plane with proper aspect ratio to prevent vertical squishing
            const labelWidth = size.x * 0.65; // Same as Customer Channels
            const labelHeight = (labelWidth * 0.25) * 2.0; // Doubled height to prevent squishing
            console.log(`Revenue Streams Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
            console.log(`🔍 Revenue Streams mesh center: (${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})`);
            console.log(`🔍 Revenue Streams mesh size: (${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)})`);
            
            const labelPlane = MeshBuilder.CreatePlane("revenueStreamsLabel", {
              width: labelWidth,
              height: labelHeight
            }, scene);
            
            // Center the label horizontally and vertically within the top face of the Revenue Streams object
            labelPlane.position.x = center.x; // Center horizontally
            labelPlane.position.y = center.y + size.y * 0.6; // Position on top face
            labelPlane.position.z = center.z; // Center vertically (Z-axis)
            
            // Rotate to be flat on top and then 90 degrees counterclockwise to read properly
            labelPlane.rotation.x = Math.PI / 2;
            labelPlane.rotation.y = -Math.PI / 2; // 90 degrees counterclockwise for proper text orientation
            
            // Create bright material for white text (same as Customer Channels)
            const labelMaterial = new StandardMaterial("revenueStreamsLabelMat", scene);
            const labelTexture = new Texture("/textures/Label_RevenueStreams.png", scene);
            labelTexture.hasAlpha = true;
            
            labelMaterial.diffuseTexture = labelTexture;
            labelMaterial.emissiveTexture = labelTexture;
            labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
            labelMaterial.useAlphaFromDiffuseTexture = true;
            labelMaterial.disableLighting = false;
            
            labelPlane.material = labelMaterial;
            labelPlane.parent = mesh;
            labelPlane.isPickable = false;
            
            // Apply proportional scaling - reduced by 20% from the 2x size
            labelPlane.scaling = new Vector3(1.6, 2.08, 1.0); // 80% of 2x size (2.0 * 0.8 = 1.6, 2.6 * 0.8 = 2.08)
            
            console.log(`✅ Revenue Streams label plane created at position: (${labelPlane.position.x.toFixed(3)}, ${labelPlane.position.y.toFixed(3)}, ${labelPlane.position.z.toFixed(3)})`);
            console.log(`🔍 Label rotation: (${labelPlane.rotation.x.toFixed(3)}, ${labelPlane.rotation.y.toFixed(3)}, ${labelPlane.rotation.z.toFixed(3)})`);
            console.log(`🔍 Label scale: (${labelPlane.scaling.x.toFixed(3)}, ${labelPlane.scaling.y.toFixed(3)}, ${labelPlane.scaling.z.toFixed(3)})`);
            console.log(`🔍 Label dimensions: ${labelWidth.toFixed(3)} x ${labelHeight.toFixed(3)}`);
            
            console.log(`🎨 Revenue Streams Mesh ${index}: ${mesh.name || 'unnamed'} configured`);
          }
        });
        
        // Debug Revenue Streams dimensions with fixed narrower width
        setTimeout(() => {
          const revenueMesh = result.meshes.find(mesh => mesh.name !== "__root__");
          if (revenueMesh) {
            const boundingInfo = revenueMesh.getBoundingInfo();
            const worldMatrix = revenueMesh.getWorldMatrix();
            const min = Vector3.TransformCoordinates(boundingInfo.minimum, worldMatrix);
            const max = Vector3.TransformCoordinates(boundingInfo.maximum, worldMatrix);
            const width = max.x - min.x;
            
            console.log("📏 Revenue Streams Fixed Dimensions (X-scale 7.7):");
            console.log(`  Left edge (min X): ${min.x.toFixed(3)}`);
            console.log(`  Right edge (max X): ${max.x.toFixed(3)}`);
            console.log(`  Width: ${width.toFixed(3)}`);
            console.log(`  Position: (${revenueRootMesh.position.x.toFixed(3)}, ${revenueRootMesh.position.y.toFixed(3)}, ${revenueRootMesh.position.z.toFixed(3)})`);
            console.log(`  Scale: (${revenueRootMesh.scaling.x.toFixed(3)}, ${revenueRootMesh.scaling.y.toFixed(3)}, ${revenueRootMesh.scaling.z.toFixed(3)})`);
          }
        }, 500);
        
      } else {
        console.error("❌ No meshes found in Revenue Streams model");
      }
    }).catch((error) => {
      console.error("❌ Failed to load Revenue Streams model:", error);
      console.error("❌ Revenue Streams model error details:", error.message);
    });

    // Load Cost Structure as separate GLB model positioned in lower left area (yellow rectangle in diagram)
    console.log(`🔄 Starting to load Cost Structure model...`);
    SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_07_RevenueStreams_1754360428541.glb", scene).then((result) => {
      console.log(`🔄 Cost Structure model load completed, meshes: ${result.meshes.length}`);
      if (result.meshes.length > 0) {
        console.log(`✅ Cost Structure model loaded with ${result.meshes.length} meshes`);
        
        const costRootMesh = result.meshes[0];
        
        // Position Cost Structure in lower left area (yellow rectangle from diagram)
        // X-axis: negative = LEFT, positive = RIGHT
        // Z-axis: negative = UP (screen), positive = DOWN (screen)
        // Place in lower left area with same width as Revenue Streams
        costRootMesh.position = new Vector3(-10.1, 0.1, -10.5); // Shifted farther left
        costRootMesh.rotation = Vector3.Zero();
        costRootMesh.scaling = new Vector3(8.0, 8, 8); // Width set to 8.0
        
        console.log(`📦 Cost Structure positioned at (-10.1, 0.1, -10.5) - width 8.0, positioned farther left`);
        
        // Apply basic material and label to Cost Structure mesh  
        console.log(`🔍 Cost Structure meshes found: ${result.meshes.length}`);
        result.meshes.forEach((mesh, index) => {
          console.log(`🔍 Processing Cost Structure mesh ${index}: ${mesh.name}, has material: ${!!mesh.material}, is root: ${mesh.name === "__root__"}`);
        });
        
        result.meshes.forEach((mesh, index) => {
          if (mesh.name !== "__root__") {
            console.log(`✅ Processing non-root Cost Structure mesh ${index}: ${mesh.name}`);
            
            // Create material for Cost Structure mesh (same pattern as Revenue Streams)
            const baseColor = new Color3(0.07, 0.07, 0.07);
            const sectionMaterial = new StandardMaterial(`costStructure_${index}`, scene);
            sectionMaterial.diffuseColor = baseColor;
            sectionMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
            sectionMaterial.specularPower = 32;
            mesh.material = sectionMaterial;
            
            // Store section name for interactions and original properties 
            (mesh as any).bmcSectionName = "Cost Structure";
            (mesh as any).originalColor = baseColor.clone();
            (mesh as any).isClicked = false;
            (mesh as any).hasTexture = false; // Cost Structure uses solid color
            
            // Register with unified transformation system
            unifiedTransformRef.current.registerObject("Cost Structure", {
              mesh: mesh,
              sectionName: "Cost Structure",
              objectType: 'separate_glb',
              rootMesh: costRootMesh
            });
            
            // Create content panel for consistency (hidden)
            const costContentPanel = new Rectangle(`costStructureContentPanel`);
            costContentPanel.isVisible = false;
            advancedTexture.addControl(costContentPanel);
            
            // Add to contentPanelsRef for coordinated hover behavior
            contentPanelsRef.current.push({ 
              panel: costContentPanel, 
              mesh: mesh as any, 
              material: sectionMaterial 
            });
            
            // Initialize BMC state for Cost Structure
            const currentHeight = mesh.scaling.y;
            bmcState.updateTransformState('CostStructure', { 
              originalHeight: currentHeight,
              currentHeight: currentHeight 
            });
            
            // Create action manager for hover interactions
            if (!mesh.actionManager) {
              mesh.actionManager = new ActionManager(scene);
              mesh.isPickable = true;
            }
            
            // Unified hover handlers using BMC state manager
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              handleBMCObjectHoverEnter("Cost Structure");
            }));
            
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              handleBMCObjectHoverExit("Cost Structure");
            }));
            
            // Add selection (click) behavior for Cost Structure using new BMC system
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              // Use new BMC object click handler
              handleBMCObjectClick("Cost Structure");
            }));

            // Double-click to show panel directly (Cost Structure)
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnDoublePickTrigger, () => {
              console.log(`⚡ Double-click detected on Cost Structure`);
              
              // Ensure object is selected first using unified BMC system
              handleBMCObjectClick("Cost Structure");
              
              // Show panel (Cost Structure content would come from getSectionContent)
              const sectionContent = getSectionContent("Cost Structure");
              // Note: Cost Structure may not have content panels yet, but this prepares for future implementation
              console.log(`⚡ Double-click: Cost Structure selected and ready for panel display`);
            }));

            // Add floating label plane for Cost Structure section (exact same pattern as Revenue Streams)
            console.log(`🏷️ Creating floating label for Cost Structure mesh (index ${index})`);
            
            // Get mesh bounds for positioning
            const boundingInfo = mesh.getBoundingInfo();
            const center = boundingInfo.boundingBox.center;
            const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
            
            // Create label plane with same dimensions as Revenue Streams
            const labelWidth = size.x * 0.65;
            const labelHeight = (labelWidth * 0.25) * 2.0;
            console.log(`Cost Structure Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
            console.log(`🔍 Cost Structure mesh center: (${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})`);
            console.log(`🔍 Cost Structure mesh size: (${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)})`);
            
            const labelPlane = MeshBuilder.CreatePlane("costStructureLabel", {
              width: labelWidth,
              height: labelHeight
            }, scene);
            
            // Center the label horizontally and vertically within the top face of the Cost Structure object
            labelPlane.position.x = center.x; // Center horizontally
            labelPlane.position.y = center.y + size.y * 0.6; // Position on top face
            labelPlane.position.z = center.z; // Center vertically (Z-axis)
            
            // Rotate to be flat on top and then 90 degrees counterclockwise (same as Revenue Streams)
            labelPlane.rotation.x = Math.PI / 2;
            labelPlane.rotation.y = -Math.PI / 2; // 90 degrees counterclockwise for proper text orientation
            
            // Create material with Cost Structure label texture
            const labelMaterial = new StandardMaterial("costStructureLabelMat", scene);
            const labelTexture = new Texture("/textures/Label_CostStructure_1754477996199.png", scene);
            labelTexture.hasAlpha = true;
            
            labelMaterial.diffuseTexture = labelTexture;
            labelMaterial.emissiveTexture = labelTexture;
            labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
            labelMaterial.useAlphaFromDiffuseTexture = true;
            labelMaterial.disableLighting = false;
            
            labelPlane.material = labelMaterial;
            labelPlane.parent = mesh;
            labelPlane.isPickable = false;
            
            // Apply same proportional scaling as Revenue Streams
            labelPlane.scaling = new Vector3(1.6, 2.08, 1.0);
            
            console.log(`✅ Cost Structure label plane created at position: (${labelPlane.position.x.toFixed(3)}, ${labelPlane.position.y.toFixed(3)}, ${labelPlane.position.z.toFixed(3)})`);
            console.log(`🔍 Label rotation: (${labelPlane.rotation.x.toFixed(3)}, ${labelPlane.rotation.y.toFixed(3)}, ${labelPlane.rotation.z.toFixed(3)})`);
            console.log(`🔍 Label scale: (${labelPlane.scaling.x.toFixed(3)}, ${labelPlane.scaling.y.toFixed(3)}, ${labelPlane.scaling.z.toFixed(3)})`);
            console.log(`🔍 Label dimensions: ${labelWidth.toFixed(3)} x ${labelHeight.toFixed(3)}`);
            
            console.log(`🎨 Cost Structure Mesh ${index}: ${mesh.name || 'unnamed'} configured`);
          }
        });
        
        // Debug Cost Structure dimensions
        setTimeout(() => {
          const costMesh = result.meshes.find(mesh => mesh.name !== "__root__");
          if (costMesh) {
            const boundingInfo = costMesh.getBoundingInfo();
            const worldMatrix = costMesh.getWorldMatrix();
            const min = Vector3.TransformCoordinates(boundingInfo.minimum, worldMatrix);
            const max = Vector3.TransformCoordinates(boundingInfo.maximum, worldMatrix);
            const width = max.x - min.x;
            
            console.log("📏 Cost Structure Fixed Dimensions (X-scale 7.7):");
            console.log(`  Left edge (min X): ${min.x.toFixed(3)}`);
            console.log(`  Right edge (max X): ${max.x.toFixed(3)}`);
            console.log(`  Width: ${width.toFixed(3)}`);
            console.log(`  Position: (${costRootMesh.position.x.toFixed(3)}, ${costRootMesh.position.y.toFixed(3)}, ${costRootMesh.position.z.toFixed(3)})`);
            console.log(`  Scale: (${costRootMesh.scaling.x.toFixed(3)}, ${costRootMesh.scaling.y.toFixed(3)}, ${costRootMesh.scaling.z.toFixed(3)})`);
          }
        }, 500);
        
      } else {
        console.error("❌ No meshes found in Cost Structure model");
      }
    }).catch((error) => {
      console.error("❌ Failed to load Cost Structure model:", error);
      console.error("❌ Cost Structure model error details:", error.message);
    });

    // Helper functions for manipulating individual BMC sections
    // IMPORTANT: GLB Model Coordinate System Behavior
    // This specific GLB model (BMC_blender_09_complete_1753576063858.glb) has NORMAL Y-axis scaling:
    // - LARGER height values (>1.0) = TALLER shapes
    // - SMALLER height values (<1.0) = SHORTER shapes
    const adjustBMCSection = (sectionName: string, options: {
      height?: number;
      transparency?: number; 
      color?: Color3;
      scale?: Vector3;
    }) => {
      if (scene) {
        const meshes = scene.meshes;
        meshes.forEach((mesh) => {
          if ((mesh as any).bmcSectionName === sectionName) {
            const transformNode = (mesh as any).bmcTransformNode as TransformNode;
            const material = mesh.material as PBRMetallicRoughnessMaterial;
            
            if (transformNode) {
              // Adjust height (Y scaling)
              if (options.height !== undefined) {
                transformNode.scaling.y = options.height;
                console.log(`📏 ${sectionName} height adjusted to ${options.height}`);
              }
              
              // Adjust overall scale
              if (options.scale) {
                transformNode.scaling = options.scale;
                console.log(`📐 ${sectionName} scale adjusted to (${options.scale.x}, ${options.scale.y}, ${options.scale.z})`);
              }
            }
            
            if (material) {
              // Adjust transparency (alpha)
              if (options.transparency !== undefined) {
                material.alpha = 1 - options.transparency; // Convert transparency to alpha
                console.log(`👻 ${sectionName} transparency set to ${options.transparency}`);
              }
              
              // Adjust color
              if (options.color) {
                const vividColor = new Color3(
                  Math.pow(options.color.r, 0.7),
                  Math.pow(options.color.g, 0.7), 
                  Math.pow(options.color.b, 0.7)
                );
                material.baseColor = vividColor;
                (mesh as any).originalColor = options.color.clone();
                console.log(`🎨 ${sectionName} color changed to (${options.color.r.toFixed(2)}, ${options.color.g.toFixed(2)}, ${options.color.b.toFixed(2)})`);
              }
            }
          }
        });
      }
    };

    // Helper function to manipulate the entire BMC collection
    const adjustEntireBMC = (options: {
      position?: Vector3;
      rotation?: Vector3;
      scale?: Vector3;
    }) => {
      if (scene) {
        const rootTransform = scene.getNodeByName("__root__") as TransformNode;
        if (rootTransform) {
          if (options.position) {
            rootTransform.position = options.position;
            console.log(`🌍 Entire BMC position set to (${options.position.x}, ${options.position.y}, ${options.position.z})`);
          }
          if (options.rotation) {
            rootTransform.rotation = options.rotation;
            console.log(`🔄 Entire BMC rotation set to (${options.rotation.x}, ${options.rotation.y}, ${options.rotation.z})`);
          }
          if (options.scale) {
            rootTransform.scaling = options.scale;
            console.log(`📏 Entire BMC scale set to (${options.scale.x}, ${options.scale.y}, ${options.scale.z})`);
          }
        }
      }
    };

    // Helper function to list all available BMC sections
    const listBMCSections = () => {
      if (scene) {
        const sections: string[] = [];
        scene.meshes.forEach((mesh) => {
          if ((mesh as any).bmcSectionName) {
            sections.push((mesh as any).bmcSectionName);
          }
        });
        console.log("📋 Available BMC sections:", sections);
        console.log("📊 Hierarchy: Root Transform → Individual TransformNodes → Meshes");
        return sections;
      }
      return [];
    };

    // Expose manipulation functions globally for development/testing
    (window as any).adjustBMCSection = adjustBMCSection;
    (window as any).adjustEntireBMC = adjustEntireBMC;
    (window as any).listBMCSections = listBMCSections;
    
    console.log("🔧 BMC manipulation functions available:");
    console.log("   window.adjustBMCSection(sectionName, {height, transparency, color, scale}) - individual sections");
    console.log("   window.adjustEntireBMC({position, rotation, scale}) - entire collection");
    console.log("   window.listBMCSections() - shows all available section names");
    console.log("📊 Hierarchy: Root Transform → Individual TransformNodes → Meshes");

    // SIMPLE: Save original heights when GLB model first loads
    const saveOriginalHeights = () => {
      console.log("📏 STARTUP: Saving original heights from GLB model...");
      
      // Check if we already have heights stored
      const existingHeights = getOriginalHeights();
      if (Object.keys(existingHeights).length > 0) {
        console.log("📏 Already have heights stored:", existingHeights);
        return true;
      }
      
      if (scene && scene.meshes && contentPanelsRef.current.length > 0) {
        const originalHeights: { [sectionName: string]: number } = {};
        
        // Read each mesh's current transform node scaling.y as the original height
        scene.meshes.forEach((mesh) => {
          const sectionName = (mesh as any).bmcSectionName;
          const transformNode = (mesh as any).bmcTransformNode as TransformNode;
          
          if (sectionName && transformNode) {
            const height = transformNode.scaling.y;
            originalHeights[sectionName] = height;
            console.log(`📏 ORIGINAL: ${sectionName} = ${height}`);
            
            // Initialize BMC object transform state
            const bmcComponent = mapSectionNameToBMCComponent(sectionName);
            if (bmcComponent) {
              bmcState.updateTransformState(bmcComponent, {
                originalHeight: height,
                currentHeight: height,
                position: mesh.position.clone(),
                scaling: mesh.scaling.clone()
              });
              console.log(`🔧 BMC State: Initialized "${bmcComponent}" with height ${height}`);
            }
          }
        });
        
        // Store in both places
        setOriginalHeights(originalHeights);
        originalHeightsRef.current = originalHeights;
        console.log("📏 SAVED original heights:", originalHeights);
        return true;
      }
      
      return false;
    };
    
    // Try to save heights immediately, then retry
    if (!saveOriginalHeights()) {
      setTimeout(() => {
        if (!saveOriginalHeights()) {
          setTimeout(() => saveOriginalHeights(), 1000);
        }
      }, 500);
    }
    
    // Clear any existing selection state to ensure hover behavior works on first load
    const clearAllSelections = () => {
      console.log("🔄 STARTUP: Clearing all selections to enable hover behavior");
      
      // Clear selection state in the store
      setSelectedObject(null);
      
      // Reset all mesh click states and restore original colors
      if (scene && contentPanelsRef.current.length > 0) {
        contentPanelsRef.current.forEach(({ mesh, material }) => {
          (mesh as any).isClicked = false;
          
          // Restore original colors
          if ((mesh as any).hasTexture) {
            material.emissiveColor = new Color3(0, 0, 0);
          } else {
            if (material.baseColor) {
              material.baseColor = (mesh as any).originalColor;
            }
            material.diffuseColor = (mesh as any).originalColor;
          }
          
          // Full opacity
          material.alpha = 1.0;
        });
        
        console.log("✅ All selections cleared, hover behavior enabled");
      }
    };
    
    // Clear selections immediately to ensure hover works
    setTimeout(() => {
      clearAllSelections();
    }, 1000);
    
    // Only restore selection state if user explicitly had something selected and heights are available
    // This prevents blocking hover behavior on initial load
    setTimeout(() => {
      const existingSelection = getSelectedObject();
      const hasHeights = Object.keys(getOriginalHeights()).length > 0;
      
      // Only restore if there's a clear user selection and we have height data
      if (existingSelection && hasHeights) {
        console.log("🔄 Initial load: Restoring user selection:", existingSelection);
        applyBMCVisualState();
      } else {
        console.log("🔄 Initial load: No selection to restore, hover behavior ready");
      }
    }, 2500);

    // Start the render loop with safety check
    let isDisposed = false;
    engine.runRenderLoop(() => {
      if (!isDisposed && scene && !scene.isDisposed) {
        scene.render();
      }
    });

    // Clean up on unmount
    return () => {
      isDisposed = true;
      
      // Save perspective camera state before disposing (only from perspective camera)
      if (cameraRef.current && !isOrthographic) {
        try {
          saveCamera3DState(
            cameraRef.current.alpha,
            cameraRef.current.beta,
            cameraRef.current.radius
          );
        } catch (e) {
          console.warn('Error saving camera state during cleanup:', e);
        }
      }

      // Properly dispose of Babylon.js resources
      try {
        if (scene && !scene.isDisposed) {
          scene.dispose();
        }
        if (engine && !engine.isDisposed) {
          engine.dispose();
        }
        sceneRef.current = null;
        engineRef.current = null;
      } catch (e) {
        console.warn('Error during Babylon.js cleanup:', e);
      }
    };
  }, [canvas, saveCamera3DState, isOrthographic]);

  // Handle camera switching when orthographic mode changes
  useEffect(() => {
    if (sceneRef.current && cameraRef.current && orthoCameraRef.current) {
      const scene = sceneRef.current;
      const perspectiveCamera = cameraRef.current;
      const orthoCamera = orthoCameraRef.current;
      
      if (isOrthographic) {
        // Save current perspective camera state before switching
        saveCamera3DState(
          perspectiveCamera.alpha,
          perspectiveCamera.beta,
          perspectiveCamera.radius
        );
        
        // Switch to orthographic camera
        scene.activeCamera = orthoCamera;
        
        // Apply visual state after camera switch
        setTimeout(() => {
          
          applyBMCVisualState();
        }, 10);
        
        console.log(`✅ SWITCHED TO 3D TOP VIEW`);
      } else {
        // Switch back to perspective camera
        scene.activeCamera = perspectiveCamera;
        
        // Apply visual state after camera switch
        setTimeout(() => {
          
          applyBMCVisualState();
        }, 10);
        
        console.log(`✅ SWITCHED TO 3D VIEW`);
      }
    }
  }, [isOrthographic]);

  // Control animations based on view mode - pause in 3D Top, resume in 3D View
  useEffect(() => {
    if (sceneRef.current) {
      const scene = sceneRef.current;
      
      // Find Value Proposition and Customer Segments meshes and control their animations
      scene.meshes.forEach((mesh) => {
        if (mesh.name && mesh.name.includes('Value Propositions')) {
          const animationRef = (mesh as any).pulsatingEdge;
          if (animationRef) {
            animationRef.isPaused = isOrthographic; // Pause in 3D Top view
            console.log(`🎬 Value Proposition animation ${isOrthographic ? 'PAUSED' : 'RESUMED'}`);
          }
        }
        
        if (mesh.name && mesh.name.includes('Customer Segments')) {
          const animationRef = (mesh as any).blueTracer;
          if (animationRef) {
            animationRef.isPaused = isOrthographic; // Pause in 3D Top view
            console.log(`🎬 Customer Segments animation ${isOrthographic ? 'PAUSED' : 'RESUMED'}`);
          }
        }
      });
      

    }
  }, [isOrthographic]);

  // Handle restoration when entering 3D mode - optimized for smooth transitions
  useEffect(() => {
    if (is3D && sceneRef.current) {
      const selectedObject = getSelectedObject();
      console.log(`🔄 ENTERING 3D MODE: Current selection="${selectedObject}"`);
      
      // Small delay to ensure scene is ready, then restore visual state
      setTimeout(() => {
        applyBMCVisualState();
        console.log(`✅ 3D MODE: BMC state applied`);
      }, 100);
    } else if (!is3D) {
      const selectedObject = getSelectedObject();
      console.log(`🔄 ENTERING 2D MODE: Preserving selection="${selectedObject}"`);
    }
  }, [is3D, applyBMCVisualState]);

  // Handle restoration when switching between 3D View and 3D Top View
  useEffect(() => {
    if (is3D && sceneRef.current) {
      const selectedObject = getSelectedObject();
      console.log(`🔄 3D VIEW TRANSITION: ${isOrthographic ? '3D Top' : '3D View'}, selection="${selectedObject}"`);
      
      // Small delay to ensure camera switch is complete, then restore visual state
      setTimeout(() => {
        applyBMCVisualState();
        console.log(`✅ 3D TRANSITION: BMC state restored for ${isOrthographic ? '3D Top' : '3D View'}`);
      }, 150);
    }
  }, [isOrthographic, is3D, applyBMCVisualState]);



  // Save camera state when switching away from 3D view
  useEffect(() => {
    return () => {
      if (cameraRef.current && !is3D) {
        saveCamera3DState(
          cameraRef.current.alpha,
          cameraRef.current.beta,
          cameraRef.current.radius
        );
      }
    };
  }, [is3D, saveCamera3DState]);

  return (
    <div className={`w-full h-full ${isTransitioning ? 'opacity-50' : ''} relative`}>
      {/* Header - positioned below button group */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{canvas.name}</h1>
      </div>
      
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ outline: 'none' }}
      />
    </div>
  );
};

export default Canvas3DBabylon;