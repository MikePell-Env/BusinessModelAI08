import React, { useRef, useEffect } from 'react';
import { AdvancedDynamicTexture } from '@babylonjs/gui';
import { BusinessModelCanvas } from '@/types/canvas';
import { useCanvas } from '@/lib/stores/useCanvas';
import { CleanBMCSystem } from '@/lib/cleanBMCSystem';
import {
  useSceneManager,
  useCameraController,
  useInteractionManager,
  useMaterialManager,
  useBMCObjectManager
} from './babylon';

interface Canvas3DBabylonRefactoredProps {
  canvas: BusinessModelCanvas;
  isTransitioning?: boolean;
}

export const Canvas3DBabylonRefactored: React.FC<Canvas3DBabylonRefactoredProps> = ({ 
  canvas, 
  isTransitioning 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanBMCRef = useRef<CleanBMCSystem | null>(null);
  const advancedTextureRef = useRef<AdvancedDynamicTexture | null>(null);

  const {
    isOrthographic,
    saveCamera3DState,
    getCamera3DState,
    setSelectedObject,
    getSelectedObject,
    bmcState
  } = useCanvas();

  // Initialize scene management
  const { scene, engine } = useSceneManager({
    canvasRef,
    onSceneReady: (scene, engine) => {
      console.log('Scene initialized successfully');
      
      // Create advanced texture for UI
      const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
      advancedTextureRef.current = advancedTexture;
    }
  });

  // Initialize camera management
  const { perspectiveCamera, orthographicCamera } = useCameraController({
    scene: scene!,
    canvas: canvasRef.current!,
    isOrthographic,
    camera3DState: getCamera3DState(),
    onSaveCamera3DState: saveCamera3DState
  });

  // Initialize material management
  const { setMeshVisualState, setMeshesVisualState } = useMaterialManager({
    scene: scene!
  });

  // Initialize BMC object management
  const { getObject, setObjectHeight, createLabelPlane } = useBMCObjectManager({
    scene: scene!,
    onObjectLoaded: (sectionName, mesh) => {
      console.log(`BMC object loaded: ${sectionName}`);
      
      // Register with CleanBMCSystem if available
      if (cleanBMCRef.current) {
        // This would need to be adapted based on the actual CleanBMCSystem interface
      }
      
      // Setup interactions for this mesh
      setupMeshInteraction(mesh, sectionName);
    },
    onAllObjectsLoaded: () => {
      console.log('All BMC objects loaded');
      initializeCleanBMCSystem();
    }
  });

  // Initialize interaction management
  const { setupMeshInteraction, createBillboardPanel, closeBillboardPanel } = useInteractionManager({
    scene: scene!,
    advancedTexture: advancedTextureRef.current!,
    onObjectSelect: (sectionName) => {
      setSelectedObject(sectionName);
      
      // Update visual states
      const selectedObject = getObject(sectionName);
      if (selectedObject) {
        setMeshVisualState(selectedObject.mesh, 'selected');
        
        // Fade other objects
        const allObjects = []; // Get all objects somehow
        const otherObjects = allObjects.filter(obj => obj.sectionName !== sectionName);
        setMeshesVisualState(otherObjects.map(obj => obj.mesh), 'faded');
      }
    },
    onPanelCreate: (sectionName, position) => {
      createBillboardPanel(sectionName, position);
    },
    onBackgroundClick: () => {
      closeBillboardPanel();
    }
  });

  const initializeCleanBMCSystem = () => {
    if (!scene) return;
    
    // Initialize CleanBMCSystem
    cleanBMCRef.current = new CleanBMCSystem();
    
    // Set BMC State Manager dependency
    if (bmcState) {
      cleanBMCRef.current.setBMCStateManager(bmcState);
    }

    console.log('CleanBMCSystem initialized');
  };

  // Handle view mode changes
  useEffect(() => {
    if (cleanBMCRef.current) {
      // Update visual states when switching views
      cleanBMCRef.current.updateAllVisuals();
    }
  }, [isOrthographic]);

  // Handle canvas data changes
  useEffect(() => {
    if (canvas && cleanBMCRef.current) {
      // Update BMC data in the system
      console.log('Canvas data updated');
    }
  }, [canvas]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (advancedTextureRef.current) {
        advancedTextureRef.current.dispose();
      }
      if (cleanBMCRef.current) {
        // Cleanup CleanBMCSystem if it has a cleanup method
      }
    };
  }, []);

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        transition: isTransitioning ? 'opacity 0.3s ease-in-out' : 'none',
        opacity: isTransitioning ? 0.7 : 1
      }}
    >
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block',
          outline: 'none'
        }}
        tabIndex={0}
      />
    </div>
  );
};