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

    // Create lighting
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    light.intensity = 0.8;

    // Create ground
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = new Color3(0.97, 0.98, 0.99);
    ground.material = groundMaterial;

    // Create GUI
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    
    // Store floating panels and connecting lines
    const floatingPanels = new Map<string, { panel: Mesh, line: LinesMesh, gui: Rectangle }>();
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
      
      // Create panel material
      const panelMaterial = new StandardMaterial(`panelMaterial_${elementId}`, scene);
      panelMaterial.diffuseColor = new Color3(0.95, 0.95, 0.95);
      panelMaterial.alpha = 0.9;
      panel.material = panelMaterial;

      // Create connecting line in red
      const linePoints = [boxPosition, panelPosition];
      const line = MeshBuilder.CreateLines(`line_${elementId}`, { points: linePoints }, scene);
      
      // Create red material for the line
      const lineMaterial = new StandardMaterial(`lineMaterial_${elementId}`, scene);
      lineMaterial.diffuseColor = new Color3(0.8, 0.2, 0.2); // Red color
      lineMaterial.emissiveColor = new Color3(0.3, 0.1, 0.1); // Slight glow
      line.material = lineMaterial;

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

      // Close button
      const closeButton = new TextBlock(`closeBtn_${elementId}`, "✕");
      closeButton.color = "#E53E3E";
      closeButton.fontSize = 18;
      closeButton.fontWeight = "bold";
      closeButton.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      closeButton.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      closeButton.paddingTop = "10px";
      closeButton.paddingRight = "15px";
      closeButton.widthInPixels = 30;
      closeButton.heightInPixels = 30;
      closeButton.isPointerBlocker = true;
      panelRect.addControl(closeButton);

      // Add close button interaction
      closeButton.onPointerClickObservable.add(() => {
        hideFloatingPanel(elementId);
      });

      // Link panel GUI to 3D position
      panelRect.linkWithMesh(panel);
      panelRect.linkOffsetY = -125;

      return { panel, line, gui: panelRect };
    };

    // Function to show floating panel
    const showFloatingPanel = (element: CanvasElement, boxPosition: Vector3, elementId: string) => {
      console.log(`Showing panel for ${elementId}`);
      
      // Hide any existing panel first
      if (currentSelectedElement && floatingPanels.has(currentSelectedElement)) {
        const currentPanel = floatingPanels.get(currentSelectedElement);
        if (currentPanel) {
          currentPanel.panel.dispose();
          currentPanel.line.dispose();
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
        panelData.line.dispose();
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

      // Create GUI for title only
      const rect = new Rectangle(`rect_${elementId}`);
      rect.widthInPixels = 180;
      rect.heightInPixels = 60;
      rect.cornerRadius = 8;
      rect.color = "transparent";
      rect.thickness = 0;
      advancedTexture.addControl(rect);

      // Title text only
      const titleText = new TextBlock(`title_${elementId}`, element.title);
      titleText.color = "#2D3748";
      titleText.fontSize = 16;
      titleText.fontWeight = "bold";
      titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      rect.addControl(titleText);

      // Link GUI to 3D position
      rect.linkWithMesh(box);
      rect.linkOffsetY = -30;

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

      // Row 3: Cost Structure (spans 5 columns)
      createBusinessBlock(
        canvas.costStructure,
        new Vector3(-1, 0.5, -2.5),
        new Vector3(4.5, 1, 1),
        Color3.FromHexString(canvas.costStructure.color || '#F0F0F0'),
        canvas.costStructure.id
      ),

      // Row 3: Revenue Streams (spans 5 columns)
      createBusinessBlock(
        canvas.revenueStreams,
        new Vector3(1, 0.5, -2.5),
        new Vector3(4.5, 1, 1),
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