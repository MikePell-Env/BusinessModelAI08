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
  Vector3, 
  Mesh, 
  ActionManager, 
  ExecuteCodeAction,
  CubeTexture,
  Texture,
  DynamicTexture,
  SceneLoader,
  AbstractMesh
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
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

    // Enhanced lighting setup for metallic materials
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.8;
    hemisphericLight.diffuse = new Color3(1, 1, 1);
    hemisphericLight.specular = new Color3(1, 1, 1);
    
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 0.7;
    directionalLight.diffuse = new Color3(1, 1, 1);
    directionalLight.specular = new Color3(1, 1, 1);
    
    // Add additional point light for metallic highlights
    const pointLight = new PointLight("pointLight", new Vector3(2, 8, 2), scene);
    pointLight.intensity = 0.5;
    pointLight.diffuse = new Color3(1, 1, 1);
    pointLight.specular = new Color3(1, 1, 1);

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



    // Only GLB models are used now - no more box geometry functions needed

    // All BMC elements are now loaded as GLB models - circular layout matching top view

    // Store selected mesh reference
    let selectedMesh: AbstractMesh | null = null;

    // GLB Model Loading Function with hover and selection lighting
    const loadGLBModel = (filename: string, element: CanvasElement, position: Vector3, elementName: string) => {
      loadGLBModelWithColor(filename, element, position, elementName, null);
    };

    // GLB Model Loading Function with custom color option
    const loadGLBModelWithColor = (filename: string, element: CanvasElement, position: Vector3, elementName: string, customColor: Color3 | null) => {
      SceneLoader.ImportMeshAsync("", "/models/", filename, scene).then((result) => {
        if (result.meshes.length > 0) {
          const rootMesh = result.meshes[0];
          rootMesh.position = position;
          rootMesh.scaling = new Vector3(8, 8, 8); // Much larger scale to occupy 60% of floor plane
          
          // Apply custom color if specified (for Key Resources = red metallic)
          if (customColor) {
            const meshesToColor = [rootMesh, ...rootMesh.getChildMeshes()];
            meshesToColor.forEach((mesh) => {
              if (mesh.material) {
                if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                  const material = mesh.material as PBRMetallicRoughnessMaterial;
                  // Enhanced red metallic properties
                  material.baseColor = customColor;
                  material.metallic = 0.9; // High metallic value
                  material.roughness = 0.1; // Low roughness for shiny surface
                  material.emissiveColor = new Color3(0.1, 0, 0); // Subtle red glow
                } else {
                  // Create new PBR material for non-PBR materials to ensure metallic appearance
                  const newMaterial = new PBRMetallicRoughnessMaterial(`red_metallic_${mesh.name}`, scene);
                  newMaterial.baseColor = customColor;
                  newMaterial.metallic = 0.9;
                  newMaterial.roughness = 0.1;
                  newMaterial.emissiveColor = new Color3(0.1, 0, 0);
                  mesh.material = newMaterial;
                }
                console.log(`Applied red metallic material to ${mesh.name} with material: ${mesh.material.getClassName()}`);
              }
            });
          }
          
          // Store original materials for lighting effects (not used but kept for future reference)
          
          // Add interactive lighting effects
          rootMesh.actionManager = new ActionManager(scene);
          
          // Hover effect - light up with subtle glow
          rootMesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
            console.log(`Hovering over ${elementName}`);
            // Apply glow to the root mesh and all child meshes
            const meshesToProcess = [rootMesh, ...rootMesh.getChildMeshes()];
            meshesToProcess.forEach((mesh) => {
              if (mesh.material) {
                console.log(`Material type for ${mesh.name}: ${mesh.material.getClassName()}`);
                if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                  const material = mesh.material as PBRMetallicRoughnessMaterial;
                  material.emissiveColor = new Color3(0.3, 0.3, 0.4); // Subtle glow on hover
                } else if (mesh.material.hasOwnProperty('emissiveColor')) {
                  // Handle other material types that support emissive color
                  (mesh.material as any).emissiveColor = new Color3(0.3, 0.3, 0.4);
                }
              }
            });
          }));
          
          // Mouse out - restore normal lighting unless selected
          rootMesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
            if (selectedMesh !== rootMesh) {
              console.log(`Mouse out of ${elementName}`);
              const meshesToProcess = [rootMesh, ...rootMesh.getChildMeshes()];
              meshesToProcess.forEach((mesh) => {
                if (mesh.material) {
                  if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                    const material = mesh.material as PBRMetallicRoughnessMaterial;
                    material.emissiveColor = new Color3(0, 0, 0); // Remove glow
                  } else if (mesh.material.hasOwnProperty('emissiveColor')) {
                    (mesh.material as any).emissiveColor = new Color3(0, 0, 0);
                  }
                }
              });
            }
          }));
          
          // Click/Selection effect - bright blue glow
          rootMesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            console.log(`${elementName} GLB clicked!`);
            
            // Clear previous selection
            if (selectedMesh && selectedMesh !== rootMesh) {
              const previousMeshes = [selectedMesh, ...selectedMesh.getChildMeshes()];
              previousMeshes.forEach((mesh) => {
                if (mesh.material) {
                  if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                    const material = mesh.material as PBRMetallicRoughnessMaterial;
                    material.emissiveColor = new Color3(0, 0, 0);
                  } else if (mesh.material.hasOwnProperty('emissiveColor')) {
                    (mesh.material as any).emissiveColor = new Color3(0, 0, 0);
                  }
                }
              });
            }
            
            // Apply bright blue selection glow
            selectedMesh = rootMesh;
            const selectedMeshes = [rootMesh, ...rootMesh.getChildMeshes()];
            selectedMeshes.forEach((mesh) => {
              if (mesh.material) {
                console.log(`Applying blue glow to ${mesh.name} with material: ${mesh.material.getClassName()}`);
                if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                  const material = mesh.material as PBRMetallicRoughnessMaterial;
                  material.emissiveColor = new Color3(0.3, 0.5, 1.0); // Bright blue glow
                } else if (mesh.material.hasOwnProperty('emissiveColor')) {
                  (mesh.material as any).emissiveColor = new Color3(0.3, 0.5, 1.0);
                }
              }
            });
          }));
          
          // Create title label for GLB model
          const titleLabel = new Rectangle(`title_label_${elementName.toLowerCase().replace(' ', '_')}_glb`);
          titleLabel.widthInPixels = 180;
          titleLabel.heightInPixels = 40;
          titleLabel.cornerRadius = 8;
          titleLabel.color = "transparent";
          titleLabel.thickness = 0;
          titleLabel.background = "rgba(255, 255, 255, 0.9)";
          advancedTexture.addControl(titleLabel);

          const titleText = new TextBlock(`title_${elementName.toLowerCase().replace(' ', '_')}_glb`, element.title);
          titleText.color = "#2D3748";
          titleText.fontSize = 16;
          titleText.fontWeight = "bold";
          titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
          titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
          titleLabel.addControl(titleText);

          titleLabel.linkWithMesh(rootMesh);
          titleLabel.linkOffsetY = -120; // Adjust label position for larger models
        }
      }).catch((error) => {
        console.error(`Failed to load ${elementName} GLB model:`, error);
      });
    };

    // TEMPORARY EXPERIMENT: Load the complete GLB file scaled up 6x instead of individual models
    SceneLoader.ImportMeshAsync("", "/models/", "BMC_complete_experiment.glb", scene).then((result) => {
      if (result.meshes.length > 0) {
        const rootMesh = result.meshes[0];
        rootMesh.position = new Vector3(0, 0.5, 0);
        rootMesh.scaling = new Vector3(100, 100, 100); // Scale up to 100x size to completely fill the ground plane
        
        console.log("Complete BMC GLB loaded at 100x scale:");
        result.meshes.forEach((mesh, index) => {
          console.log(`Mesh ${index}: ${mesh.name} at position:`, mesh.position);
          console.log(`  - Scaling:`, mesh.scaling);
          
          // Apply red metallic material to Key Resources if we can identify it
          if (mesh.name.toLowerCase().includes('keyresources') || mesh.name.toLowerCase().includes('key_resources')) {
            if (mesh.material) {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.baseColor = new Color3(1, 0, 0);
                material.metallic = 0.9;
                material.roughness = 0.1;
                material.emissiveColor = new Color3(0.1, 0, 0);
                console.log("Applied red metallic material to Key Resources mesh");
              }
            }
          }
          
          // Add interactive hover and selection effects to all meshes
          mesh.actionManager = new ActionManager(scene);
          
          // Hover effect
          mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
            if (mesh.material && mesh.material instanceof PBRMetallicRoughnessMaterial) {
              const material = mesh.material as PBRMetallicRoughnessMaterial;
              material.emissiveColor = new Color3(0.3, 0.3, 0.4);
            }
          }));
          
          // Mouse out effect
          mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
            if (mesh.material && mesh.material instanceof PBRMetallicRoughnessMaterial) {
              const material = mesh.material as PBRMetallicRoughnessMaterial;
              // Restore original emissive color (red for Key Resources, none for others)
              if (mesh.name.toLowerCase().includes('keyresources') || mesh.name.toLowerCase().includes('key_resources')) {
                material.emissiveColor = new Color3(0.1, 0, 0);
              } else {
                material.emissiveColor = new Color3(0, 0, 0);
              }
            }
          }));
          
          // Click selection effect
          mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            console.log(`Clicked on ${mesh.name}`);
            if (mesh.material && mesh.material instanceof PBRMetallicRoughnessMaterial) {
              const material = mesh.material as PBRMetallicRoughnessMaterial;
              material.emissiveColor = new Color3(0.3, 0.5, 1.0); // Bright blue selection
            }
          }));
        });
      }
    }).catch((error) => {
      console.error("Failed to load complete BMC GLB model:", error);
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