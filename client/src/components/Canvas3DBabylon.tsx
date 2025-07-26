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
  AbstractMesh,
  Matrix,
  TransformNode
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
// GUI imports removed since labels are no longer used
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
  
  // GUI state removed since labels are no longer used

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

    // Simple lighting setup for plastic materials
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.7;
    hemisphericLight.diffuse = new Color3(1, 1, 1);
    
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 0.8;
    directionalLight.diffuse = new Color3(1, 1, 1);

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

    // GUI setup removed since labels are no longer used
    

    

    




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
          
          // Click/Selection effect - bright blue glow only
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
          
          // Labels removed as requested
        }
      }).catch((error) => {
        console.error(`Failed to load ${elementName} GLB model:`, error);
      });
    };

    // Scaled version of loadGLBModel with custom scaling
    const loadGLBModelScaled = (filename: string, content: string[], position: Vector3, elementName: string, scale: number) => {

      SceneLoader.ImportMeshAsync("", "/models/", filename, scene).then((result) => {
        if (result.meshes.length > 0) {
          const rootMesh = result.meshes[0];
          rootMesh.position = position;
          rootMesh.scaling = new Vector3(scale, scale, scale);
          
          // Apply metallic materials and setup interactivity for all meshes
          result.meshes.forEach(mesh => {
            if (mesh.material) {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.metallic = 0.9;
                material.roughness = 0.1;
              }
            }
            
            // Add interactive hover and selection effects
            mesh.actionManager = new ActionManager(scene);
            
            // Hover effect
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(0.3, 0.3, 0.4);
              }
            }));
            
            // Mouse out effect
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(0, 0, 0);
              }
            }));
            
            // Click selection effect
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              console.log(`Clicked on ${elementName}`);
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(0.3, 0.5, 1.0); // Bright blue selection
              }
            }));
          });

          // Labels removed as requested
          
          // Click detection is handled by the existing ActionManager above
          
          console.log(`${elementName} GLB model loaded at ${scale}x scale at position:`, position);
        }
      }).catch((error) => {
        console.error(`Failed to load ${elementName} GLB model:`, error);
      });
    };

    // Scaled version with custom color for all business model elements
    const loadGLBModelScaledWithColor = (filename: string, content: string[], position: Vector3, elementName: string, scale: number, color: Color3) => {

      SceneLoader.ImportMeshAsync("", "/models/", filename, scene).then((result) => {
        if (result.meshes.length > 0) {
          const rootMesh = result.meshes[0];
          rootMesh.position = position;
          rootMesh.scaling = new Vector3(scale, scale, scale);
          
          // Apply custom color with plastic material properties
          result.meshes.forEach(mesh => {
            // Create new PBR material with plastic appearance
            const plasticMaterial = new PBRMetallicRoughnessMaterial(`${elementName}_plastic`, scene);
            plasticMaterial.baseColor = color;
            plasticMaterial.metallic = 0.0; // No metallic for plastic appearance
            plasticMaterial.roughness = 0.8; // High roughness for matte plastic look
            // Plastic material properties set (no additional environment needed)
            
            // Apply the material to the mesh
            mesh.material = plasticMaterial;
            // Add interactive hover and selection effects
            mesh.actionManager = new ActionManager(scene);
            
            // Hover effect - subtle color brightening
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(color.r * 0.2, color.g * 0.2, color.b * 0.2);
              }
            }));
            
            // Mouse out effect - remove brightening
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(0, 0, 0);
              }
            }));
            
            // Click selection effect
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              console.log(`Clicked on ${elementName}`);
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(0.3, 0.5, 1.0); // Bright blue selection
              }
            }));
          });

          // Labels removed as requested
          
          // Click detection is handled by the existing ActionManager above
          
          console.log(`${elementName} GLB model loaded at ${scale}x scale with custom color at position:`, position);
        }
      }).catch((error) => {
        console.error(`Failed to load ${elementName} GLB model:`, error);
      });
    };

    // Create a master transform node to group and rotate ALL BMC objects as one unit
    const bmcMasterTransform = new TransformNode("bmcMasterGroup", scene);
    bmcMasterTransform.rotation.y = Math.PI; // 180 degree rotation around Y-axis for entire BMC
    
    // Define loadGLBModelWithParent function first before using it
    const loadGLBModelWithParent = (fileName: string, content: string, position: Vector3, elementName: string, scale: number, color: Color3, parent?: TransformNode) => {
      SceneLoader.ImportMeshAsync("", "/models/", fileName, scene).then((result) => {
        if (result.meshes.length > 0) {
          const rootMesh = result.meshes[0];
          rootMesh.position = position;
          rootMesh.scaling = new Vector3(scale, scale, scale);
          
          if (parent) {
            rootMesh.parent = parent;
          }
          
          // Apply materials and interactions (enhanced for parent objects)
          result.meshes.forEach((mesh) => {
            // Create new PBR material for proper color application
            const newMaterial = new PBRMetallicRoughnessMaterial(`${elementName}_material`, scene);
            newMaterial.baseColor = color;
            newMaterial.metallic = 0.0;
            newMaterial.roughness = 0.8;
            mesh.material = newMaterial;
            
            mesh.actionManager = new ActionManager(scene);
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(0.2, 0.2, 0.2);
              }
            }));
            
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(0, 0, 0);
              }
            }));
            
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              console.log(`Clicked on ${elementName}`);
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                const material = mesh.material as PBRMetallicRoughnessMaterial;
                material.emissiveColor = new Color3(0.3, 0.5, 1.0);
              }
            }));
          });
          
          console.log(`${elementName} GLB model loaded at ${scale}x scale with custom color at position:`, position);
        }
      }).catch((error) => {
        console.error(`Failed to load ${elementName} GLB model:`, error);
      });
    };
    
    // Load individual GLB models as separate interactive objects with exact diagram labels
    // Each model has a distinct color for easy identification, ALL parented to master transform
    
    // Center: Value Proposition (circular element) - BLUE (parented to master transform)
    loadGLBModelWithParent("BMC_blender_06_ValueProposition.glb", canvas.valuePropositions.content || "", new Vector3(0, 0.5, 0), "Value Proposition", 45, new Color3(0, 0.4, 0.8), bmcMasterTransform);
    
    // Left side: Customer Segments (tall vertical rectangle) - PURPLE (parented to master transform)
    loadGLBModelWithParent("BMC_blender_06_CustomerSegments.glb", canvas.customerSegments.content || "", new Vector3(-2.8, 0.5, 0), "Customer Segments", 50, new Color3(0.7, 0, 0.7), bmcMasterTransform);
    
    // Right side: Key Partners (tall vertical rectangle) - GREEN (parented to master transform)  
    loadGLBModelWithParent("BMC_blender_06_KeyPartners.glb", canvas.keyPartners.content || "", new Vector3(2.8, 0.5, 0), "Key Partners", 50, new Color3(0, 0.7, 0), bmcMasterTransform);
    
    // Load inner circle objects with master transform parent - positioned to match exact layout:
    // Key Activities (ORANGE) - TOP position (parented to master transform)
    loadGLBModelWithParent("BMC_blender_06_KeyActivities.glb", canvas.keyActivities.content || "", new Vector3(-0.8, 0.5, -1.3), "Key Activities", 40, new Color3(1, 0.5, 0), bmcMasterTransform);
    
    // Customer Relationships (YELLOW) - TOP-RIGHT position (parented to master transform)
    loadGLBModelWithParent("BMC_blender_06_CustomerRelationships.glb", canvas.customerRelationships.content || "", new Vector3(0.8, 0.5, -1.3), "Customer Relationships", 40, new Color3(1, 0.8, 0), bmcMasterTransform);
    
    // Key Resources (RED) - BOTTOM-LEFT position (parented to master transform)
    loadGLBModelWithParent("BMC_blender_06_KeyResources.glb", canvas.keyResources.content || "", new Vector3(-0.8, 0.5, 1.3), "Key Resources", 40, new Color3(1, 0, 0), bmcMasterTransform);
    
    // Customer Channels (CYAN) - BOTTOM-RIGHT position (parented to master transform)
    loadGLBModelWithParent("BMC_blender_06_CustomerChannels.glb", canvas.channels.content || "", new Vector3(0.8, 0.5, 1.3), "Customer Channels", 40, new Color3(0, 0.8, 0.8), bmcMasterTransform);

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