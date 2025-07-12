import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Plane, Cylinder, Sphere, Torus } from '@react-three/drei';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';
import * as THREE from 'three';

interface Canvas3DProps {
  canvas: BusinessModelCanvas;
  isTransitioning: boolean;
}

// Platform Section Component
interface PlatformSectionProps {
  element: CanvasElement;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  height?: number;
  objectType?: 'person' | 'building' | 'package' | 'truck' | 'computer' | 'document' | 'heart';
  onClick?: () => void;
}

// Simple 3D Person Figure
const PersonFigure: React.FC<{ position: [number, number, number]; color?: string }> = ({ 
  position, 
  color = "#4A90E2" 
}) => (
  <group position={position}>
    {/* Head */}
    <Sphere args={[0.15]} position={[0, 1.7, 0]}>
      <meshStandardMaterial color={color} />
    </Sphere>
    {/* Body */}
    <Box args={[0.3, 0.8, 0.15]} position={[0, 1.2, 0]}>
      <meshStandardMaterial color={color} />
    </Box>
    {/* Legs */}
    <Box args={[0.12, 0.6, 0.12]} position={[-0.08, 0.6, 0]}>
      <meshStandardMaterial color={color} />
    </Box>
    <Box args={[0.12, 0.6, 0.12]} position={[0.08, 0.6, 0]}>
      <meshStandardMaterial color={color} />
    </Box>
  </group>
);

// 3D Object Components
const ObjectComponents = {
  building: ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      <Box args={[0.4, 0.6, 0.4]} position={[0, 0.3, 0]}>
        <meshStandardMaterial color="#8B7355" />
      </Box>
      <Box args={[0.2, 0.4, 0.2]} position={[0, 0.8, 0]}>
        <meshStandardMaterial color="#A0522D" />
      </Box>
    </group>
  ),
  
  package: ({ position }: { position: [number, number, number] }) => (
    <Box args={[0.3, 0.3, 0.3]} position={position}>
      <meshStandardMaterial color="#CD853F" />
    </Box>
  ),
  
  truck: ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      <Box args={[0.6, 0.25, 0.3]} position={[0, 0.125, 0]}>
        <meshStandardMaterial color="#FF6B6B" />
      </Box>
      <Box args={[0.25, 0.3, 0.25]} position={[0.25, 0.25, 0]}>
        <meshStandardMaterial color="#FF6B6B" />
      </Box>
      {/* Wheels */}
      <Cylinder args={[0.08, 0.08, 0.05]} position={[-0.2, 0, 0.18]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#2D3748" />
      </Cylinder>
      <Cylinder args={[0.08, 0.08, 0.05]} position={[0.2, 0, 0.18]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#2D3748" />
      </Cylinder>
    </group>
  ),
  
  computer: ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      <Box args={[0.3, 0.02, 0.2]} position={[0, 0.01, 0]}>
        <meshStandardMaterial color="#2D3748" />
      </Box>
      <Box args={[0.28, 0.2, 0.02]} position={[0, 0.1, -0.09]}>
        <meshStandardMaterial color="#4A5568" />
      </Box>
    </group>
  ),
  
  document: ({ position }: { position: [number, number, number] }) => (
    <Box args={[0.2, 0.02, 0.28]} position={position}>
      <meshStandardMaterial color="#F7FAFC" />
    </Box>
  ),
  
  heart: ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      <Sphere args={[0.15]} position={[-0.1, 0, 0]}>
        <meshStandardMaterial color="#E53E3E" />
      </Sphere>
      <Sphere args={[0.15]} position={[0.1, 0, 0]}>
        <meshStandardMaterial color="#E53E3E" />
      </Sphere>
      <Box args={[0.2, 0.2, 0.1]} position={[0, -0.1, 0]}>
        <meshStandardMaterial color="#E53E3E" />
      </Box>
    </group>
  )
};

