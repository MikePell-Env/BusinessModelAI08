import { 
  Engine, 
  Scene, 
  ArcRotateCamera, 
  FreeCamera, 
  Vector3, 
  HemisphericLight, 
  DirectionalLight, 
  Color3, 
  StandardMaterial,
  AbstractMesh,
  TransformNode,
  Tools,
  ActionManager,
  ExecuteCodeAction
} from '@babylonjs/core';
import { BMCStateManagerImpl } from '../../../lib/bmcStateManager';

// Simple debug logging replacement
const debugLog = {
  info: (category: string, message: string) => console.log(`[${category}] ${message}`),
  verbose: (category: string, message: string) => console.log(`[${category}] ${message}`),
  warn: (category: string, message: string) => console.warn(`[${category}] ${message}`)
};

export type ViewMode = '2D' | '3D View';

interface MaterialPresets {
  original: StandardMaterial;
  hovered: StandardMaterial;
  selected: StandardMaterial;
  dimmed: StandardMaterial;
}

interface BMCObject {
  mesh: AbstractMesh;
  sectionName: string;
  materials: MaterialPresets;
  transformNode?: TransformNode;
  originalHeight: number;
}

/**
 * UNIFIED CANVAS MANAGER
 * 
 * Single system that replaces ALL competing managers:
 * - CameraController -> integrated camera management
 * - SceneSetup -> integrated scene initialization  
 * - InteractionManager -> integrated click/hover handling
 * - AnimationManager -> integrated animations
 * - CleanBMCSystem -> integrated material management
 * - ViewTransitionManager -> integrated view switching
 * 
 * ZERO dynamic creation after initialization.
 * ZERO camera recreation.  
 * ZERO material recreation.
 * ZERO competing systems.
 */
export class CanvasManager {
  // Core Babylon.js objects - created once
  private engine: Engine;
  private scene: Scene;
  private perspectiveCamera: ArcRotateCamera;
  // Removed orthographic camera - only perspective needed
  
  // State management
  private currentView: ViewMode = '3D View';
  private bmcObjects = new Map<string, BMCObject>();
  private bmcStateManager: BMCStateManagerImpl | null = null;
  private selectedObject: string | null = null;
  
  // Pre-created materials - NEVER recreated
  private baseMaterials = new Map<string, MaterialPresets>();
  
  // Single event system
  private isDragging = false;
  private dragStartPos = { x: 0, y: 0 };
  private readonly DRAG_THRESHOLD = 5;
  
  constructor(canvas: HTMLCanvasElement) {
    // Initialize Babylon.js core - ONCE
    this.engine = new Engine(canvas, true, { 
      powerPreference: "high-performance",
      antialias: true
    });
    this.scene = new Scene(this.engine);
    
    // Create single perspective camera - NEVER recreated
    this.perspectiveCamera = this.createPerspectiveCamera(canvas);
    
    // Set initial camera
    this.scene.activeCamera = this.perspectiveCamera;
    
    // Setup lighting - ONCE
    this.setupLighting();
    
    // Setup single event system
    this.setupEventSystem();
    
    debugLog.info('canvas', 'Unified CanvasManager initialized');
  }
  
  // =====================================================================================
  // CAMERA MANAGEMENT - Pre-created, never recreated
  // =====================================================================================
  
  private createPerspectiveCamera(canvas: HTMLCanvasElement): ArcRotateCamera {
    const camera = new ArcRotateCamera(
      "PerspectiveCamera",
      Tools.ToRadians(-90),
      Tools.ToRadians(60),
      25,
      Vector3.Zero(),
      this.scene
    );
    
    camera.setPosition(new Vector3(-20, 15, -20));
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2 - 0.1;
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 50;
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    
    return camera;
  }
  
  // Removed orthographic camera - only perspective needed
  
  // =====================================================================================
  // MATERIAL MANAGEMENT - Pre-created, reused
  // =====================================================================================
  
