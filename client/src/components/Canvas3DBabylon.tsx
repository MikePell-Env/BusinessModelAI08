import React, { useRef, useEffect, useState } from 'react';
import {
  Engine,
  Scene,
  Vector3,
  PointerEventTypes,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  ActionManager,
  ExecuteCodeAction,
  ArcRotateCamera,
  FreeCamera,
  HemisphericLight,
  DirectionalLight,
  SceneLoader,
  AbstractMesh,
  DynamicTexture,
  Texture
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
import { BMCComponentName } from '@/types/bmcState';
import { CleanBMCSystem, cleanBMCSystem } from '@/lib/cleanBMCSystem';
import { BabylonAnimationManager } from '@/lib/babylon/BabylonAnimationManager';
import { BabylonMaterialManager } from '@/lib/babylon/BabylonMaterialManager';
import { CameraManager } from './babylon/CameraManager';
import { BMCModelLoader } from './babylon/BMCModelLoader';
import { SceneSetup } from './babylon/SceneSetup';

interface Canvas3DBabylonProps {
  canvas: BusinessModelCanvas;
  isTransitioning?: boolean;
}

export const Canvas3DBabylon: React.FC<Canvas3DBabylonProps> = ({ canvas, isTransitioning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const cameraManagerRef = useRef<CameraManager | null>(null);
  const animationManagerRef = useRef<BabylonAnimationManager | null>(null);
  const materialManagerRef = useRef<BabylonMaterialManager | null>(null);
  const bulletTextPlanesRef = useRef<Map<string, any>>(new Map());
  const [showBulletText, setShowBulletText] = useState(false);
  const bmcModelLoaderRef = useRef<BMCModelLoader | null>(null); // Added ref for BMCModelLoader

  const {
    saveCamera3DState,
    getCamera3DState,
    is3D,
    isOrthographic,
    setSelectedObject,
    getSelectedObject,
    setOriginalHeights,
    getOriginalHeights,
    selectBMCObject,
    getBMCSelectedObject,
    bmcState
  } = useCanvas();

  const cleanBMCRef = useRef(cleanBMCSystem);

  // Initialize BMC State Manager integration
  useEffect(() => {
    console.log("🔗 Injecting BMC State Manager into CleanBMCSystem...");
    cleanBMCRef.current.setBMCStateManager(bmcState);

    const currentSelection = bmcState.getSelectedObject();
    if (currentSelection) {
      console.log(`🔄 Syncing initial selection state: ${currentSelection}`);
      setTimeout(() => {
        if (cleanBMCRef.current) {
          cleanBMCRef.current.updateAllVisuals();
        }
      }, 100);
    }
  }, [bmcState]);

  // Helper functions for BMC component mapping
  const mapSectionNameToBMCComponent = (sectionName: string): BMCComponentName | null => {
    const nameMapping: { [key: string]: BMCComponentName } = {
      'Key Partners': 'KeyPartners',
      'Key Activities': 'KeyActivities',
      'Key Resources': 'KeyResources',
      'Value Propositions': 'ValueProposition',
      'Customer Relationships': 'CustomerRelationships',
      'CustomerChannels': 'CustomerChannels',
      'Customer Segments': 'CustomerSegments',
      'Cost Structure': 'CostStructure',
      'Revenue Streams': 'RevenueStreams'
    };
    return nameMapping[sectionName] || null;
  };

  // Event handlers
  const handleBMCObjectHoverEnter = (sectionName: string) => {
    cleanBMCRef.current.onHover(sectionName, true);
  };

  const handleBMCObjectHoverExit = (sectionName: string) => {
    cleanBMCRef.current.onHover(sectionName, false);
  };

  // Billboard panel creation
  const createBillboardPanel = (sectionName: string, worldPosition: Vector3, advancedTexture: AdvancedDynamicTexture, scene: Scene) => {
    console.log(`🚀 Creating billboard panel for: ${sectionName}`);

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
      if (key && canvas[key]) {
        return canvas[key];
      }
      return null;
    };

    const sectionData = getSectionData(sectionName);
    if (!sectionData || typeof sectionData === 'string' || !sectionData.content || sectionData.content.length === 0) {
      console.log(`❌ No content available for ${sectionName}`);
      return null;
    }

    const bulletPoints = (sectionData as CanvasElement).content.map((item: string) => `• ${item}`).join('\n');
    const lineHeight = 18;
    const padding = 80;
    const averageCharsPerLine = 65;

    let totalLines = 0;
    (sectionData as CanvasElement).content.forEach((item: string) => {
      const bulletText = `• ${item}`;
      const linesForThisItem = Math.ceil(bulletText.length / averageCharsPerLine);
      totalLines += Math.max(1, linesForThisItem);
    });

    const calculatedHeight = padding + (totalLines * lineHeight) + 60;
    const maxHeight = Math.min(800, Math.max(450, calculatedHeight));

    const panel = new Rectangle();
    panel.widthInPixels = 600;
    panel.heightInPixels = Math.max(400, maxHeight);
    panel.cornerRadius = 12;
    panel.color = "#333333";
    panel.thickness = 2;
    panel.background = "white";
    panel.leftInPixels = 20;
    panel.topInPixels = -panel.heightInPixels / 2;

    const headerRect = new Rectangle();
    headerRect.widthInPixels = panel.widthInPixels - 4;
    headerRect.heightInPixels = 50;
    headerRect.topInPixels = -panel.heightInPixels / 2 + 27;
    headerRect.background = "#f8f9fa";
    headerRect.color = "#dee2e6";
    headerRect.thickness = 1;

    const titleText = new TextBlock();
    titleText.text = sectionName;
    titleText.color = "#333333";
    const titleDevicePixelRatio = window.devicePixelRatio || 1;
    const baseTitleSize = 18;
    titleText.fontSize = Math.round(baseTitleSize * Math.min(titleDevicePixelRatio, 2));
    titleText.fontWeight = "bold";
    headerRect.addControl(titleText);

    const closeButton = new TextBlock();
    closeButton.text = "X";
    closeButton.color = "#666666";
    closeButton.fontSize = 16;
    closeButton.fontWeight = "bold";
    closeButton.widthInPixels = 20;
    closeButton.heightInPixels = 20;
    closeButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    closeButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    closeButton.leftInPixels = -10;
    closeButton.topInPixels = 5;
    closeButton.isPointerBlocker = true;

    const contentText = new TextBlock();
    contentText.text = bulletPoints;
    contentText.color = "#333333";
    const contentDevicePixelRatio = window.devicePixelRatio || 1;
    const baseFontSize = 14;
    contentText.fontSize = Math.round(baseFontSize * Math.min(contentDevicePixelRatio, 2));
    contentText.lineSpacing = 6;
    contentText.textWrapping = true;
    contentText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    contentText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    contentText.paddingLeft = "20px";
    contentText.paddingRight = "20px";
    contentText.paddingTop = "60px";
    contentText.paddingBottom = "30px";
    contentText.heightInPixels = maxHeight - 20;
    contentText.topInPixels = 25;

    panel.addControl(headerRect);
    panel.addControl(closeButton);
    panel.addControl(contentText);
    panel.isPointerBlocker = true;

    const billboardTransform = new TransformNode("billboardTransform", scene);
    billboardTransform.position = worldPosition.clone();
    billboardTransform.position.y += 1;

    panel.linkWithMesh(billboardTransform);
    panel.linkOffsetY = -30;

    closeButton.onPointerClickObservable.add(() => {
      advancedTexture.removeControl(panel);
      if (cleanBMCRef.current) {
        cleanBMCRef.current.clearSelection();
      }
    });

    advancedTexture.addControl(panel);
    return panel;
  };

  // Toggle bullet text display
  const toggleBulletText = () => {
    const newState = !showBulletText;
    setShowBulletText(newState);

    if (newState) {
      const scene = sceneRef.current;
      if (scene) {
        const valuePropMesh = cleanBMCRef.current.getMesh('Value Propositions');
        if (valuePropMesh) {
          // Placeholder for actual bullet text plane creation logic
        }
      }
    } else {
      bulletTextPlanesRef.current.forEach((plane, name) => {
        plane.dispose();
      });
      bulletTextPlanesRef.current.clear();
    }
  };

  // Main initialization effect
  useEffect(() => {
    if (!canvasRef.current || !canvas) return;

    // Prevent multiple initializations
    if (engineRef.current || sceneRef.current) {
      console.log('🔄 Babylon.js already initialized, skipping...');
      return;
    }

    console.log('🔍 Initializing Babylon.js Canvas3D...');

    // WebGL support check
    const canvasElement = canvasRef.current;
    const gl = canvasElement.getContext('webgl') || canvasElement.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL is not supported in this browser');
      return;
    }

    let engine: Engine | null = null;
    let scene: Scene | null = null;

    try {
      engine = new Engine(canvasElement, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
        adaptToDeviceRatio: true,
        powerPreference: "high-performance"
      }, true);

      if (!engine) {
        throw new Error('Engine creation returned null');
      }

      scene = new Scene(engine);
      if (!scene) {
        throw new Error('Scene creation returned null');
      }

      console.log("✅ Babylon.js engine and scene initialized successfully");
    } catch (error) {
      console.error('Failed to initialize Babylon.js engine:', error);
      return;
    }

    if (!engine || !scene) {
      console.error('❌ Engine or scene initialization failed');
      return;
    }

    engineRef.current = engine;
    sceneRef.current = scene;

    // Initialize scene setup
    const sceneSetup = new SceneSetup(scene);
    sceneSetup.setupEnvironment();

    // Initialize camera manager
    cameraManagerRef.current = new CameraManager(scene, canvasElement);

    // Set initial camera mode
    cameraManagerRef.current.setCameraMode(isOrthographic);

    // Restore camera state if available
    const savedCameraState = getCamera3DState();
    if (savedCameraState && !isOrthographic) {
      cameraManagerRef.current.restoreCameraState(
        savedCameraState.alpha,
        savedCameraState.beta,
        savedCameraState.radius
      );
    }

    // Initialize GUI
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    let currentBillboardPanel: any = null;

    // Background click handler
    scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        if (pointerInfo.pickInfo?.hit) {
          const hitMesh = pointerInfo.pickInfo.pickedMesh;
          const isBMCMesh = hitMesh && (
            hitMesh.name.includes('BMC_') ||
            hitMesh.name.includes('Revenue') ||
            hitMesh.name.includes('Cost')
          );

          if (!isBMCMesh && currentBillboardPanel) {
            advancedTexture.removeControl(currentBillboardPanel);
            currentBillboardPanel = null;
            cleanBMCRef.current.clearSelection();
          }
        } else if (currentBillboardPanel) {
          advancedTexture.removeControl(currentBillboardPanel);
          currentBillboardPanel = null;
          cleanBMCRef.current.clearSelection();
        }
      }
    });

    // Initialize BMC Model Loader
    const bmcModelLoader = new BMCModelLoader(scene, bmcState);
    bmcModelLoaderRef.current = bmcModelLoader; // Store reference to BMCModelLoader

    // Load and setup BMC models
    const initializeModels = async () => {
      try {
        console.log("🔄 Loading BMC models...");

        // Load main BMC model
        const mainBMCMeshes = await bmcModelLoader.loadMainBMC();

        // Load revenue streams and cost structure
        const revenueStreamsMeshes = await bmcModelLoader.loadRevenueStreams();
        const costStructureMeshes = await bmcModelLoader.loadCostStructure();

        // Setup interactions
        bmcModelLoader.setupMainBMCInteractions(mainBMCMeshes, advancedTexture, createBillboardPanel);
        bmcModelLoader.setupRevenueStreamsInteractions(revenueStreamsMeshes, advancedTexture, createBillboardPanel);
        bmcModelLoader.setupCostStructureInteractions(costStructureMeshes, advancedTexture, createBillboardPanel);

        // Apply animations
        bmcModelLoader.applyAnimations([...mainBMCMeshes, ...revenueStreamsMeshes, ...costStructureMeshes]);

        console.log("✅ BMC models loaded and configured");
      } catch (error) {
        console.error("❌ Error loading BMC models:", error);
      }
    };

    initializeModels();

    // Initialize Animation and Material Managers
    animationManagerRef.current = new BabylonAnimationManager(scene);
    materialManagerRef.current = new BabylonMaterialManager(scene);

    // Save original heights
    const saveOriginalHeights = () => {
      const existingHeights = getOriginalHeights();
      if (Object.keys(existingHeights).length > 0) {
        return true;
      }

      if (scene && scene.meshes) {
        const originalHeights: { [sectionName: string]: number } = {};

        scene.meshes.forEach((mesh) => {
          const sectionName = (mesh as any).bmcSectionName;
          const transformNode = (mesh as any).bmcTransformNode;

          if (sectionName && transformNode) {
            const height = transformNode.scaling.y;
            originalHeights[sectionName] = height;

            const bmcComponent = mapSectionNameToBMCComponent(sectionName);
            if (bmcComponent) {
              bmcState.updateTransformState(bmcComponent, {
                originalHeight: height,
                currentHeight: height,
                position: mesh.position.clone(),
                scaling: mesh.scaling.clone()
              });
            }
          }
        });

        setOriginalHeights(originalHeights);
        return true;
      }

      return false;
    };

    // Try to save heights with retries
    setTimeout(() => {
      if (!saveOriginalHeights()) {
        setTimeout(() => {
          if (!saveOriginalHeights()) {
            setTimeout(() => saveOriginalHeights(), 1000);
          }
        }, 500);
      }
    }, 1000);

    // Start render loop
    let isDisposed = false;
    engine.runRenderLoop(() => {
      if (!isDisposed && scene && !scene.isDisposed) {
        scene.render();
      }
    });

    // Cleanup function
    return () => {
      isDisposed = true;

      try {
        if (currentBillboardPanel && advancedTexture) {
          advancedTexture.removeControl(currentBillboardPanel);
        }

        if (cameraManagerRef.current) {
          cameraManagerRef.current.dispose();
        }

        if (scene && !scene.isDisposed) {
          scene.dispose();
        }
        if (engine && !engine.isDisposed) {
          engine.dispose();
        }
        sceneRef.current = null;
        engineRef.current = null;
        cameraManagerRef.current = null;
      } catch (e) {
        console.warn('Error during Babylon.js cleanup:', e);
      }
    };
  }, [canvas, saveCamera3DState, isOrthographic, bmcState]);

  // Handle camera switching
  useEffect(() => {
    if (cameraManagerRef.current) {
      cameraManagerRef.current.setCameraMode(isOrthographic);

      if (!isOrthographic) {
        const cameras = cameraManagerRef.current.getCameras();
        if (cameras.perspective) {
          const savedState = getCamera3DState();
          if (savedState) {
            cameras.perspective.alpha = savedState.alpha;
            cameras.perspective.beta = savedState.beta;
            cameras.perspective.radius = savedState.radius;
          }
        }
      } else {
        // For orthographic (3D Top) view, ensure camera is positioned correctly
        const cameras = cameraManagerRef.current.getCameras();
        if (cameras.orthographic) {
          // Corrected camera position and target
          cameras.orthographic.position = new Vector3(0, 20, 0); // Example: adjust as needed
          cameras.orthographic.setTarget(Vector3.Zero()); // Point camera at the center

          // Apply orthographic camera specific settings if needed
          // cameras.orthographic.orthoLeft = -10;
          // cameras.orthographic.orthoRight = 10;
          // cameras.orthographic.orthoBottom = -10;
          // cameras.orthographic.orthoTop = 10;
        }
        // Apply 180 Y-axis rotation for orthographic view if the loader supports it
        if (bmcModelLoaderRef.current) {
          bmcModelLoaderRef.current.handleCameraModeChange(true);
        }
      }

      setTimeout(() => {
        if (cleanBMCRef.current) {
          cleanBMCRef.current.updateAllVisuals();
        }
      }, 150);
    }
  }, [isOrthographic]);

  // Handle restoration when entering 3D mode
  useEffect(() => {
    if (is3D && sceneRef.current) {
      setTimeout(() => {
        if (cleanBMCRef.current) {
          cleanBMCRef.current.updateAllVisuals();
        }
      }, 100);
    }
  }, [is3D]);

  // Expose toggle function for testing
  useEffect(() => {
    (window as any).toggleBulletText = toggleBulletText;
    return () => {
      delete (window as any).toggleBulletText;
    };
  }, [showBulletText]);

  // Expose animation demo functions
  useEffect(() => {
    (window as any).bmcAnimationDemo = {
      runColorSequence: async () => {
        if (animationManagerRef.current) {
          await animationManagerRef.current.createColorSequence([
            { section: "Value Propositions", color: "#00ff00", duration: 2000 },
            { section: "Customer Segments", color: "#0066ff", duration: 1500 },
            { section: "Key Partners", color: "#ff6600", duration: 1800 },
            { section: "Revenue Streams", color: "#ffff00", duration: 1200 },
            { section: "Cost Structure", color: "#ff0066", duration: 1500 }
          ]);
        }
      },
      applyBusinessThemes: () => {
        if (animationManagerRef.current) {
          animationManagerRef.current.applyBusinessTheme("Value Propositions", "high");
          animationManagerRef.current.applyBusinessTheme("Customer Segments", "medium");
          animationManagerRef.current.applyBusinessTheme("Key Partners", "low");
          animationManagerRef.current.applyBusinessTheme("Revenue Streams", "revenue");
          animationManagerRef.current.applyBusinessTheme("Cost Structure", "cost");
        }
      }
    };
  }, []);

  return (
    <div className={`w-full h-full ${isTransitioning ? 'opacity-50' : ''} relative`}>
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-xl font-medium text-gray-900" style={{ fontFamily: 'Segoe UI, sans-serif' }}>{canvas.name}</h1>
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