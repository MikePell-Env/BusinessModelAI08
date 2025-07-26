import React, { useRef, useEffect } from 'react';
import { 
  Engine, 
  Scene, 
  ArcRotateCamera, 
  HemisphericLight, 
  DirectionalLight,
  MeshBuilder, 
  PBRMetallicRoughnessMaterial, 
  Color3, 
  Vector3, 
  Mesh, 
  ActionManager, 
  ExecuteCodeAction,
  CubeTexture,
  Texture
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Rectangle, TextBlock, Control } from '@babylonjs/gui';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';

interface Canvas3DBabylonProps {
  canvas: BusinessModelCanvas;
  isTransitioning?: boolean;
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
    
    // Set pure white background
    scene.clearColor = new Color3(1, 1, 1).toColor4();
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Create camera with proper positioning for circular layout
    const camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,    // Alpha (horizontal rotation)
      Math.PI / 3,     // Beta (vertical rotation) - better angle for circular view
      16,              // Radius (distance from target) - optimized for circular layout
      Vector3.Zero(),  // Target position
      scene
    );
    camera.setTarget(Vector3.Zero());
    
    // Enable camera controls on the canvas
    camera.attachControl(canvasRef.current, true);
    
    // Set camera limits optimized for circular layout navigation
    camera.lowerRadiusLimit = 8;      // Minimum zoom distance
    camera.upperRadiusLimit = 30;     // Maximum zoom distance
    camera.lowerBetaLimit = 0.1;      // Prevent camera from going below ground
    camera.upperBetaLimit = Math.PI / 2.2; // Prevent camera from flipping over

    // Enhanced lighting setup
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.6;
    
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 0.8;

    // Create white ground with professional appearance
    const ground = MeshBuilder.CreateGround("ground", { width: 24, height: 24 }, scene);
    const groundMaterial = new PBRMetallicRoughnessMaterial("groundMaterial", scene);
    groundMaterial.baseColor = new Color3(1, 1, 1);
    groundMaterial.metallic = 0.0;
    groundMaterial.roughness = 0.8;
    ground.material = groundMaterial;

    // Add default environment for proper PBR reflections
    scene.createDefaultSkybox(scene.environmentTexture, true, 100, 0.3);

    // Create GUI
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Helper function to create a business model block with PBR materials
    const createBusinessBlock = (
      element: CanvasElement,
      position: Vector3,
      size: Vector3,
      color: Color3,
      elementId: string
    ) => {
      // Create geometry based on element type
      let geometry;
      if (elementId === 'value-propositions') {
        // Central cylinder for Value Propositions
        geometry = MeshBuilder.CreateCylinder(`cylinder_${elementId}`, {
          height: size.y,
          diameter: size.x
        }, scene);
      } else {
        // Rectangular boxes for other elements
        geometry = MeshBuilder.CreateBox(`box_${elementId}`, {
          width: size.x,
          height: size.y,
          depth: size.z
        }, scene);
      }
      
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

      // Add interaction
      geometry.actionManager = new ActionManager(scene);
      geometry.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        console.log(`Clicked on ${element.title}`);
      }));

      // Enhanced hover effect with metallic properties
      geometry.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        material.metallic = 1.0;  // Maximum metallic shine on hover
        material.roughness = 0.05; // Even more reflective
      }));

      geometry.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        material.metallic = originalMetallic;   // Restore original metallic
        material.roughness = originalRoughness; // Restore original roughness
      }));

      // Create GUI elements for text
      const rect = new Rectangle(`rect_${elementId}`);
      rect.widthInPixels = 200;
      rect.heightInPixels = 100;
      rect.cornerRadius = 10;
      rect.color = "transparent";
      rect.thickness = 0;
      advancedTexture.addControl(rect);

      // Title text
      const titleText = new TextBlock(`title_${elementId}`, element.title);
      titleText.color = "#2D3748";
      titleText.fontSize = 18;
      titleText.fontWeight = "bold";
      titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      titleText.paddingTop = "10px";
      rect.addControl(titleText);

      // Content text
      const contentText = new TextBlock(`content_${elementId}`, 
        element.content.slice(0, 2).join(' • ') + (element.content.length > 2 ? '...' : '')
      );
      contentText.color = "#4A5568";
      contentText.fontSize = 12;
      contentText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      contentText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
      contentText.paddingBottom = "10px";
      rect.addControl(contentText);

      // Link GUI to 3D position
      rect.linkWithMesh(geometry);
      rect.linkOffsetY = -50;

      return geometry;
    };

    // CIRCULAR LAYOUT: Transform from grid-based to circular arrangement
    // Central Value Proposition with 7 elements around perimeter
    // Positioning optimized for circular viewing with 16-unit camera distance
    
    const blocks = [
      // Central Value Proposition (prominent cylinder)
      createBusinessBlock(
        canvas.valuePropositions,
        new Vector3(0, 1, 0),       // Position: center, elevated
        new Vector3(3, 2, 3),       // Size: large cylinder diameter and height  
        Color3.FromHexString(canvas.valuePropositions.color || '#FFF5E5'),
        'value-propositions'
      ),

      // Perimeter Elements - Circular arrangement around center
      // Key Partners (left side)
      createBusinessBlock(
        canvas.keyPartners,
        new Vector3(-6, 0.5, 0),    // Position: far left
        new Vector3(2, 1, 2),       // Size: rectangular box
        Color3.FromHexString(canvas.keyPartners.color || '#FFE5E5'),
        canvas.keyPartners.id
      ),

      // Key Activities (top-left)
      createBusinessBlock(
        canvas.keyActivities,
        new Vector3(-4, 0.5, -4),   // Position: top-left of circle
        new Vector3(2, 1, 2),       // Size: rectangular box
        Color3.FromHexString(canvas.keyActivities.color || '#E5F3FF'),
        canvas.keyActivities.id
      ),

      // Key Resources (bottom-left)
      createBusinessBlock(
        canvas.keyResources,
        new Vector3(-4, 0.5, 4),    // Position: bottom-left of circle
        new Vector3(2, 1, 2),       // Size: rectangular box
        Color3.FromHexString(canvas.keyResources.color || '#E5FFE5'),
        canvas.keyResources.id
      ),

      // Customer Relationships (top-right)
      createBusinessBlock(
        canvas.customerRelationships,
        new Vector3(4, 0.5, -4),    // Position: top-right of circle
        new Vector3(2, 1, 2),       // Size: rectangular box
        Color3.FromHexString(canvas.customerRelationships.color || '#F5E5FF'),
        canvas.customerRelationships.id
      ),

      // Channels (bottom-right)
      createBusinessBlock(
        canvas.channels,
        new Vector3(4, 0.5, 4),     // Position: bottom-right of circle
        new Vector3(2, 1, 2),       // Size: rectangular box
        Color3.FromHexString(canvas.channels.color || '#E5FFFF'),
        canvas.channels.id
      ),

      // Customer Segments (right side)
      createBusinessBlock(
        canvas.customerSegments,
        new Vector3(6, 0.5, 0),     // Position: far right
        new Vector3(2, 1, 2),       // Size: rectangular box
        Color3.FromHexString(canvas.customerSegments.color || '#FFE5F5'),
        canvas.customerSegments.id
      ),

      // Cost Structure (back row, left)
      createBusinessBlock(
        canvas.costStructure,
        new Vector3(-2, 0.5, -7),   // Position: back-left
        new Vector3(3, 1, 1.5),     // Size: wide, shallow
        Color3.FromHexString(canvas.costStructure.color || '#F0F0F0'),
        canvas.costStructure.id
      ),

      // Revenue Streams (back row, right)
      createBusinessBlock(
        canvas.revenueStreams,
        new Vector3(2, 0.5, -7),    // Position: back-right
        new Vector3(3, 1, 1.5),     // Size: wide, shallow
        Color3.FromHexString(canvas.revenueStreams.color || '#E5F5E5'),
        canvas.revenueStreams.id
      )
    ];

    // Start the render loop
    engine.runRenderLoop(() => {
      if (scene) {
        scene.render();
      }
    });

    // Clean up on unmount
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.dispose();
      }
    };
  }, [canvas]);

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