  private createMaterialPresets(sectionName: string): MaterialPresets {
    const scene = this.scene;
    
    // Original material
    const original = new StandardMaterial(`${sectionName}_original`, scene);
    original.diffuseColor = new Color3(0.07, 0.07, 0.07);
    original.emissiveColor = new Color3(0.01, 0.01, 0.01);
    original.specularColor = new Color3(0.1, 0.1, 0.1);
    original.backFaceCulling = false;
    original.alpha = 1.0;
    
    // Hovered material - toned blue for main BMC, brighter original for Cost/Revenue
    const hovered = new StandardMaterial(`${sectionName}_hovered`, scene);
    if (sectionName === 'Cost Structure' || sectionName === 'Revenue Streams') {
      // Brighter versions of original colors
      hovered.diffuseColor = original.diffuseColor.scale(2.0);
      hovered.emissiveColor = original.emissiveColor.scale(1.5);
    } else {
      // Toned blue for main BMC sections
      hovered.diffuseColor = new Color3(0.0, 0.3, 0.7);
      hovered.emissiveColor = new Color3(0.0, 0.0, 0.0);
    }
    hovered.specularColor = new Color3(0.1, 0.1, 0.1);
    hovered.backFaceCulling = false;
    hovered.alpha = 1.0;
    
    // Selected material - same as hover but with subtle emissive
    const selected = new StandardMaterial(`${sectionName}_selected`, scene);
    if (sectionName === 'Cost Structure' || sectionName === 'Revenue Streams') {
      selected.diffuseColor = hovered.diffuseColor.clone();
      selected.emissiveColor = hovered.emissiveColor.clone();
    } else {
      selected.diffuseColor = new Color3(0.0, 0.3, 0.7);
      selected.emissiveColor = new Color3(0.0, 0.05, 0.1);
    }
    selected.specularColor = new Color3(0.1, 0.1, 0.1);
    selected.backFaceCulling = false;
    selected.alpha = 1.0;
    
    // Dimmed material - grey for all when another object is selected
    const dimmed = new StandardMaterial(`${sectionName}_dimmed`, scene);
    dimmed.diffuseColor = new Color3(0.25, 0.25, 0.25);
    dimmed.emissiveColor = new Color3(0.0, 0.0, 0.0);
    dimmed.specularColor = new Color3(0.1, 0.1, 0.1);
    dimmed.backFaceCulling = false;
    dimmed.alpha = 0.3;
    
    return { original, hovered, selected, dimmed };
  }
  
  // =====================================================================================
  // LIGHTING SETUP - Created once
  // =====================================================================================
  
  private setupLighting(): void {
    // Ambient light
    const ambientLight = new HemisphericLight("ambientLight", new Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.15;
    
    // Main directional light
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -0.5), this.scene);
    directionalLight.intensity = 0.45;
    directionalLight.diffuse = new Color3(1, 1, 1);
    directionalLight.specular = new Color3(0.4, 0.4, 0.4);
    
