import React, { useRef, useEffect, useState } from 'react';
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
  LinesMesh,
  PointerEventTypes
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
import { CleanBMCSystem, cleanBMCSystem } from '@/lib/cleanBMCSystem';
import { BabylonAnimationManager } from '@/lib/babylon/BabylonAnimationManager';
import { BabylonMaterialManager } from '@/lib/babylon/BabylonMaterialManager';
import { debugLog } from '@/lib/debug/DebugLogger';
import { setupDoubleClick } from '@/lib/interactions/DoubleClickHandler';
import { SceneSetup } from './Canvas3DBabylon/scene/SceneSetup';
import { BMCModelLoader } from './Canvas3DBabylon/models/BMCModelLoader';
import { InteractionHandler } from './Canvas3DBabylon/interactions/InteractionHandler';
import { ViewTransitionManager } from './Canvas3DBabylon/animations/ViewTransitionManager';

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
    debugLog.verbose('transform', `Registered ${sectionName} as ${descriptor.objectType}`);
  }
  
  // Universal height manipulation (handles different object types)
  setHeight(sectionName: string, height: number): boolean {
    const obj = this.objects.get(sectionName);
    if (!obj) {
      debugLog.warn('transform', `Object not found: ${sectionName}`);
      return false;
    }
    
    if (obj.objectType === 'main_bmc' && obj.transformNode) {
      // Main BMC sections use transformNode scaling
      obj.transformNode.scaling.y = height;
      debugLog.verbose('transform', `Main BMC: ${sectionName} height set to ${height}`);
    } else if (obj.objectType === 'separate_glb') {
      // Separate GLB objects use mesh scaling directly
      obj.mesh.scaling.y = height;
      debugLog.verbose('transform', `Separate GLB: ${sectionName} height set to ${height}`);
    }
    return true;
  }
  
  // Universal position manipulation
  setPosition(sectionName: string, x: number, y: number, z: number): boolean {
    const obj = this.objects.get(sectionName);
    if (!obj) {
      debugLog.warn('transform', `Object not found: ${sectionName}`);
      return false;
    }
    
    if (obj.objectType === 'main_bmc') {
      // Main BMC sections cannot be repositioned individually (part of single mesh)
      debugLog.warn('transform', `Cannot reposition main BMC section: ${sectionName}`);
      return false;
    } else if (obj.objectType === 'separate_glb' && obj.rootMesh) {
      // Separate GLB objects can be repositioned via root mesh
      obj.rootMesh.position = new Vector3(x, y, z);
      debugLog.verbose('transform', `Separate GLB: ${sectionName} moved to (${x}, ${y}, ${z})`);
    }
    return true;
  }
  
  // Universal scaling manipulation
  setScale(sectionName: string, x: number, y: number, z: number): boolean {
    const obj = this.objects.get(sectionName);
    if (!obj) {
      debugLog.warn('transform', `Object not found: ${sectionName}`);
      return false;
    }
    
    if (obj.objectType === 'main_bmc' && obj.transformNode) {
      obj.transformNode.scaling = new Vector3(x, y, z);
      debugLog.verbose('transform', `Main BMC: ${sectionName} scaled to (${x}, ${y}, ${z})`);
    } else if (obj.objectType === 'separate_glb' && obj.rootMesh) {
      obj.rootMesh.scaling = new Vector3(x, y, z);
      debugLog.verbose('transform', `Separate GLB: ${sectionName} scaled to (${x}, ${y}, ${z})`);
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

// REMOVED: Legacy BMCSectionController - replaced by unified BMC system

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
  const orthoEventHandlersRef = useRef<any>(null);
  const animationManagerRef = useRef<BabylonAnimationManager | null>(null);
  const materialManagerRef = useRef<BabylonMaterialManager | null>(null);
  const bulletTextPlanesRef = useRef<Map<string, Mesh>>(new Map());
  const viewTransitionRef = useRef<ViewTransitionManager | null>(null);
  const [showBulletText, setShowBulletText] = useState(false);
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
  
  // REMOVED: Unified transformation system - simplified for reliability
  
  // REMOVED: Old content panels system - now using clean billboard panel system
  
  // Unified BMC label manager - inject BMC State Manager
  const cleanBMCRef = useRef<CleanBMCSystem>(cleanBMCSystem);
  
  // Inject BMC State Manager into CleanBMCSystem on first render
  useEffect(() => {
    console.log("🔗 Injecting BMC State Manager into CleanBMCSystem...");
    console.log("🔗 bmcState:", bmcState);
    console.log("🔗 cleanBMCRef.current:", cleanBMCRef.current);
    
    cleanBMCRef.current.setBMCStateManager(bmcState);
    console.log("🔗 Injection complete");
    
    // Force sync current selection state after injection
    const currentSelection = bmcState.getSelectedObject();
    if (currentSelection) {
      console.log(`🔄 Syncing initial selection state: ${currentSelection}`);
      setTimeout(() => {
        if (cleanBMCRef.current) {
          cleanBMCRef.current.updateAllVisuals();
          console.log(`✅ Initial visual state synced for: ${currentSelection}`);
        }
      }, 100);
    }
  }, [bmcState]);
  
  // Update CleanBMCSystem when view mode changes
  useEffect(() => {
    if (cleanBMCRef.current) {
      console.log(`📐 Updating CleanBMCSystem top view mode: ${isOrthographic}`);
      cleanBMCRef.current.setTopViewMode(isOrthographic);
    }
  }, [isOrthographic]);
  
  // REMOVED: Legacy transform utilities - now handled by unified BMC system

  // BMC Section Name Mapping: Convert between display names and BMC component names
  const mapSectionNameToBMCComponent = (sectionName: string): BMCComponentName | null => {
    const nameMapping: { [key: string]: BMCComponentName } = {
      'Key Partners': 'KeyPartners',
      'Key Activities': 'KeyActivities', 
      'Key Resources': 'KeyResources',
      'Value Propositions': 'ValueProposition',
      'Customer Relationships': 'CustomerRelationships',
      'CustomerChannels': 'CustomerChannels',  // GLB mesh name is "CustomerChannels"
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
      'CustomerChannels': 'CustomerChannels',  // GLB mesh name is "CustomerChannels"
      'CustomerSegments': 'Customer Segments',
      'CostStructure': 'Cost Structure',
      'RevenueStreams': 'Revenue Streams'
    };
    return nameMapping[componentName];
  };

  // Removed old handleBMCObjectClick - using direct cleanBMCRef.current.onSelect calls
  
  // Clean hover handlers
  const handleBMCObjectHoverEnter = (sectionName: string) => {
    cleanBMCRef.current.onHover(sectionName, true);
    debugLog.verbose('hover', `Hover enter: ${sectionName}`);
  };
  
  const handleBMCObjectHoverExit = (sectionName: string) => {
    cleanBMCRef.current.onHover(sectionName, false);
    debugLog.verbose('hover', `Hover exit: ${sectionName}`);
  };

  // REMOVED: Old applyBMCVisualState function - CleanBMCSystem handles all visual states

  // Handle background click to clear selection (will be updated inside useEffect)
  let handleBackgroundClick = () => {
    console.log('Background clicked - clearing selection');
    cleanBMCRef.current.clearSelection();
    // REMOVED: setSelectedObject(null) - CleanBMCSystem manages all state
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
      "CustomerChannels": "channels",
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

  // Create bullet text plane for BMC section content
  const createBulletTextPlane = (sectionName: string, mesh: AbstractMesh, scene: Scene) => {
    console.log(`🎯 createBulletTextPlane called for ${sectionName}`);
    console.log(`🎯 canvas available:`, !!canvas);
    console.log(`🎯 showBulletText:`, showBulletText);
    console.log(`🎯 mesh:`, mesh?.name || 'NO MESH');
    
    if (!canvas || !showBulletText) {
      console.log(`❌ Early return: canvas=${!!canvas}, showBulletText=${showBulletText}`);
      return null;
    }

    // Get content for the section
    let content: string[] = [];
    switch (sectionName) {
      case 'Value Propositions':
        content = canvas.valuePropositions?.content || [];
        console.log(`📋 Value Propositions content:`, content);
        break;
      // Add other sections later
      default:
        console.log(`❌ Unsupported section: ${sectionName}`);
        return null;
    }

    if (content.length === 0) {
      console.log(`❌ No content available for ${sectionName}`);
      return null;
    }

    // Format content as bullet points
    const bulletText = content.map(item => `• ${item}`).join('\n');
    console.log(`📝 Creating bullet text for ${sectionName}:`, bulletText);
    
    // Create dynamic texture for text
    const textureSize = 512;
    const dynamicTexture = new DynamicTexture(`bulletText_${sectionName}`, textureSize, scene, false);
    const context = dynamicTexture.getContext();
    
    // Clear with transparent background
    context.clearRect(0, 0, textureSize, textureSize);
    
    // Set text properties - small readable font
    context.fillStyle = '#2d3748'; // Dark grey text
    context.font = '20px Arial'; // Small font size
    (context as any).textAlign = 'left';
    (context as any).textBaseline = 'top';
    
    // Draw text with word wrapping
    const maxWidth = textureSize - 40; // Leave margin
    const lineHeight = 24;
    const lines = bulletText.split('\n');
    let y = 20;
    
    lines.forEach(line => {
      // Simple word wrapping
      const words = line.split(' ');
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine + word + ' ';
        const metrics = context.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine !== '') {
          context.fillText(currentLine.trim(), 20, y);
          y += lineHeight;
          currentLine = word + ' ';
        } else {
          currentLine = testLine;
        }
      });
      
      if (currentLine.trim() !== '') {
        context.fillText(currentLine.trim(), 20, y);
        y += lineHeight;
      }
    });
    
    dynamicTexture.update();
    
    // Create text plane
    const textPlane = MeshBuilder.CreatePlane(`bulletTextPlane_${sectionName}`, { 
      size: 2.0, 
      sideOrientation: 2 
    }, scene);
    
    // Position text plane on top of the mesh, slightly elevated
    textPlane.position = mesh.position.clone();
    textPlane.position.y = mesh.position.y + (mesh.scaling.y / 2) + 0.1; // Higher elevation
    textPlane.rotation.x = Math.PI / 2; // Lay flat on top
    console.log(`📍 Text plane positioned at:`, textPlane.position);
    console.log(`📍 Mesh position:`, mesh.position);
    console.log(`📍 Mesh scaling:`, mesh.scaling);
    
    // Create material - make it very visible
    const textMaterial = new StandardMaterial(`bulletTextMat_${sectionName}`, scene);
    textMaterial.diffuseTexture = dynamicTexture;
    textMaterial.emissiveTexture = dynamicTexture;
    textMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0); // Bright white for visibility
    textMaterial.useAlphaFromDiffuseTexture = true;
    textMaterial.disableLighting = true;
    textMaterial.backFaceCulling = false;
    textMaterial.alpha = 1.0; // Ensure full opacity
    
    textPlane.material = textMaterial;
    textPlane.isPickable = false;
    textPlane.parent = mesh;
    textPlane.setEnabled(true); // Ensure it's enabled
    textPlane.isVisible = true; // Ensure it's visible
    
    console.log(`✅ Bullet text plane created for ${sectionName}`);
    console.log(`📊 Text plane details:`, {
      name: textPlane.name,
      position: textPlane.position,
      isVisible: textPlane.isVisible,
      isEnabled: textPlane.isEnabled(),
      parent: textPlane.parent?.name,
      materialAlpha: textMaterial.alpha
    });
    return textPlane;
  };

  // Toggle bullet text display
  const toggleBulletText = () => {
    const newState = !showBulletText;
    console.log(`🔄 Toggling bullet text: ${showBulletText} → ${newState}`);
    setShowBulletText(newState);
    
    if (newState) {
      // Create bullet text for existing meshes
      const scene = sceneRef.current;
      if (scene) {
        // Find Value Propositions mesh using the CleanBMCSystem registry
        const valuePropMesh = cleanBMCRef.current.getMesh('Value Propositions');
        console.log('🔍 Looking for Value Propositions mesh:', valuePropMesh ? 'FOUND' : 'NOT FOUND');
        if (!valuePropMesh) {
          console.log('🔍 Available meshes:', scene.meshes.map(m => m.name));
        }
        if (valuePropMesh) {
          console.log(`🎯 Found mesh for Value Propositions:`, valuePropMesh.name);
          console.log(`📍 Mesh position:`, valuePropMesh.position);
          console.log(`📏 Mesh scaling:`, valuePropMesh.scaling);
          const textPlane = createBulletTextPlane('Value Propositions', valuePropMesh, scene);
          if (textPlane) {
            console.log(`💾 Storing text plane:`, textPlane.name);
            bulletTextPlanesRef.current.set('Value Propositions', textPlane);
          } else {
            console.log(`❌ Failed to create text plane for Value Propositions`);
          }
        }
      }
    } else {
      // Remove all bullet text planes
      bulletTextPlanesRef.current.forEach((plane, name) => {
        plane.dispose();
      });
      bulletTextPlanesRef.current.clear();
    }
  };

  // Expose toggle function for manual testing
  useEffect(() => {
    (window as any).toggleBulletText = toggleBulletText;
    return () => {
      delete (window as any).toggleBulletText;
    };
  }, [showBulletText]);

  // REMOVED: Old restoration function - CleanBMCSystem handles this automatically

  // REMOVED: Old restoration useEffect - CleanBMCSystem handles state automatically
  
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

    // Initialize Babylon.js engine and scene using SceneSetup module
    let sceneSetup: SceneSetup | null = null;
    let engine: Engine | null = null;
    let scene: Scene | null = null;

    try {
      sceneSetup = new SceneSetup(canvasElement);
      engine = sceneSetup.getEngine();
      scene = sceneSetup.getScene();
      
      if (!engine || !scene) {
        throw new Error('Scene setup failed to initialize engine or scene');
      }
      
      debugLog.info('scene', 'Babylon.js engine and scene initialized via SceneSetup module');
    } catch (error) {
      console.error('Failed to initialize Babylon.js via SceneSetup:', error);
      return;
    }
    
    engineRef.current = engine;
    sceneRef.current = scene;
    console.log("🎯 Scene initialized with SceneSetup module");

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
    cameraRef.current = perspectiveCamera;
    
    // Camera controls and limits
    perspectiveCamera.lowerRadiusLimit = 10;
    perspectiveCamera.upperRadiusLimit = 50;
    perspectiveCamera.lowerBetaLimit = 0.1;
    perspectiveCamera.upperBetaLimit = Math.PI / 2 - 0.1;
    perspectiveCamera.wheelPrecision = 50;
    perspectiveCamera.panningSensibility = 100;
    perspectiveCamera.angularSensibilityX = 500;
    perspectiveCamera.angularSensibilityY = 500;
    
    // Create orthographic camera for 3D Top view
    const orthoCamera = new FreeCamera(
      "orthographicCamera",
      new Vector3(0, 22, -10),  // Position looking down at the BMC from above and behind
      scene
    );
    orthoCamera.setTarget(new Vector3(0, 0, 0)); // Look at the center of the BMC
    orthoCamera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
    
    // Set orthographic bounds
    const aspectRatio = canvasElement.width / canvasElement.height;
    const orthoSize = 10;
    orthoCamera.orthoLeft = -orthoSize * aspectRatio;
    orthoCamera.orthoRight = orthoSize * aspectRatio;
    orthoCamera.orthoTop = orthoSize;
    orthoCamera.orthoBottom = -orthoSize;
    
    // Custom orthographic camera controls
    orthoCamera.inputs.clear();
    orthoCamera.inputs.addMouse();
    
    orthoCameraRef.current = orthoCamera;
    
    // Set initial camera based on view mode
    if (isOrthographic) {
      scene.activeCamera = orthoCamera;
      orthoCamera.attachControl(canvasElement, true);
    } else {
      scene.activeCamera = perspectiveCamera;
      perspectiveCamera.attachControl(canvasElement, true);
    }
    
    console.log(`🎥 Initial camera set to: ${isOrthographic ? 'Orthographic (3D Top)' : 'Perspective (3D View)'}`);

    // Camera save state functionality
    const saveCameraState = () => {
      if (perspectiveCamera && scene.activeCamera === perspectiveCamera) {
        saveCamera3DState({
          alpha: perspectiveCamera.alpha,
          beta: perspectiveCamera.beta,
          radius: perspectiveCamera.radius
        });
      }
    };

    // Save camera state on interaction
    perspectiveCamera.onViewMatrixChangedObservable.add(saveCameraState);

    // Animation manager and material manager (from BabylonJS managers)
    const animationManager = new BabylonAnimationManager(scene);
    const materialManager = new BabylonMaterialManager(scene);
    
    animationManagerRef.current = animationManager;
    materialManagerRef.current = materialManager;

    // Initialize ViewTransitionManager
    const viewTransitionManager = new ViewTransitionManager(scene);
    viewTransitionRef.current = viewTransitionManager;
    
    // Inject ViewTransitionManager into CleanBMCSystem
    cleanBMCRef.current.setViewTransitionManager(viewTransitionManager);

    console.log("🎭 Animation and material managers initialized");

    // Load the main BMC GLB model using the BMCModelLoader module
    console.log("📦 Loading main BMC model...");
    
    const loadMainBMCModel = async () => {
      try {
        const modelLoader = new BMCModelLoader(scene);
        const result = await SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_09_complete_1753576063858.glb", scene);
        const meshes = result.meshes;
        
        if (meshes.length > 0) {
          console.log("🎯 Main BMC GLB model loaded successfully");
          const rootMesh = meshes[0];
          rootMeshRef.current = rootMesh;
          
          // Apply the correct position and scaling to the main model
          rootMesh.position = new Vector3(0, 0.1, 0); // Slightly elevated from ground
          rootMesh.scaling = new Vector3(2.5, 2.5, 2.5); // Proper size for the BMC canvas
          
          console.log(`📍 Main model positioned at: ${rootMesh.position}`);
          console.log(`📏 Main model scaled to: ${rootMesh.scaling}`);

          // Register all BMC sections with the unified BMC system
          meshes.forEach(mesh => {
            if (mesh.name && mesh.material) {
              debugLog.verbose('mesh', `Processing mesh: ${mesh.name}`);
              
              // Register main BMC sections (those with BMC_ prefix)
              if (mesh.name.includes('BMC_')) {
                const sectionName = mesh.name.replace('BMC_', '').replace(/_/g, ' ');
                console.log(`🏷️ Registering main BMC section: ${sectionName}`);
                
                // Create standard material
                const material = mesh.material as StandardMaterial || new StandardMaterial(sectionName + "_material", scene);
                mesh.material = material;
                
                // Register with CleanBMCSystem 
                const currentHeight = mesh.scaling.y;
                cleanBMCRef.current.registerItem(sectionName, mesh, material, currentHeight);
                
                console.log(`📏 Registered ${sectionName} with height=${currentHeight}`);
              }
              
              // Register labels (those with Label_ prefix)
              else if (mesh.name.includes('Label_')) {
                const labelName = mesh.name.replace('Label_', '').replace(/_/g, ' ');
                console.log(`🏷️ Found label: ${labelName}`);
                
                // Find the corresponding main mesh for this label
                const mainMeshName = `BMC_${labelName.replace(/ /g, '_')}`;
                const mainMesh = meshes.find(m => m.name === mainMeshName);
                
                if (mainMesh) {
                  console.log(`🔗 Linking label ${labelName} to main mesh ${mainMesh.name}`);
                  const labelMaterial = mesh.material as StandardMaterial;
                  cleanBMCRef.current.addLabel(labelName, mesh, labelMaterial);
                } else {
                  console.log(`⚠️ Could not find main mesh for label: ${labelName}`);
                }
              }
            }
          });

          // Create interaction handlers for all registered BMC sections
          console.log("🎮 Setting up BMC interaction handlers...");
          
          // Get all registered items from CleanBMCSystem
          const registeredItems = cleanBMCRef.current.getAllItems();
          console.log("📋 Registered BMC items:", registeredItems);
          
          registeredItems.forEach(itemName => {
            const mesh = cleanBMCRef.current.getMesh(itemName);
            if (mesh) {
              console.log(`🎮 Setting up interactions for: ${itemName}`);
              
              // Create action manager if not exists
              if (!mesh.actionManager) {
                mesh.actionManager = new ActionManager(scene);
              }
              
              // Double-click handler for content panels
              setupDoubleClick(
                itemName,
                mesh.actionManager as ActionManager,
                () => {
                  // Single click
                  console.log(`👆 Single click on ${itemName}`);
                  cleanBMCRef.current.onSelect(itemName);
                },
                () => {
                  // Double-click 
                  console.log(`👆👆 Double-click on ${itemName}`);
                  showContentPanel(itemName, mesh);
                }
              );

              // Hover handlers
              mesh.actionManager.registerAction(
                new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
                  handleBMCObjectHoverEnter(itemName);
                })
              );
              
              mesh.actionManager.registerAction(
                new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
                  handleBMCObjectHoverExit(itemName);
                })
              );
            }
          });
          
          console.log("✅ BMC interaction handlers set up successfully");

        }
      } catch (error) {
        console.error('❌ Failed to load main BMC model:', error);
      }
    };

    // Load additional BMC models (Revenue Streams and Cost Structure)
    const loadAdditionalBMCModels = async () => {
      try {
        const modelLoader = new BMCModelLoader(scene);
        
        // Load Revenue Streams (positioned at bottom right)
        console.log("💰 Loading Revenue Streams model...");
        const revenueResult = await modelLoader.loadRevenueStreams();
        if (revenueResult && revenueResult.meshes.length > 0) {
          const revenueMesh = revenueResult.meshes[0];
          
          // Apply precise positioning from architecture documentation
          revenueMesh.position = new Vector3(-0.221, 0.1, -10.5); // Aligned with Customer Channels
          revenueMesh.scaling = new Vector3(7.7, 8, 8); // Direct mesh scaling
          
          console.log(`💰 Revenue Streams positioned at: ${revenueMesh.position}`);
          console.log(`📏 Revenue Streams scaled to: ${revenueMesh.scaling}`);
          
          // Create material and register
          const revenueMaterial = revenueMesh.material as StandardMaterial || new StandardMaterial('Revenue_Streams_material', scene);
          revenueMesh.material = revenueMaterial;
          
          const currentHeight = revenueMesh.scaling.y;
          cleanBMCRef.current.registerItem('Revenue Streams', revenueMesh, revenueMaterial, currentHeight);
          
          // Setup interactions
          if (!revenueMesh.actionManager) {
            revenueMesh.actionManager = new ActionManager(scene);
          }
          
          setupDoubleClick(
            'Revenue Streams',
            revenueMesh.actionManager as ActionManager,
            () => {
              console.log(`👆 Single click on Revenue Streams`);
              cleanBMCRef.current.onSelect('Revenue Streams');
            },
            () => {
              console.log(`👆👆 Double-click on Revenue Streams`);
              showContentPanel('Revenue Streams', revenueMesh);
            }
          );
          
          console.log("💰 Revenue Streams model loaded and configured");
        }
        
        // Load Cost Structure (positioned at bottom left) 
        console.log("💸 Loading Cost Structure model...");
        const costResult = await modelLoader.loadCostStructure();
        if (costResult && costResult.meshes.length > 0) {
          const costMesh = costResult.meshes[0];
          
          // Apply precise positioning from architecture documentation
          costMesh.position = new Vector3(-10.1, 0.1, -10.5); // Positioned farther left
          costMesh.scaling = new Vector3(8.0, 8, 8); // Direct mesh scaling
          
          console.log(`💸 Cost Structure positioned at: ${costMesh.position}`);
          console.log(`📏 Cost Structure scaled to: ${costMesh.scaling}`);
          
          // Create material and register
          const costMaterial = costMesh.material as StandardMaterial || new StandardMaterial('Cost_Structure_material', scene);
          costMesh.material = costMaterial;
          
          const currentHeight = costMesh.scaling.y;
          cleanBMCRef.current.registerItem('Cost Structure', costMesh, costMaterial, currentHeight);
          
          // Setup interactions
          if (!costMesh.actionManager) {
            costMesh.actionManager = new ActionManager(scene);
          }
          
          setupDoubleClick(
            'Cost Structure',
            costMesh.actionManager as ActionManager,
            () => {
              console.log(`👆 Single click on Cost Structure`);
              cleanBMCRef.current.onSelect('Cost Structure');
            },
            () => {
              console.log(`👆👆 Double-click on Cost Structure`);
              showContentPanel('Cost Structure', costMesh);
            }
          );
          
          console.log("💸 Cost Structure model loaded and configured");
        }
        
        console.log("✅ All additional BMC models loaded successfully");
        
        // Update visual states after all models are loaded
        setTimeout(() => {
          cleanBMCRef.current.updateAllVisuals();
          console.log("🎨 Updated all visual states after model loading");
        }, 100);
        
      } catch (error) {
        console.error('❌ Failed to load additional BMC models:', error);
      }
    };

    // Content panel management
    let currentContentPanel: Rectangle | null = null;
    let advancedTexture: AdvancedDynamicTexture | null = null;

    // Initialize GUI
    const initializeGUI = () => {
      advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
      console.log("🖼️ GUI initialized");
    };

    // Show content panel for a BMC section
    const showContentPanel = (sectionName: string, mesh: AbstractMesh) => {
      if (!advancedTexture) return;
      
      console.log(`📋 Showing content panel for: ${sectionName}`);
      
      // Close existing panel if any
      if (currentContentPanel) {
        currentContentPanel.dispose();
        currentContentPanel = null;
      }
      
      // Create new content panel
      const panel = new Rectangle(`contentPanel_${sectionName}`);
      panel.widthInPixels = 350;
      panel.heightInPixels = 300;
      panel.cornerRadius = 12;
      panel.color = "#2D3748";
      panel.thickness = 2;
      panel.background = "#FFFFFF";
      panel.zIndex = 1000;
      advancedTexture.addControl(panel);
      
      // Panel title
      const title = new TextBlock(`panelTitle_${sectionName}`, sectionName);
      title.color = "#2D3748";
      title.fontSize = 22;
      title.fontWeight = "bold";
      title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      title.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      title.paddingTopInPixels = 15;
      panel.addControl(title);
      
      // Panel content
      const content = getSectionContent(sectionName);
      const contentText = new TextBlock(`panelContent_${sectionName}`, content);
      contentText.color = "#4A5568";
      contentText.fontSize = 14;
      contentText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      contentText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      contentText.paddingTopInPixels = 50;
      contentText.paddingLeftInPixels = 20;
      contentText.paddingRightInPixels = 20;
      contentText.textWrapping = true;
      panel.addControl(contentText);
      
      // Close button
      const closeButton = new TextBlock(`closeButton_${sectionName}`, "✕");
      closeButton.color = "#718096";
      closeButton.fontSize = 18;
      closeButton.fontWeight = "bold";
      closeButton.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      closeButton.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      closeButton.paddingTopInPixels = 8;
      closeButton.paddingRightInPixels = 8;
      panel.addControl(closeButton);
      
      // Close button interaction
      closeButton.onPointerUpObservable.add(() => {
        panel.dispose();
        currentContentPanel = null;
      });
      
      // Position panel near the mesh
      panel.linkWithMesh(mesh);
      panel.linkOffsetX = 200;
      panel.linkOffsetY = -150;
      
      currentContentPanel = panel;
      
      console.log(`✅ Content panel created for: ${sectionName}`);
    };

    // Background click handler to clear selection
    const setupBackgroundClick = () => {
      const ground = scene.getMeshByName("ground");
      if (ground) {
        if (!ground.actionManager) {
          ground.actionManager = new ActionManager(scene);
        }
        
        ground.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            handleBackgroundClick();
            
            // Close content panel if open
            if (currentContentPanel) {
              currentContentPanel.dispose();
              currentContentPanel = null;
            }
          })
        );
        
        console.log("🎭 Background click handler set up");
      }
    };

    // Load all models and setup interactions
    const initializeAll = async () => {
      try {
        console.log("🚀 Starting BMC 3D initialization...");
        
        // Initialize GUI first
        initializeGUI();
        
        // Load main BMC model
        await loadMainBMCModel();
        
        // Load additional models
        await loadAdditionalBMCModels();
        
        // Setup background interactions
        setupBackgroundClick();
        
        console.log("✅ BMC 3D initialization complete");
        
        // Force update visual states based on current bmcState
        const currentSelection = bmcState.getSelectedObject();
        if (currentSelection) {
          const sectionName = mapBMCComponentToSectionName(currentSelection);
          if (sectionName) {
            console.log(`🔄 Applying initial selection: ${sectionName}`);
            cleanBMCRef.current.onSelect(sectionName);
          }
        }
        
        // Set correct view mode
        cleanBMCRef.current.setTopViewMode(isOrthographic);
        
        console.log("🎨 Initial visual state setup complete");
        
      } catch (error) {
        console.error('❌ Failed to initialize BMC 3D:', error);
      }
    };

    // Start the initialization process
    initializeAll();

    // Start the render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle window resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up Canvas3DBabylon...");
      
      window.removeEventListener("resize", handleResize);
      
      if (animationManagerRef.current) {
        animationManagerRef.current.dispose();
      }
      
      if (materialManagerRef.current) {
        materialManagerRef.current.dispose();
      }
      
      if (viewTransitionRef.current) {
        viewTransitionRef.current.dispose();
      }
      
      if (currentContentPanel) {
        currentContentPanel.dispose();
      }
      
      // Dispose bullet text planes
      bulletTextPlanesRef.current.forEach((plane) => {
        plane.dispose();
      });
      bulletTextPlanesRef.current.clear();
      
      if (sceneSetup) {
        sceneSetup.dispose();
      } else if (scene) {
        scene.dispose();
      }
      
      if (engine) {
        engine.dispose();
      }
      
      console.log("✅ Canvas3DBabylon cleanup complete");
    };

  }, [canvas]); // Only depend on canvas data

  // Handle camera switching between perspective and orthographic
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !orthoCameraRef.current) return;
    
    const scene = sceneRef.current;
    const perspectiveCamera = cameraRef.current;
    const orthoCamera = orthoCameraRef.current;
    
    console.log(`🎥 Switching camera to: ${isOrthographic ? 'Orthographic (3D Top)' : 'Perspective (3D View)'}`);
    
    if (isOrthographic) {
      // Switch to orthographic camera
      perspectiveCamera.detachControl();
      scene.activeCamera = orthoCamera;
      orthoCamera.attachControl(canvasRef.current, true);
      
      // Configure orthographic camera inputs for top view
      const configureOrthoControls = () => {
        // Clear existing inputs and add mouse only
        orthoCamera.inputs.clear();
        orthoCamera.inputs.addMouse();
        
        // Configure inputs for top view
        const inputs = (orthoCamera as any).inputs;
        const pointerInput = inputs?.attached?.pointers;
        if (pointerInput) {
          pointerInput.angularSensibilityX = 0; // No horizontal rotation
          pointerInput.angularSensibilityY = 0; // No vertical rotation
          pointerInput.panningSensibility = 200; // Increase panning sensitivity
        }
        
        // Configure mouse wheel for zoom only  
        const mouseWheelInput = inputs?.attached?.mousewheel;
        if (mouseWheelInput) {
          mouseWheelInput.wheelPrecision = 80; // Balanced zoom sensitivity
        }
        
        // Set panning configuration
        (orthoCamera as any).panningAxis = new Vector3(1, 0, 1); // Allow X and Z panning only
        (orthoCamera as any).panningSensibility = 200; // Panning sensitivity
        (orthoCamera as any).panningInertia = 0.9; // Smooth panning
        
        // Enable panning with left mouse (hold Ctrl) or middle mouse
        (orthoCamera as any).panningMouseButton = 1; // Middle mouse for panning
        
        console.log("🎮 Orthographic controls configured: zoom (wheel) + pan (middle/ctrl+left) only, no rotation");
      };
      
      configureOrthoControls();
      
    } else {
      // Switch to perspective camera
      orthoCamera.detachControl();
      scene.activeCamera = perspectiveCamera;
      perspectiveCamera.attachControl(canvasRef.current, true);
    }
    
    // Update CleanBMCSystem view mode
    if (cleanBMCRef.current) {
      cleanBMCRef.current.setTopViewMode(isOrthographic);
      
      // Delay visual update to ensure camera transition is complete
      setTimeout(() => {
        cleanBMCRef.current.updateAllVisuals();
      }, 100);
    }
    
  }, [isOrthographic]);

  // Sync BMC state changes to visual system
  useEffect(() => {
    if (!cleanBMCRef.current) return;
    
    const currentSelection = bmcState.getSelectedObject();
    
    if (currentSelection) {
      const sectionName = mapBMCComponentToSectionName(currentSelection);
      if (sectionName) {
        const currentCleanSelection = cleanBMCRef.current.getSelectedObject();
        if (currentCleanSelection !== sectionName) {
          console.log(`🔄 Syncing selection from BMC state: ${currentSelection} → ${sectionName}`);
          cleanBMCRef.current.onSelect(sectionName);
        }
      }
    } else {
      // Clear selection if no object is selected in BMC state
      if (cleanBMCRef.current.getSelectedObject()) {
        console.log(`🔄 Clearing selection from BMC state`);
        cleanBMCRef.current.clearSelection();
      }
    }
    
  }, [bmcState.getSelectedObject?.()]);

  // Handle transition animations
  useEffect(() => {
    if (!viewTransitionRef.current) return;
    
    if (isTransitioning && !is3D) {
      // Transitioning from 3D to 2D - could add exit animation here
      console.log("🎬 Transitioning from 3D to 2D view");
      // viewTransitionRef.current.transitionTo2D();
    }
  }, [isTransitioning, is3D]);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ outline: 'none' }}
      />
      
      {/* Development controls - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
          <button 
            onClick={toggleBulletText}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded mr-2"
          >
            {showBulletText ? 'Hide' : 'Show'} Bullet Text
          </button>
          <div className="mt-1">
            Camera: {isOrthographic ? 'Orthographic' : 'Perspective'}
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas3DBabylon;