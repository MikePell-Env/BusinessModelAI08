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
  DynamicTexture,
  Texture
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { BusinessModelCanvas } from '@/types/canvas';
import { useCanvas } from '@/lib/stores/useCanvas';
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
  const cleanBMCRef = useRef<CleanBMCSystem | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);

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
      console.log('🚀 Initializing 3D Canvas...');

      // Initialize Babylon.js
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

      // Initialize cameras
      setupCameras(scene);
      
      // Initialize lighting
      setupLighting(scene);
      
      // Initialize Clean BMC System
      cleanBMCRef.current = new CleanBMCSystem();
      cleanBMCRef.current.initialize(scene);
      
      // Load BMC model
      loadBMCModel(scene);

      console.log('✅ 3D Canvas initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize 3D Canvas:', error);
    }

    return () => {
      console.log('🧹 Cleaning up 3D Canvas...');
      
      if (cleanBMCRef.current) {
        cleanBMCRef.current = null;
      }
      
      if (scene) {
        scene.dispose();
      }
      
      if (engine) {
        engine.dispose();
      }
    };
  }, [canvas]); // Only recreate scene when canvas changes, not view mode

  const setupCameras = (scene: Scene) => {
    // 3D Perspective Camera
    const camera3D = new ArcRotateCamera(
      'camera3D',
      -Math.PI / 2,
      Math.PI / 2.5,
      12,
      Vector3.Zero(),
      scene
    );
    camera3D.setTarget(Vector3.Zero());
    camera3D.lowerRadiusLimit = 5;
    camera3D.upperRadiusLimit = 25;
    camera3D.lowerBetaLimit = 0.1;
    camera3D.upperBetaLimit = Math.PI / 2.2;
    
    // 3D Top Orthographic Camera
    const cameraTop = new FreeCamera('cameraTop', new Vector3(0, 15, 0), scene);
    cameraTop.setTarget(Vector3.Zero());
    cameraTop.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
    const orthoSize = 8;
    cameraTop.orthoLeft = -orthoSize;
    cameraTop.orthoRight = orthoSize;
    cameraTop.orthoTop = orthoSize * 0.6;
    cameraTop.orthoBottom = -orthoSize * 0.6;

    cameraRef.current = camera3D;
    orthoCameraRef.current = cameraTop;

    // Set active camera and controls
    const activeCamera = isOrthographic ? cameraTop : camera3D;
    scene.activeCamera = activeCamera;
    
    if (!isOrthographic) {
      camera3D.attachControl(canvasRef.current, true);
    }
  };

  const setupLighting = (scene: Scene) => {
    // Hemisphere light for general illumination
    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.6;
    hemiLight.diffuse = new Color3(1, 1, 1);
    hemiLight.specular = new Color3(1, 1, 1);
    hemiLight.groundColor = new Color3(0.7, 0.7, 0.7);

    // Directional light for better depth perception
    const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -1, -1), scene);
    dirLight.intensity = 0.4;
    dirLight.diffuse = new Color3(1, 1, 1);
    dirLight.specular = new Color3(0.8, 0.8, 0.8);
  };

  const loadBMCModel = async (scene: Scene) => {
    try {
      const { SceneLoader } = await import('@babylonjs/core/Loading/sceneLoader');
      
      console.log('📦 Loading BMC model...');
      
      const result = await SceneLoader.ImportMeshAsync('', '/models/', 'BMC.glb', scene);
      
      if (result.meshes.length === 0) {
        throw new Error('No meshes found in BMC model');
      }

      console.log(`✅ BMC model loaded with ${result.meshes.length} meshes`);
      
      // Initialize BMC System with meshes
      if (cleanBMCRef.current) {
        initializeBMCSystem(scene, result.meshes);
      }
      
      setIsLoaded(true);
      
    } catch (error) {
      console.error('❌ Failed to load BMC model:', error);
    }
  };

  const initializeBMCSystem = (scene: Scene, meshes: AbstractMesh[]) => {
    const cleanBMC = cleanBMCRef.current;
    if (!cleanBMC) return;

    try {
      console.log('🔧 Initializing BMC system...');

      // Map meshes to BMC sections
      const bmcSections = [
        'Value Propositions', 'Key Partners', 'Customer Segments',
        'Key Resources', 'Key Activities', 'CustomerChannels', 
        'Customer Relationships', 'Revenue Streams', 'Cost Structure'
      ];

      // Register meshes with CleanBMC system
      meshes.forEach(mesh => {
        const meshName = mesh.name;
        let sectionName = '';

        // Map mesh names to section names
        if (meshName.includes('ValueProposition')) sectionName = 'Value Propositions';
        else if (meshName.includes('KeyPartners')) sectionName = 'Key Partners';
        else if (meshName.includes('CustomerSegments')) sectionName = 'Customer Segments';
        else if (meshName.includes('KeyResources')) sectionName = 'Key Resources';
        else if (meshName.includes('KeyActivities')) sectionName = 'Key Activities';
        else if (meshName.includes('CustomerChannels')) sectionName = 'CustomerChannels';
        else if (meshName.includes('CustomerRelationships')) sectionName = 'Customer Relationships';
        else if (meshName.includes('RevenueStreams')) sectionName = 'Revenue Streams';
        else if (meshName.includes('CostStructure')) sectionName = 'Cost Structure';

        if (sectionName && bmcSections.includes(sectionName)) {
          cleanBMC.registerMesh(mesh, sectionName);
        }
      });

      // For now, disable interactions in both views to prevent crashes
      // TODO: Re-enable interactions once stability is confirmed
      console.log('🔒 All interactions disabled for stability');

      console.log('✅ BMC system initialized');

    } catch (error) {
      console.error('❌ Failed to initialize BMC system:', error);
    }
  };

  // Handle camera switching when view mode changes (separate from scene initialization)
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !orthoCameraRef.current) return;

    const scene = sceneRef.current;
    const activeCamera = isOrthographic ? orthoCameraRef.current : cameraRef.current;
    
    scene.activeCamera = activeCamera;

    if (isOrthographic) {
      // Disable controls in 3D Top view
      cameraRef.current.detachControl();
    } else {
      // Enable controls for 3D View
      cameraRef.current.attachControl(canvasRef.current, true);
    }

    // Update CleanBMC system view mode
    if (cleanBMCRef.current) {
      cleanBMCRef.current.setTopViewMode(isOrthographic);
    }

    console.log(`📷 Camera switched to: ${isOrthographic ? '3D Top' : '3D View'}`);
  }, [isOrthographic]);

  // Start render loop
  useEffect(() => {
    if (!engineRef.current) return;

    const engine = engineRef.current;
    
    const renderLoop = () => {
      if (sceneRef.current && !isTransitioning) {
        sceneRef.current.render();
      }
    };

    engine.runRenderLoop(renderLoop);

    return () => {
      engine.stopRenderLoop(renderLoop);
    };
  }, [isTransitioning]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none"
        style={{ display: 'block' }}
      />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading 3D Model...</p>
          </div>
        </div>
      )}
    </div>
  );
};