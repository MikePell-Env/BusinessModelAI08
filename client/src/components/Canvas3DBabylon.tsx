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

    // Create camera with proper positioning for grid layout (pre-GLB state)
    const camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,    // Alpha (horizontal rotation)
      Math.PI / 2.5,   // Beta (vertical rotation) - original working angle
      12,              // Radius (distance from target) - original working distance
      Vector3.Zero(),  // Target position
      scene
    );
    camera.setTarget(Vector3.Zero());
    
    // Enable camera controls on the canvas
    camera.attachControl(canvasRef.current, true);
    
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

    // Create white ground with original working dimensions
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    const groundMaterial = new PBRMetallicRoughnessMaterial("groundMaterial", scene);
    groundMaterial.baseColor = new Color3(0.97, 0.98, 0.99); // Original light gray color
    groundMaterial.metallic = 0.0;
    groundMaterial.roughness = 0.8;
    ground.material = groundMaterial;

    // Add default environment for proper PBR reflections
    if (scene.environmentTexture) {
      scene.createDefaultSkybox(scene.environmentTexture, true, 100, 0.3);
    }

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
      ),

      // Row 3: Cost Structure (spans 5 columns)
      createBusinessBlock(
        canvas.costStructure,
        new Vector3(-1, 0.5, -2.5), // Position: left side, back
        new Vector3(4.5, 1, 1),     // Size: wide width, short height
        Color3.FromHexString(canvas.costStructure.color || '#F0F0F0'),
        canvas.costStructure.id
      ),

      // Row 3: Revenue Streams (spans 5 columns)
      createBusinessBlock(
        canvas.revenueStreams,
        new Vector3(1, 0.5, -2.5),  // Position: right side, back
        new Vector3(4.5, 1, 1),     // Size: wide width, short height
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