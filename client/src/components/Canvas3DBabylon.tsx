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

    // GUI setup removed since labels are no longer used
    

    

    




    // Only GLB models are used now - no more box geometry functions needed

    // All BMC elements are now loaded as GLB models - circular layout matching top view

    // Store selected mesh reference
    let selectedMesh: AbstractMesh | null = null;

    // Create single master transform node for ALL BMC objects (matching your template positioning)
    const bmcMasterTransform = new TransformNode("bmcMasterGroup", scene);
    // Fix coordinate system: rotate Y-axis to flip left/right and translate up
    bmcMasterTransform.rotation.y = Math.PI; // 180 degree Y rotation to flip left-right positioning
    bmcMasterTransform.position.y = 4.0; // Translate entire group up to be above ground plane
    
    // FINAL unified GLB loading function - all objects use this and parent to master transform
    const loadGLBModel = (fileName: string, content: string, position: Vector3, elementName: string, scale: number, color: Color3) => {
      SceneLoader.ImportMeshAsync("", "/models/", fileName, scene).then((result) => {
        if (result.meshes.length > 0) {
          const rootMesh = result.meshes[0];
          rootMesh.position = position;
          rootMesh.scaling = new Vector3(scale, scale, scale);
          rootMesh.parent = bmcMasterTransform; // ALL objects parented to single master transform
          
          // Apply plastic materials and interactions to all meshes
          result.meshes.forEach((mesh) => {
            // Create new PBR material with plastic appearance (not metallic)
            const plasticMaterial = new PBRMetallicRoughnessMaterial(`${elementName}_plastic`, scene);
            plasticMaterial.baseColor = color;
            plasticMaterial.metallic = 0.0; // Plastic = no metallic reflection
            plasticMaterial.roughness = 0.8; // Matte plastic finish
            mesh.material = plasticMaterial;
            
            mesh.actionManager = new ActionManager(scene);
            
            // Hover effect - subtle glow
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(0.2, 0.2, 0.2);
              }
            }));
            
            // Mouse out - remove glow
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(0, 0, 0);
              }
            }));
            
            // Click - bright blue selection
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              console.log(`Clicked on ${elementName}`);
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(0.3, 0.5, 1.0);
              }
            }));
          });
          
          console.log(`${elementName} loaded successfully with ${color.toString()} color`);
        }
      }).catch((error) => {
        console.error(`Failed to load ${elementName}: ${error}`);
      });
    };
    
    // Load ALL BMC objects with original positions - transform handled by master node:
    
    // Center: Value Proposition (BLUE circle)
    loadGLBModel("BMC_blender_06_ValueProposition.glb", canvas.valuePropositions.content || "", new Vector3(0, -2.0, 0), "Value Proposition", 45, new Color3(0, 0.4, 0.8));
    
    // Left: Key Partners (GREEN tall rectangle)
    loadGLBModel("BMC_blender_06_KeyPartners.glb", canvas.keyPartners.content || "", new Vector3(-3.5, -2.0, 0), "Key Partners", 50, new Color3(0, 0.7, 0));
    
    // Right: Customer Segments (PURPLE tall rectangle)  
    loadGLBModel("BMC_blender_06_CustomerSegments.glb", canvas.customerSegments.content || "", new Vector3(3.5, -2.0, 0), "Customer Segments", 50, new Color3(0.7, 0, 0.7));
    
    // Top-Left: Key Activities (ORANGE)
    loadGLBModel("BMC_blender_06_KeyActivities.glb", canvas.keyActivities.content || "", new Vector3(-1.2, -2.0, -1.5), "Key Activities", 40, new Color3(1, 0.5, 0));
    
    // Top-Right: Customer Relationships (YELLOW)
    loadGLBModel("BMC_blender_06_CustomerRelationships.glb", canvas.customerRelationships.content || "", new Vector3(1.2, -2.0, -1.5), "Customer Relationships", 40, new Color3(1, 0.8, 0));
    
    // Bottom-Left: Key Resources (RED)
    loadGLBModel("BMC_blender_06_KeyResources.glb", canvas.keyResources.content || "", new Vector3(-1.2, -2.0, 1.5), "Key Resources", 40, new Color3(1, 0, 0));
    
    // Bottom-Right: Customer Channels (CYAN)
    loadGLBModel("BMC_blender_06_CustomerChannels.glb", canvas.channels.content || "", new Vector3(1.2, -2.0, 1.5), "Customer Channels", 40, new Color3(0, 0.8, 0.8));

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