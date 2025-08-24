
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
  AbstractMesh
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

    // Create cameras with saved state
    const savedCameraState = getCamera3DState();
    const perspectiveCamera = new ArcRotateCamera(
      "perspectiveCamera",
      savedCameraState?.alpha ?? -Math.PI / 2.5,
      savedCameraState?.beta ?? Math.PI / 6,
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

    const topViewCamera = new ArcRotateCamera(
      "topViewCamera",
      -Math.PI / 2,
      0.01,
      28,
      Vector3.Zero(),
      scene
    );
    topViewCamera.fov = 0.6;
    topViewCamera.lowerRadiusLimit = 15;
    topViewCamera.upperRadiusLimit = 40;

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

    // Create ground
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = new Color3(0.8, 0.8, 0.9);
    groundMaterial.alpha = 0.5;
    ground.material = groundMaterial;
    ground.isPickable = false;

    // Load BMC model with enterprise integration
    const modelLoader = new BMCModelLoader(scene);

    modelLoader.loadMainBMC().then((model) => {
      if (model.meshes.length === 0) {
        console.warn('⚠️ No meshes loaded from BMC model');
        return;
      }

      const rootMesh = model.rootMesh;
      rootMesh.position = new Vector3(0, 0.1, 0.9);
      rootMesh.scaling = new Vector3(8, 8, 8);

      // Register meshes with enterprise systems
      const sectionNames = [
        "Value Propositions", "Key Partners", "Customer Segments", 
        "Key Resources", "Key Activities", "CustomerChannels", 
        "Customer Relationships", "Cost Structure", "Revenue Streams"
      ];

      model.meshes.forEach((mesh, index) => {
        if (mesh.name !== "__root__") {
          const sectionName = sectionNames[index] || `Section_${index}`;
          
          // Register with enterprise interaction manager
          if (interactionManagerRef.current) {
            interactionManagerRef.current.registerMesh(mesh, sectionName);
            console.log(`🏆 Enterprise registration: ${sectionName}`);
          }
        }
      });

      console.log('✅ BMC model loaded with enterprise systems');
    }).catch((error) => {
      console.error("❌ Failed to load BMC model:", error);
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

  // Handle camera switching with enterprise systems
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
        console.log('📷 Enterprise: Switched to 3D Top View');
      } else {
        // Switch camera
        scene.activeCamera = perspectiveCamera;
        interactionManagerRef.current.setTopViewMode(false);
        console.log('📷 Enterprise: Switched to 3D Perspective View');
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
