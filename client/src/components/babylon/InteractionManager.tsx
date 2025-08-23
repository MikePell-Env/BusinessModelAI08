import React, { useRef } from 'react';
import { 
  Scene,
  AbstractMesh,
  ActionManager,
  ExecuteCodeAction,
  PointerEventTypes,
  Vector3
} from '@babylonjs/core';
import { 
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Control
} from '@babylonjs/gui';
import { BMCComponentName } from '@/types/bmcState';

interface InteractionManagerProps {
  scene: Scene | null;
  advancedTexture: AdvancedDynamicTexture | null;
  onObjectSelect?: (sectionName: string) => void;
  onPanelCreate?: (sectionName: string, position: Vector3) => void;
  onBackgroundClick?: () => void;
}

interface PanelRef {
  current: Rectangle | null;
}

export const useInteractionManager = ({
  scene,
  advancedTexture,
  onObjectSelect,
  onPanelCreate,
  onBackgroundClick
}: InteractionManagerProps) => {
  const currentPanelRef = useRef<Rectangle | null>(null);

  const setupMeshInteraction = (
    mesh: AbstractMesh, 
    sectionName: string,
    onHoverEnter?: () => void,
    onHoverExit?: () => void
  ) => {
    if (!scene || !mesh.actionManager) {
      if (scene) {
        mesh.actionManager = new ActionManager(scene);
      } else {
        return; // Skip if scene is not ready
      }
    }

    // Single click for immediate selection
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
      if (onObjectSelect) {
        onObjectSelect(sectionName);
      }
    }));

    // Double-click for panel
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnDoublePickTrigger, () => {
      // Close existing panel
      if (currentPanelRef.current) {
        advancedTexture.removeControl(currentPanelRef.current);
        currentPanelRef.current = null;
      }

      // Create new panel
      const meshWorldPosition = mesh.getAbsolutePosition();
      if (onPanelCreate) {
        onPanelCreate(sectionName, meshWorldPosition);
      }
    }));

    // Hover effects
    if (onHoverEnter) {
      mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        onHoverEnter();
      }));
    }

    if (onHoverExit) {
      mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        onHoverExit();
      }));
    }
  };

  const setupBackgroundClickHandler = () => {
    // Background click handler for panels only
    if (!scene || !scene.onPointerObservable) {
      console.warn('Scene or onPointerObservable not available');
      return;
    }
    
    scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        if (pointerInfo.pickInfo?.hit) {
          const hitMesh = pointerInfo.pickInfo.pickedMesh;
          const isBMCMesh = hitMesh && (
            hitMesh.name.includes('BMC_') || 
            hitMesh.name.includes('Revenue') ||
            hitMesh.name.includes('Cost')
          );
          
          if (!isBMCMesh && currentPanelRef.current) {
            if (onBackgroundClick) {
              onBackgroundClick();
            }
          }
        } else if (currentPanelRef.current) {
          if (onBackgroundClick) {
            onBackgroundClick();
          }
        }
      }
    });
  };

  const createBillboardPanel = (sectionName: string, worldPosition: Vector3) => {
    // Close existing panel first
    if (currentPanelRef.current) {
      advancedTexture.removeControl(currentPanelRef.current);
      currentPanelRef.current = null;
    }

    // Create new panel
    const panel = new Rectangle();
    panel.widthInPixels = 300;
    panel.heightInPixels = 200;
    panel.cornerRadius = 10;
    panel.color = "white";
    panel.thickness = 2;
    panel.background = "rgba(0, 0, 0, 0.8)";
    
    // Add text content
    const textBlock = new TextBlock();
    textBlock.text = `${sectionName}\n\nClick to edit content for this section.`;
    textBlock.color = "white";
    textBlock.fontSize = 16;
    textBlock.textWrapping = true;
    panel.addControl(textBlock);

    // Position panel in world space
    const screenPosition = Vector3.Project(
      worldPosition,
      scene.getTransformMatrix(),
      scene.activeCamera!.getProjectionMatrix(),
      scene.activeCamera!.viewport
    );

    panel.leftInPixels = screenPosition.x - 150;
    panel.topInPixels = screenPosition.y - 100;

    advancedTexture.addControl(panel);
    currentPanelRef.current = panel;

    return panel;
  };

  const closeBillboardPanel = () => {
    if (currentPanelRef.current) {
      advancedTexture.removeControl(currentPanelRef.current);
      currentPanelRef.current = null;
    }
  };

  // Initialize background click handler
  React.useEffect(() => {
    if (scene && scene.onPointerObservable) {
      setupBackgroundClickHandler();
    }
  }, [scene]);

  return {
    setupMeshInteraction,
    createBillboardPanel,
    closeBillboardPanel,
    currentPanel: currentPanelRef.current
  };
};

// Utility function to map BMC component names to section names
export const mapBMCComponentToSectionName = (componentName: BMCComponentName): string => {
  const mapping: Record<BMCComponentName, string> = {
    'KeyPartners': 'Key Partners',
    'KeyActivities': 'Key Activities', 
    'KeyResources': 'Key Resources',
    'ValueProposition': 'Value Propositions',
    'CustomerRelationships': 'Customer Relationships',
    'CustomerChannels': 'Channels',
    'CustomerSegments': 'Customer Segments',
    'CostStructure': 'Cost Structure',
    'RevenueStreams': 'Revenue Streams'
  };
  
  return mapping[componentName] || componentName;
};