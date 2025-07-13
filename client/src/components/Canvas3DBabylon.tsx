import React, { useRef, useEffect } from 'react';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, PointLight, MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3, Mesh, ActionManager, ExecuteCodeAction, LinesMesh, Animation } from '@babylonjs/core';
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
    
    // Set white background
    scene.clearColor = new Color3(1, 1, 1);
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Create camera with three-quarter view angle (rotated 20 degrees clockwise)
    const camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 4 - Math.PI / 9,  // 45-degree + 20-degree clockwise rotation
      Math.PI / 3,         // 60-degree vertical angle for better perspective
      14,                  // Slightly farther distance to see more of the scene
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

    // Create moderate lighting for scene
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.6;
    hemisphericLight.diffuse = new Color3(1, 1, 1);
    hemisphericLight.specular = new Color3(0.3, 0.3, 0.3);
    
    // Reduce ambient lighting to show floor texture
    scene.ambientColor = new Color3(0.4, 0.4, 0.4);

    // Create ground with grid pattern
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = new Color3(1, 1, 1); // Pure white
    groundMaterial.emissiveColor = new Color3(0.2, 0.2, 0.2); // Self-illumination to ensure white appearance
    groundMaterial.disableLighting = false; // Keep lighting but boost brightness
    ground.material = groundMaterial;

    // Create grid lines within floor bounds (20x14)
    const gridSpacing = 0.5;
    const gridLines = [];
    
    // Horizontal grid lines (within floor height of 14)
    for (let i = -7; i <= 7; i += gridSpacing) {
      const points = [new Vector3(-10, 0.01, i), new Vector3(10, 0.01, i)];
      const line = MeshBuilder.CreateLines(`hLine_${i}`, { points: points }, scene);
      const lineMaterial = new StandardMaterial(`hLineMaterial_${i}`, scene);
      lineMaterial.emissiveColor = new Color3(1, 1, 1); // Pure white
      lineMaterial.diffuseColor = new Color3(0, 0, 0); // No diffuse reflection
      lineMaterial.disableLighting = true; // Ignore lighting
      line.material = lineMaterial;
      gridLines.push(line);
    }
    
    // Vertical grid lines (within floor width of 20)
    for (let i = -10; i <= 10; i += gridSpacing) {
      const points = [new Vector3(i, 0.01, -7), new Vector3(i, 0.01, 7)];
      const line = MeshBuilder.CreateLines(`vLine_${i}`, { points: points }, scene);
      const lineMaterial = new StandardMaterial(`vLineMaterial_${i}`, scene);
      lineMaterial.emissiveColor = new Color3(1, 1, 1); // Pure white
      lineMaterial.diffuseColor = new Color3(0, 0, 0); // No diffuse reflection
      lineMaterial.disableLighting = true; // Ignore lighting
      line.material = lineMaterial;
      gridLines.push(line);
    }

    // Create frame around the floor plane (extruded appearance)
    const frameHeight = 0.2; // 20px equivalent in 3D units
    const frameThickness = 0.1;
    
    // Front frame (positive Z)
    const frontFrame = MeshBuilder.CreateBox("frontFrame", { 
      width: 20 + (frameThickness * 2), 
      height: frameHeight, 
      depth: frameThickness 
    }, scene);
    frontFrame.position = new Vector3(0, frameHeight / 2, 7 + frameThickness / 2);
    
    // Back frame (negative Z)
    const backFrame = MeshBuilder.CreateBox("backFrame", { 
      width: 20 + (frameThickness * 2), 
      height: frameHeight, 
      depth: frameThickness 
    }, scene);
    backFrame.position = new Vector3(0, frameHeight / 2, -7 - frameThickness / 2);
    
    // Left frame (negative X)
    const leftFrame = MeshBuilder.CreateBox("leftFrame", { 
      width: frameThickness, 
      height: frameHeight, 
      depth: 14 
    }, scene);
    leftFrame.position = new Vector3(-10 - frameThickness / 2, frameHeight / 2, 0);
    
    // Right frame (positive X)
    const rightFrame = MeshBuilder.CreateBox("rightFrame", { 
      width: frameThickness, 
      height: frameHeight, 
      depth: 14 
    }, scene);
    rightFrame.position = new Vector3(10 + frameThickness / 2, frameHeight / 2, 0);
    
    // Create frame material (slightly darker than the floor)
    const frameMaterial = new StandardMaterial("frameMaterial", scene);
    frameMaterial.diffuseColor = new Color3(0.85, 0.85, 0.85); // Light gray
    frameMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1); // Slight self-illumination
    frameMaterial.disableLighting = false;
    
    // Apply material to all frame pieces
    frontFrame.material = frameMaterial;
    backFrame.material = frameMaterial;
    leftFrame.material = frameMaterial;
    rightFrame.material = frameMaterial;

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
      panelRect.color = "#1e40af"; // Blue border
      panelRect.thickness = 3;
      panelRect.background = "#FFFFFF";
      panelRect.alpha = 0.75; // 75% opacity
      advancedTexture.addControl(panelRect);

      // Panel title
      const panelTitle = new TextBlock(`panelTitle_${elementId}`, element.title);
      panelTitle.color = "#1e3a8a"; // Dark blue
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
      panelContent.color = "#1e40af"; // Dark blue
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
      
      // Create material with custom color and transparency
      const material = new StandardMaterial(`material_${elementId}`, scene);
      material.diffuseColor = color; // Use the provided color
      material.specularColor = new Color3(0.5, 0.5, 0.5); // Moderate specular reflection
      material.emissiveColor = new Color3(0.1, 0.1, 0.1); // Slight glow
      // Make Value Propositions opaque, others semi-transparent
      material.alpha = elementId === canvas.valuePropositions.id ? 1.0 : 0.8;
      
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

      // Add hover effect for standard material
      box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        material.diffuseColor = new Color3(0.29, 0.56, 0.89); // Blue hover
      }));

      box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        material.diffuseColor = color; // Return to original color
      }));

      // Create billboard text using GUI directly on screen (no mesh plane)
      const titleRect = new Rectangle(`titleRect_${elementId}`);
      titleRect.widthInPixels = 200;
      titleRect.heightInPixels = 40;
      titleRect.color = "rgba(255, 255, 255, 0.5)"; // White translucent border
      titleRect.background = "rgba(255, 255, 255, 0.5)"; // 50% transparent white background
      titleRect.thickness = 1;
      advancedTexture.addControl(titleRect);

      // Title text with billboard behavior
      const titleText = new TextBlock(`title_${elementId}`, element.title);
      titleText.color = "#2D3748";
      titleText.fontSize = 16;
      titleText.fontWeight = "bold";
      titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      titleRect.addControl(titleText);

      // Link to center of the box, positioned higher
      titleRect.linkWithMesh(box);
      // Special positioning for Value Propositions (taller box) - place label at the top
      const isValuePropositions = elementId === canvas.valuePropositions.id;
      titleRect.linkOffsetY = isValuePropositions ? -140 : -50; // Even higher for Value Propositions

      return box;
    };

    // Create business model canvas blocks matching 2D grid layout
    const blocks = [
      // Column 1-2: Key Partners (left, spans 2 rows)
      createBusinessBlock(
        canvas.keyPartners,
        new Vector3(-4, 0.5, 0),
        new Vector3(1.8, 1, 2.5),
        new Color3(1, 1, 1), // White
        canvas.keyPartners.id
      ),

      // Column 3-4: Key Activities (top)
      createBusinessBlock(
        canvas.keyActivities,
        new Vector3(-2, 0.5, 1),
        new Vector3(1.8, 1, 1.2),
        new Color3(1, 1, 1), // White
        canvas.keyActivities.id
      ),

      // Column 3-4: Key Resources (bottom)
      createBusinessBlock(
        canvas.keyResources,
        new Vector3(-2, 0.5, -1),
        new Vector3(1.8, 1, 1.2),
        new Color3(1, 1, 1), // White
        canvas.keyResources.id
      ),

      // Column 5-6: Value Propositions (center, spans 2 rows) - double height
      createBusinessBlock(
        canvas.valuePropositions,
        new Vector3(0, 1, 0), // Moved up to center the taller box
        new Vector3(1.8, 2, 2.5), // Double height (2 instead of 1)
        new Color3(1, 1, 1), // White
        canvas.valuePropositions.id
      ),

      // Column 7-8: Customer Relationships (top)
      createBusinessBlock(
        canvas.customerRelationships,
        new Vector3(2, 0.5, 1),
        new Vector3(1.8, 1, 1.2),
        new Color3(1, 1, 1), // White
        canvas.customerRelationships.id
      ),

      // Column 7-8: Channels (bottom)
      createBusinessBlock(
        canvas.channels,
        new Vector3(2, 0.5, -1),
        new Vector3(1.8, 1, 1.2),
        new Color3(1, 1, 1), // White
        canvas.channels.id
      ),

      // Column 9-10: Customer Segments (right, spans 2 rows)
      createBusinessBlock(
        canvas.customerSegments,
        new Vector3(4, 0.5, 0),
        new Vector3(1.8, 1, 2.5),
        new Color3(1, 1, 1), // White
        canvas.customerSegments.id
      ),

      // Row 3: Cost Structure (left aligned with Key Partners) - with red color and animation
      createBusinessBlock(
        canvas.costStructure,
        new Vector3(-2, 0.5, -2.5),
        new Vector3(3.8, 1, 1),
        new Color3(1, 0.8, 0.8), // Slightly red color
        canvas.costStructure.id
      ),

      // Row 3: Revenue Streams (right side) - with green color and animation
      createBusinessBlock(
        canvas.revenueStreams,
        new Vector3(2, 0.5, -2.5),
        new Vector3(3.8, 1, 1),
        new Color3(0.8, 1, 0.8), // Slightly green color
        canvas.revenueStreams.id
      )
    ];

    // Find the revenue streams box and add height animation
    const revenueStreamsBox = scene.getMeshByName(`box_${canvas.revenueStreams.id}`);
    if (revenueStreamsBox) {
      const originalY = revenueStreamsBox.position.y; // Store original Y position (0.5)
      
      // Create height scaling animation
      const animationHeight = new Animation(
        "revenueHeightAnimation",
        "scaling.y",
        30, // 30 FPS
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );

      // Create position animation to keep bottom aligned to floor
      const animationPosition = new Animation(
        "revenuePositionAnimation",
        "position.y",
        30, // 30 FPS
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );

      // Define height scaling keys (now goes above original height)
      const heightKeys = [];
      heightKeys.push({
        frame: 0,
        value: 1.0 // Full height
      });
      heightKeys.push({
        frame: 30, // 1 second - grow above original
        value: 1.3 // 130% of original height
      });
      heightKeys.push({
        frame: 60, // 2 seconds - shrink to minimum
        value: 0.5 // Half height
      });
      heightKeys.push({
        frame: 90, // 3 seconds - complete cycle
        value: 1.0 // Back to full height
      });

      // Define position keys to keep bottom aligned
      const positionKeys = [];
      positionKeys.push({
        frame: 0,
        value: originalY // Original position (0.5)
      });
      positionKeys.push({
        frame: 30, // 1 second - move up for taller height
        value: originalY + 0.15 // Move up when growing taller
      });
      positionKeys.push({
        frame: 60, // 2 seconds - move down for shorter height
        value: originalY - 0.25 // Move down to keep bottom on floor
      });
      positionKeys.push({
        frame: 90, // 3 seconds - complete cycle
        value: originalY // Back to original position
      });

      animationHeight.setKeys(heightKeys);
      animationPosition.setKeys(positionKeys);
      revenueStreamsBox.animations = [animationHeight, animationPosition];
      
      // Start both animations
      scene.beginAnimation(revenueStreamsBox, 0, 90, true);
      
      // Animate the label to follow the box height
      const revenueLabel = advancedTexture.getControlByName(`titleRect_${canvas.revenueStreams.id}`);
      if (revenueLabel) {
        const labelAnimation = new Animation(
          "revenueLabelAnimation",
          "linkOffsetY",
          30,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const labelKeys = [];
        labelKeys.push({
          frame: 0,
          value: -50 // Original label position
        });
        labelKeys.push({
          frame: 30, // 1 second - box at 130% height
          value: -65 // Move label higher with taller box
        });
        labelKeys.push({
          frame: 60, // 2 seconds - box at 50% height
          value: -25 // Move label lower with shorter box
        });
        labelKeys.push({
          frame: 90, // 3 seconds - back to original
          value: -50 // Back to original position
        });
        
        labelAnimation.setKeys(labelKeys);
        revenueLabel.animations = [labelAnimation];
        scene.beginAnimation(revenueLabel, 0, 90, true);
      }
    }

    // Find the cost structure box and add faster height animation  
    const costStructureBox = scene.getMeshByName(`box_${canvas.costStructure.id}`);
    if (costStructureBox) {
      const originalY = costStructureBox.position.y; // Store original Y position (0.5)
      
      // Create height scaling animation (faster - 2 seconds per cycle)
      const animationHeight = new Animation(
        "costHeightAnimation",
        "scaling.y",
        30, // 30 FPS
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );

      // Create position animation to keep bottom aligned to floor
      const animationPosition = new Animation(
        "costPositionAnimation",
        "position.y",
        30, // 30 FPS
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );

      // Define height scaling keys (2 seconds per cycle = 60 frames at 30 FPS)
      const heightKeys = [];
      heightKeys.push({
        frame: 0,
        value: 1.0 // Full height
      });
      heightKeys.push({
        frame: 30, // 1 second
        value: 0.33 // One third height
      });
      heightKeys.push({
        frame: 60, // 2 seconds - complete cycle
        value: 1.0 // Back to full height
      });

      // Define position keys to keep bottom aligned (when height is 0.33, move down by 0.335)
      const positionKeys = [];
      positionKeys.push({
        frame: 0,
        value: originalY // Original position (0.5)
      });
      positionKeys.push({
        frame: 30, // 1 second
        value: originalY - 0.335 // Move down to keep bottom on floor
      });
      positionKeys.push({
        frame: 60, // 2 seconds - complete cycle
        value: originalY // Back to original position
      });

      animationHeight.setKeys(heightKeys);
      animationPosition.setKeys(positionKeys);
      costStructureBox.animations = [animationHeight, animationPosition];
      
      // Start both animations
      scene.beginAnimation(costStructureBox, 0, 60, true);
      
      // Animate the label to follow the box height
      const costLabel = advancedTexture.getControlByName(`titleRect_${canvas.costStructure.id}`);
      if (costLabel) {
        const labelAnimation = new Animation(
          "costLabelAnimation",
          "linkOffsetY",
          30,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const labelKeys = [];
        labelKeys.push({
          frame: 0,
          value: -50 // Original label position
        });
        labelKeys.push({
          frame: 30, // 1 second - box at 33% height
          value: -35 // Move label much lower with shorter box
        });
        labelKeys.push({
          frame: 60, // 2 seconds - back to full height
          value: -50 // Back to original position
        });
        
        labelAnimation.setKeys(labelKeys);
        costLabel.animations = [labelAnimation];
        scene.beginAnimation(costLabel, 0, 60, true);
      }
    }

    // Add flashing red animation to Customer Relationships box
    const customerRelationshipsBox = scene.getMeshByName(`box_${canvas.customerRelationships.id}`);
    if (customerRelationshipsBox) {
      const originalMaterial = customerRelationshipsBox.material as StandardMaterial;
      const originalColor = originalMaterial.diffuseColor.clone();
      
      // Create color animation for flashing effect
      const flashAnimation = new Animation(
        "customerRelationshipsFlash",
        "material.diffuseColor",
        30, // 30 FPS
        Animation.ANIMATIONTYPE_COLOR3,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );
      
      // Define flashing pattern: 3 red flashes, then delay, then yellow for 2 seconds
      const flashKeys = [];
      
      // Start with original color (frames 0-89: 3 seconds normal)
      flashKeys.push({
        frame: 0,
        value: originalColor.clone()
      });
      flashKeys.push({
        frame: 90, // 3 seconds
        value: originalColor.clone()
      });
      
      // First red flash (frames 90-105)
      flashKeys.push({
        frame: 95, // Flash red
        value: new Color3(1, 0, 0) // Bright red
      });
      flashKeys.push({
        frame: 105, // Back to normal
        value: originalColor.clone()
      });
      
      // Second red flash (frames 120-135)
      flashKeys.push({
        frame: 125, // Flash red
        value: new Color3(1, 0, 0) // Bright red
      });
      flashKeys.push({
        frame: 135, // Back to normal
        value: originalColor.clone()
      });
      
      // Third red flash (frames 150-165)
      flashKeys.push({
        frame: 155, // Flash red
        value: new Color3(1, 0, 0) // Bright red
      });
      flashKeys.push({
        frame: 165, // Back to normal
        value: originalColor.clone()
      });
      
      // 2-second delay after red flashing (frames 165-225: stay normal)
      flashKeys.push({
        frame: 225, // 2 seconds after last red flash
        value: originalColor.clone()
      });
      
      // Stay yellow for 2 seconds (frames 225-285)
      flashKeys.push({
        frame: 225, // Start yellow
        value: new Color3(1, 0.84, 0) // Golden yellow
      });
      flashKeys.push({
        frame: 285, // End yellow after 2 seconds
        value: new Color3(1, 0.84, 0) // Golden yellow
      });
      
      // Return to normal for end of cycle (frames 285-300)
      flashKeys.push({
        frame: 300, // 10 seconds - complete cycle
        value: originalColor.clone()
      });
      
      flashAnimation.setKeys(flashKeys);
      customerRelationshipsBox.animations = [flashAnimation];
      
      // Start the flashing animation
      scene.beginAnimation(customerRelationshipsBox, 0, 300, true);
    }

    // Add title text
    const titleRect = new Rectangle("titleRect");
    titleRect.widthInPixels = 800;
    titleRect.heightInPixels = 50;
    titleRect.color = "transparent";
    titleRect.thickness = 0;
    titleRect.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    titleRect.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    titleRect.paddingTop = "24px";
    advancedTexture.addControl(titleRect);

    // Main title
    const titleText = new TextBlock("canvasTitle", canvas.name);
    titleText.color = "#111827"; // Match 2D view's text-gray-900
    titleText.fontSize = 30; // Match 2D view's text-3xl (30px)
    titleText.fontWeight = "900"; // Match 2D view's font-bold weight
    titleText.fontFamily = "Inter, system-ui, sans-serif";
    titleText.textWrapping = true;
    titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    titleRect.addControl(titleText);

    // Subtitle in separate container positioned below title
    const subtitleRect = new Rectangle("subtitleRect");
    subtitleRect.widthInPixels = 800;
    subtitleRect.heightInPixels = 30;
    subtitleRect.color = "transparent";
    subtitleRect.thickness = 0;
    subtitleRect.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    subtitleRect.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    subtitleRect.paddingTop = "120px"; // Position further below title
    advancedTexture.addControl(subtitleRect);

    const subtitleText = new TextBlock("canvasSubtitle", canvas.description);
    subtitleText.color = "#4B5563"; // Match 2D view's text-gray-600
    subtitleText.fontSize = 16; // Smaller than title
    subtitleText.fontWeight = "normal";
    subtitleText.fontFamily = "Inter, system-ui, sans-serif";
    subtitleText.textWrapping = true;
    subtitleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    subtitleRect.addControl(subtitleText);

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
      className={`w-full h-full transition-all duration-1000 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        transform: isTransitioning ? 'perspective(1000px) rotateX(-75deg) rotateY(20deg) scale(0.8)' : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
        transformOrigin: 'center top',
        transition: 'transform 1000ms ease-in-out, opacity 500ms ease-in-out'
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};