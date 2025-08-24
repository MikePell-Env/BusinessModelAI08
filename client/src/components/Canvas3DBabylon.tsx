import React, { useRef, useEffect, useState } from 'react';
import { Engine, Scene } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { BusinessModelCanvas } from '@/types/canvas';
import { useCanvas } from '@/lib/stores/useCanvas';
import { SceneSetup } from './Canvas3DBabylon/scene/SceneSetup';
import { BMCModelLoader } from './Canvas3DBabylon/models/BMCModelLoader';
import { MaterialManager } from '@/lib/core/MaterialManager';
import { UnifiedInteractionManager } from '@/lib/core/UnifiedInteractionManager';

interface Canvas3DBabylonProps {
  canvas: BusinessModelCanvas;
  isTransitioning?: boolean;
}

export const Canvas3DBabylon: React.FC<Canvas3DBabylonProps> = ({ 
  canvas, 
  isTransitioning 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const materialManagerRef = useRef<MaterialManager | null>(null);
  const interactionManagerRef = useRef<UnifiedInteractionManager | null>(null);

  const { 
    saveCamera3DState, 
    getCamera3DState, 
    is3D, 
    isOrthographic 
  } = useCanvas();

  useEffect(() => {
    if (!canvasRef.current || !canvas) return;

    const canvasElement = canvasRef.current;
    let cleanup: (() => void) | null = null;

    const initializeBabylon = async () => {
      try {
        // Initialize Babylon.js engine
        const engine = new Engine(canvasElement, true, {
          preserveDrawingBuffer: true,
          antialias: true,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false
        });
        engineRef.current = engine;

        // Create scene
        const scene = new Scene(engine);
        sceneRef.current = scene;

        // Initialize core managers FIRST
        const materialManager = new MaterialManager(scene);
        materialManagerRef.current = materialManager;

        const interactionManager = new UnifiedInteractionManager(
          scene, 
          materialManager, 
          isOrthographic
        );
        interactionManagerRef.current = interactionManager;

        // Setup scene (lighting, cameras, ground)
        const sceneSetup = new SceneSetup(scene);
        const { perspectiveCamera, orthographicCamera } = sceneSetup.initialize({
          savedCameraState: getCamera3DState(),
          isOrthographic
        });

        // Load BMC model
        const modelLoader = new BMCModelLoader(scene);
        const model = await modelLoader.loadMainBMC();

        if (model && model.meshes.length > 0) {
          // Position and scale the model
          const rootMesh = model.rootMesh;
          rootMesh.position.set(0, 0.1, 0.9);
          rootMesh.scaling.setAll(8);

          // Initialize materials for all BMC sections
          const bmcMeshes = model.meshes.filter(m => m.name !== "__root__");
          bmcMeshes.forEach((mesh, index) => {
            const sectionNames = [
              "Value Propositions", "Key Partners", "Customer Segments", 
              "Key Resources", "Key Activities", "CustomerChannels", 
              "Customer Relationships", "Cost Structure", "Revenue Streams"
            ];
            const sectionName = sectionNames[index] || `Section_${index}`;

            // Store section metadata
            (mesh as any).bmcSectionName = sectionName;
            mesh.id = `bmc_${sectionName.replace(/\s+/g, '_')}`;

            // Apply initial material using MaterialManager
            materialManager.applyMaterialState(mesh, sectionName, 'normal');

            // Setup interactions
            interactionManager.setupMeshInteractions(mesh, sectionName);
          });

          console.log(`✅ Initialized ${bmcMeshes.length} BMC sections with pooled materials`);
        }

        // Camera switching handler
        const handleCameraSwitch = () => {
          if (isOrthographic) {
            // Save perspective state
            saveCamera3DState(
              perspectiveCamera.alpha,
              perspectiveCamera.beta,
              perspectiveCamera.radius
            );
            scene.activeCamera = orthographicCamera;
            interactionManager.updateViewMode(true);
          } else {
            scene.activeCamera = perspectiveCamera;
            interactionManager.updateViewMode(false);
          }
        };

        // Apply initial camera
        handleCameraSwitch();

        // Start render loop
        let isDisposed = false;
        engine.runRenderLoop(() => {
          if (!isDisposed && scene && !scene.isDisposed) {
            scene.render();
          }
        });

        // Handle window resize
        const handleResize = () => engine?.resize();
        window.addEventListener('resize', handleResize);

        // Return cleanup function
        cleanup = () => {
          isDisposed = true;
          window.removeEventListener('resize', handleResize);

          // Save camera state
          try {
            if (perspectiveCamera && !isOrthographic) {
              saveCamera3DState(
                perspectiveCamera.alpha,
                perspectiveCamera.beta,
                perspectiveCamera.radius
              );
            }
          } catch (e) {
            console.warn('Error saving camera state:', e);
          }

          // Dispose in correct order
          interactionManager?.dispose();
          materialManager?.dispose();
          scene?.dispose();
          engine?.dispose();

          // Clear refs
          interactionManagerRef.current = null;
          materialManagerRef.current = null;
          sceneRef.current = null;
          engineRef.current = null;
        };

      } catch (error) {
        console.error('Failed to initialize Babylon.js:', error);
      }
    };

    initializeBabylon();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [canvas, saveCamera3DState, getCamera3DState]);

  // Handle camera switching
  useEffect(() => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.updateViewMode(isOrthographic);

      // Update active camera
      const scene = sceneRef.current;
      if (scene) {
        const cameras = scene.cameras;
        const perspectiveCamera = cameras.find(c => c.name === "perspectiveCamera");
        const orthographicCamera = cameras.find(c => c.name === "topViewCamera");

        if (isOrthographic && orthographicCamera) {
          scene.activeCamera = orthographicCamera;
        } else if (!isOrthographic && perspectiveCamera) {
          scene.activeCamera = perspectiveCamera;
        }
      }
    }
  }, [isOrthographic]);

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