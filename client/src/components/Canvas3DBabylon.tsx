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

    // Changed orthographic camera to perspective for top view
    const topViewCamera = new FreeCamera(
      "topViewCamera",
      new Vector3(0, 22, -10), // Position for top view
      scene
    );
    topViewCamera.setTarget(Vector3.Zero());
    // Removed orthographic mode, will be perspective

    // Define orthographic viewing box - not needed for perspective top view
    // const orthoSize = 15;
    // topViewCamera.orthoLeft = -orthoSize;
    // topViewCamera.orthoRight = orthoSize;
    // topViewCamera.orthoTop = orthoSize;
    // topViewCamera.orthoBottom = -orthoSize;

    cameraRef.current = perspectiveCamera;
    orthoCameraRef.current = topViewCamera as any; // Cast to any if FreeCamera is expected elsewhere as orthographic

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

          // Create surface label directly on mesh - like reference implementation
          const createSurfaceLabel = (text: string, mesh: AbstractMesh) => {
            // Map section names to texture file names
            const textureMap: { [key: string]: string } = {
              'Key Partners': '/textures/Label_KeyPartners.png',
              'Key Activities': '/textures/Label_KeyActivities.png',
              'Key Resources': '/textures/Label_KeyResources.png',
              'Value Propositions': '/textures/Label_ValueProposition.png',
              'Customer Relationships': '/textures/Label_CustomerRelationships.png',
              'Customer Channels': '/textures/Label_CustomerChannels.png',
              'Customer Segments': '/textures/Label_CustomerSegments.png',
              'Revenue Streams': '/textures/Label_RevenueStreams.png',
              'Cost Structure': '/textures/Label_CostStructure_1754477996199.png'
            };

            const texturePath = textureMap[text];
            if (!texturePath) {
              console.warn(`No texture found for section: ${text}`);
              return null;
            }

            // Load PNG texture
            const labelTexture = new Texture(texturePath, scene);
            labelTexture.hasAlpha = true;

            const labelMaterial = new StandardMaterial("surfaceLabelMaterial_" + text.replace(/\s+/g, ''), scene);
            labelMaterial.diffuseTexture = labelTexture;
            labelMaterial.emissiveTexture = labelTexture;
            labelMaterial.emissiveColor = new Color3(0.9, 0.9, 0.9);
            labelMaterial.alpha = 1.0;
            labelMaterial.backFaceCulling = false;
            labelMaterial.useAlphaFromDiffuseTexture = true;

            const bounds = mesh.getBoundingInfo();
            const labelWidth = (bounds.maximum.x - bounds.minimum.x) * 0.8;
            const labelHeight = labelWidth * 0.4; // Adjusted for PNG aspect ratio

            const labelPlane = MeshBuilder.CreatePlane("surfaceLabel_" + text.replace(/\s+/g, ''), {
              width: labelWidth,
              height: labelHeight
            }, scene);
            labelPlane.material = labelMaterial;
            labelPlane.isPickable = false;
            labelPlane.renderingGroupId = 2; // Render on top

            // Position ON the mesh surface
            labelPlane.position = mesh.position.clone();
            labelPlane.position.y = bounds.maximum.y + 0.001; // Barely above surface to prevent z-fighting
            labelPlane.rotation.x = -Math.PI / 2; // Lay flat on surface
            labelPlane.setParent(mesh);

            console.log(`✅ Applied PNG label texture: ${texturePath} for ${text}`);
            return labelPlane;
          };

          // Create surface label for this section
          createSurfaceLabel(sectionName, mesh);

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

            // Create surface label for Revenue Streams
            const createSurfaceLabel = (text: string, mesh: AbstractMesh) => {
              const labelTexture = new Texture('/textures/Label_RevenueStreams.png', scene);
              labelTexture.hasAlpha = true;

              const labelMaterial = new StandardMaterial("surfaceLabelMaterial_" + text.replace(/\s+/g, ''), scene);
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.9, 0.9, 0.9);
              labelMaterial.alpha = 1.0;
              labelMaterial.backFaceCulling = false;
              labelMaterial.useAlphaFromDiffuseTexture = true;

              const bounds = mesh.getBoundingInfo();
              const labelWidth = (bounds.maximum.x - bounds.minimum.x) * 0.8;
              const labelHeight = labelWidth * 0.4;

              const labelPlane = MeshBuilder.CreatePlane("surfaceLabel_" + text.replace(/\s+/g, ''), {
                width: labelWidth,
                height: labelHeight
              }, scene);
              labelPlane.material = labelMaterial;
              labelPlane.isPickable = false;
              labelPlane.renderingGroupId = 2;

              // Position ON the mesh surface
              labelPlane.position = mesh.position.clone();
              labelPlane.position.y = bounds.maximum.y + 0.001;
              labelPlane.rotation.x = -Math.PI / 2;
              labelPlane.setParent(mesh);

              console.log(`✅ Applied PNG label: ${text}`);
              return labelPlane;
            };

            createSurfaceLabel('Revenue Streams', mesh);
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

            // Create surface label for Cost Structure
            const createSurfaceLabel = (text: string, mesh: AbstractMesh) => {
              const labelTexture = new Texture('/textures/Label_CostStructure_1754477996199.png', scene);
              labelTexture.hasAlpha = true;

              const labelMaterial = new StandardMaterial("surfaceLabelMaterial_" + text.replace(/\s+/g, ''), scene);
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.9, 0.9, 0.9);
              labelMaterial.alpha = 1.0;
              labelMaterial.backFaceCulling = false;
              labelMaterial.useAlphaFromDiffuseTexture = true;

              const bounds = mesh.getBoundingInfo();
              const labelWidth = (bounds.maximum.x - bounds.minimum.x) * 0.8;
              const labelHeight = labelWidth * 0.4;

              const labelPlane = MeshBuilder.CreatePlane("surfaceLabel_" + text.replace(/\s+/g, ''), {
                width: labelWidth,
                height: labelHeight
              }, scene);
              labelPlane.material = labelMaterial;
              labelPlane.isPickable = false;
              labelPlane.renderingGroupId = 2;

              // Position ON the mesh surface
              labelPlane.position = mesh.position.clone();
              labelPlane.position.y = bounds.maximum.y + 0.001;
              labelPlane.rotation.x = -Math.PI / 2;
              labelPlane.setParent(mesh);

              console.log(`✅ Applied PNG label: ${text}`);
              return labelPlane;
            };

            createSurfaceLabel('Cost Structure', mesh);
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