/**
 * Canvas3DBabylon - Main orchestrator for 3D BMC visualization
 * Simplified and refactored to use modular components
 */

import React, { useRef, useEffect, useState } from 'react';
import { AdvancedDynamicTexture } from '@babylonjs/gui';
import { BusinessModelCanvas } from '@/types/canvas';
import { useCanvas } from '@/lib/stores/useCanvas';
import { cleanBMCSystem } from '@/lib/cleanBMCSystem';
import { SceneSetup } from './Canvas3DBabylon/scene/SceneSetup';
import { CameraController } from './Canvas3DBabylon/scene/CameraController';
import { BMCModelLoader } from './Canvas3DBabylon/models/BMCModelLoader';
import { InteractionHandler } from './Canvas3DBabylon/interactions/InteractionHandler';
import { ViewTransitionManager } from './Canvas3DBabylon/animations/ViewTransitionManager';
import { PanelContentManager } from './Canvas3DBabylon/ui/PanelContentManager';
import { BMCStateSync } from './Canvas3DBabylon/state/BMCStateSync';
import { debugLog } from '@/lib/debug/DebugLogger';
import { ExecuteCodeAction, ActionManager } from '@babylonjs/core';

interface Canvas3DBabylonProps {
  canvas: BusinessModelCanvas;
  isTransitioning?: boolean;
}

