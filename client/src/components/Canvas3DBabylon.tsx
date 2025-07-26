import React, { useEffect, useRef } from 'react';
import {
  Engine,
  Scene,
  Vector3,
  FreeCamera,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  SceneLoader,
  ShadowGenerator,
  Mesh,
  TransformNode,
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Control
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { BusinessModelCanvas } from '../../../shared/types';

interface Canvas3DBabylonProps {
  canvas: BusinessModelCanvas;
}

const Canvas3DBabylon: React.FC<Canvas3DBabylonProps> = ({ canvas }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create engine and scene
    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);
    scene.clearColor = new Color3(1, 1, 1); // White background

    // Camera setup
    const camera = new FreeCamera('camera', new Vector3(0, 8, -12), scene);
    camera.setTarget(Vector3.Zero());
    camera.attachControls(canvasRef.current, true);

    // Lighting
    const hemisphericLight = new HemisphericLight('hemisphericLight', new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.7;

    const directionalLight = new DirectionalLight('directionalLight', new Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 0.5;

    // Shadow generator
    const shadowGenerator = new ShadowGenerator(1024, directionalLight);
    shadowGenerator.useBlurExponentialShadowMap = true;

    // Ground plane
    const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 14 }, scene);
    const groundMaterial = new StandardMaterial('groundMaterial', scene);
    groundMaterial.diffuseColor = new Color3(0.95, 0.95, 0.95);
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    // Scene group for organizing models
    const sceneGroup = new TransformNode('sceneGroup', scene);

    // GUI for labels
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI');

    // Load GLB models in circular layout centered at origin
    const loadModels = async () => {
      console.log('Loading GLB models...');

      // Model configurations with your new files
      const models = [
        // Value Proposition at center (origin)
        {
          file: 'BMC_blender_05_ValueProposition_1753550875216.glb',
          position: new Vector3(0, 0, 0),
          scale: new Vector3(1, 1, 1),
          title: canvas.valuePropositions.title
        },
        // Circular arrangement around center
        {
          file: 'BMC_blender_05_KeyPartners_1753550875216.glb',
          position: new Vector3(-4, 0, -3),
          scale: new Vector3(1, 1, 1),
          title: canvas.keyPartners.title
        },
        {
          file: 'BMC_blender_05_KeyActivities_1753550875214.glb',
          position: new Vector3(0, 0, -4),
          scale: new Vector3(1, 1, 1),
          title: canvas.keyActivities.title
        },
        {
          file: 'BMC_blender_05_KeyResources_1753550875216.glb',
          position: new Vector3(4, 0, -3),
          scale: new Vector3(1, 1, 1),
          title: canvas.keyResources.title
        },
        {
          file: 'BMC_blender_05_CustomerRelationships_1753550875215.glb',
          position: new Vector3(5, 0, 0),
          scale: new Vector3(1, 1, 1),
          title: canvas.customerRelationships.title
        },
        {
          file: 'BMC_blender_05_CustomerChannels_1753550875215.glb',
          position: new Vector3(4, 0, 3),
          scale: new Vector3(1, 1, 1),
          title: canvas.channels.title
        },
        {
          file: 'BMC_blender_05_CustomerSegments_1753550875215.glb',
          position: new Vector3(-4, 0, 3),
          scale: new Vector3(1, 1, 1),
          title: canvas.customerSegments.title
        }
      ];

      // Load each model
      for (const modelConfig of models) {
        try {
          console.log(`Loading ${modelConfig.file}...`);
          const result = await SceneLoader.ImportMeshAsync('', '/models/', modelConfig.file, scene);
          
          if (result.meshes.length > 0) {
            const rootMesh = result.meshes[0];
            rootMesh.position = modelConfig.position;
            rootMesh.scaling = modelConfig.scale;
            rootMesh.parent = sceneGroup;

            // Add shadows
            result.meshes.forEach(mesh => {
              if (mesh instanceof Mesh) {
                shadowGenerator.addShadowCaster(mesh);
                mesh.receiveShadows = true;
              }
            });

            // Add label
            const titleRect = new Rectangle(`title_${modelConfig.title}`);
            titleRect.widthInPixels = 180;
            titleRect.heightInPixels = 40;
            titleRect.cornerRadius = 6;
            titleRect.color = '#333';
            titleRect.thickness = 1;
            titleRect.background = 'rgba(255, 255, 255, 0.9)';
            advancedTexture.addControl(titleRect);

            const titleText = new TextBlock(`text_${modelConfig.title}`, modelConfig.title);
            titleText.color = '#333';
            titleText.fontSize = 14;
            titleText.fontWeight = 'bold';
            titleRect.addControl(titleText);

            titleRect.linkWithMesh(rootMesh);
            titleRect.linkOffsetY = -60;

            console.log(`Successfully loaded ${modelConfig.file} at ${modelConfig.position}`);
          }
        } catch (error) {
          console.error(`Error loading ${modelConfig.file}:`, error);
        }
      }
    };

    // Red sphere at origin for reference
    const originSphere = MeshBuilder.CreateSphere('origin', { diameter: 0.5 }, scene);
    originSphere.position = new Vector3(0, 0.25, 0);
    const sphereMaterial = new StandardMaterial('sphereMaterial', scene);
    sphereMaterial.diffuseColor = new Color3(1, 0, 0);
    sphereMaterial.emissiveColor = new Color3(0.3, 0, 0);
    originSphere.material = sphereMaterial;

    // Start loading models
    loadModels();

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, [canvas]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        outline: 'none'
      }}
    />
  );
};

export default Canvas3DBabylon;