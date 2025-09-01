
/**
 * Financials Data Adapter
 * Connects business data to 3D visualization height updates
 */

import { FinancialsHeightManager, FinancialData } from './FinancialsHeightManager';

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

  constructor(heightManager: FinancialsHeightManager) {
    this.heightManager = heightManager;
  }



  /**
   * Manual data update
   */
  public async updateFromBusinessData(
    businessData: FinancialBusinessData,
    animated: boolean = true
  ): Promise<void> {
    const financialData = this.transformBusinessData(businessData);
    
    if (animated) {
      await this.heightManager.updateHeightsFromData(financialData);
    } else {
      this.heightManager.setImmediateHeights(financialData);
    }
  }

  /**
   * Transform business data into visualization format
   * BUSINESS LOGIC CENTRALIZED: Only pass revenue/expenses, let FinancialsHeightManager calculate profit/loss
   */
  private transformBusinessData(data: FinancialBusinessData): FinancialData {
    return {
      revenue: Math.max(0.5, data.totalRevenue),
      expenses: Math.max(0.5, data.totalExpenses),
      profit: 0, // Calculated in FinancialsHeightManager from revenue - expenses
      loss: 0   // Calculated in FinancialsHeightManager from revenue - expenses
    };
  }

}
