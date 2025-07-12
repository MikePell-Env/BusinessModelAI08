import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Box, Plane } from '@react-three/drei';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';
import * as THREE from 'three';

interface Canvas3DProps {
  canvas: BusinessModelCanvas;
  isTransitioning: boolean;
}

interface CanvasBlock3DProps {
  element: CanvasElement;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  onClick?: () => void;
}

const CanvasBlock3D: React.FC<CanvasBlock3DProps> = ({ 
  element, 
  position, 
  size, 
  color,
  onClick 
}) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  const handleClick = () => {
    console.log(`Clicked on ${element.title}`);
    if (onClick) onClick();
  };

  return (
    <group position={position}>
      {/* Main block */}
      <Box
        ref={meshRef}
        args={size}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial 
          color={hovered ? '#4A90E2' : color} 
          transparent
          opacity={0.8}
        />
      </Box>
      
      {/* Title text */}
      <Text
        position={[0, size[1] / 2 + 0.2, size[2] / 2 + 0.01]}
        fontSize={0.3}
        color="#2D3748"
        anchorX="center"
        anchorY="middle"
        maxWidth={size[0] - 0.2}
        font="/fonts/inter.json"
      >
        {element.title}
      </Text>
      
      {/* Content text */}
      <Text
        position={[0, 0, size[2] / 2 + 0.01]}
        fontSize={0.15}
        color="#4A5568"
        anchorX="center"
        anchorY="middle"
        maxWidth={size[0] - 0.4}
        textAlign="left"
        font="/fonts/inter.json"
      >
        {element.content.slice(0, 3).map((item, index) => `• ${item}`).join('\n')}
        {element.content.length > 3 ? '\n...' : ''}
      </Text>
    </group>
  );
};

export const Canvas3D: React.FC<Canvas3DProps> = ({ canvas, isTransitioning }) => {
  if (!canvas) return null;

  const handleBlockClick = (elementId: string) => {
    console.log(`Interacting with block: ${elementId}`);
    // Future: Open detail modal or trigger AI conversation
  };

  return (
    <div 
      className={`w-full h-full transition-all duration-500 ${
        isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      <Canvas
        camera={{
          position: [0, 5, 10],
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        shadows
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Background */}
        <Plane
          args={[50, 50]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -2, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#f7fafc" />
        </Plane>

        {/* Business Model Canvas 3D Layout */}
        {/* Row 1 & 2 - Key Partners (tall block) */}
        <CanvasBlock3D
          element={canvas.keyPartners}
          position={[-6, 0, 0]}
          size={[2.5, 4, 0.2]}
          color={canvas.keyPartners.color || '#FFE5E5'}
          onClick={() => handleBlockClick(canvas.keyPartners.id)}
        />

        {/* Key Activities */}
        <CanvasBlock3D
          element={canvas.keyActivities}
          position={[-3, 1, 0]}
          size={[2.5, 2, 0.2]}
          color={canvas.keyActivities.color || '#E5F3FF'}
          onClick={() => handleBlockClick(canvas.keyActivities.id)}
        />

        {/* Value Propositions (tall block, center) */}
        <CanvasBlock3D
          element={canvas.valuePropositions}
          position={[0, 0, 0]}
          size={[2.5, 4, 0.2]}
          color={canvas.valuePropositions.color || '#FFF5E5'}
          onClick={() => handleBlockClick(canvas.valuePropositions.id)}
        />

        {/* Customer Relationships */}
        <CanvasBlock3D
          element={canvas.customerRelationships}
          position={[3, 1, 0]}
          size={[2.5, 2, 0.2]}
          color={canvas.customerRelationships.color || '#F5E5FF'}
          onClick={() => handleBlockClick(canvas.customerRelationships.id)}
        />

        {/* Customer Segments (tall block) */}
        <CanvasBlock3D
          element={canvas.customerSegments}
          position={[6, 0, 0]}
          size={[2.5, 4, 0.2]}
          color={canvas.customerSegments.color || '#FFE5F5'}
          onClick={() => handleBlockClick(canvas.customerSegments.id)}
        />

        {/* Key Resources */}
        <CanvasBlock3D
          element={canvas.keyResources}
          position={[-3, -1, 0]}
          size={[2.5, 2, 0.2]}
          color={canvas.keyResources.color || '#E5FFE5'}
          onClick={() => handleBlockClick(canvas.keyResources.id)}
        />

        {/* Channels */}
        <CanvasBlock3D
          element={canvas.channels}
          position={[3, -1, 0]}
          size={[2.5, 2, 0.2]}
          color={canvas.channels.color || '#E5FFFF'}
          onClick={() => handleBlockClick(canvas.channels.id)}
        />

        {/* Cost Structure (wide block) */}
        <CanvasBlock3D
          element={canvas.costStructure}
          position={[-4.5, -3, 0]}
          size={[5, 2, 0.2]}
          color={canvas.costStructure.color || '#F0F0F0'}
          onClick={() => handleBlockClick(canvas.costStructure.id)}
        />

        {/* Revenue Streams (wide block) */}
        <CanvasBlock3D
          element={canvas.revenueStreams}
          position={[4.5, -3, 0]}
          size={[5, 2, 0.2]}
          color={canvas.revenueStreams.color || '#E5F5E5'}
          onClick={() => handleBlockClick(canvas.revenueStreams.id)}
        />

        {/* Title text floating above */}
        <Text
          position={[0, 6, 0]}
          fontSize={0.8}
          color="#1A202C"
          anchorX="center"
          anchorY="middle"
          font="/fonts/inter.json"
        >
          {canvas.name}
        </Text>

        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={25}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};
