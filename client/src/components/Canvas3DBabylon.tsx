import React, { useRef, useEffect } from 'react';
import { 
  Engine, 
  Scene, 
  ArcRotateCamera, 
  HemisphericLight, 
  DirectionalLight,
  PointLight,
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
  AbstractMesh,
  Matrix,
  TransformNode
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
// GUI imports removed since labels are no longer used
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
  
  // GUI state removed since labels are no longer used

  useEffect(() => {
    if (!canvasRef.current || !canvas) return;

    // Initialize Babylon.js engine and scene
    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);
    
    // Set background to match 2D view (#e9ecef - light gray)
    scene.clearColor = new Color3(0.914, 0.925, 0.937).toColor4();
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Create camera with perspective matching the user's desired angled view
    const savedCameraState = getCamera3DState();
    const camera = new ArcRotateCamera(
      "camera",
      savedCameraState?.alpha ?? -Math.PI / 3,    // Alpha - angled from left side for perspective view
      savedCameraState?.beta ?? Math.PI / 3.5,    // Beta - elevated angle to look down at the BMC model
      savedCameraState?.radius ?? 18,             // Radius - close enough to see details but show full model
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

    // Simple lighting setup for plastic materials
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.7;
    hemisphericLight.diffuse = new Color3(1, 1, 1);
    
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 0.8;
    directionalLight.diffuse = new Color3(1, 1, 1);

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
    
    // North rail (back) - extends full width including rail thickness for flush corners
    const northRail = MeshBuilder.CreateBox("northRail", {
      width: 20 + railWidth*2, // Ground width + rail thickness on both sides for flush corners
      height: railHeight,
      depth: railWidth
    }, scene);
    northRail.position = new Vector3(0, railHeight/2, -7 - railWidth/2); // 14/2 = 7
    northRail.material = railMaterial;
    
    // South rail (front) - extends full width including rail thickness for flush corners
    const southRail = MeshBuilder.CreateBox("southRail", {
      width: 20 + railWidth*2, // Ground width + rail thickness on both sides for flush corners
      height: railHeight,
      depth: railWidth
    }, scene);
    southRail.position = new Vector3(0, railHeight/2, 7 + railWidth/2); // 14/2 = 7
    southRail.material = railMaterial;
    
    // East rail (right) - only spans ground depth (not including rail thickness to avoid overlap)
    const eastRail = MeshBuilder.CreateBox("eastRail", {
      width: railWidth,
      height: railHeight,
      depth: 14 // Only ground depth, no extension needed
    }, scene);
    eastRail.position = new Vector3(10 + railWidth/2, railHeight/2, 0); // 20/2 = 10
    eastRail.material = railMaterial;
    
    // West rail (left) - only spans ground depth (not including rail thickness to avoid overlap)
    const westRail = MeshBuilder.CreateBox("westRail", {
      width: railWidth,
      height: railHeight,
      depth: 14 // Only ground depth, no extension needed
    }, scene);
    westRail.position = new Vector3(-10 - railWidth/2, railHeight/2, 0); // 20/2 = 10
    westRail.material = railMaterial;


    


    // Add default environment for proper PBR reflections
    if (scene.environmentTexture) {
      scene.createDefaultSkybox(scene.environmentTexture, true, 100, 0.3);
    }

    // GUI setup removed since labels are no longer used
    

    

    




    // Only GLB models are used now - no more box geometry functions needed

    // All BMC elements are now loaded as GLB models - circular layout matching top view

    // Define BMC section colors matching traditional business model canvas
    const bmcColors = [
      new Color3(0.3, 0.6, 0.9),   // Blue - Value Propositions
      new Color3(0.4, 0.8, 0.4),   // Green - Key Partners  
      new Color3(0.9, 0.6, 0.3),   // Orange - Key Activities
      new Color3(0.9, 0.3, 0.3),   // Red - Key Resources
      new Color3(0.9, 0.9, 0.3),   // Yellow - Customer Relationships
      new Color3(0.6, 0.9, 0.9),   // Cyan - Channels
      new Color3(0.8, 0.4, 0.9),   // Purple - Customer Segments
      new Color3(0.7, 0.7, 0.7),   // Gray - Cost Structure
      new Color3(0.5, 0.9, 0.5),   // Light Green - Revenue Streams
    ];

    // Load complete BMC GLB model with individual section coloring
    SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_09_complete_1753576063858.glb", scene).then((result) => {
      if (result.meshes.length > 0) {
        console.log(`✅ BMC model loaded with ${result.meshes.length} meshes`);
        
        const rootMesh = result.meshes[0];
        
        // Position at center of ground plane, slightly above surface
        rootMesh.position = new Vector3(0, 0.1, 0);
        rootMesh.rotation = Vector3.Zero();
        
        // Start with visible scale
        rootMesh.scaling = new Vector3(8, 8, 8);
        
        console.log(`📦 BMC model positioned at origin with scale 8.0`);
        
        // Apply different colors to each BMC section mesh
        let colorIndex = 0;
        result.meshes.forEach((mesh, index) => {
          if (mesh.material && mesh.name !== "__root__") {
            // Create new plastic material with unique color for each section
            const sectionMaterial = new StandardMaterial(`bmcSection_${index}`, scene);
            const sectionColor = bmcColors[colorIndex % bmcColors.length];
            
            sectionMaterial.diffuseColor = sectionColor;
            sectionMaterial.specularColor = new Color3(0.1, 0.1, 0.1); // Low specular for plastic look
            sectionMaterial.specularPower = 32; // Medium shine
            
            mesh.material = sectionMaterial;
            mesh.receiveShadows = true;
            
            console.log(`🎨 Mesh ${index}: ${mesh.name || 'unnamed'} - Color: ${sectionColor.r.toFixed(2)}, ${sectionColor.g.toFixed(2)}, ${sectionColor.b.toFixed(2)}`);
            colorIndex++;
          }
        });
        
      } else {
        console.error("❌ No meshes found in BMC model");
      }
    }).catch((error) => {
      console.error("❌ Failed to load BMC model:", error);
    });

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
    <div className={`w-full h-full ${isTransitioning ? 'opacity-50' : ''} relative`}>
      {/* Header - exact match to 2D view */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{canvas.name}</h1>
        <p className="text-gray-600">{canvas.description}</p>
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