import React, { useRef, useEffect, useState } from 'react';
import { 
  Engine, 
  Scene, 
  Camera,
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
  PointerEventTypes,
  Animation,
  CubicEase
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
import { CleanBMCSystem } from '@/lib/cleanBMCSystem';
import { BabylonAnimationManager } from '@/lib/babylon/BabylonAnimationManager';
import { debugLog } from '@/lib/debug/DebugLogger';
import { BMCModelLoader } from './Canvas3DBabylon/models/BMCModelLoader';

import { UnifiedInteractionManager } from '@/lib/core/UnifiedInteractionManager';
import { MODEL_POSITIONS, CAMERA_SETTINGS, MATERIAL_COLORS, TRANSFORM_SETTINGS, SCENE_DIMENSIONS, CAMERA_PRESETS } from './Canvas3DBabylon/constants/BMCConstants';
import { mapSectionNameToBMCComponent, mapBMCComponentToSectionName, enhanceLabelTexture } from './Canvas3DBabylon/utils/BMCUtilities';

// UNIFIED SYSTEM: Replace competing managers with unified architecture
import { SceneSetupAdapter } from './Canvas3DBabylon/adapters/SceneSetupAdapter';

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
    // Object registered
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
      // Height updated
    } else if (obj.objectType === 'separate_glb') {
      // Separate GLB objects use mesh scaling directly
      obj.mesh.scaling.y = height;
      // Height updated
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
    // Debug info removed for performance
  }
}


// Standard grid positions moved to constants file