    // Rim light
    const rimLight = new DirectionalLight("rimLight", new Vector3(1, 0.5, 1), this.scene);
    rimLight.intensity = 0.12;
    rimLight.diffuse = new Color3(0.8, 0.8, 0.9);
    rimLight.specular = new Color3(0.2, 0.2, 0.2);
  }
  
  // =====================================================================================
  // SINGLE EVENT SYSTEM - Replaces all interaction managers
  // =====================================================================================
  
  private setupEventSystem(): void {
    // Single pointer observable for all interactions
    this.scene.onPointerObservable.add((pointerInfo) => {
      switch (pointerInfo.type) {
        case 1: // PointerDown
          this.handlePointerDown(pointerInfo);
          break;
        case 2: // PointerUp  
          this.handlePointerUp(pointerInfo);
          break;
        case 4: // PointerMove
          this.handlePointerMove(pointerInfo);
          break;
      }
    });
    
    // Single window resize handler
    window.addEventListener('resize', () => {
      this.engine.resize();
      this.handleResize();
    });
  }
  
  private handlePointerDown(pointerInfo: any): void {
    this.isDragging = false;
    this.dragStartPos = { x: pointerInfo.event.clientX, y: pointerInfo.event.clientY };
  }
  
  private handlePointerMove(pointerInfo: any): void {
    if (this.dragStartPos.x !== 0) {
      const deltaX = Math.abs(pointerInfo.event.clientX - this.dragStartPos.x);
      const deltaY = Math.abs(pointerInfo.event.clientY - this.dragStartPos.y);
      if (deltaX > this.DRAG_THRESHOLD || deltaY > this.DRAG_THRESHOLD) {
        this.isDragging = true;
      }
    }
  }
  
  private handlePointerUp(pointerInfo: any): void {
    if (!this.isDragging) {
      this.handleClick(pointerInfo);
    }
    this.isDragging = false;
    this.dragStartPos = { x: 0, y: 0 };
  }
  
  private handleClick(pointerInfo: any): void {
    const pickInfo = pointerInfo.pickInfo;
    
    if (pickInfo?.hit && pickInfo.pickedMesh) {
      const mesh = pickInfo.pickedMesh;
      const sectionName = (mesh as any).bmcSectionName;
      
      if (sectionName) {
        this.selectObject(sectionName);
      }
    } else {
      // Background click - deselect all
      this.deselectAll();
    }
  }
  
  private handleResize(): void {
    // Only perspective camera used - no orthographic view
  }
  
  // =====================================================================================
  // OBJECT MANAGEMENT - Register BMC objects
  // =====================================================================================
  
  public registerBMCObject(sectionName: string, mesh: AbstractMesh, transformNode?: TransformNode): void {
    // Pre-create materials for this object
    const materials = this.createMaterialPresets(sectionName);
    this.baseMaterials.set(sectionName, materials);
    
    // Store object info
    const bmcObject: BMCObject = {
      mesh,
      sectionName,
      materials,
      transformNode,
      originalHeight: transformNode ? transformNode.scaling.y : mesh.scaling.y
    };
    
    this.bmcObjects.set(sectionName, bmcObject);
    
    // Set initial material
    mesh.material = materials.original;
    
    // Tag mesh for identification
    (mesh as any).bmcSectionName = sectionName;
    
    debugLog.verbose('canvas', `Registered BMC object: ${sectionName}`);
  }
  
  // =====================================================================================
  // VIEW SWITCHING - Simple camera switching without recreation
  // =====================================================================================
  
  public switchView(view: ViewMode): void {
    if (this.currentView === view) return;
    
    debugLog.info('canvas', `Switching view: ${this.currentView} → ${view}`);
    
    // Simple camera switching - NO recreation
    // Only perspective camera used
    this.scene.activeCamera = this.perspectiveCamera;
    
    this.currentView = view;
    
    // Notify BMC state manager
    if (this.bmcStateManager) {
      const bmcView = view === '2D' ? 'view2D' : 
                     'view3DPerspective';
      this.bmcStateManager.switchView(bmcView);
    }
  }
  
  // =====================================================================================
  // SELECTION MANAGEMENT - Material switching without recreation
  // =====================================================================================
  
  private selectObject(sectionName: string): void {
    if (this.selectedObject === sectionName) return;
    
    this.selectedObject = sectionName;
    this.updateAllVisualStates();
    
    // Notify BMC state manager - cast to proper type
    if (this.bmcStateManager) {
      this.bmcStateManager.selectObject(sectionName as any);
    }
    
    debugLog.verbose('canvas', `Selected: ${sectionName}`);
  }
  
  private deselectAll(): void {
    if (!this.selectedObject) return;
    
    this.selectedObject = null;
    this.updateAllVisualStates();
    
    // Notify BMC state manager
    if (this.bmcStateManager) {
      this.bmcStateManager.selectObject(null);
    }
    
    debugLog.verbose('canvas', 'Deselected all objects');
  }
  
  private updateAllVisualStates(): void {
    this.bmcObjects.forEach((obj, sectionName) => {
      if (this.selectedObject === sectionName) {
        // Selected object - full height, selected material
        this.setObjectHeight(obj, 1.0);
        obj.mesh.material = obj.materials.selected;
      } else if (this.selectedObject) {
        // Other objects when something is selected - flattened, dimmed
        this.setObjectHeight(obj, 0.01);
        obj.mesh.material = obj.materials.dimmed;
      } else {
        // No selection - all objects normal
        this.setObjectHeight(obj, 1.0);
        obj.mesh.material = obj.materials.original;
      }
    });
  }
  
  private setObjectHeight(obj: BMCObject, height: number): void {
    if (obj.transformNode) {
      obj.transformNode.scaling.y = height * obj.originalHeight;
    } else {
      obj.mesh.scaling.y = height * obj.originalHeight;
    }
  }
  
  // =====================================================================================
  // PUBLIC API - External integration points
  // =====================================================================================
  
  public setBMCStateManager(manager: BMCStateManagerImpl): void {
    this.bmcStateManager = manager;
  }
  
  public handleHover(sectionName: string | null): void {
    // Handle hover effects without changing height
    this.bmcObjects.forEach((obj, objSectionName) => {
      if (sectionName === objSectionName && this.selectedObject !== objSectionName) {
        // Hovered object - apply hover material
        obj.mesh.material = obj.materials.hovered;
      } else if (this.selectedObject === objSectionName) {
        // Keep selected material
        obj.mesh.material = obj.materials.selected;
      } else if (this.selectedObject) {
        // Keep dimmed material
        obj.mesh.material = obj.materials.dimmed;
      } else {
        // Return to original
        obj.mesh.material = obj.materials.original;
      }
    });
  }
  
  public startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }
  
  public getScene(): Scene {
    return this.scene;
  }
  
  public getEngine(): Engine {
    return this.engine;
  }
  
  public getCurrentView(): ViewMode {
    return this.currentView;
  }
  
  public dispose(): void {
    // Proper cleanup - detach controls first
    this.perspectiveCamera.detachControl();
    // Only perspective camera has controls
    
    // Dispose all pre-created materials
    this.baseMaterials.forEach(materials => {
      materials.original.dispose();
      materials.hovered.dispose();
      materials.selected.dispose();
      materials.dimmed.dispose();
    });
    
    // Dispose scene and engine
    this.scene.dispose();
    this.engine.dispose();
    
    debugLog.info('canvas', 'CanvasManager disposed');
  }
}