import React, { useRef, useEffect } from 'react';
import { 
  Engine, 
  Scene, 
  ArcRotateCamera,
  FreeCamera, 
  HemisphericLight, 
  DirectionalLight,
  PointLight,
  MeshBuilder, 
  PBRMetallicRoughnessMaterial, 
  StandardMaterial,
  Color3, 
  Color4,
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
  TransformNode,
  LinesMesh
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
  const orthoCameraRef = useRef<FreeCamera | null>(null);
  const rootMeshRef = useRef<AbstractMesh | null>(null);
  const { saveCamera3DState, getCamera3DState, is3D, isOrthographic, setSelectedObject, getSelectedObject, setOriginalHeights, getOriginalHeights } = useCanvas();
  
  // Store all content panels for closing functionality
  const contentPanelsRef = useRef<any[]>([]);
  
  // Store original heights for each BMC section
  const originalHeightsRef = useRef<{ [sectionName: string]: number }>({});
  

  
  // SIMPLIFIED: Single function to apply correct heights based on current selection state
  const applyHeightState = () => {
    const selectedObjectName = getSelectedObject();
    const storedHeights = getOriginalHeights();
    
    // Skip if heights not loaded yet
    if (Object.keys(storedHeights).length === 0) {
      console.log("📏 SKIP: No stored heights available yet");
      return;
    }
    
    console.log(`📏 APPLY: Selection="${selectedObjectName}", Available heights:`, Object.keys(storedHeights));
    
    contentPanelsRef.current.forEach(({ mesh }) => {
      const sectionName = (mesh as any).bmcSectionName;
      if (!sectionName) return;
      
      let targetHeight;
      if (!selectedObjectName) {
        // Rule: No selection = all objects at original height
        targetHeight = storedHeights[sectionName];
      } else if (sectionName === selectedObjectName) {
        // Rule: Selected object at original height
        targetHeight = storedHeights[sectionName];
      } else {
        // Rule: Non-selected objects flattened
        targetHeight = 0.1;
      }
      
      if (targetHeight !== undefined) {
        // Apply height directly to the mesh's transform node
        const transformNode = (mesh as any).bmcTransformNode;
        if (transformNode) {
          transformNode.scaling.y = targetHeight;
          console.log(`📏 ${sectionName}: ${targetHeight} (${!selectedObjectName ? 'no-selection' : sectionName === selectedObjectName ? 'selected' : 'flattened'})`);
        }
      }
    });
  };

  // SIMPLIFIED: Restore visual and interaction state after view switches
  const restoreSelectedObjectState = () => {
    const selectedObjectName = getSelectedObject();
    console.log(`🔄 VIEW SWITCH: Restoring state for selection="${selectedObjectName}"`);
    
    // Always apply height state first (handles both selected and no-selection cases)
    applyHeightState();
    
    if (!selectedObjectName) {
      // No selection: ensure all objects are at full opacity and original colors
      contentPanelsRef.current.forEach(({ mesh, material }) => {
        material.alpha = 1.0;
        (mesh as any).isClicked = false;
        
        if ((mesh as any).hasTexture) {
          material.emissiveColor = new Color3(0, 0, 0);
        } else {
          material.baseColor = (mesh as any).originalColor;
        }
      });
      console.log(`🔄 VIEW SWITCH: No selection - all objects restored to default state`);
      return;
    }
    
    // There is a selection: restore selected object's visual state
    contentPanelsRef.current.forEach(({ mesh, material }) => {
      const sectionName = (mesh as any).bmcSectionName;
      const isSelected = sectionName === selectedObjectName;
      
      if (isSelected) {
        // Restore selected object's blue color and full opacity
        const brightBlueColor = new Color3(0.0, 0.3, 0.8);
        if ((mesh as any).hasTexture) {
          material.emissiveColor = brightBlueColor.scale(0.3);
        } else {
          material.baseColor = brightBlueColor;
        }
        (mesh as any).isClicked = true;
        material.alpha = 1.0;
        
        // Show content panel
        const contentPanel = (mesh as any).contentPanel;
        const contentText = (mesh as any).contentText;
        if (contentPanel && contentText) {
          const sectionContent = getSectionContent(sectionName);
          contentText.text = sectionContent;
          contentPanel.isVisible = true;
        }
      } else {
        // Non-selected objects: original color, 50% opacity
        if ((mesh as any).hasTexture) {
          material.emissiveColor = new Color3(0, 0, 0);
        } else {
          material.baseColor = (mesh as any).originalColor;
        }
        (mesh as any).isClicked = false;
        material.alpha = 0.5;
      }
    });
    
    console.log(`🔄 VIEW SWITCH: Selection "${selectedObjectName}" restored with proper visual states`);
  };

  // Helper function to get section content from canvas data
  const getSectionContent = (sectionName: string): string => {
    const sectionMap: { [key: string]: string } = {
      "Value Propositions": "valuePropositions",
      "Key Partners": "keyPartners",
      "Key Activities": "keyActivities", 
      "Key Resources": "keyResources",
      "Customer Relationships": "customerRelationships",
      "Channels": "channels",
      "Customer Segments": "customerSegments",
      "Cost Structure": "costStructure",
      "Revenue Streams": "revenueStreams"
    };
    
    const sectionKey = sectionMap[sectionName];
    if (!sectionKey || !canvas[sectionKey as keyof typeof canvas]) {
      return `No content available for ${sectionName}`;
    }
    
    const section = canvas[sectionKey as keyof typeof canvas] as CanvasElement;
    if (!section.content || section.content.length === 0) {
      return `No bullet points available for ${sectionName}`;
    }
    
    // Format content as bullet points
    return section.content.map(item => `• ${item}`).join('\n');
  };
  
  // GUI state removed since labels are no longer used

  useEffect(() => {
    if (!canvasRef.current || !canvas) return;

    try {
      // Initialize Babylon.js engine and scene
      const engine = new Engine(canvasRef.current, true);
      const scene = new Scene(engine);
    
    // Set background to match 2D view (#e9ecef - light gray)
    // #e9ecef = RGB(233, 236, 239) = normalized (0.914, 0.925, 0.937)
    scene.clearColor = new Color4(233/255, 236/255, 239/255, 1.0);
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Create perspective camera (always created to preserve state)
    const savedCameraState = getCamera3DState();
    const perspectiveCamera = new ArcRotateCamera(
      "perspectiveCamera",
      savedCameraState?.alpha ?? -Math.PI / 2.5,  // Alpha - more angled from the side for better perspective
      savedCameraState?.beta ?? Math.PI / 6,      // Beta - high angle for top-down perspective
      savedCameraState?.radius ?? 25,             // Radius - further back to see entire BMC layout clearly
      Vector3.Zero(),  // Target position
      scene
    );
    perspectiveCamera.setTarget(Vector3.Zero());
    
    // Enable camera controls on the canvas for perspective camera
    perspectiveCamera.attachControl(canvasRef.current, true);
    
    // Reduce mouse wheel sensitivity for smoother zooming
    perspectiveCamera.wheelPrecision = 50;        // Default is 3, higher values = less sensitive
    
    // Set camera limits for grid layout navigation (original working values)
    perspectiveCamera.lowerRadiusLimit = 5;      // Minimum zoom distance
    perspectiveCamera.upperRadiusLimit = 25;     // Maximum zoom distance
    perspectiveCamera.lowerBetaLimit = 0.1;      // Prevent camera from going below ground
    perspectiveCamera.upperBetaLimit = Math.PI / 2.2; // Prevent camera from flipping over
    
    // Create orthographic camera for top view
    const orthoCamera = new FreeCamera("orthoCamera", new Vector3(0, 15, 0), scene);
    orthoCamera.setTarget(Vector3.Zero());
    
    // Rotate camera 180 degrees clockwise around Y-axis to match desired orientation
    orthoCamera.rotation.y = Math.PI;
    
    // Set orthographic projection with proper aspect ratio (reduced size to fit window)
    orthoCamera.mode = 1; // ORTHOGRAPHIC_CAMERA
    const aspectRatio = canvasRef.current!.width / canvasRef.current!.height;
    const orthoSize = 10; // Reduced size to make model appear larger in view
    
    if (aspectRatio > 1) {
      // Wider than tall - expand horizontally
      orthoCamera.orthoTop = orthoSize;
      orthoCamera.orthoBottom = -orthoSize;
      orthoCamera.orthoLeft = -orthoSize * aspectRatio;
      orthoCamera.orthoRight = orthoSize * aspectRatio;
    } else {
      // Taller than wide - expand vertically
      orthoCamera.orthoTop = orthoSize / aspectRatio;
      orthoCamera.orthoBottom = -orthoSize / aspectRatio;
      orthoCamera.orthoLeft = -orthoSize;
      orthoCamera.orthoRight = orthoSize;
    }
    
    // Disable rotation controls for pure top-down view
    orthoCamera.inputs.clear();
    
    // Store camera references
    cameraRef.current = perspectiveCamera;
    orthoCameraRef.current = orthoCamera;
    
    // Set active camera based on mode
    scene.activeCamera = isOrthographic ? orthoCamera : perspectiveCamera;

    // Enhanced lighting setup for semi-gloss black plastic with subtle reflections
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 1.2; // Moderate ambient lighting
    hemisphericLight.diffuse = new Color3(0.9, 0.9, 0.9); // Neutral ambient
    hemisphericLight.specular = new Color3(0.2, 0.2, 0.2); // Low specular for subtle shine
    
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 1.8; // Strong directional light for shape definition
    directionalLight.diffuse = new Color3(1, 1, 1);
    directionalLight.specular = new Color3(0.3, 0.3, 0.3); // Low specular for controlled shine
    
    // Add key light from opposite direction for better form definition
    const directionalLight2 = new DirectionalLight("directionalLight2", new Vector3(1, -0.8, 0.5), scene);
    directionalLight2.intensity = 1.2; // Moderate fill light
    directionalLight2.diffuse = new Color3(0.95, 0.95, 1); // Slightly cool fill
    directionalLight2.specular = new Color3(0.2, 0.2, 0.25); // Very subtle cool specular

    // Create ground with powder blue background and white gridlines
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    
    // Create dynamic texture for powder blue grid pattern with white lines
    const gridTexture = new DynamicTexture("gridTexture", {width: 1024, height: 1024}, scene, false);
    const gridContext = gridTexture.getContext();
    
    // Fill with custom powder blue background
    gridContext.fillStyle = "#a7dbfc"; // Custom powder blue background
    gridContext.fillRect(0, 0, 1024, 1024);
    
    // Draw white grid lines
    gridContext.strokeStyle = "#FFFFFF"; // White grid lines
    gridContext.lineWidth = 1; // Thin 1px grid lines
    
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
    
    // Apply powder blue material with white grid texture to ground
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseTexture = gridTexture;
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.2); // Subtle blue-tinted specular reflection
    groundMaterial.specularPower = 64; // Higher value for sharper reflections
    groundMaterial.alpha = 0.5; // 50% opacity
    ground.material = groundMaterial;

    // Create extruded border rails on all sides
    const railHeight = 0.15; // Reduced from 0.3 to 0.15
    const railWidth = 0.2;
    const railColor = new Color3(0.3, 0.3, 0.3); // Darker grey rail color
    
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


    


    // Create bright environment for vivid metallic reflections WITHOUT skybox
    const environmentHelper = scene.createDefaultEnvironment({
      createGround: false, // We already have ground
      createSkybox: false, // Disable skybox to show scene clearColor background
      skyboxSize: 100,
      skyboxColor: new Color3(0.95, 0.95, 0.97), // Not used since createSkybox is false
      groundColor: new Color3(0.9, 0.9, 0.9)
    });
    
    // Set environment to bright intensity for vivid metallic reflections
    if (environmentHelper) {
      scene.environmentIntensity = 1.0; // Full reflection intensity
    }

    // Create GUI for 3D billboard labels
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    

    

    




    // Function to apply texture only to top face of mesh using proper UV mapping
    const applyTopFaceTexture = (mesh: Mesh, scene: Scene) => {
      console.log(`🔍 Analyzing mesh vertex data for top face identification...`);
      
      // Get vertex data
      const positions = mesh.getVerticesData("position");
      const indices = mesh.getIndices();
      let uvs = mesh.getVerticesData("uv");
      const normals = mesh.getVerticesData("normal");
      
      if (!positions || !indices || !uvs || !normals) {
        console.log(`❌ Missing vertex data for texture mapping`);
        return;
      }
      
      console.log(`📊 Mesh has ${positions.length/3} vertices, ${indices.length/3} faces`);
      
      // Find the maximum Y coordinate to identify top faces
      let maxY = -Infinity;
      for (let i = 1; i < positions.length; i += 3) { // Y coordinates are at positions 1, 4, 7, etc.
        maxY = Math.max(maxY, positions[i]);
      }
      
      console.log(`📏 Maximum Y coordinate found: ${maxY}`);
      
      // Clone UV array for modification (convert to regular array if needed)
      const newUvs = Array.from(uvs);
      
      // Process each triangle face
      let topFacesFound = 0;
      for (let i = 0; i < indices.length; i += 3) {
        const v1Index = indices[i];
        const v2Index = indices[i + 1];
        const v3Index = indices[i + 2];
        
        // Get positions for this triangle
        const v1Y = positions[v1Index * 3 + 1];
        const v2Y = positions[v2Index * 3 + 1];
        const v3Y = positions[v3Index * 3 + 1];
        
        // Get normals for this triangle
        const n1Y = normals[v1Index * 3 + 1];
        const n2Y = normals[v2Index * 3 + 1];
        const n3Y = normals[v3Index * 3 + 1];
        
        // Calculate average Y position and normal for this face
        const avgY = (v1Y + v2Y + v3Y) / 3;
        const avgNormalY = (n1Y + n2Y + n3Y) / 3;
        
        // Check if this is a top face (close to maxY and normal pointing up)
        const isTopFace = Math.abs(avgY - maxY) < 0.01 && avgNormalY > 0.5;
        
        if (isTopFace) {
          // This is a top face - create a small label in the center only
          // Get world positions
          const v1X = positions[v1Index * 3];
          const v1Z = positions[v1Index * 3 + 2];
          const v2X = positions[v2Index * 3];
          const v2Z = positions[v2Index * 3 + 2];
          const v3X = positions[v3Index * 3];
          const v3Z = positions[v3Index * 3 + 2];
          
          // Calculate triangle center
          const triCenterX = (v1X + v2X + v3X) / 3;
          const triCenterZ = (v1Z + v2Z + v3Z) / 3;
          
          // Find overall mesh bounds for this face
          let meshMinX = Infinity, meshMaxX = -Infinity;
          let meshMinZ = Infinity, meshMaxZ = -Infinity;
          
          // Sample all vertices to find true bounds
          for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            meshMinX = Math.min(meshMinX, x);
            meshMaxX = Math.max(meshMaxX, x);
            meshMinZ = Math.min(meshMinZ, z);
            meshMaxZ = Math.max(meshMaxZ, z);
          }
          
          const meshCenterX = (meshMinX + meshMaxX) / 2;
          const meshCenterZ = (meshMinZ + meshMaxZ) / 2;
          const meshWidth = meshMaxX - meshMinX;
          const meshDepth = meshMaxZ - meshMinZ;
          
          // Define tiny label area - only 5% of mesh size
          const labelSize = Math.min(meshWidth, meshDepth) * 0.05;
          
          // Check if this triangle is in the small center label area
          const distanceFromCenter = Math.sqrt(
            Math.pow(triCenterX - meshCenterX, 2) + 
            Math.pow(triCenterZ - meshCenterZ, 2)
          );
          
          if (distanceFromCenter < labelSize) {
            // This triangle is in the label area - map to texture
            newUvs[v1Index * 2] = 0.2 + 0.6 * (v1X - meshCenterX + labelSize) / (2 * labelSize);
            newUvs[v1Index * 2 + 1] = 0.2 + 0.6 * (v1Z - meshCenterZ + labelSize) / (2 * labelSize);
            
            newUvs[v2Index * 2] = 0.2 + 0.6 * (v2X - meshCenterX + labelSize) / (2 * labelSize);
            newUvs[v2Index * 2 + 1] = 0.2 + 0.6 * (v2Z - meshCenterZ + labelSize) / (2 * labelSize);
            
            newUvs[v3Index * 2] = 0.2 + 0.6 * (v3X - meshCenterX + labelSize) / (2 * labelSize);
            newUvs[v3Index * 2 + 1] = 0.2 + 0.6 * (v3Z - meshCenterZ + labelSize) / (2 * labelSize);
            
            console.log(`📝 Label triangle mapped at distance ${distanceFromCenter.toFixed(3)} from center`);
          } else {
            // This triangle is outside label area - map to edge (transparent/black area)
            newUvs[v1Index * 2] = 0.95;
            newUvs[v1Index * 2 + 1] = 0.95;
            newUvs[v2Index * 2] = 0.95;
            newUvs[v2Index * 2 + 1] = 0.95;
            newUvs[v3Index * 2] = 0.95;
            newUvs[v3Index * 2 + 1] = 0.95;
          }
          
          topFacesFound++;
          console.log(`✅ Top face ${topFacesFound} processed at Y=${avgY.toFixed(3)}`);
        }
        // For non-top faces, don't modify UVs - keep original material appearance
      }
      
      console.log(`🎯 Found and textured ${topFacesFound} top faces`);
      
      // Apply the modified UV coordinates back to the mesh
      mesh.setVerticesData("uv", newUvs);
      mesh.refreshBoundingInfo();
      
      console.log(`✅ UV mapping applied successfully to Customer Segments mesh`);
    };

    // Only GLB models are used now - no more box geometry functions needed

    // All BMC elements are now loaded as GLB models - circular layout matching top view

    // Define BMC section colors and names with corrected label order
    const bmcSections = [
      { color: new Color3(0.3, 0.6, 0.9), name: "Value Propositions" },      // Blue
      { color: new Color3(0.4, 0.8, 0.4), name: "Key Partners" },           // Green  
      { color: new Color3(0.9, 0.9, 0.3), name: "Key Activities" },         // Yellow (was Customer Relationships position)
      { color: new Color3(0.9, 0.3, 0.3), name: "Key Resources" },          // Red
      { color: new Color3(0.8, 0.4, 0.9), name: "Customer Relationships" }, // Purple (was Customer Segments position)
      { color: new Color3(0.6, 0.9, 0.9), name: "Channels" },               // Cyan
      { color: new Color3(0.9, 0.6, 0.3), name: "Customer Segments" },      // Orange (was Key Activities position)
    ];

    // Load complete BMC GLB model with individual section coloring
    SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_09_complete_1753576063858.glb", scene).then((result) => {
      if (result.meshes.length > 0) {
        console.log(`✅ BMC model loaded with ${result.meshes.length} meshes`);
        
        const rootMesh = result.meshes[0];
        rootMeshRef.current = rootMesh;
        
        // Position at center of ground plane, slightly above surface
        rootMesh.position = new Vector3(0, 0.1, 0);
        
        // Rotate entire model 180 degrees clockwise around Y-axis when in orthographic mode to fix upside-down text
        if (isOrthographic) {
          rootMesh.rotation = new Vector3(0, Math.PI, 0);
        } else {
          rootMesh.rotation = Vector3.Zero();
        }
        
        // Start with visible scale
        rootMesh.scaling = new Vector3(8, 8, 8);
        
        console.log(`📦 BMC model positioned at origin with scale 8.0`);
        
        // Corrected BMC section mapping - based on user feedback that specific labels need to swap
        // Current observation: Key Activities label is where Customer Relationships should be
        // Customer Relationships label is where Customer Segments should be  
        // Customer Segments label is where Key Activities should be
        // GLB model mesh mapping - adding fallback entries to prevent VAO errors
        const correctLabelMapping: Record<number, { color: Color3; name: string }> = {
          0: { color: new Color3(0.005, 0.005, 0.005), name: "Value Propositions" },      // Very Dark Black
          1: { color: new Color3(0.005, 0.005, 0.005), name: "Key Partners" },           // Very Dark Black
          2: { color: new Color3(0.005, 0.005, 0.005), name: "Customer Segments" },      // Very Dark Black
          3: { color: new Color3(0.005, 0.005, 0.005), name: "Key Resources" },          // Very Dark Black
          4: { color: new Color3(0.005, 0.005, 0.005), name: "Key Activities" },         // Very Dark Black
          5: { color: new Color3(0.005, 0.005, 0.005), name: "Channels" },               // Very Dark Black
          6: { color: new Color3(0.005, 0.005, 0.005), name: "Customer Relationships" }, // Very Dark Black
          7: { color: new Color3(0.005, 0.005, 0.005), name: "Cost Structure" },         // Fallback - Very Dark Black
          8: { color: new Color3(0.005, 0.005, 0.005), name: "Revenue Streams" },        // Fallback - Very Dark Black
        };

        // Apply corrected colors, interactivity, and labels to each BMC section mesh
        let sectionIndex = 0;
        result.meshes.forEach((mesh, index) => {
          if (mesh.material && mesh.name !== "__root__") {
            const section = correctLabelMapping[sectionIndex] || correctLabelMapping[0];
            const baseColor = section.color;
            const sectionName = section.name;
            
            // Create TransformNode parent for individual manipulation
            const transformNode = new TransformNode(`bmcTransform_${sectionName}_${index}`, scene);
            
            // Store the mesh's current local transform relative to rootMesh
            const localPosition = mesh.position.clone();
            const localRotation = mesh.rotation.clone();
            const localScaling = mesh.scaling.clone();
            
            // Set TransformNode as child of rootMesh to maintain hierarchy
            transformNode.parent = rootMesh;
            transformNode.position = localPosition;
            transformNode.rotation = localRotation;
            transformNode.scaling = localScaling;
            
            // Reset mesh transform and parent to individual TransformNode
            mesh.position = Vector3.Zero();
            mesh.rotation = Vector3.Zero();
            mesh.scaling = new Vector3(1, 1, 1);
            mesh.parent = transformNode;
            
            // Store references for manipulation
            (mesh as any).bmcTransformNode = transformNode;
            (mesh as any).bmcSectionName = sectionName;
            
            console.log(`🔧 Created TransformNode for ${sectionName} - mesh ${index}`);
            
            // Create new semi-gloss black plastic material for each section
            const sectionMaterial = new PBRMetallicRoughnessMaterial(`bmcSection_${index}`, scene);
            
            // Use very dark black color with subtle shine
            sectionMaterial.baseColor = baseColor;
            sectionMaterial.metallic = 0.0; // No metallic reflection for plastic
            sectionMaterial.roughness = 0.7; // Medium-high roughness for semi-gloss finish
            sectionMaterial.clearCoat.isEnabled = false; // Disable clear coat
            // Note: directIntensity and environmentIntensity properties handled by scene environment
            // Environment reflections handled by scene environment
            
            // Add floating label planes for specific sections
            if (sectionName === "Customer Segments") {
              console.log(`🏷️ Creating floating label for Customer Segments mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with larger size to match other labels
              const labelWidth = size.x * 1.0; // Full width to match font size of other labels
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger like Key Activities
              console.log(`Customer Segments Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("customerSegmentsLabel", {
                width: labelWidth,   // Larger width to match other labels
                height: labelHeight  // 50% taller to prevent squishing
              }, scene);
              
              // Position slightly above mesh center, moved left from top view
              labelPlane.position.x = center.x - size.x * 0.15; // Move left from top view perspective
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z;
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("customerSegmentsLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_CustomerSegments.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Customer Segments label plane created`);
            }
            
            if (sectionName === "Key Partners") {
              console.log(`🏷️ Creating floating label for Key Partners mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with larger size to match other labels
              const labelWidth = size.x * 0.95; // Larger width to better match font size of other labels
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger like Key Activities
              console.log(`Key Partners Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("keyPartnersLabel", {
                width: labelWidth,   // Larger width to match other labels
                height: labelHeight  // 50% taller to prevent squishing
              }, scene);
              
              // Position slightly above mesh center, moved right from top view
              labelPlane.position.x = center.x + size.x * 0.15; // Move right from top view perspective
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z;
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("keyPartnersLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_KeyPartners.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Key Partners label plane created`);
            }
            
            if (sectionName === "Customer Relationships") {
              console.log(`🏷️ Creating floating label for Customer Relationships mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with 50% taller height and slightly larger overall
              const labelWidth = size.x * 0.65; // Slightly larger than 0.6
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger than the previous calculated height
              console.log(`Customer Relationships Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("customerRelationshipsLabel", {
                width: labelWidth,   // Slightly larger width to fit better within mesh
                height: labelHeight  // 50% taller to reduce squishing
              }, scene);
              
              // Position within the mesh boundaries, moved right with margin like Customer Segments
              labelPlane.position.x = center.x + size.x * 0.15; // Move right but leave margin on right edge
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z + size.z * 0.3; // Move up more in top view
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("customerRelationshipsLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_CustomerRelationships.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Customer Relationships label plane created`);
            }
            
            if (sectionName === "Channels") {
              console.log(`🏷️ Creating floating label for Customer Channels mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with 50% taller height and slightly larger overall
              const labelWidth = size.x * 0.65; // Slightly larger than 0.6
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger than calculated height
              console.log(`Customer Channels Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("customerChannelsLabel", {
                width: labelWidth,   // Slightly larger width
                height: labelHeight  // 50% taller to reduce squishing
              }, scene);
              
              // Position within the mesh boundaries, moved right with margin like Customer Relationships  
              labelPlane.position.x = center.x + size.x * 0.15; // Move right but leave margin on right edge
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z - size.z * 0.3; // Move down toward bottom of shape
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("customerChannelsLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_CustomerChannels.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Customer Channels label plane created`);
            }
            
            // Add floating label planes for Key Activities section
            if (sectionName === "Key Activities") {
              console.log(`🏷️ Creating floating label for Key Activities mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with 50% taller height than before
              const labelWidth = size.x * 0.6;
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger than the previous calculated height
              console.log(`Key Activities Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("keyActivitiesLabel", {
                width: labelWidth,   // Smaller width to fit better within mesh
                height: labelHeight  // 50% taller to reduce squishing
              }, scene);
              
              // Position within the mesh boundaries, moved left from top view perspective
              labelPlane.position.x = center.x - size.x * 0.15; // Move left but leave margin on left edge
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z + size.z * 0.3; // Move up more in top view
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("keyActivitiesLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_KeyActivities.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Key Activities label plane created`);
            }
            
            // Add floating label planes for Key Resources section
            if (sectionName === "Key Resources") {
              console.log(`🏷️ Creating floating label for Key Resources mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with 50% taller height than before
              const labelWidth = size.x * 0.6;
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger than the previous calculated height
              console.log(`Key Resources Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("keyResourcesLabel", {
                width: labelWidth,   // Smaller width to fit better within mesh
                height: labelHeight  // 50% taller to reduce squishing
              }, scene);
              
              // Position within the mesh boundaries, moved left and down toward bottom
              labelPlane.position.x = center.x - size.x * 0.15; // Move left but leave margin on left edge
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z - size.z * 0.3; // Move down toward bottom of shape
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("keyResourcesLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_KeyResources.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Key Resources label plane created`);
            }
            
            // Add floating label planes for Value Propositions section
            if (sectionName === "Value Propositions") {
              console.log(`🏷️ Creating floating label for Value Propositions mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with slightly adjusted size for perfect proportion
              const labelWidth = size.x * 0.48; // Tiny bit larger for optimal proportion in circular area
              const labelHeight = (labelWidth * 0.25) * 1.5; // 50% bigger like other labels
              console.log(`Value Propositions Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("valuePropositionsLabel", {
                width: labelWidth,   // Size for central prominence
                height: labelHeight  // 50% taller to prevent squishing
              }, scene);
              
              // Position centered above the circular Value Propositions area
              labelPlane.position.x = center.x; // Center position
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z; // Center in the circular area
              
              // Rotate to be flat on top
              labelPlane.rotation.x = Math.PI / 2;
              
              // Create bright material for white text
              const labelMaterial = new StandardMaterial("valuePropositionsLabelMat", scene);
              const labelTexture = new Texture("/textures/Label_ValueProposition.png", scene);
              labelTexture.hasAlpha = true;
              
              labelMaterial.diffuseTexture = labelTexture;
              labelMaterial.emissiveTexture = labelTexture;
              labelMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
              labelMaterial.useAlphaFromDiffuseTexture = true;
              labelMaterial.disableLighting = false;
              
              labelPlane.material = labelMaterial;
              labelPlane.parent = mesh;
              labelPlane.isPickable = false;
              
              console.log(`✅ Value Propositions label plane created`);
              
              // Add pulsating green stroke animation to the top edge of Value Propositions cylinder
              const createPulsatingEdge = () => {
                // Get mesh geometry to create edge lines
                const positions = mesh.getVerticesData("position");
                const indices = mesh.getIndices();
                
                if (!positions || !indices) {
                  console.log("❌ Could not create edge animation - no mesh data");
                  return;
                }
                
                // Find the top face vertices (highest Y values)
                const topVertices: Vector3[] = [];
                const vertices: Vector3[] = [];
                
                // Convert positions array to Vector3 array
                for (let i = 0; i < positions.length; i += 3) {
                  vertices.push(new Vector3(positions[i], positions[i + 1], positions[i + 2]));
                }
                
                // Find maximum Y value (top of cylinder)
                let maxY = -Infinity;
                vertices.forEach(vertex => {
                  if (vertex.y > maxY) maxY = vertex.y;
                });
                
                // Collect vertices near the top (within small tolerance)
                const tolerance = 0.01;
                vertices.forEach(vertex => {
                  if (Math.abs(vertex.y - maxY) < tolerance) {
                    topVertices.push(vertex);
                  }
                });
                
                // Sort top vertices by angle to create circular edge
                const center = new Vector3(0, maxY, 0); // Top center
                topVertices.sort((a, b) => {
                  const angleA = Math.atan2(a.z - center.z, a.x - center.x);
                  const angleB = Math.atan2(b.z - center.z, b.x - center.x);
                  return angleA - angleB;
                });
                
                if (topVertices.length < 3) {
                  console.log("❌ Not enough top vertices found for edge animation");
                  return;
                }
                
                // Create edge lines using points
                const edgePoints: Vector3[] = [];
                topVertices.forEach(vertex => {
                  edgePoints.push(vertex);
                });
                // Close the loop
                if (edgePoints.length > 0) {
                  edgePoints.push(edgePoints[0]);
                }
                
                // Create the pulsating green edge line
                const edgeLine = MeshBuilder.CreateLines("valuePropositionEdge", {
                  points: edgePoints,
                  updatable: true
                }, scene);
                
                // Create bright green material for the edge
                const edgeMaterial = new StandardMaterial("valuePropositionEdgeMat", scene);
                edgeMaterial.emissiveColor = new Color3(0, 1, 0); // Bright green
                edgeMaterial.disableLighting = true;
                
                // Set line properties
                edgeLine.color = new Color3(0, 1, 0); // Bright green
                edgeLine.parent = mesh;
                edgeLine.isPickable = false;
                
                // Store animation reference
                (mesh as any).pulsatingEdge = edgeLine;
                
                // Create pulsating animation
                let animationTime = 0;
                const animateEdge = () => {
                  if (edgeLine && !edgeLine.isDisposed()) {
                    animationTime += 0.02; // Animation speed
                    
                    // Pulsate opacity and glow
                    const pulse = (Math.sin(animationTime * 2) + 1) / 2; // 0 to 1
                    const intensity = 0.3 + (pulse * 0.7); // 0.3 to 1.0
                    
                    // Update line color with pulsating intensity
                    edgeLine.color = new Color3(0, intensity, 0);
                    
                    // Continue animation
                    requestAnimationFrame(animateEdge);
                  }
                };
                
                // Start animation
                animateEdge();
                
                console.log(`✅ Pulsating green edge animation created for Value Propositions with ${topVertices.length} vertices`);
              };
              
              // Create the pulsating edge after a short delay to ensure mesh is ready
              setTimeout(createPulsatingEdge, 100);
            }

            // Create blue tracer animation for Customer Segments
            if (sectionName === "Customer Segments") {
              const createBlueTracer = () => {
                // Get mesh bounding info
                const boundingInfo = mesh.getBoundingInfo();
                const min = boundingInfo.minimum;
                const max = boundingInfo.maximum;
                
                // Calculate rectangular path exactly on top surface outline
                const topY = max.y; // Directly on the surface
                const pathPoints = [
                  new Vector3(min.x, topY, min.z), // Bottom-left
                  new Vector3(max.x, topY, min.z), // Bottom-right
                  new Vector3(max.x, topY, max.z), // Top-right
                  new Vector3(min.x, topY, max.z), // Top-left
                ];
                
                // Create tiny bright blue sphere (tracer head)
                const tracerSphere = MeshBuilder.CreateSphere("customerSegmentsTracer", { diameter: 0.0015 }, scene);
                const tracerMaterial = new StandardMaterial("tracerMat", scene);
                tracerMaterial.emissiveColor = new Color3(0, 0.7, 1); // Bright blue
                tracerMaterial.disableLighting = true;
                tracerMaterial.alpha = 0.8; // Slight transparency for blur effect
                tracerMaterial.diffuseColor = new Color3(0, 0.5, 1); // Softer blue base
                tracerMaterial.specularColor = new Color3(0.2, 0.8, 1); // Soft highlight
                tracerSphere.material = tracerMaterial;
                tracerSphere.parent = mesh;
                tracerSphere.isPickable = false;
                
                // Create a single stable trail line that gets updated safely
                const maxTrailLength = 8;
                const trailPositions: Vector3[] = [];
                
                // Initialize trail positions with current position
                for (let i = 0; i < maxTrailLength; i++) {
                  trailPositions.push(pathPoints[0].clone());
                }
                
                // Create a single trail line with initial points
                const trailLine = MeshBuilder.CreateLines("customerSegmentsTrail", {
                  points: trailPositions,
                  updatable: true
                }, scene);
                
                trailLine.color = new Color3(0, 0.7, 1); // Bright blue
                trailLine.parent = mesh;
                trailLine.isPickable = false;
                
                // Store animation reference
                (mesh as any).blueTracer = { sphere: tracerSphere, trail: trailLine };
                
                // Animation variables
                let animationTime = 0;
                const totalPathLength = pathPoints.length;
                let updateCounter = 0;
                
                const animateTracer = () => {
                  if (tracerSphere && !tracerSphere.isDisposed() && trailLine && !trailLine.isDisposed()) {
                    animationTime += 0.035; // Faster animation speed
                    
                    // Calculate position along path
                    const progress = (animationTime % (totalPathLength * 2)) / (totalPathLength * 2);
                    const scaledProgress = progress * totalPathLength;
                    const segmentIndex = Math.floor(scaledProgress) % totalPathLength;
                    const segmentProgress = scaledProgress - Math.floor(scaledProgress);
                    
                    // Get current and next points
                    const currentPoint = pathPoints[segmentIndex];
                    const nextPoint = pathPoints[(segmentIndex + 1) % totalPathLength];
                    
                    // Interpolate position
                    const currentPos = Vector3.Lerp(currentPoint, nextPoint, segmentProgress);
                    tracerSphere.position = currentPos;
                    
                    // Update trail positions less frequently to avoid vertex buffer issues
                    updateCounter++;
                    if (updateCounter % 3 === 0) { // Update every 3rd frame
                      // Shift trail positions
                      for (let i = trailPositions.length - 1; i > 0; i--) {
                        trailPositions[i] = trailPositions[i - 1].clone();
                      }
                      trailPositions[0] = currentPos.clone();
                      
                      // Safely update line geometry
                      try {
                        MeshBuilder.CreateLines("customerSegmentsTrail", {
                          points: trailPositions,
                          instance: trailLine
                        }, scene);
                      } catch (error) {
                        // If update fails, just continue without updating trail
                        console.log("Trail update skipped to prevent crash");
                      }
                    }
                    
                    // Continue animation
                    requestAnimationFrame(animateTracer);
                  }
                };
                
                // Start animation
                animateTracer();
                
                console.log(`✅ Blue tracer animation created for Customer Segments with rectangular path`);
              };
              
              // Create the blue tracer after a short delay to ensure mesh is ready
              setTimeout(createBlueTracer, 100);
            }
            
            mesh.material = sectionMaterial;
            mesh.receiveShadows = true;
            
            // Store original color and material for hover/click effects
            (mesh as any).originalColor = baseColor.clone();
            (mesh as any).originalMaterial = sectionMaterial;
            (mesh as any).isClicked = false;
            
            // Create billboard label above this mesh but make it invisible
            const labelContainer = new Rectangle(`label_${index}`);
            labelContainer.widthInPixels = 200;
            labelContainer.heightInPixels = 40;
            labelContainer.cornerRadius = 8;
            labelContainer.color = "white";
            labelContainer.thickness = 2;
            labelContainer.background = "rgba(0, 0, 0, 0.7)";
            // Value Propositions label should always appear in front
            labelContainer.zIndex = sectionName === "Value Propositions" ? 2000 : 1000;
            
            const labelText = new TextBlock(`labelText_${index}`, sectionName);
            labelText.color = "white";
            labelText.fontSize = "14px";
            labelText.fontFamily = "Arial, sans-serif";
            labelText.fontWeight = "bold";
            
            labelContainer.addControl(labelText);
            advancedTexture.addControl(labelContainer);
            
            // Position label higher above mesh top with billboard behavior
            // Special much higher positioning for Value Proposition label
            const labelHeight = sectionName === "Value Propositions" ? 3.5 : 1.2; // Much higher for Value Propositions
            
            // Link label to 3D position with billboard behavior
            labelContainer.linkWithMesh(mesh);
            labelContainer.linkOffsetY = `-${labelHeight * 50}px`; // Convert world units to approximate pixels
            
            // Hide the label by making it invisible
            labelContainer.isVisible = false;
            
            // Create content panel for click events (initially hidden)
            const contentPanel = new Rectangle(`contentPanel_${index}`);
            contentPanel.widthInPixels = 320;
            contentPanel.heightInPixels = 240;
            contentPanel.cornerRadius = 12;
            contentPanel.color = "white";
            contentPanel.thickness = 2;
            contentPanel.background = "rgba(255, 255, 255, 0.95)";
            contentPanel.isVisible = false; // Initially hidden
            contentPanel.zIndex = 3000; // Very high z-index to appear above all labels and windows
            
            // Create title text at top of panel
            const titleText = new TextBlock(`titleText_${index}`, sectionName);
            titleText.color = "black";
            titleText.fontSize = "14px";
            titleText.fontWeight = "bold";
            titleText.fontFamily = "Arial, sans-serif";
            titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
            titleText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            titleText.paddingTop = "8px";
            titleText.height = "25px";
            
            // Create close button (just X text, no box)
            const closeButton = new TextBlock(`closeButton_${index}`, "X");
            closeButton.color = "grey";
            closeButton.fontSize = "16px";
            closeButton.fontWeight = "bold";
            closeButton.fontFamily = "Arial, sans-serif";
            closeButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            closeButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            closeButton.topInPixels = 8;
            closeButton.leftInPixels = -12;
            closeButton.widthInPixels = 20;
            closeButton.heightInPixels = 20;
            closeButton.isPointerBlocker = true;
            
            // Create content text area (below title)
            const contentText = new TextBlock(`contentText_${index}`, "");
            contentText.color = "black";
            contentText.fontSize = "13px"; // Slightly larger
            contentText.fontFamily = "Arial, sans-serif";
            contentText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            contentText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            contentText.paddingTop = "45px"; // Below title
            contentText.paddingLeft = "15px";
            contentText.paddingRight = "15px";
            contentText.paddingBottom = "15px";
            contentText.textWrapping = true;
            
            contentPanel.addControl(titleText);
            contentPanel.addControl(closeButton);
            contentPanel.addControl(contentText);
            advancedTexture.addControl(contentPanel);
            
            // Position content panel above the label at moderate height
            contentPanel.linkWithMesh(mesh);
            contentPanel.linkOffsetY = `-${(labelHeight + 2.8) * 50}px`; // Moderately above the label for good visibility
            
            // Close button will be configured after interaction functions are defined
            
            // Store references for hover and click effects
            (mesh as any).labelContainer = labelContainer;
            (mesh as any).contentPanel = contentPanel;
            (mesh as any).contentText = contentText;
            
            // Add to panels array for global closing
            contentPanelsRef.current.push({ panel: contentPanel, mesh, material: sectionMaterial });
            
            // Enable pointer events for this mesh
            mesh.actionManager = new ActionManager(scene);
            
            // Separate functions for mesh and label interactions
            const updateMeshHoverEnter = () => {
              // For textured meshes, use emissive color to create blue glow effect
              // For non-textured meshes, change base color
              const brightBlueColor = new Color3(0.0, 0.3, 0.8);
              
              if ((mesh as any).hasTexture) {
                // For textured mesh, use emissive color to add blue glow while preserving texture
                sectionMaterial.emissiveColor = brightBlueColor.scale(0.3); // Subtle blue glow
                console.log(`💡 Textured mesh hover: ${sectionName} - adding blue emissive glow`);
              } else {
                // For non-textured mesh, change base color as before
                sectionMaterial.baseColor = brightBlueColor;
                console.log(`💡 Standard mesh hover: ${sectionName} - changing base color`);
              }
              
              // Keep all objects at 100% opacity during hover
              contentPanelsRef.current.forEach(({ material }) => {
                material.alpha = 1.0; // 100% opacity
              });
            };
            
            const updateLabelHoverEnter = () => {
              // Make label blue background (less bright)
              const labelContainer = (mesh as any).labelContainer;
              if (labelContainer) {
                labelContainer.background = "rgba(0, 77, 204, 1.0)"; // Less bright blue
              }
            };
            
            // Hover enter - only if not clicked AND no other object is currently selected
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              const isAnyObjectClicked = contentPanelsRef.current.some(({ mesh: otherMesh }) => (otherMesh as any).isClicked);
              
              if (!(mesh as any).isClicked && !isAnyObjectClicked) {
                updateMeshHoverEnter();
                updateLabelHoverEnter();
                console.log(`💡 Hover enter: ${sectionName} bright blue, all objects 100% opacity`);
              } else if ((mesh as any).isClicked) {
                console.log(`🔒 Hover enter: ${sectionName} already clicked - maintaining selected state`);
              } else {
                console.log(`🚫 Hover enter: ${sectionName} blocked - another object is selected`);
              }
            }));
            
            const updateMeshHoverExit = () => {
              // Restore hovered object to original state
              if ((mesh as any).hasTexture) {
                // For textured mesh, remove emissive glow
                sectionMaterial.emissiveColor = new Color3(0, 0, 0); // No emissive
                console.log(`🔄 Textured mesh hover exit: ${sectionName} - removing emissive glow`);
              } else {
                // For non-textured mesh, restore base color
                sectionMaterial.baseColor = (mesh as any).originalColor;
                console.log(`🔄 Standard mesh hover exit: ${sectionName} - restoring base color`);
              }
              
              // Restore all other BMC objects to full opacity
              contentPanelsRef.current.forEach(({ material }) => {
                material.alpha = 1.0; // Full opacity
              });
            };
            
            const updateLabelHoverExit = () => {
              // Restore label background
              const labelContainer = (mesh as any).labelContainer;
              if (labelContainer) {
                labelContainer.background = "rgba(0, 0, 0, 0.7)"; // Original dark background
              }
            };
            
            // Hover exit - only restore if not clicked AND no other object is selected
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              const isAnyObjectClicked = contentPanelsRef.current.some(({ mesh: otherMesh }) => (otherMesh as any).isClicked);
              
              if (!(mesh as any).isClicked && !isAnyObjectClicked) {
                updateMeshHoverExit();
                updateLabelHoverExit();
                console.log(`🔄 Hover exit: ${sectionName} restored, all objects full opacity`);
              } else if ((mesh as any).isClicked) {
                console.log(`🔒 Hover exit: ${sectionName} clicked - maintaining visual state`);
              } else {
                console.log(`🚫 Hover exit: ${sectionName} blocked - another object is selected`);
              }
            }));
            
            const updateMeshClickSelect = () => {
              // Set blue color (same as hover) and make other objects 50% opacity
              const brightBlueColor = new Color3(0.0, 0.3, 0.8);
              
              if ((mesh as any).hasTexture) {
                // For textured mesh, use emissive color for blue glow effect
                sectionMaterial.emissiveColor = brightBlueColor.scale(0.3); // Subtle blue glow
                console.log(`🔒 Textured mesh click: ${sectionName} - adding blue emissive glow`);
              } else {
                // For non-textured mesh, change base color
                sectionMaterial.baseColor = brightBlueColor;
                console.log(`🔒 Standard mesh click: ${sectionName} - changing base color`);
              }
              
              (mesh as any).isClicked = true;
              
              // Set selection state in store
              setSelectedObject(sectionName);
              
              // Apply height state (selected at original height, others flattened)
              applyHeightState();
              
              // Set opacity states
              contentPanelsRef.current.forEach(({ mesh: otherMesh, material }) => {
                const isSelectedObject = otherMesh === mesh;
                material.alpha = isSelectedObject ? 1.0 : 0.5;
              });
            };
            
            const updateMeshClickUnselect = () => {
              console.log(`🔓 DESELECT: ${sectionName} - restoring all to original heights`);
              
              // Clear selection
              setSelectedObject(null);
              (mesh as any).isClicked = false;
              
              // Get saved original heights
              const savedHeights = getOriginalHeights();
              console.log("🔓 Using saved heights:", savedHeights);
              
              // Restore ALL objects to their original heights
              contentPanelsRef.current.forEach(({ mesh: otherMesh, material }) => {
                const objSectionName = (otherMesh as any).bmcSectionName;
                
                // Restore original height
                if (objSectionName && savedHeights[objSectionName] && adjustBMCSection) {
                  const originalHeight = savedHeights[objSectionName];
                  adjustBMCSection(objSectionName, { height: originalHeight });
                  console.log(`🔓 RESTORED: ${objSectionName} to height ${originalHeight}`);
                }
                
                // Restore original colors
                if ((otherMesh as any).hasTexture) {
                  material.emissiveColor = new Color3(0, 0, 0);
                } else {
                  material.baseColor = (otherMesh as any).originalColor;
                }
                
                // Full opacity and clear click states
                material.alpha = 1.0;
                (otherMesh as any).isClicked = false;
              });
              
              console.log("🔓 DESELECT COMPLETE: All objects restored to original heights");
            };
            
            const updateContentPanel = (show: boolean, sectionContent?: string) => {
              const contentPanel = (mesh as any).contentPanel;
              const contentText = (mesh as any).contentText;
              
              if (show && contentText && contentPanel && sectionContent) {
                contentText.text = sectionContent;
                contentPanel.isVisible = true;
              } else if (contentPanel) {
                contentPanel.isVisible = false;
              }
            };
            
            // Click - set blue color, make other objects 50% opacity, and show/hide content panel
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              const isCurrentlyClicked = (mesh as any).isClicked;
              
              if (isCurrentlyClicked) {
                // Unclick - restore mesh and hide content panel
                updateMeshClickUnselect();
                updateContentPanel(false);
                
                console.log(`🔓 Click released: ${sectionName} restored, all objects full opacity, panel hidden`);
              } else {
                // Handle selecting a new object while another is already selected
                const previouslySelectedObject = getSelectedObject();
                
                // Close all other panels first and reset their visual states
                contentPanelsRef.current.forEach(({ panel, mesh: otherMesh, material }) => {
                  if (otherMesh !== mesh && panel.isVisible) {
                    panel.isVisible = false;
                    
                    // Properly restore other mesh based on whether it has texture
                    if ((otherMesh as any).hasTexture) {
                      // For textured mesh, remove emissive glow
                      material.emissiveColor = new Color3(0, 0, 0);
                    } else {
                      // For non-textured mesh, restore base color
                      material.baseColor = (otherMesh as any).originalColor;
                    }
                    
                    (otherMesh as any).isClicked = false;
                  }
                });
                
                // If there was a previously selected object, flatten it
                if (previouslySelectedObject && adjustBMCSection) {
                  adjustBMCSection(previouslySelectedObject, { height: 0.1 });
                  console.log(`📏 Flattening previously selected ${previouslySelectedObject} (height: 0.1)`);
                }
                
                // Save selected object state FIRST so applyHeightState knows what's selected
                setSelectedObject(sectionName);
                
                // Select this mesh and show content panel (updateMeshClickSelect will handle heights)
                updateMeshClickSelect();
                const sectionContent = getSectionContent(sectionName);
                updateContentPanel(true, sectionContent);
                
                console.log(`🔒 Clicked: ${sectionName} blue selected, others 50% opacity, panel shown`);
              }
            }));
            
            // Now configure close button functionality with access to refactored functions
            closeButton.onPointerClickObservable.add(() => {
              // Clear selected object state FIRST so applyHeightState knows nothing is selected
              setSelectedObject(null);
              
              updateMeshClickUnselect();
              updateContentPanel(false);
              
              console.log(`❌ Close button: ${sectionName} panel closed, mesh restored, all objects full opacity`);
            });
            
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

    // Helper functions for manipulating individual BMC sections
    // IMPORTANT: GLB Model Coordinate System Behavior
    // This specific GLB model (BMC_blender_09_complete_1753576063858.glb) has NORMAL Y-axis scaling:
    // - LARGER height values (>1.0) = TALLER shapes
    // - SMALLER height values (<1.0) = SHORTER shapes
    const adjustBMCSection = (sectionName: string, options: {
      height?: number;
      transparency?: number; 
      color?: Color3;
      scale?: Vector3;
    }) => {
      if (scene) {
        const meshes = scene.meshes;
        meshes.forEach((mesh) => {
          if ((mesh as any).bmcSectionName === sectionName) {
            const transformNode = (mesh as any).bmcTransformNode as TransformNode;
            const material = mesh.material as PBRMetallicRoughnessMaterial;
            
            if (transformNode) {
              // Adjust height (Y scaling)
              if (options.height !== undefined) {
                transformNode.scaling.y = options.height;
                console.log(`📏 ${sectionName} height adjusted to ${options.height}`);
              }
              
              // Adjust overall scale
              if (options.scale) {
                transformNode.scaling = options.scale;
                console.log(`📐 ${sectionName} scale adjusted to (${options.scale.x}, ${options.scale.y}, ${options.scale.z})`);
              }
            }
            
            if (material) {
              // Adjust transparency (alpha)
              if (options.transparency !== undefined) {
                material.alpha = 1 - options.transparency; // Convert transparency to alpha
                console.log(`👻 ${sectionName} transparency set to ${options.transparency}`);
              }
              
              // Adjust color
              if (options.color) {
                const vividColor = new Color3(
                  Math.pow(options.color.r, 0.7),
                  Math.pow(options.color.g, 0.7), 
                  Math.pow(options.color.b, 0.7)
                );
                material.baseColor = vividColor;
                (mesh as any).originalColor = options.color.clone();
                console.log(`🎨 ${sectionName} color changed to (${options.color.r.toFixed(2)}, ${options.color.g.toFixed(2)}, ${options.color.b.toFixed(2)})`);
              }
            }
          }
        });
      }
    };

    // Helper function to manipulate the entire BMC collection
    const adjustEntireBMC = (options: {
      position?: Vector3;
      rotation?: Vector3;
      scale?: Vector3;
    }) => {
      if (scene) {
        const rootTransform = scene.getNodeByName("__root__") as TransformNode;
        if (rootTransform) {
          if (options.position) {
            rootTransform.position = options.position;
            console.log(`🌍 Entire BMC position set to (${options.position.x}, ${options.position.y}, ${options.position.z})`);
          }
          if (options.rotation) {
            rootTransform.rotation = options.rotation;
            console.log(`🔄 Entire BMC rotation set to (${options.rotation.x}, ${options.rotation.y}, ${options.rotation.z})`);
          }
          if (options.scale) {
            rootTransform.scaling = options.scale;
            console.log(`📏 Entire BMC scale set to (${options.scale.x}, ${options.scale.y}, ${options.scale.z})`);
          }
        }
      }
    };

    // Helper function to list all available BMC sections
    const listBMCSections = () => {
      if (scene) {
        const sections: string[] = [];
        scene.meshes.forEach((mesh) => {
          if ((mesh as any).bmcSectionName) {
            sections.push((mesh as any).bmcSectionName);
          }
        });
        console.log("📋 Available BMC sections:", sections);
        console.log("📊 Hierarchy: Root Transform → Individual TransformNodes → Meshes");
        return sections;
      }
      return [];
    };

    // Expose manipulation functions globally for development/testing
    (window as any).adjustBMCSection = adjustBMCSection;
    (window as any).adjustEntireBMC = adjustEntireBMC;
    (window as any).listBMCSections = listBMCSections;
    
    console.log("🔧 BMC manipulation functions available:");
    console.log("   window.adjustBMCSection(sectionName, {height, transparency, color, scale}) - individual sections");
    console.log("   window.adjustEntireBMC({position, rotation, scale}) - entire collection");
    console.log("   window.listBMCSections() - shows all available section names");
    console.log("📊 Hierarchy: Root Transform → Individual TransformNodes → Meshes");

    // SIMPLE: Save original heights when GLB model first loads
    const saveOriginalHeights = () => {
      console.log("📏 STARTUP: Saving original heights from GLB model...");
      
      // Check if we already have heights stored
      const existingHeights = getOriginalHeights();
      if (Object.keys(existingHeights).length > 0) {
        console.log("📏 Already have heights stored:", existingHeights);
        return true;
      }
      
      if (scene && scene.meshes && contentPanelsRef.current.length > 0) {
        const originalHeights: { [sectionName: string]: number } = {};
        
        // Read each mesh's current transform node scaling.y as the original height
        scene.meshes.forEach((mesh) => {
          const sectionName = (mesh as any).bmcSectionName;
          const transformNode = (mesh as any).bmcTransformNode as TransformNode;
          
          if (sectionName && transformNode) {
            const height = transformNode.scaling.y;
            originalHeights[sectionName] = height;
            console.log(`📏 ORIGINAL: ${sectionName} = ${height}`);
          }
        });
        
        // Store in both places
        setOriginalHeights(originalHeights);
        originalHeightsRef.current = originalHeights;
        console.log("📏 SAVED original heights:", originalHeights);
        return true;
      }
      
      return false;
    };
    
    // Try to save heights immediately, then retry
    if (!saveOriginalHeights()) {
      setTimeout(() => {
        if (!saveOriginalHeights()) {
          setTimeout(() => saveOriginalHeights(), 1000);
        }
      }, 500);
    }
    
    // Also attempt to restore any existing selection state after heights are read
    setTimeout(() => {
      const existingSelection = getSelectedObject();
      if (existingSelection && Object.keys(getOriginalHeights()).length > 0) {
        console.log("🔄 Initial load: Found existing selection, restoring state:", existingSelection);
        restoreSelectedObjectState();
      }
    }, 2000);

    // Start the render loop
    engine.runRenderLoop(() => {
      if (scene) {
        scene.render();
      }
    });

    // Clean up on unmount
    return () => {
      // Save perspective camera state before disposing (only from perspective camera)
      if (cameraRef.current && !isOrthographic) {
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
    } catch (error) {
      console.error('Error initializing 3D scene:', error);
      // Show fallback message on error
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('3D rendering error. Please refresh the page.', canvasRef.current.width / 2, canvasRef.current.height / 2);
      }
    }
  }, [canvas, saveCamera3DState, isOrthographic]);

  // Handle camera switching when orthographic mode changes
  useEffect(() => {
    if (sceneRef.current && cameraRef.current && orthoCameraRef.current) {
      const scene = sceneRef.current;
      const perspectiveCamera = cameraRef.current;
      const orthoCamera = orthoCameraRef.current;
      const rootMesh = rootMeshRef.current;
      
      if (isOrthographic) {
        // Save current perspective camera state before switching
        saveCamera3DState(
          perspectiveCamera.alpha,
          perspectiveCamera.beta,
          perspectiveCamera.radius
        );
        

        
        // Rotate model 180 degrees clockwise to fix upside-down text in orthographic view
        if (rootMesh) {
          rootMesh.rotation = new Vector3(0, Math.PI, 0);
        }
        
        // Switch to orthographic camera
        scene.activeCamera = orthoCamera;
        console.log("🔄 Switched to orthographic top view camera with model rotation");
        
        // Apply unified height state after camera switch
        setTimeout(() => {
          console.log("🔄 Camera switch to Top view: About to restore state");
          const selectedObj = getSelectedObject();
          const storedHeights = getOriginalHeights();
          console.log("🔄 Current selection:", selectedObj);
          console.log("🔄 Stored heights:", storedHeights);
          restoreSelectedObjectState();
          console.log("🔄 Camera switch to Top view: Applied height state");
        }, 100);
      } else {
        // Reset model rotation for perspective view
        if (rootMesh) {
          rootMesh.rotation = Vector3.Zero();
        }
        

        
        // Switch back to perspective camera with restored state
        scene.activeCamera = perspectiveCamera;
        console.log("🔄 Switched back to perspective camera with model reset");
        
        // Apply unified height state after camera switch
        setTimeout(() => {
          console.log("🔄 Camera switch to 3D View: About to restore state");
          const selectedObj = getSelectedObject();
          const storedHeights = getOriginalHeights();
          console.log("🔄 Current selection:", selectedObj);
          console.log("🔄 Stored heights:", storedHeights);
          restoreSelectedObjectState();
          console.log("🔄 Camera switch to 3D View: Applied height state");
        }, 100);
      }
    }
  }, [isOrthographic, saveCamera3DState]);

  // Handle restoration when entering any 3D mode (from 2D or between 3D modes)
  useEffect(() => {
    if (is3D && sceneRef.current) {
      console.log("🔄 === ENTERING/STAYING IN 3D MODE ===");
      
      // Multiple attempts to restore state as scene loads  
      const attemptRestore = (attempt: number) => {
        const selectedObj = getSelectedObject();
        const storedHeights = getOriginalHeights();
        console.log(`🔄 Restore attempt ${attempt} - Current selection:`, selectedObj);
        console.log(`🔄 Restore attempt ${attempt} - Stored heights:`, storedHeights);
        
        if (Object.keys(storedHeights).length > 0 && contentPanelsRef.current.length > 0) {
          restoreSelectedObjectState();
          console.log(`🔄 Restore attempt ${attempt}: Successfully applied height state`);
          return true; // Success
        } else {
          console.log(`🔄 Restore attempt ${attempt}: Not ready yet (heights: ${Object.keys(storedHeights).length}, panels: ${contentPanelsRef.current.length})`);
          return false; // Not ready yet
        }
      };
      
      // Try immediately
      if (!attemptRestore(1)) {
        // Try after short delay
        setTimeout(() => {
          if (!attemptRestore(2)) {
            // Final attempt after longer delay
            setTimeout(() => {
              attemptRestore(3);
            }, 800);
          }
        }, 300);
      }
    }
  }, [is3D, isOrthographic, getSelectedObject, getOriginalHeights, restoreSelectedObjectState]);

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
      {/* Header - positioned below button group */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 text-center">
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