
/**
 * Financials Data Adapter
 * Connects business data to 3D visualization height updates
 */

import { FinancialsHeightManager, FinancialData } from './FinancialsHeightManager';
import { FinancialsController } from '../controllers/FinancialsController';

export interface FinancialBusinessData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  netLoss: number;
  quarters?: QuarterlyData[];
}

export interface QuarterlyData {
  quarter: string;
  revenue: number;
  expenses: number;
  profit: number;
  loss: number;
}

export class FinancialsDataAdapter {
  private heightManager: FinancialsHeightManager;
  private controller: FinancialsController;
  private updateInterval: number = 2000; // 2 seconds
  private isRealTimeMode: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(heightManager: FinancialsHeightManager) {
    this.heightManager = heightManager;
    this.controller = new FinancialsController(heightManager);
    
    // Make controller globally accessible for UI components
    (window as any).financialsController = this.controller;
    
    console.log('🎮 FinancialsController initialized and made globally accessible');
  }

  /**
   * Start real-time data updates
   */
  public startRealTimeUpdates(dataSource: () => FinancialBusinessData): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.isRealTimeMode = true;
    this.intervalId = setInterval(async () => {
      const businessData = dataSource();
      const financialData = this.transformBusinessData(businessData);
      
      await this.heightManager.updateHeightsFromData(financialData, 800);
    }, this.updateInterval);

    console.log('🔄 Started real-time financial data updates');
  }

  /**
   * Stop real-time updates
   */
  public stopRealTimeUpdates(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRealTimeMode = false;
    console.log('⏹️ Stopped real-time financial data updates');
  }

  /**
   * Manual data update
   */
  public async updateFromBusinessData(
    businessData: FinancialBusinessData,
    animated: boolean = true
  ): Promise<void> {
    // Use FinancialsController instead of direct HeightManager calls
    this.controller.updateFinancialSystem({
      revenue: businessData.totalRevenue,
      expenses: businessData.totalExpenses
    }, animated);
  }

  /**
   * Transform business data into visualization format
   * Ensures Revenue slider controls Revenue group and Expenses slider controls Expenses group
   */
  private transformBusinessData(data: FinancialBusinessData): FinancialData {
    console.log('🔄 Transforming business data:', {
      totalRevenue: data.totalRevenue,
      totalExpenses: data.totalExpenses,
      netProfit: data.netProfit,
      netLoss: data.netLoss
    });
    
    const result = {
      revenue: Math.max(0.5, data.totalRevenue), // Revenue slider → Revenue group
      expenses: Math.max(0.5, data.totalExpenses), // Expenses slider → Expenses group
      profit: Math.max(0, data.netProfit),
      loss: Math.max(0, data.netLoss)
    };
    
    console.log('💰 Transformed to visualization data:', result);
    return result;
  }

  /**
   * Start simulation with predefined states
   * Cycles through: $10M Revenue/$8M Expenses, $5M Revenue/$5M Expenses, $2M Revenue/$8M Expenses
   */
  public async startSimulation(): Promise<void> {
    console.log('🎬 Starting financial simulation with predefined states...');
    
    // Stop any existing real-time updates
    this.stopRealTimeUpdates();
    
    const simulationStates = [
      { revenue: 1000, expenses: 800, label: '$10M Revenue, $8M Expenses (Healthy Profit)' },
      { revenue: 500, expenses: 500, label: '$5M Revenue, $5M Expenses (Break Even)' },
      { revenue: 200, expenses: 800, label: '$2M Revenue, $8M Expenses (Operating Loss)' }
    ];
    
    let currentStateIndex = 0;
    
    const cycleStates = async () => {
      const state = simulationStates[currentStateIndex];
      console.log(`💰 Simulation Step ${currentStateIndex + 1}: ${state.label}`);
      
      // Update through FinancialsController (enforces all rules)
      this.controller.updateFinancialSystem({
        revenue: state.revenue,
        expenses: state.expenses
      }, true); // Animated update for simulation
      
      // Update slider positions and display values
      this.updateSliderValues(state.revenue, state.expenses);
      
      currentStateIndex = (currentStateIndex + 1) % simulationStates.length;
    };
    
    // Start with first state immediately
    await cycleStates();
    
    // Continue cycling every 2 seconds
    this.intervalId = setInterval(cycleStates, 2000);
    this.isRealTimeMode = true;
    
    console.log('✅ Financial simulation started - cycling every 2 seconds');
  }

  /**
   * Update slider positions and display values to match simulation state
   */
  private updateSliderValues(revenue: number, expenses: number): void {
    // Update slider values
    const revenueSlider = document.getElementById('revenue-slider') as HTMLInputElement;
    const expensesSlider = document.getElementById('expenses-slider') as HTMLInputElement;
    
    if (revenueSlider) {
      revenueSlider.value = revenue.toString();
    }
    
    if (expensesSlider) {
      expensesSlider.value = expenses.toString();
    }
    
    // Update display values
    const revenueDisplay = document.querySelector('.revenue-display');
    const expensesDisplay = document.querySelector('.expenses-display');
    
    if (revenueDisplay) {
      revenueDisplay.textContent = `$${(revenue * 10 / 1000).toFixed(0)}M`;
    }
    
    if (expensesDisplay) {
      expensesDisplay.textContent = `$${(expenses * 10 / 1000).toFixed(0)}M`;
    }
    
    // Update global state for consistency
    if ((window as any).financialSliderState) {
      (window as any).financialSliderState.revenue = revenue;
      (window as any).financialSliderState.expenses = expenses;
    }
    
    console.log(`🎚️ Updated sliders: Revenue=${revenue} ($${(revenue * 10 / 1000).toFixed(0)}M), Expenses=${expenses} ($${(expenses * 10 / 1000).toFixed(0)}M)`);
  }

  public isInRealTimeMode(): boolean {
    return this.isRealTimeMode;
  }
}
