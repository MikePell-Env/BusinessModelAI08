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
  
  // Store all content panels for closing functionality
  const contentPanelsRef = useRef<any[]>([]);

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

    // Initialize Babylon.js engine and scene
    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);
    
    // Set background to match 2D view (#e9ecef - light gray)
    // #e9ecef = RGB(233, 236, 239) = normalized (0.914, 0.925, 0.937)
    scene.clearColor = new Color4(233/255, 236/255, 239/255, 1.0);
    
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
        
        // Corrected BMC section mapping - based on user feedback that specific labels need to swap
        // Current observation: Key Activities label is where Customer Relationships should be
        // Customer Relationships label is where Customer Segments should be  
        // Customer Segments label is where Key Activities should be
        const correctLabelMapping: Record<number, { color: Color3; name: string }> = {
          0: { color: new Color3(0.005, 0.005, 0.005), name: "Value Propositions" },      // Very Dark Black
          1: { color: new Color3(0.005, 0.005, 0.005), name: "Key Partners" },           // Very Dark Black
          2: { color: new Color3(0.005, 0.005, 0.005), name: "Customer Segments" },      // Very Dark Black
          3: { color: new Color3(0.005, 0.005, 0.005), name: "Key Resources" },          // Very Dark Black
          4: { color: new Color3(0.005, 0.005, 0.005), name: "Key Activities" },         // Very Dark Black
          5: { color: new Color3(0.005, 0.005, 0.005), name: "Channels" },               // Very Dark Black
          6: { color: new Color3(0.005, 0.005, 0.005), name: "Customer Relationships" }, // Very Dark Black
          7: { color: new Color3(0.005, 0.005, 0.005), name: "Cost Structure" },         // Very Dark Black
          8: { color: new Color3(0.005, 0.005, 0.005), name: "Revenue Streams" },        // Very Dark Black
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
              
              // Create label plane with correct aspect ratio matching the PNG file
              const labelPlane = MeshBuilder.CreatePlane("customerSegmentsLabel", {
                width: size.x * 0.7,   // Wide to match PNG aspect ratio
                height: size.z * 0.15  // Much shorter to prevent vertical stretching
              }, scene);
              
              // Position slightly above mesh center
              labelPlane.position.x = center.x;
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
              
              // Create label plane with correct aspect ratio matching the PNG file
              const labelPlane = MeshBuilder.CreatePlane("keyPartnersLabel", {
                width: size.x * 0.7,   // Wide to match PNG aspect ratio
                height: size.z * 0.15  // Much shorter to prevent vertical stretching
              }, scene);
              
              // Position slightly above mesh center
              labelPlane.position.x = center.x;
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
              
              // Create label plane with correct aspect ratio matching the PNG file 
              const labelWidth = size.x * 0.6;
              const labelHeight = labelWidth * 0.25; // Use PNG aspect ratio (roughly 4:1) instead of mesh proportions
              console.log(`Customer Relationships Label Dimensions: ${labelWidth} x ${labelHeight}, Aspect Ratio: ${(labelWidth/labelHeight).toFixed(2)}`);
              
              const labelPlane = MeshBuilder.CreatePlane("customerRelationshipsLabel", {
                width: labelWidth,   // Smaller width to fit better within mesh
                height: labelHeight  // Height based on PNG aspect ratio to prevent squishing
              }, scene);
              
              // Position within the mesh boundaries, moved towards upper portion
              labelPlane.position.x = center.x;
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z + size.z * 0.2; // Move up in top view (positive Z)
              
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
            
            if (sectionName === "Customer Channels") {
              console.log(`🏷️ Creating floating label for Customer Channels mesh (index ${index})`);
              
              // Get mesh bounds for positioning
              const boundingInfo = mesh.getBoundingInfo();
              const center = boundingInfo.boundingBox.center;
              const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
              
              // Create label plane with correct aspect ratio matching the PNG file
              const labelPlane = MeshBuilder.CreatePlane("customerChannelsLabel", {
                width: size.x * 0.7,   // Wide to match PNG aspect ratio
                height: size.z * 0.15  // Height based on PNG aspect ratio
              }, scene);
              
              // Position slightly above mesh center
              labelPlane.position.x = center.x;
              labelPlane.position.y = center.y + size.y * 0.6;
              labelPlane.position.z = center.z;
              
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
              const brightBlueColor = new Color3(0.0, 0.39, 1.0);
              
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
              // Make label bright blue background
              const labelContainer = (mesh as any).labelContainer;
              if (labelContainer) {
                labelContainer.background = "rgba(0, 100, 255, 1.0)"; // Bright blue
              }
            };
            
            // Hover enter - change to bright blue, keep all objects at 100% opacity
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              if (!(mesh as any).isClicked) {
                updateMeshHoverEnter();
                updateLabelHoverEnter();
                console.log(`💡 Hover enter: ${sectionName} bright blue, all objects 100% opacity`);
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
            
            // Hover exit - restore original color and full opacity to all objects
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              if (!(mesh as any).isClicked) {
                updateMeshHoverExit();
                updateLabelHoverExit();
                console.log(`🔄 Hover exit: ${sectionName} restored, all objects full opacity`);
              }
            }));
            
            const updateMeshClickSelect = () => {
              // Set blue color (same as hover) and make other objects 50% opacity
              const brightBlueColor = new Color3(0.0, 0.39, 1.0);
              
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
              
              // Make all other objects 50% opacity
              contentPanelsRef.current.forEach(({ mesh: otherMesh, material }) => {
                if (otherMesh !== mesh) {
                  material.alpha = 0.5; // 50% opacity for others
                }
              });
            };
            
            const updateMeshClickUnselect = () => {
              // Restore original state and full opacity to all
              if ((mesh as any).hasTexture) {
                // For textured mesh, remove emissive glow
                sectionMaterial.emissiveColor = new Color3(0, 0, 0); // No emissive
                console.log(`🔓 Textured mesh unclick: ${sectionName} - removing emissive glow`);
              } else {
                // For non-textured mesh, restore base color
                sectionMaterial.baseColor = (mesh as any).originalColor;
                console.log(`🔓 Standard mesh unclick: ${sectionName} - restoring base color`);
              }
              
              (mesh as any).isClicked = false;
              
              // Restore all objects to full opacity
              contentPanelsRef.current.forEach(({ material }) => {
                material.alpha = 1.0; // Full opacity
              });
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
                // Close all other panels first and reset their states
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
                
                // Select this mesh and show content panel
                updateMeshClickSelect();
                const sectionContent = getSectionContent(sectionName);
                updateContentPanel(true, sectionContent);
                
                console.log(`🔒 Clicked: ${sectionName} blue selected, others 50% opacity, panel shown`);
              }
            }));
            
            // Now configure close button functionality with access to refactored functions
            closeButton.onPointerClickObservable.add(() => {
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
        const rootTransform = scene.getNodeByName("__root__");
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

    // Auto-adjust Value Propositions to be taller 
    // NOTE: This GLB model has normal Y-axis scaling - LARGER values = TALLER shapes
    setTimeout(() => {
      adjustBMCSection("Value Propositions", { height: 9.0 });
      console.log("🏗️ Value Propositions automatically set to taller height (9.0 scale - GLB model uses normal Y-axis)");
    }, 1000); // Wait for meshes to load

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