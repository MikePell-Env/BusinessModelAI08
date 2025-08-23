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

  // Initialize camera management - always call hook, handle null inside
  const { perspectiveCamera, orthographicCamera } = useCameraController({
    scene: scene || null,
    canvas: canvasRef.current || null,
    isOrthographic,
    camera3DState: getCamera3DState(),
    onSaveCamera3DState: saveCamera3DState
  });

  // Initialize material management - always call hook, handle null scene inside
  const materialManager = useMaterialManager({ scene: scene || null });
  const { setMeshVisualState, setMeshesVisualState } = materialManager;

  // Initialize interaction management first - needed by BMC object manager
  const interactionManager = React.useMemo(() => {
    if (!scene || !advancedTextureRef.current) return null;
    
    return useInteractionManager({
      scene,
      advancedTexture: advancedTextureRef.current,
      onObjectSelect: (sectionName) => {
        setSelectedObject(sectionName);
        console.log(`Selected: ${sectionName}`);
      },
      onPanelCreate: (sectionName, position) => {
        console.log(`Panel created for: ${sectionName}`);
      },
      onBackgroundClick: () => {
        console.log('Background clicked');
      }
    });
  }, [scene, advancedTextureRef.current]);

  // Initialize BMC object management - depends on interaction manager
  const bmcObjectManager = React.useMemo(() => {
    if (!scene) return null;
    
    return useBMCObjectManager({
      scene,
      onObjectLoaded: (sectionName, mesh) => {
        console.log(`BMC object loaded: ${sectionName}`);
        
        // Setup interactions for this mesh when interaction manager is ready
        if (interactionManager) {
          interactionManager.setupMeshInteraction(mesh, sectionName);
        }
      },
      onAllObjectsLoaded: () => {
        console.log('All BMC objects loaded');
        initializeCleanBMCSystem();
      }
    });
  }, [scene, interactionManager]);

  const { getObject, setObjectHeight, createLabelPlane } = bmcObjectManager || {
    getObject: () => undefined,
    setObjectHeight: () => false,
    createLabelPlane: () => null as any
  };

  const { setupMeshInteraction, createBillboardPanel, closeBillboardPanel } = interactionManager || {
    setupMeshInteraction: () => {},
    createBillboardPanel: () => null,
    closeBillboardPanel: () => {}
  };

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