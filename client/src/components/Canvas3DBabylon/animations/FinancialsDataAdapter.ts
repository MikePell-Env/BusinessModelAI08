/**
 * FINANCIALS DATA ADAPTER
 * 
 * Purpose: Business data transformation and real-time update management
 * Following the documented architecture from FINANCIALS_API_REFERENCE.md
 * 
 * Data Flow: FinancialBusinessData → FinancialsDataAdapter → FinancialsHeightManager
 */

import { FinancialsHeightManager } from './FinancialsHeightManager';

// Business-level financial data input interface (from API reference)
export interface FinancialBusinessData {
  totalRevenue: number;      // Total revenue amount
  totalExpenses: number;     // Total expenses amount  
  netProfit: number;         // Net profit (positive)
  netLoss: number;           // Net loss (positive)
  quarters?: QuarterlyData[]; // Optional quarterly breakdown
}

// Visualization-ready financial data interface (from API reference)
export interface FinancialData {
  revenue: number;   // Total revenue amount
  expenses: number;  // Total expenses amount
  profit: number;    // Calculated: Math.max(0, revenue - expenses)
  loss: number;      // Calculated: Math.max(0, expenses - revenue)
}

// Quarterly financial breakdown interface (from API reference)
export interface QuarterlyData {
  quarter: string;   // Quarter identifier (e.g., "Q1 2024")
  revenue: number;   // Quarter revenue
  expenses: number;  // Quarter expenses
  profit: number;    // Quarter profit
  loss: number;      // Quarter loss
}

/**
 * FinancialsDataAdapter - Business data transformation and real-time management
 * 
 * Implements the documented interface from FINANCIALS_API_REFERENCE.md
 * Provides proper data transformation, validation, and error handling
 */
export class FinancialsDataAdapter {
  private heightManager: FinancialsHeightManager;
  private updateInterval: number = 2000; // 2 seconds as documented
  private realTimeTimer: NodeJS.Timeout | null = null;
  private isRealTimeActive: boolean = false;
  private simulationTimer: NodeJS.Timeout | null = null;
  private simulationActive: boolean = false;

  constructor(heightManager: FinancialsHeightManager) {
    this.heightManager = heightManager;
    
    // CRITICAL: Ensure FinancialsController exists and is accessible
    // This maintains the vertex manipulation functionality for sliders
    if (!(window as any).financialsController) {
      const { FinancialsController } = require('../controllers/FinancialsController');
      (window as any).financialsController = new FinancialsController(heightManager);
      console.log('🎮 FinancialsController created and made globally accessible');
    }
    
    console.log('📊 FinancialsDataAdapter initialized with proper architecture');
  }

  /**
   * Transform business data to visualization format with validation
   * Implements the balanced height calculation from documentation
   */
  public transformBusinessData(businessData: FinancialBusinessData): FinancialData {
    // Input validation
    if (!this.validateBusinessData(businessData)) {
      throw new Error('Invalid business data provided to FinancialsDataAdapter');
    }

    const { totalRevenue, totalExpenses } = businessData;
    
    // Calculate profit/loss with proper validation
    const calculatedProfit = Math.max(0, totalRevenue - totalExpenses);
    const calculatedLoss = Math.max(0, totalExpenses - totalRevenue);

    // Use provided values if they match calculations, otherwise use calculated
    const profit = businessData.netProfit === calculatedProfit ? businessData.netProfit : calculatedProfit;
    const loss = businessData.netLoss === calculatedLoss ? businessData.netLoss : calculatedLoss;

    const financialData: FinancialData = {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: profit,
      loss: loss
    };

    // Validate output data
    if (!this.validateFinancialData(financialData)) {
      throw new Error('Data transformation produced invalid financial data');
    }

    console.log('✅ FinancialsDataAdapter: Business data transformed successfully:', {
      input: { revenue: totalRevenue, expenses: totalExpenses },
      output: financialData,
      scenario: profit > 0 ? 'PROFIT' : loss > 0 ? 'LOSS' : 'BREAKEVEN'
    });

    return financialData;
  }

