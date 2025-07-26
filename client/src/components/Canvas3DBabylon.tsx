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
  DynamicTexture
} from '@babylonjs/core';
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

    // Helper function to create a business model block with PBR materials
    const createBusinessBlock = (
      element: CanvasElement,
      position: Vector3,
      size: Vector3,
      color: Color3,
      elementId: string
    ) => {
      // Create rectangular boxes for all elements (original grid layout)
      const geometry = MeshBuilder.CreateBox(`box_${elementId}`, {
        width: size.x,
        height: size.y,
        depth: size.z
      }, scene);
      
      geometry.position = position;
      
      // Create PBR metallic material
      const material = new PBRMetallicRoughnessMaterial(`material_${elementId}`, scene);
      material.baseColor = color;
      material.metallic = 0.9;  // High metallic for professional shine
      material.roughness = 0.1; // Low roughness for reflective surface
      geometry.material = material;

      // Store original material properties for hover effect
      const originalMetallic = material.metallic;
      const originalRoughness = material.roughness;

      // Create billboard panel for detailed content (initially hidden)
      const billboardPanel = new Rectangle(`billboard_${elementId}`);
      billboardPanel.widthInPixels = 350;
      billboardPanel.heightInPixels = 300;
      billboardPanel.cornerRadius = 12;
      billboardPanel.color = "#2D3748";
      billboardPanel.thickness = 2;
      billboardPanel.background = "#FFFFFF";
      billboardPanel.shadowColor = "rgba(0, 0, 0, 0.3)";
      billboardPanel.shadowBlur = 10;
      billboardPanel.zIndex = 1000; // High z-index to float above all other elements
      billboardPanel.isVisible = false;
      advancedTexture.addControl(billboardPanel);

      // Billboard panel title
      const billboardTitle = new TextBlock(`billboard_title_${elementId}`, element.title);
      billboardTitle.color = "#2D3748";
      billboardTitle.fontSize = 22;
      billboardTitle.fontWeight = "bold";
      billboardTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      billboardTitle.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      billboardTitle.paddingTop = "20px";
      billboardPanel.addControl(billboardTitle);

      // Billboard panel content
      const billboardContent = new TextBlock(`billboard_content_${elementId}`, 
        element.content.length > 0 
          ? element.content.map((item, index) => `• ${item}`).join('\n\n')
          : 'No content available'
      );
      billboardContent.color = "#4A5568";
      billboardContent.fontSize = 15;
      billboardContent.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      billboardContent.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      billboardContent.paddingTop = "70px";
      billboardContent.paddingLeft = "25px";
      billboardContent.paddingRight = "25px";
      billboardContent.paddingBottom = "20px";
      billboardContent.textWrapping = true;
      billboardPanel.addControl(billboardContent);

      // Close button for billboard - simple grey X in upper-right corner
      const closeText = new TextBlock(`close_text_${elementId}`, "×");
      closeText.color = "#666666";
      closeText.fontSize = 20;
      closeText.fontWeight = "bold";
      closeText.widthInPixels = 20;
      closeText.heightInPixels = 20;
      closeText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      closeText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      closeText.paddingTopInPixels = 8;
      closeText.paddingRightInPixels = 8;
      billboardPanel.addControl(closeText);

      // Add interaction
      geometry.actionManager = new ActionManager(scene);
      geometry.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        // Hide current billboard if any
        if (currentPopup && currentPopup !== billboardPanel) {
          currentPopup.isVisible = false;
        }
        
        // Toggle this billboard panel
        billboardPanel.isVisible = !billboardPanel.isVisible;
        currentPopup = billboardPanel.isVisible ? billboardPanel : null;
        
        // Position billboard above and to the right of the label
        if (billboardPanel.isVisible) {
          billboardPanel.linkWithMesh(geometry);
          billboardPanel.linkOffsetX = 200; // Offset to the right
          billboardPanel.linkOffsetY = -180; // Offset above
        }
      }));

      // Close button interaction
      closeText.onPointerUpObservable.add(() => {
        billboardPanel.isVisible = false;
        currentPopup = null;
      });

      // Enhanced hover effect with metallic properties
      geometry.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        material.metallic = 1.0;  // Maximum metallic shine on hover
        material.roughness = 0.05; // Even more reflective
      }));

      geometry.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        material.metallic = originalMetallic;   // Restore original metallic
        material.roughness = originalRoughness; // Restore original roughness
      }));

      // Create simple title label (always visible)
      const titleLabel = new Rectangle(`title_label_${elementId}`);
      titleLabel.widthInPixels = 180;
      titleLabel.heightInPixels = 40;
      titleLabel.cornerRadius = 8;
      titleLabel.color = "transparent";
      titleLabel.thickness = 0;
      titleLabel.background = "rgba(255, 255, 255, 0.9)";
      advancedTexture.addControl(titleLabel);

      // Title text only
      const titleText = new TextBlock(`title_${elementId}`, element.title);
      titleText.color = "#2D3748";
      titleText.fontSize = 16;
      titleText.fontWeight = "bold";
      titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      titleLabel.addControl(titleText);

      // Link title label to 3D position
      titleLabel.linkWithMesh(geometry);
      titleLabel.linkOffsetY = -60;

      return geometry;
    };

    // GRID LAYOUT: Original working positioning that matches 2D canvas exactly
    // 2D Layout: 10-column grid with 3 rows (pre-GLB state from July 25, 2025)
    // Col 1-2: Key Partners (spans 2 cols, 2 rows)
    // Col 3-4: Key Activities (top), Key Resources (bottom)
    // Col 5-6: Value Propositions (spans 2 cols, 2 rows)
    // Col 7-8: Customer Relationships (top), Channels (bottom)
    // Col 9-10: Customer Segments (spans 2 cols, 2 rows)
    // Row 3: Cost Structure (5 cols), Revenue Streams (5 cols)
    
    const blocks = [
      // Column 1-2: Key Partners (left, spans 2 rows)
      createBusinessBlock(
        canvas.keyPartners,
        new Vector3(-4, 0.5, 0),    // Position: far left, centered vertically
        new Vector3(1.8, 1, 2.5),   // Size: narrow width, tall height
        Color3.FromHexString(canvas.keyPartners.color || '#FFE5E5'),
        canvas.keyPartners.id
      ),

      // Column 3-4: Key Activities (top)
      createBusinessBlock(
        canvas.keyActivities,
        new Vector3(-2, 0.5, 1),    // Position: left-center, forward
        new Vector3(1.8, 1, 1.2),   // Size: narrow width, short height
        Color3.FromHexString(canvas.keyActivities.color || '#E5F3FF'),
        canvas.keyActivities.id
      ),

      // Column 3-4: Key Resources (bottom)
      createBusinessBlock(
        canvas.keyResources,
        new Vector3(-2, 0.5, -1),   // Position: left-center, back
        new Vector3(1.8, 1, 1.2),   // Size: narrow width, short height
        Color3.FromHexString(canvas.keyResources.color || '#E5FFE5'),
        canvas.keyResources.id
      ),

      // Column 5-6: Value Propositions (center, spans 2 rows)
      createBusinessBlock(
        canvas.valuePropositions,
        new Vector3(0, 0.5, 0),     // Position: center, centered vertically
        new Vector3(1.8, 1, 2.5),   // Size: narrow width, tall height
        Color3.FromHexString(canvas.valuePropositions.color || '#FFF5E5'),
        canvas.valuePropositions.id
      ),

      // Column 7-8: Customer Relationships (top)
      createBusinessBlock(
        canvas.customerRelationships,
        new Vector3(2, 0.5, 1),     // Position: right-center, forward
        new Vector3(1.8, 1, 1.2),   // Size: narrow width, short height
        Color3.FromHexString(canvas.customerRelationships.color || '#F5E5FF'),
        canvas.customerRelationships.id
      ),

      // Column 7-8: Channels (bottom)
      createBusinessBlock(
        canvas.channels,
        new Vector3(2, 0.5, -1),    // Position: right-center, back
        new Vector3(1.8, 1, 1.2),   // Size: narrow width, short height
        Color3.FromHexString(canvas.channels.color || '#E5FFFF'),
        canvas.channels.id
      ),

      // Column 9-10: Customer Segments (right, spans 2 rows)
      createBusinessBlock(
        canvas.customerSegments,
        new Vector3(4, 0.5, 0),     // Position: far right, centered vertically
        new Vector3(1.8, 1, 2.5),   // Size: narrow width, tall height
        Color3.FromHexString(canvas.customerSegments.color || '#FFE5F5'),
        canvas.customerSegments.id
      )

      // Row 3: Cost Structure and Revenue Streams - HIDDEN per user request
      // createBusinessBlock(
      //   canvas.costStructure,
      //   new Vector3(-1, 0.5, -2.5), // Position: left side, back
      //   new Vector3(4.5, 1, 1),     // Size: wide width, short height
      //   Color3.FromHexString(canvas.costStructure.color || '#F0F0F0'),
      //   canvas.costStructure.id
      // ),

      // createBusinessBlock(
      //   canvas.revenueStreams,
      //   new Vector3(1, 0.5, -2.5),  // Position: right side, back
      //   new Vector3(4.5, 1, 1),     // Size: wide width, short height
      //   Color3.FromHexString(canvas.revenueStreams.color || '#E5F5E5'),
      //   canvas.revenueStreams.id
      // )
    ];

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