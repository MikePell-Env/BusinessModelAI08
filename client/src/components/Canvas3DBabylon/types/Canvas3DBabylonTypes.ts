import { BusinessModelCanvas } from '@/types/canvas';
import { EnvisionerTemplate } from '@/lib/templates/EnvisionerTemplate';
import { ValueChainAnimator } from '../animations/ValueChainAnimator';

export interface Canvas3DBabylonProps {
  canvas: BusinessModelCanvas;
  isTransitioning?: boolean;
  template?: EnvisionerTemplate;
  onValueChainAnimatorReady?: (animator: ValueChainAnimator | null) => void;
}
