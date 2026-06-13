import {
  AbstractMesh,
  Scene,
  DynamicTexture,
  MeshBuilder,
  StandardMaterial
} from '@babylonjs/core';
import { BusinessModelCanvas } from '@/types/canvas';
import { MATERIAL_COLORS } from '../constants/BMCConstants';

export function createBulletTextPlane(
  canvas: BusinessModelCanvas,
  showBulletText: boolean,
  sectionName: string,
  mesh: AbstractMesh,
  scene: Scene
) {
  if (!canvas || !showBulletText) {
    return null;
  }

  let content: string[] = [];
  switch (sectionName) {
    case 'Value Propositions':
      content = canvas.valuePropositions?.content || [];
      break;
    default:
      return null;
  }

  if (content.length === 0) {
    return null;
  }

  const bulletText = content.map(item => `• ${item}`).join('\n');

  const textureSize = 512;
  const dynamicTexture = new DynamicTexture(`bulletText_${sectionName}`, textureSize, scene, false);
  const context = dynamicTexture.getContext();

  context.clearRect(0, 0, textureSize, textureSize);
  context.fillStyle = '#2d3748';
  context.font = '20px Arial';
  (context as any).textAlign = 'left';
  (context as any).textBaseline = 'top';

  const maxWidth = textureSize - 40;
  const lineHeight = 24;
  const lines = bulletText.split('\n');
  let y = 20;

  lines.forEach(line => {
    const words = line.split(' ');
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + word + ' ';
      const metrics = context.measureText(testLine);

      if (metrics.width > maxWidth && currentLine !== '') {
        context.fillText(currentLine.trim(), 20, y);
        y += lineHeight;
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine.trim() !== '') {
      context.fillText(currentLine.trim(), 20, y);
      y += lineHeight;
    }
  });

  dynamicTexture.update();

  const textPlane = MeshBuilder.CreatePlane(`bulletTextPlane_${sectionName}`, {
    size: 2.0,
    sideOrientation: 2
  }, scene);

  textPlane.position = mesh.position.clone();
  textPlane.position.y = mesh.position.y + (mesh.scaling.y / 2) + 0.1;
  textPlane.rotation.x = Math.PI / 2;

  const textMaterial = new StandardMaterial(`bulletTextMat_${sectionName}`, scene);
  textMaterial.diffuseTexture = dynamicTexture;
  textMaterial.emissiveTexture = dynamicTexture;
  textMaterial.emissiveColor = MATERIAL_COLORS.BRIGHT_WHITE;
  textMaterial.useAlphaFromDiffuseTexture = true;
  textMaterial.disableLighting = true;
  textMaterial.backFaceCulling = false;
  textMaterial.alpha = 1.0;

  textPlane.material = textMaterial;
  textPlane.isPickable = false;
  textPlane.parent = mesh;
  textPlane.setEnabled(true);
  textPlane.isVisible = true;

  return textPlane;
}
