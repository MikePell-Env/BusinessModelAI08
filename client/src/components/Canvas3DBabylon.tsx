import React, { useRef, useEffect } from 'react';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, ActionManager, ExecuteCodeAction, LinesMesh } from '@babylonjs/core';
import { AdvancedDynamicTexture, Rectangle, TextBlock, Control } from '@babylonjs/gui';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';

interface Canvas3DBabylonProps {
  canvas: BusinessModelCanvas;
  isTransitioning: boolean;
}

export const Canvas3DBabylon: React.FC<Canvas3DBabylonProps> = ({ canvas, isTransitioning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !canvas) return;

    // Initialize Babylon.js engine and scene
    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);
    
    // Set light grey background
    scene.clearColor = new Color3(0.95, 0.95, 0.95);
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Create camera with user controls
    const camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 2.5,
      12,
      Vector3.Zero(),
      scene
    );
    camera.setTarget(Vector3.Zero());
    
    // Enable camera controls on the canvas
    camera.attachControl(canvasRef.current, true);
    
    // Set camera limits for better user experience
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 25;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2.2;

    // Create improved lighting to prevent washout from top view
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.6;
    hemisphericLight.diffuse = new Color3(1, 1, 1);
    hemisphericLight.specular = new Color3(0.3, 0.3, 0.3);
    
    // Add directional light for better definition
    const directionalLight = new HemisphericLight("directionalLight", new Vector3(0.5, -1, 0.5), scene);
    directionalLight.intensity = 0.4;
    directionalLight.diffuse = new Color3(0.9, 0.9, 1);
    
    // Add ambient lighting to reduce harsh shadows
    scene.ambientColor = new Color3(0.3, 0.3, 0.3);

    // Create ground with grid pattern
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = new Color3(0.9, 0.9, 0.9); // Light grey
    ground.material = groundMaterial;

    // Create grid lines
    const gridSpacing = 1;
    const gridLines = [];
    
    // Horizontal grid lines
    for (let i = -10; i <= 10; i += gridSpacing) {
      const points = [new Vector3(-10, 0.01, i), new Vector3(10, 0.01, i)];
      const line = MeshBuilder.CreateLines(`hLine_${i}`, { points: points }, scene);
      const lineMaterial = new StandardMaterial(`hLineMaterial_${i}`, scene);
      lineMaterial.diffuseColor = new Color3(1, 1, 1); // White
      lineMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8); // Slight glow
      line.material = lineMaterial;
      gridLines.push(line);
    }
    
    // Vertical grid lines
    for (let i = -7; i <= 7; i += gridSpacing) {
      const points = [new Vector3(i, 0.01, -10), new Vector3(i, 0.01, 10)];
      const line = MeshBuilder.CreateLines(`vLine_${i}`, { points: points }, scene);
      const lineMaterial = new StandardMaterial(`vLineMaterial_${i}`, scene);
      lineMaterial.diffuseColor = new Color3(1, 1, 1); // White
      lineMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8); // Slight glow
      line.material = lineMaterial;
      gridLines.push(line);
    }

    // Create GUI
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    
    // Store floating panels (no connecting lines)
    const floatingPanels = new Map<string, { panel: Mesh, gui: Rectangle }>();
    let currentSelectedElement: string | null = null;

    // Helper function to create a floating content panel
    const createFloatingPanel = (element: CanvasElement, boxPosition: Vector3, elementId: string) => {
      // Create floating panel position (closer to the box)
      const panelPosition = new Vector3(
        boxPosition.x + 1.5,  // Closer offset to the side
        boxPosition.y + 1.2,  // Closer float above
        boxPosition.z
      );

      // Create the floating panel
      const panel = MeshBuilder.CreateBox(`panel_${elementId}`, {
        width: 3,
        height: 2,
        depth: 0.1
      }, scene);
      
      panel.position = panelPosition;
      
      // Create transparent panel material (invisible 3D mesh)
      const panelMaterial = new StandardMaterial(`panelMaterial_${elementId}`, scene);
      panelMaterial.diffuseColor = new Color3(1, 1, 1);
      panelMaterial.alpha = 0; // Completely transparent
      panel.material = panelMaterial;

      // No connecting line for floating panels

      // Create GUI for panel content
      const panelRect = new Rectangle(`panelRect_${elementId}`);
      panelRect.widthInPixels = 350;
      panelRect.heightInPixels = 250;
      panelRect.cornerRadius = 10;
      panelRect.color = "#E2E8F0";
      panelRect.thickness = 2;
      panelRect.background = "#FFFFFF";
      advancedTexture.addControl(panelRect);

      // Panel title
      const panelTitle = new TextBlock(`panelTitle_${elementId}`, element.title);
      panelTitle.color = "#2D3748";
      panelTitle.fontSize = 16;
      panelTitle.fontWeight = "bold";
      panelTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      panelTitle.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      panelTitle.paddingTop = "15px";
      panelRect.addControl(panelTitle);

      // Panel content
      const contentLines = element.content.slice(0, 5); // Show up to 5 bullet points
      const contentText = contentLines.map(item => `• ${item}`).join('\n');
      
      const panelContent = new TextBlock(`panelContent_${elementId}`, contentText);
      panelContent.color = "#4A5568";
      panelContent.fontSize = 12;
      panelContent.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      panelContent.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      panelContent.paddingTop = "50px";
      panelContent.paddingLeft = "20px";
      panelContent.paddingRight = "20px";
      panelContent.textWrapping = true;
      panelRect.addControl(panelContent);

      // Close button in upper right corner
      const closeButton = new TextBlock(`closeBtn_${elementId}`, "✕");
      closeButton.color = "#718096"; // Grey color
      closeButton.fontSize = 20;
      closeButton.fontWeight = "bold";
      closeButton.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      closeButton.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      closeButton.top = "8px";
      closeButton.left = "-8px";
      closeButton.widthInPixels = 30;
      closeButton.heightInPixels = 30;
      closeButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      closeButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      closeButton.isPointerBlocker = true;
      panelRect.addControl(closeButton);

      // Add close button interaction
      closeButton.onPointerClickObservable.add(() => {
        hideFloatingPanel(elementId);
      });

      // Link panel GUI to 3D position
      panelRect.linkWithMesh(panel);
      panelRect.linkOffsetY = -125;

      return { panel, gui: panelRect };
    };

    // Function to show floating panel
    const showFloatingPanel = (element: CanvasElement, boxPosition: Vector3, elementId: string) => {
      console.log(`Showing panel for ${elementId}`);
      
      // Hide any existing panel first
      if (currentSelectedElement && floatingPanels.has(currentSelectedElement)) {
        const currentPanel = floatingPanels.get(currentSelectedElement);
        if (currentPanel) {
          currentPanel.panel.dispose();
          advancedTexture.removeControl(currentPanel.gui);
          floatingPanels.delete(currentSelectedElement);
        }
      }
      
      // Create and show new panel
      try {
        const panelData = createFloatingPanel(element, boxPosition, elementId);
        floatingPanels.set(elementId, panelData);
        currentSelectedElement = elementId;
        console.log(`Panel created successfully for ${elementId}`);
      } catch (error) {
        console.error(`Error creating panel for ${elementId}:`, error);
      }
    };

    // Function to hide floating panel
    const hideFloatingPanel = (elementId: string | null) => {
      if (!elementId) return;
      
      console.log(`Hiding panel for ${elementId}`);
      const panelData = floatingPanels.get(elementId);
      if (panelData) {
        panelData.panel.dispose();
        advancedTexture.removeControl(panelData.gui);
        floatingPanels.delete(elementId);
        console.log(`Panel hidden for ${elementId}`);
      }
      currentSelectedElement = null;
    };

    // Helper function to create a business model block (simplified - title only)
    const createBusinessBlock = (
      element: CanvasElement,
      position: Vector3,
      size: Vector3,
      color: Color3,
      elementId: string
    ) => {
      // Create the main box
      const box = MeshBuilder.CreateBox(`box_${elementId}`, {
        width: size.x,
        height: size.y,
        depth: size.z
      }, scene);
      
      box.position = position;
      
      // Create material
      const material = new StandardMaterial(`material_${elementId}`, scene);
      material.diffuseColor = color;
      material.alpha = 0.8;
      box.material = material;

      // Add interaction
      box.actionManager = new ActionManager(scene);
      box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, (evt) => {
        console.log(`Clicked on ${element.title}`);
        // Prevent camera movement when clicking on the box
        evt.sourceEvent?.stopPropagation();
        
        if (currentSelectedElement === elementId) {
          // If already selected, hide panel
          hideFloatingPanel(elementId);
        } else {
          // Show floating panel with content
          showFloatingPanel(element, position, elementId);
        }
      }));

      // Add hover effect
      box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        material.diffuseColor = new Color3(0.29, 0.56, 0.89); // Blue hover
      }));

      box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        material.diffuseColor = color; // Original color
      }));

      // Create billboard text using GUI directly on screen (no mesh plane)
      const titleRect = new Rectangle(`titleRect_${elementId}`);
      titleRect.widthInPixels = 200;
      titleRect.heightInPixels = 40;
      titleRect.color = "transparent";
      titleRect.thickness = 0;
      advancedTexture.addControl(titleRect);

      // Title text with billboard behavior
      const titleText = new TextBlock(`title_${elementId}`, element.title);
      titleText.color = "#2D3748";
      titleText.fontSize = 16;
      titleText.fontWeight = "bold";
      titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      titleRect.addControl(titleText);

      // Link to center of the box, slightly higher
      titleRect.linkWithMesh(box);
      titleRect.linkOffsetY = -80; // Higher above the box

      return box;
    };

    // Create business model canvas blocks matching 2D grid layout
    const blocks = [
      // Column 1-2: Key Partners (left, spans 2 rows)
      createBusinessBlock(
        canvas.keyPartners,
        new Vector3(-4, 0.5, 0),
        new Vector3(1.8, 1, 2.5),
        Color3.FromHexString(canvas.keyPartners.color || '#FFE5E5'),
        canvas.keyPartners.id
      ),

      // Column 3-4: Key Activities (top)
      createBusinessBlock(
        canvas.keyActivities,
        new Vector3(-2, 0.5, 1),
        new Vector3(1.8, 1, 1.2),
        Color3.FromHexString(canvas.keyActivities.color || '#E5F3FF'),
        canvas.keyActivities.id
      ),

      // Column 3-4: Key Resources (bottom)
      createBusinessBlock(
        canvas.keyResources,
        new Vector3(-2, 0.5, -1),
        new Vector3(1.8, 1, 1.2),
        Color3.FromHexString(canvas.keyResources.color || '#E5FFE5'),
        canvas.keyResources.id
      ),

      // Column 5-6: Value Propositions (center, spans 2 rows)
      createBusinessBlock(
        canvas.valuePropositions,
        new Vector3(0, 0.5, 0),
        new Vector3(1.8, 1, 2.5),
        Color3.FromHexString(canvas.valuePropositions.color || '#FFF5E5'),
        canvas.valuePropositions.id
      ),

      // Column 7-8: Customer Relationships (top)
      createBusinessBlock(
        canvas.customerRelationships,
        new Vector3(2, 0.5, 1),
        new Vector3(1.8, 1, 1.2),
        Color3.FromHexString(canvas.customerRelationships.color || '#F5E5FF'),
        canvas.customerRelationships.id
      ),

      // Column 7-8: Channels (bottom)
      createBusinessBlock(
        canvas.channels,
        new Vector3(2, 0.5, -1),
        new Vector3(1.8, 1, 1.2),
        Color3.FromHexString(canvas.channels.color || '#E5FFFF'),
        canvas.channels.id
      ),

      // Column 9-10: Customer Segments (right, spans 2 rows)
      createBusinessBlock(
        canvas.customerSegments,
        new Vector3(4, 0.5, 0),
        new Vector3(1.8, 1, 2.5),
        Color3.FromHexString(canvas.customerSegments.color || '#FFE5F5'),
        canvas.customerSegments.id
      ),

      // Row 3: Cost Structure (left aligned with Key Partners)
      createBusinessBlock(
        canvas.costStructure,
        new Vector3(-2, 0.5, -2.5),
        new Vector3(3.8, 1, 1),
        Color3.FromHexString(canvas.costStructure.color || '#F0F0F0'),
        canvas.costStructure.id
      ),

      // Row 3: Revenue Streams (right side)
      createBusinessBlock(
        canvas.revenueStreams,
        new Vector3(2, 0.5, -2.5),
        new Vector3(3.8, 1, 1),
        Color3.FromHexString(canvas.revenueStreams.color || '#E5F5E5'),
        canvas.revenueStreams.id
      )
    ];

    // Add title text
    const titleRect = new Rectangle("titleRect");
    titleRect.widthInPixels = 400;
    titleRect.heightInPixels = 60;
    titleRect.color = "transparent";
    titleRect.thickness = 0;
    titleRect.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    titleRect.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    titleRect.paddingTop = "20px";
    advancedTexture.addControl(titleRect);

    const titleText = new TextBlock("canvasTitle", canvas.name);
    titleText.color = "#1A202C";
    titleText.fontSize = 28;
    titleText.fontWeight = "bold";
    titleRect.addControl(titleText);

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle window resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      // Clean up floating panels
      floatingPanels.forEach((panelData, elementId) => {
        hideFloatingPanel(elementId);
      });
      
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, [canvas]);

  if (!canvas) return null;

  return (
    <div 
      className={`w-full h-full transition-all duration-500 ${
        isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};