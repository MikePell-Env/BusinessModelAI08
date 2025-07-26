import React, { useEffect, useRef } from 'react';
import { 
  Engine, 
  Scene, 
  Vector3, 
  Color3,
  HemisphericLight,
  DirectionalLight,
  ArcRotateCamera,
  SceneLoader,
  PBRMetallicRoughnessMaterial,
  ActionManager,
  ExecuteCodeAction
} from '@babylonjs/core';
import { 
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Control
} from '@babylonjs/gui';
import '@babylonjs/loaders/glTF';
import { useCanvas } from '@/lib/stores/useCanvas';

interface Canvas3DBabylonProps {
  canvas: any;
  isTransitioning?: boolean;
}

export const Canvas3DBabylon: React.FC<Canvas3DBabylonProps> = ({ canvas, isTransitioning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { saveCamera3DState, getCamera3DState } = useCanvas();

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);
    
    // Set white background
    scene.clearColor = new Color3(1, 1, 1).toColor4();

    // Lighting setup
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.7;

    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 0.5;

    // Camera setup
    const camera = new ArcRotateCamera("camera", -Math.PI / 6, Math.PI / 4, 20, Vector3.Zero(), scene);
    camera.attachControl(canvasRef.current, true);
    camera.wheelPrecision = 50;

    // Create GUI layer
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    let currentPopup: Rectangle | null = null;

    // Load the 3D models with working click detection and labels
    const loadModelWithClickAndLabel = (filename: string, position: Vector3, elementName: string, scale: number = 60) => {
      SceneLoader.ImportMeshAsync("", "/models/", filename, scene).then((result) => {
        if (result.meshes.length > 0) {
          const rootMesh = result.meshes[0];
          rootMesh.position = position;
          rootMesh.scaling = new Vector3(scale, scale, scale);

          // Set up materials
          result.meshes.forEach(mesh => {
            if (mesh.material && mesh.material instanceof PBRMetallicRoughnessMaterial) {
              const material = mesh.material as PBRMetallicRoughnessMaterial;
              material.metallic = 0.0;
              material.roughness = 0.8;
            }
          });

          // Create label FIRST
          const labelRect = new Rectangle(`label_${elementName.replace(/\s+/g, '_')}`);
          labelRect.widthInPixels = 140;
          labelRect.heightInPixels = 28;
          labelRect.cornerRadius = 6;
          labelRect.color = "#000000";
          labelRect.thickness = 1;
          labelRect.background = "rgba(255, 255, 255, 0.95)";
          
          const labelText = new TextBlock(`labelText_${elementName.replace(/\s+/g, '_')}`, elementName);
          labelText.color = "#000000";
          labelText.fontSize = "12px";
          labelText.fontWeight = "bold";
          labelRect.addControl(labelText);
          
          // Position label above mesh
          labelRect.linkWithMesh(rootMesh);
          labelRect.linkOffsetYInPixels = -80;
          advancedTexture.addControl(labelRect);

          // Set up click detection on ALL meshes
          result.meshes.forEach(mesh => {
            mesh.actionManager = new ActionManager(scene);
            
            // Click handler
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
              console.log(`CLICK DETECTED on ${elementName}!`);
              
              // Close existing popup
              if (currentPopup) {
                advancedTexture.removeControl(currentPopup);
                currentPopup = null;
              }
              
              // Create new popup
              const popup = new Rectangle(`popup_${elementName.replace(/\s+/g, '_')}`);
              popup.widthInPixels = 280;
              popup.heightInPixels = 200;
              popup.cornerRadius = 8;
              popup.color = "#333333";
              popup.thickness = 2;
              popup.background = "rgba(255, 255, 255, 0.95)";
              popup.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
              popup.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
              popup.leftInPixels = -20;
              
              // Title
              const title = new TextBlock(`title_${elementName.replace(/\s+/g, '_')}`, elementName);
              title.color = "#333333";
              title.fontSize = "16px";
              title.fontWeight = "bold";
              title.topInPixels = -70;
              popup.addControl(title);
              
              // Content
              const content = new TextBlock(`content_${elementName.replace(/\s+/g, '_')}`, `${elementName}\n\nThis panel is working!\nClick detection successful.`);
              content.color = "#666666";
              content.fontSize = "12px";
              content.topInPixels = -20;
              content.textWrapping = true;
              popup.addControl(content);
              
              // Close button
              const closeButton = new Rectangle(`close_${elementName.replace(/\s+/g, '_')}`);
              closeButton.widthInPixels = 24;
              closeButton.heightInPixels = 24;
              closeButton.cornerRadius = 12;
              closeButton.color = "#ff4444";
              closeButton.background = "#ff4444";
              closeButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
              closeButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
              closeButton.leftInPixels = -8;
              closeButton.topInPixels = 8;
              
              const closeX = new TextBlock(`closeX_${elementName.replace(/\s+/g, '_')}`, "×");
              closeX.color = "#ffffff";
              closeX.fontSize = "14px";
              closeX.fontWeight = "bold";
              closeButton.addControl(closeX);
              
              closeButton.onPointerClickObservable.add(() => {
                advancedTexture.removeControl(popup);
                currentPopup = null;
              });
              
              popup.addControl(closeButton);
              advancedTexture.addControl(popup);
              currentPopup = popup;
              
              console.log(`Panel created successfully for ${elementName}`);
            }));

            // Hover effects
            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                mesh.material.emissiveColor = new Color3(0.2, 0.2, 0.3);
              }
            }));

            mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
              if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
                mesh.material.emissiveColor = new Color3(0, 0, 0);
              }
            }));
          });

          console.log(`Loaded ${elementName} at position`, position, `with ${result.meshes.length} meshes`);
        }
      }).catch((error) => {
        console.error(`Failed to load ${elementName}:`, error);
      });
    };

    // Load all models
    loadModelWithClickAndLabel("BMC_blender_06_ValueProposition_1753567650500.glb", new Vector3(0, 0, 0), "Value Proposition");
    loadModelWithClickAndLabel("BMC_blender_06_KeyPartners_1753567650499.glb", new Vector3(-4, 0, 2), "Key Partners");
    loadModelWithClickAndLabel("BMC_blender_06_KeyActivities_1753567650499.glb", new Vector3(-2, 0, 3), "Key Activities");
    loadModelWithClickAndLabel("BMC_blender_06_KeyResources_1753567650499.glb", new Vector3(2, 0, 3), "Key Resources");
    loadModelWithClickAndLabel("BMC_blender_06_CustomerRelationships_1753567650498.glb", new Vector3(4, 0, 2), "Customer Relationships");
    loadModelWithClickAndLabel("BMC_blender_06_CustomerChannels_1753567650499.glb", new Vector3(4, 0, -2), "Customer Channels");
    loadModelWithClickAndLabel("BMC_blender_06_CustomerSegments_1753567650498.glb", new Vector3(0, 0, -4), "Customer Segments");

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, [canvas]);

  return (
    <div className="w-full h-full">
      <canvas 
        ref={canvasRef}
        className="w-full h-full block"
        style={{ outline: 'none' }}
      />
    </div>
  );
};

export default Canvas3DBabylon;