const Canvas3DBabylon: React.FC<Canvas3DBabylonProps> = ({ 
  canvas, 
  isTransitioning = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Store component references
  const sceneSetupRef = useRef<SceneSetup | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);
  const modelLoaderRef = useRef<BMCModelLoader | null>(null);
  const interactionHandlerRef = useRef<InteractionHandler | null>(null);
  const viewTransitionRef = useRef<ViewTransitionManager | null>(null);
  const panelManagerRef = useRef<PanelContentManager | null>(null);
  const stateSync = useRef<BMCStateSync | null>(null);
  const advancedTextureRef = useRef<AdvancedDynamicTexture | null>(null);
  
  // Get state from stores
  const { is3D, isOrthographic, getSelectedObject, setSelectedObject, bmcState } = useCanvas();

  // Initialize the 3D scene
  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    const initialize = async () => {
      try {
        debugLog.info('main', 'Initializing 3D BMC visualization...');
        
        // 1. Setup scene and engine
        const sceneSetup = new SceneSetup(canvasRef.current!);
        sceneSetupRef.current = sceneSetup;
        const scene = sceneSetup.getScene();
        
        // 2. Setup cameras
        const cameraController = new CameraController(scene, canvasRef.current!);
        cameraControllerRef.current = cameraController;
        
        // 3. Setup view transition manager
        const viewTransitionManager = new ViewTransitionManager(scene);
        viewTransitionRef.current = viewTransitionManager;
        
        // 4. Initialize CleanBMCSystem
        cleanBMCSystem.setViewTransitionManager(viewTransitionManager);
        cleanBMCSystem.setBMCStateManager(bmcState);
        cleanBMCSystem.setTopViewMode(isOrthographic);
        
        // 5. Setup state sync
        const sync = new BMCStateSync(cleanBMCSystem);
        stateSync.current = sync;
        
        // 6. Load models
        const modelLoader = new BMCModelLoader(scene);
        modelLoaderRef.current = modelLoader;
        
        // Load main BMC model
        const mainModel = await modelLoader.loadMainBMC();
        
        // Register BMC sections with CleanBMCSystem
        mainModel.meshes.forEach(mesh => {
          if (mesh.name && mesh.name.includes('BMC_') && mesh.material) {
            const sectionName = mesh.name.replace('BMC_', '').replace(/_/g, ' ');
            // Register the main mesh with its current height
            cleanBMCSystem.registerItem(sectionName, mesh, mesh.material as any, mesh.scaling.y);
            
            // Find and add any label mesh for this section
            const labelMesh = mainModel.meshes.find(m => m.name?.includes(`Label_${sectionName.replace(/ /g, '')}`));
            if (labelMesh && labelMesh.material) {
              cleanBMCSystem.addLabel(sectionName, labelMesh, labelMesh.material as any);
            }
          }
        });
        
        // Load additional models (comment out for now to test)
        // await modelLoader.loadRevenueStreams();
        // await modelLoader.loadCostStructure();
        
        // 7. Setup interactions
        const interactionHandler = new InteractionHandler(scene);
        interactionHandler.setCleanBMC(cleanBMCSystem);
        interactionHandlerRef.current = interactionHandler;
        
        // Register interaction callbacks
        interactionHandler.registerCallbacks({
          onSingleClick: (sectionName) => {
            stateSync.current?.handleObjectClick(sectionName, bmcState);
          },
          onDoubleClick: (sectionName, position) => {
            panelManagerRef.current?.showPanel(sectionName, position);
          },
          onHoverEnter: (sectionName) => {
            cleanBMCSystem.onHover(sectionName, true);
          },
          onHoverExit: (sectionName) => {
            cleanBMCSystem.onHover(sectionName, false);
          }
        });
        
        // Setup interactions for all BMC meshes
        cleanBMCSystem.getAllItems().forEach(itemName => {
          const mesh = cleanBMCSystem.getMesh(itemName);
          if (mesh) {
            interactionHandler.setupMeshInteractions(mesh, itemName);
          }
        });
        
        // 8. Setup ground click handler
        const ground = sceneSetup.getGround();
        if (ground) {
          ground.actionManager = new ActionManager(scene);
          ground.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnPickTrigger, 
            () => {
              cleanBMCSystem.clearSelection();
              panelManagerRef.current?.closePanel();
              setSelectedObject?.(null);
            }
          ));
        }
        
        // 9. Setup GUI
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        advancedTextureRef.current = advancedTexture;
        
        const panelManager = new PanelContentManager(canvas);
        panelManager.setAdvancedTexture(advancedTexture);
        panelManagerRef.current = panelManager;
        
        // 10. Start render loop
        sceneSetup.startRenderLoop(() => {
          scene.render();
        });
        
        // Handle window resize
        window.addEventListener("resize", () => {
          sceneSetup.resize();
        });
        
        setIsInitialized(true);
        debugLog.info('main', '3D BMC visualization initialized successfully');
        
      } catch (error) {
        debugLog.error('main', 'Failed to initialize 3D scene', error);
      }
    };

    initialize();
    
    // Cleanup
    return () => {
      if (sceneSetupRef.current) {
        sceneSetupRef.current.dispose();
      }
      if (panelManagerRef.current) {
        panelManagerRef.current.dispose();
      }
      if (cameraControllerRef.current) {
        cameraControllerRef.current.dispose();
      }
      // Clear all registered items
      cleanBMCSystem.getAllItems().forEach(itemName => {
        // Items will be cleared when scene is disposed
      });
      setIsInitialized(false);
    };
  }, [canvas]); // Dependency on canvas to reinitialize if needed

  // Handle view mode changes
  useEffect(() => {
    if (!isInitialized || !cameraControllerRef.current) return;
    
    const mode = isOrthographic ? '3D Top' : '3D View';
    cameraControllerRef.current.switchToMode(mode);
    stateSync.current?.setTopViewMode(isOrthographic);
    
    // Update visuals after view change
    setTimeout(() => {
      stateSync.current?.updateAllVisuals();
    }, 100);
    
  }, [isOrthographic, isInitialized]);

  // Sync selection state
  useEffect(() => {
    if (!isInitialized || !stateSync.current) return;
    stateSync.current.syncSelectionFromBMCState(bmcState);
  }, [bmcState, isInitialized]);

  // Handle transition animations
  useEffect(() => {
    if (!isInitialized || !viewTransitionRef.current) return;
    
    if (isTransitioning && !is3D) {
      // Transitioning to 2D - could add exit animation here
      debugLog.verbose('main', 'Transitioning to 2D view');
    }
  }, [isTransitioning, is3D, isInitialized]);

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