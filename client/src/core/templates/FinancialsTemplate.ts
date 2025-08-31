/**
 * Financials Use Case Template
 * 
 * Implements financial visualization using 4DVL conventions with vertex manipulation.
 * Displays Revenue, Expenses, Profit, and Loss as dynamic height-adjustable objects.
 */

import { UseCase4DVLTemplate, UseCaseTemplateConfig } from '../4DVL/UseCase4DVLTemplate';
import { The4DVLScene, The4DVLObject } from '../4DVL/4DVLCore';
import { Vector3, Color3 } from '@babylonjs/core';

export class FinancialsTemplate extends UseCase4DVLTemplate {
  constructor() {
    const config: UseCaseTemplateConfig = {
      name: 'Financials',
      description: 'Interactive financial visualization with dynamic height representation',
      supportedDataSources: ['excel', 'json', 'powerpoint'],
      defaultCameraPreset: 'FRONT',
      validCameraPresets: ['FRONT', 'PERSPECTIVE_LEFT', 'PERSPECTIVE_RIGHT']
    };
    super(config);
  }

  protected async create4DVLScene(): Promise<The4DVLScene> {
    const financialObjects = [
      {
        name: 'Revenue',
        position: new Vector3(-2, 0, 2),
        color: new Color3(0.2, 0.8, 0.3), // Green
        anchorType: 'bottom',
        dataField: 'totalRevenue'
      },
      {
        name: 'RevenuePL',
        position: new Vector3(-2, 0, -2),
        color: new Color3(1.0, 0.8, 0.0), // Gold
        anchorType: 'top',
        dataField: 'netLoss'
      },
      {
        name: 'Expenses',
        position: new Vector3(2, 0, 2),
        color: new Color3(0.8, 0.2, 0.2), // Red
        anchorType: 'bottom',
        dataField: 'totalExpenses'
      },
      {
        name: 'ExpensesPL',
        position: new Vector3(2, 0, -2),
        color: new Color3(0.1, 0.1, 0.1), // Black
        anchorType: 'top',
        dataField: 'netProfit'
      }
    ];

    const objects: The4DVLObject[] = financialObjects.map(obj => ({
      id: obj.name,
      name: obj.name,
      geometry: {
        id: `${obj.name}_geometry`,
        type: 'glb',
        source: '/models/Financials_blender_02_1756252040436.glb',
        position: obj.position,
        rotation: Vector3.Zero(),
        scaling: new Vector3(0.64, 1, 1), // Width reduction as per current implementation
        materials: [{
          id: `${obj.name}_material`,
          type: 'standard',
          baseColor: obj.color,
          properties: {
            specularColor: obj.name.includes('PL') ? new Color3(0.05, 0.05, 0.05) : new Color3(0.2, 0.2, 0.2),
            specularPower: obj.name.includes('PL') ? 32 : 64
          }
        }]
      },
      labels: [{
        id: `${obj.name}_label`,
        type: 'flat',
        text: this.getDisplayName(obj.name),
        position: new Vector3(obj.position.x, obj.position.y + 0.6, obj.position.z),
        style: {
          fontSize: 14,
          fontFamily: 'Arial',
          color: new Color3(1, 1, 1)
        },
        dataBinding: `labels.${obj.name}`
      }],
      behaviors: [
        {
          id: `${obj.name}_height_animation`,
          trigger: 'data-change',
          action: 'animate',
          parameters: {
            property: 'height',
            duration: 800,
            easing: 'cubic',
            anchorType: obj.anchorType
          },
          targetIds: [obj.name]
        },
        {
          id: `${obj.name}_click`,
          trigger: 'click',
          action: 'highlight',
          parameters: { intensity: 1.2 },
          targetIds: [obj.name]
        }
      ],
      dataBindings: [{
        sourceField: obj.dataField,
        targetProperty: 'geometry.height',
        transform: (value: number) => Math.max(0.1, value / 500.0) // Scale to visualization range
      }],
      metadata: {
        sectionType: 'financial',
        category: obj.name.includes('PL') ? 'profit_loss' : 'primary',
        anchorType: obj.anchorType,
        originalDataField: obj.dataField
      }
    }));

    return {
      id: 'financials_scene',
      name: 'Financial Visualization',
      objects,
      globalBehaviors: [{
        id: 'financial_balance',
        trigger: 'data-change',
        action: 'custom',
        parameters: { 
          type: 'balance_calculation',
          leftSide: ['Revenue', 'RevenuePL'],
          rightSide: ['Expenses', 'ExpensesPL']
        },
        targetIds: objects.map(obj => obj.id)
      }],
      dataSchema: {
        totalRevenue: { type: 'number', required: true, description: 'Total revenue amount' },
        totalExpenses: { type: 'number', required: true, description: 'Total expenses amount' },
        netProfit: { type: 'number', required: false, description: 'Net profit (calculated)' },
        netLoss: { type: 'number', required: false, description: 'Net loss (calculated)' }
      },
      renderSettings: {
        lighting: 'financial_focus',
        camera: 'front_elevated',
        background: 'neutral_grid'
      }
    };
  }

  protected async loadDataSource(dataSource: any): Promise<void> {
    // Load financial data and calculate profit/loss
    if (dataSource) {
      const revenue = dataSource.totalRevenue || 1000;
      const expenses = dataSource.totalExpenses || 800;
      
      // Calculate derived values
      dataSource.netProfit = Math.max(0, revenue - expenses);
      dataSource.netLoss = Math.max(0, expenses - revenue);
    }
  }

  protected async performCleanup(): Promise<void> {
    // Financials specific cleanup
  }

  private getDisplayName(objectName: string): string {
    const displayNames: Record<string, string> = {
      'Revenue': 'Revenue',
      'RevenuePL': 'Loss',
      'Expenses': 'Expenses', 
      'ExpensesPL': 'Profit'
    };
    return displayNames[objectName] || objectName;
  }
}