const PlatformSection: React.FC<PlatformSectionProps> = ({ 
  element, 
  position, 
  size, 
  color,
  height = 0.2,
  objectType = 'person',
  onClick 
}) => {
  const [hovered, setHovered] = useState(false);
  const platformHeight = height;

  const handleClick = () => {
    console.log(`Clicked on ${element.title}`);
    if (onClick) onClick();
  };

  const ObjectComponent = ObjectComponents[objectType] || PersonFigure;

  return (
    <group position={position}>
      {/* Platform Base */}
      <Box
        args={[size[0], platformHeight, size[2]]}
        position={[0, platformHeight / 2, 0]}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial 
          color={hovered ? '#4A90E2' : color} 
          transparent
          opacity={0.9}
        />
      </Box>
      
      {/* Object on Platform */}
      {objectType === 'person' ? (
        <PersonFigure position={[0, platformHeight, 0]} color="#4A90E2" />
      ) : (
        <ObjectComponent position={[0, platformHeight + 0.15, 0]} />
      )}
      
      {/* Title Text */}
      <Text
        position={[0, platformHeight + 2, size[2] / 2 + 0.1]}
        fontSize={0.25}
        color="#2D3748"
        anchorX="center"
        anchorY="middle"
        maxWidth={size[0] - 0.2}
      >
        {element.title}
      </Text>
      
      {/* Content Preview */}
      <Text
        position={[0, platformHeight + 1.5, size[2] / 2 + 0.1]}
        fontSize={0.12}
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

// Central Flow Component (like your sketch's circular center)
const CentralFlow: React.FC = () => {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={[0, 0.5, 0]}>
      {/* Central platform */}
      <Cylinder args={[2, 2, 0.2]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#FFF5E5" transparent opacity={0.8} />
      </Cylinder>
      
      {/* Rotating flow ring */}
      <Torus 
        ref={ringRef} 
        args={[1.5, 0.1]} 
        position={[0, 0.2, 0]} 
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial color="#4A90E2" />
      </Torus>
      
      {/* Heart symbol in center (like your sketch) */}
      <group position={[0, 0.4, 0]}>
        <Sphere args={[0.15]} position={[-0.1, 0, 0]}>
          <meshStandardMaterial color="#E53E3E" />
        </Sphere>
        <Sphere args={[0.15]} position={[0.1, 0, 0]}>
          <meshStandardMaterial color="#E53E3E" />
        </Sphere>
        <Box args={[0.2, 0.2, 0.1]} position={[0, -0.1, 0]}>
          <meshStandardMaterial color="#E53E3E" />
        </Box>
      </group>
      
      {/* Flow indicators */}
      <Box args={[0.1, 0.05, 0.3]} position={[1.2, 0.25, 0]} rotation={[0, 0, Math.PI / 4]}>
        <meshStandardMaterial color="#4A90E2" />
      </Box>
      <Box args={[0.1, 0.05, 0.3]} position={[-1.2, 0.25, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <meshStandardMaterial color="#4A90E2" />
      </Box>
    </group>
  );
};

export const Canvas3D: React.FC<Canvas3DProps> = ({ canvas, isTransitioning }) => {
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
          position: [8, 12, 8],
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        shadows
      >
        {/* Enhanced Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[15, 15, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        
        {/* Main Ground Platform */}
        <Plane
          args={[24, 16]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.1, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#E2E8F0" />
        </Plane>

        {/* Multi-level Business Model Canvas Layout Based on Your Sketch */}
        
        {/* Left Side - Key Partners (building/partnership representation) */}
        <PlatformSection
          element={canvas.keyPartners}
          position={[-8, 0, 2]}
          size={[3, 3]}
          color={canvas.keyPartners.color || '#FFE5E5'}
          height={0.3}
          objectType="building"
          onClick={() => handleBlockClick(canvas.keyPartners.id)}
        />

        {/* Upper Left - Key Activities (person working) */}
        <PlatformSection
          element={canvas.keyActivities}
          position={[-5, 0, 5]}
          size={[2.5, 2.5]}
          color={canvas.keyActivities.color || '#E5F3FF'}
          height={0.4}
          objectType="person"
          onClick={() => handleBlockClick(canvas.keyActivities.id)}
        />

        {/* Lower Left - Key Resources (multiple objects) */}
        <PlatformSection
          element={canvas.keyResources}
          position={[-5, 0, -1]}
          size={[2.5, 2.5]}
          color={canvas.keyResources.color || '#E5FFE5'}
          height={0.2}
          objectType="computer"
          onClick={() => handleBlockClick(canvas.keyResources.id)}
        />

        {/* Center - Value Propositions with Central Flow */}
        <group position={[0, 0, 2]}>
          <PlatformSection
            element={canvas.valuePropositions}
            position={[0, 0, 0]}
            size={[4, 4]}
            color={canvas.valuePropositions.color || '#FFF5E5'}
            height={0.1}
            objectType="heart"
            onClick={() => handleBlockClick(canvas.valuePropositions.id)}
          />
          <CentralFlow />
        </group>

        {/* Upper Right - Customer Relationships (person) */}
        <PlatformSection
          element={canvas.customerRelationships}
          position={[5, 0, 5]}
          size={[2.5, 2.5]}
          color={canvas.customerRelationships.color || '#F5E5FF'}
          height={0.4}
          objectType="person"
          onClick={() => handleBlockClick(canvas.customerRelationships.id)}
        />

        {/* Lower Right - Channels (truck/delivery) */}
        <PlatformSection
          element={canvas.channels}
          position={[5, 0, -1]}
          size={[2.5, 2.5]}
          color={canvas.channels.color || '#E5FFFF'}
          height={0.2}
          objectType="truck"
          onClick={() => handleBlockClick(canvas.channels.id)}
        />

        {/* Right Side - Customer Segments (person on elevated platform) */}
        <PlatformSection
          element={canvas.customerSegments}
          position={[8, 0, 2]}
          size={[3, 3]}
          color={canvas.customerSegments.color || '#FFE5F5'}
          height={0.5}
          objectType="person"
          onClick={() => handleBlockClick(canvas.customerSegments.id)}
        />

        {/* Bottom Left - Cost Structure (documents/financial) */}
        <PlatformSection
          element={canvas.costStructure}
          position={[-3, 0, -4]}
          size={[5, 2]}
          color={canvas.costStructure.color || '#F0F0F0'}
          height={0.1}
          objectType="document"
          onClick={() => handleBlockClick(canvas.costStructure.id)}
        />

        {/* Bottom Right - Revenue Streams (packages/money flow) */}
        <PlatformSection
          element={canvas.revenueStreams}
          position={[3, 0, -4]}
          size={[5, 2]}
          color={canvas.revenueStreams.color || '#E5F5E5'}
          height={0.1}
          objectType="package"
          onClick={() => handleBlockClick(canvas.revenueStreams.id)}
        />

        {/* Connecting walkways (like your sketch) */}
        <Box args={[1, 0.05, 12]} position={[-6.5, 0.15, 1]}>
          <meshStandardMaterial color="#CBD5E0" />
        </Box>
        <Box args={[1, 0.05, 12]} position={[6.5, 0.15, 1]}>
          <meshStandardMaterial color="#CBD5E0" />
        </Box>
        <Box args={[16, 0.05, 1]} position={[0, 0.15, -2.5]}>
          <meshStandardMaterial color="#CBD5E0" />
        </Box>

        {/* Title text floating above */}
        <Text
          position={[0, 8, 0]}
          fontSize={1}
          color="#1A202C"
          anchorX="center"
          anchorY="middle"
        >
          {canvas.name}
        </Text>

        {/* Enhanced Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={8}
          maxDistance={35}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2.2}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};
