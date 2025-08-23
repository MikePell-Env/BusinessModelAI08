/**
 * Panel Content Manager
 * Handles display of content panels for BMC sections
 */

import { AdvancedDynamicTexture, Rectangle, TextBlock } from '@babylonjs/gui';
import { BusinessModelCanvas } from '@/types/canvas';
import { debugLog } from '@/lib/debug/DebugLogger';
import { Vector3 } from '@babylonjs/core';

export class PanelContentManager {
  private advancedTexture: AdvancedDynamicTexture | null = null;
  private currentPanel: Rectangle | null = null;
  private canvas: BusinessModelCanvas;

  constructor(canvas: BusinessModelCanvas) {
    this.canvas = canvas;
  }

  public setAdvancedTexture(texture: AdvancedDynamicTexture): void {
    this.advancedTexture = texture;
  }

  public showPanel(sectionName: string, position: Vector3): void {
    if (!this.advancedTexture) {
      debugLog.error('panel', 'AdvancedTexture not initialized');
      return;
    }

    // Close existing panel
    this.closePanel();

    // Get content for the section
    const content = this.getSectionContent(sectionName);
    if (!content) {
      debugLog.warn('panel', `No content for section: ${sectionName}`);
      return;
    }

    // Create new panel
    const panel = new Rectangle(`panel_${sectionName}`);
    panel.width = "400px";
    panel.height = "300px";
    panel.cornerRadius = 20;
    panel.color = "white";
    panel.thickness = 4;
    panel.background = "rgba(255, 255, 255, 0.95)";
    
    // Position panel (simplified positioning)
    panel.left = "0px";
    panel.top = "-100px";

    // Add content text
    const text = new TextBlock();
    text.text = content;
    text.color = "black";
    text.fontSize = 14;
    text.textWrapping = true;
    text.paddingLeft = "20px";
    text.paddingRight = "20px";
    text.paddingTop = "20px";
    text.paddingBottom = "20px";
    text.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
    text.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_TOP;

    panel.addControl(text);
    this.advancedTexture.addControl(panel);
    this.currentPanel = panel;

    debugLog.verbose('panel', `Panel shown for ${sectionName}`);
  }

  public closePanel(): void {
    if (this.currentPanel && this.advancedTexture) {
      this.advancedTexture.removeControl(this.currentPanel);
      this.currentPanel = null;
      debugLog.verbose('panel', 'Panel closed');
    }
  }

  private getSectionContent(sectionName: string): string {
    const sectionMap: { [key: string]: keyof BusinessModelCanvas } = {
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
    if (!sectionKey) {
      return `No content available for ${sectionName}`;
    }

    const sectionData = this.canvas[sectionKey];
    if (!sectionData || typeof sectionData !== 'object' || !('elements' in sectionData)) {
      return `No content available for ${sectionName}`;
    }

    const elements = (sectionData as any).elements || [];
    if (elements.length === 0) {
      return `No items in ${sectionName}`;
    }

    // Format as bullet points
    const bulletText = elements
      .map((el: any) => `• ${el.text || el.description || 'Unnamed item'}`)
      .join('\n');

    return `${sectionName}:\n\n${bulletText}`;
  }

  public dispose(): void {
    this.closePanel();
    this.advancedTexture = null;
  }
}