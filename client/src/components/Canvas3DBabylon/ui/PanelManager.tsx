/**
 * Panel Manager for BMC 3D visualization
 * Handles billboard panels and UI overlays
 */

import React from 'react';
import { 
  Scene,
  Vector3,
  AbstractMesh
} from '@babylonjs/core';
import { 
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Control
} from '@babylonjs/gui';
import { CanvasElement } from '@/types/canvas';
import { debugLog } from '@/lib/debug/DebugLogger';

export interface PanelContent {
  title: string;
  elements: CanvasElement[];
  color?: string;
}

export class PanelManager {
  private scene: Scene;
  private advancedTexture: AdvancedDynamicTexture;
  private currentPanel: Rectangle | null = null;
  private panelRef: React.MutableRefObject<Rectangle | null> | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    debugLog.verbose('panel', 'Panel manager initialized');
  }

  /**
   * Set panel reference for external access
   */
  public setPanelRef(ref: React.MutableRefObject<Rectangle | null>): void {
    this.panelRef = ref;
  }

  /**
   * Create and display a billboard panel
   */
  public createBillboardPanel(
    sectionName: string, 
    worldPosition: Vector3,
    content: PanelContent
  ): Rectangle {
    // Remove existing panel if any
    this.closeCurrentPanel();
    
    // Create new panel container
    const panel = new Rectangle(`${sectionName}_panel`);
    panel.width = "380px";
    panel.height = "420px";
    panel.cornerRadius = 12;
    panel.color = "#e0e0e0";
    panel.thickness = 2;
    panel.background = "#1a1a2e";
    panel.shadowColor = "black";
    panel.shadowBlur = 20;
    panel.shadowOffsetX = 5;
    panel.shadowOffsetY = 5;
    
    // Position panel in screen space
    const screenPosition = Vector3.Project(
      worldPosition,
      this.scene.getViewMatrix(),
      this.scene.getProjectionMatrix(),
      this.scene.activeCamera!.viewport
    );
    
    // Adjust position to avoid edges
    let xOffset = screenPosition.x > 0.7 ? -200 : (screenPosition.x < 0.3 ? 200 : 100);
    let yOffset = screenPosition.y > 0.7 ? 100 : -50;
    
    panel.linkOffsetX = xOffset;
    panel.linkOffsetY = yOffset;
    
    // Link to world position
    panel.linkWithMesh(null);
    const screenX = screenPosition.x * this.advancedTexture.getSize().width;
    const screenY = screenPosition.y * this.advancedTexture.getSize().height;
    panel.left = screenX - this.advancedTexture.getSize().width / 2;
    panel.top = screenY - this.advancedTexture.getSize().height / 2;
    
    // Add header
    const header = new Rectangle("header");
    header.height = "50px";
    header.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    header.background = content.color || "#2c3e50";
    header.thickness = 0;
    panel.addControl(header);
    
    // Add title
    const title = new TextBlock("title", content.title);
    title.color = "white";
    title.fontSize = 18;
    title.fontWeight = "600";
    title.textWrapping = true;
    header.addControl(title);
    
    // Add close button
    const closeButton = new Rectangle("closeButton");
    closeButton.width = "30px";
    closeButton.height = "30px";
    closeButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    closeButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    closeButton.left = -10;
    closeButton.top = 10;
    closeButton.cornerRadius = 15;
    closeButton.background = "#e74c3c";
    closeButton.thickness = 0;
    closeButton.onPointerClickObservable.add(() => {
      this.closeCurrentPanel();
    });
    panel.addControl(closeButton);
    
    const closeX = new TextBlock("closeX", "✕");
    closeX.color = "white";
    closeX.fontSize = 16;
    closeX.fontWeight = "bold";
    closeButton.addControl(closeX);
    
    // Add content container
    const contentContainer = new Rectangle("content");
    contentContainer.top = 60;
    contentContainer.height = "340px";
    contentContainer.thickness = 0;
    contentContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    panel.addControl(contentContainer);
    
    // Add content items
    this.populateContent(contentContainer, content.elements);
    
    // Add to scene
    this.advancedTexture.addControl(panel);
    this.currentPanel = panel;
    
    if (this.panelRef) {
      this.panelRef.current = panel;
    }
    
    debugLog.info('panel', `Billboard panel created for ${sectionName}`);
    
    return panel;
  }

  /**
   * Populate panel with content
   */
  private populateContent(container: Rectangle, elements: CanvasElement[]): void {
    let yOffset = 20;
    const maxItems = 8;
    const displayElements = elements.slice(0, maxItems);
    
    displayElements.forEach((element, index) => {
      // Create item container
      const itemContainer = new Rectangle(`item_${index}`);
      itemContainer.height = "35px";
      itemContainer.top = yOffset;
      itemContainer.thickness = 0;
      itemContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      container.addControl(itemContainer);
      
      // Add item text
      const content = element.title || 
        (Array.isArray(element.content) ? element.content.join(', ') : element.content);
      const itemText = new TextBlock(`text_${index}`, content);
      itemText.color = "#ecf0f1";
      itemText.fontSize = 14;
      itemText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      itemText.left = 20;
      itemText.textWrapping = true;
      itemContainer.addControl(itemText);
      
      yOffset += 40;
    });
    
    // Add "more items" indicator if needed
    if (elements.length > maxItems) {
      const moreText = new TextBlock("more", `... and ${elements.length - maxItems} more items`);
      moreText.color = "#7f8c8d";
      moreText.fontSize = 12;
      moreText.fontStyle = "italic";
      moreText.top = yOffset;
      moreText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      container.addControl(moreText);
    }
  }

  /**
   * Close current panel
   */
  public closeCurrentPanel(): void {
    if (this.currentPanel) {
      this.advancedTexture.removeControl(this.currentPanel);
      this.currentPanel = null;
      
      if (this.panelRef) {
        this.panelRef.current = null;
      }
      
      debugLog.verbose('panel', 'Panel closed');
    }
  }

  /**
   * Check if a panel is currently open
   */
  public isPanelOpen(): boolean {
    return this.currentPanel !== null;
  }

  /**
   * Get advanced texture for additional UI elements
   */
  public getAdvancedTexture(): AdvancedDynamicTexture {
    return this.advancedTexture;
  }

  /**
   * Dispose panel manager
   */
  public dispose(): void {
    this.closeCurrentPanel();
    this.advancedTexture.dispose();
  }
}