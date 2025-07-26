import React, { useRef, useEffect } from 'react';
import { 
  Engine, 
  Scene, 
  ArcRotateCamera, 
  HemisphericLight, 
  DirectionalLight,
  MeshBuilder, 
  PBRMetallicRoughnessMaterial, 
  StandardMaterial,
  Color3, 
  Vector3, 
  Mesh, 
  ActionManager, 
  ExecuteCodeAction,
  CubeTexture,
  Texture,
  DynamicTexture,
  SceneLoader,
  AbstractMesh
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { AdvancedDynamicTexture, Rectangle, TextBlock, Control } from '@babylonjs/gui';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';
import { useCanvas } from '@/lib/stores/useCanvas';

interface Canvas3DBabylonProps {
  canvas: BusinessModelCanvas;
  isTransitioning?: boolean;
}

export const Canvas3DBabylon: React.FC<Canvas3DBabylonProps> = ({ canvas, isTransitioning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const { saveCamera3DState, getCamera3DState, is3D } = useCanvas();

  useEffect(() => {
    if (!canvasRef.current || !canvas) return;

    // Initialize Babylon.js engine and scene
    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);
    
    // Set background to match 2D view (#e9ecef - light gray)
    scene.clearColor = new Color3(0.914, 0.925, 0.937).toColor4();
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Create camera with perspective matching the screenshot or restore saved state
    const savedCameraState = getCamera3DState();
    const camera = new ArcRotateCamera(
      "camera",
      savedCameraState?.alpha ?? -Math.PI / 6,    // Alpha - more frontal angle for better view of the layout
      savedCameraState?.beta ?? Math.PI / 4,      // Beta - lower angle for the perspective shown in screenshot
      savedCameraState?.radius ?? 20,             // Radius - further back to see the full canvas layout
      Vector3.Zero(),  // Target position
      scene
    );
    camera.setTarget(Vector3.Zero());
    cameraRef.current = camera;
    
    // Enable camera controls on the canvas
    camera.attachControl(canvasRef.current, true);
    
    // Reduce mouse wheel sensitivity for smoother zooming
    camera.wheelPrecision = 50;        // Default is 3, higher values = less sensitive
    
    // Set camera limits for grid layout navigation (original working values)
    camera.lowerRadiusLimit = 5;      // Minimum zoom distance
    camera.upperRadiusLimit = 25;     // Maximum zoom distance
    camera.lowerBetaLimit = 0.1;      // Prevent camera from going below ground
    camera.upperBetaLimit = Math.PI / 2.2; // Prevent camera from flipping over

    // Enhanced lighting setup
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.6;
    
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 0.8;

    // Create ground with grey plastic material and light grey gridlines
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    
    // Create dynamic texture for light grey grid pattern on grey plastic
    const gridTexture = new DynamicTexture("gridTexture", {width: 1024, height: 1024}, scene, false);
    const gridContext = gridTexture.getContext();
    
    // Fill with light grey plastic background
    gridContext.fillStyle = "#cccccc"; // Light grey background (0.8 * 255 = 204)
    gridContext.fillRect(0, 0, 1024, 1024);
    
    // Draw light grey grid lines
    gridContext.strokeStyle = "#b8b8b8"; // Slightly darker grey for grid lines
    gridContext.lineWidth = 1;
    
    // Draw vertical lines (spacing every 32 pixels)
    for (let i = 0; i <= 1024; i += 32) {
      gridContext.beginPath();
      gridContext.moveTo(i, 0);
      gridContext.lineTo(i, 1024);
      gridContext.stroke();
    }
    
    // Draw horizontal lines (spacing every 32 pixels)
    for (let i = 0; i <= 1024; i += 32) {
      gridContext.beginPath();
      gridContext.moveTo(0, i);
      gridContext.lineTo(1024, i);
      gridContext.stroke();
    }
    
    gridTexture.update();
    
    // Apply grey plastic material with grid texture to ground
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseTexture = gridTexture;
    groundMaterial.specularColor = new Color3(0.15, 0.15, 0.15); // Reduced specular reflection for lighter plastic look
    groundMaterial.specularPower = 64; // Higher value for sharper reflections
    ground.material = groundMaterial;

    // Create extruded border rails on all sides
    const railHeight = 0.3;
    const railWidth = 0.2;
    const railColor = new Color3(0.5, 0.5, 0.5); // Medium grey rail color
    
    // Create rail material
    const railMaterial = new StandardMaterial("railMaterial", scene);
    railMaterial.diffuseColor = railColor;
    railMaterial.specularColor = new Color3(0, 0, 0);
    
    // North rail (back)
    const northRail = MeshBuilder.CreateBox("northRail", {
      width: 20.4, // Slightly wider to cover corners
      height: railHeight,
      depth: railWidth
    }, scene);
    northRail.position = new Vector3(0, railHeight/2, -7 - railWidth/2);
    northRail.material = railMaterial;
    
    // South rail (front)
    const southRail = MeshBuilder.CreateBox("southRail", {
      width: 20.4,
      height: railHeight,
      depth: railWidth
    }, scene);
    southRail.position = new Vector3(0, railHeight/2, 7 + railWidth/2);
    southRail.material = railMaterial;
    
    // East rail (right)
    const eastRail = MeshBuilder.CreateBox("eastRail", {
      width: railWidth,
      height: railHeight,
      depth: 14
    }, scene);
    eastRail.position = new Vector3(10 + railWidth/2, railHeight/2, 0);
    eastRail.material = railMaterial;
    
    // West rail (left)
    const westRail = MeshBuilder.CreateBox("westRail", {
      width: railWidth,
      height: railHeight,
      depth: 14
    }, scene);
    westRail.position = new Vector3(-10 - railWidth/2, railHeight/2, 0);
    westRail.material = railMaterial;

    // Add default environment for proper PBR reflections
    if (scene.environmentTexture) {
      scene.createDefaultSkybox(scene.environmentTexture, true, 100, 0.3);
    }

    // Create GUI
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    
    // Store reference to currently visible popup
    let currentPopup: Rectangle | null = null;



    // Only GLB models are used now - no more box geometry functions needed

    // All BMC elements are now loaded as GLB models - circular layout matching top view

    // GLB Model Loading Function
    const loadGLBModel = (filename: string, element: CanvasElement, position: Vector3, elementName: string) => {
      SceneLoader.ImportMeshAsync("", "/models/", filename, scene).then((result) => {
        if (result.meshes.length > 0) {
          const rootMesh = result.meshes[0];
          rootMesh.position = position;
          rootMesh.scaling = new Vector3(8, 8, 8); // Much larger scale to occupy 60% of floor plane
          
          // Add basic interactivity
          rootMesh.actionManager = new ActionManager(scene);
          rootMesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            console.log(`${elementName} GLB clicked!`);
          }));
          
          // Create title label for GLB model
          const titleLabel = new Rectangle(`title_label_${elementName.toLowerCase().replace(' ', '_')}_glb`);
          titleLabel.widthInPixels = 180;
          titleLabel.heightInPixels = 40;
          titleLabel.cornerRadius = 8;
          titleLabel.color = "transparent";
          titleLabel.thickness = 0;
          titleLabel.background = "rgba(255, 255, 255, 0.9)";
          advancedTexture.addControl(titleLabel);

          const titleText = new TextBlock(`title_${elementName.toLowerCase().replace(' ', '_')}_glb`, element.title);
          titleText.color = "#2D3748";
          titleText.fontSize = 16;
          titleText.fontWeight = "bold";
          titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
          titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
          titleLabel.addControl(titleText);

          titleLabel.linkWithMesh(rootMesh);
          titleLabel.linkOffsetY = -120; // Adjust label position for larger models
        }
      }).catch((error) => {
        console.error(`Failed to load ${elementName} GLB model:`, error);
      });
    };

    // Load GLB models using ORIGINAL WORKING positions that matched the PNG layout
    // Center: Value Proposition
    loadGLBModel("BMC_blender_05_ValueProposition.glb", canvas.valuePropositions, new Vector3(0, 0.5, 0), "Value Proposition");
    
    // Restore original grid positions that were working correctly:
    loadGLBModel("BMC_blender_05_KeyPartners.glb", canvas.keyPartners, new Vector3(-4, 0.5, 0), "Key Partners");               // Left side
    loadGLBModel("BMC_blender_05_KeyActivities.glb", canvas.keyActivities, new Vector3(-2, 0.5, 1), "Key Activities");        // Top-left  
    loadGLBModel("BMC_blender_05_KeyResources.glb", canvas.keyResources, new Vector3(-2, 0.5, -1), "Key Resources");         // Bottom-left
    loadGLBModel("BMC_blender_05_CustomerRelationships.glb", canvas.customerRelationships, new Vector3(2, 0.5, 1), "Customer Relationships"); // Top-right
    loadGLBModel("BMC_blender_05_CustomerChannels.glb", canvas.channels, new Vector3(2, 0.5, -1), "Customer Channels");     // Bottom-right  
    loadGLBModel("BMC_blender_05_CustomerSegments.glb", canvas.customerSegments, new Vector3(4, 0.5, 0), "Customer Segments"); // Right side

    // Start the render loop
    engine.runRenderLoop(() => {
      if (scene) {
        scene.render();
      }
    });

    // Clean up on unmount
    return () => {
      // Save camera state before disposing
      if (cameraRef.current) {
        saveCamera3DState(
          cameraRef.current.alpha,
          cameraRef.current.beta,
          cameraRef.current.radius
        );
      }
      
      if (engineRef.current) {
        engineRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.dispose();
      }
    };
  }, [canvas, saveCamera3DState]);

  // Save camera state when switching away from 3D view
  useEffect(() => {
    return () => {
      if (cameraRef.current && !is3D) {
        saveCamera3DState(
          cameraRef.current.alpha,
          cameraRef.current.beta,
          cameraRef.current.radius
        );
      }
    };
  }, [is3D, saveCamera3DState]);

  return (
    <div className={`w-full h-full ${isTransitioning ? 'opacity-50' : ''}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ outline: 'none' }}
      />
    </div>
  );
};

export default Canvas3DBabylon;