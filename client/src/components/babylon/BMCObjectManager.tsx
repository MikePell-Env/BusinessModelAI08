import React, { useRef } from 'react';
import { 
  Scene,
  SceneLoader,
  AbstractMesh,
  TransformNode,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Texture
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { BMCComponentName, BMC_COMPONENTS } from '@/types/bmcState';
import { mapBMCComponentToSectionName } from './InteractionManager';

interface BMCObjectDescriptor {
  mesh: AbstractMesh;
  sectionName: string;
  objectType: 'main_bmc' | 'separate_glb';
  transformNode?: TransformNode;
  rootMesh?: AbstractMesh;
  originalHeight: number;
}

interface BMCObjectManagerProps {
  scene: Scene | null;
  onObjectLoaded?: (sectionName: string, mesh: AbstractMesh) => void;
  onAllObjectsLoaded?: () => void;
}

export const useBMCObjectManager = ({ 
  scene, 
  onObjectLoaded, 
  onAllObjectsLoaded 
}: BMCObjectManagerProps) => {
  const objectsRef = useRef<Map<string, BMCObjectDescriptor>>(new Map());
  const loadingCountRef = useRef(0);

  const registerObject = (sectionName: string, descriptor: BMCObjectDescriptor) => {
    objectsRef.current.set(sectionName, descriptor);
    console.log(`Registered ${sectionName} as ${descriptor.objectType}`);
  };

  const getObject = (sectionName: string): BMCObjectDescriptor | undefined => {
    return objectsRef.current.get(sectionName);
  };

  const setObjectHeight = (sectionName: string, height: number): boolean => {
    const obj = objectsRef.current.get(sectionName);
    if (!obj) {
      console.warn(`Object not found: ${sectionName}`);
      return false;
    }
    
    if (obj.objectType === 'main_bmc' && obj.transformNode) {
      obj.transformNode.scaling.y = height;
    } else if (obj.objectType === 'separate_glb') {
      obj.mesh.scaling.y = height;
    }
    return true;
  };

  const createLabelPlane = (
    sectionName: string, 
    position: Vector3, 
    width: number = 2, 
    height: number = 0.5
  ): AbstractMesh => {
    if (!scene) return null as any;
    
    const labelPlane = MeshBuilder.CreatePlane(
      `${sectionName}_label`, 
      { width, height }, 
      scene
    );
    
    labelPlane.position = position;
    labelPlane.billboardMode = AbstractMesh.BILLBOARDMODE_ALL;
    
    // Create material with texture
    const labelTexturePath = getLabelTexturePath(sectionName);
    const labelMaterial = new StandardMaterial(`${sectionName}_labelMaterial`, scene!);
    
    if (labelTexturePath) {
      labelMaterial.diffuseTexture = new Texture(labelTexturePath, scene!);
      labelMaterial.diffuseTexture.hasAlpha = true;
    }
    
    labelMaterial.alpha = 1.0;
    labelPlane.material = labelMaterial;
    
    return labelPlane;
  };

  const getLabelTexturePath = (sectionName: string): string | null => {
    const labelMap: Record<string, string> = {
      'Key Partners': '/textures/Label_KeyPartners.png',
      'Key Activities': '/textures/Label_KeyActivities.png', 
      'Key Resources': '/textures/Label_KeyResources.png',
      'Value Propositions': '/textures/Label_ValueProposition.png',
      'Customer Relationships': '/textures/Label_CustomerRelationships.png',
      'Channels': '/textures/Label_CustomerChannels.png',
      'Customer Segments': '/textures/Label_CustomerSegments.png',
      'Cost Structure': '/textures/Label_CostStructure.png',
      'Revenue Streams': '/textures/Label_RevenueStreams.png'
    };
    
    return labelMap[sectionName] || null;
  };

  const loadMainBMCModel = async () => {
    try {
      loadingCountRef.current++;
      
      const result = await SceneLoader.ImportMeshAsync(
        "", 
        "/models/", 
        "BMC_blender_09_complete_1753576063858.glb", 
        scene!
      );
      
      if (result.meshes.length === 0) {
        throw new Error('No meshes found in main BMC model');
      }

      // Process each mesh in the main BMC model
      result.meshes.forEach((mesh) => {
        if (mesh.name && mesh.name !== '__root__') {
          // Extract component name from mesh name
          const meshName = mesh.name.replace('BMC_', '');
          const componentName = meshName as BMCComponentName;
          
          if (BMC_COMPONENTS.includes(componentName)) {
            const sectionName = mapBMCComponentToSectionName(componentName);
            
            // Create transform node for scaling
            const transformNode = new TransformNode(`${sectionName}_transform`, scene!);
            mesh.parent = transformNode;
            
            const descriptor: BMCObjectDescriptor = {
              mesh,
              sectionName,
              objectType: 'main_bmc',
              transformNode,
              originalHeight: 1.0
            };
            
            registerObject(sectionName, descriptor);
            
            if (onObjectLoaded) {
              onObjectLoaded(sectionName, mesh);
            }
          }
        }
      });

      console.log('Main BMC model loaded successfully');
      loadingCountRef.current--;
      checkLoadingComplete();
      
    } catch (error) {
      console.error('Error loading main BMC model:', error);
      loadingCountRef.current--;
      checkLoadingComplete();
    }
  };

  const loadSeparateGLBModel = async (
    modelPath: string, 
    sectionName: string, 
    position: Vector3
  ) => {
    try {
      loadingCountRef.current++;
      
      const result = await SceneLoader.ImportMeshAsync("", "/models/", modelPath, scene);
      
      if (result.meshes.length === 0) {
        throw new Error(`No meshes found in ${modelPath}`);
      }

      const rootMesh = result.meshes[0];
      rootMesh.position = position;
      rootMesh.scaling = new Vector3(1, 1, 1);
      
      const descriptor: BMCObjectDescriptor = {
        mesh: rootMesh,
        sectionName,
        objectType: 'separate_glb',
        rootMesh,
        originalHeight: 1.0
      };
      
      registerObject(sectionName, descriptor);
      
      if (onObjectLoaded) {
        onObjectLoaded(sectionName, rootMesh);
      }

      console.log(`Separate GLB model loaded: ${sectionName}`);
      loadingCountRef.current--;
      checkLoadingComplete();
      
    } catch (error) {
      console.error(`Error loading ${modelPath}:`, error);
      loadingCountRef.current--;
      checkLoadingComplete();
    }
  };

  const checkLoadingComplete = () => {
    if (loadingCountRef.current === 0 && onAllObjectsLoaded) {
      onAllObjectsLoaded();
    }
  };

  const loadAllBMCObjects = async () => {
    console.log('Starting to load all BMC objects...');
    
    // Load main BMC model
    await loadMainBMCModel();
    
    // Load Revenue Streams
    await loadSeparateGLBModel(
      'BMC_blender_07_RevenueStreams_1754360428541.glb',
      'Revenue Streams',
      new Vector3(-0.221, 0.1, -10.5)
    );
    
    // Load Cost Structure  
    await loadSeparateGLBModel(
      'BMC_blender_07_CostStructure_1754477996199.glb',
      'Cost Structure', 
      new Vector3(-10.1, 0.1, -10.5)
    );
  };

  const getAllObjects = (): BMCObjectDescriptor[] => {
    return Array.from(objectsRef.current.values());
  };

  const disposeAllObjects = () => {
    objectsRef.current.forEach(descriptor => {
      if (descriptor.mesh && !descriptor.mesh.isDisposed) {
        descriptor.mesh.dispose();
      }
      if (descriptor.transformNode && !descriptor.transformNode.isDisposed) {
        descriptor.transformNode.dispose();
      }
    });
    objectsRef.current.clear();
  };

  // Initialize loading when scene is ready
  React.useEffect(() => {
    if (scene) {
      loadAllBMCObjects();
    }
  }, [scene]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => disposeAllObjects();
  }, []);

  return {
    registerObject,
    getObject,
    setObjectHeight,
    createLabelPlane,
    getAllObjects,
    loadAllBMCObjects,
    disposeAllObjects
  };
};