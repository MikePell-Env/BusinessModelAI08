/**
 * EMERGENCY LABEL FIX
 * Simple, direct approach to ensure all BMC labels are always visible
 */
import { useEffect } from 'react';

interface LabelFixProps {
  scene: any;
}

export const LabelFix: React.FC<LabelFixProps> = ({ scene }) => {
  useEffect(() => {
    if (!scene) return;

    const fixLabels = () => {
      // Find all label meshes and force visibility
      const labelMeshes = scene.meshes.filter((mesh: any) => 
        mesh.name && (
          mesh.name.includes('Label') || 
          mesh.name.includes('label') ||
          mesh.name.includes('customerSegmentsLabel') ||
          mesh.name.includes('keyPartnersLabel') ||
          mesh.name.includes('keyActivitiesLabel') ||
          mesh.name.includes('keyResourcesLabel') ||
          mesh.name.includes('valuePropositionsLabel') ||
          mesh.name.includes('customerRelationshipsLabel') ||
          mesh.name.includes('customerChannelsLabel')
        )
      );

      labelMeshes.forEach((labelMesh: any) => {
        // Force visibility
        labelMesh.isVisible = true;
        labelMesh.setEnabled(true);
        
        // Force material visibility
        if (labelMesh.material) {
          const material = labelMesh.material;
          material.alpha = 1.0;
          material.backFaceCulling = false;
          
          if (material.emissiveColor && material.emissiveTexture) {
            material.emissiveColor.set(1.0, 1.0, 1.0);
          }
          
          material.useAlphaFromDiffuseTexture = true;
          material.disableLighting = false;
        }
        
        // Remove any parent relationships that might cause inheritance issues
        if (labelMesh.parent && labelMesh.parent.material) {
          labelMesh.parent = null;
        }
      });

      console.log(`🚨 EMERGENCY LABEL FIX: Forced visibility for ${labelMeshes.length} labels`);
    };

    // Fix labels immediately and then periodically
    fixLabels();
    
    const interval = setInterval(fixLabels, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [scene]);

  return null;
};