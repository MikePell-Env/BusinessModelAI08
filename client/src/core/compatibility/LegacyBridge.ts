/**
 * Legacy Bridge
 * 
 * Compatibility layer that allows existing Canvas3DBabylon components to work 
 * seamlessly with the new 4DVL Template architecture without breaking changes.
 */

import { EnvisionerTemplate } from '../../lib/templates/EnvisionerTemplate';
import { TemplateRegistry } from '../templates/TemplateRegistry';

/**
 * Maps legacy template names to new 4DVL template IDs
 */
export const LEGACY_TEMPLATE_MAPPING: Record<string, string> = {
  'Business Model': 'business-model',
  'Financials': 'financials',
  'SWOT': 'swot',
  'What If': 'what-if'
};

/**
 * Bridge class that maintains backward compatibility
 */
export class LegacyBridge {
  private static registry = TemplateRegistry.getInstance();

  /**
   * Convert legacy template reference to new 4DVL template ID
   */
  public static getLegacyTemplateId(template: EnvisionerTemplate): string {
    return LEGACY_TEMPLATE_MAPPING[template.name] || template.name.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Check if template supports 4DVL architecture
   */
  public static supports4DVL(template: EnvisionerTemplate): boolean {
    const templateId = this.getLegacyTemplateId(template);
    return this.registry.hasTemplate(templateId);
  }

  /**
   * Get camera presets for legacy template
   */
  public static getCameraPresets(template: EnvisionerTemplate): string[] {
    const templateId = this.getLegacyTemplateId(template);
    const templateInfo = this.registry.getTemplateInfo(templateId);
    
    if (templateInfo) {
      const dvlTemplate = this.registry.createTemplate(templateId);
      return dvlTemplate.getConfig().validCameraPresets;
    }

    // Fallback to legacy behavior
    return template.name.toLowerCase() === 'financials' 
      ? ['FRONT', 'PERSPECTIVE_LEFT', 'PERSPECTIVE_RIGHT']
      : ['TOP', 'PERSPECTIVE_LEFT', 'PERSPECTIVE_RIGHT'];
  }

  /**
   * Get default camera preset for legacy template
   */
  public static getDefaultCameraPreset(template: EnvisionerTemplate): string {
    const templateId = this.getLegacyTemplateId(template);
    const templateInfo = this.registry.getTemplateInfo(templateId);
    
    if (templateInfo) {
      const dvlTemplate = this.registry.createTemplate(templateId);
      return dvlTemplate.getConfig().defaultCameraPreset;
    }

    // Fallback to legacy behavior
    return template.name.toLowerCase() === 'financials' ? 'FRONT' : 'TOP';
  }

  /**
   * Create 4DVL template instance from legacy template reference
   */
  public static create4DVLTemplate(template: EnvisionerTemplate) {
    const templateId = this.getLegacyTemplateId(template);
    
    if (this.registry.hasTemplate(templateId)) {
      return this.registry.createTemplate(templateId);
    }
    
    return null;
  }
}