  /**
   * Manual data update from business data with error handling
   * CRITICAL: Uses FinancialsController to maintain vertex manipulation functionality
   */
  public async updateFromBusinessData(
    businessData: FinancialBusinessData,
    animated: boolean = true
  ): Promise<void> {
    try {
      console.log('📈 FinancialsDataAdapter: Processing business data update:', businessData);

      // IMPORTANT: Use FinancialsController instead of direct HeightManager
      // This preserves the vertex manipulation logic for sliders
      const controller = (window as any).financialsController;
      if (controller) {
        // Use controller's updateFinancialSystem which maintains vertex manipulation
        controller.updateFinancialSystem({
          revenue: businessData.totalRevenue,
          expenses: businessData.totalExpenses
        }, animated);
      } else {
        // Fallback to direct height manager if controller not available
        const financialData = this.transformBusinessData(businessData);
        
        if (animated) {
          await this.heightManager.updateHeightsFromData(financialData);
        } else {
          this.heightManager.setImmediateHeights(financialData);
        }
      }

      console.log('✅ FinancialsDataAdapter: Business data update completed successfully');
    } catch (error) {
      console.error('❌ FinancialsDataAdapter: Business data update failed:', error);
      
      // Attempt graceful fallback
      await this.attemptGracefulFallback(businessData, animated);
    }
  }

  /**
   * Start real-time data updates using a data source function
   */
  public startRealTimeUpdates(dataSource: () => Promise<FinancialBusinessData> | FinancialBusinessData): void {
    if (this.isRealTimeActive) {
      console.warn('⚠️ FinancialsDataAdapter: Real-time updates already active');
      return;
    }

    console.log('🔄 FinancialsDataAdapter: Starting real-time updates');
    this.isRealTimeActive = true;

    const updateLoop = async () => {
      try {
        const businessData = await Promise.resolve(dataSource());
        await this.updateFromBusinessData(businessData, true);
      } catch (error) {
        console.error('❌ FinancialsDataAdapter: Real-time update failed:', error);
        // Continue the loop despite errors
      }

      if (this.isRealTimeActive) {
        this.realTimeTimer = setTimeout(updateLoop, this.updateInterval);
      }
    };

    updateLoop();
  }

  /**
   * Stop real-time data updates
   */
  public stopRealTimeUpdates(): void {
    if (!this.isRealTimeActive) {
      return;
    }

    console.log('⏹️ FinancialsDataAdapter: Stopping real-time updates');
    this.isRealTimeActive = false;

    if (this.realTimeTimer) {
      clearTimeout(this.realTimeTimer);
      this.realTimeTimer = null;
    }
  }

  /**
   * Start dynamic financial data simulation for testing
   */
  public startSimulation(): void {
    if (this.simulationActive) {
      console.warn('⚠️ FinancialsDataAdapter: Simulation already active');
      return;
    }

    console.log('🎭 FinancialsDataAdapter: Starting financial simulation');
    this.simulationActive = true;

    let time = 0;
    const simulationLoop = async () => {
      try {
        // Generate realistic business data using sine waves
        const baseRevenue = 100;
        const baseExpenses = 80;
        const volatility = 30;

        const revenue = baseRevenue + Math.sin(time * 0.1) * volatility;
        const expenses = baseExpenses + Math.cos(time * 0.08) * (volatility * 0.8);

        const businessData: FinancialBusinessData = {
          totalRevenue: Math.max(10, revenue), // Minimum 10 to avoid zero
          totalExpenses: Math.max(10, expenses), // Minimum 10 to avoid zero
          netProfit: Math.max(0, revenue - expenses),
          netLoss: Math.max(0, expenses - revenue)
        };

        await this.updateFromBusinessData(businessData, true);
        time++;
      } catch (error) {
        console.error('❌ FinancialsDataAdapter: Simulation update failed:', error);
      }

      if (this.simulationActive) {
        this.simulationTimer = setTimeout(simulationLoop, 2000); // 2 second intervals
      }
    };

    simulationLoop();
  }

