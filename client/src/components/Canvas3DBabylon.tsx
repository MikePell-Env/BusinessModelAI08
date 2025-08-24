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
  ExecuteCodeAction
} from '@babylonjs/core';
import { 
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock
} from '@babylonjs/gui';
import '@babylonjs/loaders/glTF';
import { BusinessModelCanvas } from '@/types/canvas';
import { useCanvas } from '@/lib/stores/useCanvas';
import { SceneSetup } from './Canvas3DBabylon/scene/SceneSetup';
import { BMCModelLoader } from './Canvas3DBabylon/models/BMCModelLoader';
import { SafeMaterialManager } from '@/lib/babylon/SafeMaterialManager';
import { CleanBMCSystem } from '@/lib/cleanBMCSystem';

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
  const meshesRef = useRef<AbstractMesh[]>([]);
  const safeMaterialManagerRef = useRef<SafeMaterialManager | null>(null);
  const cleanBMCSystemRef = useRef<CleanBMCSystem | null>(null);

  const { 
    saveCamera3DState, 
    getCamera3DState, 
    is3D, 
    isOrthographic
  } = useCanvas();

  useEffect(() => {
    if (!canvasRef.current || !canvas) return;

    const canvasElement = canvasRef.current;

    // Initialize Babylon.js with minimal settings
    let engine: Engine | null = null;
    let scene: Scene | null = null;

    try {
      engine = new Engine(canvasElement, true, {
        preserveDrawingBuffer: true,
        antialias: true,
        powerPreference: "high-performance"
      });

      scene = new Scene(engine);
      scene.clearColor = new Color4(233/255, 236/255, 239/255, 1.0);

      engineRef.current = engine;
      sceneRef.current = scene;

    } catch (error) {
      console.error('Failed to initialize Babylon.js:', error);
      return;
    }

    // Create cameras
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

    // Basic lighting
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 1.3;

    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 1.9;

    // Initialize safe systems
    try {
      safeMaterialManagerRef.current = new SafeMaterialManager(scene);
      cleanBMCSystemRef.current = new CleanBMCSystem();
      cleanBMCSystemRef.current.initialize(scene);
      console.log('✅ Safe systems initialized');
    } catch (error) {
      console.error('❌ Failed to initialize safe systems:', error);
    }

    // Create ground
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = new Color3(0.8, 0.8, 0.9);
    groundMaterial.alpha = 0.5;
    ground.material = groundMaterial;
    ground.isPickable = false;

    // Load BMC model with ZERO material modifications
    const modelLoader = new BMCModelLoader(scene);

    modelLoader.loadMainBMC().then((model) => {
      if (model.meshes.length === 0) return;

      const rootMesh = model.rootMesh;
      rootMesh.position = new Vector3(0, 0.1, 0.9);
      rootMesh.scaling = new Vector3(8, 8, 8);

      // Store mesh references
      meshesRef.current = model.meshes.filter(m => m.name !== "__root__");

      // SAFE: Restore basic materials and interactions
      model.meshes.forEach((mesh, index) => {
        if (mesh.name !== "__root__") {
          const sectionNames = [
            "Value Propositions", "Key Partners", "Customer Segments", 
            "Key Resources", "Key Activities", "CustomerChannels", 
            "Customer Relationships"
          ];
          const sectionName = sectionNames[index] || `Section_${index}`;
          (mesh as any).bmcSectionName = sectionName;

          // SAFE: Apply default material using SafeMaterialManager
          if (safeMaterialManagerRef.current) {
            const success = safeMaterialManagerRef.current.applyMaterialSafely(mesh, 'default_grey');
            if (success) {
              console.log(`✅ Safe material applied to ${sectionName}`);
            }
          }

          // SAFE: Register with CleanBMCSystem
          if (cleanBMCSystemRef.current) {
            cleanBMCSystemRef.current.registerMesh(mesh, sectionName);
          }

          // SAFE: Enable basic interactions
          mesh.isPickable = true;
          mesh.actionManager = new ActionManager(scene);
          
          // Basic hover effect
          mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              if (safeMaterialManagerRef.current && cleanBMCSystemRef.current) {
                cleanBMCSystemRef.current.onHover(sectionName, true);
              }
            })
          );

          mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              if (safeMaterialManagerRef.current && cleanBMCSystemRef.current) {
                cleanBMCSystemRef.current.onHover(sectionName, false);
              }
            })
          );

          console.log(`✅ Safe interactions setup for ${sectionName}`);
        }
      });
    }).catch((error) => {
      console.error("Failed to load BMC model:", error);
    });

    // Start render loop
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

      if (cameraRef.current && !isOrthographic) {
        try {
          saveCamera3DState(
            cameraRef.current.alpha,
            cameraRef.current.beta,
            cameraRef.current.radius
          );
        } catch (e) {
          console.warn('Error saving camera state:', e);
        }
      }

      // Cleanup safe systems
      if (cleanBMCSystemRef.current) {
        cleanBMCSystemRef.current.dispose();
      }
      if (safeMaterialManagerRef.current) {
        safeMaterialManagerRef.current.dispose();
      }

      if (scene) {
        scene.dispose();
      }
      if (engine) {
        engine.dispose();
      }
    };
  }, [canvas]);

  // Handle camera switching - MINIMAL operations only
  useEffect(() => {
    if (sceneRef.current && cameraRef.current && orthoCameraRef.current) {
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

        // Switch camera - THAT'S IT
        scene.activeCamera = orthoCamera;
        console.log('✅ SWITCHED TO 3D TOP - ZERO MATERIAL OPERATIONS');
      } else {
        // Switch camera - THAT'S IT  
        scene.activeCamera = perspectiveCamera;
        console.log('✅ SWITCHED TO 3D VIEW - ZERO MATERIAL OPERATIONS');
      }
    }
  }, [isOrthographic, saveCamera3DState]);

  return (
    <div className={`w-full h-full ${isTransitioning ? 'opacity-50' : ''} relative`}>
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-xl font-medium text-gray-900">{canvas.name}</h1>
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