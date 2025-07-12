import React, { useRef, useEffect } from 'react';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, ActionManager, ExecuteCodeAction, FreeCamera, Tools } from '@babylonjs/core';
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

    // Create camera
    const camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 2.5,
      12,
      Vector3.Zero(),
      scene
    );
    camera.setTarget(Vector3.Zero());

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

    // Helper function to create a business model block
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
      box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        console.log(`Clicked on ${element.title}`);
      }));

      // Add hover effect
      box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        material.diffuseColor = new Color3(0.29, 0.56, 0.89); // Blue hover
      }));

      box.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        material.diffuseColor = color; // Original color
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
      rect.linkWithMesh(box);
      rect.linkOffsetY = -50;

      return box;
    };

    // Create business model canvas blocks (closer positions)
    const blocks = [
      // Left side - Key Partners
      createBusinessBlock(
        canvas.keyPartners,
        new Vector3(-4, 0.5, 1),
        new Vector3(2, 1, 2),
        Color3.FromHexString(canvas.keyPartners.color || '#FFE5E5'),
        canvas.keyPartners.id
      ),

      // Upper Left - Key Activities
      createBusinessBlock(
        canvas.keyActivities,
        new Vector3(-2, 0.5, 2.5),
        new Vector3(2, 1, 2),
        Color3.FromHexString(canvas.keyActivities.color || '#E5F3FF'),
        canvas.keyActivities.id
      ),

      // Lower Left - Key Resources
      createBusinessBlock(
        canvas.keyResources,
        new Vector3(-2, 0.5, -0.5),
        new Vector3(2, 1, 2),
        Color3.FromHexString(canvas.keyResources.color || '#E5FFE5'),
        canvas.keyResources.id
      ),

      // Center - Value Propositions
      createBusinessBlock(
        canvas.valuePropositions,
        new Vector3(0, 0.5, 1),
        new Vector3(3, 1, 3),
        Color3.FromHexString(canvas.valuePropositions.color || '#FFF5E5'),
        canvas.valuePropositions.id
      ),

      // Upper Right - Customer Relationships
      createBusinessBlock(
        canvas.customerRelationships,
        new Vector3(2, 0.5, 2.5),
        new Vector3(2, 1, 2),
        Color3.FromHexString(canvas.customerRelationships.color || '#F5E5FF'),
        canvas.customerRelationships.id
      ),

      // Lower Right - Channels
      createBusinessBlock(
        canvas.channels,
        new Vector3(2, 0.5, -0.5),
        new Vector3(2, 1, 2),
        Color3.FromHexString(canvas.channels.color || '#E5FFFF'),
        canvas.channels.id
      ),

      // Right Side - Customer Segments
      createBusinessBlock(
        canvas.customerSegments,
        new Vector3(4, 0.5, 1),
        new Vector3(2, 1, 2),
        Color3.FromHexString(canvas.customerSegments.color || '#FFE5F5'),
        canvas.customerSegments.id
      ),

      // Bottom Left - Cost Structure
      createBusinessBlock(
        canvas.costStructure,
        new Vector3(-1, 0.5, -2.5),
        new Vector3(4, 1, 1.5),
        Color3.FromHexString(canvas.costStructure.color || '#F0F0F0'),
        canvas.costStructure.id
      ),

      // Bottom Right - Revenue Streams
      createBusinessBlock(
        canvas.revenueStreams,
        new Vector3(1, 0.5, -2.5),
        new Vector3(4, 1, 1.5),
        Color3.FromHexString(canvas.revenueStreams.color || '#E5F5E5'),
        canvas.revenueStreams.id
      )
    ];

    // Removed central flow indicator (no spinning elements)

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