export const Canvas3DBabylon: React.FC<Canvas3DBabylonProps> = ({ canvas, isTransitioning }) => {
  // Component rendering...
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  // Removed orthographic camera - only perspective camera needed
  const rootMeshRef = useRef<AbstractMesh | null>(null);
  const animationManagerRef = useRef<BabylonAnimationManager | null>(null);
  
  const interactionManagerRef = useRef<UnifiedInteractionManager | null>(null);
  const bulletTextPlanesRef = useRef<Map<string, Mesh>>(new Map());
  const [showBulletText, setShowBulletText] = useState(false);
  
  // Camera preset state  
  const [currentCameraPreset, setCurrentCameraPreset] = useState<'PERSPECTIVE_LEFT' | 'PERSPECTIVE_RIGHT' | 'TOP'>('TOP');
  
  // Camera transition state
  const [isTransitioningCamera, setIsTransitioningCamera] = useState(false);
  
  // High-quality camera preset switching with smooth transitions
  const switchCameraPreset = (preset: 'PERSPECTIVE_LEFT' | 'PERSPECTIVE_RIGHT' | 'TOP') => {
    if (isTransitioningCamera) return; // Prevent overlapping transitions
    
    setCurrentCameraPreset(preset);
    setIsTransitioningCamera(true);
    
    if (!cameraRef.current || !sceneRef.current) {
      setIsTransitioningCamera(false);
      return;
    }
    
    const scene = sceneRef.current;
    const perspectiveCamera = cameraRef.current;
    // Only perspective camera used
    const presetConfig = CAMERA_PRESETS[preset];
    
    // Animation duration and easing
    const duration = 800; // 800ms for smooth, professional feel
    const frameRate = 60;
    const totalFrames = Math.round((duration / 1000) * frameRate);
    
    // Easing function for smooth transitions
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    
    // All presets now use perspective camera for smooth transitions
    const currentCamera = scene.activeCamera;
    let startAlpha, startBeta, startRadius;
    
    // Only perspective camera used now - use current values
    startAlpha = perspectiveCamera.alpha;
    startBeta = perspectiveCamera.beta;
    startRadius = perspectiveCamera.radius;
    
    // Create smooth transition animations with cubic easing
    const alphaAnimation = Animation.CreateAndStartAnimation(
      "alphaTransition",
      perspectiveCamera,
      "alpha",
      frameRate,
      totalFrames,
      startAlpha,
      presetConfig.alpha,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      new CubicEase()
    );
    
    const betaAnimation = Animation.CreateAndStartAnimation(
      "betaTransition",
      perspectiveCamera, 
      "beta",
      frameRate,
      totalFrames,
      startBeta,
      presetConfig.beta,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      new CubicEase()
    );
    
    const radiusAnimation = Animation.CreateAndStartAnimation(
      "radiusTransition",
      perspectiveCamera,
      "radius",
      frameRate, 
      totalFrames,
      startRadius,
      presetConfig.radius,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      new CubicEase()
    );
    
    // Complete transition
    setTimeout(() => {
      setIsTransitioningCamera(false);
    }, duration);
  };
  
  
  const unifiedSceneRef = useRef<SceneSetupAdapter | null>(null);
  const { 
    saveCamera3DState, 
    getCamera3DState, 
    is3D, 
    isOrthographic, 
    // REPLACED: Using BMC State Manager for proper selection preservation
    // setSelectedObject, 
    // getSelectedObject, 
    setOriginalHeights, 
    getOriginalHeights,
    // New BMC State Manager methods
    selectBMCObject,
    getBMCSelectedObject,
    bmcState
  } = useCanvas();
  
  debugLog.verbose('camera', `Canvas3DBabylon: isOrthographic from useCanvas = ${isOrthographic}`);
  
  
  // REMOVED: Old content panels system - now using clean billboard panel system
  
  // Unified BMC label manager - inject BMC State Manager
  const cleanBMCRef = useRef<CleanBMCSystem>(new CleanBMCSystem());
  
  // Inject BMC State Manager into CleanBMCSystem on first render
  useEffect(() => {
    debugLog.verbose('init', 'Injecting BMC State Manager into CleanBMCSystem...');
    debugLog.verbose('init', 'bmcState initialized');
    debugLog.verbose('init', 'cleanBMCRef.current initialized');
    
    cleanBMCRef.current.setBMCStateManager(bmcState);
    
    // REMOVED: MaterialManager integration - using direct property modification instead
    
    debugLog.verbose('init', 'Injection complete');
    
    // RESTORED: Sync with BMC State Manager for selection preservation
    const currentSelection = bmcState.getSelectedObject();
    if (currentSelection) {
      setTimeout(() => {
        if (cleanBMCRef.current) {
          cleanBMCRef.current.onSelect(currentSelection);
          // Initial visual state synced
        }
      }, 100);
    }
  }, [bmcState]);
  
  // Update CleanBMCSystem when view mode changes
  useEffect(() => {
    if (cleanBMCRef.current) {
      // Updating CleanBMCSystem top view mode
      // REMOVED: setTopViewMode - using only 3D View mode now
    }
  }, [isOrthographic]);
  
  // REMOVED: Legacy transform utilities - now handled by unified BMC system

  // BMC Section Name Mapping: Moved to separate utilities file

  // Removed old handleBMCObjectClick - using direct cleanBMCRef.current.onSelect calls
  
  // Clean hover handlers
  const handleBMCObjectHoverEnter = (sectionName: string) => {
    cleanBMCRef.current.onHover(sectionName, true);
    // Hover enter event
  };
  
  const handleBMCObjectHoverExit = (sectionName: string) => {
    cleanBMCRef.current.onHover(sectionName, false);
    // Hover exit event
  };

  // REMOVED: Old applyBMCVisualState function - CleanBMCSystem handles all visual states

  // Handle background click to clear selection (will be updated inside useEffect)
  let handleBackgroundClick = () => {
    debugLog.verbose('interaction', 'Background clicked - clearing selection');
    cleanBMCRef.current.clearSelection();
    // FIXED: Clear BMC selection for proper preservation
    bmcState.selectObject(null);
  };
  
  

  

  // REMOVED: Old restore logic - now handled by applyBMCVisualState

  // Helper function to improve label texture quality - moved to utilities file

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
    
    // Format content as bullet points with smaller text
    return section.content.map(item => `• ${item}`).join('\n');
  };

  // Create content label plane showing bullet point content on top of BMC objects
  const createContentLabel = (sectionName: string, mesh: AbstractMesh, scene: Scene): Mesh | null => {
    // Creating content label
    
    if (!canvas) {
      // No canvas data available
      return null;
    }

    // Get content for the section
    const contentText = getSectionContent(sectionName);
    if (!contentText || contentText.includes('No content available') || contentText.includes('No bullet points')) {
      // No content available
      return null;
    }

    debugLog.verbose('content', `Content for ${sectionName}: ${contentText.substring(0, 50)}...`);

    // Get mesh bounds for positioning
    const boundingInfo = mesh.getBoundingInfo();
    const center = boundingInfo.boundingBox.center;
    const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);

    // Create dynamic texture for content text
    const textureSize = 1024; // Higher resolution for small text
    const dynamicTexture = new DynamicTexture(`contentLabel_${sectionName}`, textureSize, scene, false);
    const context = dynamicTexture.getContext();

    // Clear background - keep transparent
    context.clearRect(0, 0, textureSize, textureSize);

    // Set text properties - white text for visibility
    context.fillStyle = '#ffffff'; // White text
    context.font = 'bold 28px Arial'; // Small but readable font
    (context as any).textAlign = 'left';
    (context as any).textBaseline = 'top';

    // Draw text with word wrapping
    const padding = 20;
    const maxWidth = textureSize - (padding * 2);
    const lineHeight = 32; // Line spacing
    const lines = contentText.split('\n');
    let y = padding;

    lines.forEach(line => {
      if (line.trim() === '') {
        y += lineHeight / 2; // Add space for empty lines
        return;
      }

      // Simple word wrapping for each bullet point
      const words = line.split(' ');
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine + word + ' ';
        const metrics = context.measureText(testLine);

        if (metrics.width > maxWidth && currentLine !== '') {
          context.fillText(currentLine.trim(), padding, y);
          y += lineHeight;
          currentLine = word + ' ';
        } else {
          currentLine = testLine;
        }
      });

      if (currentLine.trim() !== '') {
        context.fillText(currentLine.trim(), padding, y);
        y += lineHeight;
      }
    });

    dynamicTexture.update();

    // Create label plane - smaller than title labels
    const labelWidth = size.x * 0.8; // Smaller than the mesh
    const labelHeight = size.z * 0.6; // Smaller height
    
    const labelPlane = MeshBuilder.CreatePlane(`contentLabel_${sectionName}`, {
      width: labelWidth,
      height: labelHeight
    }, scene);

    // Position on top of mesh, offset from title label
    labelPlane.position.x = center.x;
    labelPlane.position.y = center.y + size.y * 0.51; // Slightly above the mesh top
    labelPlane.position.z = center.z;

    // Rotate to be flat on top
    labelPlane.rotation.x = Math.PI / 2;

    // Create material with content texture - fully transparent background
    const labelMaterial = new StandardMaterial(`contentLabelMat_${sectionName}`, scene);
    labelMaterial.diffuseTexture = dynamicTexture;
    labelMaterial.useAlphaFromDiffuseTexture = true;
    labelMaterial.disableLighting = true; // Disable lighting to ensure white text shows properly
    labelMaterial.backFaceCulling = false;
    labelMaterial.alpha = 1.0; // Full opacity for the material itself (transparency comes from texture)

    labelPlane.material = labelMaterial;
    labelPlane.isPickable = false;
    labelPlane.parent = mesh;

    return labelPlane;
  };

  // Create bullet text plane for BMC section content
  const createBulletTextPlane = (sectionName: string, mesh: AbstractMesh, scene: Scene) => {
    
    if (!canvas || !showBulletText) {
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
        return null;
    }

    if (content.length === 0) {
      // No content available
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
    textMaterial.emissiveColor = MATERIAL_COLORS.BRIGHT_WHITE; // Bright white for visibility
    textMaterial.useAlphaFromDiffuseTexture = true;
    textMaterial.disableLighting = true;
    textMaterial.backFaceCulling = false;
    textMaterial.alpha = 1.0; // Ensure full opacity
    
    textPlane.material = textMaterial;
    textPlane.isPickable = false;
    textPlane.parent = mesh;
    textPlane.setEnabled(true); // Ensure it's enabled
    textPlane.isVisible = true; // Ensure it's visible
    
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
    setShowBulletText(newState);
    
    if (newState) {
      // Create bullet text for existing meshes
      const scene = sceneRef.current;
      if (scene) {
        // Find Value Propositions mesh directly from scene
        const valuePropMesh = scene.meshes.find(m => (m as any).bmcSectionName === 'Value Propositions');
        // Looking for Value Propositions mesh
        if (!valuePropMesh) {
        }
        if (valuePropMesh) {
          const textPlane = createBulletTextPlane('Value Propositions', valuePropMesh, scene);
          if (textPlane) {
            bulletTextPlanesRef.current.set('Value Propositions', textPlane);
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
    debugLog.info('webgl', 'WebGL context available');
    
    // DIAGNOSTIC: Detect WebGL context loss (canvas disappearing)
    canvasElement.addEventListener('webglcontextlost', (e) => {
      console.error('🚨🚨🚨 WebGL CONTEXT LOST! Canvas disappeared!');
      console.error('This happens after too many material operations');
      e.preventDefault();
    });
    canvasElement.addEventListener('webglcontextrestored', () => {
      debugLog.info('webgl', 'WebGL context restored - canvas should reappear');
    });

    // Initialize Babylon.js using unified system
    let engine: Engine | null = null;
    let scene: Scene | null = null;

    try {
      // Use unified scene adapter (pre-created materials, no recreation)
      const unifiedScene = new SceneSetupAdapter(canvasElement);
      unifiedSceneRef.current = unifiedScene;
      
      engine = unifiedScene.getEngine();
      scene = unifiedScene.getScene();
      
      if (!engine || !scene) {
        throw new Error('Scene setup failed to initialize engine or scene');
      }
      
      debugLog.info('scene', 'Babylon.js engine and scene initialized via SceneSetupAdapter');
    } catch (error) {
      console.error('Failed to initialize Babylon.js via SceneSetupAdapter:', error);
      return;
    }
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Clear any saved camera state to ensure fresh TOP preset
    if (currentCameraPreset === 'TOP') {
      // Clear saved state so restoration doesn't override our TOP preset
      const currentState = getCamera3DState();
      if (currentState) {
        // Clear the saved state completely
        saveCamera3DState(0, 0, 0); // Clear with zeros, will be set to correct TOP values below
      }
      
      // Also clear BMC State Manager camera state
      const bmcCameraState = bmcState.getCameraState();
      if (bmcCameraState) {
        bmcState.saveCameraState({ alpha: 0, beta: 0, radius: 0, target: new Vector3(0, 0, 0) }); // Clear it
      }
    }
    
    // Camera positioned using current preset
    const currentPreset = CAMERA_PRESETS[currentCameraPreset];
    const perspectiveCamera = new ArcRotateCamera(
      "PerspectiveCamera",
      currentPreset.alpha,     // Alpha from preset
      currentPreset.beta,      // Beta from preset  
      currentPreset.radius,    // Radius from preset
      new Vector3(0, 0, 0),    // Look at scene center
      scene
    );
    // Camera positioned to show: Cost Structure (red) front-left, Revenue Streams (green) front-right
    perspectiveCamera.attachControl(canvasElement, true);
    perspectiveCamera.wheelPrecision = 50;
    
    // Save the correct TOP preset values
    if (currentCameraPreset === 'TOP') {
      saveCamera3DState(currentPreset.alpha, currentPreset.beta, currentPreset.radius);
    }
    
    // Store camera reference - only perspective camera needed
    cameraRef.current = perspectiveCamera;
    
    // Always use perspective camera - no orthographic mode
    scene.activeCamera = perspectiveCamera;
    
    // Initialize label manager with scene
    // Simple BMC manager doesn't need scene setup
    
    // Lighting is now handled by SceneSetupAdapter

    // MASTER TRANSFORM: Create root transform node to rotate entire scene 180 degrees + tilt toward viewer - 20 degree X rotation
    const masterTransform = new TransformNode("MasterTransform", scene);
    masterTransform.rotation.y = Math.PI; // 180 degrees clockwise rotation
    masterTransform.rotation.x = Math.PI/12 + (5 * Math.PI/180) + (-10 * Math.PI/180) + (-10 * Math.PI/180); // 15 degrees + 5 degrees - 10 degrees - 10 degrees tilt around X axis
    masterTransform.position.y = 2; // Lift scene up to center in window
    
    // DYNAMIC SCALING: Scale BMC to fill window like reference image
    const canvasForScaling = canvasRef.current;
    if (canvasForScaling) {
      const canvasWidth = canvasForScaling.clientWidth;
      const canvasHeight = canvasForScaling.clientHeight;
      // Scale based on smaller dimension to ensure fit, with padding
      const baseSize = Math.min(canvasWidth, canvasHeight);
      const scaleFactor = (baseSize / 600) * 1.2; // Base reference of 600px, scale up 20%
      masterTransform.scaling = new Vector3(scaleFactor, scaleFactor, scaleFactor);
    }
    

    // Create ground with powder blue background and white gridlines
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    ground.parent = masterTransform; // Parent ground to master transform
    
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
    groundMaterial.specularColor = MATERIAL_COLORS.GROUND_SPECULAR; // Subtle blue-tinted specular reflection
    groundMaterial.specularPower = 64; // Higher value for sharper reflections
    groundMaterial.alpha = 0.5; // 50% opacity
    ground.material = groundMaterial;

    // Background click handling is done by SimpleClickHandler callbacks
    ground.isPickable = false; // Prevent individual ground mesh clicks

    // Create extruded border rails on all sides
    const railHeight = 0.15; // Reduced from 0.3 to 0.15
    const railWidth = 0.2;
    const railColor = MATERIAL_COLORS.RAIL_COLOR; // Darker grey rail color
    
    // Create rail material
    const railMaterial = new StandardMaterial("railMaterial", scene);
    railMaterial.diffuseColor = railColor;
    railMaterial.specularColor = MATERIAL_COLORS.RAIL_SPECULAR;
    
    // North rail (back) - extends full width including rail thickness for flush corners
    const northRail = MeshBuilder.CreateBox("northRail", {
      width: 20 + railWidth*2, // Ground width + rail thickness on both sides for flush corners
      height: railHeight,
      depth: railWidth
    }, scene);
    northRail.position = new Vector3(0, railHeight/2, -7 - railWidth/2); // 14/2 = 7
    northRail.material = railMaterial;
    northRail.parent = masterTransform; // Parent to master transform
    
    // South rail (front) - extends full width including rail thickness for flush corners
    const southRail = MeshBuilder.CreateBox("southRail", {
      width: 20 + railWidth*2, // Ground width + rail thickness on both sides for flush corners
      height: railHeight,
      depth: railWidth
    }, scene);
    southRail.position = new Vector3(0, railHeight/2, 7 + railWidth/2); // 14/2 = 7
    southRail.material = railMaterial;
    southRail.parent = masterTransform; // Parent to master transform
    
    // East rail (right) - only spans ground depth (not including rail thickness to avoid overlap)
    const eastRail = MeshBuilder.CreateBox("eastRail", {
      width: railWidth,
      height: railHeight,
      depth: 14 // Only ground depth, no extension needed
    }, scene);
    eastRail.position = new Vector3(10 + railWidth/2, railHeight/2, 0); // 20/2 = 10
    eastRail.material = railMaterial;
    eastRail.parent = masterTransform; // Parent to master transform
    
    // West rail (left) - only spans ground depth (not including rail thickness to avoid overlap)
    const westRail = MeshBuilder.CreateBox("westRail", {
      width: railWidth,
      height: railHeight,
      depth: 14 // Only ground depth, no extension needed
    }, scene);
    westRail.position = new Vector3(-10 - railWidth/2, railHeight/2, 0); // 20/2 = 10
    westRail.material = railMaterial;
    westRail.parent = masterTransform; // Parent to master transform


    


    // Force light grey background to match documentation: RGB(233, 236, 239)
    // Remove createDefaultEnvironment as it can override clearColor with its own background
    scene.clearColor = new Color4(233/255, 236/255, 239/255, 1.0);
    
    // Set environment intensity for PBR materials
    scene.environmentIntensity = 0.5; // Moderate for PBR materials to work

    // Create GUI for 3D billboard labels and content panels
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    
    // Store reference to current billboard panel for cleanup
    let currentBillboardPanel: any = null;
    
    // Store references for background click handler
    const billboardPanelRef = { current: null as any };
    billboardPanelRef.current = currentBillboardPanel;
    
    // Using official Babylon.js OnDoublePickTrigger (approved method)
    
    // Update background click handler to have access to billboard panel
    handleBackgroundClick = () => {
      console.log('Background clicked - clearing selection and closing billboard panel');
      cleanBMCRef.current.clearSelection();
      
      // Close billboard panel if it exists
      if (currentBillboardPanel) {
        advancedTexture.removeControl(currentBillboardPanel);
        currentBillboardPanel = null;
        billboardPanelRef.current = null;
        console.log("❌ Billboard panel closed by background click");
      }
    };
    
    // SIMPLIFIED: Removed duplicate background click handler to prevent conflicts
    // Ground click handler above already handles background clicks
    
    // Function to create billboarded content panel
    const createBillboardPanel = (sectionName: string, worldPosition: Vector3) => {
      console.log(`🚀🚀 CREATING BILLBOARD PANEL FOR: ${sectionName} 🚀🚀`);
      
      // Remove existing panel if any (panel refresh functionality)
      if (currentBillboardPanel) {
        advancedTexture.removeControl(currentBillboardPanel);
        currentBillboardPanel = null;
        billboardPanelRef.current = null;
      }
      
      // Get section content from canvas data
      const getSectionData = (name: string) => {
        const mapping: { [key: string]: keyof BusinessModelCanvas } = {
          'Key Partners': 'keyPartners',
          'Key Activities': 'keyActivities',
          'Key Resources': 'keyResources',
          'Value Propositions': 'valuePropositions',
          'Customer Relationships': 'customerRelationships',
          'CustomerChannels': 'channels',
          'Customer Segments': 'customerSegments',
          'Cost Structure': 'costStructure',
          'Revenue Streams': 'revenueStreams'
        };
        
        const key = mapping[name];
        // Looking for section with key
        if (key && canvas[key]) {
          console.log(`✅ Found section data for ${name}:`, canvas[key]);
          return canvas[key];
        }
        console.log(`❌ No section data found for ${name}`);
        return null;
      };
      
      const sectionData = getSectionData(sectionName);
      if (!sectionData || typeof sectionData === 'string' || !('content' in sectionData) || !sectionData.content || sectionData.content.length === 0) {
        console.log(`❌ No content available for ${sectionName} - sectionData:`, sectionData);
        return;
      }
      
      console.log(`✅ Section data found for ${sectionName}, creating panel...`);
      
      // Calculate proper height based on content
      const bulletPoints = (sectionData as CanvasElement).content.map((item: string) => `• ${item}`).join('\n');
      const lineHeight = 18; // More realistic line height for 12px font
      const padding = 80; // Header (40px) + top/bottom padding (40px)
      const averageCharsPerLine = 65; // Approximate chars that fit in 600px width
      
      // Calculate total lines needed including text wrapping
      let totalLines = 0;
      (sectionData as CanvasElement).content.forEach((item: string) => {
        const bulletText = `• ${item}`;
        const linesForThisItem = Math.ceil(bulletText.length / averageCharsPerLine);
        totalLines += Math.max(1, linesForThisItem); // At least 1 line per item
      });
      
      const calculatedHeight = padding + (totalLines * lineHeight) + 60; // Add extra padding to prevent cropping
      const maxHeight = Math.min(800, Math.max(450, calculatedHeight)); // Minimum 450px height, up to 800px
      
      console.log(`📏 Panel height calculation: ${totalLines} lines × ${lineHeight}px + ${padding}px padding = ${calculatedHeight}px (max: ${maxHeight}px)`);
      
      // Create main panel container - larger size for better visibility
      const panel = new Rectangle();
      panel.widthInPixels = 600; // Increased from 400 to 600 for better visibility
      panel.heightInPixels = Math.max(400, maxHeight); // Minimum 400px height
      panel.cornerRadius = 12;
      panel.color = "#333333";
      panel.thickness = 2;
      panel.background = "white";
      
      // Position panel closer to the 3D object
      panel.leftInPixels = 20; // Closer offset from object
      panel.topInPixels = -panel.heightInPixels / 2;
      
      // Create header with section title
      const headerRect = new Rectangle();
      headerRect.widthInPixels = panel.widthInPixels - 4;
      headerRect.heightInPixels = 50; // Increased header height
      headerRect.topInPixels = -panel.heightInPixels / 2 + 27; // Adjusted position
      headerRect.background = "#f8f9fa";
      headerRect.color = "#dee2e6";
      headerRect.thickness = 1;
      
      const titleText = new TextBlock();
      titleText.text = sectionName;
      titleText.color = "#333333";
      
      // Scale title font for high DPI displays
      const titleDevicePixelRatio = window.devicePixelRatio || 1;
      const baseTitleSize = 18; // Increased base title size
      titleText.fontSize = Math.round(baseTitleSize * Math.min(titleDevicePixelRatio, 2));
      titleText.fontWeight = "bold";
      headerRect.addControl(titleText);
      
      // Create close button
      const closeButton = new TextBlock();
      closeButton.text = "X";
      closeButton.color = "#666666"; // Gray color
      closeButton.fontSize = 16;
      closeButton.fontWeight = "bold";
      closeButton.widthInPixels = 20;
      closeButton.heightInPixels = 20;
      closeButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      closeButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      closeButton.leftInPixels = -10;
      closeButton.topInPixels = 5;
      closeButton.isPointerBlocker = true;
      
      // Create content area with bullet points - improved font rendering for high DPI
      const contentText = new TextBlock();
      contentText.text = bulletPoints;
      contentText.color = "#333333";
      
      // Calculate appropriate font size based on device pixel ratio for crisp rendering
      const contentDevicePixelRatio = window.devicePixelRatio || 1;
      const baseFontSize = 14; // Increased base size
      contentText.fontSize = Math.round(baseFontSize * Math.min(contentDevicePixelRatio, 2)); // Cap scaling at 2x
      
      contentText.lineSpacing = 6; // More line spacing for better readability
      contentText.textWrapping = true;
      contentText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      contentText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      contentText.paddingLeft = "20px";
      contentText.paddingRight = "20px";
      contentText.paddingTop = "60px"; // More top padding to avoid header overlap
      contentText.paddingBottom = "30px"; // More bottom padding to prevent cropping
      
      // Make content area take full available height with proper spacing
      contentText.heightInPixels = maxHeight - 20; // Leave more room to prevent cropping
      contentText.topInPixels = 25; // Move content down from header
      
      // Add controls to panel
      panel.addControl(headerRect);
      panel.addControl(closeButton);
      panel.addControl(contentText);
      
      // Make panel clickable to prevent background clicks from closing it
      panel.isPointerBlocker = true;
      
      // Make panel billboard (always face camera) positioned closer to object
      const billboardTransform = new TransformNode("billboardTransform", scene);
      billboardTransform.position = worldPosition.clone();
      billboardTransform.position.y += 1; // Closer offset above object
      
      // Connect GUI to 3D position
      panel.linkWithMesh(billboardTransform);
      panel.linkOffsetY = -30; // Closer vertical offset
      
      // Close button functionality
      closeButton.onPointerClickObservable.add(() => {
        if (currentBillboardPanel) {
          advancedTexture.removeControl(currentBillboardPanel);
          currentBillboardPanel = null;
          billboardPanelRef.current = null;
          
          // Clear selection when panel is closed
          if (cleanBMCRef.current) {
            cleanBMCRef.current.clearSelection();
          }
        }
      });
      
      // Add panel to UI
      advancedTexture.addControl(panel);
      currentBillboardPanel = panel;
      billboardPanelRef.current = panel;
      
      console.log(`✅✅ BILLBOARD PANEL CREATED SUCCESSFULLY FOR ${sectionName} ✅✅`);
      console.log(`📍 Panel position: (${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)}, ${worldPosition.z.toFixed(2)})`);
      console.log(`📏 Panel size: ${panel.widthInPixels}x${panel.heightInPixels}px`);
      console.log(`🎯 Panel should now be visible on screen with ${(sectionData as CanvasElement).content.length} bullet points!`);
    };
    
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
      
      // Create material with the new grey Internal label at 50% transparency
      const internalLabelMaterial = new StandardMaterial("internalLabelMat", scene);
      const internalLabelTexture = new Texture("/textures/Labels_internal_grey.png", scene);
      internalLabelTexture.hasAlpha = true;
      enhanceLabelTexture(internalLabelTexture);
      
      internalLabelMaterial.diffuseTexture = internalLabelTexture;
      internalLabelMaterial.emissiveTexture = internalLabelTexture;
      internalLabelMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0); // Full brightness for grey label
      internalLabelMaterial.alpha = 0.3; // 30% opacity (increased by 20%)
      internalLabelMaterial.useAlphaFromDiffuseTexture = true;
      internalLabelMaterial.disableLighting = true;
      
      internalLabelPlane.material = internalLabelMaterial;
      internalLabelPlane.isPickable = false;
      internalLabelPlane.parent = masterTransform; // Parent to master transform
      
      console.log(`✅ Internal label (grey) on ground plane at (${internalLabelPlane.position.x}, ${internalLabelPlane.position.y}, ${internalLabelPlane.position.z})`);
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
      
      // Create material with the External grey label at 50% transparency
      const externalLabelMaterial = new StandardMaterial("externalLabelMat", scene);
      const externalLabelTexture = new Texture("/textures/Labels_external_grey.png", scene);
      externalLabelTexture.hasAlpha = true;
      enhanceLabelTexture(externalLabelTexture);
      
      externalLabelMaterial.diffuseTexture = externalLabelTexture;
      externalLabelMaterial.emissiveTexture = externalLabelTexture;
      externalLabelMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0); // Full brightness for grey label
      externalLabelMaterial.alpha = 0.3; // 30% opacity (increased by 20%)
      externalLabelMaterial.useAlphaFromDiffuseTexture = true;
      externalLabelMaterial.disableLighting = true;
      
      externalLabelPlane.material = externalLabelMaterial;
      externalLabelPlane.isPickable = false;
      externalLabelPlane.parent = masterTransform; // Parent to master transform
      
      console.log(`✅ External label positioned on right side at (${externalLabelPlane.position.x}, ${externalLabelPlane.position.y}, ${externalLabelPlane.position.z})`);
    };

    // Add vertical divider label in the center of the ground plane, running top to bottom
    const createVerticalDividerLabel = () => {
      // Position in the center of the ground plane (X=0), running from top to bottom
      // Based on BMC layout: center line should run between left side (Internal) and right side (External)
      
      const verticalDividerPlane = MeshBuilder.CreatePlane("verticalDividerLabel", {
        width: 0.02,  // Ultra-thin width (2px equivalent)
        height: 13.0  // Increased height to extend more toward top
      }, scene);
      
      // Position to keep bottom fixed while extending toward positive Z (top in view)
      verticalDividerPlane.position.x = 0.0;   // Center line (X=0)
      verticalDividerPlane.position.y = 0.001; // Directly on ground plane surface
      verticalDividerPlane.position.z = 0.0;   // Adjusted to extend toward positive Z (top)
      
      // Rotate to lie flat on the ground
      verticalDividerPlane.rotation.x = Math.PI / 2;
      
      // Create material with the vertical divider grey label at 50% transparency
      const verticalDividerMaterial = new StandardMaterial("verticalDividerMat", scene);
      const verticalDividerTexture = new Texture("/textures/Labels_vertical_divider.png", scene);
      verticalDividerTexture.hasAlpha = true;
      enhanceLabelTexture(verticalDividerTexture);
      
      verticalDividerMaterial.diffuseTexture = verticalDividerTexture;
      verticalDividerMaterial.emissiveTexture = verticalDividerTexture;
      verticalDividerMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0); // Full brightness for grey label
      verticalDividerMaterial.alpha = 0.3; // 30% opacity (same as Internal/External)
      verticalDividerMaterial.useAlphaFromDiffuseTexture = true;
      verticalDividerMaterial.disableLighting = true;
      
      verticalDividerPlane.material = verticalDividerMaterial;
      verticalDividerPlane.isPickable = false;
      verticalDividerPlane.parent = masterTransform; // Parent to master transform
      
      console.log(`✅ Vertical divider label (grey) on ground plane at center (${verticalDividerPlane.position.x}, ${verticalDividerPlane.position.y}, ${verticalDividerPlane.position.z})`);
    };
    
    // Create the Internal, External, and Vertical Divider labels
    createInternalLabel();
    createExternalLabel();
    createVerticalDividerLabel();
    

    

    




    // Function to apply texture only to top face of mesh using proper UV mapping
    const applyTopFaceTexture = (mesh: Mesh, scene: Scene) => {
      // Analyzing mesh vertex data for top face identification
      
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
          // Applying standard base color to entire mesh
          
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
      { color: new Color3(0.6, 0.9, 0.9), name: "CustomerChannels" },               // Cyan
      { color: new Color3(0.9, 0.6, 0.3), name: "Customer Segments" },      // Orange (was Key Activities position)
    ];

    // Initialize model loader (view transitions integrated into CanvasManager)
    const modelLoader = new BMCModelLoader(scene);
    
    // REMOVED: MaterialManager initialization - using direct property modification instead
    
    // Setup unified interaction manager with callbacks  
    interactionManagerRef.current = new UnifiedInteractionManager(scene, {
      onSingleClick: (sectionId: string, mesh: AbstractMesh) => {
        // Single click detected
        
        // NEW LOGIC: If panel is open, refresh panel content instead of just selecting
        if (currentBillboardPanel) {
          // First select the object to update visual state
          if (cleanBMCRef.current) {
            cleanBMCRef.current.onSelect(sectionId);
          }
          // Then refresh the panel content
          const worldPosition = mesh.getAbsolutePosition();
          createBillboardPanel(sectionId, worldPosition);
          return; // Exit early since we've handled both selection and panel refresh
        }
        
        // REVENUE CRASH FIX: Prevent camera conflicts during Revenue clicks in 3D Top
        if (sectionId === "Revenue Streams" && isOrthographic) {
          console.log("🛡️ CRASH FIX: Revenue Streams click in 3D Top - preventing camera conflicts");
          try {
            if (cleanBMCRef.current) {
              cleanBMCRef.current.onSelect(sectionId);
            }
            return; // Exit early to prevent conflicts
          } catch (error) {
            console.error("❌ Revenue crash fix failed:", error);
            return;
          }
        }
        
        if (cleanBMCRef.current) {
          try {
            cleanBMCRef.current.onSelect(sectionId);
          } catch (error) {
            console.error(`❌ ERROR in cleanBMCRef.current.onSelect(${sectionId}):`, error);
            console.error(`❌ Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
          }
        } else {
          console.error(`❌ cleanBMCRef.current is null/undefined!`);
        }
      },
      onDoubleClick: (sectionId: string, mesh: AbstractMesh, position: Vector3) => {
        // Double click detected
        
        // Close any existing panel first
        if (currentBillboardPanel) {
          advancedTexture.removeControl(currentBillboardPanel);
          currentBillboardPanel = null;
          billboardPanelRef.current = null;
        }
        
        // Create new panel
        const worldPosition = mesh.getAbsolutePosition();
        createBillboardPanel(sectionId, worldPosition);
      },
      onHoverEnter: (sectionId: string, mesh: AbstractMesh) => {
        if (cleanBMCRef.current) {
          cleanBMCRef.current.onHover(sectionId, true);
        }
      },
      onHoverExit: (sectionId: string, mesh: AbstractMesh) => {
        if (cleanBMCRef.current) {
          cleanBMCRef.current.onHover(sectionId, false);
        }
      },
      onBackgroundClick: () => {
        // Background click - clearing selection
        if (cleanBMCRef.current) {
          cleanBMCRef.current.clearSelection();
        }
        if (currentBillboardPanel) {
          advancedTexture.removeControl(currentBillboardPanel);
          currentBillboardPanel = null;
          billboardPanelRef.current = null;
        }
      }
    });
    
    // Load complete BMC GLB model with individual section coloring
    modelLoader.loadMainBMC().then((model) => {
      if (model.meshes.length > 0) {
        console.log(`✅ BMC model loaded with ${model.meshes.length} meshes`);
        
        const rootMesh = model.rootMesh;
        rootMeshRef.current = rootMesh;
        
        // Position moved down by one row on ground plane (override default from loader)
        rootMesh.position = new Vector3(0, 0.1, 0.9);
        
        // Keep model at normal rotation for all views
        rootMesh.rotation = Vector3.Zero();
        rootMesh.parent = masterTransform; // Parent to master transform for 180° rotation
        
        // Position logging removed for better performance
        
        // Start with visible scale
        rootMesh.scaling = new Vector3(8, 8, 8);
        
        
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
          5: { color: new Color3(0.07, 0.07, 0.07), name: "CustomerChannels" },      // Medium Dark Grey
          6: { color: new Color3(0.07, 0.07, 0.07), name: "Customer Relationships" }, // Medium Dark Grey
          7: { color: new Color3(0.07, 0.07, 0.07), name: "Cost Structure" },         // Fallback - Medium Dark Grey
          8: { color: new Color3(0.07, 0.07, 0.07), name: "Revenue Streams" },        // Fallback - Medium Dark Grey
        };

        // Apply corrected colors, interactivity, and labels to each BMC section mesh
        let sectionIndex = 0;
        model.meshes.forEach((mesh, index) => {
          if (mesh.material && mesh.name !== "__root__") {
            const section = correctLabelMapping[sectionIndex] || correctLabelMapping[0];
            const baseColor = section.color;
            const sectionName = section.name;
            
            // Store section name directly on mesh for simpler approach
            (mesh as any).bmcSectionName = sectionName;
            
            // TransformNode created for coordinate control
            
            // Create StandardMaterial with PBR-compatible properties for hover behavior
            const sectionMaterial = new StandardMaterial(`bmcSection_${index}`, scene) as any;
            
            // Enhanced material with better polish and depth
            sectionMaterial.diffuseColor = baseColor;
            sectionMaterial.specularColor = new Color3(0.2, 0.2, 0.2); // Slightly higher for better polish
            sectionMaterial.specularPower = 64; // Tighter specular for cleaner reflections
            sectionMaterial.ambientColor = baseColor.scale(0.4); // Add subtle ambient for depth
            
            // Add baseColor property for compatibility with hover behavior
            sectionMaterial.baseColor = baseColor;
            
            // Store original colors for hover behavior
            (sectionMaterial as any).originalBaseColor = baseColor.clone();
            (sectionMaterial as any).originalDiffuseColor = baseColor.clone();
            
            // Add floating label planes for specific sections
            if (sectionName === "Customer Segments") {
              // FIX: Ensure bmcSectionName matches exactly what we search for
              (mesh as any).bmcSectionName = "Customer Segments";
              
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
              enhanceLabelTexture(labelTexture);
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              // Register with clean system - use fixed height of 1.0 for all BMC sections
              cleanBMCRef.current.registerItem("Customer Segments", mesh, sectionMaterial, 1.0);
              cleanBMCRef.current.addLabel("Customer Segments", labelPlane, labelMaterial);
              

              // const contentLabel = createContentLabel("Customer Segments", mesh, scene);
              // if (contentLabel) {
              //   cleanBMCRef.current.addLabel("Customer Segments", contentLabel, contentLabel.material as StandardMaterial);
              // }
              
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
              enhanceLabelTexture(labelTexture);
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              // Register with clean system - use fixed height of 1.0 for all BMC sections
              cleanBMCRef.current.registerItem("Key Partners", mesh, sectionMaterial, 1.0);
              cleanBMCRef.current.addLabel("Key Partners", labelPlane, labelMaterial);
              

              // const contentLabel = createContentLabel("Key Partners", mesh, scene);
              // if (contentLabel) {
              //   cleanBMCRef.current.addLabel("Key Partners", contentLabel, contentLabel.material as StandardMaterial);
              // }
              
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
              enhanceLabelTexture(labelTexture);
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              // Register with clean system - use fixed height of 1.0 for all BMC sections
              cleanBMCRef.current.registerItem("Customer Relationships", mesh, sectionMaterial, 1.0);
              cleanBMCRef.current.addLabel("Customer Relationships", labelPlane, labelMaterial);
              

              // const contentLabel = createContentLabel("Customer Relationships", mesh, scene);
              // if (contentLabel) {
              //   cleanBMCRef.current.addLabel("Customer Relationships", contentLabel, contentLabel.material as StandardMaterial);
              // }
              
              console.log(`✅ Customer Relationships label plane created`);
            }
            
            if (sectionName === "CustomerChannels") {
              console.log(`🏷️ Creating floating label for CustomerChannels mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with 50% taller height and slightly larger overall
              const labelWidth = size.x * 0.65; // Slightly larger than 0.6
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger than calculated height
              console.log(`CustomerChannels Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
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
              enhanceLabelTexture(labelTexture);
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              // Register with clean system - use fixed height of 1.0 for all BMC sections
              cleanBMCRef.current.registerItem("CustomerChannels", mesh, sectionMaterial, 1.0);
              cleanBMCRef.current.addLabel("CustomerChannels", labelPlane, labelMaterial);
              

              // const contentLabel = createContentLabel("CustomerChannels", mesh, scene);
              // if (contentLabel) {
              //   cleanBMCRef.current.addLabel("CustomerChannels", contentLabel, contentLabel.material as StandardMaterial);
              // }
              
              console.log(`✅ CustomerChannels label plane created`);
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
              
              // Create material for PNG texture - avoid emissive conflicts causing depth issues
              const labelMaterial = new StandardMaterial("keyActivitiesLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_KeyActivities.png", scene);
              labelTexture.hasAlpha = true;
              enhanceLabelTexture(labelTexture);
              
              labelMaterial.diffuseTexture = labelTexture;
              // REMOVED emissive settings that bypass depth testing and render on top
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              // Ensure proper depth testing - labels should not render on top of 3D objects
              labelMaterial.needDepthPrePass = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              // Register with clean system - use fixed height of 1.0 for all BMC sections
              cleanBMCRef.current.registerItem("Key Activities", mesh, sectionMaterial, 1.0);
              cleanBMCRef.current.addLabel("Key Activities", labelPlane, labelMaterial);
              

              // const contentLabel = createContentLabel("Key Activities", mesh, scene);
              // if (contentLabel) {
              //   cleanBMCRef.current.addLabel("Key Activities", contentLabel, contentLabel.material as StandardMaterial);
              // }
              
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
              
              // Create material for PNG texture - avoid emissive conflicts causing depth issues
              const labelMaterial = new StandardMaterial("keyResourcesLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_KeyResources.png", scene);
              labelTexture.hasAlpha = true;
              enhanceLabelTexture(labelTexture);
              
              labelMaterial.diffuseTexture = labelTexture;
              // REMOVED emissive settings that bypass depth testing and render on top
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              // Register with clean system - use fixed height of 1.0 for all BMC sections
              cleanBMCRef.current.registerItem("Key Resources", mesh, sectionMaterial, 1.0);
              cleanBMCRef.current.addLabel("Key Resources", labelPlane, labelMaterial);
              

              // const contentLabel = createContentLabel("Key Resources", mesh, scene);
              // if (contentLabel) {
              //   cleanBMCRef.current.addLabel("Key Resources", contentLabel, contentLabel.material as StandardMaterial);
              // }
              
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
              
              // Create material for PNG texture - avoid emissive texture conflicts
              const labelMaterial = new StandardMaterial("valuePropositionsLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_ValueProposition.png", scene);
              labelTexture.hasAlpha = true;
              enhanceLabelTexture(labelTexture);
              
              labelMaterial.diffuseTexture = labelTexture;
              // REMOVED emissive texture/color that was causing texture corruption
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              // Register with clean system - use fixed height of 1.0 for all BMC sections
              cleanBMCRef.current.registerItem("Value Propositions", mesh, sectionMaterial, 1.0);
              cleanBMCRef.current.addLabel("Value Propositions", labelPlane, labelMaterial);
              

              // const contentLabel = createContentLabel("Value Propositions", mesh, scene);
              // if (contentLabel) {
              //   cleanBMCRef.current.addLabel("Value Propositions", contentLabel, contentLabel.material as StandardMaterial);
              // }
              
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
            
            // REMOVED: Old content panel system - replaced by new billboard panel system
            // Store references for mesh identification
            (mesh as any).labelContainer = labelContainer;
            
            // REMOVED: Old BMC state initialization - CleanBMCSystem handles this
            
            // Setup mesh for UnifiedInteractionManager
            mesh.isPickable = true;
            
            // REMOVED: Old click select function - replaced by unified BMC system
            
            // REMOVED: Old click unselect function - replaced by unified BMC system
            
            // REMOVED: Old updateContentPanel function - replaced by createBillboardPanel
            
            // REMOVED: Single click handler - now handled by manual double-click detection
            
            // All click and double-click handling managed by UnifiedInteractionManager
            
            // REMOVED: Old close button functionality - now handled by billboard panel system
            
            sectionIndex++;
          }
        });
        
        // REMOVED: Value Proposition height adjustment - now handled by unified BMC system

        // REMOVED: Customer Channels special color treatment - now uses unified BMC system like all other objects

        // Revenue Streams alignment calculations (debug removed for performance)
        
        // Delayed Revenue Streams width adjustment to ensure both meshes are fully loaded
        setTimeout(() => {
          
          // Debug all available meshes
          scene.meshes.forEach((mesh, i) => {
            const sectionName = (mesh as any).bmcSectionName;
          });
          
          const revenueStreamsMesh = scene.meshes.find(mesh => (mesh as any).bmcSectionName === "Revenue Streams");
          const segmentsMesh = scene.meshes.find(mesh => (mesh as any).bmcSectionName === "Customer Segments");
          
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
            
            // revenueStreamsMesh.scaling.x = requiredScaleX;
            
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
    modelLoader.loadRevenueStreams().then((model) => {
      if (model.meshes.length > 0) {
        // Revenue Streams model loaded
        
        const revenueRootMesh = model.rootMesh;
        
        // Position Revenue Streams to align with LEFT EDGE of Customer Channels
        // From console logs: Customer Channels left edge = 0.467, Revenue Streams left edge = 0.155
        // Need to move right by 0.312 units to align: Current X position -0.533 becomes -0.221
        // X-axis: negative = LEFT, positive = RIGHT
        // Z-axis: negative = UP (screen), positive = DOWN (screen)
        revenueRootMesh.position = MODEL_POSITIONS.REVENUE_STREAMS.clone(); // Adjusted to align left edges
        revenueRootMesh.rotation = Vector3.Zero();
        revenueRootMesh.scaling = new Vector3(7.7, 7.7, 8); // Y-scaling matches X-scaling to match Customer Segments height
        revenueRootMesh.parent = masterTransform; // Parent to master transform for 180° rotation
        
        
        // Apply basic material and label to Revenue Streams mesh  
        // Processing Revenue Streams meshes
        model.meshes.forEach((mesh, index) => {
          if (mesh.name !== "__root__") {
            // Processing Revenue Streams mesh
            
            // Create material for Revenue Streams mesh - Darker British Racing Green
            const baseColor = new Color3(0.0, 0.20, 0.12); // Darker British Racing Green
            const sectionMaterial = new StandardMaterial(`revenueStreams_${index}`, scene);
            sectionMaterial.diffuseColor = baseColor;
            sectionMaterial.specularColor = new Color3(0.2, 0.4, 0.3); // Enhanced green specular
            sectionMaterial.specularPower = 64; // Tighter specular for cleaner reflections
            sectionMaterial.ambientColor = baseColor.scale(0.4); // Add subtle ambient for depth
            mesh.material = sectionMaterial;
            
            // Store section name for interactions and original properties 
            (mesh as any).bmcSectionName = "Revenue Streams";
            (mesh as any).originalColor = baseColor.clone();
            (mesh as any).isClicked = false;
            (mesh as any).hasTexture = false; // Revenue Streams uses solid color
            
            // REMOVED: Unified transformation system registration - simplified for reliability
            
            // REMOVED: Old content panel system - Revenue Streams uses new billboard panel system
            
            // REMOVED: Old BMC state initialization - CleanBMCSystem handles this
            
            // Setup mesh for UnifiedInteractionManager
            mesh.isPickable = true;
            console.log(`🎯 Revenue Streams: Mesh configured for UnifiedInteractionManager`);
            
            // REMOVED: Single click handler - now handled by manual double-click detection
            
            // All click and double-click handling managed by UnifiedInteractionManager

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
            // Revenue Streams mesh center calculated
            // Revenue Streams mesh size calculated
            
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
            enhanceLabelTexture(labelTexture);
            
            labelMaterial.diffuseTexture = labelTexture;
            labelMaterial.emissiveTexture = labelTexture;
            labelMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
            labelMaterial.useAlphaFromDiffuseTexture = true;
            labelMaterial.disableLighting = false;
            
            labelPlane.material = labelMaterial;
            labelPlane.parent = mesh;
            labelPlane.isPickable = false;
            
            // Register with clean system - use fixed height of 1.0 for all BMC sections
            cleanBMCRef.current.registerItem("Revenue Streams", mesh, sectionMaterial, 1.0);
            cleanBMCRef.current.addLabel("Revenue Streams", labelPlane, labelMaterial);
            
            // DISABLED: Create content label showing bullet points
            // const contentLabel = createContentLabel("Revenue Streams", mesh, scene);
            // if (contentLabel) {
            //   cleanBMCRef.current.addLabel("Revenue Streams", contentLabel, contentLabel.material as StandardMaterial);
            // }
            
            // Apply proportional scaling - reduced by 20% from the 2x size
            labelPlane.scaling = new Vector3(1.6, 2.08, 1.0); // 80% of 2x size (2.0 * 0.8 = 1.6, 2.6 * 0.8 = 2.08)
            
            console.log(`✅ Revenue Streams label plane created at position: (${labelPlane.position.x.toFixed(3)}, ${labelPlane.position.y.toFixed(3)}, ${labelPlane.position.z.toFixed(3)})`);
            // Label rotation configured
            // Label scale configured
            // Label dimensions calculated
            
            // Revenue Streams mesh configured
          }
        });
        
        // Debug Revenue Streams dimensions with fixed narrower width
        setTimeout(() => {
          const revenueMesh = model.meshes.find(mesh => mesh.name !== "__root__");
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
    modelLoader.loadCostStructure().then((model) => {
      if (model.meshes.length > 0) {
        // Cost Structure model loaded
        
        const costRootMesh = model.rootMesh;
        
        // Position Cost Structure in lower left area (yellow rectangle from diagram)
        // X-axis: negative = LEFT, positive = RIGHT
        // Z-axis: negative = UP (screen), positive = DOWN (screen)
        // Place in lower left area with same width as Revenue Streams
        costRootMesh.position = MODEL_POSITIONS.COST_STRUCTURE.clone(); // Shifted farther left
        costRootMesh.rotation = Vector3.Zero();
        costRootMesh.scaling = new Vector3(8.0, 8.0, 8); // Y-scaling matches X-scaling to match Customer Segments height
        costRootMesh.parent = masterTransform; // Parent to master transform for 180° rotation
        
        
        // Apply basic material and label to Cost Structure mesh  
        // Processing Cost Structure meshes
        model.meshes.forEach((mesh, index) => {
          if (mesh.name !== "__root__") {
            // Processing Cost Structure mesh
            
            // Create material for Cost Structure mesh - Deeper Red
            const baseColor = new Color3(0.35, 0.0, 0.0); // Deeper Red
            const sectionMaterial = new StandardMaterial(`costStructure_${index}`, scene);
            sectionMaterial.diffuseColor = baseColor;
            sectionMaterial.specularColor = new Color3(0.4, 0.15, 0.15); // Enhanced red specular
            sectionMaterial.specularPower = 64; // Tighter specular for cleaner reflections
            sectionMaterial.ambientColor = baseColor.scale(0.4); // Add subtle ambient for depth
            mesh.material = sectionMaterial;
            
            // Store section name for interactions and original properties 
            (mesh as any).bmcSectionName = "Cost Structure";
            (mesh as any).originalColor = baseColor.clone();
            (mesh as any).isClicked = false;
            (mesh as any).hasTexture = false; // Cost Structure uses solid color
            
            // REMOVED: Unified transformation system registration - simplified for reliability
            
            // REMOVED: Old content panel system - Cost Structure uses new billboard panel system
            
            // REMOVED: Old BMC state initialization - CleanBMCSystem handles this
            
            // Setup mesh for UnifiedInteractionManager
            mesh.isPickable = true;
            console.log(`🎯 Cost Structure: Mesh configured for UnifiedInteractionManager`);
            
            // REMOVED: Single click handler - now handled by manual double-click detection
            
            // All click and double-click handling managed by UnifiedInteractionManager

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
            // Cost Structure mesh center calculated
            // Cost Structure mesh size calculated
            
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
            enhanceLabelTexture(labelTexture);
            
            labelMaterial.diffuseTexture = labelTexture;
            labelMaterial.emissiveTexture = labelTexture;
            labelMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
            labelMaterial.useAlphaFromDiffuseTexture = true;
            labelMaterial.disableLighting = false;
            
            labelPlane.material = labelMaterial;
            labelPlane.parent = mesh;
            labelPlane.isPickable = false;
            
            // Register with clean system - use fixed height of 1.0 for all BMC sections
            cleanBMCRef.current.registerItem("Cost Structure", mesh, sectionMaterial, 1.0);
            cleanBMCRef.current.addLabel("Cost Structure", labelPlane, labelMaterial);
            
            // DISABLED: Create content label showing bullet points
            // const contentLabel = createContentLabel("Cost Structure", mesh, scene);
            // if (contentLabel) {
            //   cleanBMCRef.current.addLabel("Cost Structure", contentLabel, contentLabel.material as StandardMaterial);
            // }
            
            // Apply same proportional scaling as Revenue Streams
            labelPlane.scaling = new Vector3(1.6, 2.08, 1.0);
            
            console.log(`✅ Cost Structure label plane created at position: (${labelPlane.position.x.toFixed(3)}, ${labelPlane.position.y.toFixed(3)}, ${labelPlane.position.z.toFixed(3)})`);
            // Label rotation configured
            // Label scale configured
            // Label dimensions calculated
            
            // Cost Structure mesh configured
          }
        });
        
        // Debug Cost Structure dimensions
        setTimeout(() => {
          const costMesh = model.meshes.find(mesh => mesh.name !== "__root__");
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
      
      if (scene && scene.meshes) {
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
        
        // Store in global state
        setOriginalHeights(originalHeights);
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
      
      // FIX: Use ONLY the CleanBMCSystem for selection management
      cleanBMCRef.current.clearSelection();
      // REMOVED: bmcState.selectObject - was causing conflicts with CleanBMCSystem
      
      console.log("✅ All selections cleared, hover behavior enabled");
    };
    
    
    // setTimeout(() => {
    //   clearAllSelections();
    // }, 1000);
    
    

    // ENABLED: Restore selection using BMC State Manager for proper preservation
    setTimeout(() => {
      const existingSelection = bmcState.getSelectedObject();
      if (existingSelection) {
        console.log("🔄 Initial load: Restoring user selection:", existingSelection);
        if (cleanBMCRef.current) {
          cleanBMCRef.current.onSelect(existingSelection);
        }
      } else {
        console.log("🔄 Initial load: No selection to restore, hover behavior ready");
      }
    }, 1000);

    // AUTO-SWITCH: After 2 seconds, automatically switch from TOP view to RIGHT view
    // Only applies when starting with TOP preset (initial load)
    if (currentCameraPreset === 'TOP') {
      setTimeout(() => {
        console.log("🎬 Auto-switching camera from TOP to PERSPECTIVE_RIGHT after 2 seconds");
        switchCameraPreset('PERSPECTIVE_RIGHT');
      }, 2000);
    }

    // Initialize Animation Manager (Material Manager already initialized above)
    animationManagerRef.current = new BabylonAnimationManager(scene);
    console.log('🎬 Animation Manager initialized');
    console.log('🎨 Material Manager initialized');
    console.log('🖱️ Unified Interaction Manager initialized');

    // Start the render loop using SceneSetupAdapter
    let isDisposed = false;
    unifiedSceneRef.current?.startRenderLoop(() => {
      if (!isDisposed && scene && !scene.isDisposed) {
        scene.render();
      }
    });

    // Clean up on unmount
    return () => {
      isDisposed = true;
      // REMOVED: clearInterval(labelFixInterval) - CleanBMCSystem handles all label visibility
      
      // No orthographic camera to clean up
      
      // Save perspective camera state before disposing
      if (cameraRef.current) {
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

      // Clean up unified systems and managers
      try {
        // Safely dispose interaction manager
        if (interactionManagerRef.current) {
          console.log("🛡️ Safely disposing interaction manager to prevent crashes");
          interactionManagerRef.current.dispose();
          interactionManagerRef.current = null;
        }
        if (animationManagerRef.current) {
          animationManagerRef.current.dispose();
          animationManagerRef.current = null;
        }
      } catch (e) {
        console.warn('Error cleaning up unified systems and managers:', e);
      }

      // Properly dispose of Babylon.js resources using SceneSetupAdapter
      try {
        if (unifiedSceneRef.current) {
          unifiedSceneRef.current.dispose();
        }
        sceneRef.current = null;
        engineRef.current = null;
      } catch (e) {
        console.warn('Error during Babylon.js cleanup:', e);
      }
    };
  }, [canvas, saveCamera3DState]);

  // Camera is always perspective - no switching needed

  // Animations always run - no view mode switching

  // Handle restoration when entering 3D mode - optimized for smooth transitions
  useEffect(() => {
    if (is3D && sceneRef.current) {
      const selectedObject = bmcState.getSelectedObject();
      console.log(`🔄 ENTERING 3D MODE: Current selection="${selectedObject}"`);
      
      // FIXED: Coordinate with BMC State Manager for view transitions
      bmcState.switchView('view3DPerspective');
      
      // Update visuals immediately to prevent white flash
      if (cleanBMCRef.current) {
        // REMOVED: setTopViewMode - using only 3D View mode now
      }
    } else if (!is3D) {
      const selectedObject = bmcState.getSelectedObject();
      console.log(`🔄 ENTERING 2D MODE: Preserving selection="${selectedObject}"`);
      
      // FIXED: Coordinate with BMC State Manager for view transitions
      bmcState.switchView('view2D');
    }
  }, [is3D]);

  // Only one 3D view mode - no switching needed



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
    <div className="w-full h-full relative">
      {/* Header - centered horizontally in upper area */}
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-xl font-medium text-gray-900" style={{ fontFamily: 'Segoe UI, sans-serif' }}>{canvas.name}</h1>
      </div>
      
      {/* Camera Preset Buttons - Top Left with transition feedback */}
<div className="absolute left-96 z-10" style={{ top: '25px' }}>
        <div className="flex gap-2">
          <button
            onClick={() => switchCameraPreset('PERSPECTIVE_LEFT')}
            disabled={isTransitioningCamera}
            className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
              currentCameraPreset === 'PERSPECTIVE_LEFT' 
                ? 'bg-blue-600 text-white shadow-md' 
                : isTransitioningCamera 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm'
            }`}
          >
            {isTransitioningCamera && currentCameraPreset !== 'PERSPECTIVE_LEFT' ? '...' : 'Left View'}
          </button>
          <button
            onClick={() => switchCameraPreset('TOP')}
            disabled={isTransitioningCamera}
            className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
              currentCameraPreset === 'TOP' 
                ? 'bg-blue-600 text-white shadow-md' 
                : isTransitioningCamera 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm'
            }`}
          >
            {isTransitioningCamera && currentCameraPreset !== 'TOP' ? '...' : 'Top View'}
          </button>
          <button
            onClick={() => switchCameraPreset('PERSPECTIVE_RIGHT')}
            disabled={isTransitioningCamera}
            className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
              currentCameraPreset === 'PERSPECTIVE_RIGHT' 
                ? 'bg-blue-600 text-white shadow-md' 
                : isTransitioningCamera 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm'
            }`}
          >
            {isTransitioningCamera && currentCameraPreset !== 'PERSPECTIVE_RIGHT' ? '...' : 'Right View'}
          </button>
        </div>
        {isTransitioningCamera && (
          <div className="text-xs text-gray-600 mt-1 text-center animate-pulse">
            ✨ Smoothly transitioning camera...
          </div>
        )}
      </div>
      
      {/* Time Slider HUD - Floating at bottom with transparent background */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 px-8 py-4">
        <div className="relative" style={{ width: '600px' }}>
          {/* Slider track */}
          <div className="h-1 bg-gray-400 rounded-full mb-4 relative">
            {/* Vertical thumb at PRESENT position (center) */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-3 h-6 bg-gray-600 rounded-sm cursor-pointer hover:bg-gray-700 transition-colors shadow-lg border border-gray-500"></div>
            </div>
          </div>
          
          {/* Labels */}
          <div className="flex justify-between text-xs font-medium text-gray-800 mt-2">
            <span className="cursor-pointer hover:text-gray-900 transition-colors bg-white/10 px-2 py-1 rounded shadow-sm" onClick={() => console.log('🕐 PAST clicked')}>PAST</span>
            <span className="cursor-pointer hover:text-gray-900 transition-colors font-semibold bg-white/10 px-2 py-1 rounded shadow-md" onClick={() => console.log('🕐 PRESENT clicked')}>PRESENT</span>
            <span className="cursor-pointer hover:text-gray-900 transition-colors bg-white/10 px-2 py-1 rounded shadow-sm" onClick={() => console.log('🕐 FUTURE clicked')}>FUTURE</span>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 bg-black/90 text-white p-4 rounded-lg shadow-lg hidden">
        <div className="text-sm font-semibold mb-3 text-center">🎬 Animation Demos</div>
        <div className="flex flex-col space-y-2">
          <button 
            onClick={() => {
              if (animationManagerRef.current) {
                console.log('🎨 Running BMC Color Sequence Demo...');
                animationManagerRef.current.createColorSequence([
                  { section: "Value Propositions", color: "#00ff00", duration: 2000 },
                  { section: "Customer Segments", color: "#0066ff", duration: 1500 },
                  { section: "Key Partners", color: "#ff6600", duration: 1800 },
                  { section: "Revenue Streams", color: "#ffff00", duration: 1200 },
                  { section: "Cost Structure", color: "#ff0066", duration: 1500 }
                ]).then(() => console.log('🎨 Color sequence complete!'));
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-xs font-medium transition-colors"
          >
            Color Sequence
          </button>
          
          <button 
            onClick={() => {
              if (animationManagerRef.current) {
                console.log('🎭 Applying Business Performance Themes...');
                
                // Debug: List all available meshes
                const allMeshes = sceneRef.current?.meshes || [];
                console.log('🔍 Available meshes:', allMeshes.map(m => ({ name: m.name, metadata: m.metadata })));
                
                // Apply themes to each section
                animationManagerRef.current.applyBusinessTheme("Value Propositions", "high");
                animationManagerRef.current.applyBusinessTheme("Customer Segments", "medium");
                animationManagerRef.current.applyBusinessTheme("Key Partners", "low");
                animationManagerRef.current.applyBusinessTheme("Revenue Streams", "revenue");
                animationManagerRef.current.applyBusinessTheme("Cost Structure", "cost");
                console.log('🎭 Business themes applied!');
              }
            }}
            className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-xs font-medium transition-colors"
          >
            Business Themes
          </button>
          
          <button 
            onClick={() => {
              if (animationManagerRef.current) {
                console.log('🔗 Starting data-driven color animation...');
                animationManagerRef.current.bindColorToData("Revenue Streams", {
                  sectionId: "Revenue Streams",
                  dataField: "revenue.growth",
                  colorRange: ["#ff0000", "#00ff00"],
                  updateFrequency: 1000
                });
                console.log('🔗 Data binding active - Revenue Streams will animate based on simulated data');
              }
            }}
            className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-xs font-medium transition-colors"
          >
            Data Binding
          </button>
          
          <button 
            onClick={() => {
              if (animationManagerRef.current) {
                console.log('🔄 Clearing all animations...');
                animationManagerRef.current.clearAllAnimations();
                
                // Reset materials to safe defaults
                const scene = sceneRef.current;
                if (scene) {
                  scene.meshes.forEach(mesh => {
                    if (mesh.name.includes('BMC') || mesh.name.includes('Customer') || 
                        mesh.name.includes('Value') || mesh.name.includes('Key') ||
                        mesh.name.includes('Revenue') || mesh.name.includes('Cost')) {
                      
                      // Create safe default material
                      const defaultMaterial = new StandardMaterial(`reset_${mesh.name}`, scene);
                      defaultMaterial.diffuseColor = new Color3(0.07, 0.07, 0.07); // Original dark grey
                      defaultMaterial.emissiveColor = new Color3(0.01, 0.01, 0.01); // Slight glow for visibility
                      defaultMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
                      defaultMaterial.backFaceCulling = false;
                      defaultMaterial.alpha = 1.0;
                      
                      (mesh as Mesh).material = defaultMaterial;
                      mesh.isVisible = true;
                      mesh.setEnabled(true);
                    }
                  });
                }
                console.log('🔄 All animations cleared, materials safely reset');
              }
            }}
            className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-xs font-medium transition-colors"
          >
            Reset All
          </button>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ 
          outline: 'none',
          backgroundColor: '#e5e7eb' // Match scene clear color to prevent white flash
        }}
      />
    </div>
  );
};

export default Canvas3DBabylon;