  /**
   * Stop financial simulation
   */
  public stopSimulation(): void {
    if (!this.simulationActive) {
      return;
    }

    console.log('⏹️ FinancialsDataAdapter: Stopping financial simulation');
    this.simulationActive = false;

    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  /**
   * Check if real-time mode is currently active
   */
  public isInRealTimeMode(): boolean {
    return this.isRealTimeActive;
  }

  /**
   * Check if simulation mode is currently active
   */
  public isInSimulationMode(): boolean {
    return this.simulationActive;
  }

  /**
   * Validate business data input
   */
  private validateBusinessData(data: FinancialBusinessData): boolean {
    if (!data) {
      console.error('❌ FinancialsDataAdapter: Business data is null/undefined');
      return false;
    }

    if (typeof data.totalRevenue !== 'number' || data.totalRevenue < 0) {
      console.error('❌ FinancialsDataAdapter: Invalid totalRevenue:', data.totalRevenue);
      return false;
    }

    if (typeof data.totalExpenses !== 'number' || data.totalExpenses < 0) {
      console.error('❌ FinancialsDataAdapter: Invalid totalExpenses:', data.totalExpenses);
      return false;
    }

    if (typeof data.netProfit !== 'number' || data.netProfit < 0) {
      console.error('❌ FinancialsDataAdapter: Invalid netProfit:', data.netProfit);
      return false;
    }

    if (typeof data.netLoss !== 'number' || data.netLoss < 0) {
      console.error('❌ FinancialsDataAdapter: Invalid netLoss:', data.netLoss);
      return false;
    }

    // Validate profit/loss mutual exclusivity
    if (data.netProfit > 0 && data.netLoss > 0) {
      console.error('❌ FinancialsDataAdapter: Both profit and loss are positive:', {
        profit: data.netProfit,
        loss: data.netLoss
      });
      return false;
    }

    return true;
  }

  /**
   * Validate financial data output
   */
  private validateFinancialData(data: FinancialData): boolean {
    if (!data) {
      console.error('❌ FinancialsDataAdapter: Financial data is null/undefined');
      return false;
    }

    const requiredFields = ['revenue', 'expenses', 'profit', 'loss'];
    for (const field of requiredFields) {
      if (typeof data[field as keyof FinancialData] !== 'number' || data[field as keyof FinancialData] < 0) {
        console.error(`❌ FinancialsDataAdapter: Invalid ${field}:`, data[field as keyof FinancialData]);
        return false;
      }
    }

    // Validate profit/loss calculation
    const expectedProfit = Math.max(0, data.revenue - data.expenses);
    const expectedLoss = Math.max(0, data.expenses - data.revenue);

    if (Math.abs(data.profit - expectedProfit) > 0.01) {
      console.error('❌ FinancialsDataAdapter: Profit calculation mismatch:', {
        calculated: expectedProfit,
        provided: data.profit
      });
      return false;
    }

    if (Math.abs(data.loss - expectedLoss) > 0.01) {
      console.error('❌ FinancialsDataAdapter: Loss calculation mismatch:', {
        calculated: expectedLoss,
        provided: data.loss
      });
      return false;
    }

    return true;
  }

  /**
   * Attempt graceful fallback when normal update fails
   */
  private async attemptGracefulFallback(
    businessData: FinancialBusinessData, 
    animated: boolean
  ): Promise<void> {
    try {
      console.log('🔄 FinancialsDataAdapter: Attempting graceful fallback');

      // First try: Use controller with safe values
      const controller = (window as any).financialsController;
      if (controller) {
        const safeRevenue = Math.max(1, businessData.totalRevenue || 100);
        const safeExpenses = Math.max(1, businessData.totalExpenses || 80);
        
        controller.updateFinancialSystem({
          revenue: safeRevenue,
          expenses: safeExpenses
        }, false); // Non-animated fallback
        
        console.log('✅ FinancialsDataAdapter: Controller fallback successful');
        return;
      }

      // Second try: Direct height manager with minimal data
      const fallbackData: FinancialData = {
        revenue: Math.max(1, businessData.totalRevenue || 100),
        expenses: Math.max(1, businessData.totalExpenses || 80),
        profit: Math.max(0, (businessData.totalRevenue || 100) - (businessData.totalExpenses || 80)),
        loss: Math.max(0, (businessData.totalExpenses || 80) - (businessData.totalRevenue || 100))
      };

      this.heightManager.setImmediateHeights(fallbackData);
      console.log('✅ FinancialsDataAdapter: HeightManager fallback successful');
    } catch (fallbackError) {
      console.error('❌ FinancialsDataAdapter: Fallback also failed:', fallbackError);
      
      // Final fallback: reset to base state
      try {
        this.heightManager.resetToBaseHeight();
        console.log('🔄 FinancialsDataAdapter: Reset to base height as final fallback');
      } catch (resetError) {
        console.error('💥 FinancialsDataAdapter: Complete system failure:', resetError);
      }
    }
  }

  /**
   * Cleanup method for proper resource disposal
   */
  public dispose(): void {
    console.log('🧹 FinancialsDataAdapter: Cleaning up resources');
    
    this.stopRealTimeUpdates();
    this.stopSimulation();
    
    // Clear any remaining timers
    if (this.realTimeTimer) {
      clearTimeout(this.realTimeTimer);
      this.realTimeTimer = null;
    }
    
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }
  }
}