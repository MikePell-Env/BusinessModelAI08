
/**
 * Financials Demo System
 * Provides comprehensive demonstration of real-time financial data manipulation
 * Shows Revenue/RevenuePL at 80%/20% and Expenses/ExpensesPL at 80%/20% ratios
 */

import { FinancialsHeightManager, FinancialData } from '../animations/FinancialsHeightManager';
import { FinancialsDataAdapter, FinancialBusinessData } from '../animations/FinancialsDataAdapter';

export class FinancialsDemo {
  private heightManager: FinancialsHeightManager;
  private dataAdapter: FinancialsDataAdapter;
  private scenarios: FinancialBusinessData[] = [];

  constructor(heightManager: FinancialsHeightManager, dataAdapter: FinancialsDataAdapter) {
    this.heightManager = heightManager;
    this.dataAdapter = dataAdapter;
    this.setupDemoScenarios();
  }

  /**
   * Setup predefined business scenarios for demonstration
   */
  private setupDemoScenarios(): void {
    this.scenarios = [
      {
        totalRevenue: 100,
        totalExpenses: 80,
        netProfit: 20,
        netLoss: 0,
        quarters: [
          { quarter: 'Q1', revenue: 90, expenses: 75, profit: 15, loss: 0 },
          { quarter: 'Q2', revenue: 95, expenses: 80, profit: 15, loss: 0 },
          { quarter: 'Q3', revenue: 105, expenses: 85, profit: 20, loss: 0 },
          { quarter: 'Q4', revenue: 110, expenses: 75, profit: 35, loss: 0 }
        ]
      },
      {
        totalRevenue: 150,
        totalExpenses: 180,
        netProfit: 0,
        netLoss: 30,
        quarters: [
          { quarter: 'Q1', revenue: 140, expenses: 170, profit: 0, loss: 30 },
          { quarter: 'Q2', revenue: 145, expenses: 175, profit: 0, loss: 30 },
          { quarter: 'Q3', revenue: 155, expenses: 185, profit: 0, loss: 30 },
          { quarter: 'Q4', revenue: 160, expenses: 190, profit: 0, loss: 30 }
        ]
      },
      {
        totalRevenue: 300,
        totalExpenses: 200,
        netProfit: 100,
        netLoss: 0,
        quarters: [
          { quarter: 'Q1', revenue: 280, expenses: 190, profit: 90, loss: 0 },
          { quarter: 'Q2', revenue: 290, expenses: 195, profit: 95, loss: 0 },
          { quarter: 'Q3', revenue: 310, expenses: 205, profit: 105, loss: 0 },
          { quarter: 'Q4', revenue: 320, expenses: 210, profit: 110, loss: 0 }
        ]
      }
    ];
  }

  /**
   * Demonstrate proportional height relationships
   * Revenue group: Revenue (80%) + RevenuePL (20%)
   * Expenses group: Expenses (80%) + ExpensesPL (20%)
   */
  public async demonstrateProportionalHeights(): Promise<void> {
    console.log('🎬 Starting proportional heights demonstration...');
    
    // Scenario 1: Balanced business (Revenue > Expenses)
    await this.dataAdapter.updateFromBusinessData(this.scenarios[0], true);
    await this.delay(3000);
    
    // Scenario 2: Loss scenario (Expenses > Revenue)
    await this.dataAdapter.updateFromBusinessData(this.scenarios[1], true);
    await this.delay(3000);
    
    // Scenario 3: High growth (High Revenue, controlled Expenses)
    await this.dataAdapter.updateFromBusinessData(this.scenarios[2], true);
    await this.delay(3000);
    
    console.log('✅ Proportional heights demonstration completed');
  }

  /**
   * Demonstrate real-time data streaming
   */
  public startRealTimeDemo(): void {
    console.log('🔄 Starting real-time financial data demonstration...');
    
    let scenarioIndex = 0;
    const cyclicData = (): FinancialBusinessData => {
      const scenario = this.scenarios[scenarioIndex % this.scenarios.length];
      scenarioIndex++;
      
      // Add some random variation to make it more realistic
      const variation = 0.1; // 10% variation
      return {
        totalRevenue: scenario.totalRevenue * (1 + (Math.random() - 0.5) * variation),
        totalExpenses: scenario.totalExpenses * (1 + (Math.random() - 0.5) * variation),
        netProfit: scenario.netProfit * (1 + (Math.random() - 0.5) * variation),
        netLoss: scenario.netLoss * (1 + (Math.random() - 0.5) * variation)
      };
    };

    this.dataAdapter.startRealTimeUpdates(cyclicData);
  }

  /**
   * Stop all real-time demonstrations
   */
  public stopRealTimeDemo(): void {
    this.dataAdapter.stopRealTimeUpdates();
    console.log('⏹️ Real-time demonstration stopped');
  }

  /**
   * Test anchor point preservation during height changes
   */
  public async testAnchorPreservation(): Promise<void> {
    console.log('🔗 Testing anchor point preservation...');
    
    // Get current positions
    const initialHeights = this.heightManager.getCurrentHeights();
    console.log('📏 Initial heights:', initialHeights);
    
    // Test extreme height changes
    const extremeData: FinancialBusinessData = {
      totalRevenue: 500,
      totalExpenses: 100,
      netProfit: 400,
      netLoss: 0
    };
    
    await this.dataAdapter.updateFromBusinessData(extremeData, true);
    await this.delay(2000);
    
    // Reset to normal
    await this.dataAdapter.updateFromBusinessData(this.scenarios[0], true);
    
    console.log('✅ Anchor point preservation test completed');
  }

  /**
   * Demonstrate quarterly data progression
   */
  public async demonstrateQuarterlyProgression(): Promise<void> {
    console.log('📊 Demonstrating quarterly financial progression...');
    
    const scenario = this.scenarios[0];
    if (!scenario.quarters) return;
    
    for (const quarter of scenario.quarters) {
      console.log(`📈 Showing ${quarter.quarter} data...`);
      await this.dataAdapter.updateFromBusinessData({
        totalRevenue: quarter.revenue,
        totalExpenses: quarter.expenses,
        netProfit: quarter.profit,
        netLoss: quarter.loss
      }, true);
      await this.delay(2500);
    }
    
    console.log('✅ Quarterly progression demonstration completed');
  }

  /**
   * Get current financial visualization state
   */
  public getCurrentState(): Record<string, any> {
    return {
      heights: this.heightManager.getCurrentHeights(),
      isRealTime: this.dataAdapter.isInRealTimeMode(),
      scenarios: this.scenarios.length
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
