/**
 * BMC State Synchronization
 * Manages state synchronization between React components and Babylon scene
 */

import { BMCComponentName } from '@/types/bmcState';
import { CleanBMCSystem } from '@/lib/cleanBMCSystem';
import { debugLog } from '@/lib/debug/DebugLogger';

export class BMCStateSync {
  private cleanBMC: CleanBMCSystem;
  private nameMapping: { [key: string]: BMCComponentName };
  private reverseMapping: { [key in BMCComponentName]: string };

  constructor(cleanBMC: CleanBMCSystem) {
    this.cleanBMC = cleanBMC;
    
    // Initialize name mappings
    this.nameMapping = {
      'Key Partners': 'KeyPartners',
      'Key Activities': 'KeyActivities',
      'Key Resources': 'KeyResources',
      'Value Propositions': 'ValueProposition',
      'Customer Relationships': 'CustomerRelationships',
      'CustomerChannels': 'CustomerChannels',
      'Customer Segments': 'CustomerSegments',
      'Cost Structure': 'CostStructure',
      'Revenue Streams': 'RevenueStreams'
    };

    this.reverseMapping = {
      'KeyPartners': 'Key Partners',
      'KeyActivities': 'Key Activities',
      'KeyResources': 'Key Resources',
      'ValueProposition': 'Value Propositions',
      'CustomerRelationships': 'Customer Relationships',
      'CustomerChannels': 'CustomerChannels',
      'CustomerSegments': 'Customer Segments',
      'CostStructure': 'Cost Structure',
      'RevenueStreams': 'Revenue Streams'
    };
  }

  public mapSectionNameToBMCComponent(sectionName: string): BMCComponentName | null {
    return (this.nameMapping[sectionName] as BMCComponentName) || null;
  }

  public mapBMCComponentToSectionName(componentName: BMCComponentName): string {
    return this.reverseMapping[componentName];
  }

  public syncSelectionFromBMCState(bmcState: any): void {
    if (!bmcState) return;
    
    const currentSelection = bmcState.getSelectedObject?.();
    if (currentSelection) {
      const sectionName = this.mapBMCComponentToSectionName(currentSelection as BMCComponentName);
      if (sectionName && this.cleanBMC.getSelectedObject() !== sectionName) {
        debugLog.verbose('sync', `Syncing selection from BMC state: ${sectionName}`);
        this.cleanBMC.onSelect(sectionName);
      }
    } else if (this.cleanBMC.getSelectedObject()) {
      debugLog.verbose('sync', 'Clearing selection from BMC state');
      this.cleanBMC.clearSelection();
    }
  }

  public handleObjectClick(sectionName: string, bmcState: any): void {
    const componentName = this.mapSectionNameToBMCComponent(sectionName);
    if (componentName && bmcState?.setSelectedObject) {
      const currentSelection = bmcState.getSelectedObject?.();
      
      if (currentSelection === componentName) {
        // Deselect if clicking the same object
        bmcState.setSelectedObject(null);
        this.cleanBMC.clearSelection();
        debugLog.verbose('sync', `Deselected: ${sectionName}`);
      } else {
        // Select new object
        bmcState.setSelectedObject(componentName);
        this.cleanBMC.onSelect(sectionName);
        debugLog.verbose('sync', `Selected: ${sectionName}`);
      }
    }
  }

  public setTopViewMode(isTopView: boolean): void {
    this.cleanBMC.setTopViewMode(isTopView);
  }

  public updateAllVisuals(): void {
    this.cleanBMC.updateAllVisuals();
  }
}