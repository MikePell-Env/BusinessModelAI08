import React, { useRef, useEffect } from 'react';
import { Engine, Scene, ArcRotateCamera, Camera, HemisphericLight, PointLight, DirectionalLight, MeshBuilder, StandardMaterial, PBRMaterial, PBRMetallicRoughnessMaterial, Color3, Color4, Vector3, Mesh, ActionManager, ExecuteCodeAction, LinesMesh, Animation, CubeTexture, Texture, FreeCamera, SpotLight, DynamicTexture, ShadowGenerator, SceneLoader, AbstractMesh } from '@babylonjs/core';
import { AdvancedDynamicTexture, Rectangle, TextBlock, Control } from '@babylonjs/gui';
import '@babylonjs/loaders/glTF';
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

    // Initialize Babylon.js engine and scene with enhanced features
    const engine = new Engine(canvasRef.current, true, {
      antialias: true,
      stencil: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance"
    });
    const scene = new Scene(engine);
    
    // Enable image processing for photorealistic rendering
    scene.imageProcessingConfiguration.exposure = 1.0;
    scene.imageProcessingConfiguration.contrast = 1.1;
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = 1; // ACES tone mapping
    
    // Enable PBR environment for enhanced metallic reflections
    scene.environmentIntensity = 1.5; // Boost environment for better metallic reflections
    
    // Create default environment for PBR reflections with matching 2D background
    const defaultEnvironment = scene.createDefaultEnvironment({
      enableGroundShadow: false,
      enableGroundMirror: false,
      skyboxColor: new Color3(0.914, 0.925, 0.937), // Match 2D background #e9ecef
      groundColor: new Color3(0.914, 0.925, 0.937), // Match 2D background
      skyboxSize: 100
    });
    
    // Set background to match 2D view (#e9ecef = rgb(233, 236, 239))
    scene.clearColor = new Color4(0.914, 0.925, 0.937, 1);
    
    // Remove the default skybox if it exists and create white environment
    if (defaultEnvironment && defaultEnvironment.skybox) {
      defaultEnvironment.skybox.dispose();
    }
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Create camera with three-quarter view angle optimized for circular layout
    const camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 4 - Math.PI / 9,  // 45-degree + 20-degree clockwise rotation
      Math.PI / 3,         // 60-degree vertical angle for better perspective
      16,                  // Farther distance to see the expanded circular layout
      Vector3.Zero(),
      scene
    );
    camera.setTarget(Vector3.Zero());
    
    // Enable camera controls on the canvas
    camera.attachControl(canvasRef.current, true);
    
    // Set camera limits for better user experience with circular layout
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 30;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2.2;

    // Balanced photorealistic lighting setup
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.2; // Much lower ambient
    hemisphericLight.diffuse = new Color3(0.85, 0.9, 0.95); // Subtle cool ambient
    hemisphericLight.specular = new Color3(0.05, 0.05, 0.05);
    
    // Main directional light (key light) - enhanced for better shadows
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -0.5), scene);
    directionalLight.intensity = 0.8; // Increased for better shadow definition
    directionalLight.diffuse = new Color3(0.95, 0.93, 0.9); // Softer warm light
    directionalLight.specular = new Color3(0.9, 0.9, 0.9); // Enhanced specular for plastic shine
    
    // Create shadow generator for better shadow casting
    const shadowGenerator = new ShadowGenerator(2048, directionalLight); // High resolution shadows
    shadowGenerator.useExponentialShadowMap = true; // Softer shadow edges
    shadowGenerator.darkness = 0.3; // Moderate shadow darkness for visibility
    
    // Fill light for softer shadows - adjusted
    const fillLight = new DirectionalLight("fillLight", new Vector3(1, -0.5, 1), scene);
    fillLight.intensity = 0.3; // Slightly increased for better illumination
    fillLight.diffuse = new Color3(0.7, 0.8, 0.9); // Subtle cool fill light
    
    // Lower ambient lighting for better contrast
    scene.ambientColor = new Color3(0.1, 0.1, 0.1);

    // Create ground with plastic-like material that can receive shadows
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    const groundMaterial = new PBRMetallicRoughnessMaterial("groundMaterial", scene);
    
    // Plastic-like properties
    groundMaterial.baseColor = new Color3(0.98, 0.98, 0.98); // Slightly off-white for more realistic plastic
    groundMaterial.metallic = 0.0; // No metallic reflection
    groundMaterial.roughness = 0.3; // Semi-glossy plastic finish
    groundMaterial.clearCoat.isEnabled = true; // Add clear coat for plastic shine
    groundMaterial.clearCoat.intensity = 0.4; // Moderate clear coat intensity
    groundMaterial.clearCoat.roughness = 0.1; // Smooth clear coat
    
    // Enhanced lighting interaction for better shadows
    groundMaterial._directIntensity = 1.0; // Full direct lighting
    groundMaterial._environmentIntensity = 0.8; // Moderate environment reflection
    groundMaterial._specularIntensity = 0.6; // Plastic-like specular highlights
    
    ground.material = groundMaterial;
    ground.receiveShadows = true; // Enable shadow receiving

    // Create grid lines within floor bounds (20x14)
    const gridSpacing = 0.5;
    const gridLines = [];
    
    // Horizontal grid lines (within floor height of 14)
    for (let i = -7; i <= 7; i += gridSpacing) {
      const points = [new Vector3(-10, 0.01, i), new Vector3(10, 0.01, i)];
      const line = MeshBuilder.CreateLines(`hLine_${i}`, { points: points }, scene);
      const lineMaterial = new StandardMaterial(`hLineMaterial_${i}`, scene);
      lineMaterial.emissiveColor = new Color3(0.85, 0.85, 0.85); // Much lighter gray (30% opacity effect)
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
      lineMaterial.emissiveColor = new Color3(0.85, 0.85, 0.85); // Much lighter gray (30% opacity effect)
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

    // Helper function to load custom GLB model for business blocks
    const loadBusinessBlock = async (
      element: CanvasElement,
      position: Vector3,
      scale: Vector3,
      elementId: string
    ): Promise<AbstractMesh | null> => {
      // Map element IDs to GLB file names
      const modelFiles: { [key: string]: string } = {
        [canvas.keyPartners.id]: 'BMC_blender_04_KeyPartners_1753548050751.glb',
        [canvas.keyActivities.id]: 'BMC_blender_04_KeyActivities_1753548050750.glb',
        [canvas.keyResources.id]: 'BMC_blender_04_KeyResources_1753548050751.glb',
        [canvas.valuePropositions.id]: 'BMC_blender_04_ValueProposition_1753548050751.glb',
        [canvas.customerRelationships.id]: 'BMC_blender_04_CustomerRelationships_1753548050749.glb',
        [canvas.channels.id]: 'BMC_blender_04_CustomerChannels_1753548050749.glb',
        [canvas.customerSegments.id]: 'BMC_blender_04_CustomerSegments_1753548050750.glb',
        // Cost Structure and Revenue Streams will use fallback boxes since no GLB provided
      };

      const modelFile = modelFiles[elementId];
      if (!modelFile) {
        console.log(`No GLB model found for ${elementId}, using fallback geometry`);
        return null;
      }

      try {
        console.log(`Loading GLB model: ${modelFile} for ${element.title}`);
        const result = await SceneLoader.ImportMeshAsync("", "/models/", modelFile, scene);
        
        if (result.meshes.length > 0) {
          const rootMesh = result.meshes[0];
          
          // Set position and scale
          rootMesh.position = position;
          rootMesh.scaling = scale;
          
          // Apply materials and shadows to all child meshes
          result.meshes.forEach((mesh, index) => {
            if (mesh instanceof Mesh) {
              // Add to shadow generator
              shadowGenerator.addShadowCaster(mesh);
              
              // Apply special materials for specific elements
              if (elementId === canvas.customerSegments.id && mesh.material) {
                // Keep the original material for customer segments wood texture
                // But ensure it receives shadows properly
                mesh.receiveShadows = true;
              }
            }
          });
          
          // Add interaction to the root mesh
          rootMesh.actionManager = new ActionManager(scene);
          rootMesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, (evt) => {
            console.log(`Clicked on ${element.title}`);
            evt.sourceEvent?.stopPropagation();
            
            if (currentSelectedElement === elementId) {
              hideFloatingPanel(elementId);
            } else {
              showFloatingPanel(element, position, elementId);
            }
          }));

          // Add floating text label for the custom model
          const titleRect = new Rectangle(`titleRect_${elementId}`);
          titleRect.widthInPixels = 200;
          titleRect.heightInPixels = 60;
          titleRect.cornerRadius = 8;
          titleRect.color = "#333333";
          titleRect.thickness = 2;
          titleRect.background = "rgba(255, 255, 255, 0.9)";
          advancedTexture.addControl(titleRect);

          const titleText = new TextBlock(`titleText_${elementId}`, element.title);
          titleText.color = "#333333";
          titleText.fontSize = 16;
          titleText.fontWeight = "bold";
          titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
          titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
          titleRect.addControl(titleText);

          titleRect.linkWithMesh(rootMesh);
          titleRect.linkOffsetY = -80;
          
          return rootMesh;
        }
        
      } catch (error) {
        console.error(`Failed to load GLB model ${modelFile}:`, error);
      }
      
      return null;
    };

    // Helper function to create fallback business model block (for elements without GLB)
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
      
      // Create proper PBR metallic material for realistic metallic appearance
      const material = new PBRMetallicRoughnessMaterial(`material_${elementId}`, scene);
      
      // Special materials for specific boxes
      const keepOriginalColor = elementId === canvas.costStructure.id || 
                                elementId === canvas.revenueStreams.id || 
                                elementId === canvas.customerRelationships.id;
      
      if (elementId === canvas.customerSegments.id) {
        // Photorealistic wood finish for Customer Segments
        material.baseColor = new Color3(0.6, 0.4, 0.2); // Rich wood brown base
        material.metallic = 0.0; // Wood is non-metallic
        material.roughness = 0.7; // Natural wood texture roughness
        
        // Create procedural wood grain pattern using noise
        const woodTexture = new DynamicTexture("woodTexture", { width: 512, height: 512 }, scene);
        const context = woodTexture.getContext();
        
        // Generate wood grain pattern
        const canvas2d = document.createElement('canvas');
        canvas2d.width = 512;
        canvas2d.height = 512;
        const ctx = canvas2d.getContext('2d')!;
        const imageData = ctx.createImageData(512, 512);
        
        for (let y = 0; y < 512; y++) {
          for (let x = 0; x < 512; x++) {
            const index = (y * 512 + x) * 4;
            
            // Create wood grain using sine waves and noise
            const grain = Math.sin(x * 0.1) * 0.3 + Math.sin(x * 0.05 + y * 0.02) * 0.2;
            const noise = (Math.random() - 0.5) * 0.1;
            const woodValue = 0.3 + grain + noise;
            
            // Wood color variations (browns and tans)
            imageData.data[index] = Math.floor(153 * (1 + woodValue)); // Red
            imageData.data[index + 1] = Math.floor(102 * (1 + woodValue * 0.8)); // Green
            imageData.data[index + 2] = Math.floor(51 * (1 + woodValue * 0.6)); // Blue
            imageData.data[index + 3] = 255; // Alpha
          }
        }
        ctx.putImageData(imageData, 0, 0);
        
        // Copy to Babylon.js texture
        context.drawImage(canvas2d, 0, 0);
        woodTexture.update();
        
        material.baseTexture = woodTexture;
        
        // Wood finish properties
        material.clearCoat.isEnabled = true;
        material.clearCoat.intensity = 0.3; // Subtle wood varnish
        material.clearCoat.roughness = 0.6; // Satin finish
        
      } else if (keepOriginalColor) {
        material.baseColor = color; // Keep original color
        material.metallic = 0.9; // High metallic value
        material.roughness = 0.1; // Low roughness for high shine
      } else if (elementId === canvas.valuePropositions.id) {
        material.baseColor = new Color3(0.9, 0.9, 0.95); // Slightly off-white with subtle blue tint
        material.metallic = 0.9; // High metallic value
        material.roughness = 0.1; // Low roughness for high shine
      } else {
        material.baseColor = new Color3(0.75, 0.85, 1.0); // Light blue metallic base
        material.metallic = 0.9; // High metallic value
        material.roughness = 0.1; // Low roughness for high shine
      }
      
      // Use the scene's environment texture for reflections
      if (scene.environmentTexture) {
        material.environmentTexture = scene.environmentTexture;
      }
      
      // Transparency settings - Cost Structure is completely opaque
      if (elementId === canvas.costStructure.id) {
        material.alpha = 1.0; // Completely opaque
        // No transparency mode for opaque materials
      } else if (elementId === canvas.valuePropositions.id) {
        material.alpha = 0.95; // Central element less transparent
        material.transparencyMode = PBRMetallicRoughnessMaterial.PBRMATERIAL_ALPHABLEND;
      } else {
        material.alpha = 0.9; // Subtle transparency
        material.transparencyMode = PBRMetallicRoughnessMaterial.PBRMATERIAL_ALPHABLEND;
      }
      
      // Enable back face culling for better performance
      material.backFaceCulling = true;
      
      box.material = material;
      
      // Add to shadow generator for casting shadows
      shadowGenerator.addShadowCaster(box);

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

      // Add hover effects for PBR materials
      
      // Store original base color for hover restoration
      const originalBaseColor = material.baseColor.clone();
      
      box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        material.baseColor = new Color3(0.4, 0.7, 1.0); // Bright blue hover for PBR
        material.metallic = 0.95; // Increase metallic on hover
        material.roughness = 0.05; // Decrease roughness for extra shine
      }));

      box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        // Return to original values
        material.baseColor = originalBaseColor;
        material.metallic = 0.9; // Reset to original metallic
        material.roughness = 0.1; // Reset to original roughness
      }));

      // Create billboard text using GUI directly on screen (no mesh plane)
      const titleRect = new Rectangle(`titleRect_${elementId}`);
      titleRect.widthInPixels = 200;
      // Increase height for Revenue Streams and Cost Structure to accommodate title and counter
      const needsCounter = elementId === canvas.revenueStreams.id || elementId === canvas.costStructure.id;
      titleRect.heightInPixels = needsCounter ? 45 : 40; // 64 * 0.7 = 44.8, rounded to 45
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
      // For Revenue Streams and Cost Structure, position title at top of the larger panel
      titleText.textVerticalAlignment = needsCounter ? 
        Control.VERTICAL_ALIGNMENT_TOP : Control.VERTICAL_ALIGNMENT_CENTER;
      if (needsCounter) {
        titleText.paddingTopInPixels = 5;
      }
      titleRect.addControl(titleText);

      // Link to center of the box, positioned higher
      titleRect.linkWithMesh(box);
      // Special positioning for Value Propositions (taller box) - place label at the top
      const isValuePropositions = elementId === canvas.valuePropositions.id;
      titleRect.linkOffsetY = isValuePropositions ? -140 : -50; // Even higher for Value Propositions

      // Add counter inside the Revenue Streams and Cost Structure label panels
      if (elementId === canvas.revenueStreams.id) {
        const counterText = new TextBlock(`counter_${elementId}`, "$100M");
        counterText.color = "#1B5E20"; // Dark green
        counterText.fontSize = 14;
        counterText.fontWeight = "bold";
        counterText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        counterText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        counterText.paddingBottomInPixels = 5;
        titleRect.addControl(counterText);
        
        // Store reference for animation updates
        (titleRect as any).counterText = counterText;
      } else if (elementId === canvas.costStructure.id) {
        const counterText = new TextBlock(`counter_${elementId}`, "$100M");
        counterText.color = "#B71C1C"; // Dark red
        counterText.fontSize = 14;
        counterText.fontWeight = "bold";
        counterText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        counterText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        counterText.paddingBottomInPixels = 5;
        titleRect.addControl(counterText);
        
        // Store reference for animation updates
        (titleRect as any).counterText = counterText;
      }

      return box;
    };

    // Load custom GLB models for business model elements
    const loadAllModels = async () => {
      console.log('Loading custom GLB models for business model canvas...');
      
      // Define positions and scales matching the exact top view layout (3x bigger, positioned adjacent)
      const modelConfigs = [
        // Central Value Proposition (circular, center position)
        {
          element: canvas.valuePropositions,
          position: new Vector3(0, 0.5, 0),
          scale: new Vector3(75, 30, 75), // 3x bigger circle at center
          id: canvas.valuePropositions.id
        },
        // Far Left: Key Partners (tall left rectangle, adjacent to circle)
        {
          element: canvas.keyPartners,
          position: new Vector3(-4, 0.5, 0),
          scale: new Vector3(54, 30, 120), // 3x bigger, positioned closer to circle
          id: canvas.keyPartners.id
        },
        // Far Right: Customer Segments (tall right rectangle, adjacent to circle)  
        {
          element: canvas.customerSegments,
          position: new Vector3(4, 0.5, 0),
          scale: new Vector3(54, 30, 120), // 3x bigger, positioned closer to circle
          id: canvas.customerSegments.id
        },
        // Top Left: Key Activities (adjacent to circle from top-left)
        {
          element: canvas.keyActivities,
          position: new Vector3(-2, 0.5, 2),
          scale: new Vector3(75, 30, 45), // 3x bigger, closer to circle
          id: canvas.keyActivities.id
        },
        // Top Right: Customer Relationships (adjacent to circle from top-right)
        {
          element: canvas.customerRelationships,
          position: new Vector3(2, 0.5, 2),
          scale: new Vector3(75, 30, 45), // 3x bigger, closer to circle
          id: canvas.customerRelationships.id
        },
        // Bottom Left: Key Resources (adjacent to circle from bottom-left)
        {
          element: canvas.keyResources,
          position: new Vector3(-2, 0.5, -2),
          scale: new Vector3(75, 30, 45), // 3x bigger, closer to circle
          id: canvas.keyResources.id
        },
        // Bottom Right: Channels (adjacent to circle from bottom-right)
        {
          element: canvas.channels,
          position: new Vector3(2, 0.5, -2),
          scale: new Vector3(75, 30, 45), // 3x bigger, closer to circle
          id: canvas.channels.id
        }
      ];

      // Load all GLB models
      const loadedModels = [];
      for (const config of modelConfigs) {
        const model = await loadBusinessBlock(config.element, config.position, config.scale, config.id);
        if (model) {
          loadedModels.push(model);
        }
      }

      console.log(`Successfully loaded ${loadedModels.length} GLB models`);
      return loadedModels;
    };

    // Create fallback blocks for Cost Structure and Revenue Streams (no GLB models provided)
    const blocks = [
      // Bottom row: Cost Structure and Revenue Streams (positioned below the main layout)
      createBusinessBlock(
        canvas.costStructure,
        new Vector3(-3, 0.5, -5.5), // Bottom left, below main layout
        new Vector3(5, 1, 1.5), // Wide rectangle
        new Color3(1, 0.8, 0.8), // Slightly red color
        canvas.costStructure.id
      ),

      createBusinessBlock(
        canvas.revenueStreams,
        new Vector3(3, 0.5, -5.5), // Bottom right, below main layout
        new Vector3(5, 1, 1.5), // Wide rectangle
        new Color3(0.8, 1, 0.8), // Slightly green color
        canvas.revenueStreams.id
      )
    ];

    // Load custom models asynchronously
    loadAllModels().catch(error => {
      console.error('Error loading GLB models:', error);
    });

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
      
      // Update counter text based on animation frame for Revenue Streams and Cost Structure
      scene.onBeforeRenderObservable.add(() => {
        // Revenue Streams counter
        const revenueBox = scene.getMeshByName(`box_${canvas.revenueStreams.id}`);
        const revenueLabel = advancedTexture.getControlByName(`titleRect_${canvas.revenueStreams.id}`);
        if (revenueBox && revenueLabel && (revenueLabel as any).counterText) {
          const currentScale = revenueBox.scaling.y;
          const heightValue = Math.round(currentScale * 100);
          (revenueLabel as any).counterText.text = `$${heightValue}M`;
        }
        
        // Cost Structure counter
        const costBox = scene.getMeshByName(`box_${canvas.costStructure.id}`);
        const costLabel = advancedTexture.getControlByName(`titleRect_${canvas.costStructure.id}`);
        if (costBox && costLabel && (costLabel as any).counterText) {
          const currentScale = costBox.scaling.y;
          const heightValue = Math.round(currentScale * 100);
          (costLabel as any).counterText.text = `$${heightValue}M`;
        }
      });
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
      const originalMaterial = customerRelationshipsBox.material as PBRMetallicRoughnessMaterial;
      const originalColor = originalMaterial.baseColor.clone();
      
      // Create color animation for flashing effect
      const flashAnimation = new Animation(
        "customerRelationshipsFlash",
        "material.baseColor",
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
    <div className="w-full h-full"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};