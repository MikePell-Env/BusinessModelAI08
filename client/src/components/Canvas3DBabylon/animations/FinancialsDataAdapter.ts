
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
  incomeStatement?: IncomeStatementData;
}

export interface QuarterlyData {
  quarter: string;
  revenue: number;
  expenses: number;
  profit: number;
  loss: number;
}

export interface IncomeStatementData {
  years: YearlyFinancialData[];
  currentYearIndex: number;
}

export interface YearlyFinancialData {
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
  loss: number;
}

export class FinancialsDataAdapter {
  private heightManager: FinancialsHeightManager;
  private incomeStatementData: IncomeStatementData | null = null;

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
    // Store Income Statement data if provided
    if (businessData.incomeStatement) {
      this.incomeStatementData = businessData.incomeStatement;
      console.log(`📊 Income Statement loaded: ${businessData.incomeStatement.years.length} years of data`);
    }

    const financialData = this.transformBusinessData(businessData);
    
    if (animated) {
      await this.heightManager.updateHeightsFromData(financialData);
    } else {
      this.heightManager.setImmediateHeights(financialData);
    }
  }

  /**
   * Load Income Statement data - SIMPLIFIED
   */
  public loadIncomeStatementData(incomeStatement: IncomeStatementData): void {
    this.incomeStatementData = incomeStatement;
    console.log(`📊 Income Statement loaded: ${incomeStatement.years.length} years`);
    
    // Get current year data
    const currentYear = incomeStatement.years[incomeStatement.currentYearIndex];
    if (!currentYear) {
      console.error('No current year data found');
      return;
    }
    
    console.log(`📊 Setting financial object heights:`, {
      revenue: currentYear.revenue,
      expenses: currentYear.expenses,
      profit: currentYear.profit,
      loss: currentYear.loss
    });
    
    // Apply data immediately (no animation for initial load)
    const businessData: FinancialBusinessData = {
      totalRevenue: currentYear.revenue,
      totalExpenses: currentYear.expenses,
      netProfit: currentYear.profit,
      netLoss: currentYear.loss,
      incomeStatement: this.incomeStatementData
    };
    
    this.updateFromBusinessData(businessData, false);
  }

  /**
   * Switch to a specific year in the Income Statement
   */
  public async switchToYear(yearIndex: number, animated: boolean = true): Promise<void> {
    if (!this.incomeStatementData || yearIndex < 0 || yearIndex >= this.incomeStatementData.years.length) {
      console.warn(`Invalid year index: ${yearIndex}`);
      return;
    }

    this.incomeStatementData.currentYearIndex = yearIndex;
    const yearData = this.incomeStatementData.years[yearIndex];
    
    
    const businessData: FinancialBusinessData = {
      totalRevenue: yearData.revenue,
      totalExpenses: yearData.expenses,
      netProfit: yearData.profit,
      netLoss: yearData.loss,
      incomeStatement: this.incomeStatementData
    };

    console.log(`📊 Switching to year ${yearData.year}`);
    await this.updateFromBusinessData(businessData, animated);
  }

  /**
   * Get available years for time slider
   */
  public getAvailableYears(): number[] {
    if (!this.incomeStatementData) return [];
    return this.incomeStatementData.years.map(year => year.year);
  }

  /**
   * Get current year index
   */
  public getCurrentYearIndex(): number {
    if (!this.incomeStatementData) return 0;
    return this.incomeStatementData.currentYearIndex;
  }

  /**
   * Check if Income Statement data is available
   */
  public hasIncomeStatementData(): boolean {
    return this.incomeStatementData !== null && this.incomeStatementData.years.length > 0;
  }

  /**
   * Get the current income statement data for debugging
   */
  public getIncomeStatementData(): IncomeStatementData | null {
    return this.incomeStatementData;
  }

  /**
   * Transform business data into visualization format
   */
  private transformBusinessData(data: FinancialBusinessData): FinancialData {
    return {
      revenue: data.totalRevenue,
      expenses: data.totalExpenses,
      profit: data.netProfit,
      loss: data.netLoss
    };
  }

}
