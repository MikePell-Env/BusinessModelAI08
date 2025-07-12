import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Plane } from '@react-three/drei';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';
import * as THREE from 'three';

interface Canvas3DSimpleProps {
  canvas: BusinessModelCanvas;
  isTransitioning: boolean;
}

// Simple 3D Block Component
interface SimpleBlockProps {
  element: CanvasElement;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  onClick?: () => void;
}

const SimpleBlock: React.FC<SimpleBlockProps> = ({ 
  element, 
  position, 
  size, 
  color,
  onClick 
}) => {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    console.log(`Clicked on ${element.title}`);
    if (onClick) onClick();
  };

  return (
    <group position={position}>
      {/* Main Block */}
      <Box
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
      
      {/* Title Text */}
      <Text
        position={[0, size[1]/2 + 0.5, size[2]/2 + 0.1]}
        fontSize={0.3}
        color="#2D3748"
        anchorX="center"
        anchorY="middle"
        maxWidth={size[0] - 0.2}
      >
        {element.title}
      </Text>
      
      {/* Content Preview */}
      <Text
        position={[0, size[1]/2 + 0.1, size[2]/2 + 0.1]}
        fontSize={0.15}
        color="#4A5568"
        anchorX="center"
        anchorY="middle"
        maxWidth={size[0] - 0.2}
        textAlign="center"
      >
        {element.content.slice(0, 2).join(' • ')}
        {element.content.length > 2 ? '...' : ''}
      </Text>
    </group>
  );
};

// Simple Central Flow Component
const SimpleCentralFlow: React.FC = () => {
  const flowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (flowRef.current) {
      flowRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={[0, 0.5, 0]}>
      {/* Central rotating indicator */}
      <Box 
        ref={flowRef} 
        args={[0.5, 0.1, 2]} 
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color="#4A90E2" />
      </Box>
      
      {/* Value indicator */}
      <Box args={[0.3, 0.3, 0.3]} position={[0, 0.3, 0]}>
        <meshStandardMaterial color="#E53E3E" />
      </Box>
    </group>
  );
};

export const Canvas3DSimple: React.FC<Canvas3DSimpleProps> = ({ canvas, isTransitioning }) => {
  if (!canvas) return null;

  const handleBlockClick = (elementId: string) => {
    console.log(`Interacting with block: ${elementId}`);
  };

  return (
    <div 
      className={`w-full h-full transition-all duration-500 ${
        isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      <Canvas
        camera={{
          position: [8, 6, 8],
          fov: 50,
          near: 0.1,
          far: 1000
        }}
      >
        {/* Simple Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
        />
        
        {/* Ground Platform */}
        <Plane
          args={[20, 14]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.1, 0]}
        >
          <meshStandardMaterial color="#F7FAFC" />
        </Plane>

        {/* Simplified Business Model Canvas Layout */}
        
        {/* Left Side - Key Partners */}
        <SimpleBlock
          element={canvas.keyPartners}
          position={[-6, 0.5, 2]}
          size={[2, 1, 2]}
          color={canvas.keyPartners.color || '#FFE5E5'}
          onClick={() => handleBlockClick(canvas.keyPartners.id)}
        />

        {/* Upper Left - Key Activities */}
        <SimpleBlock
          element={canvas.keyActivities}
          position={[-3, 0.5, 4]}
          size={[2, 1, 2]}
          color={canvas.keyActivities.color || '#E5F3FF'}
          onClick={() => handleBlockClick(canvas.keyActivities.id)}
        />

        {/* Lower Left - Key Resources */}
        <SimpleBlock
          element={canvas.keyResources}
          position={[-3, 0.5, 0]}
          size={[2, 1, 2]}
          color={canvas.keyResources.color || '#E5FFE5'}
          onClick={() => handleBlockClick(canvas.keyResources.id)}
        />

        {/* Center - Value Propositions */}
        <group position={[0, 0, 2]}>
          <SimpleBlock
            element={canvas.valuePropositions}
            position={[0, 0.5, 0]}
            size={[3, 1, 3]}
            color={canvas.valuePropositions.color || '#FFF5E5'}
            onClick={() => handleBlockClick(canvas.valuePropositions.id)}
          />
          <SimpleCentralFlow />
        </group>

        {/* Upper Right - Customer Relationships */}
        <SimpleBlock
          element={canvas.customerRelationships}
          position={[3, 0.5, 4]}
          size={[2, 1, 2]}
          color={canvas.customerRelationships.color || '#F5E5FF'}
          onClick={() => handleBlockClick(canvas.customerRelationships.id)}
        />

        {/* Lower Right - Channels */}
        <SimpleBlock
          element={canvas.channels}
          position={[3, 0.5, 0]}
          size={[2, 1, 2]}
          color={canvas.channels.color || '#E5FFFF'}
          onClick={() => handleBlockClick(canvas.channels.id)}
        />

        {/* Right Side - Customer Segments */}
        <SimpleBlock
          element={canvas.customerSegments}
          position={[6, 0.5, 2]}
          size={[2, 1, 2]}
          color={canvas.customerSegments.color || '#FFE5F5'}
          onClick={() => handleBlockClick(canvas.customerSegments.id)}
        />

        {/* Bottom Left - Cost Structure */}
        <SimpleBlock
          element={canvas.costStructure}
          position={[-2, 0.5, -3]}
          size={[4, 1, 1.5]}
          color={canvas.costStructure.color || '#F0F0F0'}
          onClick={() => handleBlockClick(canvas.costStructure.id)}
        />

        {/* Bottom Right - Revenue Streams */}
        <SimpleBlock
          element={canvas.revenueStreams}
          position={[2, 0.5, -3]}
          size={[4, 1, 1.5]}
          color={canvas.revenueStreams.color || '#E5F5E5'}
          onClick={() => handleBlockClick(canvas.revenueStreams.id)}
        />

        {/* Title text */}
        <Text
          position={[0, 4, 0]}
          fontSize={0.8}
          color="#1A202C"
          anchorX="center"
          anchorY="middle"
        >
          {canvas.name}
        </Text>

        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={6}
          maxDistance={25}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
};