import {
  AbstractMesh,
  Scene,
  DynamicTexture,
  MeshBuilder,
  StandardMaterial,
  Mesh
} from '@babylonjs/core';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';
import { debugLog } from '@/lib/debug/DebugLogger';

export function getSectionContent(canvas: BusinessModelCanvas, sectionName: string): string {
  const sectionMap: { [key: string]: string } = {
    "Value Propositions": "valuePropositions",
    "Key Partners": "keyPartners",
    "Key Activities": "keyActivities",
    "Key Resources": "keyResources",
    "Customer Relationships": "customerRelationships",
    "CustomerChannels": "channels",
    "Customer Segments": "customerSegments",
    "Cost Structure": "costStructure",
    "Revenue Streams": "revenueStreams"
  };

  const sectionKey = sectionMap[sectionName];
  if (!sectionKey || !canvas[sectionKey as keyof typeof canvas]) {
    return `No content available for ${sectionName}`;
  }

  const section = canvas[sectionKey as keyof typeof canvas] as CanvasElement;
  if (!section.content || section.content.length === 0) {
    return `No bullet points available for ${sectionName}`;
  }

  return section.content.map(item => `• ${item}`).join('\n');
}

export function createContentLabel(
  canvas: BusinessModelCanvas,
  sectionName: string,
  mesh: AbstractMesh,
  scene: Scene
): Mesh | null {
  if (!canvas) {
    return null;
  }

  const contentText = getSectionContent(canvas, sectionName);
  if (!contentText || contentText.includes('No content available') || contentText.includes('No bullet points')) {
    return null;
  }

  debugLog.verbose('content', `Content for ${sectionName}: ${contentText.substring(0, 50)}...`);

  const boundingInfo = mesh.getBoundingInfo();
  const center = boundingInfo.boundingBox.center;
  const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);

  const textureSize = 1024;
  const dynamicTexture = new DynamicTexture(`contentLabel_${sectionName}`, textureSize, scene, false);
  const context = dynamicTexture.getContext();

  context.clearRect(0, 0, textureSize, textureSize);
  context.fillStyle = '#ffffff';
  context.font = 'bold 28px Arial';
  (context as any).textAlign = 'left';
  (context as any).textBaseline = 'top';

  const padding = 20;
  const maxWidth = textureSize - (padding * 2);
  const lineHeight = 32;
  const lines = contentText.split('\n');
  let y = padding;

  lines.forEach(line => {
    if (line.trim() === '') {
      y += lineHeight / 2;
      return;
    }

    const words = line.split(' ');
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + word + ' ';
      const metrics = context.measureText(testLine);

      if (metrics.width > maxWidth && currentLine !== '') {
        context.fillText(currentLine.trim(), padding, y);
        y += lineHeight;
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine.trim() !== '') {
      context.fillText(currentLine.trim(), padding, y);
      y += lineHeight;
    }
  });

  dynamicTexture.update();

  const labelWidth = size.x * 0.8;
  const labelHeight = size.z * 0.6;

  const labelPlane = MeshBuilder.CreatePlane(`contentLabel_${sectionName}`, {
    width: labelWidth,
    height: labelHeight
  }, scene);

  labelPlane.position.x = center.x;
  labelPlane.position.y = center.y + size.y * 0.51;
  labelPlane.position.z = center.z;
  labelPlane.rotation.x = Math.PI / 2;

  const labelMaterial = new StandardMaterial(`contentLabelMat_${sectionName}`, scene);
  labelMaterial.diffuseTexture = dynamicTexture;
  labelMaterial.useAlphaFromDiffuseTexture = true;
  labelMaterial.disableLighting = true;
  labelMaterial.backFaceCulling = false;
  labelMaterial.alpha = 1.0;

  labelPlane.material = labelMaterial;
  labelPlane.isPickable = false;
  labelPlane.parent = mesh;

  return labelPlane;
}
