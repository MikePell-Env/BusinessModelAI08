import React, { useRef, useEffect } from 'react';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, PointLight, DirectionalLight, MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3, Mesh, ActionManager, ExecuteCodeAction, LinesMesh, Animation, CubeTexture, Texture, FreeCamera, SpotLight, DynamicTexture, ShadowGenerator, ShaderMaterial, Effect } from '@babylonjs/core';
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
    
    // Enable PBR environment
    scene.environmentIntensity = 0.8;
    
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

    // Balanced photorealistic lighting setup
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.2; // Much lower ambient
    hemisphericLight.diffuse = new Color3(0.85, 0.9, 0.95); // Subtle cool ambient
    hemisphericLight.specular = new Color3(0.05, 0.05, 0.05);
    
    // Main directional light (key light) - reduced intensity
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -0.5), scene);
    directionalLight.intensity = 0.6; // Significantly reduced from 1.2
    directionalLight.diffuse = new Color3(0.95, 0.93, 0.9); // Softer warm light
    directionalLight.specular = new Color3(0.8, 0.8, 0.8);
    
    // Fill light for softer shadows - reduced
    const fillLight = new DirectionalLight("fillLight", new Vector3(1, -0.5, 1), scene);
    fillLight.intensity = 0.2; // Reduced from 0.4
    fillLight.diffuse = new Color3(0.7, 0.8, 0.9); // Subtle cool fill light
    
    // Lower ambient lighting for better contrast
    scene.ambientColor = new Color3(0.1, 0.1, 0.1);

    // Create ground with grid pattern that can receive shadows
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = new Color3(1, 1, 1); // Pure white
    groundMaterial.emissiveColor = new Color3(0.2, 0.2, 0.2); // Self-illumination to ensure white appearance
    groundMaterial.disableLighting = false; // Keep lighting but boost brightness
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
      
      // Create photorealistic materials based on element type
      let material: StandardMaterial | PBRMaterial | ShaderMaterial;
      
      if (elementId === canvas.keyResources.id) {
        // Define custom wood shader for procedural wood grain
        const woodVertexShader = `
          precision highp float;
          
          attribute vec3 position;
          attribute vec3 normal;
          attribute vec2 uv;
          
          uniform mat4 worldViewProjection;
          uniform mat4 world;
          uniform mat4 view;
          uniform vec3 cameraPosition;
          
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying vec2 vUV;
          varying vec3 vWorldPosition;
          varying vec3 vViewDirection;
          
          void main(void) {
            vec4 worldPos = world * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            vPosition = position;
            vNormal = normalize((world * vec4(normal, 0.0)).xyz);
            vUV = uv;
            vViewDirection = normalize(cameraPosition - worldPos.xyz);
            
            gl_Position = worldViewProjection * vec4(position, 1.0);
          }
        `;
        
        const woodFragmentShader = `
          precision highp float;
          
          uniform vec3 lightPosition;
          uniform vec3 lightColor;
          uniform vec3 cameraPosition;
          uniform float time;
          
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying vec2 vUV;
          varying vec3 vWorldPosition;
          varying vec3 vViewDirection;
          
          // Noise functions for wood grain
          float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
          }
          
          float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            
            vec2 u = f * f * (3.0 - 2.0 * f);
            
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }
          
          float fbm(vec2 st) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 0.0;
            
            for (int i = 0; i < 5; i++) {
              value += amplitude * noise(st);
              st *= 2.0;
              amplitude *= 0.5;
            }
            return value;
          }
          
          vec3 getWoodColor(vec2 uv) {
            // Scale UV for wood grain pattern
            vec2 woodUV = uv * 12.0;
            
            // Create concentric wood rings with variations
            vec2 center = vec2(6.0, 6.0);
            float dist = length(woodUV - center);
            float rings = sin(dist * 2.5 + time * 0.5) * 0.4 + 0.6;
            
            // Add multiple layers of noise for complex grain
            float grain1 = fbm(woodUV * 1.5 + vec2(time * 0.1, 0.0));
            float grain2 = fbm(woodUV * 3.0 + vec2(0.0, time * 0.05));
            float grain3 = noise(woodUV * 8.0) * 0.3;
            
            // Create wood knots
            float knot1 = 1.0 - smoothstep(0.0, 2.0, length(woodUV - vec2(3.0, 4.0)));
            float knot2 = 1.0 - smoothstep(0.0, 1.5, length(woodUV - vec2(8.0, 7.0)));
            float knots = knot1 * 0.6 + knot2 * 0.4;
            
            // Combine all patterns
            float pattern = rings * 0.5 + grain1 * 0.3 + grain2 * 0.15 + grain3 * 0.05;
            pattern = mix(pattern, pattern * 0.3, knots);
            
            // Rich walnut wood colors with more variation
            vec3 darkWood = vec3(0.18, 0.10, 0.06);
            vec3 mediumWood = vec3(0.32, 0.20, 0.12);
            vec3 lightWood = vec3(0.52, 0.35, 0.22);
            
            // Three-way color blending for more realistic wood
            vec3 woodColor = mix(darkWood, mediumWood, smoothstep(0.3, 0.7, pattern));
            woodColor = mix(woodColor, lightWood, smoothstep(0.6, 0.9, pattern));
            
            return woodColor;
          }
          
          void main(void) {
            vec3 woodColor = getWoodColor(vUV);
            
            // Advanced lighting calculation
            vec3 lightDir = normalize(lightPosition - vWorldPosition);
            float NdotL = max(dot(vNormal, lightDir), 0.0);
            
            // Multiple specular highlights for lacquer finish
            vec3 reflectDir = reflect(-lightDir, vNormal);
            float spec1 = pow(max(dot(vViewDirection, reflectDir), 0.0), 64.0); // Sharp highlight
            float spec2 = pow(max(dot(vViewDirection, reflectDir), 0.0), 16.0); // Broader highlight
            
            // Fresnel effect for realistic reflections
            float fresnel = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), 2.0);
            
            // Subsurface scattering approximation
            vec3 scatterDir = lightDir + vNormal * 0.3;
            float scatter = max(0.0, dot(-vViewDirection, scatterDir));
            scatter = pow(scatter, 4.0) * 0.5;
            
            // Combine all lighting components
            vec3 diffuse = woodColor * lightColor * NdotL;
            vec3 specular = vec3(0.4) * spec1 + vec3(0.2) * spec2;
            vec3 ambient = woodColor * 0.25;
            vec3 subsurface = woodColor * scatter * vec3(0.8, 0.4, 0.2);
            vec3 rim = vec3(0.3, 0.2, 0.1) * fresnel * 0.5;
            
            vec3 finalColor = ambient + diffuse + specular + subsurface + rim;
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `;
        
        // Register the shader effect
        Effect.ShadersStore["woodVertexShader"] = woodVertexShader;
        Effect.ShadersStore["woodFragmentShader"] = woodFragmentShader;
        
        // Create the shader material
        const woodMaterial = new ShaderMaterial(`woodShader_${elementId}`, scene, {
          vertex: "wood",
          fragment: "wood",
        }, {
          attributes: ["position", "normal", "uv"],
          uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "cameraPosition", "lightPosition", "lightColor", "time"]
        });
        
        // Set shader uniforms
        woodMaterial.setVector3("lightPosition", new Vector3(2, 4, 2));
        woodMaterial.setVector3("lightColor", new Color3(1, 0.95, 0.85));
        woodMaterial.setFloat("time", 0);
        
        material = woodMaterial;
        
        // Create dedicated warm spotlight for Key Resources
        const keyResourcesSpotlight = new SpotLight(
          `keyResourcesLight_${elementId}`,
          new Vector3(-1, 3, -0.5),
          new Vector3(0.2, -1, -0.2),
          Math.PI / 6,
          2,
          scene
        );
        keyResourcesSpotlight.intensity = 1.2;
        keyResourcesSpotlight.diffuse = new Color3(1, 0.95, 0.85);
        keyResourcesSpotlight.specular = new Color3(1, 1, 0.9);
        
        // Add point light for ambient wood illumination
        const woodAmbientLight = new PointLight(
          `woodAmbient_${elementId}`,
          new Vector3(-1.5, 1.5, -0.8),
          scene
        );
        woodAmbientLight.intensity = 0.8;
        woodAmbientLight.diffuse = new Color3(0.95, 0.85, 0.75);
        woodAmbientLight.range = 4;
        
      } else {
        // Standard material for other elements with enhanced properties
        const standardMaterial = new StandardMaterial(`material_${elementId}`, scene);
        
        // Use light blue for most boxes, keep original colors for specific ones
        const keepOriginalColor = elementId === canvas.costStructure.id || 
                                  elementId === canvas.revenueStreams.id || 
                                  elementId === canvas.customerRelationships.id;
        
        if (keepOriginalColor) {
          standardMaterial.diffuseColor = color; // Keep original color
        } else if (elementId === canvas.valuePropositions.id) {
          standardMaterial.diffuseColor = new Color3(1.0, 1.0, 1.0); // White for Value Propositions
        } else {
          standardMaterial.diffuseColor = new Color3(0.7, 0.85, 1.0); // Light blue
        }
        
        standardMaterial.specularColor = new Color3(0.5, 0.5, 0.5); // Moderate specular reflection
        standardMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1); // Slight glow
        // Make Value Propositions slightly translucent, others more translucent
        standardMaterial.alpha = elementId === canvas.valuePropositions.id ? 0.8 : 0.6;
        
        material = standardMaterial;
      }
      
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

      // Add hover effects based on material type
      if (elementId === canvas.keyResources.id) {
        // Special hover for wood shader material
        box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
          const woodMat = material as ShaderMaterial;
          woodMat.setVector3("lightColor", new Color3(1.2, 1.1, 1.0)); // Brighter light on hover
        }));

        box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
          const woodMat = material as ShaderMaterial;
          woodMat.setVector3("lightColor", new Color3(1, 0.95, 0.85)); // Return to original light
        }));
      } else {
        // Standard hover effects for other materials
        const stdMaterial = material as StandardMaterial;
        const keepOriginalColor = elementId === canvas.costStructure.id || 
                                  elementId === canvas.revenueStreams.id || 
                                  elementId === canvas.customerRelationships.id;
        
        box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
          stdMaterial.diffuseColor = new Color3(0.29, 0.56, 0.89); // Blue hover
        }));

        box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
          // Return to the correct color based on element type
          if (keepOriginalColor) {
            stdMaterial.diffuseColor = color; // Return to original color
          } else if (elementId === canvas.valuePropositions.id) {
            stdMaterial.diffuseColor = new Color3(1.0, 1.0, 1.0); // Return to white
          } else {
            stdMaterial.diffuseColor = new Color3(0.7, 0.85, 1.0); // Return to light blue
          }
        }));
      }

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
        const counterText = new TextBlock(`counter_${elementId}`, "$100");
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
        const counterText = new TextBlock(`counter_${elementId}`, "$100");
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
      
      // Update counter text based on animation frame for Revenue Streams and Cost Structure
      scene.onBeforeRenderObservable.add(() => {
        // Revenue Streams counter
        const revenueBox = scene.getMeshByName(`box_${canvas.revenueStreams.id}`);
        const revenueLabel = advancedTexture.getControlByName(`titleRect_${canvas.revenueStreams.id}`);
        if (revenueBox && revenueLabel && (revenueLabel as any).counterText) {
          const currentScale = revenueBox.scaling.y;
          const heightValue = Math.round(currentScale * 100);
          (revenueLabel as any).counterText.text = `$${heightValue}`;
        }
        
        // Cost Structure counter
        const costBox = scene.getMeshByName(`box_${canvas.costStructure.id}`);
        const costLabel = advancedTexture.getControlByName(`titleRect_${canvas.costStructure.id}`);
        if (costBox && costLabel && (costLabel as any).counterText) {
          const currentScale = costBox.scaling.y;
          const heightValue = Math.round(currentScale * 100);
          (costLabel as any).counterText.text = `$${heightValue}`;
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

    // Render loop with shader animation
    let time = 0;
    engine.runRenderLoop(() => {
      time += 0.01;
      
      // Update wood shader time uniform if it exists
      const woodShaderMaterial = scene.getMaterialByName(`woodShader_${canvas.keyResources.id}`) as ShaderMaterial;
      if (woodShaderMaterial && woodShaderMaterial.setFloat) {
        woodShaderMaterial.setFloat("time", time);
      }
      
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