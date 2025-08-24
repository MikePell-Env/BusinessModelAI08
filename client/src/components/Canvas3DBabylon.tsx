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

    // 3D Top view camera positioned directly above
    const topViewCamera = new ArcRotateCamera(
      "topViewCamera", 
      0, // Alpha - directly above
      Math.PI / 6, // Beta - slight angle from top (30 degrees)
      30, // Radius - distance from target
      Vector3.Zero(),
      scene
    );
    topViewCamera.wheelPrecision = 100;

    cameraRef.current = perspectiveCamera;
    orthoCameraRef.current = topViewCamera;

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

    // Add Internal/External labels to match target screenshot
    const createCanvasLabel = (text: string, position: Vector3, size: number = 2) => {
      const dynamicTexture = new DynamicTexture("labelTexture_" + text, { width: 512, height: 256 }, scene);
      dynamicTexture.hasAlpha = true;
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

    // Add Internal/External labels
    createCanvasLabel("Internal", new Vector3(-4, 0.02, 5), 4);
    createCanvasLabel("External", new Vector3(4, 0.02, 5), 4);

    // CREATE PROPER BMC LAYOUT TO MATCH REFERENCE SCREENSHOT
    const createBMCSection = (name: string, position: Vector3, size: Vector3, color: Color3, texturePath: string) => {
      // Create the box geometry
      const box = MeshBuilder.CreateBox(name, {
        width: size.x,
        height: 0.5, // Standard height for all sections
        depth: size.z
      }, scene);

      box.position = position;

      // Apply material based on section type
      const material = new StandardMaterial(name + "_material", scene);
      material.diffuseColor = color;
      material.specularColor = new Color3(0.3, 0.3, 0.3);
      material.specularPower = 32;
      box.material = material;

      // Register with enterprise systems
      if (materialSystemRef.current) {
        const materialKey = materialSystemRef.current.getMaterialKeyForState(name, 'normal');
        materialSystemRef.current.applyMaterialSafely(box, materialKey);
      }

      if (interactionManagerRef.current) {
        interactionManagerRef.current.registerMesh(box, name);
      }

      // Create surface label with PNG texture
      const createSurfaceLabel = (mesh: AbstractMesh, texPath: string) => {
        const labelTexture = new Texture(texPath, scene);
        labelTexture.hasAlpha = true;

        const labelMaterial = new StandardMaterial("surfaceLabel_" + name, scene);
        labelMaterial.diffuseTexture = labelTexture;
        labelMaterial.emissiveTexture = labelTexture;
        labelMaterial.emissiveColor = new Color3(0.9, 0.9, 0.9);
        labelMaterial.alpha = 1.0;
        labelMaterial.backFaceCulling = false;
        labelMaterial.useAlphaFromDiffuseTexture = true;

        const labelWidth = size.x * 0.8;
        const labelHeight = labelWidth * 0.4;

        const labelPlane = MeshBuilder.CreatePlane("surfaceLabel_" + name, {
          width: labelWidth,
          height: labelHeight
        }, scene);

        labelPlane.material = labelMaterial;
        labelPlane.position = new Vector3(position.x, position.y + 0.26, position.z);
        labelPlane.rotation.x = -Math.PI / 2;
        labelPlane.isPickable = false;
        labelPlane.renderingGroupId = 1;
        labelPlane.setParent(mesh);

        console.log(`✅ Applied PNG label: ${texPath} for ${name}`);
      };

      createSurfaceLabel(box, texturePath);
      return box;
    };

    // BMC SECTIONS LAYOUT - MATCHING REFERENCE SCREENSHOT EXACTLY
    // Define section positions and sizes to match the reference image

    // Left column - Key Partners (tall)
    createBMCSection(
      "Key Partners",
      new Vector3(-6, 0.25, 0),
      new Vector3(3, 0.5, 6),
      new Color3(0.15, 0.15, 0.15), // Dark grey
      '/textures/Label_KeyPartners.png'
    );

    // Second column, top - Key Activities
    createBMCSection(
      "Key Activities", 
      new Vector3(-2.5, 0.25, -1.5),
      new Vector3(3, 0.5, 3),
      new Color3(0.15, 0.15, 0.15),
      '/textures/Label_KeyActivities.png'
    );

    // Second column, bottom - Key Resources
    createBMCSection(
      "Key Resources",
      new Vector3(-2.5, 0.25, 1.5), 
      new Vector3(3, 0.5, 3),
      new Color3(0.15, 0.15, 0.15),
      '/textures/Label_KeyResources.png'
    );

    // CENTER - Value Propositions (CIRCULAR - matching reference)
    const valuePropsCircle = MeshBuilder.CreateCylinder("Value Propositions", {
      height: 1.0, // Double height like reference
      diameterTop: 4,
      diameterBottom: 4
    }, scene);
    valuePropsCircle.position = new Vector3(0, 0.5, 0);

    const valuePropsCircleMaterial = new StandardMaterial("valuePropsCircleMaterial", scene);
    valuePropsCircleMaterial.diffuseColor = new Color3(0.15, 0.15, 0.15); // Dark like others
    valuePropsCircleMaterial.specularColor = new Color3(0.4, 0.4, 0.4);
    valuePropsCircle.material = valuePropsCircleMaterial;

    // Register Value Propositions with systems
    if (materialSystemRef.current) {
      const materialKey = materialSystemRef.current.getMaterialKeyForState("Value Propositions", 'normal');
      materialSystemRef.current.applyMaterialSafely(valuePropsCircle, materialKey);
    }

    if (interactionManagerRef.current) {
      interactionManagerRef.current.registerMesh(valuePropsCircle, "Value Propositions");
    }

    // Create circular label for Value Propositions
    const valuePropLabelTexture = new Texture('/textures/Label_ValueProposition.png', scene);
    valuePropLabelTexture.hasAlpha = true;

    const valuePropLabelMaterial = new StandardMaterial("valuePropLabelMaterial", scene);
    valuePropLabelMaterial.diffuseTexture = valuePropLabelTexture;
    valuePropLabelMaterial.emissiveTexture = valuePropLabelTexture;
    valuePropLabelMaterial.emissiveColor = new Color3(0.9, 0.9, 0.9);
    valuePropLabelMaterial.alpha = 1.0;
    valuePropLabelMaterial.backFaceCulling = false;

    const valuePropLabelPlane = MeshBuilder.CreatePlane("valuePropLabel", {
      width: 3,
      height: 1.2
    }, scene);
    valuePropLabelPlane.material = valuePropLabelMaterial;
    valuePropLabelPlane.position = new Vector3(0, 1.01, 0);
    valuePropLabelPlane.rotation.x = -Math.PI / 2;
    valuePropLabelPlane.isPickable = false;
    valuePropLabelPlane.renderingGroupId = 1;
    valuePropLabelPlane.setParent(valuePropsCircle);

    // Fourth column, top - Customer Relationships
    createBMCSection(
      "Customer Relationships",
      new Vector3(2.5, 0.25, -1.5),
      new Vector3(3, 0.5, 3),
      new Color3(0.15, 0.15, 0.15),
      '/textures/Label_CustomerRelationships.png'
    );

    // Fourth column, bottom - Customer Channels
    createBMCSection(
      "Customer Channels",
      new Vector3(2.5, 0.25, 1.5),
      new Vector3(3, 0.5, 3), 
      new Color3(0.15, 0.15, 0.15),
      '/textures/Label_CustomerChannels.png'
    );

    // Right column - Customer Segments (tall)
    createBMCSection(
      "Customer Segments",
      new Vector3(6, 0.25, 0),
      new Vector3(3, 0.5, 6),
      new Color3(0.15, 0.15, 0.15),
      '/textures/Label_CustomerSegments.png'
    );

    // Bottom row - Cost Structure (RED)
    createBMCSection(
      "Cost Structure",
      new Vector3(-3, 0.25, 4),
      new Vector3(6, 0.5, 2),
      new Color3(0.6, 0.1, 0.1), // Red color matching reference
      '/textures/Label_CostStructure_1754477996199.png'
    );

    // Bottom row - Revenue Streams (GREEN)  
    createBMCSection(
      "Revenue Streams",
      new Vector3(3, 0.25, 4),
      new Vector3(6, 0.5, 2),
      new Color3(0.1, 0.5, 0.3), // Green color matching reference
      '/textures/Label_RevenueStreams.png'
    );

    console.log('✅ BMC layout created matching reference screenshot');

    // Background click handler
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

  // Handle camera switching
  useEffect(() => {
    if (sceneRef.current && cameraRef.current && orthoCameraRef.current && interactionManagerRef.current) {
      const scene = sceneRef.current;
      const perspectiveCamera = cameraRef.current;
      const orthoCamera = orthoCameraRef.current;

      if (isOrthographic) {
        saveCamera3DState(
          perspectiveCamera.alpha,
          perspectiveCamera.beta,
          perspectiveCamera.radius
        );

        scene.activeCamera = orthoCamera;
        interactionManagerRef.current.setTopViewMode(true);
        console.log('📷 Enterprise: Switched to 3D Top View');
      } else {
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