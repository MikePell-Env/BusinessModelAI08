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

    // Enhanced lighting setup for metallic materials
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 1.0; // Increased for better metallic reflection
    hemisphericLight.diffuse = new Color3(1, 1, 1);
    hemisphericLight.specular = new Color3(1, 1, 1);
    
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 0.9; // Increased for metallic shine
    directionalLight.diffuse = new Color3(1, 1, 1);
    directionalLight.specular = new Color3(1, 1, 1);
    
    // Add additional directional light for enhanced metallic reflections
    const directionalLight2 = new DirectionalLight("directionalLight2", new Vector3(1, -0.5, 1), scene);
    directionalLight2.intensity = 0.5;
    directionalLight2.diffuse = new Color3(0.9, 0.95, 1); // Slightly cool tint
    directionalLight2.specular = new Color3(0.9, 0.95, 1);

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
            
            // Create new shiny metallic material with unique color for each section
            const sectionMaterial = new PBRMetallicRoughnessMaterial(`bmcSection_${index}`, scene);
            
            // Make colors more vivid and saturated for metallic appearance
            const vividColor = new Color3(
              Math.pow(baseColor.r, 0.7), // Enhance color saturation
              Math.pow(baseColor.g, 0.7), 
              Math.pow(baseColor.b, 0.7)
            );
            
            sectionMaterial.baseColor = vividColor;
            sectionMaterial.metallic = 0.95; // Very high metallic reflection
            sectionMaterial.roughness = 0.05; // Very low roughness for mirror-like finish
            // Environment reflections handled by scene environment
            
            mesh.material = sectionMaterial;
            mesh.receiveShadows = true;
            
            // Scale Value Propositions height (transform on loading)
            if (sectionName === "Value Propositions") {
              // For this model's coordinate system, Z-axis controls height/thickness
              mesh.scaling = new Vector3(1, 1, 2); // Double the height on Z-axis
              console.log(`📏 Value Propositions scaled 2x height on Z-axis`);
            }
            
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
            const meshBounds = mesh.getBoundingInfo();
            const meshCenter = meshBounds.boundingBox.centerWorld;
            // Special much higher positioning for Value Proposition label
            const labelHeight = sectionName === "Value Propositions" ? 3.5 : 1.2; // Much higher for Value Propositions
            const labelPosition = new Vector3(meshCenter.x, meshCenter.y + labelHeight, meshCenter.z);
            
            // Link label to 3D position with billboard behavior
            labelContainer.linkWithMesh(mesh);
            labelContainer.linkOffsetY = `-${labelHeight * 50}px`; // Convert world units to approximate pixels
            
            // Create content panel for click events (initially hidden)
            const contentPanel = new Rectangle(`contentPanel_${index}`);
            contentPanel.widthInPixels = 320;
            contentPanel.heightInPixels = 240;
            contentPanel.cornerRadius = 12;
            contentPanel.color = "white";
            contentPanel.thickness = 2;
            contentPanel.background = "rgba(255, 255, 255, 0.95)";
            contentPanel.isVisible = false; // Initially hidden
            contentPanel.zIndex = 1000; // High z-index to appear above everything
            
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
            
            // Position content panel above the label
            contentPanel.linkWithMesh(mesh);
            contentPanel.linkOffsetY = `-${(labelHeight + 2.2) * 50}px`; // Above the label, adjusted for higher spacing
            
            // Add close button functionality
            closeButton.onPointerClickObservable.add(() => {
              contentPanel.isVisible = false;
              // Reset mesh clicked state
              sectionMaterial.baseColor = (mesh as any).originalColor;
              (mesh as any).isClicked = false;
              console.log(`❌ Close button: ${sectionName} panel closed and mesh restored`);
            });
            
            // Store references for hover and click effects
            (mesh as any).labelContainer = labelContainer;
            (mesh as any).contentPanel = contentPanel;
            (mesh as any).contentText = contentText;
            
            // Add to panels array for global closing
            contentPanelsRef.current.push({ panel: contentPanel, mesh, material: sectionMaterial });
            
            // Enable pointer events for this mesh
            mesh.actionManager = new ActionManager(scene);
            
            // Hover enter - brighten color, show label and line
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              if (!(mesh as any).isClicked) {
                const brightenedColor = baseColor.scale(1.3); // 30% brighter
                sectionMaterial.baseColor = brightenedColor;
                
                // Make label bright blue background
                const labelContainer = (mesh as any).labelContainer;
                if (labelContainer) {
                  labelContainer.background = "rgba(0, 100, 255, 1.0)"; // Bright blue
                }
                
                console.log(`💡 Hover enter: ${sectionName} brightened with bright blue label`);
              }
            }));
            
            // Hover exit - restore original color and label
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              if (!(mesh as any).isClicked) {
                sectionMaterial.baseColor = (mesh as any).originalColor;
                
                // Restore label to semi-transparent
                const labelContainer = (mesh as any).labelContainer;
                if (labelContainer) {
                  labelContainer.background = "rgba(0, 0, 0, 0.7)"; // Semi-transparent
                }
                
                console.log(`🔄 Hover exit: ${sectionName} restored with semi-transparent label`);
              }
            }));
            
            // Click - darken color, toggle state, and show/hide content panel
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              const isCurrentlyClicked = (mesh as any).isClicked;
              const contentPanel = (mesh as any).contentPanel;
              const contentText = (mesh as any).contentText;
              
              if (isCurrentlyClicked) {
                // Unclick - restore original color and hide content panel
                sectionMaterial.baseColor = (mesh as any).originalColor;
                (mesh as any).isClicked = false;
                if (contentPanel) {
                  contentPanel.isVisible = false;
                }
                console.log(`🔓 Click released: ${sectionName} restored and panel hidden`);
              } else {
                // Close all other panels first
                contentPanelsRef.current.forEach(({ panel, mesh: otherMesh, material }) => {
                  if (otherMesh !== mesh && panel.isVisible) {
                    panel.isVisible = false;
                    material.baseColor = (otherMesh as any).originalColor;
                    (otherMesh as any).isClicked = false;
                  }
                });
                
                // Click - darken color and show content panel
                const darkenedColor = baseColor.scale(0.7); // 30% darker
                sectionMaterial.baseColor = darkenedColor;
                (mesh as any).isClicked = true;
                
                // Get content from canvas data and display in panel
                const sectionContent = getSectionContent(sectionName);
                if (contentText && contentPanel) {
                  contentText.text = sectionContent;
                  contentPanel.isVisible = true;
                }
                
                console.log(`🔒 Clicked: ${sectionName} darkened and panel shown (others closed)`);
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