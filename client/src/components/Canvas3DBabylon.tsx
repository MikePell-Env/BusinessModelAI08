
import React, { useRef, useEffect, useState } from 'react';
import { 
  Engine, 
  Scene, 
  ArcRotateCamera,
  FreeCamera, 
  HemisphericLight, 
  DirectionalLight,
  MeshBuilder, 
  StandardMaterial,
  Color3, 
  Color4,
  Vector3, 
  AbstractMesh,
  ActionManager,
  ExecuteCodeAction,
  DynamicTexture
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { BusinessModelCanvas } from '@/types/canvas';
import { useCanvas } from '@/lib/stores/useCanvas';
import { BMCModelLoader } from './Canvas3DBabylon/models/BMCModelLoader';
import { WorldClassMaterialSystem } from '@/lib/babylon/WorldClassMaterialSystem';
import { EnterpriseInteractionManager } from '@/lib/babylon/EnterpriseInteractionManager';

interface Canvas3DBabylonProps {
  canvas: BusinessModelCanvas;
  isTransitioning?: boolean;
}

export const Canvas3DBabylon: React.FC<Canvas3DBabylonProps> = ({ canvas, isTransitioning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const orthoCameraRef = useRef<FreeCamera | null>(null);
  const materialSystemRef = useRef<WorldClassMaterialSystem | null>(null);
  const interactionManagerRef = useRef<EnterpriseInteractionManager | null>(null);

  const { 
    saveCamera3DState, 
    getCamera3DState, 
    is3D, 
    isOrthographic
  } = useCanvas();

  useEffect(() => {
    if (!canvasRef.current || !canvas) return;

    const canvasElement = canvasRef.current;
    let engine: Engine | null = null;
    let scene: Scene | null = null;

    try {
      console.log('🚀 Initializing Enterprise 3D System...');

      // Initialize Babylon.js with enterprise settings
      engine = new Engine(canvasElement, true, {
        preserveDrawingBuffer: true,
        antialias: true,
        powerPreference: "high-performance",
        stencil: true,
        adaptToDeviceRatio: true
      });

      scene = new Scene(engine);
      scene.clearColor = new Color4(233/255, 236/255, 239/255, 1.0);

      engineRef.current = engine;
      sceneRef.current = scene;

      console.log('✅ Babylon.js engine initialized');

    } catch (error) {
      console.error('❌ Critical failure initializing Babylon.js:', error);
      return;
    }

    // Create cameras with saved state - per documentation specs
    const savedCameraState = getCamera3DState();
    const perspectiveCamera = new ArcRotateCamera(
      "perspectiveCamera",
      savedCameraState?.alpha ?? -Math.PI / 2,
      savedCameraState?.beta ?? Math.PI / 3,
      savedCameraState?.radius ?? 25,
      Vector3.Zero(),
      scene
    );
    perspectiveCamera.attachControl(canvasElement, true);
    perspectiveCamera.wheelPrecision = 50;
    perspectiveCamera.lowerRadiusLimit = 5;
    perspectiveCamera.upperRadiusLimit = 25;
    perspectiveCamera.lowerBetaLimit = 0.1;
    perspectiveCamera.upperBetaLimit = Math.PI / 2.2;

    const topViewCamera = new FreeCamera(
      "topViewCamera",
      new Vector3(0, 22, -10),
      scene
    );
    topViewCamera.setTarget(Vector3.Zero());
    topViewCamera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
    
    // Define orthographic viewing box
    const orthoSize = 15;
    topViewCamera.orthoLeft = -orthoSize;
    topViewCamera.orthoRight = orthoSize;
    topViewCamera.orthoTop = orthoSize;
    topViewCamera.orthoBottom = -orthoSize;

    cameraRef.current = perspectiveCamera;
    orthoCameraRef.current = topViewCamera as any;

    scene.activeCamera = isOrthographic ? topViewCamera : perspectiveCamera;

    // Enterprise lighting system
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 1.3;
    hemisphericLight.diffuse = new Color3(0.95, 0.95, 0.95);
    hemisphericLight.specular = new Color3(0.3, 0.3, 0.3);
    hemisphericLight.groundColor = new Color3(0.4, 0.4, 0.45);

    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 1.9;
    directionalLight.diffuse = new Color3(1, 1, 1);
    directionalLight.specular = new Color3(0.4, 0.4, 0.4);

    console.log('✅ Enterprise lighting configured');

    // Initialize Enterprise Systems
    try {
      materialSystemRef.current = new WorldClassMaterialSystem(scene);
      interactionManagerRef.current = new EnterpriseInteractionManager(scene, materialSystemRef.current);
      
      // Set initial view mode
      interactionManagerRef.current.setTopViewMode(isOrthographic);
      
      console.log('🏆 Enterprise systems initialized successfully');
    } catch (error) {
      console.error('❌ Enterprise system initialization failed:', error);
      return;
    }

    // Create ground - matching target light blue base
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = new Color3(0.85, 0.92, 0.95); // Light blue like target
    groundMaterial.alpha = 0.8;
    ground.material = groundMaterial;
    ground.isPickable = false;

    // Add Internal/External labels to canvas base - matching target screenshots
    const createCanvasLabel = (text: string, position: Vector3, size: number = 2) => {
      const dynamicTexture = new DynamicTexture("labelTexture_" + text, { width: 512, height: 256 }, scene);
      dynamicTexture.hasAlpha = true;
      
      // Clear and draw text - light grey to match target
      dynamicTexture.drawText(text, null, null, "48px Arial", "#AAAAAA", "transparent", true);
      
      const labelMaterial = new StandardMaterial("labelMaterial_" + text, scene);
      labelMaterial.diffuseTexture = dynamicTexture;
      labelMaterial.alpha = 0.8;
      labelMaterial.backFaceCulling = false;
      
      const labelPlane = MeshBuilder.CreatePlane("label_" + text, { width: size, height: size * 0.5 }, scene);
      labelPlane.material = labelMaterial;
      labelPlane.position = position;
      labelPlane.rotation.x = -Math.PI / 2; // Lay flat on ground
      labelPlane.isPickable = false;
      
      return labelPlane;
    };
    
    // Add labels exactly like target screenshots
    createCanvasLabel("Internal", new Vector3(-4, 0.02, -5), 3);
    createCanvasLabel("External", new Vector3(4, 0.02, -5), 3);

    // Load BMC model with enterprise integration
    const modelLoader = new BMCModelLoader(scene);

    // Load all BMC models
    Promise.all([
      modelLoader.loadMainBMC(),
      modelLoader.loadRevenueStreams(),
      modelLoader.loadCostStructure()
    ]).then((models) => {
      const [mainModel, revenueModel, costModel] = models;
      
      // Process main BMC model
      const model = mainModel;
      if (model.meshes.length === 0) {
        console.warn('⚠️ No meshes loaded from BMC model');
        return;
      }

      const rootMesh = model.rootMesh;
      rootMesh.position = new Vector3(0, 0.1, 0.9);
      rootMesh.scaling = new Vector3(8, 8, 8);

      // Register meshes with enterprise systems - exact mapping per documentation
      const sectionNames = [
        "Key Partners", "Key Activities", "Key Resources", "Value Propositions",
        "Customer Relationships", "Customer Channels", "Customer Segments"
      ];

      model.meshes.forEach((mesh, index) => {
        if (mesh.name !== "__root__") {
          const sectionName = sectionNames[index] || `Section_${index}`;
          
          // Register with enterprise interaction manager FIRST
          if (interactionManagerRef.current) {
            interactionManagerRef.current.registerMesh(mesh, sectionName);
            console.log(`🏆 Enterprise registration: ${sectionName}`);
          }
          
          // Create dual label system: 3D floating + flat orthographic
          const createDualLabelSystem = (text: string, mesh: AbstractMesh) => {
            // 1. FLOATING 3D LABEL for perspective view
            const dynamicTexture3D = new DynamicTexture("3DlabelTexture_" + text, { width: 512, height: 256 }, scene);
            dynamicTexture3D.hasAlpha = true;
            dynamicTexture3D.drawText(text, null, null, "bold 36px Arial", "white", "transparent", true);
            
            const labelMaterial3D = new StandardMaterial("3DlabelMaterial_" + text, scene);
            labelMaterial3D.diffuseTexture = dynamicTexture3D;
            labelMaterial3D.emissiveTexture = dynamicTexture3D;
            labelMaterial3D.alpha = 1.0;
            labelMaterial3D.backFaceCulling = false;
            
            const labelPlane3D = MeshBuilder.CreatePlane("3Dlabel_" + text, { width: 2, height: 1 }, scene);
            labelPlane3D.material = labelMaterial3D;
            labelPlane3D.isPickable = false;
            labelPlane3D.renderingGroupId = 1;
            
            // Position floating label above mesh
            const bounds = mesh.getBoundingInfo();
            const meshHeight = bounds.maximum.y - bounds.minimum.y;
            labelPlane3D.position = mesh.position.clone();
            labelPlane3D.position.y = bounds.maximum.y + meshHeight * 0.3;
            labelPlane3D.setParent(mesh);
            
            // 2. FLAT ORTHOGRAPHIC LABEL for top view - positioned ON the section
            const dynamicTextureFlat = new DynamicTexture("FlatLabelTexture_" + text, { width: 512, height: 256 }, scene);
            dynamicTextureFlat.hasAlpha = true;
            dynamicTextureFlat.drawText(text, null, null, "bold 36px Arial", "white", "transparent", true);
            
            const labelMaterialFlat = new StandardMaterial("FlatLabelMaterial_" + text, scene);
            labelMaterialFlat.diffuseTexture = dynamicTextureFlat;
            labelMaterialFlat.emissiveTexture = dynamicTextureFlat;
            labelMaterialFlat.alpha = 1.0;
            labelMaterialFlat.backFaceCulling = false;
            
            const labelPlaneFlat = MeshBuilder.CreatePlane("FlatLabel_" + text, { width: 2, height: 1 }, scene);
            labelPlaneFlat.material = labelMaterialFlat;
            labelPlaneFlat.isPickable = false;
            labelPlaneFlat.renderingGroupId = 2; // Higher priority than 3D labels
            
            // Position flat label ON the mesh surface for top view
            labelPlaneFlat.position = mesh.position.clone();
            labelPlaneFlat.position.y = bounds.maximum.y + 0.05; // Just slightly above surface
            labelPlaneFlat.rotation.x = -Math.PI / 2; // Lay flat for top view
            labelPlaneFlat.setParent(mesh);
            
            // Store references for view switching
            (mesh as any).floatingLabel = labelPlane3D;
            (mesh as any).flatLabel = labelPlaneFlat;
            
            return { floating: labelPlane3D, flat: labelPlaneFlat };
          };
          
          // Create dual label system for this section
          createDualLabelSystem(sectionName, mesh);
          
          console.log(`✅ Processed ${sectionName} with enterprise systems and 3D label`);
        }
      });

      console.log('✅ Main BMC model loaded with enterprise systems');
      
      // Process Revenue Streams model
      if (revenueModel && revenueModel.meshes.length > 0) {
        revenueModel.meshes.forEach((mesh) => {
          if (mesh.name !== "__root__") {
            // Apply Revenue Streams specific material
            if (materialSystemRef.current) {
              const materialKey = materialSystemRef.current.getMaterialKeyForState('Revenue Streams', 'normal');
              const success = materialSystemRef.current.applyMaterialSafely(mesh, materialKey);
              console.log(`🎨 Applied ${materialKey} to Revenue Streams: ${success ? 'SUCCESS' : 'FAILED'}`);
            }
            
            // Register with interaction manager
            if (interactionManagerRef.current) {
              interactionManagerRef.current.registerMesh(mesh, 'Revenue Streams');
              console.log(`🏆 Enterprise registration: Revenue Streams`);
            }
            
            // Create dual label system for Revenue Streams
            const createDualLabelSystem = (text: string, mesh: AbstractMesh) => {
              const safeText = text.replace(' ', '_');
              
              // Floating 3D label
              const dynamicTexture3D = new DynamicTexture("3DlabelTexture_" + safeText, { width: 512, height: 256 }, scene);
              dynamicTexture3D.hasAlpha = true;
              dynamicTexture3D.drawText(text, null, null, "bold 36px Arial", "white", "transparent", true);
              
              const labelMaterial3D = new StandardMaterial("3DlabelMaterial_" + safeText, scene);
              labelMaterial3D.diffuseTexture = dynamicTexture3D;
              labelMaterial3D.emissiveTexture = dynamicTexture3D;
              labelMaterial3D.alpha = 1.0;
              labelMaterial3D.backFaceCulling = false;
              
              const labelPlane3D = MeshBuilder.CreatePlane("3Dlabel_" + safeText, { width: 2, height: 1 }, scene);
              labelPlane3D.material = labelMaterial3D;
              labelPlane3D.isPickable = false;
              labelPlane3D.renderingGroupId = 1;
              
              // Flat orthographic label
              const dynamicTextureFlat = new DynamicTexture("FlatLabelTexture_" + safeText, { width: 512, height: 256 }, scene);
              dynamicTextureFlat.hasAlpha = true;
              dynamicTextureFlat.drawText(text, null, null, "bold 36px Arial", "white", "transparent", true);
              
              const labelMaterialFlat = new StandardMaterial("FlatLabelMaterial_" + safeText, scene);
              labelMaterialFlat.diffuseTexture = dynamicTextureFlat;
              labelMaterialFlat.emissiveTexture = dynamicTextureFlat;
              labelMaterialFlat.alpha = 1.0;
              labelMaterialFlat.backFaceCulling = false;
              
              const labelPlaneFlat = MeshBuilder.CreatePlane("FlatLabel_" + safeText, { width: 2, height: 1 }, scene);
              labelPlaneFlat.material = labelMaterialFlat;
              labelPlaneFlat.isPickable = false;
              labelPlaneFlat.renderingGroupId = 2;
              
              const bounds = mesh.getBoundingInfo();
              
              // Position floating label above
              labelPlane3D.position = mesh.position.clone();
              labelPlane3D.position.y = bounds.maximum.y + (bounds.maximum.y - bounds.minimum.y) * 0.3;
              labelPlane3D.setParent(mesh);
              
              // Position flat label on surface
              labelPlaneFlat.position = mesh.position.clone();
              labelPlaneFlat.position.y = bounds.maximum.y + 0.05;
              labelPlaneFlat.rotation.x = -Math.PI / 2;
              labelPlaneFlat.setParent(mesh);
              
              (mesh as any).floatingLabel = labelPlane3D;
              (mesh as any).flatLabel = labelPlaneFlat;
              
              return { floating: labelPlane3D, flat: labelPlaneFlat };
            };
            
            createDualLabelSystem('Revenue Streams', mesh);
          }
        });
      }
      
      // Process Cost Structure model
      if (costModel && costModel.meshes.length > 0) {
        costModel.meshes.forEach((mesh) => {
          if (mesh.name !== "__root__") {
            // Apply Cost Structure specific material
            if (materialSystemRef.current) {
              const materialKey = materialSystemRef.current.getMaterialKeyForState('Cost Structure', 'normal');
              const success = materialSystemRef.current.applyMaterialSafely(mesh, materialKey);
              console.log(`🎨 Applied ${materialKey} to Cost Structure: ${success ? 'SUCCESS' : 'FAILED'}`);
            }
            
            // Register with interaction manager
            if (interactionManagerRef.current) {
              interactionManagerRef.current.registerMesh(mesh, 'Cost Structure');
              console.log(`🏆 Enterprise registration: Cost Structure`);
            }
            
            // Create dual label system for Cost Structure
            const createDualLabelSystem = (text: string, mesh: AbstractMesh) => {
              const safeText = text.replace(' ', '_');
              
              // Floating 3D label
              const dynamicTexture3D = new DynamicTexture("3DlabelTexture_" + safeText, { width: 512, height: 256 }, scene);
              dynamicTexture3D.hasAlpha = true;
              dynamicTexture3D.drawText(text, null, null, "bold 36px Arial", "white", "transparent", true);
              
              const labelMaterial3D = new StandardMaterial("3DlabelMaterial_" + safeText, scene);
              labelMaterial3D.diffuseTexture = dynamicTexture3D;
              labelMaterial3D.emissiveTexture = dynamicTexture3D;
              labelMaterial3D.alpha = 1.0;
              labelMaterial3D.backFaceCulling = false;
              
              const labelPlane3D = MeshBuilder.CreatePlane("3Dlabel_" + safeText, { width: 2, height: 1 }, scene);
              labelPlane3D.material = labelMaterial3D;
              labelPlane3D.isPickable = false;
              labelPlane3D.renderingGroupId = 1;
              
              // Flat orthographic label
              const dynamicTextureFlat = new DynamicTexture("FlatLabelTexture_" + safeText, { width: 512, height: 256 }, scene);
              dynamicTextureFlat.hasAlpha = true;
              dynamicTextureFlat.drawText(text, null, null, "bold 36px Arial", "white", "transparent", true);
              
              const labelMaterialFlat = new StandardMaterial("FlatLabelMaterial_" + safeText, scene);
              labelMaterialFlat.diffuseTexture = dynamicTextureFlat;
              labelMaterialFlat.emissiveTexture = dynamicTextureFlat;
              labelMaterialFlat.alpha = 1.0;
              labelMaterialFlat.backFaceCulling = false;
              
              const labelPlaneFlat = MeshBuilder.CreatePlane("FlatLabel_" + safeText, { width: 2, height: 1 }, scene);
              labelPlaneFlat.material = labelMaterialFlat;
              labelPlaneFlat.isPickable = false;
              labelPlaneFlat.renderingGroupId = 2;
              
              const bounds = mesh.getBoundingInfo();
              
              // Position floating label above
              labelPlane3D.position = mesh.position.clone();
              labelPlane3D.position.y = bounds.maximum.y + (bounds.maximum.y - bounds.minimum.y) * 0.3;
              labelPlane3D.setParent(mesh);
              
              // Position flat label on surface
              labelPlaneFlat.position = mesh.position.clone();
              labelPlaneFlat.position.y = bounds.maximum.y + 0.05;
              labelPlaneFlat.rotation.x = -Math.PI / 2;
              labelPlaneFlat.setParent(mesh);
              
              (mesh as any).floatingLabel = labelPlane3D;
              (mesh as any).flatLabel = labelPlaneFlat;
              
              return { floating: labelPlane3D, flat: labelPlaneFlat };
            };
            
            createDualLabelSystem('Cost Structure', mesh);
          }
        });
      }
      
      console.log('✅ All BMC models loaded with enterprise materials');
    }).catch((error) => {
      console.error("❌ Failed to load BMC models:", error);
    });

    // Background click handler for clearing selections
    scene.actionManager = new ActionManager(scene);
    scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, (evt) => {
        if (!evt.meshUnderPointer && interactionManagerRef.current) {
          interactionManagerRef.current.clearSelection();
        }
      })
    );

    // Enterprise render loop
    let isDisposed = false;
    engine.runRenderLoop(() => {
      if (!isDisposed && scene && !scene.isDisposed) {
        scene.render();
      }
    });

    // Handle window resize
    const handleResize = () => {
      if (engine) {
        engine.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);

      // Save camera state
      if (cameraRef.current && !isOrthographic) {
        try {
          saveCamera3DState(
            cameraRef.current.alpha,
            cameraRef.current.beta,
            cameraRef.current.radius
          );
        } catch (e) {
          console.warn('Warning saving camera state:', e);
        }
      }

      // Enterprise cleanup
      console.log('🧹 Starting enterprise cleanup...');
      
      if (interactionManagerRef.current) {
        interactionManagerRef.current.dispose();
      }
      
      if (materialSystemRef.current) {
        materialSystemRef.current.dispose();
      }

      if (scene) {
        scene.dispose();
      }
      if (engine) {
        engine.dispose();
      }

      console.log('✅ Enterprise cleanup complete');
    };
  }, [canvas]);

  // Handle camera switching with enterprise systems AND label visibility
  useEffect(() => {
    if (sceneRef.current && cameraRef.current && orthoCameraRef.current && interactionManagerRef.current) {
      const scene = sceneRef.current;
      const perspectiveCamera = cameraRef.current;
      const orthoCamera = orthoCameraRef.current;

      if (isOrthographic) {
        // Save perspective camera state
        saveCamera3DState(
          perspectiveCamera.alpha,
          perspectiveCamera.beta,
          perspectiveCamera.radius
        );

        // Switch camera
        scene.activeCamera = orthoCamera;
        interactionManagerRef.current.setTopViewMode(true);
        
        // Switch to flat labels for orthographic view
        scene.meshes.forEach(mesh => {
          if ((mesh as any).floatingLabel && (mesh as any).flatLabel) {
            (mesh as any).floatingLabel.isVisible = false;  // Hide floating labels
            (mesh as any).flatLabel.isVisible = true;       // Show flat labels
          }
        });
        
        console.log('📷 Enterprise: Switched to 3D Top View with flat labels');
      } else {
        // Switch camera
        scene.activeCamera = perspectiveCamera;
        interactionManagerRef.current.setTopViewMode(false);
        
        // Switch to floating labels for perspective view
        scene.meshes.forEach(mesh => {
          if ((mesh as any).floatingLabel && (mesh as any).flatLabel) {
            (mesh as any).floatingLabel.isVisible = true;   // Show floating labels
            (mesh as any).flatLabel.isVisible = false;      // Hide flat labels
          }
        });
        
        console.log('📷 Enterprise: Switched to 3D Perspective View with floating labels');
      }
    }
  }, [isOrthographic, saveCamera3DState]);

  return (
    <div className={`w-full h-full ${isTransitioning ? 'opacity-50' : ''} relative`}>
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-xl font-medium text-gray-900">{canvas.name}</h1>
      </div>

      {materialSystemRef.current && (
        <div className="absolute top-5 right-5 z-10 text-xs text-gray-600 bg-white/80 rounded px-2 py-1">
          Enterprise Systems: Active ✅
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ outline: 'none' }}
      />
    </div>
  );
};

export default Canvas3DBabylon;
