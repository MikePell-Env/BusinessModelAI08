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
  
  // Use PNG texture labels instead of billboard labels
  const useTextureLabels = true;

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
            // Use default lighting properties for PBR material
            // Environment reflections handled by scene environment
            
            mesh.material = sectionMaterial;
            mesh.receiveShadows = true;
            
            // Store original color and material for hover/click effects
            (mesh as any).originalColor = baseColor.clone();
            (mesh as any).originalMaterial = sectionMaterial;
            (mesh as any).isClicked = false;
            
            if (useTextureLabels) {
              // Map section names to PNG texture file names
              const textureFileMap: { [key: string]: string } = {
                "Value Propositions": "Label_ValueProposition_1753647389093.png",
                "Customer Channels": "Label_CustomerChannels_1753647389094.png",
                "Channels": "Label_CustomerChannels_1753647389094.png",
                "Customer Segments": "Label_CustomerSegments_1753647389094.png", 
                "Customer Relationships": "Label_CustomerRelationships_1753647389094.png",
                "Key Resources": "Label_KeyResources_1753647389095.png",
                "Key Activities": "Label_KeyActivities_1753647389095.png",
                "Key Partners": "Label_KeyPartners_1753647389095.png"
              };
              
              const textureFileName = textureFileMap[sectionName];
              console.log(`🔍 Looking for texture for section: "${sectionName}" -> ${textureFileName || 'NOT FOUND'}`);
              // Apply PNG decal directly to Key Partners surface
              if (sectionName === "Key Partners") {
                console.log(`🎯 Applying PNG decal to ${sectionName}`);
                
                // Create a visible decal plane at world coordinates first
                const decalPlane = MeshBuilder.CreatePlane(`decal_${sectionName}`, {
                  width: 1.2, height: 0.5, sideOrientation: Mesh.DOUBLESIDE
                }, scene);
                
                // Position at a clearly visible location for testing
                decalPlane.position.x = 0;
                decalPlane.position.y = 1.5; // Above the model
                decalPlane.position.z = 0;
                decalPlane.rotation.x = -Math.PI / 2; // Lay flat
                
                // Use any available PNG as texture
                const decalMaterial = new StandardMaterial(`decalMat_${sectionName}`, scene);
                const decalTexture = new Texture('/labels/Label_KeyPartners_1753647389095.png', scene);
                
                decalTexture.hasAlpha = true;
                decalTexture.vScale = -1;
                decalTexture.vOffset = 1;
                
                decalMaterial.diffuseTexture = decalTexture;
                decalMaterial.emissiveTexture = decalTexture;
                decalMaterial.emissiveColor = Color3.White();
                decalMaterial.useAlphaFromDiffuseTexture = true;
                decalMaterial.disableLighting = true;
                decalMaterial.backFaceCulling = false;
                
                decalPlane.material = decalMaterial;
                
                console.log(`🏷️ Created PNG decal at world position (0, 1.5, 0)`);
              }
            } else {
              // Create billboard label above this mesh
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
              
              // Store reference for hover effects
              (mesh as any).labelContainer = labelContainer;
            }
            
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
            
            // Add close button functionality
            closeButton.onPointerClickObservable.add(() => {
              contentPanel.isVisible = false;
              // Reset mesh clicked state
              sectionMaterial.baseColor = (mesh as any).originalColor;
              (mesh as any).isClicked = false;
              
              // Restore all objects to full opacity
              contentPanelsRef.current.forEach(({ material }) => {
                material.alpha = 1.0; // Full opacity
              });
              
              console.log(`❌ Close button: ${sectionName} panel closed, mesh restored, all objects full opacity`);
            });
            
            // Store references for hover and click effects
            (mesh as any).labelContainer = labelContainer;
            (mesh as any).contentPanel = contentPanel;
            (mesh as any).contentText = contentText;
            
            // Add to panels array for global closing
            contentPanelsRef.current.push({ panel: contentPanel, mesh, material: sectionMaterial });
            
            // Enable pointer events for this mesh
            mesh.actionManager = new ActionManager(scene);
            
            // Hover enter - change to bright blue, keep all objects at 100% opacity
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              if (!(mesh as any).isClicked) {
                // Change hovered object to bright blue (matching label hover color)
                const brightBlueColor = new Color3(0.0, 0.39, 1.0); // Bright blue like label
                sectionMaterial.baseColor = brightBlueColor;
                
                // Keep all objects at 100% opacity during hover
                contentPanelsRef.current.forEach(({ material }) => {
                  material.alpha = 1.0; // 100% opacity
                });
                
                // Make label bright blue background (billboard system only)
                if (!useTextureLabels) {
                  const labelContainer = (mesh as any).labelContainer;
                  if (labelContainer) {
                    labelContainer.background = "rgba(0, 100, 255, 1.0)"; // Bright blue
                  }
                }
                // For texture labels, the blue highlighting is handled by the material color change above
                
                console.log(`💡 Hover enter: ${sectionName} bright blue, all objects 100% opacity`);
              }
            }));
            
            // Hover exit - restore original color and full opacity to all objects
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              if (!(mesh as any).isClicked) {
                // Restore hovered object to original color
                sectionMaterial.baseColor = (mesh as any).originalColor;
                
                // Restore all other BMC objects to full opacity
                contentPanelsRef.current.forEach(({ material }) => {
                  material.alpha = 1.0; // Full opacity
                });
                
                // Restore label to semi-transparent (billboard system only)
                if (!useTextureLabels) {
                  const labelContainer = (mesh as any).labelContainer;
                  if (labelContainer) {
                    labelContainer.background = "rgba(0, 0, 0, 0.7)"; // Semi-transparent
                  }
                }
                // For texture labels, the color restoration is handled by the material color change above
                
                console.log(`🔄 Hover exit: ${sectionName} restored, all objects full opacity`);
              }
            }));
            
            // Click - set blue color, make other objects 30% opacity, and show/hide content panel
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              const isCurrentlyClicked = (mesh as any).isClicked;
              const contentPanel = (mesh as any).contentPanel;
              const contentText = (mesh as any).contentText;
              
              if (isCurrentlyClicked) {
                // Unclick - restore original color, full opacity to all, and hide content panel
                sectionMaterial.baseColor = (mesh as any).originalColor;
                (mesh as any).isClicked = false;
                
                // Restore all objects to full opacity
                contentPanelsRef.current.forEach(({ material }) => {
                  material.alpha = 1.0; // Full opacity
                });
                
                if (contentPanel) {
                  contentPanel.isVisible = false;
                }
                console.log(`🔓 Click released: ${sectionName} restored, all objects full opacity, panel hidden`);
              } else {
                // Close all other panels first and reset their states
                contentPanelsRef.current.forEach(({ panel, mesh: otherMesh, material }) => {
                  if (otherMesh !== mesh && panel.isVisible) {
                    panel.isVisible = false;
                    material.baseColor = (otherMesh as any).originalColor;
                    (otherMesh as any).isClicked = false;
                  }
                });
                
                // Click - set blue color (same as hover) and make other objects 30% opacity
                const brightBlueColor = new Color3(0.0, 0.39, 1.0); // Bright blue like hover
                sectionMaterial.baseColor = brightBlueColor;
                (mesh as any).isClicked = true;
                
                // Make all other objects 50% opacity
                contentPanelsRef.current.forEach(({ mesh: otherMesh, material }) => {
                  if (otherMesh !== mesh) {
                    material.alpha = 0.5; // 50% opacity for others
                  }
                });
                
                // Get content from canvas data and display in panel
                const sectionContent = getSectionContent(sectionName);
                if (contentText && contentPanel) {
                  contentText.text = sectionContent;
                  contentPanel.isVisible = true;
                }
                
                console.log(`🔒 Clicked: ${sectionName} blue selected, others 50% opacity, panel shown`);
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