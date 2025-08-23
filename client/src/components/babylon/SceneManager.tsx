import React, { useRef, useEffect } from 'react';
import { 
  Engine, 
  Scene, 
  HemisphericLight, 
  DirectionalLight,
  MeshBuilder,
  DynamicTexture,
  StandardMaterial,
  Color3, 
  Color4,
  Vector3
} from '@babylonjs/core';

interface SceneManagerProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onSceneReady?: (scene: Scene, engine: Engine) => void;
}

export const useSceneManager = ({ canvasRef, onSceneReady }: SceneManagerProps) => {
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  const createLighting = (scene: Scene) => {
    // Enhanced lighting setup for semi-gloss materials with subtle reflections
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 1.2;
    hemisphericLight.diffuse = new Color3(0.9, 0.9, 0.9);
    hemisphericLight.specular = new Color3(0.2, 0.2, 0.2);
    
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 1.8;
    directionalLight.diffuse = new Color3(1, 1, 1);
    directionalLight.specular = new Color3(0.3, 0.3, 0.3);

    return { hemisphericLight, directionalLight };
  };

  const createGround = (scene: Scene) => {
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    
    // Create dynamic texture for powder blue grid pattern with white lines
    const gridTexture = new DynamicTexture("gridTexture", { width: 1024, height: 1024 }, scene, false);
    const gridContext = gridTexture.getContext();
    
    // Fill with custom powder blue background
    gridContext.fillStyle = "#a7dbfc";
    gridContext.fillRect(0, 0, 1024, 1024);
    
    // Draw white grid lines
    gridContext.strokeStyle = "#FFFFFF";
    gridContext.lineWidth = 1;
    
    // Draw vertical lines (spacing every 32 pixels)
    for (let i = 0; i <= 1024; i += 32) {
      gridContext.beginPath();
      gridContext.moveTo(i, 0);
      gridContext.lineTo(i, 1024);
      gridContext.stroke();
    }
    
    // Draw horizontal lines (spacing every 32 pixels)
    for (let j = 0; j <= 1024; j += 32) {
      gridContext.beginPath();
      gridContext.moveTo(0, j);
      gridContext.lineTo(1024, j);
      gridContext.stroke();
    }
    
    gridTexture.update();
    
    // Create material and apply texture
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseTexture = gridTexture;
    ground.material = groundMaterial;
    
    // Position ground slightly below origin
    ground.position.y = -0.1;

    return ground;
  };

  const initializeScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create engine and scene
    const engine = new Engine(canvas, true, {
      powerPreference: "high-performance",
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    });

    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.65, 0.85, 0.98, 1); // Light powder blue background

    // Setup lighting
    createLighting(scene);

    // Create ground
    createGround(scene);

    // Store references
    engineRef.current = engine;
    sceneRef.current = scene;

    // Start render loop
    engine.runRenderLoop(() => {
      if (scene && !scene.isDisposed) {
        scene.render();
      }
    });

    // Handle resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup function
    const cleanup = () => {
      window.removeEventListener('resize', handleResize);
      if (scene && !scene.isDisposed) {
        scene.dispose();
      }
      if (engine && !engine.isDisposed) {
        engine.dispose();
      }
    };

    // Notify parent component
    if (onSceneReady) {
      onSceneReady(scene, engine);
    }

    return cleanup;
  };

  // Initialize scene when canvas is available
  useEffect(() => {
    if (canvasRef.current) {
      return initializeScene();
    }
  }, [canvasRef.current]);

  return {
    scene: sceneRef.current,
    engine: engineRef.current
  };
};