import React, { useRef, useEffect } from 'react';
import { 
  Engine, 
  Scene, 
  ArcRotateCamera, 
  FreeCamera,
  HemisphericLight, 
  DirectionalLight,
  MeshBuilder, 
  StandardMaterial,
  Color3, 
  Vector3, 
  Mesh, 
  ActionManager, 
  ExecuteCodeAction,
  Texture,
  DynamicTexture,
  SceneLoader,
  AbstractMesh,
  Tools
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { AdvancedDynamicTexture, Rectangle, TextBlock, Control } from '@babylonjs/gui';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';
import { useCanvas } from '@/lib/stores/useCanvas';

interface Canvas3DBabylonProps {
  canvas: BusinessModelCanvas;
  isTransitioning?: boolean;
}

const Canvas3DBabylon: React.FC<Canvas3DBabylonProps> = ({ canvas, isTransitioning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const perspectiveCameraRef = useRef<ArcRotateCamera | null>(null);
  const orthoCameraRef = useRef<FreeCamera | null>(null);
  const { is3D, isOrthographic, saveCamera3DState, getCamera3DState } = useCanvas();

  useEffect(() => {
    if (!canvasRef.current || !canvas) return;

    // Initialize Babylon.js engine and scene
    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);
    
    // Set background to match documentation
    scene.clearColor = new Color3(0.914, 0.925, 0.937).toColor4();
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Create perspective camera (3D View) with saved state restoration
    const savedCameraState = getCamera3DState();
    const perspectiveCamera = new ArcRotateCamera(
      "PerspectiveCamera",
      savedCameraState?.alpha ?? -Math.PI / 2,    // Alpha from architecture docs
      savedCameraState?.beta ?? Math.PI / 3,      // Beta from architecture docs  
      savedCameraState?.radius ?? 25,             // Radius from architecture docs
      Vector3.Zero(),
      scene
    );
    perspectiveCamera.setTarget(Vector3.Zero());
    perspectiveCameraRef.current = perspectiveCamera;
    
    // Camera limits from backup (original working values)
    perspectiveCamera.lowerRadiusLimit = 5;
    perspectiveCamera.upperRadiusLimit = 25;
    perspectiveCamera.lowerBetaLimit = 0.1;
    perspectiveCamera.upperBetaLimit = Math.PI / 2.2;
    perspectiveCamera.wheelPrecision = 50;
    
    // Create orthographic camera (3D Top View) from architecture docs
    const orthoCamera = new FreeCamera(
      "OrthographicCamera",
      new Vector3(0, 22, -10), // Position from architecture docs
      scene
    );
    orthoCamera.setTarget(new Vector3(0, 0, 0));
    orthoCamera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
    
    // Set orthographic bounds
    const aspectRatio = canvasRef.current.width / canvasRef.current.height;
    const orthoSize = 10;
    orthoCamera.orthoLeft = -orthoSize * aspectRatio;
    orthoCamera.orthoRight = orthoSize * aspectRatio;
    orthoCamera.orthoTop = orthoSize;
    orthoCamera.orthoBottom = -orthoSize;
    
    orthoCameraRef.current = orthoCamera;
    
    // Set initial camera based on view mode
    if (isOrthographic) {
      scene.activeCamera = orthoCamera;
      orthoCamera.attachControl(canvasRef.current, true);
    } else {
      scene.activeCamera = perspectiveCamera;
      perspectiveCamera.attachControl(canvasRef.current, true);
    }

    // Three-light setup from architecture documentation
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 1.3;
    hemisphericLight.diffuse = new Color3(0.95, 0.95, 0.95);
    hemisphericLight.groundColor = new Color3(0.4, 0.4, 0.45);
    
    const mainDirectionalLight = new DirectionalLight("mainDirectionalLight", new Vector3(-1, -1, -1), scene);
    mainDirectionalLight.intensity = 1.9;
    mainDirectionalLight.specular = new Color3(0.4, 0.4, 0.4);
    
    const rimLight = new DirectionalLight("rimLight", new Vector3(1, 0.5, 1), scene);
    rimLight.intensity = 0.5;
    rimLight.diffuse = new Color3(0.8, 0.8, 0.9);

    // Create ground with grid pattern from backup
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    
    const gridTexture = new DynamicTexture("gridTexture", {width: 1024, height: 1024}, scene, false);
    const gridContext = gridTexture.getContext();
    
    // Grey plastic background
    gridContext.fillStyle = "#cccccc";
    gridContext.fillRect(0, 0, 1024, 1024);
    
    // Grid lines
    gridContext.strokeStyle = "#b8b8b8";
    gridContext.lineWidth = 1;
    
    for (let i = 0; i <= 1024; i += 32) {
      gridContext.beginPath();
      gridContext.moveTo(i, 0);
      gridContext.lineTo(i, 1024);
      gridContext.stroke();
      
      gridContext.beginPath();
      gridContext.moveTo(0, i);
      gridContext.lineTo(1024, i);
      gridContext.stroke();
    }
    
    gridTexture.update();
    
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseTexture = gridTexture;
    groundMaterial.specularColor = new Color3(0.15, 0.15, 0.15);
    groundMaterial.specularPower = 64;
    ground.material = groundMaterial;

    // Create border rails from backup
    const railHeight = 0.3;
    const railWidth = 0.2;
    const railColor = new Color3(0.5, 0.5, 0.5);
    
    const railMaterial = new StandardMaterial("railMaterial", scene);
    railMaterial.diffuseColor = railColor;
    railMaterial.specularColor = new Color3(0, 0, 0);
    
    // North rail
    const northRail = MeshBuilder.CreateBox("northRail", {
      width: 20.4, height: railHeight, depth: railWidth
    }, scene);
    northRail.position = new Vector3(0, railHeight/2, -7 - railWidth/2);
    northRail.material = railMaterial;
    
    // South rail
    const southRail = MeshBuilder.CreateBox("southRail", {
      width: 20.4, height: railHeight, depth: railWidth
    }, scene);
    southRail.position = new Vector3(0, railHeight/2, 7 + railWidth/2);
    southRail.material = railMaterial;
    
    // East rail
    const eastRail = MeshBuilder.CreateBox("eastRail", {
      width: railWidth, height: railHeight, depth: 14
    }, scene);
    eastRail.position = new Vector3(10 + railWidth/2, railHeight/2, 0);
    eastRail.material = railMaterial;
    
    // West rail
    const westRail = MeshBuilder.CreateBox("westRail", {
      width: railWidth, height: railHeight, depth: 14
    }, scene);
    westRail.position = new Vector3(-10 - railWidth/2, railHeight/2, 0);
    westRail.material = railMaterial;

    // Create GUI
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    let currentPopup: Rectangle | null = null;

    // Load the main BMC model from architecture docs
    const loadMainBMCModel = async () => {
      try {
        const result = await SceneLoader.ImportMeshAsync("", "/models/", "BMC_blender_09_complete_1753576063858.glb", scene);
        const meshes = result.meshes;
        
        if (meshes.length > 0) {
          const rootMesh = meshes[0];
          rootMesh.position = new Vector3(0, 0.1, 0); // Y=0.1 from architecture docs
          rootMesh.scaling = new Vector3(2.5, 2.5, 2.5);
          
          // Setup interactions for the main model
          meshes.forEach(mesh => {
            if (mesh.name && mesh.name.includes('BMC_')) {
              const sectionName = mesh.name.replace('BMC_', '').replace(/_/g, ' ');
              setupBMCInteractions(mesh, sectionName, advancedTexture);
            }
          });
          
          console.log('Main BMC model loaded successfully');
        }
      } catch (error) {
        console.error('Failed to load main BMC model:', error);
      }
    };

    // Setup BMC section interactions
    const setupBMCInteractions = (mesh: AbstractMesh, sectionName: string, advancedTexture: AdvancedDynamicTexture) => {
      mesh.actionManager = new ActionManager(scene);
      
      // Single click handler
      mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        console.log(`Clicked on ${sectionName}`);
        // Add your interaction logic here
      }));
      
      // Create title label
      const titleLabel = new Rectangle(`title_label_${sectionName}`);
      titleLabel.widthInPixels = 180;
      titleLabel.heightInPixels = 40;
      titleLabel.cornerRadius = 8;
      titleLabel.color = "transparent";
      titleLabel.thickness = 0;
      titleLabel.background = "rgba(255, 255, 255, 0.9)";
      advancedTexture.addControl(titleLabel);

      const titleText = new TextBlock(`title_${sectionName}`, sectionName);
      titleText.color = "#2D3748";
      titleText.fontSize = 16;
      titleText.fontWeight = "bold";
      titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      titleLabel.addControl(titleText);

      titleLabel.linkWithMesh(mesh);
      titleLabel.linkOffsetY = -60;
    };

    // Load models and start render loop
    loadMainBMCModel();
    
    // Start render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle window resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, [canvas]);

  // Handle view mode changes
  useEffect(() => {
    if (!sceneRef.current || !perspectiveCameraRef.current || !orthoCameraRef.current) return;
    
    const scene = sceneRef.current;
    
    if (isOrthographic) {
      // Switch to orthographic camera (3D Top View)
      scene.activeCamera = orthoCameraRef.current;
      orthoCameraRef.current.attachControl(canvasRef.current, true);
      perspectiveCameraRef.current.detachControl();
    } else {
      // Switch to perspective camera (3D View)  
      scene.activeCamera = perspectiveCameraRef.current;
      perspectiveCameraRef.current.attachControl(canvasRef.current, true);
      orthoCameraRef.current.detachControl();
    }
  }, [isOrthographic]);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ outline: 'none' }}
      />
    </div>
  );
};

export default Canvas3DBabylon;
export { Canvas3DBabylon };