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
import { 
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Control
} from '@babylonjs/gui';
import '@babylonjs/loaders/glTF';
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

    // Create camera with angled perspective matching the user's preferred viewpoint
    const savedCameraState = getCamera3DState();
    const camera = new ArcRotateCamera(
      "camera",
      savedCameraState?.alpha ?? -Math.PI / 2.5,  // Alpha - more angled from the side for better perspective
      savedCameraState?.beta ?? Math.PI / 6,      // Beta - high angle for top-down perspective
      savedCameraState?.radius ?? 25,             // Radius - further back to see entire BMC layout clearly
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

    // Create GUI for 3D billboard labels
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    

    

    




    // Only GLB models are used now - no more box geometry functions needed

    // All BMC elements are now loaded as GLB models - circular layout matching top view

    // Define BMC section colors and names matching traditional business model canvas
    const bmcSections = [
      { color: new Color3(0.3, 0.6, 0.9), name: "Value Propositions" },      // Blue
      { color: new Color3(0.4, 0.8, 0.4), name: "Key Partners" },           // Green  
      { color: new Color3(0.9, 0.6, 0.3), name: "Key Activities" },         // Orange
      { color: new Color3(0.9, 0.3, 0.3), name: "Key Resources" },          // Red
      { color: new Color3(0.9, 0.9, 0.3), name: "Customer Relationships" }, // Yellow
      { color: new Color3(0.6, 0.9, 0.9), name: "Channels" },               // Cyan
      { color: new Color3(0.8, 0.4, 0.9), name: "Customer Segments" },      // Purple
      { color: new Color3(0.7, 0.7, 0.7), name: "Cost Structure" },         // Gray
      { color: new Color3(0.5, 0.9, 0.5), name: "Revenue Streams" },        // Light Green
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
        
        // Apply different colors, interactivity, and labels to each BMC section mesh
        let sectionIndex = 0;
        result.meshes.forEach((mesh, index) => {
          if (mesh.material && mesh.name !== "__root__") {
            const section = bmcSections[sectionIndex % bmcSections.length];
            const baseColor = section.color;
            const sectionName = section.name;
            
            // Create new plastic material with unique color for each section
            const sectionMaterial = new StandardMaterial(`bmcSection_${index}`, scene);
            sectionMaterial.diffuseColor = baseColor;
            sectionMaterial.specularColor = new Color3(0.1, 0.1, 0.1); // Low specular for plastic look
            sectionMaterial.specularPower = 32; // Medium shine
            
            mesh.material = sectionMaterial;
            mesh.receiveShadows = true;
            
            // Store original color for hover/click effects
            (mesh as any).originalColor = baseColor.clone();
            (mesh as any).isClicked = false;
            
            // Create billboard label above this mesh
            const labelContainer = new Rectangle(`label_${index}`);
            labelContainer.widthInPixels = 200;
            labelContainer.heightInPixels = 40;
            labelContainer.cornerRadius = 8;
            labelContainer.color = "white";
            labelContainer.thickness = 2;
            labelContainer.background = "rgba(0, 0, 0, 0.7)";
            
            const labelText = new TextBlock(`labelText_${index}`, sectionName);
            labelText.color = "white";
            labelText.fontSize = "14px";
            labelText.fontFamily = "Arial, sans-serif";
            labelText.fontWeight = "bold";
            
            labelContainer.addControl(labelText);
            advancedTexture.addControl(labelContainer);
            
            // Position label above mesh center with billboard behavior
            const meshBounds = mesh.getBoundingInfo();
            const meshCenter = meshBounds.boundingBox.centerWorld;
            const labelHeight = 2.0; // Height above mesh in world units
            const labelPosition = new Vector3(meshCenter.x, meshCenter.y + labelHeight, meshCenter.z);
            
            // Link label to 3D position with billboard behavior
            labelContainer.linkWithMesh(mesh);
            labelContainer.linkOffsetY = `-${labelHeight * 50}px`; // Convert world units to approximate pixels
            
            // Create connecting line from label to shape top
            const meshTop = meshBounds.boundingBox.maximumWorld.y;
            const linePoints = [
              new Vector3(meshCenter.x, meshCenter.y + labelHeight - 0.8, meshCenter.z), // Bottom of label area
              new Vector3(meshCenter.x, meshTop + 0.2, meshCenter.z)  // Top of mesh
            ];
            
            // Create a thicker tube line instead of thin line for better visibility
            const connectingLine = MeshBuilder.CreateTube(`line_${index}`, {
              path: linePoints,
              radius: 0.02, // Small radius for thin line appearance
              tessellation: 8
            }, scene);
            
            // Make line material black and always visible
            const lineMaterial = new StandardMaterial(`lineMaterial_${index}`, scene);
            lineMaterial.diffuseColor = new Color3(0, 0, 0); // Black
            lineMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1); // Slight emissive for visibility
            connectingLine.material = lineMaterial;
            connectingLine.visibility = 0; // Initially invisible
            
            console.log(`🔗 Created connecting line for ${sectionName} from Y:${(meshCenter.y + labelHeight - 0.8).toFixed(2)} to Y:${(meshTop + 0.2).toFixed(2)}`);
            
            // Store references for hover effects
            (mesh as any).labelContainer = labelContainer;
            (mesh as any).connectingLine = connectingLine;
            
            // Enable pointer events for this mesh
            mesh.actionManager = new ActionManager(scene);
            
            // Hover enter - brighten color, show label and line
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              if (!(mesh as any).isClicked) {
                const brightenedColor = baseColor.scale(1.3); // 30% brighter
                sectionMaterial.diffuseColor = brightenedColor;
                
                // Make label bright blue background
                const labelContainer = (mesh as any).labelContainer;
                if (labelContainer) {
                  labelContainer.background = "rgba(0, 100, 255, 1.0)"; // Bright blue
                }
                
                // Show connecting line
                const connectingLine = (mesh as any).connectingLine;
                if (connectingLine) {
                  connectingLine.visibility = 1; // Make line visible
                  console.log(`📍 Line now visible for ${sectionName}: visibility=${connectingLine.visibility}`);
                } else {
                  console.log(`❌ No connecting line found for ${sectionName}`);
                }
                
                console.log(`💡 Hover enter: ${sectionName} brightened with bright blue label and black line`);
              }
            }));
            
            // Hover exit - restore original color, hide label effects and line
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              if (!(mesh as any).isClicked) {
                sectionMaterial.diffuseColor = (mesh as any).originalColor;
                
                // Restore label to semi-transparent
                const labelContainer = (mesh as any).labelContainer;
                if (labelContainer) {
                  labelContainer.background = "rgba(0, 0, 0, 0.7)"; // Semi-transparent
                }
                
                // Hide connecting line
                const connectingLine = (mesh as any).connectingLine;
                if (connectingLine) {
                  connectingLine.visibility = 0; // Hide line
                }
                
                console.log(`🔄 Hover exit: ${sectionName} restored with semi-transparent label and hidden line`);
              }
            }));
            
            // Click - darken color and toggle state
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              const isCurrentlyClicked = (mesh as any).isClicked;
              
              if (isCurrentlyClicked) {
                // Unclick - restore original color
                sectionMaterial.diffuseColor = (mesh as any).originalColor;
                (mesh as any).isClicked = false;
                console.log(`🔓 Click released: ${sectionName} restored`);
              } else {
                // Click - darken color
                const darkenedColor = baseColor.scale(0.7); // 30% darker
                sectionMaterial.diffuseColor = darkenedColor;
                (mesh as any).isClicked = true;
                console.log(`🔒 Clicked: ${sectionName} darkened`);
              }
            }));
            
            console.log(`🎨 Mesh ${index}: ${mesh.name || 'unnamed'} - ${sectionName} - Interactive color: ${baseColor.r.toFixed(2)}, ${baseColor.g.toFixed(2)}, ${baseColor.b.toFixed(2)}`);
            sectionIndex++;
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